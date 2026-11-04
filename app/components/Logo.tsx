import { cn } from '@/lib/utils'

// FekoYaha's mascot. Lives at public/assets/icon.png and is also the favicon.
export function Logo({ className }: { className?: string }) {
  return (
    <img
      src="/assets/icon.png"
      alt="FekoYaha"
      className={cn('object-contain drop-shadow-[0_0_12px_rgba(34,211,238,0.25)]', className)}
    />
  )
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn('font-bold tracking-tight', className)}>
      Feko<span className="text-primary">Yaha</span>
    </span>
  )
}
