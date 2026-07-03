import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { useDebts } from '../state/DebtContext';
import { PageHeader } from '../components/PageHeader';
import { GlassCard } from '../components/GlassCard';
import { EmptyState } from '../components/EmptyState';
import { ChartTooltip } from '../components/ChartTooltip';
import { ExplanationPanel } from '../components/ExplanationPanel';
import { useExplanation } from '../hooks/useExplanation';
import { StrategyIcon, SparkIcon, ChevronDown, TargetIcon } from '../components/icons';
import { runAllStrategies, summarize } from '../lib/finance';
import { buildStrategyPrompt as buildPrompt } from '../lib/localmind';
import { STRATEGIES, type StrategyKind } from '../types';
import { strategyColorHex, strategyColorVar } from '../lib/colors';
import {
  formatCurrency,
  formatCurrencyShort,
  formatMonthYear,
  formatDuration,
} from '../lib/format';
import './screens.css';
import './Strategy.css';

export function Strategy() {
  const { debts } = useDebts();
  const navigate = useNavigate();
  const explain = useExplanation();
  const [showWhy, setShowWhy] = useState(false);

  const summary = useMemo(() => summarize(debts), [debts]);
  const results = useMemo(
    () => (debts.length ? runAllStrategies(debts, 0) : null),
    [debts],
  );

  const chartData = useMemo(() => {
    if (!results) return [];
    const maxMonths = Math.max(
      results.snowball.months,
      results.avalanche.months,
      results.optimal.months,
    );
    const rows: Record<string, number>[] = [];
    for (let m = 0; m <= maxMonths; m++) {
      rows.push({
        month: m,
        snowball: results.snowball.schedule[m]?.totalBalance ?? 0,
        avalanche: results.avalanche.schedule[m]?.totalBalance ?? 0,
        optimal: results.optimal.schedule[m]?.totalBalance ?? 0,
      });
    }
    return rows;
  }, [results]);

  if (!results) {
    return (
      <EmptyState
        icon={<StrategyIcon width={40} height={40} />}
        title="Nothing to compare yet"
        body="Add a couple of debts and DebtLens will pit snowball, avalanche, and the optimal plan against each other."
        action={
          <button className="btn btn-primary btn-lg" onClick={() => navigate('/debts')}>
            Add debts
          </button>
        }
      />
    );
  }

  const debtName = (id: string | null) =>
    debts.find((d) => d.id === id)?.name ?? '—';

  const interestSaved =
    results.snowball.totalInterest - results.avalanche.totalInterest;
  const monthsDiff = results.avalanche.months - results.snowball.months;

  const onExplain = () => {
    explain.run(
      buildPrompt({
        debtCount: debts.length,
        totalBalance: formatCurrency(summary.totalBalance),
        interestSaved: formatCurrency(Math.abs(interestSaved)),
        monthsDiff,
      }),
    );
  };

  return (
    <div className="strategy-screen">
      <PageHeader
        title="Strategy comparison"
        subtitle="Three ways to attack the same debt, paying the same total each month. The math, side by side."
      />

      {/* Strategy cards */}
      <div className="strategy-grid stagger">
        {STRATEGIES.map(({ kind, label, blurb }) => {
          const r = results[kind];
          const isBest = kind === bestStrategy(results);
          return (
            <GlassCard
              key={kind}
              className="strategy-card"
              style={{ borderTop: `3px solid ${strategyColorVar[kind]}` }}
            >
              <div className="strategy-card-head">
                <div>
                  <h3 className="strategy-name" style={{ color: strategyColorVar[kind] }}>
                    {label}
                  </h3>
                  <p className="dl-label dl-muted">{blurb}</p>
                </div>
                {isBest && (
                  <span className="best-badge">
                    <TargetIcon width={13} height={13} /> Least interest
                  </span>
                )}
              </div>

              <dl className="strategy-figures">
                <Figure label="Debt-free by" value={formatMonthYear(r.payoffDate)} />
                <Figure label="Time to freedom" value={formatDuration(r.months)} />
                <Figure
                  label="Total interest"
                  value={formatCurrency(r.totalInterest)}
                  danger
                />
                <Figure label="Attack first" value={debtName(r.nextPriorityDebtId)} mono={false} />
              </dl>

              <button className="btn btn-ghost btn-sm explain-trigger" onClick={onExplain}>
                <SparkIcon width={14} height={14} /> Explain this to me
              </button>
            </GlassCard>
          );
        })}
      </div>

      {/* Streaming AI explanation */}
      <ExplanationPanel {...explain} title="Snowball vs avalanche — explained" />

      {/* Unified chart */}
      <GlassCard className="chart-card section">
        <h3 className="chart-title">Balance over time</h3>
        <p className="chart-sub">
          How fast each strategy melts your total balance to zero.
        </p>
        <div className="chart-box">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
              <defs>
                {(['snowball', 'avalanche', 'optimal'] as StrategyKind[]).map((k) => (
                  <linearGradient key={k} id={`grad-${k}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={strategyColorHex[k]} stopOpacity={0.25} />
                    <stop offset="100%" stopColor={strategyColorHex[k]} stopOpacity={0} />
                  </linearGradient>
                ))}
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
              <Legend
                formatter={(v) => <span style={{ color: 'var(--dl-text-secondary)', fontSize: 13 }}>{cap(v)}</span>}
              />
              {(['snowball', 'avalanche', 'optimal'] as StrategyKind[]).map((k) => (
                <Area
                  key={k}
                  type="monotone"
                  dataKey={k}
                  name={k}
                  stroke={strategyColorHex[k]}
                  strokeWidth={2}
                  fill={`url(#grad-${k})`}
                  isAnimationActive
                  animationDuration={600}
                  animationEasing="ease-out"
                  dot={false}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </GlassCard>

      {/* Why these differ — templated, no AI */}
      <GlassCard className="why-card">
        <button className="why-toggle" onClick={() => setShowWhy((s) => !s)}>
          <span>Why these differ</span>
          <motion.span animate={{ rotate: showWhy ? 180 : 0 }} transition={{ duration: 0.2 }}>
            <ChevronDown width={18} height={18} />
          </motion.span>
        </button>
        <AnimatePresence initial={false}>
          {showWhy && (
            <motion.div
              className="why-body"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            >
              <WhyCopy
                results={results}
                interestSaved={interestSaved}
                monthsDiff={monthsDiff}
                highestAprDebt={debtName(results.avalanche.nextPriorityDebtId)}
                smallestDebt={debtName(results.snowball.nextPriorityDebtId)}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </GlassCard>
    </div>
  );
}

function Figure({
  label,
  value,
  danger,
  mono = true,
}: {
  label: string;
  value: string;
  danger?: boolean;
  mono?: boolean;
}) {
  return (
    <div className="strategy-figure">
      <dt className="dl-label dl-muted">{label}</dt>
      <dd
        className={mono ? 'dl-mono' : ''}
        style={{ color: danger ? 'var(--dl-danger)' : 'var(--dl-text-primary)', fontWeight: 600 }}
      >
        {value}
      </dd>
    </div>
  );
}

function WhyCopy({
  results,
  interestSaved,
  monthsDiff,
  highestAprDebt,
  smallestDebt,
}: {
  results: ReturnType<typeof runAllStrategies>;
  interestSaved: number;
  monthsDiff: number;
  highestAprDebt: string;
  smallestDebt: string;
}) {
  const saved = Math.abs(interestSaved);
  const faster = monthsDiff < 0;
  return (
    <div className="why-copy">
      <p>
        <strong>Snowball</strong> attacks your <em>smallest balance</em> first
        ({smallestDebt}). You clear whole debts quickly, which feels great — but you
        leave your most expensive interest running longer.
      </p>
      <p>
        <strong>Avalanche</strong> attacks your <em>highest APR</em> first
        ({highestAprDebt}). Every extra dollar kills your priciest interest, so you
        pay <strong style={{ color: 'var(--dl-accent)' }}>{formatCurrency(saved)} less
        interest</strong> overall
        {faster
          ? ` and finish ${Math.abs(monthsDiff)} months sooner`
          : monthsDiff > 0
            ? ` (about ${monthsDiff} months longer)`
            : ''}
        .
      </p>
      <p>
        <strong>Optimal</strong> is what a computer picks when told simply “lose the
        least money.” It searches every attack order and lands on{' '}
        {formatCurrency(results.optimal.totalInterest)} of total interest —
        {results.optimal.totalInterest <= results.avalanche.totalInterest + 0.5
          ? ' here it matches avalanche, confirming avalanche is mathematically hard to beat.'
          : ' a custom order that edges out the textbook strategies.'}
      </p>
    </div>
  );
}

// avalanche/optimal minimize interest — pick the lowest-interest as "best".
function bestStrategy(results: ReturnType<typeof runAllStrategies>): StrategyKind {
  const entries: [StrategyKind, number][] = [
    ['snowball', results.snowball.totalInterest],
    ['avalanche', results.avalanche.totalInterest],
    ['optimal', results.optimal.totalInterest],
  ];
  entries.sort((a, b) => a[1] - b[1]);
  return entries[0][0];
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
