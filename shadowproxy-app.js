(function () {
  'use strict';

  var $ = function (s) { return document.querySelector(s); };
  var $$ = function (s) { return Array.prototype.slice.call(document.querySelectorAll(s)); };
  var root = document.documentElement;
  var historyLimit = 30;

  var REAL_TITLE = 'ShadowProxy - by Fireax14';
  var FAKE_TITLE = 'Classes';
  var ICON_REAL = 'assets/shadowproxy-icon.png';
  var ICON_FAKE = 'https://icons.duckduckgo.com/ip3/classroom.google.com.ico';

  var DATA = window.ShadowProxyData || {};
  var THEMES = DATA.THEMES || [];
  var CATS = DATA.CATS || [];
  var LINKS = DATA.LINKS || [];
  var RELAYS = DATA.RELAYS || [];
  var SEARCH = DATA.SEARCH || function (q) { return 'https://www.bing.com/search?q=' + encodeURIComponent(q); };

  var favicon = $('#favicon');
  var topEl = $('#top');
  var clockEl = $('#clock');
  var heroBg = $('#heroBg');
  var gridEl = $('#grid');
  var filtersEl = $('#filters');
  var themesEl = $('#themes');
  var homeForm = $('#homeForm');
  var homeInput = $('#homeInput');
  var cloakEl = $('#cloak');
  var cloakExit = $('#cloakExit');
  var toastEl = $('#toast');
  var stage = $('#stage');
  var stageBody = $('#stageBody');
  var stageTabsEl = $('#stageTabs');
  var stageAddr = $('#stageAddr');
  var stageMode = $('#stageMode');
  var stageGo = $('#stageGo');
  var relayChip = $('#relayChip');
  var bootLoader = $('#bootLoader');
  var usageMemory = $('#usageMemory');
  var usageMemoryNote = $('#usageMemoryNote');
  var usageRefresh = $('#usageRefresh');
  var settingsPanel = $('#settingsPanel');
  var settingsInput = $('#cloakUrl');
  var settingsBtn = $('#settingsBtn');
  var settingsSave = $('#settingsSave');
  var settingsClose = $('#settingsClose');
  var settingsReset = $('#settingsReset');
  var tosGate = $('#tosGate');
  var tosAccept = $('#tosAccept');
  var termsLink = $('#termsLink');

  favicon.href = ICON_REAL;

  var toastTimer = null;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function hostOf(url) {
    try { return new URL(url).hostname; } catch (e) { return ''; }
  }
  function prettyHost(url) {
    return hostOf(url).replace(/^www\./, '') || 'page';
  }
  function escHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
  function decodeEntities(s) {
    return String(s)
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#0?39;/g, "'")
      .replace(/&#x27;/gi, "'")
      .replace(/&nbsp;/g, ' ');
  }
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add('on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove('on'); }, 2400);
  }
  function setRelayChip(text, kind) {
    relayChip.textContent = text;
    relayChip.className = 'relay-chip' + (kind ? ' ' + kind : '');
  }
  function setTabStatus(t, text, kind) {
    if (!t || t.destroyed) return;
    if (t.viaEl) t.viaEl.textContent = text;
    if (activeId === t.id) setRelayChip(text, kind);
  }

  var ICONS = !/[?&]icons=off(?:&|$)/i.test(location.search);
  var iconObserver = null;

  function observeIcon(img) {
    if (typeof IntersectionObserver !== 'function') {
      img.src = img.getAttribute('data-src');
      return;
    }
    if (!iconObserver) {
      iconObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (!en.isIntersecting) return;
          var el = en.target;
          iconObserver.unobserve(el);
          var src = el.getAttribute('data-src');
          if (src) el.src = src;
        });
      }, { rootMargin: '120px' });
    }
    iconObserver.observe(img);
  }

  function favEl(url, size) {
    var host = hostOf(url) || 'example.com';
    var letter = (host.charAt(0) || '?').toUpperCase();
    var box = document.createElement('span');
    box.className = 'fav';

    if (!ICONS) {
      box.classList.add('letter');
      box.textContent = letter;
      return box;
    }

    var img = document.createElement('img');
    img.alt = '';
    img.width = size;
    img.height = size;
    img.loading = 'lazy';
    img.decoding = 'async';
    img.referrerPolicy = 'no-referrer';
    img.setAttribute('data-src', 'https://icons.duckduckgo.com/ip3/' + host + '.ico');
    img.onerror = function () {
      box.classList.add('letter');
      box.textContent = letter;
      if (img.parentNode) img.parentNode.removeChild(img);
    };
    box.appendChild(img);
    observeIcon(img);
    return box;
  }

  function setTheme(id) {
    root.setAttribute('data-theme', id);
    try { localStorage.setItem('sp.theme', id); } catch (e) {}
    var select = $('#themeSelect');
    if (select) select.value = id;
  }

  function buildThemes() {
    var select = $('#themeSelect');
    if (!select) return;
    THEMES.forEach(function (t) {
      var option = document.createElement('option');
      option.value = t.id;
      option.textContent = t.name;
      select.appendChild(option);
    });
    select.value = root.getAttribute('data-theme') || 'midnight';
    select.addEventListener('change', function () { setTheme(select.value); });
  }

  function initReveal() {
    var items = $$('[data-reveal]');
    if (!('IntersectionObserver' in window)) {
      items.forEach(function (el) { el.classList.add('in'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          en.target.classList.add('in');
          io.unobserve(en.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    items.forEach(function (el) { io.observe(el); });
  }

  function initScroll() {
    var ticking = false;
    var apply = function () {
      var y = window.scrollY || window.pageYOffset || 0;
      topEl.classList.toggle('scrolled', y > 10);
      if (!reduceMotion && heroBg && y < 1600) {
        heroBg.style.transform = 'translate3d(0,' + Math.round(y * 0.22) + 'px,0) scale(1.06)';
      }
      ticking = false;
    };
    window.addEventListener('scroll', function () {
      if (!ticking) { ticking = true; requestAnimationFrame(apply); }
    }, { passive: true });
    apply();
  }

  function tickClock() {
    var d = new Date();
    var h = d.getHours();
    var m = d.getMinutes();
    clockEl.textContent = (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m;
  }

  var activeCat = 'all';

  function buildFilters() {
    CATS.forEach(function (c) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'filter' + (c.id === activeCat ? ' on' : '');
      b.textContent = c.name;
      b.addEventListener('click', function () {
        activeCat = c.id;
        $$('.filter').forEach(function (x) { x.classList.remove('on'); });
        b.classList.add('on');
        renderLinks();
      });
      filtersEl.appendChild(b);
    });
  }

  function renderLinks() {
    gridEl.innerHTML = '';
    var list = LINKS.filter(function (l) { return activeCat === 'all' || l.c === activeCat; });
    list.forEach(function (l, i) {
      var tile = document.createElement('button');
      tile.type = 'button';
      tile.className = 'tile';
      tile.setAttribute('data-reveal', '');
      tile.style.setProperty('--i', String(i % 12));

      tile.appendChild(favEl(l.u, 20));

      var meta = document.createElement('span');
      meta.className = 'tile-meta';
      var name = document.createElement('b');
      name.textContent = l.n;
      var host = document.createElement('span');
      host.textContent = prettyHost(l.u);
      meta.appendChild(name);
      meta.appendChild(host);
      tile.appendChild(meta);

      var go = document.createElement('span');
      go.className = 'tile-go';
      go.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17 17 7M8 7h9v9"/></svg>';
      tile.appendChild(go);

      tile.addEventListener('click', function () { openTarget(l.u, 'proxy'); });
      gridEl.appendChild(tile);
    });
    initReveal();
  }

  function normalize(v) {
    var raw = String(v || '').trim();
    if (!raw) return null;
    if (!/^[a-z][a-z0-9+.-]*:/i.test(raw) && /^[\w-]+(\.[\w-]+)+(:\d+)?(\/[^\s]*)?$/.test(raw)) raw = 'https://' + raw;
    try {
      var parsed = new URL(raw);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
      return parsed.href;
    } catch (e) { return null; }
  }
  function resolveTarget(v) {
    var direct = normalize(v);
    return direct || SEARCH(String(v || '').trim());
  }

  var tabs = [];
  var activeId = null;
  var seq = 0;

  function tabById(id) {
    for (var i = 0; i < tabs.length; i++) { if (tabs[i].id === id) return tabs[i]; }
    return null;
  }
  function tabByFrame(source) {
    for (var i = 0; i < tabs.length; i++) {
      if (tabs[i].frame && tabs[i].frame.contentWindow === source) return tabs[i];
    }
    return null;
  }
  function makeBridgeToken() {
    if (window.crypto && window.crypto.getRandomValues) {
      var bytes = new Uint32Array(4);
      window.crypto.getRandomValues(bytes);
      return Array.prototype.map.call(bytes, function (n) { return n.toString(16); }).join('-');
    }
    return String(Date.now()) + '-' + String(Math.random()).slice(2);
  }

  function showStage() {
    stage.classList.add('on');
    stage.setAttribute('aria-hidden', 'false');
    stage.removeAttribute('inert');
    root.classList.add('locked');
  }

  function hideStage() {
    stage.classList.remove('on');
    stage.setAttribute('aria-hidden', 'true');
    stage.setAttribute('inert', '');
    root.classList.remove('locked');
  }

  function renderTabs() {
    stageTabsEl.innerHTML = '';
    tabs.forEach(function (t) {
      var el = document.createElement('div');
      el.className = 'stab' + (t.id === activeId ? ' on' : '');

      if (t.url) {
        el.appendChild(favEl(t.url, 14));
      } else {
        var ph = document.createElement('span');
        ph.className = 'fav';
        ph.textContent = '·';
        el.appendChild(ph);
      }

      var label = document.createElement('b');
      label.textContent = t.title || 'New tab';

      var x = document.createElement('button');
      x.type = 'button';
      x.className = 'x';
      x.textContent = '×';
      x.setAttribute('aria-label', 'Close tab');

      el.appendChild(label);
      el.appendChild(x);

      el.addEventListener('click', function (e) {
        if (e.target === x) return;
        activate(t.id);
      });
      x.addEventListener('click', function (e) {
        e.stopPropagation();
        closeTab(t.id);
      });

      stageTabsEl.appendChild(el);
    });
  }

  function activate(id) {
    activeId = id;
    tabs.forEach(function (t) {
      if (t.pane) t.pane.classList.toggle('on', t.id === id);
    });
    var t = tabById(id);
    if (t) {
      stageAddr.value = t.url || '';
      if (t.status === 'direct') setRelayChip('direct · no relay');
      else if (t.status === 'failed') setRelayChip('relay failed', 'bad');
      else if (t.status === 'stopped') setRelayChip('stopped');
      else if (t.status === 'routing') setRelayChip('routing…');
      else setRelayChip(t.via ? 'via ' + t.via : 'relay idle', t.via ? 'ok' : '');
      if (t.pane) t.pane.querySelector('.blank').classList.toggle('on', !t.url);
    }
    renderTabs();
  }

  function ensurePane(t) {
    if (t.pane) return t.pane;

    var pane = document.createElement('div');
    pane.className = 'pane';
    pane.innerHTML =
      '<div class="pane-top">' +
        '<span class="relay-chip">relay</span>' +
        '<span class="pane-url"></span>' +
        '<span class="grow"></span>' +
        '<button type="button" data-act="back" title="Back" aria-label="Back">←</button>' +
        '<button type="button" data-act="forward" title="Forward" aria-label="Forward">→</button>' +
        '<button type="button" data-act="cancel">Stop</button>' +
        '<button type="button" data-act="reload">Reload page</button>' +
        '<button type="button" data-act="reader">Reader</button>' +
        '<button type="button" data-act="direct">Direct</button>' +
        '<button type="button" data-act="open">Open</button>' +
      '</div>' +
      '<div class="loader"></div>' +
      '<iframe class="frame" referrerpolicy="no-referrer" title="ShadowProxy view"></iframe>' +
      '<div class="blank"><div><b>Ready when you are</b><span>Paste a public page address above, then choose Open page.</span></div></div>' +
      '<div class="errbox"><div class="errcard"><h3>We could not open this page here</h3><p class="errmsg"></p>' +
        '<div class="row">' +
          '<button class="btn accent" type="button" data-act="retry">Try the relays again</button>' +
          '<button class="btn" type="button" data-act="direct">Load direct</button>' +
          '<button class="btn" type="button" data-act="open">Open outside</button>' +
        '</div></div></div>';

    stageBody.appendChild(pane);

    t.pane = pane;
    t.frame = pane.querySelector('.frame');
    t.viaEl = pane.querySelector('.relay-chip');
    t.urlEl = pane.querySelector('.pane-url');
    t.loaderEl = pane.querySelector('.loader');
    t.errEl = pane.querySelector('.errbox');
    t.errMsg = pane.querySelector('.errmsg');

    pane.addEventListener('click', function (e) {
      var b = e.target.closest ? e.target.closest('[data-act]') : null;
      if (!b || !t.url) return;
      var act = b.getAttribute('data-act');
      if (act === 'back') goHistory(t, -1);
      else if (act === 'forward') goHistory(t, 1);
      else if (act === 'reload') load(t, t.url, t.mode, true);
      else if (act === 'retry') load(t, t.url, 'proxy');
      else if (act === 'reader') load(t, t.url, 'reader');
      else if (act === 'direct') load(t, t.url, 'direct');
      else if (act === 'cancel') {
        if (t.ctrl) t.ctrl.abort();
        toast('Stopped');
      }
      else if (act === 'open') window.open(t.url, '_blank', 'noopener,noreferrer');
    });

    return pane;
  }

  function newTab() {
    var t = {
      id: 't' + (++seq),
      url: null,
      title: 'New tab',
      history: [],
      historyIndex: -1,
      mode: 'proxy',
      status: 'idle',
      bridgeToken: makeBridgeToken(),
      via: null,
      pane: null,
      frame: null,
      req: 0
    };
    tabs.push(t);
    activeId = t.id;
    ensurePane(t);
    activate(t.id);
    return t;
  }

  function closeTab(id) {
    var idx = -1;
    for (var i = 0; i < tabs.length; i++) { if (tabs[i].id === id) { idx = i; break; } }
    if (idx < 0) return;
    var t = tabs[idx];
    t.destroyed = true;
    if (t.ctrl) t.ctrl.abort();
    t.ctrl = null;
    t.req++;
    if (t.pane && t.pane.parentNode) t.pane.parentNode.removeChild(t.pane);
    tabs.splice(idx, 1);
    if (!tabs.length) {
      activeId = null;
      hideStage();
      renderTabs();
      return;
    }
    if (activeId === id) {
      activate(tabs[Math.min(idx, tabs.length - 1)].id);
    } else {
      renderTabs();
    }
  }

  function updateHistoryButtons(t) {
    if (!t || !t.pane) return;
    var back = t.pane.querySelector('[data-act="back"]');
    var forward = t.pane.querySelector('[data-act="forward"]');
    if (back) back.disabled = t.historyIndex <= 0;
    if (forward) forward.disabled = t.historyIndex < 0 || t.historyIndex >= t.history.length - 1;
  }

  function goHistory(t, delta) {
    var next = t.historyIndex + delta;
    if (next < 0 || next >= t.history.length) return;
    var entry = t.history[next];
    t.historyIndex = next;
    t._historyNav = true;
    load(t, entry.url, entry.mode, true);
  }

  function recordHistory(t, url, mode) {
    if (t._historyNav) { t._historyNav = false; return; }
    var entry = { url: url, mode: mode === 'reader' ? 'reader' : (mode === 'direct' ? 'direct' : 'proxy') };
    var current = t.history[t.historyIndex];
    if (current && current.url === entry.url && current.mode === entry.mode) return;
    if (t.historyIndex < t.history.length - 1) t.history = t.history.slice(0, t.historyIndex + 1);
    t.history.push(entry);
    if (t.history.length > historyLimit) t.history.shift();
    t.historyIndex = t.history.length - 1;
  }

  function load(t, url, mode, preserveHistory) {
    if (mode === 'tab') {
      window.open(url, '_blank', 'noopener,noreferrer');
      toast('Opened in a browser tab');
      return;
    }
    if (!url) return;
    if (!preserveHistory) {
      t._historyNav = false;
      recordHistory(t, url, mode);
    } else if (t._historyNav) {
      t._historyNav = false;
    }
    t.url = url;
    t.mode = mode === 'direct' ? 'direct' : (mode === 'reader' ? 'reader' : 'proxy');
    t.status = 'routing';
    t.title = prettyHost(url);
    t.via = null;

    ensurePane(t);
    showStage();
    activate(t.id);
    stageAddr.value = url;
    updateHistoryButtons(t);

    if (t.mode === 'direct') loadDirect(t, url);
    else loadProxy(t, url, t.mode === 'reader');
  }

  function openTarget(url, mode) {
    mode = mode || stageMode.value || 'proxy';
    if (mode === 'tab') {
      window.open(url, '_blank', 'noopener,noreferrer');
      toast('Opened in a browser tab');
      return;
    }
    var t = tabById(activeId) || newTab();
    load(t, url, mode);
  }

  function loadDirect(t, url) {
    ensurePane(t);
    if (t.ctrl) { t.ctrl.abort(); t.ctrl = null; }
    var my = ++t.req;
    t.mode = 'direct';
    t.status = 'routing';
    t.errEl.classList.remove('on');
    t.loaderEl.classList.remove('on');
    t.pane.classList.remove('loading');
    t.viaEl.textContent = 'direct';
    t.urlEl.textContent = url;
    t.frame.removeAttribute('srcdoc');
    t.frame.setAttribute('sandbox', 'allow-scripts allow-forms allow-popups allow-modals allow-downloads');
    t.frame.onload = function () {
      if (t.destroyed || t.req !== my) return;
      clearTimeout(t.directTimer);
      t.status = 'loaded';
      t.loaderEl.classList.remove('on');
      t.pane.classList.remove('loading');
      setTabStatus(t, 'direct · loaded', 'ok');
    };
    t.frame.onerror = function () {
      if (t.destroyed || t.req !== my) return;
      clearTimeout(t.directTimer);
      t.status = 'failed';
      t.errMsg.textContent = 'This site refused to load inside a frame. Use Open outside instead.';
      t.errEl.classList.add('on');
      setTabStatus(t, 'direct failed', 'bad');
    };
    clearTimeout(t.directTimer);
    t.directTimer = setTimeout(function () {
      if (t.destroyed || t.req !== my || t.status === 'loaded') return;
      t.status = 'failed';
      t.loaderEl.classList.remove('on');
      t.pane.classList.remove('loading');
      t.errMsg.textContent = 'This site refused to load inside a frame or is taking too long. Use Open outside instead.';
      t.errEl.classList.add('on');
      setTabStatus(t, 'direct blocked', 'bad');
    }, 9000);
    t.frame.src = url;
    updateHistoryButtons(t);
    setTabStatus(t, 'direct · loading');
  }

  var lastGood = null;

  function orderedRelays() {
    var list = RELAYS.slice();
    if (lastGood) {
      for (var i = 0; i < list.length; i++) {
        if (list[i].id === lastGood) {
          var r = list.splice(i, 1)[0];
          list.unshift(r);
          break;
        }
      }
    }
    return list;
  }

  var MAX_RESPONSE_CHARS = 5 * 1024 * 1024;
  var CHAIN_BUDGET_MS = 20000;
  var BLOCK_MARKERS = [
    /bots use DuckDuckGo too/i,
    /Our systems have detected unusual traffic/i,
    /unusual traffic from your computer network/i,
    /are you a robot/i
  ];

  function fetchTimeout(url, ms, outer) {
    var ctrl = new AbortController();
    var timer = setTimeout(function () { ctrl.abort(); }, ms);
    var onAbort = function () { ctrl.abort(); };
    if (outer) {
      if (outer.signal.aborted) ctrl.abort();
      else outer.signal.addEventListener('abort', onAbort);
    }
    var done = function () {
      clearTimeout(timer);
      if (outer) outer.signal.removeEventListener('abort', onAbort);
    };
    return fetch(url, { signal: ctrl.signal, redirect: 'follow', cache: 'no-store' })
      .then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.text().then(function (text) {
          return { text: text, contentType: r.headers.get('content-type') || '', status: r.status };
        });
      })
      .then(function (response) {
        done();
        if (response.text.length > MAX_RESPONSE_CHARS) throw new Error('response too large');
        return response;
      }, function (e) { done(); throw e; });
  }

  function looksBlocked(text) {
    for (var i = 0; i < BLOCK_MARKERS.length; i++) {
      if (BLOCK_MARKERS[i].test(text)) return true;
    }
    return false;
  }

  function wrapReader(text, url) {
    return '<!DOCTYPE html><html><head><meta charset="utf-8"><title>' + escHtml(url) + '</title>' +
      '<style>body{margin:0;padding:28px 32px;background:#0f0f16;color:#e7e7f0;' +
      'font:13.5px/1.75 ui-monospace,SFMono-Regular,Menlo,monospace;white-space:pre-wrap;word-wrap:break-word}' +
      'b{display:block;color:#a78bfa;font:600 11px/1.4 ui-sans-serif,system-ui;letter-spacing:.1em;' +
      'text-transform:uppercase;margin:0 0 20px}</style></head><body><b>reader · ' + escHtml(url) +
      '</b>' + escHtml(text) + '</body></html>';
  }

  function unwrapRelayText(text) {
    var raw = String(text || '');
    try {
      var parsed = JSON.parse(raw);
      if (parsed && typeof parsed.contents === 'string') return parsed.contents;
      if (parsed && typeof parsed.body === 'string') return parsed.body;
      if (parsed && typeof parsed.data === 'string') return parsed.data;
    } catch (e) {}
    return raw;
  }

  function wrapText(text, url, label) {
    return '<!DOCTYPE html><html><head><meta charset="utf-8"><title>' + escHtml(url) + '</title>' +
      '<style>body{margin:0;padding:28px 32px;background:#0f0f16;color:#e7e7f0;' +
      'font:13.5px/1.75 ui-monospace,SFMono-Regular,Menlo,monospace;white-space:pre-wrap;word-wrap:break-word}' +
      'b{display:block;color:#d5b06a;font:600 11px/1.4 ui-sans-serif,system-ui;letter-spacing:.1em;' +
      'text-transform:uppercase;margin:0 0 20px}</style></head><body><b>' + escHtml(label || 'text') + ' · ' + escHtml(url) +
      '</b>' + escHtml(text) + '</body></html>';
  }

  async function proxyFetch(target, onStatus, forceReader, outer) {
    var relays = forceReader ? RELAYS.filter(function (r) { return r.wrap; }) : orderedRelays();
    var deadline = Date.now() + CHAIN_BUDGET_MS;
    var errors = [];

    for (var i = 0; i < relays.length; i++) {
      if (outer && outer.signal.aborted) throw new Error('cancelled');
      var remaining = deadline - Date.now();
      if (remaining < 500) {
        errors.push('chain time budget exhausted');
        break;
      }
      var r = relays[i];
      if (onStatus) onStatus('relay ' + (i + 1) + '/' + relays.length + ' · ' + r.name);
      try {
        var response = await fetchTimeout(r.build(target), Math.min(r.timeout || 7000, remaining), outer);
        var text = unwrapRelayText(response.text);
        if (!text || text.length < 20) throw new Error('empty response');
        if (r.wrap) {
          text = wrapReader(text, target);
        } else {
          var contentType = String(response.contentType || '').toLowerCase();
          var textual = /(?:text\/html|application\/xhtml\+xml|application\/json|application\/xml|text\/xml|text\/plain)/i.test(contentType);
          if (!textual && !/<[a-z!]/i.test(text.slice(0, 2048))) throw new Error('non-text response; use Open outside');
          if (looksBlocked(text)) throw new Error('provider is challenging the relay');
          if (!/html|xhtml/i.test(contentType) && !/<(?:html|head|body)\b/i.test(text)) text = wrapText(text, target, contentType.split(';')[0] || 'text');
        }
        if (!r.wrap) lastGood = r.id;
        markRelay(r.id);
        return { html: text, via: r.name };
      } catch (e) {
        if (outer && outer.signal.aborted) throw new Error('cancelled');
        var reason = e && e.name === 'AbortError' ? 'timeout' : (e && e.message ? e.message : 'failed');
        errors.push(r.name + ' - ' + reason);
        try { console.warn('[shadowproxy] relay failed', r.id, reason); } catch (x) {}
      }
    }
    throw new Error('Every relay refused the request.\n\n' + errors.join('\n'));
  }

  async function loadProxy(t, url, forceReader) {
    ensurePane(t);
    if (t.ctrl) t.ctrl.abort();
    t.ctrl = new AbortController();
    var ctrl = t.ctrl;
    var my = ++t.req;
    t.status = 'routing';

    t.errEl.classList.remove('on');
    t.loaderEl.classList.add('on');
    t.pane.classList.add('loading');
    t.frame.removeAttribute('srcdoc');
    t.frame.src = 'about:blank';
    t.urlEl.textContent = url;
    setTabStatus(t, 'routing…');

    try {
      var res = await proxyFetch(url, function (msg) {
        if (t.req === my) setTabStatus(t, msg);
      }, forceReader, ctrl);
      if (t.destroyed || t.req !== my) return;

      var html = res.html;
      var titleMatch = html.match(/<title[^>]*>([\s\S]{1,160}?)<\/title>/i);
      if (titleMatch) {
        var clean = decodeEntities(titleMatch[1].replace(/\s+/g, ' ').trim());
        if (clean) { t.title = clean.slice(0, 90); renderTabs(); }
      }

      t.frame.removeAttribute('src');
      t.frame.setAttribute('sandbox', 'allow-scripts allow-forms allow-popups allow-modals allow-downloads');
      t.frame.srcdoc = buildSrcdoc(html, url, t.bridgeToken);
      updateHistoryButtons(t);

      t.via = res.via;
      t.status = 'loaded';
      t.loaderEl.classList.remove('on');
      t.pane.classList.remove('loading');
      setTabStatus(t, 'via ' + res.via, 'ok');
    } catch (err) {
      if (t.destroyed || t.req !== my) return;
      t.loaderEl.classList.remove('on');
      t.pane.classList.remove('loading');
      if (err && err.message === 'cancelled') {
        t.status = 'stopped';
        setTabStatus(t, 'stopped', '');
        return;
      }
      t.status = 'failed';
      t.errMsg.textContent = String(err && err.message ? err.message : err);
      t.errEl.classList.add('on');
      setTabStatus(t, 'relay failed', 'bad');
      try { console.warn('[shadowproxy] load failed', url, err && err.message); } catch (x) {}
    } finally {
      if (t.ctrl === ctrl) t.ctrl = null;
    }
  }

  function buildSrcdoc(html, baseUrl, bridgeToken) {
    var out = String(html);
    out = out.replace(/<base\b[^>]*>/gi, '');

    var base = '<base href="' + escHtml(baseUrl) + '">';

    if (/<head[^>]*>/i.test(out)) {
      out = out.replace(/<head[^>]*>/i, function (m) { return m + base; });
    } else if (/<html[^>]*>/i.test(out)) {
      out = out.replace(/<html[^>]*>/i, function (m) { return m + '<head>' + base + '</head>'; });
    } else {
      out = base + out;
    }

    var hook = '<scr' + 'ipt>(function(){' +
      'function send(u){try{parent.postMessage({__sp:1,url:u,token:' + JSON.stringify(bridgeToken || '') + '},"*")}catch(e){}}' +
      'document.addEventListener("click",function(e){' +
        'var a=e.target&&e.target.closest?e.target.closest("a"):null;' +
        'if(!a||!a.href)return;' +
        'if(e.button!==0||e.defaultPrevented||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey)return;' +
        'if(a.target==="_blank"||a.hasAttribute("download"))return;' +
        'if(!/^https?:/i.test(a.href))return;' +
        'e.preventDefault();send(a.href);' +
      '},true);' +
      'document.addEventListener("submit",function(e){' +
        'var f=e.target;if(!f||!f.action)return;' +
        'if((f.method||"get").toLowerCase()!=="get"){' +
          'e.preventDefault();' +
          'try{parent.postMessage({__sp:1,kind:"blocked"},"*")}catch(x){}' +
          'return;' +
        '}' +
        'var action=new URL(f.getAttribute("action")||document.baseURI,document.baseURI);action.hash="";' +
        'var d=new FormData(f);d.forEach(function(v,k){if(typeof v==="string")action.searchParams.append(k,v)});' +
        'e.preventDefault();send(action.href);' +
      '},true);' +
      'var ps=history.pushState,rs=history.replaceState;' +
      'history.pushState=function(){var r=ps.apply(this,arguments);try{send(location.href)}catch(x){}return r};' +
      'history.replaceState=function(){var r=rs.apply(this,arguments);try{send(location.href)}catch(x){}return r};' +
      'addEventListener("popstate",function(){try{send(location.href)}catch(x){}});' +
      '})();</scr' + 'ipt>';

    if (/<\/body>/i.test(out)) out = out.replace(/<\/body>/i, hook + '</body>');
    else out = out + hook;

    return out;
  }

  var cloaked = false;

  var DEFAULT_CLOAK_URL = 'https://www.google.com/';

  function getCloakUrl() {
    var saved = '';
    try { saved = localStorage.getItem('sp.cloakUrl') || ''; } catch (e) {}
    return normalize(saved) || DEFAULT_CLOAK_URL;
  }

  function setCloak(on) {
    if (on) {
      var destination = getCloakUrl();
      cloaked = true;
      root.classList.add('cloaked');
      if (cloakEl) cloakEl.setAttribute('aria-hidden', 'false');
      document.title = FAKE_TITLE;
      favicon.href = ICON_FAKE;
      suspendFrames();
      if (cloakExit) cloakExit.focus();
      var popup = window.open(destination, '_blank', 'noopener,noreferrer');
      if (!popup) toast('Cloak on - popup blocked');
      else toast('Cloak on');
      return;
    }
    cloaked = false;
    root.classList.remove('cloaked');
    cloakEl.setAttribute('aria-hidden', 'true');
    document.title = REAL_TITLE;
    favicon.href = ICON_REAL;
    resumeActive();
  }

  function suspendFrames() {
    tabs.forEach(function (t) {
      if (!t.frame) return;
      var hasDoc = t.frame.hasAttribute('srcdoc') || (t.frame.getAttribute('src') && t.frame.getAttribute('src') !== 'about:blank');
      if (!hasDoc) return;
      t.suspended = true;
      t.frame.removeAttribute('srcdoc');
      t.frame.removeAttribute('src');
      t.frame.setAttribute('src', 'about:blank');
    });
  }

  function resumeActive() {
    var t = tabById(activeId);
    if (!t || !t.suspended) return;
    t.suspended = false;
    if (t.url) load(t, t.url, t.mode);
  }

  function openStealth() {
    var t = tabById(activeId);
    var url = t && t.url ? t.url : '';
    var w = window.open('about:blank', '_blank');
    if (!w) { toast('Popup blocked - allow popups for this file'); return; }
    var body =
      '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Classes</title>' +
      '<style>html,body{height:100%;margin:0}' +
      'body{font:14px/1.5 Roboto,"Segoe UI",Arial,sans-serif;background:#f8f9fa;color:#202124}' +
      '.top{height:64px;display:flex;align-items:center;gap:16px;padding:0 22px;background:#fff;' +
      'border-bottom:1px solid #e0e0e0;position:sticky;top:0}' +
      '.grid{display:grid;grid-template-columns:repeat(3,4px);gap:3px}' +
      '.grid i{width:4px;height:4px;background:#5f6368;border-radius:1px}' +
      '.brand{font-size:22px;color:#5f6368}' +
      '.av{margin-left:auto;width:32px;height:32px;border-radius:50%;background:#1a73e8;' +
      'color:#fff;display:grid;place-items:center;font-size:13px}' +
      '.wrap{max-width:1100px;margin:0 auto;padding:26px 24px 60px}' +
      'h1{font-size:28px;font-weight:400;margin:0 0 2px}p{color:#5f6368;font-size:13.5px;margin:0 0 22px}' +
      '.cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:18px}' +
      '.card{background:#fff;border:1px solid #dadce0;border-radius:10px;overflow:hidden}' +
      '.head{height:88px;padding:12px 14px;color:#fff;display:flex;flex-direction:column;justify-content:space-between}' +
      '.head b{font-size:15px;font-weight:500}.head span{font-size:11.5px;opacity:.92}' +
      '.foot{display:flex;gap:20px;padding:11px 14px;border-top:1px solid #e8eaed;color:#5f6368;font-size:12px}' +
      '.frame{position:fixed;inset:64px 0 0;width:100%;height:calc(100% - 64px);border:0;display:none;background:#fff}' +
      'body.show .frame{display:block}body.show .wrap{display:none}' +
      '</style></head><body>' +
      '<div class="top"><div class="grid"><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div>' +
      '<div class="brand">Classroom</div><div class="av">C</div></div>' +
      '<div class="wrap"><h1>Classes</h1><p>Assignments, announcements, and classwork</p><div class="cards">' +
      card('#1a73e8', 'Algebra II', 'Mr. Delgado · Period 3') +
      card('#188038', 'AP Biology', 'Ms. Okafor · Period 1') +
      card('#c5221f', 'World History', 'Mr. Bianchi · Period 5') +
      card('#8430ce', 'English 11', 'Mrs. Lindqvist · Period 2') +
      card('#e37400', 'Chemistry', 'Dr. Haddad · Period 6') +
      card('#0b8043', 'Computer Science', 'Ms. Park · Period 4') +
      '</div></div>' +
      '<iframe class="frame" title="content"></iframe>' +
      '<scr' + 'ipt>(function(){' +
      'var f=document.querySelector(".frame");' +
      'if(f&&' + JSON.stringify(url) + '){f.src=' + JSON.stringify(url) + ';document.body.classList.add("show")}' +
      '})();</scr' + 'ipt>' +
      '</body></html>';

    function card(color, name, teacher) {
      return '<div class="card"><div class="head" style="background:' + color + '">' +
        '<b>' + name + '</b><span>' + teacher + '</span></div>' +
        '<div class="foot"><span>Assignments</span><span>Stream</span><span>People</span></div></div>';
    }

    w.document.open();
    w.document.write(body);
    w.document.close();
  }

  function toggleSettings(open) {
    var visible = !!open;
    if (!settingsPanel) return;
    settingsPanel.classList.toggle('on', visible);
    settingsPanel.setAttribute('aria-hidden', visible ? 'false' : 'true');
    if (visible) {
      settingsPanel._returnFocus = document.activeElement;
      if (settingsInput) { settingsInput.value = getCloakUrl(); settingsInput.focus(); settingsInput.select(); }
    } else if (settingsPanel._returnFocus) {
      settingsPanel._returnFocus.focus();
      settingsPanel._returnFocus = null;
    }
    if (visible) root.classList.add('locked');
    else if (!tosGate || !tosGate.classList.contains('on')) root.classList.remove('locked');
  }

  function bindSettings() {
    if (settingsBtn) settingsBtn.addEventListener('click', function () { toggleSettings(true); });
    if (settingsClose) settingsClose.addEventListener('click', function () { toggleSettings(false); });
    if (settingsSave) settingsSave.addEventListener('click', function () {
      var value = normalize(settingsInput && settingsInput.value);
      if (!value) { toast('Enter an http or https website'); if (settingsInput) settingsInput.focus(); return; }
      try { localStorage.setItem('sp.cloakUrl', value); } catch (e) {}
      if (settingsInput) settingsInput.value = value;
      toggleSettings(false);
      toast('Cloak destination saved');
    });
    if (settingsReset) settingsReset.addEventListener('click', function () {
      try { localStorage.removeItem('sp.cloakUrl'); } catch (e) {}
      if (settingsInput) settingsInput.value = DEFAULT_CLOAK_URL;
      toast('Cloak destination reset');
    });
    if (termsLink) termsLink.addEventListener('click', function () { showTerms(); });
    if (tosAccept) tosAccept.addEventListener('click', function () {
      try { localStorage.setItem('sp.tosAccepted', '1'); } catch (e) {}
      if (tosGate) { tosGate.classList.remove('on'); tosGate.setAttribute('aria-hidden', 'true'); }
      root.classList.remove('locked');
      homeInput.focus();
    });
    if (tosGate && tosGate.classList.contains('on')) root.classList.add('locked');
  }

  function showTerms() {
    if (!tosGate) return;
    tosGate.classList.add('on');
    tosGate.setAttribute('aria-hidden', 'false');
    root.classList.add('locked');
    if (tosAccept) tosAccept.focus();
  }

  function initTerms() {
    var accepted = false;
    try { accepted = localStorage.getItem('sp.tosAccepted') === '1'; } catch (e) {}
    if (accepted && tosGate) {
      tosGate.classList.remove('on');
      tosGate.setAttribute('aria-hidden', 'true');
      root.classList.remove('locked');
    } else if (tosGate) showTerms();
  }

  function bindStage() {
    $('#stageBack').addEventListener('click', function () {
      hideStage();
      setRelayChip('relay idle');
    });

    $('#stageClose').addEventListener('click', function () {
      hideStage();
      setRelayChip('relay idle');
    });

    $('#stageNew').addEventListener('click', function () {
      var t = newTab();
      stageAddr.value = '';
      stageAddr.focus();
      t.title = 'New tab';
      renderTabs();
    });

    $('#stealthBtn').addEventListener('click', openStealth);

    stageGo.addEventListener('click', function () {
      var raw = stageAddr.value.trim();
      if (!raw) return;
      var t = tabById(activeId) || newTab();
      load(t, resolveTarget(raw), stageMode.value);
    });

    stageAddr.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        stageGo.click();
      }
    });

    stageMode.addEventListener('change', function () {
      var t = tabById(activeId);
      if (t && t.url) load(t, t.url, stageMode.value);
    });

    homeForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var raw = homeInput.value.trim();
      if (!raw) return;
      openTarget(resolveTarget(raw), 'proxy');
    });

    cloakExit.addEventListener('click', function () { setCloak(false); });

    var cloakBtn = $('#cloakBtn');
    if (cloakBtn) cloakBtn.addEventListener('click', function () { setCloak(true); });
    var panicBtn = $('#panicBtn');
    if (panicBtn) panicBtn.addEventListener('click', function () { setCloak(true); });
  }

  function bindKeys() {
    document.addEventListener('keydown', function (e) {
      var tag = (e.target && e.target.tagName || '').toLowerCase();
      var typing = tag === 'input' || tag === 'textarea' || tag === 'select';
      var settingsOpen = settingsPanel && settingsPanel.classList.contains('on');
      var termsOpen = tosGate && tosGate.classList.contains('on');
      var activeDialog = settingsOpen ? settingsPanel : (termsOpen ? tosGate : null);

      if (activeDialog) {
        if (e.key === 'Escape' && settingsOpen) {
          e.preventDefault();
          toggleSettings(false);
          return;
        }
        if (e.key === 'Tab') {
          var dialogCard = activeDialog.querySelector('[role="dialog"]');
          var controls = dialogCard ? Array.prototype.slice.call(dialogCard.querySelectorAll('button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled])')).filter(function (control) {
            return control.offsetParent !== null;
          }) : [];
          if (controls.length) {
            var first = controls[0];
            var last = controls[controls.length - 1];
            if (e.shiftKey && document.activeElement === first) {
              e.preventDefault();
              last.focus();
            } else if (!e.shiftKey && document.activeElement === last) {
              e.preventDefault();
              first.focus();
            } else if (!dialogCard.contains(document.activeElement)) {
              e.preventDefault();
              (e.shiftKey ? last : first).focus();
            }
          }
          return;
        }
      }

      if (e.key === '`' && !typing) {
        e.preventDefault();
        setCloak(!cloaked);
        return;
      }
      if (e.ctrlKey && e.shiftKey && (e.key === 'X' || e.key === 'x')) {
        e.preventDefault();
        setCloak(!cloaked);
        return;
      }
      if (e.key === 'Escape') {
        if (cloaked) { e.preventDefault(); setCloak(false); return; }
        if (stage.classList.contains('on')) { e.preventDefault(); hideStage(); return; }
      }
      if (e.key === '/' && !typing) {
        e.preventDefault();
        if (stage.classList.contains('on')) { stageAddr.focus(); stageAddr.select(); }
        else { homeInput.focus(); homeInput.select(); }
        return;
      }
      if (e.ctrlKey && (e.key === 'w' || e.key === 'W') && stage.classList.contains('on')) {
        e.preventDefault();
        if (activeId) closeTab(activeId);
        return;
      }
      if (e.ctrlKey && e.key === 'Enter' && stage.classList.contains('on')) {
        e.preventDefault();
        var t = tabById(activeId);
        if (t && t.url) load(t, t.url, 'proxy');
      }
    });
  }

  window.addEventListener('message', function (e) {
    var d = e.data;
    if (!d || typeof d !== 'object' || d.__sp !== 1) return;

    var t = tabByFrame(e.source);
    if (!t || !t.pane) return;

    var frameWin = t.frame && t.frame.contentWindow;
    if (!frameWin || e.source !== frameWin) return;
    if (d.token !== t.bridgeToken) return;

    if (d.kind === 'blocked') {
      toast('That form posts data - the relay can only carry GET requests.');
      return;
    }
    if (typeof d.url !== 'string' || !/^https?:\/\//i.test(d.url)) return;
    load(t, d.url, t.mode === 'direct' ? 'proxy' : t.mode);
  });

  function buildChain() {
    var row = $('#chainRow');
    if (!row) return;
    row.innerHTML = '';
    RELAYS.forEach(function (r, i) {
      if (i) {
        var arrow = document.createElement('span');
        arrow.className = 'chain-arrow';
        arrow.textContent = '→';
        row.appendChild(arrow);
      }
      var pill = document.createElement('span');
      pill.className = 'relay-pill';
      pill.setAttribute('data-relay', r.id);
      var dot = document.createElement('i');
      pill.appendChild(dot);
      pill.appendChild(document.createTextNode(r.name));
      row.appendChild(pill);
    });
  }

  function markRelay(id) {
    $$('.relay-pill').forEach(function (p) {
      p.classList.toggle('hot', p.getAttribute('data-relay') === id);
    });
  }

  function formatBytes(value) {
    if (!isFinite(value) || value < 0) return '-';
    if (value < 1024) return Math.round(value) + ' B';
    if (value < 1024 * 1024) return (value / 1024).toFixed(1) + ' KB';
    return (value / (1024 * 1024)).toFixed(1) + ' MB';
  }

  function updateUsage() {
    if (!usageMemory) return;
    var perf = window.performance && window.performance.memory;
    if (perf && perf.usedJSHeapSize) {
      usageMemory.textContent = formatBytes(perf.usedJSHeapSize);
      if (usageMemoryNote) usageMemoryNote.textContent = 'Chromium-reported JavaScript heap in this tab; it changes as pages load.';
    } else {
      usageMemory.textContent = 'unavailable';
      if (usageMemoryNote) usageMemoryNote.textContent = 'This browser does not expose a live JavaScript heap metric.';
    }
  }

  function finishBoot() {
    if (!bootLoader) return;
    bootLoader.classList.add('done');
    bootLoader.setAttribute('aria-hidden', 'true');
    window.setTimeout(function () { if (bootLoader.parentNode) bootLoader.parentNode.removeChild(bootLoader); }, 700);
  }

  function initPointerLight() {
    var light = $('#pointerLight');
    if (!light || !window.matchMedia('(hover: hover) and (pointer: fine)').matches || reduceMotion) return;
    var pending = false;
    var x = 0;
    var y = 0;
    document.addEventListener('pointermove', function (event) {
      if (event.pointerType === 'touch') return;
      x = event.clientX;
      y = event.clientY;
      light.classList.add('is-active');
      if (pending) return;
      pending = true;
      requestAnimationFrame(function () {
        light.style.transform = 'translate3d(' + (x - 180) + 'px,' + (y - 180) + 'px,0)';
        pending = false;
      });
    }, { passive: true });
    document.addEventListener('pointerleave', function () { light.classList.remove('is-active'); });
  }

  function boot() {
    root.classList.add('app-ready');
    buildThemes();
    buildFilters();
    buildChain();
    renderLinks();
    bindStage();
    bindSettings();
    initTerms();
    updateUsage();
    if (usageRefresh) usageRefresh.addEventListener('click', updateUsage);
    bindKeys();
    initScroll();
    initReveal();
    initPointerLight();
    tickClock();
    setInterval(tickClock, 20000);

    var savedMode = 'proxy';
    try {
      var m = localStorage.getItem('sp.mode');
      if (m === 'direct' || m === 'tab' || m === 'proxy' || m === 'reader') savedMode = m;
    } catch (e) {}
    stageMode.value = savedMode;
    stageMode.addEventListener('change', function () {
      try { localStorage.setItem('sp.mode', stageMode.value); } catch (e) {}
    });

    if (location.hash === '#open' && homeInput) homeInput.focus();
    finishBoot();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
