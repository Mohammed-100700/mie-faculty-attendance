import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiMail, FiLock, FiUser, FiPhone, FiDollarSign } from 'react-icons/fi';
import { register } from '../api/authApi';
import { useAuth } from '../context/AuthContext';

const Register = () => {
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    branches: [],
    ratePerClass: 1500,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { loginUser } = useAuth();

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (form.branches.length === 0) {
      setError('Please select at least one branch.');
      return;
    }

    setLoading(true);

    try {
      const { confirmPassword, ...registerData } = form;
      const res = await register(registerData);
      loginUser(res.data.data);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-blue-100 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <span className="text-white font-bold text-2xl">MIE</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Create Account</h1>
          <p className="text-gray-500 mt-1">Join MIE Faculty Portal</p>
        </div>

        <div className="card shadow-xl">
          {error && (
            <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm mb-4">{error}</div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Full Name</label>
              <div className="relative">
                <FiUser className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input type="text" name="name" value={form.name} onChange={handleChange} className="input-field pl-10" placeholder="Dr. John Doe" required />
              </div>
            </div>

            <div>
              <label className="label">Email</label>
              <div className="relative">
                <FiMail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input type="email" name="email" value={form.email} onChange={handleChange} className="input-field pl-10" placeholder="lecturer@mie.com" required />
              </div>
            </div>

            <div>
              <label className="label">Phone (Optional)</label>
              <div className="relative">
                <FiPhone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input type="tel" name="phone" value={form.phone} onChange={handleChange} className="input-field pl-10" placeholder="+880 1700-000000" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Password</label>
                <div className="relative">
                  <FiLock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input type="password" name="password" value={form.password} onChange={handleChange} className="input-field pl-10" placeholder="Min 6 chars" required minLength={6} />
                </div>
              </div>
              <div>
                <label className="label">Confirm</label>
                <div className="relative">
                  <FiLock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input type="password" name="confirmPassword" value={form.confirmPassword} onChange={handleChange} className="input-field pl-10" placeholder="Repeat password" required />
                </div>
              </div>
            </div>

            <div>
              <label className="label">Rate per Class (BDT)</label>
              <div className="relative">
                <FiDollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input type="number" name="ratePerClass" value={form.ratePerClass} onChange={handleChange} className="input-field pl-10" min="0" required />
              </div>
            </div>

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
                    {branch}
                  </label>
                ))}
              </div>
            </div>

            <button type="submit" className="btn-primary w-full" disabled={loading}>
              {loading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto" /> : 'Create Account'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500">
              Already have an account?{' '}
              <Link to="/login" className="text-primary-600 hover:underline font-medium">Sign in</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
