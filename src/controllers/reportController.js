const pool = require("../config/db");

const getDashboardReport = async (req, res) => {
  try {
    const totalProductsResult = await pool.query(
      "SELECT COUNT(*) FROM products"
    );

    const totalSalesResult = await pool.query(
      "SELECT COUNT(*) FROM sales"
    );

    const totalRevenueResult = await pool.query(
      "SELECT COALESCE(SUM(total), 0) AS total_revenue FROM sales"
    );

    const lowStockResult = await pool.query(
      "SELECT COUNT(*) FROM products WHERE stock <= 5"
    );

    const recentSalesResult = await pool.query(`
      SELECT 
        s.id,
        s.total,
        s.created_at,
        u.name AS user_name
      FROM sales s
      JOIN users u ON s.user_id = u.id
      ORDER BY s.created_at DESC
      LIMIT 5
    `);

    res.json({
      total_products: Number(totalProductsResult.rows[0].count),
      total_sales: Number(totalSalesResult.rows[0].count),
      total_revenue: Number(totalRevenueResult.rows[0].total_revenue),
      low_stock_products: Number(lowStockResult.rows[0].count),
      recent_sales: recentSalesResult.rows,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error obteniendo reporte del dashboard" });
  }
};

module.exports = {
  getDashboardReport,
};