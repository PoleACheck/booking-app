import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth.middleware';
import { prisma } from '../config/db';

// 1. Pobieranie dostępnych slotów
export const getSlots = async (req: Request, res: Response) => {
  try {
    const { start, end } = req.query;
    
    if (!start || !end) {
      return res.status(400).json({ message: 'Wymagane parametry start i end' });
    }

    const startDate = new Date(start as string);
    const endDate = new Date(end as string);
    endDate.setHours(23, 59, 59, 999);

    const slots = await prisma.visit.findMany({
      where: {
        date: {
          gte: startDate,
          lte: endDate
        }
      },
      orderBy: { date: 'asc' }
    });

    res.json(slots);
  } catch (error) {
    res.status(500).json({ message: 'Błąd pobierania terminów' });
  }
};

// 2. Rezerwacja wizyty
export const bookVisit = async (req: AuthRequest, res: Response) => {
  try {
    const { slotId, serviceId, description } = req.body;
    const userId = req.user?.userId;

    if (!userId) return res.status(401).json({ message: 'Nieautoryzowany' });

    const service = await prisma.service.findUnique({ where: { id: Number(serviceId) } });
    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!service || !user) return res.status(400).json({ message: 'Błędne dane' });

    const slot = await prisma.visit.findUnique({ where: { id: slotId } });
    
    if (!slot) return res.status(404).json({ message: 'Termin nie istnieje' });
    if (slot.isTaken) return res.status(409).json({ message: 'Termin już zajęty' });

    // --- NOWA WALIDACJA: Blokada rezerwacji na dzisiaj i przeszłość ---
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0); // Północ jutra

    if (new Date(slot.date) < tomorrow) {
      return res.status(400).json({ message: 'Rezerwacja możliwa najwcześniej na jutro.' });
    }
    // ------------------------------------------------------------------

    const updatedVisit = await prisma.visit.update({
      where: { id: slotId },
      data: {
        isTaken: true,
        userId: user.id,
        patientFirst: user.firstName,
        patientLast: user.lastName,
        serviceName: service.name,
        info: description
      }
    });

    res.json({ message: 'Wizyta zarezerwowana', visit: updatedVisit });
  } catch (error) {
    res.status(500).json({ message: 'Błąd rezerwacji' });
  }
};

// 3. Pobieranie wizyt użytkownika
export const getUserVisits = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const visits = await prisma.visit.findMany({
      where: { 
        userId: userId,
        isTaken: true
      },
      orderBy: { date: 'asc' }
    });
    res.json(visits);
  } catch (error) {
    res.status(500).json({ message: 'Błąd pobierania wizyt' });
  }
};

// 4. Anulowanie wizyty
export const cancelVisit = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;
    const userRole = req.user?.role; // Zakładamy, że rola jest w tokenie

    const visit = await prisma.visit.findUnique({ where: { id: Number(id) } });

    if (!visit) return res.status(404).json({ message: 'Wizyta nie istnieje' });

    // Jeśli to nie admin, sprawdzamy właściciela i czas 72h
    if (userRole !== 'admin') {
       if (visit.userId !== userId) {
         return res.status(403).json({ message: 'Brak dostępu do tej wizyty' });
       }
       
       const now = new Date();
       const visitDate = new Date(visit.date);
       const diffHours = (visitDate.getTime() - now.getTime()) / (1000 * 60 * 60);

       if (diffHours < 72) {
         return res.status(400).json({ message: 'Za późno na odwołanie wizyty (wymagane 72h)' });
       }
    }

    await prisma.visit.update({
      where: { id: Number(id) },
      data: {
        isTaken: false,
        userId: null,
        patientFirst: null,
        patientLast: null,
        serviceName: null,
        info: null
      }
    });

    res.json({ message: 'Wizyta odwołana' });
  } catch (error) {
    res.status(500).json({ message: 'Błąd anulowania' });
  }
};

// --- ADMIN ---

// 5. Pobranie wszystkich wizyt
export const getAllVisitsAdmin = async (req: Request, res: Response) => {
  try {
    const visits = await prisma.visit.findMany({
      where: { isTaken: true, userId: { not: null } },
      orderBy: { date: 'asc' },
      include: { user: { select: { email: true, phone: true } } }
    });
    res.json(visits);
  } catch (error) {
    res.status(500).json({ message: 'Błąd serwera' });
  }
};

// 6. Wyłączanie/Włączanie slotu
export const toggleSlotAvailability = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const visit = await prisma.visit.findUnique({ where: { id: Number(id) } });
    if (!visit) return res.status(404).json({ message: 'Slot nie istnieje' });

    if (visit.isTaken && visit.userId) {
      return res.status(400).json({ message: 'Nie można zablokować terminu z umówionym pacjentem.' });
    }

    const newState = !visit.isTaken;

    await prisma.visit.update({
      where: { id: Number(id) },
      data: { isTaken: newState }
    });

    res.json({ message: newState ? 'Slot zablokowany' : 'Slot odblokowany' });
  } catch (error) {
    res.status(500).json({ message: 'Błąd edycji slotu' });
  }
};

// 7. Przełożenie wizyty
export const rescheduleVisit = async (req: AuthRequest, res: Response) => {
  try {
    const { visitId, newSlotId } = req.body;

    await prisma.$transaction(async (tx) => {
      const oldVisit = await tx.visit.findUnique({ where: { id: visitId } });
      if (!oldVisit || !oldVisit.isTaken) throw new Error('Wizyta nie istnieje');

      const newSlot = await tx.visit.findUnique({ where: { id: newSlotId } });
      if (!newSlot || newSlot.isTaken) throw new Error('Nowy termin jest zajęty');

      await tx.visit.update({
        where: { id: newSlotId },
        data: {
          isTaken: true,
          userId: oldVisit.userId,
          patientFirst: oldVisit.patientFirst,
          patientLast: oldVisit.patientLast,
          serviceName: oldVisit.serviceName,
          info: oldVisit.info
        }
      });

      await tx.visit.update({
        where: { id: visitId },
        data: {
          isTaken: false,
          userId: null,
          patientFirst: null,
          patientLast: null,
          serviceName: null,
          info: null
        }
      });
    });

    res.json({ message: 'Wizyta przełożona pomyślnie' });
  } catch (error) {
    res.status(500).json({ message: 'Błąd zmiany terminu' });
  }
};

// 8. Blokowanie całego dnia
export const toggleDayAvailability = async (req: Request, res: Response) => {
  try {
    const { date } = req.body;
    const start = new Date(date);
    start.setHours(0,0,0,0);
    const end = new Date(date);
    end.setHours(23,59,59,999);

    const activeVisits = await prisma.visit.findFirst({
      where: {
        date: { gte: start, lte: end },
        isTaken: true,
        userId: { not: null }
      }
    });

    if (activeVisits) {
      return res.status(400).json({ message: 'W tym dniu są umówieni pacjenci.' });
    }

    const firstSlot = await prisma.visit.findFirst({
      where: { date: { gte: start, lte: end } }
    });

    if (!firstSlot) return res.status(404).json({ message: 'Brak slotów w tym dniu' });

    const shouldBlock = !firstSlot.isTaken;

    await prisma.visit.updateMany({
      where: { date: { gte: start, lte: end } },
      data: { isTaken: shouldBlock }
    });

    res.json({ message: shouldBlock ? 'Dzień zablokowany' : 'Dzień odblokowany' });
  } catch (error) {
    res.status(500).json({ message: 'Błąd edycji dnia' });
  }
};
// 9. Pobierz datę pierwszej dostępnej wizyty (dla inicjalizacji kalendarza)
export const getFirstAvailableSlotDate = async (req: Request, res: Response) => {
  try {
    const now = new Date();
    
    // Szukamy pierwszego terminu, który jest w przyszłości i jest wolny
    const firstSlot = await prisma.visit.findFirst({
      where: {
        date: { gte: now }, // Od teraz
        isTaken: false      // Tylko wolne
      },
      orderBy: { date: 'asc' }
    });

    if (!firstSlot) {
        // Fallback: jeśli wszystko zajęte do 2030 roku, zwróć dzisiejszą datę
        return res.json({ date: now });
    }

    res.json({ date: firstSlot.date });
  } catch (error) {
    res.status(500).json({ message: 'Błąd pobierania daty' });
  }
};