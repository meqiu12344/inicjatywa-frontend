const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');

function render(query = {}, props = {}) {
  const source = fs.readFileSync(path.join(__dirname, '../src/app/platnosc/sukces/PromotionConfirmation.tsx'), 'utf8');
  const code = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2017 },
  }).outputText;
  const module = { exports: {} };
  const api = { confirmPromotion: (...args) => args };
  let options;
  vm.runInNewContext(code, {
    module, exports: module.exports, Intl, Date,
    require: (name) => {
      if (name === '@tanstack/react-query') return { useQuery: (config) => {
        options = config;
        return { data: undefined, error: null, isFetching: false, refetch: () => {}, ...query };
      } };
      if (name === '@/stores/authStore') return { useHydration: () => true };
      if (name === '@/lib/api/payments') return { paymentsApi: api };
      if (name === '@/lib/api/client') return { getErrorMessage: () => 'Potwierdzenie chwilowo niedostępne' };
      if (name === 'next/link') return { __esModule: true, default: ({ children, ...rest }) => React.createElement('a', rest, children) };
      return require(name);
    },
  });
  const html = renderToStaticMarkup(React.createElement(module.exports.default, {
    promotionId: '6', sessionId: 'cs_receipt', ...props,
  }));
  return { html, options };
}

const receipt = {
  promotion_id: 6, event_id: 42, event_title: 'Rekolekcje jesienne', event_slug: 'rekolekcje-jesienne',
  level: 'gold', level_display: 'Gold', start_date: '2026-10-26T15:00:00Z', end_date: '2026-11-25T15:00:00Z',
  payment_status: 'paid', status: 'active', status_display: 'Aktywna',
};

test('verified Gold receipt shows event, status, exact period and event link', () => {
  const { html, options } = render({ data: receipt });
  for (const text of ['Promocja Gold została aktywowana', 'Rekolekcje jesienne', 'Aktywna', 'Okres promocji OD', 'Okres promocji DO', 'Zobacz wydarzenie']) {
    assert.ok(html.includes(text), text);
  }
  assert.ok(html.includes('href="/wydarzenia/rekolekcje-jesienne-42"'));
  assert.ok(html.includes('dateTime="2026-11-25T15:00:00Z"'));
  assert.deepEqual(Array.from(options.queryFn()), ['6', 'cs_receipt']);
  assert.equal(options.refetchInterval({ state: { data: receipt } }), false);
});

test('unpaid payment shows waiting and polls without claiming activation', () => {
  const data = { ...receipt, payment_status: 'pending', status: 'pending', status_display: 'Oczekuje na płatność' };
  const { html, options } = render({ data });
  assert.ok(html.includes('Czekamy na potwierdzenie płatności'));
  assert.ok(html.includes('Nie musisz ponownie kupować promocji'));
  assert.ok(!html.includes('została aktywowana'));
  assert.ok(!html.includes('Okres promocji OD'));
  assert.equal(options.refetchInterval({ state: { data } }), 3000);
});

test('loading and request errors never show purchase success', () => {
  const loading = render().html;
  assert.ok(loading.includes('Potwierdzanie zakupu promocji'));
  assert.ok(!loading.includes('została aktywowana'));
  const error = render({ error: new Error('offline') }).html;
  assert.ok(error.includes('Potwierdzenie chwilowo niedostępne'));
  assert.ok(error.includes('Sprawdź status ponownie'));
  assert.ok(!error.includes('została aktywowana'));
});

test('expired and refunded receipts cannot masquerade as an active promotion', () => {
  for (const status of ['expired', 'refunded']) {
    const { html } = render({ data: { ...receipt, status, status_display: status, payment_status: status === 'refunded' ? 'refunded' : 'paid' } });
    assert.ok(!html.includes('została aktywowana'));
    assert.ok(html.includes(status));
  }
});

test('missing promotion ID disables API calls and shows recovery link', () => {
  const { html, options } = render({}, { promotionId: null });
  assert.equal(options.enabled, false);
  assert.ok(html.includes('Brak identyfikatora zakupionej promocji'));
  assert.ok(html.includes('href="/moje-wydarzenia"'));
});
