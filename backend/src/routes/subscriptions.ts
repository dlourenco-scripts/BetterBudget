import {Router} from 'express';
import {body, validationResult} from 'express-validator';
import {authMiddleware, AuthRequest} from '../middleware/auth';
import db from '../db';

const router = Router();

router.get('/status', authMiddleware, (req: AuthRequest, res) => {
  const user = db.prepare('SELECT subscriptionPlan FROM users WHERE id = ?').get(req.userId);
  if (!user) {
    return res.status(404).json({success: false, message: 'User not found.'});
  }

  return res.status(200).json({
    success: true,
    data: {
      plan: user.subscriptionPlan,
      renewalDate: null,
      billingCycle: null,
      entitlements: user.subscriptionPlan === 'pro' ? ['premium_budget', 'forecast', 'sharing'] : ['standard_budget'],
    },
  });
});

router.post(
  '/subscribe',
  authMiddleware,
  body('plan').isString().notEmpty(),
  (req: AuthRequest, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({success: false, errors: errors.array()});
    }

    const {plan} = req.body;
    const allowedPlans = ['free', 'monthly', 'yearly', 'pro'];
    if (!allowedPlans.includes(plan)) {
      return res.status(400).json({success: false, message: 'Invalid subscription plan.'});
    }

    db.prepare('UPDATE users SET subscriptionPlan = ?, updatedAt = ? WHERE id = ?').run(plan, new Date().toISOString(), req.userId);

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
