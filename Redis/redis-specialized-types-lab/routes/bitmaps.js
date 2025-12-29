const express = require('express');
const router = express.Router();
const redis = require('../redis');

// Helper function to get date string
function getDateString(date = new Date()) {
  return date.toISOString().split('T')[0];
}

// Track daily active user
router.post('/dau/:date/users/:userId', async (req, res) => {
  try {
    const date = req.params.date;
    const userId = parseInt(req.params.userId);

    if (isNaN(userId) || userId < 0) {
      return res.status(400).json({ error: 'userId must be non-negative integer' });
    }

    const dauKey = `dau:${date}`;

    // Set bit at position userId to 1
    await redis.setbit(dauKey, userId, 1);

    // Set expiration (keep data for 90 days)
    await redis.expire(dauKey, 7776000);

    // Get total active users for this day
    const count = await redis.bitcount(dauKey);

    res.json({
      message: 'User activity tracked',
      date,
      userId,
      totalActiveUsers: count
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Check if user was active on a date
router.get('/dau/:date/users/:userId', async (req, res) => {
  try {
    const date = req.params.date;
    const userId = parseInt(req.params.userId);

    const dauKey = `dau:${date}`;

    // Get bit at position userId
    const active = await redis.getbit(dauKey, userId);

    res.json({
      date,
      userId,
      active: active === 1
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get daily active user count
router.get('/dau/:date', async (req, res) => {
  try {
    const date = req.params.date;
    const dauKey = `dau:${date}`;

    const count = await redis.bitcount(dauKey);

    // Get memory usage
    const memory = await redis.call('MEMORY', 'USAGE', dauKey);

    res.json({
      date,
      activeUsers: count,
      memoryBytes: memory
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Users active on both date1 AND date2
router.get('/dau/intersection/:date1/:date2', async (req, res) => {
  try {
    const date1 = req.params.date1;
    const date2 = req.params.date2;

    const key1 = `dau:${date1}`;
    const key2 = `dau:${date2}`;
    const destKey = `dau:temp:${Date.now()}`;

    // Perform AND operation
    await redis.bitop('AND', destKey, key1, key2);

    // Count bits in result
    const count = await redis.bitcount(destKey);

    // Clean up temporary key
    await redis.del(destKey);

    res.json({
      date1,
      date2,
      operation: 'AND',
      activeOnBothDays: count
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Users active on date1 OR date2
router.get('/dau/union/:date1/:date2', async (req, res) => {
  try {
    const date1 = req.params.date1;
    const date2 = req.params.date2;

    const key1 = `dau:${date1}`;
    const key2 = `dau:${date2}`;
    const destKey = `dau:temp:${Date.now()}`;

    // Perform OR operation
    await redis.bitop('OR', destKey, key1, key2);

    const count = await redis.bitcount(destKey);

    await redis.del(destKey);

    res.json({
      date1,
      date2,
      operation: 'OR',
      activeOnEitherDay: count
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Users active on date1 but NOT date2
router.get('/dau/difference/:date1/:date2', async (req, res) => {
  try {
    const date1 = req.params.date1;
    const date2 = req.params.date2;

    const key1 = `dau:${date1}`;
    const key2 = `dau:${date2}`;
    const notKey2 = `dau:temp:not:${Date.now()}`;
    const destKey = `dau:temp:${Date.now()}`;

    // NOT date2
    await redis.bitop('NOT', notKey2, key2);

    // AND with date1
    await redis.bitop('AND', destKey, key1, notKey2);

    const count = await redis.bitcount(destKey);

    await redis.del(notKey2, destKey);

    res.json({
      date1,
      date2,
      operation: 'date1 AND NOT date2',
      activeOnDate1ButNotDate2: count
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Calculate retention rate
router.get('/retention/:cohortDate/:returnDate', async (req, res) => {
  try {
    const cohortDate = req.params.cohortDate;
    const returnDate = req.params.returnDate;

    const cohortKey = `dau:${cohortDate}`;
    const returnKey = `dau:${returnDate}`;
    const destKey = `dau:temp:${Date.now()}`;

    // Get cohort size
    const cohortSize = await redis.bitcount(cohortKey);

    if (cohortSize === 0) {
      return res.json({
        cohortDate,
        returnDate,
        cohortSize: 0,
        retainedUsers: 0,
        retentionRate: 0
      });
    }

    // Users active on both dates
    await redis.bitop('AND', destKey, cohortKey, returnKey);
    const retainedUsers = await redis.bitcount(destKey);

    await redis.del(destKey);

    const retentionRate = (retainedUsers / cohortSize * 100).toFixed(2);

    res.json({
      cohortDate,
      returnDate,
      cohortSize,
      retainedUsers,
      retentionRate: `${retentionRate}%`
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Feature flags using bitmaps
router.post('/features/users/:userId', async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const { features } = req.body; // Array of feature names

    if (!Array.isArray(features)) {
      return res.status(400).json({ error: 'features array required' });
    }

    // Feature name to bit position mapping
    const featureMap = {
      'dark_mode': 0,
      'beta_features': 1,
      'premium': 2,
      'notifications': 3,
      'analytics': 4
    };

    const userKey = `user:${userId}:features`;

    // Set bits for enabled features
    for (const feature of features) {
      const bitPos = featureMap[feature];
      if (bitPos !== undefined) {
        await redis.setbit(userKey, bitPos, 1);
      }
    }

    res.json({
      message: 'Features enabled',
      userId,
      features
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Check if user has feature
router.get('/features/users/:userId/:feature', async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const feature = req.params.feature;

    const featureMap = {
      'dark_mode': 0,
      'beta_features': 1,
      'premium': 2,
      'notifications': 3,
      'analytics': 4
    };

    const bitPos = featureMap[feature];
    if (bitPos === undefined) {
      return res.status(400).json({ error: 'Unknown feature' });
    }

    const userKey = `user:${userId}:features`;

    const enabled = await redis.getbit(userKey, bitPos);

    res.json({
      userId,
      feature,
      enabled: enabled === 1
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all features for user
router.get('/features/users/:userId', async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);

    const featureMap = {
      'dark_mode': 0,
      'beta_features': 1,
      'premium': 2,
      'notifications': 3,
      'analytics': 4
    };

    const userKey = `user:${userId}:features`;

    const features = {};
    for (const [name, pos] of Object.entries(featureMap)) {
      const enabled = await redis.getbit(userKey, pos);
      features[name] = enabled === 1;
    }

    res.json({
      userId,
      features
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Bulk track multiple users (for testing)
router.post('/dau/:date/bulk', async (req, res) => {
  try {
    const date = req.params.date;
    const { userIds } = req.body;

    if (!Array.isArray(userIds)) {
      return res.status(400).json({ error: 'userIds array required' });
    }

    const dauKey = `dau:${date}`;

    // Set multiple bits
    const pipeline = redis.pipeline();
    for (const userId of userIds) {
      pipeline.setbit(dauKey, userId, 1);
    }
    await pipeline.exec();

    await redis.expire(dauKey, 7776000);

    const count = await redis.bitcount(dauKey);

    res.json({
      message: 'Bulk activity tracked',
      date,
      usersTracked: userIds.length,
      totalActiveUsers: count
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
