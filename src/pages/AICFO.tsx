import { useEffect, useRef, useState } from 'react';
import {
  BrainCircuit,
  Download,
  FileText,
  ImagePlus,
  Paperclip,
  RotateCcw,
  Send,
  Sparkles,
  User,
  X,
} from 'lucide-react';
import { Card } from '@/components/ui';
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
  imageUrl?: string;
  imagePrompt?: string;
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
    "Hello! I'm your AI CFO. I analyze your business financials in real time. Ask about your finances, attach a file for analysis, or switch on image creation to generate an image in this chat.",
  timestamp: new Date().toISOString(),
};

const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export default function AICFO() {
  const { addToast } = useToast();
  const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const [sessionId, setSessionId] = useState<string | undefined>();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imageMode, setImageMode] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, typing]);

  const send = async (text: string) => {
    const trimmed = text.trim();
    const file = selectedFile;
    const generatingImage = imageMode;
    if (typing || (generatingImage ? !trimmed : !trimmed && !file)) return;

    const effectiveMessage = trimmed || 'Analyze the attached file and explain the important findings.';
    const userMsg: Message = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: generatingImage ? `Create an image: ${effectiveMessage}` : effectiveMessage,
      timestamp: new Date().toISOString(),
      attachment: file
        ? { name: file.name, size: file.size, type: file.type || 'application/octet-stream' }
        : undefined,
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setSelectedFile(null);
    setImageMode(false);
    setTyping(true);

    try {
      if (generatingImage) {
        const image = await aiCfoService.generateImage(effectiveMessage);
        const aiMsg: Message = {
          id: `a-${Date.now()}`,
          role: 'assistant',
          content: `Image generated with ${image.model}.`,
          imageUrl: image.imageUrl,
          imagePrompt: image.revisedPrompt,
          timestamp: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, aiMsg]);
      } else {
        const reply = await aiCfoService.sendMessage(effectiveMessage, sessionId, file || undefined);
        setSessionId(reply.sessionId);
        const aiMsg: Message = {
          id: `a-${Date.now()}`,
          role: 'assistant',
          content: reply.content,
          timestamp: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, aiMsg]);
      }
    } catch (error) {
      const errorMessage = getErrorMessage(error);
      addToast(errorMessage, 'error');
      const aiMsg: Message = {
        id: `a-${Date.now()}`,
        role: 'assistant',
        content: generatingImage
          ? `Sorry, I couldn't generate that image. ${errorMessage}`
          : `Sorry, I couldn't analyze that request. ${errorMessage}`,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, aiMsg]);
    } finally {
      setTyping(false);
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
    setImageMode(false);
  };

  const reset = () => {
    setMessages([{ ...WELCOME_MESSAGE, timestamp: new Date().toISOString() }]);
    setSessionId(undefined);
    setSelectedFile(null);
    setImageMode(false);
    setInput('');
    setTyping(false);
  };

  const renderContent = (content: string) => {
    const parts = content.split('**');
    return parts.map((part, index) =>
      index % 2 === 1 ? (
        <strong key={index} className="font-semibold text-slate-900">
          {part}
        </strong>
      ) : (
        <span key={index} className="whitespace-pre-line">
          {part}
        </span>
      )
    );
  };

  return (
    <div className="space-y-4 h-[calc(100vh-8rem)] flex flex-col">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-sm shrink-0">
            <BrainCircuit className="w-6 h-6 text-white" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-slate-900 truncate">AI CFO Assistant</h1>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse shrink-0" />
              <span className="text-xs text-slate-500 truncate">Online — chat, files and image creation</span>
            </div>
          </div>
        </div>
        <button
          onClick={reset}
          className="inline-flex items-center gap-2 px-3 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition shrink-0"
          aria-label="Reset chat"
        >
          <RotateCcw className="w-4 h-4" /> <span className="hidden sm:inline">Reset chat</span>
        </button>
      </div>

      <Card className="flex-1 flex flex-col overflow-hidden min-h-0">
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in`}>
              <div
                className={`flex items-start gap-2.5 max-w-[92%] sm:max-w-[78%] ${
                  msg.role === 'user' ? 'flex-row-reverse' : ''
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                    msg.role === 'user' ? 'bg-slate-700' : 'bg-blue-600'
                  }`}
                >
                  {msg.role === 'user' ? <User className="w-4 h-4 text-white" /> : <Sparkles className="w-4 h-4 text-white" />}
                </div>
                <div
                  className={`px-4 py-3 rounded-2xl text-sm leading-relaxed min-w-0 ${
                    msg.role === 'user'
                      ? 'bg-blue-600 text-white rounded-tr-sm'
                      : 'bg-slate-100 text-slate-700 rounded-tl-sm'
                  }`}
                >
                  {msg.attachment && (
                    <div
                      className={`flex items-center gap-2 rounded-lg px-3 py-2 mb-2 ${
                        msg.role === 'user' ? 'bg-blue-500/70' : 'bg-white'
                      }`}
                    >
                      <FileText className="w-4 h-4 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs font-medium truncate">{msg.attachment.name}</p>
                        <p className={`text-[10px] ${msg.role === 'user' ? 'text-blue-100' : 'text-slate-400'}`}>
                          {formatFileSize(msg.attachment.size)}
                        </p>
                      </div>
                    </div>
                  )}
                  {renderContent(msg.content)}
                  {msg.imageUrl && (
                    <div className="mt-3 space-y-2">
                      <img
                        src={msg.imageUrl}
                        alt={msg.imagePrompt || 'AI-generated image'}
                        className="w-full max-h-[520px] object-contain rounded-xl border border-slate-200 bg-white"
                      />
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-[10px] text-slate-400 line-clamp-2">{msg.imagePrompt}</p>
                        <a
                          href={msg.imageUrl}
                          download={`ai-cfo-image-${Date.now()}.png`}
                          className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700 shrink-0"
                        >
                          <Download className="w-3.5 h-3.5" /> Download
                        </a>
                      </div>
                    </div>
                  )}
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

        {messages.length <= 1 && (
          <div className="px-4 sm:px-6 pb-3">
            <p className="text-xs text-slate-400 mb-2">Try asking:</p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTED_QUESTIONS.map((question) => (
                <button
                  key={question}
                  onClick={() => send(question)}
                  className="px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-blue-50 hover:text-blue-700 rounded-full transition"
                >
                  {question}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="p-4 border-t border-slate-100">
          {selectedFile && (
            <div className="mb-2 inline-flex max-w-full items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-blue-700">
              <FileText className="w-4 h-4 shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-medium truncate">{selectedFile.name}</p>
                <p className="text-[10px] text-blue-500">{formatFileSize(selectedFile.size)} · ready to analyze</p>
              </div>
              <button onClick={() => setSelectedFile(null)} className="p-0.5 hover:bg-blue-100 rounded" aria-label="Remove attachment">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {imageMode && (
            <div className="mb-2 flex items-center justify-between gap-3 rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-violet-700">
              <div className="flex items-center gap-2 text-xs font-medium">
                <ImagePlus className="w-4 h-4" /> Image creation mode — describe the image you want
              </div>
              <button onClick={() => setImageMode(false)} className="p-0.5 hover:bg-violet-100 rounded" aria-label="Exit image mode">
                <X className="w-3.5 h-3.5" />
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
              className="p-3 rounded-xl border border-slate-200 text-slate-500 hover:text-blue-600 hover:border-blue-300 hover:bg-blue-50 disabled:opacity-50 transition"
              aria-label="Attach a file"
              title="Attach a file (up to 15 MB)"
            >
              <Paperclip className="w-5 h-5" />
            </button>
            <button
              onClick={() => {
                setImageMode((current) => !current);
                setSelectedFile(null);
              }}
              disabled={typing}
              className={`p-3 rounded-xl border transition disabled:opacity-50 ${
                imageMode
                  ? 'border-violet-300 bg-violet-100 text-violet-700'
                  : 'border-slate-200 text-slate-500 hover:text-violet-600 hover:border-violet-300 hover:bg-violet-50'
              }`}
              aria-label="Create an image"
              title="Create an image"
            >
              <ImagePlus className="w-5 h-5" />
            </button>
            <textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault();
                  send(input);
                }
              }}
              rows={1}
              placeholder={imageMode ? 'Describe the image to create…' : selectedFile ? 'Ask something about this file…' : 'Ask about your finances…'}
              className="flex-1 min-h-[46px] max-h-32 resize-y px-4 py-3 border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition"
            />
            <button
              onClick={() => send(input)}
              disabled={typing || (imageMode ? !input.trim() : !input.trim() && !selectedFile)}
              className={`p-3 rounded-xl disabled:bg-slate-200 disabled:cursor-not-allowed text-white transition ${
                imageMode ? 'bg-violet-600 hover:bg-violet-700' : 'bg-blue-600 hover:bg-blue-700'
              }`}
              aria-label={imageMode ? 'Generate image' : 'Send message'}
            >
              {imageMode ? <Sparkles className="w-5 h-5" /> : <Send className="w-5 h-5" />}
            </button>
          </div>
          <p className="text-[10px] text-slate-400 mt-2 text-center">
            Files are analyzed in chat and are not imported into your ledgers. AI guidance and generated images should be reviewed before use.
          </p>
        </div>
      </Card>
    </div>
  );
}
