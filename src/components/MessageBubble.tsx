import React, { useMemo, useEffect, useState, useRef } from 'react';
import { Bot, User as UserIcon } from 'lucide-react';

// Inject keyframe animations once into <head> — never re-runs
let _stylesInjected = false;
function injectGlobalStyles() {
  if (_stylesInjected || typeof document === 'undefined') return;
  _stylesInjected = true;
  const s = document.createElement('style');
  s.textContent = `
    @keyframes thinking-bounce {
      0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
      30% { transform: translateY(-6px); opacity: 1; }
    }
    @keyframes cursor-blink {
      0%, 100% { opacity: 1; }
      50% { opacity: 0; }
    }
    @keyframes msg-fade-in {
      from { opacity: 0; transform: translateY(6px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    @keyframes letter-fade-in {
      from {
        opacity: 0;
        filter: blur(1.5px);
        transform: translateY(2px);
      }
      to {
        opacity: 1;
        filter: blur(0);
        transform: translateY(0);
      }
    }
    .typewriter-cursor::after {
      content: '\u258c';
      display: inline-block;
      margin-left: 1px;
      color: #818cf8;
      animation: cursor-blink 0.7s step-end infinite;
    }
    .msg-bubble-enter {
      animation: msg-fade-in 0.22s ease-out both;
    }
  `;
  document.head.appendChild(s);
}

interface MessageBubbleProps {
  role: 'user' | 'assistant';
  text: string;
  timestamp: string;
  isStreaming?: boolean;
  isThinking?: boolean;
  onActionConfirm?: (action: 'yes' | 'no') => void;
}

// ---------------------------------------------------------------------------
// Minimal markdown renderer: bold, inline-code, code blocks, line-breaks
// ---------------------------------------------------------------------------
function renderMarkdown(text: string): React.ReactNode[] {
  const lines = text.split('\n');
  const nodes: React.ReactNode[] = [];
  let codeBuffer: string[] = [];
  let inCode = false;
  let codeLang = '';

  let inTable = false;
  let tableHeaders: string[] = [];
  let tableRows: string[][] = [];

  const flushCode = (key: number) => {
    nodes.push(
      <div
        key={`code-${key}`}
        className="my-2 rounded-xl border border-slate-700/60 bg-[#0d1117] overflow-x-auto"
      >
        {codeLang && (
          <div className="px-4 py-1.5 border-b border-slate-700/50 text-[10px] font-mono text-indigo-400 uppercase tracking-widest">
            {codeLang}
          </div>
        )}
        <pre className="px-4 py-3 text-xs font-mono text-slate-300 leading-relaxed whitespace-pre">
          {codeBuffer.join('\n')}
        </pre>
      </div>
    );
    codeBuffer = [];
    codeLang = '';
  };

  const flushTable = (key: number) => {
    if (tableHeaders.length === 0 && tableRows.length === 0) return;
    nodes.push(
      <div key={`table-${key}`} className="my-3 overflow-x-auto rounded-xl border border-slate-800/80 bg-slate-950/40 backdrop-blur-xs shadow-xs">
        <table className="min-w-full divide-y divide-slate-800/60 text-xs text-left">
          <thead className="bg-slate-900/60 text-slate-300 font-semibold uppercase tracking-wider">
            <tr>
              {tableHeaders.map((header, hIdx) => (
                <th key={hIdx} className="px-4 py-3 font-semibold text-indigo-300/90 whitespace-nowrap">
                  {inlineFormat(header)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/40 text-slate-300">
            {tableRows.map((row, rIdx) => (
              <tr key={rIdx} className="hover:bg-slate-800/20 transition-colors">
                {row.map((cell, cIdx) => (
                  <td key={cIdx} className="px-4 py-2.5 whitespace-nowrap align-middle">
                    {inlineFormat(cell)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
    tableHeaders = [];
    tableRows = [];
  };

  lines.forEach((line, i) => {
    // ── Table parsing ─────────────────────────────────────────────────────
    if (!inCode && line.trim().startsWith('|')) {
      const parts = line.split('|').map(p => p.trim()).filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);
      
      // Let's check if it's the divider row (e.g. |---|---|)
      const isDivider = parts.every(p => /^-+$/.test(p.replace(/:/g, '')));
      
      if (isDivider) {
        inTable = true;
        return;
      }
      
      if (!inTable) {
        tableHeaders = parts;
        inTable = true;
      } else {
        tableRows.push(parts);
      }
      return;
    } else {
      if (inTable) {
        flushTable(i);
        inTable = false;
      }
    }

    // ── Special Thinking and Tool Use rendering ───────────────────────────
    if (line.startsWith('💭 ')) {
      nodes.push(
        <div key={i} className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-indigo-950/20 border border-indigo-900/30 text-indigo-300/90 font-medium text-xs my-2.5 shadow-xs shadow-indigo-950/5">
          <span className="text-sm shrink-0">💭</span>
          <span className="leading-relaxed">{inlineFormat(line.slice(2))}</span>
        </div>
      );
      return;
    }
    if (line.startsWith('⚙️ ')) {
      nodes.push(
        <div key={i} className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-emerald-950/20 border border-emerald-900/30 text-emerald-300/90 font-mono text-xs my-2.5 shadow-xs shadow-emerald-950/5">
          <span className="text-sm shrink-0">⚙️</span>
          <span className="leading-relaxed">{inlineFormat(line.slice(2))}</span>
        </div>
      );
      return;
    }

    // ── Code fence ────────────────────────────────────────────────────────
    if (line.startsWith('```')) {
      if (!inCode) {
        inCode = true;
        codeLang = line.slice(3).trim();
      } else {
        inCode = false;
        flushCode(i);
      }
      return;
    }
    if (inCode) {
      codeBuffer.push(line);
      return;
    }

    // ── Horizontal Rule ───────────────────────────────────────────────────
    if (line.trim() === '***' || line.trim() === '---') {
      nodes.push(<hr key={i} className="my-4 border-slate-800/80" />);
      return;
    }

    // ── Headings ──────────────────────────────────────────────────────────
    if (line.startsWith('### ')) {
      nodes.push(
        <p key={i} className="mt-3 mb-1 text-sm font-bold text-slate-100">
          {inlineFormat(line.slice(4))}
        </p>
      );
      return;
    }
    if (line.startsWith('## ')) {
      nodes.push(
        <p key={i} className="mt-3 mb-1 text-sm font-bold text-indigo-300">
          {inlineFormat(line.slice(3))}
        </p>
      );
      return;
    }

    // ── Bullet list ───────────────────────────────────────────────────────
    const bulletMatch = line.match(/^\s*[-*]\s+(.*)/);
    if (bulletMatch) {
      nodes.push(
        <div key={i} className="flex items-start gap-2 my-0.5">
          <span className="mt-[5px] h-1.5 w-1.5 rounded-full bg-indigo-400 shrink-0" />
          <span className="text-sm leading-relaxed text-slate-300">{inlineFormat(bulletMatch[1])}</span>
        </div>
      );
      return;
    }

    // ── Numbered list ─────────────────────────────────────────────────────
    const numMatch = line.match(/^\s*(\d+)\.\s+(.*)/);
    if (numMatch) {
      nodes.push(
        <div key={i} className="flex items-start gap-2 my-0.5">
          <span className="text-xs text-indigo-400 font-mono mt-0.5 shrink-0 w-4">{numMatch[1]}.</span>
          <span className="text-sm leading-relaxed text-slate-300">{inlineFormat(numMatch[2])}</span>
        </div>
      );
      return;
    }

    // ── Empty line → spacer ───────────────────────────────────────────────
    if (line.trim() === '') {
      nodes.push(<div key={i} className="h-2" />);
      return;
    }

    // ── Normal paragraph ──────────────────────────────────────────────────
    nodes.push(
      <p key={i} className="text-sm leading-relaxed text-slate-300">
        {inlineFormat(line)}
      </p>
    );
  });

  // flush unclosed code block
  if (inCode && codeBuffer.length > 0) flushCode(99999);

  // flush unclosed table
  if (inTable) flushTable(88888);

  return nodes;
}

// Inline formatting: **bold**, *italic*, `code`, and markdown links [text](link)
function inlineFormat(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  // regex handles **bold**, *italic*, `code`, and [text](link)
  const re = /(\*\*(.+?)\*\*|\*(.+?)\*|`([^`]+)`|\[([^\]]+)\]\(([^)]+)\))/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    if (m[2] !== undefined) {
      parts.push(<strong key={m.index} className="font-semibold text-slate-100">{m[2]}</strong>);
    } else if (m[3] !== undefined) {
      parts.push(<em key={m.index} className="italic text-slate-300">{m[3]}</em>);
    } else if (m[4] !== undefined) {
      parts.push(
        <code key={m.index} className="rounded px-1.5 py-0.5 bg-slate-700/70 text-indigo-300 text-[11px] font-mono">
          {m[4]}
        </code>
      );
    } else if (m[5] !== undefined && m[6] !== undefined) {
      const linkText = m[5];
      const url = m[6];
      if (url.startsWith('project://')) {
        const projectId = url.replace('project://', '');
        parts.push(
          <button
            key={m.index}
            onClick={() => {
              window.dispatchEvent(new CustomEvent('open-zoho-popup', {
                detail: { type: 'project', projectId }
              }));
            }}
            className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-md bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 transition-all hover:scale-105 active:scale-95 cursor-pointer align-baseline"
          >
            📁 {linkText}
          </button>
        );
      } else if (url.startsWith('task://')) {
        const path = url.replace('task://', '');
        const [projectId, taskId] = path.split('/');
        parts.push(
          <button
            key={m.index}
            onClick={() => {
              window.dispatchEvent(new CustomEvent('open-zoho-popup', {
                detail: { type: 'task', projectId, taskId }
              }));
            }}
            className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-md bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 transition-all hover:scale-105 active:scale-95 cursor-pointer align-baseline"
          >
            ✓ {linkText}
          </button>
        );
      } else if (url.startsWith('member://')) {
        const path = url.replace('member://', '');
        const [projectId, memberId] = path.split('/');
        parts.push(
          <button
            key={m.index}
            onClick={() => {
              window.dispatchEvent(new CustomEvent('open-zoho-popup', {
                detail: { type: 'member', projectId, taskId: memberId }
              }));
            }}
            className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-md bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/20 transition-all hover:scale-105 active:scale-95 cursor-pointer align-baseline"
          >
            👤 {linkText}
          </button>
        );
      } else {
        parts.push(
          <a
            key={m.index}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-indigo-400 hover:text-indigo-300 underline font-semibold transition-all"
          >
            {linkText}
          </a>
        );
      }
    }
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}


// ---------------------------------------------------------------------------
// ThinkingIndicator — pulsing brain animation
// ---------------------------------------------------------------------------
const ThinkingIndicator: React.FC = () => (
  <div className="flex items-center gap-3 px-4 py-3">
    <div className="flex items-center gap-1.5">
      <span
        className="h-2 w-2 rounded-full bg-indigo-400"
        style={{ animation: 'thinking-bounce 1.2s ease-in-out infinite', animationDelay: '0s' }}
      />
      <span
        className="h-2 w-2 rounded-full bg-indigo-400"
        style={{ animation: 'thinking-bounce 1.2s ease-in-out infinite', animationDelay: '0.2s' }}
      />
      <span
        className="h-2 w-2 rounded-full bg-indigo-400"
        style={{ animation: 'thinking-bounce 1.2s ease-in-out infinite', animationDelay: '0.4s' }}
      />
    </div>
    <span className="text-xs text-slate-500 font-medium tracking-wide animate-pulse">
      Thinking…
    </span>
  </div>
);

// ---------------------------------------------------------------------------
// StreamingLetterRenderer — types letter-by-letter with a fade-in animation
// ---------------------------------------------------------------------------
interface StreamingLetterRendererProps {
  text: string;
  isStreamActive: boolean;
  onComplete: () => void;
}

const StreamingLetterRenderer: React.FC<StreamingLetterRendererProps> = ({
  text,
  isStreamActive,
  onComplete,
}) => {
  const [displayedChars, setDisplayedChars] = useState<string[]>([]);
  const queueRef = useRef<string[]>([]);
  const indexRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Use refs to keep callbacks and active state up to date inside the ticking interval
  const onCompleteRef = useRef(onComplete);
  const isStreamActiveRef = useRef(isStreamActive);

  // Safely sync callback and streaming active status inside effects
  useEffect(() => {
    onCompleteRef.current = onComplete;
    isStreamActiveRef.current = isStreamActive;
  }, [onComplete, isStreamActive]);

  // Sync incoming text chunks with the character queue
  useEffect(() => {
    const rawChars = Array.from(text);
    const currentLength = indexRef.current;
    if (rawChars.length > currentLength) {
      const newChars = rawChars.slice(currentLength);
      queueRef.current.push(...newChars);
      indexRef.current = rawChars.length;
    }
  }, [text]);

  // Typing engine with dynamic delay to prevent lagging behind fast streams
  useEffect(() => {
    const tick = () => {
      if (queueRef.current.length > 0) {
        const nextChar = queueRef.current.shift()!;
        setDisplayedChars((prev) => [...prev, nextChar]);

        const qLen = queueRef.current.length;
        let delay = 35; // Default slow and smooth speed (35ms/letter)
        if (qLen > 30) {
          delay = 4; // Catch up almost instantly
        } else if (qLen > 15) {
          delay = 10; // Catch up rapidly
        } else if (qLen > 5) {
          delay = 20; // Catch up gently
        }

        timerRef.current = setTimeout(tick, delay);
      } else {
        // Queue is fully typed out
        if (!isStreamActiveRef.current) {
          // If the stream is also done, trigger onComplete so parent switches to static markdown
          onCompleteRef.current();
        } else {
          // Stream is still active, poll again shortly for new chunks
          timerRef.current = setTimeout(tick, 50);
        }
      }
    };

    timerRef.current = setTimeout(tick, 35);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return (
    <span className="text-sm leading-relaxed whitespace-pre-wrap wrap-break-word">
      {displayedChars.map((char, idx) => (
        <span
          key={idx}
          style={{
            display: char === ' ' || char === '\n' ? 'inline' : 'inline-block',
            whiteSpace: 'pre-wrap',
            animation: 'letter-fade-in 0.28s cubic-bezier(0.16, 1, 0.3, 1) forwards',
            opacity: 0,
          }}
        >
          {char}
        </span>
      ))}
    </span>
  );
};

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export const MessageBubble: React.FC<MessageBubbleProps> = ({
  role,
  text,
  timestamp,
  isStreaming = false,
  isThinking = false,
  onActionConfirm,
}) => {
  const isUser = role === 'user';
  const time = new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  // Track if we are currently typewriter animating.
  const [isTypingComplete, setIsTypingComplete] = useState(!isStreaming);
  const [prevIsStreaming, setPrevIsStreaming] = useState(isStreaming);
  const [decision, setDecision] = useState<'yes' | 'no' | null>(null);

  // Adjust state in render if isStreaming changes
  if (isStreaming !== prevIsStreaming) {
    setPrevIsStreaming(isStreaming);
    if (isStreaming) {
      setIsTypingComplete(false);
    }
  }

  // Inject global styles once on first mount
  useEffect(() => { injectGlobalStyles(); }, []);

  const renderedContent = useMemo(() => {
    if (isUser) return <p className="text-sm leading-relaxed whitespace-pre-wrap">{text}</p>;
    if (!isTypingComplete) {
      return (
        <StreamingLetterRenderer
          text={text}
          isStreamActive={isStreaming}
          onComplete={() => setIsTypingComplete(true)}
        />
      );
    }
    return renderMarkdown(text);
  }, [text, isUser, isTypingComplete, isStreaming]);

  const showApprovalButtons = !isUser && text.includes("Human-in-the-Loop Confirmation Required") && onActionConfirm && !isStreaming;

  return (
    <div
      className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'} items-end msg-bubble-enter`}
    >
        {/* Avatar */}
        <div
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ring-1 ${
            isUser
              ? 'bg-indigo-600/20 ring-indigo-500/40 text-indigo-300'
              : 'bg-slate-800 ring-slate-700 text-indigo-400'
          }`}
        >
          {isUser ? <UserIcon className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
        </div>

        {/* Bubble */}
        <div className={`flex flex-col gap-1 max-w-2xl ${isUser ? 'items-end' : 'items-start'}`}>
          <div
            className={`relative rounded-2xl shadow-md ${
              isUser
                ? 'bg-linear-to-br from-indigo-600 to-indigo-700 text-white rounded-br-sm px-4 py-3'
                : 'bg-slate-900/80 border border-slate-800/80 text-slate-200 rounded-bl-sm backdrop-blur-sm'
            }`}
          >
            {/* ── Thinking state ─────────────────────────────────────── */}
            {isThinking && !isUser && <ThinkingIndicator />}

            {/* ── Streaming or final content ─────────────────────────── */}
            {!isThinking && (
              <div className={`px-4 py-3 ${isStreaming && !isUser ? 'typewriter-cursor' : ''}`}>
                {renderedContent}

                {/* ── Human-in-the-Loop Confirmation Panel ───────────────── */}
                {showApprovalButtons && (
                  <div className="mt-4 pt-3.5 border-t border-slate-800/80">
                    {decision === null ? (
                      <div className="flex flex-wrap items-center gap-3">
                        <button
                          onClick={() => {
                            setDecision('yes');
                            onActionConfirm!('yes');
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-semibold text-xs tracking-wide transition-all shadow-md shadow-emerald-950/20 border border-emerald-500/20 cursor-pointer"
                        >
                          ✓ Approve (Yes)
                        </button>
                        <button
                          onClick={() => {
                            setDecision('no');
                            onActionConfirm!('no');
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 active:scale-95 text-white font-semibold text-xs tracking-wide transition-all shadow-md shadow-rose-950/20 border border-rose-500/20 cursor-pointer"
                        >
                          ✗ Decline (No)
                        </button>
                      </div>
                    ) : decision === 'yes' ? (
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-950/40 border border-emerald-900/30 text-emerald-400 font-bold text-xs tracking-wide">
                        <span>✓ Action Approved</span>
                      </div>
                    ) : (
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-rose-950/40 border border-rose-900/30 text-rose-400 font-bold text-xs tracking-wide">
                        <span>✗ Action Declined</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Timestamp */}
          {!isThinking && (
            <span className={`text-[10px] text-slate-500 px-1 ${isUser ? 'text-right' : 'text-left'}`}>
              {isUser ? 'You' : 'AI Agent'} · {time}
            </span>
          )}
        </div>
    </div>
  );
};

export default MessageBubble;
