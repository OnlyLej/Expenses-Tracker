import LoadingScreen from '@/components/LoadingScreen';
import QuickAdd from '@/components/QuickAdd';
import TabBar from '@/components/TabBar';
import Tutorial from '@/components/Tutorial';
import { CurrencyProvider } from '@/context/CurrencyContext';
import { ExpenseProvider, useExpenses } from '@/context/ExpenseContext';
import { ThemeProvider, useTheme } from '@/context/ThemeContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Tabs } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import { View } from 'react-native';

SplashScreen.preventAutoHideAsync();

function AppLayout() {
  const { loading }              = useExpenses();
  const { theme, themeLoaded }   = useTheme();
  const [showTutorial, setShowTutorial] = useState(false);

  useEffect(() => {
    if (!loading) {
      SplashScreen.hideAsync();
      checkTutorial();
    }
  }, [loading]);

  async function checkTutorial() {
    const done = await AsyncStorage.getItem('tutorial_done');
    if (!done) setShowTutorial(true);
  }

  async function finishTutorial() {
    await AsyncStorage.setItem('tutorial_done', 'true');
    setShowTutorial(false);
  }

  if (loading || !themeLoaded) return <LoadingScreen />;

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <StatusBar style={theme.isDark ? 'light' : 'dark'} backgroundColor={theme.bg} />
      <Tabs
        tabBar={props => <TabBar {...props} />}
        screenOptions={{
          headerStyle:            { backgroundColor: theme.bg },
          headerTintColor:        theme.text,
          headerShadowVisible:    false,
          headerTitleStyle:       { fontWeight: '700', fontSize: 20 },
          animation:              'none',
          contentStyle:           { backgroundColor: theme.bg },
          sceneStyle:             { backgroundColor: theme.bg },
        }}
      >
        <Tabs.Screen name="index"     options={{ title: 'Overview'   }} />
        <Tabs.Screen name="charts"    options={{ title: 'Analytics'  }} />
        <Tabs.Screen name="goals"     options={{ title: 'Goals'      }} />
        <Tabs.Screen name="reports"   options={{ title: 'Reports'    }} />
        <Tabs.Screen name="recurring" options={{ title: 'Recurring'  }} />
        <Tabs.Screen name="budget"    options={{ title: 'Settings'   }} />
        <Tabs.Screen name="add"       options={{ title: 'Add Expense', href: null }} />
      </Tabs>

      <QuickAdd />

      {/* Tutorial — shows on first launch only */}
      <Tutorial visible={showTutorial} onFinish={finishTutorial} />
    </View>
  );
}

export default function Layout() {
  return (
    <ThemeProvider>
      <CurrencyProvider>
        <ExpenseProvider>
          <AppLayout />
        </ExpenseProvider>
      </CurrencyProvider>
    </ThemeProvider>
  );
}