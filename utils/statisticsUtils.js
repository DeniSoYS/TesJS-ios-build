// ✅ utils/statisticsUtils.js
// Утилиты для расчета статистики концертов

export const getColorByRegion = (region) => {
  if (region === 'Воронежская область') {
    return '#4A90E2'; // Синий для Воронежской области
  }
  return '#34C759'; // Зеленый для других областей
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

// ✅ ИСПРАВЛЕНО: Добавлена функция getCurrentMonthName
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