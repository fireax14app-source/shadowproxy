'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
process.env.ROUTE_SECRET = 'test-secret-must-be-longer-than-thirty-two-characters';
const route = require('../api/route')._test;
const handler = require('../api/route');

function response() {
  return {
    statusCode: 200, headers: {}, body: null,
    setHeader(name, value) { this.headers[name.toLowerCase()] = value; },
    status(value) { this.statusCode = value; return this; },
    json(value) { this.body = value; return this; },
    send(value) { this.body = value; return this; }
  };
}

test('opaque paths are randomized and recover the original URL', () => {
  const target = 'https://example.com/path?q=1';
  const first = route.encode(target);
  const second = route.encode(target);
  assert.notEqual(first, second);
  assert.doesNotMatch(first, /example|path/);
  assert.equal(route.decode(first).href, target);
  assert.throws(() => route.decode((first[0] === 'A' ? 'B' : 'A') + first.slice(1)));
});

test('private destinations and credentials are refused', () => {
  for (const target of ['http://127.0.0.1/', 'http://10.0.0.1/', 'http://192.168.1.1/', 'http://[::1]/', 'http://user:pass@example.com/', 'file:///etc/passwd']) {
    assert.throws(() => route.parseTarget(target), target);
  }
  for (const address of ['127.0.0.1', '169.254.169.254', '192.168.1.1', '10.2.3.4', '::1', 'fc00::1']) assert.equal(route.publicAddress(address), false);
});

test('HTML routes ordinary resources and removes scripts and handlers', () => {
  const html = route.rewriteHtml(Buffer.from('<html><head><script>alert(1)</script><link href="/site.css"></head><body onload="alert(1)"><img src="/image.png"><a href="/next">Next</a></body></html>'), 'https://example.com/start');
  assert.doesNotMatch(html, /<script|onload=/i);
  assert.doesNotMatch(html, /https:\/\/example\.com/);
  assert.equal((html.match(/\/r\//g) || []).length, 3);
});

test('POST creates a path and GET fetches through the server', { skip: process.env.LIVE_ROUTE_TEST !== '1' }, async () => {
  const first = response();
  await handler({ method: 'POST', headers: { host: 'localhost' }, body: { url: 'https://example.com/' } }, first);
  assert.equal(first.statusCode, 200);
  assert.match(first.body.path, /^\/r\/[A-Za-z0-9_-]+$/);
  const second = response();
  await handler({ method: 'GET', headers: { host: 'localhost' }, query: { token: first.body.path.slice(3) } }, second);
  assert.equal(second.statusCode, 200);
  assert.match(String(second.body), /Example Domain/);
  assert.match(second.headers['content-security-policy'], /default-src 'none'/);
});

test('cross-origin creation is blocked', async () => {
  const res = response();
  await handler({ method: 'POST', headers: { host: 'shadowproxy.example', origin: 'https://other.example' }, body: { url: 'https://example.com/' } }, res);
  assert.equal(res.statusCode, 403);
});
