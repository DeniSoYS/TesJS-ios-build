import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApps, initializeApp } from 'firebase/app';
import { browserLocalPersistence, getAuth, getReactNativePersistence, initializeAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { Platform } from 'react-native';

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

// ✅ Инициализация Auth с учётом платформы
let auth;
try {
  // Выбираем persistence в зависимости от платформы
  const persistence = Platform.OS === 'web' 
    ? browserLocalPersistence 
    : getReactNativePersistence(AsyncStorage);

  auth = initializeAuth(app, { persistence });
  console.log(`✅ Firebase Auth инициализирован для ${Platform.OS}`);
} catch (error) {
  if (error.code === 'auth/already-initialized') {
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

// ✅ Экспорт
export { app, auth, db };
export const firestore = db;
export default app;