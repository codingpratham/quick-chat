import { useState } from 'react';
import { LogOut, Plus, Search, MessageSquare, Hash } from 'lucide-react';
import type { Room } from '../types';

interface SidebarProps {
  username: string;
  rooms: Room[];
  activeRoomId: string | null;
  onRoomSelect: (roomId: string) => void;
  onCreateRoom: (roomName: string) => Promise<void>;
  onLogout: () => void;
  connectionState: 'connecting' | 'connected' | 'disconnected';
}

export function Sidebar({
  username,
  rooms,
  activeRoomId,
  onRoomSelect,
  onCreateRoom,
  onLogout,
  connectionState,
}: SidebarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [createError, setCreateError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleCreateRoomSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);
    if (!newRoomName.trim()) {
      setCreateError('Room name cannot be empty.');
      return;
    }

    setLoading(true);
    try {
      await onCreateRoom(newRoomName.trim());
      setNewRoomName('');
      setShowCreateModal(false);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setCreateError(err.message || 'Failed to create room.');
      } else {
        setCreateError('Failed to create room.');
      }
    } finally {
      setLoading(false);
    }
  };

  const filteredRooms = rooms.filter((room) =>
    room.roomName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="w-80 h-full glass border-r border-slate-800 flex flex-col shrink-0">
      {/* App Header / Brand */}
      <div className="p-5 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-500 flex items-center justify-center">
            <MessageSquare className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-lg bg-clip-text text-transparent bg-gradient-to-r from-violet-200 to-indigo-100">
            Quick-chat
          </span>
        </div>
        
        {/* Connection State Badge */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-900 border border-slate-800">
          <span
            className={`w-2 h-2 rounded-full ${
              connectionState === 'connected'
                ? 'bg-emerald-500 shadow-md shadow-emerald-500/50'
                : connectionState === 'connecting'
                ? 'bg-amber-500 animate-pulse'
                : 'bg-rose-500'
            }`}
          />
          <span className="text-slate-400 capitalize text-[10px]">
            {connectionState}
          </span>
        </div>
      </div>

      {/* User profile section */}
      <div className="p-4 mx-3 my-3 rounded-xl bg-slate-900/60 border border-slate-800/80 flex items-center justify-between">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="w-10 h-10 rounded-full bg-violet-600/20 border border-violet-500/30 flex items-center justify-center font-bold text-violet-300 capitalize shrink-0">
            {username.charAt(0)}
          </div>
          <div className="flex flex-col overflow-hidden">
            <span className="text-sm font-semibold text-slate-200 truncate">{username}</span>
            <span className="text-xs text-slate-500 truncate">Authenticated</span>
          </div>
        </div>
        <button
          onClick={onLogout}
          title="Sign Out"
          className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>

      {/* Search Bar */}
      <div className="px-4 mb-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search channels..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl glass-input text-slate-200 placeholder-slate-500 outline-none text-xs"
          />
        </div>
      </div>

      {/* Rooms Section Header */}
      <div className="px-4 py-2 flex items-center justify-between text-slate-400">
        <span className="text-xs font-bold uppercase tracking-wider">Channels</span>
        <button
          onClick={() => setShowCreateModal(true)}
          className="p-1 text-slate-400 hover:text-violet-400 hover:bg-violet-500/10 rounded-md transition-all cursor-pointer"
          title="Create New Channel"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Rooms List */}
      <div className="flex-1 overflow-y-auto px-2 space-y-1 py-1">
        {filteredRooms.length === 0 ? (
          <div className="p-4 text-center text-xs text-slate-500">
            No channels found.
          </div>
        ) : (
          filteredRooms.map((room) => {
            const isActive = room.id === activeRoomId;
            return (
              <button
                key={room.id}
                onClick={() => onRoomSelect(room.id)}
                className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-left transition-all cursor-pointer group ${
                  isActive
                    ? 'bg-violet-600/20 text-violet-200 border-l-4 border-violet-500 font-medium'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/40 border-l-4 border-transparent'
                }`}
              >
                <Hash className={`w-4 h-4 ${isActive ? 'text-violet-400' : 'text-slate-500 group-hover:text-slate-400'}`} />
                <span className="text-sm truncate flex-1">{room.roomName}</span>
              </button>
            );
          })
        )}
      </div>

      {/* Create Room Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm p-6 rounded-2xl glass-card border border-slate-800 animate-scale-up">
            <h3 className="text-lg font-bold text-slate-100 mb-2">Create New Channel</h3>
            <p className="text-xs text-slate-400 mb-4">
              Channel names must be unique. Let's build a new space for conversations.
            </p>
            <form onSubmit={handleCreateRoomSubmit} className="space-y-4">
              <div>
                <input
                  type="text"
                  placeholder="e.g. engineering"
                  value={newRoomName}
                  onChange={(e) => setNewRoomName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl glass-input text-slate-200 placeholder-slate-500 outline-none text-sm"
                  required
                  autoFocus
                  disabled={loading}
                />
              </div>

              {createError && (
                <div className="text-rose-400 text-xs py-1">
                  {createError}
                </div>
              )}

              <div className="flex gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setCreateError(null);
                    setNewRoomName('');
                  }}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-900 text-xs font-semibold cursor-pointer"
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 active:scale-[0.98] text-white text-xs font-semibold transition-all cursor-pointer disabled:opacity-50"
                  disabled={loading}
                >
                  {loading ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
