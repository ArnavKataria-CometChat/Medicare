import React, { useState, useEffect } from 'react';
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
import * as DocumentPicker from 'expo-document-picker';
import { api } from '../services/api';

const PatientRecordsScreen = () => {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchRecords();
  }, []);

  const fetchRecords = async () => {
    try {
      setLoading(true);
      const data = await api.getMyRecords();
      setRecords(data);
    } catch (error) {
      console.log('Error fetching records:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*', // Allow all document formats
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      const pickedAsset = result.assets[0];
      
      // Enforce file size limit (10MB limit matches backend)
      if (pickedAsset.size && pickedAsset.size > 10 * 1024 * 1024) {
        Alert.alert('File too large', 'Please upload a file smaller than 10MB.');
        return;
      }

      setUploading(true);

      const formData = new FormData();
      // On iOS and Android we need to supply the file object as follows
      formData.append('file', {
        uri: pickedAsset.uri,
        name: pickedAsset.name,
        type: pickedAsset.mimeType || 'application/octet-stream',
      });

      const response = await api.uploadRecord(formData);
      
      // Append the newly uploaded record to state
      setRecords((prev) => [response.record, ...prev]);
      Alert.alert('Success', 'Medical document uploaded successfully.');
    } catch (error) {
      console.log('Document upload error:', error);
      Alert.alert('Upload Failed', error.message || 'Could not upload selected file.');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteRecord = (id, name) => {
    Alert.alert(
      'Delete Record',
      `Are you sure you want to permanently delete '${name}'?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              await api.deleteRecord(id);
              setRecords((prev) => prev.filter((rec) => rec.id !== id));
              Alert.alert('Success', 'Record deleted successfully.');
            } catch (err) {
              Alert.alert('Error', err.message || 'Failed to delete record.');
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
      const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', options);
    } catch (e) {
      return dateStr;
    }
  };

  const getFileIcon = (mimeType) => {
    if (!mimeType) return 'document-outline';
    if (mimeType.includes('pdf')) return 'document-text-outline';
    if (mimeType.includes('image')) return 'image-outline';
    if (mimeType.includes('text')) return 'document-outline';
    return 'document-attach-outline';
  };

  const renderRecordItem = ({ item }) => {
    return (
      <View style={styles.card}>
        <View style={styles.cardIconBox}>
          <Ionicons name={getFileIcon(item.fileType)} size={24} color="#0d9488" />
        </View>
        
        <View style={styles.cardContent}>
          <Text style={styles.fileName} numberOfLines={1}>
            {item.fileName}
          </Text>
          <Text style={styles.fileDate}>{formatDate(item.uploadedAt)}</Text>
        </View>

        <TouchableOpacity
          onPress={() => handleDeleteRecord(item.id, item.fileName)}
          style={styles.deleteBtn}
          activeOpacity={0.7}
        >
          <Ionicons name="trash-outline" size={20} color="#ef4444" />
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Upload Banner */}
      <View style={styles.uploadSection}>
        <Text style={styles.sectionTitle}>Upload Documents</Text>
        <Text style={styles.sectionDesc}>Share lab reports, prescriptions, or vaccination records securely with your clinical providers.</Text>
        
        <TouchableOpacity
          style={styles.uploadBtn}
          onPress={handlePickDocument}
          disabled={uploading}
          activeOpacity={0.8}
        >
          {uploading ? (
            <ActivityIndicator color="#ffffff" size="small" />
          ) : (
            <>
              <Ionicons name="cloud-upload-outline" size={20} color="#ffffff" style={{ marginRight: 8 }} />
              <Text style={styles.uploadBtnText}>Select & Upload Document</Text>
            </>
          )}
        </TouchableOpacity>
        
        <Text style={styles.limitInfo}>
          Max size: 10MB • Supports PDF, Images, Text, and standard documents.
        </Text>
      </View>

      <Text style={styles.historyTitle}>Your Upload History</Text>

      {/* History List */}
      {loading && records.length === 0 ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#0d9488" />
        </View>
      ) : records.length === 0 ? (
        <View style={styles.centerContainer}>
          <Ionicons name="folder-open-outline" size={48} color="#cbd5e1" />
          <Text style={styles.emptyText}>No medical records uploaded yet.</Text>
        </View>
      ) : (
        <FlatList
          data={records}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderRecordItem}
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
  uploadSection: {
    backgroundColor: '#ffffff',
    margin: 16,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.02,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 6,
  },
  sectionDesc: {
    fontSize: 12,
    color: '#64748b',
    lineHeight: 18,
    marginBottom: 16,
  },
  uploadBtn: {
    backgroundColor: '#0d9488',
    height: 44,
    borderRadius: 10,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  limitInfo: {
    fontSize: 11,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 10,
    fontWeight: '500',
  },
  historyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
    marginHorizontal: 16,
    marginBottom: 10,
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
    fontSize: 14,
    color: '#64748b',
    marginTop: 12,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardIconBox: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#ccfbf1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cardContent: {
    flex: 1,
    marginRight: 8,
  },
  fileName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
  },
  fileDate: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  deleteBtn: {
    padding: 8,
  },
});

export default PatientRecordsScreen;
