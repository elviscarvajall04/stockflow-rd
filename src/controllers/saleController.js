const pool = require("../config/db");
const { generateNCF } = require("../services/ncfService");

const createSale = async (req, res) => {
  const client = await pool.connect();

  try {
    const {
      user_id,
      items,
      payment_method,
      payment_method_id,
      client_id,
    } = req.body;

    if (!user_id) {
      return res.status(400).json({ message: "El usuario es obligatorio" });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "La venta debe tener productos" });
    }

    await client.query("BEGIN");

    let subtotal = 0;
    let itbisTotal = 0;
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
        "SELECT * FROM products WHERE id = $1 AND active = true",
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
      const itbisRate = Number(product.itbis || 18.00);
      const itemSubtotal = price * quantity;
      const itemItbis = itemSubtotal * (itbisRate / 100);

      subtotal += itemSubtotal;
      itbisTotal += itemItbis;

      saleItems.push({
        product_id,
        quantity,
        price,
        itbis_rate: itbisRate,
        subtotal: itemSubtotal,
        itbis: itemItbis,
      });

      await client.query(
        "UPDATE products SET stock = stock - $1 WHERE id = $2",
        [quantity, product_id]
      );
    }

    const total = subtotal + itbisTotal;

    // Obtener payment_method_id si no viene
    let pmId = payment_method_id || null;
    if (!pmId && payment_method) {
      const pm = await client.query(
        "SELECT id FROM payment_methods WHERE name = $1",
        [payment_method]
      );
      if (pm.rows.length > 0) pmId = pm.rows[0].id;
    }

    // Generar NCF
    const company = await client.query(
      "SELECT rnc, company_name FROM company_settings LIMIT 1"
    );
    const companyRow = company.rows[0] || { rnc: "", company_name: "" };
    const ncfType = "B02";
    const ncf = await generateNCF(client, ncfType);

    const saleResult = await client.query(
      `
      INSERT INTO sales
      (user_id, client_id, total, subtotal, itbis_total, ncf, ncf_type,
       payment_method, payment_method_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
      `,
      [
        user_id,
        client_id || null,
        total,
        subtotal,
        itbisTotal,
        ncf,
        ncfType,
        payment_method || "efectivo",
        pmId,
      ]
    );

    const sale = saleResult.rows[0];

    for (const item of saleItems) {
      await client.query(
        `
        INSERT INTO sale_items
        (sale_id, product_id, quantity, price)
        VALUES ($1, $2, $3, $4)
        `,
        [sale.id, item.product_id, item.quantity, item.price]
      );
    }

    await client.query("COMMIT");

    res.status(201).json({
      message: "Venta registrada correctamente",
      sale: {
        ...sale,
        company_name: companyRow.company_name,
        rnc: companyRow.rnc,
      },
      items: saleItems,
      fiscal: {
        ncf,
        ncf_type: ncfType,
        rnc: companyRow.rnc,
        company_name: companyRow.company_name,
        subtotal,
        itbis: itbisTotal,
        total,
      },
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
        s.subtotal,
        s.itbis_total,
        s.ncf,
        s.ncf_type,
        s.created_at,
        s.payment_method,
        u.name AS user_name,
        c.name AS client_name,
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
      LEFT JOIN clients c ON s.client_id = c.id
      LEFT JOIN sale_items si ON s.id = si.sale_id
      LEFT JOIN products p ON si.product_id = p.id
      GROUP BY s.id, u.name, c.name
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
        s.subtotal,
        s.itbis_total,
        s.ncf,
        s.ncf_type,
        s.payment_method,
        s.created_at,
        u.name AS user_name,
        c.name AS client_name,
        COALESCE(
          json_agg(
            json_build_object(
              'product_id', p.id,
              'product_name', p.name,
              'quantity', si.quantity,
              'price', si.price,
              'subtotal', si.quantity * si.price,
              'itbis_rate', p.itbis
            )
          ) FILTER (WHERE si.id IS NOT NULL),
          '[]'
        ) AS items
      FROM sales s
      JOIN users u ON s.user_id = u.id
      LEFT JOIN clients c ON s.client_id = c.id
      LEFT JOIN sale_items si ON s.id = si.sale_id
      LEFT JOIN products p ON si.product_id = p.id
      WHERE s.id = $1
      GROUP BY s.id, u.name, c.name
      `,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Venta no encontrada" });
    }

    // Adjuntar datos de la empresa
    const company = await pool.query(
      "SELECT * FROM company_settings LIMIT 1"
    );

    res.json({
      ...result.rows[0],
      company: company.rows[0] || null,
    });

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