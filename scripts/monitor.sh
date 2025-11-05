#!/bin/bash

# ===============================================
# Script de Monitoring - Didi Ticketing
# ===============================================

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Functions
print_header() {
    echo -e "${BLUE}═══════════════════════════════════════${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}═══════════════════════════════════════${NC}"
}

print_info() {
    echo -e "${GREEN}▶ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check service status
check_services() {
    print_header "Services Status"
    
    services=("didi-postgres" "didi-backend" "didi-nginx")
    
    for service in "${services[@]}"; do
        if docker ps | grep -q $service; then
            HEALTH=$(docker inspect --format='{{.State.Health.Status}}' $service 2>/dev/null)
            if [ "$HEALTH" == "healthy" ] || [ -z "$HEALTH" ]; then
                print_info "$service: RUNNING ✅"
            else
                print_warning "$service: UNHEALTHY ⚠️"
            fi
        else
            print_error "$service: STOPPED ❌"
        fi
    done
    echo ""
}

# Check API health
check_api() {
    print_header "API Health Check"
    
    RESPONSE=$(curl -s http://localhost:5000/health)
    
    if echo "$RESPONSE" | grep -q "OK"; then
        print_info "API: HEALTHY ✅"
        echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"
    else
        print_error "API: UNHEALTHY ❌"
    fi
    echo ""
}

# Check database
check_database() {
    print_header "Database Status"
    
    DB_STATUS=$(docker-compose exec -T postgres pg_isready -U didi_user 2>&1)
    
    if echo "$DB_STATUS" | grep -q "accepting connections"; then
        print_info "PostgreSQL: HEALTHY ✅"
        
        # Connection stats
        CONNECTIONS=$(docker-compose exec -T postgres psql -U didi_user -d didi_ticketing -t -c "SELECT count(*) FROM pg_stat_activity;" 2>/dev/null | xargs)
        print_info "Active connections: $CONNECTIONS"
        
        # Database size
        DB_SIZE=$(docker-compose exec -T postgres psql -U didi_user -d didi_ticketing -t -c "SELECT pg_size_pretty(pg_database_size('didi_ticketing'));" 2>/dev/null | xargs)
        print_info "Database size: $DB_SIZE"
        
        # Ticket count
        TICKET_COUNT=$(docker-compose exec -T postgres psql -U didi_user -d didi_ticketing -t -c "SELECT count(*) FROM tickets;" 2>/dev/null | xargs)
        print_info "Total tickets: $TICKET_COUNT"
    else
        print_error "PostgreSQL: UNHEALTHY ❌"
    fi
    echo ""
}

# Check disk space
check_disk() {
    print_header "Disk Space"
    
    df -h / | tail -1 | awk '{
        used=$5+0
        if (used > 90) {
            printf "\033[0;31m❌ CRITICAL: %s used\033[0m\n", $5
        } else if (used > 80) {
            printf "\033[1;33m⚠️  WARNING: %s used\033[0m\n", $5
        } else {
            printf "\033[0;32m✅ OK: %s used\033[0m\n", $5
        }
        printf "Available: %s\n", $4
    }'
    echo ""
}

# Check memory
check_memory() {
    print_header "Memory Usage"
    
    free -h | grep "Mem:" | awk '{
        used=$3
        total=$2
        percent=($3/$2)*100
        printf "Used: %s / %s\n", $3, $2
    }'
    echo ""
}

# Check Docker resources
check_docker() {
    print_header "Docker Resources"
    
    echo "Container Resource Usage:"
    docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}" | grep didi
    echo ""
}

# Check logs for errors
check_errors() {
    print_header "Recent Errors (Last 50 lines)"
    
    ERROR_COUNT=$(docker-compose logs --tail=50 backend 2>&1 | grep -i "error" | wc -l)
    
    if [ $ERROR_COUNT -gt 0 ]; then
        print_warning "Found $ERROR_COUNT errors in recent logs"
        docker-compose logs --tail=50 backend 2>&1 | grep -i "error" | tail -5
    else
        print_info "No recent errors found ✅"
    fi
    echo ""
}

# Check backups
check_backups() {
    print_header "Backup Status"
    
    BACKUP_DIR="./backups"
    
    if [ -d "$BACKUP_DIR" ]; then
        BACKUP_COUNT=$(ls -1 $BACKUP_DIR/backup_*.sql 2>/dev/null | wc -l)
        
        if [ $BACKUP_COUNT -gt 0 ]; then
            print_info "Total backups: $BACKUP_COUNT"
            
            LATEST=$(ls -t $BACKUP_DIR/backup_*.sql 2>/dev/null | head -1)
            if [ -n "$LATEST" ]; then
                LATEST_DATE=$(stat -c %y "$LATEST" 2>/dev/null | cut -d' ' -f1,2 | cut -d'.' -f1)
                LATEST_SIZE=$(du -h "$LATEST" 2>/dev/null | cut -f1)
                print_info "Latest backup: $LATEST_DATE ($LATEST_SIZE)"
            fi
        else
            print_warning "No backups found"
        fi
    else
        print_warning "Backup directory not found"
    fi
    echo ""
}

# Check SSL certificates
check_ssl() {
    print_header "SSL Certificate Status"
    
    if [ -f "./nginx/ssl/cert.pem" ]; then
        EXPIRY=$(openssl x509 -enddate -noout -in ./nginx/ssl/cert.pem 2>/dev/null | cut -d= -f2)
        
        if [ -n "$EXPIRY" ]; then
            EXPIRY_TIMESTAMP=$(date -d "$EXPIRY" +%s 2>/dev/null)
            NOW=$(date +%s)
            DAYS_LEFT=$(( ($EXPIRY_TIMESTAMP - $NOW) / 86400 ))
            
            if [ $DAYS_LEFT -lt 7 ]; then
                print_error "SSL certificate expires in $DAYS_LEFT days"
            elif [ $DAYS_LEFT -lt 30 ]; then
                print_warning "SSL certificate expires in $DAYS_LEFT days"
            else
                print_info "SSL certificate valid for $DAYS_LEFT days ✅"
            fi
        fi
    else
        print_info "No SSL certificate configured"
    fi
    echo ""
}

# Main monitoring dashboard
main() {
    clear
    echo -e "${GREEN}"
    echo "╔═══════════════════════════════════════════╗"
    echo "║   Didi Ticketing - Monitoring Dashboard  ║"
    echo "║   $(date '+%Y-%m-%d %H:%M:%S')                    ║"
    echo "╚═══════════════════════════════════════════╝"
    echo -e "${NC}"
    echo ""
    
    case "${1:-all}" in
        all)
            check_services
            check_api
            check_database
            check_disk
            check_memory
            check_docker
            check_errors
            check_backups
            check_ssl
            ;;
        
        services)
            check_services
            ;;
        
        api)
            check_api
            ;;
        
        db)
            check_database
            ;;
        
        resources)
            check_disk
            check_memory
            check_docker
            ;;
        
        logs)
            docker-compose logs --tail=100 -f
            ;;
        
        *)
            echo "Usage: $0 {all|services|api|db|resources|logs}"
            echo ""
            echo "Options:"
            echo "  all       - Show complete dashboard (default)"
            echo "  services  - Check service status"
            echo "  api       - Check API health"
            echo "  db        - Check database status"
            echo "  resources - Check system resources"
            echo "  logs      - Show live logs"
            exit 1
            ;;
    esac
    
    if [ "$1" != "logs" ]; then
        echo -e "${BLUE}═══════════════════════════════════════${NC}"
        echo -e "${GREEN}Monitoring completed at $(date '+%H:%M:%S')${NC}"
        echo -e "${BLUE}═══════════════════════════════════════${NC}"
    fi
}

# Run main
main "$@"