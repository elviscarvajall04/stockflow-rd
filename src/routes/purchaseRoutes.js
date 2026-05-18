const express = require("express");
const router = express.Router();

const { createPurchase, getPurchases, getPurchaseById, updatePurchase, deletePurchase } = require("../controllers/purchaseController");
const verifyToken = require("../middlewares/authMiddleware");
const authorizeRoles = require("../middlewares/roleMiddleware");

router.post("/", verifyToken, createPurchase);
router.get("/", verifyToken, getPurchases);
router.get("/:id", verifyToken, getPurchaseById);
router.put("/:id", verifyToken, authorizeRoles("admin"), updatePurchase);
router.delete("/:id", verifyToken, authorizeRoles("admin"), deletePurchase);

module.exports = router;
