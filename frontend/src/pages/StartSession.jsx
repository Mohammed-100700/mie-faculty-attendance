import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiPlay } from 'react-icons/fi';
import { createSessionFromSheet } from '../api/attendanceSessionApi';
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

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    setError(null);
    setLoading('loading');
    getWorkbook().then((res) => {
      if (!cancelled) {
        setWorkbook(res.data.data);
        setLoading('idle');
      }
    }).catch((err) => {
      if (!cancelled) {
        setError('Failed to load workbook. Retry.');
        setLoading('error');
      }
    });
    return () => {
      cancelled = true;
    };
  }, [user, retryCount]);

  const sheets = workbook?.sheets || [];
  const hasSheets = sheets.length > 0;

  if (loading === 'loading') {
    return (
      <div className="max-w-md mx-auto space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Loading Workbook</h1>
        <p className="text-gray-500">Please wait...</p>
      </div>
    );
  }

  if (loading === 'error') {
    return (
      <div className="max-w-md mx-auto space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Load Error</h1>
        <p role="alert" className="text-gray-500">{error}</p>
        <button
          onClick={() => setRetryCount((c) => c + 1)}
          className="btn-primary mt-3"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!hasSheets && workbook) {
    return (
      <div className="max-w-md mx-auto space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Start Attendance Session</h1>
        <p className="text-gray-500">
          No class sheets available. Add a sheet in Marks Management first.
        </p>
        <a href="/marks" className="btn-primary">Go to Marks Management</a>
      </div>
    );
  }

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
      setError(
        err.response?.data?.message || 'Failed to start session.'
      );
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="max-w-md mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Start Attendance Session</h1>
      <p className="text-gray-500">Create a session to record student attendance</p>

      <form onSubmit={handleCreateSession} className="space-y-6">
        <div>
          <label className="label">Select Sheet</label>
          <div className="flex flex-col space-y-2">
            {sheets.map((sheet, index) => (
              <label
                key={index}
                className={`flex flex-col items-center justify-center px-4 py-2.5 rounded-lg border cursor-pointer transition-colors focus-within:ring-2 focus-within:ring-primary-500 focus-within:ring-offset-2 ${
                  selectedSheetIndex === index
                    ? 'bg-primary-50 border-primary-300 text-primary-700'
                    : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                <input
                  type="radio"
                  name="sheet"
                  value={index}
                  checked={selectedSheetIndex === index}
                  onChange={() => handleSelectSheet(index)}
                  disabled={creating}
                  className="sr-only focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
                />
                <span className="font-medium text-center">
                  {sheet.name || `Sheet ${index}`}
                </span>
                {sheet.year && (
                  <span className="text-xs text-gray-500 mt-1">
                    {sheet.year}
                  </span>
                )}
                {sheet.branch && (
                  <span className="text-xs text-gray-500 mt-1">
                    {sheet.branch}
                  </span>
                )}
                {sheet.batch && (
                  <span className="text-xs text-gray-500 mt-1">
                    {sheet.batch}
                  </span>
                )}
                {sheet.subject && (
                  <span className="text-xs text-gray-500 mt-1">
                    {sheet.subject}
                  </span>
                )}
              </label>
            ))}
          </div>
        </div>

        <div>
          <button
            type="submit"
            disabled={!canStart}
            className="btn-primary w-full flex items-center justify-center gap-2"
          >
            <FiPlay className="w-4 h-4" />
            {creating ? 'Creating...' : 'Start Session'}
          </button>
        </div>

        {error && (
          <div role="alert" className="text-sm text-gray-600 mt-2">
            {error}
          </div>
        )}
      </form>
    </div>
  );
};

export default StartSession;