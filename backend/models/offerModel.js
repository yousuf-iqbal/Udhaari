const { poolPromise, sql } = require('../config/db');

// Get all offers for a specific request
async function getOffersByRequest(requestID) {
  const pool = await poolPromise;
  const result = await pool.request()
    .input('RequestID', requestID)
    .query(`
      SELECT
        o.OfferID,
        o.RequestID,
        o.LenderID,
        o.OfferedPrice,
        o.Message,
        o.Status,
        o.CreatedAt,
        u.FullName  AS LenderName,
        u.City      AS LenderCity,
        u.Area      AS LenderArea
      FROM Offers o
      JOIN Users u ON o.LenderID = u.UserID
      WHERE o.RequestID = @RequestID
      ORDER BY o.CreatedAt ASC
    `);
  return result.recordset;
}

// Get all offers made BY a specific user (lender's dashboard)
async function getOffersByUser(userID) {
  const pool = await poolPromise;
  const result = await pool.request()
    .input('UserID', userID)
    .query(`
      SELECT
        o.OfferID,
        o.OfferedPrice,
        o.Message,
        o.Status,
        o.CreatedAt,
        r.Title       AS RequestTitle,
        r.Category    AS RequestCategory,
        r.RequestID,
        u.FullName    AS RequesterName
      FROM Offers o
      JOIN Requests r ON o.RequestID = r.RequestID
      JOIN Users u    ON r.RequesterID = u.UserID
      WHERE o.LenderID = @UserID
      ORDER BY o.CreatedAt DESC
    `);
  return result.recordset;
}

// Get a single offer by ID
async function getOfferById(offerID) {
  const pool = await poolPromise;
  const result = await pool.request()
    .input('OfferID', offerID)
    .query(`
      SELECT
        o.OfferID,
        o.RequestID,
        o.LenderID,
        o.OfferedPrice,
        o.Message,
        o.Status,
        o.CreatedAt,
        r.RequesterID
      FROM Offers o
      JOIN Requests r ON o.RequestID = r.RequestID
      WHERE o.OfferID = @OfferID
    `);
  return result.recordset[0];
}

// Make an offer on a request (one lender can only offer once per request)
async function createOffer(requestID, lenderID, offeredPrice, message) {
  const pool = await poolPromise;

  // Check: lender cannot offer on their own request
  const ownerCheck = await pool.request()
    .input('RequestID', requestID)
    .input('LenderID', lenderID)
    .query(`SELECT RequesterID FROM Requests WHERE RequestID = @RequestID`);

  if (!ownerCheck.recordset[0]) return { error: 'request not found.', code: 404 };
  if (ownerCheck.recordset[0].RequesterID === lenderID) {
    return { error: 'you cannot make an offer on your own request.', code: 400 };
  }

  // Check: request must still be open
  const statusCheck = await pool.request()
    .input('RequestID', requestID)
    .query(`SELECT Status FROM Requests WHERE RequestID = @RequestID`);
  if (statusCheck.recordset[0].Status !== 'open') {
    return { error: 'this request is no longer open.', code: 400 };
  }

  // Insert — UNIQUE(RequestID, LenderID) constraint will reject duplicates
  try {
    const result = await pool.request()
      .input('RequestID', requestID)
      .input('LenderID', lenderID)
      .input('OfferedPrice', offeredPrice)
      .input('Message', message || null)
      .query(`
        INSERT INTO Offers (RequestID, LenderID, OfferedPrice, Message, Status, CreatedAt)
        OUTPUT INSERTED.*
        VALUES (@RequestID, @LenderID, @OfferedPrice, @Message, 'pending', GETDATE())
      `);
    return { offer: result.recordset[0] };
  } catch (err) {
    if (err.number === 2627 || err.number === 2601) {
      // Unique constraint violation — already offered
      return { error: 'you have already made an offer on this request.', code: 409 };
    }
    throw err;
  }
}

// Accept an offer — only the requester can do this
// Sets the accepted offer to 'accepted', all others on same request to 'rejected'
async function acceptOffer(offerID, requesterID) {
  const pool = await poolPromise;

  // Verify the caller is the requester of this offer's request
  const check = await pool.request()
    .input('OfferID', offerID)
    .query(`
      SELECT o.RequestID, r.RequesterID, r.Status AS RequestStatus
      FROM Offers o
      JOIN Requests r ON o.RequestID = r.RequestID
      WHERE o.OfferID = @OfferID
    `);

  if (!check.recordset[0]) return { error: 'offer not found.', code: 404 };
  if (check.recordset[0].RequesterID !== requesterID) {
    return { error: 'only the requester can accept an offer.', code: 403 };
  }
  if (check.recordset[0].RequestStatus !== 'open') {
    return { error: 'this request is no longer open.', code: 400 };
  }

  const requestID = check.recordset[0].RequestID;

  // Accept this offer
  await pool.request()
    .input('OfferID', offerID)
    .query(`UPDATE Offers SET Status = 'accepted' WHERE OfferID = @OfferID`);

  // Reject all other offers on the same request
  await pool.request()
    .input('RequestID', requestID)
    .input('OfferID', offerID)
    .query(`
      UPDATE Offers
      SET Status = 'rejected'
      WHERE RequestID = @RequestID AND OfferID != @OfferID
    `);

  // Close the request
  await pool.request()
    .input('RequestID', requestID)
    .query(`UPDATE Requests SET Status = 'closed' WHERE RequestID = @RequestID`);

  return { success: true, requestID };
}

// Reject a single offer — only the requester can do this
async function rejectOffer(offerID, requesterID) {
  const pool = await poolPromise;

  const check = await pool.request()
    .input('OfferID', offerID)
    .query(`
      SELECT r.RequesterID
      FROM Offers o
      JOIN Requests r ON o.RequestID = r.RequestID
      WHERE o.OfferID = @OfferID
    `);

  if (!check.recordset[0]) return { error: 'offer not found.', code: 404 };
  if (check.recordset[0].RequesterID !== requesterID) {
    return { error: 'only the requester can reject an offer.', code: 403 };
  }

  await pool.request()
    .input('OfferID', offerID)
    .query(`UPDATE Offers SET Status = 'rejected' WHERE OfferID = @OfferID`);

  return { success: true };
}

module.exports = { getOffersByRequest, getOffersByUser, getOfferById, createOffer, acceptOffer, rejectOffer };
