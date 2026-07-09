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
app.use(cors())

import { setupSwagger } from './utils/swagger.js';
setupSwagger(app);



app.use('/api', router)

app.get('/',(req:any,res:any)=>{
    res.send("Hello")
})


setupWebSocket(server)

server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
    console.log(`WebSocket ready on ws://localhost:${port}`);
})
