import { useState, useEffect } from 'react';
import {
  FiPlus, FiTrash2, FiCheckSquare, FiSquare,
  FiBookOpen, FiUsers, FiX, FiArrowUp, FiArrowDown,
} from 'react-icons/fi';
import {
  getWorkbook, addSheet, deleteSheet,
  addTest, deleteTest, addStudent, deleteStudent,
  updateMark, updateStudentNcukId, toggleTestApproval, syncMarks,
} from '../api/workbookApi';

const BATCHES = ['March', 'July', 'September', 'December'];
const BRANCHES = ['Dhanmondi', 'Uttara'];
const YEARS = Array.from({ length: 6 }, (_, i) => String(new Date().getFullYear() - 2 + i));

const MarksManagement = () => {
  const [workbook, setWorkbook] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeSheet, setActiveSheet] = useState(0);
  // Add sheet form
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [newBatch, setNewBatch] = useState(BATCHES[0]);
  const [newYear, setNewYear] = useState(String(new Date().getFullYear()));
  const [newBranch, setNewBranch] = useState(BRANCHES[0]);
  const [newSubject, setNewSubject] = useState('');

  // Inline forms
  const [newTestName, setNewTestName] = useState('');
  const [newTestMaxMarks, setNewTestMaxMarks] = useState(100);
  const [showAddTest, setShowAddTest] = useState(false);
  const [newStudentName, setNewStudentName] = useState('');
  const [newStudentNcukId, setNewStudentNcukId] = useState('');
  const [showAddStudent, setShowAddStudent] = useState(false);
  const [bulkStudentNames, setBulkStudentNames] = useState('');
  const [showBulkAdd, setShowBulkAdd] = useState(false);
  const [studentSearch, setStudentSearch] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' }); // key: 'name' | 'ncukId'

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
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkbook();
    // Auto-sync marks on load to fix any missing entries
    syncMarks().then((res) => {
      if (res.data.data) setWorkbook(res.data.data);
    }).catch(() => {});
  }, []);

  // --- Handlers ---

  const handleAddSheet = async (e) => {
    e.preventDefault();
    if (!newSubject.trim()) return;
    try {
      const res = await addSheet(newBatch, newBranch, newSubject.trim(), newYear);
      setWorkbook(res.data.data);
      setNewSubject('');
      setShowAddSheet(false);
      setActiveSheet(workbook.sheets.length);
      showToast(`Sheet "${newYear} / ${newBatch} / ${newBranch} / ${newSubject}" created!`);
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
      const remaining = res.data.data.sheets.length;
      if (remaining === 0) {
        setActiveSheet(0);
      } else if (activeSheet >= remaining) {
        setActiveSheet(remaining - 1);
      } else if (activeSheet === index) {
        // Deleted the active sheet, move to same index (which is now next sheet) or 0
        setActiveSheet(Math.min(activeSheet, remaining - 1));
      }
      showToast('Sheet deleted');
    } catch { showToast('Failed to delete', 'error'); }
  };

  const handleAddTest = async () => {
    if (!newTestName.trim()) return;
    try {
      const maxMarks = newTestMaxMarks && newTestMaxMarks > 0 ? parseInt(newTestMaxMarks) : 100;
      const res = await addTest(activeSheet, newTestName.trim(), maxMarks);
      setWorkbook(res.data.data);
      setNewTestName('');
      setNewTestMaxMarks(100);
      setShowAddTest(false);
      showToast(`Test "${newTestName}" (out of ${maxMarks}) added!`);
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
      const res = await addStudent(activeSheet, newStudentName.trim(), newStudentNcukId.trim());
      setWorkbook(res.data.data);
      setNewStudentName('');
      setNewStudentNcukId('');
      setShowAddStudent(false);
      showToast(`Student "${newStudentName}" added!`);
    } catch { showToast('Failed to add student', 'error'); }
  };

  const handleBulkAddStudents = async () => {
    const names = bulkStudentNames
      .split('\n')
      .map((n) => n.trim())
      .filter((n) => n.length > 0);
    if (names.length === 0) {
      showToast('Please enter at least one student name', 'error');
      return;
    }
    try {
      let added = 0;
      for (const name of names) {
        const res = await addStudent(activeSheet, name);
        setWorkbook(res.data.data);
        added++;
      }
      setBulkStudentNames('');
      setShowBulkAdd(false);
      showToast(`${added} student(s) added successfully!`);
    } catch { showToast('Failed to add students', 'error'); }
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

  // Local mark editing — update local state immediately, sync to backend on blur
  const handleMarkChange = (studentIndex, colIndex, value) => {
    setWorkbook((prev) => {
      const updated = JSON.parse(JSON.stringify(prev));
      const sheet = updated.sheets[activeSheet];
      if (!sheet || !sheet.students[studentIndex]) return prev;
      const student = sheet.students[studentIndex];
      let mark = student.marks.find((m) => m.colIndex === colIndex);
      if (mark) {
        mark.value = value;
      } else {
        // Mark entry doesn't exist (e.g. test was added after student) — create it
        student.marks.push({ colIndex, value });
        // Keep marks sorted by colIndex
        student.marks.sort((a, b) => a.colIndex - b.colIndex);
      }
      return updated;
    });
  };

  const handleMarkBlur = async (studentIndex, colIndex) => {
    // Use a ref-like approach: read from the latest workbook state
    const currentWorkbook = workbook;
    const sheet = currentWorkbook.sheets[activeSheet];
    if (!sheet) return;
    const student = sheet.students[studentIndex];
    if (!student) return;
    const mark = student.marks.find((m) => m.colIndex === colIndex);
    if (!mark) return;
    try {
      await updateMark(activeSheet, studentIndex, colIndex, mark.value);
    } catch { /* silent */ }
  };

  const handleNcukIdBlur = async (studentIndex) => {
    const currentWorkbook = workbook;
    const sheet = currentWorkbook.sheets[activeSheet];
    if (!sheet) return;
    const student = sheet.students[studentIndex];
    if (!student) return;
    try {
      await updateStudentNcukId(activeSheet, studentIndex, student.ncukId || '');
    } catch { /* silent */ }
  };

  const handleToggleApproval = async (testIndex) => {
    try {
      const res = await toggleTestApproval(activeSheet, testIndex);
      setWorkbook(res.data.data);
    } catch { showToast('Failed', 'error'); }
  };

  const handleSort = (key) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
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
      </div>

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
                <span className="text-xs opacity-75">{s.year}</span>
                <span className="text-xs opacity-75">{s.branch}</span>
                <span>{s.subject}</span>
                <span className="text-xs opacity-75">({s.students.length})</span>
                <button
                  onClick={(e) => { e.stopPropagation(); handleDeleteSheet(s.index); }}
                  className="ml-1 hover:bg-white/20 rounded p-0.5"
                  title="Delete sheet"
                >
                  <FiX className="w-3 h-3" />
                </button>
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
                <label className="label">Year</label>
                <select value={newYear} onChange={(e) => setNewYear(e.target.value)} className="input-field">
                  {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
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

      {/* Bulk Add Students Modal */}
      {showBulkAdd && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg">
            <h3 className="text-lg font-semibold mb-2">Add Multiple Students</h3>
            <p className="text-sm text-gray-500 mb-4">Enter one student name per line. Empty lines will be ignored.</p>
            <textarea
              value={bulkStudentNames}
              onChange={(e) => setBulkStudentNames(e.target.value)}
              className="input-field w-full h-48 font-mono text-sm"
              placeholder={"Ali Ahmed\nSara Khan\nMohammed Islam\nFatima Begum"}
              autoFocus
            />
            <div className="flex justify-between items-center mt-3">
              <span className="text-xs text-gray-400">
                {bulkStudentNames.split('\n').filter((n) => n.trim()).length} student(s)
              </span>
              <div className="flex gap-2">
                <button onClick={() => { setShowBulkAdd(false); setBulkStudentNames(''); }} className="btn-secondary">Cancel</button>
                <button onClick={handleBulkAddStudents} className="btn-primary">Add All</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Active Sheet */}
      {sheet && (
        <>
          {/* Sheet Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-block bg-amber-100 text-amber-700 text-xs font-semibold px-2.5 py-1 rounded">{sheet.year || new Date().getFullYear()}</span>
              <span className="inline-block bg-primary-600 text-white text-xs font-semibold px-2.5 py-1 rounded">{sheet.batch}</span>
              <span className="inline-block bg-blue-100 text-blue-700 text-xs font-semibold px-2.5 py-1 rounded">{sheet.branch}</span>
              <span className="inline-block bg-green-100 text-green-700 text-xs font-semibold px-2.5 py-1 rounded">{sheet.subject}</span>
            </div>
            <div className="flex gap-2">
              {showAddTest ? (
                <div className="flex gap-2 items-end">
                  <div>
                    <label className="label">Test Name</label>
                    <input type="text" value={newTestName} onChange={(e) => setNewTestName(e.target.value)} className="input-field text-sm py-1 px-2 w-32" placeholder="e.g. Quiz 1" autoFocus onKeyDown={(e) => { if (e.key === 'Enter') handleAddTest(); if (e.key === 'Escape') setShowAddTest(false); }} />
                  </div>
                  <div>
                    <label className="label">Max Marks</label>
                    <input type="number" value={newTestMaxMarks} onChange={(e) => setNewTestMaxMarks(e.target.value)} className="input-field text-sm py-1 px-2 w-20" placeholder="100" min="1" />
                  </div>
                  <button onClick={handleAddTest} className="btn-primary text-xs py-1.5 px-3">Add</button>
                  <button onClick={() => { setShowAddTest(false); setNewTestName(''); setNewTestMaxMarks(100); }} className="btn-secondary text-xs py-1.5 px-2">Cancel</button>
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
                    <button onClick={() => handleToggleApproval(idx)} title={test.approved ? 'Unapprove' : 'Toggle approval'}>
                      {test.approved ? <FiCheckSquare className="w-4 h-4 text-green-600" /> : <FiSquare className="w-4 h-4 text-gray-400" />}
                    </button>
                    <span className={`font-medium ${test.approved ? 'text-green-700' : 'text-gray-700'}`}>{test.name}</span>
                    <span className="text-xs text-gray-400 ml-1">/ {test.maxMarks || 100}</span>
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
              <div className="flex gap-2 items-center">
                {showAddStudent ? (
                  <div className="flex gap-2 items-end">
                    <div>
                      <label className="label">Student Name</label>
                      <input type="text" value={newStudentName} onChange={(e) => setNewStudentName(e.target.value)} className="input-field text-sm py-1 px-2 w-40" placeholder="Student name" autoFocus onKeyDown={(e) => { if (e.key === 'Enter') handleAddStudent(); if (e.key === 'Escape') setShowAddStudent(false); }} />
                    </div>
                    <div>
                      <label className="label">NCUK ID</label>
                      <input type="text" value={newStudentNcukId} onChange={(e) => setNewStudentNcukId(e.target.value)} className="input-field text-sm py-1 px-2 w-32" placeholder="e.g. NCUK12345" onKeyDown={(e) => { if (e.key === 'Enter') handleAddStudent(); if (e.key === 'Escape') setShowAddStudent(false); }} />
                    </div>
                    <button onClick={handleAddStudent} className="btn-primary text-xs py-1.5 px-2">Add</button>
                    <button onClick={() => { setShowAddStudent(false); setNewStudentName(''); setNewStudentNcukId(''); }} className="btn-secondary text-xs py-1.5 px-2">Cancel</button>
                  </div>
                ) : (
                  <>
                    <button onClick={() => setShowAddStudent(true)} className="btn-secondary text-sm flex items-center gap-1">
                      <FiPlus className="w-3.5 h-3.5" /> Add One
                    </button>
                    <button onClick={() => setShowBulkAdd(true)} className="btn-primary text-sm flex items-center gap-1">
                      <FiUsers className="w-3.5 h-3.5" /> Add Multiple
                    </button>
                  </>
                )}
              </div>
            </div>

            {sheet.students.length > 0 && sheet.tests.length > 0 ? (
              <>
                {/* Search */}
                <div className="mb-3">
                  <input
                    type="text"
                    value={studentSearch}
                    onChange={(e) => setStudentSearch(e.target.value)}
                    className="input-field text-sm py-1.5 px-3 w-full max-w-xs"
                    placeholder="Search by name or NCUK ID..."
                  />
                </div>
              </>
            ) : null}

            {sheet.students.length > 0 && sheet.tests.length > 0 ? (() => {
              const searchLower = studentSearch.trim().toLowerCase();
              let filteredStudents = searchLower
                ? sheet.students.filter((s) =>
                    s.name.toLowerCase().includes(searchLower) ||
                    (s.ncukId && s.ncukId.toLowerCase().includes(searchLower))
                  )
                : [...sheet.students];

              // Sort students
              if (sortConfig.key) {
                filteredStudents.sort((a, b) => {
                  const valA = (sortConfig.key === 'name' ? a.name : (a.ncukId || '')).toLowerCase();
                  const valB = (sortConfig.key === 'name' ? b.name : (b.ncukId || '')).toLowerCase();
                  if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
                  if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
                  return 0;
                });
              }

              if (filteredStudents.length === 0) {
                return (
                  <div className="text-center py-8 text-gray-400">
                    <p>No students match &quot;{studentSearch}&quot;</p>
                  </div>
                );
              }

              const getSortIcon = (key) => {
                if (sortConfig.key !== key) return <FiArrowUp className="w-3 h-3 opacity-30" />;
                return sortConfig.direction === 'asc'
                  ? <FiArrowUp className="w-3 h-3 text-primary-600" />
                  : <FiArrowDown className="w-3 h-3 text-primary-600" />;
              };

              return (
                <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-3 font-semibold text-gray-700 bg-gray-50 sticky left-0 z-20 min-w-[100px]">
                        <button onClick={() => handleSort('ncukId')} className="flex items-center gap-1 hover:text-primary-600 transition-colors">
                          NCUK ID {getSortIcon('ncukId')}
                        </button>
                      </th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700 bg-gray-50 sticky left-[100px] z-10 min-w-[150px]">
                        <button onClick={() => handleSort('name')} className="flex items-center gap-1 hover:text-primary-600 transition-colors">
                          Student {getSortIcon('name')}
                        </button>
                      </th>
                      {sheet.tests.map((test, idx) => (
                        <th key={idx} className={`text-center py-3 px-3 font-semibold min-w-[90px] ${test.approved ? 'bg-green-50 text-green-700' : 'bg-gray-50 text-gray-700'}`}>
                          <div>{test.name}</div>
                          <div className="text-xs font-normal text-gray-400 mt-0.5">out of {test.maxMarks || 100}</div>
                        </th>
                      ))}
                      <th className="w-8"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStudents.map((student) => {
                      const realIndex = sheet.students.indexOf(student);
                      return (
                      <tr key={realIndex} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-2 px-3 bg-white sticky left-0 z-20">
                          <input
                            type="text"
                            value={student.ncukId || ''}
                            onChange={(e) => {
                              setWorkbook((prev) => {
                                const updated = JSON.parse(JSON.stringify(prev));
                                const s = updated.sheets[activeSheet];
                                if (s && s.students[realIndex]) s.students[realIndex].ncukId = e.target.value;
                                return updated;
                              });
                            }}
                            onBlur={() => handleNcukIdBlur(realIndex)}
                            className="w-full py-1 px-2 rounded border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300"
                            placeholder="NCUK ID"
                          />
                        </td>
                        <td className="py-2 px-4 font-medium text-gray-900 sticky left-[100px] bg-white z-10">
                          <div className="flex items-center justify-between gap-2">
                            <span>{student.name}</span>
                            <button onClick={() => handleDeleteStudent(realIndex)} className="text-gray-300 hover:text-red-500"><FiTrash2 className="w-3 h-3" /></button>
                          </div>
                        </td>
                        {sheet.tests.map((test, tIdx) => {
                          const mark = student.marks.find((m) => m.colIndex === test.colIndex);
                          const value = mark ? mark.value : '';
                          const numVal = parseFloat(value);
                          const maxMarks = test.maxMarks || 100;
                          const isOverLimit = value !== '' && !isNaN(numVal) && numVal > maxMarks;
                          return (
                            <td key={tIdx} className="py-2 px-3 text-center">
                              <div className="relative">
                                <input
                                  type="text"
                                  value={value}
                                  onChange={(e) => handleMarkChange(realIndex, test.colIndex, e.target.value)}
                                  onBlur={() => handleMarkBlur(realIndex, test.colIndex)}
                                  className={`w-14 text-center py-1 px-2 rounded border text-sm focus:outline-none focus:ring-2 ${isOverLimit ? 'border-red-400 bg-red-50 focus:ring-red-300' : test.approved ? 'border-green-200 bg-green-50/30 focus:ring-primary-300' : 'border-gray-200 focus:ring-primary-300'}`}
                                  placeholder="-"
                                />
                                {isOverLimit && (
                                  <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap">
                                    <span className="text-xs text-red-500 font-medium">Max: {maxMarks}</span>
                                  </div>
                                )}
                              </div>
                            </td>
                          );
                        })}
                        <td></td>
                      </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-gray-300 bg-blue-50/60">
                      <td className="py-2 px-3 font-semibold text-blue-800 text-xs sticky left-0 z-20 bg-blue-50/60" colSpan={2}>
                        Average
                      </td>
                      {sheet.tests.map((test, tIdx) => {
                        const maxMarks = test.maxMarks || 100;
                        let total = 0;
                        let count = 0;
                        sheet.students.forEach((student) => {
                          const mark = student.marks.find((m) => m.colIndex === test.colIndex);
                          const val = mark ? parseFloat(mark.value) : NaN;
                          if (!isNaN(val)) {
                            total += val;
                            count++;
                          }
                        });
                        const avg = count > 0 ? (total / count).toFixed(1) : '—';
                        const percentage = count > 0 ? ((parseFloat(avg) / maxMarks) * 100).toFixed(0) : null;
                        return (
                          <td key={tIdx} className={`py-2 px-3 text-center text-xs font-semibold ${test.approved ? 'text-green-700' : 'text-blue-800'}`}>
                            <div>{avg}</div>
                            {percentage !== null && (
                              <div className={`text-xs font-normal mt-0.5 ${test.approved ? 'text-green-500' : 'text-blue-500'}`}>
                                {percentage}%
                              </div>
                            )}
                          </td>
                        );
                      })}
                      <td className="w-8"></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
              );
            })() : sheet.students.length === 0 ? (
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

        </>
      )}

      {/* No sheets state */}
      {(!sheet || workbook.sheets.length === 0) && (
        <div className="card text-center py-16">
          <FiBookOpen className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <h3 className="text-lg font-semibold text-gray-700 mb-2">No Sheets Yet</h3>
          <p className="text-gray-500 mb-4 max-w-md mx-auto">
            Create your first sheet to start managing marks. Each sheet represents a batch + branch + subject combination.
          </p>
          <button onClick={() => setShowAddSheet(true)} className="btn-primary inline-flex items-center gap-2">
            <FiPlus className="w-4 h-4" /> Create Your First Sheet
          </button>
        </div>
      )}
    </div>
  );
};

export default MarksManagement;
