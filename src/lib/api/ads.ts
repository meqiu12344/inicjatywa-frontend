// ─── Ad Management API ───────────────────────────────────────────────────────
// Currently uses localStorage for persistence (no backend endpoint yet).
// When a backend endpoint is ready, replace storage calls with apiClient calls.

export type AdType = 'image' | 'html' | 'google_adsense';

export interface Ad {
  id: string;
  name: string;
  type: AdType;
  /** For image ads: image URL */
  imageUrl?: string;
  /** For image ads: click-through URL */
  linkUrl?: string;
  /** For html ads: raw HTML/embed code */
  htmlCode?: string;
  /** For adsense: client ID slot */
  adsenseSlot?: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AdSlot {
  id: string;
  /** Human-readable label shown in admin */
  label: string;
  /** Description of where it appears */
  description: string;
  /** Currently assigned ad ID (null = empty) */
  adId: string | null;
}

// ─── Default slots matching page.tsx placements ───────────────────────────────
const DEFAULT_SLOTS: AdSlot[] = [
  {
    id: 'ad-banner-1',
    label: 'Baner #1 – Strona główna (po wyróżnionych)',
    description: 'Wyświetlany po sekcji złotych banerów, przed rekomendacjami.',
    adId: null,
  },
  {
    id: 'ad-banner-2',
    label: 'Baner #2 – Strona główna (po Top 10)',
    description: 'Wyświetlany po sekcji Top 10, przed kategoriami.',
    adId: null,
  },
  {
    id: 'ad-popup-entry',
    label: 'Popup – Modal przy wejściu',
    description: 'Wyświetlany jako modal przy wejściu na stronę (np. wydarzenia).',
    adId: null,
  },
];

const STORAGE_KEY_ADS = 'ik_ads';
const STORAGE_KEY_SLOTS = 'ik_ad_slots';

function loadAds(): Ad[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_ADS);
    return raw ? (JSON.parse(raw) as Ad[]) : [];
  } catch {
    return [];
  }
}

function saveAds(ads: Ad[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY_ADS, JSON.stringify(ads));
  } catch (err) {
    // Handle quota exceeded or other localStorage errors by attempting to reduce payload
    // 1) Remove large inline images (data:) and oversized HTML snippets
    try {
      const reduced = ads.map((a) => {
        const copy: Ad = { ...a } as Ad;
        if (copy.imageUrl && copy.imageUrl.startsWith('data:') && copy.imageUrl.length > 100 * 1024) {
          copy.imageUrl = '';
        }
        if (copy.htmlCode && copy.htmlCode.length > 5 * 1024) {
          copy.htmlCode = '';
        }
        return copy;
      });
      localStorage.setItem(STORAGE_KEY_ADS, JSON.stringify(reduced));
      console.warn('Saved reduced ads payload to localStorage due to storage limits. Some large fields were removed.');
    } catch (err2) {
      // 2) As a last resort, save only metadata to avoid blowing the quota
      try {
        const meta = ads.map((a) => ({
          id: a.id,
          name: a.name,
          type: a.type,
          linkUrl: a.linkUrl,
          adsenseSlot: a.adsenseSlot,
          active: a.active,
          createdAt: a.createdAt,
          updatedAt: a.updatedAt,
        }));
        localStorage.setItem(STORAGE_KEY_ADS, JSON.stringify(meta));
        console.warn('Saved ads metadata only to localStorage as a fallback due to storage limits.');
      } catch (err3) {
        // give up — log and continue without throwing to avoid breaking admin UI
        // eslint-disable-next-line no-console
        console.error('Failed to persist ads to localStorage after multiple fallbacks:', err3);
      }
    }
  }
}

function loadSlots(): AdSlot[] {
  if (typeof window === 'undefined') return DEFAULT_SLOTS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SLOTS);
    if (!raw) return DEFAULT_SLOTS;
    const saved = JSON.parse(raw) as AdSlot[];
    // Merge: keep saved adId assignments but always include all default slots
    return DEFAULT_SLOTS.map((def) => {
      const found = saved.find((s) => s.id === def.id);
      return found ? { ...def, adId: found.adId } : def;
    });
  } catch {
    return DEFAULT_SLOTS;
  }
}

function saveSlots(slots: AdSlot[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY_SLOTS, JSON.stringify(slots));
}

// ─── Public API ───────────────────────────────────────────────────────────────

export const adsApi = {
  // ── Ads CRUD ──────────────────────────────────────────────────────────────
  getAds(): Ad[] {
    return loadAds();
  },

  getAdById(id: string): Ad | undefined {
    return loadAds().find((a) => a.id === id);
  },

  createAd(data: Omit<Ad, 'id' | 'createdAt' | 'updatedAt'>): Ad {
    const ads = loadAds();
    const now = new Date().toISOString();
    const ad: Ad = {
      ...data,
      id: `ad_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      createdAt: now,
      updatedAt: now,
    };
    saveAds([...ads, ad]);
    return ad;
  },

  updateAd(id: string, data: Partial<Omit<Ad, 'id' | 'createdAt'>>): Ad {
    const ads = loadAds();
    const idx = ads.findIndex((a) => a.id === id);
    if (idx === -1) throw new Error(`Ad ${id} not found`);
    const updated: Ad = { ...ads[idx], ...data, updatedAt: new Date().toISOString() };
    ads[idx] = updated;
    saveAds(ads);
    return updated;
  },

  deleteAd(id: string): void {
    const ads = loadAds().filter((a) => a.id !== id);
    saveAds(ads);
    // Also unassign from any slot
    const slots = loadSlots().map((s) => (s.adId === id ? { ...s, adId: null } : s));
    saveSlots(slots);
  },

  // ── Slots ─────────────────────────────────────────────────────────────────
  getSlots(): AdSlot[] {
    return loadSlots();
  },

  assignAd(slotId: string, adId: string | null): AdSlot {
    const slots = loadSlots();
    const idx = slots.findIndex((s) => s.id === slotId);
    if (idx === -1) throw new Error(`Slot ${slotId} not found`);
    slots[idx] = { ...slots[idx], adId };
    saveSlots(slots);
    return slots[idx];
  },

  /** Returns the active Ad for a given slot ID, or null */
  getAdForSlot(slotId: string): Ad | null {
    const slots = loadSlots();
    const slot = slots.find((s) => s.id === slotId);
    if (!slot?.adId) return null;
    const ad = loadAds().find((a) => a.id === slot.adId && a.active);
    return ad ?? null;
  },
};
