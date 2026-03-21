const express = require('express');
const router = express.Router();
const {verifyToken} = require('../middleware/verifyToken');
const offerController = require('../controllers/offerController');

// PUBLIC routes
router.get('/request/:requestID', offerController.getOffersByRequest);

// PROTECTED routes — login required
router.get('/my', verifyToken, offerController.getMyOffers);
router.post('/', verifyToken, offerController.createOffer);
router.patch('/:id/accept', verifyToken, offerController.acceptOffer);
router.patch('/:id/reject', verifyToken, offerController.rejectOffer);

module.exports = router;
