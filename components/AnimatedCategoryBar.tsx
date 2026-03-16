import { useCurrency } from '@/context/CurrencyContext';
import { Category } from '@/context/ExpenseContext';
import { useTheme } from '@/context/ThemeContext';
import { MaterialIcons } from '@expo/vector-icons';
import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';

type Props = {
  cat:        Category & { total: number };
  pct:        number;
  index:      number;
};

export default function AnimatedCategoryBar({ cat, pct, index }: Props) {
  const { theme } = useTheme();
  const { fmt }   = useCurrency();

  const widthAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.delay(index * 100),
      Animated.parallel([
        Animated.spring(widthAnim, {
          toValue:         pct,
          useNativeDriver: false,
          tension:         55,
          friction:        10,
        }),
        Animated.timing(fadeAnim, {
          toValue:         1,
          duration:        400,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue:         0,
          useNativeDriver: true,
          tension:         80,
          friction:        10,
        }),
      ]),
    ]).start();
  }, [pct]);

  const barWidth = widthAnim.interpolate({
    inputRange:  [0, 100],
    outputRange: ['0%', '100%'],
  });

  return (
    <Animated.View
      style={[
        styles.row,
        { backgroundColor: theme.card, borderColor: theme.border },
        { opacity: fadeAnim, transform: [{ translateX: slideAnim }] },
      ]}
    >
      <View style={[styles.icon, { backgroundColor: cat.color + '22' }]}>
        <MaterialIcons name={cat.icon as any} size={16} color={cat.color} />
      </View>
      <View style={{ flex: 1 }}>
        <View style={styles.labelRow}>
          <Text style={[styles.label,  { color: theme.text }]}>{cat.label}</Text>
          <Text style={[styles.pct,    { color: theme.textMuted }]}>{Math.round(pct)}%</Text>
        </View>
        <View style={[styles.track, { backgroundColor: theme.border }]}>
          <Animated.View style={[styles.fill, { width: barWidth, backgroundColor: cat.color }]} />
        </View>
      </View>
      <Text style={[styles.amount, { color: cat.color }]}>{fmt(cat.total)}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row:      { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 16, borderWidth: 1, padding: 14, marginBottom: 8 },
  icon:     { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  label:    { fontSize: 14, fontWeight: '600' },
  pct:      { fontSize: 12 },
  track:    { height: 6, borderRadius: 3, overflow: 'hidden' },
  fill:     { height: '100%', borderRadius: 3 },
  amount:   { fontSize: 13, fontWeight: '700', minWidth: 70, textAlign: 'right' },
});