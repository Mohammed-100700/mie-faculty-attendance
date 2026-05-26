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
} from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';

const Sidebar = ({ isOpen, onClose }) => {
  const { user, logoutUser } = useAuth();

  const lecturerNavItems = [
    { to: '/dashboard', icon: FiHome, label: 'Dashboard' },
    { to: '/profile', icon: FiUser, label: 'Profile' },
    { to: '/submit-log', icon: FiPlusCircle, label: 'Submit Attendance' },
    { to: '/qr-checkin', icon: FiGrid, label: 'QR Check-In' },
    { to: '/my-logs', icon: FiList, label: 'My Attendance' },
    { to: '/marks', icon: FiClipboard, label: 'Marks Management' },
    { to: '/settings', icon: FiSettings, label: 'Settings' },
  ];

  const amNavItems = [
    { to: '/dashboard', icon: FiHome, label: 'Dashboard' },
    { to: '/attendance-approval', icon: FiCheckCircle, label: 'Attendance Approval' },
    { to: '/settings', icon: FiSettings, label: 'Settings' },
  ];

  const navItems = user?.role === 'Academic Manager' ? amNavItems : lecturerNavItems;

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
              <p className="text-xs text-gray-500">
                {user?.role === 'Academic Manager' ? 'Academic Manager' : 'Faculty Portal'}
              </p>
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
