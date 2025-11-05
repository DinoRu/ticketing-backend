import config from "../config/config.js";
import logger from "../config/logger.js";

/**
 * Middleware pour vérifier que l'utilisateur est admin
 */
export const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: "Authentification requise",
    });
  }

  if (req.user.role !== config.userRoles.ADMIN) {
    logger.logSecurity("Tentative d'accès admin non autorisé", {
      userId: req.user.id,
      username: req.user.username,
      role: req.user.role,
      path: req.path,
    });

    return res.status(403).json({
      success: false,
      error: "Accès réservé aux administrateurs",
    });
  }

  next();
};

/**
 * Middleware pour vérifier que l'utilisateur est vendeur ou admin
 */
export const requireVendor = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: "Authentification requise",
    });
  }

  const allowedRoles = [config.userRoles.ADMIN, config.userRoles.VENDOR];

  if (!allowedRoles.includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      error: "Accès non autorisé",
    });
  }

  next();
};

/**
 * Middleware pour vérifier une permission spécifique
 * @param {string} permission - Permission requise
 */
export const requirePermission = (permission) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: "Authentification requise",
      });
    }

    if (!req.user.permissions || !req.user.permissions.includes(permission)) {
      logger.logSecurity("Permission refusée", {
        userId: req.user.id,
        permission,
        path: req.path,
      });

      return res.status(403).json({
        success: false,
        error: "Permission insuffisante",
      });
    }

    next();
  };
};

/**
 * Middleware pour vérifier plusieurs permissions (OU logique)
 * @param {Array<string>} permissions - Permissions (l'utilisateur doit en avoir au moins une)
 */
export const requireAnyPermission = (permissions) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: "Authentification requise",
      });
    }

    if (!req.user.permissions) {
      return res.status(403).json({
        success: false,
        error: "Permission insuffisante",
      });
    }

    const hasPermission = permissions.some((permission) =>
      req.user.permissions.includes(permission)
    );

    if (!hasPermission) {
      logger.logSecurity("Permissions multiples refusées", {
        userId: req.user.id,
        permissionsRequired: permissions,
        path: req.path,
      });

      return res.status(403).json({
        success: false,
        error: "Permission insuffisante",
      });
    }

    next();
  };
};

/**
 * Middleware pour vérifier plusieurs permissions (ET logique)
 * @param {Array<string>} permissions - Permissions (l'utilisateur doit toutes les avoir)
 */
export const requireAllPermissions = (permissions) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: "Authentification requise",
      });
    }

    if (!req.user.permissions) {
      return res.status(403).json({
        success: false,
        error: "Permission insuffisante",
      });
    }

    const hasAllPermissions = permissions.every((permission) =>
      req.user.permissions.includes(permission)
    );

    if (!hasAllPermissions) {
      logger.logSecurity("Permissions multiples requises manquantes", {
        userId: req.user.id,
        permissionsRequired: permissions,
        path: req.path,
      });

      return res.status(403).json({
        success: false,
        error: "Permissions insuffisantes",
      });
    }

    next();
  };
};

/**
 * Middleware pour vérifier que l'utilisateur accède à ses propres données
 * ou est admin
 * @param {string} paramName - Nom du paramètre contenant l'ID utilisateur
 */
export const requireOwnerOrAdmin = (paramName = "id") => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: "Authentification requise",
      });
    }

    const resourceUserId = parseInt(req.params[paramName]);

    // Admin a accès à tout
    if (req.user.role === config.userRoles.ADMIN) {
      return next();
    }

    // Utilisateur normal doit accéder à ses propres données
    if (req.user.id !== resourceUserId) {
      logger.logSecurity(
        "Tentative d'accès aux données d'un autre utilisateur",
        {
          userId: req.user.id,
          targetUserId: resourceUserId,
          path: req.path,
        }
      );

      return res.status(403).json({
        success: false,
        error: "Accès non autorisé",
      });
    }

    next();
  };
};

/**
 * Middleware pour vérifier que l'utilisateur a le droit de scanner
 * Autorisé pour: admin, vendeur, controleur
 */
export const requireScanner = (req, res, next) => {
  const allowedRoles = ["admin", "vendeur", "controleur"];

  if (!req.user) {
    logger.warn("Tentative de scan sans authentification", {
      ip: req.ip,
      path: req.path,
    });
    return res.status(401).json({
      success: false,
      error: "Authentification requise pour scanner",
    });
  }

  if (!allowedRoles.includes(req.user.role)) {
    logger.logSecurity("Tentative de scan non autorisée", {
      userId: req.user.id,
      username: req.user.username,
      role: req.user.role,
      path: req.path,
      ip: req.ip,
    });

    return res.status(403).json({
      success: false,
      error: "Accès refusé - Rôle contrôleur requis pour scanner",
    });
  }

  logger.debug(`Scan autorisé pour ${req.user.username} (${req.user.role})`);
  next();
};

export default {
  requireAdmin,
  requireVendor,
  requirePermission,
  requireAnyPermission,
  requireAllPermissions,
  requireOwnerOrAdmin,
  requireScanner,
};
