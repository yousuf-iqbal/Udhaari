// routes/authRoutes.js
// only 2 routes now — firebase handles everything else

const express  = require('express');
const router   = express.Router();
const multer   = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const { cloudinary } = require('../config/cloudinary');
const { register, login } = require('../controllers/authController');

// cloudinary storage — routes files to correct folder based on field name
const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    const folder = file.fieldname === 'cnicPicture'
      ? 'udhaari/cnic'
      : 'udhaari/profiles';
    return {
      folder,
      allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'pdf'],
      transformation: file.fieldname === 'profilePic'
        ? [{ width: 400, height: 400, crop: 'fill' }]
        : [],
    };
  },
});

const upload = multer({ storage });

// POST /api/auth/register — save profile after firebase signup
// frontend must send firebase token in Authorization header
router.post('/register',
  upload.fields([
    { name: 'profilePic',  maxCount: 1 },
    { name: 'cnicPicture', maxCount: 1 },
  ]),
  register
);

// POST /api/auth/login — verify firebase token, return user profile
router.post('/login', login);

module.exports = router;