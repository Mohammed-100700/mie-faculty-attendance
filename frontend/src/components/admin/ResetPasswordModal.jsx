import { useState } from 'react';
import { resetPassword } from '../../api/adminApi';

const ResetPasswordModal = ({
  isOpen,
  onClose,
  onResetSuccess,
  user,
}) => {
  if (!isOpen || user?.role === 'Super Admin') {
    return null;
  }

  const [form, setForm] = useState({
    temporaryPassword: '',
    confirmPassword: '',
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (form.temporaryPassword !== form.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (form.temporaryPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      await resetPassword(user._id, form.temporaryPassword);
      if (onResetSuccess) {
        await onResetSuccess();
      }
      setSubmitting(false);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to reset password');
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget && !submitting) {
          onClose();
        }
      }}
    >
      <div
        className="w-full max-w-lg max-h-[calc(100vh-2rem)] overflow-y-auto bg-white rounded-lg shadow-xl"
      >
        <div className="p-6">
          <h2 className="text-xl font-bold mb-4">Reset Password</h2>

          {error && (
            <div className="bg-red-100 text-red-800 mb-4 rounded p-3">
              <p>{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Temporary Password
              </label>
              <input
                type="password"
                name="temporaryPassword"
                value={form.temporaryPassword}
                onChange={handleChange}
                placeholder="Minimum 6 characters"
                required
                className="w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:ring-primary-500 focus:border-primary-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Confirm Password
              </label>
              <input
                type="password"
                name="confirmPassword"
                value={form.confirmPassword}
                onChange={handleChange}
                placeholder="Confirm password"
                required
                className="w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:ring-primary-500 focus:border-primary-500"
              />
            </div>

            <div>
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Resetting...' : 'Reset Password'}
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={onClose}
                className="w-full py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ResetPasswordModal;