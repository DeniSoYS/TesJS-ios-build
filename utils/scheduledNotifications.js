// utils/scheduledNotifications.js
import * as Notifications from 'expo-notifications';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';

/**
 * 🔔 СОЗДАТЬ SCHEDULED NOTIFICATION
 * @param {Object} reminder - объект напоминания из Firestore
 * @returns {Promise<string|null>} notificationId или null
 */
export async function scheduleReminderNotification(reminder) {
  try {
    console.log('🔔 Создание scheduled notification для:', reminder.title);

    // Вычисляем время отправки уведомления
    const eventDate = reminder.eventDate.toDate ? reminder.eventDate.toDate() : new Date(reminder.eventDate);
    const notifyTime = new Date(eventDate.getTime() - reminder.notifyBefore * 1000);
    
    const now = new Date();
    
    // Проверяем, не в прошлом ли время уведомления
    if (notifyTime <= now) {
      console.log('⚠️ Время уведомления в прошлом, пропускаем создание');
      return null;
    }

    console.log('📅 Событие:', eventDate.toLocaleString('ru-RU'));
    console.log('⏰ Уведомление будет отправлено:', notifyTime.toLocaleString('ru-RU'));
    console.log('⏳ Осталось:', Math.round((notifyTime - now) / 1000 / 60), 'минут');

    // Создаем scheduled notification
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: `🎵 ${reminder.title}`,
        body: reminder.message,
        sound: 'default',
        priority: Notifications.AndroidNotificationPriority.HIGH,
        data: {
          reminderId: reminder.id,
          type: 'scheduled_reminder',
          eventDate: eventDate.toISOString(),
        },
      },
      trigger: {
        date: notifyTime,
      },
    });

    console.log('✅ Scheduled notification создано с ID:', notificationId);

    // Сохраняем ID уведомления в Firestore
    if (reminder.id) {
      await updateDoc(doc(db, 'reminders', reminder.id), {
        notificationId: notificationId,
        scheduledFor: notifyTime,
      });
      console.log('✅ ID уведомления сохранен в Firestore');
    }

    return notificationId;

  } catch (error) {
    console.error('❌ Ошибка создания scheduled notification:', error);
    return null;
  }
}

/**
 * 🚫 ОТМЕНИТЬ SCHEDULED NOTIFICATION
 * @param {string} notificationId - ID уведомления
 * @returns {Promise<boolean>} успешно ли отменено
 */
export async function cancelScheduledNotification(notificationId) {
  try {
    if (!notificationId) {
      console.log('⚠️ notificationId отсутствует, нечего отменять');
      return false;
    }

    console.log('🚫 Отмена scheduled notification:', notificationId);
    await Notifications.cancelScheduledNotificationAsync(notificationId);
    console.log('✅ Scheduled notification отменено');
    return true;

  } catch (error) {
    console.error('❌ Ошибка отмены scheduled notification:', error);
    return false;
  }
}

/**
 * 🔄 ОБНОВИТЬ SCHEDULED NOTIFICATION
 * Отменяет старое и создает новое
 * @param {string} oldNotificationId - ID старого уведомления
 * @param {Object} reminder - новый объект напоминания
 * @returns {Promise<string|null>} новый notificationId
 */
export async function rescheduleNotification(oldNotificationId, reminder) {
  try {
    console.log('🔄 Перепланирование уведомления');

    // Отменяем старое
    if (oldNotificationId) {
      await cancelScheduledNotification(oldNotificationId);
    }

    // Создаем новое
    const newNotificationId = await scheduleReminderNotification(reminder);
    return newNotificationId;

  } catch (error) {
    console.error('❌ Ошибка перепланирования уведомления:', error);
    return null;
  }
}

/**
 * 📋 ПОЛУЧИТЬ ВСЕ SCHEDULED NOTIFICATIONS
 * Для отладки
 * @returns {Promise<Array>} массив всех запланированных уведомлений
 */
export async function getAllScheduledNotifications() {
  try {
    const notifications = await Notifications.getAllScheduledNotificationsAsync();
    console.log('📋 Всего scheduled notifications:', notifications.length);
    notifications.forEach((notif, index) => {
      console.log(`${index + 1}. ${notif.content.title} - ${new Date(notif.trigger.value).toLocaleString('ru-RU')}`);
    });
    return notifications;
  } catch (error) {
    console.error('❌ Ошибка получения scheduled notifications:', error);
    return [];
  }
}

/**
 * 🧹 ОЧИСТИТЬ ВСЕ SCHEDULED NOTIFICATIONS
 * Для отладки
 * @returns {Promise<boolean>}
 */
export async function cancelAllScheduledNotifications() {
  try {
    console.log('🧹 Отмена всех scheduled notifications');
    await Notifications.cancelAllScheduledNotificationsAsync();
    console.log('✅ Все scheduled notifications отменены');
    return true;
  } catch (error) {
    console.error('❌ Ошибка отмены всех notifications:', error);
    return false;
  }
}

/**
 * 🔔 ОТПРАВИТЬ НЕМЕДЛЕННОЕ УВЕДОМЛЕНИЕ (для тестирования)
 * @param {string} title - заголовок
 * @param {string} body - текст
 * @returns {Promise<string|null>} notificationId
 */
export async function sendImmediateNotification(title, body) {
  try {
    console.log('🔔 Отправка немедленного уведомления:', title);
    
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: title,
        body: body,
        sound: 'default',
        priority: Notifications.AndroidNotificationPriority.HIGH,
      },
      trigger: {
        seconds: 1,
      },
    });

    console.log('✅ Немедленное уведомление запланировано:', notificationId);
    return notificationId;

  } catch (error) {
    console.error('❌ Ошибка отправки немедленного уведомления:', error);
    return null;
  }
}

/**
 * ⏰ ПОЛУЧИТЬ ВРЕМЯ ДО УВЕДОМЛЕНИЯ
 * @param {Object} reminder - объект напоминания
 * @returns {string} строка с временем ("через 2 часа 30 минут")
 */
export function getTimeUntilNotification(reminder) {
  try {
    const eventDate = reminder.eventDate.toDate ? reminder.eventDate.toDate() : new Date(reminder.eventDate);
    const notifyTime = new Date(eventDate.getTime() - reminder.notifyBefore * 1000);
    const now = new Date();
    
    const diffMs = notifyTime - now;
    
    if (diffMs <= 0) {
      return 'Уже прошло';
    }

    const diffMinutes = Math.floor(diffMs / 1000 / 60);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) {
      const remainingHours = diffHours % 24;
      return `через ${diffDays} дн. ${remainingHours} ч.`;
    } else if (diffHours > 0) {
      const remainingMinutes = diffMinutes % 60;
      return `через ${diffHours} ч. ${remainingMinutes} мин.`;
    } else {
      return `через ${diffMinutes} мин.`;
    }

  } catch (error) {
    console.error('Ошибка расчета времени:', error);
    return 'Неизвестно';
  }
}