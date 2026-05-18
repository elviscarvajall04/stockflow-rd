const pool = require("../config/db");
const logger = require("../config/logger");
const { paginate, paginatedResponse } = require("../config/paginate");

const getSuppliers = async (req, res) => {
  try {
    const { page, limit, offset, hasPage } = paginate(req);
    const countResult = await pool.query("SELECT COUNT(*) FROM suppliers");
    const result = await pool.query(`
      SELECT s.*,
        COALESCE(p.purchase_count, 0) AS purchase_count
      FROM suppliers s
      LEFT JOIN (
        SELECT supplier_id, COUNT(*) AS purchase_count
        FROM purchases GROUP BY supplier_id
      ) p ON p.supplier_id = s.id
      ORDER BY s.name ASC
      LIMIT $1 OFFSET $2
    `, [limit, offset]);
    res.json(paginatedResponse(result.rows, countResult.rows[0].count, page, limit, hasPage));
  } catch (error) {
    logger.error(error);
    res.status(500).json({ message: "Error obteniendo proveedores" });
  }
};

const getSupplierById = async (req, res) => {
  const { id } = req.params;
  try {
    const supplier = await pool.query("SELECT * FROM suppliers WHERE id = $1", [id]);
    if (supplier.rows.length === 0) {
      return res.status(404).json({ message: "Proveedor no encontrado" });
    }

    const purchases = await pool.query(`
      SELECT pu.id, pu.total, pu.ncf, pu.created_at, u.name AS user_name
      FROM purchases pu
      LEFT JOIN users u ON pu.user_id = u.id
      WHERE pu.supplier_id = $1
      ORDER BY pu.created_at DESC
    `, [id]);

    res.json({
      ...supplier.rows[0],
      purchases: purchases.rows,
      total_purchases: purchases.rows.reduce((sum, p) => sum + Number(p.total), 0),
    });
  } catch (error) {
    logger.error(error);
    res.status(500).json({ message: "Error obteniendo proveedor" });
  }
};

const createSupplier = async (req, res) => {
  const { name, rnc, phone, email, address } = req.body;
  if (!name) {
    return res.status(400).json({ message: "El nombre es obligatorio" });
  }
  try {
    const result = await pool.query(
      "INSERT INTO suppliers (name, rnc, phone, email, address) VALUES ($1, $2, $3, $4, $5) RETURNING *",
      [name, rnc || "", phone || "", email || "", address || ""]
    );
    res.status(201).json({ message: "Proveedor creado correctamente", supplier: result.rows[0] });
  } catch (error) {
    logger.error(error);
    res.status(500).json({ message: "Error creando proveedor" });
  }
};

const updateSupplier = async (req, res) => {
  const { id } = req.params;
  const { name, rnc, phone, email, address } = req.body;
  try {
    const result = await pool.query(
      "UPDATE suppliers SET name=$1, rnc=$2, phone=$3, email=$4, address=$5 WHERE id=$6 RETURNING *",
      [name, rnc || "", phone || "", email || "", address || "", id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Proveedor no encontrado" });
    }
    res.json({ message: "Proveedor actualizado", supplier: result.rows[0] });
  } catch (error) {
    logger.error(error);
    res.status(500).json({ message: "Error actualizando proveedor" });
  }
};

const deleteSupplier = async (req, res) => {
  const { id } = req.params;
  try {
    const check = await pool.query("SELECT COUNT(*) FROM purchases WHERE supplier_id = $1", [id]);
    if (parseInt(check.rows[0].count) > 0) {
      return res.status(400).json({
        message: "No se puede eliminar el proveedor porque tiene compras registradas",
      });
    }
    await pool.query("DELETE FROM suppliers WHERE id = $1", [id]);
    res.json({ message: "Proveedor eliminado correctamente" });
  } catch (error) {
    logger.error(error);
    res.status(500).json({ message: "Error eliminando proveedor" });
  }
};

module.exports = { getSuppliers, getSupplierById, createSupplier, updateSupplier, deleteSupplier };
