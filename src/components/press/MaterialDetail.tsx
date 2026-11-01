'use client';

import { FormEvent, useState } from 'react';
import { flushSync } from 'react-dom';
import { Archive, Bell, Download, FileText, Trash2, Upload, X } from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import {
  downloadPressFile,
  downloadPressResource,
  pressError,
  pressExtendedFeaturesEnabled,
  pressKinds,
  pressMedia,
  pressPartnerToolsEnabled,
  PressAttachment,
  PressMaterial,
} from '@/lib/api/press';
import MediaPreview from './MediaPreview';
import { Feedback } from './PressFeedback';
import { AttachmentRights, BookmarkPanel, WorkflowPanel } from './WorkspacePanels';

interface AttachmentItemProps {
  attachment: PressAttachment;
  material: PressMaterial;
  admin: boolean;
  mine: boolean;
  editable: boolean;
  busy: boolean;
  blocked: boolean;
  download: () => void;
  remove: () => void;
  refresh: () => void;
}

function AttachmentItem({
  attachment,
  material,
  admin,
  mine,
  editable,
  busy,
  blocked,
  download,
  remove,
  refresh,
}: AttachmentItemProps) {
  const expired = !admin && !!attachment.license_expires_at && new Date(attachment.license_expires_at) <= new Date();
  const media = attachment.allowed_media?.length ? attachment.allowed_media : (material.allowed_media ?? []);
  return (
    <section>
      <div className="press-file">
        <FileText size={20} />
        <span>
          {attachment.original_name}
          <small>
            {Math.max(1, Math.round(attachment.size / 1024))} KB ·{' '}
            {attachment.storage_backend === 'cloudinary' ? 'Cloudinary' : 'Plik lokalny'}
          </small>
        </span>
        {!mine && (
          <button
            disabled={busy || blocked || expired}
            title={`Pobierz ${attachment.original_name}`}
            aria-label={`Pobierz ${attachment.original_name}`}
            onClick={download}
          >
            <Download size={20} />
          </button>
        )}
        {admin && (
          <button
            disabled={busy}
            title={`Usuń ${attachment.original_name}`}
            aria-label={`Usuń ${attachment.original_name}`}
            onClick={remove}
          >
            <Trash2 size={20} />
          </button>
        )}
      </div>
      {!mine && <MediaPreview attachment={attachment} blocked={blocked || expired} />}
      <div className="press-attachment-license">
        <p>{attachment.license || material.license}</p>
        <p>
          Autor: {attachment.author || material.author} · Podpis: {attachment.credit || material.credit}
        </p>
        <p>
          Właściciel: {attachment.rights_owner || material.rights_owner || material.author} · Źródło:{' '}
          {attachment.source || material.source || 'Nie podano'}
        </p>
        <p>Media: {media.map(value => pressMedia[value]).join(', ') || 'Zgodnie z licencją'}</p>
        {attachment.license_expires_at && (
          <p>Ważna do: {new Date(attachment.license_expires_at).toLocaleString('pl-PL')}</p>
        )}
      </div>
      {editable && <AttachmentRights attachment={attachment} refresh={refresh} />}
    </section>
  );
}

interface MaterialDetailProps {
  material: PressMaterial;
  admin: boolean;
  mine: boolean;
  userId: number;
  refresh: () => void;
  close: () => void;
  edit: () => void;
}

export function MaterialDetail({ material, admin, mine, userId, refresh, close, edit }: MaterialDetailProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const editable = admin || (mine && ['draft', 'rejected'].includes(material.workflow));
  const embargo = material.embargo_until && new Date(material.embargo_until) > new Date();
  const blocked = !admin && !!embargo && material.embargo_mode === 'block';
  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError('');
    try {
      await action();
    } catch (failure) {
      setError(pressError(failure));
    } finally {
      setBusy(false);
    }
  }
  async function upload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    await run(async () => {
      await apiClient.post(`/press/materials/${material.id}/attachments/`, new FormData(form), {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      form.reset();
      refresh();
    });
  }
  async function removeAttachment(attachment: PressAttachment) {
    if (
      !window.confirm(
        `Usunąć plik „${attachment.original_name}”? Plik zostanie trwale usunięty z magazynu. Tej operacji nie można cofnąć.`,
      )
    )
      return;
    await run(async () => {
      await apiClient.delete(`/press/attachments/${attachment.id}/`);
      refresh();
    });
  }
  async function removeMaterial() {
    if (
      !window.confirm(
        `Usunąć materiał „${material.title}” razem z plikami (${material.attachments.length})? Tej operacji nie można cofnąć.`,
      )
    )
      return;
    // Unmount the detail before refreshing so its queries don't refetch the deleted material.
    await run(async () => {
      await apiClient.delete(`/press/materials/${material.id}/`);
      flushSync(close);
      refresh();
    });
  }
  return (
    <article className="press-section press-detail">
      <div className="press-row">
        <span className="press-tag">{pressKinds[material.kind]}</span>
        <button onClick={close} title="Zamknij materiał" aria-label="Zamknij materiał">
          <X size={20} />
        </button>
      </div>
      <h2>{material.title}</h2>
      {pressExtendedFeaturesEnabled && material.urgent && (
        <p className="press-alert">
          <Bell size={16} />
          Pilny materiał
        </p>
      )}
      {(material.region || material.city || material.topic) && (
        <p className="press-muted">{[material.region, material.city, material.topic].filter(Boolean).join(' · ')}</p>
      )}
      {material.event_title && <p>Wydarzenie: {material.event_title}</p>}
      {embargo && (
        <p className="press-embargo">
          Embargo do {new Date(material.embargo_until!).toLocaleString('pl-PL')}.{' '}
          {material.embargo_mode === 'block'
            ? 'Pobieranie zablokowane dla partnerów.'
            : 'Materiał dostępny przed terminem. Zakaz wcześniejszej publikacji.'}
        </p>
      )}
      <p className="press-body">{material.description}</p>
      <dl className="press-rights">
        <div>
          <dt>Autor</dt>
          <dd>{material.author}</dd>
        </div>
        <div>
          <dt>Podpis</dt>
          <dd>{material.credit}</dd>
        </div>
        <div>
          <dt>Warunki wykorzystania</dt>
          <dd>{material.license}</dd>
        </div>
        <div>
          <dt>Kontakt</dt>
          <dd>
            <a href={`mailto:${material.contact_email}`}>{material.contact_email}</a>
          </dd>
        </div>
      </dl>
      <dl className="press-rights">
        <div>
          <dt>Właściciel praw / źródło</dt>
          <dd>
            {material.rights_owner || material.author} · {material.source || 'Nie podano'}
          </dd>
        </div>
        <div>
          <dt>Dozwolone media</dt>
          <dd>
            {material.allowed_media?.length
              ? material.allowed_media.map(value => pressMedia[value]).join(', ')
              : 'Zgodnie z warunkami licencji'}
          </dd>
        </div>
        {material.license_expires_at && (
          <div>
            <dt>Licencja ważna do</dt>
            <dd>{new Date(material.license_expires_at).toLocaleString('pl-PL')}</dd>
          </div>
        )}
        {material.contact_name && (
          <div>
            <dt>Osoba kontaktowa</dt>
            <dd>
              {material.contact_name} {material.contact_phone}
            </dd>
          </div>
        )}
      </dl>
      {pressExtendedFeaturesEnabled && (
        <>
          {(material.radio_short || material.radio_long) && (
            <section>
              <h3>Dla radia</h3>
              {material.radio_short && (
                <>
                  <h4>20–30 sekund</h4>
                  <p className="press-body">{material.radio_short}</p>
                </>
              )}
              {material.radio_long && (
                <details>
                  <summary>60–90 sekund</summary>
                  <p className="press-body">{material.radio_long}</p>
                </details>
              )}
            </section>
          )}
          {material.guest && <p>Gość: {material.guest}</p>}
          {material.youtube_url && (
            <a href={material.youtube_url} target="_blank" rel="noopener noreferrer">
              Otwórz materiał w YouTube
            </a>
          )}
          {material.transcript && (
            <details>
              <summary>Transkrypcja</summary>
              <p className="press-body">{material.transcript}</p>
            </details>
          )}
        </>
      )}
      <Feedback error={error} />
      {(admin || pressPartnerToolsEnabled) && !mine && <BookmarkPanel materialId={material.id} userId={userId} />}
      {material.attachments.length > 0 && !mine && (
        <button
          disabled={busy || blocked}
          onClick={() =>
            void run(async () => {
              await downloadPressResource(`/press/materials/${material.id}/package/`, `ik-media-${material.id}.zip`);
              refresh();
            })
          }
        >
          <Archive size={18} />
          Pobierz pakiet ZIP
        </button>
      )}
      <h3>Pliki ({material.attachments.length})</h3>
      {!material.attachments.length && <p className="press-muted">Brak załączników.</p>}
      {material.attachments.map(attachment => (
        <AttachmentItem
          key={attachment.id}
          attachment={attachment}
          material={material}
          admin={admin}
          mine={mine}
          editable={editable}
          busy={busy}
          blocked={blocked}
          download={() =>
            void run(async () => {
              await downloadPressFile(attachment);
              refresh();
            })
          }
          remove={() => void removeAttachment(attachment)}
          refresh={refresh}
        />
      ))}
      {editable && (
        <>
          <button onClick={edit}>
            <FileText size={18} />
            Edytuj materiał
          </button>
          {admin && (
            <button disabled={busy} onClick={() => void removeMaterial()}>
              <Trash2 size={18} />
              Usuń materiał
            </button>
          )}
          <form onSubmit={upload} className="press-upload">
            <label>
              Załącznik (do 25 MB)
              <input
                name="file"
                type="file"
                required
                accept=".pdf,.jpg,.jpeg,.png,.webp,.mp3,.wav,.mp4,.zip,.docx,.txt"
              />
            </label>
            <button disabled={busy}>
              <Upload size={18} />
              Dodaj plik
            </button>
          </form>
        </>
      )}
      {(admin || mine) && <WorkflowPanel material={material} userId={userId} admin={admin} refresh={refresh} />}
    </article>
  );
}
