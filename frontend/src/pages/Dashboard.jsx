import { useState, useEffect, useCallback } from 'react';
import { FiBook, FiClock, FiCheckCircle, FiXCircle } from 'react-icons/fi';
import { getMyClassLogs } from '../api/classLogApi';
import { getPendingLogs, getAllLogs } from '../api/attendanceApprovalApi';
import { useAuth } from '../context/AuthContext';
import ClassLogTable from '../components/ClassLogTable';

const Dashboard = () => {
  const { user } = useAuth();
  const isAM = user?.role === 'Academic Manager';

  // Lecturer state
  const [recentLogs, setRecentLogs] = useState([]);
  const [monthlyClasses, setMonthlyClasses] = useState(0);

  // AM state
  const [pendingLogs, setPendingLogs] = useState([]);
  const [recentDecisions, setRecentDecisions] = useState([]);

  const [loading, setLoading] = useState(true);

  const fetchLecturerData = useCallback(async () => {
    try {
      const now = new Date();
      const res = await getMyClassLogs({
        month: now.getMonth() + 1,
        year: now.getFullYear(),
      });
      const logs = res.data.data;
      setRecentLogs(logs.slice(0, 5));
      setMonthlyClasses(logs.reduce((sum, l) => sum + (l.totalClasses || 0), 0));
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchAMData = useCallback(async () => {
    try {
      const [pendingRes, allRes] = await Promise.all([
        getPendingLogs(),
        getAllLogs(),
      ]);
      setPendingLogs(pendingRes.data.data);
      setRecentDecisions(allRes.data.data.slice(0, 10));
    } catch (err) {
      console.error('Failed to fetch AM dashboard data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAM) {
      fetchAMData();
    } else {
      fetchLecturerData();
    }
  }, [isAM, fetchAMData, fetchLecturerData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 border-4 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // Academic Manager Dashboard — count per-branch entries, not whole logs
  if (isAM) {
    const myBranch = user?.managedBranch;
    const pendingCount = pendingLogs.reduce(
      (c, l) => c + (l.entries?.filter((e) => e.branch === myBranch && e.approvalStatus === 'Pending').length || 0),
      0
    );
    const approvedCount = recentDecisions.reduce(
      (c, l) => c + (l.entries?.filter((e) => e.branch === myBranch && e.approvalStatus === 'Approved').length || 0),
      0
    );
    const rejectedCount = recentDecisions.reduce(
      (c, l) => c + (l.entries?.filter((e) => e.branch === myBranch && e.approvalStatus === 'Rejected').length || 0),
      0
    );

    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500">
            Attendance approval overview — {user?.managedBranch} Branch
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="card flex items-center gap-4">
            <div className="p-3 bg-orange-50 rounded-xl">
              <FiClock className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Pending Approval</p>
              <p className="text-2xl font-bold text-gray-900">{pendingCount}</p>
            </div>
          </div>
          <div className="card flex items-center gap-4">
            <div className="p-3 bg-green-50 rounded-xl">
              <FiCheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Approved</p>
              <p className="text-2xl font-bold text-gray-900">{approvedCount}</p>
            </div>
          </div>
          <div className="card flex items-center gap-4">
            <div className="p-3 bg-red-50 rounded-xl">
              <FiXCircle className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Rejected</p>
              <p className="text-2xl font-bold text-gray-900">{rejectedCount}</p>
            </div>
          </div>
        </div>

        {pendingCount > 0 && (
          <div className="card border-orange-200 bg-orange-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FiClock className="w-5 h-5 text-orange-600" />
                <div>
                  <p className="font-medium text-orange-800">
                    {pendingCount} class log{pendingCount > 1 ? 's' : ''} awaiting your approval
                  </p>
                  <p className="text-sm text-orange-600">
                    Review and approve attendance for {user?.managedBranch} branch
                  </p>
                </div>
              </div>
              <a href="/attendance-approval" className="btn-primary text-sm">
                Review Now
              </a>
            </div>
          </div>
        )}

        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Decisions</h3>
          {recentDecisions.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <FiCheckCircle className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p>No decisions made yet.</p>
            </div>
          ) : (
            <ClassLogTable logs={recentDecisions} showLecturer managedBranch={user?.managedBranch} />
          )}
        </div>
      </div>
    );
  }

  // Lecturer Dashboard
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500">Overview of your classes this month</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="card flex items-center gap-4">
          <div className="p-3 bg-primary-50 rounded-xl">
            <FiBook className="w-6 h-6 text-primary-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Classes This Month</p>
            <p className="text-2xl font-bold text-gray-900">{monthlyClasses}</p>
          </div>
        </div>
        <div className="card flex items-center gap-4">
          <div className="p-3 bg-orange-50 rounded-xl">
            <FiClock className="w-6 h-6 text-orange-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Pending Approval</p>
            <p className="text-2xl font-bold text-gray-900">
              {recentLogs.reduce(
                (c, l) => c + (l.entries?.filter((e) => e.approvalStatus === 'Pending').length || 0),
                0
              )}
            </p>
          </div>
        </div>
      </div>

      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Class Logs</h3>
        {recentLogs.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <FiBook className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p>No class logs yet. Start by submitting your first log.</p>
          </div>
        ) : (
          <ClassLogTable logs={recentLogs} />
        )}
      </div>
    </div>
  );
};

export default Dashboard;
