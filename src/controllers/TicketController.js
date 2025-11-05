import TicketService from "../services/TicketService.js";
import logger from "../config/logger.js";

class TicketController {
  /**
   * POST /api/tickets
   * Créer des billets
   */
  async createTickets(req, res, next) {
    try {
      const orderData = {
        clientName: req.body.clientName,
        clientPhone: req.body.clientPhone,
        attendees: req.body.attendees,
      };

      const result = await TicketService.createTickets(orderData, req.user);

      res.status(201).json({
        success: true,
        data: result,
        message: `${result.tickets.length} billet(s) créé(s) avec succès`,
      });
    } catch (error) {
      logger.error("Erreur createTickets controller:", error);

      if (
        error.message.includes("requis") ||
        error.message.includes("invalide")
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
   * GET /api/tickets
   * Obtenir la liste des billets
   */
  async getTickets(req, res, next) {
    try {
      const options = {
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 50,
        orderId: req.query.orderId || null,
        category: req.query.category || null,
        used: req.query.used !== undefined ? req.query.used === "true" : null,
        sentWhatsapp:
          req.query.sentWhatsapp !== undefined
            ? req.query.sentWhatsapp === "true"
            : null,
        sortBy: req.query.sortBy || "created_at",
        sortOrder: req.query.sortOrder || "DESC",
      };

      const result = await TicketService.getTickets(options, req.user);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      logger.error("Erreur getTickets controller:", error);
      next(error);
    }
  }

  /**
   * GET /api/tickets/:id
   * Obtenir un billet par ID
   */
  async getTicketById(req, res, next) {
    try {
      const ticketId = req.params.id;

      const ticket = await TicketService.getTicketById(ticketId, req.user);

      res.json({
        success: true,
        data: ticket,
      });
    } catch (error) {
      logger.error("Erreur getTicketById controller:", error);

      if (error.message === "Billet non trouvé") {
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

  /**
   * POST /api/tickets/:id/scan
   * Scanner un billet
   */
  async scanTicket(req, res, next) {
    try {
      const ticketId = req.params.id;

      const result = await TicketService.scanTicket(ticketId, req.user);

      const statusCode = result.success ? 200 : 400;

      res.status(statusCode).json({
        success: result.success,
        data: result,
      });
    } catch (error) {
      logger.error("Erreur scanTicket controller:", error);
      next(error);
    }
  }

  /**
   * POST /api/tickets/:id/mark-sent
   * Marquer un billet comme envoyé
   */
  async markAsSent(req, res, next) {
    try {
      const ticketId = req.params.id;

      const ticket = await TicketService.markTicketAsSent(ticketId, req.user);

      res.json({
        success: true,
        data: ticket,
        message: "Billet marqué comme envoyé",
      });
    } catch (error) {
      logger.error("Erreur markAsSent controller:", error);

      if (error.message === "Billet non trouvé") {
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

  /**
   * POST /api/tickets/mark-sent-batch
   * Marquer plusieurs billets comme envoyés
   */
  async markMultipleAsSent(req, res, next) {
    try {
      const { ticketIds } = req.body;

      if (!ticketIds || !Array.isArray(ticketIds)) {
        return res.status(400).json({
          success: false,
          error: "Liste de IDs de billets requise",
        });
      }

      const result = await TicketService.markMultipleAsSent(
        ticketIds,
        req.user
      );

      res.json({
        success: true,
        data: result,
        message: `${result.success.length} billet(s) marqué(s) comme envoyé(s)`,
      });
    } catch (error) {
      logger.error("Erreur markMultipleAsSent controller:", error);
      next(error);
    }
  }

  /**
   * GET /api/tickets/order/:orderId
   * Obtenir les billets d'une commande
   */
  async getOrderTickets(req, res, next) {
    try {
      const orderId = req.params.orderId;

      const tickets = await TicketService.getOrderTickets(orderId, req.user);

      res.json({
        success: true,
        data: tickets,
      });
    } catch (error) {
      logger.error("Erreur getOrderTickets controller:", error);

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

  /**
   * DELETE /api/tickets/:id
   * Supprimer un billet
   */
  async deleteTicket(req, res, next) {
    try {
      const ticketId = req.params.id;

      await TicketService.deleteTicket(ticketId, req.user);

      res.json({
        success: true,
        message: "Billet supprimé avec succès",
      });
    } catch (error) {
      logger.error("Erreur deleteTicket controller:", error);

      if (error.message === "Billet non trouvé") {
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

      if (error.message.includes("déjà utilisé")) {
        return res.status(400).json({
          success: false,
          error: error.message,
        });
      }

      next(error);
    }
  }

  /**
   * GET /api/tickets/:id/whatsapp-message
   * Obtenir le message WhatsApp pour un billet
   */
  async getWhatsAppMessage(req, res, next) {
    try {
      const ticketId = req.params.id;

      const message = await TicketService.getWhatsAppMessage(
        ticketId,
        req.user
      );

      res.json({
        success: true,
        data: {
          message,
          ticketId,
        },
      });
    } catch (error) {
      logger.error("Erreur getWhatsAppMessage controller:", error);

      if (error.message === "Billet non trouvé") {
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

  /**
   * GET /api/tickets/:id/pdf
   * Télécharger le PDF d'un billet
   */
  async downloadPDF(req, res, next) {
    try {
      const ticketId = req.params.id;

      const ticket = await TicketService.getTicketById(ticketId, req.user);

      if (!ticket.pdfPath) {
        return res.status(404).json({
          success: false,
          error: "PDF non disponible pour ce billet",
        });
      }

      // Rediriger vers le PDF
      res.redirect(ticket.pdfUrl);
    } catch (error) {
      logger.error("Erreur downloadPDF controller:", error);

      if (error.message === "Billet non trouvé") {
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

export default new TicketController();
