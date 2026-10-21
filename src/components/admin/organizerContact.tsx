'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ExternalLink, Mail, Phone, User, Globe, BadgeCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import { adminApi, OrganizerContact, OrganizerContactStatus, OrganizerContactUpdate } from '@/lib/api/admin';
import { getErrorMessage } from '@/lib/api/client';

export const ORGANIZER_STATUSES: { value: OrganizerContactStatus; label: string; className: string }[] = [
  { value: 'to_contact', label: 'Do kontaktu', className: 'bg-amber-50 text-amber-800 border-amber-200' },
  { value: 'message_sent', label: 'Wiadomość wysłana', className: 'bg-blue-50 text-blue-800 border-blue-200' },
  { value: 'replied', label: 'Odpowiedział', className: 'bg-indigo-50 text-indigo-800 border-indigo-200' },
  { value: 'account_created', label: 'Założył konto', className: 'bg-green-50 text-green-800 border-green-200' },
  { value: 'do_not_contact', label: 'Nie chce kontaktu', className: 'bg-gray-100 text-gray-700 border-gray-200' },
];

export function useUpdateOrganizerContact(id: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: OrganizerContactUpdate) => adminApi.updateOrganizerContact(id, data),
    onSuccess: () => {
      toast.success('Zapisano');
      queryClient.invalidateQueries({ queryKey: ['organizer-contacts'] });
      queryClient.invalidateQueries({ queryKey: ['organizer-contact-stats'] });
      queryClient.invalidateQueries({ queryKey: ['ai-drafts'] });
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Nie udało się zapisać')),
  });
}

export function OrganizerStatusSelect({ contact }: { contact: OrganizerContact }) {
  const update = useUpdateOrganizerContact(contact.id);
  const style = ORGANIZER_STATUSES.find((status) => status.value === contact.status)?.className ?? '';
  return (
    <select
      value={contact.status}
      onChange={(event) => update.mutate({ status: event.target.value as OrganizerContactStatus })}
      disabled={update.isPending}
      aria-label="Status relacji z organizatorem"
      className={`text-xs font-medium px-2 py-1 rounded-full border ${style}`}
    >
      {ORGANIZER_STATUSES.map((status) => (
        <option key={status.value} value={status.value}>{status.label}</option>
      ))}
    </select>
  );
}

export function OrganizerContactDetails({ contact }: { contact: OrganizerContact }) {
  return (
    <div className="space-y-1 text-sm">
      {contact.has_account && (
        <p className="flex items-center gap-1 text-green-700">
          <BadgeCheck className="h-4 w-4" />
          Ma konto organizatora
          {contact.account_slug && (
            <a href={`/organizatorzy/${contact.account_slug}`} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline ml-1">
              (profil)
            </a>
          )}
        </p>
      )}
      {contact.email && (
        <p className="flex items-center gap-2">
          <Mail className="h-4 w-4 text-gray-400" />
          <a href={`mailto:${contact.email}`} className="text-indigo-600 hover:underline break-all">{contact.email}</a>
        </p>
      )}
      {contact.phone && (
        <p className="flex items-center gap-2">
          <Phone className="h-4 w-4 text-gray-400" />
          <a href={`tel:${contact.phone.replace(/[^\d+]/g, '')}`} className="text-indigo-600 hover:underline">{contact.phone}</a>
        </p>
      )}
      {contact.contact_person && (
        <p className="flex items-center gap-2">
          <User className="h-4 w-4 text-gray-400" />
          {contact.contact_person}
        </p>
      )}
      {contact.website && (
        <p className="flex items-center gap-2">
          <Globe className="h-4 w-4 text-gray-400" />
          <a href={contact.website} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline break-all">
            {contact.website}
          </a>
        </p>
      )}
      {contact.contact_source_url && (
        <a href={contact.contact_source_url} target="_blank" rel="noopener noreferrer" className="text-xs text-gray-500 hover:underline flex items-center gap-1">
          <ExternalLink className="h-3 w-3" />
          Skąd są dane kontaktowe
        </a>
      )}
      {!contact.email && !contact.phone && !contact.contact_person && (
        <p className="text-gray-500">Brak publicznych danych kontaktowych.</p>
      )}
    </div>
  );
}

// Szkic wiadomości do organizatora — otwiera się w programie pocztowym, gdzie można go poprawić przed wysłaniem.
export function invitationMailto(contact: OrganizerContact, events: Array<{ title: string; public_url: string | null }>) {
  const published = events.filter((event) => event.public_url);
  const single = published.length === 1;
  const list = published.map((event) => `• ${event.title}: ${event.public_url}`).join('\n');
  const subject = single ? 'Państwa wydarzenie na InicjatywaKatolicka.pl' : 'Państwa wydarzenia na InicjatywaKatolicka.pl';
  const body = [
    'Szczęść Boże,',
    '',
    `${single ? 'Państwa wydarzenie zostało dodane' : 'Państwa wydarzenia zostały dodane'} do kalendarza InicjatywaKatolicka.pl:`,
    list,
    '',
    'Zapraszamy do założenia konta organizatora — kolejne wydarzenia będą Państwo mogli dodawać samodzielnie:',
    `${window.location.origin}/zostan-organizatorem`,
    '',
    'Pozdrawiamy,',
    'Zespół InicjatywaKatolicka.pl',
  ].join('\n');
  return `mailto:${contact.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
