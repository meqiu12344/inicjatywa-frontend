const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function load(file, now) {
  class ClockDate extends Date {
    constructor(...args) { super(...(args.length ? args : [now])); }
    static now() { return new Date(now).getTime(); }
  }
  const source = fs.readFileSync(path.join(__dirname, '../src', file), 'utf8');
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2017 } }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(code, { module, exports: module.exports, Date: ClockDate, Intl, require });
  return module.exports;
}

const NOW = '2026-11-10T12:00:00+01:00';
const utils = load('lib/eventUtils.ts', NOW);
const when = load('lib/eventWhen.ts', NOW);

test('form preview describes the rule exactly like the API', () => {
  assert.equal(utils.describeRecurrence('weekly', '2026-11-03', [3, 1]), 'Co tydzień: wtorek, czwartek');
  assert.equal(utils.describeRecurrence('biweekly', '2026-11-03'), 'Co 2 tygodnie: wtorek');
  assert.equal(utils.describeRecurrence('monthly_day', '2026-11-13'), 'Co miesiąc, 13. dnia');
  assert.equal(utils.describeRecurrence('monthly_weekday', '2026-11-07'), 'Co miesiąc: pierwsza sobota');
  assert.equal(utils.describeRecurrence('monthly_weekday', '2026-11-27'), 'Co miesiąc: ostatni piątek');
  assert.equal(utils.describeRecurrence('', '2026-11-07'), '');
});

test('a recurring series is ongoing only during a meeting and upcoming between meetings', () => {
  const series = {
    start_date: '2026-10-06T19:00:00+02:00', end_date: '2027-01-26T21:00:00+01:00', recurrence: 'weekly',
    next_occurrence: { start: '2026-11-10T19:00:00+01:00', end: '2026-11-10T21:00:00+01:00' },
  };
  assert.equal(utils.isEventOngoing(series), false);
  assert.equal(utils.isEventUpcoming(series), true);
  assert.equal(utils.getDisplayStart(series), '2026-11-10T19:00:00+01:00');
  const during = { ...series, next_occurrence: { start: '2026-11-10T11:00:00+01:00', end: '2026-11-10T13:00:00+01:00' } };
  assert.equal(utils.isEventOngoing(during), true);
  assert.equal(utils.isEventUpcoming(during), false);
});

test('cards show the next term, the span or the end instead of only the first day', () => {
  const recurring = {
    start_date: '2026-10-06T19:00:00+01:00', recurrence: 'weekly', recurrence_label: 'Co tydzień: wtorek',
    next_occurrence: { start: '2026-11-10T19:00:00+01:00', end: '2026-11-10T21:00:00+01:00' },
  };
  assert.equal(when.formatEventWhen(recurring), 'Co tydzień: wtorek • najbliżej 10 listopada, 19:00');
  const running = { start_date: '2026-09-01T10:00:00+02:00', end_date: '2027-01-31T18:00:00+01:00' };
  assert.equal(when.formatEventWhen(running), 'Trwa do 31 stycznia 2027');
  const future = { start_date: '2026-12-01T10:00:00+01:00', end_date: '2027-02-28T18:00:00+01:00' };
  assert.equal(when.formatEventWhen(future), '1 grudnia – 28 lutego 2027');
  assert.equal(when.formatEventWhen({ start_date: '2026-12-01T10:00:00+01:00' }), '1 grudnia 2026 • 10:00');
  assert.equal(when.formatEventWhen({ start_date: '2020-01-01T10:00:00+01:00', is_permanent: true }), 'Wydarzenie trwa cały czas');
});
