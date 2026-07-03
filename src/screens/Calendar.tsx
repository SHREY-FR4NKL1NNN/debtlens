import { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useDebts } from '../state/DebtContext';
import { useIsMobile } from '../hooks/useMediaQuery';
import { PageHeader } from '../components/PageHeader';
import { GlassCard } from '../components/GlassCard';
import { EmptyState } from '../components/EmptyState';
import { CalendarIcon, CheckIcon, FlameIcon, TargetIcon } from '../components/icons';
import { runStrategy, summarize } from '../lib/finance';
import { debtColorVar } from '../lib/colors';
import { formatCurrency, formatMonthYear, addMonths } from '../lib/format';
import './screens.css';
import './Calendar.css';

const PLAN = 'avalanche' as const;

interface Milestone {
  month: number;
  label: string;
  kind: 'first' | 'half' | 'final';
}

export function Calendar() {
  const { debts } = useDebts();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const plotRef = useRef<HTMLDivElement>(null);
  const [selected, setSelected] = useState<number | null>(null);

  const summary = useMemo(() => summarize(debts), [debts]);
  const plan = useMemo(
    () => (debts.length ? runStrategy(debts, PLAN, 0) : null),
    [debts],
  );

  const today = useMemo(() => new Date(), []);

  const orderedDebts = useMemo(() => {
    if (!plan) return [];
    return [...debts].sort(
      (a, b) =>
        (plan.payoffMonthByDebt[a.id] ?? Infinity) -
        (plan.payoffMonthByDebt[b.id] ?? Infinity),
    );
  }, [debts, plan]);

  const milestones = useMemo<Milestone[]>(() => {
    if (!plan) return [];
    const ms: Milestone[] = [];
    const payoffs = Object.values(plan.payoffMonthByDebt);
    if (payoffs.length) {
      const first = Math.min(...payoffs);
      ms.push({ month: first, label: 'First debt gone', kind: 'first' });
    }
    // halfway by balance
    const start = summary.totalBalance;
    const halfIdx = plan.schedule.findIndex((p) => p.totalBalance <= start / 2);
    if (halfIdx > 0) ms.push({ month: halfIdx, label: 'Halfway there', kind: 'half' });
    ms.push({ month: plan.months, label: 'Debt-free', kind: 'final' });
    return ms;
  }, [plan, summary.totalBalance]);

  if (!plan) {
    return (
      <EmptyState
        icon={<CalendarIcon width={40} height={40} />}
        title="Your payoff calendar"
        body="Add debts to see a month-by-month timeline of exactly when each one disappears — and how much monthly cash it frees up."
        action={
          <button className="btn btn-primary btn-lg" onClick={() => navigate('/debts')}>
            Add debts
          </button>
        }
      />
    );
  }

  const maxMonths = Math.max(plan.months, 1);
  const pct = (m: number) => `${(m / maxMonths) * 100}%`;

  const onPlotClick = (e: React.MouseEvent) => {
    const el = plotRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    setSelected(Math.round(x * maxMonths));
  };

  const yearMarks: number[] = [];
  for (let y = 0; y * 12 <= maxMonths; y++) yearMarks.push(y * 12);

  const selectedPoint =
    selected != null ? plan.schedule[Math.min(selected, plan.schedule.length - 1)] : null;
  const activeAtSelected =
    selected != null
      ? orderedDebts.filter((d) => (plan.payoffMonthByDebt[d.id] ?? Infinity) > selected)
      : [];
  const minDueAtSelected = activeAtSelected.reduce((s, d) => s + d.minimumPayment, 0);

  return (
    <div className="calendar-screen">
      <PageHeader
        title="Financial calendar"
        subtitle="Every debt as a bar across time. Watch them end — one payoff at a time."
      />

      {/* Milestone summary */}
      <div className="milestone-row stagger">
        {milestones.map((m) => (
          <GlassCard key={m.kind} className="milestone-card">
            <span className={`milestone-icon ${m.kind}`}>
              {m.kind === 'final' ? (
                <TargetIcon width={18} height={18} />
              ) : m.kind === 'half' ? (
                <FlameIcon width={18} height={18} />
              ) : (
                <CheckIcon width={18} height={18} />
              )}
            </span>
            <div>
              <div className="milestone-label">{m.label}</div>
              <div className="dl-mono milestone-date">
                {formatMonthYear(addMonths(today, m.month))}
              </div>
            </div>
          </GlassCard>
        ))}
      </div>

      {/* Gantt timeline */}
      <GlassCard className="timeline-card">
        <div className="timeline">
          {/* full-height overlay: year gridlines + labels, milestones, selection */}
          <div className="timeline-grid" ref={plotRef} onClick={onPlotClick}>
            {yearMarks.map((m) => (
              <div key={m} className="year-mark" style={{ left: pct(m) }}>
                <span className="year-label dl-mono">
                  {isMobile
                    ? `'${String(addMonths(today, m).getFullYear()).slice(2)}`
                    : formatMonthYear(addMonths(today, m))}
                </span>
              </div>
            ))}
            {milestones.map((m) => (
              <div
                key={m.kind}
                className={`milestone-line ${m.kind}`}
                style={{ left: pct(m.month) }}
              />
            ))}
            {selected != null && (
              <div className="select-line" style={{ left: pct(selected) }} />
            )}
          </div>

          {/* debt bars */}
          <div className="timeline-bars">
            {orderedDebts.map((d, i) => {
              const payoff = plan.payoffMonthByDebt[d.id] ?? plan.months;
              return (
                <div className="bar-row" key={d.id}>
                  <div className="bar-label">
                    <span className="debt-dot" style={{ background: debtColorVar[d.type] }} />
                    <span className="bar-name">{d.name}</span>
                  </div>
                  <div className="bar-track">
                    <motion.div
                      className="bar-fill"
                      style={{ background: debtColorVar[d.type] }}
                      initial={{ width: 0 }}
                      animate={{ width: pct(payoff) }}
                      transition={{ duration: 0.6, delay: i * 0.06, ease: [0.16, 1, 0.3, 1] }}
                    >
                      <span className="bar-payoff dl-mono">
                        {formatMonthYear(addMonths(today, payoff))}
                      </span>
                    </motion.div>
                    <span
                      className="bar-cap"
                      style={{ left: pct(payoff), color: debtColorVar[d.type] }}
                    >
                      <CheckIcon width={12} height={12} />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <p className="timeline-hint dl-muted">Tap anywhere on the timeline to inspect a month.</p>
      </GlassCard>

      {/* Selected-month detail */}
      {selectedPoint && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <GlassCard className="month-detail">
            <div className="month-detail-head">
              <h3 className="dl-heading">
                {formatMonthYear(addMonths(today, selected!))}
              </h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setSelected(null)}>
                Clear
              </button>
            </div>
            <div className="month-detail-stats">
              <Stat label="Total balance" value={formatCurrency(selectedPoint.totalBalance)} />
              <Stat label="Minimums due" value={formatCurrency(minDueAtSelected)} />
              <Stat label="Debts still active" value={String(activeAtSelected.length)} />
            </div>
            {activeAtSelected.length > 0 ? (
              <div className="month-active-list">
                {activeAtSelected.map((d) => (
                  <span key={d.id} className="active-chip" style={{ color: debtColorVar[d.type] }}>
                    <span className="debt-dot" style={{ background: debtColorVar[d.type] }} />
                    {d.name}
                  </span>
                ))}
              </div>
            ) : (
              <p className="month-freedom">
                <CheckIcon width={16} height={16} />
                Every debt is paid off by this month.
              </p>
            )}
          </GlassCard>
        </motion.div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="stat-card" style={{ padding: 0 }}>
      <span className="stat-label">{label}</span>
      <span className="stat-value dl-mono">{value}</span>
    </div>
  );
}
