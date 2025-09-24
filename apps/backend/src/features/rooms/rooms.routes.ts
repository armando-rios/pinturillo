import { Router } from 'express';
import { RoomsController } from './rooms.controller.ts';
import { authMiddleware, optionalAuthMiddleware } from '../../shared/middleware.ts';

const router = Router();

// Rutas públicas (con autenticación opcional)
router.get('/active', optionalAuthMiddleware, RoomsController.getActiveRooms);
router.get('/:code', optionalAuthMiddleware, RoomsController.getRoomByCode);

// Rutas protegidas (requieren autenticación)
router.post('/', authMiddleware, RoomsController.createRoom);
router.post('/join', authMiddleware, RoomsController.joinRoom);
router.post('/leave', authMiddleware, RoomsController.leaveRoom);
router.get('/current/me', authMiddleware, RoomsController.getCurrentRoom);
router.put('/settings', authMiddleware, RoomsController.updateRoomSettings);
router.post('/ready', authMiddleware, RoomsController.toggleReady);

export { router as roomsRoutes };
