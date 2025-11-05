import express from "express";
import AuthController from "../controllers/AuthController.js";
import { authenticateToken } from "../middleware/auth.js";
import { sanitize, preventInjection } from "../middleware/validator.js";

const router = express.Router();

/**
 * @route   POST /api/auth/login
 * @desc    Connexion utilisateur
 * @access  Public
 */
router.post("/login", sanitize, preventInjection, AuthController.login);

/**
 * @route   POST /api/auth/logout
 * @desc    Déconnexion utilisateur
 * @access  Private
 */
router.post("/logout", authenticateToken, AuthController.logout);

/**
 * @route   POST /api/auth/refresh
 * @desc    Rafraîchir le token d'accès
 * @access  Public
 */
router.post("/refresh", sanitize, AuthController.refresh);

/**
 * @route   GET /api/auth/me
 * @desc    Obtenir les informations de l'utilisateur connecté
 * @access  Private
 */
router.get("/me", authenticateToken, AuthController.me);

/**
 * @route   POST /api/auth/verify
 * @desc    Vérifier un token JWT
 * @access  Public
 */
router.post("/verify", AuthController.verify);

/**
 * @route   POST /api/auth/revoke-all
 * @desc    Révoquer tous les tokens de l'utilisateur connecté
 * @access  Private
 */
router.post("/revoke-all", authenticateToken, AuthController.revokeAll);

export default router;
