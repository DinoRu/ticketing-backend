import express from "express";
import StatsController from "../controllers/StatsController.js";
import StatisticsService from "../services/StatisticsService.js";
import { authenticateToken } from "../middleware/auth.js";
import { requireAdmin, requireVendor } from "../middleware/rbac.js";
import { validatePagination } from "../middleware/validator.js";

const router = express.Router();

/**
 * @route   GET /api/stats
 * @desc    Obtenir les statistiques globales
 * @access  Private (Vendor or Admin)
 */
router.get(
  "/",
  authenticateToken,
  requireVendor,
  StatsController.getGlobalStats
);

/**
 * @route   GET /api/stats/dashboard
 * @desc    Obtenir le tableau de bord complet
 * @access  Private (Vendor or Admin)
 */
router.get(
  "/dashboard",
  authenticateToken,
  requireVendor,
  StatsController.getDashboard
);

/**
 * @route   GET /api/stats/vendors
 * @desc    Obtenir les statistiques par vendeur
 * @access  Private (Admin)
 */
router.get(
  "/vendors",
  authenticateToken,
  requireAdmin,
  StatsController.getVendorStats
);

/**
 * @route   GET /api/stats/categories
 * @desc    Obtenir les statistiques par catégorie
 * @access  Private (Vendor or Admin)
 */
router.get(
  "/categories",
  authenticateToken,
  requireVendor,
  StatsController.getCategoryStats
);

/**
 * @route   GET /api/stats/users
 * @desc    Obtenir les statistiques des utilisateurs
 * @access  Private (Admin)
 */
router.get(
  "/users",
  authenticateToken,
  requireAdmin,
  StatsController.getUserStats
);

/**
 * @route   GET /api/stats/orders/:orderId
 * @desc    Obtenir les statistiques d'une commande
 * @access  Private (Vendor or Admin)
 */
router.get(
  "/orders/:orderId",
  authenticateToken,
  requireVendor,
  StatsController.getOrderStats
);

/**
 * @route   GET /api/orders
 * @desc    Obtenir la liste des commandes
 * @access  Private (Vendor or Admin)
 */
router.get(
  "/orders",
  authenticateToken,
  requireVendor,
  validatePagination,
  async (req, res, next) => {
    try {
      const options = {
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 50,
      };

      const result = await StatisticsService.getOrders(options, req.user);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
