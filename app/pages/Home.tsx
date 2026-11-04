import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Database, Image, MessageSquare, Monitor } from 'lucide-react'
import { toast } from 'sonner'
import { Logo } from '@/components/Logo'
import { KEYWORD_REGEX } from '@/lib/config'

// Wording, order and sizes follow the original FekoYaha homepage.
const FEATURES = [
  { icon: MessageSquare, label: 'real-time' },
  { icon: Image, label: 'images' },
  { icon: Monitor, label: 'cross-device' },
  { icon: Database, label: 'persistent' },
]

export function Home() {
  const navigate = useNavigate()
  const [keyword, setKeyword] = useState('')

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    const value = keyword.trim().toLowerCase()
    if (!KEYWORD_REGEX.test(value)) {
      toast.error('Invalid keyword. Use 1-32 lowercase letters and numbers only.')
      return
    }
    navigate('/' + value)
  }

  return (
    <main className="grid min-h-[100dvh] grid-cols-1 place-items-center px-4 py-10">
      <div className="glass w-full max-w-[800px] rounded-[40px] px-5 py-14 text-center animate-rise sm:px-8 sm:py-16">
        <div className="mx-auto max-w-[600px]">
          <div className="flex flex-col items-center">
            <Logo className="size-[150px] drop-shadow-[0_0_20px_rgba(99,102,241,0.6)] motion-safe:animate-float" />
            <h1 className="mt-2 text-[2.75rem] font-bold leading-tight tracking-[-1px] text-primary sm:text-[3.5rem]">
              Feko Yaha
            </h1>
          </div>

          <h2 className="mt-1 text-[1.8rem] font-semibold sm:text-[2.2rem]">Throw it here.</h2>
          <p className="mt-2 text-lg text-muted-foreground">No signup. No tracking. Just share.</p>

          <form onSubmit={onSubmit} className="mt-12 sm:mt-14">
            <div className="flex items-center gap-2 rounded-full border-[1.5px] border-primary/40 bg-black/30 py-2 pr-2 pl-6 shadow-[0_0_20px_rgba(0,212,212,0.1)] transition-all duration-300 focus-within:scale-[1.02] focus-within:border-primary focus-within:shadow-[0_0_30px_rgba(0,229,229,0.3)]">
              <input
                autoFocus
                value={keyword}
                onChange={(e) => setKeyword(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ''))}
                placeholder="Create or join a room by typing a keyword"
                aria-label="Room keyword"
                autoComplete="off"
                spellCheck={false}
                maxLength={32}
                className="w-0 min-w-0 flex-1 bg-transparent py-3 text-base text-foreground outline-none placeholder:text-foreground/40 sm:text-[1.1rem]"
              />
              <button
                type="submit"
                aria-label="Enter room"
                className="grid h-12 w-16 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#00c9ff] to-[#92fec7] shadow-[0_0_15px_rgba(0,201,255,0.4)] transition hover:scale-105 hover:shadow-[0_0_25px_rgba(0,201,255,0.6)] sm:w-20"
              >
                <ArrowRight className="size-6 text-white" strokeWidth={2.5} />
              </button>
            </div>
          </form>

          <div className="mt-12 flex flex-wrap justify-center gap-x-10 gap-y-4 sm:mt-14">
            {FEATURES.map((f) => (
              <div
                key={f.label}
                className="flex items-center gap-3 text-[0.95rem] text-foreground/70 transition-colors hover:text-primary"
              >
                <f.icon className="size-[18px] text-primary/80" />
                <span>{f.label}</span>
              </div>
            ))}
          </div>

          <div className="mt-16 text-sm text-foreground/40">
            <p className="mb-6">wid antigravity on random saturday</p>
            <p className="text-[0.85rem] text-foreground/60">
              Made with <span>❤️</span> by <strong className="font-semibold text-primary">tazer</strong>
            </p>
          </div>
        </div>
      </div>
    </main>
  )
}
