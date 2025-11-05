# 🎫 Backend Professionnel - Système de Billetterie Didi B

## 🏗️ Architecture Enterprise avec PostgreSQL

Backend Node.js de niveau expert avec architecture modulaire, PostgreSQL, et toutes les meilleures pratiques d'une application enterprise.

## ✨ Points Forts de cette Architecture

### 🎯 Architecture Modulaire Complète
- ✅ **Separation of Concerns** : Controllers, Services, Repositories, Models
- ✅ **Clean Architecture** : Chaque couche a une responsabilité unique
- ✅ **Design Patterns** : Repository Pattern, Dependency Injection
- ✅ **SOLID Principles** : Code maintenable et extensible

### 🗄️ PostgreSQL avec Pool de Connexions
- ✅ **Pool optimisé** : 20 connexions max, retry automatique
- ✅ **Transactions** : Support complet des transactions ACID
- ✅ **Migrations** : Système de migration versionné
- ✅ **Indexes** : Optimisation des requêtes
- ✅ **Triggers** : Mise à jour automatique des timestamps
- ✅ **Views** : Statistiques pré-calculées

### 🔒 Sécurité de Niveau Production
- ✅ **JWT Authentication** : Tokens sécurisés avec expiration
- ✅ **Password Hashing** : bcrypt avec salt rounds configurables
- ✅ **Role-Based Access Control (RBAC)** : Admin vs Vendeur
- ✅ **Rate Limiting** : Protection contre les abus
- ✅ **Helmet.js** : Headers de sécurité HTTP
- ✅ **Input Validation** : Joi + express-validator
- ✅ **SQL Injection Protection** : Parameterized queries

### 📊 Logging Professionnel
- ✅ **Winston** : Logging multi-niveaux
- ✅ **Daily Rotation** : Fichiers logs rotatifs
- ✅ **Structured Logging** : JSON pour analyse
- ✅ **Error Tracking** : Stack traces complètes
- ✅ **Audit Logs** : Toutes les actions importantes

### 📈 Performance & Scalabilité
- ✅ **Connection Pooling** : Réutilisation des connexions DB
- ✅ **Query Optimization** : Indexes et prepared statements
- ✅ **Compression** : Gzip pour les réponses HTTP
- ✅ **Caching Strategy Ready** : Structure prête pour Redis
- ✅ **Horizontal Scaling Ready** : Stateless architecture

## 📁 Structure du Projet

```
backend/
├── src/
│   ├── config/                 # Configuration
│   │   ├── config.js          # Configuration centralisée
│   │   ├── database.js        # Pool PostgreSQL
│   │   └── logger.js          # Winston logger
│   │
│   ├── models/                # Modèles de données
│   │   ├── User.js            # Modèle utilisateur
│   │   └── Ticket.js          # Modèle billet
│   │
│   ├── repositories/          # Accès données (Data Access Layer)
│   │   ├── UserRepository.js
│   │   └── TicketRepository.js
│   │
│   ├── services/              # Logique métier (Business Logic Layer)
│   │   ├── AuthService.js
│   │   ├── UserService.js
│   │   ├── TicketService.js
│   │   └── StatisticsService.js
│   │
│   ├── controllers/           # Contrôleurs API
│   │   ├── AuthController.js
│   │   ├── UserController.js
│   │   ├── TicketController.js
│   │   └── StatisticsController.js
│   │
│   ├── middleware/            # Middleware Express
│   │   ├── auth.js            # Authentication JWT
│   │   ├── rbac.js            # Role-Based Access Control
│   │   ├── validator.js       # Validation des entrées
│   │   ├── errorHandler.js    # Gestion centralisée des erreurs
│   │   └── requestLogger.js   # Logging des requêtes
│   │
│   ├── routes/                # Routes API
│   │   ├── auth.routes.js
│   │   ├── user.routes.js
│   │   ├── ticket.routes.js
│   │   └── stats.routes.js
│   │
│   ├── utils/                 # Utilitaires
│   │   ├── qrCodeGenerator.js
│   │   ├── pdfGenerator.js
│   │   ├── idGenerator.js
│   │   └── validators.js
│   │
│   ├── validators/            # Schémas de validation Joi
│   │   ├── user.validator.js
│   │   └── ticket.validator.js
│   │
│   └── app.js                 # Configuration Express
│
├── database/
│   ├── migrations/            # Migrations PostgreSQL
│   │   └── migrate.js
│   └── seeds/                 # Données initiales
│       └── seed.js
│
├── tests/                     # Tests unitaires et d'intégration
│   ├── unit/
│   └── integration/
│
├── logs/                      # Fichiers de logs
│   ├── app-YYYY-MM-DD.log
│   └── error-YYYY-MM-DD.log
│
├── public/                    # Fichiers statiques
│   └── tickets/               # PDFs des billets
│
├── server.js                  # Point d'entrée
├── package.json
├── .env.example
├── .gitignore
└── README.md
```

## 🚀 Installation

### Prérequis

- **Node.js** v16+ installé
- **PostgreSQL** v12+ installé et démarré
- **npm** ou **yarn**

### Étape 1: Installation de PostgreSQL

#### Ubuntu/Debian
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

#### macOS (Homebrew)
```bash
brew install postgresql@14
brew services start postgresql@14
```

#### Windows
Télécharger depuis: https://www.postgresql.org/download/windows/

### Étape 2: Créer la base de données

```bash
# Se connecter à PostgreSQL
sudo -u postgres psql

# Dans psql:
CREATE DATABASE didi_ticketing;
CREATE USER didi_user WITH ENCRYPTED PASSWORD 'votre-mot-de-passe';
GRANT ALL PRIVILEGES ON DATABASE didi_ticketing TO didi_user;
\q
```

### Étape 3: Configuration du projet

```bash
# Extraire l'archive
tar -xzf didi-ticketing-backend-pro.tar.gz
cd didi-ticketing-pro/backend

# Installer les dépendances
npm install

# Configurer l'environnement
cp .env.example .env
nano .env  # Éditer avec vos paramètres

# Exemple de configuration .env:
DB_HOST=localhost
DB_PORT=5432
DB_NAME=didi_ticketing
DB_USER=didi_user
DB_PASSWORD=votre-mot-de-passe
JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")
```

### Étape 4: Initialiser la base de données

```bash
# Exécuter les migrations
npm run migrate

# Insérer les données initiales
npm run seed
```

### Étape 5: Démarrer le serveur

```bash
# Développement (avec auto-reload)
npm run dev

# Production
npm start
```

Le serveur démarre sur: http://localhost:5000

## 📚 API Documentation

### Authentification

#### POST /api/auth/login
Connexion utilisateur

**Request:**
```json
{
  "username": "admin",
  "password": "admin123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGc...",
    "user": {
      "id": 1,
      "username": "admin",
      "name": "Administrateur",
      "role": "admin"
    }
  }
}
```

### Utilisateurs

#### GET /api/users
Liste des utilisateurs (Admin uniquement)

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "users": [...],
    "pagination": {
      "page": 1,
      "limit": 50,
      "total": 100,
      "totalPages": 2
    }
  }
}
```

#### POST /api/users
Créer un utilisateur (Admin uniquement)

**Request:**
```json
{
  "username": "vendeur4",
  "password": "vend123",
  "name": "Nouvel Vendeur",
  "phone": "+7 999 444 4444",
  "role": "vendeur"
}
```

### Billets

#### POST /api/tickets
Créer des billets

**Request:**
```json
{
  "clientName": "Pierre Kouadio",
  "clientPhone": "+7 999 123 4567",
  "paymentMethod": "cash",
  "attendees": [
    {
      "name": "Pierre",
      "phone": "+7 999 123 4567",
      "category": "vip"
    },
    {
      "name": "Marie",
      "phone": "+7 999 234 5678",
      "category": "standard"
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "tickets": [...],
    "orderId": "ORDER-uuid"
  }
}
```

#### GET /api/tickets
Liste des billets (filtrés selon le rôle)

**Query Parameters:**
- `page` (default: 1)
- `limit` (default: 50)
- `category` (vip|standard|earlybird)
- `used` (true|false)
- `orderId` (string)

#### POST /api/tickets/:id/scan
Scanner un billet

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "Billet valide",
    "ticket": {...}
  }
}
```

#### POST /api/tickets/:id/mark-sent
Marquer comme envoyé

### Statistiques

#### GET /api/stats
Statistiques globales

**Response:**
```json
{
  "success": true,
  "data": {
    "total": 100,
    "used": 50,
    "available": 50,
    "revenue": 750000,
    "orders": 25
  }
}
```

#### GET /api/stats/vendors
Statistiques par vendeur (Admin uniquement)

## 🔐 Sécurité

### Variables d'Environnement Critiques

**⚠️ IMPORTANT - Changez ces valeurs en production:**

1. **JWT_SECRET**
```bash
# Générer une clé forte:
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

2. **DB_PASSWORD**
```bash
# Utilisez un mot de passe fort
DB_PASSWORD=un-mot-de-passe-tres-complexe-et-long
```

3. **NODE_ENV**
```bash
# En production:
NODE_ENV=production
```

### SSL/TLS pour PostgreSQL

En production, activez SSL:

```env
DB_SSL=true
```

### CORS

Configurez les origins autorisés:

```env
# En production, spécifiez votre domaine:
CORS_ORIGIN=https://votre-domaine.com
```

## 🚀 Déploiement Production

### Option 1: VPS avec PM2

```bash
# Installer PM2
npm install -g pm2

# Démarrer l'application
pm2 start server.js --name ticketing-api -i max

# Sauvegarder la configuration
pm2 save
pm2 startup

# Monitoring
pm2 monit
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
# Build
docker build -t ticketing-api .

# Run
docker run -d -p 5000:5000 \
  -e DB_HOST=your-db-host \
  -e DB_PASSWORD=your-db-password \
  --name ticketing-api \
  ticketing-api
```

### Option 3: Heroku

```bash
# Heroku Postgres
heroku addons:create heroku-postgresql:mini

# Configuration
heroku config:set NODE_ENV=production
heroku config:set JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")

# Déploiement
git push heroku main

# Migrations
heroku run npm run migrate
heroku run npm run seed
```

## 📊 Monitoring & Logs

### Consulter les logs

```bash
# Logs en temps réel
tail -f logs/app-2025-11-04.log

# Logs d'erreurs uniquement
tail -f logs/error-2025-11-04.log

# Avec PM2
pm2 logs ticketing-api
```

### Statistiques du pool PostgreSQL

```bash
# Dans psql:
SELECT * FROM pg_stat_activity WHERE datname = 'didi_ticketing';
```

## 🧪 Tests

```bash
# Exécuter tous les tests
npm test

# Tests avec coverage
npm run test:coverage

# Tests en mode watch
npm run test:watch
```

## 🛠️ Maintenance

### Backup de la base de données

```bash
# Backup
pg_dump -U didi_user didi_ticketing > backup_$(date +%Y%m%d).sql

# Restaurer
psql -U didi_user didi_ticketing < backup_20251104.sql
```

### Nettoyage des anciens PDFs

Les PDFs de plus de 30 jours peuvent être nettoyés:

```javascript
// Via l'API (admin uniquement)
POST /api/maintenance/clean-pdfs
```

### Migration de données

```bash
# Créer une nouvelle migration
# Créer le fichier dans database/migrations/

# Appliquer les migrations
npm run migrate

# Rollback (si implémenté)
npm run migrate:rollback
```

## 📈 Performance

### Optimisations Implémentées

1. **Index Database** : Sur toutes les colonnes fréquemment requêtées
2. **Connection Pooling** : 20 connexions réutilisables
3. **Query Caching Ready** : Structure prête pour Redis
4. **Compression** : Gzip automatique pour les réponses > 1KB
5. **Rate Limiting** : Protection contre les abus

### Recommandations Production

1. **PostgreSQL Configuration**
```sql
-- Dans postgresql.conf:
shared_buffers = 256MB
effective_cache_size = 1GB
maintenance_work_mem = 64MB
max_connections = 100
```

2. **Node.js Options**
```bash
# Démarrer avec plus de mémoire
node --max-old-space-size=4096 server.js
```

3. **Nginx Reverse Proxy**
```nginx
upstream ticketing_api {
    least_conn;
    server localhost:5000;
    server localhost:5001;
    server localhost:5002;
}

server {
    listen 80;
    server_name api.votre-domaine.com;

    location / {
        proxy_pass http://ticketing_api;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## 🔄 Migrations Futures

### Ajout de Redis pour le Caching

```javascript
// À implémenter dans src/config/redis.js
import Redis from 'ioredis';

const redis = new Redis({
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT,
});

export default redis;
```

### Ajout de File Upload (S3)

```javascript
// À implémenter dans src/services/StorageService.js
import AWS from 'aws-sdk';

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY,
  secretAccessKey: process.env.AWS_SECRET_KEY,
});
```

## 📞 Support

Pour toute question technique:
- Documentation: Ce README
- Issues: GitHub Issues
- Email: support@example.com

## 📄 Licence

MIT License

---

**Développé avec ❤️ pour le Concert Didi B - Moscou 2025 🎤**

## 🎉 Comptes par défaut

Après le seed:
- **Admin**: `admin` / `admin123`
- **Vendeur 1**: `vendeur1` / `vend123`
- **Vendeur 2**: `vendeur2` / `vend123`
- **Vendeur 3**: `vendeur3` / `vend123`

⚠️ **Changez ces mots de passe en production !**