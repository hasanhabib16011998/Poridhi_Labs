import React, { createContext, useState } from 'react';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const token = localStorage.getItem('token');
    const userType = localStorage.getItem('userType');
    const email = localStorage.getItem('email');
    if (token && userType && email) {
      return { token, userType, email };
    }
    if (userType === 'guest') {
      return { userType: 'guest' };
    }
    return null;
  });

  const login = (data) => {
    localStorage.setItem('token', data.token);
    localStorage.setItem('userType', data.userType);
    localStorage.setItem('email', data.email);
    setUser(data);
  };

  const logout = () => {
    localStorage.clear();
    setUser(null);
  };

  const guestLogin = () => {
    localStorage.setItem('userType', 'guest');
    setUser({ userType: 'guest' });
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, guestLogin }}>
      {children}
    </AuthContext.Provider>
  );
};