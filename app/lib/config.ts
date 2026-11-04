// Where the Worker backend lives. Local dev can point at a local wrangler via
// VITE_API_BASE; otherwise localhost uses :8787 and production uses the Worker.
const override = import.meta.env.VITE_API_BASE as string | undefined

function resolveApiBase(): string {
  if (override) return override.replace(/\/$/, '')
  if (typeof window !== 'undefined' && /^(localhost|127\.0\.0\.1)$/.test(window.location.hostname)) {
    return 'http://localhost:8787'
  }
  return 'https://fekoyaha.ajcoolx619.workers.dev'
}

export const API_BASE = resolveApiBase()
export const WS_BASE = API_BASE.replace(/^http/, 'ws')

export const apiUrl = (path: string) => API_BASE + path
export const wsUrl = (path: string) => WS_BASE + path

// Keyword rules mirror the Worker (lowercase alphanumeric, 1–32 chars).
export const KEYWORD_REGEX = /^[a-z0-9]{1,32}$/
export const normalizeKeyword = (raw: string) => raw.trim().toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 32)
