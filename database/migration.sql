-- ============================================================
-- Mini-Mart Database Migration
-- Fixes schema mismatches for controllers
-- ============================================================

-- Add missing columns to branches table
ALTER TABLE branches 
ADD COLUMN IF NOT EXISTS code VARCHAR(50) AFTER name,
ADD COLUMN IF NOT EXISTS address TEXT AFTER location,
ADD COLUMN IF NOT EXISTS type ENUM('store', 'warehouse', 'outlet') DEFAULT 'store' AFTER address,
ADD COLUMN IF NOT EXISTS is_active TINYINT(1) DEFAULT 1 AFTER type;

-- Add missing columns to products table
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS category VARCHAR(100) NOT NULL AFTER name,
ADD COLUMN IF NOT EXISTS sku VARCHAR(50) UNIQUE AFTER category,
ADD COLUMN IF NOT EXISTS unit VARCHAR(20) DEFAULT 'piece' AFTER max_stock,
ADD COLUMN IF NOT EXISTS min_stock_level INT DEFAULT 10 AFTER unit,
ADD COLUMN IF NOT EXISTS reorder_point INT DEFAULT 20 AFTER min_stock_level;

-- Add missing column to sales table (rename date to sale_date, quantity_sold to quantity)
ALTER TABLE sales 
ADD COLUMN IF NOT EXISTS sale_date DATE NOT NULL AFTER branch_id,
ADD COLUMN IF NOT EXISTS quantity INT NOT NULL AFTER sale_date;

-- Migrate existing data from old columns to new columns
UPDATE sales SET sale_date = date, quantity = quantity_sold WHERE sale_date IS NULL OR sale_date = '0000-00-00';

-- Inventory table - add reserved_quantity
ALTER TABLE inventory 
ADD COLUMN IF NOT EXISTS reserved_quantity INT DEFAULT 0 AFTER quantity;

-- Add user columns if missing
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS role ENUM('admin', 'manager', 'staff') DEFAULT 'staff',
ADD COLUMN IF NOT EXISTS branch_id INT;

-- Create stock_transfers table
CREATE TABLE IF NOT EXISTS stock_transfers (
    id INT AUTO_INCREMENT PRIMARY KEY,
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
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (from_branch_id) REFERENCES branches(id) ON DELETE CASCADE,
    FOREIGN KEY (to_branch_id) REFERENCES branches(id) ON DELETE CASCADE,
    FOREIGN KEY (requested_by) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_product (product_id),
    INDEX idx_from_branch (from_branch_id),
    INDEX idx_to_branch (to_branch_id),
    INDEX idx_status (status)
);

-- Create delivery_confirmations table
CREATE TABLE IF NOT EXISTS delivery_confirmations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    transfer_id INT NOT NULL,
    received_by INT NOT NULL,
    received_quantity INT NOT NULL,
    confirmed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    notes TEXT,
    FOREIGN KEY (transfer_id) REFERENCES stock_transfers(id) ON DELETE CASCADE,
    FOREIGN KEY (received_by) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_transfer (transfer_id)
);

SELECT 'Migration completed' as status;