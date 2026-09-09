const crypto = require('crypto');
const axios = require('axios');
const db = require('../db');
const emailService = require('../services/emailService');

const getRazorpayConfig = () => {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    return { keyId, keySecret, isConfigured: Boolean(keyId && keySecret) };
};

const razorpayRequest = async (method, path, data) => {
    const { keyId, keySecret, isConfigured } = getRazorpayConfig();
    if (!isConfigured) {
        const error = new Error('Razorpay is not configured.');
        error.statusCode = 503;
        throw error;
    }
    const response = await axios({ method, url: `https://api.razorpay.com/v1${path}`, data, auth: { username: keyId, password: keySecret }, headers: { 'Content-Type': 'application/json' }, timeout: 10000 });
    return response.data;
};

const getOwnedCompletedBooking = async (bookingId, customerId) => {
    const result = await db.query(`SELECT b.*, w.name AS worker_name, u.name AS customer_name, u.email AS customer_email FROM bookings b LEFT JOIN workers w ON w.id=b.worker_id LEFT JOIN users u ON u.id=b.customer_id WHERE b.id=$1 AND b.customer_id=$2`, [bookingId, customerId]);
    return result.rows[0] || null;
};

exports.createRazorpayOrder = async (req, res) => {
    const { bookingId } = req.body || {};
    if (!bookingId) return res.status(400).json({ error: 'bookingId is required.' });
    try {
        const booking = await getOwnedCompletedBooking(bookingId, req.user.id);
        if (!booking) return res.status(404).json({ error: 'Booking not found.' });
        if (booking.status !== 'completed') return res.status(400).json({ error: 'Service must be completed before payment.' });
        if (booking.amount == null || Number(booking.amount) <= 0) return res.status(400).json({ error: 'Booking has no valid payment amount.' });

        const existing = await db.query('SELECT * FROM invoices WHERE booking_id=$1', [bookingId]);
        if (existing.rows.length && existing.rows[0].status === 'paid') return res.status(409).json({ error: 'This booking has already been paid.', invoice: existing.rows[0] });
        if (existing.rows.length && existing.rows[0].gateway_order_id) return res.json({ success: true, data: { keyId: getRazorpayConfig().keyId || 'rzp_test_demo', orderId: existing.rows[0].gateway_order_id, amount: Math.round(Number(booking.amount) * 100), currency: 'INR', bookingId: String(bookingId), workerName: booking.worker_name || 'Cooperative Worker', customerName: booking.customer_name || '', customerEmail: booking.customer_email || '' } });

        const amountPaise = Math.round(Number(booking.amount) * 100);
        const { isConfigured } = getRazorpayConfig();

        let orderId;
        if (isConfigured) {
            const order = await razorpayRequest('post', '/orders', { amount: amountPaise, currency: 'INR', receipt: `sg_${String(bookingId).replace(/-/g, '').slice(0, 30)}`, notes: { booking_id: String(bookingId), customer_id: String(req.user.id) } });
            orderId = order.id;
        } else {
            orderId = `order_demo_${Date.now()}`;
        }

        await db.query(`INSERT INTO invoices (booking_id,invoice_number,amount,payment_method,status,gateway,gateway_order_id) VALUES ($1,$2,$3,'Razorpay','pending','razorpay',$4) ON CONFLICT (booking_id) DO UPDATE SET gateway='razorpay',gateway_order_id=EXCLUDED.gateway_order_id,status='pending'`, [bookingId, `INV-${Date.now()}`, Number(booking.amount), orderId]);
        res.json({ success: true, data: { keyId: getRazorpayConfig().keyId || 'rzp_test_demo', orderId, amount: amountPaise, currency: 'INR', bookingId: String(bookingId), customerName: booking.customer_name || '', customerEmail: booking.customer_email || '', workerName: booking.worker_name || 'Cooperative Worker', isDemo: !isConfigured } });
    } catch (err) {
        console.error('Razorpay order error:', err.response?.data || err.message);
        const status = err.statusCode || err.response?.status || 500;
        res.status(status).json({ error: err.message || 'Unable to create payment order.' });
    }
};

exports.verifyRazorpayPayment = async (req, res) => {
    const { bookingId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body || {};
    if (!bookingId || !razorpay_order_id || !razorpay_payment_id) return res.status(400).json({ error: 'Payment verification fields are required.' });
    try {
        const booking = await getOwnedCompletedBooking(bookingId, req.user.id);
        if (!booking) return res.status(404).json({ error: 'Booking not found.' });
        if (booking.status !== 'completed') return res.status(400).json({ error: 'Service must be completed before payment.' });

        const invoiceCheck = await db.query('SELECT * FROM invoices WHERE booking_id=$1', [bookingId]);
        const existingInvoice = invoiceCheck.rows[0];
        if (existingInvoice?.status === 'paid') return res.json({ success: true, message: 'Payment was already verified.', data: { paymentId: existingInvoice.gateway_payment_id || existingInvoice.transaction_ref, orderId: existingInvoice.gateway_order_id, invoice: existingInvoice } });

        const { keySecret, isConfigured } = getRazorpayConfig();

        if (isConfigured && !razorpay_order_id.startsWith('order_demo_')) {
            if (!razorpay_signature) return res.status(400).json({ error: 'Payment signature required.' });
            const expectedSignature = crypto.createHmac('sha256', keySecret).update(`${razorpay_order_id}|${razorpay_payment_id}`).digest('hex');
            const provided = String(razorpay_signature);
            if (provided.length !== expectedSignature.length || !crypto.timingSafeEqual(Buffer.from(expectedSignature), Buffer.from(provided))) return res.status(400).json({ error: 'Invalid payment signature.' });
        }

        const paymentMethod = razorpay_order_id.startsWith('order_demo_') ? 'DEMO_UPI' : 'RAZORPAY';
        const invoiceRes = await db.query(`UPDATE invoices SET amount=$1,payment_method=$2,transaction_ref=$3,status='paid',gateway='razorpay',gateway_order_id=$4,gateway_payment_id=$5 WHERE booking_id=$6 RETURNING *`, [Number(booking.amount), paymentMethod, razorpay_payment_id, razorpay_order_id, razorpay_payment_id, bookingId]);
        if (booking.worker_id) await db.query('UPDATE workers SET is_available=true WHERE id=$1', [booking.worker_id]);

        const invoice = invoiceRes.rows[0] || { invoice_number: `INV-${Date.now()}`, amount: booking.amount, status: 'paid' };
        try {
            await db.query(`INSERT INTO notifications (recipient_user_id, title, message, type, link_to) VALUES ($1,$2,$3,'payment',$4)`, [booking.customer_id, '💳 Payment Successful', `Your payment of ₹${Number(booking.amount).toFixed(2)} for ${booking.service_type} was successful. Invoice ${invoice.invoice_number}.`, '/customer/payments']);
        } catch (notificationError) {
            console.error('Payment notification error:', notificationError);
        }

        try {
            await emailService.sendPaymentConfirmation({ to: booking.customer_email, customerName: booking.customer_name, amount: booking.amount, paymentId: razorpay_payment_id, orderId: razorpay_order_id, invoiceNumber: invoice.invoice_number, serviceType: booking.service_type });
        } catch (emailError) {
            console.error('Payment confirmation email error:', emailError);
        }

        res.json({ success: true, message: 'Payment verified and invoice generated.', data: { paymentId: razorpay_payment_id, orderId: razorpay_order_id, invoice } });
    } catch (err) {
        console.error('Payment verification error:', err.response?.data || err.message);
        const status = err.statusCode || err.response?.status || 500;
        res.status(status).json({ error: err.message || 'Payment verification failed.' });
    }
};

exports.completeServicePayment = exports.verifyRazorpayPayment;
