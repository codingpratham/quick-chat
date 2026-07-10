import { useState, useEffect, useRef } from 'react';
import {
  Send,
  Users,
  UserPlus,
  Hash,
  Crown,
  UserMinus,
  MessageSquare,
  AlertCircle,
  Clock,
} from 'lucide-react';
import type { Room, Message, Member } from '../types';

interface ChatRoomProps {
  room: Room;
  messages: Message[];
  currentUserId: string;
  onSendMessage: (content: string) => void;
  notMemberError: string | null;
  onJoinRoomSelf: () => Promise<void>;
  members: Member[];
  onInviteMember: (username: string) => Promise<void>;
  onKickMember: (username: string) => Promise<void>;
}

export function ChatRoom({
  room,
  messages,
  currentUserId,
  onSendMessage,
  notMemberError,
  onJoinRoomSelf,
  members,
  onInviteMember,
  onKickMember,
}: ChatRoomProps) {
  const [inputText, setInputText] = useState('');
  const [showMembersPanel, setShowMembersPanel] = useState(true);
  const [inviteUsername, setInviteUsername] = useState('');
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    onSendMessage(inputText.trim());
    setInputText('');
  };

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteError(null);
    setInviteSuccess(null);

    if (!inviteUsername.trim()) return;

    setActionLoading(true);
    try {
      await onInviteMember(inviteUsername.trim());
      setInviteSuccess(`Successfully invited ${inviteUsername}`);
      setInviteUsername('');
      setTimeout(() => setInviteSuccess(null), 3000);
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error('Failed to invite user.');
      setInviteError(error.message || 'Failed to invite user.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleKick = async (username: string) => {
    if (!window.confirm(`Are you sure you want to kick ${username} from the channel?`)) {
      return;
    }
    try {
      await onKickMember(username);
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error('Failed to kick member.');
      alert(error.message || 'Failed to kick member.');
    }
  };

  const isOwner = room.userId === currentUserId;

  // Render Join Channel Screen if user is not a member
  if (notMemberError) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-slate-950/40 text-center animate-fade-in">
        <div className="max-w-md p-8 rounded-2xl glass-card border border-slate-800">
          <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center text-amber-400">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold text-slate-100 mb-2">Access Restricted</h3>
          <p className="text-sm text-slate-400 mb-6">
            You are not a member of <span className="font-semibold text-slate-200">#{room.roomName}</span>. 
            You must join this channel to read history and send messages.
          </p>
          <button
            onClick={onJoinRoomSelf}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-semibold text-sm transition-all duration-200 shadow-md shadow-violet-600/10 active:scale-[0.98] cursor-pointer"
          >
            Join Channel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex overflow-hidden bg-slate-950/20">
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Chat Header */}
        <div className="h-16 border-b border-slate-900 px-6 flex items-center justify-between shrink-0 glass">
          <div className="flex items-center gap-2 overflow-hidden">
            <Hash className="w-5 h-5 text-slate-500 shrink-0" />
            <span className="font-bold text-slate-200 truncate">{room.roomName}</span>
          </div>
          <button
            onClick={() => setShowMembersPanel(!showMembersPanel)}
            className={`p-2 rounded-xl transition-all cursor-pointer flex items-center gap-2 text-xs font-semibold ${
              showMembersPanel
                ? 'bg-violet-500/10 text-violet-400 border border-violet-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-transparent'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>{members.length} Members</span>
          </button>
        </div>

        {/* Messages List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8">
              <div className="w-12 h-12 rounded-full bg-slate-900 flex items-center justify-center text-slate-600 mb-3">
                <MessageSquare className="w-6 h-6" />
              </div>
              <span className="text-slate-400 font-semibold text-sm">Welcome to #{room.roomName}!</span>
              <span className="text-slate-600 text-xs mt-1">This is the start of this channel. Send a message to begin.</span>
            </div>
          ) : (
            messages.map((msg, index) => {
              const isMe = msg.senderId === currentUserId;
              
              // Handle System/Connection events
              const isSystemMessage = !msg.sender || !msg.senderId;
              if (isSystemMessage) {
                return (
                  <div key={msg.id || index} className="flex justify-center animate-slide-up">
                    <span className="text-xs bg-slate-900/60 border border-slate-800 text-slate-500 px-3 py-1.5 rounded-full">
                      {msg.content}
                    </span>
                  </div>
                );
              }

              const formattedTime = new Date(msg.sentAt).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              });

              return (
                <div
                  key={msg.id}
                  className={`flex gap-3 max-w-[85%] animate-slide-up ${isMe ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}
                >
                  {/* Avatar */}
                  {!isMe && (
                    <div className="w-8 h-8 rounded-full bg-indigo-500/10 border border-indigo-500/25 flex items-center justify-center text-xs font-bold text-indigo-300 capitalize shrink-0 self-end mb-1">
                      {msg.sender.username.charAt(0)}
                    </div>
                  )}
                  
                  {/* Bubble Container */}
                  <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                    {/* Sender Name (only if not me) */}
                    {!isMe && (
                      <span className="text-xs text-slate-400 font-medium ml-1 mb-1">
                        {msg.sender.username}
                      </span>
                    )}

                    {/* Speech Bubble */}
                    <div
                      className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed shadow-sm break-words max-w-full ${
                        isMe
                          ? 'bg-gradient-to-tr from-violet-600 to-indigo-600 text-white rounded-br-none'
                          : 'bg-slate-900 border border-slate-800 text-slate-200 rounded-bl-none'
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    </div>

                    {/* Timestamp */}
                    <span className="text-[10px] text-slate-500 mt-1 flex items-center gap-1">
                      <Clock className="w-2.5 h-2.5" />
                      {formattedTime}
                    </span>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <form onSubmit={handleSend} className="p-4 border-t border-slate-900 bg-slate-950/40 shrink-0">
          <div className="relative flex items-center">
            <input
              type="text"
              placeholder={`Message #${room.roomName}`}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              className="w-full pl-5 pr-14 py-3.5 rounded-2xl glass-input text-slate-200 placeholder-slate-500 outline-none text-sm"
            />
            <button
              type="submit"
              disabled={!inputText.trim()}
              className="absolute right-2.5 p-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white disabled:opacity-50 transition-all cursor-pointer active:scale-95"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>

      {/* Slide-in Right Sidebar for Members */}
      {showMembersPanel && (
        <div className="w-72 border-l border-slate-900 h-full flex flex-col glass shrink-0 animate-fade-in">
          {/* Header */}
          <div className="h-16 px-5 border-b border-slate-900 flex items-center gap-2 shrink-0">
            <Users className="w-4 h-4 text-slate-400" />
            <span className="font-bold text-sm text-slate-300">Channel Members</span>
          </div>

          {/* Invite Form */}
          <div className="p-4 border-b border-slate-900 bg-slate-900/10">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">
              Invite User
            </span>
            <form onSubmit={handleInviteSubmit} className="flex gap-2">
              <div className="relative flex-1">
                <UserPlus className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  placeholder="Username"
                  value={inviteUsername}
                  onChange={(e) => setInviteUsername(e.target.value)}
                  className="w-full pl-8 pr-2 py-1.5 rounded-lg glass-input text-xs text-slate-200 placeholder-slate-500 outline-none"
                  disabled={actionLoading}
                  required
                />
              </div>
              <button
                type="submit"
                disabled={actionLoading}
                className="px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold transition-all cursor-pointer"
              >
                Add
              </button>
            </form>
            {inviteError && (
              <span className="text-[10px] text-rose-400 block mt-2">{inviteError}</span>
            )}
            {inviteSuccess && (
              <span className="text-[10px] text-emerald-400 block mt-2">{inviteSuccess}</span>
            )}
          </div>

          {/* Members List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-1">
            {/* Owner Details */}
            <div className="px-2 py-1 mb-1">
              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                Creator {members.find((m) => m.userId === room.userId)?.user.username && `(${members.find((m) => m.userId === room.userId)?.user.username})`}
              </span>
            </div>

            {/* Room Owner */}
            {members
              .filter((m) => m.userId === room.userId)
              .map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between px-3 py-2 rounded-xl bg-violet-950/10 border border-violet-850/10"
                >
                  <div className="flex items-center gap-2 overflow-hidden">
                    <div className="w-6 h-6 rounded-full bg-violet-500/20 border border-violet-500/30 flex items-center justify-center font-bold text-[10px] text-violet-300 capitalize shrink-0">
                      {member.user.username.charAt(0)}
                    </div>
                    <span className="text-xs font-semibold text-slate-200 truncate">
                      {member.user.username}
                    </span>
                  </div>
                  <span title="Creator">
                    <Crown className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  </span>
                </div>
              ))}

            {/* Other Members */}
            <div className="px-2 py-1 mt-4 mb-1">
              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                Members ({members.filter((m) => m.userId !== room.userId).length})
              </span>
            </div>

            {members.filter((m) => m.userId !== room.userId).length === 0 ? (
              <span className="text-xs text-slate-600 block px-2 py-1">No other members yet.</span>
            ) : (
              members
                .filter((m) => m.userId !== room.userId)
                .map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between px-3 py-2 rounded-xl hover:bg-slate-900/40 group transition-all"
                  >
                    <div className="flex items-center gap-2 overflow-hidden">
                      <div className="w-6 h-6 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-[10px] text-slate-400 capitalize shrink-0">
                        {member.user.username.charAt(0)}
                      </div>
                      <span className="text-xs text-slate-300 truncate">
                        {member.user.username}
                      </span>
                    </div>

                    {/* Show Kick button if I am the owner */}
                    {isOwner && (
                      <button
                        onClick={() => handleKick(member.user.username)}
                        className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded transition-all cursor-pointer"
                        title={`Kick ${member.user.username}`}
                      >
                        <UserMinus className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
