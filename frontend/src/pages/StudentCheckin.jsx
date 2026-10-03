import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FiCheckCircle, FiAlertCircle, FiUsers } from 'react-icons/fi';
import { getSessionByCode, studentCheckin } from '../api/attendanceSessionApi';

const StudentCheckin = () => {
  const { code: urlCode } = useParams();
  const navigate = useNavigate();

  const [code, setCode] = useState(urlCode || '');
  const [studentName, setStudentName] = useState('');
  const [studentId, setStudentId] = useState('');
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(!!urlCode);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // If code is in URL, fetch session info on mount
  useEffect(() => {
    if (urlCode) {
      fetchSession(urlCode);
    }
  }, [urlCode]);

  const fetchSession = async (sessionCode) => {
    setCheckingSession(true);
    setError('');
    setSuccess('');
    try {
      const res = await getSessionByCode(sessionCode.toUpperCase());
      const data = res.data.data || {};
      // Clear stale fields from previous session before setting new one
      clearStudentFields();
      setSession({
        ...data,
      });
    } catch (err) {
      setError(err.response?.data?.message || 'Session not found.');
      setSession(null);
    } finally {
      setCheckingSession(false);
    }
  };

  // Clear only studentName and studentId
  const clearStudentFields = () => {
    setStudentName('');
    setStudentId('');
  };

  // Clear student fields, error, success, session, and code
  const resetSessionState = () => {
    clearStudentFields();
    setError('');
    setSuccess('');
    setSession(null);
    setCode('');
  };

  const handleCodeSubmit = async (e) => {
    e.preventDefault();
    if (!code.trim()) {
      setError('Please enter a session code.');
      return;
    }
    await fetchSession(code.trim());
  };

  const handleCheckin = async (e) => {
    e.preventDefault();

    // At the beginning of a valid submit attempt, clear error/success
    setError('');
    setSuccess('');

    if (!session) {
      setError('No active session. Please enter a valid code first.');
      return;
    }

    // Determine mode and validate
    const isLinked = session.checkinMode === 'linked';
    const isLegacy = session.checkinMode === 'legacy';
    const isUnavailable = !isLinked && !isLegacy;

    if (isUnavailable) {
      setError('This attendance session is unavailable because its roster linkage is incomplete. Please contact your lecturer.');
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      let res;

      if (isLinked) {
        // Linked: submit only studentId
        const mieStudentId = (studentId || '').trim();
        if (!mieStudentId) {
          setError('Student MIE ID is required.');
          setLoading(false);
          return;
        }
        res = await studentCheckin(session._id, {
          studentId: mieStudentId,
        });
      } else if (isLegacy) {
        // Legacy: submit studentName and studentId
        if (!studentName.trim()) {
          setError('Please enter your name.');
          setLoading(false);
          return;
        }
        res = await studentCheckin(session._id, {
          studentName: studentName.trim(),
          studentId: (studentId || '').trim(),
        });
      }

      // After successful real request
      setSuccess(res.data.message);
      // Update checkin count from backend - do NOT manually increment
      setSession((prev) =>
        prev
          ? {
              ...prev,
              checkinCount: res.data.data.checkinCount,
            }
          : prev
      );
      // Clear only student fields - keep success visible
      clearStudentFields();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to check in. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // When "Enter a different code" is clicked
  const handleReset = () => {
    resetSessionState();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-blue-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-14 h-14 bg-primary-600 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg">
            <FiUsers className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-xl font-bold text-gray-900">Student Check-In</h1>
          <p className="text-gray-500 text-sm mt-1">Mark your attendance for class</p>
        </div>

        <div className="card shadow-xl">
          {/* Success message */}
          {success && (
            <div className="bg-green-50 text-green-700 px-4 py-3 rounded-lg text-sm mb-4 flex items-center gap-2">
              <FiCheckCircle className="w-5 h-5 flex-shrink-0" />
              <span>{success}</span>
            </div>
          )}

          {/* Error message */}
          {error && (
            <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm mb-4 flex items-center gap-2">
              <FiAlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Session info */}
          {session && (
            <div className="bg-primary-50 border border-primary-200 rounded-lg p-3 mb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-primary-800">{session.branch} Branch</p>
                  {session.subject && <p className="text-xs text-primary-600">{session.subject}</p>}
                  <p className="text-xs text-primary-500 mt-1">
                    {new Date(session.sessionDate).toLocaleDateString('en-GB', {
                      weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
                      hour: '2-digit', minute: '2-digit',
                    })}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-primary-700">{session.checkinCount}</p>
                  <p className="text-xs text-primary-500">checked in</p>
                </div>
              </div>
              {!session.isActive && (
                <p className="text-xs text-red-600 mt-2 font-medium">This session is closed.</p>
              )}
            </div>
          )}

          {/* Step 1: Enter session code (if not from URL) */}
          {!session && (
            <form onSubmit={handleCodeSubmit} className="space-y-4">
              <div>
                <label className="label">Session Code</label>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  className="input-field text-center text-2xl font-mono tracking-widest uppercase"
                  placeholder="X7K9"
                  maxLength={6}
                  autoFocus
                />
                <p className="text-xs text-gray-400 mt-1">Enter the code shown by your lecturer</p>
              </div>
              <button
                type="submit"
                disabled={checkingSession || !code.trim()}
                className="btn-primary w-full"
              >
                {checkingSession ? 'Checking...' : 'Continue'}
              </button>
            </form>
          )}

          {/* Step 2: Enter student details - mode-specific */}
          {session && session.isActive && (
            <form onSubmit={handleCheckin} className="space-y-4">
              {session.checkinMode === 'linked' && (
                <>
                  <label className="label">MIE Student ID <span className="text-red-500">*</span></label>
                  <div>
                    <input
                      type="text"
                      value={studentId}
                      onChange={(e) => setStudentId(e.target.value)}
                      className="input-field"
                      placeholder="e.g., MIE-26-XXXXXXXX"
                      required
                      autoFocus
                    />
                    <p className="text-xs text-gray-500 mt-1">Enter the MIE Student ID assigned by MIE Pathways.</p>

                  <button
                    type="submit"
                    disabled={loading || !studentId.trim()}
                    className="btn-primary w-full"
                  >
                    {loading ? 'Checking in...' : 'Check In'}
                  </button>
                  </div>
                  {/* Do NOT show studentName field for linked mode */}
                </>
              )}
              {session.checkinMode === 'legacy' && (
                <>
                  <div>
                    <label className="label">Your Name <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      value={studentName}
                      onChange={(e) => setStudentName(e.target.value)}
                      className="input-field"
                      placeholder="Enter your full name"
                      required
                      autoFocus
                    />
                  </div>
                  <div>
                    <label className="label">Roll Number <span className="text-gray-400 font-normal">(optional)</span></label>
                    <input
                      type="text"
                      value={studentId}
                      onChange={(e) => setStudentId(e.target.value)}
                      className="input-field"
                      placeholder="e.g., 2024-001"
                    />

                    <button
                      type="submit"
                      disabled={loading || !studentName.trim()}
                      className="btn-primary w-full"
                    >
                      {loading ? 'Checking in...' : 'Check In'}
                    </button>
</div>
                </>
              )}
              {/* Invalid/unknown mode: no form fields, just unavailable message */}
              {session.checkinMode === 'invalid' && (
                <p className="text-xs text-gray-500 mb-2">This attendance session is unavailable because its roster linkage is incomplete. Please contact your lecturer.</p>
              )}
            </form>
          )}

          {/* Change code link */}
          {session && (
            <button
              onClick={() => { handleReset(); }}
              className="text-xs text-primary-600 hover:underline mt-4 block mx-auto"
            >
              Enter a different code
            </button>
          )}
        </div>

        <p className="text-center text-xs text-gray-400 mt-4">
          MIE Faculty Attendance System
        </p>
      </div>
    </div>
  );
};

export default StudentCheckin;
