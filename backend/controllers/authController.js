// controllers/authController.js
// firebase handles all auth (registration, login, otp, forgot password)
// this controller only handles:
//   1. saving profile data to our database after firebase registration
//   2. returning user profile on login

const { admin }   = require('../config/firebase');
const {
  findUserByEmail,
  findUserByPhone,
  createUser,
  updateProfilePictures,
} = require('../models/authModel');

// ─── SAVE PROFILE ─────────────────────────────────────────────────────────────
// POST /api/auth/register
// called AFTER firebase creates the account and sends verification email
// frontend sends the firebase token + profile fields + images
// we verify the token, then save profile data to our database

const register = async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    const token      = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'firebase token required' });
    }

    // verify the firebase token to get the email
    let decoded;
    try {
      decoded = await admin.auth().verifyIdToken(token);
    } catch (err) {
      return res.status(401).json({ error: 'invalid firebase token' });
    }

    const email = decoded.email;
    const { fullName, phone, city, area, cnic } = req.body;

    // --- validation ---
    if (!fullName || !phone || !city || !cnic) {
      return res.status(400).json({ error: 'all required fields must be filled' });
    }
    if (!/^03\d{9}$/.test(phone)) {
      return res.status(400).json({ error: 'phone must be 11 digits starting with 03' });
    }
    if (!/^\d{13}$/.test(cnic)) {
      return res.status(400).json({ error: 'cnic must be exactly 13 digits' });
    }

    // --- check if already registered in our db ---
    const existingUser = await findUserByEmail(email);
    if (existingUser) {
      return res.status(409).json({ error: 'profile already exists. please log in.' });
    }

    // --- check phone duplicate ---
    const existingPhone = await findUserByPhone(phone);
    if (existingPhone) {
      return res.status(409).json({ error: 'phone number already registered.' });
    }

    // --- save to our database ---
    await createUser({ fullName, email, phone, city, area, cnic });

    // --- save cloudinary image urls if uploaded ---
    const profilePicUrl  = req.files?.profilePic?.[0]?.path  || null;
    const cnicPictureUrl = req.files?.cnicPicture?.[0]?.path || null;

    if (profilePicUrl || cnicPictureUrl) {
      await updateProfilePictures(email, profilePicUrl, cnicPictureUrl);
    }

    res.status(201).json({ message: 'profile saved successfully.' });

  } catch (err) {
  console.error('register error FULL:', err);
  res.status(500).json({ error: err.message || 'something went wrong.' });
}
};

// ─── LOGIN ────────────────────────────────────────────────────────────────────
// POST /api/auth/login
// firebase handles password checking on the frontend
// frontend sends firebase token → we verify it → return user profile from our db

const login = async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    const token      = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'firebase token required' });
    }

    // verify token with firebase
    let decoded;
    try {
      decoded = await admin.auth().verifyIdToken(token);
    } catch (err) {
      return res.status(401).json({ error: 'invalid or expired token. please log in again.' });
    }

    //check email verified in firebase
    if (!decoded.email_verified) {
      return res.status(403).json({ 
        error: 'please verify your email first. check your inbox for the verification link.' 
      });
    }

    // get profile from our database
    const user = await findUserByEmail(decoded.email);

    if (!user) {
      return res.status(404).json({ error: 'profile not found. please complete registration.' });
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