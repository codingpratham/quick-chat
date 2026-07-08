import { WebSocketServer } from "ws";

export function setupWebSocket(server: any) {
const wss = new WebSocketServer({ server });

wss.on('connection',(ws)=>{
    ws.send('Welcome to the WebSocket server!')
    const math = Math.floor(Math.random()*1000)
    console.log(`New client connected: ${math}`);
})
}