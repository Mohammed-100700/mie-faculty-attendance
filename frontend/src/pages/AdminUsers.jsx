import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { getUsers, updateStatus } from '../api/adminApi';
import AddUserModal from '../components/admin/AddUserModal';
import EditUserModal from '../components/admin/EditUserModal';
import StatusMenu from '../components/admin/StatusMenu';
import ResetPasswordModal from '../components/admin/ResetPasswordModal';
import StatusConfirmModal from '../components/admin/StatusConfirmModal';

// Roles that expose Edit / Activate-Deactivate / Reset Password actions
const ACTIONABLE_ROLES = ['Lecturer', 'Academic Manager', 'Executive Office'];

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
        <div className="space-y-1 break-words">
          {branches.length > 0 && (
            <div className="break-words">
              {branches.join(', ')}
            </div>
          )}

          {subjects.length > 0 && (
            <div className="text-xs text-gray-500">
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

  // Single source of truth for user actions, shared by the desktop table
  // and the mobile/tablet card presentation.
  const renderUserActions = (user) => {
    if (user.role === 'Super Admin') {
      return <span className="text-xs text-gray-500">Protected account</span>;
    }

    if (!ACTIONABLE_ROLES.includes(user.role)) {
      return <span className="text-xs text-gray-500">Coming in next step</span>;
    }

    return (
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50"
          onClick={() => setEditingUser(user)}
        >
          Edit
        </button>

        <button
          type="button"
          className={`rounded-md px-3 py-1.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50 ${statusUpdatingId === user._id
            ? 'bg-gray-200 text-gray-500'
            : safeIsActive(user)
              ? 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500'
              : 'bg-green-600 text-white hover:bg-green-700 focus:ring-green-500'}`}
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
    );
  };

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
        <h1 className="mb-2 text-2xl font-bold text-gray-900 sm:text-3xl">
          User Management
        </h1>
        <p className="text-gray-600">Manage system users</p>
      </div>

      {/* Top actions: Back to Dashboard + Add User */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Link to="/admin" className="btn-secondary self-start">
          Back to Dashboard
        </Link>
        {showCreate ? (
          <button onClick={() => setShowCreate(false)} className="btn-link self-start text-primary hover:text-primary-700">
            Cancel
          </button>
        ) : (
          <button
            onClick={() => navigate('/admin/users', { state: { openCreate: true } })}
            className="btn-primary self-start"
          >
            Add User
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
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

      {/* Single filtered-empty state shared by both responsive presentations */}
      {filteredUsers.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white px-4 py-10 text-center shadow-sm">
          <p className="text-gray-500">No users found.</p>
        </div>
      ) : (
        <>
          {/* Desktop (lg+): semantic six-column table - Name, Email, Role, Assignment, Status, Actions */}
          <div className="hidden lg:block">
            <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
              <table className="min-w-full w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Name
                    </th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Email
                    </th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Role
                    </th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Assignment
                    </th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Status
                    </th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user) => (
                    <tr key={user._id} className="border-b border-gray-200 hover:bg-gray-50">
                      <th scope="row" className="px-4 py-4 text-left text-sm font-medium text-gray-900">
                        <span className="break-words">{user.name}</span>
                      </th>

                      <td className="px-4 py-4 text-sm text-gray-700">
                        <span className="break-words text-gray-600">{user.email}</span>
                      </td>

                      <td className="px-4 py-4 text-sm text-gray-700">
                        <span className="break-words font-medium text-gray-900">
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
                        {renderUserActions(user)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile/tablet (< lg): one card per user, same filtered data */}
          <div className="space-y-3 lg:hidden">
            {filteredUsers.map((user) => (
              <article
                key={user._id}
                aria-label={user.name}
                className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <h2 className="break-words text-sm font-semibold text-gray-900">
                      {user.name}
                    </h2>
                    <p className="break-words text-xs text-gray-600">{user.email}</p>
                  </div>

                  <span
                    className={`inline-block shrink-0 rounded px-2 py-1 text-xs font-medium ${statusBadgeClass(user)}`}
                  >
                    {statusLabel(user)}
                  </span>
                </div>

                <dl className="mt-3 space-y-2 text-sm">
                  <div className="flex flex-wrap items-baseline gap-x-2">
                    <dt className="text-xs font-medium uppercase tracking-wider text-gray-500">
                      Role
                    </dt>
                    <dd className="min-w-0 break-words font-medium text-gray-900">
                      {roleDisplay(user.role)}
                    </dd>
                  </div>

                  <div className="flex flex-wrap items-baseline gap-x-2">
                    <dt className="text-xs font-medium uppercase tracking-wider text-gray-500">
                      Assignment
                    </dt>
                    <dd className="min-w-0 break-words text-gray-700">
                      {getAssignmentContent(user)}
                    </dd>
                  </div>
                </dl>

                <div className="mt-4 border-t border-gray-200 pt-3">
                  {renderUserActions(user)}
                </div>
              </article>
            ))}
          </div>
        </>
      )}

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
