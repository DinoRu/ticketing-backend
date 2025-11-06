# ===============================================
# Stage 1: Dependencies
# ===============================================
FROM node:18-alpine AS dependencies

WORKDIR /app

# Copier les fichiers de dépendances
COPY package*.json ./

# Installer les dépendances avec cache npm
RUN npm install --omit=dev --no-audit --prefer-offline

# ===============================================
# Stage 2: Production
# ===============================================
FROM node:18-alpine

# Installer les outils nécessaires
RUN apk add --no-cache \
    curl \
    tini \
    dumb-init

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
RUN mkdir -p logs public/tickets tmp && \
    chown -R nodejs:nodejs logs public tmp

# Passer à l'utilisateur non-root
USER nodejs

# Exposer le port
EXPOSE 5000

# Variables d'environnement par défaut
ENV NODE_ENV=production \
    PORT=5000 \
    HOST=0.0.0.0 \
    NODE_OPTIONS="--max-old-space-size=512"

# Healthcheck intégré
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5000/health', (r) => { process.exit(r.statusCode === 200 ? 0 : 1); }).on('error', () => process.exit(1))"

# Utiliser dumb-init pour gérer les signaux proprement
ENTRYPOINT ["/usr/bin/dumb-init", "--"]

# Commande de démarrage avec gestion des erreurs
CMD ["node", "server.js"]