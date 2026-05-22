import {Router} from 'express';
import authRouter from './auth';
import usersRouter from './users';
import budgetsRouter from './budgets';
import subscriptionsRouter from './subscriptions';
import supportRouter from './support';

const router = Router();

router.use('/auth', authRouter);
router.use('/users', usersRouter);
router.use('/budgets', budgetsRouter);
router.use('/subscriptions', subscriptionsRouter);
router.use('/support', supportRouter);

export default router;
