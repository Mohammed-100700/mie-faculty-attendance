import { useState, useEffect, useCallback } from 'react';
import { FiFilter, FiList } from 'react-icons/fi';
import { getMyClassLogs } from '../api/classLogApi';
import ClassLogTable from '../components/ClassLogTable';
import ExportButtons from '../components/ExportButtons';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const MyClassLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    branch: '',
  });
  const navigate = useNavigate();
  const { user } = useAuth();

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = {};
      if (filters.month) params.month = filters.month;
      if (filters.year) params.year = filters.year;
      if (filters.branch) params.branch = filters.branch;
      const res = await getMyClassLogs(params);
      setLogs(res.data.data);
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to load class logs.';
      setError(msg);
      console.error('Failed to fetch logs:', err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const handleFilterChange = (e) => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
  };

  const months = [
    { value: 1, label: 'January' }, { value: 2, label: 'February' },
    { value: 3, label: 'March' }, { value: 4, label: 'April' },
    { value: 5, label: 'May' }, { value: 6, label: 'June' },
    { value: 7, label: 'July' }, { value: 8, label: 'August' },
    { value: 9, label: 'September' }, { value: 10, label: 'October' },
    { value: 11, label: 'November' }, { value: 12, label: 'December' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Attendance Records</h1>
        <p className="text-gray-500">View and manage your class logs</p>
      </div>

      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <FiFilter className="w-5 h-5 text-gray-500" />
          <h3 className="font-semibold text-gray-900">Filters</h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="label">Month</label>
            <select name="month" value={filters.month} onChange={handleFilterChange} className="input-field text-sm">
              <option value="">All</option>
              {months.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Year</label>
            <select name="year" value={filters.year} onChange={handleFilterChange} className="input-field text-sm">
              <option value="">All</option>
              <option value="2025">2025</option>
              <option value="2026">2026</option>
              <option value="2027">2027</option>
            </select>
          </div>
          <div>
            <label className="label">Branch</label>
            <select name="branch" value={filters.branch} onChange={handleFilterChange} className="input-field text-sm">
              <option value="">All</option>
              <option value="Dhanmondi">Dhanmondi</option>
              <option value="Uttara">Uttara</option>
            </select>
          </div>
          <div className="flex items-end">
            <button onClick={fetchLogs} className="btn-primary w-full text-sm">Apply</button>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm flex items-center justify-between">
          <span>{error}</span>
          <button onClick={fetchLogs} className="text-red-800 underline text-xs font-medium">Retry</button>
        </div>
      )}

      <div className="card">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <FiList className="w-5 h-5" />
            Class Logs ({logs.length})
          </h3>
          {!loading && (
            <ExportButtons
              logs={logs}
              month={filters.month || new Date().getMonth() + 1}
              year={filters.year || new Date().getFullYear()}
              variant="lecturer"
              userName={user?.name}
            />
          )}
        </div>
        {loading ? (
          <div className="text-center py-8">
            <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          </div>
        ) : (
          <ClassLogTable logs={logs} onEdit={(log) => navigate(`/edit-log/${log._id}`, { state: { log } })} onRefresh={fetchLogs} />
        )}
      </div>
    </div>
  );
};

export default MyClassLogs;
