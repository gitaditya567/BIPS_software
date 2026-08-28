import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const students = [
  { name: 'Anshi', father: 'Mr. Vijay Kr. Verma', mother: 'Mrs. Krishna Devi', dob: '23-06-14', address: 'Bhagu Kheda', phone: '8115441037', aadhar: '780290507661' },
  { name: 'Aditya Singh', father: 'Mr. Sohan Lal Yadav', mother: 'Mrs. Reema', dob: '23-08-14', address: 'Meeranpur', phone: '8009740349', aadhar: '784082104916' },
  { name: 'Aman', father: 'Mr. Becha Lal', mother: 'Mrs. Dayawati', dob: '24-12-14', address: 'Sarayan', phone: '9651209285', aadhar: '390176381171' },
  { name: 'Anand', father: 'Mr. Sanjeet Kumar', mother: 'Mrs. Radha', dob: '21-12-14', address: 'Bhagu Kheda', phone: '9793453266', aadhar: '425785545407' },
  { name: 'Ansh Yadav', father: 'Mr. Dileep', mother: 'Mrs. Sangeeta', dob: '26-02-15', address: 'Dhanuwasand', phone: '8840906123', aadhar: '698080010797' },
  { name: 'Anushka', father: 'Mr. Ankit', mother: 'Mrs. Preeti', dob: '27-08-14', address: 'Majhigawan', phone: '9119609264', aadhar: '253313528373' },
  { name: 'Aradhya', father: 'Mr. Om Prakash', mother: 'Mrs. Ankita', dob: '27-05-15', address: 'Amiliha Kheda', phone: '6392393413', aadhar: '663198685785' },
  { name: 'Ayushi Chaurasiya', father: 'Mr. Anoop', mother: 'Mrs. Ram Devi', dob: '28-07-15', address: 'Raipur', phone: '8172923118', aadhar: '220085546589' },
  { name: 'Adarsh Yadav', father: 'Mr. Manoj Yadav', mother: 'Mrs. Archana', dob: '05-04-15', address: 'Kasim Kheda', phone: '9793048384', aadhar: '548584394237' },
  { name: 'Amrita Pal', father: 'Mr. Avdhesh Pal', mother: 'Mrs. Aarti Pal', dob: '11-05-14', address: 'Tikra', phone: '7524049049', aadhar: '580326339213' },
  { name: 'Abuzar Qudri', father: 'Syed Ali Raza', mother: 'Afreen Ali', dob: '23-05-13', address: 'Bhadesuwa', phone: '8687891230', aadhar: '997513163300' },
  { name: 'Adhayan Sharma', father: 'Mr. Jitendra', mother: 'Mrs. Shiv Devi', dob: '01-11-15', address: 'Makhdoompur Kaithi', phone: '6392772991', aadhar: '899690524052' },
  { name: 'Ansh Sagar', father: 'Mr. Sugreev', mother: 'Mrs. Saroj Devi', dob: '02-02-15', address: 'Natkur', phone: '9452685711', aadhar: '324657026607' },
  { name: 'Divyanshu', father: 'Mr. Vinda Prasad', mother: 'Mrs. Savita', dob: '16-10-15', address: 'Bhaunri', phone: '7068050967', aadhar: '957404183904' },
  { name: 'Divya', father: 'Mr. Virendra', mother: 'Mrs. Gangotri', dob: '05-08-15', address: 'Dhanuwasand', phone: '8400972723', aadhar: '51051800117' },
  { name: 'Fazil Siddique', father: 'Faheem', mother: 'Sabeen', dob: '29-05-15', address: 'Bijnaur', phone: '9636161785', aadhar: '042360680806' },
  { name: 'Kumar', father: 'Mr. Ganga Sagar', mother: 'Mrs. Seema', dob: '02-01-14', address: 'Raheem Nagar', phone: '8736333001', aadhar: '312340725728' },
  { name: 'Lavi', father: 'Mr. Raghuvendra', mother: 'Mrs. Preeti', dob: '23-08-14', address: 'Gadwa', phone: '9198915464', aadhar: '606550414230' },
  { name: 'Mohit', father: 'Mr. Mukesh Yadav', mother: 'Mrs. Preeti', dob: '10-09-15', address: 'Raheem Nagar', phone: '8528953963', aadhar: '89594130089' },
  { name: 'Mayank', father: 'Mr. Rakesh Yadav', mother: 'Mrs. Roshini', dob: '13-01-15', address: 'Kasim Kheda', phone: '7905762852', aadhar: '219902360002' },
  { name: 'Mehvil', father: 'Mr. Devi Charan', mother: 'Mrs. Kalpna', dob: '19-11-14', address: 'Marui', phone: '7388472426', aadhar: '327016460277' },
  { name: 'Nihal Maurya', father: 'Mr. Rohit Maurya', mother: 'Mrs. Kunti', dob: '30-03-14', address: 'Nandini Kheda', phone: '9556403562', aadhar: '84347119505' },
  { name: 'Naman', father: 'Mr. Ramkaran Rawat', mother: 'Mrs. Meena Rawa', dob: '04-02-11', address: 'Mullahi Kheda', phone: '7001929375', aadhar: '81246146166' },
  { name: 'Palak', father: 'Mr. Vijay Kumar', mother: 'Mrs. Beenu', dob: '06-05-11', address: 'Hilgi', phone: '9005791764', aadhar: '235509652937' },
  { name: 'Pooel', father: 'Mr. Satish Kumar', mother: 'Mrs. Poonam', dob: '03-03-10', address: 'Balsingh Kheda', phone: '8174828035', aadhar: '712932778151' },
  { name: 'Pranshi Chaurasiya', father: 'Mr. Baijnath', mother: 'Mrs. Ramakanti', dob: '17-08-11', address: 'Sisendi', phone: '8953944260', aadhar: '322650768685' },
  { name: 'Praveeta', father: 'Mr. Rajesh Kr. Chaudl', mother: 'Mrs. Archana', dob: '19-05-15', address: 'Ayodhya Puri', phone: '9415860918', aadhar: '239621216473' },
  { name: 'Shagun Yadav', father: 'Mr. Ankar Nath', mother: 'Mrs. Usha Yadav', dob: '21-10-14', address: 'Dhanuwasand', phone: '9794008316', aadhar: '765760797634' },
  { name: 'Shagun Gautam', father: 'Mr. Suresh Gautam', mother: 'Mrs. Aarti Gautam', dob: '16-12-13', address: 'Laxman Kheda', phone: '9123357367', aadhar: '214196486262' },
  { name: 'Shagun', father: 'Mr. Sudesh Kumar', mother: 'Mrs. Gudiya', dob: '16-05-15', address: 'Bhondri', phone: '8423147821', aadhar: '71303590058' },
  { name: 'ShreyanShi Sahu', father: 'Mr. Mukesh Kumar', mother: 'Mrs. Pushpa', dob: '24-12-14', address: 'Saraiyan', phone: '9651107779', aadhar: '349168332366' },
  { name: 'Shrishti Yadav', father: 'Mr. Brajmad', mother: 'Mrs. Rekha', dob: '27-10-15', address: 'Saraiyan', phone: '8053381348', aadhar: '525561143388' },
  { name: 'Sukaina', father: 'Mr. Sufiyan', mother: 'Azra', dob: '09-08-12', address: 'Bhadesuwa', phone: '9621769126', aadhar: '858348122006' },
  { name: 'Siddharth Singh', father: 'Mr. Gajendra Singh', mother: 'Mrs. Sita Yadav', dob: '07-12-15', address: 'Mansab Kheda', phone: '9556114206', aadhar: '422876168422' },
  { name: 'Suryansh', father: 'Mr. Shyam Narut', mother: 'Mrs. Poonam Yad', dob: '05-01-15', address: 'Saraiyana', phone: '8053400430', aadhar: '458039915705' },
  { name: 'Shubhit', father: 'Mr. Ram Kr. Yadav', mother: 'Mrs. Sunita Yadav', dob: '22-10-15', address: 'Pinwat', phone: '9935359360', aadhar: '344738117834' },
  { name: 'Trisha', father: 'Mr. Bradeep Kumar', mother: 'Mrs. Saroj Kumari', dob: '08-03-15', address: 'Makhdoompur Kaithi', phone: '8293663261', aadhar: '433575234946' },
  { name: 'Vinay', father: 'Mr. Awadh Ram', mother: 'Mrs. Shanti Devi', dob: '15-01-15', address: 'Saraiyana', phone: '9161524406', aadhar: '980577209001' },
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
