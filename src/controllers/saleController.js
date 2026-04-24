const pool = require("../config/db");

const createSale = async (req, res) => {
  const client = await pool.connect();

  try {
    const { user_id, items } = req.body;

    if (!user_id) {
      return res.status(400).json({ message: "El usuario es obligatorio" });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "La venta debe tener productos" });
    }

    await client.query("BEGIN");

    let total = 0;
    const saleItems = [];

    for (const item of items) {
      const { product_id, quantity } = item;

      if (!product_id || !quantity || quantity <= 0) {
        await client.query("ROLLBACK");
        return res.status(400).json({
          message: "Cada producto debe tener product_id y quantity mayor a 0",
        });
      }

      const productResult = await client.query(
        "SELECT * FROM products WHERE id = $1",
        [product_id]
      );

      if (productResult.rows.length === 0) {
        await client.query("ROLLBACK");
        return res.status(404).json({
          message: `Producto con id ${product_id} no encontrado`,
        });
      }

      const product = productResult.rows[0];

      if (product.stock < quantity) {
        await client.query("ROLLBACK");
        return res.status(400).json({
          message: `Stock insuficiente para ${product.name}`,
        });
      }

      const price = Number(product.price);
      const subtotal = price * quantity;
      total += subtotal;

      saleItems.push({
        product_id,
        quantity,
        price,
      });

      await client.query(
        "UPDATE products SET stock = stock - $1 WHERE id = $2",
        [quantity, product_id]
      );
    }

    const saleResult = await client.query(
      "INSERT INTO sales (user_id, total) VALUES ($1, $2) RETURNING *",
      [user_id, total]
    );

    const sale = saleResult.rows[0];

    for (const item of saleItems) {
      await client.query(
        "INSERT INTO sale_items (sale_id, product_id, quantity, price) VALUES ($1, $2, $3, $4)",
        [sale.id, item.product_id, item.quantity, item.price]
      );
    }

    await client.query("COMMIT");

    res.status(201).json({
      message: "Venta registrada correctamente",
      sale,
      items: saleItems,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error(error);
    res.status(500).json({ message: "Error registrando venta" });
  } finally {
    client.release();
  }
};

const getSales = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        s.id AS sale_id,
        s.total,
        s.created_at,
        u.name AS user_name,
        COALESCE(
          json_agg(
            json_build_object(
              'product_id', p.id,
              'product_name', p.name,
              'quantity', si.quantity,
              'price', si.price
            )
          ) FILTER (WHERE si.id IS NOT NULL),
          '[]'
        ) AS items
      FROM sales s
      JOIN users u ON s.user_id = u.id
      LEFT JOIN sale_items si ON s.id = si.sale_id
      LEFT JOIN products p ON si.product_id = p.id
      GROUP BY s.id, u.name
      ORDER BY s.id DESC
    `);

    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error obteniendo ventas" });
  }
};

const getSaleById = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `
      SELECT 
        s.id AS sale_id,
        s.total,
        s.created_at,
        u.name AS user_name,
        COALESCE(
          json_agg(
            json_build_object(
              'product_id', p.id,
              'product_name', p.name,
              'quantity', si.quantity,
              'price', si.price,
              'subtotal', si.quantity * si.price
            )
          ) FILTER (WHERE si.id IS NOT NULL),
          '[]'
        ) AS items
      FROM sales s
      JOIN users u ON s.user_id = u.id
      LEFT JOIN sale_items si ON s.id = si.sale_id
      LEFT JOIN products p ON si.product_id = p.id
      WHERE s.id = $1
      GROUP BY s.id, u.name
      `,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Venta no encontrada" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error obteniendo venta" });
  }
};

module.exports = {
  createSale,
  getSales,
  getSaleById,
};