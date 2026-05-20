import { useState } from 'react';
import { FiGrid, FiCheckCircle } from 'react-icons/fi';
import QRCheckInCard from '../components/QRCheckInCard';
import ClassLogForm from '../components/ClassLogForm';

const QRCheckIn = () => {
  const [verifiedBranch, setVerifiedBranch] = useState(null);
  const [qrToken, setQrToken] = useState(null);
  const [submitted, setSubmitted] = useState(false);

  const handleBranchVerified = (branch, token) => {
    setVerifiedBranch(branch);
    setQrToken(token);
    setSubmitted(false);
  };

  const handleSubmitSuccess = () => {
    setSubmitted(true);
    setVerifiedBranch(null);
    setQrToken(null);
  };

  const handleCheckInAgain = () => {
    setSubmitted(false);
    setVerifiedBranch(null);
    setQrToken(null);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">QR Check-In</h1>
        <p className="text-gray-500">Scan or select a branch to log your class</p>
      </div>

      {submitted ? (
        <div className="card text-center py-12">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FiCheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            Class Log Submitted!
          </h3>
          <p className="text-gray-500 mb-6">
            Your class has been recorded successfully.
          </p>
          <button onClick={handleCheckInAgain} className="btn-primary">
            Check In Again
          </button>
        </div>
      ) : verifiedBranch ? (
        <div className="card">
          <div className="flex items-center gap-3 mb-4 p-3 bg-green-50 rounded-lg">
            <FiCheckCircle className="w-5 h-5 text-green-600" />
            <span className="text-green-700 font-medium">
              Verified: {verifiedBranch} Branch
            </span>
          </div>
          <ClassLogForm
            onSuccess={handleSubmitSuccess}
            initialBranches={[verifiedBranch]}
          />
        </div>
      ) : (
        <QRCheckInCard onBranchVerified={handleBranchVerified} />
      )}
    </div>
  );
};

export default QRCheckIn;
