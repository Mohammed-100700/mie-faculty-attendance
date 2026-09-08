const StatusConfirmModal = ({
  isOpen,
  user,
  branch,
  subject,
  newIsActive,
  submitting,
  error,
  onConfirm,
  onClose,
}) => {
  if (!isOpen) return null;

  let entityType = 'User';

  if (branch) {
    entityType = 'Branch';
  } else if (subject) {
    entityType = 'Subject';
  }

  const actionTitle = newIsActive
    ? `Activate ${entityType}`
    : `Deactivate ${entityType}`;

  const getDescription = () => {
    if (entityType === 'Branch') {
      return newIsActive
        ? 'This branch will become available for new assignments again.'
        : 'This branch will no longer be available for new assignments. Historical records will remain preserved.';
    }

    if (entityType === 'Subject') {
      return newIsActive
        ? 'This subject will become available for assignments again.'
        : 'This subject will no longer be available for new assignments. Historical records will remain preserved.';
    }

    return newIsActive
      ? 'Activate this user? They will be able to log in again.'
      : 'Deactivate this user? They will no longer be able to log in.';
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
      <div className="w-full max-w-sm bg-white rounded-lg shadow-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-medium text-gray-900">
            {actionTitle}
          </h3>

          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
          >
            &times;
          </button>
        </div>

        <p className="text-sm text-gray-500 mb-6">
          {getDescription()}
        </p>

        {error && (
          <div className="bg-red-100 text-red-800 rounded p-2 mb-6">
            <p>{error}</p>
          </div>
        )}

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={submitting}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              newIsActive
                ? 'bg-green-600 text-white hover:bg-green-700'
                : 'bg-red-600 text-white hover:bg-red-700'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {newIsActive ? 'Activate' : 'Deactivate'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default StatusConfirmModal;
