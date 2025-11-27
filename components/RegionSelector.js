import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import {
    FlatList,
    Modal,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { ALL_REGIONS, getColorByRegion } from '../utils/statisticsUtils';

export default function RegionSelector({ selectedRegion, onSelectRegion, visible, onClose, responsiveFontSize }) {
  const [searchText, setSearchText] = useState('');
  const [filteredRegions, setFilteredRegions] = useState(ALL_REGIONS);

  useEffect(() => {
    if (searchText.trim() === '') {
      setFilteredRegions(ALL_REGIONS);
    } else {
      const filtered = ALL_REGIONS.filter(region =>
        region.toLowerCase().includes(searchText.toLowerCase())
      );
      setFilteredRegions(filtered);
    }
  }, [searchText]);

  const handleSelectRegion = (region) => {
    onSelectRegion(region);
    setSearchText('');
    onClose();
  };

  const renderRegionItem = ({ item }) => {
    const isSelected = item === selectedRegion;
    const color = getColorByRegion(item);

    return (
      <TouchableOpacity
        style={[styles.regionItem, isSelected && styles.regionItemSelected]}
        onPress={() => handleSelectRegion(item)}
      >
        <LinearGradient
          colors={[color + '20', color + '10']}
          style={styles.regionItemGradient}
        >
          <View
            style={[
              styles.regionDot,
              { backgroundColor: color }
            ]}
          />
          <Text
            style={[
              styles.regionText,
              { fontSize: responsiveFontSize(13) },
              isSelected && styles.regionTextSelected
            ]}
            numberOfLines={1}
          >
            {item}
          </Text>
          {isSelected && (
            <Ionicons name="checkmark-circle" size={20} color={color} />
          )}
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <LinearGradient
          colors={['rgba(26, 26, 26, 0.98)', 'rgba(35, 35, 35, 0.95)']}
          style={styles.header}
        >
          <View style={styles.headerContent}>
            <View style={styles.headerTop}>
              <Text style={[styles.title, { fontSize: responsiveFontSize(18) }]}>
                📍 Выберите область
              </Text>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Ionicons name="close" size={24} color="#FFD700" />
              </TouchableOpacity>
            </View>

            <View style={styles.searchContainer}>
              <Ionicons name="search" size={18} color="#999" style={styles.searchIcon} />
              <TextInput
                style={[styles.searchInput, { fontSize: responsiveFontSize(13) }]}
                placeholder="Поиск области..."
                placeholderTextColor="#666"
                value={searchText}
                onChangeText={setSearchText}
              />
              {searchText.length > 0 && (
                <TouchableOpacity onPress={() => setSearchText('')}>
                  <Ionicons name="close-circle" size={18} color="#999" />
                </TouchableOpacity>
              )}
            </View>
          </View>
        </LinearGradient>

        <FlatList
          data={filteredRegions}
          renderItem={renderRegionItem}
          keyExtractor={(item) => item}
          style={styles.list}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />

        {filteredRegions.length === 0 && (
          <View style={styles.emptyContainer}>
            <Ionicons name="search-outline" size={48} color="#555" />
            <Text style={[styles.emptyText, { fontSize: responsiveFontSize(14) }]}>
              Регион не найден
            </Text>
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
  },
  header: {
    paddingHorizontal: 15,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 215, 0, 0.2)',
  },
  headerContent: {
    gap: 12,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontWeight: '700',
    color: '#FFD700',
  },
  closeButton: {
    padding: 8,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(42, 42, 42, 0.8)',
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.2)',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    color: '#E0E0E0',
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  regionItem: {
    marginBottom: 8,
    borderRadius: 12,
    overflow: 'hidden',
  },
  regionItemSelected: {
    borderWidth: 2,
    borderColor: '#FFD700',
  },
  regionItemGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  regionDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 10,
  },
  regionText: {
    flex: 1,
    color: '#E0E0E0',
    fontWeight: '500',
  },
  regionTextSelected: {
    fontWeight: '700',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
  },
  emptyText: {
    color: '#888',
    marginTop: 16,
    textAlign: 'center',
  },
});