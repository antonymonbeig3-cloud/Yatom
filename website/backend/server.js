const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Servir les fichiers statiques du dossier parent (le site web frontend)
app.use(express.static(path.join(__dirname, '../')));

// Routes
const paymentRoutes = require('./routes/payment');
const supportRoutes = require('./routes/support');

app.use('/api/payment', paymentRoutes);
app.use('/api/support', supportRoutes);

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
