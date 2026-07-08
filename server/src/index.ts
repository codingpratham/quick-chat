import 'dotenv/config'
import http from "http";
import express from "express";
import cookieParser from "cookie-parser";
import { setupWebSocket } from './utils/webSocket.js';
import cors from 'cors';

const port = process.env.PORT || 3000
const app = express()
const server = http.createServer(app)

app.use(cookieParser())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(cors())

setupWebSocket(server)


server.listen(port, () => {
    console.log(`Server is running on port ${port}`);
})