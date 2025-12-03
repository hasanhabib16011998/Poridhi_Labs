const express = require('express');
const router = express.Router();
const redis = require('../redis');

// Simulate an expensive database query
function expensiveDatabaseQuery(userId) {
  // In reality, this would query a database
  // We'll simulate with a delay and mock data
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        id: userId,
        name: `User ${userId}`,
        email: `user${userId}@example.com`,
        profile: {
          bio: 'Lorem ipsum dolor sit amet',
          interests: ['coding', 'redis', 'nodejs']
        },
        fetchedAt: new Date().toISOString()
      });
    }, 1000); // 1 second delay to simulate slow query
  });
}

// Get user with caching
router.get('/users/:id', async (req, res) => {
  try {
    const userId = req.params.id;
    const cacheKey = `user:${userId}`;

    // Try to get from cache first
    const cachedUser = await redis.get(cacheKey);

    if (cachedUser) {
      console.log(`Cache HIT for user ${userId}`);
      return res.json({
        source: 'cache',
        data: JSON.parse(cachedUser)
      });
    }

    // Cache miss - fetch from "database"
    console.log(`Cache MISS for user ${userId} - fetching from database`);
    const userData = await expensiveDatabaseQuery(userId);

    // Store in cache with 60 second expiration
    await redis.setex(cacheKey, 60, JSON.stringify(userData));

    res.json({
      source: 'database',
      data: userData
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Page view counter
router.post('/pageviews/:page', async (req, res) => {
  try {
    const page = req.params.page;
    const counterKey = `pageviews:${page}`;

    // Atomically increment counter
    const newCount = await redis.incr(counterKey);

    res.json({
      page,
      views: newCount
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get page view count
router.get('/pageviews/:page', async (req, res) => {
  try {
    const page = req.params.page;
    const counterKey = `pageviews:${page}`;

    const count = await redis.get(counterKey);

    res.json({
      page,
      views: parseInt(count) || 0
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Session management
router.post('/sessions', async (req, res) => {
  try {
    const { userId, data } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'userId required' });
    }

    // Generate session ID
    const sessionId = `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const sessionKey = `session:${sessionId}`;

    // Store session with 30 minute expiration
    const sessionData = {
      userId,
      data: data || {},
      createdAt: new Date().toISOString()
    };

    await redis.setex(sessionKey, 1800, JSON.stringify(sessionData));

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

    const sessionData = await redis.get(sessionKey);

    if (!sessionData) {
      return res.status(404).json({ error: 'Session not found or expired' });
    }

    // Get remaining TTL
    const ttl = await redis.ttl(sessionKey);

    res.json({
      sessionId,
      data: JSON.parse(sessionData),
      expiresIn: ttl
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete session (logout)
router.delete('/sessions/:id', async (req, res) => {
  try {
    const sessionId = req.params.id;
    const sessionKey = `session:${sessionId}`;

    const deleted = await redis.del(sessionKey);

    if (!deleted) {
      return res.status(404).json({ error: 'Session not found' });
    }

    res.json({ message: 'Session deleted successfully' });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Rate limiting with sliding window
router.post('/ratelimit/:userId', async (req, res) => {
  try {
    const userId = req.params.userId;
    const limit = 10; // 10 requests
    const window = 60; // per 60 seconds
    const key = `ratelimit:${userId}`;

    // Get current count
    const current = await redis.get(key);

    if (current && parseInt(current) >= limit) {
      const ttl = await redis.ttl(key);
      return res.status(429).json({
        error: 'Rate limit exceeded',
        retryAfter: ttl
      });
    }

    // Increment counter
    const newCount = await redis.incr(key);

    // Set expiration on first request
    if (newCount === 1) {
      await redis.expire(key, window);
    }

    const remaining = limit - newCount;

    res.json({
      message: 'Request accepted',
      remaining,
      resetsIn: await redis.ttl(key)
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// One-time password (OTP) with expiration
router.post('/otp/generate/:userId', async (req, res) => {
  try {
    const userId = req.params.userId;
    const otp = Math.floor(100000 + Math.random() * 900000); // 6-digit code
    const key = `otp:${userId}`;

    // Store OTP with 5-minute expiration
    await redis.setex(key, 300, otp.toString());

    res.json({
      message: 'OTP generated',
      otp, // In production, send via SMS/email instead
      expiresIn: 300
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Verify OTP
router.post('/otp/verify/:userId', async (req, res) => {
  try {
    const userId = req.params.userId;
    const { otp } = req.body;
    const key = `otp:${userId}`;

    const storedOtp = await redis.get(key);

    if (!storedOtp) {
      return res.status(400).json({ error: 'OTP expired or not found' });
    }

    if (storedOtp !== otp.toString()) {
      return res.status(400).json({ error: 'Invalid OTP' });
    }

    // Delete OTP after successful verification (single use)
    await redis.del(key);

    res.json({ message: 'OTP verified successfully' });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});



module.exports = router;
