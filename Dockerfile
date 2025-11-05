# ===============================================
# Stage 1: Builder
# ===============================================
FROM node:18-alpine AS builder

WORKDIR /app

# Copier les fichiers de dépendances
COPY package*.json ./

# Installer TOUTES les dépendances (y compris dev pour build)
RUN npm install

# Copier le code source
COPY . .

# ===============================================
# Stage 2: Production
# ===============================================
FROM node:18-alpine

# Installer curl pour healthcheck
RUN apk add --no-cache curl

# Créer un utilisateur non-root
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

WORKDIR /app

# Copier package.json et package-lock.json
COPY package*.json ./

# Installer UNIQUEMENT les dépendances de production
RUN npm install --only=production && \
    npm cache clean --force

# Copier le code depuis le builder
COPY --from=builder --chown=nodejs:nodejs /app/src ./src
COPY --from=builder --chown=nodejs:nodejs /app/database ./database
COPY --from=builder --chown=nodejs:nodejs /app/server.js ./

# Créer les dossiers nécessaires
RUN mkdir -p logs public/tickets && \
    chown -R nodejs:nodejs logs public

# Passer à l'utilisateur non-root
USER nodejs

# Exposer le port
EXPOSE 5000

# Healthcheck
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:5000/health || exit 1

# Commande de démarrage
CMD ["node", "server.js"]