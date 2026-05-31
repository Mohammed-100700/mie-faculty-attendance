const express = require('express');
const router = express.Router();
const { seedAll } = require('../controllers/seedController');

// POST /api/seed — seed all default data (protected by ADMIN_SEED_SECRET)
router.post('/', seedAll);

module.exports = router;
