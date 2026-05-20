const MarksSheet = require('../models/MarksSheet');

// @desc    Connect a Google Sheet
// @route   POST /api/marks-sheets
const connectSheet = async (req, res, next) => {
  try {
    const { sheetUrl, staffEmail } = req.body;

    // Extract sheet ID from URL
    const match = sheetUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (!match) {
      return res.status(400).json({ success: false, message: 'Invalid Google Sheet URL.' });
    }
    const sheetId = match[1];

    // Upsert — one sheet per lecturer
    const sheet = await MarksSheet.findOneAndUpdate(
      { lecturerId: req.user._id },
      { lecturerId: req.user._id, sheetUrl, sheetId, staffEmail, columns: [], allApproved: false, lastEmailSentAt: null },
      { upsert: true, new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      message: 'Google Sheet connected successfully.',
      data: sheet,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get my connected sheet
// @route   GET /api/marks-sheets/my
const getMySheet = async (req, res, next) => {
  try {
    const sheet = await MarksSheet.findOne({ lecturerId: req.user._id });
    if (!sheet) {
      return res.json({ success: true, data: null });
    }
    res.json({ success: true, data: sheet });
  } catch (error) {
    next(error);
  }
};

// @desc    Update column approvals (called by Google Apps Script via webhook)
// @route   POST /api/marks-sheets/webhook
const updateApprovals = async (req, res, next) => {
  try {
    const { sheetId, sheetName, columns } = req.body;

    const doc = await MarksSheet.findOne({ sheetId });
    if (!doc) {
      return res.status(404).json({ success: false, message: 'Sheet not found.' });
    }

    // Update columns for the specific sheet (batch)
    if (sheetName && doc.sheets) {
      const sheetDoc = doc.sheets.find((s) => s.name === sheetName);
      if (sheetDoc) {
        sheetDoc.columns = columns;
      } else {
        doc.sheets.push({ name: sheetName, columns });
      }
    } else {
      // Legacy: single sheet mode
      doc.sheets = [{ name: 'Default', columns }];
    }
    await doc.save();

    res.json({ success: true, data: sheet });
  } catch (error) {
    next(error);
  }
};

// @desc    Mark that summary email was sent
// @route   POST /api/marks-sheets/email-sent
const markEmailSent = async (req, res, next) => {
  try {
    const { sheetId } = req.body;
    const sheet = await MarksSheet.findOneAndUpdate(
      { sheetId },
      { lastEmailSentAt: new Date() },
      { new: true }
    );
    res.json({ success: true, data: sheet });
  } catch (error) {
    next(error);
  }
};

// @desc    Reset a column approval
// @route   PUT /api/marks-sheets/reset-column
const resetColumn = async (req, res, next) => {
  try {
    const { colIndex, sheetName } = req.body;
    const doc = await MarksSheet.findOne({ lecturerId: req.user._id });
    if (!doc) {
      return res.status(404).json({ success: false, message: 'No sheet connected.' });
    }

    // Find the column in the specific sheet
    if (doc.sheets && doc.sheets.length > 0) {
      const targetSheet = sheetName
        ? doc.sheets.find((s) => s.name === sheetName)
        : doc.sheets[0];
      if (targetSheet) {
        const col = targetSheet.columns.find((c) => c.colIndex === colIndex);
        if (col) {
          col.approved = false;
          col.approvedAt = null;
        }
      }
    }
    await doc.save();

    res.json({ success: true, data: sheet });
  } catch (error) {
    next(error);
  }
};

// @desc    Disconnect sheet
// @route   DELETE /api/marks-sheets
const disconnectSheet = async (req, res, next) => {
  try {
    await MarksSheet.findOneAndDelete({ lecturerId: req.user._id });
    res.json({ success: true, message: 'Sheet disconnected.' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  connectSheet,
  getMySheet,
  updateApprovals,
  markEmailSent,
  resetColumn,
  disconnectSheet,
};
