const https = require("https");
const fs = require("fs");
require("dotenv").config();
const app = require("./app");
const logger = require("./config/logger");
const runMigrations = require("./runMigrations");

const PORT = process.env.PORT || 3000;
const SSL_KEY = process.env.SSL_KEY;
const SSL_CERT = process.env.SSL_CERT;

async function start() {
  try {
    await runMigrations();
  } catch (err) {
    logger.error("Error en migraciones iniciales:", err.message);
  }

  if (SSL_KEY && SSL_CERT && fs.existsSync(SSL_KEY) && fs.existsSync(SSL_CERT)) {
    https.createServer({
      key: fs.readFileSync(SSL_KEY),
      cert: fs.readFileSync(SSL_CERT),
    }, app).listen(443, () => {
      logger.info(`Servidor HTTPS iniciado en puerto 443`);
    });
    app.listen(PORT, () => {
      logger.info(`Servidor HTTP iniciado en puerto ${PORT}, entorno: ${process.env.NODE_ENV || "development"}`);
    });
  } else {
    app.listen(PORT, () => {
      logger.info(`Servidor HTTP iniciado en puerto ${PORT}, entorno: ${process.env.NODE_ENV || "development"}`);
    });
  }
}

start();
