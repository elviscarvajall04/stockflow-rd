const pool = require("../config/db");
const path = require("path");
const fs = require("fs");

const uploadLogo = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Seleccione una imagen" });
    }

    const logoUrl = `/uploads/${req.file.filename}`;

    const existing = await pool.query("SELECT id FROM company_settings LIMIT 1");

    if (existing.rows.length > 0) {
      // Delete old logo file if exists
      const old = await pool.query("SELECT logo_url FROM company_settings LIMIT 1");
      if (old.rows[0]?.logo_url) {
        const oldPath = path.join(__dirname, "..", old.rows[0].logo_url);
        if (fs.existsSync(oldPath)) {
          fs.unlinkSync(oldPath);
        }
      }

      await pool.query(
        "UPDATE company_settings SET logo_url = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2",
        [logoUrl, existing.rows[0].id]
      );
    } else {
      await pool.query(
        "INSERT INTO company_settings (company_name, rnc, logo_url) VALUES ('Mi Empresa', '', $1)",
        [logoUrl]
      );
    }

    res.json({ logo_url: logoUrl });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error subiendo logo" });
  }
};

const deleteLogo = async (req, res) => {
  try {
    const existing = await pool.query("SELECT id, logo_url FROM company_settings LIMIT 1");
    if (existing.rows.length > 0 && existing.rows[0].logo_url) {
      const oldPath = path.join(__dirname, "..", existing.rows[0].logo_url);
      if (fs.existsSync(oldPath)) {
        fs.unlinkSync(oldPath);
      }
      await pool.query(
        "UPDATE company_settings SET logo_url = '', updated_at = CURRENT_TIMESTAMP WHERE id = $1",
        [existing.rows[0].id]
      );
    }
    res.json({ message: "Logo eliminado" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error eliminando logo" });
  }
};

module.exports = { uploadLogo, deleteLogo };
