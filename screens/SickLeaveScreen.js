import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { LinearGradient } from 'expo-linear-gradient';
import { addDoc, collection, doc, getDocs, query, updateDoc, where } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import {
  Alert,
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

  // ОБНОВЛЕННЫЙ МАССИВ СТАТУСОВ - ДОБАВЛЕН "БЕЗ СОДЕРЖАНИЯ"
  const statusOptions = [
    { value: 'working', label: 'На работе', color: '#4CAF50' },
    { value: 'sick', label: 'Больничный', color: '#FF9800' },
    { value: 'vacation', label: 'Отпуск', color: '#2196F3' },
    { value: 'dayoff', label: 'Отгул', color: '#9C27B0' },
    { value: 'unpaid', label: 'Без содержания', color: '#FF0000' }, // НОВЫЙ СТАТУС
    { value: 'other', label: 'Другое', color: '#795548' },
  ];

  // ... остальной код без изменений ...
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
      return `${day}.${month}.${year}`;
    } catch (error) {
      return dateString;
    }
  };

  const getStatusColor = (statusValue) => {
    const option = statusOptions.find(opt => opt.value === statusValue);
    return option ? option.color : '#666';
  };

  const getStatusInfo = () => {
    const currentStatus = statusOptions.find(opt => opt.value === status);
    return {
      label: currentStatus?.label || 'Неизвестно',
      color: currentStatus?.color || '#666'
    };
  };

  if (initialLoad) {
    return (
      <LinearGradient colors={['#FFF8E1', '#FFE4B5', '#FFD700']} style={styles.container}>
        <View style={styles.loadingContainer}>
          <Ionicons name="hourglass-outline" size={50} color="#DAA520" />
          <Text style={styles.loadingText}>Загрузка...</Text>
        </View>
      </LinearGradient>
    );
  }

  if (!userEmail) {
    return (
      <LinearGradient colors={['#FFF8E1', '#FFE4B5', '#FFD700']} style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="warning-outline" size={50} color="#FF6B6B" />
          <Text style={styles.errorText}>Ошибка загрузки данных</Text>
          <Text style={styles.errorSubtext}>Email не доступен</Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.retryButtonText}>Вернуться назад</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={['#FFF8E1', '#FFE4B5', '#FFD700']}
      style={styles.container}
    >
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoid}
      >
        <ScrollView showsVerticalScrollIndicator={false}>
          <LinearGradient
            colors={['rgba(255, 248, 225, 0.95)', 'rgba(255, 228, 181, 0.9)']}
            style={styles.header}
          >
            <View style={styles.headerContent}>
              <TouchableOpacity 
                onPress={() => navigation.goBack()}
                style={styles.backButton}
              >
                <Ionicons name="arrow-back" size={24} color="#3E2723" />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>Мой статус</Text>
              <View style={styles.headerSpacer} />
            </View>
          </LinearGradient>

          <View style={styles.formContainer}>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Информация о сотруднике</Text>
              
              <Text style={styles.label}>ФИО *</Text>
              <TextInput
                style={styles.textInput}
                value={fullName}
                onChangeText={setFullName}
                placeholder="Введите ваше ФИО"
                placeholderTextColor="#8B8B8B"
                editable={!loading}
              />

              <Text style={styles.label}>Должность *</Text>
              <TextInput
                style={styles.textInput}
                value={position}
                onChangeText={setPosition}
                placeholder="Введите вашу должность"
                placeholderTextColor="#8B8B8B"
                editable={!loading}
              />

              <View style={styles.emailInfo}>
                <Ionicons name="mail-outline" size={14} color="#8B8B8B" />
                <Text style={styles.emailText}>Email: {userEmail}</Text>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Текущий статус</Text>
              
              <View style={styles.statusContainer}>
                {statusOptions.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.statusButton,
                      status === option.value && [styles.statusButtonActive, { borderColor: option.color }]
                    ]}
                    onPress={() => {
                      setStatus(option.value);
                      if (option.value === 'working') {
                        handleClearDates();
                      }
                    }}
                    disabled={loading}
                  >
                    <View style={[styles.statusDot, { backgroundColor: option.color }]} />
                    <Text style={[
                      styles.statusButtonText,
                      status === option.value && styles.statusButtonTextActive
                    ]}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {status !== 'working' && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Период отсутствия</Text>
                
                <View style={styles.dateRow}>
                  <View style={styles.dateColumn}>
                    <Text style={styles.label}>От даты *</Text>
                    <TouchableOpacity 
                      style={styles.dateInput}
                      onPress={() => setShowStartDatePicker(true)}
                      disabled={loading}
                    >
                      <Ionicons name="calendar-outline" size={20} color="#DAA520" />
                      <Text style={startDate ? styles.dateText : styles.datePlaceholder}>
                        {startDate ? formatDate(startDate) : 'Выберите дату'}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.dateColumn}>
                    <Text style={styles.label}>До даты *</Text>
                    <TouchableOpacity 
                      style={styles.dateInput}
                      onPress={() => setShowEndDatePicker(true)}
                      disabled={loading}
                    >
                      <Ionicons name="calendar-outline" size={20} color="#DAA520" />
                      <Text style={endDate ? styles.dateText : styles.datePlaceholder}>
                        {endDate ? formatDate(endDate) : 'Выберите дату'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <Text style={styles.label}>Причина отсутствия</Text>
                <TextInput
                  style={[styles.textInput, styles.textArea]}
                  value={description}
                  onChangeText={setDescription}
                  placeholder="Опишите причину отсутствия..."
                  placeholderTextColor="#8B8B8B"
                  multiline
                  numberOfLines={3}
                  editable={!loading}
                />
              </View>
            )}

            <View style={styles.currentStatus}>
              <View style={styles.statusIndicator}>
                <View 
                  style={[
                    styles.statusBadge,
                    { backgroundColor: getStatusColor(status) }
                  ]}
                />
                <Text style={styles.currentStatusText}>
                  Текущий статус: <Text style={styles.statusValue}>
                    {getStatusInfo().label}
                  </Text>
                </Text>
              </View>
              
              {status !== 'working' && startDate && endDate && (
                <View style={styles.datesInfo}>
                  <Text style={styles.statusDates}>
                    Период: {formatDate(startDate)} - {formatDate(endDate)}
                  </Text>
                  {description && (
                    <Text style={styles.statusDescription}>
                      Причина: {description}
                    </Text>
                  )}
                </View>
              )}

              {existingEmployee && existingEmployee.lastUpdated && (
                <Text style={styles.lastUpdated}>
                  Последнее обновление: {existingEmployee.lastUpdated.toDate?.().toLocaleDateString('ru-RU') || 'неизвестно'}
                </Text>
              )}
            </View>

            <TouchableOpacity 
              style={[styles.submitButton, loading && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={loading}
            >
              <LinearGradient
                colors={['#FFD700', '#DAA520']}
                style={styles.submitGradient}
              >
                {loading ? (
                  <Ionicons name="hourglass-outline" size={20} color="white" />
                ) : (
                  <Ionicons name="save-outline" size={20} color="white" />
                )}
                <Text style={styles.submitText}>
                  {loading ? 'Сохранение...' : (existingEmployee ? 'Обновить статус' : 'Сохранить статус')}
                </Text>
              </LinearGradient>
            </TouchableOpacity>

            <View style={styles.hint}>
              <Ionicons name="information-circle-outline" size={16} color="#8B8B8B" />
              <Text style={styles.hintText}>
                Администратор увидит ваш статус в разделе "Список артистов"
              </Text>
            </View>
          </View>
        </ScrollView>

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

// Стили остаются без изменений
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardAvoid: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 15,
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
    padding: 5,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#3E2723',
    textAlign: 'center',
  },
  headerSpacer: {
    width: 24,
  },
  formContainer: {
    padding: 20,
  },
  section: {
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 15,
    padding: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: 'rgba(218, 165, 32, 0.3)',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#3E2723',
    marginBottom: 15,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3E2723',
    marginBottom: 8,
    marginTop: 10,
  },
  textInput: {
    backgroundColor: 'white',
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 14,
    color: '#3E2723',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  emailInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    padding: 10,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
  },
  emailText: {
    fontSize: 12,
    color: '#8B8B8B',
    marginLeft: 6,
  },
  statusContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statusButton: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  statusButtonActive: {
    backgroundColor: 'white',
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  statusButtonText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  statusButtonTextActive: {
    color: '#3E2723',
    fontWeight: '600',
  },
  dateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dateColumn: {
    width: '48%',
  },
  dateInput: {
    backgroundColor: 'white',
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateText: {
    fontSize: 14,
    color: '#3E2723',
    marginLeft: 10,
    fontWeight: '500',
  },
  datePlaceholder: {
    fontSize: 14,
    color: '#8B8B8B',
    marginLeft: 10,
  },
  currentStatus: {
    backgroundColor: 'rgba(255, 248, 225, 0.9)',
    borderRadius: 15,
    padding: 15,
    marginTop: 10,
    borderWidth: 1,
    borderColor: 'rgba(218, 165, 32, 0.3)',
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusBadge: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 10,
  },
  currentStatusText: {
    fontSize: 14,
    color: '#3E2723',
    fontWeight: '500',
  },
  statusValue: {
    fontWeight: 'bold',
  },
  datesInfo: {
    marginTop: 8,
  },
  statusDates: {
    fontSize: 13,
    color: '#3E2723',
    fontWeight: '500',
    marginBottom: 4,
  },
  statusDescription: {
    fontSize: 13,
    color: '#8B8B8B',
    fontStyle: 'italic',
  },
  lastUpdated: {
    fontSize: 11,
    color: '#8B8B8B',
    marginTop: 8,
    textAlign: 'center',
  },
  submitButton: {
    marginTop: 30,
    marginBottom: 20,
    borderRadius: 15,
    overflow: 'hidden',
    shadowColor: '#DAA520',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 5,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    paddingHorizontal: 20,
  },
  submitText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  hint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
  },
  hintText: {
    fontSize: 12,
    color: '#8B8B8B',
    marginLeft: 6,
    textAlign: 'center',
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#3E2723',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#3E2723',
    marginTop: 10,
    textAlign: 'center',
  },
  errorSubtext: {
    fontSize: 14,
    color: '#8B8B8B',
    marginTop: 5,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 20,
    backgroundColor: '#DAA520',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
});