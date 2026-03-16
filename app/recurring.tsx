import ScreenWrapper from '@/components/ScreenWrapper';
import { useCurrency } from '@/context/CurrencyContext';
import { CATEGORIES, useExpenses } from '@/context/ExpenseContext';
import { useTheme } from '@/context/ThemeContext';
import { MaterialIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React, { useState } from 'react';
import {
    Alert,
    FlatList,
    StyleSheet,
    Text, TextInput, TouchableOpacity,
    View,
} from 'react-native';

export default function RecurringScreen() {
  const { recurring, addRecurring, deleteRecurring } = useExpenses();
  const { theme }   = useTheme();
  const { currency, fmt } = useCurrency();
  const [amount,   setAmount]   = useState('');
  const [note,     setNote]     = useState('');
  const [category, setCategory] = useState('bills');
  const [day,      setDay]      = useState('1');
  const [adding,   setAdding]   = useState(false);

  async function handleAdd() {
    const amt = Number(amount);
    const d   = Number(day);
    if (!amt || amt <= 0)       { Alert.alert('Invalid', 'Enter a valid amount'); return; }
    if (!d || d < 1 || d > 28) { Alert.alert('Invalid', 'Day must be between 1 and 28'); return; }
    if (!note.trim())           { Alert.alert('Invalid', 'Enter a name for this expense'); return; }
    await addRecurring({ amount: amt, note, category, dayOfMonth: d });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setAmount(''); setNote(''); setDay('1'); setAdding(false);
  }

  function confirmDelete(id: string, name: string) {
    Alert.alert('Remove', `Stop auto-adding "${name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => {
        deleteRecurring(id);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }},
    ]);
  }

  return (
    <ScreenWrapper routeName="recurring">
      <FlatList
        style={{ backgroundColor: theme.bg }}
        contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
        data={recurring}
        keyExtractor={i => i.id}
        ListHeaderComponent={
          <View>
            <Text style={[styles.sub, { color: theme.textMuted }]}>
              Auto-added on the selected day each month
            </Text>

            {adding ? (
              <View style={[styles.form, { backgroundColor: theme.card, borderColor: theme.accent }]}>
                <Text style={[styles.formTitle, { color: theme.text }]}>New Recurring Expense</Text>
                <TextInput
                  style={[styles.input, { color: theme.text, borderColor: theme.border }]}
                  placeholder="Name (e.g. Netflix)"
                  placeholderTextColor={theme.textMuted}
                  value={note}
                  onChangeText={setNote}
                />
                <View style={styles.row}>
                  <TextInput
                    style={[styles.input, { flex: 1, color: theme.text, borderColor: theme.border }]}
                    placeholder={`Amount ${currency.symbol}`}
                    placeholderTextColor={theme.textMuted}
                    keyboardType="numeric"
                    value={amount}
                    onChangeText={setAmount}
                  />
                  <TextInput
                    style={[styles.input, { width: 80, color: theme.text, borderColor: theme.border }]}
                    placeholder="Day"
                    placeholderTextColor={theme.textMuted}
                    keyboardType="numeric"
                    value={day}
                    onChangeText={setDay}
                  />
                </View>
                <View style={styles.catGrid}>
                  {CATEGORIES.map(cat => {
                    const active = category === cat.id;
                    return (
                      <TouchableOpacity
                        key={cat.id}
                        style={[styles.catChip, { backgroundColor: active ? cat.color + '22' : theme.bg, borderColor: active ? cat.color : theme.border }]}
                        onPress={() => setCategory(cat.id)}
                      >
                        <MaterialIcons name={cat.icon as any} size={14} color={active ? cat.color : theme.textMuted} />
                        <Text style={[styles.catChipText, { color: active ? cat.color : theme.textMuted }]}>
                          {cat.label.split(' ')[0]}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                <View style={styles.row}>
                  <TouchableOpacity style={[styles.addBtn, { backgroundColor: theme.accent, flex: 1 }]} onPress={handleAdd}>
                    <Text style={styles.addBtnText}>Add</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.cancelBtn, { borderColor: theme.border }]} onPress={() => setAdding(false)}>
                    <MaterialIcons name="close" size={20} color={theme.textMuted} />
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <TouchableOpacity
                style={[styles.newBtn, { borderColor: theme.accent, backgroundColor: theme.card }]}
                onPress={() => { setAdding(true); Haptics.selectionAsync(); }}
              >
                <MaterialIcons name="add-circle-outline" size={18} color={theme.accent} />
                <Text style={[styles.newBtnText, { color: theme.accent }]}>Add Recurring Expense</Text>
              </TouchableOpacity>
            )}

            {recurring.length > 0 && (
              <Text style={[styles.listTitle, { color: theme.text }]}>Active ({recurring.length})</Text>
            )}
          </View>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <MaterialIcons name="repeat" size={44} color={theme.border} />
            <Text style={[styles.emptyText, { color: theme.textMuted }]}>No recurring expenses yet</Text>
          </View>
        }
        renderItem={({ item }) => {
          const cat = CATEGORIES.find(c => c.id === item.category) || CATEGORIES[6];
          const suffixes: Record<number, string> = { 1: 'st', 2: 'nd', 3: 'rd' };
          const suffix = suffixes[item.dayOfMonth] ?? 'th';
          return (
            <View style={[styles.item, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <View style={[styles.itemIcon, { backgroundColor: cat.color + '22' }]}>
                <MaterialIcons name={cat.icon as any} size={18} color={cat.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.itemName, { color: theme.text }]}>{item.note}</Text>
                <Text style={[styles.itemMeta, { color: theme.textMuted }]}>
                  Every {item.dayOfMonth}{suffix} · {cat.label}
                </Text>
              </View>
              <Text style={[styles.itemAmt, { color: theme.accent }]}>{fmt(item.amount)}</Text>
              <TouchableOpacity onPress={() => confirmDelete(item.id, item.note)} style={{ padding: 4 }}>
                <MaterialIcons name="close" size={16} color={theme.textMuted} />
              </TouchableOpacity>
            </View>
          );
        }}
      />
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  sub:         { fontSize: 13, marginBottom: 14 },
  form:        { borderRadius: 18, borderWidth: 1.5, padding: 16, marginBottom: 16, gap: 10 },
  formTitle:   { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  input:       { borderRadius: 12, borderWidth: 1, padding: 12, fontSize: 15 },
  row:         { flexDirection: 'row', gap: 10 },
  catGrid:     { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  catChip:     { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16, borderWidth: 1 },
  catChipText: { fontSize: 11, fontWeight: '600' },
  addBtn:      { borderRadius: 12, padding: 13, alignItems: 'center' },
  addBtnText:  { color: '#fff', fontWeight: '700', fontSize: 15 },
  cancelBtn:   { padding: 12, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  newBtn:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1, borderRadius: 14, padding: 14, marginBottom: 20 },
  newBtnText:  { fontWeight: '600', fontSize: 14 },
  listTitle:   { fontSize: 16, fontWeight: '700', marginBottom: 10 },
  item:        { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 16, borderWidth: 1, padding: 14, marginBottom: 8 },
  itemIcon:    { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  itemName:    { fontSize: 15, fontWeight: '600' },
  itemMeta:    { fontSize: 12, marginTop: 2 },
  itemAmt:     { fontSize: 15, fontWeight: '700', marginRight: 6 },
  empty:       { alignItems: 'center', paddingTop: 40, gap: 10 },
  emptyText:   { fontSize: 15 },
});