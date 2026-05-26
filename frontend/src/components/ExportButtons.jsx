import { useState } from 'react';
import { FiFileText, FiGrid } from 'react-icons/fi';
import { exportLecturerPdf, exportManagerPdf } from '../utils/exportPdf';
import { exportLecturerExcel, exportManagerExcel } from '../utils/exportExcel';

const ExportButtons = ({ logs, month, year, variant, managedBranch, userName, lecturerName }) => {
  const [generating, setGenerating] = useState(null);

  if (!logs || logs.length === 0) return null;

  const handlePdf = async () => {
    setGenerating('pdf');
    try {
      if (variant === 'manager') {
        exportManagerPdf(logs, month, year, managedBranch, lecturerName);
      } else {
        exportLecturerPdf(logs, month, year, userName);
      }
    } finally {
      setGenerating(null);
    }
  };

  const handleExcel = async () => {
    setGenerating('excel');
    try {
      if (variant === 'manager') {
        exportManagerExcel(logs, month, year, managedBranch, lecturerName);
      } else {
        exportLecturerExcel(logs, month, year);
      }
    } finally {
      setGenerating(null);
    }
  };

  return (
    <div className="flex gap-2">
      <button
        onClick={handlePdf}
        disabled={generating === 'pdf'}
        className="btn-secondary text-sm flex items-center gap-1.5"
      >
        <FiFileText className="w-4 h-4" />
        {generating === 'pdf' ? 'Generating...' : 'Export PDF'}
      </button>
      <button
        onClick={handleExcel}
        disabled={generating === 'excel'}
        className="btn-secondary text-sm flex items-center gap-1.5"
      >
        <FiGrid className="w-4 h-4" />
        {generating === 'excel' ? 'Generating...' : 'Export Excel'}
      </button>
    </div>
  );
};

export default ExportButtons;
