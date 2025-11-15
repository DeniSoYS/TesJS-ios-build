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

    // Создаем сообщения для отправки
    const messages = userTokens.map(token => ({
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
      result.data.forEach((item, index) => {
        if (item.status === 'error') {
          console.error(`❌ Ошибка отправки: ${item.message}`);
        }
      });
    } else {
      console.error('❌ Ошибка отправки уведомлений:', result);
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
      case 'artist':
        usersQuery = query(collection(db, 'users'), where('role', '==', 'user'));
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
        tokens.push(userData.pushToken);
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
    if (userToken.includes('DevelopmentMode') || userToken.includes('TestToken')) {
      console.log('🎭 Development токен - пропускаем реальную отправку');
      return { data: [{ status: 'ok', message: 'development_mode' }] };
    }

    const message = {
      to: userToken,
      sound: 'default',
      title: '🎵 Тестовое уведомление',
      body: 'Это тестовое уведомление от хора! Проверьте получение.',
      data: { test: true, timestamp: new Date().toISOString() },
    };

    console.log('📧 Отправляем сообщение:', message);

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
    return result;

  } catch (error) {
    console.error('❌ Ошибка отправки тестового уведомления:', error);
    throw error;
  }
}