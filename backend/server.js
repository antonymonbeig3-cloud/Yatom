const express = require('express');
const cors = require('cors');
const db = require('./db/database');
const authRoutes = require('./routes/auth');
const paymentRoutes = require('./routes/payment');
const supportRoutes = require('./routes/support');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../'))); // Serves index.html remotely

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/support', supportRoutes);

// Simple health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
