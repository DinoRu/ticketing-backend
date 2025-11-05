import bcrypt from "bcryptjs";
import database from "../../src/config/database.js";
import logger from "../../src/config/logger.js";
import config from "../../src/config/config.js";

const seedUsers = async () => {
  logger.info("🌱 Démarrage du seeding des utilisateurs...");

  try {
    // Vérifier si des utilisateurs existent déjà
    const existingUsers = await database.query("SELECT COUNT(*) FROM users");
    const userCount = parseInt(existingUsers.rows[0].count);

    if (userCount > 0) {
      logger.info(
        `ℹ️  ${userCount} utilisateur(s) déjà existant(s). Seeding annulé.`
      );
      return;
    }

    // Hasher les mots de passe
    const adminPassword = await bcrypt.hash(
      "admin123",
      config.security.bcryptSaltRounds
    );
    const vendeurPassword = await bcrypt.hash(
      "vend123",
      config.security.bcryptSaltRounds
    );
    const controleurPassword = await bcrypt.hash(
      "ctrl123",
      config.security.bcryptSaltRounds
    );

    // Utilisateurs par défaut
    const users = [
      {
        username: "admin",
        password: adminPassword,
        name: "Administrateur Principal",
        phone: "+7 999 999 9999",
        role: "admin",
      },
      {
        username: "vendor_test",
        password: vendeurPassword,
        name: "Kofi Mensah",
        phone: "+7 999 111 1111",
        role: "vendeur",
      },

      {
        username: "controleur1",
        password: controleurPassword,
        name: "Jean Contrôleur",
        phone: "+7 999 444 4444",
        role: "controleur",
      },
    ];

    // Insérer les utilisateurs
    for (const user of users) {
      await database.query(
        `INSERT INTO users (username, password, name, phone, role)
         VALUES ($1, $2, $3, $4, $5)`,
        [user.username, user.password, user.name, user.phone, user.role]
      );
      logger.info(`✅ Utilisateur créé: ${user.username} (${user.role})`);
    }

    logger.info("✅ Seeding des utilisateurs terminé avec succès");
    logger.info("\n📋 Comptes créés:");
    logger.info("   👑 Admin: admin / admin123");
    logger.info("   💼 Vendeur 1: vendeur1 / vend123");
    logger.info("   🎫 Contrôleur 1: controleur1 / ctrl123");
  } catch (error) {
    logger.error("❌ Erreur lors du seeding:", error);
    throw error;
  }
};

// Fonction principale de seeding
const runSeeds = async () => {
  try {
    await database.testConnection();
    await seedUsers();
    logger.info("✅ Tous les seeds ont été appliqués avec succès");
  } catch (error) {
    logger.error("❌ Échec du seeding:", error);
    throw error;
  }
};

// Exécution si appelé directement
if (import.meta.url === `file://${process.argv[1]}`) {
  runSeeds()
    .then(() => {
      logger.info("✅ Seeding terminé");
      process.exit(0);
    })
    .catch((error) => {
      logger.error("❌ Échec du seeding:", error);
      process.exit(1);
    });
}

export { runSeeds, seedUsers };
