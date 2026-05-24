import React, { useEffect, useRef, useCallback, useState, startTransition, forwardRef, useImperativeHandle } from 'react';
import {
  Send,
  Sparkles,
  CheckCircle,
  Wifi,
  WifiOff,
  Loader2,
  Bot,
  Plus,
} from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../store';
import {
  addMessage,
  appendStreamChunk,
  commitStreamedMessage,
  clearStreamingText,
  closeCurrentSession,
  prependSession,
  setActiveSession,
} from '../store/chatSlice';
import { createAgentWebSocket } from '../api/agent';
import MessageBubble from './MessageBubble';

type WsStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

export interface ChatWindowHandle {
  /** Cleanly close the active WebSocket connection (call before switching sessions). */
  closeWebSocket: () => void;
}

export const ChatWindow = forwardRef<ChatWindowHandle, object>((_props, ref) => {
  const dispatch = useAppDispatch();
  const {
    messages,
    activeSessionId,
    streamingText,
    isStreaming,
    loadingHistory,
    agentToken,
  } = useAppSelector((s) => s.chat);

  const wsRef = useRef<WebSocket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [input, setInput] = useState('');
  const [wsStatus, setWsStatus] = useState<WsStatus>('disconnected');
  const [isThinking, setIsThinking] = useState(false);

  // Expose an imperative handle so the sidebar/header can trigger a clean WS close
  useImperativeHandle(ref, () => ({
    closeWebSocket: () => {
      if (wsRef.current && wsRef.current.readyState < WebSocket.CLOSING) {
        wsRef.current.close(1000, 'Session switched by user');
      }
      dispatch(closeCurrentSession());
    },
  }));

  // Auto-scroll to bottom using ResizeObserver on the messages wrapper
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const innerWrapper = container.firstElementChild;
    if (!innerWrapper) return;

    const observer = new ResizeObserver(() => {
      const distanceFromBottom =
        container.scrollHeight - container.scrollTop - container.clientHeight;
      // Auto-scroll if user is close to the bottom (within 150px) to follow the stream
      if (distanceFromBottom < 150) {
        container.scrollTop = container.scrollHeight;
      }
    });

    observer.observe(innerWrapper);

    return () => {
      observer.disconnect();
    };
  }, []);

  // Force instant scroll to bottom when a new message is posted/added
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  }, [messages.length]);
  useEffect(() => {
    if (!activeSessionId || !agentToken) return;

    // Close any existing connection and flush in-flight state before opening a new one
    if (wsRef.current && wsRef.current.readyState < WebSocket.CLOSING) {
      wsRef.current.close(1000, 'Session changed');
    }
    dispatch(closeCurrentSession());

    startTransition(() => setWsStatus('connecting'));
    dispatch(clearStreamingText());

    const ws = createAgentWebSocket(activeSessionId, agentToken);
    wsRef.current = ws;

    ws.onopen = () => {
      setWsStatus('connected');
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data as string);
        if (data.type === 'start') {
          // Backend acknowledged; first chunk is imminent – keep thinking indicator up
          setIsThinking(true);
        } else if (data.type === 'chunk' && typeof data.text === 'string') {
          setIsThinking(false); // first real content arrived → hide thinking
          dispatch(appendStreamChunk(data.text));
        } else if (data.type === 'done') {
          setIsThinking(false);
          dispatch(commitStreamedMessage());
        } else if (data.type === 'error') {
          setIsThinking(false);
          dispatch(clearStreamingText());
          dispatch(
            addMessage({
              id: `err-${Date.now()}`,
              role: 'assistant',
              text: `⚠️ Agent error: ${data.text ?? 'Unknown error'}`,
              timestamp: new Date().toISOString(),
            })
          );
        }
      } catch {
        // Treat raw text as a chunk (backward compat)
        setIsThinking(false);
        dispatch(appendStreamChunk(event.data as string));
      }
    };

    ws.onerror = () => {
      setIsThinking(false);
      setWsStatus('error');
      dispatch(clearStreamingText());
    };

    ws.onclose = (ev) => {
      setIsThinking(false);
      if (ev.code !== 1000) {
        setWsStatus('error');
      } else {
        setWsStatus('disconnected');
      }
      dispatch(clearStreamingText());
    };

    return () => {
      ws.close(1000, 'Component cleanup');
    };
  }, [activeSessionId, agentToken, dispatch]);

  const handleSend = useCallback(() => {
    const text = input.trim();
    if (!text || isStreaming || isThinking || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

    // Optimistically add user message to UI
    dispatch(
      addMessage({
        id: `user-${Date.now()}`,
        role: 'user',
        text,
        timestamp: new Date().toISOString(),
      })
    );

    // Show thinking indicator immediately while waiting for the first chunk
    setIsThinking(true);

    // Send to WebSocket
    wsRef.current.send(text);
    setInput('');

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  }, [input, isStreaming, isThinking, dispatch]);

  const handleActionConfirm = useCallback((action: 'yes' | 'no') => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    const text = action === 'yes' ? 'Yes' : 'No';
    
    // Add user message to UI
    dispatch(
      addMessage({
        id: `user-${Date.now()}`,
        role: 'user',
        text,
        timestamp: new Date().toISOString(),
      })
    );
    
    setIsThinking(true);
    wsRef.current.send(text);
  }, [dispatch]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    // Auto-grow textarea
    e.target.style.height = 'auto';
    e.target.style.height = `${Math.min(e.target.scrollHeight, 160)}px`;
  };

  const statusConfig: Record<WsStatus, { icon: React.ReactNode; label: string; color: string }> = {
    connecting: {
      icon: <Loader2 className="h-3 w-3 animate-spin" />,
      label: 'Connecting…',
      color: 'text-amber-400',
    },
    connected: {
      icon: <Wifi className="h-3 w-3" />,
      label: 'Agent Connected',
      color: 'text-emerald-400',
    },
    disconnected: {
      icon: <WifiOff className="h-3 w-3" />,
      label: 'Disconnected',
      color: 'text-slate-500',
    },
    error: {
      icon: <WifiOff className="h-3 w-3" />,
      label: 'Connection Error',
      color: 'text-red-400',
    },
  };

  const status = activeSessionId
    ? statusConfig[wsStatus]
    : {
        icon: <WifiOff className="h-3 w-3" />,
        label: 'No Active Session',
        color: 'text-slate-500',
      };

  const isInputDisabled =
    isStreaming ||
    isThinking ||
    !activeSessionId ||
    wsStatus !== 'connected';

  return (
    <main className="flex-1 flex flex-col min-w-0 bg-[#070b13]">
      {/* Header */}
      <header className="h-16 shrink-0 border-b border-slate-800 bg-[#070b13]/90 backdrop-blur-md px-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-indigo-400" />
          <h2 className="text-sm font-bold tracking-wide text-slate-200 uppercase">
            {activeSessionId ? (
              <span className="text-slate-400 font-mono text-xs normal-case">
                Session ·{' '}
                <span className="text-indigo-300">
                  {activeSessionId.slice(0, 8)}…
                </span>
              </span>
            ) : (
              'Agent Workspace'
            )}
          </h2>
        </div>

        <div className={`flex items-center gap-1.5 text-xs font-medium ${status.color}`}>
          {status.icon}
          <span>{status.label}</span>
          {wsStatus === 'connected' && (
            <>
              <span className="h-3 w-px bg-slate-800 mx-1" />
              <span className="flex items-center gap-1 text-slate-400">
                <CheckCircle className="h-3 w-3 text-emerald-500" />
                API Ready
              </span>
            </>
          )}
        </div>
      </header>

      {/* Message thread */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto px-6 py-6">
        <div className="space-y-5">
          {!activeSessionId ? (
            /* Empty state — no session selected */
            <div className="h-full flex flex-col items-center justify-center text-center gap-4 select-none animate-fade-in">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-600/10 border border-indigo-500/20 shadow-lg shadow-indigo-500/5">
                <Bot className="h-8 w-8 text-indigo-400" />
              </div>
              <div>
                <h3 className="text-slate-200 font-semibold text-lg">ZohoAgent</h3>
                <p className="text-slate-500 text-sm mt-1 max-w-xs mb-4">
                  Select a past conversation from the sidebar, or start a new chat session to connect with the agent.
                </p>
                <button
                  onClick={() => {
                    // Close current WS first, then open a new session
                    if (wsRef.current && wsRef.current.readyState < WebSocket.CLOSING) {
                      wsRef.current.close(1000, 'Session switched by user');
                    }
                    dispatch(closeCurrentSession());
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
                  }}
                  className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2.5 text-sm font-semibold transition-all active:scale-95 cursor-pointer shadow-lg shadow-indigo-600/20 border border-indigo-500/20"
                >
                  <Plus className="h-4 w-4 shrink-0" />
                  Start a New Chat
                </button>
              </div>
            </div>
          ) : loadingHistory ? (
            <div className="h-full flex items-center justify-center gap-3 text-slate-400">
              <Loader2 className="h-5 w-5 animate-spin text-indigo-400" />
              <span className="text-sm">Loading conversation…</span>
            </div>
          ) : messages.length === 0 && !streamingText ? (
            /* Fresh session — welcome prompt */
            <div className="h-full flex flex-col items-center justify-center text-center gap-4 select-none">
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-indigo-600/10 border border-indigo-500/20">
                <Sparkles className="h-6 w-6 text-indigo-400" />
              </div>
              <p className="text-slate-400 text-sm max-w-sm">
                New session started. Ask me anything about your Zoho projects — tasks, bugs, timesheets, and more.
              </p>
            </div>
          ) : (
            <>
              {(() => {
                // Find the last confirmation message that has NOT yet been answered.
                // A confirmation is "answered" if a user message (Yes/No) follows it.
                const CONFIRM_MARKER = 'Human-in-the-Loop Confirmation Required';
                const CONFIRM_WORDS = new Set(['yes', 'no', 'confirm', 'cancel', 'approve', 'abort']);

                let lastPendingConfirmIdx = -1;
                for (let i = messages.length - 1; i >= 0; i--) {
                  const msg = messages[i];
                  if (msg.role === 'assistant' && msg.text.includes(CONFIRM_MARKER)) {
                    // Check if any user message after this index is a confirm/decline reply
                    const hasReply = messages
                      .slice(i + 1)
                      .some(
                        (m) =>
                          m.role === 'user' &&
                          CONFIRM_WORDS.has(m.text.trim().toLowerCase().replace(/[.!?]$/, ''))
                      );
                    if (!hasReply) {
                      lastPendingConfirmIdx = i;
                    }
                    break; // only look at the most recent confirmation block
                  }
                }

                return messages.map((msg, idx) => (
                  <MessageBubble
                    key={msg.id}
                    role={msg.role}
                    text={msg.text}
                    timestamp={msg.timestamp}
                    onActionConfirm={idx === lastPendingConfirmIdx ? handleActionConfirm : undefined}
                  />
                ));
              })()}

              {/* Thinking indicator — shown while waiting for first chunk */}
              {isThinking && !streamingText && (
                <MessageBubble
                  role="assistant"
                  text=""
                  timestamp={new Date().toISOString()}
                  isThinking
                />
              )}

              {/* Live streaming bubble — shown once chunks arrive */}
              {streamingText && (
                <MessageBubble
                  role="assistant"
                  text={streamingText}
                  timestamp={new Date().toISOString()}
                  isStreaming
                  onActionConfirm={handleActionConfirm}
                />
              )}
            </>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input bar */}
      <div className="shrink-0 px-6 pb-6 pt-3 bg-linear-to-t from-[#070b13] via-[#070b13]/95 to-transparent">
        <div
          className={`relative flex items-end gap-3 rounded-2xl border px-4 py-3 transition-all duration-200 ${
            isInputDisabled
              ? 'border-slate-800/60 bg-slate-900/40'
              : 'border-slate-700/60 bg-slate-900/80 focus-within:border-indigo-500/60 focus-within:shadow-[0_0_0_3px_rgba(99,102,241,0.08)]'
          }`}
        >
          <textarea
            ref={textareaRef}
            id="chat-input"
            rows={1}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            disabled={isInputDisabled}
            placeholder={
              !activeSessionId
                ? 'Select or start a new chat…'
                : isThinking
                ? 'Agent is thinking…'
                : isStreaming
                ? 'Generating response…'
                : wsStatus !== 'connected'
                ? 'Connecting to agent…'
                : 'Ask the agent to create tasks, search projects, log time… (Enter to send)'
            }
            className="flex-1 resize-none bg-transparent text-sm text-slate-200 placeholder-slate-500 outline-none min-h-[24px] max-h-40 leading-6 disabled:cursor-not-allowed"
            style={{ height: 'auto' }}
          />
          <button
            id="send-btn"
            onClick={handleSend}
            disabled={isInputDisabled || !input.trim()}
            title="Send (Enter)"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-600 text-white transition-all active:scale-95 cursor-pointer shadow-md disabled:cursor-not-allowed disabled:shadow-none"
          >
            {isStreaming ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </button>
        </div>
        <p className="mt-2 text-center text-[10px] text-slate-600">
          Enter to send · Shift+Enter for new line
        </p>
      </div>
    </main>
  );
});

ChatWindow.displayName = 'ChatWindow';

export default ChatWindow;
