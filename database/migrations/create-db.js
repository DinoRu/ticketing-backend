import pg from "pg";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config({
  path: path.join(path.dirname(fileURLToPath(import.meta.url)), "../../.env"),
});

const { Client } = pg;

const dbConfig = {
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT) || 5432,
  user: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD || "postgres",
  database: process.env.DB_NAME || "didi_ticketing",
};

const createDatabase = async () => {
  console.log("🔹 Informations de connexion PostgreSQL :");
  console.log(`Host: ${dbConfig.host}`);
  console.log(`Port: ${dbConfig.port}`);
  console.log(`User: ${dbConfig.user}`);
  console.log(`Password: ${dbConfig.password}`);
  console.log(`Database: ${dbConfig.database}`);
  console.log("--------------------------------------------------");

  // Connexion à PostgreSQL sur la base "postgres" par défaut
  const client = new Client({
    host: dbConfig.host,
    port: dbConfig.port,
    user: dbConfig.user,
    password: dbConfig.password,
    database: "postgres", // on se connecte à postgres pour créer la DB
  });

  try {
    await client.connect();
    console.log("🔹 Connexion à PostgreSQL réussie ✅");

    // Vérifier si la base existe
    const res = await client.query(
      "SELECT 1 FROM pg_database WHERE datname=$1",
      [dbConfig.database]
    );

    if (res.rowCount === 0) {
      // Créer la base de données
      await client.query(`CREATE DATABASE ${dbConfig.database}`);
      console.log(
        `✅ Base de données "${dbConfig.database}" créée avec succès !`
      );
    } else {
      console.log(`ℹ️  Base de données "${dbConfig.database}" existe déjà.`);
    }
  } catch (error) {
    console.error("❌ Erreur lors de la création de la base :", error);
  } finally {
    await client.end();
    console.log("🔹 Connexion fermée.");
  }
};

// Exécution directe
if (import.meta.url === `file://${process.argv[1]}`) {
  createDatabase()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

export default createDatabase;
