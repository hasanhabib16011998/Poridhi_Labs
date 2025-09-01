import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

const app = express();
const SECRET = 'aerifaeirfbhik';
app.use(cors());
app.use(bodyParser.json());

import { generateText } from 'ai';
import { google } from '@ai-sdk/google';
const model = google('gemini-2.0-flash');

const rateLimitWindowMs = 60 * 1000; // 1 minute
const userTiers = {
    guest: { limit: 3 },
    free: { limit: 10 },
    premium: { limit: 50 },
};

// --- MOCK DATABASE ---
const mockUsers = [
    { id: 'user-free-123', email: 'free123@gmail.com', password: 'password', tier: 'free' },
    { id: 'user-pro-456', email: 'premium456@gmail.com', password: 'password', tier: 'premium' },
];

const requestTracker = {}; // { 'id': { count: Number, startTime: Timestamp } }

// --- IDENTIFY MIDDLEWARE ---
function identifyUser(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer <token>
    const ip = req.socket.remoteAddress;
    let userId, tier;

    if (token) {
        try {
            const decoded = jwt.verify(token, SECRET);
            userId = decoded.id;
            // For backwards compatibility if you ever change the token payload
            tier = userTiers[decoded.userTier] || userTiers.guest;
        } catch (err) {
            userId = ip;
            tier = userTiers.guest;
        }
    } else {
        userId = ip;
        tier = userTiers.guest;
    }

    req.userId = userId;
    req.userTier = tier;
    req.userIp = ip;
    next();
}

// --- LOGIN ---
app.post('/api/login', (req, res) => {
    const { email, password } = req.body;
    const foundUser = mockUsers.find(
        (u) => u.email === email && u.password === password
    );
    if (foundUser) {
        const userTier = foundUser.tier === 'premium' ? 'premium' : 'free';
        const user = { email: foundUser.email, userTier, id: foundUser.id };
        const token = jwt.sign(user, SECRET, { expiresIn: '1h' });
        res.json({ token, userTier, email: foundUser.email, id: foundUser.id });
    } else {
        res.status(401).json({ message: 'Invalid credentials' });
    }
});

// --- RATE LIMIT MIDDLEWARE ---
function rateLimitMiddleware(req, res, next) {
    const userId = req.userId;
    const tier = req.userTier;
    const currentTime = Date.now();

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

    if (requestTracker[userId].count > tier.limit) {
        return res.status(429).send(`Too many requests. Limit is ${tier.limit} per minute.`);
    }
    next();
}

// --- CHAT ENDPOINT ---
app.post('/api/chat', identifyUser, rateLimitMiddleware, async (req, res) => {
    try {
        const { prompt } = req.body;
        const { text } = await generateText({
            model: model,
            prompt: prompt,
        });
        res.json({ response: text });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'AI response error' });
    }
});

// --- STATUS ENDPOINT ---
app.get('/api/status', identifyUser, (req, res) => {
    const userId = req.userId;
    const tier = req.userTier;

    let remaining_requests;
    if (requestTracker[userId]) {
        remaining_requests = tier.limit - requestTracker[userId].count;
    } else {
        remaining_requests = tier.limit;
    }

    res.json({
        status: 'ok',
        userId,
        tier: tier,
        remaining_requests
    });
    console.log(`Status called for ${userId} (${JSON.stringify(tier)}): ${remaining_requests} requests left`);
});

app.listen(5000, () => {
    console.log('Server running on http://localhost:5000');
});