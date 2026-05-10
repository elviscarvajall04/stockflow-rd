const express = require("express");
const router = express.Router();

const { getNCFSequences, updateNCFSequence } = require("../services/ncfService");
const pool = require("../config/db");
const verifyToken = require("../middlewares/authMiddleware");
const authorizeRoles = require("../middlewares/roleMiddleware");

router.get("/", verifyToken, authorizeRoles("admin"), async (req, res) => {
  try {
    const sequences = await getNCFSequences(pool);
    res.json(sequences);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error obteniendo secuencias NCF" });
  }
});

router.put("/:id", verifyToken, authorizeRoles("admin"), async (req, res) => {
  try {
    const sequence = await updateNCFSequence(pool, req.params.id, req.body);
    if (!sequence) {
      return res.status(404).json({ message: "Secuencia no encontrada" });
    }
    res.json({ message: "Secuencia actualizada", sequence });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error actualizando secuencia" });
  }
});

module.exports = router;
