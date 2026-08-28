import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const students = [
  { name: 'Abhinav Yadav', father: 'Mr. Suraj Yadav', mother: 'Mrs. Renu Yadav', dob: '20-10-18', address: 'Dhanuwasand', phone: '8429326988', aadhar: '' },
  { name: 'Abhishek', father: 'Mr. Manoj', mother: 'Mrs. Poonam', dob: '29-11-15', address: 'Bhagukheda', phone: '8001373955', aadhar: '8315716007216' },
  { name: 'Aditya Yadav', father: 'Mr. Chandra Prakash', mother: 'Mrs. Poonam', dob: '17-10-16', address: 'Marui', phone: '9956131590', aadhar: '510972443324' },
  { name: 'Anurag Yadav', father: 'Mr. Vinod Kumar', mother: 'Mrs. Anshika', dob: '28-02-18', address: 'Memoura', phone: '9621250853', aadhar: '368731777967' },
  { name: 'Arpita', father: 'Mr. Kuldeep', mother: 'Mrs. Seema', dob: '19-01-17', address: 'Sarayan', phone: '8127209246', aadhar: '333996081571' },
  { name: 'Ayansh Yadav', father: 'Mr. Dinesh Yadav', mother: 'Mrs. Pinki', dob: '14-06-18', address: 'Sarayan', phone: '9735165319', aadhar: '70132353669' },
  { name: 'Ayush Kumar', father: 'Mr. Kailash', mother: 'Mrs. Mamta', dob: '10-06-17', address: 'Airforce Memoura', phone: '6239268844', aadhar: '93153754345' },
  { name: 'Hardik Singh', father: 'Mr. Anuj Pratap', mother: 'Mrs. Reena', dob: '12-09-16', address: 'Dhanuwasand', phone: '9305050859', aadhar: '976575227267' },
  { name: 'Indu', father: 'Mr. Jeet Bahadur', mother: 'Mrs. Roshi', dob: '01-10-15', address: 'Kaithi', phone: '7985491001', aadhar: '214803904646' },
  { name: 'Ishani Nirmal', father: 'Mr. Anil Kumar', mother: 'Mrs. Gudiya', dob: '16-12-15', address: 'Dhanuwasand', phone: '9359337441', aadhar: '531275378060' },
  { name: 'Tanvi Yadav', father: 'Mr. Lali Yadav', mother: 'Mrs. Meera Yadav', dob: '10-03-17', address: 'Himmat Kheda', phone: '9621808099', aadhar: '' },
  { name: 'Kanchan Sharma', father: 'Mr. Dhanjay Sharma', mother: 'Mrs. Mamta', dob: '27-02-17', address: 'Sarayan', phone: '8920945243', aadhar: '237220259559' },
  { name: 'Kaustubh Sharma', father: 'Mr. Ram Prakash', mother: 'Mrs. Deepmala', dob: '19-02-18', address: 'Bhadesuwa', phone: '9935574903', aadhar: '222710044958' },
  { name: 'Kirti', father: 'Mr. Rajesh', mother: 'Mrs. Savitri', dob: '02-02-17', address: 'Nurdi Kheda', phone: '9044032050', aadhar: '' },
  { name: 'Krishna Rawat', father: 'Mr. Vinod Rawat', mother: 'Mrs. Neelu', dob: '09-05-15', address: 'Majhigawan', phone: '869737619', aadhar: '381297805744' },
  { name: 'Mayank Rawat', father: 'Mr. Vinod Rawat', mother: 'Mrs. Neelu', dob: '09-05-15', address: 'Majhigawan', phone: '7395024900', aadhar: '244800447266' },
  { name: 'Pallavi', father: 'Mr. Satish Kumar', mother: 'Mrs. Poonam', dob: '22-12-16', address: 'Balsinghkheda', phone: '914820035', aadhar: '' },
  { name: 'Piyush', father: 'Mr. Ankit', mother: 'Mrs. Preeti', dob: '18-06-16', address: 'Majhigawan', phone: '919609264', aadhar: '822445825396' },
  { name: 'Pooja', father: 'Mr. Dileep Kumar', mother: 'Mrs. Aarti', dob: '21-09-17', address: 'Bhaunri', phone: '9423417821', aadhar: '405413139339' },
  { name: 'Radhika Yadav', father: 'Mr. Dharmendra', mother: 'Mrs. Suneeta', dob: '25-06-16', address: 'Rani Kheda', phone: '9198007580', aadhar: '832755036176' },
  { name: 'Raj Yadav', father: 'Mr. Brijendra Singh', mother: 'Mrs. Aarti', dob: '30-11-14', address: 'Nurdi Kheda', phone: '7355479728', aadhar: '' },
  { name: 'Ritika', father: 'Mr. Nirmal Kumar', mother: '', dob: '02-02-17', address: 'Kaithi', phone: '7105742290', aadhar: '841676296382' },
  { name: 'Sandhya Maurya', father: 'Mr. Rohit Maurya', mother: 'Mrs. Kunti', dob: '17-05-17', address: 'Mohini Kheda', phone: '9956403562', aadhar: '408876288634' },
  { name: 'Shreya Rawat', father: 'Mr. Rampal', mother: 'Mrs. Sangeeta', dob: '10-03-17', address: 'Tikra', phone: '9621203844', aadhar: '' },
  { name: 'Shivam Kapoor', father: 'Mr. Manoj Kumar', mother: 'Mrs. Sangeeta', dob: '10-01-17', address: 'Ahmed Kheda', phone: '9026497353', aadhar: '476624153619' },
  { name: 'Shivansh', father: 'Mr. Vinay', mother: 'Mrs. Reema Devi', dob: '06-08-17', address: 'Balsinghkheda', phone: '9005232185', aadhar: '638591979328' },
  { name: 'Shivanya', father: 'Mr. Inderpal', mother: 'Mrs. Preeti Yadav', dob: '05-01-17', address: 'Kamlapur', phone: '8090809045', aadhar: '' },
  { name: 'Shreyansh', father: 'Mr. Ashlalin', mother: 'Mrs. Piti', dob: '25-01-17', address: 'Bhaunri', phone: '6393372514', aadhar: '' }
];


const classId = '69c12ea54529bf8f03c11b4e'; // Class 4
const sectionId = '69c12ea54529bf8f03c11b4f'; // Section A

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
