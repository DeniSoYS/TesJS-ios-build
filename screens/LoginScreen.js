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

// ========================================
// 🔒 ВАЛИДАЦИЯ (без изменений)
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
// 🔔 PUSH-УВЕДОМЛЕНИЯ (без изменений)
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
// 🔐 RATE LIMITING (без изменений)
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
// 📱 ФОРМАТИРОВАНИЕ ТЕЛЕФОНА (без изменений)
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
// 🎨 КОМПОНЕНТ LoginScreen (ОБНОВЛЕННЫЙ ДИЗАЙН)
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
  // 💾 СОЗДАНИЕ/ОБНОВЛЕНИЕ ДОКУМЕНТА ПОЛЬЗОВАТЕЛЯ (без изменений)
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
  // 🔑 ВХОД В СИСТЕМУ (без изменений)
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
  // 📝 РЕГИСТРАЦИЯ (без изменений)
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
  // 🔄 ВОССТАНОВЛЕНИЕ ПАРОЛЯ (без изменений)
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
  // 📱 ОБРАБОТКА ТЕЛЕФОНА (без изменений)
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
  // 🎨 RENDER (ОБНОВЛЕННЫЙ ДИЗАЙН)
  // ========================================

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <LinearGradient
        colors={['#0a0a0a', '#1a1a1a', '#2a2a2a']}
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
            {/* Декоративные элементы как в CalendarScreen */}
            <View style={styles.backgroundDecor}>
              <View style={[styles.decorCircle, styles.decorCircle1]} />
              <View style={[styles.decorCircle, styles.decorCircle2]} />
              <View style={[styles.decorCircle, styles.decorCircle3]} />
            </View>

            {/* Логотип */}
            <View style={styles.logoContainer}>
              <LinearGradient
                colors={['#FFD700', '#FFA500']}
                style={styles.logoGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Ionicons name="musical-notes" size={getResponsiveSize(60)} color="#1a1a1a" />
              </LinearGradient>
              <Text style={styles.appTitle}>Хоровой Календарь</Text>
              <Text style={styles.appSubtitle}>Управление концертами и гастролями</Text>
            </View>

            {/* Форма */}
            <View style={styles.formContainer}>
              {/* Заголовок */}
              <View style={styles.titleSection}>
                <View style={styles.titleIconContainer}>
                  <LinearGradient
                    colors={['#FFD700', '#FFA500']}
                    style={styles.titleIconGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <Ionicons 
                      name={isRegistering ? "person-add" : "log-in"} 
                      size={getResponsiveSize(24)} 
                      color="#1a1a1a" 
                    />
                  </LinearGradient>
                </View>
                <View style={styles.titleTextContainer}>
                  <Text style={styles.mainTitle}>
                    {isRegistering ? 'Создание аккаунта' : 'Вход в систему'}
                  </Text>
                  <Text style={styles.subtitle}>
                    {isRegistering ? 'Присоединитесь к хору' : 'Добро пожаловать обратно'}
                  </Text>
                </View>
              </View>

              {/* ПОЛЯ РЕГИСТРАЦИИ */}
              {isRegistering && (
                <>
                  {/* ФИО */}
                  <View style={styles.inputSection}>
                    <Text style={styles.inputLabel}>ФИО *</Text>
                    <LinearGradient
                      colors={fullNameFocused ? ['rgba(255, 215, 0, 0.3)', 'rgba(255, 165, 0, 0.2)'] : ['rgba(42, 42, 42, 0.8)', 'rgba(35, 35, 35, 0.9)']}
                      style={[
                        styles.inputContainer, 
                        fullNameFocused && styles.inputContainerFocused,
                        errors.fullName && styles.inputError
                      ]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    >
                      <View style={styles.inputInnerContainer}>
                        <Ionicons name="person" size={20} color={fullNameFocused ? "#FFD700" : "#888"} />
                        <TextInput
                          style={styles.input}
                          placeholder="Введите ваше ФИО"
                          placeholderTextColor="#666"
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
                  </View>

                  {/* Телефон */}
                  <View style={styles.inputSection}>
                    <Text style={styles.inputLabel}>Телефон *</Text>
                    <LinearGradient
                      colors={phoneFocused ? ['rgba(255, 215, 0, 0.3)', 'rgba(255, 165, 0, 0.2)'] : ['rgba(42, 42, 42, 0.8)', 'rgba(35, 35, 35, 0.9)']}
                      style={[
                        styles.inputContainer, 
                        phoneFocused && styles.inputContainerFocused,
                        errors.phone && styles.inputError
                      ]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    >
                      <View style={styles.inputInnerContainer}>
                        <Ionicons name="call" size={20} color={phoneFocused ? "#FFD700" : "#888"} />
                        <TextInput
                          style={styles.input}
                          placeholder="+7 (___) ___-__-__"
                          placeholderTextColor="#666"
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
                  </View>
                </>
              )}

              {/* Email */}
              <View style={styles.inputSection}>
                <Text style={styles.inputLabel}>Email *</Text>
                <LinearGradient
                  colors={emailFocused ? ['rgba(255, 215, 0, 0.3)', 'rgba(255, 165, 0, 0.2)'] : ['rgba(42, 42, 42, 0.8)', 'rgba(35, 35, 35, 0.9)']}
                  style={[
                    styles.inputContainer, 
                    emailFocused && styles.inputContainerFocused,
                    errors.email && styles.inputError
                  ]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <View style={styles.inputInnerContainer}>
                    <Ionicons name="mail" size={20} color={emailFocused ? "#FFD700" : "#888"} />
                    <TextInput
                      style={styles.input}
                      placeholder="your@email.com"
                      placeholderTextColor="#666"
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
              </View>

              {/* Пароль */}
              <View style={styles.inputSection}>
                <Text style={styles.inputLabel}>Пароль *</Text>
                <LinearGradient
                  colors={passwordFocused ? ['rgba(255, 215, 0, 0.3)', 'rgba(255, 165, 0, 0.2)'] : ['rgba(42, 42, 42, 0.8)', 'rgba(35, 35, 35, 0.9)']}
                  style={[
                    styles.inputContainer, 
                    passwordFocused && styles.inputContainerFocused,
                    errors.password && styles.inputError
                  ]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <View style={styles.inputInnerContainer}>
                    <Ionicons name="lock-closed" size={20} color={passwordFocused ? "#FFD700" : "#888"} />
                    <TextInput
                      style={styles.input}
                      placeholder="Введите пароль"
                      placeholderTextColor="#666"
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
                      <Ionicons 
                        name={showPassword ? 'eye-off' : 'eye'} 
                        size={20} 
                        color={passwordFocused ? "#FFD700" : "#888"} 
                      />
                    </TouchableOpacity>
                  </View>
                </LinearGradient>
                {errors.password && (
                  <Text style={styles.errorText}>{errors.password}</Text>
                )}
              </View>

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
                  style={styles.forgotButton}
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
                  colors={isLoading ? ['#666', '#444'] : ['#FFD700', '#FFA500']}
                  style={styles.mainButtonGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#1a1a1a" size="small" />
                  ) : (
                    <View style={styles.buttonContent}>
                      <Ionicons 
                        name={isRegistering ? "person-add" : "log-in"} 
                        size={20} 
                        color="#1a1a1a" 
                      />
                      <Text style={styles.buttonText}>
                        {isRegistering ? 'Создать аккаунт' : 'Войти в систему'}
                      </Text>
                    </View>
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
                    <Text style={styles.createText}>Нет аккаунта? </Text>
                    <Text style={styles.createTextBold}>Зарегистрироваться</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity 
                    onPress={toggleMode} 
                    style={styles.createButton}
                    disabled={isLoading}
                  >
                    <Text style={styles.createText}>Уже есть аккаунт? </Text>
                    <Text style={styles.createTextBold}>Войти</Text>
                  </TouchableOpacity>
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
// 🎨 СТИЛИ (ОБНОВЛЕННЫЕ ПОД ТЕМНУЮ ТЕМУ)
// ========================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  gradientBackground: {
    flex: 1,
  },
  backgroundDecor: {
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
  decorCircle3: {
    width: getResponsiveSize(100),
    height: getResponsiveSize(100),
    backgroundColor: '#DAA520',
    top: getResponsiveSize(40),
    left: getResponsiveSize(30),
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingBottom: 20,
  },
  logoContainer: {
    alignItems: 'center',
    paddingTop: getResponsiveSize(40),
    paddingBottom: getResponsiveSize(30),
  },
  logoGradient: {
    width: getResponsiveSize(80),
    height: getResponsiveSize(80),
    borderRadius: getResponsiveSize(20),
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: getResponsiveSize(15),
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 5,
  },
  appTitle: {
    fontSize: getResponsiveFontSize(24),
    fontWeight: '800',
    color: '#E0E0E0',
    textAlign: 'center',
    letterSpacing: 0.5,
    marginBottom: getResponsiveSize(5),
  },
  appSubtitle: {
    fontSize: getResponsiveFontSize(14),
    color: '#888',
    textAlign: 'center',
    fontWeight: '500',
  },
  formContainer: {
    backgroundColor: 'rgba(26, 26, 26, 0.9)',
    borderRadius: getResponsiveSize(25),
    paddingHorizontal: getResponsiveSize(25),
    paddingVertical: getResponsiveSize(30),
    marginHorizontal: getResponsiveSize(20),
    marginBottom: getResponsiveSize(30),
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.2)',
  },
  titleSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: getResponsiveSize(25),
    backgroundColor: 'rgba(42, 42, 42, 0.6)',
    paddingHorizontal: getResponsiveSize(16),
    paddingVertical: getResponsiveSize(14),
    borderRadius: getResponsiveSize(16),
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.2)',
  },
  titleIconContainer: {
    marginRight: getResponsiveSize(14),
  },
  titleIconGradient: {
    width: getResponsiveSize(44),
    height: getResponsiveSize(44),
    borderRadius: getResponsiveSize(12),
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
    fontWeight: '700',
    color: '#E0E0E0',
    letterSpacing: 0.3,
    marginBottom: getResponsiveSize(2),
  },
  subtitle: {
    fontSize: getResponsiveFontSize(12),
    color: '#999',
    fontWeight: '500',
  },
  inputSection: {
    marginBottom: getResponsiveSize(20),
  },
  inputLabel: {
    fontSize: getResponsiveFontSize(14),
    fontWeight: '600',
    color: '#E0E0E0',
    marginBottom: getResponsiveSize(8),
    marginLeft: getResponsiveSize(5),
  },
  inputContainer: {
    borderRadius: getResponsiveSize(12),
    padding: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  inputContainerFocused: {
    shadowColor: '#FFD700',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  inputError: {
    shadowColor: '#FF6B6B',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  inputInnerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(35, 35, 35, 0.9)',
    borderRadius: getResponsiveSize(11),
    paddingHorizontal: getResponsiveSize(15),
    paddingVertical: getResponsiveSize(15),
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.1)',
  },
  input: {
    flex: 1,
    paddingVertical: 0,
    paddingHorizontal: getResponsiveSize(10),
    fontSize: getResponsiveFontSize(15),
    color: '#E0E0E0',
  },
  errorText: {
    color: '#FF6B6B',
    fontSize: getResponsiveFontSize(12),
    marginTop: getResponsiveSize(5),
    marginLeft: getResponsiveSize(5),
  },
  passwordHint: {
    color: '#888',
    fontSize: getResponsiveFontSize(11),
    marginBottom: getResponsiveSize(20),
    marginLeft: getResponsiveSize(5),
    fontStyle: 'italic',
    textAlign: 'center',
  },
  forgotButton: {
    alignSelf: 'center',
    marginBottom: getResponsiveSize(25),
  },
  forgotText: {
    color: '#FFD700',
    fontSize: getResponsiveFontSize(13),
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  mainButtonWrapper: {
    borderRadius: getResponsiveSize(15),
    overflow: 'hidden',
    marginBottom: getResponsiveSize(20),
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  mainButtonGradient: {
    paddingVertical: getResponsiveSize(16),
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: getResponsiveSize(50),
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#1a1a1a',
    fontSize: getResponsiveFontSize(16),
    fontWeight: '700',
    letterSpacing: 0.5,
    marginLeft: getResponsiveSize(8),
  },
  switchSection: {
    alignItems: 'center',
  },
  createButton: {

    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: getResponsiveSize(12),
    paddingHorizontal: getResponsiveSize(20),
  },
  createText: {
    color: '#888',
    fontSize: getResponsiveFontSize(14),
    textAlign: 'center',
  },
  createTextBold: {
    color: '#FFD700',
    fontSize: getResponsiveFontSize(14),
    fontWeight: '700',
    textAlign: 'center',
  },
});