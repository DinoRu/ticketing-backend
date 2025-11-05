import QRCode from "qrcode";
import logger from "../config/logger.js";

class QRCodeGenerator {
  /**
   * Générer un QR code en format Data URL (base64)
   * @param {Object} data - Données à encoder
   * @param {Object} options - Options de génération
   * @returns {Promise<string>} QR code en base64
   */
  async generateDataURL(data, options = {}) {
    try {
      const qrOptions = {
        errorCorrectionLevel: options.errorCorrectionLevel || "H",
        type: "image/png",
        quality: options.quality || 0.92,
        margin: options.margin || 2,
        width: options.width || 300,
        color: {
          dark: options.darkColor || "#000000",
          light: options.lightColor || "#FFFFFF",
        },
      };

      const dataString = typeof data === "string" ? data : JSON.stringify(data);
      const qrCode = await QRCode.toDataURL(dataString, qrOptions);

      logger.debug("QR Code généré avec succès");
      return qrCode;
    } catch (error) {
      logger.error("Erreur génération QR Code:", error);
      throw new Error("Échec de la génération du QR Code");
    }
  }

  /**
   * Générer un QR code en format Buffer
   * @param {Object} data - Données à encoder
   * @param {Object} options - Options de génération
   * @returns {Promise<Buffer>} QR code en buffer
   */
  async generateBuffer(data, options = {}) {
    try {
      const qrOptions = {
        errorCorrectionLevel: options.errorCorrectionLevel || "H",
        type: "png",
        quality: options.quality || 0.92,
        margin: options.margin || 2,
        width: options.width || 300,
        color: {
          dark: options.darkColor || "#000000",
          light: options.lightColor || "#FFFFFF",
        },
      };

      const dataString = typeof data === "string" ? data : JSON.stringify(data);
      const buffer = await QRCode.toBuffer(dataString, qrOptions);

      logger.debug("QR Code buffer généré avec succès");
      return buffer;
    } catch (error) {
      logger.error("Erreur génération QR Code buffer:", error);
      throw new Error("Échec de la génération du QR Code buffer");
    }
  }

  /**
   * Valider les données pour le QR code
   * @param {Object} data - Données à valider
   * @returns {boolean}
   */
  validate(data) {
    if (!data) {
      throw new Error("Données manquantes pour le QR Code");
    }

    const dataString = typeof data === "string" ? data : JSON.stringify(data);

    if (dataString.length > 2953) {
      throw new Error(
        "Données trop volumineuses pour le QR Code (max 2953 caractères)"
      );
    }

    return true;
  }

  /**
   * Générer les données du QR code pour un billet
   * @param {Object} ticket - Informations du billet
   * @returns {Object} Données formatées pour le QR
   */
  formatTicketData(ticket) {
    return {
      ticketId: ticket.id,
      event: "Didi B - Moscou",
      name: ticket.name,
      category: ticket.category,
      date: "2025-12-15",
      venue: "Moscou Concert Hall",
      timestamp: new Date().toISOString(),
    };
  }
}

export default new QRCodeGenerator();
