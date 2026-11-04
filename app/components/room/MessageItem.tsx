import { Download, FileText } from 'lucide-react'
import { apiUrl } from '@/lib/config'
import { displayName, formatFileSize, isFileUrl, safeColor } from '@/lib/files'
import { cn } from '@/lib/utils'
import type { Message } from '@/lib/types'

const FILE_EMOJI: Record<string, string> = {
  pdf: '📄', zip: '🗜️', '7z': '🗜️', rar: '🗜️', tar: '🗜️', gz: '🗜️',
  doc: '📝', docx: '📝', odt: '📝', rtf: '📝', txt: '📝', md: '📝', epub: '📝',
  xls: '📊', xlsx: '📊', ods: '📊', csv: '📊', json: '📊',
  ppt: '📽️', pptx: '📽️', odp: '📽️', svg: '🖼️', heic: '🖼️', avi: '🎞️', mkv: '🎞️',
}

function emojiFor(name: string, kind: string) {
  if (kind === 'audio') return '🎵'
  const ext = (name.split('.').pop() || '').toLowerCase()
  return FILE_EMOJI[ext] ?? '📁'
}

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function FileBody({ msg, own, onImage }: { msg: Message; own: boolean; onImage: (url: string) => void }) {
  const url = apiUrl(msg.content)
  const name = displayName(msg.content, msg.name)

  if (msg.type === 'image') {
    return (
      <button
        type="button"
        onClick={() => onImage(url)}
        className="block overflow-hidden rounded-lg ring-1 ring-border transition hover:opacity-95"
      >
        <img src={url} alt={name} loading="lazy" className="max-h-80 w-auto max-w-full object-contain" />
      </button>
    )
  }
  if (msg.type === 'video') {
    return <video src={url} controls playsInline preload="metadata" className="max-h-80 w-full rounded-lg bg-black/40" />
  }
  if (msg.type === 'audio') {
    return (
      <div className="flex flex-col gap-2">
        <span className="truncate text-xs text-muted-foreground">🎵 {name}</span>
        <audio src={url} controls preload="metadata" className="w-full max-w-xs" />
      </div>
    )
  }
  // pdf and every other file type
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener"
      className={cn(
        'flex items-center gap-3 rounded-lg border border-border/80 bg-background/40 px-3 py-2.5 transition hover:border-primary/60',
        own && 'bg-background/20',
      )}
    >
      <span className="text-2xl">{emojiFor(name, msg.type)}</span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">{name}</span>
        <span className="block text-xs text-muted-foreground">
          {msg.size ? formatFileSize(msg.size) + ' · ' : ''}
          {msg.type === 'pdf' ? 'Click to open PDF' : 'Download'}
        </span>
      </span>
      {msg.type === 'pdf' ? <FileText className="size-4 shrink-0 text-muted-foreground" /> : <Download className="size-4 shrink-0 text-muted-foreground" />}
    </a>
  )
}

export function MessageItem({
  msg,
  own,
  grouped,
  onImage,
}: {
  msg: Message
  own: boolean
  grouped: boolean
  onImage: (url: string) => void
}) {
  if (msg.type === 'system') {
    return (
      <div className="my-1 flex justify-center">
        <span className="rounded-full bg-muted/60 px-3 py-1 text-xs text-muted-foreground">{msg.content}</span>
      </div>
    )
  }

  const color = safeColor(msg.sender.color)
  const initial = msg.sender.nickname.charAt(0).toUpperCase() || '?'
  const isFile = msg.type !== 'text' && isFileUrl(msg.content)

  return (
    <div className={cn('flex gap-2.5', own ? 'flex-row-reverse' : 'flex-row', grouped ? 'mt-0.5' : 'mt-3')}>
      <div className="w-8 shrink-0">
        {!grouped && (
          <span
            className="grid size-8 place-items-center rounded-full text-sm font-semibold text-background"
            style={{ background: color }}
          >
            {initial}
          </span>
        )}
      </div>
      <div className={cn('flex min-w-0 max-w-[82%] flex-col', own ? 'items-end' : 'items-start')}>
        {!grouped && (
          <div className={cn('mb-1 flex items-baseline gap-2', own && 'flex-row-reverse')}>
            <span className="text-sm font-semibold" style={{ color }}>
              {msg.sender.nickname}
            </span>
            <span className="text-[11px] text-muted-foreground">{formatTime(msg.timestamp)}</span>
          </div>
        )}
        <div
          className={cn(
            'rounded-2xl px-3 py-2 text-sm leading-relaxed break-words',
            isFile && 'p-1.5',
            own
              ? 'rounded-tr-sm bg-primary/20 ring-1 ring-primary/25'
              : 'glass rounded-tl-sm',
          )}
        >
          {isFile ? (
            <FileBody msg={msg} own={own} onImage={onImage} />
          ) : (
            <p className="whitespace-pre-wrap">{msg.content}</p>
          )}
        </div>
      </div>
    </div>
  )
}
