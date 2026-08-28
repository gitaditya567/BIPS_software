import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const students = [
  // List 1
  { name: 'Abhay Sharma', father: 'Mr. Shiv Lal', mother: 'Mrs. Meena', dob: '8-10-17', address: 'Raipur', phone: '9670967447', aadhar: '897501722999' },
  { name: 'Abhi Sagar', father: 'Mr. Sugreev Kr.', mother: 'Mrs. Saroj Devi', dob: '23-11-18', address: 'Natkur', phone: '9506836200', aadhar: '350425066503' },
  { name: 'Abhijeet Singh', father: 'Mr. Indrajeet Singh', mother: 'Mrs. Kanchan lata', dob: '18-8-18', address: 'Kamlapur', phone: '7071770770', aadhar: '' },
  { name: 'Adarsh Sharma', father: 'Mr. Uttam Kr.', mother: 'Mrs. Pooja', dob: '22-2-18', address: 'Sarayan', phone: '8127060191', aadhar: '466313832723' },
  { name: 'Akshat Tiwari', father: 'Mr. Ashwani Tiwari', mother: 'Mrs. Shikha Tiwari', dob: '5-8-17', address: 'Raipur', phone: '9044004965', aadhar: '900028240576' },
  { name: 'Akshat Vishwakarma', father: 'Mr. Ayodhya Prasad', mother: 'Mrs. Kalpana', dob: '11-8-18', address: 'Mahesh Kheda', phone: '8009591303', aadhar: '361543933844' },
  { name: 'Akshita Prajapati', father: 'Mr. Rupesh Kr.', mother: 'Mrs. Mamta Prajapati', dob: '27-3-18', address: 'Sohawa', phone: '9838789744', aadhar: '461405716508' },
  { name: 'Amol Dwivedi', father: 'Mr. Ajay Dwivedi', mother: 'Mrs. Sanju Dwivedi', dob: '06-01-18', address: 'Bhadesuwa', phone: '9559858315', aadhar: '435027586529' },
  { name: 'Anaya Singh', father: 'Mr. Amit Singh', mother: 'Mrs. Sheela Singh', dob: '31-5-18', address: 'Kaithi', phone: '7007291205', aadhar: '513468421171' },
  { name: 'Anmol', father: 'Mr. Vinod Kr.', mother: 'Mrs. Manisha', dob: '17-5-17', address: 'Sohawa', phone: '8881884643', aadhar: '475618984720' },
  { name: 'Anmol Lodhi', father: 'Mr. Ashish Kr.', mother: 'Mrs. Asha', dob: '19-6-17', address: 'Kaithi', phone: '8858924335', aadhar: '973697772076' },
  { name: 'Anmol Yadav', father: 'Mr. Satyaveer', mother: 'Mrs. Sonika', dob: '16-11-17', address: 'Rani Kheda', phone: '9494073463', aadhar: '667012535574' },
  { name: 'Ansh Tiwari', father: 'Mr. Pradeep Tiwari', mother: 'Mrs. Ruchi Tiwari', dob: '9-12-16', address: 'Jaitikheda', phone: '7355203494', aadhar: '378942586038' },
  { name: 'Ansh Yadav', father: 'Mr. Raghvendra', mother: 'Mrs. Preeti', dob: '16-5-17', address: 'Gudwa', phone: '9005049909', aadhar: '587420590942' },
  { name: 'Anushka Sharma', father: 'Mr. Indresen Sharma', mother: 'Mrs. Soni', dob: '21-4-18', address: 'Dhanuwasand', phone: '7390878669', aadhar: '' },
  { name: 'Aradhya Chaurasia', father: 'Mr. Dev Shankar', mother: 'Mrs. Priya Chaurasia', dob: '21-10-17', address: 'Dhanuwasand', phone: '8400234824', aadhar: '' },
  { name: 'Anadhya Singh', father: 'Mr. Akhilesh', mother: 'Mrs. Jyoti', dob: '12-3-16', address: 'Jaitikheda', phone: '7678876962', aadhar: '' },
  { name: 'Aradhya Yadav', father: 'Mr. Chatur Singh Yada', mother: 'Mrs. Ruchi Yadav', dob: '16-4-18', address: 'Gudwa', phone: '9005049909', aadhar: '552556045836' },
  { name: 'Deepanshi', father: 'Mr. Deepak Kr. Kanau', mother: 'Mrs. Preeti Kanaujia', dob: '26-11-17', address: 'Majhigawan', phone: '8924817324', aadhar: '276167251287' },
  { name: 'Deepanshu', father: 'Mr. Deepak Kr. Kanau', mother: 'Mrs. Preeti Kanaujia', dob: '9-2-18', address: 'Majhigawan', phone: '8924817324', aadhar: '911105001257' },
  { name: 'Dhairya Sahu', father: 'Mr. Ravi Shankar Sahu', mother: 'Mrs. Swati Sahu', dob: '26-11-19', address: 'Sohawa', phone: '6392701290', aadhar: '591664646129' },
  { name: 'Divyanshi Rajpoot', father: 'Mr. Govind Kumar', mother: 'Mrs. Pinki Devi', dob: '11-8-18', address: 'Kaithi', phone: '7388277427', aadhar: '790684321074' },
  { name: 'Kartik Prajapati', father: 'Mr. Anuj', mother: 'Mrs. Archana', dob: '2-7-17', address: 'Sarayan', phone: '7905124128', aadhar: '898611592050' },
  { name: 'Krishna Gupta', father: 'Mr. Sandeep Gupta', mother: 'Mrs. Upasana Gupta', dob: '9-2-18', address: 'Bhadesuwa', phone: '8787016061', aadhar: '271115401756' },
  { name: 'Kulshreshth', father: 'Mr. Mahendra Pratap', mother: 'Mrs. Aradhana', dob: '8-10-18', address: 'Mansab Kheda', phone: '9198996367', aadhar: '' },
  { name: 'Manas', father: 'Mr. Umesh', mother: 'Mrs. Sudha', dob: '20-5-18', address: 'Bhagukheda', phone: '8808456841', aadhar: '459157237747' },
  { name: 'Mayank Gupta', father: 'Mr. Rakesh Gupta', mother: 'Mrs. Pooja Gupta', dob: '28-2-18', address: 'Bhadesuwa', phone: '9198942267', aadhar: '608004851214' },
  { name: 'Priyal Yadav', father: 'Mr. Rajesh Kr.', mother: 'Mrs. Sadhana Devi', dob: '11-6-19', address: 'Kasim Kheda', phone: '8127521646', aadhar: '494178277249' },
  { name: 'Priyanka (1)', father: 'Mr. Shyam Kishor', mother: 'Mrs. Seema', dob: '24-8-18', address: 'Sohawa', phone: '7388835133', aadhar: '960275613441' },
  { name: 'Priyanka (2)', father: 'Mr. Rajendra', mother: 'Mrs. Sharma Devi', dob: '25-11-18', address: 'Bhagukheda', phone: '7235035108', aadhar: '204558986514' },
  { name: 'Pallavi Yadav', father: 'Mr. Vijay Kr.', mother: 'Mrs. Binu', dob: '5-4-18', address: 'Hila', phone: '9005749764', aadhar: '786800732099' },
  { name: 'Rafi', father: 'Juber', mother: 'Reshma', dob: '5-9-17', address: 'Bhagukheda', phone: '7525003234', aadhar: '' },
  { name: 'Ranvijay', father: 'Mahesh Kr.', mother: 'Mrs. Nirmala', dob: '8-11-14', address: 'Sarayan', phone: '9026609706', aadhar: '' },
  { name: 'Rishabh Sahu', father: 'Kuldeep', mother: 'Rekha Rani', dob: '5-9-18', address: 'Marui', phone: '8853446344', aadhar: '605383714612' },
  { name: 'Rishabh Sharma', father: 'Havimohan', mother: 'Anamika', dob: '25-9-16', address: 'Bhaunri', phone: '9559885115', aadhar: '431487663476' },
  { name: 'Rehan Rawat', father: 'Rohit Rawat', mother: 'Savita', dob: '26-8-16', address: 'Sarayan', phone: '9369336235', aadhar: '' },
  { name: 'Shayan Siddiqui', father: 'Mohd. Nadeem', mother: 'Afreen', dob: '29-5-17', address: 'Bhadesuwa', phone: '9956114211', aadhar: '201607862555' },
  { name: 'Shaurya Yadav', father: 'Inderpal', mother: 'Preeti', dob: '21-2-18', address: 'Kamlapur', phone: '8090809043', aadhar: '' },
  
  // List 2
  { name: 'Shubhi Yadav', father: 'Abhishek Yadav', mother: 'Sarita', dob: '15-7-18', address: 'Dhanuwasand', phone: '9198997043', aadhar: '' },
  { name: 'Siddharth', father: 'Dharmendra Kr.', mother: 'Savita Devi', dob: '2-6-18', address: 'Ratauli', phone: '9793453540', aadhar: '' },
  { name: 'Sukhmani Kaur', father: 'Gurpreet Singh', mother: 'Principal Kaur', dob: '26-1-18', address: 'Kaithi', phone: '8604830938', aadhar: '960250572241' },
  { name: 'Jamanna', father: 'Satyawan', mother: 'Kanchan', dob: '14-4-18', address: 'Dhanuwasand', phone: '9559386721', aadhar: '' },
  { name: 'Tanya', father: 'Alok Kumar', mother: 'Roshni Devi', dob: '15-3-18', address: 'Dhanuwasand', phone: '7991935026', aadhar: '' },
  { name: 'Vipul', father: 'Anuj Kumar', mother: 'Vineeta', dob: '16-1-18', address: 'Ratauli', phone: '6307637226', aadhar: '238748541775' },
  { name: 'Pallavi (new)', father: 'Mr. Ajay', mother: 'Anusuya', dob: '6-11-15', address: 'Dhanuwasand', phone: '9559416238', aadhar: '391624914735' },
];


const classId = '69c12ea54529bf8f03c11b4b'; // Class 3
const sectionId = '69c12ea54529bf8f03c11b4c'; // Section A

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
