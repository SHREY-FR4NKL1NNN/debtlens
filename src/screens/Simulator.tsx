import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
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
import { ExplanationPanel } from '../components/ExplanationPanel';
import { useExplanation } from '../hooks/useExplanation';
import { useDebounce } from '../hooks/useDebounce';
import { SimulateIcon } from '../components/icons';
import { runScenario } from '../lib/finance';
import { buildScenarioPrompt } from '../lib/localmind';
import {
  formatCurrency,
  formatCurrencyShort,
  formatMonthYear,
  pluralMonths,
} from '../lib/format';
import './screens.css';
import './Simulator.css';

const PLAN = 'avalanche' as const;

export function Simulator() {
  const { debts } = useDebts();
  const navigate = useNavigate();
  const explain = useExplanation();

  const [extra, setExtra] = useState(0);
  const [windfall, setWindfall] = useState(0);
  const [windfallDebtId, setWindfallDebtId] = useState<string>('');

  // 150ms debounce so the chart feels responsive but not jittery (spec).
  const dExtra = useDebounce(extra, 150);
  const dWindfall = useDebounce(windfall, 150);
  const dWindfallDebt = useDebounce(windfallDebtId, 150);

  const scenario = useMemo(() => {
    if (!debts.length) return null;
    return runScenario(debts, PLAN, dExtra, {
      amount: dWindfall,
      debtId: dWindfallDebt || undefined,
    });
  }, [debts, dExtra, dWindfall, dWindfallDebt]);

  // Fire the AI explanation when the user settles for ~2s on a real change.
  const settled = useDebounce({ extra: dExtra, windfall: dWindfall }, 2000);
  const lastPrompt = useRef('');
  useEffect(() => {
    if (!scenario) return;
    if (settled.extra <= 0 && settled.windfall <= 0) return;
    if (settled.extra !== dExtra || settled.windfall !== dWindfall) return; // still moving
    const prompt = buildScenarioPrompt({
      extra: formatCurrency(settled.extra),
      monthsEarlier: scenario.monthsSaved,
      interestSaved: formatCurrency(scenario.interestSaved),
    });
    if (prompt !== lastPrompt.current) {
      lastPrompt.current = prompt;
      explain.run(prompt);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settled]);

  const chartData = useMemo(() => {
    if (!scenario) return [];
    const maxMonths = Math.max(scenario.base.months, scenario.scenario.months);
    const rows: Record<string, number>[] = [];
    for (let m = 0; m <= maxMonths; m++) {
      rows.push({
        month: m,
        current: scenario.base.schedule[m]?.totalBalance ?? 0,
        scenario: scenario.scenario.schedule[m]?.totalBalance ?? 0,
      });
    }
    return rows;
  }, [scenario]);

  if (!debts.length) {
    return (
      <EmptyState
        icon={<SimulateIcon width={40} height={40} />}
        title="Model your what-ifs"
        body="Add your debts and then drag a slider to see how extra payments or a windfall reshape your entire payoff timeline."
        action={
          <button className="btn btn-primary btn-lg" onClick={() => navigate('/debts')}>
            Add debts
          </button>
        }
      />
    );
  }

  return (
    <div className="simulator">
      <PageHeader
        title="Scenario simulator"
        subtitle="Drag to add extra to every month, or drop in a one-time windfall. Everything updates live."
      />

      {/* Controls */}
      <GlassCard className="sim-controls">
        <div className="sim-control">
          <div className="sim-control-head">
            <label htmlFor="extra">Extra monthly payment</label>
            <span className="sim-control-value dl-mono">{formatCurrency(extra)}/mo</span>
          </div>
          <input
            id="extra"
            type="range"
            className="slider"
            min={0}
            max={1000}
            step={10}
            value={extra}
            onChange={(e) => setExtra(Number(e.target.value))}
            style={{ ['--fill' as string]: `${(extra / 1000) * 100}%` }}
          />
          <div className="slider-scale dl-muted">
            <span>$0</span>
            <span>$500</span>
            <span>$1,000</span>
          </div>
        </div>

        <div className="sim-divider" />

        <div className="sim-control">
          <div className="sim-control-head">
            <label htmlFor="windfall">One-time windfall</label>
            <span className="sim-control-value dl-mono">{formatCurrency(windfall)}</span>
          </div>
          <div className="windfall-row">
            <input
              id="windfall"
              type="number"
              className="input"
              min={0}
              step={100}
              placeholder="0"
              value={windfall || ''}
              onChange={(e) => setWindfall(Math.max(0, Number(e.target.value)))}
            />
            <select
              className="select"
              value={windfallDebtId}
              onChange={(e) => setWindfallDebtId(e.target.value)}
              aria-label="Apply windfall to"
            >
              <option value="">Auto (attack order)</option>
              {debts.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </GlassCard>

      {/* Live stat cards */}
      <div className="sim-stats">
        <GlassCard className="stat-card">
          <span className="stat-label">Months saved</span>
          <span className="stat-value accent">
            <CountUp
              value={scenario?.monthsSaved ?? 0}
              format={(n) => `${Math.round(n)}`}
            />
            <span className="stat-unit"> mo</span>
          </span>
          <span className="stat-sub">
            {scenario ? pluralMonths(scenario.monthsSaved) + ' off your timeline' : ''}
          </span>
        </GlassCard>

        <GlassCard className="stat-card">
          <span className="stat-label">Interest saved</span>
          <span className="stat-value accent">
            <CountUp
              value={scenario?.interestSaved ?? 0}
              format={(n) => formatCurrency(n)}
            />
          </span>
          <span className="stat-sub">vs paying minimums only</span>
        </GlassCard>

        <GlassCard className="stat-card">
          <span className="stat-label">New payoff date</span>
          <span className="stat-value dl-mono">
            {scenario ? formatMonthYear(scenario.scenario.payoffDate) : '—'}
          </span>
          <span className="stat-sub">
            {scenario ? `was ${formatMonthYear(scenario.base.payoffDate)}` : ''}
          </span>
        </GlassCard>
      </div>

      {/* Live chart */}
      <GlassCard className="chart-card">
        <h3 className="chart-title">Payoff timeline</h3>
        <p className="chart-sub">Current plan vs your scenario.</p>
        <div className="chart-box">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
              <defs>
                <linearGradient id="grad-current" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#A1A1AA" stopOpacity={0.2} />
                  <stop offset="100%" stopColor="#A1A1AA" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="grad-scenario" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#16A34A" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#16A34A" stopOpacity={0} />
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
                dataKey="current"
                name="Current plan"
                stroke="#A1A1AA"
                strokeWidth={2}
                strokeDasharray="4 4"
                fill="url(#grad-current)"
                dot={false}
                isAnimationActive={false}
              />
              <Area
                type="monotone"
                dataKey="scenario"
                name="Your scenario"
                stroke="#16A34A"
                strokeWidth={2.5}
                fill="url(#grad-scenario)"
                dot={false}
                animationDuration={250}
                animationEasing="ease-out"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </GlassCard>

      <ExplanationPanel {...explain} title="Is this a smart move?" />
    </div>
  );
}
