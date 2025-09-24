import { Router } from 'express';
import { AuthController } from './auth.controller.ts';
import { authMiddleware } from '../../shared/middleware.ts';

const router = Router();

// Rutas públicas
router.post('/register', AuthController.register);
router.post('/login', AuthController.login);

// Rutas protegidas (requieren autenticación)
router.post('/logout', authMiddleware, AuthController.logout);
router.get('/profile', authMiddleware, AuthController.getProfile);
router.put('/profile', authMiddleware, AuthController.updateProfile);

export { router as authRoutes };
