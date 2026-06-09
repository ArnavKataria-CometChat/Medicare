import React, { useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../context/AuthContext';

const HomeScreen = ({ navigation }) => {
  const { user } = useContext(AuthContext);

  const getInitials = (name) => {
    if (!name) return 'U';
    const parts = name.trim().split(' ');
    if (parts.length > 1) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return parts[0][0].toUpperCase();
  };

  const renderPatientDashboard = () => {
    return (
      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {/* Welcome Section */}
        <View style={styles.welcomeBanner}>
          <View style={styles.welcomeLeft}>
            <Text style={styles.greeting}>Hello,</Text>
            <Text style={styles.userName}>{user?.name || 'Patient'}</Text>
            <Text style={styles.welcomeText}>How are you feeling today?</Text>
          </View>
          <View style={styles.avatarContainer}>
            <Text style={styles.avatarText}>{getInitials(user?.name)}</Text>
          </View>
        </View>

        {/* Quick Actions Title */}
        <Text style={styles.sectionTitle}>Quick Services</Text>

        {/* Quick Action Grid */}
        <View style={styles.actionGrid}>
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate('Doctors')}
            activeOpacity={0.9}
          >
            <View style={[styles.iconBox, { backgroundColor: '#ccfbf1' }]}>
              <Ionicons name="people" size={24} color="#0d9488" />
            </View>
            <Text style={styles.actionCardTitle}>Find Doctors</Text>
            <Text style={styles.actionCardDesc}>Browse specialists and book slots</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate('AI Chat')}
            activeOpacity={0.9}
          >
            <View style={[styles.iconBox, { backgroundColor: '#d1fae5' }]}>
              <Ionicons name="chatbubble-ellipses" size={24} color="#10b981" />
            </View>
            <Text style={styles.actionCardTitle}>Consult AI</Text>
            <Text style={styles.actionCardDesc}>Ask medical questions instantly</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate('Records')}
            activeOpacity={0.9}
          >
            <View style={[styles.iconBox, { backgroundColor: '#e0f2fe' }]}>
              <Ionicons name="document-text" size={24} color="#0284c7" />
            </View>
            <Text style={styles.actionCardTitle}>Health Records</Text>
            <Text style={styles.actionCardDesc}>Upload documents & lab reports</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate('Appointments')}
            activeOpacity={0.9}
          >
            <View style={[styles.iconBox, { backgroundColor: '#fef3c7' }]}>
              <Ionicons name="calendar" size={24} color="#d97706" />
            </View>
            <Text style={styles.actionCardTitle}>Appointments</Text>
            <Text style={styles.actionCardDesc}>Manage booking consultations</Text>
          </TouchableOpacity>
        </View>

        {/* Info Banner */}
        <View style={styles.infoBanner}>
          <Ionicons name="shield-checkmark" size={32} color="#0d9488" style={styles.infoIcon} />
          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>100% Secure Portal</Text>
            <Text style={styles.infoDesc}>Your medical consultations, documents and histories are fully encrypted.</Text>
          </View>
        </View>
      </ScrollView>
    );
  };

  const renderDoctorDashboard = () => {
    return (
      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {/* Welcome Section */}
        <View style={[styles.welcomeBanner, { backgroundColor: '#0f172a' }]}>
          <View style={styles.welcomeLeft}>
            <Text style={[styles.greeting, { color: '#94a3b8' }]}>Welcome back,</Text>
            <Text style={[styles.userName, { color: '#ffffff' }]}>Dr. {user?.name || 'Doctor'}</Text>
            <Text style={[styles.welcomeText, { color: '#cbd5e1' }]}>Clinical Consultant Portal</Text>
          </View>
          <View style={[styles.avatarContainer, { backgroundColor: '#0d9488' }]}>
            <Text style={styles.avatarText}>{getInitials(user?.name)}</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Doctor Utilities</Text>

        <View style={styles.actionGrid}>
          <TouchableOpacity
            style={[styles.actionCard, { width: '100%', flexDirection: 'row', alignItems: 'center', height: 90 }]}
            onPress={() => navigation.navigate('Appointments')}
            activeOpacity={0.9}
          >
            <View style={[styles.iconBox, { backgroundColor: '#ccfbf1', marginRight: 16 }]}>
              <Ionicons name="calendar" size={28} color="#0d9488" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.actionCardTitle}>Patient Schedule</Text>
              <Text style={styles.actionCardDesc}>View pending & completed consultations</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionCard, { width: '100%', flexDirection: 'row', alignItems: 'center', height: 90 }]}
            onPress={() => navigation.navigate('Profile')}
            activeOpacity={0.9}
          >
            <View style={[styles.iconBox, { backgroundColor: '#e0f2fe', marginRight: 16 }]}>
              <Ionicons name="person" size={28} color="#0284c7" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.actionCardTitle}>My Profile Details</Text>
              <Text style={styles.actionCardDesc}>Update availability hours & specialization</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
          </TouchableOpacity>
        </View>

        {/* Practice Tip Card */}
        <View style={[styles.infoBanner, { borderColor: '#e2e8f0', backgroundColor: '#ffffff' }]}>
          <Ionicons name="bulb" size={32} color="#d97706" style={styles.infoIcon} />
          <View style={styles.infoContent}>
            <Text style={[styles.infoTitle, { color: '#0f172a' }]}>Telehealth Tip</Text>
            <Text style={[styles.infoDesc, { color: '#475569' }]}>Ensure you mark completed visits to maintain clean health record synchronization for patients.</Text>
          </View>
        </View>
      </ScrollView>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {user?.role === 'DOCTOR' ? renderDoctorDashboard() : renderPatientDashboard()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  welcomeBanner: {
    backgroundColor: '#0d9488',
    borderRadius: 20,
    padding: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 28,
    shadowColor: '#0d9488',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 6,
  },
  welcomeLeft: {
    flex: 1,
    marginRight: 16,
  },
  greeting: {
    fontSize: 14,
    color: '#ccfbf1',
    fontWeight: '500',
  },
  userName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#ffffff',
    marginVertical: 4,
  },
  welcomeText: {
    fontSize: 13,
    color: '#ccfbf1',
  },
  avatarContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0d9488',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 16,
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  actionCard: {
    backgroundColor: '#ffffff',
    width: '48%',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  actionCardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 4,
  },
  actionCardDesc: {
    fontSize: 12,
    color: '#64748b',
    lineHeight: 16,
  },
  infoBanner: {
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoIcon: {
    marginRight: 16,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#166534',
    marginBottom: 2,
  },
  infoDesc: {
    fontSize: 12,
    color: '#15803d',
    lineHeight: 18,
  },
});

export default HomeScreen;
