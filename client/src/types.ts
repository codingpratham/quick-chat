export interface User {
  id: string;
  username: string;
}

export interface Room {
  id: string;
  roomName: string;
  userId: string; // Creator/owner ID
}

export interface Member {
  id: string;
  userId: string;
  roomId: string;
  user: User;
}

export interface Message {
  id: string;
  content: string;
  sentAt: string;
  conversationId: string;
  senderId: string;
  sender: User;
}

export interface WSMessage {
  type: string;
  data?: unknown;
}
