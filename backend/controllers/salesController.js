const { pool } = require('../config/db');

exports.getSales = async (req, res) => {
  try {
    const { start_date, end_date, product_id, branch_id, limit = 100 } = req.query;
    
    let query = `
      SELECT s.*, p.name as product_name, p.category, b.name as branch_name
      FROM sales s
      JOIN products p ON s.product_id = p.id
      JOIN branches b ON s.branch_id = b.id
      WHERE 1=1
    `;
    
    const params = [];
    
    if (start_date) {
      query += ' AND s.sale_date >= ?';
      params.push(start_date);
    }
    
    if (end_date) {
      query += ' AND s.sale_date <= ?';
      params.push(end_date);
    }
    
    if (product_id) {
      query += ' AND s.product_id = ?';
      params.push(product_id);
    }
    
    if (branch_id) {
      query += ' AND s.branch_id = ?';
      params.push(branch_id);
    }
    
    query += ' ORDER BY s.sale_date DESC, s.id DESC LIMIT ?';
    params.push(parseInt(limit));
    
    const [sales] = await pool.query(query, params);
    res.json(sales);
  } catch (error) {
    console.error('Get sales error:', error);
    res.status(500).json({ error: 'Failed to get sales' });
  }
};

exports.getSalesByProductBranch = async (req, res) => {
  try {
    const { productId, branchId } = req.params;
    const { days = 30 } = req.query;
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));
    
    const [sales] = await pool.query(`
      SELECT date, SUM(quantity_sold) as quantity_sold
      FROM sales
      WHERE product_id = ? AND branch_id = ? AND date >= ?
      GROUP BY date
      ORDER BY date ASC
    `, [productId, branchId, startDate.toISOString().split('T')[0]]);
    
    res.json(sales);
  } catch (error) {
    console.error('Get sales by product/branch error:', error);
    res.status(500).json({ error: 'Failed to get sales' });
  }
};

exports.createSale = async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();
    
    const { product_id, branch_id, date, quantity } = req.body;

    if (!product_id || !branch_id || !date || !quantity) {
      return res.status(400).json({ error: 'All fields required' });
    }

    if (quantity <= 0) {
      return res.status(400).json({ error: 'Quantity must be positive' });
    }

    // Check inventory availability
    const [inventory] = await connection.query(
      'SELECT quantity FROM inventory WHERE product_id = ? AND branch_id = ?',
      [product_id, branch_id]
    );

    if (inventory.length === 0 || inventory[0].quantity < quantity) {
      return res.status(400).json({ error: 'Insufficient inventory' });
    }

    // Create sale record
    const [result] = await connection.query(
      'INSERT INTO sales (product_id, branch_id, sale_date, quantity) VALUES (?, ?, ?, ?)',
      [product_id, branch_id, date, quantity]
    );

    // Deduct from inventory
    await connection.query(
      'UPDATE inventory SET quantity = quantity - ?, last_updated = NOW() WHERE product_id = ? AND branch_id = ?',
      [quantity, product_id, branch_id]
    );

    await connection.commit();

    const [newSale] = await pool.query(`
      SELECT s.*, p.name as product_name, b.name as branch_name
      FROM sales s
      JOIN products p ON s.product_id = p.id
      JOIN branches b ON s.branch_id = b.id
      WHERE s.id = ?
    `, [result.insertId]);

    res.status(201).json(newSale[0]);
  } catch (error) {
    await connection.rollback();
    console.error('Create sale error:', error);
    res.status(500).json({ error: 'Failed to record sale' });
  } finally {
    connection.release();
  }
};

exports.getSalesHistory = async (req, res) => {
  try {
    const { limit = 50 } = req.query;
    
    const [sales] = await pool.query(`
      SELECT s.id, s.product_id, s.branch_id, s.sale_date as date, s.quantity as quantity_sold, s.created_at,
             p.name as product_name, b.name as branch_name
      FROM sales s
      JOIN products p ON s.product_id = p.id
      JOIN branches b ON s.branch_id = b.id
      ORDER BY s.created_at DESC
      LIMIT ?
    `, [parseInt(limit)]);
    
    res.json(sales);
  } catch (error) {
    console.error('Get sales history error:', error);
    res.status(500).json({ error: 'Failed to get sales history' });
  }
};

exports.getDailySales = async (req, res) => {
  try {
    const { date } = req.query;
    const targetDate = date || new Date().toISOString().split('T')[0];
    
    const [sales] = await pool.query(`
      SELECT 
        s.id,
        s.product_id,
        s.branch_id,
        s.sale_date as date,
        s.quantity as quantity_sold,
        s.created_at,
        p.name as product_name, 
        p.category,
        b.name as branch_name
      FROM sales s
      JOIN products p ON s.product_id = p.id
      JOIN branches b ON s.branch_id = b.id
      WHERE s.sale_date = ?
      ORDER BY s.created_at DESC
    `, [targetDate]);
    
    const totalQuantity = sales.reduce((sum, s) => sum + s.quantity_sold, 0);
    const totalSales = sales.length;
    
    res.json({
      date: targetDate,
      sales,
      summary: {
        total_transactions: totalSales,
        total_quantity_sold: totalQuantity
      }
    });
  } catch (error) {
    console.error('Get daily sales error:', error);
    res.status(500).json({ error: 'Failed to get daily sales' });
  }
};

exports.getSalesTrend = async (req, res) => {
  try {
    const { days = 7 } = req.query;
    
    const [trend] = await pool.query(`
      SELECT 
        sale_date as date,
        SUM(quantity) as total_sold
      FROM sales
      WHERE sale_date >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
      GROUP BY sale_date
      ORDER BY sale_date ASC
    `, [parseInt(days)]);
    
    res.json(trend);
  } catch (error) {
    console.error('Get sales trend error:', error);
    res.status(500).json({ error: 'Failed to get sales trend' });
  }
};

exports.getTopProducts = async (req, res) => {
  try {
    const { days = 7, limit = 10 } = req.query;
    
    const [products] = await pool.query(`
      SELECT 
        p.id,
        p.name,
        p.category,
        SUM(s.quantity) as total_sold,
        COUNT(DISTINCT s.branch_id) as branch_count
      FROM sales s
      JOIN products p ON s.product_id = p.id
      WHERE s.sale_date >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
      GROUP BY p.id
      ORDER BY total_sold DESC
      LIMIT ?
    `, [parseInt(days), parseInt(limit)]);
    
    res.json(products);
  } catch (error) {
    console.error('Get top products error:', error);
    res.status(500).json({ error: 'Failed to get top products' });
  }
};