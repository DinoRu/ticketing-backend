# 🎫 Backend Billetterie Didi B - Version Professionnelle

Backend de niveau **enterprise** avec architecture modulaire, PostgreSQL, et toutes les fonctionnalités d'une application de production.

## ✨ Caractéristiques

- 🏗️ **Architecture Clean** - Séparation Controllers/Services/Repositories
- 🗄️ **PostgreSQL** - Base de données relationnelle avec pool de connexions
- 🔒 **Sécurité** - JWT, bcrypt, RBAC, rate limiting
- 📊 **Logging** - Winston avec rotation quotidienne
- 🎯 **Validation** - express-validator + Joi
- 🔄 **Migrations** - Gestion des versions de DB
- 📈 **Performance** - Indexes, compression, caching ready
- 🧪 **Production Ready** - Health checks, graceful shutdown

## 📦 Installation

### Prérequis

- Node.js v16+
- PostgreSQL v12+
- npm ou yarn

### 1. Installation de PostgreSQL

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql

# macOS
brew install postgresql@14
brew services start postgresql@14

# Windows
# Télécharger depuis https://www.postgresql.org/download/
```

### 2. Créer la base de données

```bash
sudo -u postgres psql

CREATE DATABASE didi_ticketing;
CREATE USER didi_user WITH ENCRYPTED PASSWORD 'votre-mot-de-passe';
GRANT ALL PRIVILEGES ON DATABASE didi_ticketing TO didi_user;
\q
```

### 3. Configuration du projet

```bash
# Installer les dépendances
npm install

# Configurer l'environnement
cp .env.example .env
nano .env  # Éditer avec vos paramètres
```

**Configuration .env minimale:**
```env
# Serveur
PORT=5000
NODE_ENV=development

# PostgreSQL
DB_HOST=localhost
DB_PORT=5432
DB_NAME=didi_ticketing
DB_USER=didi_user
DB_PASSWORD=votre-mot-de-passe

# JWT Secret (générer une clé forte)
JWT_SECRET=votre-cle-super-secrete-generee-aleatoirement
```

**Générer une clé JWT sécurisée:**
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### 4. Initialiser la base de données

```bash
# Exécuter les migrations
npm run migrate

# Insérer les données initiales
npm run seed
```

### 5. Démarrer le serveur

```bash
# Développement (avec auto-reload)
npm run dev

# Production
npm start
```

Le serveur démarre sur: **http://localhost:5000**

## 🎯 Comptes par défaut

Après avoir exécuté `npm run seed`:

- **Admin**: `admin` / `admin123`
- **Vendeur 1**: `vendeur1` / `vend123`
- **Vendeur 2**: `vendeur2` / `vend123`
- **Vendeur 3**: `vendeur3` / `vend123`

⚠️ **Changez ces mots de passe en production !**

## 📚 API Endpoints

### Authentification

```bash
POST   /api/auth/login          # Connexion
POST   /api/auth/logout         # Déconnexion
POST   /api/auth/refresh        # Rafraîchir le token
GET    /api/auth/me             # Infos utilisateur connecté
```

### Utilisateurs (Admin)

```bash
GET    /api/users               # Liste des utilisateurs
GET    /api/users/:id           # Détails utilisateur
POST   /api/users               # Créer utilisateur
PUT    /api/users/:id           # Modifier utilisateur
DELETE /api/users/:id           # Désactiver utilisateur
POST   /api/users/:id/change-password  # Changer mot de passe
```

### Billets

```bash
POST   /api/tickets             # Créer des billets
GET    /api/tickets             # Liste des billets
GET    /api/tickets/:id         # Détails billet
POST   /api/tickets/:id/scan    # Scanner un billet
POST   /api/tickets/:id/mark-sent  # Marquer comme envoyé
GET    /api/tickets/order/:orderId  # Billets d'une commande
```

### Statistiques

```bash
GET    /api/stats               # Stats globales
GET    /api/stats/dashboard     # Tableau de bord
GET    /api/stats/vendors       # Stats par vendeur (Admin)
GET    /api/stats/categories    # Stats par catégorie
GET    /api/orders              # Liste des commandes
```

## 🔑 Authentification

Toutes les routes (sauf `/api/auth/login`) nécessitent un token JWT.

**Header requis:**
```
Authorization: Bearer <votre-token-jwt>
```

**Exemple avec cURL:**
```bash
curl -X GET http://localhost:5000/api/tickets \
  -H "Authorization: Bearer eyJhbGc..."
```

## 📖 Exemples d'utilisation

### 1. Connexion

```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "admin123"
  }'
```

**Réponse:**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": 1,
      "username": "admin",
      "name": "Administrateur Principal",
      "role": "admin"
    }
  }
}
```

### 2. Créer des billets

```bash
curl -X POST http://localhost:5000/api/tickets \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "clientName": "Jean Kouadio",
    "clientPhone": "+7 999 123 4567",
    "paymentMethod": "cash",
    "attendees": [
      {
        "name": "Jean",
        "phone": "+7 999 123 4567",
        "category": "vip"
      },
      {
        "name": "Marie",
        "phone": "+7 999 234 5678",
        "category": "standard"
      }
    ]
  }'
```

### 3. Scanner un billet

```bash
curl -X POST http://localhost:5000/api/tickets/DIDI-123456/scan \
  -H "Authorization: Bearer <token>"
```

## 🏗️ Architecture

```
backend/
├── src/
│   ├── config/          # Configuration (DB, Logger)
│   ├── models/          # Modèles de données
│   ├── repositories/    # Accès base de données
│   ├── services/        # Logique métier
│   ├── controllers/     # Contrôleurs API
│   ├── middleware/      # Middleware Express
│   ├── routes/          # Définition des routes
│   ├── utils/           # Utilitaires
│   └── app.js           # Configuration Express
│
├── database/
│   ├── migrations/      # Migrations PostgreSQL
│   └── seeds/          # Données initiales
│
├── logs/               # Fichiers de logs
├── public/tickets/     # PDFs des billets
├── server.js           # Point d'entrée
└── package.json
```

## 🔒 Sécurité

### Variables d'environnement en production

```env
NODE_ENV=production
DB_SSL=true
JWT_SECRET=<clé-forte-de-64-caractères>
CORS_ORIGIN=https://votre-domaine.com
```

### Rate Limiting

- API générale: 100 requêtes / 15 minutes
- Login: 5 tentatives / 15 minutes

### Protection contre

- ✅ SQL Injection (requêtes paramétrées)
- ✅ XSS (sanitization des entrées)
- ✅ CSRF (tokens JWT)
- ✅ Brute force (rate limiting)
- ✅ NoSQL Injection (validation stricte)

## 📊 Monitoring

### Health Check

```bash
curl http://localhost:5000/health
```

**Réponse:**
```json
{
  "status": "OK",
  "timestamp": "2025-11-04T12:00:00.000Z",
  "uptime": 3600,
  "database": {
    "status": "connected",
    "pool": {
      "total": 5,
      "idle": 3,
      "waiting": 0
    }
  }
}
```

### Logs

```bash
# Logs en temps réel
tail -f logs/app-2025-11-04.log

# Erreurs uniquement
tail -f logs/error-2025-11-04.log
```

## 🚀 Déploiement

### Option 1: PM2

```bash
npm install -g pm2
pm2 start server.js --name ticketing-api -i max
pm2 save
pm2 startup
```

### Option 2: Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
EXPOSE 5000
CMD ["node", "server.js"]
```

```bash
docker build -t ticketing-api .
docker run -d -p 5000:5000 --env-file .env ticketing-api
```

### Option 3: Heroku

```bash
heroku create mon-app-ticketing
heroku addons:create heroku-postgresql:mini
heroku config:set NODE_ENV=production
heroku config:set JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")
git push heroku main
heroku run npm run migrate
heroku run npm run seed
```

## 🧪 Tests

```bash
# Exécuter les tests
npm test

# Tests avec coverage
npm run test:coverage

# Tests en mode watch
npm run test:watch
```

## 📝 Scripts disponibles

```bash
npm start          # Démarrer en production
npm run dev        # Démarrer en développement (nodemon)
npm run migrate    # Exécuter les migrations
npm run seed       # Insérer les données initiales
npm test           # Exécuter les tests
npm run lint       # Vérifier le code (ESLint)
npm run format     # Formater le code (Prettier)
```

## 🐛 Dépannage

### Erreur de connexion PostgreSQL

```bash
# Vérifier que PostgreSQL est démarré
sudo systemctl status postgresql

# Vérifier les credentials
psql -U didi_user -d didi_ticketing
```

### Port déjà utilisé

```bash
# Trouver le processus utilisant le port 5000
lsof -i :5000

# Tuer le processus
kill -9 <PID>
```

### Migrations ne s'exécutent pas

```bash
# Supprimer la table migrations et réexécuter
psql -U didi_user -d didi_ticketing -c "DROP TABLE IF EXISTS migrations CASCADE;"
npm run migrate
```

## 📄 Licence

MIT

## 👥 Équipe

Développé pour le Concert Didi B - Moscou 2025 🎤

---

**Version:** 2.0.0  
**Status:** ✅ Production Ready  
**Database:** PostgreSQL 12+  
**Node.js:** 16+