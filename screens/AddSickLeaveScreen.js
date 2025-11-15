import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity,
  ScrollView, 
  TextInput,
  Alert,
  Modal
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { collection, addDoc, updateDoc, doc } from 'firebase/firestore';
import { db, auth } from '../firebaseConfig';

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
    { key: 'sick_leave', label: 'Больничный лист' },
    { key: 'without_pay', label: 'Без содержания' },
    { key: 'other', label: 'Другое' }
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
      colors={['#FFF8E1', '#FFE4B5', '#FFD700']}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      {/* Шапка */}
      <LinearGradient
        colors={['rgba(255, 248, 225, 0.95)', 'rgba(255, 228, 181, 0.9)']}
        style={styles.header}
      >
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={22} color="#3E2723" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {editSickLeave ? 'Редактировать больничный' : 'Добавить больничный'}
        </Text>
        <View style={styles.headerPlaceholder} />
      </LinearGradient>

      <ScrollView style={styles.content}>
        {/* ФИО артиста */}
        <View style={styles.fieldContainer}>
          <Text style={styles.fieldLabel}>ФИО артиста *</Text>
          <LinearGradient
            colors={['#FFF8E1', '#FFE4B5']}
            style={styles.inputGradientContainer}
          >
            <View style={styles.inputField}>
              <Ionicons name="person" size={18} color="#DAA520" />
              <TextInput
                style={styles.input}
                value={employeeName}
                onChangeText={setEmployeeName}
                placeholder="Введите ФИО артиста"
                placeholderTextColor="#8B8B8B"
              />
            </View>
          </LinearGradient>
        </View>

        {/* Должность */}
        <View style={styles.fieldContainer}>
          <Text style={styles.fieldLabel}>Должность *</Text>
          <LinearGradient
            colors={['#FFF8E1', '#FFE4B5']}
            style={styles.inputGradientContainer}
          >
            <View style={styles.inputField}>
              <Ionicons name="briefcase" size={18} color="#DAA520" />
              <TextInput
                style={styles.input}
                value={position}
                onChangeText={setPosition}
                placeholder="Введите должность"
                placeholderTextColor="#8B8B8B"
              />
            </View>
          </LinearGradient>
        </View>

        {/* Статус */}
        <View style={styles.fieldContainer}>
          <Text style={styles.fieldLabel}>Статус *</Text>
          <TouchableOpacity 
            style={styles.dropdownField}
            onPress={() => setShowStatusModal(true)}
          >
            <Ionicons name="document-text" size={18} color="#DAA520" />
            <Text style={styles.dropdownText}>{getStatusLabel(status)}</Text>
            <Ionicons name="chevron-down" size={18} color="#DAA520" />
          </TouchableOpacity>
        </View>

        {/* Даты */}
        <View style={styles.rowContainer}>
          <View style={styles.dateField}>
            <Text style={styles.fieldLabel}>От даты *</Text>
            <LinearGradient
              colors={['#FFF8E1', '#FFE4B5']}
              style={styles.inputGradientContainer}
            >
              <View style={styles.inputField}>
                <Ionicons name="calendar" size={18} color="#DAA520" />
                <TextInput
                  style={styles.input}
                  value={startDate}
                  onChangeText={setStartDate}
                  placeholder="ДД.ММ.ГГГГ"
                  placeholderTextColor="#8B8B8B"
                  maxLength={10}
                />
              </View>
            </LinearGradient>
          </View>

          <View style={styles.dateField}>
            <Text style={styles.fieldLabel}>До даты *</Text>
            <LinearGradient
              colors={['#FFF8E1', '#FFE4B5']}
              style={styles.inputGradientContainer}
            >
              <View style={styles.inputField}>
                <Ionicons name="calendar" size={18} color="#DAA520" />
                <TextInput
                  style={styles.input}
                  value={endDate}
                  onChangeText={setEndDate}
                  placeholder="ДД.ММ.ГГГГ"
                  placeholderTextColor="#8B8B8B"
                  maxLength={10}
                />
              </View>
            </LinearGradient>
          </View>
        </View>

        {/* Описание */}
        <View style={styles.fieldContainer}>
          <Text style={styles.fieldLabel}>Описание</Text>
          <LinearGradient
            colors={['#FFF8E1', '#FFE4B5']}
            style={styles.inputGradientContainerLarge}
          >
            <View style={styles.inputFieldLarge}>
              <Ionicons name="document-text" size={18} color="#DAA520" style={styles.iconTop} />
              <TextInput
                style={styles.inputMultiline}
                value={description}
                onChangeText={setDescription}
                placeholder="Опишите причину (например: 'Заболел гриппом')"
                placeholderTextColor="#8B8B8B"
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>
          </LinearGradient>
        </View>

        {/* Кнопка сохранить */}
        <TouchableOpacity 
          style={[
            styles.saveButtonWrapper,
            (!employeeName || !position || !startDate || !endDate) && styles.saveButtonDisabled
          ]} 
          onPress={handleSave}
          disabled={!employeeName || !position || !startDate || !endDate}
        >
          <LinearGradient
            colors={(!employeeName || !position || !startDate || !endDate) 
              ? ['#CCCCCC', '#999999'] 
              : ['#FFD700', '#DAA520']
            }
            style={styles.saveButton}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Ionicons name="save" size={18} color="white" />
            <Text style={styles.saveButtonText}>
              {editSickLeave ? 'Обновить больничный' : 'Сохранить больничный'}
            </Text>
          </LinearGradient>
        </TouchableOpacity>

        <Text style={styles.requiredText}>* Обязательные поля</Text>
      </ScrollView>

      {/* Модальное окно выбора статуса */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showStatusModal}
        onRequestClose={() => setShowStatusModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <LinearGradient
              colors={['rgba(255, 248, 225, 0.95)', 'rgba(255, 228, 181, 0.9)']}
              style={styles.modalGradient}
            >
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Выберите статус</Text>
                <TouchableOpacity onPress={() => setShowStatusModal(false)} style={styles.modalCloseButton}>
                  <Ionicons name="close" size={18} color="#3E2723" />
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
                    <Text style={[
                      styles.statusText,
                      status === option.key && styles.statusTextSelected
                    ]}>
                      {option.label}
                    </Text>
                    {status === option.key && (
                      <Ionicons name="checkmark" size={16} color="#DAA520" />
                    )}
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingTop: 48,
    paddingBottom: 18,
    borderBottomLeftRadius: 22,
    borderBottomRightRadius: 22,
    shadowColor: '#8B6B4F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  backButton: {
    padding: 6,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#3E2723',
    textAlign: 'center',
  },
  headerPlaceholder: {
    width: 36,
  },
  content: {
    flex: 1,
    padding: 14,
  },
  fieldContainer: {
    marginBottom: 14,
  },
  fieldLabel: {
    fontSize: 13,
    color: '#3E2723',
    marginBottom: 6,
    fontWeight: '600',
  },
  dropdownField: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 12,
    shadowColor: '#8B6B4F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#FFE4B5',
  },
  dropdownText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 13,
    color: '#3E2723',
    fontWeight: '500',
  },
  inputGradientContainer: {
    borderRadius: 10,
    padding: 2,
    shadowColor: '#8B6B4F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  inputGradientContainerLarge: {
    borderRadius: 10,
    padding: 2,
    shadowColor: '#8B6B4F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    minHeight: 90,
  },
  inputField: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  inputFieldLarge: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 86,
  },
  iconTop: {
    marginTop: 4,
  },
  input: {
    flex: 1,
    marginLeft: 8,
    fontSize: 13,
    color: '#3E2723',
    fontWeight: '500',
  },
  inputMultiline: {
    flex: 1,
    marginLeft: 8,
    fontSize: 13,
    color: '#3E2723',
    fontWeight: '500',
    minHeight: 60,
  },
  rowContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  dateField: {
    flex: 1,
  },
  saveButtonWrapper: {
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 14,
    marginBottom: 8,
    shadowColor: '#DAA520',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 5,
  },
  saveButtonDisabled: {
    shadowColor: '#CCCCCC',
    shadowOpacity: 0.2,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 18,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 6,
  },
  requiredText: {
    textAlign: 'center',
    fontSize: 11,
    color: '#8B8B8B',
    marginBottom: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 14,
  },
  modalContainer: {
    width: '90%',
    maxWidth: 320,
  },
  modalGradient: {
    borderRadius: 18,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#3E2723',
  },
  modalCloseButton: {
    padding: 4,
  },
  statusList: {
    gap: 6,
  },
  statusItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 10,
  },
  statusItemSelected: {
    backgroundColor: '#FFF8E1',
    borderWidth: 2,
    borderColor: '#FFD700',
  },
  statusText: {
    fontSize: 13,
    color: '#3E2723',
    fontWeight: '500',
  },
  statusTextSelected: {
    color: '#DAA520',
    fontWeight: 'bold',
  },
});