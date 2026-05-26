import { FiSettings, FiShield } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';

const Settings = () => {
  const { user } = useAuth();

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500">Manage your account settings</p>
      </div>

      {/* Account Info */}
      <div className="card">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-blue-100 rounded-lg">
            <FiShield className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Account Information</h3>
            <p className="text-sm text-gray-500">Your account details</p>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex justify-between py-2 border-b border-gray-100">
            <span className="text-gray-500">Name</span>
            <span className="font-medium">{user?.name}</span>
          </div>
          <div className="flex justify-between py-2 border-b border-gray-100">
            <span className="text-gray-500">Email</span>
            <span className="font-medium">{user?.email}</span>
          </div>
          <div className="flex justify-between py-2 border-b border-gray-100">
            <span className="text-gray-500">Role</span>
            <span className="font-medium">{user?.role}</span>
          </div>
          {user?.managedBranch && (
            <div className="flex justify-between py-2 border-b border-gray-100">
              <span className="text-gray-500">Managed Branch</span>
              <span className="font-medium">{user.managedBranch}</span>
            </div>
          )}
          <div className="flex justify-between py-2 border-b border-gray-100">
            <span className="text-gray-500">Branches</span>
            <span className="font-medium">{user?.branches?.join(', ') || '—'}</span>
          </div>
          <div className="flex justify-between py-2">
            <span className="text-gray-500">Member Since</span>
            <span className="font-medium">
              {user?.createdAt
                ? new Date(user.createdAt).toLocaleDateString()
                : 'N/A'}
            </span>
          </div>
        </div>
      </div>

      {/* About */}
      <div className="card">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-gray-100 rounded-lg">
            <FiSettings className="w-5 h-5 text-gray-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">About</h3>
            <p className="text-sm text-gray-500">Application information</p>
          </div>
        </div>
        <div className="space-y-2 text-sm text-gray-600">
          <p><strong>MIE Faculty Attendance System</strong></p>
          <p>Version 1.0.0</p>
          <p>Built for MIE Pathways NCUK IFY Programme</p>
        </div>
      </div>
    </div>
  );
};

export default Settings;
