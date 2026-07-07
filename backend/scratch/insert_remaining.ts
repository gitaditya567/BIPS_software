import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const newStudentsData = [
  { name: 'Anansha Sharma', contact: '9198176871', father: 'Roshan Kumar Sharma', address: 'Bhadesua', class: 'CLASS -10', preBal: 2600 },
  { name: 'Anshika', contact: '9005471046', father: 'Ram Shankar Mishra', address: 'Bhaundari', class: 'CLASS -10', preBal: 2600 },
  { name: 'Astha Pal', contact: '8858744507', father: 'Awdhesh Pal', address: 'Tikra', class: 'CLASS -10', preBal: 500 },
  { name: 'Astha Yadav', contact: '9120022477', father: 'Sarvesh Yadav', address: 'Kasim Kheda', class: 'CLASS -10', preBal: 3600 },
  { name: 'Lakshya Singh', contact: '8840284232', father: 'Pradeep Singh', address: 'Raipur', class: 'CLASS -10', preBal: 2750 },
  { name: 'Manvendra', contact: '9190007588', father: 'Dharmendra', address: 'Ranikheda', class: 'CLASS -10', preBal: 370 },
  { name: 'Nikhil Sahu', contact: '8853446344', father: 'Kuldeep Sahu', address: 'Marui', class: 'CLASS -10', preBal: 2000 },
  { name: 'Priyanjali', contact: '9956772135', father: 'Ganga Sagar', address: 'Raheen Nagar', class: 'CLASS -10', preBal: 10400 },
  { name: 'Priyanshi Yadav', contact: '8318960977', father: 'Umesh Chandra', address: 'Iqbal Kheda', class: 'CLASS -10', preBal: 1600 },
  { name: 'Priyanshu', contact: '8400594309', father: 'Chandra Shekar', address: 'Marui', class: 'CLASS -10', preBal: 2900 },
  { name: 'Raunak Yadav', contact: '7607611241', father: 'Rajkumar Yadav', address: 'Kashimkhera', class: 'CLASS -10', preBal: 200 },
  { name: 'Sayyad Md. Alaham Hamza', contact: '9793259845', father: 'Sayyad Shadab Akhtar', address: 'Bhadesua', class: 'CLASS -10', preBal: 2850 },
  { name: 'Sneha Gupta', contact: '8887819879', father: 'Pradeep Kumar Gupta', address: 'Bhadesua', class: 'CLASS -10', preBal: 1100 },
  { name: 'Sourabh Yadav', contact: '6387440710', father: 'Rajendra Yadav', address: 'Trilokpur', class: 'CLASS -10', preBal: 1250 },
  { name: 'Sunny Kumar', contact: '6323277714', father: 'Vishal Kumar', address: 'Chandrawal', class: 'CLASS -10', preBal: 5400 },
  { name: 'Ujjawal Pal', contact: '8317041265', father: 'Satendra Kumar', address: 'Marui', class: 'CLASS -10', preBal: 5400 },
  { name: 'Nitin', contact: '9936866879', father: 'Mithlesh', address: 'Kunwarkheda', class: 'CLASS -10', preBal: 2750 },
  { name: 'RUDRA KUMAR', contact: '9956667698', father: 'NANDLAL', address: 'BELAHIYAKHEDA', class: 'CLASS -10', preBal: 450 },
  { name: 'KOMAL', contact: '9936000710', father: 'INDRA', address: 'RAGHUNATH', class: 'CLASS -10', preBal: 9900 },
  { name: 'VARUN YADAV', contact: '8173988990', father: 'HARI MOHAN', address: 'BHADESHWA', class: 'CLASS -10', preBal: 900 },
  { name: 'Akriti', contact: '7783962936', father: 'Dinesh Kumar', address: 'Sdrf', class: 'CLASS -11', preBal: 1850 },
  { name: 'Anshika Rawat', contact: '9936644588', father: 'Binda Prasad', address: 'Ayddha Kheda', class: 'CLASS -11', preBal: 3750 },
  { name: 'Anshika Yadav', contact: '9044958506', father: 'Vinod Kumar', address: 'Marui', class: 'CLASS -11', preBal: 150 },
  { name: 'Md. Furkan', contact: '9044820090', father: 'Md. Ikrar', address: 'Natkur', class: 'CLASS -11', preBal: 8350 },
  { name: 'Riya Singh', contact: '7459926861', father: 'Brajbhan Singh', address: 'Dhanuasand', class: 'CLASS -11', preBal: 5300 },
  { name: 'Shalini Rawat', contact: '7390876243', father: 'Ram Kishore', address: 'Manjhigawa', class: 'CLASS -11', preBal: 1400 },
  { name: 'Aarya Shukla', contact: '8707406699', father: 'Mahesh Kumar Shukla', address: 'Sisendi', class: 'CLASS -12', preBal: 2875 },
  { name: 'Adarash Yadav', contact: '9793722029', father: 'Santosh Kumar Yadav', address: 'Memaura', class: 'CLASS -12', preBal: 10125 },
  { name: 'Bhawni', contact: '9198307452', father: 'Shailendra Yadav', address: 'Sariyan', class: 'CLASS -12', preBal: 1025 },
  { name: 'Divyansh Tiwari', contact: '9889171582', father: 'Dilip Tiwari', address: 'Jaithi Kheda', class: 'CLASS -12', preBal: 5 },
  { name: 'Mahima Rawat', contact: '9125581293', father: 'Suneel Kumar', address: 'Tikra', class: 'CLASS -12', preBal: 30 },
  { name: 'Mohammad Uwais', contact: '9451588554', father: 'Azim', address: 'Bhadesua', class: 'CLASS -12', preBal: 750 },
  { name: 'Pihu Sahu', contact: '9936918097', father: 'Anil Kumar', address: 'Raipur', class: 'CLASS -12', preBal: 25 },
  { name: 'Prachi Chaursiya', contact: '9793609546', father: 'Mata Prasad', address: 'Raipur', class: 'CLASS -12', preBal: 75 },
  { name: 'Prince Rawat', contact: '7460819723', father: 'Rakesh Kumar Rawat', address: 'Tikra', class: 'CLASS -12', preBal: 2920 },
  { name: 'Rimjhim Yadav', contact: '7905000984', father: 'Kamlesh Kumar', address: 'Nurdi Kheda', class: 'CLASS -12', preBal: 75 },
  { name: 'Tanshiq Dhiman', contact: '9793112230', father: 'Rajesh Kumar Dhiman', address: 'Tikra', class: 'CLASS -12', preBal: 38780 },
  { name: 'MAHI', contact: '9559386721', father: 'SUNEEL', address: 'Dhanuasand', class: 'CLASS -12', preBal: 6625 },
  { name: 'AKANKSHA', contact: '9936000710', father: 'INDRA', address: 'RAGHUNATH KHEDA', class: 'CLASS -12', preBal: 625 }
];

async function insertStudents() {
  const classes = await prisma.class.findMany();
  const classMap = new Map();
  for (const c of classes) {
    classMap.set(c.name.trim().toLowerCase(), c.id);
  }
  
  let inserted = 0;
  let updated = 0;

  for (const sd of newStudentsData) {
    let className = sd.class;
    
    // Normalize class name to match what we have in DB
    if (className === 'CLASS -10') className = 'Class 10';
    if (className === 'CLASS -11') className = 'Class 11';
    if (className === 'CLASS -12') className = 'Class 12';
    // If not found in map, maybe try matching parts
    
    let classId = null;
    const lowerClass = className.toLowerCase();
    
    // Manual mapping for Class 11 and 12 since they have streams
    if (lowerClass.includes('class 11') || lowerClass.includes('class -11')) {
      classId = classMap.get('class 11 (maths)') || classMap.get('class 11') || null;
    } else if (lowerClass.includes('class 12') || lowerClass.includes('class -12')) {
      classId = classMap.get('class 12 (maths)') || classMap.get('class 12') || null;
    } else {
      for (const [key, id] of classMap.entries()) {
        if (key.includes(lowerClass) || lowerClass.includes(key)) {
          classId = id;
          break;
        }
      }
    }
    
    if (!classId) {
       console.log(`Could not map class ${sd.class} for ${sd.name}. Defaulting to first class.`);
       classId = classes[0].id;
    }

    // Try to find the student first
    let dbStudent = await prisma.studentProfile.findFirst({
      where: {
        user: { name: { equals: sd.name, mode: 'insensitive' } },
        fatherName: { equals: sd.father, mode: 'insensitive' }
      },
      include: { user: true }
    });

    if (dbStudent) {
       // Update
       await prisma.studentProfile.update({
         where: { id: dbStudent.id },
         data: {
           previousSessionDue: sd.preBal
         }
       });
       await prisma.user.update({
         where: { id: dbStudent.userId },
         data: {
           address: dbStudent.user.address || sd.address,
           phone: dbStudent.user.phone || sd.contact
         }
       });
       updated++;
    } else {
      // Create user and student
      const user = await prisma.user.create({
        data: {
          email: `${sd.name.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()}${Math.floor(Math.random() * 1000)}@bips.com`,
          password: 'password123',
          role: 'STUDENT',
          name: sd.name,
          phone: sd.contact,
          address: sd.address,
        }
      });
      
      const admissionNo = `BIPS/26/PRE_${Math.floor(Math.random() * 10000)}`;
      const studentId = `STU${Math.floor(Math.random() * 1000000)}`;

      await prisma.studentProfile.create({
        data: {
          userId: user.id,
          admissionNo: admissionNo,
          studentId: studentId,
          fatherName: sd.father,
          classId: classId,
          previousSessionDue: sd.preBal,
        }
      });
      inserted++;
    }
  }

  console.log(`Updated ${updated} students, Inserted ${inserted} students.`);
}

insertStudents()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
