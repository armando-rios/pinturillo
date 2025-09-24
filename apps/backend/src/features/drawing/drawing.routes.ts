import { Router } from 'express';
import { DrawingController } from './drawing.controller.ts';
import { authMiddleware, optionalAuthMiddleware } from '../../shared/middleware.ts';

const router = Router();

// Rutas con autenticación opcional
router.get('/:drawingId', optionalAuthMiddleware, DrawingController.getDrawing);

// Rutas protegidas (requieren autenticación)
router.post('/', authMiddleware, DrawingController.createDrawing);
router.get('/current/me', authMiddleware, DrawingController.getCurrentDrawing);
router.post('/:drawingId/stroke', authMiddleware, DrawingController.addStroke);
router.post('/:drawingId/complete', authMiddleware, DrawingController.completeDrawing);
router.post('/:drawingId/clear', authMiddleware, DrawingController.clearCanvas);
router.get('/game/:gameId/all', authMiddleware, DrawingController.getDrawingsByGame);
router.get('/history/me', authMiddleware, DrawingController.getDrawingHistory);

export { router as drawingRoutes };
