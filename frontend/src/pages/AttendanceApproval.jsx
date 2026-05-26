import { useState, useEffect, useCallback } from 'react';
import {
  FiCheckCircle, FiXCircle, FiClock, FiRefreshCw,
} from 'react-icons/fi';
import { getPendingLogs, getAllLogs, approveLog, rejectLog } from '../api/attendanceApprovalApi';
import { useAuth } from '../context/AuthContext';
import ClassLogTable from '../components/ClassLogTable';
import ExportButtons from '../components/ExportButtons';

const statusConfig = {
  Pending: { bg: 'bg-orange-100', text: 'text-orange-700', label: 'Pending' },
  Approved: { bg: 'bg-green-100', text: 'text-green-700', label: 'Approved' },
  Rejected: { bg: 'bg-red-100', text: 'text-red-700', label: 'Rejected' },
};

const AttendanceApproval = () => {
  const { user } = useAuth();
  const [pendingLogs, setPendingLogs] = useState([]);
  const [reviewedLogs, setReviewedLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pending');
  const [toast, setToast] = useState(null);
  const [rejectModal, setRejectModal] = useState({ open: false, logId: null, reason: '' });
  const [reportMonth, setReportMonth] = useState(new Date().getMonth() + 1);
  const [reportYear, setReportYear] = useState(new Date().getFullYear());
  const [reportLecturerId, setReportLecturerId] = useState('all');

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [pendingRes, allRes] = await Promise.all([
        getPendingLogs(),
        getAllLogs(),
      ]);
      setPendingLogs(pendingRes.data.data);
      setReviewedLogs(allRes.data.data);
    } catch (err) {
      showToast('Failed to load data.', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleApprove = async (id) => {
    try {
      const res = await approveLog(id);
      showToast(res.data.message || 'Entry approved.');
      fetchData();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to approve.', 'error');
    }
  };

  const handleRejectSubmit = async () => {
    if (!rejectModal.reason.trim()) {
      showToast('Please enter a rejection reason.', 'error');
      return;
    }
    try {
      const res = await rejectLog(rejectModal.logId, rejectModal.reason);
      showToast(res.data.message || 'Entry rejected.');
      setRejectModal({ open: false, logId: null, reason: '' });
      fetchData();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to reject.', 'error');
    }
  };

  const openRejectModal = (logId) => {
    setRejectModal({ open: true, logId, reason: '' });
  };

  // Count entries (not logs) for stats
  const myPendingEntries = pendingLogs.reduce(
    (count, log) => count + (log.entries?.filter((e) => e.branch === user?.managedBranch && e.approvalStatus === 'Pending').length || 0),
    0
  );
  const myApprovedEntries = reviewedLogs.reduce(
    (count, log) => count + (log.entries?.filter((e) => e.branch === user?.managedBranch && e.approvalStatus === 'Approved').length || 0),
    0
  );
  const myRejectedEntries = reviewedLogs.reduce(
    (count, log) => count + (log.entries?.filter((e) => e.branch === user?.managedBranch && e.approvalStatus === 'Rejected').length || 0),
    0
  );

  // Client-side filter reviewed logs by month/year for the report
  const filteredReviewedLogs = reviewedLogs.filter((log) => {
    const d = new Date(log.date);
    return d.getMonth() + 1 === reportMonth && d.getFullYear() === reportYear;
  });

  // Further filter by selected lecturer
  const lectureFilteredLogs = reportLecturerId === 'all'
    ? filteredReviewedLogs
    : filteredReviewedLogs.filter((log) => log.lecturerId?._id === reportLecturerId);

  // Unique lecturers from reviewed logs for the dropdown
  const lecturerMap = new Map();
  reviewedLogs.forEach((log) => {
    if (log.lecturerId?._id && !lecturerMap.has(log.lecturerId._id)) {
      lecturerMap.set(log.lecturerId._id, log.lecturerId.name || 'Unknown');
    }
  });
  const uniqueLecturers = Array.from(lecturerMap, ([id, name]) => ({ id, name }));

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
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-sm font-medium ${
          toast.type === 'error' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-green-50 text-green-700 border border-green-200'
        }`}>
          {toast.msg}
        </div>
      )}

      <div>
        <h1 className="text-2xl font-bold text-gray-900">Attendance Approval</h1>
        <p className="text-gray-500">
          Review and approve class logs — {user?.managedBranch} Branch
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card flex items-center gap-4">
          <div className="p-3 bg-orange-50 rounded-xl">
            <FiClock className="w-6 h-6 text-orange-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Pending</p>
            <p className="text-2xl font-bold text-gray-900">{myPendingEntries}</p>
          </div>
        </div>
        <div className="card flex items-center gap-4">
          <div className="p-3 bg-green-50 rounded-xl">
            <FiCheckCircle className="w-6 h-6 text-green-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Approved</p>
            <p className="text-2xl font-bold text-gray-900">{myApprovedEntries}</p>
          </div>
        </div>
        <div className="card flex items-center gap-4">
          <div className="p-3 bg-red-50 rounded-xl">
            <FiXCircle className="w-6 h-6 text-red-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Rejected</p>
            <p className="text-2xl font-bold text-gray-900">{myRejectedEntries}</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200 pb-2">
        <button
          onClick={() => setActiveTab('pending')}
          className={`px-4 py-2 rounded-t-lg text-sm font-medium transition-colors ${
            activeTab === 'pending'
              ? 'bg-primary-50 text-primary-700 border-b-2 border-primary-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Pending ({myPendingEntries})
        </button>
        <button
          onClick={() => setActiveTab('reviewed')}
          className={`px-4 py-2 rounded-t-lg text-sm font-medium transition-colors ${
            activeTab === 'reviewed'
              ? 'bg-primary-50 text-primary-700 border-b-2 border-primary-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Reviewed ({myApprovedEntries + myRejectedEntries})
        </button>
        <div className="flex-1" />
        <button
          onClick={fetchData}
          className="btn-secondary text-sm flex items-center gap-1"
          disabled={loading}
        >
          <FiRefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Pending Tab */}
      {activeTab === 'pending' && (
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Pending Approvals — {user?.managedBranch}</h3>
          {loading ? (
            <div className="text-center py-8">
              <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
            </div>
          ) : pendingLogs.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <FiCheckCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <h3 className="text-lg font-medium text-gray-700 mb-1">All Caught Up!</h3>
              <p className="text-sm">No pending attendance entries to review.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingLogs.map((log) => {
                // Find the AM's entry in this log
                const myEntry = log.entries?.find((e) => e.branch === user?.managedBranch);
                const otherEntries = log.entries?.filter((e) => e.branch !== user?.managedBranch) || [];

                return (
                  <div key={log._id} className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-medium text-gray-900">
                            {log.lecturerId?.name || 'Unknown'}
                          </span>
                          <span className="text-xs text-gray-400">
                            {log.lecturerId?.email || ''}
                          </span>
                        </div>
                        <div className="text-sm text-gray-600">
                          {new Date(log.date).toLocaleDateString('en-GB', {
                            weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
                          })}
                        </div>

                        {/* Your branch entry — highlighted */}
                        {myEntry && (
                          <div className="mt-2 p-2 bg-primary-50 border border-primary-200 rounded-lg">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-semibold text-primary-700 uppercase tracking-wide">
                                Your Branch ({user?.managedBranch})
                              </span>
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusConfig[myEntry.approvalStatus]?.bg} ${statusConfig[myEntry.approvalStatus]?.text}`}>
                                {statusConfig[myEntry.approvalStatus]?.label}
                              </span>
                            </div>
                            <p className="text-sm font-medium text-gray-900 mt-1">
                              {myEntry.branch}: {myEntry.classes} class{myEntry.classes > 1 ? 'es' : ''}
                            </p>
                          </div>
                        )}

                        {/* Other branches — dimmed, read-only */}
                        {otherEntries.length > 0 && (
                          <div className="mt-1 text-xs text-gray-400">
                            Other branches:{' '}
                            {otherEntries.map((e) => {
                              const st = statusConfig[e.approvalStatus] || statusConfig.Pending;
                              return (
                                <span key={e.branch} className="inline-flex items-center mr-2">
                                  {e.branch}: {e.classes} class{e.classes > 1 ? 'es' : ''}
                                  <span className={`ml-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${st.bg} ${st.text}`}>
                                    {st.label}
                                  </span>
                                </span>
                              );
                            })}
                          </div>
                        )}

                        {log.remarks && (
                          <p className="text-xs text-gray-500 mt-1">Remarks: {log.remarks}</p>
                        )}
                      </div>

                      {/* Action buttons — only for AM's branch entry */}
                      {myEntry && myEntry.approvalStatus === 'Pending' && (
                        <div className="flex gap-2 flex-shrink-0">
                          <button
                            onClick={() => handleApprove(log._id)}
                            className="btn-success flex items-center gap-1.5 text-sm"
                          >
                            <FiCheckCircle className="w-4 h-4" />
                            Approve
                          </button>
                          <button
                            onClick={() => openRejectModal(log._id)}
                            className="btn-danger flex items-center gap-1.5 text-sm"
                          >
                            <FiXCircle className="w-4 h-4" />
                            Reject
                          </button>
                        </div>
                      )}
                      {myEntry && myEntry.approvalStatus !== 'Pending' && (
                        <div className="text-sm text-gray-500 flex-shrink-0">
                          Already <span className={`font-medium ${statusConfig[myEntry.approvalStatus]?.text}`}>{statusConfig[myEntry.approvalStatus]?.label}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Reviewed Tab */}
      {activeTab === 'reviewed' && (
        <div className="space-y-4">
          {/* Month/Year/Lecturer filter + Export */}
          <div className="card">
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
              <div className="flex flex-wrap gap-3">
                <div>
                  <label className="label">Month</label>
                  <select value={reportMonth} onChange={(e) => setReportMonth(parseInt(e.target.value))} className="input-field text-sm w-36">
                    {months.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Year</label>
                  <select value={reportYear} onChange={(e) => setReportYear(parseInt(e.target.value))} className="input-field text-sm w-28">
                    <option value="2025">2025</option>
                    <option value="2026">2026</option>
                    <option value="2027">2027</option>
                  </select>
                </div>
                <div>
                  <label className="label">Lecturer</label>
                  <select value={reportLecturerId} onChange={(e) => setReportLecturerId(e.target.value)} className="input-field text-sm w-44">
                    <option value="all">All Lecturers</option>
                    {uniqueLecturers.map((l) => (
                      <option key={l.id} value={l.id}>{l.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <ExportButtons
                logs={lectureFilteredLogs}
                month={reportMonth}
                year={reportYear}
                variant="manager"
                managedBranch={user?.managedBranch}
                userName={user?.name}
                lecturerName={reportLecturerId === 'all' ? null : uniqueLecturers.find((l) => l.id === reportLecturerId)?.name}
              />
            </div>
          </div>

          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {reportLecturerId === 'all' ? 'Reviewed Logs' : `${uniqueLecturers.find((l) => l.id === reportLecturerId)?.name || 'Attendance'} — `}
              {lectureFilteredLogs.length} log{lectureFilteredLogs.length !== 1 ? 's' : ''}
            </h3>
            {loading ? (
              <div className="text-center py-8">
                <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
              </div>
            ) : lectureFilteredLogs.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <FiClock className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No reviewed logs for this selection.</p>
              </div>
            ) : (
              <ClassLogTable logs={lectureFilteredLogs} showLecturer={reportLecturerId === 'all'} managedBranch={user?.managedBranch} />
            )}
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {rejectModal.open && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Reject {user?.managedBranch} Entry
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              Please provide a reason for rejection. The lecturer will see this reason.
            </p>
            <textarea
              value={rejectModal.reason}
              onChange={(e) => setRejectModal((prev) => ({ ...prev, reason: e.target.value }))}
              className="input-field w-full"
              rows={3}
              placeholder="e.g., Incorrect class count, date mismatch..."
              autoFocus
            />
            <div className="flex gap-3 justify-end mt-4">
              <button
                onClick={() => setRejectModal({ open: false, logId: null, reason: '' })}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleRejectSubmit}
                className="btn-danger"
              >
                Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AttendanceApproval;
