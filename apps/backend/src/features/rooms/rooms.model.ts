import mongoose, { Document, Schema } from 'mongoose';
import { config } from '../../shared/config.ts';

// Interface para TypeScript
export interface IRoom extends Document {
  _id: string;
  name: string;
  code: string; // Código único de 6 caracteres para unirse fácilmente
  hostId: string;
  players: Array<{
    userId: string;
    username: string;
    avatar: string;
    isConnected: boolean;
    joinedAt: Date;
    score: number;
    isReady: boolean;
  }>;
  settings: {
    maxPlayers: number;
    maxRounds: number;
    drawingTimeLimit: number; // en segundos
    guessingTimeLimit: number; // en segundos
    language: string;
    difficulty: 'easy' | 'medium' | 'hard';
    customWords: string[];
    allowCustomWords: boolean;
  };
  status: 'waiting' | 'playing' | 'paused' | 'finished';
  currentGame?: string; // Referencia al juego actual
  gameHistory: string[]; // IDs de juegos anteriores
  createdAt: Date;
  updatedAt: Date;
  lastActivity: Date;
}

// Schema de Mongoose
const RoomSchema = new Schema<IRoom>(
  {
    name: {
      type: String,
      required: [true, 'El nombre de la sala es requerido'],
      trim: true,
      minlength: [3, 'El nombre debe tener al menos 3 caracteres'],
      maxlength: [30, 'El nombre no puede exceder 30 caracteres'],
      match: [
        /^[a-zA-Z0-9\s_-]+$/,
        'Solo se permiten letras, números, espacios, guiones y guiones bajos',
      ],
    },
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      length: 6,
      match: [/^[A-Z0-9]{6}$/, 'El código debe tener 6 caracteres alfanuméricos'],
      index: true,
    },
    hostId: {
      type: String,
      required: [true, 'Se requiere un host para la sala'],
      index: true,
    },
    players: [
      {
        userId: {
          type: String,
          required: true,
          index: true,
        },
        username: {
          type: String,
          required: true,
          trim: true,
        },
        avatar: {
          type: String,
          required: true,
        },
        isConnected: {
          type: Boolean,
          default: true,
        },
        joinedAt: {
          type: Date,
          default: Date.now,
        },
        score: {
          type: Number,
          default: 0,
          min: 0,
        },
        isReady: {
          type: Boolean,
          default: false,
        },
      },
    ],
    settings: {
      maxPlayers: {
        type: Number,
        default: config.game.defaultMaxPlayers,
        min: 2,
        max: 12,
        required: true,
      },
      maxRounds: {
        type: Number,
        default: config.game.defaultRounds,
        min: 1,
        max: 10,
        required: true,
      },
      drawingTimeLimit: {
        type: Number,
        default: config.game.drawingTimeLimit,
        min: 30,
        max: 180,
        required: true,
      },
      guessingTimeLimit: {
        type: Number,
        default: config.game.guessingTimeLimit,
        min: 5,
        max: 30,
        required: true,
      },
      language: {
        type: String,
        default: 'es',
        enum: ['es', 'en'],
        required: true,
      },
      difficulty: {
        type: String,
        default: 'medium',
        enum: ['easy', 'medium', 'hard'],
        required: true,
      },
      customWords: [
        {
          type: String,
          trim: true,
          maxlength: 20,
        },
      ],
      allowCustomWords: {
        type: Boolean,
        default: false,
      },
    },
    status: {
      type: String,
      enum: ['waiting', 'playing', 'paused', 'finished'],
      default: 'waiting',
      required: true,
      index: true,
    },
    currentGame: {
      type: String,
      default: null,
      index: true,
    },
    gameHistory: [
      {
        type: String,
      },
    ],
    lastActivity: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
    collection: 'rooms',
  },
);

// Índices compuestos para consultas optimizadas
RoomSchema.index({ status: 1, lastActivity: -1 });
RoomSchema.index({ hostId: 1, status: 1 });
RoomSchema.index({ 'players.userId': 1, status: 1 });

// Middleware pre-save para validaciones adicionales
RoomSchema.pre('save', function (next) {
  // Validar que no haya más jugadores que el máximo permitido
  if (this.players.length > this.settings.maxPlayers) {
    return next(new Error('La sala ha excedido el número máximo de jugadores'));
  }

  // Validar que el host esté en la lista de jugadores
  const hostInPlayers = this.players.some(player => player.userId === this.hostId);
  if (this.players.length > 0 && !hostInPlayers) {
    return next(new Error('El host debe estar en la lista de jugadores'));
  }

  // Actualizar actividad
  this.lastActivity = new Date();

  next();
});

// Middleware pre-validate para generar código único si no existe
RoomSchema.pre('validate', async function (next) {
  if (!this.code) {
    this.code = await generateUniqueCode();
  }
  next();
});

// Función auxiliar para generar código único
async function generateUniqueCode(): Promise<string> {
  let code: string;
  let exists: boolean;

  do {
    code = Math.random().toString(36).substring(2, 8).toUpperCase();
    // Asegurar que tenga exactamente 6 caracteres
    while (code.length < 6) {
      code += Math.random().toString(36).charAt(2).toUpperCase();
    }
    code = code.substring(0, 6);

    // Verificar que no exista
    const Room = mongoose.model('Room');
    exists = !!(await Room.exists({ code }));
  } while (exists);

  return code;
}

// Métodos de instancia
RoomSchema.methods.addPlayer = function (userId: string, username: string, avatar: string) {
  // Verificar si el jugador ya está en la sala
  const existingPlayer = this.players.find((p: any) => p.userId === userId);
  if (existingPlayer) {
    existingPlayer.isConnected = true;
    return this.save();
  }

  // Verificar límite de jugadores
  if (this.players.length >= this.settings.maxPlayers) {
    throw new Error('La sala está llena');
  }

  // Agregar nuevo jugador
  this.players.push({
    userId,
    username,
    avatar,
    isConnected: true,
    joinedAt: new Date(),
    score: 0,
    isReady: false,
  });

  return this.save();
};

RoomSchema.methods.removePlayer = function (userId: string) {
  // Si es el host, transferir a otro jugador o cerrar sala
  if (this.hostId === userId && this.players.length > 1) {
    const connectedPlayers = this.players.filter((p: any) => p.isConnected && p.userId !== userId);
    if (connectedPlayers.length > 0) {
      this.hostId = connectedPlayers[0].userId;
    }
  }

  // Remover jugador
  this.players = this.players.filter((p: any) => p.userId !== userId);

  // Si no quedan jugadores, marcar para eliminación
  if (this.players.length === 0) {
    this.status = 'finished';
  }

  return this.save();
};

RoomSchema.methods.setPlayerConnection = function (userId: string, isConnected: boolean) {
  const player = this.players.find((p: any) => p.userId === userId);
  if (player) {
    player.isConnected = isConnected;
  }
  return this.save();
};

RoomSchema.methods.setPlayerReady = function (userId: string, isReady: boolean) {
  const player = this.players.find((p: any) => p.userId === userId);
  if (player) {
    player.isReady = isReady;
  }
  return this.save();
};

RoomSchema.methods.updatePlayerScore = function (userId: string, scoreToAdd: number) {
  const player = this.players.find((p: any) => p.userId === userId);
  if (player) {
    player.score += scoreToAdd;
  }
  return this.save();
};

RoomSchema.methods.startGame = function () {
  if (this.status !== 'waiting') {
    throw new Error('Solo se puede iniciar un juego desde el estado de espera');
  }

  const connectedPlayers = this.players.filter((p: any) => p.isConnected);
  if (connectedPlayers.length < 2) {
    throw new Error('Se necesitan al menos 2 jugadores para iniciar');
  }

  this.status = 'playing';
  return this.save();
};

RoomSchema.methods.finishGame = function (gameId: string) {
  this.status = 'waiting';
  this.currentGame = undefined;
  this.gameHistory.push(gameId);

  // Resetear estado de jugadores
  this.players.forEach((player: any) => {
    player.isReady = false;
  });

  return this.save();
};

RoomSchema.methods.resetScores = function () {
  this.players.forEach((player: any) => {
    player.score = 0;
  });
  return this.save();
};

// Métodos estáticos
RoomSchema.statics.findByCode = function (code: string) {
  return this.findOne({ code: code.toUpperCase() });
};

RoomSchema.statics.findByHostId = function (hostId: string) {
  return this.find({ hostId, status: { $ne: 'finished' } });
};

RoomSchema.statics.findPlayerRooms = function (userId: string) {
  return this.find({
    'players.userId': userId,
    status: { $ne: 'finished' },
  });
};

RoomSchema.statics.findActiveRooms = function () {
  return this.find({
    status: { $in: ['waiting', 'playing'] },
    'players.0': { $exists: true }, // Al menos un jugador
  }).sort({ lastActivity: -1 });
};

RoomSchema.statics.cleanupInactiveRooms = function (hoursInactive: number = 24) {
  const cutoffTime = new Date(Date.now() - hoursInactive * 60 * 60 * 1000);
  return this.deleteMany({
    status: 'finished',
    lastActivity: { $lt: cutoffTime },
  });
};

// Virtuals
RoomSchema.virtual('connectedPlayersCount').get(function () {
  return this.players.filter((p: any) => p.isConnected).length;
});

RoomSchema.virtual('readyPlayersCount').get(function () {
  return this.players.filter((p: any) => p.isConnected && p.isReady).length;
});

RoomSchema.virtual('canStart').get(function () {
  const connectedPlayers = this.players.filter((p: any) => p.isConnected);
  return connectedPlayers.length >= 2 && this.status === 'waiting';
});

// Asegurar que los virtuals se incluyan al convertir a JSON
RoomSchema.set('toJSON', { virtuals: true });

export const Room = mongoose.model<IRoom>('Room', RoomSchema);
