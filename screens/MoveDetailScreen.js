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

// ✅ АДАПТИВНЫЕ РАЗМЕРЫ
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

export default function MoveDetailScreen({ navigation, route }) {
  const { move, userRole } = route.params;
  const [isLoading, setIsLoading] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [actionModalVisible, setActionModalVisible] = useState(false);
  const [editedMove, setEditedMove] = useState(move);

  // ✅ ФУНКЦИЯ УДАЛЕНИЯ ПЕРЕЕЗДА
  const handleDelete = async () => {
    if (userRole !== 'admin') {
      Alert.alert('Ошибка', 'Только администратор может удалять переезды');
      return;
    }

    Alert.alert(
      'Удаление переезда',
      'Вы уверены, что хотите удалить этот переезд?',
      [
        { text: 'Отмена', style: 'cancel' },
        { 
          text: 'Удалить', 
          style: 'destructive',
          onPress: async () => {
            try {
              setIsLoading(true);
              await deleteDoc(doc(db, 'moves', move.id));
              Alert.alert('Успех', 'Переезд удален');
              navigation.goBack();
            } catch (error) {
              console.error('Ошибка удаления:', error);
              Alert.alert('Ошибка', 'Не удалось удалить переезд');
            } finally {
              setIsLoading(false);
            }
          }
        }
      ]
    );
  };

  // ✅ ФУНКЦИЯ РЕДАКТИРОВАНИЯ ПЕРЕЕЗДА
  const handleEdit = async () => {
    if (userRole !== 'admin') {
      Alert.alert('Ошибка', 'Только администратор может редактировать переезды');
      return;
    }

    try {
      setIsLoading(true);
      
      // Проверка обязательных полей
      if (!editedMove.fromCity || !editedMove.toCity || !editedMove.date) {
        Alert.alert('Ошибка', 'Заполните обязательные поля: город отправления, город прибытия и дата');
        return;
      }

      await updateDoc(doc(db, 'moves', move.id), {
        fromCity: editedMove.fromCity,
        toCity: editedMove.toCity,
        date: editedMove.date,
        hotel: editedMove.hotel || '',
        passportRequired: editedMove.passportRequired || false,
        meals: editedMove.meals || {},
        whatToTake: editedMove.whatToTake || '',
        arrivalInfo: editedMove.arrivalInfo || '',
        updatedAt: new Date()
      });

      Alert.alert('Успех', 'Переезд обновлен');
      setEditModalVisible(false);
      navigation.setParams({ move: { ...move, ...editedMove } });
    } catch (error) {
      console.error('Ошибка редактирования:', error);
      Alert.alert('Ошибка', 'Не удалось обновить переезд');
    } finally {
      setIsLoading(false);
    }
  };

  // ✅ ОБРАБОТЧИКИ ИЗМЕНЕНИЙ ПОЛЕЙ
  const handleFieldChange = (field, value) => {
    setEditedMove(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleMealsChange = (mealType, value) => {
    setEditedMove(prev => ({
      ...prev,
      meals: {
        ...prev.meals,
        [mealType]: value
      }
    }));
  };

  // ✅ ОТКРЫТИЕ МОДАЛЬНОГО ОКНА ДЕЙСТВИЙ
  const openActionModal = () => {
    setActionModalVisible(true);
  };

  const closeActionModal = () => {
    setActionModalVisible(false);
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
                    <Ionicons name="close-circle" size={getResponsiveSize(30)} color="#34C759" />
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
                  <Text style={styles.modalTitle}>✏️ Редактировать переезд</Text>
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
                      <Text style={styles.inputLabel}>Город отправления *</Text>
                      <TextInput
                        style={styles.textInput}
                        value={editedMove.fromCity}
                        onChangeText={(text) => handleFieldChange('fromCity', text)}
                        placeholder="Откуда"
                        placeholderTextColor="#666"
                      />
                    </View>

                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Город прибытия *</Text>
                      <TextInput
                        style={styles.textInput}
                        value={editedMove.toCity}
                        onChangeText={(text) => handleFieldChange('toCity', text)}
                        placeholder="Куда"
                        placeholderTextColor="#666"
                      />
                    </View>

                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Дата переезда *</Text>
                      <TextInput
                        style={styles.textInput}
                        value={editedMove.date}
                        onChangeText={(text) => handleFieldChange('date', text)}
                        placeholder="ГГГГ-ММ-ДД"
                        placeholderTextColor="#666"
                      />
                    </View>

                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Отель</Text>
                      <TextInput
                        style={styles.textInput}
                        value={editedMove.hotel || ''}
                        onChangeText={(text) => handleFieldChange('hotel', text)}
                        placeholder="Название отеля"
                        placeholderTextColor="#666"
                      />
                    </View>
                  </View>

                  {/* ПИТАНИЕ */}
                  <View style={styles.formSection}>
                    <Text style={styles.formSectionTitle}>Питание</Text>
                    
                    <View style={styles.checkboxGroup}>
                      <TouchableOpacity 
                        style={styles.checkboxRow}
                        onPress={() => handleMealsChange('breakfast', !editedMove.meals?.breakfast)}
                      >
                        <View style={[
                          styles.checkbox,
                          editedMove.meals?.breakfast && styles.checkboxChecked
                        ]}>
                          {editedMove.meals?.breakfast && (
                            <Ionicons name="checkmark" size={getResponsiveSize(16)} color="#34C759" />
                          )}
                        </View>
                        <Text style={styles.checkboxLabel}>Завтрак</Text>
                      </TouchableOpacity>

                      <TouchableOpacity 
                        style={styles.checkboxRow}
                        onPress={() => handleMealsChange('lunch', !editedMove.meals?.lunch)}
                      >
                        <View style={[
                          styles.checkbox,
                          editedMove.meals?.lunch && styles.checkboxChecked
                        ]}>
                          {editedMove.meals?.lunch && (
                            <Ionicons name="checkmark" size={getResponsiveSize(16)} color="#34C759" />
                          )}
                        </View>
                        <Text style={styles.checkboxLabel}>Обед</Text>
                      </TouchableOpacity>

                      <TouchableOpacity 
                        style={styles.checkboxRow}
                        onPress={() => handleMealsChange('dinner', !editedMove.meals?.dinner)}
                      >
                        <View style={[
                          styles.checkbox,
                          editedMove.meals?.dinner && styles.checkboxChecked
                        ]}>
                          {editedMove.meals?.dinner && (
                            <Ionicons name="checkmark" size={getResponsiveSize(16)} color="#34C759" />
                          )}
                        </View>
                        <Text style={styles.checkboxLabel}>Ужин</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* ДОКУМЕНТЫ */}
                  <View style={styles.formSection}>
                    <TouchableOpacity 
                      style={styles.checkboxRow}
                      onPress={() => handleFieldChange('passportRequired', !editedMove.passportRequired)}
                    >
                      <View style={[
                        styles.checkbox,
                        editedMove.passportRequired && styles.checkboxChecked
                      ]}>
                        {editedMove.passportRequired && (
                          <Ionicons name="checkmark" size={getResponsiveSize(16)} color="#34C759" />
                        )}
                      </View>
                      <Text style={styles.checkboxLabel}>Требуется паспорт</Text>
                    </TouchableOpacity>
                  </View>

                  {/* ДОПОЛНИТЕЛЬНАЯ ИНФОРМАЦИЯ */}
                  <View style={styles.formSection}>
                    <Text style={styles.formSectionTitle}>Дополнительная информация</Text>
                    
                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Что взять с собой</Text>
                      <TextInput
                        style={[styles.textInput, styles.textArea]}
                        value={editedMove.whatToTake || ''}
                        onChangeText={(text) => handleFieldChange('whatToTake', text)}
                        placeholder="Рекомендации по сборам..."
                        placeholderTextColor="#666"
                        multiline
                        numberOfLines={4}
                        textAlignVertical="top"
                      />
                    </View>

                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Информация о прибытии</Text>
                      <TextInput
                        style={[styles.textInput, styles.textArea]}
                        value={editedMove.arrivalInfo || ''}
                        onChangeText={(text) => handleFieldChange('arrivalInfo', text)}
                        placeholder="Важная информация о прибытии..."
                        placeholderTextColor="#666"
                        multiline
                        numberOfLines={4}
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
                      colors={['#34C759', '#28A745']}
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
              <Ionicons name="arrow-back" size={getResponsiveSize(24)} color="#34C759" />
            </TouchableOpacity>
            
            <View style={styles.titleSection}>
              <View style={styles.titleIconContainer}>
                <LinearGradient
                  colors={['#34C759', '#28A745']}
                  style={styles.titleIconGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Ionicons name="bus" size={getResponsiveSize(22)} color="#1a1a1a" />
                </LinearGradient>
              </View>
              <View style={styles.titleTextContainer}>
                <Text style={styles.mainTitle}>Детали переезда</Text>
                <Text style={styles.subtitle}>Информация о маршруте</Text>
              </View>
            </View>

            {/* 🆕 КНОПКА С ТРЕМЯ ТОЧКАМИ ВМЕСТО УДАЛЕНИЯ */}
            {userRole === 'admin' && (
              <TouchableOpacity 
                onPress={openActionModal}
                style={styles.actionButtonHeader}
              >
                <LinearGradient
                  colors={['#34C759', '#28A745']}
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
          {/* Маршрут */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Маршрут</Text>
            <LinearGradient
              colors={['rgba(42, 42, 42, 0.8)', 'rgba(35, 35, 35, 0.9)']}
              style={styles.infoCard}
            >
              <View style={styles.routeContainer}>
                <View style={styles.routePoint}>
                  <LinearGradient
                    colors={['#34C759', '#28A745']}
                    style={styles.routeIconContainer}
                  >
                    <Ionicons name="location" size={getResponsiveSize(18)} color="#1a1a1a" />
                  </LinearGradient>
                  <Text style={styles.routeText}>Откуда: {move.fromCity}</Text>
                </View>
                <View style={styles.routeArrow}>
                  <Ionicons name="arrow-down" size={getResponsiveSize(20)} color="#34C759" />
                </View>
                <View style={styles.routePoint}>
                  <LinearGradient
                    colors={['#FF6B6B', '#EE5A52']}
                    style={styles.routeIconContainer}
                  >
                    <Ionicons name="location" size={getResponsiveSize(18)} color="#1a1a1a" />
                  </LinearGradient>
                  <Text style={styles.routeText}>Куда: {move.toCity}</Text>
                </View>
              </View>
              
              <View style={styles.infoRow}>
                <Ionicons name="calendar" size={getResponsiveSize(20)} color="#34C759" />
                <Text style={styles.infoLabel}>Дата:</Text>
                <Text style={styles.infoValue}>{formatDate(move.date)}</Text>
              </View>
            </LinearGradient>
          </View>

          {/* Проживание */}
          {move.hotel && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Проживание</Text>
              <LinearGradient
                colors={['rgba(42, 42, 42, 0.8)', 'rgba(35, 35, 35, 0.9)']}
                style={styles.infoCard}
              >
                <View style={styles.infoRow}>
                  <Ionicons name="business" size={getResponsiveSize(20)} color="#34C759" />
                  <Text style={styles.infoLabel}>Отель:</Text>
                  <Text style={styles.infoValue}>{move.hotel}</Text>
                </View>
              </LinearGradient>
            </View>
          )}

          {/* Документы и питание */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Информация</Text>
            <LinearGradient
              colors={['rgba(42, 42, 42, 0.8)', 'rgba(35, 35, 35, 0.9)']}
              style={styles.infoCard}
            >
              {move.passportRequired && (
                <View style={styles.infoRow}>
                  <Ionicons name="document" size={getResponsiveSize(20)} color="#34C759" />
                  <Text style={styles.infoLabel}>Документы:</Text>
                  <Text style={styles.infoValue}>Нужен паспорт</Text>
                </View>
              )}
              
              {move.meals && (
                <View style={styles.infoRow}>
                  <Ionicons name="restaurant" size={getResponsiveSize(20)} color="#34C759" />
                  <Text style={styles.infoLabel}>Питание:</Text>
                  <Text style={styles.infoValue}>
                    {[
                      move.meals.breakfast && 'завтрак',
                      move.meals.lunch && 'обед', 
                      move.meals.dinner && 'ужин',
                      move.meals.noFood && 'не кормят'
                    ].filter(Boolean).join(', ')}
                  </Text>
                </View>
              )}
            </LinearGradient>
          </View>

          {/* Что взять с собой */}
          {move.whatToTake && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Что взять с собой</Text>
              <LinearGradient
                colors={['rgba(42, 42, 42, 0.8)', 'rgba(35, 35, 35, 0.9)']}
                style={styles.descriptionCard}
              >
                <View style={styles.descriptionHeader}>
                  <Ionicons name="bag" size={getResponsiveSize(18)} color="#34C759" />
                  <Text style={styles.descriptionTitle}>Рекомендации:</Text>
                </View>
                <Text style={styles.descriptionText}>{move.whatToTake}</Text>
              </LinearGradient>
            </View>
          )}

          {/* Информация о прибытии */}
          {move.arrivalInfo && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Информация о прибытии</Text>
              <LinearGradient
                colors={['rgba(42, 42, 42, 0.8)', 'rgba(35, 35, 35, 0.9)']}
                style={styles.descriptionCard}
              >
                <View style={styles.descriptionHeader}>
                  <Ionicons name="information-circle" size={getResponsiveSize(18)} color="#34C759" />
                  <Text style={styles.descriptionTitle}>Важная информация:</Text>
                </View>
                <Text style={styles.descriptionText}>{move.arrivalInfo}</Text>
              </LinearGradient>
            </View>
          )}

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
                  Создано: {move.createdAt ? new Date(move.createdAt.seconds * 1000).toLocaleDateString('ru-RU') : 'Неизвестно'}
                </Text>
              </View>
              {move.updatedAt && (
                <View style={styles.additionalInfoRow}>
                  <Ionicons name="refresh" size={getResponsiveSize(16)} color="#888" />
                  <Text style={styles.additionalInfoText}>
                    Обновлено: {new Date(move.updatedAt.seconds * 1000).toLocaleDateString('ru-RU')}
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
    shadowColor: '#34C759',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
    position: 'relative',
    overflow: 'hidden',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(52, 199, 89, 0.3)',
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
    backgroundColor: '#34C759',
    top: -getResponsiveSize(80),
    right: -getResponsiveSize(50),
  },
  decorCircle2: {
    width: getResponsiveSize(150),
    height: getResponsiveSize(150),
    backgroundColor: '#28A745',
    bottom: -getResponsiveSize(60),
    left: -getResponsiveSize(40),
  },
  decorCircle3: {
    width: getResponsiveSize(100),
    height: getResponsiveSize(100),
    backgroundColor: '#20B2AA',
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
    borderColor: 'rgba(52, 199, 89, 0.2)',
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
    shadowColor: '#34C759',
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
    shadowColor: '#34C759',
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
    fontWeight: 'bold',
    color: '#E0E0E0',
    marginBottom: getResponsiveSize(12),
    paddingLeft: getResponsiveSize(5),
  },
  
  infoCard: {
    borderRadius: getResponsiveSize(16),
    padding: getResponsiveSize(18),
    borderWidth: 1,
    borderColor: 'rgba(52, 199, 89, 0.2)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  
  routeContainer: {
    marginBottom: getResponsiveSize(16),
  },
  
  routePoint: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: getResponsiveSize(10),
  },
  
  routeIconContainer: {
    width: getResponsiveSize(36),
    height: getResponsiveSize(36),
    borderRadius: getResponsiveSize(18),
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: getResponsiveSize(12),
  },
  
  routeArrow: {
    alignItems: 'center',
    marginLeft: getResponsiveSize(12),
    marginBottom: getResponsiveSize(10),
  },
  
  routeText: {
    fontSize: getResponsiveFontSize(14),
    color: '#E0E0E0',
    fontWeight: '500',
    flex: 1,
  },
  
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: getResponsiveSize(12),
  },
  
  infoLabel: {
    fontSize: getResponsiveFontSize(14),
    fontWeight: '600',
    color: '#E0E0E0',
    marginLeft: getResponsiveSize(10),
    marginRight: getResponsiveSize(8),
    width: getResponsiveSize(100),
  },
  
  infoValue: {
    fontSize: getResponsiveFontSize(14),
    color: '#E0E0E0',
    flex: 1,
    fontWeight: '500',
  },
  
  descriptionCard: {
    borderRadius: getResponsiveSize(16),
    padding: getResponsiveSize(18),
    borderWidth: 1,
    borderColor: 'rgba(52, 199, 89, 0.2)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  
  descriptionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: getResponsiveSize(10),
  },
  
  descriptionTitle: {
    fontSize: getResponsiveFontSize(14),
    fontWeight: '600',
    color: '#34C759',
    marginLeft: getResponsiveSize(8),
  },
  
  descriptionText: {
    fontSize: getResponsiveFontSize(14),
    color: '#E0E0E0',
    lineHeight: getResponsiveFontSize(20),
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
    shadowColor: '#34C759',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(52, 199, 89, 0.3)',
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
    color: '#34C759',
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
    borderColor: 'rgba(52, 199, 89, 0.3)',
    borderRadius: getResponsiveSize(10),
    padding: getResponsiveSize(12),
    color: '#E0E0E0',
    fontSize: getResponsiveFontSize(14),
  },

  textArea: {
    minHeight: getResponsiveSize(80),
    textAlignVertical: 'top',
  },

  checkboxGroup: {
    gap: getResponsiveSize(10),
  },

  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: getResponsiveSize(8),
  },

  checkbox: {
    width: getResponsiveSize(20),
    height: getResponsiveSize(20),
    borderWidth: 2,
    borderColor: '#34C759',
    borderRadius: getResponsiveSize(4),
    marginRight: getResponsiveSize(10),
    justifyContent: 'center',
    alignItems: 'center',
  },

  checkboxChecked: {
    backgroundColor: 'rgba(52, 199, 89, 0.2)',
  },

  checkboxLabel: {
    fontSize: getResponsiveFontSize(14),
    color: '#E0E0E0',
    fontWeight: '500',
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
    shadowColor: '#34C759',
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