const jwt = require('jsonwebtoken');
const { pool } = require('../config/db');

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    console.log('Auth: Token received');
    
    // Verify JWT
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log('Auth: Token verified, userId:', decoded.userId);
    } catch (e) {
      console.log('Auth: Token verify failed:', e.message);
      return res.status(401).json({ error: 'Invalid token' });
    }
    
    // Get user from database
    const [users] = await pool.query(
      'SELECT id, username, email, role, branch_id FROM users WHERE id = ?',
      [decoded.userId]
    );

    if (users.length === 0) {
      console.log('Auth: User not found');
      return res.status(401).json({ error: 'User not found' });
    }
    
    console.log('Auth: User found:', users[0].username);

    req.user = users[0];
    console.log('Auth: Calling next()');
    next();
  } catch (error) {
    console.log('Auth error:', error.message);
    res.status(500).json({ error: 'Authentication error' });
  }
};

const roleMiddleware = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    next();
  };
};

module.exports = { authMiddleware, roleMiddleware };