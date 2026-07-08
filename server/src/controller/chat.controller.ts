import type { Request, Response } from 'express';

export function createChatRoom ( req : Request, res : Response ) {
    const { roomName } = req.body;

    const roomId = Math.random().toString(36).substring(2, 15); // Generate a random room ID
    
    const wss = req.app.get('wss'); // Get the WebSocket server instance from the app


}