const jwt = require('jsonwebtoken');

/**
 * Signs a JWT for a user document.
 * Accepts the user document (not a bare id) so both the id and the current
 * tokenVersion are signed. Bumping tokenVersion invalidates every token that
 * was issued before it.
 */
const generateToken = (user) => {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret === 'your_jwt_secret_change_this_in_production') {
    throw new Error('JWT_SECRET is not configured. Set a strong secret in .env');
  }

  if (!user || !user._id) {
    throw new Error('generateToken requires a user document with an _id.');
  }

  const tokenVersion = Number.isInteger(user.tokenVersion) ? user.tokenVersion : 0;

  return jwt.sign({ id: user._id, tokenVersion }, secret, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
};

module.exports = generateToken;
