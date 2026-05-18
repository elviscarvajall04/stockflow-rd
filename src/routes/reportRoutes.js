const express = require("express");
const router = express.Router();

const { getDashboardReport, getDgiiReport, getProfitReport } = require("../controllers/reportController");
const verifyToken = require("../middlewares/authMiddleware");

router.get("/dashboard", verifyToken, getDashboardReport);
router.get("/dgii", verifyToken, getDgiiReport);
router.get("/profit", verifyToken, getProfitReport);

module.exports = router;