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

/**
 * @route   POST /api/tickets/:id/sent
 * @desc    Marquer un billet comme envoyé
 * @access  Private
 */
router.post("/:id/sent", async (req, res) => {
  try {
    const ticket = await TicketService.markTicketAsSent(
      req.params.id,
      req.user
    );

    res.json({
      success: true,
      message: "Billet marqué comme envoyé",
      data: ticket,
    });
  } catch (error) {
    logger.error("Erreur marquage envoi:", error);
    res.status(400).json({
      success: false,
      message: error.message || "Erreur lors du marquage du billet",
    });
  }
});

/**
 * @route   POST /api/tickets/bulk/sent
 * @desc    Marquer plusieurs billets comme envoyés
 * @access  Private
 */
router.post("/bulk/sent", async (req, res) => {
  try {
    const { ticketIds } = req.body;

    if (!ticketIds || !Array.isArray(ticketIds) || ticketIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Liste d'IDs de billets requise",
      });
    }

    const result = await TicketService.markMultipleAsSent(ticketIds, req.user);

    res.json({
      success: true,
      message: `${result.success.length} billet(s) marqué(s) comme envoyé(s)`,
      data: result,
    });
  } catch (error) {
    logger.error("Erreur marquage multiple:", error);
    res.status(400).json({
      success: false,
      message: error.message || "Erreur lors du marquage des billets",
    });
  }
});

/**
 * @route   GET /api/tickets/:id/pdf
 * @desc    Télécharger le PDF d'un billet
 * @access  Private
 */
router.get("/:id/pdf", async (req, res) => {
  try {
    const ticket = await TicketService.getTicketById(req.params.id, req.user);

    if (!ticket.pdfPath) {
      return res.status(404).json({
        success: false,
        message: "PDF non disponible pour ce billet",
      });
    }

    // Rediriger vers l'URL du PDF
    res.redirect(ticket.pdfPath);
  } catch (error) {
    logger.error("Erreur téléchargement PDF:", error);
    res.status(404).json({
      success: false,
      message: error.message || "PDF non trouvé",
    });
  }
});

/**
 * @route   GET /api/tickets/:id/whatsapp
 * @desc    Obtenir le message WhatsApp pour un billet
 * @access  Private
 */
router.get("/:id/whatsapp", async (req, res) => {
  try {
    const message = await TicketService.getWhatsAppMessage(
      req.params.id,
      req.user
    );

    res.json({
      success: true,
      data: { message },
    });
  } catch (error) {
    logger.error("Erreur génération message WhatsApp:", error);
    res.status(400).json({
      success: false,
      message: error.message || "Erreur lors de la génération du message",
    });
  }
});

export default router;
