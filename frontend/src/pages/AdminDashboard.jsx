import { useEffect, useState } from 'react';
import { FiUsers, FiUserCheck, FiUserX, FiBookOpen, FiMapPin, FiBriefcase, FiShield, FiUserPlus, FiPlus } from 'react-icons/fi';
import { getDashboard } from '../api/adminApi';

const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const res = await getDashboard();
        setStats(res.data.data);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load dashboard.');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, []);

  if (loading) {
    return (
      <div className="py-12 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-12 text-center text-red-600">
        <p>{error}</p>
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  const {
    totalUsers,
    lecturers,
    academicManagers,
    executiveOffice,
    activeUsers,
    inactiveUsers,
    branches,
    subjects,
  } = stats;

  return (
    <div className="p-4 md:p-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">
        System Administrator Dashboard
      </h1>
      <p className="text-gray-600 mb-8">
        System overview and user management
      </p>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 gap-6 lg:grid-cols-4">
        {/* Total Users */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-start">
            <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <FiUsers className="text-primary-600 text-2w w-5 h-5" />
            </div>
            <div className="ml-4 flex-1">
              <p className="text-sm text-gray-500">Total Users</p>
              <p className="text-3xl font-bold text-gray-900">{totalUsers}</p>
            </div>
          </div>
        </div>

        {/* Lecturers */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-start">
            <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <FiUserCheck className="text-primary-600 text-2w w-5 h-5" />
            </div>
            <div className="ml-4 flex-1">
              <p className="text-sm text-gray-500">Lecturers</p>
              <p className="text-3xl font-bold text-gray-900">{lecturers}</p>
            </div>
          </div>
        </div>

        {/* Academic Managers */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-start">
            <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <FiUserCheck className="text-primary-600 text-2w w-5 h-5" />
            </div>
            <div className="ml-4 flex-1">
              <p className="text-sm text-gray-500">Academic Managers</p>
              <p className="text-3xl font-bold text-gray-900">{academicManagers}</p>
            </div>
          </div>
        </div>

        {/* Executive Office */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-start">
            <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <FiUserCheck className="text-primary-600 text-2w w-5 h-5" />
            </div>
            <div className="ml-4 flex-1">
              <p className="text-sm text-gray-500">Executive Office</p>
              <p className="text-3xl font-bold text-gray-900">{executiveOffice}</p>
            </div>
          </div>
        </div>

        {/* Active Users */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-green-200">
          <div className="flex items-start">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <FiShield className="text-green-600 text-2w w-5 h-5" />
            </div>
            <div className="ml-4 flex-1">
              <p className="text-sm text-gray-500">Active Users</p>
              <p className="text-3xl font-bold text-green-600">{activeUsers}</p>
            </div>
          </div>
        </div>

        {/* Inactive Users */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-red-200">
          <div className="flex items-start">
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <FiUserX className="text-red-600 text-2w w-5 h-5" />
            </div>
            <div className="ml-4 flex-1">
              <p className="text-sm text-gray-500">Inactive Users</p>
              <p className="text-3xl font-bold text-red-600">{inactiveUsers}</p>
            </div>
          </div>
        </div>

        {/* Branches */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-start">
            <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <FiMapPin className="text-primary-600 text-2w w-5 h-5" />
            </div>
            <div className="ml-4 flex-1">
              <p className="text-sm text-gray-500">Branches</p>
              <p className="text-3xl font-bold text-gray-900">{branches}</p>
            </div>
          </div>
        </div>

        {/* Subjects */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-start">
            <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <FiBookOpen className="text-primary-600 text-2w w-5 h-5" />
            </div>
            <div className="ml-4 flex-1">
              <p className="text-sm text-gray-500">Subjects</p>
              <p className="text-3xl font-bold text-gray-900">{subjects}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-8 pt-8 border-t border-gray-200">
        <h2 className="text-sm font-medium text-gray-500 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 gap-4">
          <button
            disabled
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-lg text-sm text-gray-600 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FiUserPlus className="w-4 h-4" />
            <span>Manage Users</span>
          </button>
          <button
            disabled
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-lg text-sm text-gray-600 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FiPlus className="w-4 h-4" />
            <span>Add User</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;