# ===============================================
# Stage 1: Dependencies
# ===============================================
FROM node:18-alpine AS dependencies

WORKDIR /app

# Copier les fichiers de dépendances
COPY package*.json ./

# Installer les dépendances
RUN npm install --only=production

# ===============================================
# Stage 2: Production
# ===============================================
FROM node:18-alpine

# Installer wget pour healthcheck
RUN apk add --no-cache wget

# Créer un utilisateur non-root
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

WORKDIR /app

# Copier les dépendances depuis le stage précédent
COPY --from=dependencies --chown=nodejs:nodejs /app/node_modules ./node_modules

# Copier le code de l'application
COPY --chown=nodejs:nodejs package*.json ./
COPY --chown=nodejs:nodejs server.js ./
COPY --chown=nodejs:nodejs src ./src
COPY --chown=nodejs:nodejs database ./database

# Créer les dossiers nécessaires avec les bonnes permissions
RUN mkdir -p logs public/tickets && \
    chown -R nodejs:nodejs logs public

# Passer à l'utilisateur non-root
USER nodejs

# Exposer le port
EXPOSE 5000

# Variables d'environnement par défaut
ENV NODE_ENV=production \
    PORT=5000 \
    HOST=0.0.0.0

# Healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:5000/health || exit 1

# Commande de démarrage
CMD ["node", "server.js"]