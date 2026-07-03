// Core domain types for DebtLens.

export type DebtType = 'credit' | 'student' | 'auto' | 'personal' | 'other';

export const DEBT_TYPES: { value: DebtType; label: string }[] = [
  { value: 'credit', label: 'Credit Card' },
  { value: 'student', label: 'Student Loan' },
  { value: 'auto', label: 'Auto' },
  { value: 'personal', label: 'Personal' },
  { value: 'other', label: 'Other' },
];

export interface Debt {
  id: string;
  name: string;
  type: DebtType;
  balance: number;
  apr: number; // annual percentage rate, e.g. 18.99
  minimumPayment: number;
  originalBalance?: number; // optional, for the % paid-off progress bar
}

export type StrategyKind = 'snowball' | 'avalanche' | 'optimal';

export const STRATEGIES: { kind: StrategyKind; label: string; blurb: string }[] = [
  { kind: 'snowball', label: 'Snowball', blurb: 'Smallest balance first' },
  { kind: 'avalanche', label: 'Avalanche', blurb: 'Highest APR first' },
  { kind: 'optimal', label: 'Optimal', blurb: 'Least interest, fastest' },
];

// A monthly balance-tracking update the user logs on Screen 7.
export interface ProgressEntry {
  id: string;
  date: string; // ISO date
  balances: Record<string, number>; // debtId -> balance reported that month
  totalBalance: number;
}

export interface UserProfile {
  hourlyIncome?: number;
  monthlyIncome?: number;
}
