const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function load(source, globals = {}) {
  const filename = path.join(__dirname, '../src/lib', source);
  const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2017 },
  }).outputText;
  const exports = {};
  vm.runInNewContext(code, { exports, process: { env: {} }, ...globals }, { filename });
  return exports;
}

const commands = (window) => Array.from(window.dataLayer, (entry) => Array.from(entry));

test('one shared initialization configures GA4 and Ads, without manual page views', () => {
  const window = {};
  const analytics = load('analytics.ts', { window });
  analytics.initializeGoogleTag();
  analytics.initializeGoogleTag();
  assert.deepEqual(commands(window).map((entry) => entry.slice(0, 2)), [
    ['js', window.dataLayer[0][1]],
    ['config', 'AW-17728216196'],
    ['config', 'G-Y2T7MLDZX1'],
  ]);
});

test('an early advertisement event is queued after config and targets only GA4', () => {
  const window = {};
  const analytics = load('analytics.ts', { window });
  analytics.trackAdvertisement('advertisement_click', {
    id: '42', slotId: 'ad-banner-1', campaignId: 'campaign-1', advertiserId: 'partner-1',
    advertiser_contact: 'private@example.com',
  });
  analytics.initializeGoogleTag();
  const events = commands(window);
  assert.equal(events.length, 4);
  assert.equal(events[3][1], 'advertisement_click');
  assert.deepEqual(JSON.parse(JSON.stringify(events[3][2])), {
    send_to: 'G-Y2T7MLDZX1', transport_type: 'beacon', ad_id: '42', ad_slot: 'ad-banner-1',
    ad_campaign_id: 'campaign-1', ad_advertiser_id: 'partner-1',
  });
});

test('existing queue is preserved and blank campaign IDs are omitted', () => {
  const window = { dataLayer: [['existing']] };
  const analytics = load('analytics.ts', { window });
  analytics.trackAdvertisement('advertisement_impression', { id: '1', slotId: 'ad-popup-entry' });
  assert.equal(window.dataLayer[0][0], 'existing');
  const payload = commands(window).at(-1)[2];
  assert.equal('ad_campaign_id' in payload, false);
  assert.equal('ad_advertiser_id' in payload, false);
});

test('public environment settings override the measurement ID', () => {
  const window = {};
  const analytics = load('analytics.ts', { window, process: { env: { NEXT_PUBLIC_GA_MEASUREMENT_ID: 'G-TEST12345' } } });
  analytics.trackAdvertisement('advertisement_click', { id: '1', slotId: 'ad-banner-2' });
  assert.equal(commands(window)[2][1], 'G-TEST12345');
  assert.equal(commands(window)[3][2].send_to, 'G-TEST12345');
});

test('server rendering does not create browser globals or send events', () => {
  const analytics = load('analytics.ts');
  assert.doesNotThrow(() => {
    analytics.initializeGoogleTag();
    analytics.trackAdvertisement('advertisement_click', { id: '1', slotId: 'test' });
  });
});

test('public advertisement data preserves campaign, advertiser and slot IDs', async () => {
  const response = {
    id: 42, title: 'Creative', image: 'https://example.com/banner.png', alt_text: 'Partner banner',
    click_url: 'https://example.com', status: 'active', ad_slot: 'ad-banner-1',
    campaign_id: 'campaign-1', advertiser_id: 'partner-1', created_at: '', updated_at: '',
  };
  const { adsApi } = load('api/ads.ts', {
    require: () => ({ apiClient: { get: async (url) => {
      assert.match(url, /slot=ad-banner-1/);
      return { data: [response] };
    } } }),
  });
  const ad = await adsApi.getAdForSlot('ad-banner-1');
  assert.equal(ad.id, '42');
  assert.equal(ad.slotId, 'ad-banner-1');
  assert.equal(ad.campaignId, 'campaign-1');
  assert.equal(ad.advertiserId, 'partner-1');
  assert.equal(ad.altText, 'Partner banner');
});

test('editing an advertisement saves trimmed IDs and supports clearing them', async () => {
  let body;
  const { adsApi } = load('api/ads.ts', {
    FormData,
    require: () => ({ apiClient: { patch: async (_url, data) => {
      body = data;
      return { data: { id: 42, title: 'Creative', status: 'active' } };
    } } }),
  });
  await adsApi.updateAd('42', { campaignId: ' campaign-1 ', advertiserId: ' partner-1 ' });
  assert.equal(body.get('campaign_id'), 'campaign-1');
  assert.equal(body.get('advertiser_id'), 'partner-1');
  await adsApi.updateAd('42', { campaignId: '', advertiserId: '' });
  assert.equal(body.has('campaign_id'), true);
  assert.equal(body.get('campaign_id'), '');
  assert.equal(body.get('advertiser_id'), '');
});

function eventTarget(extra = {}) {
  const listeners = new Map();
  return {
    ...extra,
    addEventListener(name, callback) {
      if (!listeners.has(name)) listeners.set(name, new Set());
      listeners.get(name).add(callback);
    },
    removeEventListener(name, callback) { listeners.get(name)?.delete(callback); },
    emit(name) { for (const callback of listeners.get(name) || []) callback(); },
    listenerCount() { return [...listeners.values()].reduce((sum, set) => sum + set.size, 0); },
  };
}

function visibilityHarness({ loaded = true, supported = true } = {}) {
  const image = eventTarget({ complete: loaded, naturalWidth: loaded ? 800 : 0 });
  const document = eventTarget({ visibilityState: 'visible' });
  const timers = new Map();
  let clock = 0;
  let nextId = 0;
  let observer;
  let impressions = 0;
  class Observer {
    constructor(callback) { this.callback = callback; this.disconnected = false; observer = this; }
    observe() {}
    disconnect() { this.disconnected = true; }
    emit(ratio) {
      if (!this.disconnected) this.callback([{ isIntersecting: ratio > 0, intersectionRatio: ratio }]);
    }
  }
  const { observeAdImpression } = load('ad-visibility.ts', {
    document,
    ...(supported ? { IntersectionObserver: Observer } : {}),
    setTimeout(callback, delay) { const id = ++nextId; timers.set(id, { callback, at: clock + delay }); return id; },
    clearTimeout(id) { timers.delete(id); },
  });
  const cleanup = observeAdImpression(image, () => { impressions++; });
  return {
    image, document, cleanup, timers,
    get impressions() { return impressions; },
    emit(ratio) { observer?.emit(ratio); },
    advance(duration) {
      const until = clock + duration;
      while (true) {
        const pending = [...timers.entries()].filter(([, timer]) => timer.at <= until).sort((a, b) => a[1].at - b[1].at)[0];
        if (!pending) break;
        clock = pending[1].at;
        timers.delete(pending[0]);
        pending[1].callback();
      }
      clock = until;
    },
  };
}

test('a loaded image must be at least half visible for a full second, only once', () => {
  const h = visibilityHarness();
  h.emit(0.49); h.advance(2000);
  assert.equal(h.impressions, 0);
  h.emit(0.5); h.advance(999);
  assert.equal(h.impressions, 0);
  h.advance(1);
  assert.equal(h.impressions, 1);
  h.emit(0); h.emit(1); h.advance(2000);
  assert.equal(h.impressions, 1);
  assert.equal(h.image.listenerCount() + h.document.listenerCount(), 0);
});

test('scrolling out of view restarts the full one second interval', () => {
  const h = visibilityHarness();
  h.emit(1); h.advance(900); h.emit(0.2); h.advance(2000);
  assert.equal(h.impressions, 0);
  h.emit(0.8); h.advance(999);
  assert.equal(h.impressions, 0);
  h.advance(1);
  assert.equal(h.impressions, 1);
});

test('a hidden tab cancels the interval and cannot accrue impressions', () => {
  const h = visibilityHarness();
  h.emit(1); h.advance(900);
  h.document.visibilityState = 'hidden'; h.document.emit('visibilitychange'); h.advance(2000);
  assert.equal(h.impressions, 0);
  h.document.visibilityState = 'visible'; h.document.emit('visibilitychange'); h.advance(999);
  assert.equal(h.impressions, 0);
  h.advance(1);
  assert.equal(h.impressions, 1);
});

test('an unloaded or broken image never counts as an impression', () => {
  const h = visibilityHarness({ loaded: false });
  h.emit(1); h.advance(2000);
  assert.equal(h.impressions, 0);
  h.image.emit('error'); h.advance(2000);
  assert.equal(h.impressions, 0);
  h.image.naturalWidth = 800; h.image.emit('load'); h.advance(1000);
  assert.equal(h.impressions, 1);
});

test('unmounting or closing the popup removes pending timers and listeners', () => {
  const h = visibilityHarness();
  h.emit(1); h.advance(900); h.cleanup(); h.advance(2000);
  assert.equal(h.impressions, 0);
  assert.equal(h.timers.size, 0);
  assert.equal(h.image.listenerCount() + h.document.listenerCount(), 0);
});

test('browsers without IntersectionObserver do not count unverified impressions', () => {
  const h = visibilityHarness({ supported: false });
  h.advance(2000);
  assert.equal(h.impressions, 0);
  assert.doesNotThrow(h.cleanup);
});
