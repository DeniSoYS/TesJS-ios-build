import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { LinearGradient } from 'expo-linear-gradient';
import { addDoc, collection } from 'firebase/firestore';
import { useState } from 'react';
import {
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { db } from '../firebaseConfig';

export default function AddTourScreen({ navigation, route }) {
  const { date, userRole } = route.params || {};
  
  const [title, setTitle] = useState('');
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [description, setDescription] = useState('');
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);

  const formatDateForDisplay = (date) => {
    return date.toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const formatDateForFirebase = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const onStartDateChange = (event, selectedDate) => {
    setShowStartDatePicker(false);
    if (selectedDate) {
      setStartDate(selectedDate);
      // Если конечная дата раньше начальной, обновляем её
      if (selectedDate > endDate) {
        setEndDate(selectedDate);
      }
    }
  };

  const onEndDateChange = (event, selectedDate) => {
    setShowEndDatePicker(false);
    if (selectedDate && selectedDate >= startDate) {
      setEndDate(selectedDate);
    } else if (selectedDate) {
      Alert.alert('Ошибка', 'Дата окончания не может быть раньше даты начала');
    }
  };

  const handleSubmit = async () => {
    if (!title.trim() || !description.trim()) {
      Alert.alert('Ошибка', 'Пожалуйста, заполните все обязательные поля');
      return;
    }

    if (startDate > endDate) {
      Alert.alert('Ошибка', 'Дата окончания не может быть раньше даты начала');
      return;
    }

    try {
      const tourData = {
        title: title.trim(),
        startDate: formatDateForFirebase(startDate),
        endDate: formatDateForFirebase(endDate),
        description: description.trim(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await addDoc(collection(db, 'tours'), tourData);

      Alert.alert(
        'Успех',
        'Гастроли успешно добавлены',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      console.error('Ошибка при сохранении гастролей:', error);
      Alert.alert('Ошибка', 'Не удалось сохранить гастроли');
    }
  };

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
        <View style={styles.headerContent}>
          <TouchableOpacity 
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color="#3E2723" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Добавить гастроли</Text>
          <View style={styles.headerSpacer} />
        </View>
      </LinearGradient>

      <ScrollView style={styles.formContainer}>
        {/* Заголовок */}
        <Text style={styles.label}>Название гастролей *</Text>
        <TextInput
          style={styles.textInput}
          value={title}
          onChangeText={setTitle}
          placeholder="Введите название гастролей..."
          placeholderTextColor="#8B8B8B"
        />

        {/* Дата начала */}
        <Text style={styles.label}>Дата начала *</Text>
        <TouchableOpacity 
          style={styles.dateInput}
          onPress={() => setShowStartDatePicker(true)}
        >
          <Ionicons name="calendar" size={20} color="#4A90E2" />
          <Text style={styles.dateText}>
            {formatDateForDisplay(startDate)}
          </Text>
        </TouchableOpacity>

        {/* Дата окончания */}
        <Text style={styles.label}>Дата окончания *</Text>
        <TouchableOpacity 
          style={styles.dateInput}
          onPress={() => setShowEndDatePicker(true)}
        >
          <Ionicons name="calendar" size={20} color="#4A90E2" />
          <Text style={styles.dateText}>
            {formatDateForDisplay(endDate)}
          </Text>
        </TouchableOpacity>

        {/* Описание */}
        <Text style={styles.label}>Описание гастролей *</Text>
        <TextInput
          style={[styles.textInput, styles.descriptionInput]}
          value={description}
          onChangeText={setDescription}
          placeholder="Опишите детали гастролей..."
          placeholderTextColor="#8B8B8B"
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />

        {/* Кнопка сохранения */}
        <TouchableOpacity 
          style={styles.submitButton}
          onPress={handleSubmit}
        >
          <LinearGradient
            colors={['#4A90E2', '#357ABD']}
            style={styles.submitGradient}
          >
            <Ionicons name="airplane" size={20} color="white" />
            <Text style={styles.submitText}>Сохранить гастроли</Text>
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>

      {/* Date Pickers */}
      {showStartDatePicker && (
        <DateTimePicker
          value={startDate}
          mode="date"
          display="default"
          onChange={onStartDateChange}
        />
      )}

      {showEndDatePicker && (
        <DateTimePicker
          value={endDate}
          mode="date"
          display="default"
          minimumDate={startDate}
          onChange={onEndDateChange}
        />
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
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
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3E2723',
    marginBottom: 8,
    marginTop: 15,
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
  },
  descriptionInput: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  dateInput: {
    backgroundColor: 'white',
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateText: {
    fontSize: 14,
    color: '#3E2723',
    marginLeft: 10,
    fontWeight: '500',
  },
  submitButton: {
    marginTop: 30,
    marginBottom: 20,
    borderRadius: 15,
    overflow: 'hidden',
    shadowColor: '#4A90E2',
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
});