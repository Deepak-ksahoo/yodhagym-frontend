import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

export const ROLES = {
  DEVELOPER: 'developer',
  ADMIN: 'admin',
  TRAINER: 'trainer',
  MEMBER: 'member'
};

const AuthContext = createContext();

const normalizeUserRole = (userData) => {
  if (!userData || typeof userData !== 'object') return userData;

  const rawRole =
    typeof userData.role === 'string'
      ? userData.role.trim().toLowerCase()
      : userData.role;

  const mappedRole = rawRole === 'user' ? ROLES.MEMBER : rawRole;

  return { ...userData, role: mappedRole };
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // ✅ Load user from API (BEST PRACTICE)
  useEffect(() => {
    const storedToken = localStorage.getItem('yodha_token');
    const storedUser = localStorage.getItem('yodha_user');

    if (storedToken && storedUser) {
      try {
        const parsedUser = normalizeUserRole(JSON.parse(storedUser));
        setUser(parsedUser);
        setToken(storedToken);
      } catch (err) {
        setUser(null);
        setToken(null);
      }
    } else {
      setUser(null);
      setToken(null);
    }
    setLoading(false);
  }, []);

  // ✅ LOGIN
  const login = (userData, authToken) => {
    const normalizedUser = normalizeUserRole(userData);

    setUser(normalizedUser);
    setToken(authToken);

    localStorage.setItem('yodha_user', JSON.stringify(normalizedUser));
    localStorage.setItem('yodha_token', authToken);
  };

  // ✅ LOGOUT
  const logout = () => {
    setUser(null);
    setToken(null);

    localStorage.removeItem('yodha_user');
    localStorage.removeItem('yodha_token');
  };

  // ✅ 🔥 UPDATE USER (MOST IMPORTANT)
  const updateUser = (updatedData) => {
    const normalizedUser = normalizeUserRole({
      ...user,
      ...updatedData,
    });

    setUser(normalizedUser);

    // Sync localStorage
    localStorage.setItem('yodha_user', JSON.stringify(normalizedUser));
  };

  if (loading) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        Loading Yodha System...
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, token, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);