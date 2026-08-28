import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const students = [
  { name: 'Abhi Yadav', father: 'Santosh Yadav', mother: 'Preeti', dob: '13-09-2019', address: 'Raheem Nagar', phone: '9695087914', aadhar: '' },
  { name: 'Aditya Yadav', father: 'Ram Mahesh', mother: 'Savita Yadav', dob: '19-08-2019', address: 'Raheem Nagar', phone: '9793266659', aadhar: '' },
  { name: 'Advik Sharma', father: 'Uttam Kumar', mother: 'Pooja', dob: '07-09-2019', address: 'Saraiya', phone: '8127060191', aadhar: '' },
  { name: 'Anurag Singh', father: 'Brijesh Singh', mother: 'Pooja', dob: '20-03-2021', address: 'Sohawa', phone: '9721698684', aadhar: '' },
  { name: 'Anway Yadav', father: 'Radheshyam', mother: 'Usha', dob: '03-05-2019', address: 'Dhanuwasand', phone: '7388176573', aadhar: '873058920768' },
  { name: 'Ayush', father: 'Ashok Kumar', mother: 'Savita', dob: '19-10-2020', address: 'Saraiya', phone: '9005446722', aadhar: '357032534618' },
  { name: 'Arvi', father: 'Sarvan', mother: 'Rekha', dob: '06-07-2020', address: 'Majhigawan', phone: '9621992361', aadhar: '461120576113' },
  { name: 'Atharv Yadav', father: 'Ashish Kumar', mother: 'Soni Yadav', dob: '18-01-2020', address: 'Rani Kheda', phone: '8174967881', aadhar: '' },
  { name: 'Avika Yadav', father: 'Raj Kumar', mother: 'Neeta Yadav', dob: '21-09-2020', address: 'Alakhnanda', phone: '91505543596', aadhar: '533300063756' },
  { name: 'Aviral Pal', father: 'Amardeep Pal', mother: 'Mamta', dob: '22-11-2022', address: 'Jaitikheda', phone: '7522829477', aadhar: '' },
  { name: 'Ayan Pratap Singh', father: 'Omkar Singh', mother: 'Pooja', dob: '04-04-2020', address: 'Alakhnanda', phone: '8009302270', aadhar: '' },
  { name: 'Ayansh Rawat', father: 'Ajay Kumar', mother: 'Radhika', dob: '19-11-2019', address: 'Raheem Nagar', phone: '8957727732', aadhar: '' },
  { name: 'Divya', father: 'Ram Babu', mother: 'Moni', dob: '23-12-2020', address: 'Majhigawan', phone: '9670892591', aadhar: '' },
  { name: 'Divyanshi', father: 'Shyam Kishore', mother: 'Seema', dob: '26-02-2021', address: 'Jaitikheda', phone: '7388835133', aadhar: '5802981124417' },
];

const classId = '69be3d446fcb08a37757d4e7';
const sectionId = '69be3d446fcb08a37757d4e9';
const startAdmNoIndex = 45;

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
                        leavingReason: '',
                        siblingInfo: '',
                        bloodGroup: '',
                        category: '',
                        religion: '',
                        photo: '',
                        prevSchoolName: '',
                        prevClass: '',
                        prevSchoolAddress: '',
                        prevMarks: '',
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
