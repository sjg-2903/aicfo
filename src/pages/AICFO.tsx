import { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowDown,
  BrainCircuit,
  FileText,
  Paperclip,
  RefreshCw,
  RotateCcw,
  Send,
  Sparkles,
  User,
  X,
} from 'lucide-react';
import { Card } from '@/components/ui';
import { ChatMarkdown } from '@/components/ChatMarkdown';
import { useToast } from '@/components/Toast';
import { getErrorMessage } from '@/lib/axios';
import aiCfoService from '@/services/aiCfoService';

interface MessageAttachment {
  name: string;
  size: number;
  type: string;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  attachment?: MessageAttachment;
  engine?: string;
  followUps?: string[];
}

interface FailedRequest {
  message: string;
  file?: File;
  reason: string;
}

const MAX_FILE_BYTES = 15 * 1024 * 1024;

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
    "## Welcome to your AI CFO\n\nAsk about your **cash flow**, **receivables**, **expenses**, **risks**, or **loan readiness**. I use your recorded business data for every answer and can review an attached file in this chat.",
  timestamp: new Date().toISOString(),
  engine: 'deterministic',
};

const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const engineLabel = (engine?: string) => (engine === 'bedrock' ? 'AI CFO (AWS Bedrock)' : 'Financial analysis');

export default function AICFO() {
  const { addToast } = useToast();
  const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const [sessionId, setSessionId] = useState<string | undefined>();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [failedRequest, setFailedRequest] = useState<FailedRequest | null>(null);
  const [showJumpToLatest, setShowJumpToLatest] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const stickToBottomRef = useRef(true);
  const conversationEpochRef = useRef(0);

  const scrollToLatest = (behavior: ScrollBehavior = 'smooth') => {
    const node = scrollRef.current;
    if (!node) return;
    node.scrollTo({ top: node.scrollHeight, behavior });
    stickToBottomRef.current = true;
    setShowJumpToLatest(false);
  };

  useEffect(() => {
    if (stickToBottomRef.current) scrollToLatest(messages.length <= 2 ? 'auto' : 'smooth');
  }, [messages, typing]);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 144)}px`;
  }, [input]);

  const handleScroll = () => {
    const node = scrollRef.current;
    if (!node) return;
    const distanceFromBottom = node.scrollHeight - node.scrollTop - node.clientHeight;
    const nearBottom = distanceFromBottom < 96;
    stickToBottomRef.current = nearBottom;
    setShowJumpToLatest(!nearBottom && messages.length > 2);
  };

  const send = async (
    rawText: string,
    options: { file?: File | null; appendUserMessage?: boolean } = {}
  ) => {
    const trimmed = rawText.trim();
    const file = options.file === undefined ? selectedFile : options.file;
    const appendUserMessage = options.appendUserMessage ?? true;
    if (typing || (!trimmed && !file)) return;

    const effectiveMessage = trimmed || 'Analyze the attached file and explain the important findings.';
    const userMsg: Message = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: effectiveMessage,
      timestamp: new Date().toISOString(),
      attachment: file
        ? { name: file.name, size: file.size, type: file.type || 'application/octet-stream' }
        : undefined,
    };

    if (appendUserMessage) {
      stickToBottomRef.current = true;
      setMessages((prev) => [...prev, userMsg]);
      setInput('');
      setSelectedFile(null);
    }
    setTyping(true);
    setFailedRequest(null);
    const requestEpoch = conversationEpochRef.current;

    try {
      const reply = await aiCfoService.sendMessage(effectiveMessage, sessionId, file || undefined);
      // A user may intentionally start a new chat while a slow provider call is
      // still in flight. Ignore the stale response instead of reviving the old
      // conversation in the new view.
      if (requestEpoch !== conversationEpochRef.current) return;
      setSessionId(reply.sessionId);
      stickToBottomRef.current = true;
      setMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: 'assistant',
          content: reply.content || 'I could not prepare a response from the available financial data.',
          timestamp: new Date().toISOString(),
          engine: reply.engine,
          followUps: reply.followUps.slice(0, 3),
        },
      ]);
    } catch (error) {
      if (requestEpoch !== conversationEpochRef.current) return;
      const reason = getErrorMessage(error, 'We could not reach the AI CFO right now.');
      addToast(reason, 'error');
      setFailedRequest({ message: effectiveMessage, file: file || undefined, reason });
    } finally {
      if (requestEpoch === conversationEpochRef.current) setTyping(false);
    }
  };

  const chooseFile = (file?: File) => {
    if (!file) return;
    if (file.size > MAX_FILE_BYTES) {
      addToast('Chat attachments must be 15 MB or smaller', 'error');
      return;
    }
    if (file.size === 0) {
      addToast('The selected file is empty', 'error');
      return;
    }
    setSelectedFile(file);
    setFailedRequest(null);
  };

  const reset = () => {
    conversationEpochRef.current += 1;
    setMessages([{ ...WELCOME_MESSAGE, timestamp: new Date().toISOString() }]);
    setSessionId(undefined);
    setSelectedFile(null);
    setInput('');
    setTyping(false);
    setFailedRequest(null);
    stickToBottomRef.current = true;
  };

  return (
    <div className="flex min-h-[calc(100dvh-7rem)] flex-col gap-4 lg:h-[calc(100dvh-8rem)]">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 shadow-sm shadow-blue-200">
            <BrainCircuit className="h-6 w-6 text-white" />
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-xl font-bold tracking-tight text-slate-900">AI CFO Assistant</h1>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-500 animate-pulse" />
              <span className="truncate text-xs text-slate-500">
                Grounded in your business data with AWS Bedrock explanations when configured
              </span>
            </div>
          </div>
        </div>
        <button
          onClick={reset}
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
          aria-label="Start a new chat"
        >
          <RotateCcw className="h-4 w-4" /> <span>New chat</span>
        </button>
      </div>

      <Card className="relative flex min-h-[520px] flex-1 flex-col overflow-hidden border-slate-200/90 shadow-sm">
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="relative flex-1 overflow-y-auto overscroll-contain bg-gradient-to-b from-slate-50/70 via-white to-slate-50/40 p-3 sm:p-5 lg:p-6"
          aria-live="polite"
        >
          <div className="mx-auto max-w-5xl space-y-5">
            {messages.map((msg) => (
              <div key={msg.id} className={`animate-in ${msg.role === 'user' ? 'flex flex-col items-end' : 'flex flex-col items-start'}`}>
                <div
                  className={`flex w-full items-start gap-2.5 sm:max-w-[86%] lg:max-w-[78%] ${
                    msg.role === 'user' ? 'flex-row-reverse' : ''
                  }`}
                >
                  <div
                    className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full shadow-sm ${
                      msg.role === 'user' ? 'bg-slate-700' : 'bg-gradient-to-br from-blue-600 to-indigo-600'
                    }`}
                    aria-hidden="true"
                  >
                    {msg.role === 'user' ? <User className="h-4 w-4 text-white" /> : <Sparkles className="h-4 w-4 text-white" />}
                  </div>
                  <div
                    className={`min-w-0 flex-1 rounded-2xl px-4 py-3 text-sm shadow-sm ${
                      msg.role === 'user'
                        ? 'rounded-tr-sm bg-blue-600 text-white shadow-blue-100'
                        : 'rounded-tl-sm border border-slate-200 bg-white text-slate-700'
                    }`}
                  >
                    {msg.role === 'assistant' && (
                      <div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-blue-600">
                        <Sparkles className="h-3.5 w-3.5" />
                        {engineLabel(msg.engine)}
                        <span className="font-normal normal-case tracking-normal text-slate-400">· grounded response</span>
                      </div>
                    )}
                    {msg.attachment && (
                      <div
                        className={`mb-3 flex items-center gap-2 rounded-lg border px-3 py-2 ${
                          msg.role === 'user' ? 'border-blue-400/50 bg-blue-500/50' : 'border-slate-200 bg-slate-50'
                        }`}
                      >
                        <FileText className="h-4 w-4 shrink-0" />
                        <div className="min-w-0">
                          <p className="truncate text-xs font-medium">{msg.attachment.name}</p>
                          <p className={`text-[10px] ${msg.role === 'user' ? 'text-blue-100' : 'text-slate-400'}`}>
                            {formatFileSize(msg.attachment.size)}
                          </p>
                        </div>
                      </div>
                    )}
                    <ChatMarkdown content={msg.content} tone={msg.role} />
                    <div className={`mt-2.5 text-[10px] ${msg.role === 'user' ? 'text-blue-100' : 'text-slate-400'}`}>
                      {new Date(msg.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
                {msg.role === 'assistant' && msg.followUps && msg.followUps.length > 0 && (
                  <div className="ml-10 mt-2 flex max-w-[calc(100%-2.5rem)] flex-wrap gap-1.5 sm:max-w-[80%]">
                    {msg.followUps.map((question) => (
                      <button
                        key={`${msg.id}-${question}`}
                        onClick={() => void send(question)}
                        disabled={typing}
                        className="rounded-full border border-blue-100 bg-white px-2.5 py-1 text-xs font-medium text-blue-700 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {question}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {typing && (
              <div className="flex animate-in items-start gap-2.5" role="status">
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 shadow-sm">
                  <Sparkles className="h-4 w-4 text-white" />
                </div>
                <div className="rounded-2xl rounded-tl-sm border border-slate-200 bg-white px-4 py-3 shadow-sm">
                  <div className="flex items-center gap-2.5">
                    <div className="flex items-center gap-1" aria-hidden="true">
                      <span className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                    <span className="text-xs font-medium text-slate-500">Reviewing your financial context…</span>
                  </div>
                </div>
              </div>
            )}

            {failedRequest && !typing && (
              <div className="ml-0 flex max-w-xl animate-in items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800 sm:ml-10" role="alert">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                <div className="min-w-0 flex-1">
                  <p className="font-medium">We couldn’t send that message.</p>
                  <p className="mt-0.5 text-xs leading-5 text-red-700">{failedRequest.reason}</p>
                </div>
                <button
                  onClick={() => void send(failedRequest.message, { file: failedRequest.file, appendUserMessage: false })}
                  className="inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-red-700 transition hover:bg-red-100"
                >
                  <RefreshCw className="h-3.5 w-3.5" /> Retry
                </button>
                <button
                  onClick={() => setFailedRequest(null)}
                  className="rounded p-0.5 text-red-500 transition hover:bg-red-100"
                  aria-label="Dismiss send error"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>

        {showJumpToLatest && (
          <button
            onClick={() => scrollToLatest()}
            className="absolute bottom-28 right-4 z-10 inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-lg transition hover:border-blue-200 hover:text-blue-700 sm:right-6"
          >
            <ArrowDown className="h-3.5 w-3.5" /> Latest
          </button>
        )}

        {messages.length <= 1 && !typing && (
          <div className="border-t border-slate-100 bg-white/90 px-4 pt-3 sm:px-6">
            <p className="mb-2 text-xs font-medium text-slate-400">Try asking:</p>
            <div className="flex max-h-20 flex-wrap gap-2 overflow-y-auto pb-3">
              {SUGGESTED_QUESTIONS.map((question) => (
                <button
                  key={question}
                  onClick={() => void send(question)}
                  className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-blue-50 hover:text-blue-700"
                >
                  {question}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="border-t border-slate-200 bg-white p-3 sm:p-4">
          {selectedFile && (
            <div className="mb-3 flex max-w-full items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-blue-800">
              <FileText className="h-4 w-4 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold">{selectedFile.name}</p>
                <p className="text-[10px] text-blue-600">{formatFileSize(selectedFile.size)} · ready to review</p>
              </div>
              <button
                onClick={() => setSelectedFile(null)}
                className="rounded p-0.5 transition hover:bg-blue-100"
                aria-label="Remove attachment"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          <div className="flex items-end gap-2">
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={(event) => {
                chooseFile(event.target.files?.[0]);
                event.currentTarget.value = '';
              }}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={typing}
              className="rounded-xl border border-slate-200 p-3 text-slate-500 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Attach a file"
              title="Attach a file (up to 15 MB)"
            >
              <Paperclip className="h-5 w-5" />
            </button>
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
                  event.preventDefault();
                  void send(input);
                }
              }}
              rows={1}
              maxLength={4000}
              placeholder={selectedFile ? 'Ask something about this file…' : 'Ask about your finances…'}
              className="min-h-[48px] max-h-36 flex-1 resize-none rounded-xl border border-slate-200 px-3.5 py-3 text-sm leading-5 text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50"
              aria-label="Message AI CFO"
            />
            <button
              onClick={() => void send(input)}
              disabled={typing || (!input.trim() && !selectedFile)}
              className="rounded-xl bg-blue-600 p-3 text-white shadow-sm shadow-blue-200 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none"
              aria-label="Send message"
            >
              <Send className="h-5 w-5" />
            </button>
          </div>
          <div className="mt-2 flex items-center justify-between gap-3 px-1 text-[10px] text-slate-400">
            <p>Enter to send · Shift + Enter for a new line</p>
            <p className={input.length > 3600 ? 'text-amber-600' : ''}>{input.length}/4000</p>
          </div>
          <p className="mt-1.5 text-center text-[10px] leading-4 text-slate-400">
            Guidance is based on your recorded data and is not financial or tax advice. Attachments are not imported into your ledgers.
          </p>
        </div>
      </Card>
    </div>
  );
}
