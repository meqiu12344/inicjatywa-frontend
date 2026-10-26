const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');

const variants = [
  { id: 'IK-01', name: 'Granatowa', background: '#0b2d5f', band: '#071f44', accent: '#e2b44f', text: '#ffffff' },
  { id: 'IK-02', name: 'Jasna', background: '#f8f5ee', band: '#013e88', accent: '#a8781f', text: '#0b2d5f' },
];

function load() {
  const source = fs.readFileSync(path.join(__dirname, '../src/components/events/EventGraphicPicker.tsx'), 'utf8');
  const code = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2017 },
  }).outputText;
  const stubs = {
    '@tanstack/react-query': { useQuery: () => ({ data: { default: 'IK-01', variants } }) },
    '@/lib/api/events': { eventsApi: { getIkCards: async () => ({ variants }), previewIkCard: async () => new Blob() } },
  };
  const module = { exports: {} };
  vm.runInNewContext(code, {
    module, exports: module.exports, require: name => stubs[name] ?? require(name), JSON, URL, setTimeout, clearTimeout,
  });
  return module.exports;
}

const { EventGraphicPicker } = load();
const render = props => renderToStaticMarkup(React.createElement(EventGraphicPicker, {
  graphicType: 'ik_card', onGraphicTypeChange() {}, variant: 'IK-02', onVariantChange() {},
  cardData: { title: 'Rekolekcje' }, posterSrc: null, onPosterChange() {}, onPosterRemove() {}, ...props,
}));

test('organizer chooses explicitly between a ready IK card and an own poster', () => {
  const html = render();
  assert.equal((html.match(/role="radio"/g) || []).length, 2);
  assert.ok(html.includes('Gotowa Karta IK'));
  assert.ok(html.includes('Własny plakat'));
  assert.match(html, /aria-checked="true"[^>]*>(?:(?!role="radio").)*Gotowa Karta IK/);
});

test('IK card variants are picked by ID and the card is not presented as the organizer poster', () => {
  const html = render();
  for (const text of ['IK-01', 'Granatowa', 'IK-02', 'Jasna', 'Podgląd karty', 'a nie plakatem Organizatora']) {
    assert.ok(html.includes(text), text);
  }
  assert.match(html, /aria-pressed="true"[^>]*>(?:(?!aria-pressed).)*IK-02/);
  assert.ok(!html.includes('type="file"'));
});

test('own poster shows the upload field or the chosen file instead of the card library', () => {
  const empty = render({ graphicType: 'poster' });
  assert.ok(empty.includes('type="file"'));
  assert.ok(!empty.includes('Wariant karty'));

  const chosen = render({ graphicType: 'poster', posterSrc: 'blob:plakat', posterFooter: 'Plakat zapisze się razem z wydarzeniem.' });
  assert.ok(chosen.includes('src="blob:plakat"'));
  assert.ok(chosen.includes('Plakat zapisze się razem z wydarzeniem.'));
  assert.ok(!chosen.includes('type="file"'));
});

function eventApi(client) {
  const source = fs.readFileSync(path.join(__dirname, '../src/lib/api/events.ts'), 'utf8');
  const code = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2017 },
  }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(code, { module, exports: module.exports, FormData, URLSearchParams,
    require: name => {
      assert.equal(name, '@/lib/api/client');
      return client;
    },
  });
  return module.exports.eventsApi;
}

test('editing sends the poster and all event data in one multipart PATCH', async () => {
  const calls = [];
  const saved = { id: 7, slug: 'saved', graphic_type: 'poster' };
  const api = eventApi({ patch: async (...args) => { calls.push(args); return saved; } });
  const image = new File(['poster bytes'], 'poster.png', { type: 'image/png' });
  const data = { title: 'Tytuł', graphic_type: 'poster', categories: [4, 2], tags: ['tag'],
    available_to: null, is_permanent: false, location: { city: 'Kraków', address: 'Rynek' } };
  assert.equal(await api.updateEvent(7, data, image), saved);
  assert.equal(calls.length, 1);
  const [url, body, config] = calls[0];
  assert.equal(url, '/events/7/');
  assert.deepEqual(JSON.parse(body.get('event_data')), data);
  assert.equal(body.get('image'), image);
  assert.equal(config.headers['Content-Type'], 'multipart/form-data');
});

test('failed combined save rejects without another request or losing the selected file', async () => {
  let calls = 0;
  const failure = new Error('upload unavailable');
  const api = eventApi({ patch: async () => { calls++; throw failure; } });
  const image = new File(['poster bytes'], 'poster.png', { type: 'image/png' });
  await assert.rejects(api.updateEvent(7, { graphic_type: 'poster' }, image), error => error === failure);
  assert.equal(calls, 1);
  assert.equal(await image.text(), 'poster bytes');
});

test('choosing an IK card keeps the ordinary JSON update without a poster upload', async () => {
  const calls = [];
  const api = eventApi({ patch: async (...args) => { calls.push(args); return { id: 7 }; } });
  const data = { graphic_type: 'ik_card', ik_card_variant: 'IK-02', title: 'Karta' };
  await api.updateEvent(7, data);
  assert.equal(calls.length, 1);
  assert.equal(calls[0][0], '/events/7/');
  assert.equal(calls[0][1], data);
});
