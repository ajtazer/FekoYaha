import { useEffect, useLayoutEffect, useMemo, useRef, useState, type DragEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Check, Copy, Lock, X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Composer } from '@/components/room/Composer'
import { MessageItem } from '@/components/room/MessageItem'
import { RoomGate, type GateState } from '@/components/room/RoomGate'
import { Wordmark } from '@/components/Logo'
import { createRoom, getRoomInfo } from '@/lib/api'
import { useRoom } from '@/hooks/useRoom'
import { useLocalStorage } from '@/hooks/useLocalStorage'
import { PALETTE, safeColor } from '@/lib/files'
import { cn } from '@/lib/utils'

export function Room({ keyword }: { keyword: string }) {
  const navigate = useNavigate()
  const [savedNick, setSavedNick] = useLocalStorage('fekoyaha_nickname')
  const [savedColor, setSavedColor] = useLocalStorage('fekoyaha_color')
  const [gate, setGate] = useState<GateState>({ step: 'checking' })
  const [copied, setCopied] = useState(false)
  const [dropping, setDropping] = useState(false)
  const [droppedFile, setDroppedFile] = useState<File | null>(null)
  const [lightbox, setLightbox] = useState<string | null>(null)
  const [showNew, setShowNew] = useState(false)

  // Same flow as the original site: check the room, then offer to create or join it.
  useEffect(() => {
    let active = true
    setGate({ step: 'checking' })
    getRoomInfo(keyword)
      .then((info) => { if (active) setGate({ step: info.exists ? 'join' : 'create' }) })
      .catch((err) => {
        if (active) setGate({ step: 'error', message: 'Failed to connect to backend: ' + (err instanceof Error ? err.message : String(err)) })
      })
    return () => { active = false }
  }, [keyword])

  // After create/join, a returning visitor goes straight in; a new one picks a nickname.
  const enter = () => setGate({ step: savedNick.trim() ? 'joined' : 'nickname' })

  const onCreate = async () => {
    setGate({ step: 'creating' })
    try {
      await createRoom(keyword)
      enter()
    } catch (err) {
      setGate({ step: 'error', message: err instanceof Error ? err.message : 'Failed to create room' })
    }
  }

  const onNickname = (name: string, c: string) => {
    setSavedNick(name)
    setSavedColor(c)
    setGate({ step: 'joined' })
  }

  const joined = gate.step === 'joined'
  const nickname = joined ? savedNick.trim() : ''
  const color = safeColor(savedColor, PALETTE[0])
  const { status, messages, users, locked, deleted, send } = useRoom(keyword, nickname, color)

  useEffect(() => {
    if (deleted) {
      toast.error(deleted)
      const t = setTimeout(() => navigate('/'), 1800)
      return () => clearTimeout(t)
    }
  }, [deleted, navigate])

  const scrollRef = useRef<HTMLDivElement>(null)
  const atBottomRef = useRef(true)
  const countRef = useRef(0)
  useLayoutEffect(() => {
    const el = scrollRef.current
    if (el) {
      if (atBottomRef.current) el.scrollTop = el.scrollHeight
      else if (messages.length > countRef.current) setShowNew(true)
    }
    countRef.current = messages.length
  }, [messages])

  const onScroll = () => {
    const el = scrollRef.current
    if (!el) return
    atBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 120
    if (atBottomRef.current) setShowNew(false)
  }

  const scrollToBottom = () => {
    const el = scrollRef.current
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
    setShowNew(false)
  }

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
    } catch {
      /* ignore */
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const onDrop = (e: DragEvent) => {
    e.preventDefault()
    setDropping(false)
    const file = e.dataTransfer.files?.[0]
    if (file && joined) setDroppedFile(file)
  }

  const rows = useMemo(() => {
    return messages.map((m, i) => {
      const prev = messages[i - 1]
      const grouped =
        !!prev &&
        prev.type !== 'system' &&
        m.type !== 'system' &&
        prev.sender.nickname === m.sender.nickname &&
        m.timestamp - prev.timestamp < 60_000
      return { m, grouped, own: m.type !== 'system' && m.sender.nickname === nickname }
    })
  }, [messages, nickname])

  return (
    <div className="mx-auto flex h-[100dvh] w-full max-w-3xl flex-col px-3 sm:px-4">
      {/* Header */}
      <header className="flex items-center gap-2 py-3 sm:gap-3">
        <Button asChild variant="ghost" size="icon" className="size-9 shrink-0 rounded-xl">
          <Link to="/" aria-label="Back to home" title="Back to home"><ArrowLeft className="size-5" /></Link>
        </Button>
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <span className="text-xl leading-none" aria-hidden>📡</span>
          <h1 className="truncate text-lg font-bold">{keyword}</h1>
          {locked && (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-xs text-amber-400">
              <Lock className="size-3" /> read-only
            </span>
          )}
        </div>
        <Button variant="outline" size="sm" className="shrink-0 rounded-xl" onClick={copyLink} title="Copy room link">
          {copied ? <Check className="size-4 text-emerald-400" /> : <Copy className="size-4" />}
          <span className="max-[400px]:hidden">{copied ? 'Copied!' : 'Copy Link'}</span>
        </Button>
        <div className="flex shrink-0 items-center gap-1.5 rounded-full bg-muted/40 px-3 py-1.5 text-xs">
          <span className={cn('size-2 rounded-full', status === 'open' ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse')} />
          <span>{users.length} online</span>
        </div>
      </header>

      {/* Messages */}
      <div
        className="relative flex-1 overflow-hidden rounded-2xl"
        onDragOver={(e) => { e.preventDefault(); if (joined) setDropping(true) }}
        onDragLeave={(e) => { if (e.currentTarget === e.target) setDropping(false) }}
        onDrop={onDrop}
      >
        <div ref={scrollRef} onScroll={onScroll} className="h-full overflow-y-auto px-1 py-2">
          {rows.length === 0 ? (
            <div className="grid h-full place-items-center text-center">
              {joined && (
                <div className="animate-rise">
                  <Wordmark className="text-2xl opacity-80" />
                  <p className="mt-2 max-w-xs text-sm text-muted-foreground">
                    No messages yet. Say hi or throw the first file into <span className="text-primary">{keyword}</span>.
                  </p>
                </div>
              )}
            </div>
          ) : (
            <>
              {rows.map(({ m, grouped, own }) => (
                <MessageItem key={m.id} msg={m} own={own} grouped={grouped} onImage={(url) => setLightbox(url)} />
              ))}
              <div className="h-1" />
            </>
          )}
        </div>
        {showNew && (
          <button
            onClick={scrollToBottom}
            className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground shadow-lg animate-rise"
          >
            ↓ New messages
          </button>
        )}
        {dropping && (
          <div className="absolute inset-0 grid place-items-center rounded-2xl border-2 border-dashed border-primary/60 bg-background/70 backdrop-blur-sm">
            <p className="text-sm font-medium text-primary">Drop to share</p>
          </div>
        )}
      </div>

      {/* Composer (shown once you are in the room, as before) */}
      {joined && (
        <div className="py-3">
          <Composer
            keyword={keyword}
            nickname={nickname}
            color={color}
            disabled={locked}
            externalFile={droppedFile}
            onSend={send}
          />
        </div>
      )}

      <RoomGate
        gate={gate}
        defaultNickname={savedNick}
        defaultColor={savedColor}
        onCreate={onCreate}
        onJoin={enter}
        onNickname={onNickname}
      />

      {lightbox && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-background/90 p-4 backdrop-blur-sm animate-rise"
          onClick={() => setLightbox(null)}
        >
          <button className="absolute right-4 top-4 rounded-full bg-muted/60 p-2 text-foreground" aria-label="Close">
            <X className="size-5" />
          </button>
          <img src={lightbox} alt="Enlarged image" className="max-h-[90vh] max-w-full rounded-lg object-contain" />
        </div>
      )}
    </div>
  )
}
