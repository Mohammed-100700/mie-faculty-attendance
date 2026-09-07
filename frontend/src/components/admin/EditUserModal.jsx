import { useState, useEffect } from 'react';
import { updateUser } from '../../api/adminApi';
import { getSubjects } from '../../api/subjectApi';
import { getBranches } from '../../api/branchApi';

const EditUserModal = ({
  isOpen,
  onClose,
  onUpdated,
  user,
}) => {
  // Form state - prefill from selected user, never Super Admin
  // Normalize subjects: handle both ["id1", "id2"] and [{ _id: "id1", name: "..." }, ...]
  const normalizedSubjects = user.subjects != null
    ? (Array.isArray(user.subjects)
      ? user.subjects
          .map((subject) => {
            if (
              subject != null &&
              typeof subject === 'object' &&
              subject._id
            ) {
              return String(subject._id);
            }
            if (subject != null) {
              return String(subject);
            }
            return null;
          })
          .filter(Boolean)
      : [])
    : [];

  const [form, setForm] = useState({
    name: user.name,
    email: user.email,
    phone: user.phone || '',
    role: user.role,
    subjects: normalizedSubjects,
    branches: user.branches ? [...user.branches] : [],
    managedBranch: user.managedBranch,
  });

  // State for submit loading and error
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Fetch subjects from API for checkbox options and role switching
  const [subjectsList, setSubjectsList] = useState([]);
  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        const res = await getSubjects();
        setSubjectsList(res.data.data);
      } catch (err) {
        console.error('Failed to fetch subjects', err);
      }
    };

    fetchSubjects();
  }, []);

  // Fetch branches from API for checkbox options and role switching
  const [branchesList, setBranchesList] = useState([]);
  useEffect(() => {
    const fetchBranches = async () => {
      try {
        const res = await getBranches();
        setBranchesList(res.data.data);
      } catch (err) {
        console.error('Failed to fetch branches', err);
      }
    };

    fetchBranches();
  }, []);

  // Immutable update: add or remove a branch value from the array
  const toggleBranch = (branchValue) => {
    if (form.branches.includes(branchValue)) {
      setForm({ ...form, branches: form.branches.filter(b => b !== branchValue) });
    } else {
      setForm({ ...form, branches: [...form.branches, branchValue] });
    }
  };

  // Immutable update: add or remove a subject ID from the array
  const toggleSubject = (subjectId) => {
    if (form.subjects.includes(subjectId)) {
      setForm({ ...form, subjects: form.subjects.filter(s => s !== subjectId) });
    } else {
      setForm({ ...form, subjects: [...form.subjects, subjectId] });
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
  };

  const handleRoleChange = (e) => {
    const role = e.target.value;
    setForm({
      ...form,
      role,
      // When switching away from Lecturer, clear branches/subjects
      branches: role === 'Lecturer' ? form.branches : [],
      subjects: role === 'Lecturer' ? form.subjects : [],
      managedBranch:
        role === 'Academic Manager' ? form.managedBranch : null,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setSubmitting(true);
    setError('');

    // Build payload for updateUser - NO password fields, NO isActive
    const payload = {
      name: form.name,
      email: form.email,
      phone: form.phone,
      role: form.role,
    };

    // Role-specific assignments
    if (form.role === 'Lecturer') {
      payload.branches = form.branches;
      payload.subjects = form.subjects;
      payload.managedBranch = null;
    } else if (form.role === 'Academic Manager') {
      payload.managedBranch = form.managedBranch || null;
      payload.branches = [];
      payload.subjects = [];
    } else if (form.role === 'Executive Office') {
      payload.managedBranch = null;
      payload.branches = [];
      payload.subjects = [];
    }

    try {
      await updateUser(user._id, payload);
      if (onUpdated) {
        await onUpdated();
      }
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update user');
      // Do not close on backend failure
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  // Branch options from API
  const branchOptions = branchesList.map((branch) => ({
    label: branch.name,
    value: branch.name,
  }));

  // Subject options from API
  const subjectOptions = subjectsList.map((subject) => ({
    label: subject.name,
    value: subject._id,
  }));

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto"
      onClick={(e) => e.target === e.currentTarget && !submitting && onClose()}
    >
      <div
        className="w-full max-w-lg max-h-[calc(100vh-2rem)] overflow-y-auto bg-white rounded-lg shadow-xl"
      >
        <div className="p-6">
          <h2 className="text-xl font-bold mb-4">Edit User</h2>

          {error && (
            <div className="bg-red-100 text-red-800 mb-4 rounded p-3">
              <p>{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Name
              </label>
              <input
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="Full name"
                required
                className="w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:ring-primary-500 focus:border-primary-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                placeholder="user@example.com"
                required
                className="w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:ring-primary-500 focus:border-primary-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone
              </label>
              <input
                type="tel"
                name="phone"
                value={form.phone}
                onChange={handleChange}
                placeholder="+880 1700-000000"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:ring-primary-500 focus:border-primary-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Role
              </label>
              <select
                name="role"
                value={form.role}
                onChange={handleRoleChange}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="Lecturer">Lecturer</option>
                <option value="Academic Manager">Academic Manager</option>
                <option value="Executive Office">Executive Office</option>
              </select>
            </div>

            {form.role === 'Lecturer' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Branches
                </label>
                <div className="border rounded-lg max-h-48 overflow-y-auto p-3">
                  {branchesList.map((branch) => (
                    <div
                      key={branch.name}
                      className="flex items-center mb-1"
                    >
                      <input
                        type="checkbox"
                        checked={form.branches.includes(branch.name)}
                        onChange={() => toggleBranch(branch.name)}
                        className="mr-2 accent-color-primary"
                      />
                      <span className="text-sm text-gray-700">{branch.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {form.role === 'Lecturer' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Subjects
                </label>
                <div className="border rounded-lg max-h-48 overflow-y-auto p-3">
                  {subjectsList.map((subject) => (
                    <div
                      key={subject._id}
                      className="flex items-center mb-1"
                    >
                      <input
                        type="checkbox"
                        checked={form.subjects.includes(subject._id)}
                        onChange={() => toggleSubject(subject._id)}
                        className="mr-2 accent-color-primary"
                      />
                      <span className="text-xs text-gray-500 truncate w-24">{subject.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {form.role === 'Academic Manager' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Managed Branch
                </label>
                <select
                  name="managedBranch"
                  value={form.managedBranch || ''}
                  onChange={(e) => setForm({ ...form, managedBranch: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="">Select branch</option>
                  {branchOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {error && (
              <div className="bg-red-100 text-red-800 rounded p-2 mb-4">
                <p>{error}</p>
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Saving...' : 'Save Changes'}
              </button>
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
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

export default EditUserModal;
