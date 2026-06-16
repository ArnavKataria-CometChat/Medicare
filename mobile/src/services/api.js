import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

// OVERRIDE: Set this to your computer's IP address if auto-detection picks the wrong interface
// Currently: Metro is waiting on 192.168.1.17
const MANUAL_IP = ''; 

// Auto-detect IP of Metro bundler host to support physical iPhone over local Wi-Fi
let devIp = MANUAL_IP || 'localhost';
if (!MANUAL_IP && Constants.expoConfig?.hostUri) {
  const host = Constants.expoConfig.hostUri.split(':')[0];
  if (host) devIp = host;
}

// Map appropriate base URL
const getDefaultBaseUrl = () => {
  // Allow env override in any mode
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }
  if (__DEV__) {
    // Use the detected Metro host IP for both platforms.
    // This works for physical devices over Wi-Fi (Expo Go).
    // For Android emulator, set MANUAL_IP to '10.0.2.2' above.
    return `http://${devIp}:5000`;
  }
  // Production: point at the public API behind the ALB (HTTPS, SSL terminated
  // at the load balancer). Set EXPO_PUBLIC_API_URL at build time to override.
  return process.env.EXPO_PUBLIC_API_URL || 'https://medicare.cometchat-staging.com';
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
    throw new Error(data.error || data.message || 'Something went wrong');
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
  getAppointments: async () => {
    const data = await request('/api/appointments');
    const mapAppointment = (app) => {
      if (!app) return app;
      return {
        ...app,
        date: app.appointmentDate,
        time: app.appointmentTime,
      };
    };
    return Array.isArray(data) ? data.map(mapAppointment) : data;
  },
  bookAppointment: async (data) => {
    const payload = {
      doctorProfileId: data.doctorProfileId,
      appointmentDate: data.date,
      appointmentTime: data.time,
      reason: data.reason,
    };
    const response = await request('/api/appointments', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    // The backend returns { message: '...', appointment: { ... } }
    // Return the mapped appointment object directly so the Confirmation screen has id, date, time, reason
    if (response && response.appointment) {
      const app = response.appointment;
      return {
        ...app,
        date: app.appointmentDate,
        time: app.appointmentTime,
      };
    }
    return response;
  },
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
