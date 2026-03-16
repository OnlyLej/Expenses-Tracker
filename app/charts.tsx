import AnimatedBarChart from '@/components/AnimatedBarChart';
import AnimatedCategoryBar from '@/components/AnimatedCategoryBar';
import ScreenWrapper from '@/components/ScreenWrapper';
import { useCurrency } from '@/context/CurrencyContext';
import { CATEGORIES, useExpenses } from '@/context/ExpenseContext';
import { useTheme } from '@/context/ThemeContext';
import { MaterialIcons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

const { width: W } = Dimensions.get('window');

// ─── Donut Chart ───────────────────────────────────────────────
function DonutChart({ data, total }: { data: { color: string; pct: number; label: string }[]; total: number }) {
  const { theme } = useTheme();
  const { fmt }   = useCurrency();
  const anim      = useRef(new Animated.Value(0)).current;
  const SIZE      = 160;
  const STROKE    = 18;

  useEffect(() => {
    anim.setValue(0);
    Animated.timing(anim, { toValue: 1, duration: 1000, useNativeDriver: false }).start();
  }, [data]);

  return (
    <View style={{ alignItems: 'center', marginBottom: 8 }}>
      <View style={{ width: SIZE, height: SIZE, alignItems: 'center', justifyContent: 'center' }}>
        {data.map((d, i) => {
          const prev = data.slice(0, i).reduce((s, x) => s + x.pct, 0);
          return (
            <Animated.View
              key={i}
              style={{
                position:      'absolute',
                width:          SIZE,
                height:         SIZE,
                borderRadius:   SIZE / 2,
                borderWidth:    STROKE,
                borderColor:    'transparent',
                borderTopColor: d.color,
                transform: [{
                  rotate: `${prev * 3.6 - 90}deg`,
                }],
                opacity: anim.interpolate({
                  inputRange:  [0, Math.max(0.01, 0.3 + i * 0.1), 1],
                  outputRange: [0, 0, 1],
                }),
              }}
            />
          );
        })}
        <View style={styles.donutCenter}>
          <Text style={[styles.donutTotal, { color: theme.text }]}>{fmt(total)}</Text>
          <Text style={[styles.donutLabel, { color: theme.textMuted }]}>this month</Text>
        </View>
      </View>
      <View style={styles.legendRow}>
        {data.filter(d => d.pct > 0).slice(0, 4).map((d, i) => (
          <View key={i} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: d.color }]} />
            <Text style={[styles.legendText, { color: theme.textMuted }]} numberOfLines={1}>
              {d.label.split(' ')[0]} {Math.round(d.pct)}%
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// ─── Heatmap ───────────────────────────────────────────────────
function SpendingHeatmap({ expenses }: { expenses: any[] }) {
  const { theme }   = useTheme();
  const { fmt }     = useCurrency();
  const now         = new Date();
  const year        = now.getFullYear();
  const month       = now.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay    = new Date(year, month, 1).getDay();
  const today       = now.getDate();
  const [selected, setSelected] = useState<number | null>(null);

  const dailyMap: Record<number, number> = {};
  expenses.forEach(e => {
    const d = new Date(e.date);
    if (d.getMonth() === month && d.getFullYear() === year) {
      const day = d.getDate();
      dailyMap[day] = (dailyMap[day] || 0) + e.amount;
    }
  });

  const maxDay    = Math.max(...Object.values(dailyMap), 1);
  const fadeAnims = useRef(
    Array.from({ length: daysInMonth }, () => new Animated.Value(0))
  ).current;

  useEffect(() => {
    const anims = fadeAnims.map((a, i) =>
      Animated.sequence([
        Animated.delay(i * 15),
        Animated.spring(a, { toValue: 1, useNativeDriver: true, tension: 100, friction: 8 }),
      ])
    );
    Animated.parallel(anims).start();
  }, []);

  return (
    <View>
      <View style={styles.heatDayLabels}>
        {['S','M','T','W','T','F','S'].map((d, i) => (
          <Text key={i} style={[styles.heatDayLabel, { color: theme.textMuted }]}>{d}</Text>
        ))}
      </View>
      <View style={styles.heatGrid}>
        {Array.from({ length: firstDay }).map((_, i) => (
          <View key={`e-${i}`} style={styles.heatCell} />
        ))}
        {Array.from({ length: daysInMonth }, (_, i) => {
          const day       = i + 1;
          const amount    = dailyMap[day] || 0;
          const intensity = amount > 0 ? Math.max(0.2, amount / maxDay) : 0;
          const isToday   = day === today;
          const isSel     = selected === day;
          return (
            <Animated.View key={day} style={{ opacity: fadeAnims[i], transform: [{ scale: fadeAnims[i] }] }}>
              <TouchableOpacity
                style={[
                  styles.heatCell,
                  {
                    backgroundColor: amount > 0
                      ? theme.accent + Math.round(intensity * 255).toString(16).padStart(2, '0')
                      : theme.border + '44',
                    borderWidth: isToday ? 1.5 : 0,
                    borderColor: theme.accent,
                    transform:   [{ scale: isSel ? 1.15 : 1 }],
                  },
                ]}
                onPress={() => setSelected(isSel ? null : day)}
              >
                <Text style={[styles.heatDayNum, { color: amount > 0 ? '#fff' : theme.textMuted }]}>
                  {day}
                </Text>
              </TouchableOpacity>
            </Animated.View>
          );
        })}
      </View>
      {selected !== null && (
        <View style={[styles.heatTooltip, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.heatTooltipTitle, { color: theme.text }]}>
            {now.toLocaleString('default', { month: 'long' })} {selected}
          </Text>
          <Text style={[styles.heatTooltipAmt, { color: dailyMap[selected] ? theme.accent : theme.textMuted }]}>
            {dailyMap[selected] ? fmt(dailyMap[selected]) : 'No spending'}
          </Text>
        </View>
      )}
    </View>
  );
}

// ─── Day of Week ───────────────────────────────────────────────
function DayOfWeekChart({ expenses }: { expenses: any[] }) {
  const { theme } = useTheme();
  const { fmt }   = useCurrency();
  const days      = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const today     = new Date().getDay();

  const totals = days.map((_, i) =>
    expenses.filter(e => new Date(e.date).getDay() === i).reduce((s, e) => s + e.amount, 0)
  );
  const maxVal     = Math.max(...totals, 1);
  const widthAnims = useRef(totals.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    widthAnims.forEach((a, i) => {
      Animated.sequence([
        Animated.delay(i * 80),
        Animated.spring(a, {
          toValue: totals[i] / maxVal, useNativeDriver: false, tension: 60, friction: 10,
        }),
      ]).start();
    });
  }, []);

  return (
    <View style={styles.dowContainer}>
      {days.map((day, i) => {
        const isToday = i === today;
        const barW    = widthAnims[i].interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });
        return (
          <View key={day} style={styles.dowRow}>
            <Text style={[styles.dowLabel, { color: isToday ? theme.accent : theme.textMuted, fontWeight: isToday ? '700' : '400' }]}>
              {day}
            </Text>
            <View style={[styles.dowTrack, { backgroundColor: theme.border }]}>
              <Animated.View style={[styles.dowFill, { width: barW, backgroundColor: isToday ? theme.accent : theme.accent + '66' }]} />
            </View>
            <Text style={[styles.dowAmt, { color: isToday ? theme.accent : theme.textMuted }]}>
              {totals[i] > 0 ? fmt(Math.round(totals[i])) : '—'}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

// ─── Biggest Expenses ─────────────────────────────────────────
function BiggestExpenses({ expenses }: { expenses: any[] }) {
  const { theme } = useTheme();
  const { fmt }   = useCurrency();

  const top5 = [...expenses].sort((a, b) => b.amount - a.amount).slice(0, 5);

  // Always create exactly 5 anims so indices never go out of bounds
  const slideAnims = useRef(Array.from({ length: 5 }, () => new Animated.Value(30))).current;
  const fadeAnims  = useRef(Array.from({ length: 5 }, () => new Animated.Value(0))).current;

  useEffect(() => {
    // Reset all first
    slideAnims.forEach(a => a.setValue(30));
    fadeAnims.forEach(a => a.setValue(0));

    top5.forEach((_, i) => {
      Animated.sequence([
        Animated.delay(i * 80),
        Animated.parallel([
          Animated.spring(slideAnims[i], { toValue: 0, useNativeDriver: true, tension: 80, friction: 10 }),
          Animated.timing(fadeAnims[i],  { toValue: 1, duration: 300, useNativeDriver: true }),
        ]),
      ]).start();
    });
  }, [expenses]);

  if (!top5.length) return (
    <View style={styles.emptySmall}>
      <Text style={[styles.emptySmallText, { color: theme.textMuted }]}>No expenses yet</Text>
    </View>
  );

  return (
    <View>
      {top5.map((e, i) => {
        const cat = CATEGORIES.find(c => c.id === e.category) || CATEGORIES[6];
        return (
          <Animated.View
            key={e.id}
            style={[
              styles.bigRow,
              { backgroundColor: theme.card, borderColor: theme.border },
              { opacity: fadeAnims[i], transform: [{ translateX: slideAnims[i] }] },
            ]}
          >
            <Text style={[styles.bigRank, { color: theme.accent }]}>#{i + 1}</Text>
            <View style={[styles.bigIcon, { backgroundColor: cat.color + '22' }]}>
              <MaterialIcons name={cat.icon as any} size={16} color={cat.color} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.bigNote, { color: theme.text }]} numberOfLines={1}>
                {e.note || cat.label}
              </Text>
              <Text style={[styles.bigDate, { color: theme.textMuted }]}>
                {new Date(e.date).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
              </Text>
            </View>
            <Text style={[styles.bigAmt, { color: theme.accent }]}>{fmt(e.amount)}</Text>
          </Animated.View>
        );
      })}
    </View>
  );
}

// ─── Streaks ───────────────────────────────────────────────────
function SpendingStreaks({ expenses }: { expenses: any[] }) {
  const { theme }  = useTheme();
  const { fmt }    = useCurrency();
  const scaleAnim  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, tension: 60, friction: 8 }).start();
  }, []);

  const today = new Date();
  let streak  = 0;
  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const has = expenses.some(e => new Date(e.date).toDateString() === d.toDateString());
    if (has) streak++;
    else if (i > 0) break;
  }

  let bestStreak = 0, cur = 0;
  let lastDate: Date | null = null;
  [...expenses]
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .forEach(e => {
      const d = new Date(e.date); d.setHours(0,0,0,0);
      if (!lastDate) { cur = 1; }
      else {
        const diff = (d.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24);
        cur = diff === 1 ? cur + 1 : 1;
      }
      bestStreak = Math.max(bestStreak, cur);
      lastDate   = d;
    });

  const daysLogged = new Set(
    expenses
      .filter(e => {
        const d = new Date(e.date);
        return d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
      })
      .map(e => new Date(e.date).toDateString())
  ).size;

  const monthTotal = expenses
    .filter(e => {
      const d = new Date(e.date);
      return d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
    })
    .reduce((s, e) => s + e.amount, 0);

  const stats = [
    { icon: 'local-fire-department' as const, label: 'Current Streak', value: `${streak} day${streak !== 1 ? 's' : ''}`,         color: '#ff7043' },
    { icon: 'emoji-events'          as const, label: 'Best Streak',    value: `${bestStreak} day${bestStreak !== 1 ? 's' : ''}`,  color: '#ffca28' },
    { icon: 'today'                 as const, label: 'Days Logged',    value: `${daysLogged} days`,                               color: theme.accent },
    { icon: 'show-chart'            as const, label: 'Avg / Log Day',  value: daysLogged > 0 ? fmt(Math.round(monthTotal / daysLogged)) : '—', color: '#26a69a' },
  ];

  return (
    <Animated.View style={[styles.streakGrid, { transform: [{ scale: scaleAnim }] }]}>
      {stats.map((s, i) => (
        <View key={i} style={[styles.streakCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={[styles.streakIcon, { backgroundColor: s.color + '22' }]}>
            <MaterialIcons name={s.icon} size={20} color={s.color} />
          </View>
          <Text style={[styles.streakValue, { color: theme.text }]}>{s.value}</Text>
          <Text style={[styles.streakLabel, { color: theme.textMuted }]}>{s.label}</Text>
        </View>
      ))}
    </Animated.View>
  );
}

// ─── Month Comparison ──────────────────────────────────────────
function MonthComparison({ data }: { data: { label: string; total: number }[] }) {
  const { theme } = useTheme();
  const { fmt }   = useCurrency();
  const last2     = data.slice(-2);
  const thisMonth = last2[1]?.total || 0;
  const lastMonth = last2[0]?.total || 0;
  const diff      = thisMonth - lastMonth;
  const pct       = lastMonth > 0 ? Math.round(Math.abs(diff / lastMonth) * 100) : 0;
  const better    = diff <= 0;
  const maxVal    = Math.max(thisMonth, lastMonth, 1);
  const barAnim   = useRef(new Animated.Value(0)).current;
  const barAnim2  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(barAnim,  { toValue: lastMonth / maxVal,  useNativeDriver: false, tension: 55, friction: 10 }),
      Animated.spring(barAnim2, { toValue: thisMonth / maxVal, useNativeDriver: false, tension: 55, friction: 10, delay: 150 }),
    ]).start();
  }, []);

  const lastW = barAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });
  const thisW = barAnim2.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });

  return (
    <View style={styles.compContainer}>
      <View style={styles.compRow}>
        <Text style={[styles.compLabel, { color: theme.textMuted }]}>{last2[0]?.label || 'Last'}</Text>
        <View style={[styles.compTrack, { backgroundColor: theme.border }]}>
          <Animated.View style={[styles.compFill, { width: lastW, backgroundColor: theme.accent + '55' }]} />
        </View>
        <Text style={[styles.compAmt, { color: theme.textMuted }]}>{fmt(lastMonth)}</Text>
      </View>
      <View style={styles.compRow}>
        <Text style={[styles.compLabel, { color: theme.accent, fontWeight: '700' }]}>{last2[1]?.label || 'This'}</Text>
        <View style={[styles.compTrack, { backgroundColor: theme.border }]}>
          <Animated.View style={[styles.compFill, { width: thisW, backgroundColor: theme.accent }]} />
        </View>
        <Text style={[styles.compAmt, { color: theme.accent, fontWeight: '700' }]}>{fmt(thisMonth)}</Text>
      </View>
      {lastMonth > 0 && (
        <View style={[styles.compDelta, { backgroundColor: better ? '#22c55e18' : '#ef444418', borderColor: better ? '#22c55e44' : '#ef444444' }]}>
          <MaterialIcons name={better ? 'trending-down' : 'trending-up'} size={18} color={better ? '#22c55e' : '#ef4444'} />
          <Text style={[styles.compDeltaText, { color: better ? '#22c55e' : '#ef4444' }]}>
            {better ? `${pct}% less` : `${pct}% more`} than last month
            {diff !== 0 && ` (${better ? '-' : '+'}${fmt(Math.abs(diff))})`}
          </Text>
        </View>
      )}
    </View>
  );
}

// ─── Month Row — extracted to fix hooks-in-loop error ─────────
function MonthRow({ m, prev, index }: { m: { label: string; total: number }; prev?: { label: string; total: number }; index: number }) {
  const { theme } = useTheme();
  const { fmt }   = useCurrency();
  const fadeA     = useRef(new Animated.Value(0)).current;

  const change  = prev && prev.total > 0 ? Math.round(((m.total - prev.total) / prev.total) * 100) : null;
  const better  = change !== null && change <= 0;

  useEffect(() => {
    Animated.timing(fadeA, {
      toValue: 1, duration: 300, delay: index * 80, useNativeDriver: true,
    }).start();
  }, []);

  return (
    <Animated.View style={[styles.monthRow, { borderBottomColor: theme.border, opacity: fadeA }]}>
      <Text style={[styles.monthLabel, { color: index === 5 ? theme.accent : theme.text }]}>
        {m.label}
      </Text>
      <Text style={[styles.monthAmt, { color: index === 5 ? theme.accent : theme.text }]}>
        {fmt(m.total)}
      </Text>
      {change !== null && (
        <View style={[styles.changeChip, { backgroundColor: (better ? '#22c55e' : '#ef4444') + '18' }]}>
          <MaterialIcons name={better ? 'arrow-downward' : 'arrow-upward'} size={11} color={better ? '#22c55e' : '#ef4444'} />
          <Text style={[styles.changeText, { color: better ? '#22c55e' : '#ef4444' }]}>
            {Math.abs(change)}%
          </Text>
        </View>
      )}
    </Animated.View>
  );
}

// ─── Prediction ───────────────────────────────────────────────
function PredictionCard({ expenses, budget }: { expenses: any[]; budget: number }) {
  const { theme } = useTheme();
  const { fmt }   = useCurrency();
  const anim      = useRef(new Animated.Value(0)).current;

  const now         = new Date();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const daysPassed  = now.getDate();
  const daysLeft    = daysInMonth - daysPassed;

  const monthTotal = expenses
    .filter(e => { const d = new Date(e.date); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); })
    .reduce((s, e) => s + e.amount, 0);

  const avgPerDay  = daysPassed > 0 ? monthTotal / daysPassed : 0;
  const predicted  = Math.round(avgPerDay * daysInMonth);
  const pct        = budget > 0 ? Math.min((predicted / budget) * 100, 150) : 0;
  const overBudget = predicted > budget;

  useEffect(() => {
    Animated.spring(anim, { toValue: 1, useNativeDriver: false, tension: 50, friction: 10 }).start();
  }, []);

  const fillWidth = anim.interpolate({
    inputRange:  [0, 1],
    outputRange: ['0%', `${Math.min(pct, 100)}%`],
  });

  return (
    <View style={[styles.predCard, { backgroundColor: theme.card, borderColor: overBudget ? '#ef444440' : theme.border }]}>
      <View style={styles.predHeader}>
        <View style={[styles.predIcon, { backgroundColor: (overBudget ? '#ef4444' : '#22c55e') + '22' }]}>
          <MaterialIcons name="auto-graph" size={22} color={overBudget ? '#ef4444' : '#22c55e'} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.predTitle, { color: theme.text }]}>End-of-Month Prediction</Text>
          <Text style={[styles.predSub,   { color: theme.textMuted }]}>
            Based on {daysPassed}-day avg of {fmt(Math.round(avgPerDay))}/day
          </Text>
        </View>
      </View>
      <Text style={[styles.predAmount, { color: overBudget ? '#ef4444' : theme.accent }]}>
        {fmt(predicted)}
      </Text>
      <Text style={[styles.predLabel, { color: theme.textMuted }]}>
        predicted · {daysLeft} days left
      </Text>
      <View style={[styles.predTrack, { backgroundColor: theme.border }]}>
        <Animated.View style={[styles.predFill, { width: fillWidth, backgroundColor: overBudget ? '#ef4444' : '#22c55e' }]} />
        <View style={[styles.budgetMarker, { backgroundColor: theme.accent }]} />
      </View>
      <View style={styles.predLegend}>
        <Text style={[styles.predLegendText, { color: theme.textMuted }]}>{fmt(0)}</Text>
        <View style={styles.predLegendBudget}>
          <View style={[styles.predLegendDot, { backgroundColor: theme.accent }]} />
          <Text style={[styles.predLegendText, { color: theme.accent }]}>Budget {fmt(budget)}</Text>
        </View>
      </View>
      <View style={[styles.predVerdict, { backgroundColor: (overBudget ? '#ef4444' : '#22c55e') + '15', borderColor: (overBudget ? '#ef4444' : '#22c55e') + '40' }]}>
        <MaterialIcons name={overBudget ? 'warning' : 'check-circle'} size={16} color={overBudget ? '#ef4444' : '#22c55e'} />
        <Text style={[styles.predVerdictText, { color: overBudget ? '#ef4444' : '#22c55e' }]}>
          {overBudget
            ? `May exceed budget by ${fmt(predicted - budget)}`
            : `On track to save ${fmt(budget - predicted)} this month`}
        </Text>
      </View>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────
const TABS = ['Overview', 'Calendar', 'Habits', 'Compare'];

export default function ChartsScreen() {
  const { expenses, getLast6MonthsTotals, getCategoryTotals, budget } = useExpenses();
  const { theme }       = useTheme();
  const [activeTab, setActiveTab] = useState(0);

  const localFade = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;
  const tabAnim   = useRef(new Animated.Value(1)).current;

  const monthly    = getLast6MonthsTotals();
  const catTotals  = getCategoryTotals().filter(c => c.total > 0);
  const grandTotal = catTotals.reduce((s, c) => s + c.total, 0);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(localFade, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 380, useNativeDriver: true }),
    ]).start();
  }, []);

  function switchTab(i: number) {
    Animated.sequence([
      Animated.timing(tabAnim, { toValue: 0.4, duration: 100, useNativeDriver: true }),
      Animated.spring(tabAnim, { toValue: 1,   useNativeDriver: true, tension: 80, friction: 10 }),
    ]).start();
    setActiveTab(i);
  }

  const donutData = catTotals.map(c => ({
    color: c.color,
    pct:   grandTotal > 0 ? (c.total / grandTotal) * 100 : 0,
    label: c.label,
  }));

  return (
    <ScreenWrapper routeName="charts">
      <Animated.View style={{ flex: 1, opacity: localFade, transform: [{ translateY: slideAnim }] }}>

        {/* Sub-tab bar */}
        <View style={[styles.subTabBar, { backgroundColor: theme.card, borderColor: theme.border }]}>
          {TABS.map((t, i) => {
            const active = activeTab === i;
            return (
              <TouchableOpacity
                key={t}
                onPress={() => switchTab(i)}
                style={[styles.subTab, { backgroundColor: active ? theme.accent + '22' : 'transparent' }]}
              >
                <Text style={[styles.subTabText, { color: active ? theme.accent : theme.textMuted, fontWeight: active ? '700' : '400' }]}>
                  {t}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Animated.ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 130 }}
          showsVerticalScrollIndicator={false}
          style={{ opacity: tabAnim }}
        >
          {/* ── TAB 0: Overview ── */}
          {activeTab === 0 && (
            <View>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>6-Month Spending</Text>
              <View style={[styles.chartCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <AnimatedBarChart data={monthly} />
              </View>

              <Text style={[styles.sectionTitle, { color: theme.text }]}>Category Breakdown</Text>
              {catTotals.length === 0 ? (
                <View style={styles.emptyState}>
                  <MaterialIcons name="bar-chart" size={44} color={theme.border} />
                  <Text style={[styles.emptyText, { color: theme.textMuted }]}>No data this month yet</Text>
                </View>
              ) : (
                <View>
                  <View style={[styles.chartCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                    <DonutChart data={donutData} total={grandTotal} />
                  </View>
                  {catTotals.map((cat, i) => {
                    const pct = grandTotal > 0 ? (cat.total / grandTotal) * 100 : 0;
                    return <AnimatedCategoryBar key={cat.id} cat={cat} pct={pct} index={i} />;
                  })}
                </View>
              )}

              <Text style={[styles.sectionTitle, { color: theme.text }]}>Biggest Expenses</Text>
              <BiggestExpenses expenses={expenses} />

              <Text style={[styles.sectionTitle, { color: theme.text }]}>End-of-Month Forecast</Text>
              <PredictionCard expenses={expenses} budget={budget} />
            </View>
          )}

          {/* ── TAB 1: Calendar ── */}
          {activeTab === 1 && (
            <View>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Spending Heatmap</Text>
              <Text style={[styles.sectionSub,   { color: theme.textMuted }]}>
                Darker = more spending · Tap a day for details
              </Text>
              <View style={[styles.chartCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <SpendingHeatmap expenses={expenses} />
              </View>
            </View>
          )}

          {/* ── TAB 2: Habits ── */}
          {activeTab === 2 && (
            <View>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Spending Streaks</Text>
              <SpendingStreaks expenses={expenses} />

              <Text style={[styles.sectionTitle, { color: theme.text }]}>Day of Week Patterns</Text>
              <Text style={[styles.sectionSub,   { color: theme.textMuted }]}>
                Which days do you spend the most?
              </Text>
              <View style={[styles.chartCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <DayOfWeekChart expenses={expenses} />
              </View>
            </View>
          )}

          {/* ── TAB 3: Compare ── */}
          {activeTab === 3 && (
            <View>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Month vs Month</Text>
              <View style={[styles.chartCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <MonthComparison data={monthly} />
              </View>

              {/* ✅ Fixed: extracted MonthRow component — no hooks in .map() */}
              <Text style={[styles.sectionTitle, { color: theme.text }]}>All 6 Months</Text>
              <View style={[styles.chartCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                {monthly.map((m, i) => (
                  <MonthRow key={i} m={m} prev={monthly[i - 1]} index={i} />
                ))}
              </View>

              <Text style={[styles.sectionTitle, { color: theme.text }]}>End-of-Month Forecast</Text>
              <PredictionCard expenses={expenses} budget={budget} />
            </View>
          )}
        </Animated.ScrollView>
      </Animated.View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  subTabBar:       { flexDirection: 'row', marginHorizontal: 16, marginTop: 8, borderRadius: 14, borderWidth: 1, padding: 4, gap: 4 },
  subTab:          { flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: 'center' },
  subTabText:      { fontSize: 13 },
  sectionTitle:    { fontSize: 17, fontWeight: '700', marginBottom: 6, marginTop: 16 },
  sectionSub:      { fontSize: 12, marginBottom: 12 },
  chartCard:       { borderRadius: 20, borderWidth: 1, padding: 16, marginBottom: 8 },
  emptyState:      { alignItems: 'center', paddingTop: 40, gap: 10 },
  emptyText:       { fontSize: 15 },
  emptySmall:      { alignItems: 'center', padding: 20 },
  emptySmallText:  { fontSize: 14 },
  // Donut
  donutCenter:     { alignItems: 'center' },
  donutTotal:      { fontSize: 18, fontWeight: '800' },
  donutLabel:      { fontSize: 11 },
  legendRow:       { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginTop: 12 },
  legendItem:      { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot:       { width: 8, height: 8, borderRadius: 4 },
  legendText:      { fontSize: 11 },
  // Heatmap
  heatDayLabels:   { flexDirection: 'row', marginBottom: 6 },
  heatDayLabel:    { flex: 1, textAlign: 'center', fontSize: 11, fontWeight: '600' },
  heatGrid:        { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  heatCell:        { width: (W - 64) / 7 - 4, height: (W - 64) / 7 - 4, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  heatDayNum:      { fontSize: 11, fontWeight: '600' },
  heatTooltip:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderRadius: 12, borderWidth: 1, padding: 12, marginTop: 12 },
  heatTooltipTitle:{ fontSize: 14, fontWeight: '600' },
  heatTooltipAmt:  { fontSize: 16, fontWeight: '800' },
  // Day of week
  dowContainer:    { gap: 10 },
  dowRow:          { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dowLabel:        { width: 36, fontSize: 13 },
  dowTrack:        { flex: 1, height: 10, borderRadius: 5, overflow: 'hidden' },
  dowFill:         { height: '100%', borderRadius: 5 },
  dowAmt:          { width: 70, fontSize: 12, textAlign: 'right' },
  // Biggest
  bigRow:          { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 16, borderWidth: 1, padding: 14, marginBottom: 8 },
  bigRank:         { fontSize: 16, fontWeight: '800', width: 28 },
  bigIcon:         { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  bigNote:         { fontSize: 14, fontWeight: '600' },
  bigDate:         { fontSize: 11, marginTop: 2 },
  bigAmt:          { fontSize: 15, fontWeight: '800' },
  // Streaks
  streakGrid:      { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 8 },
  streakCard:      { width: '47%', borderRadius: 18, borderWidth: 1, padding: 16, gap: 8 },
  streakIcon:      { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  streakValue:     { fontSize: 18, fontWeight: '800' },
  streakLabel:     { fontSize: 12 },
  // Month comparison
  compContainer:   { gap: 12 },
  compRow:         { flexDirection: 'row', alignItems: 'center', gap: 10 },
  compLabel:       { width: 36, fontSize: 13 },
  compTrack:       { flex: 1, height: 12, borderRadius: 6, overflow: 'hidden' },
  compFill:        { height: '100%', borderRadius: 6 },
  compAmt:         { width: 80, fontSize: 13, textAlign: 'right' },
  compDelta:       { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 12, borderWidth: 1, padding: 12, marginTop: 4 },
  compDeltaText:   { fontSize: 13, fontWeight: '600', flex: 1 },
  // All months
  monthRow:        { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, gap: 10 },
  monthLabel:      { fontSize: 15, fontWeight: '600', width: 40 },
  monthAmt:        { flex: 1, fontSize: 16, fontWeight: '700' },
  changeChip:      { flexDirection: 'row', alignItems: 'center', gap: 2, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20 },
  changeText:      { fontSize: 12, fontWeight: '700' },
  // Prediction
  predCard:        { borderRadius: 20, borderWidth: 1, padding: 18, marginBottom: 8 },
  predHeader:      { flexDirection: 'row', gap: 12, alignItems: 'center', marginBottom: 16 },
  predIcon:        { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  predTitle:       { fontSize: 15, fontWeight: '700' },
  predSub:         { fontSize: 12, marginTop: 2 },
  predAmount:      { fontSize: 36, fontWeight: '800', letterSpacing: -1, marginBottom: 4 },
  predLabel:       { fontSize: 12, marginBottom: 16 },
  predTrack:       { height: 12, borderRadius: 6, overflow: 'hidden', marginBottom: 8, position: 'relative' },
  predFill:        { height: '100%', borderRadius: 6 },
  budgetMarker:    { position: 'absolute', top: 0, bottom: 0, width: 2, left: '66%' },
  predLegend:      { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  predLegendBudget:{ flexDirection: 'row', alignItems: 'center', gap: 4 },
  predLegendDot:   { width: 8, height: 8, borderRadius: 4 },
  predLegendText:  { fontSize: 11 },
  predVerdict:     { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 12, borderWidth: 1, padding: 12 },
  predVerdictText: { flex: 1, fontSize: 13, fontWeight: '600' },
});