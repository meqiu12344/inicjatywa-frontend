'use client';

/**
 * Gate scanning client — łączy się z endpointami /tickets/gate/* backendu.
 *
 * Tryby:
 *  - ONLINE:  POST /tickets/gate/scan/ (atomowa weryfikacja + oznaczenie)
 *  - OFFLINE: weryfikacja podpisu Ed25519 w przeglądarce (Web Crypto) +
 *             sprawdzenie przynależności hashu do manifestu; skan trafia do
 *             kolejki i jest synchronizowany po powrocie sieci (reconcile).
 *
 * Uwierzytelnianie: token urządzenia w nagłówku 'X-Gate-Token'
 * (per-wydarzenie, trzymany w localStorage).
 */
import { apiClient } from '@/lib/api/client';

export type GateResult =
  | 'admit'
  | 'already_used'
  | 'duplicate'
  | 'not_found'
  | 'wrong_event'
  | 'unpaid'
  | 'invalid';

export interface GateScanOutcome {
  result: GateResult;
  admit: boolean;
  is_duplicate: boolean;
  offline: boolean;
  message?: string;
  ticket?: {
    code?: string;
    type?: string;
    attendee?: string;
    used_at?: string | null;
  };
}

export interface GateManifest {
  event_id: number;
  event_title: string;
  generated_at: string;
  public_key: string | null;
  signing_enabled: boolean;
  valid_count: number;
  valid_hashes: string[];
}

interface QueuedScan {
  code: string;
  scanned_at: string;
  client_nonce: string;
}

// ── localStorage keys ─────────────────────────────────────
const tokenKey = (eventId: number) => `gate_token_${eventId}`;
const manifestKey = (eventId: number) => `gate_manifest_${eventId}`;
const queueKey = (eventId: number) => `gate_queue_${eventId}`;

// ── Token management ──────────────────────────────────────
export function getDeviceToken(eventId: number): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(tokenKey(eventId));
}

export function setDeviceToken(eventId: number, token: string): void {
  localStorage.setItem(tokenKey(eventId), token.trim());
}

export function clearDeviceToken(eventId: number): void {
  localStorage.removeItem(tokenKey(eventId));
}

// ── base64url helpers (zgodne z backendem) ────────────────
function b64urlToBytes(data: string): Uint8Array {
  const pad = '='.repeat((4 - (data.length % 4)) % 4);
  const b64 = (data + pad).replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

function decodeJsonPayload(messageB64: string): Record<string, unknown> | null {
  try {
    const bytes = b64urlToBytes(messageB64);
    const text = new TextDecoder().decode(bytes);
    return JSON.parse(text);
  } catch {
    return null;
  }
}

// ── Manifest (pre-sync) ───────────────────────────────────
export async function fetchManifest(eventId: number, token: string): Promise<GateManifest> {
  const res = await apiClient.get('/tickets/gate/manifest/', {
    headers: { 'X-Gate-Token': token },
  });
  const manifest = res.data as GateManifest;
  localStorage.setItem(manifestKey(eventId), JSON.stringify(manifest));
  return manifest;
}

export function getCachedManifest(eventId: number): GateManifest | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(manifestKey(eventId));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as GateManifest;
  } catch {
    return null;
  }
}

// ── Offline signature verification (Ed25519, Web Crypto) ──
let cachedKey: { b64: string; key: CryptoKey } | null = null;

async function importPublicKey(publicKeyB64: string): Promise<CryptoKey | null> {
  if (cachedKey && cachedKey.b64 === publicKeyB64) return cachedKey.key;
  try {
    const raw = b64urlToBytes(publicKeyB64);
    const key = await crypto.subtle.importKey('raw', raw as BufferSource, { name: 'Ed25519' }, false, ['verify']);
    cachedKey = { b64: publicKeyB64, key };
    return key;
  } catch {
    return null;
  }
}

/**
 * Weryfikuje zeskanowany kod offline na podstawie manifestu.
 * Zwraca { tid } gdy ważny, albo null.
 *
 * - Podpisany token (message.signature): weryfikacja kryptograficzna + membership.
 * - "TICKET:hash" / surowy hash: tylko membership w manifeście (tryb zdegradowany).
 */
async function verifyOffline(
  code: string,
  manifest: GateManifest
): Promise<{ tid: string } | null> {
  const validSet = new Set(manifest.valid_hashes);

  // Podpisany token Ed25519
  if (code.includes('.') && !code.includes(':')) {
    const [message, sig] = code.split('.', 2);
    const payload = decodeJsonPayload(message);
    if (!payload) return null;

    const tid = String(payload.tid ?? '');
    const exp = Number(payload.exp ?? 0);
    if (exp && exp < Math.floor(Date.now() / 1000)) return null;
    if (payload.ev !== undefined && Number(payload.ev) !== manifest.event_id) return null;

    if (manifest.public_key) {
      const key = await importPublicKey(manifest.public_key);
      if (!key) return null;
      const ok = await crypto.subtle.verify(
        { name: 'Ed25519' },
        key,
        b64urlToBytes(sig) as BufferSource,
        new TextEncoder().encode(message) as BufferSource
      );
      if (!ok) return null;
    }
    return validSet.has(tid) ? { tid } : null;
  }

  // Opaque hash (bez podpisu) — tylko przynależność do manifestu
  const hash = code.replace('TICKET:', '');
  return validSet.has(hash) ? { tid: hash } : null;
}

// ── Offline queue ─────────────────────────────────────────
export function getQueue(eventId: number): QueuedScan[] {
  if (typeof window === 'undefined') return [];
  const raw = localStorage.getItem(queueKey(eventId));
  if (!raw) return [];
  try {
    return JSON.parse(raw) as QueuedScan[];
  } catch {
    return [];
  }
}

function saveQueue(eventId: number, queue: QueuedScan[]): void {
  localStorage.setItem(queueKey(eventId), JSON.stringify(queue));
}

function enqueueScan(eventId: number, scan: QueuedScan): void {
  const queue = getQueue(eventId);
  queue.push(scan);
  saveQueue(eventId, queue);
}

export function getQueueLength(eventId: number): number {
  return getQueue(eventId).length;
}

// Lokalny rejestr hashy użytych offline na TYM urządzeniu (anty-podwójne wejście)
const usedOfflineKey = (eventId: number) => `gate_used_offline_${eventId}`;

function markUsedOffline(eventId: number, tid: string): boolean {
  const raw = localStorage.getItem(usedOfflineKey(eventId));
  const set: string[] = raw ? JSON.parse(raw) : [];
  if (set.includes(tid)) return false; // już użyty na tej bramce
  set.push(tid);
  localStorage.setItem(usedOfflineKey(eventId), JSON.stringify(set));
  return true;
}

// ── Public API: scan ──────────────────────────────────────
export async function scan(
  eventId: number,
  code: string,
  opts: { online: boolean }
): Promise<GateScanOutcome> {
  const token = getDeviceToken(eventId);
  if (!token) {
    return { result: 'invalid', admit: false, is_duplicate: false, offline: !opts.online, message: 'Brak tokenu bramki' };
  }

  const nonce = crypto.randomUUID();
  const scannedAt = new Date().toISOString();

  if (opts.online) {
    try {
      const res = await apiClient.post(
        '/tickets/gate/scan/',
        { code, scanned_at: scannedAt, mode: 'online', client_nonce: nonce },
        { headers: { 'X-Gate-Token': token } }
      );
      return { ...(res.data as GateScanOutcome), offline: false };
    } catch (err: unknown) {
      const e = err as { response?: { status?: number; data?: GateScanOutcome } };
      if (e.response?.data) {
        return { ...e.response.data, offline: false };
      }
      // Brak odpowiedzi — sieć padła; zejdź do trybu offline poniżej
    }
  }

  // ── OFFLINE ──
  const manifest = getCachedManifest(eventId);
  if (!manifest) {
    return { result: 'invalid', admit: false, is_duplicate: false, offline: true, message: 'Brak manifestu offline. Zsynchronizuj online.' };
  }

  const verified = await verifyOffline(code, manifest);
  if (!verified) {
    enqueueScan(eventId, { code, scanned_at: scannedAt, client_nonce: nonce });
    return { result: 'invalid', admit: false, is_duplicate: false, offline: true, message: 'Bilet nieważny (offline)' };
  }

  const firstUse = markUsedOffline(eventId, verified.tid);
  enqueueScan(eventId, { code, scanned_at: scannedAt, client_nonce: nonce });

  if (!firstUse) {
    return { result: 'already_used', admit: false, is_duplicate: true, offline: true, message: 'Bilet już zeskanowany na tej bramce (offline)' };
  }
  return { result: 'admit', admit: true, is_duplicate: false, offline: true, message: 'Wpuszczono (offline — do potwierdzenia)' };
}

// ── Reconcile (po powrocie sieci) ─────────────────────────
export async function reconcile(eventId: number): Promise<{ synced: number } | null> {
  const token = getDeviceToken(eventId);
  const queue = getQueue(eventId);
  if (!token || queue.length === 0) return { synced: 0 };

  try {
    await apiClient.post(
      '/tickets/gate/reconcile/',
      { scans: queue },
      { headers: { 'X-Gate-Token': token } }
    );
    saveQueue(eventId, []);
    localStorage.removeItem(usedOfflineKey(eventId));
    return { synced: queue.length };
  } catch {
    return null; // zostaw kolejkę do następnej próby
  }
}
