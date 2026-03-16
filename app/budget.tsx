import ScreenWrapper from '@/components/ScreenWrapper';
import { CURRENCIES, useCurrency } from '@/context/CurrencyContext';
import { useExpenses } from '@/context/ExpenseContext';
import { THEMES, THEMES_LIGHT, ThemeName, useTheme } from '@/context/ThemeContext';
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BlurView } from 'expo-blur';
import Constants from 'expo-constants';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Haptics from 'expo-haptics';
import * as Notifications from 'expo-notifications';
import * as Sharing from 'expo-sharing';
import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text, TextInput, TouchableOpacity,
  View,
} from 'react-native';

// Check if running in Expo Go (notifications are limited/broken there in SDK 53+)
const isExpoGo = Constants.appOwnership === 'expo';

// Only set up the handler if we're NOT in Expo Go
if (!isExpoGo) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert:  true,
      shouldPlaySound:  true,
      shouldSetBadge:   false,
      shouldShowBanner: true,
      shouldShowList:   true,
    }),
  });
}

const NOTIF_STORAGE_KEY = 'notif_settings';

const NOTIF_MESSAGES = [
  { title: '💸 Money Check!',          body: (s: number, c: string) => `You've spent ${c}${s.toLocaleString()} this month. Still tracking?` },
  { title: '📊 Daily Log Reminder',    body: (s: number, c: string) => `${c}${s.toLocaleString()} logged so far. Don't miss today's expenses!` },
  { title: '🔥 Stay on Track!',        body: (_: number, __: string) => `Your future self will thank you. Log your expenses now!` },
  { title: '👀 Where did it go?',      body: (s: number, c: string) => `${c}${s.toLocaleString()} spent this month. Know where every cent goes!` },
  { title: '💰 Money Check!',          body: (_: number, __: string) => `Quick! Log today's expenses before you forget them.` },
  { title: '📝 2-Minute Task',         body: (s: number, c: string) => `You've spent ${c}${s.toLocaleString()}. It takes 2 mins to log today!` },
  { title: '🎯 Budget Goal Alert',     body: (s: number, c: string) => `${c}${s.toLocaleString()} down. Log now to stay ahead of your budget!` },
  { title: '🤔 Did you spend today?',  body: (_: number, __: string) => `Don't let expenses sneak away. Log them now!` },
  { title: '📈 Track It!',             body: (s: number, c: string) => `${c}${s.toLocaleString()} this month and counting. Keep the streak alive!` },
  { title: '💡 Smart Money Move',      body: (_: number, __: string) => `People who track expenses save 20% more. Log yours now!` },
  { title: '🏆 Daily Champion',        body: (s: number, c: string) => `${c}${s.toLocaleString()} logged. Keep going — add today's spending!` },
  { title: '⚡ Quick Log Time!',       body: (_: number, __: string) => `30 seconds is all it takes. Log your expenses right now!` },
  { title: '🛍️ Spending Recap',        body: (s: number, c: string) => `${c}${s.toLocaleString()} spent this month. Is it where you want it?` },
  { title: '🌟 Stay Consistent!',      body: (_: number, __: string) => `Consistency is key to financial freedom. Log today's expenses!` },
  { title: '💳 Receipt Reminder',      body: (s: number, c: string) => `Got receipts? ${c}${s.toLocaleString()} tracked so far this month.` },
  { title: '🧠 Know Your Numbers',     body: (s: number, c: string) => `${c}${s.toLocaleString()} spent. Knowing is half the battle!` },
  { title: '🚀 Future You Thanks You', body: (_: number, __: string) => `Every cent tracked is a step toward your financial goals!` },
  { title: '📅 End of Day Check',      body: (s: number, c: string) => `Day almost done! ${c}${s.toLocaleString()} logged. Anything to add?` },
  { title: '💎 Money Mindfulness',     body: (_: number, __: string) => `The best investors know where every cent goes. Do you?` },
  { title: "⏰ Don't Forget!",        body: (s: number, c: string) => `${c}${s.toLocaleString()} this month. Add today's spending before bed!` },
];

export default function BudgetScreen() {
  const { budget, updateBudget, getMonthlyTotal }                = useExpenses();
  const { theme, setTheme, toggleDarkLight, isDark, themeName }  = useTheme();
  // ✅ Using context — no local state
  const { currency, setCurrency, fmt }                           = useCurrency();

  const [input,          setInput]          = useState(String(budget));
  const [reminderOn,     setReminderOn]      = useState(false);
  const [reminderHour,   setReminderHour]    = useState(20);
  const [reminderMinute, setReminderMinute]  = useState(0);
  const [permGranted,    setPermGranted]     = useState(false);
  const [showTimePicker, setShowTimePicker]  = useState(false);
  const [showCurrency,   setShowCurrency]    = useState(false);
  const [backupLoading,  setBackupLoading]   = useState(false);
  const [restoreLoading, setRestoreLoading]  = useState(false);
  const [hourInput,      setHourInput]       = useState('20');
  const [minuteInput,    setMinuteInput]     = useState('00');

  const slideAnim     = useRef(new Animated.Value(24)).current;
  const localFade     = useRef(new Animated.Value(0)).current;
  const timeModalAnim = useRef(new Animated.Value(0)).current;
  const currModalAnim = useRef(new Animated.Value(0)).current;

  const spent      = getMonthlyTotal();
  const remaining  = budget - spent;
  const pct        = budget > 0 ? Math.min((spent / budget) * 100, 100) : 0;
  const overBudget = remaining < 0;

  // Load persisted notification settings on mount
  useEffect(() => {
    Animated.parallel([
      Animated.timing(localFade,  { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.timing(slideAnim,  { toValue: 0, duration: 380, useNativeDriver: true }),
    ]).start();

    if (!isExpoGo) {
      checkPermissions();
    }

    AsyncStorage.getItem(NOTIF_STORAGE_KEY).then(saved => {
      if (saved) {
        try {
          const { on, hour, minute } = JSON.parse(saved);
          if (typeof on     === 'boolean') setReminderOn(on);
          if (typeof hour   === 'number')  { setReminderHour(hour);   setHourInput(String(hour)); }
          if (typeof minute === 'number')  { setReminderMinute(minute); setMinuteInput(String(minute).padStart(2, '0')); }
        } catch (_) {}
      }
    });
  }, []);

  // Persist notification settings whenever they change
  useEffect(() => {
    AsyncStorage.setItem(NOTIF_STORAGE_KEY, JSON.stringify({
      on:     reminderOn,
      hour:   reminderHour,
      minute: reminderMinute,
    })).catch(() => {});
  }, [reminderOn, reminderHour, reminderMinute]);

  function openModal(anim: Animated.Value, setter: (v: boolean) => void) {
    setter(true);
    anim.setValue(0);
    Animated.spring(anim, {
      toValue: 1, useNativeDriver: true, tension: 65, friction: 11,
    }).start();
  }

  function closeModal(anim: Animated.Value, setter: (v: boolean) => void) {
    Animated.timing(anim, {
      toValue: 0, duration: 220, useNativeDriver: true,
    }).start(() => setter(false));
  }

  async function checkPermissions() {
    if (isExpoGo) { setPermGranted(false); return; }
    const { status } = await Notifications.getPermissionsAsync();
    setPermGranted(status === 'granted');
  }

  async function requestPermissions(): Promise<boolean> {
    if (isExpoGo) return false;
    const { status } = await Notifications.requestPermissionsAsync();
    const granted = status === 'granted';
    setPermGranted(granted);
    return granted;
  }

  async function ensurePermissions(): Promise<boolean> {
    if (permGranted) return true;
    return new Promise(resolve => {
      Alert.alert(
        '🔔 Allow Notifications',
        'ExpenseTracker needs permission to send you daily reminders to log your expenses.',
        [
          { text: 'Not Now', style: 'cancel', onPress: () => resolve(false) },
          {
            text: 'Allow',
            onPress: async () => {
              const granted = await requestPermissions();
              if (!granted) {
                Alert.alert(
                  'Permission Denied',
                  'Go to Settings → Apps → ExpenseTracker → Notifications and enable them.',
                  [{ text: 'OK' }]
                );
              }
              resolve(granted);
            },
          },
        ]
      );
    });
  }

  async function setupAndroidChannel() {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('reminders', {
        name:       'Daily Reminders',
        importance: Notifications.AndroidImportance.HIGH,
        sound:      'default',
      });
    }
  }

  async function scheduleReminder(hour: number, minute: number) {
    if (isExpoGo) { setReminderOn(false); Alert.alert('Not Available in Expo Go', 'Daily reminders require a development build. Expo Go does not support scheduled notifications in SDK 53+.'); return; }
    await Notifications.cancelAllScheduledNotificationsAsync();
    const granted = await ensurePermissions();
    if (!granted) { setReminderOn(false); return; }
    await setupAndroidChannel();

    const msg = NOTIF_MESSAGES[Math.floor(Math.random() * NOTIF_MESSAGES.length)];

    await Notifications.scheduleNotificationAsync({
      content: {
        title: msg.title,
        body:  msg.body(spent, currency.symbol),
        sound: true,
        ...(Platform.OS === 'android' && { channelId: 'reminders' }),
      },
      trigger: Platform.OS === 'android'
        ? { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour, minute, channelId: 'reminders' }
        : { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour, minute },
    });

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }

  async function sendTestNotification() {
    if (isExpoGo) { Alert.alert('Not Available in Expo Go', 'Test notifications require a development build.'); return; }
    const granted = await ensurePermissions();
    if (!granted) return;
    await setupAndroidChannel();

    await Notifications.scheduleNotificationAsync({
      content: {
        title: '🧪 Test Notification',
        body:  'This is a test from ExpenseTracker. Your reminders are working!',
        sound: true,
        ...(Platform.OS === 'android' && { channelId: 'reminders' }),
      },
      trigger: {
        type:    Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: 3,
        repeats: false,
      },
    });

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert('Test Sent! 🔔', 'Check your notifications in 3 seconds.');
  }

  async function handleReminderToggle(val: boolean) {
    if (isExpoGo) {
      Alert.alert('Not Available in Expo Go', 'Daily reminders require a development build. Expo Go does not support scheduled notifications in SDK 53+.');
      return;
    }
    setReminderOn(val);
    if (val) await scheduleReminder(reminderHour, reminderMinute);
    else {
      await Notifications.cancelAllScheduledNotificationsAsync();
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }

  function applyCustomTime() {
    const h = parseInt(hourInput,   10);
    const m = parseInt(minuteInput, 10);
    if (isNaN(h) || h < 0  || h > 23) { Alert.alert('Invalid Hour',   'Hour must be 0–23.');   return; }
    if (isNaN(m) || m < 0  || m > 59) { Alert.alert('Invalid Minute', 'Minute must be 0–59.'); return; }
    setReminderHour(h);
    setReminderMinute(m);
    closeModal(timeModalAnim, setShowTimePicker);
    if (reminderOn) scheduleReminder(h, m);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert('Time Updated ✅', `Reminder set for ${formatTime(h, m)}`);
  }

  function formatTime(h: number, m: number) {
    const suffix  = h >= 12 ? 'PM' : 'AM';
    const display = h > 12 ? h - 12 : h === 0 ? 12 : h;
    return `${display}:${String(m).padStart(2, '0')} ${suffix}`;
  }

  // ── Backup & Restore ──────────────────────────────────────
  async function handleBackup() {
    setBackupLoading(true);
    try {
      // Gather all data
      const [expenses, recurring, goals, budget, currency, themeName, themeIsDark, notifSettings] =
        await Promise.all([
          AsyncStorage.getItem('expenses'),
          AsyncStorage.getItem('recurring'),
          AsyncStorage.getItem('goals'),
          AsyncStorage.getItem('budget'),
          AsyncStorage.getItem('currency'),
          AsyncStorage.getItem('app_theme_name'),
          AsyncStorage.getItem('app_theme_is_dark'),
          AsyncStorage.getItem('notif_settings'),
        ]);

      const backup = {
        version:   2,
        exportedAt: new Date().toISOString(),
        data: {
          expenses:    expenses    ? JSON.parse(expenses)    : [],
          recurring:   recurring   ? JSON.parse(recurring)   : [],
          goals:       goals       ? JSON.parse(goals)       : [],
          budget:      budget      ? Number(budget)          : 10000,
          currency:    currency    ? JSON.parse(currency)    : null,
          themeName:   themeName   ?? 'midnight',
          themeIsDark: themeIsDark ?? 'true',
          notifSettings: notifSettings ? JSON.parse(notifSettings) : null,
        },
      };

      const json     = JSON.stringify(backup, null, 2);
      const date     = new Date().toISOString().split('T')[0];
      const filename = `expensetracker-backup-${date}.json`;
      const fileUri  = FileSystem.documentDirectory + filename;

      await FileSystem.writeAsStringAsync(fileUri, json, { encoding: 'utf8' });

      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'application/json',
          dialogTitle: 'Save Backup',
          UTI: 'public.json',
        });
      } else {
        Alert.alert('Backup Saved', 'File saved to:\n' + fileUri);
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err) {
      Alert.alert('Backup Failed', String(err));
    } finally {
      setBackupLoading(false);
    }
  }

  async function handleRestore() {
    Alert.alert(
      '⚠️ Restore Backup',
      'This will REPLACE all your current data with the backup. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Choose File',
          style: 'destructive',
          onPress: async () => {
            setRestoreLoading(true);
            try {
              const result = await DocumentPicker.getDocumentAsync({
                type: 'application/json',
                copyToCacheDirectory: true,
              });

              if (result.canceled || !result.assets?.[0]) {
                setRestoreLoading(false);
                return;
              }

              const fileUri = result.assets[0].uri;
              const raw     = await FileSystem.readAsStringAsync(fileUri, { encoding: 'utf8' });
              let parsed: any;

              try {
                parsed = JSON.parse(raw);
              } catch {
                Alert.alert('Invalid File', 'The selected file is not a valid JSON backup.');
                setRestoreLoading(false);
                return;
              }

              // Support both v1 (flat) and v2 (nested under .data)
              const d = parsed.data ?? parsed;

              if (!Array.isArray(d.expenses)) {
                Alert.alert('Invalid Backup', 'This file does not look like an ExpenseTracker backup.');
                setRestoreLoading(false);
                return;
              }

              // Write all keys back to AsyncStorage
              const ops: Promise<void>[] = [
                AsyncStorage.setItem('expenses',  JSON.stringify(d.expenses  ?? [])),
                AsyncStorage.setItem('recurring', JSON.stringify(d.recurring ?? [])),
                AsyncStorage.setItem('goals',     JSON.stringify(d.goals     ?? [])),
                AsyncStorage.setItem('budget',    String(d.budget            ?? 10000)),
              ];
              if (d.currency)      ops.push(AsyncStorage.setItem('currency',         JSON.stringify(d.currency)));
              if (d.themeName)     ops.push(AsyncStorage.setItem('app_theme_name',   d.themeName));
              if (d.themeIsDark)   ops.push(AsyncStorage.setItem('app_theme_is_dark', d.themeIsDark));
              if (d.notifSettings) ops.push(AsyncStorage.setItem('notif_settings',   JSON.stringify(d.notifSettings)));

              await Promise.all(ops);

              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              Alert.alert(
                '✅ Restore Complete',
                'Restored ' + (d.expenses?.length ?? 0) + ' expenses, ' + (d.recurring?.length ?? 0) + ' recurring items, and all settings.\n\nPlease restart the app to see your data.',
                [{ text: 'OK' }]
              );
            } catch (err) {
              Alert.alert('Restore Failed', String(err));
            } finally {
              setRestoreLoading(false);
            }
          },
        },
      ]
    );
  }
  // ──────────────────────────────────────────────────────────

  function handleSave() {
    const val = Number(input);
    if (!val || val <= 0) { Alert.alert('Invalid', 'Enter a budget greater than 0.'); return; }
    updateBudget(val);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert('Saved ✅', `Monthly budget set to ${fmt(val)}`);
  }

  const themeKeys = Object.keys(THEMES) as ThemeName[];

  const sheetTranslate = (anim: Animated.Value) => anim.interpolate({
    inputRange: [0, 1], outputRange: [300, 0],
  });
  const backdropOpacity = (anim: Animated.Value) => anim.interpolate({
    inputRange: [0, 1], outputRange: [0, 1],
  });

  return (
    <ScreenWrapper routeName="budget">
      <Animated.ScrollView
        style={{ opacity: localFade, transform: [{ translateY: slideAnim }] }}
        contentContainerStyle={{ padding: 16, paddingBottom: 130 }}
      >
        {/* ── Budget Card ── */}
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={styles.cardHeader}>
            <Text style={[styles.cardTitle, { color: theme.text }]}>Monthly Budget</Text>
            <View style={[styles.badge, { backgroundColor: overBudget ? '#ef444422' : '#22c55e22' }]}>
              <Text style={[styles.badgeText, { color: overBudget ? '#ef4444' : '#22c55e' }]}>
                {overBudget ? 'Over Budget' : 'On Track'}
              </Text>
            </View>
          </View>
          <View style={[styles.progressBg, { backgroundColor: theme.border }]}>
            <View style={[styles.progressFill, {
              width:           `${pct}%` as any,
              backgroundColor: overBudget ? '#ef4444' : theme.accent,
            }]} />
          </View>
          <Text style={[styles.progressPct, { color: theme.accent }]}>{Math.round(pct)}% used</Text>
          <View style={styles.statsRow}>
            {[
              { label: 'Spent',     value: fmt(spent),              color: theme.text },
              { label: 'Budget',    value: fmt(budget),             color: theme.text },
              { label: 'Remaining', value: `${overBudget ? '-' : ''}${fmt(Math.abs(remaining))}`, color: overBudget ? '#ef4444' : '#22c55e' },
            ].map((s, i) => (
              <React.Fragment key={i}>
                {i > 0 && <View style={[styles.divider, { backgroundColor: theme.border }]} />}
                <View style={styles.stat}>
                  <Text style={[styles.statVal, { color: s.color }]}>{s.value}</Text>
                  <Text style={[styles.statLbl, { color: theme.textMuted }]}>{s.label}</Text>
                </View>
              </React.Fragment>
            ))}
          </View>
        </View>

        {/* ── Set Budget ── */}
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Set Budget</Text>
        <TextInput
          style={[styles.input, { backgroundColor: theme.card, borderColor: theme.border, color: theme.text }]}
          keyboardType="numeric"
          value={input}
          onChangeText={setInput}
          placeholder={`Monthly budget in ${currency.code}`}
          placeholderTextColor={theme.textMuted}
        />
        <TouchableOpacity style={[styles.saveBtn, { backgroundColor: theme.accent }]} onPress={handleSave}>
          <MaterialIcons name="save" size={18} color="#fff" />
          <Text style={styles.saveBtnText}>Save Budget</Text>
        </TouchableOpacity>

        {/* ── Currency ── */}
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Currency</Text>
        <TouchableOpacity
          style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}
          onPress={() => { openModal(currModalAnim, setShowCurrency); Haptics.selectionAsync(); }}
          activeOpacity={0.7}
        >
          <View style={styles.toggleRow}>
            <View style={[styles.toggleIcon, { backgroundColor: theme.accent + '22' }]}>
              <Text style={{ fontSize: 20, fontWeight: '700', color: theme.accent }}>
                {currency.symbol}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.toggleLabel, { color: theme.text }]}>{currency.name}</Text>
              <Text style={[styles.toggleSub,   { color: theme.textMuted }]}>{currency.code}</Text>
            </View>
            <MaterialIcons name="chevron-right" size={22} color={theme.textMuted} />
          </View>
        </TouchableOpacity>

        {/* ── Appearance ── */}
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Appearance</Text>
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <TouchableOpacity
            style={styles.toggleRow}
            onPress={() => { toggleDarkLight(); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); }}
            activeOpacity={0.7}
          >
            <View style={[styles.toggleIcon, { backgroundColor: theme.accent + '22' }]}>
              <MaterialIcons name={isDark ? 'dark-mode' : 'light-mode'} size={22} color={theme.accent} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.toggleLabel, { color: theme.text }]}>
                {isDark ? 'Dark Mode' : 'Light Mode'}
              </Text>
              <Text style={[styles.toggleSub, { color: theme.textMuted }]}>
                {isDark ? 'Switch to light theme' : 'Switch to dark theme'}
              </Text>
            </View>
            <Switch
              value={isDark}
              onValueChange={() => { toggleDarkLight(); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); }}
              trackColor={{ false: theme.border, true: theme.accent + '88' }}
              thumbColor={isDark ? theme.accent : theme.textMuted}
            />
          </TouchableOpacity>
        </View>

        {/* ── Notifications ── */}
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Daily Reminder</Text>
        {isExpoGo && (
          <View style={[styles.expoGoBanner, { backgroundColor: '#f9731618', borderColor: '#f9731644' }]}>
            <MaterialIcons name="info-outline" size={16} color="#f97316" />
            <Text style={styles.expoGoBannerText}>
              Notifications are unavailable in Expo Go (SDK 53+). Use a{' '}
              <Text style={{ fontWeight: '700' }}>development build</Text> to enable reminders.
            </Text>
          </View>
        )}
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          {!isExpoGo && !permGranted && (
            <TouchableOpacity
              style={[styles.permBanner, { backgroundColor: '#f9731618', borderColor: '#f9731644' }]}
              onPress={async () => {
                const granted = await ensurePermissions();
                if (granted) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              }}
            >
              <MaterialIcons name="notifications-off" size={18} color="#f97316" />
              <Text style={styles.permBannerText}>Notifications are off — tap to enable</Text>
              <MaterialIcons name="chevron-right" size={18} color="#f97316" />
            </TouchableOpacity>
          )}

          <View style={styles.toggleRow}>
            <View style={[styles.toggleIcon, { backgroundColor: theme.accent + '22' }]}>
              <MaterialIcons name="notifications" size={22} color={theme.accent} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.toggleLabel, { color: theme.text }]}>Expense Reminders</Text>
              <Text style={[styles.toggleSub,   { color: theme.textMuted }]}>
                {reminderOn
                  ? `Daily at ${formatTime(reminderHour, reminderMinute)} · random message`
                  : 'Get reminded to log expenses daily'}
              </Text>
            </View>
            <Switch
              value={reminderOn}
              onValueChange={handleReminderToggle}
              trackColor={{ false: theme.border, true: theme.accent + '88' }}
              thumbColor={reminderOn ? theme.accent : theme.textMuted}
            />
          </View>

          {reminderOn && (
            <View style={[styles.reminderOptions, { borderTopColor: theme.border }]}>
              <Text style={[styles.optionLabel, { color: theme.textMuted }]}>Reminder Time</Text>
              <TouchableOpacity
                style={[styles.timeDisplay, { backgroundColor: theme.bg, borderColor: theme.border }]}
                onPress={() => {
                  setHourInput(String(reminderHour));
                  setMinuteInput(String(reminderMinute).padStart(2, '0'));
                  openModal(timeModalAnim, setShowTimePicker);
                  Haptics.selectionAsync();
                }}
              >
                <MaterialIcons name="access-time" size={20} color={theme.accent} />
                <Text style={[styles.timeDisplayText, { color: theme.text }]}>
                  {formatTime(reminderHour, reminderMinute)}
                </Text>
                <MaterialIcons name="edit" size={16} color={theme.textMuted} />
              </TouchableOpacity>

              <Text style={[styles.reminderNote, { color: theme.textMuted }]}>
                💡 A random motivational message will be sent each day
              </Text>

              <TouchableOpacity
                style={[styles.testBtn, { borderColor: theme.accent, backgroundColor: theme.accent + '15' }]}
                onPress={() => { sendTestNotification(); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); }}
              >
                <MaterialIcons name="send" size={16} color={theme.accent} />
                <Text style={[styles.testBtnText, { color: theme.accent }]}>
                  Send Test Notification
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* ── Theme Picker ── */}
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Color Theme</Text>
        <Text style={[styles.sectionSub,   { color: theme.textMuted }]}>
          Works in both dark and light mode
        </Text>
        <View style={styles.themeGrid}>
          {themeKeys.map(key => {
            const darkVariant   = THEMES[key];
            const lightVariant  = THEMES_LIGHT[key];
            const activeVariant = isDark ? darkVariant : lightVariant;
            const active        = themeName === key;
            return (
              <TouchableOpacity
                key={key}
                onPress={() => { setTheme(key); Haptics.selectionAsync(); }}
                activeOpacity={0.75}
                style={[
                  styles.themeCard,
                  {
                    backgroundColor: active ? activeVariant.accent + '15' : theme.card,
                    borderColor:     active ? activeVariant.accent          : theme.border,
                    borderWidth:     active ? 2 : 1,
                  },
                ]}
              >
                <View style={[styles.themePreview, { backgroundColor: darkVariant.bg }]}>
                  <View style={[styles.previewAccent, { backgroundColor: darkVariant.accent }]} />
                  <View style={[styles.previewBar, { backgroundColor: darkVariant.accent + '66', width: '65%' }]} />
                  <View style={[styles.previewBar, { backgroundColor: darkVariant.accent + '33', width: '45%' }]} />
                </View>
                <View style={styles.themeFooter}>
                  <Text style={styles.themeEmoji}>{darkVariant.emoji}</Text>
                  <Text style={[styles.themeLabel, { color: active ? activeVariant.accent : theme.text }]}>
                    {darkVariant.displayName}
                  </Text>
                  {active && <MaterialIcons name="check-circle" size={15} color={activeVariant.accent} />}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── Backup & Restore ── */}
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Data Backup</Text>
        <Text style={[styles.sectionSub,   { color: theme.textMuted }]}>
          Export all expenses, recurring items, goals and settings to a JSON file
        </Text>
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          {/* Export */}
          <TouchableOpacity
            style={[styles.backupBtn, { backgroundColor: theme.accent + '18', borderColor: theme.accent + '55' }]}
            onPress={handleBackup}
            disabled={backupLoading}
            activeOpacity={0.7}
          >
            <View style={[styles.backupBtnIcon, { backgroundColor: theme.accent + '22' }]}>
              <MaterialIcons name="file-download" size={22} color={theme.accent} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.backupBtnTitle, { color: theme.text }]}>
                {backupLoading ? 'Exporting…' : 'Export Backup'}
              </Text>
              <Text style={[styles.backupBtnSub, { color: theme.textMuted }]}>
                Save a .json file with all your data & settings
              </Text>
            </View>
            {!backupLoading && <MaterialIcons name="chevron-right" size={22} color={theme.textMuted} />}
          </TouchableOpacity>

          <View style={[styles.backupDivider, { backgroundColor: theme.border }]} />

          {/* Import */}
          <TouchableOpacity
            style={[styles.backupBtn, { backgroundColor: '#ef444418', borderColor: '#ef444444' }]}
            onPress={handleRestore}
            disabled={restoreLoading}
            activeOpacity={0.7}
          >
            <View style={[styles.backupBtnIcon, { backgroundColor: '#ef444422' }]}>
              <MaterialIcons name="file-upload" size={22} color="#ef4444" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.backupBtnTitle, { color: theme.text }]}>
                {restoreLoading ? 'Restoring…' : 'Import Backup'}
              </Text>
              <Text style={[styles.backupBtnSub, { color: theme.textMuted }]}>
                Restore from a previously exported .json file
              </Text>
            </View>
            {!restoreLoading && <MaterialIcons name="chevron-right" size={22} color={theme.textMuted} />}
          </TouchableOpacity>

          {/* Info note */}
          <View style={[styles.backupNote, { backgroundColor: theme.bg, borderColor: theme.border }]}>
            <MaterialIcons name="info-outline" size={14} color={theme.textMuted} />
            <Text style={[styles.backupNoteText, { color: theme.textMuted }]}>
              Backup includes all expenses, recurring, goals, budget, currency, theme and notification settings.
            </Text>
          </View>
        </View>

        {/* ── Made by ── */}
        <View style={styles.madeBy}>
          <Text style={[styles.madeByText, { color: theme.textMuted }]}>
            Made with ❤️ by Lejel
          </Text>
          <Text style={[styles.madeByVersion, { color: theme.textMuted }]}>
            ExpenseTracker v1.0.6
          </Text>
          {/* Reset tutorial */}
          <TouchableOpacity
            style={[styles.tutorialBtn, { borderColor: theme.border }]}
            onPress={async () => {
              await AsyncStorage.removeItem('tutorial_done');
              Alert.alert('Tutorial Reset', 'Restart the app to see the tutorial again.');
            }}
          >
            <MaterialIcons name="help-outline" size={16} color={theme.textMuted} />
            <Text style={[styles.tutorialBtnText, { color: theme.textMuted }]}>
              Replay Tutorial
            </Text>
          </TouchableOpacity>
        </View>
      </Animated.ScrollView>

      {/* ── Time Picker Modal ── */}
      <Modal visible={showTimePicker} transparent animationType="none" onRequestClose={() => closeModal(timeModalAnim, setShowTimePicker)}>
        <Animated.View style={[styles.modalBackdrop, { opacity: backdropOpacity(timeModalAnim) }]}>
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => closeModal(timeModalAnim, setShowTimePicker)} activeOpacity={1} />
        </Animated.View>
        <Animated.View
          style={[styles.modalContainer, { transform: [{ translateY: sheetTranslate(timeModalAnim) }] }]}
          pointerEvents="box-none"
        >
          <BlurView intensity={isDark ? 80 : 0} tint={isDark ? 'dark' : 'light'}
            style={[styles.modalSheet, { backgroundColor: isDark ? 'transparent' : theme.card, borderColor: theme.border }]}
          >
            <View style={[styles.modalHandle, { backgroundColor: theme.border }]} />
            <Text style={[styles.modalTitle, { color: theme.text }]}>Set Reminder Time</Text>
            <Text style={[styles.modalSub,   { color: theme.textMuted }]}>
              24-hour format · 0–23 for hour, 0–59 for minute
            </Text>

            <View style={styles.timeInputRow}>
              <View style={{ flex: 1, alignItems: 'center' }}>
                <Text style={[styles.timeInputLabel, { color: theme.textMuted }]}>Hour</Text>
                <TextInput
                  style={[styles.timeInput, { backgroundColor: theme.bg, borderColor: theme.accent, color: theme.text }]}
                  keyboardType="number-pad" maxLength={2}
                  value={hourInput} onChangeText={setHourInput}
                  placeholder="20" placeholderTextColor={theme.textMuted} textAlign="center"
                />
              </View>
              <Text style={[styles.timeSeparator, { color: theme.accent }]}>:</Text>
              <View style={{ flex: 1, alignItems: 'center' }}>
                <Text style={[styles.timeInputLabel, { color: theme.textMuted }]}>Minute</Text>
                <TextInput
                  style={[styles.timeInput, { backgroundColor: theme.bg, borderColor: theme.accent, color: theme.text }]}
                  keyboardType="number-pad" maxLength={2}
                  value={minuteInput} onChangeText={setMinuteInput}
                  placeholder="00" placeholderTextColor={theme.textMuted} textAlign="center"
                />
              </View>
            </View>

            {hourInput !== '' && minuteInput !== '' && (
              <View style={[styles.timePreview, { backgroundColor: theme.accent + '15', borderColor: theme.accent + '40' }]}>
                <MaterialIcons name="access-time" size={16} color={theme.accent} />
                <Text style={[styles.timePreviewText, { color: theme.accent }]}>
                  Reminder at {formatTime(parseInt(hourInput) || 0, parseInt(minuteInput) || 0)}
                </Text>
              </View>
            )}

            <Text style={[styles.presetsLabel, { color: theme.textMuted }]}>Quick Presets</Text>
            <View style={styles.presetsRow}>
              {[
                { label: '8 AM',  h: 8,  m: 0 },
                { label: '12 PM', h: 12, m: 0 },
                { label: '6 PM',  h: 18, m: 0 },
                { label: '8 PM',  h: 20, m: 0 },
                { label: '9 PM',  h: 21, m: 0 },
                { label: '10 PM', h: 22, m: 0 },
              ].map(p => {
                const active = hourInput === String(p.h) && minuteInput === String(p.m).padStart(2, '0');
                return (
                  <TouchableOpacity
                    key={p.label}
                    onPress={() => { setHourInput(String(p.h)); setMinuteInput(String(p.m).padStart(2, '0')); Haptics.selectionAsync(); }}
                    style={[styles.preset, { backgroundColor: active ? theme.accent + '22' : theme.bg, borderColor: active ? theme.accent : theme.border }]}
                  >
                    <Text style={[styles.presetText, { color: active ? theme.accent : theme.text }]}>{p.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalCancel, { borderColor: theme.border }]}
                onPress={() => closeModal(timeModalAnim, setShowTimePicker)}
              >
                <Text style={[styles.modalCancelText, { color: theme.textMuted }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalConfirm, { backgroundColor: theme.accent }]}
                onPress={applyCustomTime}
              >
                <MaterialIcons name="check" size={18} color="#fff" />
                <Text style={styles.modalConfirmText}>Set Time</Text>
              </TouchableOpacity>
            </View>
          </BlurView>
        </Animated.View>
      </Modal>

      {/* ── Currency Picker Modal ── */}
      <Modal visible={showCurrency} transparent animationType="none" onRequestClose={() => closeModal(currModalAnim, setShowCurrency)}>
        <Animated.View style={[styles.modalBackdrop, { opacity: backdropOpacity(currModalAnim) }]}>
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => closeModal(currModalAnim, setShowCurrency)} activeOpacity={1} />
        </Animated.View>
        <Animated.View
          style={[styles.modalContainer, { transform: [{ translateY: sheetTranslate(currModalAnim) }] }]}
          pointerEvents="box-none"
        >
          <BlurView intensity={isDark ? 80 : 0} tint={isDark ? 'dark' : 'light'}
            style={[styles.modalSheet, { backgroundColor: isDark ? 'transparent' : theme.card, borderColor: theme.border }]}
          >
            <View style={[styles.modalHandle, { backgroundColor: theme.border }]} />
            <Text style={[styles.modalTitle, { color: theme.text }]}>Select Currency</Text>
            <Text style={[styles.modalSub,   { color: theme.textMuted }]}>
              Used throughout the app for all amounts
            </Text>

            <ScrollView style={{ maxHeight: 340 }} showsVerticalScrollIndicator={false}>
              {CURRENCIES.map(c => {
                const active = currency.code === c.code;
                return (
                  <TouchableOpacity
                    key={c.code}
                    onPress={() => {
                      setCurrency(c);
                      Haptics.selectionAsync();
                      setTimeout(() => closeModal(currModalAnim, setShowCurrency), 150);
                    }}
                    style={[
                      styles.currencyRow,
                      {
                        backgroundColor: active ? theme.accent + '15' : 'transparent',
                        borderColor:     active ? theme.accent + '40'  : theme.border,
                      },
                    ]}
                  >
                    <View style={[styles.currencySymbolBox, { backgroundColor: active ? theme.accent + '22' : theme.bg }]}>
                      <Text style={[styles.currencySymbol, { color: active ? theme.accent : theme.text }]}>
                        {c.symbol}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.currencyName, { color: theme.text }]}>{c.name}</Text>
                      <Text style={[styles.currencyCode, { color: theme.textMuted }]}>{c.code}</Text>
                    </View>
                    {active && <MaterialIcons name="check-circle" size={20} color={theme.accent} />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </BlurView>
        </Animated.View>
      </Modal>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  card:             { borderRadius: 20, borderWidth: 1, padding: 18, marginBottom: 20 },
  cardHeader:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  cardTitle:        { fontSize: 17, fontWeight: '700' },
  badge:            { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  badgeText:        { fontSize: 12, fontWeight: '600' },
  progressBg:       { height: 8, borderRadius: 4, overflow: 'hidden', marginBottom: 6 },
  progressFill:     { height: '100%', borderRadius: 4 },
  progressPct:      { fontSize: 12, fontWeight: '700', textAlign: 'right', marginBottom: 16 },
  statsRow:         { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' },
  stat:             { alignItems: 'center', flex: 1 },
  statVal:          { fontSize: 15, fontWeight: '700', marginBottom: 2 },
  statLbl:          { fontSize: 11 },
  divider:          { width: 1, height: 32 },
  sectionTitle:     { fontSize: 16, fontWeight: '700', marginBottom: 4, marginTop: 4 },
  sectionSub:       { fontSize: 12, marginBottom: 12 },
  input:            { borderRadius: 14, borderWidth: 1, padding: 14, fontSize: 16, marginBottom: 12 },
  saveBtn:          { flexDirection: 'row', borderRadius: 14, padding: 15, alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 24 },
  saveBtnText:      { color: '#fff', fontSize: 16, fontWeight: '700' },
  toggleRow:        { flexDirection: 'row', alignItems: 'center', gap: 14 },
  toggleIcon:       { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  toggleLabel:      { fontSize: 15, fontWeight: '600' },
  toggleSub:        { fontSize: 12, marginTop: 2 },
  permBanner:       { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 12, borderWidth: 1, padding: 12, marginBottom: 14 },
  permBannerText:   { flex: 1, color: '#f97316', fontSize: 13, fontWeight: '600' },
  reminderOptions:  { marginTop: 16, paddingTop: 16, borderTopWidth: 1 },
  optionLabel:      { fontSize: 12, fontWeight: '500', marginBottom: 8 },
  timeDisplay:      { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 10 },
  timeDisplayText:  { flex: 1, fontSize: 18, fontWeight: '700' },
  reminderNote:     { fontSize: 12, lineHeight: 18, marginBottom: 14 },
  testBtn:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1, borderRadius: 14, padding: 13 },
  testBtnText:      { fontSize: 14, fontWeight: '700' },
  themeGrid:        { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 20 },
  themeCard:        { width: '47%', borderRadius: 18, overflow: 'hidden' },
  themePreview:     { height: 58, padding: 12, gap: 5, justifyContent: 'center' },
  previewAccent:    { width: 24, height: 24, borderRadius: 12, marginBottom: 4 },
  previewBar:       { height: 5, borderRadius: 3 },
  themeFooter:      { flexDirection: 'row', alignItems: 'center', gap: 6, padding: 10, paddingTop: 8 },
  themeEmoji:       { fontSize: 15 },
  themeLabel:       { flex: 1, fontSize: 13, fontWeight: '600' },
  modalBackdrop:    { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.55)' },
  modalContainer:   { position: 'absolute', bottom: 0, left: 0, right: 0 },
  modalSheet:       { borderTopLeftRadius: 28, borderTopRightRadius: 28, borderWidth: 1, borderBottomWidth: 0, padding: 24, paddingBottom: 44, overflow: 'hidden' },
  modalHandle:      { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  modalTitle:       { fontSize: 20, fontWeight: '700', marginBottom: 6 },
  modalSub:         { fontSize: 13, marginBottom: 24 },
  timeInputRow:     { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  timeInputLabel:   { fontSize: 12, marginBottom: 8 },
  timeInput:        { borderRadius: 16, borderWidth: 2, padding: 16, fontSize: 36, fontWeight: '800', width: '100%' },
  timeSeparator:    { fontSize: 36, fontWeight: '800', marginTop: 20 },
  timePreview:      { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 12, borderWidth: 1, padding: 12, marginBottom: 16 },
  timePreviewText:  { fontSize: 15, fontWeight: '600' },
  presetsLabel:     { fontSize: 12, marginBottom: 10 },
  presetsRow:       { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 },
  preset:           { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  presetText:       { fontSize: 13, fontWeight: '600' },
  modalActions:     { flexDirection: 'row', gap: 10 },
  modalCancel:      { flex: 1, borderRadius: 14, borderWidth: 1, padding: 15, alignItems: 'center' },
  modalCancelText:  { fontSize: 15, fontWeight: '600' },
  modalConfirm:     { flex: 2, flexDirection: 'row', borderRadius: 14, padding: 15, alignItems: 'center', justifyContent: 'center', gap: 8 },
  modalConfirmText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  currencyRow:      { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 8 },
  currencySymbolBox:{ width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  currencySymbol:   { fontSize: 18, fontWeight: '800' },
  currencyName:     { fontSize: 15, fontWeight: '600' },
  currencyCode:     { fontSize: 12, marginTop: 2 },
  madeBy:          { alignItems: 'center', paddingTop: 24, paddingBottom: 8, gap: 6 },
  madeByText:      { fontSize: 14, fontWeight: '600' },
  madeByVersion:   { fontSize: 11 },
  tutorialBtn:     { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8, marginTop: 8 },
  tutorialBtnText:    { fontSize: 13 },
  expoGoBanner:       { flexDirection: 'row', alignItems: 'flex-start', gap: 8, borderRadius: 12, borderWidth: 1, padding: 12, marginBottom: 12 },
  expoGoBannerText:   { flex: 1, color: '#f97316', fontSize: 12, lineHeight: 18 },
  backupBtn:          { flexDirection: 'row', alignItems: 'center', gap: 14, borderRadius: 14, borderWidth: 1, padding: 14 },
  backupBtnIcon:      { width: 46, height: 46, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  backupBtnTitle:     { fontSize: 15, fontWeight: '700', marginBottom: 2 },
  backupBtnSub:       { fontSize: 12, lineHeight: 17 },
  backupDivider:      { height: 1, marginVertical: 10 },
  backupNote:         { flexDirection: 'row', alignItems: 'flex-start', gap: 8, borderRadius: 10, borderWidth: 1, padding: 10, marginTop: 10 },
  backupNoteText:     { flex: 1, fontSize: 11, lineHeight: 16 },
});