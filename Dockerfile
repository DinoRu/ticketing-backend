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

# Exposer le port
EXPOSE 5000

# Démarrage de l'application
CMD ["npm", "start"]
