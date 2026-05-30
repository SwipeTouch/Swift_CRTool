import express from 'express';
import cors from 'cors';
import path from 'path';
import { prisma } from './lib/prisma.js';
import { apiRouter } from './routes/index.js';

const port = Number(process.env.PORT) || Number(process.env.API_PORT) || 3002;

const corsOrigins = (process.env.CORS_ORIGINS ?? 'http://localhost:3000')
  .split(',')
  .map((s) => s.trim());

const app = express();

app.use(
  cors({
    origin: corsOrigins,
    credentials: true,
  }),
);
app.use(express.json({ limit: '2mb' }));

app.use('/api', apiRouter);

// Serve static files from React build (for Heroku deployment)
const webDistPath = path.resolve(process.cwd(), '../web/dist');
app.use(express.static(webDistPath));

// Handle React Router - serve index.html for all non-API routes
app.get('*', (_req, res) => {
  res.sendFile(path.join(webDistPath, 'index.html'));
});

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

async function main() {
  await prisma.$connect();
  app.listen(port, () => {
    console.log(`Swipetouch CRMS API listening on port ${port}`);
  });
}

main().catch((err) => {
  console.error('Failed to start:', err);
  process.exit(1);
});
