const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { protect, authorizeRole } = require('../middleware/authMiddleware');

router.get('/dashboard', protect, authorizeRole('Super Admin'), adminController.dashboard);
router.get('/branches', protect, authorizeRole('Super Admin'), adminController.getAdminBranches);
router.post('/branches', protect, authorizeRole('Super Admin'), adminController.createBranch);
router.put('/branches/:id', protect, authorizeRole('Super Admin'), adminController.updateBranch);
router.patch('/branches/:id/status', protect, authorizeRole('Super Admin'), adminController.toggleBranchStatus);
router.get('/subjects', protect, authorizeRole('Super Admin'), adminController.getAdminSubjects);
router.post('/subjects', protect, authorizeRole('Super Admin'), adminController.createSubject);
router.put('/subjects/:id', protect, authorizeRole('Super Admin'), adminController.updateSubject);
router.patch('/subjects/:id/status', protect, authorizeRole('Super Admin'), adminController.toggleSubjectStatus);
router.get('/users', protect, authorizeRole('Super Admin'), adminController.getUsers);
router.post('/users', protect, authorizeRole('Super Admin'), adminController.createUser);
router.put('/users/:id', protect, authorizeRole('Super Admin'), adminController.updateUser);
router.patch('/users/:id/status', protect, authorizeRole('Super Admin'), adminController.updateStatus);
router.patch('/users/:id/reset-password', protect, authorizeRole('Super Admin'), adminController.resetPassword);

module.exports = router;