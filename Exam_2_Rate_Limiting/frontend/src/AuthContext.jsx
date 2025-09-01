import React, { createContext, useState } from 'react';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const token = localStorage.getItem('token');
    const userTier = localStorage.getItem('userTier');
    const email = localStorage.getItem('email');
    if (token && userTier && email) {
      return { token, userTier, email };
    }
    if (userTier === 'guest') {
      return { userTier: 'guest' };
    }
    return null;
  });

  const login = (data) => {
    localStorage.setItem('token', data.token);
    localStorage.setItem('userType', data.userTier);
    localStorage.setItem('email', data.email);
    setUser(data);
  };

  const logout = () => {
    localStorage.clear();
    setUser(null);
  };

  const guestLogin = () => {
    localStorage.setItem('userTier', 'guest');
    setUser({ userTier: 'guest' });
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, guestLogin }}>
      {children}
    </AuthContext.Provider>
  );
};