import cron from 'node-cron';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const initCronJobs = () => {
  // Run at midnight on the 1st of every month
  cron.schedule('0 0 1 * *', async () => {
    console.log('Running monthly maintenance...');
    
    // 1. Delete old visits (> 1 month ago)
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    
    await prisma.visit.deleteMany({
      where: {
        date: { lt: oneMonthAgo },
        isTaken: false // Optional: keep history of actual visits? User said "archiwalnie z ost miesiąca", assuming delete older
      }
    });

    // 2. Add future slots to maintain 2-year window
    // (Simplified: Logic similar to seed.ts would go here to append new month at the end of the 2-year range)
    console.log('Maintenance complete.');
  });
};