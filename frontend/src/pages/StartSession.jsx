import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiPlay, FiClock, FiCheckCircle, FiUsers, FiAlertCircle } from 'react-icons/fi';
import { createSessionFromSheet, getMySessions } from '../api/attendanceSessionApi';
import { getWorkbook } from '../api/workbookApi';
import { useAuth } from '../context/AuthContext';

const StartSession = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [workbook, setWorkbook] = useState(null);
  const [loading, setLoading] = useState('loading');
  const [selectedSheetIndex, setSelectedSheetIndex] = useState(null);
  const [error, setError] = useState(null);
  const [creating, setCreating] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [sessions, setSessions] = useState([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [sessionsError, setSessionsError] = useState(null);
  const [retrySessionsCount, setRetrySessionsCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    setError(null);
    setLoading('loading');
    getWorkbook()
      .then((res) => {
        if (!cancelled) {
          setWorkbook(res.data.data);
          setLoading('idle');
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError('Failed to load workbook. Retry.');
          setLoading('error');
        }
      });

    return () => {
      cancelled = true;
    };
  }, [user, retryCount]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    setSessionsError(null);
    setSessionsLoading(true);
    getMySessions()
      .then((res) => {
        if (!cancelled) {
          setSessions(Array.isArray(res.data.data) ? res.data.data : []);
          setSessionsLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSessionsError('Failed to load sessions. Retry.');
          setSessionsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [user, retrySessionsCount]);

  const sheets = workbook?.sheets || [];
  const hasSheets = sheets.length > 0;
  // A session belongs to exactly one group. Cancellation is independent of
  // isActive, so it is evaluated for both remaining groups.
  const cancelledSessions = sessions.filter((session) => Boolean(session.cancelledAt));
  const activeSessions = sessions.filter(
    (session) => session.isActive === true && !session.cancelledAt
  );
  const closedSessions = sessions.filter(
    (session) => session.isActive === false && !session.cancelledAt
  );
  const canStart =
    loading === 'idle' &&
    Boolean(workbook?._id) &&
    Number.isInteger(selectedSheetIndex) &&
    selectedSheetIndex >= 0 &&
    Boolean(sheets[selectedSheetIndex]) &&
    !creating;

  const handleSelectSheet = (index) => {
    setSelectedSheetIndex(index);
    setError(null);
  };

  const handleCreateSession = async (e) => {
    e.preventDefault();
    if (!canStart) return;
    setCreating(true);
    setError(null);
    try {
      const sheet = sheets[selectedSheetIndex];
      if (!sheet) return;
      const payload = {
        workbookId: workbook._id,
        sheetIndex: selectedSheetIndex,
        branch: sheet.branch,
        batch: sheet.batch,
        subject: sheet.subject,
      };
      const res = await createSessionFromSheet(payload);
      navigate(`/session/${res.data.data._id}/checkins`);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to start session.');
    } finally {
      setCreating(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Date unavailable';
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return 'Date unavailable';
    return date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const renderSessionCard = (session, status) => {
    const presentCount = session.checkinCount ?? 0;
    const isActive = status === 'active';
    const isCancelled = status === 'cancelled';
    return (
      <article
        key={session._id}
        className={`rounded-lg border bg-white p-4 transition-colors ${
          isCancelled
            ? 'border-red-200 hover:border-red-300'
            : 'border-gray-200 hover:border-gray-300'
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              {session.year && (
                <span className="inline-block bg-amber-100 text-amber-700 text-xs font-semibold px-2 py-0.5 rounded">
                  {session.year}
                </span>
              )}
              {session.batch && (
                <span className="inline-block bg-primary-600 text-white text-xs font-semibold px-2 py-0.5 rounded">
                  {session.batch}
                </span>
              )}
              {session.branch && (
                <span className="inline-block bg-blue-100 text-blue-700 text-xs font-semibold px-2 py-0.5 rounded">
                  {session.branch}
                </span>
              )}
              {session.subject && (
                <span className="inline-block bg-green-100 text-green-700 text-xs font-semibold px-2 py-0.5 rounded">
                  {session.subject}
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500">{formatDate(session.sessionDate)}</p>
          </div>
          <span
            className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
              isCancelled
                ? 'bg-red-100 text-red-800'
                : isActive
                  ? 'bg-green-100 text-green-800'
                  : 'bg-gray-100 text-gray-700'
            }`}
          >
            {isCancelled ? 'Cancelled' : isActive ? 'Active' : 'Closed'}
          </span>
        </div>
        {isCancelled && (
          <p className="mt-2 rounded bg-red-50 px-2 py-1 text-xs text-red-800">
            <span className="font-semibold">Reason:</span>{' '}
            {session.cancellationReason || 'No reason recorded.'}
          </p>
        )}
        <div className={`flex items-center justify-between text-sm text-gray-600 ${isCancelled ? 'mt-2' : 'mt-3'}`}>
          <div className="flex items-center gap-1">
            <FiUsers className="w-4 h-4" />
            <span className="font-medium text-gray-800">{presentCount}</span>
            <span className="text-gray-400">present</span>
          </div>
          <button
            type="button"
            onClick={() => navigate(`/session/${session._id}/checkins`)}
            className="btn-secondary text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
          >
            {isActive ? 'Resume' : 'Review'}
          </button>
        </div>
      </article>
    );
  };

  const renderSessionGroup = (title, groupSessions, status, icon) => (
    <section aria-labelledby={`${status}-sessions-heading`}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3
          id={`${status}-sessions-heading`}
          className="flex items-center gap-2 font-semibold text-gray-900"
        >
          <span className="text-lg">{icon}</span>
          {title}
        </h3>
        <span className="text-sm text-gray-500">{groupSessions.length}</span>
      </div>
      {groupSessions.length === 0 ? (
        <p className="rounded-lg bg-gray-50 p-4 text-sm text-gray-500">
          No {status} sessions.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {groupSessions.map((session) => renderSessionCard(session, status))}
        </div>
      )}
    </section>
  );

  const sheetsByBatch = {};
  sheets.forEach((s, i) => {
    if (!sheetsByBatch[s.batch]) sheetsByBatch[s.batch] = [];
    sheetsByBatch[s.batch].push({ ...s, index: i });
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Attendance Sessions</h1>
        <p className="text-gray-500">Start a new session or return to an existing one</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <section className="card space-y-5 lg:col-span-1" aria-labelledby="start-session-heading">
          <h2 id="start-session-heading" className="text-lg font-semibold text-gray-900">
            Start New Session
          </h2>

          {loading === 'loading' ? (
            <p className="text-sm text-gray-500">Loading workbook...</p>
          ) : loading === 'error' ? (
            <div className="space-y-3">
              <p role="alert" className="text-sm text-red-700">{error}</p>
              <button
                type="button"
                onClick={() => setRetryCount((count) => count + 1)}
                className="btn-secondary text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
              >
                Retry workbook
              </button>
            </div>
          ) : !workbook || !hasSheets ? (
            <div className="space-y-3">
              <p className="text-sm text-gray-500">
                No class sheets available. Add a sheet in Marks Management first.
              </p>
              <a
                href="/marks"
                className="btn-primary inline-flex text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
              >
                Go to Marks Management
              </a>
            </div>
          ) : (
            <form onSubmit={handleCreateSession} className="space-y-5">
              <fieldset disabled={creating}>
                <legend className="label">Select Sheet</legend>
                <div className="space-y-3">
                  {Object.keys(sheetsByBatch).map((batch) => (
                    <div key={batch} className="space-y-2">
                      <span className="text-xs font-semibold text-gray-500 block mb-1">{batch}</span>
                      {sheetsByBatch[batch].map((sheet) => (
                        <label
                          key={sheet.index}
                          className={`flex cursor-pointer items-center justify-between rounded-lg border px-4 py-3 transition-colors focus-within:ring-2 focus-within:ring-primary-500 focus-within:ring-offset-2 ${
                            selectedSheetIndex === sheet.index
                              ? 'border-primary-300 bg-primary-50 text-primary-700'
                              : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                          }`}
                        >
                          <input
                            type="radio"
                            name="sheet"
                            value={sheet.index}
                            checked={selectedSheetIndex === sheet.index}
                            onChange={() => handleSelectSheet(sheet.index)}
                            className="sr-only focus-visible:outline-none"
                          />
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {sheet.year && (
                                <span className="inline-block bg-amber-100 text-amber-700 text-xs font-semibold px-2 py-0.5 rounded">
                                  {sheet.year}
                                </span>
                              )}
                              {sheet.branch && (
                                <span className="inline-block bg-blue-100 text-blue-700 text-xs font-semibold px-2 py-0.5 rounded">
                                  {sheet.branch}
                                </span>
                              )}
                              <span className="text-sm font-medium text-gray-900 truncate">{sheet.subject}</span>
                              <span className="text-xs text-gray-400">({sheet.students?.length ?? 0})</span>
                            </div>
                          </div>
                          {selectedSheetIndex === sheet.index && (
                            <FiCheckCircle className="w-5 h-5 text-primary-600 shrink-0 ml-3" />
                          )}
                        </label>
                      ))}
                    </div>
                  ))}
                </div>
              </fieldset>

              <button
                type="submit"
                disabled={!canStart}
                className="btn-primary flex w-full items-center justify-center gap-2"
              >
                <FiPlay className="h-4 w-4" />
                {creating ? 'Creating...' : 'Start Attendance'}
              </button>

              {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
            </form>
          )}
        </section>

        <section className="card space-y-6 lg:col-span-2" aria-labelledby="sessions-heading">
          <h2 id="sessions-heading" className="text-lg font-semibold text-gray-900">
            Your Sessions
          </h2>

          {sessionsLoading ? (
            <p className="text-sm text-gray-500">Loading sessions...</p>
          ) : sessionsError ? (
            <div className="space-y-3">
              <p role="alert" className="text-sm text-red-700">{sessionsError}</p>
              <button
                type="button"
                onClick={() => setRetrySessionsCount((count) => count + 1)}
                className="btn-secondary text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
              >
                Retry sessions
              </button>
            </div>
          ) : sessions.length === 0 ? (
            <p className="rounded-lg bg-gray-50 p-4 text-sm text-gray-500">
              No attendance sessions yet. Start one from a class sheet.
            </p>
          ) : (
            <div className="space-y-8">
              {renderSessionGroup('Active Sessions', activeSessions, 'active', <FiClock className="w-5 h-5 text-green-600" />)}
              {renderSessionGroup('Closed Sessions', closedSessions, 'closed', <FiCheckCircle className="w-5 h-5 text-gray-500" />)}
              {renderSessionGroup('Cancelled Sessions', cancelledSessions, 'cancelled', <FiAlertCircle className="w-5 h-5 text-red-600" />)}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default StartSession;
