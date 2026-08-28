const fs = require('fs');
let schema = fs.readFileSync('prisma/schema.prisma', 'utf8');

schema = schema.replace('provider = "postgresql"', 'provider = "sqlite"');
schema = schema.replace('env("DATABASE_URL")', '"file:./dev.db"');

schema = schema.replace(/enum Role \{[\s\S]*?\}/, '');
schema = schema.replace(/enum AttendanceStatus \{[\s\S]*?\}/, '');
schema = schema.replace(/enum FeeStatus \{[\s\S]*?\}/, '');

schema = schema.replace(/role\s+Role\s+@default\(STUDENT\)/g, 'role      String   @default("STUDENT")');
schema = schema.replace(/status\s+AttendanceStatus/g, 'status      String');
schema = schema.replace(/status\s+FeeStatus/g, 'status      String');

fs.writeFileSync('prisma/schema.prisma', schema);
console.log("Schema converted to sqlite");
