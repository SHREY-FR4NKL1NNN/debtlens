import { GlassCard } from './GlassCard';
import { ProgressBar } from './ProgressBar';
import { CountUp } from './CountUp';
import { debtColorVar, debtTypeLabel } from '../lib/colors';
import { percentPaid } from '../lib/finance';
import { formatCurrency, formatPercent } from '../lib/format';
import type { Debt } from '../types';

interface Props {
  debt: Debt;
  onClick?: () => void;
  countUp?: boolean;
}

export function DebtCard({ debt, onClick, countUp = false }: Props) {
  const color = debtColorVar[debt.type];
  const pct = percentPaid(debt);

  return (
    <GlassCard
      hover={!!onClick}
      onClick={onClick}
      className="debt-card"
      style={{ borderTop: `3px solid ${color}` }}
    >
      <div className="debt-card-head">
        <div className="debt-card-title">
          <span className="debt-dot" style={{ background: color }} />
          <span className="debt-name">{debt.name}</span>
        </div>
        <span className="pill debt-type-pill" style={{ color, background: 'transparent' }}>
          {debtTypeLabel[debt.type]}
        </span>
      </div>

      <div className="debt-balance dl-mono">
        {countUp ? (
          <CountUp value={debt.balance} format={(n) => formatCurrency(n)} />
        ) : (
          formatCurrency(debt.balance)
        )}
      </div>

      <div className="debt-meta">
        <div className="debt-meta-item">
          <span className="dl-label dl-muted">APR</span>
          <span className="dl-mono">{formatPercent(debt.apr)}</span>
        </div>
        <div className="debt-meta-item">
          <span className="dl-label dl-muted">Min / mo</span>
          <span className="dl-mono">{formatCurrency(debt.minimumPayment)}</span>
        </div>
      </div>

      {pct !== null && (
        <div className="debt-progress">
          <div className="debt-progress-label">
            <span className="dl-label dl-muted">Paid off</span>
            <span className="dl-mono" style={{ color }}>
              {formatPercent(pct, 0)}
            </span>
          </div>
          <ProgressBar value={pct} color={color} />
        </div>
      )}
    </GlassCard>
  );
}
