import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '@/utils/cn';

type MessageTone = 'assistant' | 'user';

interface ChatMarkdownProps {
  content: string;
  tone?: MessageTone;
  className?: string;
}

export function ChatMarkdown({ content, tone = 'assistant', className }: ChatMarkdownProps) {
  const assistant = tone === 'assistant';
  const components: Components = {
    h1: ({ children }) => (
      <h1 className={cn('mb-3 mt-1 text-lg font-bold tracking-tight', assistant ? 'text-slate-950 dark:text-white' : 'text-white')}>
        {children}
      </h1>
    ),
    h2: ({ children }) => (
      <h2 className={cn('mb-2.5 mt-4 text-base font-bold tracking-tight first:mt-0', assistant ? 'text-slate-900 dark:text-white' : 'text-white')}>
        {children}
      </h2>
    ),
    h3: ({ children }) => (
      <h3 className={cn('mb-2 mt-3 text-sm font-bold', assistant ? 'text-slate-800 dark:text-slate-100' : 'text-white')}>
        {children}
      </h3>
    ),
    h4: ({ children }) => (
      <h4 className={cn('mb-1.5 mt-3 text-sm font-semibold', assistant ? 'text-slate-800 dark:text-slate-100' : 'text-white')}>
        {children}
      </h4>
    ),
    p: ({ children }) => <p className={cn('my-2 leading-6 first:mt-0 last:mb-0', assistant ? 'text-slate-700 dark:text-slate-200' : 'text-white')}>{children}</p>,
    strong: ({ children }) => (
      <strong
        className={cn(
          'inline rounded-md px-1 py-0.5 font-semibold',
          assistant ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 ring-1 ring-inset ring-blue-100 dark:ring-blue-900' : 'bg-white/15 text-white'
        )}
      >
        {children}
      </strong>
    ),
    em: ({ children }) => <em className={assistant ? 'text-slate-600 dark:text-slate-300' : 'text-blue-50'}>{children}</em>,
    ul: ({ children }) => <ul className="my-2 list-disc space-y-1.5 pl-5 marker:text-blue-500">{children}</ul>,
    ol: ({ children }) => <ol className="my-2 list-decimal space-y-1.5 pl-5 marker:font-semibold marker:text-blue-600 dark:marker:text-blue-400">{children}</ol>,
    li: ({ children }) => <li className={cn('pl-0.5 leading-6', assistant ? 'text-slate-700 dark:text-slate-200' : 'text-white')}>{children}</li>,
    blockquote: ({ children }) => (
      <blockquote
        className={cn(
          'my-3 border-l-4 py-1 pl-3 text-sm leading-6',
          assistant ? 'border-amber-400 dark:border-amber-500 bg-amber-50/80 dark:bg-amber-950/30 text-slate-700 dark:text-slate-200' : 'border-white/60 bg-white/10 text-blue-50'
        )}
      >
        {children}
      </blockquote>
    ),
    hr: () => <hr className={cn('my-4 border-0 border-t', assistant ? 'border-slate-200 dark:border-slate-700' : 'border-white/25')} />,
    table: ({ children }) => (
      <div className={cn('my-3 max-w-full overflow-x-auto rounded-lg border', assistant ? 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900' : 'border-white/20')}>
        <table className="w-full min-w-[360px] border-collapse text-left text-xs leading-5 text-slate-700 dark:text-slate-200">{children}</table>
      </div>
    ),
    thead: ({ children }) => (
      <thead className={assistant ? 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold' : 'bg-white/15 text-white'}>{children}</thead>
    ),
    th: ({ children }) => <th className="whitespace-nowrap border-b border-inherit px-3 py-2 font-semibold">{children}</th>,
    td: ({ children }) => <td className="border-b border-inherit px-3 py-2 align-top last:border-b-0">{children}</td>,
    tr: ({ children }) => <tr className={assistant ? 'even:bg-slate-50/70 dark:even:bg-slate-800/40' : 'even:bg-white/5'}>{children}</tr>,
    code: ({ children }) => (
      <code
        className={cn(
          'rounded px-1.5 py-0.5 font-mono text-[0.82em]',
          assistant ? 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200' : 'bg-slate-950/20 text-white'
        )}
      >
        {children}
      </code>
    ),
    pre: ({ children }) => (
      <pre className={cn('my-3 overflow-x-auto rounded-lg p-3 text-xs leading-5', assistant ? 'bg-slate-900 dark:bg-slate-950 text-slate-100' : 'bg-slate-950/30 text-white')}>
        {children}
      </pre>
    ),
    a: ({ href, children }) => (
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        className={cn('font-medium underline underline-offset-2', assistant ? 'text-blue-700 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300' : 'text-white hover:text-blue-100')}
      >
        {children}
      </a>
    ),
  };

  return (
    <div className={cn('chat-markdown break-words', className)}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components} skipHtml>
        {content}
      </ReactMarkdown>
    </div>
  );
}
