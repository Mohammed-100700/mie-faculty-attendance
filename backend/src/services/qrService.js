const QRToken = require('../models/QRToken');
const { v4: uuidv4 } = require('uuid');

/**
 * Generate a new QR token for a branch.
 * Since there is no schedule, QR only verifies branch/check-in method.
 */
const generateQRToken = async (branch) => {
  // Deactivate old tokens for this branch
  await QRToken.updateMany({ branch }, { isActive: false });

  const token = uuidv4();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  const qrToken = await QRToken.create({
    branch,
    token,
    expiresAt,
    isActive: true,
  });

  return qrToken;
};

/**
 * Verify a QR token and return the branch if valid.
 */
const verifyQRToken = async (token) => {
  const qrToken = await QRToken.findOne({
    token,
    isActive: true,
  });

  if (!qrToken) {
    return { valid: false, message: 'Invalid QR token.' };
  }

  if (new Date() > qrToken.expiresAt) {
    return { valid: false, message: 'QR token has expired.' };
  }

  return { valid: true, branch: qrToken.branch };
};

/**
 * Get all active branch QR tokens.
 */
const getBranchQRTokens = async () => {
  const tokens = await QRToken.find({ isActive: true }).select(
    'branch token expiresAt'
  );
  return tokens;
};

module.exports = { generateQRToken, verifyQRToken, getBranchQRTokens };
