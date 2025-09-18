import { Server as HttpServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import type { User, Room, DrawingData, ChatMessage } from './types.ts';

export interface ServerToClientEvents {
  // Eventos de usuario
  userConnected: (user: User) => void;
  userDisconnected: (userId: string) => void;

  // Eventos de sala
  roomJoined: (room: Room) => void;
  roomLeft: (roomId: string) => void;
  roomUpdated: (room: Room) => void;

  // Eventos de juego
  gameStarted: (gameState: any) => void;
  gameEnded: (scores: Record<string, number>) => void;
  turnChanged: (currentPlayer: string, word?: string) => void;

  // Eventos de dibujo
  drawingData: (data: DrawingData) => void;
  canvasCleared: () => void;

  // Eventos de chat
  chatMessage: (message: ChatMessage) => void;
  correctGuess: (userId: string, username: string) => void;
}

export interface ClientToServerEvents {
  // Eventos de usuario
  setUsername: (username: string) => void;

  // Eventos de sala
  joinRoom: (roomId: string) => void;
  leaveRoom: (roomId: string) => void;
  createRoom: (roomName: string, maxPlayers: number) => void;

  // Eventos de juego
  startGame: () => void;
  endGame: () => void;

  // Eventos de dibujo
  drawing: (data: DrawingData) => void;
  clearCanvas: () => void;

  // Eventos de chat
  sendMessage: (message: string) => void;
}

export interface InterServerEvents {
  // Para escalabilidad futura con múltiples servidores
}

export interface SocketData {
  user?: User;
  roomId?: string;
}

export type TypedSocket = SocketIOServer<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;

export const createSocketServer = (httpServer: HttpServer): TypedSocket => {
  const io = new SocketIOServer<
    ClientToServerEvents,
    ServerToClientEvents,
    InterServerEvents,
    SocketData
  >(httpServer, {
    cors: {
      origin: ['http://localhost:5173', 'http://localhost:3000'],
      methods: ['GET', 'POST'],
      credentials: true,
    },
    // Configuración para mejor rendimiento
    pingTimeout: 60000,
    pingInterval: 25000,
    transports: ['websocket', 'polling'],
  });

  // Middleware de autenticación básica
  io.use((socket, next) => {
    const { username } = socket.handshake.auth;

    if (!username) {
      return next(new Error('Username is required'));
    }

    // Crear usuario básico
    const user: User = {
      id: socket.id,
      username: username.trim(),
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`,
      isOnline: true,
    };

    socket.data.user = user;
    next();
  });

  // Manejo de conexiones
  io.on('connection', socket => {
    const user = socket.data.user;

    if (!user) {
      socket.disconnect();
      return;
    }

    console.log(`✅ Usuario conectado: ${user.username} (${user.id})`);

    // Notificar a otros usuarios sobre la nueva conexión
    socket.broadcast.emit('userConnected', user);

    // Manejo de desconexión
    socket.on('disconnect', reason => {
      console.log(`❌ Usuario desconectado: ${user.username} (${reason})`);

      // Notificar a otros usuarios sobre la desconexión
      socket.broadcast.emit('userDisconnected', user.id);

      // TODO: Limpiar usuario de salas activas
    });

    // Eventos básicos (se expandirán en features específicas)
    socket.on('setUsername', newUsername => {
      if (socket.data.user) {
        const oldUsername = socket.data.user.username;
        socket.data.user.username = newUsername.trim();
        socket.data.user.avatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${newUsername}`;

        console.log(`🔄 Usuario cambió nombre: ${oldUsername} -> ${newUsername}`);
      }
    });
  });

  return io;
};

