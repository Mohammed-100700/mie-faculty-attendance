import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FiBookOpen,
  FiCheckCircle,
  FiChevronDown,
  FiChevronUp,
  FiClock,
  FiDownload,
  FiFilter,
  FiInfo,
  FiPercent,
  FiSearch,
  FiUsers,
  FiXCircle,
} from 'react-icons/fi';
import { getReports, getStudentReports } from '../api/attendanceSessionApi';
import { getBranches } from '../api/branchApi';
import { useAuth } from '../context/AuthContext';
import ExportButtons from '../components/ExportButtons';
import { exportStudentAttendancePdf } from '../utils/exportAttendancePdf';

const BATCHES = ['September', 'December', 'March', 'June'];
const EMPTY_FILTERS = { year: '', batch: '', branch: '', subject: '' };

const errorMessage = (error, fallback) =>
  error.response?.data?.message || error.message || fallback;

const formatDate = (value, includeWeekday = false) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-GB', {
    ...(includeWeekday ? { weekday: 'short' } : {}),
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

const formatPercentage = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number.toFixed(1) : '0.0';
};

const lecturerName = (lecturer) => {
  if (typeof lecturer === 'string') return lecturer || '—';
  return lecturer?.name || '—';
};

const mergeOptions = (current, incoming) =>
  [...new Set([...current, ...incoming].filter(Boolean).map(String))];

const ExecutiveDashboard = () => {
  const { user } = useAuth();
  const isAcademicManager = user?.role === 'Academic Manager';
  const managedBranch = user?.managedBranch || '';

  const [activeTab, setActiveTab] = useState('students');
  const [sessions, setSessions] = useState([]);
  const [students, setStudents] = useState([]);
  const [excludedLegacyCount, setExcludedLegacyCount] = useState(0);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [studentLoading, setStudentLoading] = useState(true);
  const [sessionError, setSessionError] = useState('');
  const [studentError, setStudentError] = useState('');

  const [year, setYear] = useState('');
  const [batch, setBatch] = useState('');
  const [branch, setBranch] = useState('');
  const [subject, setSubject] = useState('');
  const [appliedFilters, setAppliedFilters] = useState({});
  const [availableBranches, setAvailableBranches] = useState([]);
  const [availableYears, setAvailableYears] = useState([]);
  const [availableSubjects, setAvailableSubjects] = useState([]);

  const [studentSearch, setStudentSearch] = useState('');
  const [expandedStudent, setExpandedStudent] = useState(null);
  const [expandedSession, setExpandedSession] = useState(null);
  const sessionRequestId = useRef(0);
  const studentRequestId = useRef(0);

  useEffect(() => {
    if (isAcademicManager) return undefined;
    let cancelled = false;

    const fetchBranches = async () => {
      try {
        const response = await getBranches();
        if (!cancelled) setAvailableBranches(response.data.data || []);
      } catch (error) {
        console.error('Failed to fetch branches:', error);
      }
    };

    fetchBranches();
    return () => { cancelled = true; };
  }, [isAcademicManager]);

  const buildFilter = useCallback((values) => {
    const filter = {};
    const normalized = {
      year: String(values.year || '').trim(),
      batch: String(values.batch || '').trim(),
      branch: isAcademicManager
        ? String(managedBranch || '').trim()
        : String(values.branch || '').trim(),
      subject: String(values.subject || '').trim(),
    };

    Object.entries(normalized).forEach(([key, value]) => {
      if (value) filter[key] = value;
    });
    return filter;
  }, [isAcademicManager, managedBranch]);

  const loadSessions = useCallback(async (filter) => {
    const requestId = ++sessionRequestId.current;
    setSessionLoading(true);
    setSessionError('');

    try {
      const response = await getReports(filter);
      if (requestId !== sessionRequestId.current) return;
      const nextSessions = response.data.data || [];
      setSessions(nextSessions);
      setAvailableYears((current) => mergeOptions(
        current,
        nextSessions.map((session) => session.year).filter((value) => value && value !== 'Unspecified')
      ));
      setAvailableSubjects((current) => mergeOptions(
        current,
        nextSessions.map((session) => session.subject)
      ));
    } catch (error) {
      if (requestId === sessionRequestId.current) {
        console.error('Failed to fetch session reports:', error);
        setSessionError(errorMessage(error, 'Failed to load session reports.'));
      }
    } finally {
      if (requestId === sessionRequestId.current) setSessionLoading(false);
    }
  }, []);

  const loadStudents = useCallback(async (filter) => {
    const requestId = ++studentRequestId.current;
    setStudentLoading(true);
    setStudentError('');

    try {
      const response = await getStudentReports(filter);
      if (requestId !== studentRequestId.current) return;
      setStudents(response.data.data || []);
      setExcludedLegacyCount(response.data.excludedLegacySessionCount || 0);
    } catch (error) {
      if (requestId === studentRequestId.current) {
        console.error('Failed to fetch student reports:', error);
        setStudentError(errorMessage(error, 'Failed to load student reports.'));
      }
    } finally {
      if (requestId === studentRequestId.current) setStudentLoading(false);
    }
  }, []);

  useEffect(() => {
    const initialFilter = buildFilter(EMPTY_FILTERS);
    setAppliedFilters(initialFilter);
    loadSessions(initialFilter);
    loadStudents(initialFilter);
  }, [buildFilter, loadSessions, loadStudents]);

  const reportsBusy = sessionLoading || studentLoading;

  const handleApply = async () => {
    if (reportsBusy) return;
    const nextFilter = buildFilter({ year, batch, branch, subject });
    setAppliedFilters(nextFilter);
    await Promise.allSettled([loadSessions(nextFilter), loadStudents(nextFilter)]);
  };

  const handleClear = async () => {
    if (reportsBusy) return;
    setYear('');
    setBatch('');
    setBranch('');
    setSubject('');
    setStudentSearch('');
    const nextFilter = buildFilter(EMPTY_FILTERS);
    setAppliedFilters(nextFilter);
    await Promise.allSettled([loadSessions(nextFilter), loadStudents(nextFilter)]);
  };

  const yearOptions = useMemo(() => mergeOptions(
    availableYears,
    year ? [year] : []
  ).sort((a, b) => b.localeCompare(a, undefined, { numeric: true })), [availableYears, year]);

  const subjectOptions = useMemo(() => mergeOptions(
    availableSubjects,
    subject ? [subject] : []
  ).sort((a, b) => a.localeCompare(b)), [availableSubjects, subject]);

  const branchOptions = useMemo(() => {
    if (isAcademicManager) return [];
    return mergeOptions(
      availableBranches.map((item) => item.name),
      [...sessions.map((session) => session.branch), branch]
    ).sort((a, b) => a.localeCompare(b));
  }, [availableBranches, branch, isAcademicManager, sessions]);

  const filteredStudents = useMemo(() => {
    const query = studentSearch.trim().toLowerCase();
    if (!query) return students;
    return students.filter((student) =>
      [student.studentName, student.mieStudentId, student.ncukId]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query))
    );
  }, [studentSearch, students]);

  const studentTotals = useMemo(() => {
    const present = students.reduce((sum, student) => sum + (Number(student.presentCount) || 0), 0);
    const absent = students.reduce((sum, student) => sum + (Number(student.absentCount) || 0), 0);
    const average = students.length
      ? students.reduce((sum, student) => sum + (Number(student.attendancePercentage) || 0), 0) / students.length
      : 0;
    return { present, absent, average };
  }, [students]);

  const totalSessions = sessions.length;
  const totalCheckins = sessions.reduce((sum, session) => sum + (session.checkinCount || 0), 0);
  const avgCheckins = totalSessions > 0 ? Math.round(totalCheckins / totalSessions) : 0;
  const hasAppliedFilters = ['year', 'batch', 'branch', 'subject'].some((key) => appliedFilters[key]);
  const reportBranch = isAcademicManager ? managedBranch : appliedFilters.branch;

  const exportLogs = sessions.map((session) => ({
    ...session,
    date: session.sessionDate,
    remarks: [
      session.year ? `Year: ${session.year}` : null,
      session.batch ? `Batch: ${session.batch}` : null,
      session.subject ? `Subject: ${session.subject}` : null,
      `Present: ${session.checkinCount || 0}`,
    ].filter(Boolean).join(' | '),
    entries: [{
      branch: session.branch,
      classes: 1,
      approvalStatus: 'Approved',
    }],
  }));

  const renderError = (message, retry, loading) => message && (
    <div className="flex flex-col gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 sm:flex-row sm:items-center sm:justify-between">
      <span>{message}</span>
      <button
        type="button"
        onClick={retry}
        disabled={loading}
        className="self-start rounded-lg border border-red-300 bg-white px-3 py-1.5 font-medium text-red-700 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50 sm:self-auto"
      >
        {loading ? 'Retrying…' : 'Retry'}
      </button>
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Attendance Reports</h1>
        <p className="text-gray-500">
          {isAcademicManager && managedBranch
            ? `Review student and session attendance for ${managedBranch}.`
            : 'Review student attendance and session records across academic years.'}
        </p>
      </div>

      <div className="card">
        <div className="mb-4 flex items-center gap-2">
          <FiFilter className="h-5 w-5 text-gray-500" />
          <h2 className="font-semibold text-gray-900">Filters</h2>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <div>
            <label className="label" htmlFor="attendance-year">Academic Year</label>
            <select id="attendance-year" value={year} onChange={(event) => setYear(event.target.value)} className="input-field text-sm">
              <option value="">All Years</option>
              {yearOptions.map((value) => <option key={value} value={value}>{value}</option>)}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="attendance-batch">Batch</label>
            <select id="attendance-batch" value={batch} onChange={(event) => setBatch(event.target.value)} className="input-field text-sm">
              <option value="">All Batches</option>
              {BATCHES.map((value) => <option key={value} value={value}>{value}</option>)}
            </select>
          </div>
          {isAcademicManager ? (
            <div>
              <span className="label">Branch</span>
              <div className="input-field bg-gray-50 text-sm text-gray-600" aria-label="Managed branch">
                {managedBranch || 'No branch assigned'}
              </div>
            </div>
          ) : (
            <div>
              <label className="label" htmlFor="attendance-branch">Branch</label>
              <select id="attendance-branch" value={branch} onChange={(event) => setBranch(event.target.value)} className="input-field text-sm">
                <option value="">All Branches</option>
                {branchOptions.map((value) => <option key={value} value={value}>{value}</option>)}
              </select>
            </div>
          )}
          <div>
            <label className="label" htmlFor="attendance-subject">Subject</label>
            <select id="attendance-subject" value={subject} onChange={(event) => setSubject(event.target.value)} className="input-field text-sm">
              <option value="">All Subjects</option>
              {subjectOptions.map((value) => <option key={value} value={value}>{value}</option>)}
            </select>
          </div>
          <div className="flex items-end gap-2">
            <button type="button" onClick={handleApply} disabled={reportsBusy} className="btn-primary flex-1 text-sm">
              {reportsBusy ? 'Loading…' : 'Apply'}
            </button>
            <button type="button" onClick={handleClear} disabled={reportsBusy} className="btn-secondary text-sm disabled:cursor-not-allowed disabled:opacity-50">
              Clear
            </button>
          </div>
        </div>
      </div>

      <div className="border-b border-gray-200" role="tablist" aria-label="Attendance report views">
        <div className="flex gap-2">
          {[
            { id: 'students', label: 'Student Reports', icon: FiUsers },
            { id: 'sessions', label: 'Sessions', icon: FiBookOpen },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={activeTab === id}
              aria-controls={`${id}-report-panel`}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${
                activeTab === id
                  ? 'border-primary-600 text-primary-700'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'students' && (
        <section id="students-report-panel" role="tabpanel" className="space-y-5">
          {renderError(studentError, () => loadStudents(appliedFilters), studentLoading)}

          {excludedLegacyCount > 0 && (
            <div className="flex gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
              <FiInfo className="mt-0.5 h-5 w-5 flex-shrink-0" />
              <p>
                {excludedLegacyCount} older session{excludedLegacyCount === 1 ? '' : 's'} excluded from student percentages because roster snapshots are unavailable.
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <div className="card flex items-center gap-3 p-4">
              <div className="rounded-xl bg-primary-50 p-3"><FiUsers className="h-5 w-5 text-primary-600" /></div>
              <div><p className="text-xs text-gray-500 sm:text-sm">Total Students</p><p className="text-2xl font-bold text-gray-900">{students.length}</p></div>
            </div>
            <div className="card flex items-center gap-3 p-4">
              <div className="rounded-xl bg-green-50 p-3"><FiCheckCircle className="h-5 w-5 text-green-600" /></div>
              <div><p className="text-xs text-gray-500 sm:text-sm">Present Records</p><p className="text-2xl font-bold text-gray-900">{studentTotals.present}</p></div>
            </div>
            <div className="card flex items-center gap-3 p-4">
              <div className="rounded-xl bg-red-50 p-3"><FiXCircle className="h-5 w-5 text-red-600" /></div>
              <div><p className="text-xs text-gray-500 sm:text-sm">Absent Records</p><p className="text-2xl font-bold text-gray-900">{studentTotals.absent}</p></div>
            </div>
            <div className="card flex items-center gap-3 p-4">
              <div className="rounded-xl bg-amber-50 p-3"><FiPercent className="h-5 w-5 text-amber-600" /></div>
              <div><p className="text-xs text-gray-500 sm:text-sm">Average Attendance</p><p className="text-2xl font-bold text-gray-900">{formatPercentage(studentTotals.average)}%</p></div>
            </div>
          </div>

          <div className="card space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Students ({students.length})</h2>
                {studentLoading && students.length > 0 && <p className="text-xs text-gray-500">Refreshing student reports…</p>}
              </div>
              <div className="relative w-full sm:max-w-sm">
                <FiSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <label htmlFor="student-report-search" className="sr-only">Search student reports</label>
                <input
                  id="student-report-search"
                  type="search"
                  value={studentSearch}
                  onChange={(event) => setStudentSearch(event.target.value)}
                  className="input-field pl-10 text-sm"
                  placeholder="Search name, MIE ID, or NCUK ID"
                />
              </div>
            </div>

            {studentLoading && students.length === 0 ? (
              <div className="py-12 text-center" aria-live="polite">
                <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" />
                <p className="mt-3 text-sm text-gray-500">Loading student reports…</p>
              </div>
            ) : students.length === 0 ? (
              <div className="py-12 text-center text-gray-500">
                <FiUsers className="mx-auto mb-3 h-12 w-12 text-gray-300" />
                <p>{hasAppliedFilters ? 'No students found for the selected filters.' : 'No student attendance reports are available yet.'}</p>
              </div>
            ) : filteredStudents.length === 0 ? (
              <div className="py-10 text-center text-gray-500">No students match “{studentSearch}”.</div>
            ) : (
              <div className="space-y-3">
                {filteredStudents.map((student) => {
                  const isExpanded = expandedStudent === student.studentRef;
                  const percentage = Math.min(100, Math.max(0, Number(student.attendancePercentage) || 0));
                  const historyId = `student-history-${student.studentRef}`;
                  return (
                    <article key={student.studentRef} className="overflow-hidden rounded-xl border border-gray-200">
                      <div className="flex items-stretch">
                        <button
                          type="button"
                          onClick={() => setExpandedStudent(isExpanded ? null : student.studentRef)}
                          aria-expanded={isExpanded}
                          aria-controls={historyId}
                          className="min-w-0 flex-1 p-4 text-left hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500"
                        >
                          <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
                            <div className="flex min-w-0 flex-1 items-center gap-3">
                              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-primary-100 font-bold text-primary-700">
                                {(student.studentName || '?').split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <h3 className="truncate font-semibold text-gray-900">{student.studentName || 'Unknown student'}</h3>
                                <p className="text-xs text-gray-500">MIE: {student.mieStudentId || '—'} <span aria-hidden="true">•</span> NCUK: {student.ncukId || '—'}</p>
                              </div>
                            </div>
                            <div className="grid grid-cols-3 gap-3 text-center text-sm lg:w-64">
                              <div><p className="font-bold text-gray-900">{student.eligibleSessions ?? 0}</p><p className="text-xs text-gray-500">Eligible</p></div>
                              <div><p className="font-bold text-green-700">{student.presentCount ?? 0}</p><p className="text-xs text-gray-500">Present</p></div>
                              <div><p className="font-bold text-red-700">{student.absentCount ?? 0}</p><p className="text-xs text-gray-500">Absent</p></div>
                            </div>
                            <div className="flex items-center gap-3 lg:w-52">
                              <div className="flex-1">
                                <div className="mb-1 flex justify-between text-xs"><span className="text-gray-500">Attendance</span><span className="font-semibold text-gray-900">{formatPercentage(student.attendancePercentage)}%</span></div>
                                <div className="h-2 overflow-hidden rounded-full bg-gray-200" role="progressbar" aria-label={`${student.studentName} attendance`} aria-valuemin="0" aria-valuemax="100" aria-valuenow={percentage}>
                                  <div className="h-full rounded-full bg-primary-600" style={{ width: `${percentage}%` }} />
                                </div>
                              </div>
                              {isExpanded ? <FiChevronUp className="h-5 w-5 text-gray-400" /> : <FiChevronDown className="h-5 w-5 text-gray-400" />}
                            </div>
                          </div>
                        </button>
                        <div className="flex items-center border-l border-gray-100 px-2 sm:px-3">
                          <button
                            type="button"
                            onClick={() => exportStudentAttendancePdf(student, appliedFilters)}
                            className="rounded-lg p-2 text-primary-700 hover:bg-primary-50 focus:outline-none focus:ring-2 focus:ring-primary-500"
                            aria-label={`Download attendance PDF for ${student.studentName}`}
                            title="Download PDF"
                          >
                            <FiDownload className="h-5 w-5" />
                          </button>
                        </div>
                      </div>

                      {isExpanded && (
                        <div id={historyId} className="space-y-2 border-t border-gray-100 bg-gray-50 p-4">
                          <h4 className="text-sm font-semibold text-gray-700">Attendance history</h4>
                          {(student.history || []).length === 0 ? (
                            <p className="text-sm text-gray-500">No eligible session history.</p>
                          ) : student.history.map((entry, index) => (
                            <div key={`${entry.sessionId}-${index}`} className="rounded-lg border border-gray-200 bg-white p-3">
                              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                <div className="min-w-0">
                                  <p className="font-medium text-gray-900">{entry.subject || '—'}</p>
                                  <p className="text-sm text-gray-500">{formatDate(entry.sessionDate)} <span aria-hidden="true">•</span> {entry.year || 'Unspecified'} <span aria-hidden="true">•</span> {entry.batch || '—'}</p>
                                  <p className="text-xs text-gray-500">{entry.branch || '—'} <span aria-hidden="true">•</span> Lecturer: {lecturerName(entry.lecturer)}</p>
                                </div>
                                <span className={entry.status === 'present' ? 'badge badge-present self-start sm:self-auto' : 'badge badge-absent self-start sm:self-auto'}>
                                  {entry.status === 'present' ? 'Present' : 'Absent'}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      )}

      {activeTab === 'sessions' && (
        <section id="sessions-report-panel" role="tabpanel" className="space-y-5">
          {renderError(sessionError, () => loadSessions(appliedFilters), sessionLoading)}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="card flex items-center gap-4"><div className="rounded-xl bg-primary-50 p-3"><FiBookOpen className="h-6 w-6 text-primary-600" /></div><div><p className="text-sm text-gray-500">Total Sessions</p><p className="text-2xl font-bold text-gray-900">{totalSessions}</p></div></div>
            <div className="card flex items-center gap-4"><div className="rounded-xl bg-green-50 p-3"><FiUsers className="h-6 w-6 text-green-600" /></div><div><p className="text-sm text-gray-500">Total Check-ins</p><p className="text-2xl font-bold text-gray-900">{totalCheckins}</p></div></div>
            <div className="card flex items-center gap-4"><div className="rounded-xl bg-orange-50 p-3"><FiClock className="h-6 w-6 text-orange-600" /></div><div><p className="text-sm text-gray-500">Avg per Session</p><p className="text-2xl font-bold text-gray-900">{avgCheckins}</p></div></div>
          </div>

          {sessions.length > 0 && (
            <div className="flex justify-end">
              <ExportButtons logs={exportLogs} month={new Date().getMonth() + 1} year={appliedFilters.year || new Date().getFullYear()} variant="manager" managedBranch={reportBranch || ''} userName={user?.name} />
            </div>
          )}

          <div className="card">
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Sessions ({sessions.length})</h2>
              {sessionLoading && sessions.length > 0 && <p className="text-xs text-gray-500">Refreshing sessions…</p>}
            </div>
            {sessionLoading && sessions.length === 0 ? (
              <div className="py-12 text-center" aria-live="polite"><div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" /><p className="mt-3 text-sm text-gray-500">Loading sessions…</p></div>
            ) : sessions.length === 0 ? (
              <div className="py-12 text-center text-gray-500"><FiBookOpen className="mx-auto mb-3 h-12 w-12 text-gray-300" /><p>{hasAppliedFilters ? 'No sessions found for the selected filters.' : 'No attendance sessions are available yet.'}</p></div>
            ) : (
              <div className="space-y-3">
                {sessions.map((session) => {
                  const isExpanded = expandedSession === session._id;
                  const detailsId = `session-details-${session._id}`;
                  return (
                    <div key={session._id} className="overflow-hidden rounded-lg border border-gray-200">
                      <button
                        type="button"
                        onClick={() => setExpandedSession(isExpanded ? null : session._id)}
                        aria-expanded={isExpanded}
                        aria-controls={detailsId}
                        className="flex w-full items-center justify-between gap-3 p-4 text-left hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">{session.year || 'Unspecified'}</span>
                            <span className="rounded bg-primary-600 px-2 py-0.5 text-xs font-semibold text-white">{session.batch}</span>
                            <span className="rounded bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700">{session.branch}</span>
                            {session.subject && <span className="rounded bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700">{session.subject}</span>}
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-gray-500"><span>{formatDate(session.sessionDate, true)}</span><span aria-hidden="true">•</span><span>{session.lecturerId?.name || 'Unknown lecturer'}</span></div>
                        </div>
                        <div className="flex items-center gap-3"><div className="text-right"><p className="text-lg font-bold text-gray-900">{session.checkinCount || 0}</p><p className="text-xs text-gray-400">students</p></div>{isExpanded ? <FiChevronUp className="h-5 w-5 text-gray-400" /> : <FiChevronDown className="h-5 w-5 text-gray-400" />}</div>
                      </button>

                      {isExpanded && (
                        <div id={detailsId} className="border-t border-gray-100 bg-gray-50 p-4">
                          <p className="mb-2 text-sm font-medium text-gray-700">Checked-in Students</p>
                          {session.checkins?.length ? (
                            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
                              {session.checkins.map((checkin) => (
                                <div key={checkin._id} className="rounded bg-white px-3 py-2 text-sm"><p className="font-medium text-gray-900">{checkin.studentName}</p>{checkin.studentId && <p className="text-xs text-gray-400">Roll: {checkin.studentId}</p>}</div>
                              ))}
                            </div>
                          ) : <p className="text-sm text-gray-500">No students were marked present.</p>}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
};

export default ExecutiveDashboard;
