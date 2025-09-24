import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { createServer } from 'http';
import { config } from './shared/config.ts';
import { connectToDatabase } from './shared/database.ts';
import { createSocketServer } from './shared/socket.ts';
import { authRoutes } from './features/auth/auth.routes.ts';

const app = express();
const httpServer = createServer(app);

// Configuración de CORS
app.use(
  cors({
    origin: config.corsOrigins,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  }),
);

// Middleware para parsear JSON y cookies
app.use(express.json());
app.use(cookieParser());

// Ruta de salud
app.get('/', (req, res) => {
  res.json({
    message: 'Pinturillo Backend API',
    status: 'running',
    features: ['auth', 'rooms', 'game', 'drawing'],
  });
});

// Ruta de salud de la base de datos
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    database: 'connected',
    timestamp: new Date().toISOString(),
  });
});

// Rutas de API
app.use('/api/auth', authRoutes);

// Middleware de manejo de errores
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', error);
  res.status(error.status || 500).json({
    error: error.message || 'Internal server error',
    ...(config.nodeEnv === 'development' && { stack: error.stack }),
  });
});

// Manejo de rutas no encontradas
app.use((req, res) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.originalUrl,
  });
});

// Inicializar Socket.IO
const io = createSocketServer(httpServer);

export { app, httpServer, io, connectToDatabase };
