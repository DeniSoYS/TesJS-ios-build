import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { LinearGradient } from 'expo-linear-gradient';
import { addDoc, collection } from 'firebase/firestore';
import { useState } from 'react';
import {
    Alert,
    Dimensions,
    Platform,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
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

export default function AddMoveScreen({ navigation, route }) {
  const { date, userRole } = route.params || {};
  
  const [fromCity, setFromCity] = useState('');
  const [toCity, setToCity] = useState('');
  const [moveDate, setMoveDate] = useState(new Date());
  const [hotel, setHotel] = useState('');
  const [passportRequired, setPassportRequired] = useState(false);
  const [whatToTake, setWhatToTake] = useState('');
  const [arrivalInfo, setArrivalInfo] = useState('');
  const [meals, setMeals] = useState({
    breakfast: false,
    lunch: false,
    dinner: false,
    noFood: false
  });
  const [showDatePicker, setShowDatePicker] = useState(false);

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

  const onDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setMoveDate(selectedDate);
    }
  };

  const handleMealChange = (mealType, value) => {
    if (mealType === 'noFood') {
      setMeals({
        breakfast: false,
        lunch: false,
        dinner: false,
        noFood: value
      });
    } else {
      setMeals({
        ...meals,
        [mealType]: value,
        noFood: false
      });
    }
  };

  const handleSubmit = async () => {
    if (!fromCity.trim() || !toCity.trim()) {
      Alert.alert('Ошибка', 'Пожалуйста, заполните города отправления и назначения');
      return;
    }

    try {
      const moveData = {
        fromCity: fromCity.trim(),
        toCity: toCity.trim(),
        date: formatDateForFirebase(moveDate),
        hotel: hotel.trim(),
        passportRequired,
        whatToTake: whatToTake.trim(),
        arrivalInfo: arrivalInfo.trim(),
        meals,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await addDoc(collection(db, 'moves'), moveData);

      Alert.alert(
        'Успех',
        'Переезд успешно добавлен',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      console.error('Ошибка при сохранении переезда:', error);
      Alert.alert('Ошибка', 'Не удалось сохранить переезд');
    }
  };

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
              <Ionicons name="arrow-back" size={getResponsiveSize(24)} color="#FFD700" />
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
                <Text style={styles.mainTitle}>Добавить переезд</Text>
                <Text style={styles.subtitle}>Заполните информацию о переезде</Text>
              </View>
            </View>

            <View style={styles.headerSpacer} />
          </View>
        </LinearGradient>

        <ScrollView style={styles.formContainer} showsVerticalScrollIndicator={false}>
          {/* Город отправления */}
          <Text style={styles.label}>Откуда *</Text>
          <TextInput
            style={styles.textInput}
            value={fromCity}
            onChangeText={setFromCity}
            placeholder="Город отправления..."
            placeholderTextColor="#888"
            selectionColor="#34C759"
          />

          {/* Город назначения */}
          <Text style={styles.label}>Куда *</Text>
          <TextInput
            style={styles.textInput}
            value={toCity}
            onChangeText={setToCity}
            placeholder="Город назначения..."
            placeholderTextColor="#888"
            selectionColor="#34C759"
          />

          {/* Дата переезда */}
          <Text style={styles.label}>Дата переезда *</Text>
          <TouchableOpacity 
            style={styles.dateInput}
            onPress={() => setShowDatePicker(true)}
          >
            <LinearGradient
              colors={['rgba(52, 199, 89, 0.2)', 'rgba(40, 167, 69, 0.2)']}
              style={styles.dateInputGradient}
            >
              <Ionicons name="calendar" size={getResponsiveSize(20)} color="#34C759" />
              <Text style={styles.dateText}>
                {formatDateForDisplay(moveDate)}
              </Text>
            </LinearGradient>
          </TouchableOpacity>

          {/* Отель */}
          <Text style={styles.label}>Отель (если есть)</Text>
          <TextInput
            style={styles.textInput}
            value={hotel}
            onChangeText={setHotel}
            placeholder="Название отеля..."
            placeholderTextColor="#888"
            selectionColor="#34C759"
          />

          {/* Питание */}
          <Text style={styles.label}>Питание</Text>
          <LinearGradient
            colors={['rgba(42, 42, 42, 0.8)', 'rgba(35, 35, 35, 0.9)']}
            style={styles.mealsContainer}
          >
            <View style={styles.mealRow}>
              <View style={styles.mealLabel}>
                <Ionicons name="cafe" size={getResponsiveSize(18)} color="#34C759" />
                <Text style={styles.mealText}>Завтрак</Text>
              </View>
              <Switch
                value={meals.breakfast}
                onValueChange={(value) => handleMealChange('breakfast', value)}
                trackColor={{ false: '#444', true: '#34C759' }}
                thumbColor={meals.breakfast ? '#fff' : '#f4f3f4'}
              />
            </View>
            <View style={styles.mealRow}>
              <View style={styles.mealLabel}>
                <Ionicons name="restaurant" size={getResponsiveSize(18)} color="#34C759" />
                <Text style={styles.mealText}>Обед</Text>
              </View>
              <Switch
                value={meals.lunch}
                onValueChange={(value) => handleMealChange('lunch', value)}
                trackColor={{ false: '#444', true: '#34C759' }}
                thumbColor={meals.lunch ? '#fff' : '#f4f3f4'}
              />
            </View>
            <View style={styles.mealRow}>
              <View style={styles.mealLabel}>
                <Ionicons name="moon" size={getResponsiveSize(18)} color="#34C759" />
                <Text style={styles.mealText}>Ужин</Text>
              </View>
              <Switch
                value={meals.dinner}
                onValueChange={(value) => handleMealChange('dinner', value)}
                trackColor={{ false: '#444', true: '#34C759' }}
                thumbColor={meals.dinner ? '#fff' : '#f4f3f4'}
              />
            </View>
            <View style={styles.mealRow}>
              <View style={styles.mealLabel}>
                <Ionicons name="ban" size={getResponsiveSize(18)} color="#FF6B6B" />
                <Text style={styles.mealText}>Не кормят</Text>
              </View>
              <Switch
                value={meals.noFood}
                onValueChange={(value) => handleMealChange('noFood', value)}
                trackColor={{ false: '#444', true: '#FF6B6B' }}
                thumbColor={meals.noFood ? '#fff' : '#f4f3f4'}
              />
            </View>
          </LinearGradient>

          {/* Документы */}
          <LinearGradient
            colors={['rgba(42, 42, 42, 0.8)', 'rgba(35, 35, 35, 0.9)']}
            style={styles.switchContainer}
          >
            <View style={styles.switchLabelContainer}>
              <Ionicons name="document" size={getResponsiveSize(18)} color="#34C759" />
              <Text style={styles.switchLabel}>Нужен паспорт</Text>
            </View>
            <Switch
              value={passportRequired}
              onValueChange={setPassportRequired}
              trackColor={{ false: '#444', true: '#34C759' }}
              thumbColor={passportRequired ? '#fff' : '#f4f3f4'}
            />
          </LinearGradient>

          {/* Что взять с собой */}
          <Text style={styles.label}>Что взять с собой</Text>
          <TextInput
            style={[styles.textInput, styles.textArea]}
            value={whatToTake}
            onChangeText={setWhatToTake}
            placeholder="Что нужно взять с собой..."
            placeholderTextColor="#888"
            multiline
            numberOfLines={3}
            textAlignVertical="top"
            selectionColor="#34C759"
          />

          {/* Информация о прибытии */}
          <Text style={styles.label}>Информация о прибытии</Text>
          <TextInput
            style={[styles.textInput, styles.textArea]}
            value={arrivalInfo}
            onChangeText={setArrivalInfo}
            placeholder="Дополнительная информация о прибытии..."
            placeholderTextColor="#888"
            multiline
            numberOfLines={3}
            textAlignVertical="top"
            selectionColor="#34C759"
          />

          {/* Кнопка сохранения */}
          <TouchableOpacity 
            style={styles.submitButton}
            onPress={handleSubmit}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={['#34C759', '#28A745']}
              style={styles.submitGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Ionicons name="bus" size={getResponsiveSize(22)} color="#1a1a1a" />
              <Text style={styles.submitText}>Сохранить переезд</Text>
            </LinearGradient>
          </TouchableOpacity>
        </ScrollView>

        {/* Date Picker */}
        {showDatePicker && (
          <DateTimePicker
            value={moveDate}
            mode="date"
            display="default"
            onChange={onDateChange}
          />
        )}
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
  
  headerSpacer: {
    width: getResponsiveSize(24),
  },
  
  formContainer: {
    flex: 1,
    padding: getResponsiveSize(20),
  },
  
  label: {
    fontSize: getResponsiveFontSize(14),
    fontWeight: '600',
    color: '#E0E0E0',
    marginBottom: getResponsiveSize(8),
    marginTop: getResponsiveSize(15),
  },
  
  textInput: {
    backgroundColor: 'rgba(42, 42, 42, 0.8)',
    borderRadius: getResponsiveSize(12),
    paddingHorizontal: getResponsiveSize(16),
    paddingVertical: getResponsiveSize(14),
    fontSize: getResponsiveFontSize(14),
    color: '#E0E0E0',
    borderWidth: 1,
    borderColor: 'rgba(52, 199, 89, 0.3)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  
  textArea: {
    minHeight: getResponsiveSize(100),
    textAlignVertical: 'top',
  },
  
  dateInput: {
    borderRadius: getResponsiveSize(12),
    overflow: 'hidden',
    shadowColor: '#34C759',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  
  dateInputGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: getResponsiveSize(16),
    paddingVertical: getResponsiveSize(14),
    borderRadius: getResponsiveSize(12),
    borderWidth: 1,
    borderColor: 'rgba(52, 199, 89, 0.3)',
  },
  
  dateText: {
    fontSize: getResponsiveFontSize(14),
    color: '#E0E0E0',
    marginLeft: getResponsiveSize(10),
    fontWeight: '500',
  },
  
  mealsContainer: {
    borderRadius: getResponsiveSize(12),
    padding: getResponsiveSize(16),
    borderWidth: 1,
    borderColor: 'rgba(52, 199, 89, 0.2)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  
  mealRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: getResponsiveSize(12),
  },
  
  mealLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: getResponsiveSize(10),
  },
  
  mealText: {
    fontSize: getResponsiveFontSize(14),
    color: '#E0E0E0',
    fontWeight: '500',
  },
  
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: getResponsiveSize(12),
    paddingHorizontal: getResponsiveSize(16),
    paddingVertical: getResponsiveSize(14),
    borderWidth: 1,
    borderColor: 'rgba(52, 199, 89, 0.2)',
    marginBottom: getResponsiveSize(15),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  
  switchLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: getResponsiveSize(10),
  },
  
  switchLabel: {
    fontSize: getResponsiveFontSize(14),
    color: '#E0E0E0',
    fontWeight: '500',
  },
  
  submitButton: {
    marginTop: getResponsiveSize(30),
    marginBottom: getResponsiveSize(30),
    borderRadius: getResponsiveSize(15),
    overflow: 'hidden',
    shadowColor: '#34C759',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  
  submitGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: getResponsiveSize(16),
    paddingHorizontal: getResponsiveSize(25),
  },
  
  submitText: {
    color: '#1a1a1a',
    fontSize: getResponsiveFontSize(16),
    fontWeight: 'bold',
    marginLeft: getResponsiveSize(8),
  },
});