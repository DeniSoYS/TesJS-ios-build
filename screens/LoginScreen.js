import { Ionicons } from '@expo/vector-icons';
import * as Device from 'expo-device';
import { LinearGradient } from 'expo-linear-gradient';
import * as Notifications from 'expo-notifications';
import {
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithEmailAndPassword
} from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Image,
  KeyboardAvoidingView,
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

const getResponsiveSize = (size) => {
  if (isSmallDevice) return size * 0.85;
  return size;
};

const getResponsiveFontSize = (size) => {
  const baseSize = getResponsiveSize(size);
  return Math.round(baseSize);
};

// ========================================
// 🔒 ВАЛИДАЦИЯ
// ========================================

const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email) return 'Email обязателен';
  if (!emailRegex.test(email)) return 'Неверный формат email';
  return null;
};

const validatePassword = (password) => {
  if (!password) return 'Пароль обязателен';
  if (password.length < 8) return 'Минимум 8 символов';
  
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  
  if (!hasUpperCase || !hasLowerCase || !hasNumbers) {
    return 'Пароль должен содержать заглавные, строчные буквы и цифры';
  }
  
  return null;
};

const validatePhone = (phone) => {
  const cleanPhone = phone.replace(/\D/g, '');
  if (cleanPhone.length < 11) return 'Введите корректный номер телефона';
  return null;
};

const validateFullName = (name) => {
  if (!name || name.trim().length < 2) return 'ФИО должно содержать минимум 2 символа';
  return null;
};

// ========================================
// 🔔 PUSH-УВЕДОМЛЕНИЯ
// ========================================

async function registerForPushNotificationsAsync() {
  console.log('🚀 Регистрация push-уведомлений...');
  
  try {
    if (!Device.isDevice) {
      console.log('❌ Не физическое устройство - используем development токен');
      return {
        token: 'ExponentPushToken[Development_Device]',
        status: 'development'
      };
    }

    console.log('📱 Физическое устройство подтверждено');

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    console.log('🔐 Текущий статус разрешений:', existingStatus);
    
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      console.log('🔄 Запрашиваем разрешения...');
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
      console.log('🔄 Новый статус разрешений:', finalStatus);
    }
    
    if (finalStatus !== 'granted') {
      console.log('❌ Разрешения не предоставлены');
      Alert.alert(
        'Уведомления отключены',
        'Для получения уведомлений о концертах и напоминаниях разрешите уведомления в настройках.',
        [{ text: 'OK' }]
      );
      return {
        token: null,
        status: 'denied'
      };
    }

    console.log('✅ Разрешения получены, получаем токен...');

    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: '5f10f769-f924-4cff-87fa-58297533058a'
    });
    const token = tokenData.data;
    
    console.log('✅ Токен успешно получен:', token);

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FFD700',
      });
      console.log('✅ Android канал настроен');
    }

    return {
      token,
      status: 'active'
    };

  } catch (error) {
    console.error('❌ Ошибка регистрации push-уведомлений:', error);
    return {
      token: 'ExponentPushToken[Error_Fallback]',
      status: 'error'
    };
  }
}

// ========================================
// 🔐 RATE LIMITING (защита от спама)
// ========================================

class RateLimiter {
  constructor() {
    this.attempts = {};
  }

  canAttempt(key, maxAttempts = 5, windowMs = 60000) {
    const now = Date.now();
    
    if (!this.attempts[key]) {
      this.attempts[key] = [];
    }

    // Удаляем старые попытки
    this.attempts[key] = this.attempts[key].filter(
      timestamp => now - timestamp < windowMs
    );

    if (this.attempts[key].length >= maxAttempts) {
      const oldestAttempt = Math.min(...this.attempts[key]);
      const waitTime = Math.ceil((windowMs - (now - oldestAttempt)) / 1000);
      return {
        allowed: false,
        waitTime
      };
    }

    this.attempts[key].push(now);
    return { allowed: true };
  }
}

const rateLimiter = new RateLimiter();

// ========================================
// 📱 ФОРМАТИРОВАНИЕ ТЕЛЕФОНА
// ========================================

const formatPhone = (text) => {
  const cleaned = text.replace(/\D/g, '').slice(0, 11);
  
  if (!cleaned || cleaned === '7') return '+7';
  
  // Убедимся что начинается с 7
  let number = cleaned;
  if (number[0] === '8') {
    number = '7' + number.slice(1);
  } else if (number[0] !== '7') {
    number = '7' + number;
  }
  
  const match = number.match(/^7(\d{0,3})(\d{0,3})(\d{0,2})(\d{0,2})$/);
  if (!match) return text;
  
  const [, code, first, second, third] = match;
  
  let formatted = '+7';
  if (code) formatted += ` (${code}${code.length === 3 ? ')' : ''}`;
  if (first) formatted += ` ${first}`;
  if (second) formatted += `-${second}`;
  if (third) formatted += `-${third}`;
  
  return formatted;
};

// ========================================
// 🎨 КОМПОНЕНТ LoginScreen
// ========================================

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('+7');
  const [showPassword, setShowPassword] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // Фокус состояния
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [fullNameFocused, setFullNameFocused] = useState(false);
  const [phoneFocused, setPhoneFocused] = useState(false);
  
  // Ошибки валидации
  const [errors, setErrors] = useState({});
  
  const [fadeAnim] = useState(new Animated.Value(0));

  React.useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();
  }, []);

  const toggleMode = () => {
    setIsRegistering(!isRegistering);
    setEmail('');
    setPassword('');
    setFullName('');
    setPhone('+7');
    setErrors({});
  };

  // ========================================
  // 💾 СОЗДАНИЕ/ОБНОВЛЕНИЕ ДОКУМЕНТА ПОЛЬЗОВАТЕЛЯ
  // ========================================

  const createUserDocument = async (user, additionalData = {}) => {
    if (!user) return;
    
    const userRef = doc(db, 'users', user.uid);
    
    try {
      const userDoc = await getDoc(userRef);
      
      console.log('🔔 Получаем push token...');
      const pushTokenData = await registerForPushNotificationsAsync();
      console.log('🔔 Push token получен:', pushTokenData);
      
      if (!userDoc.exists()) {
        await setDoc(userRef, {
          email: user.email,
          role: 'user',
          pushToken: pushTokenData.token,
          pushTokenStatus: pushTokenData.status,
          pushTokenUpdatedAt: serverTimestamp(),
          createdAt: serverTimestamp(),
          ...additionalData
        });
        console.log('✅ Документ пользователя создан в Firestore');
      } else {
        await setDoc(userRef, {
          pushToken: pushTokenData.token,
          pushTokenStatus: pushTokenData.status,
          pushTokenUpdatedAt: serverTimestamp(),
          lastLoginAt: serverTimestamp(),
        }, { merge: true });
        console.log('✅ Push token обновлен в существующем документе');
      }
    } catch (error) {
      console.error('❌ Ошибка создания/обновления документа пользователя:', error);
    }
  };

  // ========================================
  // 🔑 ВХОД В СИСТЕМУ
  // ========================================

  const handleLogin = async () => {
    // Очистка ошибок
    setErrors({});

    // Валидация
    const emailError = validateEmail(email);
    const passwordError = password.length < 6 ? 'Минимум 6 символов' : null;

    if (emailError || passwordError) {
      setErrors({
        email: emailError,
        password: passwordError
      });
      return;
    }

    // Rate limiting
    const rateCheck = rateLimiter.canAttempt(email);
    if (!rateCheck.allowed) {
      Alert.alert(
        'Слишком много попыток',
        `Попробуйте снова через ${rateCheck.waitTime} секунд`
      );
      return;
    }

    setIsLoading(true);

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      await createUserDocument(userCredential.user);
      Alert.alert('Успех!', 'Добро пожаловать!');
    } catch (error) {
      console.error(error);
      
      let errorMessage = 'Произошла ошибка';
      
      switch (error.code) {
        case 'auth/user-not-found':
          errorMessage = 'Пользователь не найден';
          break;
        case 'auth/wrong-password':
          errorMessage = 'Неверный пароль';
          break;
        case 'auth/invalid-email':
          errorMessage = 'Неверный формат email';
          break;
        case 'auth/invalid-credential':
          errorMessage = 'Неверный email или пароль';
          break;
        case 'auth/too-many-requests':
          errorMessage = 'Слишком много попыток. Попробуйте позже';
          break;
        case 'auth/network-request-failed':
          errorMessage = 'Ошибка сети. Проверьте подключение к интернету';
          break;
        default:
          errorMessage = error.message;
      }
      
      Alert.alert('Ошибка входа', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // ========================================
  // 📝 РЕГИСТРАЦИЯ
  // ========================================

  const handleRegister = async () => {
    // Очистка ошибок
    setErrors({});

    // Валидация всех полей
    const emailError = validateEmail(email);
    const passwordError = validatePassword(password);
    const fullNameError = validateFullName(fullName);
    const phoneError = validatePhone(phone);

    if (emailError || passwordError || fullNameError || phoneError) {
      setErrors({
        email: emailError,
        password: passwordError,
        fullName: fullNameError,
        phone: phoneError
      });
      
      // Показываем первую ошибку
      const firstError = emailError || passwordError || fullNameError || phoneError;
      Alert.alert('Ошибка валидации', firstError);
      return;
    }

    // Rate limiting
    const rateCheck = rateLimiter.canAttempt(email);
    if (!rateCheck.allowed) {
      Alert.alert(
        'Слишком много попыток',
        `Попробуйте снова через ${rateCheck.waitTime} секунд`
      );
      return;
    }

    setIsLoading(true);

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      await createUserDocument(userCredential.user, {
        fullName: fullName.trim(),
        phone: phone
      });
      
      Alert.alert('Успех!', 'Аккаунт создан! Добро пожаловать!');
    } catch (error) {
      console.error(error);
      
      let errorMessage = 'Произошла ошибка';
      
      switch (error.code) {
        case 'auth/email-already-in-use':
          errorMessage = 'Этот email уже используется';
          break;
        case 'auth/weak-password':
          errorMessage = 'Пароль слишком слабый';
          break;
        case 'auth/invalid-email':
          errorMessage = 'Неверный формат email';
          break;
        case 'auth/network-request-failed':
          errorMessage = 'Ошибка сети. Проверьте подключение к интернету';
          break;
        default:
          errorMessage = error.message;
      }
      
      Alert.alert('Ошибка регистрации', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // ========================================
  // 🔄 ВОССТАНОВЛЕНИЕ ПАРОЛЯ
  // ========================================

  const handleForgotPassword = async () => {
    const emailError = validateEmail(email);
    
    if (emailError) {
      Alert.alert(
        'Введите email',
        'Пожалуйста, введите ваш email в поле выше для восстановления пароля'
      );
      return;
    }

    setIsLoading(true);

    try {
      await sendPasswordResetEmail(auth, email);
      Alert.alert(
        'Письмо отправлено',
        `Ссылка для восстановления пароля отправлена на ${email}. Проверьте почту.`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error(error);
      
      let errorMessage = 'Не удалось отправить письмо';
      
      switch (error.code) {
        case 'auth/user-not-found':
          errorMessage = 'Пользователь с таким email не найден';
          break;
        case 'auth/invalid-email':
          errorMessage = 'Неверный формат email';
          break;
        case 'auth/network-request-failed':
          errorMessage = 'Ошибка сети. Проверьте подключение к интернету';
          break;
        default:
          errorMessage = error.message;
      }
      
      Alert.alert('Ошибка', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // ========================================
  // 📱 ОБРАБОТКА ТЕЛЕФОНА
  // ========================================

  const handlePhoneChange = (text) => {
    setPhone(formatPhone(text));
    // Очищаем ошибку телефона при изменении
    if (errors.phone) {
      setErrors({ ...errors, phone: null });
    }
  };

  const handlePhoneKeyPress = (e) => {
    if (e.nativeEvent.key === 'Backspace') {
      const numbers = phone.replace(/\D/g, '');
      if (numbers.length <= 1) {
        setPhone('+7');
      }
    }
  };

  // ========================================
  // 🎨 RENDER
  // ========================================

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <LinearGradient
        colors={['#8c7c49ff', '#FFE4B5', '#FFD700']}
        style={styles.gradientBackground}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <Animated.View style={{ opacity: fadeAnim, flex: 1 }}>
          <ScrollView 
            contentContainerStyle={styles.scrollContainer}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Логотип */}
            <View style={styles.logoContainer}>
              <Image
                source={require('../assets/logo_hor.png')}
                style={styles.logo}
                resizeMode="contain"
              />
            </View>

            {/* Форма */}
            <View style={styles.formContainer}>
              {/* Заголовок */}
              <View style={styles.titleContainer}>
                <Text style={styles.title}>Присоединись к хору</Text>
              </View>
              
              <Text style={styles.subtitle}>
                {isRegistering ? 'Создайте новый аккаунт' : 'Войдите в свой аккаунт'}
              </Text>

              {/* ПОЛЯ РЕГИСТРАЦИИ */}
              {isRegistering && (
                <>
                  {/* ФИО */}
                  <LinearGradient
                    colors={fullNameFocused ? ['#a66464ff', '#FFD700'] : ['#FFF8E1', '#FFE4B5']}
                    style={[
                      styles.inputGradientContainer, 
                      fullNameFocused && styles.inputContainerFocused,
                      errors.fullName && styles.inputError
                    ]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <View style={styles.inputInnerContainer}>
                      <Ionicons name="person-circle-outline" size={20} color="#8B8B8B" />
                      <TextInput
                        style={styles.input}
                        placeholder="ФИО"
                        placeholderTextColor="#8B8B8B"
                        value={fullName}
                        onChangeText={(text) => {
                          setFullName(text);
                          if (errors.fullName) setErrors({ ...errors, fullName: null });
                        }}
                        onFocus={() => setFullNameFocused(true)}
                        onBlur={() => setFullNameFocused(false)}
                        autoCapitalize="words"
                        returnKeyType="next"
                        editable={!isLoading}
                      />
                    </View>
                  </LinearGradient>
                  {errors.fullName && (
                    <Text style={styles.errorText}>{errors.fullName}</Text>
                  )}

                  {/* Телефон */}
                  <LinearGradient
                    colors={phoneFocused ? ['#a66464ff', '#FFD700'] : ['#FFF8E1', '#FFE4B5']}
                    style={[
                      styles.inputGradientContainer, 
                      phoneFocused && styles.inputContainerFocused,
                      errors.phone && styles.inputError
                    ]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <View style={styles.inputInnerContainer}>
                      <Ionicons name="call-outline" size={20} color="#8B8B8B" />
                      <TextInput
                        style={styles.input}
                        placeholder="+7 (___) ___-__-__"
                        placeholderTextColor="#8B8B8B"
                        value={phone}
                        onChangeText={handlePhoneChange}
                        onKeyPress={handlePhoneKeyPress}
                        keyboardType="phone-pad"
                        onFocus={() => setPhoneFocused(true)}
                        onBlur={() => setPhoneFocused(false)}
                        maxLength={18}
                        returnKeyType="next"
                        editable={!isLoading}
                      />
                    </View>
                  </LinearGradient>
                  {errors.phone && (
                    <Text style={styles.errorText}>{errors.phone}</Text>
                  )}
                </>
              )}

              {/* Email */}
              <LinearGradient
                colors={emailFocused ? ['#a66464ff', '#FFD700'] : ['#FFF8E1', '#FFE4B5']}
                style={[
                  styles.inputGradientContainer, 
                  emailFocused && styles.inputContainerFocused,
                  errors.email && styles.inputError
                ]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={styles.inputInnerContainer}>
                  <Ionicons name="mail-outline" size={20} color="#8B8B8B" />
                  <TextInput
                    style={styles.input}
                    placeholder="Email"
                    placeholderTextColor="#8B8B8B"
                    value={email}
                    onChangeText={(text) => {
                      setEmail(text);
                      if (errors.email) setErrors({ ...errors, email: null });
                    }}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    onFocus={() => setEmailFocused(true)}
                    onBlur={() => setEmailFocused(false)}
                    returnKeyType="next"
                    editable={!isLoading}
                  />
                </View>
              </LinearGradient>
              {errors.email && (
                <Text style={styles.errorText}>{errors.email}</Text>
              )}

              {/* Пароль */}
              <LinearGradient
                colors={passwordFocused ? ['#a66464ff', '#FFD700'] : ['#FFF8E1', '#FFE4B5']}
                style={[
                  styles.inputGradientContainer, 
                  passwordFocused && styles.inputContainerFocused,
                  errors.password && styles.inputError
                ]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={styles.inputInnerContainer}>
                  <Ionicons name="lock-closed-outline" size={20} color="#8B8B8B" />
                  <TextInput
                    style={styles.input}
                    placeholder="Пароль"
                    placeholderTextColor="#8B8B8B"
                    value={password}
                    onChangeText={(text) => {
                      setPassword(text);
                      if (errors.password) setErrors({ ...errors, password: null });
                    }}
                    secureTextEntry={!showPassword}
                    onFocus={() => setPasswordFocused(true)}
                    onBlur={() => setPasswordFocused(false)}
                    returnKeyType="done"
                    editable={!isLoading}
                  />
                  <TouchableOpacity 
                    onPress={() => setShowPassword(!showPassword)}
                    disabled={isLoading}
                  >
                    <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={20} color="#8B8B8B" />
                  </TouchableOpacity>
                </View>
              </LinearGradient>
              {errors.password && (
                <Text style={styles.errorText}>{errors.password}</Text>
              )}

              {/* Подсказка для пароля при регистрации */}
              {isRegistering && (
                <Text style={styles.passwordHint}>
                  Минимум 8 символов, включая заглавные, строчные буквы и цифры
                </Text>
              )}

              {/* Забыли пароль? */}
              {!isRegistering && (
                <TouchableOpacity 
                  onPress={handleForgotPassword}
                  disabled={isLoading}
                >
                  <Text style={styles.forgotText}>Забыли пароль?</Text>
                </TouchableOpacity>
              )}

              {/* Основная кнопка */}
              <TouchableOpacity
                onPress={isRegistering ? handleRegister : handleLogin}
                style={styles.mainButtonWrapper}
                disabled={isLoading}
              >
                <LinearGradient
                  colors={isLoading ? ['#CCCCCC', '#999999'] : ['#8d8b84ff', '#DAA520']}
                  style={styles.mainButtonGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text style={styles.buttonText}>
                      {isRegistering ? 'Создать аккаунт' : 'Войти'}
                    </Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              {/* Переключение режимов */}
              <View style={styles.switchSection}>
                {!isRegistering ? (
                  <TouchableOpacity 
                    onPress={toggleMode} 
                    style={styles.createButton}
                    disabled={isLoading}
                  >
                    <Text style={styles.createText}>Создать новый аккаунт</Text>
                  </TouchableOpacity>
                ) : (
                  <View style={styles.switchRow}>
                    <Text style={styles.switchText}>Уже есть аккаунт?</Text>
                    <TouchableOpacity 
                      onPress={toggleMode} 
                      style={styles.switchButton}
                      disabled={isLoading}
                    >
                      <Text style={styles.switchButtonText}>Войти</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </View>
          </ScrollView>
        </Animated.View>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
}

// ========================================
// 🎨 СТИЛИ
// ========================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradientBackground: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingBottom: 20,
  },
  logoContainer: {
    alignItems: 'center',
    paddingTop: getResponsiveSize(40),
    paddingBottom: getResponsiveSize(20),
  },
  logo: {
    width: getResponsiveSize(220),
    height: getResponsiveSize(220),
    maxWidth: '80%',
  },
  formContainer: {
    backgroundColor: 'rgba(250, 243, 221, 0.95)',
    borderRadius: getResponsiveSize(24),
    paddingHorizontal: getResponsiveSize(28),
    paddingVertical: getResponsiveSize(30),
    marginHorizontal: getResponsiveSize(20),
    marginBottom: getResponsiveSize(30),
    shadowColor: '#8B6B4F',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(218, 165, 32, 0.2)',
  },
  titleContainer: {
    marginBottom: getResponsiveSize(8),
  },
  title: {
    fontSize: getResponsiveFontSize(24),
    fontWeight: 'bold',
    color: '#3E2723',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: getResponsiveFontSize(14),
    color: '#8B8B8B',
    textAlign: 'center',
    marginBottom: getResponsiveSize(25),
  },
  inputGradientContainer: {
    borderRadius: getResponsiveSize(12),
    padding: 2,
    marginBottom: getResponsiveSize(8),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
    minHeight: getResponsiveSize(56),
  },
  inputInnerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingHorizontal: getResponsiveSize(15),
    paddingVertical: getResponsiveSize(16),
    flex: 1,
  },
  inputContainerFocused: {
    shadowColor: '#DAA520',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  inputError: {
    shadowColor: '#FF0000',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  input: {
    flex: 1,
    paddingVertical: 0,
    paddingHorizontal: getResponsiveSize(10),
    fontSize: getResponsiveFontSize(15),
    color: '#3E2723',
  },
  errorText: {
    color: '#FF0000',
    fontSize: getResponsiveFontSize(12),
    marginBottom: getResponsiveSize(8),
    marginLeft: getResponsiveSize(5),
  },
  passwordHint: {
    color: '#8B8B8B',
    fontSize: getResponsiveFontSize(11),
    marginBottom: getResponsiveSize(16),
    marginLeft: getResponsiveSize(5),
    fontStyle: 'italic',
  },
  mainButtonWrapper: {
    borderRadius: getResponsiveSize(12),
    overflow: 'hidden',
    marginBottom: getResponsiveSize(15),
    marginTop: getResponsiveSize(5),
  },
  mainButtonGradient: {
    paddingVertical: getResponsiveSize(16),
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: getResponsiveSize(50),
  },
  buttonText: {
    color: 'white',
    fontSize: getResponsiveFontSize(16),
    textAlign: 'center',
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  forgotText: {
    color: '#8B8B8B',
    marginBottom: getResponsiveSize(25),
    fontWeight: '600',
    textAlign: 'center',
    fontSize: getResponsiveFontSize(13),
  },
  switchSection: {
    alignItems: 'center',
    marginTop: getResponsiveSize(15),
  },
  createButton: {
    paddingVertical: getResponsiveSize(14),
    borderRadius: getResponsiveSize(10),
    width: '100%',
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#DAA520',
  },
  createText: {
    color: '#DAA520',
    fontSize: getResponsiveFontSize(14),
    textAlign: 'center',
    fontWeight: '600',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: getResponsiveSize(8),
  },
  switchText: {
    color: '#8B8B8B',
    fontSize: getResponsiveFontSize(14),
    marginRight: getResponsiveSize(8),
  },
  switchButton: {
    backgroundColor: 'rgba(255, 248, 225, 0.7)',
    paddingVertical: getResponsiveSize(6),
    paddingHorizontal: getResponsiveSize(12),
    borderRadius: getResponsiveSize(6),
    borderWidth: 1,
    borderColor: '#DAA520',
  },
  switchButtonText: {
    color: '#DAA520',
    fontSize: getResponsiveFontSize(14),
    fontWeight: '600',
  },
});