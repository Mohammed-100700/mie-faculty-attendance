const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { errorHandler, notFound } = require('./middleware/errorMiddleware');

// Import routes
const authRoutes = require('./routes/authRoutes');
const branchRoutes = require('./routes/branchRoutes');
const subjectRoutes = require('./routes/subjectRoutes');
const classLogRoutes = require('./routes/classLogRoutes');
const attendanceApprovalRoutes = require('./routes/attendanceApprovalRoutes');
const qrRoutes = require('./routes/qrRoutes');
const marksSheetRoutes = require('./routes/marksSheetRoutes');
const workbookRoutes = require('./routes/workbookRoutes');

const app = express();

// Security headers
app.use(helmet());

// CORS — restrict to known origins
const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:5173').split(',');
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'MIE Faculty Attendance API is running.' });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/branches', branchRoutes);
app.use('/api/subjects', subjectRoutes);
app.use('/api/class-logs', classLogRoutes);
app.use('/api/attendance', attendanceApprovalRoutes);
app.use('/api/qr', qrRoutes);
app.use('/api/marks-sheets', marksSheetRoutes);
app.use('/api/workbook', workbookRoutes);

// Error handling
app.use(notFound);
app.use(errorHandler);

module.exports = app;
