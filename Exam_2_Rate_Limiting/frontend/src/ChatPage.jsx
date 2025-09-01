import React, { useState, useRef, useEffect, useContext } from "react";
import { AuthContext } from "./AuthContext";
import { FaUser, FaRobot } from "react-icons/fa";

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
          <span>{message}</span>
        </div>
      </div>
    </div>
  );
}

const mockAIReply = async (input, mode) => {
  // Simulate an API call to AI
  await new Promise((r) => setTimeout(r, 900));
  if (mode === "guest") {
    return "You are chatting as a guest. AI responses may be limited.";
  }
  if (/hello|hi/i.test(input)) return "Hello! How can I help you today?";
  if (/premium/i.test(input)) return "Premium users get priority support and more features!";
  if (/free/i.test(input)) return "Free users have access to standard chat features.";
  return "This is an AI response. Feel free to ask anything!";
};

function ChatPage() {
  const { user } = useContext(AuthContext);
  const [messages, setMessages] = useState([
    {
      sender: "ai",
      text: "Hello! 👋 How can I assist you today?",
    },
  ]);
  const [input, setInput] = useState("");
  const chatEndRef = useRef(null);

  // Scroll to bottom when new message appears
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const myMsg = {
      sender: user?.userType === "guest" ? "guest" : "user",
      text: input,
    };
    setMessages((msgs) => [...msgs, myMsg]);
    setInput("");

    // Simulate AI reply
    const reply = await mockAIReply(input, user?.userType);
    setMessages((msgs) => [
      ...msgs,
      myMsg,
      { sender: "ai", text: reply },
    ]);
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
        />
        <button
          className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-xl font-semibold transition"
          type="submit"
        >
          Send
        </button>
      </form>
    </div>
  );
}

export default ChatPage;