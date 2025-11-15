import { Ionicons } from '@expo/vector-icons';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import * as Notifications from 'expo-notifications';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { auth, db } from './firebaseConfig';
import AddMoveScreen from './screens/AddMoveScreen';

// ИМПОРТЫ ВСЕХ ЭКРАНОВ
import AddEventScreen from './screens/AddEventScreen';
import AddReminderScreen from './screens/AddReminderScreen';
import AddSickLeaveScreen from './screens/AddSickLeaveScreen';
import AddTourScreen from './screens/AddTourScreen';
import CalendarScreen from './screens/CalendarScreen';
import ConcertDetailScreen from './screens/ConcertDetailScreen';
import EmployeesListScreen from './screens/EmployeesListScreen';
import LoginScreen from './screens/LoginScreen';
import MyEventsScreen from './screens/MyEventsScreen';
import RemindersScreen from './screens/RemindersScreen';
import SickLeaveScreen from './screens/SickLeaveScreen';

// ИМПОРТ SPLASH SCREEN
import SplashScreen from './components/SplashScreen';

// ✅ НАСТРОЙКА ОБРАБОТЧИКА УВЕДОМЛЕНИЙ
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

const Stack = createNativeStackNavigator();

export default function App() {
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showSplash, setShowSplash] = useState(true);

  // ✅ ОБРАБОТЧИК НАЖАТИЙ НА УВЕДОМЛЕНИЯ
  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('🔔 Пользователь нажал на уведомление:', response);
      const data = response.notification.request.content.data;
      if (data.type === 'scheduled_reminder' && data.reminderId) {
        console.log('📍 Напоминание ID:', data.reminderId);
      }
    });
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        try {
          const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
          if (userDoc.exists()) {
            const role = userDoc.data().role || 'user';
            setUserRole(role);
            console.log('✅ Роль пользователя:', role);
          } else {
            setUserRole('user');
            console.log('⚠️ Документ пользователя не найден, роль: user');
          }
        } catch (error) {
          console.error('❌ Ошибка получения роли:', error);
          setUserRole('user');
        }
        setUser(currentUser);
      } else {
        setUser(null);
        setUserRole(null);
      }
      setLoading(false);
    });
    
    return unsubscribe;
  }, []);

  if (showSplash) {
    return <SplashScreen onAnimationComplete={() => setShowSplash(false)} />;
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Загрузка...</Text>
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!user ? (
          <Stack.Screen name="Login" component={LoginScreen} />
        ) : (
          <>
            <Stack.Screen 
              name="Calendar" 
              component={CalendarScreen}
              initialParams={{ email: user.email, role: userRole }}
            />
            <Stack.Screen name="AddEvent" component={AddEventScreen} />
            <Stack.Screen name="AddTour" component={AddTourScreen} />
            <Stack.Screen name="ConcertDetail" component={ConcertDetailScreen} />
            <Stack.Screen name="MyEvents" component={MyEventsScreen} />
            <Stack.Screen name="SickLeave" component={SickLeaveScreen} />
            <Stack.Screen name="AddSickLeave" component={AddSickLeaveScreen} />
            <Stack.Screen name="EmployeesList" component={EmployeesListScreen} />
            <Stack.Screen name="AddMove" component={AddMoveScreen} />
            <Stack.Screen 
              name="Reminders" 
              component={RemindersScreen}
              initialParams={{ userRole: userRole }}
              options={({ navigation }) => ({
                headerShown: true,
                title: 'Напоминания',
                headerStyle: {
                  backgroundColor: '#FFD700',
                },
                headerTintColor: '#3E2723',
                headerTitleStyle: {
                  fontWeight: 'bold',
                },
                headerRight: () => 
                  userRole === 'admin' ? (
                    <TouchableOpacity 
                      style={styles.addButton}
                      onPress={() => navigation.navigate('AddReminder', { userRole })}
                    >
                      <Ionicons name="add" size={28} color="#3E2723" />
                    </TouchableOpacity>
                  ) : null,
              })}
            />
            <Stack.Screen 
              name="AddReminder" 
              component={AddReminderScreen}
              options={{
                headerShown: true,
                title: 'Новое напоминание',
                headerStyle: {
                  backgroundColor: '#FFD700',
                },
                headerTintColor: '#3E2723',
                headerTitleStyle: {
                  fontWeight: 'bold',
                },
              }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF8DC',
  },
  loadingText: {
    fontSize: 18,
    color: '#333',
    fontWeight: '600',
  },
  addButton: {
    padding: 8,
    marginRight: 15,
  },
});