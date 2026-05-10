const express = require("express");
const router = express.Router();

const { getDashboardReport } = require("../controllers/reportController");
const verifyToken = require("../middlewares/authMiddleware");

router.get("/dashboard", verifyToken, getDashboardReport);

module.exports = router;