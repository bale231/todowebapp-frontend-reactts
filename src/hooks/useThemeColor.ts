import { useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';

// Mappa dei colori per ogni tema della lista
const colorThemeMap: Record<string, { light: string; dark: string }> = {
  blue: { light: '#3b82f6', dark: '#1e3a8a' },
  green: { light: '#10b981', dark: '#065f46' },
  yellow: { light: '#f59e0b', dark: '#92400e' },
  red: { light: '#ef4444', dark: '#991b1b' },
  purple: { light: '#a855f7', dark: '#6b21a8' },
};

export function useThemeColor(listColor?: string) {
  const { theme } = useTheme();

  useEffect(() => {
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    
    if (!metaThemeColor) return;

    // Se c'è un colore specifico della lista, usalo
    if (listColor && colorThemeMap[listColor]) {
      const themeColor = theme === 'dark' 
        ? colorThemeMap[listColor].dark 
        : colorThemeMap[listColor].light;
      metaThemeColor.setAttribute('content', themeColor);
    } else {
      // Altrimenti usa il colore di default (home page)
      const defaultColor = theme === 'dark' ? '#1f2937' : '#3b82f6';
      metaThemeColor.setAttribute('content', defaultColor);
    }

    // Cleanup: ripristina quando esci dalla pagina
    return () => {
      const defaultColor = theme === 'dark' ? '#1f2937' : '#3b82f6';
      metaThemeColor?.setAttribute('content', defaultColor);
    };
  }, [listColor, theme]);
}