const pool = require("../config/db");
const logger = require("../config/logger");

async function recordMovement(client, productId, type, quantity, referenceType, referenceId, unitCost = 0, notes = "") {
  const stockResult = await client.query(
    "SELECT stock FROM products WHERE id = $1",
    [productId]
  );
  const balanceAfter = Number(stockResult.rows[0].stock);

  await client.query(
    `INSERT INTO inventory_movements
     (product_id, type, quantity, balance_after, unit_cost, reference_type, reference_id, notes)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [productId, type, quantity, balanceAfter, unitCost, referenceType, referenceId, notes]
  );
}

const getMovements = async (req, res) => {
  try {
    const { product_id, from, to, limit: qLimit } = req.query;
    let sql = `
      SELECT
        m.id, m.type, m.quantity, m.balance_after, m.unit_cost,
        m.reference_type, m.reference_id, m.notes, m.created_at,
        p.name AS product_name
      FROM inventory_movements m
      JOIN products p ON m.product_id = p.id
      WHERE 1=1
    `;
    const params = [];
    let idx = 1;

    if (product_id) {
      sql += ` AND m.product_id = $${idx++}`;
      params.push(product_id);
    }
    if (from) {
      sql += ` AND m.created_at >= $${idx++}`;
      params.push(from);
    }
    if (to) {
      sql += ` AND m.created_at <= $${idx++}`;
      params.push(to + " 23:59:59");
    }

    sql += " ORDER BY m.created_at DESC";

    if (qLimit) {
      sql += ` LIMIT $${idx++}`;
      params.push(Number(qLimit));
    }

    const result = await pool.query(sql, params);
    res.json(result.rows);
  } catch (error) {
    logger.error(error);
    res.status(500).json({ message: "Error obteniendo movimientos" });
  }
};

const getInventoryValue = async (req, res) => {
  try {
    // Get current stock value using average cost from purchase_items
    const result = await pool.query(`
      SELECT
        COUNT(*) AS total_products,
        COALESCE(SUM(p.stock * COALESCE(avg_cost.avg_cost, 0)), 0) AS total_value
      FROM products p
      LEFT JOIN (
        SELECT product_id,
          CASE
            WHEN SUM(quantity) > 0 THEN SUM(quantity * cost_price) / SUM(quantity)
            ELSE 0
          END AS avg_cost
        FROM purchase_items
        GROUP BY product_id
      ) avg_cost ON p.id = avg_cost.product_id
      WHERE p.active = true
    `);

    const lowStock = await pool.query(
      "SELECT COUNT(*) FROM products WHERE stock <= 5 AND active = true"
    );

    res.json({
      total_products: Number(result.rows[0].total_products),
      total_value: Number(result.rows[0].total_value),
      low_stock: Number(lowStock.rows[0].count),
    });
  } catch (error) {
    logger.error(error);
    res.status(500).json({ message: "Error obteniendo valor del inventario" });
  }
};

module.exports = { recordMovement, getMovements, getInventoryValue };
