# School ERP Software

A complete School Enterprise Resource Planning system built with modern technologies.

## Technology Stack

- **Frontend**: React.js (Vite), React Router, Lucide Icons, Custom CSS with Dark Mode and dynamic styling.
- **Backend**: Node.js, Express.js, TypeScript.
- **Database ORM**: Prisma.
- **Database Engine**: PostgreSQL (Mocked local setup using Prisma defaults).

## Project Structure

- `frontend/`: The frontend application containing Admin, Teacher, and Student portals.
- `backend/`: The backend server implementing the REST APIs.

## Key Features

1. **Student Management**: Admissions, Profiles, and Attendance marking.
2. **Teacher Management**: Profiles, Assigned subjects, and teaching timetable.
3. **Academics**: Exam setup, Class schedules, Subject enrollments, and Results matching.
4. **Fees Management**: Setup recurring fees structure, register partial payments, issue receipts.

## How to Run locally

### Backend

```bash
cd backend
npm install
npx prisma generate
npx prisma db push --preview-feature # To initialize DB if no migration created yet
npm run dev
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

The frontend runs locally on `http://localhost:5173`.
The backend APIs run locally on `http://localhost:5000`.
