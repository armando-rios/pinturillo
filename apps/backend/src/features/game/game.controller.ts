import { Response } from 'express';
import { Game } from './game.model.ts';
import { Room } from '../rooms/rooms.model.ts';
import { User } from '../auth/auth.model.ts';
import { AuthenticatedRequest } from '../../shared/middleware.ts';

export class GameController {
  static async startGame(req: AuthenticatedRequest, res: Response): Promise<void> {
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

      const room = await Room.findById(user.currentRoom).populate('players.user', 'username');
      if (!room) {
        res.status(404).json({ error: 'Room not found' });
        return;
      }

      if (room.host.toString() !== user._id.toString()) {
        res.status(403).json({ error: 'Only room host can start the game' });
        return;
      }

      if (room.isGameActive) {
        res.status(400).json({ error: 'Game is already active' });
        return;
      }

      if (room.connectedPlayersCount < 2) {
        res.status(400).json({ error: 'Need at least 2 players to start game' });
        return;
      }

      const connectedPlayers = room.players.filter(p => p.isConnected);
      if (connectedPlayers.length !== room.readyPlayersCount) {
        res.status(400).json({ error: 'All connected players must be ready' });
        return;
      }

      const existingGame = await Game.findOne({
        room: room._id,
        status: { $in: ['waiting', 'active'] },
      });
      if (existingGame) {
        res.status(400).json({ error: 'Game already exists for this room' });
        return;
      }

      const game = new Game({
        room: room._id,
        players: connectedPlayers.map(p => ({
          user: p.user,
          score: 0,
          hasDrawn: false,
        })),
        settings: {
          totalRounds: room.settings.rounds,
          drawingTimeLimit: room.settings.drawingTimeLimit,
          guessingTimeLimit: 10,
        },
        wordsPool: GameController.generateWordsPool(room.settings.difficulty),
      });

      await game.save();
      await room.startGame();
      await game.startNewRound();

      const populatedGame = await Game.findById(game._id)
        .populate('room', 'name code')
        .populate('players.user', 'username avatar')
        .populate('currentRound.drawer', 'username avatar');

      res.json({
        message: 'Game started successfully',
        game: {
          id: populatedGame!._id,
          room: populatedGame!.room,
          players: populatedGame!.players,
          currentRound: populatedGame!.currentRound,
          totalRounds: populatedGame!.settings.totalRounds,
          status: populatedGame!.status,
          leaderboard: populatedGame!.leaderboard,
        },
      });
    } catch (error) {
      console.error('Start game error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async endGame(req: AuthenticatedRequest, res: Response): Promise<void> {
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

      const room = await Room.findById(user.currentRoom);
      if (!room) {
        res.status(404).json({ error: 'Room not found' });
        return;
      }

      if (room.host.toString() !== user._id.toString()) {
        res.status(403).json({ error: 'Only room host can end the game' });
        return;
      }

      if (!room.isGameActive) {
        res.status(400).json({ error: 'No active game to end' });
        return;
      }

      const game = await Game.findOne({
        room: room._id,
        status: { $in: ['waiting', 'active'] },
      }).populate('players.user', 'username avatar');

      if (!game) {
        res.status(404).json({ error: 'Active game not found' });
        return;
      }

      game.status = 'finished';
      game.endedAt = new Date();
      await game.save();

      await room.finishGame();

      // Actualizar estadísticas de usuarios
      const winner = game.leaderboard[0];
      for (const player of game.players) {
        const playerUser = await User.findById(player.user);
        if (playerUser) {
          playerUser.gamesPlayed += 1;
          playerUser.totalScore += player.score;

          if (winner && player.user.toString() === winner.user.toString()) {
            playerUser.gamesWon += 1;
          }

          playerUser.averageScore = Math.round(playerUser.totalScore / playerUser.gamesPlayed);
          await playerUser.save();
        }
      }

      res.json({
        message: 'Game ended successfully',
        game: {
          id: game._id,
          status: game.status,
          leaderboard: game.leaderboard,
          winner: winner
            ? {
                user: winner.user,
                score: winner.score,
              }
            : null,
          endedAt: game.endedAt,
        },
      });
    } catch (error) {
      console.error('End game error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async getCurrentGame(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      const user = await User.findById(req.user.userId);
      if (!user || !user.currentRoom) {
        res.json({ game: null });
        return;
      }

      const game = await Game.findOne({
        room: user.currentRoom,
        status: { $in: ['waiting', 'active'] },
      })
        .populate('room', 'name code')
        .populate('players.user', 'username avatar')
        .populate('currentRound.drawer', 'username avatar');

      if (!game) {
        res.json({ game: null });
        return;
      }

      const isDrawer = game.currentRound?.drawer?.toString() === user._id.toString();

      res.json({
        game: {
          id: game._id,
          room: game.room,
          players: game.players,
          currentRound: {
            ...game.currentRound,
            word: isDrawer ? game.currentRound?.word : undefined,
            wordHint: game.currentRound?.word
              ? GameController.createWordHint(game.currentRound.word)
              : undefined,
          },
          totalRounds: game.settings.totalRounds,
          status: game.status,
          leaderboard: game.leaderboard,
          isDrawer,
        },
      });
    } catch (error) {
      console.error('Get current game error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async addGuess(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      const { guess } = req.body;

      if (!guess || typeof guess !== 'string' || guess.trim().length === 0) {
        res.status(400).json({ error: 'Guess is required' });
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
      }).populate('players.user', 'username avatar');

      if (!game) {
        res.status(404).json({ error: 'No active game found' });
        return;
      }

      if (!game.currentRound || game.currentRound.phase !== 'guessing') {
        res.status(400).json({ error: 'Not in guessing phase' });
        return;
      }

      if (game.currentRound.drawer?.toString() === user._id.toString()) {
        res.status(400).json({ error: 'Drawer cannot make guesses' });
        return;
      }

      const alreadyGuessed = game.currentRound.guesses.some(
        g => g.user.toString() === user._id.toString() && g.isCorrect,
      );

      if (alreadyGuessed) {
        res.status(400).json({ error: 'Already guessed correctly this round' });
        return;
      }

      const result = await game.addGuess(user._id, guess.trim());

      res.json({
        message: result.isCorrect ? 'Correct guess!' : 'Incorrect guess',
        guess: {
          user: {
            id: user._id,
            username: user.username,
            avatar: user.avatar,
          },
          text: guess.trim(),
          isCorrect: result.isCorrect,
          points: result.points || 0,
          timestamp: new Date(),
        },
        roundEnded: result.roundEnded,
        ...(result.roundEnded && {
          nextRound: result.nextRound,
          gameEnded: result.gameEnded,
          leaderboard: game.leaderboard,
        }),
      });
    } catch (error) {
      console.error('Add guess error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async getGameHistory(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      const { page = 1, limit = 10 } = req.query;

      const games = await Game.find({
        'players.user': req.user.userId,
        status: 'finished',
      })
        .populate('room', 'name')
        .populate('players.user', 'username avatar')
        .sort({ endedAt: -1 })
        .skip((Number(page) - 1) * Number(limit))
        .limit(Number(limit));

      const totalGames = await Game.countDocuments({
        'players.user': req.user.userId,
        status: 'finished',
      });

      res.json({
        games: games.map(game => {
          const playerData = game.players.find(p => p.user._id.toString() === req.user!.userId);
          const winner = game.leaderboard[0];

          return {
            id: game._id,
            room: game.room,
            totalPlayers: game.players.length,
            totalRounds: game.settings.totalRounds,
            playerScore: playerData?.score || 0,
            playerPosition:
              game.leaderboard.findIndex(p => p.user.toString() === req.user!.userId) + 1,
            won: winner?.user.toString() === req.user!.userId,
            endedAt: game.endedAt,
            createdAt: game.createdAt,
          };
        }),
        pagination: {
          currentPage: Number(page),
          totalPages: Math.ceil(totalGames / Number(limit)),
          totalGames,
          hasNext: Number(page) * Number(limit) < totalGames,
          hasPrev: Number(page) > 1,
        },
      });
    } catch (error) {
      console.error('Get game history error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  private static generateWordsPool(difficulty: 'easy' | 'medium' | 'hard'): string[] {
    const easyWords = [
      'casa',
      'perro',
      'gato',
      'sol',
      'luna',
      'árbol',
      'flor',
      'agua',
      'fuego',
      'coche',
      'mesa',
      'silla',
      'libro',
      'mano',
      'pie',
      'ojo',
      'boca',
      'nariz',
      'oreja',
      'pelo',
    ];

    const mediumWords = [
      'computadora',
      'televisión',
      'refrigerador',
      'bicicleta',
      'automóvil',
      'teléfono',
      'dinosaurio',
      'elefante',
      'mariposa',
      'hospital',
      'escuela',
      'biblioteca',
      'restaurante',
      'montaña',
      'océano',
      'planeta',
      'guitarra',
      'piano',
      'pintura',
      'escultura',
    ];

    const hardWords = [
      'arquitectura',
      'filosofía',
      'democracia',
      'tecnología',
      'astronomía',
      'biología',
      'paleontología',
      'meteorología',
      'psicología',
      'arqueología',
      'gastronomy',
      'cinematografía',
      'criptografía',
      'neurociencia',
      'inteligencia artificial',
      'sostenibilidad',
      'globalización',
      'emprendimiento',
      'innovación',
      'transformación digital',
    ];

    const baseWords = [...easyWords];

    if (difficulty === 'medium' || difficulty === 'hard') {
      baseWords.push(...mediumWords);
    }

    if (difficulty === 'hard') {
      baseWords.push(...hardWords);
    }

    return GameController.shuffleArray([...baseWords]);
  }

  private static shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  private static createWordHint(word: string): string {
    const words = word.split(' ');
    return words
      .map(w => {
        if (w.length <= 3) return w;
        const visibleChars = Math.ceil(w.length * 0.3);
        const hiddenPart = '_'.repeat(w.length - visibleChars);
        return w.substring(0, visibleChars) + hiddenPart;
      })
      .join(' ');
  }
}
