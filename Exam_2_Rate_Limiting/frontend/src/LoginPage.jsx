import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from './AuthContext';

function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { login, guestLogin } = useContext(AuthContext);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const res = await axios.post('http://localhost:5000/api/login', { email, password });
      login(res.data);
      navigate('/chat');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    }
  };

  const handleGuest = () => {
    guestLogin();
    navigate('/chat');
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900">
      <form
        className="bg-gray-800 p-8 rounded-lg shadow-lg w-80"
        onSubmit={handleLogin}
      >
        <h2 className="text-3xl font-bold mb-6 text-center text-white">Sign In</h2>
        {error && <div className="text-red-400 mb-3 text-center">{error}</div>}
        <input
          className="w-full mb-3 p-3 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-600"
          type="email"
          placeholder="Email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          autoComplete="username"
          required
        />
        <input
          className="w-full mb-5 p-3 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-600"
          type="password"
          placeholder="Password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          autoComplete="current-password"
          required
        />
        <button
          className="w-full bg-blue-600 hover:bg-blue-700 transition-colors text-white py-2 rounded font-semibold mb-4"
          type="submit"
        >
          Login
        </button>
        <button
          type="button"
          className="w-full bg-gray-700 hover:bg-gray-600 transition-colors text-gray-200 py-2 rounded font-semibold"
          onClick={handleGuest}
        >
          Chat as Guest
        </button>
      </form>
    </div>
  );
}

export default LoginPage;