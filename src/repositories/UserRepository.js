import database from "../config/database.js";
import logger from "../config/logger.js";
import User from "../models/User.js";

class UserRepository {
  // Trouver un utilisateur par ID
  async findById(id) {
    try {
      const result = await database.query("SELECT * FROM users WHERE id = $1", [
        id,
      ]);

      if (result.rows.length === 0) {
        return null;
      }

      return new User(result.rows[0]);
    } catch (error) {
      logger.error("Erreur findById:", error);
      throw error;
    }
  }

  // Trouver un utilisateur par username
  async findByUsername(username) {
    try {
      const result = await database.query(
        "SELECT * FROM users WHERE username = $1",
        [username]
      );

      if (result.rows.length === 0) {
        return null;
      }

      return new User(result.rows[0]);
    } catch (error) {
      logger.error("Erreur findByUsername:", error);
      throw error;
    }
  }

  // Trouver tous les utilisateurs avec pagination
  async findAll(options = {}) {
    try {
      const {
        page = 1,
        limit = 50,
        role = null,
        isActive = null,
        sortBy = "created_at",
        sortOrder = "DESC",
      } = options;

      const offset = (page - 1) * limit;
      const conditions = [];
      const params = [];
      let paramCount = 0;

      // Filtres
      if (role) {
        paramCount++;
        conditions.push(`role = $${paramCount}`);
        params.push(role);
      }

      if (isActive !== null) {
        paramCount++;
        conditions.push(`is_active = $${paramCount}`);
        params.push(isActive);
      }

      const whereClause =
        conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

      // Requête principale
      const query = `
        SELECT * FROM users 
        ${whereClause}
        ORDER BY ${sortBy} ${sortOrder}
        LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
      `;
      params.push(limit, offset);

      const result = await database.query(query, params);

      // Compter le total
      const countQuery = `SELECT COUNT(*) FROM users ${whereClause}`;
      const countResult = await database.query(
        countQuery,
        params.slice(0, paramCount)
      );
      const total = parseInt(countResult.rows[0].count);

      return {
        users: result.rows.map((row) => new User(row)),
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

  // Créer un utilisateur
  async create(userData) {
    try {
      // Hasher le mot de passe
      const hashedPassword = await User.hashPassword(userData.password);

      const result = await database.query(
        `INSERT INTO users (username, password, name, phone, role)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [
          userData.username,
          hashedPassword,
          userData.name,
          userData.phone || null,
          userData.role || "vendeur",
        ]
      );

      logger.info(`Utilisateur créé: ${userData.username}`);
      return new User(result.rows[0]);
    } catch (error) {
      if (error.code === "23505") {
        // Unique violation
        throw new Error("Nom d'utilisateur déjà existant");
      }
      logger.error("Erreur create:", error);
      throw error;
    }
  }

  // Mettre à jour un utilisateur
  async update(id, userData) {
    try {
      const updates = [];
      const params = [];
      let paramCount = 0;

      // Construire dynamiquement la requête UPDATE
      if (userData.name !== undefined) {
        paramCount++;
        updates.push(`name = $${paramCount}`);
        params.push(userData.name);
      }

      if (userData.phone !== undefined) {
        paramCount++;
        updates.push(`phone = $${paramCount}`);
        params.push(userData.phone);
      }

      if (userData.password !== undefined) {
        const hashedPassword = await User.hashPassword(userData.password);
        paramCount++;
        updates.push(`password = $${paramCount}`);
        params.push(hashedPassword);
      }

      if (userData.role !== undefined) {
        paramCount++;
        updates.push(`role = $${paramCount}`);
        params.push(userData.role);
      }

      if (userData.isActive !== undefined) {
        paramCount++;
        updates.push(`is_active = $${paramCount}`);
        params.push(userData.isActive);
      }

      if (updates.length === 0) {
        throw new Error("Aucune donnée à mettre à jour");
      }

      paramCount++;
      params.push(id);

      const query = `
        UPDATE users 
        SET ${updates.join(", ")}
        WHERE id = $${paramCount}
        RETURNING *
      `;

      const result = await database.query(query, params);

      if (result.rows.length === 0) {
        throw new Error("Utilisateur non trouvé");
      }

      logger.info(`Utilisateur mis à jour: ID ${id}`);
      return new User(result.rows[0]);
    } catch (error) {
      logger.error("Erreur update:", error);
      throw error;
    }
  }

  // Mettre à jour le dernier login
  async updateLastLogin(id) {
    try {
      await database.query(
        "UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1",
        [id]
      );
      logger.debug(`Dernier login mis à jour pour l'utilisateur ${id}`);
    } catch (error) {
      logger.error("Erreur updateLastLogin:", error);
      // Ne pas propager l'erreur, ce n'est pas critique
    }
  }

  // Supprimer un utilisateur (soft delete)
  async delete(id) {
    try {
      const result = await database.query(
        "UPDATE users SET is_active = false WHERE id = $1 RETURNING *",
        [id]
      );

      if (result.rows.length === 0) {
        throw new Error("Utilisateur non trouvé");
      }

      logger.info(`Utilisateur désactivé: ID ${id}`);
      return new User(result.rows[0]);
    } catch (error) {
      logger.error("Erreur delete:", error);
      throw error;
    }
  }

  // Supprimer définitivement un utilisateur (hard delete)
  async hardDelete(id) {
    try {
      const result = await database.query(
        "DELETE FROM users WHERE id = $1 RETURNING *",
        [id]
      );

      if (result.rows.length === 0) {
        throw new Error("Utilisateur non trouvé");
      }

      logger.info(`Utilisateur supprimé définitivement: ID ${id}`);
      return true;
    } catch (error) {
      if (error.code === "23503") {
        // Foreign key violation
        throw new Error(
          "Impossible de supprimer: l'utilisateur a des billets associés"
        );
      }
      logger.error("Erreur hardDelete:", error);
      throw error;
    }
  }

  // Compter les utilisateurs
  async count(filters = {}) {
    try {
      const conditions = [];
      const params = [];

      if (filters.role) {
        conditions.push("role = $1");
        params.push(filters.role);
      }

      if (filters.isActive !== undefined) {
        params.push(filters.isActive);
        conditions.push(`is_active = $${params.length}`);
      }

      const whereClause =
        conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

      const result = await database.query(
        `SELECT COUNT(*) FROM users ${whereClause}`,
        params
      );

      return parseInt(result.rows[0].count);
    } catch (error) {
      logger.error("Erreur count:", error);
      throw error;
    }
  }

  // Obtenir les statistiques des utilisateurs
  async getStats() {
    try {
      const result = await database.query(`
        SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN role = 'admin' THEN 1 END) as admins,
          COUNT(CASE WHEN role = 'vendeur' THEN 1 END) as vendors,
          COUNT(CASE WHEN is_active = true THEN 1 END) as active,
          COUNT(CASE WHEN is_active = false THEN 1 END) as inactive,
          COUNT(CASE WHEN last_login > NOW() - INTERVAL '7 days' THEN 1 END) as active_last_week
        FROM users
      `);

      return result.rows[0];
    } catch (error) {
      logger.error("Erreur getStats:", error);
      throw error;
    }
  }
}

export default new UserRepository();
