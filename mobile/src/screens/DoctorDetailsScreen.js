import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  Image
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../services/api';
import { AuthContext } from '../context/AuthContext';

const DoctorDetailsScreen = ({ route, navigation }) => {
  const { doctorId } = route.params;
  const { user } = useContext(AuthContext);
  const [doctor, setDoctor] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDoctorDetails();
  }, [doctorId]);

  const fetchDoctorDetails = async () => {
    try {
      setLoading(true);
      const data = await api.getDoctorById(doctorId);
      setDoctor(data);
    } catch (error) {
      console.log('Error fetching doctor details:', error);
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (name) => {
    if (!name) return 'D';
    return name
      .trim()
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#0d9488" />
      </View>
    );
  }

  if (!doctor) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="alert-circle-outline" size={48} color="#cbd5e1" />
        <Text style={styles.emptyText}>Doctor not found.</Text>
      </View>
    );
  }

  const isPatient = user?.role === 'PATIENT';

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{getInitials(doctor.user?.name)}</Text>
          </View>
          <Text style={styles.docName}>{doctor.user?.name || 'Doctor'}</Text>
          <View style={styles.specialtyBadge}>
            <Text style={styles.specialtyText}>{doctor.specialization}</Text>
          </View>

          <View style={styles.statusBadge}>
            <View style={[styles.statusDot, { backgroundColor: doctor.isAvailable ? '#10b981' : '#cbd5e1' }]} />
            <Text style={[styles.statusText, { color: doctor.isAvailable ? '#047857' : '#64748b' }]}>
              {doctor.isAvailable ? 'Available Today' : 'Not Available'}
            </Text>
          </View>
        </View>

        {/* Stats Ribbon */}
        <View style={styles.statsRibbon}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{doctor.experienceYears}+</Text>
            <Text style={styles.statLabel}>Exp. Years</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={styles.statValue}>4.9★</Text>
            <Text style={styles.statLabel}>Rating</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={styles.statValue}>120+</Text>
            <Text style={styles.statLabel}>Patients</Text>
          </View>
        </View>

        {/* About Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About Doctor</Text>
          <Text style={styles.bioText}>
            {doctor.bio || `${doctor.user?.name} is a dedicated ${doctor.specialization} specialist committed to providing exceptional care. With over ${doctor.experienceYears} years of experience, ${doctor.user?.name} offers virtual health consultations, diagnosis, and personalized recovery programs.`}
          </Text>
        </View>

        {/* Details List */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Schedule & Contact</Text>
          <View style={styles.detailRow}>
            <View style={styles.detailIconBox}>
              <Ionicons name="time" size={18} color="#0d9488" />
            </View>
            <View style={styles.detailInfo}>
              <Text style={styles.detailLabel}>Availability Hours</Text>
              <Text style={styles.detailValue}>{doctor.availabilityHours || 'Mon - Fri, 9:00 AM - 5:00 PM'}</Text>
            </View>
          </View>

          <View style={styles.detailRow}>
            <View style={styles.detailIconBox}>
              <Ionicons name="mail" size={18} color="#0d9488" />
            </View>
            <View style={styles.detailInfo}>
              <Text style={styles.detailLabel}>Email Address</Text>
              <Text style={styles.detailValue}>{doctor.user?.email || 'N/A'}</Text>
            </View>
          </View>

          {doctor.user?.phone && (
            <View style={styles.detailRow}>
              <View style={styles.detailIconBox}>
                <Ionicons name="call" size={18} color="#0d9488" />
              </View>
              <View style={styles.detailInfo}>
                <Text style={styles.detailLabel}>Phone Number</Text>
                <Text style={styles.detailValue}>{doctor.user.phone}</Text>
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Booking CTA Button (only for Patients) */}
      {isPatient && doctor.isAvailable && (
        <View style={styles.ctaContainer}>
          <TouchableOpacity
            style={styles.ctaButton}
            onPress={() => navigation.navigate('BookAppointment', { doctorId: doctor.id, doctorName: doctor.user?.name })}
          >
            <Text style={styles.ctaText}>Book a Consultation</Text>
          </TouchableOpacity>
        </View>
      )}
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
    paddingBottom: 100,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 15,
    color: '#64748b',
    marginTop: 12,
  },
  profileCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.03,
    shadowRadius: 12,
    elevation: 3,
    marginBottom: 20,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#0d9488',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 16,
  },
  avatarText: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: '700',
  },
  docName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 6,
  },
  specialtyBadge: {
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginBottom: 12,
  },
  specialtyText: {
    fontSize: 12,
    color: '#166534',
    fontWeight: '600',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  statsRibbon: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 24,
  },
  statBox: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  statLabel: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '500',
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#e2e8f0',
  },
  section: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 12,
  },
  bioText: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 22,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  detailIconBox: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#ccfbf1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  detailInfo: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  detailValue: {
    fontSize: 14,
    color: '#0f172a',
    fontWeight: '500',
    marginTop: 2,
  },
  ctaContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#ffffff',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  ctaButton: {
    backgroundColor: '#0d9488',
    height: 48,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#0d9488',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  ctaText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
});

export default DoctorDetailsScreen;
