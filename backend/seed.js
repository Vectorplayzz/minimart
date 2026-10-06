const bcrypt = require('bcryptjs');
const { pool } = require('./config/db');

async function seedDatabase() {
  console.log('Starting database seeding...\n');
  
  try {
    // ============================================
    // CREATE TABLES WITH CORRECT COLUMN NAMES
    // ============================================
    
    // Drop and recreate tables for clean state
    await pool.query('SET FOREIGN_KEY_CHECKS = 0');
    await pool.query('DROP TABLE IF EXISTS user_sessions');
    await pool.query('DROP TABLE IF EXISTS transfer_request_items');
    await pool.query('DROP TABLE IF EXISTS transfer_requests');
    await pool.query('DROP TABLE IF EXISTS sales');
    await pool.query('DROP TABLE IF EXISTS inventory');
    await pool.query('DROP TABLE IF EXISTS users');
    await pool.query('DROP TABLE IF EXISTS products');
    await pool.query('DROP TABLE IF EXISTS branches');
    await pool.query('SET FOREIGN_KEY_CHECKS = 1');

    // Create branches table
    await pool.query(`
      CREATE TABLE branches (
        id INT PRIMARY KEY AUTO_INCREMENT,
        name VARCHAR(255) NOT NULL,
        code VARCHAR(50) NOT NULL UNIQUE,
        location TEXT NOT NULL,
        type ENUM('warehouse', 'store') DEFAULT 'store',
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✓ Branches table created');

    // Create products table
    await pool.query(`
      CREATE TABLE products (
        id INT PRIMARY KEY AUTO_INCREMENT,
        name VARCHAR(255) NOT NULL,
        category VARCHAR(100) NOT NULL,
        sku VARCHAR(50) UNIQUE NOT NULL,
        min_stock_level INT DEFAULT 10,
        reorder_point INT DEFAULT 20,
        price DECIMAL(10,2) DEFAULT 0,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✓ Products table created');

    // Create inventory table
    await pool.query(`
      CREATE TABLE inventory (
        id INT PRIMARY KEY AUTO_INCREMENT,
        product_id INT NOT NULL,
        branch_id INT NOT NULL,
        quantity INT DEFAULT 0,
        reserved_quantity INT DEFAULT 0,
        last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
        FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE,
        UNIQUE KEY unique_product_branch (product_id, branch_id)
      )
    `);
    console.log('✓ Inventory table created');

    // Create sales table
    await pool.query(`
      CREATE TABLE sales (
        id INT PRIMARY KEY AUTO_INCREMENT,
        product_id INT NOT NULL,
        branch_id INT NOT NULL,
        sale_date DATE NOT NULL,
        quantity INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
        FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE,
        INDEX idx_sale_date (sale_date),
        INDEX idx_product_branch (product_id, branch_id)
      )
    `);
    console.log('✓ Sales table created');

    // Create users table
    await pool.query(`
      CREATE TABLE users (
        id INT PRIMARY KEY AUTO_INCREMENT,
        username VARCHAR(100) NOT NULL UNIQUE,
        email VARCHAR(255) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        role ENUM('admin', 'manager', 'staff') DEFAULT 'staff',
        branch_id INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE SET NULL
      )
    `);
    console.log('✓ Users table created');

    // Create user_sessions table
    await pool.query(`
      CREATE TABLE user_sessions (
        id INT PRIMARY KEY AUTO_INCREMENT,
        user_id INT NOT NULL,
        token TEXT NOT NULL,
        expires_at DATETIME NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    console.log('✓ User sessions table created');

    // Create transfer_requests table
    await pool.query(`
      CREATE TABLE transfer_requests (
        id INT PRIMARY KEY AUTO_INCREMENT,
        transfer_no VARCHAR(50) UNIQUE NOT NULL,
        from_branch_id INT NOT NULL,
        to_branch_id INT NOT NULL,
        status ENUM('pending', 'approved', 'in_transit', 'delivered', 'rejected', 'cancelled') DEFAULT 'pending',
        requested_by INT,
        approved_by INT,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        approved_at TIMESTAMP NULL,
        completed_at TIMESTAMP NULL,
        FOREIGN KEY (from_branch_id) REFERENCES branches(id),
        FOREIGN KEY (to_branch_id) REFERENCES branches(id),
        FOREIGN KEY (requested_by) REFERENCES users(id),
        FOREIGN KEY (approved_by) REFERENCES users(id)
      )
    `);
    console.log('✓ Transfer requests table created');

    // Create transfer_request_items table
    await pool.query(`
      CREATE TABLE transfer_request_items (
        id INT PRIMARY KEY AUTO_INCREMENT,
        transfer_request_id INT NOT NULL,
        product_id INT NOT NULL,
        quantity INT NOT NULL,
        FOREIGN KEY (transfer_request_id) REFERENCES transfer_requests(id) ON DELETE CASCADE,
        FOREIGN KEY (product_id) REFERENCES products(id)
      )
    `);
    console.log('✓ Transfer request items table created\n');

    // ============================================
    // SEED DATA
    // ============================================

    // Hash passwords
    const hashedAdmin = await bcrypt.hash('admin123', 10);
    const hashedManager = await bcrypt.hash('manager123', 10);
    const hashedStaff = await bcrypt.hash('staff123', 10);

    // Create branches
    const branchData = [
      ['Main Warehouse', 'WH001', 'Central Distribution Center, Industrial Area', 'warehouse', true],
      ['Downtown Store', 'ST001', '123 Main Street, City Center', 'store', true],
      ['Northside Branch', 'ST002', '456 North Avenue, North District', 'store', true],
      ['South Mall Outlet', 'ST003', '789 South Mall, Level 2', 'store', true],
      ['East Plaza Store', 'ST004', '321 East Plaza, East Side', 'store', true]
    ];

    for (const [name, code, location, type, is_active] of branchData) {
      await pool.query(
        'INSERT INTO branches (name, code, location, type, is_active) VALUES (?, ?, ?, ?, ?)',
        [name, code, location, type, is_active]
      );
    }
    console.log('✓ Branches seeded (5 branches)');

    // Create users - Staff assigned to specific branches
    const userData = [
      ['admin', 'admin@minimart.com', hashedAdmin, 'admin', null],
      ['manager', 'manager@minimart.com', hashedManager, 'manager', null],
      ['staff_downtown', 'staff_downtown@minimart.com', hashedStaff, 'staff', 2],   // Downtown Store
      ['staff_north', 'staff_north@minimart.com', hashedStaff, 'staff', 3],         // Northside Branch
      ['staff_south', 'staff_south@minimart.com', hashedStaff, 'staff', 4],         // South Mall Outlet
      ['staff_east', 'staff_east@minimart.com', hashedStaff, 'staff', 5]            // East Plaza Store
    ];

    for (const [username, email, password, role, branch_id] of userData) {
      await pool.query(
        'INSERT INTO users (username, email, password, role, branch_id) VALUES (?, ?, ?, ?, ?)',
        [username, email, password, role, branch_id]
      );
    }
    console.log('✓ Users seeded (6 users: 1 admin, 1 manager, 4 staff)');

    // Create products - Various categories
    const products = [
      // Grains
      ['Basmati Rice 5kg', 'Grains', 'GRN-001', 20, 30, 25.00],
      ['Wheat Flour 1kg', 'Grains', 'GRN-002', 25, 40, 12.00],
      ['Multigrain Atta 1kg', 'Grains', 'GRN-003', 20, 35, 18.00],
      ['Brown Rice 2kg', 'Grains', 'GRN-004', 15, 25, 15.00],
      
      // Grocery
      ['Sugar 1kg', 'Grocery', 'GRC-001', 30, 50, 15.00],
      ['Cooking Oil 1L', 'Grocery', 'GRC-002', 25, 40, 18.00],
      ['Refined Oil 5L', 'Grocery', 'GRC-003', 15, 25, 55.00],
      ['Besan 1kg', 'Grocery', 'GRC-004', 20, 30, 20.00],
      
      // Beverages
      ['Tea Powder 250g', 'Beverages', 'BVG-001', 15, 25, 8.00],
      ['Coffee Beans 500g', 'Beverages', 'BVG-002', 10, 20, 22.00],
      ['Green Tea 100g', 'Beverages', 'BVG-003', 12, 20, 15.00],
      ['Juice Orange 1L', 'Beverages', 'BVG-004', 20, 35, 10.00],
      ['Mineral Water 1L', 'Beverages', 'BVG-005', 50, 100, 5.00],
      
      // Dairy
      ['Milk 1L', 'Dairy', 'DRY-001', 40, 60, 12.00],
      ['Eggs (Dozen)', 'Dairy', 'DRY-002', 30, 50, 10.00],
      ['Butter 500g', 'Dairy', 'DRY-003', 15, 25, 15.00],
      ['Cheese 400g', 'Dairy', 'DRY-004', 10, 20, 20.00],
      ['Yogurt 500g', 'Dairy', 'DRY-005', 20, 30, 8.00],
      ['Paneer 250g', 'Dairy', 'DRY-006', 15, 25, 12.00],
      
      // Bakery
      ['Bread White', 'Bakery', 'BAK-001', 20, 40, 8.00],
      ['Bread Brown', 'Bakery', 'BAK-002', 15, 30, 9.00],
      ['Bun Pack (6)', 'Bakery', 'BAK-003', 15, 25, 12.00],
      
      // Vegetables (expiring items)
      ['Tomatoes 1kg', 'Vegetables', 'VEG-001', 20, 40, 5.00],
      ['Onions 1kg', 'Vegetables', 'VEG-002', 25, 45, 4.00],
      ['Potatoes 1kg', 'Vegetables', 'VEG-003', 30, 50, 3.50],
      ['Green Peas 500g', 'Vegetables', 'VEG-004', 10, 20, 8.00],
      
      // Snacks
      ['Chips Classic', 'Snacks', 'SNK-001', 30, 50, 5.00],
      ['Chips Masala', 'Snacks', 'SNK-002', 30, 50, 5.00],
      ['Namkeen Mix', 'Snacks', 'SNK-003', 25, 40, 7.00],
      ['Popcorn 100g', 'Snacks', 'SNK-004', 20, 35, 6.00],
      
      // Confectionery
      ['Chocolate Bar', 'Confectionery', 'CFM-001', 20, 40, 8.00],
      ['Candy Pack', 'Confectionery', 'CFM-002', 25, 50, 4.00],
      ['Biscuits Cream', 'Confectionery', 'CFM-003', 30, 50, 10.00],
      ['Cookies Pack', 'Confectionery', 'CFM-004', 20, 35, 15.00],
      
      // Personal Care
      ['Shampoo 200ml', 'Personal Care', 'PCL-001', 15, 25, 25.00],
      ['Toothpaste 100g', 'Personal Care', 'PCL-002', 20, 35, 15.00],
      ['Soap Bar', 'Personal Care', 'PCL-003', 25, 40, 10.00],
      
      // Household
      ['Detergent 1kg', 'Household', 'HSE-001', 20, 35, 30.00],
      ['Floor Cleaner 1L', 'Household', 'HSE-002', 15, 25, 20.00],
      ['Air Freshener', 'Household', 'HSE-003', 10, 20, 15.00]
    ];

    for (const [name, category, sku, min_stock, reorder, price] of products) {
      await pool.query(
        'INSERT INTO products (name, category, sku, min_stock_level, reorder_point, price) VALUES (?, ?, ?, ?, ?, ?)',
        [name, category, sku, min_stock, reorder, price]
      );
    }
    console.log('✓ Products seeded (40 products)');

    // Create inventory - Different quantities for different scenarios
    // Warehouse has high stock, stores have varying levels
    for (let productId = 1; productId <= products.length; productId++) {
      for (let branchId = 1; branchId <= 5; branchId++) {
        let qty;
        
        if (branchId === 1) {
          // Warehouse - always high stock (100-200)
          qty = Math.floor(Math.random() * 100) + 100;
        } else {
          // Stores - varying stock levels
          const scenario = Math.random();
          if (scenario < 0.2) {
            // Low stock scenario (20%)
            qty = Math.floor(Math.random() * 8) + 2; // 2-10
          } else if (scenario < 0.4) {
            // Normal stock (20%)
            qty = Math.floor(Math.random() * 30) + 15; // 15-45
          } else if (scenario < 0.6) {
            // Reorder level (20%)
            qty = Math.floor(Math.random() * 10) + 10; // 10-20
          } else if (scenario < 0.85) {
            // Good stock (25%)
            qty = Math.floor(Math.random() * 40) + 40; // 40-80
          } else {
            // Overstock (15%)
            qty = Math.floor(Math.random() * 50) + 60; // 60-110
          }
        }
        
        await pool.query(
          'INSERT INTO inventory (product_id, branch_id, quantity) VALUES (?, ?, ?)',
          [productId, branchId, qty]
        );
      }
    }
    console.log('✓ Inventory seeded (200 inventory records)');

    // Create sales - Last 30 days of realistic sales data
    const today = new Date('2026-04-20');
    
    for (let dayOffset = 30; dayOffset >= 0; dayOffset--) {
      const saleDate = new Date(today);
      saleDate.setDate(saleDate.getDate() - dayOffset);
      const dateStr = saleDate.toISOString().split('T')[0];
      
      // Each store has sales
      for (let branchId = 2; branchId <= 5; branchId++) {
        // 15-25 products sold per day per store
        const numSales = Math.floor(Math.random() * 11) + 15;
        
        // Select random products
        const selectedProducts = [];
        while (selectedProducts.length < numSales) {
          const productId = Math.floor(Math.random() * 20) + 1; // Top 20 products
          if (!selectedProducts.includes(productId)) {
            selectedProducts.push(productId);
          }
        }
        
        for (const productId of selectedProducts) {
          // Daily essentials have higher quantities
          let qty;
          if (productId <= 6) {
            qty = Math.floor(Math.random() * 15) + 5; // Essentials: 5-20
          } else if (productId <= 12) {
            qty = Math.floor(Math.random() * 10) + 3; // Beverages: 3-13
          } else if (productId <= 18) {
            qty = Math.floor(Math.random() * 8) + 2; // Dairy: 2-10
          } else {
            qty = Math.floor(Math.random() * 5) + 1; // Others: 1-6
          }
          
          await pool.query(
            'INSERT INTO sales (product_id, branch_id, sale_date, quantity) VALUES (?, ?, ?, ?)',
            [productId, branchId, dateStr, qty]
          );
        }
      }
    }
    console.log('✓ Sales seeded (30 days of sales data)');

    // Create sample transfer requests
    const transferData = [
      ['TRN-001', 1, 2, 'pending', 3, null, 'Urgent stock request for Downtown Store'],
      ['TRN-002', 1, 3, 'approved', 3, 1, 'Approved stock transfer to Northside'],
      ['TRN-003', 1, 4, 'in_transit', 3, 1, 'In transit to South Mall'],
      ['TRN-004', 1, 5, 'delivered', 3, 1, 'Completed delivery to East Plaza'],
      ['TRN-005', 2, 1, 'pending', 6, null, 'Stock return to warehouse'],
      ['TRN-006', 3, 2, 'approved', 4, 1, 'Transfer from North to Downtown']
    ];

    for (const [transfer_no, from, to, status, requested_by, approved_by, notes] of transferData) {
      await pool.query(
        'INSERT INTO transfer_requests (transfer_no, from_branch_id, to_branch_id, status, requested_by, approved_by, notes) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [transfer_no, from, to, status, requested_by, approved_by, notes]
      );
    }

    // Add transfer items
    const transferItems = [
      [1, 1, 50],  // TRN-001: Rice 50 units
      [1, 5, 30],  // TRN-001: Sugar 30 units
      [2, 7, 40],  // TRN-002: Cooking Oil 40 units
      [2, 13, 25], // TRN-002: Milk 25 units
      [3, 3, 35],  // TRN-003: Multigrain Atta 35 units
      [4, 16, 20], // TRN-004: Butter 20 units
      [5, 19, 45], // TRN-005: Bread White 45 units
      [6, 22, 15]  // TRN-006: Green Peas 15 units
    ];

    for (const [transfer_id, product_id, qty] of transferItems) {
      await pool.query(
        'INSERT INTO transfer_request_items (transfer_request_id, product_id, quantity) VALUES (?, ?, ?)',
        [transfer_id, product_id, qty]
      );
    }
    console.log('✓ Transfer requests seeded (6 transfers)');

    console.log('\n' + '='.repeat(50));
    console.log('✅ DATABASE SEEDING COMPLETED SUCCESSFULLY!');
    console.log('='.repeat(50));
    console.log('\n📋 Demo Credentials:');
    console.log('   Admin:    admin / admin123');
    console.log('   Manager:  manager / manager123');
    console.log('   Staff:    staff_downtown / staff123');
    console.log('\n📊 Data Summary:');
    console.log('   • 5 Branches (1 warehouse, 4 stores)');
    console.log('   • 40 Products across 10 categories');
    console.log('   • 200 Inventory records');
    console.log('   • 30 days of sales history');
    console.log('   • 6 Transfer requests');
    console.log('');
    
  } catch (error) {
    console.error('❌ Seeding error:', error.message);
    console.error(error.stack);
  }
  
  process.exit(0);
}

seedDatabase();
