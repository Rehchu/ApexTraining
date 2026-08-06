import React, { createContext, useState, useContext, useEffect } from 'react';
import { base44, getToken, setToken } from '@/api/base44Client';

const AuthContext = createContext();

// Apply account-level preferences (e.g. metric/imperial) to this device.
const applyUserPrefs = (u) => {
  try {
    if (u?.unit_system && localStorage.getItem('unit_system') !== u.unit_system) {
      localStorage.setItem('unit_system', u.unit_system);
      window.dispatchEvent(new Event('unitSystemChanged'));
    }
  } catch (e) { /* non-critical */ }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  // Kept for API compatibility with existing consumers; no external app settings anymore.
  const [isLoadingPublicSettings] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [appPublicSettings] = useState({});

  useEffect(() => {
    if (getToken()) {
      checkUserAuth();
    } else {
      setIsLoadingAuth(false);
    }
  }, []);

  // HIPAA automatic logoff (45 CFR §164.312(a)(2)(iii)): sign the user out
  // after a period of inactivity to protect PHI on unattended devices.
  useEffect(() => {
    if (!isAuthenticated) return;
    const IDLE_MS = 30 * 60 * 1000; // 30 minutes
    let timer;
    const reset = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        try { localStorage.setItem('idle_logout', '1'); } catch { /* ignore */ }
        logout(true);
      }, IDLE_MS);
    };
    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'];
    events.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    reset();
    return () => {
      clearTimeout(timer);
      events.forEach((e) => window.removeEventListener(e, reset));
    };
  }, [isAuthenticated]); // eslint-disable-line react-hooks/exhaustive-deps

  const checkUserAuth = async () => {
    try {
      setIsLoadingAuth(true);
      const currentUser = await base44.auth.me();
      applyUserPrefs(currentUser);
      setUser(currentUser);
      setIsAuthenticated(true);
      setAuthError(null);
    } catch (error) {
      setIsAuthenticated(false);
      setUser(null);
      if (error.status === 401 || error.status === 403) {
        setToken(null); // stale/expired token — clear it so we don't loop on redirect
        setAuthError({ type: 'auth_required', message: 'Authentication required' });
      }
    } finally {
      setIsLoadingAuth(false);
    }
  };

  const login = async (email, password) => {
    const loggedIn = await base44.auth.login(email, password);
    applyUserPrefs(loggedIn);
    setUser(loggedIn);
    setIsAuthenticated(true);
    setAuthError(null);
    return loggedIn;
  };

  const register = async (payload) => {
    const created = await base44.auth.register(payload);
    setUser(created);
    setIsAuthenticated(true);
    setAuthError(null);
    return created;
  };

  const logout = (shouldRedirect = true) => {
    setUser(null);
    setIsAuthenticated(false);
    base44.auth.logout(shouldRedirect ? window.location.href : undefined);
  };

  const navigateToLogin = () => {
    base44.auth.redirectToLogin(window.location.href);
  };

  const value = {
    user,
    setUser,
    isAuthenticated,
    isLoadingAuth,
    isLoadingPublicSettings,
    authError,
    appPublicSettings,
    login,
    register,
    logout,
    navigateToLogin,
    checkUserAuth,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
