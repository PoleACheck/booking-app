import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.routes';
import visitRoutes from './routes/visit.routes';
import serviceRoutes from './routes/service.routes';

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/visits', visitRoutes);
app.use('/api/services', serviceRoutes);

export default app;