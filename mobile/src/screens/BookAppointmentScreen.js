import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  SafeAreaView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../services/api';
import ErrorText from '../components/ErrorText';

const TIME_SLOTS = [
  '09:00 AM',
  '10:00 AM',
  '11:00 AM',
  '02:00 PM',
  '03:00 PM',
  '04:00 PM'
];

const BookAppointmentScreen = ({ route, navigation }) => {
  const { doctorId, doctorName } = route.params;

  const [month, setMonth] = useState('');
  const [day, setDay] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [reason, setReason] = useState('');

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const handleMonthChange = (val) => {
    const clean = val.replace(/\D/g, '').substring(0, 2);
    setMonth(clean);
    if (errors.date) setErrors({ ...errors, date: null });
  };

  const handleDayChange = (val) => {
    const clean = val.replace(/\D/g, '').substring(0, 2);
    setDay(clean);
    if (errors.date) setErrors({ ...errors, date: null });
  };

  const handleBook = async () => {
    setErrors({});
    let localErrors = {};

    if (!month.trim() || !day.trim()) {
      localErrors.date = 'Both Month and Day inputs are required.';
      setErrors(localErrors);
      return;
    }

    const mNum = parseInt(month, 10);
    const dNum = parseInt(day, 10);

    if (isNaN(mNum) || mNum < 1 || mNum > 12) {
      localErrors.date = 'Month must be a valid number between 01 and 12.';
      setErrors(localErrors);
      return;
    }

    if (isNaN(dNum) || dNum < 1 || dNum > 31) {
      localErrors.date = 'Day must be a valid number between 01 and 31.';
      setErrors(localErrors);
      return;
    }

    // Determine current year and logic rolling it forward if month entered is earlier than current month
    const today = new Date();
    const currentMonth = today.getMonth() + 1; // 1-indexed
    let year = today.getFullYear();

    if (mNum < currentMonth) {
      year += 1;
    }

    const targetDate = new Date(year, mNum - 1, dNum);
    // Validate if valid calendar date (e.g. Nov 31 doesn't exist, Date rolls it automatically, so check if month matches)
    if (targetDate.getMonth() !== mNum - 1) {
      localErrors.date = 'Please enter a valid calendar date.';
      setErrors(localErrors);
      return;
    }

    // Date range validation: between tomorrow and one month from today
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    const oneMonthAhead = new Date(today);
    oneMonthAhead.setMonth(today.getMonth() + 1);
    oneMonthAhead.setHours(23, 59, 59, 999);

    if (targetDate.getTime() < tomorrow.getTime() || targetDate.getTime() > oneMonthAhead.getTime()) {
      localErrors.date = 'Appointments must be booked between tomorrow and 1 month in advance.';
      setErrors(localErrors);
      return;
    }

    if (!selectedTime) {
      localErrors.time = 'Please select a preferred time slot.';
    }

    if (!reason.trim()) {
      localErrors.reason = 'Brief details of your health reason/symptoms is required.';
    }

    if (Object.keys(localErrors).length > 0) {
      setErrors(localErrors);
      return;
    }

    // Formatted ISO Date string
    const isoMonth = month.padStart(2, '0');
    const isoDay = day.padStart(2, '0');
    const dateStr = `${year}-${isoMonth}-${isoDay}`;

    setLoading(true);
    try {
      const response = await api.bookAppointment({
        doctorProfileId: doctorId,
        date: dateStr,
        time: selectedTime,
        reason: reason.trim(),
      });

      // Navigate to confirmation with confirmation details
      navigation.navigate('Confirmation', {
        appointment: response,
        doctorName: doctorName
      });
    } catch (error) {
      console.log('Booking error:', error);
      setErrors({ date: error.message || 'Failed to book appointment. Try another slot.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Booking Consultation with</Text>
            <Text style={styles.doctorName}>Dr. {doctorName}</Text>
          </View>

          <View style={styles.formCard}>
            {/* Custom Date Input Group (Numeric Manual Month/Day) */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Select Date (Month & Day only) *</Text>
              <Text style={styles.subLabel}>Range: Tomorrow to +1 Month. Year is automatically appended.</Text>
              <View style={styles.dateInputRow}>
                <View style={styles.dateInputBox}>
                  <Text style={styles.dateFieldLabel}>Month (MM)</Text>
                  <TextInput
                    style={[styles.numericInput, errors.date && styles.inputErrorBorder]}
                    placeholder="MM"
                    placeholderTextColor="#cbd5e1"
                    keyboardType="numeric"
                    maxLength={2}
                    value={month}
                    onChangeText={handleMonthChange}
                    editable={!loading}
                  />
                </View>
                <View style={styles.dateInputBox}>
                  <Text style={styles.dateFieldLabel}>Day (DD)</Text>
                  <TextInput
                    style={[styles.numericInput, errors.date && styles.inputErrorBorder]}
                    placeholder="DD"
                    placeholderTextColor="#cbd5e1"
                    keyboardType="numeric"
                    maxLength={2}
                    value={day}
                    onChangeText={handleDayChange}
                    editable={!loading}
                  />
                </View>
              </View>
              <ErrorText message={errors.date} />
            </View>

            {/* Time Slot Picker */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Preferred Time Slot *</Text>
              <View style={styles.timeGrid}>
                {TIME_SLOTS.map((slot) => {
                  const isSelected = selectedTime === slot;
                  return (
                    <TouchableOpacity
                      key={slot}
                      style={[styles.timeSlot, isSelected && styles.timeSlotSelected]}
                      onPress={() => {
                        setSelectedTime(slot);
                        if (errors.time) setErrors({ ...errors, time: null });
                      }}
                      disabled={loading}
                    >
                      <Text style={[styles.timeText, isSelected && styles.timeTextSelected]}>
                        {slot}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <ErrorText message={errors.time} />
            </View>

            {/* Symptoms Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Reason for Consultation / Symptoms *</Text>
              <TextInput
                style={[styles.textArea, errors.reason && styles.inputErrorBorder]}
                placeholder="Describe your health symptoms, conditions or reason for appointment here..."
                placeholderTextColor="#cbd5e1"
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                value={reason}
                onChangeText={(val) => {
                  setReason(val);
                  if (errors.reason) setErrors({ ...errors, reason: null });
                }}
                editable={!loading}
              />
              <ErrorText message={errors.reason} />
            </View>

            {/* CTA Button */}
            <TouchableOpacity
              style={styles.bookBtn}
              onPress={handleBook}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <Text style={styles.bookBtnText}>Confirm Booking</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  summaryCard: {
    backgroundColor: '#0d9488',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#0d9488',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#ccfbf1',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  doctorName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#ffffff',
    marginTop: 4,
  },
  formCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.02,
    shadowRadius: 8,
    elevation: 2,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  subLabel: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
    marginBottom: 12,
  },
  dateInputRow: {
    flexDirection: 'row',
    gap: 16,
  },
  dateInputBox: {
    flex: 1,
  },
  dateFieldLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  numericInput: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    height: 44,
    backgroundColor: '#f8fafc',
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  inputErrorBorder: {
    borderColor: '#ef4444',
  },
  timeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  timeSlot: {
    width: '31%',
    height: 38,
    borderRadius: 8,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  timeSlotSelected: {
    backgroundColor: '#0d9488',
    borderColor: '#0d9488',
  },
  timeText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '600',
  },
  timeTextSelected: {
    color: '#ffffff',
    fontWeight: '700',
  },
  textArea: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    backgroundColor: '#f8fafc',
    padding: 12,
    fontSize: 14,
    color: '#0f172a',
    marginTop: 10,
    height: 100,
  },
  bookBtn: {
    backgroundColor: '#0d9488',
    height: 48,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  bookBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
});

export default BookAppointmentScreen;
