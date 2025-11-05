#!/bin/bash

# ===============================================
# Script d'Installation VPS - Didi Ticketing
# ===============================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_step() {
    echo -e "${BLUE}▶ $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

echo -e "${GREEN}"
echo "╔════════════════════════════════════════════╗"
echo "║   Didi Ticketing - VPS Setup Script       ║"
echo "╚════════════════════════════════════════════╝"
echo -e "${NC}"

# Update system
print_step "Updating system packages..."
sudo apt update && sudo apt upgrade -y
print_success "System updated"

# Install Docker
print_step "Installing Docker..."
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker $USER
    rm get-docker.sh
    print_success "Docker installed"
else
    print_success "Docker already installed"
fi

# Install Docker Compose
print_step "Installing Docker Compose..."
if ! command -v docker-compose &> /dev/null; then
    sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
    print_success "Docker Compose installed"
else
    print_success "Docker Compose already installed"
fi

# Install Git
print_step "Installing Git..."
if ! command -v git &> /dev/null; then
    sudo apt install -y git
    print_success "Git installed"
else
    print_success "Git already installed"
fi

# Install essential tools
print_step "Installing essential tools..."
sudo apt install -y curl wget vim nano htop ufw fail2ban
print_success "Essential tools installed"

# Setup firewall
print_step "Configuring firewall..."
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable
print_success "Firewall configured"

# Setup fail2ban
print_step "Configuring fail2ban..."
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
print_success "Fail2ban configured"

# Create project directory
print_step "Creating project directory..."
PROJECT_DIR="/var/www/didi-ticketing"
sudo mkdir -p $PROJECT_DIR
sudo chown -R $USER:$USER $PROJECT_DIR
print_success "Project directory created: $PROJECT_DIR"

# Clone repository (you'll need to provide the repo URL)
print_step "Repository setup..."
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Clone your repository:"
echo "   cd $PROJECT_DIR"
echo "   git clone <your-repo-url> ."
echo ""
echo "2. Create .env file:"
echo "   cp .env.production.example .env"
echo "   nano .env  # Edit with your values"
echo ""
echo "3. Generate secrets:"
echo "   node -e \"console.log(require('crypto').randomBytes(64).toString('hex'))\""
echo ""
echo "4. Start services:"
echo "   docker-compose up -d"
echo ""
echo "5. Run migrations:"
echo "   docker-compose exec backend npm run migrate"
echo "   docker-compose exec backend npm run seed"

# Setup automatic backups
print_step "Setting up automatic backups..."
CRON_JOB="0 2 * * * cd $PROJECT_DIR && docker-compose exec -T postgres pg_dump -U didi_user didi_ticketing > backups/backup_\$(date +\%Y\%m\%d_\%H\%M\%S).sql"
(crontab -l 2>/dev/null; echo "$CRON_JOB") | crontab -
print_success "Daily backups scheduled at 2 AM"

# Setup log rotation
print_step "Setting up log rotation..."
sudo tee /etc/logrotate.d/didi-ticketing > /dev/null <<EOF
$PROJECT_DIR/logs/*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    create 0644 $USER $USER
    sharedscripts
}
EOF
print_success "Log rotation configured"

# Setup swap (if needed)
print_step "Checking swap..."
if [ $(free -m | awk '/^Swap:/ {print $2}') -eq 0 ]; then
    print_step "Creating 2GB swap file..."
    sudo fallocate -l 2G /swapfile
    sudo chmod 600 /swapfile
    sudo mkswap /swapfile
    sudo swapon /swapfile
    echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
    print_success "Swap created"
else
    print_success "Swap already exists"
fi

# Display system info
print_step "System Information:"
echo "Docker version: $(docker --version)"
echo "Docker Compose version: $(docker-compose --version)"
echo "Git version: $(git --version)"
echo "Disk space:"
df -h / | tail -1
echo "Memory:"
free -h | grep "Mem:"

echo ""
print_success "🎉 VPS Setup Complete!"
echo ""
echo -e "${YELLOW}IMPORTANT NEXT STEPS:${NC}"
echo "1. Logout and login again to apply Docker group changes"
echo "2. Navigate to: cd $PROJECT_DIR"
echo "3. Clone your repository"
echo "4. Configure .env file"
echo "5. Run: docker-compose up -d"
echo ""
echo -e "${YELLOW}GitHub Actions Secrets to Configure:${NC}"
echo "VPS_HOST         - Your VPS IP address"
echo "VPS_USERNAME     - Your VPS username"
echo "VPS_SSH_KEY      - Your private SSH key"
echo "VPS_PORT         - SSH port (default: 22)"
echo "VPS_PROJECT_PATH - $PROJECT_DIR"
echo "DB_USER          - Database username"
echo "DB_NAME          - Database name"
echo ""
print_success "Happy deploying! 🚀"