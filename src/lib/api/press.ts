import axios from 'axios';
import { apiClient } from './client';

export interface PressAccess {
  id: number; full_name: string; newsroom: string; website: string; portfolio: string;
  motivation: string; status: 'pending' | 'approved' | 'rejected' | 'suspended';
  decision_note: string; email: string; created_at: string;
  user_id: number; api_enabled: boolean;
}
export interface PressRights {
  rights_owner: string; author: string; source: string; license: string; credit: string;
  allowed_media: string[]; license_expires_at: string | null;
}
export interface PressAttachment extends PressRights { id: number; original_name: string; size: number }
export interface PressMaterial extends PressRights {
  id: number; title: string; description: string; kind: string; event: number | null;
  event_title: string | null; author: string; license: string; credit: string;
  contact_email: string; published: boolean; available_from: string; attachments: PressAttachment[];
  workflow: string; audience: string; selected_partners?: number[]; embargo_until: string | null; embargo_mode: string;
  region: string; city: string; topic: string; tags: string[]; urgent: boolean;
  radio_short: string; radio_long: string; guest: string; youtube_url: string; transcript: string;
  contact_name: string; contact_phone: string;
}
export interface PressDownload { id: number; email: string; material: string; filename: string; created_at: string }
export interface PressPage<T> { count: number; next: string | null; previous: string | null; results: T[] }
export const pressKinds: Record<string, string> = { release: 'Komunikat', photo: 'Zdjęcia', audio: 'Audio', video: 'Wideo', package: 'Paczka prasowa', program: 'Oto Nadchodzi', interview: 'Wywiad', broll: 'B-roll' };
export const pressWorkflow: Record<string, string> = { draft: 'Szkic', review: 'Do weryfikacji', approved: 'Zaakceptowany', published: 'Opublikowany', archived: 'Archiwalny', rejected: 'Odrzucony' };
export const pressMedia: Record<string, string> = { radio: 'Radio', tv: 'Telewizja', internet: 'Internet', social: 'Social media', print: 'Druk' };
export const splitPressValues = (value: FormDataEntryValue | null) => String(value ?? '').split(',').map(item => item.trim()).filter(Boolean);
export const pressLocalDate = (value?: string | null) => value ? new Date(new Date(value).getTime() - new Date(value).getTimezoneOffset() * 60000).toISOString().slice(0, 16) : '';
export const pressStatuses = { pending: 'Oczekuje na weryfikację', approved: 'Dostęp aktywny', rejected: 'Wniosek odrzucony', suspended: 'Dostęp zawieszony' };

export function pressError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data;
    if (data && !(data instanceof Blob)) {
      if (typeof data.detail === 'string') return data.detail;
      if (Array.isArray(data)) return data.join(' ');
      if (typeof data === 'object') return Object.entries(data).map(([key, value]) => `${key}: ${String(value)}`).join(' ');
    }
    if (error.response?.status === 403) return 'Brak dostępu. Sprawdź aktualny status wniosku.';
    if (error.response?.status === 404) return 'Materiał lub plik jest niedostępny.';
  }
  return 'Nie udało się wykonać operacji. Spróbuj ponownie.';
}

export async function downloadPressFile(attachment: PressAttachment) {
  return downloadPressResource(`/press/attachments/${attachment.id}/download/`, attachment.original_name);
}

export async function downloadPressResource(path: string, filename: string) {
  let blob: Blob;
  try { blob = (await apiClient.get<Blob>(path, { responseType: 'blob' })).data; }
  catch (error) {
    if (axios.isAxiosError(error) && error.response?.data instanceof Blob) {
      const text = await error.response.data.text();
      if (text.trim().startsWith('{') || text.trim().startsWith('[')) {
        try { error.response.data = JSON.parse(text); } catch { error.response.data = null; }
      }
    }
    throw error;
  }
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}