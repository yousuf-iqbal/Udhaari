const offerModel = require('../models/offerModel');

// GET /api/offers/:requestID  — public, see all offers on a request
async function getOffersByRequest(req, res) {
  try {
    const offers = await offerModel.getOffersByRequest(req.params.requestID);
    res.json(offers);
  } catch (err) {
    console.error('getOffersByRequest error:', err.message || err);
    res.status(500).json({ error: 'could not fetch offers.' });
  }
}

// GET /api/offers/my  — login required, lender sees their own offers
async function getMyOffers(req, res) {
  try {
    const offers = await offerModel.getOffersByUser(req.userID);
    res.json(offers);
  } catch (err) {
    console.error('getMyOffers error:', err.message || err);
    res.status(500).json({ error: 'could not fetch your offers.' });
  }
}

// POST /api/offers  — login required, make an offer on a request
async function createOffer(req, res) {
  try {
    const { requestID, offeredPrice, message } = req.body;

    if (!requestID || !offeredPrice) {
      return res.status(400).json({ error: 'requestID and offeredPrice are required.' });
    }
    if (isNaN(offeredPrice) || Number(offeredPrice) <= 0) {
      return res.status(400).json({ error: 'offeredPrice must be a positive number.' });
    }

    const result = await offerModel.createOffer(
      requestID,
      req.userID,
      offeredPrice,
      message || null
    );

    if (result.error) {
      return res.status(result.code).json({ error: result.error });
    }

    res.status(201).json({ message: 'offer submitted successfully.', offer: result.offer });
  } catch (err) {
    console.error('createOffer error:', err.message || err);
    res.status(500).json({ error: 'could not submit offer.' });
  }
}

// PATCH /api/offers/:id/accept  — login required, requester accepts an offer
async function acceptOffer(req, res) {
  try {
    const result = await offerModel.acceptOffer(req.params.id, req.userID);

    if (result.error) {
      return res.status(result.code).json({ error: result.error });
    }

    res.json({ message: 'offer accepted. request is now closed.' });
  } catch (err) {
    console.error('acceptOffer error:', err.message || err);
    res.status(500).json({ error: 'could not accept offer.' });
  }
}

// PATCH /api/offers/:id/reject  — login required, requester rejects one offer
async function rejectOffer(req, res) {
  try {
    const result = await offerModel.rejectOffer(req.params.id, req.userID);

    if (result.error) {
      return res.status(result.code).json({ error: result.error });
    }

    res.json({ message: 'offer rejected.' });
  } catch (err) {
    console.error('rejectOffer error:', err.message || err);
    res.status(500).json({ error: 'could not reject offer.' });
  }
}

module.exports = { getOffersByRequest, getMyOffers, createOffer, acceptOffer, rejectOffer };
