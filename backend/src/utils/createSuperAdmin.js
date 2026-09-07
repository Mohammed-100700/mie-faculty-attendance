require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

const createSuperAdmin = async () => {
  try {
    // Validate required environment variables
    const name = process.env.SUPER_ADMIN_NAME;
    const email = process.env.SUPER_ADMIN_EMAIL;
    const password = process.env.SUPER_ADMIN_PASSWORD;

    if (!name || !email || !password) {
      console.error(
        'Error: Missing required environment variables. Set SUPER_ADMIN_NAME, SUPER_ADMIN_EMAIL, and SUPER_ADMIN_PASSWORD.'
      );
      process.exit(1);
    }

    // Validate password meets minimum length requirement (6 characters)
    if (password.length < 6) {
      console.error(
        'Error: Password must be at least 6 characters.'
      );
      process.exit(1);
    }

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB.');

    try {
      // Check if a Super Admin already exists
      const existingSuperAdmin = await User.findOne({ role: 'Super Admin' });
      if (existingSuperAdmin) {
        console.error(
          'Error: A Super Admin account already exists. Bootstrap can only create the first Super Admin account.'
        );
        process.exit(1);
      }

      // Check if the email already belongs to an existing user
      const existingUserByEmail = await User.findOne({ email });
      if (existingUserByEmail) {
        console.error(
          'Error: An account with that email already exists. Cannot promote an existing user to Super Admin.'
        );
        process.exit(1);
      }

      // Create the Super Admin user
      // The User model's pre-save hook will hash the password automatically
      const userData = {
        name,
        email,
        password,
        role: 'Super Admin',
        isActive: true,
      };

      const user = await User.create(userData);

      console.log('Super Admin account created successfully.');
      console.log(`Email: ${user.email}`);
    } finally {
      // Close the database connection cleanly in all cases
      await mongoose.connection.close();
      console.log('Database connection closed.');
    }

    process.exit(0);
  } catch (error) {
    console.error(`Bootstrap error: ${error.message}`);
    process.exit(1);
  }
};

createSuperAdmin();