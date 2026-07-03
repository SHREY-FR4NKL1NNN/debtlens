import { useState } from 'react';
import { motion } from 'framer-motion';
import { useDebts } from '../state/DebtContext';
import { PageHeader } from '../components/PageHeader';
import { GlassCard } from '../components/GlassCard';
import { EmptyState } from '../components/EmptyState';
import { DebtDrawer } from '../components/DebtDrawer';
import { PlusIcon, EditIcon, TrashIcon, DebtsIcon } from '../components/icons';
import { debtColorVar, debtTypeLabel } from '../lib/colors';
import { formatCurrency, formatPercent } from '../lib/format';
import type { Debt } from '../types';
import './screens.css';
import './Debts.css';

export function Debts() {
  const { debts, addDebt, updateDebt, deleteDebt } = useDebts();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Debt | null>(null);

  const openAdd = () => {
    setEditing(null);
    setOpen(true);
  };
  const openEdit = (d: Debt) => {
    setEditing(d);
    setOpen(true);
  };
  const onSave = (data: Omit<Debt, 'id'>) => {
    if (editing) updateDebt(editing.id, data);
    else addDebt(data);
  };

  return (
    <div>
      <PageHeader
        title="Manage debts"
        subtitle="Add, edit, or import your debts. Everything else in DebtLens builds on this."
        action={
          debts.length > 0 && (
            <button className="btn btn-primary" onClick={openAdd}>
              <PlusIcon width={17} height={17} /> Add debt
            </button>
          )
        }
      />

      {debts.length === 0 ? (
        <EmptyState
          icon={<DebtsIcon width={40} height={40} />}
          title="No debts yet"
          body="Add a debt manually, or import a credit-card statement PDF and we'll pull out the balance, APR, and minimum payment for you."
          action={
            <button className="btn btn-primary btn-lg" onClick={openAdd}>
              <PlusIcon width={18} height={18} /> Add your first debt
            </button>
          }
        />
      ) : (
        <div className="debt-list stagger">
          {debts.map((d) => (
            <GlassCard
              key={d.id}
              className="debt-row"
              style={{ borderLeft: `3px solid ${debtColorVar[d.type]}` }}
            >
              <div className="debt-row-main">
                <span className="debt-dot" style={{ background: debtColorVar[d.type] }} />
                <div className="debt-row-id">
                  <span className="debt-name">{d.name}</span>
                  <span className="dl-label dl-muted">{debtTypeLabel[d.type]}</span>
                </div>
              </div>
              <div className="debt-row-figures">
                <Figure label="Balance" value={formatCurrency(d.balance)} />
                <Figure label="APR" value={formatPercent(d.apr)} />
                <Figure label="Min / mo" value={formatCurrency(d.minimumPayment)} />
              </div>
              <div className="debt-row-actions">
                <button className="icon-btn" onClick={() => openEdit(d)} aria-label="Edit">
                  <EditIcon width={18} height={18} />
                </button>
                <button
                  className="icon-btn danger"
                  onClick={() => deleteDebt(d.id)}
                  aria-label="Delete"
                >
                  <TrashIcon width={18} height={18} />
                </button>
              </div>
            </GlassCard>
          ))}
        </div>
      )}

      <DebtDrawer open={open} editing={editing} onClose={() => setOpen(false)} onSave={onSave} />
    </div>
  );
}

function Figure({ label, value }: { label: string; value: string }) {
  return (
    <motion.div className="debt-figure">
      <span className="dl-label dl-muted">{label}</span>
      <span className="dl-mono">{value}</span>
    </motion.div>
  );
}
