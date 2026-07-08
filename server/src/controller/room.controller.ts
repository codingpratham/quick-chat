import type { Request, Response } from 'express';
import prisma from '../utils/prisma.js';

export async function createRoom(req: Request, res: Response) {
    const userId = req.userId;

    if (!userId) {
        return res.status(401).json({ message: 'Unauthorized. User ID is missing.' });
    }

    const { roomName } = req.body;

    if (!roomName) {
        return res.status(400).json({ message: 'Room name is required' });
    }

    try{
        const room = await prisma.room.create({
            data: {
                roomName: roomName,
            userId: userId
            }
        })
        res.status(201).json({ message: 'Room created successfully', room });
    }
    catch (error) {
        console.error('Error during room creation:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
}

export async function getRooms(req: Request, res: Response) {
    try{
        const rooms = await prisma.room.findMany();
        res.status(200).json({ message: 'Rooms fetched successfully', rooms });
    }
    catch (error) {
        console.error('Error during fetching rooms:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
}

export async function inviteMember(req: Request, res: Response) {
    const roomname = typeof req.params.roomname === 'string' ? req.params.roomname : undefined;
    const { username } = req.body;

    if (!roomname) {
        return res.status(400).json({ message: 'Room name is required' });
    }

    if (!username) {
        return res.status(400).json({ message: 'Username is required' });
    }

    try{
        const user = await prisma.user.findUnique({
            where: {
                username: username,
            }
        })
        
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const room = await prisma.room.findUnique({
            where: {
                roomName: roomname,
            }
        })

        if (!room) {
            return res.status(404).json({ message: 'Room not found' });
        }

        // add the user to the room's members (assumes a relation named `members` connecting to User by id)
        const updatedRoom = await prisma.room.update({
            where: {
                roomName: roomname,
            },
            data: {
                members: {
                    create: {
                        userId: user.id
                    }
                }
            },
        });


        return res.status(200).json({ message: 'Member invited successfully', room: updatedRoom });
    }
    catch (error) {
        console.error('Error during inviting member:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
}

export async function getRoomMembers(req: Request, res: Response) {
    const roomname = typeof req.params.roomname === 'string' ? req.params.roomname : undefined;

    if (!roomname) {
        return res.status(400).json({ message: 'Room name is required' });
    }

    try {
        const room = await prisma.room.findUnique({
            where: {
                roomName: roomname,
            },
            include: {
                members: {
                    include: {
                        user: true
                    }
                }
            }
        });

        if (!room) {
            return res.status(404).json({ message: 'Room not found' });
        }

        res.status(200).json({ message: 'Room members fetched successfully', members: room.members });
    } catch (error) {
        console.error('Error during fetching room members:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
}

export async function kickMember(req: Request, res: Response) {
    const roomname = typeof req.params.roomname === 'string' ? req.params.roomname : undefined;

    const { username } = req.body;

    if (!roomname) {
        return res.status(400).json({ message: 'Room name is required' });
    }
    
    if (!username) {
        return res.status(400).json({ message: 'Username is required' });
    }

    try{
        const kickedUser = await prisma.user.findUnique({
            where: {
                username: username,
            }
        })

        const room = await prisma.room.findUnique({
            where: {
                roomName: roomname,
            }
        })

        if (!kickedUser) {
            return res.status(404).json({ message: 'User not found' });
        }

        const updatedRoom = await prisma.room.update({
            where: {
                roomName: roomname,
            },
            data: {
                members: {
                    deleteMany: {
                        userId: kickedUser.id
                    }
                }
            },
        });

        res.status(200).json({ message: 'Member kicked successfully', room: updatedRoom });
             
    }
    catch (error) {
        console.error('Error during kicking member:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
}