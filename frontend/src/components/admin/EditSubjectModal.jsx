import { useState } from 'react';

import { updateSubject } from '../../api/adminApi';

const EditSubjectModal = ({ isOpen, onClose, onUpdated, subject }) => {
  const [programme, setProgramme] = useState(subject.programme);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Subject name is immutable - only programme can be edited

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError('');
    setSubmitting(true);

    try {
      await updateSubject(subject._id, { programme });
      setSubmitting(false);
      onUpdated();
      onClose();
    } catch (err) {
      setError(
        err.response?.data?.message || 'Failed to update subject.'
      );
      setSubmitting(false);
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div
        className="bg-white rounded-xl w-full max-w-sm mx-4 p-6 shadow-xl transform overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <h2 className="text-xl font-bold text-gray-900 mb-6 text-center">
          Edit Subject
        </h2>

        {error && (
          <div className="mb-4 p-3 rounded bg-red-100 text-red-800 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Subject Name
            </label>
            <input
              type="text"
              value={subject.name}
                disabled
              className="w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:ring-primary-500 focus:border-primary-500"
              aria-label="Subject name (preserved for historical references)"
            />
              <p className="text-xs text-gray-500 mt-1">
                Subject names are preserved because historical records reference them.
              </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Programme
            </label>
            <input
              type="text"
              value={programme}
              onChange={(e) => setProgramme(e.target.value)}
              required
              className="w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:ring-primary-500 focus:border-primary-500"
              placeholder="e.g. NCUK IFY"
            />
          </div>

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="flex items-center gap-2 px-4 py-2 bg-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-2 px-4 py-2 bg-primary-600 rounded-lg text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Updating...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditSubjectModal;
