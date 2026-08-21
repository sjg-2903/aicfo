import { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, BrainCircuit, RotateCcw, User } from 'lucide-react';
import { Card } from '@/components/ui';
import { useToast } from '@/components/Toast';
import { getErrorMessage } from '@/lib/axios';
import aiCfoService from '@/services/aiCfoService';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

const SUGGESTED_QUESTIONS = [
  'How is my business doing?',
  'Why is my cash flow decreasing?',
  'Which customers owe me the most?',
  'What are my biggest expenses?',
  'Will I face a cash shortage this month?',
  'Am I ready for a business loan?',
  'Show me my financial risks',
];

const WELCOME_MESSAGE: Message = {
  id: 'welcome',
  role: 'assistant',
  content:
    "Hello! I'm your AI CFO. I analyze your business financials in real time. Ask me anything about your revenue, expenses, cash flow, risks or loan readiness.",
  timestamp: new Date().toISOString(),
};

export default function AICFO() {
  const { addToast } = useToast();
  const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const [sessionId, setSessionId] = useState<string | undefined>();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, typing]);

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || typing) return;

    const userMsg: Message = { id: `u-${Date.now()}`, role: 'user', content: trimmed, timestamp: new Date().toISOString() };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setTyping(true);

    try {
      const reply = await aiCfoService.sendMessage(trimmed, sessionId);
      setSessionId(reply.sessionId);
      const aiMsg: Message = { id: `a-${Date.now()}`, role: 'assistant', content: reply.content, timestamp: new Date().toISOString() };
      setMessages((prev) => [...prev, aiMsg]);
    } catch (e) {
      addToast(getErrorMessage(e), 'error');
      const aiMsg: Message = {
        id: `a-${Date.now()}`,
        role: 'assistant',
        content: "Sorry, I couldn't reach the analysis service. Please try again in a moment.",
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, aiMsg]);
    } finally {
      setTyping(false);
    }
  };

  const reset = () => {
    setMessages([WELCOME_MESSAGE]);
    setSessionId(undefined);
    setTyping(false);
  };

  const renderContent = (content: string) => {
    // Very simple markdown: bold ** and line breaks
    const parts = content.split('**');
    return parts.map((part, i) =>
      i % 2 === 1 ? (
        <strong key={i} className="font-semibold text-slate-900">
          {part}
        </strong>
      ) : (
        <span key={i} className="whitespace-pre-line">
          {part}
        </span>
      )
    );
  };

  return (
    <div className="space-y-4 h-[calc(100vh-8rem)] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-sm">
            <BrainCircuit className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">AI CFO Assistant</h1>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-xs text-slate-500">Online — analyzing your business data</span>
            </div>
          </div>
        </div>
        <button onClick={reset} className="inline-flex items-center gap-2 px-3 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition">
          <RotateCcw className="w-4 h-4" /> Reset chat
        </button>
      </div>

      {/* Messages */}
      <Card className="flex-1 flex flex-col overflow-hidden">
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in`}>
              <div className={`flex items-start gap-2.5 max-w-[85%] sm:max-w-[75%] ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.role === 'user' ? 'bg-slate-700' : 'bg-blue-600'}`}>
                  {msg.role === 'user' ? <User className="w-4 h-4 text-white" /> : <Sparkles className="w-4 h-4 text-white" />}
                </div>
                <div
                  className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                    msg.role === 'user' ? 'bg-blue-600 text-white rounded-tr-sm' : 'bg-slate-100 text-slate-700 rounded-tl-sm'
                  }`}
                >
                  {renderContent(msg.content)}
                  <div className={`text-[10px] mt-1.5 ${msg.role === 'user' ? 'text-blue-200' : 'text-slate-400'}`}>
                    {new Date(msg.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            </div>
          ))}

          {typing && (
            <div className="flex justify-start animate-in">
              <div className="flex items-start gap-2.5">
                <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center shrink-0">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <div className="px-4 py-3 rounded-2xl rounded-tl-sm bg-slate-100 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Suggested questions */}
        {messages.length <= 1 && (
          <div className="px-4 sm:px-6 pb-3">
            <p className="text-xs text-slate-400 mb-2">Try asking:</p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTED_QUESTIONS.map((q) => (
                <button
                  key={q}
                  onClick={() => send(q)}
                  className="px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-blue-50 hover:text-blue-700 rounded-full transition"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input */}
        <div className="p-4 border-t border-slate-100">
          <div className="flex items-center gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && send(input)}
              placeholder="Ask about your finances…"
              className="flex-1 px-4 py-3 border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition"
            />
            <button onClick={() => send(input)} disabled={!input.trim() || typing} className="p-3 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:cursor-not-allowed text-white transition">
              <Send className="w-5 h-5" />
            </button>
          </div>
          <p className="text-[10px] text-slate-400 mt-2 text-center">
            AI CFO provides financial guidance based on your data. Always verify critical decisions with your accountant.
          </p>
        </div>
      </Card>
    </div>
  );
}
