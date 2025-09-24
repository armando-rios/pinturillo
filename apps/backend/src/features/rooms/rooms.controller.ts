import { Response } from 'express';
import { Room } from './rooms.model.ts';
import { User } from '../auth/auth.model.ts';
import { AuthenticatedRequest } from '../../shared/middleware.ts';

export class RoomsController {
  static async createRoom(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      const { name, maxPlayers, rounds, drawingTimeLimit, password, difficulty } = req.body;

      if (!name || name.trim().length === 0) {
        res.status(400).json({ error: 'Room name is required' });
        return;
      }

      if (maxPlayers && (maxPlayers < 2 || maxPlayers > 12)) {
        res.status(400).json({ error: 'Max players must be between 2 and 12' });
        return;
      }

      const user = await User.findById(req.user.userId);
      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      if (user.currentRoom) {
        res.status(400).json({ error: 'User is already in a room' });
        return;
      }

      const room = new Room({
        name: name.trim(),
        host: user._id,
        players: [
          {
            user: user._id,
            isConnected: true,
            isReady: false,
            score: 0,
            joinedAt: new Date(),
          },
        ],
        settings: {
          maxPlayers: maxPlayers || 8,
          rounds: rounds || 3,
          drawingTimeLimit: drawingTimeLimit || 60,
          difficulty: difficulty || 'medium',
        },
        ...(password && { password }),
      });

      await room.save();
      await user.joinRoom(room._id.toString());

      await room.populate('host', 'username avatar');
      await room.populate('players.user', 'username avatar isOnline');

      res.status(201).json({
        message: 'Room created successfully',
        room: {
          id: room._id,
          name: room.name,
          code: room.code,
          host: room.host,
          players: room.players,
          connectedPlayersCount: room.connectedPlayersCount,
          readyPlayersCount: room.readyPlayersCount,
          isGameActive: room.isGameActive,
          settings: room.settings,
          isPrivate: !!room.password,
          createdAt: room.createdAt,
        },
      });
    } catch (error) {
      console.error('Create room error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async joinRoom(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      const { code, password } = req.body;

      if (!code) {
        res.status(400).json({ error: 'Room code is required' });
        return;
      }

      const user = await User.findById(req.user.userId);
      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      if (user.currentRoom) {
        res.status(400).json({ error: 'User is already in a room' });
        return;
      }

      const room = await Room.findByCode(code.toUpperCase());
      if (!room) {
        res.status(404).json({ error: 'Room not found' });
        return;
      }

      if (room.password && room.password !== password) {
        res.status(401).json({ error: 'Invalid room password' });
        return;
      }

      if (room.players.length >= room.settings.maxPlayers) {
        res.status(400).json({ error: 'Room is full' });
        return;
      }

      if (room.isGameActive) {
        res.status(400).json({ error: 'Cannot join room while game is active' });
        return;
      }

      const isAlreadyInRoom = room.players.some(
        player => player.user.toString() === user._id.toString(),
      );

      if (isAlreadyInRoom) {
        res.status(400).json({ error: 'User is already in this room' });
        return;
      }

      await room.addPlayer(user._id);
      await user.joinRoom(room._id.toString());

      await room.populate('host', 'username avatar');
      await room.populate('players.user', 'username avatar isOnline');

      res.json({
        message: 'Joined room successfully',
        room: {
          id: room._id,
          name: room.name,
          code: room.code,
          host: room.host,
          players: room.players,
          connectedPlayersCount: room.connectedPlayersCount,
          readyPlayersCount: room.readyPlayersCount,
          isGameActive: room.isGameActive,
          settings: room.settings,
          isPrivate: !!room.password,
        },
      });
    } catch (error) {
      console.error('Join room error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async leaveRoom(req: AuthenticatedRequest, res: Response): Promise<void> {
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
        await user.leaveRoom();
        res.json({ message: 'Left room successfully' });
        return;
      }

      await room.removePlayer(user._id);
      await user.leaveRoom();

      res.json({
        message: 'Left room successfully',
        roomDeleted: room.players.length === 0,
      });
    } catch (error) {
      console.error('Leave room error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async getRoomByCode(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { code } = req.params;

      if (!code) {
        res.status(400).json({ error: 'Room code is required' });
        return;
      }

      const room = await Room.findByCode(code.toUpperCase())
        .populate('host', 'username avatar')
        .populate('players.user', 'username avatar isOnline');

      if (!room) {
        res.status(404).json({ error: 'Room not found' });
        return;
      }

      res.json({
        room: {
          id: room._id,
          name: room.name,
          code: room.code,
          host: room.host,
          players: room.players,
          connectedPlayersCount: room.connectedPlayersCount,
          readyPlayersCount: room.readyPlayersCount,
          isGameActive: room.isGameActive,
          settings: room.settings,
          isPrivate: !!room.password,
          createdAt: room.createdAt,
        },
      });
    } catch (error) {
      console.error('Get room error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async getCurrentRoom(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      const user = await User.findById(req.user.userId);
      if (!user || !user.currentRoom) {
        res.json({ room: null });
        return;
      }

      const room = await Room.findById(user.currentRoom)
        .populate('host', 'username avatar')
        .populate('players.user', 'username avatar isOnline');

      if (!room) {
        await user.leaveRoom();
        res.json({ room: null });
        return;
      }

      res.json({
        room: {
          id: room._id,
          name: room.name,
          code: room.code,
          host: room.host,
          players: room.players,
          connectedPlayersCount: room.connectedPlayersCount,
          readyPlayersCount: room.readyPlayersCount,
          isGameActive: room.isGameActive,
          settings: room.settings,
          isPrivate: !!room.password,
          createdAt: room.createdAt,
        },
      });
    } catch (error) {
      console.error('Get current room error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async getActiveRooms(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { page = 1, limit = 10, search } = req.query;

      const query: any = {};
      if (search && typeof search === 'string') {
        query.name = { $regex: search, $options: 'i' };
      }

      const rooms = await Room.findActiveRooms(query, Number(page), Number(limit));

      const totalRooms = await Room.countDocuments(query);

      res.json({
        rooms: rooms.map(room => ({
          id: room._id,
          name: room.name,
          code: room.code,
          playersCount: room.players.length,
          maxPlayers: room.settings.maxPlayers,
          isGameActive: room.isGameActive,
          isPrivate: !!room.password,
          createdAt: room.createdAt,
        })),
        pagination: {
          currentPage: Number(page),
          totalPages: Math.ceil(totalRooms / Number(limit)),
          totalRooms,
          hasNext: Number(page) * Number(limit) < totalRooms,
          hasPrev: Number(page) > 1,
        },
      });
    } catch (error) {
      console.error('Get active rooms error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async updateRoomSettings(req: AuthenticatedRequest, res: Response): Promise<void> {
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
        res.status(403).json({ error: 'Only room host can update settings' });
        return;
      }

      if (room.isGameActive) {
        res.status(400).json({ error: 'Cannot update settings while game is active' });
        return;
      }

      const { maxPlayers, rounds, drawingTimeLimit, difficulty } = req.body;
      const updates: any = {};

      if (maxPlayers !== undefined) {
        if (maxPlayers < 2 || maxPlayers > 12) {
          res.status(400).json({ error: 'Max players must be between 2 and 12' });
          return;
        }
        if (maxPlayers < room.players.length) {
          res.status(400).json({ error: 'Max players cannot be less than current players count' });
          return;
        }
        updates['settings.maxPlayers'] = maxPlayers;
      }

      if (rounds !== undefined) {
        if (rounds < 1 || rounds > 10) {
          res.status(400).json({ error: 'Rounds must be between 1 and 10' });
          return;
        }
        updates['settings.rounds'] = rounds;
      }

      if (drawingTimeLimit !== undefined) {
        if (drawingTimeLimit < 30 || drawingTimeLimit > 180) {
          res.status(400).json({ error: 'Drawing time limit must be between 30 and 180 seconds' });
          return;
        }
        updates['settings.drawingTimeLimit'] = drawingTimeLimit;
      }

      if (difficulty !== undefined) {
        if (!['easy', 'medium', 'hard'].includes(difficulty)) {
          res.status(400).json({ error: 'Difficulty must be easy, medium, or hard' });
          return;
        }
        updates['settings.difficulty'] = difficulty;
      }

      await Room.findByIdAndUpdate(room._id, updates);

      const updatedRoom = await Room.findById(room._id)
        .populate('host', 'username avatar')
        .populate('players.user', 'username avatar isOnline');

      res.json({
        message: 'Room settings updated successfully',
        room: {
          id: updatedRoom!._id,
          name: updatedRoom!.name,
          code: updatedRoom!.code,
          host: updatedRoom!.host,
          players: updatedRoom!.players,
          connectedPlayersCount: updatedRoom!.connectedPlayersCount,
          readyPlayersCount: updatedRoom!.readyPlayersCount,
          isGameActive: updatedRoom!.isGameActive,
          settings: updatedRoom!.settings,
          isPrivate: !!updatedRoom!.password,
        },
      });
    } catch (error) {
      console.error('Update room settings error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async toggleReady(req: AuthenticatedRequest, res: Response): Promise<void> {
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

      if (room.isGameActive) {
        res.status(400).json({ error: 'Cannot change ready state while game is active' });
        return;
      }

      const playerIndex = room.players.findIndex(
        player => player.user.toString() === user._id.toString(),
      );

      if (playerIndex === -1) {
        res.status(400).json({ error: 'User is not in this room' });
        return;
      }

      room.players[playerIndex].isReady = !room.players[playerIndex].isReady;
      await room.save();

      await room.populate('host', 'username avatar');
      await room.populate('players.user', 'username avatar isOnline');

      res.json({
        message: `Player is now ${room.players[playerIndex].isReady ? 'ready' : 'not ready'}`,
        room: {
          id: room._id,
          players: room.players,
          readyPlayersCount: room.readyPlayersCount,
        },
      });
    } catch (error) {
      console.error('Toggle ready error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}
