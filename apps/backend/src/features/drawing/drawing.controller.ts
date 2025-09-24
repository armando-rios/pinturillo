import { Response } from 'express';
import { Drawing } from './drawing.model.ts';
import { Game } from '../game/game.model.ts';
import { User } from '../auth/auth.model.ts';
import { AuthenticatedRequest } from '../../shared/middleware.ts';

export class DrawingController {
  static async createDrawing(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      const user = await User.findById(req.user.userId);
      if (!user || !user.currentRoom) {
        res.status(400).json({ error: 'User is not in any room' });
        return;
      }

      const game = await Game.findOne({
        room: user.currentRoom,
        status: 'active',
      });

      if (!game) {
        res.status(404).json({ error: 'No active game found' });
        return;
      }

      if (!game.currentRound || game.currentRound.phase !== 'drawing') {
        res.status(400).json({ error: 'Not in drawing phase' });
        return;
      }

      if (game.currentRound.drawer?.toString() !== user._id.toString()) {
        res.status(403).json({ error: 'Only the current drawer can create drawings' });
        return;
      }

      const existingDrawing = await Drawing.findOne({
        game: game._id,
        round: game.currentRound.number,
        drawer: user._id,
      });

      if (existingDrawing) {
        res.status(400).json({ error: 'Drawing already exists for this round' });
        return;
      }

      const { canvasSettings } = req.body;

      const drawing = new Drawing({
        game: game._id,
        round: game.currentRound.number,
        drawer: user._id,
        word: game.currentRound.word,
        strokes: [],
        canvasSettings: canvasSettings || {
          width: 800,
          height: 600,
          backgroundColor: '#ffffff',
        },
      });

      await drawing.save();

      res.status(201).json({
        message: 'Drawing created successfully',
        drawing: {
          id: drawing._id,
          game: drawing.game,
          round: drawing.round,
          drawer: drawing.drawer,
          canvasSettings: drawing.canvasSettings,
          createdAt: drawing.createdAt,
        },
      });
    } catch (error) {
      console.error('Create drawing error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async addStroke(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      const { drawingId } = req.params;
      const { tool, color, size, opacity, points } = req.body;

      if (!points || !Array.isArray(points) || points.length === 0) {
        res.status(400).json({ error: 'Points array is required and cannot be empty' });
        return;
      }

      const drawing = await Drawing.findById(drawingId);
      if (!drawing) {
        res.status(404).json({ error: 'Drawing not found' });
        return;
      }

      if (drawing.drawer.toString() !== req.user.userId) {
        res.status(403).json({ error: 'Only the drawer can add strokes' });
        return;
      }

      if (drawing.isCompleted) {
        res.status(400).json({ error: 'Drawing is already completed' });
        return;
      }

      const game = await Game.findById(drawing.game);
      if (!game || game.status !== 'active') {
        res.status(400).json({ error: 'Game is not active' });
        return;
      }

      if (!game.currentRound || game.currentRound.phase !== 'drawing') {
        res.status(400).json({ error: 'Not in drawing phase' });
        return;
      }

      const validatedPoints = points.map((point: any) => ({
        x: Number(point.x),
        y: Number(point.y),
        pressure: point.pressure ? Number(point.pressure) : 1,
        timestamp: point.timestamp || new Date(),
      }));

      const strokeData = {
        tool: tool || 'pen',
        color: color || '#000000',
        size: size || 2,
        opacity: opacity || 1,
        points: validatedPoints,
      };

      const stroke = await drawing.addStroke(strokeData);

      res.json({
        message: 'Stroke added successfully',
        stroke: {
          id: stroke._id,
          tool: stroke.tool,
          color: stroke.color,
          size: stroke.size,
          opacity: stroke.opacity,
          pointsCount: stroke.points.length,
          createdAt: stroke.createdAt,
        },
        totalStrokes: drawing.metadata.totalStrokes,
      });
    } catch (error) {
      console.error('Add stroke error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async getDrawing(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { drawingId } = req.params;

      const drawing = await Drawing.findById(drawingId)
        .populate('drawer', 'username avatar')
        .populate('game', 'room');

      if (!drawing) {
        res.status(404).json({ error: 'Drawing not found' });
        return;
      }

      // Verificar que el usuario tiene acceso al dibujo
      if (req.user) {
        const user = await User.findById(req.user.userId);
        const game = await Game.findById(drawing.game).populate('room');

        if (user && game) {
          const room = game.room as any;
          const hasAccess =
            room.players.some((p: any) => p.user.toString() === user._id.toString()) ||
            room.host.toString() === user._id.toString();

          if (!hasAccess) {
            res.status(403).json({ error: 'Access denied' });
            return;
          }
        }
      }

      res.json({
        drawing: {
          id: drawing._id,
          game: drawing.game,
          round: drawing.round,
          drawer: drawing.drawer,
          word: drawing.word,
          strokes: drawing.strokes,
          canvasSettings: drawing.canvasSettings,
          metadata: drawing.metadata,
          isCompleted: drawing.isCompleted,
          completedAt: drawing.completedAt,
          createdAt: drawing.createdAt,
        },
      });
    } catch (error) {
      console.error('Get drawing error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async getCurrentDrawing(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      const user = await User.findById(req.user.userId);
      if (!user || !user.currentRoom) {
        res.json({ drawing: null });
        return;
      }

      const game = await Game.findOne({
        room: user.currentRoom,
        status: 'active',
      });

      if (!game || !game.currentRound) {
        res.json({ drawing: null });
        return;
      }

      const drawing = await Drawing.findOne({
        game: game._id,
        round: game.currentRound.number,
      }).populate('drawer', 'username avatar');

      if (!drawing) {
        res.json({ drawing: null });
        return;
      }

      const isDrawer = drawing.drawer._id.toString() === user._id.toString();

      res.json({
        drawing: {
          id: drawing._id,
          game: drawing.game,
          round: drawing.round,
          drawer: drawing.drawer,
          word: isDrawer ? drawing.word : undefined,
          strokes: drawing.strokes,
          canvasSettings: drawing.canvasSettings,
          metadata: drawing.metadata,
          isCompleted: drawing.isCompleted,
          isDrawer,
        },
      });
    } catch (error) {
      console.error('Get current drawing error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async completeDrawing(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      const { drawingId } = req.params;

      const drawing = await Drawing.findById(drawingId);
      if (!drawing) {
        res.status(404).json({ error: 'Drawing not found' });
        return;
      }

      if (drawing.drawer.toString() !== req.user.userId) {
        res.status(403).json({ error: 'Only the drawer can complete the drawing' });
        return;
      }

      if (drawing.isCompleted) {
        res.status(400).json({ error: 'Drawing is already completed' });
        return;
      }

      await drawing.completeDrawing();

      res.json({
        message: 'Drawing completed successfully',
        drawing: {
          id: drawing._id,
          isCompleted: drawing.isCompleted,
          completedAt: drawing.completedAt,
          metadata: drawing.metadata,
        },
      });
    } catch (error) {
      console.error('Complete drawing error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async clearCanvas(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      const { drawingId } = req.params;

      const drawing = await Drawing.findById(drawingId);
      if (!drawing) {
        res.status(404).json({ error: 'Drawing not found' });
        return;
      }

      if (drawing.drawer.toString() !== req.user.userId) {
        res.status(403).json({ error: 'Only the drawer can clear the canvas' });
        return;
      }

      if (drawing.isCompleted) {
        res.status(400).json({ error: 'Cannot clear completed drawing' });
        return;
      }

      drawing.strokes = [];
      drawing.metadata.totalStrokes = 0;
      drawing.metadata.toolUsage = new Map();
      drawing.metadata.colorUsage = new Map();
      drawing.updatedAt = new Date();

      await drawing.save();

      res.json({
        message: 'Canvas cleared successfully',
        drawing: {
          id: drawing._id,
          strokes: drawing.strokes,
          metadata: drawing.metadata,
        },
      });
    } catch (error) {
      console.error('Clear canvas error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async getDrawingsByGame(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      const { gameId } = req.params;

      const game = await Game.findById(gameId);
      if (!game) {
        res.status(404).json({ error: 'Game not found' });
        return;
      }

      // Verificar que el usuario tiene acceso al juego
      const user = await User.findById(req.user.userId);
      if (user) {
        const isPlayer = game.players.some(p => p.user.toString() === user._id.toString());
        if (!isPlayer) {
          res.status(403).json({ error: 'Access denied' });
          return;
        }
      }

      const drawings = await Drawing.find({ game: gameId })
        .populate('drawer', 'username avatar')
        .sort({ round: 1, createdAt: 1 });

      res.json({
        drawings: drawings.map(drawing => ({
          id: drawing._id,
          round: drawing.round,
          drawer: drawing.drawer,
          word: drawing.word,
          strokesCount: drawing.strokes.length,
          metadata: drawing.metadata,
          isCompleted: drawing.isCompleted,
          completedAt: drawing.completedAt,
          createdAt: drawing.createdAt,
        })),
        total: drawings.length,
      });
    } catch (error) {
      console.error('Get drawings by game error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async getDrawingHistory(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      const { page = 1, limit = 10 } = req.query;

      const drawings = await Drawing.find({
        drawer: req.user.userId,
        isCompleted: true,
      })
        .populate('game', 'createdAt')
        .sort({ completedAt: -1 })
        .skip((Number(page) - 1) * Number(limit))
        .limit(Number(limit));

      const totalDrawings = await Drawing.countDocuments({
        drawer: req.user.userId,
        isCompleted: true,
      });

      res.json({
        drawings: drawings.map(drawing => ({
          id: drawing._id,
          word: drawing.word,
          round: drawing.round,
          strokesCount: drawing.strokes.length,
          metadata: drawing.metadata,
          complexity: drawing.complexity,
          dominantColor: drawing.dominantColor,
          completedAt: drawing.completedAt,
          gameDate: (drawing.game as any)?.createdAt,
        })),
        pagination: {
          currentPage: Number(page),
          totalPages: Math.ceil(totalDrawings / Number(limit)),
          totalDrawings,
          hasNext: Number(page) * Number(limit) < totalDrawings,
          hasPrev: Number(page) > 1,
        },
      });
    } catch (error) {
      console.error('Get drawing history error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}
