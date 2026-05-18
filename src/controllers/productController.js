const pool = require("../config/db");
const logger = require("../config/logger");
const { paginate, paginatedResponse } = require("../config/paginate");

const getProducts = async (req, res) => {
  try {
    const { page, limit, offset, hasPage } = paginate(req);
    const countResult = await pool.query("SELECT COUNT(*) FROM products WHERE active = true");
    const result = await pool.query(
      `SELECT p.*, c.name AS category_name
       FROM products p
       LEFT JOIN categories c ON p.category_id = c.id
       WHERE p.active = true
       ORDER BY p.id ASC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    res.json(paginatedResponse(result.rows, countResult.rows[0].count, page, limit, hasPage));
  } catch (error) {
    logger.error(error);
    res.status(500).json({ message: "Error obteniendo productos" });
  }
};

const getLowStockProducts = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT p.*, c.name AS category_name
       FROM products p
       LEFT JOIN categories c ON p.category_id = c.id
       WHERE p.stock <= 5 AND p.active = true
       ORDER BY p.stock ASC`
    );
    res.json(result.rows);
  } catch (error) {
    logger.error(error);
    res.status(500).json({ message: "Error obteniendo productos con bajo stock" });
  }
};

const getProductById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT p.*, c.name AS category_name
       FROM products p
       LEFT JOIN categories c ON p.category_id = c.id
       WHERE p.id = $1 AND p.active = true`,
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Producto no encontrado" });
    }
    res.json(result.rows[0]);
  } catch (error) {
    logger.error(error);
    res.status(500).json({ message: "Error obteniendo producto" });
  }
};

const createProduct = async (req, res) => {
  try {
    const { name, price, stock, itbis, category_id } = req.body;
    if (!name || name.trim() === "") {
      return res.status(400).json({ message: "El nombre es obligatorio" });
    }
    if (price == null || price <= 0) {
      return res.status(400).json({ message: "El precio debe ser mayor a 0" });
    }
    if (stock == null || stock < 0) {
      return res.status(400).json({ message: "El stock no puede ser negativo" });
    }
    const itbisValue = itbis != null ? itbis : 18.00;
    const result = await pool.query(
      "INSERT INTO products (name, price, stock, itbis, category_id, active) VALUES ($1, $2, $3, $4, $5, true) RETURNING *",
      [name, price, stock, itbisValue, category_id || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    logger.error(error);
    res.status(500).json({ message: "Error creando producto" });
  }
};

const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, price, stock, itbis, category_id } = req.body;
    if (!name || name.trim() === "") {
      return res.status(400).json({ message: "El nombre es obligatorio" });
    }
    if (price == null || price <= 0) {
      return res.status(400).json({ message: "El precio debe ser mayor a 0" });
    }
    if (stock == null || stock < 0) {
      return res.status(400).json({ message: "El stock no puede ser negativo" });
    }
    const itbisValue = itbis != null ? itbis : 18.00;
    const result = await pool.query(
      "UPDATE products SET name = $1, price = $2, stock = $3, itbis = $4, category_id = $5 WHERE id = $6 AND active = true RETURNING *",
      [name, price, stock, itbisValue, category_id || null, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Producto no encontrado" });
    }
    res.json(result.rows[0]);
  } catch (error) {
    logger.error(error);
    res.status(500).json({ message: "Error actualizando producto" });
  }
};

const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar si tiene ventas, compras o movimientos de inventario
    const referencesCheck = await pool.query(
      `SELECT
        (SELECT COUNT(*) FROM sale_items WHERE product_id = $1) AS sales,
        (SELECT COUNT(*) FROM purchase_items WHERE product_id = $1) AS purchases,
        (SELECT COUNT(*) FROM inventory_movements WHERE product_id = $1) AS movements`,
      [id]
    );

    const { sales, purchases, movements } = referencesCheck.rows[0];

    if (parseInt(sales) > 0 || parseInt(purchases) > 0 || parseInt(movements) > 0) {
      await pool.query(
        "UPDATE products SET active = false WHERE id = $1",
        [id]
      );
      return res.json({
        message: "Producto desactivado correctamente (tenía registros asociados)",
      });
    }

    // No tiene referencias — eliminar permanentemente
    const result = await pool.query(
      "DELETE FROM products WHERE id = $1 RETURNING *",
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Producto no encontrado" });
    }

    res.json({
      message: "Producto eliminado correctamente",
      product: result.rows[0],
    });
  } catch (error) {
    logger.error(error);
    res.status(500).json({ message: "Error eliminando producto" });
  }
};

module.exports = {
  getProducts,
  getLowStockProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
};