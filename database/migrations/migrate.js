import database from "../../src/config/database.js";
import logger from "../../src/config/logger.js";

const migrations = [
  {
    version: 1,
    name: "create_users_table",
    up: `
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        phone VARCHAR(50),
        role VARCHAR(50) DEFAULT 'vendeur' CHECK (role IN ('admin', 'vendeur')),
        is_active BOOLEAN DEFAULT true,
        last_login TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX idx_users_username ON users(username);
      CREATE INDEX idx_users_role ON users(role);
      CREATE INDEX idx_users_is_active ON users(is_active);
    `,
    down: `
      DROP TABLE IF EXISTS users CASCADE;
    `,
  },
  {
    version: 2,
    name: "create_tickets_table",
    up: `
      CREATE TABLE IF NOT EXISTS tickets (
        id VARCHAR(255) PRIMARY KEY,
        order_id VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        phone VARCHAR(50) NOT NULL,
        category VARCHAR(50) NOT NULL CHECK (category IN ('vip', 'standard')),
        price INTEGER NOT NULL,
        qr_data TEXT NOT NULL,
        qr_code TEXT,
        pdf_path VARCHAR(500),
        client_name VARCHAR(255) NOT NULL,
        client_phone VARCHAR(50) NOT NULL,
        payment_method VARCHAR(50) CHECK (payment_method IN ('cash', 'card', 'transfer', 'mobile')),
        used BOOLEAN DEFAULT false,
        used_at TIMESTAMP,
        sent_whatsapp BOOLEAN DEFAULT false,
        sent_at TIMESTAMP,
        created_by INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX idx_tickets_order_id ON tickets(order_id);
      CREATE INDEX idx_tickets_category ON tickets(category);
      CREATE INDEX idx_tickets_used ON tickets(used);
      CREATE INDEX idx_tickets_created_by ON tickets(created_by);
      CREATE INDEX idx_tickets_created_at ON tickets(created_at);
      CREATE INDEX idx_tickets_client_phone ON tickets(client_phone);
    `,
    down: `
      DROP TABLE IF EXISTS tickets CASCADE;
    `,
  },
  {
    version: 3,
    name: "create_audit_logs_table",
    up: `
      CREATE TABLE IF NOT EXISTS audit_logs (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        action VARCHAR(100) NOT NULL,
        entity_type VARCHAR(50),
        entity_id VARCHAR(255),
        details JSONB,
        ip_address VARCHAR(50),
        user_agent TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
      CREATE INDEX idx_audit_logs_action ON audit_logs(action);
      CREATE INDEX idx_audit_logs_entity_type ON audit_logs(entity_type);
      CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
    `,
    down: `
      DROP TABLE IF EXISTS audit_logs CASCADE;
    `,
  },
  {
    version: 4,
    name: "create_refresh_tokens_table",
    up: `
      CREATE TABLE IF NOT EXISTS refresh_tokens (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token VARCHAR(500) UNIQUE NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        is_revoked BOOLEAN DEFAULT false
      );

      CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);
      CREATE INDEX idx_refresh_tokens_token ON refresh_tokens(token);
      CREATE INDEX idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);
    `,
    down: `
      DROP TABLE IF EXISTS refresh_tokens CASCADE;
    `,
  },
  {
    version: 5,
    name: "create_migrations_table",
    up: `
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        version INTEGER UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `,
    down: `
      DROP TABLE IF EXISTS migrations CASCADE;
    `,
  },
  {
    version: 6,
    name: "create_functions_and_triggers",
    up: `
      -- Fonction pour mettre à jour updated_at automatiquement
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ language 'plpgsql';

      -- Trigger pour users
      CREATE TRIGGER update_users_updated_at
        BEFORE UPDATE ON users
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();

      -- Trigger pour tickets
      CREATE TRIGGER update_tickets_updated_at
        BEFORE UPDATE ON tickets
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();

      -- Vue pour les statistiques
      CREATE OR REPLACE VIEW ticket_statistics AS
      SELECT
        COUNT(*) as total_tickets,
        COUNT(CASE WHEN used = true THEN 1 END) as used_tickets,
        COUNT(CASE WHEN used = false THEN 1 END) as available_tickets,
        COUNT(CASE WHEN sent_whatsapp = true THEN 1 END) as sent_tickets,
        COUNT(CASE WHEN category = 'vip' THEN 1 END) as vip_tickets,
        COUNT(CASE WHEN category = 'standard' THEN 1 END) as standard_tickets,
        COUNT(CASE WHEN category = 'earlybird' THEN 1 END) as earlybird_tickets,
        SUM(price) as total_revenue,
        COUNT(DISTINCT order_id) as total_orders,
        COUNT(DISTINCT created_by) as active_vendors
      FROM tickets;
    `,
    down: `
      DROP VIEW IF EXISTS ticket_statistics;
      DROP TRIGGER IF EXISTS update_tickets_updated_at ON tickets;
      DROP TRIGGER IF EXISTS update_users_updated_at ON users;
      DROP FUNCTION IF EXISTS update_updated_at_column();
    `,
  },
  {
    version: 7,
    name: "add_scanner_role",
    up: `
    -- 1️⃣ Mettre à jour la contrainte CHECK du champ "role" pour inclure "controleur"
    ALTER TABLE users
    DROP CONSTRAINT IF EXISTS users_role_check;

    ALTER TABLE users
    ADD CONSTRAINT users_role_check
    CHECK (role IN ('admin', 'vendeur', 'controleur'));

    -- 2️⃣ Ajouter la colonne scanned_by dans tickets
    ALTER TABLE tickets
    ADD COLUMN IF NOT EXISTS scanned_by INTEGER REFERENCES users(id) ON DELETE SET NULL;

    CREATE INDEX IF NOT EXISTS idx_tickets_scanned_by 
    ON tickets(scanned_by);

    -- 3️⃣ Créer la table scan_logs
    CREATE TABLE IF NOT EXISTS scan_logs (
      id SERIAL PRIMARY KEY,
      ticket_id VARCHAR(50) NOT NULL,
      scanned_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      scanned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      scan_result VARCHAR(20) NOT NULL,
      failure_reason TEXT,
      ip_address INET,
      user_agent TEXT,
      FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_scan_logs_ticket ON scan_logs(ticket_id);
    CREATE INDEX IF NOT EXISTS idx_scan_logs_user ON scan_logs(scanned_by);
    CREATE INDEX IF NOT EXISTS idx_scan_logs_date ON scan_logs(scanned_at);

    -- 4️⃣ Créer une vue pour les stats
    CREATE OR REPLACE VIEW scan_statistics AS
    SELECT 
      scanned_by,
      u.name as scanner_name,
      COUNT(*) as total_scans,
      COUNT(*) FILTER (WHERE scan_result = 'success') as successful_scans,
      COUNT(*) FILTER (WHERE scan_result = 'failed') as failed_scans,
      DATE(scanned_at) as scan_date
    FROM scan_logs sl
    JOIN users u ON sl.scanned_by = u.id
    GROUP BY scanned_by, u.name, DATE(scanned_at);
  `,
    down: `
    DROP VIEW IF EXISTS scan_statistics;
    DROP TABLE IF EXISTS scan_logs CASCADE;
    ALTER TABLE tickets DROP COLUMN IF EXISTS scanned_by;

    -- Supprimer "controleur" de la contrainte CHECK
    ALTER TABLE users
    DROP CONSTRAINT IF EXISTS users_role_check;

    ALTER TABLE users
    ADD CONSTRAINT users_role_check
    CHECK (role IN ('admin', 'vendeur'));
  `,
  },
];

// Fonction pour vérifier si une migration a déjà été appliquée
const isMigrationApplied = async (version) => {
  try {
    const result = await database.query(
      "SELECT * FROM migrations WHERE version = $1",
      [version]
    );
    return result.rows.length > 0;
  } catch (error) {
    // Si la table migrations n'existe pas encore
    return false;
  }
};

// Fonction pour enregistrer une migration
const recordMigration = async (version, name) => {
  await database.query(
    "INSERT INTO migrations (version, name) VALUES ($1, $2)",
    [version, name]
  );
};

// Fonction pour exécuter les migrations
const runMigrations = async () => {
  logger.info("🔄 Démarrage des migrations...");

  try {
    // Créer la table migrations en premier si elle n'existe pas
    const migrationTableMigration = migrations.find(
      (m) => m.name === "create_migrations_table"
    );
    if (migrationTableMigration) {
      await database.query(migrationTableMigration.up);
      logger.info("✅ Table migrations créée");
    }

    // Exécuter toutes les migrations dans l'ordre
    for (const migration of migrations) {
      const applied = await isMigrationApplied(migration.version);

      if (!applied) {
        logger.info(
          `📝 Application de la migration ${migration.version}: ${migration.name}`
        );

        await database.transaction(async (client) => {
          await client.query(migration.up);
          await client.query(
            "INSERT INTO migrations (version, name) VALUES ($1, $2)",
            [migration.version, migration.name]
          );
        });

        logger.info(`✅ Migration ${migration.version} appliquée avec succès`);
      } else {
        logger.debug(`⏭️  Migration ${migration.version} déjà appliquée`);
      }
    }

    logger.info("✅ Toutes les migrations ont été appliquées avec succès");
    return true;
  } catch (error) {
    logger.error("❌ Erreur lors des migrations:", error);
    throw error;
  }
};

// Fonction pour rollback (optionnel)
const rollbackMigration = async (version) => {
  logger.info(`🔄 Rollback de la migration ${version}...`);

  try {
    const migration = migrations.find((m) => m.version === version);

    if (!migration) {
      throw new Error(`Migration ${version} non trouvée`);
    }

    await database.transaction(async (client) => {
      await client.query(migration.down);
      await client.query("DELETE FROM migrations WHERE version = $1", [
        version,
      ]);
    });

    logger.info(`✅ Migration ${version} rollback avec succès`);
    return true;
  } catch (error) {
    logger.error(
      `❌ Erreur lors du rollback de la migration ${version}:`,
      error
    );
    throw error;
  }
};

// Exécution si appelé directement
if (import.meta.url === `file://${process.argv[1]}`) {
  runMigrations()
    .then(() => {
      logger.info("✅ Migrations terminées");
      process.exit(0);
    })
    .catch((error) => {
      logger.error("❌ Échec des migrations:", error);
      process.exit(1);
    });
}

export { runMigrations, rollbackMigration };
