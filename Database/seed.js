require('dotenv').config();
const db = require('../Backend/db');
const bcrypt = require('bcryptjs');

async function seed() {
    try {
        console.log('Starting Database Seeding...');
        await db.query('TRUNCATE ratings, invoices, bookings, workers, users, cooperatives CASCADE');

        const coopRes = await db.query(
            `INSERT INTO cooperatives (name, region) VALUES ($1, $2) RETURNING id`,
            ['Hyderabad Labour Cooperative', 'Telangana']
        );
        const coopId = coopRes.rows[0].id;
        const hash = await bcrypt.hash('Demo@123', 10);

        const users = await db.query(`
            INSERT INTO users (name, email, password_hash, phone, role) VALUES
            ('Dr. Rameshwar Rao (NCCT Federation)', 'demo.admin@sahakargig.local', $1, '9998887770', 'coop_admin'),
            ('Priya Sharma', 'priya.sharma@example.com', $1, '9876543219', 'customer'),
            ('John Customer', 'demo.customer@sahakargig.local', $1, '9998887771', 'customer'),
            ('Ravi Kumar', 'ravi.worker@sahakargig.local', $1, '9876543210', 'worker')
            RETURNING id, role, phone
        `, [hash]);
        const workerUser = users.rows.find(u => u.role === 'worker');
        const customer = users.rows.find(u => u.role === 'customer');

        const workerValues = [
            [workerUser.id, coopId, 'Ravi Kumar', '9876543210', 'plumbing', true, true, 4.80, 17.3850, 78.4867],
            [null, coopId, 'Suresh Reddy', '9876543211', 'electrical', true, true, 4.60, 17.3900, 78.4900],
            [null, coopId, 'Anil Kumar', '9876543212', 'carpentry', true, true, 4.70, 17.3750, 78.4820],
            [null, coopId, 'Lakshmi Devi', '9876543213', 'cleaning', true, true, 4.90, 17.3800, 78.4800]
        ];
        const workerIds = [];
        for (const worker of workerValues) {
            const result = await db.query(`
                INSERT INTO workers (user_id, cooperative_id, name, phone, skill, is_verified, is_available, rating, latitude, longitude)
                VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id
            `, worker);
            workerIds.push(result.rows[0].id);
        }

        await db.query(`
            INSERT INTO bookings (customer_id, worker_id, service_type, is_emergency, status, latitude, longitude, amount)
            VALUES ($1,$2,'plumbing',false,'completed',17.3850,78.4867,450.00)
        `, [customer.id, workerIds[0]]);

        console.log('Database seeded successfully. Demo password: Demo@123');
    } catch (err) {
        console.error('Seeding Error:', err);
        process.exitCode = 1;
    }
}
seed();
