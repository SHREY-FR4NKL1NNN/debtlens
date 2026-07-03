import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { Debt, ProgressEntry, UserProfile } from '../types';
import * as api from '../lib/api';

type Theme = 'light' | 'dark';

interface DebtContextValue {
  debts: Debt[];
  profile: UserProfile;
  progress: ProgressEntry[];
  loaded: boolean;
  online: boolean; // backend reachable
  theme: Theme;

  addDebt: (debt: Omit<Debt, 'id'>) => void;
  updateDebt: (id: string, patch: Partial<Debt>) => void;
  deleteDebt: (id: string) => void;
  setDebts: (debts: Debt[]) => void;

  setProfile: (profile: UserProfile) => void;
  addProgress: (entry: ProgressEntry) => void;

  toggleTheme: () => void;
}

const DebtContext = createContext<DebtContextValue | null>(null);

const LS_DEBTS = 'dl-debts';
const LS_PROFILE = 'dl-profile';
const LS_PROGRESS = 'dl-progress';
const LS_THEME = 'dl-theme';

function loadLS<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function saveLS(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore quota / private-mode errors */
  }
}

export const uid = () =>
  `d_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

export function DebtProvider({ children }: { children: ReactNode }) {
  const [debts, setDebtsState] = useState<Debt[]>(() => loadLS(LS_DEBTS, []));
  const [profile, setProfileState] = useState<UserProfile>(() =>
    loadLS(LS_PROFILE, {}),
  );
  const [progress, setProgress] = useState<ProgressEntry[]>(() =>
    loadLS(LS_PROGRESS, []),
  );
  const [loaded, setLoaded] = useState(false);
  const [online, setOnline] = useState(false);
  const [theme, setTheme] = useState<Theme>(() => {
    const t = loadLS<Theme>(LS_THEME, 'light');
    return t === 'dark' ? 'dark' : 'light';
  });

  // Reflect theme on <html> for the CSS variable switch.
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    saveLS(LS_THEME, theme);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', theme === 'dark' ? '#09090B' : '#FAFAFA');
  }, [theme]);

  // Hydrate from the backend once; fall back to the localStorage cache.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const healthy = await api.backendHealthy();
      if (cancelled) return;
      setOnline(healthy);
      if (healthy) {
        try {
          const [d, p, pr] = await Promise.all([
            api.getDebts(),
            api.getProfile(),
            api.getProgress(),
          ]);
          if (cancelled) return;
          if (Array.isArray(d)) setDebtsState(d);
          if (p) setProfileState(p);
          if (Array.isArray(pr)) setProgress(pr);
        } catch {
          /* keep localStorage values */
        }
      }
      if (!cancelled) setLoaded(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Persist debts (localStorage always; backend when reachable).
  const skipFirstPersist = useRef(true);
  const persistDebts = useCallback(
    (next: Debt[]) => {
      saveLS(LS_DEBTS, next);
      if (online) api.saveDebts(next).catch(() => setOnline(false));
    },
    [online],
  );

  const setDebts = useCallback(
    (next: Debt[]) => {
      setDebtsState(next);
      persistDebts(next);
    },
    [persistDebts],
  );

  const addDebt = useCallback(
    (debt: Omit<Debt, 'id'>) => {
      setDebtsState((prev) => {
        const next = [...prev, { ...debt, id: uid() }];
        persistDebts(next);
        return next;
      });
    },
    [persistDebts],
  );

  const updateDebt = useCallback(
    (id: string, patch: Partial<Debt>) => {
      setDebtsState((prev) => {
        const next = prev.map((d) => (d.id === id ? { ...d, ...patch } : d));
        persistDebts(next);
        return next;
      });
    },
    [persistDebts],
  );

  const deleteDebt = useCallback(
    (id: string) => {
      setDebtsState((prev) => {
        const next = prev.filter((d) => d.id !== id);
        persistDebts(next);
        return next;
      });
    },
    [persistDebts],
  );

  const setProfile = useCallback(
    (next: UserProfile) => {
      setProfileState(next);
      saveLS(LS_PROFILE, next);
      if (online) api.saveProfile(next).catch(() => setOnline(false));
    },
    [online],
  );

  const addProgress = useCallback(
    (entry: ProgressEntry) => {
      setProgress((prev) => {
        const next = [...prev, entry];
        saveLS(LS_PROGRESS, next);
        return next;
      });
      if (online) api.addProgress(entry).catch(() => setOnline(false));
    },
    [online],
  );

  const toggleTheme = useCallback(
    () => setTheme((t) => (t === 'dark' ? 'light' : 'dark')),
    [],
  );

  // avoid unused-var lint on the ref (kept for future first-render guarding)
  void skipFirstPersist;

  const value = useMemo<DebtContextValue>(
    () => ({
      debts,
      profile,
      progress,
      loaded,
      online,
      theme,
      addDebt,
      updateDebt,
      deleteDebt,
      setDebts,
      setProfile,
      addProgress,
      toggleTheme,
    }),
    [
      debts,
      profile,
      progress,
      loaded,
      online,
      theme,
      addDebt,
      updateDebt,
      deleteDebt,
      setDebts,
      setProfile,
      addProgress,
      toggleTheme,
    ],
  );

  return <DebtContext.Provider value={value}>{children}</DebtContext.Provider>;
}

export function useDebts(): DebtContextValue {
  const ctx = useContext(DebtContext);
  if (!ctx) throw new Error('useDebts must be used within DebtProvider');
  return ctx;
}
