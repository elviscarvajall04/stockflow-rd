const fs = require("fs");
const path = require("path");
const pool = require("./config/db");

const MIGRATIONS_DIR = path.join(__dirname, "migrations");

async function runMigrations() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        name VARCHAR(255) PRIMARY KEY,
        applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    const files = fs.readdirSync(MIGRATIONS_DIR)
      .filter((f) => f.endsWith(".sql"))
      .sort();

    if (files.length === 0) {
      console.log("📁 No hay migraciones pendientes.");
      return;
    }

    const { rows: applied } = await client.query(
      "SELECT name FROM _migrations"
    );
    const appliedSet = new Set(applied.map((r) => r.name));

    for (const file of files) {
      if (appliedSet.has(file)) {
        console.log(`⏭️  ${file} — ya aplicada`);
        continue;
      }

      const sql = fs.readFileSync(
        path.join(MIGRATIONS_DIR, file),
        "utf-8"
      );

      console.log(`🔄 ${file} — ejecutando...`);

      await client.query(sql);
      await client.query(
        "INSERT INTO _migrations (name) VALUES ($1)",
        [file]
      );

      console.log(`✅ ${file} — aplicada`);
    }

    console.log("🎉 Migraciones completadas.");
  } catch (err) {
    console.error("❌ Error ejecutando migraciones:", err.message);
    throw err;
  } finally {
    client.release();
  }
}

if (require.main === module) {
  runMigrations()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = runMigrations;
