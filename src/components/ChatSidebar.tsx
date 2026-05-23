import React, { useCallback } from 'react';
import {
  Bot,
  Plus,
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  Clock,
  Loader2,
} from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../store';
import {
  toggleSidebar,
  setActiveSession,
  loadSessionHistory,
  prependSession,
} from '../store/chatSlice';

export const ChatSidebar: React.FC = () => {
  const dispatch = useAppDispatch();
  const { sessions, activeSessionId, sidebarOpen, loadingSessions, agentToken } =
    useAppSelector((s) => s.chat);

  const handleNewChat = useCallback(() => {
    const newId = crypto.randomUUID();
    dispatch(
      prependSession({
        session_id: newId,
        summary: null,
        total_turns: 0,
        created_at: new Date().toISOString(),
        updated_at: null,
      })
    );
    dispatch(setActiveSession(newId));
  }, [dispatch]);

  const handleSelectSession = useCallback(
    (sessionId: string) => {
      if (sessionId === activeSessionId) return;
      dispatch(setActiveSession(sessionId));
      if (agentToken) {
        dispatch(loadSessionHistory({ sessionId, token: agentToken }));
      }
    },
    [dispatch, activeSessionId, agentToken]
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
        {sidebarOpen && (
          <p className="px-4 py-1 text-[10px] uppercase tracking-widest font-bold text-slate-500 mb-1">
            Recent Chats
          </p>
        )}

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
          <ul className="space-y-0.5 px-2">
            {sessions.map((session) => {
              const isActive = session.session_id === activeSessionId;
              return (
                <li key={session.session_id}>
                  <button
                    title={session.summary ?? 'New conversation'}
                    onClick={() => handleSelectSession(session.session_id)}
                    className={`w-full text-left rounded-lg transition-all duration-150 cursor-pointer group ${
                      sidebarOpen ? 'px-3 py-2.5' : 'flex justify-center p-2.5'
                    } ${
                      isActive
                        ? 'bg-indigo-600/15 border border-indigo-500/25 text-indigo-200'
                        : 'hover:bg-slate-800/50 text-slate-400 hover:text-slate-200 border border-transparent'
                    }`}
                  >
                    {sidebarOpen ? (
                      <div className="flex flex-col gap-0.5 min-w-0">
                        <p className={`text-xs font-medium truncate ${isActive ? 'text-indigo-200' : 'text-slate-300 group-hover:text-slate-100'}`}>
                          {getSummarySnippet(session.summary)}
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
                        </div>
                      </div>
                    ) : (
                      <MessageSquare
                        className={`h-4.5 w-4.5 shrink-0 ${
                          isActive ? 'text-indigo-400' : 'text-slate-500 group-hover:text-slate-300'
                        }`}
                      />
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Footer: session count */}
      {sidebarOpen && sessions.length > 0 && (
        <div className="px-4 py-3 border-t border-slate-800/60 text-[10px] text-slate-500 shrink-0">
          {sessions.length} session{sessions.length !== 1 ? 's' : ''} total
        </div>
      )}
    </aside>
  );
};

export default ChatSidebar;
