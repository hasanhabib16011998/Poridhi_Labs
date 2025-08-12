const http = require('http');

const bucketCapacity = 10;
const refillRate = 1; // 1 token per second
const ipBuckets = new Map(); // Using a Map is slightly better for this

const rateLimitMiddleware = (req, res) => {
  const ip = req.socket.remoteAddress;
  const currentTime = Date.now();

  if (!ipBuckets.has(ip)) {
    ipBuckets.set(ip, { tokens: bucketCapacity, lastRefillTime: currentTime });
  }

  const bucket = ipBuckets.get(ip);
  const timePassed = (currentTime - bucket.lastRefillTime) / 1000; // in seconds
  const newTokens = timePassed * refillRate;

  bucket.tokens = Math.min(bucketCapacity, bucket.tokens + newTokens);
  bucket.lastRefillTime = currentTime;

  if (bucket.tokens >= 1) {
    bucket.tokens--;
    ipBuckets.set(ip, bucket);
    return true; // Allow request
  } else {
    res.statusCode = 429;
    res.setHeader('Content-Type', 'text/plain');
    res.end('Too many requests. Try again later.');
    return false; // Reject request
  }
};

const server = http.createServer((req, res) => {
  if (!rateLimitMiddleware(req, res)) return;

  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/plain');
  res.end('Hello, world!');
});

server.listen(3000, () => {
  console.log('Server running at http://localhost:3000');
});