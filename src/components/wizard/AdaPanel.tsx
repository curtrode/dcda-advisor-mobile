import { useRef, useEffect, useState, useCallback, type FormEvent } from 'react'
import { X, Send, ThumbsUp, ThumbsDown, ChevronDown, Trash2 } from 'lucide-react'

const ADA_API_URL = import.meta.env.VITE_SANDRA_API_URL || 'http://127.0.0.1:5001/addran-advisor-9125e/us-central1/api'
const ADA_FEEDBACK_URL = import.meta.env.VITE_SANDRA_FEEDBACK_URL || 'http://127.0.0.1:5001/addran-advisor-9125e/us-central1/feedback'

// --- Prompt chip pools ---

const WIZARD_PROMPT_POOLS: Record<string, Array<{ label: string; prompt: string }>> = {
  comSci: [
    { label: "What should I take next?", prompt: "Based on what I've completed, what courses should I take next?" },
    { label: "Am I on track?", prompt: "Am I on track to graduate on time?" },
    { label: "Elective ideas", prompt: "What electives do you recommend for my major?" },
    { label: "Career paths", prompt: "What careers can I pursue with a Computer Science degree?" },
    { label: "Double major?", prompt: "Can I double major or add a minor?" },
  ],
  dataSci: [
    { label: "What should I take next?", prompt: "Based on what I've completed, what courses should I take next?" },
    { label: "Am I on track?", prompt: "Am I on track to graduate on time?" },
    { label: "Elective ideas", prompt: "What electives do you recommend for Data Science?" },
    { label: "Career paths", prompt: "What careers can I pursue with a Data Science degree?" },
  ],
}

const WIZARD_PROMPT_FALLBACK = [
  { label: "What should I take next?", prompt: "Based on what I've completed, what courses should I take next?" },
  { label: "Am I on track?", prompt: "Am I on track to graduate on time?" },
  { label: "Elective ideas", prompt: "What electives do you recommend for my major?" },
  { label: "Career paths", prompt: "What careers can I pursue with my degree?" },
]

// --- Types ---

interface ProgramMention {
  name: string
  degree: string
  totalHours: number
  url: string
  description: string
  careerOptions: string[]
  contacts: Array<{ role: string; name: string; email: string }>
}

interface Message {
  role: 'user' | 'assistant'
  content: string
  programMentions?: ProgramMention[]
}

interface AdaPanelProps {
  open: boolean
  onClose: () => void
  wizardContext: string | null
  programName: string | null
  programId: string | null
  department?: string
}

// --- Helpers ---

function getSessionId(): string {
  let id = localStorage.getItem('ada-session-id')
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem('ada-session-id', id)
  }
  return id
}

function getPromptChips(programId: string | null): Array<{ label: string; prompt: string }> {
  const pool = (programId && WIZARD_PROMPT_POOLS[programId]) || WIZARD_PROMPT_FALLBACK
  const shuffled = [...pool].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, 4)
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function formatMarkdown(text: string): string {
  let html = escapeHtml(text)

  // URLs → links
  html = html.replace(
    /(https?:\/\/[^\s<]+)/g,
    '<a href="$1" target="_blank" rel="noopener noreferrer" class="text-primary underline hover:no-underline">$1</a>'
  )

  // Emails → mailto
  html = html.replace(
    /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g,
    '<a href="mailto:$1" class="text-primary underline hover:no-underline">$1</a>'
  )

  // **bold**
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')

  // Bullets and headings
  const lines = html.split('\n')
  let inList = false
  const result: string[] = []

  for (const line of lines) {
    const headingMatch = line.match(/^#{1,4}\s+(.+)$/)
    if (headingMatch) {
      if (inList) { result.push('</ul>'); inList = false }
      result.push(`<p class="font-semibold">${headingMatch[1]}</p>`)
      continue
    }

    const bulletMatch = line.match(/^[•\-*]\s+(.+)$/)
    if (bulletMatch) {
      if (!inList) { result.push('<ul class="list-disc pl-4 space-y-0.5">'); inList = true }
      result.push(`<li>${bulletMatch[1]}</li>`)
    } else {
      if (inList) { result.push('</ul>'); inList = false }
      if (line.trim()) result.push(`<p>${line}</p>`)
    }
  }
  if (inList) result.push('</ul>')

  return result.join('')
}

// --- Sub-components ---

function ProgramCard({ program }: { program: ProgramMention }) {
  const [expanded, setExpanded] = useState(false)
  const meta = [program.degree, program.totalHours ? `${program.totalHours} hours` : ''].filter(Boolean).join(' \u00b7 ')

  return (
    <div className="border border-border rounded-lg mt-2 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-muted/50 transition-colors"
        aria-expanded={expanded}
      >
        <div className="min-w-0">
          <span className="font-semibold text-sm">{program.name}</span>
          {meta && <span className="text-xs text-muted-foreground ml-2">{meta}</span>}
        </div>
        <ChevronDown className={`w-4 h-4 shrink-0 text-muted-foreground transition-transform ${expanded ? 'rotate-180' : ''}`} />
      </button>
      {expanded && (
        <div className="px-3 pb-3 text-sm space-y-2 border-t border-border pt-2">
          {program.description && (
            <p className="text-muted-foreground">{program.description.length > 250 ? program.description.substring(0, 250) + '...' : program.description}</p>
          )}
          {program.careerOptions.length > 0 && (
            <div>
              <p className="font-medium text-xs mb-1">Career Options</p>
              <div className="flex flex-wrap gap-1">
                {program.careerOptions.map(c => (
                  <span key={c} className="text-xs bg-accent text-accent-foreground px-2 py-0.5 rounded-full">{c}</span>
                ))}
              </div>
            </div>
          )}
          {program.contacts.length > 0 && (
            <div>
              <p className="font-medium text-xs mb-1">Contacts</p>
              <ul className="text-xs space-y-0.5">
                {program.contacts.map((c, i) => (
                  <li key={i}>
                    {c.role && <strong>{c.role}</strong>}{c.role && c.name && ' \u00b7 '}{c.name}
                    {c.email && <> \u00b7 <a href={`mailto:${c.email}`} className="text-primary underline">{c.email}</a></>}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {program.url && (
            <a href={program.url} target="_blank" rel="noopener noreferrer" className="inline-block text-xs text-primary underline hover:no-underline">
              Visit Program Page &rarr;
            </a>
          )}
        </div>
      )}
    </div>
  )
}

function TypingDots() {
  return (
    <div className="flex gap-1 items-center px-3 py-2">
      {[0, 1, 2].map(i => (
        <span
          key={i}
          className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce"
          style={{ animationDelay: `${i * 150}ms` }}
        />
      ))}
    </div>
  )
}

// --- Main Component ---

const PERSONA_NAMES: Record<string, string> = { DCDA: 'Ada', English: 'Engelina' }

export function AdaPanel({ open, onClose, wizardContext, programName, programId, department = 'DCDA' }: AdaPanelProps) {
  const personaName = PERSONA_NAMES[department] || 'Ada'
  const [messages, setMessages] = useState<Message[]>([])
  const [conversationHistory, setConversationHistory] = useState<Array<{ role: string; content: string }>>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [promptChips, setPromptChips] = useState<Array<{ label: string; prompt: string }>>([])
  const [showChips, setShowChips] = useState(true)
  const [feedbackGiven, setFeedbackGiven] = useState<Set<number>>(() => new Set())

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const sessionId = useRef(getSessionId())
  const initializedRef = useRef(false)

  const storageKey = `ada-history-${programId || department}`

  const clearChat = useCallback(() => {
    setMessages([])
    setConversationHistory([])
    setShowChips(true)
    setPromptChips(getPromptChips(programId))
    setError(null)
    setFeedbackGiven(new Set())
    localStorage.removeItem(storageKey)
  }, [storageKey, programId])

  // Initialize: load from localStorage + set prompt chips
  useEffect(() => {
    if (initializedRef.current) return
    initializedRef.current = true

    setPromptChips(getPromptChips(programId))

    try {
      const saved = localStorage.getItem(storageKey)
      if (saved) {
        const parsed = JSON.parse(saved) as { messages: Message[]; history: Array<{ role: string; content: string }> }
        if (parsed.messages?.length > 0) {
          setMessages(parsed.messages)
          setConversationHistory(parsed.history || [])
          setShowChips(false)
        }
      }
    } catch { /* ignore corrupt localStorage */ }
  }, [storageKey, programId])

  // Persist to localStorage on message changes
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem(storageKey, JSON.stringify({ messages, history: conversationHistory }))
    }
  }, [messages, conversationHistory, storageKey])

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  // Focus input when panel opens
  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  // Close on Escape
  useEffect(() => {
    if (!open) return
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [open, onClose])

  const sendMessage = useCallback(async (text: string) => {
    const userMessage: Message = { role: 'user', content: text }
    setMessages(prev => [...prev, userMessage])
    setShowChips(false)
    setInput('')
    setError(null)
    setIsLoading(true)

    try {
      const response = await fetch(ADA_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          conversationHistory: conversationHistory.map(({ role, content }) => ({ role, content })),
          personaName,
          ...(wizardContext ? { wizardContext } : {}),
        }),
      })

      if (response.status === 429) {
        const data = await response.json()
        const minutes = Math.ceil((data.retryAfterSeconds || 60) / 60)
        setError(`You've sent a lot of messages! Please wait about ${minutes} minute${minutes === 1 ? '' : 's'} and try again.`)
        setIsLoading(false)
        return
      }

      if (!response.ok) throw new Error('Failed to get response')

      const data = await response.json()
      const assistantMessage: Message = {
        role: 'assistant',
        content: data.message,
        programMentions: data.programMentions,
      }
      setMessages(prev => [...prev, assistantMessage])
      setConversationHistory(data.conversationHistory)
    } catch {
      setError('Sorry, I encountered an error. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }, [conversationHistory, wizardContext, personaName])

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    const text = input.trim()
    if (!text || isLoading) return
    if (text.length > 1000) {
      setError('Please keep your message under 1,000 characters.')
      return
    }
    sendMessage(text)
  }

  const handleFeedback = async (messageIndex: number, rating: 'positive' | 'negative') => {
    setFeedbackGiven(prev => new Set(prev).add(messageIndex))

    const assistantMsg = messages[messageIndex]
    const userMsg = messageIndex > 0 ? messages[messageIndex - 1] : null

    try {
      await fetch(ADA_FEEDBACK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messageId: `${sessionId.current}-${messageIndex}`,
          userQuestion: userMsg?.role === 'user' ? userMsg.content : '',
          assistantResponse: assistantMsg.content,
          rating,
          sessionId: sessionId.current,
          timestamp: new Date().toISOString(),
        }),
      })
    } catch {
      // Silently fail — feedback is non-critical
    }
  }

  const greeting = programName
    ? `Hi! I'm ${personaName}, your advising assistant. I can see your ${programName} degree progress \u2014 ask me anything about your courses, requirements, or what to take next!`
    : `Hi! I'm ${personaName}, your AddRan advising assistant. How can I help?`

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 bg-black/30 z-40 transition-opacity"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Panel */}
      <div className={`fixed top-0 right-0 bottom-0 w-full sm:w-[400px] bg-card z-50 shadow-2xl flex flex-col transition-transform duration-200 ${open ? 'translate-x-0' : 'translate-x-full'}`}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b bg-primary text-primary-foreground">
          <div>
            <p className="font-semibold text-sm">Ask {personaName}</p>
            <p className="text-xs text-primary-foreground/70">AI advising assistant</p>
          </div>
          <div className="flex items-center gap-1">
            {messages.length > 0 && (
              <button
                onClick={clearChat}
                className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                aria-label="Clear chat"
                title="Clear chat"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-white/10 transition-colors"
              aria-label={`Close ${personaName} panel`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          {/* Greeting */}
          <div className="flex gap-2">
            <div className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">{personaName[0]}</div>
            <div className="bg-muted rounded-lg px-3 py-2 text-sm max-w-[85%]">
              <p>{greeting}</p>
            </div>
          </div>

          {/* Prompt chips */}
          {showChips && messages.length === 0 && (
            <div className="flex flex-wrap gap-2 pl-9">
              {promptChips.map(chip => (
                <button
                  key={chip.label}
                  onClick={() => sendMessage(chip.prompt)}
                  className="text-xs px-3 py-1.5 rounded-full border border-primary/30 text-primary hover:bg-primary hover:text-primary-foreground transition-colors"
                >
                  {chip.label}
                </button>
              ))}
            </div>
          )}

          {/* Conversation */}
          {messages.map((msg, i) =>
            msg.role === 'user' ? (
              <div key={i} className="flex justify-end">
                <div className="bg-primary text-primary-foreground rounded-lg px-3 py-2 text-sm max-w-[85%]">
                  <p>{msg.content}</p>
                </div>
              </div>
            ) : (
              <div key={i} className="flex gap-2">
                <div className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">{personaName[0]}</div>
                <div className="max-w-[85%] space-y-1">
                  <div
                    className="bg-muted rounded-lg px-3 py-2 text-sm [&_ul]:my-1 [&_p]:my-0.5 [&_a]:break-all"
                    dangerouslySetInnerHTML={{ __html: formatMarkdown(msg.content) }}
                  />
                  {/* Program cards */}
                  {msg.programMentions && msg.programMentions.length > 0 && (
                    <div className="space-y-1">
                      {msg.programMentions.map(p => <ProgramCard key={p.name} program={p} />)}
                    </div>
                  )}
                  {/* Feedback */}
                  {!feedbackGiven.has(i) ? (
                    <div className="flex gap-1 pl-1">
                      <button
                        onClick={() => handleFeedback(i, 'positive')}
                        className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                        aria-label="Helpful"
                      >
                        <ThumbsUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleFeedback(i, 'negative')}
                        className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                        aria-label="Not helpful"
                      >
                        <ThumbsDown className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground pl-1">Thanks for the feedback!</p>
                  )}
                </div>
              </div>
            )
          )}

          {/* Loading */}
          {isLoading && (
            <div className="flex gap-2">
              <div className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">{personaName[0]}</div>
              <div className="bg-muted rounded-lg max-w-[85%]">
                <TypingDots />
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2 ml-9">
              {error}
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <form onSubmit={handleSubmit} className="border-t border-border px-4 py-3 flex gap-2">
          <input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Ask about your courses, requirements..."
            maxLength={1000}
            disabled={isLoading}
            className="flex-1 bg-muted rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="bg-primary text-primary-foreground rounded-lg px-3 py-2 disabled:opacity-50 hover:opacity-90 transition-opacity"
            aria-label="Send message"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </>
  )
}
