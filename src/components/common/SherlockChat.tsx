import React, { useState, useRef, useEffect } from 'react';
import { Send, Loader2, Bot, ChevronDown, Train, Command, Sun, Moon } from 'lucide-react';
import { useSystem } from '../../context/SystemContext';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  ts?: string;
  tools?: string[];
}

const SUGGESTED_PROMPTS = [
  'Worst section right now?',
  'Which trains are late?',
  'Predict freight delay in SHE-SKG',
  'Should we hold the 12627?'
];

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';

const now = () =>
  new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

const prettyTool = (name: string) => name.replace(/_/g, ' ');

export const SherlockChat: React.FC = () => {
  const { trains, alerts, aiRecommendations, simulation } = useSystem();
  const [isOpen, setIsOpen] = useState(false);
  const [isDark, setIsDark] = useState(true);
  const [messages, setMessages] = useState<Message[]>(() => [
    {
      role: 'assistant',
      content: `I'm the Amogh Station Master. I'm tracking ${trains.length} live trains on the Howrah–Burdwan line, and I can run the delay model for any what-if question. How can I assist?`,
      ts: now(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // Typing effect state
  const [isTyping, setIsTyping] = useState(false);
  const [displayedText, setDisplayedText] = useState('');
  
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
    // Reveal in chunks over ~90 frames so long answers don't crawl.
    const step = Math.max(1, Math.ceil(text.length / 90));
    const interval = setInterval(() => {
      if (i < text.length) {
        i = Math.min(text.length, i + step);
        setDisplayedText(text.slice(0, i));
      } else {
        clearInterval(interval);
        setIsTyping(false);
        onDone();
      }
    }, 18);
    return () => clearInterval(interval);
  };

  const buildSnapshot = () => ({
    trains: trains.map(t => ({
      trainNo: t.trainNo,
      name: t.name,
      trainType: t.trainType,
      sectionId: t.sectionId ?? t.location,
      status: t.status,
      delayMinutes: t.delayMinutes,
      scheduledTime: t.scheduledTime,
      platform: t.platform,
      speed: t.speed,
      destination: t.destination,
    })),
    alerts: alerts.map(a => ({
      severity: a.severity,
      message: a.message,
      location: a.location,
      timestamp: a.timestamp,
    })),
    recommendations: aiRecommendations.map(r => ({
      type: r.type,
      title: r.title,
      description: r.description,
      savings: r.savings,
      confidence: r.confidence,
      location: r.location,
    })),
    simulation: {
      progressPercent: simulation.progressPercent,
      conflictsResolved: simulation.conflictsResolved,
      efficiencyGain: simulation.efficiencyGain,
      isRunning: simulation.isRunning,
    },
  });

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading || isTyping) return;

    const userMsg: Message = { role: 'user', content: text.trim(), ts: now() };
    const updatedHistory = [...messages, userMsg];
    setMessages(updatedHistory);
    setInput('');
    setIsLoading(true);

    try {
      const res = await fetch(`${API_BASE}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: updatedHistory.map(m => ({ role: m.role, content: m.content })),
          context: buildSnapshot(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || `Request failed (${res.status})`);
      const reply = data.response || 'No response received.';
      const tools: string[] = Array.isArray(data.tools_used) ? data.tools_used : [];

      setMessages(prev => [...prev, { role: 'assistant', content: '', ts: now(), tools }]);
      setIsLoading(false);

      typewriterEffect(reply, () => {
        setMessages(prev => {
          const copy = [...prev];
          copy[copy.length - 1] = { role: 'assistant', content: reply, ts: now(), tools };
          return copy;
        });
        setDisplayedText('');
        if (!isOpen) setUnread(n => n + 1);
      });
    } catch (err) {
      setIsLoading(false);
      const detail = err instanceof Error ? err.message : String(err);
      const isNetwork = err instanceof TypeError;
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: isNetwork
            ? `Could not reach the API server at ${API_BASE}. Make sure uvicorn is running.`
            : `Assistant error: ${detail}`,
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

  const isLastAssistantTyping = isTyping && messages[messages.length - 1]?.role === 'assistant';

  return (
    <>
      <style>{`
        @keyframes sherlock-blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
        .sherlock-cursor { animation: sherlock-blink 0.8s infinite; }
      `}</style>

      <button
        onClick={() => setIsOpen(o => !o)}
        title="Amogh Assistant"
        className={`fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full flex items-center justify-center transition-all duration-200 shadow-xl ${
          isOpen 
            ? (isDark ? 'bg-slate-800 text-white' : 'bg-white text-slate-800') 
            : 'bg-blue-600 text-white hover:bg-blue-700 hover:scale-105'
        }`}
      >
        {isOpen ? (
          <ChevronDown className="w-6 h-6" />
        ) : (
          <>
            <Bot className="w-6 h-6" />
            {unread > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-white text-[10px] font-bold flex items-center justify-center border-2 border-slate-900">
                {unread}
              </span>
            )}
          </>
        )}
      </button>

      {isOpen && (
        <div
          className={`fixed bottom-24 right-6 z-50 w-[380px] max-h-[600px] flex flex-col rounded-2xl overflow-hidden shadow-2xl font-sans border transition-colors duration-300 ${
            isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'
          }`}
        >
          {/* Header */}
          <div className={`px-5 py-4 flex items-center justify-between border-b transition-colors duration-300 ${
            isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'
          }`}>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-blue-600/20 text-blue-500 flex items-center justify-center shrink-0">
                <Train className="w-5 h-5" />
              </div>
              <div>
                <h3 className={`font-semibold text-sm transition-colors duration-300 ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>Amogh Station Master</h3>
                <p className={`text-xs transition-colors duration-300 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Live Network Assistant</p>
              </div>
            </div>
            <div className="flex gap-1">
              <button
                onClick={() => setIsDark(!isDark)}
                className={`p-1.5 rounded-lg transition-colors duration-300 ${
                  isDark 
                    ? 'text-slate-400 hover:text-white hover:bg-slate-800' 
                    : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                }`}
                title="Toggle Theme"
              >
                {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className={`p-1.5 rounded-lg transition-colors duration-300 ${
                  isDark 
                    ? 'text-slate-400 hover:text-white hover:bg-slate-800' 
                    : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className={`flex-1 overflow-y-auto px-4 py-5 space-y-5 min-h-0 scrollbar-thin transition-colors duration-300 ${
            isDark 
              ? 'bg-slate-900 scrollbar-thumb-slate-700' 
              : 'bg-slate-50 scrollbar-thumb-slate-300'
          } scrollbar-track-transparent`}>
            {messages.map((msg, i) => {
              const isLastAndTyping = isLastAssistantTyping && i === messages.length - 1;
              const content = isLastAndTyping ? displayedText : msg.content;
              const isUser = msg.role === 'user';
              
              return (
                <div key={i} className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
                  {!isUser && (
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-1 border transition-colors duration-300 ${
                      isDark 
                        ? 'bg-slate-800 text-slate-300 border-slate-700' 
                        : 'bg-white text-slate-600 border-slate-200 shadow-sm'
                    }`}>
                      <Bot className="w-3.5 h-3.5" />
                    </div>
                  )}
                  <div className={`flex flex-col gap-1.5 max-w-[80%] ${isUser ? 'items-end' : 'items-start'}`}>
                    <div
                      className={`px-4 py-2.5 text-[13px] leading-relaxed rounded-2xl transition-colors duration-300 ${
                        isUser
                          ? 'bg-blue-600 text-white rounded-tr-sm shadow-md'
                          : isDark
                            ? 'bg-slate-800 text-slate-200 border border-slate-700 rounded-tl-sm'
                            : 'bg-white text-slate-700 border border-slate-200 rounded-tl-sm shadow-sm'
                      }`}
                    >
                      {content}
                      {isLastAndTyping && (
                        <span className={`sherlock-cursor inline-block w-[2px] h-[14px] ml-1 align-middle ${
                          isDark ? 'bg-blue-400' : 'bg-blue-500'
                        }`} />
                      )}
                    </div>
                    {msg.tools && msg.tools.length > 0 && !isLastAndTyping && (
                      <div className="flex flex-wrap items-center gap-1 px-1">
                        <span
                          className={`text-[9px] uppercase tracking-wider ${
                            isDark ? 'text-slate-500' : 'text-slate-400'
                          }`}
                        >
                          checked
                        </span>
                        {[...new Set(msg.tools)].map(tool => (
                          <span
                            key={tool}
                            className={`font-mono text-[9px] px-1.5 py-0.5 border rounded ${
                              isDark
                                ? 'border-slate-700 text-slate-400'
                                : 'border-slate-200 text-slate-500'
                            }`}
                          >
                            {prettyTool(tool)}
                          </span>
                        ))}
                      </div>
                    )}
                    {msg.ts && !isLastAndTyping && (
                      <span className={`text-[10px] font-medium px-1 transition-colors duration-300 ${
                        isDark ? 'text-slate-500' : 'text-slate-400'
                      }`}>{msg.ts}</span>
                    )}
                  </div>
                </div>
              );
            })}
            {isLoading && (
              <div className="flex gap-3">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-1 border transition-colors duration-300 ${
                  isDark 
                    ? 'bg-slate-800 text-slate-300 border-slate-700' 
                    : 'bg-white text-slate-600 border-slate-200 shadow-sm'
                }`}>
                  <Bot className="w-3.5 h-3.5" />
                </div>
                <div className={`px-4 py-3 border rounded-2xl rounded-tl-sm flex items-center transition-colors duration-300 ${
                  isDark 
                    ? 'bg-slate-800 border-slate-700' 
                    : 'bg-white border-slate-200 shadow-sm'
                }`}>
                  <Loader2 className={`w-4 h-4 animate-spin ${isDark ? 'text-slate-400' : 'text-slate-500'}`} />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Suggested Prompts */}
          {messages.length <= 1 && (
            <div className={`px-4 pb-4 transition-colors duration-300 ${isDark ? 'bg-slate-900' : 'bg-slate-50'}`}>
              <div className="flex flex-col gap-2">
                <p className={`text-xs flex items-center gap-1.5 font-medium transition-colors duration-300 ${
                  isDark ? 'text-slate-500' : 'text-slate-400'
                }`}><Command className="w-3 h-3"/> Suggestions</p>
                <div className="flex flex-wrap gap-2">
                  {SUGGESTED_PROMPTS.map(p => (
                    <button
                      key={p}
                      onClick={() => sendMessage(p)}
                      disabled={isLoading || isTyping}
                      className={`text-xs px-3 py-1.5 rounded-lg border transition-colors duration-300 text-left disabled:opacity-50 ${
                        isDark 
                          ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white' 
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900 shadow-sm'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Input Area */}
          <div className={`p-4 border-t transition-colors duration-300 ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'}`}>
            <div className={`flex items-center gap-2 rounded-xl px-3 py-2 border transition-colors duration-300 ${
              isDark 
                ? 'bg-slate-800 border-slate-700 focus-within:border-slate-500 focus-within:bg-slate-800/80' 
                : 'bg-slate-50 border-slate-200 focus-within:border-slate-300 focus-within:bg-white'
            }`}>
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about the network..."
                disabled={isLoading || isTyping}
                className={`flex-1 bg-transparent text-[13px] outline-none disabled:opacity-50 transition-colors duration-300 ${
                  isDark 
                    ? 'text-slate-200 placeholder-slate-500' 
                    : 'text-slate-800 placeholder-slate-400'
                }`}
              />
              <button
                onClick={() => sendMessage(input)}
                disabled={!input.trim() || isLoading || isTyping}
                className={`w-8 h-8 rounded-lg text-white flex items-center justify-center transition-colors duration-300 ${
                  isDark
                    ? 'bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:bg-slate-700 disabled:text-slate-400'
                    : 'bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:bg-slate-200 disabled:text-slate-400'
                }`}
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="mt-3 text-center">
              <span className={`text-[10px] font-medium transition-colors duration-300 ${
                isDark ? 'text-slate-500' : 'text-slate-400'
              }`}>Amogh AI · 50k+ Journey Data</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
