const pool = require("../config/db");
const bcrypt = require("bcrypt");
const logger = require("../config/logger");

const getUsers = async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, name, email, role, created_at FROM users ORDER BY created_at DESC"
    );
    res.json(result.rows);
  } catch (error) {
    logger.error(error);
    res.status(500).json({ message: "Error obteniendo usuarios" });
  }
};

const getUserById = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      "SELECT id, name, email, role, created_at FROM users WHERE id = $1",
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }
    res.json(result.rows[0]);
  } catch (error) {
    logger.error(error);
    res.status(500).json({ message: "Error obteniendo usuario" });
  }
};

const updateUser = async (req, res) => {
  const { id } = req.params;
  const { name, email, role, password } = req.body;
  try {
    let query, params;
    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      query = "UPDATE users SET name = $1, email = $2, role = $3, password = $4 WHERE id = $5 RETURNING id, name, email, role, created_at";
      params = [name, email, role, hashedPassword, id];
    } else {
      query = "UPDATE users SET name = $1, email = $2, role = $3 WHERE id = $4 RETURNING id, name, email, role, created_at";
      params = [name, email, role, id];
    }
    const result = await pool.query(query, params);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }
    res.json({ message: "Usuario actualizado", user: result.rows[0] });
  } catch (error) {
    logger.error(error);
    if (error.code === "23505") {
      return res.status(400).json({ message: "El correo ya está registrado" });
    }
    res.status(500).json({ message: "Error actualizando usuario" });
  }
};

const deleteUser = async (req, res) => {
  const { id } = req.params;
  try {
    const saleCheck = await pool.query("SELECT COUNT(*) FROM sales WHERE user_id = $1", [id]);
    const purchaseCheck = await pool.query("SELECT COUNT(*) FROM purchases WHERE user_id = $1", [id]);
    const total = parseInt(saleCheck.rows[0].count) + parseInt(purchaseCheck.rows[0].count);
    if (total > 0) {
      return res.status(400).json({
        message: `No se puede eliminar: el usuario tiene ${total} registro(s) de ventas o compras`
      });
    }
    const result = await pool.query("DELETE FROM users WHERE id = $1 RETURNING id", [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }
    res.json({ message: "Usuario eliminado correctamente" });
  } catch (error) {
    logger.error(error);
    res.status(500).json({ message: "Error eliminando usuario" });
  }
};

module.exports = { getUsers, getUserById, updateUser, deleteUser };
