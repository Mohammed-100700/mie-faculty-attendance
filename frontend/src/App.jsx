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
import SalaryReport from './pages/SalaryReport';
import Settings from './pages/Settings';
import MarksManagement from './pages/MarksManagement';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

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
            <Route path="salary-report" element={<SalaryReport />} />
            <Route path="marks" element={<MarksManagement />} />
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
