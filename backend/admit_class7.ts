import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcrypt';
const prisma = new PrismaClient();

const CLASS_ID = "69c12ea64529bf8f03c11b57"; // Class 7
const SECTION_ID = "69c12ea64529bf8f03c11b58"; // Section A

const studentsData = [
    { name: "Aditya Sharma", father: "Mr. Harimohan", mother: "Mrs. Anamika", dob: "17/10/13", address: "Bhoundri, Sisendi", phone: "9559885115", aadhaar: "488047251577" },
    { name: "Aditya Yadav", father: "Mr. Chandra Sekhar", mother: "Mrs. Nilam", dob: "12/01/2016", address: "Triloppur", phone: "", aadhaar: "" },
    { name: "Alina", father: "Mohd. Arshad Khan", mother: "Mrs. Soni", dob: "20/06/15", address: "Chandrawal Budhara", phone: "7318219294", aadhaar: "" },
    { name: "Ananya", father: "Mr. Jitendra", mother: "Mrs. Sangeeta Devi", dob: "24/05/13", address: "Sohara, Jaithi Kheda Mohanlal ganj.", phone: "8115156771", aadhaar: "392247572694" },
    { name: "Anika", father: "Mr. Narendra", mother: "Mrs. Archana", dob: "06/12/15", address: "Marui", phone: "9555887926", aadhaar: "86197205850" },
    { name: "Aniket", father: "Mr. Ashish", mother: "Mrs. Asha", dob: "21/01/14", address: "Makhdumpur Kaithi, Jaithikheda", phone: "6392762800", aadhaar: "465564073864" },
    { name: "Ansh", father: "Mr. Neeraj", mother: "Mrs. Savita", dob: "24/04/12", address: "Maitihgawa, Chandra-rawal", phone: "6387121736", aadhaar: "315536074232" },
    { name: "Anshul", father: "Mr. Rupesh", mother: "Mrs. Nilam", dob: "29/10/14", address: "Chandrawal, Budhara", phone: "7897067968", aadhaar: "482611431730" },
    { name: "Arohi", father: "Mr. Sugreev", mother: "Mrs. Saroj Devi", dob: "27/03/13", address: "Nathkur, Bijnour", phone: "8506836200", aadhaar: "578413073714" },
    { name: "Arpit", father: "Mr. Gyanendra", mother: "Mrs. Anju", dob: "24/01/14", address: "Raipur, Bhadesua Mohanlalganj", phone: "9140209757", aadhaar: "384496244505" },
    { name: "Divyansh", father: "Mr. Pradeep Kumar", mother: "Mrs. Ruchi Yadav", dob: "26/09/13", address: "Makhdumpur Kaithi Jaithikheda", phone: "9935991732", aadhaar: "715649276146" },
    { name: "Ekashi", father: "Mr. Vinay Kumar", mother: "Mrs. Reema Devi", dob: "31/03/15", address: "Balsingh Kheda, Mohanlalganj", phone: "8081292958", aadhaar: "553615708644" },
    { name: "Harshit", father: "Mr. Harish Chandra", mother: "Mrs. Monika Devi", dob: "04/09/14", address: "Dhanuwasand", phone: "9794498307", aadhaar: "933800493388" },
    { name: "Ishita", father: "Mr. Pawan", mother: "Mrs. Bindu", dob: "15/10/15", address: "Kaithi, Makhdumpur Jaithikheda", phone: "9889992239", aadhaar: "827923964760" },
    { name: "Kapil", father: "Mr. Pawan Sharma", mother: "Mrs. Nisha Sharma", dob: "11/06/14", address: "Bhadeshuwa, Mohanlalganj", phone: "9005370849", aadhaar: "781064362247" },
    { name: "Kaushik", father: "Mr. Sujeet Singh", mother: "Mrs. Arti Singh", dob: "06/04/15", address: "Dhanuwasand", phone: "7054724713", aadhaar: "701033779850" },
    { name: "Kavya", father: "Mr. Pradeep", mother: "Mrs. Kamini", dob: "12/09/15", address: "Bhadesua, Mohanlalganj", phone: "8081819874", aadhaar: "619466009772" },
    { name: "Mahi", father: "Mr. Dilip Kumar", mother: "Mrs. Preeti", dob: "10/05/14", address: "Jaithi Kheda, Mohanlalganj", phone: "7355651420", aadhaar: "579483352421" },
    { name: "Mayank", father: "Mr. Rajesh", mother: "Mrs. Sudhana", dob: "10/09/15", address: "Kasim Kheda, Chandrawal Bijnour", phone: "8127521646", aadhaar: "957640812358" },
    { name: "MD. Arshlan", father: "Mohd. Iktar", mother: "Mrs. Ashma", dob: "02/10/15", address: "Nathur Chandrawal", phone: "9044820090", aadhaar: "546478861269" },
    { name: "Naina", father: "Mr. Jasveer Singh", mother: "Mrs. Sarala", dob: "31/12/13", address: "Bhavan Kheda, Jaithi-Kheda, Mohanlalganj", phone: "9005339879", aadhaar: "385774971893" },
    { name: "Piyush", father: "Mr. Rajkumar", mother: "Mrs. Katpi", dob: "25/12/14", address: "Nanki Kheda, Banthara", phone: "9125883466", aadhaar: "974475197596" },
    { name: "Prateek", father: "Mr. Rakesh Raunt", mother: "Mrs. Shanti", dob: "10/05/14", address: "Tikra, Phulampur Mohanlalganj", phone: "7800329275", aadhaar: "308966125039" },
    { name: "Preeti", father: "Mr. Anodh", mother: "Mrs. Savita", dob: "04/02/15", address: "Balsingh Kheda, Chandrawal Bijnour", phone: "9695518653", aadhaar: "" },
    { name: "Raj", father: "Mr. Ram Sajeevan", mother: "Mrs. Babli", dob: "19/11/14", address: "Bheunderi", phone: "9936053554", aadhaar: "629022598407" },
    { name: "Raman", father: "Mr. Surjan", mother: "Mrs. Suman Singh", dob: "08/12/13", address: "Bhagukheda, Jaithikheda, Mohanlalganj", phone: "9956507023", aadhaar: "529562701027" },
    { name: "Riya - I", father: "Mr. Rajkishore", mother: "Mrs. Gayatri", dob: "04/03/14", address: "Sohara, Jaithikheda Mohanlalganj", phone: "8400663535", aadhaar: "360712217043" },
    { name: "Riya - II", father: "Mr. Jitendra Kumar", mother: "Mrs. Kiran Kumari", dob: "31/10/14", address: "Saraiyan Chandrawal Lucknow", phone: "6306903284", aadhaar: "524670330672" },
    { name: "Shagun Gupta", father: "Mr. Sandeep Gupta", mother: "Upasna Gupta", dob: "15/02/16", address: "Bhadesua, Phulampur, Mohanlalganj", phone: "8787016061", aadhaar: "855261065990" },
    { name: "Shagun Prajapati", father: "Mr. Somkumar", mother: "Asha Devi", dob: "30/05/13", address: "Majhguwan, Chandrawal, LKO", phone: "7607365905", aadhaar: "731914574554" },
    { name: "Shagun Rawat", father: "Mr. Rampal", mother: "Sangeeta", dob: "2013-06-01", address: "Tikra Bhilampur, Banthara, LKO", phone: "9621203844", aadhaar: "948082347572" },
    { name: "Shivam", father: "Mr. Vishal", mother: "Renu Devi", dob: "08/01/16", address: "BIPS - School", phone: "6393277714", aadhaar: "382533068025" },
    { name: "Shivank", father: "Mr. Shrikant", mother: "Amresh Kumari", dob: "07/02/13", address: "Shakarkheda", phone: "8400253105", aadhaar: "405602252760" },
    { name: "Sneha", father: "Mr. Ram milan", mother: "Komal", dob: "02/04/14", address: "Bhaundri, Sisendi, Mohanlalganj", phone: "7380636840", aadhaar: "339219196364" },
    { name: "Sonalika", father: "Mr. Suresh Kumar", mother: "Mrs. Suneeta", dob: "2014-06-01", address: "Tikra, Bhilampur, Banthara", phone: "9621207054", aadhaar: "721527016460" },
    { name: "Tarun", father: "Mr. Anjani Kumar", mother: "Preeti", dob: "23/12/14", address: "Makhdumpur Kaithi, Jaithi Kheda, Mohanlalganj", phone: "7985182234", aadhaar: "777333794144" },
    { name: "Vedansh", father: "Mr. Santosh Kumar", mother: "Renu Sahu", dob: "30/10/12", address: "Raipur, Bhadesua, Mohanlalganj", phone: "9551635829", aadhaar: "875090291929" },
    { name: "Laxmi", father: "Mr. Pawan Gupta", mother: "Gunja Gupta", dob: "15/10/13", address: "Kurani Banthara LKO", phone: "7076534989", aadhaar: "55184701978" },
    { name: "Deepanshi", father: "Mr. Shivprasad", mother: "Nirmala", dob: "05/07/14", address: "Sohara, Mohanlalganj, LKO", phone: "9151185096", aadhaar: "91066385128" },
    { name: "Arshita", father: "Mr. Kuldeep", mother: "Seema", dob: "23/02/15", address: "Ranikheda, Sisendi, Mohanlalganj, LKO", phone: "8127209246", aadhaar: "4172555012" },
    { name: "Rimjhim", father: "Mr. Pratap Singh", mother: "Santosh Kumari", dob: "09/Aug/15", address: "Makhdumpur Kaithi", phone: "8957460051", aadhaar: "" }
];

async function main() {
    const password = await bcrypt.hash('123456', 10);
    const year = new Date().getFullYear();

    for (let i = 0; i < studentsData.length; i++) {
        const s = studentsData[i];
        try {
            const admissionNo = `SR-7-${Date.now()}-${i}`;
            const email = (s.name.replace(/\s+/g, '').toLowerCase() + i + "@BIPS.com");
            
            const latest = await prisma.studentProfile.findFirst({
                where: { studentId: { startsWith: `STU-${year}` } },
                orderBy: { studentId: 'desc' }
            });
            let nextCount = 1;
            if (latest && latest.studentId) {
                const parts = latest.studentId.split('-');
                if (parts[2]) nextCount = parseInt(parts[2]) + 1;
            }
            const studentId = `STU-${year}-${String(nextCount).padStart(4, '0')}`;

            await prisma.user.create({
                data: {
                    email,
                    password,
                    name: s.name,
                    phone: s.phone || "0000000000",
                    role: Role.STUDENT,
                    address: s.address,
                    studentProfile: {
                        create: {
                            admissionNo,
                            studentId,
                            classId: CLASS_ID,
                            sectionId: SECTION_ID,
                            dateOfBirth: s.dob || "2014-01-01",
                            aadhaarNumber: s.aadhaar,
                            fatherName: s.father,
                            fatherMobile: s.phone,
                            motherName: s.mother,
                            admissionDate: new Date()
                        }
                    }
                }
            });
            console.log(`Admitted: ${s.name} (STU ID: ${studentId})`);
        } catch (err) {
            console.error(`Failed to admit ${s.name}:`, err);
        }
    }
    await prisma.$disconnect();
}

main();
