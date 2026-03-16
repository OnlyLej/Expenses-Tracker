# 💸 ExpenseTracker

A personal expense tracking app built with React Native and Expo. Track your daily spending, set budgets, manage recurring bills, and visualize your financial habits — all stored locally on your device.

---

## Features

### 📊 Overview
- Monthly spending summary with budget progress bar
- Category breakdown with over-goal alerts
- Search and filter expenses by category
- Export expense list as CSV

### 📈 Analytics
- Donut chart for category spending distribution
- 6-month bar chart trend
- Spending heatmap by day of month
- Biggest expenses list
- Streak tracker for daily logging

### 🎯 Goals
- Set per-category monthly spending limits
- Visual progress bars with over/under indicators

### 📋 Reports
- Monthly summary reports
- Category-level breakdown

### 🔁 Recurring
- Set up recurring expenses (rent, subscriptions, bills)
- Auto-added on the configured day of the month

### ⚙️ Settings
- Monthly budget configuration
- Currency selector (12 currencies supported)
- Dark / Light mode toggle
- 8 color themes — Midnight, Ocean, Forest, Rose, Amber, Neon, Slate, Crimson
- Daily reminder notifications with custom time picker
- Backup & Restore — export and import all data and settings as a .json file

---

## Tech Stack

| Library | Purpose |
|---|---|
| Expo SDK 54 | App framework |
| Expo Router | File-based navigation |
| React Native Reanimated | Animations |
| AsyncStorage | Local data persistence |
| expo-notifications | Daily reminders |
| expo-file-system | Backup file writing |
| expo-sharing | Share backup files |
| expo-document-picker | Import backup files |
| expo-blur | Glassmorphism UI |
| expo-haptics | Tactile feedback |

---

## Getting Started

### Prerequisites
- Node.js 18+
- Expo CLI
- EAS CLI (for builds)

### Install dependencies
```bash
npm install
```

### Run in development
```bash
npx expo start
```

> **Note:** Notifications require a development build — they do not work in Expo Go (SDK 53+).

### Build a development client
```bash
eas build --profile development --platform android
npx expo start --dev-client
```

---

## Building

### Production APK (Android)
```bash
eas build --profile production --platform android
```

### Preview APK (Android)
```bash
eas build --profile preview --platform android
```

### iOS
```bash
eas build --profile production --platform ios
```

---

## Data & Privacy

All data is stored locally on your device using AsyncStorage. No data is ever sent to any server. Backups are plain .json files you control entirely.

---

## Backup & Restore

Go to Settings → Data Backup to:
- **Export** — saves a .json file with all expenses, recurring items, goals, budget, currency, theme, and notification settings
- **Import** — restores from a previously exported backup (replaces all current data)

---

## Supported Currencies

Philippine Peso (₱), US Dollar ($), Euro (€), British Pound (£), Japanese Yen (¥), Korean Won (₩), Australian Dollar (A$), Canadian Dollar (C$), Swiss Franc (Fr), Indian Rupee (₹), Brazilian Real (R$), Turkish Lira (₺)

---

Made with ❤️ by Lejel