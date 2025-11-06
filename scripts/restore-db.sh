#!/bin/bash

# Script de restauration de la base de données
# Usage: ./restore-db.sh <fichier_backup.sql.gz>

set -e

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Vérifier l'argument
if [ $# -eq 0 ]; then
    echo -e "${RED}❌ Erreur: Fichier de backup requis${NC}"
    echo ""
    echo "Usage: $0 <fichier_backup.sql.gz>"
    echo ""
    echo "Backups disponibles:"
    ls -lht ./backups/manual/*.sql.gz 2>/dev/null | head -5 | awk '{print "   " $9 " (" $5 ")"}' || echo "   Aucun backup trouvé"
    ls -lht ./backups/auto/*.sql.gz 2>/dev/null | head -5 | awk '{print "   " $9 " (" $5 ")"}' || true
    exit 1
fi

BACKUP_FILE=$1

# Vérifier que le fichier existe
if [ ! -f "$BACKUP_FILE" ]; then
    echo -e "${RED}❌ Fichier non trouvé: $BACKUP_FILE${NC}"
    exit 1
fi

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}🔄 RESTAURATION BASE DE DONNÉES${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${YELLOW}⚠️  ATTENTION: Cette opération va ÉCRASER la base de données actuelle !${NC}"
echo ""
echo "Fichier de backup: $BACKUP_FILE"
echo "Taille: $(ls -lh $BACKUP_FILE | awk '{print $5}')"
echo ""
read -p "Voulez-vous continuer? (oui/non): " CONFIRM

if [ "$CONFIRM" != "oui" ]; then
    echo -e "${YELLOW}❌ Restauration annulée${NC}"
    exit 0
fi

echo ""

# Vérifier que PostgreSQL tourne
echo -e "${YELLOW}🔍 Vérification de PostgreSQL...${NC}"
if ! docker-compose ps db | grep -q "Up"; then
    echo -e "${RED}❌ PostgreSQL n'est pas démarré${NC}"
    echo "Démarrez-le avec: docker-compose up -d db"
    exit 1
fi
echo -e "${GREEN}✅ PostgreSQL est actif${NC}"
echo ""

# Créer un backup de sécurité avant restauration
echo -e "${YELLOW}💾 Création d'un backup de sécurité...${NC}"
SAFETY_BACKUP="./backups/manual/before_restore_$(date +%Y%m%d_%H%M%S).sql"
docker-compose exec -T db pg_dump -U didi_user didi_ticketing > "$SAFETY_BACKUP" 2>/dev/null && \
    gzip "$SAFETY_BACKUP" && \
    echo -e "${GREEN}✅ Backup de sécurité créé: $SAFETY_BACKUP.gz${NC}" || \
    echo -e "${YELLOW}⚠️  Impossible de créer le backup de sécurité (la base n'existe peut-être pas)${NC}"
echo ""

# Décompresser si nécessaire
TEMP_SQL="/tmp/restore_temp.sql"
if [[ "$BACKUP_FILE" == *.gz ]]; then
    echo -e "${YELLOW}📦 Décompression du backup...${NC}"
    gunzip -c "$BACKUP_FILE" > "$TEMP_SQL"
else
    cp "$BACKUP_FILE" "$TEMP_SQL"
fi
echo -e "${GREEN}✅ Backup préparé${NC}"
echo ""

# Arrêter le backend temporairement
echo -e "${YELLOW}⏸️  Arrêt temporaire du backend...${NC}"
docker-compose stop backend
echo -e "${GREEN}✅ Backend arrêté${NC}"
echo ""

# Supprimer la base existante et la recréer
echo -e "${YELLOW}🗑️  Suppression de la base existante...${NC}"
docker-compose exec -T db psql -U postgres << 'EOF'
DROP DATABASE IF EXISTS didi_ticketing;
CREATE DATABASE didi_ticketing;
GRANT ALL PRIVILEGES ON DATABASE didi_ticketing TO didi_user;
EOF
echo -e "${GREEN}✅ Base de données recréée${NC}"
echo ""

# Restaurer le backup
echo -e "${YELLOW}🔄 Restauration du backup...${NC}"
if docker-compose exec -T db psql -U didi_user -d didi_ticketing < "$TEMP_SQL" 2>/dev/null; then
    echo -e "${GREEN}✅ Backup restauré avec succès${NC}"
    
    # Donner les permissions
    docker-compose exec -T db psql -U postgres -d didi_ticketing << 'EOF'
GRANT ALL ON SCHEMA public TO didi_user;
GRANT ALL ON ALL TABLES IN SCHEMA public TO didi_user;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO didi_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO didi_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO didi_user;
EOF
    
else
    echo -e "${RED}❌ Erreur lors de la restauration${NC}"
    rm -f "$TEMP_SQL"
    docker-compose start backend
    exit 1
fi

# Nettoyer
rm -f "$TEMP_SQL"
echo ""

# Redémarrer le backend
echo -e "${YELLOW}🔄 Redémarrage du backend...${NC}"
docker-compose start backend
echo "⏳ Attente 10 secondes..."
sleep 10
echo -e "${GREEN}✅ Backend redémarré${NC}"
echo ""

# Vérification
echo -e "${YELLOW}✅ Vérification finale...${NC}"
TABLES_COUNT=$(docker-compose exec -T db psql -U didi_user -d didi_ticketing -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public';" 2>/dev/null | tr -d ' ')
TICKETS_COUNT=$(docker-compose exec -T db psql -U didi_user -d didi_ticketing -t -c "SELECT COUNT(*) FROM tickets;" 2>/dev/null | tr -d ' ' || echo "0")
USERS_COUNT=$(docker-compose exec -T db psql -U didi_user -d didi_ticketing -t -c "SELECT COUNT(*) FROM users;" 2>/dev/null | tr -d ' ' || echo "0")

echo "   Tables: $TABLES_COUNT"
echo "   Billets: $TICKETS_COUNT"
echo "   Utilisateurs: $USERS_COUNT"
echo ""

# Test API
if curl -s http://localhost:5000/health | grep -q "OK"; then
    echo -e "${GREEN}✅ API fonctionne${NC}"
else
    echo -e "${YELLOW}⚠️  API pas encore prête (redémarre...)${NC}"
fi

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ RESTAURATION TERMINÉE${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "📊 Base de données restaurée depuis:"
echo "   $BACKUP_FILE"
echo ""
echo "💾 Backup de sécurité disponible:"
echo "   $SAFETY_BACKUP.gz"
echo ""