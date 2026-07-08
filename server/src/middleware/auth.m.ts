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
    const token = req.cookies.token;

    if (!token) {
        return res.status(401).json({ message: 'Access denied. No token provided.' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };

    const decoded2 = jwt.decode(token) as { userId: string };

    if (!decoded || !decoded.userId) {
        return res.status(401).json({ message: 'Invalid token.' });
    }

    const userId = decoded.userId;

    req.userId = userId;
    next();
}