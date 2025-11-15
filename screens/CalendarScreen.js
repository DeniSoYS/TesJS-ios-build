import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { signOut } from 'firebase/auth';
import { collection, deleteDoc, doc, getDocs, query } from 'firebase/firestore';
import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated, Dimensions,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { Calendar, LocaleConfig } from 'react-native-calendars';
import { auth, db } from '../firebaseConfig';

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

// ✅ АДАПТИВНЫЕ РАЗМЕРЫ
const { width, height } = Dimensions.get('window');
const isSmallDevice = width < 675;
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

export default function CalendarScreen({ navigation, route }) {
  const userEmail = route.params?.email || 'Пользователь';
  const userRole = route.params?.role || 'user';
  
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
  
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
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
    ).start();

    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();
  }, []);

  useEffect(() => {
    loadConcerts();
    loadTours();
    loadMoves();
  }, []);

  const loadConcerts = async () => {
    try {
      console.log('📅 CalendarScreen: Загрузка концертов...');
      
      if (!auth.currentUser) {
        console.log('❌ CalendarScreen: Пользователь НЕ авторизован');
        setConcerts([]);
        return;
      }
      
      const concertsQuery = query(collection(db, 'concerts'));
      const snapshot = await getDocs(concertsQuery);
      
      const concertsData = [];
      snapshot.forEach((doc) => {
        concertsData.push({ id: doc.id, ...doc.data() });
      });
      
      console.log(`✅ CalendarScreen: Загружено ${concertsData.length} концертов`);
      setConcerts(concertsData);
      updateMarkedDates(concertsData, tours, moves);
    } catch (error) {
      console.error('❌ CalendarScreen: Ошибка загрузки концертов:', error);
      Alert.alert('Ошибка', 'Не удалось загрузить концерты');
    }
  };

  const loadTours = async () => {
    try {
      console.log('🎭 CalendarScreen: Загрузка гастролей...');
      
      if (!auth.currentUser) {
        setTours([]);
        return;
      }
      
      const toursQuery = query(collection(db, 'tours'));
      const snapshot = await getDocs(toursQuery);
      
      const toursData = [];
      snapshot.forEach((doc) => {
        toursData.push({ id: doc.id, ...doc.data() });
      });
      
      console.log(`✅ CalendarScreen: Загружено ${toursData.length} гастролей`);
      setTours(toursData);
      updateMarkedDates(concerts, toursData, moves);
    } catch (error) {
      console.error('❌ CalendarScreen: Ошибка загрузки гастролей:', error);
      Alert.alert('Ошибка', 'Не удалось загрузить гастроли');
    }
  };

  const loadMoves = async () => {
    try {
      console.log('🚌 CalendarScreen: Загрузка переездов...');
      
      if (!auth.currentUser) {
        setMoves([]);
        return;
      }
      
      const movesQuery = query(collection(db, 'moves'));
      const snapshot = await getDocs(movesQuery);
      
      const movesData = [];
      snapshot.forEach((doc) => {
        movesData.push({ id: doc.id, ...doc.data() });
      });
      
      console.log(`✅ CalendarScreen: Загружено ${movesData.length} переездов`);
      setMoves(movesData);
      updateMarkedDates(concerts, tours, movesData);
    } catch (error) {
      console.error('❌ CalendarScreen: Ошибка загрузки переездов:', error);
      Alert.alert('Ошибка', 'Не удалось загрузить переезды');
    }
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
        selectedColor: '#007bff',
        customStyles: {
          container: {
            borderRadius: 20,
          },
          text: {
            color: 'white',
            fontWeight: 'bold',
          }
        }
      },
    };

    concertsData.forEach(concert => {
      if (concert.date === today) {
        newMarkedDates[concert.date] = {
          ...newMarkedDates[concert.date],
          marked: true,
          dots: [{
            key: 'concert',
            color: '#FFD700',
            selectedDotColor: '#FFFFFF'
          }]
        };
      } else {
        newMarkedDates[concert.date] = {
          marked: true,
          dots: [{
            key: 'concert',
            color: '#FFD700',
            selectedDotColor: '#FFFFFF'
          }],
          customStyles: {
            container: {
              backgroundColor: 'transparent',
            },
            text: {
              color: '#3E2723',
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
                color: '#3E2723',
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
              color: '#3E2723',
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

  const handleDeleteConcert = async (concertId) => {
    Alert.alert(
      'Удаление концерта',
      'Вы уверены, что хотите удалить этот концерт?',
      [
        { text: 'Отмена', style: 'cancel' },
        { 
          text: 'Удалить', 
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDoc(doc(db, 'concerts', concertId));
              Alert.alert('Успех', 'Концерт удален');
              const updatedConcerts = selectedDateConcerts.filter(c => c.id !== concertId);
              setSelectedDateConcerts(updatedConcerts);
              loadConcerts();
            } catch (error) {
              console.error('Ошибка удаления:', error);
              Alert.alert('Ошибка', 'Не удалось удалить концерт');
            }
          }
        }
      ]
    );
  };

  const handleDeleteTour = async (tourId) => {
    Alert.alert(
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
              Alert.alert('Успех', 'Гастроли удалены');
              const updatedTours = selectedDateTours.filter(t => t.id !== tourId);
              setSelectedDateTours(updatedTours);
              loadTours();
            } catch (error) {
              console.error('Ошибка удаления:', error);
              Alert.alert('Ошибка', 'Не удалось удалить гастроли');
            }
          }
        }
      ]
    );
  };

  const handleDeleteMove = async (moveId) => {
    Alert.alert(
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
              Alert.alert('Успех', 'Переезд удален');
              const updatedMoves = selectedDateMoves.filter(m => m.id !== moveId);
              setSelectedDateMoves(updatedMoves);
              loadMoves();
            } catch (error) {
              console.error('Ошибка удаления:', error);
              Alert.alert('Ошибка', 'Не удалось удалить переезд');
            }
          }
        }
      ]
    );
  };

  const handleLogout = async () => {
    Alert.alert(
      'Выход',
      'Вы уверены, что хотите выйти?',
      [
        { text: 'Отмена', style: 'cancel' },
        { 
          text: 'Выйти', 
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut(auth);
            } catch (error) {
              console.error('Ошибка выхода:', error);
              Alert.alert('Ошибка', error.message);
            }
          }
        }
      ]
    );
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const [year, month, day] = dateString.split('-');
    const months = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 
                    'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
    return `${parseInt(day)} ${months[parseInt(month) - 1]} ${year}`;
  };

  const getQuickActions = () => {
    const actions = [
      { 
        icon: 'list', 
        label: 'Мои концерты', 
        gradient: ['#FFD700', '#DAA520'],
        onPress: () => navigation.navigate('MyEvents', { 
          userRole: userRole,
          userEmail: userEmail 
        })
        
      },
      { 
        icon: 'medical', 
        label: 'Мой статус', 
        gradient: ['#FFD700', '#DAA520'],
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
          gradient: ['#FFD700', '#DAA520'],
          onPress: () => navigation.navigate('EmployeesList', { userRole })
        },
        {
          icon: 'notifications', 
          label: 'Напоминания', 
          gradient: ['#FFD700', '#DAA520'],
          onPress: () => navigation.navigate('Reminders', { userRole })
        }
      );
    }

    if (userRole !== 'admin') {
      actions.push({
        icon: 'notifications', 
        label: 'Напоминания', 
        gradient: ['#FFD700', '#DAA520'],
        onPress: () => navigation.navigate('Reminders', { userRole })
      });
    }

    actions.push(
      { 
        icon: 'checkmark-done', 
        label: 'Задачи', 
        gradient: ['#FFD700', '#DAA520'],
        onPress: () => Alert.alert('Задачи', 'Функция в разработке')
      },
      { 
        icon: 'settings', 
        label: 'Настройки', 
        gradient: ['#FFD700', '#DAA520'],
        onPress: () => Alert.alert('Настройки', 'Функция в разработке')
      }
    );

    return actions;
  };

  const quickActions = getQuickActions();

  return (
    <LinearGradient
      colors={['#8c7c49ff', '#FFE4B5', '#FFD700']}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <Animated.View style={{ opacity: fadeAnim }}>
        <LinearGradient
          colors={['rgba(255, 248, 225, 0.98)', 'rgba(255, 228, 181, 0.95)']}
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
              <View style={styles.greetingSection}>
                <Text style={styles.greetingText}>Добро пожаловать,</Text>
                <Text style={styles.userName} numberOfLines={1}>
                  {userEmail.split('@')[0]}
                </Text>
              </View>

              <View style={styles.actionButtons}>
                <TouchableOpacity 
                  style={styles.roleButton}
                  activeOpacity={0.8}
                  onPress={() => Alert.alert('Роль', `Вы вошли как ${userRole === 'admin' ? 'Администратор' : 'Артист'}`)}
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
                      size={getResponsiveSize(16)} 
                      color="white" 
                    />
                    <Text style={styles.roleButtonText}>
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
                    <Ionicons name="log-out-outline" size={getResponsiveSize(20)} color="white" />
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
                  <Ionicons name="calendar" size={getResponsiveSize(28)} color="white" />
                </LinearGradient>
              </View>
              <View style={styles.titleTextContainer}>
                <Text style={styles.mainTitle}>Концертный календарь</Text>
                <Text style={styles.subtitle}>Управление мероприятиями</Text>
              </View>
            </View>

            <View style={styles.statsContainer}>
              <View style={styles.statCard}>
                <View style={styles.statIconWrapper}>
                  <Ionicons name="musical-notes" size={getResponsiveSize(20)} color="#FFD700" />
                </View>
                <View style={styles.statTextContainer}>
                  <Text style={styles.statValue}>{concerts.length}</Text>
                  <Text style={styles.statLabel}>Концертов</Text>
                </View>
              </View>

              <View style={styles.statDivider} />

              <View style={styles.statCard}>
                <View style={styles.statIconWrapper}>
                  <Ionicons name="airplane" size={getResponsiveSize(20)} color="#FFA500" />
                </View>
                <View style={styles.statTextContainer}>
                  <Text style={styles.statValue}>{tours.length}</Text>
                  <Text style={styles.statLabel}>Гастролей</Text>
                </View>
              </View>

              <View style={styles.statDivider} />

              <View style={styles.statCard}>
                <View style={styles.statIconWrapper}>
                  <Ionicons name="bus" size={getResponsiveSize(20)} color="#34C759" />
                </View>
                <View style={styles.statTextContainer}>
                  <Text style={styles.statValue}>{moves.length}</Text>
                  <Text style={styles.statLabel}>Переездов</Text>
                </View>
              </View>
            </View>
          </View>
        </LinearGradient>
      </Animated.View>

      <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollView}>
        <View style={styles.calendarWrapper}>
          <LinearGradient
            colors={['rgba(255, 248, 225, 0.9)', 'rgba(255, 228, 181, 0.8)']}
            style={styles.calendarContainer}
          >
            <Calendar
              onDayPress={handleDateSelect}
              markedDates={markedDates}
              dayComponent={({ date, state, marking }) => {
                const isToday = date.dateString === today;
                const hasConcert = concerts.some(concert => concert.date === date.dateString);
                const hasTour = marking?.hasTour || false;
                const hasMove = marking?.hasMove || false;
                
                // 🎨 Определяем цвета градиента
                let gradientColors = ['#F5F7FA', '#E9ECEF']; // По умолчанию - обычный день
                let textStyle = styles.normalText;
                let dayStyle = styles.normalDay;
                let showTourLine = false;
                let showMoveLine = false;
                
                // 🔥 УПРОЩЕННАЯ ЛОГИКА ВЫБОРА ГРАДИЕНТА
                if (isToday) {
                  // СЕГОДНЯ - всегда золотой + другие цвета
                  gradientColors = ['#FFD700', '#FFA500'];
                  textStyle = styles.todayText;
                  dayStyle = styles.todayDay;
                  
                  if (hasConcert) gradientColors.push('#9B59B6');
                  if (hasTour) {
                    gradientColors.push('#87CEEB');
                    showTourLine = true;
                  }
                  if (hasMove) {
                    gradientColors.push('#4CAF50');
                    showMoveLine = true;
                  }
                } else {
                  // НЕ СЕГОДНЯ
                  if (hasConcert || hasTour || hasMove) {
                    // Есть хотя бы одно событие
                    gradientColors = [];
                    
                    if (hasConcert) {
                      gradientColors.push('#E0C3FC', '#9B59B6');
                      dayStyle = styles.concertDay;
                    }
                    if (hasTour) {
                      if (!hasConcert) gradientColors.push('#87CEEB', '#4682B4');
                      else gradientColors.push('#87CEEB');
                      showTourLine = true;
                      if (!hasConcert) dayStyle = styles.tourDay;
                    }
                    if (hasMove) {
                      if (!hasConcert && !hasTour) gradientColors.push('#C8E6C9', '#4CAF50');
                      else gradientColors.push('#4CAF50');
                      showMoveLine = true;
                      if (!hasConcert && !hasTour) dayStyle = styles.moveDay;
                    }
                    
                    textStyle = styles.eventText; // Белый текст для всех событий
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
                textSectionTitleColor: '#a0aec0',
                selectedDayBackgroundColor: '#DAA520',
                selectedDayTextColor: '#ffffff',
                todayTextColor: '#FFD700',
                dayTextColor: '#4a5568',
                textDisabledColor: '#cbd5e0',
                dotColor: '#FFD700',
                selectedDotColor: '#FFFFFF',
                arrowColor: '#a0aec0',
                monthTextColor: '#4a5568',
                textDayFontFamily: 'System',
                textMonthFontFamily: 'System',
                textDayHeaderFontFamily: 'System',
                textDayFontWeight: '600',
                textMonthFontWeight: '400',
                textDayHeaderFontWeight: '500',
                textDayFontSize: getResponsiveFontSize(14),
                textMonthFontSize: getResponsiveFontSize(20),
                textDayHeaderFontSize: getResponsiveFontSize(11),
              }}
              style={styles.calendar}
            />
          </LinearGradient>
        </View>

        <View style={styles.quickActionsContainer}>
          <View style={styles.quickActionsHeader}>
            <View style={styles.quickActionsTitleWrapper}>
              <LinearGradient
                colors={['#FFD700', '#FFA500']}
                style={styles.quickActionsTitleIcon}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Ionicons name="flash" size={getResponsiveSize(18)} color="white" />
              </LinearGradient>
              <Text style={styles.quickActionsTitle}>Быстрые действия</Text>
            </View>
            <TouchableOpacity style={styles.quickActionsMore}>
              <Ionicons name="ellipsis-horizontal" size={getResponsiveSize(20)} color="#8B7355" />
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
                  colors={['rgba(255, 255, 255, 0.95)', 'rgba(255, 248, 225, 0.9)']}
                  style={styles.quickActionCardGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <LinearGradient
                    colors={action.gradient}
                    style={styles.cardTopAccent}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  />
                  
                  <View style={styles.quickActionContent}>
                    <LinearGradient
                      colors={action.gradient}
                      style={styles.quickActionIconContainer}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    >
                      <View style={styles.iconInnerCircle}>
                        <Ionicons name={action.icon} size={getResponsiveSize(24)} color="white" />
                      </View>
                    </LinearGradient>
                    
                    <View style={styles.quickActionTextWrapper}>
                      <Text style={styles.quickActionText} numberOfLines={2}>
                        {action.label}
                      </Text>
                      <View style={styles.quickActionArrowContainer}>
                        <Ionicons name="arrow-forward" size={getResponsiveSize(14)} color="#DAA520" />
                      </View>
                    </View>
                  </View>
                  
                  <View style={styles.cardPattern}>
                    <View style={styles.patternDot} />
                    <View style={styles.patternDot} />
                    <View style={styles.patternDot} />
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* МОДАЛЬНОЕ ОКНО СОБЫТИЙ */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={closeModal}
      >
        <BlurView intensity={80} style={styles.modalOverlay} tint="light">
          <Animated.View 
            style={[
              styles.modalContainer,
              {
                transform: [{ scale: scaleAnim }],
              }
            ]}
          >
            <LinearGradient
              colors={['rgba(255, 248, 225, 0.95)', 'rgba(255, 228, 181, 0.9)']}
              style={styles.modalGradient}
            >
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>🎵 События</Text>
                <TouchableOpacity onPress={closeModal} style={styles.modalCloseIcon}>
                  <Ionicons name="close-circle" size={getResponsiveSize(30)} color="#DAA520" />
                </TouchableOpacity>
              </View>
              
              <View style={styles.modalDateContainer}>
                <Ionicons name="calendar" size={getResponsiveSize(22)} color="#FFD700" />
                <Text style={styles.modalDate}>{formatDate(selectedDate)}</Text>
              </View>

              <ScrollView style={styles.concertsList}>
                {selectedDateMoves.length > 0 && (
                  <View style={styles.sectionContainer}>
                    <Text style={styles.sectionTitle}>🚌 Переезды</Text>
                    {selectedDateMoves.map((move) => (
                      <TouchableOpacity
                        key={move.id}
                        style={styles.moveItem}
                      >
                        <LinearGradient
                          colors={['#E8F5E8', '#C8E6C9']}
                          style={styles.moveGradient}
                        >
                          <View style={styles.moveHeader}>
                            <Text style={styles.moveTitle}>
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
                                <Ionicons name="trash" size={getResponsiveSize(20)} color="#FF6B6B" />
                              </TouchableOpacity>
                            )}
                          </View>
                          
                          {move.hotel && (
                            <Text style={styles.moveHotel}>🏨 {move.hotel}</Text>
                          )}
                          
                          <View style={styles.moveDetails}>
                            {move.passportRequired && (
                              <View style={styles.detailItem}>
                                <Ionicons name="document" size={getResponsiveSize(14)} color="#4CAF50" />
                                <Text style={styles.detailText}>Нужен паспорт</Text>
                              </View>
                            )}
                            
                            {move.meals && (
                              <View style={styles.detailItem}>
                                <Ionicons name="restaurant" size={getResponsiveSize(14)} color="#4CAF50" />
                                <Text style={styles.detailText}>
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
                            <Text style={styles.moveNote}>📦 Взять: {move.whatToTake}</Text>
                          )}
                          
                          {move.arrivalInfo && (
                            <Text style={styles.moveNote}>ℹ️ {move.arrivalInfo}</Text>
                          )}
                        </LinearGradient>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {selectedDateTours.length > 0 && (
                  <View style={styles.sectionContainer}>
                    <Text style={styles.sectionTitle}>✈️ Гастроли</Text>
                    {selectedDateTours.map((tour) => (
                      <TouchableOpacity
                        key={tour.id}
                        style={styles.tourItem}
                      >
                        <LinearGradient
                          colors={['#E0F7FA', '#B2EBF2']}
                          style={styles.tourGradient}
                        >
                          <View style={styles.tourHeader}>
                            <Text style={styles.tourTitle}>{tour.title}</Text>
                            {userRole === 'admin' && (
                              <TouchableOpacity 
                                onPress={(e) => {
                                  e.stopPropagation();
                                  handleDeleteTour(tour.id);
                                }}
                                style={styles.deleteButton}
                              >
                                <Ionicons name="trash" size={getResponsiveSize(20)} color="#FF6B6B" />
                              </TouchableOpacity>
                            )}
                          </View>
                          <Text style={styles.tourDescription}>{tour.description}</Text>
                          <View style={styles.tourDates}>
                            <Ionicons name="calendar" size={getResponsiveSize(14)} color="#0097A7" />
                            <Text style={styles.tourDatesText}>
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
                    <Text style={styles.sectionTitle}>🎵 Концерты</Text>
                    {selectedDateConcerts.map((concert) => {
                      const concertTypeRussian = toRussianType(concert.concertType);
                      
                      return (
                        <TouchableOpacity
                          key={concert.id}
                          style={styles.concertItem}
                          onPress={() => handleViewConcert(concert)}
                        >
                          <LinearGradient
                            colors={['#FFF8E1', '#FFE4B5']}
                            style={styles.concertGradient}
                          >
                            <View style={styles.concertHeader}>
                              <Text style={styles.concertType}>{concertTypeRussian}</Text>
                              {userRole === 'admin' && (
                                <TouchableOpacity 
                                  onPress={(e) => {
                                    e.stopPropagation();
                                    handleDeleteConcert(concert.id);
                                  }}
                                  style={styles.deleteButton}
                                >
                                  <Ionicons name="trash" size={getResponsiveSize(20)} color="#FF6B6B" />
                                </TouchableOpacity>
                              )}
                            </View>
                            <Text style={styles.concertDescription}>{concert.description}</Text>
                            <Text style={styles.concertAddress}>{concert.address}</Text>
                            
                            {(concert.program || concert.participants) && (
                              <View style={styles.concertInfo}>
                                {concert.program && concert.program.songs && concert.program.songs.length > 0 && (
                                  <View style={styles.infoItem}>
                                    <Ionicons name="musical-notes" size={getResponsiveSize(14)} color="#DAA520" />
                                    <Text style={styles.infoText}>
                                      Программа: {concert.program.songs.length} произведений
                                    </Text>
                                  </View>
                                )}
                                
                                {concert.participants && concert.participants.length > 0 && (
                                  <View style={styles.infoItem}>
                                    <Ionicons name="people" size={getResponsiveSize(14)} color="#DAA520" />
                                    <Text style={styles.infoText}>
                                      Участники: {concert.participants.length} человек
                                    </Text>
                                  </View>
                                )}
                              </View>
                            )}
                            
                            <View style={styles.concertTime}>
                              <Ionicons name="time" size={getResponsiveSize(16)} color="#DAA520" />
                              <Text style={styles.concertTimeText}>
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
                    <Ionicons name="musical-notes" size={getResponsiveSize(48)} color="#DAA520" />
                    <Text style={styles.noConcertsText}>На эту дату нет событий</Text>
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
                    colors={['#FFD700', '#DAA520']}
                    style={styles.addButton}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    <Ionicons name="add" size={getResponsiveSize(22)} color="white" />
                    <Text style={styles.addButtonText}>Добавить событие</Text>
                  </LinearGradient>
                </TouchableOpacity>
              )}
            </LinearGradient>
          </Animated.View>
        </BlurView>
      </Modal>

      {/* МОДАЛЬНОЕ ОКНО ВЫБОРА ТИПА СОБЫТИЯ */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={eventTypeModalVisible}
        onRequestClose={closeEventTypeModal}
      >
        <BlurView intensity={80} style={styles.modalOverlay} tint="light">
          <Animated.View 
            style={[
              styles.eventTypeModalContainer,
              {
                transform: [{ scale: eventTypeScaleAnim }],
              }
            ]}
          >
            <LinearGradient
              colors={['rgba(255, 248, 225, 0.98)', 'rgba(255, 228, 181, 0.95)']}
              style={styles.eventTypeModalGradient}
            >
              <View style={styles.eventTypeHeader}>
                <Text style={styles.eventTypeTitle}>Выберите тип события</Text>
                <TouchableOpacity onPress={closeEventTypeModal} style={styles.modalCloseIcon}>
                  <Ionicons name="close-circle" size={getResponsiveSize(30)} color="#DAA520" />
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
                    <Ionicons name="musical-notes" size={getResponsiveSize(48)} color="white" />
                    <Text style={styles.eventTypeOptionText}>Добавить концерт</Text>
                    <Text style={styles.eventTypeOptionDescription}>
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
                    <Ionicons name="airplane" size={getResponsiveSize(48)} color="white" />
                    <Text style={styles.eventTypeOptionText}>Добавить гастроли</Text>
                    <Text style={styles.eventTypeOptionDescription}>
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
                    <Ionicons name="bus" size={getResponsiveSize(48)} color="white" />
                    <Text style={styles.eventTypeOptionText}>Добавить переезд</Text>
                    <Text style={styles.eventTypeOptionDescription}>
                      Запланировать переезд между городами
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </LinearGradient>
          </Animated.View>
        </BlurView>
      </Modal>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  
  header: {
    paddingHorizontal: getResponsiveSize(20),
    paddingTop: getResponsiveSize(50),
    paddingBottom: getResponsiveSize(24),
    borderBottomLeftRadius: getResponsiveSize(30),
    borderBottomRightRadius: getResponsiveSize(30),
    shadowColor: '#DAA520',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 12,
    position: 'relative',
    overflow: 'hidden',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(218, 165, 32, 0.2)',
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
    opacity: 0.08,
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
    marginBottom: getResponsiveSize(20),
  },
  
  greetingSection: {
    flex: 1,
  },
  greetingText: {
    fontSize: getResponsiveFontSize(13),
    color: '#8B7355',
    fontWeight: '500',
    marginBottom: getResponsiveSize(2),
  },
  userName: {
    fontSize: getResponsiveFontSize(18),
    color: '#3E2723',
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: getResponsiveSize(10),
  },
  
  roleButton: {
    borderRadius: getResponsiveSize(20),
    overflow: 'hidden',
    shadowColor: '#DAA520',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  roleButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: getResponsiveSize(12),
    paddingVertical: getResponsiveSize(8),
    gap: getResponsiveSize(6),
  },
  roleButtonText: {
    fontSize: getResponsiveFontSize(12),
    color: 'white',
    fontWeight: '700',
  },
  
  logoutButton: {
    borderRadius: getResponsiveSize(22),
    overflow: 'hidden',
    shadowColor: '#FF6B6B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  logoutButtonGradient: {
    width: getResponsiveSize(44),
    height: getResponsiveSize(44),
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  titleSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: getResponsiveSize(20),
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    paddingHorizontal: getResponsiveSize(16),
    paddingVertical: getResponsiveSize(14),
    borderRadius: getResponsiveSize(16),
    borderWidth: 1,
    borderColor: 'rgba(218, 165, 32, 0.2)',
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
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  
  titleTextContainer: {
    flex: 1,
  },
  mainTitle: {
    fontSize: getResponsiveFontSize(20),
    fontWeight: '800',
    color: '#3E2723',
    letterSpacing: 0.3,
    marginBottom: getResponsiveSize(2),
  },
  subtitle: {
    fontSize: getResponsiveFontSize(13),
    color: '#8B7355',
    fontWeight: '500',
  },
  
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderRadius: getResponsiveSize(16),
    padding: getResponsiveSize(16),
    borderWidth: 1,
    borderColor: 'rgba(218, 165, 32, 0.2)',
    shadowColor: '#DAA520',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  
  statCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: getResponsiveSize(10),
  },
  
  statIconWrapper: {
    width: getResponsiveSize(40),
    height: getResponsiveSize(40),
    borderRadius: getResponsiveSize(12),
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  statTextContainer: {
    flex: 1,
  },
  
  statValue: {
    fontSize: getResponsiveFontSize(20),
    fontWeight: '800',
    color: '#3E2723',
    letterSpacing: 0.3,
  },
  
  statLabel: {
    fontSize: getResponsiveFontSize(10),
    color: '#8B7355',
    fontWeight: '600',
    marginTop: getResponsiveSize(2),
  },
  
  statDivider: {
    width: 1,
    height: '100%',
    backgroundColor: 'rgba(218, 165, 32, 0.2)',
    marginHorizontal: getResponsiveSize(8),
  },
  
  calendarWrapper: {
    margin: getResponsiveSize(15),
  },
  calendarContainer: {
    borderRadius: getResponsiveSize(20),
    padding: getResponsiveSize(12),
    shadowColor: '#8B6B4F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
    borderWidth: 1,
    borderColor: 'rgba(218, 165, 32, 0.3)',
  },
  calendar: {
    borderRadius: getResponsiveSize(15),
  },
  dayContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: getResponsiveSize(3),
    position: 'relative',
    height: getResponsiveSize(44),
  },
  dayBase: {
    width: getResponsiveSize(38),
    height: getResponsiveSize(38),
    borderRadius: getResponsiveSize(19),
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  dayText: {
    fontSize: getResponsiveFontSize(14),
    fontWeight: '600',
    color: '#4a5568',
  },
  todayDay: {
    borderWidth: 3,
    borderColor: 'rgba(255, 215, 0, 0.5)',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 15,
    elevation: 8,
  },
  todayText: {
    color: '#1a202c',
    fontWeight: '900',
    textShadowColor: 'rgba(255, 255, 255, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  concertDay: {
    borderWidth: 2,
    borderColor: 'rgba(155, 89, 182, 0.4)',
    shadowColor: '#9B59B6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
  tourDay: {
    borderWidth: 2,
    borderColor: 'rgba(70, 130, 180, 0.4)',
    shadowColor: '#4682B4',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
  moveDay: {
    borderWidth: 2,
    borderColor: 'rgba(76, 175, 80, 0.4)',
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
  eventText: {
    color: '#FFFFFF',
    fontWeight: '600',
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  tourUnderline: {
    position: 'absolute',
    bottom: getResponsiveSize(8),
    width: getResponsiveSize(24),
    height: 2,
    backgroundColor: '#FFFFFF',
    borderRadius: 1,
  },
  moveLine: {
    position: 'absolute',
    top: getResponsiveSize(8),
    width: getResponsiveSize(24),
    height: 2,
    backgroundColor: '#FFFFFF',
    borderRadius: 1,
  },
  selectedDay: {
    backgroundColor: '#DAA520',
  },
  selectedText: {
    color: 'white',
    fontWeight: 'bold',
  },
  disabledText: {
    color: '#cbd5e0',
    opacity: 0.5,
  },
  normalDay: {
    borderWidth: 2,
    borderColor: '#e2e8f0',
    shadowColor: '#cbd5e0',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  normalText: {
    color: '#4a5568',
  },

  quickActionsContainer: {
    marginHorizontal: getResponsiveSize(15),
    marginBottom: getResponsiveSize(20),
  },
  quickActionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: getResponsiveSize(16),
  },
  quickActionsTitleWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: getResponsiveSize(10),
  },
  quickActionsTitleIcon: {
    width: getResponsiveSize(36),
    height: getResponsiveSize(36),
    borderRadius: getResponsiveSize(10),
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  quickActionsMore: {
    width: getResponsiveSize(36),
    height: getResponsiveSize(36),
    borderRadius: getResponsiveSize(10),
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(218, 165, 32, 0.2)',
  },
  quickActionsTitle: {
    fontSize: getResponsiveFontSize(20),
    fontWeight: '800',
    color: '#3E2723',
    letterSpacing: 0.3,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: getResponsiveSize(12),
  },
  quickActionCard: {
    width: '48%',
    borderRadius: getResponsiveSize(20),
    overflow: 'hidden',
    shadowColor: '#DAA520',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 6,
  },
  quickActionCardGradient: {
    padding: getResponsiveSize(18),
    borderWidth: 1,
    borderColor: 'rgba(218, 165, 32, 0.15)',
    borderRadius: getResponsiveSize(20),
    minHeight: getResponsiveSize(130),
    position: 'relative',
  },
  cardTopAccent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: getResponsiveSize(4),
    borderTopLeftRadius: getResponsiveSize(20),
    borderTopRightRadius: getResponsiveSize(20),
  },
  quickActionContent: {
    flex: 1,
    justifyContent: 'space-between',
    zIndex: 2,
  },
  quickActionIconContainer: {
    width: getResponsiveSize(60),
    height: getResponsiveSize(60),
    borderRadius: getResponsiveSize(18),
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: getResponsiveSize(12),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  iconInnerCircle: {
    width: getResponsiveSize(48),
    height: getResponsiveSize(48),
    borderRadius: getResponsiveSize(14),
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickActionTextWrapper: {
    flex: 1,
    justifyContent: 'space-between',
  },
  quickActionText: {
    fontSize: getResponsiveFontSize(14),
    fontWeight: '700',
    color: '#3E2723',
    letterSpacing: 0.2,
    lineHeight: getResponsiveFontSize(18),
    marginBottom: getResponsiveSize(8),
  },
  quickActionArrowContainer: {
    alignSelf: 'flex-start',
    width: getResponsiveSize(32),
    height: getResponsiveSize(32),
    borderRadius: getResponsiveSize(10),
    backgroundColor: 'rgba(218, 165, 32, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(218, 165, 32, 0.2)',
  },
  cardPattern: {
    position: 'absolute',
    bottom: getResponsiveSize(12),
    right: getResponsiveSize(12),
    flexDirection: 'row',
    gap: getResponsiveSize(4),
    opacity: 0.3,
    zIndex: 1,
  },
  patternDot: {
    width: getResponsiveSize(4),
    height: getResponsiveSize(4),
    borderRadius: getResponsiveSize(2),
    backgroundColor: '#DAA520',
  },

  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '95%',
    maxWidth: getResponsiveSize(450),
    maxHeight: '85%',
  },
  modalGradient: {
    borderRadius: getResponsiveSize(30),
    padding: getResponsiveSize(25),
    shadowColor: '#8B6B4F',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(218, 165, 32, 0.3)',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: getResponsiveSize(12),
  },
  modalTitle: {
    fontSize: getResponsiveFontSize(24),
    fontWeight: '900',
    color: '#3E2723',
    letterSpacing: 0.3,
  },
  modalCloseIcon: {
    padding: getResponsiveSize(6),
  },
  modalDateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    paddingVertical: getResponsiveSize(12),
    paddingHorizontal: getResponsiveSize(18),
    borderRadius: getResponsiveSize(18),
    marginBottom: getResponsiveSize(18),
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.4)',
  },
  modalDate: {
    fontSize: getResponsiveFontSize(18),
    color: '#3E2723',
    fontWeight: '700',
    marginLeft: getResponsiveSize(10),
  },
  concertsList: {
    maxHeight: getResponsiveSize(400),
    marginBottom: getResponsiveSize(20),
  },
  noConcerts: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: getResponsiveSize(30),
  },
  noConcertsText: {
    fontSize: getResponsiveFontSize(16),
    color: '#8B8B8B',
    marginTop: getResponsiveSize(12),
    textAlign: 'center',
  },

  sectionContainer: {
    marginBottom: getResponsiveSize(20),
  },
  sectionTitle: {
    fontSize: getResponsiveFontSize(18),
    fontWeight: '800',
    color: '#3E2723',
    marginBottom: getResponsiveSize(12),
  },

  concertItem: {
    marginBottom: getResponsiveSize(15),
    borderRadius: getResponsiveSize(16),
    overflow: 'hidden',
    shadowColor: '#8B6B4F',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  concertGradient: {
    padding: getResponsiveSize(18),
    borderRadius: getResponsiveSize(16),
  },
  concertHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: getResponsiveSize(10),
  },
  concertType: {
    fontSize: getResponsiveFontSize(16),
    fontWeight: 'bold',
    color: '#DAA520',
    flex: 1,
  },
  deleteButton: {
    padding: getResponsiveSize(6),
  },
  concertDescription: {
    fontSize: getResponsiveFontSize(14),
    fontWeight: '600',
    color: '#3E2723',
    marginBottom: getResponsiveSize(8),
    lineHeight: getResponsiveFontSize(18),
  },
  concertAddress: {
    fontSize: getResponsiveFontSize(13),
    color: '#8B8B8B',
    marginBottom: getResponsiveSize(10),
    lineHeight: getResponsiveFontSize(16),
  },
  concertInfo: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(218, 165, 32, 0.3)',
    paddingTop: getResponsiveSize(10),
    marginBottom: getResponsiveSize(10),
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: getResponsiveSize(6),
  },
  infoText: {
    fontSize: getResponsiveFontSize(12),
    color: '#8B8B8B',
    marginLeft: getResponsiveSize(8),
  },
  concertTime: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  concertTimeText: {
    fontSize: getResponsiveFontSize(13),
    color: '#DAA520',
    marginLeft: getResponsiveSize(6),
    fontWeight: '600',
  },

  tourItem: {
    marginBottom: getResponsiveSize(15),
    borderRadius: getResponsiveSize(16),
    overflow: 'hidden',
    shadowColor: '#4682B4',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  tourGradient: {
    padding: getResponsiveSize(18),
    borderRadius: getResponsiveSize(16),
  },
  tourHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: getResponsiveSize(10),
  },
  tourTitle: {
    fontSize: getResponsiveFontSize(16),
    fontWeight: 'bold',
    color: '#0097A7',
    flex: 1,
  },
  tourDescription: {
    fontSize: getResponsiveFontSize(14),
    fontWeight: '600',
    color: '#3E2723',
    marginBottom: getResponsiveSize(10),
    lineHeight: getResponsiveFontSize(18),
  },
  tourDates: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tourDatesText: {
    fontSize: getResponsiveFontSize(13),
    color: '#0097A7',
    marginLeft: getResponsiveSize(6),
    fontWeight: '600',
  },

  moveItem: {
    marginBottom: getResponsiveSize(15),
    borderRadius: getResponsiveSize(16),
    overflow: 'hidden',
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  moveGradient: {
    padding: getResponsiveSize(18),
    borderRadius: getResponsiveSize(16),
  },
  moveHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: getResponsiveSize(10),
  },
  moveTitle: {
    fontSize: getResponsiveFontSize(16),
    fontWeight: 'bold',
    color: '#2E7D32',
    flex: 1,
  },
  moveHotel: {
    fontSize: getResponsiveFontSize(14),
    color: '#4CAF50',
    marginBottom: getResponsiveSize(8),
    fontWeight: '600',
  },
  moveDetails: {
    marginBottom: getResponsiveSize(10),
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: getResponsiveSize(6),
  },
  detailText: {
    fontSize: getResponsiveFontSize(12),
    color: '#4CAF50',
    marginLeft: getResponsiveSize(8),
  },
  moveNote: {
    fontSize: getResponsiveFontSize(12),
    color: '#666',
    marginBottom: getResponsiveSize(4),
    lineHeight: getResponsiveFontSize(16),
  },

  addButtonWrapper: {
    borderRadius: getResponsiveSize(18),
    overflow: 'hidden',
    shadowColor: '#DAA520',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: getResponsiveSize(16),
    paddingHorizontal: getResponsiveSize(25),
  },
  addButtonText: {
    color: 'white',
    fontSize: getResponsiveFontSize(16),
    fontWeight: 'bold',
    marginLeft: getResponsiveSize(8),
  },

  eventTypeModalContainer: {
    width: '90%',
    maxWidth: getResponsiveSize(400),
  },
  eventTypeModalGradient: {
    borderRadius: getResponsiveSize(30),
    padding: getResponsiveSize(25),
    shadowColor: '#8B6B4F',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(218, 165, 32, 0.3)',
  },
  eventTypeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: getResponsiveSize(25),
  },
  eventTypeTitle: {
    fontSize: getResponsiveFontSize(22),
    fontWeight: '900',
    color: '#3E2723',
    letterSpacing: 0.3,
  },
  eventTypeOptions: {
    gap: getResponsiveSize(15),
  },
  eventTypeOption: {
    borderRadius: getResponsiveSize(20),
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  eventTypeOptionGradient: {
    padding: getResponsiveSize(25),
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: getResponsiveSize(150),
  },
  eventTypeOptionText: {
    fontSize: getResponsiveFontSize(20),
    fontWeight: '800',
    color: 'white',
    marginTop: getResponsiveSize(15),
    marginBottom: getResponsiveSize(8),
  },
  eventTypeOptionDescription: {
    fontSize: getResponsiveFontSize(13),
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    fontWeight: '500',
  },
});