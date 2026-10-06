const { pool } = require('../config/db');

exports.getAllAlerts = async (req, res) => {
  try {
    const [alerts] = await pool.query(`
      SELECT 
        'low_stock' as type,
        i.id,
        i.product_id,
        i.branch_id,
        i.quantity,
        p.name as product_name,
        p.category,
        p.min_stock_level as min_stock,
        b.name as branch_name
      FROM inventory i
      JOIN products p ON i.product_id = p.id
      JOIN branches b ON i.branch_id = b.id
      WHERE i.quantity < p.min_stock_level
      
      UNION ALL
      
      SELECT 
        'overstock' as type,
        i.id,
        i.product_id,
        i.branch_id,
        i.quantity,
        p.name as product_name,
        p.category,
        p.reorder_point as max_stock,
        b.name as branch_name
      FROM inventory i
      JOIN products p ON i.product_id = p.id
      JOIN branches b ON i.branch_id = b.id
      WHERE i.quantity > p.reorder_point
      
      ORDER BY type, product_name
    `);
    
    res.json(alerts);
  } catch (error) {
    console.error('Get alerts error:', error);
    res.status(500).json({ error: 'Failed to get alerts' });
  }
};

exports.getLowStockAlerts = async (req, res) => {
  try {
    const [alerts] = await pool.query(`
      SELECT 
        i.id,
        i.product_id,
        i.branch_id,
        i.quantity,
        p.name as product_name,
        p.category,
        p.min_stock_level as min_stock,
        b.name as branch_name,
        (p.min_stock_level - i.quantity) as deficit
      FROM inventory i
      JOIN products p ON i.product_id = p.id
      JOIN branches b ON i.branch_id = b.id
      WHERE i.quantity < p.min_stock_level
      ORDER BY deficit DESC
    `);
    
    res.json(alerts);
  } catch (error) {
    console.error('Get low stock alerts error:', error);
    res.status(500).json({ error: 'Failed to get low stock alerts' });
  }
};

exports.getOverstockAlerts = async (req, res) => {
  try {
    const [alerts] = await pool.query(`
      SELECT 
        i.id,
        i.product_id,
        i.branch_id,
        i.quantity,
        p.name as product_name,
        p.category,
        p.reorder_point as max_stock,
        b.name as branch_name,
        (i.quantity - p.reorder_point) as excess
      FROM inventory i
      JOIN products p ON i.product_id = p.id
      JOIN branches b ON i.branch_id = b.id
      WHERE i.quantity > p.reorder_point
      ORDER BY excess DESC
    `);
    
    res.json(alerts);
  } catch (error) {
    console.error('Get overstock alerts error:', error);
    res.status(500).json({ error: 'Failed to get overstock alerts' });
  }
};

exports.getExpiryAlerts = async (req, res) => {
  try {
    const [alerts] = await pool.query(`
      SELECT 
        p.id as product_id,
        p.name as product_name,
        p.category,
        p.expiry_date,
        DATEDIFF(p.expiry_date, CURDATE()) as days_until_expiry
      FROM products p
      WHERE p.expiry_date IS NOT NULL 
        AND p.expiry_date <= DATE_ADD(CURDATE(), INTERVAL 30 DAY)
      ORDER BY p.expiry_date ASC
    `);
    
    res.json(alerts);
  } catch (error) {
    console.error('Get expiry alerts error:', error);
    res.status(500).json({ error: 'Failed to get expiry alerts' });
  }
};

exports.getAlertSummary = async (req, res) => {
  try {
    const [lowStock] = await pool.query(`
      SELECT COUNT(*) as count FROM inventory i
      JOIN products p ON i.product_id = p.id
      WHERE i.quantity < p.min_stock_level
    `);
    
    const [overstock] = await pool.query(`
      SELECT COUNT(*) as count FROM inventory i
      JOIN products p ON i.product_id = p.id
      WHERE i.quantity > p.reorder_point
    `);
    
    res.json({
      low_stock: lowStock[0].count,
      overstock: overstock[0].count,
      expiry: 0,
      total: lowStock[0].count + overstock[0].count
    });
  } catch (error) {
    console.error('Get alert summary error:', error);
    res.status(500).json({ error: 'Failed to get alert summary' });
  }
};