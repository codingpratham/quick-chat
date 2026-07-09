import { WebSocket } from "ws";
import jwt from "jsonwebtoken";
import prisma from "./prisma.js";

// ─────────────────────────────────────────────────────────────────────────────
// TYPE DEFINITIONS
// ─────────────────────────────────────────────────────────────────────────────

// We extend the raw WebSocket type to carry extra info per-connection:
// userId   → who is this client? (set after 'auth' event)
// roomId   → which room are they currently in?
export interface AuthenticatedWS extends WebSocket {
    userId?: string | undefined;
    username?: string | undefined;
    roomId?: string | undefined;
}

// Every message the client sends must have a "type" field + optional payload
interface WSMessage {
    type: "auth" | "join-room" | "send-message" | "leave-room";
    payload?: Record<string, string>;
}

// ─────────────────────────────────────────────────────────────────────────────
// IN-MEMORY ROOM MAP
// ─────────────────────────────────────────────────────────────────────────────
//
// This is the heart of real-time. We keep a Map in server memory:
//   roomId → Set of connected WebSocket clients in that room
//
// When someone sends a message, we look up everyone in the room and push to them.
// This lives in RAM (not the DB) - it resets on server restart.
//
export const rooms = new Map<string, Set<AuthenticatedWS>>();

// ─────────────────────────────────────────────────────────────────────────────
// HELPER: send a typed JSON message to ONE client
// ─────────────────────────────────────────────────────────────────────────────
function send(ws: AuthenticatedWS, type: string, data: object) {
    if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type, data }));
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPER: broadcast to ALL clients in a room EXCEPT the sender
// ─────────────────────────────────────────────────────────────────────────────
function broadcast(roomId: string, type: string, data: object, exclude?: AuthenticatedWS) {
    const roomClients = rooms.get(roomId);
    if (!roomClients) return;

    roomClients.forEach((client) => {
        if (client !== exclude && client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ type, data }));
        }
    });
}

// ─────────────────────────────────────────────────────────────────────────────
// HANDLER: "auth"
// Client sends: { type: "auth", payload: { token: "eyJ..." } }
//
// Why authenticate over WS? Because WS doesn't send cookies or headers
// after the initial handshake. The client must manually send the JWT token
// as the first message so we know who they are.
// ─────────────────────────────────────────────────────────────────────────────
async function handleAuth(ws: AuthenticatedWS, payload: Record<string, string>) {
    const { token } = payload;

    if (!token) {
        send(ws, "auth-error", { message: "Token is required" });
        return;
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };

        const user = await prisma.user.findUnique({ where: { id: decoded.userId } });

        if (!user) {
            send(ws, "auth-error", { message: "User not found" });
            return;
        }

        // Stamp the connection with identity — now we know who this ws is
        ws.userId = user.id;
        ws.username = user.username;

        send(ws, "auth-success", { userId: user.id, username: user.username });
        console.log(` WS authenticated: ${user.username}`);
    } catch {
        send(ws, "auth-error", { message: "Invalid or expired token" });
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// HANDLER: "join-room"
// Client sends: { type: "join-room", payload: { roomId: "abc123" } }
//
// Steps:
//  1. Make sure the user is authenticated (has userId stamped on ws)
//  2. Check they are actually a member of that room in the DB
//  3. Add their ws to the in-memory rooms map
//  4. Send them the last 50 messages (chat history)
// ─────────────────────────────────────────────────────────────────────────────
async function handleJoinRoom(ws: AuthenticatedWS, payload: Record<string, string>) {
    if (!ws.userId) {
        send(ws, "error", { message: "Not authenticated. Send 'auth' first." });
        return;
    }

    const { roomId } = payload;

    if (!roomId) {
        send(ws, "error", { message: "roomId is required" });
        return;
    }

    // Check membership - is this user allowed in this room?
    const membership = await prisma.members.findFirst({
        where: { roomId, userId: ws.userId },
    });

    // Also allow if they are the room owner
    const room = await prisma.room.findUnique({ where: { id: roomId } });

    if (!room) {
        send(ws, "error", { message: "Room not found" });
        return;
    }

    if (!membership && room.userId !== ws.userId) {
        send(ws, "error", { message: "You are not a member of this room" });
        return;
    }

    // If the user was in another room, remove them first
    if (ws.roomId && ws.roomId !== roomId) {
        leaveRoom(ws);
    }

    // Add to in-memory room map
    if (!rooms.has(roomId)) {
        rooms.set(roomId, new Set());
    }
    rooms.get(roomId)!.add(ws);
    ws.roomId = roomId;

    // Get or create conversation for this room
    let conversation = await prisma.conversation.findFirst({ where: { roomId } });
    if (!conversation) {
        conversation = await prisma.conversation.create({ data: { roomId } });
    }

    // Fetch last 50 messages ordered by sentAt
    const history = await prisma.message.findMany({
        where: { conversationId: conversation.id },
        orderBy: { sentAt: "asc" },
        take: 50,
        include: { sender: { select: { username: true, id: true } } },
    });

    send(ws, "room-joined", { roomId, roomName: room.roomName });
    send(ws, "room-history", { messages: history });

    // Tell everyone else in the room someone joined
    broadcast(roomId, "user-joined", { username: ws.username! }, ws);

    console.log(` ${ws.username} joined room: ${room.roomName}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// HANDLER: "send-message"
// Client sends: { type: "send-message", payload: { content: "Hello!" } }
// (roomId is already stored on ws.roomId from join-room)
//
// Steps:
//  1. Verify auth + room membership
//  2. Save message to DB (inside conversation)
//  3. Broadcast to ALL clients in the room (including sender)
// ─────────────────────────────────────────────────────────────────────────────
async function handleSendMessage(ws: AuthenticatedWS, payload: Record<string, string>) {
    if (!ws.userId || !ws.username) {
        send(ws, "error", { message: "Not authenticated" });
        return;
    }

    if (!ws.roomId) {
        send(ws, "error", { message: "Not in a room. Send 'join-room' first." });
        return;
    }

    const { content } = payload;

    if (!content || content.trim() === "") {
        send(ws, "error", { message: "Message content cannot be empty" });
        return;
    }

    // Get or create conversation
    let conversation = await prisma.conversation.findFirst({ where: { roomId: ws.roomId } });
    if (!conversation) {
        conversation = await prisma.conversation.create({ data: { roomId: ws.roomId } });
    }

    // Save to DB — this is the source of truth
    const savedMessage = await prisma.message.create({
        data: {
            content: content.trim(),
            conversationId: conversation.id,
            senderId: ws.userId,
        },
        include: { sender: { select: { username: true, id: true } } },
    });

    // Broadcast to EVERYONE in the room (including the sender so they see it confirmed)
    const roomClients = rooms.get(ws.roomId);
    roomClients?.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ type: "new-message", data: savedMessage }));
        }
    });

    console.log(` [${ws.username} → ${ws.roomId}]: ${content.trim()}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPER: remove ws from whichever room they're in
// ─────────────────────────────────────────────────────────────────────────────
export function leaveRoom(ws: AuthenticatedWS) {
    if (!ws.roomId) return;

    const roomClients = rooms.get(ws.roomId);
    if (roomClients) {
        roomClients.delete(ws);
        if (roomClients.size === 0) {
            // Clean up empty rooms from memory
            rooms.delete(ws.roomId);
        } else {
            // Notify remaining members
            broadcast(ws.roomId, "user-left", { username: ws.username ?? "Someone" });
        }
    }
    console.log(` ${ws.username} left room: ${ws.roomId}`);
    ws.roomId = undefined;
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN ROUTER — called for every message from any client
// This is the "switch statement" that dispatches to the right handler
// ─────────────────────────────────────────────────────────────────────────────
export async function wsRouter(ws: AuthenticatedWS, rawData: string) {
    let parsed: WSMessage;

    // Try to parse JSON - bad JSON = immediate error, no crash
    try {
        parsed = JSON.parse(rawData);
    } catch {
        send(ws, "error", { message: "Invalid JSON format" });
        return;
    }

    const { type, payload = {} } = parsed;

    // Dispatch based on type — this IS the router
    switch (type) {
        case "auth":
            await handleAuth(ws, payload);
            break;

        case "join-room":
            await handleJoinRoom(ws, payload);
            break;

        case "send-message":
            await handleSendMessage(ws, payload);
            break;

        case "leave-room":
            leaveRoom(ws);
            send(ws, "left-room", { message: "You left the room" });
            break;

        default:
            send(ws, "error", { message: `Unknown message type: "${type}"` });
    }
}
