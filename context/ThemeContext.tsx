import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { Animated } from 'react-native';

export type ThemeName =
  | 'midnight' | 'ocean' | 'forest' | 'rose'
  | 'amber'    | 'neon'  | 'slate'  | 'crimson';

export type Theme = {
  name:        ThemeName;
  displayName: string;
  emoji:       string;
  bg:          string;
  card:        string;
  border:      string;
  accent:      string;
  accent2:     string;
  text:        string;
  textMuted:   string;
  isDark:      boolean;
};

const THEME_DARK: Record<ThemeName, Theme> = {
  midnight: { name: 'midnight', displayName: 'Midnight', emoji: '🌙', isDark: true,  bg: '#080810', card: '#12121e', border: '#1e1e32', accent: '#7c6bff', accent2: '#b8aaff', text: '#f0eeff', textMuted: '#5a5878' },
  ocean:    { name: 'ocean',    displayName: 'Ocean',    emoji: '🌊', isDark: true,  bg: '#060d18', card: '#0d1a2e', border: '#162438', accent: '#00c6ff', accent2: '#7ee8ff', text: '#e8f6ff', textMuted: '#3a5470' },
  forest:   { name: 'forest',   displayName: 'Forest',   emoji: '🌿', isDark: true,  bg: '#060f0a', card: '#0d1f12', border: '#162d1c', accent: '#00c853', accent2: '#7effc0', text: '#e8fff2', textMuted: '#3a5444' },
  rose:     { name: 'rose',     displayName: 'Rose',     emoji: '🌸', isDark: true,  bg: '#120810', card: '#1e0d1c', border: '#321428', accent: '#ff6bbf', accent2: '#ffb8e0', text: '#fff0f8', textMuted: '#6b3a5a' },
  amber:    { name: 'amber',    displayName: 'Amber',    emoji: '🔥', isDark: true,  bg: '#110a00', card: '#1e1200', border: '#2e1e00', accent: '#ffab00', accent2: '#ffd54f', text: '#fff8e8', textMuted: '#6b5020' },
  neon:     { name: 'neon',     displayName: 'Neon',     emoji: '⚡', isDark: true,  bg: '#050510', card: '#0a0a1e', border: '#14143c', accent: '#00ffcc', accent2: '#80ffe8', text: '#e0fff8', textMuted: '#2a4a44' },
  slate:    { name: 'slate',    displayName: 'Slate',    emoji: '🪨', isDark: true,  bg: '#0a0c10', card: '#141820', border: '#202530', accent: '#94a3b8', accent2: '#cbd5e1', text: '#f1f5f9', textMuted: '#475569' },
  crimson:  { name: 'crimson',  displayName: 'Crimson',  emoji: '🩸', isDark: true,  bg: '#100606', card: '#1e0a0a', border: '#2e1010', accent: '#ff4444', accent2: '#ff8888', text: '#fff0f0', textMuted: '#6b2a2a' },
};

const THEME_LIGHT: Record<ThemeName, Theme> = {
  midnight: { name: 'midnight', displayName: 'Midnight', emoji: '🌙', isDark: false, bg: '#f4f3ff', card: '#ffffff', border: '#e0deff', accent: '#7c6bff', accent2: '#b8aaff', text: '#1a1830', textMuted: '#9490b8' },
  ocean:    { name: 'ocean',    displayName: 'Ocean',    emoji: '🌊', isDark: false, bg: '#f0f8ff', card: '#ffffff', border: '#cce8ff', accent: '#0099cc', accent2: '#66ccff', text: '#0d2030', textMuted: '#7aaabb' },
  forest:   { name: 'forest',   displayName: 'Forest',   emoji: '🌿', isDark: false, bg: '#f0fff4', card: '#ffffff', border: '#c8f0d8', accent: '#00a854', accent2: '#66eaa0', text: '#0d2018', textMuted: '#6aaa88' },
  rose:     { name: 'rose',     displayName: 'Rose',     emoji: '🌸', isDark: false, bg: '#fff4fb', card: '#ffffff', border: '#ffd6f0', accent: '#e0409a', accent2: '#ff99d4', text: '#2a0818', textMuted: '#bb7799' },
  amber:    { name: 'amber',    displayName: 'Amber',    emoji: '🔥', isDark: false, bg: '#fffbf0', card: '#ffffff', border: '#ffe8b0', accent: '#d48000', accent2: '#ffcc44', text: '#201000', textMuted: '#aa8844' },
  neon:     { name: 'neon',     displayName: 'Neon',     emoji: '⚡', isDark: false, bg: '#f0fff8', card: '#ffffff', border: '#b8fff0', accent: '#00bb99', accent2: '#44eedd', text: '#001a14', textMuted: '#44aa99' },
  slate:    { name: 'slate',    displayName: 'Slate',    emoji: '🪨', isDark: false, bg: '#f8fafc', card: '#ffffff', border: '#e2e8f0', accent: '#64748b', accent2: '#94a3b8', text: '#0f172a', textMuted: '#94a3b8' },
  crimson:  { name: 'crimson',  displayName: 'Crimson',  emoji: '🩸', isDark: false, bg: '#fff5f5', card: '#ffffff', border: '#ffd0d0', accent: '#dd2222', accent2: '#ff7777', text: '#200000', textMuted: '#aa6666' },
};

export const THEMES       = THEME_DARK;
export const THEMES_LIGHT = THEME_LIGHT;

const STORAGE_KEY_THEME = 'app_theme_name';
const STORAGE_KEY_DARK  = 'app_theme_is_dark';

type ThemeCtx = {
  theme:           Theme;
  prevTheme:       Theme;
  isDark:          boolean;
  themeName:       ThemeName;
  themeLoaded:     boolean;
  setTheme:        (name: ThemeName) => void;
  toggleDarkLight: () => void;
  colorAnim:       Animated.Value;
};

const ThemeContext = createContext<ThemeCtx>({
  theme:           THEME_DARK.midnight,
  prevTheme:       THEME_DARK.midnight,
  isDark:          true,
  themeName:       'midnight',
  themeLoaded:     false,
  setTheme:        () => {},
  toggleDarkLight: () => {},
  colorAnim:       new Animated.Value(1),
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeName,   setThemeNameState] = useState<ThemeName>('midnight');
  const [isDark,      setIsDark]         = useState(true);
  const [prevTheme,   setPrevTheme]      = useState<Theme>(THEME_DARK.midnight);
  const [themeLoaded, setThemeLoaded]    = useState(false);
  const colorAnim                        = useRef(new Animated.Value(1)).current;

  // Load persisted theme on mount
  useEffect(() => {
    (async () => {
      try {
        const [savedName, savedDark] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEY_THEME),
          AsyncStorage.getItem(STORAGE_KEY_DARK),
        ]);
        if (savedName && savedName in THEME_DARK) {
          setThemeNameState(savedName as ThemeName);
        }
        if (savedDark !== null) {
          setIsDark(savedDark === 'true');
        }
      } catch (_) {
        // Fall back to defaults silently
      } finally {
        setThemeLoaded(true);
      }
    })();
  }, []);

  function getTheme(name: ThemeName, dark: boolean): Theme {
    return dark ? THEME_DARK[name] : THEME_LIGHT[name];
  }

  function runTransition(from: Theme) {
    setPrevTheme(from);
    colorAnim.setValue(0);
    Animated.timing(colorAnim, {
      toValue:         1,
      duration:        600,
      useNativeDriver: false,
    }).start();
  }

  function setTheme(name: ThemeName) {
    if (name === themeName) return;
    runTransition(getTheme(themeName, isDark));
    setThemeNameState(name);
    AsyncStorage.setItem(STORAGE_KEY_THEME, name).catch(() => {});
  }

  function toggleDarkLight() {
    runTransition(getTheme(themeName, isDark));
    const newDark = !isDark;
    setIsDark(newDark);
    AsyncStorage.setItem(STORAGE_KEY_DARK, String(newDark)).catch(() => {});
  }

  return (
    <ThemeContext.Provider value={{
      theme:     getTheme(themeName, isDark),
      prevTheme,
      isDark,
      themeName,
      themeLoaded,
      setTheme,
      toggleDarkLight,
      colorAnim,
    }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() { return useContext(ThemeContext); }

export function useAnimatedColor(
  getColor: (t: Theme) => string
): Animated.AnimatedInterpolation<string | number> {
  const { theme, prevTheme, colorAnim } = useTheme();
  return colorAnim.interpolate({
    inputRange:  [0, 1],
    outputRange: [getColor(prevTheme), getColor(theme)],
  });
}