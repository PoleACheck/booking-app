import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth.middleware';
import { prisma } from '../config/db';

const SECRET_KEY = process.env.JWT_SECRET || 'super_secret_key_123';

export const register = async (req: Request, res: Response) => {
  try {
    const { firstName, lastName, email, password, phone } = req.body;

    // Sprawdzenie czy user istnieje
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: 'Użytkownik o tym emailu już istnieje' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await prisma.user.create({
      data: {
        firstName,
        lastName,
        email,
        password: hashedPassword,
        phone,
        role: 'user' // Domyślna rola
      }
    });

    res.status(201).json({ message: 'Zarejestrowano pomyślnie' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Błąd serwera podczas rejestracji' });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(400).json({ message: 'Błędne dane logowania' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(400).json({ message: 'Błędne dane logowania' });
    }

    // Generowanie tokenu JWT
    const token = jwt.sign(
      { userId: user.id, role: user.role }, 
      SECRET_KEY, 
      { expiresIn: '24h' }
    );

    res.json({ 
      token, 
      user: { 
        firstName: user.firstName, 
        lastName: user.lastName, 
        role: user.role 
      } 
    });
  } catch (error) {
    res.status(500).json({ message: 'Błąd serwera' });
  }
};

export const getMe = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).send();
    
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: { firstName: true, lastName: true, role: true, email: true }
    });
    
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Błąd serwera' });
  }
};