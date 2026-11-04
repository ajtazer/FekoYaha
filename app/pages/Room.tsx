import { useEffect, useLayoutEffect, useMemo, useRef, useState, type DragEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Check, Link2, Lock, Users, X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Composer } from '@/components/room/Composer'
import { MessageItem } from '@/components/room/MessageItem'
import { NicknameDialog } from '@/components/room/NicknameDialog'
import { Wordmark } from '@/components/Logo'
import { ensureRoom } from '@/lib/api'
import { useRoom } from '@/hooks/useRoom'
import { useLocalStorage } from '@/hooks/useLocalStorage'
import { PALETTE, safeColor } from '@/lib/files'
import { cn } from '@/lib/utils'

function Avatars({ users }: { users: { nickname: string; color: string }[] }) {
  const shown = users.slice(0, 4)
  return (
    <div className="flex items-center -space-x-2">
      {shown.map((u, i) => (
        <span
          key={i}
          title={u.nickname}
          className="grid size-7 place-items-center rounded-full text-xs font-semibold text-background ring-2 ring-background"
          style={{ background: safeColor(u.color) }}
        >
          {u.nickname.charAt(0).toUpperCase()}
        </span>
      ))}
      {users.length > shown.length && (
        <span className="grid size-7 place-items-center rounded-full bg-muted text-xs ring-2 ring-background">
          +{users.length - shown.length}
        </span>
      )}
    </div>
  )
}

export function Room({ keyword }: { keyword: string }) {
  const navigate = useNavigate()
  const [savedNick, setSavedNick] = useLocalStorage('fekoyaha_nickname')
  const [savedColor, setSavedColor] = useLocalStorage('fekoyaha_color')
  const [joined, setJoined] = useState(false)
  const [copied, setCopied] = useState(false)
  const [dropping, setDropping] = useState(false)
  const [droppedFile, setDroppedFile] = useState<File | null>(null)
  const [lightbox, setLightbox] = useState<string | null>(null)

  // Make sure the room exists so the server accepts files (safe if it already does).
  useEffect(() => {
    ensureRoom(keyword).catch(() => {})
  }, [keyword])

  // Auto-join if we already have an identity.
  useEffect(() => {
    if (savedNick.trim()) setJoined(true)
  }, [savedNick])

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
  useLayoutEffect(() => {
    const el = scrollRef.current
    if (el && atBottomRef.current) el.scrollTop = el.scrollHeight
  }, [messages])

  const onScroll = () => {
    const el = scrollRef.current
    if (!el) return
    atBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 120
  }

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
    } catch {
      /* ignore */
    }
    setCopied(true)
    toast.success('Room link copied')
    setTimeout(() => setCopied(false), 1500)
  }

  const onJoin = (name: string, c: string) => {
    setSavedNick(name)
    setSavedColor(c)
    setJoined(true)
  }

  const onDrop = (e: DragEvent) => {
    e.preventDefault()
    setDropping(false)
    const file = e.dataTransfer.files?.[0]
    if (file) setDroppedFile(file)
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
      <header className="flex items-center gap-3 py-3">
        <Button asChild variant="ghost" size="icon" className="size-9 shrink-0 rounded-xl">
          <Link to="/" aria-label="Back to home"><ArrowLeft className="size-5" /></Link>
        </Button>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h1 className="truncate text-lg font-bold">
              <span className="text-muted-foreground">#</span>{keyword}
            </h1>
            {locked && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-xs text-amber-400">
                <Lock className="size-3" /> read-only
              </span>
            )}
          </div>
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className={cn('size-1.5 rounded-full', status === 'open' ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse')} />
            {status === 'open' ? `${users.length} online` : 'connecting…'}
          </p>
        </div>
        <div className="hidden sm:block"><Avatars users={users} /></div>
        <div className="flex items-center gap-1 sm:hidden">
          <Users className="size-4 text-muted-foreground" /><span className="text-sm">{users.length}</span>
        </div>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="size-9 shrink-0 rounded-xl" onClick={copyLink} aria-label="Copy room link">
              {copied ? <Check className="size-5 text-emerald-400" /> : <Link2 className="size-5" />}
            </Button>
          </TooltipTrigger>
          <TooltipContent>Copy room link</TooltipContent>
        </Tooltip>
      </header>

      {/* Messages */}
      <div
        className="relative flex-1 overflow-hidden rounded-2xl"
        onDragOver={(e) => { e.preventDefault(); setDropping(true) }}
        onDragLeave={(e) => { if (e.currentTarget === e.target) setDropping(false) }}
        onDrop={onDrop}
      >
        <div ref={scrollRef} onScroll={onScroll} className="h-full overflow-y-auto px-1 py-2">
          {rows.length === 0 ? (
            <div className="grid h-full place-items-center text-center">
              <div className="animate-rise">
                <Wordmark className="text-2xl opacity-80" />
                <p className="mt-2 max-w-xs text-sm text-muted-foreground">
                  No messages yet. Say hi or throw the first file into <span className="text-primary">#{keyword}</span>.
                </p>
              </div>
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
        {dropping && (
          <div className="absolute inset-0 grid place-items-center rounded-2xl border-2 border-dashed border-primary/60 bg-background/70 backdrop-blur-sm">
            <p className="text-sm font-medium text-primary">Drop to share</p>
          </div>
        )}
      </div>

      {/* Composer */}
      <div className="py-3">
        <Composer keyword={keyword} disabled={locked} externalFile={droppedFile} onSend={send} />
      </div>

      <NicknameDialog
        open={!joined}
        keyword={keyword}
        defaultNickname={savedNick}
        defaultColor={color}
        onJoin={onJoin}
      />

      <Lightbox />
    </div>
  )

  // --- lightbox (kept as a closure component to share state cleanly) ---
  function Lightbox() {
    if (!lightbox) return null
    return (
      <div
        className="fixed inset-0 z-50 grid place-items-center bg-background/90 p-4 backdrop-blur-sm animate-rise"
        onClick={() => setLightbox(null)}
      >
        <button className="absolute right-4 top-4 rounded-full bg-muted/60 p-2 text-foreground" aria-label="Close">
          <X className="size-5" />
        </button>
        <img src={lightbox} alt="" className="max-h-[90vh] max-w-full rounded-lg object-contain" />
      </div>
    )
  }
}
