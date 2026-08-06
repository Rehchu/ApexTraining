import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "apex_theme";
const THEMES = ["light", "dark", "system"];

function systemPrefersDark() {
  return typeof window !== "undefined"
    && window.matchMedia?.("(prefers-color-scheme: dark)").matches;
}

export function readTheme() {
  if (typeof window === "undefined") return "light";
  const saved = window.localStorage.getItem(STORAGE_KEY);
  return THEMES.includes(saved) ? saved : "light";
}

/** Applies the resolved theme to <html>. Safe to call before React mounts. */
export function applyTheme(theme = readTheme()) {
  if (typeof document === "undefined") return;
  const dark = theme === "dark" || (theme === "system" && systemPrefersDark());
  document.documentElement.classList.toggle("dark", dark);
  // Keep the mobile browser chrome in step with the app background.
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", dark ? "#0A0C10" : "#F5F7FA");
}

/**
 * Theme preference: 'light' | 'dark' | 'system'. Persisted per device, applied
 * to <html> so every Tailwind `dark:` token and CSS variable follows it.
 */
export function useTheme() {
  const [theme, setThemeState] = useState(readTheme);

  useEffect(() => { applyTheme(theme); }, [theme]);

  // Follow the OS when set to 'system'.
  useEffect(() => {
    if (theme !== "system" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyTheme("system");
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [theme]);

  // Keep other tabs in sync.
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === STORAGE_KEY) setThemeState(readTheme());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const setTheme = useCallback((next) => {
    if (!THEMES.includes(next)) return;
    try { window.localStorage.setItem(STORAGE_KEY, next); } catch { /* private mode */ }
    setThemeState(next);
    applyTheme(next);
  }, []);

  return { theme, setTheme, isDark: document.documentElement.classList.contains("dark") };
}
