import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({ adapter });

async function generateRemainingWeekends() {
  try {
    // Get existing weekends
    const existingWeekends = await prisma.weekend.findMany({
      orderBy: { saturdayDate: 'asc' },
    });

    console.log(`Found ${existingWeekends.length} existing weekend(s)`);

    if (existingWeekends.length === 0) {
      console.log('No weekends found. Please create the first weekend manually.');
      return;
    }

    if (existingWeekends.length >= 12) {
      console.log('Already have 12 or more weekends. Nothing to do.');
      return;
    }

    // Get the last weekend
    const lastWeekend = existingWeekends[existingWeekends.length - 1];
    console.log(`Last weekend: ${lastWeekend.name} on ${lastWeekend.saturdayDate}`);

    // Extract number from the name (e.g., "Weekend 1" -> 1)
    const nameMatch = lastWeekend.name.match(/(\d+)/);
    const lastNumber = nameMatch ? parseInt(nameMatch[1]) : existingWeekends.length;

    // Calculate how many more we need
    const needToCreate = 12 - existingWeekends.length;
    console.log(`Need to create ${needToCreate} more weekends`);

    const weekendsToCreate = [];
    const lastDate = new Date(lastWeekend.saturdayDate);

    for (let i = 1; i <= needToCreate; i++) {
      const newDate = new Date(lastDate);
      newDate.setDate(lastDate.getDate() + (i * 7)); // Add 7 days for each week

      const weekNumber = lastNumber + i;
      const name = lastWeekend.name.replace(/\d+/, weekNumber.toString());

      weekendsToCreate.push({
        saturdayDate: newDate,
        name: name.includes(weekNumber.toString()) ? name : `Weekend ${weekNumber}`,
      });

      console.log(`Will create: ${name} on ${newDate.toDateString()}`);
    }

    // Create all weekends in a transaction
    await prisma.$transaction(
      weekendsToCreate.map((weekend) => prisma.weekend.create({ data: weekend }))
    );

    console.log(`✅ Successfully created ${needToCreate} weekends!`);
    console.log(`Total weekends now: 12`);
  } catch (error) {
    console.error('Error generating weekends:', error);
  } finally {
    await prisma.$disconnect();
  }
}

generateRemainingWeekends();
