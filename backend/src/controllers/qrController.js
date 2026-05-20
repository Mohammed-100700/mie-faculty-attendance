const { generateQRToken, verifyQRToken, getBranchQRTokens } = require('../services/qrService');
const QRCode = require('qrcode');

// @desc    Generate QR code for a branch
// @route   POST /api/qr/generate
const generateQR = async (req, res, next) => {
  try {
    const { branch } = req.body;

    if (!branch || !['Dhanmondi', 'Uttara'].includes(branch)) {
      return res.status(400).json({
        success: false,
        message: 'Valid branch (Dhanmondi or Uttara) is required.',
      });
    }

    const qrToken = await generateQRToken(branch);

    // Generate QR code as data URL
    const qrDataUrl = await QRCode.toDataURL(qrToken.token);

    res.json({
      success: true,
      data: {
        branch: qrToken.branch,
        token: qrToken.token,
        qrCode: qrDataUrl,
        expiresAt: qrToken.expiresAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Verify a QR token
// @route   POST /api/qr/verify
const verifyQR = async (req, res, next) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'QR token is required.',
      });
    }

    const result = await verifyQRToken(token);

    if (!result.valid) {
      return res.status(400).json({
        success: false,
        message: result.message,
      });
    }

    res.json({
      success: true,
      message: 'QR token verified.',
      data: {
        branch: result.branch,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all branch QR codes
// @route   GET /api/qr/branches
const getBranchQRCodes = async (req, res, next) => {
  try {
    const tokens = await getBranchQRTokens();

    // Generate QR code images for each token
    const branchQRCodes = await Promise.all(
      tokens.map(async (t) => {
        const qrDataUrl = await QRCode.toDataURL(t.token);
        return {
          branch: t.branch,
          token: t.token,
          qrCode: qrDataUrl,
          expiresAt: t.expiresAt,
        };
      })
    );

    res.json({
      success: true,
      data: branchQRCodes,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { generateQR, verifyQR, getBranchQRCodes };
