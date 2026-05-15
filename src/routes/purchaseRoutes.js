const express = require("express");
const router = express.Router();

const { createPurchase, getPurchases, getPurchaseById } = require("../controllers/purchaseController");
const verifyToken = require("../middlewares/authMiddleware");

router.post("/", verifyToken, createPurchase);
router.get("/", verifyToken, getPurchases);
router.get("/:id", verifyToken, getPurchaseById);

module.exports = router;
