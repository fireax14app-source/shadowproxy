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
    if (!/^[a-z][a-z0-9+.-]*:/i.test(raw) && /^[\w-]+(\.[\w-]+)+(:\d+)?([/?#][^\s]*)?$/.test(raw)) raw = 'https://' + raw;
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
  var stageReturnFocus = null;
  var stageInertState = null;

  function showStage() {
    var opening = !stage.classList.contains('on');
    if (opening) {
      stageReturnFocus = document.activeElement;
      stageInertState = [];
      Array.prototype.forEach.call(document.body.children, function (el) {
        if (el === stage || el === settingsPanel || el === tosGate || el.tagName === 'SCRIPT') return;
        stageInertState.push({ el: el, inert: el.hasAttribute('inert') });
        el.setAttribute('inert', '');
      });
    }
    stage.classList.add('on');
    stage.setAttribute('aria-hidden', 'false');
    stage.removeAttribute('inert');
    root.classList.add('locked');
    if (opening && stageAddr) stageAddr.focus();
  }

  function hideStage() {
    stage.classList.remove('on');
    stage.setAttribute('aria-hidden', 'true');
    stage.setAttribute('inert', '');
    if (stageInertState) {
      stageInertState.forEach(function (item) {
        if (!item.inert) item.el.removeAttribute('inert');
      });
      stageInertState = null;
    }
    if (!activeModal()) root.classList.remove('locked');
    if (stageReturnFocus && stageReturnFocus.isConnected && !activeModal()) stageReturnFocus.focus();
  }

  function renderTabs() {
    var hadFocus = stageTabsEl.contains(document.activeElement);
    stageTabsEl.innerHTML = '';
    tabs.forEach(function (t) {
      var el = document.createElement('div');
      el.className = 'stab' + (t.id === activeId ? ' on' : '');

      var select = document.createElement('button');
      select.type = 'button';
      select.className = 'stab-select';
      select.id = 'tab-' + t.id;
      select.setAttribute('role', 'tab');
      select.setAttribute('aria-selected', t.id === activeId ? 'true' : 'false');
      select.setAttribute('aria-controls', 'pane-' + t.id);
      select.tabIndex = t.id === activeId ? 0 : -1;

      if (t.url) {
        select.appendChild(favEl(t.url, 14));
      } else {
        var ph = document.createElement('span');
        ph.className = 'fav';
        ph.textContent = '·';
        select.appendChild(ph);
      }

      var label = document.createElement('b');
      label.textContent = t.title || 'New tab';
      select.appendChild(label);
      select.addEventListener('click', function () { activate(t.id); });
      select.addEventListener('keydown', function (e) {
        var index = tabs.indexOf(t);
        var nextIndex = index;
        if (e.key === 'ArrowRight') nextIndex = (index + 1) % tabs.length;
        else if (e.key === 'ArrowLeft') nextIndex = (index + tabs.length - 1) % tabs.length;
        else if (e.key === 'Home') nextIndex = 0;
        else if (e.key === 'End') nextIndex = tabs.length - 1;
        else return;
        e.preventDefault();
        var next = tabs[nextIndex];
        activate(next.id);
        var nextButton = stageTabsEl.querySelector('#tab-' + next.id);
        if (nextButton) nextButton.focus();
      });

      var x = document.createElement('button');
      x.type = 'button';
      x.className = 'x';
      x.textContent = '×';
      x.setAttribute('aria-label', 'Close ' + (t.title || 'New tab'));
      x.addEventListener('click', function () { closeTab(t.id); });

      el.appendChild(select);
      el.appendChild(x);
      stageTabsEl.appendChild(el);
    });
    if (hadFocus && activeId) {
      var focused = stageTabsEl.querySelector('#tab-' + activeId);
      if (focused) focused.focus();
    }
  }

  function activate(id) {
    activeId = id;
    tabs.forEach(function (t) {
      if (t.pane) t.pane.classList.toggle('on', t.id === id);
    });
    var t = tabById(id);
    if (t) {
      stageAddr.value = t.url || '';
      if (t.status === 'direct') setRelayChip('direct · bypasses server');
      else if (t.status === 'failed') setRelayChip('server failed', 'bad');
      else if (t.status === 'stopped') setRelayChip('stopped');
      else if (t.status === 'routing') setRelayChip('routing…');
      else setRelayChip(t.via ? 'via ' + t.via : 'server idle', t.via ? 'ok' : '');
      if (t.pane) t.pane.querySelector('.blank').classList.toggle('on', !t.url);
    }
    renderTabs();
  }

  function ensurePane(t) {
    if (t.pane) return t.pane;

    var pane = document.createElement('div');
    pane.className = 'pane';
    pane.id = 'pane-' + t.id;
    pane.setAttribute('role', 'tabpanel');
    pane.setAttribute('aria-labelledby', 'tab-' + t.id);
    pane.innerHTML =
      '<div class="pane-top">' +
        '<span class="relay-chip">server</span>' +
        '<span class="pane-url"></span>' +
        '<span class="grow"></span>' +
        '<button type="button" data-act="back" title="Back" aria-label="Back">←</button>' +
        '<button type="button" data-act="forward" title="Forward" aria-label="Forward">→</button>' +
        '<button type="button" data-act="cancel">Stop</button>' +
        '<button type="button" data-act="reload">Reload page</button>' +

        '<button type="button" data-act="direct">Direct</button>' +
        '<button type="button" data-act="open">Open</button>' +
      '</div>' +
      '<div class="loader"></div>' +
      '<iframe class="frame" referrerpolicy="no-referrer" title="ShadowProxy view"></iframe>' +
      '<div class="blank"><div><b>Ready when you are</b><span>Paste a public page address above, then choose Open page.</span></div></div>' +
      '<div class="errbox"><div class="errcard"><h3>We could not open this page here</h3><p class="errmsg"></p>' +
        '<div class="row">' +
          '<button class="btn accent" type="button" data-act="retry">Retry server route</button>' +
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
    var entry = { url: url, mode: mode === 'direct' ? 'direct' : 'proxy' };
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
    t.mode = mode === 'direct' ? 'direct' : 'proxy';
    t.status = 'routing';
    t.title = prettyHost(url);
    t.via = null;

    ensurePane(t);
    showStage();
    activate(t.id);
    stageAddr.value = url;
    updateHistoryButtons(t);

    if (t.mode === 'direct') loadDirect(t, url);
    else loadProxy(t, url);
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
    t.frame.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-forms allow-popups allow-modals allow-downloads');
    t.frame.onload = function () {
      if (t.destroyed || t.req !== my) return;
      clearTimeout(t.directTimer);
      t.status = 'direct';
      t.loaderEl.classList.remove('on');
      t.pane.classList.remove('loading');
      setTabStatus(t, 'direct · frame attempted');
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

  async function loadProxy(t, url) {
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
      if (location.protocol === 'file:') throw new Error('Server routing needs the deployed Vercel app. Open the online version instead.');
      var response = await fetch('/api/route', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url }),
        signal: ctrl.signal
      });
      if (!response.ok) throw new Error((await response.text()).slice(0, 200) || 'Server refused the address');
      var res = await response.json();
      if (!res.path || !/^\/r\/[A-Za-z0-9_-]+$/.test(res.path)) throw new Error('Invalid server route');
      if (t.destroyed || t.req !== my) return;
      t.frame.removeAttribute('srcdoc');
      t.frame.setAttribute('sandbox', 'allow-popups');
      t.frame.src = res.path;
      updateHistoryButtons(t);
      t.via = 'Vercel';
      t.status = 'loaded';
      t.loaderEl.classList.remove('on');
      t.pane.classList.remove('loading');
      setTabStatus(t, 'via Vercel', 'ok');
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
      setTabStatus(t, 'server failed', 'bad');
      try { console.warn('[shadowproxy] load failed', url, err && err.message); } catch (x) {}
    } finally {
      if (t.ctrl === ctrl) t.ctrl = null;
    }
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
      var popup = window.open('about:blank', '_blank');
      if (popup) {
        popup.opener = null;
        popup.location.replace(destination);
        toast('Cloak opened ' + prettyHost(destination));
      } else {
        toast('Popup blocked - opening the selected cloak site here');
        window.location.assign(destination);
      }
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

  var modalInertState = null;
  var settingsReturnFocus = null;
  var termsReturnFocus = null;

  function activeModal() {
    if (tosGate && tosGate.classList.contains('on')) return tosGate;
    if (settingsPanel && settingsPanel.classList.contains('on')) return settingsPanel;
    return null;
  }

  function syncModalInert() {
    var modal = activeModal();
    if (modal && !modalInertState) {
      modalInertState = [];
      Array.prototype.forEach.call(document.body.children, function (el) {
        if (el === settingsPanel || el === tosGate || el.tagName === 'SCRIPT') return;
        modalInertState.push({ el: el, inert: el.hasAttribute('inert') });
        el.setAttribute('inert', '');
      });
    } else if (!modal && modalInertState) {
      modalInertState.forEach(function (item) {
        if (!item.inert) item.el.removeAttribute('inert');
      });
      modalInertState = null;
    }
    if (settingsPanel) {
      if (modal && modal !== settingsPanel) settingsPanel.setAttribute('inert', '');
      else settingsPanel.removeAttribute('inert');
    }
    if (tosGate) {
      if (modal && modal !== tosGate) tosGate.setAttribute('inert', '');
      else tosGate.removeAttribute('inert');
    }
  }

  function toggleSettings(open) {
    var visible = !!open;
    if (!settingsPanel) return;
    if (visible) settingsReturnFocus = document.activeElement;
    settingsPanel.classList.toggle('on', visible);
    settingsPanel.setAttribute('aria-hidden', visible ? 'false' : 'true');
    syncModalInert();
    if (visible) {
      root.classList.add('locked');
      if (settingsInput) { settingsInput.value = getCloakUrl(); settingsInput.focus(); settingsInput.select(); }
    } else {
      if (!activeModal() && !stage.classList.contains('on')) root.classList.remove('locked');
      if (settingsReturnFocus && settingsReturnFocus.isConnected) settingsReturnFocus.focus();
    }
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
      syncModalInert();
      if (!activeModal() && !stage.classList.contains('on')) root.classList.remove('locked');
      if (termsReturnFocus && termsReturnFocus.isConnected && termsReturnFocus !== document.body) termsReturnFocus.focus();
      else if (stage.classList.contains('on')) stageAddr.focus();
      else homeInput.focus();
    });
    if (tosGate && tosGate.classList.contains('on')) root.classList.add('locked');
    document.addEventListener('keydown', function (e) {
      var modal = activeModal();
      if (!modal) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopImmediatePropagation();
        if (modal === settingsPanel) toggleSettings(false);
        return;
      }
      if (e.key !== 'Tab') return;
      var focusable = Array.prototype.filter.call(
        modal.querySelectorAll('a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])'),
        function (el) { return el.getClientRects().length > 0; }
      );
      if (!focusable.length) { e.preventDefault(); return; }
      var first = focusable[0];
      var last = focusable[focusable.length - 1];
      if (!modal.contains(document.activeElement)) { e.preventDefault(); first.focus(); }
      else if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });
  }

  function showTerms() {
    if (!tosGate) return;
    termsReturnFocus = document.activeElement;
    tosGate.classList.add('on');
    tosGate.setAttribute('aria-hidden', 'false');
    root.classList.add('locked');
    syncModalInert();
    if (tosAccept) tosAccept.focus();
  }

  function initTerms() {
    var accepted = false;
    try { accepted = localStorage.getItem('sp.tosAccepted') === '1'; } catch (e) {}
    if (accepted && tosGate) {
      tosGate.classList.remove('on');
      tosGate.setAttribute('aria-hidden', 'true');
      if (!stage.classList.contains('on')) root.classList.remove('locked');
      syncModalInert();
    } else if (tosGate) showTerms();
  }

  function bindStage() {
    $('#stageBack').addEventListener('click', function () {
      hideStage();
      setRelayChip('server idle');
    });

    $('#stageClose').addEventListener('click', function () {
      hideStage();
      setRelayChip('server idle');
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
      if (activeModal()) return;
      var tag = (e.target && e.target.tagName || '').toLowerCase();
      var typing = tag === 'input' || tag === 'textarea' || tag === 'select';

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

  function buildChain() {
    var row = $('#chainRow');
    if (!row) return;
    row.textContent = 'Browser → Vercel → public page';
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
      if (m === 'direct' || m === 'tab' || m === 'proxy') savedMode = m;
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
