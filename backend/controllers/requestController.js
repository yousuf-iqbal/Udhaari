const requestModel = require('../models/requestModel');

// GET /api/requests  — public, no login needed
async function getAllRequests(req, res) {
  try {
    const requests = await requestModel.getAllRequests();
    res.json(requests);
  } catch (err) {
    console.error('getAllRequests error:', err.message || err);
    res.status(500).json({ error: 'could not fetch requests.' });
  }
}

// GET /api/requests/:id  — public
async function getRequestById(req, res) {
  try {
    const request = await requestModel.getRequestById(req.params.id);
    if (!request) return res.status(404).json({ error: 'request not found.' });
    res.json(request);
  } catch (err) {
    console.error('getRequestById error:', err.message || err);
    res.status(500).json({ error: 'could not fetch request.' });
  }
}

// POST /api/requests  — login required (verifyToken runs before this)
async function createRequest(req, res) {
  try {
    const { title, description, category, city, area, startDate, endDate, maxBudget } = req.body;

    if (!title || !description || !category || !city || !durationDays) {
      return res.status(400).json({ error: 'title, description, category, city, and durationDays are required.' });
    }

    // req.user is set by verifyToken middleware — contains uid (Firebase UID)
    // We need the SQL UserID. verifyToken already attaches req.userID (see verifyToken.js)
    const newRequest = await requestModel.createRequest(
      req.userID,
      title,
      description,
      category,
      city,
      area || null,
      durationDays
    );

    res.status(201).json({ message: 'request posted successfully.', request: newRequest });
  } catch (err) {
    console.error('createRequest error:', err.message || err);
    res.status(500).json({ error: 'could not post request.' });
  }
}

// GET /api/requests/my  — login required, returns only YOUR requests
async function getMyRequests(req, res) {
  try {
    const requests = await requestModel.getRequestsByUser(req.userID);
    res.json(requests);
  } catch (err) {
    console.error('getMyRequests error:', err.message || err);
    res.status(500).json({ error: 'could not fetch your requests.' });
  }
}

// PATCH /api/requests/:id/close  — login required, only the owner can close
async function closeRequest(req, res) {
  try {
    const rowsUpdated = await requestModel.closeRequest(req.params.id, req.userID);
    if (rowsUpdated === 0) {
      return res.status(403).json({ error: 'request not found or you are not the owner.' });
    }
    res.json({ message: 'request closed successfully.' });
  } catch (err) {
    console.error('closeRequest error:', err.message || err);
    res.status(500).json({ error: 'could not close request.' });
  }
}

module.exports = { getAllRequests, getRequestById, createRequest, getMyRequests, closeRequest };
