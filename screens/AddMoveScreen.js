import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { addDoc, collection } from 'firebase/firestore';
import { useState } from 'react';
import {
    Alert,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { db } from '../firebaseConfig';

export default function AddMoveScreen({ navigation, route }) {
  const { date, userRole } = route.params || {};
  
  const [fromCity, setFromCity] = useState('');
  const [toCity, setToCity] = useState('');
  const [hotel, setHotel] = useState('');
  const [breakfast, setBreakfast] = useState(false);
  const [lunch, setLunch] = useState(false);
  const [dinner, setDinner] = useState(false);
  const [noFood, setNoFood] = useState(false);
  const [passportRequired, setPassportRequired] = useState(false);
  const [whatToTake, setWhatToTake] = useState('');
  const [arrivalInfo, setArrivalInfo] = useState('');

  const handleSubmit = async () => {
    if (!fromCity.trim() || !toCity.trim()) {
      Alert.alert('Ошибка', 'Пожалуйста, заполните города отправления и назначения');
      return;
    }

    try {
      const moveData = {
        fromCity: fromCity.trim(),
        toCity: toCity.trim(),
        hotel: hotel.trim(),
        meals: {
          breakfast,
          lunch,
          dinner,
          noFood
        },
        passportRequired,
        whatToTake: whatToTake.trim(),
        arrivalInfo: arrivalInfo.trim(),
        date: date || new Date().toISOString().split('T')[0],
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

  const handleFoodChange = (type, value) => {
    if (type === 'breakfast') {
      setBreakfast(value);
      if (value) setNoFood(false);
    } else if (type === 'lunch') {
      setLunch(value);
      if (value) setNoFood(false);
    } else if (type === 'dinner') {
      setDinner(value);
      if (value) setNoFood(false);
    } else if (type === 'noFood') {
      setNoFood(value);
      if (value) {
        setBreakfast(false);
        setLunch(false);
        setDinner(false);
      }
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
          <Text style={styles.headerTitle}>Добавить переезд</Text>
          <View style={styles.headerSpacer} />
        </View>
      </LinearGradient>

      <ScrollView style={styles.formContainer}>
        {/* Город отправления */}
        <Text style={styles.label}>Город отправления *</Text>
        <TextInput
          style={styles.textInput}
          value={fromCity}
          onChangeText={setFromCity}
          placeholder="Откуда едем..."
          placeholderTextColor="#8B8B8B"
        />

        {/* Город назначения */}
        <Text style={styles.label}>Город назначения *</Text>
        <TextInput
          style={styles.textInput}
          value={toCity}
          onChangeText={setToCity}
          placeholder="Куда едем..."
          placeholderTextColor="#8B8B8B"
        />

        {/* Гостиница */}
        <Text style={styles.label}>Название гостиницы</Text>
        <TextInput
          style={styles.textInput}
          value={hotel}
          onChangeText={setHotel}
          placeholder="Название гостиницы (если есть)..."
          placeholderTextColor="#8B8B8B"
        />

        {/* Питание */}
        <Text style={styles.label}>Питание</Text>
        
        <View style={styles.foodContainer}>
          <View style={styles.foodItem}>
            <Text style={styles.foodText}>Завтрак</Text>
            <Switch
              value={breakfast}
              onValueChange={(value) => handleFoodChange('breakfast', value)}
              trackColor={{ false: '#767577', true: '#81b0ff' }}
              thumbColor={breakfast ? '#f5dd4b' : '#f4f3f4'}
            />
          </View>

          <View style={styles.foodItem}>
            <Text style={styles.foodText}>Обед</Text>
            <Switch
              value={lunch}
              onValueChange={(value) => handleFoodChange('lunch', value)}
              trackColor={{ false: '#767577', true: '#81b0ff' }}
              thumbColor={lunch ? '#f5dd4b' : '#f4f3f4'}
            />
          </View>

          <View style={styles.foodItem}>
            <Text style={styles.foodText}>Ужин</Text>
            <Switch
              value={dinner}
              onValueChange={(value) => handleFoodChange('dinner', value)}
              trackColor={{ false: '#767577', true: '#81b0ff' }}
              thumbColor={dinner ? '#f5dd4b' : '#f4f3f4'}
            />
          </View>

          <View style={styles.foodItem}>
            <Text style={styles.foodText}>Не кормят</Text>
            <Switch
              value={noFood}
              onValueChange={(value) => handleFoodChange('noFood', value)}
              trackColor={{ false: '#767577', true: '#81b0ff' }}
              thumbColor={noFood ? '#f5dd4b' : '#f4f3f4'}
            />
          </View>
        </View>

        {/* Паспорт */}
        <View style={styles.passportContainer}>
          <Text style={styles.label}>Нужен ли паспорт?</Text>
          <Switch
            value={passportRequired}
            onValueChange={setPassportRequired}
            trackColor={{ false: '#767577', true: '#81b0ff' }}
            thumbColor={passportRequired ? '#f5dd4b' : '#f4f3f4'}
          />
        </View>

        {/* Что взять */}
        <Text style={styles.label}>Что нужно взять</Text>
        <TextInput
          style={[styles.textInput, styles.multilineInput]}
          value={whatToTake}
          onChangeText={setWhatToTake}
          placeholder="Список необходимых вещей..."
          placeholderTextColor="#8B8B8B"
          multiline
          numberOfLines={3}
          textAlignVertical="top"
        />

        {/* Информация по приезду */}
        <Text style={styles.label}>Информация по приезду</Text>
        <TextInput
          style={[styles.textInput, styles.multilineInput]}
          value={arrivalInfo}
          onChangeText={setArrivalInfo}
          placeholder="Дополнительная информация о приезде..."
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
            colors={['#34C759', '#28A745']}
            style={styles.submitGradient}
          >
            <Ionicons name="bus" size={20} color="white" />
            <Text style={styles.submitText}>Сохранить переезд</Text>
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>
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
  multilineInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  foodContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 15,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  foodItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  foodText: {
    fontSize: 14,
    color: '#3E2723',
    fontWeight: '500',
  },
  passportContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    marginBottom: 15,
  },
  submitButton: {
    marginTop: 30,
    marginBottom: 20,
    borderRadius: 15,
    overflow: 'hidden',
    shadowColor: '#34C759',
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