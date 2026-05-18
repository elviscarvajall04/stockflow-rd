const pool = require("../config/db");
const { recordMovement } = require("./inventoryController");
const { paginate, paginatedResponse } = require("../config/paginate");
const logger = require("../config/logger");

const createPurchase = async (req, res) => {
  const client = await pool.connect();
  try {
    const { supplier_id, items, ncf, notes } = req.body;
    const user_id = req.user.id;

    if (!supplier_id) {
      return res.status(400).json({ message: "El proveedor es obligatorio" });
    }
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "La compra debe tener productos" });
    }

    await client.query("BEGIN");

    let total = 0;
    const purchaseItems = [];

    for (const item of items) {
      let { product_id, new_product_name, new_sale_price, quantity, cost_price, applies_itbis } = item;

      if (!quantity || quantity <= 0 || !cost_price || cost_price <= 0) {
        await client.query("ROLLBACK");
        return res.status(400).json({
          message: "Cada producto debe tener quantity y cost_price mayor a 0",
        });
      }

      // Crear producto nuevo sobre la marcha
      if (!product_id) {
        if (!new_product_name || !new_sale_price) {
          await client.query("ROLLBACK");
          return res.status(400).json({
            message: "Para crear un producto nuevo necesitas nombre y precio de venta",
          });
        }
        const itbisRate = applies_itbis !== false ? 18.00 : 0;
        const newProduct = await client.query(
          `INSERT INTO products (name, price, stock, itbis, active)
           VALUES ($1, $2, 0, $3, true) RETURNING id`,
          [new_product_name, Number(new_sale_price), itbisRate]
        );
        product_id = newProduct.rows[0].id;
      } else {
        const productCheck = await client.query(
          "SELECT id, name FROM products WHERE id = $1", [product_id]
        );
        if (productCheck.rows.length === 0) {
          await client.query("ROLLBACK");
          return res.status(404).json({ message: `Producto id ${product_id} no encontrado` });
        }
      }

      const itemTotal = Number(cost_price) * Number(quantity);
      total += itemTotal;

      purchaseItems.push({ product_id, quantity, cost_price: Number(cost_price), applies_itbis: applies_itbis !== false });

      // Incrementar stock
      await client.query(
        "UPDATE products SET stock = stock + $1 WHERE id = $2",
        [quantity, product_id]
      );
    }

    const purchaseResult = await client.query(
      `INSERT INTO purchases (supplier_id, user_id, total, ncf, notes)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [supplier_id, user_id, total, ncf || "", notes || ""]
    );

    const purchase = purchaseResult.rows[0];

    for (const item of purchaseItems) {
      await client.query(
        `INSERT INTO purchase_items (purchase_id, product_id, quantity, cost_price, applies_itbis)
         VALUES ($1, $2, $3, $4, $5)`,
        [purchase.id, item.product_id, item.quantity, item.cost_price, item.applies_itbis]
      );
      await recordMovement(client, item.product_id, "entry", item.quantity, "purchase", purchase.id, item.cost_price);
    }

    await client.query("COMMIT");

    res.status(201).json({
      message: "Compra registrada correctamente. Stock actualizado.",
      purchase,
      items: purchaseItems,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    logger.error(error);
    res.status(500).json({ message: "Error registrando compra" });
  } finally {
    client.release();
  }
};

const getPurchases = async (req, res) => {
  try {
    const { page, limit, offset, hasPage } = paginate(req);
    const countResult = await pool.query("SELECT COUNT(*) FROM purchases");
    const result = await pool.query(`
      SELECT
        pu.id AS purchase_id,
        pu.total,
        pu.ncf,
        pu.notes,
        pu.created_at,
        s.name AS supplier_name,
        u.name AS user_name,
        COALESCE(
          json_agg(
            json_build_object(
              'product_id', p.id,
              'product_name', p.name,
              'quantity', pi.quantity,
              'cost_price', pi.cost_price,
              'applies_itbis', pi.applies_itbis
            )
          ) FILTER (WHERE pi.id IS NOT NULL),
          '[]'
        ) AS items
      FROM purchases pu
      JOIN suppliers s ON pu.supplier_id = s.id
      JOIN users u ON pu.user_id = u.id
      LEFT JOIN purchase_items pi ON pu.id = pi.purchase_id
      LEFT JOIN products p ON pi.product_id = p.id
      GROUP BY pu.id, s.name, u.name
      ORDER BY pu.id DESC
      LIMIT $1 OFFSET $2
    `, [limit, offset]);
    res.json(paginatedResponse(result.rows, countResult.rows[0].count, page, limit, hasPage));
  } catch (error) {
    logger.error(error);
    res.status(500).json({ message: "Error obteniendo compras" });
  }
};

const getPurchaseById = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(`
      SELECT
        pu.id AS purchase_id,
        pu.total,
        pu.ncf,
        pu.notes,
        pu.created_at,
        s.name AS supplier_name,
        s.rnc AS supplier_rnc,
        u.name AS user_name,
        COALESCE(
          json_agg(
            json_build_object(
              'product_id', p.id,
              'product_name', p.name,
              'quantity', pi.quantity,
              'cost_price', pi.cost_price,
              'subtotal', pi.quantity * pi.cost_price,
              'applies_itbis', pi.applies_itbis
            )
          ) FILTER (WHERE pi.id IS NOT NULL),
          '[]'
        ) AS items
      FROM purchases pu
      JOIN suppliers s ON pu.supplier_id = s.id
      JOIN users u ON pu.user_id = u.id
      LEFT JOIN purchase_items pi ON pu.id = pi.purchase_id
      LEFT JOIN products p ON pi.product_id = p.id
      WHERE pu.id = $1
      GROUP BY pu.id, s.name, s.rnc, u.name
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Compra no encontrada" });
    }
    res.json(result.rows[0]);
  } catch (error) {
    logger.error(error);
    res.status(500).json({ message: "Error obteniendo compra" });
  }
};

const deletePurchase = async (req, res) => {
  const { id } = req.params;
  const client = await pool.connect();
  try {
    const check = await client.query("SELECT * FROM purchases WHERE id = $1", [id]);
    if (check.rows.length === 0) {
      return res.status(404).json({ message: "Compra no encontrada" });
    }

    await client.query("BEGIN");

    // Devolver stock (decrementar)
    const items = await client.query(
      "SELECT product_id, quantity FROM purchase_items WHERE purchase_id = $1",
      [id]
    );
    for (const item of items.rows) {
      await client.query(
        "UPDATE products SET stock = stock - $1 WHERE id = $2",
        [item.quantity, item.product_id]
      );
      await recordMovement(client, item.product_id, "exit", item.quantity, "purchase_delete", Number(id), 0, "Eliminación de compra");
    }

    await client.query("DELETE FROM purchase_items WHERE purchase_id = $1", [id]);
    await client.query("DELETE FROM purchases WHERE id = $1", [id]);

    await client.query("COMMIT");
    res.json({ message: "Compra eliminada y stock revertido" });
  } catch (error) {
    await client.query("ROLLBACK");
    logger.error(error);
    res.status(500).json({ message: "Error eliminando compra" });
  } finally {
    client.release();
  }
};

const updatePurchase = async (req, res) => {
  const { id } = req.params;
  const { supplier_id, ncf, notes } = req.body;
  try {
    const result = await pool.query(
      `UPDATE purchases
       SET supplier_id = COALESCE($1, supplier_id),
           ncf = COALESCE($2, ncf),
           notes = COALESCE($3, notes)
       WHERE id = $4
       RETURNING *`,
      [supplier_id || null, ncf, notes, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Compra no encontrada" });
    }
    res.json({ message: "Compra actualizada", purchase: result.rows[0] });
  } catch (error) {
    logger.error(error);
    res.status(500).json({ message: "Error actualizando compra" });
  }
};

module.exports = { createPurchase, getPurchases, getPurchaseById, updatePurchase, deletePurchase };
