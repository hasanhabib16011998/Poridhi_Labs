const express = require('express');
const jwt = require('jsonwebtoken');
const JWT_SECRET = 'poridhi-lab-secret';
const rateLimitWindowMs = 60 * 1000; // 1 minute
const userTiers = {
  guest: { limit: 1 },
  free: { limit: 3 },
  pro: { limit: 5 },
};

// --- MOCK DATABASE ---
const mockUsers = [
  { id: 'user-free-123', username: 'free_user', password: 'password', tier: 'free' },
  { id: 'user-pro-456', username: 'pro_user', password: 'password', tier: 'pro' },
];
const requestTracker = {}; // { 'id': { count: Number, startTime: Timestamp } }

const app = express();

// Parse URL-encoded bodies for the /login route
app.use(express.urlencoded({ extended: true }));

// --- MIDDLEWARE ---
const rateLimitMiddleware = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer <token>
  const ip = req.socket.remoteAddress;
  const currentTime = Date.now();
  let userId;
  let userTier;

  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      userId = decoded.id;
      userTier = userTiers[decoded.tier] || userTiers.guest;
    } catch (err) {
      userId = ip;
      userTier = userTiers.guest;
    }
  } else {
    userId = ip;
    userTier = userTiers.guest;
  }

  if (!requestTracker[userId]) {
    requestTracker[userId] = { count: 1, startTime: currentTime };
  } else {
    const windowData = requestTracker[userId];
    const timePassed = currentTime - windowData.startTime;
    if (timePassed < rateLimitWindowMs) {
      windowData.count++;
    } else {
      windowData.count = 1;
      windowData.startTime = currentTime;
    }
  }

  if (requestTracker[userId].count > userTier.limit) {
    return res.status(429).send(`Too many requests. Limit is ${userTier.limit} per minute.`);
  }

  next();
};

// --- ROUTES ---
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  const user = mockUsers.find(u => u.username === username && u.password === password);
  
  if (user) {
    const token = jwt.sign({ id: user.id, tier: user.tier }, JWT_SECRET, { expiresIn: '1h' });
    res.json({ token });
  } else {
    res.status(401).send('Invalid credentials');
  }
});

// Protected Data Endpoint (has rate limiting)
app.get('/data', rateLimitMiddleware, (req, res) => {
  res.send('Here is your protected data!');
});

// Default response
app.use((req, res) => {
  res.status(404).send('Not Found');
});

app.listen(3000, () => {
  console.log('Server running at http://localhost:3000');
});