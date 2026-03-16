import { useTheme } from '@/context/ThemeContext';
import { MaterialIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import React, { useEffect, useRef, useState } from 'react';
import {
    Animated, LayoutChangeEvent,
    StyleSheet,
    TouchableOpacity,
    View,
} from 'react-native';

const TABS = [
  { name: 'index',     icon: 'home'                  as const },
  { name: 'charts',   icon: 'bar-chart'              as const },
  { name: 'goals',    icon: 'flag'                   as const },
  { name: 'reports',  icon: 'assessment'             as const },
  { name: 'recurring',icon: 'repeat'                 as const },
  { name: 'budget',   icon: 'account-balance-wallet' as const },
];

const PILL_H    = 44;
const ROW_HEIGHT = 72;

export default function TabBar({ state, navigation }: any) {
  const { theme, isDark } = useTheme();

  const [barWidth, setBarWidth] = useState(0);
  const [measured, setMeasured] = useState(false);

  const indicatorX    = useRef(new Animated.Value(0)).current;
  const scales        = useRef(TABS.map(() => new Animated.Value(1))).current;
  const activeOpacity = useRef(
    TABS.map((_, i) => new Animated.Value(i === 0 ? 1 : 0))
  ).current;
  const isFirst = useRef(true);

  const PILL_INSET = 6;
  const tabWidth   = barWidth > 0 ? barWidth / TABS.length : 0;
  const pillWidth  = tabWidth  > 0 ? tabWidth - PILL_INSET * 2 : 0;
  const pillTop    = (ROW_HEIGHT - PILL_H) / 2;

  function onBarLayout(e: LayoutChangeEvent) {
    const w = e.nativeEvent.layout.width;
    if (w === barWidth) return;
    setBarWidth(w);
    setMeasured(true);
  }

  useEffect(() => {
    if (!measured || tabWidth === 0) return;
    const targetX = state.index * tabWidth + PILL_INSET;

    if (isFirst.current) {
      indicatorX.setValue(targetX);
      activeOpacity.forEach((v, i) => v.setValue(i === state.index ? 1 : 0));
      scales.forEach((s, i) => s.setValue(i === state.index ? 1.15 : 1));
      isFirst.current = false;
      return;
    }

    Animated.spring(indicatorX, {
      toValue: targetX, useNativeDriver: true, tension: 80, friction: 10,
    }).start();

    scales.forEach((s, i) =>
      Animated.spring(s, {
        toValue: i === state.index ? 1.15 : 1,
        useNativeDriver: true, tension: 150, friction: 8,
      }).start()
    );

    activeOpacity.forEach((v, i) =>
      Animated.timing(v, {
        toValue: i === state.index ? 1 : 0,
        duration: 180, useNativeDriver: true,
      }).start()
    );
  }, [state.index, measured, tabWidth]);

  return (
    <View style={styles.outerWrapper} pointerEvents="box-none">
      <View style={[
        styles.glowRing,
        {
          shadowColor:   theme.accent,
          shadowOpacity: isDark ? 0.45 : 0.12,
          shadowRadius:  isDark ? 26   : 12,
          shadowOffset:  { width: 0, height: isDark ? 6 : 3 },
        },
      ]}>
        <BlurView
          intensity={isDark ? 100 : 0}
          tint={isDark ? 'dark' : 'light'}
          style={[
            styles.blur,
            {
              borderColor:     isDark ? 'rgba(255,255,255,0.08)' : theme.border,
              backgroundColor: isDark ? 'transparent'            : theme.card,
            },
          ]}
        >
          <View style={styles.innerRow} onLayout={onBarLayout}>
            {/* Sliding pill */}
            {measured && pillWidth > 0 && (
              <Animated.View
                style={[
                  styles.pill,
                  {
                    width:           pillWidth,
                    height:          PILL_H,
                    top:             pillTop,
                    backgroundColor: theme.accent + (isDark ? '22' : '18'),
                    borderColor:     theme.accent + (isDark ? '50' : '55'),
                  },
                  { transform: [{ translateX: indicatorX }] },
                ]}
              />
            )}

            {TABS.map((tab, i) => (
              <TouchableOpacity
                key={tab.name}
                onPress={() => navigation.navigate(tab.name)}
                activeOpacity={0.7}
                style={[styles.tab, { width: tabWidth }]}
              >
                <Animated.View
                  style={[styles.iconWrap, { transform: [{ scale: scales[i] }] }]}
                >
                  {/* Inactive */}
                  <Animated.View
                    style={[
                      StyleSheet.absoluteFill,
                      styles.iconLayer,
                      { opacity: Animated.subtract(1, activeOpacity[i]) },
                    ]}
                  >
                    <MaterialIcons name={tab.icon} size={22} color={theme.textMuted} />
                  </Animated.View>
                  {/* Active */}
                  <Animated.View
                    style={[styles.iconLayer, { opacity: activeOpacity[i] }]}
                  >
                    <MaterialIcons name={tab.icon} size={22} color={theme.accent} />
                  </Animated.View>
                </Animated.View>
              </TouchableOpacity>
            ))}
          </View>

          {isDark && <View style={styles.glassSheen} pointerEvents="none" />}
        </BlurView>

        <View
          style={[styles.outerRim, { borderColor: isDark ? theme.accent + '18' : theme.border }]}
          pointerEvents="none"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outerWrapper: {
    position:        'absolute',
    bottom:          24,
    left:            16,
    right:           16,
    backgroundColor: 'transparent',
  },
  glowRing: {
    borderRadius: 34,
    elevation:    20,
  },
  blur: {
    borderRadius: 34,
    overflow:     'hidden',
    borderWidth:  1,
  },
  innerRow: {
    flexDirection: 'row',
    alignItems:    'center',
    height:        ROW_HEIGHT,
    position:      'relative',
  },
  pill: {
    position:     'absolute',
    left:         0,
    borderRadius: 20,
    borderWidth:  1,
  },
  tab: {
    alignItems:     'center',
    justifyContent: 'center',
    height:         ROW_HEIGHT,
    zIndex:         2,
  },
  iconWrap: {
    width:          28,
    height:         28,
    alignItems:     'center',
    justifyContent: 'center',
  },
  iconLayer: {
    width:          28,
    height:         28,
    alignItems:     'center',
    justifyContent: 'center',
    position:       'absolute',
  },
  glassSheen: {
    position:             'absolute',
    top:                  0,
    left:                 0,
    right:                0,
    height:               ROW_HEIGHT / 2,
    backgroundColor:      'rgba(255,255,255,0.025)',
    borderTopLeftRadius:  34,
    borderTopRightRadius: 34,
  },
  outerRim: {
    position:     'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    borderRadius: 34,
    borderWidth:  1,
    pointerEvents: 'none',
  } as any,
});