import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FiClock, FiArrowLeft, FiUsers, FiCheckCircle, FiXCircle } from 'react-icons/fi';
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

  const formatDate = (dateString) => {
    if (!dateString) return 'Date unavailable';
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return 'Date unavailable';
    return date.toLocaleDateString('en-GB', {
      weekday: 'short', day: 'numeric', month: 'short',
    });
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
              {formatDate(session.sessionDate)}
            </p>
          </div>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-primary-50 rounded-xl p-3">
            <FiUsers className="w-5 h-5 text-primary-600 mb-2" />
            <p className="text-xs text-gray-500">Students Checked In</p>
            <p className="text-2xl font-bold text-gray-900">{students.length}</p>
          </div>
          <div className={`px-3 py-1.5 rounded-full text-xs font-medium ${session.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
            {session.isActive ? 'Active' : 'Closed'}
          </div>
        </div>

        {/* Checkins list */}
        <div className="grid grid-cols-1 gap-2 max-h-96 overflow-y-auto">
          {students.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <FiClock className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p>No students have checked in yet.</p>
            </div>
          ) : (
            <div>
              {students.map((c, idx) => (
                <div
                  key={c._id}
                  className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg border border-gray-200"
                >
                  <span className="w-6 h-6 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center text-xs font-medium">
                    {idx + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{c.studentName}</p>
                    {c.studentId && <p className="text-xs text-gray-500">Roll: {c.studentId}</p>}
                    <p className="text-xs text-gray-500">NCUK: {c.ncukId || '—'}</p>
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
  const absentCount = rosterCount - presentCount;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-start gap-3 sm:gap-4">
        <button
          type="button"
          onClick={() => navigate(-1)}
          aria-label="Go back"
          className="rounded-lg p-2 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
        >
          <FiArrowLeft className="h-5 w-5" />
        </button>
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex flex-wrap gap-2">
            <span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
              {session.year || 'Unspecified year'}
            </span>
            {session.batch && (
              <span className="rounded bg-primary-600 px-2 py-0.5 text-xs font-semibold text-white">
                {session.batch}
              </span>
            )}
            {session.branch && (
              <span className="rounded bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700">
                {session.branch}
              </span>
            )}
            {session.subject && (
              <span className="rounded bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700">
                {session.subject}
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">Session Attendance</h1>
            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
              session.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
            }`}>
              {session.isActive
                ? <FiCheckCircle className="h-4 w-4" aria-hidden="true" />
                : <FiXCircle className="h-4 w-4" aria-hidden="true" />}
              {session.isActive ? 'Active' : 'Closed'}
            </span>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            {formatDate(session.sessionDate)}
            {' • '}
            {session.rosterSnapshot !== undefined ? 'Roster-backed attendance' : 'Legacy linked session'}
          </p>
        </div>
      </div>

      {!isEditable && (
        <div className="card border-blue-200 bg-blue-50 text-sm text-blue-700">
          {!session.isActive && <p>This session is closed. Attendance is read-only.</p>}
          {session.rosterSnapshot === undefined && (
            <p>Manual attendance editing is available for newer lecturer-managed sessions only. This session is read-only.</p>
          )}
        </div>
      )}

      {actionError && <div role="alert" className="bg-red-50 text-red-700 p-4 rounded-lg">{actionError}</div>}

      <div className="grid grid-cols-3 gap-2 sm:gap-3" aria-live="polite">
        <div className="rounded-xl bg-primary-50 p-3 sm:p-4">
          <FiUsers className="mb-2 h-5 w-5 text-primary-600" aria-hidden="true" />
          <div className="text-2xl font-bold text-gray-900">{rosterCount}</div>
          <div className="text-sm text-gray-500">Roster</div>
        </div>
        <div className="rounded-xl bg-green-50 p-3 sm:p-4">
          <FiCheckCircle className="mb-2 h-5 w-5 text-green-600" aria-hidden="true" />
          <div className="text-2xl font-bold text-gray-900">{presentCount}</div>
          <div className="text-sm text-gray-500">Present</div>
        </div>
        <div className="rounded-xl bg-red-50 p-3 sm:p-4">
          <FiXCircle className="mb-2 h-5 w-5 text-red-500" aria-hidden="true" />
          <div className="text-2xl font-bold text-gray-900">{absentCount}</div>
          <div className="text-sm text-gray-500">Absent</div>
        </div>
      </div>

      <section className="card" aria-labelledby="roster-heading">
        <h2 id="roster-heading" className="mb-4 text-lg font-semibold text-gray-900">
          Roster ({rosterCount})
        </h2>
        {checkins.length === 0 ? (
          <p className="py-8 text-center text-gray-500">No students in roster.</p>
        ) : (
          <>
            <div className="space-y-2 md:hidden">
              {checkins.map((row) => {
                const ref = String(row.studentRef);
                const isPresent = selectedRefs.includes(ref);
                return (
                  <div
                    key={ref}
                    className={`flex items-start gap-3 rounded-lg border p-3 ${
                      isPresent ? 'border-green-200 bg-green-50/60' : 'border-gray-200 bg-white'
                    }`}
                  >
                    {isEditable && (
                      <input
                        type="checkbox"
                        checked={isPresent}
                        disabled={isBusy}
                        onChange={() => handleCheckboxChange(ref)}
                        aria-label={`Mark ${row.studentName} present`}
                        className="mt-1 h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-2 focus:ring-primary-500"
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-gray-900">{row.studentName}</p>
                      <dl className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                        <div>
                          <dt className="sr-only">MIE ID</dt>
                          <dd className="whitespace-nowrap">MIE: {row.mieStudentId || '—'}</dd>
                        </div>
                        <div>
                          <dt className="sr-only">NCUK ID</dt>
                          <dd className="whitespace-nowrap">NCUK: {row.ncukId || '—'}</dd>
                        </div>
                      </dl>
                    </div>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${
                      isPresent ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {isPresent ? 'Present' : 'Absent'}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="hidden overflow-x-auto md:block">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50">
                  <tr className="border-b border-gray-200">
                    {isEditable && <th scope="col" className="w-12 px-3 py-3"><span className="sr-only">Present</span></th>}
                    <th scope="col" className="px-3 py-3 text-left font-semibold text-gray-700">Student</th>
                    <th scope="col" className="px-3 py-3 text-left font-semibold text-gray-700">MIE ID</th>
                    <th scope="col" className="px-3 py-3 text-left font-semibold text-gray-700">NCUK ID</th>
                    <th scope="col" className="px-3 py-3 text-right font-semibold text-gray-700">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {checkins.map((row) => {
                    const ref = String(row.studentRef);
                    const isPresent = selectedRefs.includes(ref);
                    return (
                      <tr key={ref} className={`border-b border-gray-100 ${isPresent ? 'bg-green-50/40' : 'hover:bg-gray-50'}`}>
                        {isEditable && (
                          <td className="px-3 py-3">
                            <input
                              type="checkbox"
                              checked={isPresent}
                              disabled={isBusy}
                              onChange={() => handleCheckboxChange(ref)}
                              aria-label={`Mark ${row.studentName} present`}
                              className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-2 focus:ring-primary-500"
                            />
                          </td>
                        )}
                        <td className="px-3 py-3 font-medium text-gray-900">{row.studentName}</td>
                        <td className="px-3 py-3 text-gray-700">{row.mieStudentId || '—'}</td>
                        <td className="px-3 py-3 text-gray-700">{row.ncukId || '—'}</td>
                        <td className="px-3 py-3 text-right">
                          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                            isPresent ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                          }`}>
                            {isPresent ? 'Present' : 'Absent'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>

      {isEditable && (
        <div className="sticky bottom-2 z-20 rounded-xl border border-gray-200 bg-white/95 p-3 shadow-lg backdrop-blur sm:bottom-4 sm:p-4">
          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center sm:gap-3">
            <button type="button" className="btn-secondary justify-center text-sm" disabled={isBusy || selectedRefs.length === checkins.length}
              onClick={() => setSelectedRefs(checkins.map((row) => String(row.studentRef)))}>Select All</button>
            <button type="button" className="btn-secondary justify-center text-sm" disabled={isBusy || selectedRefs.length === 0}
              onClick={() => setSelectedRefs([])}>Clear All</button>
            <button type="button" className="btn-primary justify-center text-sm" disabled={isBusy || !hasUnsavedChanges} onClick={handleSaveAttendance}>
              {isSaving ? 'Saving...' : 'Save Attendance'}
            </button>
            <button type="button" className="btn-danger justify-center text-sm" disabled={isBusy} onClick={handleCloseSession}>
              {isClosing ? 'Closing...' : 'Close Session'}
            </button>
            {hasUnsavedChanges && <span className="col-span-2 text-sm text-amber-700" role="status">Unsaved changes</span>}
          </div>
        </div>
      )}
    </div>
  );
};

export default SessionCheckins;
