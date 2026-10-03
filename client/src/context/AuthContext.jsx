import React, { createContext, useContext, useState, useEffect } from 'react';
import { USER_ROLES } from '../constants/theme';
import { authService } from '../services/authService';
import { socketService } from '../services/socketService';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Initial session check on app start
  useEffect(() => {
    const initAuth = async () => {
      try {
        // Attempt to fetch current user session via HttpOnly cookie
        const res = await authService.getCurrentUser();
        if (res && res.user) {
          setUser(res.user);
        }
      } catch (err) {
        // Session invalid or not logged in yet
        socketService.disconnect();
      setUser(null);
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  const loginUser = (userData) => {
    setUser(userData);
  };

  const logoutUser = async () => {
    try {
      await authService.logout();
    } catch (err) {
      console.warn('Backend logout failed or offline:', err);
    } finally {
      socketService.disconnect();
      setUser(null);
    }
  };

  const updateUser = (updatedFields) => {
    setUser((prev) => (prev ? { ...prev, ...updatedFields } : null));
  };


  const value = {
    user,
    role: user?.role || null,
    isAuthenticated: !!user,
    loading,
    login: loginUser,
    logout: logoutUser,
    updateUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;