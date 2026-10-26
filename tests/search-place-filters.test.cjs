const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const React = require('react');
const jsx = require('react/jsx-runtime');
const { renderToStaticMarkup } = require('react-dom/server');

const emptyResults = { count: 0, next: null, previous: null, results: [] };

function loader(overrides = {}, globals = {}) {
  const cache = new Map();
  function load(file) {
    if (cache.has(file)) return cache.get(file);
    const source = fs.readFileSync(path.join(__dirname, '../src', file), 'utf8');
    const code = ts.transpileModule(source, {
      compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2017 },
    }).outputText;
    const module = { exports: {} };
    cache.set(file, module.exports);
    vm.runInNewContext(code, { module, exports: module.exports, Date, Intl, URLSearchParams, setTimeout, clearTimeout, ...globals,
      require: name => {
        if (name in overrides) return overrides[name];
        if (name === '@/lib/searchFilters') return load('lib/searchFilters.ts');
        if (name === '@/lib/eventUtils') return load('lib/eventUtils.ts');
        if (name === './SearchPageClient') return { default: () => null, __esModule: true };
        return require(name);
      },
    });
    return module.exports;
  }
  return load;
}

const utils = loader()('lib/searchFilters.ts');
const location = query => utils.readSearchLocation(new URLSearchParams(query));
const apiQuery = query => new URLSearchParams(utils.searchFiltersKey(utils.searchFiltersFromParams(Object.fromEntries(new URLSearchParams(query)))));

test('a region is local by default and old nationwide=false links remain local', () => {
  for (const query of ['region=Dolnośląskie', 'region=Dolnośląskie&nationwide=false']) {
    const filters = utils.searchLocationFilters(location(query));
    assert.equal(filters.region, 'Dolnośląskie');
    assert.equal(filters.include_nationwide, undefined);
    assert.equal(filters.location_type, undefined);
  }
});

test('adding nationwide events requires an explicit flag and survives URL round trips', () => {
  const state = location('region=Dolnośląskie&nationwide=true');
  assert.equal(utils.searchLocationFilters(state).include_nationwide, true);
  const params = new URLSearchParams();
  utils.writeSearchLocation(params, state);
  assert.equal(params.get('nationwide'), 'true');
  assert.equal(apiQuery(params.toString()).get('include_nationwide'), 'true');
  assert.equal(apiQuery('nationwide=true').has('include_nationwide'), false);
});

test('nationwide-only mode clears geographical and online constraints consistently', () => {
  const state = location('location_type=nationwide&region=Dolnośląskie&city=Wrocław&radius_km=25&radius_city=Wrocław&online=true&nationwide=true');
  assert.equal(state.region, '');
  assert.equal(state.city, '');
  assert.equal(state.useRadius, false);
  assert.equal(state.onlineOnly, false);
  const filters = utils.searchLocationFilters(state);
  assert.deepEqual(Object.keys(filters), ['location_type']);
  assert.equal(filters.location_type, 'nationwide');
  const params = new URLSearchParams();
  utils.writeSearchLocation(params, state);
  assert.equal(params.toString(), 'location_type=nationwide');
});

test('nationwide-only and regional queries preserve date, category, search, ordering and page filters', () => {
  const params = apiQuery('location_type=nationwide&categories=1,%202,invalid&q=Rekolekcje&date_from=2026-11-01&date_to=2026-12-01&event_type=free&ordering=-start_date&page=3');
  assert.equal(params.get('location_type'), 'nationwide');
  assert.deepEqual(params.getAll('categories'), ['1', '2']);
  assert.equal(params.get('search'), 'Rekolekcje');
  assert.equal(params.get('date_from'), '2026-11-01');
  assert.equal(params.get('date_to'), '2026-12-01');
  assert.equal(params.get('event_type'), 'free');
  assert.equal(params.get('ordering'), '-start_date');
  assert.equal(params.get('page'), '3');
});

test('radius queries keep region constraints and online queries never claim nationwide inclusion', () => {
  const radius = apiQuery('region=Małopolskie&city=Kraków&radius_km=30');
  assert.equal(radius.get('radius_city'), 'Kraków');
  assert.equal(radius.get('radius_km'), '30');
  assert.equal(radius.get('region'), 'Małopolskie');
  assert.equal(radius.has('city'), false);
  const online = apiQuery('region=Pomorskie&online=true&nationwide=true');
  assert.equal(online.get('online'), 'true');
  assert.equal(online.has('include_nationwide'), false);
});

function textOf(node) {
  if (Array.isArray(node)) return node.map(textOf).join(' ');
  if (React.isValidElement(node)) return textOf(node.props.children);
  return typeof node === 'string' || typeof node === 'number' ? String(node) : '';
}

function searchView(query = '', initialOverrides = {}) {
  const states = [];
  const nodes = [];
  const effects = [];
  let stateIndex = 0;
  let searchOptions;
  let lastUrl;
  const urlParams = new URLSearchParams(query);
  const router = { replace: url => { lastUrl = url; } };
  const apiCalls = [];
  const overrides = {
    react: { ...React,
      useState: initial => {
        const index = stateIndex++;
        if (!(index in states)) states[index] = typeof initial === 'function' ? initial() : initial;
        return [states[index], value => { states[index] = typeof value === 'function' ? value(states[index]) : value; }];
      },
      useMemo: callback => callback(), useCallback: callback => callback,
      useRef: value => ({ current: value }), useEffect: callback => effects.push(callback),
    },
    'react/jsx-runtime': {
      ...jsx,
      jsx: (...args) => { const node = jsx.jsx(...args); nodes.push(node); return node; },
      jsxs: (...args) => { const node = jsx.jsxs(...args); nodes.push(node); return node; },
    },
    'next/navigation': { useRouter: () => router, usePathname: () => '/szukaj', useSearchParams: () => urlParams },
    'next/link': { __esModule: true, default: ({ children, ...rest }) => React.createElement('a', rest, children) },
    'next/image': { __esModule: true, default: () => null },
    '@/components/events/TrackedEventLink': { TrackedEventLink: ({ event, children, ...rest }) => React.createElement('a', rest, children) },
    '@/components/events/EventCard': { EventCard: ({ event }) => React.createElement('p', null, event.title), EventCardSkeleton: () => null },
    '@/lib/api/events': { eventsApi: { getEvents: async filters => { apiCalls.push(filters); return emptyResults; } }, categoriesApi: {} },
    '@tanstack/react-query': { useQuery: config => {
      if (config.queryKey[0] === 'search') {
        searchOptions = config;
        return { data: config.initialData || emptyResults, isLoading: false, isFetching: false, refetch: () => {} };
      }
      return { data: [] };
    } },
  };
  const Page = loader(overrides)('app/szukaj/SearchPageClient.tsx').default;
  const props = { initialResults: emptyResults, initialResultsKey: apiQuery(query).toString(), initialCategories: [], ...initialOverrides };
  let html;
  function render() {
    stateIndex = 0; nodes.length = 0; effects.length = 0;
    html = renderToStaticMarkup(React.createElement(Page, props));
    effects.forEach(callback => { const cleanup = callback(); if (typeof cleanup === 'function') cleanup(); });
    return html;
  }
  render();
  return {
    get html() { return html; }, get options() { return searchOptions; }, get url() { return lastUrl; }, apiCalls,
    click(label) {
      const button = nodes.find(node => node.type === 'button' && textOf(node.props.children).trim().startsWith(label));
      assert.ok(button, `Button ${label}`); button.props.onClick(); render();
    },
    selectRegion(region) {
      if (!nodes.some(node => node.type === 'select' && node.props.id === 'search-region')) this.click('Więcej filtrów');
      nodes.find(node => node.type === 'select' && node.props.id === 'search-region').props.onChange({ target: { value: region } });
      render();
    },
  };
}

test('region UI explains exclusion and only offers nationwide inclusion as an unselected option', () => {
  const view = searchView('region=Dolnośląskie');
  assert.ok(view.html.includes('Wydarzenia ogólnopolskie są pomijane'));
  assert.ok(view.html.includes('Dołącz ogólnopolskie'));
  assert.equal(view.options.queryKey[1].include_nationwide, undefined);
  assert.equal(view.options.initialData, emptyResults);
  assert.equal(new URL(view.url, 'https://example.com').searchParams.has('nationwide'), false);
});

test('selecting a different region cannot seed its query with the previous region results', async () => {
  const view = searchView('region=Pomorskie', { initialResults: { ...emptyResults, count: 1, results: [{ id: 1, title: 'Wydarzenie z Pomorza' }] } });
  const previousQuery = { queryKey: view.options.queryKey };
  assert.ok(view.html.includes('Wydarzenie z Pomorza'));
  view.selectRegion('Dolnośląskie');
  assert.equal(view.options.queryKey[1].region, 'Dolnośląskie');
  assert.equal(view.options.initialData, undefined);
  assert.equal(view.options.placeholderData({ results: [{ id: 1 }] }, previousQuery), undefined);
  await view.options.queryFn();
  assert.equal(view.apiCalls[0].region, 'Dolnośląskie');
  assert.ok(!view.html.includes('Wydarzenie z Pomorza'));
});

test('user can explicitly add nationwide events and a new region returns to local-only results', () => {
  const view = searchView('region=Pomorskie');
  view.click('Dołącz ogólnopolskie');
  assert.equal(view.options.queryKey[1].include_nationwide, true);
  assert.ok(view.html.includes('włączono opcję „Dołącz ogólnopolskie”'));
  assert.equal(new URL(view.url, 'https://example.com').searchParams.get('nationwide'), 'true');
  view.selectRegion('Śląskie');
  assert.equal(view.options.queryKey[1].include_nationwide, undefined);
  assert.ok(view.html.includes('Wydarzenia ogólnopolskie są pomijane'));
});

test('nationwide-only button clears geographical constraints, preserves other filters and resets page', () => {
  const view = searchView('region=Pomorskie&radius_km=30&radius_city=Gdańsk&online=true&categories=2&date_from=2026-11-01&page=4');
  view.click('Tylko ogólnopolskie');
  const filters = view.options.queryKey[1];
  assert.equal(filters.location_type, 'nationwide');
  for (const key of ['region', 'city', 'radius_km', 'radius_city', 'online']) assert.equal(filters[key], undefined, key);
  assert.equal(filters.categories[0], 2);
  assert.equal(filters.date_from, '2026-11-01');
  assert.equal(filters.page, 1);
  assert.ok(view.html.includes('Nie są przypisane do jednego województwa'));
});

test('clear filters restores the unfiltered list without implicitly adding nationwide to a later region', () => {
  const view = searchView('location_type=nationwide');
  view.click('Wyczyść filtry');
  assert.equal(view.options.queryKey[1].location_type, undefined);
  view.selectRegion('Pomorskie');
  assert.equal(view.options.queryKey[1].include_nationwide, undefined);
});

test('server-rendered search passes the exact filter key used to request regional and nationwide data', async () => {
  for (const query of ['region=Dolnośląskie', 'region=Śląskie&nationwide=true', 'location_type=nationwide&region=Pomorskie&online=true']) {
    const requests = [];
    const load = loader({ '@/lib/env': { getBackendUrl: () => 'https://backend.example' } }, {
      fetch: async url => { requests.push(url); return { ok: true, json: async () => url.includes('/categories/') ? [] : emptyResults }; },
    });
    const Page = load('app/szukaj/page.tsx').default;
    const element = await Page({ searchParams: Promise.resolve(Object.fromEntries(new URLSearchParams(query))) });
    assert.equal(element.props.initialResultsKey, apiQuery(query).toString());
    assert.equal(requests.find(url => url.includes('/events/')), `https://backend.example/api/events/?${element.props.initialResultsKey}`);
    const view = searchView(query, { initialResultsKey: element.props.initialResultsKey });
    assert.equal(view.options.initialData, emptyResults);
  }
});
