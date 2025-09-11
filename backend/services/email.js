const PDFDocument = require('pdfkit');
const sgMail = require('@sendgrid/mail');

const EMAIL_ENABLED = String(process.env.EMAIL_ENABLED || 'true').toLowerCase() === 'true';

// Expect SENDGRID_API_KEY and EMAIL_FROM in env
if (process.env.SENDGRID_API_KEY) {
	sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

function generateInvoicePDF(purchase) {
	const { tripId, seatNumber, userId, purchaseTime } = purchase;
	const doc = new PDFDocument({ size: 'A4', margin: 50 });

	// Header
	doc.fontSize(20).text('Bus Ticket Invoice', { align: 'center' });
	doc.moveDown();

	// Body
	doc.fontSize(12);
	doc.text(`Trip ID: ${tripId}`);
	doc.text(`Seat Number: ${seatNumber}`);
	doc.text(`User ID: ${userId}`);
	doc.text(`Purchase Time: ${new Date(purchaseTime).toISOString()}`);

	// Footer
	doc.moveDown();
	doc.text('Thank you for your purchase!', { align: 'center' });

	// Finalize
	doc.end();
	return doc; // Readable stream
}

function streamToBase64(stream) {
	return new Promise((resolve, reject) => {
		const chunks = [];
		stream.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
		stream.on('end', () => resolve(Buffer.concat(chunks).toString('base64')));
		stream.on('error', (err) => reject(err));
	});
}

async function sendConfirmationEmail(toEmail, purchase) {
	const pdfStream = generateInvoicePDF(purchase);
	const pdfBase64 = await streamToBase64(pdfStream);

	const msg = {
		to: toEmail,
		from: process.env.EMAIL_FROM,
		subject: 'Your Bus Ticket Confirmation',
		text: 'Attached is your ticket invoice PDF.',
		html: '<p>Attached is your ticket invoice PDF.</p>',
		attachments: [
			{
				content: pdfBase64,
				type: 'application/pdf',
				filename: `invoice-${purchase.tripId}-${purchase.seatNumber}.pdf`,
				disposition: 'attachment',
			},
		],
	};

	if (!process.env.SENDGRID_API_KEY) {
		throw new Error('SENDGRID_API_KEY is not set');
	}
	if (!process.env.EMAIL_FROM) {
		throw new Error('EMAIL_FROM is not set');
	}

	await sgMail.send(msg);
	return true;
}

module.exports = {
	generateInvoicePDF,
	sendConfirmationEmail,
	streamToBase64,
};


