const http = require('http');
const rateLimitWindowMs = 60 * 1000; // 1 minute
const maxRequestsPerWindow = 5;
const ipRequests = {}; // { 'ip': [Timestamp, Timestamp, ...] }

const rateLimitMiddleware = (req, res) => {
  const ip = req.socket.remoteAddress;
  const currentTime = Date.now();

  // Initialize if IP is new
  if (!ipRequests[ip]) {
    ipRequests[ip] = [];
  }

  // Remove timestamps that are outside the current window
  ipRequests[ip] = ipRequests[ip].filter(timestamp => {
    return currentTime - timestamp < rateLimitWindowMs;
  });

  // Check if the request count exceeds the limit
  if (ipRequests[ip].length >= maxRequestsPerWindow) {
    res.statusCode = 429;
    res.setHeader('Content-Type', 'text/plain');
    res.end('Too many requests. Try again later.');
    return false; // Don't proceed
  } else {
    // Add the new request timestamp and allow the request
    ipRequests[ip].push(currentTime);
    return true; // Allow request
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