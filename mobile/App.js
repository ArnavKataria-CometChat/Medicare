import React, { useContext } from 'react';
import { View, ActivityIndicator, StyleSheet, TouchableOpacity } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import { AuthProvider, AuthContext } from './src/context/AuthContext';

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
      screenOptions={({ route, navigation }) => ({
        tabBarIcon: ({ color, size }) => {
          let iconName;
          if (route.name === 'Doctors') iconName = 'people-outline';
          else if (route.name === 'Appointments') iconName = 'calendar-outline';
          else if (route.name === 'Chats') iconName = 'chatbubbles-outline';
          else if (route.name === 'Records') iconName = 'document-text-outline';
          else if (route.name === 'Articles') iconName = 'newspaper-outline';
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#0d9488', // Teal-600
        tabBarInactiveTintColor: '#64748b', // Slate-500
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopWidth: 1,
          borderTopColor: '#e2e8f0',
          paddingBottom: 6,
          paddingTop: 6,
          height: 60,
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
            onPress={() => navigation.navigate('Home')} 
            style={{ marginLeft: 16 }}
          >
            <Ionicons name="home-outline" size={24} color="#0d9488" />
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
      <Tab.Screen name="Appointments" component={AppointmentsScreen} options={{ title: 'My Consultations' }} />
      <Tab.Screen name="Chats" component={ChatsListScreen} options={{ title: 'Chats' }} />
      <Tab.Screen name="Records" component={PatientRecordsScreen} options={{ title: 'Medical Records' }} />
      <Tab.Screen name="Articles" component={ArticlesScreen} options={{ title: 'Medical Articles' }} />
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
          paddingBottom: 6,
          paddingTop: 6,
          height: 60,
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
  const { user, isLoading } = useContext(AuthContext);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0d9488" />
      </View>
    );
  }

  return (
    <NavigationContainer>
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
              <>
                <Stack.Screen
                  name="Home"
                  component={HomeScreen}
                  options={({ navigation }) => ({
                    title: 'Dashboard',
                    headerRight: () => (
                      <TouchableOpacity 
                        onPress={() => navigation.navigate('Profile')} 
                        style={{ marginRight: 16 }}
                      >
                        <Ionicons name="person-outline" size={24} color="#0d9488" />
                      </TouchableOpacity>
                    ),
                  })}
                />
                <Stack.Screen
                  name="MainTabs"
                  component={PatientTabs}
                  options={{ headerShown: false }}
                />
              </>
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

          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <StatusBar style="dark" />
      <NavigationWrapper />
    </AuthProvider>
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
