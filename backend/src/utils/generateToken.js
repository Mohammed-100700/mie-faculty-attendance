const jwt = require('jsonwebtoken');

const generateToken = (userId) => {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret === 'your_jwt_secret_change_this_in_production') {
    throw new Error('JWT_SECRET is not configured. Set a strong secret in .env');
  }
  return jwt.sign({ id: userId }, secret, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
};

module.exports = generateToken;
