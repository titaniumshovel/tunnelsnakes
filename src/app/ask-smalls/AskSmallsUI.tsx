'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getManagerByEmail, type Manager } from '@/data/managers'
import { MarkdownMessage } from '@/components/MarkdownMessage'

// ─── Types ────────────────────────────────────────────────
type Message = {
  id: string
  role: 'user' | 'assistant'
  content: string
}

const SUGGESTED_QUESTIONS = [
  'What are my best keeper values?',
  'Who has the most draft picks?',
  'Analyze the Alex-Mike Mookie trade',
  'What players are returning to the draft pool?',
  'Who should I target in round 5?',
  'Which team made the most trades?',
]

const RATE_LIMIT_KEY = 'ask-smalls-usage'
const MAX_PER_DAY = 20

function getTodayKey() {
  return new Date().toISOString().slice(0, 10)
}

function getUsageToday(): number {
  try {
    const data = JSON.parse(localStorage.getItem(RATE_LIMIT_KEY) ?? '{}')
    const today = getTodayKey()
    return data[today] ?? 0
  } catch {
    return 0
  }
}

function incrementUsage(): number {
  const today = getTodayKey()
  try {
    const data = JSON.parse(localStorage.getItem(RATE_LIMIT_KEY) ?? '{}')
    // Clean old days
    const cleaned: Record<string, number> = { [today]: (data[today] ?? 0) + 1 }
    localStorage.setItem(RATE_LIMIT_KEY, JSON.stringify(cleaned))
    return cleaned[today]
  } catch {
    return 1
  }
}

// ─── Component ────────────────────────────────────────────
export function AskSmallsUI() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [manager, setManager] = useState<Manager | null>(null)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [usage, setUsage] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  // Auth check
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user?.email) {
        setUserEmail(user.email)
        const mgr = getManagerByEmail(user.email)
        setManager(mgr ?? null)
      }
    })
  }, [])

  // Load usage
  useEffect(() => {
    setUsage(getUsageToday())
  }, [])

  // Auto-scroll only if user is near the bottom (not scrolling up to read)
  const chatContainerRef = useRef<HTMLDivElement>(null)
  const userScrolledUp = useRef(false)

  useEffect(() => {
    const container = chatContainerRef.current
    if (!container) return
    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container
      userScrolledUp.current = scrollHeight - scrollTop - clientHeight > 150
    }
    container.addEventListener('scroll', handleScroll)
    return () => container.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    if (!userScrolledUp.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isStreaming) return
    if (usage >= MAX_PER_DAY) {
      setError("You've hit the daily limit of 20 questions. Come back tomorrow! 🧢")
      return
    }

    setError(null)
    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text.trim(),
    }

    const assistantMsg: Message = {
      id: `assistant-${Date.now()}`,
      role: 'assistant',
      content: '',
    }

    setMessages(prev => [...prev, userMsg, assistantMsg])
    setInput('')
    setIsStreaming(true)

    const newUsage = incrementUsage()
    setUsage(newUsage)

    // Build messages for API (only role + content)
    const apiMessages = [...messages, userMsg].map(m => ({
      role: m.role,
      content: m.content,
    }))

    try {
      abortRef.current = new AbortController()

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: apiMessages,
          userEmail: userEmail ?? undefined,
        }),
        signal: abortRef.current.signal,
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(errData.error ?? `Error ${res.status}`)
      }

      const reader = res.body?.getReader()
      if (!reader) throw new Error('No response stream')

      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed.startsWith('data: ')) continue
          const data = trimmed.slice(6)
          if (data === '[DONE]') continue

          try {
            const parsed = JSON.parse(data)
            if (parsed.content) {
              setMessages(prev => {
                const updated = [...prev]
                const last = updated[updated.length - 1]
                if (last && last.role === 'assistant') {
                  updated[updated.length - 1] = {
                    ...last,
                    content: last.content + parsed.content,
                  }
                }
                return updated
              })
            }
          } catch {
            // Skip malformed
          }
        }
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return
      const message = err instanceof Error ? err.message : 'Something went wrong'
      setError(message)
      // Remove empty assistant message on error
      setMessages(prev => {
        const last = prev[prev.length - 1]
        if (last?.role === 'assistant' && !last.content) {
          return prev.slice(0, -1)
        }
        return prev
      })
    } finally {
      setIsStreaming(false)
      abortRef.current = null
    }
  }, [isStreaming, messages, usage, userEmail])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    sendMessage(input)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  const remaining = MAX_PER_DAY - usage

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)] max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-primary/20">
        <div className="flex items-center gap-3">
          <span className="text-3xl">🧢</span>
          <div>
            <h1 className="text-lg font-serif font-bold text-primary">
              ASK SMALLS
            </h1>
            <p className="text-xs font-mono text-muted-foreground">
              Your AI league expert — powered by knowledge, not guesswork
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {manager && (
            <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono font-bold bg-primary/10 text-primary border border-primary/20">
              📊 {manager.teamName}
            </span>
          )}
          <span className={`px-2 py-1 rounded text-xs font-mono font-bold ${
            remaining > 5
              ? 'bg-secondary/15 text-secondary border border-secondary/30'
              : remaining > 0
              ? 'bg-yellow-900/30 text-yellow-400 border border-yellow-500/20'
              : 'bg-red-900/30 text-red-400 border border-red-500/20'
          }`}>
            {remaining}/{MAX_PER_DAY}
          </span>
        </div>
      </div>

      {/* Messages Area */}
      <div ref={chatContainerRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-6 pb-8">
            <div className="text-center">
              <span className="text-6xl block mb-4">🧢</span>
              <h2 className="text-xl font-serif font-bold text-primary mb-2">
                Hey there! I&apos;m Smalls.
              </h2>
              <p className="text-sm font-mono text-muted-foreground max-w-md">
                I know everything about The Sandlot — rosters, keepers, trades,
                draft picks, you name it. Heroes get remembered, but legends never die.
              </p>
            </div>

            {/* Suggested Questions */}
            <div className="flex flex-wrap justify-center gap-2 max-w-lg">
              {SUGGESTED_QUESTIONS.map((q) => (
                <button
                  key={q}
                  onClick={() => sendMessage(q)}
                  disabled={isStreaming}
                  className="px-3 py-1.5 rounded-full text-xs font-mono border border-primary/30 text-primary/80 hover:text-primary hover:border-primary/60 hover:bg-primary/5 hover:shadow-[0_0_10px_hsl(121_99%_54%/0.1)] transition-all duration-200 disabled:opacity-40"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] sm:max-w-[75%] rounded-lg px-4 py-3 ${
                msg.role === 'user'
                  ? 'bg-amber-900/40 border border-amber-500/30 text-amber-100'
                  : 'bg-secondary/10 border border-secondary/20 text-foreground shadow-[0_0_15px_hsl(var(--secondary)/0.05)]'
              }`}
            >
              {msg.role === 'assistant' && (
                <div className="flex items-center gap-1.5 mb-1.5">
                  <span className="text-sm">🧢</span>
                  <span className="text-xs font-mono font-bold text-secondary">Smalls</span>
                </div>
              )}
              {msg.role === 'assistant' ? (
                <>
                  {msg.content ? (
                    <MarkdownMessage content={msg.content} />
                  ) : isStreaming ? (
                    <div className="text-sm font-mono"><TypingIndicator /></div>
                  ) : null}
                </>
              ) : (
                <div className="text-sm font-mono leading-relaxed whitespace-pre-wrap">
                  {msg.content}
                </div>
              )}
            </div>
          </div>
        ))}

        {error && (
          <div className="flex justify-center">
            <div className="px-4 py-2 rounded-lg bg-red-900/30 border border-red-500/30 text-red-300 text-xs font-mono">
              ⚠️ {error}
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t border-primary/20 px-4 py-3 bg-background/80 backdrop-blur">
        <form onSubmit={handleSubmit} className="flex items-end gap-2 max-w-4xl mx-auto">
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={remaining > 0 ? "Ask me anything about The Sandlot..." : "Daily limit reached — come back tomorrow!"}
              disabled={isStreaming || remaining <= 0}
              rows={1}
              className="w-full resize-none rounded-lg bg-card border border-primary/20 px-4 py-3 text-sm font-mono text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 focus:shadow-[0_0_10px_hsl(121_99%_54%/0.1)] disabled:opacity-50 transition-all"
              style={{ minHeight: '44px', maxHeight: '120px' }}
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement
                target.style.height = 'auto'
                target.style.height = Math.min(target.scrollHeight, 120) + 'px'
              }}
            />
          </div>
          <button
            type="submit"
            disabled={!input.trim() || isStreaming || remaining <= 0}
            className="shrink-0 h-11 w-11 rounded-lg bg-primary/20 border border-primary/30 text-primary hover:bg-primary/30 hover:border-primary/50 hover:shadow-[0_0_15px_hsl(121_99%_54%/0.2)] disabled:opacity-30 disabled:hover:bg-primary/20 disabled:hover:border-primary/30 disabled:hover:shadow-none transition-all duration-200 flex items-center justify-center"
          >
            {isStreaming ? (
              <span className="inline-block w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            ) : (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
              </svg>
            )}
          </button>
        </form>
        <div className="mt-1.5 text-center">
          <span className="text-[10px] font-mono text-muted-foreground/40">
            Smalls can make mistakes. Verify important draft decisions.
          </span>
        </div>
      </div>
    </div>
  )
}

function TypingIndicator() {
  return (
    <span className="inline-flex items-center gap-1">
      <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-bounce" style={{ animationDelay: '0ms' }} />
      <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-bounce" style={{ animationDelay: '150ms' }} />
      <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-bounce" style={{ animationDelay: '300ms' }} />
    </span>
  )
}
