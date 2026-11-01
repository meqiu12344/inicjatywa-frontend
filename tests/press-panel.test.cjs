const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');

function load(file, stubs) {
  const source = fs.readFileSync(path.join(__dirname, '../src/components/press', file), 'utf8');
  const code = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2017 },
  }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(code, { module, exports: module.exports, require: name => stubs[name] ?? require(name) });
  return module.exports;
}

const label = text => () => text;
const pressFlags = { pressExtendedFeaturesEnabled: false, pressPartnerToolsEnabled: false };

function renderHub({ session, admin = false, flags = {} }) {
  const { default: PressHub } = load('PressHub.tsx', {
    '@tanstack/react-query': { useQuery: () => ({ data: session, isPending: false, isError: false }) },
    '@/stores/authStore': { useHydration: () => true, useAuthStore: () => ({ user: { id: 7 }, isAuthenticated: true }) },
    '@/lib/api/client': { apiClient: {} },
    '@/lib/api/press': { pressError: String, ...pressFlags, ...flags },
    'next/link': { default: ({ children }) => React.createElement('a', null, children) },
    'next/navigation': { useSearchParams: () => new URLSearchParams() },
    './AccessApplication': { Application: label('WNIOSEK') },
    './MaterialLibrary': { Library: label('LISTA') },
    './PressAdministration': { Administration: label('PANEL-ADMINA') },
    './PressFeedback': { Feedback: label('') },
    './WorkspacePanels': {
      Dashboard: label('PULPIT'), EmailAlertsToggle: label('ALERTY'), IntegrationsPanel: label('API'), PreferencesPanel: label('PREFERENCJE'),
    },
    './press.css': {},
  });
  return renderToStaticMarkup(React.createElement(PressHub, { admin }));
}

const journalist = { is_staff: false, can_submit: false, access: { status: 'approved' } };

test('journalist workspace contains only the library with the e-mail opt-in', () => {
  const html = renderHub({ session: journalist });
  for (const text of ['Biblioteka', 'LISTA', 'ALERTY']) assert.ok(html.includes(text), text);
  for (const text of ['Pulpit', 'Zapisane', 'Zainteresowania', 'Moje zgłoszenia', 'API i RSS', 'Media Alert', 'PANEL-ADMINA']) {
    assert.ok(!html.includes(text), text);
  }
});

test('enabling extended features does not give journalists the tools left out of their role', () => {
  const html = renderHub({ session: journalist, flags: { pressExtendedFeaturesEnabled: true } });
  for (const text of ['Biblioteka', 'Oto Nadchodzi', 'Media Alert', 'API i RSS']) assert.ok(html.includes(text), text);
  for (const text of ['Pulpit', 'Zapisane', 'Zainteresowania']) assert.ok(!html.includes(text), text);
});

test('partner tools come back only through their own switch', () => {
  const html = renderHub({ session: journalist, flags: { pressPartnerToolsEnabled: true } });
  for (const text of ['Pulpit', 'Zapisane', 'Zainteresowania']) assert.ok(html.includes(text), text);
  assert.ok(!html.includes('Media Alert'));
});

test('organizer keeps own submissions and a person without access sees the application', () => {
  assert.ok(renderHub({ session: { ...journalist, can_submit: true } }).includes('Moje zgłoszenia'));
  const html = renderHub({ session: { is_staff: false, can_submit: false, access: null } });
  assert.ok(html.includes('WNIOSEK'));
  assert.ok(!html.includes('Biblioteka'));
});

test('staff have no e-mail opt-in in the partner view and keep the full administration panel', () => {
  const staff = { is_staff: true, can_submit: true, access: null };
  assert.ok(!renderHub({ session: staff }).includes('ALERTY'));
  assert.ok(renderHub({ session: staff, admin: true }).includes('PANEL-ADMINA'));
  assert.ok(!renderHub({ session: journalist, admin: true }).includes('PANEL-ADMINA'));
});

const material = {
  id: 3, title: 'Komunikat', description: 'Opis', kind: 'release', event_title: null, author: 'Autor IK', credit: 'fot. IK',
  license: 'Do publikacji z podpisem', contact_email: 'press@example.com', workflow: 'published', allowed_media: [],
  rights_owner: '', source: '', embargo_until: null, embargo_mode: 'block', license_expires_at: null,
  attachments: [{ id: 9, original_name: 'brief.pdf', size: 2048, allowed_media: [], license_expires_at: null }],
};

function renderDetail(props) {
  const { MaterialDetail } = load('MaterialDetail.tsx', {
    '@/lib/api/client': { apiClient: {} },
    '@/lib/api/press': { pressError: String, ...pressFlags, pressKinds: { release: 'Komunikat' }, pressMedia: {} },
    './MediaPreview': { default: label('PODGLAD') },
    './PressFeedback': { Feedback: label('') },
    './WorkspacePanels': { AttachmentRights: label('PRAWA-PLIKU'), BookmarkPanel: label('NOTATKA'), WorkflowPanel: label('OBIEG') },
  });
  return renderToStaticMarkup(React.createElement(MaterialDetail, {
    material, admin: false, mine: false, userId: 7, refresh() {}, close() {}, edit() {}, ...props,
  }));
}

test('journalist can preview and download but gets no deleting, editing or notes', () => {
  const html = renderDetail();
  for (const text of ['Pobierz pakiet ZIP', 'Pobierz brief.pdf', 'PODGLAD', 'Podpis', 'fot. IK']) assert.ok(html.includes(text), text);
  for (const text of ['Usuń', 'Edytuj materiał', 'Dodaj plik', 'NOTATKA', 'OBIEG', 'PRAWA-PLIKU']) assert.ok(!html.includes(text), text);
});

test('administrator keeps deleting, editing, notes and the editorial workflow', () => {
  const html = renderDetail({ admin: true });
  for (const text of ['Usuń materiał', 'Usuń brief.pdf', 'Edytuj materiał', 'Dodaj plik', 'NOTATKA', 'OBIEG', 'PRAWA-PLIKU']) {
    assert.ok(html.includes(text), text);
  }
});

test('download stays disabled for a journalist under a blocking embargo', () => {
  const embargoed = { ...material, embargo_until: new Date(Date.now() + 86400000).toISOString() };
  const html = renderDetail({ material: embargoed });
  assert.match(html, /<button disabled=""[^>]*>(?:(?!<\/button>).)*Pobierz pakiet ZIP/);
  assert.match(html, /<button disabled=""[^>]*aria-label="Pobierz brief.pdf"/);
});
