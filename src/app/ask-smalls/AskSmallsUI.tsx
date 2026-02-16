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

type Conversation = {
  id: string
  title: string
  updated_at: string
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
    const cleaned: Record<string, number> = { [today]: (data[today] ?? 0) + 1 }
    localStorage.setItem(RATE_LIMIT_KEY, JSON.stringify(cleaned))
    return cleaned[today]
  } catch {
    return 1
  }
}

function relativeTime(dateStr: string): string {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diff = now - then
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days}d ago`
  const weeks = Math.floor(days / 7)
  if (weeks < 4) return `${weeks}w ago`
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// ─── Component ────────────────────────────────────────────
export function AskSmallsUI() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [manager, setManager] = useState<Manager | null>(null)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [usage, setUsage] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  // Conversation state
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [loadingConversations, setLoadingConversations] = useState(false)

  const isLoggedIn = !!userId

  // Auth check
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user?.email) {
        setUserEmail(user.email)
        setUserId(user.id)
        const mgr = getManagerByEmail(user.email)
        setManager(mgr ?? null)
      }
    })
  }, [])

  // Load conversations on mount (logged in only)
  useEffect(() => {
    if (!userId) return
    loadConversations()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])

  const loadConversations = useCallback(async () => {
    if (!userId) return
    setLoadingConversations(true)
    try {
      const supabase = createClient()
      const { data, error: err } = await supabase
        .from('chat_conversations')
        .select('id, title, updated_at')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false })
        .limit(50)

      if (err) {
        console.error('Failed to load conversations:', err)
        return
      }
      setConversations(data ?? [])
    } finally {
      setLoadingConversations(false)
    }
  }, [userId])

  // Load usage
  useEffect(() => {
    setUsage(getUsageToday())
  }, [])

  // Auto-scroll only if user is near the bottom
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

  // Load messages for a conversation
  const loadConversationMessages = useCallback(async (conversationId: string) => {
    const supabase = createClient()
    const { data, error: err } = await supabase
      .from('chat_messages')
      .select('id, role, content, created_at')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })

    if (err) {
      console.error('Failed to load messages:', err)
      return
    }

    const msgs: Message[] = (data ?? []).map(m => ({
      id: m.id,
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }))
    setMessages(msgs)
    setActiveConversationId(conversationId)
    setError(null)
    // Close sidebar on mobile after selecting
    if (window.innerWidth < 768) {
      setSidebarOpen(false)
    }
  }, [])

  // Start a new chat
  const startNewChat = useCallback(() => {
    setActiveConversationId(null)
    setMessages([])
    setError(null)
    if (window.innerWidth < 768) {
      setSidebarOpen(false)
    }
  }, [])

  // Delete a conversation
  const deleteConversation = useCallback(async (conversationId: string) => {
    const supabase = createClient()
    const { error: err } = await supabase
      .from('chat_conversations')
      .delete()
      .eq('id', conversationId)

    if (err) {
      console.error('Failed to delete conversation:', err)
      return
    }

    setConversations(prev => prev.filter(c => c.id !== conversationId))
    if (activeConversationId === conversationId) {
      setActiveConversationId(null)
      setMessages([])
    }
    setDeleteConfirmId(null)
  }, [activeConversationId])

  // Save a message to Supabase
  const saveMessage = useCallback(async (conversationId: string, role: 'user' | 'assistant', content: string) => {
    const supabase = createClient()
    await supabase
      .from('chat_messages')
      .insert({ conversation_id: conversationId, role, content })

    // Update conversation's updated_at
    await supabase
      .from('chat_conversations')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', conversationId)
  }, [])

  // Create a new conversation in Supabase
  const createConversation = useCallback(async (title: string): Promise<string | null> => {
    if (!userId) return null
    const supabase = createClient()
    const { data, error: err } = await supabase
      .from('chat_conversations')
      .insert({ user_id: userId, title: title.slice(0, 50) })
      .select('id')
      .single()

    if (err || !data) {
      console.error('Failed to create conversation:', err)
      return null
    }
    return data.id
  }, [userId])

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

    // If logged in and no active conversation, create one
    let convId = activeConversationId
    if (isLoggedIn && !convId) {
      convId = await createConversation(text.trim())
      if (convId) {
        setActiveConversationId(convId)
        // Add to conversation list
        setConversations(prev => [
          { id: convId!, title: text.trim().slice(0, 50), updated_at: new Date().toISOString() },
          ...prev,
        ])
      }
    }

    // Save user message
    if (isLoggedIn && convId) {
      saveMessage(convId, 'user', text.trim())
    }

    // Build messages for API (only role + content)
    const apiMessages = [...messages, userMsg].map(m => ({
      role: m.role,
      content: m.content,
    }))

    let fullAssistantContent = ''

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
              fullAssistantContent += parsed.content
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

      // Save assistant message after streaming completes
      if (isLoggedIn && convId && fullAssistantContent) {
        saveMessage(convId, 'assistant', fullAssistantContent)
        // Update conversation list timestamp
        setConversations(prev =>
          prev.map(c =>
            c.id === convId ? { ...c, updated_at: new Date().toISOString() } : c
          )
        )
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
  }, [isStreaming, messages, usage, userEmail, activeConversationId, isLoggedIn, createConversation, saveMessage])

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
    <div className="flex h-[calc(100vh-3.5rem)]">
      {/* Sidebar overlay for mobile */}
      {isLoggedIn && sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar — logged in only */}
      {isLoggedIn && (
        <aside
          className={`
            fixed md:relative z-40 md:z-auto
            top-0 left-0 h-full md:h-auto
            w-[280px] md:w-[260px] shrink-0
            bg-card border-r border-primary/20
            flex flex-col
            transition-transform duration-200 ease-in-out
            ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
          `}
        >
          {/* Sidebar header */}
          <div className="px-3 py-3 border-b border-primary/20">
            <button
              onClick={startNewChat}
              className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg bg-accent text-accent-foreground font-mono text-sm font-bold hover:bg-accent/80 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              New Chat
            </button>
          </div>

          {/* Conversation list */}
          <div className="flex-1 overflow-y-auto py-2">
            {loadingConversations ? (
              <div className="px-3 py-4 text-center">
                <span className="text-xs font-mono text-muted-foreground">Loading...</span>
              </div>
            ) : conversations.length === 0 ? (
              <div className="px-3 py-4 text-center">
                <span className="text-xs font-mono text-muted-foreground/60">
                  No conversations yet
                </span>
              </div>
            ) : (
              conversations.map(conv => (
                <div
                  key={conv.id}
                  className={`
                    group relative flex items-center gap-2 px-3 py-2.5 mx-1 rounded-md cursor-pointer
                    transition-colors duration-150
                    ${activeConversationId === conv.id
                      ? 'bg-primary/10 border-l-2 border-primary'
                      : 'hover:bg-primary/5 border-l-2 border-transparent'
                    }
                  `}
                  onClick={() => loadConversationMessages(conv.id)}
                >
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-mono truncate ${
                      activeConversationId === conv.id
                        ? 'text-primary font-bold'
                        : 'text-foreground'
                    }`}>
                      {conv.title}
                    </p>
                    <p className="text-[10px] font-mono text-muted-foreground/60 mt-0.5">
                      {relativeTime(conv.updated_at)}
                    </p>
                  </div>

                  {/* Delete button */}
                  {deleteConfirmId === conv.id ? (
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={(e) => { e.stopPropagation(); deleteConversation(conv.id) }}
                        className="p-1 rounded text-red-400 hover:bg-red-500/20 transition-colors"
                        title="Confirm delete"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(null) }}
                        className="p-1 rounded text-muted-foreground hover:bg-muted/20 transition-colors"
                        title="Cancel"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(conv.id) }}
                      className="p-1 rounded text-muted-foreground/40 hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all shrink-0"
                      title="Delete conversation"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Sidebar footer */}
          <div className="px-3 py-2 border-t border-primary/20">
            <span className="text-[10px] font-mono text-muted-foreground/40">
              {conversations.length} conversation{conversations.length !== 1 ? 's' : ''}
            </span>
          </div>
        </aside>
      )}

      {/* Main chat area */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-primary/20">
          <div className="flex items-center gap-3">
            {/* Mobile sidebar toggle */}
            {isLoggedIn && (
              <button
                onClick={() => setSidebarOpen(prev => !prev)}
                className="md:hidden p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-primary/5 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            )}
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
