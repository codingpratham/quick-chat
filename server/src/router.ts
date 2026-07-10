import { Router } from "express";
import { register, login, logout } from "./controller/auth.controller.js";
import { createRoom, getRooms, inviteMember, getRoomMembers, kickMember } from "./controller/room.controller.js";
import { authenticateToken } from "./middleware/auth.m.js";

const router = Router();


// ─── AUTH ROUTES ─────────────────────────────────────────────────────────────

/**
 * @openapi
 * /api/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       201:
 *         description: User registered successfully
 *       400:
 *         description: Username and password are required
 *       500:
 *         description: Internal server error
 */
router.post("/register", register);

/**
 * @openapi
 * /api/login:
 *   post:
 *     summary: Login an existing user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful
 *         headers:
 *           Set-Cookie:
 *             schema:
 *               type: string
 *               example: token=abcde12345; HttpOnly
 *       401:
 *         description: Invalid username or password
 *       500:
 *         description: Internal server error
 */
router.post("/login", login);

/**
 * @openapi
 * /api/logout:
 *   post:
 *     summary: Logout user
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Logout successful
 */
router.post("/logout", logout);


// ─── ROOM ROUTES (all protected - must be logged in) ─────────────────────────

/**
 * @openapi
 * /api/rooms:
 *   post:
 *     summary: Create a new room
 *     tags: [Rooms]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - roomName
 *             properties:
 *               roomName:
 *                 type: string
 *     responses:
 *       201:
 *         description: Room created successfully
 *       401:
 *         description: Unauthorized
 */
router.post("/rooms", authenticateToken, createRoom);

/**
 * @openapi
 * /api/rooms:
 *   get:
 *     summary: Get all rooms
 *     tags: [Rooms]
 *     responses:
 *       200:
 *         description: Rooms fetched successfully
 *       401:
 *         description: Unauthorized
 */
router.get("/rooms", getRooms);

/**
 * @openapi
 * /api/rooms/{roomname}/invite:
 *   post:
 *     summary: Invite a user to a room
 *     tags: [Rooms]
 *     parameters:
 *       - in: path
 *         name: roomname
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *             properties:
 *               username:
 *                 type: string
 *     responses:
 *       200:
 *         description: Member invited successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: User or Room not found
 */
router.post("/rooms/:roomname/invite", authenticateToken, inviteMember);

/**
 * @openapi
 * /api/rooms/{roomname}/members:
 *   get:
 *     summary: Get room members
 *     tags: [Rooms]
 *     parameters:
 *       - in: path
 *         name: roomname
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Room members fetched successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Room not found
 */
router.get("/rooms/:roomname/members", authenticateToken, getRoomMembers);

/**
 * @openapi
 * /api/rooms/{roomname}/kick:
 *   delete:
 *     summary: Kick a member from a room
 *     tags: [Rooms]
 *     parameters:
 *       - in: path
 *         name: roomname
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *             properties:
 *               username:
 *                 type: string
 *     responses:
 *       200:
 *         description: Member kicked successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: User or Room not found
 */
router.delete("/rooms/:roomname/kick", authenticateToken, kickMember);

export default router;
