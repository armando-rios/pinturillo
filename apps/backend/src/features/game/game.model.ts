import mongoose, { Document, Schema } from 'mongoose';

// Interface para TypeScript
export interface IGame extends Document {
  _id: string;
  roomId: string;
  players: Array<{
    userId: string;
    username: string;
    score: number;
    correctGuesses: number;
    hasDrawn: boolean;
    isConnected: boolean;
  }>;
  rounds: Array<{
    roundNumber: number;
    drawerId: string;
    drawerUsername: string;
    word: string;
    difficulty: 'easy' | 'medium' | 'hard';
    startTime: Date;
    endTime?: Date;
    guesses: Array<{
      userId: string;
      username: string;
      guess: string;
      timestamp: Date;
      isCorrect: boolean;
      points: number;
    }>;
    drawing: Array<{
      x: number;
      y: number;
      prevX?: number;
      prevY?: number;
      color: string;
      lineWidth: number;
      timestamp: Date;
      tool: 'pen' | 'eraser' | 'clear';
    }>;
    completed: boolean;
    timeUsed: number; // en segundos
  }>;
  currentRound: number;
  status: 'starting' | 'playing' | 'between_rounds' | 'finished';
  settings: {
    maxRounds: number;
    drawingTimeLimit: number;
    guessingTimeLimit: number;
    language: string;
    difficulty: 'easy' | 'medium' | 'hard';
    customWords: string[];
    allowCustomWords: boolean;
  };
  words: {
    used: string[];
    available: string[];
    current?: string;
  };
  timer: {
    currentPhase: 'drawing' | 'guessing' | 'waiting';
    timeLeft: number;
    startTime: Date;
    endTime?: Date;
  };
  scores: Record<string, number>; // userId -> score total
  createdAt: Date;
  updatedAt: Date;
  finishedAt?: Date;
}

// Schema de Mongoose
const GameSchema = new Schema<IGame>(
  {
    roomId: {
      type: String,
      required: [true, 'Se requiere el ID de la sala'],
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
        score: {
          type: Number,
          default: 0,
          min: 0,
        },
        correctGuesses: {
          type: Number,
          default: 0,
          min: 0,
        },
        hasDrawn: {
          type: Boolean,
          default: false,
        },
        isConnected: {
          type: Boolean,
          default: true,
        },
      },
    ],
    rounds: [
      {
        roundNumber: {
          type: Number,
          required: true,
          min: 1,
        },
        drawerId: {
          type: String,
          required: true,
        },
        drawerUsername: {
          type: String,
          required: true,
        },
        word: {
          type: String,
          required: true,
          trim: true,
        },
        difficulty: {
          type: String,
          enum: ['easy', 'medium', 'hard'],
          required: true,
        },
        startTime: {
          type: Date,
          required: true,
          default: Date.now,
        },
        endTime: {
          type: Date,
        },
        guesses: [
          {
            userId: {
              type: String,
              required: true,
            },
            username: {
              type: String,
              required: true,
            },
            guess: {
              type: String,
              required: true,
              trim: true,
            },
            timestamp: {
              type: Date,
              default: Date.now,
            },
            isCorrect: {
              type: Boolean,
              default: false,
            },
            points: {
              type: Number,
              default: 0,
              min: 0,
            },
          },
        ],
        drawing: [
          {
            x: { type: Number, required: true },
            y: { type: Number, required: true },
            prevX: { type: Number },
            prevY: { type: Number },
            color: { type: String, required: true, default: '#000000' },
            lineWidth: { type: Number, required: true, default: 2, min: 1, max: 20 },
            timestamp: { type: Date, default: Date.now },
            tool: {
              type: String,
              enum: ['pen', 'eraser', 'clear'],
              default: 'pen',
            },
          },
        ],
        completed: {
          type: Boolean,
          default: false,
        },
        timeUsed: {
          type: Number,
          default: 0,
          min: 0,
        },
      },
    ],
    currentRound: {
      type: Number,
      default: 1,
      min: 1,
    },
    status: {
      type: String,
      enum: ['starting', 'playing', 'between_rounds', 'finished'],
      default: 'starting',
      required: true,
      index: true,
    },
    settings: {
      maxRounds: {
        type: Number,
        required: true,
        min: 1,
        max: 10,
      },
      drawingTimeLimit: {
        type: Number,
        required: true,
        min: 30,
        max: 180,
      },
      guessingTimeLimit: {
        type: Number,
        required: true,
        min: 5,
        max: 30,
      },
      language: {
        type: String,
        enum: ['es', 'en'],
        default: 'es',
      },
      difficulty: {
        type: String,
        enum: ['easy', 'medium', 'hard'],
        default: 'medium',
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
    words: {
      used: [
        {
          type: String,
          trim: true,
        },
      ],
      available: [
        {
          type: String,
          trim: true,
        },
      ],
      current: {
        type: String,
        trim: true,
      },
    },
    timer: {
      currentPhase: {
        type: String,
        enum: ['drawing', 'guessing', 'waiting'],
        default: 'waiting',
      },
      timeLeft: {
        type: Number,
        default: 0,
        min: 0,
      },
      startTime: {
        type: Date,
        default: Date.now,
      },
      endTime: {
        type: Date,
      },
    },
    scores: {
      type: Object,
      default: {},
    },
    finishedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
    collection: 'games',
  },
);

// Índices compuestos para consultas optimizadas
GameSchema.index({ roomId: 1, status: 1 });
GameSchema.index({ 'players.userId': 1, status: 1 });
GameSchema.index({ status: 1, createdAt: -1 });

// Middleware pre-save para validaciones
GameSchema.pre('save', function (next) {
  // Validar que el número de ronda actual no exceda el máximo
  if (this.currentRound > this.settings.maxRounds) {
    return next(new Error('El número de ronda excede el máximo configurado'));
  }

  // Actualizar scores object basado en players
  this.players.forEach(player => {
    this.scores[player.userId] = player.score;
  });

  next();
});

// Métodos de instancia
GameSchema.methods.addPlayer = function (userId: string, username: string) {
  const existingPlayer = this.players.find((p: any) => p.userId === userId);
  if (existingPlayer) {
    existingPlayer.isConnected = true;
    return this.save();
  }

  this.players.push({
    userId,
    username,
    score: 0,
    correctGuesses: 0,
    hasDrawn: false,
    isConnected: true,
  });

  this.scores[userId] = 0;
  return this.save();
};

GameSchema.methods.removePlayer = function (userId: string) {
  this.players = this.players.filter((p: any) => p.userId !== userId);
  delete this.scores[userId];
  return this.save();
};

GameSchema.methods.startNewRound = function (drawerId: string, word: string) {
  const drawer = this.players.find((p: any) => p.userId === drawerId);
  if (!drawer) {
    throw new Error('El dibujante no está en el juego');
  }

  const newRound = {
    roundNumber: this.currentRound,
    drawerId,
    drawerUsername: drawer.username,
    word,
    difficulty: this.settings.difficulty,
    startTime: new Date(),
    guesses: [],
    drawing: [],
    completed: false,
    timeUsed: 0,
  };

  this.rounds.push(newRound);
  this.words.current = word;
  this.words.used.push(word);
  this.words.available = this.words.available.filter((w: string) => w !== word);

  this.status = 'playing';
  this.timer.currentPhase = 'drawing';
  this.timer.timeLeft = this.settings.drawingTimeLimit;
  this.timer.startTime = new Date();

  // Marcar que el jugador ha dibujado
  drawer.hasDrawn = true;

  return this.save();
};

GameSchema.methods.addGuess = function (userId: string, username: string, guess: string) {
  const currentRoundIndex = this.rounds.length - 1;
  if (currentRoundIndex < 0) {
    throw new Error('No hay ronda activa');
  }

  const currentRound = this.rounds[currentRoundIndex];
  const player = this.players.find((p: any) => p.userId === userId);

  if (!player) {
    throw new Error('El jugador no está en el juego');
  }

  // No permitir que el dibujante adivine su propia palabra
  if (userId === currentRound.drawerId) {
    throw new Error('El dibujante no puede adivinar');
  }

  const isCorrect = guess.toLowerCase().trim() === currentRound.word.toLowerCase().trim();
  let points = 0;

  if (isCorrect) {
    // Calcular puntos basado en el tiempo restante y orden de acierto
    const timeElapsed = this.settings.drawingTimeLimit - this.timer.timeLeft;
    const correctGuessesInRound = currentRound.guesses.filter((g: any) => g.isCorrect).length;

    points = Math.max(50, 100 - Math.floor(timeElapsed / 2) - correctGuessesInRound * 10);

    player.score += points;
    player.correctGuesses += 1;
  }

  currentRound.guesses.push({
    userId,
    username,
    guess: guess.trim(),
    timestamp: new Date(),
    isCorrect,
    points,
  });

  return this.save();
};

GameSchema.methods.addDrawingData = function (drawingData: any) {
  const currentRoundIndex = this.rounds.length - 1;
  if (currentRoundIndex < 0) {
    throw new Error('No hay ronda activa');
  }

  this.rounds[currentRoundIndex].drawing.push({
    ...drawingData,
    timestamp: new Date(),
  });

  return this.save();
};

GameSchema.methods.endCurrentRound = function () {
  const currentRoundIndex = this.rounds.length - 1;
  if (currentRoundIndex < 0) {
    throw new Error('No hay ronda activa');
  }

  const currentRound = this.rounds[currentRoundIndex];
  const timeUsed = Math.floor((Date.now() - currentRound.startTime.getTime()) / 1000);

  currentRound.endTime = new Date();
  currentRound.completed = true;
  currentRound.timeUsed = timeUsed;

  if (this.currentRound >= this.settings.maxRounds) {
    this.status = 'finished';
    this.finishedAt = new Date();
  } else {
    this.currentRound += 1;
    this.status = 'between_rounds';
  }

  this.timer.currentPhase = 'waiting';
  this.timer.timeLeft = 0;
  this.words.current = undefined;

  return this.save();
};

GameSchema.methods.getNextDrawer = function () {
  // Obtener jugadores que no han dibujado en esta ronda o el que menos ha dibujado
  const playersWhoHaventDrawn = this.players.filter((p: any) => !p.hasDrawn && p.isConnected);

  if (playersWhoHaventDrawn.length > 0) {
    return playersWhoHaventDrawn[0];
  }

  // Si todos han dibujado, resetear y elegir el primero
  this.players.forEach((player: any) => {
    player.hasDrawn = false;
  });

  const connectedPlayers = this.players.filter((p: any) => p.isConnected);
  return connectedPlayers.length > 0 ? connectedPlayers[0] : null;
};

GameSchema.methods.getRandomWord = function () {
  if (this.words.available.length === 0) {
    throw new Error('No hay palabras disponibles');
  }

  const randomIndex = Math.floor(Math.random() * this.words.available.length);
  return this.words.available[randomIndex];
};

// Métodos estáticos
GameSchema.statics.findActiveByRoom = function (roomId: string) {
  return this.findOne({
    roomId,
    status: { $in: ['starting', 'playing', 'between_rounds'] },
  });
};

GameSchema.statics.findPlayerGames = function (userId: string) {
  return this.find({
    'players.userId': userId,
  }).sort({ createdAt: -1 });
};

GameSchema.statics.cleanupOldGames = function (daysOld: number = 30) {
  const cutoffTime = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);
  return this.deleteMany({
    status: 'finished',
    finishedAt: { $lt: cutoffTime },
  });
};

// Virtuals
GameSchema.virtual('isActive').get(function () {
  return ['starting', 'playing', 'between_rounds'].includes(this.status);
});

GameSchema.virtual('currentRoundData').get(function () {
  if (this.rounds.length === 0) return null;
  return this.rounds[this.rounds.length - 1];
});

GameSchema.virtual('leaderboard').get(function () {
  return this.players
    .filter((p: any) => p.isConnected)
    .sort((a: any, b: any) => b.score - a.score)
    .map((player: any, index: number) => ({
      position: index + 1,
      userId: player.userId,
      username: player.username,
      score: player.score,
      correctGuesses: player.correctGuesses,
    }));
});

// Asegurar que los virtuals se incluyan al convertir a JSON
GameSchema.set('toJSON', { virtuals: true });

export const Game = mongoose.model<IGame>('Game', GameSchema);
