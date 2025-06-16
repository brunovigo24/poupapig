import { authRoutes } from './routes/authRoutes';
import { autenticarJWT } from './middlewares/authMiddleware';
// import webhookRoutes from './routs/webhookRoutes';
// import evolutionRoutes from './routes/evolutionRoutes';
import express from 'express';
// import cors from 'cors';
import statusRoutes from './routes/statusRoutes';

const app = express();
app.use(express.json());

// app.use(cors({
//   origin: process.env.CORS_ORIGIN,
//   credentials: true
// }));

app.use('/api/auth', authRoutes);
// app.use('/webhook', webhookRoutes);
// app.use('/api/evolution', autenticarJWT, evolutionRoutes);
app.use('/', statusRoutes);


export default app;
