import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// Rozszerzenie typu Request o obiekt user
export interface AuthRequest extends Request {
  user?: {
    userId: number;
    role: string;
  };
}

const SECRET_KEY = process.env.JWT_SECRET || 'super_secret_key_123';

export const authMiddleware = (req: AuthRequest, res: Response, next: NextFunction) => {
  // Oczekujemy nagłówka: Authorization: Bearer <token>
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ message: 'Brak tokenu autoryzacyjnego' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, SECRET_KEY) as { userId: number; role: string };
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ message: 'Nieprawidłowy token' });
  }
};

// Middleware tylko dla Admina/Pracownika (do sekcji "Dla Pracowników" [cite: 83])
export const adminMiddleware = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Brak uprawnień administratora' });
  }
  next();
};