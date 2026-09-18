import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiPlay, FiStopCircle, FiCheckCircle, FiUsers } from 'react-icons/fi';
import { createSession, getSession, closeSession } from '../api/attendanceSessionApi';
import { getBranches } from '../api/branchApi';
import { useAuth } from '../context/AuthContext';

const StartSession = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(false);
  const [availableBranches, setAvailableBranches] = useState([]);
  const [branch, setBranch] = useState('');

  useEffect(() => {
    const fetchBranches = async () => {
      try {
        const res = await getBranches();

        const assignedBranchNames = new Set(
          (user?.branches || []).map((branchName) => String(branchName))
        );

        const branchNames = (res.data.data || [])
          .filter((item) => assignedBranchNames.has(item.name))
          .map((item) => item.name);

        setAvailableBranches(branchNames);

        setBranch((current) =>
          branchNames.includes(current)
            ? current
            : branchNames[0] || ''
        );
      } catch (err) {
        console.error('Failed to fetch branches:', err);
      }
    };

    if (user) {
      fetchBranches();
    }
  }, [user]);
  const [batch, setBatch] = useState('September');
  const [subject, setSubject] = useState('');
  const [checkinCount, setCheckinCount] = useState(0);
  // Poll for checkin count
  const pollCount = useCallback(async () => {
    if (!session) return;
    try {
      const res = await getSession(session._id);
      setCheckinCount(res.data.data.checkinCount);
    } catch {
      // silent
    }
  }, [session]);

  useEffect(() => {
    if (!session) return;
    const interval = setInterval(pollCount, 10000);
    pollCount(); // initial fetch
    return () => clearInterval(interval);
  }, [session, pollCount]);

  const handleStart = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await createSession(branch, batch, subject);
      setSession(res.data.data);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to start session.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = async () => {
    if (!session) return;
    if (!window.confirm('Close this session? Attendance will become read-only.')) return;
    try {
      await closeSession(session._id);
      navigate(`/session/${session._id}/checkins`);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to close session.');
    }
  };

  // Active session view
  if (session) {
    return (
      <div className="max-w-lg mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Attendance Session Active</h1>
          <p className="text-gray-500">Session in progress</p>
        </div>

        <div className="card space-y-2">
          <p><span className="text-gray-500">Branch:</span> {session.branch}</p>
          <p><span className="text-gray-500">Batch:</span> {session.batch}</p>
          {session.subject && <p><span className="text-gray-500">Subject:</span> {session.subject}</p>}
        </div>

        {/* Live count */}
        <div className="card flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-50 rounded-xl">
              <FiUsers className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Students Present</p>
              <p className="text-3xl font-bold text-gray-900">{checkinCount}</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            <span className="text-xs text-green-600 font-medium">Live</span>
          </div>
        </div>

        {/* Actions - simplified, no QR/self-check-in */}
        <div className="flex gap-3">
          <button
            onClick={() => navigate(`/session/${session._id}/checkins`)}
            className="btn-secondary flex-1 flex items-center justify-center gap-2"
          >
            <FiCheckCircle className="w-4 h-4" />
            Manage Attendance
          </button>
          <button
            onClick={handleClose}
            className="btn-danger flex-1 flex items-center justify-center gap-2"
          >
            <FiStopCircle className="w-4 h-4" />
            End Session
          </button>
        </div>
      </div>
    );
  }

  // Start new session form
  return (
    <div className="max-w-md mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Start Attendance Session</h1>
        <p className="text-gray-500">Create a session to record student attendance</p>
      </div>

      <div className="card">
        <form onSubmit={handleStart} className="space-y-4">
          <div>
            <label className="label">Branch <span className="text-red-500">*</span></label>
            <div className="flex gap-3">
              {availableBranches.map((b) => (
                <label
                  key={b}
                  className={`flex-1 flex items-center justify-center px-4 py-2.5 rounded-lg border cursor-pointer transition-colors ${
                    branch === b
                      ? 'bg-primary-50 border-primary-300 text-primary-700'
                      : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="branch"
                    value={b}
                    checked={branch === b}
                    onChange={() => setBranch(b)}
                    className="sr-only"
                  />
                  {b}
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="label">Batch <span className="text-red-500">*</span></label>
            <div className="flex gap-2 flex-wrap">
              {['September', 'December', 'March', 'June'].map((b) => (
                <label
                  key={b}
                  className={`flex-1 min-w-[80px] flex items-center justify-center px-3 py-2 rounded-lg border cursor-pointer transition-colors ${
                    batch === b
                      ? 'bg-primary-50 border-primary-300 text-primary-700'
                      : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="batch"
                    value={b}
                    checked={batch === b}
                    onChange={() => setBatch(b)}
                    className="sr-only"
                  />
                  <span className="text-sm">{b}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="label">Subject <span className="text-gray-400 font-normal">(optional)</span></label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="input-field"
              placeholder="e.g., Mathematics, Physics"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full flex items-center justify-center gap-2"
          >
            <FiPlay className="w-4 h-4" />
            {loading ? 'Starting...' : 'Start Session'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default StartSession;
