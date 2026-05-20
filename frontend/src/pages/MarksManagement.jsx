import { useState, useEffect, useCallback } from 'react';
import { FiCheckCircle, FiXCircle, FiLink, FiMail, FiRefreshCw, FiTrash2, FiCopy, FiExternalLink } from 'react-icons/fi';
import { getMySheet, connectSheet, resetColumn, disconnectSheet } from '../api/marksSheetApi';
import { useAuth } from '../context/AuthContext';
import { getAppsScriptCode } from '../utils/appsScriptCode';

const WEBHOOK_BASE = window.location.origin;

const MarksManagement = () => {
  const { user } = useAuth();
  const [sheet, setSheet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showSetup, setShowSetup] = useState(false);
  const [copied, setCopied] = useState(false);
  const [connectForm, setConnectForm] = useState({ sheetUrl: '', staffEmail: '' });
  const [connectLoading, setConnectLoading] = useState(false);

  const webhookUrl = WEBHOOK_BASE + '/api/marks-sheets/webhook';
  const scriptCode = getAppsScriptCode(webhookUrl, sheet?.staffEmail || '', user?.name || '');

  const fetchSheet = useCallback(async () => {
    try {
      const res = await getMySheet();
      setSheet(res.data.data);
    } catch (err) {
      console.error('Failed to fetch sheet:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSheet(); }, [fetchSheet]);

  const handleConnect = async (e) => {
    e.preventDefault();
    setConnectLoading(true);
    try {
      const res = await connectSheet(connectForm);
      setSheet(res.data.data);
      setConnectForm({ sheetUrl: '', staffEmail: '' });
      setShowSetup(true);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to connect sheet.');
    } finally {
      setConnectLoading(false);
    }
  };

  const handleReset = async (colIndex) => {
    if (!window.confirm('Reset this column approval?')) return;
    try {
      const res = await resetColumn(colIndex);
      setSheet(res.data.data);
    } catch { alert('Failed to reset column.'); }
  };

  const handleDisconnect = async () => {
    if (!window.confirm('Disconnect your Google Sheet?')) return;
    try {
      await disconnectSheet();
      setSheet(null);
    } catch { alert('Failed to disconnect.'); }
  };

  const copyScript = () => {
    navigator.clipboard.writeText(scriptCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getEmbedUrl = (url) => {
    const match = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (!match) return null;
    return 'https://docs.google.com/spreadsheets/d/' + match[1] + '/edit?usp=sharing&rm=minimal';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 border-4 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!sheet) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Marks Management</h1>
          <p className="text-gray-500">Connect your Google Sheet to manage student marks and approvals</p>
        </div>
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <FiLink className="w-5 h-5" />
            Connect Google Sheet
          </h3>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4 text-sm text-blue-800">
            <p className="font-semibold mb-2">Before you start:</p>
            <ol className="list-decimal list-inside space-y-1">
              <li>Create a new Google Sheet</li>
              <li>Row 1: Test names (starting from column B)</li>
              <li>Row 2: Leave empty (checkboxes will go here)</li>
              <li>Column A: Student names (starting from row 3)</li>
              <li>Share the sheet with edit access</li>
            </ol>
          </div>
          <form onSubmit={handleConnect} className="space-y-4">
            <div>
              <label className="label">Google Sheet URL</label>
              <input type="url" value={connectForm.sheetUrl} onChange={(e) => setConnectForm((p) => ({ ...p, sheetUrl: e.target.value }))} className="input-field" placeholder="https://docs.google.com/spreadsheets/d/..." required />
            </div>
            <div>
              <label className="label">Staff Email</label>
              <input type="email" value={connectForm.staffEmail} onChange={(e) => setConnectForm((p) => ({ ...p, staffEmail: e.target.value }))} className="input-field" placeholder="staff@mie.com" required />
              <p className="text-xs text-gray-400 mt-1">Summary email will be sent here when all columns are approved</p>
            </div>
            <button type="submit" className="btn-primary w-full" disabled={connectLoading}>
              {connectLoading ? 'Connecting...' : 'Connect Sheet'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  const totalCols = sheet.columns.length;
  const approvedCols = sheet.columns.filter((c) => c.approved).length;
  const progress = totalCols > 0 ? (approvedCols / totalCols) * 100 : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Marks Management</h1>
          <p className="text-gray-500">Manage your student marks and approvals</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowSetup(!showSetup)} className="btn-secondary text-sm flex items-center gap-2">
            <FiCopy className="w-4 h-4" />
            {showSetup ? 'Hide' : 'View'} Setup Code
          </button>
          <button onClick={handleDisconnect} className="btn-danger text-sm flex items-center gap-2">
            <FiTrash2 className="w-4 h-4" />
            Disconnect
          </button>
        </div>
      </div>

      {showSetup && (
        <div className="card border-2 border-primary-200">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900">Google Apps Script Setup</h3>
            <button onClick={copyScript} className="btn-primary text-sm flex items-center gap-2">
              {copied ? <><FiCheckCircle className="w-4 h-4" /> Copied!</> : <><FiCopy className="w-4 h-4" /> Copy Code</>}
            </button>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-3 text-sm text-green-800">
            <p className="font-semibold">Script is pre-configured with your values:</p>
            <ul className="list-disc list-inside mt-1 space-y-1">
              <li><code className="bg-green-100 px-1 rounded">WEBHOOK_URL</code> = {webhookUrl}</li>
              <li><code className="bg-green-100 px-1 rounded">STAFF_EMAIL</code> = {sheet.staffEmail}</li>
              <li><code className="bg-green-100 px-1 rounded">LECTURER_NAME</code> = {user?.name}</li>
            </ul>
            {webhookUrl.includes('localhost') && (
              <p className="mt-2 text-yellow-700 bg-yellow-50 p-2 rounded">
                <strong>Note:</strong> You are running locally. The webhook URL uses localhost which Google Sheets cannot reach. Deploy your backend to a public server (e.g., Render, Railway) and update the WEBHOOK_URL in the script.
              </p>
            )}
          </div>
          <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg text-xs overflow-x-auto max-h-64 overflow-y-auto">
            {scriptCode}
          </pre>
          <div className="mt-3 text-sm text-gray-500">
            <p><strong>How to install:</strong></p>
            <ol className="list-decimal list-inside space-y-1 mt-1">
              <li>Open your Google Sheet</li>
              <li>Go to <strong>Extensions &gt; Apps Script</strong></li>
              <li>Delete any existing code and paste the script above</li>
              <li>Save the project (Ctrl+S)</li>
              <li>Run <code className="bg-gray-100 px-1 rounded">createCheckboxes()</code> - this adds checkboxes to row 2</li>
              <li>Run <code className="bg-gray-100 px-1 rounded">createTrigger()</code> - this enables email sending</li>
              <li>Authorize the script when prompted (click through the warnings)</li>
              <li>Return to your sheet - checkboxes in row 2 will now sync and send emails</li>
            </ol>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card text-center">
          <p className="text-sm text-gray-500">Total Tests</p>
          <p className="text-2xl font-bold text-gray-900">{totalCols || '-'}</p>
        </div>
        <div className="card text-center">
          <p className="text-sm text-gray-500">Approved</p>
          <p className="text-2xl font-bold text-green-600">{approvedCols}</p>
        </div>
        <div className="card text-center">
          <p className="text-sm text-gray-500">Status</p>
          {sheet.allApproved ? (
            <div className="flex items-center justify-center gap-1 text-green-600">
              <FiCheckCircle className="w-5 h-5" />
              <span className="text-lg font-bold">All Done!</span>
            </div>
          ) : (
            <p className="text-lg font-bold text-yellow-600">Pending</p>
          )}
        </div>
      </div>

      {totalCols > 0 && (
        <div className="card">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Approval Progress</span>
            <span className="text-sm text-gray-500">{approvedCols}/{totalCols}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div className={'h-3 rounded-full transition-all ' + (sheet.allApproved ? 'bg-green-500' : 'bg-primary-500')} style={{ width: progress + '%' }} />
          </div>
        </div>
      )}

      {sheet.columns.length > 0 && (
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Test Approvals</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {sheet.columns.map((col) => (
              <div key={col.colIndex} className={'flex items-center justify-between p-3 rounded-lg border ' + (col.approved ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200')}>
                <div className="flex items-center gap-2">
                  {col.approved ? <FiCheckCircle className="w-5 h-5 text-green-600" /> : <FiXCircle className="w-5 h-5 text-gray-400" />}
                  <div>
                    <p className="font-medium text-gray-900">{col.name}</p>
                    <p className="text-xs text-gray-500">{col.approved ? 'Approved ' + (col.approvedAt ? new Date(col.approvedAt).toLocaleDateString() : '') : 'Pending'}</p>
                  </div>
                </div>
                {col.approved && (
                  <button onClick={() => handleReset(col.colIndex)} className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1" title="Reset approval">
                    <FiRefreshCw className="w-3 h-3" /> Reset
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Your Google Sheet</h3>
          <a href={sheet.sheetUrl} target="_blank" rel="noopener noreferrer" className="btn-secondary text-sm flex items-center gap-2">
            <FiExternalLink className="w-4 h-4" />
            Open in Google Sheets
          </a>
        </div>
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <iframe src={getEmbedUrl(sheet.sheetUrl)} className="w-full h-[500px]" frameBorder="0" title="Google Sheet" />
        </div>
      </div>

      <div className="card bg-gray-50">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary-100 rounded-lg">
            <FiMail className="w-5 h-5 text-primary-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">Summary email will be sent to:</p>
            <p className="text-sm text-gray-600">{sheet.staffEmail}</p>
            {sheet.lastEmailSentAt && <p className="text-xs text-gray-400 mt-1">Last sent: {new Date(sheet.lastEmailSentAt).toLocaleString()}</p>}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MarksManagement;
