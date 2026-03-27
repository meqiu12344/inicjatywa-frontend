'use client';

import Link from 'next/link';
import { TicketCheck, AlertTriangle, Ticket, Plus, Trash2, Pencil, X, Check } from 'lucide-react';
import { use } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useAuthStore, useHydration } from '@/stores/authStore';
import { apiClient } from '@/lib/api/client';

interface Props {
  params: Promise<{ eventId: string }>;
}

interface TicketType {
  id: number;
  name: string;
  price: number;
  quantity_total: number;
  quantity_sold: number;
  quantity_available: number;
  max_per_order: number;
  is_active: boolean;
  is_hidden: boolean;
  sales_start?: string | null;
  sales_end?: string | null;
}

interface TicketTypesResponse {
  ticket_types: TicketType[];
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pl-PL', {
    style: 'currency',
    currency: 'PLN',
    minimumFractionDigits: 2,
  }).format(value);
};

const formatDate = (value?: string | null) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('pl-PL', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
};

export default function OrganizerManageTicketsPage({ params }: Props) {
  const resolvedParams = use(params);
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const hydrated = useHydration();
  const queryClient = useQueryClient();
  const [formMessage, setFormMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editFormData, setEditFormData] = useState({
    name: '',
    description: '',
    price: '',
    quantity: '',
    max_per_order: '5',
    sales_start_date: '',
    sales_start_time: '',
    sales_end_date: '',
    sales_end_time: '',
    is_active: true,
    is_hidden: false,
  });
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    quantity: '',
    max_per_order: '5',
    sales_start_date: '',
    sales_start_time: '',
    sales_end_date: '',
    sales_end_time: '',
    is_active: true,
    is_hidden: false,
  });

  useEffect(() => {
    if (hydrated && !isAuthenticated) {
      router.push('/logowanie?redirect=/moje-wydarzenia');
    }
  }, [hydrated, isAuthenticated, router]);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['ticket-types', resolvedParams.eventId],
    queryFn: async () => {
      const response = await apiClient.get(`/tickets/event/${resolvedParams.eventId}/types/`);
      return response.data as TicketTypesResponse;
    },
    enabled: isAuthenticated && !!resolvedParams.eventId,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        price: Number(formData.price || 0),
        quantity_total: Number(formData.quantity || 0),
        max_per_order: Number(formData.max_per_order || 5),
        is_active: formData.is_active,
        is_hidden: formData.is_hidden,
        sales_start: `${formData.sales_start_date}T${formData.sales_start_time}`,
        sales_end: `${formData.sales_end_date}T${formData.sales_end_time}`,
      };
      return apiClient.post(`/tickets/organizer/event/${resolvedParams.eventId}/types/`, payload);
    },
    onSuccess: () => {
      setFormMessage({ type: 'success', text: 'Bilet został dodany.' });
      setFormData({
        name: '',
        description: '',
        price: '',
        quantity: '',
        max_per_order: '5',
        sales_start_date: '',
        sales_start_time: '',
        sales_end_date: '',
        sales_end_time: '',
        is_active: true,
        is_hidden: false,
      });
      queryClient.invalidateQueries({ queryKey: ['ticket-types', resolvedParams.eventId] });
    },
    onError: () => {
      setFormMessage({ type: 'error', text: 'Nie udało się dodać biletu.' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (typeId: number) => {
      return apiClient.delete(`/tickets/organizer/event/${resolvedParams.eventId}/types/${typeId}/`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket-types', resolvedParams.eventId] });
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || 'Nie udało się usunąć biletu.';
      setFormMessage({ type: 'error', text: message });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ typeId, payload }: { typeId: number; payload: object }) => {
      return apiClient.put(`/tickets/organizer/event/${resolvedParams.eventId}/types/${typeId}/`, payload);
    },
    onSuccess: () => {
      setFormMessage({ type: 'success', text: 'Bilet został zaktualizowany.' });
      setEditingId(null);
      queryClient.invalidateQueries({ queryKey: ['ticket-types', resolvedParams.eventId] });
    },
    onError: () => {
      setFormMessage({ type: 'error', text: 'Nie udało się zaktualizować biletu.' });
    },
  });

  const handleEditStart = (type: TicketType) => {
    const toDatePart = (iso?: string | null) => iso ? iso.slice(0, 10) : '';
    const toTimePart = (iso?: string | null) => iso ? iso.slice(11, 16) : '';
    setEditFormData({
      name: type.name,
      description: '',
      price: String(type.price),
      quantity: String(type.quantity_total),
      max_per_order: String(type.max_per_order),
      sales_start_date: toDatePart(type.sales_start),
      sales_start_time: toTimePart(type.sales_start),
      sales_end_date: toDatePart(type.sales_end),
      sales_end_time: toTimePart(type.sales_end),
      is_active: type.is_active,
      is_hidden: type.is_hidden,
    });
    setFormMessage(null);
    setEditingId(type.id);
  };

  const handleUpdate = (e: React.FormEvent, typeId: number) => {
    e.preventDefault();
    if (!editFormData.name.trim()) {
      setFormMessage({ type: 'error', text: 'Podaj nazwę biletu.' });
      return;
    }
    const payload: Record<string, unknown> = {
      name: editFormData.name.trim(),
      description: editFormData.description.trim(),
      price: Number(editFormData.price || 0),
      quantity_total: Number(editFormData.quantity || 0),
      max_per_order: Number(editFormData.max_per_order || 5),
      is_active: editFormData.is_active,
      is_hidden: editFormData.is_hidden,
    };
    if (editFormData.sales_start_date && editFormData.sales_start_time) {
      payload.sales_start = `${editFormData.sales_start_date}T${editFormData.sales_start_time}`;
    }
    if (editFormData.sales_end_date && editFormData.sales_end_time) {
      payload.sales_end = `${editFormData.sales_end_date}T${editFormData.sales_end_time}`;
    }
    updateMutation.mutate({ typeId, payload });
  };

  const handleCreate = (event: React.FormEvent) => {
    event.preventDefault();
    setFormMessage(null);
    if (!formData.name.trim()) {
      setFormMessage({ type: 'error', text: 'Podaj nazwę biletu.' });
      return;
    }
    if (!formData.sales_start_date || !formData.sales_start_time) {
      setFormMessage({ type: 'error', text: 'Ustaw datę i godzinę rozpoczęcia sprzedaży.' });
      return;
    }
    if (!formData.sales_end_date || !formData.sales_end_time) {
      setFormMessage({ type: 'error', text: 'Ustaw datę i godzinę zakończenia sprzedaży.' });
      return;
    }
    createMutation.mutate();
  };

  const ticketTypes = data?.ticket_types || [];

  const totals = useMemo(() => {
    return ticketTypes.reduce(
      (acc, type) => {
        acc.total += type.quantity_total || 0;
        acc.sold += type.quantity_sold || 0;
        acc.available += type.quantity_available || 0;
        return acc;
      },
      { total: 0, sold: 0, available: 0 }
    );
  }, [ticketTypes]);

  if (!hydrated || !isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          <div className="flex items-center gap-3 mb-6">
            <TicketCheck className="w-8 h-8 text-indigo-600" />
            <h1 className="text-3xl font-bold text-gray-900">Zarządzanie biletami</h1>
          </div>

          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
            <div className="text-sm text-gray-600">
              Wydarzenie ID: <strong>{resolvedParams.eventId}</strong>
            </div>
            <div className="flex gap-4">
              <Link
                href={`/bilety/organizator/zarzadzaj/${resolvedParams.eventId}/zamowienia`}
                className="text-indigo-600 hover:underline"
              >
                Zobacz zamówienia
              </Link>
              <Link href="/moje-wydarzenia" className="text-indigo-600 hover:underline">
                ← Wróć do moich wydarzeń
              </Link>
            </div>
          </div>

          {isLoading && (
            <div className="text-gray-600">Ładowanie biletów...</div>
          )}

          {isError && (
            <div className="flex items-start gap-2 text-red-600">
              <AlertTriangle className="w-5 h-5" />
              Nie udało się pobrać biletów.
            </div>
          )}

          {!isLoading && !isError && (
            <>
              <div className="mb-8 rounded-lg border border-gray-200 p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Plus className="w-5 h-5 text-indigo-600" />
                  <h2 className="text-lg font-semibold text-gray-900">Dodaj typ biletu</h2>
                </div>
                <form onSubmit={handleCreate} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Nazwa biletu</label>
                      <input
                        value={formData.name}
                        onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                        className="input w-full"
                        placeholder="np. Standard"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Cena (PLN)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.price}
                        onChange={(e) => setFormData((prev) => ({ ...prev, price: e.target.value }))}
                        className="input w-full"
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Opis</label>
                    <input
                      value={formData.description}
                      onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                      className="input w-full"
                      placeholder="Krótki opis"
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Pula</label>
                      <input
                        type="number"
                        value={formData.quantity}
                        onChange={(e) => setFormData((prev) => ({ ...prev, quantity: e.target.value }))}
                        className="input w-full"
                        placeholder="100"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Max na zamówienie</label>
                      <input
                        type="number"
                        value={formData.max_per_order}
                        onChange={(e) => setFormData((prev) => ({ ...prev, max_per_order: e.target.value }))}
                        className="input w-full"
                        placeholder="5"
                      />
                    </div>
                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-2 text-sm text-gray-700">
                        <input
                          type="checkbox"
                          checked={formData.is_active}
                          onChange={(e) => setFormData((prev) => ({ ...prev, is_active: e.target.checked }))}
                        />
                        Aktywny
                      </label>
                      <label className="flex items-center gap-2 text-sm text-gray-700">
                        <input
                          type="checkbox"
                          checked={formData.is_hidden}
                          onChange={(e) => setFormData((prev) => ({ ...prev, is_hidden: e.target.checked }))}
                        />
                        Ukryty
                      </label>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Sprzedaż od</label>
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="date"
                          value={formData.sales_start_date}
                          onChange={(e) => setFormData((prev) => ({ ...prev, sales_start_date: e.target.value }))}
                          className="input w-full"
                        />
                        <input
                          type="time"
                          value={formData.sales_start_time}
                          onChange={(e) => setFormData((prev) => ({ ...prev, sales_start_time: e.target.value }))}
                          className="input w-full"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Sprzedaż do</label>
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="date"
                          value={formData.sales_end_date}
                          onChange={(e) => setFormData((prev) => ({ ...prev, sales_end_date: e.target.value }))}
                          className="input w-full"
                        />
                        <input
                          type="time"
                          value={formData.sales_end_time}
                          onChange={(e) => setFormData((prev) => ({ ...prev, sales_end_time: e.target.value }))}
                          className="input w-full"
                        />
                      </div>
                    </div>
                  </div>

                  {formMessage && (
                    <div className={formMessage.type === 'success' ? 'text-emerald-600 text-sm' : 'text-red-600 text-sm'}>
                      {formMessage.text}
                    </div>
                  )}

                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={createMutation.isPending}
                  >
                    {createMutation.isPending ? 'Dodawanie...' : 'Dodaj bilet'}
                  </button>
                </form>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="rounded-lg border border-gray-200 p-4">
                  <div className="text-sm text-gray-500">Łączna pula</div>
                  <div className="text-2xl font-semibold text-gray-900">{totals.total}</div>
                </div>
                <div className="rounded-lg border border-gray-200 p-4">
                  <div className="text-sm text-gray-500">Sprzedane</div>
                  <div className="text-2xl font-semibold text-gray-900">{totals.sold}</div>
                </div>
                <div className="rounded-lg border border-gray-200 p-4">
                  <div className="text-sm text-gray-500">Dostępne</div>
                  <div className="text-2xl font-semibold text-gray-900">{totals.available}</div>
                </div>
              </div>

              {ticketTypes.length === 0 ? (
                <div className="text-gray-600">Brak typów biletów dla tego wydarzenia.</div>
              ) : (
                <div className="space-y-4">
                  {ticketTypes.map((type) => (
                    <div key={type.id} className="border border-gray-200 rounded-lg p-4">
                      {editingId === type.id ? (
                        <form onSubmit={(e) => handleUpdate(e, type.id)} className="space-y-4">
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="font-semibold text-gray-900">Edytuj: {type.name}</h3>
                            <button type="button" onClick={() => setEditingId(null)} className="text-gray-400 hover:text-gray-600">
                              <X className="w-5 h-5" />
                            </button>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Nazwa biletu</label>
                              <input value={editFormData.name} onChange={(e) => setEditFormData((p) => ({ ...p, name: e.target.value }))} className="input w-full" />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Cena (PLN)</label>
                              <input type="number" step="0.01" value={editFormData.price} onChange={(e) => setEditFormData((p) => ({ ...p, price: e.target.value }))} className="input w-full" />
                            </div>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Opis</label>
                            <input value={editFormData.description} onChange={(e) => setEditFormData((p) => ({ ...p, description: e.target.value }))} className="input w-full" placeholder="Krótki opis" />
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Pula</label>
                              <input type="number" value={editFormData.quantity} onChange={(e) => setEditFormData((p) => ({ ...p, quantity: e.target.value }))} className="input w-full" />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Max na zamówienie</label>
                              <input type="number" value={editFormData.max_per_order} onChange={(e) => setEditFormData((p) => ({ ...p, max_per_order: e.target.value }))} className="input w-full" />
                            </div>
                            <div className="flex items-center gap-4 pt-6">
                              <label className="flex items-center gap-2 text-sm text-gray-700">
                                <input type="checkbox" checked={editFormData.is_active} onChange={(e) => setEditFormData((p) => ({ ...p, is_active: e.target.checked }))} />
                                Aktywny
                              </label>
                              <label className="flex items-center gap-2 text-sm text-gray-700">
                                <input type="checkbox" checked={editFormData.is_hidden} onChange={(e) => setEditFormData((p) => ({ ...p, is_hidden: e.target.checked }))} />
                                Ukryty
                              </label>
                            </div>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Sprzedaż od</label>
                              <div className="grid grid-cols-2 gap-2">
                                <input type="date" value={editFormData.sales_start_date} onChange={(e) => setEditFormData((p) => ({ ...p, sales_start_date: e.target.value }))} className="input w-full" />
                                <input type="time" value={editFormData.sales_start_time} onChange={(e) => setEditFormData((p) => ({ ...p, sales_start_time: e.target.value }))} className="input w-full" />
                              </div>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Sprzedaż do</label>
                              <div className="grid grid-cols-2 gap-2">
                                <input type="date" value={editFormData.sales_end_date} onChange={(e) => setEditFormData((p) => ({ ...p, sales_end_date: e.target.value }))} className="input w-full" />
                                <input type="time" value={editFormData.sales_end_time} onChange={(e) => setEditFormData((p) => ({ ...p, sales_end_time: e.target.value }))} className="input w-full" />
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-3">
                            <button type="submit" className="btn btn-primary flex items-center gap-2" disabled={updateMutation.isPending}>
                              <Check className="w-4 h-4" />
                              {updateMutation.isPending ? 'Zapisywanie...' : 'Zapisz zmiany'}
                            </button>
                            <button type="button" onClick={() => setEditingId(null)} className="btn btn-outline">
                              Anuluj
                            </button>
                          </div>
                        </form>
                      ) : (
                        <>
                          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                            <div>
                              <div className="text-sm text-gray-500">Typ biletu</div>
                              <div className="font-semibold text-gray-900">{type.name}</div>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="text-sm text-gray-600">{formatCurrency(type.price)}</div>
                              <button
                                type="button"
                                onClick={() => handleEditStart(type)}
                                className="text-indigo-600 hover:text-indigo-800 text-sm flex items-center gap-1"
                              >
                                <Pencil className="w-4 h-4" />
                                Edytuj
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  const confirmed = window.confirm('Na pewno usunąć ten typ biletu?');
                                  if (confirmed) deleteMutation.mutate(type.id);
                                }}
                                className="text-red-600 hover:text-red-800 text-sm flex items-center gap-1"
                                disabled={deleteMutation.isPending}
                              >
                                <Trash2 className="w-4 h-4" />
                                Usuń
                              </button>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
                            <div>
                              <div className="text-xs text-gray-500">Pula</div>
                              <div className="font-medium text-gray-900">{type.quantity_total}</div>
                            </div>
                            <div>
                              <div className="text-xs text-gray-500">Sprzedane</div>
                              <div className="font-medium text-gray-900">{type.quantity_sold}</div>
                            </div>
                            <div>
                              <div className="text-xs text-gray-500">Dostępne</div>
                              <div className="font-medium text-gray-900">{type.quantity_available}</div>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4 text-sm text-gray-600">
                            <div className="flex items-center gap-2">
                              <Ticket className="w-4 h-4" />
                              Max na zamówienie: {type.max_per_order}
                            </div>
                            <div>
                              Sprzedaż: {formatDate(type.sales_start)} – {formatDate(type.sales_end)}
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
