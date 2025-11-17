// screens/RemindersScreen.js
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { collection, deleteDoc, doc, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import {
  Alert,
  Dimensions,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { db } from '../firebaseConfig';

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

export default function RemindersScreen({ navigation, route }) {
  const { userRole } = route.params;
  const [reminders, setReminders] = useState([]);
  const [filteredReminders, setFilteredReminders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => {
    const unsubscribe = loadReminders();
    return () => unsubscribe && unsubscribe();
  }, []);

  useEffect(() => {
    filterReminders();
  }, [reminders, activeTab]);

  const loadReminders = () => {
    try {
      setRefreshing(true);
      
      let remindersQuery;
      
      if (userRole === 'admin') {
        remindersQuery = query(
          collection(db, 'reminders'), 
          orderBy('eventDate', 'asc')
        );
      } else {
        remindersQuery = query(
          collection(db, 'reminders'),
          where('isActive', '==', true),
          orderBy('eventDate', 'asc')
        );
      }

      const unsubscribe = onSnapshot(remindersQuery, (snapshot) => {
        const remindersList = [];
        snapshot.forEach((doc) => {
          remindersList.push({ id: doc.id, ...doc.data() });
        });
        setReminders(remindersList);
        setLoading(false);
        setRefreshing(false);
      });

      return unsubscribe;
    } catch (error) {
      console.error('❌ Ошибка загрузки напоминаний:', error);
      setLoading(false);
      setRefreshing(false);
      return () => {};
    }
  };

  const filterReminders = () => {
    const now = new Date();
    let filtered = reminders;

    if (activeTab === 'upcoming') {
      filtered = reminders.filter(reminder => {
        const eventDate = reminder.eventDate.toDate ? reminder.eventDate.toDate() : new Date(reminder.eventDate);
        return eventDate >= now;
      });
    } else if (activeTab === 'past') {
      filtered = reminders.filter(reminder => {
        const eventDate = reminder.eventDate.toDate ? reminder.eventDate.toDate() : new Date(reminder.eventDate);
        return eventDate < now;
      });
    }

    setFilteredReminders(filtered);
  };

  const handleDeleteReminder = (reminder) => {
    if (userRole !== 'admin') {
      Alert.alert('Ошибка', 'Только администраторы могут удалять напоминания');
      return;
    }

    Alert.alert(
      'Удалить напоминание',
      `Вы уверены, что хотите удалить "${reminder.title}"?`,
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Удалить',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDoc(doc(db, 'reminders', reminder.id));
              Alert.alert('Успех', 'Напоминание удалено');
            } catch (error) {
              console.error('❌ Ошибка удаления:', error);
              Alert.alert('Ошибка', 'Не удалось удалить напоминание');
            }
          },
        },
      ]
    );
  };

  const groupRemindersByMonth = () => {
    const groups = {};
    
    filteredReminders.forEach(reminder => {
      const eventDate = reminder.eventDate.toDate ? reminder.eventDate.toDate() : new Date(reminder.eventDate);
      const monthKey = eventDate.toLocaleString('ru-RU', { month: 'long', year: 'numeric' }).toUpperCase() + ' Г.';
      
      if (!groups[monthKey]) {
        groups[monthKey] = [];
      }
      groups[monthKey].push(reminder);
    });

    return groups;
  };

  const formatEventDate = (date) => {
    if (!date) return 'Дата не указана';
    const d = date.toDate ? date.toDate() : new Date(date);
    return d.toLocaleString('ru-RU', {
      day: 'numeric',
      month: 'long'
    });
  };

  const formatEventTime = (date) => {
    if (!date) return '';
    const d = date.toDate ? date.toDate() : new Date(date);
    return d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  };

  const getTypeIcon = (type) => {
    const icons = {
      concert: 'musical-notes',
      rehearsal: 'repeat',
      admin: 'business',
      creative: 'color-palette',
      general: 'notifications'
    };
    return icons[type] || 'help-circle';
  };

  const getTypeColor = (type) => {
    const colors = {
      concert: '#FF6B6B',
      rehearsal: '#4ECDC4',
      admin: '#45B7D1',
      creative: '#96CEB4',
      general: '#FFD700'
    };
    return colors[type] || '#CCCCCC';
  };

  const renderReminderItem = (reminder) => (
    <TouchableOpacity 
      style={styles.reminderItem}
      onPress={() => {
        if (userRole === 'admin') {
          navigation.navigate('AddReminder', { 
            editReminder: reminder, 
            userRole 
          });
        } else {
          Alert.alert(
            reminder.title,
            `${reminder.message}\n\n📅 ${formatEventDate(reminder.eventDate)} ${formatEventTime(reminder.eventDate)}`,
            [{ text: 'OK' }]
          );
        }
      }}
      onLongPress={() => handleDeleteReminder(reminder)}
    >
      <LinearGradient
        colors={['rgba(42, 42, 42, 0.9)', 'rgba(35, 35, 35, 0.8)']}
        style={styles.reminderGradient}
      >
        <View style={styles.reminderHeader}>
          <View style={styles.dateContainer}>
            <LinearGradient
              colors={['#FFD700', '#FFA500']}
              style={styles.dateBadge}
            >
              <Text style={styles.dayText}>
                {formatEventDate(reminder.eventDate).split(' ')[0]}
              </Text>
              <Text style={styles.monthText}>
                {formatEventDate(reminder.eventDate).split(' ')[1]}
              </Text>
            </LinearGradient>
          </View>
          
          <View style={styles.reminderContent}>
            <View style={styles.titleRow}>
              <View style={styles.typeIconContainer}>
                <Ionicons 
                  name={getTypeIcon(reminder.type)} 
                  size={getResponsiveSize(16)} 
                  color={getTypeColor(reminder.type)} 
                />
              </View>
              <Text style={styles.reminderTitle} numberOfLines={1}>{reminder.title}</Text>
            </View>
            
            <Text style={styles.reminderMessage} numberOfLines={2}>
              {reminder.message}
            </Text>
            
            <View style={styles.timeContainer}>
              <Ionicons name="time" size={getResponsiveSize(14)} color="#FFD700" />
              <Text style={styles.timeText}>
                {formatEventTime(reminder.eventDate)}
              </Text>
            </View>
          </View>
        </View>
        
        {!reminder.isActive && (
          <View style={styles.inactiveOverlay}>
            <LinearGradient
              colors={['rgba(255, 193, 7, 0.9)', 'rgba(255, 152, 0, 0.9)']}
              style={styles.inactiveBadge}
            >
              <Text style={styles.inactiveText}>Неактивно</Text>
            </LinearGradient>
          </View>
        )}
      </LinearGradient>
    </TouchableOpacity>
  );

  const groupedReminders = groupRemindersByMonth();
  const monthKeys = Object.keys(groupedReminders);

  if (loading) {
    return (
      <LinearGradient
        colors={['#0a0a0a', '#1a1a1a', '#2a2a2a']}
        style={styles.loadingContainer}
      >
        <Ionicons name="musical-notes" size={getResponsiveSize(48)} color="#FFD700" />
        <Text style={styles.loadingText}>Загрузка напоминаний...</Text>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={['#0a0a0a', '#1a1a1a', '#2a2a2a']}
      style={styles.container}
    >
      {/* Вкладки в стиле CalendarScreen */}
      <LinearGradient
        colors={['rgba(26, 26, 26, 0.95)', 'rgba(35, 35, 35, 0.9)']}
        style={styles.tabsContainer}
      >
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'all' && styles.activeTab]}
          onPress={() => setActiveTab('all')}
        >
          <LinearGradient
            colors={activeTab === 'all' ? ['#FFD700', '#FFA500'] : ['transparent', 'transparent']}
            style={styles.tabGradient}
          >
            <Text style={[styles.tabText, activeTab === 'all' && styles.activeTabText]}>
              Все
            </Text>
          </LinearGradient>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'upcoming' && styles.activeTab]}
          onPress={() => setActiveTab('upcoming')}
        >
          <LinearGradient
            colors={activeTab === 'upcoming' ? ['#FFD700', '#FFA500'] : ['transparent', 'transparent']}
            style={styles.tabGradient}
          >
            <Text style={[styles.tabText, activeTab === 'upcoming' && styles.activeTabText]}>
              Предстоящие
            </Text>
          </LinearGradient>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'past' && styles.activeTab]}
          onPress={() => setActiveTab('past')}
        >
          <LinearGradient
            colors={activeTab === 'past' ? ['#FFD700', '#FFA500'] : ['transparent', 'transparent']}
            style={styles.tabGradient}
          >
            <Text style={[styles.tabText, activeTab === 'past' && styles.activeTabText]}>
              Прошедшие
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </LinearGradient>

      {/* Статистика */}
      <View style={styles.statsContainer}>
        <LinearGradient
          colors={['rgba(42, 42, 42, 0.8)', 'rgba(35, 35, 35, 0.7)']}
          style={styles.statsCard}
        >
          <View style={styles.statItem}>
            <Ionicons name="list" size={getResponsiveSize(20)} color="#FFD700" />
            <Text style={styles.statValue}>{filteredReminders.length}</Text>
            <Text style={styles.statLabel}>Всего</Text>
          </View>
          
          <View style={styles.statDivider} />
          
          <View style={styles.statItem}>
            <Ionicons name="calendar" size={getResponsiveSize(20)} color="#FFA500" />
            <Text style={styles.statValue}>{monthKeys.length}</Text>
            <Text style={styles.statLabel}>Месяцев</Text>
          </View>
        </LinearGradient>
      </View>

      {/* Список напоминаний с группировкой по месяцам */}
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={loadReminders}
            colors={['#FFD700']}
            tintColor="#FFD700"
            title="Обновление..."
            titleColor="#FFD700"
          />
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={monthKeys.length === 0 && { flex: 1 }}
        style={styles.scrollView}
      >
        {monthKeys.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="notifications-off" size={getResponsiveSize(64)} color="#555" />
            <Text style={styles.emptyText}>Нет напоминаний</Text>
            {userRole === 'admin' && (
              <Text style={styles.emptySubText}>
                Нажмите "+" чтобы создать первое напоминание
              </Text>
            )}
          </View>
        ) : (
          monthKeys.map(monthKey => (
            <View key={monthKey} style={styles.monthSection}>
              <View style={styles.monthHeader}>
                <LinearGradient
                  colors={['rgba(255, 215, 0, 0.2)', 'rgba(255, 165, 0, 0.2)']}
                  style={styles.monthTitleContainer}
                >
                  <Text style={styles.monthTitle}>{monthKey}</Text>
                </LinearGradient>
                <Text style={styles.monthCount}>
                  {groupedReminders[monthKey].length} событий
                </Text>
              </View>
              
              {groupedReminders[monthKey].map((reminder, index) => (
                <View key={reminder.id}>
                  {renderReminderItem(reminder)}
                  {index < groupedReminders[monthKey].length - 1 && (
                    <View style={styles.itemDivider} />
                  )}
                </View>
              ))}
            </View>
          ))
        )}
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: getResponsiveFontSize(16),
    color: '#E0E0E0',
    marginTop: getResponsiveSize(16),
    fontWeight: '500',
  },
  scrollView: {
    flex: 1,
  },
  // Стили для вкладок
  tabsContainer: {
    flexDirection: 'row',
    marginHorizontal: getResponsiveSize(15),
    marginTop: getResponsiveSize(15),
    borderRadius: getResponsiveSize(15),
    padding: getResponsiveSize(4),
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.2)',
  },
  tab: {
    flex: 1,
    borderRadius: getResponsiveSize(12),
    overflow: 'hidden',
  },
  tabGradient: {
    paddingVertical: getResponsiveSize(10),
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeTab: {
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 10,
    elevation: 8,
  },
  tabText: {
    fontSize: getResponsiveFontSize(14),
    color: '#888',
    fontWeight: '600',
  },
  activeTabText: {
    color: '#1a1a1a',
    fontWeight: 'bold',
  },
  // Статистика
  statsContainer: {
    paddingHorizontal: getResponsiveSize(15),
    paddingVertical: getResponsiveSize(15),
  },
  statsCard: {
    flexDirection: 'row',
    borderRadius: getResponsiveSize(16),
    padding: getResponsiveSize(16),
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.2)',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: getResponsiveFontSize(20),
    fontWeight: '800',
    color: '#E0E0E0',
    marginTop: getResponsiveSize(8),
  },
  statLabel: {
    fontSize: getResponsiveFontSize(10),
    color: '#999',
    fontWeight: '600',
    marginTop: getResponsiveSize(4),
  },
  statDivider: {
    width: 1,
    height: '100%',
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    marginHorizontal: getResponsiveSize(8),
  },
  // Секции по месяцам
  monthSection: {
    marginTop: getResponsiveSize(20),
    marginHorizontal: getResponsiveSize(15),
  },
  monthHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: getResponsiveSize(12),
  },
  monthTitleContainer: {
    paddingHorizontal: getResponsiveSize(12),
    paddingVertical: getResponsiveSize(6),
    borderRadius: getResponsiveSize(20),
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
  },
  monthTitle: {
    fontSize: getResponsiveFontSize(16),
    color: '#FFD700',
    fontWeight: 'bold',
  },
  monthCount: {
    fontSize: getResponsiveFontSize(14),
    color: '#888',
    fontWeight: '600',
  },
  // Элементы напоминаний
  reminderItem: {
    marginBottom: getResponsiveSize(8),
    borderRadius: getResponsiveSize(16),
    overflow: 'hidden',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  reminderGradient: {
    padding: getResponsiveSize(16),
    borderRadius: getResponsiveSize(16),
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.2)',
  },
  reminderHeader: {
    flexDirection: 'row',
  },
  dateContainer: {
    marginRight: getResponsiveSize(12),
  },
  dateBadge: {
    width: getResponsiveSize(60),
    height: getResponsiveSize(60),
    borderRadius: getResponsiveSize(12),
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 3,
  },
  dayText: {
    fontSize: getResponsiveFontSize(18),
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  monthText: {
    fontSize: getResponsiveFontSize(12),
    color: '#1a1a1a',
    textTransform: 'lowercase',
    fontWeight: '600',
  },
  reminderContent: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: getResponsiveSize(8),
  },
  typeIconContainer: {
    width: getResponsiveSize(28),
    height: getResponsiveSize(28),
    borderRadius: getResponsiveSize(14),
    backgroundColor: 'rgba(42, 42, 42, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: getResponsiveSize(8),
  },
  reminderTitle: {
    fontSize: getResponsiveFontSize(16),
    fontWeight: 'bold',
    color: '#E0E0E0',
    flex: 1,
  },
  reminderMessage: {
    fontSize: getResponsiveFontSize(14),
    color: '#999',
    marginBottom: getResponsiveSize(8),
    lineHeight: getResponsiveFontSize(18),
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeText: {
    fontSize: getResponsiveFontSize(13),
    color: '#FFD700',
    marginLeft: getResponsiveSize(6),
    fontWeight: '600',
  },
  itemDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    marginVertical: getResponsiveSize(8),
  },
  inactiveOverlay: {
    position: 'absolute',
    top: getResponsiveSize(8),
    right: getResponsiveSize(8),
  },
  inactiveBadge: {
    paddingHorizontal: getResponsiveSize(8),
    paddingVertical: getResponsiveSize(4),
    borderRadius: getResponsiveSize(6),
    shadowColor: '#FFC107',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 2,
  },
  inactiveText: {
    fontSize: getResponsiveFontSize(10),
    color: '#1a1a1a',
    fontWeight: 'bold',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: getResponsiveSize(100),
    paddingHorizontal: getResponsiveSize(40),
  },
  emptyText: {
    fontSize: getResponsiveFontSize(18),
    color: '#888',
    marginTop: getResponsiveSize(16),
    fontWeight: '600',
    textAlign: 'center',
  },
  emptySubText: {
    fontSize: getResponsiveFontSize(14),
    color: '#666',
    marginTop: getResponsiveSize(8),
    textAlign: 'center',
    lineHeight: getResponsiveFontSize(20),
  },
});