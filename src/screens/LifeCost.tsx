import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDebts } from '../state/DebtContext';
import { PageHeader } from '../components/PageHeader';
import { GlassCard } from '../components/GlassCard';
import { EmptyState } from '../components/EmptyState';
import { CountUp } from '../components/CountUp';
import { LifeIcon } from '../components/icons';
import { standaloneInterest } from '../lib/finance';
import { debtColorVar, debtTypeLabel } from '../lib/colors';
import { formatCurrency } from '../lib/format';
import type { Debt } from '../types';
import './screens.css';
import './LifeCost.css';

// Reference costs for the human-terms translation.
const GROCERIES_PER_MONTH = 400;
const STREAMING_PER_MONTH = 15.99;
const FLIGHT = 350;
const JAPAN_TRIP = 1800;
const HOURS_PER_MONTH = 173.3; // full-time month

type Lens = 'time' | 'experiences' | 'dollars';

export function LifeCost() {
  const { debts, profile, setProfile } = useDebts();
  const navigate = useNavigate();
  const [lens, setLens] = useState<Lens>('experiences');
  const [incomeDraft, setIncomeDraft] = useState('');
  const [incomeMode, setIncomeMode] = useState<'hourly' | 'monthly'>('hourly');

  const interestByDebt = useMemo(() => {
    const map: Record<string, number> = {};
    for (const d of debts) map[d.id] = standaloneInterest(d);
    return map;
  }, [debts]);

  const totalInterest = useMemo(
    () => Object.values(interestByDebt).reduce((s, v) => s + v, 0),
    [interestByDebt],
  );

  const hourly = profile.hourlyIncome
    ? profile.hourlyIncome
    : profile.monthlyIncome
      ? profile.monthlyIncome / HOURS_PER_MONTH
      : null;

  const saveIncome = () => {
    const v = parseFloat(incomeDraft.replace(/[^0-9.]/g, ''));
    if (!Number.isFinite(v) || v <= 0) return;
    setProfile(
      incomeMode === 'hourly' ? { hourlyIncome: v } : { monthlyIncome: v },
    );
    setIncomeDraft('');
  };

  if (!debts.length) {
    return (
      <EmptyState
        icon={<LifeIcon width={40} height={40} />}
        title="What is your debt really costing you?"
        body="Add your debts to translate interest into the things you actually feel — months of groceries, trips you could take, and hours of your life."
        action={
          <button className="btn btn-primary btn-lg" onClick={() => navigate('/debts')}>
            Add debts
          </button>
        }
      />
    );
  }

  const hoursOfLife = hourly ? totalInterest / hourly : null;

  return (
    <div className="lifecost">
      <PageHeader
        title="The human cost"
        subtitle="Interest isn't just a number. Here's what it costs in the currency of your actual life."
      />

      {/* Hero statement */}
      <GlassCard className="life-hero">
        {hoursOfLife != null ? (
          <>
            <p className="life-hero-lead dl-label">Your debt will cost you</p>
            <div className="life-hero-number dl-display">
              <CountUp value={hoursOfLife} format={(n) => `${Math.round(n).toLocaleString()}`} />
              <span className="life-hero-unit"> hours of your life</span>
            </div>
            <p className="life-hero-sub dl-label">
              That's {formatCurrency(totalInterest)} in interest — roughly{' '}
              {Math.round(hoursOfLife / HOURS_PER_MONTH)} months of full-time work, gone.
            </p>
            <button
              className="btn btn-ghost btn-sm life-edit-income"
              onClick={() => setProfile({})}
            >
              Change income
            </button>
          </>
        ) : (
          <div className="income-setup">
            <p className="life-hero-lead dl-label">One-time setup</p>
            <h3 className="dl-heading">Tell us your income to see debt in hours of life</h3>
            <div className="income-form">
              <select
                className="select income-mode"
                value={incomeMode}
                onChange={(e) => setIncomeMode(e.target.value as 'hourly' | 'monthly')}
              >
                <option value="hourly">Hourly</option>
                <option value="monthly">Monthly</option>
              </select>
              <input
                className="input"
                inputMode="decimal"
                placeholder={incomeMode === 'hourly' ? '$28 / hour' : '$4,800 / month'}
                value={incomeDraft}
                onChange={(e) => setIncomeDraft(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && saveIncome()}
              />
              <button className="btn btn-primary" onClick={saveIncome}>
                Save
              </button>
            </div>
            <p className="dl-muted life-hero-sub">
              Stored locally, used only to translate interest into time.
            </p>
          </div>
        )}
      </GlassCard>

      {/* Lens toggle */}
      <div className="lens-toggle">
        {(['time', 'experiences', 'dollars'] as Lens[]).map((l) => (
          <button
            key={l}
            className={`lens-btn ${lens === l ? 'active' : ''}`}
            onClick={() => setLens(l)}
          >
            {l === 'time' ? 'In time' : l === 'experiences' ? 'In experiences' : 'In dollars'}
          </button>
        ))}
      </div>

      {/* Per-debt grid */}
      <div className="debt-grid stagger">
        {debts.map((d) => (
          <LifeCard
            key={d.id}
            debt={d}
            interest={interestByDebt[d.id]}
            lens={lens}
            hourly={hourly}
          />
        ))}
      </div>
    </div>
  );
}

function LifeCard({
  debt,
  interest,
  lens,
  hourly,
}: {
  debt: Debt;
  interest: number;
  lens: Lens;
  hourly: number | null;
}) {
  const color = debtColorVar[debt.type];
  const rows = translate(interest, lens, hourly);
  return (
    <GlassCard className="life-card" style={{ borderTop: `3px solid ${color}` }}>
      <div className="life-card-head">
        <span className="debt-dot" style={{ background: color }} />
        <span className="debt-name">{debt.name}</span>
        <span className="pill debt-type-pill" style={{ color, background: 'transparent' }}>
          {debtTypeLabel[debt.type]}
        </span>
      </div>
      <div className="life-card-interest">
        <span className="dl-label dl-muted">Interest wasted</span>
        <span className="dl-mono life-interest-value">
          <CountUp value={interest} format={(n) => formatCurrency(n)} />
        </span>
      </div>
      <ul className="life-equivs">
        {rows.map((r) => (
          <li key={r.label} className="life-equiv">
            <span className="life-equiv-dot" style={{ background: color }} />
            <span className="life-equiv-value dl-mono">{r.value}</span>
            <span className="life-equiv-label dl-label">{r.label}</span>
          </li>
        ))}
      </ul>
    </GlassCard>
  );
}

interface Equiv {
  value: string;
  label: string;
}

function translate(interest: number, lens: Lens, hourly: number | null): Equiv[] {
  if (lens === 'dollars') {
    return [
      { value: formatCurrency(interest), label: 'straight out of pocket' },
      { value: formatCurrency(interest / 12), label: 'per month for a year' },
      { value: formatCurrency(interest / 5), label: 'a year for 5 years' },
    ];
  }
  if (lens === 'time') {
    const hours = hourly ? interest / hourly : null;
    return [
      {
        value: hours ? `${Math.round(hours).toLocaleString()} hrs` : 'set income',
        label: 'of your life at work',
      },
      {
        value: hours ? `${Math.round(hours / 40)} wks` : '—',
        label: 'of full-time salary',
      },
      {
        value: hours ? `${(hours / HOURS_PER_MONTH).toFixed(1)} mo` : '—',
        label: 'of working life',
      },
    ];
  }
  // experiences
  return [
    { value: `${Math.round(interest / GROCERIES_PER_MONTH)} mo`, label: 'of groceries' },
    { value: `${Math.floor(interest / FLIGHT)}`, label: 'round-trip flights' },
    { value: `${(interest / JAPAN_TRIP).toFixed(1)}`, label: 'trips to Japan' },
    { value: `${Math.round(interest / STREAMING_PER_MONTH)} mo`, label: 'of streaming' },
  ];
}
