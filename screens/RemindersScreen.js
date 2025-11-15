// screens/RemindersScreen.js
import { Ionicons } from '@expo/vector-icons';
import { collection, deleteDoc, doc, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import {
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { db } from '../firebaseConfig';

export default function RemindersScreen({ navigation, route }) {
  const { userRole } = route.params;
  const [reminders, setReminders] = useState([]);
  const [filteredReminders, setFilteredReminders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'upcoming', 'past'

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
        // Для админов - все напоминания
        remindersQuery = query(
          collection(db, 'reminders'), 
          orderBy('eventDate', 'asc')
        );
      } else {
        // Для пользователей - только активные напоминания
        // Индекс создан - запрос будет работать быстро
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

  // Группировка напоминаний по месяцам
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
      <View style={styles.reminderHeader}>
        <View style={styles.dateContainer}>
          <Text style={styles.dayText}>
            {formatEventDate(reminder.eventDate).split(' ')[0]}
          </Text>
          <Text style={styles.monthText}>
            {formatEventDate(reminder.eventDate).split(' ')[1]}
          </Text>
        </View>
        
        <View style={styles.reminderContent}>
          <View style={styles.titleRow}>
            <Ionicons 
              name={getTypeIcon(reminder.type)} 
              size={16} 
              color={getTypeColor(reminder.type)} 
            />
            <Text style={styles.reminderTitle}>{reminder.title}</Text>
          </View>
          
          <Text style={styles.reminderMessage} numberOfLines={2}>
            {reminder.message}
          </Text>
          
          <View style={styles.timeContainer}>
            <Ionicons name="time" size={14} color="#666" />
            <Text style={styles.timeText}>
              {formatEventTime(reminder.eventDate)}
            </Text>
          </View>
        </View>
      </View>
      
      {!reminder.isActive && (
        <View style={styles.inactiveOverlay}>
          <Text style={styles.inactiveText}>Неактивно</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  const groupedReminders = groupRemindersByMonth();
  const monthKeys = Object.keys(groupedReminders);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Ionicons name="musical-notes" size={48} color="#FFD700" />
        <Text style={styles.loadingText}>Загрузка напоминаний...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Вкладки */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'all' && styles.activeTab]}
          onPress={() => setActiveTab('all')}
        >
          <Text style={[styles.tabText, activeTab === 'all' && styles.activeTabText]}>
            Все
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'upcoming' && styles.activeTab]}
          onPress={() => setActiveTab('upcoming')}
        >
          <Text style={[styles.tabText, activeTab === 'upcoming' && styles.activeTabText]}>
            Предстоящие
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'past' && styles.activeTab]}
          onPress={() => setActiveTab('past')}
        >
          <Text style={[styles.tabText, activeTab === 'past' && styles.activeTabText]}>
            Прошедшие
          </Text>
        </TouchableOpacity>
      </View>

      {/* Статистика */}
      <View style={styles.statsContainer}>
        <Text style={styles.statsText}>
          Всего: {filteredReminders.length}
        </Text>
        <Text style={styles.statsText}>
          Месяцев: {monthKeys.length}
        </Text>
      </View>

      <View style={styles.divider} />

      {/* Список напоминаний с группировкой по месяцам */}
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={loadReminders}
            colors={['#FFD700']}
            tintColor="#FFD700"
          />
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={monthKeys.length === 0 && { flex: 1 }}
      >
        {monthKeys.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="notifications-off" size={64} color="#CCCCCC" />
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
                <Text style={styles.monthTitle}>{monthKey}</Text>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF8E1',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF8E1',
  },
  loadingText: {
    fontSize: 16,
    color: '#3E2723',
    marginTop: 16,
    fontWeight: '500',
  },
  // Стили для вкладок
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 8,
    padding: 4,
    shadowColor: '#8B6B4F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
  },
  activeTab: {
    backgroundColor: '#FFD700',
  },
  tabText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  activeTabText: {
    color: '#3E2723',
    fontWeight: 'bold',
  },
  // Статистика
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  statsText: {
    fontSize: 14,
    color: '#3E2723',
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: '#E0E0E0',
    marginHorizontal: 16,
  },
  // Секции по месяцам
  monthSection: {
    marginTop: 16,
  },
  monthHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  monthTitle: {
    fontSize: 16,
    color: '#3E2723',
    fontWeight: 'bold',
  },
  monthCount: {
    fontSize: 14,
    color: '#666',
  },
  // Элементы напоминаний
  reminderItem: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 8,
    shadowColor: '#8B6B4F',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    position: 'relative',
  },
  reminderHeader: {
    flexDirection: 'row',
  },
  dateContainer: {
    alignItems: 'center',
    marginRight: 12,
    minWidth: 50,
  },
  dayText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#3E2723',
  },
  monthText: {
    fontSize: 14,
    color: '#666',
    textTransform: 'lowercase',
  },
  reminderContent: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  reminderTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#3E2723',
    marginLeft: 6,
    flex: 1,
  },
  reminderMessage: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    lineHeight: 18,
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeText: {
    fontSize: 13,
    color: '#666',
    marginLeft: 4,
  },
  itemDivider: {
    height: 1,
    backgroundColor: '#F0F0F0',
    marginHorizontal: 16,
    marginVertical: 8,
  },
  inactiveOverlay: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(255, 193, 7, 0.9)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  inactiveText: {
    fontSize: 10,
    color: '#3E2723',
    fontWeight: 'bold',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 100,
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 18,
    color: '#999',
    marginTop: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  emptySubText: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 20,
  },
});