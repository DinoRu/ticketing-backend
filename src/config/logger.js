import winston from "winston";
import DailyRotateFile from "winston-daily-rotate-file";
import config from "../config/config.js";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Définir les niveaux de log personnalisés
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Définir les couleurs pour chaque niveau
const colors = {
  error: "red",
  warn: "yellow",
  info: "green",
  http: "magenta",
  debug: "blue",
};

winston.addColors(colors);

// Format pour les logs
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

// Format pour la console (plus lisible)
const consoleFormat = winston.format.combine(
  winston.format.colorize({ all: true }),
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  winston.format.printf(
    (info) => `${info.timestamp} [${info.level}]: ${info.message}`
  )
);

// Configuration des transports
const transports = [];

// Console transport (toujours actif en développement)
if (config.server.env !== "production") {
  transports.push(
    new winston.transports.Console({
      format: consoleFormat,
      level: config.logging.level,
    })
  );
}

// File transport pour tous les logs
transports.push(
  new DailyRotateFile({
    filename: path.join(__dirname, "../../logs/app-%DATE%.log"),
    datePattern: "YYYY-MM-DD",
    zippedArchive: true,
    maxSize: config.logging.maxSize,
    maxFiles: config.logging.maxFiles,
    format: logFormat,
    level: config.logging.level,
  })
);

// File transport pour les erreurs uniquement
transports.push(
  new DailyRotateFile({
    filename: path.join(__dirname, "../../logs/error-%DATE%.log"),
    datePattern: "YYYY-MM-DD",
    zippedArchive: true,
    maxSize: config.logging.maxSize,
    maxFiles: config.logging.maxFiles,
    format: logFormat,
    level: "error",
  })
);

// Créer le logger
const logger = winston.createLogger({
  levels,
  format: logFormat,
  transports,
  exitOnError: false,
});

// Créer des méthodes helper pour faciliter l'utilisation
logger.logRequest = (req, res, duration) => {
  logger.http(
    `${req.method} ${req.originalUrl} ${res.statusCode} - ${duration}ms - ${req.ip}`
  );
};

logger.logError = (error, req = null) => {
  const errorLog = {
    message: error.message,
    stack: error.stack,
    ...(req && {
      url: req.originalUrl,
      method: req.method,
      ip: req.ip,
      userId: req.user?.id,
    }),
  };
  logger.error(errorLog);
};

logger.logAuth = (action, userId, success, ip) => {
  logger.info(
    `Auth: ${action} - User: ${userId} - Success: ${success} - IP: ${ip}`
  );
};

logger.logTicket = (action, ticketId, userId) => {
  logger.info(`Ticket: ${action} - ID: ${ticketId} - User: ${userId}`);
};

logger.logSecurity = (message, data = {}) => {
  logger.warn(`Security: ${message}`, data);
};

// En production, log aussi dans la console
if (config.server.env === "production") {
  transports.push(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.simple()
      ),
      level: "info",
    })
  );
}

export default logger;
