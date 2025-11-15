// screens/AddReminderScreen.js
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { LinearGradient } from 'expo-linear-gradient';
import * as Notifications from 'expo-notifications';
import { addDoc, collection, doc, updateDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import {
  Alert,
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
          <LinearGradient colors={['rgba(255,248,225,0.95)', 'rgba(255,228,181,0.9)']} style={styles.modalGradient}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{title}</Text>
              <TouchableOpacity onPress={() => setVisible(false)}>
                <Ionicons name="close" size={24} color="#3E2723" />
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
                  {selected === val && <Ionicons name="checkmark" size={20} color="#DAA520" />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </LinearGradient>
        </View>
      </View>
    </Modal>
  );

  return (
    <LinearGradient colors={['#FFF8E1', '#FFE4B5', '#FFD700']} style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{flex:1}}>
        <ScrollView showsVerticalScrollIndicator={false}>
          <LinearGradient colors={['rgba(255,248,225,0.95)', 'rgba(255,228,181,0.9)']} style={styles.header}>
            <View style={styles.headerContent}>
              <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                <Ionicons name="arrow-back" size={24} color="#3E2723" />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>
                {editReminder ? 'Редактировать напоминание' : 'Новое напоминание'}
              </Text>
              <View style={{width:24}} />
            </View>
          </LinearGradient>

          <View style={styles.formContainer}>
            {/* Поле заголовка */}
            <View style={styles.fieldContainer}>
              <Text style={styles.label}>Заголовок *</Text>
              <LinearGradient colors={['#FFF8E1', '#FFE4B5']} style={styles.inputGradient}>
                <View style={styles.inputField}>
                  <Ionicons name="text" size={20} color="#DAA520" />
                  <TextInput 
                    style={styles.input} 
                    value={title} 
                    onChangeText={setTitle} 
                    placeholder="Например: Репетиция хора" 
                    placeholderTextColor="#8B8B8B" 
                    maxLength={100} 
                  />
                </View>
              </LinearGradient>
            </View>

            {/* Поле текста */}
            <View style={styles.fieldContainer}>
              <Text style={styles.label}>Текст напоминания *</Text>
              <LinearGradient colors={['#FFF8E1', '#FFE4B5']} style={styles.inputGradientLarge}>
                <View style={styles.inputFieldLarge}>
                  <Ionicons name="document-text" size={20} color="#DAA520" style={{marginTop:4}} />
                  <TextInput 
                    style={styles.inputMultiline} 
                    value={message} 
                    onChangeText={setMessage}
                    placeholder="Опишите детали события..." 
                    placeholderTextColor="#8B8B8B" 
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
              <TouchableOpacity style={styles.dropdown} onPress={() => setShowTypeModal(true)}>
                <Ionicons name="pricetags" size={20} color="#DAA520" />
                <Text style={styles.dropdownText}>{getTypeLabel(reminderType)}</Text>
                <Ionicons name="chevron-down" size={20} color="#DAA520" />
              </TouchableOpacity>
            </View>

            {/* Дата и время */}
            <View style={styles.fieldContainer}>
              <Text style={styles.label}>Дата и время события *</Text>
              <View style={{flexDirection:'row',gap:10}}>
                <TouchableOpacity style={[styles.dateTime,{flex:1}]} onPress={() => setShowDatePicker(true)}>
                  <Ionicons name="calendar" size={18} color="#DAA520" />
                  <Text style={styles.dateTimeText}>{eventDate.toLocaleDateString('ru-RU')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.dateTime,{flex:1}]} onPress={() => setShowTimePicker(true)}>
                  <Ionicons name="time" size={18} color="#DAA520" />
                  <Text style={styles.dateTimeText}>
                    {eventDate.toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit'})}
                  </Text>
                </TouchableOpacity>
              </View>
              <Text style={{marginTop:8,fontSize:12,color:'#8B8B8B',fontStyle:'italic'}}>
                📅 {formatDateTime(eventDate)}
              </Text>
            </View>

            {/* Тайминг уведомления */}
            <View style={styles.fieldContainer}>
              <Text style={styles.label}>Уведомлять за</Text>
              <TouchableOpacity style={styles.dropdown} onPress={() => setShowTimingModal(true)}>
                <Ionicons name="notifications" size={20} color="#DAA520" />
                <Text style={styles.dropdownText}>{getTimingLabel(notifyBefore)}</Text>
                <Ionicons name="chevron-down" size={20} color="#DAA520" />
              </TouchableOpacity>
            </View>

            {/* Получатели */}
            <View style={styles.fieldContainer}>
              <Text style={styles.label}>Получатели</Text>
              <TouchableOpacity style={styles.dropdown} onPress={() => setShowTargetModal(true)}>
                <Ionicons name="people" size={20} color="#DAA520" />
                <Text style={styles.dropdownText}>{getTargetLabel(targetUsers)}</Text>
                <Ionicons name="chevron-down" size={20} color="#DAA520" />
              </TouchableOpacity>
            </View>

            {/* Статус */}
            <View style={styles.fieldContainer}>
              <Text style={styles.label}>Статус</Text>
              <TouchableOpacity style={styles.dropdown} onPress={() => setIsActive(!isActive)}>
                <View style={[styles.toggle, isActive?{backgroundColor:'#4CAF50'}:{backgroundColor:'#9E9E9E'}]}>
                  <Ionicons name={isActive?"checkmark":"close"} size={16} color="white" />
                </View>
                <Text style={styles.dropdownText}>{isActive?'Активно':'Неактивно'}</Text>
              </TouchableOpacity>
            </View>

            {/* Информационная панель */}
            <View style={styles.infoBox}>
              <Text style={styles.infoTitle}>📋 Информация о напоминании:</Text>
              <Text style={styles.infoText}>• Событие: {formatDateTime(eventDate)}</Text>
              <Text style={styles.infoText}>• Уведомление: {getTimingLabel(notifyBefore)} до события</Text>
              <Text style={styles.infoText}>• Получатели: {getTargetLabel(targetUsers)}</Text>
              <Text style={styles.infoText}>• Статус: {isActive?'Активно':'Неактивно'}</Text>
            </View>

            {/* Кнопка сохранения */}
            <TouchableOpacity 
              style={[styles.saveWrapper, (!title||!message)&&{opacity:0.5}]} 
              onPress={handleSave} 
              disabled={!title||!message||loading}
            >
              <LinearGradient 
                colors={(!title||!message||loading)?['#CCC','#999']:['#FFD700','#DAA520']} 
                style={styles.saveButton}
              >
                <Ionicons name={loading?"hourglass-outline":"save"} size={20} color="white" />
                <Text style={styles.saveText}>
                  {loading?'Сохранение...':(editReminder?'Обновить напоминание':'Создать напоминание')}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
            <Text style={{textAlign:'center',fontSize:12,color:'#8B8B8B',marginBottom:10}}>
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
          NOTIFICATION_TIMING.map(t=>t.value), 
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
  container: { flex: 1 },
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
    elevation: 5
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  }, 
  backButton: { padding: 5 },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#3E2723'
  },
  formContainer: { padding: 20 },
  fieldContainer: { marginBottom: 20 },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3E2723',
    marginBottom: 8
  },
  inputGradient: {
    borderRadius: 12,
    padding: 2,
    shadowColor: '#8B6B4F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  inputGradientLarge: {
    borderRadius: 12,
    padding: 2,
    shadowColor: '#8B6B4F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    minHeight: 120
  },
  inputField: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 12
  },
  inputFieldLarge: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 12,
    minHeight: 116
  },
  input: {
    flex: 1,
    marginLeft: 10,
    fontSize: 14,
    color: '#3E2723'
  }, 
  inputMultiline: {
    flex: 1,
    marginLeft: 10,
    fontSize: 14,
    color: '#3E2723',
    minHeight: 80
  },
  dropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 15,
    shadowColor: '#8B6B4F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#FFE4B5'
  },
  dropdownText: {
    flex: 1,
    marginLeft: 10,
    fontSize: 14,
    color: '#3E2723',
    fontWeight: '500'
  },
  dateTime: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 15,
    shadowColor: '#8B6B4F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#FFE4B5'
  },
  dateTimeText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#3E2723',
    fontWeight: '500'
  },
  toggle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10
  },
  infoBox: {
    backgroundColor: 'rgba(255,248,225,0.9)',
    borderRadius: 12,
    padding: 15,
    marginTop: 10,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#DAA520'
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#3E2723',
    marginBottom: 8
  }, 
  infoText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4
  },
  saveWrapper: {
    borderRadius: 15,
    overflow: 'hidden',
    marginTop: 10,
    marginBottom: 15,
    shadowColor: '#DAA520',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 5
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20
  }, 
  saveText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  modalContainer: {
    width: '90%',
    maxWidth: 400,
    maxHeight: '80%'
  },
  modalGradient: {
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15
  }, 
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#3E2723'
  },
  modalList: {
    maxHeight: 400
  },
  modalItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0'
  },
  modalItemSelected: {
    backgroundColor: '#FFF8E1',
    borderColor: '#DAA520',
    borderWidth: 2
  },
  modalItemText: {
    fontSize: 14,
    color: '#3E2723',
    fontWeight: '500'
  }, 
  modalItemTextSelected: {
    color: '#DAA520',
    fontWeight: 'bold'
  },
});