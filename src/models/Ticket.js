import config from "../config/config.js";

class Ticket {
  constructor(data) {
    this.id = data.id;
    this.orderId = data.order_id;
    this.name = data.name;
    this.phone = data.phone;
    this.category = data.category;
    this.price = data.price;
    this.qrData = data.qr_data;
    this.qrCode = data.qr_code;
    this.pdfPath = data.pdf_path;
    this.clientName = data.client_name;
    this.clientPhone = data.client_phone;
    this.paymentMethod = data.payment_method;
    this.used = data.used || false;
    this.usedAt = data.used_at;
    this.sentWhatsapp = data.sent_whatsapp || false;
    this.sentAt = data.sent_at;
    this.createdBy = data.created_by;
    this.createdAt = data.created_at;
    this.updatedAt = data.updated_at;

    // Informations enrichies (jointures)
    this.vendorName = data.vendor_name;
  }

  // Méthode pour obtenir les informations de la catégorie
  getCategoryInfo() {
    return config.ticketCategories[this.category] || null;
  }

  // Méthode pour vérifier si le billet est disponible
  isAvailable() {
    return !this.used;
  }

  // Méthode pour vérifier si le billet a été envoyé
  isSent() {
    return this.sentWhatsapp;
  }

  // Méthode pour marquer le billet comme utilisé
  markAsUsed() {
    this.used = true;
    this.usedAt = new Date();
  }

  // Méthode pour marquer le billet comme envoyé
  markAsSent() {
    this.sentWhatsapp = true;
    this.sentAt = new Date();
  }

  // Méthode pour obtenir les données du QR code
  getQRData() {
    try {
      return JSON.parse(this.qrData);
    } catch (error) {
      return null;
    }
  }

  // Méthode pour formater le prix
  getFormattedPrice() {
    const categoryInfo = this.getCategoryInfo();
    return `${this.price.toLocaleString()} ${categoryInfo?.currency || "₽"}`;
  }

  // Méthode pour obtenir le statut du billet
  getStatus() {
    if (this.used) {
      return {
        status: "used",
        label: "Utilisé",
        color: "red",
        date: this.usedAt,
      };
    }
    if (this.sentWhatsapp) {
      return {
        status: "sent",
        label: "Envoyé",
        color: "green",
        date: this.sentAt,
      };
    }
    return {
      status: "pending",
      label: "En attente",
      color: "yellow",
      date: null,
    };
  }

  // Méthode pour obtenir le message WhatsApp
  getWhatsAppMessage() {
    const categoryInfo = this.getCategoryInfo();
    const concert = config.concert;

    return (
      `🎫 *BILLET CONCERT ${concert.artist.toUpperCase()}*\n\n` +
      `📝 Nom: ${this.name}\n` +
      `🎟️ Catégorie: ${categoryInfo?.name || this.category}\n` +
      `💰 Prix: ${this.getFormattedPrice()}\n` +
      `📅 Date: ${concert.date} - ${concert.time}\n` +
      `📍 Lieu: ${concert.venue}\n` +
      `🌍 ${concert.location}\n\n` +
      `🔑 ID: ${this.id}\n\n` +
      `⚠️ Présentez ce billet à l'entrée\n` +
      `Ce billet est personnel et non transférable`
    );
  }

  // Méthode pour obtenir l'URL du PDF
  getPdfUrl() {
    if (!this.pdfPath) return null;
    return `${config.server.baseUrl}${this.pdfPath}`;
  }

  // Méthode pour valider les données d'un billet
  static validate(data) {
    const errors = [];

    if (!data.name || data.name.length < 2) {
      errors.push("Le nom doit contenir au moins 2 caractères");
    }

    if (!data.phone || !/^\+?\d{10,15}$/.test(data.phone.replace(/\s/g, ""))) {
      errors.push("Format de téléphone invalide");
    }

    if (
      !data.category ||
      !Object.keys(config.ticketCategories).includes(data.category)
    ) {
      errors.push("Catégorie de billet invalide");
    }

    if (
      data.paymentMethod &&
      !config.paymentMethods.includes(data.paymentMethod)
    ) {
      errors.push("Méthode de paiement invalide");
    }

    return errors;
  }

  // Méthode statique pour valider un lot de billets
  static validateBatch(tickets) {
    const errors = [];

    if (!Array.isArray(tickets) || tickets.length === 0) {
      errors.push("Au moins un billet doit être fourni");
      return errors;
    }

    if (tickets.length > 50) {
      errors.push("Maximum 50 billets par commande");
      return errors;
    }

    tickets.forEach((ticket, index) => {
      const ticketErrors = Ticket.validate(ticket);
      if (ticketErrors.length > 0) {
        errors.push(`Billet ${index + 1}: ${ticketErrors.join(", ")}`);
      }
    });

    return errors;
  }

  // Méthode pour obtenir une représentation JSON
  toJSON() {
    return {
      id: this.id,
      orderId: this.orderId,
      name: this.name,
      phone: this.phone,
      category: this.category,
      categoryInfo: this.getCategoryInfo(),
      price: this.price,
      formattedPrice: this.getFormattedPrice(),
      qrCode: this.qrCode,
      pdfPath: this.pdfPath,
      pdfUrl: this.getPdfUrl(),
      clientName: this.clientName,
      clientPhone: this.clientPhone,
      paymentMethod: this.paymentMethod,
      status: this.getStatus(),
      used: this.used,
      usedAt: this.usedAt,
      sentWhatsapp: this.sentWhatsapp,
      sentAt: this.sentAt,
      createdBy: this.createdBy,
      vendorName: this.vendorName,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  // Méthode pour obtenir une représentation minimale (pour les listes)
  toMinimalJSON() {
    return {
      id: this.id,
      name: this.name,
      category: this.category,
      price: this.price,
      status: this.getStatus(),
      createdAt: this.createdAt,
    };
  }
}

export default Ticket;
