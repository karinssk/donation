import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import path from 'path';
import webhookRouter from './routes/webhook';
import apiRouter from './routes/api';
import adminAuthRouter from './routes/admin-auth';
import summaryService from './services/summaryService';
import { connectDB } from './db/mongodb';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Connect to MongoDB
connectDB().catch(err => {
  console.error('Failed to connect to MongoDB:', err);
  process.exit(1);
});

app.use(cors());

// Register webhook routes before body parsers to preserve raw body for signature validation.
app.use('/', webhookRouter);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const publicRoot = path.join(__dirname, '../public');

app.use(express.static(publicRoot));
app.get('/edit-amount', (_req, res) => {
  res.sendFile(path.join(publicRoot, 'edit-amount', 'index.html'));
});
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Serve admin panel assets
app.use('/admin-panel', express.static(path.join(publicRoot, 'admin-panel')));
// Serve assets from root (Vite builds assets to /assets)
app.use('/assets', express.static(path.join(publicRoot, 'admin-panel', 'assets')));
// SPA fallback for admin panel
app.get('/admin-panel*', (_req, res) => {
  res.sendFile(path.join(publicRoot, 'admin-panel', 'index.html'));
});

app.use('/api/admin-auth', adminAuthRouter);
app.use('/api', apiRouter);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

summaryService.start().then(() => {
  console.log('Summary service started');
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  summaryService.stop();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully...');
  summaryService.stop();
  process.exit(0);
});

export default app;
