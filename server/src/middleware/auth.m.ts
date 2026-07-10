import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

declare global {
    namespace Express {
        interface Request {
            userId: string;
        }
    }
}

export function authenticateToken(req: Request, res: Response, next: NextFunction) {
    // Clients typically send JWTs in the Authorization header as a Bearer token.
    // This change updates the middleware to look for the token in the Authorization header.
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

    if (!token) {
        return res.status(401).json({ message: 'Access denied. No token provided.' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };

    if (!decoded || !decoded.userId) {
        return res.status(401).json({ message: 'Invalid token.' });
    }

    const userId = decoded.userId;

    req.userId = userId;
    next();
}