const winston = require("winston");

const logger = winston.createLogger({
  level: process.env.NODE_ENV === "production" ? "info" : "debug",
  format: winston.format.combine(
    winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    winston.format.errors({ stack: true }),
    process.env.NODE_ENV === "production"
      ? winston.format.json()
      : winston.format.printf(({ timestamp, level, message, stack }) => {
          return `${timestamp} [${level.toUpperCase()}] ${message}${stack ? "\n" + stack : ""}`;
        })
  ),
  transports: [
    new winston.transports.Console(),
    ...(process.env.NODE_ENV === "production"
      ? [
          new winston.transports.File({ filename: "/var/log/stockflow/error.log", level: "error" }),
          new winston.transports.File({ filename: "/var/log/stockflow/combined.log" }),
        ]
      : []),
  ],
});

module.exports = logger;
