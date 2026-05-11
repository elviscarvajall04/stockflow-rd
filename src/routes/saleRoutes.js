const express = require("express");
const router = express.Router();

const {
  createSale,
  getSales,
  getSaleById,
  cancelSale,
  updateSale,
} = require("../controllers/saleController");

const verifyToken = require("../middlewares/authMiddleware");

// 🔒 PROTEGIDAS
router.post("/", verifyToken, createSale);
router.get("/", verifyToken, getSales);
router.get("/:id", verifyToken, getSaleById);
router.put("/:id", verifyToken, updateSale);
router.put("/:id/cancel", verifyToken, cancelSale);

module.exports = router;