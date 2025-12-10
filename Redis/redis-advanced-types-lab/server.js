const express = require('express');
const redis = require('./redis');

const hashesRoutes = require('./routes/hashes');
const sortedSetsRoutes = require('./routes/sortedsets');

const app = express();
const PORT = 5000;

app.use(express.json());

// Mount routes
app.use('/api/hashes', hashesRoutes);
app.use('/api/sortedsets', sortedSetsRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    redis: redis.status 
  });
});

app.listen(PORT, () => {
  console.log(`\n🚀 Server running on http://localhost:${PORT}`);
  console.log(`📊 Health: http://localhost:${PORT}/health\n`);
});
