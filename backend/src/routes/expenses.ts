import {Router} from 'express';
import {body, validationResult} from 'express-validator';
import {v4 as uuidv4} from 'uuid';
import {authMiddleware, AuthRequest} from '../middleware/auth';
import db from '../db';

const router = Router({mergeParams: true});

function getBudget(budgetId: string, userId: string) {
  return db.prepare('SELECT id FROM budgets WHERE id = ? AND userId = ?').get(budgetId, userId);
}

function getExpense(expenseId: string, budgetId: string) {
  return db.prepare('SELECT * FROM expenses WHERE id = ? AND budgetId = ?').get(expenseId, budgetId);
}

router.get('/', authMiddleware, (req: AuthRequest, res) => {
  const budget = getBudget(req.params.budgetId, req.userId);
  if (!budget) {
    return res.status(404).json({success: false, message: 'Budget not found.'});
  }

  const expenses = db.prepare('SELECT * FROM expenses WHERE budgetId = ?').all(budget.id);
  return res.status(200).json({success: true, data: expenses});
});

router.post(
  '/',
  authMiddleware,
  body('name').isString().notEmpty(),
  body('amount').isFloat({gt: 0}),
  body('type').isString().notEmpty(),
  body('dueDate').isString().notEmpty(),
  body('category').isString().notEmpty(),
  body('priority').optional().isInt({min: 1}),
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

    const {name, amount, type, dueDate, category, priority = 1, notes = ''} = req.body;
    const id = uuidv4();
    const timestamp = new Date().toISOString();

    db.prepare(
      'INSERT INTO expenses (id, budgetId, name, amount, type, dueDate, category, priority, notes, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    ).run(id, budget.id, name, amount, type, dueDate, category, priority, notes, timestamp, timestamp);

    const expense = getExpense(id, budget.id);
    return res.status(201).json({success: true, data: expense});
  },
);

router.patch(
  '/:expenseId',
  authMiddleware,
  body('name').optional().isString(),
  body('amount').optional().isFloat({gt: 0}),
  body('type').optional().isString(),
  body('dueDate').optional().isString(),
  body('category').optional().isString(),
  body('priority').optional().isInt({min: 1}),
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

    const expense = getExpense(req.params.expenseId, budget.id);
    if (!expense) {
      return res.status(404).json({success: false, message: 'Expense not found.'});
    }

    const allowedFields = ['name', 'amount', 'type', 'dueDate', 'category', 'priority', 'notes'];
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
    const values = [...Object.values(updates), new Date().toISOString(), expense.id];

    db.prepare(`UPDATE expenses SET ${assignments}, updatedAt = ? WHERE id = ?`).run(...values);

    const updatedExpense = getExpense(expense.id, budget.id);
    return res.status(200).json({success: true, data: updatedExpense});
  },
);

router.delete('/:expenseId', authMiddleware, (req: AuthRequest, res) => {
  const budget = getBudget(req.params.budgetId, req.userId);
  if (!budget) {
    return res.status(404).json({success: false, message: 'Budget not found.'});
  }

  const expense = getExpense(req.params.expenseId, budget.id);
  if (!expense) {
    return res.status(404).json({success: false, message: 'Expense not found.'});
  }

  db.prepare('DELETE FROM expenses WHERE id = ?').run(expense.id);
  return res.status(204).send();
});

export default router;
