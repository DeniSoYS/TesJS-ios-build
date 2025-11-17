import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { addDoc, collection, doc, updateDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import {
  Alert,
  Dimensions,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { auth, db } from '../firebaseConfig';

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

export default function AddSickLeaveScreen({ navigation, route }) {
  const { userRole, editSickLeave } = route.params || {};
  
  const [employeeName, setEmployeeName] = useState('');
  const [position, setPosition] = useState('');
  const [status, setStatus] = useState('sick_leave');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [description, setDescription] = useState('');
  const [showStatusModal, setShowStatusModal] = useState(false);

  const statusOptions = [
    { key: 'sick_leave', label: 'Больничный лист', icon: 'medical', color: '#FF6B6B' },
    { key: 'without_pay', label: 'Без содержания', icon: 'cash', color: '#4A90E2' },
    { key: 'other', label: 'Другое', icon: 'document', color: '#9B59B6' }
  ];

  // Если редактируем существующий больничный, заполняем поля
  useEffect(() => {
    if (editSickLeave) {
      setEmployeeName(editSickLeave.employeeName);
      setPosition(editSickLeave.position);
      setStatus(editSickLeave.status);
      setStartDate(editSickLeave.startDate);
      setEndDate(editSickLeave.endDate);
      setDescription(editSickLeave.description || '');
    }
  }, [editSickLeave]);

  const getStatusLabel = (key) => {
    const option = statusOptions.find(opt => opt.key === key);
    return option ? option.label : 'Больничный лист';
  };

  const getStatusIcon = (key) => {
    const option = statusOptions.find(opt => opt.key === key);
    return option ? option.icon : 'medical';
  };

  const handleSave = async () => {
    if (!employeeName || !position || !startDate || !endDate) {
      Alert.alert('Ошибка', 'Заполните все обязательные поля');
      return;
    }

    // Проверка формата даты (DD.MM.YYYY)
    const dateRegex = /^\d{2}\.\d{2}\.\d{4}$/;
    if (!dateRegex.test(startDate) || !dateRegex.test(endDate)) {
      Alert.alert('Ошибка', 'Дата должна быть в формате ДД.ММ.ГГГГ (например: 05.08.2025)');
      return;
    }

    try {
      const sickLeaveData = {
        employeeName: employeeName.trim(),
        position: position.trim(),
        status: status,
        startDate: startDate,
        endDate: endDate,
        description: description.trim(),
        userId: auth.currentUser.uid,
        updatedAt: new Date().toISOString(),
      };

      if (editSickLeave) {
        // Редактирование существующего больничного
        await updateDoc(doc(db, 'sickLeaves', editSickLeave.id), sickLeaveData);
        Alert.alert('Успех', 'Запись о больничном обновлена!');
      } else {
        // Создание нового больничного
        sickLeaveData.createdAt = new Date().toISOString();
        await addDoc(collection(db, 'sickLeaves'), sickLeaveData);
        Alert.alert('Успех', 'Запись о больничном добавлена!');
      }
      
      navigation.goBack();
    } catch (error) {
      console.error('Ошибка сохранения:', error);
      Alert.alert('Ошибка', 'Не удалось сохранить запись');
    }
  };

  return (
    <LinearGradient
      colors={['#0a0a0a', '#1a1a1a', '#2a2a2a']}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      {/* Шапка в стиле календаря */}
      <LinearGradient
        colors={['rgba(26, 26, 26, 0.98)', 'rgba(35, 35, 35, 0.95)']}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.headerBackground}>
          <View style={[styles.decorCircle, styles.decorCircle1]} />
          <View style={[styles.decorCircle, styles.decorCircle2]} />
        </View>

        <View style={styles.headerContent}>
          <View style={styles.headerTopRow}>
            <TouchableOpacity 
              onPress={() => navigation.goBack()} 
              style={styles.backButton}
            >
              <LinearGradient
                colors={['#FFD700', '#FFA500']}
                style={styles.backButtonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Ionicons name="arrow-back" size={getResponsiveSize(20)} color="#1a1a1a" />
              </LinearGradient>
            </TouchableOpacity>

            <View style={styles.titleSection}>
              <View style={styles.titleIconContainer}>
                <LinearGradient
                  colors={['#FFD700', '#FFA500']}
                  style={styles.titleIconGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Ionicons name="medical" size={getResponsiveSize(24)} color="#1a1a1a" />
                </LinearGradient>
              </View>
              <View style={styles.titleTextContainer}>
                <Text style={styles.mainTitle}>
                  {editSickLeave ? 'Редактировать больничный' : 'Добавить больничный'}
                </Text>
                <Text style={styles.subtitle}>Управление статусами сотрудников</Text>
              </View>
            </View>

            <View style={styles.headerSpacer} />
          </View>
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* ФИО артиста */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ФИО артиста</Text>
          <View style={styles.inputContainer}>
            <LinearGradient
              colors={['rgba(42, 42, 42, 0.8)', 'rgba(35, 35, 35, 0.9)']}
              style={styles.inputGradient}
            >
              <View style={styles.inputInner}>
                <Ionicons name="person" size={getResponsiveSize(20)} color="#FFD700" />
                <TextInput
                  style={styles.input}
                  value={employeeName}
                  onChangeText={setEmployeeName}
                  placeholder="Введите ФИО артиста"
                  placeholderTextColor="#888"
                />
              </View>
            </LinearGradient>
          </View>
        </View>

        {/* Должность */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Должность</Text>
          <View style={styles.inputContainer}>
            <LinearGradient
              colors={['rgba(42, 42, 42, 0.8)', 'rgba(35, 35, 35, 0.9)']}
              style={styles.inputGradient}
            >
              <View style={styles.inputInner}>
                <Ionicons name="briefcase" size={getResponsiveSize(20)} color="#FFD700" />
                <TextInput
                  style={styles.input}
                  value={position}
                  onChangeText={setPosition}
                  placeholder="Введите должность"
                  placeholderTextColor="#888"
                />
              </View>
            </LinearGradient>
          </View>
        </View>

        {/* Статус */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Статус</Text>
          <TouchableOpacity 
            style={styles.dropdownContainer}
            onPress={() => setShowStatusModal(true)}
          >
            <LinearGradient
              colors={['rgba(42, 42, 42, 0.8)', 'rgba(35, 35, 35, 0.9)']}
              style={styles.dropdownGradient}
            >
              <View style={styles.dropdownInner}>
                <Ionicons 
                  name={getStatusIcon(status)} 
                  size={getResponsiveSize(20)} 
                  color="#FFD700" 
                />
                <Text style={styles.dropdownText}>{getStatusLabel(status)}</Text>
                <Ionicons name="chevron-down" size={getResponsiveSize(18)} color="#FFD700" />
              </View>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Даты */}
        <View style={styles.rowSection}>
          <View style={styles.dateField}>
            <Text style={styles.sectionTitle}>От даты</Text>
            <View style={styles.inputContainer}>
              <LinearGradient
                colors={['rgba(42, 42, 42, 0.8)', 'rgba(35, 35, 35, 0.9)']}
                style={styles.inputGradient}
              >
                <View style={styles.inputInner}>
                  <Ionicons name="calendar" size={getResponsiveSize(20)} color="#FFD700" />
                  <TextInput
                    style={styles.input}
                    value={startDate}
                    onChangeText={setStartDate}
                    placeholder="ДД.ММ.ГГГГ"
                    placeholderTextColor="#888"
                    maxLength={10}
                  />
                </View>
              </LinearGradient>
            </View>
          </View>

          <View style={styles.dateField}>
            <Text style={styles.sectionTitle}>До даты</Text>
            <View style={styles.inputContainer}>
              <LinearGradient
                colors={['rgba(42, 42, 42, 0.8)', 'rgba(35, 35, 35, 0.9)']}
                style={styles.inputGradient}
              >
                <View style={styles.inputInner}>
                  <Ionicons name="calendar" size={getResponsiveSize(20)} color="#FFD700" />
                  <TextInput
                    style={styles.input}
                    value={endDate}
                    onChangeText={setEndDate}
                    placeholder="ДД.ММ.ГГГГ"
                    placeholderTextColor="#888"
                    maxLength={10}
                  />
                </View>
              </LinearGradient>
            </View>
          </View>
        </View>

        {/* Описание */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Описание</Text>
          <View style={styles.inputContainer}>
            <LinearGradient
              colors={['rgba(42, 42, 42, 0.8)', 'rgba(35, 35, 35, 0.9)']}
              style={[styles.inputGradient, styles.textAreaGradient]}
            >
              <View style={[styles.inputInner, styles.textAreaInner]}>
                <Ionicons 
                  name="document-text" 
                  size={getResponsiveSize(20)} 
                  color="#FFD700" 
                  style={styles.textAreaIcon}
                />
                <TextInput
                  style={styles.textArea}
                  value={description}
                  onChangeText={setDescription}
                  placeholder="Опишите причину (например: 'Заболел гриппом')"
                  placeholderTextColor="#888"
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </View>
            </LinearGradient>
          </View>
        </View>

        {/* Кнопка сохранить */}
        <TouchableOpacity 
          style={styles.saveButtonWrapper}
          onPress={handleSave}
          disabled={!employeeName || !position || !startDate || !endDate}
        >
          <LinearGradient
            colors={(!employeeName || !position || !startDate || !endDate) 
              ? ['#555', '#333'] 
              : ['#FFD700', '#FFA500']
            }
            style={styles.saveButton}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Ionicons 
              name="save" 
              size={getResponsiveSize(20)} 
              color={(!employeeName || !position || !startDate || !endDate) ? "#888" : "#1a1a1a"} 
            />
            <Text style={[
              styles.saveButtonText,
              (!employeeName || !position || !startDate || !endDate) && styles.saveButtonTextDisabled
            ]}>
              {editSickLeave ? 'Обновить больничный' : 'Сохранить больничный'}
            </Text>
          </LinearGradient>
        </TouchableOpacity>

        <Text style={styles.requiredText}>* Обязательные поля</Text>
      </ScrollView>

      {/* Модальное окно выбора статуса в стиле календаря */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={showStatusModal}
        onRequestClose={() => setShowStatusModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <LinearGradient
              colors={['rgba(26, 26, 26, 0.98)', 'rgba(35, 35, 35, 0.95)']}
              style={styles.modalGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Выберите статус</Text>
                <TouchableOpacity 
                  onPress={() => setShowStatusModal(false)} 
                  style={styles.modalCloseButton}
                >
                  <Ionicons name="close-circle" size={getResponsiveSize(28)} color="#FFD700" />
                </TouchableOpacity>
              </View>
              
              <View style={styles.statusList}>
                {statusOptions.map((option) => (
                  <TouchableOpacity
                    key={option.key}
                    style={[
                      styles.statusItem,
                      status === option.key && styles.statusItemSelected
                    ]}
                    onPress={() => {
                      setStatus(option.key);
                      setShowStatusModal(false);
                    }}
                  >
                    <LinearGradient
                      colors={status === option.key 
                        ? ['rgba(255, 215, 0, 0.2)', 'rgba(255, 165, 0, 0.2)'] 
                        : ['rgba(42, 42, 42, 0.6)', 'rgba(35, 35, 35, 0.8)']
                      }
                      style={styles.statusItemGradient}
                    >
                      <View style={styles.statusItemContent}>
                        <View style={styles.statusIconContainer}>
                          <Ionicons name={option.icon} size={getResponsiveSize(24)} color={option.color} />
                        </View>
                        <Text style={[
                          styles.statusText,
                          status === option.key && styles.statusTextSelected
                        ]}>
                          {option.label}
                        </Text>
                        {status === option.key && (
                          <Ionicons name="checkmark-circle" size={getResponsiveSize(20)} color="#FFD700" />
                        )}
                      </View>
                    </LinearGradient>
                  </TouchableOpacity>
                ))}
              </View>
            </LinearGradient>
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
  // 🌙 ХЕДЕР В СТИЛЕ КАЛЕНДАРЯ
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
    position: 'relative',
    overflow: 'hidden',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 215, 0, 0.3)',
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
    backgroundColor: '#FFD700',
    top: -getResponsiveSize(80),
    right: -getResponsiveSize(50),
  },
  decorCircle2: {
    width: getResponsiveSize(150),
    height: getResponsiveSize(150),
    backgroundColor: '#FFA500',
    bottom: -getResponsiveSize(60),
    left: -getResponsiveSize(40),
  },
  headerContent: {
    position: 'relative',
    zIndex: 2,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    borderRadius: getResponsiveSize(20),
    overflow: 'hidden',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  backButtonGradient: {
    width: getResponsiveSize(44),
    height: getResponsiveSize(44),
    justifyContent: 'center',
    alignItems: 'center',
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
    width: getResponsiveSize(48),
    height: getResponsiveSize(48),
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
    flex: 1,
  },
  mainTitle: {
    fontSize: getResponsiveFontSize(18),
    fontWeight: '800',
    color: '#E0E0E0',
    letterSpacing: 0.3,
  },
  subtitle: {
    fontSize: getResponsiveFontSize(12),
    color: '#999',
    fontWeight: '500',
  },
  headerSpacer: {
    width: getResponsiveSize(44),
  },
  // 🌙 КОНТЕНТ
  content: {
    flex: 1,
    padding: getResponsiveSize(20),
  },
  section: {
    marginBottom: getResponsiveSize(20),
  },
  rowSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: getResponsiveSize(15),
    marginBottom: getResponsiveSize(20),
  },
  dateField: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: getResponsiveFontSize(14),
    fontWeight: '700',
    color: '#E0E0E0',
    marginBottom: getResponsiveSize(8),
  },
  inputContainer: {
    borderRadius: getResponsiveSize(16),
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  inputGradient: {
    borderRadius: getResponsiveSize(16),
    padding: getResponsiveSize(2),
  },
  inputInner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(42, 42, 42, 0.9)',
    borderRadius: getResponsiveSize(14),
    paddingHorizontal: getResponsiveSize(16),
    paddingVertical: getResponsiveSize(14),
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.2)',
  },
  input: {
    flex: 1,
    marginLeft: getResponsiveSize(12),
    fontSize: getResponsiveFontSize(14),
    color: '#E0E0E0',
    fontWeight: '500',
  },
  // 🌙 ВЫПАДАЮЩИЙ СПИСОК
  dropdownContainer: {
    borderRadius: getResponsiveSize(16),
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  dropdownGradient: {
    borderRadius: getResponsiveSize(16),
    padding: getResponsiveSize(2),
  },
  dropdownInner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(42, 42, 42, 0.9)',
    borderRadius: getResponsiveSize(14),
    paddingHorizontal: getResponsiveSize(16),
    paddingVertical: getResponsiveSize(14),
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.2)',
  },
  dropdownText: {
    flex: 1,
    marginLeft: getResponsiveSize(12),
    fontSize: getResponsiveFontSize(14),
    color: '#E0E0E0',
    fontWeight: '500',
  },
  // 🌙 ТЕКСТОВАЯ ОБЛАСТЬ
  textAreaGradient: {
    minHeight: getResponsiveSize(120),
  },
  textAreaInner: {
    alignItems: 'flex-start',
    minHeight: getResponsiveSize(116),
  },
  textAreaIcon: {
    marginTop: getResponsiveSize(4),
  },
  textArea: {
    flex: 1,
    marginLeft: getResponsiveSize(12),
    fontSize: getResponsiveFontSize(14),
    color: '#E0E0E0',
    fontWeight: '500',
    minHeight: getResponsiveSize(80),
    textAlignVertical: 'top',
  },
  // 🌙 КНОПКА СОХРАНЕНИЯ
  saveButtonWrapper: {
    borderRadius: getResponsiveSize(18),
    overflow: 'hidden',
    marginTop: getResponsiveSize(10),
    marginBottom: getResponsiveSize(10),
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: getResponsiveSize(16),
    paddingHorizontal: getResponsiveSize(24),
  },
  saveButtonText: {
    color: '#1a1a1a',
    fontSize: getResponsiveFontSize(16),
    fontWeight: '700',
    marginLeft: getResponsiveSize(8),
  },
  saveButtonTextDisabled: {
    color: '#888',
  },
  requiredText: {
    textAlign: 'center',
    fontSize: getResponsiveFontSize(12),
    color: '#888',
    marginBottom: getResponsiveSize(10),
  },
  // 🌙 МОДАЛЬНОЕ ОКНО
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: getResponsiveSize(20),
  },
  modalContainer: {
    width: '90%',
    maxWidth: getResponsiveSize(400),
  },
  modalGradient: {
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
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: getResponsiveSize(20),
  },
  modalTitle: {
    fontSize: getResponsiveFontSize(20),
    fontWeight: '800',
    color: '#E0E0E0',
    letterSpacing: 0.3,
  },
  modalCloseButton: {
    padding: getResponsiveSize(4),
  },
  statusList: {
    gap: getResponsiveSize(12),
  },
  statusItem: {
    borderRadius: getResponsiveSize(16),
    overflow: 'hidden',
  },
  statusItemSelected: {
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 6,
  },
  statusItemGradient: {
    borderRadius: getResponsiveSize(16),
    padding: getResponsiveSize(2),
  },
  statusItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(42, 42, 42, 0.9)',
    borderRadius: getResponsiveSize(14),
    paddingHorizontal: getResponsiveSize(16),
    paddingVertical: getResponsiveSize(16),
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.2)',
  },
  statusIconContainer: {
    width: getResponsiveSize(40),
    alignItems: 'center',
  },
  statusText: {
    flex: 1,
    fontSize: getResponsiveFontSize(16),
    color: '#E0E0E0',
    fontWeight: '600',
    marginLeft: getResponsiveSize(12),
  },
  statusTextSelected: {
    color: '#FFD700',
    fontWeight: '700',
  },
});