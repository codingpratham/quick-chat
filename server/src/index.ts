import 'dotenv/config'
import http from "http";

import { setupWebSocket } from './utils/webSocket.js';

const port = process.env.PORT || 3000
const server = http.createServer() 


setupWebSocket(server)


server.listen(port, () => {
    console.log(`Server is running on port ${port}`);
})