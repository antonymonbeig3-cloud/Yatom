const express = require('express');
const router = express.Router();
// REMPLACER ICI PAR VOTRE VRAIE CLÉ SECRÈTE STRIPE LORS DE LA MISE EN PRODUCTION (ex: sk_live_...)
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || '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';
const stripe = require('stripe')(STRIPE_SECRET_KEY); 
const nodemailer = require('nodemailer');
const db = require('../db/database');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'yatom_super_secret_key_change_me_in_production';

// Mettre cette variable à `true` lorsque vous avez entré votre vraie clé Stripe
const USE_REAL_PAYMENT = process.env.USE_REAL_PAYMENT === 'true' || true; 

// Middleware d'authentification
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (token == null) return res.status(401).json({ error: 'Unauthorized' });

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ error: 'Forbidden' });
        req.user = user;
        next();
    });
}

// Générer une clé de licence (YATOM-XXXX-XXXX-XXXX-XXXX)
function generateLicenseKey() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let key = 'YATOM';
    for(let i=0; i<4; i++) {
        key += '-';
        for(let j=0; j<4; j++) {
            key += chars.charAt(Math.floor(Math.random() * chars.length));
        }
    }
    return key;
}

// Configuration de l'envoi d'emails (SMTP)
const transporter = USE_REAL_PAYMENT ? nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
        user: 'antonymonbeigpro@gmail.com',
        pass: 'ewaiazvvxsnikfjp' 
    }
}) : nodemailer.createTransport({
    streamTransport: true,
    newline: 'windows'
});

router.post('/create-checkout-session', authenticateToken, async (req, res) => {
    const { plan } = req.body; // '1h' ou 'lifetime'
    const token = req.headers.authorization.split(' ')[1];

    if (!USE_REAL_PAYMENT) {
        // MODE TEST : Simule un paiement Stripe réussi
        const mockSessionId = 'cs_test_' + Math.random().toString(36).substr(2, 9);
        const successUrl = `https://yatom.onrender.com/api/payment/success?session_id=${mockSessionId}&plan=${plan}&token=${token}`;
        return res.json({ url: successUrl });
    }

    try {
        // MODE PRODUCTION : Vraie intégration Stripe
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            customer_email: req.user.email, // Pré-remplit l'email du client
            line_items: [{
                price_data: {
                    currency: 'eur',
                    product_data: {
                        name: plan === '1h' ? 'Yatom - Pass 1 Heure' : 'Yatom - Pass à Vie',
                        description: 'Licence exclusive Minecraft Auto-Clicker Indétectable',
                    },
                    unit_amount: plan === '1h' ? 50 : 500, // 0.50€ (1h) ou 5.00€ (lifetime)
                },
                quantity: 1,
            }],
            mode: 'payment',
            // {CHECKOUT_SESSION_ID} est remplacé par Stripe automatiquement
            success_url: `https://yatom.onrender.com/api/payment/success?session_id={CHECKOUT_SESSION_ID}&plan=${plan}&token=${token}`,
            cancel_url: `https://yatom.onrender.com/index.html#pricing`,
        });

        res.json({ url: session.url });
    } catch (err) {
        console.error("Erreur Stripe :", err);
        res.status(500).json({ error: err.message });
    }
});

router.get('/success', async (req, res) => {
    const { session_id, plan, token } = req.query;
    
    if (!token) return res.status(401).send('No token provided');
    
    try {
        const user = jwt.verify(token, JWT_SECRET);
        const userId = user.id;
        const userEmail = user.email;

        // Calculate expiration
        let expiresAt = null;
        if (plan === '1h') {
            const date = new Date();
            date.setHours(date.getHours() + 1);
            expiresAt = date.toISOString();
        }

        const licenseKey = generateLicenseKey();

        db.run('INSERT INTO licenses (user_id, license_key, type, expires_at) VALUES (?, ?, ?, ?)', 
            [userId, licenseKey, plan, expiresAt], 
            function(err) {
                if (err) {
                    console.error(err);
                    return res.status(500).send('Database error saving license');
                }

                // Send Email
                const mailOptions = {
                    from: '"Yatom Auto-Clicker" <antonymonbeigpro@gmail.com>',
                    to: userEmail,
                    subject: '🎉 Here is your Yatom License Key',
                    html: `
<div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
  <h2 style="color: #9333ea; text-align: center; margin-bottom: 20px;">Thank you for your purchase!</h2>
  <p>Hello,</p>
  <p>Your purchase for the <strong>${plan === '1h' ? '1 Hour Pass' : 'Lifetime Pass'}</strong> has been successfully confirmed.</p>
  <div style="background-color: #f3f4f6; padding: 25px 15px; border-radius: 8px; text-align: center; margin: 30px 0; border: 1px solid #eee;">
    <p style="margin: 0; font-size: 14px; color: #555;">Here is your exclusive license key:</p>
    <p style="font-size: 26px; font-weight: bold; color: #111; margin: 15px 0; letter-spacing: 2px;">${licenseKey}</p>
  </div>
  <p>You can now download the "Yatom Ultime V2" application directly from our website. Make sure you are logged in, and the download will be unlocked!</p>
  <div style="margin-top: 25px; padding: 15px; border-left: 4px solid #9333ea; background-color: #f9f9f9;">
    <strong>Need help?</strong><br>
    If you have any questions or issues, do not hesitate to contact us via email at <a href="mailto:Yatomexe@gmail.com" style="color: #9333ea; text-decoration: none; font-weight: bold;">Yatomexe@gmail.com</a> or join our Discord server: <br><a href="https://discord.gg/cj4nFhGrbV" style="color: #9333ea; text-decoration: none; font-weight: bold;">https://discord.gg/cj4nFhGrbV</a>
  </div>
  <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;"/>
  <p style="font-size: 12px; color: #999; text-align: center;">The Yatom Team<br>The Reference for Undetectable Auto-Clickers</p>
</div>
                    `
                };

                transporter.sendMail(mailOptions, (error, info) => {
                    if (error) {
                        console.error('Email error:', error);
                    } else {
                        console.log('--- EMAIL SENT ---');
                        console.log('To:', userEmail);
                        console.log('Content:\n', info.message.toString());
                        console.log('------------------');
                    }
                });

                // Redirect back to home with a success query param
                res.redirect('/?payment=success');
            }
        );
    } catch (err) {
        res.status(403).send('Invalid token or session expired');
    }
});

module.exports = router;
