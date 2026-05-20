import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FiSave, FiArrowLeft } from 'react-icons/fi';
import { getClassLog, updateClassLog } from '../api/classLogApi';
import { formatDateInput } from '../utils/formatCurrency';

const EditClassLog = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [userBranches, setUserBranches] = useState([]);

  const [form, setForm] = useState({
    date: '',
    entries: [],
    remarks: '',
  });

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    setUserBranches(user.branches || []);
  }, []);

  useEffect(() => {
    const fetchLog = async () => {
      try {
        const res = await getClassLog(id);
        const log = res.data.data;
        setForm({
          date: formatDateInput(log.date),
          entries: log.entries || [],
          remarks: log.remarks || '',
        });
      } catch {
        setError('Failed to load class log.');
      } finally {
        setFetching(false);
      }
    };
    fetchLog();
  }, [id]);

  const handleBranchToggle = (branch) => {
    setForm((prev) => {
      const exists = prev.entries.find((e) => e.branch === branch);
      if (exists) {
        return { ...prev, entries: prev.entries.filter((e) => e.branch !== branch) };
      }
      return { ...prev, entries: [...prev.entries, { branch, classes: 1 }] };
    });
  };

  const handleClassChange = (branch, value) => {
    const num = parseInt(value) || 0;
    setForm((prev) => ({
      ...prev,
      entries: prev.entries.map((e) =>
        e.branch === branch ? { ...e, classes: num } : e
      ),
    }));
  };

  const totalClasses = form.entries.reduce((sum, e) => sum + e.classes, 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    if (form.entries.length === 0) {
      setError('Please select at least one branch.');
      setLoading(false);
      return;
    }

    if (totalClasses === 0) {
      setError('Total classes must be at least 1.');
      setLoading(false);
      return;
    }

    try {
      await updateClassLog(id, {
        date: form.date,
        entries: form.entries.filter((e) => e.classes > 0),
        remarks: form.remarks,
      });
      setSuccess('Class log updated successfully!');
      setTimeout(() => navigate('/my-logs'), 1500);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update class log.');
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 border-4 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/my-logs')} className="p-2 rounded-lg hover:bg-gray-100">
          <FiArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Edit Class Log</h1>
          <p className="text-gray-500">Update your attendance record</p>
        </div>
      </div>

      <div className="card">
        {error && <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm mb-4">{error}</div>}
        {success && <div className="bg-green-50 text-green-700 px-4 py-3 rounded-lg text-sm mb-4">{success}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Date</label>
            <input type="date" name="date" value={form.date} onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))} className="input-field" required />
          </div>

          <div>
            <label className="label">Branches & Classes</label>
            <div className="space-y-3">
              {userBranches.map((branch) => {
                const entry = form.entries.find((e) => e.branch === branch);
                const isSelected = !!entry;
                return (
                  <div
                    key={branch}
                    className={`flex items-center gap-4 p-3 rounded-lg border transition-colors ${
                      isSelected ? 'bg-primary-50 border-primary-300' : 'bg-white border-gray-200'
                    }`}
                  >
                    <label className={`flex items-center gap-2 cursor-pointer font-medium ${isSelected ? 'text-primary-700' : 'text-gray-600'}`}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleBranchToggle(branch)}
                        className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                      {branch}
                    </label>
                    {isSelected && (
                      <div className="flex items-center gap-2 ml-auto">
                        <label className="text-sm text-gray-500">Classes:</label>
                        <input
                          type="number"
                          min="1"
                          max="20"
                          value={entry.classes}
                          onChange={(e) => handleClassChange(branch, e.target.value)}
                          className="input-field w-20 text-center py-1"
                          required
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <span className="text-sm font-medium text-gray-700">Total Classes</span>
            <span className="text-lg font-bold text-gray-900">{totalClasses}</span>
          </div>

          <div>
            <label className="label">Remarks (Optional)</label>
            <textarea name="remarks" value={form.remarks} onChange={(e) => setForm((p) => ({ ...p, remarks: e.target.value }))} className="input-field" rows="2" placeholder="Any additional notes..." />
          </div>

          <div className="flex gap-3">
            <button type="submit" className="btn-primary flex items-center gap-2" disabled={loading}>
              {loading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><FiSave className="w-4 h-4" /> Save Changes</>}
            </button>
            <button type="button" onClick={() => navigate('/my-logs')} className="btn-secondary">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditClassLog;
