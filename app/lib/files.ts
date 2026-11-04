import type { MessageKind } from './types'

export type FileKind = 'image' | 'video' | 'audio' | 'pdf' | 'file'

// Mirrors src/files.ts on the server, which re-validates every upload. Keeping
// this in sync lets the UI reject unsupported files before uploading.
export const FILE_KINDS: Record<string, FileKind> = {
  jpg: 'image', jpeg: 'image', png: 'image', gif: 'image', webp: 'image', avif: 'image', bmp: 'image',
  mp4: 'video', m4v: 'video', webm: 'video', mov: 'video',
  mp3: 'audio', wav: 'audio', ogg: 'audio', oga: 'audio', opus: 'audio', m4a: 'audio', aac: 'audio', flac: 'audio',
  pdf: 'pdf',
  svg: 'file', heic: 'file', avi: 'file', mkv: 'file',
  txt: 'file', md: 'file', csv: 'file', json: 'file', rtf: 'file',
  doc: 'file', docx: 'file', xls: 'file', xlsx: 'file', ppt: 'file', pptx: 'file',
  odt: 'file', ods: 'file', odp: 'file', epub: 'file',
  zip: 'file', '7z': 'file', rar: 'file', tar: 'file', gz: 'file',
}

export const ACCEPT_ATTR = Object.keys(FILE_KINDS).map((e) => '.' + e).join(',')
export const MAX_FILE_BYTES = 100 * 1024 * 1024

// Only files uploaded to this app have URLs of this shape.
const FILE_URL_RE = /^\/files\/[a-z0-9_]+\/\d+-[0-9a-f-]{36}\.[A-Za-z0-9]{1,16}$/
export const isFileUrl = (url: string) => FILE_URL_RE.test(url)

export function fileKindFor(filename: string): FileKind | null {
  const ext = filename.includes('.') ? filename.split('.').pop()!.toLowerCase() : ''
  return Object.prototype.hasOwnProperty.call(FILE_KINDS, ext) ? FILE_KINDS[ext] : null
}

export function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return ''
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB'
}

export function displayName(content: string, name?: string): string {
  return name && name.length ? name : (content.split('/').pop() ?? 'file')
}

const HEX = /^#[0-9a-fA-F]{6}$/
export const safeColor = (color: string | undefined, fallback = '#22d3ee') =>
  color && HEX.test(color) ? color : fallback

export const PALETTE = [
  '#22d3ee', '#38bdf8', '#818cf8', '#a78bfa', '#e879f9',
  '#f472b6', '#fb7185', '#fbbf24', '#34d399', '#4ade80',
]

export function kindFromMessage(type: MessageKind): FileKind | null {
  if (type === 'text' || type === 'system') return null
  return type
}
