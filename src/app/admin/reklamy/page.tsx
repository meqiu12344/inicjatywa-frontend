'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { adsApi, Ad, AdSlot, AdType } from '@/lib/api/ads';
import {
  Shield,
  ArrowLeft,
  Plus,
  Pencil,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Image as ImageIcon,
  Code2,
  LayoutGrid,
  Check,
  X,
  Eye,
  Megaphone,
} from 'lucide-react';

// ─── Helpers ────────────────────────────────────────────────────────────────

const AD_TYPE_LABELS: Record<AdType, string> = {
  image: 'Obraz + link',
  html: 'Kod HTML/embed',
  google_adsense: 'Google AdSense',
};

const AD_TYPE_ICONS: Record<AdType, React.ReactNode> = {
  image: <ImageIcon className="w-4 h-4" />,
  html: <Code2 className="w-4 h-4" />,
  google_adsense: <LayoutGrid className="w-4 h-4" />,
};

// ─── Ad Form Modal ───────────────────────────────────────────────────────────

interface AdFormData {
  name: string;
  type: AdType;
  imageUrl: string;
  linkUrl: string;
  htmlCode: string;
  adsenseSlot: string;
  active: boolean;
}

const EMPTY_FORM: AdFormData = {
  name: '',
  type: 'image',
  imageUrl: '',
  linkUrl: '',
  htmlCode: '',
  adsenseSlot: '',
  active: true,
};

interface AdModalProps {
  ad?: Ad | null;
  onClose: () => void;
  onSave: () => void;
}

function AdModal({ ad, onClose, onSave }: AdModalProps) {
  const [form, setForm] = useState<AdFormData>(
    ad
      ? {
          name: ad.name,
          type: ad.type,
          imageUrl: ad.imageUrl ?? '',
          linkUrl: ad.linkUrl ?? '',
          htmlCode: ad.htmlCode ?? '',
          adsenseSlot: ad.adsenseSlot ?? '',
          active: ad.active,
        }
      : EMPTY_FORM
  );
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { setError('Nazwa jest wymagana.'); return; }
    if (form.type === 'image' && !form.imageUrl.trim()) { setError('Podaj URL obrazu.'); return; }
    if (form.type === 'html' && !form.htmlCode.trim()) { setError('Podaj kod HTML.'); return; }
    if (form.type === 'google_adsense' && !form.adsenseSlot.trim()) { setError('Podaj slot AdSense.'); return; }

    const payload = {
      name: form.name.trim(),
      type: form.type,
      imageUrl: form.imageUrl.trim() || undefined,
      linkUrl: form.linkUrl.trim() || undefined,
      htmlCode: form.htmlCode.trim() || undefined,
      adsenseSlot: form.adsenseSlot.trim() || undefined,
      active: form.active,
    };

    if (ad) {
      adsApi.updateAd(ad.id, payload);
    } else {
      adsApi.createAd(payload);
    }
    onSave();
  };

  const set = (key: keyof AdFormData, value: unknown) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">
            {ad ? 'Edytuj reklamę' : 'Dodaj nową reklamę'}
          </h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nazwa (wewnętrzna)</label>
            <input
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              placeholder="np. Kampania lato 2025"
            />
          </div>

          {/* Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Typ reklamy</label>
            <div className="grid grid-cols-3 gap-2">
              {(['image', 'html', 'google_adsense'] as AdType[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => set('type', t)}
                  className={`flex flex-col items-center gap-1 px-2 py-3 rounded-xl border-2 text-xs font-medium transition-all ${
                    form.type === t
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  {AD_TYPE_ICONS[t]}
                  {AD_TYPE_LABELS[t]}
                </button>
              ))}
            </div>
          </div>

          {/* Image fields */}
          {form.type === 'image' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">URL obrazu *</label>
                <input
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={form.imageUrl}
                  onChange={(e) => set('imageUrl', e.target.value)}
                  placeholder="https://example.com/banner.jpg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">URL docelowy (klik)</label>
                <input
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={form.linkUrl}
                  onChange={(e) => set('linkUrl', e.target.value)}
                  placeholder="https://reklamodawca.pl"
                />
              </div>
              {form.imageUrl && (
                <div className="rounded-lg overflow-hidden border border-gray-200">
                  <img src={form.imageUrl} alt="Podgląd" className="w-full object-cover max-h-32" onError={(e) => (e.currentTarget.style.display = 'none')} />
                </div>
              )}
            </>
          )}

          {/* HTML fields */}
          {form.type === 'html' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Kod HTML / embed *</label>
              <textarea
                rows={6}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={form.htmlCode}
                onChange={(e) => set('htmlCode', e.target.value)}
                placeholder={'<a href="...">\n  <img src="..." />\n</a>'}
              />
            </div>
          )}

          {/* AdSense fields */}
          {form.type === 'google_adsense' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Slot AdSense *</label>
              <input
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={form.adsenseSlot}
                onChange={(e) => set('adsenseSlot', e.target.value)}
                placeholder="ca-pub-XXXXXXXX / slot-XXXXXXXX"
              />
              <p className="text-xs text-gray-500 mt-1">
                Wklej identyfikator slotu z panelu Google AdSense.
              </p>
            </div>
          )}

          {/* Active toggle */}
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
            <span className="text-sm font-medium text-gray-700">Aktywna</span>
            <button
              type="button"
              onClick={() => set('active', !form.active)}
              className={`transition-colors ${form.active ? 'text-green-600' : 'text-gray-400'}`}
            >
              {form.active ? <ToggleRight className="w-8 h-8" /> : <ToggleLeft className="w-8 h-8" />}
            </button>
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Anuluj
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors"
            >
              {ad ? 'Zapisz zmiany' : 'Dodaj reklamę'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Slot Assignment Card ─────────────────────────────────────────────────────

interface SlotCardProps {
  slot: AdSlot;
  ads: Ad[];
  onAssign: (slotId: string, adId: string | null) => void;
}

function SlotCard({ slot, ads, onAssign }: SlotCardProps) {
  const assigned = ads.find((a) => a.id === slot.adId) ?? null;

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <p className="font-semibold text-gray-900 text-sm">{slot.label}</p>
          <p className="text-xs text-gray-500 mt-0.5">{slot.description}</p>
        </div>
        {assigned ? (
          <span className="shrink-0 inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700">
            <Check className="w-3 h-3" /> Przypisana
          </span>
        ) : (
          <span className="shrink-0 inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
            Puste
          </span>
        )}
      </div>

      {assigned && (
        <div className="mb-3 p-3 bg-indigo-50 border border-indigo-100 rounded-lg text-xs">
          <p className="font-medium text-indigo-800">{assigned.name}</p>
          <p className="text-indigo-600 mt-0.5">{AD_TYPE_LABELS[assigned.type]}</p>
        </div>
      )}

      <div className="flex items-center gap-2">
        <select
          className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
          value={slot.adId ?? ''}
          onChange={(e) => onAssign(slot.id, e.target.value || null)}
        >
          <option value="">— Brak reklamy —</option>
          {ads
            .filter((a) => a.active)
            .map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} ({AD_TYPE_LABELS[a.type]})
              </option>
            ))}
        </select>
        {slot.adId && (
          <button
            onClick={() => onAssign(slot.id, null)}
            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
            title="Usuń przypisanie"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Ad Row ───────────────────────────────────────────────────────────────────

interface AdRowProps {
  ad: Ad;
  slots: AdSlot[];
  onEdit: (ad: Ad) => void;
  onDelete: (id: string) => void;
  onToggle: (id: string) => void;
}

function AdRow({ ad, slots, onEdit, onDelete, onToggle }: AdRowProps) {
  const usedInSlot = slots.find((s) => s.adId === ad.id);

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex items-center gap-4">
      {/* Preview thumbnail */}
      <div className="shrink-0 w-16 h-12 rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center border border-gray-200">
        {ad.type === 'image' && ad.imageUrl ? (
          <img src={ad.imageUrl} alt={ad.name} className="w-full h-full object-cover" onError={(e) => (e.currentTarget.style.display = 'none')} />
        ) : (
          <span className="text-gray-400">{AD_TYPE_ICONS[ad.type]}</span>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="font-medium text-gray-900 text-sm truncate">{ad.name}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-gray-500 inline-flex items-center gap-1">
            {AD_TYPE_ICONS[ad.type]} {AD_TYPE_LABELS[ad.type]}
          </span>
          {usedInSlot && (
            <span className="text-xs text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
              {usedInSlot.label.split('–')[0].trim()}
            </span>
          )}
        </div>
      </div>

      {/* Status + actions */}
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={() => onToggle(ad.id)}
          title={ad.active ? 'Dezaktywuj' : 'Aktywuj'}
          className={`transition-colors ${ad.active ? 'text-green-500 hover:text-green-700' : 'text-gray-300 hover:text-gray-500'}`}
        >
          {ad.active ? <ToggleRight className="w-7 h-7" /> : <ToggleLeft className="w-7 h-7" />}
        </button>
        <button
          onClick={() => onEdit(ad)}
          className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
        >
          <Pencil className="w-4 h-4" />
        </button>
        <button
          onClick={() => onDelete(ad.id)}
          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdsAdminPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();

  const [ads, setAds] = useState<Ad[]>([]);
  const [slots, setSlots] = useState<AdSlot[]>([]);
  const [modalAd, setModalAd] = useState<Ad | null | undefined>(undefined);
  const [activeTab, setActiveTab] = useState<'slots' | 'library'>('slots');

  const reload = useCallback(() => {
    setAds(adsApi.getAds());
    setSlots(adsApi.getSlots());
  }, []);

  useEffect(() => { reload(); }, [reload]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
      </div>
    );
  }

  if (!isAuthenticated || !user?.is_staff) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Shield className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Brak dostępu</h1>
          <Link href="/" className="text-indigo-600 hover:text-indigo-800">Wróć do strony głównej</Link>
        </div>
      </div>
    );
  }

  const handleAssign = (slotId: string, adId: string | null) => {
    adsApi.assignAd(slotId, adId);
    reload();
  };

  const handleDelete = (id: string) => {
    if (!confirm('Na pewno usunąć tę reklamę?')) return;
    adsApi.deleteAd(id);
    reload();
  };

  const handleToggle = (id: string) => {
    const ad = ads.find((a) => a.id === id);
    if (!ad) return;
    adsApi.updateAd(id, { active: !ad.active });
    reload();
  };

  const activeCount = ads.filter((a) => a.active).length;
  const assignedCount = slots.filter((s) => s.adId !== null).length;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Header */}
        <div className="mb-8">
          <Link
            href="/admin"
            className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-indigo-600 mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Panel administracyjny
          </Link>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-rose-500 rounded-xl flex items-center justify-center">
                <Megaphone className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Zarządzanie reklamami</h1>
                <p className="text-sm text-gray-500">Biblioteka reklam i przypisania do miejsc</p>
              </div>
            </div>
            <button
              onClick={() => setModalAd(null)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" /> Dodaj reklamę
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            { label: 'Wszystkie reklamy', value: ads.length, color: 'text-gray-900' },
            { label: 'Aktywne', value: activeCount, color: 'text-green-600' },
            { label: 'Miejsca zajęte', value: `${assignedCount} / ${slots.length}`, color: 'text-indigo-600' },
          ].map((stat) => (
            <div key={stat.label} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 text-center">
              <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
              <p className="text-xs text-gray-500 mt-1">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-xl w-fit">
          {(['slots', 'library'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab === 'slots' ? (
                <span className="flex items-center gap-1.5"><Eye className="w-4 h-4" /> Miejsca reklamowe</span>
              ) : (
                <span className="flex items-center gap-1.5"><LayoutGrid className="w-4 h-4" /> Biblioteka reklam</span>
              )}
            </button>
          ))}
        </div>

        {/* Slots Tab */}
        {activeTab === 'slots' && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Przypisz reklamę do każdego miejsca. Wyświetlane są tylko reklamy oznaczone jako <strong>aktywne</strong>.
            </p>
            {slots.map((slot) => (
              <SlotCard key={slot.id} slot={slot} ads={ads} onAssign={handleAssign} />
            ))}
          </div>
        )}

        {/* Library Tab */}
        {activeTab === 'library' && (
          <div className="space-y-3">
            {ads.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-gray-300">
                <Megaphone className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 font-medium">Brak reklam w bibliotece</p>
                <p className="text-sm text-gray-400 mb-4">Dodaj pierwszą reklamę, aby przypisać ją do miejsca.</p>
                <button
                  onClick={() => setModalAd(null)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors"
                >
                  <Plus className="w-4 h-4" /> Dodaj reklamę
                </button>
              </div>
            ) : (
              ads.map((ad) => (
                <AdRow
                  key={ad.id}
                  ad={ad}
                  slots={slots}
                  onEdit={(a) => setModalAd(a)}
                  onDelete={handleDelete}
                  onToggle={handleToggle}
                />
              ))
            )}
          </div>
        )}
      </div>

      {/* Modal – undefined = closed, null = new, Ad = edit */}
      {modalAd !== undefined && (
        <AdModal
          ad={modalAd}
          onClose={() => setModalAd(undefined)}
          onSave={() => { setModalAd(undefined); reload(); }}
        />
      )}
    </div>
  );
}
