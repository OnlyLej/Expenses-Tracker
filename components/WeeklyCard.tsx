import { useCurrency } from '@/context/CurrencyContext';
import { useExpenses } from '@/context/ExpenseContext';
import { useTheme } from '@/context/ThemeContext';
import { MaterialIcons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

export default function WeeklyCard() {
  const { expenses } = useExpenses();
  const { theme }    = useTheme();
  const { fmt }      = useCurrency();

  const now       = new Date();
  const dayOfWeek = now.getDay();

  const thisWeekStart = new Date(now);
  thisWeekStart.setDate(now.getDate() - dayOfWeek);
  thisWeekStart.setHours(0, 0, 0, 0);

  const lastWeekStart = new Date(thisWeekStart);
  lastWeekStart.setDate(thisWeekStart.getDate() - 7);
  const lastWeekEnd = new Date(thisWeekStart);

  const thisWeekTotal = expenses
    .filter(e => new Date(e.date) >= thisWeekStart)
    .reduce((s, e) => s + e.amount, 0);

  const lastWeekTotal = expenses
    .filter(e => { const d = new Date(e.date); return d >= lastWeekStart && d < lastWeekEnd; })
    .reduce((s, e) => s + e.amount, 0);

  const diff   = thisWeekTotal - lastWeekTotal;
  const pctDiff = lastWeekTotal > 0 ? Math.abs((diff / lastWeekTotal) * 100) : 0;
  const better  = diff <= 0;

  const days = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  const dailyTotals = days.map((_, i) => {
    const dayStart = new Date(thisWeekStart);
    dayStart.setDate(thisWeekStart.getDate() + i);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayStart.getDate() + 1);
    return expenses
      .filter(e => { const d = new Date(e.date); return d >= dayStart && d < dayEnd; })
      .reduce((s, e) => s + e.amount, 0);
  });

  const maxDay = Math.max(...dailyTotals, 1);

  return (
    <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <View style={styles.header}>
        <Text style={[styles.title,  { color: theme.text }]}>This Week</Text>
        <View style={[styles.badge,  { backgroundColor: better ? '#22c55e22' : '#ef444422' }]}>
          <MaterialIcons name={better ? 'trending-down' : 'trending-up'} size={14} color={better ? '#22c55e' : '#ef4444'} />
          <Text style={[styles.badgeText, { color: better ? '#22c55e' : '#ef4444' }]}>
            {lastWeekTotal > 0 ? `${Math.round(pctDiff)}% vs last week` : 'First week!'}
          </Text>
        </View>
      </View>

      <Text style={[styles.amount, { color: theme.text }]}>{fmt(thisWeekTotal)}</Text>

      <View style={styles.barsRow}>
        {dailyTotals.map((total, i) => {
          const isToday = i === dayOfWeek;
          const barH    = total > 0 ? Math.max((total / maxDay) * 44, 4) : 4;
          return (
            <View key={i} style={styles.barCol}>
              <View style={[styles.barBg, { backgroundColor: theme.border }]}>
                <View style={[styles.barFill, { height: barH, backgroundColor: isToday ? theme.accent : theme.accent + '55' }]} />
              </View>
              <Text style={[styles.dayLabel, { color: isToday ? theme.accent : theme.textMuted }]}>
                {days[i]}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card:      { borderRadius: 20, borderWidth: 1, padding: 18, marginBottom: 14 },
  header:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  title:     { fontSize: 15, fontWeight: '700' },
  badge:     { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  badgeText: { fontSize: 11, fontWeight: '600' },
  amount:    { fontSize: 28, fontWeight: '800', letterSpacing: -1, marginBottom: 16 },
  barsRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  barCol:    { alignItems: 'center', gap: 6, flex: 1 },
  barBg:     { width: 20, height: 48, borderRadius: 6, overflow: 'hidden', justifyContent: 'flex-end' },
  barFill:   { width: '100%', borderRadius: 6 },
  dayLabel:  { fontSize: 11, fontWeight: '600' },
});