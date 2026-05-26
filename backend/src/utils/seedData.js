require('dotenv').config();
const mongoose = require('mongoose');
const Branch = require('../models/Branch');
const Subject = require('../models/Subject');
const User = require('../models/User');
const QRToken = require('../models/QRToken');
const { v4: uuidv4 } = require('uuid');

const seedData = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB for seeding...');

    await Branch.deleteMany({});
    await Subject.deleteMany({});
    await User.deleteMany({});
    await QRToken.deleteMany({});
    console.log('Cleared existing data.');

    const branches = await Branch.insertMany([
      { name: 'Dhanmondi', code: 'DHN', isActive: true },
      { name: 'Uttara', code: 'UTT', isActive: true },
    ]);
    console.log(`Seeded ${branches.length} branches.`);

    const subjectNames = [
      'Mathematics', 'Physics', 'Chemistry', 'Computer Science',
      'Business Studies', 'Economics', 'English for Academic Purposes',
    ];
    const subjectDocs = subjectNames.map((name) => ({
      name, programme: 'NCUK IFY', createdBy: null, isDefault: true, isActive: true,
    }));
    const subjects = await Subject.insertMany(subjectDocs);
    console.log(`Seeded ${subjects.length} subjects.`);

    const demoLecturer = await User.create({
      name: 'Demo Lecturer',
      email: 'lecturer@mie.com',
      password: 'password123',
      phone: '+880 1700-000000',
      role: 'Lecturer',
      branches: ['Dhanmondi', 'Uttara'],
    });
    console.log(`Seeded demo lecturer: ${demoLecturer.email}`);

    const demoAM = await User.create({
      name: 'Academic Manager',
      email: 'manager@mie.com',
      password: 'password123',
      phone: '+880 1700-000001',
      role: 'Academic Manager',
      managedBranch: 'Dhanmondi',
    });
    console.log(`Seeded demo Academic Manager: ${demoAM.email} (Dhanmondi)`);

    const qrTokens = [];
    for (const branch of branches) {
      qrTokens.push({
        branch: branch.name,
        token: uuidv4(),
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        isActive: true,
      });
    }
    const seededTokens = await QRToken.insertMany(qrTokens);
    console.log(`Seeded ${seededTokens.length} QR tokens.`);

    console.log('\n=== Seeding Complete ===');
    console.log('Demo Lecturer:');
    console.log('  Email: lecturer@mie.com');
    console.log('  Password: password123');
    console.log('  Role: Lecturer');
    console.log('');
    console.log('Demo Academic Manager:');
    console.log('  Email: manager@mie.com');
    console.log('  Password: password123');
    console.log('  Role: Academic Manager (Dhanmondi)');

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error(`Seeding error: ${error.message}`);
    process.exit(1);
  }
};

seedData();
