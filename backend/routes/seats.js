const express = require('express');
const router = express.Router();

const { holdSeat, releaseHold } = require('../services/redis');
const { broadcastSeatUpdate } = require('../websocket-server');

// POST /seats/hold - Hold seats (supports single or multiple seatNumbers[])
router.post('/seats/hold', async (req, res) => {
	try {
		const { tripId, userId, ttlSeconds } = req.body || {};
		let { seatNumber, seatNumbers } = req.body || {};

		if (!tripId || !userId || !ttlSeconds) {
			return res.status(400).json({ error: 'tripId, userId, ttlSeconds are required' });
		}

		// Normalize into an array of seats to hold
		if (Array.isArray(seatNumbers) && seatNumbers.length > 0) {
			// ok
		} else if (seatNumber) {
			seatNumbers = [seatNumber];
		} else {
			return res.status(400).json({ error: 'seatNumber or seatNumbers[] required' });
		}

		const held = [];
		const conflicts = [];
		for (const s of seatNumbers) {
			try {
				const ok = await holdSeat(tripId, s, userId, ttlSeconds);
				if (ok) {
					held.push(s);
					broadcastSeatUpdate({ type: 'seat-held', tripId, seatNumber: s, userId, ttlSeconds });
				} else {
					conflicts.push({ seatNumber: s, reason: 'already-held' });
				}
			} catch (e) {
				conflicts.push({ seatNumber: s, reason: 'error' });
			}
		}

		const status = {
			held,
			conflicts,
			success: held.length > 0,
		};
		// If at least one held, 200; if none, 409
		return res.status(status.success ? 200 : 409).json(status);
	} catch (err) {
		return res.status(500).json({ error: 'Failed to hold seat(s)', details: err.message });
	}
});

// POST /seats/release - Release a hold
router.post('/seats/release', async (req, res) => {
	try {
		const { tripId, seatNumber } = req.body || {};
		if (!tripId || !seatNumber) {
			return res.status(400).json({ error: 'tripId and seatNumber are required' });
		}

		await releaseHold(tripId, seatNumber);
		broadcastSeatUpdate({ type: 'seat-released', tripId, seatNumber });
		return res.status(200).json({ success: true });
	} catch (err) {
		return res.status(500).json({ error: 'Failed to release seat', details: err.message });
	}
});

module.exports = router;


