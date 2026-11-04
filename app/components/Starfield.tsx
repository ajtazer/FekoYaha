import { useEffect, useRef } from 'react'

// A calm drifting starfield with twinkle, plus soft aurora blobs behind it.
// Respects prefers-reduced-motion (renders a single static frame).
export function Starfield() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let width = 0
    let height = 0
    let dpr = 1
    type Star = { x: number; y: number; z: number; r: number; tw: number }
    let stars: Star[] = []
    let raf = 0

    const seed = () => {
      const count = Math.min(220, Math.floor((width * height) / 9000))
      stars = Array.from({ length: count }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        z: Math.random() * 0.8 + 0.2,
        r: Math.random() * 1.3 + 0.2,
        tw: Math.random() * Math.PI * 2,
      }))
    }

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      width = canvas.clientWidth
      height = canvas.clientHeight
      canvas.width = Math.floor(width * dpr)
      canvas.height = Math.floor(height * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      seed()
    }

    const draw = (t: number) => {
      ctx.clearRect(0, 0, width, height)
      for (const s of stars) {
        const twinkle = reduced ? 0.8 : 0.55 + 0.45 * Math.sin(t * 0.001 + s.tw)
        ctx.globalAlpha = twinkle * s.z
        ctx.fillStyle = s.z > 0.75 ? '#a5f3fc' : '#e2e8f0'
        ctx.beginPath()
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2)
        ctx.fill()
        if (!reduced) {
          s.y += s.z * 0.12
          s.x += s.z * 0.04
          if (s.y > height + 2) { s.y = -2; s.x = Math.random() * width }
          if (s.x > width + 2) s.x = -2
        }
      }
      ctx.globalAlpha = 1
      if (!reduced) raf = requestAnimationFrame(draw)
    }

    resize()
    raf = requestAnimationFrame(draw)
    window.addEventListener('resize', resize)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-background">
      {/* Aurora blobs */}
      <div className="absolute left-1/2 top-[-10%] h-[45vmax] w-[45vmax] -translate-x-1/2 rounded-full bg-cyan-500/15 blur-[120px]" />
      <div className="absolute bottom-[-15%] right-[-5%] h-[38vmax] w-[38vmax] rounded-full bg-indigo-500/15 blur-[120px]" />
      <div className="absolute bottom-[10%] left-[-10%] h-[30vmax] w-[30vmax] rounded-full bg-fuchsia-500/10 blur-[120px]" />
      {/* Stars */}
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
      {/* Vignette for contrast */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_55%,rgba(0,0,0,0.5))]" />
    </div>
  )
}
