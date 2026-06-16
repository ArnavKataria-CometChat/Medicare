import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const ConfirmationScreen = ({ route, navigation }) => {
  const { appointment, doctorName } = route.params;

  const formatDate = (dateStr) => {
    try {
      const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', options);
    } catch (e) {
      return dateStr;
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {/* Success Icon */}
        <View style={styles.successHeader}>
          <View style={styles.checkCircle}>
            <Ionicons name="checkmark" size={40} color="#ffffff" />
          </View>
          <Text style={styles.successTitle}>Consultation Confirmed!</Text>
          <Text style={styles.successSubtitle}>Your virtual appointment has been successfully scheduled.</Text>
        </View>

        {/* Receipt Ticket Card */}
        <View style={styles.ticket}>
          <View style={styles.ticketHeader}>
            <Text style={styles.ticketTitle}>MEDICARE VISIT RECEIPT</Text>
            <Text style={styles.refId}>REF ID: #{appointment.id || 'N/A'}</Text>
          </View>

          {/* Dashed Line */}
          <View style={styles.dashedDivider} />

          <View style={styles.ticketBody}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Consultant</Text>
              <Text style={styles.detailVal}>{doctorName}</Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Date</Text>
              <Text style={styles.detailVal}>{formatDate(appointment.date)}</Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Time Slot</Text>
              <Text style={styles.detailVal}>{appointment.time}</Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Status</Text>
              <View style={styles.statusBadge}>
                <Text style={styles.statusText}>CONFIRMED</Text>
              </View>
            </View>

            {appointment.reason && (
              <View style={[styles.detailRow, { flexDirection: 'column', alignItems: 'flex-start' }]}>
                <Text style={[styles.detailLabel, { marginBottom: 4 }]}>Consultation Reason</Text>
                <Text style={styles.reasonText}>{appointment.reason}</Text>
              </View>
            )}
          </View>

          {/* Dashed Line */}
          <View style={styles.dashedDivider} />

          <View style={styles.ticketFooter}>
            <Ionicons name="videocam" size={18} color="#0d9488" style={{ marginRight: 8 }} />
            <Text style={styles.footerNote}>Link will be available 10 mins before start</Text>
          </View>
        </View>

        {/* Action Button */}
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => {
            // Navigate to the Appointments stack screen
            navigation.navigate('Appointments');
          }}
        >
          <Text style={styles.actionBtnText}>Go to Appointments</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollContainer: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    flexGrow: 1,
  },
  successHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  checkCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#10b981', // Emerald-500
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  successTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0f172a',
    textAlign: 'center',
  },
  successSubtitle: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 6,
    paddingHorizontal: 20,
    lineHeight: 18,
  },
  ticket: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    width: '100%',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.04,
    shadowRadius: 15,
    elevation: 4,
    marginBottom: 30,
  },
  ticketHeader: {
    padding: 20,
    alignItems: 'center',
  },
  ticketTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
    letterSpacing: 1.5,
  },
  refId: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
    marginTop: 6,
  },
  dashedDivider: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderStyle: 'dashed',
    marginHorizontal: 16,
  },
  ticketBody: {
    padding: 20,
    gap: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '500',
  },
  detailVal: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  statusBadge: {
    backgroundColor: '#d1fae5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusText: {
    color: '#065f46',
    fontSize: 11,
    fontWeight: '700',
  },
  reasonText: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 18,
    backgroundColor: '#f8fafc',
    padding: 10,
    borderRadius: 8,
    width: '100%',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  ticketFooter: {
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
  footerNote: {
    fontSize: 12,
    color: '#0d9488',
    fontWeight: '600',
  },
  actionBtn: {
    backgroundColor: '#0d9488',
    height: 48,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  actionBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
});

export default ConfirmationScreen;
