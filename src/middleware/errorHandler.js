import logger from "../config/logger.js";
import config from "../config/config.js";

/**
 * Middleware de gestion centralisée des erreurs
 */
export const errorHandler = (err, req, res, next) => {
  // Logger l'erreur
  logger.logError(err, req);

  // Déterminer le code de statut
  let statusCode = err.statusCode || 500;
  let message = err.message || "Erreur serveur interne";

  // Types d'erreurs spécifiques
  if (err.name === "ValidationError") {
    statusCode = 400;
    message = "Erreur de validation";
  } else if (err.name === "UnauthorizedError") {
    statusCode = 401;
    message = "Non autorisé";
  } else if (err.name === "JsonWebTokenError") {
    statusCode = 401;
    message = "Token invalide";
  } else if (err.name === "TokenExpiredError") {
    statusCode = 401;
    message = "Token expiré";
  } else if (err.code === "23505") {
    // PostgreSQL unique violation
    statusCode = 409;
    message = "Cette ressource existe déjà";
  } else if (err.code === "23503") {
    // PostgreSQL foreign key violation
    statusCode = 409;
    message = "Impossible de supprimer: ressources associées";
  } else if (err.code === "23502") {
    // PostgreSQL not null violation
    statusCode = 400;
    message = "Champ requis manquant";
  }

  // Réponse d'erreur
  const errorResponse = {
    success: false,
    error: message,
  };

  // Ajouter des détails en développement
  if (config.server.env === "development") {
    errorResponse.stack = err.stack;
    errorResponse.details = {
      name: err.name,
      code: err.code,
    };
  }

  // Envoyer la réponse
  res.status(statusCode).json(errorResponse);
};

/**
 * Middleware pour gérer les routes non trouvées (404)
 */
export const notFoundHandler = (req, res, next) => {
  logger.warn(`Route non trouvée: ${req.method} ${req.path}`, {
    ip: req.ip,
    userId: req.user?.id,
  });

  res.status(404).json({
    success: false,
    error: "Route non trouvée",
    path: req.path,
  });
};

/**
 * Middleware pour gérer les erreurs asynchrones
 * Wrapper pour éviter les try-catch dans chaque contrôleur
 */
export const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Classe d'erreur personnalisée pour les erreurs métier
 */
export class AppError extends Error {
  constructor(message, statusCode = 500, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Erreur de validation
 */
export class ValidationError extends AppError {
  constructor(message, details = null) {
    super(message, 400, details);
    this.name = "ValidationError";
  }
}

/**
 * Erreur d'authentification
 */
export class AuthenticationError extends AppError {
  constructor(message = "Authentification requise") {
    super(message, 401);
    this.name = "AuthenticationError";
  }
}

/**
 * Erreur d'autorisation
 */
export class AuthorizationError extends AppError {
  constructor(message = "Accès non autorisé") {
    super(message, 403);
    this.name = "AuthorizationError";
  }
}

/**
 * Erreur de ressource non trouvée
 */
export class NotFoundError extends AppError {
  constructor(message = "Ressource non trouvée") {
    super(message, 404);
    this.name = "NotFoundError";
  }
}

/**
 * Erreur de conflit
 */
export class ConflictError extends AppError {
  constructor(message = "Conflit de ressource") {
    super(message, 409);
    this.name = "ConflictError";
  }
}

export default {
  errorHandler,
  notFoundHandler,
  asyncHandler,
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
};
