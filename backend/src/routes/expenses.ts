import {Router} from 'express';
import {body, validationResult} from 'express-validator';
import {v4 as uuidv4} from 'uuid';
import {authMiddleware, AuthRequest} from '../middleware/auth';
import db from '../db';
import {rejectInactiveBudget} from '../utils/budgetGuards';
import {normalizePriorityInput} from '../utils/priority';

const router = Router({mergeParams: true});

const dateField = (field: string) =>
  body(field).isISO8601({strict: true}).withMessage(`${field} must be a valid date.`);

const optionalDateField = (field: string) =>
  body(field).optional().isISO8601({strict: true}).withMessage(`${field} must be a valid date.`);

type ExpenseRow = {
  id: string;
  budget_id: string;
  name: string;
  amount: string;
  type: string;
  frequency: string;
  due_date: Date | string;
  category: string;
  priority: number;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
};

function toExpense(row: ExpenseRow) {
  return {
    id: row.id,
    budgetId: row.budget_id,
    name: row.name,
    amount: Number(row.amount),
    type: row.type,
    frequency: row.frequency,
    dueDate: row.due_date,
    category: row.category,
    priority: row.priority,
    notes: row.notes || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function getBudget(budgetId: string, userId: string) {
  const result = await db.query('SELECT id, status FROM budgets WHERE id = $1 AND user_id = $2', [
    budgetId,
    userId,
  ]);
  return result.rows[0] || null;
}

async function getExpense(expenseId: string, budgetId: string) {
  const result = await db.query<ExpenseRow>(
    'SELECT * FROM expenses WHERE id = $1 AND budget_id = $2',
    [expenseId, budgetId],
  );
  return result.rows[0] ? toExpense(result.rows[0]) : null;
}

router.get('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const budget = await getBudget(req.params.budgetId!, req.userId!);
    if (!budget) {
      return res.status(404).json({success: false, message: 'Budget not found.'});
    }

    const expenses = await db.query<ExpenseRow>(
      'SELECT * FROM expenses WHERE budget_id = $1 ORDER BY due_date ASC, created_at ASC',
      [budget.id],
    );
    return res.status(200).json({success: true, data: expenses.rows.map(toExpense)});
  } catch (error) {
    console.error('List expenses error:', error);
    return res.status(500).json({success: false, message: 'Internal server error.'});
  }
});

router.post(
  '/',
  authMiddleware,
  body('name').isString().notEmpty(),
  body('amount').isFloat({gt: 0}),
  body('type').isString().notEmpty(),
  body('frequency').optional().isString(),
  dateField('dueDate'),
  body('category').isString().notEmpty(),
  body('priority').optional().customSanitizer(normalizePriorityInput).isInt({min: 1}),
  body('notes').optional().isString(),
  async (req: AuthRequest, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({success: false, errors: errors.array()});
    }

    try {
      const budget = await getBudget(req.params.budgetId!, req.userId!);
      if (!budget) {
        return res.status(404).json({success: false, message: 'Budget not found.'});
      }
      if (rejectInactiveBudget(res, budget)) {
        return;
      }

      const {
        name,
        amount,
        type,
        frequency = 'Every Pay Cycle',
        dueDate,
        category,
        priority = 1,
        notes = '',
      } = req.body;
      const id = uuidv4();

      const result = await db.query<ExpenseRow>(
        `INSERT INTO expenses
          (id, budget_id, name, amount, type, frequency, due_date, category, priority, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING *`,
        [id, budget.id, name, amount, type, frequency, dueDate, category, priority, notes],
      );

      return res.status(201).json({success: true, data: toExpense(result.rows[0])});
    } catch (error) {
      console.error('Create expense error:', error);
      return res.status(500).json({success: false, message: 'Internal server error.'});
    }
  },
);

router.patch(
  '/:expenseId',
  authMiddleware,
  body('name').optional().isString(),
  body('amount').optional().isFloat({gt: 0}),
  body('type').optional().isString(),
  body('frequency').optional().isString(),
  optionalDateField('dueDate'),
  body('category').optional().isString(),
  body('priority').optional().customSanitizer(normalizePriorityInput).isInt({min: 1}),
  body('notes').optional().isString(),
  async (req: AuthRequest, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({success: false, errors: errors.array()});
    }

    const fieldMapping: Record<string, string> = {
      name: 'name',
      amount: 'amount',
      type: 'type',
      frequency: 'frequency',
      dueDate: 'due_date',
      category: 'category',
      priority: 'priority',
      notes: 'notes',
    };

    const updates = Object.entries(req.body).filter(([key]) => fieldMapping[key]);
    if (updates.length === 0) {
      return res.status(400).json({success: false, message: 'No valid fields provided.'});
    }

    try {
      const budget = await getBudget(req.params.budgetId!, req.userId!);
      if (!budget) {
        return res.status(404).json({success: false, message: 'Budget not found.'});
      }
      if (rejectInactiveBudget(res, budget)) {
        return;
      }

      const expense = await getExpense(req.params.expenseId!, budget.id);
      if (!expense) {
        return res.status(404).json({success: false, message: 'Expense not found.'});
      }

      const values = updates.map(([, value]) => value);
      const assignments = updates
        .map(([key], index) => `${fieldMapping[key]} = $${index + 1}`)
        .join(', ');
      values.push(expense.id);

      const result = await db.query<ExpenseRow>(
        `UPDATE expenses SET ${assignments}, updated_at = CURRENT_TIMESTAMP WHERE id = $${values.length} RETURNING *`,
        values,
      );

      return res.status(200).json({success: true, data: toExpense(result.rows[0])});
    } catch (error) {
      console.error('Update expense error:', error);
      return res.status(500).json({success: false, message: 'Internal server error.'});
    }
  },
);

router.delete('/:expenseId', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const budget = await getBudget(req.params.budgetId!, req.userId!);
    if (!budget) {
      return res.status(404).json({success: false, message: 'Budget not found.'});
    }
    if (rejectInactiveBudget(res, budget)) {
      return;
    }

    const expense = await getExpense(req.params.expenseId!, budget.id);
    if (!expense) {
      return res.status(404).json({success: false, message: 'Expense not found.'});
    }

    await db.query('DELETE FROM expenses WHERE id = $1', [expense.id]);
    return res.status(204).send();
  } catch (error) {
    console.error('Delete expense error:', error);
    return res.status(500).json({success: false, message: 'Internal server error.'});
  }
});

export default router;
