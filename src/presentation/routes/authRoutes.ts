import { Router } from 'express';
import { login } from '../../presentation/controllers/AuthController';

const router = Router();
router.post('/login', login);

export { router as authRoutes };
