import express from "express";
import TicketController from "../controllers/TicketController.js";
import { authenticateToken } from "../middleware/auth.js";
import { requireVendor, requireScanner } from "../middleware/rbac.js";
import {
  sanitize,
  preventInjection,
  validatePagination,
} from "../middleware/validator.js";

const router = express.Router();

/**
 * @route   POST /api/tickets
 * @desc    Créer des billets
 * @access  Private (Vendor or Admin)
 */
router.post(
  "/",
  authenticateToken,
  requireVendor,
  sanitize,
  preventInjection,
  TicketController.createTickets
);

/**
 * @route   GET /api/tickets
 * @desc    Obtenir la liste des billets
 * @access  Private (Vendor or Admin)
 */
router.get(
  "/",
  authenticateToken,
  requireVendor,
  validatePagination,
  TicketController.getTickets
);

/**
 * @route   POST /api/tickets/mark-sent-batch
 * @desc    Marquer plusieurs billets comme envoyés
 * @access  Private (Vendor or Admin)
 */
router.post(
  "/mark-sent-batch",
  authenticateToken,
  requireVendor,
  TicketController.markMultipleAsSent
);

/**
 * @route   GET /api/tickets/order/:orderId
 * @desc    Obtenir les billets d'une commande
 * @access  Private (Vendor or Admin)
 */
router.get(
  "/order/:orderId",
  authenticateToken,
  requireVendor,
  TicketController.getOrderTickets
);

/**
 * @route   GET /api/tickets/:id
 * @desc    Obtenir un billet par ID
 * @access  Private (Vendor or Admin)
 */
router.get(
  "/:id",
  authenticateToken,
  requireVendor,
  TicketController.getTicketById
);

/**
 * @route   POST /api/tickets/:id/scan
 * @desc    Scanner un billet à l'entrée
 * @access  Private (Admin, Vendor, Controleur)
 */
router.post(
  "/:id/scan",
  authenticateToken,
  requireScanner,
  TicketController.scanTicket
);

/**
 * @route   POST /api/tickets/:id/mark-sent
 * @desc    Marquer un billet comme envoyé
 * @access  Private (Vendor or Admin)
 */
router.post(
  "/:id/mark-sent",
  authenticateToken,
  requireVendor,
  TicketController.markAsSent
);

/**
 * @route   GET /api/tickets/:id/whatsapp-message
 * @desc    Obtenir le message WhatsApp pour un billet
 * @access  Private (Vendor or Admin)
 */
router.get(
  "/:id/whatsapp-message",
  authenticateToken,
  requireVendor,
  TicketController.getWhatsAppMessage
);

/**
 * @route   GET /api/tickets/:id/pdf
 * @desc    Télécharger le PDF d'un billet
 * @access  Private (Vendor or Admin)
 */
router.get(
  "/:id/pdf",
  authenticateToken,
  requireVendor,
  TicketController.downloadPDF
);

/**
 * @route   DELETE /api/tickets/:id
 * @desc    Supprimer un billet
 * @access  Private (Admin)
 */
router.delete(
  "/:id",
  authenticateToken,
  requireVendor,
  TicketController.deleteTicket
);

export default router;
