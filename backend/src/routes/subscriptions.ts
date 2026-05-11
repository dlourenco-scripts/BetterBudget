import {Router} from 'express';
import {body, validationResult} from 'express-validator';
import {authMiddleware, AuthRequest} from '../middleware/auth';
import db from '../db';

const router = Router();

router.get('/status', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const result = await db.query('SELECT subscription_plan FROM users WHERE id = $1', [req.userId]);
    const user = result.rows[0];
    if (!user) {
      return res.status(404).json({success: false, message: 'User not found.'});
    }

    return res.status(200).json({
      success: true,
      data: {
        plan: user.subscription_plan,
        renewalDate: null,
        billingCycle: null,
        entitlements:
          user.subscription_plan === 'pro'
            ? ['premium_budget', 'forecast', 'sharing']
            : ['standard_budget'],
      },
    });
  } catch (error) {
    console.error('Subscription status error:', error);
    return res.status(500).json({success: false, message: 'Internal server error.'});
  }
});

router.post(
  '/subscribe',
  authMiddleware,
  body('plan').isString().notEmpty(),
  async (req: AuthRequest, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({success: false, errors: errors.array()});
    }

    const {plan} = req.body;
    const allowedPlans = ['free', 'monthly', 'yearly', 'pro'];
    if (!allowedPlans.includes(plan)) {
      return res.status(400).json({success: false, message: 'Invalid subscription plan.'});
    }

    try {
      await db.query(
        'UPDATE users SET subscription_plan = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [plan, req.userId],
      );
    } catch (error) {
      console.error('Subscribe error:', error);
      return res.status(500).json({success: false, message: 'Internal server error.'});
    }

    return res.status(200).json({
      success: true,
      message: 'Subscription updated successfully.',
      data: {
        plan,
        renewalDate: null,
        billingCycle: plan === 'monthly' ? 'monthly' : plan === 'yearly' ? 'yearly' : null,
      },
    });
  },
);

export default router;
