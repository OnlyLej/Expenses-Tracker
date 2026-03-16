import { useCurrency } from '@/context/CurrencyContext';
import { CATEGORIES, useExpenses } from '@/context/ExpenseContext';
import { useTheme } from '@/context/ThemeContext';
import { MaterialIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React, { useRef, useState } from 'react';
import {
    Animated, Dimensions,
    KeyboardAvoidingView,
    Modal,
    Platform, ScrollView,
    StyleSheet,
    Text, TextInput, TouchableOpacity,
    View,
} from 'react-native';

const { height: SCREEN_H } = Dimensions.get('window');

export default function QuickAdd() {
  const { addExpense } = useExpenses();
  const { theme }      = useTheme();
  const { currency }   = useCurrency();

  const [visible,  setVisible]  = useState(false);
  const [amount,   setAmount]   = useState('');
  const [note,     setNote]     = useState('');
  const [category, setCategory] = useState('food');
  const [saved,    setSaved]    = useState(false);

  const sheetAnim      = useRef(new Animated.Value(SCREEN_H)).current;
  const fabScale       = useRef(new Animated.Value(1)).current;
  const fabRotate      = useRef(new Animated.Value(0)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;

  function openSheet() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setVisible(true);
    Animated.parallel([
      Animated.spring(sheetAnim,      { toValue: 0,   useNativeDriver: true, tension: 80, friction: 12 }),
      Animated.timing(overlayOpacity, { toValue: 1,   useNativeDriver: true, duration: 250 }),
      Animated.spring(fabRotate,      { toValue: 1,   useNativeDriver: true, tension: 120, friction: 8 }),
      Animated.spring(fabScale,       { toValue: 1.1, useNativeDriver: true, tension: 120, friction: 6 }),
    ]).start();
  }

  function closeSheet() {
    Animated.parallel([
      Animated.timing(sheetAnim,      { toValue: SCREEN_H, useNativeDriver: true, duration: 300 }),
      Animated.timing(overlayOpacity, { toValue: 0,        useNativeDriver: true, duration: 250 }),
      Animated.spring(fabRotate,      { toValue: 0,        useNativeDriver: true, tension: 120, friction: 8 }),
      Animated.spring(fabScale,       { toValue: 1,        useNativeDriver: true, tension: 120, friction: 8 }),
    ]).start(() => {
      setVisible(false);
      setAmount(''); setNote(''); setCategory('food'); setSaved(false);
    });
  }

  async function handleSave() {
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    await addExpense({ amount: Number(amount), note, category });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setSaved(true);
    setTimeout(() => closeSheet(), 800);
  }

  const spin = fabRotate.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '45deg'] });

  return (
    <>
      <Animated.View
        style={[
          styles.fab,
          { backgroundColor: theme.accent, shadowColor: theme.accent },
          { transform: [{ scale: fabScale }, { rotate: spin }] },
        ]}
      >
        <TouchableOpacity onPress={visible ? closeSheet : openSheet} style={styles.fabInner}>
          <MaterialIcons name="add" size={28} color="#fff" />
        </TouchableOpacity>
      </Animated.View>

      <Modal transparent visible={visible} onRequestClose={closeSheet} statusBarTranslucent>
        <Animated.View style={[styles.backdrop, { opacity: overlayOpacity }]}>
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={closeSheet} activeOpacity={1} />
        </Animated.View>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.kvContainer}
          pointerEvents="box-none"
        >
          <Animated.View
            style={[
              styles.sheet,
              { backgroundColor: theme.card, borderColor: theme.border },
              { transform: [{ translateY: sheetAnim }] },
            ]}
          >
            <View style={[styles.handle, { backgroundColor: theme.border }]} />
            <Text style={[styles.sheetTitle, { color: theme.text }]}>Quick Add</Text>

            {saved ? (
              <View style={styles.savedState}>
                <MaterialIcons name="check-circle" size={56} color={theme.accent} />
                <Text style={[styles.savedText, { color: theme.text }]}>Saved!</Text>
              </View>
            ) : (
              <>
                <View style={[styles.amountRow, { borderBottomColor: theme.border }]}>
                  <Text style={[styles.peso, { color: theme.textMuted }]}>{currency.symbol}</Text>
                  <TextInput
                    style={[styles.amountInput, { color: theme.text }]}
                    placeholder="0.00"
                    placeholderTextColor={theme.textMuted}
                    keyboardType="numeric"
                    value={amount}
                    onChangeText={setAmount}
                    autoFocus
                  />
                </View>

                <TextInput
                  style={[styles.noteInput, { color: theme.text, borderColor: theme.border }]}
                  placeholder="Note (optional)"
                  placeholderTextColor={theme.textMuted}
                  value={note}
                  onChangeText={setNote}
                />

                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catScroll}>
                  <View style={styles.catRow}>
                    {CATEGORIES.map(cat => {
                      const active = category === cat.id;
                      return (
                        <TouchableOpacity
                          key={cat.id}
                          onPress={() => { setCategory(cat.id); Haptics.selectionAsync(); }}
                          style={[
                            styles.catPill,
                            {
                              backgroundColor: active ? cat.color + '28' : theme.bg,
                              borderColor:     active ? cat.color         : theme.border,
                            },
                          ]}
                        >
                          <MaterialIcons name={cat.icon as any} size={14} color={active ? cat.color : theme.textMuted} />
                          <Text style={[styles.catPillText, { color: active ? cat.color : theme.textMuted }]}>
                            {cat.label.split(' ')[0]}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </ScrollView>

                <TouchableOpacity style={[styles.saveBtn, { backgroundColor: theme.accent }]} onPress={handleSave}>
                  <MaterialIcons name="check" size={20} color="#fff" />
                  <Text style={styles.saveBtnText}>Save Expense</Text>
                </TouchableOpacity>
              </>
            )}
          </Animated.View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  fab:        { position: 'absolute', bottom: 110, right: 20, width: 58, height: 58, borderRadius: 29, shadowOpacity: 0.5, shadowRadius: 16, shadowOffset: { width: 0, height: 4 }, elevation: 16, zIndex: 100 },
  fabInner:   { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center', borderRadius: 29 },
  backdrop:   { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)' },
  kvContainer:{ flex: 1, justifyContent: 'flex-end' },
  sheet:      { borderTopLeftRadius: 28, borderTopRightRadius: 28, borderWidth: 1, borderBottomWidth: 0, paddingHorizontal: 20, paddingBottom: 40, paddingTop: 12 },
  handle:     { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  sheetTitle: { fontSize: 20, fontWeight: '700', marginBottom: 20 },
  amountRow:  { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, marginBottom: 16, paddingBottom: 8 },
  peso:       { fontSize: 32, fontWeight: '700', marginRight: 6 },
  amountInput:{ flex: 1, fontSize: 48, fontWeight: '800', letterSpacing: -2 },
  noteInput:  { borderRadius: 12, borderWidth: 1, padding: 12, fontSize: 15, marginBottom: 16 },
  catScroll:  { marginBottom: 20 },
  catRow:     { flexDirection: 'row', gap: 8, paddingRight: 20 },
  catPill:    { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  catPillText:{ fontSize: 12, fontWeight: '600' },
  saveBtn:    { flexDirection: 'row', borderRadius: 16, padding: 16, alignItems: 'center', justifyContent: 'center', gap: 8 },
  saveBtnText:{ color: '#fff', fontSize: 17, fontWeight: '700' },
  savedState: { alignItems: 'center', paddingVertical: 30, gap: 12 },
  savedText:  { fontSize: 22, fontWeight: '700' },
});