const crypto = require('node:crypto');
const dns = require('node:dns').promises;
const http = require('node:http');
const https = require('node:https');
const net = require('node:net');

const MAX_BYTES = 5 * 1024 * 1024;
const MAX_AGE = 30 * 60 * 1000;
const buckets = new Map();
const blocked = new net.BlockList();

[
  ['0.0.0.0', 8], ['10.0.0.0', 8], ['100.64.0.0', 10], ['127.0.0.0', 8],
  ['169.254.0.0', 16], ['172.16.0.0', 12], ['192.0.0.0', 24], ['192.0.2.0', 24],
  ['192.88.99.0', 24], ['192.168.0.0', 16], ['198.18.0.0', 15], ['198.51.100.0', 24],
  ['203.0.113.0', 24], ['224.0.0.0', 4], ['240.0.0.0', 4]
].forEach(([ip, prefix]) => blocked.addSubnet(ip, prefix, 'ipv4'));

[
  ['::', 128], ['::1', 128], ['64:ff9b::', 96], ['100::', 64], ['2001::', 32],
  ['2001:2::', 48], ['2001:10::', 28], ['2001:20::', 28], ['2001:db8::', 32],
  ['2002::', 16], ['fc00::', 7], ['fe80::', 10], ['ff00::', 8]
].forEach(([ip, prefix]) => blocked.addSubnet(ip, prefix, 'ipv6'));

function key() {
  const secret = process.env.ROUTE_SECRET;
  if (!secret || secret.length < 32) throw new Error('ROUTE_SECRET is not configured');
  return crypto.createHash('sha256').update(secret).digest();
}

function publicAddress(value) {
  let address = String(value || '').replace(/^\[|\]$/g, '').toLowerCase();
  if (address.startsWith('::ffff:')) return publicAddress(address.slice(7));
  const family = net.isIP(address);
  if (!family) return false;
  return !blocked.check(address, family === 4 ? 'ipv4' : 'ipv6');
}

function parseTarget(value) {
  const url = new URL(String(value || ''));
  const host = url.hostname.replace(/^\[|\]$/g, '');
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || (url.port && !['80', '443'].includes(url.port)) || !host || url.href.length > 4096) throw new Error('Only public HTTP(S) addresses are allowed');
  if ((net.isIP(host) || host.includes(':')) && !publicAddress(host)) throw new Error('Private addresses are blocked');
  return url;
}

function encode(url) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key(), iv);
  const body = Buffer.concat([cipher.update(JSON.stringify({ u: String(url), t: Date.now() })), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), body]).toString('base64url');
}

function decode(token) {
  if (!/^[A-Za-z0-9_-]{35,6000}$/.test(token)) throw new Error('Invalid route');
  const b = Buffer.from(token, 'base64url');
  if (b.length < 30) throw new Error('Invalid route');
  const decipher = crypto.createDecipheriv('aes-256-gcm', key(), b.subarray(0, 12));
  decipher.setAuthTag(b.subarray(12, 28));
  const data = JSON.parse(Buffer.concat([decipher.update(b.subarray(28)), decipher.final()]).toString());
  if (!Number.isFinite(data.t) || data.t > Date.now() + 60000 || Date.now() - data.t > MAX_AGE) throw new Error('Expired route');
  return parseTarget(data.u);
}

function clientIp(req) {
  const raw = String(req.headers && (req.headers['x-real-ip'] || req.headers['x-forwarded-for']) || 'unknown');
  return raw.split(',').at(-1).trim().slice(0, 80);
}

function limited(req, limit) {
  const now = Date.now();
  const id = clientIp(req) + ':' + (req.method === 'POST' ? 'create' : 'fetch');
  const entry = buckets.get(id);
  if (!entry || now - entry.started >= 60000) buckets.set(id, { started: now, count: 1 });
  else if (++entry.count > limit) return true;
  if (buckets.size > 2000) for (const [name, item] of buckets) if (now - item.started >= 60000) buckets.delete(name);
  return false;
}

function sameOrigin(req) {
  const origin = String(req.headers && req.headers.origin || '');
  const host = String(req.headers && req.headers.host || '');
  if (!origin || !host) return false;
  try {
    const site = req.headers['sec-fetch-site'];
    return new URL(origin).host === host && (!site || site === 'same-origin');
  } catch { return false; }
}

function securityHeaders(res) {
  res.setHeader('Cache-Control', 'private, no-store, max-age=0');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), serial=(), bluetooth=(), browsing-topics=()');
}

async function resolvePublic(hostname) {
  const records = await dns.lookup(hostname, { all: true, verbatim: true });
  if (!records.length || records.some(record => !publicAddress(record.address))) throw new Error('Private or unresolved address blocked');
  // Vercel regions do not guarantee outbound IPv6 reachability. Prefer a
  // validated IPv4 address when one exists, while retaining IPv6 fallback.
  const ipv4 = records.filter(record => record.family === 4);
  const pool = ipv4.length ? ipv4 : records;
  return pool[Math.floor(Math.random() * pool.length)];
}

async function fetchPublic(target, redirects = 0) {
  const url = parseTarget(target);
  const chosen = await resolvePublic(url.hostname);
  const agent = url.protocol === 'https:' ? https : http;
  return new Promise((resolve, reject) => {
    const req = agent.get(url, {
      lookup: (_host, opts, cb) => opts.all ? cb(null, [{ address: chosen.address, family: chosen.family }]) : cb(null, chosen.address, chosen.family),
      headers: { 'user-agent': 'ShadowProxy/1.0 (+public pages only)', accept: 'text/html,text/plain,application/xhtml+xml,text/css,image/*;q=0.8,*/*;q=0.1', 'accept-encoding': 'identity' },
      timeout: 10000
    }, response => {
      if ([301, 302, 303, 307, 308].includes(response.statusCode) && response.headers.location) {
        response.resume();
        if (redirects >= 4) return reject(new Error('Too many redirects'));
        let next;
        try { next = parseTarget(new URL(response.headers.location, url)); } catch (e) { return reject(e); }
        return resolve(fetchPublic(next, redirects + 1));
      }
      const type = String(response.headers['content-type'] || 'application/octet-stream').split(';')[0].toLowerCase();
      if (!/^(text\/html|application\/xhtml\+xml|text\/plain|text\/css|image\/(png|jpeg|gif|webp|x-icon|vnd\.microsoft\.icon)|font\/(woff|woff2)|application\/font-woff)$/.test(type)) {
        response.destroy(); return reject(new Error('Unsupported content type'));
      }
      if (Number(response.headers['content-length']) > MAX_BYTES) { response.destroy(); return reject(new Error('Response too large')); }
      const chunks = []; let size = 0;
      response.on('data', chunk => { size += chunk.length; if (size > MAX_BYTES) { response.destroy(new Error('Response too large')); return; } chunks.push(chunk); });
      response.on('end', () => resolve({ body: Buffer.concat(chunks), type, status: response.statusCode, url: url.href }));
      response.on('error', reject);
    });
    req.on('timeout', () => req.destroy(new Error('Upstream timeout')));
    req.on('error', reject);
  });
}

function routeUrl(value, base) {
  try {
    if (value.startsWith('#')) return value;
    const url = new URL(value, base);
    if (!['http:', 'https:'].includes(url.protocol)) return '#';
    return '/r/' + encode(parseTarget(url));
  } catch { return '#'; }
}

function rewriteHtml(body, base) {
  let html = body.toString('utf8');
  html = html.replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi, '').replace(/<script\b[^>]*\/?>/gi, '');
  html = html.replace(/\s+on[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '');
  html = html.replace(/<base\b[^>]*>/gi, '').replace(/<meta\b[^>]*http-equiv\s*=\s*["']?(?:refresh|content-security-policy)["']?[^>]*>/gi, '');
  html = html.replace(/\b(src|href|poster)\s*=\s*(["'])([^"']*)\2/gi, (_m, attr, quote, value) => attr + '=' + quote + routeUrl(value.replace(/&amp;/g, '&'), base).replace(/&/g, '&amp;') + quote);
  html = html.replace(/\bsrcset\s*=\s*(["'])([^"']*)\1/gi, (_m, quote, value) => 'srcset=' + quote + value.split(',').map(item => { const part = item.trim().split(/\s+/); part[0] = routeUrl(part[0], base); return part.join(' '); }).join(', ') + quote);
  html = html.replace(/url\(\s*(["']?)([^)'"\s]+)\1\s*\)/gi, (_m, quote, value) => 'url(' + quote + routeUrl(value, base) + quote + ')');
  return html;
}

function rewriteCss(body, base) {
  return body.toString('utf8').replace(/url\(\s*(["']?)([^)'"\s]+)\1\s*\)/gi, (_m, quote, value) => 'url(' + quote + routeUrl(value, base) + quote + ')');
}

async function handler(req, res) {
  securityHeaders(res);
  try {
    if (req.method === 'POST') {
      if (!sameOrigin(req)) return res.status(403).send('Same-origin requests only');
      if (limited(req, 60)) return res.status(429).send('Rate limit exceeded');
      if (!/^application\/json(?:;|$)/i.test(String(req.headers['content-type'] || ''))) return res.status(415).send('JSON required');
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      const target = parseTarget(body && body.url);
      await resolvePublic(target.hostname);
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      return res.status(200).json({ path: '/r/' + encode(target.href) });
    }
    if (!['GET', 'HEAD'].includes(req.method)) return res.status(405).send('Method not allowed');
    if (limited(req, 300)) return res.status(429).send('Rate limit exceeded');
    const token = String(req.query && req.query.token || '');
    const target = decode(token);
    const upstream = await fetchPublic(target);
    if (upstream.type === 'text/html' || upstream.type === 'application/xhtml+xml') {
      res.setHeader('Content-Security-Policy', "default-src 'none'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; font-src 'self' data:; form-action 'none'; frame-ancestors 'self'; base-uri 'none'");
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.status(upstream.status).send(req.method === 'HEAD' ? '' : rewriteHtml(upstream.body, upstream.url));
    }
    if (upstream.type === 'text/css') {
      res.setHeader('Content-Type', 'text/css; charset=utf-8');
      return res.status(upstream.status).send(req.method === 'HEAD' ? '' : rewriteCss(upstream.body, upstream.url));
    }
    res.setHeader('Content-Type', upstream.type);
    return res.status(upstream.status).send(req.method === 'HEAD' ? '' : upstream.body);
  } catch (error) {
    const unsafe = /Private|Only public|Invalid route|Expired route|Unsupported content type/.test(error.message);
    return res.status(unsafe ? 400 : 502).send(unsafe ? error.message : 'Server routing failed');
  }
}

module.exports = handler;
module.exports._test = { encode, decode, parseTarget, publicAddress, rewriteHtml, rewriteCss, fetchPublic, sameOrigin, limited };
