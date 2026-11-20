'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const source = fs.readFileSync('shadowproxy-app.js', 'utf8');

function createApp(relays = []) {
  let fetchImpl = () => { throw new Error('unexpected fetch'); };
  const window = {
    ShadowProxyData: { RELAYS: relays },
    matchMedia: () => ({ matches: false }),
    addEventListener: () => {}
  };
  const document = {
    querySelector: () => ({}),
    querySelectorAll: () => [],
    documentElement: {},
    readyState: 'loading',
    addEventListener: () => {}
  };
  const context = {
    window, document, location: { search: '' }, URL, URLSearchParams,
    AbortController, TextDecoder, setTimeout, clearTimeout, console,
    fetch: (...args) => fetchImpl(...args)
  };
  const injected = source.replace(/\}\)\(\);\s*$/, 'window.__test = { normalize, resolveTarget,  };})();');
  assert.notEqual(injected, source);
  vm.runInNewContext(injected, context);
  return { api: window.__test, setFetch: fn => { fetchImpl = fn; } };
}

test('bare domains retain query and hash', () => {
  const { api } = createApp();
  assert.equal(api.normalize('example.com?x=1#part'), 'https://example.com/?x=1#part');
  assert.equal(api.normalize('example.com/docs'), 'https://example.com/docs');
});

test('server mode uses a sandbox without scripts or forms', () => {
  assert.match(source, /setAttribute\('sandbox', 'allow-popups'\)/);
  assert.match(source, /fetch\('\/api\/route'/);
  assert.doesNotMatch(source, /proxyFetch|cors\.dev|allorigins/i);
});
