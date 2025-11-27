import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef, useState } from 'react';
import {
    Animated,
    Dimensions,
    Platform,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { auth } from '../firebaseConfig';
import {
    getAvailableMonthsForYear,
    getAvailableYears,
    getMonthStatistics,
    getQuarterStatistics,
    getYearStatistics
} from '../utils/statisticsStorage';

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

export default function HistoryStatisticsScreen({ navigation }) {
  const dimensions = useWindowDimensions();
  const [view, setView] = useState('years'); // years, months, month, quarter, year
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedQuarter, setSelectedQuarter] = useState(0);
  const [years, setYears] = useState([]);
  const [months, setMonths] = useState([]);
  const [currentData, setCurrentData] = useState(null);
  const [loading, setLoading] = useState(true);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const responsiveSize = (size) => getResponsiveSize(size, dimensions.width);
  const responsiveFontSize = (size) => getResponsiveFontSize(size, dimensions.width);

  // ✅ ЗАГРУЗКА ДОСТУПНЫХ ЛЕТ
  useEffect(() => {
    loadYears();
  }, []);

  // ✅ ЗАГРУЗКА МЕСЯЦЕВ ВЫБРАННОГО ГОДА
  useEffect(() => {
    if (selectedYear && view !== 'years') {
      loadMonths(selectedYear);
    }
  }, [selectedYear, view]);

  const loadYears = async () => {
    try {
      if (!auth.currentUser) {
        setLoading(false);
        return;
      }

      const availableYears = await getAvailableYears();
      setYears(availableYears.length > 0 ? availableYears : [new Date().getFullYear()]);
      setLoading(false);
    } catch (error) {
      console.error('❌ Ошибка при загрузке лет:', error);
      setLoading(false);
    }
  };

  const loadMonths = async (year) => {
    try {
      const availableMonths = await getAvailableMonthsForYear(year);
      setMonths(availableMonths);
    } catch (error) {
      console.error('❌ Ошибка при загрузке месяцев:', error);
    }
  };

  const handleYearSelect = async (year) => {
    setSelectedYear(year);
    setLoading(true);
    
    try {
      const yearStat = await getYearStatistics(year);
      setCurrentData(yearStat);
      setView('year');
    } catch (error) {
      console.error('❌ Ошибка:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMonthSelect = async (monthKey) => {
    setSelectedMonth(monthKey);
    setLoading(true);

    try {
      const monthStat = await getMonthStatistics(monthKey);
      setCurrentData(monthStat);
      setView('month');
    } catch (error) {
      console.error('❌ Ошибка:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleQuarterSelect = async (quarter, year) => {
    setSelectedQuarter(quarter);
    setLoading(true);

    try {
      const quarterStat = await getQuarterStatistics(quarter, year);
      setCurrentData(quarterStat);
      setView('quarter');
    } catch (error) {
      console.error('❌ Ошибка:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, [view, currentData]);

  // ✅ RENDER: ВИД ЛЕТ
  if (view === 'years') {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#0a0a0a" />
        <LinearGradient colors={['#0a0a0a', '#1a1a1a', '#2a2a2a']} style={styles.background}>
          {/* HEADER */}
          <LinearGradient
            colors={['rgba(26, 26, 26, 0.98)', 'rgba(35, 35, 35, 0.95)']}
            style={[styles.header, { paddingTop: Platform.OS === 'ios' ? responsiveSize(50) : responsiveSize(30) }]}
          >
            <View style={styles.headerTop}>
              <TouchableOpacity onPress={() => navigation.goBack()}>
                <LinearGradient colors={['#FFD700', '#FFA500']} style={styles.backButton}>
                  <Ionicons name="chevron-back" size={responsiveSize(24)} color="#1a1a1a" />
                </LinearGradient>
              </TouchableOpacity>

              <View style={styles.titleContainer}>
                <Text style={[styles.mainTitle, { fontSize: responsiveFontSize(22) }]}>📊 История</Text>
                <Text style={[styles.subtitle, { fontSize: responsiveFontSize(12) }]}>Статистика по годам</Text>
              </View>
            </View>
          </LinearGradient>

          {/* CONTENT */}
          <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollView}>
            <View style={styles.contentContainer}>
              <Text style={[styles.sectionTitle, { fontSize: responsiveFontSize(18) }]}>
                Выберите год
              </Text>

              {years.map((year) => (
                <TouchableOpacity
                  key={year}
                  style={styles.yearCard}
                  onPress={() => handleYearSelect(year)}
                >
                  <LinearGradient
                    colors={['rgba(255, 215, 0, 0.2)', 'rgba(255, 165, 0, 0.1)']}
                    style={styles.yearCardGradient}
                  >
                    <Text style={[styles.yearCardText, { fontSize: responsiveFontSize(20) }]}>
                      {year}
                    </Text>
                    <Ionicons name="chevron-forward" size={responsiveSize(24)} color="#FFD700" />
                  </LinearGradient>
                </TouchableOpacity>
              ))}

              <View style={{ height: responsiveSize(20) }} />
            </View>
          </ScrollView>
        </LinearGradient>
      </View>
    );
  }

  // ✅ RENDER: ВИД МЕСЯЦЕВ
  if (view === 'months') {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#0a0a0a" />
        <LinearGradient colors={['#0a0a0a', '#1a1a1a', '#2a2a2a']} style={styles.background}>
          {/* HEADER */}
          <LinearGradient
            colors={['rgba(26, 26, 26, 0.98)', 'rgba(35, 35, 35, 0.95)']}
            style={[styles.header, { paddingTop: Platform.OS === 'ios' ? responsiveSize(50) : responsiveSize(30) }]}
          >
            <View style={styles.headerTop}>
              <TouchableOpacity onPress={() => setView('years')}>
                <LinearGradient colors={['#FFD700', '#FFA500']} style={styles.backButton}>
                  <Ionicons name="chevron-back" size={responsiveSize(24)} color="#1a1a1a" />
                </LinearGradient>
              </TouchableOpacity>

              <View style={styles.titleContainer}>
                <Text style={[styles.mainTitle, { fontSize: responsiveFontSize(22) }]}>📅 {selectedYear}</Text>
                <Text style={[styles.subtitle, { fontSize: responsiveFontSize(12) }]}>Выберите месяц или квартал</Text>
              </View>
            </View>
          </LinearGradient>

          {/* CONTENT */}
          <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollView}>
            <View style={styles.contentContainer}>
              {/* КВАРТАЛЫ */}
              <Text style={[styles.sectionTitle, { fontSize: responsiveFontSize(16), marginBottom: 12 }]}>
                🎯 По кварталам
              </Text>
              <View style={styles.quartersGrid}>
                {[1, 2, 3, 4].map((q) => (
                  <TouchableOpacity
                    key={q}
                    style={styles.quarterCard}
                    onPress={() => handleQuarterSelect(q, selectedYear)}
                  >
                    <LinearGradient
                      colors={['rgba(74, 144, 226, 0.2)', 'rgba(53, 122, 189, 0.1)']}
                      style={styles.quarterCardGradient}
                    >
                      <Text style={[styles.quarterCardText, { fontSize: responsiveFontSize(18) }]}>
                        Q{q}
                      </Text>
                    </LinearGradient>
                  </TouchableOpacity>
                ))}
              </View>

              {/* МЕСЯЦЫ */}
              <Text style={[styles.sectionTitle, { fontSize: responsiveFontSize(16), marginTop: 20, marginBottom: 12 }]}>
                📍 По месяцам
              </Text>

              {months.map((monthData) => (
                <TouchableOpacity
                  key={monthData.key}
                  style={styles.monthCard}
                  onPress={() => handleMonthSelect(monthData.key)}
                >
                  <LinearGradient
                    colors={['rgba(52, 199, 89, 0.2)', 'rgba(40, 167, 69, 0.1)']}
                    style={styles.monthCardGradient}
                  >
                    <View>
                      <Text style={[styles.monthCardTitle, { fontSize: responsiveFontSize(14) }]}>
                        {monthData.data.monthName} ({monthData.key})
                      </Text>
                      {monthData.data.monthly && (
                        <Text style={[styles.monthCardSubtitle, { fontSize: responsiveFontSize(12) }]}>
                          Концертов: {monthData.data.monthly.total || 0}
                        </Text>
                      )}
                    </View>
                    <Ionicons name="chevron-forward" size={responsiveSize(20)} color="#34C759" />
                  </LinearGradient>
                </TouchableOpacity>
              ))}

              <View style={{ height: responsiveSize(20) }} />
            </View>
          </ScrollView>
        </LinearGradient>
      </View>
    );
  }

  // ✅ RENDER: ДЕТАЛЬНАЯ СТАТИСТИКА
  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <StatusBar barStyle="light-content" backgroundColor="#0a0a0a" />
      <LinearGradient colors={['#0a0a0a', '#1a1a1a', '#2a2a2a']} style={styles.background}>
        {/* HEADER */}
        <LinearGradient
          colors={['rgba(26, 26, 26, 0.98)', 'rgba(35, 35, 35, 0.95)']}
          style={[styles.header, { paddingTop: Platform.OS === 'ios' ? responsiveSize(50) : responsiveSize(30) }]}
        >
          <View style={styles.headerTop}>
            <TouchableOpacity
              onPress={() => {
                if (view === 'year' || view === 'quarter') {
                  setView('months');
                } else {
                  setView('months');
                }
              }}
            >
              <LinearGradient colors={['#FFD700', '#FFA500']} style={styles.backButton}>
                <Ionicons name="chevron-back" size={responsiveSize(24)} color="#1a1a1a" />
              </LinearGradient>
            </TouchableOpacity>

            <View style={styles.titleContainer}>
              <Text style={[styles.mainTitle, { fontSize: responsiveFontSize(20) }]}>
                {view === 'year' && `${selectedYear} год`}
                {view === 'quarter' && `Q${selectedQuarter} ${selectedYear}`}
                {view === 'month' && selectedMonth}
              </Text>
              <Text style={[styles.subtitle, { fontSize: responsiveFontSize(12) }]}>Детальная статистика</Text>
            </View>
          </View>
        </LinearGradient>

        {/* CONTENT */}
        <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollView}>
          <View style={styles.contentContainer}>
            {loading ? (
              <View style={styles.loadingContainer}>
                <Ionicons name="hourglass" size={48} color="#FFD700" />
                <Text style={[styles.loadingText, { fontSize: responsiveFontSize(14) }]}>
                  Загрузка...
                </Text>
              </View>
            ) : currentData ? (
              <>
                {/* СТАТИСТИКА КАРТОЧКИ */}
                <View style={styles.statsGrid}>
                  <StatCard
                    icon="location"
                    title="Воронеж"
                    value={currentData.voronezh || 0}
                    color="#4A90E2"
                    responsiveFontSize={responsiveFontSize}
                  />
                  <StatCard
                    icon="globe"
                    title="Другие"
                    value={currentData.other || 0}
                    color="#34C759"
                    responsiveFontSize={responsiveFontSize}
                  />
                  <StatCard
                    icon="musical-notes"
                    title="Всего"
                    value={currentData.total || 0}
                    color="#FFD700"
                    responsiveFontSize={responsiveFontSize}
                  />
                </View>

                {/* ПРОГРЕСС-БАР */}
                <View style={styles.progressSection}>
                  <Text style={[styles.progressTitle, { fontSize: responsiveFontSize(14) }]}>
                    Распределение по регионам
                  </Text>
                  <ProgressBar
                    voronezh={currentData.voronezh || 0}
                    other={currentData.other || 0}
                    responsiveFontSize={responsiveFontSize}
                  />
                </View>

                {/* СПИСОК ГОРОДОВ */}
                {currentData.byCity && Object.keys(currentData.byCity).length > 0 && (
                  <View style={styles.citiesContainer}>
                    <Text style={[styles.citiesTitle, { fontSize: responsiveFontSize(14) }]}>
                      🏙️ По городам ({Object.keys(currentData.byCity).length})
                    </Text>

                    {Object.entries(currentData.byCity)
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
                                { width: `${(data.count / (currentData.total || 1)) * 100}%` }
                              ]}
                            />
                          </View>
                        </View>
                      ))}
                  </View>
                )}

                <View style={{ height: responsiveSize(20) }} />
              </>
            ) : (
              <View style={styles.emptyContainer}>
                <Ionicons name="document-outline" size={48} color="#555" />
                <Text style={[styles.emptyText, { fontSize: responsiveFontSize(14) }]}>
                  Данные не найдены
                </Text>
              </View>
            )}
          </View>
        </ScrollView>
      </LinearGradient>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  background: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 215, 0, 0.3)',
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleContainer: {
    flex: 1,
  },
  mainTitle: {
    fontWeight: '800',
    color: '#E0E0E0',
    marginBottom: 2,
  },
  subtitle: {
    color: '#999',
    fontWeight: '500',
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 15,
    paddingVertical: 20,
  },
  sectionTitle: {
    fontWeight: '700',
    color: '#FFD700',
    marginBottom: 12,
  },
  yearCard: {
    marginBottom: 12,
    borderRadius: 16,
    overflow: 'hidden',
  },
  yearCardGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.2)',
  },
  yearCardText: {
    fontWeight: '700',
    color: '#FFD700',
  },
  quartersGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  quarterCard: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  quarterCardGradient: {
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(74, 144, 226, 0.2)',
  },
  quarterCardText: {
    fontWeight: '700',
    color: '#4A90E2',
  },
  monthCard: {
    marginBottom: 10,
    borderRadius: 12,
    overflow: 'hidden',
  },
  monthCardGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(52, 199, 89, 0.2)',
  },
  monthCardTitle: {
    fontWeight: '600',
    color: '#E0E0E0',
  },
  monthCardSubtitle: {
    color: '#999',
    marginTop: 4,
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
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 50,
  },
  emptyText: {
    color: '#888',
    marginTop: 12,
  },
});