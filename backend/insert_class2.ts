import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const students = [
  { name: 'Aarush', father: 'Mr. Pappu Yadav', mother: 'Mrs. Jyoti', dob: '8/5/2018', address: 'Nanki Kheda', phone: '7518917902', aadhar: '516612556900' },
  { name: 'Aarush Yadav', father: 'Mr. Rakesh', mother: 'Mrs. Rashmi Yadav', dob: '25/10/18', address: 'Kasimkheda', phone: '7985762852', aadhar: '' },
  { name: 'Abhinav Sahu', father: 'Mr. Rahul Kumar', mother: 'Mrs. Sandhya Sahu', dob: '30/3/2019', address: 'Marui', phone: '9956472944', aadhar: '257904406937' },
  { name: 'Abhinav', father: 'Mr. Jay Singh', mother: 'Mrs. Pritee Yadav', dob: '19/6/20', address: 'Dhanwasa', phone: '7753861195', aadhar: '' },
  { name: 'Abhirao', father: 'Mr. Amit Kumar', mother: 'Mrs. Vijay Laxmi', dob: '8/4/2018', address: 'Bhagukheda', phone: '7827168731', aadhar: '589399792073' },
  { name: 'Abhipal', father: 'Mr. Avdhesh Pal', mother: 'Mrs. Aarti Pal', dob: '24/9/2018', address: 'Tikra', phone: '8423821661', aadhar: '' },
  { name: 'Adarsh', father: 'Mr. Dharmendra Kumar', mother: 'Mrs. Rubi', dob: '23/10/18', address: 'Dhanwasa', phone: '8127936342', aadhar: '238443980289' },
  { name: 'Advik Srivastava', father: 'Mr. Himanshu Srivastava', mother: 'Mrs. Preya Srivastava', dob: '16/5/2018', address: 'Badale Kheda', phone: '8005196713', aadhar: '203265113746' },
  { name: 'Ansh Yadav', father: 'Mr. Arvind', mother: 'Mrs. Archana', dob: '15/3/2008', address: 'Bhadarsa', phone: '8174014251', aadhar: '781214026200' },
  { name: 'Ananya Singh', father: 'Mr. Amit Kumar', mother: 'Mrs. Kusum Verma', dob: '22/4/2019', address: 'Kamlapur', phone: '8181812151', aadhar: '692612032162' },
  { name: 'Annu Gautam', father: 'Mr. Rajkumar', mother: 'Mrs. Manisha Gautam', dob: '23/2/19', address: 'Laxman Kheda', phone: '9956319601', aadhar: '690047097573' },
  { name: 'Anmol Yadav', father: 'Mr. Omkar Nath', mother: 'Mrs. Usha Devi', dob: '7/6/2017', address: 'Dhanwasa', phone: '9794008316', aadhar: '' },
  { name: 'Anika Yadav', father: 'Mr. Lallan Yadav', mother: 'Mrs. Savita', dob: '20/7/2020', address: 'Dhanwasa', phone: '9188997093', aadhar: '' },
  { name: 'Ayaan', father: 'Mr. Nadeem', mother: 'Mrs. Reshma Bano', dob: '10/2/2019', address: 'Laxman Kheda', phone: '9624902286', aadhar: '340349304079' },
  { name: 'Ayush', father: 'Mr. Rakesh Kumar', mother: 'Mrs. Seema', dob: '6/2/2017', address: 'Tikra', phone: '9936477485', aadhar: '849533303170' },
  { name: 'Kartik Gupta', father: 'Mr. Kuldeep Kumar', mother: 'Mrs. Preeti Gupta', dob: '12/4/19', address: 'Bhadraswa', phone: '6386533512', aadhar: '' },
  { name: 'Kavya Singh', father: 'Mr. Pravesh Singh', mother: 'Mrs. Rupali Singh', dob: '12/8/17', address: 'Jaitikheda', phone: '9118003127', aadhar: '' },
  { name: 'Nikhil', father: 'Mr. Vimal Kumar', mother: 'Mrs. Mamta', dob: '27/3/20', address: 'Kaithi', phone: '7905742290', aadhar: '59325201306' },
  { name: 'Nirbhay Yadav', father: 'Mr. Vijendra Kumar', mother: 'Mrs. Poonam Devi', dob: '8/1/2018', address: 'Atalapur', phone: '9129568212', aadhar: '307805250924' },
  { name: 'Pragya', father: 'Mr. Binda Prasad', mother: 'Mrs. Malti', dob: '16/1/2020', address: 'Rahman Nagar', phone: '995672135', aadhar: '480456340888' },
  { name: 'Pratyush', father: 'Mr. Praveen Kumar', mother: 'Mrs. Swagati Devi', dob: '6/3/2019', address: 'Shekpur Majhig', phone: '0528061465', aadhar: '245670446987' },
  { name: 'Riddhi', father: 'Mr. Lakshmi Narayan', mother: 'Mrs. Reena Verma', dob: '13/10/19', address: 'Almad Kheda', phone: '8090066565', aadhar: '739520622128' },
  { name: 'Ronak Yadav', father: 'Mr. Kuldeep Kumar', mother: 'Mrs. Alpana', dob: '26/10/18', address: 'Saraiya', phone: '8756702425', aadhar: '' },
  { name: 'Sakshi Yadav', father: 'Mr. Jitendra Yadav', mother: 'Mrs. Kiran Singh', dob: '29/12/19', address: 'Marui', phone: '9180462372', aadhar: '950874255322' },
  { name: 'Satyam', father: 'Mr. Sanjay Kumar', mother: 'Mrs. Mamta', dob: '7/5/2017', address: 'Kaithi', phone: '6387024552', aadhar: '510856980566' },
  { name: 'Shouryasingh', father: 'Mr. Sujeet Singh', mother: 'Mrs. Aarti Singh', dob: '8/11/17', address: 'Dhanwasa', phone: '7059724713', aadhar: '625747720043' },
  { name: 'Shivansh Sharma', father: 'Mr. Sunil Kumar', mother: 'Mrs. Ayashi', dob: '26/1/18', address: 'Saraiya', phone: '8303562424', aadhar: '767290225334' },
  { name: 'Shivam Chaureiya', father: 'Mr. Dhanendra Kumar', mother: 'Mrs. Anusuya', dob: '9/9/2014', address: 'Saraiya', phone: '8040416160', aadhar: '' },
  { name: 'Srishti Pal', father: 'Mr. Jamuna Prasad', mother: 'Mrs. Beena Pal', dob: '13/11/18', address: 'Tikra', phone: '6389482971', aadhar: '346396909102' },
  { name: 'Srishti Raj', father: 'Mr. Ashish Kumar', mother: 'Mrs. Rekha Rawat', dob: '9/1/2019', address: 'Raipur', phone: '9936867292', aadhar: '' },
  { name: 'Siddharth Kumar', father: 'Mr. Neeraj Kumar', mother: 'Mrs. Sunita Devi', dob: '3/10/2017', address: 'Chandrawal', phone: '7349831378', aadhar: '770530813679' },
  { name: 'Vansh Yadav', father: 'Mr. Rajveer Yadav', mother: 'Mrs. Puja', dob: '16/5/2018', address: 'Aundi Kheda', phone: '8115948748', aadhar: '' },
  { name: 'Vivah Sahu', father: 'Mr. Alkesh Sahu', mother: 'Mrs. Komal Kumari', dob: '14/12/2019', address: 'Saraiya', phone: '7340487444', aadhar: '755756976737' },
  { name: 'Kenjal Kumari', father: 'Mr. Late Manoj Kumar Gu', mother: 'Mrs. Munni Devi', dob: '3/12/2017', address: 'Bhagukheda', phone: '7250123282', aadhar: '517622080600' },
  { name: 'Yuvraj', father: 'Mr. Ranjeet', mother: 'Mrs. Jyoti', dob: '17/3/2018', address: 'Bhagukheda', phone: '9364052482', aadhar: '77822098793' },
];

const classId = '69c12ea54529bf8f03c11b48'; // Class 2
const sectionId = '69c12ea54529bf8f03c11b49'; // Section A

async function main() {
  const hashedPassword = await bcrypt.hash('123456', 10);
  const year = new Date().getFullYear();

  // Find the max admission number currently in the DB
  const latestAdmissions = await prisma.studentProfile.findMany({
    orderBy: { admissionNo: 'desc' },
  });
  
  let startAdmNoIndex = 1;
  const latestAdmNoStr = latestAdmissions.find(s => s.admissionNo?.startsWith('BIPS/26/'))?.admissionNo;
  if (latestAdmNoStr) {
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
    if (existingUser) {
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
