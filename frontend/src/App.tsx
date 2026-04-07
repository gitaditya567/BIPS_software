import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { NotificationProvider } from './context/NotificationContext';
import { ToastContainer } from './components/NotificationSystem';
import Login from './pages/Login';
import Layout from './components/Layout';
import RoleDashboard from './pages/RoleDashboard';
import Students from './pages/admin/Students';
import Teachers from './pages/admin/Teachers';
import Classes from './pages/admin/Classes';
import Fees from './pages/admin/Fees';
import TransferCertificate from './pages/admin/TransferCertificate';
import Transport from './pages/admin/Transport';
import ReportCards from './pages/admin/ReportCards';
import AdminAttendance from './pages/admin/Attendance';
import RoleManagement from './pages/admin/RoleManagement';
import MyClasses from './pages/teacher/MyClasses';
import Attendance from './pages/teacher/Attendance';
import PendingFee from './pages/teacher/PendingFee';
import Notice from './pages/teacher/Notice';
import ServiceRecord from './pages/teacher/ServiceRecord';
import MyFees from './pages/student/MyFees';
import MyAttendance from './pages/student/MyAttendance';
import StudentProfile from './pages/student/StudentProfile';
import './index.css';

const App: React.FC = () => {
  return (
    <NotificationProvider>
      <BrowserRouter>
        {/* Global Toast popups — always visible */}
        <ToastContainer />

        <Routes>
          <Route path="/login" element={<Login />} />

          <Route path="/" element={<Layout />}>
            <Route index element={<Navigate to="/login" replace />} />

            {/* ── Admin / Principal / Accounts / Transport Dashboard ── */}
            <Route path="admin" element={<RoleDashboard />} />
            <Route path="admin/students" element={<Students />} />
            <Route path="admin/teachers" element={<Teachers />} />
            <Route path="admin/classes" element={<Classes />} />
            <Route path="admin/fees" element={<Fees />} />
            <Route path="admin/tc" element={<TransferCertificate />} />
            <Route path="admin/settings" element={<div style={{ padding: '2rem' }}><h2>Settings (Coming Soon)</h2></div>} />
            <Route path="admin/roles" element={<RoleManagement />} />
            <Route path="admin/transport" element={<Transport />} />
            <Route path="admin/report-card" element={<ReportCards />} />
            <Route path="admin/attendance" element={<AdminAttendance />} />

            {/* ── Teacher Routes ── */}
            <Route path="teacher" element={<RoleDashboard />} />
            <Route path="teacher/classes" element={<MyClasses />} />
            <Route path="teacher/attendance" element={<Attendance />} />
            <Route path="teacher/fee" element={<PendingFee />} />
            <Route path="teacher/notice" element={<Notice />} />
            <Route path="teacher/service-record" element={<ServiceRecord />} />

            {/* ── Student / Parent Routes ── */}
            <Route path="student" element={<RoleDashboard />} />
            <Route path="parent" element={<RoleDashboard />} />
            <Route path="student/profile" element={<StudentProfile />} />
            <Route path="parent/profile" element={<StudentProfile />} />
            <Route path="student/attendance" element={<MyAttendance />} />
            <Route path="student/marks" element={<div style={{ padding: '2rem' }}><h2>My Marks</h2></div>} />
            <Route path="student/fees" element={<MyFees />} />
            <Route path="parent/notice" element={<Notice />} />
            <Route path="student/notice" element={<Notice />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </NotificationProvider>
  );
};

export default App;
