import morgan from "morgan";
import logger from "../config/logger.js";
import config from "../config/config.js";

/**
 * Créer un stream pour Morgan qui utilise Winston
 */
const stream = {
  write: (message) => {
    logger.http(message.trim());
  },
};

/**
 * Format de log personnalisé
 */
const customFormat =
  ":method :url :status :response-time ms - :res[content-length]";

/**
 * Middleware Morgan avec Winston
 */
export const requestLogger = morgan(customFormat, { stream });

/**
 * Middleware de logging avancé avec plus de détails
 */
export const detailedRequestLogger = (req, res, next) => {
  const startTime = Date.now();

  // Logger la requête entrante
  logger.http(`→ ${req.method} ${req.path}`, {
    ip: req.ip,
    userId: req.user?.id,
    userAgent: req.get("user-agent"),
    body: req.method !== "GET" ? sanitizeBody(req.body) : undefined,
    query: Object.keys(req.query).length > 0 ? req.query : undefined,
  });

  // Intercepter la réponse
  const originalSend = res.send;
  res.send = function (data) {
    res.send = originalSend;

    const duration = Date.now() - startTime;

    // Logger la réponse
    logger.http(`← ${req.method} ${req.path} ${res.statusCode}`, {
      duration: `${duration}ms`,
      userId: req.user?.id,
      ip: req.ip,
    });

    // Logger les requêtes lentes
    if (duration > 1000) {
      logger.warn(`Requête lente détectée: ${req.method} ${req.path}`, {
        duration: `${duration}ms`,
        userId: req.user?.id,
      });
    }

    return res.send(data);
  };

  next();
};

/**
 * Middleware pour logger uniquement les erreurs
 */
export const errorRequestLogger = (req, res, next) => {
  const startTime = Date.now();

  res.on("finish", () => {
    if (res.statusCode >= 400) {
      const duration = Date.now() - startTime;

      logger.error(`Requête échouée: ${req.method} ${req.path}`, {
        statusCode: res.statusCode,
        duration: `${duration}ms`,
        userId: req.user?.id,
        ip: req.ip,
        body: sanitizeBody(req.body),
        query: req.query,
      });
    }
  });

  next();
};

/**
 * Middleware pour logger les actions sensibles
 */
export const auditLogger = (action) => {
  return (req, res, next) => {
    logger.info(`Audit: ${action}`, {
      userId: req.user?.id,
      username: req.user?.username,
      ip: req.ip,
      userAgent: req.get("user-agent"),
      timestamp: new Date().toISOString(),
    });

    next();
  };
};

/**
 * Nettoyer le body pour ne pas logger les données sensibles
 */
function sanitizeBody(body) {
  if (!body || typeof body !== "object") {
    return body;
  }

  const sanitized = { ...body };
  const sensitiveFields = ["password", "token", "refreshToken", "secret"];

  sensitiveFields.forEach((field) => {
    if (sanitized[field]) {
      sanitized[field] = "***REDACTED***";
    }
  });

  return sanitized;
}

/**
 * Middleware pour mesurer les performances
 */
export const performanceLogger = (req, res, next) => {
  const startTime = process.hrtime();

  res.on("finish", () => {
    const [seconds, nanoseconds] = process.hrtime(startTime);
    const duration = seconds * 1000 + nanoseconds / 1000000;

    // Logger si > 500ms
    if (duration > 500) {
      logger.warn("Performance: Requête lente", {
        method: req.method,
        path: req.path,
        duration: `${duration.toFixed(2)}ms`,
        statusCode: res.statusCode,
      });
    }

    // Logger si > 2000ms
    if (duration > 2000) {
      logger.error("Performance: Requête très lente", {
        method: req.method,
        path: req.path,
        duration: `${duration.toFixed(2)}ms`,
        statusCode: res.statusCode,
        userId: req.user?.id,
      });
    }
  });

  next();
};

/**
 * Sélectionner le logger approprié selon l'environnement
 */
export const getRequestLogger = () => {
  if (config.server.env === "production") {
    return requestLogger;
  } else {
    return detailedRequestLogger;
  }
};

export default {
  requestLogger,
  detailedRequestLogger,
  errorRequestLogger,
  auditLogger,
  performanceLogger,
  getRequestLogger,
};
