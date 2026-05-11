import {Router} from 'express';
import {body, validationResult} from 'express-validator';
import {v4 as uuidv4} from 'uuid';
import {authMiddleware, AuthRequest} from '../middleware/auth';
import db from '../db';

const router = Router({mergeParams: true});

type IncomeRow = {
  id: string;
  budget_id: string;
  name: string;
  amount: string;
  type: string;
  frequency: string;
  received_date: Date | string;
  category: string;
  notes: string | null;
  is_primary: boolean;
  created_at: Date;
  updated_at: Date;
};

function toIncome(row: IncomeRow) {
  return {
    id: row.id,
    budgetId: row.budget_id,
    name: row.name,
    amount: Number(row.amount),
    type: row.type,
    frequency: row.frequency,
    receivedDate: row.received_date,
    category: row.category,
    notes: row.notes || '',
    isPrimary: row.is_primary,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function getBudget(budgetId: string, userId: string) {
  const result = await db.query('SELECT id FROM budgets WHERE id = $1 AND user_id = $2', [
    budgetId,
    userId,
  ]);
  return result.rows[0] || null;
}

async function getIncome(incomeId: string, budgetId: string) {
  const result = await db.query<IncomeRow>(
    'SELECT * FROM incomes WHERE id = $1 AND budget_id = $2',
    [incomeId, budgetId],
  );
  return result.rows[0] ? toIncome(result.rows[0]) : null;
}

router.get('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const budget = await getBudget(req.params.budgetId!, req.userId!);
    if (!budget) {
      return res.status(404).json({success: false, message: 'Budget not found.'});
    }

    const incomes = await db.query<IncomeRow>(
      'SELECT * FROM incomes WHERE budget_id = $1 ORDER BY created_at ASC',
      [budget.id],
    );
    return res.status(200).json({success: true, data: incomes.rows.map(toIncome)});
  } catch (error) {
    console.error('List incomes error:', error);
    return res.status(500).json({success: false, message: 'Internal server error.'});
  }
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
  body('isPrimary').optional().isBoolean(),
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

      const {name, amount, type, frequency, receivedDate, category, notes = '', isPrimary = false} = req.body;
      const id = uuidv4();

      const result = await db.query<IncomeRow>(
        `INSERT INTO incomes
          (id, budget_id, name, amount, type, frequency, received_date, category, notes, is_primary)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING *`,
        [id, budget.id, name, amount, type, frequency, receivedDate, category, notes, isPrimary],
      );

      return res.status(201).json({success: true, data: toIncome(result.rows[0])});
    } catch (error) {
      console.error('Create income error:', error);
      return res.status(500).json({success: false, message: 'Internal server error.'});
    }
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
  body('isPrimary').optional().isBoolean(),
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
      receivedDate: 'received_date',
      category: 'category',
      notes: 'notes',
      isPrimary: 'is_primary',
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

      const income = await getIncome(req.params.incomeId!, budget.id);
      if (!income) {
        return res.status(404).json({success: false, message: 'Income not found.'});
      }

      const values = updates.map(([, value]) => value);
      const assignments = updates
        .map(([key], index) => `${fieldMapping[key]} = $${index + 1}`)
        .join(', ');
      values.push(income.id);

      const result = await db.query<IncomeRow>(
        `UPDATE incomes SET ${assignments}, updated_at = CURRENT_TIMESTAMP WHERE id = $${values.length} RETURNING *`,
        values,
      );

      return res.status(200).json({success: true, data: toIncome(result.rows[0])});
    } catch (error) {
      console.error('Update income error:', error);
      return res.status(500).json({success: false, message: 'Internal server error.'});
    }
  },
);

router.delete('/:incomeId', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const budget = await getBudget(req.params.budgetId!, req.userId!);
    if (!budget) {
      return res.status(404).json({success: false, message: 'Budget not found.'});
    }

    const income = await getIncome(req.params.incomeId!, budget.id);
    if (!income) {
      return res.status(404).json({success: false, message: 'Income not found.'});
    }

    await db.query('DELETE FROM incomes WHERE id = $1', [income.id]);
    return res.status(204).send();
  } catch (error) {
    console.error('Delete income error:', error);
    return res.status(500).json({success: false, message: 'Internal server error.'});
  }
});

export default router;
