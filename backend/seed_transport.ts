import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const transportStopsData = [
  { name: "C.R.P.F.", km: "5", ratePerKm: "0-05", busFare: 600 },
  { name: "Kaithi", km: "5", ratePerKm: "0-05", busFare: 580 },
  { name: "Chandrawal", km: "3", ratePerKm: "0-05", busFare: 600 },
  { name: "Kasim Kheda", km: "5", ratePerKm: "0-05", busFare: 670 },
  { name: "Ganesh Shankar Kheda", km: "5", ratePerKm: "0-05", busFare: 670 },
  { name: "Laxman Kheda", km: "3", ratePerKm: "0-05", busFare: 630 },
  { name: "Makhdoompur Kaithi", km: "3", ratePerKm: "0-05", busFare: 670 },
  { name: "Mohini Kheda", km: "4", ratePerKm: "0-05", busFare: 630 },
  { name: "Mullahi Khera", km: "5", ratePerKm: "0-05", busFare: 700 },
  { name: "Natkur", km: "5", ratePerKm: "0-05", busFare: 750 },
  { name: "Ratauli (Khatola)", km: "5", ratePerKm: "0-05", busFare: 750 },
  { name: "Sariyan", km: "3", ratePerKm: "0-05", busFare: 630 },
  { name: "Shahpur Majhigawan", km: "3", ratePerKm: "0-05", busFare: 620 },
  { name: "Sohawa", km: "5", ratePerKm: "0-05", busFare: 650 },
  { name: "Alakhmanda", km: "4", ratePerKm: "0-05", busFare: 630 },
  { name: "Bhadeswa", km: "5", ratePerKm: "0-05", busFare: 650 },
  { name: "Kurmi", km: "4", ratePerKm: "0-05", busFare: 650 },
  { name: "Khatola", km: "6", ratePerKm: "06-10", busFare: 680 },
  { name: "S.D.K.T", km: "8", ratePerKm: "06-10", busFare: 700 },
  { name: "Ahmad Kheda", km: "9", ratePerKm: "06-10", busFare: 850 },
  { name: "Bahadur Khera", km: "10", ratePerKm: "06-10", busFare: 850 },
  { name: "Balsingh Kheda", km: "8", ratePerKm: "06-10", busFare: 850 },
  { name: "Bhadesuwa", km: "10", ratePerKm: "06-10", busFare: 850 },
  { name: "Bhagat Kheda", km: "7", ratePerKm: "06-10", busFare: 800 },
  { name: "Bhawani Kheda", km: "9", ratePerKm: "06-10", busFare: 850 },
  { name: "Bijnour", km: "7", ratePerKm: "06-10", busFare: 850 },
  { name: "Dhanuwasand", km: "9", ratePerKm: "06-10", busFare: 850 },
  { name: "Himmat Kheda", km: "10", ratePerKm: "06-10", busFare: 850 },
  { name: "Iqbal Kheda", km: "9", ratePerKm: "06-10", busFare: 850 },
  { name: "Jaiti Kheda", km: "9", ratePerKm: "06-10", busFare: 800 },
  { name: "Jalim Khera", km: "10", ratePerKm: "06-10", busFare: 850 },
  { name: "Kamlapur", km: "8", ratePerKm: "06-10", busFare: 850 },
  { name: "Mahesh Kheda", km: "10", ratePerKm: "06-10", busFare: 850 },
  { name: "Marui", km: "9", ratePerKm: "06-10", busFare: 850 },
  { name: "Mati", km: "8", ratePerKm: "06-10", busFare: 850 },
  { name: "Newawan", km: "8", ratePerKm: "06-10", busFare: 850 },
  { name: "Nurdi Kheda", km: "7", ratePerKm: "06-10", busFare: 800 },
  { name: "Pinwat", km: "10", ratePerKm: "06-10", busFare: 850 },
  { name: "Raheem Nagar", km: "9", ratePerKm: "06-10", busFare: 850 },
  { name: "Raja Kheda", km: "10", ratePerKm: "06-10", busFare: 850 },
  { name: "Rani Kheda", km: "9", ratePerKm: "06-10", busFare: 870 },
  { name: "Sadullan Khera", km: "6", ratePerKm: "06-10", busFare: 850 },
  { name: "Mansab Kheda", km: "8", ratePerKm: "06-10", busFare: 820 },
  { name: "Sahajad Pur", km: "10", ratePerKm: "06-10", busFare: 850 },
  { name: "Airforce Station", km: "12", ratePerKm: "11-15", busFare: 1050 },
  { name: "Ayodhya Khera", km: "14", ratePerKm: "11-15", busFare: 1050 },
  { name: "Bhar Kheda", km: "15", ratePerKm: "11-15", busFare: 1050 },
  { name: "Bhawapur", km: "12", ratePerKm: "11-15", busFare: 1050 },
  { name: "Hilgi / JALIMER", km: "14", ratePerKm: "11-15", busFare: 950 },
  { name: "Memoura Village", km: "12", ratePerKm: "11-15", busFare: 950 },
  { name: "Nanki Khera", km: "13", ratePerKm: "11-15", busFare: 950 },
  { name: "Raipur", km: "13", ratePerKm: "11-15", busFare: 1000 },
  { name: "Shankar Kheda", km: "15", ratePerKm: "11-15", busFare: 1000 },
  { name: "Sisendi", km: "12", ratePerKm: "11-15", busFare: 950 },
  { name: "Tikra", km: "12", ratePerKm: "11-15", busFare: 970 },
  { name: "Trilokpur", km: "14", ratePerKm: "11-15", busFare: 1000 },
  { name: "Gudwa", km: "12", ratePerKm: "11-15", busFare: 1000 }
];

async function main() {
  console.log('Cleaning existing transport stops...');
  await prisma.transportStop.deleteMany();
  
  console.log('Seeding transport stops...');
  
  for (const stop of transportStopsData) {
    await prisma.transportStop.create({
      data: stop,
    });
  }
  
  console.log('Successfully seeded transport stops!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
