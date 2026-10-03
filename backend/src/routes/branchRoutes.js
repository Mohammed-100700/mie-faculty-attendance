const express = require('express');
const router = express.Router();
const { getBranches } = require('../controllers/branchController');

router.get('/', getBranches);

module.exports = router;
