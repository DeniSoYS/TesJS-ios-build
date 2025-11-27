import { collection, doc, getDoc, getDocs, orderBy, query, setDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';

// ✅ СТРУКТУРА ДАННЫХ В FIRESTORE
// collections/monthlyStatistics/
// ├── 2025-11 (документ)
// │   ├── monthly: { voronezh, other, total, byCity: {...} }
// │   ├── quarterly: { voronezh, other, total, byCity: {...} }
// │   ├── yearly: { voronezh, other, total, byCity: {...} }
// │   ├── timestamp: Date
// │   └── month: "ноябрь"
// ├── 2025-12
// ├── 2026-01
// └── ...

// ✅ ПОЛУЧИТЬ ТЕКУЩИЙ МЕСЯЦ В ФОРМАТЕ YYYY-MM
export const getCurrentMonthKey = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
};

// ✅ ПОЛУЧИТЬ НАЗВАНИЕ МЕСЯЦА
export const getMonthName = (monthIndex) => {
  const months = [
    'январь', 'февраль', 'март', 'апрель', 'май', 'июнь',
    'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь'
  ];
  return months[monthIndex];
};

// ✅ ПОЛУЧИТЬ НОМЕР КВАРТАЛА
export const getQuarterNumber = (month) => {
  return Math.ceil(month / 3);
};

// ✅ ПОЛУЧИТЬ МЕСЯЦЫ В КВАРТАЛЕ
export const getMonthsInQuarter = (quarter, year) => {
  const startMonth = (quarter - 1) * 3 + 1;
  const months = [];
  
  for (let i = 0; i < 3; i++) {
    const month = startMonth + i;
    const monthStr = String(month).padStart(2, '0');
    months.push(`${year}-${monthStr}`);
  }
  
  return months;
};

// ✅ ПОЛУЧИТЬ МЕСЯЦЫ В ГОДУ
export const getMonthsInYear = (year) => {
  const months = [];
  for (let i = 1; i <= 12; i++) {
    const month = String(i).padStart(2, '0');
    months.push(`${year}-${month}`);
  }
  return months;
};

// ✅ СОХРАНИТЬ СТАТИСТИКУ В FIRESTORE
export const saveMonthlyStatistics = async (monthKey, statisticsData) => {
  try {
    const [year, month] = monthKey.split('-');
    const monthIndex = parseInt(month) - 1;
    const monthName = getMonthName(monthIndex);
    const quarter = getQuarterNumber(parseInt(month));
    
    const docRef = doc(db, 'monthlyStatistics', monthKey);
    
    await setDoc(docRef, {
      monthKey,
      year: parseInt(year),
      month: parseInt(month),
      monthName,
      quarter,
      monthly: statisticsData.monthly || {},
      quarterly: statisticsData.quarterly || {},
      yearly: statisticsData.yearly || {},
      timestamp: new Date(),
      updatedAt: new Date(),
    }, { merge: true });
    
    console.log(`✅ Статистика за ${monthName} ${year} сохранена`);
    return true;
  } catch (error) {
    console.error('❌ Ошибка при сохранении статистики:', error);
    return false;
  }
};

// ✅ ПОЛУЧИТЬ СТАТИСТИКУ ЗА КОНКРЕТНЫЙ МЕСЯЦ
export const getMonthStatistics = async (monthKey) => {
  try {
    const docRef = doc(db, 'monthlyStatistics', monthKey);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return docSnap.data();
    } else {
      console.log(`ℹ️ Статистика за ${monthKey} не найдена`);
      return null;
    }
  } catch (error) {
    console.error('❌ Ошибка при получении статистики:', error);
    return null;
  }
};

// ✅ ПОЛУЧИТЬ СТАТИСТИКУ ЗА КВАРТАЛ
export const getQuarterStatistics = async (quarter, year) => {
  try {
    const monthKeys = getMonthsInQuarter(quarter, year);
    let totalVoronezh = 0;
    let totalOther = 0;
    let totalConcerts = 0;
    const cityStats = {};
    
    for (const monthKey of monthKeys) {
      const monthStat = await getMonthStatistics(monthKey);
      if (monthStat && monthStat.monthly) {
        totalVoronezh += monthStat.monthly.voronezh || 0;
        totalOther += monthStat.monthly.other || 0;
        totalConcerts += monthStat.monthly.total || 0;
        
        // Объединяем статистику по городам
        if (monthStat.monthly.byCity) {
          Object.keys(monthStat.monthly.byCity).forEach(city => {
            if (!cityStats[city]) {
              cityStats[city] = { count: 0, color: monthStat.monthly.byCity[city].color };
            }
            cityStats[city].count += monthStat.monthly.byCity[city].count || 0;
          });
        }
      }
    }
    
    return {
      quarter,
      year,
      voronezh: totalVoronezh,
      other: totalOther,
      total: totalConcerts,
      byCity: cityStats,
      months: monthKeys,
    };
  } catch (error) {
    console.error('❌ Ошибка при получении квартальной статистики:', error);
    return null;
  }
};

// ✅ ПОЛУЧИТЬ СТАТИСТИКУ ЗА ГОД
export const getYearStatistics = async (year) => {
  try {
    const monthKeys = getMonthsInYear(year);
    let totalVoronezh = 0;
    let totalOther = 0;
    let totalConcerts = 0;
    const cityStats = {};
    const quarterStats = {};
    
    for (let q = 1; q <= 4; q++) {
      const qStat = await getQuarterStatistics(q, year);
      if (qStat) {
        quarterStats[`Q${q}`] = qStat;
      }
    }
    
    for (const monthKey of monthKeys) {
      const monthStat = await getMonthStatistics(monthKey);
      if (monthStat && monthStat.monthly) {
        totalVoronezh += monthStat.monthly.voronezh || 0;
        totalOther += monthStat.monthly.other || 0;
        totalConcerts += monthStat.monthly.total || 0;
        
        if (monthStat.monthly.byCity) {
          Object.keys(monthStat.monthly.byCity).forEach(city => {
            if (!cityStats[city]) {
              cityStats[city] = { count: 0, color: monthStat.monthly.byCity[city].color };
            }
            cityStats[city].count += monthStat.monthly.byCity[city].count || 0;
          });
        }
      }
    }
    
    return {
      year,
      voronezh: totalVoronezh,
      other: totalOther,
      total: totalConcerts,
      byCity: cityStats,
      months: monthKeys,
      quarters: quarterStats,
    };
  } catch (error) {
    console.error('❌ Ошибка при получении годовой статистики:', error);
    return null;
  }
};

// ✅ ПОЛУЧИТЬ ВСЮ ИСТОРИЮ СТАТИСТИКИ
export const getAllStatistics = async () => {
  try {
    const collectionRef = collection(db, 'monthlyStatistics');
    const q = query(collectionRef, orderBy('timestamp', 'desc'));
    const querySnapshot = await getDocs(q);
    
    const allStats = {};
    querySnapshot.forEach((doc) => {
      allStats[doc.id] = doc.data();
    });
    
    console.log(`✅ Загружена история из ${Object.keys(allStats).length} месяцев`);
    return allStats;
  } catch (error) {
    console.error('❌ Ошибка при получении истории:', error);
    return {};
  }
};

// ✅ ПОЛУЧИТЬ СПИСОК ДОСТУПНЫХ ЛЕТ
export const getAvailableYears = async () => {
  try {
    const allStats = await getAllStatistics();
    const years = new Set();
    
    Object.keys(allStats).forEach(monthKey => {
      const [year] = monthKey.split('-');
      years.add(parseInt(year));
    });
    
    return Array.from(years).sort((a, b) => b - a); // От новых к старым
  } catch (error) {
    console.error('❌ Ошибка при получении списка лет:', error);
    return [];
  }
};

// ✅ ПОЛУЧИТЬ СПИСОК ДОСТУПНЫХ МЕСЯЦЕВ ДЛЯ ГОДА
export const getAvailableMonthsForYear = async (year) => {
  try {
    const allStats = await getAllStatistics();
    const yearStr = String(year);
    const months = [];
    
    Object.keys(allStats).forEach(monthKey => {
      if (monthKey.startsWith(yearStr)) {
        months.push({
          key: monthKey,
          data: allStats[monthKey],
        });
      }
    });
    
    return months.sort((a, b) => b.key.localeCompare(a.key)); // От новых к старым
  } catch (error) {
    console.error('❌ Ошибка при получении месяцев года:', error);
    return [];
  }
};

// ✅ УДАЛИТЬ СТАРУЮ СТАТИСТИКУ (ОПЦИОНАЛЬНО)
export const deleteStatistics = async (monthKey) => {
  try {
    const docRef = doc(db, 'monthlyStatistics', monthKey);
    await deleteDoc(docRef);
    console.log(`✅ Статистика за ${monthKey} удалена`);
    return true;
  } catch (error) {
    console.error('❌ Ошибка при удалении:', error);
    return false;
  }
};

// ✅ ПРОВЕРИТЬ НУЖНО ЛИ СОХРАНЯТЬ (ПО РАСПИСАНИЮ)
export const shouldSaveStatistics = async () => {
  const currentMonthKey = getCurrentMonthKey();
  const savedStat = await getMonthStatistics(currentMonthKey);
  
  // Сохраняем если:
  // 1. Статистика за текущий месяц еще не сохранялась
  // 2. Или последнее сохранение было более часа назад
  
  if (!savedStat) {
    return true;
  }
  
  const lastUpdate = new Date(savedStat.updatedAt);
  const now = new Date();
  const diffMs = now - lastUpdate;
  const diffHours = diffMs / (1000 * 60 * 60);
  
  return diffHours >= 1; // Обновляем каждый час
};