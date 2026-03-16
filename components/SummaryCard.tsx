import { useTheme } from '@/context/ThemeContext';
import { MaterialIcons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

type Props = { label: string; value: string; icon: keyof typeof MaterialIcons.glyphMap; color?: string; sub?: string };

export default function SummaryCard({ label, value, icon, color, sub }: Props) {
  const { theme } = useTheme();
  const c = color || theme.accent;
  return (
    <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <MaterialIcons name={icon} size={20} color={c} style={{ marginBottom: 8 }} />
      <Text style={[styles.value, { color: theme.text }]}>{value}</Text>
      <Text style={[styles.label, { color: theme.textMuted }]}>{label}</Text>
      {sub && <Text style={[styles.sub, { color: c }]}>{sub}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  card:  { flex: 1, borderRadius: 16, borderWidth: 1, padding: 14, alignItems: 'center' },
  value: { fontSize: 20, fontWeight: '700', marginBottom: 2 },
  label: { fontSize: 11 },
  sub:   { fontSize: 11, fontWeight: '600', marginTop: 4 },
});