import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { LinearGradient } from 'expo-linear-gradient';
import { addDoc, collection, doc, updateDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import {
  BackHandler,
  Dimensions,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { db } from '../firebaseConfig';
import { CONCERT_TYPE_LIST } from '../utils/concertTypes'; // ✅ ИМПОРТ УТИЛИТЫ

// ✅ РЕГИОНЫ
const REGIONS = [
  'Воронежская область',
  'Белгородская область',
  'Липецкая область',
  'Тамбовская область',
  'Курская область',
  'Калужская область',
  'Тульская область',
  'Смоленская область',
  'Брянская область',
  'Орловская область',
  'Московская область',
  'Москва',
  'Санкт-Петербург',
];

// ✅ КАТЕГОРИИ УЧАСТНИКОВ
const PARTICIPANT_CATEGORIES = [
  { id: 'femaleChoir', label: 'Жен. хор', color: '#FF6B9D' },
  { id: 'maleChoir', label: 'Муж. хор', color: '#4ECDC4' },
  { id: 'maleBallet', label: 'Муж. балет', color: '#95E1D3' },
  { id: 'femaleBallet', label: 'Жен. балет', color: '#A8E6CF' },
  { id: 'administration', label: 'Администрация', color: '#FFD700' },
];

// ✅ ФУНКЦИЯ АДАПТИВНОСТИ
const getWindowDimensions = () => {
  if (Platform.OS === 'web') {
    return { width: window.innerWidth, height: window.innerHeight };
  }
  return Dimensions.get('window');
};

const useWindowDimensions = () => {
  const [dimensions, setDimensions] = useState(getWindowDimensions());

  useEffect(() => {
    if (Platform.OS === 'web') {
      const handleResize = () => setDimensions(getWindowDimensions());
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }
  }, []);

  return dimensions;
};

const getResponsiveSize = (size, windowWidth) => {
  const isSmallDevice = windowWidth < 375;
  const isLargeDevice = windowWidth > 414;
  if (isSmallDevice) return size * 0.85;
  if (isLargeDevice) return size * 1.15;
  return size;
};

const getResponsiveFontSize = (size, windowWidth) => {
  const isSmallDevice = windowWidth < 375;
  const isLargeDevice = windowWidth > 414;
  if (isSmallDevice) return size * 0.9;
  if (isLargeDevice) return size * 1.1;
  return size;
};

// ✅ CUSTOM ALERT COMPONENT
const CustomAlert = ({ visible, title, message, buttons, onDismiss }) => {
  if (!visible) return null;

  const getGradientColors = (type) => {
    switch (type) {
      case 'destructive':
        return ['#FF6B6B', '#EE5A52'];
      case 'cancel':
        return ['#555', '#444'];
      default:
        return ['#4A90E2', '#357ABD'];
    }
  };

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onDismiss}>
      <View style={styles.alertOverlay}>
        <View style={styles.alertContent}>
          <LinearGradient
            colors={['rgba(26, 26, 26, 0.98)', 'rgba(35, 35, 35, 0.95)']}
            style={styles.alertGradient}
          >
            {title && <Text style={styles.alertTitle}>{title}</Text>}
            {message && <Text style={styles.alertMessage}>{message}</Text>}

            <View style={styles.alertButtonsContainer}>
              {buttons?.map((btn, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={[styles.alertButton, { flex: buttons.length > 1 ? 1 : undefined }]}
                  onPress={() => {
                    btn.onPress?.();
                    onDismiss();
                  }}
                >
                  <LinearGradient
                    colors={getGradientColors(btn.style)}
                    style={styles.alertButtonGradient}
                  >
                    <Text style={styles.alertButtonText}>{btn.text}</Text>
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

// ✅ WEB TIME PICKER COMPONENT
const WebTimePicker = ({ value, onChange }) => {
  const [timeValue, setTimeValue] = useState(value || '');

  const handleChange = (text) => {
    let cleaned = text.replace(/\D/g, '');

    if (cleaned.length >= 2) {
      let hours = parseInt(cleaned.substring(0, 2));
      hours = Math.min(hours, 23);
      cleaned = String(hours).padStart(2, '0') + cleaned.substring(2);
    }

    if (cleaned.length >= 4) {
      let minutes = parseInt(cleaned.substring(2, 4));
      minutes = Math.min(minutes, 59);
      const formatted = `${cleaned.substring(0, 2)}:${String(minutes).padStart(2, '0')}`;
      setTimeValue(formatted);
      onChange(formatted);
    } else if (cleaned.length <= 2) {
      setTimeValue(cleaned);
    } else {
      setTimeValue(cleaned.substring(0, 2) + ':' + cleaned.substring(2, 4));
    }
  };

  return (
    <TextInput
      style={styles.timeInput}
      placeholder="ЧЧ:MM"
      value={timeValue}
      onChangeText={handleChange}
      maxLength={5}
      keyboardType="numeric"
    />
  );
};

// ✅ MAIN COMPONENT
export default function AddEventScreen({ route, navigation}) {
  const dimensions = useWindowDimensions();
  const responsiveSize = (size) => getResponsiveSize(size, dimensions.width);
  const responsiveFontSize = (size) => getResponsiveFontSize(size, dimensions.width);

  const concert = route?.params?.concert;
  const isEditing = !!concert;

  // ✅ STATE
  const [date, setDate] = useState(concert?.date || new Date().toISOString().split('T')[0]);
  const [concertType, setConcertType] = useState(concert?.concertType || 'GENERAL');
  const [description, setDescription] = useState(concert?.description || '');
  const [address, setAddress] = useState(concert?.address || '');
  const [region, setRegion] = useState(concert?.region || 'Воронежская область');
  const [departureTime, setDepartureTime] = useState(concert?.departureTime || '');
  const [startTime, setStartTime] = useState(concert?.startTime || '');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showDepartureTimePicker, setShowDepartureTimePicker] = useState(false);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showParticipantModal, setShowParticipantModal] = useState(false);
  const [showProgramModal, setShowProgramModal] = useState(false);
  const [showRegionModal, setShowRegionModal] = useState(false);
  const [regionSearch, setRegionSearch] = useState('');

  const [participants, setParticipants] = useState(
    concert?.participants || {
      femaleChoir: [],
      maleChoir: [],
      maleBallet: [],
      femaleBallet: [],
      administration: [],
    }
  );

  const [currentCategory, setCurrentCategory] = useState('femaleChoir');
  const [participantName, setParticipantName] = useState('');

  const [programTitle, setProgramTitle] = useState(concert?.program?.title || '');
  const [songs, setSongs] = useState(concert?.program?.songs || []);
  const [songTitle, setSongTitle] = useState('');
  const [soloists, setSoloists] = useState('');

  const [alertVisible, setAlertVisible] = useState(false);
  const [alertConfig, setAlertConfig] = useState({ title: '', message: '' });

  // ✅ ALERT FUNCTION
  const showAlert = (title, message, buttons = null) => {
    setAlertConfig({
      title,
      message,
      buttons: buttons || [{ text: 'OK', onPress: () => {} }],
    });
    setAlertVisible(true);
  };

  // ✅ FILTERED REGIONS
  const filteredRegions = regionSearch
    ? REGIONS.filter((r) => r.toLowerCase().includes(regionSearch.toLowerCase()))
    : REGIONS;

  // ✅ BROWSER HISTORY & BACK HANDLER
  useEffect(() => {
    if (showParticipantModal || showProgramModal || showRegionModal) {
      if (Platform.OS === 'web') {
        window.history.pushState({ modal: true }, '');
      }
    }
  }, [showParticipantModal, showProgramModal, showRegionModal]);

  useEffect(() => {
    const handlePopState = () => {
      if (showProgramModal) setShowProgramModal(false);
      else if (showRegionModal) setShowRegionModal(false);
      else if (showParticipantModal) setShowParticipantModal(false);
    };

    if (Platform.OS === 'web') {
      window.addEventListener('popstate', handlePopState);
      return () => window.removeEventListener('popstate', handlePopState);
    }
  }, [showParticipantModal, showProgramModal, showRegionModal]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (showProgramModal) setShowProgramModal(false);
        else if (showRegionModal) setShowRegionModal(false);
        else if (showParticipantModal) setShowParticipantModal(false);
      }
    };

    if (Platform.OS === 'web') {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [showParticipantModal, showProgramModal, showRegionModal]);

  useEffect(() => {
    const handleBackPress = () => {
      if (showProgramModal) {
        setShowProgramModal(false);
        return true;
      }
      if (showRegionModal) {
        setShowRegionModal(false);
        return true;
      }
      if (showParticipantModal) {
        setShowParticipantModal(false);
        return true;
      }
      return false;
    };

    if (Platform.OS !== 'web') {
      const backHandler = BackHandler.addEventListener('hardwareBackPress', handleBackPress);
      return () => backHandler.remove();
    }
  }, [showParticipantModal, showProgramModal, showRegionModal]);

  // ✅ DATE/TIME HANDLERS
  const handleDateChange = (event, selectedDate) => {
    if (Platform.OS !== 'web') {
      setShowDatePicker(false);
    }
    if (selectedDate) {
      setDate(selectedDate.toISOString().split('T')[0]);
    }
  };

  const handleDepartureTimeChange = (event, selectedTime) => {
    if (Platform.OS !== 'web') {
      setShowDepartureTimePicker(false);
    }
    if (selectedTime) {
      const hours = String(selectedTime.getHours()).padStart(2, '0');
      const minutes = String(selectedTime.getMinutes()).padStart(2, '0');
      setDepartureTime(`${hours}:${minutes}`);
    }
  };

  const handleStartTimeChange = (event, selectedTime) => {
    if (Platform.OS !== 'web') {
      setShowStartTimePicker(false);
    }
    if (selectedTime) {
      const hours = String(selectedTime.getHours()).padStart(2, '0');
      const minutes = String(selectedTime.getMinutes()).padStart(2, '0');
      setStartTime(`${hours}:${minutes}`);
    }
  };

  // ✅ PARTICIPANT HANDLERS
  const addParticipant = () => {
    if (!participantName.trim()) {
      showAlert('Ошибка', 'Введите имя участника');
      return;
    }
    setParticipants({
      ...participants,
      [currentCategory]: [...participants[currentCategory], participantName],
    });
    setParticipantName('');
  };

  const removeParticipant = (category, name) => {
    setParticipants({
      ...participants,
      [category]: participants[category].filter((p) => p !== name),
    });
  };

  // ✅ SONG HANDLERS
  const addSong = () => {
    if (!songTitle.trim()) {
      showAlert('Ошибка', 'Введите название песни');
      return;
    }
    setSongs([...songs, { title: songTitle, soloists: soloists || '' }]);
    setSongTitle('');
    setSoloists('');
  };

  const removeSong = (index) => {
    setSongs(songs.filter((_, i) => i !== index));
  };

  // ✅ SUBMIT
  const handleSubmit = async () => {
    if (!description.trim() || !address.trim() || !departureTime || !startTime || !region.trim()) {
      showAlert('Ошибка', 'Пожалуйста, заполните все обязательные поля');
      return;
    }

    try {
      const concertData = {
        date,
        concertType,
        description: description.trim(),
        address: address.trim(),
        region: region.trim(),
        departureTime,
        startTime,
        participants,
        program: { title: programTitle, songs },
        updatedAt: new Date(),
      };

      if (isEditing) {
        await updateDoc(doc(db, 'concerts', concert.id), concertData);
        showAlert('Успех', 'Концерт обновлён!', [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]);
      } else {
        await addDoc(collection(db, 'concerts'), {
          ...concertData,
          createdAt: new Date(),
        });
        showAlert('Успех', 'Концерт добавлен!', [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]);
      }
    } catch (error) {
      showAlert('Ошибка', `Не удалось сохранить концерт: ${error.message}`);
    }
  };

  // ✅ RENDER
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1a1a1a" />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ✅ HEADER */}
        <LinearGradient
          colors={['#2a2a2a', '#1a1a1a']}
          style={styles.header}
        >
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={responsiveSize(28)} color="#FFD700" />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { fontSize: responsiveFontSize(20) }]}>
            {isEditing ? 'Редактировать' : 'Новый концерт'}
          </Text>
          <View style={{ width: responsiveSize(28) }} />
        </LinearGradient>

        {/* ✅ DATE CARD */}
        <View style={styles.inputCard}>
          <Text style={[styles.label, { fontSize: responsiveFontSize(14) }]}>Дата *</Text>
          <TouchableOpacity
            style={styles.dateButton}
            onPress={() => setShowDatePicker(true)}
          >
            <LinearGradient
              colors={['rgba(255, 215, 0, 0.15)', 'rgba(255, 215, 0, 0.05)']}
              style={styles.dateButtonGradient}
            >
              <Ionicons name="calendar" size={responsiveSize(20)} color="#FFD700" />
              <Text style={[styles.dateButtonText, { fontSize: responsiveFontSize(14) }]}>
                {date}
              </Text>
              {isEditing && (
                <View style={styles.editingBadge}>
                  <Text style={styles.editingBadgeText}>Редакт.</Text>
                </View>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* ✅ CONCERT TYPE */}
        <View style={styles.inputCard}>
          <Text style={[styles.label, { fontSize: responsiveFontSize(14) }]}>
            Тип концерта *
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.concertTypeScroll}
          >
            {CONCERT_TYPE_LIST.map((type) => (
              <TouchableOpacity
                key={type.value}
                style={[
                  styles.concertTypeButton,
                  concertType === type.value && styles.concertTypeButtonActive,
                  { marginRight: responsiveSize(10) },
                ]}
                onPress={() => setConcertType(type.value)}
              >
                <LinearGradient
                  colors={
                    concertType === type.value
                      ? ['rgba(255, 215, 0, 0.2)', 'rgba(255, 215, 0, 0.1)']
                      : ['rgba(100, 100, 100, 0.15)', 'rgba(100, 100, 100, 0.05)']
                  }
                  style={styles.concertTypeGradient}
                >
                  <Text
                    style={[
                      styles.concertTypeText,
                      { fontSize: responsiveFontSize(12) },
                      concertType === type.value && styles.concertTypeTextActive,
                    ]}
                  >
                    {type.label}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* ✅ DESCRIPTION */}
        <View style={styles.inputCard}>
          <Text style={[styles.label, { fontSize: responsiveFontSize(14) }]}>
            Описание *
          </Text>
          <TextInput
            style={[styles.textInput, { fontSize: responsiveFontSize(14) }]}
            placeholder="Описание концерта..."
            placeholderTextColor="#666"
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={3}
          />
        </View>

        {/* ✅ ADDRESS */}
        <View style={styles.inputCard}>
          <Text style={[styles.label, { fontSize: responsiveFontSize(14) }]}>Адрес *</Text>
          <TextInput
            style={[styles.textInput, { fontSize: responsiveFontSize(14) }]}
            placeholder="Адрес проведения..."
            placeholderTextColor="#666"
            value={address}
            onChangeText={setAddress}
          />
        </View>

        {/* ✅ REGION */}
        <View style={styles.inputCard}>
          <Text style={[styles.label, { fontSize: responsiveFontSize(14) }]}>
            Область проведения *
          </Text>
          <TouchableOpacity
            style={styles.regionButton}
            onPress={() => setShowRegionModal(true)}
          >
            <LinearGradient
              colors={['rgba(52, 199, 89, 0.2)', 'rgba(34, 197, 94, 0.1)']}
              style={styles.regionButtonGradient}
            >
              <Ionicons name="location" size={responsiveSize(20)} color="#34C759" />
              <Text style={[styles.regionButtonText, { fontSize: responsiveFontSize(14) }]}>
                {region}
              </Text>
              <Ionicons name="chevron-forward" size={responsiveSize(20)} color="#34C759" />
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* ✅ TIMES */}
        <View style={styles.timesRow}>
          <View style={[styles.inputCard, { flex: 1 }]}>
            <Text style={[styles.label, { fontSize: responsiveFontSize(14) }]}>
              Время отправки *
            </Text>
            {Platform.OS === 'web' ? (
              <WebTimePicker value={departureTime} onChange={setDepartureTime} />
            ) : (
              <TouchableOpacity
                style={styles.timeButton}
                onPress={() => setShowDepartureTimePicker(true)}
              >
                <Text style={[styles.timeButtonText, { fontSize: responsiveFontSize(14) }]}>
                  {departureTime || 'Выберите время'}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={[styles.inputCard, { flex: 1, marginLeft: responsiveSize(10) }]}>
            <Text style={[styles.label, { fontSize: responsiveFontSize(14) }]}>
              Начало концерта *
            </Text>
            {Platform.OS === 'web' ? (
              <WebTimePicker value={startTime} onChange={setStartTime} />
            ) : (
              <TouchableOpacity
                style={styles.timeButton}
                onPress={() => setShowStartTimePicker(true)}
              >
                <Text style={[styles.timeButtonText, { fontSize: responsiveFontSize(14) }]}>
                  {startTime || 'Выберите время'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* ✅ PARTICIPANTS */}
        <TouchableOpacity
          style={styles.sectionButton}
          onPress={() => setShowParticipantModal(true)}
        >
          <LinearGradient colors={['#4A90E2', '#357ABD']} style={styles.sectionButtonGradient}>
            <Ionicons name="people" size={responsiveSize(20)} color="#FFF" />
            <Text style={[styles.sectionButtonText, { fontSize: responsiveFontSize(14) }]}>
              Участники ({Object.values(participants).flat().length})
            </Text>
            <Ionicons name="chevron-forward" size={responsiveSize(20)} color="#FFF" />
          </LinearGradient>
        </TouchableOpacity>

        {/* ✅ PROGRAM */}
        <TouchableOpacity
          style={styles.sectionButton}
          onPress={() => setShowProgramModal(true)}
        >
          <LinearGradient colors={['#FF6B6B', '#EE5A52']} style={styles.sectionButtonGradient}>
            <Ionicons name="musical-notes" size={responsiveSize(20)} color="#FFF" />
            <Text style={[styles.sectionButtonText, { fontSize: responsiveFontSize(14) }]}>
              Программа ({songs.length})
            </Text>
            <Ionicons name="chevron-forward" size={responsiveSize(20)} color="#FFF" />
          </LinearGradient>
        </TouchableOpacity>

        {/* ✅ SUBMIT BUTTON */}
        <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
          <LinearGradient
            colors={['#34C759', '#30B350']}
            style={styles.submitButtonGradient}
          >
            <Ionicons name="checkmark-done" size={responsiveSize(20)} color="#FFF" />
            <Text style={[styles.submitButtonText, { fontSize: responsiveFontSize(16) }]}>
              {isEditing ? 'Обновить' : 'Создать'} концерт
            </Text>
          </LinearGradient>
        </TouchableOpacity>

        <View style={{ height: responsiveSize(30) }} />
      </ScrollView>

      {/* ✅ DATE PICKER MODAL */}
      {Platform.OS !== 'web' && showDatePicker && (
        <DateTimePicker
          value={new Date(date)}
          mode="date"
          display="spinner"
          onChange={handleDateChange}
        />
      )}

      {/* ✅ DEPARTURE TIME PICKER MODAL */}
      {Platform.OS !== 'web' && showDepartureTimePicker && (
        <DateTimePicker
          value={
            departureTime
              ? new Date(`2024-01-01T${departureTime}:00`)
              : new Date()
          }
          mode="time"
          display="spinner"
          onChange={handleDepartureTimeChange}
        />
      )}

      {/* ✅ START TIME PICKER MODAL */}
      {Platform.OS !== 'web' && showStartTimePicker && (
        <DateTimePicker
          value={
            startTime
              ? new Date(`2024-01-01T${startTime}:00`)
              : new Date()
          }
          mode="time"
          display="spinner"
          onChange={handleStartTimeChange}
        />
      )}

      {/* ✅ PARTICIPANT MODAL */}
      <Modal
        visible={showParticipantModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowParticipantModal(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setShowParticipantModal(false)}
          />
          <View style={styles.modalContent}>
            <LinearGradient
              colors={['rgba(26, 26, 26, 0.98)', 'rgba(35, 35, 35, 0.95)']}
              style={styles.modalGradient}
            >
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { fontSize: responsiveFontSize(18) }]}>
                  Участники
                </Text>
                <TouchableOpacity
                  onPress={() => setShowParticipantModal(false)}
                  style={styles.modalClose}
                >
                  <Ionicons name="close-circle" size={responsiveSize(28)} color="#4A90E2" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.categoryTabs} horizontal showsHorizontalScrollIndicator={false}>
                {PARTICIPANT_CATEGORIES.map((cat) => (
                  <TouchableOpacity
                    key={cat.id}
                    style={[
                      styles.categoryTab,
                      currentCategory === cat.id && styles.categoryTabActive,
                    ]}
                    onPress={() => setCurrentCategory(cat.id)}
                  >
                    <LinearGradient
                      colors={
                        currentCategory === cat.id
                          ? [cat.color, cat.color]
                          : ['rgba(100, 100, 100, 0.2)', 'rgba(100, 100, 100, 0.1)']
                      }
                      style={styles.categoryTabGradient}
                    >
                      <Text
                        style={[
                          styles.categoryTabText,
                          { fontSize: responsiveFontSize(12) },
                          currentCategory === cat.id && { color: '#FFF' },
                        ]}
                      >
                        {cat.label}
                      </Text>
                    </LinearGradient>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <View style={styles.participantInputGroup}>
                <TextInput
                  style={[styles.textInput, { flex: 1, fontSize: responsiveFontSize(14) }]}
                  placeholder="Имя участника..."
                  placeholderTextColor="#666"
                  value={participantName}
                  onChangeText={setParticipantName}
                />
                <TouchableOpacity
                  style={styles.addButton}
                  onPress={addParticipant}
                >
                  <LinearGradient colors={['#34C759', '#30B350']} style={styles.addButtonGradient}>
                    <Ionicons name="add" size={responsiveSize(20)} color="#FFF" />
                  </LinearGradient>
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.participantList} showsVerticalScrollIndicator={false}>
                {participants[currentCategory]?.map((name, idx) => (
                  <View key={idx} style={styles.participantItem}>
                    <LinearGradient
                      colors={[
                        PARTICIPANT_CATEGORIES.find((c) => c.id === currentCategory)?.color || '#FFF',
                        'rgba(255, 255, 255, 0.1)',
                      ]}
                      style={styles.participantItemGradient}
                    >
                      <Text
                        style={[
                          styles.participantItemText,
                          { fontSize: responsiveFontSize(14) },
                        ]}
                      >
                        {name}
                      </Text>
                      <TouchableOpacity
                        onPress={() => removeParticipant(currentCategory, name)}
                      >
                        <Ionicons name="trash" size={responsiveSize(18)} color="#FF6B6B" />
                      </TouchableOpacity>
                    </LinearGradient>
                  </View>
                ))}
              </ScrollView>
            </LinearGradient>
          </View>
        </View>
      </Modal>

      {/* ✅ PROGRAM MODAL */}
      <Modal
        visible={showProgramModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowProgramModal(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setShowProgramModal(false)}
          />
          <View style={styles.modalContent}>
            <LinearGradient
              colors={['rgba(26, 26, 26, 0.98)', 'rgba(35, 35, 35, 0.95)']}
              style={styles.modalGradient}
            >
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { fontSize: responsiveFontSize(18) }]}>
                  Программа концерта
                </Text>
                <TouchableOpacity
                  onPress={() => setShowProgramModal(false)}
                  style={styles.modalClose}
                >
                  <Ionicons name="close-circle" size={responsiveSize(28)} color="#FF6B6B" />
                </TouchableOpacity>
              </View>

              <TextInput
                style={[styles.textInput, { fontSize: responsiveFontSize(14), marginBottom: responsiveSize(15) }]}
                placeholder="Название программы..."
                placeholderTextColor="#666"
                value={programTitle}
                onChangeText={setProgramTitle}
              />

              <View style={styles.participantInputGroup}>
                <TextInput
                  style={[styles.textInput, { flex: 1, fontSize: responsiveFontSize(14) }]}
                  placeholder="Название песни..."
                  placeholderTextColor="#666"
                  value={songTitle}
                  onChangeText={setSongTitle}
                />
                <TouchableOpacity style={styles.addButton} onPress={addSong}>
                  <LinearGradient colors={['#FF6B6B', '#EE5A52']} style={styles.addButtonGradient}>
                    <Ionicons name="add" size={responsiveSize(20)} color="#FFF" />
                  </LinearGradient>
                </TouchableOpacity>
              </View>

              <TextInput
                style={[styles.textInput, { fontSize: responsiveFontSize(14) }]}
                placeholder="Солисты (опционально)..."
                placeholderTextColor="#666"
                value={soloists}
                onChangeText={setSoloists}
              />

              <ScrollView style={styles.songList} showsVerticalScrollIndicator={false}>
                {songs.map((song, idx) => (
                  <View key={idx} style={styles.songItem}>
                    <LinearGradient
                      colors={['rgba(255, 107, 107, 0.2)', 'rgba(238, 90, 82, 0.1)']}
                      style={styles.songItemGradient}
                    >
                      <View style={{ flex: 1 }}>
                        <Text
                          style={[
                            styles.songTitle,
                            { fontSize: responsiveFontSize(14) },
                          ]}
                        >
                          {song.title}
                        </Text>
                        {song.soloists && (
                          <Text
                            style={[
                              styles.songSoloists,
                              { fontSize: responsiveFontSize(12) },
                            ]}
                          >
                            {song.soloists}
                          </Text>
                        )}
                      </View>
                      <TouchableOpacity onPress={() => removeSong(idx)}>
                        <Ionicons name="trash" size={responsiveSize(18)} color="#FF6B6B" />
                      </TouchableOpacity>
                    </LinearGradient>
                  </View>
                ))}
              </ScrollView>
            </LinearGradient>
          </View>
        </View>
      </Modal>

      {/* ✅ REGION MODAL */}
      <Modal
        visible={showRegionModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowRegionModal(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setShowRegionModal(false)}
          />
          <View style={styles.regionModalContent}>
            <LinearGradient
              colors={['rgba(26, 26, 26, 0.98)', 'rgba(35, 35, 35, 0.95)']}
              style={styles.regionModalGradient}
            >
              <View style={styles.regionModalHeader}>
                <Text style={[styles.regionModalTitle, { fontSize: responsiveFontSize(18) }]}>
                  Выберите область
                </Text>
                <TouchableOpacity
                  onPress={() => setShowRegionModal(false)}
                  style={styles.regionModalClose}
                >
                  <Ionicons name="close-circle" size={responsiveSize(28)} color="#34C759" />
                </TouchableOpacity>
              </View>

              <TextInput
                style={[styles.regionSearch, { fontSize: responsiveFontSize(14) }]}
                placeholder="Поиск области..."
                placeholderTextColor="#666"
                value={regionSearch}
                onChangeText={setRegionSearch}
              />

              <ScrollView style={styles.regionList} showsVerticalScrollIndicator={false}>
                {filteredRegions.map((r, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={[styles.regionOption, region === r && styles.regionOptionActive]}
                    onPress={() => {
                      setRegion(r);
                      setShowRegionModal(false);
                      setRegionSearch('');
                    }}
                  >
                    <LinearGradient
                      colors={
                        region === r
                          ? ['rgba(52, 199, 89, 0.2)', 'rgba(34, 197, 94, 0.1)']
                          : ['transparent', 'transparent']
                      }
                      style={styles.regionOptionGradient}
                    >
                      <Ionicons
                        name={region === r ? 'checkmark-circle' : 'ellipse-outline'}
                        size={responsiveSize(20)}
                        color={region === r ? '#34C759' : '#666'}
                      />
                      <Text
                        style={[
                          styles.regionOptionText,
                          { fontSize: responsiveFontSize(14) },
                          region === r && styles.regionOptionTextActive,
                        ]}
                      >
                        {r}
                      </Text>
                    </LinearGradient>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </LinearGradient>
          </View>
        </View>
      </Modal>

      {/* ✅ CUSTOM ALERT */}
      <CustomAlert
        visible={alertVisible}
        title={alertConfig.title}
        message={alertConfig.message}
        buttons={alertConfig.buttons}
        onDismiss={() => setAlertVisible(false)}
      />
    </SafeAreaView>
  );
}

// ✅ STYLES
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  scrollContent: {
    paddingHorizontal: 15,
    paddingTop: 10,
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 15,
    marginHorizontal: -15,
    marginTop: -10,
    marginBottom: 20,
  },
  headerTitle: {
    color: '#E0E0E0',
    fontWeight: '700',
  },
  inputCard: {
    marginBottom: 15,
  },
  label: {
    color: '#E0E0E0',
    fontWeight: '600',
    marginBottom: 8,
  },
  dateButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  dateButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
  },
  dateButtonText: {
    color: '#E0E0E0',
    fontWeight: '600',
    flex: 1,
    marginHorizontal: 10,
  },
  editingBadge: {
    backgroundColor: 'rgba(255, 215, 0, 0.3)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  editingBadgeText: {
    color: '#FFD700',
    fontSize: 10,
    fontWeight: '700',
  },
  concertTypeScroll: {
    marginBottom: 5,
  },
  concertTypeButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  concertTypeButtonActive: {},
  concertTypeGradient: {
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(100, 100, 100, 0.3)',
  },
  concertTypeText: {
    color: '#999',
    fontWeight: '500',
  },
  concertTypeTextActive: {
    color: '#FFD700',
    fontWeight: '700',
  },
  textInput: {
    backgroundColor: 'rgba(42, 42, 42, 0.8)',
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 12,
    color: '#E0E0E0',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  regionButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  regionButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(52, 199, 89, 0.3)',
  },
  regionButtonText: {
    color: '#E0E0E0',
    fontWeight: '600',
    flex: 1,
    marginHorizontal: 10,
  },
  timesRow: {
    flexDirection: 'row',
    marginBottom: 15,
  },
  timeButton: {
    backgroundColor: 'rgba(42, 42, 42, 0.8)',
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  timeInput: {
    backgroundColor: 'rgba(42, 42, 42, 0.8)',
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 12,
    color: '#E0E0E0',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    fontSize: 14,
  },
  timeButtonText: {
    color: '#E0E0E0',
    fontWeight: '600',
  },
  sectionButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 15,
  },
  sectionButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 12,
  },
  sectionButtonText: {
    color: '#FFF',
    fontWeight: '600',
    flex: 1,
    marginHorizontal: 10,
  },
  submitButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 10,
  },
  submitButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderRadius: 12,
  },
  submitButtonText: {
    color: '#FFF',
    fontWeight: '700',
    marginLeft: 10,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalContent: {
    borderRadius: 25,
    margin: 20,
    flex: 1,
    borderWidth: 1,
    borderColor: 'rgba(100, 100, 100, 0.3)',
    maxHeight: Platform.OS === 'web' ? '85vh' : '85%',
  },
  modalGradient: {
    borderRadius: 25,
    padding: 20,
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalTitle: {
    fontWeight: '700',
    color: '#E0E0E0',
  },
  modalClose: {
    padding: 5,
  },
  categoryTabs: {
    marginBottom: 15,
  },
  categoryTab: {
    marginRight: 10,
    borderRadius: 10,
    overflow: 'hidden',
  },
  categoryTabGradient: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  categoryTabText: {
    color: '#999',
    fontWeight: '500',
  },
  participantInputGroup: {
    flexDirection: 'row',
    marginBottom: 15,
    gap: 10,
  },
  addButton: {
    borderRadius: 12,
    overflow: 'hidden',
    width: 50,
  },
  addButtonGradient: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 12,
  },
  participantList: {
    flex: 1,
  },
  participantItem: {
    marginBottom: 10,
    borderRadius: 12,
    overflow: 'hidden',
  },
  participantItemGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 12,
  },
  participantItemText: {
    color: '#E0E0E0',
    fontWeight: '500',
  },
  songList: {
    flex: 1,
  },
  songItem: {
    marginBottom: 10,
    borderRadius: 12,
    overflow: 'hidden',
  },
  songItemGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 12,
  },
  songTitle: {
    color: '#E0E0E0',
    fontWeight: '600',
    marginBottom: 4,
  },
  songSoloists: {
    color: '#999',
    fontStyle: 'italic',
  },
  regionModalContent: {
    borderRadius: 25,
    margin: 20,
    flex: 1,
    borderWidth: 1,
    borderColor: 'rgba(52, 199, 89, 0.3)',
    maxHeight: Platform.OS === 'web' ? '85vh' : '85%',
  },
  regionModalGradient: {
    borderRadius: 25,
    padding: 25,
    flex: 1,
  },
  regionModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  regionModalTitle: {
    fontWeight: '700',
    color: '#E0E0E0',
  },
  regionModalClose: {
    padding: 5,
  },
  regionSearch: {
    backgroundColor: 'rgba(42, 42, 42, 0.8)',
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 12,
    color: '#E0E0E0',
    borderWidth: 1,
    borderColor: 'rgba(52, 199, 89, 0.3)',
    marginBottom: 15,
  },
  regionList: {
    flex: 1,
  },
  regionOption: {
    marginBottom: 8,
    borderRadius: 12,
    overflow: 'hidden',
  },
  regionOptionGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(52, 199, 89, 0.2)',
  },
  regionOptionActive: {},
  regionOptionText: {
    color: '#E0E0E0',
    marginLeft: 12,
    fontWeight: '500',
  },
  regionOptionTextActive: {
    color: '#34C759',
    fontWeight: '700',
  },
  alertOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  alertContent: {
    borderRadius: 20,
    overflow: 'hidden',
    minWidth: '80%',
    maxWidth: 400,
  },
  alertGradient: {
    borderRadius: 20,
    padding: 25,
  },
  alertTitle: {
    color: '#E0E0E0',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 10,
  },
  alertMessage: {
    color: '#999',
    fontSize: 14,
    marginBottom: 20,
    lineHeight: 20,
  },
  alertButtonsContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  alertButton: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  alertButtonGradient: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },
  alertButtonText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 14,
  },
});
