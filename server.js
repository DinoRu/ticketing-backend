import app from "./src/app.js";
import config from "./src/config/config.js";
import logger from "./src/config/logger.js";
import database from "./src/config/database.js";
import { runMigrations } from "./database/migrations/migrate.js";

/**
 * Initialiser l'application
 */
const initializeApp = async () => {
  try {
    logger.info("🚀 Démarrage de l'application...");
    logger.info(`📦 Environnement: ${config.server.env}`);

    // 1. Tester la connexion à la base de données
    logger.info("🔌 Connexion à PostgreSQL...");
    await database.testConnection();
    logger.info("✅ PostgreSQL connecté avec succès");

    // 2. Exécuter les migrations en développement
    if (config.server.env === "development") {
      logger.info("📝 Exécution des migrations...");
      await runMigrations();
      logger.info("✅ Migrations terminées");
    }

    // 3. Démarrer le serveur
    const server = app.listen(config.server.port, config.server.host, () => {
      logger.info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      logger.info("✅ Serveur démarré avec succès !");
      logger.info(`🌐 URL: http://${config.server.host}:${config.server.port}`);
      logger.info(
        `🎫 API: http://${config.server.host}:${config.server.port}/api`
      );
      logger.info(
        `💚 Health: http://${config.server.host}:${config.server.port}/health`
      );
      logger.info(`🗄️  Base de données: ${config.database.database}`);
      logger.info(`🔒 Environnement: ${config.server.env}`);
      logger.info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      logger.info("");
      logger.info("📋 Comptes par défaut (si seeds exécutés):");
      logger.info("   👑 Admin: admin / admin123");
      //   logger.info("   💼 Vendeur: vendeur1 / vend123");
      logger.info("");
      logger.info("⚡ Prêt à accepter les connexions !");
      logger.info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    });

    // Gérer les erreurs du serveur
    server.on("error", (error) => {
      if (error.code === "EADDRINUSE") {
        logger.error(`❌ Le port ${config.server.port} est déjà utilisé`);
      } else {
        logger.error("❌ Erreur serveur:", error);
      }
      process.exit(1);
    });

    // Timeout pour les requêtes longues
    server.timeout = 30000; // 30 secondes

    return server;
  } catch (error) {
    logger.error("❌ Erreur lors du démarrage:", error);
    process.exit(1);
  }
};

// Démarrer l'application
initializeApp();

// Exporter pour les tests
export default initializeApp;
