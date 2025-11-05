import jwt from "jsonwebtoken";
import config from "../config/config.js";
import logger from "../config/logger.js";
import UserRepository from "../repositories/UserRepository.js";
import database from "../config/database.js";

class AuthService {
  /**
   * Connexion utilisateur
   * @param {string} username - Nom d'utilisateur
   * @param {string} password - Mot de passe
   * @param {string} ipAddress - Adresse IP
   * @returns {Promise<Object>} Token et informations utilisateur
   */
  async login(username, password, ipAddress = null) {
    try {
      // Trouver l'utilisateur
      const user = await UserRepository.findByUsername(username);

      if (!user) {
        logger.logAuth("login_failed", username, false, ipAddress);
        throw new Error("Identifiants incorrects");
      }

      // Vérifier si l'utilisateur est actif
      if (!user.isActive) {
        logger.logAuth("login_failed_inactive", user.id, false, ipAddress);
        throw new Error("Compte désactivé");
      }

      // Vérifier le mot de passe
      const isPasswordValid = await user.comparePassword(password);
      if (!isPasswordValid) {
        logger.logAuth("login_failed_password", user.id, false, ipAddress);
        throw new Error("Identifiants incorrects");
      }

      // Générer le token JWT
      const token = this.generateAccessToken(user);
      const refreshToken = this.generateRefreshToken(user);

      // Enregistrer le refresh token en base
      await this.saveRefreshToken(user.id, refreshToken);

      // Mettre à jour le dernier login
      await UserRepository.updateLastLogin(user.id);

      // Logger le succès
      logger.logAuth("login_success", user.id, true, ipAddress);

      // Enregistrer dans l'audit log
      await this.createAuditLog({
        userId: user.id,
        action: "LOGIN",
        entityType: "auth",
        details: { username: user.username },
        ipAddress,
      });

      return {
        token,
        refreshToken,
        user: user.toJSON(),
      };
    } catch (error) {
      logger.error("Erreur login:", error);
      throw error;
    }
  }

  /**
   * Déconnexion utilisateur
   * @param {number} userId - ID de l'utilisateur
   * @param {string} token - Refresh token à révoquer
   * @returns {Promise<boolean>}
   */
  async logout(userId, token) {
    try {
      // Révoquer le refresh token
      await database.query(
        "UPDATE refresh_tokens SET is_revoked = true WHERE user_id = $1 AND token = $2",
        [userId, token]
      );

      logger.logAuth("logout", userId, true, null);

      await this.createAuditLog({
        userId,
        action: "LOGOUT",
        entityType: "auth",
        details: {},
      });

      return true;
    } catch (error) {
      logger.error("Erreur logout:", error);
      throw error;
    }
  }

  /**
   * Rafraîchir le token d'accès
   * @param {string} refreshToken - Refresh token
   * @returns {Promise<Object>} Nouveau token d'accès
   */
  async refreshAccessToken(refreshToken) {
    try {
      // Vérifier le refresh token
      const decoded = jwt.verify(refreshToken, config.jwt.secret);

      // Vérifier si le token est révoqué
      const result = await database.query(
        `SELECT * FROM refresh_tokens 
         WHERE token = $1 AND user_id = $2 AND is_revoked = false AND expires_at > NOW()`,
        [refreshToken, decoded.id]
      );

      if (result.rows.length === 0) {
        throw new Error("Refresh token invalide ou expiré");
      }

      // Récupérer l'utilisateur
      const user = await UserRepository.findById(decoded.id);
      if (!user || !user.isActive) {
        throw new Error("Utilisateur non trouvé ou inactif");
      }

      // Générer un nouveau token d'accès
      const newAccessToken = this.generateAccessToken(user);

      logger.info(`Token rafraîchi pour l'utilisateur ${user.id}`);

      return {
        token: newAccessToken,
        user: user.toJSON(),
      };
    } catch (error) {
      logger.error("Erreur refresh token:", error);
      throw new Error("Token invalide");
    }
  }

  /**
   * Générer un token d'accès JWT
   * @param {Object} user - Utilisateur
   * @returns {string} Token JWT
   */
  generateAccessToken(user) {
    const payload = {
      id: user.id,
      username: user.username,
      role: user.role,
    };

    return jwt.sign(payload, config.jwt.secret, {
      expiresIn: config.jwt.expiresIn,
    });
  }

  /**
   * Générer un refresh token
   * @param {Object} user - Utilisateur
   * @returns {string} Refresh token
   */
  generateRefreshToken(user) {
    const payload = {
      id: user.id,
      type: "refresh",
    };

    return jwt.sign(payload, config.jwt.secret, {
      expiresIn: config.jwt.refreshExpiresIn,
    });
  }

  /**
   * Sauvegarder un refresh token en base
   * @param {number} userId - ID utilisateur
   * @param {string} token - Refresh token
   * @returns {Promise<void>}
   */
  async saveRefreshToken(userId, token) {
    try {
      // Calculer la date d'expiration
      const decoded = jwt.decode(token);
      const expiresAt = new Date(decoded.exp * 1000);

      await database.query(
        `INSERT INTO refresh_tokens (user_id, token, expires_at)
         VALUES ($1, $2, $3)`,
        [userId, token, expiresAt]
      );

      logger.debug(`Refresh token sauvegardé pour user ${userId}`);
    } catch (error) {
      logger.error("Erreur save refresh token:", error);
      throw error;
    }
  }

  /**
   * Vérifier un token JWT
   * @param {string} token - Token à vérifier
   * @returns {Promise<Object>} Payload décodé
   */
  async verifyToken(token) {
    try {
      const decoded = jwt.verify(token, config.jwt.secret);
      return decoded;
    } catch (error) {
      logger.error("Token invalide:", error.message);
      throw new Error("Token invalide ou expiré");
    }
  }

  /**
   * Révoquer tous les tokens d'un utilisateur
   * @param {number} userId - ID utilisateur
   * @returns {Promise<boolean>}
   */
  async revokeAllTokens(userId) {
    try {
      await database.query(
        "UPDATE refresh_tokens SET is_revoked = true WHERE user_id = $1",
        [userId]
      );

      logger.info(`Tous les tokens révoqués pour user ${userId}`);
      return true;
    } catch (error) {
      logger.error("Erreur revoke tokens:", error);
      throw error;
    }
  }

  /**
   * Nettoyer les tokens expirés
   * @returns {Promise<number>} Nombre de tokens supprimés
   */
  async cleanExpiredTokens() {
    try {
      const result = await database.query(
        "DELETE FROM refresh_tokens WHERE expires_at < NOW() OR is_revoked = true"
      );

      logger.info(`${result.rowCount} tokens expirés nettoyés`);
      return result.rowCount;
    } catch (error) {
      logger.error("Erreur nettoyage tokens:", error);
      throw error;
    }
  }

  /**
   * Créer un log d'audit
   * @param {Object} data - Données du log
   * @returns {Promise<void>}
   */
  async createAuditLog(data) {
    try {
      await database.query(
        `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, ip_address, user_agent)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          data.userId || null,
          data.action,
          data.entityType || null,
          data.entityId || null,
          JSON.stringify(data.details || {}),
          data.ipAddress || null,
          data.userAgent || null,
        ]
      );
    } catch (error) {
      logger.error("Erreur création audit log:", error);
      // Ne pas propager l'erreur pour ne pas bloquer l'action principale
    }
  }
}

export default new AuthService();
