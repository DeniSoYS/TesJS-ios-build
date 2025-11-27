import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { signOut } from 'firebase/auth';
import { collection, deleteDoc, doc, getDocs, query } from 'firebase/firestore';
import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { Calendar, LocaleConfig } from 'react-native-calendars';
import { auth, db } from '../firebaseConfig';
import { calculateStatistics, getColorByRegion, getCurrentMonthName, getCurrentQuarterText, getLast4MonthsText } from '../utils/statisticsUtils'; // ✅ НОВЫЙ ИМПОРТ

// ✅ ФУНКЦИЯ КОНВЕРТАЦИИ ТИПОВ
const toRussianType = (englishType) => {
  const types = {
    'GENERAL': 'Общий концерт',
    'BRIGADE_1': 'Первая бригада',
    'BRIGADE_2': 'Вторая бригада',
    'BRIGADE_ENHANCED': 'Концерт усиленной бригады',
    'SOLOISTS_ORCHESTRA': 'Солисты оркестр',
    'UNKNOWN': 'Неизвестно'
  };
  return types[englishType] || 'Неизвестно';
};

// ✅ АДАПТИВНЫЕ РАЗМЕРЫ С RESIZE LISTENER
const getWindowDimensions = () => {
  if (Platform.OS === 'web') {
    return {
      width: window.innerWidth,
      height: window.innerHeight
    };
  }
  return Dimensions.get('window');
};

const useWindowDimensions = () => {
  const [dimensions, setDimensions] = useState(getWindowDimensions());

  useEffect(() => {
    if (Platform.OS === 'web') {
      const handleResize = () => {
        setDimensions(getWindowDimensions());
      };
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }
  }, []);

  return dimensions;
};

const getResponsiveSize = (size, windowWidth) => {
  const isSmallDevice = windowWidth < 375;
  const isLargeDevice = windowWidth > 414;
  if (isSmallDevice) return size * 0.85;
  if (isLargeDevice) return size * 1.15;
  return size;
};

const getResponsiveFontSize = (size, windowWidth) => {
  const baseSize = getResponsiveSize(size, windowWidth);
  return Math.round(baseSize);
};

// ✅ КОМПОНЕНТ MODAL OVERLAY (ЗАМЕНА BLURVIEW)
const ModalOverlay = ({ children, visible, onClose }) => {
  if (!visible) return null;
  
  return (
    <View style={styles.modalOverlay}>
      <TouchableOpacity 
        style={styles.modalBackdrop}
        activeOpacity={1}
        onPress={onClose}
      />
      {children}
    </View>
  );
};

// ✅ КОМПОНЕНТ CUSTOM ALERT
const CustomAlert = ({ visible, title, message, buttons, onClose }) => {
  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.customAlertOverlay}>
        <View style={styles.customAlertContainer}>
          <LinearGradient
            colors={['rgba(26, 26, 26, 0.98)', 'rgba(35, 35, 35, 0.95)']}
            style={styles.customAlertGradient}
          >
            <Text style={styles.customAlertTitle}>{title}</Text>
            <Text style={styles.customAlertMessage}>{message}</Text>
            
            <View style={styles.customAlertButtons}>
              {buttons.map((button, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.customAlertButton,
                    button.style === 'destructive' && styles.customAlertButtonDestructive,
                    button.style === 'cancel' && styles.customAlertButtonCancel
                  ]}
                  onPress={() => {
                    button.onPress && button.onPress();
                    onClose();
                  }}
                >
                  <LinearGradient
                    colors={
                      button.style === 'destructive' 
                        ? ['#FF6B6B', '#EE5A52']
                        : button.style === 'cancel'
                        ? ['#555', '#444']
                        : ['#FFD700', '#FFA500']
                    }
                    style={styles.customAlertButtonGradient}
                  >
                    <Text style={styles.customAlertButtonText}>{button.text}</Text>
                  </LinearGradient>
                </TouchableOpacity>
              ))}
            </View>
          </LinearGradient>
        </View>
      </View>
    </Modal>
  );
};

// Настройка календаря на русский язык
LocaleConfig.locales['ru'] = {
  monthNames: [
    'январь', 'февраль', 'март', 'апрель', 'май', 'июнь',
    'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь'
  ],
  monthNamesShort: ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'],
  dayNames: ['воскресенье', 'понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота'],
  dayNamesShort: ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'],
  today: 'сегодня'
};
LocaleConfig.defaultLocale = 'ru';

// ✅ КОМПОНЕНТ ПРОГРЕСС-БАР
const ProgressBar = ({ voronezh, other, total, responsiveSize, responsiveFontSize }) => {
  const voronejPercentage = total > 0 ? Math.round((voronezh / total) * 100) : 0;
  const otherPercentage = total > 0 ? Math.round((other / total) * 100) : 0;

  return (
    <View style={styles.progressBarContainer}>
      <View style={styles.progressBarRow}>
        <View style={[styles.progressSegment, { width: `${voronejPercentage}%`, backgroundColor: '#4A90E2' }]} />
        <View style={[styles.progressSegment, { width: `${otherPercentage}%`, backgroundColor: '#34C759' }]} />
      </View>
      
      <View style={styles.progressLabelsRow}>
        <View style={styles.progressLabel}>
          <View style={[styles.progressLegend, { backgroundColor: '#4A90E2' }]} />
          <Text style={[styles.progressLabelText, { fontSize: responsiveFontSize(11) }]}>
            Воронеж: {voronezh} ({voronejPercentage}%)
          </Text>
        </View>
        <View style={styles.progressLabel}>
          <View style={[styles.progressLegend, { backgroundColor: '#34C759' }]} />
          <Text style={[styles.progressLabelText, { fontSize: responsiveFontSize(11) }]}>
            Прочие: {other} ({otherPercentage}%)
          </Text>
        </View>
      </View>
    </View>
  );
};

export default function CalendarScreen({ navigation, route }) {
  const dimensions = useWindowDimensions();
  const userEmail = route.params?.email || 'Пользователь';
  const userRole = route.params?.role || 'user';
  
  const [refreshing, setRefreshing] = useState(false);
  
  const getTodayDate = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  
  const today = getTodayDate();
  
  const [selectedDate, setSelectedDate] = useState('');
  const [markedDates, setMarkedDates] = useState({});
  const [modalVisible, setModalVisible] = useState(false);
  const [eventTypeModalVisible, setEventTypeModalVisible] = useState(false);
  const [scaleAnim] = useState(new Animated.Value(0));
  const [eventTypeScaleAnim] = useState(new Animated.Value(0));
  const [concerts, setConcerts] = useState([]);
  const [tours, setTours] = useState([]);
  const [moves, setMoves] = useState([]);
  const [selectedDateConcerts, setSelectedDateConcerts] = useState([]);
  const [selectedDateTours, setSelectedDateTours] = useState([]);
  const [selectedDateMoves, setSelectedDateMoves] = useState([]);
  
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);
  const [logoutScaleAnim] = useState(new Animated.Value(0));
  
  const [currentMonth, setCurrentMonth] = useState({
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1
  });
  
  const [currentMonthStats, setCurrentMonthStats] = useState({
    concerts: 0,
    tours: 0,
    moves: 0
  });

  // ✅ НОВОЕ: СТАТИСТИКА ПО РЕГИОНАМ И ВРЕМЕННЫМ ПЕРИОДАМ
  const [statistics, setStatistics] = useState({
    monthly: { voronezh: 0, other: 0, total: 0 },
    quarterly: { voronezh: 0, other: 0, total: 0 },
    last4Months: { voronezh: 0, other: 0, total: 0 },
  });
  const [activeStatTab, setActiveStatTab] = useState('monthly'); // 'monthly', 'quarterly', 'last4Months'

  // ✅ УПРАВЛЕНИЕ ВИДИМОСТЬЮ ПАНЕЛЕЙ - ПРАВИЛЬНО!
  const [showHeaderStats, setShowHeaderStats] = useState(true);
  const [showRegionStats, setShowRegionStats] = useState(true);
  
  // Анимированные значения для высоты панелей
  const headerStatsHeightAnim = useRef(new Animated.Value(1)).current;
  const regionStatsHeightAnim = useRef(new Animated.Value(1)).current;

  // ✅ CUSTOM ALERT STATE
  const [alertConfig, setAlertConfig] = useState({
    visible: false,
    title: '',
    message: '',
    buttons: []
  });

  const showAlert = (title, message, buttons = [{ text: 'OK' }]) => {
    setAlertConfig({
      visible: true,
      title,
      message,
      buttons
    });
  };

  const closeAlert = () => {
    setAlertConfig({ ...alertConfig, visible: false });
  };

  // ✅ ФУНКЦИИ ПЕРЕКЛЮЧЕНИЯ ВИДИМОСТИ ПАНЕЛЕЙ - ПРАВИЛЬНО!
  const toggleHeaderStats = () => {
    const newState = !showHeaderStats;
    setShowHeaderStats(newState);
    
    Animated.timing(headerStatsHeightAnim, {
      toValue: newState ? 1 : 0,
      duration: 300,
      useNativeDriver: false,
    }).start();
  };

  const toggleRegionStats = () => {
    const newState = !showRegionStats;
    setShowRegionStats(newState);
    
    Animated.timing(regionStatsHeightAnim, {
      toValue: newState ? 1 : 0,
      duration: 300,
      useNativeDriver: false,
    }).start();
  };
  
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // ✅ ОПТИМИЗИРОВАННАЯ АНИМАЦИЯ (ОСТАНОВКА ПРИ НЕАКТИВНОСТИ)
  useEffect(() => {
    let pulseAnimation;
    
    if (Platform.OS === 'web') {
      // Для web - остановка анимации при неактивной вкладке
      const handleVisibilityChange = () => {
        if (document.hidden) {
          pulseAnimation && pulseAnimation.stop();
        } else {
          startPulseAnimation();
        }
      };

      const startPulseAnimation = () => {
        pulseAnimation = Animated.loop(
          Animated.sequence([
            Animated.timing(pulseAnim, {
              toValue: 1.08,
              duration: 1000,
              useNativeDriver: true,
            }),
            Animated.timing(pulseAnim, {
              toValue: 1,
              duration: 1000,
              useNativeDriver: true,
            }),
          ])
        );
        pulseAnimation.start();
      };

      document.addEventListener('visibilitychange', handleVisibilityChange);
      startPulseAnimation();

      return () => {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        pulseAnimation && pulseAnimation.stop();
      };
    } else {
      // Для нативных платформ
      pulseAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.08,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      );
      pulseAnimation.start();
      return () => pulseAnimation.stop();
    }
  }, []);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();
  }, []);

  useEffect(() => {
    loadAllData();
  }, []);

  useEffect(() => {
    updateMarkedDates(concerts, tours, moves);
    // ✅ НОВОЕ: ОБНОВЛЯЕМ СТАТИСТИКУ ПРИ ИЗМЕНЕНИИ КОНЦЕРТОВ
    updateStatistics(concerts);
  }, [concerts, tours, moves]);

  // ✅ BROWSER HISTORY API ДЛЯ BACK BUTTON
  useEffect(() => {
    if (Platform.OS === 'web') {
      // Добавляем состояние в history при открытии модалки
      if (modalVisible || eventTypeModalVisible || logoutModalVisible) {
        window.history.pushState({ modal: true }, '');
      }

      const handlePopState = (event) => {
        if (logoutModalVisible) {
          setLogoutModalVisible(false);
          return;
        }
        if (eventTypeModalVisible) {
          setEventTypeModalVisible(false);
          return;
        }
        if (modalVisible) {
          setModalVisible(false);
          return;
        }
      };

      window.addEventListener('popstate', handlePopState);
      return () => window.removeEventListener('popstate', handlePopState);
    }
  }, [modalVisible, eventTypeModalVisible, logoutModalVisible]);

  // ✅ ESC KEY HANDLER
  useEffect(() => {
    if (Platform.OS === 'web') {
      const handleKeyPress = (e) => {
        if (e.key === 'Escape') {
          if (logoutModalVisible) {
            setLogoutModalVisible(false);
          } else if (eventTypeModalVisible) {
            setEventTypeModalVisible(false);
          } else if (modalVisible) {
            setModalVisible(false);
          }
        }
      };

      document.addEventListener('keydown', handleKeyPress);
      return () => document.removeEventListener('keydown', handleKeyPress);
    }
  }, [modalVisible, eventTypeModalVisible, logoutModalVisible]);

  const calculateMonthStats = (concertsData, toursData, movesData, year, month) => {
    const monthString = String(month).padStart(2, '0');
    const monthPrefix = `${year}-${monthString}`;
    
    const concertsThisMonth = concertsData.filter(concert => 
      concert.date && concert.date.startsWith(monthPrefix)
    );
    
    const movesThisMonth = movesData.filter(move => 
      move.date && move.date.startsWith(monthPrefix)
    );
    
    const toursThisMonth = toursData.filter(tour => {
      if (!tour.startDate || !tour.endDate) return false;
      
      const tourStart = new Date(tour.startDate);
      const tourEnd = new Date(tour.endDate);
      const monthStart = new Date(year, month - 1, 1);
      const monthEnd = new Date(year, month, 0);
      
      return (tourStart <= monthEnd && tourEnd >= monthStart);
    });
    
    setCurrentMonthStats({
      concerts: concertsThisMonth.length,
      tours: toursThisMonth.length,
      moves: movesThisMonth.length
    });
  };

  // ✅ НОВОЕ: ФУНКЦИЯ ОБНОВЛЕНИЯ СТАТИСТИКИ
  const updateStatistics = (concertsData) => {
    const stats = calculateStatistics(concertsData);
    setStatistics(stats);
  };

  const loadAllData = async () => {
    setRefreshing(true);
    try {
      const [concertsData, toursData, movesData] = await Promise.all([
        loadConcerts(),
        loadTours(),
        loadMoves()
      ]);
      
      calculateMonthStats(concertsData, toursData, movesData, currentMonth.year, currentMonth.month);
    } catch (error) {
      console.error('❌ Ошибка при обновлении данных:', error);
      showAlert('Ошибка', 'Не удалось обновить данные');
    } finally {
      setRefreshing(false);
    }
  };

  const onRefresh = async () => {
    console.log('🔄 Инициировано обновление календаря...');
    await loadAllData();
  };

  const loadConcerts = async () => {
    try {
      console.log('📅 CalendarScreen: Загрузка концертов...');
      
      if (!auth.currentUser) {
        console.log('❌ CalendarScreen: Пользователь НЕ авторизован');
        setConcerts([]);
        return [];
      }
      
      const concertsQuery = query(collection(db, 'concerts'));
      const snapshot = await getDocs(concertsQuery);
      
      const concertsData = [];
      snapshot.forEach((doc) => {
        concertsData.push({ id: doc.id, ...doc.data() });
      });
      
      console.log(`✅ CalendarScreen: Загружено ${concertsData.length} концертов`);
      setConcerts(concertsData);
      return concertsData;
    } catch (error) {
      console.error('❌ CalendarScreen: Ошибка загрузки концертов:', error);
      showAlert('Ошибка', 'Не удалось загрузить концерты');
      throw error;
    }
  };

  const loadTours = async () => {
    try {
      console.log('🎭 CalendarScreen: Загрузка гастролей...');
      
      if (!auth.currentUser) {
        setTours([]);
        return [];
      }
      
      const toursQuery = query(collection(db, 'tours'));
      const snapshot = await getDocs(toursQuery);
      
      const toursData = [];
      snapshot.forEach((doc) => {
        toursData.push({ id: doc.id, ...doc.data() });
      });
      
      console.log(`✅ CalendarScreen: Загружено ${toursData.length} гастролей`);
      setTours(toursData);
      return toursData;
    } catch (error) {
      console.error('❌ CalendarScreen: Ошибка загрузки гастролей:', error);
      showAlert('Ошибка', 'Не удалось загрузить гастроли');
      throw error;
    }
  };

  const loadMoves = async () => {
    try {
      console.log('🚌 CalendarScreen: Загрузка переездов...');
      
      if (!auth.currentUser) {
        setMoves([]);
        return [];
      }
      
      const movesQuery = query(collection(db, 'moves'));
      const snapshot = await getDocs(movesQuery);
      
      const movesData = [];
      snapshot.forEach((doc) => {
        movesData.push({ id: doc.id, ...doc.data() });
      });
      
      console.log(`✅ CalendarScreen: Загружено ${movesData.length} переездов`);
      setMoves(movesData);
      return movesData;
    } catch (error) {
      console.error('❌ CalendarScreen: Ошибка загрузки переездов:', error);
      showAlert('Ошибка', 'Не удалось загрузить переезды');
      throw error;
    }
  };

  const handleMonthChange = (month) => {
    const newMonth = {
      year: month.year,
      month: month.month
    };
    
    setCurrentMonth(newMonth);
    calculateMonthStats(concerts, tours, moves, newMonth.year, newMonth.month);
  };

  const getTourDates = (tour) => {
    const dates = [];
    const start = new Date(tour.startDate);
    const end = new Date(tour.endDate);
    
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      dates.push(`${year}-${month}-${day}`);
    }
    
    return dates;
  };

  const updateMarkedDates = (concertsData, toursData, movesData) => {
    const newMarkedDates = {
      [today]: {
        selected: true,
        selectedColor: '#FFD700',
        customStyles: {
          container: {
            borderRadius: 20,
          },
          text: {
            color: '#1a1a1a',
            fontWeight: 'bold',
          }
        }
      },
    };

    concertsData.forEach(concert => {
      // ✅ НОВОЕ: ИСПОЛЬЗУЕМ ЦВЕТ ПО РЕГИОНАМ
      const concertColor = getColorByRegion(concert.region);
      
      if (concert.date === today) {
        newMarkedDates[concert.date] = {
          ...newMarkedDates[concert.date],
          marked: true,
          dots: [{
            key: 'concert',
            color: concertColor,
            selectedDotColor: '#1a1a1a'
          }]
        };
      } else {
        newMarkedDates[concert.date] = {
          marked: true,
          dots: [{
            key: 'concert',
            color: concertColor,
            selectedDotColor: '#1a1a1a'
          }],
          customStyles: {
            container: {
              backgroundColor: 'transparent',
            },
            text: {
              color: '#E0E0E0',
              fontWeight: '600',
            }
          }
        };
      }
    });

    toursData.forEach(tour => {
      const tourDates = getTourDates(tour);
      tourDates.forEach(date => {
        if (newMarkedDates[date]) {
          newMarkedDates[date].hasTour = true;
        } else {
          newMarkedDates[date] = {
            hasTour: true,
            customStyles: {
              container: {
                backgroundColor: 'transparent',
              },
              text: {
                color: '#E0E0E0',
                fontWeight: '600',
              }
            }
          };
        }
      });
    });

    movesData.forEach(move => {
      if (newMarkedDates[move.date]) {
        newMarkedDates[move.date].hasMove = true;
      } else {
        newMarkedDates[move.date] = {
          hasMove: true,
          customStyles: {
            container: {
              backgroundColor: 'transparent',
            },
            text: {
              color: '#E0E0E0',
              fontWeight: '600',
            }
          }
        };
      }
    });

    setMarkedDates(newMarkedDates);
  };

  const handleDateSelect = (day) => {
    setSelectedDate(day.dateString);
    
    const concertsOnDate = concerts.filter(concert => concert.date === day.dateString);
    setSelectedDateConcerts(concertsOnDate);
    
    const toursOnDate = tours.filter(tour => {
      const tourDates = getTourDates(tour);
      return tourDates.includes(day.dateString);
    });
    setSelectedDateTours(toursOnDate);
    
    const movesOnDate = moves.filter(move => move.date === day.dateString);
    setSelectedDateMoves(movesOnDate);
    
    setModalVisible(true);
    
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      friction: 8,
    }).start();
  };

  const closeModal = () => {
    Animated.timing(scaleAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => setModalVisible(false));
  };

  const handleAddEvent = () => {
    closeModal();
    setTimeout(() => {
      setEventTypeModalVisible(true);
      Animated.spring(eventTypeScaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        friction: 8,
      }).start();
    }, 300);
  };

  const closeEventTypeModal = () => {
    Animated.timing(eventTypeScaleAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => setEventTypeModalVisible(false));
  };

  const handleEventTypeSelect = (type) => {
    closeEventTypeModal();
    setTimeout(() => {
      if (type === 'concert') {
        navigation.navigate('AddEvent', { 
          date: selectedDate,
          userRole: userRole 
        });
      } else if (type === 'tour') {
        navigation.navigate('AddTour', { 
          date: selectedDate,
          userRole: userRole 
        });
      } else if (type === 'move') {
        navigation.navigate('AddMove', { 
          date: selectedDate,
          userRole: userRole 
        });
      }
    }, 300);
  };

  const handleViewConcert = (concert) => {
    closeModal();
    setTimeout(() => {
      navigation.navigate('ConcertDetail', { 
        concert: concert,
        userRole: userRole 
      });
    }, 300);
  };

  const handleViewTour = (tour) => {
    closeModal();
    setTimeout(() => {
      navigation.navigate('TourDetail', { 
        tour: tour,
        userRole: userRole 
      });
    }, 300);
  };

  const handleViewMove = (move) => {
    closeModal();
    setTimeout(() => {
      navigation.navigate('MoveDetail', { 
        move: move,
        userRole: userRole 
      });
    }, 300);
  };

  const handleDeleteConcert = async (concertId) => {
    showAlert(
      'Удаление концерта',
      'Вы уверены, что хотите удалить этот концерт?',
      [
        { text: 'Отмена', style: 'cancel' },
        { 
          text: 'Удалить', 
          style: 'destructive',
          onPress: async () => {
            try {
              if (!concertId) {
                showAlert('Ошибка', 'Концерт не найден');
                return;
              }

              await deleteDoc(doc(db, 'concerts', concertId));
              showAlert('Успех', 'Концерт успешно удален!');
              
              const updatedConcerts = selectedDateConcerts.filter(c => c.id !== concertId);
              setSelectedDateConcerts(updatedConcerts);
              
              await loadAllData();
            } catch (error) {
              console.error('Ошибка удаления:', error);
              if (error.code === 'permission-denied') {
                showAlert('Ошибка', 'У вас нет прав для удаления концертов');
              } else if (error.code === 'not-found') {
                showAlert('Ошибка', 'Концерт уже был удален');
                await loadAllData();
              } else {
                showAlert('Ошибка', 'Не удалось удалить концерт');
              }
            }
          }
        }
      ]
    );
  };

  const handleDeleteTour = async (tourId) => {
    showAlert(
      'Удаление гастролей',
      'Вы уверены, что хотите удалить эти гастроли?',
      [
        { text: 'Отмена', style: 'cancel' },
        { 
          text: 'Удалить', 
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDoc(doc(db, 'tours', tourId));
              showAlert('Успех', 'Гастроли удалены');
              const updatedTours = selectedDateTours.filter(t => t.id !== tourId);
              setSelectedDateTours(updatedTours);
              
              const toursData = await loadTours();
              calculateMonthStats(concerts, toursData, moves, currentMonth.year, currentMonth.month);
            } catch (error) {
              console.error('Ошибка удаления:', error);
              showAlert('Ошибка', 'Не удалось удалить гастроли');
            }
          }
        }
      ]
    );
  };

  const handleDeleteMove = async (moveId) => {
    showAlert(
      'Удаление переезда',
      'Вы уверены, что хотите удалить этот переезд?',
      [
        { text: 'Отмена', style: 'cancel' },
        { 
          text: 'Удалить', 
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDoc(doc(db, 'moves', moveId));
              showAlert('Успех', 'Переезд удален');
              const updatedMoves = selectedDateMoves.filter(m => m.id !== moveId);
              setSelectedDateMoves(updatedMoves);
              
              const movesData = await loadMoves();
              calculateMonthStats(concerts, tours, movesData, currentMonth.year, currentMonth.month);
            } catch (error) {
              console.error('Ошибка удаления:', error);
              showAlert('Ошибка', 'Не удалось удалить переезд');
            }
          }
        }
      ]
    );
  };

  const handleLogout = () => {
    setLogoutModalVisible(true);
    Animated.spring(logoutScaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      friction: 8,
    }).start();
  };

  const confirmLogout = async () => {
    try {
      console.log('🔓 Начинаем процесс выхода...');
      
      Animated.timing(logoutScaleAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start(() => setLogoutModalVisible(false));
      
      await signOut(auth);
      console.log('✅ Выход выполнен успешно');
    } catch (error) {
      console.error('❌ Ошибка выхода:', error);
      showAlert('Ошибка', error.message);
    }
  };

  const cancelLogout = () => {
    Animated.timing(logoutScaleAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => setLogoutModalVisible(false));
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const [year, month, day] = dateString.split('-');
    const months = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 
                    'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
    return `${parseInt(day)} ${months[parseInt(month) - 1]} ${year}`;
  };

  const getCurrentMonthNameDisplay = () => {
    const months = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 
                   'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
    return months[currentMonth.month - 1];
  };

  const getQuickActions = () => {
    const actions = [
      { 
        icon: 'list', 
        label: 'Мои концерты', 
        gradient: ['#FF6B57', '#FF8C42'],
        onPress: () => navigation.navigate('MyEvents', { 
          userRole: userRole,
          userEmail: userEmail 
        })
      },
      { 
        icon: 'medical', 
        label: 'Мой статус', 
        gradient: ['#FFD700', '#FFA500'],
        onPress: () => navigation.navigate('SickLeave', { 
          userRole: userRole,
          userEmail: userEmail 
        })
      }
    ];

    if (userRole === 'admin') {
      actions.push(
        {
          icon: 'people', 
          label: 'Список артистов', 
          gradient: ['#4A90E2', '#357ABD'],
          onPress: () => navigation.navigate('EmployeesList', { userRole })
        }
      );
    }

    // ✅ ДОБАВЛЯЕМ КНОПКУ СТАТИСТИКИ
    actions.push(
      {
        icon: 'pie-chart', 
        label: 'Статистика по городам', 
        gradient: ['#9B59B6', '#8E44AD'],
        onPress: () => navigation.navigate('Statistics')
      }
    );

    // ✅ ДОБАВЛЯЕМ КНОПКУ ГОРОДОВ И ОБЛАСТЕЙ (НОВОЕ!)
    actions.push(
      {
        icon: 'pin',
        label: 'Города и области',
        gradient: ['#34C759', '#28A745'],
        onPress: () => navigation.navigate('Cities'),
      }
    );

    if (userRole === 'admin') {
      actions.push({
        icon: 'notifications', 
        label: 'Напоминания', 
        gradient: ['#6C5CE7', '#A29BFE'],
        onPress: () => navigation.navigate('Reminders', { userRole })
      });
    }

    if (userRole !== 'admin') {
      actions.push({
        icon: 'notifications', 
        label: 'Напоминания', 
        gradient: ['#6C5CE7', '#A29BFE'],
        onPress: () => navigation.navigate('Reminders', { userRole })
      });
    }

    actions.push(
      { 
        icon: 'checkmark-done', 
        label: 'Задачи', 
        gradient: ['#34C759', '#28A745'],
        onPress: () => showAlert('Задачи', 'Функция в разработке')
      },
      { 
        icon: 'settings', 
        label: 'Настройки', 
        gradient: ['#8E8E93', '#636366'],
        onPress: () => showAlert('Настройки', 'Функция в разработке')
      }
    );

    return actions;
  };

  const quickActions = getQuickActions();

  // ✅ ВЫЧИСЛЯЕМ RESPONSIVE SIZES С АКТУАЛЬНЫМИ РАЗМЕРАМИ
  const responsiveSize = (size) => getResponsiveSize(size, dimensions.width);
  const responsiveFontSize = (size) => getResponsiveFontSize(size, dimensions.width);

  // ✅ ПОЛУЧАЕМ ТЕКУЩУЮ СТАТИСТИКУ В ЗАВИСИМОСТИ ОТ ВКЛАДКИ
  const currentStats = statistics[activeStatTab] || { voronezh: 0, other: 0, total: 0 };
  const statPeriodText = activeStatTab === 'monthly' ? getCurrentMonthName() : 
                         activeStatTab === 'quarterly' ? getCurrentQuarterText() : 
                         getLast4MonthsText();

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle="light-content"
        backgroundColor="#0a0a0a"
        translucent={false}
      />
      
      <LinearGradient
        colors={['#0a0a0a', '#1a1a1a', '#2a2a2a']}
        style={styles.background}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        {/* ХЕДЕР */}
        <Animated.View style={{ opacity: fadeAnim }}>
          <LinearGradient
            colors={['rgba(26, 26, 26, 0.98)', 'rgba(35, 35, 35, 0.95)']}
            style={[styles.header, { paddingTop: Platform.OS === 'ios' ? responsiveSize(50) : responsiveSize(30) }]}
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
                <View style={styles.greetingSection}>
                  <Text style={[styles.greetingText, { fontSize: responsiveFontSize(13) }]}>Добро пожаловать,</Text>
                  <Text style={[styles.userName, { fontSize: responsiveFontSize(18) }]} numberOfLines={1}>
                    {userEmail.split('@')[0]}
                  </Text>
                </View>

                <View style={styles.actionButtons}>
                  <TouchableOpacity 
                    style={styles.roleButton}
                    activeOpacity={0.8}
                    onPress={() => showAlert('Роль', `Вы вошли как ${userRole === 'admin' ? 'Администратор' : 'Артист'}`)}
                  >
                    <LinearGradient
                      colors={userRole === 'admin' ? 
                        ['#FFD700', '#FFA500'] : 
                        ['#DAA520', '#B8860B']}
                      style={styles.roleButtonGradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    >
                      <Ionicons 
                        name={userRole === 'admin' ? 'shield-checkmark' : 'musical-note'} 
                        size={responsiveSize(16)} 
                        color="#1a1a1a" 
                      />
                      <Text style={[styles.roleButtonText, { fontSize: responsiveFontSize(12) }]}>
                        {userRole === 'admin' ? 'Админ' : 'Артист'}
                      </Text>
                    </LinearGradient>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    onPress={handleLogout} 
                    style={styles.logoutButton}
                    activeOpacity={0.8}
                  >
                    <LinearGradient
                      colors={['#FF6B6B', '#EE5A52']}
                      style={styles.logoutButtonGradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    >
                      <Ionicons name="log-out-outline" size={responsiveSize(20)} color="white" />
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.titleSection}>
                <View style={styles.titleIconContainer}>
                  <LinearGradient
                    colors={['#FFD700', '#FFA500']}
                    style={styles.titleIconGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <Ionicons name="calendar" size={responsiveSize(28)} color="#1a1a1a" />
                  </LinearGradient>
                </View>
                <View style={styles.titleTextContainer}>
                  <Text style={[styles.mainTitle, { fontSize: responsiveFontSize(20) }]}>Концертный календарь</Text>
                  <Text style={[styles.subtitle, { fontSize: responsiveFontSize(13) }]}>Управление мероприятиями</Text>
                </View>
              </View>

              {/* ✅ ПАНЕЛЬ 1: СТАТИСТИКА МЕСЯЦА */}
              <View style={styles.statsContainer}>
                <View style={styles.monthStatsHeaderContainer}>
                  <View style={styles.monthStatsHeaderLeft}>
                    <Text style={[styles.monthStatsTitle, { fontSize: responsiveFontSize(14) }]}>
                      Статистика за {getCurrentMonthNameDisplay()} {currentMonth.year}
                    </Text>
                  </View>
                  <TouchableOpacity 
                    onPress={toggleHeaderStats}
                    style={styles.collapseButton}
                  >
                    <Ionicons 
                      name={showHeaderStats ? "chevron-up" : "chevron-down"} 
                      size={responsiveSize(20)} 
                      color="#FFD700" 
                    />
                  </TouchableOpacity>
                </View>
                
                {/* СОДЕРЖИМОЕ ПАНЕЛИ - АНИМИРУЕТСЯ */}
                <Animated.View 
                  style={{
                    maxHeight: headerStatsHeightAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, 180],
                    }),
                    opacity: headerStatsHeightAnim,
                    overflow: 'hidden',
                  }}
                >
                  <View style={styles.statsRow}>
                    <View style={styles.statCard}>
                      <View style={styles.statIconWrapper}>
                        <Ionicons name="musical-notes" size={responsiveSize(20)} color="#FFD700" />
                      </View>
                      <View style={styles.statTextContainer}>
                        <Text style={[styles.statValue, { fontSize: responsiveFontSize(20) }]}>{currentMonthStats.concerts}</Text>
                        <Text style={[styles.statLabel, { fontSize: responsiveFontSize(10) }]}>Концертов</Text>
                      </View>
                    </View>

                    <View style={styles.statDivider} />

                    <View style={styles.statCard}>
                      <View style={styles.statIconWrapper}>
                        <Ionicons name="airplane" size={responsiveSize(20)} color="#FFA500" />
                      </View>
                      <View style={styles.statTextContainer}>
                        <Text style={[styles.statValue, { fontSize: responsiveFontSize(20) }]}>{currentMonthStats.tours}</Text>
                        <Text style={[styles.statLabel, { fontSize: responsiveFontSize(10) }]}>Гастролей</Text>
                      </View>
                    </View>

                    <View style={styles.statDivider} />

                    <View style={styles.statCard}>
                      <View style={styles.statIconWrapper}>
                        <Ionicons name="bus" size={responsiveSize(20)} color="#34C759" />
                      </View>
                      <View style={styles.statTextContainer}>
                        <Text style={[styles.statValue, { fontSize: responsiveFontSize(20) }]}>{currentMonthStats.moves}</Text>
                        <Text style={[styles.statLabel, { fontSize: responsiveFontSize(10) }]}>Переездов</Text>
                      </View>
                    </View>
                  </View>
                </Animated.View>
              </View>
            </View>
          </LinearGradient>
        </Animated.View>

        {/* SCROLLVIEW С PULL-TO-REFRESH */}
        <ScrollView 
          showsVerticalScrollIndicator={false} 
          style={styles.scrollView}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#FFD700"
              title="Потяни чтобы обновить"
              titleColor="#FFD700"
              colors={['#FFD700', '#FFA500', '#4A90E2']}
            />
          }
        >
          {/* ✅ ПАНЕЛЬ 2: СТАТИСТИКА ПО РЕГИОНАМ */}
          <View style={styles.statisticsSection}>
            <View style={styles.statisticsSectionHeaderContainer}>
              <View style={styles.statisticsTitleWrapper}>
                <LinearGradient
                  colors={['#4A90E2', '#357ABD']}
                  style={styles.statisticsIcon}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Ionicons name="bar-chart" size={responsiveSize(18)} color="#FFF" />
                </LinearGradient>
                <Text style={[styles.statisticsTitle, { fontSize: responsiveFontSize(18) }]}>
                  Статистика по регионам
                </Text>
              </View>
              <TouchableOpacity 
                onPress={toggleRegionStats}
                style={styles.collapseButton}
              >
                <Ionicons 
                  name={showRegionStats ? "chevron-up" : "chevron-down"} 
                  size={responsiveSize(20)} 
                  color="#4A90E2" 
                />
              </TouchableOpacity>
            </View>

            {/* СОДЕРЖИМОЕ ПАНЕЛИ - АНИМИРУЕТСЯ */}
            <Animated.View 
              style={{
                maxHeight: regionStatsHeightAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 800],
                }),
                opacity: regionStatsHeightAnim,
                overflow: 'hidden',
              }}
            >
              {/* ТАБЫ СТАТИСТИКИ */}
              <View style={styles.statisticsTabsContainer}>
                <TouchableOpacity
                  style={[styles.statisticsTab, activeStatTab === 'monthly' && styles.statisticsTabActive]}
                  onPress={() => setActiveStatTab('monthly')}
                >
                  <LinearGradient
                    colors={activeStatTab === 'monthly' ? ['#FFD700', '#FFA500'] : ['rgba(100, 100, 100, 0.2)', 'rgba(100, 100, 100, 0.1)']}
                    style={styles.statisticsTabGradient}
                  >
                    <Text style={[styles.statisticsTabText, { fontSize: responsiveFontSize(12) }, activeStatTab === 'monthly' && styles.statisticsTabTextActive]}>
                      Месяц
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.statisticsTab, activeStatTab === 'quarterly' && styles.statisticsTabActive]}
                  onPress={() => setActiveStatTab('quarterly')}
                >
                  <LinearGradient
                    colors={activeStatTab === 'quarterly' ? ['#4A90E2', '#357ABD'] : ['rgba(100, 100, 100, 0.2)', 'rgba(100, 100, 100, 0.1)']}
                    style={styles.statisticsTabGradient}
                  >
                    <Text style={[styles.statisticsTabText, { fontSize: responsiveFontSize(12) }, activeStatTab === 'quarterly' && styles.statisticsTabTextActive]}>
                      Квартал
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.statisticsTab, activeStatTab === 'last4Months' && styles.statisticsTabActive]}
                  onPress={() => setActiveStatTab('last4Months')}
                >
                  <LinearGradient
                    colors={activeStatTab === 'last4Months' ? ['#34C759', '#28A745'] : ['rgba(100, 100, 100, 0.2)', 'rgba(100, 100, 100, 0.1)']}
                    style={styles.statisticsTabGradient}
                  >
                    <Text style={[styles.statisticsTabText, { fontSize: responsiveFontSize(12) }, activeStatTab === 'last4Months' && styles.statisticsTabTextActive]}>
                      4 месяца
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>

              {/* ТЕКУЩАЯ СТАТИСТИКА И ПРОГРЕСС-БАР */}
              <View style={styles.statisticsContent}>
                <Text style={[styles.statisticsContentTitle, { fontSize: responsiveFontSize(14) }]}>
                  {statPeriodText}
                </Text>
                
                <ProgressBar 
                  voronezh={currentStats.voronezh}
                  other={currentStats.other}
                  total={currentStats.total}
                  responsiveSize={responsiveSize}
                  responsiveFontSize={responsiveFontSize}
                />

                <View style={styles.statisticsTotal}>
                  <Text style={[styles.statisticsTotalLabel, { fontSize: responsiveFontSize(12) }]}>
                    Всего концертов:
                  </Text>
                  <Text style={[styles.statisticsTotalValue, { fontSize: responsiveFontSize(20) }]}>
                    {currentStats.total}
                  </Text>
                </View>
              </View>
            </Animated.View>
          </View>

          <View style={styles.calendarWrapper}>
            <LinearGradient
              colors={['rgba(26, 26, 26, 0.9)', 'rgba(35, 35, 35, 0.8)']}
              style={styles.calendarContainer}
            >
              <Calendar
                onDayPress={handleDateSelect}
                onMonthChange={handleMonthChange}
                markedDates={markedDates}
                dayComponent={({ date, state, marking }) => {
                  const isToday = date.dateString === today;
                  const hasConcert = concerts.some(concert => concert.date === date.dateString);
                  const hasTour = marking?.hasTour || false;
                  const hasMove = marking?.hasMove || false;
                  
                  let gradientColors = ['#2a2a2a', '#1f1f1f'];
                  let textStyle = styles.normalText;
                  let dayStyle = styles.normalDay;
                  let showTourLine = false;
                  let showMoveLine = false;
                  
                  if (isToday) {
                    gradientColors = ['#FFD700', '#FFA500'];
                    textStyle = styles.todayText;
                    dayStyle = styles.todayDay;
                    
                    if (hasConcert) gradientColors.push('#9B59B6');
                    if (hasTour) {
                      gradientColors.push('#4A90E2');
                      showTourLine = true;
                    }
                    if (hasMove) {
                      gradientColors.push('#34C759');
                      showMoveLine = true;
                    }
                  } else {
                    if (hasConcert || hasTour || hasMove) {
                      gradientColors = [];
                      
                      if (hasConcert) {
                        gradientColors.push('#9B59B6', '#7B3FA0');
                        dayStyle = styles.concertDay;
                      }
                      if (hasTour) {
                        if (!hasConcert) gradientColors.push('#4A90E2', '#357ABD');
                        else gradientColors.push('#4A90E2');
                        showTourLine = true;
                        if (!hasConcert) dayStyle = styles.tourDay;
                      }
                      if (hasMove) {
                        if (!hasConcert && !hasTour) gradientColors.push('#34C759', '#28A745');
                        else gradientColors.push('#34C759');
                        showMoveLine = true;
                        if (!hasConcert && !hasTour) dayStyle = styles.moveDay;
                      }
                      
                      textStyle = styles.eventText;
                    }
                  }
                  
                  return (
                    <TouchableOpacity 
                      style={styles.dayContainer}
                      onPress={() => handleDateSelect(date)}
                    >
                      <Animated.View 
                        style={isToday ? { transform: [{ scale: pulseAnim }] } : {}}
                      >
                        <LinearGradient
                          colors={gradientColors}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                          style={[
                            styles.dayBase,
                            dayStyle,
                            marking?.selected && styles.selectedDay
                          ]}
                        >
                          <Text style={[
                            styles.dayText,
                            { fontSize: responsiveFontSize(14) },
                            textStyle,
                            marking?.selected && styles.selectedText,
                            state === 'disabled' && styles.disabledText
                          ]}>
                            {date.day}
                          </Text>
                          
                          {showTourLine && <View style={styles.tourUnderline} />}
                          {showMoveLine && <View style={styles.moveLine} />}
                        </LinearGradient>
                      </Animated.View>
                    </TouchableOpacity>
                  );
                }}
                theme={{
                  backgroundColor: 'transparent',
                  calendarBackground: 'transparent',
                  textSectionTitleColor: '#888',
                  selectedDayBackgroundColor: '#FFD700',
                  selectedDayTextColor: '#1a1a1a',
                  todayTextColor: '#FFD700',
                  dayTextColor: '#E0E0E0',
                  textDisabledColor: '#555',
                  dotColor: '#FFD700',
                  selectedDotColor: '#1a1a1a',
                  arrowColor: '#FFD700',
                  monthTextColor: '#E0E0E0',
                  textDayFontFamily: 'System',
                  textMonthFontFamily: 'System',
                  textDayHeaderFontFamily: 'System',
                  textDayFontWeight: '600',
                  textMonthFontWeight: '400',
                  textDayHeaderFontWeight: '500',
                  textDayFontSize: responsiveFontSize(14),
                  textMonthFontSize: responsiveFontSize(20),
                  textDayHeaderFontSize: responsiveFontSize(11),
                }}
                style={styles.calendar}
              />
            </LinearGradient>
          </View>

          {/* БЫСТРЫЕ ДЕЙСТВИЯ */}
          <View style={styles.quickActionsContainer}>
            <View style={styles.quickActionsHeader}>
              <View style={styles.quickActionsTitleWrapper}>
                <LinearGradient
                  colors={['#FFD700', '#FFA500']}
                  style={styles.quickActionsTitleIcon}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Ionicons name="flash" size={responsiveSize(18)} color="#1a1a1a" />
                </LinearGradient>
                <Text style={[styles.quickActionsTitle, { fontSize: responsiveFontSize(18) }]}>Быстрые действия</Text>
              </View>
              <TouchableOpacity style={styles.quickActionsMore}>
                <Ionicons name="ellipsis-horizontal" size={responsiveSize(20)} color="#888" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.quickActionsGrid}>
              {quickActions.map((action, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.quickActionCard}
                  onPress={action.onPress}
                  activeOpacity={0.7}
                >
                  <LinearGradient
                    colors={action.gradient}
                    style={styles.quickActionIconContainer}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <Ionicons name={action.icon} size={responsiveSize(28)} color="white" />
                  </LinearGradient>
                  
                  <Text style={[styles.quickActionText, { fontSize: responsiveFontSize(11) }]} numberOfLines={2}>
                    {action.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </ScrollView>

        {/* ✅ МОДАЛЬНОЕ ОКНО СОБЫТИЙ (БЕЗ BLURVIEW) */}
        <Modal
          animationType="fade"
          transparent={true}
          visible={modalVisible}
          onRequestClose={closeModal}
        >
          <View style={styles.modalOverlay}>
            <TouchableOpacity 
              style={styles.modalBackdrop}
              activeOpacity={1}
              onPress={closeModal}
            />
            <Animated.View 
              style={[
                styles.modalContainer,
                {
                  transform: [{ scale: scaleAnim }],
                }
              ]}
            >
              <LinearGradient
                colors={['rgba(26, 26, 26, 0.98)', 'rgba(35, 35, 35, 0.95)']}
                style={styles.modalGradient}
              >
                <View style={styles.modalHeader}>
                  <Text style={[styles.modalTitle, { fontSize: responsiveFontSize(24) }]}>🎵 События</Text>
                  <TouchableOpacity onPress={closeModal} style={styles.modalCloseIcon}>
                    <Ionicons name="close-circle" size={responsiveSize(30)} color="#FFD700" />
                  </TouchableOpacity>
                </View>
                
                <View style={styles.modalDateContainer}>
                  <Ionicons name="calendar" size={responsiveSize(22)} color="#FFD700" />
                  <Text style={[styles.modalDate, { fontSize: responsiveFontSize(18) }]}>{formatDate(selectedDate)}</Text>
                </View>

                <ScrollView style={styles.concertsList}>
                  {selectedDateMoves.length > 0 && (
                    <View style={styles.sectionContainer}>
                      <Text style={[styles.sectionTitle, { fontSize: responsiveFontSize(18) }]}>🚌 Переезды</Text>
                      {selectedDateMoves.map((move) => (
                        <TouchableOpacity
                          key={move.id}
                          style={styles.moveItem}
                          onPress={() => handleViewMove(move)}
                        >
                          <LinearGradient
                            colors={['rgba(52, 199, 89, 0.2)', 'rgba(40, 167, 69, 0.2)']}
                            style={styles.moveGradient}
                          >
                            <View style={styles.moveHeader}>
                              <Text style={[styles.moveTitle, { fontSize: responsiveFontSize(16) }]}>
                                {move.fromCity} → {move.toCity}
                              </Text>
                              {userRole === 'admin' && (
                                <TouchableOpacity 
                                  onPress={(e) => {
                                    e.stopPropagation();
                                    handleDeleteMove(move.id);
                                  }}
                                  style={styles.deleteButton}
                                >
                                  <Ionicons name="trash" size={responsiveSize(20)} color="#FF6B6B" />
                                </TouchableOpacity>
                              )}
                            </View>
                            
                            {move.hotel && (
                              <Text style={[styles.moveHotel, { fontSize: responsiveFontSize(14) }]}>🏨 {move.hotel}</Text>
                            )}
                            
                            <View style={styles.moveDetails}>
                              {move.passportRequired && (
                                <View style={styles.detailItem}>
                                  <Ionicons name="document" size={responsiveSize(14)} color="#34C759" />
                                  <Text style={[styles.detailText, { fontSize: responsiveFontSize(12) }]}>Нужен паспорт</Text>
                                </View>
                              )}
                              
                              {move.meals && (
                                <View style={styles.detailItem}>
                                  <Ionicons name="restaurant" size={responsiveSize(14)} color="#34C759" />
                                  <Text style={[styles.detailText, { fontSize: responsiveFontSize(12) }]}>
                                    Питание: {[
                                      move.meals.breakfast && 'завтрак',
                                      move.meals.lunch && 'обед', 
                                      move.meals.dinner && 'ужин',
                                      move.meals.noFood && 'не кормят'
                                    ].filter(Boolean).join(', ')}
                                  </Text>
                                </View>
                              )}
                            </View>
                            
                            {move.whatToTake && (
                              <Text style={[styles.moveNote, { fontSize: responsiveFontSize(12) }]}>📦 Взять: {move.whatToTake}</Text>
                            )}
                            
                            {move.arrivalInfo && (
                              <Text style={[styles.moveNote, { fontSize: responsiveFontSize(12) }]}>ℹ️ {move.arrivalInfo}</Text>
                            )}
                          </LinearGradient>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}

                  {selectedDateTours.length > 0 && (
                    <View style={styles.sectionContainer}>
                      <Text style={[styles.sectionTitle, { fontSize: responsiveFontSize(18) }]}>✈️ Гастроли</Text>
                      {selectedDateTours.map((tour) => (
                        <TouchableOpacity
                          key={tour.id}
                          style={styles.tourItem}
                          onPress={() => handleViewTour(tour)}
                        >
                          <LinearGradient
                            colors={['rgba(74, 144, 226, 0.2)', 'rgba(53, 122, 189, 0.2)']}
                            style={styles.tourGradient}
                          >
                            <View style={styles.tourHeader}>
                              <Text style={[styles.tourTitle, { fontSize: responsiveFontSize(16) }]}>{tour.title}</Text>
                              {userRole === 'admin' && (
                                <TouchableOpacity 
                                  onPress={(e) => {
                                    e.stopPropagation();
                                    handleDeleteTour(tour.id);
                                  }}
                                  style={styles.deleteButton}
                                >
                                  <Ionicons name="trash" size={responsiveSize(20)} color="#FF6B6B" />
                                </TouchableOpacity>
                              )}
                            </View>
                            <Text style={[styles.tourDescription, { fontSize: responsiveFontSize(14) }]}>{tour.description}</Text>
                            <View style={styles.tourDates}>
                              <Ionicons name="calendar" size={responsiveSize(14)} color="#4A90E2" />
                              <Text style={[styles.tourDatesText, { fontSize: responsiveFontSize(13) }]}>
                                {formatDate(tour.startDate)} - {formatDate(tour.endDate)}
                              </Text>
                            </View>
                          </LinearGradient>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}

                  {selectedDateConcerts.length > 0 && (
                    <View style={styles.sectionContainer}>
                      <Text style={[styles.sectionTitle, { fontSize: responsiveFontSize(18) }]}>🎵 Концерты</Text>
                      {selectedDateConcerts.map((concert) => {
                        const concertTypeRussian = toRussianType(concert.concertType);
                        const concertColor = getColorByRegion(concert.region); // ✅ ИСПОЛЬЗУЕМ ЦВЕТ ПО РЕГИОНАМ
                        
                        return (
                          <TouchableOpacity
                            key={concert.id}
                            style={styles.concertItem}
                            onPress={() => handleViewConcert(concert)}
                          >
                            <LinearGradient
                              colors={[`${concertColor}33`, `${concertColor}22`]}
                              style={styles.concertGradient}
                            >
                              <View style={styles.concertHeader}>
                                <Text style={[styles.concertType, { fontSize: responsiveFontSize(16), color: concertColor }]}>{concertTypeRussian}</Text>
                                {userRole === 'admin' && (
                                  <TouchableOpacity 
                                    onPress={(e) => {
                                      e.stopPropagation();
                                      handleDeleteConcert(concert.id);
                                    }}
                                    style={styles.deleteButton}
                                  >
                                    <Ionicons name="trash" size={responsiveSize(20)} color="#FF6B6B" />
                                  </TouchableOpacity>
                                )}
                              </View>
                              <Text style={[styles.concertDescription, { fontSize: responsiveFontSize(14) }]}>{concert.description}</Text>
                              <Text style={[styles.concertAddress, { fontSize: responsiveFontSize(13) }]}>{concert.address}</Text>
                              
                              {/* ✅ ПОКАЗЫВАЕМ РЕГИОН */}
                              {concert.region && (
                                <View style={styles.regionBadge}>
                                  <Ionicons name="location" size={responsiveSize(12)} color={concertColor} />
                                  <Text style={[styles.regionBadgeText, { fontSize: responsiveFontSize(11), color: concertColor }]}>
                                    {concert.region}
                                  </Text>
                                </View>
                              )}
                              
                              {(concert.program || concert.participants) && (
                                <View style={styles.concertInfo}>
                                  {concert.program && concert.program.songs && concert.program.songs.length > 0 && (
                                    <View style={styles.infoItem}>
                                      <Ionicons name="musical-notes" size={responsiveSize(14)} color="#FFD700" />
                                      <Text style={[styles.infoText, { fontSize: responsiveFontSize(12) }]}>
                                        Программа: {concert.program.songs.length} произведений
                                      </Text>
                                    </View>
                                  )}
                                  
                                  {concert.participants && concert.participants.length > 0 && (
                                    <View style={styles.infoItem}>
                                      <Ionicons name="people" size={responsiveSize(14)} color="#FFD700" />
                                      <Text style={[styles.infoText, { fontSize: responsiveFontSize(12) }]}>
                                        Участники: {concert.participants.length} человек
                                      </Text>
                                    </View>
                                  )}
                                </View>
                              )}
                              
                              <View style={styles.concertTime}>
                                <Ionicons name="time" size={responsiveSize(16)} color="#FFD700" />
                                <Text style={[styles.concertTimeText, { fontSize: responsiveFontSize(13) }]}>
                                  Выезд: {concert.departureTime} • Начало: {concert.startTime}
                                </Text>
                              </View>
                            </LinearGradient>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  )}

                  {selectedDateConcerts.length === 0 && selectedDateTours.length === 0 && selectedDateMoves.length === 0 && (
                    <View style={styles.noConcerts}>
                      <Ionicons name="musical-notes" size={responsiveSize(48)} color="#555" />
                      <Text style={[styles.noConcertsText, { fontSize: responsiveFontSize(16) }]}>На эту дату нет событий</Text>
                    </View>
                  )}
                </ScrollView>

                {userRole === 'admin' && (
                  <TouchableOpacity 
                    style={styles.addButtonWrapper}
                    onPress={handleAddEvent}
                    activeOpacity={0.9}
                  >
                    <LinearGradient
                      colors={['#FFD700', '#FFA500']}
                      style={styles.addButton}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                    >
                      <Ionicons name="add" size={responsiveSize(22)} color="#1a1a1a" />
                      <Text style={[styles.addButtonText, { fontSize: responsiveFontSize(16) }]}>Добавить событие</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                )}
              </LinearGradient>
            </Animated.View>
          </View>
        </Modal>

        {/* ✅ МОДАЛЬНОЕ ОКНО ВЫБОРА ТИПА СОБЫТИЯ (БЕЗ BLURVIEW) */}
        <Modal
          animationType="fade"
          transparent={true}
          visible={eventTypeModalVisible}
          onRequestClose={closeEventTypeModal}
        >
          <View style={styles.modalOverlay}>
            <TouchableOpacity 
              style={styles.modalBackdrop}
              activeOpacity={1}
              onPress={closeEventTypeModal}
            />
            <Animated.View 
              style={[
                styles.eventTypeModalContainer,
                {
                  transform: [{ scale: eventTypeScaleAnim }],
                }
              ]}
            >
              <LinearGradient
                colors={['rgba(26, 26, 26, 0.98)', 'rgba(35, 35, 35, 0.95)']}
                style={styles.eventTypeModalGradient}
              >
                <View style={styles.eventTypeHeader}>
                  <Text style={[styles.eventTypeTitle, { fontSize: responsiveFontSize(22) }]}>Выберите тип события</Text>
                  <TouchableOpacity onPress={closeEventTypeModal} style={styles.modalCloseIcon}>
                    <Ionicons name="close-circle" size={responsiveSize(30)} color="#FFD700" />
                  </TouchableOpacity>
                </View>

                <View style={styles.eventTypeOptions}>
                  <TouchableOpacity 
                    style={styles.eventTypeOption}
                    onPress={() => handleEventTypeSelect('concert')}
                    activeOpacity={0.8}
                  >
                    <LinearGradient
                      colors={['#9B59B6', '#8E44AD']}
                      style={styles.eventTypeOptionGradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    >
                      <Ionicons name="musical-notes" size={responsiveSize(48)} color="white" />
                      <Text style={[styles.eventTypeOptionText, { fontSize: responsiveFontSize(20) }]}>Добавить концерт</Text>
                      <Text style={[styles.eventTypeOptionDescription, { fontSize: responsiveFontSize(13) }]}>
                        Создать новое концертное мероприятие
                      </Text>
                    </LinearGradient>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={styles.eventTypeOption}
                    onPress={() => handleEventTypeSelect('tour')}
                    activeOpacity={0.8}
                  >
                    <LinearGradient
                      colors={['#4682B4', '#4169E1']}
                      style={styles.eventTypeOptionGradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    >
                      <Ionicons name="airplane" size={responsiveSize(48)} color="white" />
                      <Text style={[styles.eventTypeOptionText, { fontSize: responsiveFontSize(20) }]}>Добавить гастроли</Text>
                      <Text style={[styles.eventTypeOptionDescription, { fontSize: responsiveFontSize(13) }]}>
                        Запланировать гастрольный тур
                      </Text>
                    </LinearGradient>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={styles.eventTypeOption}
                    onPress={() => handleEventTypeSelect('move')}
                    activeOpacity={0.8}
                  >
                    <LinearGradient
                      colors={['#34C759', '#28A745']}
                      style={styles.eventTypeOptionGradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    >
                      <Ionicons name="bus" size={responsiveSize(48)} color="white" />
                      <Text style={[styles.eventTypeOptionText, { fontSize: responsiveFontSize(20) }]}>Добавить переезд</Text>
                      <Text style={[styles.eventTypeOptionDescription, { fontSize: responsiveFontSize(13) }]}>
                        Запланировать переезд между городами
                      </Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </LinearGradient>
            </Animated.View>
          </View>
        </Modal>

        {/* ✅ МОДАЛЬНОЕ ОКНО ВЫХОДА (БЕЗ BLURVIEW) */}
        <Modal
          animationType="fade"
          transparent={true}
          visible={logoutModalVisible}
          onRequestClose={cancelLogout}
        >
          <View style={styles.modalOverlay}>
            <TouchableOpacity 
              style={styles.modalBackdrop}
              activeOpacity={1}
              onPress={cancelLogout}
            />
            <Animated.View 
              style={[
                styles.logoutModalContainer,
                {
                  transform: [{ scale: logoutScaleAnim }],
                }
              ]}
            >
              <LinearGradient
                colors={['rgba(26, 26, 26, 0.98)', 'rgba(35, 35, 35, 0.95)']}
                style={styles.logoutModalGradient}
              >
                <View style={styles.logoutModalHeader}>
                  <Ionicons name="log-out" size={responsiveSize(48)} color="#FF6B6B" />
                  <Text style={[styles.logoutModalTitle, { fontSize: responsiveFontSize(22) }]}>Выход из аккаунта</Text>
                  <Text style={[styles.logoutModalText, { fontSize: responsiveFontSize(15) }]}>
                    Вы уверены, что хотите выйти?
                  </Text>
                </View>

                <View style={styles.logoutModalButtons}>
                  <TouchableOpacity 
                    style={styles.logoutModalButton}
                    onPress={cancelLogout}
                    activeOpacity={0.8}
                  >
                    <LinearGradient
                      colors={['#555', '#444']}
                      style={styles.logoutModalButtonGradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    >
                      <Text style={[styles.logoutModalButtonText, { fontSize: responsiveFontSize(16) }]}>Отмена</Text>
                    </LinearGradient>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={styles.logoutModalButton}
                    onPress={confirmLogout}
                    activeOpacity={0.8}
                  >
                    <LinearGradient
                      colors={['#FF6B6B', '#EE5A52']}
                      style={styles.logoutModalButtonGradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    >
                      <Text style={[styles.logoutModalButtonText, { fontSize: responsiveFontSize(16) }]}>Выйти</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </LinearGradient>
            </Animated.View>
          </View>
        </Modal>

        {/* ✅ CUSTOM ALERT COMPONENT */}
        <CustomAlert
          visible={alertConfig.visible}
          title={alertConfig.title}
          message={alertConfig.message}
          buttons={alertConfig.buttons}
          onClose={closeAlert}
        />
      </LinearGradient>
    </View>
  );
}

// ✅ СТИЛИ (БАЗОВЫЕ РАЗМЕРЫ, БЕЗ ДИНАМИЧЕСКИХ)
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  background: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },

  // ✅ НОВОЕ: СТАТИСТИКА ПО РЕГИОНАМ
  statisticsSection: {
    marginHorizontal: 15,
    marginTop: 15,
    marginBottom: 15,
    backgroundColor: 'rgba(26, 26, 26, 0.8)',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(74, 144, 226, 0.2)',
  },
  statisticsTitleWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statisticsIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statisticsTitle: {
    fontWeight: '700',
    color: '#E0E0E0',
  },
  statisticsTabsContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  statisticsTab: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  statisticsTabGradient: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: 'center',
    borderRadius: 12,
  },
  statisticsTabActive: {},
  statisticsTabText: {
    fontWeight: '600',
    color: '#999',
  },
  statisticsTabTextActive: {
    color: '#1a1a1a',
    fontWeight: '700',
  },
  statisticsContent: {
    backgroundColor: 'rgba(42, 42, 42, 0.5)',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(74, 144, 226, 0.15)',
  },
  statisticsContentTitle: {
    fontWeight: '600',
    color: '#999',
    marginBottom: 12,
  },
  progressBarContainer: {
    marginBottom: 16,
  },
  progressBarRow: {
    flexDirection: 'row',
    height: 20,
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  progressSegment: {
    height: '100%',
  },
  progressLabelsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  progressLabel: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  progressLegend: {
    width: 12,
    height: 12,
    borderRadius: 2,
  },
  progressLabelText: {
    color: '#999',
    fontWeight: '500',
  },
  statisticsTotal: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(74, 144, 226, 0.2)',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statisticsTotalLabel: {
    color: '#999',
    fontWeight: '600',
  },
  statisticsTotalValue: {
    fontWeight: '700',
    color: '#4A90E2',
  },
  
  // ХЕДЕР
  header: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
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
    width: 200,
    height: 200,
    backgroundColor: '#FFD700',
    top: -80,
    right: -50,
  },
  decorCircle2: {
    width: 150,
    height: 150,
    backgroundColor: '#FFA500',
    bottom: -60,
    left: -40,
  },
  decorCircle3: {
    width: 100,
    height: 100,
    backgroundColor: '#DAA520',
    top: 40,
    left: 30,
  },
  
  headerContent: {
    position: 'relative',
    zIndex: 2,
  },
  
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  
  greetingSection: {
    flex: 1,
  },
  greetingText: {
    color: '#999',
    fontWeight: '500',
    marginBottom: 2,
  },
  userName: {
    color: '#E0E0E0',
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  
  roleButton: {
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  roleButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
  },
  roleButtonText: {
    color: '#1a1a1a',
    fontWeight: '700',
  },
  
  logoutButton: {
    borderRadius: 22,
    overflow: 'hidden',
    shadowColor: '#FF6B6B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  logoutButtonGradient: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  titleSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    backgroundColor: 'rgba(42, 42, 42, 0.6)',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.2)',
  },
  
  titleIconContainer: {
    marginRight: 14,
  },
  titleIconGradient: {
    width: 56,
    height: 56,
    borderRadius: 16,
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
    fontWeight: '800',
    color: '#E0E0E0',
    letterSpacing: 0.3,
    marginBottom: 2,
  },
  subtitle: {
    color: '#999',
    fontWeight: '500',
  },
  
  statsContainer: {
    backgroundColor: 'rgba(42, 42, 42, 0.6)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.2)',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },

  monthStatsHeaderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },

  monthStatsHeaderLeft: {
    flex: 1,
  },
  
  monthStatsTitle: {
    fontWeight: '700',
    color: '#FFD700',
    textAlign: 'center',
    letterSpacing: 0.3,
  },

  collapseButton: {
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },

  statisticsSectionHeaderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  
  statsRow: {
    flexDirection: 'row',
  },
  
  statCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  
  statIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  statTextContainer: {
    flex: 1,
  },
  
  statValue: {
    fontWeight: '800',
    color: '#E0E0E0',
    letterSpacing: 0.3,
  },
  
  statLabel: {
    color: '#999',
    fontWeight: '600',
    marginTop: 2,
  },
  
  statDivider: {
    width: 1,
    height: '100%',
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    marginHorizontal: 8,
  },
  
  // КАЛЕНДАРЬ
  calendarWrapper: {
    margin: 15,
  },
  calendarContainer: {
    borderRadius: 20,
    padding: 12,
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.2)',
  },
  calendar: {
    borderRadius: 15,
  },
  dayContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 3,
    position: 'relative',
    height: 44,
  },
  dayBase: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  dayText: {
    fontWeight: '600',
    color: '#E0E0E0',
  },
  todayDay: {
    borderWidth: 3,
    borderColor: 'rgba(255, 215, 0, 0.6)',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 15,
    elevation: 8,
  },
  todayText: {
    color: '#1a1a1a',
    fontWeight: '900',
    textShadowColor: 'rgba(255, 255, 255, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  concertDay: {
    borderWidth: 2,
    borderColor: 'rgba(155, 89, 182, 0.5)',
    shadowColor: '#9B59B6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 6,
  },
  tourDay: {
    borderWidth: 2,
    borderColor: 'rgba(74, 144, 226, 0.5)',
    shadowColor: '#4A90E2',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 6,
  },
  moveDay: {
    borderWidth: 2,
    borderColor: 'rgba(52, 199, 89, 0.5)',
    shadowColor: '#34C759',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 6,
  },
  eventText: {
    color: '#FFFFFF',
    fontWeight: '600',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  tourUnderline: {
    position: 'absolute',
    bottom: 8,
    width: 24,
    height: 2,
    backgroundColor: '#FFFFFF',
    borderRadius: 1,
  },
  moveLine: {
    position: 'absolute',
    top: 8,
    width: 24,
    height: 2,
    backgroundColor: '#FFFFFF',
    borderRadius: 1,
  },
  selectedDay: {
    backgroundColor: '#FFD700',
  },
  selectedText: {
    color: '#1a1a1a',
    fontWeight: 'bold',
  },
  disabledText: {
    color: '#555',
    opacity: 0.5,
  },
  normalDay: {
    borderWidth: 2,
    borderColor: '#2a2a2a',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
  normalText: {
    color: '#E0E0E0',
  },

  // БЫСТРЫЕ ДЕЙСТВИЯ
  quickActionsContainer: {
    marginHorizontal: 15,
    marginBottom: 20,
    backgroundColor: 'rgba(26, 26, 26, 0.8)',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.2)',
  },
  quickActionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 215, 0, 0.15)',
  },
  quickActionsTitleWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  quickActionsTitleIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 3,
  },
  quickActionsMore: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(42, 42, 42, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.2)',
  },
  quickActionsTitle: {
    fontWeight: '700',
    color: '#E0E0E0',
    letterSpacing: 0.3,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    gap: 8,
  },
  quickActionCard: {
    width: '22%',
    alignItems: 'center',
    marginBottom: 15,
  },
  quickActionIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  quickActionText: {
    fontWeight: '500',
    color: '#E0E0E0',
    textAlign: 'center',
    lineHeight: 14,
  },

  // ✅ МОДАЛЬНЫЕ ОКНА (БЕЗ BLURVIEW)
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalContainer: {
    width: '95%',
    maxWidth: 450,
    maxHeight: '85%',
  },
  modalGradient: {
    borderRadius: 30,
    padding: 25,
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontWeight: '900',
    color: '#E0E0E0',
    letterSpacing: 0.3,
  },
  modalCloseIcon: {
    padding: 6,
  },
  modalDateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 18,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.4)',
  },
  modalDate: {
    color: '#E0E0E0',
    fontWeight: '700',
    marginLeft: 10,
  },
  concertsList: {
    maxHeight: 400,
    marginBottom: 20,
  },
  noConcerts: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 30,
  },
  noConcertsText: {
    color: '#888',
    marginTop: 12,
    textAlign: 'center',
  },

  sectionContainer: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontWeight: '800',
    color: '#E0E0E0',
    marginBottom: 12,
  },

  concertItem: {
    marginBottom: 15,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  concertGradient: {
    padding: 18,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.2)',
  },
  concertHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  concertType: {
    fontWeight: 'bold',
    color: '#FFD700',
    flex: 1,
  },
  deleteButton: {
    padding: 6,
  },
  concertDescription: {
    fontWeight: '600',
    color: '#E0E0E0',
    marginBottom: 8,
    lineHeight: 18,
  },
  concertAddress: {
    color: '#999',
    marginBottom: 10,
    lineHeight: 16,
  },
  regionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 10,
    alignSelf: 'flex-start',
  },
  regionBadgeText: {
    marginLeft: 6,
    fontWeight: '600',
  },
  concertInfo: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 215, 0, 0.2)',
    paddingTop: 10,
    marginBottom: 10,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  infoText: {
    color: '#999',
    marginLeft: 8,
  },
  concertTime: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  concertTimeText: {
    color: '#FFD700',
    marginLeft: 6,
    fontWeight: '600',
  },

  tourItem: {
    marginBottom: 15,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#4A90E2',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  tourGradient: {
    padding: 18,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(74, 144, 226, 0.2)',
  },
  tourHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  tourTitle: {
    fontWeight: 'bold',
    color: '#4A90E2',
    flex: 1,
  },
  tourDescription: {
    fontWeight: '600',
    color: '#E0E0E0',
    marginBottom: 10,
    lineHeight: 18,
  },
  tourDates: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tourDatesText: {
    color: '#4A90E2',
    marginLeft: 6,
    fontWeight: '600',
  },

  moveItem: {
    marginBottom: 15,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#34C759',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  moveGradient: {
    padding: 18,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(52, 199, 89, 0.2)',
  },
  moveHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  moveTitle: {
    fontWeight: 'bold',
    color: '#34C759',
    flex: 1,
  },
  moveHotel: {
    color: '#34C759',
    marginBottom: 8,
    fontWeight: '600',
  },
  moveDetails: {
    marginBottom: 10,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  detailText: {
    color: '#34C759',
    marginLeft: 8,
  },
  moveNote: {
    color: '#999',
    marginBottom: 4,
    lineHeight: 16,
  },

  addButtonWrapper: {
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 8,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 25,
  },
  addButtonText: {
    color: '#1a1a1a',
    fontWeight: 'bold',
    marginLeft: 8,
  },

  eventTypeModalContainer: {
    width: '90%',
    maxWidth: 400,
  },
  eventTypeModalGradient: {
    borderRadius: 30,
    padding: 25,
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
  },
  eventTypeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 25,
  },
  eventTypeTitle: {
    fontWeight: '900',
    color: '#E0E0E0',
    letterSpacing: 0.3,
  },
  eventTypeOptions: {
    gap: 15,
  },
  eventTypeOption: {
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  eventTypeOptionGradient: {
    padding: 25,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 150,
  },
  eventTypeOptionText: {
    fontWeight: '800',
    color: 'white',
    marginTop: 15,
    marginBottom: 8,
  },
  eventTypeOptionDescription: {
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    fontWeight: '500',
  },

  logoutModalContainer: {
    width: '85%',
    maxWidth: 350,
  },
  logoutModalGradient: {
    borderRadius: 25,
    padding: 30,
    shadowColor: '#FF6B6B',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 107, 0.3)',
  },
  logoutModalHeader: {
    alignItems: 'center',
    marginBottom: 25,
  },
  logoutModalTitle: {
    fontWeight: '800',
    color: '#E0E0E0',
    marginTop: 15,
    marginBottom: 10,
    textAlign: 'center',
  },
  logoutModalText: {
    color: '#999',
    textAlign: 'center',
    lineHeight: 20,
  },
  logoutModalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  logoutModalButton: {
    flex: 1,
    borderRadius: 15,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  logoutModalButtonGradient: {
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutModalButtonText: {
    fontWeight: '700',
    color: 'white',
  },

  // ✅ CUSTOM ALERT STYLES
  customAlertOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  customAlertContainer: {
    width: '100%',
    maxWidth: 350,
  },
  customAlertGradient: {
    borderRadius: 25,
    padding: 25,
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
  },
  customAlertTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#E0E0E0',
    marginBottom: 12,
    textAlign: 'center',
  },
  customAlertMessage: {
    fontSize: 14,
    color: '#999',
    marginBottom: 20,
    textAlign: 'center',
    lineHeight: 20,
  },
  customAlertButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  customAlertButton: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 3,
  },
  customAlertButtonDestructive: {
    // Дополнительные стили для кнопки удаления
  },
  customAlertButtonCancel: {
    // Дополнительные стили для кнопки отмены
  },
  customAlertButtonGradient: {
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  customAlertButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
  },
});
