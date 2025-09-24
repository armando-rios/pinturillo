import { Server as HttpServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { config } from './config.ts';
import { JWTService } from './jwt.ts';
import { User } from '../features/auth/auth.model.ts';
import type { User as UserType, Room, DrawingData, ChatMessage } from './types.ts';

export interface ServerToClientEvents {
  // Eventos de usuario
  userConnected: (user: UserType) => void;
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

  // Eventos de autenticación
  authError: (error: string) => void;
  authSuccess: (user: UserType) => void;
}

export interface ClientToServerEvents {
  // Eventos de autenticación
  authenticate: (token: string) => void;

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
  user?: UserType & { id: string };
  authenticated?: boolean;
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
      origin: config.corsOrigins,
      methods: ['GET', 'POST'],
      credentials: true,
    },
    // Configuración para mejor rendimiento
    pingTimeout: config.socket.pingTimeout,
    pingInterval: config.socket.pingInterval,
    transports: ['websocket', 'polling'],
  });

  // Middleware de autenticación JWT
  io.use(async (socket, next) => {
    try {
      const token =
        socket.handshake.auth.token ||
        socket.handshake.headers.authorization?.replace('Bearer ', '');

      if (!token) {
        return next(new Error('Authentication token required'));
      }

      const payload = JWTService.verifyToken(token);
      const user = await User.findById(payload.userId);

      if (!user) {
        return next(new Error('User not found'));
      }

      // Actualizar estado online del usuario
      await user.setOnline();

      socket.data.user = {
        id: user._id.toString(),
        username: user.username,
        avatar: user.avatar,
        isOnline: true,
        currentRoom: user.currentRoom,
      };
      socket.data.authenticated = true;

      next();
    } catch (error) {
      next(new Error('Invalid or expired token'));
    }
  });

  // Manejo de conexiones
  io.on('connection', socket => {
    const user = socket.data.user;

    if (!user || !socket.data.authenticated) {
      socket.emit('authError', 'Authentication required');
      socket.disconnect();
      return;
    }

    console.log(`✅ Usuario autenticado conectado: ${user.username} (${user.id})`);

    // Emitir éxito de autenticación
    socket.emit('authSuccess', user);

    // Notificar a otros usuarios sobre la nueva conexión
    socket.broadcast.emit('userConnected', user);

    // Manejo de desconexión
    socket.on('disconnect', async reason => {
      console.log(`❌ Usuario desconectado: ${user.username} (${reason})`);

      try {
        // Actualizar estado offline del usuario
        const dbUser = await User.findById(user.id);
        if (dbUser) {
          await dbUser.setOffline();
        }

        // Notificar a otros usuarios sobre la desconexión
        socket.broadcast.emit('userDisconnected', user.id);

        // TODO: Limpiar usuario de salas activas
      } catch (error) {
        console.error('Error during disconnect cleanup:', error);
      }
    });

    // Evento de re-autenticación (para tokens expirados)
    socket.on('authenticate', async (token: string) => {
      try {
        const payload = JWTService.verifyToken(token);
        const dbUser = await User.findById(payload.userId);

        if (!dbUser) {
          socket.emit('authError', 'User not found');
          return;
        }

        await dbUser.setOnline();

        socket.data.user = {
          id: dbUser._id.toString(),
          username: dbUser.username,
          avatar: dbUser.avatar,
          isOnline: true,
          currentRoom: dbUser.currentRoom,
        };
        socket.data.authenticated = true;

        socket.emit('authSuccess', socket.data.user);
      } catch (error) {
        socket.emit('authError', 'Invalid or expired token');
      }
    });

    // Eventos básicos (se expandirán en features específicas)
    socket.on('setUsername', async (newUsername: string) => {
      if (socket.data.user) {
        try {
          const dbUser = await User.findById(socket.data.user.id);
          if (dbUser) {
            const oldUsername = socket.data.user.username;

            // Verificar que el username no esté tomado
            const existingUser = await User.findOne({
              username: newUsername.trim(),
              _id: { $ne: dbUser._id },
            });

            if (existingUser) {
              socket.emit('authError', 'Username already taken');
              return;
            }

            dbUser.username = newUsername.trim();
            await dbUser.save();

            socket.data.user.username = newUsername.trim();
            console.log(`🔄 Usuario cambió nombre: ${oldUsername} -> ${newUsername}`);
          }
        } catch (error) {
          console.error('Error updating username:', error);
          socket.emit('authError', 'Failed to update username');
        }
      }
    });
  });

  return io;
};
