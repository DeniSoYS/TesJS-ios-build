// screens/AddReminderScreen.js
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { LinearGradient } from 'expo-linear-gradient';
import * as Notifications from 'expo-notifications';
import { addDoc, collection, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import {
  Alert,
  Dimensions,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { auth, db } from '../firebaseConfig';
import { sendPushNotification } from '../utils/pushNotifications';
import {
  NOTIFICATION_TIMING,
  REMINDER_TYPES,
  REMINDER_TYPE_LABELS,
  TARGET_USERS,
  TARGET_USER_LABELS
} from '../utils/reminderTypes';

const { width } = Dimensions.get('window');
const isSmallDevice = width < 375;
const isLargeDevice = width > 414;

const getResponsiveSize = (size) => {
  if (isSmallDevice) return size * 0.85;
  if (isLargeDevice) return size * 1.15;
  return size;
};

const getResponsiveFontSize = (size) => Math.round(getResponsiveSize(size));

// ==================== УТИЛИТЫ ====================

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

// ==================== КОМПОНЕНТЫ ====================

// Секция с заголовком
const FormSection = ({ title, required, children, icon }) => (
  <View style={styles.section}>
    <View style={styles.sectionHeader}>
      {icon && (
        <Ionicons 
          name={icon} 
          size={getResponsiveSize(16)} 
          color="#FFD700" 
          style={styles.sectionIcon}
        />
      )}
      <Text style={styles.sectionTitle}>
        {title}
        {required && <Text style={styles.requiredMark}> *</Text>}
      </Text>
    </View>
    {children}
  </View>
);

// Поле ввода
const InputField = ({ icon, value, onChangeText, placeholder, multiline, maxLength, error }) => (
  <View style={[styles.inputContainer, error && styles.inputError]}>
    <LinearGradient
      colors={['rgba(42, 42, 42, 0.8)', 'rgba(35, 35, 35, 0.9)']}
      style={[styles.inputGradient, multiline && styles.textAreaGradient]}
    >
      <View style={[styles.inputInner, multiline && styles.textAreaInner]}>
        <Ionicons
          name={icon}
          size={getResponsiveSize(20)}
          color={error ? '#FF6B6B' : '#FFD700'}
          style={multiline && styles.textAreaIcon}
        />
        <TextInput
          style={[styles.input, multiline && styles.textArea]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#666"
          multiline={multiline}
          numberOfLines={multiline ? 4 : 1}
          textAlignVertical={multiline ? 'top' : 'center'}
          maxLength={maxLength}
        />
      </View>
      {maxLength && (
        <Text style={styles.charCount}>
          {value?.length || 0}/{maxLength}
        </Text>
      )}
    </LinearGradient>
  </View>
);

// Dropdown кнопка
const DropdownButton = ({ icon, label, onPress, iconColor = '#FFD700' }) => (
  <TouchableOpacity style={styles.dropdownContainer} onPress={onPress}>
    <LinearGradient
      colors={['rgba(42, 42, 42, 0.8)', 'rgba(35, 35, 35, 0.9)']}
      style={styles.dropdownGradient}
    >
      <View style={styles.dropdownInner}>
        <Ionicons name={icon} size={getResponsiveSize(20)} color={iconColor} />
        <Text style={styles.dropdownText}>{label}</Text>
        <Ionicons name="chevron-down" size={getResponsiveSize(18)} color="#FFD700" />
      </View>
    </LinearGradient>
  </TouchableOpacity>
);

// Кнопка даты/времени
const DateTimeButton = ({ icon, label, onPress }) => (
  <TouchableOpacity style={styles.inputContainer} onPress={onPress}>
    <LinearGradient
      colors={['rgba(42, 42, 42, 0.8)', 'rgba(35, 35, 35, 0.9)']}
      style={styles.inputGradient}
    >
      <View style={styles.inputInner}>
        <Ionicons name={icon} size={getResponsiveSize(20)} color="#FFD700" />
        <Text style={styles.dateTimeText}>{label}</Text>
      </View>
    </LinearGradient>
  </TouchableOpacity>
);

// Разделитель секций
const SectionDivider = ({ title }) => (
  <View style={styles.dividerContainer}>
    <View style={styles.dividerLine} />
    <Text style={styles.dividerText}>{title}</Text>
    <View style={styles.dividerLine} />
  </View>
);

// ==================== ГЛАВНЫЙ КОМПОНЕНТ ====================

export default function AddReminderScreen({ navigation, route }) {
  const { userRole, editReminder } = route.params;

  // Состояния формы
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [reminderType, setReminderType] = useState(REMINDER_TYPES.GENERAL);
  const [eventDate, setEventDate] = useState(() => {
    const date = new Date();
    date.setHours(date.getHours() + 1, 0, 0, 0);
    return date;
  });
  const [notifyBefore, setNotifyBefore] = useState(3600);
  const [targetUsers, setTargetUsers] = useState(TARGET_USERS.ALL);
  const [isActive, setIsActive] = useState(true);

  // Состояния UI
  const [showTypeModal, setShowTypeModal] = useState(false);
  const [showTimingModal, setShowTimingModal] = useState(false);
  const [showTargetModal, setShowTargetModal] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Валидация
  const [errors, setErrors] = useState({});

  // Проверка прав доступа
  useEffect(() => {
    if (userRole !== 'admin' && !editReminder) {
      Alert.alert('Ошибка доступа', 'Только администраторы могут создавать напоминания');
      navigation.goBack();
    }
  }, [userRole, editReminder, navigation]);

  // Загрузка данных для редактирования
  useEffect(() => {
    if (editReminder) {
      setTitle(editReminder.title || '');
      setMessage(editReminder.message || '');
      setReminderType(editReminder.type || REMINDER_TYPES.GENERAL);
      setNotifyBefore(editReminder.notifyBefore || 3600);
      setTargetUsers(editReminder.targetUsers || TARGET_USERS.ALL);
      setIsActive(editReminder.isActive !== false);
      if (editReminder.eventDate) {
        setEventDate(editReminder.eventDate.toDate());
      }
    }
  }, [editReminder]);

  // Валидация в реальном времени
  useEffect(() => {
    const newErrors = {};
    if (title.trim().length > 0 && title.trim().length < 3) {
      newErrors.title = 'Минимум 3 символа';
    }
    if (message.trim().length > 0 && message.trim().length < 10) {
      newErrors.message = 'Минимум 10 символов';
    }
    setErrors(newErrors);
  }, [title, message]);

  // Хелперы
  const getTimingLabel = (sec) =>
    NOTIFICATION_TIMING.find((t) => t.value === sec)?.label || 'Неизвестно';
  
  const getTypeLabel = (type) => REMINDER_TYPE_LABELS[type] || 'Неизвестно';
  
  const getTargetLabel = (target) => TARGET_USER_LABELS[target] || 'Неизвестно';

  const getTypeIcon = (type) => {
    const icons = {
      concert: 'musical-notes',
      rehearsal: 'repeat',
      admin: 'business',
      creative: 'color-palette',
      general: 'notifications',
    };
    return icons[type] || 'notifications';
  };

  const formatDate = (date) =>
    date.toLocaleDateString('ru-RU', {
      weekday: 'short',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

  const formatTime = (date) =>
    date.toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit',
    });

  const getNotificationTime = () => {
    const notifDate = new Date(eventDate);
    notifDate.setSeconds(notifDate.getSeconds() - notifyBefore);
    return notifDate;
  };

  const isFormValid = () => {
    return (
      title.trim().length >= 3 &&
      message.trim().length >= 10 &&
      eventDate > new Date() &&
      Object.keys(errors).length === 0
    );
  };

  // Обработчики
  const handleDateChange = (event, selectedDate) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    if (selectedDate) {
      const newDate = new Date(eventDate);
      newDate.setFullYear(selectedDate.getFullYear());
      newDate.setMonth(selectedDate.getMonth());
      newDate.setDate(selectedDate.getDate());
      setEventDate(newDate);
    }
  };

  const handleTimeChange = (event, selectedTime) => {
    if (Platform.OS === 'android') {
      setShowTimePicker(false);
    }
    if (selectedTime) {
      const newDate = new Date(eventDate);
      newDate.setHours(selectedTime.getHours());
      newDate.setMinutes(selectedTime.getMinutes());
      setEventDate(newDate);
    }
  };

  // ==================== СОХРАНЕНИЕ ====================
  const handleSave = async () => {
    if (!isFormValid()) {
      Alert.alert('Ошибка', 'Пожалуйста, заполните все обязательные поля корректно');
      return;
    }

    if (userRole !== 'admin') {
      Alert.alert('Ошибка', 'Только администраторы могут сохранять напоминания');
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
        await updateDoc(doc(db, 'reminders', reminderId), {
          ...reminderData,
          localNotificationId,
        });
        messageText = 'Напоминание успешно обновлено!';
      } else {
        reminderData.createdAt = new Date();
        const docRef = await addDoc(collection(db, 'reminders'), reminderData);
        reminderId = docRef.id;
        const localNotificationId = await scheduleNotification({
          ...reminderData,
          id: reminderId,
        });
        await updateDoc(doc(db, 'reminders', reminderId), { localNotificationId });
        await sendPushNotification({ ...reminderData, id: reminderId });
        messageText = 'Напоминание успешно создано!';
      }

      Alert.alert('✅ Успех', messageText, [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      console.error('Ошибка:', error);
      Alert.alert('❌ Ошибка', 'Не удалось сохранить напоминание. Попробуйте ещё раз.');
    } finally {
      setLoading(false);
    }
  };

  // ==================== УДАЛЕНИЕ ====================
  const handleDelete = () => {
    if (!editReminder) return;

    Alert.alert(
      '🗑️ Удалить напоминание?',
      `Вы уверены, что хотите удалить "${editReminder.title}"?\n\nЭто действие нельзя отменить.`,
      [
        {
          text: 'Отмена',
          style: 'cancel',
        },
        {
          text: 'Удалить',
          style: 'destructive',
          onPress: confirmDelete,
        },
      ]
    );
  };

  const confirmDelete = async () => {
    try {
      setDeleting(true);

      // Отменяем запланированное уведомление
      if (editReminder.localNotificationId) {
        await Notifications.cancelScheduledNotificationAsync(editReminder.localNotificationId);
        console.log('🔕 Уведомление отменено:', editReminder.localNotificationId);
      }

      // Удаляем из Firestore
      await deleteDoc(doc(db, 'reminders', editReminder.id));
      console.log('✅ Напоминание удалено:', editReminder.id);

      Alert.alert('✅ Удалено', 'Напоминание успешно удалено', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      console.error('❌ Ошибка удаления:', error);
      Alert.alert('❌ Ошибка', 'Не удалось удалить напоминание. Попробуйте ещё раз.');
    } finally {
      setDeleting(false);
    }
  };

  // Модальное окно выбора
  const renderSelectModal = (visible, setVisible, title, options, selected, setSelected) => (
    <Modal
      animationType="fade"
      transparent
      visible={visible}
      onRequestClose={() => setVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <LinearGradient
            colors={['rgba(26, 26, 26, 0.98)', 'rgba(35, 35, 35, 0.95)']}
            style={styles.modalGradient}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{title}</Text>
              <TouchableOpacity
                onPress={() => setVisible(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close-circle" size={getResponsiveSize(28)} color="#FFD700" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.optionsList} showsVerticalScrollIndicator={false}>
              {options.map((option) => {
                const isSelected = selected === option.value;
                return (
                  <TouchableOpacity
                    key={option.value}
                    style={[styles.optionItem, isSelected && styles.optionItemSelected]}
                    onPress={() => {
                      setSelected(option.value);
                      setVisible(false);
                    }}
                    activeOpacity={0.7}
                  >
                    <LinearGradient
                      colors={
                        isSelected
                          ? ['rgba(255, 215, 0, 0.15)', 'rgba(255, 165, 0, 0.1)']
                          : ['rgba(42, 42, 42, 0.6)', 'rgba(35, 35, 35, 0.8)']
                      }
                      style={styles.optionItemGradient}
                    >
                      <View style={styles.optionItemContent}>
                        {option.icon && (
                          <Ionicons
                            name={option.icon}
                            size={getResponsiveSize(20)}
                            color={isSelected ? '#FFD700' : '#888'}
                            style={styles.optionIcon}
                          />
                        )}
                        <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>
                          {option.label}
                        </Text>
                        {isSelected && (
                          <Ionicons name="checkmark-circle" size={getResponsiveSize(22)} color="#FFD700" />
                        )}
                      </View>
                    </LinearGradient>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </LinearGradient>
        </View>
      </View>
    </Modal>
  );

  // Опции для модальных окон
  const typeOptions = Object.values(REMINDER_TYPES).map((type) => ({
    value: type,
    label: getTypeLabel(type),
    icon: getTypeIcon(type),
  }));

  const timingOptions = NOTIFICATION_TIMING.map((t) => ({
    value: t.value,
    label: t.label,
    icon: 'time-outline',
  }));

  const targetOptions = Object.values(TARGET_USERS).map((target) => ({
    value: target,
    label: getTargetLabel(target),
    icon: target === TARGET_USERS.ALL ? 'people' : 'person',
  }));

  // ==================== РЕНДЕР ====================

  return (
    <LinearGradient colors={['#0a0a0a', '#1a1a1a', '#2a2a2a']} style={styles.container}>
      {/* ХЕДЕР */}
      <LinearGradient
        colors={['rgba(26, 26, 26, 0.98)', 'rgba(35, 35, 35, 0.95)']}
        style={styles.header}
      >
        <View style={styles.headerBackground}>
          <View style={[styles.decorCircle, styles.decorCircle1]} />
          <View style={[styles.decorCircle, styles.decorCircle2]} />
        </View>

        <View style={styles.headerContent}>
          {/* Кнопка назад */}
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <LinearGradient colors={['#FFD700', '#FFA500']} style={styles.backButtonGradient}>
              <Ionicons name="arrow-back" size={getResponsiveSize(20)} color="#1a1a1a" />
            </LinearGradient>
          </TouchableOpacity>

          {/* Заголовок */}
          <View style={styles.titleSection}>
            <LinearGradient colors={['#FFD700', '#FFA500']} style={styles.titleIconGradient}>
              <Ionicons
                name={editReminder ? 'create' : 'add-circle'}
                size={getResponsiveSize(24)}
                color="#1a1a1a"
              />
            </LinearGradient>
            <View style={styles.titleTextContainer}>
              <Text style={styles.mainTitle}>
                {editReminder ? 'Редактирование' : 'Новое напоминание'}
              </Text>
              <Text style={styles.subtitle}>
                {editReminder ? 'Измените данные напоминания' : 'Заполните форму ниже'}
              </Text>
            </View>
          </View>

          {/* Кнопка удаления (только при редактировании) */}
          {editReminder ? (
            <TouchableOpacity 
              onPress={handleDelete} 
              style={styles.deleteHeaderButton}
              disabled={deleting}
            >
              <LinearGradient 
                colors={deleting ? ['#666', '#555'] : ['#FF6B6B', '#FF4444']} 
                style={styles.deleteHeaderButtonGradient}
              >
                <Ionicons 
                  name={deleting ? 'hourglass-outline' : 'trash-outline'} 
                  size={getResponsiveSize(20)} 
                  color="#FFFFFF" 
                />
              </LinearGradient>
            </TouchableOpacity>
          ) : (
            <View style={styles.headerSpacer} />
          )}
        </View>
      </LinearGradient>

      {/* ФОРМА */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* === ОСНОВНАЯ ИНФОРМАЦИЯ === */}
          <SectionDivider title="Основная информация" />

          <FormSection title="Заголовок" required icon="text">
            <InputField
              icon="text"
              value={title}
              onChangeText={setTitle}
              placeholder="Например: Репетиция хора"
              maxLength={100}
              error={errors.title}
            />
            {errors.title && <Text style={styles.errorText}>{errors.title}</Text>}
          </FormSection>

          <FormSection title="Описание" required icon="document-text">
            <InputField
              icon="document-text"
              value={message}
              onChangeText={setMessage}
              placeholder="Опишите детали события подробнее..."
              multiline
              maxLength={500}
              error={errors.message}
            />
            {errors.message && <Text style={styles.errorText}>{errors.message}</Text>}
          </FormSection>

          <FormSection title="Тип события" icon="pricetag">
            <DropdownButton
              icon={getTypeIcon(reminderType)}
              label={getTypeLabel(reminderType)}
              onPress={() => setShowTypeModal(true)}
            />
          </FormSection>

          {/* === ДАТА И ВРЕМЯ === */}
          <SectionDivider title="Дата и время" />

          <View style={styles.rowSection}>
            <View style={styles.halfField}>
              <FormSection title="Дата" required icon="calendar">
                <DateTimeButton
                  icon="calendar"
                  label={formatDate(eventDate)}
                  onPress={() => setShowDatePicker(true)}
                />
              </FormSection>
            </View>

            <View style={styles.halfField}>
              <FormSection title="Время" required icon="time">
                <DateTimeButton
                  icon="time"
                  label={formatTime(eventDate)}
                  onPress={() => setShowTimePicker(true)}
                />
              </FormSection>
            </View>
          </View>

          {eventDate <= new Date() && (
            <View style={styles.warningBox}>
              <Ionicons name="warning" size={getResponsiveSize(18)} color="#FF6B6B" />
              <Text style={styles.warningText}>Дата и время должны быть в будущем</Text>
            </View>
          )}

          <FormSection title="Уведомить заранее" icon="notifications">
            <DropdownButton
              icon="notifications-outline"
              label={getTimingLabel(notifyBefore)}
              onPress={() => setShowTimingModal(true)}
            />
            <Text style={styles.hintText}>
              📅 Уведомление придёт: {formatDate(getNotificationTime())} в {formatTime(getNotificationTime())}
            </Text>
          </FormSection>

          {/* === НАСТРОЙКИ === */}
          <SectionDivider title="Настройки" />

          <FormSection title="Получатели" icon="people">
            <DropdownButton
              icon="people"
              label={getTargetLabel(targetUsers)}
              onPress={() => setShowTargetModal(true)}
            />
          </FormSection>

          <View style={styles.switchSection}>
            <View style={styles.switchInfo}>
              <Ionicons
                name={isActive ? 'checkmark-circle' : 'close-circle'}
                size={getResponsiveSize(24)}
                color={isActive ? '#34C759' : '#FF6B6B'}
              />
              <View style={styles.switchTextContainer}>
                <Text style={styles.switchTitle}>Активное напоминание</Text>
                <Text style={styles.switchSubtitle}>
                  {isActive ? 'Уведомления будут отправлены' : 'Уведомления отключены'}
                </Text>
              </View>
            </View>
            <Switch
              value={isActive}
              onValueChange={setIsActive}
              trackColor={{ false: '#3a3a3a', true: 'rgba(255, 215, 0, 0.4)' }}
              thumbColor={isActive ? '#FFD700' : '#888'}
              ios_backgroundColor="#3a3a3a"
            />
          </View>

          {/* === КНОПКА СОХРАНЕНИЯ === */}
          <TouchableOpacity
            style={[styles.saveButtonWrapper, !isFormValid() && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={!isFormValid() || loading}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={isFormValid() && !loading ? ['#FFD700', '#FFA500'] : ['#444', '#333']}
              style={styles.saveButton}
            >
              {loading ? (
                <Ionicons name="hourglass-outline" size={getResponsiveSize(22)} color="#888" />
              ) : (
                <Ionicons
                  name={editReminder ? 'checkmark-done' : 'add-circle'}
                  size={getResponsiveSize(22)}
                  color={isFormValid() ? '#1a1a1a' : '#666'}
                />
              )}
              <Text style={[styles.saveButtonText, !isFormValid() && styles.saveButtonTextDisabled]}>
                {loading
                  ? 'Сохранение...'
                  : editReminder
                  ? 'Сохранить изменения'
                  : 'Создать напоминание'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>

          <Text style={styles.requiredNote}>* Обязательные поля</Text>

          {/* === КНОПКА УДАЛЕНИЯ (только при редактировании) === */}
          {editReminder && (
            <TouchableOpacity
              style={styles.deleteButtonWrapper}
              onPress={handleDelete}
              disabled={deleting}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={deleting ? ['#555', '#444'] : ['rgba(255, 107, 107, 0.2)', 'rgba(255, 68, 68, 0.1)']}
                style={styles.deleteButton}
              >
                <Ionicons
                  name={deleting ? 'hourglass-outline' : 'trash-outline'}
                  size={getResponsiveSize(20)}
                  color={deleting ? '#888' : '#FF6B6B'}
                />
                <Text style={[styles.deleteButtonText, deleting && styles.deleteButtonTextDisabled]}>
                  {deleting ? 'Удаление...' : 'Удалить напоминание'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          )}

          <View style={styles.bottomSpacer} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* === МОДАЛЬНЫЕ ОКНА === */}
      {renderSelectModal(showTypeModal, setShowTypeModal, 'Тип события', typeOptions, reminderType, setReminderType)}
      {renderSelectModal(showTimingModal, setShowTimingModal, 'Когда уведомить?', timingOptions, notifyBefore, setNotifyBefore)}
      {renderSelectModal(showTargetModal, setShowTargetModal, 'Получатели', targetOptions, targetUsers, setTargetUsers)}

      {/* === DATE PICKER === */}
      {Platform.OS === 'web' && showDatePicker && (
        <Modal visible transparent animationType="fade" onRequestClose={() => setShowDatePicker(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <LinearGradient colors={['rgba(26, 26, 26, 0.98)', 'rgba(35, 35, 35, 0.95)']} style={styles.modalGradient}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>📅 Выберите дату</Text>
                  <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                    <Ionicons name="close-circle" size={getResponsiveSize(28)} color="#FFD700" />
                  </TouchableOpacity>
                </View>
                <input
                  type="date"
                  value={eventDate.toISOString().split('T')[0]}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={(e) => {
                    const newDate = new Date(e.target.value);
                    newDate.setHours(eventDate.getHours(), eventDate.getMinutes());
                    setEventDate(newDate);
                    setShowDatePicker(false);
                  }}
                  style={webInputStyle}
                />
              </LinearGradient>
            </View>
          </View>
        </Modal>
      )}

      {Platform.OS === 'web' && showTimePicker && (
        <Modal visible transparent animationType="fade" onRequestClose={() => setShowTimePicker(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <LinearGradient colors={['rgba(26, 26, 26, 0.98)', 'rgba(35, 35, 35, 0.95)']} style={styles.modalGradient}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>⏰ Выберите время</Text>
                  <TouchableOpacity onPress={() => setShowTimePicker(false)}>
                    <Ionicons name="close-circle" size={getResponsiveSize(28)} color="#FFD700" />
                  </TouchableOpacity>
                </View>
                <input
                  type="time"
                  value={`${String(eventDate.getHours()).padStart(2, '0')}:${String(eventDate.getMinutes()).padStart(2, '0')}`}
                  onChange={(e) => {
                    const [hours, minutes] = e.target.value.split(':');
                    const newDate = new Date(eventDate);
                    newDate.setHours(parseInt(hours), parseInt(minutes));
                    setEventDate(newDate);
                    setShowTimePicker(false);
                  }}
                  style={webInputStyle}
                />
              </LinearGradient>
            </View>
          </View>
        </Modal>
      )}

      {/* Native DateTimePicker для iOS/Android */}
      {Platform.OS !== 'web' && showDatePicker && (
        <DateTimePicker
          value={eventDate}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleDateChange}
          minimumDate={new Date()}
          locale="ru-RU"
        />
      )}

      {Platform.OS !== 'web' && showTimePicker && (
        <DateTimePicker
          value={eventDate}
          mode="time"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleTimeChange}
          locale="ru-RU"
        />
      )}
    </LinearGradient>
  );
}

// Стиль для web input
const webInputStyle = {
  width: '100%',
  padding: 16,
  fontSize: 16,
  borderRadius: 12,
  border: '2px solid rgba(255, 215, 0, 0.3)',
  backgroundColor: 'rgba(42, 42, 42, 0.9)',
  color: '#E0E0E0',
  fontFamily: 'system-ui, -apple-system, sans-serif',
  outline: 'none',
  cursor: 'pointer',
};

// ==================== СТИЛИ ====================

const styles = StyleSheet.create({
  container: { 
    flex: 1 
  },
  keyboardView: { 
    flex: 1 
  },
  
  // Хедер
  header: {
    paddingHorizontal: getResponsiveSize(20),
    paddingTop: Platform.OS === 'ios' ? getResponsiveSize(50) : getResponsiveSize(30),
    paddingBottom: getResponsiveSize(20),
    borderBottomLeftRadius: getResponsiveSize(30),
    borderBottomRightRadius: getResponsiveSize(30),
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
    position: 'relative',
    overflow: 'hidden',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 215, 0, 0.3)',
  },
  headerBackground: { 
    position: 'absolute', 
    top: 0, 
    left: 0, 
    right: 0, 
    bottom: 0 
  },
  decorCircle: { 
    position: 'absolute', 
    borderRadius: 1000, 
    opacity: 0.05 
  },
  decorCircle1: {
    width: getResponsiveSize(200),
    height: getResponsiveSize(200),
    backgroundColor: '#FFD700',
    top: -getResponsiveSize(80),
    right: -getResponsiveSize(50),
  },
  decorCircle2: {
    width: getResponsiveSize(150),
    height: getResponsiveSize(150),
    backgroundColor: '#FFA500',
    bottom: -getResponsiveSize(60),
    left: -getResponsiveSize(40),
  },
  headerContent: {
    position: 'relative',
    zIndex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    borderRadius: getResponsiveSize(20),
    overflow: 'hidden',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  backButtonGradient: {
    width: getResponsiveSize(44),
    height: getResponsiveSize(44),
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginLeft: getResponsiveSize(16),
  },
  titleIconGradient: {
    width: getResponsiveSize(48),
    height: getResponsiveSize(48),
    borderRadius: getResponsiveSize(14),
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 5,
  },
  titleTextContainer: { 
    marginLeft: getResponsiveSize(12),
    flex: 1,
  },
  mainTitle: {
    fontSize: getResponsiveFontSize(18),
    fontWeight: '800',
    color: '#E0E0E0',
    letterSpacing: 0.3,
  },
  subtitle: { 
    fontSize: getResponsiveFontSize(12), 
    color: '#888', 
    fontWeight: '500',
    marginTop: 2,
  },
  headerSpacer: { 
    width: getResponsiveSize(44) 
  },
  
  // Кнопка удаления в хедере
  deleteHeaderButton: {
    borderRadius: getResponsiveSize(20),
    overflow: 'hidden',
    shadowColor: '#FF6B6B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  deleteHeaderButtonGradient: {
    width: getResponsiveSize(44),
    height: getResponsiveSize(44),
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Контент
  content: { 
    flex: 1, 
    padding: getResponsiveSize(20) 
  },

  // Разделитель секций
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: getResponsiveSize(20),
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
  },
  dividerText: {
    color: '#FFD700',
    fontSize: getResponsiveFontSize(12),
    fontWeight: '600',
    marginHorizontal: getResponsiveSize(12),
    textTransform: 'uppercase',
    letterSpacing: 1,
  },

  // Секции формы
  section: { 
    marginBottom: getResponsiveSize(16) 
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: getResponsiveSize(8),
  },
  sectionIcon: {
    marginRight: getResponsiveSize(6),
  },
  sectionTitle: {
    fontSize: getResponsiveFontSize(14),
    fontWeight: '600',
    color: '#B0B0B0',
  },
  requiredMark: {
    color: '#FF6B6B',
    fontWeight: '700',
  },

  // Поля ввода
  inputContainer: {
    borderRadius: getResponsiveSize(14),
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  inputError: {
    borderWidth: 1,
    borderColor: '#FF6B6B',
  },
  inputGradient: { 
    borderRadius: getResponsiveSize(14), 
    padding: getResponsiveSize(2) 
  },
  inputInner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(42, 42, 42, 0.9)',
    borderRadius: getResponsiveSize(12),
    paddingHorizontal: getResponsiveSize(14),
    paddingVertical: getResponsiveSize(12),
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.15)',
  },
  input: {
    flex: 1,
    marginLeft: getResponsiveSize(10),
    fontSize: getResponsiveFontSize(15),
    color: '#E0E0E0',
    fontWeight: '500',
  },
  charCount: {
    position: 'absolute',
    bottom: getResponsiveSize(8),
    right: getResponsiveSize(12),
    fontSize: getResponsiveFontSize(10),
    color: '#666',
  },
  errorText: {
    color: '#FF6B6B',
    fontSize: getResponsiveFontSize(12),
    marginTop: getResponsiveSize(4),
    marginLeft: getResponsiveSize(4),
  },

  // TextArea
  textAreaGradient: { 
    minHeight: getResponsiveSize(120) 
  },
  textAreaInner: { 
    alignItems: 'flex-start', 
    minHeight: getResponsiveSize(116) 
  },
  textAreaIcon: { 
    marginTop: getResponsiveSize(4) 
  },
  textArea: {
    flex: 1,
    marginLeft: getResponsiveSize(10),
    fontSize: getResponsiveFontSize(15),
    color: '#E0E0E0',
    fontWeight: '500',
    minHeight: getResponsiveSize(80),
    textAlignVertical: 'top',
  },

  // Dropdown
  dropdownContainer: {
    borderRadius: getResponsiveSize(14),
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  dropdownGradient: {
    borderRadius: getResponsiveSize(14),
    padding: getResponsiveSize(2),
  },
  dropdownInner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(42, 42, 42, 0.9)',
    borderRadius: getResponsiveSize(12),
    paddingHorizontal: getResponsiveSize(14),
    paddingVertical: getResponsiveSize(12),
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.15)',
  },
  dropdownText: {
    flex: 1,
    marginLeft: getResponsiveSize(10),
    fontSize: getResponsiveFontSize(15),
    color: '#E0E0E0',
    fontWeight: '500',
  },

  // Дата/Время
  dateTimeText: {
    flex: 1,
    marginLeft: getResponsiveSize(10),
    fontSize: getResponsiveFontSize(15),
    color: '#E0E0E0',
    fontWeight: '500',
  },
  rowSection: {
    flexDirection: 'row',
    gap: getResponsiveSize(12),
  },
  halfField: { 
    flex: 1 
  },
  hintText: {
    fontSize: getResponsiveFontSize(12),
    color: '#888',
    marginTop: getResponsiveSize(8),
    fontStyle: 'italic',
  },

  // Warning
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    borderRadius: getResponsiveSize(10),
    padding: getResponsiveSize(12),
    marginBottom: getResponsiveSize(16),
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 107, 0.3)',
  },
  warningText: {
    color: '#FF6B6B',
    fontSize: getResponsiveFontSize(13),
    marginLeft: getResponsiveSize(8),
    fontWeight: '500',
  },

  // Switch секция
  switchSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(42, 42, 42, 0.6)',
    borderRadius: getResponsiveSize(14),
    padding: getResponsiveSize(16),
    marginBottom: getResponsiveSize(24),
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.15)',
  },
  switchInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  switchTextContainer: {
    marginLeft: getResponsiveSize(12),
    flex: 1,
  },
  switchTitle: {
    fontSize: getResponsiveFontSize(15),
    fontWeight: '600',
    color: '#E0E0E0',
  },
  switchSubtitle: {
    fontSize: getResponsiveFontSize(12),
    color: '#888',
    marginTop: 2,
  },

  // Кнопка сохранения
  saveButtonWrapper: {
    borderRadius: getResponsiveSize(16),
    overflow: 'hidden',
    marginTop: getResponsiveSize(8),
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  saveButtonDisabled: {
    shadowOpacity: 0,
    elevation: 0,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: getResponsiveSize(16),
    paddingHorizontal: getResponsiveSize(24),
  },
  saveButtonText: {
    color: '#1a1a1a',
    fontSize: getResponsiveFontSize(16),
    fontWeight: '700',
    marginLeft: getResponsiveSize(8),
  },
  saveButtonTextDisabled: { 
    color: '#666' 
  },
  requiredNote: {
    textAlign: 'center',
    fontSize: getResponsiveFontSize(12),
    color: '#666',
    marginTop: getResponsiveSize(16),
  },
  
  // Кнопка удаления внизу
  deleteButtonWrapper: {
    borderRadius: getResponsiveSize(16),
    overflow: 'hidden',
    marginTop: getResponsiveSize(20),
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 107, 0.3)',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: getResponsiveSize(14),
    paddingHorizontal: getResponsiveSize(24),
  },
  deleteButtonText: {
    color: '#FF6B6B',
    fontSize: getResponsiveFontSize(15),
    fontWeight: '600',
    marginLeft: getResponsiveSize(8),
  },
  deleteButtonTextDisabled: {
    color: '#888',
  },
  
  bottomSpacer: {
    height: getResponsiveSize(40),
  },

  // Модальные окна
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: getResponsiveSize(20),
  },
  modalContainer: { 
    width: '100%', 
    maxWidth: getResponsiveSize(400) 
  },
  modalGradient: {
    borderRadius: getResponsiveSize(24),
    padding: getResponsiveSize(20),
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.25)',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: getResponsiveSize(16),
    paddingBottom: getResponsiveSize(12),
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 215, 0, 0.15)',
  },
  modalTitle: {
    fontSize: getResponsiveFontSize(18),
    fontWeight: '700',
    color: '#E0E0E0',
  },
  optionsList: { 
    maxHeight: getResponsiveSize(350) 
  },
  optionItem: { 
    borderRadius: getResponsiveSize(12), 
    overflow: 'hidden',
    marginBottom: getResponsiveSize(8),
  },
  optionItemSelected: {
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  optionItemGradient: {
    borderRadius: getResponsiveSize(12),
    padding: getResponsiveSize(2),
  },
  optionItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(42, 42, 42, 0.9)',
    borderRadius: getResponsiveSize(10),
    paddingHorizontal: getResponsiveSize(14),
    paddingVertical: getResponsiveSize(14),
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.1)',
  },
  optionIcon: {
    marginRight: getResponsiveSize(10),
  },
  optionText: {
    flex: 1,
    fontSize: getResponsiveFontSize(15),
    color: '#C0C0C0',
    fontWeight: '500',
  },
  optionTextSelected: { 
    color: '#FFD700', 
    fontWeight: '600' 
  },
});
