import { useState, useEffect } from 'react';
import {
  FiPlus, FiTrash2, FiSend, FiCheckSquare, FiSquare,
  FiBookOpen, FiUsers, FiSettings, FiX, FiMail,
} from 'react-icons/fi';
import emailjs from '@emailjs/browser';
import {
  getWorkbook, updateEmailSettings, addSheet, deleteSheet,
  addTest, deleteTest, addStudent, deleteStudent,
  updateMark, toggleTestApproval, syncMarks,
} from '../api/workbookApi';

// ⚠️ THESE 3 VALUES ARE THE ONLY CONFIGURATION NEEDED
// Set them once here and all lecturers can send email automatically
// Get them from: https://www.emailjs.com/ → Create account → Add Gmail service → Create template
// Free tier: 200 emails/month
const EMAILJS_SERVICE_ID = 'service_v5tjnab';     // e.g., 'service_abc123'
const EMAILJS_TEMPLATE_ID = 'template_q9hgseo';   // e.g., 'template_xyz789'
const EMAILJS_PUBLIC_KEY = 'f2ACfOq_9tPcsrAtk';     // e.g., 'abcdefghijklmnop'

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
  const [newTestMaxMarks, setNewTestMaxMarks] = useState(100);
  const [showAddTest, setShowAddTest] = useState(false);
  const [newStudentName, setNewStudentName] = useState('');
  const [showAddStudent, setShowAddStudent] = useState(false);
  const [bulkStudentNames, setBulkStudentNames] = useState('');
  const [showBulkAdd, setShowBulkAdd] = useState(false);
  const [studentSearch, setStudentSearch] = useState('');

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

  useEffect(() => {
    // Initialize EmailJS
    if (EMAILJS_PUBLIC_KEY && EMAILJS_PUBLIC_KEY !== 'YOUR_PUBLIC_KEY') {
      emailjs.init(EMAILJS_PUBLIC_KEY);
    }
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
      const res = await addStudent(activeSheet, newStudentName.trim());
      setWorkbook(res.data.data);
      setNewStudentName('');
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

  const handleToggleApproval = async (testIndex) => {
    try {
      const res = await toggleTestApproval(activeSheet, testIndex);
      setWorkbook(res.data.data);
    } catch { showToast('Failed', 'error'); }
  };

  const handleSendEmail = async () => {
    const sheet = workbook.sheets[activeSheet];
    const approvedTests = sheet.tests.filter((t) => t.approved);
    if (approvedTests.length === 0) {
      showToast('No tests approved. Check the boxes for tests to send.', 'error');
      return;
    }
    if (!staffEmail.trim()) {
      showToast('Please enter staff email in Settings first.', 'error');
      return;
    }

    // Build beautiful HTML email
    let html = `<div style="font-family:'Segoe UI',Arial,sans-serif;max-width:650px;margin:0 auto;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;background:#fff;">`;

    // Header
    html += `<div style="background:linear-gradient(135deg,#1e40af,#2563eb);color:#fff;padding:24px 28px;">`;
    html += `<h1 style="margin:0;font-size:22px;letter-spacing:-0.5px;">📊 Marks Update</h1>`;
    html += `<p style="margin:6px 0 0;opacity:0.9;font-size:14px;">${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>`;
    html += `</div>`;

    // Info badges
    html += `<div style="padding:16px 24px;background:#f8fafc;border-bottom:1px solid #e2e8f0;display:flex;gap:8px;flex-wrap:wrap;">`;
    html += `<span style="display:inline-block;background:#2563eb;color:#fff;padding:4px 12px;border-radius:20px;font-size:12px;font-weight:600;">${sheet.batch}</span>`;
    html += `<span style="display:inline-block;background:#dbeafe;color:#1e40af;padding:4px 12px;border-radius:20px;font-size:12px;font-weight:600;">${sheet.branch}</span>`;
    html += `<span style="display:inline-block;background:#dcfce7;color:#166534;padding:4px 12px;border-radius:20px;font-size:12px;font-weight:600;">${sheet.subject}</span>`;
    html += `<span style="display:inline-block;background:#f1f5f9;color:#475569;padding:4px 12px;border-radius:20px;font-size:12px;">${approvedTests.length} test(s)</span>`;
    html += `</div>`;

    html += `<div style="padding:20px 24px;">`;

    // Each test as a section
    for (let t = 0; t < approvedTests.length; t++) {
      const test = approvedTests[t];
      const maxMarks = test.maxMarks || 100;

      html += `<div style="margin-top:${t > 0 ? '24' : '0'}px;">`;
      html += `<div style="background:#eff6ff;border-left:4px solid #2563eb;padding:12px 16px;border-radius:0 8px 8px 0;margin-bottom:0;">`;
      html += `<h2 style="margin:0;font-size:16px;color:#1e40af;">${test.name}</h2>`;
      html += `<span style="color:#64748b;font-size:13px;">Out of ${maxMarks} marks</span>`;
      html += `</div>`;

      // Table
      html += `<table style="width:100%;border-collapse:collapse;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 8px 8px;overflow:hidden;">`;
      html += `<thead><tr style="background:#f1f5f9;">`;
      html += `<th style="padding:10px 16px;text-align:left;border:1px solid #e2e8f0;font-size:12px;color:#475569;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Student</th>`;
      html += `<th style="padding:10px 16px;text-align:center;border:1px solid #e2e8f0;font-size:12px;color:#475569;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;width:100px;">Mark</th>`;
      html += `</tr></thead><tbody>`;

      for (let r = 0; r < sheet.students.length; r++) {
        const student = sheet.students[r];
        const mark = student.marks.find((m) => m.colIndex === test.colIndex);
        const markValue = mark && mark.value !== '' ? mark.value : '—';
        const bg = r % 2 === 0 ? '#ffffff' : '#f8fafc';
        html += `<tr style="background:${bg};">`;
        html += `<td style="padding:10px 16px;border:1px solid #e2e8f0;font-weight:500;color:#1e293b;">${student.name}</td>`;
        html += `<td style="padding:10px 16px;border:1px solid #e2e8f0;text-align:center;font-weight:700;color:#2563eb;font-size:15px;">${markValue}</td>`;
        html += `</tr>`;
      }

      html += `</tbody></table></div>`;
    }

    html += `</div>`;

    // Footer
    html += `<div style="padding:14px 24px;background:#f8fafc;border-top:1px solid #e2e8f0;text-align:center;">`;
    html += `<p style="margin:0;color:#94a3b8;font-size:11px;">MIE Faculty Attendance System • ${sheet.students.length} student(s) • ${approvedTests.length} test(s)</p>`;
    html += `</div></div>`;

    try {
      await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, {
        to_email: staffEmail,
        subject: `Marks: ${sheet.batch} / ${sheet.branch} / ${sheet.subject}`,
        html_content: html,
        batch: sheet.batch,
        branch: sheet.branch,
        subject_name: sheet.subject,
      }, EMAILJS_PUBLIC_KEY);

      // Reset approvals
      setWorkbook((prev) => {
        const updated = JSON.parse(JSON.stringify(prev));
        updated.sheets[activeSheet].tests.forEach((t) => { t.approved = false; t.approvedAt = null; });
        updated.lastEmailSentAt = new Date().toISOString();
        return updated;
      });

      showToast(`Email sent successfully to ${staffEmail}!`);
    } catch (err) {
      console.error('EmailJS error:', err);
      showToast('Failed to send email. Please try again.', 'error');
    }
  };


  const handleSaveEmailSettings = async () => {
    if (!staffEmail.trim()) {
      showToast('Please enter staff email', 'error');
      return;
    }
    try {
      const res = await updateEmailSettings('', staffEmail.trim(), '');
      setWorkbook(res.data.data);
      showToast('Staff email saved!');
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to save', 'error');
    }
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
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-800 mb-2">How to send marks via email</h4>
              <ol className="list-decimal list-inside text-sm text-blue-700 space-y-1">
                <li>Enter the staff email below and click Save</li>
                <li>Go to your sheet, check the tests you want to send</li>
                <li>Click <strong>"Send Email"</strong> — this opens your email client</li>
                <li>The marks are pre-filled in the email body</li>
                <li>Review and send from your inbox</li>
              </ol>
            </div>

            <div>
              <label className="label">Staff Email (recipient)</label>
              <input type="email" value={staffEmail} onChange={(e) => setStaffEmail(e.target.value)} className="input-field" placeholder="staff@mie.com" />
            </div>

            <button onClick={handleSaveEmailSettings} className="btn-primary w-full">Save Staff Email</button>

            {workbook.lastEmailSentAt && (
              <p className="text-xs text-gray-400">Last sent: {new Date(workbook.lastEmailSentAt).toLocaleString()}</p>
            )}
          </div>
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
                    <button onClick={() => handleToggleApproval(idx)} title={test.approved ? 'Unapprove' : 'Approve & send'}>
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
                  <div className="flex gap-2">
                    <input type="text" value={newStudentName} onChange={(e) => setNewStudentName(e.target.value)} className="input-field text-sm py-1 px-2 w-40" placeholder="Student name" autoFocus onKeyDown={(e) => { if (e.key === 'Enter') handleAddStudent(); if (e.key === 'Escape') setShowAddStudent(false); }} />
                    <button onClick={handleAddStudent} className="btn-primary text-xs py-1 px-2">Add</button>
                    <button onClick={() => { setShowAddStudent(false); setNewStudentName(''); }} className="btn-secondary text-xs py-1 px-2">Cancel</button>
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
                    placeholder="Search students..."
                  />
                </div>
              </>
            ) : null}

            {sheet.students.length > 0 && sheet.tests.length > 0 ? (() => {
              const filteredStudents = studentSearch.trim()
                ? sheet.students.filter((s) =>
                    s.name.toLowerCase().includes(studentSearch.toLowerCase())
                  )
                : sheet.students;

              if (filteredStudents.length === 0) {
                return (
                  <div className="text-center py-8 text-gray-400">
                    <p>No students match &quot;{studentSearch}&quot;</p>
                  </div>
                );
              }

              return (
                <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 font-semibold text-gray-700 bg-gray-50 sticky left-0 z-10 min-w-[150px]">Student</th>
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
                        <td className="py-2 px-4 font-medium text-gray-900 sticky left-0 bg-white z-10">
                          <div className="flex items-center justify-between gap-2">
                            <span>{student.name}</span>
                            <button onClick={() => handleDeleteStudent(realIndex)} className="text-gray-300 hover:text-red-500"><FiTrash2 className="w-3 h-3" /></button>
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
                                onChange={(e) => handleMarkChange(realIndex, test.colIndex, e.target.value)}
                                onBlur={() => handleMarkBlur(realIndex, test.colIndex)}
                                className={`w-14 text-center py-1 px-2 rounded border text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 ${test.approved ? 'border-green-200 bg-green-50/30' : 'border-gray-200'}`}
                                placeholder="-"
                              />
                            </td>
                          );
                        })}
                        <td></td>
                      </tr>
                      );
                    })}
                  </tbody>
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
