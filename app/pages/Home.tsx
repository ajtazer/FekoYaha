import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Image, MessageSquareText, ShieldCheck, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Logo, Wordmark } from '@/components/Logo'
import { KEYWORD_REGEX, normalizeKeyword } from '@/lib/config'

const FEATURES = [
  { icon: Zap, title: 'Instant', text: 'Pick a keyword and you are in. No signup, no install.' },
  { icon: Image, title: 'Share anything', text: 'Images, video, audio, PDFs, documents and archives up to 100 MB.' },
  { icon: ShieldCheck, title: 'Private', text: 'No accounts, no tracking. Rooms live only while they are used.' },
]

export function Home() {
  const navigate = useNavigate()
  const [keyword, setKeyword] = useState('')

  const normalized = normalizeKeyword(keyword)
  const valid = KEYWORD_REGEX.test(normalized)

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (valid) navigate('/' + normalized)
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col items-center justify-center gap-10 px-5 py-12">
      <div className="flex w-full max-w-xl flex-col items-center gap-7 text-center animate-rise">
        <div className="flex items-center gap-3">
          <Logo className="size-11" />
          <Wordmark className="text-2xl" />
        </div>

        <div className="space-y-3">
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
            Throw it <span className="text-primary">here.</span>
          </h1>
          <p className="mx-auto max-w-md text-balance text-muted-foreground">
            Instant chat &amp; file-sharing rooms. Share a keyword with anyone and start throwing files back and forth.
          </p>
        </div>

        <form onSubmit={onSubmit} className="w-full max-w-md">
          <div className="glass glow-ring flex items-center gap-2 rounded-2xl p-2">
            <span className="pl-3 text-lg font-semibold text-muted-foreground">#</span>
            <Input
              autoFocus
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="pick-a-keyword"
              aria-label="Room keyword"
              className="h-11 border-0 bg-transparent text-base shadow-none focus-visible:ring-0 dark:bg-transparent"
            />
            <Button type="submit" size="lg" disabled={!valid} className="shrink-0 rounded-xl font-semibold">
              Enter <ArrowRight className="size-4" />
            </Button>
          </div>
          <p className="mt-2 h-4 text-left text-xs text-muted-foreground">
            {keyword && !valid ? 'Letters and numbers only, up to 32 characters.' : 'The room is created if it does not exist yet.'}
          </p>
        </form>
      </div>

      <div className="grid w-full max-w-3xl gap-4 sm:grid-cols-3">
        {FEATURES.map((f, i) => (
          <div
            key={f.title}
            className="glass animate-rise rounded-2xl p-5 text-left"
            style={{ animationDelay: `${0.1 + i * 0.08}s` }}
          >
            <f.icon className="mb-3 size-5 text-primary" />
            <h3 className="font-semibold">{f.title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{f.text}</p>
          </div>
        ))}
      </div>

      <footer className="flex items-center gap-2 text-sm text-muted-foreground">
        <MessageSquareText className="size-4" />
        <span>Made for quick, throwaway sharing.</span>
      </footer>
    </main>
  )
}
