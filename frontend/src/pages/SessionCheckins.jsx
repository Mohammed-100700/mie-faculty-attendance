import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FiCheckCircle, FiClock, FiArrowLeft, FiUsers } from 'react-icons/fi';
import { getSession, getCheckins } from '../api/attendanceSessionApi';

const SessionCheckins = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [checkins, setCheckins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [sessionRes, checkinsRes] = await Promise.all([
          getSession(id),
          getCheckins(id),
        ]);
        setSession(sessionRes.data.data);
        setCheckins(checkinsRes.data.data);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load session data.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 border-4 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="p-2 rounded-lg hover:bg-gray-100">
          <FiArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Session Check-ins</h1>
          <p className="text-gray-500">
            {session?.branch} Branch
            {session?.subject && ` • ${session.subject}`}
            {' • '}
            {new Date(session?.sessionDate).toLocaleDateString('en-GB', {
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
            <p className="text-3xl font-bold text-gray-900">{checkins.length}</p>
          </div>
        </div>
        <div className={`px-3 py-1 rounded-full text-xs font-medium ${
          session?.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
        }`}>
          {session?.isActive ? 'Active' : 'Closed'}
        </div>
      </div>

      {/* Checkins list */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Students ({checkins.length})</h3>
        {checkins.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <FiClock className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p>No students have checked in yet.</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {checkins.map((c, idx) => (
              <div key={c._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <span className="w-7 h-7 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center text-xs font-medium">
                    {idx + 1}
                  </span>
                  <div>
                    <p className="font-medium text-gray-900">{c.studentName}</p>
                    {c.studentId && <p className="text-xs text-gray-500">Roll: {c.studentId}</p>}
                  </div>
                </div>
                <p className="text-xs text-gray-400">
                  {new Date(c.checkedInAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
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

export default SessionCheckins;
