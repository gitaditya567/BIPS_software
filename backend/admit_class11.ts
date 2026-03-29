import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcrypt';
const prisma = new PrismaClient();

const CLASS_ID = "69c12ea74529bf8f03c11b63"; // Class 11 (Bio)
const SECTION_ID = "69c12ea84529bf8f03c11b64"; // Section A

const studentsData = [
    { sNo: 1, name: "ADARSH", father: "ARUN YADAV", mother: "SUSHAMA DEVI", dob: "01-01-2011", address: "RANIKHERA", phone: "8115141333", aadhaar: "288183171606" },
    { sNo: 2, name: "RIZWAN", father: "ABDUL RAHEEM", mother: "SHAHNAJ BANO", dob: "13-02-2012", address: "MAJHIGAWAN", phone: "6386998284", aadhaar: "236311026835" },
    { sNo: 3, name: "AMAN YADAV", father: "Dharmendra kumar", mother: "ANUPAM YADAV", dob: "27-09-2013", address: "BALSINGHKHERA", phone: "7783962936", aadhaar: "455405469336" },
    { sNo: 4, name: "SHAGUN", father: "LALJI", mother: "MEERA", dob: "21-01-2010", address: "HIMMAT KHERA", phone: "9219827439", aadhaar: "323282300205" },
    { sNo: 5, name: "SYED ARMAN ALI QADRI", father: "SYED ALI RAJA QADRI", mother: "AFREEN ALI", dob: "18-12-2008", address: "BHADESUWA", phone: "8687891230", aadhaar: "797388238254" },
    { sNo: 6, name: "SAUMYA YADAV", father: "RAJESH KUMAR", mother: "SADDHANA DEVI", dob: "16-08-2012", address: "KASIM KHERA,", phone: "8853959643", aadhaar: "557689095872" },
    { sNo: 7, name: "PARUL", father: "BINDRA PRASAD", mother: "KALPANA", dob: "01-01-2009", address: "TIKRASANI,", phone: "9936577806", aadhaar: "977204340502" },
    { sNo: 8, name: "VANSHIKA SAHU", father: "PREM CHANDRA SAHU", mother: "KANTI SAHU", dob: "06-09-2008", address: "MAJHIGAWA,", phone: "7992048540", aadhaar: "496368521884" },
    { sNo: 9, name: "PRIYANSHU YADAV", father: "AJAY KUMAR", mother: "KIRAN YADAV", dob: "01-01-2010", address: "PINWAT,", phone: "8400152615", aadhaar: "545025571976" },
    { sNo: 10, name: "ANSH SHARMA", father: "AJAY SHANKAR", mother: "ANUJ KUMARI", dob: "06-12-2010", address: "KODRA,", phone: "9839153144", aadhaar: "618549873172" },
    { sNo: 11, name: "DIVYANSHU VERMA", father: "DURVESH KUMAR VERMA", mother: "PRIYANKA DEVI", dob: "20-12-2008", address: "CHANDRAWAL,", phone: "8953891135", aadhaar: "708229370253" },
    { sNo: 12, name: "VANSH YADAV", father: "DINESH KUMAR", mother: "RINKI", dob: "06-12-2009", address: "SARAIYA,", phone: "9335953002", aadhaar: "606957335639" },
    { sNo: 13, name: "HIMANSHU YADAV", father: "HARISHCHANDRA", mother: "MONIKA YADAV", dob: "02-02-2010", address: "DHANUWASAD,", phone: "9794498307", aadhaar: "442756657310" },
    { sNo: 14, name: "MOHD FURKAN", father: "MOHD IKRAR", mother: "ASSIMA BANO", dob: "12-10-2011", address: "NATKUR,", phone: "9044820090", aadhaar: "203767986225" },
    { sNo: 15, name: "SANSKAR YADAV", father: "DHARAMVEER", mother: "RACHANA DEVI", dob: "16-03-2009", address: "KASHIM KHERA", phone: "6307962407", aadhaar: "725025133088" },
    { sNo: 16, name: "MAMTA KUMARI", father: "SHIV NARAYAN", mother: "RAJJO", dob: "08-04-2010", address: "AMLIHA KHERA", phone: "8953954470", aadhaar: "621955783544" },
    { sNo: 17, name: "AYUSH NIRMAL", father: "ASHOK KUMAR", mother: "ASHA DEVI", dob: "13-06-2011", address: "JABRELA,", phone: "9005065983", aadhaar: "450606277833" },
    { sNo: 18, name: "MARIYAM ZEHRA", father: "ABDUL HAMEED", mother: "TABASSUM BANO", dob: "16-10-2010", address: "BHAGUKHERA,", phone: "9936331347", aadhaar: "374346397307" },
    { sNo: 19, name: "SAKSHAM YADAV", father: "RAJBEER YADAV", mother: "SUMAN YADAV", dob: "24-03-2009", address: "LALUMAR,", phone: "9794960277", aadhaar: "711641160257" },
    { sNo: 20, name: "ADARSH YADAV", father: "RAJNEESH KUMAR", mother: "SANGEETA YADAV", dob: "17-04-2010", address: "MARUI,", phone: "9793957139", aadhaar: "868177811284" },
    { sNo: 21, name: "NIKITA MISHRA", father: "AJAY KUMAR", mother: "SEEMA MISHRA", dob: "27-04-2009", address: "NEEWA,", phone: "9793392210", aadhaar: "780519889769" },
    { sNo: 22, name: "ANMOL SAHU", father: "SHARAD KUMAR", mother: "MANJU", dob: "29-10-2011", address: "AMLIHA KHERA,", phone: "8858320558", aadhaar: "546485830004" },
    { sNo: 23, name: "RISHI CHAURASIA", father: "SURESH CHAURASIA", mother: "ANITA CHAURASIA", dob: "10-01-2012", address: "RAIPUR,", phone: "9621244527", aadhaar: "604758726961" },
    { sNo: 24, name: "RIYA SINGH", father: "BRAJBHAN SINGH", mother: "PRATIMA SINGH", dob: "28-12-2009", address: "DHANUWASAND,.", phone: "7459926861", aadhaar: "255043065114" },
    { sNo: 25, name: "ABHAY SINGH", father: "RANJEET SINGH", mother: "SONI SINGH", dob: "15-01-2013", address: "JABRELA,", phone: "7355760515", aadhaar: "202071987564" },
    { sNo: 26, name: "ANMOL MAURYA", father: "DIVAKAR NATH", mother: "FOOL MATI", dob: "22-06-2011", address: "DHANUWASAND,", phone: "8429626927", aadhaar: "302031248260" },
    { sNo: 27, name: "AKRITI", father: "DINESH", mother: "GEETA", dob: "26-08-2011", address: "S.D.R.F.", phone: "7783962936", aadhaar: "606670354382" },
    { sNo: 28, name: "AYUSH KUMAR", father: "SATENDRA KUMAR", mother: "ASHA DEVI", dob: "02-12-2009", address: "MARUI ,", phone: "9956809929", aadhaar: "655052658693" },
    { sNo: 29, name: "ADITYA SAHU", father: "KULDEEP SAHU", mother: "REKHA SAHU", dob: "09-06-2009", address: "MARUI ,", phone: "9793957139", aadhaar: "398563319188" },
    { sNo: 30, name: "RITIK KUMAR YADAV", father: "VIRENDRA KUAMR", mother: "NIRAJ", dob: "15-03-2011", address: "DHANUWASAND,", phone: "8174824685", aadhaar: "668916353513" },
    { sNo: 31, name: "MAYANK CHAUDHARY", father: "SUSHIL KUMAR", mother: "SITA", dob: "02-11-2007", address: "JABRELA,", phone: "9935004145", aadhaar: "422769773676" },
    { sNo: 32, name: "SWEETY TIWARI", father: "ANOOP KUMAR", mother: "MANJU TIWARI", dob: "06-12-2010", address: "JAITIKHERA,", phone: "9889171582", aadhaar: "846161606953" },
    { sNo: 33, name: "KAJAL GAUTAM", father: "SUBHASH GAUTAM", mother: "NIRMALA GAUTAM", dob: "06-08-2010", address: "BHARSAWA,", phone: "9936283902", aadhaar: "219574615557" },
    { sNo: 34, name: "ANSHIKA YADAV", father: "VINOD KUMAR", mother: "SARITA YADAV", dob: "21-03-2009", address: "MARUI", phone: "9044958506", aadhaar: "783291702957" },
    { sNo: 35, name: "VIPIN KUMAR", father: "VIRENDRA KUMAR", mother: "MANJU RAWAT", dob: "04-07-2009", address: "MAKHDOOM POOR,", phone: "8601930748", aadhaar: "357091691694" },
    { sNo: 36, name: "PRANJAL", father: "ANAJANI KUMAR", mother: "PRITI", dob: "01-01-2011", address: "MAKHDOOM POOR,", phone: "6387410034", aadhaar: "626621246781" },
    { sNo: 37, name: "KHUSHI", father: "RAJ KUMAR", mother: "SUSHILA", dob: "23-02-2009", address: "MOHINIKHERA,", phone: "9198524517", aadhaar: "762921801332" },
    { sNo: 38, name: "HARSHIT RAWAT", father: "RAMKARAN", mother: "MEENA", dob: "04-07-2011", address: "MULLAHIKHERA,", phone: "7081929375", aadhaar: "880051970528" },
    { sNo: 39, name: "ANUSHKA GUPTA", father: "PRADEEP GUPTA", mother: "KAMINI GUPTA", dob: "07-12-2010", address: "BHADESUWA,", phone: "8887819879", aadhaar: "650406845603" },
    { sNo: 40, name: "SHALINI", father: "RAMKISHORE", mother: "NEELAM RAWAT", dob: "25-09-2007", address: "MAJHIGAWAN,", phone: "9559200286", aadhaar: "630503658608" },
    { sNo: 41, name: "ANSHIKA RAWAT", father: "BINDRA PRASAD", mother: "SARITA", dob: "09-06-2008", address: "AYODHYA KHERA,", phone: "9936644588", aadhaar: "264544733022" },
    { sNo: 42, name: "ANKIT KUMAR", father: "ASHOK KUMAR", mother: "ASHA DEVI", dob: "08-08-2009", address: "DHANUWASAND,", phone: "9198153101", aadhaar: "" }
];

async function main() {
    const password = await bcrypt.hash('123456', 10);
    const year = new Date().getFullYear();

    for (let i = 0; i < studentsData.length; i++) {
        const s = studentsData[i];
        try {
            const admissionNo = `SR-11-${Date.now()}-${i}`;
            const email = (s.name.replace(/\s+/g, '').toLowerCase() + (i + 500) + "@BIPS.com");
            
            // Generate STU ID
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
                            dateOfBirth: s.dob || "2009-01-01",
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
