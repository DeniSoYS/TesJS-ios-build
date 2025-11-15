import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  Image,
  StyleSheet,
  View
} from 'react-native';

const { width, height } = Dimensions.get('window');

export default function SplashScreen({ onAnimationComplete }) {
  // Анимации
  const logoScale = useRef(new Animated.Value(0)).current;
  const logoRotate = useRef(new Animated.Value(0)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  
  const textSlide = useRef(new Animated.Value(50)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  
  const musicNote1Y = useRef(new Animated.Value(-100)).current;
  const musicNote2Y = useRef(new Animated.Value(-100)).current;
  const musicNote3Y = useRef(new Animated.Value(-100)).current;
  
  const shine = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Последовательная анимация
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
      
      // 3. Падающие ноты
      Animated.stagger(150, [
        Animated.timing(musicNote1Y, {
          toValue: height,
          duration: 2000,
          useNativeDriver: true,
          easing: Easing.bounce
        }),
        Animated.timing(musicNote2Y, {
          toValue: height,
          duration: 2000,
          useNativeDriver: true,
          easing: Easing.bounce
        }),
        Animated.timing(musicNote3Y, {
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
      colors={['#C41E3A', '#DAA520', '#FFD700']}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      {/* Фоновые музыкальные ноты */}
      <Animated.View style={[
        styles.musicNote,
        styles.note1,
        { transform: [{ translateY: musicNote1Y }] }
      ]}>
        <Ionicons name="musical-note" size={40} color="rgba(255, 255, 255, 0.2)" />
      </Animated.View>
      
      <Animated.View style={[
        styles.musicNote,
        styles.note2,
        { transform: [{ translateY: musicNote2Y }] }
      ]}>
        <Ionicons name="musical-notes" size={50} color="rgba(255, 255, 255, 0.2)" />
      </Animated.View>
      
      <Animated.View style={[
        styles.musicNote,
        styles.note3,
        { transform: [{ translateY: musicNote3Y }] }
      ]}>
        <Ionicons name="musical-note" size={45} color="rgba(255, 255, 255, 0.2)" />
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
            <Image 
              source={require('../assets/logo.png')}
              style={styles.logo}
              resizeMode="contain"
            />
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
            <Ionicons name="musical-notes" size={28} color="#FFFFFF" style={styles.titleIcon} />
            <Animated.Text style={styles.title}>
              Воронежский Хор
            </Animated.Text>
          </View>
          
          <View style={styles.subtitleContainer}>
            <View style={styles.divider} />
            <Animated.Text style={styles.subtitle}>
              Основан в 1943 году
            </Animated.Text>
            <View style={styles.divider} />
          </View>
          
          <Animated.Text style={styles.description}>
            Концерты • Репетиции • Напоминания
          </Animated.Text>
        </Animated.View>
      </View>

      {/* Декоративные элементы по углам */}
      <View style={styles.cornerDecor}>
        <View style={[styles.corner, styles.topLeft]} />
        <View style={[styles.corner, styles.topRight]} />
        <View style={[styles.corner, styles.bottomLeft]} />
        <View style={[styles.corner, styles.bottomRight]} />
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
    zIndex: 1,
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
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 30,
    elevation: 20,
  },
  logoWrapper: {
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 4,
    borderColor: '#FFD700',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 15,
  },
  logo: {
    width: '95%',
    height: '95%',
  },
  shineEffect: {
    position: 'absolute',
    width: 50,
    height: 250,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
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
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0, 0, 0, 0.4)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 5,
    letterSpacing: 1,
  },
  subtitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  divider: {
    width: 40,
    height: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    marginHorizontal: 15,
  },
  subtitle: {
    fontSize: 18,
    color: '#FFF8E1',
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  description: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '500',
    textAlign: 'center',
    letterSpacing: 2,
  },
  
  // Падающие ноты
  musicNote: {
    position: 'absolute',
    zIndex: 0,
  },
  note1: {
    left: '15%',
    top: -100,
  },
  note2: {
    left: '50%',
    top: -100,
  },
  note3: {
    right: '15%',
    top: -100,
  },
  
  // Декоративные углы
  cornerDecor: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  corner: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  topLeft: {
    top: 30,
    left: 30,
    borderTopWidth: 3,
    borderLeftWidth: 3,
  },
  topRight: {
    top: 30,
    right: 30,
    borderTopWidth: 3,
    borderRightWidth: 3,
  },
  bottomLeft: {
    bottom: 30,
    left: 30,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
  },
  bottomRight: {
    bottom: 30,
    right: 30,
    borderBottomWidth: 3,
    borderRightWidth: 3,
  },
});
