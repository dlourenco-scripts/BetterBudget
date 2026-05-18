import {Router} from 'express';
import {body, validationResult} from 'express-validator';
import {v4 as uuidv4} from 'uuid';
import db from '../db';
import {hashPassword, comparePassword, createToken} from '../utils/auth';
import {sendPasswordResetEmail, sendVerificationEmail} from '../utils/email';

const router = Router();
const CODE_EXPIRATION_MINUTES = 15;
const skipEmailVerification = process.env.SKIP_EMAIL_VERIFICATION === 'true';

const emailValidator = body('email')
  .trim()
  .isEmail()
  .withMessage('Please enter a valid email address.')
  .bail()
  .toLowerCase();

function createCodeExpiration() {
  return new Date(Date.now() + CODE_EXPIRATION_MINUTES * 60 * 1000);
}

function createVerificationCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function isExpired(value?: Date | string | null) {
  return Boolean(value && new Date(value).getTime() < Date.now());
}

function devCodePayload(code: string) {
  return process.env.NODE_ENV !== 'production'
    ? {devVerificationCode: code}
    : {};
}

function toAuthUser(user: any) {
  return {
    id: user.id,
    email: user.email,
    fullName: user.full_name || '',
    profileImage: user.profile_image || '',
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
  emailValidator,
  body('password').isLength({min: 8}).withMessage('Password must be at least 8 characters.'),
  body('currency').optional().isString(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({success: false, errors: errors.array()});
    }

    const {email, password, currency = 'USD'} = req.body;

    try {
      const existingUser = await db.query('SELECT id, verified FROM users WHERE email = $1', [email]);
      if (existingUser.rows.length > 0) {
        if (existingUser.rows[0].verified) {
          return res.status(409).json({success: false, message: 'Email already exists.'});
        }

        if (skipEmailVerification) {
          await db.query(
            `UPDATE users
             SET password_hash = $1,
               currency = $2,
               verified = true,
               verification_code = NULL,
               verification_code_expires_at = NULL,
               updated_at = CURRENT_TIMESTAMP
             WHERE id = $3`,
            [hashPassword(password), currency, existingUser.rows[0].id],
          );

          return res.status(200).json({
            success: true,
            message: 'Account created. Email verification skipped for test mode.',
            data: {
              user: {
                id: existingUser.rows[0].id,
                email,
                fullName: '',
                verified: true,
                currency,
                goalType: 'save',
                savingsGoal: 0,
              },
            },
          });
        }

        const verificationCode = createVerificationCode();
        await db.query(
          `UPDATE users
           SET password_hash = $1,
             currency = $2,
             verification_code = $3,
             verification_code_expires_at = $4,
             updated_at = CURRENT_TIMESTAMP
           WHERE id = $5`,
          [hashPassword(password), currency, verificationCode, createCodeExpiration(), existingUser.rows[0].id],
        );

        await sendVerificationEmail(email, verificationCode);

        return res.status(200).json({
          success: true,
          message: 'Account already exists but is not verified. A new verification code was sent.',
          data: {
            ...devCodePayload(verificationCode),
            user: {
              id: existingUser.rows[0].id,
              email,
              fullName: '',
              verified: false,
              currency,
              goalType: 'save',
              savingsGoal: 0,
            },
          },
        });
      }

      const id = uuidv4();
      const passwordHash = hashPassword(password);
      const verificationCode = createVerificationCode();
      const isVerified = skipEmailVerification;

      await db.query(
        'INSERT INTO users (id, email, password_hash, verified, currency, verification_code, verification_code_expires_at) VALUES ($1, $2, $3, $4, $5, $6, $7)',
        [
          id,
          email,
          passwordHash,
          isVerified,
          currency,
          isVerified ? null : verificationCode,
          isVerified ? null : createCodeExpiration(),
        ]
      );

      if (!skipEmailVerification) {
        await sendVerificationEmail(email, verificationCode);
      }

      return res.status(201).json({
        success: true,
        message: skipEmailVerification
          ? 'Signup successful. Email verification skipped for test mode.'
          : 'Signup successful. Verification email sent.',
        data: {
          ...(skipEmailVerification ? {} : devCodePayload(verificationCode)),
          user: {
            id,
            email,
            fullName: '',
            verified: isVerified,
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
  emailValidator,
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
  emailValidator,
  body('code').isLength({min: 6, max: 6}).withMessage('Verification code must be 6 digits.'),
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

      if (isExpired(user.verification_code_expires_at)) {
        return res.status(400).json({
          success: false,
          message: 'Verification code expired. Please request a new code.',
        });
      }

      await db.query(
        'UPDATE users SET verified = true, verification_code = NULL, verification_code_expires_at = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
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
  '/resend-verification',
  emailValidator,
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({success: false, errors: errors.array()});
    }

    const {email} = req.body;

    try {
      const result = await db.query('SELECT id, verified FROM users WHERE email = $1', [email]);
      const user = result.rows[0];

      if (!user) {
        return res.status(404).json({success: false, message: 'User not found.'});
      }

      if (user.verified) {
        return res.status(200).json({success: true, message: 'Email is already verified.'});
      }

      const verificationCode = createVerificationCode();
      await db.query(
        `UPDATE users
         SET verification_code = $1,
           verification_code_expires_at = $2,
           updated_at = CURRENT_TIMESTAMP
         WHERE id = $3`,
        [verificationCode, createCodeExpiration(), user.id],
      );

      await sendVerificationEmail(email, verificationCode);

      return res.status(200).json({
        success: true,
        message: 'Verification code sent.',
        data: devCodePayload(verificationCode),
      });
    } catch (error) {
      console.error('Resend verification error:', error);
      return res.status(500).json({success: false, message: 'Internal server error.'});
    }
  },
);

router.post(
  '/forgot-password',
  emailValidator,
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
        const resetCode = createVerificationCode();
        await db.query(
          'UPDATE users SET reset_code = $1, reset_code_expires_at = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3',
          [resetCode, createCodeExpiration(), user.id]
        );
        await sendPasswordResetEmail(email, resetCode);
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
  emailValidator,
  body('code').isLength({min: 6, max: 6}).withMessage('Reset code must be 6 digits.'),
  body('password').isLength({min: 8}).withMessage('Password must be at least 8 characters.'),
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

      if (isExpired(user.reset_code_expires_at)) {
        return res.status(400).json({
          success: false,
          message: 'Reset code expired. Please request a new code.',
        });
      }

      const passwordHash = hashPassword(password);
      await db.query(
        'UPDATE users SET password_hash = $1, reset_code = NULL, reset_code_expires_at = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
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
