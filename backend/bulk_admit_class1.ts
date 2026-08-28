import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const students = [
  { name: 'Kulwant Singh', father: 'Binda Prasad', mother: 'Malti', dob: '', address: 'Raheem Nagar', phone: '9793258830', aadhar: '' },
  { name: 'Mahek Rawat', father: 'Sujeet', mother: 'Roli', dob: '27-01-2020', address: 'Jaiti Kheda', phone: '9838635902', aadhar: '' },
  { name: 'Mayank', father: 'Kamlesh', mother: 'Sheelu', dob: '24-04-2020', address: 'Raja Kheda', phone: '7275231086', aadhar: '609074266407' },
  { name: 'Mayur', father: 'Mukesh', mother: 'Shalu', dob: '09-10-2019', address: 'Sohawa', phone: '7007959102', aadhar: '762069276534' },
  { name: 'Nitya', father: 'Nagendra Kumar', mother: 'Jayashree', dob: '24-11-2020', address: 'Neewa', phone: '9125874265', aadhar: '851658079693' },
  { name: 'Om Vaish', father: 'Anoop Gupta', mother: 'Lalita Gupta', dob: '11-06-2021', address: 'Dhanuwasand', phone: '9956718474', aadhar: '' },
  { name: 'Payal Yadav', father: 'Satish Yadav', mother: 'Poonam', dob: '17-03-2020', address: 'Balesingh Kheda', phone: '8174828035', aadhar: '' },
  { name: 'Rudra Pratap', father: 'Sarvan Kumar', mother: 'Rekha', dob: '06-07-2020', address: 'Majhigawan', phone: '9621992861', aadhar: '728867656775' },
  { name: 'Rudrakshi Tiwari', father: 'Radheshyam Tiwari', mother: 'Deepanshi Tiwari', dob: '17-10-2020', address: 'Majhigawan', phone: '9460948149', aadhar: '998559900394' },
  { name: 'Shivansh Pal', father: 'Shiv Mohan', mother: 'Supriya', dob: '20-11-2021', address: 'Jaiti Kheda', phone: '9598672213', aadhar: '' },
  { name: 'Samriddhi Sharma', father: 'Rupesh Sharma', mother: 'Anamika Sharma', dob: '07-09-2021', address: 'Jaiti Kheda', phone: '9794999786', aadhar: '' },
  { name: 'Shraddha', father: 'Rahul', mother: 'Sunita', dob: '11-11-2020', address: 'Shahjadpur', phone: '9415145676', aadhar: '985758589465' },
  { name: 'Tushant Sharma', father: 'Maneesh Sharma', mother: 'Ruchi Sharma', dob: '10-08-2020', address: 'Jaiti Kheda', phone: '9554052460', aadhar: '' },
  { name: 'Virat Sharma', father: 'Pawan Kumar', mother: 'Nisha Sharma', dob: '15-10-2019', address: 'Bhadeswara', phone: '9005370849', aadhar: '' },
];

const classId = '64f1e0000000000000000001';
const sectionId = '64f1e0000000000000000002';
const startAdmNoIndex = 59;

async function main() {
  const hashedPassword = await bcrypt.hash('123456', 10);
  const year = new Date().getFullYear();

  for (let i = 0; i < students.length; i++) {
    const studentData = students[i];
    const admissionNo = `BIPS/26/${String(startAdmNoIndex + i).padStart(3, '0')}`;
    
    // Find latest studentId to generate next one
    const latestStudent = await prisma.studentProfile.findFirst({
        where: { studentId: { startsWith: `STU-${year}` } },
        orderBy: { studentId: 'desc' }
    });

    let nextCount = 1;
    if (latestStudent && latestStudent.studentId) {
        const lastIdParts = latestStudent.studentId.split('-');
        const lastCount = parseInt(lastIdParts[2]);
        if (!isNaN(lastCount)) nextCount = lastCount + 1;
    }

    const studentId = `STU-${year}-${String(nextCount).padStart(4, '0')}`;
    const email = `${admissionNo.replace(/\//g, '_').toLowerCase()}@bips.local`;

    try {
        await prisma.user.create({
            data: {
                email,
                password: hashedPassword,
                name: studentData.name,
                phone: studentData.phone,
                role: Role.STUDENT,
                address: studentData.address,
                studentProfile: {
                    create: {
                        admissionNo,
                        studentId,
                        classId,
                        sectionId,
                        gender: 'Other', 
                        dateOfBirth: studentData.dob,
                        fatherName: studentData.father,
                        motherName: studentData.mother,
                        aadhaarNumber: studentData.aadhar,
                        academicYear: '2026-27',
                        medium: 'English',
                        nationality: 'Indian',
                        admissionDate: new Date(),
                    }
                }
            }
        });
        console.log(`Admitted: ${studentData.name} (${admissionNo}) -> STU-ID: ${studentId}`);
    } catch (e: any) {
        console.error(`Failed to admit ${studentData.name}:`, e.message);
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
