import { useRef, useEffect, useState, useCallback } from 'react'
import { X } from 'lucide-react'

const SANDRA_ORIGIN = import.meta.env.DEV ? 'http://127.0.0.1:5002' : 'https://sandra.digitcu.org'
const SANDRA_URL = SANDRA_ORIGIN + '?embed=true'
const LOAD_TIMEOUT_MS = 8000

interface SandraPanelProps {
  open: boolean
  onClose: () => void
  wizardContext: string | null
  programName: string | null
  programId: string | null
}

export function SandraPanel({ open, onClose, wizardContext, programName, programId }: SandraPanelProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [iframeReady, setIframeReady] = useState(false)
  const [timedOut, setTimedOut] = useState(false)
  // Only mount iframe after first open
  const [hasOpened, setHasOpened] = useState(false)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (open && !hasOpened) setHasOpened(true)
  }, [open, hasOpened])

  // Start load timeout when panel first opens
  useEffect(() => {
    if (hasOpened && !iframeReady && !timedOut) {
      timeoutRef.current = setTimeout(() => setTimedOut(true), LOAD_TIMEOUT_MS)
      return () => { if (timeoutRef.current) clearTimeout(timeoutRef.current) }
    }
  }, [hasOpened, iframeReady, timedOut])

  const sendContext = useCallback(() => {
    if (iframeRef.current?.contentWindow && wizardContext) {
      iframeRef.current.contentWindow.postMessage(
        { type: 'wizard-context', context: wizardContext, department: 'DCDA', programName, programId },
        SANDRA_ORIGIN
      )
    }
  }, [wizardContext, programName, programId])

  // When iframe loads, wait briefly for Sandra's JS to initialize, then send context
  const handleIframeLoad = useCallback(() => {
    setTimeout(() => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      setTimedOut(false)
      setIframeReady(true)
      sendContext()
    }, 500)
  }, [sendContext])

  // Re-send context when it changes (e.g. user selects more courses)
  useEffect(() => {
    if (iframeReady) sendContext()
  }, [iframeReady, sendContext])

  // Close on Escape
  useEffect(() => {
    if (!open) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [open, onClose])

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

      {/* Panel — stays mounted but hidden so iframe persists */}
      <div className={`fixed top-0 right-0 bottom-0 w-full sm:w-[400px] bg-card z-50 shadow-2xl flex flex-col transition-transform duration-200 ${open ? 'translate-x-0' : 'translate-x-full'}`}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b bg-primary text-primary-foreground">
          <div>
            <p className="font-semibold text-sm">Ask Sandra</p>
            <p className="text-xs text-primary-foreground/70">AI advising assistant</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors"
            aria-label="Close Sandra panel"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* iframe — only mount after first open, keep alive after */}
        {hasOpened && (
          <iframe
            ref={iframeRef}
            src={SANDRA_URL}
            onLoad={handleIframeLoad}
            className={`flex-1 w-full border-0${timedOut && !iframeReady ? ' hidden' : ''}`}
            title="Sandra AI Advisor"
            allow="clipboard-write"
          />
        )}

        {/* Timeout fallback */}
        {timedOut && !iframeReady && (
          <div className="flex-1 flex flex-col items-center justify-center px-6 text-center gap-4">
            <p className="text-sm text-muted-foreground">
              Sandra is unavailable right now. Your planning work isn't affected — you can close this panel and continue.
            </p>
            <a
              href={SANDRA_ORIGIN}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-primary underline hover:no-underline"
            >
              Try Sandra directly
            </a>
          </div>
        )}
      </div>
    </>
  )
}
