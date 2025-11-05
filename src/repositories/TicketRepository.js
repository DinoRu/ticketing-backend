import database from "../config/database.js";
import logger from "../config/logger.js";
import Ticket from "../models/Ticket.js";

class TicketRepository {
  // Trouver un billet par ID
  async findById(id, includeVendor = true) {
    try {
      let query = "SELECT t.*";

      if (includeVendor) {
        query +=
          ", u.name as vendor_name FROM tickets t LEFT JOIN users u ON t.created_by = u.id";
      } else {
        query += " FROM tickets t";
      }

      query += " WHERE t.id = $1";

      const result = await database.query(query, [id]);

      if (result.rows.length === 0) {
        return null;
      }

      return new Ticket(result.rows[0]);
    } catch (error) {
      logger.error("Erreur findById:", error);
      throw error;
    }
  }

  // Trouver tous les billets avec filtres et pagination
  async findAll(options = {}) {
    try {
      const {
        page = 1,
        limit = 50,
        userId = null,
        role = null,
        orderId = null,
        category = null,
        used = null,
        sentWhatsapp = null,
        createdBy = null,
        sortBy = "created_at",
        sortOrder = "DESC",
      } = options;

      const offset = (page - 1) * limit;
      const conditions = [];
      const params = [];
      let paramCount = 0;

      // Filtres
      if (orderId) {
        paramCount++;
        conditions.push(`t.order_id = $${paramCount}`);
        params.push(orderId);
      }

      if (category) {
        paramCount++;
        conditions.push(`t.category = $${paramCount}`);
        params.push(category);
      }

      if (used !== null) {
        paramCount++;
        conditions.push(`t.used = $${paramCount}`);
        params.push(used);
      }

      if (sentWhatsapp !== null) {
        paramCount++;
        conditions.push(`t.sent_whatsapp = $${paramCount}`);
        params.push(sentWhatsapp);
      }

      // Filtre par créateur (vendeur) - seulement pour les non-admin
      if (role !== "admin" && userId) {
        paramCount++;
        conditions.push(`t.created_by = $${paramCount}`);
        params.push(userId);
      } else if (createdBy) {
        paramCount++;
        conditions.push(`t.created_by = $${paramCount}`);
        params.push(createdBy);
      }

      const whereClause =
        conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

      // Requête principale avec jointure
      const query = `
        SELECT t.*, u.name as vendor_name
        FROM tickets t
        LEFT JOIN users u ON t.created_by = u.id
        ${whereClause}
        ORDER BY t.${sortBy} ${sortOrder}
        LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
      `;
      params.push(limit, offset);

      const result = await database.query(query, params);

      // Compter le total
      const countQuery = `SELECT COUNT(*) FROM tickets t ${whereClause}`;
      const countResult = await database.query(
        countQuery,
        params.slice(0, paramCount)
      );
      const total = parseInt(countResult.rows[0].count);

      return {
        tickets: result.rows.map((row) => new Ticket(row)),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      logger.error("Erreur findAll:", error);
      throw error;
    }
  }

  // Trouver les billets par order_id
  async findByOrderId(orderId) {
    try {
      const result = await database.query(
        `SELECT t.*, u.name as vendor_name
         FROM tickets t
         LEFT JOIN users u ON t.created_by = u.id
         WHERE t.order_id = $1
         ORDER BY t.created_at ASC`,
        [orderId]
      );

      return result.rows.map((row) => new Ticket(row));
    } catch (error) {
      logger.error("Erreur findByOrderId:", error);
      throw error;
    }
  }

  // Créer un billet
  async create(ticketData) {
    try {
      const result = await database.query(
        `INSERT INTO tickets (
          id, order_id, name, phone, category, price, 
          qr_data, qr_code, pdf_path, client_name, client_phone,
           created_by
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING *`,
        [
          ticketData.id,
          ticketData.orderId,
          ticketData.name,
          ticketData.phone,
          ticketData.category,
          ticketData.price,
          ticketData.qrData,
          ticketData.qrCode || null,
          ticketData.pdfPath || null,
          ticketData.clientName,
          ticketData.clientPhone,
          ticketData.createdBy,
        ]
      );

      logger.info(`Billet créé: ${ticketData.id}`);
      return new Ticket(result.rows[0]);
    } catch (error) {
      logger.error("Erreur create:", error);
      throw error;
    }
  }

  // Créer plusieurs billets en une transaction
  async createBatch(ticketsData) {
    try {
      return await database.transaction(async (client) => {
        const tickets = [];

        for (const ticketData of ticketsData) {
          const result = await client.query(
            `INSERT INTO tickets (
              id, order_id, name, phone, category, price, 
              qr_data, qr_code, pdf_path, client_name, client_phone,
             created_by
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            RETURNING *`,
            [
              ticketData.id,
              ticketData.orderId,
              ticketData.name,
              ticketData.phone,
              ticketData.category,
              ticketData.price,
              ticketData.qrData,
              ticketData.qrCode || null,
              ticketData.pdfPath || null,
              ticketData.clientName,
              ticketData.clientPhone,
              ticketData.createdBy,
            ]
          );

          tickets.push(new Ticket(result.rows[0]));
        }

        logger.info(`${tickets.length} billets créés en batch`);
        return tickets;
      });
    } catch (error) {
      logger.error("Erreur createBatch:", error);
      throw error;
    }
  }

  // Mettre à jour un billet
  async update(id, ticketData) {
    try {
      const updates = [];
      const params = [];
      let paramCount = 0;

      // Construire dynamiquement la requête UPDATE
      const updateFields = [
        "qr_code",
        "pdf_path",
        "used",
        "used_at",
        "sent_whatsapp",
        "sent_at",
      ];

      for (const field of updateFields) {
        const camelField = field.replace(/_([a-z])/g, (g) =>
          g[1].toUpperCase()
        );
        if (ticketData[camelField] !== undefined) {
          paramCount++;
          updates.push(`${field} = $${paramCount}`);
          params.push(ticketData[camelField]);
        }
      }

      if (updates.length === 0) {
        throw new Error("Aucune donnée à mettre à jour");
      }

      paramCount++;
      params.push(id);

      const query = `
        UPDATE tickets 
        SET ${updates.join(", ")}
        WHERE id = $${paramCount}
        RETURNING *
      `;

      const result = await database.query(query, params);

      if (result.rows.length === 0) {
        throw new Error("Billet non trouvé");
      }

      logger.info(`Billet mis à jour: ID ${id}`);
      return new Ticket(result.rows[0]);
    } catch (error) {
      logger.error("Erreur update:", error);
      throw error;
    }
  }

  // Marquer un billet comme utilisé
  async markAsUsed(id, scannedBy = null) {
    try {
      const result = await database.query(
        `UPDATE tickets 
         SET used = true, used_at = CURRENT_TIMESTAMP, scanned_by = $2
         WHERE id = $1 AND used = false
         RETURNING *`,
        [id, scannedBy]
      );

      if (result.rows.length === 0) {
        const ticket = await this.findById(id, false);
        if (!ticket) {
          throw new Error("Billet non trouvé");
        }
        if (ticket.used) {
          throw new Error("Billet déjà utilisé");
        }
      }

      logger.info(
        `Billet scanné: ${id}${scannedBy ? ` par user ${scannedBy}` : ""}`
      );
      return new Ticket(result.rows[0]);
    } catch (error) {
      logger.error("Erreur markAsUsed:", error);
      throw error;
    }
  }

  // Marquer un billet comme envoyé
  async markAsSent(id) {
    try {
      const result = await database.query(
        `UPDATE tickets 
         SET sent_whatsapp = true, sent_at = CURRENT_TIMESTAMP
         WHERE id = $1
         RETURNING *`,
        [id]
      );

      if (result.rows.length === 0) {
        throw new Error("Billet non trouvé");
      }

      logger.info(`Billet marqué comme envoyé: ${id}`);
      return new Ticket(result.rows[0]);
    } catch (error) {
      logger.error("Erreur markAsSent:", error);
      throw error;
    }
  }

  // Supprimer un billet
  async delete(id) {
    try {
      const result = await database.query(
        "DELETE FROM tickets WHERE id = $1 RETURNING *",
        [id]
      );

      if (result.rows.length === 0) {
        throw new Error("Billet non trouvé");
      }

      logger.info(`Billet supprimé: ID ${id}`);
      return true;
    } catch (error) {
      logger.error("Erreur delete:", error);
      throw error;
    }
  }

  // Obtenir les statistiques
  async getStats(options = {}) {
    try {
      const { userId = null, role = null } = options;

      let whereClause = "";
      const params = [];

      if (role !== "admin" && userId) {
        whereClause = "WHERE created_by = $1";
        params.push(userId);
      }

      const result = await database.query(
        `
        SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN used = true THEN 1 END) as used,
          COUNT(CASE WHEN used = false THEN 1 END) as available,
          COUNT(CASE WHEN sent_whatsapp = true THEN 1 END) as sent,
          COUNT(CASE WHEN category = 'vip' THEN 1 END) as vip,
          COUNT(CASE WHEN category = 'standard' THEN 1 END) as standard,
          COUNT(CASE WHEN category = 'earlybird' THEN 1 END) as earlybird,
          COALESCE(SUM(price), 0) as revenue,
          COUNT(DISTINCT order_id) as orders
        FROM tickets
        ${whereClause}
      `,
        params
      );

      return result.rows[0];
    } catch (error) {
      logger.error("Erreur getStats:", error);
      throw error;
    }
  }

  // Obtenir les statistiques par vendeur (admin uniquement)
  async getVendorStats() {
    try {
      const result = await database.query(`
        SELECT 
          u.id,
          u.name,
          u.phone,
          COUNT(t.id) as tickets,
          COALESCE(SUM(t.price), 0) as revenue,
          COUNT(CASE WHEN t.category = 'vip' THEN 1 END) as vip,
          COUNT(CASE WHEN t.category = 'standard' THEN 1 END) as standard,
          COUNT(CASE WHEN t.category = 'earlybird' THEN 1 END) as earlybird,
          COUNT(CASE WHEN t.used = true THEN 1 END) as used,
          COUNT(DISTINCT t.order_id) as orders
        FROM users u
        LEFT JOIN tickets t ON u.id = t.created_by
        WHERE u.role = 'vendeur'
        GROUP BY u.id, u.name, u.phone
        ORDER BY revenue DESC
      `);

      return result.rows;
    } catch (error) {
      logger.error("Erreur getVendorStats:", error);
      throw error;
    }
  }

  // Obtenir les commandes
  async getOrders(options = {}) {
    try {
      const { userId = null, role = null, page = 1, limit = 50 } = options;

      const offset = (page - 1) * limit;
      let whereClause = "";
      const params = [];

      if (role !== "admin" && userId) {
        whereClause = "WHERE t.created_by = $1";
        params.push(userId);
      }

      const query = `
        SELECT 
          t.order_id,
          t.client_name,
          t.client_phone,
          MIN(t.created_at) as created_at,
          t.created_by,
          u.name as vendor_name,
          COUNT(t.id) as ticket_count,
          SUM(t.price) as total
        FROM tickets t
        LEFT JOIN users u ON t.created_by = u.id
        ${whereClause}
        GROUP BY t.order_id, t.client_name, t.client_phone, 
                t.created_by, u.name
        ORDER BY MIN(t.created_at) DESC
        LIMIT $${params.length + 1} OFFSET $${params.length + 2}
      `;

      params.push(limit, offset);

      const result = await database.query(query, params);

      // Compter le total
      const countQuery = `
        SELECT COUNT(DISTINCT order_id) 
        FROM tickets t
        ${whereClause}
      `;
      const countResult = await database.query(
        countQuery,
        whereClause ? [params[0]] : []
      );
      const total = parseInt(countResult.rows[0].count);

      return {
        orders: result.rows,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      logger.error("Erreur getOrders:", error);
      throw error;
    }
  }
}

export default new TicketRepository();
