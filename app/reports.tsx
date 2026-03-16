import ScreenWrapper from '@/components/ScreenWrapper';
import { useCurrency } from '@/context/CurrencyContext';
import { CATEGORIES, useExpenses } from '@/context/ExpenseContext';
import { useTheme } from '@/context/ThemeContext';
import { MaterialIcons } from '@expo/vector-icons';
import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';

export default function ReportsScreen() {
  const { expenses, getMonthlyTotal, budget } = useExpenses();
  const { theme }  = useTheme();
  const { fmt }    = useCurrency();
  const localFade  = useRef(new Animated.Value(0)).current;
  const slideAnim  = useRef(new Animated.Value(24)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(localFade, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 380, useNativeDriver: true }),
    ]).start();
  }, []);

  const now           = new Date();
  const monthlyTotal  = getMonthlyTotal();
  const daysInMonth   = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const monthlyExpenses = expenses.filter(e => {
    const d = new Date(e.date);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });

    const activeDays = monthlyExpenses.length > 0
    ? Math.max(
        Math.ceil(
            (new Date(monthlyExpenses[0].date).getTime() -
            new Date(monthlyExpenses[monthlyExpenses.length - 1].date).getTime())
            / (1000 * 60 * 60 * 24)
        ) + 1,
        1
        )
    : 1;

    const avgPerDay = monthlyTotal / activeDays;
  const projectedEnd  = avgPerDay * daysInMonth;
  const overBudget    = monthlyTotal > budget;

  const catTotals = CATEGORIES.map(c => ({
    ...c,
    total: expenses
      .filter(e => {
        const d = new Date(e.date);
        return e.category === c.id && d.getMonth() === now.getMonth();
      })
      .reduce((s, e) => s + e.amount, 0),
  })).sort((a, b) => b.total - a.total);

  const topCat = catTotals[0];

  const weekStart = new Date();
  weekStart.setDate(now.getDate() - now.getDay());
  const weekTotal = expenses
    .filter(e => new Date(e.date) >= weekStart)
    .reduce((s, e) => s + e.amount, 0);

  const stats = [
    { label: 'Daily Average',   value: fmt(Math.round(avgPerDay)),     icon: 'today'                  as const, color: theme.accent },
    { label: 'Projected Month', value: fmt(Math.round(projectedEnd)),  icon: 'trending-up'            as const, color: overBudget ? '#ef4444' : '#26a69a' },
    { label: 'This Week',       value: fmt(Math.round(weekTotal)),     icon: 'date-range'             as const, color: '#ff7043' },
    { label: 'Top Category',    value: topCat.label,                    icon: topCat.icon              as any,   color: topCat.color },
    { label: 'Monthly Total',   value: fmt(monthlyTotal),              icon: 'receipt-long'           as const, color: theme.accent },
    { label: 'Budget Status',   value: overBudget ? 'Over Budget' : 'On Track', icon: 'account-balance-wallet' as const, color: overBudget ? '#ef4444' : '#22c55e' },
  ];

  const insights = [
    projectedEnd > budget && {
      icon: 'warning'      as const, color: '#ef4444',
      text: `At this rate you'll exceed your ${fmt(budget)} budget by ${fmt(Math.round(projectedEnd - budget))}.`,
    },
    projectedEnd <= budget && {
      icon: 'check-circle' as const, color: '#22c55e',
      text: `Great job! You're on track to stay within your ${fmt(budget)} budget.`,
    },
    {
      icon: 'pie-chart'    as const, color: theme.accent,
      text: `Your biggest expense this month is ${topCat.label} at ${fmt(topCat.total)}.`,
    },
    {
      icon: 'schedule'     as const, color: '#ff7043',
      text: `You're spending an average of ${fmt(Math.round(avgPerDay))} per day.`,
    },
  ].filter(Boolean) as { icon: any; color: string; text: string }[];

  return (
    <ScreenWrapper routeName="reports">
      <Animated.ScrollView
        style={{ opacity: localFade, transform: [{ translateY: slideAnim }] }}
        contentContainerStyle={{ padding: 16, paddingBottom: 130 }}
      >
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Monthly Summary</Text>
        <Text style={[styles.sectionSub,   { color: theme.textMuted }]}>
          {now.toLocaleString('default', { month: 'long', year: 'numeric' })}
        </Text>

        <View style={styles.statsGrid}>
          {stats.map((s, i) => (
            <View key={i} style={[styles.statCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <View style={[styles.statIcon, { backgroundColor: s.color + '20' }]}>
                <MaterialIcons name={s.icon} size={20} color={s.color} />
              </View>
              <Text style={[styles.statValue, { color: theme.text }]} numberOfLines={1}>{s.value}</Text>
              <Text style={[styles.statLabel, { color: theme.textMuted }]}>{s.label}</Text>
            </View>
          ))}
        </View>

        <Text style={[styles.sectionTitle, { color: theme.text }]}>Insights</Text>
        {insights.map((ins, i) => (
          <View key={i} style={[styles.insightCard, { backgroundColor: theme.card, borderColor: theme.border, borderLeftColor: ins.color }]}>
            <MaterialIcons name={ins.icon} size={20} color={ins.color} />
            <Text style={[styles.insightText, { color: theme.text }]}>{ins.text}</Text>
          </View>
        ))}
      </Animated.ScrollView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  sectionTitle: { fontSize: 18, fontWeight: '700', marginTop: 8, marginBottom: 4 },
  sectionSub:   { fontSize: 13, marginBottom: 16 },
  statsGrid:    { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 },
  statCard:     { width: '47%', borderRadius: 18, borderWidth: 1, padding: 16, gap: 8 },
  statIcon:     { width: 38, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  statValue:    { fontSize: 17, fontWeight: '700' },
  statLabel:    { fontSize: 12 },
  insightCard:  { flexDirection: 'row', gap: 12, alignItems: 'flex-start', borderRadius: 14, borderWidth: 1, borderLeftWidth: 3, padding: 14, marginBottom: 10 },
  insightText:  { flex: 1, fontSize: 14, lineHeight: 20 },
});