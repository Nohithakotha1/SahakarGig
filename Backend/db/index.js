require('dotenv').config();

const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

let pgPool = null;
let usePostgres = false;

const defaultPasswordHash = bcrypt.hashSync('Demo@123', 10);

const inMemoryStore = {
  cooperatives: [
    { id: 'coop-1', name: 'Hyderabad Labour Cooperative', region: 'Telangana', created_at: new Date().toISOString() },
    { id: 'coop-2', name: 'Telangana Artisan & Gig Cooperative', region: 'Telangana', created_at: new Date().toISOString() }
  ],
  users: [
    { id: 'usr-admin-1', name: 'Dr. Rameshwar Rao (NCCT Federation)', email: 'demo.admin@sahakargig.local', password_hash: defaultPasswordHash, phone: '9998887770', role: 'coop_admin', aliases: ['admin@sahakargig.gov.in', 'admin@example.com', 'admin', 'coop_admin'], created_at: new Date().toISOString() },
    { id: 'usr-cust-1', name: 'Priya Sharma', email: 'priya.sharma@example.com', password_hash: defaultPasswordHash, phone: '9876543219', role: 'customer', aliases: ['demo.customer@sahakargig.local', 'customer@example.com', 'customer', 'priya'], created_at: new Date().toISOString() },
    { id: 'usr-cust-2', name: 'John Customer', email: 'demo.customer@sahakargig.local', password_hash: defaultPasswordHash, phone: '9998887771', role: 'customer', aliases: ['customer@sahakargig.local'], created_at: new Date().toISOString() },
    { id: 'usr-worker-1', name: 'Ravi Kumar', email: 'ravi.worker@sahakargig.local', password_hash: defaultPasswordHash, phone: '9876543210', role: 'worker', aliases: ['ravi.kumar@example.com', 'worker@example.com', 'worker', 'ravi'], created_at: new Date().toISOString() }
  ],
  workers: [
    { id: 'work-1', user_id: 'usr-worker-1', cooperative_id: 'coop-1', name: 'Ravi Kumar', phone: '9876543210', email: 'ravi.worker@sahakargig.local', skill: 'plumbing', is_verified: true, is_available: true, rating: 4.85, latitude: 17.3850, longitude: 78.4867, experience_years: 8, completed_jobs_count: 142, hourly_rate: 350, price_range: '₹300 – ₹600', insurance_active: true, policy_number: 'SG-WEL-7821', welfare_scheme_name: 'Cooperative Health & Accident Shield', created_at: new Date().toISOString() },
    { id: 'work-2', user_id: 'usr-worker-2', cooperative_id: 'coop-1', name: 'Suresh Reddy', phone: '9876543211', email: 'suresh@sahakargig.local', skill: 'electrical', is_verified: true, is_available: true, rating: 4.65, latitude: 17.3900, longitude: 78.4900, experience_years: 5, completed_jobs_count: 98, hourly_rate: 300, price_range: '₹250 – ₹550', insurance_active: true, policy_number: 'SG-WEL-4412', welfare_scheme_name: 'Cooperative Health & Accident Shield', created_at: new Date().toISOString() },
    { id: 'work-3', user_id: 'usr-worker-3', cooperative_id: 'coop-1', name: 'Anil Kumar', phone: '9876543212', email: 'anil@sahakargig.local', skill: 'carpentry', is_verified: true, is_available: true, rating: 4.70, latitude: 17.3750, longitude: 78.4820, experience_years: 6, completed_jobs_count: 114, hourly_rate: 400, price_range: '₹350 – ₹800', insurance_active: true, policy_number: 'SG-WEL-9031', welfare_scheme_name: 'Cooperative Health & Accident Shield', created_at: new Date().toISOString() },
    { id: 'work-4', user_id: 'usr-worker-4', cooperative_id: 'coop-1', name: 'Lakshmi Devi', phone: '9876543213', email: 'lakshmi@sahakargig.local', skill: 'cleaning', is_verified: true, is_available: true, rating: 4.90, latitude: 17.3800, longitude: 78.4800, experience_years: 7, completed_jobs_count: 210, hourly_rate: 450, price_range: '₹400 – ₹1,200', insurance_active: true, policy_number: 'SG-WEL-1120', welfare_scheme_name: 'Cooperative Health & Accident Shield', created_at: new Date().toISOString() },
    { id: 'work-5', user_id: 'usr-worker-5', cooperative_id: 'coop-2', name: 'Mohammed Imran', phone: '9876543214', email: 'imran@sahakargig.local', skill: 'painting', is_verified: true, is_available: true, rating: 4.75, latitude: 17.3920, longitude: 78.4750, experience_years: 9, completed_jobs_count: 85, hourly_rate: 500, price_range: '₹600 – ₹2,500', insurance_active: true, policy_number: 'SG-WEL-3389', welfare_scheme_name: 'Cooperative Health & Accident Shield', created_at: new Date().toISOString() }
  ],
  bookings: [
    { id: 'book-1', customer_id: 'usr-cust-1', worker_id: 'work-1', service_type: 'plumbing', is_emergency: false, latitude: 17.3850, longitude: 78.4867, amount: 450.00, status: 'completed', created_at: new Date(Date.now() - 86400000).toISOString() },
    { id: 'book-2', customer_id: 'usr-cust-1', worker_id: 'work-2', service_type: 'electrical', is_emergency: false, latitude: 17.3900, longitude: 78.4900, amount: 350.00, status: 'requested', created_at: new Date().toISOString() }
  ],
  ratings: [
    { id: 'rat-1', booking_id: 'book-1', worker_id: 'work-1', customer_id: 'usr-cust-1', rating_score: 5, feedback: 'Excellent plumbing work, punctual and professional!', created_at: new Date().toISOString() }
  ],
  invoices: [
    { id: 'inv-1', booking_id: 'book-1', invoice_number: 'INV-2026-001', amount: 450.00, payment_method: 'UPI', transaction_ref: 'UPI-7749219', status: 'paid', gateway: 'upi', created_at: new Date(Date.now() - 86000000).toISOString() }
  ],
  notifications: [
    { id: 'notif-1', recipient_user_id: 'usr-cust-1', recipient_role: 'customer', title: 'Welcome to SahakarGig', message: 'Connecting verified cooperative artisans with communities.', is_read: false, type: 'system', created_at: new Date().toISOString() },
    { id: 'notif-2', recipient_user_id: 'usr-worker-1', recipient_role: 'worker', title: 'Duty Status: Online', message: 'You are available for customer bookings.', is_read: false, type: 'status', created_at: new Date().toISOString() },
    { id: 'notif-3', recipient_user_id: null, recipient_role: 'coop_admin', title: 'Platform Health Optimal', message: 'Labour cooperative network is running smoothly.', is_read: false, type: 'system', created_at: new Date().toISOString() }
  ]
};

if (process.env.DATABASE_URL) {
  try {
    const isLocal = /localhost|127\.0\.0\.1/.test(process.env.DATABASE_URL);
    pgPool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: isLocal ? false : { rejectUnauthorized: false } });
    usePostgres = true;
    pgPool.on('error', err => console.error('[Database] Unexpected PostgreSQL pool error:', err.message));
    console.log('[Database] PostgreSQL configured');
  } catch (err) {
    console.warn('[Database] PostgreSQL connection failed, switching to embedded mode:', err.message);
    usePostgres = false;
  }
} else {
  console.log('[Database] Embedded in-memory store active for SahakarGig.');
}

function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function query(text, params = []) {
  if (usePostgres && pgPool) {
    try {
      return await pgPool.query(text, params);
    } catch (e) {
      console.warn('[Database] PostgreSQL query error, falling back to embedded store:', e.message);
    }
  }

  const upper = text.trim().toUpperCase();

  if (/^(BEGIN|COMMIT|ROLLBACK)/.test(upper)) return { rows: [], rowCount: 0 };
  if (upper.includes('TRUNCATE')) {
    return { rows: [], rowCount: 0 };
  }

  // --- USERS ---
  if (upper.includes('FROM USERS WHERE') && (upper.includes('EMAIL') || upper.includes('PHONE') || upper.includes('ROLE'))) {
    const rawTerm = String(params[0] || '').trim().toLowerCase();
    const user = inMemoryStore.users.find(u => {
      if (u.email.toLowerCase() === rawTerm) return true;
      if (u.phone && u.phone.toLowerCase() === rawTerm) return true;
      if (u.role && u.role.toLowerCase() === rawTerm) return true;
      if (Array.isArray(u.aliases) && u.aliases.some(a => a.toLowerCase() === rawTerm)) return true;
      return false;
    });
    return { rows: user ? [user] : [], rowCount: user ? 1 : 0 };
  }
  if (upper.includes('INSERT INTO USERS')) {
    const [name, email, password_hash, phone, role] = params;
    if (inMemoryStore.users.some(u => u.email.toLowerCase() === String(email).toLowerCase())) {
      const e = new Error('User already exists');
      e.code = '23505';
      throw e;
    }
    const user = { id: `user-${Date.now()}`, name, email, password_hash, phone, role, created_at: new Date().toISOString() };
    inMemoryStore.users.push(user);
    return { rows: [{ id: user.id, name, email, phone, role }], rowCount: 1 };
  }
  if (upper.includes('FROM USERS WHERE ID =')) {
    const user = inMemoryStore.users.find(u => u.id === params[0]);
    return { rows: user ? [user] : [], rowCount: user ? 1 : 0 };
  }

  // --- COOPERATIVES ---
  if (upper.includes('FROM COOPERATIVES ORDER BY NAME')) {
    return { rows: inMemoryStore.cooperatives, rowCount: inMemoryStore.cooperatives.length };
  }
  if (upper.includes('COUNT(*) TOTAL FROM COOPERATIVES') || upper.includes('SELECT COUNT(*) TOTAL FROM COOPERATIVES')) {
    return { rows: [{ total: inMemoryStore.cooperatives.length }], rowCount: 1 };
  }

  // --- WORKERS ---
  if (upper.includes('FROM WORKERS W LEFT JOIN COOPERATIVES C')) {
    const rows = inMemoryStore.workers.map(w => {
      const coop = inMemoryStore.cooperatives.find(c => c.id === w.cooperative_id);
      return { ...w, cooperative_name: coop?.name || 'Cooperative Partner' };
    });
    return { rows, rowCount: rows.length };
  }
  if (upper.includes('FROM WORKERS WHERE IS_VERIFIED=TRUE') || (upper.includes('FROM WORKERS') && upper.includes('SKILL'))) {
    const lat = Number(params[0]), lng = Number(params[1]), skill = String(params[2] || '').trim().toLowerCase();
    const rows = inMemoryStore.workers
      .filter(w => w.is_verified && w.is_available && (!skill || w.skill.toLowerCase() === skill))
      .map(w => ({ ...w, distance_km: calculateDistance(lat, lng, w.latitude, w.longitude) }))
      .sort((a, b) => a.distance_km - b.distance_km);
    return { rows, rowCount: rows.length };
  }
  if (upper.includes('FROM WORKERS WHERE ID=$1 AND IS_VERIFIED=TRUE')) {
    const worker = inMemoryStore.workers.find(w => w.id === params[0] && w.is_verified);
    return { rows: worker ? [worker] : [], rowCount: worker ? 1 : 0 };
  }
  if (upper.includes('FROM WORKERS WHERE ID=$1')) {
    const worker = inMemoryStore.workers.find(w => w.id === params[0]);
    return { rows: worker ? [worker] : [], rowCount: worker ? 1 : 0 };
  }
  if (upper.includes('UPDATE WORKERS SET LATITUDE=$1,LONGITUDE=$2 WHERE USER_ID=$3')) {
    const [lat, lng, userId] = params;
    const worker = inMemoryStore.workers.find(w => w.user_id === userId);
    if (worker) {
      worker.latitude = Number(lat);
      worker.longitude = Number(lng);
      return { rows: [worker], rowCount: 1 };
    }
    return { rows: [], rowCount: 0 };
  }
  if (upper.includes('UPDATE WORKERS SET IS_AVAILABLE=$1 WHERE USER_ID=$2')) {
    const [available, userId] = params;
    const worker = inMemoryStore.workers.find(w => w.user_id === userId);
    if (worker) {
      worker.is_available = Boolean(available);
      return { rows: [worker], rowCount: 1 };
    }
    return { rows: [], rowCount: 0 };
  }
  if (upper.includes('UPDATE WORKERS SET IS_AVAILABLE=') && upper.includes('WHERE ID=$1')) {
    const worker = inMemoryStore.workers.find(w => w.id === params[0]);
    if (worker) {
      worker.is_available = upper.includes('IS_AVAILABLE=TRUE');
      return { rows: [worker], rowCount: 1 };
    }
    return { rows: [], rowCount: 0 };
  }
  if (upper.includes('UPDATE WORKERS SET IS_VERIFIED = TRUE WHERE ID = $1')) {
    const worker = inMemoryStore.workers.find(w => w.id === params[0]);
    if (worker) {
      worker.is_verified = true;
      return { rows: [worker], rowCount: 1 };
    }
    return { rows: [], rowCount: 0 };
  }
  if (upper.includes('COUNT(*) TOTAL_WORKERS') || (upper.includes('FROM WORKERS') && upper.includes('COUNT(*)'))) {
    const total = inMemoryStore.workers.length;
    const active = inMemoryStore.workers.filter(w => w.is_available && w.is_verified).length;
    const pending = inMemoryStore.workers.filter(w => !w.is_verified).length;
    return { rows: [{ total_workers: total, active_workers: active, pending_verifications: pending }], rowCount: 1 };
  }

  // --- BOOKINGS ---
  if (upper.includes('INSERT INTO BOOKINGS')) {
    const [customerId, workerId, serviceType, isEmergency, lat, lng, status] = params;
    const booking = {
      id: `book-${Date.now()}`,
      customer_id: customerId,
      worker_id: workerId || null,
      service_type: serviceType,
      is_emergency: Boolean(isEmergency),
      latitude: Number(lat),
      longitude: Number(lng),
      amount: serviceType === 'plumbing' ? 450 : 350,
      status: status || 'requested',
      created_at: new Date().toISOString()
    };
    inMemoryStore.bookings.unshift(booking);
    return { rows: [booking], rowCount: 1 };
  }
  if (upper.includes('FROM BOOKINGS B LEFT JOIN WORKERS W')) {
    if (upper.includes('WHERE B.ID=$1')) {
      const b = inMemoryStore.bookings.find(item => item.id === params[0]);
      if (!b) return { rows: [], rowCount: 0 };
      const worker = inMemoryStore.workers.find(w => w.id === b.worker_id);
      const customer = inMemoryStore.users.find(u => u.id === b.customer_id);
      return { rows: [{ ...b, worker_user_id: worker?.user_id, worker_name: worker?.name, worker_phone: worker?.phone, customer_name: customer?.name, customer_email: customer?.email }], rowCount: 1 };
    }
    const isWorkerQuery = upper.includes('WHERE W.USER_ID=$1');
    const userId = params[0];
    const filtered = inMemoryStore.bookings.filter(b => {
      if (isWorkerQuery) {
        const worker = inMemoryStore.workers.find(w => w.id === b.worker_id);
        return worker && worker.user_id === userId;
      }
      return b.customer_id === userId;
    }).map(b => {
      const worker = inMemoryStore.workers.find(w => w.id === b.worker_id);
      return { ...b, worker_name: worker?.name, worker_phone: worker?.phone };
    });
    return { rows: filtered, rowCount: filtered.length };
  }
  if (upper.includes('UPDATE BOOKINGS SET STATUS=$1 WHERE ID=$2')) {
    const [status, bookingId] = params;
    const booking = inMemoryStore.bookings.find(b => b.id === bookingId);
    if (booking) {
      booking.status = status;
      return { rows: [booking], rowCount: 1 };
    }
    return { rows: [], rowCount: 0 };
  }
  if (upper.includes('FROM BOOKINGS WHERE ID = $1')) {
    const b = inMemoryStore.bookings.find(item => item.id === params[0]);
    return { rows: b ? [b] : [], rowCount: b ? 1 : 0 };
  }
  if (upper.includes('COMPLETED_JOBS_TOTAL') || (upper.includes('FROM BOOKINGS') && upper.includes('COUNT(*)'))) {
    const completed = inMemoryStore.bookings.filter(b => b.status === 'completed');
    const pending = inMemoryStore.bookings.filter(b => b.status === 'requested');
    const gross = completed.reduce((sum, b) => sum + (Number(b.amount) || 0), 0);
    return { rows: [{ jobs_today: inMemoryStore.bookings.length, completed_jobs_total: completed.length, pending_jobs: pending.length, gross_value: gross, welfare_value: gross * 0.07 }], rowCount: 1 };
  }

  // --- RATINGS ---
  if (upper.includes('INSERT INTO RATINGS')) {
    const [bookingId, workerId, customerId, score, feedback] = params;
    const rating = { id: `rat-${Date.now()}`, booking_id: bookingId, worker_id: workerId, customer_id: customerId, rating_score: Number(score), feedback, created_at: new Date().toISOString() };
    inMemoryStore.ratings.push(rating);
    return { rows: [rating], rowCount: 1 };
  }
  if (upper.includes('AVG(RATING_SCORE)')) {
    const avg = inMemoryStore.ratings.length ? inMemoryStore.ratings.reduce((s, r) => s + r.rating_score, 0) / inMemoryStore.ratings.length : 4.8;
    return { rows: [{ average_rating: avg }], rowCount: 1 };
  }

  // --- INVOICES & TRANSACTIONS ---
  if (upper.includes('FROM INVOICES WHERE BOOKING_ID=$1')) {
    const invoice = inMemoryStore.invoices.find(i => i.booking_id === params[0]);
    return { rows: invoice ? [invoice] : [], rowCount: invoice ? 1 : 0 };
  }
  if (upper.includes('INSERT INTO INVOICES')) {
    const [bookingId, invoiceNum, amount, orderId] = params;
    const inv = { id: `inv-${Date.now()}`, booking_id: bookingId, invoice_number: invoiceNum, amount: Number(amount), payment_method: 'Razorpay', status: 'pending', gateway: 'razorpay', gateway_order_id: orderId, created_at: new Date().toISOString() };
    inMemoryStore.invoices.push(inv);
    return { rows: [inv], rowCount: 1 };
  }
  if (upper.includes('UPDATE INVOICES SET STATUS=')) {
    const inv = inMemoryStore.invoices.find(i => i.booking_id === params[params.length - 1] || i.id === params[params.length - 1]);
    if (inv) {
      inv.status = 'paid';
      return { rows: [inv], rowCount: 1 };
    }
    return { rows: [], rowCount: 0 };
  }
  if (upper.includes('FROM INVOICES I JOIN BOOKINGS B')) {
    const isCustomer = params.length > 0;
    const customerId = params[0];
    const rows = inMemoryStore.invoices.filter(inv => {
      const b = inMemoryStore.bookings.find(item => item.id === inv.booking_id);
      return !isCustomer || (b && b.customer_id === customerId);
    }).map(inv => {
      const b = inMemoryStore.bookings.find(item => item.id === inv.booking_id);
      const worker = inMemoryStore.workers.find(w => w.id === b?.worker_id);
      const customer = inMemoryStore.users.find(u => u.id === b?.customer_id);
      return { ...inv, customer_id: b?.customer_id, worker_id: b?.worker_id, service_type: b?.service_type, worker_name: worker?.name, customer_name: customer?.name };
    });
    return { rows, rowCount: rows.length };
  }

  // --- NOTIFICATIONS ---
  if (upper.includes('FROM NOTIFICATIONS')) {
    const userId = params[0], role = params[1];
    const rows = inMemoryStore.notifications.filter(n => n.recipient_user_id === userId || (!n.recipient_user_id && n.recipient_role === role));
    return { rows, rowCount: rows.length };
  }
  if (upper.includes('INSERT INTO NOTIFICATIONS')) {
    const [recipientUserId, recipientRole, title, message, type, linkTo] = params;
    const notif = {
      id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      recipient_user_id: recipientUserId || null,
      recipient_role: recipientRole || null,
      title,
      message,
      type,
      link_to: linkTo || null,
      is_read: false,
      created_at: new Date().toISOString()
    };
    inMemoryStore.notifications.unshift(notif);
    return { rows: [notif], rowCount: 1 };
  }
  if (upper.includes('UPDATE NOTIFICATIONS SET IS_READ = TRUE')) {
    if (params.length === 3) {
      const notif = inMemoryStore.notifications.find(n => n.id === params[0]);
      if (notif) notif.is_read = true;
      return { rows: notif ? [{ id: notif.id }] : [], rowCount: notif ? 1 : 0 };
    }
    inMemoryStore.notifications.forEach(n => {
      if (n.recipient_user_id === params[0] || (!n.recipient_user_id && n.recipient_role === params[1])) {
        n.is_read = true;
      }
    });
    return { rows: [], rowCount: 1 };
  }

  return { rows: [], rowCount: 0 };
}

module.exports = { query, isPostgresConnected: () => usePostgres, getStore: () => inMemoryStore };

