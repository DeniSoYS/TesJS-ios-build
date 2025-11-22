import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { LinearGradient } from 'expo-linear-gradient';
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

export default function AddEvent({ navigation, route }) {
  const { date, userRole, concert, isEditing } = route.params || {};
  
  // ✅ СОСТОЯНИЯ С УЧЕТОМ РЕДАКТИРОВАНИЯ
  const [concertType, setConcertType] = useState(concert?.concertType || 'GENERAL');
  const [description, setDescription] = useState(concert?.description || '');
  const [address, setAddress] = useState(concert?.address || '');
  const [departureTime, setDepartureTime] = useState(concert?.departureTime || '');
  const [startTime, setStartTime] = useState(concert?.startTime || '');
  const [participants, setParticipants] = useState(concert?.participants || []);
  const [newParticipant, setNewParticipant] = useState('');
  const [showParticipantModal, setShowParticipantModal] = useState(false);
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

  const concertTypes = [
    { value: 'GENERAL', label: 'Общий концерт' },
    { value: 'BRIGADE_1', label: 'Первая бригада' },
    { value: 'BRIGADE_2', label: 'Вторая бригада' },
    { value: 'BRIGADE_ENHANCED', label: 'Концерт усиленной бригады' },
    { value: 'SOLOISTS_ORCHESTRA', label: 'Солисты оркестр' },
  ];

  // ✅ ОБНОВЛЯЕМ ЗАГОЛОВОК В ЗАВИСИМОСТИ ОТ РЕЖИМА
  useEffect(() => {
    if (isEditing) {
      navigation.setOptions({
        title: 'Редактировать концерт'
      });
    }
  }, [isEditing, navigation]);

  // Функции для выбора времени
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

  // Функции для участников
  const addParticipant = () => {
    if (newParticipant.trim() && !participants.includes(newParticipant.trim())) {
      setParticipants([...participants, newParticipant.trim()]);
      setNewParticipant('');
      setShowParticipantModal(false);
    } else if (participants.includes(newParticipant.trim())) {
      Alert.alert('Ошибка', 'Этот участник уже добавлен');
    }
  };

  const removeParticipant = (index) => {
    const updatedParticipants = participants.filter((_, i) => i !== index);
    setParticipants(updatedParticipants);
  };

  // Функции для концертной программы
  const addOrUpdateSong = () => {
    if (!newSong.title.trim()) {
      Alert.alert('Ошибка', 'Введите название произведения');
      return;
    }

    if (editingSongIndex !== null) {
      // Редактирование существующей песни
      const updatedSongs = [...songs];
      updatedSongs[editingSongIndex] = { ...newSong };
      setSongs(updatedSongs);
      setEditingSongIndex(null);
    } else {
      // Добавление новой песни
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

  // ✅ ОБНОВЛЕННАЯ ФУНКЦИЯ СОХРАНЕНИЯ С РЕДАКТИРОВАНИЕМ
  const handleSubmit = async () => {
    if (!description.trim() || !address.trim() || !departureTime || !startTime) {
      Alert.alert('Ошибка', 'Пожалуйста, заполните все обязательные поля');
      return;
    }

    try {
      const concertData = {
        date: isEditing ? concert.date : date, // Сохраняем оригинальную дату при редактировании
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
        // ✅ РЕДАКТИРОВАНИЕ СУЩЕСТВУЮЩЕГО КОНЦЕРТА
        await updateDoc(doc(db, 'concerts', concert.id), concertData);
        message = 'Концерт успешно обновлен';
      } else {
        // ✅ СОЗДАНИЕ НОВОГО КОНЦЕРТА
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

  return (
    <LinearGradient
      colors={['#0a0a0a', '#1a1a1a', '#2a2a2a']}
      style={styles.container}
    >
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoid}
      >
        {/* 🌙 ТЕМНЫЙ ХЕДЕР В СТИЛЕ КАЛЕНДАРЯ */}
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

        <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollView}>
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

            {/* 🌙 ВРЕМЯ */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>⏰ Время</Text>
              
              <View style={styles.timeContainer}>
                <View style={styles.timeInputCard}>
                  <Text style={styles.label}>Время выезда *</Text>
                  <TouchableOpacity 
                    style={styles.timeInput}
                    onPress={() => setShowDepartureTimePicker(true)}
                  >
                    <Ionicons name="time-outline" size={getResponsiveSize(20)} color="#FFD700" />
                    <Text style={departureTime ? styles.timeText : styles.timePlaceholder}>
                      {departureTime || 'Выберите время выезда'}
                    </Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.timeInputCard}>
                  <Text style={styles.label}>Время начала *</Text>
                  <TouchableOpacity 
                    style={styles.timeInput}
                    onPress={() => setShowStartTimePicker(true)}
                  >
                    <Ionicons name="time-outline" size={getResponsiveSize(20)} color="#FFD700" />
                    <Text style={startTime ? styles.timeText : styles.timePlaceholder}>
                      {startTime || 'Выберите время начала'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
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

            {/* 🌙 УЧАСТНИКИ */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>👥 Участники</Text>
                <TouchableOpacity 
                  style={styles.addParticipantButton}
                  onPress={() => setShowParticipantModal(true)}
                >
                  <LinearGradient
                    colors={['#4A90E2', '#357ABD']}
                    style={styles.addParticipantGradient}
                  >
                    <Ionicons name="add" size={getResponsiveSize(18)} color="white" />
                  </LinearGradient>
                </TouchableOpacity>
              </View>

              {/* Список участников */}
              {participants.length > 0 ? (
                <View style={styles.participantsGrid}>
                  {participants.map((participant, index) => (
                    <View key={index} style={styles.participantChip}>
                      <LinearGradient
                        colors={['rgba(74, 144, 226, 0.2)', 'rgba(53, 122, 189, 0.2)']}
                        style={styles.participantChipGradient}
                      >
                        <Text style={styles.participantText}>{participant}</Text>
                        <TouchableOpacity 
                          onPress={() => removeParticipant(index)}
                          style={styles.removeParticipant}
                        >
                          <Ionicons name="close-circle" size={getResponsiveSize(16)} color="#FF6B6B" />
                        </TouchableOpacity>
                      </LinearGradient>
                    </View>
                  ))}
                </View>
              ) : (
                <View style={styles.emptyState}>
                  <Ionicons name="people-outline" size={getResponsiveSize(32)} color="#555" />
                  <Text style={styles.emptyStateText}>Участники не добавлены</Text>
                </View>
              )}
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
        >
          <View style={styles.modalOverlay}>
            <LinearGradient
              colors={['rgba(26, 26, 26, 0.98)', 'rgba(35, 35, 35, 0.95)']}
              style={styles.modalContent}
            >
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Добавить участника</Text>
                <TouchableOpacity 
                  onPress={() => {
                    setNewParticipant('');
                    setShowParticipantModal(false);
                  }}
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
                autoFocus
              />

              <View style={styles.modalButtons}>
                <TouchableOpacity 
                  style={styles.cancelButton}
                  onPress={() => {
                    setNewParticipant('');
                    setShowParticipantModal(false);
                  }}
                >
                  <Text style={styles.cancelButtonText}>Отмена</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.confirmButton}
                  onPress={addParticipant}
                >
                  <LinearGradient
                    colors={['#4A90E2', '#357ABD']}
                    style={styles.confirmButtonGradient}
                  >
                    <Text style={styles.confirmButtonText}>Добавить</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </LinearGradient>
          </View>
        </Modal>

        {/* 🌙 МОДАЛЬНОЕ ОКНО ПРОГРАММЫ */}
        <Modal
          visible={showProgramModal}
          transparent={true}
          animationType="slide"
        >
          <View style={styles.modalOverlay}>
            <LinearGradient
              colors={['rgba(26, 26, 26, 0.98)', 'rgba(35, 35, 35, 0.95)']}
              style={styles.programModalContent}
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

                  {/* Кнопка очистки программы */}
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
            </LinearGradient>
          </View>
        </Modal>

        {/* Time Pickers */}
        {showDepartureTimePicker && (
          <DateTimePicker
            value={departureDate}
            mode="time"
            is24Hour={true}
            onChange={onDepartureTimeChange}
          />
        )}

        {showStartTimePicker && (
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

// 🌙 ТЕМНЫЕ СТИЛИ В СТИЛЕ КАЛЕНДАРЯ
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
  // 🌙 ХЕДЕР
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
  },
  // 🌙 КАРТОЧКА ДАТЫ
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
  // 🌙 СЕКЦИИ
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
  // 🌙 ТИПЫ КОНЦЕРТОВ
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
  // 🌙 КАРТОЧКИ ВВОДА
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
  // 🌙 ВРЕМЯ
  timeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  timeInputCard: {
    flex: 1,
    marginHorizontal: getResponsiveSize(5),
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
  // 🌙 КНОПКИ ПРОГРАММЫ
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
  // 🌙 УЧАСТНИКИ
  addParticipantButton: {
    borderRadius: getResponsiveSize(20),
    overflow: 'hidden',
  },
  addParticipantGradient: {
    width: getResponsiveSize(36),
    height: getResponsiveSize(36),
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: getResponsiveSize(20),
  },
  participantsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: getResponsiveSize(-5),
  },
  participantChip: {
    margin: getResponsiveSize(5),
    borderRadius: getResponsiveSize(20),
    overflow: 'hidden',
  },
  participantChipGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: getResponsiveSize(12),
    paddingVertical: getResponsiveSize(8),
    borderRadius: getResponsiveSize(20),
  },
  participantText: {
    fontSize: getResponsiveFontSize(12),
    color: '#4A90E2',
    fontWeight: '500',
  },
  removeParticipant: {
    padding: getResponsiveSize(2),
    marginLeft: getResponsiveSize(8),
  },
  // 🌙 ПУСТЫЕ СОСТОЯНИЯ
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
  // 🌙 КНОПКА СОХРАНЕНИЯ
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
  // 🌙 МОДАЛЬНЫЕ ОКНА
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
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: getResponsiveSize(20),
  },
  modalTitle: {
    fontSize: getResponsiveFontSize(18),
    fontWeight: '700',
    color: '#E0E0E0',
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
  // 🌙 МОДАЛЬНОЕ ОКНО ПРОГРАММЫ
  programModalContent: {
    borderRadius: getResponsiveSize(25),
    padding: getResponsiveSize(25),
    margin: getResponsiveSize(20),
    flex: 1,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
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