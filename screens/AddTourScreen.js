import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { LinearGradient } from 'expo-linear-gradient';
import { addDoc, collection } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import {
  Dimensions,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { db } from '../firebaseConfig';

// ✅ АДАПТИВНЫЕ РАЗМЕРЫ (как в CalendarScreen)
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

// ✅ НАДЁЖНАЯ ФУНКЦИЯ ПАРСИНГА ДАТЫ
const parseDate = (dateString) => {
  if (!dateString) return new Date();
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day); // month - 1 потому что месяцы в JS начинаются с 0
};

// ✅ WEB DATE PICKER COMPONENT
const WebDatePicker = ({ value, onChange, label, minDate }) => {
  const formatForInput = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const handleChange = (e) => {
    const newDate = parseDate(e.target.value);
    if (!isNaN(newDate.getTime())) {
      onChange(newDate);
    }
  };

  return (
    <input
      type="date"
      value={formatForInput(value)}
      onChange={handleChange}
      min={minDate ? formatForInput(minDate) : undefined}
      style={{
        backgroundColor: 'rgba(42, 42, 42, 0.8)',
        border: '1px solid rgba(74, 144, 226, 0.3)',
        borderRadius: 12,
        padding: '14px 16px',
        fontSize: 14,
        color: '#E0E0E0',
        width: '100%',
        boxSizing: 'border-box',
        cursor: 'pointer',
      }}
    />
  );
};

// ✅ CUSTOM ALERT COMPONENT
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
                        : ['#4A90E2', '#357ABD']
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

export default function AddTourScreen({ navigation, route }) {
  const { date, userRole } = route.params || {};
  
  // ✅ ИСПОЛЬЗУЕМ НАДЁЖНЫЙ ПАРСИНГ ДАТЫ
  const initialDate = date ? parseDate(date) : new Date();
  
  const [title, setTitle] = useState('');
  const [startDate, setStartDate] = useState(initialDate);
  const [endDate, setEndDate] = useState(initialDate);
  const [description, setDescription] = useState('');
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);

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

  // ✅ DEBUG: Логируем полученную дату
  useEffect(() => {
    console.log('📅 AddTourScreen: Получена дата из параметров:', date);
    console.log('📅 AddTourScreen: Парсинг даты:', initialDate.toISOString());
  }, []);

  const formatDateForDisplay = (date) => {
    return date.toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const formatDateForFirebase = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const onStartDateChange = (event, selectedDate) => {
    if (Platform.OS !== 'web') {
      setShowStartDatePicker(false);
    }
    if (selectedDate) {
      setStartDate(selectedDate);
      if (selectedDate > endDate) {
        setEndDate(selectedDate);
      }
    }
  };

  const onEndDateChange = (event, selectedDate) => {
    if (Platform.OS !== 'web') {
      setShowEndDatePicker(false);
    }
    if (selectedDate && selectedDate >= startDate) {
      setEndDate(selectedDate);
    } else if (selectedDate) {
      showAlert('Ошибка', 'Дата окончания не может быть раньше даты начала');
    }
  };

  // ✅ WEB HANDLERS
  const handleWebStartDateChange = (newDate) => {
    setStartDate(newDate);
    if (newDate > endDate) {
      setEndDate(newDate);
    }
  };

  const handleWebEndDateChange = (newDate) => {
    if (newDate >= startDate) {
      setEndDate(newDate);
    } else {
      showAlert('Ошибка', 'Дата окончания не может быть раньше даты начала');
    }
  };

  const handleSubmit = async () => {
    if (!title.trim() || !description.trim()) {
      showAlert('Ошибка', 'Пожалуйста, заполните все обязательные поля');
      return;
    }

    if (startDate > endDate) {
      showAlert('Ошибка', 'Дата окончания не может быть раньше даты начала');
      return;
    }

    try {
      const tourData = {
        title: title.trim(),
        startDate: formatDateForFirebase(startDate),
        endDate: formatDateForFirebase(endDate),
        description: description.trim(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      console.log('📅 Сохраняем гастроли:', tourData);

      await addDoc(collection(db, 'tours'), tourData);

      showAlert(
        'Успех',
        'Гастроли успешно добавлены',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      console.error('Ошибка при сохранении гастролей:', error);
      showAlert('Ошибка', 'Не удалось сохранить гастроли');
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#0a0a0a', '#1a1a1a', '#2a2a2a']}
        style={styles.background}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        {/* 🌙 ХЕДЕР В СТИЛЕ CALENDARSCREEN */}
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
            <TouchableOpacity 
              onPress={() => navigation.goBack()}
              style={styles.backButton}
            >
              <Ionicons name="arrow-back" size={getResponsiveSize(24)} color="#4A90E2" />
            </TouchableOpacity>
            
            <View style={styles.titleSection}>
              <View style={styles.titleIconContainer}>
                <LinearGradient
                  colors={['#4A90E2', '#357ABD']}
                  style={styles.titleIconGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Ionicons name="airplane" size={getResponsiveSize(22)} color="#1a1a1a" />
                </LinearGradient>
              </View>
              <View style={styles.titleTextContainer}>
                <Text style={styles.mainTitle}>Добавить гастроли</Text>
                <Text style={styles.subtitle}>Заполните информацию о гастролях</Text>
              </View>
            </View>

            <View style={styles.headerSpacer} />
          </View>
        </LinearGradient>

        <ScrollView style={styles.formContainer} showsVerticalScrollIndicator={false}>
          {/* ✅ ОТЛАДОЧНАЯ ИНФОРМАЦИЯ */}
          {__DEV__ && (
            <View style={styles.debugInfo}>
              <Text style={styles.debugText}>
                📅 Выбранная дата: {date || 'не передана'}
              </Text>
              <Text style={styles.debugText}>
                📅 Начало: {formatDateForFirebase(startDate)}
              </Text>
              <Text style={styles.debugText}>
                📅 Конец: {formatDateForFirebase(endDate)}
              </Text>
            </View>
          )}

          {/* Заголовок */}
          <Text style={styles.label}>Название гастролей *</Text>
          <TextInput
            style={styles.textInput}
            value={title}
            onChangeText={setTitle}
            placeholder="Введите название гастролей..."
            placeholderTextColor="#888"
            selectionColor="#4A90E2"
          />

          {/* Дата начала */}
          <Text style={styles.label}>Дата начала *</Text>
          {Platform.OS === 'web' ? (
            <WebDatePicker 
              value={startDate} 
              onChange={handleWebStartDateChange}
              label="Дата начала"
            />
          ) : (
            <TouchableOpacity 
              style={styles.dateInput}
              onPress={() => setShowStartDatePicker(true)}
            >
              <LinearGradient
                colors={['rgba(74, 144, 226, 0.2)', 'rgba(53, 122, 189, 0.2)']}
                style={styles.dateInputGradient}
              >
                <Ionicons name="calendar" size={getResponsiveSize(20)} color="#4A90E2" />
                <Text style={styles.dateText}>
                  {formatDateForDisplay(startDate)}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          )}

          {/* Дата окончания */}
          <Text style={styles.label}>Дата окончания *</Text>
          {Platform.OS === 'web' ? (
            <WebDatePicker 
              value={endDate} 
              onChange={handleWebEndDateChange}
              label="Дата окончания"
              minDate={startDate}
            />
          ) : (
            <TouchableOpacity 
              style={styles.dateInput}
              onPress={() => setShowEndDatePicker(true)}
            >
              <LinearGradient
                colors={['rgba(74, 144, 226, 0.2)', 'rgba(53, 122, 189, 0.2)']}
                style={styles.dateInputGradient}
              >
                <Ionicons name="calendar" size={getResponsiveSize(20)} color="#4A90E2" />
                <Text style={styles.dateText}>
                  {formatDateForDisplay(endDate)}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          )}

          {/* Описание */}
          <Text style={styles.label}>Описание гастролей *</Text>
          <TextInput
            style={[styles.textInput, styles.descriptionInput]}
            value={description}
            onChangeText={setDescription}
            placeholder="Опишите детали гастролей..."
            placeholderTextColor="#888"
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            selectionColor="#4A90E2"
          />

          {/* Информация о периоде */}
          <LinearGradient
            colors={['rgba(42, 42, 42, 0.8)', 'rgba(35, 35, 35, 0.9)']}
            style={styles.infoCard}
          >
            <View style={styles.infoRow}>
              <Ionicons name="time" size={getResponsiveSize(18)} color="#4A90E2" />
              <Text style={styles.infoLabel}>Продолжительность:</Text>
              <Text style={styles.infoValue}>
                {Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1} дней
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="information-circle" size={getResponsiveSize(18)} color="#4A90E2" />
              <Text style={styles.infoLabel}>Период включает:</Text>
              <Text style={styles.infoValue}>
                {Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1} дат
              </Text>
            </View>
          </LinearGradient>

          {/* Кнопка сохранения */}
          <TouchableOpacity 
            style={styles.submitButton}
            onPress={handleSubmit}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={['#4A90E2', '#357ABD']}
              style={styles.submitGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Ionicons name="airplane" size={getResponsiveSize(22)} color="#1a1a1a" />
              <Text style={styles.submitText}>Сохранить гастроли</Text>
            </LinearGradient>
          </TouchableOpacity>
        </ScrollView>

        {/* Date Pickers - ТОЛЬКО ДЛЯ NATIVE */}
        {Platform.OS !== 'web' && showStartDatePicker && (
          <DateTimePicker
            value={startDate}
            mode="date"
            display="default"
            onChange={onStartDateChange}
          />
        )}

        {Platform.OS !== 'web' && showEndDatePicker && (
          <DateTimePicker
            value={endDate}
            mode="date"
            display="default"
            minimumDate={startDate}
            onChange={onEndDateChange}
          />
        )}

        {/* ✅ CUSTOM ALERT */}
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  background: {
    flex: 1,
  },
  
  // 🌙 ХЕДЕР В СТИЛЕ CALENDARSCREEN
  header: {
    paddingHorizontal: getResponsiveSize(20),
    paddingTop: Platform.OS === 'ios' ? getResponsiveSize(50) : getResponsiveSize(30),
    paddingBottom: getResponsiveSize(24),
    borderBottomLeftRadius: getResponsiveSize(30),
    borderBottomRightRadius: getResponsiveSize(30),
    shadowColor: '#4A90E2',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
    position: 'relative',
    overflow: 'hidden',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(74, 144, 226, 0.3)',
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
    backgroundColor: '#4A90E2',
    top: -getResponsiveSize(80),
    right: -getResponsiveSize(50),
  },
  decorCircle2: {
    width: getResponsiveSize(150),
    height: getResponsiveSize(150),
    backgroundColor: '#357ABD',
    bottom: -getResponsiveSize(60),
    left: -getResponsiveSize(40),
  },
  decorCircle3: {
    width: getResponsiveSize(100),
    height: getResponsiveSize(100),
    backgroundColor: '#2E5A87',
    top: getResponsiveSize(40),
    left: getResponsiveSize(30),
  },
  
  headerContent: {
    position: 'relative',
    zIndex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  
  backButton: {
    padding: getResponsiveSize(5),
  },
  
  titleSection: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(42, 42, 42, 0.6)',
    paddingHorizontal: getResponsiveSize(16),
    paddingVertical: getResponsiveSize(14),
    borderRadius: getResponsiveSize(16),
    borderWidth: 1,
    borderColor: 'rgba(74, 144, 226, 0.2)',
    marginHorizontal: getResponsiveSize(10),
  },
  
  titleIconContainer: {
    marginRight: getResponsiveSize(14),
  },
  titleIconGradient: {
    width: getResponsiveSize(48),
    height: getResponsiveSize(48),
    borderRadius: getResponsiveSize(14),
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#4A90E2',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 5,
  },
  
  titleTextContainer: {
    flex: 1,
  },
  mainTitle: {
    fontSize: getResponsiveFontSize(18),
    fontWeight: '800',
    color: '#E0E0E0',
    letterSpacing: 0.3,
    marginBottom: getResponsiveSize(2),
  },
  subtitle: {
    fontSize: getResponsiveFontSize(12),
    color: '#999',
    fontWeight: '500',
  },
  
  headerSpacer: {
    width: getResponsiveSize(24),
  },
  
  formContainer: {
    flex: 1,
    padding: getResponsiveSize(20),
  },

  // ✅ DEBUG INFO
  debugInfo: {
    backgroundColor: 'rgba(74, 144, 226, 0.2)',
    borderRadius: 8,
    padding: 10,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: 'rgba(74, 144, 226, 0.3)',
  },
  debugText: {
    color: '#4A90E2',
    fontSize: 12,
    marginBottom: 2,
  },
  
  label: {
    fontSize: getResponsiveFontSize(14),
    fontWeight: '600',
    color: '#E0E0E0',
    marginBottom: getResponsiveSize(8),
    marginTop: getResponsiveSize(15),
  },
  
  textInput: {
    backgroundColor: 'rgba(42, 42, 42, 0.8)',
    borderRadius: getResponsiveSize(12),
    paddingHorizontal: getResponsiveSize(16),
    paddingVertical: getResponsiveSize(14),
    fontSize: getResponsiveFontSize(14),
    color: '#E0E0E0',
    borderWidth: 1,
    borderColor: 'rgba(74, 144, 226, 0.3)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  
  descriptionInput: {
    minHeight: getResponsiveSize(120),
    textAlignVertical: 'top',
  },
  
  dateInput: {
    borderRadius: getResponsiveSize(12),
    overflow: 'hidden',
    shadowColor: '#4A90E2',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  
  dateInputGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: getResponsiveSize(16),
    paddingVertical: getResponsiveSize(14),
    borderRadius: getResponsiveSize(12),
    borderWidth: 1,
    borderColor: 'rgba(74, 144, 226, 0.3)',
  },
  
  dateText: {
    fontSize: getResponsiveFontSize(14),
    color: '#E0E0E0',
    marginLeft: getResponsiveSize(10),
    fontWeight: '500',
  },
  
  infoCard: {
    borderRadius: getResponsiveSize(12),
    padding: getResponsiveSize(16),
    borderWidth: 1,
    borderColor: 'rgba(74, 144, 226, 0.2)',
    marginTop: getResponsiveSize(10),
    marginBottom: getResponsiveSize(10),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: getResponsiveSize(8),
  },
  
  infoLabel: {
    fontSize: getResponsiveFontSize(12),
    color: '#999',
    marginLeft: getResponsiveSize(8),
    marginRight: getResponsiveSize(8),
    width: getResponsiveSize(120),
  },
  
  infoValue: {
    fontSize: getResponsiveFontSize(12),
    color: '#4A90E2',
    fontWeight: '600',
    flex: 1,
  },
  
  submitButton: {
    marginTop: getResponsiveSize(30),
    marginBottom: getResponsiveSize(30),
    borderRadius: getResponsiveSize(15),
    overflow: 'hidden',
    shadowColor: '#4A90E2',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  
  submitGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: getResponsiveSize(16),
    paddingHorizontal: getResponsiveSize(25),
  },
  
  submitText: {
    color: '#1a1a1a',
    fontSize: getResponsiveFontSize(16),
    fontWeight: 'bold',
    marginLeft: getResponsiveSize(8),
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
    shadowColor: '#4A90E2',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(74, 144, 226, 0.3)',
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
  customAlertButtonDestructive: {},
  customAlertButtonCancel: {},
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