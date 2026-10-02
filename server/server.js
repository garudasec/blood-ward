import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import dotenv from 'dotenv';
import connectDB from './src/config/db.js';

import sanitizeMiddleware from './src/middleware/sanitizeMiddleware.js';
import { globalLimiter } from './src/middleware/rateLimiter.js';
import errorHandler from './src/middleware/errorMiddleware.js';
import notFoundHandler from './src/middleware/notFoundMiddleware.js';

import healthRouter from './src/routes/health.routes.js';
import authRouter from './src/routes/auth.routes.js';

dotenv.config();

const app = express();

app.use(helmet());
app.use(sanitizeMiddleware);

const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
app.use(
  cors({
    origin: clientUrl,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

app.use(cookieParser());

app.use('/api', globalLimiter);

app.use('/api/health', healthRouter);
app.use('/api/auth', authRouter);

app.use(notFoundHandler);

app.use(errorHandler);

const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  app.listen(PORT, () => {
    const envMode = process.env.NODE_ENV || 'development';
    console.log('[BloodWard Server] Running in ' + envMode + ' mode on port ' + PORT);
  });
});
