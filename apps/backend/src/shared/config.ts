// Configuración centralizada usando variables de entorno

export const config = {
  // Servidor
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',

  // Base de datos
  mongodbUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/pinturillo',

  // CORS
  corsOrigins: process.env.CORS_ORIGINS?.split(',') || [
    'http://localhost:5173',
    'http://localhost:3000',
  ],

  // JWT
  jwtSecret: process.env.JWT_SECRET || 'pinturillo-dev-secret-key',

  // Socket.IO
  socket: {
    pingTimeout: parseInt(process.env.SOCKET_PING_TIMEOUT || '60000', 10),
    pingInterval: parseInt(process.env.SOCKET_PING_INTERVAL || '25000', 10),
  },

  // Configuración del juego
  game: {
    defaultMaxPlayers: parseInt(process.env.DEFAULT_ROOM_MAX_PLAYERS || '8', 10),
    defaultRounds: parseInt(process.env.DEFAULT_GAME_ROUNDS || '3', 10),
    drawingTimeLimit: parseInt(process.env.DRAWING_TIME_LIMIT || '60', 10),
    guessingTimeLimit: parseInt(process.env.GUESSING_TIME_LIMIT || '10', 10),
  },

  // Logging
  logLevel: process.env.LOG_LEVEL || 'info',

  // URLs externas
  dicebearApiUrl: process.env.DICEBEAR_API_URL || 'https://api.dicebear.com/7.x/avataaars/svg',

  // Funciones de utilidad
  isDevelopment: () => config.nodeEnv === 'development',
  isProduction: () => config.nodeEnv === 'production',
  isTest: () => config.nodeEnv === 'test',
};

