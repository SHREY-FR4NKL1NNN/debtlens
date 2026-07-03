import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { useDebts } from '../state/DebtContext';
import { PageHeader } from '../components/PageHeader';
import { GlassCard } from '../components/GlassCard';
import { EmptyState } from '../components/EmptyState';
import { CountUp } from '../components/CountUp';
import { ChartTooltip } from '../components/ChartTooltip';
import { ProgressIcon, FlameIcon, CheckIcon, ArrowUp, ArrowDown } from '../components/icons';
import { runStrategy, summarize } from '../lib/finance';
import { formatCurrency, formatCurrencyShort, formatDate } from '../lib/format';
import type { Debt, ProgressEntry } from '../types';
import { uid } from '../state/DebtContext';
import './screens.css';
import './Progress.css';

const PLAN = 'avalanche' as const;
const MS_PER_MONTH = 1000 * 60 * 60 * 24 * 30.44;

export function Progress() {
  const { debts, progress, addProgress, updateDebt } = useDebts();
  const navigate = useNavigate();
  const [updating, setUpdating] = useState(false);
  const [draft, setDraft] = useState<Record<string, string>>({});

  const summary = useMemo(() => summarize(debts), [debts]);
  const sorted = useMemo(
    () => [...progress].sort((a, b) => +new Date(a.date) - +new Date(b.date)),
    [progress],
  );

  // Baseline plan: from the first check-in (or current debts if none yet).
  const baseline = useMemo(() => {
    const first = sorted[0];
    const baseDebts: Debt[] = first
      ? debts.map((d) => ({ ...d, balance: first.balances[d.id] ?? d.balance }))
      : debts;
    const baseDate = first ? new Date(first.date) : new Date();
    return { plan: runStrategy(baseDebts, PLAN, 0), baseDate };
  }, [debts, sorted]);

  const chartData = useMemo(() => {
    const { plan, baseDate } = baseline;
    const rows: Record<string, number | null>[] = [];
    const entryByMonth = new Map<number, number>();
    for (const e of sorted) {
      const m = Math.round((+new Date(e.date) - +baseDate) / MS_PER_MONTH);
      entryByMonth.set(m, e.totalBalance);
    }
    for (let m = 0; m <= plan.months; m++) {
      rows.push({
        month: m,
        projected: plan.schedule[m]?.totalBalance ?? 0,
        actual: entryByMonth.has(m) ? entryByMonth.get(m)! : null,
      });
    }
    return rows;
  }, [baseline, sorted]);

  if (!debts.length) {
    return (
      <EmptyState
        icon={<ProgressIcon width={40} height={40} />}
        title="Track your real progress"
        body="Add your debts, then check in monthly. DebtLens plots where you actually are against where the plan said you'd be."
        action={
          <button className="btn btn-primary btn-lg" onClick={() => navigate('/debts')}>
            Add debts
          </button>
        }
      />
    );
  }

  const latest = sorted[sorted.length - 1];
  const prev = sorted[sorted.length - 2];

  // Ahead / behind vs projection at the latest check-in.
  const status = (() => {
    if (!latest) return null;
    const m = Math.round((+new Date(latest.date) - +baseline.baseDate) / MS_PER_MONTH);
    const projected = baseline.plan.schedule[Math.min(m, baseline.plan.months)]?.totalBalance ?? 0;
    const diff = projected - latest.totalBalance; // positive = ahead (lower balance)
    return { ahead: diff >= 0, amount: Math.abs(diff) };
  })();

  const streak = computeStreak(sorted, baseline.plan, baseline.baseDate);

  const openUpdate = () => {
    setDraft(Object.fromEntries(debts.map((d) => [d.id, String(d.balance)])));
    setUpdating(true);
  };

  const saveUpdate = () => {
    const balances: Record<string, number> = {};
    let total = 0;
    for (const d of debts) {
      const v = parseFloat((draft[d.id] ?? '').replace(/[^0-9.]/g, ''));
      const bal = Number.isFinite(v) ? v : d.balance;
      balances[d.id] = bal;
      total += bal;
      if (bal !== d.balance) updateDebt(d.id, { balance: bal });
    }
    const entry: ProgressEntry = {
      id: uid(),
      date: new Date().toISOString(),
      balances,
      totalBalance: total,
    };
    addProgress(entry);
    setUpdating(false);
  };

  return (
    <div className="progress-screen">
      <PageHeader
        title="Progress tracker"
        subtitle={
          latest
            ? `Last updated ${formatDate(new Date(latest.date))}`
            : 'Log your first check-in to start tracking.'
        }
        action={
          <button className="btn btn-primary" onClick={openUpdate}>
            Update balances
          </button>
        }
      />

      {/* Status + streak */}
      <div className="progress-stats stagger">
        <GlassCard className="stat-card">
          <span className="stat-label">Total remaining</span>
          <span className="stat-value dl-mono">
            <CountUp value={summary.totalBalance} format={(n) => formatCurrency(n)} />
          </span>
          <span className="stat-sub">across {debts.length} debts</span>
        </GlassCard>

        <GlassCard className="stat-card">
          <span className="stat-label">Streak</span>
          <span className="stat-value accent">
            <FlameIcon width={20} height={20} />
            <CountUp value={streak} format={(n) => `${Math.round(n)}`} />
            <span className="stat-unit"> mo</span>
          </span>
          <span className="stat-sub">
            {streak > 0 ? 'consecutive months on track' : 'log a check-in to start'}
          </span>
        </GlassCard>

        <GlassCard
          className="stat-card"
          style={{
            borderTop: status
              ? `3px solid ${status.ahead ? 'var(--dl-accent)' : 'var(--dl-danger)'}`
              : undefined,
          }}
        >
          <span className="stat-label">vs the plan</span>
          {status ? (
            <>
              <span
                className="stat-value dl-mono"
                style={{ color: status.ahead ? 'var(--dl-accent)' : 'var(--dl-danger)' }}
              >
                {status.ahead ? (
                  <ArrowUp width={18} height={18} />
                ) : (
                  <ArrowDown width={18} height={18} />
                )}
                {formatCurrency(status.amount)}
              </span>
              <span className="stat-sub">
                {status.ahead ? 'ahead of projection' : 'behind projection'}
              </span>
            </>
          ) : (
            <span className="stat-value dl-muted">—</span>
          )}
        </GlassCard>
      </div>

      {/* Actual vs projected chart */}
      <GlassCard className="chart-card">
        <h3 className="chart-title">Actual vs projected</h3>
        <p className="chart-sub">
          The line is the plan. The dots are where you really are.
        </p>
        <div className="chart-box">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
              <defs>
                <linearGradient id="grad-projected" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#7C3AED" stopOpacity={0.18} />
                  <stop offset="100%" stopColor="#7C3AED" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--dl-glass-border)" vertical={false} />
              <XAxis
                dataKey="month"
                tickFormatter={(m) => (m % 12 === 0 ? `${m / 12}y` : '')}
                tick={{ fill: 'var(--dl-text-muted)', fontSize: 11 }}
                stroke="var(--dl-glass-border)"
                interval={0}
              />
              <YAxis
                tickFormatter={formatCurrencyShort}
                tick={{ fill: 'var(--dl-text-muted)', fontSize: 11 }}
                stroke="var(--dl-glass-border)"
                width={54}
              />
              <Tooltip
                content={
                  <ChartTooltip
                    formatValue={(v) => formatCurrency(v)}
                    formatLabel={(l) => `Month ${l}`}
                  />
                }
              />
              <Area
                type="monotone"
                dataKey="projected"
                name="Projected"
                stroke="#7C3AED"
                strokeWidth={2}
                strokeDasharray="5 4"
                fill="url(#grad-projected)"
                dot={false}
                isAnimationActive
                animationDuration={600}
              />
              <Line
                type="monotone"
                dataKey="actual"
                name="Actual"
                stroke={status && !status.ahead ? '#DC2626' : '#16A34A'}
                strokeWidth={2.5}
                connectNulls
                dot={{ r: 4, strokeWidth: 2, fill: 'var(--dl-bg)' }}
                isAnimationActive
                animationDuration={600}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </GlassCard>

      {/* What changed */}
      {latest && (
        <GlassCard className="change-card">
          <span className="change-icon">
            <CheckIcon width={18} height={18} />
          </span>
          <div>
            <div className="change-title">
              {prev
                ? latest.totalBalance < prev.totalBalance
                  ? `You paid down ${formatCurrency(prev.totalBalance - latest.totalBalance)} since last check-in`
                  : `Your balance rose ${formatCurrency(latest.totalBalance - prev.totalBalance)} since last check-in`
                : 'First check-in logged'}
            </div>
            <div className="dl-label dl-muted">
              {sorted.length} check-in{sorted.length === 1 ? '' : 's'} recorded ·{' '}
              {formatDate(new Date(latest.date))}
            </div>
          </div>
        </GlassCard>
      )}

      {/* Update modal */}
      {updating && (
        <div className="drawer-root">
          <motion.div
            className="drawer-scrim"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            onClick={() => setUpdating(false)}
          />
          <motion.div
            className="glass update-modal"
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ type: 'spring', damping: 26, stiffness: 300 }}
          >
            <h2 className="dl-heading">Monthly check-in</h2>
            <p className="dl-label dl-muted update-sub">
              Enter each debt's current balance. We'll plot it against your plan.
            </p>
            <div className="update-fields">
              {debts.map((d) => (
                <div key={d.id} className="update-field">
                  <label>{d.name}</label>
                  <input
                    className="input"
                    inputMode="decimal"
                    value={draft[d.id] ?? ''}
                    onChange={(e) => setDraft((s) => ({ ...s, [d.id]: e.target.value }))}
                  />
                </div>
              ))}
            </div>
            <div className="update-foot">
              <button className="btn btn-ghost" onClick={() => setUpdating(false)}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={saveUpdate}>
                Save check-in
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

function computeStreak(
  entries: ProgressEntry[],
  plan: ReturnType<typeof runStrategy>,
  baseDate: Date,
): number {
  let streak = 0;
  for (let i = entries.length - 1; i >= 0; i--) {
    const e = entries[i];
    const m = Math.round((+new Date(e.date) - +baseDate) / MS_PER_MONTH);
    const projected = plan.schedule[Math.min(m, plan.months)]?.totalBalance ?? 0;
    if (e.totalBalance <= projected + 0.5) streak++;
    else break;
  }
  return streak;
}
