import ExpenseItem from '@/components/ExpenseItem';
import ScreenWrapper from '@/components/ScreenWrapper';
import WeeklyCard from '@/components/WeeklyCard';
import { useCurrency } from '@/context/CurrencyContext';
import { CATEGORIES, useExpenses } from '@/context/ExpenseContext';
import { useTheme } from '@/context/ThemeContext';
import { MaterialIcons } from '@expo/vector-icons';
import * as FileSystemLegacy from 'expo-file-system/legacy';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import * as Sharing from 'expo-sharing';
import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

const FILTERS = [
  'All', 'Food & Dining', 'Transport', 'Shopping',
  'Health', 'Bills', 'Entertainment', 'Other',
];

export default function HomeScreen() {
  const { expenses, budget, getMonthlyTotal, getCategoryTotals } = useExpenses();
  const { theme }    = useTheme();
  const { fmt }      = useCurrency();
  const router       = useRouter();
  const slideAnim    = useRef(new Animated.Value(30)).current;
  const localFade    = useRef(new Animated.Value(0)).current;
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All');

  const monthlyTotal = getMonthlyTotal();
  const remaining    = budget - monthlyTotal;
  const overBudget   = remaining < 0;
  const pct          = budget > 0 ? Math.min((monthlyTotal / budget) * 100, 100) : 0;
  const catTotals    = getCategoryTotals();
  const overGoals    = catTotals.filter(c => c.goal && c.total > c.goal);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(localFade,  { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(slideAnim,  { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start();
  }, []);

  const filtered = expenses.filter(e => {
    const cat         = CATEGORIES.find(c => c.id === e.category);
    const matchFilter = filter === 'All' || cat?.label === filter;
    const matchSearch = search === '' ||
      e.note.toLowerCase().includes(search.toLowerCase()) ||
      cat?.label.toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  async function exportCSV() {
    if (!expenses.length) { Alert.alert('No Data', 'Add some expenses first!'); return; }
    const csv  = 'Date,Category,Note,Amount\n' + expenses.map(e =>
      `${new Date(e.date).toLocaleDateString()},${e.category},"${e.note}",${e.amount}`
    ).join('\n');
    const path = FileSystemLegacy.documentDirectory + 'expenses.csv';
    await FileSystemLegacy.writeAsStringAsync(path, csv);
    await Sharing.shareAsync(path, { mimeType: 'text/csv' });
  }

  const monthName = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });

  // Days from first expense to latest expense this month
  const now = new Date();
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

  const avgPerDay = Math.round(monthlyTotal / activeDays);
  return (
    <ScreenWrapper routeName="index">
      <Animated.View style={{ flex: 1, opacity: localFade, transform: [{ translateY: slideAnim }] }}>
        <FlatList
          data={filtered}
          keyExtractor={i => i.id}
          renderItem={({ item, index }) => <ExpenseItem item={item} index={index} />}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 130 }}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <View>
              {/* Hero Card */}
              <View style={[styles.heroCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <View style={[styles.glowBlob, { backgroundColor: theme.accent + '15' }]} />
                <Text style={[styles.heroMonth,  { color: theme.textMuted }]}>{monthName}</Text>
                <Text style={[styles.heroAmount, { color: theme.text }]}>
                  {fmt(monthlyTotal)}
                </Text>
                <Text style={[styles.heroLabel, { color: theme.textMuted }]}>
                  Total Spent This Month
                </Text>
                <View style={[styles.progressBg, { backgroundColor: theme.border }]}>
                  <View style={[styles.progressFill, {
                    width:           `${pct}%` as any,
                    backgroundColor: overBudget ? '#ef4444' : theme.accent,
                  }]} />
                </View>
                <View style={styles.progressRow}>
                  <Text style={[styles.progressText, { color: theme.textMuted }]}>
                    {Math.round(pct)}% of budget
                  </Text>
                  <Text style={[styles.progressText, { color: overBudget ? '#ef4444' : theme.accent }]}>
                    {overBudget
                      ? `${fmt(Math.abs(remaining))} over`
                      : `${fmt(remaining)} left`}
                  </Text>
                </View>
              </View>

              {/* Stats Row */}
              <View style={styles.statsRow}>
                {[
                  {
                    label: 'Budget',
                    value: fmt(budget),
                    icon:  'account-balance-wallet' as const,
                    color: theme.accent,
                  },
                  {
                    label: 'Count',
                    value: String(expenses.length),
                    icon:  'receipt-long' as const,
                    color: '#ff7043',
                  },
                  {
                    label: 'Avg/Day',
                    value: fmt(avgPerDay),
                    icon:  'trending-up' as const,
                    color: '#26a69a',
                  },
                ].map((s, i) => (
                  <View key={i} style={[styles.statCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                    <MaterialIcons name={s.icon} size={16} color={s.color} />
                    <Text style={[styles.statValue, { color: theme.text }]}>{s.value}</Text>
                    <Text style={[styles.statLabel, { color: theme.textMuted }]}>{s.label}</Text>
                  </View>
                ))}
              </View>

              {/* Weekly Card */}
              <WeeklyCard />

              {/* Over-goal Alert */}
              {overGoals.length > 0 && (
                <TouchableOpacity
                  style={styles.goalAlert}
                  onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); router.push('/goals'); }}
                >
                  <MaterialIcons name="warning" size={16} color="#ef4444" />
                  <Text style={styles.goalAlertText}>
                    Over limit in {overGoals.map(c => c.label.split(' ')[0]).join(', ')} — tap to review
                  </Text>
                  <MaterialIcons name="chevron-right" size={16} color="#ef4444" />
                </TouchableOpacity>
              )}

              {/* Quick Links */}
              <View style={styles.quickLinks}>
                <TouchableOpacity
                  style={[styles.quickLink, { backgroundColor: theme.card, borderColor: theme.border }]}
                  onPress={() => { Haptics.selectionAsync(); router.push('/goals'); }}
                >
                  <MaterialIcons name="flag" size={18} color={theme.accent} />
                  <Text style={[styles.quickLinkText, { color: theme.text }]}>Goals</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.quickLink, { backgroundColor: theme.card, borderColor: theme.border }]}
                  onPress={() => { Haptics.selectionAsync(); router.push('/recurring'); }}
                >
                  <MaterialIcons name="repeat" size={18} color={theme.accent} />
                  <Text style={[styles.quickLinkText, { color: theme.text }]}>Recurring</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.quickLink, { backgroundColor: theme.card, borderColor: theme.border }]}
                  onPress={() => { Haptics.selectionAsync(); exportCSV(); }}
                >
                  <MaterialIcons name="file-download" size={18} color={theme.accent} />
                  <Text style={[styles.quickLinkText, { color: theme.text }]}>Export</Text>
                </TouchableOpacity>
              </View>

              {/* Search */}
              <View style={[styles.searchBox, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <MaterialIcons name="search" size={18} color={theme.textMuted} />
                <TextInput
                  style={[styles.searchInput, { color: theme.text }]}
                  placeholder="Search expenses..."
                  placeholderTextColor={theme.textMuted}
                  value={search}
                  onChangeText={setSearch}
                />
                {search !== '' && (
                  <TouchableOpacity onPress={() => setSearch('')}>
                    <MaterialIcons name="close" size={16} color={theme.textMuted} />
                  </TouchableOpacity>
                )}
              </View>

              {/* Filter Pills */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
                <View style={{ flexDirection: 'row', gap: 8, paddingRight: 16 }}>
                  {FILTERS.map(f => {
                    const active = filter === f;
                    return (
                      <TouchableOpacity
                        key={f}
                        onPress={() => { setFilter(f); Haptics.selectionAsync(); }}
                        style={[styles.pill, {
                          backgroundColor: active ? theme.accent  : theme.card,
                          borderColor:     active ? theme.accent  : theme.border,
                        }]}
                      >
                        <Text style={[styles.pillText, { color: active ? '#fff' : theme.textMuted }]}>
                          {f}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </ScrollView>

              <Text style={[styles.sectionTitle, { color: theme.text }]}>
                {filter === 'All' ? 'All Transactions' : filter}
                <Text style={[styles.sectionCount, { color: theme.textMuted }]}>
                  {' '}({filtered.length})
                </Text>
              </Text>
            </View>
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <MaterialIcons name="receipt-long" size={52} color={theme.border} />
              <Text style={[styles.emptyText,    { color: theme.textMuted }]}>No expenses found</Text>
              <Text style={[styles.emptySubText, { color: theme.textMuted }]}>
                {search || filter !== 'All' ? 'Try a different search or filter' : 'Tap + to add your first one'}
              </Text>
            </View>
          }
        />
      </Animated.View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  heroCard:     { borderRadius: 24, borderWidth: 1, padding: 24, marginTop: 8, marginBottom: 14, overflow: 'hidden' },
  glowBlob:     { position: 'absolute', width: 220, height: 220, borderRadius: 110, top: -70, right: -50 },
  heroMonth:    { fontSize: 13, fontWeight: '500', marginBottom: 6, letterSpacing: 0.5 },
  heroAmount:   { fontSize: 40, fontWeight: '800', letterSpacing: -1, marginBottom: 2 },
  heroLabel:    { fontSize: 13, marginBottom: 16 },
  progressBg:   { height: 6, borderRadius: 3, overflow: 'hidden', marginBottom: 8 },
  progressFill: { height: '100%', borderRadius: 3 },
  progressRow:  { flexDirection: 'row', justifyContent: 'space-between' },
  progressText: { fontSize: 12 },
  statsRow:     { flexDirection: 'row', gap: 10, marginBottom: 14 },
  statCard:     { flex: 1, borderRadius: 16, borderWidth: 1, padding: 12, alignItems: 'center', gap: 4 },
  statValue:    { fontSize: 15, fontWeight: '700' },
  statLabel:    { fontSize: 11 },
  goalAlert:    { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 12, borderWidth: 1, borderColor: '#ef444440', backgroundColor: '#ef444418', padding: 12, marginBottom: 12 },
  goalAlertText:{ flex: 1, color: '#ef4444', fontSize: 13, fontWeight: '600' },
  quickLinks:   { flexDirection: 'row', gap: 10, marginBottom: 16 },
  quickLink:    { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 14, borderWidth: 1, padding: 11 },
  quickLinkText:{ fontSize: 13, fontWeight: '600' },
  searchBox:    { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 14, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 12 },
  searchInput:  { flex: 1, fontSize: 14 },
  pill:         { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1 },
  pillText:     { fontSize: 13, fontWeight: '500' },
  sectionTitle: { fontSize: 17, fontWeight: '700', marginBottom: 10 },
  sectionCount: { fontSize: 14, fontWeight: '400' },
  emptyState:   { alignItems: 'center', paddingTop: 50, gap: 8 },
  emptyText:    { fontSize: 17, fontWeight: '600' },
  emptySubText: { fontSize: 13 },
});