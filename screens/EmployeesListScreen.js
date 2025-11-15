import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { collection, doc, getDocs, orderBy, query, updateDoc } from 'firebase/firestore';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { auth, db } from '../firebaseConfig';

const EmployeeItem = React.memo(({ item, onStatusChange }) => {
  const statusInfo = useMemo(() => {
    const statuses = {
      'working': { label: '💼 Работаю', color: '#4CAF50' },
      'sick': { label: '🤒 Больничный', color: '#FF9800' },
      'vacation': { label: '🏖️ Отпуск', color: '#2196F3' },
      'dayoff': { label: '🏠 Отгул', color: '#9C27B0' },
      'unpaid': { label: '💰 Без содержания', color: '#F44336' }
    };
    return statuses[item.status] || { label: '❓ Неизвестно', color: '#9E9E9E' };
  }, [item.status]);

  const handlePress = useCallback(() => {
    onStatusChange(item.id, item.status);
  }, [item.id, item.status, onStatusChange]);

  return (
    <View style={styles.employeeCard}>
      <View style={styles.employeeHeader}>
        <View style={styles.employeeInfo}>
          <Text style={styles.employeeName}>
            {item.fullName || 'Без имени'}
          </Text>
          {item.position && (
            <Text style={styles.employeePosition}>
              {item.position}
            </Text>
          )}
          <Text style={styles.employeeEmail}>
            {item.email || 'Нет email'}
          </Text>
        </View>
       
        <View style={styles.statusSection}>
          <View style={styles.statusBadge}>
            <View 
              style={[
                styles.statusDot,
                { backgroundColor: statusInfo.color }
              ]} 
            />
            <Text style={styles.statusText}>
              {statusInfo.label}
            </Text>
          </View>
         
          <TouchableOpacity
            style={styles.statusBadgeTouchable}
            onPress={handlePress}
          >
            <Ionicons name="pencil-outline" size={16} color="#DAA520" />
          </TouchableOpacity>
        </View>
      </View>
     
      {(item.startDate || item.endDate) && (
        <View style={styles.dateInfo}>
          <Ionicons name="calendar-outline" size={14} color="#8B8B8B" />
          <Text style={styles.dateText}>
            {item.startDate && `с ${new Date(item.startDate).toLocaleDateString('ru-RU')}`}
            {item.startDate && item.endDate && ' '}
            {item.endDate && `по ${new Date(item.endDate).toLocaleDateString('ru-RU')}`}
          </Text>
        </View>
      )}
     
      {item.lastUpdated && (
        <Text style={styles.lastUpdated}>
          Обновлено: {new Date(item.lastUpdated.toDate()).toLocaleString('ru-RU', {
            day: 'numeric',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit'
          })}
        </Text>
      )}
    </View>
  );
});

export default function EmployeesListScreen({ navigation, route }) {
  const { userRole } = route.params || {};
 
  const [employees, setEmployees] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
 
  useEffect(() => {
    loadEmployees();
  }, []);
 
  const loadEmployees = async () => {
    try {
      console.log('👥 Загрузка сотрудников...');
     
      if (!auth.currentUser) {
        console.log('❌ Пользователь НЕ авторизован');
        Alert.alert('Ошибка', 'Пользователь не авторизован');
        setEmployees([]);
        setLoading(false);
        setRefreshing(false);
        return;
      }
     
      console.log('✅ Пользователь авторизован:', auth.currentUser.email);
      setLoading(true);
     
      // Добавляем orderBy для серверной сортировки (ускоряет, если индекс создан)
      const employeesQuery = query(
        collection(db, 'employees'), 
        orderBy('fullName')
      );
     
      const snapshot = await getDocs(employeesQuery);
     
      console.log('📥 Получено сотрудников:', snapshot.size);
     
      const employeesData = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        employeesData.push({ id: doc.id, ...data });
      });
     
      // Убираем клиентскую сортировку, т.к. теперь на сервере
     
      console.log(`✅ Загружено ${employeesData.length} сотрудников`);
      setEmployees(employeesData);
      setLoading(false);
      setRefreshing(false);
     
    } catch (error) {
      console.error('❌ Ошибка загрузки сотрудников:', error);
      Alert.alert('Ошибка', `Не удалось загрузить список сотрудников: ${error.message}`);
      setEmployees([]);
      setLoading(false);
      setRefreshing(false);
    }
  };
 
  const onRefresh = useCallback(() => {
    console.log('🔄 Обновление списка сотрудников...');
    setRefreshing(true);
    loadEmployees();
  }, []);
 
  const handleStatusChange = useCallback(async (employeeId, currentStatus) => {
    const statuses = [
      { value: 'working', label: '💼 Работаю', color: '#4CAF50' },
      { value: 'sick', label: '🤒 Больничный', color: '#FF9800' },
      { value: 'vacation', label: '🏖️ Отпуск', color: '#2196F3' },
      { value: 'dayoff', label: '🏠 Отгул', color: '#9C27B0' },
      { value: 'unpaid', label: '💰 Без содержания', color: '#F44336' }
    ];
    Alert.alert(
      'Изменить статус',
      'Выберите новый статус:',
      [
        ...statuses.map(status => ({
          text: status.label,
          onPress: async () => {
            try {
              await updateDoc(doc(db, 'employees', employeeId), {
                status: status.value,
                lastUpdated: new Date()
              });
              Alert.alert('Успех', 'Статус обновлен');
              loadEmployees(); // Перезагружаем для обновления
            } catch (error) {
              console.error('Ошибка обновления статуса:', error);
              Alert.alert('Ошибка', 'Не удалось обновить статус');
            }
          }
        })),
        { text: 'Отмена', style: 'cancel' }
      ]
    );
  }, []);
 
  // Оптимизированная фильтрация и статистика с useMemo
  const { filteredEmployees, stats } = useMemo(() => {
    const total = employees.length;
    const working = employees.filter(e => e.status === 'working').length;
    const sick = employees.filter(e => e.status === 'sick').length;
    const vacation = employees.filter(e => e.status === 'vacation').length;
    const dayoff = employees.filter(e => e.status === 'dayoff').length;
    const unpaid = employees.filter(e => e.status === 'unpaid').length;

    const statsObj = { total, working, sick, vacation, dayoff, unpaid };

    const filtered = employees.filter(emp => {
      const searchMatch = !searchQuery || 
        (emp.fullName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (emp.position || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (emp.email || '').toLowerCase().includes(searchQuery.toLowerCase());
      if (filter === 'all') return searchMatch;
      return searchMatch && emp.status === filter;
    });

    return { filteredEmployees: filtered, stats: statsObj };
  }, [employees, filter, searchQuery]);
 
  const renderEmployee = useCallback(({ item }) => (
    <EmployeeItem item={item} onStatusChange={handleStatusChange} />
  ), [handleStatusChange]);
 
  const getStatusLabel = useCallback((status) => {
    const labels = {
      'working': '💼 Работают',
      'sick': '🤒 Больничный',
      'vacation': '🏖️ Отпуск',
      'dayoff': '🏠 Отгул',
      'unpaid': '💰 Без содержания'
    };
    return labels[status] || 'Неизвестно';
  }, []);
 
  return (
    <LinearGradient
      colors={['#FFF8E1', '#FFE4B5', '#FFD700']}
      style={styles.container}
    >
      <LinearGradient
        colors={['rgba(255, 248, 225, 0.95)', 'rgba(255, 228, 181, 0.9)']}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={22} color="#3E2723" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>👥 Список артистов</Text>
          <View style={styles.headerSpacer} />
        </View>
      </LinearGradient>
 
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={18} color="#8B8B8B" />
        <TextInput
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Поиск по ФИО, должности или email..."
          placeholderTextColor="#8B8B8B"
        />
      </View>
 
      <View style={styles.filtersContainer}>
        <Text style={styles.filtersTitle}>Фильтр по статусу:</Text>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.filtersScroll}
        >
          <View style={styles.filtersRow}>
            <TouchableOpacity
              style={[
                styles.filterChip,
                filter === 'all' && styles.filterChipActive
              ]}
              onPress={() => setFilter('all')}
            >
              <Text style={[
                styles.filterChipText,
                filter === 'all' && styles.filterChipTextActive
              ]}>
                Все ({stats.total})
              </Text>
            </TouchableOpacity>
           
            <TouchableOpacity
              style={[
                styles.filterChip,
                filter === 'working' && styles.filterChipActive,
                filter === 'working' && { borderColor: '#4CAF50' }
              ]}
              onPress={() => setFilter('working')}
            >
              <View style={[styles.filterDot, { backgroundColor: '#4CAF50' }]} />
              <Text style={[
                styles.filterChipText,
                filter === 'working' && styles.filterChipTextActive
              ]}>
                {getStatusLabel('working')} ({stats.working})
              </Text>
            </TouchableOpacity>
           
            <TouchableOpacity
              style={[
                styles.filterChip,
                filter === 'sick' && styles.filterChipActive,
                filter === 'sick' && { borderColor: '#FF9800' }
              ]}
              onPress={() => setFilter('sick')}
            >
              <View style={[styles.filterDot, { backgroundColor: '#FF9800' }]} />
              <Text style={[
                styles.filterChipText,
                filter === 'sick' && styles.filterChipTextActive
              ]}>
                {getStatusLabel('sick')} ({stats.sick})
              </Text>
            </TouchableOpacity>
           
            <TouchableOpacity
              style={[
                styles.filterChip,
                filter === 'vacation' && styles.filterChipActive,
                filter === 'vacation' && { borderColor: '#2196F3' }
              ]}
              onPress={() => setFilter('vacation')}
            >
              <View style={[styles.filterDot, { backgroundColor: '#2196F3' }]} />
              <Text style={[
                styles.filterChipText,
                filter === 'vacation' && styles.filterChipTextActive
              ]}>
                {getStatusLabel('vacation')} ({stats.vacation})
              </Text>
            </TouchableOpacity>
           
            <TouchableOpacity
              style={[
                styles.filterChip,
                filter === 'dayoff' && styles.filterChipActive,
                filter === 'dayoff' && { borderColor: '#9C27B0' }
              ]}
              onPress={() => setFilter('dayoff')}
            >
              <View style={[styles.filterDot, { backgroundColor: '#9C27B0' }]} />
              <Text style={[
                styles.filterChipText,
                filter === 'dayoff' && styles.filterChipTextActive
              ]}>
                {getStatusLabel('dayoff')} ({stats.dayoff})
              </Text>
            </TouchableOpacity>
           
            <TouchableOpacity
              style={[
                styles.filterChip,
                filter === 'unpaid' && styles.filterChipActive,
                filter === 'unpaid' && { borderColor: '#F44336' }
              ]}
              onPress={() => setFilter('unpaid')}
            >
              <View style={[styles.filterDot, { backgroundColor: '#F44336' }]} />
              <Text style={[
                styles.filterChipText,
                filter === 'unpaid' && styles.filterChipTextActive
              ]}>
                {getStatusLabel('unpaid')} ({stats.unpaid})
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
 
      <View style={styles.statsContainer}>
        <Text style={styles.statsTitle}>Статистика:</Text>
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <View style={[styles.statDot, { backgroundColor: '#4CAF50' }]} />
            <Text style={styles.statText}>{stats.working}</Text>
          </View>
          <View style={styles.statItem}>
            <View style={[styles.statDot, { backgroundColor: '#FF9800' }]} />
            <Text style={styles.statText}>{stats.sick}</Text>
          </View>
          <View style={styles.statItem}>
            <View style={[styles.statDot, { backgroundColor: '#2196F3' }]} />
            <Text style={styles.statText}>{stats.vacation}</Text>
          </View>
          <View style={styles.statItem}>
            <View style={[styles.statDot, { backgroundColor: '#9C27B0' }]} />
            <Text style={styles.statText}>{stats.dayoff}</Text>
          </View>
          <View style={styles.statItem}>
            <View style={[styles.statDot, { backgroundColor: '#F44336' }]} />
            <Text style={styles.statText}>{stats.unpaid}</Text>
          </View>
        </View>
      </View>
 
      <View style={styles.filterInfo}>
        <Text style={styles.filterInfoText}>
          Показано: {filteredEmployees.length} из {employees.length} сотрудников
          {filter !== 'all' && ` • Фильтр: ${getStatusLabel(filter)}`}
          {searchQuery && ` • Поиск: "${searchQuery}"`}
        </Text>
      </View>
 
      <FlatList
        data={filteredEmployees}
        renderItem={renderEmployee}
        keyExtractor={(item) => item.id} // Стабильный ключ
        style={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#DAA520']}
            tintColor="#DAA520"
          />
        }
        // Оптимизации FlatList (2025 best practices)
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={10}
        removeClippedSubviews={true}
        getItemLayout={(data, index) => ({
          length: 120, // Примерная высота элемента, подгоните под ваш дизайн
          offset: 120 * index,
          index,
        })}
        ListEmptyComponent={
          loading ? (
            <View style={styles.loadingContainer}>
              <Ionicons name="people" size={40} color="#DAA520" />
              <Text style={styles.loadingText}>Загрузка сотрудников...</Text>
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="people-outline" size={40} color="#DAA520" />
              <Text style={styles.emptyStateText}>
                {employees.length === 0 
                  ? 'Сотрудников нет' 
                  : 'Нет сотрудников по выбранному фильтру'
                }
              </Text>
              {(searchQuery || filter !== 'all') && (
                <TouchableOpacity 
                  style={styles.clearFiltersButton}
                  onPress={() => {
                    setSearchQuery('');
                    setFilter('all');
                  }}
                >
                  <Text style={styles.clearFiltersText}>Очистить фильтры</Text>
                </TouchableOpacity>
              )}
            </View>
          )
        }
      />
    </LinearGradient>
  );
}
 
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 12,
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
    shadowColor: '#8B6B4F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#3E2723',
    textAlign: 'center',
  },
  headerSpacer: {
    width: 22,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    margin: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 13,
    color: '#3E2723',
  },
  filtersContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    marginHorizontal: 12,
    marginBottom: 8,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(218, 165, 32, 0.3)',
  },
  filtersTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#3E2723',
    marginBottom: 8,
  },
  filtersScroll: {
    maxHeight: 50,
  },
  filtersRow: {
    flexDirection: 'row',
    gap: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    minHeight: 32,
  },
  filterChipActive: {
    backgroundColor: '#FFF8E1',
    borderWidth: 2,
  },
  filterDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  filterChipText: {
    fontSize: 11,
    color: '#666',
    fontWeight: '500',
  },
  filterChipTextActive: {
    color: '#3E2723',
    fontWeight: '600',
  },
  statsContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    marginHorizontal: 12,
    marginBottom: 8,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(218, 165, 32, 0.3)',
  },
  statsTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#3E2723',
    marginBottom: 8,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 4,
  },
  statText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#3E2723',
  },
  filterInfo: {
    backgroundColor: 'rgba(255, 248, 225, 0.9)',
    marginHorizontal: 12,
    marginBottom: 8,
    padding: 8,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#DAA520',
  },
  filterInfoText: {
    fontSize: 11,
    color: '#3E2723',
    textAlign: 'center',
    fontWeight: '500',
  },
  list: {
    flex: 1,
    paddingHorizontal: 12,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 14,
    color: '#3E2723',
    marginTop: 10,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 13,
    color: '#8B8B8B',
    marginTop: 8,
    textAlign: 'center',
  },
  clearFiltersButton: {
    marginTop: 12,
    backgroundColor: '#DAA520',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  clearFiltersText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  employeeCard: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    shadowColor: '#8B6B4F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  employeeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  employeeInfo: {
    flex: 1,
  },
  employeeName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#3E2723',
    marginBottom: 3,
  },
  employeePosition: {
    fontSize: 12,
    color: '#DAA520',
    fontWeight: '600',
    marginBottom: 2,
  },
  employeeEmail: {
    fontSize: 11,
    color: '#8B8B8B',
  },
  statusSection: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 6,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    marginRight: 5,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#3E2723',
  },
  statusBadgeTouchable: {
    padding: 3,
    marginTop: -3,
  },
  dateInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    padding: 8,
    backgroundColor: '#FFF8E1',
    borderRadius: 6,
    borderLeftWidth: 3,
    borderLeftColor: '#FFD700',
  },
  dateText: {
    fontSize: 11,
    color: '#3E2723',
    marginLeft: 6,
    fontWeight: '500',
  },
  lastUpdated: {
    fontSize: 9,
    color: '#8B8B8B',
    textAlign: 'right',
  },
});