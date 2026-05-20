import { FiEdit2, FiTrash2 } from 'react-icons/fi';
import { formatDate, formatBDT } from '../utils/formatCurrency';
import { deleteClassLog } from '../api/classLogApi';

const ClassLogTable = ({ logs, onEdit, onRefresh }) => {
  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this class log?')) {
      try {
        await deleteClassLog(id);
        if (onRefresh) onRefresh();
      } catch {
        alert('Failed to delete class log.');
      }
    }
  };

  if (logs.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <FiEdit2 className="w-8 h-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-1">No class logs yet</h3>
        <p className="text-gray-500 text-sm">Start by submitting your first attendance log.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="text-left py-3 px-4 font-medium text-gray-500">Date</th>
            <th className="text-left py-3 px-4 font-medium text-gray-500">Branches</th>
            <th className="text-center py-3 px-4 font-medium text-gray-500">Total</th>
            <th className="text-right py-3 px-4 font-medium text-gray-500">Amount</th>
            <th className="text-left py-3 px-4 font-medium text-gray-500">Remarks</th>
            <th className="text-center py-3 px-4 font-medium text-gray-500">Actions</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((log) => (
            <tr key={log._id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
              <td className="py-3 px-4">{formatDate(log.date)}</td>
              <td className="py-3 px-4">
                {log.entries?.map((e) => (
                  <span key={e.branch} className="inline-block mr-2">
                    <span className="font-medium">{e.branch}</span>: {e.classes}
                  </span>
                ))}
              </td>
              <td className="py-3 px-4 text-center font-medium">{log.totalClasses}</td>
              <td className="py-3 px-4 text-right font-medium">{formatBDT(log.payableAmount)}</td>
              <td className="py-3 px-4 text-gray-500">{log.remarks || '—'}</td>
              <td className="py-3 px-4">
                <div className="flex items-center justify-center gap-2">
                  <button onClick={() => onEdit(log)} className="p-1.5 rounded-lg hover:bg-primary-50 text-primary-600 transition-colors" title="Edit">
                    <FiEdit2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(log._id)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-600 transition-colors" title="Delete">
                    <FiTrash2 className="w-4 h-4" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ClassLogTable;
