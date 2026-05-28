import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiPlay, FiStopCircle, FiCheckCircle, FiCopy, FiUsers } from 'react-icons/fi';
import QRCode from 'qrcode';
import { createSession, getSession, closeSession } from '../api/attendanceSessionApi';

const StartSession = () => {
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(false);
  const [branch, setBranch] = useState('Dhanmondi');
  const [batch, setBatch] = useState('September');
  const [subject, setSubject] = useState('');
  const [checkinCount, setCheckinCount] = useState(0);
  const [copied, setCopied] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState('');

  const checkinUrl = session
    ? `${window.location.origin}/checkin/${session.sessionCode}`
    : '';

  // Generate QR code when session is created
  useEffect(() => {
    if (session) {
      QRCode.toDataURL(checkinUrl, { width: 200, margin: 2 })
        .then(setQrDataUrl)
        .catch(() => {});
    }
  }, [session, checkinUrl]);

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
    if (!window.confirm('Close this session? Students will no longer be able to check in.')) return;
    try {
      await closeSession(session._id);
      navigate(`/session/${session._id}/checkins`);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to close session.');
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(checkinUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Active session view
  if (session) {
    return (
      <div className="max-w-lg mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Attendance Session Active</h1>
          <p className="text-gray-500">Share this code with your students</p>
        </div>

        {/* Session code display */}
        <div className="card bg-gradient-to-r from-primary-500 to-primary-700 text-white text-center">
          <p className="text-primary-100 text-sm mb-2">Session Code</p>
          <p className="text-5xl font-mono font-bold tracking-widest">{session.sessionCode}</p>
          <div className="flex items-center justify-center gap-2 mt-3 flex-wrap">
            <span className="text-primary-200 text-sm">{session.batch} • {session.branch}</span>
            {session.subject && <span className="text-primary-200 text-sm">• {session.subject}</span>}
          </div>
        </div>

        {/* QR Code */}
        {qrDataUrl && (
          <div className="card text-center">
            <p className="text-sm text-gray-500 mb-3">Or scan this QR code</p>
            <img src={qrDataUrl} alt="Check-in QR Code" className="mx-auto w-48 h-48" />
            <button onClick={handleCopy} className="text-sm text-primary-600 hover:underline mt-2 flex items-center gap-1 mx-auto">
              <FiCopy className="w-3.5 h-3.5" />
              {copied ? 'Copied!' : 'Copy check-in link'}
            </button>
          </div>
        )}

        {/* Live count */}
        <div className="card flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-50 rounded-xl">
              <FiUsers className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Students Checked In</p>
              <p className="text-3xl font-bold text-gray-900">{checkinCount}</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            <span className="text-xs text-green-600 font-medium">Live</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={() => navigate(`/session/${session._id}/checkins`)}
            className="btn-secondary flex-1 flex items-center justify-center gap-2"
          >
            <FiCheckCircle className="w-4 h-4" />
            View Check-ins
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
        <p className="text-gray-500">Create a session for students to check in</p>
      </div>

      <div className="card">
        <form onSubmit={handleStart} className="space-y-4">
          <div>
            <label className="label">Branch <span className="text-red-500">*</span></label>
            <div className="flex gap-3">
              {['Dhanmondi', 'Uttara'].map((b) => (
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
