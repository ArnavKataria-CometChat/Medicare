import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

// OVERRIDE: Set this to your computer's IP address if auto-detection picks the wrong interface
// Currently: Metro is waiting on 192.168.1.17
const MANUAL_IP = '192.168.1.17'; 

// Auto-detect IP of Metro bundler host to support physical iPhone over local Wi-Fi
let devIp = MANUAL_IP || 'localhost';
if (!MANUAL_IP && Constants.expoConfig?.hostUri) {
  const host = Constants.expoConfig.hostUri.split(':')[0];
  if (host) devIp = host;
}

// Map appropriate base URL
const getDefaultBaseUrl = () => {
  if (__DEV__) {
    if (Platform.OS === 'android') {
      return 'http://10.0.2.2:5000'; // Android emulator loops back to localhost:5000
    } else {
      return `http://${devIp}:5000`; // iOS physical device/simulator uses detected dev host
    }
  }
  return 'http://localhost:5000'; // Fallback
};

export const API_BASE_URL = getDefaultBaseUrl();

// Helper to make fetch requests with auth headers automatically
const request = async (endpoint, options = {}) => {
  const token = await AsyncStorage.getItem('token');
  const headers = {
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Handle standard JSON content-type if not uploading a form/file
  if (!(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  console.log(`[API] Attempting fetch to: ${API_BASE_URL}${endpoint}`);
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Something went wrong');
  }
  return data;
};

export const api = {
  // Auth
  login: (email, password) => request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  }),
  register: (userData) => request('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(userData),
  }),
  getProfile: () => request('/api/profile'),
  updateProfile: (data) => request('/api/profile', {
    method: 'PUT',
    body: JSON.stringify(data),
  }),

  // Doctors
  getDoctors: () => request('/api/doctors'),
  getDoctorById: (id) => request(`/api/doctors/${id}`),

  // Articles
  getArticles: () => request('/api/articles'),
  getArticleById: (id) => request(`/api/articles/${id}`),

  // Appointments
  getAppointments: () => request('/api/appointments'),
  bookAppointment: (data) => request('/api/appointments', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  cancelAppointment: (id) => request(`/api/appointments/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ status: 'CANCELLED' }),
  }),

  // Health Records
  getMyRecords: () => request('/api/records'),
  uploadRecord: (formData) => request('/api/records', {
    method: 'POST',
    body: formData,
    // Note: Do not set Content-Type header; fetch automatically adds it with the boundary for FormData
  }),
  deleteRecord: (id) => request(`/api/records/${id}`, {
    method: 'DELETE',
  }),

  // AI Chat
  sendAIChat: (messages) => request('/api/ai/chat', {
    method: 'POST',
    body: JSON.stringify({ messages }),
  }),
};
