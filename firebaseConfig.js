import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApps, initializeApp } from 'firebase/app';
import { getAuth, getReactNativePersistence, initializeAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDLjbWUxK6Afl9Ipv3bq4cWc22KBV8GpKI",
  authDomain: "fir-test-34232.firebaseapp.com",
  projectId: "fir-test-34232",
  storageBucket: "fir-test-34232.firebasestorage.app",
  messagingSenderId: "829699868652",
  appId: "1:829699868652:web:142e6026041fbaf7f2e2c9"
};

// ✅ Инициализация Firebase
let app;
if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
  console.log('✅ Firebase App инициализирован');
} else {
  app = getApps()[0];
  console.log('✅ Firebase App уже инициализирован');
}

// ✅ Инициализация Auth с правильным порядком
let auth;
try {
  // Сначала пытаемся инициализировать с persistence
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage)
  });
  console.log('✅ Firebase Auth инициализирован с AsyncStorage persistence');
} catch (error) {
  if (error.code === 'auth/already-initialized') {
    // Если уже инициализирован, получаем существующий экземпляр
    auth = getAuth(app);
    console.log('✅ Firebase Auth уже инициализирован, используем существующий');
  } else {
    console.error('❌ Критическая ошибка инициализации Auth:', error);
    throw error;
  }
}

// ✅ Инициализация Firestore
const db = getFirestore(app);
console.log('✅ Firestore инициализирован');

// ✅ ВАЖНО: Экспортируем после инициализации
export { app, auth, db };

// Дополнительный экспорт для совместимости
export const firestore = db;
export default app;