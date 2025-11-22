import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { LinearGradient } from 'expo-linear-gradient';
import { addDoc, collection, doc, updateDoc } from 'firebase/firestore';
import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  BackHandler,
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

// Категории участников
const PARTICIPANT_CATEGORIES = [
  { key: 'femaleChoir', label: 'Женский состав хор', icon: 'woman', color: '#E91E63' },
  { key: 'maleChoir', label: 'Мужской состав хор', icon: 'man', color: '#2196F3' },
  { key: 'maleBallet', label: 'Мужской состав балет', icon: 'fitness', color: '#FF9800' },
  { key: 'femaleBallet', label: 'Женский состав балет', icon: 'ribbon', color: '#9C27B0' },
  { key: 'administration', label: 'Администрация', icon: 'briefcase', color: '#607D8B' },
];

export default function AddEvent({ navigation, route }) {
  const { date, userRole, concert, isEditing } = route.params || {};
  
  // ✅ СОСТОЯНИЯ С УЧЕТОМ РЕДАКТИРОВАНИЯ
  const [concertType, setConcertType] = useState(concert?.concertType || 'GENERAL');
  const [description, setDescription] = useState(concert?.description || '');
  const [address, setAddress] = useState(concert?.address || '');
  const [departureTime, setDepartureTime] = useState(concert?.departureTime || '');
  const [startTime, setStartTime] = useState(concert?.startTime || '');
  
  // ✅ НОВАЯ СТРУКТУРА УЧАСТНИКОВ ПО КАТЕГОРИЯМ
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
  
  // Состояния для концертной программы
  const [showProgramModal, setShowProgramModal] = useState(false);
  const [programTitle, setProgramTitle] = useState(concert?.program?.title || '');
  const [songs, setSongs] = useState(concert?.program?.songs || []);
  const [newSong, setNewSong] = useState({
    title: '',
    soloists: ''
  });
  const [editingSongIndex, setEditingSongIndex] = useState(null);

  // Рефы для управления модальными окнами
  const participantModalRef = useRef(null);
  const programModalRef = useRef(null);

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

  // ✅ ИСПРАВЛЕННАЯ НАВИГАЦИЯ ДЛЯ PWA
  useEffect(() => {
    if (Platform.OS !== 'web') {
      const backHandler = BackHandler.addEventListener('hardwareBackPress', handleBackPress);
      return () => backHandler.remove();
    }
  }, []);

  const handleBackPress = () => {
    if (showParticipantModal) {
      setShowParticipantModal(false);
      return true;
    }
    if (showProgramModal) {
      setShowProgramModal(false);
      return true;
    }
    navigation.goBack();
    return true;
  };

  // ✅ УЛУЧШЕННЫЙ ФОРМАТ ВРЕМЕНИ ДЛЯ PWA
  const formatTimeInput = (text) => {
    // Удаляем все нецифровые символы
    const cleaned = text.replace(/\D/g, '');
    
    if (cleaned.length === 0) return '';
    if (cleaned.length <= 2) {
      const hours = parseInt(cleaned);
      if (hours > 23) return '23';
      return cleaned;
    }
    
    const hours = parseInt(cleaned.substring(0, 2));
    const minutes = cleaned.substring(2, 4);
    
    const validHours = hours > 23 ? 23 : hours;
    const validMinutes = minutes ? (parseInt(minutes) > 59 ? 59 : parseInt(minutes)) : 0;
    
    return `${String(validHours).padStart(2, '0')}:${String(validMinutes).padStart(2, '0')}`;
  };

  // ✅ УЛУЧШЕННЫЙ TIME PICKER ДЛЯ PWA
  const handleTimePicker = (type) => {
    if (Platform.OS === 'web') {
      // Для PWA используем простой выбор времени
      const currentTime = type === 'departure' ? departureTime : startTime;
      const newTime = prompt(`Введите время ${type === 'departure' ? 'выезда' : 'начала'} (ЧЧ:ММ):`, currentTime || '00:00');
      
      if (newTime) {
        const formattedTime = formatTimeInput(newTime);
        if (formattedTime) {
          if (type === 'departure') {
            setDepartureTime(formattedTime);
          } else {
            setStartTime(formattedTime);
          }
        }
      }
    } else {
      // Для нативных платформ используем стандартный пикер
      if (type === 'departure') {
        setShowDepartureTimePicker(true);
      } else {
        setShowStartTimePicker(true);
      }
    }
  };

  const handleDepartureTimeChange = (text) => {
    const formatted = formatTimeInput(text);
    setDepartureTime(formatted);
  };

  const handleStartTimeChange = (text) => {
    const formatted = formatTimeInput(text);
    setStartTime(formatted);
  };

  // Для нативных платформ
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

  // ========================================
  // 👥 ФУНКЦИИ ДЛЯ УЧАСТНИКОВ ПО КАТЕГОРИЯМ
  // ========================================

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
      Alert.alert('Ошибка', 'Введите ФИО участника');
      return;
    }

    if (participants[selectedCategory].includes(newParticipant.trim())) {
      Alert.alert('Ошибка', 'Этот участник уже добавлен в эту категорию');
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

  // ========================================
  // 🎵 ФУНКЦИИ ДЛЯ КОНЦЕРТНОЙ ПРОГРАММЫ
  // ========================================

  const addOrUpdateSong = () => {
    if (!newSong.title.trim()) {
      Alert.alert('Ошибка', 'Введите название произведения');
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

  // ========================================
  // 💾 СОХРАНЕНИЕ КОНЦЕРТА
  // ========================================

  const handleSubmit = async () => {
    if (!description.trim() || !address.trim() || !departureTime || !startTime) {
      Alert.alert('Ошибка', 'Пожалуйста, заполните все обязательные поля');
      return;
    }

    // Проверка формата времени
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(departureTime) || !timeRegex.test(startTime)) {
      Alert.alert('Ошибка', 'Неверный формат времени. Используйте HH:MM (например, 14:30)');
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

      Alert.alert(
        'Успех',
        message,
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      console.error('Ошибка при сохранении концерта:', error);
      Alert.alert('Ошибка', 'Не удалось сохранить концерт');
    }
  };

  // ✅ ИСПРАВЛЕННЫЙ РЕНДЕР ДЛЯ PWA И МОБИЛЬНЫХ УСТРОЙСТВ
  const renderTimeInput = (type, value, placeholder, label) => {
    if (Platform.OS === 'web') {
      // Для PWA - улучшенный ввод с кнопкой выбора
      return (
        <View style={styles.timeInputCard}>
          <Text style={styles.label}>{label} *</Text>
          <View style={styles.webTimeContainer}>
            <View style={styles.timeInput}>
              <Ionicons name="time-outline" size={getResponsiveSize(20)} color="#FFD700" />
              <TextInput
                style={styles.timeTextInput}
                value={value}
                onChangeText={type === 'departure' ? handleDepartureTimeChange : handleStartTimeChange}
                placeholder={placeholder}
                placeholderTextColor="#666"
                keyboardType="numeric"
                maxLength={5}
              />
            </View>
            <TouchableOpacity 
              style={styles.timePickerButton}
              onPress={() => handleTimePicker(type)}
            >
              <Ionicons name="time" size={getResponsiveSize(16)} color="#1a1a1a" />
            </TouchableOpacity>
          </View>
        </View>
      );
    } else {
      // Для нативных платформ
      return (
        <View style={styles.timeInputCard}>
          <Text style={styles.label}>{label} *</Text>
          <TouchableOpacity 
            style={styles.timeInput}
            onPress={() => handleTimePicker(type)}
          >
            <Ionicons name="time-outline" size={getResponsiveSize(20)} color="#FFD700" />
            <Text style={value ? styles.timeText : styles.timePlaceholder}>
              {value || placeholder}
            </Text>
          </TouchableOpacity>
        </View>
      );
    }
  };

  return (
    <LinearGradient
      colors={['#0a0a0a', '#1a1a1a', '#2a2a2a']}
      style={styles.container}
    >
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoid}
      >
        {/* 🌙 ТЕМНЫЙ ХЕДЕР */}
        <LinearGradient
          colors={['rgba(26, 26, 26, 0.98)', 'rgba(35, 35, 35, 0.95)']}
          style={styles.header}
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
                <Ionicons name="arrow-back" size={getResponsiveSize(20)} color="#1a1a1a" />
              </LinearGradient>
            </TouchableOpacity>
            
            <View style={styles.titleContainer}>
              <Text style={styles.headerTitle}>
                {isEditing ? 'Редактировать концерт' : 'Добавить концерт'}
              </Text>
              <Text style={styles.headerSubtitle}>
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
            {/* 🌙 КАРТОЧКА С ДАТОЙ */}
            <View style={styles.dateCard}>
              <LinearGradient
                colors={['rgba(255, 215, 0, 0.15)', 'rgba(255, 165, 0, 0.1)']}
                style={styles.dateGradient}
              >
                <View style={styles.dateContent}>
                  <Ionicons name="calendar" size={getResponsiveSize(24)} color="#FFD700" />
                  <View style={styles.dateTextContainer}>
                    <Text style={styles.dateLabel}>Дата концерта</Text>
                    <Text style={styles.dateValue}>
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
                    <Text style={styles.editingBadgeText}>РЕДАКТИРОВАНИЕ</Text>
                  </View>
                )}
              </LinearGradient>
            </View>

            {/* 🌙 ТИП КОНЦЕРТА */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>🎵 Тип концерта</Text>
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

            {/* 🌙 ОСНОВНАЯ ИНФОРМАЦИЯ */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>📝 Основная информация</Text>
              
              <View style={styles.inputCard}>
                <Text style={styles.label}>Описание концерта *</Text>
                <TextInput
                  style={styles.textInput}
                  value={description}
                  onChangeText={setDescription}
                  placeholder="Введите описание концерта..."
                  placeholderTextColor="#666"
                  multiline
                  numberOfLines={3}
                />
              </View>

              <View style={styles.inputCard}>
                <Text style={styles.label}>Адрес проведения *</Text>
                <TextInput
                  style={styles.textInput}
                  value={address}
                  onChangeText={setAddress}
                  placeholder="Введите адрес..."
                  placeholderTextColor="#666"
                />
              </View>
            </View>

            {/* ⏰ ВРЕМЯ (ИСПРАВЛЕНО ДЛЯ PWA И МОБИЛЬНЫХ) */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>⏰ Время</Text>
              
              <View style={styles.timeContainer}>
                {renderTimeInput('departure', departureTime, '00:00', 'Время выезда')}
                {renderTimeInput('start', startTime, '00:00', 'Время начала')}
              </View>
              
              {Platform.OS === 'web' && (
                <Text style={styles.timeHint}>💡 Формат времени: ЧЧ:ММ (например, 14:30)</Text>
              )}
            </View>

            {/* 🌙 КОНЦЕРТНАЯ ПРОГРАММА */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>🎼 Концертная программа</Text>
                <TouchableOpacity 
                  style={styles.programButton}
                  onPress={() => setShowProgramModal(true)}
                >
                  <LinearGradient
                    colors={['#9B59B6', '#8E44AD']}
                    style={styles.programButtonGradient}
                  >
                    <Ionicons name="musical-notes" size={getResponsiveSize(16)} color="white" />
                    <Text style={styles.programButtonText}>
                      {songs.length > 0 ? `Программа (${songs.length})` : 'Добавить'}
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
              
              {songs.length > 0 && (
                <View style={styles.programPreview}>
                  <Text style={styles.programPreviewText}>
                    {songs.length} произведений в программе
                  </Text>
                </View>
              )}
            </View>

            {/* 👥 УЧАСТНИКИ ПО КАТЕГОРИЯМ (АККОРДЕОН) */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>
                  👥 Участники ({getTotalParticipantsCount()})
                </Text>
              </View>

              {/* Категории участников */}
              {PARTICIPANT_CATEGORIES.map((category) => (
                <View key={category.key} style={styles.categoryCard}>
                  {/* Заголовок категории */}
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
                          size={getResponsiveSize(20)} 
                          color={category.color} 
                        />
                        <View style={styles.categoryTitleTextContainer}>
                          <Text style={styles.categoryTitle}>{category.label}</Text>
                          <Text style={styles.categoryCount}>
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
                          <Ionicons name="add-circle" size={getResponsiveSize(24)} color={category.color} />
                        </TouchableOpacity>
                        <Ionicons 
                          name={expandedCategories[category.key] ? 'chevron-up' : 'chevron-down'} 
                          size={getResponsiveSize(20)} 
                          color="#999" 
                        />
                      </View>
                    </LinearGradient>
                  </TouchableOpacity>

                  {/* Список участников категории (сворачиваемый) */}
                  {expandedCategories[category.key] && (
                    <View style={styles.categoryContent}>
                      {participants[category.key].length === 0 ? (
                        <View style={styles.categoryEmptyState}>
                          <Ionicons name="people-outline" size={getResponsiveSize(24)} color="#555" />
                          <Text style={styles.categoryEmptyText}>Участники не добавлены</Text>
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
                                  <Text style={styles.participantNumber}>{index + 1}.</Text>
                                  <Text style={styles.participantName}>{participant}</Text>
                                </View>
                                <TouchableOpacity 
                                  onPress={() => removeParticipant(category.key, index)}
                                  style={styles.removeParticipantButton}
                                >
                                  <Ionicons name="close-circle" size={getResponsiveSize(20)} color="#FF6B6B" />
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

            {/* 🌙 КНОПКА СОХРАНЕНИЯ */}
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
                <Ionicons name="save-outline" size={getResponsiveSize(20)} color="#1a1a1a" />
                <Text style={styles.submitText}>
                  {isEditing ? 'Обновить концерт' : 'Сохранить концерт'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </ScrollView>

        {/* 🌙 МОДАЛЬНОЕ ОКНО УЧАСТНИКОВ */}
        <Modal
          visible={showParticipantModal}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowParticipantModal(false)}
        >
          <TouchableOpacity 
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setShowParticipantModal(false)}
          >
            <TouchableOpacity 
              style={styles.modalContent}
              activeOpacity={1}
              onPress={(e) => e.stopPropagation()}
            >
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  Добавить участника
                  {selectedCategory && (
                    <Text style={styles.modalSubtitle}>
                      {'\n'}
                      {PARTICIPANT_CATEGORIES.find(c => c.key === selectedCategory)?.label}
                    </Text>
                  )}
                </Text>
                <TouchableOpacity 
                  onPress={() => setShowParticipantModal(false)}
                  style={styles.modalCloseButton}
                >
                  <Ionicons name="close-circle" size={getResponsiveSize(28)} color="#FFD700" />
                </TouchableOpacity>
              </View>
              
              <TextInput
                style={styles.modalInput}
                value={newParticipant}
                onChangeText={setNewParticipant}
                placeholder="ФИО участника"
                placeholderTextColor="#666"
                autoFocus={Platform.OS !== 'web'} // Автофокус на мобильных, в вебе может быть проблемы
                onSubmitEditing={addParticipant}
                returnKeyType="done"
              />

              <View style={styles.modalButtons}>
                <TouchableOpacity 
                  style={styles.cancelButton}
                  onPress={() => setShowParticipantModal(false)}
                >
                  <Text style={styles.cancelButtonText}>Отмена</Text>
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
                    <Text style={styles.confirmButtonText}>Добавить</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>

        {/* 🌙 МОДАЛЬНОЕ ОКНО ПРОГРАММЫ */}
        <Modal
          visible={showProgramModal}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowProgramModal(false)}
        >
          <TouchableOpacity 
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setShowProgramModal(false)}
          >
            <TouchableOpacity 
              style={styles.programModalContent}
              activeOpacity={1}
              onPress={(e) => e.stopPropagation()}
            >
              <View style={styles.programModalHeader}>
                <View style={styles.programTitleContainer}>
                  <Ionicons name="musical-notes" size={getResponsiveSize(24)} color="#FFD700" />
                  <Text style={styles.programModalTitle}>Концертная программа</Text>
                </View>
                <TouchableOpacity 
                  onPress={() => setShowProgramModal(false)}
                  style={styles.programModalClose}
                >
                  <Ionicons name="close-circle" size={getResponsiveSize(28)} color="#FFD700" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.programScroll}>
                {/* Название программы */}
                <View style={styles.inputCard}>
                  <Text style={styles.label}>Название программы</Text>
                  <TextInput
                    style={styles.textInput}
                    value={programTitle}
                    onChangeText={setProgramTitle}
                    placeholder="Введите название программы..."
                    placeholderTextColor="#666"
                  />
                </View>

                {/* Форма добавления/редактирования произведения */}
                <View style={styles.songFormCard}>
                  <Text style={styles.sectionTitle}>
                    {editingSongIndex !== null ? '✏️ Редактировать произведение' : '🎵 Добавить произведение'}
                  </Text>
                  
                  <TextInput
                    style={styles.textInput}
                    value={newSong.title}
                    onChangeText={(text) => setNewSong({...newSong, title: text})}
                    placeholder="Название произведения *"
                    placeholderTextColor="#666"
                  />
                  
                  <TextInput
                    style={styles.textInput}
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
                        <Text style={styles.cancelEditText}>Отмена</Text>
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
                        <Text style={styles.addSongText}>
                          {editingSongIndex !== null ? 'Обновить' : 'Добавить'}
                        </Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Список произведений */}
                <View style={styles.songsSection}>
                  <Text style={styles.sectionTitle}>
                    📋 Список произведений {songs.length > 0 && `(${songs.length})`}
                  </Text>
                  
                  {songs.length === 0 ? (
                    <View style={styles.emptyState}>
                      <Ionicons name="musical-notes" size={getResponsiveSize(40)} color="#555" />
                      <Text style={styles.emptyStateText}>Произведения не добавлены</Text>
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
                              <Text style={styles.songNumber}>{index + 1}.</Text>
                              <View style={styles.songDetails}>
                                <Text style={styles.songTitle}>{song.title}</Text>
                                {song.soloists && (
                                  <Text style={styles.songSoloists}>Солисты: {song.soloists}</Text>
                                )}
                              </View>
                            </View>
                            <View style={styles.songActions}>
                              <TouchableOpacity 
                                onPress={() => editSong(index)}
                                style={styles.songActionButton}
                              >
                                <Ionicons name="create-outline" size={getResponsiveSize(18)} color="#FFD700" />
                              </TouchableOpacity>
                              <TouchableOpacity 
                                onPress={() => removeSong(index)}
                                style={styles.songActionButton}
                              >
                                <Ionicons name="trash-outline" size={getResponsiveSize(18)} color="#FF6B6B" />
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
                        <Text style={styles.clearProgramText}>Очистить программу</Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  )}
                </View>
              </ScrollView>
            </TouchableOpacity>
          </TouchableOpacity>
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
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

// 🌙 ТЕМНЫЕ СТИЛИ С ИСПРАВЛЕНИЯМИ ДЛЯ PWA
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
    paddingHorizontal: getResponsiveSize(20),
    paddingTop: Platform.OS === 'ios' ? getResponsiveSize(50) : getResponsiveSize(30),
    paddingBottom: getResponsiveSize(20),
    borderBottomLeftRadius: getResponsiveSize(25),
    borderBottomRightRadius: getResponsiveSize(25),
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
    borderRadius: getResponsiveSize(20),
    overflow: 'hidden',
  },
  backButtonGradient: {
    width: getResponsiveSize(44),
    height: getResponsiveSize(44),
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: getResponsiveSize(20),
  },
  titleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: getResponsiveFontSize(18),
    fontWeight: '800',
    color: '#E0E0E0',
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: getResponsiveFontSize(12),
    color: '#999',
    marginTop: getResponsiveSize(4),
    textAlign: 'center',
  },
  headerSpacer: {
    width: getResponsiveSize(44),
  },
  contentContainer: {
    padding: getResponsiveSize(20),
    paddingBottom: getResponsiveSize(40),
  },
  dateCard: {
    marginBottom: getResponsiveSize(25),
  },
  dateGradient: {
    borderRadius: getResponsiveSize(16),
    padding: getResponsiveSize(20),
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
    marginLeft: getResponsiveSize(12),
  },
  dateLabel: {
    fontSize: getResponsiveFontSize(12),
    color: '#999',
    fontWeight: '600',
  },
  dateValue: {
    fontSize: getResponsiveFontSize(16),
    color: '#E0E0E0',
    fontWeight: '700',
    marginTop: getResponsiveSize(2),
  },
  editingBadge: {
    backgroundColor: 'rgba(255, 107, 107, 0.2)',
    paddingHorizontal: getResponsiveSize(10),
    paddingVertical: getResponsiveSize(6),
    borderRadius: getResponsiveSize(12),
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 107, 0.4)',
  },
  editingBadgeText: {
    fontSize: getResponsiveFontSize(10),
    color: '#FF6B6B',
    fontWeight: '800',
  },
  section: {
    marginBottom: getResponsiveSize(25),
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: getResponsiveSize(15),
  },
  sectionTitle: {
    fontSize: getResponsiveFontSize(16),
    fontWeight: '700',
    color: '#E0E0E0',
  },
  typeScroll: {
    marginHorizontal: getResponsiveSize(-5),
  },
  typeContainer: {
    flexDirection: 'row',
    paddingHorizontal: getResponsiveSize(5),
  },
  typeButton: {
    borderRadius: getResponsiveSize(20),
    overflow: 'hidden',
    marginHorizontal: getResponsiveSize(5),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  typeButtonGradient: {
    paddingHorizontal: getResponsiveSize(16),
    paddingVertical: getResponsiveSize(10),
    borderRadius: getResponsiveSize(20),
  },
  typeButtonText: {
    fontSize: getResponsiveFontSize(12),
    color: '#999',
    fontWeight: '600',
  },
  typeButtonTextActive: {
    color: '#1a1a1a',
    fontWeight: '700',
  },
  inputCard: {
    marginBottom: getResponsiveSize(15),
  },
  label: {
    fontSize: getResponsiveFontSize(14),
    fontWeight: '600',
    color: '#E0E0E0',
    marginBottom: getResponsiveSize(8),
  },
  textInput: {
    backgroundColor: 'rgba(42, 42, 42, 0.8)',
    borderRadius: getResponsiveSize(12),
    paddingHorizontal: getResponsiveSize(15),
    paddingVertical: getResponsiveSize(12),
    fontSize: getResponsiveFontSize(14),
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
    marginHorizontal: getResponsiveSize(5),
    marginBottom: Platform.OS === 'web' ? getResponsiveSize(15) : 0,
  },
  webTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeInput: {
    backgroundColor: 'rgba(42, 42, 42, 0.8)',
    borderRadius: getResponsiveSize(12),
    paddingHorizontal: getResponsiveSize(15),
    paddingVertical: getResponsiveSize(12),
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  timePickerButton: {
    backgroundColor: '#FFD700',
    borderRadius: getResponsiveSize(12),
    padding: getResponsiveSize(12),
    marginLeft: getResponsiveSize(10),
    justifyContent: 'center',
    alignItems: 'center',
  },
  timeTextInput: {
    flex: 1,
    marginLeft: getResponsiveSize(10),
    fontSize: getResponsiveFontSize(14),
    color: '#E0E0E0',
    fontWeight: '500',
  },
  timeText: {
    fontSize: getResponsiveFontSize(14),
    color: '#E0E0E0',
    marginLeft: getResponsiveSize(10),
    fontWeight: '500',
  },
  timePlaceholder: {
    fontSize: getResponsiveFontSize(14),
    color: '#666',
    marginLeft: getResponsiveSize(10),
  },
  timeHint: {
    fontSize: getResponsiveFontSize(11),
    color: '#999',
    marginTop: getResponsiveSize(8),
    textAlign: 'center',
    fontStyle: 'italic',
  },
  programButton: {
    borderRadius: getResponsiveSize(20),
    overflow: 'hidden',
  },
  programButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: getResponsiveSize(15),
    paddingVertical: getResponsiveSize(8),
    borderRadius: getResponsiveSize(20),
  },
  programButtonText: {
    color: 'white',
    fontSize: getResponsiveFontSize(12),
    fontWeight: '600',
    marginLeft: getResponsiveSize(6),
  },
  programPreview: {
    backgroundColor: 'rgba(155, 89, 182, 0.1)',
    padding: getResponsiveSize(12),
    borderRadius: getResponsiveSize(12),
    borderWidth: 1,
    borderColor: 'rgba(155, 89, 182, 0.3)',
  },
  programPreviewText: {
    fontSize: getResponsiveFontSize(13),
    color: '#9B59B6',
    fontWeight: '500',
    textAlign: 'center',
  },
  // СТИЛИ КАТЕГОРИЙ УЧАСТНИКОВ
  categoryCard: {
    marginBottom: getResponsiveSize(12),
    borderRadius: getResponsiveSize(12),
    overflow: 'hidden',
  },
  categoryHeader: {
    borderRadius: getResponsiveSize(12),
    overflow: 'hidden',
  },
  categoryHeaderGradient: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: getResponsiveSize(16),
    borderRadius: getResponsiveSize(12),
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  categoryTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  categoryTitleTextContainer: {
    marginLeft: getResponsiveSize(12),
  },
  categoryTitle: {
    fontSize: getResponsiveFontSize(14),
    fontWeight: '700',
    color: '#E0E0E0',
  },
  categoryCount: {
    fontSize: getResponsiveFontSize(11),
    color: '#999',
    marginTop: getResponsiveSize(2),
  },
  categoryActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  addCategoryButton: {
    padding: getResponsiveSize(5),
    marginRight: getResponsiveSize(10),
  },
  categoryContent: {
    paddingHorizontal: getResponsiveSize(16),
    paddingBottom: getResponsiveSize(16),
    backgroundColor: 'rgba(20, 20, 20, 0.5)',
  },
  categoryEmptyState: {
    alignItems: 'center',
    paddingVertical: getResponsiveSize(20),
  },
  categoryEmptyText: {
    fontSize: getResponsiveFontSize(12),
    color: '#666',
    marginTop: getResponsiveSize(8),
  },
  participantsList: {
    paddingTop: getResponsiveSize(8),
  },
  participantItem: {
    marginBottom: getResponsiveSize(8),
    borderRadius: getResponsiveSize(8),
    overflow: 'hidden',
  },
  participantItemGradient: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: getResponsiveSize(10),
    borderRadius: getResponsiveSize(8),
  },
  participantInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  participantNumber: {
    fontSize: getResponsiveFontSize(12),
    color: '#999',
    fontWeight: '600',
    marginRight: getResponsiveSize(8),
  },
  participantName: {
    fontSize: getResponsiveFontSize(13),
    color: '#E0E0E0',
    fontWeight: '500',
  },
  removeParticipantButton: {
    padding: getResponsiveSize(5),
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: getResponsiveSize(30),
  },
  emptyStateText: {
    fontSize: getResponsiveFontSize(14),
    color: '#666',
    marginTop: getResponsiveSize(8),
    textAlign: 'center',
  },
  submitButton: {
    marginTop: getResponsiveSize(10),
    marginBottom: getResponsiveSize(30),
    borderRadius: getResponsiveSize(15),
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
    paddingVertical: getResponsiveSize(16),
    paddingHorizontal: getResponsiveSize(20),
    borderRadius: getResponsiveSize(15),
  },
  submitText: {
    color: '#1a1a1a',
    fontSize: getResponsiveFontSize(16),
    fontWeight: '700',
    marginLeft: getResponsiveSize(8),
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: getResponsiveSize(20),
  },
  modalContent: {
    borderRadius: getResponsiveSize(25),
    padding: getResponsiveSize(25),
    width: '100%',
    maxWidth: getResponsiveSize(400),
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
    backgroundColor: 'rgba(26, 26, 26, 0.98)',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: getResponsiveSize(20),
  },
  modalTitle: {
    fontSize: getResponsiveFontSize(18),
    fontWeight: '700',
    color: '#E0E0E0',
    flex: 1,
  },
  modalSubtitle: {
    fontSize: getResponsiveFontSize(13),
    color: '#FFD700',
    fontWeight: '600',
  },
  modalCloseButton: {
    padding: getResponsiveSize(5),
  },
  modalInput: {
    backgroundColor: 'rgba(42, 42, 42, 0.8)',
    borderRadius: getResponsiveSize(12),
    paddingHorizontal: getResponsiveSize(15),
    paddingVertical: getResponsiveSize(12),
    fontSize: getResponsiveFontSize(14),
    color: '#E0E0E0',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    marginBottom: getResponsiveSize(20),
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: getResponsiveSize(12),
    borderRadius: getResponsiveSize(12),
    alignItems: 'center',
    marginRight: getResponsiveSize(10),
    backgroundColor: 'rgba(42, 42, 42, 0.8)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  cancelButtonText: {
    fontSize: getResponsiveFontSize(14),
    color: '#E0E0E0',
    fontWeight: '600',
  },
  confirmButton: {
    flex: 1,
    borderRadius: getResponsiveSize(12),
    overflow: 'hidden',
  },
  confirmButtonGradient: {
    paddingVertical: getResponsiveSize(12),
    alignItems: 'center',
    borderRadius: getResponsiveSize(12),
  },
  confirmButtonText: {
    fontSize: getResponsiveFontSize(14),
    color: 'white',
    fontWeight: '600',
  },
  programModalContent: {
    borderRadius: getResponsiveSize(25),
    padding: getResponsiveSize(25),
    margin: getResponsiveSize(20),
    flex: 1,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
    backgroundColor: 'rgba(26, 26, 26, 0.98)',
    maxHeight: Platform.OS === 'web' ? '80vh' : undefined,
  },
  programModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: getResponsiveSize(20),
    paddingBottom: getResponsiveSize(15),
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  programTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  programModalTitle: {
    fontSize: getResponsiveFontSize(18),
    fontWeight: '700',
    color: '#E0E0E0',
    marginLeft: getResponsiveSize(10),
  },
  programModalClose: {
    padding: getResponsiveSize(5),
  },
  programScroll: {
    flex: 1,
  },
  songFormCard: {
    backgroundColor: 'rgba(42, 42, 42, 0.6)',
    borderRadius: getResponsiveSize(12),
    padding: getResponsiveSize(15),
    marginBottom: getResponsiveSize(20),
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  songFormButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: getResponsiveSize(10),
  },
  cancelEditButton: {
    paddingHorizontal: getResponsiveSize(16),
    paddingVertical: getResponsiveSize(8),
    borderRadius: getResponsiveSize(8),
    marginRight: getResponsiveSize(10),
    backgroundColor: 'rgba(42, 42, 42, 0.8)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  cancelEditText: {
    fontSize: getResponsiveFontSize(12),
    color: '#E0E0E0',
    fontWeight: '500',
  },
  addSongButton: {
    borderRadius: getResponsiveSize(8),
    overflow: 'hidden',
  },
  addSongGradient: {
    paddingHorizontal: getResponsiveSize(16),
    paddingVertical: getResponsiveSize(8),
    borderRadius: getResponsiveSize(8),
  },
  addSongText: {
    fontSize: getResponsiveFontSize(12),
    color: 'white',
    fontWeight: '600',
  },
  songsSection: {
    marginBottom: getResponsiveSize(20),
  },
  songsList: {
    marginBottom: getResponsiveSize(20),
  },
  songItem: {
    marginBottom: getResponsiveSize(8),
    borderRadius: getResponsiveSize(12),
    overflow: 'hidden',
  },
  songItemGradient: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: getResponsiveSize(12),
    borderRadius: getResponsiveSize(12),
  },
  songContent: {
    flexDirection: 'row',
    flex: 1,
    alignItems: 'flex-start',
  },
  songNumber: {
    fontSize: getResponsiveFontSize(12),
    color: '#9B59B6',
    fontWeight: 'bold',
    marginRight: getResponsiveSize(8),
    marginTop: getResponsiveSize(2),
  },
  songDetails: {
    flex: 1,
  },
  songTitle: {
    fontSize: getResponsiveFontSize(13),
    color: '#E0E0E0',
    fontWeight: '600',
    marginBottom: getResponsiveSize(4),
  },
  songSoloists: {
    fontSize: getResponsiveFontSize(11),
    color: '#999',
    fontStyle: 'italic',
  },
  songActions: {
    flexDirection: 'row',
  },
  songActionButton: {
    padding: getResponsiveSize(5),
    marginLeft: getResponsiveSize(8),
  },
  clearProgramButton: {
    borderRadius: getResponsiveSize(12),
    overflow: 'hidden',
    marginTop: getResponsiveSize(10),
  },
  clearProgramGradient: {
    paddingVertical: getResponsiveSize(12),
    alignItems: 'center',
    borderRadius: getResponsiveSize(12),
  },
  clearProgramText: {
    color: 'white',
    fontSize: getResponsiveFontSize(14),
    fontWeight: '600',
  },
});