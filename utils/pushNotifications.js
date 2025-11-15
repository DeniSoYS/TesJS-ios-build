// services/pushNotifications.js
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebaseConfig';

// Функция для отправки push-уведомлений
export async function sendPushNotification(reminder) {
  try {
    console.log('🚀 Отправка уведомления:', reminder.title);
    
    // Получаем токены целевых пользователей
    const userTokens = await getTargetUserTokens(reminder);
    
    if (userTokens.length === 0) {
      console.log('❌ Нет пользователей для отправки уведомления');
      return;
    }

    console.log(`📧 Отправка уведомлений для ${userTokens.length} пользователей`);

    // Фильтруем валидные токены - более строгая проверка
    const validTokens = userTokens.filter(token => {
      if (!token) return false;
      
      // Проверяем на development токены
      if (token.includes('Development_Mode') || 
          token.includes('DevelopmentMode') ||
          token.includes('TestToken') ||
          token === 'ExponentPushToken[Development_Mode]' ||
          !token.startsWith('ExponentPushToken[')) {
        return false;
      }
      
      return true;
    });

    if (validTokens.length === 0) {
      console.log('⚠️ Нет валидных токенов для отправки');
      return;
    }

    console.log(`✅ Валидных токенов: ${validTokens.length}`);

    // Создаем сообщения для отправки
    const messages = validTokens.map(token => ({
      to: token,
      sound: 'default',
      title: `🎵 ${reminder.title}`,
      body: reminder.message,
      data: { 
        reminderId: reminder.id,
        type: 'reminder'
      },
    }));

    // Отправляем уведомления через Expo Push Service
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messages),
    });

    const result = await response.json();
    
    if (result.data) {
      console.log(`✅ Уведомления отправлены: ${result.data.length} сообщений`);
      
      // Логируем ошибки без спама в консоль
      let successCount = 0;
      let errorCount = 0;
      
      result.data.forEach((item, index) => {
        if (item.status === 'error') {
          errorCount++;
          // Не логируем каждую ошибку отдельно чтобы избежать спама
          if (errorCount <= 2) { // Логируем только первые 2 ошибки
            if (item.message?.includes('FCM server key')) {
              console.log('ℹ️ FCM ключ не настроен (нормально для development)');
            } else if (item.message?.includes('valid Expo push token')) {
              console.log('ℹ️ Development токен (нормально для development)');
            }
          }
        } else {
          successCount++;
        }
      });

      if (errorCount > 0) {
        console.log(`📊 Итоги отправки: ${successCount} успешно, ${errorCount} с ошибками`);
        console.log('💡 Подсказка: В development режиме это нормально. В production нужна настройка FCM.');
      }
      
    } else {
      console.log('⚠️ Ответ от Expo:', result);
    }

  } catch (error) {
    console.error('❌ Ошибка в sendPushNotification:', error);
  }
}

// Функция для получения токенов целевых пользователей
async function getTargetUserTokens(reminder) {
  try {
    let usersQuery;

    switch (reminder.targetUsers) {
      case 'all':
        usersQuery = query(collection(db, 'users'));
        break;
      case 'admin':
        usersQuery = query(collection(db, 'users'), where('role', '==', 'admin'));
        break;
      case 'artists':
        // Все артисты (и балет, и хор)
        usersQuery = query(collection(db, 'users'), where('role', 'in', ['ballet', 'choir']));
        break;
      case 'ballet':
        usersQuery = query(collection(db, 'users'), where('role', '==', 'ballet'));
        break;
      case 'choir':
        usersQuery = query(collection(db, 'users'), where('role', '==', 'choir'));
        break;
      default:
        console.log('❌ Неизвестный тип получателей:', reminder.targetUsers);
        return [];
    }

    const snapshot = await getDocs(usersQuery);
    const tokens = [];

    snapshot.forEach(doc => {
      const userData = doc.data();
      if (userData.pushToken) {
        // Более строгая фильтрация development токенов
        const token = userData.pushToken;
        if (!token.includes('Development_Mode') &&
            !token.includes('DevelopmentMode') &&
            !token.includes('TestToken') &&
            token !== 'ExponentPushToken[Development_Mode]' &&
            token.startsWith('ExponentPushToken[')) {
          tokens.push(token);
        }
      }
    });

    console.log(`📱 Найдено токенов: ${tokens.length} для ${reminder.targetUsers}`);
    return tokens;

  } catch (error) {
    console.error('❌ Ошибка получения токенов пользователей:', error);
    return [];
  }
}

// Функция для отправки тестового уведомления
export async function sendTestNotification(userToken) {
  try {
    console.log('🧪 Отправка тестового уведомления на токен:', userToken);
    
    // Проверяем development токен
    if (userToken.includes('Development_Mode') || userToken.includes('DevelopmentMode') || userToken.includes('TestToken')) {
      console.log('🎭 Development токен - пропускаем реальную отправку');
      return { 
        success: false, 
        message: 'development_token',
        note: 'В development режиме используются тестовые токены'
      };
    }

    const message = {
      to: userToken,
      sound: 'default',
      title: '🎵 Тестовое уведомление',
      body: 'Это тестовое уведомление от хора! Проверьте получение.',
      data: { test: true, timestamp: new Date().toISOString() },
    };

    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });

    const result = await response.json();
    console.log('📨 Ответ от Expo:', result);
    
    return {
      success: true,
      data: result
    };

  } catch (error) {
    console.error('❌ Ошибка отправки тестового уведомления:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Функция для проверки и обновления токенов пользователей
export async function validateUserTokens() {
  try {
    const usersQuery = query(collection(db, 'users'));
    const snapshot = await getDocs(usersQuery);
    
    let validTokens = 0;
    let invalidTokens = 0;
    let developmentTokens = 0;
    
    snapshot.forEach(doc => {
      const userData = doc.data();
      if (userData.pushToken) {
        if (userData.pushToken.includes('Development_Mode') || 
            userData.pushToken.includes('DevelopmentMode') ||
            userData.pushToken.includes('TestToken')) {
          developmentTokens++;
        } else if (userData.pushToken.startsWith('ExponentPushToken[')) {
          validTokens++;
        } else {
          invalidTokens++;
        }
      } else {
        invalidTokens++;
      }
    });

    console.log(`📊 Статистика токенов: ${validTokens} валидных, ${developmentTokens} development, ${invalidTokens} невалидных`);
    return { validTokens, developmentTokens, invalidTokens };
    
  } catch (error) {
    console.error('❌ Ошибка проверки токенов:', error);
    return { validTokens: 0, developmentTokens: 0, invalidTokens: 0 };
  }
}

// Новая функция: проверка возможности отправки уведомлений
export async function checkPushNotificationCapability() {
  const stats = await validateUserTokens();
  
  if (stats.validTokens === 0) {
    return {
      canSend: false,
      reason: 'Нет валидных токенов для отправки',
      suggestion: 'Убедитесь, что пользователи зарегистрировали push-токены'
    };
  }
  
  if (stats.developmentTokens > 0) {
    return {
      canSend: true,
      warning: `Обнаружено ${stats.developmentTokens} development токенов`,
      note: 'В development режиме push-уведомления могут не работать'
    };
  }
  
  return {
    canSend: true,
    message: `Готово к отправке. Валидных токенов: ${stats.validTokens}`
  };
}