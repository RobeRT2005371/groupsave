import { useState } from 'react';

const KEY = 'gs_theme'; // 'light' | 'dark' | absent = follow the device
export const getTheme = () => { try { return localStorage.getItem(KEY) || 'system'; } catch { return 'system'; } };

export function applyTheme(mode) {
  const root = document.documentElement;
  if (mode === 'light' || mode === 'dark') root.setAttribute('data-theme', mode); else root.removeAttribute('data-theme');
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', '#0b2545');
}

export function setTheme(mode) {
  try { mode === 'system' ? localStorage.removeItem(KEY) : localStorage.setItem(KEY, mode); } catch { /* storage unavailable */ }
  applyTheme(mode);
}

const NEXT = { system: 'light', light: 'dark', dark: 'system' };
const ICON = { system: '◐', light: '☀', dark: '☾' };
const NAME = { system: 'Automatic (follows your device)', light: 'Light mode', dark: 'Dark mode' };

/** One button that cycles Automatic → Light → Dark. */
export function ThemeToggle({ className = 'themebtn' }) {
  const [mode, setMode] = useState(getTheme);
  const next = NEXT[mode];
  return (
    <button type="button" className={className} title={NAME[mode] + '. Click for ' + NAME[next].toLowerCase()} aria-label={'Theme: ' + NAME[mode]}
      onClick={() => { setTheme(next); setMode(next); }}>
      {ICON[mode]}
    </button>
  );
}
