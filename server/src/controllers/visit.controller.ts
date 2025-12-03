import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth.middleware';
import { prisma } from '../config/db';

// 1. Pobieranie dostępnych slotów (Dla Kalendarza) [cite: 45-54]
export const getSlots = async (req: Request, res: Response) => {
  try {
    const { start, end } = req.query; // format: YYYY-MM-DD
    
    if (!start || !end) {
      return res.status(400).json({ message: 'Wymagane parametry start i end' });
    }

    const startDate = new Date(start as string);
    const endDate = new Date(end as string);
    // Ustawienie końca dnia dla daty końcowej
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

// 2. Rezerwacja wizyty (Aktualizacja slotu) [cite: 43, 53]
export const bookVisit = async (req: AuthRequest, res: Response) => {
  try {
    const { slotId, serviceId, description } = req.body;
    const userId = req.user?.userId;

    if (!userId) return res.status(401).json({ message: 'Nieautoryzowany' });

    // Pobranie nazwy usługi i danych użytkownika
    const service = await prisma.service.findUnique({ where: { id: Number(serviceId) } });
    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!service || !user) return res.status(400).json({ message: 'Błędne dane' });

    // Sprawdzenie czy slot jest wolny
    const slot = await prisma.visit.findUnique({ where: { id: slotId } });
    if (!slot || slot.isTaken) {
      return res.status(409).json({ message: 'Termin już zajęty' });
    }

    // Aktualizacja rekordu wizyty (Booking)
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

// 3. Pobieranie wizyt użytkownika (Twoje Wizyty) [cite: 67-68]
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

// 4. Anulowanie wizyty przez użytkownika (Zasada 72h) [cite: 68-69]
export const cancelVisit = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;

    const visit = await prisma.visit.findUnique({ where: { id: Number(id) } });

    if (!visit || visit.userId !== userId) {
      return res.status(403).json({ message: 'Brak dostępu do tej wizyty' });
    }

    // Sprawdzenie czasu (72h)
    const now = new Date();
    const visitDate = new Date(visit.date);
    const diffHours = (visitDate.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (diffHours < 72) {
      return res.status(400).json({ message: 'Za późno na odwołanie wizyty (wymagane 72h)' });
    }

    // Reset slotu (zwolnienie terminu)
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

// --- SEKCJA PRACOWNIKA --- [cite: 83-100]

// 5. Pobranie wszystkich wizyt (Zarządzaj wizytami)
export const getAllVisitsAdmin = async (req: Request, res: Response) => {
  try {
    const visits = await prisma.visit.findMany({
      where: { isTaken: true }, // Pobieramy tylko umówione
      orderBy: { date: 'asc' },
      include: { user: { select: { email: true, phone: true } } } // Opcjonalnie dane kontaktowe
    });
    res.json(visits);
  } catch (error) {
    res.status(500).json({ message: 'Błąd serwera' });
  }
};

// 6. Wyłączanie/Włączanie slotu (Wyłącz dni/godziny) [cite: 96]
export const toggleSlotAvailability = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const visit = await prisma.visit.findUnique({ where: { id: Number(id) } });
    if (!visit) return res.status(404).json({ message: 'Slot nie istnieje' });

    // Jeśli jest zajęta przez pacjenta, nie można tak po prostu wyłączyć (logika biznesowa)
    // Ale w trybie "wyłączania dostępności" zakładamy, że pracownik wie co robi.
    // Tutaj prosta implementacja toggle isTaken (jako blokady)

    // Jeśli slot był wolny (false) -> blokujemy (true) bez danych pacjenta
    // Jeśli slot był zablokowany (true) i nie ma pacjenta -> zwalniamy (false)
    
    if (visit.isTaken && visit.userId) {
      return res.status(400).json({ message: 'Nie można zablokować terminu z umówionym pacjentem. Najpierw anuluj wizytę.' });
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
// 7. Przełożenie wizyty (Admin - Edycja terminu)
export const rescheduleVisit = async (req: AuthRequest, res: Response) => {
  try {
    const { visitId, newSlotId } = req.body; // ID starej wizyty i ID nowego slotu

    // Transakcja: Zwolnij stary termin, zajmij nowy
    await prisma.$transaction(async (tx) => {
      // 1. Pobierz starą wizytę
      const oldVisit = await tx.visit.findUnique({ where: { id: visitId } });
      if (!oldVisit || !oldVisit.isTaken) throw new Error('Wizyta nie istnieje');

      // 2. Pobierz nowy slot
      const newSlot = await tx.visit.findUnique({ where: { id: newSlotId } });
      if (!newSlot || newSlot.isTaken) throw new Error('Nowy termin jest zajęty');

      // 3. Zaktualizuj nowy slot danymi pacjenta
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

      // 4. Wyczyść stary slot
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
    const { date } = req.body; // format: YYYY-MM-DD
    const start = new Date(date);
    start.setHours(0,0,0,0);
    const end = new Date(date);
    end.setHours(23,59,59,999);

    // Sprawdzamy czy w tym dniu są jakieś aktywne wizyty pacjentów
    const activeVisits = await prisma.visit.findFirst({
      where: {
        date: { gte: start, lte: end },
        isTaken: true,
        userId: { not: null } // Zakładamy, że blokada (userId=null, isTaken=true) się nie liczy jako "aktywna wizyta"
      }
    });

    if (activeVisits) {
      return res.status(400).json({ message: 'W tym dniu są umówieni pacjenci. Odwołaj wizyty ręcznie.' });
    }

    // Sprawdzamy stan pierwszego slotu, żeby wiedzieć czy blokować czy odblokowywać (toggle)
    const firstSlot = await prisma.visit.findFirst({
      where: { date: { gte: start, lte: end } }
    });

    if (!firstSlot) return res.status(404).json({ message: 'Brak slotów w tym dniu' });

    const shouldBlock = !firstSlot.isTaken; // Jeśli wolny -> blokujemy, jeśli zajęty (zablokowany) -> zwalniamy

    await prisma.visit.updateMany({
      where: { date: { gte: start, lte: end } },
      data: { isTaken: shouldBlock }
    });

    res.json({ message: shouldBlock ? 'Dzień zablokowany' : 'Dzień odblokowany' });
  } catch (error) {
    res.status(500).json({ message: 'Błąd edycji dnia' });
  }
};