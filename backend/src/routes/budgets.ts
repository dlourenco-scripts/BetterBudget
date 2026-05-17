import {Router} from 'express';
import {body, validationResult} from 'express-validator';
import {v4 as uuidv4} from 'uuid';
import {authMiddleware, AuthRequest} from '../middleware/auth';
import db from '../db';
import incomesRouter from './incomes';
import expensesRouter from './expenses';
import debtsRouter from './debts';

const router = Router();

type BudgetRow = {
  id: string;
  user_id: string;
  name: string;
  net_pay: string;
  cycle_type: string;
  cycle_start: string;
  cycle_end: string;
  reserve_amount: string;
  current_savings: string;
  savings_goal: string;
  goal_type: string;
  auto_fill_enabled: boolean;
  status: string;
  created_at: Date;
  updated_at: Date;
};

type CycleRow = {
  id: string;
  budget_id: string;
  cycle_index: number;
  cycle_start: Date | string;
  cycle_end: Date | string;
  status: string;
  base_income: string;
  extra_income: string;
  manual_additional_income: string;
  total_income: string;
  total_expenses: string;
  reserve_amount: string;
  goal_type: string;
  goal_allocation: string;
  carry_over_in: string;
  carry_over_out: string;
  spendable_amount: string;
  remaining_amount: string;
  created_at: Date;
  updated_at: Date;
};

const budgetSelect = `
  SELECT id, user_id, name, net_pay, cycle_type, cycle_start, cycle_end,
    reserve_amount, current_savings, savings_goal, goal_type, auto_fill_enabled, status, created_at, updated_at
  FROM budgets
`;

const dateField = (field: string) =>
  body(field).isISO8601({strict: true}).withMessage(`${field} must be a valid date.`);

const optionalDateField = (field: string) =>
  body(field).optional().isISO8601({strict: true}).withMessage(`${field} must be a valid date.`);

function toBudget(row: BudgetRow) {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    netPay: Number(row.net_pay),
    cycleType: row.cycle_type,
    cycleStart: row.cycle_start,
    cycleEnd: row.cycle_end,
    reserveAmount: Number(row.reserve_amount),
    currentSavings: Number(row.current_savings),
    savingsGoal: Number(row.savings_goal),
    goalType: row.goal_type,
    autoFillEnabled: row.auto_fill_enabled,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toIsoDate(value: Date | string) {
  return new Date(value).toISOString().slice(0, 10);
}

function addDays(dateValue: string, days: number) {
  const date = new Date(`${dateValue}T00:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function addMonths(dateValue: string, months: number) {
  const date = new Date(`${dateValue}T00:00:00`);
  const originalDay = date.getDate();
  date.setDate(1);
  date.setMonth(date.getMonth() + months);
  const lastDayOfTargetMonth = new Date(
    date.getFullYear(),
    date.getMonth() + 1,
    0,
  ).getDate();
  date.setDate(Math.min(originalDay, lastDayOfTargetMonth));
  return date.toISOString().slice(0, 10);
}

function isWithinDateRange(dateValue: string, startDate: string, endDate: string) {
  return dateValue >= startDate && dateValue <= endDate;
}

function getMonthDifference(startDate: string, endDate: string) {
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  return (
    (end.getFullYear() - start.getFullYear()) * 12 +
    (end.getMonth() - start.getMonth())
  );
}

function getExpenseCycleDate(expense: any, cycleStart: string, cycleEnd: string) {
  const originalDueDate = toIsoDate(expense.due_date || expense.dueDate);
  const frequency = String(expense.frequency || 'Every Pay Cycle').toLowerCase();

  if (isWithinDateRange(originalDueDate, cycleStart, cycleEnd)) {
    return originalDueDate;
  }

  if (originalDueDate > cycleEnd) {
    return null;
  }

  if (frequency.includes('one')) {
    return null;
  }

  if (frequency.includes('every pay')) {
    return cycleStart;
  }

  const monthStep = frequency.includes('quater') || frequency.includes('quarter')
    ? 3
    : frequency.includes('bian') || frequency.includes('bi-annual')
      ? 6
      : frequency.includes('annual')
        ? 12
        : frequency.includes('monthly')
          ? 1
          : 0;

  if (!monthStep) {
    return null;
  }

  const monthDifference = getMonthDifference(originalDueDate, cycleStart);
  const firstPossibleOccurrence =
    monthDifference <= 0
      ? originalDueDate
      : addMonths(
          originalDueDate,
          Math.floor(monthDifference / monthStep) * monthStep,
        );

  const occurrenceDates = [
    firstPossibleOccurrence,
    addMonths(firstPossibleOccurrence, monthStep),
  ];

  return (
    occurrenceDates.find(dateValue =>
      isWithinDateRange(dateValue, cycleStart, cycleEnd),
    ) || null
  );
}

function getCycleEnd(startDate: string, cycleType: string) {
  const normalizedType = cycleType.toLowerCase();
  if (normalizedType.includes('weekly') && !normalizedType.includes('bi')) {
    return addDays(startDate, 6);
  }
  if (normalizedType.includes('bi')) {
    return addDays(startDate, 13);
  }
  if (normalizedType.includes('semi')) {
    const date = new Date(`${startDate}T00:00:00`);
    const nextStart =
      date.getDate() <= 1
        ? new Date(date.getFullYear(), date.getMonth(), 15)
        : new Date(date.getFullYear(), date.getMonth() + 1, 1);
    nextStart.setDate(nextStart.getDate() - 1);
    return nextStart.toISOString().slice(0, 10);
  }

  const date = new Date(`${startDate}T00:00:00`);
  date.setMonth(date.getMonth() + 1);
  date.setDate(date.getDate() - 1);
  return date.toISOString().slice(0, 10);
}

function toCycle(row: CycleRow) {
  return {
    id: row.id,
    budgetId: row.budget_id,
    cycleIndex: row.cycle_index,
    cycleStart: toIsoDate(row.cycle_start),
    cycleEnd: toIsoDate(row.cycle_end),
    status: row.status,
    baseIncome: Number(row.base_income),
    extraIncome: Number(row.extra_income),
    manualAdditionalIncome: Number(row.manual_additional_income || 0),
    totalIncome: Number(row.total_income),
    totalExpenses: Number(row.total_expenses),
    reserveAmount: Number(row.reserve_amount),
    goalType: row.goal_type,
    goalAllocation: Number(row.goal_allocation),
    carryOverIn: Number(row.carry_over_in),
    carryOverOut: Number(row.carry_over_out),
    spendableAmount: Number(row.spendable_amount),
    remainingAmount: Number(row.remaining_amount),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function getCycleDebtPayments(cycleId: string) {
  const result = await db.query(
    `SELECT target_id, amount
     FROM allocations
     WHERE budget_cycle_id = $1
       AND target_type = 'debt_payment'
       AND source = 'cycle_debt_payment'`,
    [cycleId],
  );

  return result.rows.reduce((next: Record<string, number>, row: any) => {
    if (row.target_id) {
      next[row.target_id] = Number(row.amount || 0);
    }
    return next;
  }, {});
}

async function applyMaturedDebtPayments(budgetId: string) {
  const today = new Date().toISOString().slice(0, 10);
  const client = await db.connect();

  try {
    await client.query('BEGIN');
    const allocations = await client.query(
      `SELECT a.id, a.target_id, a.amount
       FROM allocations a
       JOIN budget_cycles c ON c.id = a.budget_cycle_id
       WHERE c.budget_id = $1
         AND c.cycle_end < $2
         AND a.target_type = 'debt_payment'
         AND a.source = 'cycle_debt_payment'
         AND a.applied_at IS NULL
       ORDER BY c.cycle_index ASC, a.created_at ASC`,
      [budgetId, today],
    );

    for (const allocation of allocations.rows) {
      const paymentAmount = Math.max(0, Number(allocation.amount || 0));
      if (!allocation.target_id || paymentAmount <= 0) {
        await client.query(
          'UPDATE allocations SET applied_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
          [allocation.id],
        );
        continue;
      }

      const debtResult = await client.query(
        `SELECT id, balance, status
         FROM debts
         WHERE id = $1 AND budget_id = $2
         FOR UPDATE`,
        [allocation.target_id, budgetId],
      );
      const debt = debtResult.rows[0];
      const status = String(debt?.status || 'active').toLowerCase();
      if (!debt || ['paid_off', 'archived'].includes(status)) {
        await client.query(
          'UPDATE allocations SET applied_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
          [allocation.id],
        );
        continue;
      }

      const nextBalance = Math.max(0, Number(debt.balance || 0) - paymentAmount);
      await client.query(
        `UPDATE debts
         SET balance = $1,
           status = $2,
           updated_at = CURRENT_TIMESTAMP
         WHERE id = $3`,
        [nextBalance, nextBalance <= 0 ? 'paid_off_pending' : debt.status, debt.id],
      );
      await client.query(
        'UPDATE allocations SET applied_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
        [allocation.id],
      );
    }

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

function toIncome(row: any) {
  return {
    id: row.id,
    budgetId: row.budget_id,
    name: row.name,
    amount: Number(row.amount),
    type: row.type,
    frequency: row.frequency,
    receivedDate: toIsoDate(row.received_date),
    category: row.category,
    notes: row.notes || '',
    isPrimary: Boolean(row.is_primary),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toExpense(row: any) {
  return {
    id: row.id,
    budgetId: row.budget_id,
    name: row.name,
    amount: Number(row.amount),
    type: row.type,
    frequency: row.frequency || 'Every Pay Cycle',
    dueDate: toIsoDate(row.due_date),
    category: row.category,
    priority: row.priority,
    notes: row.notes || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toDebt(row: any) {
  return {
    id: row.id,
    budgetId: row.budget_id,
    name: row.name,
    balance: Number(row.balance),
    minimumPayment: Number(row.minimum_payment),
    interestRate: Number(row.interest_rate),
    priority: row.priority,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function getBudgetForUser(budgetId: string, userId: string) {
  const result = await db.query<BudgetRow>(
    `${budgetSelect} WHERE id = $1 AND user_id = $2`,
    [budgetId, userId],
  );
  return result.rows[0] ? toBudget(result.rows[0]) : null;
}

async function ensureBudgetCycles(budget: ReturnType<typeof toBudget>, count = 6) {
  let startDate = budget.cycleStart;
  const today = new Date().toISOString().slice(0, 10);

  for (let index = 0; index < count || startDate <= today; index++) {
    const endDate = getCycleEnd(startDate, budget.cycleType);
    await db.query(
      `INSERT INTO budget_cycles
        (id, budget_id, cycle_index, cycle_start, cycle_end, status, reserve_amount, goal_type)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (budget_id, cycle_index) DO NOTHING`,
      [
        uuidv4(),
        budget.id,
        index,
        startDate,
        endDate,
        index === 0 ? 'active' : 'planned',
        budget.reserveAmount,
        budget.goalType,
      ],
    );
    startDate = addDays(endDate, 1);
  }
}

async function syncCycleTotals(budget: ReturnType<typeof toBudget>, cycle: CycleRow) {
  const cycleStart = toIsoDate(cycle.cycle_start);
  const cycleEnd = toIsoDate(cycle.cycle_end);
  const [expenses, debts] = await Promise.all([
    db.query('SELECT * FROM expenses WHERE budget_id = $1 AND due_date <= $2 ORDER BY due_date ASC, created_at ASC', [
      budget.id,
      cycleEnd,
    ]),
    db.query(
      "SELECT COALESCE(SUM(minimum_payment), 0) AS total FROM debts WHERE budget_id = $1 AND status NOT IN ('paid_off', 'archived')",
      [
      budget.id,
      ],
    ),
  ]);

  const extraIncomeItems: any[] = [];
  const expenseItems = expenses.rows
    .map(row => {
      const cycleDueDate = getExpenseCycleDate(row, cycleStart, cycleEnd);
      return cycleDueDate ? {...toExpense(row), dueDate: cycleDueDate} : null;
    })
    .filter(Boolean);
  const previousCycle = await db.query<CycleRow>(
    `SELECT carry_over_out FROM budget_cycles
     WHERE budget_id = $1 AND cycle_index = $2`,
    [budget.id, cycle.cycle_index - 1],
  );
  const carryOverIn = Number(previousCycle.rows[0]?.carry_over_out || 0);
  const extraIncome = extraIncomeItems.reduce((sum, item) => sum + item.amount, 0);
  const manualAdditionalIncome = Math.max(0, Number(cycle.manual_additional_income || 0));
  const savedBaseIncome = Number(cycle.base_income || 0);
  const baseIncome = savedBaseIncome > 0 ? savedBaseIncome : budget.netPay;
  const totalIncome = baseIncome + extraIncome + carryOverIn + manualAdditionalIncome;
  const totalExpenses = expenseItems.reduce((sum, item) => sum + item.amount, 0);
  const carryOverOut = Math.max(0, Number(cycle.carry_over_out || 0));
  const remainingBeforeGoal = totalIncome - totalExpenses;
  const savedGoalAllocation = Math.max(0, Number(cycle.goal_allocation || 0));
  const isPastCycle = cycleEnd < new Date().toISOString().slice(0, 10);
  const autoFillGoalAllocation = Math.max(
    0,
    remainingBeforeGoal - carryOverOut - budget.reserveAmount,
  );
  const debtPaymentTotal = Math.max(0, Number(debts.rows[0]?.total || 0));
  const manualOrDebtAllocation =
    !budget.autoFillEnabled && cycle.status === 'planned'
      ? debtPaymentTotal
      : savedGoalAllocation;
  const goalAllocation = isPastCycle
    ? savedGoalAllocation
    : budget.autoFillEnabled
      ? Math.max(autoFillGoalAllocation, debtPaymentTotal)
      : manualOrDebtAllocation;
  const remainingAmount = remainingBeforeGoal - goalAllocation - carryOverOut;
  const spendableAmount = Math.max(0, remainingAmount);

  const result = await db.query<CycleRow>(
    `UPDATE budget_cycles
     SET base_income = $1,
       extra_income = $2,
       manual_additional_income = $3,
       total_income = $4,
       total_expenses = $5,
       reserve_amount = $6,
       goal_type = $7,
       goal_allocation = $8,
       carry_over_in = $9,
       spendable_amount = $10,
       remaining_amount = $11,
       updated_at = CURRENT_TIMESTAMP
     WHERE id = $12
     RETURNING *`,
    [
      baseIncome,
      extraIncome,
      manualAdditionalIncome,
      totalIncome,
      totalExpenses,
      budget.reserveAmount,
      budget.goalType,
      goalAllocation,
      carryOverIn,
      spendableAmount,
      remainingAmount,
      cycle.id,
    ],
  );

  return {
    ...toCycle(result.rows[0]),
    incomes: [
      {
        id: `${budget.id}-base-income-${cycle.cycle_index}`,
        budgetId: budget.id,
        name: 'Primary Income',
        amount: baseIncome,
        type: 'Fixed Income',
        frequency: budget.cycleType,
        receivedDate: cycleStart,
        category: 'Primary',
        notes: '',
        isPrimary: true,
        createdAt: cycle.created_at,
        updatedAt: cycle.updated_at,
      },
      ...(carryOverIn > 0
        ? [
            {
              id: `${budget.id}-carry-over-${cycle.cycle_index}`,
              budgetId: budget.id,
              name: 'Carry Over',
              amount: carryOverIn,
              type: 'Carry Over',
              frequency: budget.cycleType,
              receivedDate: cycleStart,
              category: 'Carry Over',
              notes: 'From previous cycle',
              isPrimary: false,
              createdAt: cycle.created_at,
              updatedAt: cycle.updated_at,
            },
          ]
        : []),
      ...extraIncomeItems,
    ],
    expenses: expenseItems,
  };
}

async function loadCycles(budget: ReturnType<typeof toBudget>) {
  await ensureBudgetCycles(budget);
  await applyMaturedDebtPayments(budget.id);
  const today = new Date().toISOString().slice(0, 10);
  await db.query(
    `UPDATE budget_cycles
     SET status = CASE
       WHEN cycle_start <= $2 AND cycle_end >= $2 THEN 'active'
       WHEN cycle_end < $2 THEN 'past'
       ELSE 'planned'
     END,
       updated_at = CURRENT_TIMESTAMP
     WHERE budget_id = $1`,
    [budget.id, today],
  );
  const result = await db.query<CycleRow>(
    'SELECT * FROM budget_cycles WHERE budget_id = $1 ORDER BY cycle_index ASC',
    [budget.id],
  );
  const syncedCycles: Array<Awaited<ReturnType<typeof syncCycleTotals>> & {debtPayments: Record<string, number>}> = [];
  for (const cycle of result.rows) {
    const syncedCycle = await syncCycleTotals(budget, cycle);
    syncedCycles.push({
      ...syncedCycle,
      debtPayments: await getCycleDebtPayments(cycle.id),
    });
  }
  return syncedCycles;
}

async function loadBudgetDetail(budget: ReturnType<typeof toBudget>) {
  const cycles = await loadCycles(budget);
  const [incomes, expenses, debts] = await Promise.all([
    db.query('SELECT * FROM incomes WHERE budget_id = $1 ORDER BY created_at ASC', [budget.id]),
    db.query('SELECT * FROM expenses WHERE budget_id = $1 ORDER BY due_date ASC, created_at ASC', [budget.id]),
    db.query('SELECT * FROM debts WHERE budget_id = $1 ORDER BY priority ASC, created_at ASC', [budget.id]),
  ]);
  const today = new Date().toISOString().slice(0, 10);
  const currentCycle =
    cycles.find(cycle => cycle.cycleStart <= today && cycle.cycleEnd >= today) ||
    cycles.find(cycle => cycle.status === 'active') ||
    cycles[0] ||
    null;

  return {
    ...budget,
    currentCycle,
    cycles,
    incomes: incomes.rows.map(toIncome),
    expenses: expenses.rows.map(toExpense),
    debts: debts.rows.map(toDebt),
  };
}

router.use('/:budgetId/incomes', incomesRouter);
router.use('/:budgetId/expenses', expensesRouter);
router.use('/:budgetId/debts', debtsRouter);

router.get('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const result = await db.query<BudgetRow>(
      `${budgetSelect} WHERE user_id = $1 ORDER BY created_at DESC`,
      [req.userId],
    );
    return res.status(200).json({success: true, data: result.rows.map(toBudget)});
  } catch (error) {
    console.error('List budgets error:', error);
    return res.status(500).json({success: false, message: 'Internal server error.'});
  }
});

router.post(
  '/',
  authMiddleware,
  body('name').isString().notEmpty(),
  body('netPay').isFloat({gt: 0}),
  body('cycleType').isString().notEmpty(),
  dateField('cycleStart'),
  dateField('cycleEnd'),
  body('reserveAmount').optional().isFloat({min: 0}),
  body('currentSavings').optional().isFloat({min: 0}),
  body('savingsGoal').optional().isFloat({min: 0}),
  body('goalType').optional().isIn(['save', 'debt']),
  body('autoFillEnabled').optional().isBoolean(),
  async (req: AuthRequest, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({success: false, errors: errors.array()});
    }

    const {
      name,
      netPay,
      cycleType,
      cycleStart,
      cycleEnd,
      reserveAmount = 0,
      currentSavings = 0,
      savingsGoal = 0,
      goalType = 'save',
      autoFillEnabled = false,
    } = req.body;
    const id = uuidv4();

    try {
      const result = await db.query<BudgetRow>(
        `INSERT INTO budgets
          (id, user_id, name, net_pay, cycle_type, cycle_start, cycle_end, reserve_amount, current_savings, savings_goal, goal_type, auto_fill_enabled, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
         RETURNING *`,
        [
          id,
          req.userId,
          name,
          netPay,
          cycleType,
          cycleStart,
          cycleEnd,
          reserveAmount,
          currentSavings,
          savingsGoal,
          goalType,
          autoFillEnabled,
          'active',
        ],
      );

      return res.status(201).json({success: true, data: toBudget(result.rows[0])});
    } catch (error) {
      console.error('Create budget error:', error);
      return res.status(500).json({success: false, message: 'Internal server error.'});
    }
  },
);

router.get('/:budgetId', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const budget = await getBudgetForUser(req.params.budgetId, req.userId!);
    if (!budget) {
      return res.status(404).json({success: false, message: 'Budget not found.'});
    }

    return res.status(200).json({success: true, data: await loadBudgetDetail(budget)});
  } catch (error) {
    console.error('Get budget error:', error);
    return res.status(500).json({success: false, message: 'Internal server error.'});
  }
});

router.patch(
  '/:budgetId',
  authMiddleware,
  body('name').optional().isString(),
  body('netPay').optional().isFloat({gt: 0}),
  body('cycleType').optional().isString(),
  optionalDateField('cycleStart'),
  optionalDateField('cycleEnd'),
  body('reserveAmount').optional().isFloat({min: 0}),
  body('currentSavings').optional().isFloat({min: 0}),
  body('savingsGoal').optional().isFloat({min: 0}),
  body('goalType').optional().isIn(['save', 'debt']),
  body('autoFillEnabled').optional().isBoolean(),
  body('status').optional().isString(),
  async (req: AuthRequest, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({success: false, errors: errors.array()});
    }

    const fieldMapping: Record<string, string> = {
      name: 'name',
      netPay: 'net_pay',
      reserveAmount: 'reserve_amount',
      currentSavings: 'current_savings',
      savingsGoal: 'savings_goal',
      goalType: 'goal_type',
      autoFillEnabled: 'auto_fill_enabled',
      status: 'status',
    };

    const updates = Object.entries(req.body).filter(([key]) => fieldMapping[key]);
    if (updates.length === 0) {
      return res.status(400).json({success: false, message: 'No valid fields provided.'});
    }

    let client: Awaited<ReturnType<typeof db.connect>> | null = null;
    try {
      const existing = await getBudgetForUser(req.params.budgetId, req.userId!);
      if (!existing) {
        return res.status(404).json({success: false, message: 'Budget not found.'});
      }

      client = await db.connect();
      await client.query('BEGIN');

      const values = updates.map(([, value]) => value);
      const assignments = updates
        .map(([key], index) => `${fieldMapping[key]} = $${index + 1}`)
        .join(', ');
      values.push(existing.id);

      const result = await client.query<BudgetRow>(
        `UPDATE budgets SET ${assignments}, updated_at = CURRENT_TIMESTAMP WHERE id = $${values.length} RETURNING *`,
        values,
      );
      const updatedBudget = toBudget(result.rows[0]);

      if (req.body.netPay !== undefined) {
        const today = new Date().toISOString().slice(0, 10);
        await client.query(
          `UPDATE budget_cycles
           SET base_income = $1,
             updated_at = CURRENT_TIMESTAMP
           WHERE budget_id = $2
             AND cycle_end >= $3`,
          [updatedBudget.netPay, updatedBudget.id, today],
        );

        const primaryIncome = await client.query<{id: string}>(
          'SELECT id FROM incomes WHERE budget_id = $1 AND is_primary = true ORDER BY created_at ASC LIMIT 1',
          [updatedBudget.id],
        );
        if (primaryIncome.rows[0]?.id) {
          await client.query(
            `UPDATE incomes
             SET amount = $1,
               frequency = $2,
               updated_at = CURRENT_TIMESTAMP
             WHERE id = $3`,
            [updatedBudget.netPay, updatedBudget.cycleType, primaryIncome.rows[0].id],
          );
        } else {
          await client.query(
            `INSERT INTO incomes
              (id, budget_id, name, amount, type, frequency, received_date, category, notes, is_primary)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true)`,
            [
              uuidv4(),
              updatedBudget.id,
              'Primary Income',
              updatedBudget.netPay,
              'Fixed Income',
              updatedBudget.cycleType,
              today,
              'Primary',
              '',
            ],
          );
        }
      }

      if (req.body.autoFillEnabled === false) {
        const debtTotal = await client.query<{total: string}>(
          "SELECT COALESCE(SUM(minimum_payment), 0) AS total FROM debts WHERE budget_id = $1 AND status NOT IN ('paid_off', 'archived')",
          [updatedBudget.id],
        );
        await client.query(
          `UPDATE budget_cycles
           SET goal_allocation = $1,
             updated_at = CURRENT_TIMESTAMP
           WHERE budget_id = $2`,
          [Number(debtTotal.rows[0]?.total || 0), updatedBudget.id],
        );
      }

      await client.query('COMMIT');
      return res.status(200).json({
        success: true,
        message: 'Budget updated.',
        data: updatedBudget,
      });
    } catch (error) {
      if (client) {
        await client.query('ROLLBACK');
      }
      console.error('Update budget error:', error);
      return res.status(500).json({success: false, message: 'Internal server error.'});
    } finally {
      client?.release();
    }
  },
);

router.delete('/:budgetId', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const budget = await getBudgetForUser(req.params.budgetId, req.userId!);
    if (!budget) {
      return res.status(404).json({success: false, message: 'Budget not found.'});
    }

    await db.query('DELETE FROM budgets WHERE id = $1', [budget.id]);
    return res.status(204).send();
  } catch (error) {
    console.error('Delete budget error:', error);
    return res.status(500).json({success: false, message: 'Internal server error.'});
  }
});

router.patch(
  '/:budgetId/cycles/:cycleId',
  authMiddleware,
  body('carryOverOut').optional().isFloat({min: 0}),
  body('baseIncome').optional().isFloat({gt: 0}),
  body('goalAllocation').optional().isFloat({min: 0}),
  body('manualAdditionalIncome').optional().isFloat({min: 0}),
  body('debtPayments').optional().isObject(),
  async (req: AuthRequest, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({success: false, errors: errors.array()});
    }

    try {
      const budget = await getBudgetForUser(req.params.budgetId, req.userId!);
      if (!budget) {
        return res.status(404).json({success: false, message: 'Budget not found.'});
      }

      const cycleResult = await db.query<CycleRow>(
        'SELECT * FROM budget_cycles WHERE id = $1 AND budget_id = $2',
        [req.params.cycleId, budget.id],
      );
      const cycle = cycleResult.rows[0];
      if (!cycle) {
        return res.status(404).json({success: false, message: 'Budget cycle not found.'});
      }
      if (toIsoDate(cycle.cycle_end) < new Date().toISOString().slice(0, 10)) {
        return res.status(403).json({
          success: false,
          message: 'Past budget cycles are read-only.',
        });
      }

      const carryOverOut =
        req.body.carryOverOut === undefined
          ? Number(cycle.carry_over_out || 0)
          : Number(req.body.carryOverOut || 0);
      const nextBaseIncome =
        req.body.baseIncome === undefined ? null : Number(req.body.baseIncome);
      const hasManualAdditionalIncome = Object.prototype.hasOwnProperty.call(
        req.body,
        'manualAdditionalIncome',
      );
      const nextManualAdditionalIncome = hasManualAdditionalIncome
        ? Number(req.body.manualAdditionalIncome || 0)
        : Number(cycle.manual_additional_income || 0);
      const goalAllocation =
        req.body.goalAllocation === undefined
          ? Number(cycle.goal_allocation || 0)
          : Number(req.body.goalAllocation || 0);
      const hasBaseIncome = Object.prototype.hasOwnProperty.call(req.body, 'baseIncome');

      console.log('[CyclePatch] carry over validation input', {
        budgetId: req.params.budgetId,
        cycleId: req.params.cycleId,
        body: req.body,
        hasBaseIncome,
        nextBaseIncome,
        nextManualAdditionalIncome,
        carryOverOut,
        cycleCarryOverOut: cycle.carry_over_out,
        validationBranch:
          nextBaseIncome !== null || hasManualAdditionalIncome
            ? 'incomeChanging'
            : 'carryOverOut',
      });

      if (nextBaseIncome !== null) {
        if (carryOverOut > nextBaseIncome) {
          return res.status(400).json({
            success: false,
            message: 'Income cannot be less than the Carry Over amount.',
          });
        }
      } else if (hasManualAdditionalIncome) {
        const cycleStart = toIsoDate(cycle.cycle_start);
        const cycleEnd = toIsoDate(cycle.cycle_end);
        const [expenses, previousCycle] = await Promise.all([
          db.query(
            'SELECT * FROM expenses WHERE budget_id = $1 AND due_date <= $2 ORDER BY due_date ASC, created_at ASC',
            [budget.id, cycleEnd],
          ),
          db.query<CycleRow>(
            `SELECT carry_over_out FROM budget_cycles
             WHERE budget_id = $1 AND cycle_index = $2`,
            [budget.id, cycle.cycle_index - 1],
          ),
        ]);
        const expenseItems = expenses.rows
          .map(row => {
            const cycleDueDate = getExpenseCycleDate(row, cycleStart, cycleEnd);
            return cycleDueDate ? {...toExpense(row), dueDate: cycleDueDate} : null;
          })
          .filter(Boolean);
        const savedBaseIncome = Number(cycle.base_income || 0);
        const baseIncome =
          nextBaseIncome !== null
            ? nextBaseIncome
            : savedBaseIncome > 0
              ? savedBaseIncome
              : budget.netPay;
        const carryOverIn = Number(previousCycle.rows[0]?.carry_over_out || 0);
        const totalExpenses = expenseItems.reduce(
          (sum, item) => sum + Number(item?.amount || 0),
          0,
        );
        const availableToCarry =
          baseIncome + carryOverIn + nextManualAdditionalIncome - totalExpenses;

        if (carryOverOut > availableToCarry) {
          return res.status(400).json({
            success: false,
            message: 'Carry over cannot exceed remaining plus the amount set to save.',
          });
        }
      } else {
        const availableToCarry =
          Number(cycle.remaining_amount || 0) +
          Number(cycle.goal_allocation || 0) +
          Number(cycle.carry_over_out || 0);
        if (carryOverOut > availableToCarry) {
          return res.status(400).json({
            success: false,
            message: 'Carry over cannot exceed remaining plus the amount set to save.',
          });
        }
      }

      await db.query(
        `UPDATE budget_cycles
         SET carry_over_out = $1,
           base_income = COALESCE($2, base_income),
           goal_allocation = $3,
           manual_additional_income = COALESCE($4, manual_additional_income),
           updated_at = CURRENT_TIMESTAMP
         WHERE id = $5`,
        [
          carryOverOut,
          nextBaseIncome,
          goalAllocation,
          hasManualAdditionalIncome ? nextManualAdditionalIncome : null,
          cycle.id,
        ],
      );

      if (req.body.debtPayments && typeof req.body.debtPayments === 'object') {
        const debtPayments = req.body.debtPayments as Record<string, unknown>;
        const debtIds = Object.keys(debtPayments);
        if (debtIds.length > 0) {
          const debtResult = await db.query(
            'SELECT id FROM debts WHERE budget_id = $1 AND id = ANY($2::text[])',
            [budget.id, debtIds],
          );
          const validDebtIds = new Set(debtResult.rows.map((row: any) => row.id));
          for (const debtId of debtIds) {
            if (!validDebtIds.has(debtId)) {
              continue;
            }

            const amount = Math.max(0, Number(debtPayments[debtId] || 0));
            await db.query(
              `DELETE FROM allocations
               WHERE budget_cycle_id = $1
                 AND target_type = 'debt_payment'
                 AND target_id = $2
                 AND source = 'cycle_debt_payment'
                 AND applied_at IS NULL`,
              [cycle.id, debtId],
            );
            if (amount > 0) {
              await db.query(
                `INSERT INTO allocations
                  (id, budget_cycle_id, target_type, target_id, amount, source, notes)
                 VALUES ($1, $2, 'debt_payment', $3, $4, 'cycle_debt_payment', $5)`,
                [uuidv4(), cycle.id, debtId, amount, 'Debt payment for this budget cycle'],
              );
            }
          }
        }
      }

      const cycles = await loadCycles(budget);
      const updatedCycle = cycles.find(item => item.id === cycle.id);
      return res.status(200).json({success: true, data: updatedCycle});
    } catch (error) {
      console.error('Update budget cycle error:', error);
      return res.status(500).json({success: false, message: 'Internal server error.'});
    }
  },
);

router.get('/:budgetId/cycles', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const budget = await getBudgetForUser(req.params.budgetId, req.userId!);
    if (!budget) {
      return res.status(404).json({success: false, message: 'Budget not found.'});
    }

    const cycles = await loadCycles(budget);
    return res.status(200).json({success: true, data: cycles});
  } catch (error) {
    console.error('List budget cycles error:', error);
    return res.status(500).json({success: false, message: 'Internal server error.'});
  }
});

router.get('/:budgetId/cycles/current', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const budget = await getBudgetForUser(req.params.budgetId, req.userId!);
    if (!budget) {
      return res.status(404).json({success: false, message: 'Budget not found.'});
    }

    const cycles = await loadCycles(budget);
    const today = new Date().toISOString().slice(0, 10);
    const currentCycle =
      cycles.find(cycle => cycle.cycleStart <= today && cycle.cycleEnd >= today) ||
      cycles.find(cycle => cycle.status === 'active') ||
      cycles[0];

    return res.status(200).json({success: true, data: currentCycle});
  } catch (error) {
    console.error('Get current budget cycle error:', error);
    return res.status(500).json({success: false, message: 'Internal server error.'});
  }
});

router.get('/:budgetId/forecast', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const budget = await getBudgetForUser(req.params.budgetId, req.userId!);
    if (!budget) {
      return res.status(404).json({success: false, message: 'Budget not found.'});
    }

    const [incomes, expenses, debts] = await Promise.all([
      db.query('SELECT amount FROM incomes WHERE budget_id = $1', [budget.id]),
      db.query('SELECT amount FROM expenses WHERE budget_id = $1', [budget.id]),
      db.query("SELECT id, name, balance, minimum_payment FROM debts WHERE budget_id = $1 AND status NOT IN ('paid_off', 'archived')", [budget.id]),
    ]);

    const totalIncome = incomes.rows.reduce((sum, item) => sum + Number(item.amount), 0);
    const totalExpenses = expenses.rows.reduce((sum, item) => sum + Number(item.amount), 0);
    const availableForGoals = Math.max(0, totalIncome - totalExpenses - budget.reserveAmount);

    const savingsProjection = {
      monthlyAllocation: availableForGoals,
      projectedDate:
        availableForGoals > 0
          ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
          : null,
    };

    const debtProjection = debts.rows.map(debt => {
      const monthlyPayment = Math.max(
        Number(debt.minimum_payment),
        availableForGoals / Math.max(debts.rows.length, 1),
      );
      const payoffMonths = monthlyPayment > 0 ? Math.ceil(Number(debt.balance) / monthlyPayment) : null;
      const payoffDate = payoffMonths
        ? new Date(Date.now() + payoffMonths * 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
        : null;
      return {
        debtId: debt.id,
        name: debt.name,
        projectedPayoffDate: payoffDate,
        monthlyPayment,
      };
    });

    return res.status(200).json({
      success: true,
      data: {
        goalType: budget.goalType,
        savingsProjection,
        debtProjection,
      },
    });
  } catch (error) {
    console.error('Forecast budget error:', error);
    return res.status(500).json({success: false, message: 'Internal server error.'});
  }
});

export default router;
