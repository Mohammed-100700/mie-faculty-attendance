import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiPlay } from 'react-icons/fi';
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
  const activeSessions = sessions.filter((session) => session.isActive === true);
  const closedSessions = sessions.filter((session) => session.isActive === false);
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

  const renderSessionCard = (session, isActive) => {
    const sessionDate = session.sessionDate ? new Date(session.sessionDate) : null;
    const date = sessionDate && !Number.isNaN(sessionDate.getTime())
      ? sessionDate.toLocaleDateString('en-GB', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        })
      : 'Date unavailable';

    return (
      <article key={session._id} className="rounded-lg border border-gray-200 bg-white p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h4 className="break-words font-medium text-gray-900">
              {session.subject?.trim() || 'No subject'}
            </h4>
            <p className="mt-1 text-xs text-gray-500">{date}</p>
          </div>
          <span
            className={`shrink-0 rounded-full px-2 py-1 text-xs font-medium ${
              isActive
                ? 'bg-green-100 text-green-800'
                : 'bg-gray-100 text-gray-700'
            }`}
          >
            {isActive ? 'Active' : 'Closed'}
          </span>
        </div>
        <dl className="mt-3 space-y-1 text-sm text-gray-600">
          <div className="flex justify-between gap-3">
            <dt>Branch</dt>
            <dd className="text-right font-medium text-gray-800">{session.branch || '—'}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt>Batch</dt>
            <dd className="text-right font-medium text-gray-800">{session.batch || '—'}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt>Present</dt>
            <dd className="text-right font-medium text-gray-800">{session.checkinCount ?? 0}</dd>
          </div>
        </dl>
        <button
          type="button"
          onClick={() => navigate(`/session/${session._id}/checkins`)}
          className="btn-secondary mt-4 w-full text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
        >
          {isActive ? 'Resume' : 'Review'}
        </button>
      </article>
    );
  };

  const renderSessionGroup = (title, groupSessions, isActive) => (
    <section aria-labelledby={`${isActive ? 'active' : 'closed'}-sessions-heading`}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3
          id={`${isActive ? 'active' : 'closed'}-sessions-heading`}
          className="font-semibold text-gray-900"
        >
          {title}
        </h3>
        <span className="text-sm text-gray-500">{groupSessions.length}</span>
      </div>
      {groupSessions.length === 0 ? (
        <p className="rounded-lg bg-gray-50 p-4 text-sm text-gray-500">
          {isActive ? 'No active sessions.' : 'No closed sessions.'}
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {groupSessions.map((session) => renderSessionCard(session, isActive))}
        </div>
      )}
    </section>
  );

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Attendance Sessions</h1>
        <p className="text-gray-500">Start a new session or return to an existing one</p>
      </div>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-3">
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
                <div className="flex flex-col space-y-2">
                  {sheets.map((sheet, index) => (
                    <label
                      key={index}
                      className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border px-4 py-2.5 transition-colors focus-within:ring-2 focus-within:ring-primary-500 focus-within:ring-offset-2 ${
                        selectedSheetIndex === index
                          ? 'border-primary-300 bg-primary-50 text-primary-700'
                          : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="sheet"
                        value={index}
                        checked={selectedSheetIndex === index}
                        onChange={() => handleSelectSheet(index)}
                        className="sr-only focus-visible:outline-none"
                      />
                      <span className="text-center font-medium">
                        {sheet.name || `Sheet ${index}`}
                      </span>
                      {sheet.year && <span className="mt-1 text-xs text-gray-500">{sheet.year}</span>}
                      {sheet.branch && <span className="mt-1 text-xs text-gray-500">{sheet.branch}</span>}
                      {sheet.batch && <span className="mt-1 text-xs text-gray-500">{sheet.batch}</span>}
                      {sheet.subject && <span className="mt-1 text-xs text-gray-500">{sheet.subject}</span>}
                    </label>
                  ))}
                </div>
              </fieldset>

              <button
                type="submit"
                disabled={!canStart}
                className="btn-primary flex w-full items-center justify-center gap-2"
              >
                <FiPlay className="h-4 w-4" />
                {creating ? 'Creating...' : 'Start Session'}
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
              {renderSessionGroup('Active Sessions', activeSessions, true)}
              {renderSessionGroup('Closed Sessions', closedSessions, false)}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default StartSession;
