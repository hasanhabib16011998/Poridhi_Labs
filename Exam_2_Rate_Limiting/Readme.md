# Poridhi Rate-Limited AI Chat Application

## Overview

This application is a full-stack AI-powered chat platform featuring user authentication with tiered rate limiting and integration with Google's Gemini AI for generating chat responses. It supports guest, free, and premium users, each with different chat message limits per minute. The frontend is built with React (Vite + Tailwind CSS), and the backend uses Express.js, with JWT-based authentication and Google AI integration.

---

## Features

- **User Authentication**:  
  - Supports login for free and premium users (mock database).
  - Guest users can chat without authentication (with lower limits).

- **Rate Limiting**:  
  - Guest: 3 chat messages/minute
  - Free: 10 chat messages/minute
  - Premium: 50 chat messages/minute
  - Rate limiting is enforced on backend per user/IP.

- **AI Chat Integration**:  
  - Uses Google Gemini via [`@ai-sdk/google`](https://www.npmjs.com/package/@ai-sdk/google) for natural language chat responses.
  - Secure API key management using environment variables.

- **Modern Frontend**:  
  - React + Vite + Tailwind CSS for a ChatGPT-style experience.
  - Markdown rendering for beautiful AI responses with lists, bold, and more.
  - Sticky input, responsive design, and user/AI/guest message styling.

---

## How It Works

### Backend

- **Authentication & User Tiers**:  
  - Users login via `/api/login` (mocked users with JWT token generation).
  - Each user has a tier (`guest`, `free`, `premium`) with specific chat limits.

- **Middlewares**:
  - `identifyUser`: Extracts user info from JWT or assigns guest tier by IP.
  - `rateLimitMiddleware`: Tracks requests per user/IP and enforces per-minute limits.

- **Chat Endpoint** (`/api/chat`):  
  - Accepts a user prompt.
  - Passes the prompt to Google Gemini using `generateText`.
  - Responds with AI-generated message, or 429 if rate limit is exceeded.

- **Status Endpoint** (`/api/status`):  
  - Returns remaining requests for the user in the current window.

- **Environment & API Keys**:  
  - Uses `.env` and `dotenv` for managing secrets (especially Google API key).

### Frontend

- **Authentication**:  
  - Handles login, logout, and guest access.
  - Stores JWT token, user tier, and email in localStorage.

- **Chat Interface**:
  - Sends user input to backend `/api/chat` with the JWT token if available.
  - Renders AI responses using `react-markdown` for rich formatting.
  - Distinguishes between user, guest, and AI messages visually.

- **Error & Rate Limit Handling**:  
  - Displays errors and rate limit messages in the chat window.

- **Styling**:
  - Tailwind CSS for modern, dark theme.
  - Uses typography plugin for Markdown styling.

---

## Setup Instructions

1. **Clone this Repository**:

    ```bash
    git clone https://github.com/hasanhabib16011998/Poridhi_Labs.git
    cd Exam_2_Rate_Limiting
    ```
### Backend

1. **Install dependencies**:
    ```bash
    cd backend
    npm install
    ```

2. **Create `.env` file** with your Google Gemini API key:
    ```
    GOOGLE_GENERATIVE_AI_API_KEY=your-google-api-key
    ```

3. **Export API Key**:
   ```bash
   export GOOGLE_GENERATIVE_AI_API_KEY="your-google-api-key"
   ```

4. **Run the backend**:
    ```bash
    npm start
    ```

### Frontend

1. **Install dependencies**:
    ```bash
    cd frontend
    npm install
    ```

2. **Run the frontend**:
    ```bash
    npm start
    ```

---

## Usage

- **Login as Free User**:  
  - Email: `free123@gmail.com`  
  - Password: `password`

- **Login as Premium User**:  
  - Email: `premium456@gmail.com`  
  - Password: `password`

- **Guest Access**:  
  - Use the "Continue as Guest" feature.

- **Chat**:  
  - Send messages and receive AI responses.  
  - If you hit your rate limit, you'll see a message in the chat.

---

## Tech Stack

- **Backend**: Express.js, JWT, dotenv, Google Gemini AI SDK
- **Frontend**: React, Vite, Tailwind CSS, react-markdown, axios

---

## Extending

- Add real database and user management.
- Integrate payment for premium tier.
- Plug in other AI providers.
- Add chat history, avatars, and multi-room support.

---

## License

MIT
