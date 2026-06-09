import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const ErrorText = ({ message }) => {
  if (!message) return null;

  return (
    <View style={styles.container}>
      <Ionicons name="alert-circle-outline" size={16} color="#ef4444" style={styles.icon} />
      <Text style={styles.text}>{message}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  icon: {
    marginRight: 6,
  },
  text: {
    color: '#ef4444',
    fontSize: 12,
    fontWeight: '500',
    flexShrink: 1,
  },
});

export default ErrorText;
