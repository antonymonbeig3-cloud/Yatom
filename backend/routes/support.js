const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');

const USE_REAL_PAYMENT = process.env.USE_REAL_PAYMENT === 'true' || true;

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

router.post('/send', async (req, res) => {
    try {
        const { email, message } = req.body;
        if (!email || !message) {
            return res.status(400).json({ error: 'L\'adresse e-mail et le message sont obligatoires.' });
        }

        const mailOptions = {
            from: '"Support Yatom" <antonymonbeigpro@gmail.com>',
            to: 'yatomexe@gmail.com', // Boîte de réception souhaitée par l'utilisateur
            replyTo: email, // L'adresse du visiteur, pour pouvoir lui répondre facilement
            subject: 'Demande de Support - Yatom.fr',
            text: `Nouveau message depuis le site Yatom.fr :\n\nE-mail de contact : ${email}\n\nMessage :\n${message}`,
            html: `
            <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; border: 1px solid #ddd; padding: 20px; border-radius: 10px;">
                <h2 style="color: #9333ea; border-bottom: 2px solid #eee; padding-bottom: 10px;">Nouveau ticket Yatom</h2>
                <p><strong>De:</strong> <a href="mailto:${email}">${email}</a></p>
                <div style="background-color: #f9fafb; padding: 15px; border-radius: 6px; margin-top: 20px; white-space: pre-wrap;">
${message}
                </div>
            </div>`
        };

        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.error('Erreur lors de l\'envoi du mail de support:', error);
                return res.status(500).json({ error: 'Erreur lors de l\'envoi de l\'e-mail.' });
            }
            res.json({ success: true });
        });
    } catch (error) {
        console.error('Support route error:', error);
        res.status(500).json({ error: 'Erreur serveur.' });
    }
});

module.exports = router;
