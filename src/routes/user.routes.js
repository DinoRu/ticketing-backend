import express from "express";
import UserController from "../controllers/UserController.js";
import { authenticateToken } from "../middleware/auth.js";
import { requireAdmin, requireOwnerOrAdmin } from "../middleware/rbac.js";
import {
  sanitize,
  preventInjection,
  validateNumericId,
  validatePagination,
} from "../middleware/validator.js";

const router = express.Router();

/**
 * @route   GET /api/users
 * @desc    Obtenir la liste des utilisateurs
 * @access  Private (Admin)
 */
router.get(
  "/",
  authenticateToken,
  requireAdmin,
  validatePagination,
  UserController.getUsers
);

/**
 * @route   GET /api/users/stats
 * @desc    Obtenir les statistiques des utilisateurs
 * @access  Private (Admin)
 */
router.get(
  "/stats",
  authenticateToken,
  requireAdmin,
  UserController.getUserStats
);

/**
 * @route   GET /api/users/search
 * @desc    Rechercher des utilisateurs
 * @access  Private (Admin)
 */
router.get(
  "/search",
  authenticateToken,
  requireAdmin,
  UserController.searchUsers
);

/**
 * @route   GET /api/users/:id
 * @desc    Obtenir un utilisateur par ID
 * @access  Private (Owner or Admin)
 */
router.get(
  "/:id",
  authenticateToken,
  validateNumericId("id"),
  requireOwnerOrAdmin("id"),
  UserController.getUserById
);

/**
 * @route   POST /api/users
 * @desc    Créer un nouvel utilisateur
 * @access  Private (Admin)
 */
router.post(
  "/",
  authenticateToken,
  requireAdmin,
  sanitize,
  preventInjection,
  UserController.createUser
);

/**
 * @route   PUT /api/users/:id
 * @desc    Mettre à jour un utilisateur
 * @access  Private (Owner or Admin)
 */
router.put(
  "/:id",
  authenticateToken,
  validateNumericId("id"),
  requireOwnerOrAdmin("id"),
  sanitize,
  preventInjection,
  UserController.updateUser
);

/**
 * @route   POST /api/users/:id/change-password
 * @desc    Changer le mot de passe d'un utilisateur
 * @access  Private (Owner or Admin)
 */
router.post(
  "/:id/change-password",
  authenticateToken,
  validateNumericId("id"),
  requireOwnerOrAdmin("id"),
  sanitize,
  UserController.changePassword
);

/**
 * @route   DELETE /api/users/:id
 * @desc    Désactiver un utilisateur
 * @access  Private (Admin)
 */
router.delete(
  "/:id",
  authenticateToken,
  requireAdmin,
  validateNumericId("id"),
  UserController.deactivateUser
);

/**
 * @route   DELETE /api/users/:id/permanent
 * @desc    Supprimer définitivement un utilisateur
 * @access  Private (Admin)
 */
router.delete(
  "/:id/permanent",
  authenticateToken,
  requireAdmin,
  validateNumericId("id"),
  UserController.deleteUser
);

export default router;
