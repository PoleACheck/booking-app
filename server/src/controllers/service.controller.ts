import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { prisma } from '../config/db';

// 1. Pobierz cennik (publiczne) [cite: 72]
export const getServices = async (req: Request, res: Response) => {
  try {
    const services = await prisma.service.findMany({
      orderBy: { price: 'asc' } // Sortowanie po cenie
    });
    res.json(services);
  } catch (error) {
    res.status(500).json({ message: 'Błąd pobierania cennika' });
  }
};

// 2. Aktualizuj cennik (Pracownik) [cite: 103-104]
// Oczekujemy tablicy obiektów do aktualizacji
export const updatePrices = async (req: Request, res: Response) => {
  try {
    const updates: { id: number; price: number }[] = req.body;

    // Wykonujemy aktualizacje w transakcji
    const transactions = updates.map(u => 
      prisma.service.update({
        where: { id: u.id },
        data: { price: u.price }
      })
    );

    await prisma.$transaction(transactions);

    res.json({ message: 'Cennik zaktualizowany' });
  } catch (error) {
    res.status(500).json({ message: 'Błąd aktualizacji cen' });
  }
};