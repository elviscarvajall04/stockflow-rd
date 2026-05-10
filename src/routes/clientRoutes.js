const express = require("express");
const router = express.Router();
const {
  getClients,
  getClientById,
  createClient,
  updateClient,
  deleteClient,
} = require("../controllers/clientController");
const verifyToken = require("../middlewares/authMiddleware");
const authorizeRoles = require("../middlewares/roleMiddleware");

router.get("/", verifyToken, getClients);
router.get("/:id", verifyToken, getClientById);
router.post("/", verifyToken, authorizeRoles("admin"), createClient);
router.put("/:id", verifyToken, authorizeRoles("admin"), updateClient);
router.delete("/:id", verifyToken, authorizeRoles("admin"), deleteClient);

module.exports = router;