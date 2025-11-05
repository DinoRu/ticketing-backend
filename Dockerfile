# ===============================================
# Dockerfile Production corrigé
# ===============================================
FROM node:18-alpine

WORKDIR /app

# Installer curl pour healthcheck
RUN apk add --no-cache curl

# Copier les fichiers de dépendances
COPY package*.json ./

# Installer uniquement les dépendances de production
RUN npm install --omit=dev

# Copier le reste du code source
COPY . .

# Créer les dossiers nécessaires
RUN mkdir -p logs public/tickets

# Ajouter un utilisateur non-root
RUN addgroup -S nodejs && adduser -S nodejs -G nodejs
USER nodejs

# Exposer le port
EXPOSE 5000

# Healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:5000/health || exit 1

# Démarrage de l'application
CMD ["node", "server.js"]
