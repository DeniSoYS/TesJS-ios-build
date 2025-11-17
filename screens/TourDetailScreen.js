import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { useState } from 'react';
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
    TouchableWithoutFeedback,
    View
} from 'react-native';
import { db } from '../firebaseConfig';

// ✅ АДАПТИВНЫЕ РАЗМЕРЫ (как в CalendarScreen)
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

const formatDate = (dateString) => {
  if (!dateString) return '';
  const [year, month, day] = dateString.split('-');
  const months = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 
                  'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
  return `${parseInt(day)} ${months[parseInt(month) - 1]} ${year}`;
};

export default function TourDetailScreen({ navigation, route }) {
  const { tour, userRole } = route.params;
  const [isLoading, setIsLoading] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [actionModalVisible, setActionModalVisible] = useState(false);
  const [editedTour, setEditedTour] = useState(tour);

  // ✅ ФУНКЦИЯ УДАЛЕНИЯ ГАСТРОЛЕЙ
  const handleDelete = async () => {
    if (userRole !== 'admin') {
      Alert.alert('Ошибка', 'Только администратор может удалять гастроли');
      return;
    }

    Alert.alert(
      'Удаление гастролей',
      'Вы уверены, что хотите удалить эти гастроли?',
      [
        { text: 'Отмена', style: 'cancel' },
        { 
          text: 'Удалить', 
          style: 'destructive',
          onPress: async () => {
            try {
              setIsLoading(true);
              await deleteDoc(doc(db, 'tours', tour.id));
              Alert.alert('Успех', 'Гастроли удалены');
              navigation.goBack();
            } catch (error) {
              console.error('Ошибка удаления:', error);
              Alert.alert('Ошибка', 'Не удалось удалить гастроли');
            } finally {
              setIsLoading(false);
            }
          }
        }
      ]
    );
  };

  // ✅ ФУНКЦИЯ РЕДАКТИРОВАНИЯ ГАСТРОЛЕЙ
  const handleEdit = async () => {
    if (userRole !== 'admin') {
      Alert.alert('Ошибка', 'Только администратор может редактировать гастроли');
      return;
    }

    try {
      setIsLoading(true);
      
      // Проверка обязательных полей
      if (!editedTour.title || !editedTour.startDate || !editedTour.endDate) {
        Alert.alert('Ошибка', 'Заполните обязательные поля: название, дата начала и дата окончания');
        return;
      }

      await updateDoc(doc(db, 'tours', tour.id), {
        title: editedTour.title,
        startDate: editedTour.startDate,
        endDate: editedTour.endDate,
        description: editedTour.description || '',
        updatedAt: new Date()
      });

      Alert.alert('Успех', 'Гастроли обновлены');
      setEditModalVisible(false);
      navigation.setParams({ tour: { ...tour, ...editedTour } });
    } catch (error) {
      console.error('Ошибка редактирования:', error);
      Alert.alert('Ошибка', 'Не удалось обновить гастроли');
    } finally {
      setIsLoading(false);
    }
  };

  // ✅ ОБРАБОТЧИКИ ИЗМЕНЕНИЙ ПОЛЕЙ
  const handleFieldChange = (field, value) => {
    setEditedTour(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // ✅ ОТКРЫТИЕ МОДАЛЬНОГО ОКНА ДЕЙСТВИЙ
  const openActionModal = () => {
    setActionModalVisible(true);
  };

  const closeActionModal = () => {
    setActionModalVisible(false);
  };

  const getTourDuration = () => {
    const start = new Date(tour.startDate);
    const end = new Date(tour.endDate);
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays;
  };

  const getTourDates = () => {
    const start = new Date(tour.startDate);
    const end = new Date(tour.endDate);
    const dates = [];
    
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      dates.push(new Date(d));
    }
    
    return dates;
  };

  // ✅ МОДАЛЬНОЕ ОКНО ДЕЙСТВИЙ
  const renderActionModal = () => (
    <Modal
      visible={actionModalVisible}
      transparent={true}
      animationType="fade"
      onRequestClose={closeActionModal}
    >
      <TouchableWithoutFeedback onPress={closeActionModal}>
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback>
            <View style={styles.actionModalContent}>
              <LinearGradient
                colors={['rgba(26, 26, 26, 0.98)', 'rgba(35, 35, 35, 0.95)']}
                style={styles.actionModalGradient}
              >
                <View style={styles.actionModalHeader}>
                  <Text style={styles.actionModalTitle}>⚡ Действия с гастролями</Text>
                  <TouchableOpacity onPress={closeActionModal} style={styles.modalCloseIcon}>
                    <Ionicons name="close-circle" size={getResponsiveSize(30)} color="#4A90E2" />
                  </TouchableOpacity>
                </View>
                
                <View style={styles.actionButtonsContainer}>
                  <TouchableOpacity 
                    style={styles.actionButton}
                    onPress={() => {
                      closeActionModal();
                      setEditModalVisible(true);
                    }}
                  >
                    <LinearGradient
                      colors={['#4A90E2', '#357ABD']}
                      style={styles.actionButtonGradient}
                    >
                      <Ionicons name="create" size={getResponsiveSize(20)} color="white" />
                      <Text style={styles.actionButtonText}>Редактировать</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={styles.actionButton}
                    onPress={() => {
                      closeActionModal();
                      handleDelete();
                    }}
                  >
                    <LinearGradient
                      colors={['#FF6B6B', '#EE5A52']}
                      style={styles.actionButtonGradient}
                    >
                      <Ionicons name="trash" size={getResponsiveSize(20)} color="white" />
                      <Text style={styles.actionButtonText}>Удалить</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </LinearGradient>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );

  // ✅ МОДАЛЬНОЕ ОКНО РЕДАКТИРОВАНИЯ
  const renderEditModal = () => (
    <Modal
      visible={editModalVisible}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setEditModalVisible(false)}
    >
      <TouchableWithoutFeedback onPress={() => setEditModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback>
            <KeyboardAvoidingView 
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              style={styles.editModalContent}
            >
              <LinearGradient
                colors={['rgba(26, 26, 26, 0.98)', 'rgba(35, 35, 35, 0.95)']}
                style={styles.editModalGradient}
              >
                {/* ЗАГОЛОВОК МОДАЛКИ */}
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>✏️ Редактировать гастроли</Text>
                  <TouchableOpacity 
                    onPress={() => setEditModalVisible(false)}
                    style={styles.modalCloseButton}
                  >
                    <Ionicons name="close-circle" size={getResponsiveSize(28)} color="#FF6B6B" />
                  </TouchableOpacity>
                </View>

                <ScrollView style={styles.editForm} showsVerticalScrollIndicator={false}>
                  {/* ОСНОВНАЯ ИНФОРМАЦИЯ */}
                  <View style={styles.formSection}>
                    <Text style={styles.formSectionTitle}>Основная информация</Text>
                    
                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Название гастролей *</Text>
                      <TextInput
                        style={styles.textInput}
                        value={editedTour.title}
                        onChangeText={(text) => handleFieldChange('title', text)}
                        placeholder="Название гастрольного тура"
                        placeholderTextColor="#666"
                      />
                    </View>

                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Дата начала *</Text>
                      <TextInput
                        style={styles.textInput}
                        value={editedTour.startDate}
                        onChangeText={(text) => handleFieldChange('startDate', text)}
                        placeholder="ГГГГ-ММ-ДД"
                        placeholderTextColor="#666"
                      />
                    </View>

                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Дата окончания *</Text>
                      <TextInput
                        style={styles.textInput}
                        value={editedTour.endDate}
                        onChangeText={(text) => handleFieldChange('endDate', text)}
                        placeholder="ГГГГ-ММ-ДД"
                        placeholderTextColor="#666"
                      />
                    </View>
                  </View>

                  {/* ОПИСАНИЕ */}
                  <View style={styles.formSection}>
                    <Text style={styles.formSectionTitle}>Описание</Text>
                    
                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Описание гастролей</Text>
                      <TextInput
                        style={[styles.textInput, styles.textArea]}
                        value={editedTour.description || ''}
                        onChangeText={(text) => handleFieldChange('description', text)}
                        placeholder="Описание гастрольного тура..."
                        placeholderTextColor="#666"
                        multiline
                        numberOfLines={6}
                        textAlignVertical="top"
                      />
                    </View>
                  </View>
                </ScrollView>

                {/* КНОПКИ ДЕЙСТВИЙ */}
                <View style={styles.modalActions}>
                  <TouchableOpacity 
                    style={[styles.modalButton, styles.cancelButton]}
                    onPress={() => setEditModalVisible(false)}
                    disabled={isLoading}
                  >
                    <Text style={styles.cancelButtonText}>Отмена</Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={[styles.modalButton, styles.saveButton]}
                    onPress={handleEdit}
                    disabled={isLoading}
                  >
                    <LinearGradient
                      colors={['#4A90E2', '#357ABD']}
                      style={styles.saveButtonGradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    >
                      {isLoading ? (
                        <Text style={styles.saveButtonText}>Сохранение...</Text>
                      ) : (
                        <Text style={styles.saveButtonText}>Сохранить</Text>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </LinearGradient>
            </KeyboardAvoidingView>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#0a0a0a', '#1a1a1a', '#2a2a2a']}
        style={styles.background}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        {/* 🌙 ХЕДЕР В СТИЛЕ CALENDARSCREEN */}
        <LinearGradient
          colors={['rgba(26, 26, 26, 0.98)', 'rgba(35, 35, 35, 0.95)']}
          style={styles.header}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.headerBackground}>
            <View style={[styles.decorCircle, styles.decorCircle1]} />
            <View style={[styles.decorCircle, styles.decorCircle2]} />
            <View style={[styles.decorCircle, styles.decorCircle3]} />
          </View>

          <View style={styles.headerContent}>
            <TouchableOpacity 
              onPress={() => navigation.goBack()}
              style={styles.backButton}
            >
              <Ionicons name="arrow-back" size={getResponsiveSize(24)} color="#4A90E2" />
            </TouchableOpacity>
            
            <View style={styles.titleSection}>
              <View style={styles.titleIconContainer}>
                <LinearGradient
                  colors={['#4A90E2', '#357ABD']}
                  style={styles.titleIconGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Ionicons name="airplane" size={getResponsiveSize(22)} color="#1a1a1a" />
                </LinearGradient>
              </View>
              <View style={styles.titleTextContainer}>
                <Text style={styles.mainTitle}>Детали гастролей</Text>
                <Text style={styles.subtitle}>Информация о гастрольном туре</Text>
              </View>
            </View>

            {/* 🆕 КНОПКА С ТРЕМЯ ТОЧКАМИ ВМЕСТО УДАЛЕНИЯ */}
            {userRole === 'admin' && (
              <TouchableOpacity 
                onPress={openActionModal}
                style={styles.actionButtonHeader}
              >
                <LinearGradient
                  colors={['#4A90E2', '#357ABD']}
                  style={styles.actionButtonHeaderGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Ionicons name="ellipsis-vertical" size={getResponsiveSize(18)} color="#1a1a1a" />
                </LinearGradient>
              </TouchableOpacity>
            )}
          </View>
        </LinearGradient>

        <ScrollView style={styles.contentContainer} showsVerticalScrollIndicator={false}>
          {/* Основная информация */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Основная информация</Text>
            <LinearGradient
              colors={['rgba(42, 42, 42, 0.8)', 'rgba(35, 35, 35, 0.9)']}
              style={styles.infoCard}
            >
              <View style={styles.infoRow}>
                <View style={styles.infoIconWrapper}>
                  <Ionicons name="airplane" size={getResponsiveSize(20)} color="#4A90E2" />
                </View>
                <View style={styles.infoTextContainer}>
                  <Text style={styles.infoLabel}>Название</Text>
                  <Text style={styles.infoValue}>{tour.title}</Text>
                </View>
              </View>
              
              <View style={styles.infoRow}>
                <View style={styles.infoIconWrapper}>
                  <Ionicons name="calendar" size={getResponsiveSize(20)} color="#4A90E2" />
                </View>
                <View style={styles.infoTextContainer}>
                  <Text style={styles.infoLabel}>Период</Text>
                  <Text style={styles.infoValue}>
                    {formatDate(tour.startDate)} - {formatDate(tour.endDate)}
                  </Text>
                </View>
              </View>
              
              <View style={styles.infoRow}>
                <View style={styles.infoIconWrapper}>
                  <Ionicons name="time" size={getResponsiveSize(20)} color="#4A90E2" />
                </View>
                <View style={styles.infoTextContainer}>
                  <Text style={styles.infoLabel}>Продолжительность</Text>
                  <Text style={styles.infoValue}>{getTourDuration()} дней</Text>
                </View>
              </View>
            </LinearGradient>
          </View>

          {/* Описание */}
          {tour.description && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Описание</Text>
              <LinearGradient
                colors={['rgba(42, 42, 42, 0.8)', 'rgba(35, 35, 35, 0.9)']}
                style={styles.descriptionCard}
              >
                <View style={styles.descriptionHeader}>
                  <Ionicons name="document-text" size={getResponsiveSize(18)} color="#4A90E2" />
                  <Text style={styles.descriptionLabel}>Описание гастролей</Text>
                </View>
                <Text style={styles.descriptionText}>{tour.description}</Text>
              </LinearGradient>
            </View>
          )}

          {/* Даты гастролей */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Даты гастролей</Text>
            <LinearGradient
              colors={['rgba(42, 42, 42, 0.8)', 'rgba(35, 35, 35, 0.9)']}
              style={styles.datesCard}
            >
              <View style={styles.datesHeader}>
                <Ionicons name="list" size={getResponsiveSize(18)} color="#4A90E2" />
                <Text style={styles.datesLabel}>Все даты тура ({getTourDates().length} дней)</Text>
              </View>
              {getTourDates().map((date, index) => (
                <View key={index} style={styles.dateItem}>
                  <View style={styles.dateBullet}>
                    <Ionicons name="ellipse" size={getResponsiveSize(8)} color="#4A90E2" />
                  </View>
                  <Text style={styles.dateText}>
                    {date.toLocaleDateString('ru-RU', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    })}
                  </Text>
                </View>
              ))}
            </LinearGradient>
          </View>

          {/* Дополнительная информация */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Дополнительная информация</Text>
            <LinearGradient
              colors={['rgba(42, 42, 42, 0.6)', 'rgba(35, 35, 35, 0.7)']}
              style={styles.additionalInfoCard}
            >
              <View style={styles.additionalInfoRow}>
                <Ionicons name="create" size={getResponsiveSize(16)} color="#888" />
                <Text style={styles.additionalInfoText}>
                  Создано: {tour.createdAt ? new Date(tour.createdAt.seconds * 1000).toLocaleDateString('ru-RU') : 'Неизвестно'}
                </Text>
              </View>
              {tour.updatedAt && (
                <View style={styles.additionalInfoRow}>
                  <Ionicons name="refresh" size={getResponsiveSize(16)} color="#888" />
                  <Text style={styles.additionalInfoText}>
                    Обновлено: {new Date(tour.updatedAt.seconds * 1000).toLocaleDateString('ru-RU')}
                  </Text>
                </View>
              )}
            </LinearGradient>
          </View>
        </ScrollView>

        {/* МОДАЛЬНОЕ ОКНО ДЕЙСТВИЙ */}
        {renderActionModal()}

        {/* МОДАЛЬНОЕ ОКНО РЕДАКТИРОВАНИЯ */}
        {renderEditModal()}
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
  
  // 🌙 ХЕДЕР В СТИЛЕ CALENDARSCREEN
  header: {
    paddingHorizontal: getResponsiveSize(20),
    paddingTop: Platform.OS === 'ios' ? getResponsiveSize(50) : getResponsiveSize(30),
    paddingBottom: getResponsiveSize(24),
    borderBottomLeftRadius: getResponsiveSize(30),
    borderBottomRightRadius: getResponsiveSize(30),
    shadowColor: '#4A90E2',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
    position: 'relative',
    overflow: 'hidden',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(74, 144, 226, 0.3)',
  },
  
  headerBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  decorCircle: {
    position: 'absolute',
    borderRadius: 1000,
    opacity: 0.05,
  },
  decorCircle1: {
    width: getResponsiveSize(200),
    height: getResponsiveSize(200),
    backgroundColor: '#4A90E2',
    top: -getResponsiveSize(80),
    right: -getResponsiveSize(50),
  },
  decorCircle2: {
    width: getResponsiveSize(150),
    height: getResponsiveSize(150),
    backgroundColor: '#357ABD',
    bottom: -getResponsiveSize(60),
    left: -getResponsiveSize(40),
  },
  decorCircle3: {
    width: getResponsiveSize(100),
    height: getResponsiveSize(100),
    backgroundColor: '#2E5A87',
    top: getResponsiveSize(40),
    left: getResponsiveSize(30),
  },
  
  headerContent: {
    position: 'relative',
    zIndex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  
  backButton: {
    padding: getResponsiveSize(5),
  },
  
  titleSection: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(42, 42, 42, 0.6)',
    paddingHorizontal: getResponsiveSize(16),
    paddingVertical: getResponsiveSize(14),
    borderRadius: getResponsiveSize(16),
    borderWidth: 1,
    borderColor: 'rgba(74, 144, 226, 0.2)',
    marginHorizontal: getResponsiveSize(10),
  },
  
  titleIconContainer: {
    marginRight: getResponsiveSize(14),
  },
  titleIconGradient: {
    width: getResponsiveSize(48),
    height: getResponsiveSize(48),
    borderRadius: getResponsiveSize(14),
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#4A90E2',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 5,
  },
  
  titleTextContainer: {
    flex: 1,
  },
  mainTitle: {
    fontSize: getResponsiveFontSize(18),
    fontWeight: '800',
    color: '#E0E0E0',
    letterSpacing: 0.3,
    marginBottom: getResponsiveSize(2),
  },
  subtitle: {
    fontSize: getResponsiveFontSize(12),
    color: '#999',
    fontWeight: '500',
  },
  
  // 🆕 КНОПКА С ТРЕМЯ ТОЧКАМИ
  actionButtonHeader: {
    borderRadius: getResponsiveSize(12),
    overflow: 'hidden',
    shadowColor: '#4A90E2',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  
  actionButtonHeaderGradient: {
    width: getResponsiveSize(44),
    height: getResponsiveSize(44),
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: getResponsiveSize(12),
  },
  
  contentContainer: {
    flex: 1,
    padding: getResponsiveSize(20),
  },
  
  section: {
    marginBottom: getResponsiveSize(25),
  },
  
  sectionTitle: {
    fontSize: getResponsiveFontSize(16),
    fontWeight: '700',
    color: '#E0E0E0',
    marginBottom: getResponsiveSize(12),
    marginLeft: getResponsiveSize(5),
  },
  
  infoCard: {
    borderRadius: getResponsiveSize(16),
    padding: getResponsiveSize(20),
    borderWidth: 1,
    borderColor: 'rgba(74, 144, 226, 0.2)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: getResponsiveSize(16),
  },
  
  infoIconWrapper: {
    width: getResponsiveSize(36),
    height: getResponsiveSize(36),
    borderRadius: getResponsiveSize(10),
    backgroundColor: 'rgba(74, 144, 226, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: getResponsiveSize(12),
  },
  
  infoTextContainer: {
    flex: 1,
  },
  
  infoLabel: {
    fontSize: getResponsiveFontSize(12),
    color: '#999',
    fontWeight: '600',
    marginBottom: getResponsiveSize(4),
  },
  
  infoValue: {
    fontSize: getResponsiveFontSize(14),
    color: '#E0E0E0',
    fontWeight: '500',
    lineHeight: getResponsiveFontSize(20),
  },
  
  descriptionCard: {
    borderRadius: getResponsiveSize(16),
    padding: getResponsiveSize(20),
    borderWidth: 1,
    borderColor: 'rgba(74, 144, 226, 0.2)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  
  descriptionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: getResponsiveSize(12),
  },
  
  descriptionLabel: {
    fontSize: getResponsiveFontSize(14),
    color: '#4A90E2',
    fontWeight: '600',
    marginLeft: getResponsiveSize(8),
  },
  
  descriptionText: {
    fontSize: getResponsiveFontSize(14),
    color: '#E0E0E0',
    lineHeight: getResponsiveFontSize(20),
  },
  
  datesCard: {
    borderRadius: getResponsiveSize(16),
    padding: getResponsiveSize(20),
    borderWidth: 1,
    borderColor: 'rgba(74, 144, 226, 0.2)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  
  datesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: getResponsiveSize(16),
  },
  
  datesLabel: {
    fontSize: getResponsiveFontSize(14),
    color: '#4A90E2',
    fontWeight: '600',
    marginLeft: getResponsiveSize(8),
  },
  
  dateItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: getResponsiveSize(10),
    paddingVertical: getResponsiveSize(4),
  },
  
  dateBullet: {
    width: getResponsiveSize(20),
    alignItems: 'center',
  },
  
  dateText: {
    fontSize: getResponsiveFontSize(14),
    color: '#E0E0E0',
    fontWeight: '500',
    flex: 1,
  },
  
  additionalInfoCard: {
    borderRadius: getResponsiveSize(12),
    padding: getResponsiveSize(16),
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  
  additionalInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: getResponsiveSize(8),
  },
  
  additionalInfoText: {
    fontSize: getResponsiveFontSize(12),
    color: '#888',
    marginLeft: getResponsiveSize(8),
  },

  // 🌙 СТИЛИ ДЛЯ МОДАЛЬНЫХ ОКОН
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: getResponsiveSize(20),
  },

  // 🆕 МОДАЛЬНОЕ ОКНО ДЕЙСТВИЙ
  actionModalContent: {
    width: '80%',
    maxWidth: getResponsiveSize(350),
  },

  actionModalGradient: {
    borderRadius: getResponsiveSize(25),
    padding: getResponsiveSize(20),
    shadowColor: '#4A90E2',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(74, 144, 226, 0.3)',
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

  modalCloseIcon: {
    padding: getResponsiveSize(6),
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

  // 🌙 СТИЛИ ДЛЯ МОДАЛЬНОГО ОКНА РЕДАКТИРОВАНИЯ
  editModalContent: {
    width: '100%',
    maxHeight: '90%',
    borderRadius: getResponsiveSize(20),
    overflow: 'hidden',
  },

  editModalGradient: {
    padding: getResponsiveSize(20),
  },

  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: getResponsiveSize(20),
  },

  modalTitle: {
    fontSize: getResponsiveFontSize(18),
    fontWeight: 'bold',
    color: '#E0E0E0',
    flex: 1,
  },

  modalCloseButton: {
    padding: getResponsiveSize(5),
  },

  editForm: {
    maxHeight: getResponsiveSize(500),
  },

  formSection: {
    marginBottom: getResponsiveSize(20),
  },

  formSectionTitle: {
    fontSize: getResponsiveFontSize(16),
    fontWeight: '600',
    color: '#4A90E2',
    marginBottom: getResponsiveSize(12),
  },

  inputGroup: {
    marginBottom: getResponsiveSize(15),
  },

  inputLabel: {
    fontSize: getResponsiveFontSize(14),
    fontWeight: '500',
    color: '#E0E0E0',
    marginBottom: getResponsiveSize(6),
  },

  textInput: {
    backgroundColor: 'rgba(42, 42, 42, 0.8)',
    borderWidth: 1,
    borderColor: 'rgba(74, 144, 226, 0.3)',
    borderRadius: getResponsiveSize(10),
    padding: getResponsiveSize(12),
    color: '#E0E0E0',
    fontSize: getResponsiveFontSize(14),
  },

  textArea: {
    minHeight: getResponsiveSize(120),
    textAlignVertical: 'top',
  },

  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: getResponsiveSize(20),
    gap: getResponsiveSize(10),
  },

  modalButton: {
    flex: 1,
    borderRadius: getResponsiveSize(12),
    overflow: 'hidden',
  },

  cancelButton: {
    backgroundColor: 'rgba(42, 42, 42, 0.8)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    padding: getResponsiveSize(15),
    alignItems: 'center',
  },

  saveButton: {
    shadowColor: '#4A90E2',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },

  saveButtonGradient: {
    padding: getResponsiveSize(15),
    alignItems: 'center',
    borderRadius: getResponsiveSize(12),
  },

  cancelButtonText: {
    color: '#E0E0E0',
    fontSize: getResponsiveFontSize(14),
    fontWeight: '600',
  },

  saveButtonText: {
    color: '#1a1a1a',
    fontSize: getResponsiveFontSize(14),
    fontWeight: '600',
  },
});