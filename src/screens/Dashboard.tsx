import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useDebts } from '../state/DebtContext';
import { GlassCard } from '../components/GlassCard';
import { CountUp } from '../components/CountUp';
import { DebtCard } from '../components/DebtCard';
import { EmptyState } from '../components/EmptyState';
import { PlusIcon, StrategyIcon, SimulateIcon, ChevronRight, DebtsIcon } from '../components/icons';
import { runStrategy, summarize } from '../lib/finance';
import { formatCurrency, formatMonthYear, formatDuration } from '../lib/format';
import './screens.css';
import './Dashboard.css';

export function Dashboard() {
  const { debts, loaded } = useDebts();
  const navigate = useNavigate();

  const summary = useMemo(() => summarize(debts), [debts]);
  const baseline = useMemo(
    () => (debts.length ? runStrategy(debts, 'avalanche', 0) : null),
    [debts],
  );

  if (loaded && debts.length === 0) {
    return (
      <EmptyState
        icon={<DebtsIcon width={40} height={40} />}
        title="See your whole debt picture"
        body="Add your first debt to unlock strategy comparisons, scenario modeling, and your personal payoff timeline."
        action={
          <button className="btn btn-primary btn-lg" onClick={() => navigate('/debts')}>
            <PlusIcon width={18} height={18} /> Add your first debt
          </button>
        }
      />
    );
  }

  return (
    <div className="dashboard">
      {/* Hero */}
      <motion.section
        className="hero"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      >
        <p className="hero-eyebrow dl-label">Total debt remaining</p>
        <div className="hero-number dl-display">
          <CountUp value={summary.totalBalance} format={(n) => formatCurrency(n)} />
        </div>

        <div className="hero-stats">
          <div className="hero-stat">
            <span className="dl-label dl-muted">Debt-free by</span>
            <span className="dl-mono hero-stat-value">
              {baseline ? formatMonthYear(baseline.payoffDate) : '—'}
            </span>
            <span className="hero-stat-sub dl-muted">
              {baseline ? formatDuration(baseline.months) : ''}
            </span>
          </div>
          <div className="hero-divider" />
          <div className="hero-stat">
            <span className="dl-label dl-muted">Interest remaining</span>
            <span className="dl-mono hero-stat-value" style={{ color: 'var(--dl-danger)' }}>
              {baseline ? (
                <CountUp value={baseline.totalInterest} format={(n) => formatCurrency(n)} />
              ) : (
                '—'
              )}
            </span>
            <span className="hero-stat-sub dl-muted">if you pay minimums</span>
          </div>
          <div className="hero-divider" />
          <div className="hero-stat">
            <span className="dl-label dl-muted">Monthly minimum</span>
            <span className="dl-mono hero-stat-value">
              {formatCurrency(summary.totalMinimum)}
            </span>
            <span className="hero-stat-sub dl-muted">across {debts.length} debts</span>
          </div>
        </div>
      </motion.section>

      {/* Debt breakdown */}
      <section className="section">
        <div className="section-head">
          <h2 className="section-label">Your debts</h2>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/debts')}>
            <PlusIcon width={15} height={15} /> Add debt
          </button>
        </div>
        <div className="debt-grid stagger">
          {debts.map((d) => (
            <DebtCard key={d.id} debt={d} countUp onClick={() => navigate('/debts')} />
          ))}
        </div>
      </section>

      {/* CTA cards */}
      <section className="cta-grid">
        <GlassCard hover className="cta-card" onClick={() => navigate('/strategy')}>
          <div className="cta-icon" style={{ background: 'var(--dl-avalanche)' }}>
            <StrategyIcon width={22} height={22} />
          </div>
          <div className="cta-text">
            <h3 className="cta-title">Run strategy comparison</h3>
            <p className="dl-label">Snowball vs avalanche vs the mathematically optimal plan.</p>
          </div>
          <ChevronRight width={20} height={20} className="cta-arrow" />
        </GlassCard>

        <GlassCard hover className="cta-card" onClick={() => navigate('/simulate')}>
          <div className="cta-icon" style={{ background: 'var(--dl-optimal)' }}>
            <SimulateIcon width={22} height={22} />
          </div>
          <div className="cta-text">
            <h3 className="cta-title">Simulate a scenario</h3>
            <p className="dl-label">Add extra payments or a windfall and watch the ripple effect.</p>
          </div>
          <ChevronRight width={20} height={20} className="cta-arrow" />
        </GlassCard>
      </section>
    </div>
  );
}
