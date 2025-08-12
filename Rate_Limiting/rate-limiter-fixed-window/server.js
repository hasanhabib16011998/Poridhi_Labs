const http = require('http');
const rateLimitWindowMs = 60 * 1000; // 1 minute
const maxRequestsPerWindow = 5;
const ipRequests = {}; // { 'ip': { count: Number, startTime: Timestamp } }

const rateLimitMiddleware = (req, res) => {
  const ip = req.socket.remoteAddress;
  const currentTime = Date.now();
  if (!ipRequests[ip]) {
    ipRequests[ip] = { count: 1, startTime: currentTime };
  } else {
    const timePassed = currentTime - ipRequests[ip].startTime;
    if (timePassed < rateLimitWindowMs) {
      ipRequests[ip].count++;
    } else {
      // Window reset
      ipRequests[ip].count = 1;
      ipRequests[ip].startTime = currentTime;
    }
  }
  if (ipRequests[ip].count > maxRequestsPerWindow) {
    res.statusCode = 429;
    res.setHeader('Content-Type', 'text/plain');
    res.end('Too many requests. Try again later.');
    return false; // Don't proceed to handler
  }
  return true; // Allow request
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