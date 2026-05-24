import React, { useCallback, useState } from 'react';
import {
  Bot,
  Plus,
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  Clock,
  Loader2,
  Bookmark,
  BookmarkCheck,
  Trash2,
} from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../store';
import {
  toggleSidebar,
  setActiveSession,
  loadSessionHistory,
  prependSession,
  deleteSessionThunk,
  toggleSaveSessionThunk,
  loadSessions,
} from '../store/chatSlice';

export const ChatSidebar: React.FC<{ onBeforeSessionChange?: () => void }> = ({ onBeforeSessionChange }) => {
  const dispatch = useAppDispatch();
  const {
    sessions,
    activeSessionId,
    messages,
    sidebarOpen,
    loadingSessions,
    agentToken,
    deletingSessionId,
    togglingSessionId,
  } = useAppSelector((s) => s.chat);

  // Track which session row is hovered so we can show action icons
  const [hoveredSessionId, setHoveredSessionId] = useState<string | null>(null);
  // Confirm-delete state: show a mini confirmation before actually deleting
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const handleNewChat = useCallback(() => {
    // If the active session is already a fresh empty session (no messages in history/current stream), just stay in it!
    if (activeSessionId) {
      const activeSession = sessions.find((s) => s.session_id === activeSessionId);
      if (activeSession && activeSession.total_turns === 0 && messages.length === 0) {
        return; // Already in a new empty chat session
      }
    }

    onBeforeSessionChange?.();
    const newId = crypto.randomUUID();
    dispatch(
      prependSession({
        session_id: newId,
        summary: null,
        total_turns: 0,
        created_at: new Date().toISOString(),
        updated_at: null,
        is_saved: false,
      })
    );
    dispatch(setActiveSession(newId));

    if (agentToken) {
      // Soft reload after a short delay to allow backend to persist the old session and generate its summary
      setTimeout(() => {
        dispatch(loadSessions({ token: agentToken, soft: true }));
      }, 800);
      setTimeout(() => {
        dispatch(loadSessions({ token: agentToken, soft: true }));
      }, 2500);
    }
  }, [dispatch, agentToken, activeSessionId, sessions, messages.length, onBeforeSessionChange]);

  const handleSelectSession = useCallback(
    (sessionId: string) => {
      if (sessionId === activeSessionId) return;
      onBeforeSessionChange?.();
      dispatch(setActiveSession(sessionId));
      if (agentToken) {
        dispatch(loadSessionHistory({ sessionId, token: agentToken }));
        
        // Soft reload sessions list after a short delay so the old session's summary updates in the sidebar
        setTimeout(() => {
          dispatch(loadSessions({ token: agentToken, soft: true }));
        }, 800);
        setTimeout(() => {
          dispatch(loadSessions({ token: agentToken, soft: true }));
        }, 2500);
      }
    },
    [dispatch, activeSessionId, agentToken, onBeforeSessionChange]
  );

  const handleDelete = useCallback(
    (e: React.MouseEvent, sessionId: string) => {
      e.stopPropagation();
      if (!agentToken) return;
      if (confirmDeleteId === sessionId) {
        // Second click — actually delete
        dispatch(deleteSessionThunk({ sessionId, token: agentToken }));
        setConfirmDeleteId(null);
        setHoveredSessionId(null);
      } else {
        // First click — ask for confirmation
        setConfirmDeleteId(sessionId);
      }
    },
    [dispatch, agentToken, confirmDeleteId]
  );

  const handleSave = useCallback(
    (e: React.MouseEvent, sessionId: string) => {
      e.stopPropagation();
      if (!agentToken) return;
      dispatch(toggleSaveSessionThunk({ sessionId, token: agentToken }));
    },
    [dispatch, agentToken]
  );

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const days = Math.floor(diff / 86400000);
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    return d.toLocaleDateString();
  };

  const getSummarySnippet = (summary: string | null): string => {
    if (!summary) return 'New conversation';
    return summary.length > 56 ? summary.slice(0, 56) + '…' : summary;
  };

  // Separate saved vs. unsaved sessions for display sections
  const savedSessions = sessions.filter((s) => s.is_saved);
  const recentSessions = sessions.filter((s) => !s.is_saved);

  const renderSession = (session: (typeof sessions)[number]) => {
    const isActive = session.session_id === activeSessionId;
    const isDeleting = deletingSessionId === session.session_id;
    const isToggling = togglingSessionId === session.session_id;
    const isHovered = hoveredSessionId === session.session_id;
    const isConfirmingDelete = confirmDeleteId === session.session_id;

    return (
      <li key={session.session_id}>
        <div
          className={`relative rounded-lg transition-all duration-150 cursor-pointer group select-none ${
            sidebarOpen ? 'px-3 py-2.5' : 'flex justify-center p-2.5'
          } ${
            isActive
              ? 'bg-indigo-600/15 border border-indigo-500/25 text-indigo-200'
              : 'hover:bg-slate-800/50 text-slate-400 hover:text-slate-200 border border-transparent'
          } ${isDeleting ? 'opacity-40 pointer-events-none' : ''}`}
          title={session.summary ?? 'New conversation'}
          onClick={() => handleSelectSession(session.session_id)}
          onMouseEnter={() => { setHoveredSessionId(session.session_id); setConfirmDeleteId(null); }}
          onMouseLeave={() => { setHoveredSessionId(null); setConfirmDeleteId(null); }}
        >
          {sidebarOpen ? (
            <div className="flex items-start gap-2 min-w-0">
              {/* Session text */}
              <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                <p className={`text-xs font-medium truncate ${isActive ? 'text-indigo-200' : 'text-slate-300 group-hover:text-slate-100'}`}>
                  {isDeleting ? (
                    <span className="text-rose-400 italic">Deleting…</span>
                  ) : (
                    getSummarySnippet(session.summary)
                  )}
                </p>
                <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                  <Clock className="h-2.5 w-2.5 shrink-0" />
                  <span>{formatDate(session.created_at)}</span>
                  {session.total_turns > 0 && (
                    <>
                      <span>·</span>
                      <span>{session.total_turns} turns</span>
                    </>
                  )}
                  {session.is_saved && (
                    <>
                      <span>·</span>
                      <span className="text-amber-400/80 font-semibold">Saved</span>
                    </>
                  )}
                </div>
              </div>

              {/* Action icons — visible on hover */}
              {isHovered && !isDeleting && (
                <div
                  className="flex items-center gap-0.5 shrink-0 mt-0.5"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Save / Unsave */}
                  <button
                    title={session.is_saved ? 'Unsave chat' : 'Save chat'}
                    onClick={(e) => handleSave(e, session.session_id)}
                    disabled={isToggling}
                    className={`p-1 rounded-md transition-all cursor-pointer ${
                      session.is_saved
                        ? 'text-amber-400 hover:text-amber-300 hover:bg-amber-500/10'
                        : 'text-slate-500 hover:text-amber-300 hover:bg-amber-500/10'
                    } ${isToggling ? 'opacity-50 pointer-events-none' : ''}`}
                  >
                    {isToggling ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : session.is_saved ? (
                      <BookmarkCheck className="h-3.5 w-3.5" />
                    ) : (
                      <Bookmark className="h-3.5 w-3.5" />
                    )}
                  </button>

                  {/* Delete */}
                  {isConfirmingDelete ? (
                    <button
                      title="Confirm delete"
                      onClick={(e) => handleDelete(e, session.session_id)}
                      className="px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-rose-600 hover:bg-rose-500 text-white transition-all cursor-pointer"
                    >
                      Sure?
                    </button>
                  ) : (
                    <button
                      title="Delete chat"
                      onClick={(e) => handleDelete(e, session.session_id)}
                      className="p-1 rounded-md text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-all cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              )}
            </div>
          ) : (
            <MessageSquare
              className={`h-4.5 w-4.5 shrink-0 ${
                isActive ? 'text-indigo-400' : 'text-slate-500 group-hover:text-slate-300'
              }`}
            />
          )}
        </div>
      </li>
    );
  };

  return (
    <aside
      className={`relative flex flex-col shrink-0 h-screen border-r border-slate-800 bg-[#0c1220] transition-all duration-300 ease-in-out ${
        sidebarOpen ? 'w-72' : 'w-16'
      }`}
    >
      {/* Collapse toggle */}
      <button
        onClick={() => dispatch(toggleSidebar())}
        title={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
        className="absolute -right-3 top-20 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-slate-800 border border-slate-700 text-slate-400 hover:text-indigo-400 hover:border-indigo-500/40 transition-all shadow-md cursor-pointer"
      >
        {sidebarOpen ? <ChevronLeft className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
      </button>

      {/* Header */}
      <div className={`flex items-center gap-2.5 p-4 h-16 shrink-0 border-b border-slate-800/60 ${!sidebarOpen && 'justify-center'}`}>
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-600 shadow-md shadow-indigo-600/30">
          <Bot className="h-4.5 w-4.5 text-white" />
        </div>
        {sidebarOpen && (
          <span className="font-bold text-sm tracking-tight bg-linear-to-r from-indigo-200 to-indigo-400 bg-clip-text text-transparent leading-tight">
            ZohoAgent
          </span>
        )}
      </div>

      {/* New Chat Button */}
      <div className={`p-3 shrink-0 ${!sidebarOpen && 'flex justify-center'}`}>
        <button
          id="new-chat-btn"
          onClick={handleNewChat}
          title="New Chat"
          className={`flex items-center gap-2 rounded-xl bg-indigo-600/10 border border-indigo-500/20 hover:bg-indigo-600/20 hover:border-indigo-500/40 text-indigo-300 hover:text-indigo-200 transition-all duration-200 cursor-pointer ${
            sidebarOpen ? 'w-full px-3 py-2.5 text-sm font-medium' : 'h-10 w-10 justify-center'
          }`}
        >
          <Plus className="h-4 w-4 shrink-0" />
          {sidebarOpen && <span>New Chat</span>}
        </button>
      </div>

      {/* Session List */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden py-1 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
        {loadingSessions ? (
          <div className={`flex ${sidebarOpen ? 'items-center gap-2 px-4' : 'justify-center'} py-4`}>
            <Loader2 className="h-4 w-4 text-indigo-400 animate-spin" />
            {sidebarOpen && <span className="text-xs text-slate-400">Loading…</span>}
          </div>
        ) : sessions.length === 0 ? (
          sidebarOpen ? (
            <div className="px-4 py-6 text-center">
              <MessageSquare className="h-8 w-8 text-slate-700 mx-auto mb-2" />
              <p className="text-xs text-slate-500">No past chats yet.</p>
              <p className="text-xs text-slate-600">Start a new conversation!</p>
            </div>
          ) : null
        ) : (
          <>
            {/* Saved Chats Section */}
            {sidebarOpen && savedSessions.length > 0 && (
              <>
                <p className="px-4 pt-2 pb-1 text-[10px] uppercase tracking-widest font-bold text-amber-500/70 flex items-center gap-1.5">
                  <BookmarkCheck className="h-3 w-3" />
                  Saved
                </p>
                <ul className="space-y-0.5 px-2 mb-1">
                  {savedSessions.map(renderSession)}
                </ul>
              </>
            )}

            {/* Recent Chats Section */}
            {sidebarOpen && recentSessions.length > 0 && (
              <p className="px-4 pt-2 pb-1 text-[10px] uppercase tracking-widest font-bold text-slate-500">
                Recent Chats
              </p>
            )}
            <ul className="space-y-0.5 px-2">
              {(sidebarOpen ? recentSessions : [...savedSessions, ...recentSessions]).map(renderSession)}
            </ul>
          </>
        )}
      </div>

      {/* Footer */}
      {sidebarOpen && sessions.length > 0 && (
        <div className="px-4 py-3 border-t border-slate-800/60 text-[10px] text-slate-500 shrink-0 flex items-center gap-3">
          <span>{sessions.length} session{sessions.length !== 1 ? 's' : ''}</span>
          {savedSessions.length > 0 && (
            <>
              <span>·</span>
              <span className="text-amber-400/70">{savedSessions.length} saved</span>
            </>
          )}
        </div>
      )}
    </aside>
  );
};

export default ChatSidebar;
