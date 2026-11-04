import { useState, type FormEvent } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PALETTE } from '@/lib/files'
import { cn } from '@/lib/utils'

export type GateState =
  | { step: 'checking' }
  | { step: 'create' }
  | { step: 'join' }
  | { step: 'creating' }
  | { step: 'error'; message: string }
  | { step: 'nickname' }
  | { step: 'joined' }

// The original FekoYaha room prompts, word for word.
const COPY = {
  checking: { icon: '🔍', title: 'Checking room...', text: 'Please wait while we check if this room exists.' },
  create: { icon: '✨', title: 'Create Room', text: 'This room does not exist yet. Would you like to create it?' },
  join: { icon: '👋', title: 'Join Room', text: 'This room exists. Click below to join.' },
  creating: { icon: '⏳', title: 'Creating...', text: 'Setting up your room...' },
  error: { icon: '❌', title: 'Error', text: '' },
  nickname: { icon: '👤', title: 'Choose a Nickname', text: 'This will be shown with your messages.' },
} as const

export function RoomGate({
  gate,
  defaultNickname,
  defaultColor,
  onCreate,
  onJoin,
  onNickname,
}: {
  gate: GateState
  defaultNickname: string
  defaultColor: string
  onCreate: () => void
  onJoin: () => void
  onNickname: (nickname: string, color: string) => void
}) {
  const [nickname, setNickname] = useState(defaultNickname)
  const [color, setColor] = useState(
    PALETTE.includes(defaultColor) ? defaultColor : PALETTE[Math.floor(Math.random() * PALETTE.length)],
  )

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const name = nickname.trim().slice(0, 20)
    if (name) onNickname(name, color)
  }

  const open = gate.step !== 'joined'
  const copy = COPY[gate.step === 'joined' ? 'nickname' : gate.step]

  return (
    <Dialog open={open}>
      <DialogContent showCloseButton={false} className="glass border-border/60 sm:max-w-sm">
        <DialogHeader className="items-center text-center">
          <span className="mb-1 text-5xl leading-none" aria-hidden>{copy.icon}</span>
          <DialogTitle className="text-xl">{copy.title}</DialogTitle>
          <DialogDescription>{gate.step === 'error' ? gate.message : copy.text}</DialogDescription>
        </DialogHeader>

        {gate.step === 'create' && (
          <Button className="w-full rounded-xl font-semibold" size="lg" onClick={onCreate}>Create Room</Button>
        )}
        {gate.step === 'join' && (
          <Button className="w-full rounded-xl font-semibold" size="lg" onClick={onJoin}>Join Room</Button>
        )}
        {gate.step === 'error' && (
          <Button className="w-full rounded-xl font-semibold" size="lg" onClick={() => window.location.reload()}>
            Refresh
          </Button>
        )}

        {gate.step === 'nickname' && (
          <form onSubmit={submit} className="space-y-4">
            <Input
              autoFocus
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="Enter your nickname"
              maxLength={20}
              autoComplete="off"
              className="h-11 text-center text-base"
            />
            <div className="flex flex-wrap justify-center gap-2">
              {PALETTE.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  aria-label={`Colour ${c}`}
                  className={cn(
                    'size-7 rounded-full transition hover:scale-110',
                    color === c && 'ring-2 ring-offset-2 ring-offset-background',
                  )}
                  style={{ background: c, boxShadow: color === c ? `0 0 0 2px ${c}` : undefined }}
                />
              ))}
            </div>
            <Button type="submit" className="w-full rounded-xl font-semibold" size="lg" disabled={!nickname.trim()}>
              Join Room
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
