import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { collection, getDocs, query } from 'firebase/firestore';
import { useEffect, useMemo, useState } from 'react';
import {
  Alert, Linking,
  Modal,
  Platform, RefreshControl, ScrollView,
  StyleSheet, Text,
  TextInput,
  TouchableOpacity, View
} from 'react-native';
import { auth, db } from '../firebaseConfig';
import { getConcertTypeColor, getConcertTypeLabel } from '../utils/concertTypes';

// Вспомогательные функции
const groupConcertsByMonth = (concerts) => {
  if (!concerts || !Array.isArray(concerts)) return {};
  const groups = {};
  concerts.forEach(concert => {
    if (!concert.date) return;
    const date = new Date(concert.date);
    const monthKey = date.toLocaleString('ru-RU', { month: 'long', year: 'numeric' }).toUpperCase();
    if (!groups[monthKey]) groups[monthKey] = [];
    groups[monthKey].push(concert);
  });
  return groups;
};

const getSortedMonths = (groupedConcerts) => {
  if (!groupedConcerts || typeof groupedConcerts !== 'object') return [];
  const months = Object.keys(groupedConcerts);
  const getMonthNumber = (monthName) => {
    const monthsMap = {
      'ЯНВАРЬ': 0, 'ФЕВРАЛЬ': 1, 'МАРТ': 2, 'АПРЕЛЬ': 3, 'МАЙ': 4, 'ИЮНЬ': 5,
      'ИЮЛЬ': 6, 'АВГУСТ': 7, 'СЕНТЯБРЬ': 8, 'ОКТЯБРЬ': 9, 'НОЯБРЬ': 10, 'ДЕКАБРЬ': 11
    };
    return monthsMap[monthName] || 0;
  };
  return months.sort((a, b) => {
    const dateA = new Date(a.split(' ')[1], getMonthNumber(a.split(' ')[0]));
    const dateB = new Date(b.split(' ')[1], getMonthNumber(b.split(' ')[0]));
    return dateB - dateA;
  });
};

const getEventWord = (count) => {
  if (count % 10 === 1 && count % 100 !== 11) return 'событие';
  if ([2, 3, 4].includes(count % 10) && ![12, 13, 14].includes(count % 100)) return 'события';
  return 'событий';
};

// Константы для сортировки и поиска
const SORT_OPTIONS = {
  DATE_ASC: { key: 'date_asc', label: 'Дата (по возрастанию)', icon: 'calendar' },
  DATE_DESC: { key: 'date_desc', label: 'Дата (по убыванию)', icon: 'calendar' },
  TYPE: { key: 'type', label: 'По типу концерта', icon: 'musical-notes' },
  TIME: { key: 'time', label: 'По времени начала', icon: 'time' }
};

const SEARCH_OPTIONS = {
  ALL: { key: 'all', label: 'Везде' },
  DESCRIPTION: { key: 'description', label: 'В описании' },
  ADDRESS: { key: 'address', label: 'В адресе' },
  TYPE: { key: 'type', label: 'В типе концерта' },
  PARTICIPANTS: { key: 'participants', label: 'В участниках' }
};

export default function MyEventsScreen({ navigation, route }) {
  const { userRole } = route.params || {};
  const [concerts, setConcerts] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedMonths, setExpandedMonths] = useState({});
  
  // 🆕 СОСТОЯНИЯ ДЛЯ ПОИСКА И СОРТИРОВКИ
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOption, setSortOption] = useState(SORT_OPTIONS.DATE_DESC.key);
  const [searchOption, setSearchOption] = useState(SEARCH_OPTIONS.ALL.key);
  const [showSortModal, setShowSortModal] = useState(false);
  const [showSearchOptions, setShowSearchOptions] = useState(false);

  useEffect(() => {
    loadConcerts();
  }, []);

  const loadConcerts = async () => {
    try {
      console.log('📡 Загрузка концертов...');
      
      if (!auth.currentUser) {
        console.log('❌ Пользователь НЕ авторизован');
        Alert.alert('Ошибка', 'Пользователь не авторизован');
        setConcerts([]);
        setLoading(false);
        setRefreshing(false);
        return;
      }
      
      console.log('✅ Пользователь авторизован:', auth.currentUser.email);
      setLoading(true);
      
      const concertsQuery = query(collection(db, 'concerts'));
      const snapshot = await getDocs(concertsQuery);
      
      console.log('📥 Получено документов:', snapshot.size);
      
      const concertsData = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        concertsData.push({ id: doc.id, ...data });
      });
      
      console.log(`✅ Загружено ${concertsData.length} концертов`);
      setConcerts(concertsData);
      setLoading(false);
      setRefreshing(false);
      
    } catch (error) {
      console.error('❌ Ошибка загрузки:', error);
      Alert.alert('Ошибка', `Не удалось загрузить концерты: ${error.message}`);
      setConcerts([]);
      setLoading(false);
      setRefreshing(false);
    }
  };

  // 🆕 ФУНКЦИИ ПОИСКА
  const searchInConcert = (concert, query, field) => {
    if (!query.trim()) return true;
    
    const lowerQuery = query.toLowerCase().trim();
    
    switch (field) {
      case SEARCH_OPTIONS.DESCRIPTION.key:
        return concert.description?.toLowerCase().includes(lowerQuery) || false;
      
      case SEARCH_OPTIONS.ADDRESS.key:
        return concert.address?.toLowerCase().includes(lowerQuery) || false;
      
      case SEARCH_OPTIONS.TYPE.key:
        const typeLabel = getConcertTypeLabel(concert.concertType);
        return typeLabel.toLowerCase().includes(lowerQuery);
      
      case SEARCH_OPTIONS.PARTICIPANTS.key:
        return concert.participants?.some(participant => 
          participant.toLowerCase().includes(lowerQuery)
        ) || false;
      
      case SEARCH_OPTIONS.ALL.key:
      default:
        return (
          (concert.description?.toLowerCase().includes(lowerQuery) || false) ||
          (concert.address?.toLowerCase().includes(lowerQuery) || false) ||
          getConcertTypeLabel(concert.concertType).toLowerCase().includes(lowerQuery) ||
          (concert.participants?.some(participant => 
            participant.toLowerCase().includes(lowerQuery)
          ) || false)
        );
    }
  };

  // 🆕 ФУНКЦИИ СОРТИРОВКИ
  const sortConcerts = (concertsList, sortBy) => {
    const sorted = [...concertsList];
    
    switch (sortBy) {
      case SORT_OPTIONS.DATE_ASC.key:
        return sorted.sort((a, b) => new Date(a.date) - new Date(b.date));
      
      case SORT_OPTIONS.DATE_DESC.key:
        return sorted.sort((a, b) => new Date(b.date) - new Date(a.date));
      
      case SORT_OPTIONS.TYPE.key:
        return sorted.sort((a, b) => {
          const typeA = getConcertTypeLabel(a.concertType);
          const typeB = getConcertTypeLabel(b.concertType);
          return typeA.localeCompare(typeB);
        });
      
      case SORT_OPTIONS.TIME.key:
        return sorted.sort((a, b) => {
          const timeA = a.startTime || '00:00';
          const timeB = b.startTime || '00:00';
          return timeA.localeCompare(timeB);
        });
      
      default:
        return sorted;
    }
  };

  // 🆕 ОПТИМИЗИРОВАННЫЕ ВЫЧИСЛЕНИЯ С useMemo
  const filteredConcerts = useMemo(() => {
    return (concerts || []).filter(concert => {
      if (!concert || !concert.date) return false;
      
      // Фильтр по времени
      const concertDate = new Date(concert.date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (filter === 'past') return concertDate < today;
      else if (filter === 'upcoming') return concertDate >= today;
      return true;
    });
  }, [concerts, filter]);

  const searchedConcerts = useMemo(() => {
    return filteredConcerts.filter(concert => 
      searchInConcert(concert, searchQuery, searchOption)
    );
  }, [filteredConcerts, searchQuery, searchOption]);

  const sortedConcerts = useMemo(() => {
    return sortConcerts(searchedConcerts, sortOption);
  }, [searchedConcerts, sortOption]);

  const groupedConcerts = useMemo(() => {
    return groupConcertsByMonth(sortedConcerts);
  }, [sortedConcerts]);

  const sortedMonths = useMemo(() => {
    return getSortedMonths(groupedConcerts);
  }, [groupedConcerts]);

  const onRefresh = () => {
    console.log('🔄 Обновление данных...');
    setRefreshing(true);
    loadConcerts();
  };

  const toggleMonth = (month) => {
    setExpandedMonths(prev => ({ ...prev, [month]: !prev[month] }));
  };

  const openMaps = (address) => {
    if (!address) {
      Alert.alert('Ошибка', 'Адрес не указан');
      return;
    }
    const encodedAddress = encodeURIComponent(address);
    const url = Platform.select({
      ios: `maps:0,0?q=${encodedAddress}`,
      android: `geo:0,0?q=${encodedAddress}`,
      default: `https://maps.google.com/?q=${encodedAddress}`
    });
    Linking.openURL(url).catch((err) => {
      console.error('Ошибка открытия карт:', err);
      Alert.alert('Ошибка', 'Не удалось открыть карты');
    });
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const [year, month, day] = dateString.split('-');
    const months = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
    return `${parseInt(day)} ${months[parseInt(month) - 1]}`;
  };

  const handleConcertPress = (concert) => {
    navigation.navigate('ConcertDetail', { concert, userRole });
  };

  const renderConcertInfo = (concert) => {
    if (!concert) return null;
    const hasProgram = concert.program?.songs?.length > 0;
    const hasParticipants = concert.participants?.length > 0;
    if (!hasProgram && !hasParticipants) return null;
    return (
      <View style={styles.concertInfo}>
        {hasProgram && (
          <View style={styles.infoItem}>
            <Ionicons name="musical-notes" size={12} color="#DAA520" />
            <Text style={styles.infoText}>Программа: {concert.program.songs.length} произведений</Text>
          </View>
        )}
        {hasParticipants && (
          <View style={styles.infoItem}>
            <Ionicons name="people" size={12} color="#DAA520" />
            <Text style={styles.infoText}>Участники: {concert.participants.length} человек</Text>
          </View>
        )}
      </View>
    );
  };

  const renderConcertCard = (concert) => {
    if (!concert) return null;
    const concertTypeRussian = getConcertTypeLabel(concert.concertType);
    const concertColor = getConcertTypeColor(concert.concertType);
    return (
      <TouchableOpacity key={concert.id} style={styles.concertCard} onPress={() => handleConcertPress(concert)}>
        <LinearGradient colors={['#FFF8E1', '#FFE4B5']} style={styles.concertGradient}>
          <View style={styles.concertHeader}>
            <View style={styles.dateBadge}><Text style={styles.dateText}>{formatDate(concert.date)}</Text></View>
            <View style={[styles.typeBadge, {backgroundColor: concertColor}]}>
              <Text style={styles.concertType}>{concertTypeRussian}</Text>
            </View>
          </View>
          <Text style={styles.concertDescription} numberOfLines={2}>{concert.description || 'Без описания'}</Text>
          {renderConcertInfo(concert)}
          <View style={styles.concertFooter}>
            <TouchableOpacity style={styles.location} onPress={() => openMaps(concert.address)} activeOpacity={0.7}>
              <Ionicons name="location" size={14} color="#DAA520" />
              <Text style={styles.locationText} numberOfLines={1}>{concert.address || 'Адрес не указан'}</Text>
              <Ionicons name="open-outline" size={12} color="#DAA520" style={styles.mapIcon} />
            </TouchableOpacity>
            <View style={styles.time}>
              <Ionicons name="time" size={14} color="#DAA520" />
              <Text style={styles.timeText}>{concert.departureTime || '--:--'} → {concert.startTime || '--:--'}</Text>
            </View>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  // 🆕 РЕНДЕР ПОИСКА И СОРТИРОВКИ
  const renderSearchAndSort = () => (
    <View style={styles.searchSortContainer}>
      {/* ПОИСК */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Ionicons name="search" size={20} color="#8B8B8B" />
          <TextInput
            style={styles.searchInput}
            placeholder="Поиск концертов..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#8B8B8B"
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color="#8B8B8B" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={() => setShowSearchOptions(true)}>
              <Ionicons name="options" size={20} color="#DAA520" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ФИЛЬТРЫ И СОРТИРОВКА */}
      <View style={styles.controlsRow}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filters}>
          <TouchableOpacity style={[styles.filterButton, filter==='all'&&styles.filterButtonActive]} onPress={()=>setFilter('all')}>
            <Text style={[styles.filterText, filter==='all'&&styles.filterTextActive]}>Все</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.filterButton, filter==='upcoming'&&styles.filterButtonActive]} onPress={()=>setFilter('upcoming')}>
            <Text style={[styles.filterText, filter==='upcoming'&&styles.filterTextActive]}>Предстоящие</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.filterButton, filter==='past'&&styles.filterButtonActive]} onPress={()=>setFilter('past')}>
            <Text style={[styles.filterText, filter==='past'&&styles.filterTextActive]}>Прошедшие</Text>
          </TouchableOpacity>
        </ScrollView>

        <TouchableOpacity 
          style={styles.sortButton}
          onPress={() => setShowSortModal(true)}
        >
          <Ionicons name="filter" size={18} color="#DAA520" />
          <Text style={styles.sortButtonText}>Сортировка</Text>
        </TouchableOpacity>
      </View>

      {/* СТАТИСТИКА */}
      <View style={styles.statsContainer}>
        <Text style={styles.statsText}>
          Найдено: <Text style={styles.statsCount}>{sortedConcerts.length}</Text>
          {searchQuery && (
            <Text style={styles.searchStats}> по запросу "{searchQuery}"</Text>
          )}
        </Text>
        <Text style={styles.statsText}>Месяцев: <Text style={styles.statsCount}>{sortedMonths.length}</Text></Text>
        <TouchableOpacity style={styles.refreshButton} onPress={onRefresh} disabled={refreshing}>
          <Ionicons name="refresh" size={18} color={refreshing?'#8B8B8B':'#DAA520'} />
        </TouchableOpacity>
      </View>
    </View>
  );

  // 🆕 МОДАЛЬНОЕ ОКНО СОРТИРОВКИ
  const renderSortModal = () => (
    <Modal
      visible={showSortModal}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setShowSortModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Сортировка концертов</Text>
          
          {Object.values(SORT_OPTIONS).map((option) => (
            <TouchableOpacity
              key={option.key}
              style={[
                styles.sortOption,
                sortOption === option.key && styles.sortOptionActive
              ]}
              onPress={() => {
                setSortOption(option.key);
                setShowSortModal(false);
              }}
            >
              <Ionicons 
                name={option.icon} 
                size={20} 
                color={sortOption === option.key ? '#FFF' : '#DAA520'} 
              />
              <Text style={[
                styles.sortOptionText,
                sortOption === option.key && styles.sortOptionTextActive
              ]}>
                {option.label}
              </Text>
              {sortOption === option.key && (
                <Ionicons name="checkmark" size={20} color="#FFF" />
              )}
            </TouchableOpacity>
          ))}
          
          <TouchableOpacity 
            style={styles.modalCloseButton}
            onPress={() => setShowSortModal(false)}
          >
            <Text style={styles.modalCloseText}>Закрыть</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  // 🆕 МОДАЛЬНОЕ ОКНО ВЫБОРА ПОЛЯ ПОИСКА
  const renderSearchOptionsModal = () => (
    <Modal
      visible={showSearchOptions}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setShowSearchOptions(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Где искать?</Text>
          
          {Object.values(SEARCH_OPTIONS).map((option) => (
            <TouchableOpacity
              key={option.key}
              style={[
                styles.sortOption,
                searchOption === option.key && styles.sortOptionActive
              ]}
              onPress={() => {
                setSearchOption(option.key);
                setShowSearchOptions(false);
              }}
            >
              <Text style={[
                styles.sortOptionText,
                searchOption === option.key && styles.sortOptionTextActive
              ]}>
                {option.label}
              </Text>
              {searchOption === option.key && (
                <Ionicons name="checkmark" size={20} color="#FFF" />
              )}
            </TouchableOpacity>
          ))}
          
          <TouchableOpacity 
            style={styles.modalCloseButton}
            onPress={() => setShowSearchOptions(false)}
          >
            <Text style={styles.modalCloseText}>Закрыть</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  return (
    <LinearGradient colors={['#FFF8E1', '#FFE4B5', '#FFD700']} style={styles.container}>
      <LinearGradient colors={['rgba(255,248,225,0.95)', 'rgba(255,228,181,0.9)']} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={22} color="#3E2723" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>📅 Мои события</Text>
        <View style={styles.headerPlaceholder} />
      </LinearGradient>

      {renderSearchAndSort()}

      <ScrollView style={styles.content} refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#DAA520']} tintColor="#DAA520"/>
      }>
        {loading ? (
          <View style={styles.loadingContainer}>
            <Ionicons name="musical-notes" size={40} color="#DAA520" />
            <Text style={styles.loadingText}>Загрузка концертов...</Text>
          </View>
        ) : sortedConcerts.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={60} color="#DAA520" />
            <Text style={styles.emptyStateTitle}>
              {searchQuery ? 'Ничего не найдено' : 'Событий нет'}
            </Text>
            <Text style={styles.emptyStateText}>
              {searchQuery 
                ? 'Попробуйте изменить поисковый запрос или критерии поиска'
                : filter==='all'?'У вас пока нет концертов':filter==='upcoming'?'Нет предстоящих':'Нет прошедших'
              }
            </Text>
            {searchQuery && (
              <TouchableOpacity 
                style={styles.clearSearchButton}
                onPress={() => setSearchQuery('')}
              >
                <Text style={styles.clearSearchText}>Очистить поиск</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          sortedMonths.map((month) => {
            const monthConcerts = groupedConcerts[month] || [];
            const isExpanded = expandedMonths[month] !== false;
            return (
              <View key={month} style={styles.monthSection}>
                <TouchableOpacity style={styles.monthHeader} onPress={()=>toggleMonth(month)} activeOpacity={0.7}>
                  <View style={styles.monthTitleContainer}>
                    <Text style={styles.monthTitle}>{month}</Text>
                    <Text style={styles.monthCount}>{monthConcerts.length} {getEventWord(monthConcerts.length)}</Text>
                  </View>
                  <Ionicons name={isExpanded?"chevron-up":"chevron-down"} size={20} color="#DAA520" />
                </TouchableOpacity>
                {isExpanded && monthConcerts.map(concert => renderConcertCard(concert))}
              </View>
            );
          })
        )}
      </ScrollView>

      {renderSortModal()}
      {renderSearchOptionsModal()}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 18, paddingTop: 48, paddingBottom: 18,
    borderBottomLeftRadius: 22, borderBottomRightRadius: 22,
    shadowColor: '#8B6B4F', shadowOffset: { width: 0, height: 4 }, 
    shadowOpacity: 0.1, shadowRadius: 8, elevation: 5
  },
  backButton: { padding: 6 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#3E2723' },
  headerPlaceholder: { width: 36 },
  
  // 🆕 СТИЛИ ДЛЯ ПОИСКА И СОРТИРОВКИ
  searchSortContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(218, 165, 32, 0.2)',
  },
  searchContainer: {
    marginBottom: 12,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    marginRight: 8,
    fontSize: 14,
    color: '#3E2723',
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  filters: {
    flex: 1,
    marginRight: 8,
  },
  filterButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(255,255,255,0.5)',
    borderRadius: 8,
    alignItems: 'center',
    marginRight: 6,
  },
  filterButtonActive: { backgroundColor: '#FFD700' },
  filterText: { fontSize: 12, color: '#8B8B8B', fontWeight: '500' },
  filterTextActive: { color: '#3E2723', fontWeight: 'bold' },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.8)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(218, 165, 32, 0.3)',
  },
  sortButtonText: {
    fontSize: 12,
    color: '#3E2723',
    fontWeight: '500',
    marginLeft: 4,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.8)',
    padding: 8,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(218, 165, 32, 0.3)',
  },
  statsText: {
    fontSize: 12,
    color: '#3E2723',
    fontWeight: '500',
    flex: 1,
  },
  statsCount: {
    fontWeight: 'bold',
    color: '#DAA520',
  },
  searchStats: {
    fontSize: 11,
    color: '#8B8B8B',
    fontStyle: 'italic',
  },
  refreshButton: { padding: 4 },
  
  // 🆕 СТИЛИ МОДАЛЬНЫХ ОКОН
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    width: '100%',
    maxWidth: 350,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#3E2723',
    marginBottom: 20,
    textAlign: 'center',
  },
  sortOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    marginBottom: 8,
    backgroundColor: '#F5F5F5',
  },
  sortOptionActive: {
    backgroundColor: '#DAA520',
  },
  sortOptionText: {
    fontSize: 14,
    color: '#3E2723',
    fontWeight: '500',
    flex: 1,
    marginLeft: 12,
  },
  sortOptionTextActive: {
    color: 'white',
    fontWeight: '600',
  },
  modalCloseButton: {
    backgroundColor: '#DAA520',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 15,
  },
  modalCloseText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  
  // Существующие стили
  content: { flex: 1, padding: 16 },
  loadingContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40 },
  loadingText: { fontSize: 14, color: '#3E2723', marginTop: 10 },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyStateTitle: { fontSize: 16, fontWeight: 'bold', color: '#3E2723', marginTop: 12 },
  emptyStateText: { fontSize: 12, color: '#8B8B8B', marginTop: 6, textAlign: 'center' },
  clearSearchButton: {
    backgroundColor: '#DAA520',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 15,
  },
  clearSearchText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  monthSection: { marginBottom: 20 },
  monthHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255,215,0,0.15)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#DAA520',
  },
  monthTitleContainer: { flex: 1 },
  monthTitle: { fontSize: 16, fontWeight: 'bold', color: '#3E2723', marginBottom: 2 },
  monthCount: { fontSize: 12, color: '#8B8B8B', fontWeight: '500' },
  concertCard: {
    marginBottom: 12,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#8B6B4F',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  concertGradient: { padding: 16, borderRadius: 16 },
  concertHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  dateBadge: { backgroundColor: '#FFD700', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  dateText: { fontSize: 11, fontWeight: 'bold', color: '#3E2723' },
  typeBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, maxWidth: '60%' },
  concertType: { fontSize: 10, color: '#FFFFFF', fontWeight: 'bold', textAlign: 'center' },
  concertDescription: { fontSize: 14, fontWeight: '600', color: '#3E2723', marginBottom: 10, lineHeight: 18 },
  concertInfo: { borderTopWidth: 1, borderTopColor: 'rgba(218,165,32,0.2)', paddingTop: 8, marginBottom: 8 },
  infoItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  infoText: { fontSize: 10, color: '#8B8B8B', marginLeft: 5 },
  concertFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  location: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
    padding: 4,
    borderRadius: 6,
  },
  locationText: { fontSize: 11, color: '#8B8B8B', marginLeft: 4, flex: 1, textDecorationLine: 'underline' },
  mapIcon: { marginLeft: 4 },
  time: { flexDirection: 'row', alignItems: 'center' },
  timeText: { fontSize: 11, color: '#DAA520', marginLeft: 4, fontWeight: '500' },
});