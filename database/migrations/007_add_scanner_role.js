import database from "../../src/config/database.js";
import logger from "../../src/config/logger.js";

/**
 * Migration 001 - Ajouter rôle contrôleur et traçabilité des scans
 */
export async function up() {
  const client = await database.getPool().connect();

  try {
    await client.query("BEGIN");

    logger.info("Migration 007: Ajout rôle contrôleur...");

    // 1. Modifier l'ENUM pour ajouter le rôle 'controleur'
    await client.query(`
      ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'controleur';
    `);

    // 2. Ajouter la colonne scanned_by dans tickets
    await client.query(`
      ALTER TABLE tickets
      ADD COLUMN IF NOT EXISTS scanned_by INTEGER REFERENCES users(id) ON DELETE SET NULL;
    `);

    // 3. Créer un index sur scanned_by pour les requêtes rapides
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_tickets_scanned_by 
      ON tickets(scanned_by);
    `);

    // 4. Créer une table d'audit pour les scans
    await client.query(`
      CREATE TABLE IF NOT EXISTS scan_logs (
        id SERIAL PRIMARY KEY,
        ticket_id VARCHAR(50) NOT NULL,
        scanned_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        scanned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        scan_result VARCHAR(20) NOT NULL, -- 'success' ou 'failed'
        failure_reason TEXT,
        ip_address INET,
        user_agent TEXT,
        FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE
      );
    `);

    // 5. Créer des index sur scan_logs
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_scan_logs_ticket 
      ON scan_logs(ticket_id);
      
      CREATE INDEX IF NOT EXISTS idx_scan_logs_user 
      ON scan_logs(scanned_by);
      
      CREATE INDEX IF NOT EXISTS idx_scan_logs_date 
      ON scan_logs(scanned_at);
    `);

    // 6. Créer une vue pour les statistiques de scan
    await client.query(`
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
    `);

    await client.query("COMMIT");
    logger.info("Migration 007 appliquée avec succès");
  } catch (error) {
    await client.query("ROLLBACK");
    logger.error("Erreur migration 007:", error);
    throw error;
  } finally {
    client.release();
  }
}

export async function down() {
  const client = await database.getPool().connect();

  try {
    await client.query("BEGIN");

    logger.info("Migration 007: Rollback...");

    // Supprimer dans l'ordre inverse
    await client.query("DROP VIEW IF EXISTS scan_statistics;");
    await client.query("DROP TABLE IF EXISTS scan_logs CASCADE;");
    await client.query("ALTER TABLE tickets DROP COLUMN IF EXISTS scanned_by;");

    // Note: On ne peut pas retirer une valeur d'un ENUM en PostgreSQL
    // Il faudrait recréer le type complètement

    await client.query("COMMIT");
    logger.info("Migration 007 rollback avec succès");
  } catch (error) {
    await client.query("ROLLBACK");
    logger.error("Erreur rollback migration 007:", error);
    throw error;
  } finally {
    client.release();
  }
}
