const pool = require("../config/db");
// Obtener todos los clientes
const getClients = async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM clients ORDER BY created_at DESC"
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ message: "Error obteniendo clientes" });
  }
};

// Obtener un cliente por ID con su historial de compras
const getClientById = async (req, res) => {
  const { id } = req.params;

  try {
    console.log("CLIENT ID:", id);

    const client = await pool.query(
      "SELECT * FROM clients WHERE id = $1",
      [id]
    );

    console.log("CLIENT RESULT:", client.rows);

    if (client.rows.length === 0) {
      return res.status(404).json({
        message: "Cliente no encontrado",
      });
    }

    const sales = await pool.query(
      `SELECT s.id, s.total, s.created_at, u.name as user_name
       FROM sales s
       LEFT JOIN users u ON s.user_id = u.id
       WHERE s.client_id = $1
       ORDER BY s.created_at DESC`,
      [id]
    );

    res.json({
      ...client.rows[0],
      sales: sales.rows,
      total_spent: sales.rows.reduce(
        (sum, s) => sum + Number(s.total),
        0
      ),
    });
  } catch (error) {
    console.error("GET CLIENT ERROR:", error);

    res.status(500).json({
      message: "Error obteniendo cliente",
      error: error.message,
    });
  }
};

// Crear cliente
const createClient = async (req, res) => {
  const { name, email, phone, address } = req.body;
  if (!name) {
    return res.status(400).json({ message: "El nombre es obligatorio" });
  }
  try {
    const result = await pool.query(
      "INSERT INTO clients (name, email, phone, address) VALUES ($1, $2, $3, $4) RETURNING *",
      [name, email, phone, address]
    );
    res.status(201).json({
      message: "Cliente creado correctamente",
      client: result.rows[0],
    });
  } catch (error) {
console.error("CREATE CLIENT ERROR:", error);


    res.status(500).json({ 
    
        message: "Error creando cliente", error: error.message,
     });
  }
};

// Actualizar cliente
const updateClient = async (req, res) => {
  const { id } = req.params;
  const { name, email, phone, address } = req.body;
  try {
    const result = await pool.query(
      "UPDATE clients SET name=$1, email=$2, phone=$3, address=$4 WHERE id=$5 RETURNING *",
      [name, email, phone, address, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Cliente no encontrado" });
    }
    res.json({ message: "Cliente actualizado", client: result.rows[0] });
  } catch (error) {
    res.status(500).json({ message: "Error actualizando cliente" });
  }
};

// Eliminar cliente
const deleteClient = async (req, res) => {
  const { id } = req.params;
  try {
    const salesCheck = await pool.query(
      "SELECT COUNT(*) FROM sales WHERE client_id = $1",
      [id]
    );

    if (parseInt(salesCheck.rows[0].count) > 0) {
      return res.status(400).json({
        message: "No se puede eliminar el cliente porque tiene ventas registradas. Puedes desactivarlo o editar sus datos en lugar de eliminarlo.",
      });
    }

    await pool.query("DELETE FROM clients WHERE id = $1", [id]);
    res.json({ message: "Cliente eliminado correctamente" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error eliminando cliente" });
  }
};

module.exports = {
  getClients,
  getClientById,
  createClient,
  updateClient,
  deleteClient,
};