import {Router} from 'express';
import {body, validationResult} from 'express-validator';
import {v4 as uuidv4} from 'uuid';
import {authMiddleware, AuthRequest} from '../middleware/auth';
import db from '../db';

const router = Router({mergeParams: true});

type DebtRow = {
  id: string;
  budget_id: string;
  name: string;
  balance: string;
  minimum_payment: string;
  interest_rate: string;
  priority: number;
  status: string;
  created_at: Date;
  updated_at: Date;
};

function toDebt(row: DebtRow) {
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

async function getBudget(budgetId: string, userId: string) {
  const result = await db.query('SELECT id, goal_type FROM budgets WHERE id = $1 AND user_id = $2', [
    budgetId,
    userId,
  ]);
  return result.rows[0] || null;
}

async function getDebt(debtId: string, budgetId: string) {
  const result = await db.query<DebtRow>(
    'SELECT * FROM debts WHERE id = $1 AND budget_id = $2',
    [debtId, budgetId],
  );
  return result.rows[0] ? toDebt(result.rows[0]) : null;
}

router.get('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const budget = await getBudget(req.params.budgetId!, req.userId!);
    if (!budget) {
      return res.status(404).json({success: false, message: 'Budget not found.'});
    }

    const debts = await db.query<DebtRow>(
      'SELECT * FROM debts WHERE budget_id = $1 ORDER BY priority ASC, created_at ASC',
      [budget.id],
    );
    return res.status(200).json({success: true, data: debts.rows.map(toDebt)});
  } catch (error) {
    console.error('List debts error:', error);
    return res.status(500).json({success: false, message: 'Internal server error.'});
  }
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

      const {name, balance, minimumPayment = 0, interestRate = 0, priority = 1, status = 'active'} = req.body;
      const id = uuidv4();

      const result = await db.query<DebtRow>(
        `INSERT INTO debts
          (id, budget_id, name, balance, minimum_payment, interest_rate, priority, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [id, budget.id, name, balance, minimumPayment, interestRate, priority, status],
      );

      return res.status(201).json({success: true, data: toDebt(result.rows[0])});
    } catch (error) {
      console.error('Create debt error:', error);
      return res.status(500).json({success: false, message: 'Internal server error.'});
    }
  },
);

router.patch(
  '/:debtId',
  authMiddleware,
  body('name').optional().isString(),
  body('balance').optional().isFloat({min: 0}),
  body('minimumPayment').optional().isFloat({min: 0}),
  body('interestRate').optional().isFloat({min: 0}),
  body('priority').optional().isInt({min: 1}),
  body('status').optional().isString(),
  async (req: AuthRequest, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({success: false, errors: errors.array()});
    }

    const fieldMapping: Record<string, string> = {
      name: 'name',
      balance: 'balance',
      minimumPayment: 'minimum_payment',
      interestRate: 'interest_rate',
      priority: 'priority',
      status: 'status',
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

      const debt = await getDebt(req.params.debtId!, budget.id);
      if (!debt) {
        return res.status(404).json({success: false, message: 'Debt not found.'});
      }

      const values = updates.map(([, value]) => value);
      const assignments = updates
        .map(([key], index) => `${fieldMapping[key]} = $${index + 1}`)
        .join(', ');
      values.push(debt.id);

      const result = await db.query<DebtRow>(
        `UPDATE debts SET ${assignments}, updated_at = CURRENT_TIMESTAMP WHERE id = $${values.length} RETURNING *`,
        values,
      );

      return res.status(200).json({success: true, data: toDebt(result.rows[0])});
    } catch (error) {
      console.error('Update debt error:', error);
      return res.status(500).json({success: false, message: 'Internal server error.'});
    }
  },
);

router.delete('/:debtId', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const budget = await getBudget(req.params.budgetId!, req.userId!);
    if (!budget) {
      return res.status(404).json({success: false, message: 'Budget not found.'});
    }

    const debt = await getDebt(req.params.debtId!, budget.id);
    if (!debt) {
      return res.status(404).json({success: false, message: 'Debt not found.'});
    }

    await db.query('DELETE FROM debts WHERE id = $1', [debt.id]);
    const remainingDebts = await db.query<{count: string}>(
      "SELECT COUNT(*) FROM debts WHERE budget_id = $1 AND status NOT IN ('paid_off', 'archived')",
      [budget.id],
    );
    if (Number(remainingDebts.rows[0]?.count || 0) === 0) {
      await db.query(
        "UPDATE budgets SET goal_type = 'save', updated_at = CURRENT_TIMESTAMP WHERE id = $1",
        [budget.id],
      );
    }
    return res.status(204).send();
  } catch (error) {
    console.error('Delete debt error:', error);
    return res.status(500).json({success: false, message: 'Internal server error.'});
  }
});

export default router;
