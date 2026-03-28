import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const students = [
  // List 1
  { name: 'Divyansh', father: 'Mr. Ashok', mother: 'Mrs. Kiran Devi', dob: '29-8-18', address: 'Memoura', phone: '6393687038', aadhar: '' },
  { name: 'Shivya', father: 'Mr. Shailendra', mother: 'Mrs. Sonam', dob: '19-7-19', address: 'Sohawa', phone: '8198009921', aadhar: '' },
  { name: 'Vijay Laxmi', father: 'Mr. Vishnu', mother: 'Mrs. Kiran', dob: '30-12-18', address: 'Balsinghkheda', phone: '9956983968', aadhar: '' },
  
  // List 2
  { name: 'Ansh Yadav', father: 'Mr. Mahendra', mother: 'Mrs. Monika', dob: '31-12-20', address: 'Nanki Kheda', phone: '9935839294', aadhar: '470336571574' },
  { name: 'Annu Yadav', father: 'Mr. Abhishek', mother: 'Mrs. Savita', dob: '5-5-20', address: 'Dhanwasa', phone: '9198997093', aadhar: '' },
  { name: 'Aaradhya Yadav', father: 'Mr. Awadhesh', mother: 'Mrs. Neetu', dob: '29-10-18', address: 'Kamlapur', phone: '9795184320', aadhar: '' },
  { name: 'Aadhya', father: 'Mr. Devendra', mother: 'Mrs. Kavita', dob: '12-3-19', address: 'Bhagukheda', phone: '9005299334', aadhar: '' },
  { name: 'Arohi Raj', father: 'Mr. Diwakar Nath', mother: 'Mrs. Reshma', dob: '29-1-20', address: 'Majhigawan', phone: '7390975777', aadhar: '' },
  { name: 'Avnish Saini', father: 'Mr. Raj Kumar', mother: 'Mrs. Nisha', dob: '3-5-19', address: 'Sohawa', phone: '9170934031', aadhar: '' },
  { name: 'Aviral Yadav', father: 'Mr. Ajay Kumar', mother: 'Mrs. Sapna', dob: '20-4-20', address: 'Mansab Kheda', phone: '8009402683', aadhar: '' },
  { name: 'Gurleen Kaur', father: 'Mr. Gurpreet', mother: 'Mrs. Davanjeet', dob: '15-1-20', address: 'Kakthi', phone: '9793077455', aadhar: '' },
  { name: 'Kajal', father: 'Mr. Manish', mother: 'Mrs. Aarti', dob: '15-1-19', address: 'Sisendi', phone: '7607984061', aadhar: '' },
  { name: 'Krishna', father: 'Mr. Kuldeep', mother: 'Mrs. Seema', dob: '28-8-19', address: 'Rani Kheda', phone: '8127929246', aadhar: '818257710349' },
  { name: 'Manya Yadav', father: '', mother: '', dob: '20-4-19', address: 'Rani Kheda', phone: '7307441080', aadhar: '' },
  { name: 'Nihal', father: 'Mr. Mukesh', mother: 'Mrs. Shweta', dob: '20-4-19', address: 'Rani Kheda', phone: '7307441080', aadhar: '' },
  { name: 'Palak Tiwari', father: 'Mr. Anuj', mother: 'Mrs. Shikha', dob: '11-12-20', address: 'Raipur', phone: '7800391732', aadhar: '608789533207' },
  { name: 'Pragyan Pandey', father: 'Mr. Anuj', mother: 'Mrs. Anita', dob: '19-7-19', address: 'Alakhmada Saraiyan', phone: '8808888518', aadhar: '' },
  { name: 'Reshika', father: 'Mr. Rohit', mother: 'Mrs. Savita', dob: '19-10-19', address: 'Saraiyan', phone: '9369336235', aadhar: '' },
  { name: 'Rishika Yadav', father: 'Mr. Ajit', mother: 'Mrs. Roli', dob: '3-10-18', address: 'Mauii', phone: '8953708040', aadhar: '' },
  { name: 'Sagar', father: 'Mr. Rajendra', mother: 'Mrs. Roli', dob: '18-12-17', address: 'Saraiyan', phone: '7985821232', aadhar: '906947306787' },
  { name: 'Saurabh', father: 'Mr. Saroj', mother: 'Mrs. Malti', dob: '1-8-19', address: 'Alaudinau', phone: '9125331936', aadhar: '' },
  { name: 'Shagun', father: 'Mr. Pintu', mother: 'Mrs. Rupa', dob: '7-8-18', address: 'Majhigawan', phone: '8090535948', aadhar: '' },
];


const classId = '64f1e0000000000000000001'; // Class 1
const sectionId = '64f1e0000000000000000002'; // Section A

async function main() {
  const hashedPassword = await bcrypt.hash('123456', 10);
  const year = new Date().getFullYear();

  // Find the max admission number currently in the DB
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
    
    let email = `${admissionNo.replace(/\//g, '_').toLowerCase()}@bips.local`;

    // Check if user email already exists
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
