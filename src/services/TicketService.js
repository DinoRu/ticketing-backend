import { v4 as uuidv4 } from "uuid";
import logger from "../config/logger.js";
import config from "../config/config.js";
import TicketRepository from "../repositories/TicketRepository.js";
import Ticket from "../models/Ticket.js";
import qrCodeGenerator from "../utils/qrCodeGenerator.js";
import pdfGenerator from "../utils/Pdfgenerator.js";
import AuthService from "./AuthService.js";

class TicketService {
  /**
   * Créer des billets
   * @param {Object} orderData - Données de la commande
   * @param {Object} currentUser - Utilisateur créant les billets
   * @returns {Promise<Object>} Billets créés
   */
  async createTickets(orderData, currentUser) {
    try {
      // Valider les données
      const { clientName, clientPhone, attendees } = orderData;

      if (!clientName || !clientPhone) {
        throw new Error("Nom et téléphone du client requis");
      }

      if (!attendees || !Array.isArray(attendees) || attendees.length === 0) {
        throw new Error("Au moins un participant requis");
      }

      // Valider les participants
      const validationErrors = Ticket.validateBatch(attendees);
      if (validationErrors.length > 0) {
        throw new Error(validationErrors.join("; "));
      }

      // Générer l'ID de commande
      const orderId = "ORDER-" + uuidv4();

      // Créer les billets
      const ticketsData = [];

      for (const attendee of attendees) {
        // Générer l'ID unique du billet
        const ticketId = this.generateTicketId();

        // Obtenir le prix de la catégorie
        const categoryInfo = config.ticketCategories[attendee.category];
        if (!categoryInfo) {
          throw new Error(`Catégorie invalide: ${attendee.category}`);
        }

        // Préparer les données pour le QR code
        const qrData = qrCodeGenerator.formatTicketData({
          id: ticketId,
          name: attendee.name,
          category: attendee.category,
        });

        // Générer le QR code
        const qrCode = await qrCodeGenerator.generateDataURL(qrData);

        // Préparer les données du billet
        ticketsData.push({
          id: ticketId,
          orderId,
          name: attendee.name,
          phone: attendee.phone,
          category: attendee.category,
          price: categoryInfo.price,
          qrData: JSON.stringify(qrData),
          qrCode,
          pdfPath: null, // Sera généré après
          clientName,
          clientPhone,
          createdBy: currentUser.id,
        });
      }

      // Créer les billets en batch (transaction)
      const createdTickets = await TicketRepository.createBatch(ticketsData);

      // Générer les PDFs pour chaque billet
      for (let i = 0; i < createdTickets.length; i++) {
        const ticket = createdTickets[i];
        try {
          const pdfPath = await pdfGenerator.generateTicketPDF(
            ticket,
            ticket.qrCode
          );

          // Mettre à jour le chemin PDF
          await TicketRepository.update(ticket.id, { pdfPath });
          ticket.pdfPath = pdfPath;
        } catch (pdfError) {
          logger.error(`Erreur génération PDF pour ${ticket.id}:`, pdfError);
          // Continuer même si le PDF échoue
        }
      }

      logger.info(
        `${createdTickets.length} billets créés (commande ${orderId}) par user ${currentUser.id}`
      );

      // Audit log
      await AuthService.createAuditLog({
        userId: currentUser.id,
        action: "TICKETS_CREATE",
        entityType: "order",
        entityId: orderId,
        details: {
          ticketCount: createdTickets.length,
          total: ticketsData.reduce((sum, t) => sum + t.price, 0),
          categories: attendees.map((a) => a.category),
        },
      });

      return {
        orderId,
        tickets: createdTickets.map((t) => t.toJSON()),
        total: ticketsData.reduce((sum, t) => sum + t.price, 0),
      };
    } catch (error) {
      logger.error("Erreur création billets:", error);
      throw error;
    }
  }

  /**
   * Obtenir un billet par ID
   * @param {string} ticketId - ID du billet
   * @param {Object} currentUser - Utilisateur effectuant l'action
   * @returns {Promise<Object>} Billet
   */
  async getTicketById(ticketId, currentUser) {
    try {
      const ticket = await TicketRepository.findById(ticketId);

      if (!ticket) {
        throw new Error("Billet non trouvé");
      }

      // Vérifier les permissions
      if (currentUser.role !== "admin" && ticket.createdBy !== currentUser.id) {
        throw new Error("Accès non autorisé");
      }

      return ticket.toJSON();
    } catch (error) {
      logger.error("Erreur récupération billet:", error);
      throw error;
    }
  }

  /**
   * Obtenir la liste des billets avec filtres
   * @param {Object} options - Options de recherche
   * @param {Object} currentUser - Utilisateur effectuant l'action
   * @returns {Promise<Object>} Liste paginée
   */
  async getTickets(options, currentUser) {
    try {
      // Ajouter le filtre utilisateur pour les vendeurs
      const searchOptions = {
        ...options,
        userId: currentUser.id,
        role: currentUser.role,
      };

      const result = await TicketRepository.findAll(searchOptions);

      return {
        tickets: result.tickets.map((t) => t.toJSON()),
        pagination: result.pagination,
      };
    } catch (error) {
      logger.error("Erreur liste billets:", error);
      throw error;
    }
  }

  /**
   * Scanner un billet à l'entrée
   * @param {string} ticketId - ID du billet
   * @param {Object} currentUser - Utilisateur scannant
   * @returns {Promise<Object>} Résultat du scan
   */
  async scanTicket(ticketId, currentUser) {
    try {
      // Vérifier que le billet existe
      const ticket = await TicketRepository.findById(ticketId, false);

      if (!ticket) {
        logger.warn(`Tentative de scan d'un billet inexistant: ${ticketId}`);
        return {
          success: false,
          message: "Billet non trouvé",
          details: "Ce billet n'existe pas dans le système",
        };
      }

      // Vérifier si déjà utilisé
      if (ticket.used) {
        logger.warn(`Tentative de réutilisation du billet: ${ticketId}`);
        return {
          success: false,
          message: "Billet déjà utilisé",
          details: `Ce billet a déjà été scanné le ${ticket.usedAt}`,
          ticket: ticket.toJSON(),
        };
      }

      // Marquer comme utilisé avec l'ID de qui a scanné
      const updatedTicket = await TicketRepository.markAsUsed(
        ticketId,
        currentUser.id
      );

      logger.info(`Billet scanné avec succès: ${ticketId}`, {
        scannedBy: currentUser.id,
        scannerName: currentUser.name,
        scannerRole: currentUser.role,
        attendeeName: ticket.name,
        category: ticket.category,
      });

      // Audit log
      await AuthService.createAuditLog({
        userId: currentUser.id,
        action: "TICKET_SCAN",
        entityType: "ticket",
        entityId: ticketId,
        details: {
          attendeeName: ticket.name,
          category: ticket.category,
        },
      });

      return {
        success: true,
        message: "Billet valide",
        details: "Entrée autorisée",
        ticket: updatedTicket.toJSON(),
      };
    } catch (error) {
      logger.error("Erreur scan billet:", error);
      throw error;
    }
  }

  /**
   * Marquer un billet comme envoyé par WhatsApp
   * @param {string} ticketId - ID du billet
   * @param {Object} currentUser - Utilisateur effectuant l'action
   * @returns {Promise<Object>} Billet mis à jour
   */
  async markTicketAsSent(ticketId, currentUser) {
    try {
      const ticket = await TicketRepository.findById(ticketId, false);

      if (!ticket) {
        throw new Error("Billet non trouvé");
      }

      // Vérifier les permissions
      if (currentUser.role !== "admin" && ticket.createdBy !== currentUser.id) {
        throw new Error("Accès non autorisé");
      }

      // Marquer comme envoyé
      const updatedTicket = await TicketRepository.markAsSent(ticketId);

      logger.info(
        `Billet marqué comme envoyé: ${ticketId} par user ${currentUser.id}`
      );

      // Audit log
      await AuthService.createAuditLog({
        userId: currentUser.id,
        action: "TICKET_SENT",
        entityType: "ticket",
        entityId: ticketId,
        details: {
          phone: ticket.phone,
        },
      });

      return updatedTicket.toJSON();
    } catch (error) {
      logger.error("Erreur marquage envoi:", error);
      throw error;
    }
  }

  /**
   * Marquer plusieurs billets comme envoyés
   * @param {Array} ticketIds - IDs des billets
   * @param {Object} currentUser - Utilisateur effectuant l'action
   * @returns {Promise<Object>} Résultat
   */
  async markMultipleAsSent(ticketIds, currentUser) {
    try {
      const results = {
        success: [],
        failed: [],
      };

      for (const ticketId of ticketIds) {
        try {
          await this.markTicketAsSent(ticketId, currentUser);
          results.success.push(ticketId);
        } catch (error) {
          results.failed.push({ ticketId, error: error.message });
        }
      }

      return results;
    } catch (error) {
      logger.error("Erreur marquage multiple:", error);
      throw error;
    }
  }

  /**
   * Obtenir les billets d'une commande
   * @param {string} orderId - ID de la commande
   * @param {Object} currentUser - Utilisateur effectuant l'action
   * @returns {Promise<Array>} Billets de la commande
   */
  async getOrderTickets(orderId, currentUser) {
    try {
      const tickets = await TicketRepository.findByOrderId(orderId);

      if (tickets.length === 0) {
        throw new Error("Commande non trouvée");
      }

      // Vérifier les permissions
      if (
        currentUser.role !== "admin" &&
        tickets[0].createdBy !== currentUser.id
      ) {
        throw new Error("Accès non autorisé");
      }

      return tickets.map((t) => t.toJSON());
    } catch (error) {
      logger.error("Erreur récupération billets commande:", error);
      throw error;
    }
  }

  /**
   * Supprimer un billet
   * @param {string} ticketId - ID du billet
   * @param {Object} currentUser - Utilisateur effectuant l'action
   * @returns {Promise<boolean>}
   */
  async deleteTicket(ticketId, currentUser) {
    try {
      // Seul l'admin peut supprimer
      if (currentUser.role !== "admin") {
        throw new Error("Accès non autorisé");
      }

      const ticket = await TicketRepository.findById(ticketId, false);
      if (!ticket) {
        throw new Error("Billet non trouvé");
      }

      // Ne pas supprimer un billet déjà utilisé
      if (ticket.used) {
        throw new Error("Impossible de supprimer un billet déjà utilisé");
      }

      // Supprimer le PDF si existe
      if (ticket.pdfPath) {
        await pdfGenerator.deletePDF(ticket.pdfPath);
      }

      await TicketRepository.delete(ticketId);

      logger.info(`Billet supprimé: ${ticketId} par user ${currentUser.id}`);

      // Audit log
      await AuthService.createAuditLog({
        userId: currentUser.id,
        action: "TICKET_DELETE",
        entityType: "ticket",
        entityId: ticketId,
        details: {
          attendeeName: ticket.name,
        },
      });

      return true;
    } catch (error) {
      logger.error("Erreur suppression billet:", error);
      throw error;
    }
  }

  /**
   * Générer un ID de billet unique
   * @returns {string} ID du billet
   */
  generateTicketId() {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9).toUpperCase();
    return `DIDI-${timestamp}-${random}`;
  }

  /**
   * Obtenir le message WhatsApp pour un billet
   * @param {string} ticketId - ID du billet
   * @param {Object} currentUser - Utilisateur effectuant l'action
   * @returns {Promise<string>} Message WhatsApp
   */
  async getWhatsAppMessage(ticketId, currentUser) {
    try {
      const ticket = await TicketRepository.findById(ticketId, false);

      if (!ticket) {
        throw new Error("Billet non trouvé");
      }

      // Vérifier les permissions
      if (currentUser.role !== "admin" && ticket.createdBy !== currentUser.id) {
        throw new Error("Accès non autorisé");
      }

      return ticket.getWhatsAppMessage();
    } catch (error) {
      logger.error("Erreur génération message WhatsApp:", error);
      throw error;
    }
  }
}

export default new TicketService();
