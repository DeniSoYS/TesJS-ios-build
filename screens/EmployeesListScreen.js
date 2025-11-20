import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { collection, deleteDoc, doc, getDocs, orderBy, query, updateDoc } from 'firebase/firestore';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Dimensions,
  FlatList,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { auth, db } from '../firebaseConfig';

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

const EmployeeItem = React.memo(({ item, onStatusChange, onEdit, onDelete }) => {
  const statusInfo = useMemo(() => {
    const statuses = {
      'working': { label: '💼 Работаю', color: '#34C759', gradient: ['#34C759', '#28A745'] },
      'sick': { label: '🤒 Больничный', color: '#FFA500', gradient: ['#FFA500', '#FF8C00'] },
      'vacation': { label: '🏖️ Отпуск', color: '#4A90E2', gradient: ['#4A90E2', '#357ABD'] },
      'dayoff': { label: '🏠 Отгул', color: '#9B59B6', gradient: ['#9B59B6', '#8E44AD'] },
      'unpaid': { label: '💰 Без содержания', color: '#FF6B6B', gradient: ['#FF6B6B', '#EE5A52'] }
    };
    return statuses[item.status] || { label: '❓ Неизвестно', color: '#8E8E93', gradient: ['#8E8E93', '#636366'] };
  }, [item.status]);

  const handlePress = useCallback(() => {
    onStatusChange(item.id, item.status);
  }, [item.id, item.status, onStatusChange]);

  const handleEditPress = useCallback(() => {
    onEdit(item);
  }, [item, onEdit]);

  const handleDeletePress = useCallback(() => {
    onDelete(item);
  }, [item, onDelete]);

  return (
    <View style={styles.employeeCard}>
      <LinearGradient
        colors={['rgba(42, 42, 42, 0.9)', 'rgba(35, 35, 35, 0.8)']}
        style={styles.employeeGradient}
      >
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
         
          <View style={styles.actionsSection}>
            <TouchableOpacity
              style={styles.editButton}
              onPress={handleEditPress}
            >
              <LinearGradient
                colors={['#FFD700', '#FFA500']}
                style={styles.editButtonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Ionicons name="pencil" size={getResponsiveSize(14)} color="#1a1a1a" />
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.deleteButton}
              onPress={handleDeletePress}
            >
              <LinearGradient
                colors={['#FF6B6B', '#EE5A52']}
                style={styles.deleteButtonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Ionicons name="trash-outline" size={getResponsiveSize(14)} color="#FFFFFF" />
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.statusButton}
              onPress={handlePress}
            >
              <LinearGradient
                colors={statusInfo.gradient}
                style={styles.statusBadge}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={styles.statusContent}>
                  <View 
                    style={[
                      styles.statusDot,
                      { backgroundColor: '#FFFFFF' }
                    ]} 
                  />
                  <Text style={styles.statusText}>
                    {statusInfo.label}
                  </Text>
                  <Ionicons name="chevron-down" size={getResponsiveSize(14)} color="#FFFFFF" />
                </View>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
       
        {(item.startDate || item.endDate) && (
          <View style={styles.dateInfo}>
            <Ionicons name="calendar-outline" size={getResponsiveSize(14)} color="#FFD700" />
            <Text style={styles.dateText}>
              {item.startDate && `с ${new Date(item.startDate).toLocaleDateString('ru-RU')}`}
              {item.startDate && item.endDate && ' '}
              {item.endDate && `по ${new Date(item.endDate).toLocaleDateString('ru-RU')}`}
            </Text>
          </View>
        )}
       
        {item.lastUpdated && (
          <View style={styles.lastUpdatedContainer}>
            <Ionicons name="time-outline" size={getResponsiveSize(12)} color="#888" />
            <Text style={styles.lastUpdated}>
              Обновлено: {new Date(item.lastUpdated.toDate()).toLocaleString('ru-RU', {
                day: 'numeric',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </Text>
          </View>
        )}
      </LinearGradient>
    </View>
  );
});

const EditEmployeeModal = ({ 
  visible, 
  employee, 
  onClose, 
  onSave,
  onDelete 
}) => {
  const [formData, setFormData] = useState({
    fullName: '',
    position: '',
    email: '',
    status: 'working',
    startDate: '',
    endDate: ''
  });

  useEffect(() => {
    if (employee) {
      setFormData({
        fullName: employee.fullName || '',
        position: employee.position || '',
        email: employee.email || '',
        status: employee.status || 'working',
        startDate: employee.startDate || '',
        endDate: employee.endDate || ''
      });
    }
  }, [employee]);

  const handleSave = () => {
    if (!formData.fullName.trim()) {
      Alert.alert('Ошибка', 'Поле "ФИО" обязательно для заполнения');
      return;
    }
    onSave(employee.id, formData);
  };

  const handleDelete = () => {
    if (employee) {
      Alert.alert(
        'Удаление артиста',
        `Вы уверены, что хотите удалить ${employee.fullName}?`,
        [
          { text: 'Отмена', style: 'cancel' },
          { 
            text: 'Удалить', 
            style: 'destructive',
            onPress: () => {
              onDelete(employee.id);
              onClose();
            }
          }
        ]
      );
    }
  };

  const statusOptions = [
    { value: 'working', label: '💼 Работаю', gradient: ['#34C759', '#28A745'] },
    { value: 'sick', label: '🤒 Больничный', gradient: ['#FFA500', '#FF8C00'] },
    { value: 'vacation', label: '🏖️ Отпуск', gradient: ['#4A90E2', '#357ABD'] },
    { value: 'dayoff', label: '🏠 Отгул', gradient: ['#9B59B6', '#8E44AD'] },
    { value: 'unpaid', label: '💰 Без содержания', gradient: ['#FF6B6B', '#EE5A52'] }
  ];

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <LinearGradient
            colors={['rgba(26, 26, 26, 0.98)', 'rgba(35, 35, 35, 0.95)']}
            style={styles.modalGradient}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>✏️ Редактирование</Text>
              <TouchableOpacity onPress={onClose} style={styles.modalCloseIcon}>
                <Ionicons name="close-circle" size={getResponsiveSize(30)} color="#FFD700" />
              </TouchableOpacity>
            </View>

            <ScrollView 
              style={styles.modalContent}
              showsVerticalScrollIndicator={true}
              scrollEventThrottle={16}
            >
              <View style={styles.inputGroup}>
                <Text style={styles.label}>ФИО *</Text>
                <TextInput
                  style={styles.textInput}
                  value={formData.fullName}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, fullName: text }))}
                  placeholder="Введите ФИО сотрудника"
                  placeholderTextColor="#888"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Должность</Text>
                <TextInput
                  style={styles.textInput}
                  value={formData.position}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, position: text }))}
                  placeholder="Введите должность"
                  placeholderTextColor="#888"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Email</Text>
                <TextInput
                  style={styles.textInput}
                  value={formData.email}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, email: text }))}
                  placeholder="Введите email"
                  placeholderTextColor="#888"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Статус</Text>
                <View style={styles.statusOptions}>
                  {statusOptions.map((option) => (
                    <TouchableOpacity
                      key={option.value}
                      style={styles.statusOption}
                      onPress={() => setFormData(prev => ({ ...prev, status: option.value }))}
                    >
                      <LinearGradient
                        colors={formData.status === option.value ? option.gradient : ['#2a2a2a', '#1f1f1f']}
                        style={[
                          styles.statusOptionGradient,
                          formData.status === option.value && styles.statusOptionActive
                        ]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                      >
                        <Text style={[
                          styles.statusOptionText,
                          formData.status === option.value && styles.statusOptionTextActive
                        ]}>
                          {option.label}
                        </Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.datesRow}>
                <View style={styles.dateInput}>
                  <Text style={styles.label}>Дата начала</Text>
                  <TextInput
                    style={styles.textInput}
                    value={formData.startDate}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, startDate: text }))}
                    placeholder="ГГГГ-ММ-ДД"
                    placeholderTextColor="#888"
                  />
                </View>

                <View style={styles.dateInput}>
                  <Text style={styles.label}>Дата окончания</Text>
                  <TextInput
                    style={styles.textInput}
                    value={formData.endDate}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, endDate: text }))}
                    placeholder="ГГГГ-ММ-ДД"
                    placeholderTextColor="#888"
                  />
                </View>
              </View>

              <Text style={styles.dateHint}>
                💡 Формат даты: ГГГГ-ММ-ДД (например: 2024-12-31)
              </Text>

              {/* Кнопка удаления в модальном окне */}
              {employee && (
                <TouchableOpacity 
                  style={styles.deleteEmployeeButton}
                  onPress={handleDelete}
                >
                  <LinearGradient
                    colors={['#FF6B6B', '#EE5A52']}
                    style={styles.deleteEmployeeButtonGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <Ionicons name="trash-outline" size={getResponsiveSize(18)} color="#FFFFFF" />
                    <Text style={styles.deleteEmployeeButtonText}>Удалить артиста</Text>
                  </LinearGradient>
                </TouchableOpacity>
              )}
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={styles.cancelButton}
                onPress={onClose}
              >
                <Text style={styles.cancelButtonText}>Отмена</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.saveButton}
                onPress={handleSave}
              >
                <LinearGradient
                  colors={['#FFD700', '#FFA500']}
                  style={styles.saveButtonGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Ionicons name="save" size={getResponsiveSize(18)} color="#1a1a1a" />
                  <Text style={styles.saveButtonText}>Сохранить</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </View>
      </View>
    </Modal>
  );
};

export default function EmployeesListScreen({ navigation, route }) {
  const { userRole } = route.params || {};
 
  const [employees, setEmployees] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
 
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
      { value: 'working', label: '💼 Работаю', gradient: ['#34C759', '#28A745'] },
      { value: 'sick', label: '🤒 Больничный', gradient: ['#FFA500', '#FF8C00'] },
      { value: 'vacation', label: '🏖️ Отпуск', gradient: ['#4A90E2', '#357ABD'] },
      { value: 'dayoff', label: '🏠 Отгул', gradient: ['#9B59B6', '#8E44AD'] },
      { value: 'unpaid', label: '💰 Без содержания', gradient: ['#FF6B6B', '#EE5A52'] }
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
              loadEmployees();
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
 
  const handleEditEmployee = useCallback((employee) => {
    setSelectedEmployee(employee);
    setEditModalVisible(true);
  }, []);

  const handleDeleteEmployee = useCallback((employee) => {
    Alert.alert(
      'Удаление артиста',
      `Вы уверены, что хотите удалить ${employee.fullName}?`,
      [
        { text: 'Отмена', style: 'cancel' },
        { 
          text: 'Удалить', 
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDoc(doc(db, 'employees', employee.id));
              Alert.alert('Успех', 'Артист удален');
              loadEmployees();
            } catch (error) {
              console.error('Ошибка удаления артиста:', error);
              Alert.alert('Ошибка', 'Не удалось удалить артиста');
            }
          }
        }
      ]
    );
  }, []);

  const handleSaveEmployee = useCallback(async (employeeId, formData) => {
    try {
      await updateDoc(doc(db, 'employees', employeeId), {
        ...formData,
        lastUpdated: new Date()
      });
      Alert.alert('Успех', 'Данные сотрудника обновлены');
      setEditModalVisible(false);
      setSelectedEmployee(null);
      loadEmployees();
    } catch (error) {
      console.error('Ошибка обновления сотрудника:', error);
      Alert.alert('Ошибка', 'Не удалось обновить данные сотрудника');
    }
  }, []);

  const handleDeleteFromModal = useCallback(async (employeeId) => {
    try {
      await deleteDoc(doc(db, 'employees', employeeId));
      Alert.alert('Успех', 'Артист удален');
      setEditModalVisible(false);
      setSelectedEmployee(null);
      loadEmployees();
    } catch (error) {
      console.error('Ошибка удаления артиста:', error);
      Alert.alert('Ошибка', 'Не удалось удалить артиста');
    }
  }, []);

  const handleCloseEditModal = useCallback(() => {
    setEditModalVisible(false);
    setSelectedEmployee(null);
  }, []);
 
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
    <EmployeeItem 
      item={item} 
      onStatusChange={handleStatusChange} 
      onEdit={handleEditEmployee}
      onDelete={handleDeleteEmployee}
    />
  ), [handleStatusChange, handleEditEmployee, handleDeleteEmployee]);
 
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

  const FilterChip = useCallback(({ status, count, isActive, onPress, gradient }) => (
    <TouchableOpacity onPress={onPress}>
      <LinearGradient
        colors={isActive ? gradient : ['#2a2a2a', '#1f1f1f']}
        style={[
          styles.filterChip,
          isActive && styles.filterChipActive
        ]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <Text style={[
          styles.filterChipText,
          isActive && styles.filterChipTextActive
        ]}>
          {getStatusLabel(status)} ({count})
        </Text>
      </LinearGradient>
    </TouchableOpacity>
  ), [getStatusLabel]);
 
  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#0a0a0a', '#1a1a1a', '#2a2a2a']}
        style={styles.background}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        {/* Хедер */}
        <LinearGradient
          colors={['rgba(26, 26, 26, 0.98)', 'rgba(35, 35, 35, 0.95)']}
          style={styles.header}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.headerContent}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={styles.backButton}
            >
              <Ionicons name="arrow-back" size={getResponsiveSize(24)} color="#FFD700" />
            </TouchableOpacity>
            
            <View style={styles.titleSection}>
              <View style={styles.titleIconContainer}>
                <LinearGradient
                  colors={['#FFD700', '#FFA500']}
                  style={styles.titleIconGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Ionicons name="people" size={getResponsiveSize(24)} color="#1a1a1a" />
                </LinearGradient>
              </View>
              <View style={styles.titleTextContainer}>
                <Text style={styles.mainTitle}>Список артистов</Text>
                <Text style={styles.subtitle}>Управление статусами</Text>
              </View>
            </View>

            <View style={styles.headerSpacer} />
          </View>
        </LinearGradient>

        <View style={styles.contentContainer}>
          {/* Поиск */}
          <View style={styles.searchContainer}>
            <LinearGradient
              colors={['rgba(42, 42, 42, 0.9)', 'rgba(35, 35, 35, 0.8)']}
              style={styles.searchGradient}
            >
              <Ionicons name="search" size={getResponsiveSize(20)} color="#FFD700" />
              <TextInput
                style={styles.searchInput}
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Поиск по ФИО, должности или email..."
                placeholderTextColor="#888"
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Ionicons name="close-circle" size={getResponsiveSize(20)} color="#888" />
                </TouchableOpacity>
              )}
            </LinearGradient>
          </View>

          {/* Статистика */}
          <View style={styles.statsContainer}>
            <LinearGradient
              colors={['rgba(42, 42, 42, 0.9)', 'rgba(35, 35, 35, 0.8)']}
              style={styles.statsGradient}
            >
              <View style={styles.statsHeader}>
                <View style={styles.statsTitleContainer}>
                  <Ionicons name="stats-chart" size={getResponsiveSize(18)} color="#FFD700" />
                  <Text style={styles.statsTitle}>Статистика команды</Text>
                </View>
                <Text style={styles.totalCount}>{stats.total} чел.</Text>
              </View>
              
              <View style={styles.statsGrid}>
                <View style={styles.statItem}>
                  <LinearGradient colors={['#34C759', '#28A745']} style={styles.statIcon}>
                    <Ionicons name="business" size={getResponsiveSize(16)} color="white" />
                  </LinearGradient>
                  <Text style={styles.statNumber}>{stats.working}</Text>
                  <Text style={styles.statLabel}>Работают</Text>
                </View>
                
                <View style={styles.statItem}>
                  <LinearGradient colors={['#FFA500', '#FF8C00']} style={styles.statIcon}>
                    <Ionicons name="medical" size={getResponsiveSize(16)} color="white" />
                  </LinearGradient>
                  <Text style={styles.statNumber}>{stats.sick}</Text>
                  <Text style={styles.statLabel}>Больничный</Text>
                </View>
                
                <View style={styles.statItem}>
                  <LinearGradient colors={['#4A90E2', '#357ABD']} style={styles.statIcon}>
                    <Ionicons name="airplane" size={getResponsiveSize(16)} color="white" />
                  </LinearGradient>
                  <Text style={styles.statNumber}>{stats.vacation}</Text>
                  <Text style={styles.statLabel}>Отпуск</Text>
                </View>
                
                <View style={styles.statItem}>
                  <LinearGradient colors={['#9B59B6', '#8E44AD']} style={styles.statIcon}>
                    <Ionicons name="home" size={getResponsiveSize(16)} color="white" />
                  </LinearGradient>
                  <Text style={styles.statNumber}>{stats.dayoff}</Text>
                  <Text style={styles.statLabel}>Отгул</Text>
                </View>
                
                <View style={styles.statItem}>
                  <LinearGradient colors={['#FF6B6B', '#EE5A52']} style={styles.statIcon}>
                    <Ionicons name="card" size={getResponsiveSize(16)} color="white" />
                  </LinearGradient>
                  <Text style={styles.statNumber}>{stats.unpaid}</Text>
                  <Text style={styles.statLabel}>Без содержания</Text>
                </View>
              </View>
            </LinearGradient>
          </View>

          {/* Фильтры */}
          <View style={styles.filtersContainer}>
            <LinearGradient
              colors={['rgba(42, 42, 42, 0.9)', 'rgba(35, 35, 35, 0.8)']}
              style={styles.filtersGradient}
            >
              <Text style={styles.filtersTitle}>Фильтр по статусу</Text>
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                style={styles.filtersScroll}
                contentContainerStyle={styles.filtersScrollContent}
              >
                <View style={styles.filtersRow}>
                  <FilterChip
                    status="all"
                    count={stats.total}
                    isActive={filter === 'all'}
                    onPress={() => setFilter('all')}
                    gradient={['#FFD700', '#FFA500']}
                  />
                  <FilterChip
                    status="working"
                    count={stats.working}
                    isActive={filter === 'working'}
                    onPress={() => setFilter('working')}
                    gradient={['#34C759', '#28A745']}
                  />
                  <FilterChip
                    status="sick"
                    count={stats.sick}
                    isActive={filter === 'sick'}
                    onPress={() => setFilter('sick')}
                    gradient={['#FFA500', '#FF8C00']}
                  />
                  <FilterChip
                    status="vacation"
                    count={stats.vacation}
                    isActive={filter === 'vacation'}
                    onPress={() => setFilter('vacation')}
                    gradient={['#4A90E2', '#357ABD']}
                  />
                  <FilterChip
                    status="dayoff"
                    count={stats.dayoff}
                    isActive={filter === 'dayoff'}
                    onPress={() => setFilter('dayoff')}
                    gradient={['#9B59B6', '#8E44AD']}
                  />
                  <FilterChip
                    status="unpaid"
                    count={stats.unpaid}
                    isActive={filter === 'unpaid'}
                    onPress={() => setFilter('unpaid')}
                    gradient={['#FF6B6B', '#EE5A52']}
                  />
                </View>
              </ScrollView>
            </LinearGradient>
          </View>

          {/* Информация о фильтрах */}
          {(filter !== 'all' || searchQuery) && (
            <View style={styles.filterInfo}>
              <LinearGradient
                colors={['rgba(255, 215, 0, 0.2)', 'rgba(255, 165, 0, 0.2)']}
                style={styles.filterInfoGradient}
              >
                <Ionicons name="information-circle" size={getResponsiveSize(16)} color="#FFD700" />
                <Text style={styles.filterInfoText}>
                  Показано: {filteredEmployees.length} из {employees.length} сотрудников
                  {filter !== 'all' && ` • Фильтр: ${getStatusLabel(filter)}`}
                  {searchQuery && ` • Поиск: "${searchQuery}"`}
                </Text>
                <TouchableOpacity 
                  onPress={() => {
                    setSearchQuery('');
                    setFilter('all');
                  }}
                >
                  <Ionicons name="close" size={getResponsiveSize(16)} color="#FFD700" />
                </TouchableOpacity>
              </LinearGradient>
            </View>
          )}

          {/* Список сотрудников */}
          <View style={styles.listContainer}>
            <FlatList
              data={filteredEmployees}
              renderItem={renderEmployee}
              keyExtractor={(item) => item.id}
              style={styles.list}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  colors={['#FFD700']}
                  tintColor="#FFD700"
                  title="Обновление..."
                  titleColor="#FFD700"
                />
              }
              initialNumToRender={10}
              maxToRenderPerBatch={10}
              windowSize={10}
              removeClippedSubviews={false}
              showsVerticalScrollIndicator={true}
              scrollEventThrottle={16}
              ListEmptyComponent={
                loading ? (
                  <View style={styles.loadingContainer}>
                    <Ionicons name="people" size={getResponsiveSize(48)} color="#FFD700" />
                    <Text style={styles.loadingText}>Загрузка сотрудников...</Text>
                  </View>
                ) : (
                  <View style={styles.emptyState}>
                    <Ionicons name="people-outline" size={getResponsiveSize(48)} color="#555" />
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
                        <LinearGradient
                          colors={['#FFD700', '#FFA500']}
                          style={styles.clearFiltersGradient}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                        >
                          <Text style={styles.clearFiltersText}>Очистить фильтры</Text>
                        </LinearGradient>
                      </TouchableOpacity>
                    )}
                  </View>
                )
              }
            />
          </View>
        </View>

        {/* Модальное окно редактирования сотрудника */}
        <EditEmployeeModal
          visible={editModalVisible}
          employee={selectedEmployee}
          onClose={handleCloseEditModal}
          onSave={handleSaveEmployee}
          onDelete={handleDeleteFromModal}
        />
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
  contentContainer: {
    flex: 1,
    paddingBottom: getResponsiveSize(20),
  },
  header: {
    paddingHorizontal: getResponsiveSize(20),
    paddingTop: getResponsiveSize(50),
    paddingBottom: getResponsiveSize(20),
    borderBottomLeftRadius: getResponsiveSize(25),
    borderBottomRightRadius: getResponsiveSize(25),
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 215, 0, 0.3)',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    padding: getResponsiveSize(8),
  },
  titleSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  titleIconContainer: {
    marginRight: getResponsiveSize(12),
  },
  titleIconGradient: {
    width: getResponsiveSize(44),
    height: getResponsiveSize(44),
    borderRadius: getResponsiveSize(12),
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 5,
  },
  titleTextContainer: {
    alignItems: 'center',
  },
  mainTitle: {
    fontSize: getResponsiveFontSize(18),
    fontWeight: '800',
    color: '#E0E0E0',
    letterSpacing: 0.3,
  },
  subtitle: {
    fontSize: getResponsiveFontSize(12),
    color: '#999',
    fontWeight: '500',
  },
  headerSpacer: {
    width: getResponsiveSize(44),
  },
  searchContainer: {
    margin: getResponsiveSize(15),
    marginBottom: getResponsiveSize(10),
  },
  searchGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(42, 42, 42, 0.9)',
    paddingHorizontal: getResponsiveSize(15),
    paddingVertical: getResponsiveSize(12),
    borderRadius: getResponsiveSize(15),
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.2)',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  searchInput: {
    flex: 1,
    marginLeft: getResponsiveSize(10),
    fontSize: getResponsiveFontSize(14),
    color: '#E0E0E0',
  },
  statsContainer: {
    marginHorizontal: getResponsiveSize(15),
    marginBottom: getResponsiveSize(10),
  },
  statsGradient: {
    borderRadius: getResponsiveSize(15),
    padding: getResponsiveSize(16),
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.2)',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  statsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: getResponsiveSize(15),
  },
  statsTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statsTitle: {
    fontSize: getResponsiveFontSize(16),
    fontWeight: '700',
    color: '#E0E0E0',
    marginLeft: getResponsiveSize(8),
  },
  totalCount: {
    fontSize: getResponsiveFontSize(18),
    fontWeight: '800',
    color: '#FFD700',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statIcon: {
    width: getResponsiveSize(32),
    height: getResponsiveSize(32),
    borderRadius: getResponsiveSize(16),
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: getResponsiveSize(6),
  },
  statNumber: {
    fontSize: getResponsiveFontSize(16),
    fontWeight: '800',
    color: '#E0E0E0',
    marginBottom: getResponsiveSize(2),
  },
  statLabel: {
    fontSize: getResponsiveFontSize(10),
    color: '#999',
    fontWeight: '600',
    textAlign: 'center',
  },
  filtersContainer: {
    marginHorizontal: getResponsiveSize(15),
    marginBottom: getResponsiveSize(10),
  },
  filtersGradient: {
    borderRadius: getResponsiveSize(15),
    padding: getResponsiveSize(16),
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.2)',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  filtersTitle: {
    fontSize: getResponsiveFontSize(14),
    fontWeight: '700',
    color: '#E0E0E0',
    marginBottom: getResponsiveSize(12),
  },
  filtersScroll: {
    maxHeight: getResponsiveSize(50),
  },
  filtersScrollContent: {
    paddingRight: getResponsiveSize(10),
  },
  filtersRow: {
    flexDirection: 'row',
    gap: getResponsiveSize(8),
  },
  filterChip: {
    paddingHorizontal: getResponsiveSize(16),
    paddingVertical: getResponsiveSize(8),
    borderRadius: getResponsiveSize(20),
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
    minHeight: getResponsiveSize(36),
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterChipActive: {
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.8)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  filterChipText: {
    fontSize: getResponsiveFontSize(12),
    color: '#999',
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: '#1a1a1a',
    fontWeight: '700',
  },
  filterInfo: {
    marginHorizontal: getResponsiveSize(15),
    marginBottom: getResponsiveSize(10),
  },
  filterInfoGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: getResponsiveSize(12),
    borderRadius: getResponsiveSize(12),
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
  },
  filterInfoText: {
    flex: 1,
    fontSize: getResponsiveFontSize(12),
    color: '#FFD700',
    marginLeft: getResponsiveSize(8),
    fontWeight: '500',
  },
  listContainer: {
    flex: 1,
    marginHorizontal: getResponsiveSize(15),
  },
  list: {
    flex: 1,
  },
  employeeCard: {
    marginBottom: getResponsiveSize(12),
    borderRadius: getResponsiveSize(15),
    overflow: 'hidden',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  employeeGradient: {
    padding: getResponsiveSize(16),
    borderRadius: getResponsiveSize(15),
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.2)',
  },
  employeeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: getResponsiveSize(12),
  },
  employeeInfo: {
    flex: 1,
  },
  employeeName: {
    fontSize: getResponsiveFontSize(16),
    fontWeight: '700',
    color: '#E0E0E0',
    marginBottom: getResponsiveSize(4),
  },
  employeePosition: {
    fontSize: getResponsiveFontSize(13),
    color: '#FFD700',
    fontWeight: '600',
    marginBottom: getResponsiveSize(2),
  },
  employeeEmail: {
    fontSize: getResponsiveFontSize(12),
    color: '#999',
  },
  actionsSection: {
    alignItems: 'flex-end',
    gap: getResponsiveSize(8),
  },
  editButton: {
    borderRadius: getResponsiveSize(20),
    overflow: 'hidden',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  editButtonGradient: {
    width: getResponsiveSize(32),
    height: getResponsiveSize(32),
    borderRadius: getResponsiveSize(16),
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButton: {
    borderRadius: getResponsiveSize(20),
    overflow: 'hidden',
    shadowColor: '#FF6B6B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  deleteButtonGradient: {
    width: getResponsiveSize(32),
    height: getResponsiveSize(32),
    borderRadius: getResponsiveSize(16),
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusButton: {
    borderRadius: getResponsiveSize(20),
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  statusBadge: {
    paddingHorizontal: getResponsiveSize(12),
    paddingVertical: getResponsiveSize(6),
    borderRadius: getResponsiveSize(20),
    minWidth: getResponsiveSize(120),
  },
  statusContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusDot: {
    width: getResponsiveSize(8),
    height: getResponsiveSize(8),
    borderRadius: getResponsiveSize(4),
    marginRight: getResponsiveSize(6),
  },
  statusText: {
    fontSize: getResponsiveFontSize(12),
    fontWeight: '600',
    color: '#FFFFFF',
    marginRight: getResponsiveSize(4),
  },
  dateInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: getResponsiveSize(8),
    padding: getResponsiveSize(8),
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    borderRadius: getResponsiveSize(8),
    borderLeftWidth: getResponsiveSize(3),
    borderLeftColor: '#FFD700',
  },
  dateText: {
    fontSize: getResponsiveFontSize(12),
    color: '#E0E0E0',
    marginLeft: getResponsiveSize(6),
    fontWeight: '500',
  },
  lastUpdatedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  lastUpdated: {
    fontSize: getResponsiveFontSize(10),
    color: '#888',
    marginLeft: getResponsiveSize(4),
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: getResponsiveSize(40),
  },
  loadingText: {
    fontSize: getResponsiveFontSize(14),
    color: '#E0E0E0',
    marginTop: getResponsiveSize(10),
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: getResponsiveSize(40),
  },
  emptyStateText: {
    fontSize: getResponsiveFontSize(14),
    color: '#888',
    marginTop: getResponsiveSize(8),
    textAlign: 'center',
  },
  clearFiltersButton: {
    marginTop: getResponsiveSize(16),
    borderRadius: getResponsiveSize(20),
    overflow: 'hidden',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 5,
  },
  clearFiltersGradient: {
    paddingHorizontal: getResponsiveSize(20),
    paddingVertical: getResponsiveSize(10),
    borderRadius: getResponsiveSize(20),
  },
  clearFiltersText: {
    color: '#1a1a1a',
    fontSize: getResponsiveFontSize(12),
    fontWeight: '700',
  },

  // Стили для модального окна редактирования
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: getResponsiveSize(20),
  },
  modalContainer: {
    width: '100%',
    maxWidth: getResponsiveSize(500),
    maxHeight: '90%',
  },
  modalGradient: {
    borderRadius: getResponsiveSize(20),
    padding: getResponsiveSize(20),
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
    marginBottom: getResponsiveSize(20),
  },
  modalTitle: {
    fontSize: getResponsiveFontSize(20),
    fontWeight: '800',
    color: '#E0E0E0',
    flex: 1,
  },
  modalCloseIcon: {
    padding: getResponsiveSize(5),
  },
  modalContent: {
    maxHeight: getResponsiveSize(400),
  },
  inputGroup: {
    marginBottom: getResponsiveSize(16),
  },
  label: {
    fontSize: getResponsiveFontSize(14),
    fontWeight: '600',
    color: '#E0E0E0',
    marginBottom: getResponsiveSize(8),
  },
  textInput: {
    backgroundColor: 'rgba(42, 42, 42, 0.9)',
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
    borderRadius: getResponsiveSize(10),
    padding: getResponsiveSize(12),
    color: '#E0E0E0',
    fontSize: getResponsiveFontSize(14),
  },
  statusOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: getResponsiveSize(8),
  },
  statusOption: {
    marginBottom: getResponsiveSize(8),
  },
  statusOptionGradient: {
    paddingHorizontal: getResponsiveSize(12),
    paddingVertical: getResponsiveSize(8),
    borderRadius: getResponsiveSize(20),
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
  },
  statusOptionActive: {
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.8)',
  },
  statusOptionText: {
    fontSize: getResponsiveFontSize(12),
    fontWeight: '600',
    color: '#999',
  },
  statusOptionTextActive: {
    color: '#1a1a1a',
    fontWeight: '700',
  },
  datesRow: {
    flexDirection: 'row',
    gap: getResponsiveSize(12),
  },
  dateInput: {
    flex: 1,
  },
  dateHint: {
    fontSize: getResponsiveFontSize(11),
    color: '#FFD700',
    fontStyle: 'italic',
    marginTop: getResponsiveSize(8),
    marginBottom: getResponsiveSize(16),
  },
  deleteEmployeeButton: {
    marginTop: getResponsiveSize(8),
    marginBottom: getResponsiveSize(8),
    borderRadius: getResponsiveSize(15),
    overflow: 'hidden',
    shadowColor: '#FF6B6B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  deleteEmployeeButtonGradient: {
    padding: getResponsiveSize(15),
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: getResponsiveSize(8),
  },
  deleteEmployeeButtonText: {
    color: '#FFFFFF',
    fontSize: getResponsiveFontSize(16),
    fontWeight: '700',
  },
  modalActions: {
    flexDirection: 'row',
    gap: getResponsiveSize(12),
    marginTop: getResponsiveSize(20),
  },
  cancelButton: {
    flex: 1,
    padding: getResponsiveSize(15),
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: getResponsiveSize(15),
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.5)',
  },
  cancelButtonText: {
    color: '#FFD700',
    fontSize: getResponsiveFontSize(16),
    fontWeight: '600',
  },
  saveButton: {
    flex: 2,
    borderRadius: getResponsiveSize(15),
    overflow: 'hidden',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  saveButtonGradient: {
    padding: getResponsiveSize(15),
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: getResponsiveSize(8),
  },
  saveButtonText: {
    color: '#1a1a1a',
    fontSize: getResponsiveFontSize(16),
    fontWeight: '700',
  },
});