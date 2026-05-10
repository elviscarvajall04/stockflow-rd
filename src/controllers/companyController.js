const pool = require("../config/db");

const getCompanySettings = async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM company_settings LIMIT 1"
    );
    if (result.rows.length === 0) {
      return res.json({
        company_name: "Mi Empresa",
        commercial_name: "",
        rnc: "",
        phone: "",
        email: "",
        address: "",
        logo_url: "",
        default_itbis: 18.00,
        currency: "RD$",
      });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error obteniendo configuración" });
  }
};

const updateCompanySettings = async (req, res) => {
  try {
    const {
      company_name,
      commercial_name,
      rnc,
      phone,
      email,
      address,
      logo_url,
      default_itbis,
      currency,
    } = req.body;

    const result = await pool.query(
      `UPDATE company_settings
       SET company_name = $1,
           commercial_name = $2,
           rnc = $3,
           phone = $4,
           email = $5,
           address = $6,
           logo_url = $7,
           default_itbis = $8,
           currency = $9,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = 1
       RETURNING *`,
      [
        company_name,
        commercial_name || "",
        rnc || "",
        phone || "",
        email || "",
        address || "",
        logo_url || "",
        default_itbis || 18.00,
        currency || "RD$",
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Configuración no encontrada" });
    }

    res.json({
      message: "Configuración actualizada correctamente",
      settings: result.rows[0],
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error actualizando configuración" });
  }
};

module.exports = {
  getCompanySettings,
  updateCompanySettings,
};
