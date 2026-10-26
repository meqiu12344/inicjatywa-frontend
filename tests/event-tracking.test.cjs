const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');

function load(source, globals = {}, dependencies = {}) {
  const filename = path.join(__dirname, '../src', source);
  const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2017 },
  }).outputText;
  const exports = {};
  vm.runInNewContext(code, { exports, require: name => dependencies[name] ?? require(name), ...globals }, { filename });
  return exports;
}

const event = { id: 7, organizer_id: 9, status: 'public', promotion_id: 12 };
function network({ blocked = false, state = { user: null, tokens: null }, id = 'session_uuid_12345678' } = {}) {
  const requests = [];
  const storage = new Map();
  const api = load('lib/event-tracking.ts', {
    crypto: { randomUUID: () => id }, atob: text => Buffer.from(text, 'base64').toString(),
    document: { referrer: 'https://example.org/source' },
    sessionStorage: {
      getItem: key => { if (blocked) throw Error('disabled'); return storage.get(key); },
      setItem: (key, value) => { if (blocked) throw Error('disabled'); storage.set(key, value); },
    },
    fetch: async (url, options) => { requests.push({ url, ...options, body: JSON.parse(options.body) }); return { ok: true }; },
  }, {
    '@/lib/env': { getPublicApiBaseUrl: () => 'https://api.example.org' },
    '@/stores/authStore': { useAuthStore: { getState: () => state } },
  });
  return { api, requests, storage, state };
}

test('detail views, card exposure and clicks use separate endpoints with one session and keepalive', async () => {
  const h = network();
  await h.api.trackEventView(event);
  await h.api.trackCard(event, 'card_impression');
  await h.api.trackCard(event, 'card_click');
  assert.deepEqual(h.requests.map(r => r.url.split('/').at(-2)), ['view', 'cards', 'cards']);
  assert.equal(new Set(h.requests.map(r => r.body.session_id)).size, 1);
  for (const request of h.requests) {
    assert.equal(request.method, 'POST');
    assert.equal(request.keepalive, true);
    assert.equal(request.credentials, 'omit');
  }
  assert.deepEqual(h.requests[1].body.events, [{ event_id: 7, promotion_id: 12 }]);
});

test('blocked storage in private mode still records using a stable in-memory session', async () => {
  const h = network({ blocked: true });
  assert.equal(await h.api.trackEventView(event), true);
  assert.equal(await h.api.trackCard(event, 'card_click'), true);
  assert.equal(h.requests[0].body.session_id, h.requests[1].body.session_id);
  const privateWindow = network({ blocked: true, id: 'private_uuid_12345678' });
  await privateWindow.api.trackEventView(event);
  assert.notEqual(h.requests[0].body.session_id, privateWindow.requests[0].body.session_id);
});

test('own events, staff visits and private events never send audience metrics', async () => {
  for (const user of [{ id: 9 }, { id: 2, is_staff: true }]) {
    const h = network({ state: { user } });
    await h.api.trackEventView(event);
    await h.api.trackCard(event, 'card_click');
    assert.equal(h.requests.length, 0);
  }
  const h = network();
  await h.api.trackEventView({ ...event, status: 'draft' });
  assert.equal(h.requests.length, 0);
});

test('fresh login identifies the visitor while expired tokens do not trigger a refresh or login', async () => {
  const jwt = exp => `header.${Buffer.from(JSON.stringify({ exp })).toString('base64url')}.signature`;
  const h = network({ state: { user: { id: 2 }, tokens: { access: jwt(Date.now() / 1000 + 3600) } } });
  await h.api.trackEventView(event);
  assert.match(h.requests[0].headers.Authorization, /^Bearer /);
  h.state.tokens.access = jwt(1);
  await h.api.trackEventView(event);
  assert.equal(h.requests[1].headers.Authorization, undefined);
  assert.equal(h.requests.length, 2);
});

function target(extra = {}) {
  const listeners = new Map();
  return { ...extra,
    addEventListener(name, fn) { if (!listeners.has(name)) listeners.set(name, new Set()); listeners.get(name).add(fn); },
    removeEventListener(name, fn) { listeners.get(name)?.delete(fn); },
    emit(name) { for (const fn of listeners.get(name) || []) fn(); },
    get listenerCount() { return [...listeners.values()].reduce((n, set) => n + set.size, 0); },
  };
}

function visibility(supported = true) {
  const document = target({ visibilityState: 'visible' });
  let observer;
  let seen = 0;
  let clock = 0;
  let next = 0;
  const timers = new Map();
  class Observer {
    constructor(callback) { this.callback = callback; observer = this; }
    observe() {}
    disconnect() { this.disconnected = true; }
    emit(ratio) { if (!this.disconnected) this.callback([{ isIntersecting: ratio > 0, intersectionRatio: ratio }]); }
  }
  const { observeEventCard } = load('lib/event-visibility.ts', {
    document, ...(supported ? { IntersectionObserver: Observer } : {}),
    setTimeout(fn, delay) { const id = ++next; timers.set(id, { fn, at: clock + delay }); return id; },
    clearTimeout(id) { timers.delete(id); },
  });
  const cleanup = observeEventCard({}, () => seen++);
  return { document, timers, cleanup, get seen() { return seen; }, emit: ratio => observer?.emit(ratio),
    advance(ms) {
      clock += ms;
      for (const [id, timer] of [...timers]) if (timer.at <= clock) { timers.delete(id); timer.fn(); }
    },
  };
}

test('event cards require half the card to be visible for one continuous second and record only once', () => {
  const h = visibility();
  h.emit(0.49); h.advance(2000);
  assert.equal(h.seen, 0);
  h.emit(0.5); h.advance(999);
  assert.equal(h.seen, 0);
  h.advance(1);
  assert.equal(h.seen, 1);
  h.emit(1); h.advance(2000);
  assert.equal(h.seen, 1);
  assert.equal(h.document.listenerCount, 0);
});

test('scrolling away or hiding the tab cancels the pending card impression', () => {
  const h = visibility();
  h.emit(1); h.advance(900); h.emit(0); h.advance(1000);
  assert.equal(h.seen, 0);
  h.emit(1); h.advance(900);
  h.document.visibilityState = 'hidden'; h.document.emit('visibilitychange'); h.advance(1000);
  assert.equal(h.seen, 0);
  h.document.visibilityState = 'visible'; h.document.emit('visibilitychange'); h.advance(999);
  assert.equal(h.seen, 0);
  h.advance(1);
  assert.equal(h.seen, 1);
});

test('unmount and unsupported visibility detection never create an impression', () => {
  for (const supported of [true, false]) {
    const h = visibility(supported);
    h.emit(1); h.advance(900); h.cleanup(); h.advance(2000);
    assert.equal(h.seen, 0);
    assert.equal(h.timers.size, 0);
    assert.equal(h.document.listenerCount, 0);
  }
});

test('detail tracking waits for hydration and a visible tab, and cleans up on navigation', () => {
  const document = target({ visibilityState: 'hidden' });
  let effect;
  let views = 0;
  const { useEventViewTracking } = load('hooks/useEventViewTracking.ts', { document }, {
    react: { useEffect: fn => { effect = fn; } },
    '@/stores/authStore': { useHydration: () => true, useAuthStore: select => select({ user: null }) },
    '@/lib/event-tracking': { canTrackEvent: () => true, trackEventView: () => views++ },
  });
  useEventViewTracking(event);
  assert.equal(views, 0); // render / SSR cannot send a view
  const cleanup = effect();
  assert.equal(views, 0);
  document.visibilityState = 'visible'; document.emit('visibilitychange'); document.emit('visibilitychange');
  assert.equal(views, 1);
  cleanup();
  assert.equal(document.listenerCount, 0);
});

test('card link tracks normal, keyboard and middle-button activation and respects prevented navigation', () => {
  const calls = [];
  const { TrackedEventLink } = load('components/events/TrackedEventLink.tsx', {}, {
    react: { useEffect() {}, useRef: () => ({ current: null }) }, 'next/link': { default: 'a' },
    '@/stores/authStore': { useHydration: () => true, useAuthStore: select => select({ user: null }) },
    '@/lib/event-visibility': {},
    '@/lib/event-tracking': { canTrackEvent: () => true, trackCard: (_, kind) => calls.push(kind) },
  });
  const link = TrackedEventLink({ event, href: '/wydarzenia/test' });
  link.props.onClick({ defaultPrevented: false });
  link.props.onClick({ defaultPrevented: false, detail: 0 });
  link.props.onAuxClick({ defaultPrevented: false, button: 1 });
  link.props.onAuxClick({ defaultPrevented: false, button: 2 });
  link.props.onClick({ defaultPrevented: true });
  assert.deepEqual(calls, ['card_click', 'card_click', 'card_click']);
});

test('statistics display lifetime and period counts with explicit card and session definitions', () => {
  const analytics = { event_title: 'Test', period_days: 30, total_views: 2, all_time_views: 6,
    unique_visitors: 2, unidentified_views: 1, total_registrations: 1, conversion_rate: 50, views_by_day: [],
    device_breakdown: { mobile: 1, desktop: 1, tablet: 0 }, top_referrers: [],
    interactions: { card_impression: 8, card_click: 3 },
  };
  const chart = ({ children }) => React.createElement('div', null, children);
  const { default: Page } = load('app/moje-wydarzenia/[id]/statystyki/page.tsx', {}, {
    '@tanstack/react-query': { useQuery: () => ({ data: analytics }) },
    'next/navigation': { useParams: () => ({ id: '7' }) },
    'next/link': { default: ({ children, ...props }) => React.createElement('a', props, children) },
    '@/hooks/useAuth': { useAuth: () => ({ isAuthenticated: true }) }, '@/lib/api/client': {},
    recharts: new Proxy({}, { get: () => chart }),
  });
  const html = renderToStaticMarkup(React.createElement(Page));
  for (const label of ['Łącznie: 6', 'Wejścia w szczegóły (', '30', 'Widoczne karty wydarzenia',
    'Kliknięcia kart / plakatów', 'Unikalne sesje / konta', 'raz na 30 minut', 'Tryb incognito', 'wejść historycznych bez identyfikatora sesji']) assert.ok(html.includes(label), label);
});
