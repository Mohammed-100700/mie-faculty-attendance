import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiMail, FiArrowLeft, FiKey } from 'react-icons/fi';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [pin, setPin] = useState(null);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();

      if (data.success && data.pin) {
        setPin(data.pin);
      } else if (data.success) {
        setError('If an account with that email exists, a reset PIN has been generated.');
      } else {
        setError(data.message || 'Something went wrong.');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleContinue = () => {
    navigate('/reset-password', { state: { email } });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-blue-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <span className="text-white font-bold text-2xl">MIE</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">
            {pin ? 'Your Reset PIN' : 'Forgot Password'}
          </h1>
          <p className="text-gray-500 mt-1">
            {pin ? 'Use this PIN to reset your password' : 'Enter your email to get a reset PIN'}
          </p>
        </div>

        <div className="card shadow-xl">
          {error && (
            <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm mb-4">{error}</div>
          )}

          {!pin ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label">Email Address</label>
                <div className="relative">
                  <FiMail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="input-field pl-10"
                    placeholder="you@mie.com"
                    required
                  />
                </div>
              </div>

              <button type="submit" className="btn-primary w-full" disabled={loading}>
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto" />
                ) : (
                  'Generate Reset PIN'
                )}
              </button>
            </form>
          ) : (
            <div className="space-y-4">
              {/* PIN Display */}
              <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
                <FiKey className="w-8 h-8 text-green-600 mx-auto mb-3" />
                <p className="text-sm text-green-700 mb-2">Your 6-digit reset PIN</p>
                <p className="text-4xl font-bold text-green-800 tracking-[0.3em] select-all">{pin}</p>
                <p className="text-xs text-green-600 mt-3">⏱ Valid for 15 minutes</p>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-700">
                <strong>Important:</strong> Copy or write down this PIN. You'll need it on the next screen to set your new password.
              </div>

              <button onClick={handleContinue} className="btn-primary w-full">
                Continue to Reset Password
              </button>
            </div>
          )}

          <div className="mt-6 text-center">
            <Link to="/login" className="text-sm text-primary-600 hover:underline font-medium inline-flex items-center gap-1">
              <FiArrowLeft className="w-4 h-4" /> Back to Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
