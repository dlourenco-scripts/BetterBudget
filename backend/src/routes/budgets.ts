import {Router} from 'express';
import {body, validationResult} from 'express-validator';
import {v4 as uuidv4} from 'uuid';
import {authMiddleware, AuthRequest} from '../middleware/auth';
import db from '../db';
import incomesRouter from './incomes';
import expensesRouter from './expenses';
import debtsRouter from './debts';

const router = Router();

function loadBudgetDetail(budget: any) {
  const incomes = db.prepare('SELECT * FROM incomes WHERE budgetId = ?').all(budget.id);
  const expenses = db.prepare('SELECT * FROM expenses WHERE budgetId = ?').all(budget.id);
  const debts = db.prepare('SELECT * FROM debts WHERE budgetId = ?').all(budget.id);
  return {...budget, incomes, expenses, debts};
}

function getBudgetForUser(budgetId: string, userId: string) {
  return db.prepare('SELECT * FROM budgets WHERE id = ? AND userId = ?').get(budgetId, userId);
}

router.use('/:budgetId/incomes', incomesRouter);
router.use('/:budgetId/expenses', expensesRouter);
router.use('/:budgetId/debts', debtsRouter);

router.get('/', authMiddleware, (req: AuthRequest, res) => {
  const budgets = db.prepare('SELECT * FROM budgets WHERE userId = ?').all(req.userId);
  return res.status(200).json({success: true, data: budgets});
});

router.post(
  '/',
  authMiddleware,
  body('name').isString().notEmpty(),
  body('netPay').isFloat({gt: 0}),
  body('cycleType').isString().notEmpty(),
  body('cycleStart').isString().notEmpty(),
  body('cycleEnd').isString().notEmpty(),
  body('reserveAmount').optional().isFloat({min: 0}),
  body('goalType').optional().isString(),
  body('autoFillEnabled').optional().isBoolean(),
  (req: AuthRequest, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({success: false, errors: errors.array()});
    }

    const {name, netPay, cycleType, cycleStart, cycleEnd, reserveAmount = 0, goalType = 'save', autoFillEnabled = false} = req.body;
    const id = uuidv4();
    const timestamp = new Date().toISOString();

    db.prepare(
      'INSERT INTO budgets (id, userId, name, netPay, cycleType, cycleStart, cycleEnd, reserveAmount, goalType, autoFillEnabled, status, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    ).run(id, req.userId, name, netPay, cycleType, cycleStart, cycleEnd, reserveAmount, goalType, autoFillEnabled ? 1 : 0, 'active', timestamp, timestamp);

    const budget = getBudgetForUser(id, req.userId);
    return res.status(201).json({success: true, data: budget});
  },
);

router.get('/:budgetId', authMiddleware, (req: AuthRequest, res) => {
  const budget = getBudgetForUser(req.params.budgetId, req.userId);
  if (!budget) {
    return res.status(404).json({success: false, message: 'Budget not found.'});
  }

  return res.status(200).json({success: true, data: loadBudgetDetail(budget)});
});

router.patch(
  '/:budgetId',
  authMiddleware,
  body('name').optional().isString(),
  body('netPay').optional().isFloat({gt: 0}),
  body('cycleType').optional().isString(),
  body('cycleStart').optional().isString(),
  body('cycleEnd').optional().isString(),
  body('reserveAmount').optional().isFloat({min: 0}),
  body('goalType').optional().isString(),
  body('autoFillEnabled').optional().isBoolean(),
  body('status').optional().isString(),
  (req: AuthRequest, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({success: false, errors: errors.array()});
    }

    const budget = getBudgetForUser(req.params.budgetId, req.userId);
    if (!budget) {
      return res.status(404).json({success: false, message: 'Budget not found.'});
    }

    const allowedFields = ['name', 'netPay', 'cycleType', 'cycleStart', 'cycleEnd', 'reserveAmount', 'goalType', 'autoFillEnabled', 'status'];
    const updates = Object.entries(req.body).reduce((acc, [key, value]) => {
      if (allowedFields.includes(key)) {
        acc[key] = key === 'autoFillEnabled' ? (value ? 1 : 0) : value;
      }
      return acc;
    }, {} as Record<string, any>);

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({success: false, message: 'No valid fields provided.'});
    }

    const assignments = Object.keys(updates).map(key => `${key} = ?`).join(', ');
    const values = [...Object.values(updates), new Date().toISOString(), budget.id];

    db.prepare(`UPDATE budgets SET ${assignments}, updatedAt = ? WHERE id = ?`).run(...values);

    const updatedBudget = getBudgetForUser(budget.id, req.userId);
    return res.status(200).json({success: true, message: 'Budget updated.', data: updatedBudget});
  },
);

router.delete('/:budgetId', authMiddleware, (req: AuthRequest, res) => {
  const budget = getBudgetForUser(req.params.budgetId, req.userId);
  if (!budget) {
    return res.status(404).json({success: false, message: 'Budget not found.'});
  }

  db.prepare('DELETE FROM budgets WHERE id = ?').run(budget.id);
  return res.status(204).send();
});

router.get('/:budgetId/forecast', authMiddleware, (req: AuthRequest, res) => {
  const budget = getBudgetForUser(req.params.budgetId, req.userId);
  if (!budget) {
    return res.status(404).json({success: false, message: 'Budget not found.'});
  }

  const incomes = db.prepare('SELECT * FROM incomes WHERE budgetId = ?').all(budget.id);
  const expenses = db.prepare('SELECT * FROM expenses WHERE budgetId = ?').all(budget.id);
  const debts = db.prepare('SELECT * FROM debts WHERE budgetId = ?').all(budget.id);

  const totalIncome = incomes.reduce((sum: number, item: any) => sum + Number(item.amount), 0);
  const totalExpenses = expenses.reduce((sum: number, item: any) => sum + Number(item.amount), 0);
  const availableForGoals = Math.max(0, totalIncome - totalExpenses - Number(budget.reserveAmount));

  const savingsProjection = {
    monthlyAllocation: availableForGoals,
    projectedDate: availableForGoals > 0 ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10) : null,
  };

  const debtProjection = debts.map((debt: any) => {
    const monthlyPayment = Math.max(Number(debt.minimumPayment), availableForGoals / Math.max(debts.length, 1));
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
});

export default router;
