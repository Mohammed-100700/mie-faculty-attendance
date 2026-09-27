import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import AdminDashboard from './pages/AdminDashboard';
import AdminUsers from './pages/AdminUsers';
import AdminBranches from './pages/AdminBranches';
import AdminSubjects from './pages/AdminSubjects';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import Subjects from './pages/Subjects';
import SubmitClassLog from './pages/SubmitClassLog';
import QRCheckIn from './pages/QRCheckIn';
import MyClassLogs from './pages/MyClassLogs';
import EditClassLog from './pages/EditClassLog';
import Settings from './pages/Settings';
import MarksManagement from './pages/MarksManagement';
import AttendanceApproval from './pages/AttendanceApproval';
import StartSession from './pages/StartSession';
import SessionCheckins from './pages/SessionCheckins';
import StudentCheckin from './pages/StudentCheckin';
import ExecutiveDashboard from './pages/ExecutiveDashboard';
import ExecutiveMarks from './pages/ExecutiveMarks';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Navigate to="/login" replace />} />
          <Route path="/checkin" element={<StudentCheckin />} />
          <Route path="/checkin/:code" element={<StudentCheckin />} />

          {/* Protected Routes */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="profile" element={<Profile />} />
            <Route path="settings" element={<Settings />} />

            {/* Lecturer only */}
            <Route
              path="subjects"
              element={
                <ProtectedRoute allowedRoles={['Lecturer']}>
                  <Subjects />
                </ProtectedRoute>
              }
            />
            <Route
              path="submit-log"
              element={
                <ProtectedRoute allowedRoles={['Lecturer']}>
                  <SubmitClassLog />
                </ProtectedRoute>
              }
            />
            <Route
              path="qr-checkin"
              element={
                <ProtectedRoute allowedRoles={['Lecturer']}>
                  <QRCheckIn />
                </ProtectedRoute>
              }
            />
            <Route
              path="my-logs"
              element={
                <ProtectedRoute allowedRoles={['Lecturer']}>
                  <MyClassLogs />
                </ProtectedRoute>
              }
            />
            <Route
              path="edit-log/:id"
              element={
                <ProtectedRoute allowedRoles={['Lecturer']}>
                  <EditClassLog />
                </ProtectedRoute>
              }
            />
            <Route
              path="marks"
              element={
                <ProtectedRoute allowedRoles={['Lecturer']}>
                  <MarksManagement />
                </ProtectedRoute>
              }
            />
            <Route
              path="start-session"
              element={
                <ProtectedRoute allowedRoles={['Lecturer']}>
                  <StartSession />
                </ProtectedRoute>
              }
            />
            <Route
              path="session/:id/checkins"
              element={
                <ProtectedRoute allowedRoles={['Lecturer']}>
                  <SessionCheckins />
                </ProtectedRoute>
              }
            />

            {/* Academic Manager only */}
            <Route
              path="attendance-approval"
              element={
                <ProtectedRoute allowedRoles={['Academic Manager']}>
                  <AttendanceApproval />
                </ProtectedRoute>
              }
            />

            {/* Academic Manager and Executive Office */}
            <Route
              path="executive-dashboard"
              element={
                <ProtectedRoute allowedRoles={['Academic Manager', 'Executive Office']}>
                  <ExecutiveDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="executive-marks"
              element={
                <ProtectedRoute allowedRoles={['Academic Manager', 'Executive Office']}>
                  <ExecutiveMarks />
                </ProtectedRoute>
              }
            />
          </Route>

          {/* Admin route - Super Admin only */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={['Super Admin']}>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<AdminDashboard />} />
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="branches" element={<AdminBranches />} />
            <Route path="subjects" element={<AdminSubjects />} />
          </Route>

          {/* Catch all */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
