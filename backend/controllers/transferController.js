const { pool } = require('../config/db');

const generateTransferNo = () => {
  const date = new Date();
  const prefix = 'TRF';
  const timestamp = date.toISOString().slice(0,10).replace(/-/g,'') + date.getTime().toString().slice(-6);
  return `${prefix}-${timestamp}`;
};

exports.getAllTransfers = async (req, res) => {
  try {
    const { status, from_branch, to_branch } = req.query;
    
    let query = `
      SELECT st.*, 
        p.name as product_name, p.category,
        fb.name as from_branch_name,
        tb.name as to_branch_name,
        u1.username as requested_by_name,
        u2.username as approved_by_name
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
    
    if (from_branch) {
      query += ' AND st.from_branch_id = ?';
      params.push(from_branch);
    }
    
    if (to_branch) {
      query += ' AND st.to_branch_id = ?';
      params.push(to_branch);
    }
    
    query += ' ORDER BY st.requested_at DESC';
    
    const [transfers] = await pool.query(query, params);
    res.json(transfers);
  } catch (error) {
    console.error('Get transfers error:', error);
    res.status(500).json({ error: 'Failed to get transfers' });
  }
};

exports.getTransferById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const [transfers] = await pool.query(`
      SELECT st.*, 
        p.name as product_name, p.category, p.sku,
        fb.name as from_branch_name,
        tb.name as to_branch_name,
        u1.username as requested_by_name,
        u2.username as approved_by_name
      FROM stock_transfers st
      JOIN products p ON st.product_id = p.id
      JOIN branches fb ON st.from_branch_id = fb.id
      JOIN branches tb ON st.to_branch_id = tb.id
      LEFT JOIN users u1 ON st.requested_by = u1.id
      LEFT JOIN users u2 ON st.approved_by = u2.id
      WHERE st.id = ?
    `, [id]);
    
    if (transfers.length === 0) {
      return res.status(404).json({ error: 'Transfer not found' });
    }
    
    // Get delivery confirmation if exists
    const [confirmation] = await pool.query(`
      SELECT dc.*, u.username as received_by_name
      FROM delivery_confirmations dc
      JOIN users u ON dc.received_by = u.id
      WHERE dc.transfer_id = ?
    `, [id]);
    
    res.json({ ...transfers[0], confirmation: confirmation[0] || null });
  } catch (error) {
    console.error('Get transfer error:', error);
    res.status(500).json({ error: 'Failed to get transfer' });
  }
};

exports.createTransfer = async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();
    
    const { product_id, from_branch_id, to_branch_id, quantity, notes } = req.body;
    const userId = req.user.id;
    
    if (!product_id || !from_branch_id || !to_branch_id || !quantity) {
      return res.status(400).json({ error: 'All fields required' });
    }
    
    if (from_branch_id === to_branch_id) {
      return res.status(400).json({ error: 'Source and destination must be different' });
    }
    
    // Check source inventory
    const [sourceInv] = await connection.query(
      'SELECT * FROM inventory WHERE product_id = ? AND branch_id = ?',
      [product_id, from_branch_id]
    );
    
    if (sourceInv.length === 0) {
      return res.status(400).json({ error: 'No inventory at source branch' });
    }
    
    const available = sourceInv[0].quantity - sourceInv[0].reserved_quantity;
    if (available < quantity) {
      return res.status(400).json({ error: `Insufficient available stock. Available: ${available}` });
    }
    
    // Create transfer record
    const transferNo = generateTransferNo();
    const [result] = await connection.query(
      `INSERT INTO stock_transfers 
        (transfer_no, product_id, from_branch_id, to_branch_id, quantity, requested_by, notes) 
        VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [transferNo, product_id, from_branch_id, to_branch_id, quantity, userId, notes || null]
    );
    
    await connection.commit();
    
    const [newTransfer] = await pool.query(
      'SELECT * FROM stock_transfers WHERE id = ?',
      [result.insertId]
    );
    
    res.status(201).json(newTransfer[0]);
  } catch (error) {
    await connection.rollback();
    console.error('Create transfer error:', error);
    res.status(500).json({ error: 'Failed to create transfer' });
  } finally {
    connection.release();
  }
};

exports.approveTransfer = async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();
    
    const { id } = req.params;
    const userId = req.user.id;
    
    // Get transfer
    const [transfers] = await connection.query(
      'SELECT * FROM stock_transfers WHERE id = ?',
      [id]
    );
    
    if (transfers.length === 0) {
      return res.status(404).json({ error: 'Transfer not found' });
    }
    
    const transfer = transfers[0];
    
    if (transfer.status !== 'pending') {
      return res.status(400).json({ error: 'Transfer is not in pending status' });
    }
    
    // Reserve stock at source
    await connection.query(
      `UPDATE inventory 
        SET reserved_quantity = reserved_quantity + ? 
        WHERE product_id = ? AND branch_id = ?`,
      [transfer.quantity, transfer.product_id, transfer.from_branch_id]
    );
    
    // Update transfer status
    await connection.query(
      `UPDATE stock_transfers 
        SET status = 'approved', approved_by = ?, approved_at = NOW() 
        WHERE id = ?`,
      [userId, id]
    );
    
    await connection.commit();
    
    const [updated] = await pool.query(
      'SELECT * FROM stock_transfers WHERE id = ?',
      [id]
    );
    
    res.json(updated[0]);
  } catch (error) {
    await connection.rollback();
    console.error('Approve transfer error:', error);
    res.status(500).json({ error: 'Failed to approve transfer' });
  } finally {
    connection.release();
  }
};

exports.markInTransit = async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();
    
    const { id } = req.params;
    
    // Get transfer
    const [transfers] = await connection.query(
      'SELECT * FROM stock_transfers WHERE id = ?',
      [id]
    );
    
    if (transfers.length === 0) {
      return res.status(404).json({ error: 'Transfer not found' });
    }
    
    const transfer = transfers[0];
    
    if (transfer.status !== 'approved') {
      return res.status(400).json({ error: 'Transfer must be approved first' });
    }
    
    // Deduct reserved quantity and available quantity from source
    await connection.query(
      `UPDATE inventory 
        SET quantity = quantity - ?, reserved_quantity = reserved_quantity - ? 
        WHERE product_id = ? AND branch_id = ?`,
      [transfer.quantity, transfer.quantity, transfer.product_id, transfer.from_branch_id]
    );
    
    // Update transfer status
    await connection.query(
      `UPDATE stock_transfers SET status = 'in_transit', in_transit_at = NOW() WHERE id = ?`,
      [id]
    );
    
    await connection.commit();
    
    const [updated] = await pool.query(
      'SELECT * FROM stock_transfers WHERE id = ?',
      [id]
    );
    
    res.json(updated[0]);
  } catch (error) {
    await connection.rollback();
    console.error('Mark in transit error:', error);
    res.status(500).json({ error: 'Failed to mark as in transit' });
  } finally {
    connection.release();
  }
};

exports.deliverTransfer = async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();
    
    const { id } = req.params;
    const { received_quantity, notes } = req.body;
    const userId = req.user.id;
    
    if (!received_quantity) {
      return res.status(400).json({ error: 'Received quantity is required' });
    }
    
    // Get transfer
    const [transfers] = await connection.query(
      'SELECT * FROM stock_transfers WHERE id = ?',
      [id]
    );
    
    if (transfers.length === 0) {
      return res.status(404).json({ error: 'Transfer not found' });
    }
    
    const transfer = transfers[0];
    
    if (transfer.status !== 'in_transit') {
      return res.status(400).json({ error: 'Transfer must be in transit' });
    }
    
    // Add stock to destination branch
    const [destInv] = await connection.query(
      'SELECT * FROM inventory WHERE product_id = ? AND branch_id = ?',
      [transfer.product_id, transfer.to_branch_id]
    );
    
    if (destInv.length > 0) {
      await connection.query(
        'UPDATE inventory SET quantity = quantity + ? WHERE product_id = ? AND branch_id = ?',
        [received_quantity, transfer.product_id, transfer.to_branch_id]
      );
    } else {
      await connection.query(
        'INSERT INTO inventory (product_id, branch_id, quantity) VALUES (?, ?, ?)',
        [transfer.product_id, transfer.to_branch_id, received_quantity]
      );
    }
    
    // Create delivery confirmation
    await connection.query(
      `INSERT INTO delivery_confirmations (transfer_id, received_by, received_quantity, notes) 
        VALUES (?, ?, ?, ?)`,
      [id, userId, received_quantity, notes || null]
    );
    
    // Update transfer status
    await connection.query(
      `UPDATE stock_transfers SET status = 'delivered', delivered_at = NOW() WHERE id = ?`,
      [id]
    );
    
    await connection.commit();
    
    const [updated] = await pool.query(
      'SELECT * FROM stock_transfers WHERE id = ?',
      [id]
    );
    
    res.json(updated[0]);
  } catch (error) {
    await connection.rollback();
    console.error('Deliver transfer error:', error);
    res.status(500).json({ error: 'Failed to deliver transfer' });
  } finally {
    connection.release();
  }
};

exports.cancelTransfer = async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();
    
    const { id } = req.params;
    
    // Get transfer
    const [transfers] = await connection.query(
      'SELECT * FROM stock_transfers WHERE id = ?',
      [id]
    );
    
    if (transfers.length === 0) {
      return res.status(404).json({ error: 'Transfer not found' });
    }
    
    const transfer = transfers[0];
    
    if (transfer.status === 'delivered' || transfer.status === 'cancelled') {
      return res.status(400).json({ error: 'Cannot cancel this transfer' });
    }
    
    // If approved, release reserved quantity
    if (transfer.status === 'approved') {
      await connection.query(
        `UPDATE inventory 
          SET reserved_quantity = reserved_quantity - ? 
          WHERE product_id = ? AND branch_id = ?`,
        [transfer.quantity, transfer.product_id, transfer.from_branch_id]
      );
    }
    
    // Cancel transfer
    await connection.query(
      'UPDATE stock_transfers SET status = ? WHERE id = ?',
      ['cancelled', id]
    );
    
    await connection.commit();
    
    const [updated] = await pool.query(
      'SELECT * FROM stock_transfers WHERE id = ?',
      [id]
    );
    
    res.json(updated[0]);
  } catch (error) {
    await connection.rollback();
    console.error('Cancel transfer error:', error);
    res.status(500).json({ error: 'Failed to cancel transfer' });
  } finally {
    connection.release();
  }
};

exports.getTransferStats = async (req, res) => {
  try {
    const [stats] = await pool.query(`
      SELECT 
        status,
        COUNT(*) as count,
        SUM(quantity) as total_quantity
      FROM stock_transfers
      GROUP BY status
    `);
    
    res.json(stats);
  } catch (error) {
    console.error('Get transfer stats error:', error);
    res.status(500).json({ error: 'Failed to get transfer stats' });
  }
};