import logger from "../config/logger.js";
import UserRepository from "../repositories/UserRepository.js";
import User from "../models/User.js";
import AuthService from "./AuthService.js";

class UserService {
  /**
   * Créer un nouvel utilisateur
   * @param {Object} userData - Données de l'utilisateur
   * @param {Object} currentUser - Utilisateur effectuant l'action
   * @returns {Promise<Object>} Utilisateur créé
   */
  async createUser(userData, currentUser) {
    try {
      // Valider les données
      const errors = User.validate(userData);
      if (errors.length > 0) {
        throw new Error(errors.join(", "));
      }

      // Vérifier que l'username n'existe pas déjà
      const existingUser = await UserRepository.findByUsername(
        userData.username
      );
      if (existingUser) {
        throw new Error("Nom d'utilisateur déjà existant");
      }

      // Créer l'utilisateur
      const user = await UserRepository.create(userData);

      logger.info(`Utilisateur créé: ${user.id} par ${currentUser.id}`);

      // Audit log
      await AuthService.createAuditLog({
        userId: currentUser.id,
        action: "USER_CREATE",
        entityType: "user",
        entityId: user.id.toString(),
        details: {
          username: user.username,
          role: user.role,
        },
      });

      return user.toJSON();
    } catch (error) {
      logger.error("Erreur création utilisateur:", error);
      throw error;
    }
  }

  /**
   * Obtenir un utilisateur par ID
   * @param {number} userId - ID de l'utilisateur
   * @param {Object} currentUser - Utilisateur effectuant l'action
   * @returns {Promise<Object>} Utilisateur
   */
  async getUserById(userId, currentUser) {
    try {
      // Les vendeurs peuvent seulement voir leur propre profil
      if (currentUser.role !== "admin" && currentUser.id !== userId) {
        throw new Error("Accès non autorisé");
      }

      const user = await UserRepository.findById(userId);
      if (!user) {
        throw new Error("Utilisateur non trouvé");
      }

      return user.toJSON();
    } catch (error) {
      logger.error("Erreur récupération utilisateur:", error);
      throw error;
    }
  }

  /**
   * Obtenir la liste des utilisateurs avec pagination
   * @param {Object} options - Options de recherche
   * @param {Object} currentUser - Utilisateur effectuant l'action
   * @returns {Promise<Object>} Liste paginée
   */
  async getUsers(options, currentUser) {
    try {
      // Seul l'admin peut lister tous les utilisateurs
      if (currentUser.role !== "admin") {
        throw new Error("Accès non autorisé");
      }

      const result = await UserRepository.findAll(options);

      return {
        users: result.users.map((user) => user.toJSON()),
        pagination: result.pagination,
      };
    } catch (error) {
      logger.error("Erreur liste utilisateurs:", error);
      throw error;
    }
  }

  /**
   * Mettre à jour un utilisateur
   * @param {number} userId - ID de l'utilisateur
   * @param {Object} userData - Données à mettre à jour
   * @param {Object} currentUser - Utilisateur effectuant l'action
   * @returns {Promise<Object>} Utilisateur mis à jour
   */
  async updateUser(userId, userData, currentUser) {
    try {
      // Vérifier les permissions
      if (currentUser.role !== "admin" && currentUser.id !== userId) {
        throw new Error("Accès non autorisé");
      }

      // Les vendeurs ne peuvent pas changer leur rôle
      if (currentUser.role !== "admin" && userData.role) {
        throw new Error("Vous ne pouvez pas modifier votre rôle");
      }

      // Valider les données
      const errors = User.validate(userData, true);
      if (errors.length > 0) {
        throw new Error(errors.join(", "));
      }

      // Mettre à jour
      const user = await UserRepository.update(userId, userData);

      logger.info(`Utilisateur mis à jour: ${userId} par ${currentUser.id}`);

      // Audit log
      await AuthService.createAuditLog({
        userId: currentUser.id,
        action: "USER_UPDATE",
        entityType: "user",
        entityId: userId.toString(),
        details: {
          updates: Object.keys(userData),
        },
      });

      return user.toJSON();
    } catch (error) {
      logger.error("Erreur mise à jour utilisateur:", error);
      throw error;
    }
  }

  /**
   * Désactiver un utilisateur
   * @param {number} userId - ID de l'utilisateur
   * @param {Object} currentUser - Utilisateur effectuant l'action
   * @returns {Promise<boolean>}
   */
  async deactivateUser(userId, currentUser) {
    try {
      // Seul l'admin peut désactiver
      if (currentUser.role !== "admin") {
        throw new Error("Accès non autorisé");
      }

      // Ne pas se désactiver soi-même
      if (userId === currentUser.id) {
        throw new Error("Vous ne pouvez pas vous désactiver vous-même");
      }

      await UserRepository.delete(userId);

      logger.info(`Utilisateur désactivé: ${userId} par ${currentUser.id}`);

      // Révoquer tous les tokens de l'utilisateur
      await AuthService.revokeAllTokens(userId);

      // Audit log
      await AuthService.createAuditLog({
        userId: currentUser.id,
        action: "USER_DEACTIVATE",
        entityType: "user",
        entityId: userId.toString(),
        details: {},
      });

      return true;
    } catch (error) {
      logger.error("Erreur désactivation utilisateur:", error);
      throw error;
    }
  }

  /**
   * Supprimer définitivement un utilisateur
   * @param {number} userId - ID de l'utilisateur
   * @param {Object} currentUser - Utilisateur effectuant l'action
   * @returns {Promise<boolean>}
   */
  async deleteUser(userId, currentUser) {
    try {
      // Seul l'admin peut supprimer
      if (currentUser.role !== "admin") {
        throw new Error("Accès non autorisé");
      }

      // Ne pas se supprimer soi-même
      if (userId === currentUser.id) {
        throw new Error("Vous ne pouvez pas vous supprimer vous-même");
      }

      await UserRepository.hardDelete(userId);

      logger.info(`Utilisateur supprimé: ${userId} par ${currentUser.id}`);

      // Audit log
      await AuthService.createAuditLog({
        userId: currentUser.id,
        action: "USER_DELETE",
        entityType: "user",
        entityId: userId.toString(),
        details: {},
      });

      return true;
    } catch (error) {
      logger.error("Erreur suppression utilisateur:", error);
      throw error;
    }
  }

  /**
   * Changer le mot de passe d'un utilisateur
   * @param {number} userId - ID de l'utilisateur
   * @param {string} currentPassword - Mot de passe actuel
   * @param {string} newPassword - Nouveau mot de passe
   * @param {Object} currentUser - Utilisateur effectuant l'action
   * @returns {Promise<boolean>}
   */
  async changePassword(userId, currentPassword, newPassword, currentUser) {
    try {
      // Vérifier les permissions
      if (currentUser.role !== "admin" && currentUser.id !== userId) {
        throw new Error("Accès non autorisé");
      }

      // Récupérer l'utilisateur
      const user = await UserRepository.findById(userId);
      if (!user) {
        throw new Error("Utilisateur non trouvé");
      }

      // Si pas admin, vérifier le mot de passe actuel
      if (currentUser.role !== "admin") {
        const isValid = await user.comparePassword(currentPassword);
        if (!isValid) {
          throw new Error("Mot de passe actuel incorrect");
        }
      }

      // Valider le nouveau mot de passe
      if (!newPassword || newPassword.length < 6) {
        throw new Error(
          "Le nouveau mot de passe doit contenir au moins 6 caractères"
        );
      }

      // Mettre à jour
      await UserRepository.update(userId, { password: newPassword });

      // Révoquer tous les tokens existants
      await AuthService.revokeAllTokens(userId);

      logger.info(`Mot de passe changé pour utilisateur ${userId}`);

      // Audit log
      await AuthService.createAuditLog({
        userId: currentUser.id,
        action: "PASSWORD_CHANGE",
        entityType: "user",
        entityId: userId.toString(),
        details: {},
      });

      return true;
    } catch (error) {
      logger.error("Erreur changement mot de passe:", error);
      throw error;
    }
  }

  /**
   * Obtenir les statistiques des utilisateurs
   * @param {Object} currentUser - Utilisateur effectuant l'action
   * @returns {Promise<Object>} Statistiques
   */
  async getUserStats(currentUser) {
    try {
      // Seul l'admin peut voir les stats
      if (currentUser.role !== "admin") {
        throw new Error("Accès non autorisé");
      }

      const stats = await UserRepository.getStats();
      return stats;
    } catch (error) {
      logger.error("Erreur stats utilisateurs:", error);
      throw error;
    }
  }

  /**
   * Rechercher des utilisateurs
   * @param {string} query - Terme de recherche
   * @param {Object} currentUser - Utilisateur effectuant l'action
   * @returns {Promise<Array>} Utilisateurs trouvés
   */
  async searchUsers(query, currentUser) {
    try {
      // Seul l'admin peut rechercher
      if (currentUser.role !== "admin") {
        throw new Error("Accès non autorisé");
      }

      // Recherche simple par nom ou username
      const result = await UserRepository.findAll({
        limit: 10,
        sortBy: "name",
        sortOrder: "ASC",
      });

      // Filtrer localement (pour simplifier)
      const filtered = result.users.filter(
        (user) =>
          user.name.toLowerCase().includes(query.toLowerCase()) ||
          user.username.toLowerCase().includes(query.toLowerCase())
      );

      return filtered.map((user) => user.toJSON());
    } catch (error) {
      logger.error("Erreur recherche utilisateurs:", error);
      throw error;
    }
  }
}

export default new UserService();
