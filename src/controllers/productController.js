const pool = require("../config/db");

const getProducts = async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM products WHERE active = true ORDER BY id ASC"
    );
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error obteniendo productos" });
  }
};

const getLowStockProducts = async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM products WHERE stock <= 5 AND active = true ORDER BY stock ASC"
    );
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error obteniendo productos con bajo stock" });
  }
};

const getProductById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      "SELECT * FROM products WHERE id = $1 AND active = true",
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Producto no encontrado" });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error obteniendo producto" });
  }
};

const createProduct = async (req, res) => {
  try {
    const { name, price, stock, itbis } = req.body;
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
      "INSERT INTO products (name, price, stock, itbis, active) VALUES ($1, $2, $3, $4, true) RETURNING *",
      [name, price, stock, itbisValue]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error creando producto" });
  }
};

const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, price, stock, itbis } = req.body;
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
      "UPDATE products SET name = $1, price = $2, stock = $3, itbis = $4 WHERE id = $5 AND active = true RETURNING *",
      [name, price, stock, itbisValue, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Producto no encontrado" });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error actualizando producto" });
  }
};

const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar si tiene ventas
    const salesCheck = await pool.query(
      "SELECT COUNT(*) FROM sale_items WHERE product_id = $1",
      [id]
    );

    if (parseInt(salesCheck.rows[0].count) > 0) {
      // Tiene ventas — desactivar en vez de eliminar
      await pool.query(
        "UPDATE products SET active = false WHERE id = $1",
        [id]
      );
      return res.json({
        message: "Producto desactivado correctamente (tenía ventas registradas)",
      });
    }

    // No tiene ventas — eliminar permanentemente
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
    console.error(error);
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