import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { collection, getDocs, query } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import {
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
import { calculateStatistics, getColorByRegion } from '../utils/statisticsUtils';

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
  const isSmallDevice = windowWidth < 375;
  const isLargeDevice = windowWidth > 414;
  if (isSmallDevice) return size * 0.9;
  if (isLargeDevice) return size * 1.1;
  return size;
};

// ✅ КОМПОНЕНТ ПРОГРЕСС-БАР
const ProgressBar = ({ voronezh, other, voronejPercentage, otherPercentage, responsiveFontSize }) => {
  const total = voronezh + other;
  
  return (
    <View style={styles.progressContainer}>
      <View style={styles.progressLabels}>
        <View style={styles.progressLabel}>
          <View style={styles.voronejDot} />
          <Text style={[styles.progressLabelText, { fontSize: responsiveFontSize(11) }]}>
            Воронежская: {voronezh} ({voronejPercentage}%)
          </Text>
        </View>
        <View style={styles.progressLabel}>
          <View style={styles.otherDot} />
          <Text style={[styles.progressLabelText, { fontSize: responsiveFontSize(11) }]}>
            Другие: {other} ({otherPercentage}%)
          </Text>
        </View>
      </View>
      
      {total > 0 ? (
        <View style={styles.progressBarBackground}>
          <LinearGradient
            colors={['#4A90E2', '#357ABD']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.progressBarFill, { width: `${voronejPercentage}%` }]}
          />
          <LinearGradient
            colors={['#34C759', '#28A745']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.progressBarFill, { width: `${otherPercentage}%` }]}
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

export default function StatisticsScreen({ navigation }) {
  const dimensions = useWindowDimensions();
  const responsiveSize = (size) => getResponsiveSize(size, dimensions.width);
  const responsiveFontSize = (size) => getResponsiveFontSize(size, dimensions.width);

  const [concerts, setConcerts] = useState([]);
  const [statistics, setStatistics] = useState({
    monthly: { voronezh: 0, other: 0, total: 0 },
    quarterly: { voronezh: 0, other: 0, total: 0 },
    yearly: { voronezh: 0, other: 0, total: 0 },
  });
  const [cityStats, setCityStats] = useState({});
  const [activeTab, setActiveTab] = useState('monthly'); // monthly, quarterly, yearly
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStatistics();
  }, []);

  const loadStatistics = async () => {
    try {
      setLoading(true);
      const concertsQuery = query(collection(db, 'concerts'));
      const snapshot = await getDocs(concertsQuery);
      
      const concertsData = [];
      snapshot.forEach((doc) => {
        concertsData.push({ id: doc.id, ...doc.data() });
      });
      
      setConcerts(concertsData);
      calculateStats(concertsData);
      calculateCityStats(concertsData);
    } catch (error) {
      console.error('❌ Ошибка загрузки статистики:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (concertsData) => {
    const stats = calculateStatistics(concertsData);
    
    // Добавляем годовую статистику
    let yearlyVoronezh = 0;
    let yearlyOther = 0;
    
    concertsData.forEach(concert => {
      if (concert.region === 'Воронежская область') {
        yearlyVoronezh++;
      } else {
        yearlyOther++;
      }
    });

    setStatistics({
      monthly: stats.monthly,
      quarterly: stats.quarterly,
      yearly: { voronezh: yearlyVoronezh, other: yearlyOther, total: yearlyVoronezh + yearlyOther },
    });
  };

  const calculateCityStats = (concertsData) => {
    const cities = {};

    concertsData.forEach(concert => {
      const city = concert.region || 'Неизвестно';
      
      if (!cities[city]) {
        cities[city] = {
          count: 0,
          color: getColorByRegion(city),
          isVoronezh: city === 'Воронежская область'
        };
      }
      
      cities[city].count++;
    });

    // Сортируем по количеству концертов
    const sortedCities = Object.entries(cities)
      .sort(([, a], [, b]) => b.count - a.count)
      .reduce((acc, [city, data]) => {
        acc[city] = data;
        return acc;
      }, {});

    setCityStats(sortedCities);
  };

  const getTabTitle = () => {
    const now = new Date();
    const monthNames = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
                        'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
    
    switch(activeTab) {
      case 'quarterly':
        const quarter = Math.floor(now.getMonth() / 3) + 1;
        return `${quarter} квартал ${now.getFullYear()}`;
      case 'yearly':
        return `Год ${now.getFullYear()}`;
      default:
        return `${monthNames[now.getMonth()]} ${now.getFullYear()}`;
    }
  };

  const currentStats = statistics[activeTab];
  const voronejPercent = currentStats.total > 0 ? Math.round((currentStats.voronezh / currentStats.total) * 100) : 0;
  const otherPercent = currentStats.total > 0 ? Math.round((currentStats.other / currentStats.total) * 100) : 0;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0a0a0a" />

      <LinearGradient
        colors={['#0a0a0a', '#1a1a1a', '#2a2a2a']}
        style={styles.background}
      >
        {/* ХЕДЕР */}
        <LinearGradient
          colors={['rgba(26, 26, 26, 0.98)', 'rgba(35, 35, 35, 0.95)']}
          style={[styles.header, { paddingTop: Platform.OS === 'ios' ? responsiveSize(50) : responsiveSize(30) }]}
        >
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={responsiveSize(28)} color="#FFD700" />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { fontSize: responsiveFontSize(20) }]}>
            Статистика по городам
          </Text>
          <View style={{ width: responsiveSize(28) }} />
        </LinearGradient>

        <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollView}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>Загрузка статистики...</Text>
            </View>
          ) : (
            <>
              {/* ТАБЫ */}
              <View style={styles.tabsContainer}>
                <TouchableOpacity 
                  style={[styles.tab, activeTab === 'monthly' && styles.tabActive]}
                  onPress={() => setActiveTab('monthly')}
                >
                  <Text style={[styles.tabText, activeTab === 'monthly' && styles.tabTextActive]}>
                    Месяц
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.tab, activeTab === 'quarterly' && styles.tabActive]}
                  onPress={() => setActiveTab('quarterly')}
                >
                  <Text style={[styles.tabText, activeTab === 'quarterly' && styles.tabTextActive]}>
                    Квартал
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.tab, activeTab === 'yearly' && styles.tabActive]}
                  onPress={() => setActiveTab('yearly')}
                >
                  <Text style={[styles.tabText, activeTab === 'yearly' && styles.tabTextActive]}>
                    Год
                  </Text>
                </TouchableOpacity>
              </View>

              {/* НАЗВАНИЕ ПЕРИОДА */}
              <Text style={[styles.periodTitle, { fontSize: responsiveFontSize(16) }]}>
                {getTabTitle()}
              </Text>

              {/* ПРОГРЕСС-БАР */}
              <View style={styles.statsCard}>
                <ProgressBar 
                  voronezh={currentStats.voronezh}
                  other={currentStats.other}
                  voronejPercentage={voronejPercent}
                  otherPercentage={otherPercent}
                  responsiveFontSize={responsiveFontSize}
                />
              </View>

              {/* ЦИФРЫ */}
              <View style={styles.numbersContainer}>
                <View style={styles.numberCard}>
                  <LinearGradient
                    colors={['rgba(74, 144, 226, 0.2)', 'rgba(53, 122, 189, 0.1)']}
                    style={styles.numberCardGradient}
                  >
                    <View style={styles.numberDot} />
                    <Text style={[styles.numberTitle, { fontSize: responsiveFontSize(12) }]}>
                      Воронежская область
                    </Text>
                    <Text style={[styles.numberValue, { fontSize: responsiveFontSize(24) }]}>
                      {currentStats.voronezh}
                    </Text>
                  </LinearGradient>
                </View>

                <View style={styles.numberCard}>
                  <LinearGradient
                    colors={['rgba(52, 199, 89, 0.2)', 'rgba(40, 167, 69, 0.1)']}
                    style={styles.numberCardGradient}
                  >
                    <View style={[styles.numberDot, { backgroundColor: '#34C759' }]} />
                    <Text style={[styles.numberTitle, { fontSize: responsiveFontSize(12) }]}>
                      Другие области
                    </Text>
                    <Text style={[styles.numberValue, { fontSize: responsiveFontSize(24) }]}>
                      {currentStats.other}
                    </Text>
                  </LinearGradient>
                </View>

                <View style={styles.numberCard}>
                  <LinearGradient
                    colors={['rgba(255, 215, 0, 0.2)', 'rgba(255, 165, 0, 0.1)']}
                    style={styles.numberCardGradient}
                  >
                    <View style={[styles.numberDot, { backgroundColor: '#FFD700' }]} />
                    <Text style={[styles.numberTitle, { fontSize: responsiveFontSize(12) }]}>
                      Всего концертов
                    </Text>
                    <Text style={[styles.numberValue, { fontSize: responsiveFontSize(24) }]}>
                      {currentStats.total}
                    </Text>
                  </LinearGradient>
                </View>
              </View>

              {/* СПИСОК ГОРОДОВ */}
              <View style={styles.citiesContainer}>
                <Text style={[styles.citiesTitle, { fontSize: responsiveFontSize(18) }]}>
                  Города
                </Text>

                {Object.entries(cityStats).length > 0 ? (
                  <View style={styles.citiesList}>
                    {Object.entries(cityStats).map(([city, data], index) => (
                      <View key={index} style={styles.cityItem}>
                        <LinearGradient
                          colors={[
                            data.color === '#4A90E2' 
                              ? 'rgba(74, 144, 226, 0.15)' 
                              : 'rgba(52, 199, 89, 0.15)',
                            data.color === '#4A90E2' 
                              ? 'rgba(53, 122, 189, 0.05)' 
                              : 'rgba(40, 167, 69, 0.05)'
                          ]}
                          style={styles.cityItemGradient}
                        >
                          <View style={styles.cityInfo}>
                            <View style={[styles.cityDot, { backgroundColor: data.color }]} />
                            <Text style={[styles.cityName, { fontSize: responsiveFontSize(14) }]}>
                              {city}
                            </Text>
                          </View>
                          <Text style={[styles.cityCount, { fontSize: responsiveFontSize(16) }]}>
                            {data.count}
                          </Text>
                        </LinearGradient>
                      </View>
                    ))}
                  </View>
                ) : (
                  <View style={styles.noCities}>
                    <Text style={styles.noCitiesText}>Концертов нет</Text>
                  </View>
                )}
              </View>

              <View style={{ height: responsiveSize(30) }} />
            </>
          )}
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 215, 0, 0.3)',
  },
  headerTitle: {
    color: '#E0E0E0',
    fontWeight: '700',
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 15,
    paddingTop: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
  },
  loadingText: {
    color: '#888',
    fontSize: 16,
  },
  tabsContainer: {
    flexDirection: 'row',
    marginBottom: 20,
    gap: 10,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 12,
    backgroundColor: 'rgba(42, 42, 42, 0.5)',
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.15)',
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: 'rgba(255, 215, 0, 0.3)',
    borderColor: 'rgba(255, 215, 0, 0.5)',
  },
  tabText: {
    color: '#888',
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#FFD700',
  },
  periodTitle: {
    color: '#999',
    textAlign: 'center',
    fontWeight: '500',
    marginBottom: 20,
  },
  statsCard: {
    backgroundColor: 'rgba(42, 42, 42, 0.6)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.2)',
    marginBottom: 20,
  },
  progressContainer: {
    marginBottom: 0,
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
  numbersContainer: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  numberCard: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  numberCardGradient: {
    padding: 16,
    alignItems: 'center',
  },
  numberDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#4A90E2',
    marginBottom: 8,
  },
  numberTitle: {
    color: '#999',
    fontWeight: '500',
    marginBottom: 8,
    textAlign: 'center',
  },
  numberValue: {
    color: '#E0E0E0',
    fontWeight: '800',
  },
  citiesContainer: {
    marginBottom: 20,
  },
  citiesTitle: {
    color: '#E0E0E0',
    fontWeight: '700',
    marginBottom: 12,
  },
  citiesList: {
    gap: 8,
  },
  cityItem: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  cityItemGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.2)',
  },
  cityInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  cityDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 10,
  },
  cityName: {
    color: '#E0E0E0',
    fontWeight: '500',
  },
  cityCount: {
    color: '#FFD700',
    fontWeight: '700',
  },
  noCities: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  noCitiesText: {
    color: '#666',
    fontSize: 16,
  },
});
