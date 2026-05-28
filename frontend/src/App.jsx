import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';

// Pages
import Login from './pages/Login';
import Register from './pages/Register';
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

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
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
            <Route path="subjects" element={<Subjects />} />
            <Route path="submit-log" element={<SubmitClassLog />} />
            <Route path="qr-checkin" element={<QRCheckIn />} />
            <Route path="my-logs" element={<MyClassLogs />} />
            <Route path="edit-log/:id" element={<EditClassLog />} />
            <Route path="marks" element={<MarksManagement />} />
            <Route path="attendance-approval" element={<AttendanceApproval />} />
            <Route path="start-session" element={<StartSession />} />
            <Route path="session/:id/checkins" element={<SessionCheckins />} />
            <Route path="executive-dashboard" element={<ExecutiveDashboard />} />
            <Route path="settings" element={<Settings />} />
          </Route>

          {/* Catch all */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
