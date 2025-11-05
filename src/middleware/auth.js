import jwt from "jsonwebtoken";
import config from "../config/config.js";
import logger from "../config/logger.js";
import UserRepository from "../repositories/UserRepository.js";

/**
 * Middleware d'authentification JWT
 * Vérifie la présence et la validité du token
 */
export const authenticateToken = async (req, res, next) => {
  try {
    // Récupérer le token de l'en-tête Authorization
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1]; // Format: "Bearer TOKEN"

    if (!token) {
      return res.status(401).json({
        success: false,
        error: "Token d'authentification manquant",
      });
    }

    // Vérifier le token
    jwt.verify(token, config.jwt.secret, async (err, decoded) => {
      if (err) {
        logger.logSecurity("Token JWT invalide", { error: err.message });
        return res.status(403).json({
          success: false,
          error: "Token invalide ou expiré",
        });
      }

      // Récupérer l'utilisateur complet
      try {
        const user = await UserRepository.findById(decoded.id);

        if (!user) {
          return res.status(404).json({
            success: false,
            error: "Utilisateur non trouvé",
          });
        }

        if (!user.isActive) {
          return res.status(403).json({
            success: false,
            error: "Compte désactivé",
          });
        }

        // Attacher l'utilisateur à la requête
        req.user = {
          id: user.id,
          username: user.username,
          name: user.name,
          role: user.role,
          permissions: user.getPermissions(),
        };

        next();
      } catch (error) {
        logger.error("Erreur récupération utilisateur:", error);
        return res.status(500).json({
          success: false,
          error: "Erreur serveur",
        });
      }
    });
  } catch (error) {
    logger.error("Erreur middleware auth:", error);
    return res.status(500).json({
      success: false,
      error: "Erreur serveur",
    });
  }
};

/**
 * Middleware optionnel d'authentification
 * Attache l'utilisateur s'il est authentifié, sinon continue
 */
export const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
      return next();
    }

    jwt.verify(token, config.jwt.secret, async (err, decoded) => {
      if (err) {
        return next();
      }

      try {
        const user = await UserRepository.findById(decoded.id);
        if (user && user.isActive) {
          req.user = {
            id: user.id,
            username: user.username,
            name: user.name,
            role: user.role,
            permissions: user.getPermissions(),
          };
        }
      } catch (error) {
        logger.error("Erreur optionalAuth:", error);
      }

      next();
    });
  } catch (error) {
    next();
  }
};

/**
 * Middleware pour vérifier que l'utilisateur est authentifié et actif
 */
export const ensureAuthenticated = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: "Authentification requise",
    });
  }
  next();
};

export default {
  authenticateToken,
  optionalAuth,
  ensureAuthenticated,
};
