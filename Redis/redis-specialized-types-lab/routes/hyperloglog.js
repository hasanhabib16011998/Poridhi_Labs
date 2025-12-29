const express = require('express');
const router = express.Router();
const redis = require('../redis');

// Track unique visitor
router.post('/visitors/:page', async (req, res) => {
  try {
    const page = req.params.page;
    const { visitorId } = req.body;

    if (!visitorId) {
      return res.status(400).json({ error: 'visitorId required' });
    }

    const hllKey = `visitors:${page}`;

    // Add visitor to HyperLogLog
    await redis.pfadd(hllKey, visitorId);

    // Get estimated count
    const count = await redis.pfcount(hllKey);

    res.json({
      message: 'Visitor tracked',
      page,
      visitorId,
      uniqueVisitors: count
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get unique visitor count for page
router.get('/visitors/:page', async (req, res) => {
  try {
    const page = req.params.page;
    const hllKey = `visitors:${page}`;

    const count = await redis.pfcount(hllKey);

    // Get memory usage
    const memory = await redis.call('MEMORY', 'USAGE', hllKey);

    res.json({
      page,
      uniqueVisitors: count,
      memoryBytes: memory || 0
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Track hourly unique visitors
router.post('/hourly/:date/:hour', async (req, res) => {
  try {
    const date = req.params.date;
    const hour = req.params.hour;
    const { visitorId } = req.body;

    if (!visitorId) {
      return res.status(400).json({ error: 'visitorId required' });
    }

    const hllKey = `hourly:${date}:${hour}`;

    await redis.pfadd(hllKey, visitorId);

    // Set expiration (keep hourly data for 7 days)
    await redis.expire(hllKey, 604800);

    const count = await redis.pfcount(hllKey);

    res.json({
      message: 'Hourly visitor tracked',
      date,
      hour,
      uniqueVisitors: count
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get daily unique visitors by merging hourly HLLs
router.get('/daily/:date', async (req, res) => {
  try {
    const date = req.params.date;

    // Create keys for all 24 hours
    const hourlyKeys = [];
    for (let hour = 0; hour < 24; hour++) {
      hourlyKeys.push(`hourly:${date}:${hour.toString().padStart(2, '0')}`);
    }

    const dailyKey = `daily:${date}:merged`;

    // Merge all hourly HLLs into daily HLL
    await redis.pfmerge(dailyKey, ...hourlyKeys);

    // Get count from merged HLL
    const count = await redis.pfcount(dailyKey);

    // Set expiration on merged result
    await redis.expire(dailyKey, 2592000); // 30 days

    res.json({
      date,
      uniqueVisitors: count,
      hoursAggregated: 24
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Track campaign visitors
router.post('/campaigns/:campaignId', async (req, res) => {
  try {
    const campaignId = req.params.campaignId;
    const { visitorId } = req.body;

    if (!visitorId) {
      return res.status(400).json({ error: 'visitorId required' });
    }

    const hllKey = `campaign:${campaignId}`;

    await redis.pfadd(hllKey, visitorId);

    const count = await redis.pfcount(hllKey);

    res.json({
      message: 'Campaign visitor tracked',
      campaignId,
      uniqueVisitors: count
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Compare unique visitors across multiple campaigns
router.get('/campaigns/compare', async (req, res) => {
  try {
    const { campaigns } = req.query; // Comma-separated campaign IDs

    if (!campaigns) {
      return res.status(400).json({ error: 'campaigns query parameter required' });
    }

    const campaignIds = campaigns.split(',');
    const results = [];

    for (const campaignId of campaignIds) {
      const hllKey = `campaign:${campaignId}`;
      const count = await redis.pfcount(hllKey);
      results.push({
        campaignId,
        uniqueVisitors: count
      });
    }

    res.json({
      campaigns: results
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get unique visitors across all campaigns (union)
router.get('/campaigns/total', async (req, res) => {
  try {
    const { campaigns } = req.query;

    if (!campaigns) {
      return res.status(400).json({ error: 'campaigns query parameter required' });
    }

    const campaignIds = campaigns.split(',');
    const campaignKeys = campaignIds.map(id => `campaign:${id}`);
    const mergedKey = `campaigns:merged:${Date.now()}`;

    // Merge all campaign HLLs
    await redis.pfmerge(mergedKey, ...campaignKeys);

    const count = await redis.pfcount(mergedKey);

    // Clean up temporary key
    await redis.del(mergedKey);

    res.json({
      campaigns: campaignIds,
      totalUniqueVisitors: count
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Bulk add visitors (for testing)
router.post('/visitors/:page/bulk', async (req, res) => {
  try {
    const page = req.params.page;
    const { visitorIds } = req.body;

    if (!Array.isArray(visitorIds)) {
      return res.status(400).json({ error: 'visitorIds array required' });
    }

    const hllKey = `visitors:${page}`;

    // Add multiple visitors at once
    await redis.pfadd(hllKey, ...visitorIds);

    const count = await redis.pfcount(hllKey);

    res.json({
      message: 'Bulk visitors tracked',
      page,
      visitorsAdded: visitorIds.length,
      uniqueVisitors: count
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Demonstrate HyperLogLog accuracy
router.post('/accuracy-test', async (req, res) => {
  try {
    const { count } = req.body;
    const testCount = count || 10000;

    const hllKey = 'test:accuracy';
    const setKey = 'test:accuracy:set';

    // Clear any existing test data
    await redis.del(hllKey, setKey);

    // Add same elements to both HLL and Set
    const visitors = [];
    for (let i = 0; i < testCount; i++) {
      visitors.push(`visitor_${i}`);
    }

    // Add to HLL
    await redis.pfadd(hllKey, ...visitors);

    // Add to Set (for exact count comparison)
    await redis.sadd(setKey, ...visitors);

    // Get counts
    const hllCount = await redis.pfcount(hllKey);
    const exactCount = await redis.scard(setKey);

    // Get memory usage
    const hllMemory = await redis.call('MEMORY', 'USAGE', hllKey);
    const setMemory = await redis.call('MEMORY', 'USAGE', setKey);

    const error = Math.abs(hllCount - exactCount);
    const errorPercent = ((error / exactCount) * 100).toFixed(4);

    // Clean up
    await redis.del(hllKey, setKey);

    res.json({
      uniqueElements: exactCount,
      hllEstimate: hllCount,
      error,
      errorPercent: `${errorPercent}%`,
      hllMemoryBytes: hllMemory,
      setMemoryBytes: setMemory,
      memorySavings: `${((1 - hllMemory / setMemory) * 100).toFixed(2)}%`
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
