'use client'

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { Components } from 'react-markdown'

const components: Components = {
  h1: ({ children }) => (
    <h1 className="text-lg font-serif font-bold text-primary mt-4 mb-2">{children}</h1>
  ),
  h2: ({ children }) => (
    <h2 className="text-base font-bold text-primary mt-3 mb-1.5">{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 className="text-sm font-bold text-primary mt-2 mb-1">{children}</h3>
  ),
  strong: ({ children }) => (
    <strong className="font-bold text-primary">{children}</strong>
  ),
  em: ({ children }) => (
    <em className="italic text-accent">{children}</em>
  ),
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-amber-500 hover:text-amber-400 underline underline-offset-2"
    >
      {children}
    </a>
  ),
  ul: ({ children }) => (
    <ul className="list-disc list-inside space-y-1 my-2 ml-1">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="list-decimal list-inside space-y-1 my-2 ml-1">{children}</ol>
  ),
  li: ({ children }) => (
    <li className="leading-relaxed">{children}</li>
  ),
  code: ({ className, children }) => {
    const isBlock = className?.includes('language-')
    if (isBlock) {
      return (
        <code className="block bg-black/60 text-accent rounded px-3 py-2 text-xs overflow-x-auto border border-primary/10">
          {children}
        </code>
      )
    }
    return (
      <code className="bg-black/40 text-accent rounded px-1.5 py-0.5 text-xs">
        {children}
      </code>
    )
  },
  pre: ({ children }) => (
    <pre className="my-2 overflow-x-auto">{children}</pre>
  ),
  table: ({ children }) => (
    <div className="my-2 overflow-x-auto">
      <table className="w-full text-xs border-collapse border border-primary/30">
        {children}
      </table>
    </div>
  ),
  thead: ({ children }) => (
    <thead className="bg-primary/10">{children}</thead>
  ),
  th: ({ children }) => (
    <th className="border border-primary/20 px-2 py-1 text-left font-bold text-primary">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="border border-primary/20 px-2 py-1">{children}</td>
  ),
  blockquote: ({ children }) => (
    <blockquote className="border-l-2 border-accent/50 pl-3 my-2 text-muted-foreground italic">
      {children}
    </blockquote>
  ),
  hr: () => <hr className="border-primary/20 my-3" />,
  p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
}

export function MarkdownMessage({ content }: { content: string }) {
  return (
    <div className="text-sm font-mono leading-relaxed smalls-response prose-none">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </ReactMarkdown>
    </div>
  )
}
