import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authApi } from '../api';
import { useToast } from './ToastContext';

const defaultAuthContext = {
  user: null,
  isAuthenticated: false,
  loading: true,
  login: async () => ({ success: false }),
  register: async () => ({ success: false }),
  logout: () => {},
  hasRole: () => false,
  refreshUser: async () => {},
  updateUser: () => {},
};

const AuthContext = createContext(defaultAuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [ws, setWs] = useState(null);
  const { error: toastError, info: toastInfo } = useToast();

  const fetchUserProfile = useCallback(async () => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      const res = await authApi.getMe();
      if (res.data?.success) {
        setUser(res.data.data);
      }
    } catch (err) {
      // Session token is expired or unauthorized - clear auth tokens without wiping UI preferences
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUserProfile();
  }, [fetchUserProfile]);

  // Connect WebSocket when user is logged in
  useEffect(() => {
    if (!user?.id) {
      if (ws) {
        ws.close();
        setWs(null);
      }
      return;
    }

    // Connect through window.location.host (Vite proxy in dev, Nginx in production)
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const socketUrl = `${protocol}//${window.location.host}/ws/notifications/${user.id}`;

    let socket;
    try {
      socket = new WebSocket(socketUrl);

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.title && data.message) {
            toastInfo(`${data.title}: ${data.message}`);
          }
        } catch (e) {
          // ignore plain keep-alive
        }
      };

      socket.onerror = () => {
        // Silently handle any websocket transport disconnection
      };

      socket.onclose = () => {
        setWs(null);
      };

      setWs(socket);
    } catch (e) {
      // Gracefully silence connection initialization errors
    }

    return () => {
      if (socket) {
        socket.close();
      }
    };
  }, [user?.id, toastInfo]);

  const login = async (email, password) => {
    try {
      const res = await authApi.login({ email, password });
      const { access_token, refresh_token, user: loggedUser } = res.data.data;

      localStorage.setItem('access_token', access_token);
      localStorage.setItem('refresh_token', refresh_token);
      setUser(loggedUser);

      return { success: true, user: loggedUser };
    } catch (err) {
      const errMsg =
        err.response?.data?.error?.message ||
        err.response?.data?.message ||
        (err.code === 'ERR_NETWORK' || !err.response
          ? 'Cannot connect to backend server. Please ensure the backend is running on port 8000.'
          : 'Login failed. Please check your credentials.');
      toastError(errMsg);
      return { success: false, error: errMsg };
    }
  };

  const register = async (userData) => {
    try {
      const res = await authApi.register(userData);
      const { access_token, refresh_token, user: loggedUser } = res.data.data;

      localStorage.setItem('access_token', access_token);
      localStorage.setItem('refresh_token', refresh_token);
      setUser(loggedUser);

      return { success: true, user: loggedUser };
    } catch (err) {
      const errMsg = err.response?.data?.error?.message || 'Registration failed.';
      toastError(errMsg);
      return { success: false, error: errMsg };
    }
  };

  const logout = async () => {
    const refresh = localStorage.getItem('refresh_token');
    if (refresh) {
      try {
        await authApi.logout(refresh);
      } catch (e) {
        // ignore logout error
      }
    }
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    setUser(null);
    window.location.href = '/login';
  };

  const hasRole = (roles = []) => {
    if (!user) return false;
    if (typeof roles === 'string') return user.role === roles;
    return roles.includes(user.role);
  };

  const updateUser = useCallback((updatedUserData) => {
    setUser((prev) => (prev ? { ...prev, ...updatedUserData } : updatedUserData));
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        loading,
        login,
        register,
        logout,
        hasRole,
        refreshUser: fetchUserProfile,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  return context || defaultAuthContext;
};
