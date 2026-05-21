import { useState, useEffect } from 'react';
import {
  FiPlus, FiTrash2, FiSend, FiCheckSquare, FiSquare,
  FiBookOpen, FiUsers, FiSettings, FiX, FiMail,
} from 'react-icons/fi';
import {
  getWorkbook, updateStaffEmail, addSheet, deleteSheet,
  addTest, deleteTest, addStudent, deleteStudent,
  updateMark, toggleTestApproval, sendEmail,
} from '../api/workbookApi';

const BATCHES = ['September', 'December', 'March'];
const BRANCHES = ['Dhanmondi', 'Uttara'];

const MarksManagement = () => {
  const [workbook, setWorkbook] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeSheet, setActiveSheet] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [staffEmail, setStaffEmail] = useState('');

  // Add sheet form
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [newBatch, setNewBatch] = useState(BATCHES[0]);
  const [newBranch, setNewBranch] = useState(BRANCHES[0]);
  const [newSubject, setNewSubject] = useState('');

  // Inline forms
  const [newTestName, setNewTestName] = useState('');
  const [showAddTest, setShowAddTest] = useState(false);
  const [newStudentName, setNewStudentName] = useState('');
  const [showAddStudent, setShowAddStudent] = useState(false);

  // Toast
  const [toast, setToast] = useState(null);
  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchWorkbook = async () => {
    try {
      const res = await getWorkbook();
      setWorkbook(res.data.data);
      if (res.data.data) setStaffEmail(res.data.data.staffEmail || '');
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchWorkbook(); }, []);

  // --- Handlers ---

  const handleAddSheet = async (e) => {
    e.preventDefault();
    if (!newSubject.trim()) return;
    try {
      const res = await addSheet(newBatch, newBranch, newSubject.trim());
      setWorkbook(res.data.data);
      setNewSubject('');
      setShowAddSheet(false);
      setActiveSheet(workbook.sheets.length);
      showToast(`Sheet "${newBatch} / ${newBranch} / ${newSubject}" created!`);
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to add sheet', 'error');
    }
  };

  const handleDeleteSheet = async (index) => {
    const s = workbook.sheets[index];
    if (!window.confirm(`Delete "${s.name}"?`)) return;
    try {
      const res = await deleteSheet(index);
      setWorkbook(res.data.data);
      if (activeSheet >= res.data.data.sheets.length) setActiveSheet(0);
      showToast('Sheet deleted');
    } catch { showToast('Failed to delete', 'error'); }
  };

  const handleAddTest = async () => {
    if (!newTestName.trim()) return;
    try {
      const res = await addTest(activeSheet, newTestName.trim());
      setWorkbook(res.data.data);
      setNewTestName('');
      setShowAddTest(false);
      showToast(`Test "${newTestName}" added!`);
    } catch { showToast('Failed to add test', 'error'); }
  };

  const handleDeleteTest = async (testIndex) => {
    if (!window.confirm('Delete this test?')) return;
    try {
      const res = await deleteTest(activeSheet, testIndex);
      setWorkbook(res.data.data);
      showToast('Test deleted');
    } catch { showToast('Failed to delete', 'error'); }
  };

  const handleAddStudent = async () => {
    if (!newStudentName.trim()) return;
    try {
      const res = await addStudent(activeSheet, newStudentName.trim());
      setWorkbook(res.data.data);
      setNewStudentName('');
      setShowAddStudent(false);
      showToast(`Student "${newStudentName}" added!`);
    } catch { showToast('Failed to add student', 'error'); }
  };

  const handleDeleteStudent = async (index) => {
    const s = workbook.sheets[activeSheet].students[index];
    if (!window.confirm(`Delete "${s.name}"?`)) return;
    try {
      const res = await deleteStudent(activeSheet, index);
      setWorkbook(res.data.data);
      showToast('Student deleted');
    } catch { showToast('Failed to delete', 'error'); }
  };

  const handleMarkChange = async (studentIndex, colIndex, value) => {
    try {
      const res = await updateMark(activeSheet, studentIndex, colIndex, value);
      setWorkbook(res.data.data);
    } catch { /* silent */ }
  };

  const handleToggleApproval = async (testIndex) => {
    try {
      const res = await toggleTestApproval(activeSheet, testIndex);
      setWorkbook(res.data.data);
    } catch { showToast('Failed', 'error'); }
  };

  const handleSendEmail = async () => {
    const sheet = workbook.sheets[activeSheet];
    const approvedCount = sheet.tests.filter((t) => t.approved).length;
    if (approvedCount === 0) {
      showToast('No tests approved. Check the boxes for tests to send.', 'error');
      return;
    }
    if (!window.confirm(`Send email to ${staffEmail} with ${approvedCount} test column(s)?`)) return;
    try {
      const res = await sendEmail(activeSheet);
      fetchWorkbook();
      showToast(res.data.message);
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to send email', 'error');
    }
  };

  const handleUpdateStaffEmail = async () => {
    try {
      const res = await updateStaffEmail(staffEmail);
      setWorkbook(res.data.data);
      showToast('Staff email updated!');
    } catch { showToast('Failed', 'error'); }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 border-4 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!workbook) {
    return <div className="max-w-2xl mx-auto"><p className="text-gray-500">Loading...</p></div>;
  }

  const sheet = workbook.sheets[activeSheet];
  const approvedCount = sheet ? sheet.tests.filter((t) => t.approved).length : 0;

  // Group sheets by batch for display
  const sheetsByBatch = {};
  workbook.sheets.forEach((s, i) => {
    if (!sheetsByBatch[s.batch]) sheetsByBatch[s.batch] = [];
    sheetsByBatch[s.batch].push({ ...s, index: i });
  });

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-sm font-medium ${
          toast.type === 'error' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-green-50 text-green-700 border border-green-200'
        }`}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Marks Management</h1>
          <p className="text-gray-500">Manage marks by batch, branch, and subject</p>
        </div>
        <button onClick={() => setShowSettings(!showSettings)} className="btn-secondary text-sm flex items-center gap-2">
          <FiSettings className="w-4 h-4" /> Settings
        </button>
      </div>

      {/* Settings */}
      {showSettings && (
        <div className="card border border-gray-200">
          <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2"><FiMail className="w-4 h-4" /> Email Settings</h3>
          <div className="flex gap-3 items-end">
            <div className="flex-1">
              <label className="label">Staff Email</label>
              <input type="email" value={staffEmail} onChange={(e) => setStaffEmail(e.target.value)} className="input-field" placeholder="staff@mie.com" />
            </div>
            <button onClick={handleUpdateStaffEmail} className="btn-primary">Save</button>
          </div>
          {workbook.lastEmailSentAt && (
            <p className="text-xs text-gray-400 mt-2">Last sent: {new Date(workbook.lastEmailSentAt).toLocaleString()}</p>
          )}
        </div>
      )}

      {/* Sheet Tabs grouped by Batch */}
      <div className="space-y-2">
        {Object.keys(sheetsByBatch).map((batch) => (
          <div key={batch} className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold text-gray-500 w-20 flex-shrink-0">{batch}</span>
            {sheetsByBatch[batch].map((s) => (
              <button
                key={s.index}
                onClick={() => setActiveSheet(s.index)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1.5 ${
                  activeSheet === s.index
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <span className="text-xs opacity-75">{s.branch}</span>
                <span>{s.subject}</span>
                <span className="text-xs opacity-75">({s.students.length})</span>
                {workbook.sheets.length > 1 && (
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDeleteSheet(s.index); }}
                    className="ml-1 hover:bg-white/20 rounded p-0.5"
                  >
                    <FiX className="w-3 h-3" />
                  </button>
                )}
              </button>
            ))}
          </div>
        ))}
        <button
          onClick={() => setShowAddSheet(true)}
          className="px-3 py-2 rounded-lg text-sm text-primary-600 hover:bg-primary-50 flex items-center gap-1 border border-dashed border-primary-300"
        >
          <FiPlus className="w-4 h-4" /> Add Sheet
        </button>
      </div>

      {/* Add Sheet Modal */}
      {showAddSheet && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Add New Sheet</h3>
            <form onSubmit={handleAddSheet} className="space-y-4">
              <div>
                <label className="label">Batch</label>
                <select value={newBatch} onChange={(e) => setNewBatch(e.target.value)} className="input-field">
                  {BATCHES.map((b) => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Branch</label>
                <select value={newBranch} onChange={(e) => setNewBranch(e.target.value)} className="input-field">
                  {BRANCHES.map((b) => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Subject</label>
                <input
                  type="text"
                  value={newSubject}
                  onChange={(e) => setNewSubject(e.target.value)}
                  className="input-field"
                  placeholder="e.g., Mathematics, Chemistry, English"
                  required
                  autoFocus
                />
                <p className="text-xs text-gray-400 mt-1">Enter any subject name</p>
              </div>
              <div className="flex gap-3 justify-end">
                <button type="button" onClick={() => setShowAddSheet(false)} className="btn-secondary">Cancel</button>
                <button type="submit" className="btn-primary">Create Sheet</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Active Sheet */}
      {sheet && (
        <>
          {/* Sheet Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-block bg-primary-600 text-white text-xs font-semibold px-2.5 py-1 rounded">{sheet.batch}</span>
              <span className="inline-block bg-blue-100 text-blue-700 text-xs font-semibold px-2.5 py-1 rounded">{sheet.branch}</span>
              <span className="inline-block bg-green-100 text-green-700 text-xs font-semibold px-2.5 py-1 rounded">{sheet.subject}</span>
            </div>
            <div className="flex gap-2">
              {showAddTest ? (
                <div className="flex gap-2">
                  <input type="text" value={newTestName} onChange={(e) => setNewTestName(e.target.value)} className="input-field text-sm py-1 px-2 w-32" placeholder="Test name" autoFocus onKeyDown={(e) => { if (e.key === 'Enter') handleAddTest(); if (e.key === 'Escape') setShowAddTest(false); }} />
                  <button onClick={handleAddTest} className="btn-primary text-xs py-1 px-2">Add</button>
                  <button onClick={() => { setShowAddTest(false); setNewTestName(''); }} className="btn-secondary text-xs py-1 px-2">Cancel</button>
                </div>
              ) : (
                <button onClick={() => setShowAddTest(true)} className="btn-secondary text-sm flex items-center gap-1">
                  <FiPlus className="w-3.5 h-3.5" /> Add Test
                </button>
              )}
            </div>
          </div>

          {/* Tests */}
          <div className="card">
            <h3 className="font-semibold text-gray-900 mb-3">Tests</h3>
            {sheet.tests.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {sheet.tests.map((test, idx) => (
                  <div key={idx} className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm ${test.approved ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200'}`}>
                    <button onClick={() => handleToggleApproval(idx)} title={test.approved ? 'Unapprove' : 'Approve & send'}>
                      {test.approved ? <FiCheckSquare className="w-4 h-4 text-green-600" /> : <FiSquare className="w-4 h-4 text-gray-400" />}
                    </button>
                    <span className={`font-medium ${test.approved ? 'text-green-700' : 'text-gray-700'}`}>{test.name}</span>
                    <button onClick={() => handleDeleteTest(idx)} className="text-gray-400 hover:text-red-500 ml-1"><FiX className="w-3.5 h-3.5" /></button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400 italic">No tests yet. Click "Add Test" to create one.</p>
            )}
          </div>

          {/* Marks Table */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2"><FiUsers className="w-5 h-5" /> Students & Marks</h3>
              <div>
                {showAddStudent ? (
                  <div className="flex gap-2">
                    <input type="text" value={newStudentName} onChange={(e) => setNewStudentName(e.target.value)} className="input-field text-sm py-1 px-2 w-40" placeholder="Student name" autoFocus onKeyDown={(e) => { if (e.key === 'Enter') handleAddStudent(); if (e.key === 'Escape') setShowAddStudent(false); }} />
                    <button onClick={handleAddStudent} className="btn-primary text-xs py-1 px-2">Add</button>
                    <button onClick={() => { setShowAddStudent(false); setNewStudentName(''); }} className="btn-secondary text-xs py-1 px-2">Cancel</button>
                  </div>
                ) : (
                  <button onClick={() => setShowAddStudent(true)} className="btn-secondary text-sm flex items-center gap-1">
                    <FiPlus className="w-3.5 h-3.5" /> Add Student
                  </button>
                )}
              </div>
            </div>

            {sheet.students.length > 0 && sheet.tests.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 font-semibold text-gray-700 bg-gray-50 sticky left-0 z-10 min-w-[150px]">Student</th>
                      {sheet.tests.map((test, idx) => (
                        <th key={idx} className={`text-center py-3 px-3 font-semibold min-w-[80px] ${test.approved ? 'bg-green-50 text-green-700' : 'bg-gray-50 text-gray-700'}`}>
                          {test.name}
                        </th>
                      ))}
                      <th className="w-8"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {sheet.students.map((student, sIdx) => (
                      <tr key={sIdx} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-2 px-4 font-medium text-gray-900 sticky left-0 bg-white z-10">
                          <div className="flex items-center justify-between gap-2">
                            <span>{student.name}</span>
                            <button onClick={() => handleDeleteStudent(sIdx)} className="text-gray-300 hover:text-red-500"><FiTrash2 className="w-3 h-3" /></button>
                          </div>
                        </td>
                        {sheet.tests.map((test, tIdx) => {
                          const mark = student.marks.find((m) => m.colIndex === test.colIndex);
                          const value = mark ? mark.value : '';
                          return (
                            <td key={tIdx} className="py-2 px-3 text-center">
                              <input
                                type="text"
                                value={value}
                                onChange={(e) => handleMarkChange(sIdx, test.colIndex, e.target.value)}
                                className={`w-14 text-center py-1 px-2 rounded border text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 ${test.approved ? 'border-green-200 bg-green-50/30' : 'border-gray-200'}`}
                                placeholder="-"
                              />
                            </td>
                          );
                        })}
                        <td></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : sheet.students.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <FiUsers className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p>No students yet. Click "Add Student" to get started.</p>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-400">
                <p>No tests yet. Click "Add Test" to create test columns.</p>
              </div>
            )}
          </div>

          {/* Send Button */}
          {sheet.tests.length > 0 && sheet.students.length > 0 && (
            <div className="card bg-gradient-to-r from-primary-50 to-blue-50 border-primary-200">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h3 className="font-semibold text-gray-900">Send Marks</h3>
                  <p className="text-sm text-gray-500">
                    {approvedCount > 0
                      ? `${approvedCount} test column(s) approved. Email will be sent to ${staffEmail}.`
                      : 'Check the boxes next to tests you want to send.'}
                  </p>
                </div>
                <button
                  onClick={handleSendEmail}
                  disabled={approvedCount === 0}
                  className="btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <FiSend className="w-4 h-4" /> Send Email
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default MarksManagement;
