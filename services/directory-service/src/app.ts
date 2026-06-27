import express from 'express';
import router from './routes/index.js';

export const createApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api', router);
  app.get('/health', (req, res) => {
    res.status(200).json({ status: 'OK', timestamp: new Date().toISOString(), uptime: process.uptime() });
  });
  return app;
};