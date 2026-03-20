// middleware/verifyToken.js
// verifies firebase token on every protected route
// replaces the old jwt verifyToken

const { admin } = require('../config/firebase');
const { findUserByEmail } = require('../models/authModel');

const verifyToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token      = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'access denied. please log in.' });
  }
    try {
    // verify the token with firebase — returns decoded user info
    const decoded = await admin.auth().verifyIdToken(token);

    // check if email is verified in firebase
    if (!decoded.email_verified) {
      return res.status(403).json({ 
        error: 'please verify your email. check your inbox for the verification link.' 
      });
    }

    // get the user from your own database to get role, isBanned etc
    const user = await findUserByEmail(decoded.email);

    if (!user) {
      return res.status(404).json({ error: 'user not found in database.' });
    }
    if (user.IsBanned) {
      return res.status(403).json({ error: 'your account has been suspended.' });
    }

    // attach user info to req — available in all controllers
    req.user = {
      id:       user.UserID,
      email:    user.Email,
      role:     user.Role,
      fullName: user.FullName,
    };

    next();
  } catch (err) {
    console.error('token verification error:', err.message);
    return res.status(403).json({ error: 'invalid or expired token. please log in again.' });
  }
};

// use this for admin-only routes
const verifyAdmin = async (req, res, next) => {
  await verifyToken(req, res, () => {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'admin access required.' });
    }
    next();
  });
};

module.exports = { verifyToken, verifyAdmin };
