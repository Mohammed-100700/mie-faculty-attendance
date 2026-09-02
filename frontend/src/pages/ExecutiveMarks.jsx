import { useState, useEffect } from 'react';
import {
  FiBookOpen, FiUsers, FiChevronDown, FiChevronUp, FiSearch,
} from 'react-icons/fi';
import { getAllWorkbooks } from '../api/workbookApi';
import { useAuth } from '../context/AuthContext';
import { exportIndividualPdf, exportClassPdf } from '../utils/exportMarksPdf';

const formatDate = (date) => {
  if (!date) return '';
  const options = { year: 'numeric', month: 'long', day: 'numeric' };
  return new Date(date).toLocaleDateString('en-GB', options);
};

const ExecutiveMarks = () => {
  const { user } = useAuth();
  const [workbooks, setWorkbooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedWorkbook, setExpandedWorkbook] = useState(null);
  const [activeSheet, setActiveSheet] = useState({});
  const [lecturerSearch, setLecturerSearch] = useState('');
  const [studentSearch, setStudentSearch] = useState({});
  const isExecutive = user?.role === 'Executive Office';
  const isAcademicManager = user?.role === 'Academic Manager';
  const managedBranch = user?.managedBranch;

  const fetchWorkbooks = async () => {
    try {
      const res = await getAllWorkbooks();
      let fetchedWorkbooks = res.data.data || [];

      // Academic Manager: filter to only sheets matching their managedBranch
      if (isAcademicManager && managedBranch) {
        fetchedWorkbooks = fetchedWorkbooks.filter((wb) => {
          const matchingSheets = wb.sheets?.filter(
            (s) => s.branch === managedBranch
          );
          return matchingSheets && matchingSheets.length > 0;
        });
      }

      setWorkbooks(fetchedWorkbooks);
    } catch (err) {
      console.error('Failed to fetch workbooks:', err);
      setError(err.response?.data?.message || 'Failed to load marks data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkbooks();
  }, []);

  // Filter workbooks by lecturer name
  const filteredWorkbooks = lecturerSearch.trim()
    ? workbooks.filter((wb) =>
        wb.lecturerName.toLowerCase().includes(lecturerSearch.toLowerCase())
      )
    : workbooks;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 border-4 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Marks Review</h1>
        <p className="text-gray-500">
          {isExecutive
            ? 'View marks sheets from all lecturers (read-only)'
            : isAcademicManager
            ? `View marks sheets for ${managedBranch} branch (read-only)`
            : 'View marks sheets (read-only)'}
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm border border-red-200">
          {error}
        </div>
      )}

      {/* Search */}
      {workbooks.length > 0 && (
        <div className="card">
          <div className="relative">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={lecturerSearch}
              onChange={(e) => setLecturerSearch(e.target.value)}
              className="input-field pl-10 text-sm"
              placeholder="Search by lecturer name..."
            />
          </div>
        </div>
      )}

      {/* Workbooks list */}
      {filteredWorkbooks.length === 0 ? (
        <div className="card text-center py-16">
          <FiBookOpen className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <h3 className="text-lg font-semibold text-gray-700 mb-2">
            {lecturerSearch.trim() ? 'No matching lecturers' : 'No Marks Sheets Yet'}
          </h3>
          <p className="text-gray-500 max-w-md mx-auto">
            {lecturerSearch.trim()
              ? `No lecturers found matching "${lecturerSearch}".`
              : 'When lecturers create marks sheets, they will appear here for review.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredWorkbooks.map((wb) => {
            const wbKey = wb.lecturerId;
            const isExpanded = expandedWorkbook === wbKey;
            const currentSheet = isExpanded ? (activeSheet[wbKey] || 0) : 0;
            const sheet = isExpanded && wb.sheets.length > 0 ? wb.sheets[currentSheet] : null;

            // Group sheets by batch for display
            const sheetsByBatch = {};
            wb.sheets.forEach((s, i) => {
              if (!sheetsByBatch[s.batch]) sheetsByBatch[s.batch] = [];
              sheetsByBatch[s.batch].push({ ...s, index: i });
            });

            return (
              <div key={wbKey} className="card overflow-hidden">
                {/* Workbook header — lecturer name */}
                <div
                  className="flex items-center justify-between p-4 hover:bg-gray-50 cursor-pointer"
                  onClick={() => setExpandedWorkbook(isExpanded ? null : wbKey)}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                        <span className="text-primary-700 font-bold text-sm">
                          {wb.lecturerName.split(' ').map((n) => n[0]).join('').substring(0, 2).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{wb.lecturerName}</h3>
                        <p className="text-sm text-gray-500">
                          {wb.sheets.length} sheet{wb.sheets.length !== 1 ? 's' : ''} •{' '}
                          {wb.sheets.reduce((sum, s) => sum + s.students.length, 0)} student
                          {wb.sheets.reduce((sum, s) => sum + s.students.length, 0) !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {isExpanded ? (
                      <FiChevronUp className="w-5 h-5 text-gray-400" />
                    ) : (
                      <FiChevronDown className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                </div>

                {/* Expanded: sheets for this lecturer */}
                {isExpanded && (
                  <div className="border-t border-gray-100 bg-gray-50/50 p-4 space-y-4">
                    {/* Sheet Tabs grouped by Batch */}
                    <div className="space-y-2">
                      {Object.keys(sheetsByBatch).map((batch) => (
                        <div key={batch} className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-semibold text-gray-500 w-20 flex-shrink-0">{batch}</span>
                          {sheetsByBatch[batch].map((s) => (
                            <button
                              key={s.index}
                              onClick={() => setActiveSheet((prev) => ({ ...prev, [wbKey]: s.index }))}
                              className={`px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1.5 ${
                                currentSheet === s.index
                                  ? 'bg-primary-600 text-white'
                                  : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                              }`}
                            >
                              <span className="text-xs opacity-75">{s.year}</span>
                              <span className="text-xs opacity-75">{s.branch}</span>
                              <span>{s.subject}</span>
                              <span className="text-xs opacity-75">({s.students.length})</span>
                            </button>
                          ))}
                        </div>
                      ))}
                    </div>

                    {/* Active Sheet Content */}
                    {sheet && (
                      <>
                        {/* Sheet badges */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="inline-block bg-amber-100 text-amber-700 text-xs font-semibold px-2.5 py-1 rounded">{sheet.year || new Date().getFullYear()}</span>
                          <span className="inline-block bg-primary-600 text-white text-xs font-semibold px-2.5 py-1 rounded">{sheet.batch}</span>
                          <span className="inline-block bg-blue-100 text-blue-700 text-xs font-semibold px-2.5 py-1 rounded">{sheet.branch}</span>
                          <span className="inline-block bg-green-100 text-green-700 text-xs font-semibold px-2.5 py-1 rounded">{sheet.subject}</span>
                        </div>

                        {/* Export actions */}
                        {(isExecutive || isAcademicManager) && (sheet.students.length > 0 && sheet.tests.length > 0) && (
                          <div className="flex items-center gap-2 mt-3">
                            <button
                              onClick={() => exportClassPdf({
                                sheet,
                                students: sheet.students,
                                tests: sheet.tests,
                                lecturerName: wb.lecturerName
                              })}
                              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-primary-600 text-white"
                            >
                              Download Class PDF
                            </button>
                          </div>
                        )}

                        {/* Tests */}
                        {sheet.tests.length > 0 && (
                          <div>
                            <h4 className="text-sm font-semibold text-gray-700 mb-2">Tests</h4>
                            <div className="flex flex-wrap gap-2">
                              {sheet.tests.map((test, idx) => (
                                <div
                                  key={idx}
                                  className={`px-3 py-1.5 rounded-lg border text-sm ${
                                    test.approved
                                      ? 'bg-green-50 border-green-200 text-green-700'
                                      : 'bg-white border-gray-200 text-gray-700'
                                  }`}
                                >
                                  <span className="font-medium">{test.name}</span>
                                  {test.assessmentDate && (
                                    <span className="text-xs text-gray-400 ml-1">• {formatDate(test.assessmentDate)}</span>
                                  )}
                                  <span className="text-xs text-gray-400 ml-1">/ {test.maxMarks || 100}</span>
                                  {test.approved && (
                                    <span className="ml-2 text-xs text-green-600 font-medium">✓ Approved</span>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Student Search Input */}
                        {sheet.students.length > 0 && sheet.tests.length > 0 && (
                          <div className="relative">
                            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                              type="text"
                              value={studentSearch[wbKey] || ''}
                              onChange={(e) => setStudentSearch((prev) => ({ ...prev, [wbKey]: e.target.value }))}
                              className="input-field pl-10 text-sm w-full max-w-xs"
                              placeholder="Search by name or NCUK ID..."
                            />
                          </div>
                        )}

                        {/* Marks Table */}
                        {sheet.students.length > 0 && sheet.tests.length > 0 ? (() => {
                          const searchLower = (studentSearch[wbKey] || '').trim().toLowerCase();
                          const displayStudents = searchLower
                            ? sheet.students.filter((s) =>
                                s.name.toLowerCase().includes(searchLower) ||
                                (s.ncukId && s.ncukId.toLowerCase().includes(searchLower))
                              )
                            : sheet.students;

                          if (displayStudents.length === 0) {
                            return (
                              <div className="text-center py-8 text-gray-400">
                                <p>No students match &quot;{studentSearch[wbKey]}&quot;</p>
                              </div>
                            );
                          }
                          return (
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="border-b border-gray-200">
                                  <th className="text-left py-3 px-3 font-semibold text-gray-700 bg-gray-50 sticky left-0 z-20 min-w-[100px]">NCUK ID</th>
                                  <th className="text-left py-3 px-4 font-semibold text-gray-700 bg-gray-50 sticky left-[100px] z-10 min-w-[150px]">Student</th>
                                  {sheet.tests.map((test, idx) => (
                                    <th
                                      key={idx}
                                      className={`text-center py-3 px-3 font-semibold min-w-[90px] ${
                                        test.approved ? 'bg-green-50 text-green-700' : 'bg-gray-50 text-gray-700'
                                      }`}
                                    >
                                      <div>{test.name}</div>
                                      {test.assessmentDate && (
                                        <div className="text-xs font-normal text-gray-400 mt-0.5">
                                          {formatDate(test.assessmentDate)}
                                        </div>
                                      )}
                                      <div className="text-xs font-normal text-gray-400 mt-0.5">
                                        out of {test.maxMarks || 100}
                                      </div>
                                    </th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {displayStudents.map((student, sIdx) => (
                                  <tr key={sIdx} className={sIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                                    <td className="py-2 px-3 text-gray-700 font-mono text-xs">
                                      {student.ncukId || '—'}
                                    </td>
                                    <td className="py-2 px-4 font-medium text-gray-900">
                                      {student.name}
                                    </td>
                                    {sheet.tests.map((test, tIdx) => {
                                      const mark = student.marks.find((m) => m.colIndex === test.colIndex);
                                      const value = mark && mark.value !== '' ? mark.value : '—';
                                      return (
                                        <td
                                          key={tIdx}
                                          className={`py-2 px-3 text-center font-medium ${
                                            test.approved ? 'text-green-700' : 'text-gray-700'
                                          }`}
                                        >
                                          {value}
                                        </td>
                                      );
                                    })}
                                    <td className="py-2 px-3 text-center">
                                      {(isExecutive || isAcademicManager) && (
                                        <button
                                          onClick={() => exportIndividualPdf({
                                            student,
                                            sheet,
                                            lecturerName: wb.lecturerName
                                          })}
                                          className="px-2 py-0.5 rounded text-xs font-semibold bg-gray-200 text-gray-700 hover:bg-gray-300"
                                        >
                                          PDF
                                        </button>
                                      )}
                                    </td>
                                  </tr>
                                ))}
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
                                </tr>
                              </tfoot>
                            </table>
                          </div>
                          );
                        })() : sheet.students.length === 0 ? (
                          <div className="text-center py-6 text-gray-400">
                            <FiUsers className="w-8 h-8 mx-auto mb-2 opacity-50" />
                            <p className="text-sm">No students added yet.</p>
                          </div>
                        ) : (
                          <div className="text-center py-6 text-gray-400">
                            <p className="text-sm">No tests added yet.</p>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ExecutiveMarks;
