import React, { createContext, useContext, useState, useEffect } from 'react';
import { USER_ROLES } from '../constants/theme';
import { authService } from '../services/authService';

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
      setUser(null);
    }
  };

  const updateUser = (updatedFields) => {
    setUser((prev) => (prev ? { ...prev, ...updatedFields } : null));
  };

  // Demo helper for previewing roles before full backend database setup
  const setDemoUser = (role) => {
    const demoProfiles = {
      [USER_ROLES.DONOR]: {
        _id: 'demo-donor-1',
        fullName: 'Alex Rivera (Demo Donor)',
        email: 'donor@bloodward.com',
        role: USER_ROLES.DONOR,
        bloodGroup: 'O+',
        city: 'New York',
        isAvailable: true,
        phone: '+1 (555) 234-5678',
      },
      [USER_ROLES.RECIPIENT]: {
        _id: 'demo-recipient-1',
        fullName: 'Sarah Chen (Demo Recipient)',
        email: 'recipient@bloodward.com',
        role: USER_ROLES.RECIPIENT,
        city: 'New York',
        phone: '+1 (555) 987-6543',
      },
      [USER_ROLES.ADMIN]: {
        _id: 'demo-admin-1',
        fullName: 'System Administrator',
        email: 'admin@bloodward.com',
        role: USER_ROLES.ADMIN,
      },
    };

    if (role) {
      setUser(demoProfiles[role]);
    } else {
      setUser(null);
    }
  };

  const value = {
    user,
    role: user?.role || null,
    isAuthenticated: !!user,
    loading,
    login: loginUser,
    logout: logoutUser,
    updateUser,
    setDemoUser, // For easy testing & demoing roles
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