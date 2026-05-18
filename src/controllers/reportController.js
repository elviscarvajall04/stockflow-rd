const pool = require("../config/db");

const getDashboardReport = async (req, res) => {
  try {
    const totalProductsResult = await pool.query(
      "SELECT COUNT(*) FROM products WHERE active = true"
    );

    const totalSalesResult = await pool.query(
      "SELECT COUNT(*) FROM sales WHERE canceled = false"
    );

    const totalRevenueResult = await pool.query(
      "SELECT COALESCE(SUM(total), 0) AS total_revenue FROM sales WHERE canceled = false"
    );

    const itbisCollectedResult = await pool.query(
      "SELECT COALESCE(SUM(itbis_total), 0) AS total_itbis FROM sales WHERE canceled = false"
    );

    const lowStockResult = await pool.query(
      "SELECT COUNT(*) FROM products WHERE stock <= 5 AND active = true"
    );

    const recentSalesResult = await pool.query(`
      SELECT
        s.id,
        s.total,
        s.subtotal,
        s.itbis_total,
        s.ncf,
        s.canceled,
        s.created_at,
        u.name AS user_name,
        COALESCE(
          json_agg(
            json_build_object(
              'product_name', p.name,
              'quantity', si.quantity
            )
          ) FILTER (WHERE si.id IS NOT NULL),
          '[]'
        ) AS items
      FROM sales s
      JOIN users u ON s.user_id = u.id
      LEFT JOIN sale_items si ON s.id = si.sale_id
      LEFT JOIN products p ON si.product_id = p.id
      WHERE s.canceled = false
      GROUP BY s.id, u.name
      ORDER BY s.created_at DESC
      LIMIT 5
    `);

    res.json({
      total_products: Number(totalProductsResult.rows[0].count),
      total_sales: Number(totalSalesResult.rows[0].count),
      total_revenue: Number(totalRevenueResult.rows[0].total_revenue),
      total_itbis: Number(itbisCollectedResult.rows[0].total_itbis),
      low_stock_products: Number(lowStockResult.rows[0].count),
      recent_sales: recentSalesResult.rows,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error obteniendo reporte del dashboard" });
  }
};

const getDgiiReport = async (req, res) => {
  try {
    const month = parseInt(req.query.month) || (new Date().getMonth() + 1);
    const year = parseInt(req.query.year) || new Date().getFullYear();

    // Ventas del período (no canceladas)
    const salesResult = await pool.query(`
      SELECT
        COUNT(*) AS total_facturas,
        COALESCE(SUM(subtotal), 0) AS total_subtotal,
        COALESCE(SUM(itbis_total), 0) AS total_itbis,
        COALESCE(SUM(total), 0) AS total_ventas
      FROM sales
      WHERE canceled = false
        AND EXTRACT(MONTH FROM created_at) = $1
        AND EXTRACT(YEAR FROM created_at) = $2
    `, [month, year]);

    // Compras del período (ITBIS real según el producto)
    const purchasesResult = await pool.query(`
      SELECT
        COUNT(DISTINCT pu.id) AS total_compras,
        COALESCE(SUM(pi.quantity * pi.cost_price), 0) AS total_compras_valor,
        ROUND(COALESCE(SUM(CASE WHEN pi.applies_itbis THEN pi.quantity * pi.cost_price * COALESCE(p.itbis, 0) / 100 ELSE 0 END), 0), 2) AS total_itbis
      FROM purchases pu
      JOIN purchase_items pi ON pu.id = pi.purchase_id
      JOIN products p ON pi.product_id = p.id
      WHERE EXTRACT(MONTH FROM pu.created_at) = $1
        AND EXTRACT(YEAR FROM pu.created_at) = $2
    `, [month, year]);

    // NCF emitidos en el período
    const ncfResult = await pool.query(`
      SELECT ncf, ncf_type, total, created_at
      FROM sales
      WHERE ncf IS NOT NULL AND ncf != ''
        AND canceled = false
        AND EXTRACT(MONTH FROM created_at) = $1
        AND EXTRACT(YEAR FROM created_at) = $2
      ORDER BY created_at ASC
    `, [month, year]);

    // NCF rangos
    const ncfSequences = await pool.query(`
      SELECT type, prefix, current_number FROM ncf_sequences WHERE is_active = true
    `);

    const sales = salesResult.rows[0];
    const purchases = purchasesResult.rows[0];

    const comprasItbis = Number(purchases.total_itbis);
    const itbisAPagar = Math.round((Number(sales.total_itbis) - comprasItbis) * 100) / 100;

    res.json({
      periodo: { mes: month, year },
      ventas: {
        cantidad: Number(sales.total_facturas),
        subtotal: Number(sales.total_subtotal),
        itbis: Number(sales.total_itbis),
        total: Number(sales.total_ventas),
      },
      compras: {
        cantidad: Number(purchases.total_compras),
        total: Number(purchases.total_compras_valor),
        itbis: comprasItbis,
      },
      itbis_a_pagar: itbisAPagar,
      ncf_emitidos: ncfResult.rows,
      ncf_secuencias: ncfSequences.rows,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error generando reporte DGII" });
  }
};

const getProfitReport = async (req, res) => {
  try {
    const { from, to } = req.query;
    const fromDate = from || "1970-01-01";
    const toDate = to || "2999-12-31";

    // Ingresos por producto
    const revenueResult = await pool.query(`
      SELECT
        si.product_id,
        p.name AS product_name,
        SUM(si.quantity) AS units_sold,
        SUM(si.price * si.quantity) AS revenue
      FROM sales s
      JOIN sale_items si ON s.id = si.sale_id
      JOIN products p ON si.product_id = p.id
      WHERE s.canceled = false
        AND s.created_at::date >= $1
        AND s.created_at::date <= $2
      GROUP BY si.product_id, p.name
    `, [fromDate, toDate]);

    // Costo promedio por producto (de compras)
    const costResult = await pool.query(`
      SELECT
        product_id,
        AVG(cost_price) AS avg_cost
      FROM purchase_items
      GROUP BY product_id
    `);

    const costMap = {};
    for (const row of costResult.rows) {
      costMap[row.product_id] = Number(row.avg_cost);
    }

    // Ventas por día (para la gráfica)
    const dailyResult = await pool.query(`
      SELECT
        s.created_at::date AS date,
        SUM(si.price * si.quantity) AS revenue,
        COALESCE(SUM(si.quantity * ac.avg_cost), 0) AS cost
      FROM sales s
      JOIN sale_items si ON s.id = si.sale_id
      LEFT JOIN (
        SELECT product_id, AVG(cost_price) AS avg_cost
        FROM purchase_items
        GROUP BY product_id
      ) ac ON si.product_id = ac.product_id
      WHERE s.canceled = false
        AND s.created_at::date >= $1
        AND s.created_at::date <= $2
      GROUP BY s.created_at::date
      ORDER BY s.created_at::date ASC
    `, [fromDate, toDate]);

    // Armar detalle por producto
    let totalRevenue = 0;
    let totalCost = 0;
    const products = revenueResult.rows.map((r) => {
      const revenue = Number(r.revenue);
      const unitsSold = Number(r.units_sold);
      const avgCost = costMap[r.product_id] || 0;
      const cost = avgCost * unitsSold;
      const profit = revenue - cost;
      const margin = revenue > 0 ? (profit / revenue) * 100 : 0;

      totalRevenue += revenue;
      totalCost += cost;

      return {
        product_id: r.product_id,
        product_name: r.product_name,
        units_sold: unitsSold,
        revenue,
        avg_cost: Math.round(avgCost * 100) / 100,
        cost: Math.round(cost * 100) / 100,
        profit: Math.round(profit * 100) / 100,
        margin: Math.round(margin * 100) / 100,
      };
    });

    // Ordenar por ganancia descendente
    products.sort((a, b) => b.profit - a.profit);

    const daily = dailyResult.rows.map((d) => ({
      date: d.date,
      revenue: Number(d.revenue),
      cost: Number(d.cost),
      profit: Number(d.revenue) - Number(d.cost),
    }));

    res.json({
      summary: {
        total_revenue: Math.round(totalRevenue * 100) / 100,
        total_cost: Math.round(totalCost * 100) / 100,
        total_profit: Math.round((totalRevenue - totalCost) * 100) / 100,
        total_margin: totalRevenue > 0
          ? Math.round(((totalRevenue - totalCost) / totalRevenue) * 100 * 100) / 100
          : 0,
        total_products: products.length,
        total_units_sold: products.reduce((s, p) => s + p.units_sold, 0),
      },
      products,
      daily,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error generando reporte de ganancias" });
  }
};

module.exports = {
  getDashboardReport,
  getDgiiReport,
  getProfitReport,
};