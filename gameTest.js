document.addEventListener("DOMContentLoaded", () => {
  const canvas = document.getElementById("game");
  if (!canvas) return;

  // Embed mode tracks whether the canvas was originally inside a wrap container
  // (vs. directly in body or somewhere unwrapped). _hasWrap is the static fact;
  // embedMode is the dynamic state — it can flip to fullscreen on mobile-landscape
  // and back to embedded on portrait.
  const _wrap = canvas.parentElement;
  const _hasWrap = !!(_wrap && _wrap !== document.body);

  function _isMobileNow() {
    // Only treat as "mobile" if the DEVICE screen (not browser window) is phone-sized.
    // Otherwise touchscreen laptops or narrow desktop browsers would trigger the
    // landscape-fullscreen flip and break the embed.
    const coarsePointer = window.matchMedia("(pointer: coarse)").matches;
    const smallScreen = Math.min(
      (window.screen && window.screen.width) || 9999,
      (window.screen && window.screen.height) || 9999
    ) <= 768;
    return coarsePointer && smallScreen;
  }
  function _isPortraitNow() {
    return window.innerHeight > window.innerWidth;
  }
  // Mobile + landscape on an embedded page → switch to fullscreen for playability.
  // Portrait or desktop → keep the embedded layout.
  function _shouldEmbed() {
    if (!_hasWrap) return false;
    return !( _isMobileNow() && !_isPortraitNow() );
  }
  let embedMode = _shouldEmbed();

  if (!embedMode) {
    // Standalone fullscreen: hoist canvas to body so position:fixed always
    // references the real viewport (Webflow containers with CSS transforms
    // break fixed-positioning on descendants).
    if (canvas.parentElement !== document.body) document.body.appendChild(canvas);
    canvas.style.zIndex = '9999';
  }

  // Portrait-rotation overlay — shown on mobile portrait in any mode.
  // _updateRotateOverlay() auto-hides it on desktop or landscape.
  let _rotateEl = document.getElementById('nn-rotate-overlay');
  if (!_rotateEl) {
    if (!document.getElementById('nn-rotate-style')) {
      const rs = document.createElement('style');
      rs.id = 'nn-rotate-style';
      rs.textContent = '@keyframes nnRotatePhone{0%,35%{transform:rotate(0deg)}55%,80%{transform:rotate(90deg)}100%{transform:rotate(0deg)}}';
      document.head.appendChild(rs);
    }
    _rotateEl = document.createElement('div');
    _rotateEl.id = 'nn-rotate-overlay';
    _rotateEl.style.cssText = 'display:none;position:fixed;inset:0;z-index:10001;background:#020712;flex-direction:column;align-items:center;justify-content:center;gap:20px;padding:32px;box-sizing:border-box;font-family:system-ui,sans-serif;color:#cdeeff;text-align:center;';
    _rotateEl.innerHTML = '<div style="font-size:64px;animation:nnRotatePhone 2.2s ease-in-out infinite;line-height:1">📱</div>'
      + '<h2 style="margin:0;font-size:18px;font-weight:700;color:#eaf6ff;letter-spacing:.04em">Bitte Handy drehen</h2>'
      + '<p style="margin:0;font-size:14px;color:rgba(140,200,230,.75);line-height:1.5">Jumping Nexus läuft<br>am besten quer im Vollbildmodus.</p>';
    document.body.appendChild(_rotateEl);
  }
  // Gate the rotate overlay so it only appears after the user has tapped
  // the splash. Once the user reaches landscape orientation once, the hint
  // is suppressed forever — they've seen it, no need to nag if they rotate
  // back to portrait to scroll the page.
  let _splashDismissed = false;
  let _landscapeReached = false;
  function _updateRotateOverlay() {
    if (!_rotateEl) return;
    const isPortrait = window.innerHeight > window.innerWidth;
    if (!isPortrait) _landscapeReached = true;
    let show = false;
    if (_splashDismissed && !_landscapeReached && isPortrait) {
      show = window.matchMedia('(pointer:coarse)').matches;
    }
    _rotateEl.style.display = show ? 'flex' : 'none';
    if (show) { _musicPause(); } else { _musicResume(); }
  }

  // ── Pre-load splash screen ───────────────────────────────────
  let _splashEl = document.createElement('div');
  // In embed mode the splash overlays only the wrap; standalone covers the viewport.
  const _splashPos = embedMode ? 'absolute' : 'fixed';
  _splashEl.style.cssText =
    `position:${_splashPos};inset:0;z-index:10000;` +
    'background:#020712 url("https://cdn.jsdelivr.net/gh/NexusNovaPatrickDause/JumpingNexus@main/startscreen.png") center/cover no-repeat;' +
    'cursor:pointer;-webkit-tap-highlight-color:transparent;';
  if (embedMode) {
    // Need a positioning context on the wrap so position:absolute is bounded by it
    if (getComputedStyle(_wrap).position === 'static') _wrap.style.position = 'relative';
    _wrap.appendChild(_splashEl);
  } else {
    document.body.appendChild(_splashEl);
  }

  function _dismissSplash() {
    if (!_splashEl) return;
    const el = _splashEl;
    _splashEl = null;
    el.style.transition = 'opacity .45s ease';
    el.style.opacity = '0';
    setTimeout(() => { try { el.remove(); } catch (_) {} }, 500);
    // Request real browser fullscreen on mobile (hides URL bar / tabs).
    // On standalone (no wrap) we always go fullscreen too.
    // Desktop with wrap stays embedded — no fullscreen API call.
    if (!_hasWrap || _isMobileNow()) {
      try { document.documentElement.requestFullscreen?.().catch(() => {}); } catch (_) {}
    }
    // Now the rotate overlay is allowed to appear (only on mobile portrait)
    _splashDismissed = true;
    _updateRotateOverlay();
    if (!audio.musicEnabled) audioToggleMusic();
  }
  _splashEl.addEventListener('click', _dismissSplash);
  _splashEl.addEventListener('touchend', function(e) { e.preventDefault(); _dismissSplash(); }, { passive: false });

  canvas.style.webkitTapHighlightColor = "transparent";
  canvas.style.webkitTouchCallout = "none";
  canvas.style.webkitUserSelect = "none";
  canvas.style.userSelect = "none";
  if (!embedMode) canvas.style.touchAction = "none";
  canvas.style.outline = "none";
  if (!embedMode) {
    if (document.body) {
      document.body.style.webkitTapHighlightColor = "transparent";
      document.body.style.webkitUserSelect = "none";
      document.body.style.userSelect = "none";
    }
    document.documentElement.style.webkitTapHighlightColor = "transparent";
    document.documentElement.style.webkitUserSelect = "none";
    document.documentElement.style.userSelect = "none";
    document.documentElement.style.touchAction = "none";
  }

  if (!embedMode && !document.querySelector("style[data-nn-touch]")) {
    const style = document.createElement("style");
    style.dataset.nnTouch = "true";
    style.textContent = [
      "html, body {",
      "  -webkit-tap-highlight-color: transparent;",
      "  -webkit-user-select: none;",
      "  user-select: none;",
      "  -webkit-touch-callout: none;",
      "  touch-action: none;",
      "}",
      "canvas {",
      "  -webkit-tap-highlight-color: transparent;",
      "  -webkit-user-select: none;",
      "  user-select: none;",
      "  -webkit-touch-callout: none;",
      "  touch-action: none;",
      "  image-rendering: pixelated;",
      "  image-rendering: crisp-edges;",
      "}",
    ].join("\n");
    document.head.appendChild(style);
  }

  const ctx = canvas.getContext("2d", { alpha: true });
  const WORLD_W = 1200;
  const WORLD_H = 600;
  let viewW = 0;
  let viewH = 0;
  let viewScale = 1;
  let viewOffsetX = 0;
  let viewOffsetY = 0;
  let dpr = 1;
  // Declared early to avoid TDZ when resizeCanvas → _updateRotateOverlay → _musicPause/Resume runs
  let _musEl = null, _musOut = null, _musIn = null;

  function isMobile() {
    return window.matchMedia("(pointer: coarse)").matches
        && window.matchMedia("(max-width: 1024px)").matches;
  }
  function isPortrait() {
    return window.innerHeight > window.innerWidth;
  }
  let mobileScale = isMobile() ? 1.7 : 1;
  let perfMode = isMobile();
  let _gameOverLockTimer = 0;
  let _firstTapDone = false;
  const FONT_LINK =
    "https://fonts.googleapis.com/css2?family=Press+Start+2P&family=Source+Sans+3:wght@400;600&display=swap";
  if (!document.querySelector('link[data-jumping-font]')) {
    const fontLink = document.createElement("link");
    fontLink.rel = "stylesheet";
    fontLink.href = FONT_LINK;
    fontLink.dataset.jumpingFont = "true";
    document.head.appendChild(fontLink);
  }
  // PRIMARY_FONT (Press Start 2P) → Titles, score, game over, short button labels
  // SECONDARY_FONT (Source Sans 3) → Body text, boss descriptions, long labels
  const PRIMARY_FONT = "'Press Start 2P', monospace";
  const SECONDARY_FONT = "'Source Sans 3', 'Source Sans Pro', sans-serif";
  const BOSS_STORY_FONT_SIZE = 20; // adjust here to change boss description text size
  const SIZE_SCALE = 0.75;
  const PROJECTILE_SPEED_SCALE = 0.75;
  const PIPE_GAP_SCALE = 1.3;
  const PIPE_SPAWN_INTERVAL = 2.5;
  const BOSS_X_BASE = WORLD_W - 100;
  const BOSS_X_WOBBLE = 32;
  const BUG_PROJECTILE_SIZE = 56;
  const BIG_BUG_PROJECTILE_SIZE = 96;
  const BUG_BOMB_HP = 3;
  const HIGHLIGHT_PREFIX = "NN-";
  const HIGHLIGHT_COLORS = ["#5099C9", "#2E3E59", "#AFDCF1"];
  const HIGHLIGHT_PREFIX_ALT = "NN";
  const BAD_WORDS = [
    "fuck",
    "shit",
    "asshole",
    "bitch",
    "cunt",
    "dick",
    "penis",
    "vagina",
    "pussy",
    "arse",
    "arsch",
    "arschloch",
    "fotze",
    "hurensohn",
    "hurensoohn",
    "wichser",
    "scheisse",
    "scheiße",
    "spast",
    "spasti",
    "mongo",
    "penner",
    "opfer",
    "hitler",
    "adolf",
    "putin",
    "antisemitismus",
    "antisemitissmus",
    "nazi",
    "cock",
    "bastard",
    "whore",
    "mistgeburt",
    "schlampe",
    "asozial",
    "dildo",
    "fag",
    "faggot",
    "fick",
    "hurensoehn",
    "idiot",
    "kacke",
    "kacker",
    "kanker",
    "kike",
    "nutte",
    "pimmel",
    "rape",
    "rapist",
    "schwuchtel",
    "spacko",
    "wixxer",
    "zigeuner",
  ];
  const MAX_NAME_LENGTH = 16;
  let playerName = "";
  let nameOverlay = null;
  let nameInput = null;
  let nameErrorLabel = null;

  function resizeCanvas() {
    const rawDpr = Math.max(1, window.devicePixelRatio || 1);
    // Cap DPR at 2 on mobile — 3× DPR means 9× pixels vs 1×, kills mobile GPUs.
    // DPR=2 is visually indistinguishable for a pixel-art game at this scale.
    dpr = isMobile() ? Math.min(2, rawDpr) : rawDpr;

    if (embedMode) {
      // Use the wrap container's actual rendered size — the page CSS controls layout
      const rect = _wrap.getBoundingClientRect();
      viewW = Math.max(1, rect.width);
      viewH = Math.max(1, rect.height);
      // Don't override the canvas style — wrap CSS already sets width/height to 100%
    } else {
      // Standalone fullscreen: fill the real viewport
      viewW = window.innerWidth;
      viewH = window.innerHeight;
      // Force canvas CSS — use setAttribute so !important overrides any Webflow rule
      canvas.setAttribute('style',
        `position:fixed!important;top:0!important;left:0!important;` +
        `width:${viewW}px!important;height:${viewH}px!important;` +
        `z-index:9999!important;background:#02050c;` +
        `touch-action:none;-webkit-tap-highlight-color:transparent;` +
        `-webkit-user-select:none;user-select:none;outline:none;`
      );
    }
    _updateRotateOverlay();

    canvas.width = Math.round(viewW * dpr);
    canvas.height = Math.round(viewH * dpr);

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    window.__NN_W = viewW;
    window.__NN_H = viewH;

    if (isMobile()) {
      // Fill full screen width — no side letterbox bars on tall phones (iPhone 14 etc.).
      // Top/bottom may clip by ~16px which is acceptable at WORLD_H/2 player center.
      viewScale = viewW / WORLD_W;
      viewOffsetX = 0;
      viewOffsetY = (viewH - WORLD_H * viewScale) / 2;
    } else {
      viewScale = Math.min(viewW / WORLD_W, viewH / WORLD_H);
      viewOffsetX = (viewW - WORLD_W * viewScale) / 2;
      viewOffsetY = (viewH - WORLD_H * viewScale) / 2;
    }

    // Target: HUD text ≈ real screen pixels regardless of viewScale.
    // Formula: 1.0/viewScale makes world-px × viewScale = 1 screen-px per base-px.
    // Clamped 1.7–2.2 so it doesn't blow up on portrait or tiny viewports.
    mobileScale = isMobile() ? Math.max(1.7, Math.min(2.2, 1.0 / viewScale)) : 1.0;
    perfMode = isMobile();
  }

  // Dynamic layout: on mobile, an embedded canvas switches to fullscreen on
  // landscape orientation and snaps back to embedded on portrait.
  function _applyLayoutMode() {
    if (!_hasWrap) return; // standalone always fullscreen — no flipping
    const wantEmbed = _shouldEmbed();
    if (wantEmbed === embedMode) return;
    embedMode = wantEmbed;
    if (embedMode) {
      // Embedded: move canvas back to wrap, reset styles, allow page scroll
      try { _wrap.appendChild(canvas); } catch (_) {}
      canvas.setAttribute('style',
        'width:100%;height:100%;display:block;cursor:pointer;outline:none;' +
        '-webkit-tap-highlight-color:transparent;-webkit-user-select:none;user-select:none;'
      );
      if (document.body) document.body.style.touchAction = '';
      document.documentElement.style.touchAction = '';
      // Move splash overlay back into the wrap if it's still on screen
      if (_splashEl && _splashEl.parentElement !== _wrap) {
        _splashEl.style.position = 'absolute';
        if (getComputedStyle(_wrap).position === 'static') _wrap.style.position = 'relative';
        _wrap.appendChild(_splashEl);
      }
      // Returning to embedded view (e.g. mobile rotate-back to portrait):
      // mute music so it doesn't keep playing while the user is back on
      // the surrounding webpage.
      if (audio.musicEnabled) audioToggleMusic();
    } else {
      // Fullscreen: hoist to body, lock body scroll
      document.body.appendChild(canvas);
      if (document.body) document.body.style.touchAction = 'none';
      document.documentElement.style.touchAction = 'none';
      // Canvas style is reset every frame by resizeCanvas in fullscreen mode
      // Move splash overlay to body so it covers the viewport
      if (_splashEl && _splashEl.parentElement !== document.body) {
        _splashEl.style.position = 'fixed';
        document.body.appendChild(_splashEl);
      }
    }
    resizeCanvas();
  }

  window.addEventListener("resize", () => { _applyLayoutMode(); resizeCanvas(); });
  window.addEventListener("orientationchange", () => { _applyLayoutMode(); resizeCanvas(); _updateRotateOverlay(); });
  // Also react to the wrap container itself resizing (responsive page layouts)
  if (_hasWrap && typeof ResizeObserver !== "undefined") {
    try { new ResizeObserver(() => resizeCanvas()).observe(_wrap); } catch (_) {}
  }
  _applyLayoutMode();
  resizeCanvas();

  // ── WebAudio SFX ──────────────────────────────────────────────────────────
  let audioCtx = null;
  function getAudioCtx() {
    if (!audioCtx) {
      try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {}
    }
    if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
    return audioCtx;
  }
  function _tone(freq, type, dur, g0, g1, t0) {
    const ac = getAudioCtx(); if (!ac) return;
    const now = t0 !== undefined ? t0 : ac.currentTime;
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.connect(gain); gain.connect(ac.destination);
    osc.type = type; osc.frequency.setValueAtTime(freq, now);
    gain.gain.setValueAtTime(g0, now);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, g1), now + dur);
    osc.start(now); osc.stop(now + dur + 0.02);
  }
  let _sfxJumpLastMs = 0;
  function sfxJump() {
    if (!audio.sfxEnabled) return;
    const now = performance.now();
    if (now - _sfxJumpLastMs < 80) return;
    _sfxJumpLastMs = now;
    const ac = getAudioCtx(); if (!ac) return;
    _tone(260, 'square', 0.07, 0.1, 0.001);
    _tone(400, 'sine', 0.09, 0.07, 0.001, ac.currentTime + 0.035);
  }
  function sfxHit() {
    if (!audio.sfxEnabled) return;
    const ac = getAudioCtx(); if (!ac) return;
    _tone(110, 'sawtooth', 0.18, 0.22, 0.001);
    _tone(75, 'square', 0.14, 0.16, 0.001, ac.currentTime + 0.06);
  }
  function sfxPickup() {
    if (!audio.sfxEnabled) return;
    const ac = getAudioCtx(); if (!ac) return;
    const t = ac.currentTime;
    [440, 550, 700].forEach((f, i) => _tone(f, 'sine', 0.11, 0.09, 0.001, t + i * 0.055));
  }
  function sfxBossDeath() {
    if (!audio.sfxEnabled) return;
    const ac = getAudioCtx(); if (!ac) return;
    const t = ac.currentTime;
    const osc = ac.createOscillator(); const g = ac.createGain();
    osc.connect(g); g.connect(ac.destination);
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(200, t); osc.frequency.exponentialRampToValueAtTime(28, t + 0.9);
    g.gain.setValueAtTime(0.28, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.9);
    osc.start(t); osc.stop(t + 0.95);
    _tone(1000, 'sine', 0.35, 0.14, 0.001, t);
    _tone(500, 'sine', 0.5, 0.1, 0.001, t + 0.1);
  }
  function sfxShoot() {
    if (!audio.sfxEnabled) return;
    _tone(580, 'square', 0.045, 0.065, 0.001);
  }
  // ──────────────────────────── MUSIC SYSTEM ──────────────────────────────────
  const audio = {
    musicEnabled: false,
    sfxEnabled: false,
    musicVolume: 0.65,
    _pendingPlay: null,
    _titleIdx: 0,
    _mainThemeIdx: 0,
    tracks: {
      titleScreen:   ['https://cdn.jsdelivr.net/gh/NexusNovaPatrickDause/JumpingNexus@main/assets/audio/title-screen-01.mp3', 'https://cdn.jsdelivr.net/gh/NexusNovaPatrickDause/JumpingNexus@main/assets/audio/title-screen-02.mp3'],
      mainTheme:     ['https://cdn.jsdelivr.net/gh/NexusNovaPatrickDause/JumpingNexus@main/assets/audio/main-theme-01.mp3', 'https://cdn.jsdelivr.net/gh/NexusNovaPatrickDause/JumpingNexus@main/assets/audio/main-theme-02.mp3', 'https://cdn.jsdelivr.net/gh/NexusNovaPatrickDause/JumpingNexus@main/assets/audio/main-theme-03.mp3', 'https://cdn.jsdelivr.net/gh/NexusNovaPatrickDause/JumpingNexus@main/assets/audio/main-theme-04.mp3', 'https://cdn.jsdelivr.net/gh/NexusNovaPatrickDause/JumpingNexus@main/assets/audio/main-theme-05.mp3'],
      preFinalBoss:  ['https://cdn.jsdelivr.net/gh/NexusNovaPatrickDause/JumpingNexus@main/assets/audio/pre-final-boss.mp3'],
      bossEncounter: ['https://cdn.jsdelivr.net/gh/NexusNovaPatrickDause/JumpingNexus@main/assets/audio/boss-encounter-01.mp3', 'https://cdn.jsdelivr.net/gh/NexusNovaPatrickDause/JumpingNexus@main/assets/audio/boss-encounter-02.mp3', 'https://cdn.jsdelivr.net/gh/NexusNovaPatrickDause/JumpingNexus@main/assets/audio/boss-encounter-03.mp3', 'https://cdn.jsdelivr.net/gh/NexusNovaPatrickDause/JumpingNexus@main/assets/audio/boss-encounter-04.mp3', 'https://cdn.jsdelivr.net/gh/NexusNovaPatrickDause/JumpingNexus@main/assets/audio/boss-encounter-05.mp3'],
      nnAnthem:      ['https://cdn.jsdelivr.net/gh/NexusNovaPatrickDause/JumpingNexus@main/assets/audio/nn-anthem.mp3'],
    },
  };
  // _musEl, _musOut, _musIn declared near top of scope (above resizeCanvas call)
  let _musKey = null;     // active track key

  function audioLoad() {
    try {
      const s = JSON.parse(localStorage.getItem('jumping-nexus-audio') || '{}');
      audio.musicEnabled = false; // always start muted — user opts in via ♪ button
      audio.sfxEnabled = s.sfx === true;
    } catch (e) {}
  }

  function audioSave() {
    try { localStorage.setItem('jumping-nexus-audio', JSON.stringify({ music: audio.musicEnabled, sfx: audio.sfxEnabled })); } catch (e) {}
  }

  function _pickTrack(key) {
    const list = audio.tracks[key];
    if (!list || !list.length) return null;
    if (key === 'titleScreen') { const url = list[audio._titleIdx % list.length]; audio._titleIdx++; return url; }
    if (key === 'mainTheme')   return list[audio._mainThemeIdx % list.length];
    if (key === 'bossEncounter') return list[Math.floor(Math.random() * list.length)];
    return list[0];
  }

  function _musicPlay(key) {
    if (!audio.musicEnabled) { audio._pendingPlay = key; return; }
    if (_musKey === key && _musEl && !_musEl.paused) return;
    const url = _pickTrack(key);
    if (!url) return;

    // Fade out current (sequential: new track starts in onDone)
    function _startNew() {
      const el = new Audio(url);
      el.loop = true; el.volume = 0;
      el.play().catch(() => {
        // Track failed to load — fall back to first track in the list
        const list = audio.tracks[key];
        if (list && list.length && url !== list[0]) {
          const fb = new Audio(list[0]);
          fb.loop = true; fb.volume = 0;
          fb.play().catch(() => {});
          _musEl = fb;
          if (_musIn) _musIn.el = fb;
        }
      });
      _musEl = el; _musKey = key;
      _musIn = { el, to: audio.musicVolume, dur: 0.4, elapsed: 0 };
    }

    if (_musEl) {
      const dying = _musEl;
      _musEl = null; _musKey = null; _musIn = null;
      _musOut = { el: dying, from: dying.volume, dur: 0.3, elapsed: 0, onDone: () => {
        try { dying.pause(); dying.src = ''; } catch (e) {}
        _startNew();
      }};
    } else {
      _startNew();
    }
  }

  function _musicStop(fadeDur) {
    if (!_musEl) return;
    const dying = _musEl;
    _musEl = null; _musKey = null; _musIn = null;
    const fd = fadeDur !== undefined ? fadeDur : 0.35;
    _musOut = { el: dying, from: dying.volume, dur: fd, elapsed: 0, onDone: () => {
      try { dying.pause(); dying.src = ''; } catch (e) {}
    }};
  }

  function _musicPause() {
    if (_musEl && !_musEl.paused) { _musEl.pause(); _musEl._paused = true; }
  }

  function _musicResume() {
    if (_musEl && _musEl._paused) { _musEl.play().catch(() => {}); _musEl._paused = false; }
  }

  function _musicUpdate(rawDt) {
    if (_musOut) {
      _musOut.elapsed += rawDt;
      const t = _musOut.dur > 0 ? Math.min(1, _musOut.elapsed / _musOut.dur) : 1;
      try { _musOut.el.volume = Math.max(0, _musOut.from * (1 - t)); } catch (e) {}
      if (t >= 1) { const done = _musOut.onDone; _musOut = null; if (done) done(); }
    }
    if (_musIn) {
      _musIn.elapsed += rawDt;
      const t = _musIn.dur > 0 ? Math.min(1, _musIn.elapsed / _musIn.dur) : 1;
      try { _musIn.el.volume = Math.min(audio.musicVolume, _musIn.to * t); } catch (e) {}
      if (t >= 1) _musIn = null;
    }
  }

  function audioToggleMusic() {
    audio.musicEnabled = !audio.musicEnabled;
    audioSave();
    if (!audio.musicEnabled) {
      _musicStop(0.25);
    } else {
      if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
      const key = audio._pendingPlay || (!gameRunning && !gameOver ? 'titleScreen' : pendingBossId === 6 ? 'preFinalBoss' : inBossFight ? 'bossEncounter' : gameRunning ? 'mainTheme' : 'titleScreen');
      audio._pendingPlay = null;
      _musicPlay(key);
    }
  }

  function audioToggleSfx() {
    audio.sfxEnabled = !audio.sfxEnabled;
    audioSave();
  }
  // ──────────────────────────────────────────────────────────────────────────

  function beginFrame() {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.imageSmoothingEnabled = false;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.translate(viewOffsetX, viewOffsetY);
    ctx.scale(viewScale, viewScale);
    // Screen shake offset (integers only to avoid sub-pixel shimmer)
    if (shakeMag > 0.1) ctx.translate(Math.round(shakeX), Math.round(shakeY));
  }

  function endFrame() {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }

  function loadImage(src) {
    const img = new Image();
    img.src = src;
    return img;
  }

  function normalizeLeet(input) {
    return input
      .replace(/[@]/g, "a")
      .replace(/[4]/g, "a")
      .replace(/[3]/g, "e")
      .replace(/[1!|]/g, "i")
      .replace(/[0]/g, "o")
      .replace(/[5\$]/g, "s")
      .replace(/[7]/g, "t")
      .replace(/[8]/g, "b")
      .replace(/[9]/g, "g");
  }

  function sanitizeName(raw) {
    if (!raw) return "";
    let cleaned = String(raw)
      .replace(/[\u0000-\u001f]/g, "")
      .replace(/\s+/g, " ")
      .trim();
    if (!cleaned) return "";
    cleaned = cleaned.substring(0, MAX_NAME_LENGTH);
    const normalized = cleaned.toLowerCase();
    const compact = normalized.replace(/[^a-z0-9]/g, "");
    const deLeet = normalizeLeet(compact);
    if (cleaned.length < 2) return "";
    if (BAD_WORDS.some(bad => normalized.includes(bad))) return "";
    if (BAD_WORDS.some(bad => compact.includes(bad))) return "";
    if (BAD_WORDS.some(bad => deLeet.includes(bad))) return "";
    return cleaned;
  }

  function pickHighlightColor() {
    const idx = Math.floor(Math.random() * HIGHLIGHT_COLORS.length);
    return HIGHLIGHT_COLORS[idx];
  }

  function getHighlightInfo(name) {
    const raw = (name || "").trim();
    if (!raw) return { isHighlight: false, displayName: "" };
    if (raw.startsWith(HIGHLIGHT_PREFIX)) {
      return { isHighlight: true, displayName: raw.slice(HIGHLIGHT_PREFIX.length).trim() };
    }
    if (raw.startsWith(`${HIGHLIGHT_PREFIX_ALT} `)) {
      return { isHighlight: true, displayName: raw.slice(HIGHLIGHT_PREFIX_ALT.length).trim() };
    }
    if (raw.startsWith(HIGHLIGHT_PREFIX_ALT) && raw.length > HIGHLIGHT_PREFIX_ALT.length) {
      return { isHighlight: true, displayName: raw.slice(HIGHLIGHT_PREFIX_ALT.length).trim() };
    }
    return { isHighlight: false, displayName: raw };
  }

  function getLeaderboardEntryStyle(entry) {
    const name = entry && entry.name ? entry.name : "";
    const info = getHighlightInfo(name);
    if (info.isHighlight) {
      if (entry && !entry.highlightColor) {
        entry.highlightColor = pickHighlightColor();
      }
      return {
        displayName: info.displayName || "Spieler",
        color: entry && entry.highlightColor ? entry.highlightColor : pickHighlightColor(),
      };
    }
    return { displayName: name || "Spieler", color: null };
  }

  function persistPlayerName(name) {
    playerName = name;
    try {
      localStorage.setItem("jumping-nexus-player-name", playerName);
    } catch (_) {
      /* ignore storage errors */
    }
    if (nameInput) nameInput.value = playerName;
    if (playerName) {
      hideNameOverlay();
    }
  }

  function ensureNameOverlay() {
    if (nameOverlay) return;
    nameOverlay = document.createElement("div");
    nameOverlay.style.position = "fixed";
    nameOverlay.style.inset = "0";
    nameOverlay.style.display = "none";
    nameOverlay.style.alignItems = "center";
    nameOverlay.style.justifyContent = "center";
    nameOverlay.style.background = "rgba(0,0,0,0.65)";
    // Above splash (10000), rotate-hint (10001), so it works even mid-game in fullscreen
    nameOverlay.style.zIndex = "10050";

    const panel = document.createElement("div");
    panel.style.background = "rgba(8,16,32,0.92)";
    panel.style.border = "1px solid rgba(79,210,255,0.8)";
    panel.style.borderRadius = "16px";
    panel.style.padding = "28px 32px 32px";
    panel.style.minWidth = "320px";
    panel.style.boxShadow = "0 25px 50px rgba(0,0,0,0.55)";
    panel.style.color = "#e6f2ff";
    panel.style.fontFamily = SECONDARY_FONT;
    panel.style.textAlign = "center";

    const title = document.createElement("div");
    title.textContent = "Spielernamen festlegen";
    title.style.fontFamily = PRIMARY_FONT;
    title.style.letterSpacing = "0.05em";
    title.style.fontSize = "22px";
    title.style.marginBottom = "12px";
    panel.appendChild(title);

    // Wrap in a form so the Enter / "Done" key on mobile keyboards submits reliably.
    // Different mobile browsers fire different events for the Enter key
    // (keydown vs keypress vs implicit form submit), but a <form> with onsubmit
    // catches all of them.
    const nameForm = document.createElement("form");
    nameForm.style.margin = "0";
    nameForm.addEventListener("submit", ev => {
      ev.preventDefault();
      submitPlayerName();
    });

    nameInput = document.createElement("input");
    nameInput.type = "text";
    nameInput.maxLength = MAX_NAME_LENGTH;
    nameInput.placeholder = "Dein Name";
    nameInput.autocomplete = "off";
    nameInput.autocapitalize = "none";
    nameInput.spellcheck = false;
    nameInput.setAttribute("enterkeyhint", "done");
    nameInput.setAttribute("inputmode", "text");
    nameInput.style.width = "100%";
    nameInput.style.padding = "10px";
    nameInput.style.border = "1px solid rgba(79,210,255,0.7)";
    nameInput.style.borderRadius = "8px";
    nameInput.style.background = "rgba(5,10,18,0.9)";
    nameInput.style.color = "#fff";
    nameInput.style.fontFamily = SECONDARY_FONT;
    nameInput.style.fontSize = "16px";
    nameInput.style.marginBottom = "14px";
    nameInput.style.boxSizing = "border-box";
    nameInput.addEventListener("keydown", ev => {
      if (ev.key === "Enter") {
        ev.preventDefault();
        submitPlayerName();
      }
    });
    // Mirror typing into introInputValue so even if the user taps Start (= flap)
    // without explicitly saving, flap()'s sanitize-and-persist path picks the value up.
    nameInput.addEventListener("input", () => {
      introInputValue = String(nameInput.value || "");
    });
    nameForm.appendChild(nameInput);
    panel.appendChild(nameForm);

    const info = document.createElement("div");
    info.textContent = "Der Name erscheint im Leaderboard.";
    info.style.fontSize = "13px";
    info.style.marginBottom = "16px";
    info.style.color = "#9ec9ff";
    panel.appendChild(info);

    const buttonRow = document.createElement("div");
    buttonRow.style.display = "flex";
    buttonRow.style.justifyContent = "center";
    buttonRow.style.gap = "12px";
    buttonRow.style.marginBottom = "8px";

    const button = document.createElement("button");
    button.textContent = "Speichern";
    button.style.background = "#5099C9";
    button.style.border = "none";
    button.style.borderRadius = "999px";
    button.style.padding = "10px 20px";
    button.style.fontSize = "15px";
    button.style.cursor = "pointer";
    button.style.fontFamily = SECONDARY_FONT;
    button.addEventListener("click", submitPlayerName);
    buttonRow.appendChild(button);

    const cancelButton = document.createElement("button");
    cancelButton.textContent = "Abbrechen";
    cancelButton.style.background = "#5099C9";
    cancelButton.style.border = "1px solid #5099C9";
    cancelButton.style.borderRadius = "999px";
    cancelButton.style.padding = "9px 18px";
    cancelButton.style.fontSize = "15px";
    cancelButton.style.color = "#eaf7ff";
    cancelButton.style.fontFamily = SECONDARY_FONT;
    cancelButton.style.cursor = "pointer";
    cancelButton.addEventListener("click", hideNameOverlay);
    buttonRow.appendChild(cancelButton);

    panel.appendChild(buttonRow);

    nameErrorLabel = document.createElement("div");
    nameErrorLabel.style.marginTop = "12px";
    nameErrorLabel.style.fontSize = "13px";
    nameErrorLabel.style.color = "#ff7685";
    panel.appendChild(nameErrorLabel);

    nameOverlay.appendChild(panel);
    document.body.appendChild(nameOverlay);
  }

  function showNameOverlay(message) {
    ensureNameOverlay();
    if (nameErrorLabel) nameErrorLabel.textContent = message || "";
    if (nameInput) {
      // Pre-fill with whatever's already typed/saved, so the user can edit
      // an existing name without retyping.
      nameInput.value = (introInputValue && introInputValue.trim()) || playerName || "";
    }
    if (nameOverlay) {
      nameOverlay.style.display = "flex";
      // iOS requires focus() to run SYNCHRONOUSLY inside the user-gesture
      // handler, otherwise the on-screen keyboard won't appear.
      if (nameInput) {
        try { nameInput.focus(); nameInput.select(); } catch (_) {}
      }
    }
  }

  function hideNameOverlay() {
    if (nameOverlay) nameOverlay.style.display = "none";
    if (nameErrorLabel) nameErrorLabel.textContent = "";
  }

  function wipeLeaderboard() {
    leaderboard = [];
    leaderboardScrollOffset = 0;
    try {
      localStorage.removeItem("jumping-nexus-leaderboard");
    } catch (_) {
      /* ignore storage errors */
    }
  }

  function submitPlayerName() {
    if (!nameInput) return;
    const rawValue = String(nameInput.value || "");
    if (rawValue.trim().toUpperCase() === "WIPE") {
      wipeLeaderboard();
      saveLeaderboardToApi({ wipe: true });
      if (nameErrorLabel) nameErrorLabel.textContent = "Leaderboard wurde geleert.";
      nameInput.value = "";
      return;
    }
    const sanitized = sanitizeName(rawValue);
    if (!sanitized) {
      if (nameErrorLabel) {
        nameErrorLabel.textContent = "Bitte einen vernünftigen Namen (2-16 Zeichen, keine Beleidigungen) eingeben.";
      }
      return;
    }
    persistPlayerName(sanitized);
    // Successful save — drop the keyboard, close the overlay, and on mobile
    // restore browser fullscreen (the keyboard may have collapsed it).
    try { nameInput.blur(); } catch (_) {}
    hideNameOverlay();
    if ((!_hasWrap || _isMobileNow()) && !document.fullscreenElement) {
      try { document.documentElement.requestFullscreen?.().catch(() => {}); } catch (_) {}
    }
  }

  // Beispiel: hier geht dein Game-Code weiter ...
  // function drawEffectCircles() { ... }

  function drawEffectCircles() {
    const effects = [
      { key: "ghostTimer",     dur: DURATIONS.ghost,     color: "#88ccff", label: "Geist" },
      { key: "shieldTimer",    dur: DURATIONS.shield,    color: "#5cc8ff", label: "Schild" },
      { key: "doubleTimer",    dur: DURATIONS.double,    color: "#ffe066", label: "2× Punkte" },
      { key: "slowTimer",      dur: DURATIONS.slow,      color: "#9cff9c", label: "Zeitlupe" },
      { key: "turboTimer",     dur: DURATIONS.turbo,     color: "#ffb366", label: "Turbo" },
      { key: "shrinkTimer",    dur: DURATIONS.shrink,    color: "#8df0c3", label: "Schrumpfen" },
      { key: "bigTimer",       dur: DURATIONS.big,       color: "#ff8899", label: "Groß" },
      { key: "magnetTimer",    dur: DURATIONS.magnet,    color: "#ff88dd", label: "Magnet" },
      { key: "multiShotTimer", dur: DURATIONS.multiShot, color: "#aaddff", label: "Multi-Shot" },
      { key: "scoreRushTimer", dur: DURATIONS.scoreRush, color: "#ffcc00", label: "Score-Rush" },
    ].filter(e => player[e.key] > 0);

    if (!effects.length) return;

    ctx.save();
    ctx.translate(player.x, player.y);
    ctx.font = `600 11px ${SECONDARY_FONT}`;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";

    // Start rings just outside the N.png visual boundary (sprite scale ~1.99 × radius)
    const visualR = player.radius * 2.05;
    const ringGap = 9;
    const textStartY = -effects.length * 7;

    effects.forEach((eff, idx) => {
      const time = player[eff.key];
      const ratio = Math.max(0, Math.min(1, time / eff.dur));
      const r = visualR + idx * ringGap;
      const pulseW = 3 + Math.sin(globalTime * 4 + idx) * 0.8;

      ctx.lineWidth = pulseW;
      ctx.strokeStyle = "rgba(255,255,255,0.1)";
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = eff.color;
      if (!perfMode) { ctx.shadowColor = eff.color; ctx.shadowBlur = 6; }
      ctx.beginPath();
      ctx.arc(0, 0, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * ratio);
      ctx.stroke();
      ctx.shadowBlur = 0;

      ctx.lineWidth = 1;
      ctx.fillStyle = eff.color;
      ctx.fillText(`${eff.label} ${time.toFixed(1)}s`, r + 8, textStartY + idx * 14);
    });

    ctx.restore();
  }

const ASSET_BASE = "https://raw.githubusercontent.com/NexusNovaPatrickDause/JumpingNexus/main/";

const assets = {
    bg1: loadImage(ASSET_BASE + "background1.png"),
    bossbg1: loadImage(ASSET_BASE + "bossbg1.png"),
    bossbg2: loadImage(ASSET_BASE + "bossbg2.png"),
    bossbg3: loadImage(ASSET_BASE + "bossbg3.png"),
    bossbg4: loadImage(ASSET_BASE + "bossbg4.png"),
    bossbg5: loadImage(ASSET_BASE + "bossbg5.png"),
    bossbg6: loadImage(ASSET_BASE + "bossbg6.png"),
    logo: loadImage(ASSET_BASE + "N.png"),
    startscreen: loadImage(ASSET_BASE + "startscreen.png"),
    lootbox: loadImage(ASSET_BASE + "lootbox.jpg"),
    boss1: loadImage(ASSET_BASE + "boss1.png"),
    boss2: loadImage(ASSET_BASE + "boss2.png"),
    boss3: loadImage(ASSET_BASE + "boss3.png"),
    boss4: loadImage(ASSET_BASE + "boss4.png"),
    boss5: loadImage(ASSET_BASE + "boss5.png"),
    boss6: loadImage(ASSET_BASE + "boss6.png"),
    bug: loadImage(ASSET_BASE + "Bug.jpg"),
};

  // ======================================================
  //  Game State
  // ======================================================
  let gameRunning = false;
  let gameOver = false;
  let inBossFight = false;
  let currentBoss = null;
  let score = 0;
  let highscore = 0;
  let leaderboard = [];
  let leaderboardScrollOffset = 0;
  const LEADERBOARD_SCROLL_SPEED = 22;
  const LEADERBOARD_ENTRY_HEIGHT = 26;
  const LEADERBOARD_API_URL = "https://flappynexus.ricks-0c1.workers.dev";
  let lastTime = 0;
  let rawDt = 0;

  try {
    const stored = localStorage.getItem("jumping-nexus-highscore");
    if (stored) highscore = Number(stored) || 0;
  } catch (_) {
    highscore = 0;
  }

  try {
    const storedBoard = localStorage.getItem("jumping-nexus-leaderboard");
    if (storedBoard) {
      const parsed = JSON.parse(storedBoard);
      if (Array.isArray(parsed)) {
        leaderboard = normalizeLeaderboard(parsed);
      }
    }
  } catch (_) {
    leaderboard = [];
  }

  function loadLeaderboardFromApi() {
    if (!LEADERBOARD_API_URL) return;
    fetch(LEADERBOARD_API_URL, { method: "GET" })
      .then(res => res.json())
      .then(data => {
        if (!Array.isArray(data)) return;
        leaderboard = normalizeLeaderboard(data);
        try {
          localStorage.setItem("jumping-nexus-leaderboard", JSON.stringify(leaderboard));
        } catch (_) {
          /* ignore */
        }
      })
      .catch(() => {
        /* ignore */
      });
  }

  function saveLeaderboardToApi(entry) {
    if (!LEADERBOARD_API_URL) return;
    fetch(LEADERBOARD_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(entry),
    })
      .then(res => res.json())
      .then(data => {
        if (!Array.isArray(data)) return;
        leaderboard = normalizeLeaderboard(data);
        try {
          localStorage.setItem("jumping-nexus-leaderboard", JSON.stringify(leaderboard));
        } catch (_) {
          /* ignore */
        }
      })
      .catch(() => {
        /* ignore */
      });
  }

  let introNameRect = null;
  let introInputActive = false;
  let introInputValue = "";
  let introInputBlinkTimer = 0;

  try {
    const storedName = localStorage.getItem("jumping-nexus-player-name");
    if (storedName) {
      const safe = sanitizeName(storedName);
      if (safe) playerName = safe;
    }
  } catch (_) {
    playerName = "";
  }
  introInputValue = playerName || "";

  loadLeaderboardFromApi();
  audioLoad();

  ensureNameOverlay();
  if (playerName) {
    persistPlayerName(playerName);
  } else if (nameInput) {
    nameInput.value = "";
  }

  // Player
  const player = {
    x: 200,
    y: WORLD_H / 2,
    vy: 0,
    radius: 28 * SIZE_SCALE,
    baseRadius: 28 * SIZE_SCALE,
    gravity: 1200 * SIZE_SCALE,
    baseJumpStrength: -450 * SIZE_SCALE,
    jumpStrength: -450 * SIZE_SCALE,
    rotation: 0,
    invincible: false,
    maxHp: 4,
    hp: 4,
    shieldCharge: 0,
    shieldHits: 1,
    ghostTimer: 0,
    shrinkTimer: 0,
    slowTimer: 0,
    doubleTimer: 0,
    bigTimer: 0,
    shieldTimer: 0,
    turboTimer: 0,
    magnetTimer: 0,
    multiShotTimer: 0,
    scoreRushTimer: 0,
    debuffGraceTimer: 0,
    beamGraceTimer: 0,
    lockTimer: 0,
    weaponMode: "normal",
    ammoRapid: 0,
    ammoSpread: 0,
    ammoSalvo: 0,
    shieldInvTimer: 0,
    legendary: false,
    colorShift: 0,
    colorPulseTimer: 0,
    spinTimer: 0,
    pickupFlashTimer: 0,
    pickupFlashColor: "rgba(255,255,255,0.8)",
  };

  const TEST_BOSS3 = window.location.hash.includes("boss3test");
  let totalFlaps = 0;
  let lastScoreHueStep = 0;
  let bossCountdown = 0;
  let bossSpawnGraceTimer = 0;
  let bossTransitionActive = false;
  let bossTransitionTimer = 0;
  const bossTransitionDuration = 1.2;
  let pendingBossId = null;
  let pendingBossStoryLines = [];
  let pendingBossStoryIndex = 0;
  let pendingBossStoryTimer = 0;
  let pendingBossStoryLineInterval = 1.0;
  let pendingBossStoryCursorTimer = 0;
  let pendingBossStoryCursorOn = true;
  let pendingBossStoryRevealChars = 0;
  let pendingBossStoryTotalChars = 0;
  let pendingBossStoryCharRate = 90;
  let pendingBossStoryLineEnds = [];
  let bossAwaitingConfirm = false;
  let gameWon = false;
  let runGlow = 0;
  let globalTime = 0;
  let gameOverAnimTimer = 0;
  let introAnimTimer = 0;
  let scoreFlashTimer = 0;
  let lastDrawnScore = -1;
  let finalCongratsTimer = 0;
  let scoreTauntText = "";
  let scoreTauntTimer = 0;
  let phaseMilestoneCooldown = 0;
  let nnTauntActive = false;
  let _goActiveEffects = [];
  let nnTauntText = "";
  let nnTauntX = 0;
  let nnTauntY = 0;
  let nnTauntWidth = 0;
  let nnTauntLane = 0;
  let nextScoreTaunt = 0;
  let phaseMilestoneIndices = [];
  let phaseTextPhase = 0;
  let phaseTextIndex = 0;
  let phaseTextX = 0;
  let phaseTextY = 0;
  let phaseTextLine = "";
  let phaseTextWidth = 0;
  let phaseTextActive = false;
  let phaseTextDone = [];
  let startButtonRect = null;
  let gameOverLinkRect = null;
  let nameButtonRect = null;
  let audioMusicToggleRect = null;
  let audioSfxToggleRect = null;
  // Intro screen state
  let _introStars = null;
  let _introGlitchTimer = -(5 + Math.random() * 3);
  let _introWinkTimer = -(3 + Math.random() * 2);
  let _introButtonTap = 0;
  // Screen shake
  let shakeMag = 0;
  let shakeDecay = 8;
  let shakeX = 0;
  let shakeY = 0;
  function addShake(mag, decay) {
    shakeMag = Math.max(shakeMag, mag);
    shakeDecay = decay || 8;
  }

  // Hit flash (player)
  let playerHitFlash = 0;

  // Score popup pool  ("+N" floating text)
  const scorePopups = [];

  // Pause
  let gamePaused = false;

  const SHIELD_CHARGE_RATE = 0.01;
  const SHIELD_MAX_RATIO = 0.25;

  // Trail
  const trail = [];
  let trailMaxLength = isMobile() ? 14 : 26;
  let trailSampleTimer = 0;
  const trailSampleInterval = 0.03;
  let trailLoopPhase = 0;

  // Pipes
  const pipes = [];
  const pipeWidth = Math.round(WORLD_W * 0.07 * SIZE_SCALE);
  const basePipeGap = Math.round(WORLD_H * 0.55 * SIZE_SCALE * 0.9 * 0.75 * PIPE_GAP_SCALE);
  const minPipeGap = Math.round(WORLD_H * 0.45 * SIZE_SCALE * 0.85 * 0.75 * PIPE_GAP_SCALE); // Mindestabstand, skaliert zur Welt
  const pipeMargin = Math.round(WORLD_H * 0.13 * SIZE_SCALE);
  let pipeGap = basePipeGap;
  let pipeSpeed = 200;
  let pipeSpawnTimer = 0;
  let pipeSpawnInterval = PIPE_SPAWN_INTERVAL;
  let lastGapY = null;

  // Lootboxes / Powerups
  const lootboxes = [];
  const lootSpawnChance = 0.42;
  let lootSwayTimer = 0;
  let ghostChallenge = false;

  // Powerup durations
  const DURATIONS = {
    ghost: 8,
    shrink: 15,
    slow: 7,
    double: 10,
    big: 7,
    shield: 10,
    turbo: 5,
    magnet: 10,
    multiShot: 5,
    scoreRush: 12,
  };

  // Boss Triggers
  const BOSS_INTERVAL = 5; // Prüfintervall
  const BOSS1_SCORE = 20;  // Boss 1 bei 20 Punkten
  const BOSS2_SCORE = 50;  // Boss 2 bei 50 Punkten
  const BOSS3_SCORE = 120; // Boss 3 bei 120 Punkten (mehr Abstand)
  const BOSS4_SCORE = 175; // Boss 4 bei 175 Punkten (mehr Abstand)
  const BOSS5_SCORE = 225; // Boss 5 bei 225 Punkten
  const BOSS6_SCORE = 275; // Boss 6 bei 275 Punkten
  const SCORE_TAUNT_DURATION = 4;
  const SCORE_TAUNT_MIN = 1;
  const SCORE_TAUNT_MAX = 9999;
  const SCORE_TAUNT_STEP_MIN = 4;
  const SCORE_TAUNT_STEP_MAX = 9;
  const PHASE_MILESTONE_COOLDOWN = 6;
  const NN_SCORE_TAUNTS = [
    // Klassiker — bleiben
    "F6 F6 F6 F6 F6 F7?!",
    "Beste Firma der Welt <3",
    "Das ist kein Bug, das ist Feature!",
    "Unaufhaltsam.",
    "Kaffee ist alle- Weiterfliegen!",
    "Dein Rekord hat Angst.",
    "Die Maustaste raucht.",
    "Checkpoint? Was ist das?",
    "Du glitchst die Matrix.",
    "Protokoll: Weiterfliegen.",
    "Break- Nicht heute.",
    "Du bist der Sprint.",
    "Patch ist raus, du auch?!",
    "Noch ein Versuch, noch ein Punkt.",
    "Produktivitätslevel: Overdrive.",
    "Highscore-Hunger aktiviert.",
    "Sauerstoff wird knapp.",
    "Du fliegst wie ein Commit am Freitag.",
    "Der Boss schaut schon nervös.",
    // Neue Varianten A+B
    "Kein Meeting heute?",
    "Ticket offen, Highscore wächst.",
    "Feierabend? Nicht mit diesem Score.",
    "Sprint-Abnahme kann warten.",
    "Impuls-Management: deaktiviert.",
    "Starke Impulskontrolle hättest du.",
    "Jemand hat Alignment auf Highscore gesetzt.",
    "Das Daily war vor einer Stunde.",
    "Velocity: Übermensch.",
    "Bald im Sprint-Review vorstellbar.",
    "Das Burndown-Chart zeigt nur noch 'du'.",
    "Letzte Story noch. Schon die zweite Stunde.",
    "Sprint-Ende in 3s. Oder auch nicht.",
    "NN bestätigt: nicht aufzuhalten.",
    "Intern geclockt: Rekordverdächtig.",
];

  const BOSS_STORIES = {
    1: `Boss: "Scope Creeper"

Discover. Ein Flipchart. Zwei Fragen.
Und dann — "Könnten wir nicht auch...?"

Er wächst von jedem ungeplanten Wunsch.
Er nährt sich von Zeit und Budget.
Und je länger ihr zögert, desto mehr spawnt er.

Fokus schwindet. Entscheidungen werden weich.

Boss erscheint.`,
    2: `Boss: "Lord Chaos Governance"

Prepare. Alle im Meeting. Keiner entscheidet.
"Wir klären die Rollen später." — und später kam nie.

Entscheidungen blieben offen. Verantwortlichkeiten verschwammen.
Er lebt von offenen Punkten und endlosen Abstimmungsrunden.

Der Kalender füllt sich. Das Projekt steht still.

Boss erscheint.`,
    3: `Boss: "Fit-to-Standard Hydra"

Explore. "Das haben wir schon immer so gemacht."
Mit jedem abgeschlagenen Gap wuchsen zwei neue nach.

Workshops wurden länger. Blueprints dicker.
Aus Einfachheit wurde Overengineering.
Der Standard? Längst aus dem Blick.

Boss erscheint.`,
    4: `Boss: "Migration Minotaur"

"Die Daten migrieren wir später."
TM1 läuft. TM2 läuft. Nichts mehr läuft.

Fehler explodierten. Fixing-Schleifen begannen.
Tief im Labyrinth der Altdaten, genährt von Dubletten und Altlasten,
erwacht der Migration Minotaur.

Der Weg zum Go-Live wird enger.

Boss erscheint.`,
    5: `Boss: "Cut-over Kraken"

Deploy. Countdown läuft. Schnittstellen zittern.
Jobs kollidieren. Interfaces reißen.
Seiteneffekte schlagen dort zu, wo niemand hinsieht.

Er streckt seine Arme in alle Systeme gleichzeitig.
Er kennt keinen Rückzug. Er verzeiht keinen Fehler.

Keine zweite Chance. Der Go-Live steht bevor.

Boss erscheint.`,
    6: `Boss: "Legacy Phantom"

"Zur Sicherheit lassen wir das Altsystem noch an."
Niemand merkt, wie sich etwas löst.

Schattenprozesse entstehen. Ressourcen verschwinden.
Es ist schwer zu sehen. Es greift leise an.
Und solange es existiert, zieht es euch zurück.

Die Zukunft bleibt stehen, solange die Vergangenheit lebt.

Boss erscheint.`,
  };






  const PHASE_TEXTS = [
    {
      title: "Phase 1: Discovery",
      lines: [
        "Phase 1: Discovery",
        "Zielarchitektur (S/4 Utilities, BTP, Middleware, Umsysteme)",
        "Transformationsansatz (System Conversion vs. Landscape Transformation)",
        "Regulatorik-Einordnung (MaBiS, GPKE, GeLi Gas, WiM, Redispatch 2.0, 24h-LW)",
        "Bewertung Marktrollen, Abrechnungsvarianten (SLP/RLM)",
        "Analyse Custom Code und Datenvolumina",
        "Identifikation kritischer Umsysteme",
      ],
    },
    {
      title: "Phase 2: Prepare",
      lines: [
        "Phase 2: Prepare",
        "Projektorganisation und Governance (Change, Test, Cut-over)",
        "Stammdaten-Governance (MaLo, MeLo, Geräte, Verträge, Stammdatenreferenzmodell)",
        "Grobes Migrationskonzept (Datenklassen, Stilllegung)",
        "Integrationsstrategie (API, Event, synchron/asynchron)",
        "Systemlandschaft DEV / INT / QAS",
        "Testorganisation und Rollenaufbau",
      ],
    },
    {
      title: "Phase 3: Explor",
      lines: [
        "Phase 3: Explor",
        "Fit-to-Standard Workshops (Billing, MaKo, EDM, Netz, CRM)",
        "Festlegung Standardprozesse & bewusste Abweichungen",
        "Ziel-Stammdatenmodell (MaLo/MeLo, Geräte, Verträge)",
        "Fachliche Prüfregeln Migration & Betrieb",
        "Detailliertes Integrationskonzept je Umsystem",
        "Migrations-Feinkonzept inkl. Objektliste & Reihenfolge",
        "Teststrategie (SIT, UAT, MaKo, Abrechnung)",
      ],
    },
    {
      title: "Phase 4: Realize",
      lines: [
        "Phase 4: Realize",
        "Customizing S/4HANA Utilities",
        "Entwicklung Erweiterungen & Integrationen",
        "Aufbau Migrationswerkzeuge",
        "Testmigration 1 – technische Lauffähigkeit",
        "Testmigration 2 – fachliche Datenqualität",
        "Testmigration 3 – Dress Rehearsal / Cut-over-Probe",
        "Datenqualitätsbereinigung Quellsystem",
        "Integrations-, MaKo- und Abrechnungstests",
        "Cut-over-Runbook und Hypercare-Vorbereitung",
      ],
    },
    {
      title: "Phase 5: Deploy",
      lines: [
        "Phase 5: Deploy",
        "Finalmigration inkl. Sperrkonzept",
        "Produktivsetzung Schnittstellen & Jobs",
        "Aktivierung Marktkommunikation",
        "Erste produktive Abrechnungsläufe",
        "Monitoring kritischer KPIs",
        "Start Hypercare",
      ],
    },
    {
      title: "Phase 6: Run",
      lines: [
        "Phase 6: Run",
        "Hypercare und Stabilisierung",
        "Performance-Optimierung",
        "Stilllegung Altsysteme",
        "Übergabe in Linienbetrieb",
        "Lessons Learned & Vorbereitung Folgeinitiativen",
      ],
    },
  ];
  const PHASE_TEXT_SPEED = 120;
  const PHASE_TEXT_LINE_GAP = 40;
  const PHASE_TEXT_COLOR = "rgba(140, 240, 200, 0.5)";
  const PHASE_TEXT_FONT = `600 22px ${SECONDARY_FONT}`;
  const NN_TAUNT_SPEED = 120;
  phaseTextDone = new Array(PHASE_TEXTS.length).fill(false);

  const PHASE_MILESTONE_DEFS = [
    {
      offsets: [5, 10, 15],
      texts: [
        "Meilenstein 1: Zielarchitektur abgestimmt",
        "Meilenstein 2: Transformationsstrategie beschlossen",
        "Meilenstein 3: Management-Go",
      ],
    },
    {
      offsets: [5, 10, 15],
      texts: [
        "Meilenstein 4: Projekt arbeitsfähig",
        "Meilenstein 5: Systemlandschaft bereit",
        "Meilenstein 6: Integrations- & Migrationsleitplanken freigegeben",
      ],
    },
    {
      offsets: [5, 10, 15],
      texts: [
        "Meilenstein 7: Zielprozesslandschaft abgenommen",
        "Meilenstein 8: Integrationskonzept freigegeben",
        "Meilenstein 9: Stammdaten-Zielmodell verabschiedet",
      ],
    },
    {
      offsets: [5, 10, 15, 20, 25],
      texts: [
        "Meilenstein 10: Umsysteme angebunden → Integrationstest",
        "Meilenstein 11: TM1 erfolgreich (technische Lauffähigkeit)",
        "Meilenstein 12: TM2 abgenommen (fachliche Datenqualität)",
        "Meilenstein 13: TM3 bestanden (Dress Rehearsal / Cut-over-Probe)",
        "Meilenstein 14: Cut-over-Readiness bestätigt",
      ],
    },
    {
      offsets: [5, 10],
      texts: [
        "Meilenstein 15: Go-Live S/4 Utilities",
        "Meilenstein 16: Erste erfolgreiche Abrechnung & MaKo stabil+C18",
      ],
    },
    {
      offsets: [5, 10],
      texts: [
        "Meilenstein 17: Hypercare abgeschlossen",
        "Meilenstein 18: Regelbetrieb übernommen",
      ],
    },
  ];
  const PHASE_START_SCORES = [0, BOSS1_SCORE, BOSS2_SCORE, BOSS3_SCORE, BOSS4_SCORE, BOSS5_SCORE];
  const PHASE_END_SCORES = [BOSS1_SCORE, BOSS2_SCORE, BOSS3_SCORE, BOSS4_SCORE, BOSS5_SCORE, BOSS6_SCORE];
  const PHASE_MILESTONES_BY_PHASE = PHASE_MILESTONE_DEFS.map((def, idx) => {
    const start = PHASE_START_SCORES[idx] || 0;
    return def.texts.map((text, j) => ({
      score: start + (def.offsets[j] || 0),
      text,
    }));
  });
  phaseMilestoneIndices = new Array(PHASE_MILESTONE_DEFS.length).fill(0);

  const PHASE1_BACKGROUND_LINES = [
    "Phase 1: Discovery",
    "Zielarchitektur (S/4 Utilities, BTP, Middleware, Umsysteme)",
    "Transformationsansatz (System Conversion vs. Landscape Transformation)",
    "Regulatorik-Einordnung (MaBiS, GPKE, GeLi Gas, WiM, Redispatch 2.0, 24h-LW)",
    "Bewertung Marktrollen, Abrechnungsvarianten (SLP/RLM)",
    "Analyse Custom Code und Datenvolumina",
    "Identifikation kritischer Umsysteme",
  ];
  const PHASE1_TEXT_SPEED = 90;
  const PHASE1_TEXT_FONT = `600 18px ${SECONDARY_FONT}`;
  const PHASE1_TEXT_COLOR = "rgba(140, 200, 230, 0.35)";

  // Hintergrund-Scroll
  let bgOffset = 0;
  const bgScrollSpeedBase = 60;

  // Difficulty / Pipe-Speed Basis
  const basePipeSpeed = 200;

  // Boss-Flags
  let boss1Spawned = false;
  let boss1Defeated = false;
  let boss2Spawned = false;
  let boss2Defeated = false;
  let boss3Spawned = false;
  let boss3Defeated = false;
  let boss4Spawned = false;
  let boss4Defeated = false;
  let boss5Spawned = false;
  let boss5Defeated = false;
  let boss6Spawned = false;
  let boss6Defeated = false;
  let bossStage = 0; // progressive Verstärkung nach jedem Boss

  // Projectiles & Explosions
  const playerShots = [];
  const bossShots = [];
  const explosions = [];
  const bossLoot = [];
  const bossObstacles = [];

  // ======================================================
  //  Input
  // ======================================================
  let flapCount = 0;

  function flap() {
    if (!gameRunning && !gameOver) {
      // Save intro name input before starting
      if (introInputActive || introInputValue.trim()) {
        const trimmed = sanitizeName(introInputValue.trim());
        if (trimmed) persistPlayerName(trimmed);
      }
      introInputActive = false;
      resetGame();
      gameRunning = true;
      _musicPlay('mainTheme');
    } else if (gameOver) {
      resetGame();
      gameRunning = true;
      _musicPlay('mainTheme');
    }

    if (bossSpawnGraceTimer > 0) bossSpawnGraceTimer = 0;
    player.vy = player.jumpStrength;
    sfxJump();
    flapCount++;
    totalFlaps++;

    // Random spin every 10-25 flaps
    if (flapCount >= 10 + Math.floor(Math.random() * 15)) {
      player.rotation += Math.PI * 2;
      flapCount = 0;
    }

    // Spin alle 25 Sprünge sicher auslösen (random Länge 35s)
    if (totalFlaps > 0 && totalFlaps % 25 === 0) {
      player.spinTimer = Math.max(player.spinTimer, 3 + Math.random() * 2);
    }
    // Zusätzlich zufälliger Spin alle 50 Klicks (Länge 24s)
    if (totalFlaps > 0 && totalFlaps % 50 === 0 && Math.random() < 0.6) {
      player.spinTimer = Math.max(player.spinTimer, 2 + Math.random() * 2);
    }

    // Player shoots during boss fight
    if (inBossFight && currentBoss) {
      shootPlayerProjectile();
    }
  }

  window.addEventListener("keydown", e => {
    if (e.repeat && !(introInputActive && e.key === "Backspace")) return;
    // Pause toggle
    if (e.key === "Escape" || e.key === "p" || e.key === "P") {
      if (gameRunning && !gameOver && !pendingBossId) {
        gamePaused = !gamePaused;
        if (gamePaused) _musicPause(); else _musicResume();
        e.preventDefault();
        return;
      }
    }
    if (gamePaused) return;
    // Capture text input when intro name field is focused
    if (introInputActive && !gameRunning && !gameOver) {
      if (e.key === "Enter") {
        const trimmed = sanitizeName(introInputValue.trim());
        if (trimmed) persistPlayerName(trimmed);
        else { playerName = introInputValue.trim() || "Spieler"; introInputValue = playerName; }
        introInputActive = false;
        e.preventDefault();
        return;
      }
      if (e.key === "Escape") { introInputActive = false; e.preventDefault(); return; }
      if (e.key === "Backspace") { introInputValue = introInputValue.slice(0, -1); introInputBlinkTimer = 0; e.preventDefault(); return; }
      if (e.key.length === 1 && introInputValue.length < MAX_NAME_LENGTH) {
        introInputValue += e.key;
        introInputBlinkTimer = 0;
        e.preventDefault();
        return;
      }
      if (e.code === "Space") { e.preventDefault(); return; } // don't flap while typing
    }
    if (e.code === "Space" || e.code === "ArrowUp") {
      // In embed mode, only steal Space/ArrowUp when the canvas is focused —
      // otherwise the page should be free to scroll with Space.
      if (embedMode && document.activeElement !== canvas) return;
      if (pendingBossId && !bossTransitionActive) {
        if (bossAwaitingConfirm) {
          bossTransitionActive = true;
          bossTransitionTimer = 0;
          bossAwaitingConfirm = false;
        } else {
          revealNextBossStoryLine();
        }
        e.preventDefault();
        return;
      }
      flap();
      e.preventDefault();
    }
  });
  function getWorldPoint(event) {
    const rect = canvas.getBoundingClientRect();
    const point = event.touches && event.touches[0] || event.changedTouches && event.changedTouches[0] || event;
    if (!point) return null;
    const x = (point.clientX - rect.left - viewOffsetX) / viewScale;
    const y = (point.clientY - rect.top - viewOffsetY) / viewScale;
    return { x, y, inWorld: x >= 0 && x <= WORLD_W && y >= 0 && y <= WORLD_H };
  }

  function pointInRect(p, r) {
    return p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;
  }

  function pointInBtn(p, r) {
    const pad = isMobile() ? 12 : 0;
    return p.x >= r.x - pad && p.x <= r.x + r.w + pad && p.y >= r.y - pad && p.y <= r.y + r.h + pad;
  }

  function handlePointerPress(event) {
    const p = getWorldPoint(event);
    if (!p || !p.inWorld) return;

    if (pendingBossId && !bossTransitionActive) {
      if (bossAwaitingConfirm) {
        bossTransitionActive = true;
        bossTransitionTimer = 0;
        bossAwaitingConfirm = false;
      } else {
        revealNextBossStoryLine();
      }
      return;
    }

    if (audioMusicToggleRect && pointInBtn(p, audioMusicToggleRect)) {
      audioToggleMusic();
      return;
    }
    if (audioSfxToggleRect && pointInBtn(p, audioSfxToggleRect)) {
      audioToggleSfx();
      return;
    }

    // Unlock audio context + start title music on first interaction (if enabled & on intro screen)
    if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
    if (audio.musicEnabled && !_musEl && !gameRunning && !gameOver) {
      _musicPlay('titleScreen');
    }

    if (!gameRunning && !gameOver) {
      if (introNameRect && pointInBtn(p, introNameRect)) {
        // Touch devices have no physical keyboard for the canvas-rendered
        // intro name field — open the HTML overlay (which has a real <input>
        // and triggers the virtual keyboard) instead.
        if (window.matchMedia("(pointer: coarse)").matches) {
          showNameOverlay();
        } else {
          introInputActive = true;
          introInputBlinkTimer = 0;
        }
        return;
      }
      if (nameButtonRect && pointInBtn(p, nameButtonRect)) {
        showNameOverlay();
        return;
      }
      if (startButtonRect && pointInBtn(p, startButtonRect)) {
        _introButtonTap = 1;
        flap();
        return;
      }
      // Deactivate name input if clicking elsewhere
      introInputActive = false;
    }

    if (gameOver) {
      if (nameButtonRect && pointInBtn(p, nameButtonRect)) {
        showNameOverlay();
        return;
      }
      if (gameOverLinkRect && pointInBtn(p, gameOverLinkRect)) {
        window.open("https://www.nexus-nova.de/karriere", "_blank", "noopener");
        return;
      }
    }

    // Short input lock after game-over to prevent accidental instant restart
    if (_gameOverLockTimer > 0) return;

    flap();
  }

  if (embedMode) {
    // Embed mode: use only `click` so drag-to-scroll (touchmove without click)
    // doesn't trigger spurious flaps. Click fires on tap on both desktop and mobile.
    canvas.addEventListener("click", handlePointerPress);
  } else {
    // Standalone mode: original mousedown + touchstart for instant feedback
    canvas.addEventListener("mousedown", handlePointerPress);

    canvas.addEventListener("touchstart", e => {
      if (e.touches.length > 1) { e.preventDefault(); return; }
      if (!_firstTapDone) {
        _firstTapDone = true;
        try { document.documentElement.requestFullscreen?.().catch(() => {}); } catch (_) {}
      }
      const p = getWorldPoint(e);
      handlePointerPress(e);
      if (p && p.inWorld) e.preventDefault();
    }, { passive: false });

    canvas.addEventListener("touchmove", e => {
      const p = getWorldPoint(e);
      if (p && p.inWorld) e.preventDefault();
    }, { passive: false });
  }

  // ======================================================
  //  Core Helpers
  // ======================================================
  function resetGame() {
    score = TEST_BOSS3 ? Math.max(0, BOSS3_SCORE - 5) : 0;
    gameOver = false;
    gameRunning = false;
    gamePaused = false;
    gameOverAnimTimer = 0;
    introAnimTimer = 0;
    introInputBlinkTimer = 0;
    introInputActive = false;
    introInputValue = playerName || "";
    scoreFlashTimer = 0;
    lastDrawnScore = -1;
    inBossFight = false;
    currentBoss = null;
    pendingBossId = null;
    bossCountdown = 0;
    bossAwaitingConfirm = false;
    bossTransitionActive = false;
    bossTransitionTimer = 0;
    bossSpawnGraceTimer = 0;
    phaseMilestoneCooldown = 0;
    nnTauntActive = false;
    nnTauntText = "";

    Object.assign(player, {
      y: WORLD_H / 2,
      vy: 0,
      radius: player.baseRadius,
      ghostTimer: 0,
      shrinkTimer: 0,
      slowTimer: 0,
      doubleTimer: 0,
      bigTimer: 0,
      shieldTimer: 0,
      turboTimer: 0,
      magnetTimer: 0,
      multiShotTimer: 0,
      scoreRushTimer: 0,
      shieldHits: 1,
      debuffGraceTimer: 0,
      beamGraceTimer: 0,
      lockTimer: 0,
      weaponMode: "normal",
      ammoRapid: 0,
      ammoSpread: 0,
      ammoSalvo: 0,
      shieldCharge: 0,
      shieldInvTimer: 0,
      hp: player.maxHp,
      legendary: false,
      invincible: false,
      rotation: 0,
      colorShift: 0,
      colorPulseTimer: 0,
      spinTimer: 0,
      pickupFlashTimer: 0,
    });

    pipes.length = 0;
    trail.length = 0;
    lootboxes.length = 0;
    playerShots.length = 0;
    bossShots.length = 0;
    explosions.length = 0;
    bossLoot.length = 0;
    bossObstacles.length = 0;

    pipeSpeed = basePipeSpeed;
    pipeGap = basePipeGap;
    pipeSpawnTimer = 0;
    pipeSpawnInterval = PIPE_SPAWN_INTERVAL;
    bgOffset = 0;

    boss1Spawned = boss1Defeated = false;
    boss2Spawned = boss2Defeated = false;
    boss3Spawned = boss3Defeated = false;
    boss4Spawned = boss4Defeated = false;
    boss5Spawned = boss5Defeated = false;
    boss6Spawned = boss6Defeated = false;
    audio._mainThemeIdx = 0;
    totalFlaps = 0;
    lastScoreHueStep = 0;
    scoreTauntText = "";
    scoreTauntTimer = 0;
    phaseMilestoneCooldown = 0;
    nnTauntActive = false;
    nnTauntText = "";
    nextScoreTaunt = 0;
    phaseMilestoneIndices = new Array(PHASE_MILESTONE_DEFS.length).fill(0);
    scheduleNextScoreTaunt(0);
    phaseTextPhase = 0;
    phaseTextIndex = 0;
    phaseTextX = 0;
    phaseTextY = 0;
    phaseTextLine = "";
    phaseTextWidth = 0;
    phaseTextActive = false;
    phaseTextDone = new Array(PHASE_TEXTS.length).fill(false);
    scorePopups.length = 0;
    shakeMag = 0; shakeX = 0; shakeY = 0;
    playerHitFlash = 0;
  }

  function endGame() {
    if (gameOver) return;
    // Snapshot active powerup effects for display on game over screen
    _goActiveEffects = [
      { key: "ghostTimer",     color: "#88ccff", label: "Geist" },
      { key: "shieldTimer",    color: "#5cc8ff", label: "Schild" },
      { key: "doubleTimer",    color: "#ffe066", label: "2× Punkte" },
      { key: "shrinkTimer",    color: "#8df0c3", label: "Schrumpfen" },
      { key: "bigTimer",       color: "#ff8899", label: "Groß" },
      { key: "magnetTimer",    color: "#ff88dd", label: "Magnet" },
      { key: "scoreRushTimer", color: "#ffcc00", label: "Score-Rush" },
    ].filter(e => player[e.key] > 0);
    gameOver = true;
    gameOverAnimTimer = 0;
    gameRunning = false;
    inBossFight = false;
    currentBoss = null;
    pendingBossId = null;
    bossCountdown = 0;
    bossTransitionActive = false;
    bossTransitionTimer = 0;
    bossSpawnGraceTimer = 0;
    bossShots.length = 0;
    playerShots.length = 0;
    bossLoot.length = 0;
    bossObstacles.length = 0;
    _gameOverLockTimer = 0.25;
    _musicStop(0.6);
    setTimeout(() => { if (gameOver) _musicPlay('titleScreen'); }, 1400);
    highscore = Math.max(highscore, score);
    try {
      localStorage.setItem("jumping-nexus-highscore", String(highscore));
    } catch (_) {
      /* ignore */
    }
    updateLeaderboard(score);
  }

  function normalizeLeaderboard(entries) {
    const bestByName = new Map();
    for (const entry of entries || []) {
      let name = "Spieler";
      let score = 0;
      let highlightColor = null;
      if (typeof entry === "number") {
        score = Number(entry);
      } else if (entry && typeof entry.score === "number") {
        name = sanitizeName(entry.name || "") || "Spieler";
        score = Number(entry.score) || 0;
        if (typeof entry.highlightColor === "string") {
          highlightColor = entry.highlightColor;
        }
      } else {
        continue;
      }
      if (!Number.isFinite(score)) continue;
      if (getHighlightInfo(name).isHighlight && !highlightColor) {
        highlightColor = pickHighlightColor();
      }
      const current = bestByName.get(name);
      if (current === undefined || score > current.score) {
        bestByName.set(name, { score, highlightColor });
      }
    }
    return Array.from(bestByName, ([name, data]) => ({
      name,
      score: data.score,
      highlightColor: data.highlightColor || null,
    }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 50);
  }

  function updateLeaderboard(value) {
    const entryName = sanitizeName(playerName) || "Spieler";
    if (entryName === "WIPE") {
      leaderboard = [];
      try {
        localStorage.setItem("jumping-nexus-leaderboard", JSON.stringify(leaderboard));
      } catch (_) {
        /* ignore */
      }
      saveLeaderboardToApi({ wipe: true });
      return;
    }
    if (!Number.isFinite(value) || value <= 0) return;
    const entry = { name: entryName, score: value };
    leaderboard = normalizeLeaderboard([...leaderboard, entry]);
    try {
      localStorage.setItem("jumping-nexus-leaderboard", JSON.stringify(leaderboard));
    } catch (_) {
      /* ignore */
    }
    saveLeaderboardToApi(entry);
  }

  function scheduleNextScoreTaunt(fromScore = score) {
    if (fromScore < SCORE_TAUNT_MIN) {
      nextScoreTaunt = SCORE_TAUNT_MIN + Math.floor(Math.random() * 3);
      return;
    }
    const step =
      SCORE_TAUNT_STEP_MIN +
      Math.floor(Math.random() * (SCORE_TAUNT_STEP_MAX - SCORE_TAUNT_STEP_MIN + 1));
    nextScoreTaunt = Math.min(SCORE_TAUNT_MAX, fromScore + step);
  }

  function checkScoreTaunts() {
    if (nnTauntActive) return false;
    // Note: don't block on phaseTextActive — startNnTaunt picks a different lane
    if (!playerName || !getHighlightInfo(playerName).isHighlight) return false;
    if (score < SCORE_TAUNT_MIN || score > SCORE_TAUNT_MAX) return false;
    if (nextScoreTaunt <= 0) scheduleNextScoreTaunt();
    if (score < nextScoreTaunt) return false;
    const pick = NN_SCORE_TAUNTS[Math.floor(Math.random() * NN_SCORE_TAUNTS.length)];
    startNnTaunt(pick);
    scheduleNextScoreTaunt(score);
    return true;
  }

  function checkPhaseMilestones() {
    if (scoreTauntTimer > 0) return false;
    if (phaseMilestoneCooldown > 0) return false;
    if (inBossFight || bossTransitionActive || pendingBossId) return false;
    const phaseIndex = getPhaseIndex();
    const phaseMilestones = PHASE_MILESTONES_BY_PHASE[phaseIndex];
    if (!phaseMilestones || !phaseMilestones.length) return false;
    const currentIndex = phaseMilestoneIndices[phaseIndex] || 0;
    if (currentIndex >= phaseMilestones.length) return false;
    const phaseEnd =
      PHASE_END_SCORES[phaseIndex] !== undefined && PHASE_END_SCORES[phaseIndex] !== null
        ? PHASE_END_SCORES[phaseIndex]
        : Infinity;
    if (score >= phaseEnd) return false;
    const milestone = phaseMilestones[currentIndex];
    if (!milestone || score < milestone.score) return false;
    scoreTauntText = milestone.text;
    scoreTauntTimer = SCORE_TAUNT_DURATION;
    phaseMilestoneCooldown = PHASE_MILESTONE_COOLDOWN;
    phaseMilestoneIndices[phaseIndex] = currentIndex + 1;
    return true;
  }

  function wrapTextLines(text, maxWidth) {
    if (!text) return [];
    const rawLines = String(text).split(/\r?\n/);
    const lines = [];
    ctx.save();
    ctx.font = `600 ${BOSS_STORY_FONT_SIZE}px ${SECONDARY_FONT}`;
    for (const raw of rawLines) {
      if (!raw.trim()) {
        lines.push("");
        continue;
      }
      const words = raw.split(/\s+/);
      let line = "";
      for (const word of words) {
        const test = line ? `${line} ${word}` : word;
        if (ctx.measureText(test).width > maxWidth && line) {
          lines.push(line);
          line = word;
        } else {
          line = test;
        }
      }
      if (line) lines.push(line);
    }
    ctx.restore();
    return lines;
  }

  function setPendingBossStory(id) {
    const text = BOSS_STORIES[id] || "Boss-Intro folgt...";
    pendingBossStoryLines = wrapTextLines(text, WORLD_W * 0.72);
    pendingBossStoryIndex = 0;
    pendingBossStoryTimer = 0;
    pendingBossStoryCursorTimer = 0;
    pendingBossStoryCursorOn = true;
    pendingBossStoryLineInterval = 1.3;
    pendingBossStoryCharRate = 55;
    pendingBossStoryRevealChars = 0;
    pendingBossStoryLineEnds = [];
    bossAwaitingConfirm = false;
    let totalChars = 0;
    for (const line of pendingBossStoryLines) {
      totalChars += line.length;
      pendingBossStoryLineEnds.push(totalChars);
    }
    pendingBossStoryTotalChars = totalChars;
    bossCountdown = Math.max(6, pendingBossStoryTotalChars / pendingBossStoryCharRate + 1.4);
    scoreTauntTimer = 0;
    scoreTauntText = "";
  }

  function updatePendingBossStory(dt) {
    if (!pendingBossId) return;
    if (!bossAwaitingConfirm && !bossTransitionActive) {
      pendingBossStoryRevealChars = Math.min(
        pendingBossStoryTotalChars,
        pendingBossStoryRevealChars + dt * pendingBossStoryCharRate
      );
      if (pendingBossStoryRevealChars >= pendingBossStoryTotalChars) {
        bossAwaitingConfirm = true;
      }
    }
    pendingBossStoryCursorTimer += dt;
    if (pendingBossStoryCursorTimer >= 0.45) {
      pendingBossStoryCursorTimer = 0;
      pendingBossStoryCursorOn = !pendingBossStoryCursorOn;
    }
  }

  function revealNextBossStoryLine() {
    if (!pendingBossId || bossAwaitingConfirm || !pendingBossStoryLineEnds.length) return;
    const current = Math.floor(pendingBossStoryRevealChars);
    for (const end of pendingBossStoryLineEnds) {
      if (end > current) {
        pendingBossStoryRevealChars = end;
        return;
      }
    }
    if (pendingBossStoryRevealChars >= pendingBossStoryTotalChars) {
      bossAwaitingConfirm = true;
    }
  }

  function getPhaseIndex() {
    let idx = 0;
    if (boss1Defeated) idx = 1;
    if (boss2Defeated) idx = 2;
    if (boss3Defeated) idx = 3;
    if (boss4Defeated) idx = 4;
    if (boss5Defeated) idx = 5;
    if (boss6Defeated) idx = 6;
    return Math.min(idx, PHASE_TEXTS.length - 1);
  }

  function setPhaseTextLine(phaseIndex, lineIndex) {
    const phase = PHASE_TEXTS[phaseIndex];
    if (!phase || !phase.lines || !phase.lines.length) {
      phaseTextActive = false;
      phaseTextLine = "";
      phaseTextWidth = 0;
      return;
    }
    phaseTextLine = phase.lines[lineIndex] || phase.title || "";
    phaseTextX = WORLD_W + 20;
    phaseTextY = 140 + (lineIndex % 5) * PHASE_TEXT_LINE_GAP;
    ctx.save();
    ctx.font = PHASE_TEXT_FONT;
    phaseTextWidth = ctx.measureText(phaseTextLine).width;
    ctx.restore();
  }

  function startPhaseText(phaseIndex) {
    const phase = PHASE_TEXTS[phaseIndex];
    if (!phase || !phase.lines || !phase.lines.length) {
      phaseTextDone[phaseIndex] = true;
      return;
    }
    phaseTextIndex = 0;
    phaseTextActive = true;
    setPhaseTextLine(phaseIndex, phaseTextIndex);
  }

  function updatePhaseText(dt) {
    if (!gameRunning || gameOver) return;
    if (inBossFight || bossTransitionActive || pendingBossId) return;

    const phaseIndex = getPhaseIndex();
    if (phaseIndex !== phaseTextPhase) {
      phaseTextPhase = phaseIndex;
      phaseTextIndex = 0;
      phaseTextActive = false;
    }

    if (phaseTextDone[phaseIndex]) return;
    if (!phaseTextActive) startPhaseText(phaseIndex);
    if (!phaseTextActive) return;

    phaseTextX -= PHASE_TEXT_SPEED * dt;
    if (phaseTextX + phaseTextWidth < -40) {
      phaseTextIndex += 1;
      if (phaseTextIndex >= PHASE_TEXTS[phaseIndex].lines.length) {
        phaseTextDone[phaseIndex] = true;
        phaseTextActive = false;
        return;
      }
      setPhaseTextLine(phaseIndex, phaseTextIndex);
    }
  }

  function startNnTaunt(text) {
    if (!text) return;
    const totalLanes = 5;
    const reservedLane = phaseTextActive
      ? Math.max(0, Math.min(totalLanes - 1, Math.round((phaseTextY - 140) / PHASE_TEXT_LINE_GAP)))
      : -1;
    let lane = Math.floor(Math.random() * totalLanes);
    for (let i = 0; i < totalLanes; i++) {
      const candidate = (lane + i) % totalLanes;
      if (candidate === reservedLane || candidate === nnTauntLane) continue;
      lane = candidate;
      break;
    }
    nnTauntLane = lane;
    nnTauntText = text;
    nnTauntX = WORLD_W + 20;
    nnTauntY = 140 + nnTauntLane * PHASE_TEXT_LINE_GAP;
    ctx.save();
    ctx.font = PHASE_TEXT_FONT;
    nnTauntWidth = ctx.measureText(nnTauntText).width;
    ctx.restore();
    nnTauntActive = true;
  }

  function updateNnTaunt(dt) {
    if (!nnTauntActive) return;
    if (inBossFight || bossTransitionActive || pendingBossId) return;
    nnTauntX -= NN_TAUNT_SPEED * dt;
    if (nnTauntX + nnTauntWidth < -40) {
      nnTauntActive = false;
      nnTauntText = "";
    }
  }

  function applyDamage(amount, options = {}) {
    if (!Number.isFinite(amount) || amount <= 0) return;
    const { ignoreInvincible = false } = options;
    if (player.invincible && !ignoreInvincible) return;
    if (player.shieldHits > 0 || player.shieldTimer > 0) {
      player.shieldHits = 0;
      player.shieldTimer = 0;
      player.shieldInvTimer = 2;
      player.debuffGraceTimer = 0.4;
      return;
    }
    if (player.shieldCharge > 0) {
      const absorbed = Math.min(player.shieldCharge, amount);
      player.shieldCharge -= absorbed;
      amount -= absorbed;
      if (amount <= 0) return;
    }
    player.hp -= amount;
    sfxHit();
    playerHitFlash = 5;
    addShake(4, 9);
    player.debuffGraceTimer = 0.6;
    if (player.hp <= 0) {
      addShake(10, 6);
      endGame();
    }
  }

  function clampPlayerState() {
    if (!Number.isFinite(player.x)) player.x = 200;
    if (!Number.isFinite(player.y)) player.y = WORLD_H / 2;
    if (!Number.isFinite(player.vy)) player.vy = 0;
    if (!Number.isFinite(player.radius) || player.radius <= 0) player.radius = player.baseRadius;
    if (!Number.isFinite(player.hp)) player.hp = player.maxHp;
    player.hp = Math.min(player.maxHp, Math.max(0, player.hp));
  }

  function circleRectCollision(px, py, pr, rx, ry, rw, rh) {
    const cx = Math.max(rx, Math.min(px, rx + rw));
    const cy = Math.max(ry, Math.min(py, ry + rh));
    const dx = px - cx;
    const dy = py - cy;
    return dx * dx + dy * dy <= pr * pr;
  }

  // ======================================================
  //  Powerups
  // ======================================================
  function randomPowerup(phaseIndex = getPhaseIndex()) {
    // scoreRush is reserved for golden boxes only
    const base = ["ghost", "shrink", "double", "big", "shield", "magnet", "regen"];
    if (phaseIndex >= 4) {
      base.push("shield", "double", "shield");
    } else if (phaseIndex >= 2) {
      base.push("shield", "ghost", "magnet");
    }
    return base[Math.floor(Math.random() * base.length)];
  }

  function randomBossPowerup(bossId = 1) {
    const roll = Math.random();
    if (bossId >= 5) {
      if (roll < 0.2) return "bossshield";
      if (roll < 0.35) return "bossheal";
      if (roll < 0.55) return "beam";
      if (roll < 0.8) return "spread";
      return "salvo";
    }
    if (bossId >= 4) {
      if (roll < 0.25) return "bossshield";
      if (roll < 0.45) return "bossheal";
      if (roll < 0.65) return "beam";
      if (roll < 0.85) return "spread";
      return "salvo";
    }
    if (roll < 0.35) return "bossshield";
    if (roll < 0.6) return "bossheal";
    if (roll < 0.75) return "beam";
    if (roll < 0.9) return "spread";
    return "salvo";
  }

  function applyPowerup(type) {
    const colors = {
      ghost: "rgba(160,220,255,1)",
      shrink: "rgba(120,255,180,1)",
      slow: "rgba(150,255,150,1)",
      double: "rgba(255,230,120,1)",
      big: "rgba(255,110,110,1)",
      shield: "rgba(120,200,255,1)",
      turbo: "rgba(255,170,80,1)",
      magnet: "rgba(255,136,221,1)",
      regen: "rgba(120,255,180,1)",
      scoreRush: "rgba(255,204,0,1)",
      multiShot: "rgba(170,221,255,1)",
      beam: "rgba(255,200,120,1)",
      spread: "rgba(200,180,255,1)",
    };

    if (type === "ghost") {
      player.ghostTimer += DURATIONS.ghost;
      player.invincible = true;
    } else if (type === "shrink") {
      player.bigTimer = 0;
      player.shrinkTimer += DURATIONS.shrink;
    } else if (type === "slow") {
      player.slowTimer += DURATIONS.slow;
    } else if (type === "double") {
      player.doubleTimer += DURATIONS.double;
    } else if (type === "big") {
      player.shrinkTimer = 0;
      player.bigTimer += DURATIONS.big;
    } else if (type === "shield") {
      player.shieldHits = 1;
      player.shieldTimer = 0;
      player.invincible = false;
    } else if (type === "turbo") {
      player.turboTimer += DURATIONS.turbo;
    } else if (type === "magnet") {
      player.magnetTimer += DURATIONS.magnet;
    } else if (type === "regen") {
      player.hp = Math.min(player.maxHp, player.hp + 1);
      scorePopups.push({ x: player.x, y: player.y - 40, life: 1.0, text: '+1 HP' });
    } else if (type === "scoreRush") {
      player.scoreRushTimer += DURATIONS.scoreRush;
      scorePopups.push({ x: player.x, y: player.y - 40, life: 1.2, text: 'Score-Rush!' });
    } else if (type === "multiShot") {
      player.multiShotTimer += DURATIONS.multiShot;
    } else if (type === "bossshield") {
      player.shieldHits = 1;
      player.shieldTimer = 0;
    } else if (type === "bossheal") {
      player.hp = Math.min(player.maxHp, player.hp + 1);
    } else if (type === "beam") {
      player.weaponMode = "beam";
      player.ammoRapid = 15;
      player.ammoSpread = 0;
      player.ammoSalvo = 0;
    } else if (type === "rapid") {
      player.weaponMode = "beam";
      player.ammoRapid = 15;
      player.ammoSpread = 0;
      player.ammoSalvo = 0;
    } else if (type === "spread") {
      player.weaponMode = "spread";
      player.ammoSpread = 20;
      player.ammoRapid = 0;
      player.ammoSalvo = 0;
    } else if (type === "salvo") {
      player.weaponMode = "salvo";
      player.ammoSalvo = 18;
      player.ammoRapid = 0;
      player.ammoSpread = 0;
    }

    if (type === "big") {
      player.debuffGraceTimer = Math.max(player.debuffGraceTimer, 1.2);
    }

    // Pickupeffekt
    player.pickupFlashTimer = 0.35;
    player.pickupFlashColor = colors[type] || "rgba(255,255,255,0.9)";

    // Small chance for legendary glow
    if (!player.legendary && Math.random() < 0.12) {
      player.legendary = true;
    }
  }

  function updatePowerupTimers(dt) {
    if (player.ghostTimer > 0) {
      player.ghostTimer -= dt;
      if (player.ghostTimer <= 0) {
        player.ghostTimer = 0;
      }
    }

    if (player.shrinkTimer > 0) {
      player.shrinkTimer -= dt;
      if (player.shrinkTimer < 0) player.shrinkTimer = 0;
    }

    if (player.slowTimer > 0) {
      player.slowTimer -= dt;
      if (player.slowTimer < 0) player.slowTimer = 0;
    }

    if (player.doubleTimer > 0) {
      player.doubleTimer -= dt;
      if (player.doubleTimer < 0) player.doubleTimer = 0;
    }

    if (player.bigTimer > 0) {
      player.bigTimer -= dt;
      if (player.bigTimer < 0) player.bigTimer = 0;
    }

    if (player.shieldTimer > 0) {
      player.shieldTimer -= dt;
      if (player.shieldTimer < 0) player.shieldTimer = 0;
    }

    if (player.turboTimer > 0) {
      player.turboTimer -= dt;
      if (player.turboTimer < 0) player.turboTimer = 0;
    }

    if (player.magnetTimer > 0) {
      player.magnetTimer -= dt;
      if (player.magnetTimer < 0) player.magnetTimer = 0;
    }

    if (player.multiShotTimer > 0) {
      player.multiShotTimer -= dt;
      if (player.multiShotTimer < 0) player.multiShotTimer = 0;
    }

    if (player.scoreRushTimer > 0) {
      player.scoreRushTimer -= dt;
      if (player.scoreRushTimer < 0) player.scoreRushTimer = 0;
    }

    if (player.debuffGraceTimer > 0) {
      player.debuffGraceTimer -= dt;
      if (player.debuffGraceTimer < 0) player.debuffGraceTimer = 0;
    }
    if (player.lockTimer > 0) {
      player.lockTimer -= dt;
      if (player.lockTimer < 0) player.lockTimer = 0;
    }

    if (player.beamGraceTimer > 0) {
      player.beamGraceTimer -= dt;
      if (player.beamGraceTimer < 0) player.beamGraceTimer = 0;
    }

    if (player.shieldInvTimer > 0) {
      player.shieldInvTimer -= dt;
      if (player.shieldInvTimer < 0) player.shieldInvTimer = 0;
    }

    // Invincible nur bei Ghost oder Schild-Invul-Fenster
    player.invincible = player.ghostTimer > 0 || player.shieldInvTimer > 0 || player.shieldTimer > 0;

    const lockScale = player.lockTimer > 0 ? 0.65 : 1.0;
    player.jumpStrength = player.baseJumpStrength * (player.turboTimer > 0 ? 1.1 : 1.0) * lockScale;

    // Color pulse decay
    if (player.colorPulseTimer > 0) {
      player.colorPulseTimer -= dt;
      if (player.colorPulseTimer < 0) player.colorPulseTimer = 0;
    }

    if (player.spinTimer > 0) {
      player.spinTimer -= dt;
      if (player.spinTimer < 0) player.spinTimer = 0;
    }

    if (player.pickupFlashTimer > 0) {
      player.pickupFlashTimer -= dt;
      if (player.pickupFlashTimer < 0) player.pickupFlashTimer = 0;
    }

    if (finalCongratsTimer > 0) {
      finalCongratsTimer -= dt;
      if (finalCongratsTimer < 0) finalCongratsTimer = 0;
    }

    // Adjust radius based on active effects
    const base = player.baseRadius;
    if (player.bigTimer > 0 && player.shrinkTimer === 0) {
      player.radius = base * 1.22;
    } else if (player.shrinkTimer > 0 && player.bigTimer === 0) {
      player.radius = base * 0.75;
    } else if (player.bigTimer > 0 && player.shrinkTimer > 0) {
      player.radius = base;
    } else {
      player.radius = base;
    }
  }

  // ======================================================
  //  Pipes & Lootboxes
  // ======================================================
  function spawnPipe() {
    const minGapY = pipeMargin;
    let gapSize = Math.max(pipeGap, minPipeGap);
    // Nur wenn eine Ghost-Lootbox zuletzt erzeugt wurde, einmal engeres Gap erzeugen
    if (ghostChallenge && !inBossFight) {
      gapSize = Math.max(240, player.radius * 4.4);
      ghostChallenge = false;
    }
    const maxGapY = WORLD_H - pipeMargin - gapSize;
    const baseY = lastGapY === null ? WORLD_H / 2 - gapSize / 2 : lastGapY;
    const rawTargetY = baseY + (Math.random() - 0.5) * 70;
    const maxDelta = Math.max(70, gapSize * 0.35);
    const limitedTargetY = lastGapY === null
      ? rawTargetY
      : Math.max(lastGapY - maxDelta, Math.min(lastGapY + maxDelta, rawTargetY));
    const gapY = Math.max(minGapY, Math.min(maxGapY, limitedTargetY));
    lastGapY = gapY;

    pipes.push({
      x: WORLD_W + 60,
      gapY,
      vy: (Math.random() * 10 + 8) * (Math.random() < 0.5 ? -1 : 1),
      passed: false,
    });
  }

  function spawnLootbox(pipe) {
    if (Math.random() < lootSpawnChance) {
      // 25% chance for a golden risky box — spawns between pipes (not in the gap)
      const isGolden = Math.random() < 0.25;
      let centerY, type, goldenAtTop, offsetX;
      if (isGolden) {
        goldenAtTop = false;
        // Patrols vertically between the pipes (full safe-area range, fast oscillation)
        centerY = WORLD_H / 2;
        offsetX = pipeSpawnInterval * pipeSpeed * 0.5;
        type = "scoreRush";
      } else {
        centerY = pipe.gapY + pipeGap / 2;
        offsetX = pipeWidth / 2;
        type = randomPowerup(getPhaseIndex());
      }
      if (type === "ghost") ghostChallenge = true;
      lootboxes.push({
        x: pipe.x + offsetX,
        y: centerY,
        baseY: centerY,
        goldenAtTop,
        pipeOffsetX: offsetX,
        swayPhase: Math.random() * Math.PI * 2,
        swayAmp: isGolden ? 150 : 26 + Math.random() * 18,
        size: Math.round(63 * SIZE_SCALE),
        collected: false,
        type,
        golden: isGolden,
        moveset: isGolden ? Math.floor(Math.random() * 4) : 0,
        img: assets.lootbox,
        pipe,
      });
    }
  }

  function updatePipes(dt) {
    pipeSpawnTimer += dt;
    if (pipeSpawnTimer >= pipeSpawnInterval) {
      pipeSpawnTimer = 0;
      const p = {
        x: WORLD_W + 30,
        gapY: pipeMargin + Math.random() * Math.max(40, WORLD_H - pipeMargin * 2 - Math.max(pipeGap, minPipeGap)),
        vy: (Math.random() < 0.5 ? 1 : -1) * 12,
        passed: false,
      };
      pipes.push(p);
      spawnLootbox(p);
    }

    const speedMult = player.slowTimer > 0 ? 0.5 : 1.0;
    const spd = pipeSpeed * speedMult;

    for (let i = pipes.length - 1; i >= 0; i--) {
      const p = pipes[i];
      p.x -= spd * dt;
      p.gapY += p.vy * dt;

      if (p.gapY < pipeMargin || p.gapY > WORLD_H - pipeMargin - pipeGap) {
        p.vy *= -1;
      }

      if (!p.passed && p.x + pipeWidth < player.x - player.radius) {
        p.passed = true;
        // ScoreRush adds +1 first, then double multiplies — (1 + rush) * mult
        const baseAdd = 1 + (player.scoreRushTimer > 0 ? 1 : 0);
        const add = baseAdd * (player.doubleTimer > 0 ? 2 : 1);
        score += add;
        scorePopups.push({ x: player.x, y: player.y - 30, life: 0.75, text: `+${add}` });
        const hueStep = Math.floor(score / 10);
        if (hueStep > lastScoreHueStep) {
          lastScoreHueStep = hueStep;
          player.colorShift = (player.colorShift + 60) % 360;
          player.colorPulseTimer = 1.0;
        }
        pipeSpeed += 0.32;
        if (pipeGap > minPipeGap) {
          pipeGap = Math.max(minPipeGap, pipeGap - 0.04);
        }
        if (!checkPhaseMilestones()) {
          checkScoreTaunts();
        }
        checkBossTriggers();
      }

      if (p.x + pipeWidth < -80) pipes.splice(i, 1);
    }
  }

  function updateLootboxes(dt) {
    const speedMult = player.slowTimer > 0 ? 0.5 : 1.0;
    const spd = pipeSpeed * speedMult * (inBossFight ? 1.2 : 1.0);
    lootSwayTimer += dt;

    for (let i = lootboxes.length - 1; i >= 0; i--) {
      const b = lootboxes[i];
      // Compute pattern offsets — golden boxes randomly pick one of 4 movesets at spawn
      let xOff = 0, yOff;
      if (b.golden) {
        const tt = lootSwayTimer + b.swayPhase;
        if (b.moveset === 0) {
          // Z-trace (zigzag with horizontal sway)
          const zPeriod = 3.0;
          const p = (((tt) / zPeriod) % 1 + 1) % 1;
          let xR, yR;
          if (p < 0.25)        { const u = p / 0.25;          xR = -1 + u * 2; yR = -1; }
          else if (p < 0.50)   { const u = (p - 0.25) / 0.25; xR =  1 - u * 2; yR = -1 + u * 2; }
          else if (p < 0.75)   { const u = (p - 0.50) / 0.25; xR = -1 + u * 2; yR =  1; }
          else                 { const u = (p - 0.75) / 0.25; xR =  1 - u * 2; yR =  1 - u * 2; }
          xOff = xR * 110;
          yOff = yR * b.swayAmp;
        } else if (b.moveset === 1) {
          // Circle orbit
          xOff = Math.cos(tt * 1.3) * 110;
          yOff = Math.sin(tt * 1.3) * b.swayAmp;
        } else if (b.moveset === 2) {
          // Figure-8 / infinity (Lissajous 1:2)
          xOff = Math.sin(tt * 1.3) * 130;
          yOff = Math.sin(tt * 2.6) * b.swayAmp * 0.85;
        } else {
          // Diamond rotation: top → right → bottom → left → top
          const period = 3.2;
          const p = (((tt) / period) % 1 + 1) % 1;
          let xR, yR;
          if (p < 0.25)        { const u = p / 0.25;          xR = u;      yR = -1 + u; }
          else if (p < 0.50)   { const u = (p - 0.25) / 0.25; xR = 1 - u;  yR = u; }
          else if (p < 0.75)   { const u = (p - 0.50) / 0.25; xR = -u;     yR = 1 - u; }
          else                 { const u = (p - 0.75) / 0.25; xR = -1 + u; yR = -u; }
          xOff = xR * 110;
          yOff = yR * b.swayAmp;
        }
      } else {
        yOff = Math.sin(lootSwayTimer * 2 + b.swayPhase) * b.swayAmp;
      }

      // 1) Magnet pull — when in range, OVERRIDES natural motion entirely
      //    Pull speed always >= 200 px/s (= world scroll), so a box behind the
      //    player can't get "pushed away" by the world while pull is weak at edge.
      let magnetTookOver = false;
      if (player.magnetTimer > 0 && !b.collected) {
        const mdx = player.x - b.x;
        const mdy = player.y - b.y;
        const mdist = Math.sqrt(mdx * mdx + mdy * mdy);
        const magnetRange = 280;
        if (mdist < magnetRange && mdist > 1) {
          const t = 1 - mdist / magnetRange;
          const pullSpeed = 220 + t * 600;       // 220 at edge, 820 near center
          b.x += (mdx / mdist) * pullSpeed * dt;
          b.y += (mdy / mdist) * pullSpeed * dt;
          if (b.pipe) { b.baseY = b.y; b.pipe = null; }
          magnetTookOver = true;
        }
      }

      // 2) Natural motion — only if magnet didn't take over this frame
      if (!magnetTookOver) {
        if (b.pipe) {
          b.x = b.pipe.x + (b.pipeOffsetX !== undefined ? b.pipeOffsetX : pipeWidth / 2) + xOff;
          if (b.golden) {
            b.y = b.baseY + yOff;
          } else {
            b.y = b.pipe.gapY + pipeGap / 2 + yOff;
          }
        } else {
          b.x -= spd * dt;
          b.y = b.baseY + yOff;
        }
      }

      const dx = player.x - b.x;
      const dy = player.y - b.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (!b.collected && dist < player.radius + b.size * 0.6) {
        b.collected = true;
        sfxPickup();
        const colors = {
          ghost: "rgba(160,220,255,1)",
          shrink: "rgba(120,255,180,1)",
          slow: "rgba(150,255,150,1)",
          double: "rgba(255,230,120,1)",
          big: "rgba(255,110,110,1)",
          shield: "rgba(120,200,255,1)",
          turbo: "rgba(255,170,80,1)",
          magnet: "rgba(255,136,221,1)",
          regen: "rgba(140,255,180,1)",
          scoreRush: "rgba(255,204,0,1)",
          multiShot: "rgba(170,221,255,1)",
          bossheal: "rgba(140,255,200,1)",
          bossshield: "rgba(160,220,255,1)",
        };
        applyPowerup(b.type);
        spawnExplosion(b.x, b.y, colors[b.type] || "rgba(0,255,255,1)", 1.6);
        lootboxes.splice(i, 1);
        continue;
      }

      // Detach from a pipe that has scrolled off — keeps the box scrolling normally
      // until it leaves the screen (important for golden boxes which can be far from their pipe)
      if (b.pipe && b.pipe.x + pipeWidth < -80) {
        b.baseY = b.y;
        b.pipe = null;
      }
      if (b.x < -120) {
        lootboxes.splice(i, 1);
      }
    }
  }

  function checkCollisions() {
    for (const p of pipes) {
      if (
        circleRectCollision(player.x, player.y, player.radius, p.x, 0, pipeWidth, p.gapY) ||
        circleRectCollision(player.x, player.y, player.radius, p.x, p.gapY + pipeGap, pipeWidth, WORLD_H)
      ) {
        if (player.shieldHits > 0 || player.shieldTimer > 0) {
          applyDamage(1, { ignoreInvincible: true });
          return;
        }
        player.hp = 0;
        endGame();
        return;
      }
    }
  }

  // ======================================================
  //  Bosses & Projectiles
  // ======================================================
  function shootPlayerProjectile() {
    sfxShoot();
    const shots = [];
    if (player.weaponMode === "spread" && player.ammoSpread > 0) {
      player.ammoSpread--;
      shots.push({ angle: -0.18, speed: 520, size: 7 });
      shots.push({ angle: 0, speed: 520, size: 7 });
      shots.push({ angle: 0.18, speed: 520, size: 7 });
      if (player.ammoSpread <= 0) player.weaponMode = "normal";
    } else if (player.weaponMode === "beam" && player.ammoRapid > 0) {
      player.ammoRapid--;
      const beamStartX = player.x + player.radius + 12;
      const beamLen = WORLD_W - beamStartX + 40;
      playerShots.push({
        type: "beam",
        x: beamStartX,
        y: player.y,
        len: beamLen,
        height: 26,
        life: 0.28,
        age: 0,
        hitTimer: 0,
        charge: 0.08,
      });
      if (player.ammoRapid <= 0) player.weaponMode = "normal";
    } else if (player.weaponMode === "salvo" && player.ammoSalvo > 0) {
      player.ammoSalvo--;
      // 360° Salvo: 8 Projektile rundherum
      for (let k = 0; k < 8; k++) {
        const a = (Math.PI * 2 * k) / 8;
        shots.push({ angle: a, speed: 440, size: 7 });
      }
      if (player.ammoSalvo <= 0) player.weaponMode = "normal";
    } else if (player.multiShotTimer > 0) {
      shots.push({ angle: -0.18, speed: 500, size: 6 });
      shots.push({ angle: 0,     speed: 500, size: 6 });
      shots.push({ angle:  0.18, speed: 500, size: 6 });
    } else {
      shots.push({ angle: 0, speed: 500, size: 6 });
    }

    for (const s of shots) {
      playerShots.push({
        x: player.x + player.radius + 10,
        y: player.y,
        vx: s.speed * PROJECTILE_SPEED_SCALE * Math.cos(s.angle),
        vy: s.speed * PROJECTILE_SPEED_SCALE * Math.sin(s.angle),
        size: s.size,
        color: "#ffdd88",
      });
    }

    if (inBossFight && currentBoss) {
      player.hp = Math.min(player.maxHp, player.hp + player.maxHp * 0.02);
    }
  }

  function shootBossProjectile(boss, angle = 0, speed = 440) {
    const scaledSpeed = speed * PROJECTILE_SPEED_SCALE;
    const vx = -Math.cos(angle) * scaledSpeed;
    const vy = Math.sin(angle) * scaledSpeed;
    const isBug = boss && boss.id === 3;
    const projectileType = isBug ? "bug" : Math.random() < 0.25 ? "shard" : Math.random() < 0.5 ? "seeker" : "orb";
    bossShots.push({
      x: boss.x - boss.width / 2,
      y: boss.y,
      vx,
      vy,
      life: 5,
      age: 0,
      size: isBug ? BUG_PROJECTILE_SIZE : 8 + Math.random() * 4,
      type: projectileType,
      img: projectileType === "bug" ? assets.bug : null,
    });
  }

  function createBoss(id) {
    const diff = 1 + bossStage * 0.2;
    if (id === 1) {
      return {
        id: 1,
        x: BOSS_X_BASE,
        y: WORLD_H / 2,
        vy: 0,
        width: 220,
        height: 220,
        hp: Math.round(56 * diff),
        maxHp: Math.round(56 * diff),
        shotTimer: 0,
        shotInterval: (1.0 / (1 + bossStage * 0.05)) * 2.5,
        img: assets.boss1,
        t: 0,
        attackMode: 0,
        attackModeTimer: 0,
        flipSide: 1,
        flipTimer: 0,
        burstCount: 0,
        beamTimer: 0,
        beamState: "idle",
        beamTickTimer: 0,
      };
    }
    if (id === 2) {
    return {
      id: 2,
      x: BOSS_X_BASE,
      y: WORLD_H / 2,
      vy: 0,
      width: 260,
      height: 260,
      hp: Math.round(100 * diff),
      maxHp: Math.round(100 * diff),
      shotTimer: 0,
      shotInterval: (0.65 / (1 + bossStage * 0.08)) * 2.5,
      img: assets.boss2,
      t: 0,
      attackMode: 0,
        attackModeTimer: 0,
        flipSide: 1,
        flipTimer: 0,
        burstCount: 0,
        beamTimer: 0,
        beamState: "idle",
        beamTickTimer: 0,
      };
    }
        if (id === 4) {
      return {
        id: 4,
        x: BOSS_X_BASE,
        y: WORLD_H / 2,
        vy: 0,
        width: 320,
        height: 320,
        hp: Math.round(350 * (1 + bossStage * 0.2)),
        maxHp: Math.round(350 * (1 + bossStage * 0.2)),
        shotTimer: 0,
        shotInterval: 1.1,
        img: assets.boss5,
        t: 0,
        attackMode: 0,
        attackModeTimer: 0,
        flipSide: 1,
        flipTimer: 0,
        burstCount: 0,
        phase: 1,
        phaseTimer: 0,
        cutoverTimer: 22,
        addTimer: 0,
        flickerTimer: 0,
        lockShotTimer: 0,
        delayShotTimer: 0,
      };
    }
    if (id === 5) {
      return {
        id: 5,
        x: BOSS_X_BASE,
        y: WORLD_H / 2,
        vy: 0,
        width: 340,
        height: 340,
        hp: Math.round(450 * (1 + bossStage * 0.2)),
        maxHp: Math.round(450 * (1 + bossStage * 0.2)),
        shotTimer: 0,
        shotInterval: 0.95,
        img: assets.boss4,
        t: 0,
        attackMode: 0,
        attackModeTimer: 0,
        flipSide: 1,
        flipTimer: 0,
        burstCount: 0,
        lockShotTimer: 0,
        delayShotTimer: 0,
        machineGun: false,
        beamTimer: 0,
        beamState: "idle",
        beamTickTimer: 0,
      };
    }
    if (id === 6) {
      return {
        id: 6,
        x: BOSS_X_BASE,
        y: WORLD_H / 2,
        vy: 0,
        width: 380,
        height: 380,
        hp: Math.round(575 * (1 + bossStage * 0.25)),
        maxHp: Math.round(575 * (1 + bossStage * 0.25)),
        shotTimer: 0,
        shotInterval: 0.8,
      img: assets.boss6 && assets.boss6.complete ? assets.boss6 : assets.boss3 && assets.boss3.complete ? assets.boss3 : assets.boss2,
        t: 0,
        attackMode: 0,
        attackModeTimer: 0,
        flipSide: 1,
        flipTimer: 0,
        burstCount: 0,
        lockShotTimer: 0,
        delayShotTimer: 0,
        bigBugCooldown: 0,
        machineGun: false,
        beamTimer: 0,
        beamState: "idle",
        beamTickTimer: 0,
      };
    }
    return {
      id: 3,
      x: BOSS_X_BASE,
      y: WORLD_H / 2,
      vy: 0,
      width: 300,
      height: 300,
      hp: Math.round(225 * (1 + bossStage * 0.12)),
      maxHp: Math.round(225 * (1 + bossStage * 0.12)),
      shotTimer: 0,
      shotInterval: (0.65 / (1 + bossStage * 0.1)) * 2.5,
      img: assets.boss3 && assets.boss3.complete ? assets.boss3 : assets.boss2,
      t: 0,
      attackMode: 0,
      attackModeTimer: 0,
      flipSide: 1,
      flipTimer: 0,
      burstCount: 0,
      bigBugCooldown: 0,
      phase: 1,
      phaseTimer: 0,
      slicerCooldown: 0,
      mineCooldown: 0,
      beamTimer: 0,
      beamState: "idle",
      beamTickTimer: 0,
    };
  }

  function startBossFight(id) {
    inBossFight = true;
    currentBoss = createBoss(id);
    _musicPlay('bossEncounter');
    nnTauntActive = false;
    nnTauntText = "";
    currentBoss.lootTimer = 1.6;
    bossLoot.length = 0;
    bossObstacles.length = 0;
    pipes.length = 0;
    lootboxes.length = 0;
    playerShots.length = 0;
    bossShots.length = 0;
    bossLoot.length = 0;
    bossObstacles.length = 0;
    pipeSpeed = basePipeSpeed;

    // Alle aktiven Powerups beim Start des Bossfights entfernen
    Object.assign(player, {
      ghostTimer: 0,
      shrinkTimer: 0,
      slowTimer: 0,
      doubleTimer: 0,
      bigTimer: 0,
      shieldTimer: 0,
      shieldHits: 0,
      turboTimer: 0,
      magnetTimer: 0,
      multiShotTimer: 0,
      scoreRushTimer: 0,
      debuffGraceTimer: 0,
      lockTimer: 0,
      vy: 0,
      invincible: false,
      radius: player.baseRadius,
      hp: player.maxHp,
    });
    bossSpawnGraceTimer = 1.5;
  }

  function defeatBoss(id) {
    if (!currentBoss) return;
    spawnBossDeathExplosion(currentBoss.x, currentBoss.y);
    sfxBossDeath();

    if (id === 1) {
      boss1Defeated = true;
      score += 10;
      scorePopups.push({ x: WORLD_W / 2, y: WORLD_H / 2 - 60, life: 1.2, text: '+10 BOSS BESIEGT!' });
      if (!checkPhaseMilestones()) checkScoreTaunts();
    } else if (id === 2) {
      boss2Defeated = true;
      score += 20;
      scorePopups.push({ x: WORLD_W / 2, y: WORLD_H / 2 - 60, life: 1.2, text: '+20 BOSS BESIEGT!' });
      if (!checkPhaseMilestones()) checkScoreTaunts();
    } else if (id === 3) {
      boss3Defeated = true;
      score += 30;
      scorePopups.push({ x: WORLD_W / 2, y: WORLD_H / 2 - 60, life: 1.2, text: '+30 BOSS BESIEGT!' });
      if (!checkPhaseMilestones()) checkScoreTaunts();
      finalCongratsTimer = 8;
    } else if (id === 4) {
      boss4Defeated = true;
      score += 40;
      scorePopups.push({ x: WORLD_W / 2, y: WORLD_H / 2 - 60, life: 1.2, text: '+40 BOSS BESIEGT!' });
      if (!checkPhaseMilestones()) checkScoreTaunts();
      finalCongratsTimer = 8;
    } else if (id === 5) {
      boss5Defeated = true;
      score += 50;
      scorePopups.push({ x: WORLD_W / 2, y: WORLD_H / 2 - 60, life: 1.2, text: '+50 BOSS BESIEGT!' });
      if (!checkPhaseMilestones()) checkScoreTaunts();
      finalCongratsTimer = 8;
    } else if (id === 6) {
      boss6Defeated = true;
      score += 60;
      scorePopups.push({ x: WORLD_W / 2, y: WORLD_H / 2 - 60, life: 1.2, text: '+60 BOSS BESIEGT!' });
      if (!checkPhaseMilestones()) checkScoreTaunts();
      finalCongratsTimer = 8;
    }

    const postBossReward =
      id === 2 ? "shield" :
      id === 3 ? "spread" :
      id === 4 ? "beam" :
      id === 5 ? "salvo" :
      id === 6 ? "bossshield" :
      null;
    if (postBossReward) applyPowerup(postBossReward);

    // Bonus-Leben als Schild (ein Treffer)
    player.shieldHits = 1;
    player.shieldTimer = 0;
    player.invincible = false;
    player.debuffGraceTimer = 0.2;

    inBossFight = false;
    currentBoss = null;
    bossShots.length = 0;
    playerShots.length = 0;
    bossLoot.length = 0;
    bossObstacles.length = 0;
    bossStage += 1; // Progression

    if (id === 6) {
      gameWon = true;
      gameRunning = true;
      gameOver = false; // Weiterfliegen für Highscore
      _musicPlay('nnAnthem');
    } else {
      audio._mainThemeIdx++;
      _musicPlay('mainTheme');
    }
  }

  function checkBossTriggers() {
    if (inBossFight) return;
    const threshold = Math.floor(score / BOSS_INTERVAL);

    if (score >= BOSS1_SCORE && !boss1Spawned && !boss1Defeated && threshold >= 1) {
      boss1Spawned = true;
      pendingBossId = 1;
      player.vy = 0;
      player.debuffGraceTimer = 0.2;
      setPendingBossStory(1);
    } else if (score >= BOSS2_SCORE && !boss2Spawned && !boss2Defeated && threshold >= 2) {
      boss2Spawned = true;
      pendingBossId = 2;
      player.vy = 0;
      player.debuffGraceTimer = 0.2;
      setPendingBossStory(2);
    } else if (score >= BOSS3_SCORE && !boss3Spawned && !boss3Defeated && threshold >= 3) {
      boss3Spawned = true;
      pendingBossId = 3;
      player.vy = 0;
      player.debuffGraceTimer = 0.2;
      setPendingBossStory(3);
    } else if (score >= BOSS4_SCORE && !boss4Spawned && !boss4Defeated && threshold >= 4) {
      boss4Spawned = true;
      pendingBossId = 4;
      player.vy = 0;
      player.debuffGraceTimer = 0.2;
      setPendingBossStory(4);
    } else if (score >= BOSS5_SCORE && !boss5Spawned && !boss5Defeated && threshold >= 5) {
      boss5Spawned = true;
      pendingBossId = 5;
      player.vy = 0;
      player.debuffGraceTimer = 0.2;
      setPendingBossStory(5);
    } else if (score >= BOSS6_SCORE && !boss6Spawned && !boss6Defeated && threshold >= 6) {
      boss6Spawned = true;
      pendingBossId = 6;
      player.vy = 0;
      player.debuffGraceTimer = 0.2;
      setPendingBossStory(6);
      _musicPlay('preFinalBoss');
    }
  }

  function updateBoss(dt) {
    if (!inBossFight || !currentBoss || gameOver) return;

    const boss = currentBoss;
    boss.t += dt;
    const hpRatioMove = boss.maxHp > 0 ? boss.hp / boss.maxHp : 0;
    let newX, newY;
    if (boss.id === 1) {
      newY = WORLD_H / 2 + Math.sin(boss.t * 0.9) * 100 + Math.sin(boss.t * 2.1) * 22;
      newX = BOSS_X_BASE + Math.sin(boss.t * 0.5) * BOSS_X_WOBBLE;
    } else if (boss.id === 2) {
      newY = WORLD_H / 2 + Math.sin(boss.t * 1.4) * 110 + Math.sin(boss.t * 3.1) * 28;
      newX = BOSS_X_BASE + Math.sin(boss.t * 0.75) * (BOSS_X_WOBBLE * 1.5);
    } else if (boss.id === 3) {
      newY = WORLD_H / 2 + Math.sin(boss.t * 2.1) * 88 + Math.sin(boss.t * 5.0) * 18;
      newX = BOSS_X_BASE + Math.sin(boss.t * 1.2) * BOSS_X_WOBBLE;
    } else if (boss.id === 4) {
      newY = WORLD_H / 2 + Math.sin(boss.t * 0.65) * 135;
      newX = BOSS_X_BASE + Math.sin(boss.t * 0.38) * BOSS_X_WOBBLE;
    } else if (boss.id === 5) {
      newY = WORLD_H / 2 + Math.sin(boss.t * 1.05) * 148 + Math.sin(boss.t * 1.85) * 38;
      newX = BOSS_X_BASE + Math.sin(boss.t * 0.82) * (BOSS_X_WOBBLE * 1.3);
    } else if (boss.id === 6) {
      const fury = 1 + (1 - hpRatioMove) * 0.55;
      newY = WORLD_H / 2 + Math.sin(boss.t * 1.25 * fury) * 125 + Math.sin(boss.t * 2.7 * fury) * 33;
      newX = BOSS_X_BASE + Math.sin(boss.t * 0.92 * fury) * (BOSS_X_WOBBLE * 1.8);
    } else {
      newY = WORLD_H / 2 + Math.sin(boss.t * 1.1) * 120;
      newX = BOSS_X_BASE + Math.sin(boss.t * 0.6) * BOSS_X_WOBBLE;
    }
    boss.y = Math.max(80, Math.min(WORLD_H - 80, newY));
    boss.x = Math.max(WORLD_W - 160, Math.min(WORLD_W - 20, newX));

    if (boss.id === 4) {
      boss.phaseTimer += dt;
      const hpRatio = boss.maxHp > 0 ? boss.hp / boss.maxHp : 0;
      if (boss.phase === 1 && hpRatio <= 0.6) {
        boss.phase = 2;
        boss.phaseTimer = 0;
        boss.cutoverTimer = 24;
      }
      if (boss.phase === 2) {
        boss.cutoverTimer = Math.max(0, boss.cutoverTimer - dt);
        if (boss.cutoverTimer <= 0 || hpRatio <= 0.25) {
          boss.phase = 3;
          boss.phaseTimer = 0;
        }
      }
      if (boss.phase === 3) {
        boss.flickerTimer += dt;
      }

      if (boss.phase === 1) {
        boss.shotInterval = 1.7;
      } else if (boss.phase === 2) {
        boss.shotInterval = 1.3;
      } else {
        boss.shotInterval = 1.05;
      }

      boss.addTimer -= dt;
      if (boss.addTimer <= 0 && boss.phase === 1) {
        boss.addTimer = 3.1 + Math.random() * 1.2;
        for (let i = 0; i < 2; i++) {
          const ay = boss.y + (Math.random() * 220 - 110);
          bossShots.push({
            x: boss.x - boss.width / 2,
            y: ay,
            vx: -180 * PROJECTILE_SPEED_SCALE,
            vy: (Math.random() - 0.5) * 70 * PROJECTILE_SPEED_SCALE,
            life: 5,
            age: 0,
            size: 22,
            type: "add",
          });
        }
      }

      if (boss.lockShotTimer > 0) boss.lockShotTimer -= dt;
      if (boss.delayShotTimer > 0) boss.delayShotTimer -= dt;
    }
    if (boss.id === 3) {
      if (!Number.isFinite(boss.phase)) boss.phase = 1;
      boss.phaseTimer += dt;
      const hpRatio = boss.maxHp > 0 ? boss.hp / boss.maxHp : 0;
      if (boss.phase === 1 && hpRatio <= 0.7) {
        boss.phase = 2;
        boss.phaseTimer = 0;
      }
      if (boss.phase === 2 && hpRatio <= 0.35) {
        boss.phase = 3;
        boss.phaseTimer = 0;
      }

      if (boss.phase === 1) {
        boss.shotInterval = 1.55;
      } else if (boss.phase === 2) {
        boss.shotInterval = 1.2;
      } else {
        boss.shotInterval = 0.9;
      }

      if (boss.slicerCooldown > 0) boss.slicerCooldown -= dt;
      if (boss.mineCooldown > 0) boss.mineCooldown -= dt;
    }
    if (boss.id >= 5) {
      if (!Number.isFinite(boss.lockShotTimer)) boss.lockShotTimer = 0;
      if (!Number.isFinite(boss.delayShotTimer)) boss.delayShotTimer = 0;
      if (boss.lockShotTimer > 0) boss.lockShotTimer -= dt;
      if (boss.delayShotTimer > 0) boss.delayShotTimer -= dt;
    }

    boss.attackModeTimer += dt;
      boss.flipTimer += dt;
      if (boss.flipTimer > 2.4) {
        boss.flipTimer = 0;
      boss.flipSide = boss.flipSide === -1 ? 1 : -1;
      }

    boss.shotTimer += dt;
    if (boss.bigBugCooldown > 0) boss.bigBugCooldown -= dt;
    if (boss.clusterCooldown > 0) boss.clusterCooldown -= dt;
    if (boss.shotTimer >= boss.shotInterval) {
      boss.shotTimer = 0;
      if (boss.id === 4) {
        if (boss.phase === 1) {
          const slow = 280 * PROJECTILE_SPEED_SCALE;
          for (let i = 0; i < 2; i++) {
            bossShots.push({
              x: boss.x - boss.width / 2,
              y: boss.y + (Math.random() * 200 - 100),
              vx: -slow,
              vy: (Math.random() - 0.5) * 60 * PROJECTILE_SPEED_SCALE,
              life: 5,
              age: 0,
              size: 14,
              type: "warning",
            });
          }
          if (Math.random() < 0.5) {
            bossShots.push({
              x: boss.x - boss.width / 2,
              y: boss.y + (Math.random() * 200 - 100),
              vx: -slow * 0.9,
              vy: (Math.random() - 0.5) * 80 * PROJECTILE_SPEED_SCALE,
              life: 5,
              age: 0,
              size: 18,
              type: "parallel",
            });
          }
        } else if (boss.phase === 2) {
          const mode = boss.attackMode % 3;
          if (mode === 0) {
            const speed = 420 * PROJECTILE_SPEED_SCALE;
            for (let k = 0; k < 2; k++) {
              bossShots.push({
                x: boss.x - boss.width / 2,
                y: 140 + k * (WORLD_H - 280),
                vx: -speed,
                vy: 0,
                life: 4,
                age: 0,
                size: 16,
                type: "parallel",
              });
            }
          } else if (mode === 1) {
            if (boss.lockShotTimer <= 0) {
              bossShots.push({
                x: boss.x - boss.width / 2,
                y: boss.y + (Math.random() * 160 - 80),
                vx: -340 * PROJECTILE_SPEED_SCALE,
                vy: 0,
                life: 5,
                age: 0,
                size: 18,
                type: "lock",
              });
              boss.lockShotTimer = 2.0;
            }
          } else {
            if (bossObstacles.length < 2) {
              const gap = 300;
              const gyBase = player.y - gap * 0.5;
              const gy = Math.max(70, Math.min(WORLD_H - gap - 70, gyBase + (Math.random() - 0.5) * 160));
              bossObstacles.push({
                x: WORLD_W + 40,
                gapY: gy,
                gap: gap,
                speed: 150,
                vy: (Math.random() < 0.5 ? 40 : -40),
              });
            }
          }
          if (boss.delayShotTimer <= 0 && Math.random() < 0.5) {
            bossShots.push({
              x: boss.x - boss.width / 2,
              y: boss.y + (Math.random() * 200 - 100),
              vx: -270 * PROJECTILE_SPEED_SCALE,
              vy: (Math.random() - 0.5) * 70 * PROJECTILE_SPEED_SCALE,
              life: 6,
              age: 0,
              size: 22,
              type: "delay",
            });
            boss.delayShotTimer = 2.0;
          }
        } else {
          const speed = 560 * PROJECTILE_SPEED_SCALE;
          for (let k = 0; k < 3; k++) {
            bossShots.push({
              x: boss.x - boss.width / 2,
              y: 110 + k * (WORLD_H - 220) / 2,
              vx: -speed,
              vy: (Math.random() - 0.5) * 50 * PROJECTILE_SPEED_SCALE,
              life: 4,
              age: 0,
              size: 18,
              type: "parallel",
            });
          }
          if (boss.lockShotTimer <= 0) {
            bossShots.push({
              x: boss.x - boss.width / 2,
              y: boss.y + (Math.random() * 160 - 80),
              vx: -420 * PROJECTILE_SPEED_SCALE,
              vy: 0,
              life: 5,
              age: 0,
              size: 20,
              type: "lock",
            });
            boss.lockShotTimer = 1.2;
          }
          if (boss.delayShotTimer <= 0) {
            bossShots.push({
              x: boss.x - boss.width / 2,
              y: boss.y + (Math.random() * 200 - 100),
              vx: -300 * PROJECTILE_SPEED_SCALE,
              vy: (Math.random() - 0.5) * 80 * PROJECTILE_SPEED_SCALE,
              life: 6,
              age: 0,
              size: 24,
              type: "delay",
            });
            boss.delayShotTimer = 1.4;
          }
          if (boss.attackMode % 2 === 0 && bossObstacles.length < 3) {
            const gap = 230;
            const gyBase = player.y - gap * 0.5;
            const gy = Math.max(60, Math.min(WORLD_H - gap - 60, gyBase + (Math.random() - 0.5) * 120));
            bossObstacles.push({
              x: WORLD_W + 40,
              gapY: gy,
              gap: gap,
              speed: 200,
              vy: (Math.random() < 0.5 ? 45 : -45),
            });
          }
        }
      } else if (boss.attackMode === 0) {
        shootBossProjectile(boss, 0, 560);
        shootBossProjectile(boss, 0.12, 520);
      } else if (boss.attackMode === 1) {
        shootBossProjectile(boss, -0.25, 520);
        shootBossProjectile(boss, 0, 520);
        shootBossProjectile(boss, 0.25, 520);
      } else if (boss.attackMode === 2) {
        boss.burstCount += 1;
        shootBossProjectile(boss, 0, 600 + bossStage * 20);
        if (boss.id === 3) {
          // abgeschwaechte 360 Grad Parry-Welle
          const ringCount = boss.phase >= 2 ? 4 : 3;
          for (let k = 0; k < ringCount; k++) {
            const a = (Math.PI * 2 * k) / ringCount;
            shootBossProjectile(boss, a, 360 + bossStage * 8);
          }
          // abgeschwaechter Maschinengewehr-Modus erst ab Phase 2
          if (boss.phase >= 2 && Math.random() < 0.6) {
            boss.machineGun = true;
          }
        }
        if (boss.burstCount >= 4) {
          boss.burstCount = 0;
          boss.shotTimer = -0.6;
        }
      } else if (boss.attackMode === 3 && boss.id >= 2) {
        // Beam charge
        boss.beamState = "charge";
        boss.beamTimer = 0;
      } else if (boss.attackMode === 4 && (boss.id === 2 || boss.id === 3)) {
        // Passierbare Saeulen fuer Boss 2 & 3 (breiteres Gap, wenige Hindernisse)
        const maxObs = boss.id === 3 ? (boss.phase >= 2 ? 3 : 2) : 2;
        if (bossObstacles.length < maxObs) {
          const gap = boss.id === 3 ? (boss.phase >= 2 ? 380 : 460) : 380;
          const gyBase = player.y - gap * 0.5;
          const gy = Math.max(80, Math.min(WORLD_H - gap - 80, gyBase + (Math.random() - 0.5) * 140));
          bossObstacles.push({
            x: WORLD_W + 40,
            gapY: gy,
            gap: gap,
            speed: boss.id === 3 ? (boss.phase >= 2 ? 170 : 130) : 130,
            vy: boss.id === 3 ? (Math.random() < 0.5 ? (boss.phase >= 2 ? 45 : 25) : (boss.phase >= 2 ? -45 : -25)) : 0,
          });
        }
      } else if (boss.attackMode === 5 && boss.id === 3) {
        // abgeschwaechte Spiral volley + Donut
        if (boss.phase < 2) {
          shootBossProjectile(boss, 0, 520);
          // Vertical pillar: shots from top+bottom at player X
          const px = Math.max(60, Math.min(WORLD_W - 200, player.x));
          const pSpeed = 420 * PROJECTILE_SPEED_SCALE;
          bossShots.push({ x: px, y: -30, vx: 0, vy: pSpeed, life: 3, age: 0, size: 13, type: "shard" });
          bossShots.push({ x: px, y: WORLD_H + 30, vx: 0, vy: -pSpeed, life: 3, age: 0, size: 13, type: "shard" });
        } else {
          const count = boss.phase >= 3 ? 8 : 6;
          for (let k = 0; k < count; k++) {
            const a = -0.28 + 0.08 * k + Math.sin(boss.t * 2) * 0.1;
            shootBossProjectile(boss, a, boss.phase >= 3 ? 460 : 420);
          }
          for (let k = 0; k < count; k++) {
            const a = (Math.PI * 2 * k) / count + boss.t * 0.5;
            shootBossProjectile(boss, a, boss.phase >= 3 ? 380 : 340);
          }
          // Phase 2+: 3 converging pillar pairs at spread X positions
          const pSpeed2 = (boss.phase >= 3 ? 500 : 440) * PROJECTILE_SPEED_SCALE;
          for (let k = 0; k < 2; k++) {
            const px = Math.max(60, Math.min(WORLD_W - 200, player.x + (k - 0.5) * 120));
            bossShots.push({ x: px, y: -30, vx: 0, vy: pSpeed2, life: 3, age: 0, size: 13, type: "shard" });
            bossShots.push({ x: px, y: WORLD_H + 30, vx: 0, vy: -pSpeed2, life: 3, age: 0, size: 13, type: "shard" });
          }
        }
      } else if (boss.attackMode === 6 && boss.id === 3) {
        // abgeschwaechte Wellen-Schusswand von rechts (keine Top-Down-Laser)
        if (boss.phase < 2) {
          shootBossProjectile(boss, 0, 520);
        } else {
          const rows = boss.phase >= 3 ? 5 : 4;
          for (let k = 0; k < rows; k++) {
            bossShots.push({
              x: WORLD_W + 40,
              y: 120 + k * (WORLD_H - 240) / (rows - 1),
              vx: -(boss.phase >= 3 ? 480 : 420) * PROJECTILE_SPEED_SCALE,
              vy: Math.sin(boss.t * 2 + k) * 40 * PROJECTILE_SPEED_SCALE,
              life: 4,
              age: 0,
              size: BUG_PROJECTILE_SIZE,
              type: "bug",
              img: assets.bug,
            });
          }
        }
      } else if (boss.attackMode === 7 && boss.id === 3) {
        if (boss.phase < 2) {
          shootBossProjectile(boss, 0, 520);
        } else if (boss.bigBugCooldown <= 0) {
          const speed = 260 * PROJECTILE_SPEED_SCALE;
          bossShots.push({
            x: boss.x - boss.width / 2,
            y: boss.y,
            vx: -speed,
            vy: 0,
            life: 3,
            age: 0,
            size: BIG_BUG_PROJECTILE_SIZE,
            type: "bugBomb",
            img: assets.bug,
            hp: BUG_BOMB_HP,
            maxHp: BUG_BOMB_HP,
            explodeAt: 1 + Math.random() * 2,
          });
          boss.bigBugCooldown = boss.phase >= 3 ? 0.7 : 0.9;
        }
      } else if (boss.attackMode === 8 && boss.id === 3) {
        // Cuphead-Style: Slicer Sweep
        if (boss.phase >= 2 && boss.slicerCooldown <= 0) {
          const count = boss.phase >= 3 ? 3 : 2;
          const speed = (boss.phase >= 3 ? 520 : 460) * PROJECTILE_SPEED_SCALE;
          for (let k = 0; k < count; k++) {
            bossShots.push({
              x: boss.x - boss.width / 2,
              y: boss.y + (Math.random() * 240 - 120),
              vx: -speed,
              vy: (Math.random() - 0.5) * 60 * PROJECTILE_SPEED_SCALE,
              life: 4,
              age: 0,
              size: 26,
              type: "slicer",
            });
          }
          boss.slicerCooldown = boss.phase >= 3 ? 0.8 : 1.1;
        }
      } else if (boss.attackMode === 9 && boss.id === 3) {
        // Cuphead-Style: Mine Pods
        if (boss.phase >= 3 && boss.mineCooldown <= 0) {
          const count = 2;
          const speed = 180 * PROJECTILE_SPEED_SCALE;
          for (let k = 0; k < count; k++) {
            bossShots.push({
              x: boss.x - boss.width / 2,
              y: boss.y + (Math.random() * 220 - 110),
              vx: -speed,
              vy: (Math.random() - 0.5) * 40 * PROJECTILE_SPEED_SCALE,
              life: 5,
              age: 0,
              size: 18,
              type: "mine",
            });
          }
          boss.mineCooldown = 1.4;
        }
      } else if (boss.attackMode === 5 && boss.id === 2) {
        // Maschinengewehr kurzer Burst
        boss.burstCount = 0;
        boss.machineGun = true;
      } else if (boss.attackMode === 6 && boss.id === 2) {
        // Mirror shots: fire from boss AND mirrored from left edge
        shootBossProjectile(boss, 0, 500);
        shootBossProjectile(boss, 0.22, 480);
        shootBossProjectile(boss, -0.22, 480);
        const mSpeed = 460 * PROJECTILE_SPEED_SCALE;
        for (let k = -1; k <= 1; k++) {
          bossShots.push({
            x: 20,
            y: boss.y + k * 70 + (Math.random() * 40 - 20),
            vx: mSpeed,
            vy: 0,
            life: 4,
            age: 0,
            size: 10,
            type: "shard",
          });
        }
      } else if (boss.attackMode === 4 && boss.id >= 5) {
        const speed = 520 * PROJECTILE_SPEED_SCALE;
        const count = boss.id === 6 ? 6 : 5;
        const spread = boss.id === 6 ? 0.5 : 0.4;
        for (let k = 0; k < count; k++) {
          const a = -spread / 2 + (spread * k) / (count - 1);
          bossShots.push({
            x: boss.x - boss.width / 2,
            y: boss.y,
            vx: -Math.cos(a) * speed,
            vy: Math.sin(a) * speed,
            life: 5,
            age: 0,
            size: 12,
            type: "seeker",
          });
        }
        if (boss.lockShotTimer <= 0) {
          bossShots.push({
            x: boss.x - boss.width / 2,
            y: boss.y + (Math.random() * 160 - 80),
            vx: -420 * PROJECTILE_SPEED_SCALE,
            vy: 0,
            life: 5,
            age: 0,
            size: 18,
            type: "lock",
          });
          boss.lockShotTimer = 1.2;
        }
      } else if (boss.attackMode === 5 && boss.id >= 5) {
        for (let k = 0; k < 2; k++) {
          bossShots.push({
            x: boss.x - boss.width / 2,
            y: boss.y + (Math.random() * 200 - 100),
            vx: -320 * PROJECTILE_SPEED_SCALE,
            vy: (Math.random() - 0.5) * 80 * PROJECTILE_SPEED_SCALE,
            life: 6,
            age: 0,
            size: 20,
            type: "delay",
          });
        }
        if (boss.lockShotTimer <= 0) {
          bossShots.push({
            x: boss.x - boss.width / 2,
            y: boss.y + (Math.random() * 160 - 80),
            vx: -460 * PROJECTILE_SPEED_SCALE,
            vy: 0,
            life: 5,
            age: 0,
            size: 18,
            type: "lock",
          });
          boss.lockShotTimer = boss.id === 6 ? 0.9 : 1.1;
        }
      } else if (boss.attackMode === 6 && boss.id >= 5) {
        const maxObs = boss.id === 6 ? 4 : 3;
        const gap = boss.id === 6 ? 240 : 280;
        if (bossObstacles.length < maxObs) {
          const gyBase = player.y - gap * 0.5;
          const gy = Math.max(70, Math.min(WORLD_H - gap - 70, gyBase + (Math.random() - 0.5) * 140));
          bossObstacles.push({
            x: WORLD_W + 40,
            gapY: gy,
            gap: gap,
            speed: boss.id === 6 ? 230 : 210,
            vy: boss.id === 6 ? (Math.random() < 0.5 ? 60 : -60) : 0,
          });
        }
      } else if (boss.attackMode === 7 && boss.id >= 5) {
        const ringCount = boss.id === 6 ? 10 : 8;
        for (let k = 0; k < ringCount; k++) {
          const a = (Math.PI * 2 * k) / ringCount + boss.t * 0.25;
          shootBossProjectile(boss, a, 420 + bossStage * 10);
        }
        if (boss.id === 6) {
          boss.burstCount = 0;
          boss.machineGun = true;
        }
      } else if (boss.attackMode === 3 && boss.id === 1) {
        // Boss 1: Homing burst — 4 seekers with short tracking phase
        for (let k = 0; k < 4; k++) {
          const a = -0.3 + k * 0.2;
          const speed = (380 + bossStage * 12) * PROJECTILE_SPEED_SCALE;
          bossShots.push({
            x: boss.x - boss.width / 2,
            y: boss.y + (Math.random() * 80 - 40),
            vx: -Math.cos(a) * speed,
            vy: Math.sin(a) * speed,
            life: 5,
            age: 0,
            size: 11,
            type: "seeker",
            homingDuration: 0.42,
          });
        }
      } else if (boss.attackMode === 8 && boss.id === 5) {
        // Boss 5 Phase 2: Cluster bombs that split into 6 sub-shots
        const hpRatio5 = boss.maxHp > 0 ? boss.hp / boss.maxHp : 1;
        if (hpRatio5 <= 0.6 && (boss.clusterCooldown === undefined || boss.clusterCooldown <= 0)) {
          const count = 2;
          for (let k = 0; k < count; k++) {
            bossShots.push({
              x: boss.x - boss.width / 2,
              y: boss.y + (Math.random() * 160 - 80),
              vx: -200 * PROJECTILE_SPEED_SCALE,
              vy: (Math.random() - 0.5) * 50 * PROJECTILE_SPEED_SCALE,
              life: 4,
              age: 0,
              size: 20,
              type: "cluster",
              splitDelay: 0.9 + Math.random() * 0.4,
            });
          }
          boss.clusterCooldown = 2.5;
        }
      } else if (boss.attackMode === 8 && boss.id === 6) {
        if (boss.bigBugCooldown <= 0) {
          const speed = 260 * PROJECTILE_SPEED_SCALE;
          bossShots.push({
            x: boss.x - boss.width / 2,
            y: boss.y,
            vx: -speed,
            vy: 0,
            life: 3,
            age: 0,
            size: BIG_BUG_PROJECTILE_SIZE,
            type: "bugBomb",
            img: assets.bug,
            hp: BUG_BOMB_HP,
            maxHp: BUG_BOMB_HP,
            explodeAt: 1 + Math.random() * 1.6,
          });
          boss.bigBugCooldown = 1.2;
        }
        const volleySpeed = 560 * PROJECTILE_SPEED_SCALE;
        for (let k = 0; k < 3; k++) {
          bossShots.push({
            x: boss.x - boss.width / 2,
            y: 140 + k * (WORLD_H - 280) / 2,
            vx: -volleySpeed,
            vy: (Math.random() - 0.5) * 60 * PROJECTILE_SPEED_SCALE,
            life: 4,
            age: 0,
            size: 16,
            type: "parallel",
          });
        }
      }
    }

    // Beam handling
    if (boss.beamState === "charge") {
      boss.beamTimer += dt;
      if (boss.beamTimer > 0.8) {
        boss.beamState = "fire";
        boss.beamTimer = 0;
      }
    } else if (boss.beamState === "fire") {
      boss.beamTimer += dt;
      boss.beamTickTimer += dt;
      if (boss.beamTimer > 1.4) {
        boss.beamState = "idle";
        boss.beamTimer = 0;
        boss.beamTickTimer = 0;
      }
    }

    // Beam damage (deutlich abgeschwächt, Ticks alle 0.6s)
    if (boss.beamState === "fire") {
      const beamX = boss.x - boss.width / 2;
      const beamW = WORLD_W;
      const beamY = boss.y - 50;
      const beamH = boss.id === 3 ? 120 : 80;
      if (
        player.x + player.radius > beamX - beamW &&
        player.x - player.radius < beamX &&
        player.y + player.radius > beamY &&
        player.y - player.radius < beamY + beamH &&
        !player.invincible
      ) {
        if (boss.beamTickTimer >= 0.4) {
          boss.beamTickTimer = 0;
          const dmg = Math.max(1, Math.ceil(player.maxHp * 0.05));
          applyDamage(dmg, { ignoreInvincible: true });
          if (gameOver) return;
        }
      }
    }

    if (boss.attackModeTimer > 6) {
      boss.attackModeTimer = 0;
      const maxMode =
        boss.id === 6 ? 9 :
        boss.id === 5 ? 9 :
        boss.id === 4 ? 10 :
        boss.id === 3 ? (boss.phase >= 3 ? 10 : boss.phase >= 2 ? 9 : 7) :
        boss.id === 2 ? 7 : 4;
      boss.attackMode = (boss.attackMode + 1) % maxMode;
    }

    // Boss loot drops
    boss.lootTimer -= dt;
    if (boss.lootTimer <= 0) {
      const base =
        boss.id >= 5 ? 1.8 :
        boss.id === 4 ? 2.2 :
        boss.id === 3 ? 1.4 :
        3.2;
      boss.lootTimer = base + Math.random() * 1.0;
      let lootType = randomBossPowerup(boss.id);
      if (boss.id === 3) {
        const r = Math.random();
        lootType = r < 0.35 ? "bossshield" : r < 0.5 ? "bossheal" : r < 0.7 ? "salvo" : r < 0.85 ? "spread" : "beam";
      }
      const drop = {
        x: boss.x - boss.width / 2 - 40,
        y: boss.y + (Math.random() * 160 - 80),
        size: 48,
        type: lootType,
        collected: false,
        img: assets.lootbox,
        vx: -pipeSpeed * 0.4,
      };
      bossLoot.push(drop);
      if ((boss.id === 3 && Math.random() < 0.35) || (boss.id >= 4 && Math.random() < 0.25)) {
        const extraType = Math.random() < 0.6 ? "bossshield" : "bossheal";
        bossLoot.push({ ...drop, type: extraType, y: boss.y + (Math.random() * 160 - 80) });
      }
    }

    // Boss loot update
    for (let i = bossLoot.length - 1; i >= 0; i--) {
      const l = bossLoot[i];
      const bossSpeedBoost = inBossFight ? 1.6 : 0.8;
      l.x += (l.vx || 0) * dt;
      l.x -= pipeSpeed * bossSpeedBoost * dt;
      const dx = player.x - l.x;
      const dy = player.y - l.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (!l.collected && dist < player.radius + l.size * 0.6) {
        l.collected = true;
        sfxPickup();
        applyPowerup(l.type);
        spawnExplosion(l.x, l.y, "rgba(140,255,220,1)", 1.2);
        bossLoot.splice(i, 1);
        continue;
      }
      if (l.x < -120) bossLoot.splice(i, 1);
    }

    // Boss shots
    for (let i = bossShots.length - 1; i >= 0; i--) {
      const b = bossShots[i];
      if (
        !b ||
        !Number.isFinite(b.x) ||
        !Number.isFinite(b.y) ||
        !Number.isFinite(b.vx) ||
        !Number.isFinite(b.vy) ||
        !Number.isFinite(b.age) ||
        !Number.isFinite(b.life) ||
        b.life <= 0
      ) {
        bossShots.splice(i, 1);
        continue;
      }
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.age += dt;

      if (b.type === "bugBomb" && b.explodeAt && b.age >= b.explodeAt) {
        for (let k = 0; k < 12; k++) {
          const a = (Math.PI * 2 * k) / 12;
          const speed = 360 * PROJECTILE_SPEED_SCALE;
          bossShots.push({
            x: b.x,
            y: b.y,
            vx: Math.cos(a) * speed,
            vy: Math.sin(a) * speed,
            life: 3,
            age: 0,
            size: BUG_PROJECTILE_SIZE,
            type: "bug",
            img: assets.bug,
          });
        }
        spawnExplosion(b.x, b.y, "rgba(140,220,255,1)", 1.1);
        bossShots.splice(i, 1);
        continue;
      }
      if (b.type === "mine" && b.age >= 1.2) {
        for (let k = 0; k < 6; k++) {
          const a = (Math.PI * 2 * k) / 6;
          const speed = 320 * PROJECTILE_SPEED_SCALE;
          bossShots.push({
            x: b.x,
            y: b.y,
            vx: Math.cos(a) * speed,
            vy: Math.sin(a) * speed,
            life: 3,
            age: 0,
            size: 10,
            type: "shard",
          });
        }
        spawnExplosion(b.x, b.y, "rgba(255,160,120,1)", 0.9);
        bossShots.splice(i, 1);
        continue;
      }
      if (b.type === "cluster" && b.age >= b.splitDelay) {
        for (let k = 0; k < 6; k++) {
          const a = (Math.PI * 2 * k) / 6;
          const speed = 360 * PROJECTILE_SPEED_SCALE;
          bossShots.push({
            x: b.x,
            y: b.y,
            vx: Math.cos(a) * speed,
            vy: Math.sin(a) * speed,
            life: 3.5,
            age: 0,
            size: 10,
            type: "shard",
          });
        }
        spawnExplosion(b.x, b.y, "rgba(255,200,80,1)", 1.2);
        addShake(3, 8);
        bossShots.splice(i, 1);
        continue;
      }

      // Maschinengewehr-Burst (Boss2/3)
      if (currentBoss && currentBoss.machineGun) {
        currentBoss.shotTimer += dt * 2;
        if (currentBoss.shotTimer >= 0.2 && currentBoss.burstCount < 8) {
          currentBoss.shotTimer = 0;
          currentBoss.burstCount++;
          shootBossProjectile(currentBoss, (Math.random() - 0.5) * 0.3, 460 + Math.random() * 60);
        } else if (currentBoss.burstCount >= 8) {
          currentBoss.machineGun = false;
          currentBoss.burstCount = 0;
        }
      }

      const dx = b.x - player.x;
      const dy = b.y - player.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const hitRadius = Number.isFinite(b.size) ? b.size : 0;
      if (dist < player.radius + hitRadius && !player.invincible) {
        if (b.type === "lock") {
          player.lockTimer = Math.max(player.lockTimer, 1.4);
          applyDamage(1);
        } else if (b.type === "delay") {
          score = Math.max(0, score - 3);
          player.slowTimer = Math.max(player.slowTimer, 1.4);
          if (currentBoss && currentBoss.id === 4 && currentBoss.phase === 2) {
            currentBoss.cutoverTimer = Math.min(30, currentBoss.cutoverTimer + 2);
          }
        } else {
          applyDamage(1);
        }
        if (gameOver) return;
        bossShots.splice(i, 1);
        continue;
      }

      // seeker adjust
      if (b.type === "seeker" && (!b.homingDuration || b.age < b.homingDuration)) {
        const ang = Math.atan2(player.y - b.y, player.x - b.x);
        b.vx += Math.cos(ang) * 40 * dt;
        b.vy += Math.sin(ang) * 40 * dt;
      }

      if (b.x < -120 || b.y < -200 || b.y > WORLD_H + 200 || b.age > b.life) bossShots.splice(i, 1);
    }

    // Player shots collide with boss shots
    for (let i = playerShots.length - 1; i >= 0; i--) {
      const s = playerShots[i];
      if (!s) {
        playerShots.splice(i, 1);
        continue;
      }
      const isBeam = s.type === "beam";
      const beamX = isBeam ? s.x : 0;
      const beamY = isBeam ? s.y - (s.height || 20) / 2 : 0;
      const beamW = isBeam ? (s.len || 0) : 0;
      const beamH = isBeam ? (s.height || 20) : 0;
      for (let j = bossShots.length - 1; j >= 0; j--) {
        const b = bossShots[j];
        if (!b) {
          bossShots.splice(j, 1);
          continue;
        }
        if (isBeam) {
          if (
            b.x + (b.size || 6) > beamX &&
            b.x - (b.size || 6) < beamX + beamW &&
            b.y + (b.size || 6) > beamY &&
            b.y - (b.size || 6) < beamY + beamH
          ) {
            bossShots.splice(j, 1);
          }
          continue;
        } else {
          const dx = s.x - b.x;
          const dy = s.y - b.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const rad = (s.size || 6) + (b.size || 6);
          if (dist < rad) {
            playerShots.splice(i, 1);
            if (b.type === "bugBomb") {
              if (!Number.isFinite(b.hp)) {
                b.hp = BUG_BOMB_HP;
                b.maxHp = BUG_BOMB_HP;
              }
              b.hp -= 1;
              if (b.hp <= 0) {
                spawnExplosion(b.x, b.y, "rgba(255,220,160,1)", 1.1);
                bossShots.splice(j, 1);
              }
            } else {
              bossShots.splice(j, 1);
            }
            break;
          }
        }
      }
    }

    // Boss obstacles (pillars for boss2)
    for (let i = bossObstacles.length - 1; i >= 0; i--) {
      const o = bossObstacles[i];
      if (!o || !Number.isFinite(o.x)) {
        bossObstacles.splice(i, 1);
        continue;
      }
      const gap = Number.isFinite(o.gap) ? o.gap : pipeGap;
      const speed = Number.isFinite(o.speed) ? o.speed : pipeSpeed;
      o.x -= speed * dt;
      if (o.vy) {
        o.gapY += o.vy * dt;
        if (o.gapY < 60 || o.gapY + gap > WORLD_H - 60) {
          o.vy *= -1;
        }
      }

      if (
        player.x + player.radius > o.x &&
        player.x - player.radius < o.x + pipeWidth &&
        (player.y - player.radius < o.gapY || player.y + player.radius > o.gapY + gap)
      ) {
        if (player.invincible) {
          continue;
        }
        if (player.shieldHits > 0 || player.shieldTimer > 0) {
          applyDamage(1, { ignoreInvincible: true });
          continue;
        }
        player.hp = 0;
        endGame();
      }

      if (o.x + pipeWidth < -120) bossObstacles.splice(i, 1);
    }

    // Player shots
    for (let i = playerShots.length - 1; i >= 0; i--) {
      const s = playerShots[i];
      if (!s) {
        playerShots.splice(i, 1);
        continue;
      }
      if (s.type === "beam") {
        s.age += dt;
        s.hitTimer = Math.max(0, (s.hitTimer || 0) - dt);
        const charge = s.charge || 0;
        if (s.age >= s.life) {
          playerShots.splice(i, 1);
          continue;
        }
        const beamX = s.x;
        const beamY = s.y - (s.height || 20) / 2;
        const beamW = s.len || 0;
        const beamH = s.height || 20;
        if (
          s.age >= charge &&
          s.hitTimer <= 0 &&
          beamX < boss.x + boss.width / 2 &&
          beamX + beamW > boss.x - boss.width / 2 &&
          beamY < boss.y + boss.height / 2 &&
          beamY + beamH > boss.y - boss.height / 2
        ) {
          boss.hp -= 2;
          boss.hitFlash = 3;
          s.hitTimer = 0.12;
          addShake(2, 7);
          spawnExplosion(boss.x - boss.width / 2, s.y, "rgba(180,255,220,1)", 0.6);
          if (boss.hp <= 0) {
            addShake(14, 5);
            defeatBoss(boss.id);
            return;
          }
        }
        continue;
      }
      s.x += (s.vx || s.speed || 0) * dt;
      s.y += (s.vy || 0) * dt;

      if (
        s.x > boss.x - boss.width / 2 &&
        s.x < boss.x + boss.width / 2 &&
        s.y > boss.y - boss.height / 2 &&
        s.y < boss.y + boss.height / 2
      ) {
        boss.hp -= 3;
        boss.hitFlash = 3;
        addShake(2, 7);
        spawnExplosion(s.x, s.y, "rgba(255, 210, 120,1)", 0.8);
        playerShots.splice(i, 1);
        if (boss.hp <= 0) {
          addShake(14, 5);
          defeatBoss(boss.id);
          return;
        }
      } else if (s.x > WORLD_W + 200 || s.y < -200 || s.y > WORLD_H + 200) {
        playerShots.splice(i, 1);
      }
    }
  }

  // ======================================================
  //  Explosions
  // ======================================================
  function spawnBossDeathExplosion(bx, by) {
    const cols = ['rgba(255,255,255,1)', 'rgba(255,200,100,1)', 'rgba(100,200,255,1)', 'rgba(255,130,180,1)', 'rgba(160,255,120,1)'];
    spawnExplosion(bx, by, cols[0], 4.0);
    for (let i = 0; i < 8; i++) {
      const a = (Math.PI * 2 * i) / 8 + Math.random() * 0.3;
      const r = 50 + Math.random() * 60;
      spawnExplosion(bx + Math.cos(a) * r, by + Math.sin(a) * r, cols[i % cols.length], 2.2);
    }
    for (let i = 0; i < 4; i++) {
      const a = Math.random() * Math.PI * 2;
      spawnExplosion(bx + Math.cos(a) * (120 + Math.random() * 40), by + Math.sin(a) * (80 + Math.random() * 30), cols[i % cols.length], 1.4);
    }
  }

  function spawnExplosion(x, y, color = "rgba(140,220,255,1)", power = 1) {
    const count = Math.floor(12 * power * (isMobile() ? 0.25 : 1));
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 120 + Math.random() * 200 * power;
      explosions.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.6 + Math.random() * 0.4,
        age: 0,
        color,
      });
    }
  }

  function updateExplosions(dt) {
    for (let i = explosions.length - 1; i >= 0; i--) {
      const e = explosions[i];
      e.age += dt;
      if (e.age >= e.life) {
        explosions.splice(i, 1);
        continue;
      }
      e.x += e.vx * dt;
      e.y += e.vy * dt;
      e.vy += 600 * dt * 0.3;
    }
  }

  // ======================================================
  //  Core Update Loop
  // ======================================================
  function update(dt) {
    if (!gameRunning || gameOver) return;
    clampPlayerState();

    if (bossTransitionActive) {
      bossTransitionTimer += dt;
      if (bossTransitionTimer >= bossTransitionDuration && pendingBossId) {
        bossTransitionActive = false;
        bossTransitionTimer = 0;
        startBossFight(pendingBossId);
        pendingBossId = null;
        bossAwaitingConfirm = false;
      }
      // während der Transition keine Welt-Updates
      return;
    }

    const scrollMultiplier = player.slowTimer > 0 ? 0.45 : 1.0;
    bgOffset -= bgScrollSpeedBase * scrollMultiplier * dt;
    if (bgOffset <= -WORLD_W) bgOffset += WORLD_W;
    updatePhaseText(dt);
    updateNnTaunt(dt);

    // Keine Gravitation während Boss-Vorbereitung oder Grace-Period nach Spawn
    if (!pendingBossId) {
      if (bossSpawnGraceTimer > 0) {
        bossSpawnGraceTimer -= dt;
        player.vy = 0;
      } else {
        const slowFallScale = player.slowTimer > 0 ? 0.8 : 1.0;
        const grav = (player.turboTimer > 0 ? player.gravity * 0.85 : player.gravity) * slowFallScale;
        player.vy += grav * dt;
        player.y += player.vy * dt;
      }
    } else {
      player.vy = 0;
      updatePendingBossStory(dt);
    }

    const targetRot = Math.max(-0.35, Math.min(0.6, player.vy / 700));
    player.rotation += (targetRot - player.rotation) * dt * 7;

    if (player.spinTimer > 0) {
      player.rotation += dt * 6;
    }

    updatePowerupTimers(dt);
    if (player.hp >= player.maxHp) {
      const maxShield = player.maxHp * SHIELD_MAX_RATIO;
      player.shieldCharge = Math.min(maxShield, player.shieldCharge + player.maxHp * SHIELD_CHARGE_RATE * dt);
    }

    trailSampleTimer += dt;
    if (trailSampleTimer >= trailSampleInterval) {
      trailSampleTimer = 0;
      trail.push({ x: player.x - 18, y: player.y, vy: player.vy });
      if (trail.length > trailMaxLength) trail.shift();
    }
    const trailDrift = bgScrollSpeedBase * scrollMultiplier * dt * 1.6;
    if (trailDrift > 0) {
      for (const p of trail) {
        p.x -= trailDrift;
      }
    }
    trailLoopPhase += (bgScrollSpeedBase * scrollMultiplier) * 0.02 * dt;

    if (pendingBossId) {
      player.vy = 0;
    } else if (!inBossFight) {
      updatePipes(dt);
      updateLootboxes(dt);
      bossLoot.length = 0;
      bossObstacles.length = 0;
      if (!player.invincible) checkCollisions();
    } else {
      updateBoss(dt);
    }

    updateExplosions(dt);
    if (scoreTauntTimer > 0) {
      scoreTauntTimer -= dt;
      if (scoreTauntTimer < 0) scoreTauntTimer = 0;
    }
    if (phaseMilestoneCooldown > 0) {
      phaseMilestoneCooldown -= dt;
      if (phaseMilestoneCooldown < 0) phaseMilestoneCooldown = 0;
    }

    if (player.y - player.radius <= 0 || player.y + player.radius >= WORLD_H) {
      endGame();
    }
  }

  // ======================================================
  //  Drawing
  // ======================================================
  function getBossBackground(bossId) {
    switch (bossId) {
      case 1: return assets.bossbg1 || assets.bg1;
      case 2: return assets.bossbg2 || assets.bg1;
      case 3: return assets.bossbg3 || assets.bg1;
      case 4: return assets.bossbg4 || assets.bg1;
      case 5: return assets.bossbg5 || assets.bg1;
      case 6: return assets.bossbg6 || assets.bg1;
      default: return assets.bg1;
    }
  }

  function drawBackground() {
    let img = assets.bg1;
    if (inBossFight) {
      img = getBossBackground(currentBoss ? currentBoss.id : null);
    } else if (bossTransitionActive || pendingBossId) {
      img = getBossBackground(pendingBossId);
    }

    if (!img.complete || !img.naturalWidth) {
      ctx.fillStyle = "#02050c";
      ctx.fillRect(0, 0, WORLD_W, WORLD_H);
      return;
    }

    const aspect = img.width / img.height;
    let w = WORLD_W;
    let h = w / aspect;

    if (h < WORLD_H) {
      h = WORLD_H;
      w = h * aspect;
    }

    ctx.drawImage(img, bgOffset, 0, w, h);
    ctx.drawImage(img, bgOffset + w, 0, w, h);
  }

  function _drawToastBadge(text, bx, by) {
    ctx.save();
    ctx.font = `600 14px ${SECONDARY_FONT}`;
    ctx.textBaseline = "middle";
    const metrics = ctx.measureText(text);
    const textW = metrics.width;
    const padX = 16;
    const padY = 0;
    const boxH = 32;
    const accentW = 4;
    const boxW = accentW + padX + textW + padX + 14; // +14 safety for web-font variance
    const boxX = bx;
    const boxY = by - boxH / 2;

    ctx.fillStyle = "rgba(4,10,26,0.88)";
    ctx.strokeStyle = "rgba(60,140,220,0.35)";
    ctx.lineWidth = 1;
    ctx.fillRect(boxX, boxY, boxW, boxH);
    ctx.strokeRect(boxX + 0.5, boxY + 0.5, boxW - 1, boxH - 1);

    ctx.fillStyle = "#3ab8ff";
    ctx.fillRect(boxX, boxY, accentW, boxH);

    ctx.fillStyle = "#cdeeff";
    ctx.fillText(text, boxX + accentW + padX, by);
    ctx.restore();
  }

  function drawPhaseText() {
    if (!phaseTextActive || !phaseTextLine) return;
    if (inBossFight || bossTransitionActive || pendingBossId) return;
    _drawToastBadge(phaseTextLine, phaseTextX, phaseTextY);
  }

  function drawNnTaunt() {
    if (!nnTauntActive || !nnTauntText) return;
    if (inBossFight || bossTransitionActive || pendingBossId) return;
    _drawToastBadge(nnTauntText, nnTauntX, nnTauntY);
  }

  function drawBossStoryOverlay() {
    if (!pendingBossId || bossTransitionActive || inBossFight) return;
    if (!pendingBossStoryLines.length) return;

    const lineHeight = 32;
    const maxVisible = Math.max(1, Math.floor((WORLD_H * 0.66) / lineHeight));
    const revealedChars = Math.min(pendingBossStoryRevealChars, pendingBossStoryTotalChars);
    let charBudget = revealedChars;
    let lastLineWithChars = -1;

    ctx.save();
    // Dark overlay with subtle vignette
    ctx.fillStyle = "rgba(0,0,0,0.72)";
    ctx.fillRect(0, 0, WORLD_W, WORLD_H);
    // Subtle blue glow center
    const vigGrad = ctx.createRadialGradient(WORLD_W / 2, WORLD_H / 2, 100, WORLD_W / 2, WORLD_H / 2, 550);
    vigGrad.addColorStop(0, "rgba(30,60,120,0.18)");
    vigGrad.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = vigGrad;
    ctx.fillRect(0, 0, WORLD_W, WORLD_H);

    const cx = WORLD_W / 2;
    const yStart = WORLD_H * 0.14;
    ctx.font = `600 ${BOSS_STORY_FONT_SIZE}px ${SECONDARY_FONT}`;
    ctx.fillStyle = "#e9f2ff";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";

    for (let i = 0; i < pendingBossStoryLines.length; i++) {
      if (charBudget <= 0) break;
      const line = pendingBossStoryLines[i];
      if (charBudget >= line.length) {
        charBudget -= line.length;
        lastLineWithChars = i;
      } else {
        lastLineWithChars = i;
        break;
      }
    }
    const focusLine = Math.max(lastLineWithChars, 0);
    const start = Math.max(0, focusLine - maxVisible + 1);
    const end = Math.min(pendingBossStoryLines.length, start + maxVisible);

    for (let i = start; i < end; i++) {
      const y = yStart + (i - start) * lineHeight;
      const line = pendingBossStoryLines[i];
      let drawLine = "";
      let remaining = revealedChars;
      for (let j = 0; j < i; j++) remaining -= pendingBossStoryLines[j].length;
      if (remaining >= line.length) {
        drawLine = line;
      } else if (remaining > 0) {
        drawLine = line.slice(0, Math.floor(remaining));
      }
      // First line (boss name) gets accent styling
      if (i === 0 && drawLine) {
        ctx.save();
        ctx.font = `600 ${BOSS_STORY_FONT_SIZE + 2}px ${SECONDARY_FONT}`;
        ctx.fillStyle = "#9ef";
        ctx.shadowColor = "rgba(100,230,255,0.6)";
        ctx.shadowBlur = 10;
        ctx.fillText(drawLine, cx, y);
        ctx.restore();
      } else if (drawLine) {
        ctx.fillText(drawLine, cx, y);
      }
    }

    // Blinking cursor (after last revealed char on current line)
    if (pendingBossStoryCursorOn) {
      let cursorLine = Math.min(Math.max(lastLineWithChars, 0), pendingBossStoryLines.length - 1);
      if (cursorLine < start) cursorLine = start;
      if (cursorLine >= end) cursorLine = end - 1;
      let charsBefore = 0;
      for (let i = 0; i < cursorLine; i++) charsBefore += pendingBossStoryLines[i].length;
      const cursorLineText = pendingBossStoryLines[cursorLine] || "";
      const charsInLine = Math.max(0, Math.min(cursorLineText.length, Math.floor(revealedChars - charsBefore)));
      const partialText = cursorLineText.slice(0, charsInLine);
      const lineW = ctx.measureText(partialText).width;
      const cursorX = cx + lineW / 2 + 4;
      const cursorY = yStart + (cursorLine - start) * lineHeight;
      ctx.fillRect(cursorX, cursorY + 4, 5, lineHeight - 10);
    }

    // Hint bar at bottom
    ctx.save();
    const hintY = WORLD_H - 52;
    ctx.fillStyle = "rgba(8,16,36,0.8)";
    ctx.fillRect(0, hintY - 8, WORLD_W, 44);
    ctx.strokeStyle = "rgba(79,150,220,0.25)";
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, hintY - 8); ctx.lineTo(WORLD_W, hintY - 8); ctx.stroke();
    ctx.font = `600 15px ${SECONDARY_FONT}`;
    ctx.fillStyle = "rgba(200,230,255,0.75)";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const hint = bossAwaitingConfirm
      ? "Leertaste / Tap: Boss starten"
      : "Leertaste / Tap: überspringen";
    ctx.fillText(hint, WORLD_W / 2, hintY + 14);
    ctx.restore();

    ctx.restore();
  }

  function drawTrail() {
    if (trail.length < 2) return;
    ctx.save();
    ctx.globalCompositeOperation = "source-over";

    for (let i = 0; i < trail.length - 1; i++) {
      const a = trail[i];
      const b = trail[i + 1];
      const t = i / (trail.length - 1);
      const alpha = (1 - t) * 0.45;
      const width = 12 * (1 - t) + 3;

      if (!perfMode) { ctx.shadowColor = "rgba(255,120,60,0.35)"; ctx.shadowBlur = 4; }
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.strokeStyle = `rgba(255,110,50,${alpha})`;
      ctx.lineWidth = width;
      ctx.stroke();

      ctx.shadowBlur = 0;
      ctx.strokeStyle = `rgba(255,170,90,${alpha * 0.4})`;
      ctx.lineWidth = width * 0.45;
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawPipes() {
    ctx.save();
    for (const p of pipes) {
      const col = "#08101f";
      const bottomY = Math.floor(p.gapY + pipeGap);
      const bottomH = WORLD_H - bottomY + 60;
      ctx.fillStyle = col;
      ctx.fillRect(p.x, 0, pipeWidth, p.gapY);
      ctx.fillRect(p.x, bottomY, pipeWidth, bottomH);

      ctx.strokeStyle = "#4fd2ff";
      if (!perfMode) { ctx.shadowColor = "#4fd2ff"; ctx.shadowBlur = 12; }
      ctx.lineWidth = 3;

      ctx.strokeRect(p.x, 0, pipeWidth, p.gapY);
      ctx.strokeRect(p.x, bottomY, pipeWidth, bottomH);
      ctx.shadowBlur = 0;
    }
    ctx.restore();
  }

  function drawBossObstacles() {
    if (!inBossFight) return;
    ctx.save();
    ctx.fillStyle = "#0d1a2f";
    ctx.strokeStyle = "#ff6fbf";
    ctx.lineWidth = 3;
    if (!perfMode) { ctx.shadowColor = "#ff6fbf"; ctx.shadowBlur = 12; }
    for (const o of bossObstacles) {
      const gap = Number.isFinite(o.gap) ? o.gap : pipeGap;
      const bottomY = Math.floor(o.gapY + gap);
      const bottomH = WORLD_H - bottomY + 60;
      ctx.fillRect(o.x, 0, pipeWidth, o.gapY);
      ctx.fillRect(o.x, bottomY, pipeWidth, bottomH);
      ctx.strokeRect(o.x, 0, pipeWidth, o.gapY);
      ctx.strokeRect(o.x, bottomY, pipeWidth, bottomH);
    }
    ctx.restore();
  }

  function drawLootboxes() {
    for (const b of lootboxes) {
      ctx.save();
      const pulse = b.golden ? 0.65 + 0.35 * Math.sin(globalTime * 3.5 + b.swayPhase) : 1;
      if (b.golden && !perfMode) {
        ctx.shadowColor = `rgba(255,210,50,${pulse * 0.9})`;
        ctx.shadowBlur = 18;
      }
      if (b.img && b.img.complete) {
        ctx.drawImage(b.img, b.x - b.size / 2, b.y - b.size / 2, b.size, b.size);
      } else {
        ctx.fillStyle = "#ffc400";
        ctx.fillRect(b.x - b.size / 2, b.y - b.size / 2, b.size, b.size);
      }
      if (b.golden) {
        // golden tint overlay
        ctx.globalAlpha = 0.28 * pulse;
        ctx.fillStyle = "#ffdd44";
        ctx.fillRect(b.x - b.size / 2, b.y - b.size / 2, b.size, b.size);
        // border glow
        ctx.globalAlpha = 0.7 * pulse;
        ctx.strokeStyle = "#ffd700";
        ctx.lineWidth = 2.5;
        ctx.strokeRect(b.x - b.size / 2, b.y - b.size / 2, b.size, b.size);
      }
      ctx.restore();
    }
  }

  function drawBossLoot() {
    ctx.save();
    for (const b of bossLoot) {
      ctx.save();
      ctx.translate(b.x, b.y);
      const pulse = 1 + Math.sin(performance.now() * 0.006) * 0.08;
      ctx.scale(pulse, pulse);
      if (b.img && b.img.complete) {
        ctx.drawImage(b.img, -b.size / 2, -b.size / 2, b.size, b.size);
      } else {
        ctx.fillStyle = "#b8ffea";
        ctx.fillRect(-b.size / 2, -b.size / 2, b.size, b.size);
      }
      ctx.restore();
    }
    ctx.restore();
  }

  function drawPlayerShots() {
    ctx.save();
    for (const s of playerShots) {
      if (s.type === "beam") {
        const h = s.height || 20;
        const charge = s.charge || 0;
        const chargeT = Math.min(1, s.age / Math.max(0.0001, charge));
        const active = s.age >= charge;
        const beamX = s.x;
        const beamW = s.len || 0;
        const beamY = s.y - h / 2;
        const pulse = 0.65 + 0.35 * Math.sin(performance.now() * 0.012);
        if (!active) {
          ctx.globalAlpha = 0.8;
          ctx.strokeStyle = `rgba(160,255,220,${0.5 + 0.4 * chargeT})`;
          ctx.lineWidth = 2 + 3 * chargeT;
          ctx.beginPath();
          ctx.moveTo(beamX, beamY + h / 2);
          ctx.lineTo(beamX + Math.min(120, beamW) * chargeT, beamY + h / 2);
          ctx.stroke();
          ctx.globalAlpha = 1;
        } else {
          const grad = ctx.createLinearGradient(beamX, beamY, beamX + beamW, beamY);
          grad.addColorStop(0, `rgba(160,255,220,${0.9 * pulse})`);
          grad.addColorStop(0.4, `rgba(120,240,190,${0.75 * pulse})`);
          grad.addColorStop(1, "rgba(80,220,160,0)");
          ctx.fillStyle = grad;
          ctx.fillRect(beamX, beamY, beamW, h);

          ctx.globalCompositeOperation = "lighter";
          ctx.strokeStyle = `rgba(220,255,240,${0.9 * pulse})`;
          ctx.lineWidth = 5;
          ctx.strokeRect(beamX, beamY, beamW, h);

          ctx.strokeStyle = `rgba(120,255,200,${0.7 * pulse})`;
          ctx.lineWidth = 2;
          ctx.strokeRect(beamX, beamY + h * 0.25, beamW, h * 0.5);
          ctx.globalCompositeOperation = "source-over";
        }
        continue;
      }
      const size = s.size || 6;
      const shotAngle = Math.atan2(s.vy || 0, s.vx || 1);
      const stretch = 2.8;

      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.rotate(shotAngle);

      // Trailing streak
      ctx.globalCompositeOperation = 'lighter';
      const trailGrad = ctx.createLinearGradient(-size * stretch, 0, size * 0.4, 0);
      trailGrad.addColorStop(0, 'rgba(60,200,120,0)');
      trailGrad.addColorStop(1, 'rgba(160,255,180,0.45)');
      ctx.fillStyle = trailGrad;
      ctx.beginPath();
      ctx.ellipse(-size * stretch * 0.5, 0, size * stretch, size * 0.55, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalCompositeOperation = 'source-over';

      // Core dot
      const coreGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, size);
      coreGrad.addColorStop(0, 'rgba(220,255,210,1)');
      coreGrad.addColorStop(0.5, 'rgba(120,255,160,0.9)');
      coreGrad.addColorStop(1, 'rgba(60,200,100,0)');
      ctx.fillStyle = coreGrad;
      ctx.beginPath();
      ctx.arc(0, 0, size, 0, Math.PI * 2);
      ctx.fill();

      // Outer glow ring
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = 'rgba(100,255,150,0.38)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, size * 1.7, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalCompositeOperation = 'source-over';

      ctx.restore();
    }
    ctx.restore();
  }

  function drawBoss() {
    if (!inBossFight || !currentBoss) return;
    const b = currentBoss;
    ctx.save();
    ctx.translate(b.x, b.y);
    const wobble = 1 + Math.sin(b.t * 2) * 0.04;
    const rotAmp = b.id === 1 ? Math.PI / 12 : Math.PI / 4;
    const rot = Math.sin(b.t * 1.3) * rotAmp;
    ctx.scale(b.flipSide || 1, 1);
    ctx.rotate(rot);
    ctx.scale(wobble, wobble);
    ctx.translate(-b.x, -b.y);

    if (b.img.complete) {
      ctx.drawImage(b.img, b.x - b.width / 2, b.y - b.height / 2, b.width, b.height);
    } else {
      ctx.fillStyle = "#ff0000";
      ctx.fillRect(b.x - 80, b.y - 80, 160, 160);
    }

    if (b.hitFlash > 0 && b.img.complete) {
      ctx.save();
      ctx.globalAlpha = (b.hitFlash / 3) * 0.7;
      ctx.globalCompositeOperation = 'lighter';
      ctx.drawImage(b.img, b.x - b.width / 2, b.y - b.height / 2, b.width, b.height);
      ctx.restore();
    }

    ctx.restore();

    // HP bar (fix am oberen Bildschirmrand, nur wenn Boss sichtbar)
    const visible = b.x + b.width / 2 > 0 && b.x - b.width / 2 < WORLD_W;
    if (visible) {
      const barW = 260;
      const barH = 16;
      const bx = WORLD_W / 2 - barW / 2;
      const by = 40;
      ctx.fillStyle = "#000";
      ctx.fillRect(bx, by, barW, barH);
      const hpRatio = Math.max(0, Math.min(1, b.hp / b.maxHp));
      ctx.fillStyle = "#ff4444";
      ctx.fillRect(bx, by, barW * hpRatio, barH);
      ctx.strokeStyle = "#fff";
      ctx.strokeRect(bx, by, barW, barH);
    }

    // Beam visual
    if (b.beamState === "charge" || b.beamState === "fire") {
      const beamX = b.x - b.width / 2;
      const beamW = WORLD_W;
      const beamY = b.y - 50;
      const beamH = b.id === 3 ? 120 : 80;
      ctx.save();
      ctx.globalAlpha = b.beamState === "charge" ? 0.5 : 0.9;
      const grad = ctx.createLinearGradient(beamX - beamW, beamY, beamX, beamY);
      grad.addColorStop(0, "rgba(90,180,255,0)");
      grad.addColorStop(1, "rgba(90,180,255,1)");
      ctx.fillStyle = grad;
      ctx.fillRect(beamX - beamW, beamY, beamW, beamH);

      ctx.globalCompositeOperation = "lighter";
      ctx.strokeStyle = "rgba(180,240,255,0.8)";
      ctx.lineWidth = 6;
      ctx.strokeRect(beamX - beamW, beamY, beamW, beamH);
      ctx.restore();
    }

    drawBossShots();
  }

  function drawBossShots() {
    ctx.save();
    for (const s of bossShots) {
      if (!s || !Number.isFinite(s.x) || !Number.isFinite(s.y)) continue;
      const life = Number.isFinite(s.life) && s.life > 0 ? s.life : 1;
      const age = Number.isFinite(s.age) ? s.age : 0;
      const alpha = Math.max(0.2, 1 - age / life);
      if ((s.type === "bug" || s.type === "bugBomb") && s.img && s.img.complete && s.img.naturalWidth > 0) {
        const size = Number.isFinite(s.size) ? s.size : BUG_PROJECTILE_SIZE;
        ctx.globalAlpha = Math.max(0.4, alpha);
        ctx.drawImage(s.img, s.x - size / 2, s.y - size / 2, size, size);
        if (s.type === "bugBomb") {
          ctx.globalAlpha = Math.max(0.25, alpha);
          ctx.strokeStyle = "rgba(255,230,180,0.8)";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(s.x, s.y, size * 0.6, 0, Math.PI * 2);
          ctx.stroke();
          if (Number.isFinite(s.hp) && Number.isFinite(s.maxHp) && s.maxHp > 0) {
            const barW = size * 0.9;
            const barH = 6;
            const bx = s.x - barW / 2;
            const by = s.y - size / 2 - 12;
            ctx.globalAlpha = 0.9;
            ctx.fillStyle = "rgba(0,0,0,0.6)";
            ctx.fillRect(bx, by, barW, barH);
            const hpRatio = Math.max(0, Math.min(1, s.hp / s.maxHp));
            ctx.fillStyle = "rgba(255,120,90,0.9)";
            ctx.fillRect(bx, by, barW * hpRatio, barH);
            ctx.strokeStyle = "rgba(255,255,255,0.7)";
            ctx.strokeRect(bx, by, barW, barH);
          }
        }
        ctx.globalAlpha = 1;
        continue;
      }
      const size = Number.isFinite(s.size) ? s.size : 6;
      const color =
        s.type === "shard" ? "#ff99cc" :
        s.type === "seeker" ? "#88ffda" :
        s.type === "lock" ? "#ff5ad9" :
        s.type === "delay" ? "#ffd166" :
        s.type === "parallel" ? "#7dd3ff" :
        s.type === "warning" ? "#ffb347" :
        s.type === "add" ? "#a0ffb0" :
        s.type === "slicer" ? "#b4ff7a" :
        s.type === "mine" ? "#ff9b7a" :
        s.type === "cluster" ? "#ffcc44" :
        "#ffcc66";

      ctx.save();
      ctx.translate(s.x, s.y);

      // Comet tail aligned with velocity
      const shotAngle = Math.atan2(s.vy || 0, s.vx || -1);
      if (!perfMode) {
        ctx.save();
        ctx.rotate(shotAngle);
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = alpha * 0.38;
        const tailLen = size * 4;
        const tailGrad = ctx.createLinearGradient(-tailLen, 0, 0, 0);
        tailGrad.addColorStop(0, `${color}00`);
        tailGrad.addColorStop(1, `${color}88`);
        ctx.fillStyle = tailGrad;
        ctx.beginPath();
        ctx.ellipse(-tailLen / 2, 0, tailLen / 2, size * 0.48, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 1;
        ctx.restore();
      }

      // Spinning orb
      ctx.rotate(age * 2.6);
      const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, size * 1.8);
      grad.addColorStop(0, `${color}aa`);
      grad.addColorStop(1, `${color}00`);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(0, 0, size, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = `${color}${Math.floor(alpha * 255).toString(16).padStart(2, "0")}`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, size * 1.2, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.restore();
    }
    ctx.restore();
  }

  function drawExplosions() {
    if (!explosions.length) return;
    ctx.save();
    // lighter composite causes expensive framebuffer flush on mobile tile-GPUs — use source-over instead
    ctx.globalCompositeOperation = perfMode ? "source-over" : "lighter";
    for (const e of explosions) {
      const t = 1 - e.age / e.life;
      ctx.fillStyle = e.color.replace("1)", `${t})`);
      ctx.beginPath();
      ctx.arc(e.x, e.y, 6 * t + 2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawPlayer() {
    ctx.save();
    ctx.translate(player.x, player.y);
    ctx.rotate(player.rotation);

    const img = assets.logo;
    const r = player.radius;

    if (player.ghostTimer > 0) ctx.globalAlpha = 0.35;
    if (player.legendary) {
      ctx.shadowColor = "#ffd700";
      ctx.shadowBlur = 28;
    }

    if (player.colorPulseTimer > 0) {
      const pulse = 1 + Math.sin((1 - player.colorPulseTimer) * 12) * 0.08;
      ctx.scale(pulse, pulse);
    }

    if (player.pickupFlashTimer > 0 && !perfMode) {
      ctx.shadowColor = player.pickupFlashColor;
      ctx.shadowBlur = 22;
    }

    if (img.complete && img.naturalWidth) {
      const aspect = img.width / img.height;
      const scale = 1.62;
      let drawW = r * 2 * scale;
      let drawH = r * 2 * scale;
      if (aspect > 1) {
        drawH = drawW / aspect;
      } else {
        drawW = drawH * aspect;
      }
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
    } else {
      ctx.fillStyle = "#9ef";
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fill();
    }

    if (playerHitFlash > 0) {
      ctx.save();
      ctx.globalAlpha = (playerHitFlash / 5) * 0.65;
      if (!perfMode) ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = '#ff5555';
      ctx.beginPath();
      ctx.arc(0, 0, r * 2.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    if (player.shieldTimer > 0 || player.shieldHits > 0) {
      const shieldAngle = globalTime * 1.8;
      const shieldPulse = 0.65 + 0.2 * Math.sin(globalTime * 4);
      ctx.save();
      ctx.strokeStyle = `rgba(120,200,255,${shieldPulse})`;
      ctx.lineWidth = 3;
      if (!perfMode) { ctx.shadowColor = 'rgba(80,180,255,0.8)'; ctx.shadowBlur = 8; }
      ctx.beginPath();
      ctx.arc(0, 0, r + 10, shieldAngle, shieldAngle + Math.PI * 1.6);
      ctx.stroke();
      ctx.strokeStyle = `rgba(180,230,255,${shieldPulse * 0.5})`;
      ctx.lineWidth = 1.5;
      ctx.shadowBlur = 0;
      ctx.beginPath();
      ctx.arc(0, 0, r + 10, shieldAngle + Math.PI, shieldAngle + Math.PI + Math.PI * 0.5);
      ctx.stroke();
      ctx.restore();
    }

    if (player.turboTimer > 0) {
      ctx.save();
      if (perfMode) {
        // Mobile: single arc, no shadow
        const sparkPulse = 0.5 + 0.4 * Math.sin(globalTime * 7);
        ctx.strokeStyle = `rgba(255,170,60,${sparkPulse})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, r + 14, globalTime * 3.2, globalTime * 3.2 + Math.PI * 1.4);
        ctx.stroke();
      } else {
        for (let k = 0; k < 3; k++) {
          const a = globalTime * 3.2 + (k * Math.PI * 2) / 3;
          const sparkPulse = 0.5 + 0.4 * Math.sin(globalTime * 7 + k * 2.1);
          ctx.strokeStyle = `rgba(255,${140 + k * 30},60,${sparkPulse})`;
          ctx.lineWidth = 2.5;
          ctx.shadowColor = 'rgba(255,160,40,0.7)';
          ctx.shadowBlur = 6;
          ctx.beginPath();
          ctx.arc(0, 0, r + 16, a, a + Math.PI * 0.55);
          ctx.stroke();
        }
      }
      ctx.restore();
    }

    // Waffen-Indikator
    if (player.weaponMode !== "normal") {
      ctx.fillStyle = player.weaponMode === "beam" ? "#ffc878" : player.weaponMode === "spread" ? "#c6b5ff" : "#7fe3ff";
      ctx.font = `600 12px ${SECONDARY_FONT}`;
      ctx.textAlign = "right";
      ctx.textBaseline = "top";
      const label = player.weaponMode === "beam" ? `Beam (${player.ammoRapid})` : player.weaponMode === "spread" ? `Streuung (${player.ammoSpread})` : `Salve (${player.ammoSalvo})`;
      ctx.fillText(label, -r - 6, -r - 14);
    }

    ctx.restore();
  }


function drawUI() {
  ctx.save();
  const showIntro = !gameRunning && !gameOver;
  const showLeaderboardPanel = gameOver && !gameRunning;
  let nameButtonCandidate = null;

  const ms = mobileScale;
  // Visible safe bottom in world coords — 30 CSS-px margin covers home-indicator/notch.
  const safeWorldBottom = isMobile()
    ? Math.min(WORLD_H, (viewH - 30 - viewOffsetY) / viewScale)
    : WORLD_H;
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  // Dynamic line positions so nothing overlaps regardless of name length or ms scale
  const _hudNameSize = Math.round(14 * ms);
  const _hudScoreSize = Math.round(18 * ms);
  const _hudNameY = 14;
  const _hudScoreY = _hudNameY + _hudNameSize + Math.round(12 * ms);
  const _hudHsY = _hudScoreY + Math.round(_hudScoreSize * 1.5) + Math.round(10 * ms);
  ctx.fillStyle = "#8fd3ff";
  ctx.font = `600 ${_hudNameSize}px ${SECONDARY_FONT}`;
  ctx.fillText(`Spieler: ${playerName || "---"}`, 16, _hudNameY);

  // Score with flash animation
  if (score !== lastDrawnScore) { scoreFlashTimer = 0.35; lastDrawnScore = score; }
  const scoreScale = 1 + (scoreFlashTimer > 0 ? 0.22 * (scoreFlashTimer / 0.35) : 0);
  ctx.save();
  ctx.translate(16, _hudScoreY);
  ctx.scale(scoreScale, scoreScale);
  ctx.font = `400 ${_hudScoreSize}px ${PRIMARY_FONT}`;
  ctx.fillStyle = scoreFlashTimer > 0 ? "#ffe066" : "#fff";
  if (scoreFlashTimer > 0 && !perfMode) { ctx.shadowColor = "#ffe066"; ctx.shadowBlur = 14; }
  ctx.fillText(`Punkte: ${score}`, 0, 0);
  ctx.restore();

  ctx.font = `600 ${_hudNameSize}px ${SECONDARY_FONT}`;
  ctx.fillStyle = "#9ec9ff";
  ctx.fillText(`Highscore: ${highscore}`, 16, _hudHsY);

  if (inBossFight && currentBoss && currentBoss.id === 4 && currentBoss.phase === 2) {
    const secs = Math.max(0, Math.ceil(currentBoss.cutoverTimer));
    const mm = String(Math.floor(secs / 60)).padStart(2, "0");
    const ss = String(secs % 60).padStart(2, "0");
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `600 20px ${SECONDARY_FONT}`;
    ctx.fillStyle = "#ffd166";
    ctx.fillText(`Cutover Window ${mm}:${ss}`, WORLD_W / 2, 96);
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
  }

  if (!pendingBossId && !bossTransitionActive && scoreTauntTimer > 0 && scoreTauntText) {
    const t = Math.min(1, scoreTauntTimer / SCORE_TAUNT_DURATION);
    const alpha = Math.min(1, t * 1.2);
    const bannerW = 520;
    const bannerH = 48;
    const bx = WORLD_W / 2 - bannerW / 2;
    const by = 118;
    ctx.save();
    ctx.globalAlpha = 0.85 * alpha;
    ctx.fillStyle = "rgba(8,14,28,0.85)";
    ctx.strokeStyle = "rgba(111,190,255,0.6)";
    ctx.lineWidth = 2;
    ctx.fillRect(bx, by, bannerW, bannerH);
    ctx.strokeRect(bx, by, bannerW, bannerH);
    ctx.globalAlpha = alpha;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `600 20px ${SECONDARY_FONT}`;
    ctx.fillStyle = "#e8f6ff";
    ctx.fillText(scoreTauntText, WORLD_W / 2, by + bannerH / 2);
    ctx.restore();
  }

  const boardW = 260;
  const boardX = WORLD_W - boardW - 26;
  const boardY = 30;
  const boardH = isMobile()
    ? Math.max(200, Math.min(WORLD_H - 60, Math.floor(safeWorldBottom) - boardY - 10))
    : WORLD_H - 60;

  if (showLeaderboardPanel) {
    ctx.save();
    ctx.translate(boardX, boardY);
    ctx.fillStyle = "rgba(4,10,26,0.9)";
    ctx.strokeStyle = "rgba(79,210,255,0.35)";
    ctx.lineWidth = 2;
    ctx.fillRect(0, 0, boardW, boardH);
    ctx.strokeRect(0, 0, boardW, boardH);

    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.font = `400 11px ${PRIMARY_FONT}`;
    ctx.fillStyle = "#dff6ff";
    ctx.fillText("Leaderboard", boardW / 2, 10);
    ctx.font = `400 8px ${PRIMARY_FONT}`;
    ctx.fillStyle = "#7fb2d7";
    ctx.fillText("TOP 50", boardW / 2, 32);

    const listY = 56;
    const listHeight = boardH - 120;
    const listWidth = boardW - 20;

    ctx.save();
    ctx.beginPath();
    ctx.rect(10, listY, listWidth, listHeight);
    ctx.clip();

    const entries = leaderboard.slice(0, 50);
    if (!entries.length) {
      ctx.textAlign = "center";
      ctx.font = `400 8px ${PRIMARY_FONT}`;
      ctx.fillStyle = "#7f9dbb";
      ctx.fillText("KEINE SCORES", boardW / 2, listY + listHeight / 2 - 8);
    } else {
      const totalHeight = entries.length * LEADERBOARD_ENTRY_HEIGHT;
      const visibleRows = Math.ceil(listHeight / LEADERBOARD_ENTRY_HEIGHT);
      const useScroll = entries.length > visibleRows;
      const scroll = useScroll ? leaderboardScrollOffset % totalHeight : 0;
      const startIdx = useScroll ? Math.floor(scroll / LEADERBOARD_ENTRY_HEIGHT) : 0;
      const offsetY = useScroll ? scroll % LEADERBOARD_ENTRY_HEIGHT : 0;
      const rowsToDraw = useScroll ? visibleRows + 2 : entries.length;

      for (let i = 0; i < rowsToDraw; i++) {
        const entryIndex = useScroll ? (startIdx + i) % entries.length : i;
        const entry = entries[entryIndex];
        const rank = entryIndex + 1;
        const rowCenter =
          listY + i * LEADERBOARD_ENTRY_HEIGHT - offsetY + LEADERBOARD_ENTRY_HEIGHT / 2;

        ctx.fillStyle = rank <= 3 ? "rgba(255,211,107,0.10)" : "rgba(255,255,255,0.02)";
        ctx.fillRect(12, rowCenter - 12, listWidth - 4, LEADERBOARD_ENTRY_HEIGHT - 2);

        const style = getLeaderboardEntryStyle(entry);
        const baseColor = style.color || (rank <= 3 ? "#ffd36b" : "#b8d8f0");
        const rankStr = String(rank).padStart(2, "0");
        let displayName = style.displayName || "";
        if (displayName.length > 10) displayName = displayName.slice(0, 9) + "…";

        ctx.save();
        if (rank <= 3) { ctx.shadowColor = baseColor; ctx.shadowBlur = 10; }
        ctx.textAlign = "left";
        ctx.font = `400 8px ${PRIMARY_FONT}`;
        ctx.fillStyle = rank <= 3 ? baseColor : "rgba(180,210,240,0.7)";
        ctx.fillText(rankStr, 18, rowCenter);
        ctx.fillStyle = baseColor;
        ctx.fillText(displayName, 42, rowCenter);
        ctx.restore();

        ctx.textAlign = "right";
        ctx.font = `400 8px ${PRIMARY_FONT}`;
        ctx.fillStyle = "#6bc4f0";
        ctx.fillText(`${entry.score}`, boardW - 14, rowCenter);
      }
    }
    ctx.restore();

    const panelBtn = { x: 20, y: boardH - 56, w: boardW - 40, h: 40 };
  ctx.fillStyle = "#5099C9";
  ctx.strokeStyle = "#5099C9";
    ctx.lineWidth = 1.4;
    ctx.fillRect(panelBtn.x, panelBtn.y, panelBtn.w, panelBtn.h);
    ctx.strokeRect(panelBtn.x, panelBtn.y, panelBtn.w, panelBtn.h);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `400 8px ${PRIMARY_FONT}`;
    ctx.fillStyle = "#e3f6ff";
    ctx.fillText("NAME ANPASSEN", panelBtn.x + panelBtn.w / 2, panelBtn.y + panelBtn.h / 2);
    ctx.restore();
    nameButtonCandidate = { x: boardX + panelBtn.x, y: boardY + panelBtn.y, w: panelBtn.w, h: panelBtn.h };
  }

  const hudLeft = 16;
  const TOTAL_HEARTS = 5;
  const heartSize = Math.round(20 * ms);
  const heartGap = Math.round(6 * ms);
  const heartsTopY = isMobile()
    ? Math.round(safeWorldBottom) - Math.round(65 * ms)
    : WORLD_H - Math.round(118 * ms);

  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  const hpRatio = player.hp / player.maxHp;
  const hpLowPulse = hpRatio < 0.25 ? 0.6 + 0.4 * Math.abs(Math.sin(globalTime * 6)) : 1;
  const heartColor = hpRatio > 0.5 ? "#8bff9c" : hpRatio > 0.25 ? "#ffd966" : "#ff5555";

  // HP label
  ctx.font = `400 ${Math.round(8 * ms)}px ${PRIMARY_FONT}`;
  ctx.fillStyle = hpRatio < 0.25 ? `rgba(255,85,85,${hpLowPulse})` : "rgba(255,255,255,0.55)";
  ctx.fillText("HP", hudLeft, heartsTopY - Math.round(12 * ms));

  // Hearts
  const fullHearts = Math.floor(hpRatio * TOTAL_HEARTS);
  const halfHeart = ((hpRatio * TOTAL_HEARTS) - fullHearts) >= 0.45 ? 1 : 0;
  ctx.save();
  ctx.font = `${heartSize}px sans-serif`;
  ctx.textBaseline = "top";
  for (let i = 0; i < TOTAL_HEARTS; i++) {
    const hx = hudLeft + i * (heartSize + heartGap);
    const isFull = i < fullHearts;
    const isHalf = !isFull && (i === fullHearts) && halfHeart;
    if (isFull) {
      if (hpRatio < 0.25 && !perfMode) { ctx.shadowColor = "#ff5555"; ctx.shadowBlur = 8 * hpLowPulse; }
      ctx.fillStyle = heartColor;
    } else if (isHalf) {
      ctx.shadowBlur = 0;
      ctx.fillStyle = `rgba(${hpRatio < 0.25 ? "255,85,85" : hpRatio < 0.5 ? "255,217,102" : "139,255,156"},0.45)`;
    } else {
      ctx.shadowBlur = 0;
      ctx.fillStyle = "rgba(255,255,255,0.1)";
    }
    ctx.fillText("♥", hx, heartsTopY);
  }
  ctx.shadowBlur = 0;
  ctx.restore();

  // Armor segments
  const armorTopY = heartsTopY + heartSize + Math.round(16 * ms);
  const maxShield = player.maxHp * SHIELD_MAX_RATIO;
  const armorRatio = maxShield > 0 ? Math.min(1, player.shieldCharge / maxShield) : 0;
  const TOTAL_SEGS = 5;
  const segW = Math.round(30 * ms);
  const segH = Math.round(7 * ms);
  const segGap = Math.round(3 * ms);

  ctx.font = `400 ${Math.round(8 * ms)}px ${PRIMARY_FONT}`;
  ctx.textBaseline = "middle";
  ctx.fillStyle = "rgba(140,210,255,0.50)";
  ctx.fillText("RST", hudLeft, armorTopY - Math.round(10 * ms));

  const fullSegs = Math.round(armorRatio * TOTAL_SEGS);
  ctx.save();
  for (let i = 0; i < TOTAL_SEGS; i++) {
    const sx = hudLeft + i * (segW + segGap);
    const filled = i < fullSegs;
    if (filled) { ctx.shadowColor = "rgba(138,216,255,0.5)"; ctx.shadowBlur = 4; }
    ctx.fillStyle = filled ? "#8ad8ff" : "rgba(140,200,255,0.1)";
    ctx.strokeStyle = filled ? "rgba(140,200,255,0.5)" : "rgba(140,200,255,0.2)";
    ctx.lineWidth = 1;
    ctx.fillRect(sx, armorTopY, segW, segH);
    ctx.strokeRect(sx, armorTopY, segW, segH);
    ctx.shadowBlur = 0;
  }
  ctx.restore();

  const statusY = armorTopY + segH + Math.round(10 * ms);
  if (player.shieldHits > 0) {
    ctx.fillStyle = "#9ed8ff";
    ctx.textBaseline = "top";
    ctx.font = `400 ${Math.round(8 * ms)}px ${PRIMARY_FONT}`;
    ctx.fillText("SCHILD AKTIV", hudLeft, statusY);
  }

  if (player.lockTimer > 0) {
    ctx.fillStyle = "#ff5ad9";
    ctx.textBaseline = "top";
    ctx.font = `400 ${Math.round(8 * ms)}px ${PRIMARY_FONT}`;
    ctx.fillText("LOCKING", hudLeft, statusY + (player.shieldHits > 0 ? Math.round(16 * ms) : 0));
  }

  if (showIntro) {
    ctx.save();
    const bgFadeIn = Math.min(1, introAnimTimer / 0.55);

    // ── 1. Background: dark + grid + stars + vignette ────────────────────
    ctx.fillStyle = "#020912";
    ctx.fillRect(0, 0, WORLD_W, WORLD_H);

    // Grid
    ctx.save();
    ctx.globalAlpha = bgFadeIn * 0.55;
    ctx.strokeStyle = "rgba(79,180,255,0.045)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let gx = 0; gx <= WORLD_W; gx += 40) { ctx.moveTo(gx, 0); ctx.lineTo(gx, WORLD_H); }
    for (let gy = 0; gy <= WORLD_H; gy += 40) { ctx.moveTo(0, gy); ctx.lineTo(WORLD_W, gy); }
    ctx.stroke();
    ctx.restore();

    // Drifting pixel stars
    if (!_introStars) {
      _introStars = Array.from({ length: 28 }, () => ({
        x: Math.random() * WORLD_W, y: Math.random() * WORLD_H,
        vx: -(6 + Math.random() * 10), vy: -0.5 + Math.random(),
        b: 0.2 + Math.random() * 0.7, s: Math.random() < 0.4 ? 2 : 1,
      }));
    }
    ctx.save();
    ctx.globalAlpha = bgFadeIn * 0.85;
    for (const s of _introStars) {
      s.x += s.vx * rawDt; s.y += s.vy * rawDt;
      if (s.x < -2) { s.x = WORLD_W + 2; s.y = Math.random() * WORLD_H; }
      if (s.y < -2) s.y = WORLD_H + 2;
      if (s.y > WORLD_H + 2) s.y = -2;
      ctx.globalAlpha = bgFadeIn * s.b;
      ctx.fillStyle = "#aad8ff";
      ctx.fillRect(Math.round(s.x), Math.round(s.y), s.s, s.s);
    }
    ctx.restore();

    // Vignette
    const vig = ctx.createRadialGradient(WORLD_W / 2, WORLD_H / 2, 180, WORLD_W / 2, WORLD_H / 2, 720);
    vig.addColorStop(0, "rgba(0,0,0,0)");
    vig.addColorStop(1, "rgba(0,0,0,0.7)");
    ctx.save();
    ctx.globalAlpha = bgFadeIn;
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, WORLD_W, WORLD_H);
    ctx.restore();

    // ── 2. Left column ──────────────────────────────────────────────────
    const leftCX = 380;
    const fadeIn = bgFadeIn;

    // Logo — with float
    const logoFloat = Math.sin(globalTime * 1.2) * 3;
    if (assets.logo && assets.logo.complete && assets.logo.naturalWidth > 0) {
      const logoSize = 60;
      const glow = 0.6 + 0.4 * Math.sin(globalTime * 2.4);
      ctx.save();
      ctx.globalAlpha = fadeIn;
      ctx.shadowColor = "rgba(79,180,255,0.85)";
      ctx.shadowBlur = 22 * glow;
      ctx.drawImage(assets.logo, leftCX - logoSize / 2, 60 + logoFloat, logoSize, logoSize);
      ctx.restore();
    }

    // Title — with float + glitch
    const titleFloat = Math.sin(globalTime * 1.8) * 2;
    const titleY = 170 + titleFloat;
    const titleText = "JUMPING NEXUS";
    ctx.save();
    ctx.globalAlpha = fadeIn;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `400 28px ${PRIMARY_FONT}`;

    // Chromatic aberration glitch every ~8s for 0.12s
    if (_introGlitchTimer >= 8) _introGlitchTimer = -(0.12);
    const glitching = _introGlitchTimer < 0 && _introGlitchTimer > -0.12;
    if (glitching) {
      ctx.globalAlpha = fadeIn * 0.6;
      ctx.fillStyle = "#ff4444";
      ctx.fillText(titleText, leftCX - 3, titleY);
      ctx.fillStyle = "#4444ff";
      ctx.fillText(titleText, leftCX + 3, titleY);
      ctx.globalAlpha = fadeIn;
    }
    ctx.shadowColor = "rgba(100,200,255,0.9)";
    ctx.shadowBlur = 12 + 6 * Math.sin(globalTime * 1.8);
    ctx.fillStyle = glitching ? "#ffffff" : "#e2f1ff";
    ctx.fillText(titleText, leftCX, titleY);
    ctx.restore();

    // Slogan
    ctx.save();
    ctx.globalAlpha = fadeIn * Math.min(1, (introAnimTimer - 0.2) / 0.4);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `400 16px ${SECONDARY_FONT}`;
    ctx.fillStyle = "rgba(120,175,210,0.88)";
    ctx.fillText("Der einzige Sprint, den du gerne machst.", leftCX, 215);
    ctx.restore();

    // Divider
    ctx.save();
    ctx.globalAlpha = fadeIn * Math.min(1, (introAnimTimer - 0.25) / 0.4) * 0.35;
    ctx.strokeStyle = "rgba(79,160,255,0.8)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(leftCX - 140, 245);
    ctx.lineTo(leftCX + 140, 245);
    ctx.stroke();
    ctx.restore();

    // Name input
    const nameFade = Math.max(0, Math.min(1, (introAnimTimer - 0.3) / 0.45));
    const nameFieldW = 320;
    const nameFieldH = 48;
    const nameFieldX = Math.round(leftCX - nameFieldW / 2);
    const nameFieldY = 265;
    introNameRect = { x: nameFieldX, y: nameFieldY, w: nameFieldW, h: nameFieldH };
    ctx.save();
    ctx.globalAlpha = nameFade;
    const fActive = introInputActive;
    ctx.fillStyle = "rgba(4,10,22,0.92)";
    ctx.strokeStyle = fActive ? "rgba(79,210,255,1)" : "rgba(79,160,255,0.45)";
    ctx.lineWidth = fActive ? 2 : 1;
    if (fActive) { ctx.shadowColor = "rgba(79,210,255,0.45)"; ctx.shadowBlur = 12; }
    const nfr = 10;
    ctx.beginPath();
    ctx.moveTo(nameFieldX + nfr, nameFieldY);
    ctx.lineTo(nameFieldX + nameFieldW - nfr, nameFieldY);
    ctx.quadraticCurveTo(nameFieldX + nameFieldW, nameFieldY, nameFieldX + nameFieldW, nameFieldY + nfr);
    ctx.lineTo(nameFieldX + nameFieldW, nameFieldY + nameFieldH - nfr);
    ctx.quadraticCurveTo(nameFieldX + nameFieldW, nameFieldY + nameFieldH, nameFieldX + nameFieldW - nfr, nameFieldY + nameFieldH);
    ctx.lineTo(nameFieldX + nfr, nameFieldY + nameFieldH);
    ctx.quadraticCurveTo(nameFieldX, nameFieldY + nameFieldH, nameFieldX, nameFieldY + nameFieldH - nfr);
    ctx.lineTo(nameFieldX, nameFieldY + nfr);
    ctx.quadraticCurveTo(nameFieldX, nameFieldY, nameFieldX + nfr, nameFieldY);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;
    // "NAME" label
    ctx.font = `400 8px ${PRIMARY_FONT}`;
    ctx.fillStyle = fActive ? "rgba(79,210,255,0.8)" : "rgba(79,160,200,0.55)";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText("NAME", nameFieldX + 14, nameFieldY + 6);
    // Value/placeholder
    const displayText = introInputValue || "";
    const isPlaceholder = !displayText && !fActive;
    ctx.font = `600 16px ${SECONDARY_FONT}`;
    ctx.fillStyle = isPlaceholder ? "rgba(90,130,160,0.55)" : "#d8eeff";
    ctx.textBaseline = "bottom";
    ctx.fillText(isPlaceholder ? "Dein Name…" : displayText, nameFieldX + 14, nameFieldY + nameFieldH - 8);
    if (fActive && Math.floor(introInputBlinkTimer * 2) % 2 === 0) {
      ctx.font = `600 16px ${SECONDARY_FONT}`;
      const cursorX = nameFieldX + 14 + ctx.measureText(displayText).width + 2;
      ctx.fillStyle = "#79d4ff";
      ctx.fillRect(Math.round(cursorX), nameFieldY + 20, 1, nameFieldH - 28);
    }
    ctx.restore();

    // START button
    const btnFade = Math.max(0, Math.min(1, (introAnimTimer - 0.5) / 0.4));
    const btnW = 320;
    const btnH = 64;
    const startButtonY = nameFieldY + nameFieldH + 14;
    const btnSquashX = _introButtonTap > 0 ? 1 + 0.03 * Math.sin(_introButtonTap * Math.PI) : 1;
    const btnSquashY = _introButtonTap > 0 ? 1 - 0.05 * Math.sin(_introButtonTap * Math.PI) : 1;
    startButtonRect = { x: leftCX - btnW / 2, y: startButtonY, w: btnW, h: btnH };

    ctx.save();
    ctx.globalAlpha = btnFade;
    ctx.translate(leftCX, startButtonY + btnH / 2);
    ctx.scale(btnSquashX, btnSquashY);
    ctx.translate(-leftCX, -(startButtonY + btnH / 2));
    const pulse = 0.82 + 0.18 * Math.sin(globalTime * 3.2);
    ctx.shadowColor = `rgba(60,140,255,${0.85 * pulse})`;
    ctx.shadowBlur = 28 * pulse;
    const btnGrad = ctx.createLinearGradient(startButtonRect.x, startButtonRect.y, startButtonRect.x, startButtonRect.y + btnH);
    btnGrad.addColorStop(0, `rgba(62,158,230,${pulse})`);
    btnGrad.addColorStop(1, `rgba(30,88,175,${pulse})`);
    ctx.fillStyle = btnGrad;
    const br = 14;
    ctx.beginPath();
    ctx.moveTo(startButtonRect.x + br, startButtonRect.y);
    ctx.lineTo(startButtonRect.x + btnW - br, startButtonRect.y);
    ctx.quadraticCurveTo(startButtonRect.x + btnW, startButtonRect.y, startButtonRect.x + btnW, startButtonRect.y + br);
    ctx.lineTo(startButtonRect.x + btnW, startButtonRect.y + btnH - br);
    ctx.quadraticCurveTo(startButtonRect.x + btnW, startButtonRect.y + btnH, startButtonRect.x + btnW - br, startButtonRect.y + btnH);
    ctx.lineTo(startButtonRect.x + br, startButtonRect.y + btnH);
    ctx.quadraticCurveTo(startButtonRect.x, startButtonRect.y + btnH, startButtonRect.x, startButtonRect.y + btnH - br);
    ctx.lineTo(startButtonRect.x, startButtonRect.y + br);
    ctx.quadraticCurveTo(startButtonRect.x, startButtonRect.y, startButtonRect.x + br, startButtonRect.y);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = `rgba(130,210,255,${0.65 * pulse})`;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `400 16px ${PRIMARY_FONT}`;
    ctx.fillStyle = "#eaf6ff";
    ctx.fillText("START", leftCX, startButtonRect.y + btnH / 2 - 5);
    ctx.font = `400 12px ${SECONDARY_FONT}`;
    ctx.fillStyle = `rgba(160,210,240,0.5)`;
    ctx.fillText("Leertaste / Tap", leftCX, startButtonRect.y + btnH / 2 + 14);
    ctx.restore();

    // ── 3. Right column: leaderboard panel ──────────────────────────────
    const lbX = 860, lbY = 90, lbW = 270, lbH = 420;
    const lbFade = Math.max(0, Math.min(1, (introAnimTimer - 0.35) / 0.5));
    if (lbFade > 0) {
      ctx.save();
      ctx.globalAlpha = lbFade;
      ctx.translate(lbX, lbY);

      // Panel background
      ctx.fillStyle = "rgba(4,10,26,0.92)";
      ctx.strokeStyle = "rgba(79,210,255,0.35)";
      ctx.lineWidth = 1.5;
      ctx.fillRect(0, 0, lbW, lbH);
      ctx.strokeRect(0, 0, lbW, lbH);

      // Cyan top accent
      const accGrad = ctx.createLinearGradient(0, 0, lbW, 0);
      accGrad.addColorStop(0, "rgba(79,210,255,0.0)");
      accGrad.addColorStop(0.5, "rgba(79,210,255,0.6)");
      accGrad.addColorStop(1, "rgba(79,210,255,0.0)");
      ctx.fillStyle = accGrad;
      ctx.fillRect(0, 0, lbW, 2);

      // Title
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = `400 11px ${PRIMARY_FONT}`;
      ctx.fillStyle = "#dff6ff";
      ctx.shadowColor = "rgba(79,210,255,0.5)";
      ctx.shadowBlur = 8;
      ctx.fillText("LEADERBOARD", lbW / 2, 22);
      ctx.shadowBlur = 0;
      ctx.font = `400 12px ${SECONDARY_FONT}`;
      ctx.fillStyle = "rgba(120,180,220,0.6)";
      ctx.fillText("Top Spieler", lbW / 2, 42);

      // Divider
      ctx.strokeStyle = "rgba(79,160,255,0.2)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(16, 56);
      ctx.lineTo(lbW - 16, 56);
      ctx.stroke();

      // Entries
      const lbListY = 64;
      const lbListH = lbH - 64 - 56;
      const lbRowH = 28;
      ctx.save();
      ctx.beginPath();
      ctx.rect(8, lbListY, lbW - 16, lbListH);
      ctx.clip();

      const lbEntries = leaderboard.slice(0, 50);
      if (!lbEntries.length) {
        ctx.textAlign = "center";
        ctx.font = `400 8px ${PRIMARY_FONT}`;
        ctx.fillStyle = "rgba(120,160,200,0.5)";
        ctx.fillText("KEINE SCORES", lbW / 2, lbListY + lbListH / 2);
      } else {
        const lbTotal = lbEntries.length * lbRowH;
        const lbVisible = Math.ceil(lbListH / lbRowH);
        const lbScroll = lbEntries.length > lbVisible ? leaderboardScrollOffset % lbTotal : 0;
        const lbStart = Math.floor(lbScroll / lbRowH);
        const lbOff = lbScroll % lbRowH;
        const lbDraw = lbEntries.length > lbVisible ? lbVisible + 2 : lbEntries.length;

        for (let i = 0; i < lbDraw; i++) {
          const idx = (lbStart + i) % lbEntries.length;
          const entry = lbEntries[idx];
          const rank = idx + 1;
          const rowY = lbListY + i * lbRowH - lbOff;
          const rowMid = rowY + lbRowH / 2;
          const isMe = playerName && entry.name === playerName;

          ctx.fillStyle = rank <= 3 ? "rgba(255,211,107,0.08)" : isMe ? "rgba(79,200,255,0.08)" : "rgba(255,255,255,0.015)";
          ctx.fillRect(8, rowY + 2, lbW - 16, lbRowH - 3);

          const style = getLeaderboardEntryStyle(entry);
          const baseColor = rank === 1 ? "#ffd36b" : rank === 2 ? "#d0d8e8" : rank === 3 ? "#e8a060" : isMe ? "#7fd4f8" : "#b0c8e0";
          let dName = style.displayName || "";
          if (dName.length > 12) dName = dName.slice(0, 11) + "…";

          ctx.save();
          if (rank <= 3) { ctx.shadowColor = baseColor; ctx.shadowBlur = 8; }
          ctx.textBaseline = "middle";
          ctx.font = `400 8px ${PRIMARY_FONT}`;
          ctx.fillStyle = rank <= 3 ? baseColor : "rgba(160,200,230,0.6)";
          ctx.textAlign = "left";
          ctx.fillText(String(rank).padStart(2, "0"), 16, rowMid);
          ctx.fillStyle = baseColor;
          ctx.fillText(dName, 44, rowMid);
          ctx.textAlign = "right";
          ctx.fillStyle = "rgba(100,200,240,0.75)";
          ctx.fillText(String(entry.score), lbW - 16, rowMid);
          ctx.restore();
        }
      }
      ctx.restore();

      // Name anpassen button
      const lbBtnY = lbH - 48;
      const lbBtnX = 16;
      const lbBtnW = lbW - 32;
      const lbBtnH = 36;
      ctx.fillStyle = "rgba(40,90,160,0.7)";
      ctx.strokeStyle = "rgba(79,160,220,0.5)";
      ctx.lineWidth = 1;
      ctx.fillRect(lbBtnX, lbBtnY, lbBtnW, lbBtnH);
      ctx.strokeRect(lbBtnX, lbBtnY, lbBtnW, lbBtnH);
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = `400 8px ${PRIMARY_FONT}`;
      ctx.fillStyle = "#c8e8ff";
      ctx.fillText("NAME ANPASSEN", lbBtnX + lbBtnW / 2, lbBtnY + lbBtnH / 2);
      nameButtonCandidate = { x: lbX + lbBtnX, y: lbY + lbBtnY, w: lbBtnW, h: lbBtnH };

      ctx.restore();
    }

    // ── 3b. Left-side powerup cycling hint ──────────────────────────────
    const hintFade = Math.max(0, Math.min(1, (introAnimTimer - 0.52) / 0.4));
    if (hintFade > 0) {
      const hintEffects = [
        { color: "#88ccff", label: "Geist",        desc: "Hindernisse passieren",    star: false },
        { color: "#5cc8ff", label: "Schild",        desc: "Nächsten Treffer blocken", star: false },
        { color: "#ffe066", label: "2× Punkte",     desc: "Doppelter Score",          star: false },
        { color: "#8df0c3", label: "Schrumpfen",    desc: "Kleiner = weniger Treffer",star: false },
        { color: "#ff8899", label: "Groß",          desc: "Werde riesig",             star: false },
        { color: "#ff88dd", label: "Magnet",        desc: "Lootboxen anziehen",       star: false },
        { color: "#ffcc00", label: "Score-Rush",    desc: "+1 Extra-Punkt pro Säule", star: false },
        { color: "#ffd700", label: "★ Goldene Box", desc: "Risiko = mehr Belohnung!", star: true  },
      ];
      const cycleDur = 2.5;
      const cycleIdx = Math.floor(globalTime / cycleDur) % hintEffects.length;
      const t = (globalTime % cycleDur) / cycleDur;

      let slideOff, alpha;
      if (t < 0.10) {
        alpha = t / 0.10;
        slideOff = (1 - alpha) * 10;
      } else if (t < 0.85) {
        alpha = 1;
        slideOff = 0;
      } else {
        alpha = Math.max(0, 1 - (t - 0.85) / 0.15);
        slideOff = -(1 - alpha) * 6;
      }

      const eff = hintEffects[cycleIdx];
      const hintW = 288;
      const hintHH = 38;
      const hintX = leftCX - hintW / 2;
      const baseHintY = startButtonY + btnH + 22;
      const hintY = Math.round(baseHintY + slideOff);

      ctx.save();
      ctx.globalAlpha = hintFade * alpha;

      // Left accent bar
      ctx.fillStyle = eff.color;
      ctx.globalAlpha = hintFade * alpha * 0.85;
      ctx.fillRect(hintX, hintY, 3, hintHH);
      ctx.globalAlpha = hintFade * alpha;

      // Bullet or star
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = `700 ${eff.star ? "13" : "9"}px ${SECONDARY_FONT}`;
      ctx.fillStyle = eff.color;
      ctx.fillText(eff.star ? "★" : "●", hintX + 16, hintY + hintHH / 2);

      // Label
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      ctx.font = `700 13px ${SECONDARY_FONT}`;
      ctx.fillStyle = eff.color;
      ctx.fillText(eff.label, hintX + 28, hintY + 5);

      // Description
      ctx.font = `400 11px ${SECONDARY_FONT}`;
      ctx.fillStyle = "rgba(175,215,235,0.65)";
      ctx.fillText(eff.desc, hintX + 28, hintY + 21);

      // Progress dots
      const dotCount = hintEffects.length;
      const dotGap = 11;
      const dotsW = (dotCount - 1) * dotGap;
      const dotsStartX = leftCX - dotsW / 2;
      const dotsY = Math.round(baseHintY + hintHH + 9);
      ctx.globalAlpha = hintFade;
      for (let di = 0; di < dotCount; di++) {
        ctx.beginPath();
        ctx.arc(dotsStartX + di * dotGap, dotsY, di === cycleIdx ? 3 : 1.8, 0, Math.PI * 2);
        ctx.fillStyle = di === cycleIdx ? hintEffects[di].color : "rgba(100,150,200,0.28)";
        ctx.fill();
      }

      ctx.restore();

      // [P] Pause hint — fixed position below dots
      const pauseFade = Math.max(0, Math.min(1, (introAnimTimer - 0.7) / 0.3));
      if (pauseFade > 0) {
        const pausePulse = 0.6 + 0.4 * Math.sin(globalTime * 1.5);
        const pHintY = Math.round(baseHintY + hintHH + 28);
        const keyW = 19, keyH = 17;
        const keyX = Math.round(leftCX - (keyW + 40) / 2);
        const keyY_p = Math.round(pHintY - keyH / 2);
        ctx.save();
        ctx.globalAlpha = hintFade * pauseFade * (0.5 + 0.2 * pausePulse);
        ctx.fillStyle = "rgba(20,50,90,0.85)";
        ctx.strokeStyle = `rgba(120,190,240,${0.45 + 0.3 * pausePulse})`;
        ctx.lineWidth = 1.5;
        ctx.fillRect(keyX, keyY_p, keyW, keyH);
        ctx.strokeRect(keyX, keyY_p, keyW, keyH);
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.font = `700 10px ${SECONDARY_FONT}`;
        ctx.fillStyle = "rgba(200,235,255,0.85)";
        ctx.fillText("P", keyX + keyW / 2, keyY_p + keyH / 2);
        ctx.textAlign = "left";
        ctx.font = `400 11px ${SECONDARY_FONT}`;
        ctx.fillStyle = "rgba(140,190,220,0.7)";
        ctx.fillText("Pause", keyX + keyW + 6, pHintY);
        ctx.restore();
      }
    }

    // ── 4. Footer credits ────────────────────────────────────────────────
    const credFade = Math.max(0, Math.min(1, (introAnimTimer - 0.75) / 0.45));
    ctx.save();
    ctx.globalAlpha = credFade;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const devGlow = 0.55 + 0.45 * Math.sin(globalTime * 1.1);
    ctx.font = `400 11px ${SECONDARY_FONT}`;
    ctx.fillStyle = `rgba(130,175,210,${0.65 + 0.25 * devGlow})`;
    ctx.shadowColor = "rgba(79,160,255,0.4)";
    ctx.shadowBlur = 5 * devGlow;
    ctx.fillText("Gameplay & Musik: Patrick Dause", WORLD_W / 2, WORLD_H - 40);
    ctx.shadowBlur = 0;
    ctx.font = `400 10px ${SECONDARY_FONT}`;
    ctx.fillStyle = `rgba(80,110,140,${0.55 + 0.2 * devGlow})`;
    ctx.fillText("Design: Katja Littawe  ·  Elisa Hikel  ·  Jennifer Linz", WORLD_W / 2, WORLD_H - 24);
    ctx.restore();

    ctx.restore();
  } else {
    startButtonRect = null;
    introNameRect = null;
    introInputActive = false;
  }

    if (finalCongratsTimer > 0 && !gameOver) {
      ctx.save();
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "rgba(0,0,0,0.35)";
      ctx.fillRect(WORLD_W / 2 - 220, 40, 440, 94);
      ctx.fillStyle = "#d0f0ff";
      ctx.font = `400 16px ${PRIMARY_FONT}`;
      const congratsTitle = boss6Defeated ? "Herzlichen Glückwunsch!" : "Stark! Weiter geht's.";
      let congratsLine = "Weiter zum nächsten Boss.";
      if (boss6Defeated) {
        congratsLine = "Alle Bosse bezwungen - jetzt zählt nur noch dein Highscore.";
      } else if (boss5Defeated) {
        congratsLine = "Boss 6 wartet: Legacy Phantom kommt.";
      } else if (boss4Defeated) {
        congratsLine = "Boss 5 wartet: Cut-over Kraken kommt.";
      } else if (boss3Defeated) {
        congratsLine = "Boss 4 wartet: Migration Minotaur kommt.";
      } else if (boss2Defeated) {
        congratsLine = "Boss 3 wartet: Fit-to-Standard Hydra kommt.";
      }
      ctx.fillText(congratsTitle, WORLD_W / 2, 78);
      ctx.font = `600 18px ${SECONDARY_FONT}`;
      ctx.fillText(congratsLine, WORLD_W / 2, 110);
      ctx.restore();
    }

    if (gameOver) {
      // Animation progress
      const goFadeIn = Math.min(1, gameOverAnimTimer / 0.55);
      const goEase = 1 - Math.pow(1 - Math.min(1, gameOverAnimTimer / 0.65), 3);
      const goContent = Math.max(0, Math.min(1, (gameOverAnimTimer - 0.28) / 0.48));
      const goBtn = Math.max(0, Math.min(1, (gameOverAnimTimer - 0.55) / 0.38));
      const goCredits = Math.max(0, Math.min(1, (gameOverAnimTimer - 0.85) / 0.4));

      // Dark overlay (animated fade)
      ctx.save();
      ctx.globalAlpha = 0.72 * goFadeIn;
      ctx.beginPath();
      ctx.rect(0, 0, boardX - 12, WORLD_H);
      ctx.rect(boardX + boardW + 12, 0, WORLD_W - (boardX + boardW + 12), WORLD_H);
      ctx.clip();
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, WORLD_W, WORLD_H);
      ctx.restore();

      ctx.save();
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      // Title – slides in from above with glow
      const titleOffset = (1 - goEase) * -45;
      ctx.globalAlpha = goFadeIn;
      if (gameWon) {
        ctx.save();
        ctx.shadowColor = "rgba(80,255,160,0.75)";
        ctx.shadowBlur = 18 + 9 * Math.sin(globalTime * 2.5);
        ctx.fillStyle = "#b8ffe0";
        ctx.font = `400 22px ${PRIMARY_FONT}`;
        ctx.fillText("Du hast es geschafft!", WORLD_W / 2, WORLD_H / 2 - 140 + titleOffset);
        ctx.restore();
        ctx.globalAlpha = goContent;
        ctx.font = `600 22px ${SECONDARY_FONT}`;
        ctx.fillStyle = "#e9f2ff";
        const winLine = boss6Defeated
          ? "Alle sechs Bosse liegen hinter dir - jetzt beginnt der Marathon."
          : "Fünf Bosse liegen hinter dir - Boss 6 wartet noch.";
        ctx.fillText(winLine, WORLD_W / 2, WORLD_H / 2 - 90);
      } else {
        ctx.save();
        ctx.shadowColor = "rgba(255,70,70,0.7)";
        ctx.shadowBlur = 16 + 8 * Math.sin(globalTime * 2.3);
        ctx.fillStyle = "#e9f2ff";
        ctx.font = `400 24px ${PRIMARY_FONT}`;
        ctx.fillText("Game Over", WORLD_W / 2, WORLD_H / 2 - 110 + titleOffset);
        ctx.restore();
      }

      // Floating particles (pure math, no state)
      ctx.save();
      for (let i = 0; i < 14; i++) {
        const seed = i * 137.508;
        const cycle = ((globalTime * 0.28 + seed * 0.01) % 1 + 1) % 1;
        const px = WORLD_W * 0.15 + Math.sin(seed * 0.4) * WORLD_W * 0.45 + Math.sin(globalTime * 0.6 + i) * 18;
        const py = WORLD_H * 0.88 - cycle * WORLD_H * 0.76;
        const alpha = Math.sin(cycle * Math.PI) * 0.35 * goContent;
        const r = 1.5 + Math.abs(Math.sin(seed * 2.1)) * 2;
        ctx.globalAlpha = alpha;
        ctx.fillStyle = i % 3 === 0 ? "#5099C9" : i % 3 === 1 ? "#ffe066" : "#9ef";
        ctx.beginPath();
        ctx.arc(px, py, r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      ctx.restore();

      // Score & highscore – fade in with slight delay
      ctx.globalAlpha = goContent;
      ctx.font = `400 16px ${PRIMARY_FONT}`;
      ctx.fillStyle = "#e9f2ff";
      ctx.fillText(`Punkte: ${score}`, WORLD_W / 2, WORLD_H / 2 - 28);
      ctx.fillStyle = score >= highscore && score > 0 ? "#ffe066" : "#9ec9ff";
      if (score >= highscore && score > 0) { ctx.shadowColor = "#ffe066"; ctx.shadowBlur = 10; }
      ctx.fillText(`Highscore: ${highscore}`, WORLD_W / 2, WORLD_H / 2 + 16);
      ctx.shadowBlur = 0;
      // Active effects at time of death
      if (_goActiveEffects.length > 0) {
        ctx.textBaseline = "middle";
        const effDotSize = 8;
        const effPadX = 48;
        const effY = WORLD_H / 2 + 44;
        ctx.font = `600 10px ${SECONDARY_FONT}`;
        const totalEffW = _goActiveEffects.reduce((sum, e) => sum + ctx.measureText(e.label).width + effDotSize + 6 + effPadX, 0) - effPadX;
        let effX = WORLD_W / 2 - totalEffW / 2;
        _goActiveEffects.forEach((eff, i) => {
          ctx.fillStyle = eff.color;
          ctx.fillRect(effX, effY - effDotSize / 2, effDotSize, effDotSize);
          ctx.fillStyle = "rgba(220,235,255,0.85)";
          ctx.textAlign = "left";
          ctx.fillText(eff.label, effX + effDotSize + 4, effY);
          effX += effDotSize + 4 + ctx.measureText(eff.label).width + effPadX;
        });
        ctx.textAlign = "center";
      }
      ctx.font = `600 13px ${SECONDARY_FONT}`;
      ctx.fillStyle = "#7ab4d8";
      ctx.fillText("LEERTASTE / TAP zum Restart", WORLD_W / 2, WORLD_H / 2 + 66);

      // CTA Button – pulsing glow, rounded
      ctx.globalAlpha = goBtn;
      const btnW = 340;
      const btnH = 52;
      gameOverLinkRect = { x: WORLD_W / 2 - btnW / 2, y: WORLD_H / 2 + 110, w: btnW, h: btnH };
      const btnPulse = 0.78 + 0.22 * Math.sin(globalTime * 3.6);
      ctx.save();
      ctx.shadowColor = `rgba(80,153,201,${0.9 * btnPulse})`;
      ctx.shadowBlur = 22 * btnPulse;
      const btnGrad = ctx.createLinearGradient(gameOverLinkRect.x, gameOverLinkRect.y, gameOverLinkRect.x + btnW, gameOverLinkRect.y + btnH);
      btnGrad.addColorStop(0, "#5099C9");
      btnGrad.addColorStop(1, "#2E6BA8");
      ctx.fillStyle = btnGrad;
      const br = 10;
      ctx.beginPath();
      ctx.moveTo(gameOverLinkRect.x + br, gameOverLinkRect.y);
      ctx.lineTo(gameOverLinkRect.x + btnW - br, gameOverLinkRect.y);
      ctx.quadraticCurveTo(gameOverLinkRect.x + btnW, gameOverLinkRect.y, gameOverLinkRect.x + btnW, gameOverLinkRect.y + br);
      ctx.lineTo(gameOverLinkRect.x + btnW, gameOverLinkRect.y + btnH - br);
      ctx.quadraticCurveTo(gameOverLinkRect.x + btnW, gameOverLinkRect.y + btnH, gameOverLinkRect.x + btnW - br, gameOverLinkRect.y + btnH);
      ctx.lineTo(gameOverLinkRect.x + br, gameOverLinkRect.y + btnH);
      ctx.quadraticCurveTo(gameOverLinkRect.x, gameOverLinkRect.y + btnH, gameOverLinkRect.x, gameOverLinkRect.y + btnH - br);
      ctx.lineTo(gameOverLinkRect.x, gameOverLinkRect.y + br);
      ctx.quadraticCurveTo(gameOverLinkRect.x, gameOverLinkRect.y, gameOverLinkRect.x + br, gameOverLinkRect.y);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = `rgba(130,210,255,${0.8 * btnPulse})`;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.restore();
      ctx.fillStyle = "#e3f6ff";
      ctx.font = `600 17px ${SECONDARY_FONT}`;
      ctx.fillText("Werde Teil des Teams #SuperNova", WORLD_W / 2, gameOverLinkRect.y + btnH / 2);

      // Animated credits panel
      ctx.globalAlpha = goCredits;
      ctx.save();
      const credY = WORLD_H - 76;
      // separator line
      ctx.strokeStyle = `rgba(79,130,200,${0.4 * goCredits})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(WORLD_W / 2 - 210, credY - 4);
      ctx.lineTo(WORLD_W / 2 + 210, credY - 4);
      ctx.stroke();
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      // Dev credit – subtle glow pulse
      const devPulse = 0.65 + 0.35 * Math.sin(globalTime * 1.1);
      ctx.save();
      ctx.font = `400 11px ${SECONDARY_FONT}`;
      ctx.fillStyle = `rgba(130,175,210,${0.7 + 0.3 * devPulse})`;
      ctx.shadowColor = "rgba(79,160,255,0.5)";
      ctx.shadowBlur = 6 * devPulse;
      ctx.fillText("Gameplay & Musik: Patrick Dause", WORLD_W / 2, credY + 8);
      ctx.restore();
      // Design credits – cycle glow across the three names
      const designNames = ["Katja Littawe", "Elisa Hikel", "Jennifer Linz"];
      const nameHighlight = Math.floor((globalTime * 0.5) % designNames.length);
      const parts = [
        { text: "Design: ", highlight: false },
        { text: "Katja Littawe", highlight: nameHighlight === 0 },
        { text: "  ·  ", highlight: false },
        { text: "Elisa Hikel", highlight: nameHighlight === 1 },
        { text: "  ·  ", highlight: false },
        { text: "Jennifer Linz", highlight: nameHighlight === 2 },
      ];
      // measure total width
      ctx.font = `400 10px ${SECONDARY_FONT}`;
      let totalW = 0;
      parts.forEach(p => { totalW += ctx.measureText(p.text).width; });
      let drawX = WORLD_W / 2 - totalW / 2;
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      parts.forEach(p => {
        ctx.fillStyle = p.highlight ? "#9ef" : "#6a8099";
        if (p.highlight) { ctx.shadowColor = "#9ef"; ctx.shadowBlur = 8; }
        ctx.fillText(p.text, drawX, credY + 24);
        if (p.highlight) ctx.shadowBlur = 0;
        drawX += ctx.measureText(p.text).width;
      });
      ctx.restore();

      ctx.globalAlpha = 1;
      ctx.restore();
    } else {
      gameOverLinkRect = null;
    }

  nameButtonRect = nameButtonCandidate;

  // Audio toggle buttons — bottom-right during gameplay (avoids shield/HP overlap),
  // bottom-left on game-over / intro (leaderboard occupies right side)
  {
    const btnSize = Math.round(32 * ms);
    const gap = 6;
    const by = Math.round(Math.min(WORLD_H - btnSize - 14, safeWorldBottom - btnSize - 10));
    const bx1 = gameRunning
      ? WORLD_W - 14 - 2 * btnSize - gap   // right side: music left of SFX
      : 14;                                  // left side
    const bx2 = gameRunning
      ? WORLD_W - 14 - btnSize              // right side: SFX outermost
      : bx1 + btnSize + gap;                // left side

    function _drawAudioBtn(bx, by, active, label) {
      ctx.save();
      ctx.fillStyle = active ? "rgba(58,148,220,0.85)" : "rgba(8,14,30,0.75)";
      ctx.strokeStyle = active ? "rgba(120,200,255,0.7)" : "rgba(80,120,160,0.4)";
      ctx.lineWidth = 1.5;
      const r = 6;
      ctx.beginPath();
      ctx.moveTo(bx + r, by);
      ctx.lineTo(bx + btnSize - r, by);
      ctx.quadraticCurveTo(bx + btnSize, by, bx + btnSize, by + r);
      ctx.lineTo(bx + btnSize, by + btnSize - r);
      ctx.quadraticCurveTo(bx + btnSize, by + btnSize, bx + btnSize - r, by + btnSize);
      ctx.lineTo(bx + r, by + btnSize);
      ctx.quadraticCurveTo(bx, by + btnSize, bx, by + btnSize - r);
      ctx.lineTo(bx, by + r);
      ctx.quadraticCurveTo(bx, by, bx + r, by);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = `${btnSize * 0.52}px sans-serif`;
      ctx.globalAlpha = active ? 1 : 0.45;
      ctx.fillStyle = "#fff";
      ctx.fillText(label, bx + btnSize / 2, by + btnSize / 2 + 1);
      ctx.restore();
    }

    _drawAudioBtn(bx1, by, audio.musicEnabled, "♪");
    _drawAudioBtn(bx2, by, audio.sfxEnabled, "⚡");
    audioMusicToggleRect = { x: bx1, y: by, w: btnSize, h: btnSize };
    audioSfxToggleRect = { x: bx2, y: by, w: btnSize, h: btnSize };
  }

  ctx.restore();
}
  function drawScorePopups() {
    if (scorePopups.length === 0) return;
    ctx.save();
    ctx.font = `400 16px ${PRIMARY_FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const p of scorePopups) {
      const fade = Math.min(1, p.life / 0.4);
      ctx.globalAlpha = fade;
      ctx.shadowColor = '#7ff';
      ctx.shadowBlur = 8;
      ctx.fillStyle = '#aef7ff';
      ctx.fillText(p.text, p.x, p.y);
    }
    ctx.restore();
  }

  function drawPauseOverlay() {
    if (!gamePaused) return;
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(0, 0, WORLD_W, WORLD_H);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `400 32px ${PRIMARY_FONT}`;
    ctx.fillStyle = '#e2f1ff';
    ctx.shadowColor = 'rgba(100,180,255,0.8)';
    ctx.shadowBlur = 20;
    ctx.fillText('PAUSE', WORLD_W / 2, WORLD_H / 2 - 20);
    ctx.font = `600 14px ${SECONDARY_FONT}`;
    ctx.fillStyle = 'rgba(180,210,240,0.7)';
    ctx.shadowBlur = 0;
    ctx.fillText('P oder Escape zum Fortsetzen', WORLD_W / 2, WORLD_H / 2 + 30);
    ctx.restore();
  }

  function drawEverything() {
    beginFrame();
    drawBackground();
    drawPhaseText();
    drawNnTaunt();
    drawTrail();
    drawPipes();
    drawBossObstacles();
    drawLootboxes();
    drawBossLoot();
    drawPlayerShots();
    drawBoss();
    drawExplosions();
    drawPlayer();
    drawEffectCircles();
    drawUI();
    drawBossStoryOverlay();

    if (inBossFight && currentBoss && currentBoss.id === 4 && currentBoss.phase === 3) {
      const flicker = 0.06 + 0.08 * (Math.sin(currentBoss.flickerTimer * 18) + 1) * 0.5;
      ctx.save();
      ctx.globalAlpha = flicker;
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, WORLD_W, WORLD_H);
      ctx.restore();
    }

    if (bossTransitionActive) drawBossTransition();
    drawScorePopups();
    drawPauseOverlay();
    endFrame();
  }

  function drawBossTransition() {
    const t = Math.min(1, bossTransitionTimer / bossTransitionDuration);
    const cx = WORLD_W / 2;
    const cy = WORLD_H / 2;
    const r = Math.max(WORLD_W, WORLD_H);

    // dunkles Overlay
    ctx.save();
    ctx.fillStyle = "rgba(0,0,0,0.7)";
    ctx.fillRect(0, 0, WORLD_W, WORLD_H);

    // Radialer Wipe im Uhrzeigersinn
    ctx.globalCompositeOperation = "destination-out";
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * t, false);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Text
    ctx.save();
    ctx.fillStyle = "#e2f1ff";
    ctx.font = `400 20px ${PRIMARY_FONT}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("Boss erscheint...", cx, cy - 10);
    ctx.font = `600 18px ${SECONDARY_FONT}`;
    ctx.fillText("Bereit machen...", cx, cy + 28);
    ctx.restore();
  }

  // ======================================================
  //  Loop
  // ======================================================
  function loop(ts) {
    rawDt = Math.min((ts - lastTime) / 1000, 0.05);
    const dt = gamePaused ? 0 : rawDt;
    lastTime = ts;
    if (_gameOverLockTimer > 0) _gameOverLockTimer = Math.max(0, _gameOverLockTimer - rawDt);
    // Screen shake update
    if (shakeMag > 0) {
      shakeX = (Math.random() - 0.5) * shakeMag * 2;
      shakeY = (Math.random() - 0.5) * shakeMag * 2;
      shakeMag = Math.max(0, shakeMag - shakeDecay * rawDt * 60);
    } else { shakeX = 0; shakeY = 0; }
    // Hit flash decay
    if (playerHitFlash > 0) playerHitFlash = Math.max(0, playerHitFlash - rawDt * 60);
    if (currentBoss && currentBoss.hitFlash > 0) currentBoss.hitFlash = Math.max(0, currentBoss.hitFlash - rawDt * 60);
    // Score popup update
    for (let i = scorePopups.length - 1; i >= 0; i--) {
      const p = scorePopups[i];
      p.life -= rawDt;
      p.y -= 55 * rawDt;
      if (p.life <= 0) scorePopups.splice(i, 1);
    }
    if (leaderboard.length > 0) {
      const scrollRange = Math.max(LEADERBOARD_ENTRY_HEIGHT * leaderboard.length, 1);
      leaderboardScrollOffset = (leaderboardScrollOffset + rawDt * LEADERBOARD_SCROLL_SPEED) % scrollRange;
    } else {
      leaderboardScrollOffset = 0;
    }
    globalTime += rawDt;
    if (!gameRunning && !gameOver) {
      introAnimTimer += rawDt; introInputBlinkTimer += rawDt;
      _introGlitchTimer += rawDt;
      _introWinkTimer += rawDt;
      if (_introButtonTap > 0) _introButtonTap = Math.max(0, _introButtonTap - rawDt / 0.12);
    }
    if (gameOver) gameOverAnimTimer += rawDt;
    if (scoreFlashTimer > 0) scoreFlashTimer = Math.max(0, scoreFlashTimer - rawDt);
    _musicUpdate(rawDt);
    if (!gamePaused) update(dt);
    drawEverything();
    requestAnimationFrame(loop);
  }

  requestAnimationFrame(loop);
});





