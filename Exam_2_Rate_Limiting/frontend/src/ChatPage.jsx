import React, { useState, useRef, useEffect, useContext } from "react";
import { AuthContext } from "./AuthContext";
import { FaUser, FaRobot } from "react-icons/fa";
import axios from "axios";
import ReactMarkdown from 'react-markdown';


function MessageBubble({ isUser, isGuest, message }) {
  return (
    <div className={`flex mb-2 ${isUser || isGuest ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[70%] px-4 py-2 rounded-2xl shadow
        ${isUser ? "bg-blue-600 text-white" : isGuest ? "bg-gray-700 text-gray-200" : "bg-gray-800 text-green-200"}
        `}
      >
        <div className="flex items-center gap-2">
          {!isUser && !isGuest && (
            <span className="text-green-400"><FaRobot size={16} /></span>
          )}
          {isGuest && (
            <span className="text-gray-400"><FaUser size={16} /></span>
          )}
          <span className="prose prose-invert max-w-full">
            <ReactMarkdown>{message}</ReactMarkdown>
          </span>
        </div>
      </div>
    </div>
  );
}

function ChatPage() {
  const { user } = useContext(AuthContext);
  const [messages, setMessages] = useState([
    {
      sender: "ai",
      text: "Hello! 👋 How can I assist you today?",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const chatEndRef = useRef(null);

  // Scroll to bottom when new message appears
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    setError("");
    if (!input.trim() || loading) return;

    const senderType =
      user?.userTier === "guest" || user?.userType === "guest"
        ? "guest"
        : "user";

    const myMsg = {
      sender: senderType,
      text: input,
    };
    setMessages((msgs) => [...msgs, myMsg]);
    setInput("");
    setLoading(true);

    try {
      // For guests, do not send token
      const headers = {};
      if (user?.token) {
        headers["Authorization"] = `Bearer ${user.token}`;
      }

      const res = await axios.post(
        "http://localhost:5000/api/chat",
        { prompt: input },
        { headers }
      );
      setMessages((msgs) => [
        ...msgs,
        { sender: "ai", text: res.data.response },
      ]);
    } catch (err) {
      let msg = "AI response error.";
      if (
        err.response &&
        err.response.status === 429 &&
        typeof err.response.data === "string"
      ) {
        msg = err.response.data;
      }
      setMessages((msgs) => [
        ...msgs,
        { sender: "ai", text: msg },
      ]);
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-56px)] bg-gray-900">
      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto px-2 py-4 sm:px-0 sm:py-8 max-w-2xl mx-auto w-full">
        {messages.map((msg, idx) => (
          <MessageBubble
            key={idx}
            isUser={msg.sender === "user"}
            isGuest={msg.sender === "guest"}
            message={msg.text}
          />
        ))}
        <div ref={chatEndRef} />
        {error && (
          <div className="text-red-400 text-center mt-2">{error}</div>
        )}
      </div>
      {/* Input Area */}
      <form
        className="bg-gray-800 border-t border-gray-700 p-4 flex items-center gap-3 sticky bottom-0 max-w-2xl mx-auto w-full"
        onSubmit={handleSend}
      >
        <input
          className="flex-1 rounded-xl bg-gray-900 text-gray-100 px-4 py-2 border border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-600"
          type="text"
          placeholder="Type your message..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          autoFocus
          disabled={loading}
        />
        <button
          className={`bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-xl font-semibold transition ${loading ? "opacity-50 cursor-not-allowed" : ""
            }`}
          type="submit"
          disabled={loading}
        >
          {loading ? "Sending..." : "Send"}
        </button>
      </form>
    </div>
  );
}

export default ChatPage;