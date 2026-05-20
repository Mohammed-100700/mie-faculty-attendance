import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

const BatchSummaryChart = ({ batchBreakdown }) => {
  const data = Object.entries(batchBreakdown).map(([batch, d]) => ({
    batch,
    Present: d.present,
    Absent: d.absent,
    Cancelled: d.cancelled,
  }));

  if (data.length === 0) {
    return (
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Batch Summary</h3>
        <div className="text-center py-8 text-gray-400">
          No data available for this period.
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Batch Summary</h3>
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="batch" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip />
          <Legend />
          <Bar dataKey="Present" fill="#22c55e" radius={[4, 4, 0, 0]} />
          <Bar dataKey="Absent" fill="#ef4444" radius={[4, 4, 0, 0]} />
          <Bar dataKey="Cancelled" fill="#eab308" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default BatchSummaryChart;
