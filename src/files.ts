// File types FekoYaha accepts, keyed by extension. The server picks the stored
// Content-Type from this table, never from the client, so an upload can't be
// stored as HTML or script. Keep public/room.js FILE_KINDS in sync.

export type FileKind = 'image' | 'video' | 'audio' | 'pdf' | 'file';

interface FileTypeInfo {
  mime: string;
  kind: FileKind;
}

const FILE_TYPES = new Map<string, FileTypeInfo>([
  // Images (shown inline)
  ['jpg', { mime: 'image/jpeg', kind: 'image' }],
  ['jpeg', { mime: 'image/jpeg', kind: 'image' }],
  ['png', { mime: 'image/png', kind: 'image' }],
  ['gif', { mime: 'image/gif', kind: 'image' }],
  ['webp', { mime: 'image/webp', kind: 'image' }],
  ['avif', { mime: 'image/avif', kind: 'image' }],
  ['bmp', { mime: 'image/bmp', kind: 'image' }],
  // Video (played inline)
  ['mp4', { mime: 'video/mp4', kind: 'video' }],
  ['m4v', { mime: 'video/mp4', kind: 'video' }],
  ['webm', { mime: 'video/webm', kind: 'video' }],
  ['mov', { mime: 'video/quicktime', kind: 'video' }],
  // Audio (played inline)
  ['mp3', { mime: 'audio/mpeg', kind: 'audio' }],
  ['wav', { mime: 'audio/wav', kind: 'audio' }],
  ['ogg', { mime: 'audio/ogg', kind: 'audio' }],
  ['oga', { mime: 'audio/ogg', kind: 'audio' }],
  ['opus', { mime: 'audio/opus', kind: 'audio' }],
  ['m4a', { mime: 'audio/mp4', kind: 'audio' }],
  ['aac', { mime: 'audio/aac', kind: 'audio' }],
  ['flac', { mime: 'audio/flac', kind: 'audio' }],
  // PDF (opens in the browser's viewer)
  ['pdf', { mime: 'application/pdf', kind: 'pdf' }],
  // Everything below is always downloaded, never rendered.
  // SVG can carry script, so it is a download too.
  ['svg', { mime: 'image/svg+xml', kind: 'file' }],
  ['heic', { mime: 'image/heic', kind: 'file' }],
  ['avi', { mime: 'video/x-msvideo', kind: 'file' }],
  ['mkv', { mime: 'video/x-matroska', kind: 'file' }],
  ['txt', { mime: 'text/plain', kind: 'file' }],
  ['md', { mime: 'text/markdown', kind: 'file' }],
  ['csv', { mime: 'text/csv', kind: 'file' }],
  ['json', { mime: 'application/json', kind: 'file' }],
  ['rtf', { mime: 'application/rtf', kind: 'file' }],
  ['doc', { mime: 'application/msword', kind: 'file' }],
  ['docx', { mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', kind: 'file' }],
  ['xls', { mime: 'application/vnd.ms-excel', kind: 'file' }],
  ['xlsx', { mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', kind: 'file' }],
  ['ppt', { mime: 'application/vnd.ms-powerpoint', kind: 'file' }],
  ['pptx', { mime: 'application/vnd.openxmlformats-officedocument.presentationml.presentation', kind: 'file' }],
  ['odt', { mime: 'application/vnd.oasis.opendocument.text', kind: 'file' }],
  ['ods', { mime: 'application/vnd.oasis.opendocument.spreadsheet', kind: 'file' }],
  ['odp', { mime: 'application/vnd.oasis.opendocument.presentation', kind: 'file' }],
  ['epub', { mime: 'application/epub+zip', kind: 'file' }],
  ['zip', { mime: 'application/zip', kind: 'file' }],
  ['7z', { mime: 'application/x-7z-compressed', kind: 'file' }],
  ['rar', { mime: 'application/vnd.rar', kind: 'file' }],
  ['tar', { mime: 'application/x-tar', kind: 'file' }],
  ['gz', { mime: 'application/gzip', kind: 'file' }],
]);

// Content types that may be displayed inside the browser; anything else
// (including files stored before this list existed) is served as a download.
const INLINE_MIME_TYPES = new Set(
  [...FILE_TYPES.values()].filter((t) => t.kind !== 'file').map((t) => t.mime),
);

export const FILE_KINDS = new Set<string>(['image', 'video', 'audio', 'pdf', 'file']);

// Requests through a Worker are capped at 100 MB on the Free and Pro plans.
export const MAX_FILE_BYTES = 100 * 1024 * 1024;

export function lookupFileType(filename: string): (FileTypeInfo & { ext: string }) | null {
  const dot = filename.lastIndexOf('.');
  if (dot === -1) return null;
  const ext = filename.slice(dot + 1).toLowerCase();
  const info = FILE_TYPES.get(ext);
  return info ? { ...info, ext } : null;
}

// Strip control characters, quotes and slashes; keep it short.
export function cleanFileName(name: string): string {
  const cleaned = name.replace(/[\u0000-\u001f\u007f"\\/]/g, '').trim().slice(0, 120);
  return cleaned || 'file';
}

export function newFileKey(keyword: string, ext: string): string {
  return `${keyword}/${Date.now()}-${crypto.randomUUID()}.${ext}`;
}

// Matches the URLs newFileKey produces for this room, and nothing else.
export function isRoomFileUrl(url: string, keyword: string): boolean {
  const pattern = new RegExp(`^/files/${keyword}/\\d+-[0-9a-f-]{36}\\.[a-z0-9]{1,5}$`);
  return pattern.test(url);
}

export function isInlineMimeType(contentType: string | null): boolean {
  const base = (contentType || '').split(';')[0].trim().toLowerCase();
  return INLINE_MIME_TYPES.has(base);
}

// RFC 6266 Content-Disposition with an ASCII fallback and a UTF-8 name.
export function contentDisposition(type: 'inline' | 'attachment', filename: string): string {
  const fallback = filename.replace(/[^\x20-\x7e]/g, '_').replace(/["\\]/g, '_');
  return `${type}; filename="${fallback}"; filename*=UTF-8''${encodeURIComponent(filename)}`;
}
