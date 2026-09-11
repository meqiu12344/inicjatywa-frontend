import { apiClient } from '@/lib/api/client';

export type AdType = 'image' | 'html' | 'google_adsense';

export interface Ad {
  id: string;
  name: string;
  type: AdType;
  imageUrl?: string;
  linkUrl?: string;
  htmlCode?: string;
  adsenseSlot?: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  slotId?: string | null;
}

export interface AdSlot {
  id: string;
  label: string;
  description: string;
  adId: string | null;
}

interface ApiAdvertisement {
  id: number;
  title: string;
  image: string | null;
  click_url: string | null;
  status: string;
  ad_slot: string | null;
  created_at: string;
  updated_at: string;
}

const DEFAULT_SLOTS: AdSlot[] = [
  { id: 'ad-banner-1', label: 'Baner #1 - Strona główna', description: 'Po wyróżnionych wydarzeniach.', adId: null },
  { id: 'ad-banner-2', label: 'Baner #2 - Strona główna', description: 'Po sekcji Top 10.', adId: null },
  { id: 'ad-popup-entry', label: 'Popup - przy wejściu', description: 'Modal przy wejściu na stronę.', adId: null },
];

function toAd(ad: ApiAdvertisement): Ad {
  return {
    id: String(ad.id), name: ad.title, type: 'image', imageUrl: ad.image || undefined,
    linkUrl: ad.click_url || undefined, active: ad.status === 'active',
    createdAt: ad.created_at, updatedAt: ad.updated_at, slotId: ad.ad_slot,
  };
}

async function imageToFile(value?: string): Promise<File | null> {
  if (!value?.startsWith('data:')) return null;
  const response = await fetch(value);
  const blob = await response.blob();
  const type = blob.type || 'image/png';
  const extension = type === 'image/jpeg' ? 'jpg' : type.split('/')[1] || 'png';
  return new File([blob], `advertisement-image.${extension}`, { type });
}

async function buildFormData(data: Partial<Ad>): Promise<FormData> {
  if (data.type && data.type !== 'image') {
    throw new Error('Aktualnie obsługiwane są wyłącznie reklamy obrazkowe.');
  }
  const payload = new FormData();
  if (data.name !== undefined) payload.set('title', data.name);
  if (data.linkUrl !== undefined) {
    const url = data.linkUrl.trim();
    payload.set('click_url', url && !/^https?:\/\//i.test(url) ? `https://${url}` : url);
  }
  if (data.active !== undefined) payload.set('status', data.active ? 'active' : 'paused');
  if (data.slotId !== undefined) payload.set('ad_slot', data.slotId || '');
  payload.set('placement', 'homepage');
  const image = await imageToFile(data.imageUrl);
  if (image) payload.set('image', image);
  return payload;
}

async function getAllAds(): Promise<Ad[]> {
  const { data } = await apiClient.get<ApiAdvertisement[] | { results: ApiAdvertisement[] }>('/advertisements/admin/');
  return (Array.isArray(data) ? data : data.results).map(toAd);
}

export const adsApi = {
  getAds: getAllAds,

  async getSlots(): Promise<AdSlot[]> {
    const ads = await getAllAds();
    return DEFAULT_SLOTS.map((slot) => ({ ...slot, adId: ads.find((ad) => ad.slotId === slot.id)?.id || null }));
  },

  async createAd(data: Omit<Ad, 'id' | 'createdAt' | 'updatedAt'>): Promise<Ad> {
    const { data: created } = await apiClient.post<ApiAdvertisement>('/advertisements/admin/', await buildFormData(data), { headers: { 'Content-Type': 'multipart/form-data' } });
    return toAd(created);
  },

  async updateAd(id: string, data: Partial<Omit<Ad, 'id' | 'createdAt'>>): Promise<Ad> {
    const { data: updated } = await apiClient.patch<ApiAdvertisement>(`/advertisements/admin/${id}/`, await buildFormData(data), { headers: { 'Content-Type': 'multipart/form-data' } });
    return toAd(updated);
  },

  async deleteAd(id: string): Promise<void> {
    await apiClient.delete(`/advertisements/admin/${id}/`);
  },

  async assignAd(slotId: string, adId: string | null): Promise<void> {
    const ads = await getAllAds();
    const current = ads.find((ad) => ad.slotId === slotId);
    if (current && current.id !== adId) await this.updateAd(current.id, { slotId: null });
    if (adId) await this.updateAd(adId, { slotId });
  },

  async getAdForSlot(slotId: string): Promise<Ad | null> {
    const { data } = await apiClient.get<ApiAdvertisement[]>(`/advertisements/public/by_placement/?placement=homepage&slot=${encodeURIComponent(slotId)}`);
    return data[0] ? toAd(data[0]) : null;
  },
};
