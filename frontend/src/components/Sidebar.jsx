import { NavLink } from 'react-router-dom';
import {
  FiHome,
  FiUser,
  FiPlusCircle,
  FiGrid,
  FiList,
  FiSettings,
  FiLogOut,
  FiClipboard,
  FiCheckCircle,
  FiPlay,
  FiBarChart2,
  FiEye,
} from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';

const Sidebar = ({ isOpen, onClose }) => {
  const { user, logoutUser } = useAuth();

  const lecturerNavItems = [
    { to: '/dashboard', icon: FiHome, label: 'Dashboard', end: false },
    { to: '/start-session', icon: FiPlay, label: 'Start Session', end: false },
    { to: '/submit-log', icon: FiPlusCircle, label: 'Submit Attendance', end: false },
    { to: '/qr-checkin', icon: FiGrid, label: 'QR Check-In', end: false },
    { to: '/my-logs', icon: FiList, label: 'My Attendance', end: false },
    { to: '/marks', icon: FiClipboard, label: 'Marks Management', end: false },
    { to: '/profile', icon: FiUser, label: 'Profile', end: false },
    { to: '/settings', icon: FiSettings, label: 'Settings', end: false },
  ];

  const amNavItems = [
    { to: '/dashboard', icon: FiHome, label: 'Dashboard', end: false },
    { to: '/attendance-approval', icon: FiCheckCircle, label: 'Attendance Approval', end: false },
    { to: '/executive-marks', icon: FiEye, label: 'Marks Review', end: false },
    { to: '/settings', icon: FiSettings, label: 'Settings', end: false },
  ];

  const executiveNavItems = [
    { to: '/dashboard', icon: FiHome, label: 'Dashboard', end: false },
    { to: '/executive-dashboard', icon: FiBarChart2, label: 'Attendance Reports', end: false },
    { to: '/executive-marks', icon: FiEye, label: 'Marks Review', end: false },
    { to: '/settings', icon: FiSettings, label: 'Settings', end: false },
  ];

  const superAdminNavItems = [
    { to: '/dashboard', icon: FiHome, label: 'Dashboard', end: true },
    { to: '/admin/users', icon: FiUser, label: 'Users', end: false },
  ];

  let navItems = lecturerNavItems;
  let portalLabel = 'Faculty Portal';
  if (user?.role === 'Academic Manager') {
    navItems = amNavItems;
    portalLabel = 'Academic Manager';
  } else if (user?.role === 'Executive Office') {
    navItems = executiveNavItems;
    portalLabel = 'Executive Office';
  } else if (user?.role === 'Super Admin') {
    navItems = superAdminNavItems;
    portalLabel = 'System Administrator';
  }

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed top-0 left-0 z-50 h-full w-64 bg-white border-r border-gray-200 transform transition-transform duration-300 lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="h-16 flex items-center px-6 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">MIE</span>
            </div>
            <div>
              <h1 className="font-bold text-gray-900 text-sm leading-tight">
                MIE Pathways
              </h1>
              <p className="text-xs text-gray-500">{portalLabel}</p>
            </div>
          </div>
        </div>

        <nav className="p-4 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onClose}
              className={({ isActive }) =>
                `sidebar-link ${isActive ? 'active' : ''}`
              }
              end={item.end}
            >
              <item.icon className="w-5 h-5" />
              <span className="text-sm">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-100">
          <button
            onClick={logoutUser}
            className="sidebar-link w-full text-red-600 hover:bg-red-50 hover:text-red-700"
          >
            <FiLogOut className="w-5 h-5" />
            <span className="text-sm">Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;