const { pool } = require('../config/db');

const initializeDatabase = async () => {
  // The database already has existing tables with schemas
  // We just need to ensure our application tables exist
  
  // Check if users table has role column
  try {
    await pool.query('SELECT role FROM users LIMIT 1');
    console.log('Users table already has role column');
  } catch (e) {
    // Add role column if it doesn't exist
    try {
      await pool.query('ALTER TABLE users ADD COLUMN role ENUM("admin", "manager", "staff") DEFAULT "staff" AFTER password');
      console.log('Added role column to users');
    } catch (err) {
      // Column might already exist
    }
  }

  // Check if branches has is_active column
  try {
    await pool.query('SELECT is_active FROM branches LIMIT 1');
    console.log('Branches table already has is_active column');
  } catch (e) {
    try {
      await pool.query('ALTER TABLE branches ADD COLUMN is_active TINYINT(1) DEFAULT 1 AFTER is_warehouse');
      console.log('Added is_active column to branches');
    } catch (err) {
      // Column might already exist
    }
  }

  // Check if inventory has reserved_quantity column
  try {
    await pool.query('SELECT reserved_quantity FROM inventory LIMIT 1');
    console.log('Inventory table already has reserved_quantity column');
  } catch (e) {
    try {
      await pool.query('ALTER TABLE inventory ADD COLUMN reserved_quantity INT DEFAULT 0 AFTER quantity');
      console.log('Added reserved_quantity column to inventory');
    } catch (err) {
      // Column might already exist
    }
  }

  // Create stock_transfers table if it doesn't exist
  const createStockTransfersTable = `
    CREATE TABLE IF NOT EXISTS stock_transfers (
      id INT PRIMARY KEY AUTO_INCREMENT,
      transfer_no VARCHAR(50) UNIQUE NOT NULL,
      product_id INT NOT NULL,
      from_branch_id INT NOT NULL,
      to_branch_id INT NOT NULL,
      quantity INT NOT NULL,
      status ENUM('pending', 'approved', 'in_transit', 'delivered', 'cancelled') DEFAULT 'pending',
      requested_by INT,
      approved_by INT,
      requested_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      approved_at DATETIME,
      in_transit_at DATETIME,
      delivered_at DATETIME,
      notes TEXT,
      FOREIGN KEY (product_id) REFERENCES products(id),
      FOREIGN KEY (from_branch_id) REFERENCES branches(id),
      FOREIGN KEY (to_branch_id) REFERENCES branches(id),
      FOREIGN KEY (requested_by) REFERENCES users(id),
      FOREIGN KEY (approved_by) REFERENCES users(id),
      INDEX idx_product (product_id),
      INDEX idx_from_branch (from_branch_id),
      INDEX idx_to_branch (to_branch_id),
      INDEX idx_status (status)
    )
  `;

  // Create delivery_confirmations table
  const createDeliveryConfirmationsTable = `
    CREATE TABLE IF NOT EXISTS delivery_confirmations (
      id INT PRIMARY KEY AUTO_INCREMENT,
      transfer_id INT NOT NULL,
      received_by INT NOT NULL,
      received_quantity INT NOT NULL,
      confirmed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      notes TEXT,
      FOREIGN KEY (transfer_id) REFERENCES stock_transfers(id) ON DELETE CASCADE,
      FOREIGN KEY (received_by) REFERENCES users(id),
      INDEX idx_transfer (transfer_id)
    )
  `;

  try {
    await pool.query(createStockTransfersTable);
    await pool.query(createDeliveryConfirmationsTable);
    console.log('Transfer tables verified');
  } catch (e) {
    console.log('Transfer tables might already exist:', e.message);
  }

  console.log('Database schema verified successfully');
};

module.exports = { initializeDatabase };