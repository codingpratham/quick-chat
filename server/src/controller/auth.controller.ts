import type { Request, Response } from 'express';
import prisma from '../utils/prisma.js';
import jwt from 'jsonwebtoken';

export async function register ( req: Request, res: Response ) {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ message: 'Username and password are required' });
    }
    try{
        const user = await prisma.user.create({
            data: {
                username: username,
                password: password,
            }
        })

        const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET!, { expiresIn: '1h' });

        res.cookie('token',token,
            {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production', // Set to true in production
                sameSite: 'strict', // Adjust based on your requirements
                maxAge: 3600000, // 1 hour in milliseconds
            }
        )

        res.status(201).json({ message: 'User registered successfully', user, token });
    } catch (error) {
        console.error('Error during registration:', error);
        res.status(500).json({ message: 'Internal server error' });
    }   
}

export async function login ( req: Request, res: Response ) {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ message: 'Username and password are required' });
    }

    try{
        const user = await prisma.user.findUnique({
            where:{
                username: username,
            }
        })

        const isPasswordValid = user && user.password === password;

        if (!user || !isPasswordValid) {
            return res.status(401).json({ message: 'Invalid username or password' });
        }

        const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET!, { expiresIn: '1h' });

        res.cookie('token',token,
            {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production', // Set to true in production
                sameSite: 'strict', // Adjust based on your requirements
                maxAge: 3600000, // 1 hour in milliseconds
            }
        )

        res.status(200).json({ message: 'Login successful', user, token });

    }catch (error) {
        console.error('Error during login:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
}

export async function logout ( req: Request, res: Response ) {
    res.clearCookie('token', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production', // Set to true in production
        sameSite: 'strict', // Adjust based on your requirements
    });
    res.status(200).json({ message: 'Logout successful' });
}