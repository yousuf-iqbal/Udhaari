const { poolPromise, sql } = require('../config/db');

// Get all open requests (public — no login needed)
// Includes requester name, city, and offer count
async function getAllRequests() {
  const pool = await poolPromise;
  const result = await pool.request().query(`
    SELECT
      r.RequestID,
      r.Title,
      r.Description,
      r.CategoryID,
      r.City,
      r.Area,
      r.StartDate,
      r.EndDate,
      r.MaxBudget,
      r.Status,
      r.CreatedAt,
      u.FullName   AS RequesterName,
      u.UserID     AS RequesterID,
      COUNT(o.OfferID) AS OfferCount
    FROM Requests r
    JOIN Users u ON r.RequesterID = u.UserID
    LEFT JOIN Offers o ON o.RequestID = r.RequestID
    WHERE r.Status = 'open'
    GROUP BY
      r.RequestID, r.Title, r.Description, r.CategoryID,
      r.City, r.Area, r.StartDate, r.EndDate, r.MaxBudget,
      r.Status, r.CreatedAt,
      u.FullName, u.UserID
    ORDER BY r.CreatedAt DESC
  `);
  return result.recordset;
}
// Get a single request by ID with offer count
async function getRequestById(requestID) {
  const pool = await poolPromise;
  const result = await pool.request()
    .input('RequestID', requestID)
    .query(`
      SELECT
        r.RequestID,
        r.Title,
        r.Description,
        r.Category,
        r.City,
        r.Area,
        r.StartDate, 
        r.EndDate, 
        r.MaxBudget,
        r.Status,
        r.CreatedAt,
        u.FullName   AS RequesterName,
        u.UserID     AS RequesterID,
        COUNT(o.OfferID) AS OfferCount
      FROM Requests r
      JOIN Users u ON r.RequesterID = u.UserID
      LEFT JOIN Offers o ON o.RequestID = r.RequestID
      WHERE r.RequestID = @RequestID
      GROUP BY
        r.RequestID, r.Title, r.Description, r.Category,
        r.City, r.Area, r.StartDate, r.EndDate, r.MaxBudget, r.Status, r.CreatedAt,
        u.FullName, u.UserID
    `);
  return result.recordset[0];
}

// Post a new request (login required)
async function createRequest(requesterID, title, description, categoryID, city, area, startDate, endDate, maxBudget) {
  const pool = await poolPromise;
  const result = await pool.request()
    .input('RequesterID', requesterID)
    .input('Title', title)
    .input('Description', description)
    .input('CategoryID', categoryID)
    .input('City', city)
    .input('Area', area)
    .input('StartDate', startDate)
    .input('EndDate', endDate)
    .input('MaxBudget', maxBudget)
    .query(`
      INSERT INTO Requests (RequesterID, Title, Description, CategoryID, City, Area, StartDate, EndDate, MaxBudget, Status, CreatedAt)
      OUTPUT INSERTED.*
      VALUES (@RequesterID, @Title, @Description, @CategoryID, @City, @Area, @StartDate, @EndDate, @MaxBudget, 'open', GETDATE())
    `);
  return result.recordset[0];
}

// Get all requests posted by a specific user
async function getRequestsByUser(userID) {
  const pool = await poolPromise;
  const result = await pool.request()
    .input('UserID', userID)
    .query(`
      SELECT
        r.RequestID,
        r.Title,
        r.Description,
        r.Category,
        r.City,
        r.Area,
        r.StartDate, 
        r.EndDate, 
        r.MaxBudget,
        r.Status,
        r.CreatedAt,
        COUNT(o.OfferID) AS OfferCount
      FROM Requests r
      LEFT JOIN Offers o ON o.RequestID = r.RequestID
      WHERE r.RequesterID = @UserID
      GROUP BY
        r.RequestID, r.Title, r.Description, r.Category,
        r.City, r.Area, r.StartDate, r.EndDate, r.MaxBudget, r.Status, r.CreatedAt
      ORDER BY r.CreatedAt DESC
    `);
  return result.recordset;
}

// Close/cancel a request (only the requester can do this)
async function closeRequest(requestID, userID) {
  const pool = await poolPromise;
  const result = await pool.request()
    .input('RequestID', requestID)
    .input('UserID', userID)
    .query(`
      UPDATE Requests
      SET Status = 'closed'
      WHERE RequestID = @RequestID AND RequesterID = @UserID
    `);
  return result.rowsAffected[0]; // 1 = success, 0 = not found or not owner
}

module.exports = { getAllRequests, getRequestById, createRequest, getRequestsByUser, closeRequest };
