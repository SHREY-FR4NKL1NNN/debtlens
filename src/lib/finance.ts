// DebtLens debt-payoff engine.
//
// Models a fixed monthly budget (sum of every debt's minimum payment + a
// constant extra) attacking debts in a strategy-defined order. Freed-up
// minimums roll into the budget as debts clear (the standard snowball/
// avalanche rollover assumption), so the total budget stays constant.
//
// - Snowball  = smallest balance first (motivational).
// - Avalanche = highest APR first (interest-optimal under a fixed budget).
// - Optimal   = the ordering that actually minimizes total interest, found by
//               search for small portfolios (ties broken by fewer months),
//               falling back to avalanche for large ones. With fixed APRs this
//               usually coincides with avalanche, but it is computed
//               independently so it stays correct for unusual portfolios.

import type { Debt, StrategyKind } from '../types';
import { addMonths } from './format';

const MAX_MONTHS = 1200; // 100-year guard against non-amortizing inputs.

export interface MonthPoint {
  month: number; // 0-based month index from today
  totalBalance: number;
  balances: Record<string, number>; // debtId -> remaining balance
  interestThisMonth: number;
}

export interface SimulationResult {
  months: number; // months until debt-free (MAX_MONTHS if it never amortizes)
  amortizes: boolean; // false when the budget can't cover interest
  totalInterest: number;
  totalPaid: number;
  payoffMonthByDebt: Record<string, number>; // debtId -> month it hit 0
  schedule: MonthPoint[]; // includes month 0 (starting balances)
  payoffDate: Date;
  order: string[]; // debt ids in attack order
}

export interface StrategyResult extends SimulationResult {
  kind: StrategyKind;
  // The debt to attack first (highest-priority active debt).
  nextPriorityDebtId: string | null;
}

export function monthlyRate(apr: number): number {
  return apr / 100 / 12;
}

// ------------------------------------------------------------- Ordering
export function orderSnowball(debts: Debt[]): string[] {
  return [...debts]
    .sort((a, b) => a.balance - b.balance || b.apr - a.apr)
    .map((d) => d.id);
}

export function orderAvalanche(debts: Debt[]): string[] {
  return [...debts]
    .sort((a, b) => b.apr - a.apr || a.balance - b.balance)
    .map((d) => d.id);
}

// Minimize total interest by search. For <= 7 debts we evaluate every
// ordering; beyond that we fall back to the avalanche ordering.
export function orderOptimal(debts: Debt[], extraMonthly: number): string[] {
  if (debts.length <= 1) return debts.map((d) => d.id);
  if (debts.length > 7) return orderAvalanche(debts);

  let best: string[] | null = null;
  let bestInterest = Infinity;
  let bestMonths = Infinity;

  const ids = debts.map((d) => d.id);
  permute(ids, (order) => {
    const sim = simulateOrder(debts, extraMonthly, order, 0);
    if (
      sim.totalInterest < bestInterest - 0.005 ||
      (Math.abs(sim.totalInterest - bestInterest) <= 0.005 &&
        sim.months < bestMonths)
    ) {
      bestInterest = sim.totalInterest;
      bestMonths = sim.months;
      best = order.slice();
    }
  });

  return best ?? orderAvalanche(debts);
}

function permute(arr: string[], visit: (order: string[]) => void): void {
  const n = arr.length;
  const used = new Array(n).fill(false);
  const cur: string[] = [];
  const rec = () => {
    if (cur.length === n) {
      visit(cur);
      return;
    }
    for (let i = 0; i < n; i++) {
      if (used[i]) continue;
      used[i] = true;
      cur.push(arr[i]);
      rec();
      cur.pop();
      used[i] = false;
    }
  };
  rec();
}

export function orderFor(
  debts: Debt[],
  kind: StrategyKind,
  extraMonthly: number,
): string[] {
  switch (kind) {
    case 'snowball':
      return orderSnowball(debts);
    case 'avalanche':
      return orderAvalanche(debts);
    case 'optimal':
      return orderOptimal(debts, extraMonthly);
  }
}

// ------------------------------------------------------------- Core sim
// Simulate paying `debts` with a constant total budget = sum(minimums) + extra,
// attacking in `order`. `windfall` (optional) is a one-time lump applied at
// month 0 to `windfallDebtId` (or spread across `order` if not specified).
export interface WindfallSpec {
  amount: number;
  debtId?: string; // if omitted, applied down the attack order
}

export function simulateOrder(
  debts: Debt[],
  extraMonthly: number,
  order: string[],
  windfallAmount = 0,
  windfallDebtId?: string,
): SimulationResult {
  const byId = new Map(debts.map((d) => [d.id, d]));
  const balances: Record<string, number> = {};
  for (const d of debts) balances[d.id] = d.balance;

  const baseBudget =
    debts.reduce((s, d) => s + d.minimumPayment, 0) + Math.max(0, extraMonthly);

  const payoffMonthByDebt: Record<string, number> = {};
  const schedule: MonthPoint[] = [];
  let totalInterest = 0;
  let totalPaid = 0;

  const totalBalanceOf = () =>
    order.reduce((s, id) => s + (balances[id] > 0 ? balances[id] : 0), 0);

  // Apply an optional one-time windfall before month 1.
  let windfall = Math.max(0, windfallAmount);
  if (windfall > 0) {
    if (windfallDebtId && balances[windfallDebtId] > 0) {
      const pay = Math.min(windfall, balances[windfallDebtId]);
      balances[windfallDebtId] -= pay;
      windfall -= pay;
      totalPaid += pay;
      if (balances[windfallDebtId] <= 0.005) payoffMonthByDebt[windfallDebtId] = 0;
    }
    // Any leftover cascades down the attack order.
    for (const id of order) {
      if (windfall <= 0) break;
      if (balances[id] <= 0) continue;
      const pay = Math.min(windfall, balances[id]);
      balances[id] -= pay;
      windfall -= pay;
      totalPaid += pay;
      if (balances[id] <= 0.005 && payoffMonthByDebt[id] === undefined)
        payoffMonthByDebt[id] = 0;
    }
  }

  // Month 0 snapshot (starting position).
  schedule.push({
    month: 0,
    totalBalance: totalBalanceOf(),
    balances: { ...balances },
    interestThisMonth: 0,
  });

  let month = 0;
  let amortizes = true;

  while (totalBalanceOf() > 0.5 && month < MAX_MONTHS) {
    month++;
    let interestThisMonth = 0;

    // 1. Accrue interest on every active debt.
    for (const id of order) {
      if (balances[id] <= 0) continue;
      const d = byId.get(id)!;
      const interest = balances[id] * monthlyRate(d.apr);
      balances[id] += interest;
      interestThisMonth += interest;
      totalInterest += interest;
    }

    let remaining = baseBudget;

    // 2. Pay each active debt its minimum first.
    for (const id of order) {
      if (balances[id] <= 0 || remaining <= 0) continue;
      const d = byId.get(id)!;
      const pay = Math.min(d.minimumPayment, balances[id], remaining);
      balances[id] -= pay;
      remaining -= pay;
      totalPaid += pay;
    }

    // 3. Throw everything left at debts in attack order.
    for (const id of order) {
      if (remaining <= 0) break;
      if (balances[id] <= 0) continue;
      const pay = Math.min(remaining, balances[id]);
      balances[id] -= pay;
      remaining -= pay;
      totalPaid += pay;
    }

    // Record payoffs and clamp float dust.
    for (const id of order) {
      if (balances[id] <= 0.005 && payoffMonthByDebt[id] === undefined) {
        payoffMonthByDebt[id] = month;
      }
      if (balances[id] < 0) balances[id] = 0;
    }

    schedule.push({
      month,
      totalBalance: totalBalanceOf(),
      balances: { ...balances },
      interestThisMonth,
    });

    // Non-amortizing guard: budget can't dent the balance.
    if (month >= 2) {
      const prev = schedule[schedule.length - 2].totalBalance;
      const now = schedule[schedule.length - 1].totalBalance;
      if (now >= prev - 0.01 && now > 0.5) {
        amortizes = false;
        break;
      }
    }
  }

  if (month >= MAX_MONTHS && totalBalanceOf() > 0.5) amortizes = false;

  const start = new Date();
  return {
    months: month,
    amortizes,
    totalInterest,
    totalPaid,
    payoffMonthByDebt,
    schedule,
    payoffDate: addMonths(start, month),
    order,
  };
}

// Convenience: run a named strategy end-to-end.
export function runStrategy(
  debts: Debt[],
  kind: StrategyKind,
  extraMonthly = 0,
  windfall?: WindfallSpec,
): StrategyResult {
  const order = orderFor(debts, kind, extraMonthly);
  const sim = simulateOrder(
    debts,
    extraMonthly,
    order,
    windfall?.amount ?? 0,
    windfall?.debtId,
  );
  // First still-owed debt in attack order = what to hit next.
  const nextPriorityDebtId =
    order.find((id) => (debts.find((d) => d.id === id)?.balance ?? 0) > 0) ??
    null;
  return { ...sim, kind, nextPriorityDebtId };
}

export function runAllStrategies(
  debts: Debt[],
  extraMonthly = 0,
): Record<StrategyKind, StrategyResult> {
  return {
    snowball: runStrategy(debts, 'snowball', extraMonthly),
    avalanche: runStrategy(debts, 'avalanche', extraMonthly),
    optimal: runStrategy(debts, 'optimal', extraMonthly),
  };
}

// -------------------------------------------------- Aggregate portfolio stats
export interface PortfolioSummary {
  totalBalance: number;
  totalMinimum: number;
  weightedApr: number;
  totalOriginal: number;
  percentPaid: number;
}

export function summarize(debts: Debt[]): PortfolioSummary {
  const totalBalance = debts.reduce((s, d) => s + d.balance, 0);
  const totalMinimum = debts.reduce((s, d) => s + d.minimumPayment, 0);
  const totalOriginal = debts.reduce(
    (s, d) => s + (d.originalBalance ?? d.balance),
    0,
  );
  const weightedApr =
    totalBalance > 0
      ? debts.reduce((s, d) => s + d.apr * d.balance, 0) / totalBalance
      : 0;
  const percentPaid =
    totalOriginal > 0 ? (1 - totalBalance / totalOriginal) * 100 : 0;
  return {
    totalBalance,
    totalMinimum,
    weightedApr,
    totalOriginal,
    percentPaid: Math.max(0, Math.min(100, percentPaid)),
  };
}

// Percent paid off for a single debt (needs originalBalance).
export function percentPaid(debt: Debt): number | null {
  if (!debt.originalBalance || debt.originalBalance <= 0) return null;
  const pct = (1 - debt.balance / debt.originalBalance) * 100;
  return Math.max(0, Math.min(100, pct));
}

// Interest a single debt will accrue if paid on its own minimum only.
// Used by the Life Cost view as "interest wasted" per debt.
export function standaloneInterest(debt: Debt): number {
  return simulateOrder([debt], 0, [debt.id], 0).totalInterest;
}

// ------------------------------------------------------- Scenario modeling
export interface ScenarioResult {
  base: SimulationResult; // extra=0, no windfall
  scenario: SimulationResult;
  monthsSaved: number;
  interestSaved: number;
}

export function runScenario(
  debts: Debt[],
  kind: StrategyKind,
  extraMonthly: number,
  windfall?: WindfallSpec,
): ScenarioResult {
  const baseOrder = orderFor(debts, kind, 0);
  const base = simulateOrder(debts, 0, baseOrder, 0);

  const order = orderFor(debts, kind, extraMonthly);
  const scenario = simulateOrder(
    debts,
    extraMonthly,
    order,
    windfall?.amount ?? 0,
    windfall?.debtId,
  );

  return {
    base,
    scenario,
    monthsSaved: Math.max(0, base.months - scenario.months),
    interestSaved: Math.max(0, base.totalInterest - scenario.totalInterest),
  };
}
