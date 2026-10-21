'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Users, Copy, Mail, Send, Clock, UserCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { adminApi, OrganizerContact, OrganizerContactStatus } from '@/lib/api/admin';
import { getErrorMessage } from '@/lib/api/client';
import {
  ORGANIZER_STATUSES,
  OrganizerContactDetails,
  OrganizerStatusSelect,
  invitationMailto,
  useUpdateOrganizerContact,
} from './organizerContact';

function copyLink(url: string) {
  navigator.clipboard.writeText(url).then(
    () => toast.success('Link skopiowany'),
    () => toast.error('Nie udało się skopiować linku'),
  );
}

function OrganizerCard({ contact }: { contact: OrganizerContact }) {
  const queryClient = useQueryClient();
  const [notes, setNotes] = useState(contact.notes);
  const update = useUpdateOrganizerContact(contact.id);
  const events = contact.events ?? [];
  const published = events.filter((event) => event.public_url);
  const canWrite = contact.email && published.length > 0 && contact.status !== 'do_not_contact';
  const transferableCount = contact.transferable_count ?? 0;

  const transfer = useMutation({
    mutationFn: () => adminApi.transferOrganizerEvents(contact.id),
    onSuccess: (result) => {
      toast.success(result.message);
      queryClient.invalidateQueries({ queryKey: ['organizer-contacts'] });
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Nie udało się przekazać wydarzeń')),
  });

  const confirmTransfer = () => {
    const question =
      `Przekazać ${transferableCount} opublikowanych wydarzeń na konto organizatora „${contact.name}”?\n\n` +
      'Pojawią się na jego profilu, a organizator będzie mógł je edytować i usuwać.';
    if (window.confirm(question)) transfer.mutate();
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
      <div className="flex items-start justify-between gap-3 flex-wrap mb-3">
        <h3 className="font-semibold text-gray-900">{contact.name}</h3>
        <OrganizerStatusSelect contact={contact} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <OrganizerContactDetails contact={contact} />

        <div>
          <p className="text-sm font-medium text-gray-500 mb-1">Wydarzenia ({events.length})</p>
          <ul className="space-y-1 text-sm">
            {events.map((event) => (
              <li key={event.id} className="flex items-center gap-2 flex-wrap">
                <span className="text-gray-500">{format(new Date(event.start_date), 'd MMM yyyy', { locale: pl })}</span>
                {event.public_url ? (
                  <>
                    <a href={event.public_url} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">
                      {event.title}
                    </a>
                    <button onClick={() => copyLink(event.public_url!)} title="Kopiuj link" aria-label="Kopiuj link" className="text-gray-400 hover:text-gray-700">
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                    {event.owned_by_organizer && (
                      <span className="text-xs px-1.5 rounded bg-green-50 text-green-700 border border-green-200">u organizatora</span>
                    )}
                  </>
                ) : (
                  <span className="text-gray-700">
                    {event.title}{' '}
                    <span className="text-xs text-gray-400">({event.status === 'ai_draft' ? 'czeka na akceptację' : 'niepubliczne'})</span>
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <textarea
        value={notes}
        onChange={(event) => setNotes(event.target.value)}
        onBlur={() => notes !== contact.notes && update.mutate({ notes })}
        placeholder="Notatki (np. z kim rozmawiano, kiedy ponowić kontakt)…"
        rows={2}
        className="w-full mt-4 border border-gray-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
      />

      <div className="flex gap-2 mt-3 flex-wrap">
        {canWrite && (
          <a
            href={invitationMailto(contact, published)}
            className="px-3 py-1.5 text-sm rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 flex items-center gap-1"
          >
            <Mail className="h-4 w-4" />
            Napisz e-mail z linkiem
          </a>
        )}
        {contact.status === 'to_contact' && (
          <button
            onClick={() => update.mutate({ status: 'message_sent' })}
            disabled={update.isPending}
            className="px-3 py-1.5 text-sm rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 flex items-center gap-1 disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
            Oznacz: wiadomość wysłana
          </button>
        )}
        {contact.has_account && transferableCount > 0 && (
          <button
            onClick={confirmTransfer}
            disabled={transfer.isPending}
            className="px-3 py-1.5 text-sm rounded-lg bg-green-600 text-white hover:bg-green-700 flex items-center gap-1 disabled:opacity-50"
          >
            <UserCheck className="h-4 w-4" />
            Przekaż wydarzenia organizatorowi ({transferableCount})
          </button>
        )}
        {contact.status_changed_at && (
          <span className="text-xs text-gray-400 flex items-center gap-1 ml-auto">
            <Clock className="h-3 w-3" />
            status zmieniony {format(new Date(contact.status_changed_at), 'dd.MM.yyyy HH:mm', { locale: pl })}
          </span>
        )}
      </div>
    </div>
  );
}

export function OrganizerContactsPanel() {
  const [status, setStatus] = useState<OrganizerContactStatus | undefined>('to_contact');

  const { data: contacts = [], isLoading } = useQuery({
    queryKey: ['organizer-contacts', status],
    queryFn: () => adminApi.getOrganizerContacts(status),
  });
  const { data: stats } = useQuery({
    queryKey: ['organizer-contact-stats'],
    queryFn: () => adminApi.getOrganizerContactStats(),
  });

  return (
    <>
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6 flex flex-wrap items-center gap-2 text-sm">
        <span className="flex items-center gap-2 font-medium text-gray-900 mr-2">
          <Users className="h-5 w-5 text-indigo-600" />
          Organizatorzy
        </span>
        <button
          onClick={() => setStatus(undefined)}
          className={`px-3 py-1.5 rounded-lg ${!status ? 'bg-indigo-100 text-indigo-700 font-medium' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
        >
          Wszyscy
        </button>
        {ORGANIZER_STATUSES.map((option) => (
          <button
            key={option.value}
            onClick={() => setStatus(option.value)}
            className={`px-3 py-1.5 rounded-lg ${status === option.value ? 'bg-indigo-100 text-indigo-700 font-medium' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            {option.label} ({stats?.[option.value] ?? 0})
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
        </div>
      ) : contacts.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center text-gray-500">
          <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
          <p>Brak organizatorów z tym statusem</p>
        </div>
      ) : (
        <div className="space-y-4">
          {contacts.map((contact) => (
            <OrganizerCard key={`${contact.id}-${contact.updated_at}`} contact={contact} />
          ))}
        </div>
      )}
    </>
  );
}
