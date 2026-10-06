const { pool } = require('../config/db');

exports.getAllProducts = async (req, res) => {
  try {
    const [products] = await pool.query(`
      SELECT p.id, p.name, p.category, p.sku, 
        p.min_stock_level as min_stock, p.reorder_point as max_stock, 
        p.price, p.is_active as status, p.created_at,
        (SELECT SUM(quantity) FROM inventory WHERE product_id = p.id) as total_stock
      FROM products p
      WHERE p.is_active = TRUE
      ORDER BY p.name
    `);
    res.json(products);
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({ error: 'Failed to get products' });
  }
};

exports.getProductById = async (req, res) => {
  try {
    const { id } = req.params;
    const [products] = await pool.query(
      'SELECT id, name, category, sku, min_stock_level as min_stock, reorder_point as max_stock, price, is_active as status, created_at FROM products WHERE id = ? AND is_active = 1',
      [id]
    );

    if (products.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json(products[0]);
  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({ error: 'Failed to get product' });
  }
};

exports.createProduct = async (req, res) => {
  try {
    const { name, category, sku, description, unit, min_stock, max_stock, price } = req.body;

    if (!name || !sku) {
      return res.status(400).json({ error: 'Name and SKU required' });
    }

    const [result] = await pool.query(
      'INSERT INTO products (name, category, sku, description, unit, min_stock, max_stock, price, status, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [name, category || 'General', sku, description || null, unit || 'pcs', min_stock || 10, max_stock || 100, price || 0, 'active', 1]
    );

    const [newProduct] = await pool.query(
      'SELECT * FROM products WHERE id = ?',
      [result.insertId]
    );

    res.status(201).json(newProduct[0]);
  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({ error: 'Failed to create product' });
  }
};

exports.updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, category, sku, min_stock, max_stock, price, status } = req.body;

    const [existing] = await pool.query(
      'SELECT * FROM products WHERE id = ?',
      [id]
    );

    if (existing.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const is_active = status === 'inactive' ? 0 : 1;

    await pool.query(
      `UPDATE products SET 
        name = COALESCE(?, name),
        category = COALESCE(?, category),
        sku = COALESCE(?, sku),
        min_stock_level = COALESCE(?, min_stock_level),
        reorder_point = COALESCE(?, reorder_point),
        price = COALESCE(?, price),
        is_active = COALESCE(?, is_active)
      WHERE id = ?`,
      [name, category, sku, min_stock, max_stock, price, is_active, id]
    );

    const [updated] = await pool.query(
      'SELECT * FROM products WHERE id = ?',
      [id]
    );

    res.json(updated[0]);
  } catch (error) {
    console.error('Update product error:', error.message, error.stack);
    res.status(500).json({ error: 'Failed to update product' });
  }
};

exports.deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;

    const [existing] = await pool.query(
      'SELECT * FROM products WHERE id = ?',
      [id]
    );

    if (existing.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    await pool.query('UPDATE products SET is_active = 0 WHERE id = ?', [id]);

    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({ error: 'Failed to delete product' });
  }
};

exports.getCategories = async (req, res) => {
  try {
    const [categories] = await pool.query(
      'SELECT DISTINCT category FROM products WHERE is_active = 1 AND category IS NOT NULL ORDER BY category'
    );
    res.json(categories.map(c => c.category));
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ error: 'Failed to get categories' });
  }
};