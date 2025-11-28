const express = require("express");
const redis = require("redis");

const client = redis.createClient({
    host:"localhost",
    port:"6379"
});

client.connect();

const app = express();

const fibonacci = (n) => {
    if(n<2) return n;
    return fibonacci(n-1)+fibonacci(n-2);
};

app.get("/fib/:num", async(req,res)=>{
    const num = parseInt(req.params.num);
    let result_cache;
    result_cache = await client.get(`fib-${num}`);
    console.log(result_cache);
    if(result_cache == null){
        result_cache = fibonacci(num);
        const cacheKey = `fib-${num}`;
        client.set(cacheKey, result_cache);
    }
    res.json({ result_cache });
})

app.listen(3000,()=> {
    console.log("listening on port 3000...")
})