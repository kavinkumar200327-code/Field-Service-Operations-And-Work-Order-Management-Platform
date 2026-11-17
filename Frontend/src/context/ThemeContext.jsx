import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const ThemeContext = createContext();

const THEME_MODE_KEY = 'servisync_theme_mode';
const DAY_TIME_KEY = 'servisync_auto_day_time';
const NIGHT_TIME_KEY = 'servisync_auto_night_time';

export const ThemeProvider = ({ children }) => {
  const [themeMode, setThemeModeState] = useState(() => {
    return localStorage.getItem(THEME_MODE_KEY) || 'auto_time';
  });

  const [dayStartTime, setDayStartTimeState] = useState(() => {
    return localStorage.getItem(DAY_TIME_KEY) || '06:00';
  });

  const [nightStartTime, setNightStartTimeState] = useState(() => {
    return localStorage.getItem(NIGHT_TIME_KEY) || '18:00';
  });

  const [currentDate, setCurrentDate] = useState(() => new Date());

  // Calculate whether it is dark mode based on current mode & real time
  const calculateIsDark = useCallback((mode, dayTime, nightTime, now = new Date()) => {
    if (mode === 'dark') return true;
    if (mode === 'light') return false;
    if (mode === 'system') {
      return typeof window !== 'undefined' &&
        window.matchMedia &&
        window.matchMedia('(prefers-color-scheme: dark)').matches;
    }

    // Default: 'auto_time' (Real-time clock schedule)
    const currentMins = now.getHours() * 60 + now.getMinutes();
    const safeDayTime = (dayTime || '06:00').toString();
    const safeNightTime = (nightTime || '18:00').toString();
    const [dh, dm] = safeDayTime.split(':').map(Number);
    const [nh, nm] = safeNightTime.split(':').map(Number);
    const dayMins = (isNaN(dh) ? 6 : dh) * 60 + (isNaN(dm) ? 0 : dm);
    const nightMins = (isNaN(nh) ? 18 : nh) * 60 + (isNaN(nm) ? 0 : nm);

    if (dayMins === nightMins) {
      // If equal, treat daylight hours as 06:00 to 18:00 default
      return currentMins < 360 || currentMins >= 1080;
    }

    if (dayMins < nightMins) {
      // Normal schedule: e.g. 06:00 (day) to 18:00 (night)
      return currentMins < dayMins || currentMins >= nightMins;
    } else {
      // Inverted schedule: e.g. 20:00 to 06:00
      return currentMins >= nightMins && currentMins < dayMins;
    }
  }, []);

  const [resolvedTheme, setResolvedTheme] = useState(() => {
    return calculateIsDark(themeMode, dayStartTime, nightStartTime) ? 'dark' : 'light';
  });

  // Apply resolved theme to DOM efficiently without redundant DOM mutations
  const applyThemeToDOM = useCallback((isDark) => {
    const root = document.documentElement;
    const hasDark = root.classList.contains('dark');
    if (hasDark !== isDark) {
      if (isDark) {
        root.classList.add('dark');
        root.style.colorScheme = 'dark';
      } else {
        root.classList.remove('dark');
        root.style.colorScheme = 'light';
      }
      const metaTheme = document.querySelector('meta[name="color-scheme"]');
      if (metaTheme) metaTheme.content = isDark ? 'dark' : 'light';
    }
  }, []);

  // Update theme whenever mode, schedule, or time changes
  useEffect(() => {
    const isDark = calculateIsDark(themeMode, dayStartTime, nightStartTime, currentDate);
    setResolvedTheme(isDark ? 'dark' : 'light');
    applyThemeToDOM(isDark);
  }, [themeMode, dayStartTime, nightStartTime, currentDate, calculateIsDark, applyThemeToDOM]);

  // Periodic real-time clock check (every 1 second) for smooth ticking clock and automatic day/night transitions
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDate(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Listen to system prefers-color-scheme changes when in 'system' mode
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handleSystemChange = (e) => {
      if (themeMode === 'system') {
        const isDark = e.matches;
        setResolvedTheme(isDark ? 'dark' : 'light');
        applyThemeToDOM(isDark);
      }
    };

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleSystemChange);
      return () => mediaQuery.removeEventListener('change', handleSystemChange);
    } else if (mediaQuery.addListener) {
      mediaQuery.addListener(handleSystemChange);
      return () => mediaQuery.removeListener(handleSystemChange);
    }
  }, [themeMode, applyThemeToDOM]);

  // Sync across tabs via window storage event
  useEffect(() => {
    const handleStorage = (e) => {
      if (e.key === THEME_MODE_KEY && e.newValue) {
        setThemeModeState(e.newValue);
      }
      if (e.key === DAY_TIME_KEY && e.newValue) {
        setDayStartTimeState(e.newValue);
      }
      if (e.key === NIGHT_TIME_KEY && e.newValue) {
        setNightStartTimeState(e.newValue);
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  // User Actions
  const setThemeMode = (mode) => {
    setThemeModeState(mode);
    try {
      localStorage.setItem(THEME_MODE_KEY, mode);
    } catch (e) {}
  };

  const setAutoSchedule = (dayStart, nightStart) => {
    setDayStartTimeState(dayStart);
    setNightStartTimeState(nightStart);
    try {
      localStorage.setItem(DAY_TIME_KEY, dayStart);
      localStorage.setItem(NIGHT_TIME_KEY, nightStart);
    } catch (e) {}
  };

  // Quick toggle helper: cycles Light -> Dark -> Auto
  const toggleTheme = () => {
    if (themeMode === 'light') {
      setThemeMode('dark');
    } else if (themeMode === 'dark') {
      setThemeMode('auto_time');
    } else {
      setThemeMode('light');
    }
  };

  const formattedRealTime = currentDate.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  const isRealTimeDaylight = !calculateIsDark('auto_time', dayStartTime, nightStartTime, currentDate);

  return (
    <ThemeContext.Provider
      value={{
        themeMode,
        resolvedTheme,
        isDark: resolvedTheme === 'dark',
        dayStartTime,
        nightStartTime,
        setThemeMode,
        setAutoSchedule,
        toggleTheme,
        formattedRealTime,
        isRealTimeDaylight,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export default ThemeContext;
