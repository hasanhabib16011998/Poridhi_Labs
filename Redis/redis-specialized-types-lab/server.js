const express = require('express');
const redis = require('./redis');

const bitmapsRoutes = require('./routes/bitmaps');
const hyperloglogRoutes = require('./routes/hyperloglog');
const geoRoutes = require('./routes/geo');

const app = express();
const PORT = 5000;

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));


// Mount routes
app.use('/api/bitmaps', bitmapsRoutes);
app.use('/api/hll', hyperloglogRoutes);
app.use('/api/geo', geoRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    redis: redis.status 
  });
});

app.listen(PORT, () => {
  console.log(`\n Server running on http://localhost:${PORT}`);
  console.log(` Health: http://localhost:${PORT}/health\n`);
});
