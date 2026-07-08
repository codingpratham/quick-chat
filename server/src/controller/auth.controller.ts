import type { Request, Response } from 'express';

export function register ( req: Request, res: Response ) {
    const { username, password } = req.body;

    try{

    } catch (error) {
        console.error('Error during registration:', error);
        res.status(500).json({ message: 'Internal server error' });
    }   
}