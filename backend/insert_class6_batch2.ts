import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const students = [
  { name: 'Varsha', father: 'Mr. Ram Kr. Yadav', mother: 'Mrs. Sunita Yadav', dob: '26-10-15', address: 'Pinwat', phone: '9935359360', aadhar: '557618476962' },
  { name: 'Shourya Prajapati', father: 'Mr. Santkumar Prajap', mother: 'Mrs. Asha Devi', dob: '06-05-14', address: 'Majhigawan', phone: '7054218909', aadhar: '786709830001' },
  { name: 'Kartik', father: 'Mr. Sanjay Yadav', mother: 'Mrs. Sangeeta Devi', dob: '08-12-14', address: 'Saraiyana', phone: '8127110375', aadhar: '218824155535' },
  { name: 'Surya Rawat', father: 'Mr. Sanjay Rawat', mother: 'Mrs. Mamno Rawat', dob: '08-08-14', address: 'Makhdoompur Kaithi', phone: '7385491001', aadhar: '848494297331' },
  { name: 'Anika', father: 'Mr. Abhishek Kr. Shar', mother: 'Mrs. Manju Sharma', dob: '24-11-14', address: 'Saraiya', phone: '9936191007', aadhar: '564266235532' },
  { name: 'Vaishnavi', father: 'Mr. Dharmendra Kr. C', mother: 'Late Anusuya Chaud', dob: '11-01-13', address: 'Saraiya', phone: '9956383729', aadhar: '618894756030' },
];


const classId = '69c12ea64529bf8f03c11b54'; // Class 6
const sectionId = '69c12ea64529bf8f03c11b55'; // Section A

async function main() {
  const hashedPassword = await bcrypt.hash('123456', 10);
  const year = new Date().getFullYear();

  const latestAdmissions = await prisma.studentProfile.findMany({
    orderBy: { admissionNo: 'desc' },
  });
  
  let startAdmNoIndex = 1;
  const latestAdmNoStr = latestAdmissions.find(s => s.admissionNo?.startsWith('BIPS/26/'))?.admissionNo;
  if(latestAdmNoStr) {
      const parts = latestAdmNoStr.split('/');
      startAdmNoIndex = parseInt(parts[2]) + 1;
  } else {
      startAdmNoIndex = 101;
  }

  let autoStudentIdNum = 1;
  for (let i = 0; i < students.length; i++) {
    const studentData = students[i];
    const admissionNo = `BIPS/26/${String(startAdmNoIndex + i).padStart(3, '0')}`;
    
    // Find the current latest student ID to ensure we don't have collisions
    const latestStudent = await prisma.studentProfile.findFirst({
        where: { studentId: { startsWith: `STU-${year}` } },
        orderBy: { studentId: 'desc' }
    });

    if (latestStudent && latestStudent.studentId) {
        const lastIdParts = latestStudent.studentId.split('-');
        const lastCount = parseInt(lastIdParts[2]);
        if (!isNaN(lastCount)) autoStudentIdNum = lastCount + 1;
    }

    const studentId = `STU-${year}-${String(autoStudentIdNum).padStart(4, '0')}`;
    
    let email = `${admissionNo.replace(/\//g, '_').toLowerCase()}@bips.local`;

    let existingUser = await prisma.user.findUnique({ where: { email } });
    if(existingUser) {
        email = `${email.replace('@', Date.now().toString() + '@')}`;
    }

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
