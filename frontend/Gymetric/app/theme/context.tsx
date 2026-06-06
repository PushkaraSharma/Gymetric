import React, { createContext, useContext, useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';
import { storage } from '../utils/LocalStorage';
import { lightTheme, darkTheme } from './theme';
import { Theme, ThemedStyle, ThemedStyleArray } from './types';

type ThemeMode = 'system' | 'light' | 'dark';

interface ThemeContextType {
    theme: Theme;
    isDark: boolean;
    mode: ThemeMode;
    setMode: (item: ThemeMode) => void;
    themed: <T>(styleOrStyleArray: ThemedStyle<T> | ThemedStyleArray<T>) => T | (T | undefined)[];
    setThemeContextOverride: (ctx: any) => void;
    themeContext: any;
}

export const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const systemColorScheme = useColorScheme();

    const [mode, setModeState] = useState<ThemeMode>('system');

    // Load persisted preference on mount
    useEffect(() => {
        const storedMode = storage.getString('theme_mode') as ThemeMode | undefined;
        if (storedMode) setModeState(storedMode);
    }, []);

    const setMode = (newMode: ThemeMode) => {
        setModeState(newMode);
        storage.set('theme_mode', newMode);
    };

    const isDark = mode === 'dark' || (mode === 'system' && systemColorScheme === 'dark');

    const theme = isDark ? darkTheme : lightTheme;

    const themed = <T,>(styleOrStyleArray: ThemedStyle<T> | ThemedStyleArray<T>): T | (T | undefined)[] => {
        if (Array.isArray(styleOrStyleArray)) {
            return styleOrStyleArray.map((style) => (typeof style === 'function' ? (style as Function)(theme) : style));
        }
        return typeof styleOrStyleArray === 'function' ? (styleOrStyleArray as Function)(theme) : styleOrStyleArray;
    };

    const setThemeContextOverride = (ctx: ThemeMode) => {
        setMode(ctx);
    };

    const themeContext = isDark ? 'dark' : 'light';

    return (
        <ThemeContext.Provider value={{ theme, isDark, mode, setMode, themed, setThemeContextOverride, themeContext }}>
            {children}
        </ThemeContext.Provider>
    );
}

export const useAppTheme = () => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useAppTheme must be used within a ThemeProvider');
    }
    return context;
};
