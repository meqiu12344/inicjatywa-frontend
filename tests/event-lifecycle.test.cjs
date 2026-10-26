const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function utils(now) {
  class ClockDate extends Date {
    constructor(...args) { super(...(args.length ? args : [now])); }
    static now() { return new Date(now).getTime(); }
  }
  const source = fs.readFileSync(path.join(__dirname, '../src/lib/eventUtils.ts'), 'utf8');
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2017 } }).outputText;
  const exports = {};
  vm.runInNewContext(code, { exports, Date: ClockDate, Intl });
  return exports;
}

test('one-day event without an end remains ongoing until the end of the Warsaw day', () => {
  const u = utils('2026-10-26T14:00:00+01:00');
  const today = { start_date: '2026-10-26T08:00:00+01:00' };
  assert.equal(u.isEventExpired(today), false);
  assert.equal(u.isEventOngoing(today), true);
  assert.equal(u.isEventUpcoming(today), false);
  const yesterday = { start_date: '2026-10-25T08:00:00+01:00' };
  assert.equal(u.isEventExpired(yesterday), true);
  assert.equal(u.isEventOngoing(yesterday), false);
});

test('an explicit end time is an exclusive boundary, including at the exact end', () => {
  const u = utils('2026-10-26T14:00:00+01:00');
  const ended = { start_date: '2026-10-26T08:00:00+01:00', end_date: '2026-10-26T14:00:00+01:00' };
  assert.equal(u.isEventExpired(ended), true);
  assert.equal(u.isEventOngoing(ended), false);
  assert.equal(u.getEffectiveStatus({ ...ended, status: 'public' }), 'closed');
});

test('missing end time covers the final minute of the end day', () => {
  const event = { start_date: '2026-10-25T08:00:00+01:00', end_date: '2026-10-26T23:59:00+01:00', end_time_unknown: true };
  assert.equal(utils('2026-10-26T23:59:30+01:00').isEventExpired(event), false);
  assert.equal(utils('2026-10-27T00:00:00+01:00').isEventExpired(event), true);
});

test('Warsaw day boundaries are independent of UTC date and summer/winter offset', () => {
  const event = { start_date: '2026-07-15T00:30:00+02:00' };
  assert.equal(utils('2026-07-15T01:00:00+02:00').isEventExpired(event), false);
  assert.equal(utils('2026-07-16T00:00:00+02:00').isEventExpired(event), true);
});

test('permanent events remain active despite old start and end dates', () => {
  const u = utils('2026-10-26T14:00:00+01:00');
  const event = { start_date: '2020-01-01T10:00:00+01:00', end_date: '2020-01-02T10:00:00+01:00', is_permanent: true, status: 'public' };
  assert.equal(u.isEventExpired(event), false);
  assert.equal(u.isEventOngoing(event), true);
  assert.equal(u.shouldAutoClose(event), false);
  assert.equal(u.getEffectiveStatus(event), 'public');
});

test('manual statuses are preserved and a future closed event is not reopened by viewing it', () => {
  const u = utils('2026-10-26T14:00:00+01:00');
  for (const status of ['draft', 'hidden', 'closed', 'ai_draft']) {
    assert.equal(u.getEffectiveStatus({ start_date: '2020-01-01T10:00:00+01:00', status }), status);
  }
  const manual = { start_date: '2026-12-01T10:00:00+01:00', status: 'closed' };
  assert.equal(u.shouldAutoReopen(manual), false);
  assert.equal(u.getEffectiveStatus(manual), 'closed');
});
