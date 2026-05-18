const express = require("express");
const router = express.Router();

const { getUsers, getUserById, updateUser, deleteUser } = require("../controllers/userController");
const verifyToken = require("../middlewares/authMiddleware");
const authorizeRoles = require("../middlewares/roleMiddleware");

router.get("/", verifyToken, authorizeRoles("admin"), getUsers);
router.get("/:id", verifyToken, authorizeRoles("admin"), getUserById);
router.put("/:id", verifyToken, authorizeRoles("admin"), updateUser);
router.delete("/:id", verifyToken, authorizeRoles("admin"), deleteUser);

module.exports = router;
