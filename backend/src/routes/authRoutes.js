const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();
const { login, getMe, updateProfile, changePassword } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

// Credential-stuffing protection for login only. Successful logins are
// refunded, so only failed attempts count against the allowance.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: 'Too many login attempts. Please try again later.',
    });
  },
});

router.post('/login', loginLimiter, login);
router.get('/me', protect, getMe);
router.put('/profile', protect, updateProfile);
// Any active authenticated role may replace its own password. Authorization is
// unchanged: protect loads the account from the database, and no role or
// assignment field is read from or written to the request.
router.put('/password', protect, changePassword);

module.exports = router;
