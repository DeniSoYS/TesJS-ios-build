import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { useEffect, useRef } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  StyleSheet,
  Text,
  View
} from 'react-native';

const { width, height } = Dimensions.get('window');

export default function SplashScreen({ onAnimationComplete }) {
  // Анимации (сохраняем всю логику)
  const logoScale = useRef(new Animated.Value(0)).current;
  const logoRotate = useRef(new Animated.Value(0)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;

  const textSlide = useRef(new Animated.Value(50)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;

  const calendar1Y = useRef(new Animated.Value(-100)).current;
  const calendar2Y = useRef(new Animated.Value(-100)).current;
  const calendar3Y = useRef(new Animated.Value(-100)).current;

  const shine = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Устанавливаем цвет нижней панели (Android)
    SystemUI.setBackgroundColorAsync('#0a0a0a');
    
    // Последовательная анимация (сохраняем логику)
    Animated.sequence([
      // 1. Появление логотипа с вращением
      Animated.parallel([
        Animated.timing(logoScale, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
          easing: Easing.elastic(1.2)
        }),
        Animated.timing(logoRotate, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
          easing: Easing.out(Easing.cubic)
        }),
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true
        })
      ]),

      // 2. Появление текста
      Animated.parallel([
        Animated.timing(textSlide, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
          easing: Easing.out(Easing.quad)
        }),
        Animated.timing(textOpacity, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true
        })
      ]),

      // 3. Падающие календарные элементы
      Animated.stagger(150, [
        Animated.timing(calendar1Y, {
          toValue: height,
          duration: 2000,
          useNativeDriver: true,
          easing: Easing.bounce
        }),
        Animated.timing(calendar2Y, {
          toValue: height,
          duration: 2000,
          useNativeDriver: true,
          easing: Easing.bounce
        }),
        Animated.timing(calendar3Y, {
          toValue: height,
          duration: 2000,
          useNativeDriver: true,
          easing: Easing.bounce
        })
      ])
    ]).start();

    // Эффект блеска
    Animated.loop(
      Animated.sequence([
        Animated.timing(shine, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
          easing: Easing.linear
        }),
        Animated.timing(shine, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true
        })
      ])
    ).start();

    // Завершение анимации
    const timer = setTimeout(() => {
      onAnimationComplete();
    }, 3500);

    return () => clearTimeout(timer);
  }, []);

  const logoRotateInterpolate = logoRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg']
  });

  const shineTranslate = shine.interpolate({
    inputRange: [0, 1],
    outputRange: [-width, width * 2]
  });

  return (
    <LinearGradient
      colors={['#0a0a0a', '#1a1a1a', '#2a2a2a']}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      {/* StatusBar прозрачный */}
      <StatusBar style="light" translucent backgroundColor="transparent" />

      {/* Фоновые календарные элементы */}
      <Animated.View style={[
        styles.calendarElement,
        styles.element1,
        { transform: [{ translateY: calendar1Y }] }
      ]}>
        <Ionicons name="calendar" size={40} color="rgba(255, 215, 0, 0.2)" />
      </Animated.View>

      <Animated.View style={[
        styles.calendarElement,
        styles.element2,
        { transform: [{ translateY: calendar2Y }] }
      ]}>
        <Ionicons name="time" size={50} color="rgba(255, 215, 0, 0.2)" />
      </Animated.View>

      <Animated.View style={[
        styles.calendarElement,
        styles.element3,
        { transform: [{ translateY: calendar3Y }] }
      ]}>
        <Ionicons name="notifications" size={45} color="rgba(255, 215, 0, 0.2)" />
      </Animated.View>

      {/* Основной контент */}
      <View style={styles.content}>
        {/* Логотип с анимацией */}
        <Animated.View style={[
          styles.logoContainer,
          {
            transform: [
              { scale: logoScale },
              { rotate: logoRotateInterpolate }
            ],
            opacity: logoOpacity
          }
        ]}>
          {/* Светящийся фон */}
          <View style={styles.glowBackground} />

          {/* Логотип */}
          <View style={styles.logoWrapper}>
            <View style={styles.calendarIconContainer}>
              <Ionicons name="calendar" size={120} color="#FFD700" />
              <View style={styles.calendarBadge}>
                <Text style={styles.calendarDate}>31</Text>
              </View>
            </View>
          </View>

          {/* Эффект блеска */}
          <Animated.View style={[
            styles.shineEffect,
            { transform: [{ translateX: shineTranslate }] }
          ]} />
        </Animated.View>

        {/* Текст с анимацией */}
        <Animated.View style={[
          styles.textContainer,
          {
            transform: [{ translateY: textSlide }],
            opacity: textOpacity
          }
        ]}>
          <View style={styles.titleWrapper}>
            <Ionicons name="calendar" size={32} color="#FFD700" style={styles.titleIcon} />
            <Animated.Text style={styles.title}>
              Концертный Календарь
            </Animated.Text>
          </View>

          <View style={styles.subtitleContainer}>
            <View style={styles.divider} />
            <Animated.Text style={styles.subtitle}>
              Управление мероприятиями
            </Animated.Text>
            <View style={styles.divider} />
          </View>

          <View style={styles.featuresContainer}>
            <View style={styles.featureItem}>
              <Ionicons name="musical-notes" size={16} color="#FFD700" />
              <Animated.Text style={styles.featureText}>Концерты</Animated.Text>
            </View>
            <View style={styles.featureDot} />
            <View style={styles.featureItem}>
              <Ionicons name="airplane" size={16} color="#FFD700" />
              <Animated.Text style={styles.featureText}>Гастроли</Animated.Text>
            </View>
            <View style={styles.featureDot} />
            <View style={styles.featureItem}>
              <Ionicons name="bus" size={16} color="#FFD700" />
              <Animated.Text style={styles.featureText}>Переезды</Animated.Text>
            </View>
          </View>
        </Animated.View>
      </View>

      {/* Декоративные элементы по углам */}
      <View style={styles.cornerDecor}>
        <View style={[styles.corner, styles.topLeft]} />
        <View style={[styles.corner, styles.topRight]} />
        <View style={[styles.corner, styles.bottomLeft]} />
        <View style={[styles.corner, styles.bottomRight]} />
      </View>

      {/* Фоновый узор */}
      <View style={styles.backgroundPattern}>
        <View style={styles.patternLine} />
        <View style={[styles.patternLine, styles.patternLine2]} />
        <View style={[styles.patternLine, styles.patternLine3]} />
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    zIndex: 2,
  },

  // Логотип
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginBottom: 60,
  },
  glowBackground: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 30,
    elevation: 20,
  },
  logoWrapper: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(26, 26, 26, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: '#FFD700',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 15,
    elevation: 15,
  },
  calendarIconContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarBadge: {
    position: 'absolute',
    top: 25,
    right: 25,
    backgroundColor: '#FFD700',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#1a1a1a',
  },
  calendarDate: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  shineEffect: {
    position: 'absolute',
    width: 50,
    height: 250,
    backgroundColor: 'rgba(255, 215, 0, 0.3)',
    transform: [{ rotate: '45deg' }],
  },

  // Текст
  textContainer: {
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  titleWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  titleIcon: {
    marginRight: 12,
    textShadowColor: 'rgba(255, 215, 0, 0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textShadowColor: 'rgba(255, 215, 0, 0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 5,
    letterSpacing: 1,
    textAlign: 'center',
  },
  subtitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 25,
  },
  divider: {
    width: 30,
    height: 2,
    backgroundColor: 'rgba(255, 215, 0, 0.5)',
    marginHorizontal: 12,
  },
  subtitle: {
    fontSize: 16,
    color: '#FFD700',
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  featuresContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 8,
  },
  featureText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '500',
    marginLeft: 4,
  },
  featureDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 215, 0, 0.5)',
    marginHorizontal: 4,
  },

  // Падающие календарные элементы
  calendarElement: {
    position: 'absolute',
    zIndex: 1,
  },
  element1: {
    left: '15%',
    top: -100,
  },
  element2: {
    left: '50%',
    top: -100,
  },
  element3: {
    right: '15%',
    top: -100,
  },

  // Декоративные углы
  cornerDecor: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    zIndex: 1,
  },
  corner: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderColor: 'rgba(255, 215, 0, 0.3)',
  },
  topLeft: {
    top: 30,
    left: 30,
    borderTopWidth: 2,
    borderLeftWidth: 2,
  },
  topRight: {
    top: 30,
    right: 30,
    borderTopWidth: 2,
    borderRightWidth: 2,
  },
  bottomLeft: {
    bottom: 30,
    left: 30,
    borderBottomWidth: 2,
    borderLeftWidth: 2,
  },
  bottomRight: {
    bottom: 30,
    right: 30,
    borderBottomWidth: 2,
    borderRightWidth: 2,
  },

  // Фоновый узор
  backgroundPattern: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    zIndex: 0,
  },
  patternLine: {
    position: 'absolute',
    width: '100%',
    height: 1,
    backgroundColor: 'rgba(255, 215, 0, 0.05)',
    top: '25%',
  },
  patternLine2: {
    top: '50%',
    backgroundColor: 'rgba(255, 215, 0, 0.03)',
  },
  patternLine3: {
    top: '75%',
    backgroundColor: 'rgba(255, 215, 0, 0.02)',
  },
});