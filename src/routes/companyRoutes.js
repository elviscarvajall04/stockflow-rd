const express = require("express");
const router = express.Router();

const {
  getCompanySettings,
  updateCompanySettings,
} = require("../controllers/companyController");

const verifyToken = require("../middlewares/authMiddleware");
const authorizeRoles = require("../middlewares/roleMiddleware");

router.get("/", verifyToken, getCompanySettings);
router.put("/", verifyToken, authorizeRoles("admin"), updateCompanySettings);

module.exports = router;
