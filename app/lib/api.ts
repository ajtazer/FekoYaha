import { apiUrl } from './config'
import type { AdminRoom, AdminRoomInfo, RoomInfo, UploadResult } from './types'

async function asJson<T>(res: Response): Promise<T> {
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const message = (data as { error?: string }).error || `Request failed (${res.status})`
    throw new Error(message)
  }
  return data as T
}

export async function getRoomInfo(keyword: string): Promise<RoomInfo> {
  return asJson<RoomInfo>(await fetch(apiUrl(`/api/room/${keyword}/info`)))
}

// Creates the room (the original "Create Room" step). A 409 means someone else
// created it a moment ago, which is fine: the room exists either way.
export async function createRoom(keyword: string): Promise<void> {
  const res = await fetch(apiUrl(`/api/room/${keyword}/create`), { method: 'POST' })
  if (res.ok || res.status === 409) return
  const data = await res.json().catch(() => ({}))
  throw new Error((data as { error?: string }).error || 'Failed to create room')
}

// Two-step upload with progress. Step 1 pre-checks; step 2 streams the file and
// returns the stored URL, server-chosen name, size and kind.
export function uploadFile(
  keyword: string,
  file: File,
  onProgress?: (percent: number) => void,
): Promise<UploadResult> {
  return new Promise((resolve, reject) => {
    fetch(apiUrl(`/api/room/${keyword}/upload`), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filename: file.name, contentType: file.type || 'application/octet-stream', size: file.size }),
    })
      .then((res) => asJson<{ uploadUrl: string }>(res))
      .then(({ uploadUrl }) => {
        const form = new FormData()
        form.append('file', file)
        const xhr = new XMLHttpRequest()
        xhr.open('POST', apiUrl(uploadUrl))
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100))
        })
        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              resolve(JSON.parse(xhr.responseText) as UploadResult)
            } catch {
              reject(new Error('Upload succeeded but the response was unreadable'))
            }
          } else {
            let message = 'Upload failed'
            try { message = JSON.parse(xhr.responseText).error || message } catch { /* keep default */ }
            reject(new Error(message))
          }
        })
        xhr.addEventListener('error', () => reject(new Error('Network error during upload')))
        xhr.addEventListener('abort', () => reject(new Error('Upload cancelled')))
        xhr.send(form)
      })
      .catch(reject)
  })
}

// --- Admin ---
function adminHeaders(token: string) {
  return { Authorization: token }
}

export async function adminVerify(token: string): Promise<boolean> {
  const res = await fetch(apiUrl('/api/admin/rooms'), { headers: adminHeaders(token) })
  return res.ok
}

export async function adminListRooms(token: string): Promise<AdminRoom[]> {
  const data = await asJson<{ rooms: AdminRoom[] }>(
    await fetch(apiUrl('/api/admin/rooms'), { headers: adminHeaders(token) }),
  )
  return data.rooms ?? []
}

export async function adminRoomInfo(token: string, keyword: string): Promise<AdminRoomInfo> {
  return asJson<AdminRoomInfo>(
    await fetch(apiUrl(`/api/admin/room/${keyword}/info`), { headers: adminHeaders(token) }),
  )
}

// "lock" toggles the room between read-only and open.
export async function adminAction(
  token: string,
  keyword: string,
  action: 'lock' | 'clear' | 'delete',
): Promise<void> {
  const res = await fetch(apiUrl(`/api/admin/room/${keyword}/${action}`), {
    method: 'POST',
    headers: adminHeaders(token),
  })
  if (!res.ok) throw new Error(`Action "${action}" failed (${res.status})`)
}
