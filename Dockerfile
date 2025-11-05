# ===============================================
# Dockerfile Production
# ===============================================
FROM node:18-alpine

# Définir le répertoire de travail
WORKDIR /app

# Installer curl si besoin pour healthcheck
RUN apk add --no-cache curl

# Copier uniquement les fichiers de dépendances
COPY package*.json ./

# Installer les dépendances de production
RUN npm install --omit=dev

# Copier tout le code source
COPY . .

# Créer les dossiers nécessaires et définir les permissions
RUN mkdir -p logs public/tickets

# Optionnel : exécuter l'application en tant qu'utilisateur non-root
RUN addgroup -S nodejs && adduser -S nodejs -G nodejs
USER nodejs

# Exposer le port
EXPOSE 5000

# Healthcheck (optionnel)
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:5000/health || exit 1

# Commande de démarrage
CMD ["node", "server.js"]
