import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { initSupabase, getSupabase } from '../api/supabase';
import { APP_CONFIG, MANAGERS, SEED_USERS } from '../utils/config';
import { Logger } from '../utils/logger';

// Create context
const AppContext = createContext(null);

// Custom hook for consuming the context
export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}

// Provider component
export function AppProvider({ children }) {
  // Core state
  const [currentUser, setCurrentUser] = useState('Loading...');
  const [entries, setEntries] = useState([]);
  const [managers, setManagers] = useState(MANAGERS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  // Auth state
  const [authUser, setAuthUser] = useState(null);
  const [userEmail, setUserEmail] = useState('');
  const [authChecked, setAuthChecked] = useState(!APP_CONFIG.AUTH_ENABLED);

  // UI state
  const [currentView, setCurrentView] = useState('dashboard');
  const [notifications, setNotifications] = useState([]);
  const [darkMode, setDarkMode] = useState(() => {
    try {
      const saved = localStorage.getItem('darkMode');
      return saved ? JSON.parse(saved) : false;
    } catch {
      return false;
    }
  });

  // Apply dark mode class to document
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('darkMode', JSON.stringify(darkMode));
  }, [darkMode]);

  // Handle auth change (login/logout)
  const handleAuthChange = useCallback(async (user) => {
    if (user) {
      setAuthUser(user);
      const email = user.email || '';
      setUserEmail(email);

      // Look up display name from SEED_USERS, fall back to user_metadata or email prefix
      const seedUser = SEED_USERS.find(u => u.email.toLowerCase() === email.toLowerCase());
      const userName = seedUser?.name || user.user_metadata?.name || email.split('@')[0] || 'User';
      setCurrentUser(userName);
    } else {
      setAuthUser(null);
      setUserEmail('');
      setCurrentUser('');
    }
  }, []);

  // Check authentication on mount
  useEffect(() => {
    if (!APP_CONFIG.AUTH_ENABLED) {
      setAuthChecked(true);
      return;
    }

    let subscription = null;

    async function checkAuth() {
      try {
        Logger.debug('[Auth] Starting auth check...');
        await initSupabase();
        Logger.debug('[Auth] Supabase initialized');
        const supabase = getSupabase();

        if (!supabase) {
          Logger.debug('[Auth] Supabase unavailable');
          Logger.warn('Supabase unavailable - authentication may not work');
          setAuthChecked(true);
          return;
        }

        // Check for existing session
        Logger.debug('[Auth] Checking session...');
        const { data: { session } } = await supabase.auth.getSession();
        Logger.debug('[Auth] Session result:', session ? 'found' : 'none');
        if (session?.user) {
          await handleAuthChange(session.user);
        }
        Logger.debug('[Auth] Setting authChecked=true');
        setAuthChecked(true);

        // Listen for auth state changes
        const { data: { subscription: sub } } = supabase.auth.onAuthStateChange(
          async (event, session) => {
            Logger.debug('Auth state changed:', event);
            if (event === 'SIGNED_IN' && session?.user) {
              await handleAuthChange(session.user);
            } else if (event === 'SIGNED_OUT') {
              handleAuthChange(null);
            }
          }
        );
        subscription = sub;
      } catch (error) {
        Logger.error(error, 'Auth check failed');
        setAuthChecked(true);
      }
    }

    checkAuth();

    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, [handleAuthChange]);

  // Handle sign out
  const handleSignOut = useCallback(async () => {
    try {
      const supabase = getSupabase();
      if (supabase) {
        await supabase.auth.signOut();
      }
      handleAuthChange(null);
    } catch (error) {
      Logger.error(error, 'Sign out failed');
    }
  }, [handleAuthChange]);

  // Toggle dark mode
  const toggleDarkMode = useCallback(() => {
    setDarkMode(prev => !prev);
  }, []);

  // Add notification
  const addNotification = useCallback((notification) => {
    const id = Date.now();
    setNotifications(prev => [...prev, { ...notification, id }]);

    // Auto-dismiss after 5 seconds if not persistent
    if (!notification.persistent) {
      setTimeout(() => {
        setNotifications(prev => prev.filter(n => n.id !== id));
      }, 5000);
    }

    return id;
  }, []);

  // Remove notification
  const removeNotification = useCallback((id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  // Context value
  const value = {
    // Core state
    currentUser,
    setCurrentUser,
    entries,
    setEntries,
    managers,
    setManagers,
    loading,
    setLoading,
    saving,
    setSaving,
    saveError,
    setSaveError,

    // Auth state
    authUser,
    userEmail,
    authChecked,
    isAuthenticated: !!authUser,
    handleSignOut,

    // UI state
    currentView,
    setCurrentView,
    notifications,
    addNotification,
    removeNotification,
    darkMode,
    toggleDarkMode,
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
}

export default AppContext;
