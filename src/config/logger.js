import winston from "winston";
import DailyRotateFile from "winston-daily-rotate-file";
import config from "../config/config.js";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Niveaux de log personnalisés
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Couleurs pour la console
const colors = {
  error: "red",
  warn: "yellow",
  info: "green",
  http: "magenta",
  debug: "blue",
};

winston.addColors(colors);

// Format JSON pour fichiers
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

// Format lisible pour console
const consoleFormat = winston.format.combine(
  winston.format.colorize({ all: true }),
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  winston.format.printf(
    (info) => `${info.timestamp} [${info.level}]: ${info.message}`
  )
);

// Transports
const transports = [];

// Console transport (toujours actif)
transports.push(
  new winston.transports.Console({
    format:
      config.server.env === "production"
        ? winston.format.combine(
            winston.format.timestamp(),
            winston.format.simple()
          )
        : consoleFormat,
    level: config.logging.level,
  })
);

// Fichiers logs (tous les niveaux)
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

// Fichiers logs (erreurs uniquement)
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

// Création du logger
const logger = winston.createLogger({
  levels,
  format: logFormat,
  transports,
  exitOnError: false,
});

// Méthodes helper
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

export default logger;
