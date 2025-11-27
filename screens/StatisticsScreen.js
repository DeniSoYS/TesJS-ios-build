import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { collection, getDocs, query } from 'firebase/firestore';
import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { db } from '../firebaseConfig';
import { getColorByRegion } from '../utils/statisticsUtils';

// ✅ АДАПТИВНЫЕ РАЗМЕРЫ
const getWindowDimensions = () => {
  if (Platform.OS === 'web') {
    return { width: window.innerWidth, height: window.innerHeight };
  }
  return Dimensions.get('window');
};

const useWindowDimensions = () => {
  const [dimensions, setDimensions] = useState(getWindowDimensions());

  useEffect(() => {
    if (Platform.OS === 'web') {
      const handleResize = () => setDimensions(getWindowDimensions());
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }
  }, []);

  return dimensions;
};

const getResponsiveSize = (size, windowWidth) => {
  const isSmallDevice = windowWidth < 375;
  const isLargeDevice = windowWidth > 414;
  if (isSmallDevice) return size * 0.85;
  if (isLargeDevice) return size * 1.15;
  return size;
};

const getResponsiveFontSize = (size, windowWidth) => {
  const baseSize = getResponsiveSize(size, windowWidth);
  return Math.round(baseSize);
};

// ✅ КОМПОНЕНТ ПРОГРЕСС-БАР
const ProgressBar = ({ voronezh, other, responsiveFontSize }) => {
  const total = voronezh + other;
  const voronejPercent = total > 0 ? Math.round((voronezh / total) * 100) : 0;
  const otherPercent = total > 0 ? Math.round((other / total) * 100) : 0;

  return (
    <View style={styles.progressContainer}>
      <View style={styles.progressLabels}>
        <View style={styles.progressLabel}>
          <View style={styles.voronejDot} />
          <Text style={[styles.progressLabelText, { fontSize: responsiveFontSize(11) }]}>
            Воронеж: {voronezh} ({voronejPercent}%)
          </Text>
        </View>
        <View style={styles.progressLabel}>
          <View style={styles.otherDot} />
          <Text style={[styles.progressLabelText, { fontSize: responsiveFontSize(11) }]}>
            Другие: {other} ({otherPercent}%)
          </Text>
        </View>
      </View>

      {total > 0 ? (
        <View style={styles.progressBarBackground}>
          <LinearGradient
            colors={['#4A90E2', '#357ABD']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.progressBarFill, { width: `${voronejPercent}%` }]}
          />
          <LinearGradient
            colors={['#34C759', '#28A745']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.progressBarFill, { width: `${otherPercent}%` }]}
          />
        </View>
      ) : (
        <View style={styles.progressBarEmpty}>
          <Text style={[styles.progressEmptyText, { fontSize: responsiveFontSize(12) }]}>
            Нет данных
          </Text>
        </View>
      )}
    </View>
  );
};

// ✅ КОМПОНЕНТ КАРТОЧКИ СТАТИСТИКИ
const StatCard = ({ icon, title, value, color, responsiveFontSize }) => (
  <View style={styles.statCardWrapper}>
    <LinearGradient
      colors={[color + '20', color + '10']}
      style={styles.statCard}
    >
      <View style={[styles.statIcon, { backgroundColor: color + '30' }]}>
        <Ionicons name={icon} size={24} color={color} />
      </View>
      <Text style={[styles.statNumber, { fontSize: responsiveFontSize(20) }]}>{value}</Text>
      <Text style={[styles.statLabel, { fontSize: responsiveFontSize(11) }]}>{title}</Text>
    </LinearGradient>
  </View>
);

// ✅ ПОЛУЧИТЬ МЕСЯЦЫ В КВАРТАЛЕ
const getMonthsInQuarter = (quarter, year) => {
  const startMonth = (quarter - 1) * 3 + 1;
  const months = [];
  
  for (let i = 0; i < 3; i++) {
    const month = startMonth + i;
    months.push(month);
  }
  
  return months;
};

// ✅ ПОЛУЧИТЬ МЕСЯЦЫ В ГОДУ
const getMonthsInYear = (year) => {
  const months = [];
  for (let i = 1; i <= 12; i++) {
    months.push(i);
  }
  return months;
};

// ✅ ПОЛУЧИТЬ НАЗВАНИЕ МЕСЯЦА
const getMonthName = (month) => {
  const months = [
    'январь', 'февраль', 'март', 'апрель', 'май', 'июнь',
    'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь'
  ];
  return months[month - 1];
};

// ✅ ГЛАВНЫЙ КОМПОНЕНТ
export default function StatisticsScreen({ navigation }) {
  const dimensions = useWindowDimensions();
  const [view, setView] = useState('tabs'); // tabs, month, quarter, year
  const [activeTab, setActiveTab] = useState('month'); // month, quarter, year
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedQuarter, setSelectedQuarter] = useState(Math.ceil((new Date().getMonth() + 1) / 3));
  const [statistics, setStatistics] = useState(null);
  const [loading, setLoading] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const responsiveSize = (size) => getResponsiveSize(size, dimensions.width);
  const responsiveFontSize = (size) => getResponsiveFontSize(size, dimensions.width);

  // ✅ ЗАГРУЗКА ДАННЫХ ПО МЕСЯЦАМ
  const loadMonthStatistics = async (month, year) => {
    setLoading(true);
    try {
      // Определяем дату начала и конца месяца
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0);

      // Получаем все концерты за месяц
      const concertsRef = collection(db, 'concerts');
      const q = query(concertsRef);
      const querySnapshot = await getDocs(q);

      let voronezh = 0;
      let other = 0;
      const cityStats = {};

      querySnapshot.forEach((doc) => {
        const concert = doc.data();
        const concertDate = new Date(concert.date);

        // Проверяем входит ли концерт в выбранный месяц
        if (concertDate >= startDate && concertDate <= endDate) {
          const region = concert.region || 'Неизвестно';

          // Пропускаем концерты без региона
          if (!region || region === 'Неизвестно') {
            return;
          }

          // Подсчитываем по Воронежу и другим
          if (region === 'Воронежская область') {
            voronezh++;
          } else {
            other++;
          }

          // Подсчитываем по городам
          if (!cityStats[region]) {
            cityStats[region] = {
              count: 0,
              color: getColorByRegion(region),
              isVoronezh: region === 'Воронежская область'
            };
          }
          cityStats[region].count++;
        }
      });

      const total = voronezh + other;

      setStatistics({
        voronezh,
        other,
        total,
        byCity: cityStats,
        type: 'month',
        month,
        year
      });

      setLoading(false);
    } catch (error) {
      console.error('❌ Ошибка при загрузке статистики месяца:', error);
      setLoading(false);
    }
  };

  // ✅ ЗАГРУЗКА ДАННЫХ ПО КВАРТАЛАМ
  const loadQuarterStatistics = async (quarter, year) => {
    setLoading(true);
    try {
      const months = getMonthsInQuarter(quarter, year);
      let totalVoronezh = 0;
      let totalOther = 0;
      const cityStats = {};

      for (const month of months) {
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0);

        const concertsRef = collection(db, 'concerts');
        const q = query(concertsRef);
        const querySnapshot = await getDocs(q);

        querySnapshot.forEach((doc) => {
          const concert = doc.data();
          const concertDate = new Date(concert.date);

          if (concertDate >= startDate && concertDate <= endDate) {
            const region = concert.region || 'Неизвестно';

            if (!region || region === 'Неизвестно') {
              return;
            }

            if (region === 'Воронежская область') {
              totalVoronezh++;
            } else {
              totalOther++;
            }

            if (!cityStats[region]) {
              cityStats[region] = {
                count: 0,
                color: getColorByRegion(region),
                isVoronezh: region === 'Воронежская область'
              };
            }
            cityStats[region].count++;
          }
        });
      }

      const total = totalVoronezh + totalOther;

      setStatistics({
        voronezh: totalVoronezh,
        other: totalOther,
        total,
        byCity: cityStats,
        type: 'quarter',
        quarter,
        year,
        months: months.map(m => getMonthName(m))
      });

      setLoading(false);
    } catch (error) {
      console.error('❌ Ошибка при загрузке статистики квартала:', error);
      setLoading(false);
    }
  };

  // ✅ ЗАГРУЗКА ДАННЫХ ПО ГОДАМ
  const loadYearStatistics = async (year) => {
    setLoading(true);
    try {
      const months = getMonthsInYear(year);
      let totalVoronezh = 0;
      let totalOther = 0;
      const cityStats = {};
      const quarterStats = {};

      // Загружаем по месяцам и группируем по кварталам
      for (const month of months) {
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0);
        const quarter = Math.ceil(month / 3);

        const concertsRef = collection(db, 'concerts');
        const q = query(concertsRef);
        const querySnapshot = await getDocs(q);

        let qVoronezh = 0;
        let qOther = 0;

        querySnapshot.forEach((doc) => {
          const concert = doc.data();
          const concertDate = new Date(concert.date);

          if (concertDate >= startDate && concertDate <= endDate) {
            const region = concert.region || 'Неизвестно';

            if (!region || region === 'Неизвестно') {
              return;
            }

            if (region === 'Воронежская область') {
              totalVoronezh++;
              qVoronezh++;
            } else {
              totalOther++;
              qOther++;
            }

            if (!cityStats[region]) {
              cityStats[region] = {
                count: 0,
                color: getColorByRegion(region),
                isVoronezh: region === 'Воронежская область'
              };
            }
            cityStats[region].count++;
          }
        });

        if (!quarterStats[`Q${quarter}`]) {
          quarterStats[`Q${quarter}`] = { voronezh: 0, other: 0, total: 0 };
        }
        quarterStats[`Q${quarter}`].voronezh += qVoronezh;
        quarterStats[`Q${quarter}`].other += qOther;
        quarterStats[`Q${quarter}`].total += qVoronezh + qOther;
      }

      const total = totalVoronezh + totalOther;

      setStatistics({
        voronezh: totalVoronezh,
        other: totalOther,
        total,
        byCity: cityStats,
        type: 'year',
        year,
        quarterStats
      });

      setLoading(false);
    } catch (error) {
      console.error('❌ Ошибка при загрузке статистики года:', error);
      setLoading(false);
    }
  };

  // ✅ ЗАГРУЗКА ПРИ МОНТИРОВАНИИ
  useEffect(() => {
    if (activeTab === 'month') {
      loadMonthStatistics(selectedMonth, selectedYear);
    } else if (activeTab === 'quarter') {
      loadQuarterStatistics(selectedQuarter, selectedYear);
    } else if (activeTab === 'year') {
      loadYearStatistics(selectedYear);
    }
  }, [activeTab, selectedMonth, selectedYear, selectedQuarter]);

  // ✅ АНИМАЦИЯ
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, [statistics]);

  // ✅ RENDER
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1a1a1a" />

      <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollView}>
        {/* HEADER */}
        <LinearGradient
          colors={['#2a2a2a', '#1a1a1a']}
          style={styles.header}
        >
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={responsiveSize(28)} color="#FFD700" />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { fontSize: responsiveFontSize(20) }]}>
            📊 Статистика
          </Text>
          <View style={{ width: responsiveSize(28) }} />
        </LinearGradient>

        {/* TABS */}
        <View style={styles.tabsContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'month' && styles.tabActive]}
            onPress={() => setActiveTab('month')}
          >
            <Text style={[styles.tabText, activeTab === 'month' && styles.tabTextActive]}>
              Месяц
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, activeTab === 'quarter' && styles.tabActive]}
            onPress={() => setActiveTab('quarter')}
          >
            <Text style={[styles.tabText, activeTab === 'quarter' && styles.tabTextActive]}>
              Квартал
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, activeTab === 'year' && styles.tabActive]}
            onPress={() => setActiveTab('year')}
          >
            <Text style={[styles.tabText, activeTab === 'year' && styles.tabTextActive]}>
              Год
            </Text>
          </TouchableOpacity>
        </View>

        {/* CONTENT */}
        <View style={styles.content}>
          {/* МЕСЯЦ */}
          {activeTab === 'month' && (
            <View style={styles.section}>
              {/* ВЫБОР МЕСЯЦА И ГОДА */}
              <View style={styles.selectorContainer}>
                <View style={styles.selectorGroup}>
                  <Text style={[styles.selectorLabel, { fontSize: responsiveFontSize(12) }]}>
                    Месяц
                  </Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.scrollSelector}
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((month) => (
                      <TouchableOpacity
                        key={month}
                        style={[
                          styles.selectorButton,
                          selectedMonth === month && styles.selectorButtonActive
                        ]}
                        onPress={() => setSelectedMonth(month)}
                      >
                        <LinearGradient
                          colors={
                            selectedMonth === month
                              ? ['#FFD700', '#FFA500']
                              : ['rgba(100, 100, 100, 0.2)', 'rgba(100, 100, 100, 0.1)']
                          }
                          style={styles.selectorButtonGradient}
                        >
                          <Text
                            style={[
                              styles.selectorButtonText,
                              { fontSize: responsiveFontSize(11) },
                              selectedMonth === month && styles.selectorButtonTextActive
                            ]}
                          >
                            {getMonthName(month).substring(0, 3)}
                          </Text>
                        </LinearGradient>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>

                <View style={styles.selectorGroup}>
                  <Text style={[styles.selectorLabel, { fontSize: responsiveFontSize(12) }]}>
                    Год
                  </Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.scrollSelector}
                  >
                    {[2024, 2025, 2026, 2027].map((year) => (
                      <TouchableOpacity
                        key={year}
                        style={[
                          styles.selectorButton,
                          selectedYear === year && styles.selectorButtonActive
                        ]}
                        onPress={() => setSelectedYear(year)}
                      >
                        <LinearGradient
                          colors={
                            selectedYear === year
                              ? ['#FFD700', '#FFA500']
                              : ['rgba(100, 100, 100, 0.2)', 'rgba(100, 100, 100, 0.1)']
                          }
                          style={styles.selectorButtonGradient}
                        >
                          <Text
                            style={[
                              styles.selectorButtonText,
                              { fontSize: responsiveFontSize(11) },
                              selectedYear === year && styles.selectorButtonTextActive
                            ]}
                          >
                            {year}
                          </Text>
                        </LinearGradient>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              </View>

              {/* СТАТИСТИКА */}
              {loading ? (
                <View style={styles.loadingContainer}>
                  <Ionicons name="hourglass" size={48} color="#FFD700" />
                  <Text style={[styles.loadingText, { fontSize: responsiveFontSize(14) }]}>
                    Загрузка...
                  </Text>
                </View>
              ) : statistics && statistics.type === 'month' ? (
                <>
                  <Text style={[styles.periodTitle, { fontSize: responsiveFontSize(16) }]}>
                    {getMonthName(selectedMonth)} {selectedYear}
                  </Text>

                  {/* КАРТОЧКИ СТАТИСТИКИ */}
                  <View style={styles.statsGrid}>
                    <StatCard
                      icon="location"
                      title="Воронеж"
                      value={statistics.voronezh}
                      color="#4A90E2"
                      responsiveFontSize={responsiveFontSize}
                    />
                    <StatCard
                      icon="globe"
                      title="Другие"
                      value={statistics.other}
                      color="#34C759"
                      responsiveFontSize={responsiveFontSize}
                    />
                    <StatCard
                      icon="musical-notes"
                      title="Всего"
                      value={statistics.total}
                      color="#FFD700"
                      responsiveFontSize={responsiveFontSize}
                    />
                  </View>

                  {/* ПРОГРЕСС БАР */}
                  <View style={styles.progressSection}>
                    <Text style={[styles.progressTitle, { fontSize: responsiveFontSize(14) }]}>
                      Распределение по регионам
                    </Text>
                    <ProgressBar
                      voronezh={statistics.voronezh}
                      other={statistics.other}
                      responsiveFontSize={responsiveFontSize}
                    />
                  </View>

                  {/* ГОРОДА */}
                  {Object.keys(statistics.byCity).length > 0 && (
                    <View style={styles.citiesContainer}>
                      <Text style={[styles.citiesTitle, { fontSize: responsiveFontSize(14) }]}>
                        🏙️ По городам ({Object.keys(statistics.byCity).length})
                      </Text>

                      {Object.entries(statistics.byCity)
                        .sort(([, a], [, b]) => b.count - a.count)
                        .map(([city, data]) => (
                          <View key={city} style={styles.cityItem}>
                            <View style={styles.cityHeader}>
                              <View style={[styles.cityDot, { backgroundColor: data.color }]} />
                              <Text style={[styles.cityName, { fontSize: responsiveFontSize(13) }]}>
                                {city}
                              </Text>
                              <Text style={[styles.cityCount, { fontSize: responsiveFontSize(12) }]}>
                                {data.count}
                              </Text>
                            </View>
                            <View style={styles.cityProgressBar}>
                              <LinearGradient
                                colors={[data.color, data.color + 'cc']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={[
                                  styles.cityProgressFill,
                                  { width: `${(data.count / (statistics.total || 1)) * 100}%` }
                                ]}
                              />
                            </View>
                          </View>
                        ))}
                    </View>
                  )}
                </>
              ) : null}
            </View>
          )}

          {/* КВАРТАЛ */}
          {activeTab === 'quarter' && (
            <View style={styles.section}>
              {/* ВЫБОР КВАРТАЛА И ГОДА */}
              <View style={styles.selectorContainer}>
                <View style={styles.selectorGroup}>
                  <Text style={[styles.selectorLabel, { fontSize: responsiveFontSize(12) }]}>
                    Квартал
                  </Text>
                  <View style={styles.quartersRow}>
                    {[1, 2, 3, 4].map((q) => (
                      <TouchableOpacity
                        key={q}
                        style={[
                          styles.selectorButton,
                          selectedQuarter === q && styles.selectorButtonActive
                        ]}
                        onPress={() => setSelectedQuarter(q)}
                      >
                        <LinearGradient
                          colors={
                            selectedQuarter === q
                              ? ['#4A90E2', '#357ABD']
                              : ['rgba(100, 100, 100, 0.2)', 'rgba(100, 100, 100, 0.1)']
                          }
                          style={styles.selectorButtonGradient}
                        >
                          <Text
                            style={[
                              styles.selectorButtonText,
                              { fontSize: responsiveFontSize(12) },
                              selectedQuarter === q && styles.selectorButtonTextActive
                            ]}
                          >
                            Q{q}
                          </Text>
                        </LinearGradient>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={styles.selectorGroup}>
                  <Text style={[styles.selectorLabel, { fontSize: responsiveFontSize(12) }]}>
                    Год
                  </Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.scrollSelector}
                  >
                    {[2024, 2025, 2026, 2027].map((year) => (
                      <TouchableOpacity
                        key={year}
                        style={[
                          styles.selectorButton,
                          selectedYear === year && styles.selectorButtonActive
                        ]}
                        onPress={() => setSelectedYear(year)}
                      >
                        <LinearGradient
                          colors={
                            selectedYear === year
                              ? ['#FFD700', '#FFA500']
                              : ['rgba(100, 100, 100, 0.2)', 'rgba(100, 100, 100, 0.1)']
                          }
                          style={styles.selectorButtonGradient}
                        >
                          <Text
                            style={[
                              styles.selectorButtonText,
                              { fontSize: responsiveFontSize(11) },
                              selectedYear === year && styles.selectorButtonTextActive
                            ]}
                          >
                            {year}
                          </Text>
                        </LinearGradient>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              </View>

              {/* СТАТИСТИКА */}
              {loading ? (
                <View style={styles.loadingContainer}>
                  <Ionicons name="hourglass" size={48} color="#FFD700" />
                  <Text style={[styles.loadingText, { fontSize: responsiveFontSize(14) }]}>
                    Загрузка...
                  </Text>
                </View>
              ) : statistics && statistics.type === 'quarter' ? (
                <>
                  <Text style={[styles.periodTitle, { fontSize: responsiveFontSize(16) }]}>
                    Q{selectedQuarter} {selectedYear} ({statistics.months?.join(', ')})
                  </Text>

                  {/* КАРТОЧКИ СТАТИСТИКИ */}
                  <View style={styles.statsGrid}>
                    <StatCard
                      icon="location"
                      title="Воронеж"
                      value={statistics.voronezh}
                      color="#4A90E2"
                      responsiveFontSize={responsiveFontSize}
                    />
                    <StatCard
                      icon="globe"
                      title="Другие"
                      value={statistics.other}
                      color="#34C759"
                      responsiveFontSize={responsiveFontSize}
                    />
                    <StatCard
                      icon="musical-notes"
                      title="Всего"
                      value={statistics.total}
                      color="#FFD700"
                      responsiveFontSize={responsiveFontSize}
                    />
                  </View>

                  {/* ПРОГРЕСС БАР */}
                  <View style={styles.progressSection}>
                    <Text style={[styles.progressTitle, { fontSize: responsiveFontSize(14) }]}>
                      Распределение по регионам
                    </Text>
                    <ProgressBar
                      voronezh={statistics.voronezh}
                      other={statistics.other}
                      responsiveFontSize={responsiveFontSize}
                    />
                  </View>

                  {/* ГОРОДА */}
                  {Object.keys(statistics.byCity).length > 0 && (
                    <View style={styles.citiesContainer}>
                      <Text style={[styles.citiesTitle, { fontSize: responsiveFontSize(14) }]}>
                        🏙️ По городам ({Object.keys(statistics.byCity).length})
                      </Text>

                      {Object.entries(statistics.byCity)
                        .sort(([, a], [, b]) => b.count - a.count)
                        .map(([city, data]) => (
                          <View key={city} style={styles.cityItem}>
                            <View style={styles.cityHeader}>
                              <View style={[styles.cityDot, { backgroundColor: data.color }]} />
                              <Text style={[styles.cityName, { fontSize: responsiveFontSize(13) }]}>
                                {city}
                              </Text>
                              <Text style={[styles.cityCount, { fontSize: responsiveFontSize(12) }]}>
                                {data.count}
                              </Text>
                            </View>
                            <View style={styles.cityProgressBar}>
                              <LinearGradient
                                colors={[data.color, data.color + 'cc']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={[
                                  styles.cityProgressFill,
                                  { width: `${(data.count / (statistics.total || 1)) * 100}%` }
                                ]}
                              />
                            </View>
                          </View>
                        ))}
                    </View>
                  )}
                </>
              ) : null}
            </View>
          )}

          {/* ГОД */}
          {activeTab === 'year' && (
            <View style={styles.section}>
              {/* ВЫБОР ГОДА */}
              <View style={styles.selectorContainer}>
                <View style={styles.selectorGroup}>
                  <Text style={[styles.selectorLabel, { fontSize: responsiveFontSize(12) }]}>
                    Год
                  </Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.scrollSelector}
                  >
                    {[2024, 2025, 2026, 2027].map((year) => (
                      <TouchableOpacity
                        key={year}
                        style={[
                          styles.selectorButton,
                          selectedYear === year && styles.selectorButtonActive
                        ]}
                        onPress={() => setSelectedYear(year)}
                      >
                        <LinearGradient
                          colors={
                            selectedYear === year
                              ? ['#FFD700', '#FFA500']
                              : ['rgba(100, 100, 100, 0.2)', 'rgba(100, 100, 100, 0.1)']
                          }
                          style={styles.selectorButtonGradient}
                        >
                          <Text
                            style={[
                              styles.selectorButtonText,
                              { fontSize: responsiveFontSize(11) },
                              selectedYear === year && styles.selectorButtonTextActive
                            ]}
                          >
                            {year}
                          </Text>
                        </LinearGradient>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              </View>

              {/* СТАТИСТИКА */}
              {loading ? (
                <View style={styles.loadingContainer}>
                  <Ionicons name="hourglass" size={48} color="#FFD700" />
                  <Text style={[styles.loadingText, { fontSize: responsiveFontSize(14) }]}>
                    Загрузка...
                  </Text>
                </View>
              ) : statistics && statistics.type === 'year' ? (
                <>
                  <Text style={[styles.periodTitle, { fontSize: responsiveFontSize(16) }]}>
                    {selectedYear} год
                  </Text>

                  {/* КАРТОЧКИ СТАТИСТИКИ */}
                  <View style={styles.statsGrid}>
                    <StatCard
                      icon="location"
                      title="Воронеж"
                      value={statistics.voronezh}
                      color="#4A90E2"
                      responsiveFontSize={responsiveFontSize}
                    />
                    <StatCard
                      icon="globe"
                      title="Другие"
                      value={statistics.other}
                      color="#34C759"
                      responsiveFontSize={responsiveFontSize}
                    />
                    <StatCard
                      icon="musical-notes"
                      title="Всего"
                      value={statistics.total}
                      color="#FFD700"
                      responsiveFontSize={responsiveFontSize}
                    />
                  </View>

                  {/* ПРОГРЕСС БАР */}
                  <View style={styles.progressSection}>
                    <Text style={[styles.progressTitle, { fontSize: responsiveFontSize(14) }]}>
                      Распределение по регионам
                    </Text>
                    <ProgressBar
                      voronezh={statistics.voronezh}
                      other={statistics.other}
                      responsiveFontSize={responsiveFontSize}
                    />
                  </View>

                  {/* СТАТИСТИКА ПО КВАРТАЛАМ */}
                  {statistics.quarterStats && (
                    <View style={styles.quarterBreakdownContainer}>
                      <Text style={[styles.quarterBreakdownTitle, { fontSize: responsiveFontSize(14) }]}>
                        📊 По кварталам
                      </Text>
                      <View style={styles.quarterBreakdownGrid}>
                        {Object.entries(statistics.quarterStats).map(([q, data]) => (
                          <View key={q} style={styles.quarterBreakdownCard}>
                            <LinearGradient
                              colors={['rgba(74, 144, 226, 0.2)', 'rgba(53, 122, 189, 0.1)']}
                              style={styles.quarterBreakdownGradient}
                            >
                              <Text style={[styles.quarterLabel, { fontSize: responsiveFontSize(14) }]}>
                                {q}
                              </Text>
                              <Text style={[styles.quarterValue, { fontSize: responsiveFontSize(18) }]}>
                                {data.total}
                              </Text>
                              <Text style={[styles.quarterSubtext, { fontSize: responsiveFontSize(11) }]}>
                                В: {data.voronezh} | Др: {data.other}
                              </Text>
                            </LinearGradient>
                          </View>
                        ))}
                      </View>
                    </View>
                  )}

                  {/* ГОРОДА */}
                  {Object.keys(statistics.byCity).length > 0 && (
                    <View style={styles.citiesContainer}>
                      <Text style={[styles.citiesTitle, { fontSize: responsiveFontSize(14) }]}>
                        🏙️ По городам ({Object.keys(statistics.byCity).length})
                      </Text>

                      {Object.entries(statistics.byCity)
                        .sort(([, a], [, b]) => b.count - a.count)
                        .map(([city, data]) => (
                          <View key={city} style={styles.cityItem}>
                            <View style={styles.cityHeader}>
                              <View style={[styles.cityDot, { backgroundColor: data.color }]} />
                              <Text style={[styles.cityName, { fontSize: responsiveFontSize(13) }]}>
                                {city}
                              </Text>
                              <Text style={[styles.cityCount, { fontSize: responsiveFontSize(12) }]}>
                                {data.count}
                              </Text>
                            </View>
                            <View style={styles.cityProgressBar}>
                              <LinearGradient
                                colors={[data.color, data.color + 'cc']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={[
                                  styles.cityProgressFill,
                                  { width: `${(data.count / (statistics.total || 1)) * 100}%` }
                                ]}
                              />
                            </View>
                          </View>
                        ))}
                    </View>
                  )}
                </>
              ) : null}
            </View>
          )}
        </View>

        <View style={{ height: responsiveSize(30) }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ✅ STYLES
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 15,
    marginHorizontal: -15,
    marginTop: -10,
    marginBottom: 20,
  },
  headerTitle: {
    color: '#E0E0E0',
    fontWeight: '700',
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 15,
    gap: 10,
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderRadius: 12,
    backgroundColor: 'rgba(100, 100, 100, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(100, 100, 100, 0.3)',
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    borderColor: '#FFD700',
  },
  tabText: {
    color: '#999',
    fontWeight: '600',
    fontSize: 14,
  },
  tabTextActive: {
    color: '#FFD700',
  },
  content: {
    paddingHorizontal: 15,
  },
  section: {
    marginBottom: 20,
  },
  selectorContainer: {
    gap: 12,
    marginBottom: 20,
  },
  selectorGroup: {
    gap: 8,
  },
  selectorLabel: {
    color: '#FFD700',
    fontWeight: '700',
  },
  scrollSelector: {
    marginBottom: 0,
  },
  quartersRow: {
    flexDirection: 'row',
    gap: 8,
  },
  selectorButton: {
    marginRight: 8,
    borderRadius: 12,
    overflow: 'hidden',
  },
  selectorButtonActive: {},
  selectorButtonGradient: {
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(100, 100, 100, 0.2)',
    minWidth: 60,
    alignItems: 'center',
  },
  selectorButtonText: {
    color: '#999',
    fontWeight: '600',
  },
  selectorButtonTextActive: {
    color: '#FFF',
    fontWeight: '700',
  },
  periodTitle: {
    color: '#FFD700',
    fontWeight: '700',
    marginBottom: 12,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  statCardWrapper: {
    flex: 1,
  },
  statCard: {
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statNumber: {
    fontWeight: '800',
    color: '#E0E0E0',
    marginBottom: 4,
  },
  statLabel: {
    color: '#999',
    fontWeight: '500',
    textAlign: 'center',
  },
  progressSection: {
    backgroundColor: 'rgba(26, 26, 26, 0.8)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.2)',
  },
  progressTitle: {
    fontWeight: '700',
    color: '#FFD700',
    marginBottom: 12,
  },
  progressContainer: {
    marginBottom: 12,
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  progressLabel: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  voronejDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#4A90E2',
    marginRight: 6,
  },
  otherDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#34C759',
    marginRight: 6,
  },
  progressLabelText: {
    color: '#999',
    fontWeight: '500',
  },
  progressBarBackground: {
    height: 12,
    borderRadius: 6,
    backgroundColor: 'rgba(42, 42, 42, 0.8)',
    overflow: 'hidden',
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.2)',
  },
  progressBarFill: {
    height: '100%',
  },
  progressBarEmpty: {
    height: 12,
    borderRadius: 6,
    backgroundColor: 'rgba(42, 42, 42, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.2)',
  },
  progressEmptyText: {
    color: '#666',
    fontWeight: '500',
  },
  quarterBreakdownContainer: {
    backgroundColor: 'rgba(26, 26, 26, 0.8)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.2)',
  },
  quarterBreakdownTitle: {
    fontWeight: '700',
    color: '#FFD700',
    marginBottom: 12,
  },
  quarterBreakdownGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  quarterBreakdownCard: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  quarterBreakdownGradient: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(74, 144, 226, 0.2)',
    alignItems: 'center',
  },
  quarterLabel: {
    color: '#4A90E2',
    fontWeight: '700',
  },
  quarterValue: {
    color: '#FFD700',
    fontWeight: '800',
    marginVertical: 4,
  },
  quarterSubtext: {
    color: '#999',
    fontWeight: '500',
  },
  citiesContainer: {
    backgroundColor: 'rgba(26, 26, 26, 0.8)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.2)',
  },
  citiesTitle: {
    fontWeight: '700',
    color: '#FFD700',
    marginBottom: 12,
  },
  cityItem: {
    marginBottom: 10,
    backgroundColor: 'rgba(42, 42, 42, 0.6)',
    borderRadius: 12,
    padding: 10,
  },
  cityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 8,
  },
  cityDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  cityName: {
    flex: 1,
    color: '#E0E0E0',
    fontWeight: '600',
  },
  cityCount: {
    color: '#FFD700',
    fontWeight: '700',
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  cityProgressBar: {
    height: 6,
    backgroundColor: 'rgba(42, 42, 42, 0.8)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  cityProgressFill: {
    height: '100%',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 50,
  },
  loadingText: {
    color: '#999',
    marginTop: 12,
  },
});
