import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FiClock, FiArrowLeft, FiUsers } from 'react-icons/fi';
import { saveAttendance, closeSession, getSession, getCheckins } from '../api/attendanceSessionApi';

const presentRefs = (rows) => rows.filter((row) => row.status === 'present')
  .map((row) => String(row.studentRef));

const sameRefSet = (left, right) => {
  const leftSet = new Set(left);
  const rightSet = new Set(right);
  return leftSet.size === rightSet.size && [...leftSet].every((ref) => rightSet.has(ref));
};

const SessionCheckins = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [attendanceMode, setAttendanceMode] = useState(null);
  const [summary, setSummary] = useState(null);
  const [checkins, setCheckins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [selectedRefs, setSelectedRefs] = useState([]);
  const [savedSelectedRefs, setSavedSelectedRefs] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const isEditable = attendanceMode === 'linked' && session?.isActive &&
    session.rosterSnapshot !== undefined;
  const isBusy = isSaving || isClosing;
  const hasUnsavedChanges = !sameRefSet(selectedRefs, savedSelectedRefs);

  useEffect(() => {
    let cancelled = false;
    const fetchData = async () => {
      setLoading(true);
      setError('');
      setActionError('');
      try {
        const [sessionRes, checkinsRes] = await Promise.all([getSession(id), getCheckins(id)]);
        if (cancelled) return;
        const payload = checkinsRes.data;
        const rows = payload.data || [];
        const refs = payload.mode === 'linked' ? presentRefs(rows) : [];
        setSession(sessionRes.data.data);
        setAttendanceMode(payload.mode);
        setSummary(payload.summary || null);
        setCheckins(rows);
        setSelectedRefs(refs);
        setSavedSelectedRefs(refs);
      } catch (err) {
        if (!cancelled) setError(err.response?.data?.message || 'Failed to load session data.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchData();
    return () => { cancelled = true; };
  }, [id]);

  const handleCheckboxChange = (studentRef) => {
    if (!isEditable || isBusy) return;
    const ref = String(studentRef);
    setSelectedRefs((refs) => refs.includes(ref)
      ? refs.filter((value) => value !== ref) : [...refs, ref]);
  };

  const handleSaveAttendance = async () => {
    if (!isEditable || isBusy || !hasUnsavedChanges) return;
    setIsSaving(true);
    setActionError('');
    try {
      const res = await saveAttendance(id, selectedRefs);
      const rows = res.data.data;
      const refs = presentRefs(rows);
      setCheckins(rows);
      setSummary(res.data.summary);
      setSelectedRefs(refs);
      setSavedSelectedRefs(refs);
    } catch (err) {
      setActionError(err.response?.data?.message || 'Failed to save attendance. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCloseSession = async () => {
    if (!isEditable || isBusy) return;
    if (hasUnsavedChanges) {
      setActionError('Save attendance before closing the session.');
      return;
    }
    setIsClosing(true);
    setActionError('');
    try {
      const res = await closeSession(id);
      setSession(res.data.data);
    } catch (err) {
      setActionError(err.response?.data?.message || 'Failed to close session. Please try again.');
    } finally {
      setIsClosing(false);
    }
  };

  const renderLegacyMode = () => {
    const students = checkins || [];

    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 rounded-lg hover:bg-gray-100">
            <FiArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Session Check-ins</h1>
            <p className="text-gray-500">
              {session.branch} Branch
              {session.subject && ` • ${session.subject}`}
              {' • '}
              {new Date(session.sessionDate).toLocaleDateString('en-GB', {
                weekday: 'short', day: 'numeric', month: 'short',
              })}
            </p>
          </div>
        </div>

        {/* Summary */}
        <div className="card flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-primary-50 rounded-xl">
              <FiUsers className="w-6 h-6 text-primary-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Students Checked In</p>
              <p className="text-3xl font-bold text-gray-900">{students.length}</p>
            </div>
          </div>
          <div className={`px-3 py-1 rounded-full text-xs font-medium ${session.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
            {session.isActive ? 'Active' : 'Closed'}
          </div>
        </div>

        {/* Checkins list */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Students ({students.length})
          </h3>
          {students.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <FiClock className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p>No students have checked in yet.</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {students.map((c, idx) => (
                <div
                  key={c._id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className="w-7 h-7 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center text-xs font-medium"
                    >
                      {idx + 1}
                    </span>
                    <div>
                      <p className="font-medium text-gray-900">{c.studentName}</p>
                      {c.studentId && <p className="text-xs text-gray-500">Roll: {c.studentId}</p>}
                    </div>
                  </div>
                  <p className="text-xs text-gray-400">
                    {new Date(c.checkedInAt).toLocaleTimeString('en-GB', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Info note */}
        <div className="card bg-blue-50 border-blue-200">
          <p className="text-sm text-blue-700">
            <strong>Note:</strong> Student checkin data is for reference only. To record official attendance, please use the <strong>Submit Attendance</strong> page where you can manually enter class details for Academic Manager approval.
          </p>
        </div>
      </div>
    );
  };


  if (loading) return <div className="flex items-center justify-center h-64">Loading session...</div>;
  if (error || !session) return <div role="alert" className="max-w-2xl mx-auto bg-red-50 text-red-700 p-4 rounded-lg">{error || 'Session not found.'}</div>;
  if (attendanceMode === 'legacy') return renderLegacyMode();
  if (attendanceMode !== 'linked') return <div role="alert" className="max-w-2xl mx-auto bg-red-50 text-red-700 p-4 rounded-lg">Session attendance mode is unavailable.</div>;

  const rosterCount = summary?.rosterCount ?? checkins.length;
  const presentCount = selectedRefs.length;
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate(-1)} aria-label="Go back" className="p-2 rounded-lg hover:bg-gray-100">
          <FiArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Session Attendance</h1>
          <p className="text-gray-500">{session.branch} Branch{session.subject && (' • ' + session.subject)}{' • '}
            {new Date(session.sessionDate).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
          </p>
        </div>
      </div>
      {!isEditable && (
        <div className="card bg-blue-50 text-sm text-blue-700">
          {!session.isActive && <p>This session is closed. Attendance is read-only.</p>}
          {session.rosterSnapshot === undefined && <p>Manual attendance editing is available for newer lecturer-managed sessions only. This session is read-only.</p>}
        </div>
      )}
      {actionError && <div role="alert" className="bg-red-50 text-red-700 p-4 rounded-lg">{actionError}</div>}
      <div className="grid grid-cols-3 gap-3" aria-live="polite">
        {[['Roster', rosterCount], ['Present', presentCount], ['Absent', rosterCount - presentCount]].map(([label, count]) => (
          <div key={label} className="bg-gray-50 rounded-xl p-3 sm:p-4">
            <div className="text-3xl font-bold text-gray-900">{count}</div>
            <div className="text-sm text-gray-500">{label}</div>
          </div>
        ))}
      </div>
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Roster ({rosterCount})</h2>
        {checkins.length === 0 ? <p className="text-center py-8 text-gray-500">No students in roster.</p> : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {checkins.map((row) => {
              const ref = String(row.studentRef);
              const isPresent = selectedRefs.includes(ref);
              return (
                <div key={ref} className="flex items-center justify-between gap-3 p-3 bg-gray-50 rounded-lg">
                  <label className="flex items-center gap-3 min-w-0">
                    {isEditable && <input type="checkbox" aria-label={('Mark ' + row.studentName + ' present')}
                      checked={isPresent} disabled={isBusy} onChange={() => handleCheckboxChange(ref)}
                      className="w-4 h-4 shrink-0 rounded border-gray-400 focus:ring-2 focus:ring-primary-500" />}
                    <span className="min-w-0 break-words">
                      <span className="block font-medium text-gray-900">{row.studentName}</span>
                      <span className="block text-xs text-gray-500">MIE ID: {row.mieStudentId}</span>
                      <span className="block text-xs text-gray-500">NCUK: {row.ncukId || '—'}</span>
                    </span>
                  </label>
                  <span className={('shrink-0 rounded-full px-2 py-1 text-xs font-medium ' + (isPresent ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-600'))}>
                    {isPresent ? 'Present' : 'Absent'}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
      {isEditable && (
        <div className="card space-y-4">
          <div className="flex flex-wrap gap-3">
            <button className="btn-secondary" disabled={isBusy || selectedRefs.length === checkins.length}
              onClick={() => setSelectedRefs(checkins.map((row) => String(row.studentRef)))}>Select All</button>
            <button className="btn-secondary" disabled={isBusy || selectedRefs.length === 0}
              onClick={() => setSelectedRefs([])}>Clear All</button>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button className="btn-primary" disabled={isBusy || !hasUnsavedChanges} onClick={handleSaveAttendance}>
              {isSaving ? 'Saving...' : 'Save Attendance'}
            </button>
            <button className="btn-danger" disabled={isBusy} onClick={handleCloseSession}>
              {isClosing ? 'Closing...' : 'Close Session'}
            </button>
            {hasUnsavedChanges && <span className="text-sm text-amber-700" role="status">Unsaved changes</span>}
          </div>
        </div>
      )}
    </div>
  );
};

export default SessionCheckins;
