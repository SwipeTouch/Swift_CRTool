import { Router } from 'express';
import { authRouter } from './auth.js';
import { organizationsRouter } from './organizations.js';
import { usersRouter } from './users.js';
import { changeRequestsRouter } from './changeRequests.js';
import { dashboardRouter } from './dashboard.js';
import { reportsRouter } from './reports.js';
import { notificationsRouter } from './notifications.js';

export const apiRouter = Router();

apiRouter.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'swipetouch-crms-api' });
});

apiRouter.use('/auth', authRouter);
apiRouter.use('/organizations', organizationsRouter);
apiRouter.use('/users', usersRouter);
apiRouter.use('/change-requests', changeRequestsRouter);
apiRouter.use('/dashboard', dashboardRouter);
apiRouter.use('/reports', reportsRouter);
apiRouter.use('/notifications', notificationsRouter);
