import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../services/api';

const SPECIALIZATIONS = [
  'All',
  'General Medicine',
  'Cardiology',
  'Pediatrics',
  'Neurology',
  'Dermatology',
  'Orthopedics'
];

const DoctorsDirectoryScreen = ({ navigation }) => {
  const [doctors, setDoctors] = useState([]);
  const [filteredDoctors, setFilteredDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSpecialization, setSelectedSpecialization] = useState('All');

  useEffect(() => {
    fetchDoctors();
  }, []);

  const fetchDoctors = async () => {
    try {
      setLoading(true);
      const data = await api.getDoctors();
      setDoctors(data);
      setFilteredDoctors(data);
    } catch (error) {
      console.log('Error fetching doctors:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (text) => {
    setSearchQuery(text);
    filterDoctors(text, selectedSpecialization);
  };

  const handleSpecializationSelect = (spec) => {
    setSelectedSpecialization(spec);
    filterDoctors(searchQuery, spec);
  };

  const filterDoctors = (query, spec) => {
    let temp = [...doctors];

    if (query) {
      const q = query.toLowerCase();
      temp = temp.filter(
        (doc) =>
          (doc.user?.name && doc.user.name.toLowerCase().includes(q)) ||
          (doc.specialization && doc.specialization.toLowerCase().includes(q))
      );
    }

    if (spec && spec !== 'All') {
      temp = temp.filter(
        (doc) => doc.specialization && doc.specialization.toLowerCase() === spec.toLowerCase()
      );
    }

    setFilteredDoctors(temp);
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

  const renderDoctorItem = ({ item }) => {
    const isAvailable = item.isAvailable;
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate('DoctorDetails', { doctorId: item.id })}
        activeOpacity={0.8}
      >
        <View style={styles.cardHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{getInitials(item.user?.name)}</Text>
          </View>
          <View style={styles.headerInfo}>
            <Text style={styles.docName}>{item.user?.name || 'Doctor'}</Text>
            <View style={styles.specialtyBadge}>
              <Text style={styles.specialtyText}>{item.specialization}</Text>
            </View>
          </View>
        </View>

        <View style={styles.cardBody}>
          <View style={styles.infoRow}>
            <Ionicons name="ribbon-outline" size={16} color="#64748b" />
            <Text style={styles.infoText}>{item.experienceYears} Years Experience</Text>
          </View>
          {item.availabilityHours && (
            <View style={styles.infoRow}>
              <Ionicons name="time-outline" size={16} color="#64748b" />
              <Text style={styles.infoText} numberOfLines={1}>{item.availabilityHours}</Text>
            </View>
          )}
        </View>

        <View style={styles.cardFooter}>
          <View style={styles.statusContainer}>
            <View style={[styles.statusDot, { backgroundColor: isAvailable ? '#10b981' : '#cbd5e1' }]} />
            <Text style={[styles.statusText, { color: isAvailable ? '#047857' : '#64748b' }]}>
              {isAvailable ? 'Available Today' : 'Unavailable'}
            </Text>
          </View>
          <Text style={styles.bookCta}>View Details</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Search Header */}
      <View style={styles.searchHeader}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color="#94a3b8" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search doctor name or specialty..."
            placeholderTextColor="#94a3b8"
            value={searchQuery}
            onChangeText={handleSearch}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => handleSearch('')}>
              <Ionicons name="close-circle" size={18} color="#94a3b8" />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* Specialization selector */}
      <View style={{ height: 48, marginBottom: 12 }}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={SPECIALIZATIONS}
          keyExtractor={(item) => item}
          contentContainerStyle={styles.specList}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.specButton,
                selectedSpecialization === item && styles.specButtonSelected
              ]}
              onPress={() => handleSpecializationSelect(item)}
            >
              <Text
                style={[
                  styles.specText,
                  selectedSpecialization === item && styles.specTextSelected
                ]}
              >
                {item}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {/* Doctor List */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#0d9488" />
        </View>
      ) : filteredDoctors.length === 0 ? (
        <View style={styles.centerContainer}>
          <Ionicons name="people-outline" size={48} color="#cbd5e1" />
          <Text style={styles.emptyText}>No doctors match your filters.</Text>
        </View>
      ) : (
        <FlatList
          data={filteredDoctors}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderDoctorItem}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
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
  searchHeader: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#0f172a',
  },
  specList: {
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  specButton: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginRight: 8,
    height: 32,
    justifyContent: 'center',
  },
  specButtonSelected: {
    backgroundColor: '#0d9488',
    borderColor: '#0d9488',
  },
  specText: {
    fontSize: 13,
    color: '#475569',
    fontWeight: '500',
  },
  specTextSelected: {
    color: '#ffffff',
    fontWeight: '600',
  },
  listContainer: {
    paddingHorizontal: 16,
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
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.02,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#0d9488',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  headerInfo: {
    flex: 1,
  },
  docName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  specialtyBadge: {
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  specialtyText: {
    fontSize: 11,
    color: '#166534',
    fontWeight: '600',
  },
  cardBody: {
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 12,
    paddingBottom: 4,
    gap: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoText: {
    fontSize: 13,
    color: '#475569',
    marginLeft: 8,
  },
  cardFooter: {
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    marginTop: 12,
    paddingTop: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  bookCta: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0d9488',
  },
});

export default DoctorsDirectoryScreen;
