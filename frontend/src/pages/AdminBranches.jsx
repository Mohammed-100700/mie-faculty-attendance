import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { getAdminBranches, createBranch, updateBranch, updateBranchStatus } from '../api/adminApi';
import AddBranchModal from '../components/admin/AddBranchModal';
import EditBranchModal from '../components/admin/EditBranchModal';
import StatusConfirmModal from '../components/admin/StatusConfirmModal';

const AdminBranches = () => {
  const [branches, setBranches] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const location = useLocation();
  const navigate = useNavigate();
  const [showAdd, setShowAdd] = useState(false);
  const [editingBranch, setEditingBranch] = useState(null);
  const [statusConfirm, setStatusConfirm] = useState(null);
  const [statusUpdatingId, setStatusUpdatingId] = useState(null);
  const [statusError, setStatusError] = useState('');

  // Clear route state after consuming it
  useEffect(() => {
    if (location.state?.openAdd === true) {
      setShowAdd(true);
      navigate('/admin/branches', { replace: true });
    }
  }, [location.state, navigate]);

  // Initial branch fetch on page load
  const fetchBranches = async () => {
    try {
      const res = await getAdminBranches();
      setBranches(res.data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load branches.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBranches();
  }, []);

  // Request status change (opens confirmation modal)
  const requestStatusChange = (branch) => {
    setStatusError('');
    setStatusConfirm({
      branch,
      newIsActive: !branch.isActive,
    });
  };

  // Handle confirmed status change
  const handleConfirmStatus = async () => {
    if (!statusConfirm) return;

    const { branch, newIsActive } = statusConfirm;

    try {
      setStatusUpdatingId(branch._id);
      setStatusError('');

      await updateBranchStatus(branch._id, newIsActive);
      await fetchBranches();

      setStatusConfirm(null);
    } catch (err) {
      setStatusError(
        err.response?.data?.message || 'Failed to update branch status.'
      );
    } finally {
      setStatusUpdatingId(null);
    }
  };

  if (loading) {
    return (
      <div className="py-12 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading branches...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-12 text-center text-red-600">
        <p>{error}</p>
      </div>
    );
  }

  if (!branches) {
    return (
      <div className="py-12 text-center">
        <p className="text-gray-600">No branches found.</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Branch Management
        </h1>
        <p className="text-gray-600">Manage institution branches and availability.</p>
      </div>

      {/* Top actions: Back to Dashboard + Add Branch */}
      <div className="flex justify-between mb-6">
        <Link to="/admin" className="btn-secondary">
          Back to Dashboard
        </Link>
        {showAdd ? (
          <button onClick={() => setShowAdd(false)} className="btn-link text-primary hover:text-primary-700">
            Cancel
          </button>
        ) : (
          <button
            onClick={() => navigate('/admin/branches', { state: { openAdd: true } })}
            className="btn-primary"
          >
            Add Branch
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl overflow-shadow shadow-sm border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200">
          <thead>
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Name
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Code
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {branches.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-4 text-center text-gray-500">
                  No branches found.
                </td>
              </tr>
            ) : branches.map((branch) => (
              <tr key={branch._id} className="border-b border-gray-200 hover:bg-gray-50">
                <td className="px-4 py-4 text-sm text-gray-700">
                  <p className="font-medium text-gray-900">{branch.name}</p>
                </td>

                <td className="px-4 py-4 text-sm text-gray-700">
                  <span className="text-gray-600">{branch.code}</span>
                </td>

                <td className="px-4 py-4 text-sm text-gray-700">
                  {branch.isActive ? (
                    <span
                      className="inline-block px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800"
                    >
                      Active
                    </span>
                  ) : (
                    <span
                      className="inline-block px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-800"
                    >
                      Inactive
                    </span>
                  )}
                </td>

                <td className="px-4 py-4 text-xs text-gray-500">
                  <div className="inline-flex items-center gap-2 whitespace-nowrap">
                    <button
                      type="button"
                      className="px-3 py-1.5 rounded-md text-xs font-medium bg-blue-600 text-white hover:bg-blue-700"
                      onClick={() => setEditingBranch(branch)}
                    >
                      Edit
                    </button>

                    <button
                      type="button"
                      className={`px-3 py-1.5 rounded-md text-xs font-medium ${
                        statusUpdatingId === branch._id
                          ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                          : branch.isActive
                            ? 'bg-red-600 text-white hover:bg-red-700'
                            : 'bg-green-600 text-white hover:bg-green-700'
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                      onClick={() => requestStatusChange(branch)}
                      disabled={statusUpdatingId === branch._id}
                    >
                      {statusUpdatingId === branch._id
                        ? 'Updating...'
                        : branch.isActive
                          ? 'Deactivate'
                          : 'Activate'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editingBranch && (
        <EditBranchModal
          isOpen={!!editingBranch}
          branch={editingBranch}
          onClose={() => setEditingBranch(null)}
          onUpdated={async () => {
            await fetchBranches();
          }}
        />
      )}

      {showAdd && <AddBranchModal isOpen={showAdd} onClose={() => setShowAdd(false)} onCreated={() => {
        fetchBranches();
        setShowAdd(false);
      }} />}

      {statusConfirm && (
        <StatusConfirmModal
          isOpen={!!statusConfirm}
          branch={statusConfirm.branch}
          newIsActive={statusConfirm.newIsActive}
          submitting={statusUpdatingId === statusConfirm.branch._id}
          error={statusError}
          onConfirm={handleConfirmStatus}
          onClose={() => {
            if (!statusUpdatingId) {
              setStatusConfirm(null);
              setStatusError('');
            }
          }}
        />
      )}
    </div>
  );
};

export default AdminBranches;
