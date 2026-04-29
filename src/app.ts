import express from 'express';
import cors from 'cors';
import authRoutes from './routes/authRoutes';
import eventRoutes from './routes/eventRoutes';
import adminRoutes from './routes/adminRoutes';
import type { CorsOptions } from 'cors';
import { HttpError } from './utils/http';

const app = express();

const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  'https://web-eventt.vercel.app',
  'https://web-eventtt.vercel.app',
  process.env.FRONTEND_URL,
].filter((origin): origin is string => Boolean(origin));

const corsOptions: CorsOptions = {
  origin: (origin, callback) => {
    const isVercelPreview = typeof origin === 'string' && /^https:\/\/web-event[a-z0-9-]*\.vercel\.app$/.test(origin);
    if (!origin || allowedOrigins.includes(origin) || isVercelPreview) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));

app.use(express.json());

// Handle preflight requests
app.options('*', cors(corsOptions));

app.use('/api/auth', authRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/admin', adminRoutes);

app.get('/', (req, res) => {
  res.send('EventHub API is running');
});

// Global Error Handler
app.use((err: unknown, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled Global Error:', err);
  if (err instanceof HttpError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
    });
  }

  const message = err instanceof Error ? err.message : 'Internal Server Error';
  return res.status(500).json({
    success: false,
    message,
  });
});

export default app;
