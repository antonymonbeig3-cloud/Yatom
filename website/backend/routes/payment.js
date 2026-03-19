const express = require('express');
const router = express.Router();
// REMPLACER ICI PAR VOTRE VRAIE CLÉ SECRÈTE STRIPE LORS DE LA MISE EN PRODUCTION (ex: sk_live_...)
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || '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';
const stripe = require('stripe')(STRIPE_SECRET_KEY); 

// Mettre cette variable à `true` lorsque vous avez entré votre vraie clé Stripe
const USE_REAL_PAYMENT = process.env.USE_REAL_PAYMENT === 'true' || true; 

router.post('/create-checkout-session', async (req, res) => {
    const { plan } = req.body; 

    let product_name = 'Yatom - Pass à Vie';
    let unit_amount = 500; // 5.00€
    
    if (plan === '1h') {
        product_name = 'Yatom - Pass 1 Heure';
        unit_amount = 100; // 1.00€
    } else if (plan === 'plugin') {
        product_name = 'Plugin Minecraft sur mesure';
        unit_amount = 4000; // 40.00€
    }

    if (!USE_REAL_PAYMENT) {
        // MODE TEST : Simule un paiement Stripe réussi
        const successUrl = `https://yatom.onrender.com/index.html?payment=success&plan=${plan}`;
        return res.json({ url: successUrl });
    }

    try {
        // MODE PRODUCTION : Vraie intégration Stripe
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [{
                price_data: {
                    currency: 'eur',
                    product_data: {
                        name: product_name,
                        description: 'Achat sécurisé Yatom',
                    },
                    unit_amount: unit_amount,
                },
                quantity: 1,
            }],
            mode: 'payment',
            success_url: `https://yatom.onrender.com/index.html?payment=success&plan=${plan}`,
            cancel_url: `https://yatom.onrender.com/index.html#pricing`,
        });

        res.json({ url: session.url });
    } catch (err) {
        console.error("Erreur Stripe :", err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
