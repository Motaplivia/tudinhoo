import { useApp } from '../contexts/AppContext';

export const useTheme = () => {
  const { isDarkMode } = useApp();

  const theme = {
    colors: {
      background: isDarkMode ? '#1A1A1A' : '#FFFFFF',
      text: isDarkMode ? '#FFFFFF' : '#000000',
      primary: '#D96281',
      secondary: '#F2BDC7',
      border: isDarkMode ? '#333333' : '#E5E5E5',
      card: isDarkMode ? '#2D2D2D' : '#FFFFFF',
      error: '#FF3B30',
      success: '#34C759',
      warning: '#FF9500',
      info: '#007AFF',
    },
    spacing: {
      xs: 4,
      sm: 8,
      md: 16,
      lg: 24,
      xl: 32,
    },
    borderRadius: {
      sm: 4,
      md: 8,
      lg: 16,
      xl: 24,
    },
    typography: {
      h1: {
        fontSize: 32,
        fontWeight: 'bold',
      },
      h2: {
        fontSize: 24,
        fontWeight: 'bold',
      },
      h3: {
        fontSize: 20,
        fontWeight: 'bold',
      },
      body: {
        fontSize: 16,
        fontWeight: 'normal',
      },
      caption: {
        fontSize: 14,
        fontWeight: 'normal',
      },
    },
  };

  return theme;
}; 