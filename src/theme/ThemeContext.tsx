import React, { createContext, useContext, useState, useMemo, useCallback } from 'react';
import { mmkvStorage } from '../store/mmkv';
import { Theme, getTheme, DEFAULT_THEME_ID } from './themes';

const STORAGE_KEY = 'activeTheme';
const UI_SCALE_KEY = 'uiScale';
const MIN_UI_SCALE = 0.85;
const MAX_UI_SCALE = 1.15;

function clampUiScale(value: number) {
  if (!Number.isFinite(value)) return 1;
  return Math.max(MIN_UI_SCALE, Math.min(MAX_UI_SCALE, value));
}

interface ThemeContextValue {
  theme: Theme;
  themeId: string;
  setThemeId: (id: string) => void;
  uiScale: number;
  setUiScale: (scale: number) => void;
  activeScreen: string;
  setActiveScreen: (screen: string) => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: getTheme(DEFAULT_THEME_ID),
  themeId: DEFAULT_THEME_ID,
  setThemeId: () => {},
  uiScale: 1,
  setUiScale: () => {},
  activeScreen: 'Home',
  setActiveScreen: () => {},
  isDark: false,
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const stored = mmkvStorage.getString(STORAGE_KEY);
  const storedUiScale = Number(mmkvStorage.getString(UI_SCALE_KEY) ?? '1');
  const [themeId, setThemeIdState] = useState<string>(stored ?? DEFAULT_THEME_ID);
  const [uiScale, setUiScaleState] = useState<number>(clampUiScale(storedUiScale));
  const [activeScreen, setActiveScreenState] = useState<string>('Home');

  const setThemeId = useCallback((id: string) => {
    setThemeIdState(id);
    mmkvStorage.set(STORAGE_KEY, id);
  }, []);

  const setUiScale = useCallback((scale: number) => {
    const clean = clampUiScale(Number(scale.toFixed(2)));
    setUiScaleState(clean);
    mmkvStorage.set(UI_SCALE_KEY, String(clean));
  }, []);

  const setActiveScreen = useCallback((screen: string) => {
    if (screen) setActiveScreenState(screen);
  }, []);

  const theme = useMemo(() => getTheme(themeId), [themeId, activeScreen]);
  const isDark = theme.mode === 'dark';
  const value = useMemo(
    () => ({ theme, themeId, setThemeId, uiScale, setUiScale, activeScreen, setActiveScreen, isDark }),
    [theme, themeId, setThemeId, uiScale, setUiScale, activeScreen, setActiveScreen, isDark]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useAppTheme() { return useContext(ThemeContext); }
export default ThemeContext;
