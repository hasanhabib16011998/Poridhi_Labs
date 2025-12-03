const express = require('express');
const redis = require('./redis');

const stringsRoutes = require('./routes/strings');
const listsRoutes = require('./routes/lists');
const setsRoutes = require('./routes/sets');

const app = express();
const PORT = 5000;

app.use(express.json());

// Mount routes
app.use('/api/strings', stringsRoutes);
app.use('/api/lists', listsRoutes);
app.use('/api/sets', setsRoutes);

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
