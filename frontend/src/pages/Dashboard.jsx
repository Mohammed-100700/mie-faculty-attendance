import { useState, useEffect, useCallback } from 'react';
import { FiBook, FiDollarSign } from 'react-icons/fi';
import { getSummary } from '../api/reportApi';
import { getMyClassLogs } from '../api/classLogApi';
import BranchSummaryChart from '../components/BranchSummaryChart';
import { formatBDT, formatDate } from '../utils/formatCurrency';

const Dashboard = () => {
  const [summary, setSummary] = useState(null);
  const [recentLogs, setRecentLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [summaryRes, logsRes] = await Promise.all([
        getSummary(),
        getMyClassLogs({}),
      ]);
      setSummary(summaryRes.data.data);
      setRecentLogs(logsRes.data.data.slice(0, 5));
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 border-4 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500">Overview of your classes and salary this month</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="card flex items-center gap-4">
          <div className="p-3 bg-primary-50 rounded-xl">
            <FiBook className="w-6 h-6 text-primary-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Classes This Month</p>
            <p className="text-2xl font-bold text-gray-900">{summary?.totalClasses || 0}</p>
          </div>
        </div>
        <div className="card flex items-center gap-4">
          <div className="p-3 bg-green-50 rounded-xl">
            <FiDollarSign className="w-6 h-6 text-green-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Estimated Salary</p>
            <p className="text-2xl font-bold text-gray-900">{formatBDT(summary?.totalPayableAmount || 0)}</p>
            <p className="text-xs text-gray-400">Rate: {formatBDT(summary?.ratePerClass || 0)}/class</p>
          </div>
        </div>
      </div>

      <BranchSummaryChart branchBreakdown={summary?.branchBreakdown || {}} />

      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Class Logs</h3>
        {recentLogs.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <FiBook className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p>No class logs yet. Start by submitting your first log.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-3 font-medium text-gray-500">Date</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-500">Branches</th>
                  <th className="text-center py-2 px-3 font-medium text-gray-500">Classes</th>
                  <th className="text-right py-2 px-3 font-medium text-gray-500">Amount</th>
                </tr>
              </thead>
              <tbody>
                {recentLogs.map((log) => (
                  <tr key={log._id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-2 px-3">{formatDate(log.date)}</td>
                    <td className="py-2 px-3">{log.entries?.map((e) => `${e.branch}: ${e.classes}`).join(', ')}</td>
                    <td className="py-2 px-3 text-center">{log.totalClasses}</td>
                    <td className="py-2 px-3 text-right font-medium">{formatBDT(log.payableAmount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
