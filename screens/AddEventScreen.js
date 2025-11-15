import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  StyleSheet,
  Modal,
  FlatList,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { collection, addDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import DateTimePicker from '@react-native-community/datetimepicker';

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
      colors={['#FFF8E1', '#FFE4B5', '#FFD700']}
      style={styles.container}
    >
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoid}
      >
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Заголовок */}
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
              {/* ✅ ИЗМЕНЯЕМЫЙ ЗАГОЛОВОК */}
              <Text style={styles.headerTitle}>
                {isEditing ? 'Редактировать концерт' : 'Добавить концерт'}
              </Text>
              <View style={styles.headerSpacer} />
            </View>
          </LinearGradient>

          <View style={styles.formContainer}>
            {/* Дата концерта */}
            <View style={styles.dateContainer}>
              <Ionicons name="calendar" size={18} color="#DAA520" />
              <Text style={styles.dateText}>
                {new Date(isEditing ? concert.date : date).toLocaleDateString('ru-RU', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric'
                })}
              </Text>
              {isEditing && (
                <Text style={styles.editingBadge}>Редактирование</Text>
              )}
            </View>

            {/* Тип концерта */}
            <Text style={styles.label}>Тип концерта *</Text>
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
                    <Text style={[
                      styles.typeButtonText,
                      concertType === type.value && styles.typeButtonTextActive
                    ]}>
                      {type.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            {/* Описание */}
            <Text style={styles.label}>Описание концерта *</Text>
            <TextInput
              style={styles.textInput}
              value={description}
              onChangeText={setDescription}
              placeholder="Введите описание концерта..."
              placeholderTextColor="#8B8B8B"
              multiline
            />

            {/* Адрес */}
            <Text style={styles.label}>Адрес проведения *</Text>
            <TextInput
              style={styles.textInput}
              value={address}
              onChangeText={setAddress}
              placeholder="Введите адрес..."
              placeholderTextColor="#8B8B8B"
            />

            {/* Время выезда */}
            <Text style={styles.label}>Время выезда *</Text>
            <TouchableOpacity 
              style={styles.timeInput}
              onPress={() => setShowDepartureTimePicker(true)}
            >
              <Ionicons name="time-outline" size={20} color="#DAA520" />
              <Text style={departureTime ? styles.timeText : styles.timePlaceholder}>
                {departureTime || 'Выберите время выезда'}
              </Text>
            </TouchableOpacity>

            {/* Время начала */}
            <Text style={styles.label}>Время начала концерта *</Text>
            <TouchableOpacity 
              style={styles.timeInput}
              onPress={() => setShowStartTimePicker(true)}
            >
              <Ionicons name="time-outline" size={20} color="#DAA520" />
              <Text style={startTime ? styles.timeText : styles.timePlaceholder}>
                {startTime || 'Выберите время начала'}
              </Text>
            </TouchableOpacity>

            {/* Концертная программа */}
            <View style={styles.programHeader}>
              <Text style={styles.label}>Концертная программа</Text>
              <TouchableOpacity 
                style={styles.programButton}
                onPress={() => setShowProgramModal(true)}
              >
                <LinearGradient
                  colors={['#FFD700', '#DAA520']}
                  style={styles.programButtonGradient}
                >
                  <Ionicons name="musical-notes" size={18} color="white" />
                  <Text style={styles.programButtonText}>
                    {songs.length > 0 ? `Программа (${songs.length})` : 'Добавить программу'}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>

            {/* Участники */}
            <View style={styles.participantsHeader}>
              <Text style={styles.label}>Участники</Text>
              <TouchableOpacity 
                style={styles.addParticipantButton}
                onPress={() => setShowParticipantModal(true)}
              >
                <Ionicons name="add-circle" size={24} color="#DAA520" />
              </TouchableOpacity>
            </View>

            {/* Список участников */}
            {participants.length > 0 ? (
              <View style={styles.participantsList}>
                {participants.map((participant, index) => (
                  <View key={index} style={styles.participantItem}>
                    <Text style={styles.participantText}>{participant}</Text>
                    <TouchableOpacity 
                      onPress={() => removeParticipant(index)}
                      style={styles.removeParticipant}
                    >
                      <Ionicons name="close-circle" size={20} color="#FF6B6B" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={styles.noParticipants}>Участники не добавлены</Text>
            )}

            {/* Кнопка сохранения */}
            <TouchableOpacity 
              style={styles.submitButton}
              onPress={handleSubmit}
            >
              <LinearGradient
                colors={['#FFD700', '#DAA520']}
                style={styles.submitGradient}
              >
                <Ionicons name="save-outline" size={20} color="white" />
                {/* ✅ ИЗМЕНЯЕМЫЙ ТЕКСТ КНОПКИ */}
                <Text style={styles.submitText}>
                  {isEditing ? 'Обновить концерт' : 'Сохранить концерт'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </ScrollView>

        {/* Модальное окно добавления участника */}
        <Modal
          visible={showParticipantModal}
          transparent={true}
          animationType="slide"
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Добавить участника</Text>
              
              <TextInput
                style={styles.modalInput}
                value={newParticipant}
                onChangeText={setNewParticipant}
                placeholder="ФИО участника"
                placeholderTextColor="#8B8B8B"
                autoFocus
              />

              <View style={styles.modalButtons}>
                <TouchableOpacity 
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => {
                    setNewParticipant('');
                    setShowParticipantModal(false);
                  }}
                >
                  <Text style={styles.cancelButtonText}>Отмена</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.modalButton, styles.confirmButton]}
                  onPress={addParticipant}
                >
                  <Text style={styles.confirmButtonText}>Добавить</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Модальное окно концертной программы */}
        <Modal
          visible={showProgramModal}
          transparent={true}
          animationType="slide"
        >
          <View style={styles.programModalOverlay}>
            <View style={styles.programModalContent}>
              <View style={styles.programModalHeader}>
                <Text style={styles.programModalTitle}>Концертная программа</Text>
                <TouchableOpacity 
                  onPress={() => setShowProgramModal(false)}
                  style={styles.programModalClose}
                >
                  <Ionicons name="close" size={24} color="#3E2723" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.programScroll}>
                {/* Название программы */}
                <Text style={styles.programLabel}>Название программы</Text>
                <TextInput
                  style={styles.programTitleInput}
                  value={programTitle}
                  onChangeText={setProgramTitle}
                  placeholder="Введите название программы..."
                  placeholderTextColor="#8B8B8B"
                />

                {/* Форма добавления/редактирования произведения */}
                <Text style={styles.programLabel}>
                  {editingSongIndex !== null ? 'Редактировать произведение' : 'Добавить произведение'}
                </Text>
                <View style={styles.songForm}>
                  <TextInput
                    style={styles.songInput}
                    value={newSong.title}
                    onChangeText={(text) => setNewSong({...newSong, title: text})}
                    placeholder="Название произведения *"
                    placeholderTextColor="#8B8B8B"
                  />
                  <TextInput
                    style={styles.songInput}
                    value={newSong.soloists}
                    onChangeText={(text) => setNewSong({...newSong, soloists: text})}
                    placeholder="Солисты (через запятую)"
                    placeholderTextColor="#8B8B8B"
                  />
                  <View style={styles.songFormButtons}>
                    {editingSongIndex !== null && (
                      <TouchableOpacity 
                        style={[styles.songFormButton, styles.cancelEditButton]}
                        onPress={() => {
                          setNewSong({ title: '', soloists: '' });
                          setEditingSongIndex(null);
                        }}
                      >
                        <Text style={styles.cancelEditText}>Отмена</Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity 
                      style={[styles.songFormButton, styles.addSongButton]}
                      onPress={addOrUpdateSong}
                    >
                      <Text style={styles.addSongText}>
                        {editingSongIndex !== null ? 'Обновить' : 'Добавить'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Список произведений */}
                <Text style={styles.programLabel}>
                  Список произведений {songs.length > 0 && `(${songs.length})`}
                </Text>
                
                {songs.length === 0 ? (
                  <View style={styles.noSongs}>
                    <Ionicons name="musical-notes" size={40} color="#DAA520" />
                    <Text style={styles.noSongsText}>Произведения не добавлены</Text>
                  </View>
                ) : (
                  <View style={styles.songsList}>
                    {songs.map((song, index) => (
                      <TouchableOpacity
                        key={index}
                        style={styles.songItem}
                        onPress={() => editSong(index)}
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
                            <Ionicons name="create-outline" size={18} color="#007AFF" />
                          </TouchableOpacity>
                          <TouchableOpacity 
                            onPress={() => removeSong(index)}
                            style={styles.songActionButton}
                          >
                            <Ionicons name="trash-outline" size={18} color="#FF3B30" />
                          </TouchableOpacity>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {/* Кнопка очистки программы */}
                {songs.length > 0 && (
                  <TouchableOpacity 
                    style={styles.clearProgramButton}
                    onPress={clearProgram}
                  >
                    <Text style={styles.clearProgramText}>Очистить программу</Text>
                  </TouchableOpacity>
                )}
              </ScrollView>
            </View>
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
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 15,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.4)',
  },
  dateText: {
    fontSize: 14,
    color: '#3E2723',
    fontWeight: '600',
    marginLeft: 8,
  },
  editingBadge: {
    fontSize: 12,
    color: '#FF6B6B',
    fontWeight: 'bold',
    marginLeft: 10,
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3E2723',
    marginBottom: 8,
    marginTop: 15,
  },
  typeScroll: {
    marginHorizontal: -5,
  },
  typeContainer: {
    flexDirection: 'row',
    paddingHorizontal: 5,
  },
  typeButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    marginHorizontal: 5,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  typeButtonActive: {
    backgroundColor: '#DAA520',
    borderColor: '#DAA520',
  },
  typeButtonText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  typeButtonTextActive: {
    color: 'white',
    fontWeight: '600',
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
    textAlignVertical: 'top',
    minHeight: 50,
  },
  timeInput: {
    backgroundColor: 'white',
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeText: {
    fontSize: 14,
    color: '#3E2723',
    marginLeft: 10,
    fontWeight: '500',
  },
  timePlaceholder: {
    fontSize: 14,
    color: '#8B8B8B',
    marginLeft: 10,
  },
  programHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    marginTop: 15,
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
  },
  programButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 6,
  },
  participantsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  addParticipantButton: {
    padding: 5,
  },
  participantsList: {
    marginTop: 5,
  },
  participantItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  participantText: {
    fontSize: 13,
    color: '#3E2723',
    flex: 1,
  },
  removeParticipant: {
    padding: 2,
    marginLeft: 10,
  },
  noParticipants: {
    fontSize: 13,
    color: '#8B8B8B',
    fontStyle: 'italic',
    textAlign: 'center',
    marginVertical: 10,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    width: '100%',
    maxWidth: 350,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#3E2723',
    marginBottom: 15,
    textAlign: 'center',
  },
  modalInput: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 14,
    color: '#3E2723',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  cancelButton: {
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  confirmButton: {
    backgroundColor: '#DAA520',
  },
  cancelButtonText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  confirmButtonText: {
    fontSize: 14,
    color: 'white',
    fontWeight: '600',
  },
  programModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  programModalContent: {
    backgroundColor: 'white',
    marginTop: 50,
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    flex: 1,
    padding: 20,
  },
  programModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  programModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#3E2723',
  },
  programModalClose: {
    padding: 5,
  },
  programScroll: {
    flex: 1,
  },
  programLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3E2723',
    marginBottom: 8,
    marginTop: 15,
  },
  programTitleInput: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 14,
    color: '#3E2723',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    marginBottom: 15,
  },
  songForm: {
    backgroundColor: '#F9F9F9',
    borderRadius: 12,
    padding: 15,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  songInput: {
    backgroundColor: 'white',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#3E2723',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    marginBottom: 10,
  },
  songFormButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  songFormButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginLeft: 10,
  },
  cancelEditButton: {
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  addSongButton: {
    backgroundColor: '#DAA520',
  },
  cancelEditText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  addSongText: {
    fontSize: 12,
    color: 'white',
    fontWeight: '600',
  },
  noSongs: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 30,
  },
  noSongsText: {
    fontSize: 14,
    color: '#8B8B8B',
    marginTop: 8,
    textAlign: 'center',
  },
  songsList: {
    marginBottom: 20,
  },
  songItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  songContent: {
    flexDirection: 'row',
    flex: 1,
    alignItems: 'flex-start',
  },
  songNumber: {
    fontSize: 12,
    color: '#DAA520',
    fontWeight: 'bold',
    marginRight: 8,
    marginTop: 2,
  },
  songDetails: {
    flex: 1,
  },
  songTitle: {
    fontSize: 13,
    color: '#3E2723',
    fontWeight: '600',
    marginBottom: 4,
  },
  songSoloists: {
    fontSize: 11,
    color: '#8B8B8B',
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
    backgroundColor: '#FF6B6B',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  clearProgramText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
});