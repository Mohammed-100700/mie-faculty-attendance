import { FiDownload, FiFile, FiFileText } from 'react-icons/fi';
import { exportSalaryReportPDF } from '../utils/exportPdf';
import { exportSalaryReportExcel } from '../utils/exportExcel';

const ExportButtons = ({ reportData }) => {
  if (!reportData) return null;

  return (
    <div className="flex gap-3">
      <button
        onClick={() => exportSalaryReportPDF(reportData)}
        className="btn-primary flex items-center gap-2"
      >
        <FiFileText className="w-4 h-4" />
        Export PDF
      </button>
      <button
        onClick={() => exportSalaryReportExcel(reportData)}
        className="btn-success flex items-center gap-2"
      >
        <FiFile className="w-4 h-4" />
        Export Excel
      </button>
    </div>
  );
};

export default ExportButtons;
