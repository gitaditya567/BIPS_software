import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcrypt';
const prisma = new PrismaClient();

const CLASS_ID = "69c12ea74529bf8f03c11b60"; // Class 10
const SECTION_ID = "69c12ea74529bf8f03c11b61"; // Section A

const studentsData = [
    { sNo: 1, name: "ADARSH YADAV", father: "ANIRUDH KUMAR", mother: "MANSUBHA", dob: "25/08/2011", address: "Kuwar kheda", phone: "9936772835", aadhaar: "926718689285" },
    { sNo: 2, name: "ASHWIN", father: "SANTOSH KUMAR", mother: "MITHLESH KUMARI", dob: "10/10/2010", address: "Raghunath kheda", phone: "8127307086", aadhaar: "410858104643" },
    { sNo: 3, name: "ARYAN", father: "RAMAKANT", mother: "SHANTOSH KUMARI", dob: "10/09/2009", address: "Majhigawa", phone: "9621052170", aadhaar: "362524314373" },
    { sNo: 4, name: "NITIN YADAV", father: "MITHLESH KUMAR", mother: "SUNITA", dob: "14/12/2011", address: "Kuwar kheda", phone: "9936866879", aadhaar: "873903462037" },
    { sNo: 5, name: "SHUBHI", father: "RADHE SHYAM", mother: "GEETA", dob: "07/05/2010", address: "Majhigawa", phone: "9369884797", aadhaar: "730995176290" },
    { sNo: 6, name: "AYUSHI GUPTA", father: "DEEPAK KUMAR", mother: "LAXMI GUPTA", dob: "03/06/2010", address: "Sisendi", phone: "9935244057", aadhaar: "359608711987" },
    { sNo: 7, name: "DIVYANSH GAUTAM", father: "NEERAJ KUMAR GAUTAM", mother: "MITHILESH KUMARI", dob: "07/12/2012", address: "Sisendi", phone: "7518275806", aadhaar: "726897860137" },
    { sNo: 8, name: "AYUSH KUMAR", father: "UMESH KUMAR", mother: "UMA DEVI", dob: "22/12/2011", address: "Kaithi", phone: "6307338248", aadhaar: "454334979253" },
    { sNo: 9, name: "KOMAL YADAV", father: "INDRA KUMAR YADAV", mother: "JAISHREE", dob: "18/11/2009", address: "Raghunath kheda", phone: "9936000710", aadhaar: "741848652125" },
    { sNo: 10, name: "SUSHANT RAJPOOT", father: "SHYAMU", mother: "GYANWATI", dob: "05/03/2011", address: "Amliha kheda", phone: "7887231256", aadhaar: "548772696273" },
    { sNo: 11, name: "SUNNY KUMAR", father: "VISHAL KUMAR", mother: "RENU DEVI", dob: "21/08/2011", address: "Bijnaur", phone: "8840143335", aadhaar: "610010104497" },
    { sNo: 12, name: "LUCKY", father: "SUNIL KUMAR", mother: "REKHA", dob: "20/08/2011", address: "Majhigawa", phone: "8090056385", aadhaar: "613192079120" },
    { sNo: 13, name: "ABHISHEK RAJPOOT", father: "JAGDISH PRASHAD", mother: "SHIV KUMARI", dob: "17/08/2012", address: "Bhagu kheda", phone: "9936053430", aadhaar: "633510671668" },
    { sNo: 14, name: "DILER SINGH", father: "BALJINDER SINGH", mother: "JASBEER KAUR", dob: "16/10/2010", address: "Kaithi", phone: "9935640426", aadhaar: "771147669951" },
    { sNo: 15, name: "GAURAV YADAV", father: "ARVIND KUMAR", mother: "SUMAN YADAV", dob: "10/02/2011", address: "Mahesh Kheda", phone: "9935209044", aadhaar: "200898796476" },
    { sNo: 16, name: "RUDRA KUMAR YADAV", father: "NANDLAL YADAV", mother: "SUDAMA DEVI", dob: "01/01/2009", address: "Belahiya kheda", phone: "9956667698", aadhaar: "345876853203" },
    { sNo: 17, name: "DIVYANSHU YADAV", father: "RAM LAKHAN", mother: "PREMLATA", dob: "17/05/2011", address: "Kasim kheda", phone: "6388480058", aadhaar: "314768885302" },
    { sNo: 18, name: "MANVI", father: "JEET BAHADUR", mother: "ROSHNI", dob: "10/05/2011", address: "Kaithi", phone: "7985491001", aadhaar: "790488548978" },
    { sNo: 19, name: "SHRISHTI YADAV", father: "ARJUN YADAV", mother: "RENU", dob: "03/03/2011", address: "Meeranpur", phone: "9198000265", aadhaar: "203044928822" },
    { sNo: 20, name: "SHRADDHA YADAV", father: "SOHAN LAL", mother: "REEMA DEVI", dob: "10/10/2010", address: "Meeranpur", phone: "8009740349", aadhaar: "688890327391" },
    { sNo: 21, name: "UJJWAL SINGH", father: "LAJPATI SINGH", mother: "SAVITA SINGH", dob: "04/10/2010", address: "Sohawa", phone: "9918978337", aadhaar: "931717253778" },
    { sNo: 22, name: "SAUMYA RAJPUT", father: "MANOJ KUMAR", mother: "SANGEETA", dob: "20/07/2011", address: "Ahmad kheda", phone: "9026497353", aadhaar: "996125567903" },
    { sNo: 23, name: "ANSHIKA", father: "RAMA SHANKAR", mother: "ANITA MISHRA", dob: "01/01/2011", address: "Ahmad kheda", phone: "9005471046", aadhaar: "888179486801" },
    { sNo: 24, name: "ANSH YADAV", father: "KAMAL KISHOR YADAV", mother: "GUDIYA YADAV", dob: "14/08/2012", address: "Kasim kheda", phone: "8423776165", aadhaar: "405069604729" },
    { sNo: 25, name: "RISHABH", father: "PRADEEP KUMAR", mother: "SAROJ KUMARI", dob: "16/01/2011", address: "Kaithi", phone: "8299663261", aadhaar: "744697134496" },
    { sNo: 26, name: "LAKSHYA SINGH", father: "PRADEEP SINGH", mother: "SAVITA SINGH", dob: "01/01/2010", address: "Raipur", phone: "8840284232", aadhaar: "374170070975" },
    { sNo: 27, name: "PIYUSH YADAV", father: "SUNIL YADAV", mother: "SUNITA YADAV", dob: "05/07/2010", address: "Kaithi", phone: "8787000979", aadhaar: "782360815076" },
    { sNo: 28, name: "PRIYANSHI YADAV", father: "UMESH CHANDRA", mother: "POONAM", dob: "10/11/2010", address: "Mansab kheda", phone: "8318960977", aadhaar: "782230263863" },
    { sNo: 29, name: "AASTHA YADAV", father: "SARVESH KUMAR", mother: "ANSHU YADAV", dob: "09/03/2011", address: "Kasim kheda", phone: "6392888819", aadhaar: "905164806952" },
    { sNo: 30, name: "ANANSHA SHARMA", father: "ROSHAN KUMAR SHARMA", mother: "VEENA SHARMA", dob: "14/08/2010", address: "Bhadesuwa", phone: "9793573501", aadhaar: "416986979497" },
    { sNo: 31, name: "MAHI", father: "VISHUN KUMAR", mother: "POONAM YADAV", dob: "31/01/2010", address: "Jalim kheda", phone: "7526043902", aadhaar: "497503138179" },
    { sNo: 32, name: "MAHENOOR SADAF", father: "FAHEEM", mother: "SABEEN", dob: "18/03/2011", address: "Bijnaur", phone: "9696161785", aadhaar: "239073245487" },
    { sNo: 33, name: "ASHNA", father: "RAJENDRA PRASAD", mother: "ROLI", dob: "13/06/2010", address: "Saraiyan", phone: "7985821232", aadhaar: "225973543844" },
    { sNo: 34, name: "RAUNAK YADAV", father: "RAJ KUMAR", mother: "BITTI YADAV", dob: "08/07/2010", address: "Kasim kheda", phone: "7607611241", aadhaar: "436887255745" },
    { sNo: 35, name: "PRIYANSHU", father: "CHANDRA SHEKHAR", mother: "PHOOLAN DEVI", dob: "04/01/2011", address: "Marui", phone: "8400594309", aadhaar: "325115262835" },
    { sNo: 36, name: "PRIYANJALI", father: "GANGA SAGAR", mother: "SEEMA DEVI", dob: "10/06/2011", address: "Raheem nagar", phone: "8736933001", aadhaar: "310384258883" },
    { sNo: 37, name: "KEERTI PRAJAPATI", father: "SANJEET KUMAR", mother: "RADHA", dob: "14/09/2011", address: "Bhagu kheda", phone: "9793453266", aadhaar: "795328004529" },
    { sNo: 38, name: "SAKSHAM", father: "SHAILENDRA KUMAR", mother: "SHARMA DEVI", dob: "20/06/2011", address: "Saraiyan", phone: "9198307452", aadhaar: "322440088961" },
    { sNo: 39, name: "RAHUL YADAV", father: "VIRENDRA KUMAR", mother: "GANGOTRI", dob: "25/07/2011", address: "Dhanuwasand", phone: "8400972723", aadhaar: "717398320112" },
    { sNo: 40, name: "AMAN VERMA", father: "KRISHNA CHANDRA", mother: "ANITA VERMA", dob: "14/05/2012", address: "Tikra sani", phone: "9559628498", aadhaar: "961854628122" }
];

async function main() {
    const password = await bcrypt.hash('123456', 10);
    const year = new Date().getFullYear();

    for (let i = 0; i < studentsData.length; i++) {
        const s = studentsData[i];
        try {
            const admissionNo = `SR-10-${Date.now()}-${i}`;
            const email = (s.name.replace(/\s+/g, '').toLowerCase() + (i + 300) + "@BIPS.com");
            
            // Latest student to determine STU ID
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
                            dateOfBirth: s.dob || "2011-01-01",
                            aadhaarNumber: s.aadhaar,
                            fatherName: s.father,
                            fatherMobile: s.phone,
                            motherName: s.mother,
                            admissionDate: new Date()
                        }
                    }
                }
            });
            process.stdout.write(`Admitted: ${s.name}\n`);
        } catch (err) {
            console.error(`Failed to admit ${s.name}:`, err);
        }
    }
    await prisma.$disconnect();
}

main();
