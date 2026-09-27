import { useState, useEffect } from 'react';
import { FiUser, FiPhone, FiMapPin, FiBook, FiSave, FiShield } from 'react-icons/fi';
import { updateProfile } from '../api/authApi';
import { useAuth } from '../context/AuthContext';

const ASSIGNMENTS_NOTICE =
  'Assignments are managed by the System Administrator.';

const Profile = () => {
  const { user, updateUser, fetchUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    name: '',
    phone: '',
  });

  // Refresh profile data so administrator assignment changes are current
  useEffect(() => {
    fetchUser();
  }, []);

  useEffect(() => {
    if (user) {
      setForm({
        name: user.name || '',
        phone: user.phone || '',
      });
    }
  }, [user]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // Only name and phone are self-service fields. Assignments are administrator
  // owned, so they are displayed from the profile payload and never submitted.
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const res = await updateProfile({ name: form.name, phone: form.phone });
      updateUser(res.data.data);
      setSuccess('Profile updated successfully!');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update profile.');
    } finally {
      setLoading(false);
    }
  };

  const assignedBranches = Array.isArray(user?.branches) ? user.branches : [];
  const assignedSubjectNames = (Array.isArray(user?.subjects) ? user.subjects : [])
    .map((subject) => (subject && typeof subject === 'object' ? subject.name : ''))
    .filter(Boolean);
  const managedBranch = user?.managedBranch || '';

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Profile</h1>
        <p className="text-gray-500">Manage your account information</p>
      </div>

      <div className="card bg-gradient-to-r from-primary-500 to-primary-700 text-white">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
            <FiUser className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-xl font-bold">{user?.name}</h2>
            <p className="text-primary-100">{user?.email}</p>
            <p className="text-primary-200 text-sm">{user?.role}</p>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="flex items-start gap-3">
          <FiShield className="w-5 h-5 text-gray-400 mt-1 shrink-0" />
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Assignments</h3>
            <p className="text-sm text-gray-500">{ASSIGNMENTS_NOTICE}</p>
          </div>
        </div>

        {user?.role === 'Lecturer' ? (
          <div className="mt-4 space-y-5">
            <div>
              <p className="label">Branches You Teach At</p>
              {assignedBranches.length > 0 ? (
                <ul className="flex flex-wrap gap-2">
                  {assignedBranches.map((branch) => (
                    <li
                      key={branch}
                      className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700"
                    >
                      <FiMapPin className="w-4 h-4 text-primary-600 shrink-0" />
                      {branch}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-gray-500">No branches assigned.</p>
              )}
            </div>

            <div>
              <p className="label">Subjects You Teach (NCUK IFY)</p>
              {assignedSubjectNames.length > 0 ? (
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {assignedSubjectNames.map((subject, index) => (
                    <li
                      key={`${subject}-${index}`}
                      className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700"
                    >
                      <FiBook className="w-4 h-4 text-green-600 shrink-0" />
                      <span className="truncate">{subject}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-gray-500">No subjects assigned.</p>
              )}
            </div>
          </div>
        ) : user?.role === 'Academic Manager' ? (
          <div className="mt-4">
            <p className="label">Managed Branch</p>
            {managedBranch ? (
              <p className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">
                <FiMapPin className="w-4 h-4 text-primary-600 shrink-0" />
                {managedBranch}
              </p>
            ) : (
              <p className="text-sm text-gray-500">No managed branch assigned.</p>
            )}
          </div>
        ) : (
          <p className="mt-4 text-sm text-gray-500">
            Signed in as {user?.role || 'a user'}. This role has no branch or
            subject assignments.
          </p>
        )}
      </div>

      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Edit Profile</h3>

        {error && <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm mb-4">{error}</div>}
        {success && <div className="bg-green-50 text-green-700 px-4 py-3 rounded-lg text-sm mb-4">{success}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="profile-name" className="label">Full Name</label>
            <div className="relative">
              <FiUser className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input id="profile-name" type="text" name="name" value={form.name} onChange={handleChange} className="input-field pl-10" required />
            </div>
          </div>

          <div>
            <label htmlFor="profile-phone" className="label">Phone</label>
            <div className="relative">
              <FiPhone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input id="profile-phone" type="tel" name="phone" value={form.phone} onChange={handleChange} className="input-field pl-10" placeholder="+880 1700-000000" />
            </div>
          </div>

          <button type="submit" className="btn-primary flex items-center gap-2" disabled={loading}>
            {loading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><FiSave className="w-4 h-4" /> Save Changes</>}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Profile;
