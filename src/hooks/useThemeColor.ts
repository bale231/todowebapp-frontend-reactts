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
    const metaAppleStatusBar = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]');
    
    // Determina il colore da usare
    let themeColor: string;
    let appleStyle: string;

    if (listColor && colorThemeMap[listColor]) {
      themeColor = theme === 'dark' 
        ? colorThemeMap[listColor].dark 
        : colorThemeMap[listColor].light;
      
      // Per iOS: usa "default" per colori chiari, "black-translucent" per colori scuri
      appleStyle = theme === 'dark' ? 'black-translucent' : 'default';
    } else {
      // Colore di default (home page)
      themeColor = theme === 'dark' ? '#1f2937' : '#3b82f6';
      appleStyle = theme === 'dark' ? 'black-translucent' : 'default';
    }

    // Aggiorna entrambi i meta tag
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', themeColor);
    }
    
    if (metaAppleStatusBar) {
      metaAppleStatusBar.setAttribute('content', appleStyle);
    }

    // Cleanup: ripristina quando esci dalla pagina
    return () => {
      const defaultColor = theme === 'dark' ? '#1f2937' : '#3b82f6';
      const defaultAppleStyle = theme === 'dark' ? 'black-translucent' : 'default';
      
      metaThemeColor?.setAttribute('content', defaultColor);
      metaAppleStatusBar?.setAttribute('content', defaultAppleStyle);
    };
  }, [listColor, theme]);
}