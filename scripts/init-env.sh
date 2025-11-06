#!/bin/bash

# Script d'initialisation de l'environnement Didi Ticketing
# Crée les dossiers nécessaires et prépare la persistence des données

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}🚀 INITIALISATION ENVIRONNEMENT${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Créer la structure de dossiers
echo -e "${YELLOW}📁 Création de la structure de dossiers...${NC}"

# Dossiers de données
mkdir -p data/postgres
mkdir -p backups/manual
mkdir -p backups/auto
mkdir -p backups/postgres
mkdir -p logs
mkdir -p public/tickets

# Permissions
chmod 755 data
chmod 700 data/postgres
chmod 755 backups backups/manual backups/auto backups/postgres
chmod 755 logs
chmod 755 public public/tickets

echo -e "${GREEN}✅ Dossiers créés:${NC}"
echo "   data/postgres         - Données PostgreSQL"
echo "   backups/manual        - Backups manuels"
echo "   backups/auto          - Backups automatiques"
echo "   backups/postgres      - Backups PostgreSQL internes"
echo "   logs                  - Logs de l'application"
echo "   public/tickets        - PDFs des billets"
echo ""

# Vérifier le fichier .env
echo -e "${YELLOW}🔍 Vérification du fichier .env...${NC}"
if [ ! -f .env ]; then
    echo -e "${YELLOW}⚠️  Fichier .env introuvable${NC}"
    echo "Création d'un fichier .env depuis l'exemple..."
    
    cat > .env << 'EOF'
# Base de données
DB_HOST=db
DB_PORT=5432
DB_NAME=didi_ticketing
DB_USER=didi_user
DB_PASSWORD=loGin123!

# JWT
JWT_SECRET=0195ef4e1eea34866fba4504225d2ed31489291698bd50ae5b829fa6c22cc75214ec3fd11946fa27953ea07966e6a4c383a1aebd975af8e51cd69c34c96e1896
JWT_EXPIRES_IN=1h
JWT_REFRESH_EXPIRES_IN=7d

# Server
NODE_ENV=production
PORT=5000
HOST=0.0.0.0

# URLs
PUBLIC_URL=http://109.69.16.90:5000
BASE_URL=http://109.69.16.90:5000

# Backup
BACKUP_INTERVAL=3600
BACKUP_KEEP_DAYS=7

# CORS
CORS_ORIGIN=*

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=100

# Logging
LOG_LEVEL=info
EOF
    
    echo -e "${GREEN}✅ Fichier .env créé${NC}"
    echo -e "${YELLOW}⚠️  IMPORTANT: Modifiez les mots de passe dans .env !${NC}"
else
    echo -e "${GREEN}✅ Fichier .env existe${NC}"
fi
echo ""

# Rendre les scripts exécutables
echo -e "${YELLOW}🔧 Configuration des scripts...${NC}"
chmod +x backup-db.sh restore-db.sh fix-db.sh 2>/dev/null || true
echo -e "${GREEN}✅ Scripts configurés${NC}"
echo ""

# Vérifier Docker et Docker Compose
echo -e "${YELLOW}🐳 Vérification de Docker...${NC}"
if command -v docker &> /dev/null; then
    DOCKER_VERSION=$(docker --version | awk '{print $3}' | tr -d ',')
    echo -e "${GREEN}✅ Docker installé (version $DOCKER_VERSION)${NC}"
else
    echo -e "${RED}❌ Docker non installé${NC}"
    echo "Installez Docker: https://docs.docker.com/get-docker/"
fi

if command -v docker-compose &> /dev/null; then
    COMPOSE_VERSION=$(docker-compose --version | awk '{print $3}' | tr -d ',')
    echo -e "${GREEN}✅ Docker Compose installé (version $COMPOSE_VERSION)${NC}"
else
    echo -e "${RED}❌ Docker Compose non installé${NC}"
    echo "Installez Docker Compose: https://docs.docker.com/compose/install/"
fi
echo ""

# Afficher les informations de configuration
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ INITIALISATION TERMINÉE${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "📋 Structure créée:"
tree -L 2 -d 2>/dev/null || ls -R
echo ""
echo "🚀 Prochaines étapes:"
echo ""
echo "1. Modifier le fichier .env avec vos paramètres:"
echo "   nano .env"
echo ""
echo "2. Démarrer les services:"
echo "   docker-compose up -d"
echo ""
echo "3. Vérifier les logs:"
echo "   docker-compose logs -f"
echo ""
echo "4. Créer les tables:"
echo "   docker-compose exec backend npm run migrate"
echo ""
echo "5. Créer les utilisateurs:"
echo "   docker-compose exec backend npm run seed"
echo ""
echo "6. Tester l'API:"
echo "   curl http://localhost:5000/health"
echo ""
echo "📝 Scripts disponibles:"
echo "   ./backup-db.sh        - Créer un backup manuel"
echo "   ./restore-db.sh FILE  - Restaurer un backup"
echo "   ./fix-db.sh           - Réparer la base de données"
echo ""