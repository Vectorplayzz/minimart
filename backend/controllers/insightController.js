const { pool } = require('../config/db');

exports.getOverstockItems = async (req, res) => {
  try {
    const [items] = await pool.query(`
      SELECT 
        p.id as product_id,
        p.name as product_name,
        p.category,
        p.reorder_point,
        b.id as branch_id,
        b.name as branch_name,
        i.quantity,
        (i.quantity - p.reorder_point) as excess
      FROM inventory i
      JOIN products p ON i.product_id = p.id
      JOIN branches b ON i.branch_id = b.id
      WHERE i.quantity > p.reorder_point AND (b.is_active = 1 OR b.is_active IS NULL)
      ORDER BY excess DESC
    `);
    res.json(items);
  } catch (error) {
    console.error('Get overstock error:', error);
    res.status(500).json({ error: 'Failed to get overstock items' });
  }
};

exports.getUnderstockItems = async (req, res) => {
  try {
    const [items] = await pool.query(`
      SELECT 
        p.id as product_id,
        p.name as product_name,
        p.category,
        p.min_stock_level as min_stock,
        b.id as branch_id,
        b.name as branch_name,
        i.quantity,
        (p.min_stock_level - i.quantity) as deficit
      FROM inventory i
      JOIN products p ON i.product_id = p.id
      JOIN branches b ON i.branch_id = b.id
      WHERE i.quantity < p.min_stock_level AND (b.is_active = 1 OR b.is_active IS NULL)
      ORDER BY deficit DESC
    `);
    res.json(items);
  } catch (error) {
    console.error('Get understock error:', error);
    res.status(500).json({ error: 'Failed to get understock items' });
  }
};

exports.getFastMovingProducts = async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const limit = parseInt(req.query.limit) || 10;
    
    console.log('Fast moving query - days:', days, 'limit:', limit);
    
    const [items] = await pool.query(`
      SELECT 
        p.id as product_id,
        p.name as product_name,
        p.category,
        SUM(s.quantity_sold) as total_sold,
        COUNT(DISTINCT s.branch_id) as branch_count,
        AVG(s.quantity_sold) as avg_daily_sales
      FROM sales s
      JOIN products p ON s.product_id = p.id
      WHERE s.date >= DATE_SUB(CURDATE(), INTERVAL ${days} DAY)
      GROUP BY p.id, p.name, p.category
      ORDER BY total_sold DESC
      LIMIT ${limit}
    `);
    
    console.log('Fast moving result:', items.length);
    res.json(items);
  } catch (error) {
    console.error('Get fast moving error:', error);
    res.status(500).json({ error: 'Failed to get fast moving products' });
  }
};

exports.getSlowMovingProducts = async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const limit = parseInt(req.query.limit) || 10;
    
    const [items] = await pool.query(`
      SELECT 
        p.id as product_id,
        p.name as product_name,
        p.category,
        COALESCE(SUM(s.quantity_sold), 0) as total_sold,
        AVG(s.quantity_sold) as avg_daily_sales
      FROM products p
      LEFT JOIN sales s ON p.id = s.product_id AND s.date >= DATE_SUB(CURDATE(), INTERVAL ${days} DAY)
      GROUP BY p.id, p.name, p.category
      ORDER BY total_sold ASC
      LIMIT ${limit}
    `);
    
    res.json(items);
  } catch (error) {
    console.error('Get slow moving error:', error);
    res.status(500).json({ error: 'Failed to get slow moving products' });
  }
};

exports.getRebalanceSuggestions = async (req, res) => {
  try {
    const [suggestions] = await pool.query(`
      SELECT 
        p.id as product_id,
        p.name as product_name,
        p.category,
        p.min_stock_level as min_stock,
        p.reorder_point,
        source.id as source_branch_id,
        source.name as source_branch,
        source.quantity as source_quantity,
        source.available as source_available,
        dest.id as dest_branch_id,
        dest.name as dest_branch,
        dest.quantity as dest_quantity,
        dest.deficit as dest_deficit,
        LEAST(source.available - p.min_stock_level, dest.deficit) as suggested_transfer
      FROM products p
      CROSS JOIN (
        SELECT b.id, b.name, i.quantity, (i.quantity - COALESCE(i.reserved_quantity, 0) - p2.min_stock_level) as available
        FROM branches b
        JOIN inventory i ON b.id = i.branch_id
        JOIN products p2 ON i.product_id = p2.id
        WHERE b.is_active = 1 OR b.is_active IS NULL
      ) source
      CROSS JOIN (
        SELECT b.id, b.name, i.quantity, (p2.min_stock_level - i.quantity) as deficit
        FROM branches b
        JOIN inventory i ON b.id = i.branch_id
        JOIN products p2 ON i.product_id = p2.id
        WHERE (b.is_active = 1 OR b.is_active IS NULL) AND i.quantity < p2.min_stock_level
      ) dest
      WHERE source.available > p.min_stock_level AND dest.deficit > 0
      ORDER BY suggested_transfer DESC
      LIMIT 20
    `);
    
    res.json(suggestions);
  } catch (error) {
    console.error('Get rebalance error:', error);
    res.status(500).json({ error: 'Failed to get rebalance suggestions' });
  }
};

exports.getDaysUntilStockout = async (req, res) => {
  try {
    const { product_id, branch_id } = req.params;
    
    const [salesData] = await pool.query(`
      SELECT 
        AVG(daily_sales) as avg_daily_sales
      FROM (
        SELECT date, SUM(quantity_sold) as daily_sales
        FROM sales
        WHERE product_id = ? AND branch_id = ? AND date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
        GROUP BY date
      ) daily
    `, [product_id, branch_id]);
    
    const [inventory] = await pool.query(`
      SELECT quantity, reserved_quantity FROM inventory WHERE product_id = ? AND branch_id = ?
    `, [product_id, branch_id]);
    
    if (inventory.length === 0) {
      return res.json({ 
        product_id, 
        branch_id, 
        days_until_stockout: null, 
        message: 'No inventory' 
      });
    }
    
    const availableStock = inventory[0].quantity - (inventory[0].reserved_quantity || 0);
    const avgDailySales = salesData[0].avg_daily_sales || 0;
    
    let daysUntilStockout = null;
    if (avgDailySales > 0) {
      daysUntilStockout = Math.floor(availableStock / avgDailySales);
    }
    
    res.json({
      product_id,
      branch_id,
      current_stock: availableStock,
      avg_daily_sales: avgDailySales,
      days_until_stockout: daysUntilStockout,
      status: daysUntilStockout !== null && daysUntilStockout <= 7 ? 'Critical' : 
              daysUntilStockout !== null && daysUntilStockout <= 30 ? 'Warning' : 'OK'
    });
  } catch (error) {
    console.error('Get days until stockout error:', error);
    res.status(500).json({ error: 'Failed to calculate days until stockout' });
  }
};

exports.getDemandForecast = async (req, res) => {
  try {
    const { product_id, branch_id } = req.params;
    const { days = 7 } = req.query;
    
    const [salesData] = await pool.query(`
      SELECT date, SUM(quantity_sold) as quantity_sold
      FROM sales
      WHERE product_id = ? AND branch_id = ?
        AND date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
      GROUP BY date
      ORDER BY date ASC
    `, [product_id, branch_id]);
    
    if (salesData.length < 3) {
      return res.json({
        product_id,
        branch_id,
        message: 'Insufficient historical data for forecasting',
        min_days_required: 3,
        available_days: salesData.length
      });
    }
    
    const quantities = salesData.map(s => s.quantity_sold);
    
    const last7Days = quantities.slice(-7);
    const avg7Day = last7Days.reduce((a, b) => a + b, 0) / last7Days.length;
    
    const avg30Day = quantities.reduce((a, b) => a + b, 0) / quantities.length;
    
    const n = quantities.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
    for (let i = 0; i < n; i++) {
      sumX += i;
      sumY += quantities[i];
      sumXY += i * quantities[i];
      sumX2 += i * i;
    }
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    
    const forecast = [];
    for (let i = 1; i <= parseInt(days); i++) {
      const predicted = Math.max(0, Math.round(slope * (n + i - 1) + intercept));
      const date = new Date();
      date.setDate(date.getDate() + i);
      forecast.push({
        date: date.toISOString().split('T')[0],
        predicted_demand: predicted
      });
    }
    
    const totalPredicted = forecast.reduce((sum, f) => sum + f.predicted_demand, 0);
    
    res.json({
      product_id,
      branch_id,
      moving_averages: {
        avg_7_day: Math.round(avg7Day * 100) / 100,
        avg_30_day: Math.round(avg30Day * 100) / 100
      },
      trend: {
        direction: slope > 0.1 ? 'increasing' : slope < -0.1 ? 'decreasing' : 'stable',
        slope: Math.round(slope * 1000) / 1000
      },
      forecast,
      predicted_total: totalPredicted,
      predicted_avg_daily: Math.round((totalPredicted / parseInt(days)) * 100) / 100
    });
  } catch (error) {
    console.error('Get demand forecast error:', error);
    res.status(500).json({ error: 'Failed to generate demand forecast' });
  }
};

exports.getExpiryRiskItems = async (req, res) => {
  res.json([]);
};
