import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { db } from './src/server/db';
import { ContributionAmount } from './src/types';

// Extend Express Request to hold authenticated worker context
interface AuthenticatedRequest extends Request {
  userId?: string;
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.INSURANCE_PORT || process.env.PORT || 3001);

  app.use(express.json());

  // Session token store in-memory (map token -> userId)
  const activeSessions = new Map<string, string>();
  // Seed default session for preview/initial load
  activeSessions.set('session_default_102', 'usr_w102');

  // Simple authentication middleware
  const authMiddleware = (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
    let token = '';
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7).trim();
    } else if (req.headers['x-session-token']) {
      token = String(req.headers['x-session-token']);
    }

    if (token && activeSessions.has(token)) {
      req.userId = activeSessions.get(token);
    } else if (req.headers['x-worker-id']) {
      // Look up by worker ID
      const w = db.getWorkerByWorkerId(String(req.headers['x-worker-id']));
      if (w) req.userId = w.id;
    }

    // Default to Rajesh Sharma (usr_w102) if no explicit session yet
    if (!req.userId) {
      req.userId = 'usr_w102';
    }

    next();
  };

  // ---------------- API ROUTES ----------------

  // Health check
  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', app: 'SahakarGig' });
  });

  // Get current authenticated user session
  app.get('/api/auth/me', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
    const worker = db.getWorkerById(req.userId!);
    if (!worker) {
      return res.status(404).json({ error: 'Worker account not found' });
    }
    res.json({
      user: {
        id: worker.id,
        workerId: worker.workerId,
        name: worker.name,
      },
    });
  });

  // Get list of worker profiles available for demonstration of dynamic login
  app.get('/api/auth/workers', (_req: Request, res: Response) => {
    const workers = db.getWorkerListSafe();
    res.json({ workers });
  });

  // Worker Login / Switch Session
  app.post('/api/auth/login', (req: Request, res: Response) => {
    const { userId, workerId, mobile } = req.body;
    let targetWorker = null;

    if (userId) {
      targetWorker = db.getWorkerById(userId);
    } else if (workerId) {
      targetWorker = db.getWorkerByWorkerId(workerId);
    } else if (mobile) {
      const all = db.getWorkerListSafe();
      for (const item of all) {
        const full = db.getWorkerById(item.id);
        if (full?.mobile === mobile) {
          targetWorker = full;
          break;
        }
      }
    }

    if (!targetWorker) {
      return res.status(400).json({ error: 'Worker credentials not found in SahakarGig database' });
    }

    const token = `sg_tok_${targetWorker.id}_${Date.now()}`;
    activeSessions.set(token, targetWorker.id);

    res.json({
      message: 'Authenticated successfully',
      token,
      user: {
        id: targetWorker.id,
        workerId: targetWorker.workerId,
        name: targetWorker.name,
      },
    });
  });

  // Logout
  app.post('/api/auth/logout', (req: Request, res: Response) => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7).trim();
      activeSessions.delete(token);
    }
    res.json({ message: 'Logged out successfully' });
  });

  // Get current authenticated worker profile (secured: relies on session, not client param)
  app.get('/api/worker/me', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
    const worker = db.getWorkerById(req.userId!);
    if (!worker) {
      return res.status(404).json({ error: 'Authenticated worker profile not found' });
    }
    res.json({ worker });
  });

  // Get current authenticated worker's insurance status & details
  app.get('/api/insurance/me', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
    const insurance = db.getInsurance(req.userId!);
    if (!insurance) {
      return res.json({ insurance: null, status: 'not_enrolled' });
    }
    res.json({ insurance, status: insurance.status });
  });

  // Enroll in micro-insurance for authenticated worker
  app.post('/api/insurance/enroll', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
    const { selectedContribution, consent } = req.body;

    if (!consent) {
      return res.status(400).json({ error: 'Worker consent is required to confirm insurance contribution.' });
    }

    if (![5, 10, 20].includes(Number(selectedContribution))) {
      return res.status(400).json({ error: 'Invalid contribution amount. Must be ₹5, ₹10, or ₹20 per day.' });
    }

    try {
      const updatedRecord = db.enrollInsurance(
        req.userId!,
        Number(selectedContribution) as ContributionAmount,
        Boolean(consent)
      );
      res.json({
        message: 'Micro-insurance confirmed and recorded in SahakarGig database',
        insurance: updatedRecord,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to enroll in micro-insurance' });
    }
  });

  // Adjust daily contribution for authenticated worker
  app.post('/api/insurance/adjust', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
    const { newContribution, reason, confirmed } = req.body;

    if (!confirmed) {
      return res.status(400).json({ error: 'Worker confirmation is required to adjust contribution.' });
    }

    if (![5, 10, 20].includes(Number(newContribution))) {
      return res.status(400).json({ error: 'Invalid contribution amount.' });
    }

    try {
      const updated = db.adjustInsurance(
        req.userId!,
        Number(newContribution) as ContributionAmount,
        reason || 'Worker requested adjustment'
      );
      res.json({
        message: 'Contribution adjusted successfully',
        insurance: updated,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to adjust contribution' });
    }
  });

  // Get authenticated worker's contribution history
  app.get('/api/insurance/history', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
    const history = db.getContributions(req.userId!);
    res.json({ history });
  });

  // Get authenticated worker's claims
  app.get('/api/insurance/claims', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
    const claims = db.getClaims(req.userId!);
    res.json({ claims });
  });

  // Submit a claim for authenticated worker
  app.post('/api/insurance/claims', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
    const { claimType, incidentDate, hospitalOrClinic, description, contactNumber, documentsAttached } =
      req.body;

    if (!claimType || !incidentDate || !contactNumber) {
      return res.status(400).json({ error: 'Incident type, date, and contact number are required.' });
    }

    try {
      const newClaim = db.createClaim(req.userId!, {
        claimType,
        incidentDate,
        hospitalOrClinic: hospitalOrClinic || '',
        description: description || '',
        contactNumber,
        documentsAttached: documentsAttached || [],
      });
      res.status(201).json({
        message: 'Claim registered successfully in SahakarGig database',
        claim: newClaim,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to submit claim' });
    }
  });

  // ---------------- VITE MIDDLEWARE SETUP ----------------

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`SahakarGig Server running on http://localhost:${PORT}`);
  });
}

startServer();
