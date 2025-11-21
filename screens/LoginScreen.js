// screens/LoginScreen.js
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Notifications from 'expo-notifications';
import {
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
} from 'firebase/auth';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { auth, db } from '../firebaseConfig';

const { width } = Dimensions.get('window');

export default function LoginScreen({ navigation }) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Анимация появления полей
  const fadeAnim = new Animated.Value(1);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, [isLogin]);

  const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const validatePassword = (pass) => pass.length >= 8 && /[A-Z]/.test(pass) && /[0-9]/.test(pass);

  const requestPushPermissions = async () => {
    if (Platform.OS === 'web') return;
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Уведомления отключены', 'Вы не будете получать важные напоминания');
    }
  };

  const handleAuth = async () => {
    if (!validateEmail(email)) return Alert.alert('Ошибка', 'Введите корректный email');
    if (!validatePassword(password)) return Alert.alert('Ошибка', 'Пароль: минимум 8 символов, заглавная буква и цифра');

    if (!isLogin && !fullName.trim()) return Alert.alert('Ошибка', 'Введите ФИО');

    setLoading(true);
    try {
      let userCredential;
      if (isLogin) {
        userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
      } else {
        userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
        await setDoc(doc(db, 'users', userCredential.user.uid), {
          fullName: fullName.trim(),
          phone: phone.replace(/\D/g, ''),
          email: email.trim(),
          role: 'user',
          createdAt: serverTimestamp(),
        });
      }

      await requestPushPermissions();
      navigation.replace('Main');
    } catch (err) {
      let message = 'Ошибка сервера';
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') message = 'Неверный email или пароль';
      if (err.code === 'auth/email-already-in-use') message = 'Этот email уже зарегистрирован';
      if (err.code === 'auth/weak-password') message = 'Пароль слишком слабый';
      Alert.alert('Ошибка', message);
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = () => {
    if (!validateEmail(email)) return Alert.alert('Ошибка', 'Введите email');
    Alert.alert('Сброс пароля', `Отправить ссылку на ${email}?`, [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Отправить',
        onPress: async () => {
          try {
            await sendPasswordResetEmail(auth, email);
            Alert.alert('Готово', 'Письмо со ссылкой отправлено');
          } catch {
            Alert.alert('Ошибка', 'Не удалось отправить письмо');
          }
        },
      },
    ]);
  };

  return (
    <LinearGradient colors={['#1a1a1a', '#2d1810']} style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }} keyboardShouldPersistTaps="handled">
          <View style={styles.card}>
            {/* Логотип */}
            <View style={styles.logoContainer}>
              <Ionicons name="musical-notes" size={80} color="#FFD700" />
              <Text style={styles.title}>Воронежский хор</Text>
              <Text style={styles.subtitle}>InfoHor</Text>
            </View>

            {/* Переключатель */}
            <View style={styles.toggleContainer}>
              <TouchableOpacity
                style={[styles.toggleButton, isLogin && styles.toggleActive]}
                onPress={() => setIsLogin(true)}
              >
                <Text style={[styles.toggleText, isLogin && styles.toggleTextActive]}>Вход</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.toggleButton, !isLogin && styles.toggleActive]}
                onPress={() => setIsLogin(false)}
              >
                <Text style={[styles.toggleText, !isLogin && styles.toggleTextActive]}>Регистрация</Text>
              </TouchableOpacity>
            </View>

            <Animated.View style={{ opacity: fadeAnim }}>
              {/* Поле ФИО — только при регистрации */}
              {!isLogin && (
                <View style={styles.inputWrapper}>
                  <Ionicons name="person" size={20} color="#FFD700" style={styles.inputIcon} />
                  <TextInput
                    placeholder="ФИО полностью"
                    placeholderTextColor="#888"
                    style={styles.input}
                    value={fullName}
                    onChangeText={setFullName}
                    autoCapitalize="words"
                  />
                </View>
              )}

              {/* Email */}
              <View style={styles.inputWrapper}>
                <Ionicons name="mail" size={20} color="#FFD700" style={styles.inputIcon} />
                <TextInput
                  placeholder="Email"
                  placeholderTextColor="#888"
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                />
              </View>

              {/* Пароль */}
              <View style={styles.inputWrapper}>
                <Ionicons name="lock-closed" size={20} color="#FFD700" style={styles.inputIcon} />
                <TextInput
                  placeholder="Пароль"
                  placeholderTextColor="#888"
                  style={styles.input}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoComplete="password"
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
                  <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={22} color="#888" />
                </TouchableOpacity>
              </View>

              {/* Телефон — только при регистрации */}
              {!isLogin && (
                <View style={styles.inputWrapper}>
                  <Ionicons name="call" size={20} color="#FFD700" style={styles.inputIcon} />
                  <TextInput
                    placeholder="Телефон (необязательно)"
                    placeholderTextColor="#888"
                    style={styles.input}
                    value={phone}
                    onChangeText={setPhone}
                    keyboardType="phone-pad"
                  />
                </View>
              )}

              {/* Главная кнопка */}
              <TouchableOpacity style={styles.mainButton} onPress={handleAuth} disabled={loading}>
                <LinearGradient
                  colors={['#FFD700', '#C41E3A']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.gradientButton}
                >
                  {loading ? (
                    <ActivityIndicator color="#1a1a1a" size="small" />
                  ) : (
                    <>
                      <Text style={styles.buttonText}>
                        {isLogin ? 'Войти в аккаунт' : 'Создать аккаунт'}
                      </Text>
                      <Ionicons name="arrow-forward" size={24} color="#1a1a1a" style={{ marginLeft: 10 }} />
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              {/* Забыли пароль */}
              {isLogin && (
                <TouchableOpacity onPress={resetPassword} style={styles.linkButton}>
                  <Text style={styles.linkText}>Забыли пароль?</Text>
                </TouchableOpacity>
              )}

              {/* Переключить режим */}
              <Text style={styles.footerText}>
                {isLogin ? 'Нет аккаунта? ' : 'Уже есть аккаунт? '}
                <Text style={styles.linkText} onPress={() => setIsLogin(!isLogin)}>
                  {isLogin ? 'Зарегистрироваться' : 'Войти'}
                </Text>
              </Text>
            </Animated.View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  card: {
    marginHorizontal: 24,
    marginVertical: 40,
    backgroundColor: 'rgba(30, 30, 30, 0.95)',
    borderRadius: 28,
    padding: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.2)',
  },
  logoContainer: { alignItems: 'center', marginBottom: 40 },
  title: { fontSize: 32, fontWeight: '900', color: '#FFD700', marginTop: 16, letterSpacing: 1 },
  subtitle: { fontSize: 18, color: '#C41E3A', fontWeight: '600', letterSpacing: 3 },
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#2a2a2a',
    borderRadius: 16,
    padding: 6,
    marginBottom: 32,
  },
  toggleButton: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  toggleActive: { backgroundColor: '#FFD700' },
  toggleText: { fontSize: 16, fontWeight: '700', color: '#888' },
  toggleTextActive: { color: '#1a1a1a' },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2a2a2a',
    borderRadius: 16,
    marginBottom: 16,
    paddingHorizontal: 20,
    height: 58,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.2)',
  },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, color: '#E0E0E0', fontSize: 16 },
  eyeIcon: { padding: 8 },
  mainButton: { borderRadius: 20, overflow: 'hidden', marginTop: 24, elevation: 10, shadowColor: '#FFD700' },
  gradientButton: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 18 },
  buttonText: { color: '#1a1a1a', fontSize: 18, fontWeight: '800' },
  linkButton: { marginTop: 20, alignSelf: 'center' },
  linkText: { color: '#FFD700', fontSize: 15, fontWeight: '600' },
  footerText: { textAlign: 'center', marginTop: 30, color: '#888', fontSize: 14 },
});