import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import config from "../config/config.js";
import logger from "../config/logger.js";
import https from "https";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
class PDFGenerator {
  async generateTicketPDF(ticket, qrCodeDataURL) {
    try {
      const filename = `ticket-${ticket.id}.pdf`;
      const filepath = path.join(config.files.ticketsDir, filename);
      if (!fs.existsSync(config.files.ticketsDir)) {
        fs.mkdirSync(config.files.ticketsDir, { recursive: true });
      }
      const doc = new PDFDocument({ size: [600, 300], margin: 0 });
      const stream = fs.createWriteStream(filepath);
      doc.pipe(stream);
      const categoryInfo = config.ticketCategories[ticket.category];
      const concert = config.concert;
      const contentMargin = 15;
      // Chargement d'une police supportant le cyrillique (ex. Arial ou une TTF dédiée)
      // Placez 'arial.ttf' (téléchargée depuis une source gratuite comme Google Fonts) dans src/assets/
      const fontPath = path.join(__dirname, "../assets/arial.ttf");
      if (fs.existsSync(fontPath)) {
        doc.registerFont("CyrillicFont", fontPath);
      } else {
        logger.warn(
          "Police cyrillique non trouvée, fallback sur Helvetica (peut ne pas supporter le russe)"
        );
      }
      // Déterminer si c'est VIP
      const isVIP =
        ticket.category.toLowerCase() === "vip" ||
        categoryInfo.name.toLowerCase().includes("vip");
      // Couleur principale : rouge pour VIP, bleu pour standard
      const mainColor = isVIP ? "#FF0000" : "#0000FF";
      // === IMAGE DE FOND + OVERLAY ===
      try {
        const backgroundPath = path.join(__dirname, "../assets/concert-bg.jpg");
        if (fs.existsSync(backgroundPath)) {
          doc.image(backgroundPath, 0, 0, {
            cover: [600, 300],
            align: "center",
            valign: "center",
          });
          doc.rect(0, 0, 600, 300).fillOpacity(0.4).fill("#000000"); // Overlay plus sombre pour visibilité
          logger.info("✅ Image de fond chargée avec succès");
        } else {
          throw new Error("Image non trouvée");
        }
      } catch (error) {
        logger.warn(
          "Impossible de charger l'image de fond, fallback utilisé:",
          error.message
        );
        const fallbackGradient = doc.linearGradient(0, 0, 600, 300);
        fallbackGradient.stop(0, "#0f0f23");
        fallbackGradient.stop(1, "#1a1a2e");
        doc.rect(0, 0, 600, 300).fill(fallbackGradient);
      }
      // === EN-TÊTE ===
      doc.rect(0, 0, 600, 70).fillOpacity(0.9).fill(mainColor); // Couleur dynamique
      doc.font(fs.existsSync(fontPath) ? "CyrillicFont" : "Helvetica"); // Utiliser la police cyrillique
      doc
        .fillColor("#ffffff")
        .fontSize(28)
        .font("Helvetica-Bold")
        .text("DIDI B", contentMargin, 15); // Police réduite
      doc
        .fillColor("#ffffff")
        .fontSize(14)
        .font("Helvetica-Bold")
        .text("LIVE CONCERT", contentMargin, 45);
      doc
        .fillColor("#ffffff")
        .fontSize(12)
        .font("Helvetica")
        .text(this.formatDate(concert.date), 400, 20, { align: "right" });
      doc
        .fillColor("#ffd700")
        .fontSize(10)
        .font("Helvetica-Bold")
        .text(concert.time, 400, 40, { align: "right" });
      // === CARTES SEMI-TRANSPARENTES POUR CONTENU ===
      doc
        .roundedRect(contentMargin, 80, 300, 160, 10) // Décalé vers le haut et réduit hauteur
        .fillOpacity(0.4)
        .fill("#000000"); // Carte gauche, opacité augmentée pour visibilité
      doc.roundedRect(340, 80, 250, 160, 10).fillOpacity(0.4).fill("#000000"); // Carte droite
      // === INFORMATIONS À GAUCHE (PLUS COMPACT) ===
      const leftSectionX = contentMargin + 15; // Marge interne réduite
      let currentY = 85; // Début plus haut
      doc.font(fs.existsSync(fontPath) ? "CyrillicFont" : "Helvetica"); // Police pour russe
      doc
        .fillColor("#ffffff")
        .fontSize(10)
        .font("Helvetica-Bold")
        .text("LIEU:", leftSectionX, currentY);
      doc
        .fillColor("#ffffff")
        .fontSize(12)
        .font(fs.existsSync(fontPath) ? "CyrillicFont" : "Helvetica")
        .text(concert.venue, leftSectionX + 40, currentY); // Plus compact
      currentY += 18; // Espacement réduit
      doc
        .fillColor("#ffffff")
        .fontSize(10)
        .font("Helvetica-Bold")
        .text("VILLE:", leftSectionX, currentY);
      doc
        .fillColor("#ffffff")
        .fontSize(12)
        .font(fs.existsSync(fontPath) ? "CyrillicFont" : "Helvetica")
        .text(concert.location, leftSectionX + 40, currentY);
      currentY += 18;
      doc
        .fillColor("#ffffff")
        .fontSize(10)
        .font("Helvetica-Bold")
        .text("CATÉGORIE:", leftSectionX, currentY);
      doc
        .fillColor("#ffffff")
        .fontSize(12)
        .font("Helvetica")
        .text(categoryInfo.name, leftSectionX + 70, currentY);
      // Badge prix compact
      doc
        .roundedRect(leftSectionX + 160, currentY - 4, 90, 20, 5)
        .fillOpacity(0.95)
        .fill(mainColor); // Couleur dynamique
      doc
        .fillColor("#ffffff")
        .fontSize(12)
        .font("Helvetica-Bold")
        .text(`${categoryInfo.price} RUB`, leftSectionX + 160, currentY, {
          width: 90,
          align: "center",
        });
      currentY += 25; // Espacement réduit
      // Détenteur
      doc
        .fillColor("#ffffff")
        .fontSize(14)
        .font("Helvetica-Bold")
        .text("DÉTENTEUR DU BILLET", leftSectionX, currentY);
      currentY += 18;
      doc
        .fillColor("#ffffff")
        .fontSize(16)
        .font("Helvetica-Bold")
        .text(ticket.name.toUpperCase(), leftSectionX, currentY);
      currentY += 18;
      doc
        .fillColor("#ffffff")
        .fontSize(10)
        .font("Helvetica")
        .text(`${ticket.phone}`, leftSectionX, currentY);
      currentY += 15;
      doc
        .fillColor("#ffffff")
        .fontSize(9)
        .font("Courier")
        .text(`ID: ${ticket.id}`, leftSectionX, currentY);
      // === QR CODE À DROITE ===
      if (qrCodeDataURL) {
        const qrBuffer = Buffer.from(
          qrCodeDataURL.replace("data:image/png;base64,", ""),
          "base64"
        );
        doc.image(qrBuffer, 365, 90, { width: 150, height: 150 }); // Réduit et décalé pour compacité
      }
      doc
        .fillColor("#ffffff")
        .fontSize(10)
        .font("Helvetica-Bold")
        .text("SCANNEZ À L'ENTRÉE", 340, 245, { width: 250, align: "center" }); // Décalé bas
      // Ligne décorative
      doc
        .moveTo(330, 90)
        .lineTo(330, 240)
        .lineWidth(2)
        .strokeColor(mainColor) // Couleur dynamique
        .stroke();
      // === CODE-BARRES EN BAS ===
      this.drawSimpleBarcode(
        doc,
        ticket.id,
        contentMargin,
        255,
        570,
        "#ffffff"
      ); // Décalé haut pour compacité
      // Footer
      doc
        .fillColor("#ffffff")
        .fontSize(7)
        .font("Helvetica")
        .text(
          `Ticket généré le ${this.formatDateTime(new Date())} • Non transférable`,
          contentMargin,
          270
        );
      doc.end();
      await new Promise((resolve, reject) => {
        stream.on("finish", resolve);
        stream.on("error", reject);
      });
      logger.info(`PDF généré: ${filename}`);
      return `/tickets/${filename}`;
    } catch (error) {
      logger.error("Erreur génération PDF:", error);
      throw new Error("Échec de la génération du PDF");
    }
  }
  drawSimpleBarcode(doc, text, x, y, width, color = "#ffffff") {
    const bars = [];
    let totalWidth = 0;
    while (totalWidth < width) {
      const barWidth = Math.random() * 3 + 1;
      bars.push(barWidth);
      totalWidth += barWidth;
    }
    let currentX = x;
    doc.fillColor(color);
    bars.forEach((barWidth, index) => {
      if (index % 2 === 0) doc.rect(currentX, y, barWidth, 15).fill();
      currentX += barWidth;
    });
    doc
      .fillColor(color)
      .fontSize(8)
      .font("Courier")
      .text(text, x, y + 18, { width: width, align: "center" });
  }
  formatDate(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleDateString("fr-FR", {
      weekday: "short",
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }
  formatDateTime(date) {
    return date.toLocaleString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }
}
export default new PDFGenerator();
