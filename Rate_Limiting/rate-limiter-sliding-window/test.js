const http = require('http');

function makeRequest() {
  return new Promise((resolve) => {
    const req = http.get('http://localhost:3000/', (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', (err) => resolve({ error: err.message }));
  });
}

async function test() {
  console.log('Testing rate limiter...\n');
  
  for (let i = 1; i <= 7; i++) {
    const result = await makeRequest();
    console.log(`Request ${i}: Status ${result.status} - ${result.body}`);
    await new Promise(resolve => setTimeout(resolve, 100)); // Small delay
  }
}
test();