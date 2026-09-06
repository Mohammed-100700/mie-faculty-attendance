import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { getUsers, updateStatus } from '../api/adminApi';
import AddUserModal from '../components/admin/AddUserModal';
import EditUserModal from '../components/admin/EditUserModal';
import StatusMenu from '../components/admin/StatusMenu';
import ResetPasswordModal from '../components/admin/ResetPasswordModal';
import StatusConfirmModal from '../components/admin/StatusConfirmModal';

const AdminUsers = () => {
  const [users, setUsers] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');

  // Role filter: exact matching with internal map System Administrator -> Super Admin
  const normalizedRoleFilter =
    roleFilter === 'System Administrator' ? 'Super Admin' : roleFilter;

  // Safe active semantics
  const safeIsActive = (user) => user.isActive !== false;

  // Route state: openCreate from dashboard
  const location = useLocation();
  const navigate = useNavigate();
  const [showCreate, setShowCreate] = useState(false);
  const [editingUser, setEditingUser] = useState(null);

  // [B3.4] Status menu state
  const [openMenuId, setOpenMenuId] = useState(null);
  const [resetUser, setResetUser] = useState(null);
  const [statusTarget, setStatusTarget] = useState(null);
  const [statusUpdatingId, setStatusUpdatingId] = useState(null);
  const [statusError, setStatusError] = useState('');

  // Clear route state after consuming it
  useEffect(() => {
    if (location.state?.openCreate === true) {
      setShowCreate(true);
      // Clear the state so refresh does not reopen modal
      navigate('/admin/users', { replace: true });
    }
  }, [location.state, navigate]);

  // Initial user fetch on page load
  const fetchUsers = async () => {
    try {
      const res = await getUsers();
      setUsers(res.data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load users.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // [B3.4] Request status change (opens confirmation modal)
  const requestStatusChange = (user) => {
    if (user.role === 'Super Admin') return;

    setStatusError('');
    setStatusTarget({
      user,
      newIsActive: !(user.isActive !== false),
    });
  };

  // [B3.4] Handle confirmed status change
  const handleConfirmStatus = async () => {
    if (!statusTarget) return;

    const { user, newIsActive } = statusTarget;

    if (user.role === 'Super Admin') return;

    try {
      setStatusUpdatingId(user._id);
      setStatusError('');

      await updateStatus(user._id, newIsActive);
      await fetchUsers();

      setStatusTarget(null);
    } catch (err) {
      setStatusError(
        err.response?.data?.message ||
        'Failed to update user status.'
      );
    } finally {
      setStatusUpdatingId(null);
    }
  };

  // Effective role filter
  const matchesRole =
    roleFilter === 'All' ||
    users?.some((user) => user.role === normalizedRoleFilter);

  // Filtered users
  const filteredUsers = users?.filter((user) => {
    // Search filter: match name or email
    const matchesSearch =
      !searchQuery ||
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase());

    // Role filter
    const matchesRole =
      roleFilter === 'All' ||
      user.role === normalizedRoleFilter;

    // Status filter
    const matchesStatus =
      statusFilter === 'All' ? true : safeIsActive(user) ? statusFilter === 'Active' : !safeIsActive(user);

    return matchesSearch && matchesRole && matchesStatus;
  });

  // Role display label
  const roleDisplay = (role) => {
    if (role === 'Super Admin') return 'System Administrator';
    return role;
  };

  // Assignment content helper — returns JSX, never a raw "\n" string
  const getAssignmentContent = (user) => {
    if (user.role === 'Super Admin') return <span>—</span>;

    if (user.role === 'Lecturer') {
      const branches = Array.isArray(user.branches) ? user.branches : [];
      const subjects = Array.isArray(user.subjects) ? user.subjects : [];

      return (
        <div className="space-y-1">
          {branches.length > 0 && (
            <div className="whitespace-nowrap">
              {branches.join(', ')}
            </div>
          )}

          {subjects.length > 0 && (
            <div className="text-xs text-gray-500 whitespace-nowrap">
              {subjects.length} {subjects.length === 1 ? 'subject' : 'subjects'}
            </div>
          )}

          {branches.length === 0 && subjects.length === 0 && (
            <span>—</span>
          )}
        </div>
      );
    }

    if (user.role === 'Academic Manager') {
      return user.managedBranch ? user.managedBranch : 'Institution-wide';
    }

    if (user.role === 'Executive Office') {
      return 'Institution-wide';
    }

    return <span>—</span>;
  };

  // Status badge class
  const statusBadgeClass = (user) => {
    if (safeIsActive(user)) return 'bg-green-100 text-green-800';
    return 'bg-red-100 text-red-800';
  };

  const statusLabel = (user) => safeIsActive(user) ? 'Active' : 'Inactive';

  if (loading) {
    return (
      <div className="py-12 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading users...</p>
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

  if (!users) {
    return (
      <div className="py-12 text-center">
        <p className="text-gray-600">No users found.</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          User Management
        </h1>
        <p className="text-gray-600">Manage system users</p>
      </div>

      {/* Top actions: Back to Dashboard + Add User */}
      <div className="flex justify-between mb-6">
        <Link to="/admin" className="btn-secondary">
          Back to Dashboard
        </Link>
        {showCreate ? (
          <button onClick={() => setShowCreate(false)} className="btn-link text-primary hover:text-primary-700">
            Cancel
          </button>
        ) : (
          <button
            onClick={() => navigate('/admin/users', { state: { openCreate: true } })}
            className="btn-primary"
          >
            Add User
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-500 mb-2">
            Search
          </label>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Name or email"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:ring-primary-500 focus:border-primary-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-500 mb-2">
            Role
          </label>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="All">All</option>
            <option value="Lecturer">Lecturer</option>
            <option value="Academic Manager">Academic Manager</option>
            <option value="Executive Office">Executive Office</option>
            <option value="System Administrator">System Administrator</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-500 mb-2">
            Status
          </label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="All">All</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
        </div>
      </div>

      {/* Table - exactly six columns: Name, Email, Role, Assignment, Status, Actions */}
      <div className="bg-white rounded-xl overflow-shadow shadow-sm border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200">
          <thead>
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Name
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Email
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Role
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Assignment
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
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-4 text-center text-gray-500">
                  No users found.
                </td>
              </tr>
            ) : filteredUsers.map((user) => (
              <tr key={user._id} className="border-b border-gray-200 hover:bg-gray-50">
                <td className="px-4 py-4 text-sm text-gray-700">
                  <p className="font-medium text-gray-900">{user.name}</p>
                </td>

                <td className="px-4 py-4 text-sm text-gray-700">
                  <span className="text-gray-600">{user.email}</span>
                </td>

                <td className="px-4 py-4 text-sm text-gray-700">
                  <span className="font-medium text-gray-900">
                    {roleDisplay(user.role)}
                  </span>
                </td>

                <td className="px-4 py-4 text-sm text-gray-700">
                  {getAssignmentContent(user)}
                </td>

                <td className="px-4 py-4 text-sm text-gray-700">
                  <span
                    className={`inline-block px-2 py-1 rounded text-xs font-medium ${statusBadgeClass(user)}`}
                  >
                    {statusLabel(user)}
                  </span>
                </td>

                <td className="px-4 py-4 text-xs text-gray-500">
                  {user.role === 'Super Admin'
                    ? 'Protected account'
                    : user.role === 'Lecturer' || user.role === 'Academic Manager' || user.role === 'Executive Office'
                      ? (
<div className="inline-flex items-center gap-2 whitespace-nowrap">
                              <button
                                type="button"
                                className="px-3 py-1.5 rounded-md text-xs font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                onClick={() => setEditingUser(user)}
                              >
                                Edit
                              </button>

                              <button
                                type="button"
                                className={`px-3 py-1.5 rounded-md text-xs font-medium ${statusUpdatingId === user._id
                                  ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                                  : safeIsActive(user)
                                    ? 'bg-red-600 text-white hover:bg-red-700'
                                    : 'bg-green-600 text-white hover:bg-green-700'} disabled:opacity-50 disabled:cursor-not-allowed`}
                                onClick={() => requestStatusChange(user)}
                                disabled={statusUpdatingId === user._id}
                              >
                                {statusUpdatingId === user._id
                                  ? 'Updating...'
                                  : safeIsActive(user)
                                    ? 'Deactivate'
                                    : 'Activate'}
                              </button>

                              <StatusMenu
                              isOpen={openMenuId === user._id}
                              onToggle={() =>
                                setOpenMenuId((current) =>
                                  current === user._id ? null : user._id
                                )
                              }
                              onResetPassword={() => {
                                if (user.role === 'Super Admin') return;

                                setOpenMenuId(null);
                                setResetUser(user);
                              }}
                            />
                          </div>
                        )
                      : 'Coming in next step'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editingUser && (
        <EditUserModal
          isOpen={!!editingUser}
          user={editingUser}
          onClose={() => setEditingUser(null)}
          onUpdated={async () => {
            await fetchUsers();
          }}
        />
      )}

      {showCreate && <AddUserModal isOpen={showCreate} onClose={() => setShowCreate(false)} onCreated={() => {
        fetchUsers();
        setShowCreate(false);
      }} />}

      {statusTarget && (
        <StatusConfirmModal
          isOpen={!!statusTarget}
          user={statusTarget.user}
          newIsActive={statusTarget.newIsActive}
          submitting={statusUpdatingId === statusTarget.user._id}
          error={statusError}
          onConfirm={handleConfirmStatus}
          onClose={() => {
            if (!statusUpdatingId) {
              setStatusTarget(null);
              setStatusError('');
            }
          }}
        />
      )}

      {resetUser && (
        <ResetPasswordModal
          isOpen={!!resetUser}
          user={resetUser}
          onClose={() => setResetUser(null)}
          onResetSuccess={() => {
            setResetUser(null);
          }}
        />
      )}
    </div>
  );
};

export default AdminUsers;
