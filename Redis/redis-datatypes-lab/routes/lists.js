const express = require('express');
const router = express.Router();
const redis = require('../redis');

// Add task to queue
router.post('/tasks', async (req, res) => {
  try {
    const { type, payload } = req.body;

    if (!type || !payload) {
      return res.status(400).json({ error: 'type and payload required' });
    }

    const task = {
      id: `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      payload,
      createdAt: new Date().toISOString(),
      status: 'pending'
    };

    // Push task to the right end of the queue
    await redis.rpush('task:queue', JSON.stringify(task));

    // Get queue length
    const queueLength = await redis.llen('task:queue');

    res.status(201).json({
      message: 'Task added to queue',
      task,
      queueLength
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get next task from queue (worker simulation)
router.get('/tasks/next', async (req, res) => {
  try {
    // Pop task from the left end of the queue
    const taskData = await redis.lpop('task:queue');

    if (!taskData) {
      return res.json({
        message: 'Queue is empty',
        task: null
      });
    }

    const task = JSON.parse(taskData);

    // In a real system, you'd mark this task as processing
    // and add it to a processing list

    res.json({
      message: 'Task retrieved',
      task
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get queue status
router.get('/tasks/queue', async (req, res) => {
  try {
    const queueLength = await redis.llen('task:queue');
    
    // Get first 10 tasks without removing them
    const tasks = await redis.lrange('task:queue', 0, 9);
    const parsedTasks = tasks.map(task => JSON.parse(task));

    res.json({
      queueLength,
      preview: parsedTasks
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Activity feed - add activity
router.post('/feed/:userId', async (req, res) => {
  try {
    const userId = req.params.userId;
    const { activity } = req.body;

    if (!activity) {
      return res.status(400).json({ error: 'activity required' });
    }

    const feedKey = `feed:${userId}`;
    const activityItem = {
      activity,
      timestamp: new Date().toISOString()
    };

    // Add to the left (most recent)
    await redis.lpush(feedKey, JSON.stringify(activityItem));

    // Keep only the 50 most recent activities
    await redis.ltrim(feedKey, 0, 49);

    res.json({
      message: 'Activity added',
      activity: activityItem
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get activity feed
router.get('/feed/:userId', async (req, res) => {
  try {
    const userId = req.params.userId;
    const feedKey = `feed:${userId}`;
    const limit = parseInt(req.query.limit) || 10;

    const activities = await redis.lrange(feedKey, 0, limit - 1);
    const parsedActivities = activities.map(item => JSON.parse(item));

    res.json({
      userId,
      activities: parsedActivities,
      count: parsedActivities.length
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Recent notifications with expiration
router.post('/notifications/:userId', async (req, res) => {
  try {
    const userId = req.params.userId;
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'message required' });
    }

    const notifKey = `notifications:${userId}`;
    const notification = {
      message,
      timestamp: new Date().toISOString(),
      read: false
    };

    await redis.lpush(notifKey, JSON.stringify(notification));
    await redis.ltrim(notifKey, 0, 99); // Keep last 100
    
    // Set expiration on the list (30 days)
    await redis.expire(notifKey, 2592000);

    res.json({
      message: 'Notification added',
      notification
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get notifications
router.get('/notifications/:userId', async (req, res) => {
  try {
    const userId = req.params.userId;
    const notifKey = `notifications:${userId}`;

    const notifications = await redis.lrange(notifKey, 0, -1);
    const parsedNotifications = notifications.map(n => JSON.parse(n));

    res.json({
      userId,
      notifications: parsedNotifications,
      count: parsedNotifications.length
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
