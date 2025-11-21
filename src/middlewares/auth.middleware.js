import { verify } from 'jsonwebtoken';

const authMiddleware = (req, res, next) => {
    // correlate auth checks with traceId when available
    const traceId = req.traceId || req.requestId || 'no-trace';
    const token = req.headers['authorization'];

    if (!token) {
        console.warn(`[AuthMiddleware][${traceId}] No token provided`);
        return res.status(401).json({ message: 'No token provided', traceId });
    }

    verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) {
            console.warn(`[AuthMiddleware][${traceId}] Token authentication failed:`, err?.message || err);
            return res.status(403).json({ message: 'Failed to authenticate token', traceId });
        }

        req.userId = decoded.id;
        console.log(`[AuthMiddleware][${traceId}] Authenticated userId=${req.userId}`);
        next();
    });
};

export default authMiddleware;