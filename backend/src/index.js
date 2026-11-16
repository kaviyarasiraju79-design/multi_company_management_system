import 'dotenv/config';
import express from 'express';
import cors from 'cors';

import authRoutes from './routes/auth.js';
import companyRoutes from './routes/company.js';
import userRoutes from './routes/users.js';
import { masterPool } from './config/db.js';

const app = express();

app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:5173' }));
app.use(express.json());

app.get('/api/health', async (_req, res) => {
  try {
    await masterPool.query('SELECT 1');
    res.json({ status: 'ok' });
  } catch {
    res.status(500).json({ status: 'db-unreachable' });
  }
});

app.use('/api/auth', authRoutes);
app.use('/api/company', companyRoutes);
app.use('/api/users', userRoutes);

app.use((_req, res) => res.status(404).json({ message: 'Not found' }));

// Central error handler
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(err.status || 500).json({ message: err.status ? err.message : 'Internal server error' });
});

const PORT = Number(process.env.PORT || 5000);
app.listen(PORT, () => {
  console.log(`MCMS API running on http://localhost:${PORT}`);
});
