import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import apiRouter from './routes';

const app = express();
const port = Number(process.env.PORT || 4000);

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('BetterBudget backend is running');
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
