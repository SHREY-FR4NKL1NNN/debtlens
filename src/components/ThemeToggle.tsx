import { motion } from 'framer-motion';
import { useDebts } from '../state/DebtContext';
import { SunIcon, MoonIcon } from './icons';

export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const { theme, toggleTheme } = useDebts();
  const dark = theme === 'dark';
  return (
    <button
      className="theme-toggle btn-ghost"
      onClick={toggleTheme}
      aria-label={`Switch to ${dark ? 'light' : 'dark'} mode`}
      title={`Switch to ${dark ? 'light' : 'dark'} mode`}
    >
      <motion.span
        key={theme}
        initial={{ rotate: -30, opacity: 0, scale: 0.7 }}
        animate={{ rotate: 0, opacity: 1, scale: 1 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        style={{ display: 'inline-flex' }}
      >
        {dark ? <MoonIcon width={18} height={18} /> : <SunIcon width={18} height={18} />}
      </motion.span>
      {!compact && <span>{dark ? 'Dark' : 'Light'}</span>}
    </button>
  );
}
