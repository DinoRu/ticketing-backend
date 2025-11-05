import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Charger les variables d'environnement
dotenv.config({ path: path.join(__dirname, "../../.env") });

const config = {
  // Configuration du serveur
  server: {
    port: process.env.PORT || 5555,
    env: process.env.NODE_ENV || "development",
    host: process.env.HOST || "0.0.0.0",
    baseUrl: process.env.BASE_URL || "http://localhost:5555",
  },

  // Configuration de la base de données PostgreSQL
  database: {
    host: process.env.DB_HOST || "localhost",
    port: parseInt(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME || "didi_ticketing",
    user: process.env.DB_USER || "postgres",
    password: process.env.DB_PASSWORD || "postgres",
    max: parseInt(process.env.DB_POOL_MAX) || 20,
    min: parseInt(process.env.DB_POOL_MIN) || 2,
    idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT) || 30000,
    connectionTimeoutMillis:
      parseInt(process.env.DB_CONNECTION_TIMEOUT) || 2000,
    ssl:
      process.env.DB_SSL === "true"
        ? {
            rejectUnauthorized: false,
          }
        : false,
  },

  // Configuration JWT
  jwt: {
    secret:
      process.env.JWT_SECRET || "your-super-secret-key-change-in-production",
    expiresIn: process.env.JWT_EXPIRES_IN || "24h",
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d",
  },

  // Configuration de sécurité
  security: {
    bcryptSaltRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS) || 10,
    rateLimitWindowMs:
      parseInt(process.env.RATE_LIMIT_WINDOW) || 15 * 60 * 1000,
    rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX) || 100,
  },

  // Configuration CORS
  cors: {
    origin: process.env.CORS_ORIGIN || "*",
    credentials: true,
    optionsSuccessStatus: 200,
  },

  // Configuration de logging
  logging: {
    level: process.env.LOG_LEVEL || "info",
    file: process.env.LOG_FILE || "app.log",
    maxSize: process.env.LOG_MAX_SIZE || "20m",
    maxFiles: process.env.LOG_MAX_FILES || "14d",
  },

  // Configuration des fichiers
  files: {
    ticketsDir: path.join(__dirname, "../../public/tickets"),
    uploadsDir: path.join(__dirname, "../../public/uploads"),
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024, // 5MB
  },

  // Informations du concert
  concert: {
    name: "Concert Didi B",
    artist: "Didi B",
    venue: "Espace Pravda, Варшавское шоссе 26 стр 12",
    location: "Moscou, Russie",
    date: "2025-12-05",
    time: "22:00",
  },

  // Catégories de billets
  ticketCategories: {
    vip: {
      name: "VIP",
      price: 10000,
      currency: "₽",
      color: "#FFD700",
    },
    standard: {
      name: "Standard",
      price: 5000,
      currency: "₽",
      color: "#3B82F6",
    },
  },

  // Méthodes de paiement
  // paymentMethods: ["cash", "card", "transfer", "mobile"],

  // Rôles utilisateurs
  userRoles: {
    ADMIN: "admin",
    VENDOR: "vendeur",
    CONTROLLER: "controleur",
  },
};

// Validation de la configuration en production
if (config.server.env === "production") {
  const requiredEnvVars = [
    "JWT_SECRET",
    "DB_PASSWORD",
    "DB_HOST",
    "DB_NAME",
    "DB_USER",
  ];

  const missingVars = requiredEnvVars.filter(
    (varName) => !process.env[varName]
  );

  if (missingVars.length > 0) {
    console.error("❌ Variables d'environnement manquantes:", missingVars);
    process.exit(1);
  }
}

export default config;
