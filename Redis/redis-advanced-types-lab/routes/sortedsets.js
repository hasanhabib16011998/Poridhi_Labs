const express = require('express');
const router = express.Router();
const redis = require('../redis');

// Add or update player score
router.post('/leaderboard/players/:playerId/score', async (req, res) => {
  try {
    const playerId = req.params.playerId;
    const { score } = req.body;

    if (score === undefined) {
      return res.status(400).json({ error: 'score required' });
    }

    const leaderboardKey = 'leaderboard:global';

    // Add player with score (or update if exists)
    await redis.zadd(leaderboardKey, score, playerId);

    // Get player's rank (0-indexed, lower is better)
    const rank = await redis.zrevrank(leaderboardKey, playerId);

    res.json({
      message: 'Score updated',
      playerId,
      score,
      rank: rank + 1 // Convert to 1-indexed
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Increment player score
router.post('/leaderboard/players/:playerId/increment', async (req, res) => {
  try {
    const playerId = req.params.playerId;
    const { points } = req.body;

    if (points === undefined) {
      return res.status(400).json({ error: 'points required' });
    }

    const leaderboardKey = 'leaderboard:global';

    // Atomically increment score
    const newScore = await redis.zincrby(leaderboardKey, points, playerId);

    // Get updated rank
    const rank = await redis.zrevrank(leaderboardKey, playerId);

    res.json({
      message: 'Score incremented',
      playerId,
      points,
      newScore: parseFloat(newScore),
      rank: rank + 1
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get top N players
router.get('/leaderboard/top/:count', async (req, res) => {
  try {
    const count = parseInt(req.params.count) || 10;
    const leaderboardKey = 'leaderboard:global';

    // Get top players with scores (ZREVRANGE for descending order)
    const players = await redis.zrevrange(
      leaderboardKey, 
      0, 
      count - 1, 
      'WITHSCORES'
    );

    // Format response
    const leaderboard = [];
    for (let i = 0; i < players.length; i += 2) {
      leaderboard.push({
        rank: (i / 2) + 1,
        playerId: players[i],
        score: parseFloat(players[i + 1])
      });
    }

    res.json({
      leaderboard,
      count: leaderboard.length
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get player rank and score
router.get('/leaderboard/players/:playerId', async (req, res) => {
  try {
    const playerId = req.params.playerId;
    const leaderboardKey = 'leaderboard:global';

    // Get score
    const score = await redis.zscore(leaderboardKey, playerId);

    if (score === null) {
      return res.status(404).json({ error: 'Player not found' });
    }

    // Get rank (0-indexed, descending order)
    const rank = await redis.zrevrank(leaderboardKey, playerId);

    // Get total players
    const totalPlayers = await redis.zcard(leaderboardKey);

    res.json({
      playerId,
      score: parseFloat(score),
      rank: rank + 1,
      totalPlayers
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get players around a specific player
router.get('/leaderboard/players/:playerId/nearby', async (req, res) => {
  try {
    const playerId = req.params.playerId;
    const range = parseInt(req.query.range) || 2;
    const leaderboardKey = 'leaderboard:global';

    // Get player's rank
    const rank = await redis.zrevrank(leaderboardKey, playerId);

    if (rank === null) {
      return res.status(404).json({ error: 'Player not found' });
    }

    // Get players around this rank
    const start = Math.max(0, rank - range);
    const end = rank + range;

    const players = await redis.zrevrange(
      leaderboardKey,
      start,
      end,
      'WITHSCORES'
    );

    // Format response
    const nearby = [];
    for (let i = 0; i < players.length; i += 2) {
      nearby.push({
        rank: start + (i / 2) + 1,
        playerId: players[i],
        score: parseFloat(players[i + 1]),
        isCurrentPlayer: players[i] === playerId
      });
    }

    res.json({
      playerId,
      nearby
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get players by score range
router.get('/leaderboard/range', async (req, res) => {
  try {
    const { min, max } = req.query;

    if (min === undefined || max === undefined) {
      return res.status(400).json({ error: 'min and max query parameters required' });
    }

    const leaderboardKey = 'leaderboard:global';

    // Get players with scores in range
    const players = await redis.zrangebyscore(
      leaderboardKey,
      parseFloat(min),
      parseFloat(max),
      'WITHSCORES'
    );

    // Format response
    const results = [];
    for (let i = 0; i < players.length; i += 2) {
      results.push({
        playerId: players[i],
        score: parseFloat(players[i + 1])
      });
    }

    res.json({
      min: parseFloat(min),
      max: parseFloat(max),
      players: results,
      count: results.length
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Remove player from leaderboard
router.delete('/leaderboard/players/:playerId', async (req, res) => {
  try {
    const playerId = req.params.playerId;
    const leaderboardKey = 'leaderboard:global';

    const removed = await redis.zrem(leaderboardKey, playerId);

    if (!removed) {
      return res.status(404).json({ error: 'Player not found' });
    }

    res.json({
      message: 'Player removed from leaderboard',
      playerId
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Priority task queue using sorted sets
router.post('/tasks', async (req, res) => {
  try {
    const { task, priority } = req.body;

    if (!task || priority === undefined) {
      return res.status(400).json({ error: 'task and priority required' });
    }

    const taskId = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const queueKey = 'tasks:priority';

    const taskData = {
      id: taskId,
      task,
      createdAt: new Date().toISOString()
    };

    // Add task with priority as score (higher priority = higher score)
    await redis.zadd(queueKey, priority, JSON.stringify(taskData));

    // Get position in queue
    const rank = await redis.zrevrank(queueKey, JSON.stringify(taskData));

    res.status(201).json({
      message: 'Task added',
      taskId,
      priority,
      queuePosition: rank + 1
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get next high-priority task
router.get('/tasks/next', async (req, res) => {
  try {
    const queueKey = 'tasks:priority';

    // Get highest priority task (highest score)
    const tasks = await redis.zrevrange(queueKey, 0, 0, 'WITHSCORES');

    if (tasks.length === 0) {
      return res.json({
        message: 'Queue is empty',
        task: null
      });
    }

    const taskData = JSON.parse(tasks[0]);
    const priority = parseFloat(tasks[1]);

    // Remove task from queue
    await redis.zrem(queueKey, tasks[0]);

    res.json({
      message: 'Task retrieved',
      task: taskData,
      priority
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get queue status
router.get('/tasks/queue', async (req, res) => {
  try {
    const queueKey = 'tasks:priority';

    const queueSize = await redis.zcard(queueKey);

    // Get top 10 tasks
    const tasks = await redis.zrevrange(queueKey, 0, 9, 'WITHSCORES');

    const preview = [];
    for (let i = 0; i < tasks.length; i += 2) {
      preview.push({
        task: JSON.parse(tasks[i]),
        priority: parseFloat(tasks[i + 1])
      });
    }

    res.json({
      queueSize,
      preview
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Time-series data using sorted sets
router.post('/metrics/:metric', async (req, res) => {
  try {
    const metric = req.params.metric;
    const { value, timestamp } = req.body;

    if (value === undefined) {
      return res.status(400).json({ error: 'value required' });
    }

    const metricsKey = `metrics:${metric}`;
    const ts = timestamp || Date.now();

    // Use timestamp as score
    await redis.zadd(metricsKey, ts, `${ts}:${value}`);

    // Optional: Keep only last 1000 data points
    const count = await redis.zcard(metricsKey);
    if (count > 1000) {
      await redis.zremrangebyrank(metricsKey, 0, count - 1001);
    }

    res.json({
      message: 'Metric recorded',
      metric,
      value,
      timestamp: ts
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get metrics in time range
router.get('/metrics/:metric/range', async (req, res) => {
  try {
    const metric = req.params.metric;
    const { start, end } = req.query;

    if (!start || !end) {
      return res.status(400).json({ error: 'start and end timestamps required' });
    }

    const metricsKey = `metrics:${metric}`;

    // Get data points in time range
    const data = await redis.zrangebyscore(
      metricsKey,
      parseFloat(start),
      parseFloat(end)
    );

    // Parse data points
    const points = data.map(point => {
      const [timestamp, value] = point.split(':');
      return {
        timestamp: parseInt(timestamp),
        value: parseFloat(value),
        date: new Date(parseInt(timestamp)).toISOString()
      };
    });

    res.json({
      metric,
      start: parseInt(start),
      end: parseInt(end),
      points,
      count: points.length
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get latest N metrics
router.get('/metrics/:metric/latest/:count', async (req, res) => {
  try {
    const metric = req.params.metric;
    const count = parseInt(req.params.count) || 10;

    const metricsKey = `metrics:${metric}`;

    // Get latest data points
    const data = await redis.zrevrange(metricsKey, 0, count - 1);

    // Parse data points
    const points = data.map(point => {
      const [timestamp, value] = point.split(':');
      return {
        timestamp: parseInt(timestamp),
        value: parseFloat(value),
        date: new Date(parseInt(timestamp)).toISOString()
      };
    });

    res.json({
      metric,
      points,
      count: points.length
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Daily active users tracking
router.post('/analytics/dau/:userId', async (req, res) => {
  try {
    const userId = req.params.userId;
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const dauKey = `dau:${today}`;

    // Add user to today's set with timestamp as score
    const timestamp = Date.now();
    await redis.zadd(dauKey, timestamp, userId);

    // Expire the key after 7 days
    await redis.expire(dauKey, 604800);

    // Get today's DAU count
    const count = await redis.zcard(dauKey);

    res.json({
      message: 'User activity recorded',
      userId,
      date: today,
      dauCount: count
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get DAU for a date
router.get('/analytics/dau/:date', async (req, res) => {
  try {
    const date = req.params.date;
    const dauKey = `dau:${date}`;

    const count = await redis.zcard(dauKey);
    const users = await redis.zrange(dauKey, 0, -1);

    res.json({
      date,
      dauCount: count,
      users
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
