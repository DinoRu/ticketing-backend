import { validationResult } from "express-validator";
import logger from "../config/logger.js";

/**
 * Middleware pour valider les résultats de express-validator
 */
export const validate = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map((error) => ({
      field: error.param,
      message: error.msg,
      value: error.value,
    }));

    logger.warn("Validation échouée:", {
      path: req.path,
      errors: errorMessages,
      userId: req.user?.id,
    });

    return res.status(400).json({
      success: false,
      error: "Validation échouée",
      details: errorMessages,
    });
  }

  next();
};

/**
 * Middleware pour nettoyer les entrées utilisateur
 * Supprime les espaces inutiles et les champs vides
 */
export const sanitize = (req, res, next) => {
  // Nettoyer le body
  if (req.body && typeof req.body === "object") {
    Object.keys(req.body).forEach((key) => {
      if (typeof req.body[key] === "string") {
        // Supprimer les espaces en début et fin
        req.body[key] = req.body[key].trim();

        // Supprimer les champs vides
        if (req.body[key] === "") {
          delete req.body[key];
        }
      }
    });
  }

  // Nettoyer les query params
  if (req.query && typeof req.query === "object") {
    Object.keys(req.query).forEach((key) => {
      if (typeof req.query[key] === "string") {
        req.query[key] = req.query[key].trim();
      }
    });
  }

  next();
};

/**
 * Middleware pour limiter la taille du body
 * @param {number} maxSize - Taille maximale en bytes
 */
export const limitBodySize = (maxSize = 1024 * 1024) => {
  // 1MB par défaut
  return (req, res, next) => {
    const contentLength = req.headers["content-length"];

    if (contentLength && parseInt(contentLength) > maxSize) {
      logger.warn("Body trop volumineux:", {
        path: req.path,
        size: contentLength,
        maxSize,
        userId: req.user?.id,
      });

      return res.status(413).json({
        success: false,
        error: "Payload trop volumineux",
        maxSize: `${maxSize} bytes`,
      });
    }

    next();
  };
};

/**
 * Middleware pour valider le format JSON
 */
export const validateJSON = (err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
    logger.warn("JSON invalide:", {
      path: req.path,
      error: err.message,
      userId: req.user?.id,
    });

    return res.status(400).json({
      success: false,
      error: "Format JSON invalide",
    });
  }

  next();
};

/**
 * Middleware pour valider les IDs numériques
 * @param {string} paramName - Nom du paramètre à valider
 */
export const validateNumericId = (paramName = "id") => {
  return (req, res, next) => {
    const id = req.params[paramName];

    if (!id || isNaN(parseInt(id)) || parseInt(id) <= 0) {
      return res.status(400).json({
        success: false,
        error: `ID invalide: ${paramName}`,
      });
    }

    next();
  };
};

/**
 * Middleware pour valider les UUID
 * @param {string} paramName - Nom du paramètre à valider
 */
export const validateUUID = (paramName = "id") => {
  return (req, res, next) => {
    const id = req.params[paramName];
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    if (!id || !uuidRegex.test(id)) {
      return res.status(400).json({
        success: false,
        error: `UUID invalide: ${paramName}`,
      });
    }

    next();
  };
};

/**
 * Middleware pour valider la pagination
 */
export const validatePagination = (req, res, next) => {
  const page = parseInt(req.query.page);
  const limit = parseInt(req.query.limit);

  if (req.query.page && (isNaN(page) || page < 1)) {
    return res.status(400).json({
      success: false,
      error: "Paramètre page invalide (doit être >= 1)",
    });
  }

  if (req.query.limit && (isNaN(limit) || limit < 1 || limit > 100)) {
    return res.status(400).json({
      success: false,
      error: "Paramètre limit invalide (doit être entre 1 et 100)",
    });
  }

  next();
};

/**
 * Middleware pour empêcher les injections SQL/NoSQL
 * Détecte les patterns suspects dans les entrées
 */
export const preventInjection = (req, res, next) => {
  const suspiciousPatterns = [
    /(\$where|\$ne|\$gt|\$lt)/i, // NoSQL injection
    /(union.*select|insert.*into|delete.*from)/i, // SQL injection
    /(<script|javascript:|onerror=)/i, // XSS
  ];

  const checkValue = (value) => {
    if (typeof value === "string") {
      return suspiciousPatterns.some((pattern) => pattern.test(value));
    }
    if (typeof value === "object" && value !== null) {
      return Object.values(value).some(checkValue);
    }
    return false;
  };

  // Vérifier body, query et params
  const inputs = [req.body, req.query, req.params];

  for (const input of inputs) {
    if (input && checkValue(input)) {
      logger.logSecurity("Tentative d'injection détectée", {
        path: req.path,
        userId: req.user?.id,
        ip: req.ip,
      });

      return res.status(400).json({
        success: false,
        error: "Entrée invalide détectée",
      });
    }
  }

  next();
};

export default {
  validate,
  sanitize,
  limitBodySize,
  validateJSON,
  validateNumericId,
  validateUUID,
  validatePagination,
  preventInjection,
};
