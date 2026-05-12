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
    return addDays(startDate, 14);
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

  for (let index = 0; index < count; index++) {
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
  const [incomes, expenses, debts] = await Promise.all([
    db.query('SELECT * FROM incomes WHERE budget_id = $1 AND received_date BETWEEN $2 AND $3 ORDER BY received_date ASC, created_at ASC', [
      budget.id,
      cycleStart,
      cycleEnd,
    ]),
    db.query('SELECT * FROM expenses WHERE budget_id = $1 AND due_date <= $2 ORDER BY due_date ASC, created_at ASC', [
      budget.id,
      cycleEnd,
    ]),
    db.query('SELECT COALESCE(SUM(minimum_payment), 0) AS total FROM debts WHERE budget_id = $1', [
      budget.id,
    ]),
  ]);

  const incomeItems = incomes.rows.map(toIncome);
  const firstCyclePrimaryIncomeId =
    cycle.cycle_index === 0
      ? incomeItems.find(
          item =>
            item.receivedDate === budget.cycleStart &&
            item.amount === budget.netPay,
        )?.id
      : null;
  const extraIncomeItems = incomeItems.filter(
    item => !item.isPrimary && item.id !== firstCyclePrimaryIncomeId,
  );
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
  const savedBaseIncome = Number(cycle.base_income || 0);
  const baseIncome = savedBaseIncome > 0 ? savedBaseIncome : budget.netPay;
  const totalIncome = baseIncome + extraIncome + carryOverIn;
  const totalExpenses = expenseItems.reduce((sum, item) => sum + item.amount, 0);
  const carryOverOut = Math.max(0, Number(cycle.carry_over_out || 0));
  const remainingBeforeGoal = totalIncome - totalExpenses;
  const savedGoalAllocation = Math.max(0, Number(cycle.goal_allocation || 0));
  const autoFillGoalAllocation = Math.max(
    0,
    remainingBeforeGoal - carryOverOut - budget.reserveAmount,
  );
  const debtPaymentTotal = Math.max(0, Number(debts.rows[0]?.total || 0));
  const manualOrDebtAllocation =
    !budget.autoFillEnabled && cycle.status === 'planned'
      ? debtPaymentTotal
      : savedGoalAllocation;
  const goalAllocation = budget.autoFillEnabled
    ? Math.max(autoFillGoalAllocation, debtPaymentTotal)
    : manualOrDebtAllocation;
  const remainingAmount = remainingBeforeGoal - goalAllocation - carryOverOut;
  const spendableAmount = Math.max(0, remainingAmount);

  const result = await db.query<CycleRow>(
    `UPDATE budget_cycles
     SET base_income = $1,
       extra_income = $2,
       total_income = $3,
       total_expenses = $4,
       reserve_amount = $5,
       goal_type = $6,
       goal_allocation = $7,
       carry_over_in = $8,
       spendable_amount = $9,
       remaining_amount = $10,
       updated_at = CURRENT_TIMESTAMP
     WHERE id = $11
     RETURNING *`,
    [
      baseIncome,
      extraIncome,
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
  const result = await db.query<CycleRow>(
    'SELECT * FROM budget_cycles WHERE budget_id = $1 ORDER BY cycle_index ASC',
    [budget.id],
  );
  return Promise.all(result.rows.map(cycle => syncCycleTotals(budget, cycle)));
}

async function loadBudgetDetail(budget: ReturnType<typeof toBudget>) {
  const [incomes, expenses, debts] = await Promise.all([
    db.query('SELECT * FROM incomes WHERE budget_id = $1 ORDER BY created_at ASC', [budget.id]),
    db.query('SELECT * FROM expenses WHERE budget_id = $1 ORDER BY due_date ASC, created_at ASC', [budget.id]),
    db.query('SELECT * FROM debts WHERE budget_id = $1 ORDER BY priority ASC, created_at ASC', [budget.id]),
  ]);
  const cycles = await loadCycles(budget);
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
      cycleType: 'cycle_type',
      cycleStart: 'cycle_start',
      cycleEnd: 'cycle_end',
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

    try {
      const existing = await getBudgetForUser(req.params.budgetId, req.userId!);
      if (!existing) {
        return res.status(404).json({success: false, message: 'Budget not found.'});
      }

      const values = updates.map(([, value]) => value);
      const assignments = updates
        .map(([key], index) => `${fieldMapping[key]} = $${index + 1}`)
        .join(', ');
      values.push(existing.id);

      const result = await db.query<BudgetRow>(
        `UPDATE budgets SET ${assignments}, updated_at = CURRENT_TIMESTAMP WHERE id = $${values.length} RETURNING *`,
        values,
      );
      const updatedBudget = toBudget(result.rows[0]);

      if (req.body.netPay !== undefined) {
        await db.query(
          `UPDATE budget_cycles
           SET base_income = $1,
             updated_at = CURRENT_TIMESTAMP
           WHERE budget_id = $2`,
          [updatedBudget.netPay, updatedBudget.id],
        );
      }

      if (req.body.autoFillEnabled === false) {
        const debtTotal = await db.query<{total: string}>(
          'SELECT COALESCE(SUM(minimum_payment), 0) AS total FROM debts WHERE budget_id = $1',
          [updatedBudget.id],
        );
        await db.query(
          `UPDATE budget_cycles
           SET goal_allocation = $1,
             updated_at = CURRENT_TIMESTAMP
           WHERE budget_id = $2`,
          [Number(debtTotal.rows[0]?.total || 0), updatedBudget.id],
        );
      }

      return res.status(200).json({
        success: true,
        message: 'Budget updated.',
        data: updatedBudget,
      });
    } catch (error) {
      console.error('Update budget error:', error);
      return res.status(500).json({success: false, message: 'Internal server error.'});
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

      const carryOverOut =
        req.body.carryOverOut === undefined
          ? Number(cycle.carry_over_out || 0)
          : Number(req.body.carryOverOut || 0);
      const goalAllocation =
        req.body.goalAllocation === undefined
          ? Number(cycle.goal_allocation || 0)
          : Number(req.body.goalAllocation || 0);
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

      await db.query(
        `UPDATE budget_cycles
         SET carry_over_out = $1,
           base_income = COALESCE($2, base_income),
           goal_allocation = $3,
           updated_at = CURRENT_TIMESTAMP
         WHERE id = $4`,
        [
          carryOverOut,
          req.body.baseIncome === undefined ? null : Number(req.body.baseIncome),
          goalAllocation,
          cycle.id,
        ],
      );

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
      db.query('SELECT id, name, balance, minimum_payment FROM debts WHERE budget_id = $1', [budget.id]),
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
