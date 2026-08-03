import { PrismaClient } from '@prisma/client';
import { invalidateCache } from './src/lib/cache';

const prisma = new PrismaClient();

async function main() {
  console.log("Clearing server memory cache...");
  invalidateCache('fees:');
  invalidateCache('dashboard');
  console.log("Cache cleared successfully.");
}

main().catch(console.error).finally(() => prisma.$disconnect());
