const express = require('express');
const router = express.Router();

const { sequelize, models: { Purchase } } = require('../models');
const { getHold, releaseHold } = require('../services/redis');
const { sendConfirmationEmail, generateInvoicePDF } = require('../services/email');
const { broadcastSeatUpdate } = require('../websocket-server');

// POST /seats/purchase - supports single seatNumber or multiple seatNumbers[]
router.post('/seats/purchase', async (req, res) => {
	const { tripId, userId, email } = req.body || {};
	let { seatNumber, seatNumbers } = req.body || {};
	if (!tripId || !userId || !email) {
		return res.status(400).json({ error: 'tripId, userId, email are required' });
	}
	if (Array.isArray(seatNumbers) && seatNumbers.length > 0) {
		// ok
	} else if (seatNumber) {
		seatNumbers = [seatNumber];
	} else {
		return res.status(400).json({ error: 'seatNumber or seatNumbers[] required' });
	}

	try {
		// Verify holds exist and belong to user
		const invalid = [];
		for (const s of seatNumbers) {
			const hold = await getHold(tripId, s);
			if (!hold || hold.userId !== userId) {
				invalid.push(s);
			}
		}
		if (invalid.length > 0) {
			return res.status(409).json({ error: 'Some seats not held by user', invalid });
		}

		// Atomically mark seats sold
		const created = [];
		await sequelize.transaction(async (t) => {
			for (const s of seatNumbers) {
				const existing = await Purchase.findOne({ where: { tripId, seatNumber: s }, transaction: t, lock: t.LOCK.UPDATE });
				if (existing) {
					throw new Error(`Seat already purchased: ${s}`);
				}
				const rec = await Purchase.create({
					tripId,
					seatNumber: s,
					userId,
					purchaseTime: new Date(),
					invoiceLink: '',
				}, { transaction: t });
				created.push(rec);
			}
		});

		// Release holds and broadcast
		for (const s of seatNumbers) {
			await releaseHold(tripId, s);
			broadcastSeatUpdate({ type: 'seat-sold', tripId, seatNumber: s, userId });
		}


		const purchasedWithLinks = created.map(r => ({
			seatNumber: r.seatNumber,
			invoiceLink: `/invoices?tripId=${encodeURIComponent(tripId)}&seatNumber=${encodeURIComponent(r.seatNumber)}&userId=${encodeURIComponent(userId)}&ts=${Date.now()}`,
		}));

		// Send confirmation emails (best-effort; don't fail all on one error)
		for (const rec of created) {
			try {
				await sendConfirmationEmail(email, rec.toJSON());
			} catch (e) {
				console.error('Email send failed for seat', rec.seatNumber, e.message);
			}
		}

		return res.status(201).json({ success: true, purchased: purchasedWithLinks });
	} catch (err) {
		if (String(err.message || '').startsWith('Seat already purchased')) {
			return res.status(409).json({ error: err.message });
		}
		return res.status(500).json({ error: 'Failed to complete purchase', details: err.message });
	}
});

module.exports = router;

// Inline invoice route appended to same router for simplicity
router.get('/invoices', async (req, res) => {
	try {
		const tripId = parseInt(req.query.tripId, 10);
		const seatNumber = req.query.seatNumber;
		const userId = parseInt(req.query.userId, 10);
		if (!tripId || !seatNumber || !userId) {
			return res.status(400).json({ error: 'tripId, seatNumber, userId are required' });
		}

		const purchase = await Purchase.findOne({ where: { tripId, seatNumber, userId } });
		if (!purchase) {
			return res.status(404).json({ error: 'Invoice not found for this purchase' });
		}

		const pdfStream = generateInvoicePDF({
			tripId,
			seatNumber,
			userId,
			purchaseTime: purchase.purchaseTime,
		});

		res.setHeader('Content-Type', 'application/pdf');
		res.setHeader('Content-Disposition', `inline; filename=invoice-${tripId}-${seatNumber}.pdf`);
		pdfStream.pipe(res);
	} catch (err) {
		return res.status(500).json({ error: 'Failed to generate invoice', details: err.message });
	}
});


