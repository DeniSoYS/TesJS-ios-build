import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { LinearGradient } from 'expo-linear-gradient';
import { addDoc, collection, doc, getDocs, query, updateDoc, where } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import {
  Alert,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
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

export default function SickLeave({ navigation, route }) {
  const { userRole, userEmail: paramEmail } = route.params || {};
  const [userEmail, setUserEmail] = useState(paramEmail || auth?.currentUser?.email || '');
  const [status, setStatus] = useState('working');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [description, setDescription] = useState('');
  const [fullName, setFullName] = useState('');
  const [position, setPosition] = useState('');
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [existingEmployee, setExistingEmployee] = useState(null);
  const [loading, setLoading] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);

  // ОБНОВЛЕННЫЙ МАССИВ СТАТУСОВ С НОВЫМИ ЦВЕТАМИ ПОД ТЕМНУЮ ТЕМУ
  const statusOptions = [
    { value: 'working', label: 'На работе', color: '#34C759', icon: 'checkmark-circle' },
    { value: 'sick', label: 'Больничный', color: '#FF6B6B', icon: 'medical' },
    { value: 'vacation', label: 'Отпуск', color: '#4A90E2', icon: 'airplane' },
    { value: 'dayoff', label: 'Отгул', color: '#9B59B6', icon: 'calendar' },
    { value: 'unpaid', label: 'Без содержания', color: '#FFD700', icon: 'warning' },
    { value: 'other', label: 'Другое', color: '#8E8E93', icon: 'ellipsis-horizontal' },
  ];

  useEffect(() => {
    if (!paramEmail && auth?.currentUser?.email) {
      setUserEmail(auth.currentUser.email);
    }
  }, [paramEmail]);

  useEffect(() => {
    if (userEmail) {
      loadEmployeeData();
    } else {
      setInitialLoad(false);
      console.warn('Email не доступен для загрузки данных сотрудника');
    }
  }, [userEmail]);

  const loadEmployeeData = async () => {
    if (!userEmail || userEmail.trim() === '') {
      console.error('Неверный email:', userEmail);
      setInitialLoad(false);
      return;
    }

    try {
      setLoading(true);
      console.log('Загрузка данных для email:', userEmail);
      
      const q = query(
        collection(db, 'employees'), 
        where('email', '==', userEmail.trim())
      );
      
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const doc = querySnapshot.docs[0];
        const employeeData = doc.data();
        
        console.log('Найдены данные сотрудника:', employeeData);
        
        setExistingEmployee({
          id: doc.id,
          ...employeeData
        });
        setFullName(employeeData.fullName || '');
        setPosition(employeeData.position || '');
        setStatus(employeeData.status || 'working');
        setStartDate(employeeData.startDate || '');
        setEndDate(employeeData.endDate || '');
        setDescription(employeeData.description || '');
      } else {
        console.log('Данные сотрудника не найдены, создадим новую запись');
      }
    } catch (error) {
      console.error('Ошибка при загрузке данных сотрудника:', error);
      if (error.code === 'invalid-argument') {
        Alert.alert('Ошибка', 'Неверный формат email адреса');
      } else {
        Alert.alert('Ошибка', 'Не удалось загрузить данные сотрудника');
      }
    } finally {
      setLoading(false);
      setInitialLoad(false);
    }
  };

  const handleDateSelect = (date, type) => {
    if (date) {
      const formattedDate = date.toISOString().split('T')[0];
      if (type === 'start') {
        setStartDate(formattedDate);
      } else {
        setEndDate(formattedDate);
      }
    }
  };

  const validateForm = () => {
    if (!fullName.trim()) {
      Alert.alert('Ошибка', 'Пожалуйста, укажите ваше ФИО');
      return false;
    }

    if (!position.trim()) {
      Alert.alert('Ошибка', 'Пожалуйста, укажите вашу должность');
      return false;
    }

    if (status !== 'working') {
      if (!startDate) {
        Alert.alert('Ошибка', 'Пожалуйста, укажите дату начала отсутствия');
        return false;
      }
      if (!endDate) {
        Alert.alert('Ошибка', 'Пожалуйста, укажите дату окончания отсутствия');
        return false;
      }
      
      const start = new Date(startDate);
      const end = new Date(endDate);
      if (end < start) {
        Alert.alert('Ошибка', 'Дата окончания не может быть раньше даты начала');
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    if (!userEmail || userEmail.trim() === '') {
      Alert.alert('Ошибка', 'Email не доступен. Пожалуйста, войдите в систему заново.');
      return;
    }

    try {
      setLoading(true);
      
      const employeeData = {
        email: userEmail.trim(),
        fullName: fullName.trim(),
        position: position.trim(),
        status: status,
        startDate: status !== 'working' ? startDate : '',
        endDate: status !== 'working' ? endDate : '',
        description: status !== 'working' ? description.trim() : '',
        lastUpdated: new Date(),
      };

      let message;
      if (existingEmployee) {
        await updateDoc(doc(db, 'employees', existingEmployee.id), employeeData);
        message = 'Статус успешно обновлен';
      } else {
        await addDoc(collection(db, 'employees'), employeeData);
        message = 'Статус успешно сохранен';
      }

      Alert.alert(
        'Успех',
        message,
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      console.error('Ошибка при сохранении:', error);
      let errorMessage = 'Не удалось сохранить статус';
      
      if (error.code === 'permission-denied') {
        errorMessage = 'У вас нет прав для выполнения этой операции';
      } else if (error.code === 'not-found') {
        errorMessage = 'Ошибка доступа к базе данных';
      } else if (error.code === 'invalid-argument') {
        errorMessage = 'Неверные данные для сохранения';
      }
      
      Alert.alert('Ошибка', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleClearDates = () => {
    setStartDate('');
    setEndDate('');
    setDescription('');
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    try {
      const [year, month, day] = dateString.split('-');
      const months = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 
                      'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
      return `${parseInt(day)} ${months[parseInt(month) - 1]} ${year}`;
    } catch (error) {
      return dateString;
    }
  };

  const getStatusColor = (statusValue) => {
    const option = statusOptions.find(opt => opt.value === statusValue);
    return option ? option.color : '#888';
  };

  const getStatusInfo = () => {
    const currentStatus = statusOptions.find(opt => opt.value === status);
    return {
      label: currentStatus?.label || 'Неизвестно',
      color: currentStatus?.color || '#888',
      icon: currentStatus?.icon || 'help'
    };
  };

  if (initialLoad) {
    return (
      <LinearGradient colors={['#0a0a0a', '#1a1a1a', '#2a2a2a']} style={styles.container}>
        <View style={styles.loadingContainer}>
          <Ionicons name="hourglass-outline" size={50} color="#FFD700" />
          <Text style={styles.loadingText}>Загрузка...</Text>
        </View>
      </LinearGradient>
    );
  }

  if (!userEmail) {
    return (
      <LinearGradient colors={['#0a0a0a', '#1a1a1a', '#2a2a2a']} style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="warning-outline" size={50} color="#FF6B6B" />
          <Text style={styles.errorText}>Ошибка загрузки данных</Text>
          <Text style={styles.errorSubtext}>Email не доступен</Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={() => navigation.goBack()}
          >
            <LinearGradient
              colors={['#FFD700', '#FFA500']}
              style={styles.retryButtonGradient}
            >
              <Text style={styles.retryButtonText}>Вернуться назад</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={['#0a0a0a', '#1a1a1a', '#2a2a2a']}
      style={styles.container}
    >
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoid}
      >
        <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollView}>
          {/* ХЕДЕР В СТИЛЕ КАЛЕНДАРЯ */}
          <LinearGradient
            colors={['rgba(26, 26, 26, 0.98)', 'rgba(35, 35, 35, 0.95)']}
            style={styles.header}
          >
            <View style={styles.headerContent}>
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
                  >
                    <Ionicons name="medical" size={getResponsiveSize(24)} color="#1a1a1a" />
                  </LinearGradient>
                </View>
                <View style={styles.titleTextContainer}>
                  <Text style={styles.headerTitle}>Мой статус</Text>
                  <Text style={styles.headerSubtitle}>Управление состоянием</Text>
                </View>
              </View>
              
              <View style={styles.headerSpacer} />
            </View>
          </LinearGradient>

          <View style={styles.formContainer}>
            {/* ИНФОРМАЦИЯ О СОТРУДНИКЕ */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="person" size={getResponsiveSize(20)} color="#FFD700" />
                <Text style={styles.sectionTitle}>Информация о сотруднике</Text>
              </View>
              
              <View style={styles.inputGroup}>
                <Text style={styles.label}>ФИО *</Text>
                <TextInput
                  style={styles.textInput}
                  value={fullName}
                  onChangeText={setFullName}
                  placeholder="Введите ваше ФИО"
                  placeholderTextColor="#666"
                  editable={!loading}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Должность *</Text>
                <TextInput
                  style={styles.textInput}
                  value={position}
                  onChangeText={setPosition}
                  placeholder="Введите вашу должность"
                  placeholderTextColor="#666"
                  editable={!loading}
                />
              </View>

              <View style={styles.emailInfo}>
                <Ionicons name="mail-outline" size={getResponsiveSize(16)} color="#FFD700" />
                <Text style={styles.emailText}>Email: {userEmail}</Text>
              </View>
            </View>

            {/* ВЫБОР СТАТУСА */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="stats-chart" size={getResponsiveSize(20)} color="#FFD700" />
                <Text style={styles.sectionTitle}>Текущий статус</Text>
              </View>
              
              <View style={styles.statusGrid}>
                {statusOptions.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.statusCard,
                      status === option.value && styles.statusCardActive
                    ]}
                    onPress={() => {
                      setStatus(option.value);
                      if (option.value === 'working') {
                        handleClearDates();
                      }
                    }}
                    disabled={loading}
                  >
                    <LinearGradient
                      colors={status === option.value ? 
                        [option.color, option.color] : 
                        ['rgba(42, 42, 42, 0.8)', 'rgba(42, 42, 42, 0.6)']}
                      style={styles.statusCardGradient}
                    >
                      <Ionicons 
                        name={option.icon} 
                        size={getResponsiveSize(24)} 
                        color={status === option.value ? "#1a1a1a" : option.color} 
                      />
                      <Text style={[
                        styles.statusCardText,
                        status === option.value && styles.statusCardTextActive
                      ]}>
                        {option.label}
                      </Text>
                    </LinearGradient>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* ПЕРИОД ОТСУТСТВИЯ */}
            {status !== 'working' && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="calendar" size={getResponsiveSize(20)} color="#FFD700" />
                  <Text style={styles.sectionTitle}>Период отсутствия</Text>
                </View>
                
                <View style={styles.dateRow}>
                  <View style={styles.dateColumn}>
                    <Text style={styles.label}>От даты *</Text>
                    <TouchableOpacity 
                      style={styles.dateInput}
                      onPress={() => setShowStartDatePicker(true)}
                      disabled={loading}
                    >
                      <LinearGradient
                        colors={['rgba(255, 215, 0, 0.2)', 'rgba(255, 165, 0, 0.2)']}
                        style={styles.dateInputGradient}
                      >
                        <Ionicons name="calendar-outline" size={getResponsiveSize(20)} color="#FFD700" />
                        <Text style={startDate ? styles.dateText : styles.datePlaceholder}>
                          {startDate ? formatDate(startDate) : 'Выберите дату'}
                        </Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.dateColumn}>
                    <Text style={styles.label}>До даты *</Text>
                    <TouchableOpacity 
                      style={styles.dateInput}
                      onPress={() => setShowEndDatePicker(true)}
                      disabled={loading}
                    >
                      <LinearGradient
                        colors={['rgba(255, 215, 0, 0.2)', 'rgba(255, 165, 0, 0.2)']}
                        style={styles.dateInputGradient}
                      >
                        <Ionicons name="calendar-outline" size={getResponsiveSize(20)} color="#FFD700" />
                        <Text style={endDate ? styles.dateText : styles.datePlaceholder}>
                          {endDate ? formatDate(endDate) : 'Выберите дату'}
                        </Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Причина отсутствия</Text>
                  <TextInput
                    style={[styles.textInput, styles.textArea]}
                    value={description}
                    onChangeText={setDescription}
                    placeholder="Опишите причину отсутствия..."
                    placeholderTextColor="#666"
                    multiline
                    numberOfLines={3}
                    editable={!loading}
                  />
                </View>
              </View>
            )}

            {/* ТЕКУЩИЙ СТАТУС */}
            <View style={styles.currentStatusSection}>
              <LinearGradient
                colors={['rgba(255, 215, 0, 0.1)', 'rgba(255, 165, 0, 0.1)']}
                style={styles.currentStatusCard}
              >
                <View style={styles.statusHeader}>
                  <Ionicons name={getStatusInfo().icon} size={getResponsiveSize(24)} color={getStatusInfo().color} />
                  <Text style={styles.currentStatusTitle}>Текущий статус</Text>
                </View>
                
                <View style={styles.statusInfo}>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusInfo().color }]} />
                  <Text style={styles.statusLabel}>{getStatusInfo().label}</Text>
                </View>
                
                {status !== 'working' && startDate && endDate && (
                  <View style={styles.datesInfo}>
                    <View style={styles.dateInfoRow}>
                      <Ionicons name="calendar" size={getResponsiveSize(16)} color="#FFD700" />
                      <Text style={styles.statusDates}>
                        {formatDate(startDate)} - {formatDate(endDate)}
                      </Text>
                    </View>
                    {description && (
                      <View style={styles.descriptionRow}>
                        <Ionicons name="document-text" size={getResponsiveSize(16)} color="#FFD700" />
                        <Text style={styles.statusDescription}>{description}</Text>
                      </View>
                    )}
                  </View>
                )}

                {existingEmployee && existingEmployee.lastUpdated && (
                  <View style={styles.lastUpdated}>
                    <Ionicons name="time" size={getResponsiveSize(14)} color="#888" />
                    <Text style={styles.lastUpdatedText}>
                      Обновлено: {existingEmployee.lastUpdated.toDate?.().toLocaleDateString('ru-RU') || 'неизвестно'}
                    </Text>
                  </View>
                )}
              </LinearGradient>
            </View>

            {/* КНОПКА СОХРАНЕНИЯ */}
            <TouchableOpacity 
              style={[styles.submitButton, loading && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={loading}
            >
              <LinearGradient
                colors={['#FFD700', '#FFA500']}
                style={styles.submitGradient}
              >
                {loading ? (
                  <Ionicons name="hourglass-outline" size={getResponsiveSize(20)} color="#1a1a1a" />
                ) : (
                  <Ionicons name="save-outline" size={getResponsiveSize(20)} color="#1a1a1a" />
                )}
                <Text style={styles.submitText}>
                  {loading ? 'Сохранение...' : (existingEmployee ? 'Обновить статус' : 'Сохранить статус')}
                </Text>
              </LinearGradient>
            </TouchableOpacity>

            {/* ПОДСКАЗКА */}
            <View style={styles.hint}>
              <Ionicons name="information-circle-outline" size={getResponsiveSize(16)} color="#FFD700" />
              <Text style={styles.hintText}>
                Администратор увидит ваш статус в разделе "Список артистов"
              </Text>
            </View>
          </View>
        </ScrollView>

        {/* DATE PICKERS */}
        {showStartDatePicker && (
          <DateTimePicker
            value={startDate ? new Date(startDate) : new Date()}
            mode="date"
            display="default"
            onChange={(event, date) => {
              setShowStartDatePicker(false);
              if (date) handleDateSelect(date, 'start');
            }}
          />
        )}

        {showEndDatePicker && (
          <DateTimePicker
            value={endDate ? new Date(endDate) : new Date()}
            mode="date"
            display="default"
            onChange={(event, date) => {
              setShowEndDatePicker(false);
              if (date) handleDateSelect(date, 'end');
            }}
          />
        )}
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

// ОБНОВЛЕННЫЕ СТИЛИ ПОД ТЕМНУЮ ТЕМУ КАЛЕНДАРЯ
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  keyboardAvoid: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    paddingHorizontal: getResponsiveSize(20),
    paddingTop: Platform.OS === 'ios' ? getResponsiveSize(50) : getResponsiveSize(30),
    paddingBottom: getResponsiveSize(20),
    borderBottomLeftRadius: getResponsiveSize(25),
    borderBottomRightRadius: getResponsiveSize(25),
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    borderRadius: getResponsiveSize(20),
    overflow: 'hidden',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 4,
  },
  backButtonGradient: {
    width: getResponsiveSize(40),
    height: getResponsiveSize(40),
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: getResponsiveSize(20),
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
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 5,
  },
  titleTextContainer: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: getResponsiveFontSize(20),
    fontWeight: '800',
    color: '#E0E0E0',
    letterSpacing: 0.3,
  },
  headerSubtitle: {
    fontSize: getResponsiveFontSize(12),
    color: '#FFD700',
    fontWeight: '500',
    marginTop: getResponsiveSize(2),
  },
  headerSpacer: {
    width: getResponsiveSize(40),
  },
  formContainer: {
    padding: getResponsiveSize(20),
  },
  section: {
    backgroundColor: 'rgba(26, 26, 26, 0.8)',
    borderRadius: getResponsiveSize(16),
    padding: getResponsiveSize(18),
    marginBottom: getResponsiveSize(16),
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.2)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: getResponsiveSize(16),
  },
  sectionTitle: {
    fontSize: getResponsiveFontSize(16),
    fontWeight: '700',
    color: '#E0E0E0',
    marginLeft: getResponsiveSize(10),
  },
  inputGroup: {
    marginBottom: getResponsiveSize(16),
  },
  label: {
    fontSize: getResponsiveFontSize(14),
    fontWeight: '600',
    color: '#FFD700',
    marginBottom: getResponsiveSize(8),
  },
  textInput: {
    backgroundColor: 'rgba(42, 42, 42, 0.8)',
    borderRadius: getResponsiveSize(12),
    paddingHorizontal: getResponsiveSize(15),
    paddingVertical: getResponsiveSize(14),
    fontSize: getResponsiveFontSize(14),
    color: '#E0E0E0',
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
  },
  textArea: {
    minHeight: getResponsiveSize(100),
    textAlignVertical: 'top',
  },
  emailInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: getResponsiveSize(10),
    padding: getResponsiveSize(12),
    backgroundColor: 'rgba(42, 42, 42, 0.6)',
    borderRadius: getResponsiveSize(10),
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.2)',
  },
  emailText: {
    fontSize: getResponsiveFontSize(13),
    color: '#FFD700',
    marginLeft: getResponsiveSize(8),
    fontWeight: '500',
  },
  statusGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statusCard: {
    width: '48%',
    marginBottom: getResponsiveSize(12),
    borderRadius: getResponsiveSize(12),
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  statusCardActive: {
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 6,
  },
  statusCardGradient: {
    padding: getResponsiveSize(16),
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: getResponsiveSize(12),
    minHeight: getResponsiveSize(80),
  },
  statusCardText: {
    fontSize: getResponsiveFontSize(12),
    color: '#E0E0E0',
    fontWeight: '600',
    marginTop: getResponsiveSize(8),
    textAlign: 'center',
  },
  statusCardTextActive: {
    color: '#1a1a1a',
    fontWeight: '800',
  },
  dateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dateColumn: {
    width: '48%',
  },
  dateInput: {
    borderRadius: getResponsiveSize(12),
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  dateInputGradient: {
    paddingHorizontal: getResponsiveSize(15),
    paddingVertical: getResponsiveSize(14),
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: getResponsiveSize(12),
  },
  dateText: {
    fontSize: getResponsiveFontSize(14),
    color: '#E0E0E0',
    marginLeft: getResponsiveSize(10),
    fontWeight: '500',
  },
  datePlaceholder: {
    fontSize: getResponsiveFontSize(14),
    color: '#888',
    marginLeft: getResponsiveSize(10),
  },
  currentStatusSection: {
    marginBottom: getResponsiveSize(16),
  },
  currentStatusCard: {
    borderRadius: getResponsiveSize(16),
    padding: getResponsiveSize(20),
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: getResponsiveSize(16),
  },
  currentStatusTitle: {
    fontSize: getResponsiveFontSize(16),
    fontWeight: '700',
    color: '#E0E0E0',
    marginLeft: getResponsiveSize(10),
  },
  statusInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: getResponsiveSize(12),
  },
  statusBadge: {
    width: getResponsiveSize(16),
    height: getResponsiveSize(16),
    borderRadius: getResponsiveSize(8),
    marginRight: getResponsiveSize(10),
  },
  statusLabel: {
    fontSize: getResponsiveFontSize(18),
    fontWeight: '800',
    color: '#E0E0E0',
  },
  datesInfo: {
    marginTop: getResponsiveSize(12),
  },
  dateInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: getResponsiveSize(8),
  },
  statusDates: {
    fontSize: getResponsiveFontSize(14),
    color: '#E0E0E0',
    marginLeft: getResponsiveSize(8),
    fontWeight: '600',
  },
  descriptionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: getResponsiveSize(8),
  },
  statusDescription: {
    fontSize: getResponsiveFontSize(13),
    color: '#888',
    marginLeft: getResponsiveSize(8),
    flex: 1,
    fontStyle: 'italic',
    lineHeight: getResponsiveFontSize(18),
  },
  lastUpdated: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: getResponsiveSize(12),
    paddingTop: getResponsiveSize(12),
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 215, 0, 0.2)',
  },
  lastUpdatedText: {
    fontSize: getResponsiveFontSize(12),
    color: '#888',
    marginLeft: getResponsiveSize(6),
  },
  submitButton: {
    marginTop: getResponsiveSize(20),
    marginBottom: getResponsiveSize(20),
    borderRadius: getResponsiveSize(15),
    overflow: 'hidden',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: getResponsiveSize(16),
    paddingHorizontal: getResponsiveSize(20),
  },
  submitText: {
    color: '#1a1a1a',
    fontSize: getResponsiveFontSize(16),
    fontWeight: '700',
    marginLeft: getResponsiveSize(8),
  },
  hint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: getResponsiveSize(12),
    backgroundColor: 'rgba(42, 42, 42, 0.6)',
    borderRadius: getResponsiveSize(10),
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.2)',
  },
  hintText: {
    fontSize: getResponsiveFontSize(12),
    color: '#FFD700',
    marginLeft: getResponsiveSize(6),
    textAlign: 'center',
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: getResponsiveSize(16),
    fontSize: getResponsiveFontSize(16),
    color: '#E0E0E0',
    fontWeight: '600',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: getResponsiveSize(20),
  },
  errorText: {
    fontSize: getResponsiveFontSize(18),
    fontWeight: '700',
    color: '#E0E0E0',
    marginTop: getResponsiveSize(16),
    textAlign: 'center',
  },
  errorSubtext: {
    fontSize: getResponsiveFontSize(14),
    color: '#888',
    marginTop: getResponsiveSize(8),
    textAlign: 'center',
  },
  retryButton: {
    marginTop: getResponsiveSize(20),
    borderRadius: getResponsiveSize(12),
    overflow: 'hidden',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  retryButtonGradient: {
    paddingHorizontal: getResponsiveSize(24),
    paddingVertical: getResponsiveSize(14),
  },
  retryButtonText: {
    color: '#1a1a1a',
    fontSize: getResponsiveFontSize(14),
    fontWeight: '600',
  },
});