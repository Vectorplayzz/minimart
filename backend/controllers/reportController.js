const { pool } = require('../config/db');

const convertToCSV = (data, headers) => {
  const headerRow = headers.join(',');
  const rows = data.map(item => 
    headers.map(h => {
      const value = item[h];
      if (value === null || value === undefined) return '';
      if (typeof value === 'string' && value.includes(',')) return `"${value}"`;
      return value;
    }).join(',')
  );
  return [headerRow, ...rows].join('\n');
};

exports.getInventoryReport = async (req, res) => {
  try {
    const { branch_id } = req.query;
    
    let query = `
      SELECT 
        p.id as product_id,
        p.name as product_name,
        p.category,
        p.sku,
        b.id as branch_id,
        b.name as branch_name,
        i.quantity,
        i.reserved_quantity,
        (i.quantity - i.reserved_quantity) as available_quantity,
        p.min_stock_level as min_stock,
        p.reorder_point as max_stock,
        CASE 
          WHEN i.quantity < p.min_stock_level THEN 'Low Stock'
          WHEN i.quantity > p.reorder_point THEN 'Overstock'
          ELSE 'Normal'
        END as stock_status
      FROM inventory i
      JOIN products p ON i.product_id = p.id
      JOIN branches b ON i.branch_id = b.id
      WHERE b.is_active = TRUE
    `;
    
    const params = [];
    if (branch_id) {
      query += ' AND b.id = ?';
      params.push(branch_id);
    }
    
    query += ' ORDER BY b.name, p.name';
    
    const [report] = await pool.query(query, params);
    
    const format = req.query.format;
    if (format === 'csv') {
      const csv = convertToCSV(report, ['product_name', 'category', 'sku', 'branch_name', 'quantity', 'reserved_quantity', 'available_quantity', 'min_stock', 'max_stock', 'stock_status']);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=inventory_report.csv');
      return res.send(csv);
    }
    
    res.json(report);
  } catch (error) {
    console.error('Inventory report error:', error);
    res.status(500).json({ error: 'Failed to get inventory report' });
  }
};

exports.getLowStockReport = async (req, res) => {
  try {
    const { branch_id } = req.query;
    
    let query = `
      SELECT 
        p.id as product_id,
        p.name as product_name,
        p.category,
        p.sku,
        b.id as branch_id,
        b.name as branch_name,
        i.quantity,
        i.reserved_quantity,
        p.min_stock_level as min_stock,
        (p.min_stock_level - i.quantity) as deficit
      FROM inventory i
      JOIN products p ON i.product_id = p.id
      JOIN branches b ON i.branch_id = b.id
      WHERE i.quantity < p.min_stock_level AND b.is_active = TRUE
    `;
    
    const params = [];
    if (branch_id) {
      query += ' AND b.id = ?';
      params.push(branch_id);
    }
    
    query += ' ORDER BY deficit DESC';
    
    const [report] = await pool.query(query, params);
    
    const format = req.query.format;
    if (format === 'csv') {
      const csv = convertToCSV(report, ['product_name', 'category', 'sku', 'branch_name', 'quantity', 'min_stock', 'deficit']);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=low_stock_report.csv');
      return res.send(csv);
    }
    
    res.json(report);
  } catch (error) {
    console.error('Low stock report error:', error);
    res.status(500).json({ error: 'Failed to get low stock report' });
  }
};

exports.getExpiryReport = async (req, res) => {
  try {
    const { days = 30 } = req.query;
    
    const [report] = await pool.query(`
      SELECT 
        p.id as product_id,
        p.name as product_name,
        p.category,
        p.sku,
        p.expiry_date,
        DATEDIFF(p.expiry_date, CURDATE()) as days_until_expiry,
        (SELECT SUM(quantity) FROM inventory WHERE product_id = p.id) as total_stock
      FROM products p
      WHERE p.expiry_date IS NOT NULL 
        AND p.expiry_date <= DATE_ADD(CURDATE(), INTERVAL ? DAY)
        AND p.expiry_date >= CURDATE()
      ORDER BY p.expiry_date ASC
    `, [parseInt(days)]);
    
    const format = req.query.format;
    if (format === 'csv') {
      const csv = convertToCSV(report, ['product_name', 'category', 'sku', 'expiry_date', 'days_until_expiry', 'total_stock']);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=expiry_report.csv');
      return res.send(csv);
    }
    
    res.json(report);
  } catch (error) {
    console.error('Expiry report error:', error);
    res.status(500).json({ error: 'Failed to get expiry report' });
  }
};

exports.getTransferReport = async (req, res) => {
  try {
    const { status, start_date, end_date } = req.query;
    
    let query = `
      SELECT 
        st.transfer_no,
        p.name as product_name,
        p.category,
        fb.name as from_branch,
        tb.name as to_branch,
        st.quantity,
        st.status,
        st.requested_at,
        st.approved_at,
        st.in_transit_at,
        st.delivered_at,
        u1.username as requested_by,
        u2.username as approved_by
      FROM stock_transfers st
      JOIN products p ON st.product_id = p.id
      JOIN branches fb ON st.from_branch_id = fb.id
      JOIN branches tb ON st.to_branch_id = tb.id
      LEFT JOIN users u1 ON st.requested_by = u1.id
      LEFT JOIN users u2 ON st.approved_by = u2.id
      WHERE 1=1
    `;
    
    const params = [];
    
    if (status) {
      query += ' AND st.status = ?';
      params.push(status);
    }
    
    if (start_date) {
      query += ' AND st.requested_at >= ?';
      params.push(start_date);
    }
    
    if (end_date) {
      query += ' AND st.requested_at <= ?';
      params.push(end_date);
    }
    
    query += ' ORDER BY st.requested_at DESC';
    
    const [report] = await pool.query(query, params);
    
    const format = req.query.format;
    if (format === 'csv') {
      const csv = convertToCSV(report, ['transfer_no', 'product_name', 'category', 'from_branch', 'to_branch', 'quantity', 'status', 'requested_at', 'approved_at', 'delivered_at', 'requested_by', 'approved_by']);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=transfer_report.csv');
      return res.send(csv);
    }
    
    res.json(report);
  } catch (error) {
    console.error('Transfer report error:', error);
    res.status(500).json({ error: 'Failed to get transfer report' });
  }
};

exports.getSalesReport = async (req, res) => {
  try {
    const { branch_id, start_date, end_date, product_id } = req.query;
    
    let query = `
      SELECT 
        s.id,
        s.date as sale_date,
        p.name as product_name,
        p.category,
        b.name as branch_name,
        s.quantity_sold as quantity,
        s.created_at
      FROM sales s
      JOIN products p ON s.product_id = p.id
      JOIN branches b ON s.branch_id = b.id
      WHERE 1=1
    `;
    
    const params = [];
    
    if (branch_id) {
      query += ' AND s.branch_id = ?';
      params.push(branch_id);
    }
    
    if (product_id) {
      query += ' AND s.product_id = ?';
      params.push(product_id);
    }
    
    if (start_date) {
      query += ' AND s.date >= ?';
      params.push(start_date);
    }
    
    if (end_date) {
      query += ' AND s.date <= ?';
      params.push(end_date);
    }
    
    query += ' ORDER BY s.date DESC, s.id DESC';
    
    const [report] = await pool.query(query, params);
    
    // Calculate summary
    const summary = {
      total_transactions: report.length,
      total_quantity: report.reduce((sum, r) => sum + r.quantity, 0),
      unique_products: [...new Set(report.map(r => r.product_name))].length,
      unique_branches: [...new Set(report.map(r => r.branch_name))].length
    };
    
    const format = req.query.format;
    if (format === 'csv') {
      const csv = convertToCSV(report, ['date', 'product_name', 'category', 'branch_name', 'quantity', 'created_at']);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=sales_report.csv');
      return res.send(csv);
    }
    
    res.json({ report, summary });
  } catch (error) {
    console.error('Sales report error:', error);
    res.status(500).json({ error: 'Failed to get sales report' });
  }
};