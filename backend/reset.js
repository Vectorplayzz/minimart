const { pool } = require('./config/db');

async function resetDatabase() {
  console.log('⚠️  WARNING: This will delete ALL data from the database!');
  console.log('Starting database reset...\n');
  
  try {
    // Disable foreign key checks
    await pool.query('SET FOREIGN_KEY_CHECKS = 0');
    console.log('Disabled foreign key checks');
    
    // Drop all tables
    const tables = [
      'transfer_request_items',
      'transfer_requests',
      'delivery_confirmations',
      'delivery_items',
      'stock_transfers',
      'transfer_history',
      'transfers',
      'deliveries',
      'sales',
      'inventory',
      'products',
      'categories',
      'branches',
      'user_sessions',
      'users'
    ];
    
    for (const table of tables) {
      try {
        await pool.query(`DROP TABLE IF EXISTS ${table}`);
        console.log(`✓ Dropped: ${table}`);
      } catch (e) {
        console.log(`  - ${table}: ${e.message}`);
      }
    }
    
    // Re-enable foreign key checks
    await pool.query('SET FOREIGN_KEY_CHECKS = 1');
    console.log('Enabled foreign key checks\n');
    
    console.log('📦 Creating tables...\n');
    
    // Create users table
    await pool.query(`
      CREATE TABLE users (
        id INT PRIMARY KEY AUTO_INCREMENT,
        username VARCHAR(100) NOT NULL UNIQUE,
        email VARCHAR(255) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        role ENUM('admin', 'manager', 'staff') DEFAULT 'staff',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✓ Created: users');
    
    // Create branches table
    await pool.query(`
      CREATE TABLE branches (
        id INT PRIMARY KEY AUTO_INCREMENT,
        name VARCHAR(100) NOT NULL,
        code VARCHAR(20) NOT NULL UNIQUE,
        location VARCHAR(255),
        address TEXT,
        type ENUM('warehouse', 'store', 'hub') DEFAULT 'store',
        is_active TINYINT(1) DEFAULT 1,
        contact_number VARCHAR(255),
        default_manager_id INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✓ Created: branches');
    
    // Create products table
    await pool.query(`
      CREATE TABLE products (
        id INT PRIMARY KEY AUTO_INCREMENT,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        category VARCHAR(100),
        sku VARCHAR(50) NOT NULL UNIQUE,
        barcode VARCHAR(50) UNIQUE,
        category_id INT,
        unit VARCHAR(20) DEFAULT 'pcs',
        min_stock_level INT DEFAULT 10,
        price DECIMAL(10,2) DEFAULT 0.00,
        stock_quantity INT DEFAULT 0,
        branch_id INT,
        created_by INT,
        reorder_point INT DEFAULT 20,
        image_url VARCHAR(255),
        status ENUM('active', 'inactive') DEFAULT 'active',
        is_active TINYINT(1) DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    console.log('✓ Created: products');
    
    // Create inventory table
    await pool.query(`
      CREATE TABLE inventory (
        id INT PRIMARY KEY AUTO_INCREMENT,
        branch_id INT NOT NULL,
        product_id INT NOT NULL,
        quantity INT DEFAULT 0,
        reserved_quantity INT DEFAULT 0,
        expiry_date DATE,
        last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY unique_product_branch (product_id, branch_id)
      )
    `);
    console.log('✓ Created: inventory');
    
    // Create sales table
    await pool.query(`
      CREATE TABLE sales (
        id INT PRIMARY KEY AUTO_INCREMENT,
        branch_id INT NOT NULL,
        product_id INT NOT NULL,
        sale_date DATE NOT NULL,
        quantity INT NOT NULL,
        unit_price DECIMAL(10,2) DEFAULT 0.00,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✓ Created: sales');
    
    // Create stock_transfers table
    await pool.query(`
      CREATE TABLE stock_transfers (
        id INT PRIMARY KEY AUTO_INCREMENT,
        transfer_no VARCHAR(50) UNIQUE NOT NULL,
        product_id INT NOT NULL,
        from_branch_id INT NOT NULL,
        to_branch_id INT NOT NULL,
        quantity INT NOT NULL,
        status ENUM('pending', 'approved', 'in_transit', 'delivered', 'cancelled') DEFAULT 'pending',
        requested_by INT,
        approved_by INT,
        requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        approved_at TIMESTAMP NULL,
        in_transit_at TIMESTAMP NULL,
        delivered_at TIMESTAMP NULL,
        notes TEXT
      )
    `);
    console.log('✓ Created: stock_transfers');
    
    // Create user_sessions table
    await pool.query(`
      CREATE TABLE user_sessions (
        id INT PRIMARY KEY AUTO_INCREMENT,
        user_id INT NOT NULL,
        token TEXT NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✓ Created: user_sessions');
    
    // Create indexes
    await pool.query('CREATE INDEX idx_inventory_product ON inventory(product_id)');
    await pool.query('CREATE INDEX idx_inventory_branch ON inventory(branch_id)');
    await pool.query('CREATE INDEX idx_sales_product ON sales(product_id)');
    await pool.query('CREATE INDEX idx_sales_branch ON sales(branch_id)');
    await pool.query('CREATE INDEX idx_sales_date ON sales(sale_date)');
    console.log('✓ Created: indexes');
    
    console.log('\n✅ Database reset complete!');
    console.log('\n📌 Now run: node seed.js');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    // Re-enable foreign key checks on error
    await pool.query('SET FOREIGN_KEY_CHECKS = 1').catch(() => {});
  }
  
  process.exit(0);
}

resetDatabase();