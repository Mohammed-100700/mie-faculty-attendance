import { useState, useEffect } from 'react';
import {
  FiPlus, FiTrash2, FiSend, FiCheckSquare, FiSquare,
  FiBookOpen, FiUsers, FiFileText, FiSettings, FiChevronDown, FiChevronRight, FiEdit2, FiX,
} from 'react-icons/fi';
import {
  getWorkbook, updateStaffEmail, addSheet, deleteSheet,
  addTest, deleteTest, addStudent, deleteStudent,
  updateMark, toggleTestApproval, sendEmail,
} from '../api/workbookApi';

const MarksManagement = () => {
  const [workbook, setWorkbook] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeSheet, setActiveSheet] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [staffEmail, setStaffEmail] = useState('');

  // Modals
  const [newSheetName, setNewSheetName] = useState('');
  const [showAddSheet, setShowAddSheet] = useState(false);

  // Inline add forms
  const [addingTest, setAddingTest] = useState(null); // { branchName, subjectName }
  const [newTestName, setNewTestName] = useState('');
  const [newStudentName, setNewStudentName] = useState('');
  const [showAddStudent, setShowAddStudent] = useState(false);

  // Expanded sections
  const [expandedBranches, setExpandedBranches] = useState({});

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
      console.error('Failed to fetch workbook:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchWorkbook(); }, []);

  // --- Handlers ---

  const handleAddSheet = async (e) => {
    e.preventDefault();
    if (!newSheetName.trim()) return;
    try {
      const res = await addSheet(newSheetName.trim());
      setWorkbook(res.data.data);
      setNewSheetName('');
      setShowAddSheet(false);
      setActiveSheet(workbook.sheets.length);
      showToast(`Sheet "${newSheetName}" created!`);
    } catch { showToast('Failed to add sheet', 'error'); }
  };

  const handleDeleteSheet = async (index) => {
    if (!window.confirm(`Delete "${workbook.sheets[index].name}"?`)) return;
    try {
      const res = await deleteSheet(index);
      setWorkbook(res.data.data);
      setActiveSheet(0);
      showToast('Sheet deleted');
    } catch { showToast('Failed to delete', 'error'); }
  };

  const handleAddTest = async (branchName, subjectName) => {
    if (!newTestName.trim()) return;
    try {
      const res = await addTest(activeSheet, branchName, subjectName, newTestName.trim());
      setWorkbook(res.data.data);
      setNewTestName('');
      setAddingTest(null);
      showToast(`Test "${newTestName}" added!`);
    } catch { showToast('Failed to add test', 'error'); }
  };

  const handleDeleteTest = async (branchName, subjectName, testIndex) => {
    if (!window.confirm('Delete this test?')) return;
    try {
      const res = await deleteTest(activeSheet, branchName, subjectName, testIndex);
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
    if (!window.confirm(`Delete "${workbook.sheets[activeSheet].students[index].name}"?`)) return;
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

  const handleToggleApproval = async (branchName, subjectName, testIndex) => {
    try {
      const res = await toggleTestApproval(activeSheet, branchName, subjectName, testIndex);
      setWorkbook(res.data.data);
    } catch { showToast('Failed to toggle', 'error'); }
  };

  const handleSendEmail = async () => {
    const sheet = workbook.sheets[activeSheet];
    const approvedCount = sheet.branches.reduce((sum, b) =>
      sum + b.subjects.reduce((s, sub) => s + sub.tests.filter(t => t.approved).length, 0), 0);
    if (approvedCount === 0) {
      showToast('No tests approved. Check the boxes for tests to send.', 'error');
      return;
    }
    if (!window.confirm(`Send email to ${staffEmail} with ${approvedCount} test column(s)?`)) return;
    try {
      const res = await sendEmail(activeSheet);
      setWorkbook((prev) => ({ ...prev, lastEmailSentAt: new Date() }));
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
    } catch { showToast('Failed to update', 'error'); }
  };

  const toggleBranch = (branchName) => {
    setExpandedBranches((prev) => ({ ...prev, [branchName]: !prev[branchName] }));
  };

  // Compute column structure for the active sheet
  const getSheetColumns = (sheet) => {
    const columns = [];
    let colIdx = 0;
    for (const branch of sheet.branches) {
      for (const subject of branch.subjects) {
        for (const test of subject.tests) {
          columns.push({
            colIndex: test.colIndex || ++colIdx,
            testName: test.name,
            branchName: branch.name,
            subjectName: subject.name,
            approved: test.approved,
            testIndex: subject.tests.indexOf(test),
          });
        }
      }
    }
    return columns;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 border-4 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!workbook) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Marks Management</h1>
        <div className="card text-center py-12">
          <p className="text-gray-500">Loading workbook...</p>
        </div>
      </div>
    );
  }

  const sheet = workbook.sheets[activeSheet];
  const columns = sheet ? getSheetColumns(sheet) : [];
  const approvedCount = columns.filter((c) => c.approved).length;

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
          <p className="text-gray-500">Organize branches, subjects, tests, and send marks to staff</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowSettings(!showSettings)} className="btn-secondary text-sm flex items-center gap-2">
            <FiSettings className="w-4 h-4" />
            Settings
          </button>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="card border border-gray-200">
          <h3 className="font-semibold text-gray-900 mb-3">Settings</h3>
          <div className="flex gap-3 items-end">
            <div className="flex-1">
              <label className="label">Staff Email</label>
              <input type="email" value={staffEmail} onChange={(e) => setStaffEmail(e.target.value)} className="input-field" placeholder="staff@mie.com" />
            </div>
            <button onClick={handleUpdateStaffEmail} className="btn-primary">Save</button>
            {workbook.lastEmailSentAt && (
              <p className="text-xs text-gray-400">Last sent: {new Date(workbook.lastEmailSentAt).toLocaleString()}</p>
            )}
          </div>
        </div>
      )}

      {/* Sheet Tabs */}
      <div className="flex items-center gap-2 border-b border-gray-200 pb-2 overflow-x-auto">
        {workbook.sheets.map((s, i) => (
          <button
            key={i}
            onClick={() => setActiveSheet(i)}
            className={`px-4 py-2 rounded-t-lg text-sm font-medium whitespace-nowrap flex items-center gap-2 ${
              activeSheet === i
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <FiBookOpen className="w-3.5 h-3.5" />
            {s.name}
            <span className="text-xs opacity-75">({s.students.length})</span>
            {workbook.sheets.length > 1 && (
              <button
                onClick={(e) => { e.stopPropagation(); handleDeleteSheet(i); }}
                className="ml-1 hover:bg-white/20 rounded p-0.5"
              >
                <FiX className="w-3 h-3" />
              </button>
            )}
          </button>
        ))}
        <button
          onClick={() => setShowAddSheet(true)}
          className="px-3 py-2 rounded-lg text-sm text-primary-600 hover:bg-primary-50 flex items-center gap-1"
        >
          <FiPlus className="w-4 h-4" /> Add Sheet
        </button>
      </div>

      {/* Add Sheet Modal */}
      {showAddSheet && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Add New Sheet</h3>
            <form onSubmit={handleAddSheet}>
              <div className="mb-4">
                <label className="label">Sheet Name (e.g., September 2026)</label>
                <input
                  type="text"
                  value={newSheetName}
                  onChange={(e) => setNewSheetName(e.target.value)}
                  className="input-field"
                  placeholder="September 2026"
                  required
                  autoFocus
                />
              </div>
              <div className="flex gap-3 justify-end">
                <button type="button" onClick={() => setShowAddSheet(false)} className="btn-secondary">Cancel</button>
                <button type="submit" className="btn-primary">Create Sheet</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Active Sheet Content */}
      {sheet && (
        <>
          {/* Branch/Subject/Test Structure */}
          <div className="space-y-4">
            {sheet.branches.map((branch) => (
              <div key={branch.name} className="card">
                {/* Branch Header */}
                <button
                  onClick={() => toggleBranch(branch.name)}
                  className="w-full flex items-center justify-between text-left"
                >
                  <div className="flex items-center gap-3">
                    {expandedBranches[branch.name] !== false ? <FiChevronDown className="w-5 h-5 text-gray-400" /> : <FiChevronRight className="w-5 h-5 text-gray-400" />}
                    <span className="text-lg font-semibold text-gray-900">{branch.name}</span>
                    <span className="text-xs text-gray-400">
                      ({branch.subjects.reduce((s, sub) => s + sub.tests.length, 0)} tests)
                    </span>
                  </div>
                </button>

                {(expandedBranches[branch.name] !== false) && (
                  <div className="mt-4 space-y-3">
                    {branch.subjects.map((subject) => (
                      <div key={subject.name} className="bg-gray-50 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-medium text-gray-800">{subject.name}</h4>
                          <div className="flex gap-2">
                            {addingTest?.branchName === branch.name && addingTest?.subjectName === subject.name ? (
                              <div className="flex gap-2">
                                <input
                                  type="text"
                                  value={newTestName}
                                  onChange={(e) => setNewTestName(e.target.value)}
                                  className="input-field text-sm py-1 px-2 w-32"
                                  placeholder="Test name"
                                  autoFocus
                                  onKeyDown={(e) => { if (e.key === 'Enter') handleAddTest(branch.name, subject.name); if (e.key === 'Escape') setAddingTest(null); }}
                                />
                                <button onClick={() => handleAddTest(branch.name, subject.name)} className="btn-primary text-xs py-1 px-2">Add</button>
                                <button onClick={() => { setAddingTest(null); setNewTestName(''); }} className="btn-secondary text-xs py-1 px-2">Cancel</button>
                              </div>
                            ) : (
                              <button
                                onClick={() => { setAddingTest({ branchName: branch.name, subjectName: subject.name }); setNewTestName(''); }}
                                className="text-xs text-primary-600 hover:bg-primary-50 px-2 py-1 rounded flex items-center gap-1"
                              >
                                <FiPlus className="w-3 h-3" /> Add Test
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Tests list */}
                        {subject.tests.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {subject.tests.map((test, tIdx) => (
                              <div
                                key={tIdx}
                                className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm ${
                                  test.approved ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200'
                                }`}
                              >
                                <button
                                  onClick={() => handleToggleApproval(branch.name, subject.name, tIdx)}
                                  className="flex-shrink-0"
                                  title={test.approved ? 'Uncheck to unapprove' : 'Check to approve & send'}
                                >
                                  {test.approved
                                    ? <FiCheckSquare className="w-4 h-4 text-green-600" />
                                    : <FiSquare className="w-4 h-4 text-gray-400" />
                                  }
                                </button>
                                <span className={`font-medium ${test.approved ? 'text-green-700' : 'text-gray-700'}`}>{test.name}</span>
                                <button
                                  onClick={() => handleDeleteTest(branch.name, subject.name, tIdx)}
                                  className="text-gray-400 hover:text-red-500 ml-1"
                                  title="Delete test"
                                >
                                  <FiX className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-gray-400 italic">No tests yet. Click "Add Test" to create one.</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Marks Table */}
          {columns.length > 0 && (
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <FiUsers className="w-5 h-5" />
                  Students & Marks
                </h3>
                <div className="flex gap-2">
                  {showAddStudent ? (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newStudentName}
                        onChange={(e) => setNewStudentName(e.target.value)}
                        className="input-field text-sm py-1 px-2 w-40"
                        placeholder="Student name"
                        autoFocus
                        onKeyDown={(e) => { if (e.key === 'Enter') handleAddStudent(); if (e.key === 'Escape') setShowAddStudent(false); }}
                      />
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

              {sheet.students.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-4 font-semibold text-gray-700 bg-gray-50 sticky left-0 z-10 min-w-[160px]">Student</th>
                        {columns.map((col) => (
                          <th key={col.colIndex} className={`text-center py-3 px-3 font-semibold min-w-[80px] ${col.approved ? 'bg-green-50 text-green-700' : 'bg-gray-50 text-gray-700'}`}>
                            <div className="text-xs">{col.branchName}</div>
                            <div className="text-xs text-gray-400">{col.subjectName}</div>
                            <div className="mt-1">{col.testName}</div>
                          </th>
                        ))}
                        <th className="w-10"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {sheet.students.map((student, sIdx) => (
                        <tr key={sIdx} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-2 px-4 font-medium text-gray-900 sticky left-0 bg-white z-10">
                            <div className="flex items-center justify-between gap-2">
                              <span>{student.name}</span>
                              <button onClick={() => handleDeleteStudent(sIdx)} className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100">
                                <FiTrash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                          {columns.map((col) => {
                            const mark = student.marks.find((m) => m.colIndex === col.colIndex);
                            const value = mark ? mark.value : '';
                            return (
                              <td key={col.colIndex} className="py-2 px-3 text-center">
                                <input
                                  type="text"
                                  value={value}
                                  onChange={(e) => handleMarkChange(sIdx, col.colIndex, e.target.value)}
                                  className={`w-16 text-center py-1 px-2 rounded border text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 ${
                                    col.approved ? 'border-green-200 bg-green-50/50' : 'border-gray-200'
                                  }`}
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
              ) : (
                <div className="text-center py-8 text-gray-400">
                  <FiUsers className="w-10 h-10 mx-auto mb-2 opacity-50" />
                  <p>No students yet. Click "Add Student" to get started.</p>
                </div>
              )}
            </div>
          )}

          {/* Send Button */}
          {columns.length > 0 && sheet.students.length > 0 && (
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
                  <FiSend className="w-4 h-4" />
                  Send Email
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
