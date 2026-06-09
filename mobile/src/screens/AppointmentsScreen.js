import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  SafeAreaView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../services/api';
import { AuthContext } from '../context/AuthContext';

const AppointmentsScreen = ({ navigation }) => {
  const { user } = useContext(AuthContext);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchAppointments();
  }, []);

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      const data = await api.getAppointments();
      // Sort by date (newest first for record view, or upcoming first? Let's sort chronologically)
      const sorted = data.sort((a, b) => new Date(a.date) - new Date(b.date));
      setAppointments(sorted);
    } catch (error) {
      console.log('Error fetching appointments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const data = await api.getAppointments();
      const sorted = data.sort((a, b) => new Date(a.date) - new Date(b.date));
      setAppointments(sorted);
    } catch (e) {
      console.log(e);
    } finally {
      setRefreshing(false);
    }
  };

  const handleCancel = (id) => {
    Alert.alert(
      'Cancel Appointment',
      'Are you sure you want to cancel this consultation slot?',
      [
        { text: 'No, Keep it', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              await api.cancelAppointment(id);
              // Update state locally
              setAppointments((prev) =>
                prev.map((app) => (app.id === id ? { ...app, status: 'CANCELLED' } : app))
              );
              Alert.alert('Success', 'Consultation cancelled successfully.');
            } catch (err) {
              Alert.alert('Error', err.message || 'Failed to cancel appointment.');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const formatDate = (dateStr) => {
    try {
      const options = { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' };
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', options);
    } catch (e) {
      return dateStr;
    }
  };

  const renderAppointmentItem = ({ item }) => {
    const isCancelled = item.status === 'CANCELLED';
    const isDoctor = user?.role === 'DOCTOR';
    
    // For patient, we want to show doctor name. For doctor, we want to show patient name.
    const displayName = isDoctor 
      ? (item.patient?.name || 'Patient') 
      : `Dr. ${item.doctorProfile?.user?.name || 'Doctor'}`;
      
    const displaySpecialty = isDoctor 
      ? 'Patient Consultation' 
      : (item.doctorProfile?.specialization || 'Clinical Visit');

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.titleArea}>
            <Text style={styles.nameText}>{displayName}</Text>
            <Text style={styles.specialtyText}>{displaySpecialty}</Text>
          </View>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: isCancelled ? '#fee2e2' : '#d1fae5' }
            ]}
          >
            <Text style={[styles.statusText, { color: isCancelled ? '#991b1b' : '#065f46' }]}>
              {item.status}
            </Text>
          </View>
        </View>

        <View style={styles.cardBody}>
          <View style={styles.metaRow}>
            <Ionicons name="calendar-outline" size={16} color="#64748b" style={styles.metaIcon} />
            <Text style={styles.metaText}>{formatDate(item.date)}</Text>
          </View>
          <View style={styles.metaRow}>
            <Ionicons name="time-outline" size={16} color="#64748b" style={styles.metaIcon} />
            <Text style={styles.metaText}>{item.time}</Text>
          </View>
          {item.reason && (
            <View style={styles.reasonBox}>
              <Text style={styles.reasonLabel}>Reason:</Text>
              <Text style={styles.reasonText}>{item.reason}</Text>
            </View>
          )}
        </View>

        {!isCancelled && (
          <View style={styles.cardFooter}>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={() => handleCancel(item.id)}
              activeOpacity={0.8}
            >
              <Ionicons name="close-circle-outline" size={16} color="#ef4444" style={{ marginRight: 6 }} />
              <Text style={styles.cancelBtnText}>Cancel Consultation</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {loading && appointments.length === 0 ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#0d9488" />
        </View>
      ) : appointments.length === 0 ? (
        <View style={styles.centerContainer}>
          <Ionicons name="calendar-outline" size={48} color="#cbd5e1" />
          <Text style={styles.emptyText}>No appointments scheduled.</Text>
          <TouchableOpacity
            style={styles.refreshBtn}
            onPress={fetchAppointments}
          >
            <Text style={styles.refreshBtnText}>Check again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={appointments}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderAppointmentItem}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          refreshing={refreshing}
          onRefresh={handleRefresh}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  listContainer: {
    padding: 16,
    paddingBottom: 24,
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
    marginBottom: 16,
  },
  refreshBtn: {
    backgroundColor: '#ccfbf1',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  refreshBtnText: {
    color: '#0d9488',
    fontWeight: '700',
    fontSize: 14,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 16,
    marginBottom: 16,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.02,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingBottom: 12,
    marginBottom: 12,
  },
  titleArea: {
    flex: 1,
    marginRight: 10,
  },
  nameText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  specialtyText: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  cardBody: {
    gap: 8,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaIcon: {
    marginRight: 8,
  },
  metaText: {
    fontSize: 13,
    color: '#475569',
    fontWeight: '500',
  },
  reasonBox: {
    backgroundColor: '#f8fafc',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginTop: 4,
  },
  reasonLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
  },
  reasonText: {
    fontSize: 13,
    color: '#334155',
    marginTop: 2,
    lineHeight: 18,
  },
  cardFooter: {
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    marginTop: 12,
    paddingTop: 12,
    alignItems: 'flex-end',
  },
  cancelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#fca5a5',
  },
  cancelBtnText: {
    color: '#ef4444',
    fontSize: 12,
    fontWeight: '700',
  },
});

export default AppointmentsScreen;
