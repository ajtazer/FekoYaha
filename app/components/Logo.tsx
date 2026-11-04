import { cn } from '@/lib/utils'

// A simple paper-plane "throw it here" mark in a neon-glass tile.
export function Logo({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'inline-grid place-items-center rounded-xl bg-primary/15 text-primary ring-1 ring-primary/30',
        className,
      )}
    >
      <svg viewBox="0 0 24 24" fill="none" className="h-[55%] w-[55%]" aria-hidden>
        <path
          d="M21 3 3 10.5l6 2.5m12-10-9 18-2.5-7.5m11.5-10.5-11.5 10.5"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  )
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn('font-bold tracking-tight', className)}>
      Feko<span className="text-primary">Yaha</span>
    </span>
  )
}
