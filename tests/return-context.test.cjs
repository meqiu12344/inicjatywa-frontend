const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function load({ href = '/szukaj?region=%C5%9Al%C4%85skie&categories=3', scrollY = 840, storage } = {}) {
  const [pathname, search = ''] = href.split('?');
  const items = new Map();
  const window = {
    location: { pathname, search: search ? `?${search}` : '' },
    scrollY,
    sessionStorage: storage ?? {
      getItem: key => (items.has(key) ? items.get(key) : null),
      setItem: (key, value) => items.set(key, String(value)),
    },
  };
  const source = fs.readFileSync(path.join(__dirname, '../src/lib/returnContext.ts'), 'utf8');
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2017 } }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(code, { module, exports: module.exports, require, window, JSON });
  return { api: module.exports, window, items };
}

test('opening an event from filtered results remembers the list and scroll position', () => {
  const { api } = load();
  api.rememberReturnContext(42);
  const first = api.takeReturnContext(42);
  assert.equal(first.context.href, '/szukaj?region=%C5%9Al%C4%85skie&categories=3');
  assert.equal(first.context.scrollY, 840);
  assert.equal(first.fromList, true);
  // Odświeżenie strony wydarzenia: lista jest znana, ale poprzedni wpis historii już nie musi nią być.
  assert.equal(api.takeReturnContext(42).fromList, false);
  assert.equal(api.takeReturnContext(7), null);
});

test('the list scrolls back exactly once and only for the same results', () => {
  const { api } = load();
  api.rememberReturnContext(42);
  const { context } = api.takeReturnContext(42);
  api.markScrollRestore(context);
  assert.equal(api.takeScrollRestore('/szukaj?region=Pomorskie'), null);
  assert.equal(api.takeScrollRestore(context.href), 840);
  assert.equal(api.takeScrollRestore(context.href), null);
});

test('only paths of this site are used as the return target', () => {
  for (const href of ['//evil.example/szukaj', 'https://evil.example/szukaj', 'javascript:alert(1)']) {
    const { api, items } = load();
    items.set('ik:event-return', JSON.stringify({ href, scrollY: 0, eventId: 42, fresh: true }));
    assert.equal(api.takeReturnContext(42), null);
  }
});

test('blocked session storage keeps the old behaviour without errors', () => {
  const blocked = { getItem() { throw new Error('denied'); }, setItem() { throw new Error('denied'); } };
  const { api } = load({ storage: blocked });
  api.rememberReturnContext(42);
  assert.equal(api.takeReturnContext(42), null);
  assert.equal(api.takeScrollRestore('/szukaj'), null);
});

test('back button names the list the user came from', () => {
  const { api } = load();
  assert.equal(api.returnLabel('/szukaj?q=rekolekcje'), 'Powrót do wyników');
  assert.equal(api.returnLabel('/kalendarz?month=2026-12&day=2026-12-05'), 'Powrót do kalendarza');
  assert.equal(api.returnLabel('/organizatorzy/parafia'), 'Powrót do organizatora');
  assert.equal(api.returnLabel('/'), 'Powrót do wydarzeń');
});
