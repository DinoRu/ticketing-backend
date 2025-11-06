#!/bin/bash

# Script de backup manuel de la base de données
# Usage: ./backup-db.sh [nom_optionnel]

set -e

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
BACKUP_DIR="./backups/manual"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME=${1:-"backup_$TIMESTAMP"}
BACKUP_FILE="$BACKUP_DIR/${BACKUP_NAME}.sql"

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}💾 BACKUP MANUEL - TICKETING${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Créer le dossier de backup s'il n'existe pas
mkdir -p "$BACKUP_DIR"

# Vérifier que PostgreSQL tourne
echo -e "${YELLOW}🔍 Vérification de PostgreSQL...${NC}"
if ! docker-compose ps db | grep -q "Up"; then
    echo -e "${RED}❌ PostgreSQL n'est pas démarré${NC}"
    echo "Démarrez-le avec: docker-compose up -d db"
    exit 1
fi
echo -e "${GREEN}✅ PostgreSQL est actif${NC}"
echo ""

# Créer le backup
echo -e "${YELLOW}💾 Création du backup...${NC}"
echo "Fichier: $BACKUP_FILE"

if docker-compose exec -T db pg_dump -U didi_user ticketing > "$BACKUP_FILE" 2>/dev/null; then
    BACKUP_SIZE=$(ls -lh "$BACKUP_FILE" | awk '{print $5}')
    echo -e "${GREEN}✅ Backup créé avec succès${NC}"
    echo "   Taille: $BACKUP_SIZE"
    
    # Compresser le backup
    echo -e "${YELLOW}📦 Compression du backup...${NC}"
    gzip "$BACKUP_FILE"
    COMPRESSED_SIZE=$(ls -lh "$BACKUP_FILE.gz" | awk '{print $5}')
    echo -e "${GREEN}✅ Backup compressé${NC}"
    echo "   Taille compressée: $COMPRESSED_SIZE"
    echo "   Fichier final: $BACKUP_FILE.gz"
    
    # Informations supplémentaires
    echo ""
    echo -e "${BLUE}📊 Informations du backup:${NC}"
    TABLES_COUNT=$(docker-compose exec -T db psql -U didi_user -d didi_ticketing -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public';" 2>/dev/null | tr -d ' ')
    TICKETS_COUNT=$(docker-compose exec -T db psql -U didi_user -d didi_ticketing -t -c "SELECT COUNT(*) FROM tickets;" 2>/dev/null | tr -d ' ' || echo "0")
    USERS_COUNT=$(docker-compose exec -T db psql -U didi_user -d didi_ticketing -t -c "SELECT COUNT(*) FROM users;" 2>/dev/null | tr -d ' ' || echo "0")
    
    echo "   Tables: $TABLES_COUNT"
    echo "   Billets: $TICKETS_COUNT"
    echo "   Utilisateurs: $USERS_COUNT"
    
else
    echo -e "${RED}❌ Erreur lors de la création du backup${NC}"
    exit 1
fi

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ BACKUP TERMINÉ${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "📁 Emplacement: $BACKUP_FILE.gz"
echo ""
echo "🔄 Pour restaurer ce backup:"
echo "   ./restore-db.sh $BACKUP_FILE.gz"
echo ""

# Liste des backups existants
BACKUP_COUNT=$(ls -1 "$BACKUP_DIR"/*.sql.gz 2>/dev/null | wc -l)
if [ "$BACKUP_COUNT" -gt 0 ]; then
    echo "📋 Backups disponibles ($BACKUP_COUNT):"
    ls -lht "$BACKUP_DIR"/*.sql.gz | head -5 | awk '{print "   " $9 " (" $5 ")"}'
    if [ "$BACKUP_COUNT" -gt 5 ]; then
        echo "   ... et $((BACKUP_COUNT - 5)) autres"
    fi
fi

echo ""