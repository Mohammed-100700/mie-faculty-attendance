import { useState } from 'react';
import { FiSettings, FiDollarSign, FiBell, FiShield, FiSave } from 'react-icons/fi';
import { updateProfile } from '../api/authApi';
import { useAuth } from '../context/AuthContext';
import { formatBDT } from '../utils/formatCurrency';

const Settings = () => {
  const { user, updateUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    ratePerClass: user?.ratePerClass || 1500,
  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const res = await updateProfile({
        ratePerClass: parseFloat(form.ratePerClass),
      });
      updateUser(res.data.data);
      setSuccess('Settings updated successfully!');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update settings.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500">Manage your account settings</p>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-50 text-green-700 px-4 py-3 rounded-lg text-sm">
          {success}
        </div>
      )}

      {/* Rate Settings */}
      <div className="card">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-primary-100 rounded-lg">
            <FiDollarSign className="w-5 h-5 text-primary-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Salary Settings</h3>
            <p className="text-sm text-gray-500">Configure your per-class rate</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">
              Rate per Class (BDT)
              <span className="text-xs text-gray-400 font-normal ml-1">
                (In production, this would be controlled by HR/Admin)
              </span>
            </label>
            <input
              type="number"
              name="ratePerClass"
              value={form.ratePerClass}
              onChange={handleChange}
              className="input-field max-w-xs"
              min="0"
              required
            />
            <p className="text-sm text-gray-500 mt-1">
              Current rate: {formatBDT(user?.ratePerClass || 0)} per class
            </p>
          </div>

          <button
            type="submit"
            className="btn-primary flex items-center gap-2"
            disabled={loading}
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <FiSave className="w-4 h-4" />
                Save Settings
              </>
            )}
          </button>
        </form>
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
          <div className="flex justify-between py-2 border-b border-gray-100">
            <span className="text-gray-500">Programme</span>
            <span className="font-medium">{user?.programme}</span>
          </div>
          <div className="flex justify-between py-2 border-b border-gray-100">
            <span className="text-gray-500">Branches</span>
            <span className="font-medium">{user?.branches?.join(', ')}</span>
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
          <p><strong>MIE Faculty Class Attendance & Salary Tracker</strong></p>
          <p>Version 1.0.0</p>
          <p>Built for MIE Pathways NCUK IFY Programme</p>
        </div>
      </div>
    </div>
  );
};

export default Settings;
