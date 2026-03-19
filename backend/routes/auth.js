const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db/database');

const JWT_SECRET = process.env.JWT_SECRET || 'yatom_super_secret_key_change_me_in_production';

// Inscription
router.post('/register', (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
    }

    db.get('SELECT id FROM users WHERE email = ?', [email], (err, row) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        if (row) return res.status(400).json({ error: 'Email already exists' });

        const salt = bcrypt.genSaltSync(10);
        const hash = bcrypt.hashSync(password, salt);

        db.run('INSERT INTO users (email, password_hash) VALUES (?, ?)', [email, hash], function(err) {
            if (err) return res.status(500).json({ error: 'Failed to create user' });
            
            const token = jwt.sign({ id: this.lastID, email }, JWT_SECRET, { expiresIn: '24h' });
            res.status(201).json({ message: 'User created successfully', token, email });
        });
    });
});

// Connexion
router.post('/login', (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
    }

    db.get('SELECT * FROM users WHERE email = ?', [email], (err, user) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        if (!user) return res.status(401).json({ error: 'Invalid email or password' });

        const isValid = bcrypt.compareSync(password, user.password_hash);
        if (!isValid) return res.status(401).json({ error: 'Invalid email or password' });

        const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '24h' });
        res.json({ message: 'Login successful', token, email: user.email });
    });
});

// Get current user and licenses
router.get('/me', (req, res) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'No token' });

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ error: 'Invalid token' });

        db.all('SELECT * FROM licenses WHERE user_id = ?', [user.id], (err, rows) => {
            if (err) return res.status(500).json({ error: 'Database error' });
            
            // Filter active licenses
            const now = new Date();
            const activeLicenses = rows.filter(row => {
                if (!row.expires_at) return true; // lifetime
                return new Date(row.expires_at) > now;
            });

            res.json({
                user: { id: user.id, email: user.email },
                licenses: activeLicenses,
                hasActiveLicense: activeLicenses.length > 0
            });
        });
    });
});

module.exports = router;
