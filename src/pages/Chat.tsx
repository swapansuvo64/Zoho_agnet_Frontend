import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { 
  LogOut, 
  User as UserIcon, 
  Layers, 
  Send, 
  Bot, 
  Terminal, 
  Sparkles,
  CheckCircle,
  Clock,
  Briefcase
} from 'lucide-react';

interface Message {
  id: number;
  sender: 'user' | 'agent';
  text: string;
  time: string;
}

export const Chat: React.FC = () => {
  const { user, logout } = useAuth();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      sender: 'agent',
      text: `Hello ${user?.name || 'Agent'}! I've successfully connected to your Zoho Portal (ID: ${user?.portal_id || 'N/A'}) using your encrypted Zoho API credentials. How can I assist you with your projects today?`,
      time: '12:00 PM'
    }
  ]);
  const [inputText, setInputText] = useState('');

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const userMsg: Message = {
      id: Date.now(),
      sender: 'user',
      text: inputText,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setInputText('');

    // Simulate Agent Reply
    setTimeout(() => {
      const agentMsg: Message = {
        id: Date.now() + 1,
        sender: 'agent',
        text: `I'm analyzing your request: "${inputText}". As an AI agent with access to your Zoho tasks, I can fetch task lists, update statuses, or log hours. Which task should I query?`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, agentMsg]);
    }, 1000);
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (e) {
      console.error("Logout failed:", e);
    }
  };

  return (
    <div className="flex h-screen w-screen bg-[#070b13] text-slate-100 overflow-hidden">
      {/* 1. Left Sidebar: User Details & Navigation */}
      <aside className="w-80 border-r border-slate-800 bg-[#0c1220] p-6 flex flex-col justify-between shrink-0">
        <div>
          {/* Brand header */}
          <div className="flex items-center gap-2 mb-8">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 shadow-lg shadow-indigo-600/30">
              <Bot className="h-5 w-5 text-white" />
            </div>
            <span className="font-bold text-lg tracking-tight bg-linear-to-r from-indigo-200 to-indigo-400 bg-clip-text text-transparent">
              ZohoAgent Workspace
            </span>
          </div>

          {/* User Profile Summary */}
          <div className="mb-6 rounded-xl border border-slate-800/80 bg-slate-900/40 p-4 backdrop-blur-md">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-500/10 text-indigo-400 ring-1 ring-indigo-500/20">
                <UserIcon className="h-5 w-5" />
              </div>
              <div className="overflow-hidden">
                <p className="font-semibold text-sm truncate text-slate-200">{user?.name}</p>
                <p className="text-xs text-slate-400 truncate">{user?.email}</p>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800 text-xs text-slate-400 space-y-2">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5"><Layers className="h-3.5 w-3.5 text-indigo-400" /> Portal ID:</span>
                <code className="bg-slate-950 px-1.5 py-0.5 rounded text-indigo-300 font-semibold">{user?.portal_id}</code>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5"><Terminal className="h-3.5 w-3.5 text-indigo-400" /> Status:</span>
                <span className="flex items-center gap-1 text-emerald-400 font-semibold">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                  Active
                </span>
              </div>
            </div>
          </div>

          {/* Nav Items */}
          <nav className="space-y-1.5">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block mb-2 px-2">Integrations</span>
            <div className="flex items-center gap-2.5 rounded-lg bg-indigo-600/10 border border-indigo-500/20 px-3 py-2 text-sm text-indigo-300 font-medium">
              <Briefcase className="h-4.5 w-4.5" />
              <span>Zoho Projects API</span>
            </div>
          </nav>
        </div>

        {/* Logout Button */}
        <div>
          <button
            onClick={handleLogout}
            id="logout-btn"
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-red-500/30 hover:bg-red-950/10 hover:text-red-400 px-4 py-2.5 text-sm font-semibold text-slate-300 transition-all duration-200 cursor-pointer"
          >
            <LogOut className="h-4 w-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* 2. Main Chat / Workspace Panel */}
      <main className="flex-1 flex flex-col bg-[#070b13]">
        {/* Top Header Bar */}
        <header className="h-16 border-b border-slate-800 bg-[#070b13]/80 backdrop-blur-md px-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4.5 w-4.5 text-indigo-400" />
            <h2 className="text-sm font-bold tracking-wide text-slate-200 uppercase">Agent Session</h2>
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-400">
            <span className="flex items-center gap-1"><CheckCircle className="h-3.5 w-3.5 text-emerald-500" /> API Connected</span>
            <span className="h-4 w-px bg-slate-800"></span>
            <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5 text-indigo-400" /> Sliding Token Active</span>
          </div>
        </header>

        {/* Message Thread */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-xl rounded-2xl p-4 shadow-md ${
                  msg.sender === 'user'
                    ? 'bg-linear-to-tr from-indigo-600 to-indigo-700 text-white rounded-tr-none'
                    : 'bg-slate-900/60 border border-slate-800/80 text-slate-200 rounded-tl-none'
                }`}
              >
                <div className="flex items-center gap-1.5 mb-1.5 text-[10px] font-semibold tracking-wider uppercase text-slate-400">
                  {msg.sender === 'agent' && <Bot className="h-3.5 w-3.5 text-indigo-400" />}
                  <span>{msg.sender === 'agent' ? 'AI Agent' : 'You'}</span>
                  <span>•</span>
                  <span>{msg.time}</span>
                </div>
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.text}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Input Bar */}
        <div className="p-6 bg-linear-to-t from-[#070b13] via-[#070b13] to-transparent shrink-0">
          <form onSubmit={handleSend} className="relative">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Ask the agent to create tasks, list bugs, or search users..."
              className="w-full rounded-xl bg-slate-900/80 border border-slate-800/80 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 pl-4 pr-12 py-3.5 text-sm text-slate-200 placeholder-slate-500 shadow-inner outline-none transition-all duration-200"
            />
            <button
              type="submit"
              className="absolute right-2.5 top-2.5 flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-all active:scale-95 cursor-pointer shadow-md"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      </main>
    </div>
  );
};
export default Chat;
