import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { collection, getDocs } from 'firebase/firestore';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
    Animated,
    Dimensions,
    FlatList,
    Platform,
    SafeAreaView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { db } from '../firebaseConfig';
import { getColorByRegion } from '../utils/statisticsUtils';

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

// ✅ КОМПОНЕНТ ОБЛАСТИ
const RegionCard = ({ regionName, cities, totalConcerts, responsiveFontSize }) => {
  const [expanded, setExpanded] = useState(false);
  const color = getColorByRegion(regionName);

  return (
    <View style={styles.regionCardContainer}>
      <LinearGradient
        colors={[color + '25', color + '10']}
        style={styles.regionCard}
      >
        <TouchableOpacity
          style={styles.regionHeader}
          onPress={() => setExpanded(!expanded)}
        >
          <View style={[styles.regionDot, { backgroundColor: color }]} />
          <View style={styles.regionInfo}>
            <Text style={[styles.regionName, { fontSize: responsiveFontSize(14) }]}>
              {regionName}
            </Text>
            <Text style={[styles.regionCount, { fontSize: responsiveFontSize(12) }]}>
              {totalConcerts} {totalConcerts === 1 ? 'концерт' : totalConcerts % 10 === 1 && totalConcerts !== 11 ? 'концерт' : 'концертов'}
            </Text>
          </View>
          <Ionicons
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={responsiveFontSize(20)}
            color={color}
          />
        </TouchableOpacity>

        {expanded && cities.length > 0 && (
          <View style={styles.citiesListContainer}>
            {cities.map((city, index) => (
              <View
                key={index}
                style={[
                  styles.cityItem,
                  index === cities.length - 1 && styles.cityItemLast
                ]}
              >
                <View style={styles.cityBullet} />
                <Text style={[styles.cityItemText, { fontSize: responsiveFontSize(12) }]}>
                  {city}
                </Text>
              </View>
            ))}
          </View>
        )}
      </LinearGradient>
    </View>
  );
};

// ✅ ГЛАВНЫЙ КОМПОНЕНТ
export default function CitiesScreen({ navigation }) {
  const dimensions = useWindowDimensions();
  const [regions, setRegions] = useState({});
  const [loading, setLoading] = useState(true);
  const [totalCities, setTotalCities] = useState(0);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const responsiveSize = (size) => getResponsiveSize(size, dimensions.width);
  const responsiveFontSize = (size) => getResponsiveFontSize(size, dimensions.width);

  // ✅ СИНХРОНИЗАЦИЯ С КАЛЕНДАРЕМ - Загрузка при каждом открытии экрана!
  useFocusEffect(
    useCallback(() => {
      console.log('🏙️ CitiesScreen: Открыт экран городов - загружаем свежие данные');
      loadAllCities();
    }, [])
  );

  const loadAllCities = async () => {
    setLoading(true);
    try {
      console.log('📅 Загружаем города и концерты из Firebase...');
      
      const concertsRef = collection(db, 'concerts');
      const querySnapshot = await getDocs(concertsRef);

      const regionsData = {};
      const citiesSet = new Set();
      let totalConcerts = 0;

      console.log(`📊 Всего концертов в базе: ${querySnapshot.size}`);

      querySnapshot.forEach((doc) => {
        const concert = doc.data();
        const region = concert.region || 'Неизвестно';
        const city = concert.address || 'Не указано';

        // Пропускаем концерты без региона
        if (!region || region === 'Неизвестно') {
          return;
        }

        // Инициализируем регион
        if (!regionsData[region]) {
          regionsData[region] = {
            cities: new Set(),
            count: 0
          };
        }

        // ✅ Добавляем город в Set (автоматически удаляет дубликаты!)
        regionsData[region].cities.add(city);
        regionsData[region].count++;
        citiesSet.add(city);
        totalConcerts++;
      });

      // ✅ Конвертируем Set в Array (каждый город только один раз!)
      const sortedRegions = {};
      Object.entries(regionsData)
        .sort(([, a], [, b]) => b.count - a.count)
        .forEach(([region, data]) => {
          const uniqueCities = Array.from(data.cities).sort();
          sortedRegions[region] = {
            cities: uniqueCities,
            count: data.count
          };
          console.log(`✅ ${region}: ${uniqueCities.length} уникальных городов, ${data.count} концертов`);
        });

      setRegions(sortedRegions);
      setTotalCities(citiesSet.size);
      setLoading(false);

      console.log(`✅ Успешно загружено: ${citiesSet.size} уникальных городов из ${totalConcerts} концертов`);

      // Анимация
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }).start();
    } catch (error) {
      console.error('❌ Ошибка при загрузке городов:', error);
      setLoading(false);
    }
  };

  // ✅ RENDER
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1a1a1a" />

      {/* HEADER */}
      <LinearGradient
        colors={['#2a2a2a', '#1a1a1a']}
        style={styles.header}
      >
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={responsiveSize(28)} color="#FFD700" />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { fontSize: responsiveFontSize(20) }]}>
          🏙️ Города и области
        </Text>
        <View style={{ width: responsiveSize(28) }} />
      </LinearGradient>

      {/* СТАТИСТИКА */}
      <View style={styles.statsContainer}>
        <LinearGradient
          colors={['rgba(255, 215, 0, 0.2)', 'rgba(255, 215, 0, 0.1)']}
          style={styles.statCard}
        >
          <View style={styles.statItem}>
            <Ionicons name="location" size={24} color="#FFD700" />
            <View style={styles.statContent}>
              <Text style={[styles.statLabel, { fontSize: responsiveFontSize(11) }]}>
                Всего областей
              </Text>
              <Text style={[styles.statValue, { fontSize: responsiveFontSize(18) }]}>
                {Object.keys(regions).length}
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.statItem}>
            <Ionicons name="pin" size={24} color="#34C759" />
            <View style={styles.statContent}>
              <Text style={[styles.statLabel, { fontSize: responsiveFontSize(11) }]}>
                Всего городов
              </Text>
              <Text style={[styles.statValue, { fontSize: responsiveFontSize(18) }]}>
                {totalCities}
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.statItem}>
            <Ionicons name="musical-notes" size={24} color="#4A90E2" />
            <View style={styles.statContent}>
              <Text style={[styles.statLabel, { fontSize: responsiveFontSize(11) }]}>
                Всего концертов
              </Text>
              <Text style={[styles.statValue, { fontSize: responsiveFontSize(18) }]}>
                {Object.values(regions).reduce((sum, region) => sum + region.count, 0)}
              </Text>
            </View>
          </View>
        </LinearGradient>
      </View>

      {/* СПИСОК ОБЛАСТЕЙ */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <Ionicons name="hourglass" size={48} color="#FFD700" />
          <Text style={[styles.loadingText, { fontSize: responsiveFontSize(14) }]}>
            Загрузка...
          </Text>
        </View>
      ) : Object.keys(regions).length > 0 ? (
        <FlatList
          data={Object.entries(regions)}
          keyExtractor={([region]) => region}
          renderItem={({ item: [regionName, data] }) => (
            <RegionCard
              regionName={regionName}
              cities={data.cities}
              totalConcerts={data.count}
              responsiveFontSize={responsiveFontSize}
            />
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Ionicons name="sad" size={48} color="#666" />
          <Text style={[styles.emptyText, { fontSize: responsiveFontSize(14) }]}>
            Нет данных о городах
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
}

// ✅ STYLES
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
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
  statsContainer: {
    paddingHorizontal: 15,
    marginBottom: 20,
  },
  statCard: {
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.2)',
  },
  statItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  statContent: {
    flex: 1,
  },
  statLabel: {
    color: '#999',
    fontWeight: '500',
  },
  statValue: {
    color: '#FFD700',
    fontWeight: '800',
    marginTop: 2,
  },
  divider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    marginHorizontal: 12,
  },
  listContent: {
    paddingHorizontal: 15,
    paddingBottom: 30,
  },
  regionCardContainer: {
    marginBottom: 12,
  },
  regionCard: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  regionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  regionDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  regionInfo: {
    flex: 1,
  },
  regionName: {
    color: '#E0E0E0',
    fontWeight: '700',
  },
  regionCount: {
    color: '#999',
    fontWeight: '500',
    marginTop: 2,
  },
  citiesListContainer: {
    backgroundColor: 'rgba(26, 26, 26, 0.5)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
  },
  cityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
    gap: 10,
  },
  cityItemLast: {
    borderBottomWidth: 0,
  },
  cityBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  cityItemText: {
    color: '#D0D0D0',
    fontWeight: '400',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#999',
    marginTop: 12,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: '#666',
    marginTop: 12,
  },
});