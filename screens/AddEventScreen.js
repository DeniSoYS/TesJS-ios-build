import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { LinearGradient } from 'expo-linear-gradient';
import { addDoc, collection, doc, updateDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import {
  Dimensions,
  KeyboardAvoidingView,
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

// ✅ АДАПТИВНЫЕ РАЗМЕРЫ С RESIZE LISTENER
const getWindowDimensions = () => {
  if (Platform.OS === 'web') {
    return {
      width: window.innerWidth,
      height: window.innerHeight
    };
  }
  return Dimensions.get('window');
};

const useWindowDimensions = () => {
  const [dimensions, setDimensions] = useState(getWindowDimensions());

  useEffect(() => {
    if (Platform.OS === 'web') {
      const handleResize = () => {
        setDimensions(getWindowDimensions());
      };
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
  const baseSize = getResponsiveSize(size, windowWidth);
  return Math.round(baseSize);
};

// ✅ КОМПОНЕНТ CUSTOM ALERT
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
                        : ['#FFD700', '#FFA500']
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

// ✅ КОМПОНЕНТ HTML5 TIME PICKER ДЛЯ WEB
const WebTimePicker = ({ value, onChange, label, placeholder }) => {
  const [timeValue, setTimeValue] = useState(value || '');

  const handleChange = (text) => {
    // Автоформатирование при вводе
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
    } else if (cleaned.length >= 2) {
      const formatted = `${cleaned.substring(0, 2)}:`;
      setTimeValue(formatted);
    } else {
      setTimeValue(cleaned);
    }
  };

  const handleNativeChange = (e) => {
    const newValue = e.target.value;
    setTimeValue(newValue);
    onChange(newValue);
  };

  if (Platform.OS === 'web') {
    return (
      <View style={styles.timeInputCard}>
        <Text style={styles.label}>{label} *</Text>
        <View style={styles.webTimeContainer}>
          <View style={styles.timeInputWrapper}>
            <Ionicons name="time-outline" size={20} color="#FFD700" />
            <input
              type="time"
              value={timeValue}
              onChange={handleNativeChange}
              placeholder={placeholder}
              style={{
                flex: 1,
                marginLeft: 10,
                fontSize: 14,
                color: '#E0E0E0',
                backgroundColor: 'transparent',
                border: 'none',
                outline: 'none',
                fontFamily: 'System',
                fontWeight: '500',
              }}
            />
          </View>
        </View>
      </View>
    );
  }

  return null;
};

// Категории участников
const PARTICIPANT_CATEGORIES = [
  { key: 'femaleChoir', label: 'Женский состав хор', icon: 'woman', color: '#E91E63' },
  { key: 'maleChoir', label: 'Мужской состав хор', icon: 'man', color: '#2196F3' },
  { key: 'maleBallet', label: 'Мужской состав балет', icon: 'fitness', color: '#FF9800' },
  { key: 'femaleBallet', label: 'Женский состав балет', icon: 'ribbon', color: '#9C27B0' },
  { key: 'administration', label: 'Администрация', icon: 'briefcase', color: '#607D8B' },
];

export default function AddEvent({ navigation, route }) {
  const dimensions = useWindowDimensions();
  const { date, userRole, concert, isEditing } = route.params || {};
  
  const [concertType, setConcertType] = useState(concert?.concertType || 'GENERAL');
  const [description, setDescription] = useState(concert?.description || '');
  const [address, setAddress] = useState(concert?.address || '');
  const [departureTime, setDepartureTime] = useState(concert?.departureTime || '');
  const [startTime, setStartTime] = useState(concert?.startTime || '');
  
  const [participants, setParticipants] = useState(
    concert?.participants || {
      femaleChoir: [],
      maleChoir: [],
      maleBallet: [],
      femaleBallet: [],
      administration: []
    }
  );
  const [expandedCategories, setExpandedCategories] = useState({
    femaleChoir: true,
    maleChoir: false,
    maleBallet: false,
    femaleBallet: false,
    administration: false,
  });
  
  const [newParticipant, setNewParticipant] = useState('');
  const [showParticipantModal, setShowParticipantModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  
  const [showDepartureTimePicker, setShowDepartureTimePicker] = useState(false);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [departureDate, setDepartureDate] = useState(new Date());
  const [startDate, setStartDate] = useState(new Date());
  
  const [showProgramModal, setShowProgramModal] = useState(false);
  const [programTitle, setProgramTitle] = useState(concert?.program?.title || '');
  const [songs, setSongs] = useState(concert?.program?.songs || []);
  const [newSong, setNewSong] = useState({
    title: '',
    soloists: ''
  });
  const [editingSongIndex, setEditingSongIndex] = useState(null);

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

  const concertTypes = [
    { value: 'GENERAL', label: 'Общий концерт' },
    { value: 'BRIGADE_1', label: 'Первая бригада' },
    { value: 'BRIGADE_2', label: 'Вторая бригада' },
    { value: 'BRIGADE_ENHANCED', label: 'Концерт усиленной бригады' },
    { value: 'SOLOISTS_ORCHESTRA', label: 'Солисты оркестр' },
  ];

  useEffect(() => {
    if (isEditing) {
      navigation.setOptions({
        title: 'Редактировать концерт'
      });
    }
  }, [isEditing, navigation]);

  // ✅ BROWSER HISTORY API
  useEffect(() => {
    if (Platform.OS === 'web') {
      if (showParticipantModal || showProgramModal) {
        window.history.pushState({ modal: true }, '');
      }

      const handlePopState = () => {
        if (showProgramModal) {
          setShowProgramModal(false);
          return;
        }
        if (showParticipantModal) {
          setShowParticipantModal(false);
          return;
        }
      };

      window.addEventListener('popstate', handlePopState);
      return () => window.removeEventListener('popstate', handlePopState);
    }
  }, [showParticipantModal, showProgramModal]);

  // ✅ ESC KEY HANDLER
  useEffect(() => {
    if (Platform.OS === 'web') {
      const handleKeyPress = (e) => {
        if (e.key === 'Escape') {
          if (showProgramModal) {
            setShowProgramModal(false);
          } else if (showParticipantModal) {
            setShowParticipantModal(false);
          }
        }
      };

      document.addEventListener('keydown', handleKeyPress);
      return () => document.removeEventListener('keydown', handleKeyPress);
    }
  }, [showParticipantModal, showProgramModal]);

  const handleBackPress = () => {
    if (showParticipantModal) {
      setShowParticipantModal(false);
      return;
    }
    if (showProgramModal) {
      setShowProgramModal(false);
      return;
    }
    navigation.goBack();
  };

  // ✅ TIME PICKER ДЛЯ НАТИВНЫХ ПЛАТФОРМ
  const handleTimePicker = (type) => {
    if (Platform.OS !== 'web') {
      if (type === 'departure') {
        setShowDepartureTimePicker(true);
      } else {
        setShowStartTimePicker(true);
      }
    }
  };

  const onDepartureTimeChange = (event, selectedDate) => {
    setShowDepartureTimePicker(false);
    if (selectedDate) {
      setDepartureDate(selectedDate);
      const timeString = selectedDate.toTimeString().split(' ')[0].substring(0, 5);
      setDepartureTime(timeString);
    }
  };

  const onStartTimeChange = (event, selectedDate) => {
    setShowStartTimePicker(false);
    if (selectedDate) {
      setStartDate(selectedDate);
      const timeString = selectedDate.toTimeString().split(' ')[0].substring(0, 5);
      setStartTime(timeString);
    }
  };

  // ФУНКЦИИ ДЛЯ УЧАСТНИКОВ
  const toggleCategory = (categoryKey) => {
    setExpandedCategories(prev => ({
      ...prev,
      [categoryKey]: !prev[categoryKey]
    }));
  };

  const openAddParticipant = (categoryKey) => {
    setSelectedCategory(categoryKey);
    setNewParticipant('');
    setShowParticipantModal(true);
  };

  const addParticipant = () => {
    if (!newParticipant.trim()) {
      showAlert('Ошибка', 'Введите ФИО участника');
      return;
    }

    if (participants[selectedCategory].includes(newParticipant.trim())) {
      showAlert('Ошибка', 'Этот участник уже добавлен в эту категорию');
      return;
    }

    setParticipants(prev => ({
      ...prev,
      [selectedCategory]: [...prev[selectedCategory], newParticipant.trim()]
    }));

    setNewParticipant('');
    setShowParticipantModal(false);
  };

  const removeParticipant = (categoryKey, index) => {
    setParticipants(prev => ({
      ...prev,
      [categoryKey]: prev[categoryKey].filter((_, i) => i !== index)
    }));
  };

  const getTotalParticipantsCount = () => {
    return Object.values(participants).reduce((sum, arr) => sum + arr.length, 0);
  };

  // ФУНКЦИИ ДЛЯ КОНЦЕРТНОЙ ПРОГРАММЫ
  const addOrUpdateSong = () => {
    if (!newSong.title.trim()) {
      showAlert('Ошибка', 'Введите название произведения');
      return;
    }

    if (editingSongIndex !== null) {
      const updatedSongs = [...songs];
      updatedSongs[editingSongIndex] = { ...newSong };
      setSongs(updatedSongs);
      setEditingSongIndex(null);
    } else {
      setSongs([...songs, { ...newSong }]);
    }

    setNewSong({ title: '', soloists: '' });
  };

  const editSong = (index) => {
    setNewSong({ ...songs[index] });
    setEditingSongIndex(index);
  };

  const removeSong = (index) => {
    const updatedSongs = songs.filter((_, i) => i !== index);
    setSongs(updatedSongs);
    if (editingSongIndex === index) {
      setEditingSongIndex(null);
      setNewSong({ title: '', soloists: '' });
    }
  };

  const clearProgram = () => {
    setProgramTitle('');
    setSongs([]);
    setNewSong({ title: '', soloists: '' });
    setEditingSongIndex(null);
  };

  // СОХРАНЕНИЕ КОНЦЕРТА
  const handleSubmit = async () => {
    if (!description.trim() || !address.trim() || !departureTime || !startTime) {
      showAlert('Ошибка', 'Пожалуйста, заполните все обязательные поля');
      return;
    }

    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(departureTime) || !timeRegex.test(startTime)) {
      showAlert('Ошибка', 'Неверный формат времени. Используйте HH:MM (например, 14:30)');
      return;
    }

    try {
      const concertData = {
        date: isEditing ? concert.date : date,
        concertType: concertType,
        description: description.trim(),
        address: address.trim(),
        departureTime: departureTime,
        startTime: startTime,
        participants: participants,
        program: {
          title: programTitle,
          songs: songs
        },
        updatedAt: new Date(),
      };

      let message;
      
      if (isEditing && concert) {
        await updateDoc(doc(db, 'concerts', concert.id), concertData);
        message = 'Концерт успешно обновлен';
      } else {
        concertData.createdAt = new Date();
        await addDoc(collection(db, 'concerts'), concertData);
        message = 'Концерт успешно добавлен';
      }

      showAlert(
        'Успех',
        message,
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      console.error('Ошибка при сохранении концерта:', error);
      showAlert('Ошибка', 'Не удалось сохранить концерт');
    }
  };

  // ✅ ВЫЧИСЛЯЕМ RESPONSIVE SIZES
  const responsiveSize = (size) => getResponsiveSize(size, dimensions.width);
  const responsiveFontSize = (size) => getResponsiveFontSize(size, dimensions.width);

  // ✅ РЕНДЕР TIME INPUT
  const renderTimeInput = (type, value, placeholder, label) => {
    if (Platform.OS === 'web') {
      return (
        <WebTimePicker
          value={value}
          onChange={type === 'departure' ? setDepartureTime : setStartTime}
          label={label}
          placeholder={placeholder}
        />
      );
    } else {
      return (
        <View style={styles.timeInputCard}>
          <Text style={[styles.label, { fontSize: responsiveFontSize(14) }]}>{label} *</Text>
          <TouchableOpacity 
            style={styles.timeInput}
            onPress={() => handleTimePicker(type)}
          >
            <Ionicons name="time-outline" size={responsiveSize(20)} color="#FFD700" />
            <Text style={[
              value ? styles.timeText : styles.timePlaceholder,
              { fontSize: responsiveFontSize(14) }
            ]}>
              {value || placeholder}
            </Text>
          </TouchableOpacity>
        </View>
      );
    }
  };

  const KeyboardAvoidComponent = Platform.OS === 'web' ? View : KeyboardAvoidingView;

  return (
    <LinearGradient
      colors={['#0a0a0a', '#1a1a1a', '#2a2a2a']}
      style={styles.container}
    >
      <KeyboardAvoidComponent 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoid}
      >
        {/* ХЕДЕР */}
        <LinearGradient
          colors={['rgba(26, 26, 26, 0.98)', 'rgba(35, 35, 35, 0.95)']}
          style={[styles.header, { paddingTop: Platform.OS === 'ios' ? responsiveSize(50) : responsiveSize(30) }]}
        >
          <View style={styles.headerContent}>
            <TouchableOpacity 
              onPress={handleBackPress}
              style={styles.backButton}
            >
              <LinearGradient
                colors={['#FFD700', '#FFA500']}
                style={styles.backButtonGradient}
              >
                <Ionicons name="arrow-back" size={responsiveSize(20)} color="#1a1a1a" />
              </LinearGradient>
            </TouchableOpacity>
            
            <View style={styles.titleContainer}>
              <Text style={[styles.headerTitle, { fontSize: responsiveFontSize(18) }]}>
                {isEditing ? 'Редактировать концерт' : 'Добавить концерт'}
              </Text>
              <Text style={[styles.headerSubtitle, { fontSize: responsiveFontSize(12) }]}>
                {isEditing ? 'Обновление информации' : 'Создание нового мероприятия'}
              </Text>
            </View>

            <View style={styles.headerSpacer} />
          </View>
        </LinearGradient>

        <ScrollView 
          showsVerticalScrollIndicator={false} 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.contentContainer}>
            {/* КАРТОЧКА С ДАТОЙ */}
            <View style={styles.dateCard}>
              <LinearGradient
                colors={['rgba(255, 215, 0, 0.15)', 'rgba(255, 165, 0, 0.1)']}
                style={styles.dateGradient}
              >
                <View style={styles.dateContent}>
                  <Ionicons name="calendar" size={responsiveSize(24)} color="#FFD700" />
                  <View style={styles.dateTextContainer}>
                    <Text style={[styles.dateLabel, { fontSize: responsiveFontSize(12) }]}>Дата концерта</Text>
                    <Text style={[styles.dateValue, { fontSize: responsiveFontSize(16) }]}>
                      {new Date(isEditing ? concert.date : date).toLocaleDateString('ru-RU', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric'
                      })}
                    </Text>
                  </View>
                </View>
                {isEditing && (
                  <View style={styles.editingBadge}>
                    <Text style={[styles.editingBadgeText, { fontSize: responsiveFontSize(10) }]}>РЕДАКТИРОВАНИЕ</Text>
                  </View>
                )}
              </LinearGradient>
            </View>

            {/* ТИП КОНЦЕРТА */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { fontSize: responsiveFontSize(16) }]}>🎵 Тип концерта</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.typeScroll}>
                <View style={styles.typeContainer}>
                  {concertTypes.map((type) => (
                    <TouchableOpacity
                      key={type.value}
                      style={[
                        styles.typeButton,
                        concertType === type.value && styles.typeButtonActive
                      ]}
                      onPress={() => setConcertType(type.value)}
                    >
                      <LinearGradient
                        colors={concertType === type.value ? 
                          ['#FFD700', '#FFA500'] : 
                          ['rgba(42, 42, 42, 0.8)', 'rgba(35, 35, 35, 0.8)']}
                        style={styles.typeButtonGradient}
                      >
                        <Text style={[
                          styles.typeButtonText,
                          { fontSize: responsiveFontSize(12) },
                          concertType === type.value && styles.typeButtonTextActive
                        ]}>
                          {type.label}
                        </Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>

            {/* ОСНОВНАЯ ИНФОРМАЦИЯ */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { fontSize: responsiveFontSize(16) }]}>📝 Основная информация</Text>
              
              <View style={styles.inputCard}>
                <Text style={[styles.label, { fontSize: responsiveFontSize(14) }]}>Описание концерта *</Text>
                <TextInput
                  style={[styles.textInput, { fontSize: responsiveFontSize(14) }]}
                  value={description}
                  onChangeText={setDescription}
                  placeholder="Введите описание концерта..."
                  placeholderTextColor="#666"
                  multiline
                  numberOfLines={3}
                />
              </View>

              <View style={styles.inputCard}>
                <Text style={[styles.label, { fontSize: responsiveFontSize(14) }]}>Адрес проведения *</Text>
                <TextInput
                  style={[styles.textInput, { fontSize: responsiveFontSize(14) }]}
                  value={address}
                  onChangeText={setAddress}
                  placeholder="Введите адрес..."
                  placeholderTextColor="#666"
                />
              </View>
            </View>

            {/* ВРЕМЯ */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { fontSize: responsiveFontSize(16) }]}>⏰ Время</Text>
              
              <View style={styles.timeContainer}>
                {renderTimeInput('departure', departureTime, '00:00', 'Время выезда')}
                {renderTimeInput('start', startTime, '00:00', 'Время начала')}
              </View>
              
              <Text style={[styles.timeHint, { fontSize: responsiveFontSize(11) }]}>
                💡 Формат времени: ЧЧ:ММ (например, 14:30)
              </Text>
            </View>

            {/* КОНЦЕРТНАЯ ПРОГРАММА */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { fontSize: responsiveFontSize(16) }]}>🎼 Концертная программа</Text>
                <TouchableOpacity 
                  style={styles.programButton}
                  onPress={() => setShowProgramModal(true)}
                >
                  <LinearGradient
                    colors={['#9B59B6', '#8E44AD']}
                    style={styles.programButtonGradient}
                  >
                    <Ionicons name="musical-notes" size={responsiveSize(16)} color="white" />
                    <Text style={[styles.programButtonText, { fontSize: responsiveFontSize(12) }]}>
                      {songs.length > 0 ? `Программа (${songs.length})` : 'Добавить'}
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
              
              {songs.length > 0 && (
                <View style={styles.programPreview}>
                  <Text style={[styles.programPreviewText, { fontSize: responsiveFontSize(13) }]}>
                    {songs.length} произведений в программе
                  </Text>
                </View>
              )}
            </View>

            {/* УЧАСТНИКИ ПО КАТЕГОРИЯМ */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { fontSize: responsiveFontSize(16) }]}>
                  👥 Участники ({getTotalParticipantsCount()})
                </Text>
              </View>

              {PARTICIPANT_CATEGORIES.map((category) => (
                <View key={category.key} style={styles.categoryCard}>
                  <TouchableOpacity 
                    style={styles.categoryHeader}
                    onPress={() => toggleCategory(category.key)}
                  >
                    <LinearGradient
                      colors={expandedCategories[category.key] ? 
                        [`${category.color}40`, `${category.color}20`] : 
                        ['rgba(42, 42, 42, 0.6)', 'rgba(35, 35, 35, 0.6)']}
                      style={styles.categoryHeaderGradient}
                    >
                      <View style={styles.categoryTitleContainer}>
                        <Ionicons 
                          name={category.icon} 
                          size={responsiveSize(20)} 
                          color={category.color} 
                        />
                        <View style={styles.categoryTitleTextContainer}>
                          <Text style={[styles.categoryTitle, { fontSize: responsiveFontSize(14) }]}>{category.label}</Text>
                          <Text style={[styles.categoryCount, { fontSize: responsiveFontSize(11) }]}>
                            {participants[category.key].length} участников
                          </Text>
                        </View>
                      </View>
                      
                      <View style={styles.categoryActions}>
                        <TouchableOpacity 
                          style={styles.addCategoryButton}
                          onPress={(e) => {
                            e.stopPropagation();
                            openAddParticipant(category.key);
                          }}
                        >
                          <Ionicons name="add-circle" size={responsiveSize(24)} color={category.color} />
                        </TouchableOpacity>
                        <Ionicons 
                          name={expandedCategories[category.key] ? 'chevron-up' : 'chevron-down'} 
                          size={responsiveSize(20)} 
                          color="#999" 
                        />
                      </View>
                    </LinearGradient>
                  </TouchableOpacity>

                  {expandedCategories[category.key] && (
                    <View style={styles.categoryContent}>
                      {participants[category.key].length === 0 ? (
                        <View style={styles.categoryEmptyState}>
                          <Ionicons name="people-outline" size={responsiveSize(24)} color="#555" />
                          <Text style={[styles.categoryEmptyText, { fontSize: responsiveFontSize(12) }]}>
                            Участники не добавлены
                          </Text>
                        </View>
                      ) : (
                        <View style={styles.participantsList}>
                          {participants[category.key].map((participant, index) => (
                            <View key={index} style={styles.participantItem}>
                              <LinearGradient
                                colors={[`${category.color}20`, `${category.color}10`]}
                                style={styles.participantItemGradient}
                              >
                                <View style={styles.participantInfo}>
                                  <Text style={[styles.participantNumber, { fontSize: responsiveFontSize(12) }]}>
                                    {index + 1}.
                                  </Text>
                                  <Text style={[styles.participantName, { fontSize: responsiveFontSize(13) }]}>
                                    {participant}
                                  </Text>
                                </View>
                                <TouchableOpacity 
                                  onPress={() => removeParticipant(category.key, index)}
                                  style={styles.removeParticipantButton}
                                >
                                  <Ionicons name="close-circle" size={responsiveSize(20)} color="#FF6B6B" />
                                </TouchableOpacity>
                              </LinearGradient>
                            </View>
                          ))}
                        </View>
                      )}
                    </View>
                  )}
                </View>
              ))}
            </View>

            {/* КНОПКА СОХРАНЕНИЯ */}
            <TouchableOpacity 
              style={styles.submitButton}
              onPress={handleSubmit}
            >
              <LinearGradient
                colors={['#FFD700', '#FFA500']}
                style={styles.submitGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Ionicons name="save-outline" size={responsiveSize(20)} color="#1a1a1a" />
                <Text style={[styles.submitText, { fontSize: responsiveFontSize(16) }]}>
                  {isEditing ? 'Обновить концерт' : 'Сохранить концерт'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </ScrollView>

        {/* ✅ МОДАЛЬНОЕ ОКНО УЧАСТНИКОВ */}
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
                style={styles.modalContentGradient}
              >
                <View style={styles.modalHeader}>
                  <Text style={[styles.modalTitle, { fontSize: responsiveFontSize(18) }]}>
                    Добавить участника
                    {selectedCategory && (
                      <Text style={[styles.modalSubtitle, { fontSize: responsiveFontSize(13) }]}>
                        {'\n'}
                        {PARTICIPANT_CATEGORIES.find(c => c.key === selectedCategory)?.label}
                      </Text>
                    )}
                  </Text>
                  <TouchableOpacity 
                    onPress={() => setShowParticipantModal(false)}
                    style={styles.modalCloseButton}
                  >
                    <Ionicons name="close-circle" size={responsiveSize(28)} color="#FFD700" />
                  </TouchableOpacity>
                </View>
                
                <TextInput
                  style={[styles.modalInput, { fontSize: responsiveFontSize(14) }]}
                  value={newParticipant}
                  onChangeText={setNewParticipant}
                  placeholder="ФИО участника"
                  placeholderTextColor="#666"
                  autoFocus={Platform.OS !== 'web'}
                  onSubmitEditing={addParticipant}
                  returnKeyType="done"
                />

                <View style={styles.modalButtons}>
                  <TouchableOpacity 
                    style={styles.cancelButton}
                    onPress={() => setShowParticipantModal(false)}
                  >
                    <Text style={[styles.cancelButtonText, { fontSize: responsiveFontSize(14) }]}>Отмена</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={styles.confirmButton}
                    onPress={addParticipant}
                  >
                    <LinearGradient
                      colors={selectedCategory ? [
                        PARTICIPANT_CATEGORIES.find(c => c.key === selectedCategory)?.color || '#4A90E2',
                        PARTICIPANT_CATEGORIES.find(c => c.key === selectedCategory)?.color || '#357ABD'
                      ] : ['#4A90E2', '#357ABD']}
                      style={styles.confirmButtonGradient}
                    >
                      <Text style={[styles.confirmButtonText, { fontSize: responsiveFontSize(14) }]}>Добавить</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </LinearGradient>
            </View>
          </View>
        </Modal>

        {/* ✅ МОДАЛЬНОЕ ОКНО ПРОГРАММЫ */}
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
            <View style={styles.programModalContent}>
              <LinearGradient
                colors={['rgba(26, 26, 26, 0.98)', 'rgba(35, 35, 35, 0.95)']}
                style={styles.programModalGradient}
              >
                <View style={styles.programModalHeader}>
                  <View style={styles.programTitleContainer}>
                    <Ionicons name="musical-notes" size={responsiveSize(24)} color="#FFD700" />
                    <Text style={[styles.programModalTitle, { fontSize: responsiveFontSize(18) }]}>
                      Концертная программа
                    </Text>
                  </View>
                  <TouchableOpacity 
                    onPress={() => setShowProgramModal(false)}
                    style={styles.programModalClose}
                  >
                    <Ionicons name="close-circle" size={responsiveSize(28)} color="#FFD700" />
                  </TouchableOpacity>
                </View>

                <ScrollView style={styles.programScroll}>
                  <View style={styles.inputCard}>
                    <Text style={[styles.label, { fontSize: responsiveFontSize(14) }]}>Название программы</Text>
                    <TextInput
                      style={[styles.textInput, { fontSize: responsiveFontSize(14) }]}
                      value={programTitle}
                      onChangeText={setProgramTitle}
                      placeholder="Введите название программы..."
                      placeholderTextColor="#666"
                    />
                  </View>

                  <View style={styles.songFormCard}>
                    <Text style={[styles.sectionTitle, { fontSize: responsiveFontSize(16) }]}>
                      {editingSongIndex !== null ? '✏️ Редактировать произведение' : '🎵 Добавить произведение'}
                    </Text>
                    
                    <TextInput
                      style={[styles.textInput, { fontSize: responsiveFontSize(14) }]}
                      value={newSong.title}
                      onChangeText={(text) => setNewSong({...newSong, title: text})}
                      placeholder="Название произведения *"
                      placeholderTextColor="#666"
                    />
                    
                    <TextInput
                      style={[styles.textInput, { fontSize: responsiveFontSize(14) }]}
                      value={newSong.soloists}
                      onChangeText={(text) => setNewSong({...newSong, soloists: text})}
                      placeholder="Солисты (через запятую)"
                      placeholderTextColor="#666"
                    />
                    
                    <View style={styles.songFormButtons}>
                      {editingSongIndex !== null && (
                        <TouchableOpacity 
                          style={styles.cancelEditButton}
                          onPress={() => {
                            setNewSong({ title: '', soloists: '' });
                            setEditingSongIndex(null);
                          }}
                        >
                          <Text style={[styles.cancelEditText, { fontSize: responsiveFontSize(12) }]}>Отмена</Text>
                        </TouchableOpacity>
                      )}
                      <TouchableOpacity 
                        style={styles.addSongButton}
                        onPress={addOrUpdateSong}
                      >
                        <LinearGradient
                          colors={['#9B59B6', '#8E44AD']}
                          style={styles.addSongGradient}
                        >
                          <Text style={[styles.addSongText, { fontSize: responsiveFontSize(12) }]}>
                            {editingSongIndex !== null ? 'Обновить' : 'Добавить'}
                          </Text>
                        </LinearGradient>
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View style={styles.songsSection}>
                    <Text style={[styles.sectionTitle, { fontSize: responsiveFontSize(16) }]}>
                      📋 Список произведений {songs.length > 0 && `(${songs.length})`}
                    </Text>
                    
                    {songs.length === 0 ? (
                      <View style={styles.emptyState}>
                        <Ionicons name="musical-notes" size={responsiveSize(40)} color="#555" />
                        <Text style={[styles.emptyStateText, { fontSize: responsiveFontSize(14) }]}>
                          Произведения не добавлены
                        </Text>
                      </View>
                    ) : (
                      <View style={styles.songsList}>
                        {songs.map((song, index) => (
                          <View key={index} style={styles.songItem}>
                            <LinearGradient
                              colors={['rgba(155, 89, 182, 0.2)', 'rgba(142, 68, 173, 0.2)']}
                              style={styles.songItemGradient}
                            >
                              <View style={styles.songContent}>
                                <Text style={[styles.songNumber, { fontSize: responsiveFontSize(12) }]}>
                                  {index + 1}.
                                </Text>
                                <View style={styles.songDetails}>
                                  <Text style={[styles.songTitle, { fontSize: responsiveFontSize(13) }]}>
                                    {song.title}
                                  </Text>
                                  {song.soloists && (
                                    <Text style={[styles.songSoloists, { fontSize: responsiveFontSize(11) }]}>
                                      Солисты: {song.soloists}
                                    </Text>
                                  )}
                                </View>
                              </View>
                              <View style={styles.songActions}>
                                <TouchableOpacity 
                                  onPress={() => editSong(index)}
                                  style={styles.songActionButton}
                                >
                                  <Ionicons name="create-outline" size={responsiveSize(18)} color="#FFD700" />
                                </TouchableOpacity>
                                <TouchableOpacity 
                                  onPress={() => removeSong(index)}
                                  style={styles.songActionButton}
                                >
                                  <Ionicons name="trash-outline" size={responsiveSize(18)} color="#FF6B6B" />
                                </TouchableOpacity>
                              </View>
                            </LinearGradient>
                          </View>
                        ))}
                      </View>
                    )}

                    {songs.length > 0 && (
                      <TouchableOpacity 
                        style={styles.clearProgramButton}
                        onPress={clearProgram}
                      >
                        <LinearGradient
                          colors={['#FF6B6B', '#EE5A52']}
                          style={styles.clearProgramGradient}
                        >
                          <Text style={[styles.clearProgramText, { fontSize: responsiveFontSize(14) }]}>
                            Очистить программу
                          </Text>
                        </LinearGradient>
                      </TouchableOpacity>
                    )}
                  </View>
                </ScrollView>
              </LinearGradient>
            </View>
          </View>
        </Modal>

        {/* Time Pickers для нативных платформ */}
        {Platform.OS !== 'web' && showDepartureTimePicker && (
          <DateTimePicker
            value={departureDate}
            mode="time"
            is24Hour={true}
            onChange={onDepartureTimeChange}
          />
        )}

        {Platform.OS !== 'web' && showStartTimePicker && (
          <DateTimePicker
            value={startDate}
            mode="time"
            is24Hour={true}
            onChange={onStartTimeChange}
          />
        )}

        {/* ✅ CUSTOM ALERT COMPONENT */}
        <CustomAlert
          visible={alertConfig.visible}
          title={alertConfig.title}
          message={alertConfig.message}
          buttons={alertConfig.buttons}
          onClose={closeAlert}
        />
      </KeyboardAvoidComponent>
    </LinearGradient>
  );
}

// ✅ СТИЛИ
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardAvoid: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  backButtonGradient: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
  },
  titleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontWeight: '800',
    color: '#E0E0E0',
    textAlign: 'center',
  },
  headerSubtitle: {
    color: '#999',
    marginTop: 4,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 44,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  dateCard: {
    marginBottom: 25,
  },
  dateGradient: {
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
  },
  dateContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateTextContainer: {
    marginLeft: 12,
  },
  dateLabel: {
    color: '#999',
    fontWeight: '600',
  },
  dateValue: {
    color: '#E0E0E0',
    fontWeight: '700',
    marginTop: 2,
  },
  editingBadge: {
    backgroundColor: 'rgba(255, 107, 107, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 107, 0.4)',
  },
  editingBadgeText: {
    color: '#FF6B6B',
    fontWeight: '800',
  },
  section: {
    marginBottom: 25,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    fontWeight: '700',
    color: '#E0E0E0',
  },
  typeScroll: {
    marginHorizontal: -5,
  },
  typeContainer: {
    flexDirection: 'row',
    paddingHorizontal: 5,
  },
  typeButton: {
    borderRadius: 20,
    overflow: 'hidden',
    marginHorizontal: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  typeButtonGradient: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  typeButtonText: {
    color: '#999',
    fontWeight: '600',
  },
  typeButtonTextActive: {
    color: '#1a1a1a',
    fontWeight: '700',
  },
  inputCard: {
    marginBottom: 15,
  },
  label: {
    fontWeight: '600',
    color: '#E0E0E0',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: 'rgba(42, 42, 42, 0.8)',
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 12,
    color: '#E0E0E0',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    textAlignVertical: 'top',
  },
  timeContainer: {
    flexDirection: Platform.OS === 'web' ? 'column' : 'row',
    justifyContent: 'space-between',
  },
  timeInputCard: {
    flex: 1,
    marginHorizontal: 5,
    marginBottom: Platform.OS === 'web' ? 15 : 0,
  },
  webTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeInputWrapper: {
    backgroundColor: 'rgba(42, 42, 42, 0.8)',
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  timeInput: {
    backgroundColor: 'rgba(42, 42, 42, 0.8)',
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeText: {
    color: '#E0E0E0',
    marginLeft: 10,
    fontWeight: '500',
  },
  timePlaceholder: {
    color: '#666',
    marginLeft: 10,
  },
  timeHint: {
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  programButton: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  programButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
  },
  programButtonText: {
    color: 'white',
    fontWeight: '600',
    marginLeft: 6,
  },
  programPreview: {
    backgroundColor: 'rgba(155, 89, 182, 0.1)',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(155, 89, 182, 0.3)',
  },
  programPreviewText: {
    color: '#9B59B6',
    fontWeight: '500',
    textAlign: 'center',
  },
  categoryCard: {
    marginBottom: 12,
    borderRadius: 12,
    overflow: 'hidden',
  },
  categoryHeader: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  categoryHeaderGradient: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  categoryTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  categoryTitleTextContainer: {
    marginLeft: 12,
  },
  categoryTitle: {
    fontWeight: '700',
    color: '#E0E0E0',
  },
  categoryCount: {
    color: '#999',
    marginTop: 2,
  },
  categoryActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  addCategoryButton: {
    padding: 5,
    marginRight: 10,
  },
  categoryContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: 'rgba(20, 20, 20, 0.5)',
  },
  categoryEmptyState: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  categoryEmptyText: {
    color: '#666',
    marginTop: 8,
  },
  participantsList: {
    paddingTop: 8,
  },
  participantItem: {
    marginBottom: 8,
    borderRadius: 8,
    overflow: 'hidden',
  },
  participantItemGradient: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
  },
  participantInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  participantNumber: {
    color: '#999',
    fontWeight: '600',
    marginRight: 8,
  },
  participantName: {
    color: '#E0E0E0',
    fontWeight: '500',
  },
  removeParticipantButton: {
    padding: 5,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 30,
  },
  emptyStateText: {
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
  },
  submitButton: {
    marginTop: 10,
    marginBottom: 30,
    borderRadius: 15,
    overflow: 'hidden',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  submitGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 15,
  },
  submitText: {
    color: '#1a1a1a',
    fontWeight: '700',
    marginLeft: 8,
  },
  
  // ✅ МОДАЛЬНЫЕ ОКНА
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
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
    width: '100%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
  },
  modalContentGradient: {
    borderRadius: 25,
    padding: 25,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  modalTitle: {
    fontWeight: '700',
    color: '#E0E0E0',
    flex: 1,
  },
  modalSubtitle: {
    color: '#FFD700',
    fontWeight: '600',
  },
  modalCloseButton: {
    padding: 5,
  },
  modalInput: {
    backgroundColor: 'rgba(42, 42, 42, 0.8)',
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 12,
    color: '#E0E0E0',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginRight: 10,
    backgroundColor: 'rgba(42, 42, 42, 0.8)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  cancelButtonText: {
    color: '#E0E0E0',
    fontWeight: '600',
  },
  confirmButton: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  confirmButtonGradient: {
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 12,
  },
  confirmButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  programModalContent: {
    borderRadius: 25,
    margin: 20,
    flex: 1,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
    maxHeight: Platform.OS === 'web' ? '85vh' : '85%',
  },
  programModalGradient: {
    borderRadius: 25,
    padding: 25,
    flex: 1,
  },
  programModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  programTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  programModalTitle: {
    fontWeight: '700',
    color: '#E0E0E0',
    marginLeft: 10,
  },
  programModalClose: {
    padding: 5,
  },
  programScroll: {
    flex: 1,
  },
  songFormCard: {
    backgroundColor: 'rgba(42, 42, 42, 0.6)',
    borderRadius: 12,
    padding: 15,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  songFormButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 10,
  },
  cancelEditButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginRight: 10,
    backgroundColor: 'rgba(42, 42, 42, 0.8)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  cancelEditText: {
    color: '#E0E0E0',
    fontWeight: '500',
  },
  addSongButton: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  addSongGradient: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addSongText: {
    color: 'white',
    fontWeight: '600',
  },
  songsSection: {
    marginBottom: 20,
  },
  songsList: {
    marginBottom: 20,
  },
  songItem: {
    marginBottom: 8,
    borderRadius: 12,
    overflow: 'hidden',
  },
  songItemGradient: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
  },
  songContent: {
    flexDirection: 'row',
    flex: 1,
    alignItems: 'flex-start',
  },
  songNumber: {
    color: '#9B59B6',
    fontWeight: 'bold',
    marginRight: 8,
    marginTop: 2,
  },
  songDetails: {
    flex: 1,
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
  songActions: {
    flexDirection: 'row',
  },
  songActionButton: {
    padding: 5,
    marginLeft: 8,
  },
  clearProgramButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 10,
  },
  clearProgramGradient: {
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 12,
  },
  clearProgramText: {
    color: 'white',
    fontWeight: '600',
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
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
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