// utils/reminderTypes.js

export const REMINDER_TYPES = {
  CONCERT: 'concert',
  REHEARSAL: 'rehearsal', 
  ADMIN: 'admin',
  CREATIVE: 'creative',
  GENERAL: 'general',
};

export const REMINDER_TYPE_LABELS = {
  [REMINDER_TYPES.CONCERT]: 'Концерт',
  [REMINDER_TYPES.REHEARSAL]: 'Репетиция',
  [REMINDER_TYPES.ADMIN]: 'Административное',
  [REMINDER_TYPES.CREATIVE]: 'Творческое',
  [REMINDER_TYPES.GENERAL]: 'Общее',
};

export const NOTIFICATION_TIMING = [
  { value: 900, label: 'За 15 минут' },      // 15 * 60
  { value: 1800, label: 'За 30 минут' },     // 30 * 60
  { value: 3600, label: 'За 1 час' },        // 60 * 60
  { value: 7200, label: 'За 2 часа' },       // 120 * 60
  { value: 10800, label: 'За 3 часа' },      // 180 * 60
  { value: 43200, label: 'За 12 часов' },    // 12 * 60 * 60
  { value: 86400, label: 'За 1 день' },      // 24 * 60 * 60
  { value: 259200, label: 'За 3 дня' },      // 3 * 24 * 60 * 60
  { value: 604800, label: 'За 1 неделю' },   // 7 * 24 * 60 * 60
];

export const TARGET_USERS = {
  ALL: 'all',
  ADMIN: 'admin',
  ARTISTS: 'artists',
  BALLET: 'ballet',
  CHOIR: 'choir',
};

export const TARGET_USER_LABELS = {
  [TARGET_USERS.ALL]: 'Все пользователи',
  [TARGET_USERS.ADMIN]: 'Администраторы',
  [TARGET_USERS.ARTISTS]: 'Все артисты',
  [TARGET_USERS.BALLET]: 'Артисты балета',
  [TARGET_USERS.CHOIR]: 'Артисты хора',
};

export const REPEAT_TYPES = {
  NONE: 'none',
  DAILY: 'daily',
  WEEKLY: 'weekly',
  MONTHLY: 'monthly',
};

export const REPEAT_TYPE_LABELS = {
  [REPEAT_TYPES.NONE]: 'Не повторять',
  [REPEAT_TYPES.DAILY]: 'Каждый день',
  [REPEAT_TYPES.WEEKLY]: 'Каждую неделю',
  [REPEAT_TYPES.MONTHLY]: 'Каждый месяц',
};