export type BudgetStatusRow = {
  id: string;
  status?: string | null;
};

export const inactiveBudgetMessage =
  'Inactive budgets are read-only. Reactivate the budget before making changes.';

export function isInactiveBudget(budget: BudgetStatusRow | null | undefined) {
  return String(budget?.status || '').toLowerCase() === 'inactive';
}

export function rejectInactiveBudget(res: any, budget: BudgetStatusRow | null | undefined) {
  if (!isInactiveBudget(budget)) {
    return false;
  }

  res.status(403).json({
    success: false,
    message: inactiveBudgetMessage,
  });
  return true;
}
