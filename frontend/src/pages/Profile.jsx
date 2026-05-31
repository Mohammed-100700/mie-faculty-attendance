import { useState, useEffect } from 'react';
import { FiUser, FiPhone, FiMapPin, FiBook, FiSave } from 'react-icons/fi';
import { updateProfile } from '../api/authApi';
import { getSubjects } from '../api/subjectApi';
import { useAuth } from '../context/AuthContext';

const Profile = () => {
  const { user, updateUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [availableSubjects, setAvailableSubjects] = useState([]);

  const [form, setForm] = useState({
    name: '',
    phone: '',
    branches: [],
    subjects: [],
  });

  useEffect(() => {
    if (user) {
      setForm({
        name: user.name || '',
        phone: user.phone || '',
        branches: user.branches || [],
        subjects: (user.subjects || []).map((s) => (typeof s === 'object' ? s._id : s)),
      });
    }
  }, [user]);

  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        const res = await getSubjects();
        setAvailableSubjects(res.data.data);
      } catch {
        // Non-critical
      }
    };
    fetchSubjects();
  }, []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleBranchToggle = (branch) => {
    setForm((prev) => ({
      ...prev,
      branches: prev.branches.includes(branch)
        ? prev.branches.filter((b) => b !== branch)
        : [...prev.branches, branch],
    }));
  };

  const handleSubjectToggle = (subjectId) => {
    setForm((prev) => ({
      ...prev,
      subjects: prev.subjects.includes(subjectId)
        ? prev.subjects.filter((s) => s !== subjectId)
        : [...prev.subjects, subjectId],
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const res = await updateProfile(form);
      updateUser(res.data.data);
      setSuccess('Profile updated successfully!');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update profile.');
    } finally {
      setLoading(false);
    }
  };

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
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Edit Profile</h3>

        {error && <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm mb-4">{error}</div>}
        {success && <div className="bg-green-50 text-green-700 px-4 py-3 rounded-lg text-sm mb-4">{success}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Full Name</label>
            <div className="relative">
              <FiUser className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input type="text" name="name" value={form.name} onChange={handleChange} className="input-field pl-10" required />
            </div>
          </div>

          <div>
            <label className="label">Phone</label>
            <div className="relative">
              <FiPhone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input type="tel" name="phone" value={form.phone} onChange={handleChange} className="input-field pl-10" placeholder="+880 1700-000000" />
            </div>
          </div>

          {user?.role === 'Lecturer' && (
            <div>
              <label className="label">Branches You Teach At</label>
              <div className="flex gap-3">
                {['Dhanmondi', 'Uttara'].map((branch) => (
                  <label
                    key={branch}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg border cursor-pointer transition-colors ${
                      form.branches.includes(branch)
                        ? 'bg-primary-50 border-primary-300 text-primary-700'
                        : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    <input type="checkbox" checked={form.branches.includes(branch)} onChange={() => handleBranchToggle(branch)} className="sr-only" />
                    <FiMapPin className="w-4 h-4" />
                    {branch}
                  </label>
                ))}
              </div>
            </div>
          )}

          {user?.role === 'Lecturer' && availableSubjects.length > 0 && (
            <div>
              <label className="label">Subjects You Teach (NCUK IFY)</label>
              <div className="grid grid-cols-2 gap-2">
                {availableSubjects.map((subject) => (
                  <label
                    key={subject._id}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-colors text-sm ${
                      form.subjects.includes(subject._id)
                        ? 'bg-green-50 border-green-300 text-green-700'
                        : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={form.subjects.includes(subject._id)}
                      onChange={() => handleSubjectToggle(subject._id)}
                      className="sr-only"
                    />
                    <FiBook className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate">{subject.name}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <button type="submit" className="btn-primary flex items-center gap-2" disabled={loading}>
            {loading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><FiSave className="w-4 h-4" /> Save Changes</>}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Profile;
