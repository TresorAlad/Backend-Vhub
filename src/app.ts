import express from 'express';
import cors from 'cors';
import authRoutes from './routes/authRoutes';
import eventRoutes from './routes/eventRoutes';
import adminRoutes from './routes/adminRoutes';
import interactionRoutes from './routes/interactionRoutes';
import organizerRequestRoutes from './routes/organizerRequestRoutes';
import type { CorsOptions } from 'cors';
import { HttpError } from './utils/http';

const app = express();

function parseFrontendOrigins(): string[] {
  const frontendUrls = process.env.FRONTEND_URLS ?? process.env.FRONTEND_URL ?? '';
  return frontendUrls
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
}

const allowedOrigins = parseFrontendOrigins();

if (allowedOrigins.length === 0) {
  console.warn('No FRONTEND_URL/FRONTEND_URLS configured. Set at least one allowed origin for CORS.');
}

const corsOptions: CorsOptions = {
  origin: (origin, callback) => {
    const isVercelPreview = typeof origin === 'string' && /^https:\/\/web-event[a-z0-9-]*\.vercel\.app$/.test(origin);
    const isAllowedOrigin = typeof origin === 'string' && allowedOrigins.includes(origin);
    if (!origin || isAllowedOrigin || isVercelPreview) {
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

app.use('/api/auth', authRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/interactions', interactionRoutes);
app.use('/api/organizer-requests', organizerRequestRoutes);

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
