import { useState } from 'react';
import { FiSettings, FiShield, FiLock } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import { changePassword } from '../api/authApi';

const MIN_PASSWORD_LENGTH = 6;
const MAX_PASSWORD_LENGTH = 128;

const EMPTY_PASSWORD_FORM = {
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
};

const Settings = () => {
  const { user, loginUser } = useAuth();

  const [passwordForm, setPasswordForm] = useState({ ...EMPTY_PASSWORD_FORM });
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);

  const handlePasswordFieldChange = (event) => {
    const { name, value } = event.target;

    setPasswordForm((current) => ({ ...current, [name]: value }));

    if (passwordError) setPasswordError('');
    if (passwordSuccess) setPasswordSuccess('');
  };

  // Client-side checks only. The backend repeats all of them and stays
  // authoritative; nothing here is a security control.
  const handlePasswordSubmit = async (event) => {
    event.preventDefault();

    // A second submit while a request is in flight must not start another
    // password change.
    if (passwordSaving) return;

    const { currentPassword, newPassword, confirmPassword } = passwordForm;

    const reject = (message) => {
      setPasswordSuccess('');
      setPasswordError(message);
    };

    if (!currentPassword || !newPassword || !confirmPassword) {
      reject('Complete all three password fields.');
      return;
    }

    // Passwords are never trimmed: a leading or trailing space is part of the
    // secret and counts toward the length.
    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      reject(`New password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }

    if (newPassword.length > MAX_PASSWORD_LENGTH) {
      reject(`New password must be ${MAX_PASSWORD_LENGTH} characters or fewer.`);
      return;
    }

    if (newPassword !== confirmPassword) {
      reject('New password and confirmation do not match.');
      return;
    }

    if (newPassword === currentPassword) {
      reject('New password must be different from the current password.');
      return;
    }

    setPasswordError('');
    setPasswordSuccess('');
    setPasswordSaving(true);

    try {
      const res = await changePassword({ currentPassword, newPassword });

      // loginUser replaces the stored token and user together, so this browser
      // stays signed in with the reissued token while every other session has
      // already been invalidated by the incremented token version.
      loginUser(res.data.data);

      setPasswordForm({ ...EMPTY_PASSWORD_FORM });
      setPasswordSuccess(
        'Password changed successfully. You have been signed out on all other devices.'
      );
    } catch (err) {
      // The form stays open with the entered values preserved so the user can
      // correct the problem and retry.
      setPasswordError(
        err.response?.data?.message || 'Failed to change password.'
      );
    } finally {
      setPasswordSaving(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500">Manage your account settings</p>
      </div>

      {/* Account Info */}
      <div className="card">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-blue-100 rounded-lg">
            <FiShield className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Account Information</h3>
            <p className="text-sm text-gray-500">Your account details</p>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex justify-between py-2 border-b border-gray-100">
            <span className="shrink-0 text-gray-500">Name</span>
            <span className="min-w-0 break-words font-medium">{user?.name}</span>
          </div>
          <div className="flex justify-between py-2 border-b border-gray-100">
            <span className="shrink-0 text-gray-500">Email</span>
            <span className="min-w-0 break-words font-medium">{user?.email}</span>
          </div>
          <div className="flex justify-between py-2 border-b border-gray-100">
            <span className="shrink-0 text-gray-500">Role</span>
            <span className="min-w-0 break-words font-medium">{user?.role}</span>
          </div>
          {user?.managedBranch && (
            <div className="flex justify-between py-2 border-b border-gray-100">
              <span className="shrink-0 text-gray-500">Managed Branch</span>
              <span className="min-w-0 break-words font-medium">{user.managedBranch}</span>
            </div>
          )}
          <div className="flex justify-between py-2 border-b border-gray-100">
            <span className="shrink-0 text-gray-500">Branches</span>
            <span className="min-w-0 break-words font-medium">{user?.branches?.join(', ') || '—'}</span>
          </div>
          <div className="flex justify-between py-2">
            <span className="shrink-0 text-gray-500">Member Since</span>
            <span className="min-w-0 break-words font-medium">
              {user?.createdAt
                ? new Date(user.createdAt).toLocaleDateString()
                : 'N/A'}
            </span>
          </div>
        </div>
      </div>

      {/* Security */}
      <div className="card">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-green-100 rounded-lg">
            <FiLock className="w-5 h-5 text-green-600" />
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold text-gray-900">Change Password</h3>
            <p className="text-sm text-gray-500">
              Replace a temporary or existing password
            </p>
          </div>
        </div>

        {passwordError && (
          <div
            role="alert"
            className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            {passwordError}
          </div>
        )}

        {passwordSuccess && (
          <div
            role="status"
            aria-live="polite"
            className="mb-4 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700"
          >
            {passwordSuccess}
          </div>
        )}

        {/* noValidate keeps the controlled inline messages authoritative
            instead of native browser bubbles. */}
        <form onSubmit={handlePasswordSubmit} className="space-y-4" noValidate>
          <div>
            <label htmlFor="current-password" className="label">
              Current Password
            </label>
            <input
              id="current-password"
              name="currentPassword"
              type="password"
              autoComplete="current-password"
              required
              aria-required="true"
              value={passwordForm.currentPassword}
              onChange={handlePasswordFieldChange}
              disabled={passwordSaving}
              className="input-field"
            />
          </div>

          <div>
            <label htmlFor="new-password" className="label">
              New Password
            </label>
            <input
              id="new-password"
              name="newPassword"
              type="password"
              autoComplete="new-password"
              required
              aria-required="true"
              value={passwordForm.newPassword}
              onChange={handlePasswordFieldChange}
              disabled={passwordSaving}
              className="input-field"
              aria-describedby="new-password-hint"
            />
            <p id="new-password-hint" className="mt-1 text-xs text-gray-500">
              {MIN_PASSWORD_LENGTH} to {MAX_PASSWORD_LENGTH} characters.
            </p>
          </div>

          <div>
            <label htmlFor="confirm-password" className="label">
              Confirm New Password
            </label>
            <input
              id="confirm-password"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              required
              aria-required="true"
              value={passwordForm.confirmPassword}
              onChange={handlePasswordFieldChange}
              disabled={passwordSaving}
              className="input-field"
            />
          </div>

          <button
            type="submit"
            disabled={passwordSaving}
            aria-busy={passwordSaving}
            className="btn-primary focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:cursor-not-allowed"
          >
            {passwordSaving ? 'Changing...' : 'Change Password'}
          </button>
        </form>
      </div>

      {/* About */}
      <div className="card">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-gray-100 rounded-lg">
            <FiSettings className="w-5 h-5 text-gray-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">About</h3>
            <p className="text-sm text-gray-500">Application information</p>
          </div>
        </div>
        <div className="space-y-2 text-sm text-gray-600">
          <p><strong>MIE Faculty Attendance System</strong></p>
          <p>Version 1.0.0</p>
          <p>Built for MIE Pathways NCUK IFY Programme</p>
        </div>
      </div>
    </div>
  );
};

export default Settings;
