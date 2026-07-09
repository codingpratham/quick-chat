import { WebSocketServer } from "ws";
import { wsRouter, leaveRoom, type AuthenticatedWS } from "./wsRouter.js";

export function setupWebSocket(server: any) {
    const wss = new WebSocketServer({ server });

    wss.on("connection", (ws: AuthenticatedWS) => {
        console.log("🔌 New WebSocket connection established");

        // Send connection acknowledgement - client knows they're connected
        ws.send(JSON.stringify({
            type: "connected",
            data: { message: "Connected! Please send { type: 'auth', payload: { token } } to authenticate." }
        }));

        // Every message from this client goes through the router
        ws.on("message", (rawData) => {
            wsRouter(ws, rawData.toString());
        });

        // When client disconnects (tab close, network drop, etc.)
        ws.on("close", () => {
            leaveRoom(ws); // Remove from room, notify others
            console.log(`❌ ${ws.username ?? "Unauthenticated user"} disconnected`);
        });

        // Handle network errors gracefully - don't crash the server
        ws.on("error", (err) => {
            console.error("WebSocket error:", err.message);
            leaveRoom(ws);
        });
    });

    console.log("🚀 WebSocket server is ready");
}