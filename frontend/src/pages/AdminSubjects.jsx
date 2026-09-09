import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { getAdminSubjects, createSubject, updateSubject, updateSubjectStatus } from '../api/adminApi';
import AddSubjectModal from '../components/admin/AddSubjectModal';
import EditSubjectModal from '../components/admin/EditSubjectModal';
import StatusConfirmModal from '../components/admin/StatusConfirmModal';

const AdminSubjects = () => {
  const [subjects, setSubjects] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const location = useLocation();
  const navigate = useNavigate();
  const [showAdd, setShowAdd] = useState(false);
  const [editingSubject, setEditingSubject] = useState(null);
  const [statusConfirm, setStatusConfirm] = useState(null);
  const [statusUpdatingId, setStatusUpdatingId] = useState(null);
  const [statusError, setStatusError] = useState('');

  // Clear route state after consuming it
  useEffect(() => {
    if (location.state?.openAdd === true) {
      setShowAdd(true);
      navigate('/admin/subjects', { replace: true });
    }
  }, [location.state, navigate]);

  // Initial subject fetch on page load
  const fetchSubjects = async () => {
    try {
      const res = await getAdminSubjects();
      setSubjects(res.data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load subjects.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubjects();
  }, []);

  // Request status change (opens confirmation modal)
  const requestStatusChange = (subject) => {
    setError('');
    setStatusConfirm({
      subject,
      newIsActive: !subject.isActive,
    });
  };

  // Handle confirmed status change
  const handleConfirmStatus = async () => {
    if (!statusConfirm) return;

    const { subject, newIsActive } = statusConfirm;

    try {
      setStatusUpdatingId(subject._id);
      setStatusError('');

      await updateSubjectStatus(subject._id, newIsActive);
      await fetchSubjects();

      setStatusConfirm(null);
    } catch (err) {
      setStatusError(
        err.response?.data?.message || 'Failed to update subject status.'
      );
    } finally {
      setStatusUpdatingId(null);
    }
  };

  if (loading) {
    return (
      <div className="py-12 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading subjects...</p>
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

  if (!subjects) {
    return (
      <div className="py-12 text-center">
        <p className="text-gray-600">No subjects found.</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Subject Management
        </h1>
        <p className="text-gray-600">Manage institution subjects and availability.</p>
      </div>

      {/* Top actions: Back to Dashboard + Add Subject */}
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
            onClick={() => navigate('/admin/subjects', { state: { openAdd: true } })}
            className="btn-primary"
          >
            Add Subject
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
                Programme
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Type
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
            {subjects.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-4 text-center text-gray-500">
                  No subjects found.
                </td>
              </tr>
            ) : subjects.map((subject) => (
              <tr key={subject._id} className="border-b border-gray-200 hover:bg-gray-50">
                <td className="px-4 py-4 text-sm text-gray-700">
                  <p className="font-medium text-gray-900">{subject.name}</p>
                </td>

                <td className="px-4 py-4 text-sm text-gray-700">
                  <span className="text-gray-600">{subject.programme || 'NCUK IFY'}</span>
                </td>

                <td className="px-4 py-4 text-sm text-gray-700">
                  {subject.isDefault ? (
                    <span className="inline-block px-2 py-1 rounded text-xs font-medium bg-primary-100 text-primary-800">
                      Default
                    </span>
                  ) : (
                    <span className="inline-block px-2 py-1 rounded text-xs font-medium bg-gray-200 text-gray-700">
                      Custom
                    </span>
                  )}
                </td>

                <td className="px-4 py-4 text-sm text-gray-700">
                  {subject.isActive ? (
                    <span className="inline-block px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800">
                      Active
                    </span>
                  ) : (
                    <span className="inline-block px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-800">
                      Inactive
                    </span>
                  )}
                </td>

                <td className="px-4 py-4 text-xs text-gray-500">
                  <div className="inline-flex items-center gap-2 whitespace-nowrap">
                    <button
                      type="button"
                      className="px-3 py-1.5 rounded-md text-xs font-medium bg-blue-600 text-white hover:bg-blue-700"
                      onClick={() => setEditingSubject(subject)}
                    >
                      Edit
                    </button>

                    <button
                      type="button"
                      className={`px-3 py-1.5 rounded-md text-xs font-medium ${
                        statusUpdatingId === subject._id
                          ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                          : subject.isActive
                            ? 'bg-red-600 text-white hover:bg-red-700'
                            : 'bg-green-600 text-white hover:bg-green-700'
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                      onClick={() => requestStatusChange(subject)}
                      disabled={statusUpdatingId === subject._id}
                    >
                      {statusUpdatingId === subject._id
                        ? 'Updating...'
                        : subject.isActive
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

      {editingSubject && (
        <EditSubjectModal
          isOpen={!!editingSubject}
          subject={editingSubject}
          onClose={() => setEditingSubject(null)}
          onUpdated={async () => {
            await fetchSubjects();
          }}
        />
      )}

      {showAdd && <AddSubjectModal isOpen={showAdd} onClose={() => setShowAdd(false)} onCreated={() => {
        fetchSubjects();
        setShowAdd(false);
      }} />}

      {statusConfirm && (
        <StatusConfirmModal
          isOpen={!!statusConfirm}
          subject={statusConfirm.subject}
          newIsActive={statusConfirm.newIsActive}
          submitting={statusUpdatingId === statusConfirm.subject._id}
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

export default AdminSubjects;
