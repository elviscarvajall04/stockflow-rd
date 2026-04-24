const express = require("express");
const router = express.Router();

const {
  createSale,
  getSales,
  getSaleById,
} = require("../controllers/saleController");

const verifyToken = require("../middlewares/authMiddleware");

// 🔒 PROTEGIDAS
router.post("/", verifyToken, createSale);
router.get("/", verifyToken, getSales);
router.get("/:id", verifyToken, getSaleById);

module.exports = router;