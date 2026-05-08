import {Router} from 'express';
import {body, validationResult} from 'express-validator';
import {v4 as uuidv4} from 'uuid';
import {authMiddleware, AuthRequest} from '../middleware/auth';
import db from '../db';

const router = Router({mergeParams: true});

function getBudget(budgetId: string, userId: string) {
  return db.prepare('SELECT id FROM budgets WHERE id = ? AND userId = ?').get(budgetId, userId);
}

function getDebt(debtId: string, budgetId: string) {
  return db.prepare('SELECT * FROM debts WHERE id = ? AND budgetId = ?').get(debtId, budgetId);
}

router.get('/', authMiddleware, (req: AuthRequest, res) => {
  const budget = getBudget(req.params.budgetId, req.userId);
  if (!budget) {
    return res.status(404).json({success: false, message: 'Budget not found.'});
  }

  const debts = db.prepare('SELECT * FROM debts WHERE budgetId = ?').all(budget.id);
  return res.status(200).json({success: true, data: debts});
});

router.post(
  '/',
  authMiddleware,
  body('name').isString().notEmpty(),
  body('balance').isFloat({gt: 0}),
  body('minimumPayment').optional().isFloat({min: 0}),
  body('interestRate').optional().isFloat({min: 0}),
  body('priority').optional().isInt({min: 1}),
  body('status').optional().isString(),
  (req: AuthRequest, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({success: false, errors: errors.array()});
    }

    const budget = getBudget(req.params.budgetId, req.userId);
    if (!budget) {
      return res.status(404).json({success: false, message: 'Budget not found.'});
    }

    const {name, balance, minimumPayment = 0, interestRate = 0, priority = 1, status = 'active'} = req.body;
    const id = uuidv4();
    const timestamp = new Date().toISOString();

    db.prepare(
      'INSERT INTO debts (id, budgetId, name, balance, minimumPayment, interestRate, priority, status, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    ).run(id, budget.id, name, balance, minimumPayment, interestRate, priority, status, timestamp, timestamp);

    const debt = getDebt(id, budget.id);
    return res.status(201).json({success: true, data: debt});
  },
);

router.patch(
  '/:debtId',
  authMiddleware,
  body('name').optional().isString(),
  body('balance').optional().isFloat({gt: 0}),
  body('minimumPayment').optional().isFloat({min: 0}),
  body('interestRate').optional().isFloat({min: 0}),
  body('priority').optional().isInt({min: 1}),
  body('status').optional().isString(),
  (req: AuthRequest, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({success: false, errors: errors.array()});
    }

    const budget = getBudget(req.params.budgetId, req.userId);
    if (!budget) {
      return res.status(404).json({success: false, message: 'Budget not found.'});
    }

    const debt = getDebt(req.params.debtId, budget.id);
    if (!debt) {
      return res.status(404).json({success: false, message: 'Debt not found.'});
    }

    const allowedFields = ['name', 'balance', 'minimumPayment', 'interestRate', 'priority', 'status'];
    const updates = Object.entries(req.body).reduce((acc, [key, value]) => {
      if (allowedFields.includes(key)) {
        acc[key] = value;
      }
      return acc;
    }, {} as Record<string, any>);

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({success: false, message: 'No valid fields provided.'});
    }

    const assignments = Object.keys(updates).map(key => `${key} = ?`).join(', ');
    const values = [...Object.values(updates), new Date().toISOString(), debt.id];

    db.prepare(`UPDATE debts SET ${assignments}, updatedAt = ? WHERE id = ?`).run(...values);

    const updatedDebt = getDebt(debt.id, budget.id);
    return res.status(200).json({success: true, data: updatedDebt});
  },
);

router.delete('/:debtId', authMiddleware, (req: AuthRequest, res) => {
  const budget = getBudget(req.params.budgetId, req.userId);
  if (!budget) {
    return res.status(404).json({success: false, message: 'Budget not found.'});
  }

  const debt = getDebt(req.params.debtId, budget.id);
  if (!debt) {
    return res.status(404).json({success: false, message: 'Debt not found.'});
  }

  db.prepare('DELETE FROM debts WHERE id = ?').run(debt.id);
  return res.status(204).send();
});

export default router;
