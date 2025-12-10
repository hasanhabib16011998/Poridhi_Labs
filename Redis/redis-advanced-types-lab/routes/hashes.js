const express = require('express');
const router = express.Router();
const redis = require('../redis');

// Create or update user using Hash
router.post('/users/:id', async (req, res) => {
  try {
    const userId = req.params.id;
    const { name, email, age, city } = req.body;

    if (!name || !email) {
      return res.status(400).json({ error: 'name and email required' });
    }

    const userKey = `user:${userId}`;

    // Store user fields in hash
    await redis.hset(userKey, {
      name,
      email,
      age: age || '',
      city: city || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    res.status(201).json({
      message: 'User created',
      userId
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get complete user
router.get('/users/:id', async (req, res) => {
  try {
    const userId = req.params.id;
    const userKey = `user:${userId}`;

    // Get all fields and values from hash
    const user = await redis.hgetall(userKey);

    if (Object.keys(user).length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      userId,
      user
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get specific user fields
router.get('/users/:id/fields', async (req, res) => {
  try {
    const userId = req.params.id;
    const fields = req.query.fields; // e.g., ?fields=name,email

    if (!fields) {
      return res.status(400).json({ error: 'fields query parameter required' });
    }

    const userKey = `user:${userId}`;
    const fieldArray = fields.split(',');

    // Get multiple specific fields
    const values = await redis.hmget(userKey, ...fieldArray);

    // Check if user exists
    if (values.every(v => v === null)) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Build response object
    const result = {};
    fieldArray.forEach((field, index) => {
      result[field] = values[index];
    });

    res.json({
      userId,
      fields: result
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update specific user field
router.patch('/users/:id/fields/:field', async (req, res) => {
  try {
    const userId = req.params.id;
    const field = req.params.field;
    const { value } = req.body;

    if (value === undefined) {
      return res.status(400).json({ error: 'value required' });
    }

    const userKey = `user:${userId}`;

    // Check if user exists
    const exists = await redis.exists(userKey);
    if (!exists) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Update single field
    await redis.hset(userKey, field, value);
    await redis.hset(userKey, 'updatedAt', new Date().toISOString());

    res.json({
      message: 'Field updated',
      userId,
      field,
      value
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete user field
router.delete('/users/:id/fields/:field', async (req, res) => {
  try {
    const userId = req.params.id;
    const field = req.params.field;
    const userKey = `user:${userId}`;

    const deleted = await redis.hdel(userKey, field);

    if (!deleted) {
      return res.status(404).json({ error: 'Field not found' });
    }

    await redis.hset(userKey, 'updatedAt', new Date().toISOString());

    res.json({
      message: 'Field deleted',
      userId,
      field
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Check if field exists
router.get('/users/:id/fields/:field/exists', async (req, res) => {
  try {
    const userId = req.params.id;
    const field = req.params.field;
    const userKey = `user:${userId}`;

    const exists = await redis.hexists(userKey, field);

    res.json({
      userId,
      field,
      exists: exists === 1
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Increment user counter field
router.post('/users/:id/increment/:field', async (req, res) => {
  try {
    const userId = req.params.id;
    const field = req.params.field;
    const { amount } = req.body;

    const userKey = `user:${userId}`;

    // Atomically increment field
    const newValue = await redis.hincrby(userKey, field, amount || 1);

    res.json({
      message: 'Field incremented',
      userId,
      field,
      newValue
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Product inventory management using hashes
router.post('/products/:id', async (req, res) => {
  try {
    const productId = req.params.id;
    const { name, price, stock, category } = req.body;

    if (!name || price === undefined || stock === undefined) {
      return res.status(400).json({ error: 'name, price, and stock required' });
    }

    const productKey = `product:${productId}`;

    await redis.hset(productKey, {
      name,
      price: price.toString(),
      stock: stock.toString(),
      category: category || 'general',
      createdAt: new Date().toISOString()
    });

    res.status(201).json({
      message: 'Product created',
      productId
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get product
router.get('/products/:id', async (req, res) => {
  try {
    const productId = req.params.id;
    const productKey = `product:${productId}`;

    const product = await redis.hgetall(productKey);

    if (Object.keys(product).length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json({
      productId,
      product: {
        ...product,
        price: parseFloat(product.price),
        stock: parseInt(product.stock)
      }
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update product stock (decrement for purchase)
router.post('/products/:id/purchase', async (req, res) => {
  try {
    const productId = req.params.id;
    const { quantity } = req.body;

    if (!quantity || quantity < 1) {
      return res.status(400).json({ error: 'valid quantity required' });
    }

    const productKey = `product:${productId}`;

    // Check if product exists
    const exists = await redis.exists(productKey);
    if (!exists) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Get current stock
    const currentStock = await redis.hget(productKey, 'stock');
    
    if (parseInt(currentStock) < quantity) {
      return res.status(400).json({ 
        error: 'Insufficient stock',
        available: parseInt(currentStock)
      });
    }

    // Atomically decrement stock
    const newStock = await redis.hincrby(productKey, 'stock', -quantity);

    res.json({
      message: 'Purchase successful',
      productId,
      quantity,
      remainingStock: newStock
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Session data with hash and expiration
router.post('/sessions', async (req, res) => {
  try {
    const { userId, metadata } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'userId required' });
    }

    const sessionId = `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const sessionKey = `session:${sessionId}`;

    // Store session data in hash
    await redis.hset(sessionKey, {
      userId,
      ip: req.ip || 'unknown',
      userAgent: req.get('user-agent') || 'unknown',
      metadata: JSON.stringify(metadata || {}),
      createdAt: new Date().toISOString(),
      lastAccess: new Date().toISOString()
    });

    // Set expiration (30 minutes)
    await redis.expire(sessionKey, 1800);

    res.json({
      sessionId,
      expiresIn: 1800
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get session
router.get('/sessions/:id', async (req, res) => {
  try {
    const sessionId = req.params.id;
    const sessionKey = `session:${sessionId}`;

    const session = await redis.hgetall(sessionKey);

    if (Object.keys(session).length === 0) {
      return res.status(404).json({ error: 'Session not found or expired' });
    }

    // Update last access time
    await redis.hset(sessionKey, 'lastAccess', new Date().toISOString());

    // Refresh expiration
    await redis.expire(sessionKey, 1800);

    const ttl = await redis.ttl(sessionKey);

    res.json({
      sessionId,
      session: {
        ...session,
        metadata: JSON.parse(session.metadata)
      },
      expiresIn: ttl
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// User statistics using Hash with atomic increments
router.post('/stats/users/:userId/:action', async (req, res) => {
  try {
    const userId = req.params.userId;
    const action = req.params.action; // e.g., 'posts', 'likes', 'comments'

    const statsKey = `stats:user:${userId}`;

    // Atomically increment action counter
    const newCount = await redis.hincrby(statsKey, action, 1);

    // Also increment total actions
    await redis.hincrby(statsKey, 'totalActions', 1);

    // Get all stats
    const stats = await redis.hgetall(statsKey);

    res.json({
      userId,
      action,
      newCount,
      allStats: stats
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


module.exports = router;