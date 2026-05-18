const express = require("express");
const router = express.Router();

const {
  getCompanySettings,
  updateCompanySettings,
  getCompanyStatus,
} = require("../controllers/companyController");
const { uploadLogo, deleteLogo } = require("../controllers/uploadController");
const upload = require("../middlewares/uploadMiddleware");
const verifyToken = require("../middlewares/authMiddleware");
const authorizeRoles = require("../middlewares/roleMiddleware");

router.get("/status", verifyToken, getCompanyStatus);
router.get("/", verifyToken, getCompanySettings);
router.put("/", verifyToken, authorizeRoles("admin"), updateCompanySettings);
router.post("/logo", verifyToken, authorizeRoles("admin"), upload.single("logo"), uploadLogo);
router.delete("/logo", verifyToken, authorizeRoles("admin"), deleteLogo);

module.exports = router;
