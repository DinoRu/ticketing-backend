import AuthService from "../services/AuthService.js";
import logger from "../config/logger.js";

class AuthController {
  /**
   * POST /api/auth/login
   * Connexion utilisateur
   */
  async login(req, res, next) {
    try {
      const { username, password } = req.body;

      // Validation
      if (!username || !password) {
        return res.status(400).json({
          success: false,
          error: "Nom d'utilisateur et mot de passe requis",
        });
      }

      // Obtenir l'IP du client
      const ipAddress = req.ip || req.connection.remoteAddress;

      // Authentification
      const result = await AuthService.login(username, password, ipAddress);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      logger.error("Erreur login controller:", error);

      if (
        error.message.includes("Identifiants") ||
        error.message.includes("désactivé")
      ) {
        return res.status(401).json({
          success: false,
          error: error.message,
        });
      }

      next(error);
    }
  }

  /**
   * POST /api/auth/logout
   * Déconnexion utilisateur
   */
  async logout(req, res, next) {
    try {
      const { refreshToken } = req.body;
      const userId = req.user.id;

      if (refreshToken) {
        await AuthService.logout(userId, refreshToken);
      }

      res.json({
        success: true,
        message: "Déconnexion réussie",
      });
    } catch (error) {
      logger.error("Erreur logout controller:", error);
      next(error);
    }
  }

  /**
   * POST /api/auth/refresh
   * Rafraîchir le token d'accès
   */
  async refresh(req, res, next) {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return res.status(400).json({
          success: false,
          error: "Refresh token requis",
        });
      }

      const result = await AuthService.refreshAccessToken(refreshToken);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      logger.error("Erreur refresh controller:", error);

      return res.status(401).json({
        success: false,
        error: "Token invalide ou expiré",
      });
    }
  }

  /**
   * GET /api/auth/me
   * Obtenir les informations de l'utilisateur connecté
   */
  async me(req, res, next) {
    try {
      const user = req.user;

      res.json({
        success: true,
        data: user,
      });
    } catch (error) {
      logger.error("Erreur me controller:", error);
      next(error);
    }
  }

  /**
   * POST /api/auth/verify
   * Vérifier un token JWT
   */
  async verify(req, res, next) {
    try {
      const { token } = req.body;

      if (!token) {
        return res.status(400).json({
          success: false,
          error: "Token requis",
        });
      }

      const decoded = await AuthService.verifyToken(token);

      res.json({
        success: true,
        data: {
          valid: true,
          payload: decoded,
        },
      });
    } catch (error) {
      res.status(401).json({
        success: false,
        data: {
          valid: false,
          error: error.message,
        },
      });
    }
  }

  /**
   * POST /api/auth/revoke-all
   * Révoquer tous les tokens d'un utilisateur
   */
  async revokeAll(req, res, next) {
    try {
      const userId = req.user.id;

      await AuthService.revokeAllTokens(userId);

      res.json({
        success: true,
        message: "Tous les tokens ont été révoqués",
      });
    } catch (error) {
      logger.error("Erreur revoke-all controller:", error);
      next(error);
    }
  }
}

export default new AuthController();
