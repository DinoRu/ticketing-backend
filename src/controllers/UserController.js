import UserService from "../services/UserService.js";
import logger from "../config/logger.js";

class UserController {
  /**
   * GET /api/users
   * Obtenir la liste des utilisateurs
   */
  async getUsers(req, res, next) {
    try {
      const options = {
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 50,
        role: req.query.role || null,
        isActive:
          req.query.isActive !== undefined
            ? req.query.isActive === "true"
            : null,
        sortBy: req.query.sortBy || "created_at",
        sortOrder: req.query.sortOrder || "DESC",
      };

      const result = await UserService.getUsers(options, req.user);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      logger.error("Erreur getUsers controller:", error);

      if (error.message === "Accès non autorisé") {
        return res.status(403).json({
          success: false,
          error: error.message,
        });
      }

      next(error);
    }
  }

  /**
   * GET /api/users/:id
   * Obtenir un utilisateur par ID
   */
  async getUserById(req, res, next) {
    try {
      const userId = parseInt(req.params.id);

      if (isNaN(userId)) {
        return res.status(400).json({
          success: false,
          error: "ID utilisateur invalide",
        });
      }

      const user = await UserService.getUserById(userId, req.user);

      res.json({
        success: true,
        data: user,
      });
    } catch (error) {
      logger.error("Erreur getUserById controller:", error);

      if (error.message === "Accès non autorisé") {
        return res.status(403).json({
          success: false,
          error: error.message,
        });
      }

      if (error.message === "Utilisateur non trouvé") {
        return res.status(404).json({
          success: false,
          error: error.message,
        });
      }

      next(error);
    }
  }

  /**
   * POST /api/users
   * Créer un nouvel utilisateur
   */
  async createUser(req, res, next) {
    try {
      const userData = {
        username: req.body.username,
        password: req.body.password,
        name: req.body.name,
        phone: req.body.phone,
        role: req.body.role || "vendeur",
      };

      const user = await UserService.createUser(userData, req.user);

      res.status(201).json({
        success: true,
        data: user,
        message: "Utilisateur créé avec succès",
      });
    } catch (error) {
      logger.error("Erreur createUser controller:", error);

      if (
        error.message.includes("déjà existant") ||
        error.message.includes("validation")
      ) {
        return res.status(400).json({
          success: false,
          error: error.message,
        });
      }

      next(error);
    }
  }

  /**
   * PUT /api/users/:id
   * Mettre à jour un utilisateur
   */
  async updateUser(req, res, next) {
    try {
      const userId = parseInt(req.params.id);

      if (isNaN(userId)) {
        return res.status(400).json({
          success: false,
          error: "ID utilisateur invalide",
        });
      }

      const userData = {
        name: req.body.name,
        phone: req.body.phone,
        password: req.body.password,
        role: req.body.role,
        isActive: req.body.isActive,
      };

      // Supprimer les champs undefined
      Object.keys(userData).forEach(
        (key) => userData[key] === undefined && delete userData[key]
      );

      const user = await UserService.updateUser(userId, userData, req.user);

      res.json({
        success: true,
        data: user,
        message: "Utilisateur mis à jour avec succès",
      });
    } catch (error) {
      logger.error("Erreur updateUser controller:", error);

      if (
        error.message === "Accès non autorisé" ||
        error.message.includes("modifier")
      ) {
        return res.status(403).json({
          success: false,
          error: error.message,
        });
      }

      if (error.message === "Utilisateur non trouvé") {
        return res.status(404).json({
          success: false,
          error: error.message,
        });
      }

      next(error);
    }
  }

  /**
   * DELETE /api/users/:id
   * Désactiver un utilisateur
   */
  async deactivateUser(req, res, next) {
    try {
      const userId = parseInt(req.params.id);

      if (isNaN(userId)) {
        return res.status(400).json({
          success: false,
          error: "ID utilisateur invalide",
        });
      }

      await UserService.deactivateUser(userId, req.user);

      res.json({
        success: true,
        message: "Utilisateur désactivé avec succès",
      });
    } catch (error) {
      logger.error("Erreur deactivateUser controller:", error);

      if (
        error.message === "Accès non autorisé" ||
        error.message.includes("désactiver")
      ) {
        return res.status(403).json({
          success: false,
          error: error.message,
        });
      }

      if (error.message === "Utilisateur non trouvé") {
        return res.status(404).json({
          success: false,
          error: error.message,
        });
      }

      next(error);
    }
  }

  /**
   * DELETE /api/users/:id/permanent
   * Supprimer définitivement un utilisateur
   */
  async deleteUser(req, res, next) {
    try {
      const userId = parseInt(req.params.id);

      if (isNaN(userId)) {
        return res.status(400).json({
          success: false,
          error: "ID utilisateur invalide",
        });
      }

      await UserService.deleteUser(userId, req.user);

      res.json({
        success: true,
        message: "Utilisateur supprimé définitivement",
      });
    } catch (error) {
      logger.error("Erreur deleteUser controller:", error);

      if (
        error.message === "Accès non autorisé" ||
        error.message.includes("supprimer")
      ) {
        return res.status(403).json({
          success: false,
          error: error.message,
        });
      }

      if (error.message.includes("billets associés")) {
        return res.status(409).json({
          success: false,
          error: error.message,
        });
      }

      next(error);
    }
  }

  /**
   * POST /api/users/:id/change-password
   * Changer le mot de passe d'un utilisateur
   */
  async changePassword(req, res, next) {
    try {
      const userId = parseInt(req.params.id);
      const { currentPassword, newPassword } = req.body;

      if (isNaN(userId)) {
        return res.status(400).json({
          success: false,
          error: "ID utilisateur invalide",
        });
      }

      if (!newPassword) {
        return res.status(400).json({
          success: false,
          error: "Nouveau mot de passe requis",
        });
      }

      await UserService.changePassword(
        userId,
        currentPassword,
        newPassword,
        req.user
      );

      res.json({
        success: true,
        message: "Mot de passe modifié avec succès",
      });
    } catch (error) {
      logger.error("Erreur changePassword controller:", error);

      if (
        error.message.includes("incorrect") ||
        error.message.includes("caractères")
      ) {
        return res.status(400).json({
          success: false,
          error: error.message,
        });
      }

      if (error.message === "Accès non autorisé") {
        return res.status(403).json({
          success: false,
          error: error.message,
        });
      }

      next(error);
    }
  }

  /**
   * GET /api/users/stats
   * Obtenir les statistiques des utilisateurs
   */
  async getUserStats(req, res, next) {
    try {
      const stats = await UserService.getUserStats(req.user);

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      logger.error("Erreur getUserStats controller:", error);

      if (error.message === "Accès non autorisé") {
        return res.status(403).json({
          success: false,
          error: error.message,
        });
      }

      next(error);
    }
  }

  /**
   * GET /api/users/search
   * Rechercher des utilisateurs
   */
  async searchUsers(req, res, next) {
    try {
      const query = req.query.q || "";

      if (query.length < 2) {
        return res.status(400).json({
          success: false,
          error: "La recherche doit contenir au moins 2 caractères",
        });
      }

      const users = await UserService.searchUsers(query, req.user);

      res.json({
        success: true,
        data: users,
      });
    } catch (error) {
      logger.error("Erreur searchUsers controller:", error);

      if (error.message === "Accès non autorisé") {
        return res.status(403).json({
          success: false,
          error: error.message,
        });
      }

      next(error);
    }
  }
}

export default new UserController();
