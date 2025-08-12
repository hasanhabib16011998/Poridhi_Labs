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
  
  // Make 12 rapid requests to consume all tokens and trigger the limit
  for (let i = 1; i <= 12; i++) {
    const result = await makeRequest();
    console.log(`Request ${i}: Status ${result.status} - ${result.body}`);
    // No delay, to send requests as fast as possible
  }

  console.log('\nWaiting for 3 seconds to refill some tokens...\n');
  await new Promise(resolve => setTimeout(resolve, 3000));

  // Make 3 more requests to see if the bucket has refilled
  for (let i = 13; i <= 15; i++) {
    const result = await makeRequest();
    console.log(`Request ${i}: Status ${result.status} - ${result.body}`);
  }
}
test();