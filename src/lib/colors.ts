import type { DebtType, StrategyKind } from '../types';

// Maps to the design-system CSS variables (source of truth).
export const debtColorVar: Record<DebtType, string> = {
  credit: 'var(--dl-credit)',
  student: 'var(--dl-student)',
  auto: 'var(--dl-auto)',
  personal: 'var(--dl-personal)',
  other: 'var(--dl-other)',
};

// Raw hex — for Recharts, which needs concrete colors (not CSS vars) in SVG.
export const debtColorHex: Record<DebtType, string> = {
  credit: '#7C3AED',
  student: '#0284C7',
  auto: '#EA580C',
  personal: '#0D9488',
  other: '#6B7280',
};

export const strategyColorVar: Record<StrategyKind, string> = {
  snowball: 'var(--dl-snowball)',
  avalanche: 'var(--dl-avalanche)',
  optimal: 'var(--dl-optimal)',
};

export const strategyColorHex: Record<StrategyKind, string> = {
  snowball: '#2563EB',
  avalanche: '#16A34A',
  optimal: '#7C3AED',
};

export const debtTypeLabel: Record<DebtType, string> = {
  credit: 'Credit Card',
  student: 'Student Loan',
  auto: 'Auto Loan',
  personal: 'Personal Loan',
  other: 'Other',
};
