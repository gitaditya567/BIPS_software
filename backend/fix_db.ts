import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const teacherProfile = await prisma.teacherProfile.findFirst({
    where: { user: { email: 'riya@BIPS.com' } }
  });
  
  if (!teacherProfile) {
    console.log("no riya teacher found");
    return;
  }
  
  console.log("Riya Profile:", teacherProfile.id);

  // find LKG class
  let lkg = await prisma.class.findFirst({
    where: { name: 'LKG' }
  });

  if (!lkg) {
    // create it? Just check all classes
    const classes = await prisma.class.findMany();
    console.log("All classes:", classes.map(c => c.name));
    lkg = classes.find(c => c.name.toUpperCase() === 'LKG');
  }

  if (lkg) {
    console.log("LKG found id:", lkg.id);
    
    // Assign subject
    await prisma.subject.create({
      data: {
        name: 'English',
        code: `SUB-LKG-ENG-${Date.now().toString().slice(-4)}`,
        classId: lkg.id,
        teacherId: teacherProfile.id
      }
    });
    
    // Ensure section A exists and has students
    let secA = await prisma.section.findFirst({ where: { classId: lkg.id, name: 'A' }});
    if(!secA) {
      secA = await prisma.section.create({ data: { name: 'A', classId: lkg.id }});
    }

    // Assign some fake students to LKG A so Riya has someone
    const d1 = await prisma.user.create({
      data: {
        name: 'Dummy LKG Student 1',
        email: `lkg1_${Date.now()}@bips.com`,
        password: 'dummy_password',
        role: 'STUDENT',
        studentProfile: {
            create: {
                admissionNo: 'LKG001',
                rollNumber: '1',
                classId: lkg.id,
                sectionId: secA.id,
                gender: 'Male',
                dateOfBirth: '2020-01-01',
            }
        }
      }
    });

    const d2 = await prisma.user.create({
        data: {
          name: 'Dummy LKG Student 2',
          email: `lkg2_${Date.now()}@bips.com`,
          password: 'dummy_password',
          role: 'STUDENT',
          studentProfile: {
              create: {
                  admissionNo: 'LKG002',
                  rollNumber: '2',
                  classId: lkg.id,
                  sectionId: secA.id,
                  gender: 'Female',
                  dateOfBirth: '2020-02-01',
              }
          }
        }
      });
      

    console.log("Fixed Riya and added dummy student");

  } else {
    console.log("No LKG class found");
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
