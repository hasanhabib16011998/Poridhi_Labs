import React, { useContext } from 'react';
import { AuthContext } from './AuthContext';

function NavBar() {
  const { user, logout } = useContext(AuthContext);

  let status = 'Not logged in';
  if (user) {
    if (user.userTier === 'premium') status = 'Premium User';
    else if (user.userTier === 'free') status = 'Free User';
    else if (user.userTier === 'guest') status = 'Guest';
  }

  return (
    <nav className="bg-gray-950 border-b border-gray-800 px-6 py-3 flex justify-between items-center shadow-md">
      <div className="font-bold text-xl text-green-400 tracking-tight">AI Chat</div>
      <div className="flex items-center space-x-4">
        <span className="px-3 py-1 rounded bg-gray-800 text-sm font-medium text-gray-300">
          {status}
        </span>
        {user && (
          <button
            className="bg-red-600 hover:bg-red-700 transition-colors text-white px-3 py-2 rounded text-sm font-semibold"
            onClick={logout}
          >
            Logout
          </button>
        )}
      </div>
    </nav>
  );
}

export default NavBar;