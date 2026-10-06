const { pool } = require('../config/db');

exports.getAllInventory = async (req, res) => {
  try {
    const { branch_id, product_id, low_stock, overstock } = req.query;
    const user = req.user;

    let query = `
      SELECT i.*, p.name as product_name, p.category, p.min_stock_level as min_stock, p.reorder_point as max_stock, b.name as branch_name
      FROM inventory i
      JOIN products p ON i.product_id = p.id
      JOIN branches b ON i.branch_id = b.id
      WHERE 1=1
    `;

    const params = [];

    // Staff can only see their own branch inventory
    if (user && user.role === 'staff') {
      query += ' AND i.branch_id = ?';
      params.push(user.branch_id);
    } else if (branch_id) {
      // Admin/Manager can filter by branch if specified
      query += ' AND i.branch_id = ?';
      params.push(branch_id);
    }
    
    if (product_id) {
      query += ' AND i.product_id = ?';
      params.push(product_id);
    }
    
    if (low_stock === 'true') {
      query += ' AND i.quantity < p.min_stock_level';
    }
    
    query += ' ORDER BY p.name, b.name';
    
    const [inventory] = await pool.query(query, params);
    res.json(inventory);
  } catch (error) {
    console.error('Get inventory error:', error);
    res.status(500).json({ error: 'Failed to get inventory' });
  }
};

exports.getInventoryByBranch = async (req, res) => {
  try {
    const { branchId } = req.params;
    const [inventory] = await pool.query(`
      SELECT i.*, p.name as product_name, p.category, p.min_stock_level as min_stock, p.reorder_point as max_stock
      FROM inventory i
      JOIN products p ON i.product_id = p.id
      WHERE i.branch_id = ?
      ORDER BY p.name
    `, [branchId]);
    res.json(inventory);
  } catch (error) {
    console.error('Get inventory by branch error:', error);
    res.status(500).json({ error: 'Failed to get inventory' });
  }
};

exports.createOrUpdateInventory = async (req, res) => {
  try {
    const { product_id, branch_id, quantity } = req.body;

    if (!product_id || !branch_id || quantity === undefined) {
      return res.status(400).json({ error: 'Product ID, branch ID, and quantity required' });
    }

    const [existing] = await pool.query(
      'SELECT * FROM inventory WHERE product_id = ? AND branch_id = ?',
      [product_id, branch_id]
    );

    if (existing.length > 0) {
      await pool.query(
        'UPDATE inventory SET quantity = quantity + ?, last_updated = NOW() WHERE product_id = ? AND branch_id = ?',
        [quantity, product_id, branch_id]
      );
    } else {
      await pool.query(
        'INSERT INTO inventory (product_id, branch_id, quantity) VALUES (?, ?, ?)',
        [product_id, branch_id, quantity]
      );
    }

    const [updated] = await pool.query(`
      SELECT i.*, p.name as product_name, p.category
      FROM inventory i
      JOIN products p ON i.product_id = p.id
      WHERE i.product_id = ? AND i.branch_id = ?
    `, [product_id, branch_id]);

    res.json(updated[0]);
  } catch (error) {
    console.error('Update inventory error:', error);
    res.status(500).json({ error: 'Failed to update inventory' });
  }
};

exports.setInventoryQuantity = async (req, res) => {
  try {
    const { id } = req.params;
    const { quantity } = req.body;

    if (quantity === undefined) {
      return res.status(400).json({ error: 'Quantity required' });
    }

    const [existing] = await pool.query(
      'SELECT * FROM inventory WHERE id = ?',
      [id]
    );

    if (existing.length === 0) {
      return res.status(404).json({ error: 'Inventory not found' });
    }

    await pool.query(
      'UPDATE inventory SET quantity = ?, last_updated = NOW() WHERE id = ?',
      [quantity, id]
    );

    const [updated] = await pool.query(`
      SELECT i.*, p.name as product_name, p.category, b.name as branch_name
      FROM inventory i
      JOIN products p ON i.product_id = p.id
      JOIN branches b ON i.branch_id = b.id
      WHERE i.id = ?
    `, [id]);

    res.json(updated[0]);
  } catch (error) {
    console.error('Set inventory error:', error);
    res.status(500).json({ error: 'Failed to set inventory' });
  }
};

exports.transferStock = async (req, res) => {
  try {
    const { from_branch_id, to_branch_id, product_id, quantity } = req.body;

    if (!from_branch_id || !to_branch_id || !product_id || !quantity) {
      return res.status(400).json({ error: 'All fields required' });
    }

    if (from_branch_id === to_branch_id) {
      return res.status(400).json({ error: 'Source and destination must be different' });
    }

    const [sourceInventory] = await pool.query(
      'SELECT * FROM inventory WHERE product_id = ? AND branch_id = ?',
      [product_id, from_branch_id]
    );

    if (sourceInventory.length === 0 || sourceInventory[0].quantity < quantity) {
      return res.status(400).json({ error: 'Insufficient stock in source branch' });
    }

    await pool.query(
      'UPDATE inventory SET quantity = quantity - ?, last_updated = NOW() WHERE product_id = ? AND branch_id = ?',
      [quantity, product_id, from_branch_id]
    );

    const [destInventory] = await pool.query(
      'SELECT * FROM inventory WHERE product_id = ? AND branch_id = ?',
      [product_id, to_branch_id]
    );

    if (destInventory.length > 0) {
      await pool.query(
        'UPDATE inventory SET quantity = quantity + ?, last_updated = NOW() WHERE product_id = ? AND branch_id = ?',
        [quantity, product_id, to_branch_id]
      );
    } else {
      await pool.query(
        'INSERT INTO inventory (product_id, branch_id, quantity) VALUES (?, ?, ?)',
        [product_id, to_branch_id, quantity]
      );
    }

    res.json({ message: 'Stock transferred successfully' });
  } catch (error) {
    console.error('Transfer stock error:', error);
    res.status(500).json({ error: 'Failed to transfer stock' });
  }
};

exports.getInventorySummary = async (req, res) => {
  try {
    const user = req.user;
    let query, params = [];

    if (user.role === 'staff') {
      // Staff see only products in their branch
      query = `
        SELECT
          p.id as product_id,
          p.name as product_name,
          p.category,
          p.min_stock_level as min_stock,
          p.reorder_point as max_stock,
          COALESCE(i.quantity, 0) as total_stock,
          1 as branch_count
        FROM products p
        LEFT JOIN inventory i ON p.id = i.product_id AND i.branch_id = ?
        WHERE i.quantity IS NOT NULL OR p.id IN (SELECT product_id FROM inventory WHERE branch_id = ?)
        ORDER BY p.name
      `;
      params = [user.branch_id, user.branch_id];
    } else {
      // Admin/Manager see all products with totals across branches
      query = `
        SELECT
          p.id as product_id,
          p.name as product_name,
          p.category,
          p.min_stock_level as min_stock,
          p.reorder_point as max_stock,
          COALESCE(SUM(i.quantity), 0) as total_stock,
          COUNT(i.branch_id) as branch_count
        FROM products p
        LEFT JOIN inventory i ON p.id = i.product_id
        GROUP BY p.id
        ORDER BY p.name
      `;
    }

    const [summary] = await pool.query(query, params);
    res.json(summary);
  } catch (error) {
    console.error('Get inventory summary error:', error);
    res.status(500).json({ error: 'Failed to get inventory summary' });
  }
};