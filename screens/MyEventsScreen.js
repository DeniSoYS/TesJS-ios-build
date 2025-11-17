import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { collection, getDocs, query } from 'firebase/firestore';
import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Animated,
  Dimensions,
  Linking,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { auth, db } from '../firebaseConfig';
import { getConcertTypeColor, getConcertTypeLabel } from '../utils/concertTypes';

const { width, height } = Dimensions.get('window');
const isSmallDevice = width < 375;
const isLargeDevice = width > 414;

const getResponsiveSize = (size) => {
  if (isSmallDevice) return size * 0.85;
  if (isLargeDevice) return size * 1.15;
  return size;
};

const getResponsiveFontSize = (size) => {
  const baseSize = getResponsiveSize(size);
  return Math.round(baseSize);
};

// Вспомогательные функции (без изменений)
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
  
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOption, setSortOption] = useState(SORT_OPTIONS.DATE_DESC.key);
  const [searchOption, setSearchOption] = useState(SEARCH_OPTIONS.ALL.key);
  const [showSortModal, setShowSortModal] = useState(false);
  const [showSearchOptions, setShowSearchOptions] = useState(false);

  const fadeAnim = useState(new Animated.Value(0))[0];

  useEffect(() => {
    loadConcerts();
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();
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

  // ФУНКЦИИ ПОИСКА (без изменений)
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

  // ФУНКЦИИ СОРТИРОВКИ (без изменений)
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

  // ОПТИМИЗИРОВАННЫЕ ВЫЧИСЛЕНИЯ С useMemo (без изменений)
  const filteredConcerts = useMemo(() => {
    return (concerts || []).filter(concert => {
      if (!concert || !concert.date) return false;
      
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
            <Ionicons name="musical-notes" size={12} color="#FFD700" />
            <Text style={styles.infoText}>Программа: {concert.program.songs.length} произведений</Text>
          </View>
        )}
        {hasParticipants && (
          <View style={styles.infoItem}>
            <Ionicons name="people" size={12} color="#FFD700" />
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
        <LinearGradient colors={['rgba(26, 26, 26, 0.9)', 'rgba(35, 35, 35, 0.8)']} style={styles.concertGradient}>
          <View style={styles.concertHeader}>
            <View style={styles.dateBadge}>
              <LinearGradient colors={['#FFD700', '#FFA500']} style={styles.dateBadgeGradient}>
                <Text style={styles.dateText}>{formatDate(concert.date)}</Text>
              </LinearGradient>
            </View>
            <View style={[styles.typeBadge, {backgroundColor: concertColor}]}>
              <Text style={styles.concertType}>{concertTypeRussian}</Text>
            </View>
          </View>
          <Text style={styles.concertDescription} numberOfLines={2}>{concert.description || 'Без описания'}</Text>
          {renderConcertInfo(concert)}
          <View style={styles.concertFooter}>
            <TouchableOpacity style={styles.location} onPress={() => openMaps(concert.address)} activeOpacity={0.7}>
              <Ionicons name="location" size={14} color="#FFD700" />
              <Text style={styles.locationText} numberOfLines={1}>{concert.address || 'Адрес не указан'}</Text>
              <Ionicons name="open-outline" size={12} color="#FFD700" style={styles.mapIcon} />
            </TouchableOpacity>
            <View style={styles.time}>
              <Ionicons name="time" size={14} color="#FFD700" />
              <Text style={styles.timeText}>{concert.departureTime || '--:--'} → {concert.startTime || '--:--'}</Text>
            </View>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  // РЕНДЕР ПОИСКА И СОРТИРОВКИ (обновленный дизайн)
  const renderSearchAndSort = () => (
    <Animated.View style={[styles.searchSortContainer, { opacity: fadeAnim }]}>
      {/* ПОИСК */}
      <View style={styles.searchContainer}>
        <LinearGradient colors={['rgba(26, 26, 26, 0.9)', 'rgba(35, 35, 35, 0.8)']} style={styles.searchInputContainer}>
          <Ionicons name="search" size={20} color="#FFD700" />
          <TextInput
            style={styles.searchInput}
            placeholder="Поиск концертов..."
            placeholderTextColor="#888"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color="#FFD700" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={() => setShowSearchOptions(true)}>
              <Ionicons name="options" size={20} color="#FFD700" />
            </TouchableOpacity>
          )}
        </LinearGradient>
      </View>

      {/* ФИЛЬТРЫ И СОРТИРОВКА */}
      <View style={styles.controlsRow}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filters}>
          <TouchableOpacity 
            style={[styles.filterButton, filter==='all'&&styles.filterButtonActive]} 
            onPress={()=>setFilter('all')}
          >
            <LinearGradient 
              colors={filter==='all' ? ['#FFD700', '#FFA500'] : ['rgba(42, 42, 42, 0.8)', 'rgba(35, 35, 35, 0.8)']} 
              style={styles.filterButtonGradient}
            >
              <Text style={[styles.filterText, filter==='all'&&styles.filterTextActive]}>Все</Text>
            </LinearGradient>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.filterButton, filter==='upcoming'&&styles.filterButtonActive]} 
            onPress={()=>setFilter('upcoming')}
          >
            <LinearGradient 
              colors={filter==='upcoming' ? ['#FFD700', '#FFA500'] : ['rgba(42, 42, 42, 0.8)', 'rgba(35, 35, 35, 0.8)']} 
              style={styles.filterButtonGradient}
            >
              <Text style={[styles.filterText, filter==='upcoming'&&styles.filterTextActive]}>Предстоящие</Text>
            </LinearGradient>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.filterButton, filter==='past'&&styles.filterButtonActive]} 
            onPress={()=>setFilter('past')}
          >
            <LinearGradient 
              colors={filter==='past' ? ['#FFD700', '#FFA500'] : ['rgba(42, 42, 42, 0.8)', 'rgba(35, 35, 35, 0.8)']} 
              style={styles.filterButtonGradient}
            >
              <Text style={[styles.filterText, filter==='past'&&styles.filterTextActive]}>Прошедшие</Text>
            </LinearGradient>
          </TouchableOpacity>
        </ScrollView>

        <TouchableOpacity 
          style={styles.sortButton}
          onPress={() => setShowSortModal(true)}
        >
          <LinearGradient colors={['rgba(42, 42, 42, 0.9)', 'rgba(35, 35, 35, 0.8)']} style={styles.sortButtonGradient}>
            <Ionicons name="filter" size={18} color="#FFD700" />
            <Text style={styles.sortButtonText}>Сортировка</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* СТАТИСТИКА */}
      <LinearGradient colors={['rgba(26, 26, 26, 0.8)', 'rgba(35, 35, 35, 0.7)']} style={styles.statsContainer}>
        <Text style={styles.statsText}>
          Найдено: <Text style={styles.statsCount}>{sortedConcerts.length}</Text>
          {searchQuery && (
            <Text style={styles.searchStats}> по запросу "{searchQuery}"</Text>
          )}
        </Text>
        <Text style={styles.statsText}>Месяцев: <Text style={styles.statsCount}>{sortedMonths.length}</Text></Text>
        <TouchableOpacity style={styles.refreshButton} onPress={onRefresh} disabled={refreshing}>
          <Ionicons name="refresh" size={18} color={refreshing?'#555':'#FFD700'} />
        </TouchableOpacity>
      </LinearGradient>
    </Animated.View>
  );

  // МОДАЛЬНОЕ ОКНО СОРТИРОВКИ (обновленный дизайн)
  const renderSortModal = () => (
    <Modal
      visible={showSortModal}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setShowSortModal(false)}
    >
      <View style={styles.modalOverlay}>
        <LinearGradient colors={['rgba(26, 26, 26, 0.98)', 'rgba(35, 35, 35, 0.95)']} style={styles.modalContent}>
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
              <LinearGradient 
                colors={sortOption === option.key ? ['#FFD700', '#FFA500'] : ['rgba(42, 42, 42, 0.8)', 'rgba(35, 35, 35, 0.8)']} 
                style={styles.sortOptionGradient}
              >
                <Ionicons 
                  name={option.icon} 
                  size={20} 
                  color={sortOption === option.key ? '#1a1a1a' : '#FFD700'} 
                />
                <Text style={[
                  styles.sortOptionText,
                  sortOption === option.key && styles.sortOptionTextActive
                ]}>
                  {option.label}
                </Text>
                {sortOption === option.key && (
                  <Ionicons name="checkmark" size={20} color="#1a1a1a" />
                )}
              </LinearGradient>
            </TouchableOpacity>
          ))}
          
          <TouchableOpacity 
            style={styles.modalCloseButton}
            onPress={() => setShowSortModal(false)}
          >
            <LinearGradient colors={['#FF6B6B', '#EE5A52']} style={styles.modalCloseGradient}>
              <Text style={styles.modalCloseText}>Закрыть</Text>
            </LinearGradient>
          </TouchableOpacity>
        </LinearGradient>
      </View>
    </Modal>
  );

  // МОДАЛЬНОЕ ОКНО ВЫБОРА ПОЛЯ ПОИСКА (обновленный дизайн)
  const renderSearchOptionsModal = () => (
    <Modal
      visible={showSearchOptions}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setShowSearchOptions(false)}
    >
      <View style={styles.modalOverlay}>
        <LinearGradient colors={['rgba(26, 26, 26, 0.98)', 'rgba(35, 35, 35, 0.95)']} style={styles.modalContent}>
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
              <LinearGradient 
                colors={searchOption === option.key ? ['#FFD700', '#FFA500'] : ['rgba(42, 42, 42, 0.8)', 'rgba(35, 35, 35, 0.8)']} 
                style={styles.sortOptionGradient}
              >
                <Text style={[
                  styles.sortOptionText,
                  searchOption === option.key && styles.sortOptionTextActive
                ]}>
                  {option.label}
                </Text>
                {searchOption === option.key && (
                  <Ionicons name="checkmark" size={20} color="#1a1a1a" />
                )}
              </LinearGradient>
            </TouchableOpacity>
          ))}
          
          <TouchableOpacity 
            style={styles.modalCloseButton}
            onPress={() => setShowSearchOptions(false)}
          >
            <LinearGradient colors={['#FF6B6B', '#EE5A52']} style={styles.modalCloseGradient}>
              <Text style={styles.modalCloseText}>Закрыть</Text>
            </LinearGradient>
          </TouchableOpacity>
        </LinearGradient>
      </View>
    </Modal>
  );

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#0a0a0a', '#1a1a1a', '#2a2a2a']}
        style={styles.background}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        {/* Шапка в стиле CalendarScreen */}
        <Animated.View style={{ opacity: fadeAnim }}>
          <LinearGradient
            colors={['rgba(26, 26, 26, 0.98)', 'rgba(35, 35, 35, 0.95)']}
            style={styles.header}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.headerBackground}>
              <View style={[styles.decorCircle, styles.decorCircle1]} />
              <View style={[styles.decorCircle, styles.decorCircle2]} />
              <View style={[styles.decorCircle, styles.decorCircle3]} />
            </View>

            <View style={styles.headerContent}>
              <View style={styles.topRow}>
                <TouchableOpacity 
                  onPress={() => navigation.goBack()}
                  style={styles.backButton}
                >
                  <LinearGradient
                    colors={['#FFD700', '#FFA500']}
                    style={styles.backButtonGradient}
                  >
                    <Ionicons name="arrow-back" size={getResponsiveSize(20)} color="#1a1a1a" />
                  </LinearGradient>
                </TouchableOpacity>

                <View style={styles.titleSection}>
                  <View style={styles.titleIconContainer}>
                    <LinearGradient
                      colors={['#FFD700', '#FFA500']}
                      style={styles.titleIconGradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    >
                      <Ionicons name="musical-notes" size={getResponsiveSize(28)} color="#1a1a1a" />
                    </LinearGradient>
                  </View>
                  <View style={styles.titleTextContainer}>
                    <Text style={styles.mainTitle}>Мои концерты</Text>
                    <Text style={styles.subtitle}>История и расписание</Text>
                  </View>
                </View>

                <View style={styles.statsContainerSmall}>
                  <View style={styles.statCardSmall}>
                    <View style={styles.statIconWrapper}>
                      <Ionicons name="musical-notes" size={getResponsiveSize(16)} color="#FFD700" />
                    </View>
                    <View style={styles.statTextContainer}>
                      <Text style={styles.statValue}>{concerts.length}</Text>
                      <Text style={styles.statLabel}>Всего</Text>
                    </View>
                  </View>
                </View>
              </View>
            </View>
          </LinearGradient>
        </Animated.View>

        {renderSearchAndSort()}

        <ScrollView 
          style={styles.content} 
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={onRefresh} 
              colors={['#FFD700']} 
              tintColor="#FFD700"
              progressBackgroundColor="#1a1a1a"
            />
          }
        >
          {loading ? (
            <View style={styles.loadingContainer}>
              <Ionicons name="musical-notes" size={40} color="#FFD700" />
              <Text style={styles.loadingText}>Загрузка концертов...</Text>
            </View>
          ) : sortedConcerts.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="calendar-outline" size={60} color="#FFD700" />
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
                  <LinearGradient colors={['#FFD700', '#FFA500']} style={styles.clearSearchGradient}>
                    <Text style={styles.clearSearchText}>Очистить поиск</Text>
                  </LinearGradient>
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
                    <LinearGradient colors={['rgba(255, 215, 0, 0.15)', 'rgba(255, 165, 0, 0.1)']} style={styles.monthHeaderGradient}>
                      <View style={styles.monthTitleContainer}>
                        <Text style={styles.monthTitle}>{month}</Text>
                        <Text style={styles.monthCount}>{monthConcerts.length} {getEventWord(monthConcerts.length)}</Text>
                      </View>
                      <Ionicons name={isExpanded?"chevron-up":"chevron-down"} size={20} color="#FFD700" />
                    </LinearGradient>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  background: {
    flex: 1,
  },
  
  // Стили шапки как в CalendarScreen
  header: {
    paddingHorizontal: getResponsiveSize(20),
    paddingTop: Platform.OS === 'ios' ? getResponsiveSize(50) : getResponsiveSize(30),
    paddingBottom: getResponsiveSize(24),
    borderBottomLeftRadius: getResponsiveSize(30),
    borderBottomRightRadius: getResponsiveSize(30),
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
    position: 'relative',
    overflow: 'hidden',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 215, 0, 0.3)',
  },
  headerBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  decorCircle: {
    position: 'absolute',
    borderRadius: 1000,
    opacity: 0.05,
  },
  decorCircle1: {
    width: getResponsiveSize(200),
    height: getResponsiveSize(200),
    backgroundColor: '#FFD700',
    top: -getResponsiveSize(80),
    right: -getResponsiveSize(50),
  },
  decorCircle2: {
    width: getResponsiveSize(150),
    height: getResponsiveSize(150),
    backgroundColor: '#FFA500',
    bottom: -getResponsiveSize(60),
    left: -getResponsiveSize(40),
  },
  decorCircle3: {
    width: getResponsiveSize(100),
    height: getResponsiveSize(100),
    backgroundColor: '#DAA520',
    top: getResponsiveSize(40),
    left: getResponsiveSize(30),
  },
  headerContent: {
    position: 'relative',
    zIndex: 2,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backButton: {
    borderRadius: getResponsiveSize(20),
    overflow: 'hidden',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  backButtonGradient: {
    width: getResponsiveSize(44),
    height: getResponsiveSize(44),
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleSection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(42, 42, 42, 0.6)',
    paddingHorizontal: getResponsiveSize(16),
    paddingVertical: getResponsiveSize(14),
    borderRadius: getResponsiveSize(16),
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.2)',
    flex: 1,
    marginHorizontal: getResponsiveSize(12),
  },
  titleIconContainer: {
    marginRight: getResponsiveSize(14),
  },
  titleIconGradient: {
    width: getResponsiveSize(56),
    height: getResponsiveSize(56),
    borderRadius: getResponsiveSize(16),
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 5,
  },
  titleTextContainer: {
    flex: 1,
  },
  mainTitle: {
    fontSize: getResponsiveFontSize(20),
    fontWeight: '800',
    color: '#E0E0E0',
    letterSpacing: 0.3,
    marginBottom: getResponsiveSize(2),
  },
  subtitle: {
    fontSize: getResponsiveFontSize(13),
    color: '#999',
    fontWeight: '500',
  },
  statsContainerSmall: {
    backgroundColor: 'rgba(42, 42, 42, 0.6)',
    borderRadius: getResponsiveSize(16),
    padding: getResponsiveSize(12),
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.2)',
  },
  statCardSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: getResponsiveSize(8),
  },
  statIconWrapper: {
    width: getResponsiveSize(32),
    height: getResponsiveSize(32),
    borderRadius: getResponsiveSize(10),
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statTextContainer: {
    flex: 1,
  },
  statValue: {
    fontSize: getResponsiveFontSize(16),
    fontWeight: '800',
    color: '#E0E0E0',
    letterSpacing: 0.3,
  },
  statLabel: {
    fontSize: getResponsiveFontSize(10),
    color: '#999',
    fontWeight: '600',
    marginTop: getResponsiveSize(2),
  },
  
  // Стили поиска и сортировки
  searchSortContainer: {
    paddingHorizontal: getResponsiveSize(16),
    paddingTop: getResponsiveSize(12),
    backgroundColor: 'transparent',
  },
  searchContainer: {
    marginBottom: getResponsiveSize(12),
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: getResponsiveSize(12),
    paddingHorizontal: getResponsiveSize(12),
    paddingVertical: getResponsiveSize(10),
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
  },
  searchInput: {
    flex: 1,
    marginLeft: getResponsiveSize(8),
    marginRight: getResponsiveSize(8),
    fontSize: getResponsiveFontSize(14),
    color: '#E0E0E0',
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: getResponsiveSize(8),
  },
  filters: {
    flex: 1,
    marginRight: getResponsiveSize(8),
  },
  filterButton: {
    borderRadius: getResponsiveSize(8),
    overflow: 'hidden',
    marginRight: getResponsiveSize(6),
  },
  filterButtonGradient: {
    paddingVertical: getResponsiveSize(6),
    paddingHorizontal: getResponsiveSize(12),
    alignItems: 'center',
  },
  filterButtonActive: {
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 3,
  },
  filterText: { 
    fontSize: getResponsiveFontSize(12), 
    color: '#888', 
    fontWeight: '500' 
  },
  filterTextActive: { 
    color: '#1a1a1a', 
    fontWeight: 'bold' 
  },
  sortButton: {
    borderRadius: getResponsiveSize(8),
    overflow: 'hidden',
  },
  sortButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: getResponsiveSize(12),
    paddingVertical: getResponsiveSize(6),
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
  },
  sortButtonText: {
    fontSize: getResponsiveFontSize(12),
    color: '#E0E0E0',
    fontWeight: '500',
    marginLeft: getResponsiveSize(4),
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: getResponsiveSize(8),
    borderRadius: getResponsiveSize(8),
    marginBottom: getResponsiveSize(8),
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.2)',
  },
  statsText: {
    fontSize: getResponsiveFontSize(12),
    color: '#E0E0E0',
    fontWeight: '500',
    flex: 1,
  },
  statsCount: {
    fontWeight: 'bold',
    color: '#FFD700',
  },
  searchStats: {
    fontSize: getResponsiveFontSize(11),
    color: '#888',
    fontStyle: 'italic',
  },
  refreshButton: { 
    padding: getResponsiveSize(4) 
  },
  
  // Контент
  content: { 
    flex: 1, 
    padding: getResponsiveSize(16) 
  },
  loadingContainer: { 
    alignItems: 'center', 
    justifyContent: 'center', 
    paddingVertical: getResponsiveSize(40) 
  },
  loadingText: { 
    fontSize: getResponsiveFontSize(14), 
    color: '#E0E0E0', 
    marginTop: getResponsiveSize(10) 
  },
  emptyState: { 
    alignItems: 'center', 
    justifyContent: 'center', 
    paddingVertical: getResponsiveSize(60) 
  },
  emptyStateTitle: { 
    fontSize: getResponsiveFontSize(16), 
    fontWeight: 'bold', 
    color: '#E0E0E0', 
    marginTop: getResponsiveSize(12) 
  },
  emptyStateText: { 
    fontSize: getResponsiveFontSize(12), 
    color: '#888', 
    marginTop: getResponsiveSize(6), 
    textAlign: 'center' 
  },
  clearSearchButton: {
    borderRadius: getResponsiveSize(10),
    overflow: 'hidden',
    marginTop: getResponsiveSize(15),
  },
  clearSearchGradient: {
    paddingHorizontal: getResponsiveSize(20),
    paddingVertical: getResponsiveSize(10),
    alignItems: 'center',
  },
  clearSearchText: {
    color: '#1a1a1a',
    fontSize: getResponsiveFontSize(14),
    fontWeight: '600',
  },
  
  // Секции месяцев
  monthSection: { 
    marginBottom: getResponsiveSize(20) 
  },
  monthHeader: {
    borderRadius: getResponsiveSize(12),
    overflow: 'hidden',
    marginBottom: getResponsiveSize(8),
  },
  monthHeaderGradient: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: getResponsiveSize(16),
    paddingVertical: getResponsiveSize(12),
    borderLeftWidth: getResponsiveSize(4),
    borderLeftColor: '#FFD700',
  },
  monthTitleContainer: { 
    flex: 1 
  },
  monthTitle: { 
    fontSize: getResponsiveFontSize(16), 
    fontWeight: 'bold', 
    color: '#E0E0E0', 
    marginBottom: getResponsiveSize(2) 
  },
  monthCount: { 
    fontSize: getResponsiveFontSize(12), 
    color: '#888', 
    fontWeight: '500' 
  },
  
  // Карточки концертов
  concertCard: {
    marginBottom: getResponsiveSize(12),
    borderRadius: getResponsiveSize(16),
    overflow: 'hidden',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  concertGradient: { 
    padding: getResponsiveSize(16), 
    borderRadius: getResponsiveSize(16),
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.2)',
  },
  concertHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: getResponsiveSize(10),
  },
  dateBadge: {
    borderRadius: getResponsiveSize(10),
    overflow: 'hidden',
  },
  dateBadgeGradient: { 
    paddingHorizontal: getResponsiveSize(10), 
    paddingVertical: getResponsiveSize(5), 
    alignItems: 'center' 
  },
  dateText: { 
    fontSize: getResponsiveFontSize(11), 
    fontWeight: 'bold', 
    color: '#1a1a1a' 
  },
  typeBadge: { 
    paddingHorizontal: getResponsiveSize(10), 
    paddingVertical: getResponsiveSize(5), 
    borderRadius: getResponsiveSize(10), 
    maxWidth: '60%' 
  },
  concertType: { 
    fontSize: getResponsiveFontSize(10), 
    color: '#FFFFFF', 
    fontWeight: 'bold', 
    textAlign: 'center' 
  },
  concertDescription: { 
    fontSize: getResponsiveFontSize(14), 
    fontWeight: '600', 
    color: '#E0E0E0', 
    marginBottom: getResponsiveSize(10), 
    lineHeight: getResponsiveFontSize(18) 
  },
  concertInfo: { 
    borderTopWidth: 1, 
    borderTopColor: 'rgba(255, 215, 0, 0.2)', 
    paddingTop: getResponsiveSize(8), 
    marginBottom: getResponsiveSize(8) 
  },
  infoItem: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginBottom: getResponsiveSize(4) 
  },
  infoText: { 
    fontSize: getResponsiveFontSize(10), 
    color: '#888', 
    marginLeft: getResponsiveSize(5) 
  },
  concertFooter: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center' 
  },
  location: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: getResponsiveSize(8),
    padding: getResponsiveSize(4),
    borderRadius: getResponsiveSize(6),
  },
  locationText: { 
    fontSize: getResponsiveFontSize(11), 
    color: '#888', 
    marginLeft: getResponsiveSize(4), 
    flex: 1, 
    textDecorationLine: 'underline' 
  },
  mapIcon: { 
    marginLeft: getResponsiveSize(4) 
  },
  time: { 
    flexDirection: 'row', 
    alignItems: 'center' 
  },
  timeText: { 
    fontSize: getResponsiveFontSize(11), 
    color: '#FFD700', 
    marginLeft: getResponsiveSize(4), 
    fontWeight: '500' 
  },
  
  // Модальные окна
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: getResponsiveSize(20),
  },
  modalContent: {
    borderRadius: getResponsiveSize(20),
    padding: getResponsiveSize(20),
    width: '100%',
    maxWidth: getResponsiveSize(350),
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
  },
  modalTitle: {
    fontSize: getResponsiveFontSize(18),
    fontWeight: 'bold',
    color: '#E0E0E0',
    marginBottom: getResponsiveSize(20),
    textAlign: 'center',
  },
  sortOption: {
    borderRadius: getResponsiveSize(10),
    overflow: 'hidden',
    marginBottom: getResponsiveSize(8),
  },
  sortOptionGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: getResponsiveSize(12),
    paddingHorizontal: getResponsiveSize(16),
  },
  sortOptionActive: {
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 3,
  },
  sortOptionText: {
    fontSize: getResponsiveFontSize(14),
    color: '#E0E0E0',
    fontWeight: '500',
    flex: 1,
    marginLeft: getResponsiveSize(12),
  },
  sortOptionTextActive: {
    color: '#1a1a1a',
    fontWeight: '600',
  },
  modalCloseButton: {
    borderRadius: getResponsiveSize(10),
    overflow: 'hidden',
    marginTop: getResponsiveSize(15),
  },
  modalCloseGradient: {
    paddingVertical: getResponsiveSize(12),
    borderRadius: getResponsiveSize(10),
    alignItems: 'center',
  },
  modalCloseText: {
    color: 'white',
    fontSize: getResponsiveFontSize(14),
    fontWeight: '600',
  },
});