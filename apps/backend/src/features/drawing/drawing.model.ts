import mongoose, { Document, Schema } from 'mongoose';

// Interface para TypeScript
export interface IDrawing extends Document {
  _id: string;
  gameId: string;
  roomId: string;
  roundNumber: number;
  drawerId: string;
  drawerUsername: string;
  word: string;
  strokes: Array<{
    id: string;
    points: Array<{
      x: number;
      y: number;
      pressure?: number;
      timestamp: Date;
    }>;
    tool: 'pen' | 'eraser' | 'highlighter';
    color: string;
    lineWidth: number;
    opacity: number;
    startTime: Date;
    endTime?: Date;
    completed: boolean;
  }>;
  canvas: {
    width: number;
    height: number;
    backgroundColor: string;
  };
  metadata: {
    totalStrokes: number;
    totalPoints: number;
    drawingDuration: number; // en segundos
    averageStrokeLength: number;
    toolUsage: {
      pen: number;
      eraser: number;
      highlighter: number;
    };
    colorUsage: Record<string, number>;
  };
  status: 'active' | 'completed' | 'abandoned';
  stats: {
    correctGuesses: number;
    totalGuesses: number;
    averageGuessTime: number;
    firstCorrectGuessTime?: number;
  };
  thumbnail?: string; // Base64 o URL de imagen pequeña
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}

// Schema de Mongoose
const DrawingSchema = new Schema<IDrawing>(
  {
    gameId: {
      type: String,
      required: [true, 'Se requiere el ID del juego'],
      index: true,
    },
    roomId: {
      type: String,
      required: [true, 'Se requiere el ID de la sala'],
      index: true,
    },
    roundNumber: {
      type: Number,
      required: [true, 'Se requiere el número de ronda'],
      min: 1,
    },
    drawerId: {
      type: String,
      required: [true, 'Se requiere el ID del dibujante'],
      index: true,
    },
    drawerUsername: {
      type: String,
      required: [true, 'Se requiere el nombre del dibujante'],
      trim: true,
    },
    word: {
      type: String,
      required: [true, 'Se requiere la palabra a dibujar'],
      trim: true,
    },
    strokes: [
      {
        id: {
          type: String,
          required: true,
          default: () => new mongoose.Types.ObjectId().toString(),
        },
        points: [
          {
            x: { type: Number, required: true },
            y: { type: Number, required: true },
            pressure: { type: Number, min: 0, max: 1, default: 1 },
            timestamp: { type: Date, default: Date.now },
          },
        ],
        tool: {
          type: String,
          enum: ['pen', 'eraser', 'highlighter'],
          default: 'pen',
          required: true,
        },
        color: {
          type: String,
          required: true,
          default: '#000000',
          match: [
            /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/,
            'Color debe ser un código hexadecimal válido',
          ],
        },
        lineWidth: {
          type: Number,
          required: true,
          min: 1,
          max: 50,
          default: 2,
        },
        opacity: {
          type: Number,
          min: 0,
          max: 1,
          default: 1,
        },
        startTime: {
          type: Date,
          default: Date.now,
        },
        endTime: {
          type: Date,
        },
        completed: {
          type: Boolean,
          default: false,
        },
      },
    ],
    canvas: {
      width: {
        type: Number,
        required: true,
        min: 100,
        max: 2000,
        default: 800,
      },
      height: {
        type: Number,
        required: true,
        min: 100,
        max: 2000,
        default: 600,
      },
      backgroundColor: {
        type: String,
        default: '#FFFFFF',
        match: [
          /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/,
          'Color debe ser un código hexadecimal válido',
        ],
      },
    },
    metadata: {
      totalStrokes: { type: Number, default: 0, min: 0 },
      totalPoints: { type: Number, default: 0, min: 0 },
      drawingDuration: { type: Number, default: 0, min: 0 },
      averageStrokeLength: { type: Number, default: 0, min: 0 },
      toolUsage: {
        pen: { type: Number, default: 0, min: 0 },
        eraser: { type: Number, default: 0, min: 0 },
        highlighter: { type: Number, default: 0, min: 0 },
      },
      colorUsage: {
        type: Object,
        default: {},
      },
    },
    status: {
      type: String,
      enum: ['active', 'completed', 'abandoned'],
      default: 'active',
      required: true,
      index: true,
    },
    stats: {
      correctGuesses: { type: Number, default: 0, min: 0 },
      totalGuesses: { type: Number, default: 0, min: 0 },
      averageGuessTime: { type: Number, default: 0, min: 0 },
      firstCorrectGuessTime: { type: Number, min: 0 },
    },
    thumbnail: {
      type: String,
      maxlength: 100000, // Límite para Base64 pequeño
    },
    completedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
    collection: 'drawings',
  },
);

// Índices compuestos para consultas optimizadas
DrawingSchema.index({ gameId: 1, roundNumber: 1 });
DrawingSchema.index({ roomId: 1, createdAt: -1 });
DrawingSchema.index({ drawerId: 1, status: 1 });
DrawingSchema.index({ status: 1, createdAt: -1 });

// Middleware pre-save para calcular metadata
DrawingSchema.pre('save', function (next) {
  // Calcular metadata automáticamente
  this.metadata.totalStrokes = this.strokes.length;
  this.metadata.totalPoints = this.strokes.reduce(
    (total, stroke) => total + stroke.points.length,
    0,
  );

  // Calcular uso de herramientas
  this.metadata.toolUsage = {
    pen: 0,
    eraser: 0,
    highlighter: 0,
  };

  // Calcular uso de colores
  this.metadata.colorUsage = {};

  this.strokes.forEach(stroke => {
    this.metadata.toolUsage[stroke.tool]++;

    if (this.metadata.colorUsage[stroke.color]) {
      this.metadata.colorUsage[stroke.color] = (this.metadata.colorUsage[stroke.color] || 0) + 1;
    } else {
      this.metadata.colorUsage[stroke.color] = 1;
    }
  });

  // Calcular duración del dibujo si está completado
  if (this.status === 'completed' && this.completedAt) {
    this.metadata.drawingDuration = Math.floor(
      (this.completedAt.getTime() - this.createdAt.getTime()) / 1000,
    );
  }

  // Calcular longitud promedio de trazos
  if (this.metadata.totalStrokes > 0) {
    this.metadata.averageStrokeLength = this.metadata.totalPoints / this.metadata.totalStrokes;
  }

  next();
});

// Métodos de instancia
DrawingSchema.methods.addStroke = function (strokeData: any) {
  const stroke = {
    id: new mongoose.Types.ObjectId().toString(),
    points: [],
    tool: strokeData.tool || 'pen',
    color: strokeData.color || '#000000',
    lineWidth: strokeData.lineWidth || 2,
    opacity: strokeData.opacity || 1,
    startTime: new Date(),
    completed: false,
    ...strokeData,
  };

  this.strokes.push(stroke);
  return this.save();
};

DrawingSchema.methods.addPointToStroke = function (strokeId: string, point: any) {
  const stroke = this.strokes.find((s: any) => s.id === strokeId);
  if (!stroke) {
    throw new Error('Trazo no encontrado');
  }

  stroke.points.push({
    x: point.x,
    y: point.y,
    pressure: point.pressure || 1,
    timestamp: new Date(),
  });

  return this.save();
};

DrawingSchema.methods.completeStroke = function (strokeId: string) {
  const stroke = this.strokes.find((s: any) => s.id === strokeId);
  if (!stroke) {
    throw new Error('Trazo no encontrado');
  }

  stroke.completed = true;
  stroke.endTime = new Date();

  return this.save();
};

DrawingSchema.methods.clearCanvas = function () {
  this.strokes = [];
  return this.save();
};

DrawingSchema.methods.completeDrawing = function (thumbnail?: string) {
  this.status = 'completed';
  this.completedAt = new Date();

  if (thumbnail) {
    this.thumbnail = thumbnail;
  }

  return this.save();
};

DrawingSchema.methods.abandonDrawing = function () {
  this.status = 'abandoned';
  return this.save();
};

DrawingSchema.methods.updateStats = function (guessData: any) {
  this.stats.totalGuesses++;

  if (guessData.isCorrect) {
    this.stats.correctGuesses++;

    if (!this.stats.firstCorrectGuessTime) {
      this.stats.firstCorrectGuessTime = Math.floor(
        (new Date().getTime() - this.createdAt.getTime()) / 1000,
      );
    }
  }

  // Recalcular tiempo promedio de adivinanza
  if (this.stats.totalGuesses > 0) {
    const totalTime = this.stats.firstCorrectGuessTime || this.metadata.drawingDuration;
    this.stats.averageGuessTime = totalTime / this.stats.totalGuesses;
  }

  return this.save();
};

// Métodos estáticos
DrawingSchema.statics.findByGame = function (gameId: string) {
  return this.find({ gameId }).sort({ roundNumber: 1 });
};

DrawingSchema.statics.findByRoom = function (roomId: string) {
  return this.find({ roomId }).sort({ createdAt: -1 });
};

DrawingSchema.statics.findByDrawer = function (drawerId: string) {
  return this.find({ drawerId }).sort({ createdAt: -1 });
};

DrawingSchema.statics.findActiveDrawings = function () {
  return this.find({ status: 'active' }).sort({ createdAt: -1 });
};

DrawingSchema.statics.findCompletedDrawings = function (limit: number = 50) {
  return this.find({ status: 'completed' })
    .sort({ completedAt: -1 })
    .limit(limit)
    .select('drawerId drawerUsername word thumbnail stats createdAt completedAt');
};

DrawingSchema.statics.getDrawingStats = function (drawerId?: string) {
  const matchStage = drawerId
    ? { $match: { drawerId, status: 'completed' } }
    : { $match: { status: 'completed' } };

  return this.aggregate([
    matchStage,
    {
      $group: {
        _id: null,
        totalDrawings: { $sum: 1 },
        totalStrokes: { $sum: '$metadata.totalStrokes' },
        totalPoints: { $sum: '$metadata.totalPoints' },
        averageDrawingTime: { $avg: '$metadata.drawingDuration' },
        averageCorrectGuesses: { $avg: '$stats.correctGuesses' },
        averageStrokesPerDrawing: { $avg: '$metadata.totalStrokes' },
        mostUsedTool: {
          $max: {
            $cond: [
              { $gte: ['$metadata.toolUsage.pen', '$metadata.toolUsage.eraser'] },
              {
                $cond: [
                  { $gte: ['$metadata.toolUsage.pen', '$metadata.toolUsage.highlighter'] },
                  'pen',
                  'highlighter',
                ],
              },
              {
                $cond: [
                  { $gte: ['$metadata.toolUsage.eraser', '$metadata.toolUsage.highlighter'] },
                  'eraser',
                  'highlighter',
                ],
              },
            ],
          },
        },
      },
    },
  ]);
};

DrawingSchema.statics.cleanupOldDrawings = function (daysOld: number = 90) {
  const cutoffTime = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);
  return this.deleteMany({
    status: { $in: ['completed', 'abandoned'] },
    updatedAt: { $lt: cutoffTime },
  });
};

// Virtuals
DrawingSchema.virtual('isActive').get(function () {
  return this.status === 'active';
});

DrawingSchema.virtual('guessSuccessRate').get(function () {
  if (this.stats.totalGuesses === 0) return 0;
  return Math.round((this.stats.correctGuesses / this.stats.totalGuesses) * 100);
});

DrawingSchema.virtual('complexity').get(function () {
  // Calcular complejidad basada en número de trazos y puntos
  const strokeComplexity = this.metadata.totalStrokes / 50; // Normalizar por 50 trazos
  const pointComplexity = this.metadata.totalPoints / 1000; // Normalizar por 1000 puntos
  const toolVariety =
    Object.values(this.metadata.toolUsage).filter((count: any) => count > 0).length / 3;
  const colorVariety = Object.keys(this.metadata.colorUsage).length / 5; // Normalizar por 5 colores

  const complexity = (strokeComplexity + pointComplexity + toolVariety + colorVariety) / 4;
  return Math.min(Math.round(complexity * 100), 100); // Máximo 100%
});

DrawingSchema.virtual('dominantColor').get(function () {
  const colors = Object.entries(this.metadata.colorUsage);
  if (colors.length === 0) return '#000000';

  return colors.reduce((prev, current) =>
    (current[1] as number) > (prev[1] as number) ? current : prev,
  )[0];
});

// Asegurar que los virtuals se incluyan al convertir a JSON
DrawingSchema.set('toJSON', { virtuals: true });

export const Drawing = mongoose.model<IDrawing>('Drawing', DrawingSchema);
