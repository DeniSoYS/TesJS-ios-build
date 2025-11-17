// screens/AddReminderScreen.js
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { LinearGradient } from 'expo-linear-gradient';
import * as Notifications from 'expo-notifications';
import { addDoc, collection, doc, updateDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import {
  Alert,
  Dimensions,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text, TextInput, TouchableOpacity,
  View
} from 'react-native';
import { auth, db } from '../firebaseConfig';
import { sendPushNotification } from '../utils/pushNotifications';
import {
  NOTIFICATION_TIMING,
  REMINDER_TYPES, REMINDER_TYPE_LABELS,
  TARGET_USERS, TARGET_USER_LABELS
} from '../utils/reminderTypes';

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

async function scheduleNotification(reminder, oldNotificationId = null) {
  try {
    const notificationTime = new Date(reminder.eventDate);
    notificationTime.setSeconds(notificationTime.getSeconds() - reminder.notifyBefore);

    if (notificationTime <= new Date()) {
      console.log('⏰ Время уведомления уже прошло');
      return null;
    }

    if (oldNotificationId) {
      await Notifications.cancelScheduledNotificationAsync(oldNotificationId);
    }

    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: `🎵 ${reminder.title}`,
        body: reminder.message,
        data: { reminderId: reminder.id || 'new', type: 'reminder' },
        sound: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
      },
      trigger: { date: notificationTime },
    });

    console.log('✅ Уведомление запланировано:', notificationId);
    return notificationId;
  } catch (error) {
    console.error('❌ Ошибка планирования:', error);
    return null;
  }
}

export default function AddReminderScreen({ navigation, route }) {
  const { userRole, editReminder } = route.params;
  
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [reminderType, setReminderType] = useState(REMINDER_TYPES.GENERAL);
  const [eventDate, setEventDate] = useState(new Date());
  const [notifyBefore, setNotifyBefore] = useState(3600);
  const [targetUsers, setTargetUsers] = useState(TARGET_USERS.ALL);
  const [isActive, setIsActive] = useState(true);
  
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showTypeModal, setShowTypeModal] = useState(false);
  const [showTimingModal, setShowTimingModal] = useState(false);
  const [showTargetModal, setShowTargetModal] = useState(false);
  const [loading, setLoading] = useState(false);

  // Проверка прав доступа
  useEffect(() => {
    if (userRole !== 'admin' && !editReminder) {
      Alert.alert('Ошибка доступа', 'Только администраторы могут создавать напоминания');
      navigation.goBack();
      return;
    }
  }, [userRole, editReminder]);

  useEffect(() => {
    if (editReminder) {
      setTitle(editReminder.title || '');
      setMessage(editReminder.message || '');
      setReminderType(editReminder.type || REMINDER_TYPES.GENERAL);
      setNotifyBefore(editReminder.notifyBefore || 3600);
      setTargetUsers(editReminder.targetUsers || TARGET_USERS.ALL);
      setIsActive(editReminder.isActive !== false);
      if (editReminder.eventDate) setEventDate(editReminder.eventDate.toDate());
    }
  }, [editReminder]);

  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) setEventDate(selectedDate);
  };

  const handleTimeChange = (event, selectedTime) => {
    setShowTimePicker(false);
    if (selectedTime) {
      const newDate = new Date(eventDate);
      newDate.setHours(selectedTime.getHours());
      newDate.setMinutes(selectedTime.getMinutes());
      setEventDate(newDate);
    }
  };

  const validateForm = () => {
    if (!title.trim()) { Alert.alert('Ошибка', 'Введите заголовок'); return false; }
    if (!message.trim()) { Alert.alert('Ошибка', 'Введите текст'); return false; }
    if (eventDate < new Date()) { Alert.alert('Ошибка', 'Дата не может быть в прошлом'); return false; }
    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) return;
    
    // Дополнительная проверка прав
    if (userRole !== 'admin') {
      Alert.alert('Ошибка', 'Только администраторы могут создавать напоминания');
      return;
    }

    try {
      setLoading(true);
      const reminderData = {
        title: title.trim(), 
        message: message.trim(), 
        type: reminderType,
        eventDate, 
        notifyBefore, 
        targetUsers, 
        isActive,
        createdBy: auth.currentUser.uid, 
        updatedAt: new Date(),
      };

      let reminderId, messageText;
      
      if (editReminder) {
        reminderId = editReminder.id;
        const localNotificationId = await scheduleNotification(
          { ...reminderData, id: reminderId }, 
          editReminder.localNotificationId
        );
        await updateDoc(doc(db, 'reminders', reminderId), { ...reminderData, localNotificationId });
        messageText = 'Напоминание обновлено!';
      } else {
        reminderData.createdAt = new Date();
        const docRef = await addDoc(collection(db, 'reminders'), reminderData);
        reminderId = docRef.id;
        const localNotificationId = await scheduleNotification({ ...reminderData, id: reminderId });
        await updateDoc(doc(db, 'reminders', reminderId), { localNotificationId });
        
        // Отправляем push-уведомление при создании
        await sendPushNotification({ ...reminderData, id: reminderId });
        messageText = 'Напоминание создано!';
      }

      Alert.alert('Успех', messageText, [{ text: 'OK', onPress: () => navigation.goBack() }]);
    } catch (error) {
      console.error('Ошибка:', error);
      Alert.alert('Ошибка', 'Не удалось сохранить напоминание');
    } finally {
      setLoading(false);
    }
  };

  const formatDateTime = (date) => date.toLocaleString('ru-RU', {
    day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
  });
  const getTimingLabel = (sec) => NOTIFICATION_TIMING.find(t => t.value === sec)?.label || 'Неизвестно';
  const getTypeLabel = (type) => REMINDER_TYPE_LABELS[type] || 'Неизвестно';
  const getTargetLabel = (target) => TARGET_USER_LABELS[target] || 'Неизвестно';

  const renderModal = (visible, setVisible, title, values, selected, setSelected, getLabel) => (
    <Modal animationType="slide" transparent visible={visible} onRequestClose={() => setVisible(false)}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <LinearGradient colors={['rgba(26,26,26,0.98)', 'rgba(35,35,35,0.95)']} style={styles.modalGradient}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{title}</Text>
              <TouchableOpacity onPress={() => setVisible(false)}>
                <Ionicons name="close" size={24} color="#FFD700" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalList}>
              {values.map((val) => (
                <TouchableOpacity 
                  key={val} 
                  style={[styles.modalItem, selected === val && styles.modalItemSelected]}
                  onPress={() => { setSelected(val); setVisible(false); }}
                >
                  <Text style={[styles.modalItemText, selected === val && styles.modalItemTextSelected]}>
                    {getLabel(val)}
                  </Text>
                  {selected === val && <Ionicons name="checkmark" size={20} color="#FFD700" />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </LinearGradient>
        </View>
      </View>
    </Modal>
  );

  return (
    <LinearGradient colors={['#0a0a0a', '#1a1a1a', '#2a2a2a']} style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{flex:1}}>
        
        {/* 🌙 ХЕДЕР В СТИЛЕ КАЛЕНДАРЯ */}
        <LinearGradient colors={['rgba(26,26,26,0.98)', 'rgba(35,35,35,0.95)']} style={styles.header}>
          <View style={styles.headerContent}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color="#FFD700" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>
              {editReminder ? 'Редактировать напоминание' : 'Новое напоминание'}
            </Text>
            <View style={{width:24}} />
          </View>
        </LinearGradient>

        <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollView}>
          <View style={styles.formContainer}>

            {/* Поле заголовка */}
            <View style={styles.fieldContainer}>
              <Text style={styles.label}>Заголовок *</Text>
              <LinearGradient colors={['rgba(42,42,42,0.8)', 'rgba(35,35,35,0.9)']} style={styles.inputGradient}>
                <View style={styles.inputField}>
                  <Ionicons name="text" size={20} color="#FFD700" />
                  <TextInput 
                    style={styles.input} 
                    value={title} 
                    onChangeText={setTitle} 
                    placeholder="Например: Репетиция хора" 
                    placeholderTextColor="#888" 
                    maxLength={100} 
                  />
                </View>
              </LinearGradient>
            </View>

            {/* Поле текста */}
            <View style={styles.fieldContainer}>
              <Text style={styles.label}>Текст напоминания *</Text>
              <LinearGradient colors={['rgba(42,42,42,0.8)', 'rgba(35,35,35,0.9)']} style={styles.inputGradientLarge}>
                <View style={styles.inputFieldLarge}>
                  <Ionicons name="document-text" size={20} color="#FFD700" style={{marginTop:4}} />
                  <TextInput 
                    style={styles.inputMultiline} 
                    value={message} 
                    onChangeText={setMessage}
                    placeholder="Опишите детали события..." 
                    placeholderTextColor="#888" 
                    multiline 
                    numberOfLines={4} 
                    textAlignVertical="top" 
                    maxLength={500} 
                  />
                </View>
              </LinearGradient>
            </View>

            {/* Тип напоминания */}
            <View style={styles.fieldContainer}>
              <Text style={styles.label}>Тип события</Text>
              <TouchableOpacity 
                style={styles.dropdown} 
                onPress={() => setShowTypeModal(true)}
              >
                <LinearGradient colors={['rgba(42,42,42,0.8)', 'rgba(35,35,35,0.9)']} style={styles.dropdownGradient}>
                  <Ionicons name="pricetags" size={20} color="#FFD700" />
                  <Text style={styles.dropdownText}>{getTypeLabel(reminderType)}</Text>
                  <Ionicons name="chevron-down" size={20} color="#FFD700" />
                </LinearGradient>
              </TouchableOpacity>
            </View>

            {/* Дата и время */}
            <View style={styles.fieldContainer}>
              <Text style={styles.label}>Дата и время события *</Text>
              <View style={styles.dateTimeContainer}>
                <TouchableOpacity 
                  style={styles.dateTimeButton} 
                  onPress={() => setShowDatePicker(true)}
                >
                  <LinearGradient colors={['rgba(42,42,42,0.8)', 'rgba(35,35,35,0.9)']} style={styles.dateTimeGradient}>
                    <Ionicons name="calendar" size={18} color="#FFD700" />
                    <Text style={styles.dateTimeText}>{eventDate.toLocaleDateString('ru-RU')}</Text>
                  </LinearGradient>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.dateTimeButton} 
                  onPress={() => setShowTimePicker(true)}
                >
                  <LinearGradient colors={['rgba(42,42,42,0.8)', 'rgba(35,35,35,0.9)']} style={styles.dateTimeGradient}>
                    <Ionicons name="time" size={18} color="#FFD700" />
                    <Text style={styles.dateTimeText}>
                      {eventDate.toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit'})}
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
              <Text style={styles.dateTimeInfo}>
                📅 {formatDateTime(eventDate)}
              </Text>
            </View>

            {/* Тайминг уведомления */}
            <View style={styles.fieldContainer}>
              <Text style={styles.label}>Уведомлять за</Text>
              <TouchableOpacity 
                style={styles.dropdown} 
                onPress={() => setShowTimingModal(true)}
              >
                <LinearGradient colors={['rgba(42,42,42,0.8)', 'rgba(35,35,35,0.9)']} style={styles.dropdownGradient}>
                  <Ionicons name="notifications" size={20} color="#FFD700" />
                  <Text style={styles.dropdownText}>{getTimingLabel(notifyBefore)}</Text>
                  <Ionicons name="chevron-down" size={20} color="#FFD700" />
                </LinearGradient>
              </TouchableOpacity>
            </View>

            {/* Получатели */}
            <View style={styles.fieldContainer}>
              <Text style={styles.label}>Получатели</Text>
              <TouchableOpacity 
                style={styles.dropdown} 
                onPress={() => setShowTargetModal(true)}
              >
                <LinearGradient colors={['rgba(42,42,42,0.8)', 'rgba(35,35,35,0.9)']} style={styles.dropdownGradient}>
                  <Ionicons name="people" size={20} color="#FFD700" />
                  <Text style={styles.dropdownText}>{getTargetLabel(targetUsers)}</Text>
                  <Ionicons name="chevron-down" size={20} color="#FFD700" />
                </LinearGradient>
              </TouchableOpacity>
            </View>

            {/* Статус */}
            <View style={styles.fieldContainer}>
              <Text style={styles.label}>Статус</Text>
              <TouchableOpacity 
                style={styles.statusContainer} 
                onPress={() => setIsActive(!isActive)}
              >
                <LinearGradient colors={['rgba(42,42,42,0.8)', 'rgba(35,35,35,0.9)']} style={styles.statusGradient}>
                  <View style={[styles.toggle, isActive ? styles.toggleActive : styles.toggleInactive]}>
                    <Ionicons name={isActive ? "checkmark" : "close"} size={16} color="#1a1a1a" />
                  </View>
                  <Text style={styles.statusText}>{isActive ? 'Активно' : 'Неактивно'}</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>

            {/* Информационная панель */}
            <View style={styles.infoBox}>
              <LinearGradient colors={['rgba(255,215,0,0.1)', 'rgba(255,165,0,0.05)']} style={styles.infoGradient}>
                <Text style={styles.infoTitle}>📋 Информация о напоминании:</Text>
                <Text style={styles.infoText}>• Событие: {formatDateTime(eventDate)}</Text>
                <Text style={styles.infoText}>• Уведомление: {getTimingLabel(notifyBefore)} до события</Text>
                <Text style={styles.infoText}>• Получатели: {getTargetLabel(targetUsers)}</Text>
                <Text style={styles.infoText}>• Статус: {isActive ? 'Активно' : 'Неактивно'}</Text>
              </LinearGradient>
            </View>

            {/* Кнопка сохранения */}
            <TouchableOpacity 
              style={[styles.saveWrapper, (!title || !message) && { opacity: 0.5 }]} 
              onPress={handleSave} 
              disabled={!title || !message || loading}
            >
              <LinearGradient 
                colors={(!title || !message || loading) ? 
                  ['#555', '#333'] : 
                  ['#FFD700', '#FFA500']} 
                style={styles.saveButton}
              >
                <Ionicons name={loading ? "hourglass-outline" : "notifications"} size={20} color="#1a1a1a" />
                <Text style={styles.saveText}>
                  {loading ? 'Сохранение...' : (editReminder ? 'Обновить напоминание' : 'Создать напоминание')}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
            
            <Text style={styles.requiredText}>
              * Обязательные поля
            </Text>
          </View>
        </ScrollView>

        {/* Пикеры и модальные окна */}
        {showDatePicker && (
          <DateTimePicker 
            value={eventDate} 
            mode="date" 
            display="default" 
            minimumDate={new Date()} 
            onChange={handleDateChange} 
          />
        )}
        {showTimePicker && (
          <DateTimePicker 
            value={eventDate} 
            mode="time" 
            display="default" 
            onChange={handleTimeChange} 
          />
        )}
        {renderModal(
          showTypeModal, 
          setShowTypeModal, 
          'Выберите тип события', 
          Object.values(REMINDER_TYPES), 
          reminderType, 
          setReminderType, 
          getTypeLabel
        )}
        {renderModal(
          showTimingModal, 
          setShowTimingModal, 
          'Когда уведомлять?', 
          NOTIFICATION_TIMING.map(t => t.value), 
          notifyBefore, 
          setNotifyBefore, 
          getTimingLabel
        )}
        {renderModal(
          showTargetModal, 
          setShowTargetModal, 
          'Кто получит уведомление?', 
          Object.values(TARGET_USERS), 
          targetUsers, 
          setTargetUsers, 
          getTargetLabel
        )}
      </KeyboardAvoidingView>
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
    justifyContent: 'space-between'
  }, 
  backButton: { 
    padding: getResponsiveSize(5),
  },
  headerTitle: {
    fontSize: getResponsiveFontSize(18),
    fontWeight: 'bold',
    color: '#E0E0E0',
    textAlign: 'center',
  },
  formContainer: { 
    padding: getResponsiveSize(20),
  },
  fieldContainer: { 
    marginBottom: getResponsiveSize(20),
  },
  label: {
    fontSize: getResponsiveFontSize(14),
    fontWeight: '600',
    color: '#E0E0E0',
    marginBottom: getResponsiveSize(8),
  },
  inputGradient: {
    borderRadius: getResponsiveSize(12),
    padding: getResponsiveSize(2),
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.3)',
  },
  inputGradientLarge: {
    borderRadius: getResponsiveSize(12),
    padding: getResponsiveSize(2),
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
    minHeight: getResponsiveSize(120),
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.3)',
  },
  inputField: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(42,42,42,0.9)',
    borderRadius: getResponsiveSize(10),
    paddingHorizontal: getResponsiveSize(15),
    paddingVertical: getResponsiveSize(12),
  },
  inputFieldLarge: {
    flexDirection: 'row',
    backgroundColor: 'rgba(42,42,42,0.9)',
    borderRadius: getResponsiveSize(10),
    paddingHorizontal: getResponsiveSize(15),
    paddingVertical: getResponsiveSize(12),
    minHeight: getResponsiveSize(116),
  },
  input: {
    flex: 1,
    marginLeft: getResponsiveSize(10),
    fontSize: getResponsiveFontSize(14),
    color: '#E0E0E0',
  }, 
  inputMultiline: {
    flex: 1,
    marginLeft: getResponsiveSize(10),
    fontSize: getResponsiveFontSize(14),
    color: '#E0E0E0',
    minHeight: getResponsiveSize(80),
  },
  dropdown: {
    borderRadius: getResponsiveSize(12),
    overflow: 'hidden',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  dropdownGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(42,42,42,0.9)',
    borderRadius: getResponsiveSize(12),
    padding: getResponsiveSize(15),
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.3)',
  },
  dropdownText: {
    flex: 1,
    marginLeft: getResponsiveSize(10),
    fontSize: getResponsiveFontSize(14),
    color: '#E0E0E0',
    fontWeight: '500',
  },
  dateTimeContainer: {
    flexDirection: 'row',
    gap: getResponsiveSize(10),
    marginBottom: getResponsiveSize(8),
  },
  dateTimeButton: {
    flex: 1,
    borderRadius: getResponsiveSize(12),
    overflow: 'hidden',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  dateTimeGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(42,42,42,0.9)',
    borderRadius: getResponsiveSize(12),
    padding: getResponsiveSize(15),
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.3)',
  },
  dateTimeText: {
    marginLeft: getResponsiveSize(8),
    fontSize: getResponsiveFontSize(14),
    color: '#E0E0E0',
    fontWeight: '500',
  },
  dateTimeInfo: {
    fontSize: getResponsiveFontSize(12),
    color: '#888',
    fontStyle: 'italic',
  },
  statusContainer: {
    borderRadius: getResponsiveSize(12),
    overflow: 'hidden',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  statusGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(42,42,42,0.9)',
    borderRadius: getResponsiveSize(12),
    padding: getResponsiveSize(15),
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.3)',
  },
  toggle: {
    width: getResponsiveSize(24),
    height: getResponsiveSize(24),
    borderRadius: getResponsiveSize(12),
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: getResponsiveSize(10),
  },
  toggleActive: {
    backgroundColor: '#FFD700',
  },
  toggleInactive: {
    backgroundColor: '#666',
  },
  statusText: {
    fontSize: getResponsiveFontSize(14),
    color: '#E0E0E0',
    fontWeight: '500',
  },
  infoBox: {
    borderRadius: getResponsiveSize(12),
    overflow: 'hidden',
    marginTop: getResponsiveSize(10),
    marginBottom: getResponsiveSize(20),
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  infoGradient: {
    borderRadius: getResponsiveSize(12),
    padding: getResponsiveSize(15),
    borderLeftWidth: getResponsiveSize(4),
    borderLeftColor: '#FFD700',
  },
  infoTitle: {
    fontSize: getResponsiveFontSize(14),
    fontWeight: 'bold',
    color: '#FFD700',
    marginBottom: getResponsiveSize(8),
  }, 
  infoText: {
    fontSize: getResponsiveFontSize(12),
    color: '#E0E0E0',
    marginBottom: getResponsiveSize(4),
  },
  saveWrapper: {
    borderRadius: getResponsiveSize(15),
    overflow: 'hidden',
    marginTop: getResponsiveSize(10),
    marginBottom: getResponsiveSize(15),
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 5,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: getResponsiveSize(16),
    paddingHorizontal: getResponsiveSize(20),
  }, 
  saveText: {
    color: '#1a1a1a',
    fontSize: getResponsiveFontSize(16),
    fontWeight: 'bold',
    marginLeft: getResponsiveSize(8),
  },
  requiredText: {
    textAlign: 'center',
    fontSize: getResponsiveFontSize(12),
    color: '#888',
    marginBottom: getResponsiveSize(10),
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: getResponsiveSize(20),
  },
  modalContainer: {
    width: '90%',
    maxWidth: getResponsiveSize(400),
    maxHeight: '80%',
  },
  modalGradient: {
    borderRadius: getResponsiveSize(20),
    padding: getResponsiveSize(20),
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.3)',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: getResponsiveSize(15),
  }, 
  modalTitle: {
    fontSize: getResponsiveFontSize(18),
    fontWeight: 'bold',
    color: '#E0E0E0',
  },
  modalList: {
    maxHeight: getResponsiveSize(400),
  },
  modalItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(42,42,42,0.9)',
    borderRadius: getResponsiveSize(10),
    padding: getResponsiveSize(15),
    marginBottom: getResponsiveSize(8),
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  modalItemSelected: {
    backgroundColor: 'rgba(255,215,0,0.1)',
    borderColor: '#FFD700',
    borderWidth: 2,
  },
  modalItemText: {
    fontSize: getResponsiveFontSize(14),
    color: '#E0E0E0',
    fontWeight: '500',
  }, 
  modalItemTextSelected: {
    color: '#FFD700',
    fontWeight: 'bold',
  },
});