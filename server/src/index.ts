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
const clientOrigin = process.env.CLIENT_URL
    ? process.env.CLIENT_URL.replace(/\/+$/, '') // Remove trailing slash if present
    : 'http://localhost:5173';

app.use(cors({
    origin: clientOrigin,
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
    console.log(`Server running on port ${port}`);
    console.log(`Client origin for CORS: ${clientOrigin}`);
    console.log(`WebSocket server initialized.`);
})
