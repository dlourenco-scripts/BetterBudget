import {Router} from 'express';
import {body, validationResult} from 'express-validator';
import {v4 as uuidv4} from 'uuid';
import db from '../db';
import {hashPassword, comparePassword, createToken} from '../utils/auth';

const router = Router();

function toAuthUser(user: any) {
  return {
    id: user.id,
    email: user.email,
    fullName: user.full_name || '',
    verified: user.verified,
    currency: user.currency,
    theme: user.theme,
    language: user.language,
    subscriptionPlan: user.subscription_plan,
    onboardingComplete: user.onboarding_complete,
    goalType: user.goal_type,
    savingsGoal: Number(user.savings_goal || 0),
  };
}

router.post(
  '/signup',
  body('email').isEmail(),
  body('password').isLength({min: 8}),
  body('currency').optional().isString(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({success: false, errors: errors.array()});
    }

    const {email, password, currency = 'USD'} = req.body;

    try {
      const existingUser = await db.query('SELECT id FROM users WHERE email = $1', [email]);
      if (existingUser.rows.length > 0) {
        return res.status(400).json({success: false, message: 'Email already exists.'});
      }

      const id = uuidv4();
      const passwordHash = hashPassword(password);
      const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

      await db.query(
        'INSERT INTO users (id, email, password_hash, verified, currency, verification_code) VALUES ($1, $2, $3, $4, $5, $6)',
        [id, email, passwordHash, false, currency, verificationCode]
      );

      if (process.env.NODE_ENV !== 'production') {
        console.log(`DEV VERIFICATION CODE for ${email}: ${verificationCode}`);
      }

      return res.status(201).json({
        success: true,
        message: 'Signup successful. Verification email sent.',
        data: {
          user: {
            id,
            email,
            fullName: '',
            verified: false,
            currency,
            goalType: 'save',
            savingsGoal: 0,
          },
        },
      });
    } catch (error) {
      console.error('Signup error:', error);
      return res.status(500).json({success: false, message: 'Internal server error.'});
    }
  },
);

router.post(
  '/login',
  body('email').isEmail(),
  body('password').exists(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({success: false, errors: errors.array()});
    }

    const {email, password} = req.body;

    try {
      const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);
      const user = result.rows[0];

      if (!user || !comparePassword(password, user.password_hash)) {
        return res.status(401).json({success: false, message: 'Invalid email or password.'});
      }

      if (!user.verified) {
        return res.status(403).json({
          success: false,
          message: 'Email not verified. Please verify your email before logging in.',
          data: {verified: false},
        });
      }

      const token = createToken(user.id);
      const refreshToken = createToken(user.id);

      return res.status(200).json({
        success: true,
        message: 'Login successful.',
        data: {
          token,
          refreshToken,
          user: toAuthUser(user),
        },
      });
    } catch (error) {
      console.error('Login error:', error);
      return res.status(500).json({success: false, message: 'Internal server error.'});
    }
  },
);

router.post(
  '/verify-email',
  body('email').isEmail(),
  body('code').isLength({min: 6, max: 6}),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({success: false, errors: errors.array()});
    }

    const {email, code} = req.body;

    try {
      const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);
      const user = result.rows[0];

      if (!user) {
        return res.status(404).json({success: false, message: 'User not found.'});
      }

      if (user.verified) {
        return res.status(200).json({success: true, message: 'Email already verified.'});
      }

      if (!user.verification_code || user.verification_code !== code) {
        return res.status(400).json({success: false, message: 'Invalid verification code.'});
      }

      await db.query(
        'UPDATE users SET verified = true, verification_code = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
        [user.id]
      );

      const verifiedUserResult = await db.query('SELECT * FROM users WHERE id = $1', [user.id]);
      const verifiedUser = verifiedUserResult.rows[0];
      const token = createToken(user.id);
      const refreshToken = createToken(user.id);

      return res.status(200).json({
        success: true,
        message: 'Email verified successfully.',
        data: {
          token,
          refreshToken,
          user: toAuthUser(verifiedUser),
        },
      });
    } catch (error) {
      console.error('Verify email error:', error);
      return res.status(500).json({success: false, message: 'Internal server error.'});
    }
  },
);

router.post(
  '/forgot-password',
  body('email').isEmail(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({success: false, errors: errors.array()});
    }

    const {email} = req.body;

    try {
      const result = await db.query('SELECT id FROM users WHERE email = $1', [email]);
      const user = result.rows[0];

      if (user) {
        const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
        await db.query(
          'UPDATE users SET reset_code = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
          [resetCode, user.id]
        );
        console.log(`Password reset code for ${email}: ${resetCode}`);
      }

      return res.status(200).json({
        success: true,
        message: 'If that email is registered, password reset instructions were sent.',
      });
    } catch (error) {
      console.error('Forgot password error:', error);
      return res.status(500).json({success: false, message: 'Internal server error.'});
    }
  },
);

router.post(
  '/reset-password',
  body('email').isEmail(),
  body('code').isLength({min: 6, max: 6}),
  body('password').isLength({min: 8}),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({success: false, errors: errors.array()});
    }

    const {email, code, password} = req.body;

    try {
      const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);
      const user = result.rows[0];

      if (!user) {
        return res.status(404).json({success: false, message: 'User not found.'});
      }

      if (!user.reset_code || user.reset_code !== code) {
        return res.status(400).json({success: false, message: 'Invalid reset code.'});
      }

      const passwordHash = hashPassword(password);
      await db.query(
        'UPDATE users SET password_hash = $1, reset_code = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [passwordHash, user.id]
      );

      return res.status(200).json({success: true, message: 'Password was reset successfully.'});
    } catch (error) {
      console.error('Reset password error:', error);
      return res.status(500).json({success: false, message: 'Internal server error.'});
    }
  },
);

export default router;
