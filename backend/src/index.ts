import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import apiRouter from './routes';

const app = express();
const port = Number(process.env.PORT || 4000);
const corsOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      if (
        process.env.NODE_ENV !== 'production' ||
        !origin ||
        corsOrigins.includes('*') ||
        corsOrigins.includes(origin)
      ) {
        callback(null, true);
        return;
      }

      callback(new Error(`CORS origin not allowed: ${origin}`));
    },
  }),
);
app.use(express.json());

app.get('/', (req, res) => {
  res.send('BetterBudget backend is running');
});

app.get('/health', (req, res) => {
  res.status(200).json({success: true, status: 'ok'});
});

app.use('/api/v1', apiRouter);

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
});

app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`BetterBudget backend listening on http://localhost:${port}`);
});
