import pg from "pg";
import config from "./config.js";
import logger from "./logger.js";

const { Pool } = pg;

// Configuration du pool de connexions PostgreSQL
const poolConfig = {
  host: config.database.host,
  port: config.database.port,
  database: config.database.database,
  user: config.database.user,
  password: config.database.password,
  max: config.database.max,
  min: config.database.min,
  idleTimeoutMillis: config.database.idleTimeoutMillis,
  connectionTimeoutMillis: config.database.connectionTimeoutMillis,
  ssl: config.database.ssl,
};

// Créer le pool
const pool = new Pool(poolConfig);

// Gestion des événements du pool
pool.on("connect", (client) => {
  logger.debug("Nouvelle connexion PostgreSQL établie");
});

pool.on("acquire", (client) => {
  logger.debug("Client PostgreSQL acquis depuis le pool");
});

pool.on("error", (err, client) => {
  logger.error("Erreur inattendue sur le client PostgreSQL idle:", err);
});

pool.on("remove", (client) => {
  logger.debug("Client PostgreSQL retiré du pool");
});

// Fonction pour tester la connexion
const testConnection = async () => {
  let client;
  try {
    client = await pool.connect();
    const result = await client.query("SELECT NOW()");
    logger.info("✅ Connexion PostgreSQL réussie:", result.rows[0].now);
    return true;
  } catch (error) {
    logger.error("❌ Erreur de connexion PostgreSQL:", error);
    throw error;
  } finally {
    if (client) {
      client.release();
    }
  }
};

// Fonction helper pour exécuter des requêtes avec retry
const query = async (text, params, retries = 3) => {
  for (let i = 0; i < retries; i++) {
    try {
      const start = Date.now();
      const result = await pool.query(text, params);
      const duration = Date.now() - start;

      if (duration > 1000) {
        logger.warn(
          `Requête lente détectée (${duration}ms):`,
          text.substring(0, 100)
        );
      }

      return result;
    } catch (error) {
      logger.error(`Erreur requête (tentative ${i + 1}/${retries}):`, error);

      if (i === retries - 1) {
        throw error;
      }

      // Attendre avant de réessayer
      await new Promise((resolve) => setTimeout(resolve, Math.pow(2, i) * 100));
    }
  }
};

// Fonction helper pour les transactions
const transaction = async (callback) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    const result = await callback(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    logger.error("Transaction rollback:", error);
    throw error;
  } finally {
    client.release();
  }
};

// Fonction pour obtenir les statistiques du pool
const getPoolStats = () => {
  return {
    total: pool.totalCount,
    idle: pool.idleCount,
    waiting: pool.waitingCount,
  };
};

// Fonction pour fermer proprement le pool
const closePool = async () => {
  try {
    await pool.end();
    logger.info("✅ Pool PostgreSQL fermé proprement");
  } catch (error) {
    logger.error("❌ Erreur lors de la fermeture du pool:", error);
    throw error;
  }
};

// Exporter les fonctions et le pool
export default {
  pool,
  query,
  transaction,
  testConnection,
  getPoolStats,
  closePool,
};
