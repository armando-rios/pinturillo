import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { connectToDatabase } from './shared/database.ts';
import { createSocketServer } from './shared/socket.ts';

const app = express();
const httpServer = createServer(app);

// Configuración de CORS
app.use(
  cors({
    origin: ['http://localhost:5173', 'http://localhost:3000'],
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  }),
);

// Middleware para parsear JSON
app.use(express.json());

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

// Inicializar Socket.IO
const io = createSocketServer(httpServer);

export { app, httpServer, io, connectToDatabase };
