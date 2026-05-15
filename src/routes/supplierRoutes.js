const express = require("express");
const router = express.Router();

const {
  getSuppliers, getSupplierById, createSupplier, updateSupplier, deleteSupplier,
} = require("../controllers/supplierController");

const verifyToken = require("../middlewares/authMiddleware");
const authorizeRoles = require("../middlewares/roleMiddleware");

router.get("/", verifyToken, getSuppliers);
router.get("/:id", verifyToken, getSupplierById);
router.post("/", verifyToken, authorizeRoles("admin"), createSupplier);
router.put("/:id", verifyToken, authorizeRoles("admin"), updateSupplier);
router.delete("/:id", verifyToken, authorizeRoles("admin"), deleteSupplier);

module.exports = router;
