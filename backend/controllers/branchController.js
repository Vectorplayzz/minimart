const { pool } = require('../config/db');

exports.getAllBranches = async (req, res) => {
  try {
    const [branches] = await pool.query(`
      SELECT b.*,
        (SELECT COUNT(*) FROM inventory WHERE branch_id = b.id) as product_count,
        (SELECT SUM(quantity) FROM inventory WHERE branch_id = b.id) as total_stock
      FROM branches b
      WHERE b.is_active = 1
      ORDER BY b.type DESC, b.name
    `);
    res.json(branches);
  } catch (error) {
    console.error('Get branches error:', error);
    res.status(500).json({ error: 'Failed to get branches' });
  }
};

exports.getBranchById = async (req, res) => {
  try {
    const { id } = req.params;
    const [branches] = await pool.query(
      'SELECT * FROM branches WHERE id = ? AND is_active = 1',
      [id]
    );

    if (branches.length === 0) {
      return res.status(404).json({ error: 'Branch not found' });
    }

    res.json(branches[0]);
  } catch (error) {
    console.error('Get branch error:', error);
    res.status(500).json({ error: 'Failed to get branch' });
  }
};

exports.createBranch = async (req, res) => {
  try {
    const { name, code, location, address, type } = req.body;

    if (!name || !code) {
      return res.status(400).json({ error: 'Name and code required' });
    }

    const [result] = await pool.query(
      'INSERT INTO branches (name, code, location, address, type, is_active) VALUES (?, ?, ?, ?, ?, ?)',
      [name, code, location || null, address || null, type || 'store', 1]
    );

    const [newBranch] = await pool.query(
      'SELECT * FROM branches WHERE id = ?',
      [result.insertId]
    );

    res.status(201).json(newBranch[0]);
  } catch (error) {
    console.error('Create branch error:', error);
    res.status(500).json({ error: 'Failed to create branch' });
  }
};

exports.updateBranch = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, code, location, address, is_warehouse, is_active } = req.body;

    const [existing] = await pool.query(
      'SELECT * FROM branches WHERE id = ?',
      [id]
    );

    if (existing.length === 0) {
      return res.status(404).json({ error: 'Branch not found' });
    }

    const type = is_warehouse !== undefined ? (is_warehouse ? 'warehouse' : 'store') : existing[0].type;

    const updateFields = [];
    const params = [];
    
    if (name !== undefined) { updateFields.push('name = ?'); params.push(name); }
    if (code !== undefined) { updateFields.push('code = ?'); params.push(code); }
    if (location !== undefined) { updateFields.push('location = ?'); params.push(location); }
    if (address !== undefined) { updateFields.push('address = ?'); params.push(address); }
    updateFields.push('type = ?');
    params.push(type);
    if (is_active !== undefined) { updateFields.push('is_active = ?'); params.push(is_active); }
    
    params.push(id);
    
    await pool.query(
      `UPDATE branches SET ${updateFields.join(', ')} WHERE id = ?`,
      params
    );

    const [updated] = await pool.query(
      'SELECT * FROM branches WHERE id = ?',
      [id]
    );

    res.json(updated[0]);
  } catch (error) {
    console.error('Update branch error:', error.message, error.stack);
    res.status(500).json({ error: 'Failed to update branch' });
  }
};

exports.deleteBranch = async (req, res) => {
  try {
    const { id } = req.params;

    const [inventory] = await pool.query(
      'SELECT COUNT(*) as count FROM inventory WHERE branch_id = ?',
      [id]
    );

    if (inventory[0].count > 0) {
      return res.status(400).json({ error: 'Cannot delete branch with inventory' });
    }

    const [existing] = await pool.query(
      'SELECT * FROM branches WHERE id = ?',
      [id]
    );

    if (existing.length === 0) {
      return res.status(404).json({ error: 'Branch not found' });
    }

    await pool.query('UPDATE branches SET is_active = 0 WHERE id = ?', [id]);

    res.json({ message: 'Branch deleted successfully' });
  } catch (error) {
    console.error('Delete branch error:', error);
    res.status(500).json({ error: 'Failed to delete branch' });
  }
};

exports.getBranchInventory = async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user;

    // Staff can only access their own branch inventory
    if (user && user.role === 'staff' && parseInt(id) !== user.branch_id) {
      return res.status(403).json({ error: 'Access denied: Can only view own branch inventory' });
    }

    const [inventory] = await pool.query(`
      SELECT i.*, p.name as product_name, p.category, p.min_stock_level as min_stock, p.reorder_point as max_stock
      FROM inventory i
      JOIN products p ON i.product_id = p.id
      WHERE i.branch_id = ?
      ORDER BY p.name
    `, [id]);
    res.json(inventory);
  } catch (error) {
    console.error('Get branch inventory error:', error);
    res.status(500).json({ error: 'Failed to get branch inventory' });
  }
};