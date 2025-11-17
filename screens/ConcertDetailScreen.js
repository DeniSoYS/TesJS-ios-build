import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { deleteDoc, doc } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Animated,
  Dimensions,
  Linking,
  Modal,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
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
  const [selectedModal, setSelectedModal] = useState('');
  const [actionModalVisible, setActionModalVisible] = useState(false);
  const [scaleAnim] = useState(new Animated.Value(0));
  const fadeAnim = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();

    if (modalVisible || actionModalVisible) {
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        friction: 8,
      }).start();
    } else {
      scaleAnim.setValue(0);
    }
  }, [modalVisible, actionModalVisible]);

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
    navigation.navigate('AddEvent', { 
      concert: safeConcert,
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

  const closeModal = () => {
    Animated.timing(scaleAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => setModalVisible(false));
  };

  const closeActionModal = () => {
    Animated.timing(scaleAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => setActionModalVisible(false));
  };

  const openActionModal = () => {
    setActionModalVisible(true);
  };

  // ✅ ЕСЛИ КОНЦЕРТ НЕ ПЕРЕДАН - ПОКАЗЫВАЕМ ОШИБКУ
  if (!concert) {
    return (
      <LinearGradient colors={['#0a0a0a', '#1a1a1a', '#2a2a2a']} style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="warning-outline" size={50} color="#FF6B6B" />
          <Text style={styles.errorText}>Концерт не найден</Text>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <LinearGradient
              colors={['#FFD700', '#FFA500']}
              style={styles.backButtonGradient}
            >
              <Text style={styles.backButtonText}>Вернуться назад</Text>
            </LinearGradient>
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
    <Animated.View 
      style={[
        styles.modalContent,
        { transform: [{ scale: scaleAnim }] }
      ]}
    >
      <LinearGradient
        colors={['rgba(26, 26, 26, 0.98)', 'rgba(35, 35, 35, 0.95)']}
        style={styles.modalGradient}
      >
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>🎭 Участники концерта</Text>
          <TouchableOpacity onPress={closeModal} style={styles.modalCloseIcon}>
            <Ionicons name="close-circle" size={getResponsiveSize(30)} color="#FFD700" />
          </TouchableOpacity>
        </View>
        
        {safeParticipants.length === 0 ? (
          <View style={styles.noData}>
            <Ionicons name="people" size={getResponsiveSize(48)} color="#555" />
            <Text style={styles.noDataText}>Участники не указаны</Text>
          </View>
        ) : (
          <ScrollView style={styles.modalList}>
            {safeParticipants.map((participant, index) => (
              <View key={index} style={styles.listItem}>
                <LinearGradient
                  colors={['rgba(255, 215, 0, 0.2)', 'rgba(255, 165, 0, 0.2)']}
                  style={styles.listItemGradient}
                >
                  <Ionicons name="person" size={getResponsiveSize(18)} color="#FFD700" />
                  <Text style={styles.listText}>{participant}</Text>
                </LinearGradient>
              </View>
            ))}
          </ScrollView>
        )}
      </LinearGradient>
    </Animated.View>
  );

  const renderProgramModal = () => (
    <Animated.View 
      style={[
        styles.modalContent,
        { transform: [{ scale: scaleAnim }] }
      ]}
    >
      <LinearGradient
        colors={['rgba(26, 26, 26, 0.98)', 'rgba(35, 35, 35, 0.95)']}
        style={styles.modalGradient}
      >
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>🎵 {safeProgram.title || 'Концертная программа'}</Text>
          <TouchableOpacity onPress={closeModal} style={styles.modalCloseIcon}>
            <Ionicons name="close-circle" size={getResponsiveSize(30)} color="#FFD700" />
          </TouchableOpacity>
        </View>
        
        {safeSongs.length === 0 ? (
          <View style={styles.noData}>
            <Ionicons name="musical-notes" size={getResponsiveSize(48)} color="#555" />
            <Text style={styles.noDataText}>Программа не указана</Text>
          </View>
        ) : (
          <ScrollView style={styles.modalList}>
            {safeSongs.map((song, index) => (
              <View key={index} style={styles.programItem}>
                <LinearGradient
                  colors={['rgba(155, 89, 182, 0.2)', 'rgba(139, 69, 182, 0.2)']}
                  style={styles.programItemGradient}
                >
                  <Text style={styles.songNumber}>{index + 1}.</Text>
                  <View style={styles.songDetails}>
                    <Text style={styles.songTitle}>{song.title || 'Без названия'}</Text>
                    {song.soloists && (
                      <Text style={styles.songSoloists}>🎤 {song.soloists}</Text>
                    )}
                  </View>
                </LinearGradient>
              </View>
            ))}
          </ScrollView>
        )}
      </LinearGradient>
    </Animated.View>
  );

  // 🆕 МОДАЛЬНОЕ ОКНО ДЕЙСТВИЙ - ИСПРАВЛЕННАЯ ВЕРСИЯ
  const renderActionModal = () => (
    <Animated.View 
      style={[
        styles.actionModalContent,
        { transform: [{ scale: scaleAnim }] }
      ]}
    >
      <LinearGradient
        colors={['rgba(26, 26, 26, 0.98)', 'rgba(35, 35, 35, 0.95)']}
        style={styles.actionModalGradient}
      >
        <View style={styles.actionModalHeader}>
          <Text style={styles.actionModalTitle}>⚡ Действия с концертом</Text>
          <TouchableOpacity onPress={closeActionModal} style={styles.modalCloseIcon}>
            <Ionicons name="close-circle" size={getResponsiveSize(30)} color="#FFD700" />
          </TouchableOpacity>
        </View>
        
        <View style={styles.actionButtonsContainer}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={handleEditConcert}
          >
            <LinearGradient
              colors={['#4A90E2', '#357ABD']}
              style={styles.actionButtonGradient}
            >
              <Ionicons name="create" size={getResponsiveSize(20)} color="white" />
              <Text style={styles.actionButtonText}>Редактировать концерт</Text>
            </LinearGradient>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={handleDeleteConcert}
          >
            <LinearGradient
              colors={['#FF6B6B', '#EE5A52']}
              style={styles.actionButtonGradient}
            >
              <Ionicons name="trash" size={getResponsiveSize(20)} color="white" />
              <Text style={styles.actionButtonText}>Удалить концерт</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </Animated.View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0a0a0a" />
      
      <LinearGradient
        colors={['#0a0a0a', '#1a1a1a', '#2a2a2a']}
        style={styles.background}
      >
        {/* 🌙 ХЕДЕР В СТИЛЕ CALENDARSCREEN */}
        <Animated.View style={{ opacity: fadeAnim }}>
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
              
              <View style={styles.titleSection}>
                <View style={styles.titleIconContainer}>
                  <LinearGradient
                    colors={['#FFD700', '#FFA500']}
                    style={styles.titleIconGradient}
                  >
                    <Ionicons name="musical-notes" size={getResponsiveSize(22)} color="#1a1a1a" />
                  </LinearGradient>
                </View>
                <View style={styles.titleTextContainer}>
                  <Text style={styles.headerTitle}>Детали концерта</Text>
                  <Text style={styles.headerSubtitle}>{concertTypeRussian}</Text>
                </View>
              </View>

              {/* 🆕 КНОПКА ДЕЙСТВИЙ ДЛЯ АДМИНА - ИСПРАВЛЕННАЯ */}
              {userRole === 'admin' && (
                <TouchableOpacity 
                  onPress={openActionModal}
                  style={styles.actionButtonHeader}
                  activeOpacity={0.7}
                >
                  <LinearGradient
                    colors={['#FFD700', '#FFA500']}
                    style={styles.actionButtonHeaderGradient}
                  >
                    <Ionicons name="ellipsis-vertical" size={getResponsiveSize(18)} color="#1a1a1a" />
                  </LinearGradient>
                </TouchableOpacity>
              )}
            </View>
          </LinearGradient>
        </Animated.View>

        <ScrollView style={styles.content}>
          {/* 🌙 ОСНОВНАЯ ИНФОРМАЦИЯ */}
          <View style={styles.section}>
            <LinearGradient
              colors={['rgba(26, 26, 26, 0.9)', 'rgba(35, 35, 35, 0.8)']}
              style={styles.infoCard}
            >
              <Text style={styles.concertDescription}>
                {safeConcert.description || 'Описание не указано'}
              </Text>
              
              <View style={styles.infoGrid}>
                <View style={styles.infoItem}>
                  <Ionicons name="calendar" size={getResponsiveSize(18)} color="#FFD700" />
                  <Text style={styles.infoLabel}>Дата:</Text>
                  <Text style={styles.infoValue}>
                    {formatDate(safeConcert.date)}
                  </Text>
                </View>
                
                {/* КЛИКАБЕЛЬНЫЙ АДРЕС ДЛЯ КАРТ */}
                <TouchableOpacity 
                  style={styles.infoItem}
                  onPress={() => openMaps(safeConcert.address)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="location" size={getResponsiveSize(18)} color="#FFD700" />
                  <Text style={styles.infoLabel}>Адрес:</Text>
                  <Text style={[styles.infoValue, styles.clickableAddress]} numberOfLines={1}>
                    {safeConcert.address || 'Адрес не указан'}
                  </Text>
                  <Ionicons name="open-outline" size={getResponsiveSize(14)} color="#FFD700" />
                </TouchableOpacity>
                
                <View style={styles.timeContainer}>
                  <View style={styles.timeItem}>
                    <Ionicons name="car" size={getResponsiveSize(16)} color="#FFD700" />
                    <Text style={styles.timeLabel}>Выезд:</Text>
                    <Text style={styles.timeValue}>
                      {safeConcert.departureTime || '--:--'}
                    </Text>
                  </View>
                  
                  <View style={styles.timeItem}>
                    <Ionicons name="time" size={getResponsiveSize(16)} color="#FFD700" />
                    <Text style={styles.timeLabel}>Начало:</Text>
                    <Text style={styles.timeValue}>
                      {safeConcert.startTime || '--:--'}
                    </Text>
                  </View>
                </View>
              </View>
            </LinearGradient>
          </View>

          {/* 🌙 КАРТОЧКИ ДЕЙСТВИЙ */}
          <View style={styles.actionsGrid}>
            {/* Участники */}
            <TouchableOpacity 
              style={styles.actionCard}
              onPress={showParticipants}
              activeOpacity={0.7}
            >
              <LinearGradient
                colors={['rgba(255, 215, 0, 0.2)', 'rgba(255, 165, 0, 0.2)']}
                style={styles.actionCardGradient}
              >
                <View style={styles.actionIconContainer}>
                  <Ionicons name="people" size={getResponsiveSize(28)} color="#FFD700" />
                </View>
                <Text style={styles.actionCardTitle}>Участники</Text>
                <Text style={styles.actionCardCount}>
                  {safeParticipants.length} чел.
                </Text>
                <Text style={styles.actionCardSubtitle}>Нажмите для просмотра</Text>
              </LinearGradient>
            </TouchableOpacity>

            {/* Программа */}
            <TouchableOpacity 
              style={styles.actionCard}
              onPress={showProgram}
              activeOpacity={0.7}
            >
              <LinearGradient
                colors={['rgba(155, 89, 182, 0.2)', 'rgba(139, 69, 182, 0.2)']}
                style={styles.actionCardGradient}
              >
                <View style={styles.actionIconContainer}>
                  <Ionicons name="musical-notes" size={getResponsiveSize(28)} color="#9B59B6" />
                </View>
                <Text style={styles.actionCardTitle}>
                  {safeProgram.title || 'Программа'}
                </Text>
                <Text style={styles.actionCardCount}>
                  {safeSongs.length} шт.
                </Text>
                <Text style={styles.actionCardSubtitle}>Нажмите для просмотра</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* 🌙 СТАТИСТИКА */}
          <View style={styles.statsContainer}>
            <View style={styles.statCard}>
              <View style={styles.statIconWrapper}>
                <Ionicons name="people" size={getResponsiveSize(20)} color="#FFD700" />
              </View>
              <View style={styles.statTextContainer}>
                <Text style={styles.statValue}>{safeParticipants.length}</Text>
                <Text style={styles.statLabel}>Участников</Text>
              </View>
            </View>

            <View style={styles.statDivider} />

            <View style={styles.statCard}>
              <View style={styles.statIconWrapper}>
                <Ionicons name="musical-notes" size={getResponsiveSize(20)} color="#9B59B6" />
              </View>
              <View style={styles.statTextContainer}>
                <Text style={styles.statValue}>{safeSongs.length}</Text>
                <Text style={styles.statLabel}>Произведений</Text>
              </View>
            </View>

            <View style={styles.statDivider} />

            <View style={styles.statCard}>
              <View style={styles.statIconWrapper}>
                <Ionicons name="time" size={getResponsiveSize(20)} color="#4A90E2" />
              </View>
              <View style={styles.statTextContainer}>
                <Text style={styles.statValue}>
                  {safeConcert.duration || 'N/A'}
                </Text>
                <Text style={styles.statLabel}>Продолжительность</Text>
              </View>
            </View>
          </View>
        </ScrollView>

        {/* 🌙 МОДАЛЬНЫЕ ОКНА */}
        <Modal
          visible={modalVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={closeModal}
        >
          <BlurView intensity={80} style={styles.modalOverlay} tint="dark">
            {selectedModal === 'participants' && renderParticipantsModal()}
            {selectedModal === 'program' && renderProgramModal()}
          </BlurView>
        </Modal>

        <Modal
          visible={actionModalVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={closeActionModal}
        >
          <BlurView intensity={80} style={styles.modalOverlay} tint="dark">
            {renderActionModal()}
          </BlurView>
        </Modal>
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: getResponsiveFontSize(18),
    fontWeight: 'bold',
    color: '#E0E0E0',
    marginTop: 10,
    textAlign: 'center',
  },
  backButtonGradient: {
    width: getResponsiveSize(44),
    height: getResponsiveSize(44),
    borderRadius: getResponsiveSize(22),
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    color: '#1a1a1a',
    fontSize: getResponsiveFontSize(14),
    fontWeight: '600',
  },
  // 🌙 ХЕДЕР
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
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    borderRadius: getResponsiveSize(22),
    overflow: 'hidden',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  titleSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  titleIconContainer: {
    marginRight: getResponsiveSize(12),
  },
  titleIconGradient: {
    width: getResponsiveSize(44),
    height: getResponsiveSize(44),
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
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: getResponsiveFontSize(18),
    fontWeight: '800',
    color: '#E0E0E0',
    letterSpacing: 0.3,
  },
  headerSubtitle: {
    fontSize: getResponsiveFontSize(12),
    color: '#FFD700',
    fontWeight: '600',
    marginTop: getResponsiveSize(2),
  },
  actionButtonHeader: {
    borderRadius: getResponsiveSize(22),
    overflow: 'hidden',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  actionButtonHeaderGradient: {
    width: getResponsiveSize(44),
    height: getResponsiveSize(44),
    borderRadius: getResponsiveSize(22),
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    padding: getResponsiveSize(15),
  },
  // 🌙 ОСНОВНАЯ ИНФОРМАЦИЯ
  section: {
    marginBottom: getResponsiveSize(20),
  },
  infoCard: {
    borderRadius: getResponsiveSize(20),
    padding: getResponsiveSize(20),
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.2)',
  },
  concertDescription: {
    fontSize: getResponsiveFontSize(16),
    fontWeight: '600',
    color: '#E0E0E0',
    marginBottom: getResponsiveSize(15),
    lineHeight: getResponsiveFontSize(22),
    textAlign: 'center',
  },
  infoGrid: {
    gap: getResponsiveSize(12),
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: getResponsiveSize(12),
    borderRadius: getResponsiveSize(12),
    backgroundColor: 'rgba(42, 42, 42, 0.6)',
  },
  infoLabel: {
    fontSize: getResponsiveFontSize(14),
    fontWeight: '600',
    color: '#999',
    marginLeft: getResponsiveSize(10),
    marginRight: getResponsiveSize(8),
    width: getResponsiveSize(60),
  },
  infoValue: {
    fontSize: getResponsiveFontSize(14),
    color: '#E0E0E0',
    flex: 1,
    fontWeight: '500',
  },
  clickableAddress: {
    color: '#FFD700',
    fontWeight: '500',
  },
  timeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: getResponsiveSize(12),
    borderRadius: getResponsiveSize(12),
    backgroundColor: 'rgba(42, 42, 42, 0.6)',
  },
  timeItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeLabel: {
    fontSize: getResponsiveFontSize(12),
    color: '#999',
    marginLeft: getResponsiveSize(5),
    marginRight: getResponsiveSize(3),
  },
  timeValue: {
    fontSize: getResponsiveFontSize(14),
    fontWeight: '600',
    color: '#E0E0E0',
  },
  // 🌙 КАРТОЧКИ ДЕЙСТВИЙ
  actionsGrid: {
    flexDirection: 'row',
    gap: getResponsiveSize(10),
    marginBottom: getResponsiveSize(20),
  },
  actionCard: {
    flex: 1,
    borderRadius: getResponsiveSize(16),
    overflow: 'hidden',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  actionCardGradient: {
    padding: getResponsiveSize(16),
    alignItems: 'center',
    borderRadius: getResponsiveSize(16),
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.2)',
  },
  actionIconContainer: {
    width: getResponsiveSize(50),
    height: getResponsiveSize(50),
    borderRadius: getResponsiveSize(25),
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: getResponsiveSize(8),
  },
  actionCardTitle: {
    fontSize: getResponsiveFontSize(14),
    fontWeight: '700',
    color: '#E0E0E0',
    textAlign: 'center',
    marginBottom: getResponsiveSize(4),
  },
  actionCardCount: {
    fontSize: getResponsiveFontSize(18),
    fontWeight: '800',
    color: '#FFD700',
    textAlign: 'center',
  },
  actionCardSubtitle: {
    fontSize: getResponsiveFontSize(10),
    color: '#999',
    textAlign: 'center',
    marginTop: getResponsiveSize(4),
  },
  // 🌙 СТАТИСТИКА
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(26, 26, 26, 0.8)',
    borderRadius: getResponsiveSize(16),
    padding: getResponsiveSize(16),
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.2)',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  statCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: getResponsiveSize(10),
  },
  statIconWrapper: {
    width: getResponsiveSize(36),
    height: getResponsiveSize(36),
    borderRadius: getResponsiveSize(10),
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statTextContainer: {
    flex: 1,
  },
  statValue: {
    fontSize: getResponsiveFontSize(16),
    fontWeight: '800',
    color: '#E0E0E0',
    letterSpacing: 0.3,
  },
  statLabel: {
    fontSize: getResponsiveFontSize(10),
    color: '#999',
    fontWeight: '600',
    marginTop: getResponsiveSize(2),
  },
  statDivider: {
    width: 1,
    height: '100%',
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    marginHorizontal: getResponsiveSize(8),
  },
  // 🌙 МОДАЛЬНЫЕ ОКНА
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  modalContent: {
    width: '90%',
    maxWidth: getResponsiveSize(450),
    maxHeight: '80%',
  },
  modalGradient: {
    borderRadius: getResponsiveSize(30),
    padding: getResponsiveSize(25),
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: getResponsiveSize(15),
  },
  modalTitle: {
    fontSize: getResponsiveFontSize(20),
    fontWeight: '900',
    color: '#E0E0E0',
    letterSpacing: 0.3,
    flex: 1,
  },
  modalCloseIcon: {
    padding: getResponsiveSize(6),
  },
  modalList: {
    maxHeight: getResponsiveSize(400),
  },
  listItem: {
    marginBottom: getResponsiveSize(8),
  },
  listItemGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: getResponsiveSize(12),
    borderRadius: getResponsiveSize(12),
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.2)',
  },
  listText: {
    fontSize: getResponsiveFontSize(14),
    color: '#E0E0E0',
    marginLeft: getResponsiveSize(10),
    fontWeight: '500',
  },
  programItem: {
    marginBottom: getResponsiveSize(8),
  },
  programItemGradient: {
    flexDirection: 'row',
    padding: getResponsiveSize(12),
    borderRadius: getResponsiveSize(12),
    borderWidth: 1,
    borderColor: 'rgba(155, 89, 182, 0.2)',
  },
  songNumber: {
    fontSize: getResponsiveFontSize(14),
    color: '#9B59B6',
    fontWeight: 'bold',
    marginRight: getResponsiveSize(10),
    width: getResponsiveSize(25),
  },
  songDetails: {
    flex: 1,
  },
  songTitle: {
    fontSize: getResponsiveFontSize(14),
    color: '#E0E0E0',
    fontWeight: '600',
    marginBottom: getResponsiveSize(4),
  },
  songSoloists: {
    fontSize: getResponsiveFontSize(12),
    color: '#999',
    fontStyle: 'italic',
  },
  noData: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: getResponsiveSize(30),
  },
  noDataText: {
    fontSize: getResponsiveFontSize(16),
    color: '#888',
    marginTop: getResponsiveSize(12),
    textAlign: 'center',
  },
  // 🌙 МОДАЛЬНОЕ ОКНО ДЕЙСТВИЙ - ИСПРАВЛЕННЫЕ СТИЛИ
  actionModalContent: {
    width: '80%',
    maxWidth: getResponsiveSize(350),
  },
  actionModalGradient: {
    borderRadius: getResponsiveSize(25),
    padding: getResponsiveSize(20),
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
  },
  actionModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: getResponsiveSize(20),
  },
  actionModalTitle: {
    fontSize: getResponsiveFontSize(18),
    fontWeight: '900',
    color: '#E0E0E0',
    letterSpacing: 0.3,
    flex: 1,
  },
  actionButtonsContainer: {
    gap: getResponsiveSize(12),
  },
  actionButton: {
    borderRadius: getResponsiveSize(15),
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 5,
  },
  actionButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: getResponsiveSize(15),
    paddingHorizontal: getResponsiveSize(20),
  },
  actionButtonText: {
    color: 'white',
    fontSize: getResponsiveFontSize(14),
    fontWeight: '600',
    marginLeft: getResponsiveSize(8),
  },
});