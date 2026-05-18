let app;
try {
  app = require("../src/app");
} catch (err) {
  app = null;
  console.error("Failed to load app:", err);
}

const express = require("express");
const fallback = express();
fallback.get("/api/test", (req, res) => {
  res.json({ ok: true, message: "fallback test endpoint works" });
});
fallback.get("/api/error", (req, res) => {
  res.json({ ok: false, error: app === null ? "app failed to load" : "unknown" });
});

module.exports = (req, res) => {
  if (req.path === "/api/test" || req.path === "/api/error") {
    return fallback(req, res);
  }
  if (!app) {
    return res.status(500).json({ error: "App failed to load" });
  }
  return app(req, res);
};
