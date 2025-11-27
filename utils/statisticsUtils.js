// ✅ utils/statisticsUtils.js
// Утилиты для расчета статистики концертов

// ✅ ВСЕ 85 РЕГИОНОВ РОССИИ С ЦВЕТАМИ
const REGIONS_DATA = {
  // ✅ ЦЕНТРАЛЬНЫЙ ФЕДЕРАЛЬНЫЙ ОКРУГ (18)
  'Белгородская область': '#FF6B6B',
  'Брянская область': '#FF8E72',
  'Владимирская область': '#FFA07A',
  'Воронежская область': '#4A90E2',
  'Ивановская область': '#FFB347',
  'Калужская область': '#FFC080',
  'Костромская область': '#FFD700',
  'Курская область': '#FFDA03',
  'Липецкая область': '#FFE4B5',
  'Московская область': '#E6E6FA',
  'Орловская область': '#DDA0DD',
  'Рязанская область': '#DA70D6',
  'Смоленская область': '#BA55D3',
  'Тамбовская область': '#9370DB',
  'Тверская область': '#8A2BE2',
  'Тульская область': '#7B68EE',
  'Ярославская область': '#6A5ACD',
  'Город Москва': '#FFD700',

  // ✅ СЕВЕРО-ЗАПАДНЫЙ ФЕДЕРАЛЬНЫЙ ОКРУГ (11)
  'Архангельская область': '#20B2AA',
  'Вологодская область': '#40E0D0',
  'Калининградская область': '#48D1CC',
  'Карелия': '#5F9EA0',
  'Коми': '#66CDAA',
  'Ненецкий автономный округ': '#7FFFD4',
  'Новгородская область': '#00CED1',
  'Псковская область': '#3CB371',
  'Санкт-Петербург': '#FF69B4',
  'Город Санкт-Петербург': '#FF1493',
  'Ямало-Ненецкий автономный округ': '#00FA9A',

  // ✅ ПРИВОЛЖСКИЙ ФЕДЕРАЛЬНЫЙ ОКРУГ (14)
  'Республика Башкортостан': '#34C759',
  'Республика Марий Эл': '#00FF00',
  'Республика Мордовия': '#32CD32',
  'Республика Татарстан': '#3CB371',
  'Кировская область': '#2E8B57',
  'Нижегородская область': '#228B22',
  'Оренбургская область': '#006400',
  'Пензенская область': '#556B2F',
  'Самарская область': '#6B8E23',
  'Саратовская область': '#7CB342',
  'Ульяновская область': '#8BC34A',
  'Чувашская Республика': '#9CCC65',
  'Пермский край': '#AED581',
  'Киров': '#CDDC39',

  // ✅ УРАЛЬСКИЙ ФЕДЕРАЛЬНЫЙ ОКРУГ (6)
  'Свердловская область': '#FF4500',
  'Тюменская область': '#FF6347',
  'Челябинская область': '#FF7F50',
  'Ханты-Мансийский автономный округ': '#FF8C00',
  'Ямало-Ненецкий АО': '#FFA500',
  'Курганская область': '#FFB6C1',

  // ✅ СИБИРСКИЙ ФЕДЕРАЛЬНЫЙ ОКРУГ (13)
  'Республика Алтай': '#1E90FF',
  'Республика Бурятия': '#4169E1',
  'Республика Саха (Якутия)': '#0000CD',
  'Республика Тыва': '#00008B',
  'Республика Хакасия': '#000080',
  'Алтайский край': '#191970',
  'Иркутская область': '#4B0082',
  'Кемеровская область': '#8B008B',
  'Красноярский край': '#8B00FF',
  'Новосибирская область': '#9370DB',
  'Омская область': '#9932CC',
  'Томская область': '#BA55D3',

  // ✅ ДАЛЬНЕВОСТОЧНЫЙ ФЕДЕРАЛЬНЫЙ ОКРУГ (11)
  'Амурская область': '#DC143C',
  'Еврейская автономная область': '#FF1493',
  'Камчатский край': '#FF69B4',
  'Магаданская область': '#FF00FF',
  'Приморский край': '#FF00FF',
  'Сахалинская область': '#FF00FF',
  'Чукотский автономный округ': '#FF1493',
  'Хабаровский край': '#C71585',
  'Забайкальский край': '#DB7093',
  'Чукотка': '#DDA0DD',

  // ✅ ЮЖНЫЙ ФЕДЕРАЛЬНЫЙ ОКРУГ (8)
  'Республика Адыгея': '#FFC0CB',
  'Республика Крым': '#FFB6C1',
  'Астраханская область': '#FFC0CB',
  'Волгоградская область': '#FFDAB9',
  'Краснодарский край': '#FFE4E1',
  'Ростовская область': '#FFF0F5',
  'Город Севастополь': '#FF69B4',
  'Севастополь': '#FF1493',

  // ✅ СЕВЕРО-КАВКАЗСКИЙ ФЕДЕРАЛЬНЫЙ ОКРУГ (8)
  'Республика Дагестан': '#3D95CE',
  'Республика Ингушетия': '#4A90E2',
  'Кабардино-Балкарская Республика': '#5B9BD5',
  'Карачаево-Черкесская Республика': '#6BA3D9',
  'Республика Северная Осетия': '#7CB0DE',
  'Республика Чечня': '#8DBAE2',
  'Ставропольский край': '#9DC3E6',
  'Ставрополье': '#AECEEB',

  // ✅ ДОПОЛНИТЕЛЬНЫЕ НАЗВАНИЯ
  'Неизвестно': '#888888',
  'Другие': '#34C759',
};

export const getColorByRegion = (region) => {
  if (!region) return '#888888';
  return REGIONS_DATA[region] || '#34C759';
};

export const isVoronejRegion = (region) => {
  return region === 'Воронежская область';
};

// Функция для получения месяца и года из даты
const getMonthYear = (dateString) => {
  const date = new Date(dateString + 'T00:00:00');
  return {
    year: date.getFullYear(),
    month: date.getMonth() + 1,
  };
};

// Функция для проверки, принадлежит ли дата текущему месяцу
const isCurrentMonth = (dateString) => {
  const now = new Date();
  const {year, month} = getMonthYear(dateString);
  return year === now.getFullYear() && month === now.getMonth() + 1;
};

// Функция для проверки, принадлежит ли дата текущему кварталу (3 месяца)
const isCurrentQuarter = (dateString) => {
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();
  const {year, month} = getMonthYear(dateString);
  
  if (year !== currentYear) return false;
  
  const quarterStart = Math.floor((currentMonth - 1) / 3) * 3 + 1;
  const quarterEnd = quarterStart + 2;
  
  return month >= quarterStart && month <= quarterEnd;
};

// Функция для проверки, принадлежит ли дата последним 4 месяцам
const isLast4Months = (dateString) => {
  const now = new Date();
  const {year, month} = getMonthYear(dateString);
  
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();
  
  // Создаем дату 4 месяца назад
  let checkMonth = currentMonth - 3;
  let checkYear = currentYear;
  
  if (checkMonth <= 0) {
    checkMonth += 12;
    checkYear -= 1;
  }
  
  // Проверяем, находится ли дата между checkYear:checkMonth и currentYear:currentMonth
  if (year < checkYear) return false;
  if (year > currentYear) return false;
  
  if (year === checkYear && month < checkMonth) return false;
  if (year === currentYear && month > currentMonth) return false;
  
  return true;
};

export const calculateStatistics = (concerts) => {
  if (!concerts || concerts.length === 0) {
    return {
      monthly: { voronezh: 0, other: 0, total: 0 },
      quarterly: { voronezh: 0, other: 0, total: 0 },
      last4Months: { voronezh: 0, other: 0, total: 0 },
    };
  }

  // Статистика по месяцам
  const monthlyConcerts = concerts.filter(c => isCurrentMonth(c.date));
  const monthlyVoronezh = monthlyConcerts.filter(c => isVoronejRegion(c.region)).length;
  const monthlyOther = monthlyConcerts.filter(c => !isVoronejRegion(c.region)).length;

  // Статистика по кварталам
  const quarterlyConcerts = concerts.filter(c => isCurrentQuarter(c.date));
  const quarterlyVoronezh = quarterlyConcerts.filter(c => isVoronejRegion(c.region)).length;
  const quarterlyOther = quarterlyConcerts.filter(c => !isVoronejRegion(c.region)).length;

  // Статистика по последним 4 месяцам
  const last4Concerts = concerts.filter(c => isLast4Months(c.date));
  const last4Voronezh = last4Concerts.filter(c => isVoronejRegion(c.region)).length;
  const last4Other = last4Concerts.filter(c => !isVoronejRegion(c.region)).length;

  return {
    monthly: {
      voronezh: monthlyVoronezh,
      other: monthlyOther,
      total: monthlyConcerts.length,
    },
    quarterly: {
      voronezh: quarterlyVoronezh,
      other: quarterlyOther,
      total: quarterlyConcerts.length,
    },
    last4Months: {
      voronezh: last4Voronezh,
      other: last4Other,
      total: last4Concerts.length,
    },
  };
};

export const getMonthName = (monthNumber) => {
  const months = [
    'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
    'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'
  ];
  return months[monthNumber - 1] || '';
};

export const getCurrentMonthName = () => {
  const now = new Date();
  return getMonthName(now.getMonth() + 1);
};

export const getCurrentQuarterText = () => {
  const now = new Date();
  const month = now.getMonth() + 1;
  const quarter = Math.floor((month - 1) / 3) + 1;
  return `${quarter} квартал`;
};

export const getLast4MonthsText = () => {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  
  let startMonth = month - 3;
  let startYear = year;
  
  if (startMonth <= 0) {
    startMonth += 12;
    startYear -= 1;
  }
  
  const endMonthName = getMonthName(month);
  const startMonthName = getMonthName(startMonth);
  
  return `${startMonthName} ${startYear} - ${endMonthName} ${year}`;
};

// ✅ СПИСОК ВСЕХ РЕГИОНОВ ДЛЯ ВЫПАДАЮЩЕГО СПИСКА
export const ALL_REGIONS = [
  // ЦЕНТРАЛЬНЫЙ ФО
  'Белгородская область',
  'Брянская область',
  'Владимирская область',
  'Воронежская область',
  'Ивановская область',
  'Калужская область',
  'Костромская область',
  'Курская область',
  'Липецкая область',
  'Московская область',
  'Орловская область',
  'Рязанская область',
  'Смоленская область',
  'Тамбовская область',
  'Тверская область',
  'Тульская область',
  'Ярославская область',
  'Город Москва',

  // СЕВЕРО-ЗАПАДНЫЙ ФО
  'Архангельская область',
  'Вологодская область',
  'Калининградская область',
  'Карелия',
  'Коми',
  'Ненецкий автономный округ',
  'Новгородская область',
  'Псковская область',
  'Санкт-Петербург',
  'Ямало-Ненецкий автономный округ',

  // ПРИВОЛЖСКИЙ ФО
  'Республика Башкортостан',
  'Республика Марий Эл',
  'Республика Мордовия',
  'Республика Татарстан',
  'Кировская область',
  'Нижегородская область',
  'Оренбургская область',
  'Пензенская область',
  'Самарская область',
  'Саратовская область',
  'Ульяновская область',
  'Чувашская Республика',
  'Пермский край',

  // УРАЛЬСКИЙ ФО
  'Свердловская область',
  'Тюменская область',
  'Челябинская область',
  'Ханты-Мансийский автономный округ',
  'Курганская область',

  // СИБИРСКИЙ ФО
  'Республика Алтай',
  'Республика Бурятия',
  'Республика Саха (Якутия)',
  'Республика Тыва',
  'Республика Хакасия',
  'Алтайский край',
  'Иркутская область',
  'Кемеровская область',
  'Красноярский край',
  'Новосибирская область',
  'Омская область',
  'Томская область',

  // ДАЛЬНЕВОСТОЧНЫЙ ФО
  'Амурская область',
  'Еврейская автономная область',
  'Камчатский край',
  'Магаданская область',
  'Приморский край',
  'Сахалинская область',
  'Чукотский автономный округ',
  'Хабаровский край',
  'Забайкальский край',

  // ЮЖНЫЙ ФО
  'Республика Адыгея',
  'Республика Крым',
  'Астраханская область',
  'Волгоградская область',
  'Краснодарский край',
  'Ростовская область',
  'Город Севастополь',

  // СЕВЕРО-КАВКАЗСКИЙ ФО
  'Республика Дагестан',
  'Республика Ингушетия',
  'Кабардино-Балкарская Республика',
  'Карачаево-Черкесская Республика',
  'Республика Северная Осетия',
  'Республика Чечня',
  'Ставропольский край',
];

// ✅ ФУНКЦИЯ ДЛЯ ПОЛУЧЕНИЯ ОТОБРАЖАЕМОГО НАЗВАНИЯ РЕГИОНА
export const getRegionDisplayName = (region) => {
  return region || 'Не указана';
};

// ✅ ФУНКЦИЯ ДЛЯ ПРОВЕРКИ ВАЛИДНОСТИ РЕГИОНА
export const isValidRegion = (region) => {
  return region && region !== 'Неизвестно' && region !== '';
};