import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Modal,
  Linking,
  Platform
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { doc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';

// ✅ ФУНКЦИЯ КОНВЕРТАЦИИ ТИПОВ
const toRussianType = (englishType) => {
  const types = {
    'GENERAL': 'Общий концерт',
    'BRIGADE_1': 'Первая бригада',
    'BRIGADE_2': 'Вторая бригада',
    'BRIGADE_ENHANCED': 'Концерт усиленной бригады',
    'SOLOISTS_ORCHESTRA': 'Солисты оркестр',
    'UNKNOWN': 'Неизвестно'
  };
  return types[englishType] || 'Неизвестно';
};

export default function ConcertDetailScreen({ navigation, route }) {
  const { concert, userRole } = route.params || {};
  
  // ✅ ЗАЩИТА ОТ UNDEFINED
  const safeConcert = concert || {};
  const safeParticipants = Array.isArray(safeConcert.participants) ? safeConcert.participants : [];
  const safeProgram = safeConcert.program || {};
  const safeSongs = Array.isArray(safeProgram.songs) ? safeProgram.songs : [];

  const [modalVisible, setModalVisible] = useState(false);
  const [selectedModal, setSelectedModal] = useState(''); // 'participants' or 'program'
  const [actionModalVisible, setActionModalVisible] = useState(false);

  // ✅ ФУНКЦИЯ ДЛЯ ОТКРЫТИЯ КАРТ ПО АДРЕСУ
  const openMaps = (address) => {
    if (!address) {
      Alert.alert('Ошибка', 'Адрес не указан');
      return;
    }

    const encodedAddress = encodeURIComponent(address);
    
    const url = Platform.select({
      ios: `maps:0,0?q=${encodedAddress}`,
      android: `geo:0,0?q=${encodedAddress}`,
      default: `https://maps.google.com/?q=${encodedAddress}`
    });

    Linking.openURL(url).catch((err) => {
      console.error('Ошибка открытия карт:', err);
      Alert.alert('Ошибка', 'Не удалось открыть карты');
    });
  };

  // ✅ ФУНКЦИЯ РЕДАКТИРОВАНИЯ КОНЦЕРТА
  const handleEditConcert = () => {
    setActionModalVisible(false);
    // 🆕 Переходим на экран редактирования (пока используем AddEventScreen)
    navigation.navigate('AddEvent', { 
      concert: safeConcert, // Передаем концерт для редактирования
      userRole: userRole,
      isEditing: true
    });
  };

  // ✅ ФУНКЦИЯ УДАЛЕНИЯ КОНЦЕРТА
  const handleDeleteConcert = () => {
    setActionModalVisible(false);
    
    Alert.alert(
      'Удаление концерта',
      'Вы уверены, что хотите удалить этот концерт?',
      [
        { text: 'Отмена', style: 'cancel' },
        { 
          text: 'Удалить', 
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDoc(doc(db, 'concerts', safeConcert.id));
              Alert.alert('Успех', 'Концерт удален');
              navigation.goBack();
            } catch (error) {
              console.error('Ошибка удаления:', error);
              Alert.alert('Ошибка', 'Не удалось удалить концерт');
            }
          }
        }
      ]
    );
  };

  // ✅ ЕСЛИ КОНЦЕРТ НЕ ПЕРЕДАН - ПОКАЗЫВАЕМ ОШИБКУ
  if (!concert) {
    return (
      <LinearGradient colors={['#FFF8E1', '#FFE4B5', '#FFD700']} style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="warning-outline" size={50} color="#FF6B6B" />
          <Text style={styles.errorText}>Концерт не найден</Text>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>Вернуться назад</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    );
  }

  const concertTypeRussian = toRussianType(safeConcert.concertType);

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const [year, month, day] = dateString.split('-');
    const months = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 
                    'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
    return `${parseInt(day)} ${months[parseInt(month) - 1]} ${year}`;
  };

  const showParticipants = () => {
    setSelectedModal('participants');
    setModalVisible(true);
  };

  const showProgram = () => {
    setSelectedModal('program');
    setModalVisible(true);
  };

  const renderParticipantsModal = () => (
    <View style={styles.modalContent}>
      <Text style={styles.modalTitle}>Участники концерта</Text>
      
      {safeParticipants.length === 0 ? (
        <Text style={styles.noDataText}>Участники не указаны</Text>
      ) : (
        <ScrollView style={styles.modalList}>
          {safeParticipants.map((participant, index) => (
            <View key={index} style={styles.listItem}>
              <Ionicons name="person" size={16} color="#DAA520" />
              <Text style={styles.listText}>{participant}</Text>
            </View>
          ))}
        </ScrollView>
      )}
      
      <TouchableOpacity 
        style={styles.modalCloseButton}
        onPress={() => setModalVisible(false)}
      >
        <Text style={styles.modalCloseText}>Закрыть</Text>
      </TouchableOpacity>
    </View>
  );

  const renderProgramModal = () => (
    <View style={styles.modalContent}>
      <Text style={styles.modalTitle}>
        {safeProgram.title || 'Концертная программа'}
      </Text>
      
      {safeSongs.length === 0 ? (
        <Text style={styles.noDataText}>Программа не указана</Text>
      ) : (
        <ScrollView style={styles.modalList}>
          {safeSongs.map((song, index) => (
            <View key={index} style={styles.programItem}>
              <Text style={styles.songNumber}>{index + 1}.</Text>
              <View style={styles.songDetails}>
                <Text style={styles.songTitle}>{song.title || 'Без названия'}</Text>
                {song.soloists && (
                  <Text style={styles.songSoloists}>Солисты: {song.soloists}</Text>
                )}
              </View>
            </View>
          ))}
        </ScrollView>
      )}
      
      <TouchableOpacity 
        style={styles.modalCloseButton}
        onPress={() => setModalVisible(false)}
      >
        <Text style={styles.modalCloseText}>Закрыть</Text>
      </TouchableOpacity>
    </View>
  );

  // 🆕 МОДАЛЬНОЕ ОКНО ДЕЙСТВИЙ (РЕДАКТИРОВАНИЕ/УДАЛЕНИЕ)
  const renderActionModal = () => (
    <View style={styles.actionModalContent}>
      <Text style={styles.actionModalTitle}>Действия с концертом</Text>
      
      <TouchableOpacity 
        style={styles.actionButton}
        onPress={handleEditConcert}
      >
        <Ionicons name="create-outline" size={20} color="#007AFF" />
        <Text style={[styles.actionButtonText, { color: '#007AFF' }]}>
          Редактировать концерт
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={styles.actionButton}
        onPress={handleDeleteConcert}
      >
        <Ionicons name="trash-outline" size={20} color="#FF3B30" />
        <Text style={[styles.actionButtonText, { color: '#FF3B30' }]}>
          Удалить концерт
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={styles.cancelActionButton}
        onPress={() => setActionModalVisible(false)}
      >
        <Text style={styles.cancelActionText}>Отмена</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <LinearGradient
      colors={['#FFF8E1', '#FFE4B5', '#FFD700']}
      style={styles.container}
    >
      {/* Шапка */}
      <LinearGradient
        colors={['rgba(255, 248, 225, 0.95)', 'rgba(255, 228, 181, 0.9)']}
        style={styles.header}
      >
        <TouchableOpacity 
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#3E2723" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Детали концерта</Text>
        
        {/* 🆕 КНОПКА ДЕЙСТВИЙ ДЛЯ АДМИНА */}
        {userRole === 'admin' && (
          <TouchableOpacity 
            onPress={() => setActionModalVisible(true)}
            style={styles.actionButtonHeader}
          >
            <Ionicons name="ellipsis-vertical" size={24} color="#3E2723" />
          </TouchableOpacity>
        )}
      </LinearGradient>

      <ScrollView style={styles.content}>
        {/* Основная информация */}
        <View style={styles.section}>
          <View style={styles.concertTypeBadge}>
            <Text style={styles.concertTypeText}>{concertTypeRussian}</Text>
          </View>
          
          <Text style={styles.concertDescription}>
            {safeConcert.description || 'Описание не указано'}
          </Text>
          
          <View style={styles.infoRow}>
            <Ionicons name="calendar" size={18} color="#DAA520" />
            <Text style={styles.infoText}>
              {formatDate(safeConcert.date)}
            </Text>
          </View>
          
          {/* КЛИКАБЕЛЬНЫЙ АДРЕС ДЛЯ КАРТ */}
          <TouchableOpacity 
            style={styles.infoRow}
            onPress={() => openMaps(safeConcert.address)}
            activeOpacity={0.7}
          >
            <Ionicons name="location" size={18} color="#DAA520" />
            <Text style={[styles.infoText, styles.clickableAddress]} numberOfLines={2}>
              {safeConcert.address || 'Адрес не указан'}
            </Text>
            <Ionicons name="open-outline" size={16} color="#DAA520" style={styles.mapIcon} />
          </TouchableOpacity>
          
          <View style={styles.timeContainer}>
            <View style={styles.timeItem}>
              <Ionicons name="car" size={16} color="#DAA520" />
              <Text style={styles.timeLabel}>Выезд:</Text>
              <Text style={styles.timeValue}>
                {safeConcert.departureTime || '--:--'}
              </Text>
            </View>
            
            <View style={styles.timeItem}>
              <Ionicons name="musical-notes" size={16} color="#DAA520" />
              <Text style={styles.timeLabel}>Начало:</Text>
              <Text style={styles.timeValue}>
                {safeConcert.startTime || '--:--'}
              </Text>
            </View>
          </View>
        </View>

        {/* Участники */}
        <TouchableOpacity 
          style={styles.actionCard}
          onPress={showParticipants}
        >
          <LinearGradient
            colors={['#FFF8E1', '#FFE4B5']}
            style={styles.actionGradient}
          >
            <View style={styles.actionHeader}>
              <Ionicons name="people" size={24} color="#DAA520" />
              <Text style={styles.actionTitle}>Участники</Text>
              <Text style={styles.actionCount}>
                {safeParticipants.length} чел.
              </Text>
            </View>
            <Text style={styles.actionSubtitle}>
              Нажмите для просмотра списка участников
            </Text>
          </LinearGradient>
        </TouchableOpacity>

        {/* Программа */}
        <TouchableOpacity 
          style={styles.actionCard}
          onPress={showProgram}
        >
          <LinearGradient
            colors={['#FFF8E1', '#FFE4B5']}
            style={styles.actionGradient}
          >
            <View style={styles.actionHeader}>
              <Ionicons name="musical-notes" size={24} color="#DAA520" />
              <Text style={styles.actionTitle}>
                {safeProgram.title || 'Концертная программа'}
              </Text>
              <Text style={styles.actionCount}>
                {safeSongs.length} шт.
              </Text>
            </View>
            <Text style={styles.actionSubtitle}>
              Нажмите для просмотра программы
            </Text>
          </LinearGradient>
        </TouchableOpacity>

        {/* 🆕 КНОПКА РЕДАКТИРОВАНИЯ ДЛЯ АДМИНА */}
        {userRole === 'admin' && (
          <TouchableOpacity 
            style={styles.editButton}
            onPress={() => setActionModalVisible(true)}
          >
            <LinearGradient
              colors={['#FFD700', '#DAA520']}
              style={styles.editButtonGradient}
            >
              <Ionicons name="create-outline" size={20} color="white" />
              <Text style={styles.editButtonText}>Управление концертом</Text>
            </LinearGradient>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* Модальное окно участников/программы */}
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            {selectedModal === 'participants' && renderParticipantsModal()}
            {selectedModal === 'program' && renderProgramModal()}
          </View>
        </View>
      </Modal>

      {/* 🆕 МОДАЛЬНОЕ ОКНО ДЕЙСТВИЙ */}
      <Modal
        visible={actionModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setActionModalVisible(false)}
      >
        <View style={styles.actionModalOverlay}>
          <View style={styles.actionModalContainer}>
            {renderActionModal()}
          </View>
        </View>
      </Modal>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  backButton: {
    marginTop: 20,
    backgroundColor: '#DAA520',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
  },
  backButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#3E2723',
    textAlign: 'center',
  },
  // 🆕 КНОПКА ДЕЙСТВИЙ В ШАПКЕ
  actionButtonHeader: {
    padding: 5,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 15,
    padding: 20,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: 'rgba(218, 165, 32, 0.3)',
  },
  concertTypeBadge: {
    backgroundColor: '#DAA520',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginBottom: 15,
  },
  concertTypeText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  concertDescription: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3E2723',
    marginBottom: 15,
    lineHeight: 22,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    padding: 8,
    borderRadius: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#3E2723',
    marginLeft: 10,
    flex: 1,
  },
  clickableAddress: {
    textDecorationLine: 'underline',
    color: '#DAA520',
    fontWeight: '500',
  },
  mapIcon: {
    marginLeft: 8,
  },
  timeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  timeItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeLabel: {
    fontSize: 12,
    color: '#8B8B8B',
    marginLeft: 5,
    marginRight: 3,
  },
  timeValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3E2723',
  },
  actionCard: {
    borderRadius: 15,
    overflow: 'hidden',
    marginBottom: 15,
    shadowColor: '#8B6B4F',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  actionGradient: {
    padding: 20,
    borderRadius: 15,
  },
  actionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#3E2723',
    marginLeft: 10,
    flex: 1,
  },
  actionCount: {
    fontSize: 14,
    color: '#DAA520',
    fontWeight: '600',
  },
  actionSubtitle: {
    fontSize: 12,
    color: '#8B8B8B',
  },
  // 🆕 СТИЛИ ДЛЯ КНОПКИ РЕДАКТИРОВАНИЯ
  editButton: {
    borderRadius: 15,
    overflow: 'hidden',
    marginTop: 10,
    marginBottom: 20,
    shadowColor: '#DAA520',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 5,
  },
  editButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    paddingHorizontal: 20,
  },
  editButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  // Модальные окна
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 0,
    width: '90%',
    maxHeight: '70%',
  },
  modalContent: {
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#3E2723',
    marginBottom: 15,
    textAlign: 'center',
  },
  modalList: {
    maxHeight: 300,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  listText: {
    fontSize: 14,
    color: '#3E2723',
    marginLeft: 10,
  },
  programItem: {
    flexDirection: 'row',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  songNumber: {
    fontSize: 14,
    color: '#DAA520',
    fontWeight: 'bold',
    marginRight: 10,
    width: 25,
  },
  songDetails: {
    flex: 1,
  },
  songTitle: {
    fontSize: 14,
    color: '#3E2723',
    fontWeight: '600',
    marginBottom: 4,
  },
  songSoloists: {
    fontSize: 12,
    color: '#8B8B8B',
    fontStyle: 'italic',
  },
  noDataText: {
    fontSize: 14,
    color: '#8B8B8B',
    textAlign: 'center',
    fontStyle: 'italic',
    paddingVertical: 20,
  },
  modalCloseButton: {
    backgroundColor: '#DAA520',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 15,
  },
  modalCloseText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  // 🆕 СТИЛИ ДЛЯ МОДАЛЬНОГО ОКНА ДЕЙСТВИЙ
  actionModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  actionModalContainer: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 0,
    width: '80%',
  },
  actionModalContent: {
    padding: 20,
  },
  actionModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#3E2723',
    marginBottom: 20,
    textAlign: 'center',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 10,
    borderRadius: 10,
    marginBottom: 10,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 10,
  },
  cancelActionButton: {
    backgroundColor: '#F5F5F5',
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  cancelActionText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '600',
  },
});