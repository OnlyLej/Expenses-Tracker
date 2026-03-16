import { useTheme } from '@/context/ThemeContext';
import { MaterialIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import React, { useEffect, useRef, useState } from 'react';
import {
    Animated, Dimensions, Modal,
    StyleSheet,
    Text, TouchableOpacity,
    View,
} from 'react-native';

const { width: W, height: H } = Dimensions.get('window');

const STEPS = [
  {
    title:    'Welcome to ExpenseTracker! 👋',
    desc:     'Track your spending, set budgets, and reach your financial goals. Let\'s take a quick tour!',
    icon:     'account-balance-wallet' as const,
    position: 'center' as const,
    arrow:    null,
  },
  {
    title:    'Overview',
    desc:     'Your home screen shows total spending, budget progress, weekly comparison, and all transactions.',
    icon:     'home' as const,
    position: 'bottom' as const,
    arrow:    'down' as const,
    tabIndex: 0,
  },
  {
    title:    'Quick Add ➕',
    desc:     'The floating + button lets you log an expense instantly from any screen without switching tabs.',
    icon:     'add-circle' as const,
    position: 'bottom-right' as const,
    arrow:    'down' as const,
  },
  {
    title:    'Analytics 📊',
    desc:     'See a 6-month spending bar chart and category breakdown with real-time animated bars.',
    icon:     'bar-chart' as const,
    position: 'bottom' as const,
    arrow:    'down' as const,
    tabIndex: 1,
  },
  {
    title:    'Spending Goals 🎯',
    desc:     'Set monthly limits per category. You\'ll get alerts when you\'re close to or over your limit.',
    icon:     'flag' as const,
    position: 'bottom' as const,
    arrow:    'down' as const,
    tabIndex: 2,
  },
  {
    title:    'Reports 📈',
    desc:     'Get smart insights — daily averages, monthly projections, and personalized spending tips.',
    icon:     'assessment' as const,
    position: 'bottom' as const,
    arrow:    'down' as const,
    tabIndex: 3,
  },
  {
    title:    'Recurring Expenses 🔁',
    desc:     'Set up bills that auto-add every month — rent, subscriptions, utilities. Never miss a log.',
    icon:     'repeat' as const,
    position: 'bottom' as const,
    arrow:    'down' as const,
    tabIndex: 4,
  },
  {
    title:    'Settings ⚙️',
    desc:     'Change currency, theme, dark/light mode, and set daily reminders to stay on track.',
    icon:     'account-balance-wallet' as const,
    position: 'bottom' as const,
    arrow:    'down' as const,
    tabIndex: 5,
  },
  {
    title:    'You\'re all set! 🎉',
    desc:     'Start by adding your first expense. The more you track, the better your insights get!',
    icon:     'celebration' as const,
    position: 'center' as const,
    arrow:    null,
  },
];

type Props = {
  visible:  boolean;
  onFinish: () => void;
};

export default function Tutorial({ visible, onFinish }: Props) {
  const { theme, isDark } = useTheme();
  const [step, setStep]   = useState(0);

  const fadeAnim    = useRef(new Animated.Value(0)).current;
  const slideAnim   = useRef(new Animated.Value(40)).current;
  const scaleAnim   = useRef(new Animated.Value(0.85)).current;
  const arrowAnim   = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const cardShake   = useRef(new Animated.Value(0)).current;

  const current = STEPS[step];

  useEffect(() => {
    if (!visible) return;
    animateIn();
  }, [visible]);

  useEffect(() => {
    if (!visible) return;
    animateStepIn();
    animateProgress();
    if (current.arrow) startArrowBounce();
  }, [step, visible]);

  function animateIn() {
    fadeAnim.setValue(0);
    Animated.timing(fadeAnim, {
      toValue: 1, duration: 400, useNativeDriver: true,
    }).start();
  }

  function animateStepIn() {
    slideAnim.setValue(40);
    scaleAnim.setValue(0.88);
    Animated.parallel([
      Animated.spring(slideAnim, {
        toValue: 0, useNativeDriver: true, tension: 80, friction: 10,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1, useNativeDriver: true, tension: 80, friction: 10,
      }),
    ]).start();
  }

  function animateProgress() {
    Animated.timing(progressAnim, {
      toValue: (step + 1) / STEPS.length,
      duration: 400,
      useNativeDriver: false,
    }).start();
  }

  function startArrowBounce() {
    Animated.loop(
      Animated.sequence([
        Animated.timing(arrowAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.timing(arrowAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
      ])
    ).start();
  }

  function next() {
    // Shake out current card
    Animated.sequence([
      Animated.timing(cardShake, { toValue: -8, duration: 60, useNativeDriver: true }),
      Animated.timing(cardShake, { toValue: 8,  duration: 60, useNativeDriver: true }),
      Animated.timing(cardShake, { toValue: 0,  duration: 60, useNativeDriver: true }),
    ]).start(() => {
      if (step < STEPS.length - 1) {
        setStep(s => s + 1);
      } else {
        finish();
      }
    });
  }

  function prev() {
    if (step > 0) setStep(s => s - 1);
  }

  function finish() {
    Animated.timing(fadeAnim, {
      toValue: 0, duration: 300, useNativeDriver: true,
    }).start(() => onFinish());
  }

  const arrowTranslate = arrowAnim.interpolate({
    inputRange: [0, 1], outputRange: [0, 10],
  });

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1], outputRange: ['0%', '100%'],
  });

  if (!visible) return null;

  // Tab bar arrow position
  const TAB_COUNT  = 6;
  const tabW       = W / TAB_COUNT;
  const arrowLeft  = current.tabIndex !== undefined
    ? current.tabIndex * tabW + tabW / 2 - 12
    : W / 2 - 12;

  const isCenter      = current.position === 'center';
  const isBottomRight = current.position === 'bottom-right';

  return (
    <Modal transparent visible={visible} animationType="none" statusBarTranslucent>
      <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
        {/* Blurred backdrop */}
        <BlurView intensity={isDark ? 40 : 20} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.55)' }]} />

        {/* Skip button */}
        <TouchableOpacity style={styles.skipBtn} onPress={finish}>
          <Text style={[styles.skipText, { color: theme.textMuted }]}>Skip</Text>
        </TouchableOpacity>

        {/* Step dots */}
        <View style={styles.dotsRow}>
          {STEPS.map((_, i) => (
            <Animated.View
              key={i}
              style={[
                styles.dot,
                {
                  backgroundColor: i === step ? theme.accent : theme.textMuted + '55',
                  width:           i === step ? 20 : 6,
                },
              ]}
            />
          ))}
        </View>

        {/* Tab arrow indicator */}
        {current.arrow === 'down' && current.tabIndex !== undefined && (
          <Animated.View
            style={[
              styles.arrowWrap,
              {
                left:      arrowLeft,
                bottom:    105,
                transform: [{ translateY: arrowTranslate }],
              },
            ]}
          >
            <MaterialIcons name="arrow-downward" size={28} color={theme.accent} />
            <View style={[styles.arrowGlow, { backgroundColor: theme.accent + '40' }]} />
          </Animated.View>
        )}

        {/* FAB arrow */}
        {isBottomRight && (
          <Animated.View
            style={[
              styles.arrowWrap,
              {
                right:     30,
                bottom:    170,
                transform: [{ translateY: arrowTranslate }],
              },
            ]}
          >
            <MaterialIcons name="arrow-downward" size={28} color={theme.accent} />
            <View style={[styles.arrowGlow, { backgroundColor: theme.accent + '40' }]} />
          </Animated.View>
        )}

        {/* Card */}
        <Animated.View
          style={[
            styles.cardWrap,
            isCenter       && styles.cardCenter,
            !isCenter      && styles.cardBottom,
            isBottomRight  && styles.cardBottomRight,
            {
              transform: [
                { translateY: slideAnim },
                { scale:      scaleAnim },
                { translateX: cardShake },
              ],
            },
          ]}
        >
          <BlurView
            intensity={isDark ? 90 : 0}
            tint={isDark ? 'dark' : 'light'}
            style={[
              styles.card,
              {
                backgroundColor: isDark ? 'rgba(18,18,30,0.95)' : theme.card,
                borderColor:     theme.accent + '44',
              },
            ]}
          >
            {/* Progress bar */}
            <View style={[styles.progressBg, { backgroundColor: theme.border }]}>
              <Animated.View
                style={[styles.progressFill, { width: progressWidth, backgroundColor: theme.accent }]}
              />
            </View>

            {/* Icon */}
            <View style={[styles.iconCircle, { backgroundColor: theme.accent + '22' }]}>
              <MaterialIcons name={current.icon} size={32} color={theme.accent} />
            </View>

            {/* Text */}
            <Text style={[styles.title, { color: theme.text }]}>{current.title}</Text>
            <Text style={[styles.desc,  { color: theme.textMuted }]}>{current.desc}</Text>

            {/* Step counter */}
            <Text style={[styles.counter, { color: theme.textMuted }]}>
              {step + 1} of {STEPS.length}
            </Text>

            {/* Buttons */}
            <View style={styles.btnRow}>
              {step > 0 && (
                <TouchableOpacity
                  style={[styles.prevBtn, { borderColor: theme.border }]}
                  onPress={prev}
                >
                  <MaterialIcons name="arrow-back" size={18} color={theme.textMuted} />
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[styles.nextBtn, { backgroundColor: theme.accent, flex: step > 0 ? 1 : undefined }]}
                onPress={next}
              >
                <Text style={styles.nextBtnText}>
                  {step === STEPS.length - 1 ? 'Get Started!' : 'Next'}
                </Text>
                {step < STEPS.length - 1 && (
                  <MaterialIcons name="arrow-forward" size={18} color="#fff" />
                )}
                {step === STEPS.length - 1 && (
                  <MaterialIcons name="celebration" size={18} color="#fff" />
                )}
              </TouchableOpacity>
            </View>
          </BlurView>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay:        { flex: 1 },
  skipBtn:        { position: 'absolute', top: 56, right: 20, padding: 8, zIndex: 10 },
  skipText:       { fontSize: 14, fontWeight: '600' },
  dotsRow:        { position: 'absolute', top: 60, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 6, zIndex: 10 },
  dot:            { height: 6, borderRadius: 3 },
  arrowWrap:      { position: 'absolute', alignItems: 'center', zIndex: 10 },
  arrowGlow:      { width: 40, height: 40, borderRadius: 20, position: 'absolute', top: -6 },
  cardWrap:       { position: 'absolute', left: 20, right: 20, zIndex: 20 },
  cardCenter:     { top: '30%' },
  cardBottom:     { bottom: 110 },
  cardBottomRight:{ bottom: 200, right: 20, left: 20 },
  card:           { borderRadius: 28, borderWidth: 1, padding: 24, overflow: 'hidden' },
  progressBg:     { height: 3, borderRadius: 2, overflow: 'hidden', marginBottom: 20 },
  progressFill:   { height: '100%', borderRadius: 2 },
  iconCircle:     { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: 16, alignSelf: 'center' },
  title:          { fontSize: 20, fontWeight: '800', textAlign: 'center', marginBottom: 10 },
  desc:           { fontSize: 14, lineHeight: 22, textAlign: 'center', marginBottom: 12 },
  counter:        { fontSize: 11, textAlign: 'center', marginBottom: 20 },
  btnRow:         { flexDirection: 'row', gap: 10, alignItems: 'center' },
  prevBtn:        { width: 44, height: 44, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  nextBtn:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#7c6bff', borderRadius: 14, paddingVertical: 13, paddingHorizontal: 24 },
  nextBtnText:    { color: '#fff', fontSize: 16, fontWeight: '700' },
});