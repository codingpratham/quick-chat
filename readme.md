# Quick-chat Chat App

A sleek, responsive, and real-time chat application featuring channel isolation, secure cookie-based and message-based WebSocket authentication, custom channel membership, invitations, and creator moderation (kick controls).

The architecture consists of a **Node.js Express & PostgreSQL server** combined with a **React + Tailwind CSS v4 frontend** powered by the **Vite** build tool.

---

## Technical Features

- **Robust Authentication**: Cookie-based JWT authentication for REST API endpoints and explicit token validation payload for WebSocket handshakes.
- **WebSocket Channel Router**: Central in-memory message routing system that dynamically binds active client connections to DB-backed room entities.
- **Glass orphic UI**: High-fidelity dark mode designed using Tailwind CSS v4, featuring Outfit and Inter typography, micro-interactions, and message entry animations.
- **Channel Membership**: Channels are restricted to their creator and invited members. Non-members are prompted with an interactive Join Channel screen.
- **Creator Moderation**: Channel creators are designated with a Crown badge and have administrative controls to kick other members.

---

## Directory Structure

```text
Quick-chat/
├── server/                 # Express REST API & WebSocket Server
│   ├── src/
│   │   ├── controller/     # Auth and Room controllers
│   │   ├── middleware/     # Cookie JWT verification
│   │   ├── utils/          # Prisma client, Swagger, and WebSocket Router
│   │   └── index.ts        # App bootstrapper
│   ├── prisma/             # Schema definitions and migrations
│   └── package.json
│
└── client/                 # React + Tailwind CSS v4 SPA
    ├── src/
    │   ├── components/     # UI Components (AuthCard, Sidebar, ChatRoom)
    │   ├── types.ts        # TypeScript models
    │   ├── App.tsx         # Central layout and state orchestra
    │   └── index.css       # Tailwind v4 import & custom styles
    ├── vite.config.ts      # Vite configuration & dev proxy
    └── package.json
```

---

## Setup & Installation

### Prerequisite

Make sure you have [Node.js](https://nodejs.org/) installed on your machine.

---

### Step 1: Configure and Start the Backend Server

1. Open a terminal and navigate to the `server/` directory:
   ```bash
   cd server
   ```

2. Install backend dependencies:
   ```bash
   npm install
   ```

3. Configure your local environment file. Rename or create a `.env` file in the `server/` folder and supply your values:
   ```env
   PORT=3000
   DATABASE_URL="postgresql://username:password@localhost:5432/bobbuilder?schema=public"
   JWT_SECRET="YOUR_SUPER_SECRET_KEY"
   ```

4. Push the Prisma schema to configure your database and generate the Prisma Client:
   ```bash
   npx prisma db push
   ```

5. Start the backend developer server:
   ```bash
   npm run dev
   ```
   The backend server will list on `http://localhost:3000` with WebSockets ready at `ws://localhost:3000`.

---

### Step 2: Configure and Start the React Client

1. Open a new terminal and navigate to the `client/` directory:
   ```bash
   cd client
   ```

2. Install client dependencies:
   ```bash
   npm install
   ```

3. Launch the Vite developer server:
   ```bash
   npm run dev
   ```
   Open your browser to the local address outputted in the terminal (usually `http://localhost:5173`).

---

## API Documentation

The backend includes a Swagger UI interface detailing the REST APIs. Once the server is running, you can explore details at:
`http://localhost:3000/api-docs`

### Major REST Endpoints

| Method | Endpoint | Description | Payload |
|---|---|---|---|
| `POST` | `/api/register` | Register new user. Returns Cookie + JWT token | `{ username, password }` |
| `POST` | `/api/login` | Log in existing user. Returns Cookie + JWT token | `{ username, password }` |
| `POST` | `/api/logout` | Clears local session cookie | (None) |
| `GET` | `/api/rooms` | Fetch all channels | (None - Needs cookie) |
| `POST` | `/api/rooms` | Create new channel | `{ roomName }` |
| `GET` | `/api/rooms/:roomname/members` | Get all members of a channel | (None) |
| `POST` | `/api/rooms/:roomname/invite` | Invite/add username to channel members | `{ username }` |
| `DELETE` | `/api/rooms/:roomname/kick` | Kick/remove member from channel (Owner only) | `{ username }` |

### WebSocket Protocol Specification

WebSocket connections require explicit authentication. After connecting, the server will request authentication. Message payloads follow a `{ type, payload }` format.

1. **Client Auth Payload**:
   ```json
   {
     "type": "auth",
     "payload": {
       "token": "<JWT_TOKEN>"
     }
   }
   ```
   Server responds with `auth-success` or `auth-error`.

2. **Join Room Payload**:
   ```json
   {
     "type": "join-room",
     "payload": {
       "roomId": "<ROOM_UUID>"
     }
   }
   ```
   Server responds with `room-joined` and `room-history` (containing the last 50 messages).

3. **Send Message Payload**:
   ```json
   {
     "type": "send-message",
     "payload": {
       "content": "Hello world!"
     }
   }
   ```
   Server broadcasts the newly saved message to all active clients in the channel under the type `new-message`.
