import React, { createContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../services/api';
import { unregisterPushToken } from '../services/notifications';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStoredAuth();
  }, []);

  const loadStoredAuth = async () => {
    try {
      const storedToken = await AsyncStorage.getItem('token');
      if (storedToken) {
        setToken(storedToken);
        // Fetch full profile using the stored token
        const userData = await api.getProfile();
        if (userData && userData.role === 'STAFF') {
          await logout();
        } else {
          setUser(userData);
        }
      }
    } catch (error) {
      console.error('Failed to load authentication data', error);
      // Clean up token if invalid/expired
      await logout();
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email, password) => {
    setIsLoading(true);
    try {
      const response = await api.login(email, password);
      const { token: userToken, user: userData } = response;
      if (userData.role === 'STAFF') {
        throw new Error('Staff accounts are not allowed to log in on mobile.');
      }
      await AsyncStorage.setItem('token', userToken);
      setToken(userToken);
      setUser(userData);
      return userData;
    } catch (error) {
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (userData) => {
    setIsLoading(true);
    try {
      const response = await api.register(userData);
      // Automatically log in on registration
      const { token: userToken, user: freshUser } = response;
      await AsyncStorage.setItem('token', userToken);
      setToken(userToken);
      setUser(freshUser);
      return freshUser;
    } catch (error) {
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      // Unregister push token before logout
      await unregisterPushToken();

      // Logout from CometChat is handled reactively by CometChatProvider when the token changes to null
      
      // Best-effort logout call to the backend
      if (token) {
        await fetch(`${api.API_BASE_URL || 'http://localhost:5000'}/api/auth/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }).catch(err => console.log('Network logout failed, clearing local storage'));
      }
    } catch (error) {
      console.log('Error during backend logout:', error);
    } finally {
      await AsyncStorage.removeItem('token');
      setToken(null);
      setUser(null);
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, register, logout, setUser }}>
      {children}
    </AuthContext.Provider>
  );
};
