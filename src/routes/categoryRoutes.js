const express = require("express");
const router = express.Router();

const { getCategories, createCategory, updateCategory, deleteCategory } = require("../controllers/categoryController");
const verifyToken = require("../middlewares/authMiddleware");
const authorizeRoles = require("../middlewares/roleMiddleware");

router.get("/", verifyToken, getCategories);
router.post("/", verifyToken, authorizeRoles("admin"), createCategory);
router.put("/:id", verifyToken, authorizeRoles("admin"), updateCategory);
router.delete("/:id", verifyToken, authorizeRoles("admin"), deleteCategory);

module.exports = router;
