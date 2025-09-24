import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { User } from './auth.model.ts';
import { JWTService } from '../../shared/jwt.ts';
import { AuthenticatedRequest } from '../../shared/middleware.ts';

export class AuthController {
  static async register(req: Request, res: Response): Promise<void> {
    try {
      const { username, email, password } = req.body;

      if (!username || !email || !password) {
        res.status(400).json({
          error: 'Username, email, and password are required',
        });
        return;
      }

      if (password.length < 6) {
        res.status(400).json({
          error: 'Password must be at least 6 characters long',
        });
        return;
      }

      const existingUser = await User.findOne({
        $or: [{ email }, { username }],
      });

      if (existingUser) {
        res.status(409).json({
          error: 'User with this email or username already exists',
        });
        return;
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const user = new User({
        username,
        email,
        password: hashedPassword,
      });

      await user.save();
      await user.setOnline();

      const token = JWTService.generateToken({
        userId: user._id.toString(),
        username: user.username,
      });

      res.status(201).json({
        message: 'User registered successfully',
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          avatar: user.avatar,
          isOnline: user.isOnline,
          stats: {
            gamesPlayed: user.gamesPlayed,
            gamesWon: user.gamesWon,
            averageScore: user.averageScore,
          },
        },
        token,
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async login(req: Request, res: Response): Promise<void> {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        res.status(400).json({
          error: 'Email and password are required',
        });
        return;
      }

      const user = await User.findOne({ email });
      if (!user) {
        res.status(401).json({ error: 'Invalid credentials' });
        return;
      }

      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        res.status(401).json({ error: 'Invalid credentials' });
        return;
      }

      await user.setOnline();

      const token = JWTService.generateToken({
        userId: user._id.toString(),
        username: user.username,
      });

      res.json({
        message: 'Login successful',
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          avatar: user.avatar,
          isOnline: user.isOnline,
          stats: {
            gamesPlayed: user.gamesPlayed,
            gamesWon: user.gamesWon,
            averageScore: user.averageScore,
          },
        },
        token,
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async logout(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      const user = await User.findById(req.user.userId);
      if (user) {
        await user.setOffline();
      }

      res.json({ message: 'Logout successful' });
    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async getProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      const user = await User.findById(req.user.userId);
      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      res.json({
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          avatar: user.avatar,
          isOnline: user.isOnline,
          currentRoom: user.currentRoom,
          stats: {
            gamesPlayed: user.gamesPlayed,
            gamesWon: user.gamesWon,
            averageScore: user.averageScore,
            totalScore: user.totalScore,
            winRate: user.winRate,
          },
          preferences: user.preferences,
          createdAt: user.createdAt,
        },
      });
    } catch (error) {
      console.error('Get profile error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async updateProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      const { username, avatar, preferences } = req.body;
      const updateData: any = {};

      if (username) {
        const existingUser = await User.findOne({
          username,
          _id: { $ne: req.user.userId },
        });

        if (existingUser) {
          res.status(409).json({ error: 'Username already taken' });
          return;
        }
        updateData.username = username;
      }

      if (avatar) updateData.avatar = avatar;
      if (preferences) updateData.preferences = { ...preferences };

      const user = await User.findByIdAndUpdate(req.user.userId, updateData, { new: true });

      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      res.json({
        message: 'Profile updated successfully',
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          avatar: user.avatar,
          isOnline: user.isOnline,
          preferences: user.preferences,
        },
      });
    } catch (error) {
      console.error('Update profile error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}
