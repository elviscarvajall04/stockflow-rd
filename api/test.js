const express = require("express");
const app = express();

app.get("/api/test", (req, res) => {
  res.json({ ok: true, message: "test endpoint works" });
});

module.exports = app;
