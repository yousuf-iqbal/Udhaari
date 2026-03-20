// server.js
const express = require('express');
const cors    = require('cors');
require('dotenv').config();

require('./config/db');

const authRoutes = require('./routes/authRoutes');

// future routes — uncomment as each feature is built:
// const requestRoutes = require('./routes/requestRoutes');
// const offerRoutes   = require('./routes/offerRoutes');
// const bookingRoutes = require('./routes/bookingRoutes');
// const adminRoutes   = require('./routes/adminRoutes');

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);

// app.use('/api/requests', requestRoutes);
// app.use('/api/offers',   offerRoutes);
// app.use('/api/bookings', bookingRoutes);
// app.use('/api/admin',    adminRoutes);

app.get('/', (req, res) => {
  res.json({ message: 'udhaari backend is running' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`server running on port ${PORT}`));


// to handle server errors
process.on('unhandledRejection', (err) => {
  console.error('unhandled rejection:', err.message)
})

process.on('uncaughtException', (err) => {
  console.error('uncaught exception:', err.message)
})