import 'dotenv/config'
import http from "http";
import express from "express";
import cookieParser from "cookie-parser";
import { setupWebSocket } from './utils/webSocket.js';
import cors from 'cors';
import router from './router.js';

const port = process.env.PORT || 3000
const app = express()
const server = http.createServer(app)

app.use(cookieParser())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true
}))

import { setupSwagger } from './utils/swagger.js';
setupSwagger(app);



app.use('/api', router)

app.get('/',(req:any,res:any)=>{
    res.send("Hello")
})


setupWebSocket(server)

server.on("error", (error: NodeJS.ErrnoException) => {
    if (error.code === "EADDRINUSE") {
        console.error(`Port ${port} is already in use. Stop the existing server or set a different PORT.`);
        process.exit(1);
    }

    console.error("Server error:", error);
    process.exit(1);
});

server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
    console.log(`WebSocket ready on ws://localhost:${port}`);
})
