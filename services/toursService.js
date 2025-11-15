import { addDoc, collection, deleteDoc, doc, getDocs, query, updateDoc } from 'firebase/firestore';

/**
 * Добавить новые гастроли
 * @param {Object} db - Экземпляр Firestore
 * @param {Object} tourData - Данные гастролей
 */
export const addTour = async (db, tourData) => {
  try {
    const tourRef = await addDoc(collection(db, 'tours'), {
      ...tourData,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    console.log('✅ Гастроли добавлены с ID:', tourRef.id);
    return tourRef.id;
  } catch (error) {
    console.error('❌ Ошибка добавления гастролей:', error);
    throw error;
  }
};

/**
 * Получить все гастроли
 * @param {Object} db - Экземпляр Firestore
 */
export const getAllTours = async (db) => {
  try {
    const toursQuery = query(collection(db, 'tours'));
    const snapshot = await getDocs(toursQuery);
    
    const tours = [];
    snapshot.forEach((docSnapshot) => {
      tours.push({ id: docSnapshot.id, ...docSnapshot.data() });
    });
    
    console.log(`✅ Загружено ${tours.length} гастролей`);
    return tours;
  } catch (error) {
    console.error('❌ Ошибка загрузки гастролей:', error);
    throw error;
  }
};

/**
 * Получить гастроли по дате
 * @param {Object} db - Экземпляр Firestore
 * @param {string} date - Дата в формате YYYY-MM-DD
 */
export const getToursByDate = async (db, date) => {
  try {
    const allTours = await getAllTours(db);
    
    // Фильтруем гастроли, которые включают указанную дату
    const toursOnDate = allTours.filter(tour => {
      const targetDate = new Date(date);
      const startDate = new Date(tour.startDate);
      const endDate = new Date(tour.endDate);
      
      return targetDate >= startDate && targetDate <= endDate;
    });
    
    console.log(`✅ Найдено ${toursOnDate.length} гастролей на дату ${date}`);
    return toursOnDate;
  } catch (error) {
    console.error('❌ Ошибка поиска гастролей по дате:', error);
    throw error;
  }
};

/**
 * Получить все даты, входящие в гастроли
 * @param {Object} tour - Объект гастролей
 */
export const getTourDates = (tour) => {
  const dates = [];
  const start = new Date(tour.startDate);
  const end = new Date(tour.endDate);
  
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    dates.push(`${year}-${month}-${day}`);
  }
  
  return dates;
};

/**
 * Удалить гастроли
 * @param {Object} db - Экземпляр Firestore
 * @param {string} tourId - ID гастролей
 */
export const deleteTour = async (db, tourId) => {
  try {
    await deleteDoc(doc(db, 'tours', tourId));
    console.log('✅ Гастроли удалены:', tourId);
  } catch (error) {
    console.error('❌ Ошибка удаления гастролей:', error);
    throw error;
  }
};

/**
 * Обновить гастроли
 * @param {Object} db - Экземпляр Firestore
 * @param {string} tourId - ID гастролей
 * @param {Object} updateData - Данные для обновления
 */
export const updateTour = async (db, tourId, updateData) => {
  try {
    await updateDoc(doc(db, 'tours', tourId), {
      ...updateData,
      updatedAt: new Date(),
    });
    console.log('✅ Гастроли обновлены:', tourId);
  } catch (error) {
    console.error('❌ Ошибка обновления гастролей:', error);
    throw error;
  }
};

/**
 * Получить активные гастроли (текущие и будущие)
 * @param {Object} db - Экземпляр Firestore
 */
export const getActiveTours = async (db) => {
  try {
    const allTours = await getAllTours(db);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const activeTours = allTours.filter(tour => {
      const endDate = new Date(tour.endDate);
      endDate.setHours(0, 0, 0, 0);
      return endDate >= today;
    });
    
    console.log(`✅ Найдено ${activeTours.length} активных гастролей`);
    return activeTours;
  } catch (error) {
    console.error('❌ Ошибка получения активных гастролей:', error);
    throw error;
  }
};

/**
 * Получить завершенные гастроли
 * @param {Object} db - Экземпляр Firestore
 */
export const getCompletedTours = async (db) => {
  try {
    const allTours = await getAllTours(db);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const completedTours = allTours.filter(tour => {
      const endDate = new Date(tour.endDate);
      endDate.setHours(0, 0, 0, 0);
      return endDate < today;
    });
    
    console.log(`✅ Найдено ${completedTours.length} завершенных гастролей`);
    return completedTours;
  } catch (error) {
    console.error('❌ Ошибка получения завершенных гастролей:', error);
    throw error;
  }
};

/**
 * Проверить, есть ли гастроли в указанный период
 * @param {Object} db - Экземпляр Firestore
 * @param {string} startDate - Дата начала (YYYY-MM-DD)
 * @param {string} endDate - Дата окончания (YYYY-MM-DD)
 */
export const checkTourConflict = async (db, startDate, endDate) => {
  try {
    const allTours = await getAllTours(db);
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    const hasConflict = allTours.some(tour => {
      const tourStart = new Date(tour.startDate);
      const tourEnd = new Date(tour.endDate);
      
      // Проверяем пересечение периодов
      return (start <= tourEnd && end >= tourStart);
    });
    
    return hasConflict;
  } catch (error) {
    console.error('❌ Ошибка проверки конфликта гастролей:', error);
    throw error;
  }
};

/**
 * Форматировать дату для отображения
 * @param {string} dateString - Дата в формате YYYY-MM-DD
 */
export const formatDate = (dateString) => {
  if (!dateString) return '';
  const [year, month, day] = dateString.split('-');
  const months = [
    'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
    'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'
  ];
  return `${parseInt(day)} ${months[parseInt(month) - 1]} ${year}`;
};

/**
 * Получить продолжительность гастролей в днях
 * @param {Object} tour - Объект гастролей
 */
export const getTourDuration = (tour) => {
  const start = new Date(tour.startDate);
  const end = new Date(tour.endDate);
  const diffTime = Math.abs(end - start);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  return diffDays;
};