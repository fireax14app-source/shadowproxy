const crypto = require('node:crypto');
const dns = require('node:dns').promises;
const http = require('node:http');
const https = require('node:https');
const net = require('node:net');

const MAX_BYTES = 5 * 1024 * 1024;
const MAX_AGE = 24 * 60 * 60 * 1000;

function key() {
  const secret = process.env.ROUTE_SECRET;
  if (!secret || secret.length < 32) throw new Error('ROUTE_SECRET is not configured');
  return crypto.createHash('sha256').update(secret).digest();
}

function publicAddress(address) {
  const ip = address.replace(/^\[|\]$/g, '').toLowerCase();
  if (ip.includes(':')) {
    if (ip === '::1' || ip === '::' || ip.startsWith('fc') || ip.startsWith('fd') || /^fe[89ab]/.test(ip)) return false;
    if (ip.startsWith('::ffff:')) return publicAddress(ip.slice(7));
    return !ip.startsWith('2001:db8:');
  }
  const n = ip.split('.').map(Number);
  if (n.length !== 4 || n.some(x => !Number.isInteger(x) || x < 0 || x > 255)) return false;
  const a = n[0], b = n[1], c = n[2];
  return !(a === 0 || a === 10 || a === 127 || a >= 224 || a === 169 && b === 254 || a === 172 && b >= 16 && b <= 31 || a === 192 && b === 168 || a === 100 && b >= 64 && b <= 127 || a === 192 && b === 0 && c === 0 || a === 192 && b === 0 && c === 2 || a === 198 && (b === 18 || b === 19 || b === 51 && c === 100) || a === 203 && b === 0 && c === 113);
}

function parseTarget(value) {
  const url = new URL(value);
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.port && !['80', '443'].includes(url.port) || !url.hostname || url.href.length > 4096) throw new Error('Only public HTTP(S) addresses are allowed');
  if ((net.isIP(url.hostname.replace(/^\[|\]$/g, '')) || url.hostname.includes(':')) && !publicAddress(url.hostname)) throw new Error('Private addresses are blocked');
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
  const decipher = crypto.createDecipheriv('aes-256-gcm', key(), b.subarray(0, 12));
  decipher.setAuthTag(b.subarray(12, 28));
  const data = JSON.parse(Buffer.concat([decipher.update(b.subarray(28)), decipher.final()]).toString());
  if (!Number.isFinite(data.t) || data.t > Date.now() + 60000 || Date.now() - data.t > MAX_AGE) throw new Error('Expired route');
  return parseTarget(data.u);
}

async function fetchPublic(target, redirects = 0) {
  const url = parseTarget(target);
  const records = await dns.lookup(url.hostname, { all: true, verbatim: true });
  if (!records.length || records.some(record => !publicAddress(record.address))) throw new Error('Private or unresolved address blocked');
  const chosen = records[0];
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
      if (!/^(text\/html|application\/xhtml\+xml|text\/plain|text\/css|image\/(png|jpeg|gif|webp)|font\/(woff|woff2)|application\/font-woff)$/.test(type)) {
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
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  try {
    if (req.method === 'POST') {
      const origin = req.headers && req.headers.origin;
      if (origin && new URL(origin).host !== req.headers.host) return res.status(403).send('Cross-origin requests are blocked');
      const target = parseTarget(req.body && req.body.url);
      const records = await dns.lookup(target.hostname, { all: true });
      if (!records.length || records.some(record => !publicAddress(record.address))) throw new Error('Private or unresolved address blocked');
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      return res.status(200).json({ path: '/r/' + encode(target.href) });
    }
    if (req.method !== 'GET') return res.status(405).send('Method not allowed');
    const token = String(req.query && req.query.token || '');
    const target = decode(token);
    const upstream = await fetchPublic(target);
    if (upstream.type === 'text/html' || upstream.type === 'application/xhtml+xml') {
      res.setHeader('Content-Security-Policy', "default-src 'none'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; font-src 'self' data:; form-action 'none'; frame-ancestors 'self'; base-uri 'none'");
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.status(upstream.status).send(rewriteHtml(upstream.body, upstream.url));
    }
    if (upstream.type === 'text/css') {
      res.setHeader('Content-Type', 'text/css; charset=utf-8');
      return res.status(upstream.status).send(rewriteCss(upstream.body, upstream.url));
    }
    res.setHeader('Content-Type', upstream.type);
    return res.status(upstream.status).send(upstream.body);
  } catch (error) {
    const unsafe = /Private|Only public|Invalid route|Expired route|Unsupported content type/.test(error.message);
    return res.status(unsafe ? 400 : 502).send(unsafe ? error.message : 'Server routing failed');
  }
}

module.exports = handler;
module.exports._test = { encode, decode, parseTarget, publicAddress, rewriteHtml, rewriteCss, fetchPublic };
