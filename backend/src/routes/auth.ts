import {Router} from 'express';
import {body, validationResult} from 'express-validator';
import {v4 as uuidv4} from 'uuid';
import crypto from 'crypto';
import db from '../db';
import {hashPassword, comparePassword, createToken} from '../utils/auth';
import {sendPasswordResetEmail, sendVerificationEmail} from '../utils/email';

const router = Router();
const CODE_EXPIRATION_MINUTES = 15;
const RESEND_COOLDOWN_SECONDS = Number(process.env.AUTH_CODE_RESEND_COOLDOWN_SECONDS || 60);
const skipEmailVerification = process.env.SKIP_EMAIL_VERIFICATION === 'true';
const APPLE_ISSUER = 'https://appleid.apple.com';
const GOOGLE_TOKENINFO_URL = 'https://oauth2.googleapis.com/tokeninfo';
const APPLE_KEYS_URL = 'https://appleid.apple.com/auth/keys';

const emailValidator = body('email')
  .trim()
  .isEmail()
  .withMessage('Please enter a valid email address.')
  .bail()
  .toLowerCase();

function createCodeExpiration() {
  return new Date(Date.now() + CODE_EXPIRATION_MINUTES * 60 * 1000);
}

function createCodeSentAt() {
  return new Date();
}

function createVerificationCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function isExpired(value?: Date | string | null) {
  return Boolean(value && new Date(value).getTime() < Date.now());
}

function secondsUntilResendAllowed(value?: Date | string | null) {
  if (!value || RESEND_COOLDOWN_SECONDS <= 0) {
    return 0;
  }

  const elapsedSeconds = Math.floor((Date.now() - new Date(value).getTime()) / 1000);
  return Math.max(0, RESEND_COOLDOWN_SECONDS - elapsedSeconds);
}

function devCodePayload(code: string) {
  return process.env.NODE_ENV !== 'production'
    ? {devVerificationCode: code}
    : {};
}

function devResetCodePayload(code: string) {
  return process.env.NODE_ENV !== 'production'
    ? {devResetCode: code}
    : {};
}

function validationErrorResponse(reqErrors: ReturnType<typeof validationResult>) {
  const firstError = reqErrors.array()[0];
  return {
    success: false,
    message: firstError?.msg || 'Please check the submitted information and try again.',
    errors: reqErrors.array(),
  };
}

function emailDeliveryErrorResponse(res: any, purpose: 'verification' | 'reset') {
  const subject = purpose === 'verification' ? 'verification email' : 'password reset email';
  return res.status(503).json({
    success: false,
    code: 'email_delivery_failed',
    message: `We could not send the ${subject}. Please try again in a few minutes.`,
  });
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

type SocialProvider = 'google' | 'apple';

type SocialIdentity = {
  provider: SocialProvider;
  providerUserId: string;
  email: string;
  emailVerified: boolean;
  fullName?: string;
  profileImage?: string;
};

function configuredAudiences(provider: SocialProvider) {
  const values =
    provider === 'google'
      ? [
          process.env.GOOGLE_CLIENT_IDS,
          process.env.GOOGLE_WEB_CLIENT_ID,
          process.env.GOOGLE_IOS_CLIENT_ID,
          process.env.GOOGLE_ANDROID_CLIENT_ID,
        ]
      : [
          process.env.APPLE_CLIENT_ID,
          process.env.APPLE_BUNDLE_ID,
          process.env.IOS_BUNDLE_ID,
          process.env.EXPO_PUBLIC_APPLE_CLIENT_ID,
          'com.betterbudget.app',
        ];

  return values
    .flatMap(value => String(value || '').split(','))
    .map(value => value.trim())
    .filter(Boolean);
}

function decodeBase64Url(value: string) {
  return Buffer.from(value.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
}

function decodeJwtPart(token: string, partIndex: number) {
  const part = token.split('.')[partIndex];
  if (!part) {
    throw new Error('Invalid identity token.');
  }
  return JSON.parse(decodeBase64Url(part).toString('utf8'));
}

function isAudienceAllowed(audience: string | string[], allowedAudiences: string[]) {
  const audiences = Array.isArray(audience) ? audience : [audience];
  return audiences.some(item => allowedAudiences.includes(item));
}

function socialConfigError(provider: SocialProvider) {
  return `${provider === 'google' ? 'Google' : 'Apple'} login is not configured.`;
}

async function verifyGoogleIdentityToken(idToken: string): Promise<SocialIdentity> {
  const allowedAudiences = configuredAudiences('google');
  if (allowedAudiences.length === 0) {
    throw new Error(socialConfigError('google'));
  }

  const response = await fetch(`${GOOGLE_TOKENINFO_URL}?id_token=${encodeURIComponent(idToken)}`);
  const payload: any = await response.json();
  if (!response.ok) {
    throw new Error(payload?.error_description || 'Google sign-in token could not be verified.');
  }

  if (!payload.sub || !payload.email || !isAudienceAllowed(payload.aud, allowedAudiences)) {
    throw new Error('Google sign-in token is not valid for this app.');
  }

  const emailVerified = payload.email_verified === true || payload.email_verified === 'true';
  if (!emailVerified) {
    throw new Error('Google account email is not verified.');
  }

  return {
    provider: 'google',
    providerUserId: String(payload.sub),
    email: String(payload.email).toLowerCase(),
    emailVerified,
    fullName: payload.name,
    profileImage: payload.picture,
  };
}

async function verifyAppleIdentityToken(idToken: string): Promise<SocialIdentity> {
  const allowedAudiences = configuredAudiences('apple');
  const header = decodeJwtPart(idToken, 0);
  const payload = decodeJwtPart(idToken, 1);
  const response = await fetch(APPLE_KEYS_URL);
  const keysPayload: any = await response.json();
  if (!response.ok) {
    throw new Error('Apple sign-in keys could not be loaded.');
  }

  const key = keysPayload.keys?.find((candidate: any) => candidate.kid === header.kid);
  if (!key) {
    throw new Error('Apple sign-in token key was not recognized.');
  }

  const [encodedHeader, encodedPayload, encodedSignature] = idToken.split('.');
  const verifier = crypto.createVerify('RSA-SHA256');
  verifier.update(`${encodedHeader}.${encodedPayload}`);
  verifier.end();
  const publicKey = crypto.createPublicKey({key, format: 'jwk'});
  const signature = decodeBase64Url(encodedSignature);
  const signatureIsValid = verifier.verify(
    publicKey,
    new Uint8Array(signature.buffer, signature.byteOffset, signature.byteLength),
  );

  if (
    !signatureIsValid ||
    payload.iss !== APPLE_ISSUER ||
    !payload.sub ||
    !isAudienceAllowed(payload.aud, allowedAudiences) ||
    Number(payload.exp || 0) * 1000 < Date.now()
  ) {
    throw new Error('Apple sign-in token is not valid for this app.');
  }

  const emailVerified = payload.email_verified === true || payload.email_verified === 'true';

  return {
    provider: 'apple',
    providerUserId: String(payload.sub),
    email: payload.email ? String(payload.email).toLowerCase() : '',
    emailVerified,
  };
}

async function verifySocialIdentity(provider: SocialProvider, idToken: string) {
  return provider === 'google'
    ? verifyGoogleIdentityToken(idToken)
    : verifyAppleIdentityToken(idToken);
}

async function findSocialUser(identity: SocialIdentity) {
  const providerColumn = identity.provider === 'google' ? 'google_id' : 'apple_id';
  const byProvider = await db.query(`SELECT * FROM users WHERE ${providerColumn} = $1`, [
    identity.providerUserId,
  ]);
  if (byProvider.rows[0]) {
    return byProvider.rows[0];
  }

  if (!identity.email) {
    return null;
  }

  const byEmail = await db.query('SELECT * FROM users WHERE email = $1', [identity.email]);
  return byEmail.rows[0] || null;
}

async function upsertSocialUser(identity: SocialIdentity, fallbackFullName = '', currency = 'USD') {
  const providerColumn = identity.provider === 'google' ? 'google_id' : 'apple_id';
  const fullName = identity.fullName || fallbackFullName || '';
  const existingUser = await findSocialUser(identity);

  if (existingUser) {
    await db.query(
      `UPDATE users
       SET ${providerColumn} = $1,
         auth_provider = CASE WHEN auth_provider = 'password' THEN auth_provider ELSE $2 END,
         verified = true,
         full_name = CASE WHEN full_name = '' THEN $3 ELSE full_name END,
         profile_image = COALESCE(profile_image, $4),
         updated_at = CURRENT_TIMESTAMP
       WHERE id = $5`,
      [identity.providerUserId, identity.provider, fullName, identity.profileImage || null, existingUser.id],
    );

    const updated = await db.query('SELECT * FROM users WHERE id = $1', [existingUser.id]);
    return {user: updated.rows[0], isNewUser: false};
  }

  if (!identity.email) {
    throw new Error('This social account did not provide an email address.');
  }

  const id = uuidv4();
  await db.query(
    `INSERT INTO users
     (id, email, password_hash, full_name, profile_image, auth_provider, ${providerColumn}, verified, currency)
     VALUES ($1, $2, $3, $4, $5, $6, $7, true, $8)`,
    [
      id,
      identity.email,
      '',
      fullName,
      identity.profileImage || null,
      identity.provider,
      identity.providerUserId,
      currency,
    ],
  );

  const created = await db.query('SELECT * FROM users WHERE id = $1', [id]);
  return {user: created.rows[0], isNewUser: true};
}

router.post(
  '/signup',
  emailValidator,
  body('password').isLength({min: 8}).withMessage('Password must be at least 8 characters.'),
  body('currency').optional().isString(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json(validationErrorResponse(errors));
    }

    const {email, password, currency = 'USD'} = req.body;

    try {
      const existingUser = await db.query('SELECT id, verified, verification_code_sent_at FROM users WHERE email = $1', [email]);
      if (existingUser.rows.length > 0) {
        if (existingUser.rows[0].verified) {
          return res.status(409).json({success: false, message: 'Email already exists.'});
        }

        if (skipEmailVerification) {
          const token = createToken(existingUser.rows[0].id);
          const refreshToken = createToken(existingUser.rows[0].id);
          await db.query(
            `UPDATE users
             SET password_hash = $1,
               currency = $2,
               verified = true,
               verification_code = NULL,
               verification_code_expires_at = NULL,
               verification_code_sent_at = NULL,
               updated_at = CURRENT_TIMESTAMP
             WHERE id = $3`,
            [hashPassword(password), currency, existingUser.rows[0].id],
          );

          return res.status(200).json({
            success: true,
            message: 'Account created. Email verification skipped for test mode.',
            data: {
              token,
              refreshToken,
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
        const retryAfterSeconds = secondsUntilResendAllowed(existingUser.rows[0].verification_code_sent_at);
        if (retryAfterSeconds > 0) {
          return res.status(429).json({
            success: false,
            code: 'resend_cooldown',
            message: `Please wait ${retryAfterSeconds} seconds before requesting another code.`,
            data: {retryAfterSeconds},
          });
        }

        await db.query(
          `UPDATE users
           SET password_hash = $1,
             currency = $2,
             verification_code = $3,
             verification_code_expires_at = $4,
             verification_code_sent_at = $5,
             updated_at = CURRENT_TIMESTAMP
           WHERE id = $6`,
          [
            hashPassword(password),
            currency,
            verificationCode,
            createCodeExpiration(),
            createCodeSentAt(),
            existingUser.rows[0].id,
          ],
        );

        try {
          await sendVerificationEmail(email, verificationCode);
        } catch (error) {
          console.error('Verification email delivery failed:', error);
          return emailDeliveryErrorResponse(res, 'verification');
        }

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
        'INSERT INTO users (id, email, password_hash, verified, currency, verification_code, verification_code_expires_at, verification_code_sent_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
        [
          id,
          email,
          passwordHash,
          isVerified,
          currency,
          isVerified ? null : verificationCode,
          isVerified ? null : createCodeExpiration(),
          isVerified ? null : createCodeSentAt(),
        ]
      );

      if (!skipEmailVerification) {
        try {
          await sendVerificationEmail(email, verificationCode);
        } catch (error) {
          console.error('Verification email delivery failed:', error);
          return emailDeliveryErrorResponse(res, 'verification');
        }
      }

      return res.status(201).json({
        success: true,
        message: skipEmailVerification
          ? 'Signup successful. Email verification skipped for test mode.'
          : 'Signup successful. Verification email sent.',
        data: {
          ...(skipEmailVerification ? {
            token: createToken(id),
            refreshToken: createToken(id),
          } : {}),
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
      return res.status(400).json(validationErrorResponse(errors));
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
  '/social-login',
  body('provider').isIn(['google', 'apple']).withMessage('Social login provider is not supported.'),
  body('idToken').isString().notEmpty().withMessage('Social login token is required.'),
  body('email').optional().isEmail().withMessage('Please enter a valid email address.').bail().toLowerCase(),
  body('fullName').optional().isString(),
  body('currency').optional().isString(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json(validationErrorResponse(errors));
    }

    const {provider, idToken, email, fullName = '', currency = 'USD'} = req.body as {
      provider: SocialProvider;
      idToken: string;
      email?: string;
      fullName?: string;
      currency?: string;
    };

    try {
      const identity = await verifySocialIdentity(provider, idToken);
      if (provider === 'apple' && !identity.email && email) {
        identity.email = String(email).toLowerCase();
      }
      if (!identity.emailVerified && provider !== 'apple') {
        return res.status(401).json({
          success: false,
          message: 'Social login email is not verified.',
        });
      }

      const {user, isNewUser} = await upsertSocialUser(identity, fullName, currency);
      const token = createToken(user.id);
      const refreshToken = createToken(user.id);

      return res.status(200).json({
        success: true,
        message: 'Social login successful.',
        data: {
          token,
          refreshToken,
          isNewUser,
          user: toAuthUser(user),
        },
      });
    } catch (error) {
      console.error('Social login error:', error);
      const message =
        error instanceof Error && error.message.includes('not configured')
          ? error.message
          : 'Social login could not be verified. Please try again.';
      return res.status(401).json({success: false, message});
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
      return res.status(400).json(validationErrorResponse(errors));
    }

    const {email, code} = req.body;

    try {
      const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);
      const user = result.rows[0];

      if (!user) {
        return res.status(404).json({success: false, message: 'User not found.'});
      }

      if (user.verified) {
        return res.status(200).json({
          success: true,
          code: 'already_verified',
          message: 'Email already verified. Please log in.',
        });
      }

      if (!user.verification_code || user.verification_code !== code) {
        return res.status(400).json({
          success: false,
          code: 'invalid_code',
          message: 'That verification code is not correct. Please check the code and try again.',
        });
      }

      if (isExpired(user.verification_code_expires_at)) {
        return res.status(400).json({
          success: false,
          code: 'code_expired',
          message: 'That verification code has expired. Please request a new code.',
        });
      }

      await db.query(
        'UPDATE users SET verified = true, verification_code = NULL, verification_code_expires_at = NULL, verification_code_sent_at = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
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
      return res.status(400).json(validationErrorResponse(errors));
    }

    const {email} = req.body;

    try {
      const result = await db.query('SELECT id, verified, verification_code_sent_at FROM users WHERE email = $1', [email]);
      const user = result.rows[0];

      if (!user) {
        return res.status(404).json({success: false, message: 'User not found.'});
      }

      if (user.verified) {
        return res.status(200).json({success: true, message: 'Email is already verified.'});
      }

      const retryAfterSeconds = secondsUntilResendAllowed(user.verification_code_sent_at);
      if (retryAfterSeconds > 0) {
        return res.status(429).json({
          success: false,
          code: 'resend_cooldown',
          message: `Please wait ${retryAfterSeconds} seconds before requesting another code.`,
          data: {retryAfterSeconds},
        });
      }

      const verificationCode = createVerificationCode();
      await db.query(
        `UPDATE users
         SET verification_code = $1,
           verification_code_expires_at = $2,
           verification_code_sent_at = $3,
           updated_at = CURRENT_TIMESTAMP
         WHERE id = $4`,
        [verificationCode, createCodeExpiration(), createCodeSentAt(), user.id],
      );

      try {
        await sendVerificationEmail(email, verificationCode);
      } catch (error) {
        console.error('Verification email delivery failed:', error);
        return emailDeliveryErrorResponse(res, 'verification');
      }

      return res.status(200).json({
        success: true,
        message: 'Verification code sent.',
        data: {
          ...devCodePayload(verificationCode),
          resendCooldownSeconds: RESEND_COOLDOWN_SECONDS,
        },
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
      return res.status(400).json(validationErrorResponse(errors));
    }

    const {email} = req.body;

    try {
      const result = await db.query('SELECT id, reset_code_sent_at FROM users WHERE email = $1', [email]);
      const user = result.rows[0];

      let resetCode = '';
      if (user) {
        const retryAfterSeconds = secondsUntilResendAllowed(user.reset_code_sent_at);
        if (retryAfterSeconds > 0) {
          return res.status(429).json({
            success: false,
            code: 'resend_cooldown',
            message: `Please wait ${retryAfterSeconds} seconds before requesting another code.`,
            data: {retryAfterSeconds},
          });
        }

        resetCode = createVerificationCode();
        await db.query(
          'UPDATE users SET reset_code = $1, reset_code_expires_at = $2, reset_code_sent_at = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4',
          [resetCode, createCodeExpiration(), createCodeSentAt(), user.id]
        );
        try {
          await sendPasswordResetEmail(email, resetCode);
        } catch (error) {
          console.error('Password reset email delivery failed:', error);
          return emailDeliveryErrorResponse(res, 'reset');
        }
      }

      return res.status(200).json({
        success: true,
        message: 'If that email is registered, password reset instructions were sent.',
        data: user ? {
          ...devResetCodePayload(resetCode),
          resendCooldownSeconds: RESEND_COOLDOWN_SECONDS,
        } : undefined,
      });
    } catch (error) {
      console.error('Forgot password error:', error);
      return res.status(500).json({success: false, message: 'Internal server error.'});
    }
  },
);

router.post(
  '/verify-reset-code',
  emailValidator,
  body('code').isLength({min: 6, max: 6}).withMessage('Reset code must be 6 digits.'),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json(validationErrorResponse(errors));
    }

    const {email, code} = req.body;

    try {
      const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);
      const user = result.rows[0];

      if (!user) {
        return res.status(404).json({success: false, message: 'User not found.'});
      }

      if (!user.reset_code || user.reset_code !== code) {
        return res.status(400).json({
          success: false,
          code: 'invalid_code',
          message: 'That reset code is not correct. Please check the code and try again.',
        });
      }

      if (isExpired(user.reset_code_expires_at)) {
        return res.status(400).json({
          success: false,
          code: 'code_expired',
          message: 'That reset code has expired. Please request a new code.',
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Reset code verified.',
      });
    } catch (error) {
      console.error('Verify reset code error:', error);
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
      return res.status(400).json(validationErrorResponse(errors));
    }

    const {email, code, password} = req.body;

    try {
      const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);
      const user = result.rows[0];

      if (!user) {
        return res.status(404).json({success: false, message: 'User not found.'});
      }

      if (!user.reset_code || user.reset_code !== code) {
        return res.status(400).json({
          success: false,
          code: 'invalid_code',
          message: 'That reset code is not correct. Please request a new code and try again.',
        });
      }

      if (isExpired(user.reset_code_expires_at)) {
        return res.status(400).json({
          success: false,
          code: 'code_expired',
          message: 'That reset code has expired. Please request a new code.',
        });
      }

      const passwordHash = hashPassword(password);
      await db.query(
        'UPDATE users SET password_hash = $1, reset_code = NULL, reset_code_expires_at = NULL, reset_code_sent_at = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
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
