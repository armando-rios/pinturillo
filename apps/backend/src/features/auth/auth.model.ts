import mongoose, { Document, Schema } from 'mongoose';

// Interface para TypeScript
export interface IUser extends Document {
  _id: string;
  username: string;
  email?: string;
  avatar: string;
  isOnline: boolean;
  socketId?: string;
  currentRoom?: string;
  stats: {
    gamesPlayed: number;
    gamesWon: number;
    totalScore: number;
    averageScore: number;
    correctGuesses: number;
    wordsDrawn: number;
  };
  preferences: {
    language: string;
    soundEnabled: boolean;
    notificationsEnabled: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
  lastActivity: Date;
}

// Schema de Mongoose
const UserSchema = new Schema<IUser>(
  {
    username: {
      type: String,
      required: [true, 'El nombre de usuario es requerido'],
      unique: true,
      trim: true,
      minlength: [2, 'El nombre debe tener al menos 2 caracteres'],
      maxlength: [20, 'El nombre no puede exceder 20 caracteres'],
      match: [/^[a-zA-Z0-9_-]+$/, 'Solo se permiten letras, números, guiones y guiones bajos'],
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Email inválido'],
      sparse: true, // Permite múltiples documentos con email null
    },
    avatar: {
      type: String,
      required: true,
      default: function () {
        return `https://api.dicebear.com/7.x/avataaars/svg?seed=${this.username}`;
      },
    },
    isOnline: {
      type: Boolean,
      default: false,
      index: true,
    },
    socketId: {
      type: String,
      sparse: true,
      index: true,
    },
    currentRoom: {
      type: String,
      default: null,
      index: true,
    },
    stats: {
      gamesPlayed: { type: Number, default: 0, min: 0 },
      gamesWon: { type: Number, default: 0, min: 0 },
      totalScore: { type: Number, default: 0, min: 0 },
      averageScore: { type: Number, default: 0, min: 0 },
      correctGuesses: { type: Number, default: 0, min: 0 },
      wordsDrawn: { type: Number, default: 0, min: 0 },
    },
    preferences: {
      language: { type: String, default: 'es', enum: ['es', 'en'] },
      soundEnabled: { type: Boolean, default: true },
      notificationsEnabled: { type: Boolean, default: true },
    },
    lastActivity: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true, // Crea automáticamente createdAt y updatedAt
    collection: 'users',
  },
);

// Índices compuestos para consultas optimizadas
UserSchema.index({ isOnline: 1, lastActivity: -1 });
UserSchema.index({ currentRoom: 1, isOnline: 1 });

// Middleware pre-save para actualizar avatar si cambia username
UserSchema.pre('save', function (next) {
  if (this.isModified('username') && !this.isModified('avatar')) {
    this.avatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${this.username}`;
  }
  next();
});

// Middleware pre-save para calcular promedio de puntuación
UserSchema.pre('save', function (next) {
  if (this.isModified('stats')) {
    if (this.stats.gamesPlayed > 0) {
      this.stats.averageScore = Math.round(this.stats.totalScore / this.stats.gamesPlayed);
    }
  }
  next();
});

// Métodos de instancia
UserSchema.methods.updateActivity = function () {
  this.lastActivity = new Date();
  return this.save();
};

UserSchema.methods.setOnline = function (socketId: string) {
  this.isOnline = true;
  this.socketId = socketId;
  this.lastActivity = new Date();
  return this.save();
};

UserSchema.methods.setOffline = function () {
  this.isOnline = false;
  this.socketId = undefined;
  this.currentRoom = undefined;
  return this.save();
};

UserSchema.methods.joinRoom = function (roomId: string) {
  this.currentRoom = roomId;
  return this.save();
};

UserSchema.methods.leaveRoom = function () {
  this.currentRoom = undefined;
  return this.save();
};

UserSchema.methods.addGameStats = function (
  score: number,
  won: boolean,
  correctGuesses: number,
  didDraw: boolean,
) {
  this.stats.gamesPlayed += 1;
  this.stats.totalScore += score;
  this.stats.correctGuesses += correctGuesses;

  if (won) {
    this.stats.gamesWon += 1;
  }

  if (didDraw) {
    this.stats.wordsDrawn += 1;
  }

  // El promedio se calcula automáticamente en el pre-save
  return this.save();
};

// Métodos estáticos
UserSchema.statics.findByUsername = function (username: string) {
  return this.findOne({ username: new RegExp(`^${username}$`, 'i') });
};

UserSchema.statics.findOnlineUsers = function () {
  return this.find({ isOnline: true }).sort({ lastActivity: -1 });
};

UserSchema.statics.findUsersInRoom = function (roomId: string) {
  return this.find({ currentRoom: roomId, isOnline: true });
};

UserSchema.statics.cleanupInactiveUsers = function (minutesInactive: number = 30) {
  const cutoffTime = new Date(Date.now() - minutesInactive * 60 * 1000);
  return this.updateMany(
    {
      isOnline: true,
      lastActivity: { $lt: cutoffTime },
    },
    {
      $set: { isOnline: false },
      $unset: { socketId: '', currentRoom: '' },
    },
  );
};

// Virtual para calcular el win rate
UserSchema.virtual('winRate').get(function () {
  if (this.stats.gamesPlayed === 0) return 0;
  return Math.round((this.stats.gamesWon / this.stats.gamesPlayed) * 100);
});

// Asegurar que los virtuals se incluyan al convertir a JSON
UserSchema.set('toJSON', { virtuals: true });

export const User = mongoose.model<IUser>('User', UserSchema);
