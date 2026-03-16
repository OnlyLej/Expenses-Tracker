import ScreenWrapper from '@/components/ScreenWrapper';
import { useCurrency } from '@/context/CurrencyContext';
import { useExpenses } from '@/context/ExpenseContext';
import { useTheme } from '@/context/ThemeContext';
import { MaterialIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React, { useState } from 'react';
import {
    Alert, ScrollView,
    StyleSheet,
    Text, TextInput, TouchableOpacity,
    View,
} from 'react-native';

export default function GoalsScreen() {
  const { goals, setGoal, getCategoryTotals } = useExpenses();
  const { theme }   = useTheme();
  const { fmt }     = useCurrency();
  const [editing,   setEditing]   = useState<string | null>(null);
  const [input,     setInput]     = useState('');

  const catTotals = getCategoryTotals();

  function startEdit(catId: string) {
    const existing = goals.find(g => g.categoryId === catId);
    setInput(existing ? String(existing.limit) : '');
    setEditing(catId);
    Haptics.selectionAsync();
  }

  async function saveGoal(catId: string) {
    const val = Number(input);
    if (!val || val <= 0) { Alert.alert('Invalid', 'Enter a limit greater than 0'); return; }
    await setGoal({ categoryId: catId, limit: val });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setEditing(null);
    setInput('');
  }

  async function removeGoal(catId: string, catLabel: string) {
    Alert.alert(
      'Remove Goal',
      `Remove the spending limit for ${catLabel}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            // Set limit to 0 which we treat as "no goal"
            // Filter it out in context by removing it entirely
            await setGoal({ categoryId: catId, limit: 0 });
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          },
        },
      ]
    );
  }

  return (
    <ScreenWrapper routeName="goals">
      <ScrollView
        style={{ flex: 1, backgroundColor: theme.bg }}
        contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
      >
        <Text style={[styles.sub, { color: theme.textMuted }]}>
          Set monthly spending limits per category
        </Text>

        {catTotals.map(cat => {
          const isEditing  = editing === cat.id;
          const hasGoal    = cat.goal && cat.goal > 0;
          const pct        = hasGoal ? Math.min((cat.total / cat.goal!) * 100, 100) : 0;
          const over       = hasGoal ? cat.total > cat.goal! : false;

          return (
            <View
              key={cat.id}
              style={[
                styles.card,
                {
                  backgroundColor: theme.card,
                  borderColor:     over ? '#ef444450' : theme.border,
                },
              ]}
            >
              {/* Header */}
              <View style={styles.cardHeader}>
                <View style={[styles.iconBox, { backgroundColor: cat.color + '22' }]}>
                  <MaterialIcons name={cat.icon as any} size={18} color={cat.color} />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={[styles.catName,  { color: theme.text }]}>{cat.label}</Text>
                  <Text style={[styles.catSpent, { color: theme.textMuted }]}>
                    {fmt(cat.total)} spent
                    {hasGoal ? ` of ${fmt(cat.goal!)}` : ' · no limit set'}
                  </Text>
                </View>

                <View style={styles.actionBtns}>
                  {/* Edit / Add button */}
                  <TouchableOpacity
                    onPress={() => startEdit(cat.id)}
                    style={[styles.iconBtn, { backgroundColor: theme.accent + '18' }]}
                  >
                    <MaterialIcons
                      name={hasGoal ? 'edit' : 'add'}
                      size={18}
                      color={theme.accent}
                    />
                  </TouchableOpacity>

                  {/* Remove button — only shown if goal exists */}
                  {hasGoal && (
                    <TouchableOpacity
                      onPress={() => removeGoal(cat.id, cat.label)}
                      style={[styles.iconBtn, { backgroundColor: '#ef444418' }]}
                    >
                      <MaterialIcons name="delete-outline" size={18} color="#ef4444" />
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              {/* Progress bar */}
              {hasGoal && (
                <View style={{ marginTop: 10 }}>
                  <View style={[styles.progressBg, { backgroundColor: theme.border }]}>
                    <View style={[
                      styles.progressFill,
                      {
                        width:           `${pct}%` as any,
                        backgroundColor: over ? '#ef4444' : cat.color,
                      },
                    ]} />
                  </View>
                  <View style={styles.progressRow}>
                    <Text style={[styles.progressText, { color: theme.textMuted }]}>
                      {Math.round(pct)}%
                    </Text>
                    {over && (
                      <Text style={styles.overText}>Over limit!</Text>
                    )}
                    <Text style={[styles.progressText, { color: over ? '#ef4444' : theme.accent }]}>
                      {over
                        ? `-${fmt(cat.total - cat.goal!)}`
                        : `${fmt(cat.goal! - cat.total)} left`}
                    </Text>
                  </View>
                </View>
              )}

              {/* Inline edit form */}
              {isEditing && (
                <View style={[styles.editRow, { borderTopColor: theme.border }]}>
                  <TextInput
                    style={[styles.editInput, { color: theme.text, borderColor: theme.accent }]}
                    placeholder="Monthly limit"
                    placeholderTextColor={theme.textMuted}
                    keyboardType="numeric"
                    value={input}
                    onChangeText={setInput}
                    autoFocus
                  />
                  <TouchableOpacity
                    style={[styles.saveBtn, { backgroundColor: theme.accent }]}
                    onPress={() => saveGoal(cat.id)}
                  >
                    <Text style={styles.saveBtnText}>Set</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.cancelBtn, { borderColor: theme.border }]}
                    onPress={() => { setEditing(null); setInput(''); }}
                  >
                    <MaterialIcons name="close" size={18} color={theme.textMuted} />
                  </TouchableOpacity>
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  sub:          { fontSize: 13, marginBottom: 16 },
  card:         { borderRadius: 18, borderWidth: 1, padding: 16, marginBottom: 10 },
  cardHeader:   { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconBox:      { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  catName:      { fontSize: 15, fontWeight: '600' },
  catSpent:     { fontSize: 12, marginTop: 2 },
  actionBtns:   { flexDirection: 'row', gap: 8 },
  iconBtn:      { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  progressBg:   { height: 6, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },
  progressRow:  { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  progressText: { fontSize: 11 },
  overText:     { fontSize: 11, color: '#ef4444', fontWeight: '600' },
  editRow:      { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12, paddingTop: 12, borderTopWidth: 1 },
  editInput:    { flex: 1, borderRadius: 10, borderWidth: 1.5, padding: 10, fontSize: 15 },
  saveBtn:      { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10 },
  saveBtnText:  { color: '#fff', fontWeight: '700' },
  cancelBtn:    { padding: 8, borderRadius: 10, borderWidth: 1 },
});