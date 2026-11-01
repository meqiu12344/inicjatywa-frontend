'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  Archive,
  Bell,
  Bookmark,
  ChevronRight,
  FileText,
  KeyRound,
  LayoutDashboard,
  Settings2,
  ShieldCheck,
  Upload,
} from 'lucide-react';
import { useAuthStore, useHydration } from '@/stores/authStore';
import { apiClient } from '@/lib/api/client';
import { pressError, pressExtendedFeaturesEnabled, pressPartnerToolsEnabled, PressAccess } from '@/lib/api/press';
import { Application } from './AccessApplication';
import { Library } from './MaterialLibrary';
import { Administration } from './PressAdministration';
import { Feedback } from './PressFeedback';
import { Dashboard, EmailAlertsToggle, IntegrationsPanel, PreferencesPanel } from './WorkspacePanels';
import './press.css';

type AccessState = { is_staff: boolean; can_submit: boolean; access: PressAccess | null };
const partnerTools = ['dashboard', 'saved', 'preferences'];

function PartnerWorkspace({
  userId,
  allowed,
  canSubmit,
  emailAlerts,
  application,
}: {
  userId: number;
  allowed: boolean;
  canSubmit: boolean;
  emailAlerts: boolean;
  application: React.ReactNode;
}) {
  const searchParams = useSearchParams();
  const [tab, setTab] = useState(
    allowed
      ? pressPartnerToolsEnabled && !searchParams.has('material')
        ? 'dashboard'
        : 'materials'
      : canSubmit
        ? 'mine'
        : 'access',
  );
  const items = allowed
    ? [
        { key: 'dashboard', label: 'Pulpit', icon: LayoutDashboard },
        { key: 'materials', label: 'Biblioteka', icon: FileText },
        { key: 'program', label: 'Oto Nadchodzi', icon: Archive },
        { key: 'alerts', label: 'Media Alert', icon: Bell },
        { key: 'saved', label: 'Zapisane', icon: Bookmark },
        {
          key: 'preferences',
          label: pressExtendedFeaturesEnabled ? 'Zainteresowania i alerty' : 'Zainteresowania',
          icon: Settings2,
        },
        { key: 'integrations', label: 'API i RSS', icon: KeyRound },
      ].filter(
        item =>
          item.key === 'materials' ||
          (partnerTools.includes(item.key) ? pressPartnerToolsEnabled : pressExtendedFeaturesEnabled),
      )
    : [{ key: 'access', label: 'Dostęp dla mediów', icon: ShieldCheck }];
  if (canSubmit) items.push({ key: 'mine', label: 'Moje zgłoszenia', icon: Upload });
  return (
    <div className="press-workspace">
      <nav className="press-sidebar" aria-label="Panel partnera">
        {items.map(({ key, label, icon: Icon }) => (
          <button key={key} aria-current={tab === key ? 'page' : undefined} onClick={() => setTab(key)}>
            <Icon size={18} />
            {label}
          </button>
        ))}
      </nav>
      <div className="press-workspace-content">
        {pressPartnerToolsEnabled && tab === 'dashboard' && allowed && <Dashboard userId={userId} />}
        {pressPartnerToolsEnabled && tab === 'preferences' && allowed && <PreferencesPanel userId={userId} />}
        {pressExtendedFeaturesEnabled && tab === 'integrations' && allowed && <IntegrationsPanel userId={userId} />}
        {tab === 'materials' && emailAlerts && <EmailAlertsToggle userId={userId} />}
        {[
          'materials',
          ...(pressPartnerToolsEnabled ? ['saved'] : []),
          ...(pressExtendedFeaturesEnabled ? ['program', 'alerts'] : []),
        ].includes(tab) &&
          allowed && (
            <Library
              key={tab}
              admin={false}
              userId={userId}
              saved={tab === 'saved'}
              initialKind={tab === 'program' ? 'program' : ''}
              urgent={tab === 'alerts'}
            />
          )}
        {tab === 'mine' && canSubmit && <Library admin={false} userId={userId} mine />}
        {tab === 'access' && application}
      </div>
    </div>
  );
}

export default function PressHub({ admin = false }: { admin?: boolean }) {
  const hydrated = useHydration();
  const { user, isAuthenticated } = useAuthStore();
  const session = useQuery({
    queryKey: ['press', user?.id, 'access'],
    queryFn: async () => (await apiClient.get<AccessState>('/press/access/')).data,
    enabled: hydrated && isAuthenticated,
    retry: false,
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: 'always',
  });
  const allowed = session.data?.is_staff || session.data?.access?.status === 'approved';
  return (
    <div className="press-hub">
      <header className="press-header">
        <div>
          <span className="press-eyebrow">INICJATYWA KATOLICKA / DLA MEDIÓW</span>
          <h1>IK Media Hub</h1>
          <p>{admin ? 'Panel redakcyjny' : 'Strefa prasowa'}</p>
        </div>
        {session.data?.is_staff && (
          <Link href={admin ? '/dla-mediow' : '/admin/prasa'}>
            {admin ? 'Strefa prasowa' : 'Panel redakcyjny'}
            <ChevronRight size={18} />
          </Link>
        )}
      </header>
      {!hydrated ? (
        <p role="status">Ładowanie…</p>
      ) : !isAuthenticated || !user ? (
        <section className="press-section">
          <h2>Dostęp dla mediów</h2>
          <div className="press-actions">
            <Link
              className="press-primary"
              href={`/dla-mediow/logowanie?redirect=${admin ? '/admin/prasa' : '/dla-mediow'}`}
            >
              Zaloguj się
            </Link>
            <Link href={`/dla-mediow/rejestracja?redirect=${admin ? '/admin/prasa' : '/dla-mediow'}`}>
              Utwórz konto
            </Link>
          </div>
        </section>
      ) : session.isPending ? (
        <p role="status">Sprawdzanie dostępu…</p>
      ) : session.isError ? (
        <>
          <Feedback error={pressError(session.error)} />
          <button onClick={() => void session.refetch()}>Spróbuj ponownie</button>
        </>
      ) : admin ? (
        session.data?.is_staff ? (
          <Administration userId={user.id} />
        ) : (
          <Feedback error="Panel jest dostępny tylko dla administratorów." />
        )
      ) : (
        <PartnerWorkspace
          key={`${user.id}-${allowed}`}
          userId={user.id}
          allowed={!!allowed}
          canSubmit={!!session.data?.can_submit}
          emailAlerts={session.data?.access?.status === 'approved'}
          application={<Application access={session.data?.access ?? null} onDone={() => void session.refetch()} />}
        />
      )}
    </div>
  );
}
