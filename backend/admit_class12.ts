import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcrypt';
const prisma = new PrismaClient();

const CLASS_ID = "69c12ea84529bf8f03c11b6c"; // Class 12 (Bio)
const SECTION_ID = "69c12ea94529bf8f03c11b6d"; // Section A

const studentsData = [
    { sNo: 1, name: "Aarya Shukla", father: "Mahesh Kumar", mother: "Nisha Shukla", dob: "17/12/10", address: "Sisendi", phone: "8707406699", aadhaar: "" },
    { sNo: 2, name: "Adarsh Yadav", father: "Santosh Yadav", mother: "Manju Yadav", dob: "18/01/07", address: "Nanki Khera", phone: "9793722029", aadhaar: "" },
    { sNo: 3, name: "Aditya Yadav", father: "Jitendra Singh", mother: "Shastibala", dob: "17/04/08", address: "Mansab Khera", phone: "9794156437", aadhaar: "" },
    { sNo: 4, name: "Akanksha Yadav", father: "Indra Ku Yadav", mother: "Jayshree", dob: "10/09/10", address: "Raghunath Khera", phone: "9936000710", aadhaar: "" },
    { sNo: 5, name: "Akriti Sharma", father: "Jitendra Sharma", mother: "Gudiya Sharma", dob: "10/08/10", address: "Kaithi", phone: "6392772991", aadhaar: "" },
    { sNo: 6, name: "Anjali Yadav", father: "Sunil Yadav", mother: "Sushma Yadav", dob: "23/09/09", address: "Dhanuwasand", phone: "8009956364", aadhaar: "" },
    { sNo: 7, name: "Arpit Singh", father: "Satish Singh", mother: "Neeraj", dob: "23/08/09", address: "Marui", phone: "9956935268", aadhaar: "" },
    { sNo: 8, name: "Aslik Rain", father: "Sakeel Ahmad", mother: "Mamina", dob: "22/07/08", address: "Meeranpur", phone: "9935474554", aadhaar: "" },
    { sNo: 9, name: "Ashutosh Yadav", father: "Raj Kamal", mother: "Vandana", dob: "17/01/10", address: "Dhanuwasand", phone: "9198466947", aadhaar: "" },
    { sNo: 10, name: "Ayush", father: "Devi Charan", mother: "Kalpana Yadav", dob: "01/08/08", address: "Marui", phone: "7388472726", aadhaar: "" },
    { sNo: 11, name: "Ayushi Sharma", father: "Jitendra Sharma", mother: "Gudiya Sharma", dob: "10/08/10", address: "Kaithi", phone: "6392772991", aadhaar: "" },
    { sNo: 12, name: "Bhawni", father: "Shailendra Yadav", mother: "Shama Devi", dob: "23/09/09", address: "Sariyan", phone: "9198307452", aadhaar: "" },
    { sNo: 13, name: "Chahat Anand", father: "Rakesh Anand", mother: "Gangajali", dob: "30/01/09", address: "Dhanuwasand", phone: "9936600357", aadhaar: "" },
    { sNo: 14, name: "Divyansh Tiwari", father: "Dileep Tiwari", mother: "Preeti Tiwari", dob: "20/06/08", address: "Jaiti Khera", phone: "9889171582", aadhaar: "" },
    { sNo: 15, name: "Harsh Prajapati", father: "Uma Shankar", mother: "Pushpa Devi", dob: "31/10/08", address: "Sariyan", phone: "9793069285", aadhaar: "" },
    { sNo: 16, name: "Jatin", father: "Pradeep Kumar", mother: "Saroj", dob: "25/08/08", address: "Kaithi", phone: "8299663261", aadhaar: "" },
    { sNo: 17, name: "Mahi", father: "Suneel", mother: "Manorama", dob: "27/04/08", address: "Dhanuwasand", phone: "9559386721", aadhaar: "" },
    { sNo: 18, name: "Mahima Rawat", father: "Suneel Kumar", mother: "Malti", dob: "01/01/08", address: "Tikra", phone: "9125581293", aadhaar: "" },
    { sNo: 19, name: "Mo. Uwais", father: "Mo. Azeem", mother: "Anesha", dob: "20/02/09", address: "Bhadesewa", phone: "9451558854", aadhaar: "" },
    { sNo: 20, name: "Nitin Vishwakarma", father: "Ravi Shankar", mother: "Aradhana", dob: "22/09/08", address: "Dhanuwasand", phone: "9655869812", aadhaar: "" },
    { sNo: 21, name: "Rajendra", father: "Ram Milan", mother: "Ramawati", dob: "20/01/08", address: "Sohawa", phone: "9219289695", aadhaar: "" },
    { sNo: 22, name: "Piku Sahu", father: "Anil Sahu", mother: "Resha Sahu", dob: "16/09/08", address: "Raipur", phone: "9936918097", aadhaar: "" },
    { sNo: 23, name: "Piyush", father: "Rajesh Kumar", mother: "Rekha", dob: "16/01/10", address: "Bhawani Khera", phone: "9335126280", aadhaar: "" },
    { sNo: 24, name: "Prachi Rawat", father: "Suresh Rawat", mother: "Nirmala", dob: "01/07/08", address: "Tikrakothi", phone: "9793087036", aadhaar: "" },
    { sNo: 25, name: "Prachi Chaurasiya", father: "Mota Prasad", mother: "Rama Devi", dob: "04/02/10", address: "Raipur", phone: "9793609546", aadhaar: "" },
    { sNo: 26, name: "Rinku Rawat", father: "Rajesh Kumar", mother: "Shanti Devi", dob: "17/12/07", address: "Tikra", phone: "9460819723", aadhaar: "" },
    { sNo: 27, name: "Priyanshu", father: "Ravita Kumar", mother: "Anita Yadav", dob: "23/03/10", address: "Pinwat", phone: "9170326321", aadhaar: "" },
    { sNo: 28, name: "Rachit Sahu", father: "Raj Narayan", mother: "Geeta", dob: "27/09/09", address: "Manjhigawa", phone: "9621863642", aadhaar: "" },
    { sNo: 29, name: "Rimjhim Yadav", father: "Kamlesh Yadav", mother: "Reeta Yadav", dob: "13/02/09", address: "Nurdi Khera", phone: "7905000984", aadhaar: "" },
    { sNo: 30, name: "Rimjhim Yadav", father: "Suneel Yadav", mother: "Aneeta", dob: "19/07/09", address: "Kaithi", phone: "8787000979", aadhaar: "" },
    { sNo: 31, name: "Sakshi Singh", father: "Jasbeer Singh", mother: "Sarla", dob: "10/02/09", address: "Bhawan Khera", phone: "9005339879", aadhaar: "" },
    { sNo: 32, name: "Sayogita", father: "Surya Pal Yadav", mother: "Indrawati", dob: "21/08/09", address: "Marui", phone: "9695539341", aadhaar: "" },
    { sNo: 33, name: "Shalini Yadav", father: "Vinod", mother: "Suman", dob: "20/08/08", address: "Shankar Khera", phone: "9935325608", aadhaar: "" },
    { sNo: 34, name: "Sudheer Ku Yadav", father: "Surendra Yadav", mother: "Vimlesh", dob: "22/04/09", address: "Mansam Khera", phone: "6387080995", aadhaar: "" },
    { sNo: 35, name: "Sunaina Singh", father: "Surjan Singh", mother: "Suman Singh", dob: "10/07/10", address: "Bhagu Khera", phone: "9956507023", aadhaar: "" },
    { sNo: 36, name: "Sunny Yadav", father: "Phool Chandra", mother: "Sangeeta", dob: "16/02/10", address: "Rani Khera", phone: "7275470485", aadhaar: "" },
    { sNo: 37, name: "Tanishk", father: "Rajesh", mother: "Sangeeta", dob: "09/05/10", address: "Tikra", phone: "9793112230", aadhaar: "" },
    { sNo: 38, name: "Vaibhav Kumar", father: "Ram Kishan", mother: "Sunita", dob: "13/10/08", address: "Manjhigawan", phone: "7318523035", aadhaar: "" },
    { sNo: 39, name: "Shagun", father: "Sarvesh", mother: "Savita", dob: "04/04/09", address: "Ratauli", phone: "6390403211", aadhaar: "" },
    { sNo: 40, name: "Aradhya Yadav", father: "Mithilesh Ku", mother: "Sunita", dob: "14/09/09", address: "Kuwar Khera", phone: "9119368879", aadhaar: "" }
];

async function main() {
    const password = await bcrypt.hash('123456', 10);
    const year = new Date().getFullYear();

    for (let i = 0; i < studentsData.length; i++) {
        const s = studentsData[i];
        try {
            const admissionNo = `SR-12-${Date.now()}-${i}`;
            const email = (s.name.replace(/\s+/g, '').toLowerCase() + (i + 600) + "@BIPS.com");
            
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
                            dateOfBirth: s.dob || "2008-01-01",
                            aadhaarNumber: s.aadhaar || "",
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
