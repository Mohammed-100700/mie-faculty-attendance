import { useState, useEffect } from 'react';
import { FiCheckCircle } from 'react-icons/fi';
import { createClassLog } from '../api/classLogApi';
import { formatDateInput } from '../utils/formatCurrency';

const ClassLogForm = ({ onSuccess, initialBranches = [] }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [userBranches, setUserBranches] = useState([]);

  const [form, setForm] = useState({
    date: formatDateInput(new Date()),
    // entries: [{ branch: 'Dhanmondi', classes: 2 }, { branch: 'Uttara', classes: 3 }]
    entries: initialBranches.map((b) => ({ branch: b, classes: 1 })),
    remarks: '',
  });

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    setUserBranches(user.branches || []);
  }, []);

  const handleDateChange = (e) => {
    setForm((prev) => ({ ...prev, date: e.target.value }));
  };

  const handleRemarksChange = (e) => {
    setForm((prev) => ({ ...prev, remarks: e.target.value }));
  };

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
      await createClassLog({
        date: form.date,
        entries: form.entries.filter((e) => e.classes > 0),
        remarks: form.remarks,
      });
      setSuccess('Attendance submitted successfully!');
      setForm({
        date: formatDateInput(new Date()),
        entries: initialBranches.map((b) => ({ branch: b, classes: 1 })),
        remarks: '',
      });
      if (onSuccess) onSuccess();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit attendance.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>
      )}
      {success && (
        <div className="bg-green-50 text-green-700 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
          <FiCheckCircle /> {success}
        </div>
      )}

      {/* Date */}
      <div>
        <label className="label">Date</label>
        <input
          type="date"
          name="date"
          value={form.date}
          onChange={handleDateChange}
          className="input-field"
          required
        />
      </div>

      {/* Branches with class counts */}
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
                  isSelected
                    ? 'bg-primary-50 border-primary-300'
                    : 'bg-white border-gray-200'
                }`}
              >
                <label
                  className={`flex items-center gap-2 cursor-pointer font-medium ${
                    isSelected ? 'text-primary-700' : 'text-gray-600'
                  }`}
                >
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

      {/* Total */}
      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
        <span className="text-sm font-medium text-gray-700">Total Classes</span>
        <span className="text-lg font-bold text-gray-900">{totalClasses}</span>
      </div>

      {/* Remarks */}
      <div>
        <label className="label">Remarks (Optional)</label>
        <textarea
          name="remarks"
          value={form.remarks}
          onChange={handleRemarksChange}
          className="input-field"
          rows="2"
          placeholder="Any additional notes..."
        />
      </div>

      <button type="submit" className="btn-primary w-full" disabled={loading}>
        {loading ? 'Submitting...' : 'Submit Attendance'}
      </button>
    </form>
  );
};

export default ClassLogForm;
