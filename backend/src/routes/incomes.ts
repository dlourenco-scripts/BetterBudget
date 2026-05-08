import {Router} from 'express';
import {body, validationResult} from 'express-validator';
import {v4 as uuidv4} from 'uuid';
import {authMiddleware, AuthRequest} from '../middleware/auth';
import db from '../db';

const router = Router({mergeParams: true});

function getBudget(budgetId: string, userId: string) {
  return db.prepare('SELECT id FROM budgets WHERE id = ? AND userId = ?').get(budgetId, userId);
}

function getIncome(incomeId: string, budgetId: string) {
  return db.prepare('SELECT * FROM incomes WHERE id = ? AND budgetId = ?').get(incomeId, budgetId);
}

router.get('/', authMiddleware, (req: AuthRequest, res) => {
  const budget = getBudget(req.params.budgetId, req.userId);
  if (!budget) {
    return res.status(404).json({success: false, message: 'Budget not found.'});
  }

  const incomes = db.prepare('SELECT * FROM incomes WHERE budgetId = ?').all(budget.id);
  return res.status(200).json({success: true, data: incomes});
});

router.post(
  '/',
  authMiddleware,
  body('name').isString().notEmpty(),
  body('amount').isFloat({gt: 0}),
  body('type').isString().notEmpty(),
  body('frequency').isString().notEmpty(),
  body('receivedDate').isString().notEmpty(),
  body('category').isString().notEmpty(),
  body('notes').optional().isString(),
  (req: AuthRequest, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({success: false, errors: errors.array()});
    }

    const budget = getBudget(req.params.budgetId, req.userId);
    if (!budget) {
      return res.status(404).json({success: false, message: 'Budget not found.'});
    }

    const {name, amount, type, frequency, receivedDate, category, notes = ''} = req.body;
    const id = uuidv4();
    const timestamp = new Date().toISOString();

    db.prepare(
      'INSERT INTO incomes (id, budgetId, name, amount, type, frequency, receivedDate, category, notes, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    ).run(id, budget.id, name, amount, type, frequency, receivedDate, category, notes, timestamp, timestamp);

    const income = getIncome(id, budget.id);
    return res.status(201).json({success: true, data: income});
  },
);

router.patch(
  '/:incomeId',
  authMiddleware,
  body('name').optional().isString(),
  body('amount').optional().isFloat({gt: 0}),
  body('type').optional().isString(),
  body('frequency').optional().isString(),
  body('receivedDate').optional().isString(),
  body('category').optional().isString(),
  body('notes').optional().isString(),
  (req: AuthRequest, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({success: false, errors: errors.array()});
    }

    const budget = getBudget(req.params.budgetId, req.userId);
    if (!budget) {
      return res.status(404).json({success: false, message: 'Budget not found.'});
    }

    const income = getIncome(req.params.incomeId, budget.id);
    if (!income) {
      return res.status(404).json({success: false, message: 'Income not found.'});
    }

    const allowedFields = ['name', 'amount', 'type', 'frequency', 'receivedDate', 'category', 'notes'];
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
    const values = [...Object.values(updates), new Date().toISOString(), income.id];

    db.prepare(`UPDATE incomes SET ${assignments}, updatedAt = ? WHERE id = ?`).run(...values);

    const updatedIncome = getIncome(income.id, budget.id);
    return res.status(200).json({success: true, data: updatedIncome});
  },
);

router.delete('/:incomeId', authMiddleware, (req: AuthRequest, res) => {
  const budget = getBudget(req.params.budgetId, req.userId);
  if (!budget) {
    return res.status(404).json({success: false, message: 'Budget not found.'});
  }

  const income = getIncome(req.params.incomeId, budget.id);
  if (!income) {
    return res.status(404).json({success: false, message: 'Income not found.'});
  }

  db.prepare('DELETE FROM incomes WHERE id = ?').run(income.id);
  return res.status(204).send();
});

export default router;
