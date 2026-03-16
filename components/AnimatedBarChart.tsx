import { useCurrency } from '@/context/CurrencyContext';
import { useTheme } from '@/context/ThemeContext';
import React, { useEffect, useRef } from 'react';
import { Animated, Dimensions, StyleSheet, Text, View } from 'react-native';

const W = Dimensions.get('window').width;

type Bar = { label: string; total: number };

type Props = { data: Bar[] };

export default function AnimatedBarChart({ data }: Props) {
  const { theme }    = useTheme();
  const { currency } = useCurrency();

  const maxVal    = Math.max(...data.map(d => d.total), 1);
  const animVals  = useRef(data.map(() => new Animated.Value(0))).current;
  const fadeVals  = useRef(data.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    // Stagger each bar animating up
    const anims = data.map((d, i) =>
      Animated.sequence([
        Animated.delay(i * 80),
        Animated.parallel([
          Animated.spring(animVals[i], {
            toValue:         d.total / maxVal,
            useNativeDriver: false,
            tension:         60,
            friction:        10,
          }),
          Animated.timing(fadeVals[i], {
            toValue:         1,
            duration:        300,
            useNativeDriver: false,
          }),
        ]),
      ])
    );
    Animated.parallel(anims).start();
  }, [data]);

  const BAR_MAX_H = 140;
  const barW      = (W - 64 - (data.length - 1) * 8) / data.length;

  return (
    <View style={styles.container}>
      <View style={styles.barsRow}>
        {data.map((d, i) => {
          const isLast    = i === data.length - 1;
          const barHeight = animVals[i].interpolate({
            inputRange:  [0, 1],
            outputRange: [0, BAR_MAX_H],
          });

          return (
            <Animated.View
              key={i}
              style={[styles.barWrap, { opacity: fadeVals[i], width: barW }]}
            >
              {/* Value label above bar */}
              {d.total > 0 && (
                <Text style={[styles.barValue, { color: isLast ? theme.accent : theme.textMuted }]} numberOfLines={1}>
                  {currency.symbol}{d.total > 999 ? `${(d.total / 1000).toFixed(1)}k` : d.total.toLocaleString()}
                </Text>
              )}

              {/* Bar itself */}
              <View style={[styles.barTrack, { backgroundColor: theme.border, height: BAR_MAX_H }]}>
                <Animated.View
                  style={[
                    styles.barFill,
                    {
                      height:          barHeight,
                      backgroundColor: isLast ? theme.accent : theme.accent + '66',
                      borderRadius:    6,
                    },
                  ]}
                />
              </View>

              {/* Month label */}
              <Text style={[styles.barLabel, { color: isLast ? theme.accent : theme.textMuted }]}>
                {d.label}
              </Text>
            </Animated.View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingVertical: 8 },
  barsRow:   { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  barWrap:   { alignItems: 'center', gap: 6 },
  barTrack:  { width: '100%', justifyContent: 'flex-end', borderRadius: 6, overflow: 'hidden' },
  barFill:   { width: '100%' },
  barValue:  { fontSize: 9, fontWeight: '700', textAlign: 'center' },
  barLabel:  { fontSize: 11, fontWeight: '600' },
});