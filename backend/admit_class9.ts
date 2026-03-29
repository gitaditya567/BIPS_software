import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcrypt';
const prisma = new PrismaClient();

const CLASS_ID = "69c12ea74529bf8f03c11b5d"; // Class 9
const SECTION_ID = "69c12ea74529bf8f03c11b5e"; // Section A

const studentsData = [
    { sNo: 1, name: "Ayush Yadav", father: "Jitendra Pratap Singh", mother: "Shachi Bala", dob: "08.07.14", address: "Mansabkheda Bhadesua", phone: "8503234205", aadhaar: "723716212570" },
    { sNo: 2, name: "Abhay Rajpoot", father: "Ram Sakhi Rajpoot", mother: "Anita Raj", dob: "05.05.12", address: "Kaithi Mohanlalganj", phone: "9648844975", aadhaar: "828048068280" },
    { sNo: 3, name: "Abhilasha Tyagi", father: "Omprakash Tyagi", mother: "Manju Tyagi", dob: "29.04.13", address: "Patarli Jaithikheda", phone: "8924302251", aadhaar: "929674735902" },
    { sNo: 4, name: "Abhinav Sahu", father: "Amresh Sahu", mother: "Hemlata Sahu", dob: "02.12.12", address: "Shahpur Majhigawan", phone: "7800787130", aadhaar: "830069068712" },
    { sNo: 5, name: "Abhinav Yadav", father: "Lt. Sandeep Kumar Yadav", mother: "Sushma Devi", dob: "25.03.12", address: "Kasimkheda Chandrawal", phone: "9335292797", aadhaar: "891723731515" },
    { sNo: 6, name: "Aditya Pratap Yadav", father: "Raj Kamal", mother: "Vandana", dob: "24.08.13", address: "Dhanuwasand", phone: "9140466947", aadhaar: "66844528077" },
    { sNo: 7, name: "Akriti Yadav", father: "Chandra Shekhar", mother: "Neelam", dob: "10.01.13", address: "Triloppur Chandrawal", phone: "7523011407", aadhaar: "406474496604" },
    { sNo: 8, name: "Amrendra Yadav", father: "Dharmendra Singh", mother: "Sunita", dob: "13.05.13", address: "Ranikheda Mohanlalganj", phone: "9198087588", aadhaar: "292830254652" },
    { sNo: 9, name: "Anand Rajpoot", father: "Manoj Kumar", mother: "Sangeeta", dob: "09.01.14", address: "Ahmed Kheda Phoolampur", phone: "9076497253", aadhaar: "328844374754" },
    { sNo: 10, name: "Ansh Yadav", father: "Ranjeet Yadav", mother: "Mrs. Radha Yadav", dob: "29.07.12", address: "Memaura Banthara", phone: "88810996300", aadhaar: "605560840744" },
    { sNo: 11, name: "Arpit Yadav", father: "Santosh Yadav", mother: "Manju", dob: "09.04.12", address: "Nankikheda Banthara", phone: "9193722029", aadhaar: "521237548246" },
    { sNo: 12, name: "Arti Yadav", father: "Ram Hasla Yadav", mother: "Manju Yadav", dob: "12.12.10", address: "Dhanuwasand Bhadesua", phone: "9198997093", aadhaar: "889776982447" },
    { sNo: 13, name: "Ayushi Yadav", father: "Lallan Yadav", mother: "Savita Yadav", dob: "10.10.10", address: "Dhanuwasand", phone: "9935285795", aadhaar: "650660069829" },
    { sNo: 14, name: "Aryan Rawat", father: "Rajkumar Verma", mother: "Mrs. Reena", dob: "14.06.13", address: "Alinagar Sunahra", phone: "6387169090", aadhaar: "250140696343" },
    { sNo: 15, name: "Aryan Sahu", father: "Mukesh Kumar", mother: "Pushpa Sahu", dob: "07.08.12", address: "Saraiya Chandrawal", phone: "9651107779", aadhaar: "334730325408" },
    { sNo: 16, name: "Aryan Yadav", father: "Rajneesh Kumar", mother: "Sangeeta", dob: "05.09.11", address: "Marui Jaithikheda", phone: "9198325108", aadhaar: "737722905917" },
    { sNo: 17, name: "Avi Sharma", father: "Ritesh Sharma", mother: "Rekha Sharma", dob: "07.05.12", address: "Jaithikheda Mohanlalganj", phone: "7234087912", aadhaar: "572625031200" },
    { sNo: 18, name: "Ayush Yadav", father: "Kamlesh Kumar", mother: "Reety Yadav", dob: "30.10.11", address: "Muralikheda Banthara", phone: "7905000984", aadhaar: "621949532213" },
    { sNo: 19, name: "Ayush Rawat", father: "Pawan Kumar", mother: "Suneeta Rawat", dob: "02.04.14", address: "Majhigawa Chandrawal", phone: "9119952079", aadhaar: "988933072428" },
    { sNo: 20, name: "Bhoomika", father: "Lal Bahadur", mother: "Sunita", dob: "20.02.12", address: "Sariyan Chandrawal", phone: "8756108600", aadhaar: "440100641901" },
    { sNo: 21, name: "Chahek", father: "Vinod Kumar", mother: "Gangotri", dob: "", address: "Bijnour", phone: "7054724713", aadhaar: "445663341999" },
    { sNo: 22, name: "Devendra Trivedi", father: "Ravindra Trivedi", mother: "Beenu", dob: "26.10.11", address: "Jaitikheda Mohanlalganj", phone: "7905835626", aadhaar: "904336440695" },
    { sNo: 23, name: "Himanshu Singh", father: "Yuvraj Singh", mother: "Jyoti Singh", dob: "01.01.2009", address: "Dhanuwasand", phone: "7054724713", aadhaar: "716873683527" },
    { sNo: 24, name: "Kartik Yadav", father: "Shailendra Yadav", mother: "Sharma", dob: "23.03.13", address: "Sariyan Chandrawal", phone: "9198307452", aadhaar: "511122395959" },
    { sNo: 25, name: "Maham Siddiqui", father: "Nadeem Siddiqui", mother: "Afreen", dob: "05.09.12", address: "Bhadesua Mohanlalganj", phone: "9956144211", aadhaar: "759261937273" },
    { sNo: 26, name: "Mahek Yadav", father: "Suneel Yadav", mother: "Sushma", dob: "01.01.10", address: "Dhanuwasand", phone: "8953535570", aadhaar: "454034285305" },
    { sNo: 27, name: "Mahendra Trivedi", father: "Ravindra Trivedi", mother: "Beenu", dob: "26.10.11", address: "Jaitikheda Mohanlalganj", phone: "7905835626", aadhaar: "591259442026" },
    { sNo: 28, name: "Mahi Yadav II", father: "Omkar Nath", mother: "Usha", dob: "29.03.11", address: "Dhanuwasand Mohanlalganj", phone: "9794008316", aadhaar: "319300400260" },
    { sNo: 29, name: "Mahi Yadav I", father: "Suneel Yadav", mother: "Sushma", dob: "01.01.10", address: "Dhanuwasand Mohanlalganj", phone: "8953535570", aadhaar: "439786340134" },
    { sNo: 30, name: "Manvi Rajpoot", father: "Anjani Kumar", mother: "Preeti Rajpoot", dob: "16.11.13", address: "Kaithi Jaithikheda", phone: "6387410034", aadhaar: "376874341977" },
    { sNo: 31, name: "MD. Rehan", father: "Jaan Mohammad", mother: "Afsana", dob: "10.10.11", address: "Jaitikheda Mohanlalganj", phone: "9792124404", aadhaar: "460138773105" },
    { sNo: 32, name: "Mulkraj Singh", father: "Vikram Singh", mother: "Suman Singh", dob: "01.11.11", address: "Suriyamau Gosaiganj", phone: "9956507022", aadhaar: "347001705236" },
    { sNo: 33, name: "Naitik Yadav", father: "Lalji Yadav", mother: "Meena Yadav", dob: "21.11.11", address: "Himmat Kheda Bijnour", phone: "9621808299", aadhaar: "333216032140" },
    { sNo: 34, name: "Nandini Yadav", father: "Brijendra Mohan", mother: "Neelam Yadav", dob: "24.01.11", address: "Bhadesua", phone: "7275528076", aadhaar: "632503616464" },
    { sNo: 35, name: "Pallavi Pandey", father: "Pawan Pandey", mother: "Vindu", dob: "06.02.13", address: "Kaithi Chandrawal", phone: "9889992239", aadhaar: "409075333601" },
    { sNo: 36, name: "Prateek Singh", father: "Satish Kumar", mother: "Neeraj", dob: "02.10.12", address: "Marui Jaithikheda", phone: "9956925268", aadhaar: "200194753793" },
    { sNo: 37, name: "Prince Verma", father: "Ashok Kumar", mother: "Manju", dob: "20.11.11", address: "Kaithi Jaithikheda", phone: "9807614416", aadhaar: "487440336215" },
    { sNo: 38, name: "Ravi Prajapati", father: "Umashanker", mother: "Pushpa", dob: "25.07.12", address: "Sariyan Chandrawal", phone: "9793069285", aadhaar: "846447978714" },
    { sNo: 39, name: "Rohit Yadav", father: "Shiva Kumar", mother: "Prema", dob: "01.11.09", address: "Dhanuwasand", phone: "7388087431", aadhaar: "758649070242" },
    { sNo: 40, name: "Raunak Rawat", father: "Ramkaran Rawat", mother: "Meena", dob: "11.10.13", address: "Mullasikheda Chandrawal", phone: "7081929375", aadhaar: "674756532359" },
    { sNo: 41, name: "Shagun", father: "Sanjay Singh Yadav", mother: "Renu", dob: "24.03.12", address: "Dhanuwasand", phone: "8429326980", aadhaar: "569572345290" },
    { sNo: 42, name: "Somil Kishor", father: "Raj Kishor", mother: "Gayatri", dob: "16.11.11", address: "Sohara Jaithikheda", phone: "9918198166", aadhaar: "224076775591" },
    { sNo: 43, name: "Tanya Yadav", father: "Anil Kumar", mother: "Mamta Yadav", dob: "15.06.12", address: "Mansab Kheda Bhadesua", phone: "9559881543", aadhaar: "432724943217" },
    { sNo: 44, name: "Virat Singh", father: "Deep Singh", mother: "Koyal Singh", dob: "13.09.12", address: "Sariyan Chandrawal", phone: "9198708426", aadhaar: "" }
];

async function main() {
    const password = await bcrypt.hash('123456', 10);
    const year = new Date().getFullYear();

    for (let i = 0; i < studentsData.length; i++) {
        const s = studentsData[i];
        try {
            const admissionNo = `SR-9-${Date.now()}-${i}`;
            const email = (s.name.replace(/\s+/g, '').toLowerCase() + (i + 200) + "@BIPS.com");
            
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
                            dateOfBirth: s.dob || "2012-01-01",
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
