const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');

function load(file, overrides = {}) {
  const source = fs.readFileSync(path.join(__dirname, '../src', file), 'utf8');
  const code = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2017 },
  }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(code, {
    exports: module.exports, module, Date, Intl, URLSearchParams,
    require: (name) => {
      if (name in overrides) return overrides[name];
      if (name === '@/lib/eventUtils') return load('lib/eventUtils.ts');
      if (name === '@/lib/organizerStatus') return load('lib/organizerStatus.ts');
      if (name === './PromotionStatus') return load('components/events/PromotionStatus.tsx');
      return require(name);
    },
  });
  return module.exports;
}

const { getOrganizerStatus, matchesOrganizerFilter } = load('lib/organizerStatus.ts');
const { OrganizerEventStatus } = load('components/events/OrganizerEventStatus.tsx');
const event = { status: 'public', start_date: '2099-11-01T12:00:00+01:00' };
const render = (data, dark = false) => renderToStaticMarkup(React.createElement(OrganizerEventStatus, { event: data, dark }));

test('publication and moderation states use the same clear labels in both panel themes', () => {
  for (const [status, label] of [['pending', 'Do moderacji'], ['ai_draft', 'Do moderacji'],
    ['public', 'Opublikowane'], ['draft', 'Szkic'], ['hidden', 'Ukryte'], ['closed', 'Zamknięte']]) {
    for (const dark of [true, false]) {
      const html = render({ ...event, status }, dark);
      assert.ok(html.includes('Status wydarzenia:'));
      assert.ok(html.includes(label), label);
      assert.ok(html.includes('Brak promocji'));
    }
  }
});

test('rejection uses the server decision and safely renders moderator feedback', () => {
  const data = { ...event, status: 'hidden', organizer_status: {
    code: 'rejected', label: 'Odrzucone — wymaga poprawy', description: 'Popraw wydarzenie i wyślij je ponownie do moderacji.',
    rejection_reason: 'Zmień datę.\n<script>alert(1)</script>', allowed_transitions: ['draft', 'pending'],
  } };
  const html = render(data);
  assert.ok(html.includes('Odrzucone — wymaga poprawy'));
  assert.ok(html.includes('Uwagi moderatora'));
  assert.ok(html.includes('ponownie do moderacji'));
  assert.ok(html.includes('&lt;script&gt;'));
  assert.ok(!html.includes('<script>'));
  assert.equal(getOrganizerStatus({ ...event, status: 'hidden' }).code, 'hidden');
  assert.equal(matchesOrganizerFilter(data, 'rejected'), true);
  assert.equal(matchesOrganizerFilter(data, 'public'), false);
});

test('ended, manually closed and permanent events remain distinguishable', () => {
  const past = { ...event, start_date: '2020-01-01T12:00:00+01:00' };
  assert.ok(render(past).includes('Zakończone'));
  assert.ok(render({ ...past, status: 'closed' }).includes('Zakończone'));
  assert.ok(render({ ...past, is_permanent: true }).includes('Opublikowane'));
  assert.ok(render({ ...event, status: 'closed' }).includes('Zamknięte'));
  assert.equal(getOrganizerStatus({ ...event, visible: false }).code, 'hidden');
});

test('a promoted event displays publication, package, end date and publication requirement independently', () => {
  const data = { ...event, status: 'pending', promotion: {
    promotion_id: 1, level: 'gold', level_display: 'Gold', status: 'active', status_display: 'Aktywna',
    payment_status: 'paid', is_active: true, start_date: '2026-10-24T10:00:00+02:00',
    end_date: '2026-11-23T10:00:00+01:00', days_remaining: 29,
  } };
  const html = render(data);
  for (const text of ['Do moderacji', 'PROMOWANE', 'GOLD', 'Aktywna do:', '23.11.2026', 'wymaga opublikowanego wydarzenia']) {
    assert.ok(html.includes(text), text);
  }
  assert.equal(matchesOrganizerFilter(data, 'pending'), true);
  assert.equal(matchesOrganizerFilter(data, 'promoted'), true);
  assert.equal(matchesOrganizerFilter({ ...data, promotion: { ...data.promotion, status: 'pending' } }, 'promoted'), false);
});

test('status filters keep drafts and hidden events available in All, and include IK moderation', () => {
  for (const status of ['draft', 'hidden', 'pending', 'closed']) {
    assert.equal(matchesOrganizerFilter({ ...event, status }, 'all'), true);
  }
  assert.equal(matchesOrganizerFilter({ ...event, status: 'ai_draft' }, 'pending'), true);
  assert.equal(matchesOrganizerFilter({ ...event, start_date: '2020-01-01T12:00:00+01:00' }, 'ended'), true);
  assert.equal(matchesOrganizerFilter({ ...event, status: 'draft' }, 'public'), false);
});

test('organizer pagination fetches later pages so older statuses stay visible', async () => {
  const calls = [];
  const { eventsApi } = load('lib/api/events.ts', { '@/lib/api/client': {
    get: async (url) => {
      calls.push(url);
      const page = Number(new URL(url, 'https://example.com').searchParams.get('page'));
      return page === 1
        ? { results: Array.from({ length: 100 }, (_, id) => ({ ...event, id })), count: 101, next: '/api/events/my/?page=2' }
        : { results: [{ ...event, id: 100, status: 'draft' }], count: 101, next: null };
    },
  } });
  const all = await eventsApi.getAllMyEvents();
  assert.equal(all.length, 101);
  assert.equal(all[100].status, 'draft');
  assert.deepEqual(calls, ['/events/my/?page=1&page_size=100', '/events/my/?page=2&page_size=100']);
});

test('later page failures do not silently show a partial list as All', async () => {
  let call = 0;
  const { eventsApi } = load('lib/api/events.ts', { '@/lib/api/client': {
    get: async () => {
      if (++call === 2) throw new Error('Unavailable');
      return { results: [event], count: 2, next: '/api/events/my/?page=2' };
    },
  } });
  await assert.rejects(eventsApi.getAllMyEvents(), /Unavailable/);
});

test('authenticated detail refreshes public SSR data and isolates private information by user', () => {
  let user = null;
  const { useEvent } = load('hooks/useEvents.ts', {
    './useAuth': {}, '@/lib/api/client': {}, '@/lib/api/events': {},
    '@/stores/authStore': { useAuthStore: select => select({ user }) },
    '@tanstack/react-query': { useQuery: options => options },
  });
  const visitor = useEvent('spotkanie', event);
  assert.equal(visitor.staleTime, 300000);
  user = { id: 1 };
  const owner = useEvent('spotkanie', event);
  assert.equal(owner.staleTime, 0);
  assert.notDeepEqual(owner.queryKey, visitor.queryKey);
  user = { id: 2 };
  assert.notDeepEqual(useEvent('spotkanie', event).queryKey, owner.queryKey);
});
