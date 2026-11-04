import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Activity, Eraser, Eye, Loader2, LockOpen, Lock, LogOut, RefreshCw, Trash2, X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { adminAction, adminListRooms, adminRoomInfo, adminVerify } from '@/lib/api'
import { useLocalStorage } from '@/hooks/useLocalStorage'
import { safeColor } from '@/lib/files'
import type { AdminRoom, AdminRoomInfo } from '@/lib/types'

// Wording and formats follow the original FekoYaha admin dashboard.
function formatDateTimeIST(ts: number) {
  return new Date(ts).toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })
}

function parseUA(ua: string) {
  if (!ua || ua === 'unknown') return { browser: 'Unknown', device: 'Unknown' }
  let device = 'PC/Laptop'
  if (ua.includes('Mobi')) device = 'Mobile'
  if (ua.includes('Tablet')) device = 'Tablet'
  let browser = 'Other'
  if (ua.includes('Edg')) browser = 'Edge'
  else if (ua.includes('Chrome')) browser = 'Chrome'
  else if (ua.includes('Firefox')) browser = 'Firefox'
  else if (ua.includes('Safari')) browser = 'Safari'
  return { browser, device }
}

function LoginCard({ onToken }: { onToken: (t: string) => void }) {
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [denied, setDenied] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!password) return
    setBusy(true)
    setDenied(false)
    try {
      if (await adminVerify(password)) onToken(password)
      else setDenied(true)
    } catch {
      toast.error('Could not reach the server')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="grid min-h-screen place-items-center px-5">
      <form onSubmit={submit} className="glass glow-ring w-full max-w-sm space-y-4 rounded-2xl p-7 text-center animate-rise">
        <span className="block text-5xl leading-none" aria-hidden>🚫</span>
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-wider">ADMIN LOGIN</h1>
          <p className="text-sm font-medium text-red-400">Restricted Access Area</p>
        </div>
        <Input
          type="password"
          autoFocus
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Enter Security Key"
          className="h-11 text-center"
        />
        <Button type="submit" className="w-full rounded-xl font-semibold tracking-wide" size="lg" disabled={busy || !password}>
          {busy && <Loader2 className="size-4 animate-spin" />}
          AUTHORIZE ACCESS
        </Button>
        {denied && <p className="text-sm font-semibold text-red-500">❌ ACCESS DENIED</p>}
      </form>
    </main>
  )
}

function InspectDialog({
  token,
  keyword,
  onClose,
  onDeleted,
}: {
  token: string
  keyword: string
  onClose: () => void
  onDeleted: () => void
}) {
  const [info, setInfo] = useState<AdminRoomInfo | null>(null)
  const [busy, setBusy] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      setInfo(await adminRoomInfo(token, keyword))
    } catch {
      toast.error('Failed to fetch room details')
    }
  }, [token, keyword])

  useEffect(() => { void load() }, [load])

  const run = async (action: 'lock' | 'clear' | 'delete', confirmText?: string) => {
    if (confirmText && !window.confirm(confirmText)) return
    setBusy(action)
    try {
      await adminAction(token, keyword, action)
      if (action === 'delete') {
        onDeleted()
        return
      }
      await load()
    } catch {
      toast.error(`Could not ${action} the room`)
    } finally {
      setBusy(null)
    }
  }

  const participants = info
    ? [...info.participants].sort((a, b) => Number(b.isOnline) - Number(a.isOnline) || b.lastSeenAt - a.lastSeenAt)
    : []
  const onlineCount = participants.filter((p) => p.isOnline).length

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent showCloseButton={false} className="glass max-h-[88vh] gap-0 overflow-hidden border-border/60 p-0 sm:max-w-3xl">
        <DialogHeader className="flex-row items-center justify-between gap-3 border-b border-border/60 p-4 text-left">
          <DialogTitle className="truncate">Inspecting: {keyword}</DialogTitle>
          <Button variant="outline" size="sm" onClick={onClose}><X className="size-4" /> Close</Button>
        </DialogHeader>

        <div className="grid max-h-[calc(88vh-4.5rem)] gap-5 overflow-y-auto p-4 md:grid-cols-[1fr_17rem]">
          {/* Message history + actions */}
          <section className="min-w-0 space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground">Message History</h3>
            <div className="glass max-h-80 space-y-2 overflow-y-auto rounded-lg p-3 text-sm">
              {info?.messages.length ? (
                info.messages.map((m) => (
                  <p key={m.id} className="break-words">
                    <small className="float-right ml-2 text-xs text-muted-foreground">
                      {new Date(m.timestamp).toLocaleTimeString()}
                    </small>
                    <span className="font-semibold" style={{ color: safeColor(m.sender.color) }}>{m.sender.nickname}: </span>
                    <span className="text-muted-foreground">
                      {m.type === 'text' || m.type === 'system' ? m.content : `[${m.type}] ${m.name ?? m.content}`}
                    </span>
                  </p>
                ))
              ) : (
                <p className="text-center text-muted-foreground">No messages</p>
              )}
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              <Button variant="outline" size="sm" disabled={busy !== null || !info} onClick={() => run('lock')}>
                {info?.isLocked ? <LockOpen className="size-4" /> : <Lock className="size-4" />}
                {info?.isLocked ? 'Unlock Room' : 'Lock Room'}
              </Button>
              <Button variant="destructive" size="sm" disabled={busy !== null} onClick={() => run('clear', 'Clear all messages in this room?')}>
                <Eraser className="size-4" /> Clear History
              </Button>
              <Button variant="destructive" size="sm" disabled={busy !== null} onClick={() => run('delete', 'PERMANENTLY DELETE this room and all data?')}>
                <Trash2 className="size-4" /> Delete Room
              </Button>
            </div>
          </section>

          {/* Sidebar */}
          <aside className="space-y-5">
            <section className="space-y-2">
              <h3 className="text-sm font-semibold text-muted-foreground">Active Participants</h3>
              {participants.length ? (
                participants.map((p, i) => {
                  const ua = parseUA(p.ua)
                  const city = p.cf?.city || 'Unknown'
                  const location = city !== 'Unknown' ? `${city}, ${p.cf?.country || ''}` : 'Unknown'
                  return (
                    <div
                      key={i}
                      className={`glass flex flex-col gap-0.5 rounded-lg p-2.5 text-xs text-muted-foreground ${p.isOnline ? 'border-emerald-500/30' : ''}`}
                    >
                      <strong className="flex items-center gap-1.5 text-sm text-foreground">
                        <span className="size-2 rounded-full" style={{ background: p.isOnline ? '#10b981' : '#6b7280' }} />
                        {p.nickname}
                      </strong>
                      <span>IP: {p.ip === 'unknown' ? 'Detected' : p.ip}</span>
                      <span>Loc: {location}</span>
                      <span>First Joined: {formatDateTimeIST(p.firstJoinedAt)}</span>
                      <span>Last Seen: {formatDateTimeIST(p.lastSeenAt)}</span>
                      <span>Device: {ua.device} ({ua.browser})</span>
                    </div>
                  )
                })
              ) : (
                <p className="text-xs text-muted-foreground">No participants yet</p>
              )}
            </section>

            <section className="space-y-2 border-t border-border/60 pt-4">
              <h3 className="text-sm font-semibold text-muted-foreground">Room Statistics</h3>
              <div className="glass flex flex-col gap-0.5 rounded-lg p-2.5 text-xs text-muted-foreground">
                <span>Messages: {info?.messages.length ?? '–'}</span>
                <span>Total Participants: {info?.participants.length ?? '–'}</span>
                <span>Currently Online: {info ? onlineCount : '–'}</span>
                <span>Status: {info?.isLocked ? 'Room Locked' : 'Public Access'}</span>
              </div>
            </section>
          </aside>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export function Admin() {
  const [token, setToken] = useLocalStorage('fekoyaha_admin_token')
  const [authed, setAuthed] = useState(false)
  const [checking, setChecking] = useState(true)
  const [rooms, setRooms] = useState<AdminRoom[]>([])
  const [loading, setLoading] = useState(false)
  const [inspect, setInspect] = useState<string | null>(null)

  useEffect(() => {
    const previous = document.title
    document.title = 'FekoYaha Admin Dashboard'
    return () => { document.title = previous }
  }, [])

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      setRooms(await adminListRooms(token))
    } catch {
      toast.error('Could not load rooms')
    } finally {
      setLoading(false)
    }
  }, [token])

  // Validate a stored token once on mount.
  useEffect(() => {
    let active = true
    if (!token) { setChecking(false); return }
    adminVerify(token)
      .then((ok) => { if (active) { setAuthed(ok); if (!ok) setToken('') } })
      .catch(() => {})
      .finally(() => active && setChecking(false))
    return () => { active = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => { if (authed) void refresh() }, [authed, refresh])

  if (checking) {
    return <div className="grid min-h-screen place-items-center"><Loader2 className="size-6 animate-spin text-primary" /></div>
  }

  if (!authed) {
    return <LoginCard onToken={(t) => { setToken(t); setAuthed(true) }} />
  }

  const logout = () => { setToken(''); setAuthed(false); setRooms([]) }

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-6">
      <header className="mb-6 flex items-center gap-2">
        <h1 className="flex-1 text-xl font-bold">FekoYaha Admin</h1>
        <Button variant="outline" size="sm" onClick={() => void refresh()} disabled={loading}>
          <RefreshCw className={loading ? 'size-4 animate-spin' : 'size-4'} /> Refresh
        </Button>
        <Button variant="ghost" size="sm" onClick={logout}><LogOut className="size-4" /> Logout</Button>
      </header>

      <section className="glass overflow-hidden rounded-2xl">
        <h2 className="flex items-center gap-2 border-b border-border/60 px-4 py-3 font-semibold">
          <Activity className="size-5 text-primary" /> Active Rooms
          <Badge variant="secondary" className="ml-1">{rooms.length}</Badge>
        </h2>
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Room Keyword</TableHead>
              <TableHead className="hidden sm:table-cell">Created</TableHead>
              <TableHead>Last Active</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rooms.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="py-12 text-center text-muted-foreground">
                {loading ? 'Loading…' : 'No active rooms found'}
              </TableCell></TableRow>
            ) : (
              [...rooms].sort((a, b) => b.lastActiveAt - a.lastActiveAt).map((room) => {
                const isActive = Date.now() - room.lastActiveAt < 5 * 60_000
                return (
                  <TableRow key={room.keyword}>
                    <TableCell className="font-semibold">{room.keyword}</TableCell>
                    <TableCell className="hidden text-muted-foreground sm:table-cell">{formatDateTimeIST(room.createdAt)}</TableCell>
                    <TableCell className="text-muted-foreground">{formatDateTimeIST(room.lastActiveAt)}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={isActive ? 'border-emerald-500/40 text-emerald-400' : 'text-muted-foreground'}>
                        {isActive ? 'Online' : 'Idle'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => setInspect(room.keyword)}>
                        <Eye className="size-4" /> Inspect
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </section>

      {inspect && (
        <InspectDialog
          token={token}
          keyword={inspect}
          onClose={() => setInspect(null)}
          onDeleted={() => { setInspect(null); void refresh() }}
        />
      )}
    </main>
  )
}
