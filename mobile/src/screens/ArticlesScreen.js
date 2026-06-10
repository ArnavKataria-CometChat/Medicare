import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Modal,
  ScrollView,
  SafeAreaView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../services/api';

const CATEGORIES = ['All', 'Prevention', 'Symptoms', 'Nutrition', 'Diseases', 'Fitness'];

const ArticlesScreen = () => {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedArticle, setSelectedArticle] = useState(null);

  useEffect(() => {
    fetchArticles();
  }, []);

  const fetchArticles = async () => {
    try {
      setLoading(true);
      const data = await api.getArticles();
      // Filter only published articles
      const published = data.filter((art) => art.published);
      setArticles(published);
    } catch (error) {
      console.log('Error fetching articles:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredArticles = articles.filter((art) => {
    const matchesSearch = art.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          art.content.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || 
                            art.category?.toLowerCase() === selectedCategory.toLowerCase();
    return matchesSearch && matchesCategory;
  });

  const getCategoryColor = (category) => {
    const colors = {
      prevention: { bg: '#e0f2fe', text: '#0369a1' }, // Blue
      symptoms: { bg: '#fee2e2', text: '#b91c1c' }, // Red
      nutrition: { bg: '#d1fae5', text: '#047857' }, // Emerald
      fitness: { bg: '#fef3c7', text: '#b45309' }, // Amber
      diseases: { bg: '#f3e8ff', text: '#6b21a8' }, // Purple
    };
    return colors[category?.toLowerCase()] || { bg: '#f1f5f9', text: '#475569' };
  };

  const renderArticleContent = (content) => {
    if (!content) return null;
    return content.split('\n').map((line, idx) => {
      const trimmed = line.trim();
      if (trimmed.startsWith('###')) {
        return (
          <Text key={idx} style={styles.mdH3}>
            {trimmed.replace('###', '').trim()}
          </Text>
        );
      }
      if (trimmed.startsWith('####')) {
        return (
          <Text key={idx} style={styles.mdH4}>
            {trimmed.replace('####', '').trim()}
          </Text>
        );
      }
      if (trimmed.startsWith('**') && trimmed.endsWith('**')) {
        return (
          <Text key={idx} style={styles.mdBold}>
            {trimmed.replace(/\*\*/g, '').trim()}
          </Text>
        );
      }
      if (trimmed.startsWith('-') || trimmed.startsWith('*')) {
        // Bullet points
        const text = trimmed.substring(1).trim();
        // Parse bold text inline if any
        return (
          <View key={idx} style={styles.bulletRow}>
            <Text style={styles.bulletDot}>•</Text>
            <Text style={styles.bulletText}>{text}</Text>
          </View>
        );
      }
      if (trimmed.match(/^\d+\./)) {
        // Numbered list items
        return (
          <View key={idx} style={styles.bulletRow}>
            <Text style={styles.bulletNum}>{trimmed.split('.')[0]}.</Text>
            <Text style={styles.bulletText}>{trimmed.substring(trimmed.indexOf('.') + 1).trim()}</Text>
          </View>
        );
      }
      if (!trimmed) {
        return <View key={idx} style={{ height: 12 }} />;
      }
      return (
        <Text key={idx} style={styles.mdParagraph}>
          {trimmed}
        </Text>
      );
    });
  };

  const renderArticleItem = ({ item }) => {
    const { bg, text } = getCategoryColor(item.category);
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => setSelectedArticle(item)}
        activeOpacity={0.85}
      >
        <View style={styles.cardHeader}>
          <View style={[styles.categoryTag, { backgroundColor: bg }]}>
            <Text style={[styles.categoryText, { color: text }]}>
              {item.category ? item.category.toUpperCase() : 'GENERAL'}
            </Text>
          </View>
          <Text style={styles.readTime}>5 min read</Text>
        </View>

        <Text style={styles.cardTitle} numberOfLines={2}>
          {item.title}
        </Text>
        
        <Text style={styles.cardExcerpt} numberOfLines={2}>
          {item.content ? item.content.replace(/[#*]/g, '').trim() : ''}
        </Text>

        <View style={styles.cardFooter}>
          <Text style={styles.author}>MediCare Editorial Team</Text>
          <Ionicons name="arrow-forward" size={16} color="#0d9488" />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header Search Bar */}
      <View style={styles.header}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={20} color="#94a3b8" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search medical articles..."
            placeholderTextColor="#cbd5e1"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color="#94a3b8" />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* Categories Chips */}
      <View style={styles.categoryContainer}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={CATEGORIES}
          keyExtractor={(cat) => cat}
          contentContainerStyle={styles.categoryList}
          renderItem={({ item }) => {
            const isSelected = selectedCategory === item;
            return (
              <TouchableOpacity
                onPress={() => setSelectedCategory(item)}
                style={[styles.chip, isSelected && styles.chipSelected]}
                activeOpacity={0.7}
              >
                <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                  {item}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {/* Main List */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#0d9488" />
        </View>
      ) : filteredArticles.length === 0 ? (
        <View style={styles.centerContainer}>
          <Ionicons name="document-text-outline" size={48} color="#cbd5e1" />
          <Text style={styles.emptyText}>No articles match your search criteria.</Text>
        </View>
      ) : (
        <FlatList
          data={filteredArticles}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderArticleItem}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Article Detail Reader Modal */}
      {selectedArticle && (
        <Modal
          visible={true}
          animationType="slide"
          onRequestClose={() => setSelectedArticle(null)}
        >
          <SafeAreaView style={styles.modalSafeArea}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <TouchableOpacity
                onPress={() => setSelectedArticle(null)}
                style={styles.closeBtn}
              >
                <Ionicons name="arrow-back" size={24} color="#0f172a" />
              </TouchableOpacity>
              <Text style={styles.modalHeaderTitle} numberOfLines={1}>
                {selectedArticle.category ? selectedArticle.category.toUpperCase() : 'ARTICLE'}
              </Text>
              <View style={{ width: 24 }} />
            </View>

            <ScrollView contentContainerStyle={styles.modalContent} showsVerticalScrollIndicator={false}>
              {/* Category tag */}
              <View style={styles.metaRow}>
                <Text style={styles.authorMeta}>Published by MediCare Editorial Team</Text>
              </View>

              {/* Title */}
              <Text style={styles.detailTitle}>{selectedArticle.title}</Text>

              {/* Exclusions or Symptoms / Prevention Boxes */}
              {(selectedArticle.symptoms || selectedArticle.prevention) && (
                <View style={styles.infoBoxes}>
                  {selectedArticle.symptoms && (
                    <View style={[styles.infoBox, { borderColor: '#fee2e2', backgroundColor: '#fef2f2' }]}>
                      <Text style={[styles.infoBoxTitle, { color: '#991b1b' }]}>Common Symptoms</Text>
                      <Text style={styles.infoBoxDesc}>{selectedArticle.symptoms}</Text>
                    </View>
                  )}
                  {selectedArticle.prevention && (
                    <View style={[styles.infoBox, { borderColor: '#d1fae5', backgroundColor: '#f0fdf4' }]}>
                      <Text style={[styles.infoBoxTitle, { color: '#065f46' }]}>Prevention Guidelines</Text>
                      <Text style={styles.infoBoxDesc}>{selectedArticle.prevention}</Text>
                    </View>
                  )}
                </View>
              )}

              {/* Horizontal rule */}
              <View style={styles.divider} />

              {/* Content Body */}
              <View style={styles.bodyTextContainer}>
                {renderArticleContent(selectedArticle.content)}
              </View>
            </ScrollView>
          </SafeAreaView>
        </Modal>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderColor: '#e2e8f0',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 40,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#0f172a',
    fontWeight: '500',
  },
  categoryContainer: {
    backgroundColor: '#ffffff',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderColor: '#e2e8f0',
  },
  categoryList: {
    paddingHorizontal: 16,
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  chipSelected: {
    backgroundColor: '#0d9488',
    borderColor: '#0d9488',
  },
  chipText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '600',
  },
  chipTextSelected: {
    color: '#ffffff',
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
  listContainer: {
    padding: 16,
    paddingBottom: 24,
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
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  categoryTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  categoryText: {
    fontSize: 10,
    fontWeight: '700',
  },
  readTime: {
    fontSize: 11,
    color: '#64748b',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    lineHeight: 22,
    marginBottom: 6,
  },
  cardExcerpt: {
    fontSize: 13,
    color: '#64748b',
    lineHeight: 18,
    marginBottom: 14,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderColor: '#f1f5f9',
    paddingTop: 12,
  },
  author: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  modalSafeArea: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  modalHeader: {
    height: 56,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderColor: '#e2e8f0',
  },
  closeBtn: {
    padding: 4,
  },
  modalHeaderTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748b',
    letterSpacing: 1.2,
  },
  modalContent: {
    padding: 20,
    paddingBottom: 40,
  },
  metaRow: {
    marginBottom: 8,
  },
  authorMeta: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },
  detailTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0f172a',
    lineHeight: 30,
    marginBottom: 20,
  },
  infoBoxes: {
    gap: 12,
    marginBottom: 20,
  },
  infoBox: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
  },
  infoBoxTitle: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  infoBoxDesc: {
    fontSize: 13,
    color: '#334155',
    lineHeight: 18,
  },
  divider: {
    height: 1,
    backgroundColor: '#e2e8f0',
    marginBottom: 20,
  },
  bodyTextContainer: {
    gap: 12,
  },
  mdH3: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    marginTop: 8,
    marginBottom: 4,
  },
  mdH4: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
    marginTop: 6,
    marginBottom: 2,
  },
  mdBold: {
    fontWeight: '700',
    color: '#0f172a',
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingLeft: 8,
    marginVertical: 2,
  },
  bulletDot: {
    fontSize: 14,
    color: '#0d9488',
    marginRight: 8,
    lineHeight: 18,
  },
  bulletNum: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0d9488',
    marginRight: 8,
    lineHeight: 18,
  },
  bulletText: {
    flex: 1,
    fontSize: 14,
    color: '#334155',
    lineHeight: 20,
  },
  mdParagraph: {
    fontSize: 14,
    color: '#334155',
    lineHeight: 22,
  },
});

export default ArticlesScreen;
