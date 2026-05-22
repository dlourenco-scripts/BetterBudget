import {Router} from 'express';
import {body, validationResult} from 'express-validator';
import {v4 as uuidv4} from 'uuid';
import db from '../db';
import {authMiddleware, AuthRequest} from '../middleware/auth';

const router = Router();

router.post(
  '/',
  authMiddleware,
  body('message').trim().isLength({min: 3, max: 5000}),
  async (req: AuthRequest, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a message before sending.',
        errors: errors.array(),
      });
    }

    try {
      const userResult = await db.query('SELECT email FROM users WHERE id = $1', [
        req.userId,
      ]);
      const user = userResult.rows[0];
      if (!user) {
        return res.status(404).json({success: false, message: 'User not found.'});
      }

      const id = uuidv4();
      await db.query(
        `
          INSERT INTO support_requests (id, user_id, email, message)
          VALUES ($1, $2, $3, $4)
        `,
        [id, req.userId, user.email, req.body.message],
      );

      return res.status(201).json({
        success: true,
        message: 'Thanks, your message was sent.',
        data: {id},
      });
    } catch (error) {
      console.error('Create support request error:', error);
      return res.status(500).json({
        success: false,
        message: 'Unable to send right now. Please try again.',
      });
    }
  },
);

export default router;
