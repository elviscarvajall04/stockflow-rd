const pool = require("../config/db");

const getCategories = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT c.*, COUNT(p.id) AS product_count
      FROM categories c
      LEFT JOIN products p ON p.category_id = c.id
      GROUP BY c.id
      ORDER BY c.name ASC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error obteniendo categorías" });
  }
};

const createCategory = async (req, res) => {
  const { name } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ message: "El nombre es obligatorio" });
  }
  try {
    const result = await pool.query(
      "INSERT INTO categories (name) VALUES ($1) RETURNING *",
      [name.trim()]
    );
    res.status(201).json({ message: "Categoría creada", category: result.rows[0] });
  } catch (error) {
    if (error.code === "23505") {
      return res.status(400).json({ message: "Ya existe una categoría con ese nombre" });
    }
    console.error(error);
    res.status(500).json({ message: "Error creando categoría" });
  }
};

const updateCategory = async (req, res) => {
  const { id } = req.params;
  const { name } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ message: "El nombre es obligatorio" });
  }
  try {
    const result = await pool.query(
      "UPDATE categories SET name = $1 WHERE id = $2 RETURNING *",
      [name.trim(), id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Categoría no encontrada" });
    }
    res.json({ message: "Categoría actualizada", category: result.rows[0] });
  } catch (error) {
    if (error.code === "23505") {
      return res.status(400).json({ message: "Ya existe una categoría con ese nombre" });
    }
    console.error(error);
    res.status(500).json({ message: "Error actualizando categoría" });
  }
};

const deleteCategory = async (req, res) => {
  const { id } = req.params;
  try {
    const check = await pool.query("SELECT COUNT(*) FROM products WHERE category_id = $1", [id]);
    if (parseInt(check.rows[0].count) > 0) {
      return res.status(400).json({
        message: `No se puede eliminar: ${check.rows[0].count} producto(s) tienen esta categoría`
      });
    }
    const result = await pool.query("DELETE FROM categories WHERE id = $1 RETURNING *", [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Categoría no encontrada" });
    }
    res.json({ message: "Categoría eliminada" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error eliminando categoría" });
  }
};

module.exports = { getCategories, createCategory, updateCategory, deleteCategory };
