import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // 1. Create Admin
  const hashedPassword = await bcrypt.hash('admin', 10);
  await prisma.user.upsert({
    where: { email: 'admin@100matol.og' },
    update: {},
    create: {
      firstName: 'Jan',
      lastName: 'Nowak',
      email: 'admin@100matol.og',
      password: hashedPassword,
      phone: '777000000',
      role: 'admin'
    }
  });

  // 2. Create Services [cite: 57-66]
  const services = [
    { name: 'Pierwsza konsultacja', price: 150 },
    { name: 'Konsultacja + plan leczenia', price: 250 },
    { name: 'Wypełnienie kompozytowe', price: 400 },
    { name: 'Powtórne leczenie kanałowe (re-endo) ', price: 1200 },
    { name: 'Usunięcie kamienia nazębnego + piaskowanie (higienizacja)', price: 400 },
    { name: 'Zdjęcie rentgenowskie panoramiczne (pantomogram)', price: 150 },   
    { name: 'Wybielanie zębów (metoda nakładkowa)', price: 800 },
    { name: 'Zdjęcie rentgenowskie panoramiczne ', price: 150 },
    { name: 'Ekstrakcja zęba stałego ', price: 400 },
    { name: 'Wybielanie zębów gabinetowe ', price: 1000 }
  ];

  for (const s of services) {
    await prisma.service.create({ data: s });
  }

  // 3. Generate slots for 2 years
  const startDate = new Date();
  startDate.setHours(10, 0, 0, 0); // Start 10:00 today
  const endDate = new Date();
  endDate.setFullYear(endDate.getFullYear() + 2);

  let current = new Date(startDate);

  while (current <= endDate) {
    // Skip weekends if needed (spec says Mon-Fri in calendar view, assuming only Mon-Fri slots)
    const day = current.getDay();
    if (day !== 0 && day !== 6) { // 0=Sun, 6=Sat
       // Generate slots 10:00 - 18:00
       for (let h = 10; h < 18; h++) {
         const slot1 = new Date(current); slot1.setHours(h, 0, 0, 0);
         const slot2 = new Date(current); slot2.setHours(h, 30, 0, 0);
         
         await prisma.visit.create({ data: { date: slot1, isTaken: false } });
         await prisma.visit.create({ data: { date: slot2, isTaken: false } });
       }
    }
    current.setDate(current.getDate() + 1);
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());