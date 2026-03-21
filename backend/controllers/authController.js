// controllers/authController.js
// firebase handles all auth
// register: saves profile ONLY after email is verified
// login: verifies token and returns user profile

const { admin } = require('../config/firebase');
const {
  findUserByEmail,
  findUserByPhone,
  createUser,
  updateProfilePictures,
} = require('../models/authModel');

// ─── REGISTER ─────────────────────────────────────────────────────────────────
// POST /api/auth/register
// called on FIRST LOGIN after email is verified
// frontend stores profile data in localStorage after signup
// on first verified login, frontend sends that stored data here to save to DB

const register = async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    const token      = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'firebase token required.' });
    }

    let decoded;
    try {
      decoded = await admin.auth().verifyIdToken(token);
    } catch {
      return res.status(401).json({ error: 'invalid firebase token.' });
    }

    // CRITICAL: only allow registration if email is verified in firebase
    if (!decoded.email_verified) {
      return res.status(403).json({
        error: 'email not verified. please verify your email before completing registration.',
      });
    }

    const email = decoded.email;

    // check if already registered — idempotent, safe to call multiple times
    const existingUser = await findUserByEmail(email);
    if (existingUser) {
      // already registered — just return the user so frontend can proceed
      return res.status(200).json({
        message: 'profile already exists.',
        user: {
          id:         existingUser.UserID,
          fullName:   existingUser.FullName,
          email:      existingUser.Email,
          role:       existingUser.Role,
          profilePic: existingUser.ProfilePic,
          isVerified: existingUser.IsVerified,
        },
      });
    }

    // pull profile fields from body — sent by frontend from localStorage
    const { fullName, phone, city, area, cnic } = req.body;

    if (!fullName || !phone || !city || !cnic) {
      return res.status(400).json({ error: 'all required fields must be filled.' });
    }
    if (!/^03\d{9}$/.test(phone)) {
      return res.status(400).json({ error: 'phone must be 11 digits starting with 03.' });
    }
    if (!/^\d{13}$/.test(cnic)) {
      return res.status(400).json({ error: 'cnic must be exactly 13 digits.' });
    }

    const existingPhone = await findUserByPhone(phone);
    if (existingPhone) {
      return res.status(409).json({ error: 'phone number already registered.' });
    }

    // save to database — only reaches here if email is verified
    await createUser({ fullName, email, phone, city, area, cnic });

    // save cloudinary image urls if uploaded
    const profilePicUrl  = req.files?.profilePic?.[0]?.path  || null;
    const cnicPictureUrl = req.files?.cnicPicture?.[0]?.path || null;
    if (profilePicUrl || cnicPictureUrl) {
      await updateProfilePictures(email, profilePicUrl, cnicPictureUrl);
    }

    res.status(201).json({ message: 'profile saved successfully.' });

  } catch (err) {
    console.error('register error:', err.message);
    res.status(500).json({ error: 'something went wrong. please try again.' });
  }
};

// ─── LOGIN ────────────────────────────────────────────────────────────────────
// POST /api/auth/login
// verifies firebase token → checks email verified → returns profile from DB

const login = async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    const token      = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'firebase token required.' });
    }

    let decoded;
    try {
      decoded = await admin.auth().verifyIdToken(token);
    } catch {
      return res.status(401).json({ error: 'invalid or expired token. please log in again.' });
    }

    if (!decoded.email_verified) {
      return res.status(403).json({
        error: 'please verify your email first. check your inbox for the verification link.',
        code: 'EMAIL_NOT_VERIFIED',
      });
    }

    const user = await findUserByEmail(decoded.email);

    if (!user) {
      // profile not in DB yet — frontend should complete registration
      return res.status(404).json({
        error: 'profile not found. please complete registration.',
        code: 'PROFILE_NOT_FOUND',
      });
    }

    if (user.IsBanned) {
      return res.status(403).json({ error: 'your account has been suspended. contact support.' });
    }

    res.json({
      message: 'login successful',
      user: {
        id:         user.UserID,
        fullName:   user.FullName,
        email:      user.Email,
        role:       user.Role,
        profilePic: user.ProfilePic,
        isVerified: user.IsVerified,
      },
    });

  } catch (err) {
    console.error('login error:', err.message);
    res.status(500).json({ error: 'something went wrong. please try again.' });
  }
};

module.exports = { register, login };
