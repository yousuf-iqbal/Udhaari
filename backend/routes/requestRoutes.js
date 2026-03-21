const express = require('express');
const router = express.Router();
const {verifyToken} = require('../middleware/verifyToken');
const requestController = require('../controllers/requestController');

// PUBLIC routes — no login needed
router.get('/', requestController.getAllRequests);
router.get('/my', verifyToken, requestController.getMyRequests);   // MUST be before /:id
router.get('/:id', requestController.getRequestById);

// PROTECTED routes — login required
router.post('/', verifyToken, requestController.createRequest);
router.patch('/:id/close', verifyToken, requestController.closeRequest);

module.exports = router;
