const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');

const issue = { id: 42, title: 'Przegląd wydarzeń', sent_at: '2026-10-25T23:30:00-04:00', newsletter_type: 'events_weekly' };
const archive = { newsletters: [issue], page: 1, total_pages: 2, count: 21 };
const json = (data, status = 200) => ({ ok: status < 400, status, json: async () => data });

function loader({ fetch = async () => json(archive), overrides = {}, browser = false } = {}) {
  const cache = new Map();
  const Link = ({ children, ...rest }) => React.createElement('a', rest, children);
  const navigation = {
    notFound: () => { throw new Error('NEXT_NOT_FOUND'); },
    redirect: url => { throw new Error(`NEXT_REDIRECT:${url}`); },
    useParams: () => ({ token: 'mail-token' }),
  };
  function load(file) {
    if (cache.has(file)) return cache.get(file);
    const source = fs.readFileSync(path.join(__dirname, '../src', file), 'utf8');
    const code = ts.transpileModule(source, {
      compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2017 },
    }).outputText;
    const module = { exports: {} };
    cache.set(file, module.exports);
    const sandbox = {
      module, exports: module.exports, Intl, Date, fetch,
      require: name => {
        if (name in overrides) return overrides[name];
        if (name === 'next/link') return { __esModule: true, default: Link };
        if (name === 'next/navigation') return navigation;
        if (name === '@/lib/env') return { getBackendUrl: () => 'https://backend.example', getPublicApiBaseUrl: () => 'https://public-api.example' };
        if (name === '@/lib/api/newsletter') return load('lib/api/newsletter.ts');
        if (name === '@/components/newsletter/NewsletterArchiveList') return load('components/newsletter/NewsletterArchiveList.tsx');
        return require(name);
      },
    };
    if (browser) {
      sandbox.window = {};
      Object.defineProperty(sandbox.window, 'localStorage', { get() { throw new Error('Browser storage blocked'); } });
      Object.defineProperty(sandbox, 'localStorage', { get() { throw new Error('Browser storage blocked'); } });
      Object.defineProperty(sandbox, 'sessionStorage', { get() { throw new Error('Browser storage blocked'); } });
      sandbox.document = {};
      Object.defineProperty(sandbox.document, 'cookie', { get() { throw new Error('Cookies blocked'); } });
    }
    vm.runInNewContext(code, sandbox);
    return module.exports;
  }
  return load;
}

test('archive is rendered on the server with working issue links and older editions navigation', async () => {
  const requests = [];
  const load = loader({ fetch: async (...args) => { requests.push(args); return json(archive); } });
  const Page = load('app/newsletter/archiwum/page.tsx').default;
  const html = renderToStaticMarkup(await Page({ searchParams: Promise.resolve({}) }));
  for (const text of ['Archiwum newsletterów', 'bez logowania i subskrypcji', issue.title, '26 października 2026', 'Starsze wydania']) {
    assert.ok(html.includes(text), text);
  }
  assert.ok(html.includes('href="/newsletter/archiwum/42"'));
  assert.ok(html.includes('href="/newsletter/archiwum?page=2"'));
  assert.equal(requests[0][0], 'https://backend.example/api/newsletter/archive/?page=1');
});

test('an archived newsletter contains the full reading content in the initial HTML', async () => {
  const load = loader({ fetch: async () => json({ ...issue, content: '<h2>Spotkania</h2><p>Pełna treść newslettera.</p>' }) });
  const Page = load('app/newsletter/archiwum/[id]/page.tsx').default;
  const html = renderToStaticMarkup(await Page({ params: Promise.resolve({ id: '42' }) }));
  assert.ok(html.includes('<h2>Spotkania</h2><p>Pełna treść newslettera.</p>'));
  assert.ok(html.includes('href="/newsletter/archiwum"'));
  assert.ok(!html.includes('Zaloguj'));
});

test('all public newsletter requests work with blocked storage and cookies and omit account credentials', async () => {
  const requests = [];
  const load = loader({ browser: true, fetch: async (...args) => {
    requests.push(args);
    return json({ message: 'Potwierdzono', archive_url: '/newsletter/archiwum' });
  } });
  const { newsletterApi } = load('lib/api/newsletter.ts');
  await newsletterApi.subscribe({ email: 'reader@example.com', categories: [] });
  await newsletterApi.confirm('mail-token');
  await newsletterApi.archive();
  await newsletterApi.detail('42');
  await newsletterApi.quickSubscribe('reader@example.com');
  for (const [url, config] of requests) {
    assert.ok(url.startsWith('https://public-api.example/api/newsletter/'));
    assert.equal(config.credentials, 'omit');
    assert.equal(config.cache, 'no-store');
    assert.equal(config.headers.Authorization, undefined);
    assert.equal(config.headers.Cookie, undefined);
  }
  assert.equal(requests[1][1].method, 'POST');
});

test('server archive exposes empty state while API errors remain errors', async () => {
  let failed = false;
  const load = loader({ fetch: async () => failed ? json({ error: 'Chwilowa awaria' }, 503) : json({ ...archive, newsletters: [], count: 0, total_pages: 1 }) });
  const Page = load('app/newsletter/archiwum/page.tsx').default;
  const html = renderToStaticMarkup(await Page({ searchParams: Promise.resolve({}) }));
  assert.ok(html.includes('Nie ma jeszcze wysłanych newsletterów'));
  failed = true;
  await assert.rejects(Page({ searchParams: Promise.resolve({}) }), /Chwilowa awaria/);
  const ErrorPage = load('app/newsletter/archiwum/error.tsx').default;
  const errorHtml = renderToStaticMarkup(React.createElement(ErrorPage));
  assert.ok(errorHtml.includes('chwilowo niedostępne'));
  assert.ok(errorHtml.includes('href="/newsletter/archiwum"'));
});

test('missing editions and invalid archive pages use the not-found state', async () => {
  const load = loader({ fetch: async () => json({ detail: 'Not found' }, 404) });
  const Detail = load('app/newsletter/archiwum/[id]/page.tsx').default;
  const List = load('app/newsletter/archiwum/page.tsx').default;
  await assert.rejects(Detail({ params: Promise.resolve({ id: '42' }) }), /NEXT_NOT_FOUND/);
  await assert.rejects(Detail({ params: Promise.resolve({ id: 'draft' }) }), /NEXT_NOT_FOUND/);
  await assert.rejects(List({ searchParams: Promise.resolve({ page: '0' }) }), /NEXT_NOT_FOUND/);
  await assert.rejects(List({ searchParams: Promise.resolve({ page: 'abc' }) }), /NEXT_NOT_FOUND/);
  await assert.rejects(List({ searchParams: Promise.resolve({ page: '999' }) }), /NEXT_NOT_FOUND/);
});

test('archive aliases redirect to real routes and preserve the email confirmation token', async () => {
  const load = loader();
  assert.throws(load('app/newsletter/archive/page.tsx').default, /NEXT_REDIRECT:\/newsletter\/archiwum/);
  await assert.rejects(load('app/newsletter/confirm/[token]/page.tsx').default({ params: Promise.resolve({ token: 'mail-token' }) }), /NEXT_REDIRECT:\/newsletter\/potwierdz\/mail-token/);
});

function confirmation(result, reject = false) {
  const state = [];
  let stateIndex = 0;
  let effect;
  let mounted = false;
  const load = loader({ overrides: {
    react: { ...React,
      useState: initial => {
        const index = stateIndex++;
        if (!(index in state)) state[index] = initial;
        return [state[index], value => { state[index] = typeof value === 'function' ? value(state[index]) : value; }];
      },
      useEffect: callback => { if (!mounted) effect = callback; },
    },
    '@/lib/api/newsletter': {
      NEWSLETTER_ARCHIVE_PATH: '/newsletter/archiwum',
      NewsletterApiError: Error,
      newsletterApi: { confirm: async () => { if (reject) throw result; return result; } },
    },
  } });
  const Page = load('app/newsletter/potwierdz/[token]/page.tsx').default;
  const render = () => { stateIndex = 0; return renderToStaticMarkup(React.createElement(Page)); };
  return { initial: render(), settle: async () => {
    const cleanup = effect();
    mounted = true;
    await new Promise(resolve => setImmediate(resolve));
    const html = render();
    cleanup();
    return html;
  } };
}

test('successful and repeated confirmation lead directly to the readable archive', async () => {
  for (const already_confirmed of [false, true]) {
    const view = confirmation({ message: already_confirmed ? 'Subskrypcja jest już potwierdzona' : 'Subskrypcja potwierdzona', email: 'reader@example.com', already_confirmed });
    assert.ok(view.initial.includes('Potwierdzanie subskrypcji'));
    const html = await view.settle();
    assert.ok(html.includes('Subskrypcja potwierdzona!'));
    assert.ok(html.includes('Czytaj archiwum newsletterów'));
    assert.ok(html.includes('href="/newsletter/archiwum"'));
  }
});

test('confirmation failure does not claim success or hide the public archive', async () => {
  const view = confirmation(new Error('Link wygasł'), true);
  const html = await view.settle();
  assert.ok(html.includes('Potwierdzenie nie powiodło się'));
  assert.ok(html.includes('Link wygasł'));
  assert.ok(html.includes('Czytaj publiczne archiwum newsletterów'));
  assert.ok(!html.includes('Subskrypcja potwierdzona!'));
});

test('signup page always exposes the archive, including while loading and on errors', () => {
  for (const query of [{ isPending: true }, { isError: true }, { data: { ...archive, newsletters: [] } }, { data: archive }]) {
    const load = loader({ overrides: {
      '@/lib/api/client': {},
      '@tanstack/react-query': {
        useQuery: config => config.queryKey[0] === 'categories' ? { data: [] } : query,
        useMutation: () => ({ isPending: false }),
      },
    } });
    const Page = load('app/newsletter/page.tsx').default;
    const html = renderToStaticMarkup(React.createElement(Page));
    assert.ok(html.includes('Zobacz całe archiwum'));
    assert.ok(html.includes('href="/newsletter/archiwum"'));
    if (query.data?.newsletters.length) assert.ok(html.includes('href="/newsletter/archiwum/42"'));
  }
});
