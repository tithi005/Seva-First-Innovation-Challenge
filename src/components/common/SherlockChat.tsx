import React, { useState, useRef, useEffect } from 'react';
import { Send, Loader2, Sparkles, ChevronDown, Zap, Train } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  ts?: string;
}

const SUGGESTED_PROMPTS = [
  '⚡ Highest delay section?',
  '🚂 Hold freight train?',
  '🎯 ML model accuracy?',
  '🔴 Why critical load?',
  '⚙️ CP-SAT optimizer?',
];

const now = () =>
  new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

/* Tiny dot-bounce loader */
const TypingDots: React.FC = () => (
  <span className="sherlock-dots">
    <span /><span /><span />
  </span>
);

export const SherlockChat: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content:
        "I'm AMOGH AI, your intelligent Station Master. I have full awareness of the Northern Zone network — 142 active trains, ML predictions, and live section data. Ask me anything.",
      ts: now(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [unread, setUnread] = useState(0);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 150);
      setUnread(0);
    }
  }, [isOpen]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, displayedText]);

  const typewriterEffect = (text: string, onDone: () => void) => {
    setIsTyping(true);
    setDisplayedText('');
    let i = 0;
    const speed = Math.max(6, Math.min(18, 1200 / text.length));
    const interval = setInterval(() => {
      if (i < text.length) {
        setDisplayedText(text.slice(0, i + 1));
        i++;
      } else {
        clearInterval(interval);
        setIsTyping(false);
        onDone();
      }
    }, speed);
    return () => clearInterval(interval);
  };

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading || isTyping) return;

    const userMsg: Message = { role: 'user', content: text.trim(), ts: now() };
    const updatedHistory = [...messages, userMsg];
    setMessages(updatedHistory);
    setInput('');
    setIsLoading(true);

    try {
      const res = await fetch('http://localhost:8000/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: updatedHistory.map(m => ({ role: m.role, content: m.content })),
        }),
      });
      const data = await res.json();
      const reply = data.response || 'No response received.';

      setMessages(prev => [...prev, { role: 'assistant', content: '', ts: now() }]);
      setIsLoading(false);

      typewriterEffect(reply, () => {
        setMessages(prev => {
          const copy = [...prev];
          copy[copy.length - 1] = { role: 'assistant', content: reply, ts: now() };
          return copy;
        });
        setDisplayedText('');
        if (!isOpen) setUnread(n => n + 1);
      });
    } catch {
      setIsLoading(false);
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: 'Could not reach the API server. Make sure uvicorn is running on port 8000.',
          ts: now(),
        },
      ]);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const isLastAssistantTyping =
    isTyping && messages[messages.length - 1]?.role === 'assistant';

  return (
    <>
      {/* ── Styles ─────────────────────────────────────────── */}
      <style>{`
        /* Dot-bounce animation */
        .sherlock-dots { display:inline-flex; gap:3px; align-items:center; }
        .sherlock-dots span {
          width:6px; height:6px; border-radius:50%;
          background: linear-gradient(135deg,#60a5fa,#a78bfa);
          animation: sherlock-bounce 1.2s infinite ease-in-out;
        }
        .sherlock-dots span:nth-child(2){ animation-delay:.2s; }
        .sherlock-dots span:nth-child(3){ animation-delay:.4s; }
        @keyframes sherlock-bounce {
          0%,80%,100%{ transform:scale(.6); opacity:.4; }
          40%{ transform:scale(1); opacity:1; }
        }

        /* Slide-up open animation */
        @keyframes sherlock-open {
          from{ opacity:0; transform:scale(.92) translateY(16px); }
          to{   opacity:1; transform:scale(1)  translateY(0); }
        }
        .sherlock-panel-open { animation: sherlock-open .28s cubic-bezier(.34,1.56,.64,1) forwards; }

        /* Cursor blink */
        @keyframes sherlock-blink { 0%,100%{opacity:1} 50%{opacity:0} }
        .sherlock-cursor { animation: sherlock-blink .7s infinite; }

        /* Scrollbar */
        .sherlock-scroll::-webkit-scrollbar{ width:4px; }
        .sherlock-scroll::-webkit-scrollbar-track{ background:transparent; }
        .sherlock-scroll::-webkit-scrollbar-thumb{ background:rgba(100,116,139,.35); border-radius:99px; }

        /* Pulse ring on FAB */
        @keyframes sherlock-ring {
          0%{ box-shadow:0 0 0 0 rgba(96,165,250,.6); }
          70%{ box-shadow:0 0 0 12px rgba(96,165,250,0); }
          100%{ box-shadow:0 0 0 0 rgba(96,165,250,0); }
        }
        .sherlock-ring { animation: sherlock-ring 2s infinite; }

        /* Message slide-in */
        @keyframes sherlock-msg {
          from{ opacity:0; transform:translateY(8px); }
          to{   opacity:1; transform:translateY(0); }
        }
        .sherlock-msg { animation: sherlock-msg .22s ease forwards; }

        /* Gradient text */
        .sherlock-grad {
          background: linear-gradient(135deg, #60a5fa 0%, #a78bfa 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
      `}</style>

      {/* ── Floating Action Button ──────────────────────────── */}
      <button
        onClick={() => setIsOpen(o => !o)}
        title="AMOGH AI Station Master"
        className={`fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full flex items-center justify-center
          transition-all duration-300 group select-none
          ${isOpen
            ? 'bg-slate-800 shadow-[0_8px_32px_rgba(0,0,0,.5)]'
            : 'bg-gradient-to-br from-blue-500 to-violet-600 shadow-[0_8px_32px_rgba(96,165,250,.4)] hover:scale-110 sherlock-ring'
          }`}
      >
        {isOpen ? (
          <ChevronDown className="w-5 h-5 text-white" />
        ) : (
          <>
            <Train className="w-6 h-6 text-white drop-shadow" />
            {unread > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 rounded-full text-white text-[9px] font-bold flex items-center justify-center border-2 border-slate-900">
                {unread}
              </span>
            )}
            {unread === 0 && (
              <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-emerald-400 rounded-full border-2 border-slate-900 animate-pulse" />
            )}
          </>
        )}
      </button>

      {/* ── Chat Panel ─────────────────────────────────────── */}
      {isOpen && (
        <div
          className="sherlock-panel-open fixed bottom-24 right-6 z-50 w-[420px] max-h-[620px]
            flex flex-col rounded-3xl overflow-hidden
            border border-white/[0.08]
            shadow-[0_32px_80px_rgba(0,0,0,.7),0_0_0_1px_rgba(255,255,255,.04)]"
          style={{
            background:
              'linear-gradient(160deg, rgba(15,23,42,.97) 0%, rgba(17,24,39,.99) 100%)',
            backdropFilter: 'blur(28px)',
          }}
        >
          {/* ── Header ───────────────────────────────────────── */}
          <div
            className="relative px-4 py-3.5 shrink-0 flex items-center justify-between overflow-hidden"
            style={{
              background:
                'linear-gradient(135deg, rgba(37,99,235,.25) 0%, rgba(124,58,237,.20) 100%)',
              borderBottom: '1px solid rgba(255,255,255,.07)',
            }}
          >
            {/* Glow orb */}
            <div
              className="absolute -top-6 -left-6 w-28 h-28 rounded-full opacity-20 pointer-events-none"
              style={{ background: 'radial-gradient(circle, #60a5fa, transparent 70%)' }}
            />
            <div className="flex items-center gap-3 relative">
              {/* Avatar */}
              <div className="relative">
                <div
                  className="w-9 h-9 rounded-2xl flex items-center justify-center shrink-0"
                  style={{
                    background: 'linear-gradient(135deg,#2563eb,#7c3aed)',
                    boxShadow: '0 4px 16px rgba(96,165,250,.35)',
                  }}
                >
                  <Sparkles className="w-4.5 h-4.5 text-white" />
                </div>
                <span
                  className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-slate-900 animate-pulse"
                  style={{ background: '#34d399' }}
                />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-white text-sm tracking-wide">AMOGH AI</span>
                  <span
                    className="text-[9px] font-mono px-1.5 py-0.5 rounded-md border font-semibold"
                    style={{
                      background: 'rgba(96,165,250,.12)',
                      border: '1px solid rgba(96,165,250,.3)',
                      color: '#93c5fd',
                    }}
                  >
                    LIVE
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 font-mono mt-0.5 flex items-center gap-1">
                  <Zap className="w-2.5 h-2.5 text-yellow-400" />
                  Howrah–Burdwan · 142 active trains
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="relative p-1.5 rounded-xl text-slate-500 hover:text-white hover:bg-white/10 transition-all duration-150"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>

          {/* ── Messages ─────────────────────────────────────── */}
          <div className="sherlock-scroll flex-1 overflow-y-auto px-4 py-4 space-y-4 min-h-0">
            {messages.map((msg, i) => {
              const isLastAndTyping = isLastAssistantTyping && i === messages.length - 1;
              const content = isLastAndTyping ? displayedText : msg.content;
              const isUser = msg.role === 'user';

              return (
                <div
                  key={i}
                  className={`sherlock-msg flex gap-2.5 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
                >
                  {/* Avatar dot (AI only) */}
                  {!isUser && (
                    <div
                      className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0 mt-0.5 self-end"
                      style={{
                        background: 'linear-gradient(135deg,#1d4ed8,#6d28d9)',
                        boxShadow: '0 2px 8px rgba(96,165,250,.2)',
                      }}
                    >
                      <Sparkles className="w-3 h-3 text-white" />
                    </div>
                  )}

                  <div className={`flex flex-col gap-1 max-w-[78%] ${isUser ? 'items-end' : 'items-start'}`}>
                    {/* Bubble */}
                    <div
                      className={`px-3.5 py-2.5 text-[12.5px] leading-relaxed rounded-2xl ${
                        isUser
                          ? 'rounded-tr-sm text-white'
                          : 'rounded-tl-sm text-slate-200'
                      }`}
                      style={
                        isUser
                          ? {
                              background: 'linear-gradient(135deg,#2563eb,#4f46e5)',
                              boxShadow: '0 4px 16px rgba(37,99,235,.3)',
                            }
                          : {
                              background: 'rgba(30,41,59,.8)',
                              border: '1px solid rgba(255,255,255,.07)',
                              boxShadow: '0 2px 8px rgba(0,0,0,.3)',
                            }
                      }
                    >
                      {content}
                      {isLastAndTyping && (
                        <span
                          className="sherlock-cursor inline-block w-[2px] h-[13px] rounded-full ml-0.5 align-middle"
                          style={{ background: '#93c5fd' }}
                        />
                      )}
                    </div>
                    {/* Timestamp */}
                    {msg.ts && !isLastAndTyping && (
                      <span className="text-[9px] text-slate-600 font-mono px-1">{msg.ts}</span>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Loading */}
            {isLoading && (
              <div className="sherlock-msg flex gap-2.5">
                <div
                  className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0 self-end"
                  style={{ background: 'linear-gradient(135deg,#1d4ed8,#6d28d9)' }}
                >
                  <Sparkles className="w-3 h-3 text-white" />
                </div>
                <div
                  className="px-4 py-3 rounded-2xl rounded-tl-sm flex items-center gap-1"
                  style={{
                    background: 'rgba(30,41,59,.8)',
                    border: '1px solid rgba(255,255,255,.07)',
                  }}
                >
                  <TypingDots />
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* ── Suggested Prompts ────────────────────────────── */}
          {messages.length <= 1 && (
            <div
              className="px-4 pb-3 pt-1 shrink-0 flex flex-wrap gap-1.5"
              style={{ borderTop: '1px solid rgba(255,255,255,.04)' }}
            >
              <p className="w-full text-[10px] text-slate-500 font-mono mb-0.5">Try asking:</p>
              {SUGGESTED_PROMPTS.map(p => (
                <button
                  key={p}
                  onClick={() => sendMessage(p)}
                  className="text-[10.5px] px-3 py-1.5 rounded-xl font-medium transition-all duration-150
                    hover:scale-[1.03] active:scale-95"
                  style={{
                    background: 'rgba(37,99,235,.12)',
                    border: '1px solid rgba(96,165,250,.2)',
                    color: '#93c5fd',
                  }}
                >
                  {p}
                </button>
              ))}
            </div>
          )}

          {/* ── Input Bar ────────────────────────────────────── */}
          <div
            className="px-3 pb-3 pt-2.5 shrink-0"
            style={{ borderTop: '1px solid rgba(255,255,255,.06)' }}
          >
            <div
              className="flex gap-2 items-center rounded-2xl px-3.5 py-2.5 transition-all duration-150
                focus-within:ring-1 focus-within:ring-blue-500/40"
              style={{
                background: 'rgba(30,41,59,.9)',
                border: '1px solid rgba(255,255,255,.08)',
                boxShadow: '0 2px 12px rgba(0,0,0,.25)',
              }}
            >
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask AMOGH AI anything…"
                disabled={isLoading || isTyping}
                className="flex-1 bg-transparent text-[12.5px] text-slate-200 placeholder-slate-600 outline-none disabled:opacity-40"
              />
              <button
                onClick={() => sendMessage(input)}
                disabled={!input.trim() || isLoading || isTyping}
                className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-all duration-150
                  hover:scale-105 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
                style={{
                  background: input.trim() && !isLoading && !isTyping
                    ? 'linear-gradient(135deg,#2563eb,#7c3aed)'
                    : 'rgba(51,65,85,.6)',
                  boxShadow: input.trim() && !isLoading && !isTyping
                    ? '0 4px 12px rgba(37,99,235,.35)'
                    : 'none',
                }}
              >
                {isLoading
                  ? <Loader2 className="w-3.5 h-3.5 text-white animate-spin" />
                  : <Send className="w-3.5 h-3.5 text-white" />
                }
              </button>
            </div>

            {/* Footer */}
            <p className="text-center text-[9px] text-slate-700 font-mono mt-2 tracking-wider">
              Powered by <span className="sherlock-grad font-semibold">OpenAI · NVIDIA</span> &nbsp;·&nbsp; 50,000-record ML dataset
            </p>
          </div>
        </div>
      )}
    </>
  );
};
