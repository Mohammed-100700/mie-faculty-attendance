import { useState, useEffect } from 'react';
import { FiBook, FiPlus, FiCheckCircle } from 'react-icons/fi';
import { getSubjects, createSubject, seedSubjects } from '../api/subjectApi';

const Subjects = () => {
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newSubject, setNewSubject] = useState('');
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchSubjects = async () => {
    try {
      const res = await getSubjects();
      setSubjects(res.data.data);
    } catch (err) {
      setError('Failed to load subjects.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubjects();
  }, []);

  const handleSeed = async () => {
    try {
      await seedSubjects();
      await fetchSubjects();
      setSuccess('Default subjects seeded successfully!');
    } catch {
      setError('Failed to seed subjects.');
    }
  };

  const handleAddSubject = async (e) => {
    e.preventDefault();
    if (!newSubject.trim()) return;

    setAdding(true);
    setError('');
    setSuccess('');

    try {
      await createSubject({ name: newSubject.trim() });
      setNewSubject('');
      await fetchSubjects();
      setSuccess('Subject added successfully!');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add subject.');
    } finally {
      setAdding(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 border-4 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Subjects</h1>
        <p className="text-gray-500">Manage the subjects you teach under NCUK IFY</p>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-50 text-green-700 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
          <FiCheckCircle /> {success}
        </div>
      )}

      {/* Add Custom Subject */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Add Custom Subject</h3>
        <form onSubmit={handleAddSubject} className="flex gap-3">
          <input
            type="text"
            value={newSubject}
            onChange={(e) => setNewSubject(e.target.value)}
            className="input-field flex-1"
            placeholder="Enter subject name..."
            required
          />
          <button
            type="submit"
            className="btn-primary flex items-center gap-2"
            disabled={adding}
          >
            <FiPlus className="w-4 h-4" />
            {adding ? 'Adding...' : 'Add Subject'}
          </button>
        </form>
      </div>

      {/* Subjects List */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">All Subjects</h3>
          {subjects.length === 0 && (
            <button onClick={handleSeed} className="btn-secondary text-sm">
              Seed Default Subjects
            </button>
          )}
        </div>

        {subjects.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <FiBook className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p>No subjects found. Add a custom subject or seed defaults.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {subjects.map((subject) => (
              <div
                key={subject._id}
                className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100"
              >
                <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                  <FiBook className="w-5 h-5 text-primary-600" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{subject.name}</p>
                  <p className="text-xs text-gray-500">
                    {subject.programme}
                    {subject.isDefault && (
                      <span className="ml-2 text-primary-600">• Default</span>
                    )}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Subjects;
