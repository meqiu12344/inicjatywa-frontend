'use client';

import { FormEvent, useState } from 'react';
import { Check, ShieldCheck } from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import { pressError, pressStatuses, PressAccess, PressDecision } from '@/lib/api/press';
import { Feedback } from './PressFeedback';

const inputValues = (form: HTMLFormElement) => Object.fromEntries(new FormData(form).entries());

export function Application({ access, onDone }: { access: PressAccess | null; onDone: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = inputValues(event.currentTarget);
    setBusy(true);
    setError('');
    try {
      const { data } = await apiClient.post<PressDecision>('/press/access/', values);
      setMessage(
        data.notification_sent ? 'Wniosek wysłany.' : 'Wniosek zapisany, ale wiadomość e-mail nie została wysłana.',
      );
      onDone();
    } catch (failure) {
      setError(pressError(failure));
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="press-section">
      {access && (
        <div className="press-status">
          <ShieldCheck size={24} />
          <div>
            <h2>{pressStatuses[access.status]}</h2>
            <p>{access.newsroom}</p>
            {access.decision_note && <p>{access.decision_note}</p>}
          </div>
        </div>
      )}
      <Feedback error={error} message={message} />
      {(!access || access.status === 'rejected') && (
        <form onSubmit={submit} className="press-form">
          <h2>Wniosek o dostęp dla mediów</h2>
          <div className="press-fields">
            <label>
              Imię i nazwisko
              <input name="full_name" required maxLength={200} defaultValue={access?.full_name} autoComplete="name" />
            </label>
            <label>
              Redakcja / medium
              <input
                name="newsroom"
                required
                maxLength={200}
                defaultValue={access?.newsroom}
                autoComplete="organization"
              />
            </label>
            <label>
              Strona redakcji
              <input name="website" type="text" inputMode="url" defaultValue={access?.website} />
            </label>
            <label>
              Link do publikacji / profil autora
              <input name="portfolio" type="text" inputMode="url" required defaultValue={access?.portfolio} />
            </label>
          </div>
          <label>
            Cel korzystania z materiałów
            <textarea name="motivation" required maxLength={3000} rows={4} defaultValue={access?.motivation} />
          </label>
          <button className="press-primary" disabled={busy}>
            <Check size={18} />
            {busy ? 'Wysyłanie…' : 'Wyślij wniosek'}
          </button>
        </form>
      )}
    </section>
  );
}
