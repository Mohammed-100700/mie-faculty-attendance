import { FiMoreVertical } from 'react-icons/fi';

const StatusMenu = ({
  isOpen,
  onToggle,
  onResetPassword,
}) => {
  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={onToggle}
        aria-label="More actions"
        className="p-1.5 rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-700"
      >
        <FiMoreVertical className="h-4 w-4" />
      </button>

      {isOpen && (
        <div
          className="absolute right-0 mt-2 z-30 w-40 bg-white border border-gray-200 rounded-lg shadow-lg p-1"
        >
          <button type="button" onClick={onResetPassword}>
            Reset Password
          </button>
        </div>
      )}
    </div>
  );
};

export default StatusMenu;