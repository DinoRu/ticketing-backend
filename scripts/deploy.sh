#!/bin/bash

# ===============================================
# Script de Déploiement Manuel - Didi Ticketing
# ===============================================

set -e  # Exit on error

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_NAME="didi-ticketing"
BACKUP_DIR="./backups"
DATE=$(date +%Y%m%d_%H%M%S)

# Functions
print_step() {
    echo -e "${BLUE}▶ $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check prerequisites
check_prerequisites() {
    print_step "Checking prerequisites..."
    
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed"
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose is not installed"
        exit 1
    fi
    
    print_success "All prerequisites met"
}

# Create backup
create_backup() {
    print_step "Creating database backup..."
    
    mkdir -p $BACKUP_DIR
    
    docker-compose exec -T postgres pg_dump \
        -U ${DB_USER:-didi_user} \
        ${DB_NAME:-didi_ticketing} \
        > $BACKUP_DIR/backup_$DATE.sql
    
    if [ $? -eq 0 ]; then
        print_success "Backup created: $BACKUP_DIR/backup_$DATE.sql"
    else
        print_error "Backup failed"
        exit 1
    fi
}

# Pull latest changes
pull_changes() {
    print_step "Pulling latest changes..."
    
    git pull origin main
    
    print_success "Changes pulled successfully"
}

# Build and start services
deploy() {
    print_step "Building and deploying services..."
    
    # Pull latest images
    docker-compose pull
    
    # Build backend
    docker-compose build --no-cache backend
    
    # Start services
    docker-compose up -d
    
    print_success "Services deployed"
}

# Run migrations
run_migrations() {
    print_step "Running database migrations..."
    
    # Wait for services to be healthy
    sleep 10
    
    docker-compose exec -T backend npm run migrate
    
    print_success "Migrations completed"
}

# Health check
health_check() {
    print_step "Running health check..."
    
    sleep 5
    
    HEALTH_RESPONSE=$(curl -s http://localhost:5000/health)
    
    if echo "$HEALTH_RESPONSE" | grep -q "OK"; then
        print_success "Health check passed"
    else
        print_error "Health check failed"
        print_warning "Rolling back..."
        rollback
        exit 1
    fi
}

# Rollback
rollback() {
    print_warning "Initiating rollback..."
    
    # Find latest backup
    LATEST_BACKUP=$(ls -t $BACKUP_DIR/backup_*.sql | head -1)
    
    if [ -z "$LATEST_BACKUP" ]; then
        print_error "No backup found for rollback"
        exit 1
    fi
    
    print_step "Restoring database from: $LATEST_BACKUP"
    
    docker-compose exec -T postgres psql \
        -U ${DB_USER:-didi_user} \
        ${DB_NAME:-didi_ticketing} \
        < $LATEST_BACKUP
    
    # Restart previous version
    git reset --hard HEAD~1
    docker-compose up -d --no-deps --build backend
    
    print_success "Rollback completed"
}

# Cleanup
cleanup() {
    print_step "Cleaning up old Docker images..."
    
    docker image prune -af --filter "until=72h"
    
    print_success "Cleanup completed"
}

# Show logs
show_logs() {
    print_step "Showing recent logs..."
    
    docker-compose logs --tail=50 backend
}

# Main deployment flow
main() {
    echo -e "${GREEN}"
    echo "╔═══════════════════════════════════════════╗"
    echo "║   Didi Ticketing - Deployment Script     ║"
    echo "╚═══════════════════════════════════════════╝"
    echo -e "${NC}"
    
    # Load environment variables
    if [ -f .env ]; then
        export $(cat .env | grep -v '^#' | xargs)
    fi
    
    case "${1:-deploy}" in
        deploy)
            check_prerequisites
            create_backup
            pull_changes
            deploy
            run_migrations
            health_check
            cleanup
            print_success "🎉 Deployment completed successfully!"
            ;;
        
        rollback)
            print_warning "Starting rollback process..."
            rollback
            ;;
        
        backup)
            create_backup
            ;;
        
        logs)
            show_logs
            ;;
        
        health)
            health_check
            ;;
        
        *)
            echo "Usage: $0 {deploy|rollback|backup|logs|health}"
            echo ""
            echo "Commands:"
            echo "  deploy   - Deploy the latest version (default)"
            echo "  rollback - Rollback to previous version"
            echo "  backup   - Create a database backup"
            echo "  logs     - Show recent logs"
            echo "  health   - Run health check"
            exit 1
            ;;
    esac
}

# Run main function
main "$@"