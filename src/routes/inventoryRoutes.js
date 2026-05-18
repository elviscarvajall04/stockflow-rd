const express = require("express");
const router = express.Router();

const { getMovements, getInventoryValue } = require("../controllers/inventoryController");
const verifyToken = require("../middlewares/authMiddleware");

router.get("/movements", verifyToken, getMovements);
router.get("/value", verifyToken, getInventoryValue);

module.exports = router;
