import 'react-native-gesture-handler';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { CometChatThemeProvider, CometChatI18nProvider } from '@cometchat/chat-uikit-react-native';
import React, { useContext, useEffect, useRef, useState } from 'react';
import { View, ActivityIndicator, StyleSheet, TouchableOpacity, Alert, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, useNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import io from 'socket.io-client';
import * as Notifications from 'expo-notifications';

import { AuthProvider, AuthContext } from './src/context/AuthContext';
import { CometChatProvider } from './src/context/CometChatContext';
import { API_BASE_URL } from './src/services/api';
import { registerForPushNotifications } from './src/services/notifications';
import CallSurfaces from './src/components/CallSurfaces';

// Import Screens
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import HomeScreen from './src/screens/HomeScreen';
import DoctorsDirectoryScreen from './src/screens/DoctorsDirectoryScreen';
import DoctorDetailsScreen from './src/screens/DoctorDetailsScreen';
import BookAppointmentScreen from './src/screens/BookAppointmentScreen';
import ConfirmationScreen from './src/screens/ConfirmationScreen';
import AppointmentsScreen from './src/screens/AppointmentsScreen';
import PatientRecordsScreen from './src/screens/PatientRecordsScreen';
import AIAssistant from './src/screens/AIAssistant';
import ProfileScreen from './src/screens/ProfileScreen';
import ArticlesScreen from './src/screens/ArticlesScreen';
import ChatSimulationScreen from './src/screens/ChatSimulationScreen';
import ChatsListScreen from './src/screens/ChatsListScreen';



const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Bottom Tab Navigation for Patients
const PatientTabs = () => {
  return (
    <Tab.Navigator
      initialRouteName="Dashboard"
      screenOptions={({ route, navigation }) => ({
        tabBarIcon: ({ color, size }) => {
          let iconName;
          if (route.name === 'Doctors') iconName = 'people-outline';
          else if (route.name === 'Articles') iconName = 'newspaper-outline';
          else if (route.name === 'Dashboard') iconName = 'home-outline';
          else if (route.name === 'Chats') iconName = 'chatbubbles-outline';
          else if (route.name === 'Records') iconName = 'document-text-outline';
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#0d9488', // Teal-600
        tabBarInactiveTintColor: '#64748b', // Slate-500
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopWidth: 1,
          borderTopColor: '#e2e8f0',
          paddingBottom: 24,
          paddingTop: 10,
          height: 80,
        },
        headerStyle: {
          backgroundColor: '#ffffff',
          shadowColor: 'transparent',
          elevation: 0,
          borderBottomWidth: 1,
          borderBottomColor: '#e2e8f0',
        },
        headerTitleStyle: {
          fontWeight: '700',
          color: '#0f172a', // Slate-900
        },
        headerTintColor: '#0d9488',
        headerLeft: () => (
          <TouchableOpacity 
            onPress={() => navigation.navigate('Appointments')} 
            style={{ marginLeft: 16 }}
          >
            <Ionicons name="calendar-outline" size={24} color="#0d9488" />
          </TouchableOpacity>
        ),
        headerRight: () => (
          <TouchableOpacity 
            onPress={() => navigation.navigate('Profile')} 
            style={{ marginRight: 16 }}
          >
            <Ionicons name="person-outline" size={24} color="#0d9488" />
          </TouchableOpacity>
        ),
      })}
    >
      <Tab.Screen name="Doctors" component={DoctorsDirectoryScreen} options={{ title: 'Find Doctors' }} />
      <Tab.Screen name="Articles" component={ArticlesScreen} options={{ title: 'Medical Articles' }} />
      <Tab.Screen name="Dashboard" component={HomeScreen} options={{ title: 'Dashboard' }} />
      <Tab.Screen name="Chats" component={ChatsListScreen} options={{ title: 'Chats' }} />
      <Tab.Screen name="Records" component={PatientRecordsScreen} options={{ title: 'My Records' }} />
    </Tab.Navigator>
  );
};

// Bottom Tab Navigation for Doctors/Staff
const DoctorTabs = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color, size }) => {
          let iconName;
          if (route.name === 'Home') iconName = 'home-outline';
          else if (route.name === 'Appointments') iconName = 'calendar-outline';
          else if (route.name === 'Chats') iconName = 'chatbubbles-outline';
          else if (route.name === 'Profile') iconName = 'person-outline';
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#0d9488',
        tabBarInactiveTintColor: '#64748b',
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopWidth: 1,
          borderTopColor: '#e2e8f0',
          paddingBottom: 24,
          paddingTop: 10,
          height: 80,
        },
        headerStyle: {
          backgroundColor: '#ffffff',
          borderBottomWidth: 1,
          borderBottomColor: '#e2e8f0',
        },
        headerTitleStyle: {
          fontWeight: '700',
          color: '#0f172a',
        },
        headerTintColor: '#0d9488',
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ title: 'Doctor Dashboard' }} />
      <Tab.Screen name="Appointments" component={AppointmentsScreen} options={{ title: 'Patient Schedule' }} />
      <Tab.Screen name="Chats" component={ChatsListScreen} options={{ title: 'Chats' }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: 'My Profile' }} />
    </Tab.Navigator>
  );
};

const NavigationWrapper = () => {
  const { user, isLoading, token } = useContext(AuthContext);
  const navigationRef = useNavigationContainerRef();
  const socketRef = useRef(null);
  const currentRouteRef = useRef(null);

  // Register for push notifications when user logs in
  useEffect(() => {
    if (user && token) {
      registerForPushNotifications();
    }
  }, [user, token]);

  // Handle notification tap — navigate to chat
  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data;
      if (data?.type === 'chat_message' && data?.senderId) {
        // Navigate to chat with the sender
        if (navigationRef.current) {
          navigationRef.current.navigate('ChatSimulation', {
            contact: {
              id: data.senderId,
              name: data.senderName || 'User',
              role: 'PATIENT'
            }
          });
        }
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  // Global socket listener for message notifications
  useEffect(() => {
    if (!token || !user) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      return;
    }

    const socket = io(API_BASE_URL, {
      auth: { token },
      transports: ['websocket', 'polling']
    });

    socket.on('message:received', (message) => {
      // Only show in-app notification if user is NOT on the ChatSimulation screen
      const currentRoute = currentRouteRef.current;
      if (currentRoute !== 'ChatSimulation') {
        const senderName = message.sender?.name || 'Someone';
        const preview = message.content.length > 60
          ? message.content.substring(0, 60) + '...'
          : message.content;
        
        // Show local notification (this appears even when app is foregrounded)
        Notifications.scheduleNotificationAsync({
          content: {
            title: `💬 ${senderName}`,
            body: preview,
            data: { type: 'chat_message', senderId: message.senderId, senderName },
            sound: 'default',
          },
          trigger: null, // Immediately
        });
      }
    });

    // Listen for general notifications (appointments, etc.)
    socket.on('notification:received', (notification) => {
      Notifications.scheduleNotificationAsync({
        content: {
          title: notification.title,
          body: notification.body,
          data: { type: 'general', url: notification.url },
          sound: 'default',
        },
        trigger: null,
      });
    });

    socketRef.current = socket;

    return () => {
      socket.disconnect();
    };
  }, [token, user]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0d9488" />
      </View>
    );
  }

  return (
    <NavigationContainer
      ref={navigationRef}
      onStateChange={() => {
        const route = navigationRef.current?.getCurrentRoute();
        currentRouteRef.current = route?.name || null;
      }}
    >
      <Stack.Navigator
        screenOptions={{
          headerStyle: {
            backgroundColor: '#ffffff',
            elevation: 0,
            shadowOpacity: 0,
            borderBottomWidth: 1,
            borderBottomColor: '#e2e8f0',
          },
          headerTitleStyle: {
            fontWeight: '700',
            color: '#0f172a',
          },
          headerTintColor: '#0d9488',
          headerBackTitleVisible: false,
          contentStyle: { backgroundColor: '#f8fafc' },
        }}
      >
        {user === null ? (
          // Auth Stack
          <>
            <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
            <Stack.Screen name="Register" component={RegisterScreen} options={{ headerShown: false }} />
          </>
        ) : (
          // App Stack
          <>
            {user.role === 'DOCTOR' ? (
              <Stack.Screen
                name="MainTabs"
                component={DoctorTabs}
                options={{ headerShown: false }}
              />
            ) : (
              <Stack.Screen
                name="MainTabs"
                component={PatientTabs}
                options={{ headerShown: false }}
              />
            )}
            {/* Common Stack Screens */}
            <Stack.Screen
              name="Profile"
              component={ProfileScreen}
              options={{ title: 'My Profile' }}
            />
            <Stack.Screen
              name="AIChat"
              component={AIAssistant}
              options={{ title: 'MediCare AI' }}
            />
            <Stack.Screen
              name="DoctorDetails"
              component={DoctorDetailsScreen}
              options={{ title: 'Doctor Details' }}
            />
            <Stack.Screen
              name="BookAppointment"
              component={BookAppointmentScreen}
              options={{ title: 'Book Appointment' }}
            />
            <Stack.Screen
              name="Confirmation"
              component={ConfirmationScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="ChatSimulation"
              component={ChatSimulationScreen}
              options={{ title: 'Telehealth Simulator' }}
            />
            <Stack.Screen
              name="Appointments"
              component={AppointmentsScreen}
              options={({ navigation }) => ({
                title: 'My Consultations',
                headerLeft: () => (
                  <TouchableOpacity
                    onPress={() => navigation.navigate('MainTabs', { screen: 'Dashboard' })}
                    style={{ marginRight: 8 }}
                  >
                    <Ionicons name="arrow-back" size={24} color="#0d9488" />
                  </TouchableOpacity>
                ),
              })}
            />

          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <CometChatI18nProvider>
          <CometChatThemeProvider>
            <AuthProvider>
              <CometChatProvider>
                <StatusBar style="dark" />
                <NavigationWrapper />
                <CallSurfaces />
              </CometChatProvider>
            </AuthProvider>
          </CometChatThemeProvider>
        </CometChatI18nProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
});
