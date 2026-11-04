import { useEffect, useRef, useState, type ClipboardEvent, type KeyboardEvent } from 'react'
import { Paperclip, SendHorizonal, X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { uploadFile } from '@/lib/api'
import { ACCEPT_ATTR, fileKindFor, formatFileSize, MAX_FILE_BYTES } from '@/lib/files'
import type { MessageKind } from '@/lib/types'
import { cn } from '@/lib/utils'

const PASTE_EXT: Record<string, string> = {
  'image/png': 'png', 'image/jpeg': 'jpg', 'image/gif': 'gif', 'image/webp': 'webp',
}

export function Composer({
  keyword,
  disabled,
  externalFile,
  onSend,
}: {
  keyword: string
  disabled: boolean
  externalFile?: File | null
  onSend: (type: MessageKind, content: string, extra?: { name?: string; size?: number }) => boolean
}) {
  const [text, setText] = useState('')
  const [pending, setPending] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [progress, setProgress] = useState<number | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const textRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const ta = textRef.current
    if (!ta) return
    ta.style.height = 'auto'
    ta.style.height = Math.min(ta.scrollHeight, 160) + 'px'
  }, [text])

  useEffect(() => {
    if (pending && fileKindFor(pending.name) === 'image') {
      const url = URL.createObjectURL(pending)
      setPreview(url)
      return () => URL.revokeObjectURL(url)
    }
    setPreview(null)
  }, [pending])

  const chooseFile = (file: File | null | undefined) => {
    if (!file) return
    if (file.size > MAX_FILE_BYTES) {
      toast.error('That file is over the 100 MB limit.')
      return
    }
    if (!fileKindFor(file.name)) {
      toast.error("That file type isn't supported.")
      return
    }
    setPending(file)
  }

  const clearPending = () => {
    setPending(null)
    setProgress(null)
  }

  // A file dropped on the room area is adopted here.
  useEffect(() => {
    if (externalFile) chooseFile(externalFile)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [externalFile])

  const doSend = async () => {
    if (disabled || progress !== null) return
    if (pending) {
      try {
        setProgress(0)
        const result = await uploadFile(keyword, pending, setProgress)
        onSend(result.kind, result.fileUrl, { name: result.name, size: result.size })
        clearPending()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Upload failed')
        setProgress(null)
      }
      return
    }
    const trimmed = text.trim()
    if (!trimmed) return
    if (onSend('text', trimmed)) setText('')
    else toast.error('Not connected — your message was not sent.')
  }

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void doSend()
    }
  }

  const onPaste = (e: ClipboardEvent) => {
    for (const item of e.clipboardData?.items ?? []) {
      const ext = PASTE_EXT[item.type]
      if (item.type.startsWith('image/') && ext) {
        const file = item.getAsFile()
        if (file) {
          e.preventDefault()
          chooseFile(new File([file], `pasted-${Date.now()}.${ext}`, { type: item.type }))
        }
      }
    }
  }

  if (disabled) {
    return (
      <div className="glass rounded-2xl px-4 py-3 text-center text-sm text-muted-foreground">
        This room is read-only.
      </div>
    )
  }

  const uploading = progress !== null

  return (
    <div className="glass rounded-2xl p-2">
      {pending && (
        <div className="mb-2 flex items-center gap-3 rounded-xl bg-background/40 p-2">
          {preview ? (
            <img src={preview} alt="" className="size-11 rounded-md object-cover" />
          ) : (
            <span className="grid size-11 place-items-center rounded-md bg-muted text-xl">📎</span>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{pending.name}</p>
            {uploading ? (
              <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progress}%` }} />
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">{formatFileSize(pending.size)}</p>
            )}
          </div>
          {!uploading && (
            <button onClick={clearPending} className="rounded-md p-1 text-muted-foreground hover:text-foreground" aria-label="Remove file">
              <X className="size-4" />
            </button>
          )}
        </div>
      )}

      <div className="flex items-end gap-1.5">
        <input ref={inputRef} type="file" accept={ACCEPT_ATTR} className="hidden" onChange={(e) => { chooseFile(e.target.files?.[0]); e.target.value = '' }} />
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="size-10 shrink-0 rounded-xl text-muted-foreground"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          aria-label="Attach a file"
        >
          <Paperclip className="size-5" />
        </Button>
        <textarea
          ref={textRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKeyDown}
          onPaste={onPaste}
          rows={1}
          placeholder={pending ? 'Add a caption or just send…' : 'Type a message, or drop a file…'}
          className="max-h-40 flex-1 resize-none bg-transparent px-2 py-2.5 text-sm outline-none placeholder:text-muted-foreground"
        />
        <Button
          type="button"
          size="icon"
          className={cn('size-10 shrink-0 rounded-xl', uploading && 'opacity-70')}
          onClick={() => void doSend()}
          disabled={uploading || (!pending && !text.trim())}
          aria-label="Send"
        >
          <SendHorizonal className="size-5" />
        </Button>
      </div>
    </div>
  )
}

export { fileKindFor }
