import { useCallback, useEffect, useRef, useState } from 'react'
import { wsUrl } from '@/lib/config'
import type { Message, MessageKind, Sender } from '@/lib/types'

export type ConnectionState = 'connecting' | 'open' | 'closed'

interface UseRoomResult {
  status: ConnectionState
  messages: Message[]
  users: Sender[]
  locked: boolean
  deleted: string | null
  send: (type: MessageKind, content: string, extra?: { name?: string; size?: number }) => boolean
}

const MAX_RENDERED = 500

export function useRoom(keyword: string, nickname: string, color: string): UseRoomResult {
  const [status, setStatus] = useState<ConnectionState>('connecting')
  const [messages, setMessages] = useState<Message[]>([])
  const [users, setUsers] = useState<Sender[]>([])
  const [locked, setLocked] = useState(false)
  const [deleted, setDeleted] = useState<string | null>(null)

  const wsRef = useRef<WebSocket | null>(null)
  const retriesRef = useRef(0)
  const pingRef = useRef<ReturnType<typeof setInterval>>(undefined)
  const closedByUs = useRef(false)

  useEffect(() => {
    if (!keyword || !nickname) return
    closedByUs.current = false

    const connect = () => {
      setStatus('connecting')
      const url = wsUrl(
        `/api/room/${keyword}/ws?nickname=${encodeURIComponent(nickname)}&color=${encodeURIComponent(color)}`,
      )
      const ws = new WebSocket(url)
      wsRef.current = ws

      ws.onopen = () => {
        retriesRef.current = 0
        setStatus('open')
        clearInterval(pingRef.current)
        pingRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: 'ping' }))
        }, 30_000)
      }

      ws.onmessage = (event) => {
        let data: { type: string; payload?: unknown }
        try {
          data = JSON.parse(event.data)
        } catch {
          return
        }
        switch (data.type) {
          case 'history': {
            const payload = data.payload as { messages: Message[] }
            setMessages((payload.messages ?? []).slice(-MAX_RENDERED))
            break
          }
          case 'message': {
            const msg = data.payload as Message
            setMessages((prev) => {
              if (prev.some((m) => m.id === msg.id)) return prev
              const next = [...prev, msg]
              return next.length > MAX_RENDERED ? next.slice(-MAX_RENDERED) : next
            })
            break
          }
          case 'users': {
            const payload = data.payload as { users: Sender[]; count: number }
            setUsers(payload.users ?? [])
            break
          }
          case 'room-status': {
            setLocked(Boolean((data.payload as { isLocked: boolean }).isLocked))
            break
          }
          case 'error': {
            const message = (data.payload as { message: string }).message || ''
            if (/deleted/i.test(message)) setDeleted(message)
            break
          }
        }
      }

      ws.onclose = () => {
        clearInterval(pingRef.current)
        if (closedByUs.current || deleted) return
        setStatus('connecting')
        const delay = Math.min(1000 * 2 ** retriesRef.current, 15_000)
        retriesRef.current += 1
        setTimeout(() => { if (!closedByUs.current) connect() }, delay)
      }
    }

    connect()

    return () => {
      closedByUs.current = true
      clearInterval(pingRef.current)
      wsRef.current?.close()
    }
    // Reconnect only when identity/room change; `deleted` is read via closure.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keyword, nickname, color])

  const send = useCallback<UseRoomResult['send']>((type, content, extra) => {
    const ws = wsRef.current
    if (!ws || ws.readyState !== WebSocket.OPEN) return false
    ws.send(JSON.stringify({ type: 'message', payload: { type, content, ...extra } }))
    return true
  }, [])

  return { status, messages, users, locked, deleted, send }
}
