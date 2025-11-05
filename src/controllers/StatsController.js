import StatisticsService from "../services/StatisticsService.js";
import logger from "../config/logger.js";

class StatsController {
  /**
   * GET /api/stats
   * Obtenir les statistiques globales
   */
  async getGlobalStats(req, res, next) {
    try {
      const stats = await StatisticsService.getGlobalStats(req.user);

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      logger.error("Erreur getGlobalStats controller:", error);
      next(error);
    }
  }

  /**
   * GET /api/stats/vendors
   * Obtenir les statistiques par vendeur (admin uniquement)
   */
  async getVendorStats(req, res, next) {
    try {
      const stats = await StatisticsService.getVendorStats(req.user);

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      logger.error("Erreur getVendorStats controller:", error);

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
   * GET /api/stats/categories
   * Obtenir les statistiques par catégorie
   */
  async getCategoryStats(req, res, next) {
    try {
      const stats = await StatisticsService.getCategoryStats(req.user);

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      logger.error("Erreur getCategoryStats controller:", error);
      next(error);
    }
  }

  /**
   * GET /api/stats/users
   * Obtenir les statistiques des utilisateurs (admin uniquement)
   */
  async getUserStats(req, res, next) {
    try {
      const stats = await StatisticsService.getUserStats(req.user);

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
   * GET /api/stats/dashboard
   * Obtenir un tableau de bord complet
   */
  async getDashboard(req, res, next) {
    try {
      const dashboard = await StatisticsService.getDashboard(req.user);

      res.json({
        success: true,
        data: dashboard,
      });
    } catch (error) {
      logger.error("Erreur getDashboard controller:", error);
      next(error);
    }
  }

  /**
   * GET /api/stats/orders/:orderId
   * Obtenir les statistiques d'une commande
   */
  async getOrderStats(req, res, next) {
    try {
      const orderId = req.params.orderId;

      const stats = await StatisticsService.getOrderStats(orderId, req.user);

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      logger.error("Erreur getOrderStats controller:", error);

      if (error.message === "Commande non trouvée") {
        return res.status(404).json({
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
}

export default new StatsController();
