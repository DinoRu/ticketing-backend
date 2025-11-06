import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import rateLimit from "express-rate-limit";
import path from "path";
import { fileURLToPath } from "url";
import config from "./config/config.js";
import logger from "./config/logger.js";
import database from "./config/database.js";

// Middleware
import {
  getRequestLogger,
  performanceLogger,
} from "./middleware/requestLogger.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";
import {
  sanitize,
  preventInjection,
  validateJSON,
} from "./middleware/validator.js";
// Routes
import authRoutes from "./routes/auth.routes.js";
import userRoutes from "./routes/user.routes.js";
import ticketRoutes from "./routes/ticket.routes.js";
import statsRoutes from "./routes/stats.routes.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Créer l'application Express
const app = express();
app.set("trust proxy", true);

// ======================
// CONFIGURATION SÉCURITÉ
// ======================

// Helmet pour sécuriser les headers HTTP
app.use(
  helmet({
    contentSecurityPolicy: false, // Désactiver pour permettre les PDFs
    crossOriginEmbedderPolicy: false,
  })
);

// CORS
app.use(cors(config.cors));

// Rate Limiting
const limiter = rateLimit({
  windowMs: config.security.rateLimitWindowMs,
  max: config.security.rateLimitMax,
  message: {
    success: false,
    error: "Trop de requêtes, veuillez réessayer plus tard",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use("/api/", limiter);

// Rate limiting plus strict pour l'authentification
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 tentatives
  message: {
    success: false,
    error:
      "Trop de tentatives de connexion, veuillez réessayer dans 15 minutes",
  },
});

app.use("/api/auth/login", authLimiter);

// ======================
// MIDDLEWARE GÉNÉRAUX
// ======================

// Body parser
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Validation JSON
app.use(validateJSON);

// Compression des réponses
app.use(compression());

// Sanitization et prévention d'injection
app.use(sanitize);
app.use(preventInjection);

// Logging des requêtes
app.use(getRequestLogger());
app.use(performanceLogger);

// Fichiers statiques (PDFs des billets)
app.use("/tickets", express.static(path.join(__dirname, "../public/tickets")));

// ======================
// HEALTH CHECK
// ======================

app.get("/health", async (req, res) => {
  try {
    // Vérifier la connexion DB
    const dbStats = database.getPoolStats();

    res.json({
      status: "OK",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: config.server.env,
      database: {
        status: "connected",
        pool: dbStats,
      },
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        unit: "MB",
      },
    });
  } catch (error) {
    logger.error("Health check failed:", error);
    res.status(503).json({
      status: "ERROR",
      error: "Service unavailable",
    });
  }
});

// ======================
// API INFO
// ======================

app.get("/api", (req, res) => {
  res.json({
    name: "Didi B Ticketing API",
    version: "2.0.0",
    description: "API de gestion de billetterie pour le concert Didi B",
    environment: config.server.env,
    endpoints: {
      auth: "/api/auth",
      users: "/api/users",
      tickets: "/api/tickets",
      stats: "/api/stats",
    },
    documentation: "/api/docs",
  });
});

// ======================
// ROUTES API
// ======================

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/tickets", ticketRoutes);
app.use("/api/stats", statsRoutes);

// ======================
// GESTION DES ERREURS
// ======================

// Route non trouvée
app.use(notFoundHandler);

// Gestionnaire d'erreurs global
app.use(errorHandler);

// ======================
// GESTION DES SIGNAUX
// ======================

// Arrêt gracieux
const gracefulShutdown = async (signal) => {
  logger.info(`Signal ${signal} reçu. Arrêt gracieux...`);

  try {
    // Nettoyer les tokens expirés AVANT de fermer le pool
    const AuthService = (await import("./services/AuthService.js")).default;
    await AuthService.cleanExpiredTokens();
    logger.info("Tokens expirés nettoyés");

    // Fermer le pool de connexions
    await database.closePool();
    logger.info("Pool de connexions fermé");

    logger.info("Arrêt gracieux terminé");
    process.exit(0);
  } catch (error) {
    logger.error("Erreur lors de l'arrêt gracieux:", error);
    process.exit(1);
  }
};

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

// Gestion des erreurs non capturées
process.on("uncaughtException", (error) => {
  logger.error("Uncaught Exception:", error);
  gracefulShutdown("uncaughtException");
});

process.on("unhandledRejection", (reason, promise) => {
  logger.error("Unhandled Rejection at:", promise, "reason:", reason);
  gracefulShutdown("unhandledRejection");
});

export default app;
