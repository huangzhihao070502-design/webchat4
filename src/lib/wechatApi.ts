/* WeChat Bot API client — proxies via Node.js to Python backend:8888 */

const API_BASE = '/api/wasm';

async function apiGet(path: string): Promise<any> {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`);
  return res.json();
}
async function apiPost(path: string, body: any): Promise<any> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`);
  return res.json();
}
async function apiGetBlob(path: string): Promise<Blob> {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) throw new Error(`API ${res.status}`); return res.blob();
}

export interface StatusData { logged_in: boolean; login_done: boolean; current_user: string | null; bot_id: string | null; user_count: number; users: string[]; message_count: number }
export interface QrCodeData { matrix?: number[][]; error?: string; login_done?: boolean; message?: string; qrcode?: string }
export interface UserData { users: string[]; current_user: string | null }
export interface MessageData { id?: number; from?: string; to?: string; text?: string; time?: string; type?: 'in' | 'out'; media_type?: number; media_filename?: string; media_cdn?: string; media_cache_id?: string; media_data?: string; media_duration?: number; has_media?: boolean }
export interface MessagesResponse { messages: MessageData[]; current_user: string | null }
export interface AiConfig { auto_reply?: boolean; scheduled_reply?: boolean; api_url?: string; api_key?: string; model?: string; active_interval?: number; min_words?: number; max_words?: number; system_prompt?: string; vision_enabled?: boolean; image_gen_enabled?: boolean; file_recognize_enabled?: boolean }

export function getStatus(): Promise<StatusData> { return apiGet('/status') }
export function getQrcode(): Promise<QrCodeData> { return apiGet('/qrcode') }
export function getUsers(): Promise<UserData> { return apiGet('/users') }
export function getMessages(user?: string, since?: number): Promise<MessagesResponse> {
  const p = new URLSearchParams(); if (user) p.set('user', user); if (since) p.set('since', String(since));
  return apiGet(`/messages?${p.toString()}`)
}
export function sendText(text: string): Promise<{ success: boolean; message?: MessageData; error?: string }> { return apiPost('/send', { text }) }
export function sendMedia(t: 'image'|'video'|'file', d: string, fn: string, thumb?: string): Promise<any> { return apiPost('/send-media', { media_type: t, file_data: d, filename: fn, thumbnail: thumb }) }
export function downloadMedia(cdn: string): Promise<any> { return apiPost('/download-media', { cdn_info: cdn }) }
export function getMedia(key: string, uid?: string): Promise<Blob> { return apiGetBlob(`/media/${key}${uid ? `?user=${encodeURIComponent(uid)}` : ''}`) }
export function switchUser(id: string): Promise<{ success: boolean }> { return apiPost('/switch-user', { user_id: id }) }
export function deleteUser(id: string): Promise<{ success: boolean }> { return apiPost('/delete-user', { user_id: id }) }
export function startAddUser(): Promise<any> { return apiPost('/add-user-start', {}) }
export function getAddUserStatus(): Promise<any> { return apiGet('/add-user-status') }
export function getAiConfig(): Promise<AiConfig> { return apiGet('/ai-config') }
export function saveAiConfig(c: AiConfig): Promise<any> { return apiPost('/ai-config', c) }
export function manualAiReply(uid: string, msg: string, ins?: string): Promise<any> { return apiPost('/ai-manual-reply', { user_id: uid, original_message: msg, instruction: ins }) }

/** Poll for new messages and user list changes */
export function startPolling(onMsg: (m: MessageData)=>void, onUsers: (u: string[], c: string|null)=>void, ms: number = 1500): ()=>void {
  let lastId = 0, running = true;
  (async function poll() { while (running) { try { const [mr, ur] = await Promise.all([getMessages(undefined, lastId), getUsers()]); mr.messages?.forEach(m => { if (m.id && m.id > lastId) lastId = m.id; onMsg(m) }); ur.users?.length && onUsers(ur.users, ur.current_user) } catch {} await new Promise(r => setTimeout(r, ms)) } })()
  return () => { running = false }
}
