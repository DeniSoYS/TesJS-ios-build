import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { collection, deleteDoc, doc, getDocs, orderBy, query, updateDoc } from 'firebase/firestore';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Dimensions,
  FlatList,
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
            <View style={styles.employeeDetails}>
              {item.position && (
                <Text style={styles.employeePosition}>
                  {item.position}
                </Text>
              )}
              <Text style={styles.employeeEmail}>
                {item.email || 'Нет email'}
              </Text>
            </View>
          </View>
         
          <View style={styles.actionsSection}>
            <View style={styles.actionButtonsRow}>
              <TouchableOpacity
                style={styles.editButton}
                onPress={() => onEdit(item)}
              >
                <LinearGradient
                  colors={['#FFD700', '#FFA500']}
                  style={styles.editButtonGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Ionicons name="pencil" size={getResponsiveSize(11)} color="#1a1a1a" />
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => onDelete(item.id, item.fullName)}
              >
                <LinearGradient
                  colors={['#FF6B6B', '#EE5A52']}
                  style={styles.deleteButtonGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Ionicons name="trash-outline" size={getResponsiveSize(11)} color="#FFFFFF" />
                </LinearGradient>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.statusButton}
              onPress={() => onStatusChange(item.id, item.status)}
            >
              <LinearGradient
                colors={statusInfo.gradient}
                style={styles.statusBadge}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={styles.statusContent}>
                  <Text style={styles.statusText}>
                    {statusInfo.label}
                  </Text>
                  <Ionicons name="chevron-down" size={getResponsiveSize(11)} color="#FFFFFF" />
                </View>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
       
        {(item.startDate || item.endDate) && (
          <View style={styles.dateInfo}>
            <Ionicons name="calendar-outline" size={getResponsiveSize(11)} color="#FFD700" />
            <Text style={styles.dateText}>
              {item.startDate && `с ${new Date(item.startDate).toLocaleDateString('ru-RU')}`}
              {item.startDate && item.endDate && ' '}
              {item.endDate && `по ${new Date(item.endDate).toLocaleDateString('ru-RU')}`}
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
                <Ionicons name="close-circle" size={getResponsiveSize(26)} color="#FFD700" />
              </TouchableOpacity>
            </View>

            <ScrollView 
              style={styles.modalContent}
              showsVerticalScrollIndicator={true}
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

              {employee && (
                <TouchableOpacity 
                  style={styles.deleteEmployeeButton}
                  onPress={() => onDelete(employee.id, employee.fullName)}
                >
                  <LinearGradient
                    colors={['#FF6B6B', '#EE5A52']}
                    style={styles.deleteEmployeeButtonGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <Ionicons name="trash-outline" size={getResponsiveSize(17)} color="#FFFFFF" />
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
                  <Ionicons name="save" size={getResponsiveSize(17)} color="#1a1a1a" />
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

const CollapsibleSection = ({ title, isExpanded, onToggle, children, icon }) => {
  return (
    <View style={styles.collapsibleContainer}>
      <TouchableOpacity onPress={onToggle} style={styles.collapsibleHeader}>
        <View style={styles.collapsibleTitle}>
          {icon}
          <Text style={styles.collapsibleTitleText}>{title}</Text>
        </View>
        <Ionicons 
          name={isExpanded ? "chevron-up" : "chevron-down"} 
          size={getResponsiveSize(15)} 
          color="#FFD700" 
        />
      </TouchableOpacity>
      
      {isExpanded && (
        <View style={styles.collapsibleContent}>
          {children}
        </View>
      )}
    </View>
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
  const [statsExpanded, setStatsExpanded] = useState(false);
  const [filtersExpanded, setFiltersExpanded] = useState(false);
 
  useEffect(() => {
    loadEmployees();
  }, []);
 
  const loadEmployees = async () => {
    try {
      if (!auth.currentUser) {
        Alert.alert('Ошибка', 'Пользователь не авторизован');
        setEmployees([]);
        setLoading(false);
        setRefreshing(false);
        return;
      }
     
      setLoading(true);
     
      const employeesQuery = query(
        collection(db, 'employees'), 
        orderBy('fullName')
      );
     
      const snapshot = await getDocs(employeesQuery);
     
      const employeesData = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        employeesData.push({ id: doc.id, ...data });
      });
     
      setEmployees(employeesData);
      setLoading(false);
      setRefreshing(false);
     
    } catch (error) {
      console.error('Ошибка загрузки:', error);
      Alert.alert('Ошибка', `Не удалось загрузить список: ${error.message}`);
      setEmployees([]);
      setLoading(false);
      setRefreshing(false);
    }
  };
 
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadEmployees();
  }, []);
 
  const handleStatusChange = useCallback(async (employeeId, currentStatus) => {
    const statuses = [
      { value: 'working', label: '💼 Работаю' },
      { value: 'sick', label: '🤒 Больничный' },
      { value: 'vacation', label: '🏖️ Отпуск' },
      { value: 'dayoff', label: '🏠 Отгул' },
      { value: 'unpaid', label: '💰 Без содержания' }
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

  // ПРЯМОЕ УДАЛЕНИЕ - МАКСИМАЛЬНО ПРОСТО
  const handleDeleteEmployee = async (employeeId, employeeName) => {
    console.log('=== УДАЛЕНИЕ НАЧАТО ===');
    console.log('ID:', employeeId);
    console.log('Имя:', employeeName);
    
    if (Platform.OS === 'web') {
      // Для веб используем confirm
      const confirmed = window.confirm(`Удалить артиста "${employeeName}"?`);
      if (!confirmed) {
        console.log('Отменено');
        return;
      }
    } else {
      // Для мобильных используем Alert
      return new Promise((resolve) => {
        Alert.alert(
          'Удаление',
          `Удалить "${employeeName}"?`,
          [
            {
              text: 'Нет',
              style: 'cancel',
              onPress: () => {
                console.log('Отменено');
                resolve();
              }
            },
            {
              text: 'Да',
              style: 'destructive',
              onPress: async () => {
                await performDelete(employeeId, employeeName);
                resolve();
              }
            }
          ]
        );
      });
    }
    
    // Для веб - сразу удаляем
    await performDelete(employeeId, employeeName);
  };

  const performDelete = async (employeeId, employeeName) => {
    try {
      console.log('>>> Начало удаления');
      const docRef = doc(db, 'employees', employeeId);
      console.log('>>> Reference создан');
      
      await deleteDoc(docRef);
      console.log('>>> Документ удален');
      
      Alert.alert('Готово', `Артист "${employeeName}" удален`);
      
      await loadEmployees();
      console.log('>>> Список обновлен');
      console.log('=== УДАЛЕНИЕ ЗАВЕРШЕНО ===');
    } catch (error) {
      console.error('!!! ОШИБКА:', error);
      Alert.alert('Ошибка', `Не удалось удалить: ${error.message}`);
    }
  };

  const handleSaveEmployee = useCallback(async (employeeId, formData) => {
    try {
      await updateDoc(doc(db, 'employees', employeeId), {
        ...formData,
        lastUpdated: new Date()
      });
      Alert.alert('Успех', 'Данные обновлены');
      setEditModalVisible(false);
      setSelectedEmployee(null);
      loadEmployees();
    } catch (error) {
      Alert.alert('Ошибка', 'Не удалось обновить данные');
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
  ), [handleStatusChange, handleEditEmployee]);
 
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
              <Ionicons name="arrow-back" size={getResponsiveSize(22)} color="#FFD700" />
            </TouchableOpacity>
            
            <View style={styles.titleSection}>
              <View style={styles.titleIconContainer}>
                <LinearGradient
                  colors={['#FFD700', '#FFA500']}
                  style={styles.titleIconGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Ionicons name="people" size={getResponsiveSize(20)} color="#1a1a1a" />
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
          <View style={styles.searchContainer}>
            <LinearGradient
              colors={['rgba(42, 42, 42, 0.9)', 'rgba(35, 35, 35, 0.8)']}
              style={styles.searchGradient}
            >
              <Ionicons name="search" size={getResponsiveSize(15)} color="#FFD700" />
              <TextInput
                style={styles.searchInput}
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Поиск по ФИО, должности или email..."
                placeholderTextColor="#888"
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Ionicons name="close-circle" size={getResponsiveSize(15)} color="#888" />
                </TouchableOpacity>
              )}
            </LinearGradient>
          </View>

          <CollapsibleSection
            title="Статистика команды"
            isExpanded={statsExpanded}
            onToggle={() => setStatsExpanded(!statsExpanded)}
            icon={<Ionicons name="stats-chart" size={getResponsiveSize(13)} color="#FFD700" />}
          >
            <View style={styles.statsContainer}>
              <LinearGradient
                colors={['rgba(42, 42, 42, 0.9)', 'rgba(35, 35, 35, 0.8)']}
                style={styles.statsGradient}
              >
                <View style={styles.statsHeader}>
                  <Text style={styles.totalCount}>Всего: {stats.total} чел.</Text>
                </View>
                
                <View style={styles.statsGrid}>
                  <View style={styles.statItem}>
                    <LinearGradient colors={['#34C759', '#28A745']} style={styles.statIcon}>
                      <Text style={styles.statIconText}>{stats.working}</Text>
                    </LinearGradient>
                    <Text style={styles.statLabel}>Работают</Text>
                  </View>
                  
                  <View style={styles.statItem}>
                    <LinearGradient colors={['#FFA500', '#FF8C00']} style={styles.statIcon}>
                      <Text style={styles.statIconText}>{stats.sick}</Text>
                    </LinearGradient>
                    <Text style={styles.statLabel}>Больничный</Text>
                  </View>
                  
                  <View style={styles.statItem}>
                    <LinearGradient colors={['#4A90E2', '#357ABD']} style={styles.statIcon}>
                      <Text style={styles.statIconText}>{stats.vacation}</Text>
                    </LinearGradient>
                    <Text style={styles.statLabel}>Отпуск</Text>
                  </View>
                  
                  <View style={styles.statItem}>
                    <LinearGradient colors={['#9B59B6', '#8E44AD']} style={styles.statIcon}>
                      <Text style={styles.statIconText}>{stats.dayoff}</Text>
                    </LinearGradient>
                    <Text style={styles.statLabel}>Отгул</Text>
                  </View>
                  
                  <View style={styles.statItem}>
                    <LinearGradient colors={['#FF6B6B', '#EE5A52']} style={styles.statIcon}>
                      <Text style={styles.statIconText}>{stats.unpaid}</Text>
                    </LinearGradient>
                    <Text style={styles.statLabel}>Без содержания</Text>
                  </View>
                </View>
              </LinearGradient>
            </View>
          </CollapsibleSection>

          <CollapsibleSection
            title="Фильтр по статусу"
            isExpanded={filtersExpanded}
            onToggle={() => setFiltersExpanded(!filtersExpanded)}
            icon={<Ionicons name="filter" size={getResponsiveSize(13)} color="#FFD700" />}
          >
            <View style={styles.filtersContainer}>
              <LinearGradient
                colors={['rgba(42, 42, 42, 0.9)', 'rgba(35, 35, 35, 0.8)']}
                style={styles.filtersGradient}
              >
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
          </CollapsibleSection>

          {(filter !== 'all' || searchQuery) && (
            <View style={styles.filterInfo}>
              <LinearGradient
                colors={['rgba(255, 215, 0, 0.2)', 'rgba(255, 165, 0, 0.2)']}
                style={styles.filterInfoGradient}
              >
                <Ionicons name="information-circle" size={getResponsiveSize(11)} color="#FFD700" />
                <Text style={styles.filterInfoText}>
                  Показано: {filteredEmployees.length} из {employees.length}
                  {filter !== 'all' && ` • ${getStatusLabel(filter)}`}
                  {searchQuery && ` • Поиск: "${searchQuery}"`}
                </Text>
                <TouchableOpacity 
                  onPress={() => {
                    setSearchQuery('');
                    setFilter('all');
                  }}
                >
                  <Ionicons name="close" size={getResponsiveSize(11)} color="#FFD700" />
                </TouchableOpacity>
              </LinearGradient>
            </View>
          )}

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
                />
              }
              initialNumToRender={20}
              maxToRenderPerBatch={20}
              windowSize={10}
              removeClippedSubviews={false}
              showsVerticalScrollIndicator={true}
              scrollEventThrottle={16}
              ListEmptyComponent={
                loading ? (
                  <View style={styles.loadingContainer}>
                    <Ionicons name="people" size={getResponsiveSize(40)} color="#FFD700" />
                    <Text style={styles.loadingText}>Загрузка артистов...</Text>
                  </View>
                ) : (
                  <View style={styles.emptyState}>
                    <Ionicons name="people-outline" size={getResponsiveSize(40)} color="#555" />
                    <Text style={styles.emptyStateText}>
                      {employees.length === 0 
                        ? 'Артистов нет' 
                        : 'Нет артистов по выбранному фильтру'
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

        <EditEmployeeModal
          visible={editModalVisible}
          employee={selectedEmployee}
          onClose={handleCloseEditModal}
          onSave={handleSaveEmployee}
          onDelete={handleDeleteEmployee}
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
    paddingBottom: getResponsiveSize(5),
  },
  header: {
    paddingHorizontal: getResponsiveSize(15),
    paddingTop: getResponsiveSize(40),
    paddingBottom: getResponsiveSize(12),
    borderBottomLeftRadius: getResponsiveSize(18),
    borderBottomRightRadius: getResponsiveSize(18),
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 6,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 215, 0, 0.3)',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    padding: getResponsiveSize(5),
  },
  titleSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  titleIconContainer: {
    marginRight: getResponsiveSize(8),
  },
  titleIconGradient: {
    width: getResponsiveSize(32),
    height: getResponsiveSize(32),
    borderRadius: getResponsiveSize(8),
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  titleTextContainer: {
    alignItems: 'center',
  },
  mainTitle: {
    fontSize: getResponsiveFontSize(17),
    fontWeight: '800',
    color: '#E0E0E0',
    letterSpacing: 0.3,
  },
  subtitle: {
    fontSize: getResponsiveFontSize(11),
    color: '#999',
    fontWeight: '500',
  },
  headerSpacer: {
    width: getResponsiveSize(32),
  },
  searchContainer: {
    margin: getResponsiveSize(10),
    marginBottom: getResponsiveSize(6),
  },
  searchGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(42, 42, 42, 0.9)',
    paddingHorizontal: getResponsiveSize(10),
    paddingVertical: getResponsiveSize(8),
    borderRadius: getResponsiveSize(10),
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.2)',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    marginLeft: getResponsiveSize(6),
    fontSize: getResponsiveFontSize(13),
    color: '#E0E0E0',
  },
  collapsibleContainer: {
    marginHorizontal: getResponsiveSize(10),
    marginBottom: getResponsiveSize(6),
  },
  collapsibleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: getResponsiveSize(8),
    backgroundColor: 'rgba(42, 42, 42, 0.7)',
    borderRadius: getResponsiveSize(8),
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.2)',
  },
  collapsibleTitle: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  collapsibleTitleText: {
    fontSize: getResponsiveFontSize(13),
    fontWeight: '700',
    color: '#E0E0E0',
    marginLeft: getResponsiveSize(5),
  },
  collapsibleContent: {
    marginTop: getResponsiveSize(5),
  },
  statsContainer: {
    marginBottom: getResponsiveSize(0),
  },
  statsGradient: {
    borderRadius: getResponsiveSize(10),
    padding: getResponsiveSize(8),
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.2)',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  statsHeader: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: getResponsiveSize(6),
  },
  totalCount: {
    fontSize: getResponsiveFontSize(13),
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
    width: getResponsiveSize(24),
    height: getResponsiveSize(24),
    borderRadius: getResponsiveSize(12),
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: getResponsiveSize(3),
  },
  statIconText: {
    fontSize: getResponsiveFontSize(11),
    fontWeight: '800',
    color: '#FFFFFF',
  },
  statLabel: {
    fontSize: getResponsiveFontSize(9),
    color: '#999',
    fontWeight: '600',
    textAlign: 'center',
  },
  filtersContainer: {
    marginBottom: getResponsiveSize(0),
  },
  filtersGradient: {
    borderRadius: getResponsiveSize(10),
    padding: getResponsiveSize(8),
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.2)',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  filtersScroll: {
    maxHeight: getResponsiveSize(35),
  },
  filtersScrollContent: {
    paddingRight: getResponsiveSize(6),
  },
  filtersRow: {
    flexDirection: 'row',
    gap: getResponsiveSize(5),
  },
  filterChip: {
    paddingHorizontal: getResponsiveSize(10),
    paddingVertical: getResponsiveSize(5),
    borderRadius: getResponsiveSize(14),
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
    minHeight: getResponsiveSize(26),
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterChipActive: {
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.8)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 2,
  },
  filterChipText: {
    fontSize: getResponsiveFontSize(10),
    color: '#999',
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: '#1a1a1a',
    fontWeight: '700',
  },
  filterInfo: {
    marginHorizontal: getResponsiveSize(10),
    marginBottom: getResponsiveSize(6),
  },
  filterInfoGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: getResponsiveSize(7),
    borderRadius: getResponsiveSize(8),
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
  },
  filterInfoText: {
    flex: 1,
    fontSize: getResponsiveFontSize(11),
    color: '#FFD700',
    marginLeft: getResponsiveSize(5),
    fontWeight: '500',
  },
  listContainer: {
    flex: 1,
    marginHorizontal: getResponsiveSize(10),
  },
  list: {
    flex: 1,
  },
  employeeCard: {
    marginBottom: getResponsiveSize(6),
    borderRadius: getResponsiveSize(10),
    overflow: 'hidden',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  employeeGradient: {
    padding: getResponsiveSize(8),
    borderRadius: getResponsiveSize(10),
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.2)',
  },
  employeeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  employeeInfo: {
    flex: 1,
    paddingRight: getResponsiveSize(6),
  },
  employeeName: {
    fontSize: getResponsiveFontSize(14),
    fontWeight: '700',
    color: '#E0E0E0',
    marginBottom: getResponsiveSize(3),
  },
  employeeDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  employeePosition: {
    fontSize: getResponsiveFontSize(11),
    color: '#FFD700',
    fontWeight: '600',
    marginRight: getResponsiveSize(6),
  },
  employeeEmail: {
    fontSize: getResponsiveFontSize(11),
    color: '#999',
  },
  actionsSection: {
    alignItems: 'flex-end',
    gap: getResponsiveSize(4),
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: getResponsiveSize(4),
  },
  editButton: {
    borderRadius: getResponsiveSize(12),
    overflow: 'hidden',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.25,
    shadowRadius: 2,
    elevation: 2,
  },
  editButtonGradient: {
    width: getResponsiveSize(24),
    height: getResponsiveSize(24),
    borderRadius: getResponsiveSize(12),
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButton: {
    borderRadius: getResponsiveSize(12),
    overflow: 'hidden',
    shadowColor: '#FF6B6B',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.25,
    shadowRadius: 2,
    elevation: 2,
  },
  deleteButtonGradient: {
    width: getResponsiveSize(24),
    height: getResponsiveSize(24),
    borderRadius: getResponsiveSize(12),
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusButton: {
    borderRadius: getResponsiveSize(14),
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.25,
    shadowRadius: 2,
    elevation: 2,
  },
  statusBadge: {
    paddingHorizontal: getResponsiveSize(9),
    paddingVertical: getResponsiveSize(5),
    borderRadius: getResponsiveSize(14),
    minWidth: getResponsiveSize(95),
  },
  statusContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusText: {
    fontSize: getResponsiveFontSize(10),
    fontWeight: '600',
    color: '#FFFFFF',
    marginRight: getResponsiveSize(3),
  },
  dateInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: getResponsiveSize(5),
    padding: getResponsiveSize(5),
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    borderRadius: getResponsiveSize(5),
    borderLeftWidth: getResponsiveSize(2),
    borderLeftColor: '#FFD700',
  },
  dateText: {
    fontSize: getResponsiveFontSize(10),
    color: '#E0E0E0',
    marginLeft: getResponsiveSize(3),
    fontWeight: '500',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: getResponsiveSize(30),
  },
  loadingText: {
    fontSize: getResponsiveFontSize(13),
    color: '#E0E0E0',
    marginTop: getResponsiveSize(8),
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: getResponsiveSize(30),
  },
  emptyStateText: {
    fontSize: getResponsiveFontSize(13),
    color: '#888',
    marginTop: getResponsiveSize(8),
    textAlign: 'center',
  },
  clearFiltersButton: {
    marginTop: getResponsiveSize(12),
    borderRadius: getResponsiveSize(14),
    overflow: 'hidden',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 2,
  },
  clearFiltersGradient: {
    paddingHorizontal: getResponsiveSize(14),
    paddingVertical: getResponsiveSize(7),
    borderRadius: getResponsiveSize(14),
  },
  clearFiltersText: {
    color: '#1a1a1a',
    fontSize: getResponsiveFontSize(11),
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: getResponsiveSize(15),
  },
  modalContainer: {
    width: '100%',
    maxWidth: getResponsiveSize(450),
    maxHeight: '85%',
  },
  modalGradient: {
    borderRadius: getResponsiveSize(16),
    padding: getResponsiveSize(16),
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: getResponsiveSize(16),
  },
  modalTitle: {
    fontSize: getResponsiveFontSize(20),
    fontWeight: '800',
    color: '#E0E0E0',
    flex: 1,
  },
  modalCloseIcon: {
    padding: getResponsiveSize(4),
  },
  modalContent: {
    maxHeight: getResponsiveSize(350),
  },
  inputGroup: {
    marginBottom: getResponsiveSize(12),
  },
  label: {
    fontSize: getResponsiveFontSize(14),
    fontWeight: '600',
    color: '#E0E0E0',
    marginBottom: getResponsiveSize(6),
  },
  textInput: {
    backgroundColor: 'rgba(42, 42, 42, 0.9)',
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
    borderRadius: getResponsiveSize(8),
    padding: getResponsiveSize(10),
    color: '#E0E0E0',
    fontSize: getResponsiveFontSize(14),
  },
  statusOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: getResponsiveSize(6),
  },
  statusOption: {
    marginBottom: getResponsiveSize(6),
  },
  statusOptionGradient: {
    paddingHorizontal: getResponsiveSize(10),
    paddingVertical: getResponsiveSize(6),
    borderRadius: getResponsiveSize(16),
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
    gap: getResponsiveSize(8),
  },
  dateInput: {
    flex: 1,
  },
  dateHint: {
    fontSize: getResponsiveFontSize(11),
    color: '#FFD700',
    fontStyle: 'italic',
    marginTop: getResponsiveSize(6),
    marginBottom: getResponsiveSize(12),
  },
  deleteEmployeeButton: {
    marginTop: getResponsiveSize(6),
    marginBottom: getResponsiveSize(6),
    borderRadius: getResponsiveSize(12),
    overflow: 'hidden',
    shadowColor: '#FF6B6B',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  deleteEmployeeButtonGradient: {
    padding: getResponsiveSize(12),
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: getResponsiveSize(6),
  },
  deleteEmployeeButtonText: {
    color: '#FFFFFF',
    fontSize: getResponsiveFontSize(15),
    fontWeight: '700',
  },
  modalActions: {
    flexDirection: 'row',
    gap: getResponsiveSize(8),
    marginTop: getResponsiveSize(16),
  },
  cancelButton: {
    flex: 1,
    padding: getResponsiveSize(12),
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: getResponsiveSize(12),
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.5)',
  },
  cancelButtonText: {
    color: '#FFD700',
    fontSize: getResponsiveFontSize(15),
    fontWeight: '600',
  },
  saveButton: {
    flex: 2,
    borderRadius: getResponsiveSize(12),
    overflow: 'hidden',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  saveButtonGradient: {
    padding: getResponsiveSize(12),
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: getResponsiveSize(6),
  },
  saveButtonText: {
    color: '#1a1a1a',
    fontSize: getResponsiveFontSize(15),
    fontWeight: '700',
  },
});