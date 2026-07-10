import { useState, useEffect, useRef, useCallback } from 'react';
import { AuthCard } from './components/AuthCard';
import { Sidebar } from './components/Sidebar';
import { ChatRoom } from './components/ChatRoom';
import type { Room, Message, Member } from './types';
import { MessageSquare } from 'lucide-react';

export default function App() {
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [username, setUsername] = useState<string | null>(localStorage.getItem('username'));
  const [userId, setUserId] = useState<string | null>(localStorage.getItem('userId'));
  const [rooms, setRooms] = useState<Room[]>([]);
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  
  // Connection state
  const [connectionState, setConnectionState] = useState<'connecting' | 'connected' | 'disconnected'>('disconnected');
  const [notMemberError, setNotMemberError] = useState<string | null>(null);

  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const activeRoomIdRef = useRef<string | null>(null);

  useEffect(() => {
    activeRoomIdRef.current = activeRoomId;
  }, [activeRoomId]);

  // Computed active room object
  const activeRoom = rooms.find((r) => r.id === activeRoomId) || null;

      const apiUrl = import.meta.env.VITE_API_URL as string;

  // 1. Fetch rooms list
  const fetchRooms = useCallback(async () => {
    if (!token) return;
    try {
      const response = await fetch(`${apiUrl}/api/rooms`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const data = await response.json();
      if (response.ok) {
        setRooms(data.rooms || []);
      }
    } catch (err) {
      console.error('Failed to fetch rooms:', err);
    }
  }, [token]);

  // 2. Fetch members list for active room
  const fetchMembers = useCallback(async (roomName: string) => {
    if (!token) return;
    try {
      const apiUrl = import.meta.env.VITE_API_URL as string;
      const response = await fetch(`${apiUrl}/api/rooms/${encodeURIComponent(roomName)}/members`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const data = await response.json();
      if (response.ok) {
        setMembers(data.members || []);
      }
    } catch (err) {
      console.error('Failed to fetch members:', err);
    }
  }, [token]);

  // 3. Invite member
  const handleInviteMember = async (targetUsername: string) => {
    if (!activeRoom || !token) return;
    const apiUrl = import.meta.env.VITE_API_URL as string;
    const response = await fetch(`${apiUrl}/api/rooms/${encodeURIComponent(activeRoom.roomName)}/invite`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ username: targetUsername }),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Invitation failed.');
    }
    await fetchMembers(activeRoom.roomName);
  };

  // 4. Kick member
  const handleKickMember = async (targetUsername: string) => {
    if (!activeRoom || !token) return;
    const apiUrl = import.meta.env.VITE_API_URL as string;
    const response = await fetch(`${apiUrl}/api/rooms/${encodeURIComponent(activeRoom.roomName)}/kick`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ username: targetUsername }),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Kick failed.');
    }
    await fetchMembers(activeRoom.roomName);
  };

  // 5. Self join when unauthorized in a room
  const handleJoinRoomSelf = async () => {
    if (!activeRoom || !username || !token) return;
    try {
      const apiUrl = import.meta.env.VITE_API_URL as string;
      const response = await fetch(`${apiUrl}/api/rooms/${encodeURIComponent(activeRoom.roomName)}/invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ username }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to join room.');
      }
      
      // Clear the restriction error state immediately
      setNotMemberError(null);
      
      // Update sidebar room permissions/states
      await fetchRooms();
      
      // Re-trigger WebSocket authorization for the newly joined room
      if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
        socketRef.current.send(
          JSON.stringify({
            type: 'join-room',
            payload: { roomId: activeRoom.id },
          })
        );
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to join channel.';
      alert(message);
    }
  };

  // 6. Create Room
  const handleCreateRoom = async (roomName: string) => {
    if (!token) return;
    const apiUrl = import.meta.env.VITE_API_URL as string;
    const response = await fetch(`${apiUrl}/api/rooms`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ roomName }),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Failed to create room.');
    }
    await fetchRooms();
    if (data.room) {
      setActiveRoomId(data.room.id);
    }
  };

  // Logout routine
  const handleLogout = useCallback(async () => {
    const apiUrl = import.meta.env.VITE_API_URL as string;
    try {
      await fetch(`${apiUrl}/api/logout`, { method: 'POST' });
    } catch (e) {
      console.error('Error hitting logout route:', e);
    }
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    localStorage.removeItem('userId');
    setToken(null);
    setUsername(null);
    setUserId(null);
  }, []);

  // 7. WebSocket setup & listeners
  const connectWebSocket = useCallback(function connectWebSocketFn() {
    if (!token) return;
    
    if (socketRef.current && (socketRef.current.readyState === WebSocket.OPEN || socketRef.current.readyState === WebSocket.CONNECTING)) {
      return;
    }

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    setConnectionState('connecting');

    
    const wsUrl = `${import.meta.env.VITE_API_URL?.replace(/^http/, 'ws')}/ws`;

    console.log('Connecting to WebSocket:', wsUrl);
    const ws = new WebSocket(wsUrl);
    socketRef.current = ws;

    ws.onopen = () => {
      console.log('WS Connection opened');
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        const { type, data } = message;

        switch (type) {
          case 'connected':
            ws.send(JSON.stringify({ type: 'auth', payload: { token } }));
            break;

          case 'auth-success':
            console.log('WS Authenticated successfully');
            setConnectionState('connected');
            if (activeRoomIdRef.current) {
              ws.send(
                JSON.stringify({
                  type: 'join-room',
                  payload: { roomId: activeRoomIdRef.current },
                })
              );
            }
            break;

          case 'auth-error':
            console.error('WS Auth failed:', data?.message);
            handleLogout();
            break;

          case 'room-joined':
            setNotMemberError(null);
            fetchMembers(data.roomName);
            fetchRooms();
            break;

          case 'room-history':
            setMessages(data.messages || []);
            break;

          case 'new-message':
            setMessages((prev) => [...prev, data]);
            break;

          case 'user-joined':
            setMessages((prev) => [
              ...prev,
              {
                id: 'sys-join-' + Date.now(),
                content: `${data.username} joined the channel`,
                sentAt: new Date().toISOString(),
                conversationId: '',
                senderId: '',
                sender: { id: '', username: '' },
              },
            ]);
            if (data.roomName) fetchMembers(data.roomName);
            break;

          case 'user-left':
            setMessages((prev) => [
              ...prev,
              {
                id: 'sys-leave-' + Date.now(),
                content: `${data.username} left the channel`,
                sentAt: new Date().toISOString(),
                conversationId: '',
                senderId: '',
                sender: { id: '', username: '' },
              },
            ]);
            if (data.roomName) fetchMembers(data.roomName);
            break;

          case 'error':
            console.error('WS Error:', data?.message);
            if (data?.message?.includes('not a member')) {
              // FIX: Retain room selection context so ChatRoom can display the join screen instead of deselecting the view
              setNotMemberError(data.message);
              setMessages([]);
              setMembers([]);
              fetchRooms();
            }
            break;

          default:
            console.log('Unhandled message type:', type);
        }
      } catch (err) {
        console.error('Error handling WS message:', err);
      }
    };

    ws.onclose = () => {
      console.log('WS Connection closed');
      setConnectionState('disconnected');
      
      if (token) {
        if (!reconnectTimeoutRef.current) {
          reconnectTimeoutRef.current = window.setTimeout(() => {
            console.log('Attempting to reconnect WebSocket...');
            reconnectTimeoutRef.current = null; 
            connectWebSocketFn();
          }, 3000);
        }
      }
    };

    ws.onerror = (err) => {
      console.error('WS error details:', err);
      ws.close();
    };
  }, [token, fetchMembers, fetchRooms, handleLogout]);

  // 8. Dynamic setup on mount/token change
  useEffect(() => {
    if (token) {
      fetchRooms();
      connectWebSocket();
    } else {
      if (socketRef.current) {
        socketRef.current.close();
      }
      setRooms([]);
      setActiveRoomId(null);
      setMessages([]);
      setMembers([]);
    }

    return () => {
      if (socketRef.current) {
        socketRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [token, fetchRooms, connectWebSocket]);

  // 9. Join room message logic on active room swap
  useEffect(() => {
    if (activeRoomId && socketRef.current && socketRef.current.readyState === WebSocket.OPEN && connectionState === 'connected') {
      setMessages([]);
      setMembers([]);
      setNotMemberError(null);
      
      socketRef.current.send(
        JSON.stringify({
          type: 'join-room',
          payload: { roomId: activeRoomId },
        })
      );
    }
  }, [activeRoomId, connectionState]);

  // Handle successful login/registration
  const handleAuthSuccess = (newToken: string, newUsername: string, newUserId: string) => {
    localStorage.setItem('token', newToken);
    localStorage.setItem('username', newUsername);
    localStorage.setItem('userId', newUserId);
    setToken(newToken);
    setUsername(newUsername);
    setUserId(newUserId);
  };

  // Send message over WebSocket
  const handleSendMessage = (content: string) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN && activeRoomId) {
      socketRef.current.send(
        JSON.stringify({
          type: 'send-message',
          payload: { content },
        })
      );
    }
  };

  // Render View
  if (!token || !username) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-950 p-4 relative overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-violet-600/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-600/10 rounded-full blur-[120px]" />
        <AuthCard onAuthSuccess={handleAuthSuccess} />
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen bg-slate-950 overflow-hidden text-slate-100 relative">
      <div className="absolute top-[20%] left-[10%] w-[30%] h-[30%] bg-violet-600/5 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[20%] right-[10%] w-[30%] h-[30%] bg-indigo-600/5 rounded-full blur-[100px] pointer-events-none" />

      <Sidebar
        username={username}
        rooms={rooms}
        activeRoomId={activeRoomId}
        onRoomSelect={setActiveRoomId}
        onCreateRoom={handleCreateRoom}
        onLogout={handleLogout}
        connectionState={connectionState}
      />

      {activeRoom ? (
        <ChatRoom
          key={activeRoom.id}
          room={activeRoom}
          messages={messages}
          currentUserId={userId || ''}
          onSendMessage={handleSendMessage}
          notMemberError={notMemberError}
          onJoinRoomSelf={handleJoinRoomSelf}
          members={members}
          onInviteMember={handleInviteMember}
          onKickMember={handleKickMember}
        />
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-slate-950/20">
          <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500 mb-4 animate-pulse">
            <MessageSquare className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-200">No Channel Selected</h3>
          <p className="text-sm text-slate-500 max-w-sm mt-2">
            Select a channel from the sidebar or create a new one to start chatting in real-time.
          </p>
        </div>
      )}
    </div>
  );
}