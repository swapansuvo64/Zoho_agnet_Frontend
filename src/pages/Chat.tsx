import React, { useEffect, useRef, useState } from 'react';
import { LogOut, User as UserIcon, Layers, Terminal } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useAppDispatch, useAppSelector } from '../store';
import { loadSessions, setAgentToken, setActiveSession, loadSessionHistory, prependSession } from '../store/chatSlice';
import { fetchAccessToken } from '../api/agent';
import ChatSidebar from '../components/ChatSidebar';
import ChatWindow, { type ChatWindowHandle } from '../components/ChatWindow';
import ZohoDetailPopup from '../components/ZohoDetailPopup';

export const Chat: React.FC = () => {
  const dispatch = useAppDispatch();
  const { user, logout } = useAuth();
  const { agentToken } = useAppSelector((state) => state.chat);
  
  // Ref to ChatWindow so we can call closeWebSocket() before switching sessions
  const chatWindowRef = useRef<ChatWindowHandle>(null);

  const [activePopup, setActivePopup] = useState<{ type: 'project' | 'task' | 'member'; projectId: string; taskId?: string } | null>(null);

  useEffect(() => {
    const handleOpenPopup = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      setActivePopup(detail);
    };
    window.addEventListener('open-zoho-popup', handleOpenPopup);
    return () => {
      window.removeEventListener('open-zoho-popup', handleOpenPopup);
    };
  }, []);


  useEffect(() => {
    // Fetch raw JWT token from auth-service (needed for agent WS + API calls)
    const init = async () => {
      try {
        const token = await fetchAccessToken();
        dispatch(setAgentToken(token));
        
        // Load existing sessions
        const sessionsResult = await dispatch(loadSessions(token)).unwrap();
        
        if (sessionsResult && sessionsResult.length > 0) {
          // Automatically select and load the most recent session
          const mostRecentId = sessionsResult[0].session_id;
          dispatch(setActiveSession(mostRecentId));
          dispatch(loadSessionHistory({ sessionId: mostRecentId, token }));
        } else {
          // If no past sessions exist, automatically initialize a fresh new chat session
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
        }
      } catch (err) {
        console.error('Failed to initialize agent session:', err);
      }
    };
    init();
  }, [dispatch]);

  const handleLogout = async () => {
    try { await logout(); } catch (e) { console.error('Logout failed:', e); }
  };

  return (
    <div className="flex h-screen w-screen bg-[#070b13] text-slate-100 overflow-hidden">
      {/* ── Collapsable History Sidebar ───────────────────────── */}
      <ChatSidebar onBeforeSessionChange={() => chatWindowRef.current?.closeWebSocket()} />

      {/* ── Right Section: User Panel (only when expanded) + Chat ── */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Thin top bar with user info */}
        <div className="h-16 shrink-0 border-b border-slate-800 bg-[#0c1220]/60 backdrop-blur-md px-5 flex items-center justify-between">
          {/* User info */}
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-500/10 text-indigo-400 ring-1 ring-indigo-500/20">
              <UserIcon className="h-4 w-4" />
            </div>
            <div className="hidden sm:block">
              <p className="text-xs font-semibold text-slate-200 leading-none">{user?.name}</p>
              <p className="text-[10px] text-slate-500 mt-0.5">{user?.email}</p>
            </div>
            <div className="hidden md:flex items-center gap-3 ml-4 text-[10px] text-slate-500">
              <span className="flex items-center gap-1">
                <Layers className="h-3 w-3 text-indigo-400" />
                Portal: <code className="ml-1 text-indigo-300 font-semibold">{user?.portal_id}</code>
              </span>
              <span className="h-3 w-px bg-slate-800" />
              <span className="flex items-center gap-1">
                <Terminal className="h-3 w-3 text-indigo-400" />
                <span className="flex items-center gap-1 text-emerald-400 font-semibold">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Active
                </span>
              </span>
            </div>
          </div>

          {/* Logout */}
          <button
            onClick={handleLogout}
            id="logout-btn"
            className="flex items-center gap-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-red-500/30 hover:bg-red-950/10 hover:text-red-400 px-3 py-1.5 text-xs font-semibold text-slate-400 transition-all duration-200 cursor-pointer"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        </div>

        {/* ── Chat Area ─────────────────────────────────────────── */}
        <div className="flex flex-1 min-h-0">
          <ChatWindow ref={chatWindowRef} />
        </div>

        {/* ── Interactive Detail Popup ──────────────────────────── */}
        {activePopup && agentToken && (
          <ZohoDetailPopup
            type={activePopup.type}
            projectId={activePopup.projectId}
            taskId={activePopup.taskId}
            token={agentToken}
            onClose={() => setActivePopup(null)}
          />
        )}
      </div>
    </div>
  );
};

export default Chat;
