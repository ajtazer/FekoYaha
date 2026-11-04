import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Ban, Eraser, Loader2, LockOpen, Lock, LogOut, RefreshCw, ShieldCheck, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Logo } from '@/components/Logo'
import { adminAction, adminListRooms, adminRoomInfo, adminVerify } from '@/lib/api'
import { useLocalStorage } from '@/hooks/useLocalStorage'
import { safeColor } from '@/lib/files'
import type { AdminRoom, AdminRoomInfo } from '@/lib/types'

function fmt(ts: number) {
  return new Date(ts).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })
}

function parseUA(ua: string) {
  const browser = /edg/i.test(ua) ? 'Edge' : /chrome|crios/i.test(ua) ? 'Chrome' : /firefox|fxios/i.test(ua) ? 'Firefox' : /safari/i.test(ua) ? 'Safari' : 'Browser'
  const device = /mobile|iphone|android/i.test(ua) ? 'Mobile' : /ipad|tablet/i.test(ua) ? 'Tablet' : 'Desktop'
  return `${device} · ${browser}`
}

function LoginCard({ onToken }: { onToken: (t: string) => void }) {
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!password) return
    setBusy(true)
    try {
      if (await adminVerify(password)) {
        onToken(password)
      } else {
        toast.error('Incorrect password')
      }
    } catch {
      toast.error('Could not reach the server')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="grid min-h-screen place-items-center px-5">
      <form onSubmit={submit} className="glass glow-ring w-full max-w-sm space-y-4 rounded-2xl p-6 animate-rise">
        <div className="flex flex-col items-center gap-2 text-center">
          <Logo className="size-11" />
          <h1 className="text-xl font-bold">Admin</h1>
          <p className="text-sm text-muted-foreground">Enter the site token to manage rooms.</p>
        </div>
        <Input
          type="password"
          autoFocus
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Site token"
          className="h-11"
        />
        <Button type="submit" className="w-full rounded-xl font-semibold" size="lg" disabled={busy || !password}>
          {busy ? <Loader2 className="size-4 animate-spin" /> : <ShieldCheck className="size-4" />}
          Sign in
        </Button>
        <Button asChild variant="ghost" className="w-full text-muted-foreground">
          <Link to="/">Back to FekoYaha</Link>
        </Button>
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
      toast.error('Could not load room details')
    }
  }, [token, keyword])

  useEffect(() => { void load() }, [load])

  const run = async (action: 'lock' | 'clear' | 'delete', confirmText?: string) => {
    if (confirmText && !window.confirm(confirmText)) return
    setBusy(action)
    try {
      await adminAction(token, keyword, action)
      if (action === 'delete') {
        toast.success(`Deleted #${keyword}`)
        onDeleted()
        return
      }
      toast.success(action === 'clear' ? 'Messages cleared' : 'Lock toggled')
      await load()
    } catch {
      toast.error(`Could not ${action} the room`)
    } finally {
      setBusy(null)
    }
  }

  const online = info?.participants.filter((p) => p.isOnline).length ?? 0

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="glass max-h-[88vh] gap-0 overflow-hidden border-border/60 p-0 sm:max-w-2xl">
        <DialogHeader className="border-b border-border/60 p-4">
          <DialogTitle className="flex items-center gap-2">
            <span className="text-muted-foreground">#</span>{keyword}
            {info?.isLocked && <Badge variant="outline" className="border-amber-500/40 text-amber-400">locked</Badge>}
          </DialogTitle>
        </DialogHeader>

        <div className="grid max-h-[calc(88vh-8rem)] gap-4 overflow-y-auto p-4 sm:grid-cols-2">
          {/* Stats + actions */}
          <div className="space-y-4 sm:col-span-2">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="glass rounded-xl p-3"><p className="text-lg font-bold">{info?.messages.length ?? '–'}</p><p className="text-xs text-muted-foreground">Messages</p></div>
              <div className="glass rounded-xl p-3"><p className="text-lg font-bold">{info?.participants.length ?? '–'}</p><p className="text-xs text-muted-foreground">Visitors</p></div>
              <div className="glass rounded-xl p-3"><p className="text-lg font-bold text-emerald-400">{online}</p><p className="text-xs text-muted-foreground">Online</p></div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" disabled={busy !== null} onClick={() => run('lock')}>
                {info?.isLocked ? <LockOpen className="size-4" /> : <Lock className="size-4" />}
                {info?.isLocked ? 'Unlock' : 'Lock'}
              </Button>
              <Button variant="outline" size="sm" disabled={busy !== null} onClick={() => run('clear', `Clear all messages in #${keyword}?`)}>
                <Eraser className="size-4" /> Clear messages
              </Button>
              <Button variant="destructive" size="sm" disabled={busy !== null} onClick={() => run('delete', `Delete #${keyword} for everyone? This cannot be undone.`)}>
                <Trash2 className="size-4" /> Delete room
              </Button>
            </div>
          </div>

          {/* Participants */}
          <section className="space-y-2">
            <h3 className="text-sm font-semibold text-muted-foreground">Visitors</h3>
            <div className="space-y-2">
              {info?.participants.length ? (
                [...info.participants]
                  .sort((a, b) => Number(b.isOnline) - Number(a.isOnline) || b.lastSeenAt - a.lastSeenAt)
                  .map((p, i) => (
                    <div key={i} className="glass rounded-lg p-2.5 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="size-2 rounded-full" style={{ background: p.isOnline ? '#34d399' : '#6b7280' }} />
                        <span className="font-semibold" style={{ color: safeColor(p.color) }}>{p.nickname}</span>
                      </div>
                      <div className="mt-1 space-y-0.5 text-muted-foreground">
                        <p>{[p.cf?.city, p.cf?.country].filter(Boolean).join(', ') || 'Location unknown'}</p>
                        <p>{parseUA(p.ua)} · {p.ip === 'unknown' ? 'IP hidden' : p.ip}</p>
                        <p>Last seen {fmt(p.lastSeenAt)}</p>
                      </div>
                    </div>
                  ))
              ) : (
                <p className="text-xs text-muted-foreground">No visitors yet.</p>
              )}
            </div>
          </section>

          {/* Messages */}
          <section className="space-y-2">
            <h3 className="text-sm font-semibold text-muted-foreground">Recent messages</h3>
            <div className="glass max-h-80 space-y-1.5 overflow-y-auto rounded-lg p-2.5 text-xs">
              {info?.messages.length ? (
                info.messages.slice(-80).map((m) => (
                  <p key={m.id} className="break-words">
                    {m.type === 'system' ? (
                      <span className="text-muted-foreground italic">{m.content}</span>
                    ) : (
                      <>
                        <span className="font-semibold" style={{ color: safeColor(m.sender.color) }}>{m.sender.nickname}: </span>
                        <span className="text-muted-foreground">{m.type === 'text' ? m.content : `[${m.type}] ${m.name ?? m.content}`}</span>
                      </>
                    )}
                  </p>
                ))
              ) : (
                <p className="text-muted-foreground">No messages.</p>
              )}
            </div>
          </section>
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
    <main className="mx-auto w-full max-w-4xl px-4 py-6">
      <header className="mb-6 flex items-center gap-3">
        <Logo className="size-10" />
        <div className="flex-1">
          <h1 className="text-xl font-bold">Admin</h1>
          <p className="text-sm text-muted-foreground">{rooms.length} room{rooms.length === 1 ? '' : 's'}</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void refresh()} disabled={loading}>
          <RefreshCw className={loading ? 'size-4 animate-spin' : 'size-4'} /> Refresh
        </Button>
        <Button variant="ghost" size="sm" onClick={logout}><LogOut className="size-4" /> Sign out</Button>
      </header>

      <div className="glass overflow-hidden rounded-2xl">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Room</TableHead>
              <TableHead className="hidden sm:table-cell">Created</TableHead>
              <TableHead>Last active</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rooms.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                {loading ? 'Loading…' : 'No rooms yet.'}
              </TableCell></TableRow>
            ) : (
              [...rooms].sort((a, b) => b.lastActiveAt - a.lastActiveAt).map((room) => {
                const active = Date.now() - room.lastActiveAt < 5 * 60_000
                return (
                  <TableRow key={room.keyword}>
                    <TableCell className="font-semibold"><span className="text-muted-foreground">#</span>{room.keyword}</TableCell>
                    <TableCell className="hidden text-muted-foreground sm:table-cell">{fmt(room.createdAt)}</TableCell>
                    <TableCell className="text-muted-foreground">{fmt(room.lastActiveAt)}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={active ? 'border-emerald-500/40 text-emerald-400' : 'text-muted-foreground'}>
                        {active ? 'Active' : 'Idle'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => setInspect(room.keyword)}>Inspect</Button>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      <p className="mt-4 flex items-center gap-1.5 text-xs text-muted-foreground">
        <Ban className="size-3.5" /> Actions here affect live rooms for everyone.
      </p>

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
