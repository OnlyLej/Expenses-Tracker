import { useCurrency } from '@/context/CurrencyContext';
import { CATEGORIES, Expense, useExpenses } from '@/context/ExpenseContext';
import { useTheme } from '@/context/ThemeContext';
import { MaterialIcons } from '@expo/vector-icons';
import React, { useEffect, useRef } from 'react';
import { Alert, Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function ExpenseItem({ item, index }: { item: Expense; index: number }) {
  const { deleteExpense } = useExpenses();
  const { theme }         = useTheme();
  const { fmt }           = useCurrency();
  const fadeAnim          = useRef(new Animated.Value(0)).current;
  const slideAnim         = useRef(new Animated.Value(20)).current;

  const cat = CATEGORIES.find(c => c.id === item.category) || CATEGORIES[6];

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 400, delay: index * 60, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 350, delay: index * 60, useNativeDriver: true }),
    ]).start();
  }, []);

  function confirmDelete() {
    Alert.alert('Delete', `Remove ${fmt(item.amount)} expense?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteExpense(item.id) },
    ]);
  }

  const date = new Date(item.date).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });

  return (
    <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
      <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <View style={[styles.iconBox, { backgroundColor: cat.color + '22' }]}>
          <MaterialIcons name={cat.icon as any} size={20} color={cat.color} />
        </View>
        <View style={styles.info}>
          <Text style={[styles.note, { color: theme.text }]}>{item.note || cat.label}</Text>
          <Text style={[styles.meta, { color: theme.textMuted }]}>{cat.label} · {date}</Text>
        </View>
        <Text style={[styles.amount, { color: theme.accent }]}>
          {fmt(Number(item.amount))}
        </Text>
        <TouchableOpacity onPress={confirmDelete} style={styles.deleteBtn}>
          <MaterialIcons name="close" size={16} color={theme.textMuted} />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card:      { flexDirection: 'row', alignItems: 'center', borderRadius: 16, padding: 14, marginBottom: 8, borderWidth: 1 },
  iconBox:   { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  info:      { flex: 1 },
  note:      { fontSize: 15, fontWeight: '600', marginBottom: 2 },
  meta:      { fontSize: 12 },
  amount:    { fontSize: 15, fontWeight: '700', marginRight: 10 },
  deleteBtn: { padding: 4 },
});