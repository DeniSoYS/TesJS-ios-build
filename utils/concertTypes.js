// utils/concertTypes.js
// ✅ Утилита для работы с типами концертов

export const CONCERT_TYPES = {
  GENERAL: 'GENERAL',
  BRIGADE_1: 'BRIGADE_1',
  BRIGADE_2: 'BRIGADE_2',
  BRIGADE_ENHANCED: 'BRIGADE_ENHANCED',
  SOLOISTS_ORCHESTRA: 'SOLOISTS_ORCHESTRA',
  UNKNOWN: 'UNKNOWN',
};

export const CONCERT_TYPE_LABELS = {
  [CONCERT_TYPES.GENERAL]: 'Общий концерт',
  [CONCERT_TYPES.BRIGADE_1]: 'Первая бригада',
  [CONCERT_TYPES.BRIGADE_2]: 'Вторая бригада',
  [CONCERT_TYPES.BRIGADE_ENHANCED]: 'Концерт усиленной бригады',
  [CONCERT_TYPES.SOLOISTS_ORCHESTRA]: 'Солисты оркестр',
  [CONCERT_TYPES.UNKNOWN]: 'Неизвестно',
  
  // ✅ Поддержка старых значений из Firebase (для обратной совместимости)
  'BRIGADE_1': 'Первая бригада',
  'BRIGADE_2': 'Вторая бригада',
  'Общий концерт': 'Общий концерт',
  'Сольный концерт': 'Сольный концерт',
  'Репетиция': 'Репетиция',
  'Гастроли': 'Гастроли',
  'Фестиваль': 'Фестиваль',
  'Конкурс': 'Конкурс',
};

// ✅ ИСПРАВЛЕНО: key → value
export const CONCERT_TYPE_LIST = [
  { value: CONCERT_TYPES.GENERAL, label: 'Общий концерт' },
  { value: CONCERT_TYPES.BRIGADE_1, label: 'Первая бригада' },
  { value: CONCERT_TYPES.BRIGADE_2, label: 'Вторая бригада' },
  { value: CONCERT_TYPES.BRIGADE_ENHANCED, label: 'Концерт усиленной бригады' },
  { value: CONCERT_TYPES.SOLOISTS_ORCHESTRA, label: 'Солисты оркестр' },
  { value: CONCERT_TYPES.UNKNOWN, label: 'Неизвестно' },
];

/**
 * Получить название типа концерта
 * @param {string} typeKey - Ключ типа концерта
 * @returns {string} - Название типа концерта
 */
export const getConcertTypeLabel = (typeKey) => {
  return CONCERT_TYPE_LABELS[typeKey] || typeKey || 'Общий концерт';
};

/**
 * Получить цвет для типа концерта
 * @param {string} typeKey - Ключ типа концерта
 * @returns {string} - Цвет в hex
 */
export const getConcertTypeColor = (typeKey) => {
  const colors = {
    [CONCERT_TYPES.GENERAL]: '#FFD700',
    [CONCERT_TYPES.BRIGADE_1]: '#FF6B6B',
    [CONCERT_TYPES.BRIGADE_2]: '#4ECDC4',
    [CONCERT_TYPES.BRIGADE_ENHANCED]: '#95E1D3',
    [CONCERT_TYPES.SOLOISTS_ORCHESTRA]: '#A8E6CF',
    [CONCERT_TYPES.UNKNOWN]: '#CCCCCC',
  };
  
  return colors[typeKey] || '#FFD700';
};

/**
 * Получить иконку для типа концерта
 * @param {string} typeKey - Ключ типа концерта
 * @returns {string} - Название иконки из Ionicons
 */
export const getConcertTypeIcon = (typeKey) => {
  const icons = {
    [CONCERT_TYPES.GENERAL]: 'musical-notes',
    [CONCERT_TYPES.BRIGADE_1]: 'people',
    [CONCERT_TYPES.BRIGADE_2]: 'people-circle',
    [CONCERT_TYPES.BRIGADE_ENHANCED]: 'star',
    [CONCERT_TYPES.SOLOISTS_ORCHESTRA]: 'mic',
    [CONCERT_TYPES.UNKNOWN]: 'help-circle',
  };
  
  return icons[typeKey] || 'musical-notes';
};