import {Router} from 'express';
import {body, validationResult} from 'express-validator';
import {authMiddleware, AuthRequest} from '../middleware/auth';
import db from '../db';

const router = Router();

function toUser(row: any) {
  return {
    id: row.id,
    email: row.email,
    fullName: row.full_name || '',
    verified: row.verified,
    currency: row.currency,
    theme: row.theme,
    language: row.language,
    paydayReminderEnabled: row.payday_reminder_enabled,
    paydayReminderTime: row.payday_reminder_time,
    subscriptionPlan: row.subscription_plan,
    onboardingComplete: row.onboarding_complete,
    goalType: row.goal_type,
    savingsGoal: Number(row.savings_goal || 0),
  };
}

router.get('/me', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const result = await db.query(
      'SELECT id, email, full_name, verified, currency, theme, language, payday_reminder_enabled, payday_reminder_time, subscription_plan, onboarding_complete, goal_type, savings_goal FROM users WHERE id = $1',
      [req.userId]
    );
    const user = result.rows[0];
    if (!user) {
      return res.status(404).json({success: false, message: 'User not found.'});
    }

    return res.status(200).json({success: true, data: toUser(user)});
  } catch (error) {
    console.error('Get user error:', error);
    return res.status(500).json({success: false, message: 'Internal server error.'});
  }
});

router.patch(
  '/me',
  authMiddleware,
  body('currency').optional().isString(),
  body('fullName').optional().isString(),
  body('theme').optional().isString(),
  body('language').optional().isString(),
  body('paydayReminderEnabled').optional().isBoolean(),
  body('paydayReminderTime').optional().isString(),
  body('goalType').optional().isString(),
  body('savingsGoal').optional().isFloat({min: 0}),
  body('onboardingComplete').optional().isBoolean(),
  async (req: AuthRequest, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({success: false, errors: errors.array()});
    }

    const fieldMapping: Record<string, string> = {
      currency: 'currency',
      fullName: 'full_name',
      theme: 'theme',
      language: 'language',
      paydayReminderEnabled: 'payday_reminder_enabled',
      paydayReminderTime: 'payday_reminder_time',
      goalType: 'goal_type',
      savingsGoal: 'savings_goal',
      onboardingComplete: 'onboarding_complete',
    };

    const updates: Record<string, any> = {};
    const values: any[] = [];
    let paramIndex = 1;

    for (const [key, value] of Object.entries(req.body)) {
      if (fieldMapping[key]) {
        const dbColumn = fieldMapping[key];
        const processedValue = (key === 'paydayReminderEnabled' || key === 'onboardingComplete') ? Boolean(value) : value;
        updates[dbColumn] = `$${paramIndex}`;
        values.push(processedValue);
        paramIndex++;
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({success: false, message: 'No valid fields provided.'});
    }

    try {
      const assignments = Object.entries(updates).map(([col, val]) => `${col} = ${val}`).join(', ');
      values.push(req.userId);
      const query = `UPDATE users SET ${assignments}, updated_at = CURRENT_TIMESTAMP WHERE id = $${paramIndex}`;

      await db.query(query, values);

      const result = await db.query(
        'SELECT id, email, full_name, verified, currency, theme, language, payday_reminder_enabled, payday_reminder_time, subscription_plan, onboarding_complete, goal_type, savings_goal FROM users WHERE id = $1',
        [req.userId]
      );
      const user = result.rows[0];

      return res.status(200).json({success: true, message: 'User settings updated.', data: toUser(user)});
    } catch (error) {
      console.error('Update user error:', error);
      return res.status(500).json({success: false, message: 'Internal server error.'});
    }
  },
);

export default router;
