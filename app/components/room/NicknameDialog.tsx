import { useState, type FormEvent } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Logo } from '@/components/Logo'
import { PALETTE } from '@/lib/files'
import { cn } from '@/lib/utils'

export function NicknameDialog({
  open,
  keyword,
  defaultNickname,
  defaultColor,
  onJoin,
}: {
  open: boolean
  keyword: string
  defaultNickname: string
  defaultColor: string
  onJoin: (nickname: string, color: string) => void
}) {
  const [nickname, setNickname] = useState(defaultNickname)
  const [color, setColor] = useState(PALETTE.includes(defaultColor) ? defaultColor : PALETTE[0])

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const name = nickname.trim().slice(0, 32)
    if (name) onJoin(name, color)
  }

  return (
    <Dialog open={open}>
      <DialogContent className="glass border-border/60 sm:max-w-sm [&>button]:hidden">
        <DialogHeader className="items-center text-center">
          <Logo className="mb-1 size-11" />
          <DialogTitle className="text-xl">
            Joining <span className="text-primary">#{keyword}</span>
          </DialogTitle>
          <DialogDescription>Pick a name and colour others will see.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <Input
            autoFocus
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="Your nickname"
            maxLength={32}
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
            Join room
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
