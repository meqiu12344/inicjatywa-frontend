const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');

const source = fs.readFileSync(path.join(__dirname, '../src/components/events/PromotionStatus.tsx'), 'utf8');
const code = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2017 },
}).outputText;
const componentModule = { exports: {} };
vm.runInNewContext(code, {
  exports: componentModule.exports, module: componentModule, require, Intl, Date,
});
const { PromotionStatus } = componentModule.exports;
const receipt = {
  promotion_id: 7, level: 'gold', level_display: 'Gold',
  start_date: '2026-10-24T10:00:00+02:00', end_date: '2026-11-23T10:00:00+01:00',
  status: 'active', status_display: 'Aktywna', payment_status: 'paid', is_active: true, days_remaining: 29,
};
const render = (promotion, props = {}) => renderToStaticMarkup(React.createElement(PromotionStatus, { promotion, ...props }));

test('active package shows level, status and exact Warsaw period in both panel themes', () => {
  for (const dark of [false, true]) {
    const html = render(receipt, { dark });
    for (const text of ['PROMOWANE', 'GOLD', 'Status promocji:', 'Aktywna od:', 'Aktywna do:', '24.10.2026', '23.11.2026']) {
      assert.ok(html.includes(text), text);
    }
    assert.equal((html.match(/10:00/g) || []).length, 4); // time shown in Warsaw and preserved in datetime attributes
    assert.ok(html.includes('dateTime="2026-11-23T10:00:00+01:00"'));
  }
});

test('pending payment is explicit and does not claim activation or a confirmed period', () => {
  const html = render({ ...receipt, status: 'pending', status_display: 'Oczekuje na płatność', payment_status: 'pending' });
  assert.ok(html.includes('Oczekuje na płatność'));
  assert.ok(html.includes('Promocja uruchomi się po potwierdzeniu płatności'));
  assert.ok(!html.includes('PROMOWANE'));
  assert.ok(!html.includes('Aktywna do:'));
});

test('expired, scheduled, inactive and refunded statuses stay distinguishable', () => {
  for (const [status, label] of [['expired', 'Zakończona'], ['scheduled', 'Zaplanowana'], ['inactive', 'Nieaktywna'], ['refunded', 'Zwrócone']]) {
    const html = render({ ...receipt, status, status_display: label, payment_status: status === 'refunded' ? 'refunded' : 'paid' });
    assert.ok(html.includes(label));
    assert.ok(!html.includes('PROMOWANE'));
    if (status === 'expired') assert.ok(html.includes('Koniec okresu:'));
  }
});

test('an active purchase explains publication requirement for a draft event', () => {
  assert.ok(render(receipt, { eventStatus: 'draft' }).includes('Ekspozycja na portalu wymaga opublikowanego wydarzenia'));
  assert.ok(!render(receipt, { eventStatus: 'public' }).includes('wymaga opublikowanego'));
});

test('events without any purchase show an explicit empty state', () => {
  assert.ok(render(null).includes('Brak promocji'));
});
