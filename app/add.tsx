import ScreenWrapper from '@/components/ScreenWrapper';
import { useCurrency } from '@/context/CurrencyContext';
import { CATEGORIES, useExpenses } from '@/context/ExpenseContext';
import { useTheme } from '@/context/ThemeContext';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  Alert, Animated,
  StyleSheet,
  Text, TextInput, TouchableOpacity,
  View,
} from 'react-native';

export default function AddScreen() {
  const { addExpense }    = useExpenses();
  const { theme }         = useTheme();
  const { currency }      = useCurrency();
  const router            = useRouter();
  const [amount,   setAmount]   = useState('');
  const [note,     setNote]     = useState('');
  const [category, setCategory] = useState('food');
  const localFade = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(localFade, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 380, useNativeDriver: true }),
    ]).start();
  }, []);

  async function handleAdd() {
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount greater than 0.');
      return;
    }
    await addExpense({ amount: Number(amount), note, category });
    Alert.alert('Saved!', `${currency.symbol}${Number(amount).toLocaleString()} expense added.`);
    setAmount(''); setNote(''); setCategory('food');
    router.push('/');
  }

  const selectedCat = CATEGORIES.find(c => c.id === category)!;

  return (
    <ScreenWrapper routeName="add">
      <Animated.ScrollView
        style={{ opacity: localFade, transform: [{ translateY: slideAnim }] }}
        contentContainerStyle={styles.content}
      >
        {/* Amount Card */}
        <View style={[styles.amountCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={[styles.catBadge, { backgroundColor: selectedCat.color + '22' }]}>
            <MaterialIcons name={selectedCat.icon as any} size={18} color={selectedCat.color} />
            <Text style={[styles.catBadgeText, { color: selectedCat.color }]}>{selectedCat.label}</Text>
          </View>
          <View style={styles.amountRow}>
            <Text style={[styles.amountPrefix, { color: theme.textMuted }]}>{currency.symbol}</Text>
            <TextInput
              style={[styles.amountInput, { color: theme.text }]}
              placeholder="0.00"
              placeholderTextColor={theme.textMuted}
              keyboardType="numeric"
              value={amount}
              onChangeText={setAmount}
            />
          </View>
        </View>

        {/* Note */}
        <Text style={[styles.label, { color: theme.textMuted }]}>Note</Text>
        <TextInput
          style={[styles.input, { backgroundColor: theme.card, borderColor: theme.border, color: theme.text }]}
          placeholder="What was this for?"
          placeholderTextColor={theme.textMuted}
          value={note}
          onChangeText={setNote}
        />

        {/* Category Grid */}
        <Text style={[styles.label, { color: theme.textMuted }]}>Category</Text>
        <View style={styles.catGrid}>
          {CATEGORIES.map(cat => {
            const active = category === cat.id;
            return (
              <TouchableOpacity
                key={cat.id}
                style={[
                  styles.catItem,
                  {
                    backgroundColor: active ? cat.color + '22' : theme.card,
                    borderColor:     active ? cat.color        : theme.border,
                  },
                ]}
                onPress={() => setCategory(cat.id)}
              >
                <MaterialIcons name={cat.icon as any} size={22} color={active ? cat.color : theme.textMuted} />
                <Text style={[styles.catItemText, { color: active ? cat.color : theme.textMuted }]} numberOfLines={1}>
                  {cat.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity style={[styles.saveBtn, { backgroundColor: theme.accent }]} onPress={handleAdd}>
          <MaterialIcons name="check" size={20} color="#fff" />
          <Text style={styles.saveBtnText}>Save Expense</Text>
        </TouchableOpacity>
      </Animated.ScrollView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  content:      { padding: 20, paddingBottom: 120 },
  amountCard:   { borderRadius: 24, borderWidth: 1, padding: 28, alignItems: 'center', marginBottom: 24 },
  catBadge:     { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, marginBottom: 16 },
  catBadgeText: { fontSize: 13, fontWeight: '600' },
  amountRow:    { flexDirection: 'row', alignItems: 'center' },
  amountPrefix: { fontSize: 32, fontWeight: '700', marginRight: 4 },
  amountInput:  { fontSize: 52, fontWeight: '800', minWidth: 120, textAlign: 'center', letterSpacing: -2 },
  label:        { fontSize: 13, fontWeight: '500', marginBottom: 8, marginTop: 4, letterSpacing: 0.5 },
  input:        { borderRadius: 14, borderWidth: 1, padding: 14, fontSize: 15, marginBottom: 20 },
  catGrid:      { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 28 },
  catItem:      { width: '30%', borderRadius: 14, borderWidth: 1, padding: 12, alignItems: 'center', gap: 6 },
  catItemText:  { fontSize: 11, fontWeight: '600', textAlign: 'center' },
  saveBtn:      { flexDirection: 'row', borderRadius: 18, padding: 18, alignItems: 'center', justifyContent: 'center', gap: 8 },
  saveBtnText:  { color: '#fff', fontSize: 17, fontWeight: '700' },
});