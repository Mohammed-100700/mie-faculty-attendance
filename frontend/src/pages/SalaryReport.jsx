import { useState, useEffect } from 'react';
import { FiCalendar, FiFileText } from 'react-icons/fi';
import { getMonthlyReport } from '../api/reportApi';
import BranchSummaryChart from '../components/BranchSummaryChart';
import ExportButtons from '../components/ExportButtons';
import ClassLogTable from '../components/ClassLogTable';
import { getMonthName } from '../utils/formatCurrency';

const SalaryReport = () => {
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());

  const fetchReport = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await getMonthlyReport(month, year);
      setReportData(res.data.data);
    } catch {
      setError('Failed to load salary report.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchReport(); }, [month, year]);

  const months = Array.from({ length: 12 }, (_, i) => ({ value: i + 1, label: getMonthName(i + 1) }));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 border-4 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Monthly Salary Report</h1>
          <p className="text-gray-500">View your salary breakdown for a specific month</p>
        </div>
        {reportData && <ExportButtons reportData={reportData} />}
      </div>

      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <FiCalendar className="w-5 h-5 text-gray-500" />
          <h3 className="font-semibold text-gray-900">Select Period</h3>
        </div>
        <div className="flex gap-3">
          <select value={month} onChange={(e) => setMonth(parseInt(e.target.value))} className="input-field w-40">
            {months.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
          <select value={year} onChange={(e) => setYear(parseInt(e.target.value))} className="input-field w-32">
            <option value="2025">2025</option>
            <option value="2026">2026</option>
            <option value="2027">2027</option>
          </select>
          <button onClick={fetchReport} className="btn-primary">Generate Report</button>
        </div>
      </div>

      {error && <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>}

      {reportData && (
        <>
          <div className="card bg-gradient-to-r from-primary-500 to-primary-700 text-white">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <p className="text-primary-100 text-sm">{getMonthName(reportData.month)} {reportData.year}</p>
                <h2 className="text-2xl font-bold">{reportData.lecturer.name}</h2>
                <p className="text-primary-100">{reportData.lecturer.email}</p>
              </div>
              <div className="text-right">
                <p className="text-primary-100 text-sm">Total Payable</p>
                <p className="text-3xl font-bold">৳ {reportData.totalPayableAmount.toLocaleString()}</p>
                <p className="text-primary-200 text-sm">{reportData.totalClasses} classes × ৳ {reportData.ratePerClass}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="card text-center">
              <p className="text-sm text-gray-500">Total Classes</p>
              <p className="text-3xl font-bold text-gray-900">{reportData.totalClasses}</p>
            </div>
            <div className="card text-center">
              <p className="text-sm text-gray-500">Total Salary</p>
              <p className="text-3xl font-bold text-green-600">৳ {reportData.totalPayableAmount.toLocaleString()}</p>
            </div>
          </div>

          <BranchSummaryChart branchBreakdown={reportData.branchBreakdown} />

          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <FiFileText className="w-5 h-5" />
              Detailed Class Logs
            </h3>
            <ClassLogTable logs={reportData.detailedLogs} />
          </div>
        </>
      )}
    </div>
  );
};

export default SalaryReport;
