'use client';

import { useEffect, useState } from 'react';
import { Eye, X } from 'lucide-react';
import { fetchPressBlob, PressAttachment, pressError } from '@/lib/api/press';

const formats: Record<string, string> = {
  jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp',
  mp3: 'audio/mpeg', wav: 'audio/wav', mp4: 'video/mp4',
};

function PreviewContent({ attachment, mediaType }: { attachment: PressAttachment; mediaType: string }) {
  const [source, setSource] = useState('');
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    let objectUrl = '';
    setSource(''); setError('');
    async function load() {
      try {
        const blob = await fetchPressBlob(`/press/attachments/${attachment.id}/preview/`, controller.signal);
        if (controller.signal.aborted) return;
        if (blob.type.split(';')[0] !== mediaType) {
          setError('Nieprawidłowy format podglądu. Pobierz plik, aby sprawdzić go lokalnie.');
          return;
        }
        objectUrl = URL.createObjectURL(blob);
        setSource(objectUrl);
      } catch (failure) {
        if (!controller.signal.aborted) setError(pressError(failure));
      }
    }
    void load();
    return () => { controller.abort(); if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [attachment.id, attempt, mediaType]);

  return <div className="press-preview-content">
    {error ? <div><p role="alert" className="press-error">{error}</p><button onClick={() => setAttempt(attempt + 1)}>Spróbuj ponownie</button></div> : !source ? <p role="status">Ładowanie podglądu…</p> : mediaType.startsWith('image/') ?
      <img src={source} alt={attachment.original_name} onError={() => setError('Nie udało się wyświetlić obrazu.')} /> : mediaType.startsWith('audio/') ?
      <audio src={source} controls preload="metadata" aria-label={attachment.original_name} onError={() => setError('Przeglądarka nie obsługuje tego nagrania. Pobierz plik.')} /> :
      <video src={source} controls playsInline preload="metadata" aria-label={attachment.original_name} onError={() => setError('Przeglądarka nie obsługuje kodeka tego filmu. Pobierz plik.')} />}
  </div>;
}

export default function MediaPreview({ attachment, blocked }: { attachment: PressAttachment; blocked: boolean }) {
  const [opened, setOpened] = useState(false);
  const mediaType = formats[attachment.original_name.split('.').pop()?.toLowerCase() ?? ''];
  if (!mediaType) return null;
  return <div className="press-preview">
    <button disabled={blocked} aria-expanded={opened && !blocked} onClick={() => setOpened(!opened)}>
      {opened && !blocked ? <X size={17} /> : <Eye size={17} />}{opened && !blocked ? 'Zamknij podgląd' : 'Podgląd'}
    </button>
    {opened && !blocked && <PreviewContent attachment={attachment} mediaType={mediaType} />}
  </div>;
}