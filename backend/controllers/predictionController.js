const { pool } = require('../config/db');

function simplePrediction(historicalData, days = 7) {
  if (historicalData.length < 3) {
    return {
      predicted_weekly_demand: 0,
      predicted_daily: 0,
      confidence: 'low',
      method: 'insufficient_data'
    };
  }

  const quantities = historicalData.map(s => s.quantity_sold);
  
  const avg = quantities.reduce((a, b) => a + b, 0) / quantities.length;
  
  const recentAvg = quantities.slice(-7).reduce((a, b) => a + b, 0) / Math.min(quantities.slice(-7).length, 7);
  
  const weighted = avg * 0.4 + recentAvg * 0.6;
  
  const variance = quantities.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / quantities.length;
  const stdDev = Math.sqrt(variance);
  
  let confidence = 'medium';
  if (stdDev / avg > 0.5) confidence = 'low';
  else if (stdDev / avg < 0.2) confidence = 'high';
  
  let trend = 'stable';
  if (quantities.length >= 7) {
    const firstWeek = quantities.slice(0, 7).reduce((a, b) => a + b, 0) / 7;
    const lastWeek = quantities.slice(-7).reduce((a, b) => a + b, 0) / 7;
    if (lastWeek > firstWeek * 1.2) trend = 'increasing';
    else if (lastWeek < firstWeek * 0.8) trend = 'decreasing';
  }

  return {
    predicted_weekly_demand: Math.round(weighted * 7 * 100) / 100,
    predicted_daily: Math.round(weighted * 100) / 100,
    confidence,
    trend,
    based_on_days: quantities.length,
    method: 'local_averages'
  };
}

exports.getPrediction = async (req, res) => {
  try {
    const { productId, branchId } = req.params;

    if (!productId || !branchId) {
      return res.status(400).json({ error: 'Product ID and Branch ID required' });
    }

    const [sales] = await pool.query(`
      SELECT date as date, SUM(quantity_sold) as quantity_sold
      FROM sales
      WHERE product_id = ? AND branch_id = ?
        AND date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
      GROUP BY date
      ORDER BY date ASC
    `, [productId, branchId]);

    const prediction = simplePrediction(sales);

    const [inventory] = await pool.query(
      'SELECT quantity FROM inventory WHERE product_id = ? AND branch_id = ?',
      [productId, branchId]
    );

    const [product] = await pool.query(
      'SELECT name, min_stock, max_stock FROM products WHERE id = ?',
      [productId]
    );

    const currentStock = inventory.length > 0 ? inventory[0].quantity : 0;
    const minStock = product.length > 0 ? product[0].min_stock : 0;
    const daysUntilStockout = prediction.predicted_daily > 0 
      ? Math.floor(currentStock / prediction.predicted_daily) 
      : null;

    res.json({
      product_id: productId,
      branch_id: branchId,
      product_name: product.length > 0 ? product[0].name : null,
      ...prediction,
      current_stock: currentStock,
      min_stock: minStock,
      days_until_stockout,
      recommendation: daysUntilStockout !== null && daysUntilStockout < 7 
        ? 'URGENT: Restock required' 
        : daysUntilStockout !== null && daysUntilStockout < 14 
          ? 'Warning: Low stock' 
          : 'Stock adequate'
    });
  } catch (error) {
    console.error('Get prediction error:', error);
    res.status(500).json({ error: 'Failed to get prediction' });
  }
};

exports.trainModel = async (req, res) => {
  res.json({ 
    message: 'Using local prediction algorithm (no external AI service required)',
    status: 'ready'
  });
};

exports.getRecommendations = async (req, res) => {
  try {
    const { productId } = req.params;

    if (!productId) {
      return res.status(400).json({ error: 'Product ID required' });
    }

    const [inventory] = await pool.query(`
      SELECT i.*, b.name as branch_name
      FROM inventory i
      JOIN branches b ON i.branch_id = b.id
      WHERE i.product_id = ?
      ORDER BY i.quantity DESC
    `, [productId]);

    const [product] = await pool.query(
      'SELECT * FROM products WHERE id = ?',
      [productId]
    );

    if (product.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const p = product[0];
    const recommendations = [];

    for (const inv of inventory) {
      const [sales] = await pool.query(`
        SELECT date as date, SUM(quantity_sold) as quantity_sold
        FROM sales
        WHERE product_id = ? AND branch_id = ?
          AND date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
        GROUP BY date
      `, [productId, inv.branch_id]);

      const prediction = simplePrediction(sales);
      const predictedWeekly = prediction.predicted_weekly_demand;
      const neededStock = Math.ceil(predictedWeekly * 1.5);
      const deficit = neededStock - inv.quantity;

      let priority = 'low';
      if (inv.quantity < p.min_stock) priority = 'high';
      else if (deficit > 0) priority = 'medium';

      recommendations.push({
        branch_id: inv.branch_id,
        branch_name: inv.branch_name,
        current_stock: inv.quantity,
        min_stock: p.min_stock,
        predicted_weekly: Math.round(predictedWeekly * 100) / 100,
        recommended_stock: neededStock,
        deficit: deficit > 0 ? deficit : 0,
        surplus: deficit < 0 ? Math.abs(deficit) : 0,
        priority,
        action: deficit > 0 ? 'Restock from warehouse' : inv.quantity > p.max_stock ? 'Consider transfer' : 'OK'
      });
    }

    res.json({
      product: { id: p.id, name: p.name, category: p.category },
      recommendations
    });
  } catch (error) {
    console.error('Get recommendations error:', error);
    res.status(500).json({ error: 'Failed to get recommendations' });
  }
};

exports.getAllPredictions = async (req, res) => {
  try {
    const { limit = 50 } = req.query;

    const [products] = await pool.query(`
      SELECT DISTINCT product_id, branch_id
      FROM sales
      WHERE date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
      GROUP BY product_id, branch_id
    `);

    const predictions = [];

    for (const { product_id, branch_id } of products.slice(0, parseInt(limit))) {
      const [sales] = await pool.query(`
        SELECT date as date, SUM(quantity_sold) as quantity_sold
        FROM sales
        WHERE product_id = ? AND branch_id = ?
          AND date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
        GROUP BY date
      `, [product_id, branch_id]);

      const prediction = simplePrediction(sales);

      const [inventory] = await pool.query(
        'SELECT quantity FROM inventory WHERE product_id = ? AND branch_id = ?',
        [product_id, branch_id]
      );

      const [prod] = await pool.query('SELECT name FROM products WHERE id = ?', [product_id]);
      const [branch] = await pool.query('SELECT name FROM branches WHERE id = ?', [branch_id]);

      predictions.push({
        product_id,
        product_name: prod.length > 0 ? prod[0].name : 'Unknown',
        branch_id,
        branch_name: branch.length > 0 ? branch[0].name : 'Unknown',
        current_stock: inventory.length > 0 ? inventory[0].quantity : 0,
        ...prediction
      });
    }

    res.json(predictions);
  } catch (error) {
    console.error('Get all predictions error:', error);
    res.status(500).json({ error: 'Failed to get predictions' });
  }
};
