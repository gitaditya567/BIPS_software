import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcrypt';
const prisma = new PrismaClient();

const CLASS_ID = "69c12ea64529bf8f03c11b5a"; // Class 8
const SECTION_ID = "69c12ea74529bf8f03c11b5b"; // Section A

const studentsData = [
    { name: "Abhay Yadav", father: "Mr. Dilip Kumar", mother: "Mrs. Sangeeta Yadav", dob: "25-9-11", address: "Dhanuwasand, Bhadeswa", phone: "8840906123", aadhaar: "861859662522" },
    { name: "Aham", father: "Mr. Sujit Yadav", mother: "Mrs. Priyanka Yadav", dob: "11-4-12", address: "Manhoorapur, Sisendi", phone: "9555615583", aadhaar: "744393740644" },
    { name: "Akansha Pal", father: "Mr. Sailendra Kumar", mother: "Mrs. Sangeeta Devi", dob: "20-3-14", address: "Marui Jaithi Kheda", phone: "7355525587", aadhaar: "823113014207" },
    { name: "Anushka Rawat", father: "Mr. Ashok Kumar", mother: "Kiran Devi", dob: "6-6-13", address: "Memaura Banthara", phone: "6393687038", aadhaar: "636006794332" },
    { name: "Anushka Yadav", father: "Mr. Chandra Prakash", mother: "Poonam", dob: "19-7-12", address: "Jaiti Kheda", phone: "9956131530", aadhaar: "537127039550" },
    { name: "Anshika Gautam", father: "Mr. Raj Kumar", mother: "Manisha Gautam", dob: "18-3-11", address: "Laxman Khera Chandrawal", phone: "9956319601", aadhaar: "634044785228" },
    { name: "Arpita Sahu", father: "Mr. Pramod Kumar", mother: "Shashi Sahu", dob: "6-7-12", address: "Shahpur Majhigawan", phone: "9935161905", aadhaar: "454673512663" },
    { name: "Ayushi", father: "Mr. Raj Kumar", mother: "Manisha Gautam", dob: "8-12-13", address: "Laxman Khera Chandrawal", phone: "9956319601", aadhaar: "655785427184" },
    { name: "Devesh Pandey", father: "Mr. Ajay Pandey", mother: "Anita", dob: "28-8-13", address: "Alakhnanda", phone: "8808838518", aadhaar: "422450169882" },
    { name: "Deepansha Gautam", father: "Mr. Suresh Chandra", mother: "Arti", dob: "20-8-10", address: "Laxaman Khera", phone: "9129357307", aadhaar: "370038415456" },
    { name: "Deepika Gautam", father: "Mr. Ram Milan", mother: "Ramwati", dob: "2-12-12", address: "Sohara Jaithi Kheda", phone: "9219289695", aadhaar: "807186665554" },
    { name: "Fatima Bano", father: "Late Saddam Khan", mother: "Kafiya", dob: "5-12-12", address: "Bhadesawa", phone: "8115440443", aadhaar: "243887295720" },
    { name: "Deepanshu", father: "Mr. Chandra Shekhar", mother: "Phoolan Devi", dob: "17-5-13", address: "Marui", phone: "8400594309", aadhaar: "249818234324" },
    { name: "Mahima", father: "Mr. Omkar Nath Yadav", mother: "Usha Devi", dob: "13-8-12", address: "Dhanuwasand", phone: "9794008316", aadhaar: "443821857205" },
    { name: "Khushi Pal", father: "Mr. Girish Kumar", mother: "Saroj Kumari", dob: "7-3-12", address: "Bhaundri", phone: "8960668173", aadhaar: "736027314297" },
    { name: "Mansi", father: "Mr. Manoj Kumar", mother: "Archana", dob: "26-4-12", address: "Kasim Khera", phone: "9793048384", aadhaar: "216816297456" },
    { name: "Mayank Sharma", father: "Mr. Shiv Mohan", mother: "Preeti", dob: "24-3-12", address: "Marui", phone: "9559901710", aadhaar: "530806679085" },
    { name: "Navya", father: "Mr. Virendra Kumar", mother: "Gangotri", dob: "9-7-13", address: "Dhanuwasand", phone: "8400972723", aadhaar: "418777138038" },
    { name: "Prerna", father: "Mr. Raju Rawat", mother: "Guddi", dob: "16-1-12", address: "Jaiti Khera", phone: "8172824833", aadhaar: "788141721976" },
    { name: "Prince", father: "Mr. Mukesh Kumar", mother: "Priti", dob: "25-1-13", address: "Rahim Nagar", phone: "8528953963", aadhaar: "267595964701" },
    { name: "Purvi Sharma", father: "Mr. Dhananjay Sharma", mother: "Mamata Sharma", dob: "15-7-13", address: "Saraiya", phone: "8920945243", aadhaar: "747674768333" },
    { name: "Raj Yadav", father: "Mr. Anoop Chandra", mother: "Meenu", dob: "26-4-14", address: "Dhanuwasand", phone: "9621530810", aadhaar: "201406183113" },
    { name: "Ranu Kumari", father: "Mr. Raj Kishor", mother: "Gayatri", dob: "22-9-12", address: "Sohara", phone: "8400663335", aadhaar: "577087044866" },
    { name: "Raunak Sharma", father: "Mr. Pattan", mother: "Ramila", dob: "17-9-12", address: "Marui", phone: "8127809375", aadhaar: "659117398116" },
    { name: "Rishabh Verma", father: "Mr. Sandeep Verma", mother: "Meena Verma", dob: "19-4-14", address: "Bhagu Khera", phone: "7905124374", aadhaar: "68699264968" },
    { name: "Sarthak", father: "Mr. Umesh Yadav", mother: "Poonam", dob: "14-7-12", address: "Ikabal Khera", phone: "8318960277", aadhaar: "603204367733" },
    { name: "Saumya", father: "Mr. Ashok Kumar", mother: "Kiran Devi", dob: "14-7-11", address: "Memaura", phone: "6393687038", aadhaar: "458817578043" },
    { name: "Shubham", father: "Mr. Shyam Baran", mother: "Raveendri", dob: "17-11-13", address: "Ikabal Khera", phone: "9128153119", aadhaar: "996122376698" },
    { name: "Vaishnavi", father: "Mr. Subhash", mother: "Sunita", dob: "15-11-12", address: "Chandrawal", phone: "9555545378", aadhaar: "724867086297" },
    { name: "Vanshika Yadav", father: "Mr. Dharmveer Singh", mother: "Rachana Devi", dob: "15-11-12", address: "Kasim Khera", phone: "6307962407", aadhaar: "830880493424" },
    { name: "Adarsh", father: "Mr. Saini", mother: "Kanchan", dob: "15-10-14", address: "Shahpur Majhigawan", phone: "8957553644", aadhaar: "88829109460" },
    { name: "Satyam", father: "Mr. Shiv Karan", mother: "Nilam", dob: "11-1-13", address: "Triloppur", phone: "9555386684", aadhaar: "539730316346" },
    { name: "Raunak Pal", father: "Mr. Raju Pal", mother: "Rampati", dob: "16-7-09", address: "Marui", phone: "9559662407", aadhaar: "" },
    { name: "Ananya", father: "Mr. Jeet Bahadur", mother: "Roshni", dob: "26-3-13", address: "Kaithi", phone: "7985491001", aadhaar: "894139187597" },
    { name: "Kritika", father: "Mr. Sanjay Yadav", mother: "Sangeeta Devi", dob: "11-3-13", address: "Saraiya", phone: "8127110375", aadhaar: "988705774815" },
    { name: "Tanishk", father: "Mr. Astalin", mother: "Arti", dob: "28-4-15", address: "Bhagu Khera", phone: "6393372514", aadhaar: "830880493424" },
    { name: "Naitik", father: "Mr. Dilip Kumar", mother: "Kanchan Dilip", dob: "01-07-13", address: "Marui", phone: "6386987003", aadhaar: "582296918367" }
];

async function main() {
    const password = await bcrypt.hash('123456', 10);
    const year = new Date().getFullYear();

    for (let i = 0; i < studentsData.length; i++) {
        const s = studentsData[i];
        try {
            const admissionNo = `SR-8-${Date.now()}-${i}`;
            const email = (s.name.replace(/\s+/g, '').toLowerCase() + (i + 100) + "@BIPS.com");
            
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
            process.stdout.write(`Admitted: ${s.name}\n`);
        } catch (err) {
            console.error(`Failed to admit ${s.name}:`, err);
        }
    }
    await prisma.$disconnect();
}

main();
