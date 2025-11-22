import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { deleteDoc, doc } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import {
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

// ✅ КАТЕГОРИИ УЧАСТНИКОВ ДЛЯ ОТОБРАЖЕНИЯ
const PARTICIPANT_CATEGORIES = [
  { key: 'femaleChoir', label: 'Женский состав хор', icon: 'woman', color: '#E91E63' },
  { key: 'maleChoir', label: 'Мужской состав хор', icon: 'man', color: '#2196F3' },
  { key: 'maleBallet', label: 'Мужской состав балет', icon: 'fitness', color: '#FF9800' },
  { key: 'femaleBallet', label: 'Женский состав балет', icon: 'ribbon', color: '#9C27B0' },
  { key: 'administration', label: 'Администрация', icon: 'briefcase', color: '#607D8B' },
];

// ✅ КОМПОНЕНТ MODAL OVERLAY (ЗАМЕНА BLURVIEW)
const ModalOverlay = ({ children, visible, onClose }) => {
  if (!visible) return null;
  
  return (
    <View style={styles.modalOverlay}>
      <TouchableOpacity 
        style={styles.modalBackdrop}
        activeOpacity={1}
        onPress={onClose}
      />
      {children}
    </View>
  );
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

export default function ConcertDetailScreen({ navigation, route }) {
  const dimensions = useWindowDimensions();
  const { concert, userRole } = route.params || {};
  
  // ✅ ИСПРАВЛЕННАЯ СТРУКТУРА ДАННЫХ
  const safeConcert = concert || {};
  const safeParticipants = safeConcert.participants || {
    femaleChoir: [],
    maleChoir: [],
    maleBallet: [],
    femaleBallet: [],
    administration: []
  };
  const safeProgram = safeConcert.program || {};
  const safeSongs = Array.isArray(safeProgram.songs) ? safeProgram.songs : [];

  // ✅ РАСЧЕТ ОБЩЕГО КОЛИЧЕСТВА УЧАСТНИКОВ
  const getTotalParticipantsCount = () => {
    if (!safeParticipants) return 0;
    return Object.values(safeParticipants).reduce((total, category) => {
      return total + (Array.isArray(category) ? category.length : 0);
    }, 0);
  };

  const [modalVisible, setModalVisible] = useState(false);
  const [selectedModal, setSelectedModal] = useState('');
  const [actionModalVisible, setActionModalVisible] = useState(false);
  const [scaleAnim] = useState(new Animated.Value(0));
  const fadeAnim = React.useRef(new Animated.Value(0)).current;

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

  // ✅ BROWSER HISTORY API
  useEffect(() => {
    if (Platform.OS === 'web') {
      if (modalVisible || actionModalVisible) {
        window.history.pushState({ modal: true }, '');
      }

      const handlePopState = () => {
        if (actionModalVisible) {
          setActionModalVisible(false);
          return;
        }
        if (modalVisible) {
          setModalVisible(false);
          setSelectedModal('');
          return;
        }
      };

      window.addEventListener('popstate', handlePopState);
      return () => window.removeEventListener('popstate', handlePopState);
    }
  }, [modalVisible, actionModalVisible]);

  // ✅ ESC KEY HANDLER
  useEffect(() => {
    if (Platform.OS === 'web') {
      const handleKeyPress = (e) => {
        if (e.key === 'Escape') {
          if (actionModalVisible) {
            setActionModalVisible(false);
          } else if (modalVisible) {
            setModalVisible(false);
            setSelectedModal('');
          }
        }
      };

      document.addEventListener('keydown', handleKeyPress);
      return () => document.removeEventListener('keydown', handleKeyPress);
    }
  }, [modalVisible, actionModalVisible]);

  const handleBackPress = () => {
    if (actionModalVisible) {
      setActionModalVisible(false);
      return true;
    }
    if (modalVisible) {
      setModalVisible(false);
      setSelectedModal('');
      return true;
    }
    navigation.goBack();
    return true;
  };

  // ✅ ФУНКЦИЯ ДЛЯ ОТКРЫТИЯ КАРТ ПО АДРЕСУ
  const openMaps = (address) => {
    if (!address) {
      showAlert('Ошибка', 'Адрес не указан');
      return;
    }

    const encodedAddress = encodeURIComponent(address);
    
    const url = Platform.select({
      ios: `maps:0,0?q=${encodedAddress}`,
      android: `geo:0,0?q=${encodedAddress}`,
      web: `https://maps.google.com/?q=${encodedAddress}`
    });

    Linking.openURL(url).catch((err) => {
      console.error('Ошибка открытия карт:', err);
      showAlert('Ошибка', 'Не удалось открыть карты');
    });
  };

  // ✅ ИСПРАВЛЕННАЯ ФУНКЦИЯ РЕДАКТИРОВАНИЯ КОНЦЕРТА
  const handleEditConcert = () => {
    setActionModalVisible(false);
    navigation.navigate('AddEvent', { 
      concert: safeConcert,
      userRole: userRole,
      isEditing: true
    });
  };

  // ✅ ИСПРАВЛЕННАЯ ФУНКЦИЯ УДАЛЕНИЯ КОНЦЕРТА
  const handleDeleteConcert = () => {
    setActionModalVisible(false);
    
    showAlert(
      'Удаление концерта',
      'Вы уверены, что хотите удалить этот концерт?',
      [
        { text: 'Отмена', style: 'cancel' },
        { 
          text: 'Удалить', 
          style: 'destructive',
          onPress: async () => {
            try {
              if (!safeConcert.id) {
                showAlert('Ошибка', 'Концерт не найден');
                return;
              }

              await deleteDoc(doc(db, 'concerts', safeConcert.id));
              showAlert('Успех', 'Концерт успешно удален!', [
                { text: 'OK', onPress: () => navigation.goBack() }
              ]);
            } catch (error) {
              console.error('Ошибка удаления:', error);
              if (error.code === 'permission-denied') {
                showAlert('Ошибка', 'У вас нет прав для удаления концертов');
              } else if (error.code === 'not-found') {
                showAlert('Ошибка', 'Концерт уже был удален', [
                  { text: 'OK', onPress: () => navigation.goBack() }
                ]);
              } else {
                showAlert('Ошибка', 'Не удалось удалить концерт');
              }
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
    }).start(() => {
      setModalVisible(false);
      setSelectedModal('');
    });
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
    try {
      const [year, month, day] = dateString.split('-');
      const months = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 
                      'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
      return `${parseInt(day)} ${months[parseInt(month) - 1]} ${year}`;
    } catch (error) {
      return dateString;
    }
  };

  const showParticipants = () => {
    setSelectedModal('participants');
    setModalVisible(true);
  };

  const showProgram = () => {
    setSelectedModal('program');
    setModalVisible(true);
  };

  // ✅ ВЫЧИСЛЯЕМ RESPONSIVE SIZES
  const responsiveSize = (size) => getResponsiveSize(size, dimensions.width);
  const responsiveFontSize = (size) => getResponsiveFontSize(size, dimensions.width);

  // ✅ ИСПРАВЛЕННЫЙ РЕНДЕРИНГ УЧАСТНИКОВ ПО КАТЕГОРИЯМ
  const renderParticipantsModal = () => {
    const hasParticipants = Object.values(safeParticipants).some(
      category => Array.isArray(category) && category.length > 0
    );

    return (
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
            <Text style={[styles.modalTitle, { fontSize: responsiveFontSize(20) }]}>🎭 Участники концерта</Text>
            <TouchableOpacity 
              onPress={closeModal} 
              style={styles.modalCloseIcon}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close-circle" size={responsiveSize(30)} color="#FFD700" />
            </TouchableOpacity>
          </View>
          
          {!hasParticipants ? (
            <View style={styles.noData}>
              <Ionicons name="people" size={responsiveSize(48)} color="#555" />
              <Text style={[styles.noDataText, { fontSize: responsiveFontSize(16) }]}>Участники не указаны</Text>
            </View>
          ) : (
            <ScrollView 
              style={styles.modalList}
              showsVerticalScrollIndicator={false}
            >
              {PARTICIPANT_CATEGORIES.map((category) => {
                const categoryParticipants = safeParticipants[category.key] || [];
                
                if (!Array.isArray(categoryParticipants) || categoryParticipants.length === 0) {
                  return null;
                }

                return (
                  <View key={category.key} style={styles.categorySection}>
                    <View style={styles.categoryHeader}>
                      <View style={styles.categoryTitleRow}>
                        <Ionicons 
                          name={category.icon} 
                          size={responsiveSize(18)} 
                          color={category.color} 
                        />
                        <Text style={[styles.categoryTitle, { color: category.color, fontSize: responsiveFontSize(16) }]}>
                          {category.label}
                        </Text>
                      </View>
                      <Text style={[styles.categoryCount, { fontSize: responsiveFontSize(12) }]}>
                        {categoryParticipants.length} чел.
                      </Text>
                    </View>
                    
                    <View style={styles.participantsList}>
                      {categoryParticipants.map((participant, index) => (
                        <View key={index} style={styles.listItem}>
                          <LinearGradient
                            colors={[`${category.color}20`, `${category.color}10`]}
                            style={styles.listItemGradient}
                          >
                            <Ionicons name="person" size={responsiveSize(16)} color={category.color} />
                            <Text style={[styles.listText, { fontSize: responsiveFontSize(14) }]}>{participant}</Text>
                            <Text style={[styles.participantNumber, { fontSize: responsiveFontSize(12) }]}>{index + 1}</Text>
                          </LinearGradient>
                        </View>
                      ))}
                    </View>
                  </View>
                );
              })}
            </ScrollView>
          )}
        </LinearGradient>
      </Animated.View>
    );
  };

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
          <Text style={[styles.modalTitle, { fontSize: responsiveFontSize(20) }]}>
            🎵 {safeProgram.title || 'Концертная программа'}
          </Text>
          <TouchableOpacity 
            onPress={closeModal} 
            style={styles.modalCloseIcon}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="close-circle" size={responsiveSize(30)} color="#FFD700" />
          </TouchableOpacity>
        </View>
        
        {safeSongs.length === 0 ? (
          <View style={styles.noData}>
            <Ionicons name="musical-notes" size={responsiveSize(48)} color="#555" />
            <Text style={[styles.noDataText, { fontSize: responsiveFontSize(16) }]}>Программа не указана</Text>
          </View>
        ) : (
          <ScrollView 
            style={styles.modalList}
            showsVerticalScrollIndicator={false}
          >
            {safeSongs.map((song, index) => (
              <View key={index} style={styles.programItem}>
                <LinearGradient
                  colors={['rgba(155, 89, 182, 0.2)', 'rgba(139, 69, 182, 0.2)']}
                  style={styles.programItemGradient}
                >
                  <Text style={[styles.songNumber, { fontSize: responsiveFontSize(14) }]}>{index + 1}.</Text>
                  <View style={styles.songDetails}>
                    <Text style={[styles.songTitle, { fontSize: responsiveFontSize(14) }]}>{song.title || 'Без названия'}</Text>
                    {song.soloists && (
                      <Text style={[styles.songSoloists, { fontSize: responsiveFontSize(12) }]}>🎤 Солисты: {song.soloists}</Text>
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

  // ✅ МОДАЛЬНОЕ ОКНО ДЕЙСТВИЙ - ИСПРАВЛЕННАЯ ВЕРСИЯ
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
          <Text style={[styles.actionModalTitle, { fontSize: responsiveFontSize(18) }]}>⚡ Действия с концертом</Text>
          <TouchableOpacity 
            onPress={closeActionModal} 
            style={styles.modalCloseIcon}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="close-circle" size={responsiveSize(30)} color="#FFD700" />
          </TouchableOpacity>
        </View>
        
        <View style={styles.actionButtonsContainer}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={handleEditConcert}
            activeOpacity={0.7}
          >
            <LinearGradient
              colors={['#4A90E2', '#357ABD']}
              style={styles.actionButtonGradient}
            >
              <Ionicons name="create" size={responsiveSize(20)} color="white" />
              <Text style={[styles.actionButtonText, { fontSize: responsiveFontSize(14) }]}>Редактировать концерт</Text>
            </LinearGradient>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={handleDeleteConcert}
            activeOpacity={0.7}
          >
            <LinearGradient
              colors={['#FF6B6B', '#EE5A52']}
              style={styles.actionButtonGradient}
            >
              <Ionicons name="trash" size={responsiveSize(20)} color="white" />
              <Text style={[styles.actionButtonText, { fontSize: responsiveFontSize(14) }]}>Удалить концерт</Text>
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
            style={[styles.header, { paddingTop: Platform.OS === 'ios' ? responsiveSize(50) : responsiveSize(30) }]}
          >
            <View style={styles.headerContent}>
              <TouchableOpacity 
                onPress={() => navigation.goBack()}
                style={styles.backButton}
                activeOpacity={0.7}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <LinearGradient
                  colors={['#FFD700', '#FFA500']}
                  style={styles.backButtonGradient}
                >
                  <Ionicons name="arrow-back" size={responsiveSize(20)} color="#1a1a1a" />
                </LinearGradient>
              </TouchableOpacity>
              
              <View style={styles.titleSection}>
                <View style={styles.titleIconContainer}>
                  <LinearGradient
                    colors={['#FFD700', '#FFA500']}
                    style={styles.titleIconGradient}
                  >
                    <Ionicons name="musical-notes" size={responsiveSize(22)} color="#1a1a1a" />
                  </LinearGradient>
                </View>
                <View style={styles.titleTextContainer}>
                  <Text style={[styles.headerTitle, { fontSize: responsiveFontSize(18) }]}>Детали концерта</Text>
                  <Text style={[styles.headerSubtitle, { fontSize: responsiveFontSize(12) }]}>{concertTypeRussian}</Text>
                </View>
              </View>

              {/* 🆕 КНОПКА ДЕЙСТВИЙ ДЛЯ АДМИНА - ИСПРАВЛЕННАЯ */}
              {userRole === 'admin' && (
                <TouchableOpacity 
                  onPress={openActionModal}
                  style={styles.actionButtonHeader}
                  activeOpacity={0.7}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <LinearGradient
                    colors={['#FFD700', '#FFA500']}
                    style={styles.actionButtonHeaderGradient}
                  >
                    <Ionicons name="ellipsis-vertical" size={responsiveSize(18)} color="#1a1a1a" />
                  </LinearGradient>
                </TouchableOpacity>
              )}
            </View>
          </LinearGradient>
        </Animated.View>

        <ScrollView 
          style={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {/* 🌙 ОСНОВНАЯ ИНФОРМАЦИЯ */}
          <View style={styles.section}>
            <LinearGradient
              colors={['rgba(26, 26, 26, 0.9)', 'rgba(35, 35, 35, 0.8)']}
              style={styles.infoCard}
            >
              <Text style={[styles.concertDescription, { fontSize: responsiveFontSize(16) }]}>
                {safeConcert.description || 'Описание не указано'}
              </Text>
              
              <View style={styles.infoGrid}>
                <View style={styles.infoItem}>
                  <Ionicons name="calendar" size={responsiveSize(18)} color="#FFD700" />
                  <Text style={[styles.infoLabel, { fontSize: responsiveFontSize(14) }]}>Дата:</Text>
                  <Text style={[styles.infoValue, { fontSize: responsiveFontSize(14) }]}>
                    {formatDate(safeConcert.date)}
                  </Text>
                </View>
                
                {/* КЛИКАБЕЛЬНЫЙ АДРЕС ДЛЯ КАРТ */}
                <TouchableOpacity 
                  style={styles.infoItem}
                  onPress={() => openMaps(safeConcert.address)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="location" size={responsiveSize(18)} color="#FFD700" />
                  <Text style={[styles.infoLabel, { fontSize: responsiveFontSize(14) }]}>Адрес:</Text>
                  <Text style={[styles.infoValue, styles.clickableAddress, { fontSize: responsiveFontSize(14) }]} numberOfLines={1}>
                    {safeConcert.address || 'Адрес не указан'}
                  </Text>
                  <Ionicons name="open-outline" size={responsiveSize(14)} color="#FFD700" />
                </TouchableOpacity>
                
                <View style={styles.timeContainer}>
                  <View style={styles.timeItem}>
                    <Ionicons name="car" size={responsiveSize(16)} color="#FFD700" />
                    <Text style={[styles.timeLabel, { fontSize: responsiveFontSize(12) }]}>Выезд:</Text>
                    <Text style={[styles.timeValue, { fontSize: responsiveFontSize(14) }]}>
                      {safeConcert.departureTime || '--:--'}
                    </Text>
                  </View>
                  
                  <View style={styles.timeItem}>
                    <Ionicons name="time" size={responsiveSize(16)} color="#FFD700" />
                    <Text style={[styles.timeLabel, { fontSize: responsiveFontSize(12) }]}>Начало:</Text>
                    <Text style={[styles.timeValue, { fontSize: responsiveFontSize(14) }]}>
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
                  <Ionicons name="people" size={responsiveSize(28)} color="#FFD700" />
                </View>
                <Text style={[styles.actionCardTitle, { fontSize: responsiveFontSize(14) }]}>Участники</Text>
                <Text style={[styles.actionCardCount, { fontSize: responsiveFontSize(18) }]}>
                  {getTotalParticipantsCount()} чел.
                </Text>
                <Text style={[styles.actionCardSubtitle, { fontSize: responsiveFontSize(10) }]}>Нажмите для просмотра</Text>
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
                  <Ionicons name="musical-notes" size={responsiveSize(28)} color="#9B59B6" />
                </View>
                <Text style={[styles.actionCardTitle, { fontSize: responsiveFontSize(14) }]}>
                  {safeProgram.title || 'Программа'}
                </Text>
                <Text style={[styles.actionCardCount, { fontSize: responsiveFontSize(18) }]}>
                  {safeSongs.length} шт.
                </Text>
                <Text style={[styles.actionCardSubtitle, { fontSize: responsiveFontSize(10) }]}>Нажмите для просмотра</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* 🌙 СТАТИСТИКА */}
          <View style={styles.statsContainer}>
            <View style={styles.statCard}>
              <View style={styles.statIconWrapper}>
                <Ionicons name="people" size={responsiveSize(20)} color="#FFD700" />
              </View>
              <View style={styles.statTextContainer}>
                <Text style={[styles.statValue, { fontSize: responsiveFontSize(16) }]}>{getTotalParticipantsCount()}</Text>
                <Text style={[styles.statLabel, { fontSize: responsiveFontSize(10) }]}>Участников</Text>
              </View>
            </View>

            <View style={styles.statDivider} />

            <View style={styles.statCard}>
              <View style={styles.statIconWrapper}>
                <Ionicons name="musical-notes" size={responsiveSize(20)} color="#9B59B6" />
              </View>
              <View style={styles.statTextContainer}>
                <Text style={[styles.statValue, { fontSize: responsiveFontSize(16) }]}>{safeSongs.length}</Text>
                <Text style={[styles.statLabel, { fontSize: responsiveFontSize(10) }]}>Произведений</Text>
              </View>
            </View>

            <View style={styles.statDivider} />

            <View style={styles.statCard}>
              <View style={styles.statIconWrapper}>
                <Ionicons name="time" size={responsiveSize(20)} color="#4A90E2" />
              </View>
              <View style={styles.statTextContainer}>
                <Text style={[styles.statValue, { fontSize: responsiveFontSize(16) }]}>
                  {safeConcert.duration || 'N/A'}
                </Text>
                <Text style={[styles.statLabel, { fontSize: responsiveFontSize(10) }]}>Продолжительность</Text>
              </View>
            </View>
          </View>
        </ScrollView>

        {/* 🌙 МОДАЛЬНЫЕ ОКНА С ИСПРАВЛЕННЫМ OVERLAY */}
        <Modal
          visible={modalVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={closeModal}
        >
          <View style={styles.modalOverlay}>
            <TouchableOpacity 
              style={styles.modalBackdrop}
              activeOpacity={1}
              onPress={closeModal}
            />
            {selectedModal === 'participants' && renderParticipantsModal()}
            {selectedModal === 'program' && renderProgramModal()}
          </View>
        </Modal>

        <Modal
          visible={actionModalVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={closeActionModal}
        >
          <View style={styles.modalOverlay}>
            <TouchableOpacity 
              style={styles.modalBackdrop}
              activeOpacity={1}
              onPress={closeActionModal}
            />
            {renderActionModal()}
          </View>
        </Modal>

        {/* ✅ CUSTOM ALERT COMPONENT */}
        <CustomAlert
          visible={alertConfig.visible}
          title={alertConfig.title}
          message={alertConfig.message}
          buttons={alertConfig.buttons}
          onClose={closeAlert}
        />
      </LinearGradient>
    </View>
  );
}

// 🌙 ТЕМНЫЕ СТИЛИ С ИСПРАВЛЕНИЯМИ ДЛЯ PWA
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
    fontSize: 18,
    fontWeight: 'bold',
    color: '#E0E0E0',
    marginTop: 10,
    textAlign: 'center',
  },
  backButton: {
    marginTop: 20,
    borderRadius: 15,
    overflow: 'hidden',
  },
  backButtonGradient: {
    paddingHorizontal: 25,
    paddingVertical: 12,
    borderRadius: 15,
  },
  backButtonText: {
    color: '#1a1a1a',
    fontSize: 14,
    fontWeight: '600',
  },
  // 🌙 ХЕДЕР
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
  titleSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  titleIconContainer: {
    marginRight: 12,
  },
  titleIconGradient: {
    width: 44,
    height: 44,
    borderRadius: 14,
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
    fontWeight: '800',
    color: '#E0E0E0',
    letterSpacing: 0.3,
  },
  headerSubtitle: {
    color: '#FFD700',
    fontWeight: '600',
    marginTop: 2,
  },
  actionButtonHeader: {
    borderRadius: 22,
    overflow: 'hidden',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  actionButtonHeaderGradient: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    padding: 15,
  },
  // 🌙 ОСНОВНАЯ ИНФОРМАЦИЯ
  section: {
    marginBottom: 20,
  },
  infoCard: {
    borderRadius: 20,
    padding: 20,
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.2)',
  },
  concertDescription: {
    fontWeight: '600',
    color: '#E0E0E0',
    marginBottom: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
  infoGrid: {
    gap: 12,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(42, 42, 42, 0.6)',
  },
  infoLabel: {
    fontWeight: '600',
    color: '#999',
    marginLeft: 10,
    marginRight: 8,
    width: 60,
  },
  infoValue: {
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
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(42, 42, 42, 0.6)',
  },
  timeItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeLabel: {
    color: '#999',
    marginLeft: 5,
    marginRight: 3,
  },
  timeValue: {
    fontWeight: '600',
    color: '#E0E0E0',
  },
  // 🌙 КАРТОЧКИ ДЕЙСТВИЙ
  actionsGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  actionCard: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  actionCardGradient: {
    padding: 16,
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.2)',
  },
  actionIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  actionCardTitle: {
    fontWeight: '700',
    color: '#E0E0E0',
    textAlign: 'center',
    marginBottom: 4,
  },
  actionCardCount: {
    fontWeight: '800',
    color: '#FFD700',
    textAlign: 'center',
  },
  actionCardSubtitle: {
    color: '#999',
    textAlign: 'center',
    marginTop: 4,
  },
  // 🌙 СТАТИСТИКА
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(26, 26, 26, 0.8)',
    borderRadius: 16,
    padding: 16,
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
    gap: 10,
  },
  statIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statTextContainer: {
    flex: 1,
  },
  statValue: {
    fontWeight: '800',
    color: '#E0E0E0',
    letterSpacing: 0.3,
  },
  statLabel: {
    color: '#999',
    fontWeight: '600',
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: '100%',
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    marginHorizontal: 8,
  },
  // 🌙 МОДАЛЬНЫЕ ОКНА
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
    width: '95%',
    maxWidth: 500,
    maxHeight: '80%',
  },
  modalGradient: {
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
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontWeight: '900',
    color: '#E0E0E0',
    letterSpacing: 0.3,
    flex: 1,
  },
  modalCloseIcon: {
    padding: 5,
  },
  modalList: {
    maxHeight: 400,
  },
  // СТИЛИ ДЛЯ УЧАСТНИКОВ ПО КАТЕГОРИЯМ
  categorySection: {
    marginBottom: 20,
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  categoryTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  categoryTitle: {
    fontWeight: '700',
  },
  categoryCount: {
    color: '#999',
    fontWeight: '600',
  },
  participantsList: {
    gap: 8,
  },
  listItem: {
    borderRadius: 10,
    overflow: 'hidden',
  },
  listItemGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  listText: {
    color: '#E0E0E0',
    marginLeft: 10,
    flex: 1,
    fontWeight: '500',
  },
  participantNumber: {
    color: '#999',
    fontWeight: '600',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  programItem: {
    marginBottom: 10,
    borderRadius: 12,
    overflow: 'hidden',
  },
  programItemGradient: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(155, 89, 182, 0.2)',
  },
  songNumber: {
    color: '#9B59B6',
    fontWeight: 'bold',
    marginRight: 10,
    width: 25,
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
  noData: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  noDataText: {
    color: '#888',
    marginTop: 12,
    textAlign: 'center',
  },
  // 🌙 МОДАЛЬНОЕ ОКНО ДЕЙСТВИЙ
  actionModalContent: {
    width: '85%',
    maxWidth: 350,
  },
  actionModalGradient: {
    borderRadius: 25,
    padding: 20,
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
    marginBottom: 20,
  },
  actionModalTitle: {
    fontWeight: '900',
    color: '#E0E0E0',
    letterSpacing: 0.3,
    flex: 1,
  },
  actionButtonsContainer: {
    gap: 12,
  },
  actionButton: {
    borderRadius: 15,
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
    paddingVertical: 15,
    paddingHorizontal: 20,
  },
  actionButtonText: {
    color: 'white',
    fontWeight: '600',
    marginLeft: 8,
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