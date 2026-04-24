const express = require("express");
const router = express.Router();

const { getDashboardReport } = require("../controllers/reportController");

router.get("/dashboard", getDashboardReport);

module.exports = router;