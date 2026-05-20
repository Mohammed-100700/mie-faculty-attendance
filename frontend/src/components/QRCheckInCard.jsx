import { useState, useEffect } from 'react';
import { FiCheckCircle, FiRefreshCw } from 'react-icons/fi';
import { getBranchQRCodes, verifyQR } from '../api/qrApi';

const QRCheckInCard = ({ onBranchVerified }) => {
  const [qrCodes, setQRCodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState('');
  const [manualToken, setManualToken] = useState('');

  useEffect(() => {
    loadQRCodes();
  }, []);

  const loadQRCodes = async () => {
    try {
      const res = await getBranchQRCodes();
      setQRCodes(res.data.data);
    } catch {
      setError('Failed to load QR codes.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (token) => {
    setVerifying(true);
    setError('');
    try {
      const res = await verifyQR(token);
      if (res.data.success) {
        onBranchVerified(res.data.data.branch, token);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid QR token.');
    } finally {
      setVerifying(false);
    }
  };

  if (loading) {
    return (
      <div className="card text-center py-8">
        <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
        <p className="text-gray-500">Loading QR codes...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Branch QR Codes */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {qrCodes.map((qr) => (
          <div key={qr.branch} className="card text-center">
            <h4 className="font-semibold text-gray-900 mb-3">{qr.branch} Branch</h4>
            {qr.qrCode && (
              <img
                src={qr.qrCode}
                alt={`${qr.branch} QR Code`}
                className="w-40 h-40 mx-auto mb-3"
              />
            )}
            <button
              onClick={() => handleVerify(qr.token)}
              disabled={verifying}
              className="btn-primary w-full"
            >
              {verifying ? 'Verifying...' : `Check in at ${qr.branch}`}
            </button>
          </div>
        ))}
      </div>

      {/* Manual Token Entry */}
      <div className="card">
        <h4 className="font-semibold text-gray-900 mb-3">Manual Token Entry</h4>
        <p className="text-sm text-gray-500 mb-3">
          If you have a QR token, enter it below to verify.
        </p>
        <div className="flex gap-2">
          <input
            type="text"
            value={manualToken}
            onChange={(e) => setManualToken(e.target.value)}
            placeholder="Enter QR token..."
            className="input-field flex-1"
          />
          <button
            onClick={() => handleVerify(manualToken)}
            disabled={verifying || !manualToken}
            className="btn-primary"
          >
            Verify
          </button>
        </div>
      </div>

      {/* Refresh */}
      <button
        onClick={loadQRCodes}
        className="btn-secondary flex items-center gap-2 mx-auto"
      >
        <FiRefreshCw className="w-4 h-4" />
        Refresh QR Codes
      </button>
    </div>
  );
};

export default QRCheckInCard;
