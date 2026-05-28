import { useState, useEffect, useCallback } from 'react';
import {
  FiFilter, FiRefreshCw, FiUsers, FiBookOpen, FiClock,
  FiCheckCircle, FiXCircle, FiChevronDown, FiChevronUp,
} from 'react-icons/fi';
import { getReports } from '../api/attendanceSessionApi';
import { useAuth } from '../context/AuthContext';
import ExportButtons from '../components/ExportButtons';
import { exportLecturerPdf, exportManagerPdf } from '../utils/exportPdf';
import { exportLecturerExcel, exportManagerExcel } from '../utils/exportExcel';

const BATCHES = ['September', 'December', 'March', 'June'];
const BRANCHES = ['Dhanmondi', 'Uttara'];

const ExecutiveDashboard = () => {
  const { user } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [batch, setBatch] = useState('');
  const [branch, setBranch] = useState('');
  const [subject, setSubject] = useState('');
  const [expandedSession, setExpandedSession] = useState(null);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (batch) params.batch = batch;
      if (branch) params.branch = branch;
      if (subject) params.subject = subject;
      const res = await getReports(params.batch, params.branch, params.subject);
      setSessions(res.data.data);
    } catch (err) {
      console.error('Failed to fetch reports:', err);
      alert('Failed to load reports: ' + (err.response?.data?.message || err.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  }, [batch, branch, subject]);

  useEffect(() => { fetchReports(); }, [fetchReports]);

  // Summary stats
  const totalSessions = sessions.length;
  const totalCheckins = sessions.reduce((sum, s) => sum + (s.checkinCount || 0), 0);
  const avgCheckins = totalSessions > 0 ? Math.round(totalCheckins / totalSessions) : 0;

  // Unique subjects for filter dropdown
  const uniqueSubjects = [...new Set(sessions.map((s) => s.subject).filter(Boolean))];

  const handleExportPdf = () => {
    const filtered = sessions.map((s) => ({
      ...s,
      entries: [{ branch: s.branch, classes: 1, approvalStatus: 'Approved' }],
    }));
    exportManagerPdf(filtered, new Date().getMonth() + 1, new Date().getFullYear(), branch || 'All-Branches', `${batch || 'All-Batches'}_Executive_Report`);
  };

  const handleExportExcel = () => {
    const filtered = sessions.map((s) => ({
      ...s,
      entries: [{ branch: s.branch, classes: 1, approvalStatus: 'Approved' }],
    }));
    exportManagerExcel(filtered, new Date().getMonth() + 1, new Date().getFullYear(), branch || 'All-Branches', `${batch || 'All-Batches'}_Executive_Report`);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Attendance Reports</h1>
        <p className="text-gray-500">View student attendance by batch, branch, and subject</p>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <FiFilter className="w-5 h-5 text-gray-500" />
          <h3 className="font-semibold text-gray-900">Filters</h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="label">Batch</label>
            <select value={batch} onChange={(e) => setBatch(e.target.value)} className="input-field text-sm">
              <option value="">All Batches</option>
              {BATCHES.map((b) => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Branch</label>
            <select value={branch} onChange={(e) => setBranch(e.target.value)} className="input-field text-sm">
              <option value="">All Branches</option>
              {BRANCHES.map((b) => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Subject</label>
            <select value={subject} onChange={(e) => setSubject(e.target.value)} className="input-field text-sm">
              <option value="">All Subjects</option>
              {uniqueSubjects.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="flex items-end gap-2">
            <button onClick={fetchReports} className="btn-primary text-sm flex-1">Apply</button>
            <button onClick={() => { setBatch(''); setBranch(''); setSubject(''); }} className="btn-secondary text-sm">Clear</button>
          </div>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card flex items-center gap-4">
          <div className="p-3 bg-primary-50 rounded-xl">
            <FiBookOpen className="w-6 h-6 text-primary-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Total Sessions</p>
            <p className="text-2xl font-bold text-gray-900">{totalSessions}</p>
          </div>
        </div>
        <div className="card flex items-center gap-4">
          <div className="p-3 bg-green-50 rounded-xl">
            <FiUsers className="w-6 h-6 text-green-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Total Check-ins</p>
            <p className="text-2xl font-bold text-gray-900">{totalCheckins}</p>
          </div>
        </div>
        <div className="card flex items-center gap-4">
          <div className="p-3 bg-orange-50 rounded-xl">
            <FiClock className="w-6 h-6 text-orange-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Avg per Session</p>
            <p className="text-2xl font-bold text-gray-900">{avgCheckins}</p>
          </div>
        </div>
      </div>

      {/* Export */}
      {sessions.length > 0 && (
        <div className="flex justify-end">
          <ExportButtons
            logs={sessions}
            month={new Date().getMonth() + 1}
            year={new Date().getFullYear()}
            variant="manager"
            managedBranch={branch || 'All'}
            userName={user?.name}
          />
        </div>
      )}

      {/* Sessions list */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Sessions ({sessions.length})
        </h3>
        {loading ? (
          <div className="text-center py-8">
            <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          </div>
        ) : sessions.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <FiBookOpen className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No sessions found for the selected filters.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sessions.map((session) => (
              <div key={session._id} className="border border-gray-200 rounded-lg overflow-hidden">
                {/* Session header */}
                <div
                  className="flex items-center justify-between p-4 hover:bg-gray-50 cursor-pointer"
                  onClick={() => setExpandedSession(expandedSession === session._id ? null : session._id)}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="inline-block bg-primary-600 text-white text-xs font-semibold px-2 py-0.5 rounded">
                        {session.batch}
                      </span>
                      <span className="inline-block bg-blue-100 text-blue-700 text-xs font-semibold px-2 py-0.5 rounded">
                        {session.branch}
                      </span>
                      {session.subject && (
                        <span className="inline-block bg-green-100 text-green-700 text-xs font-semibold px-2 py-0.5 rounded">
                          {session.subject}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                      <span>{new Date(session.sessionDate).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}</span>
                      <span>•</span>
                      <span>{session.lecturerId?.name || 'Unknown'}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-lg font-bold text-gray-900">{session.checkinCount}</p>
                      <p className="text-xs text-gray-400">students</p>
                    </div>
                    {expandedSession === session._id ? (
                      <FiChevronUp className="w-5 h-5 text-gray-400" />
                    ) : (
                      <FiChevronDown className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                </div>

                {/* Expanded: student list */}
                {expandedSession === session._id && session.checkins && session.checkins.length > 0 && (
                  <div className="border-t border-gray-100 bg-gray-50 p-4">
                    <p className="text-sm font-medium text-gray-700 mb-2">Checked-in Students:</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                      {session.checkins.map((c) => (
                        <div key={c._id} className="bg-white rounded px-3 py-2 text-sm">
                          <p className="font-medium text-gray-900">{c.studentName}</p>
                          {c.studentId && <p className="text-xs text-gray-400">Roll: {c.studentId}</p>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ExecutiveDashboard;
