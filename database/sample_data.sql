-- ============================================================
-- Mini-Mart 2 - Database Seed Data
-- ============================================================

-- Insert Branches
INSERT INTO branches (name, location, is_warehouse, is_active) VALUES
    ('Main Warehouse', 'Central Distribution Center', 1, 1),
    ('Downtown Store', '123 Main Street, City Center', 0, 1),
    ('Northside Branch', '456 North Avenue', 0, 1),
    ('South Mall Outlet', '789 South Mall', 0, 1),
    ('East Plaza Store', '321 East Plaza', 0, 1);

-- Insert Products
INSERT INTO products (name, category, sku, expiry_date, min_stock, max_stock) VALUES
    ('Basmati Rice 5kg', 'Grains', 'GRN-001', '2026-12-31', 20, 100),
    ('Sugar 1kg', 'Grocery', 'GRC-001', '2027-06-30', 30, 150),
    ('Cooking Oil 1L', 'Grocery', 'GRC-002', '2026-08-15', 25, 80),
    ('Wheat Flour 1kg', 'Grains', 'GRN-002', '2026-11-30', 25, 100),
    ('Tea Powder 250g', 'Beverages', 'BVG-001', '2026-09-30', 15, 60),
    ('Coffee Beans 500g', 'Beverages', 'BVG-002', '2026-10-15', 10, 40),
    ('Milk 1L', 'Dairy', 'DRY-001', '2026-04-20', 40, 100),
    ('Eggs (Dozen)', 'Dairy', 'DRY-002', '2026-04-25', 30, 80),
    ('Butter 500g', 'Dairy', 'DRY-003', '2026-05-10', 15, 50),
    ('Cheese 400g', 'Dairy', 'DRY-004', '2026-05-20', 10, 40),
    ('Bread White', 'Bakery', 'BAK-001', '2026-04-18', 20, 60),
    ('Bread Brown', 'Bakery', 'BAK-002', '2026-04-20', 15, 50),
    ('Tomatoes 1kg', 'Vegetables', 'VEG-001', '2026-04-15', 20, 60),
    ('Onions 1kg', 'Vegetables', 'VEG-002', '2026-04-22', 25, 80),
    ('Potatoes 1kg', 'Vegetables', 'VEG-003', '2026-05-01', 30, 100),
    ('Chips Classic', 'Snacks', 'SNK-001', '2026-07-30', 30, 100),
    ('Chips Masala', 'Snacks', 'SNK-002', '2026-07-30', 30, 100),
    ('Chocolate Bar', 'Confectionery', 'CFM-001', '2026-08-15', 20, 80),
    ('Candy Pack', 'Confectionery', 'CFM-002', '2026-09-01', 25, 100),
    ('Juice Orange 1L', 'Beverages', 'BVG-003', '2026-06-15', 20, 60),
    ('Shampoo 500ml', 'Personal Care', 'PCH-001', '2027-01-01', 15, 50),
    ('Toothpaste', 'Personal Care', 'PCH-002', '2027-03-01', 20, 60),
    ('Soap (Pack of 4)', 'Personal Care', 'PCH-003', '2027-06-01', 25, 80),
    ('Detergent 1kg', 'Household', 'HSH-001', '2027-01-15', 20, 60),
    ('Cleaning Spray', 'Household', 'HSH-002', '2026-12-01', 15, 40);

-- Insert Inventory (Warehouse - High Stock)
INSERT INTO inventory (product_id, branch_id, quantity, reserved_quantity) VALUES
    (1, 1, 500, 0), (2, 1, 600, 0), (3, 1, 300, 0), (4, 1, 400, 0), (5, 1, 150, 0),
    (6, 1, 80, 0), (7, 1, 200, 0), (8, 1, 250, 0), (9, 1, 100, 0), (10, 1, 60, 0),
    (11, 1, 150, 0), (12, 1, 120, 0), (13, 1, 180, 0), (14, 1, 200, 0), (15, 1, 300, 0),
    (16, 1, 200, 0), (17, 1, 200, 0), (18, 1, 150, 0), (19, 1, 250, 0), (20, 1, 120, 0),
    (21, 1, 80, 0), (22, 1, 100, 0), (23, 1, 150, 0), (24, 1, 100, 0), (25, 1, 60, 0);

-- Insert Inventory (Store Branches - Lower Stock)
INSERT INTO inventory (product_id, branch_id, quantity, reserved_quantity) VALUES
    -- Downtown Store (Branch 2)
    (1, 2, 60, 0), (2, 2, 80, 0), (3, 2, 45, 0), (4, 2, 55, 0), (5, 2, 30, 0),
    (6, 2, 20, 0), (7, 2, 70, 0), (8, 2, 55, 0), (9, 2, 25, 0), (10, 2, 18, 0),
    (11, 2, 40, 0), (12, 2, 35, 0), (13, 2, 28, 0), (14, 2, 45, 0), (15, 2, 65, 0),
    -- Northside Branch (Branch 3)
    (1, 3, 45, 0), (2, 3, 70, 0), (3, 3, 35, 0), (4, 3, 50, 0), (5, 3, 25, 0),
    (6, 3, 15, 0), (7, 3, 55, 0), (8, 3, 45, 0), (9, 3, 20, 0), (10, 3, 12, 0),
    -- South Mall Outlet (Branch 4)
    (1, 4, 40, 0), (2, 4, 60, 0), (3, 4, 30, 0), (4, 4, 45, 0), (5, 4, 22, 0),
    (6, 4, 18, 0), (7, 4, 65, 0), (8, 4, 50, 0), (9, 4, 18, 0), (10, 4, 10, 0),
    -- East Plaza Store (Branch 5)
    (1, 5, 35, 0), (2, 5, 55, 0), (3, 5, 28, 0), (4, 5, 40, 0), (5, 5, 20, 0),
    (6, 5, 12, 0), (7, 5, 50, 0), (8, 5, 45, 0), (9, 5, 15, 0), (10, 5, 8, 0);

-- Insert Low Stock items for demonstration
INSERT INTO inventory (product_id, branch_id, quantity, reserved_quantity) VALUES
    (16, 2, 8, 0),  -- Low stock at Downtown
    (17, 3, 5, 0),  -- Low stock at Northside
    (21, 4, 3, 0);  -- Low stock at South Mall

-- Insert Overstock items for demonstration
INSERT INTO inventory (product_id, branch_id, quantity, reserved_quantity) VALUES
    (1, 2, 150, 0),  -- Overstock Rice at Downtown
    (2, 3, 200, 0);  -- Overstock Sugar at Northside

-- Insert Sales History (Last 30 days)
INSERT INTO sales (product_id, branch_id, date, quantity_sold) VALUES
    -- Rice sales
    (1, 2, '2026-03-14', 15), (1, 2, '2026-03-15', 18), (1, 2, '2026-03-16', 20),
    (1, 2, '2026-03-17', 22), (1, 2, '2026-03-18', 25), (1, 2, '2026-03-19', 28),
    (1, 2, '2026-03-20', 30), (1, 2, '2026-03-21', 25), (1, 2, '2026-03-22', 20),
    (1, 3, '2026-03-14', 12), (1, 3, '2026-03-15', 14), (1, 3, '2026-03-16', 16),
    (1, 4, '2026-03-14', 10), (1, 4, '2026-03-15', 12), (1, 4, '2026-03-16', 14),
    -- Sugar sales
    (2, 2, '2026-03-14', 20), (2, 2, '2026-03-15', 22), (2, 2, '2026-03-16', 25),
    (2, 2, '2026-03-17', 28), (2, 2, '2026-03-18', 30), (2, 2, '2026-03-19', 32),
    (2, 3, '2026-03-14', 18), (2, 3, '2026-03-15', 20), (2, 3, '2026-03-16', 22),
    -- Milk sales (high volume)
    (7, 2, '2026-03-14', 35), (7, 2, '2026-03-15', 40), (7, 2, '2026-03-16', 45),
    (7, 2, '2026-03-17', 50), (7, 2, '2026-03-18', 55), (7, 2, '2026-03-19', 60),
    (7, 3, '2026-03-14', 30), (7, 3, '2026-03-15', 35), (7, 3, '2026-03-16', 40),
    -- Eggs sales
    (8, 2, '2026-03-14', 25), (8, 2, '2026-03-15', 30), (8, 2, '2026-03-16', 35),
    (8, 2, '2026-03-17', 40), (8, 2, '2026-03-18', 45), (8, 2, '2026-03-19', 50),
    -- Chips sales
    (16, 2, '2026-03-14', 30), (16, 2, '2026-03-15', 35), (16, 2, '2026-03-16', 40),
    (16, 3, '2026-03-14', 25), (16, 3, '2026-03-15', 30), (16, 3, '2026-03-16', 35),
    -- Recent sales (April)
    (1, 2, '2026-04-10', 22), (1, 2, '2026-04-11', 25), (1, 2, '2026-04-12', 20),
    (2, 2, '2026-04-10', 28), (2, 2, '2026-04-11', 30), (2, 2, '2026-04-12', 32),
    (7, 2, '2026-04-10', 55), (7, 2, '2026-04-11', 60), (7, 2, '2026-04-12', 65),
    (8, 2, '2026-04-10', 45), (8, 2, '2026-04-11', 50), (8, 2, '2026-04-12', 55);

-- Insert Stock Transfers
INSERT INTO stock_transfers (transfer_no, product_id, from_branch_id, to_branch_id, quantity, status, requested_by, notes) VALUES
    ('TRF-20260413000001', 1, 1, 2, 50, 'delivered', 1, 'Restock Downtown'),
    ('TRF-20260413000002', 7, 1, 3, 100, 'approved', 1, 'Restock Northside'),
    ('TRF-20260413000003', 2, 1, 4, 30, 'pending', 2, 'Urgent restock'),
    ('TRF-20260413000004', 16, 1, 5, 40, 'in_transit', 1, 'Restock East Plaza');

-- Insert Delivery Confirmations
INSERT INTO delivery_confirmations (transfer_id, received_by, received_quantity, notes) VALUES
    (1, 2, 50, 'Received in good condition');

-- Note: Passwords need to be hashed before insertion
-- The following users will be created with bcrypt hashed passwords:
-- admin: admin123 -> $2a$10$...
-- manager: manager123 -> $2a$10$...
-- staff: staff123 -> $2a$10$...

-- For demo purposes, let's create users with pre-hashed passwords
-- These are bcrypt hashes of the passwords

-- First, let's create users using the registration endpoint via the API
-- For now, we'll insert a placeholder that we'll replace with proper hashes
-- The actual user creation should be done through the application

-- Placeholder users (passwords will be set via seed script execution)
-- Users table will be populated by the application after first run