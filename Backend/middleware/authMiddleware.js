const jwt = require('jsonwebtoken');

exports.verifyToken = (req, res, next) => {
    const authHeader = req.headers.authorization || '';
    const [scheme, token] = authHeader.split(' ');
    if (scheme !== 'Bearer' || !token) {
        return res.status(401).json({ error: 'Access denied. A Bearer token is required.' });
    }
    try {
        const secret = process.env.JWT_SECRET || 'sahakargig-default-development-jwt-secret-key-32chars';
        req.user = jwt.verify(token, secret);
        next();
    } catch (err) {
        return res.status(403).json({ error: 'Invalid or expired token.' });
    }
};

exports.authorizeRoles = (...allowedRoles) => (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
        return res.status(403).json({ error: `Access denied. Requires: ${allowedRoles.join(', ')}` });
    }
    next();
};
