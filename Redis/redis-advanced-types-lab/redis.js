const Redis = require('ioredis');

const redis = new Redis({
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: process.env.REDIS_PORT || 6379,
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  maxRetriesPerRequest: 3
});

redis.on('connect', () => {
  console.log('✓ Redis client connected');
});

redis.on('ready', () => {
  console.log('✓ Redis client ready');
});

redis.on('error', (err) => {
  console.error('✗ Redis error:', err.message);
});

process.on('SIGINT', async () => {
  console.log('\nShutting down gracefully...');
  await redis.quit();
  process.exit(0);
});

module.exports = redis;
