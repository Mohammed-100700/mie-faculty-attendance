import { formatBDT } from '../utils/formatCurrency';

const SalarySummaryCard = ({ data }) => {
  const { totalClasses, totalPayableAmount, ratePerClass } = data;

  return (
    <div className="card">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Salary Summary</h3>
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="text-center p-3 bg-primary-50 rounded-lg">
          <p className="text-2xl font-bold text-primary-700">{totalClasses}</p>
          <p className="text-xs text-primary-600">Total Classes</p>
        </div>
        <div className="text-center p-3 bg-green-50 rounded-lg">
          <p className="text-2xl font-bold text-green-700">{formatBDT(totalPayableAmount)}</p>
          <p className="text-xs text-green-600">Total Salary</p>
        </div>
        <div className="text-center p-3 bg-gray-50 rounded-lg">
          <p className="text-2xl font-bold text-gray-700">{formatBDT(ratePerClass)}</p>
          <p className="text-xs text-gray-500">Rate/Class</p>
        </div>
      </div>
    </div>
  );
};

export default SalarySummaryCard;
