import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { setMessageLanguage } from './messages';

export type Language = 'es' | 'en';
export type Theme = 'light' | 'dark';
export const PREFERENCES_KEY = 'ffc.preferences.v1';
export interface Preferences {
  language: Language;
  theme: Theme;
}
export function initialPreferences(): Preferences {
  let saved: Partial<Preferences> = {};
  try {
    saved = JSON.parse(localStorage.getItem(PREFERENCES_KEY) ?? '{}') ?? {};
  } catch {
    /* Storage may be unavailable. */
  }
  return {
    language:
      saved.language === 'es' || saved.language === 'en'
        ? saved.language
        : navigator.language.startsWith('en')
          ? 'en'
          : 'es',
    theme:
      saved.theme === 'light' || saved.theme === 'dark'
        ? saved.theme
        : window.matchMedia('(prefers-color-scheme: dark)').matches
          ? 'dark'
          : 'light',
  };
}
const Context = createContext<
  | (Preferences & { setLanguage: (language: Language) => void; setTheme: (theme: Theme) => void })
  | null
>(null);
export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [preferences, setPreferences] = useState(initialPreferences);
  useEffect(() => {
    setMessageLanguage(preferences.language);
    document.documentElement.lang = preferences.language === 'es' ? 'es-CR' : 'en';
    document.documentElement.dataset.theme = preferences.theme;
    document.documentElement.style.colorScheme = preferences.theme;
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', preferences.theme === 'dark' ? '#111b20' : '#17617c');
    try {
      localStorage.setItem(PREFERENCES_KEY, JSON.stringify(preferences));
    } catch {
      /* Preferences remain usable in memory. */
    }
    window.speechSynthesis?.cancel();
  }, [preferences]);
  return (
    <Context.Provider
      value={{
        ...preferences,
        setLanguage: (language) => setPreferences((p) => ({ ...p, language })),
        setTheme: (theme) => setPreferences((p) => ({ ...p, theme })),
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function usePreferences() {
  const context = useContext(Context);
  if (!context) throw new Error('PreferencesProvider is required');
  return context;
}
