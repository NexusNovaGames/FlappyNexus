document.addEventListener("DOMContentLoaded", () => {
  const canvas = document.getElementById("game");
  if (!canvas) return;
  canvas.style.webkitTapHighlightColor = "transparent";
  canvas.style.webkitTouchCallout = "none";
  canvas.style.webkitUserSelect = "none";
  canvas.style.userSelect = "none";
  canvas.style.touchAction = "none";
  canvas.style.outline = "none";
  if (document.body) {
    document.body.style.webkitTapHighlightColor = "transparent";
    document.body.style.webkitUserSelect = "none";
    document.body.style.userSelect = "none";
  }
  document.documentElement.style.webkitTapHighlightColor = "transparent";
  document.documentElement.style.webkitUserSelect = "none";
  document.documentElement.style.userSelect = "none";
  document.documentElement.style.touchAction = "none";

  if (!document.querySelector("style[data-nn-touch]")) {
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
  const FONT_LINK =
    "https://fonts.googleapis.com/css2?family=Orbitron:wght@400;600&family=Rajdhani:wght@400;600&display=swap";
  if (!document.querySelector('link[data-flappy-font]')) {
    const fontLink = document.createElement("link");
    fontLink.rel = "stylesheet";
    fontLink.href = FONT_LINK;
    fontLink.dataset.flappyFont = "true";
    document.head.appendChild(fontLink);
  }
  const PRIMARY_FONT = "'Orbitron', 'Segoe UI', 'Helvetica Neue', sans-serif";
  const SECONDARY_FONT = "'Rajdhani', 'Segoe UI', 'Helvetica Neue', sans-serif";
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
    const rect = canvas.getBoundingClientRect();
    dpr = Math.max(1, window.devicePixelRatio || 1);

    viewW = rect.width;
    viewH = rect.height;

    canvas.width = Math.round(viewW * dpr);
    canvas.height = Math.round(viewH * dpr);

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    window.__NN_W = viewW;
    window.__NN_H = viewH;

    viewScale = Math.min(viewW / WORLD_W, viewH / WORLD_H);
    viewOffsetX = (viewW - WORLD_W * viewScale) / 2;
    viewOffsetY = (viewH - WORLD_H * viewScale) / 2;
  }

  window.addEventListener("resize", resizeCanvas);
  window.addEventListener("orientationchange", resizeCanvas);
  resizeCanvas();

  function beginFrame() {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.imageSmoothingEnabled = false;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.translate(viewOffsetX, viewOffsetY);
    ctx.scale(viewScale, viewScale);
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
        displayName: info.displayName || "Pilot",
        color: entry && entry.highlightColor ? entry.highlightColor : pickHighlightColor(),
      };
    }
    return { displayName: name || "Pilot", color: null };
  }

  function persistPlayerName(name) {
    playerName = name;
    try {
      localStorage.setItem("flappy-nexus-player-name", playerName);
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
    nameOverlay.style.zIndex = "9999";

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
    title.textContent = "Pilotennamen festlegen";
    title.style.fontFamily = PRIMARY_FONT;
    title.style.letterSpacing = "0.05em";
    title.style.fontSize = "22px";
    title.style.marginBottom = "12px";
    panel.appendChild(title);

    nameInput = document.createElement("input");
    nameInput.type = "text";
    nameInput.maxLength = MAX_NAME_LENGTH;
    nameInput.placeholder = "Dein Name";
    nameInput.style.width = "100%";
    nameInput.style.padding = "10px";
    nameInput.style.border = "1px solid rgba(79,210,255,0.7)";
    nameInput.style.borderRadius = "8px";
    nameInput.style.background = "rgba(5,10,18,0.9)";
    nameInput.style.color = "#fff";
    nameInput.style.fontFamily = SECONDARY_FONT;
    nameInput.style.fontSize = "16px";
    nameInput.style.marginBottom = "14px";
    nameInput.addEventListener("keydown", ev => {
      if (ev.key === "Enter") {
        ev.preventDefault();
        submitPlayerName();
      }
    });
    panel.appendChild(nameInput);

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
    if (nameOverlay) {
      nameOverlay.style.display = "flex";
      if (nameInput) {
        requestAnimationFrame(() => nameInput.focus());
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
      localStorage.removeItem("flappy-nexus-leaderboard");
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
  }

  // Beispiel: hier geht dein Game-Code weiter ...
  // function drawEffectCircles() { ... }

  function drawEffectCircles() {
    const effects = [
      { key: "ghostTimer", dur: DURATIONS.ghost, color: "#88ccff", label: "Geist" },
      { key: "shieldTimer", dur: DURATIONS.shield, color: "#5cc8ff", label: "Schild" },
      { key: "doubleTimer", dur: DURATIONS.double, color: "#ffe066", label: "Doppeltepunkte" },
      { key: "slowTimer", dur: DURATIONS.slow, color: "#9cff9c", label: "Zeitlupe" },
      { key: "turboTimer", dur: DURATIONS.turbo, color: "#ffb366", label: "Turbo" },
      { key: "shrinkTimer", dur: DURATIONS.shrink, color: "#8df0c3", label: "Schrumpfen" },
      { key: "bigTimer", dur: DURATIONS.big, color: "#ff8899", label: "Groß" },
    ].filter(e => player[e.key] > 0);

    if (!effects.length) return;

    ctx.save();
    ctx.translate(player.x, player.y);
    ctx.lineWidth = 4;
    ctx.font = `600 12px ${SECONDARY_FONT}`;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";

    const baseR = player.radius + 10;
    const textStartY = -effects.length * 7;

    effects.forEach((eff, idx) => {
      const time = player[eff.key];
      const ratio = Math.max(0, Math.min(1, time / eff.dur));
      const r = baseR + idx * 6;

      ctx.strokeStyle = "rgba(255,255,255,0.12)";
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = eff.color;
      ctx.beginPath();
      ctx.arc(0, 0, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * ratio);
      ctx.stroke();

      ctx.fillStyle = eff.color;
      ctx.fillText(`${eff.label} ${time.toFixed(1)}s`, r + 10, textStartY + idx * 14);
    });

    ctx.restore();
  }

const ASSET_BASE = "https://raw.githubusercontent.com/NexusNovaGames/FlappyNexus/main/";

const assets = {
    bg1: loadImage(ASSET_BASE + "background1.png"),
    bossbg1: loadImage(ASSET_BASE + "bossbg1.png"),
    bossbg2: loadImage(ASSET_BASE + "bossbg2.png"),
    bossbg3: loadImage(ASSET_BASE + "bossbg3.png"),
    bossbg4: loadImage(ASSET_BASE + "bossbg4.png"),
    bossbg5: loadImage(ASSET_BASE + "bossbg5.png"),
    bossbg6: loadImage(ASSET_BASE + "bossbg6.png"),
    logo: loadImage(ASSET_BASE + "N.png"),
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

  try {
    const stored = localStorage.getItem("flappy-nexus-highscore");
    if (stored) highscore = Number(stored) || 0;
  } catch (_) {
    highscore = 0;
  }

  try {
    const storedBoard = localStorage.getItem("flappy-nexus-leaderboard");
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
          localStorage.setItem("flappy-nexus-leaderboard", JSON.stringify(leaderboard));
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
          localStorage.setItem("flappy-nexus-leaderboard", JSON.stringify(leaderboard));
        } catch (_) {
          /* ignore */
        }
      })
      .catch(() => {
        /* ignore */
      });
  }

  try {
    const storedName = localStorage.getItem("flappy-nexus-player-name");
    if (storedName) {
      const safe = sanitizeName(storedName);
      if (safe) playerName = safe;
    }
  } catch (_) {
    playerName = "";
  }

  loadLeaderboardFromApi();

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
  let finalCongratsTimer = 0;
  let scoreTauntText = "";
  let scoreTauntTimer = 0;
  let phaseMilestoneCooldown = 0;
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

  const SHIELD_CHARGE_RATE = 0.01;
  const SHIELD_MAX_RATIO = 0.25;

  // Trail
  const trail = [];
  const trailMaxLength = 26;
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
  };

  // Boss Triggers
  const BOSS_INTERVAL = 5; // Prüfintervall
  const BOSS1_SCORE = 30; // Boss 1 bei 30 Punkten
  const BOSS2_SCORE = 50; // Boss 2 bei 50 Punkten
  const BOSS3_SCORE = 90; // Boss 3 bei 90 Punkten
  const BOSS4_SCORE = 130; // Boss 4 bei 130 Punkten
  const BOSS5_SCORE = 180; // Boss 5 bei 180 Punkten
  const BOSS6_SCORE = 230; // Boss 6 bei 230 Punkten
  const SCORE_TAUNT_DURATION = 4;
  const SCORE_TAUNT_MIN = 1;
  const SCORE_TAUNT_MAX = 9999;
  const SCORE_TAUNT_STEP_MIN = 4;
  const SCORE_TAUNT_STEP_MAX = 9;
  const PHASE_MILESTONE_COOLDOWN = 6;
  const NN_SCORE_TAUNTS = [
    "Du bist ja immer noch da...",
    "Geh endlich wieder schaffen!",
    "Du hast starke Impulse",
    "Das ist ein starker Impuls.",
    "F6 F6 F6 F6 F6 F7?!",
    "Was'n hier los-",
    "Beste Firma der Welt <3",
    "Kaffee ist alle- Weiterfliegen!",
    "Legende in Ausbildung.",
    "Die Deadline rennt mit.",
    "Noch ein Sprint, dann Feierabend.",
    "Highscore-Hunger aktiviert.",
    "Sauerstoff wird knapp.",
    "Du glitchst die Matrix.",
    "Wolltest du nicht Feierabend machen-",
    "Die Maustaste raucht.",
    "Unaufhaltsam.",
    "Du fliegst wie ein Commit am Freitag.",
    "Der Boss schaut schon nerv\u00f6s.",
    "Break- Nicht heute.",
    "Noch ein Versuch, noch ein Punkt.",
    "Produktivit\u00e4tslevel: Overdrive.",
    "Du bist der Sprint.",
    "Das ist kein Bug, das ist Feature!",
    "Patch ist raus, du auch?!",
    "Regenbogen-Modus aktiviert.",
    "Dein Rekord hat Angst.",
    "Protokoll: Weiterfliegen.",
    "Checkpoint? Was ist das?",
    "Mr. Nova Nova.. :D",
];

  const BOSS_STORIES = {
    1: `Boss: "Scope Creeper"

"Wir schauen uns das erstmal nur grob an."

Ein harmloser Satz.
Gesprochen zu Beginn von Discover.

Doch irgendwo zwischen Flipchart, Whiteboard und dem ersten
"Nur mal kurz prüfen..."
begann sich etwas zu regen.

Ein Gedanke wurde zu einer Frage.
Eine Frage zu einer Anforderung.
Eine Anforderung zu vielen.

Plötzlich war er da.

Scope Creeper.

Er wächst von jedem "Könnten wir nicht auch...?"
Er nährt sich von Zeit und Budget.
Und je länger ihr zögert, desto mehr spawnt er.

Fokus schwindet. Entscheidungen werden weich.

Boss erscheint.`,
    2: `Boss: "Lord Chaos Governance"

Prepare begann mit guten Absichten.

Ein Projektplan.
Viele Streams.
Und der Satz:

"Wir klären die Rollen später."

Doch "später" kam nie.

Entscheidungen blieben offen.
Verantwortlichkeiten verschwammen.
Alles lief parallel - aber nichts zusammen.

Meetings wurden länger.
Ergebnisse kürzer.
Und jeder wartete darauf, dass jemand anderes entscheidet.

Aus dieser Unordnung erhob sich:

Lord Chaos Governance.

Er blockiert jeden Fortschritt.
Er nährt sich von offenen Punkten.
Und je mehr ihr abstimmt, desto stärker wird er.

Der Kalender füllt sich. Das Projekt steht still.

Boss erscheint.`,
    3: `Boss: "Fit-to-Standard Hydra"

Explore begann mit einem Ziel:

"Wir orientieren uns am Standard."

Doch dann kam der erste Gap.
Dann ein zweiter.
Und dann der Satz:

"Das haben wir schon immer so gemacht."

Mit jedem abgeschlagenen Gap wuchsen zwei neue nach.
Workshops wurden länger.
Blueprints dicker.
Der Standard immer weiter weg.

Aus Prozessen wurden Sonderfälle.
Aus Entscheidungen Designs.
Aus Einfachheit Overengineering.

Aus all dem kroch sie hervor:

Die Fit-to-Standard Hydra.

Sie vervielfacht Gaps.
Sie verführt mit perfekten Lösungen.
Und jeder Versuch, sie "sauber" zu lösen, macht sie stärker.

Der Standard droht zu verschwinden.

Boss erscheint.`,
    4: `Boss: "Migration Minotaur"

Realize fühlte sich kontrolliert an.

Customizing stand.
Entwicklungen liefen.
Und jemand sagte:

"Die Daten migrieren wir später."

Doch tief im System wartete bereits etwas.

Versteckt im Labyrinth der Altdaten.
Genährt von Dubletten, Lücken und Altlasten.
Unauffällig - bis zur ersten Testmigration.

TM1 ließ ihn kurz aufblitzen.
TM2 weckte ihn vollständig.

Fehler explodierten.
Fixing-Schleifen begannen.
Zeit verschwand im Datennebel.

Aus dem Migrationslabyrinth trat hervor:

Der Migration Minotaur.

Er frisst saubere Zeitpläne.
Er liebt unklare Objektketten.
Und jeder ungeprüfte Datensatz macht ihn stärker.

Der Weg zum Go-Live wird enger.

Boss erscheint.`,
    5: `Boss: "Cut-over Kraken"

Deploy begann in Stille.

Systeme waren bereit.
Jobs geplant.
Und der Countdown lief.

"Wir haben alles vorbereitet."

Doch unter der Oberfläche bewegte sich etwas.

Viele Arme.
Viele Systeme.
Viele Marktpartner.

Ein falscher Schritt -
und alles gerät gleichzeitig in Bewegung.

Jobs kollidieren.
Schnittstellen reißen.
Seiteneffekte schlagen dort zu, wo niemand hinsieht.

Aus dem Cut-over-Fenster erhebt sich:

Der Cut-over Kraken.

Er kennt keinen Rückzug.
Er verzeiht keinen Fehler.
Und jede Sekunde macht ihn stärker.

Keine zweite Chance. Der Go-Live steht bevor.

Boss erscheint.`,
    6: `Boss: "Legacy Phantom"

Der Go-Live ist geschafft.

Systeme laufen.
Tickets werden weniger.
Und jemand sagt:

"Zur Sicherheit lassen wir das Altsystem noch an."

Niemand merkt, wie sich etwas löst.

Ein Prozess im Hintergrund.
Ein manueller Workaround.
Ein Bericht, der "nur dort" noch existiert.

Schattenprozesse entstehen.
Ressourcen verschwinden.
Innovation wird langsam.

Aus den alten Pfaden erhebt sich:

Das Legacy Phantom.

Es ist schwer zu sehen.
Es greift leise an.
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
      resetGame();
      gameRunning = true;
    } else if (gameOver) {
      resetGame();
      gameRunning = true;
    }

    player.vy = player.jumpStrength;
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
    if (e.repeat) return; // kein Halten-Spammen
    if (e.code === "Space" || e.code === "ArrowUp") {
    if (pendingBossId) {
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

  function handlePointerPress(event) {
    const p = getWorldPoint(event);
    if (!p || !p.inWorld) return;

    if (pendingBossId) {
      if (bossAwaitingConfirm) {
        bossTransitionActive = true;
        bossTransitionTimer = 0;
        bossAwaitingConfirm = false;
      } else {
        revealNextBossStoryLine();
      }
      return;
    }

    if (!gameRunning && !gameOver) {
      if (nameButtonRect && pointInRect(p, nameButtonRect)) {
        showNameOverlay();
        return;
      }
      if (startButtonRect && pointInRect(p, startButtonRect)) {
        flap();
        return;
      }
    }

    if (gameOver) {
      if (nameButtonRect && pointInRect(p, nameButtonRect)) {
        showNameOverlay();
        return;
      }
      if (gameOverLinkRect && pointInRect(p, gameOverLinkRect)) {
        window.open("https://www.nexus-nova.de/karriere", "_blank", "noopener");
        return;
      }
    }

    flap();
  }

  canvas.addEventListener("mousedown", handlePointerPress);

  canvas.addEventListener("touchstart", e => {
    const p = getWorldPoint(e);
    handlePointerPress(e);
    if (p && p.inWorld) e.preventDefault();
  }, { passive: false });

  canvas.addEventListener("touchmove", e => {
    const p = getWorldPoint(e);
    if (p && p.inWorld) {
      e.preventDefault();
    }
  }, { passive: false });

  // ======================================================
  //  Core Helpers
  // ======================================================
  function resetGame() {
    score = TEST_BOSS3 ? Math.max(0, BOSS3_SCORE - 5) : 0;
    gameOver = false;
    gameRunning = false;
    inBossFight = false;
    currentBoss = null;
    pendingBossId = null;
    bossCountdown = 0;
    bossAwaitingConfirm = false;
    bossTransitionActive = false;
    bossTransitionTimer = 0;
    phaseMilestoneCooldown = 0;

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
    totalFlaps = 0;
    lastScoreHueStep = 0;
    scoreTauntText = "";
    scoreTauntTimer = 0;
    phaseMilestoneCooldown = 0;
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
  }

  function endGame() {
    if (gameOver) return;
    gameOver = true;
    gameRunning = false;
    inBossFight = false;
    currentBoss = null;
    pendingBossId = null;
    bossCountdown = 0;
    bossTransitionActive = false;
    bossTransitionTimer = 0;
    bossShots.length = 0;
    playerShots.length = 0;
    bossLoot.length = 0;
    bossObstacles.length = 0;
    highscore = Math.max(highscore, score);
    try {
      localStorage.setItem("flappy-nexus-highscore", String(highscore));
    } catch (_) {
      /* ignore */
    }
    updateLeaderboard(score);
  }

  function normalizeLeaderboard(entries) {
    const bestByName = new Map();
    for (const entry of entries || []) {
      let name = "Pilot";
      let score = 0;
      let highlightColor = null;
      if (typeof entry === "number") {
        score = Number(entry);
      } else if (entry && typeof entry.score === "number") {
        name = sanitizeName(entry.name || "") || "Pilot";
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
    const entryName = sanitizeName(playerName) || "Pilot";
    if (entryName === "WIPE") {
      leaderboard = [];
      try {
        localStorage.setItem("flappy-nexus-leaderboard", JSON.stringify(leaderboard));
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
      localStorage.setItem("flappy-nexus-leaderboard", JSON.stringify(leaderboard));
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
    if (scoreTauntTimer > 0) return false;
    if (!playerName || !getHighlightInfo(playerName).isHighlight) return false;
    if (phaseMilestoneCooldown > 0) return false;
    if (score < SCORE_TAUNT_MIN || score > SCORE_TAUNT_MAX) return false;
    if (nextScoreTaunt <= 0) scheduleNextScoreTaunt();
    if (score < nextScoreTaunt) return false;
    const pick = NN_SCORE_TAUNTS[Math.floor(Math.random() * NN_SCORE_TAUNTS.length)];
    scoreTauntText = pick;
    scoreTauntTimer = SCORE_TAUNT_DURATION;
    phaseMilestoneCooldown = Math.max(phaseMilestoneCooldown, 2.5);
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
    const rawLines = String(text).split(/\r\n/);
    const lines = [];
    ctx.save();
    ctx.font = `600 18px ${SECONDARY_FONT}`;
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
    if (!bossAwaitingConfirm) {
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
    player.debuffGraceTimer = 0.6;
    if (player.hp <= 0) {
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
    const base = ["ghost", "shrink", "slow", "double", "big", "shield", "turbo"];
    if (phaseIndex >= 4) {
      base.push("shield", "turbo", "double");
    } else if (phaseIndex >= 2) {
      base.push("shield", "turbo");
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
      const centerY = pipe.gapY + pipeGap / 2;
      const type = randomPowerup(getPhaseIndex());
      if (type === "ghost") ghostChallenge = true;
      lootboxes.push({
        x: pipe.x + pipeWidth / 2,
        y: centerY,
        baseY: centerY,
        swayPhase: Math.random() * Math.PI * 2,
        swayAmp: 26 + Math.random() * 18,
        size: Math.round(63 * SIZE_SCALE),
        collected: false,
        type,
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
        const add = player.doubleTimer > 0 ? 2 : 1;
        score += add;
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
      const sway = Math.sin(lootSwayTimer * 2 + b.swayPhase) * b.swayAmp;

      if (b.pipe) {
        b.x = b.pipe.x + pipeWidth / 2;
        b.y = b.pipe.gapY + pipeGap / 2 + sway;
      } else {
        b.x -= spd * dt;
        b.y = b.baseY + sway;
      }

      const dx = player.x - b.x;
      const dy = player.y - b.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (!b.collected && dist < player.radius + b.size * 0.6) {
        b.collected = true;
        const colors = {
          ghost: "rgba(160,220,255,1)",
          shrink: "rgba(120,255,180,1)",
          slow: "rgba(150,255,150,1)",
          double: "rgba(255,230,120,1)",
          big: "rgba(255,110,110,1)",
          shield: "rgba(120,200,255,1)",
          turbo: "rgba(255,170,80,1)",
          bossheal: "rgba(140,255,200,1)",
          bossshield: "rgba(160,220,255,1)",
        };
        applyPowerup(b.type);
        spawnExplosion(b.x, b.y, colors[b.type] || "rgba(0,255,255,1)", 1.6);
        lootboxes.splice(i, 1);
        continue;
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
        hp: Math.round(45 * diff),
        maxHp: Math.round(45 * diff),
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
      hp: Math.round(80 * diff),
      maxHp: Math.round(80 * diff),
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
        hp: Math.round(280 * (1 + bossStage * 0.2)),
        maxHp: Math.round(280 * (1 + bossStage * 0.2)),
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
        hp: Math.round(360 * (1 + bossStage * 0.2)),
        maxHp: Math.round(360 * (1 + bossStage * 0.2)),
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
        hp: Math.round(460 * (1 + bossStage * 0.25)),
        maxHp: Math.round(460 * (1 + bossStage * 0.25)),
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
      hp: Math.round(180 * (1 + bossStage * 0.12)),
      maxHp: Math.round(180 * (1 + bossStage * 0.12)),
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
      debuffGraceTimer: 0,
      lockTimer: 0,
      vy: 0,
      invincible: false,
      radius: player.baseRadius,
      hp: player.maxHp,
    });
  }

  function defeatBoss(id) {
    if (!currentBoss) return;
    spawnExplosion(currentBoss.x, currentBoss.y, "rgba(255,255,255,1)", 2.2);

    if (id === 1) {
      boss1Defeated = true;
      score += 10;
      if (!checkPhaseMilestones()) checkScoreTaunts();
    } else if (id === 2) {
      boss2Defeated = true;
      score += 20;
      if (!checkPhaseMilestones()) checkScoreTaunts();
    } else if (id === 3) {
      boss3Defeated = true;
      score += 30;
      if (!checkPhaseMilestones()) checkScoreTaunts();
      finalCongratsTimer = 8; // Glückwunschbanner anzeigen
    } else if (id === 4) {
      boss4Defeated = true;
      score += 40;
      if (!checkPhaseMilestones()) checkScoreTaunts();
      finalCongratsTimer = 8;
    } else if (id === 5) {
      boss5Defeated = true;
      score += 50;
      if (!checkPhaseMilestones()) checkScoreTaunts();
      finalCongratsTimer = 8;
    } else if (id === 6) {
      boss6Defeated = true;
      score += 60;
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
    }
  }

  function updateBoss(dt) {
    if (!inBossFight || !currentBoss || gameOver) return;

    const boss = currentBoss;
    boss.t += dt;
    const amp = 120;
    boss.y = WORLD_H / 2 + Math.sin(boss.t * 1.1) * amp;
    boss.x = BOSS_X_BASE + Math.sin(boss.t * 0.6) * BOSS_X_WOBBLE;

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
    if (boss.bigBugCooldown > 0) {
      boss.bigBugCooldown -= dt;
    }
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
        boss.id === 5 ? 8 :
        boss.id === 4 ? 10 :
        boss.id === 3 ? (boss.phase >= 3 ? 10 : boss.phase >= 2 ? 9 : 7) :
        boss.id === 2 ? 6 : 3;
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
      if (b.type === "seeker") {
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
          s.hitTimer = 0.12;
          spawnExplosion(boss.x - boss.width / 2, s.y, "rgba(180,255,220,1)", 0.6);
          if (boss.hp <= 0) {
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
        spawnExplosion(s.x, s.y, "rgba(255, 210, 120,1)", 0.8);
        playerShots.splice(i, 1);
        if (boss.hp <= 0) {
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
  function spawnExplosion(x, y, color = "rgba(140,220,255,1)", power = 1) {
    const count = Math.floor(12 * power);
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

    // Keine Gravitation während Boss-Vorbereitung
    if (!pendingBossId) {
      const slowFallScale = player.slowTimer > 0 ? 0.8 : 1.0;
      const grav = (player.turboTimer > 0 ? player.gravity * 0.85 : player.gravity) * slowFallScale;
      player.vy += grav * dt;
      player.y += player.vy * dt;
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

  function drawPhaseText() {
    if (!phaseTextActive || !phaseTextLine) return;
    if (inBossFight || bossTransitionActive || pendingBossId) return;

    ctx.save();
    ctx.font = PHASE_TEXT_FONT;
    ctx.textBaseline = "middle";
    const metrics = ctx.measureText(phaseTextLine);
    const textW = metrics.width;
    const boxPadX = 12;
    const boxPadY = 8;
    const boxH = 28;
    const boxW = textW + boxPadX * 2;
    const boxX = phaseTextX - boxPadX;
    const boxY = phaseTextY - boxH / 2;
    ctx.fillStyle = "rgba(0,0,0,0.78)";
    ctx.fillRect(boxX, boxY, boxW, boxH);
    ctx.fillStyle = "#ffffff";
    ctx.fillText(phaseTextLine, phaseTextX, phaseTextY);
    ctx.restore();
  }

  function drawBossStoryOverlay() {
    if (!pendingBossId || bossTransitionActive || inBossFight) return;
    if (!pendingBossStoryLines.length) return;

    const lineHeight = 26;
    const maxVisible = Math.max(1, Math.floor((WORLD_H * 0.62) / lineHeight));
    const revealedChars = Math.min(pendingBossStoryRevealChars, pendingBossStoryTotalChars);
    let charBudget = revealedChars;
    let lastLineWithChars = -1;

    ctx.save();
    ctx.fillStyle = "rgba(0,0,0,0.65)";
    ctx.fillRect(0, 0, WORLD_W, WORLD_H);

    const x = WORLD_W * 0.12;
    const yStart = WORLD_H * 0.16;
    ctx.font = `600 18px ${SECONDARY_FONT}`;
    ctx.fillStyle = "#e9f2ff";
    ctx.textAlign = "left";
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
      if (drawLine) ctx.fillText(drawLine, x, y);
    }

    if (pendingBossStoryCursorOn) {
      let cursorLine = Math.min(Math.max(lastLineWithChars, 0), pendingBossStoryLines.length - 1);
      if (cursorLine < start) cursorLine = start;
      if (cursorLine >= end) cursorLine = end - 1;
      let charsBefore = 0;
      for (let i = 0; i < cursorLine; i++) charsBefore += pendingBossStoryLines[i].length;
      const cursorLineText = pendingBossStoryLines[cursorLine] || "";
      const charsInLine = Math.max(0, Math.min(cursorLineText.length, Math.floor(revealedChars - charsBefore)));
      const cursorX = x + ctx.measureText(cursorLineText.slice(0, charsInLine)).width + 4;
      const cursorY = yStart + (cursorLine - start) * lineHeight;
      ctx.fillRect(cursorX, cursorY + 4, 6, lineHeight - 8);
    }

    ctx.font = `600 14px ${SECONDARY_FONT}`;
    ctx.fillStyle = "rgba(220,240,255,0.7)";
    const hint = bossAwaitingConfirm
      ? "Leertaste / Tap: Boss starten"
      : "Leertaste / Tap: überspringen";
    ctx.fillText(hint, x, WORLD_H - 38);

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

      ctx.shadowColor = "rgba(255,120,60,0.35)";
      ctx.shadowBlur = 4;
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
      ctx.shadowColor = "#4fd2ff";
      ctx.shadowBlur = 12;
      ctx.lineWidth = 3;

      ctx.strokeRect(p.x, 0, pipeWidth, p.gapY);
      ctx.strokeRect(p.x, bottomY, pipeWidth, bottomH);
    }
    ctx.restore();
  }

  function drawBossObstacles() {
    if (!inBossFight) return;
    ctx.save();
    ctx.fillStyle = "#0d1a2f";
    ctx.strokeStyle = "#ff6fbf";
    ctx.lineWidth = 3;
    ctx.shadowColor = "#ff6fbf";
    ctx.shadowBlur = 12;
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
      if (b.img && b.img.complete) {
        ctx.drawImage(b.img, b.x - b.size / 2, b.y - b.size / 2, b.size, b.size);
      } else {
        ctx.fillStyle = "#ffc400";
        ctx.fillRect(b.x - b.size / 2, b.y - b.size / 2, b.size, b.size);
      }
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
      const grad = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, size * 1.8);
      grad.addColorStop(0, "rgba(120,255,180,0.9)");
      grad.addColorStop(1, "rgba(60,200,120,0)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(s.x, s.y, size, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = "rgba(120,255,180,0.7)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(s.x, s.y, size * 1.2, 0, Math.PI * 2);
      ctx.stroke();
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
      const grad = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, size * 1.8);
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
        "#ffcc66";
      grad.addColorStop(0, `${color}aa`);
      grad.addColorStop(1, `${color}00`);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(s.x, s.y, size, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = `${color}${Math.floor(alpha * 255).toString(16).padStart(2, "0")}`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(s.x, s.y, size * 1.2, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawExplosions() {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
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

    if (player.pickupFlashTimer > 0) {
      ctx.shadowColor = player.pickupFlashColor;
      ctx.shadowBlur = 22;
    }

    ctx.filter = `hue-rotate(${player.colorShift}deg)`;

    if (img.complete && img.naturalWidth) {
      const aspect = img.width / img.height;
      const scale = 1.99;
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

    if (player.shieldTimer > 0 || player.shieldHits > 0) {
      ctx.strokeStyle = `rgba(120,200,255,0.8)`;
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(0, 0, r + 10, 0, Math.PI * 2);
      ctx.stroke();
      // kleiner Schild-Indikator oben rechts
      ctx.fillStyle = "rgba(120,200,255,0.9)";
      ctx.fillRect(r + 10, -r - 16, 20, 12);
    }

    if (player.turboTimer > 0) {
      ctx.strokeStyle = "rgba(255,170,80,0.7)";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(0, 0, r + 16, 0, Math.PI * 2);
      ctx.stroke();
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

    ctx.filter = "none";
    ctx.restore();
  }


function drawUI() {
  ctx.save();
  const showIntro = !gameRunning && !gameOver;
  const showLeaderboardPanel = !gameRunning;
  let nameButtonCandidate = null;

  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillStyle = "#8fd3ff";
  ctx.font = `600 18px ${SECONDARY_FONT}`;
  ctx.fillText(`Pilot: ${playerName || "---"}`, 16, 20);

  ctx.font = `600 32px ${PRIMARY_FONT}`;
  ctx.fillStyle = "#fff";
  ctx.fillText(`Punkte: ${score}`, 16, 48);

  ctx.font = `600 20px ${SECONDARY_FONT}`;
  ctx.fillStyle = "#9ec9ff";
  ctx.fillText(`Highscore: ${highscore}`, 16, 86);

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
  const boardH = WORLD_H - 60;

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
    ctx.font = `600 18px ${PRIMARY_FONT}`;
    ctx.fillStyle = "#dff6ff";
    ctx.fillText("Leaderboard", boardW / 2, 10);
    ctx.font = `600 13px ${SECONDARY_FONT}`;
    ctx.fillStyle = "#7fb2d7";
    ctx.fillText("Top 50 Piloten", boardW / 2, 32);

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
      ctx.font = `600 14px ${SECONDARY_FONT}`;
      ctx.fillStyle = "#7f9dbb";
      ctx.fillText("Noch keine Scores", boardW / 2, listY + listHeight / 2 - 8);
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

        ctx.fillStyle = rank <= 3 ? "rgba(255,211,107,0.12)" : "rgba(255,255,255,0.025)";
        ctx.fillRect(12, rowCenter - 14, listWidth - 4, LEADERBOARD_ENTRY_HEIGHT - 2);

        const style = getLeaderboardEntryStyle(entry);
        const baseColor = style.color || (rank <= 3 ? "#ffd36b" : "#e8f6ff");
        ctx.save();
        if (rank <= 3) {
          ctx.shadowColor = baseColor;
          ctx.shadowBlur = 12;
        }
        ctx.textAlign = "left";
        ctx.font = `600 15px ${SECONDARY_FONT}`;
        ctx.fillStyle = baseColor;
        ctx.fillText(`${String(rank).padStart(2, "0")}. ${style.displayName}`, 18, rowCenter - 8);
        if (rank <= 3) {
          ctx.shadowBlur = 0;
          ctx.strokeStyle = "rgba(255,255,255,0.25)";
          ctx.lineWidth = 2;
          ctx.strokeText(`${String(rank).padStart(2, "0")}. ${style.displayName}`, 18, rowCenter - 8);
        }
        ctx.restore();

        ctx.textAlign = "right";
        ctx.font = `600 14px ${SECONDARY_FONT}`;
        ctx.fillStyle = "#8fd3ff";
        ctx.fillText(`${entry.score}`, boardW - 18, rowCenter - 8);
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
    ctx.font = `600 15px ${SECONDARY_FONT}`;
    ctx.fillStyle = "#e3f6ff";
    ctx.fillText("Name anpassen", panelBtn.x + panelBtn.w / 2, panelBtn.y + panelBtn.h / 2);
    ctx.restore();
    nameButtonCandidate = { x: boardX + panelBtn.x, y: boardY + panelBtn.y, w: panelBtn.w, h: panelBtn.h };
  }

  const hudLeft = 16;
  const hpBarW = 180;
  const hpBarH = 14;
  const hpBarY = WORLD_H - 100;

  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.font = `600 16px ${SECONDARY_FONT}`;
  ctx.fillStyle = "#fff";
  ctx.fillText("HP", hudLeft, hpBarY - 14);
  ctx.fillStyle = "rgba(255,255,255,0.2)";
  ctx.fillRect(hudLeft, hpBarY, hpBarW, hpBarH);
  const hpRatio = player.hp / player.maxHp;
  ctx.fillStyle = hpRatio > 0.5 ? "#8bff9c" : hpRatio > 0.25 ? "#ffd966" : "#ff8888";
  ctx.fillRect(hudLeft, hpBarY, hpBarW * Math.max(0, Math.min(1, hpRatio)), hpBarH);
  ctx.strokeStyle = "#fff";
  ctx.strokeRect(hudLeft, hpBarY, hpBarW, hpBarH);

  const armorY = hpBarY + hpBarH + 24;
  const maxShield = player.maxHp * SHIELD_MAX_RATIO;
  const armorRatio = maxShield > 0 ? Math.min(1, player.shieldCharge / maxShield) : 0;
  ctx.fillStyle = "#bfeaff";
  ctx.fillText("Rüstung", hudLeft, armorY - 14);
  ctx.fillStyle = "rgba(191,234,255,0.2)";
  ctx.fillRect(hudLeft, armorY, hpBarW, hpBarH);
  ctx.fillStyle = "#8ad8ff";
  ctx.fillRect(hudLeft, armorY, hpBarW * armorRatio, hpBarH);
  ctx.strokeStyle = "#cfefff";
  ctx.strokeRect(hudLeft, armorY, hpBarW, hpBarH);

  if (player.shieldHits > 0) {
    ctx.fillStyle = "#9ed8ff";
    ctx.textBaseline = "top";
    ctx.font = `600 14px ${SECONDARY_FONT}`;
    ctx.fillText("Schild aktiv: 1 Treffer", hudLeft, armorY + hpBarH + 8);
  }

  if (player.lockTimer > 0) {
    ctx.fillStyle = "#ff5ad9";
    ctx.textBaseline = "top";
    ctx.font = `600 14px ${SECONDARY_FONT}`;
    ctx.fillText("LOCKING", hudLeft, armorY + hpBarH + 28);
  }

  if (showIntro) {
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#e2f1ff";
    ctx.font = `600 34px ${PRIMARY_FONT}`;
    const introTitleY = WORLD_H / 2 - 230;
    ctx.fillText("Nexus Nova - Flappy Nexus", WORLD_W / 2, introTitleY);
    ctx.font = `600 18px ${SECONDARY_FONT}`;
    ctx.fillStyle = "#8fd3ff";
    ctx.fillText(
      "Starte deinen Flug, sammle Lootboxen, knackst du den Highscore-",
      WORLD_W / 2,
      introTitleY + 40
    );

    const btnW = 260;
    const btnH = 58;
    const startButtonY = WORLD_H / 2 - 110;
    startButtonRect = { x: WORLD_W / 2 - btnW / 2, y: startButtonY, w: btnW, h: btnH };
    const grad = ctx.createLinearGradient(
      startButtonRect.x,
      startButtonRect.y,
      startButtonRect.x + btnW,
      startButtonRect.y + btnH
    );
    grad.addColorStop(0, "#5099C9");
    grad.addColorStop(1, "#5099C9");
    ctx.fillStyle = grad;
    ctx.strokeStyle = "#5099C9";
    ctx.lineWidth = 2;
    ctx.fillRect(startButtonRect.x, startButtonRect.y, startButtonRect.w, startButtonRect.h);
    ctx.strokeRect(startButtonRect.x, startButtonRect.y, startButtonRect.w, startButtonRect.h);
    ctx.font = `600 22px ${SECONDARY_FONT}`;
    ctx.fillStyle = "#e3f6ff";
    ctx.fillText("Start", WORLD_W / 2, startButtonRect.y + startButtonRect.h / 2);
    ctx.font = `600 14px ${SECONDARY_FONT}`;
    ctx.fillStyle = "#9ec9d9";
    ctx.fillText("LEERTASTE / TAP zum Start", WORLD_W / 2, startButtonRect.y - 34);

    const effectCards = [
      { title: "GEIST", desc: "durch Säulen gleiten", color: "#92f4ff" },
      { title: "SCHILD", desc: "blockt Treffer", color: "#8fb6ff" },
      { title: "DOPPEL", desc: "+2 Punkte pro Säule", color: "#ffe066" },
      { title: "ZEITLUPE", desc: "Säulen halb so schnell", color: "#9cff9c" },
      { title: "TURBO", desc: "Hochsprung", color: "#ffb366" },
      { title: "SCHRUMPF", desc: "hitbox schrumpft", color: "#8df0c3" },
      { title: "GROSS", desc: "fieser Debuff", color: "#ff8899" },
    ];
    const cardW = 190;
    const cardH = 86;
    const cardGap = 18;
    const cardsPerRow = 3;
    const cardsWidth = cardsPerRow * cardW + (cardsPerRow - 1) * cardGap;
    const cardsStartX = WORLD_W / 2 - cardsWidth / 2;
    const cardsStartY = startButtonRect.y + startButtonRect.h + 64;

    ctx.textAlign = "center";
    ctx.font = `600 18px ${SECONDARY_FONT}`;
    ctx.fillStyle = "#9ef";
    ctx.fillText("Lootbox Effekte", WORLD_W / 2, cardsStartY - 24);
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    effectCards.forEach((card, idx) => {
      const col = idx % cardsPerRow;
      const row = Math.floor(idx / cardsPerRow);
      const x = cardsStartX + col * (cardW + cardGap);
      const y = cardsStartY + row * (cardH + 16);
      ctx.fillStyle = "rgba(8,16,28,0.9)";
      ctx.strokeStyle = "rgba(79,210,255,0.25)";
      ctx.lineWidth = 1;
      ctx.fillRect(x, y, cardW, cardH);
      ctx.strokeRect(x, y, cardW, cardH);
      ctx.fillStyle = card.color;
      ctx.fillRect(x + 14, y + 18, 32, 32);
      ctx.strokeStyle = "rgba(255,255,255,0.15)";
      ctx.strokeRect(x + 14, y + 18, 32, 32);
      ctx.font = `600 16px ${SECONDARY_FONT}`;
      ctx.fillStyle = "#e8f6ff";
      ctx.fillText(card.title, x + 54, y + 18);
      ctx.font = `600 13px ${SECONDARY_FONT}`;
      ctx.fillStyle = "#9ec9ff";
      ctx.fillText(card.desc, x + 54, y + 40);
    });

    ctx.textAlign = "center";
    ctx.font = `600 16px ${SECONDARY_FONT}`;
    ctx.fillStyle = "#728d96";
    ctx.fillText("Created By Patrick Dause", WORLD_W / 2, WORLD_H - 44);
    ctx.fillText("Designed By Jennifer Linz", WORLD_W / 2, WORLD_H - 24);
  } else {
    startButtonRect = null;
  }

    if (finalCongratsTimer > 0 && !gameOver) {
      ctx.save();
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "rgba(0,0,0,0.35)";
      ctx.fillRect(WORLD_W / 2 - 220, 40, 440, 94);
      ctx.fillStyle = "#d0f0ff";
      ctx.font = `600 28px ${PRIMARY_FONT}`;
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
      ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, boardX - 12, WORLD_H);
      ctx.rect(boardX + boardW + 12, 0, WORLD_W - (boardX + boardW + 12), WORLD_H);
      ctx.clip();
      ctx.fillRect(0, 0, WORLD_W, WORLD_H);
      ctx.restore();

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#e9f2ff";
    ctx.font = `600 44px ${PRIMARY_FONT}`;
    if (gameWon) {
      ctx.fillText("Du hast es geschafft!", WORLD_W / 2, WORLD_H / 2 - 140);
      ctx.font = `600 24px ${SECONDARY_FONT}`;
      const winLine = boss6Defeated
        ? "Alle sechs Bosse liegen hinter dir - jetzt beginnt der Marathon."
        : "Fünf Bosse liegen hinter dir - Boss 6 wartet noch.";
      ctx.fillText(winLine, WORLD_W / 2, WORLD_H / 2 - 90);
    } else {
      ctx.fillText("Game Over", WORLD_W / 2, WORLD_H / 2 - 110);
    }
    ctx.font = `600 24px ${SECONDARY_FONT}`;
    ctx.fillText(`Punkte: ${score}`, WORLD_W / 2, WORLD_H / 2 - 30);
    ctx.fillText(`Highscore: ${highscore}`, WORLD_W / 2, WORLD_H / 2 + 10);
    ctx.font = `600 20px ${SECONDARY_FONT}`;
    ctx.fillText("LEERTASTE / TAP zum Restart", WORLD_W / 2, WORLD_H / 2 + 52);

    const btnW = 320;
    const btnH = 48;
    gameOverLinkRect = { x: WORLD_W / 2 - btnW / 2, y: WORLD_H / 2 + 110, w: btnW, h: btnH };
    ctx.fillStyle = "#5099C9";
    ctx.strokeStyle = "#5099C9";
    ctx.lineWidth = 2;
    ctx.fillRect(gameOverLinkRect.x, gameOverLinkRect.y, gameOverLinkRect.w, gameOverLinkRect.h);
    ctx.strokeRect(gameOverLinkRect.x, gameOverLinkRect.y, gameOverLinkRect.w, gameOverLinkRect.h);
    ctx.fillStyle = "#e3f6ff";
    ctx.font = `600 18px ${SECONDARY_FONT}`;
    ctx.fillText("Werde Teil des Teams #SuperNova", WORLD_W / 2, gameOverLinkRect.y + gameOverLinkRect.h / 2);

    ctx.font = `600 16px ${SECONDARY_FONT}`;
    ctx.fillStyle = "#728d96";
    ctx.fillText("Created By Patrick Dause", WORLD_W / 2, WORLD_H - 44);
    ctx.fillText("Designed By Jennifer Linz", WORLD_W / 2, WORLD_H - 24);
  } else {
    gameOverLinkRect = null;
  }

  nameButtonRect = nameButtonCandidate;
  ctx.restore();
}
  function drawEverything() {
    beginFrame();
    drawBackground();
    drawPhaseText();
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
    ctx.font = `600 44px ${PRIMARY_FONT}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("Boss erscheint...", cx, cy - 10);
    ctx.font = `600 20px ${SECONDARY_FONT}`;
    ctx.fillText("Bereit machen...", cx, cy + 24);
    ctx.restore();
  }

  // ======================================================
  //  Loop
  // ======================================================
  function loop(ts) {
    const dt = (ts - lastTime) / 1000 || 0;
    lastTime = ts;
    if (leaderboard.length > 0) {
      const scrollRange = Math.max(LEADERBOARD_ENTRY_HEIGHT * leaderboard.length, 1);
      leaderboardScrollOffset = (leaderboardScrollOffset + dt * LEADERBOARD_SCROLL_SPEED) % scrollRange;
    } else {
      leaderboardScrollOffset = 0;
    }
    update(dt);
    drawEverything();
    requestAnimationFrame(loop);
  }

  requestAnimationFrame(loop);
});





