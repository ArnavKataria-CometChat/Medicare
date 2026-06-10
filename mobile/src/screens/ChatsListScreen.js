import React, { useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../context/AuthContext';

const ChatsListScreen = ({ navigation }) => {
  const { user } = useContext(AuthContext);

  const isDoctor = user?.role === 'DOCTOR';

  const contacts = isDoctor
    ? [
        { id: '1', name: 'Arnav Kataria', role: 'PATIENT', initials: 'AK', desc: 'Patient (Mild Fatigue)', lastMsg: 'Thanks doctor, feeling better', time: '10:32 AM' },
        { id: '2', name: 'Ananya Kataria', role: 'CAREGIVER', initials: 'AK', desc: 'Caregiver / Family', lastMsg: 'Should we adjust the dosage?', time: '10:35 AM' },
        { id: '3', name: 'Jane Doe', role: 'PATIENT', initials: 'JD', desc: 'Patient (BP Check)', lastMsg: 'Telemetry logged', time: 'Yesterday' }
      ]
    : [
        { id: '1', name: 'Dr. Sarah Jenkins', role: 'DOCTOR', specialty: 'Cardiologist', initials: 'SJ', desc: 'Cardiology Specialist', lastMsg: 'I reviewed your ECG telemetry', time: '10:30 AM' },
        { id: '2', name: 'Dr. Marcus Vance', role: 'DOCTOR', specialty: 'Neurologist', initials: 'MV', desc: 'Neurology Specialist', lastMsg: 'MRI scan scheduling', time: 'Monday' },
        { id: '3', name: 'Dr. Evelyn Ross', role: 'DOCTOR', specialty: 'General Practitioner', initials: 'ER', desc: 'Primary Family Physician', lastMsg: 'Prescription renewal ready', time: 'Friday' }
      ];

  const renderContactItem = ({ item }) => {
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate('ChatSimulation', { contact: item })}
        activeOpacity={0.7}
      >
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{item.initials}</Text>
        </View>
        <View style={styles.info}>
          <View style={styles.nameRow}>
            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.time}>{item.time}</Text>
          </View>
          <Text style={styles.desc}>{item.specialty || item.desc}</Text>
          <Text style={styles.lastMsg} numberOfLines={1}>
            {item.lastMsg}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color="#94a3b8" />
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Consultation Rooms</Text>
        <Text style={styles.headerSub}>Select a channel to begin messaging</Text>
      </View>
      <FlatList
        data={contacts}
        keyExtractor={(item) => item.id}
        renderItem={renderContactItem}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="chatbubbles-outline" size={48} color="#cbd5e1" />
            <Text style={styles.emptyText}>No active consultations</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    padding: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderColor: '#e2e8f0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
  },
  headerSub: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  list: {
    padding: 16,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 14,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#0d9488',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  avatarText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  info: {
    flex: 1,
    marginRight: 8,
  },
  nameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  name: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
  },
  time: {
    fontSize: 11,
    color: '#94a3b8',
  },
  desc: {
    fontSize: 12,
    color: '#0d9488',
    fontWeight: '500',
    marginTop: 2,
  },
  lastMsg: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
  },
  emptyText: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 12,
  },
});

export default ChatsListScreen;
