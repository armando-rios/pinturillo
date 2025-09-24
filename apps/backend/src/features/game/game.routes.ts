import { Router } from 'express';
import { GameController } from './game.controller.ts';
import { authMiddleware } from '../../shared/middleware.ts';

const router = Router();

// Todas las rutas requieren autenticación
router.post('/start', authMiddleware, GameController.startGame);
router.post('/end', authMiddleware, GameController.endGame);
router.get('/current', authMiddleware, GameController.getCurrentGame);
router.post('/guess', authMiddleware, GameController.addGuess);
router.get('/history', authMiddleware, GameController.getGameHistory);

export { router as gameRoutes };
