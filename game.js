document.addEventListener("DOMContentLoaded", () => {
  const canvas = document.getElementById("game");
  if (!canvas) return;

  const ctx = canvas.getContext("2d", { alpha: true });
  const wrap = document.getElementById("game-wrap") || canvas.parentElement;

  let W = 0;
  let H = 0;

  function resizeCanvas() {
    const rect = wrap.getBoundingClientRect();
    const dpr = Math.max(1, window.devicePixelRatio || 1);

    W = rect.width;
    H = rect.height;

    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);

    canvas.style.width = W + "px";
    canvas.style.height = H + "px";

    // Zeichnen in CSS-Pixeln
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  window.addEventListener("resize", resizeCanvas);
  resizeCanvas();

  function loadImage(src) {
    const img = new Image();
    img.src = src;
    return img;
  }

  // Beispiel: hier geht dein Game-Code weiter ...
  // function drawEffectCircles() { ... }

  function drawEffectCircles() {
    const effects = [
      { key: "ghostTimer", dur: DURATIONS.ghost, color: "#88ccff", label: "Ghost" },
      { key: "shieldTimer", dur: DURATIONS.shield, color: "#5cc8ff", label: "Schild" },
      { key: "doubleTimer", dur: DURATIONS.double, color: "#ffe066", label: "Doppel" },
      { key: "slowTimer", dur: DURATIONS.slow, color: "#9cff9c", label: "Zeitlupe" },
      { key: "turboTimer", dur: DURATIONS.turbo, color: "#ffb366", label: "Turbo" },
      { key: "shrinkTimer", dur: DURATIONS.shrink, color: "#8df0c3", label: "Shrink" },
      { key: "bigTimer", dur: DURATIONS.big, color: "#ff8899", label: "Groß" },
    ].filter(e => player[e.key] > 0);

    if (!effects.length) return;

    ctx.save();
    ctx.translate(player.x, player.y);
    ctx.lineWidth = 4;
    ctx.font = "12px system-ui";
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

  //Alternative, wenn base64 zu groß ist

  /*
// ======================================================
// ASSET BASE (ZIEL-URL ANPASSEN)
// ======================================================
const ASSET_BASE = "https://ZIEL-DOMAIN.DE/ZIEL-PFAD/";

// Beispiele:
const bgImage = new Image();
bgImage.src = ASSET_BASE + "background.png";

const bg2Image = new Image();
bg2Image.src = ASSET_BASE + "background2.png";

const logoImage = new Image();
logoImage.src = ASSET_BASE + "N.png";

const lootboxImage = new Image();
lootboxImage.src = ASSET_BASE + "lootbox.jpg";

const boss1Image = new Image();
boss1Image.src = ASSET_BASE + "boss1.jpg";

const boss2Image = new Image();
boss2Image.src = ASSET_BASE + "boss2.jpg";

  */

    const assets = "https://NexusNovaGames.github.io/FlappyNexus/";
    bg1.src   = assets + "background1.png";
    bg2.src   = assets + "background2.png";
    bg3.src   = assets + "background3.png";
    logo.src = assets + "N.png";
    lootbox.src      = assets + "lootbox.jpg";
    boss1.src     = assets + "boss1.jpg";
    boss2.src     = assets + "boss2.jpg";
    boss3.src     = assets + "boss3.jpg";


  // ======================================================
  //  Game State
  // ======================================================
  let gameRunning = false;
  let gameOver = false;
  let inBossFight = false;
  let currentBoss = null;
  let score = 0;
  let highscore = 0;
  let lastTime = 0;
  let currentBackground = "bg1";

  try {
    const stored = localStorage.getItem("flappy-nexus-highscore");
    if (stored) highscore = Number(stored) || 0;
  } catch (_) {
    highscore = 0;
  }

  // Player
  const player = {
    x: 200,
    y: canvas.height / 2,
    vy: 0,
    radius: 28,
    baseRadius: 28,
    gravity: 1200,
    baseJumpStrength: -450,
    jumpStrength: -450,
    rotation: 0,
    invincible: false,
    maxHp: 4,
    hp: 4,
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
  let pendingBossTitle = "";
  let pendingBossSubtitle = "";
  let gameWon = false;
  let runGlow = 0;
  let globalTime = 0;
  let finalCongratsTimer = 0;

  // Trail
  const trail = [];
  const trailMaxLength = 60;
  let trailSampleTimer = 0;
  const trailSampleInterval = 0.010;
  let trailLoopPhase = 0;

  // Pipes
  const pipes = [];
  const pipeWidth = 120;
  let pipeGap = 380;
  const minPipeGap = 350; // Sicherheitsabstand gegen unfaire Wände (breiter)
  let pipeSpeed = 200;
  let pipeSpawnTimer = 0;
  let pipeSpawnInterval = 2.1;
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
  const BOSS1_SCORE = 20; // Boss 1 bei 20 Punkten
  const BOSS2_SCORE = 40; // Boss 2 bei 40 Punkten
  const BOSS3_SCORE = 80; // Geheimboss bei 80 Punkten

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

    // Spin alle 25 Sprünge sicher auslösen (random Länge 3–5s)
    if (totalFlaps > 0 && totalFlaps % 25 === 0) {
      player.spinTimer = Math.max(player.spinTimer, 3 + Math.random() * 2);
    }
    // Zusätzlich zufälliger Spin alle 50 Klicks (Länge 2–4s)
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
      flap();
      e.preventDefault();
    }
  });
  window.addEventListener("mousedown", flap);
  window.addEventListener("touchstart", e => { flap(); e.preventDefault(); }, { passive: false });
  window.addEventListener("touchmove", e => { e.preventDefault(); }, { passive: false });

  // ======================================================
  //  Core Helpers
  // ======================================================
  function resetGame() {
    score = TEST_BOSS3 ? 30 : 0;
    gameOver = false;
    gameRunning = false;
    inBossFight = false;
    currentBackground = "bg1";

    Object.assign(player, {
      y: canvas.height / 2,
      vy: 0,
      radius: player.baseRadius,
      ghostTimer: 0,
      shrinkTimer: 0,
      slowTimer: 0,
      doubleTimer: 0,
      bigTimer: 0,
      shieldTimer: 0,
      turboTimer: 0,
      shieldHits: 0,
      debuffGraceTimer: 0,
      beamGraceTimer: 0,
      weaponMode: "normal",
      ammoRapid: 0,
      ammoSpread: 0,
      ammoSalvo: 0,
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

    pipeSpeed = basePipeSpeed;
    pipeGap = 300;
    pipeSpawnTimer = 0;
    pipeSpawnInterval = 1.8;
    bgOffset = 0;

    boss1Spawned = boss1Defeated = false;
    boss2Spawned = boss2Defeated = false;
    boss3Spawned = boss3Defeated = false;
    totalFlaps = 0;
    lastScoreHueStep = 0;
  }

  function endGame() {
    if (gameOver) return;
    gameOver = true;
    gameRunning = false;
    inBossFight = false;
    currentBoss = null;
    bossShots.length = 0;
    playerShots.length = 0;
    highscore = Math.max(highscore, score);
    try {
      localStorage.setItem("flappy-nexus-highscore", String(highscore));
    } catch (_) {
      /* ignore */
    }
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
  function randomPowerup() {
    const list = ["ghost", "shrink", "slow", "double", "big", "shield", "turbo"];
    return list[Math.floor(Math.random() * list.length)];
  }

  function randomBossPowerup() {
    const roll = Math.random();
    if (roll < 0.35) return "bossshield";
    if (roll < 0.6) return "bossheal";
    if (roll < 0.75) return "rapid";
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
      rapid: "rgba(255,200,120,1)",
      spread: "rgba(200,180,255,1)",
    };

    if (type === "ghost") {
      player.ghostTimer += DURATIONS.ghost;
      player.invincible = true;
    } else if (type === "shrink") {
      player.shrinkTimer += DURATIONS.shrink;
    } else if (type === "slow") {
      player.slowTimer += DURATIONS.slow;
    } else if (type === "double") {
      player.doubleTimer += DURATIONS.double;
    } else if (type === "big") {
      player.bigTimer += DURATIONS.big;
    } else if (type === "shield") {
      player.shieldHits = 2;
      player.shieldTimer = 0;
      player.invincible = false;
    } else if (type === "turbo") {
      player.turboTimer += DURATIONS.turbo;
    } else if (type === "bossshield") {
      player.shieldHits = 2;
      player.shieldTimer = 0;
    } else if (type === "bossheal") {
      player.hp = Math.min(player.maxHp, player.hp + 1);
    } else if (type === "rapid") {
      player.weaponMode = "rapid";
      player.ammoRapid = 30;
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

    player.jumpStrength = player.baseJumpStrength * (player.turboTimer > 0 ? 1.1 : 1.0);

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
      player.radius = base * 1.4;
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
    const minGapY = 120;
    let gapSize = Math.max(pipeGap, minPipeGap);
    // Nur wenn eine Ghost-Lootbox zuletzt erzeugt wurde, einmal engeres Gap erzeugen
    if (ghostChallenge && !inBossFight) {
      gapSize = Math.max(240, player.radius * 4.4);
      ghostChallenge = false;
    }
    const maxGapY = canvas.height - 120 - gapSize;
    const baseY = lastGapY === null ? canvas.height / 2 - gapSize / 2 : lastGapY;
    const gapY = Math.max(
      80,
      Math.min(
        maxGapY,
        baseY + (Math.random() - 0.5) * 90
      )
    );
    lastGapY = gapY;

    pipes.push({
      x: canvas.width + 60,
      gapY,
      vy: (Math.random() * 10 + 8) * (Math.random() < 0.5 ? -1 : 1),
      passed: false,
    });
  }

  function spawnLootbox(pipe) {
    if (Math.random() < lootSpawnChance) {
      const centerY = pipe.gapY + pipeGap / 2;
      const type = randomPowerup();
      if (type === "ghost") ghostChallenge = true;
      lootboxes.push({
        x: pipe.x + pipeWidth / 2,
        y: centerY,
        baseY: centerY,
        swayPhase: Math.random() * Math.PI * 2,
        swayAmp: 26 + Math.random() * 18,
        size: 63,
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
        x: canvas.width + 30,
        gapY: 140 + Math.random() * Math.max(40, canvas.height - 360 - Math.max(pipeGap, minPipeGap)),
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

      if (p.gapY < 80 || p.gapY > canvas.height - 80 - pipeGap) {
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
        pipeSpeed += 0.4;
        if (pipeGap > minPipeGap) {
          pipeGap = Math.max(minPipeGap, pipeGap - 0.05);
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
    if (player.invincible) return;
    const graceActive = player.debuffGraceTimer > 0;
    for (const p of pipes) {
      if (
        circleRectCollision(player.x, player.y, player.radius, p.x, 0, pipeWidth, p.gapY) ||
        circleRectCollision(player.x, player.y, player.radius, p.x, p.gapY + pipeGap, pipeWidth, canvas.height)
      ) {
        if (player.shieldHits > 0 || player.shieldTimer > 0) {
          player.shieldHits = 0;
          player.shieldTimer = 0;
          player.shieldInvTimer = 2;
          player.debuffGraceTimer = 0.4;
        } else if (!graceActive) {
          endGame();
        }
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
      shots.push({ angle: -0.18, speed: 620, size: 7 });
      shots.push({ angle: 0, speed: 620, size: 7 });
      shots.push({ angle: 0.18, speed: 620, size: 7 });
      if (player.ammoSpread <= 0) player.weaponMode = "normal";
    } else if (player.weaponMode === "rapid" && player.ammoRapid > 0) {
      player.ammoRapid--;
      shots.push({ angle: 0, speed: 720, size: 6 });
      if (player.ammoRapid <= 0) player.weaponMode = "normal";
    } else if (player.weaponMode === "salvo" && player.ammoSalvo > 0) {
      player.ammoSalvo--;
      // 360° Salvo: 8 Projektile rundherum
      for (let k = 0; k < 8; k++) {
        const a = (Math.PI * 2 * k) / 8;
        shots.push({ angle: a, speed: 520, size: 7 });
      }
      if (player.ammoSalvo <= 0) player.weaponMode = "normal";
    } else {
      shots.push({ angle: 0, speed: 580, size: 6 });
    }

    for (const s of shots) {
      playerShots.push({
        x: player.x + player.radius + 10,
        y: player.y,
        vx: s.speed * Math.cos(s.angle),
        vy: s.speed * Math.sin(s.angle),
        size: s.size,
        color: "#ffdd88",
      });
    }
  }

  function shootBossProjectile(boss, angle = 0, speed = 520) {
    const vx = -Math.cos(angle) * speed;
    const vy = Math.sin(angle) * speed;
    bossShots.push({
      x: boss.x - boss.width / 2,
      y: boss.y,
      vx,
      vy,
      life: 5,
      age: 0,
      size: 8 + Math.random() * 4,
      type: Math.random() < 0.25 ? "shard" : Math.random() < 0.5 ? "seeker" : "orb",
    });
  }

  function createBoss(id) {
    const diff = 1 + bossStage * 0.2;
    if (id === 1) {
      return {
        id: 1,
        x: canvas.width - 200,
        y: canvas.height / 2,
        vy: 0,
        width: 220,
        height: 220,
        hp: Math.round(45 * diff),
        maxHp: Math.round(45 * diff),
        shotTimer: 0,
        shotInterval: 1.0 / (1 + bossStage * 0.05),
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
      x: canvas.width - 220,
      y: canvas.height / 2,
      vy: 0,
      width: 260,
      height: 260,
      hp: Math.round(80 * diff),
      maxHp: Math.round(80 * diff),
      shotTimer: 0,
      shotInterval: 0.65 / (1 + bossStage * 0.08),
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
    return {
      id: 3,
      x: canvas.width - 220,
      y: canvas.height / 2,
      vy: 0,
      width: 300,
      height: 300,
      hp: Math.round(200 * (1 + bossStage * 0.15)),
      maxHp: Math.round(200 * (1 + bossStage * 0.15)),
      shotTimer: 0,
      shotInterval: 0.55 / (1 + bossStage * 0.12),
      img: assets.boss3 && assets.boss3.complete ? assets.boss3 : assets.boss2,
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

  function startBossFight(id) {
    inBossFight = true;
    currentBoss = createBoss(id);
    currentBoss.lootTimer = 1.6;
    bossLoot.length = 0;
    bossObstacles.length = 0;
    if (id === 3) currentBackground = "bg3";
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
      currentBackground = "bg2";
      score += 10;
    } else if (id === 2) {
      boss2Defeated = true;
      score += 20;
    } else if (id === 3) {
      boss3Defeated = true;
      score += 30;
      currentBackground = "bg2";
      finalCongratsTimer = 8; // Glückwunschbanner anzeigen
    }

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

    if (id === 3) {
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
      bossCountdown = 4.0;
      player.vy = 0;
      player.debuffGraceTimer = 0.2;
      const texts1 = [
        ["Boss 1: Kaffeekrake", "Tentakel mit Espresso-Shots – wach bleiben!"],
      ];
      const pick = texts1[Math.floor(Math.random() * texts1.length)];
      pendingBossTitle = pick[0];
      pendingBossSubtitle = pick[1];
    } else if (score >= BOSS2_SCORE && !boss2Spawned && !boss2Defeated && threshold >= 2) {
      boss2Spawned = true;
      pendingBossId = 2;
      bossCountdown = 4.0;
      player.vy = 0;
      player.debuffGraceTimer = 0.2;
      const texts2 = [
        ["Boss 2: Deadline-Drache", "Er fliegt auf To-Do-Listen!"],
      ];
      const pick2 = texts2[Math.floor(Math.random() * texts2.length)];
      pendingBossTitle = pick2[0];
      pendingBossSubtitle = pick2[1];
    } else if (score >= BOSS3_SCORE && !boss3Spawned && !boss3Defeated && threshold >= 3) {
      boss3Spawned = true;
      pendingBossId = 3;
      bossCountdown = 4.0;
      player.vy = 0;
      player.debuffGraceTimer = 0.2;
      const texts3 = [
        ["Secret Boss: Patrick.exe", "Easteregg: Patrick.exe – der DEV debuggt dich zurück!"],
      ];
      const pick3 = texts3[Math.floor(Math.random() * texts3.length)];
      pendingBossTitle = pick3[0];
      pendingBossSubtitle = pick3[1];
    }
  }

  function updateBoss(dt) {
    if (!inBossFight || !currentBoss) return;

    const boss = currentBoss;
    boss.t += dt;
    const amp = 120;
    boss.y = canvas.height / 2 + Math.sin(boss.t * 1.1) * amp;
    boss.x = (boss.flipSide || 1) * (canvas.width - 180 + Math.sin(boss.t * 0.6) * 35);

    boss.attackModeTimer += dt;
    boss.flipTimer += dt;
    if (boss.flipTimer > 2.4) {
      boss.flipTimer = 0;
      boss.flipSide = boss.flipSide === -1 ? 1 : -1;
    }

    boss.shotTimer += dt;
    if (boss.shotTimer >= boss.shotInterval) {
      boss.shotTimer = 0;
      if (boss.attackMode === 0) {
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
          // zusätzliche 360° Parry-Welle
          for (let k = 0; k < 8; k++) {
            const a = (Math.PI * 2 * k) / 8;
            shootBossProjectile(boss, a, 450 + bossStage * 10);
          }
          // Shotgun-/Maschinengewehr-Modus wie bei Boss 2
          boss.machineGun = true;
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
      // Passierbare S?ulen f?r Boss 2 & 3 (breiteres Gap, wenige Hindernisse)
      const maxObs = boss.id === 3 ? 3 : 2;
      if (bossObstacles.length < maxObs) {
        const gap = boss.id === 3 ? 420 : 360;
        const gyBase = player.y - gap * 0.5;
        const gy = Math.max(80, Math.min(canvas.height - gap - 80, gyBase + (Math.random() - 0.5) * 140));
        bossObstacles.push({
          x: canvas.width + 40,
          gapY: gy,
          gap: gap + 70,
          speed: boss.id === 3 ? 180 : 150,
          vy: boss.id === 3 ? (Math.random() < 0.5 ? 38 : -38) : 0,
        });
      }
    } else if (boss.attackMode === 5 && boss.id === 3) {
      // Spiral volley + 360° Parry-Donut
      for (let k = 0; k < 12; k++) {
        const a = -0.35 + 0.06 * k + Math.sin(boss.t * 2) * 0.12;
        shootBossProjectile(boss, a, 560);
      }
      for (let k = 0; k < 10; k++) {
        const a = (Math.PI * 2 * k) / 10 + boss.t * 0.6;
        shootBossProjectile(boss, a, 430);
      }
    } else if (boss.attackMode === 6 && boss.id === 3) {
        // Wellen-Schusswand von rechts (keine Top-Down-Laser)
        for (let k = 0; k < 8; k++) {
      bossShots.push({
        x: canvas.width + 40,
        y: 80 + k * (canvas.height - 160) / 7,
        vx: -420,
        vy: Math.sin(boss.t * 2 + k) * 40,
        life: 4,
        age: 0,
        size: 10,
        type: "orb",
      });
        }
      } else if (boss.attackMode === 5 && boss.id === 2) {
        // Maschinengewehr kurzer Burst
        boss.burstCount = 0;
        boss.machineGun = true;
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
      const beamW = canvas.width;
      const beamY = boss.y - 50;
      const beamH = boss.id === 3 ? 120 : 80;
      if (
        player.x + player.radius > beamX - beamW &&
        player.x - player.radius < beamX &&
        player.y + player.radius > beamY &&
        player.y - player.radius < beamY + beamH &&
        !player.invincible
      ) {
        if (boss.beamTickTimer >= 0.6 && player.beamGraceTimer <= 0) {
          boss.beamTickTimer = 0;
          player.beamGraceTimer = 0.5;
          if (player.shieldHits > 0 || player.shieldTimer > 0) {
            player.shieldHits = 0;
            player.shieldTimer = 0;
            player.shieldInvTimer = 2;
            player.debuffGraceTimer = 0.4;
          } else {
            const dmg = Math.max(1, Math.ceil(player.maxHp * 0.05));
            player.hp -= dmg;
            player.debuffGraceTimer = 0.6;
            if (player.hp <= 0) {
              endGame();
              return;
            }
          }
        }
      }
    }

    if (boss.attackModeTimer > 6) {
      boss.attackModeTimer = 0;
      const maxMode = boss.id === 3 ? 7 : boss.id === 2 ? 6 : 3;
      boss.attackMode = (boss.attackMode + 1) % maxMode;
    }

    // Boss loot drops
    boss.lootTimer -= dt;
    if (boss.lootTimer <= 0) {
      const base = boss.id === 3 ? 1.2 : 3.5;
      boss.lootTimer = base + Math.random() * 1.0;
      let lootType = randomBossPowerup();
      if (boss.id === 3) {
        const r = Math.random();
        lootType = r < 0.35 ? "bossshield" : r < 0.5 ? "bossheal" : r < 0.7 ? "salvo" : r < 0.85 ? "spread" : "rapid";
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
      if (boss.id === 3 && Math.random() < 0.35) {
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
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.age += dt;

      // Maschinengewehr-Burst (Boss2/3)
      if (currentBoss && currentBoss.machineGun) {
        currentBoss.shotTimer += dt * 2;
        if (currentBoss.shotTimer >= 0.12 && currentBoss.burstCount < 20) {
          currentBoss.shotTimer = 0;
          currentBoss.burstCount++;
          shootBossProjectile(currentBoss, (Math.random() - 0.5) * 0.3, 520 + Math.random() * 80);
        } else if (currentBoss.burstCount >= 20) {
          currentBoss.machineGun = false;
          currentBoss.burstCount = 0;
        }
      }

      const dx = b.x - player.x;
      const dy = b.y - player.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < player.radius && !player.invincible) {
        if (player.shieldHits > 0 || player.shieldTimer > 0) {
          player.shieldHits = 0;
          player.shieldTimer = 0;
          player.shieldInvTimer = 2;
          player.debuffGraceTimer = 0.4;
          bossShots.splice(i, 1);
          continue;
        }
        player.hp -= 1;
        player.debuffGraceTimer = 0.6;
        if (player.hp <= 0) {
          endGame();
          return;
        }
        bossShots.splice(i, 1);
        continue;
      }

      // seeker adjust
      if (b.type === "seeker") {
        const ang = Math.atan2(player.y - b.y, player.x - b.x);
        b.vx += Math.cos(ang) * 40 * dt;
        b.vy += Math.sin(ang) * 40 * dt;
      }

      if (b.x < -120 || b.y < -200 || b.y > canvas.height + 200 || b.age > b.life) bossShots.splice(i, 1);
    }

    // Player shots collide with boss shots
    for (let i = playerShots.length - 1; i >= 0; i--) {
      const s = playerShots[i];
      for (let j = bossShots.length - 1; j >= 0; j--) {
        const b = bossShots[j];
        const dx = s.x - b.x;
        const dy = s.y - b.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const rad = (s.size || 6) + (b.size || 6);
        if (dist < rad) {
          playerShots.splice(i, 1);
          bossShots.splice(j, 1);
          break;
        }
      }
    }

    // Boss obstacles (pillars for boss2)
    for (let i = bossObstacles.length - 1; i >= 0; i--) {
      const o = bossObstacles[i];
      o.x -= o.speed * dt;
      if (o.vy) {
        o.gapY += o.vy * dt;
        if (o.gapY < 60 || o.gapY + o.gap > canvas.height - 60) {
          o.vy *= -1;
        }
      }

      if (
        player.x + player.radius > o.x &&
        player.x - player.radius < o.x + pipeWidth &&
        (player.y - player.radius < o.gapY || player.y + player.radius > o.gapY + o.gap)
      ) {
        if (player.shieldHits > 0 || player.shieldTimer > 0) {
          player.shieldHits = 0;
          player.shieldTimer = 0;
          player.shieldInvTimer = 2;
          player.debuffGraceTimer = 0.4;
        } else {
          player.hp -= 1;
          player.debuffGraceTimer = 0.6;
          if (player.hp <= 0) {
            endGame();
            return;
          }
        }
      }

      if (o.x + pipeWidth < -120) bossObstacles.splice(i, 1);
    }

    // Player shots
    for (let i = playerShots.length - 1; i >= 0; i--) {
      const s = playerShots[i];
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
      } else if (s.x > canvas.width + 200 || s.y < -200 || s.y > canvas.height + 200) {
        playerShots.splice(i, 1);
      }
    }
  }

  // ======================================================
  //  Explosions
  // ======================================================
  function spawnExplosion(x, y, color = "rgba(140,220,255,1)", power = 1) {
    const count = Math.floor(18 * power);
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

    if (bossTransitionActive) {
      bossTransitionTimer += dt;
      if (bossTransitionTimer >= bossTransitionDuration && pendingBossId) {
    bossTransitionActive = false;
    bossTransitionTimer = 0;
    startBossFight(pendingBossId);
    pendingBossId = null;
  }
      // während der Transition keine Welt-Updates
      return;
    }

    const scrollMultiplier = player.slowTimer > 0 ? 0.45 : 1.0;
    bgOffset -= bgScrollSpeedBase * scrollMultiplier * dt;
    if (bgOffset <= -canvas.width) bgOffset += canvas.width;

    // Keine Gravitation während Boss-Vorbereitung
    if (!pendingBossId) {
      const grav = player.turboTimer > 0 ? player.gravity * 0.85 : player.gravity;
      player.vy += grav * dt;
      player.y += player.vy * dt;
    } else {
      player.vy = 0;
    }

    const targetRot = Math.max(-0.5, Math.min(0.7, player.vy / 700));
    player.rotation += (targetRot - player.rotation) * dt * 7;

    if (player.spinTimer > 0) {
      player.rotation += dt * 6;
    }

    updatePowerupTimers(dt);

    trailSampleTimer += dt;
    if (trailSampleTimer >= trailSampleInterval) {
      trailSampleTimer = 0;
      trail.push({ x: player.x, y: player.y, vy: player.vy });
      if (trail.length > trailMaxLength) trail.shift();
    }
    trailLoopPhase += (bgScrollSpeedBase * scrollMultiplier) * 0.02 * dt;

    if (pendingBossId) {
      bossCountdown -= dt;
      player.vy = 0;
      if (bossCountdown <= 0) {
        bossTransitionActive = true;
        bossTransitionTimer = 0;
      }
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

    if (player.y - player.radius <= 0 || player.y + player.radius >= canvas.height) {
      if (player.shieldHits > 0 || player.shieldTimer > 0) {
        player.shieldHits = 0;
        player.shieldTimer = 0;
        player.shieldInvTimer = 2;
        player.debuffGraceTimer = 0.4;
      } else if (player.debuffGraceTimer <= 0) {
        endGame();
      }
    }
  }

  // ======================================================
  //  Drawing
  // ======================================================
  function drawBackground() {
    let img = assets.bg1;
    if (currentBackground === "bg2") img = assets.bg2;
    else if (currentBackground === "bg3" && assets.bg3 && assets.bg3.complete) img = assets.bg3;

    if (!img.complete || !img.naturalWidth) {
      ctx.fillStyle = "#02050c";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      return;
    }

    const aspect = img.width / img.height;
    let w = canvas.width;
    let h = w / aspect;

    if (h < canvas.height) {
      h = canvas.height;
      w = h * aspect;
    }

    ctx.drawImage(img, bgOffset, 0, w, h);
    ctx.drawImage(img, bgOffset + w, 0, w, h);
  }

  function drawTrail() {
    if (trail.length < 2) return;
    ctx.save();
    ctx.globalCompositeOperation = "screen";

    for (let i = 0; i < trail.length - 1; i++) {
      const a = trail[i];
      const b = trail[i + 1];
      const t = i / (trail.length - 1);
      const alpha = (1 - t) * 0.55;
      const width = 14 * (1 - t) + 4;
      const loopX = Math.sin(trailLoopPhase + t * 5) * 24;
      const loopY = Math.cos(trailLoopPhase * 1.2 + t * 6) * 12;
      const midX = (a.x + b.x) / 2 - a.vy * 0.05 + loopX;
      const midY = (a.y + b.y) / 2 + loopY;

      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.quadraticCurveTo(midX, midY, b.x, b.y);
      ctx.strokeStyle = `rgba(110,210,255,${alpha})`;
      ctx.lineWidth = width;
      ctx.stroke();

      // zusätzliche Glow-Linie
      ctx.strokeStyle = `rgba(180,240,255,${alpha * 0.5})`;
      ctx.lineWidth = width * 0.5;
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawPipes() {
    ctx.save();
    for (const p of pipes) {
      const col = "#08101f";
      ctx.fillStyle = col;
      ctx.fillRect(p.x, 0, pipeWidth, p.gapY);
      ctx.fillRect(p.x, p.gapY + pipeGap, pipeWidth, canvas.height - (p.gapY + pipeGap));

      ctx.strokeStyle = "#4fd2ff";
      ctx.shadowColor = "#4fd2ff";
      ctx.shadowBlur = 12;
      ctx.lineWidth = 3;

      ctx.strokeRect(p.x, 0, pipeWidth, p.gapY);
      ctx.strokeRect(p.x, p.gapY + pipeGap, pipeWidth, canvas.height - (p.gapY + pipeGap));
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
      ctx.fillRect(o.x, 0, pipeWidth, o.gapY);
      ctx.fillRect(o.x, o.gapY + o.gap, pipeWidth, canvas.height - (o.gapY + o.gap));
      ctx.strokeRect(o.x, 0, pipeWidth, o.gapY);
      ctx.strokeRect(o.x, o.gapY + o.gap, pipeWidth, canvas.height - (o.gapY + o.gap));
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
    const rot = (b.id >= 2 ? Math.sin(b.t * 1.3) * 0.08 : 0) + (b.flipSide === -1 ? Math.PI : 0);
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
    const visible = b.x + b.width / 2 > 0 && b.x - b.width / 2 < canvas.width;
    if (visible) {
      const barW = 260;
      const barH = 16;
      const bx = canvas.width / 2 - barW / 2;
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
      const beamW = canvas.width;
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
      const alpha = Math.max(0.2, 1 - s.age / s.life);
      const grad = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.size * 1.8);
      const color = s.type === "shard" ? "#ff99cc" : s.type === "seeker" ? "#88ffda" : "#ffcc66";
      grad.addColorStop(0, `${color}aa`);
      grad.addColorStop(1, `${color}00`);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = `${color}${Math.floor(alpha * 255).toString(16).padStart(2, "0")}`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.size * 1.2, 0, Math.PI * 2);
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
      ctx.drawImage(img, -r, -r, r * 2, r * 2);
    } else {
      ctx.fillStyle = "#9ef";
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fill();
    }

    if (player.shieldTimer > 0 || player.shieldHits > 0) {
      ctx.strokeStyle = `rgba(120,200,255,0.8)`;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(0, 0, r + 6, 0, Math.PI * 2);
      ctx.stroke();
      // kleiner Schild-Indikator oben rechts
      ctx.fillStyle = "rgba(120,200,255,0.9)";
      ctx.fillRect(r + 6, -r - 12, 16, 10);
    }

    if (player.turboTimer > 0) {
      ctx.strokeStyle = "rgba(255,170,80,0.7)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, r + 12, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Waffen-Indikator
    if (player.weaponMode !== "normal") {
      ctx.fillStyle = player.weaponMode === "rapid" ? "#ffc878" : player.weaponMode === "spread" ? "#c6b5ff" : "#7fe3ff";
      ctx.font = "12px system-ui";
      ctx.textAlign = "right";
      ctx.textBaseline = "top";
      const label = player.weaponMode === "rapid" ? `Rapid (${player.ammoRapid})` : player.weaponMode === "spread" ? `Spread (${player.ammoSpread})` : `Salvo (${player.ammoSalvo})`;
      ctx.fillText(label, -r - 6, -r - 14);
    }

    ctx.filter = "none";
    ctx.restore();
  }

  function drawUI() {
    ctx.save();
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillStyle = "#fff";
    ctx.font = "26px system-ui";
    ctx.fillText(`Punkte: ${score}`, 16, 60);

    ctx.font = "20px system-ui";
    ctx.fillStyle = "#9ef";
    ctx.fillText(`Highscore: ${highscore}`, 16, 94);

    let py = 140;
    ctx.font = "18px system-ui";

    if (player.ghostTimer > 0) {
      ctx.fillStyle = "#88ccff";
      ctx.fillText(`Ghost: ${player.ghostTimer.toFixed(1)}s`, 16, py);
      py += 26;
    }
    if (player.doubleTimer > 0) {
      ctx.fillStyle = "#ffe066";
      ctx.fillText(`Doppel-Punkte: ${player.doubleTimer.toFixed(1)}s`, 16, py);
      py += 26;
    }
    if (player.slowTimer > 0) {
      ctx.fillStyle = "#aaffaa";
      ctx.fillText(`Zeitlupe: ${player.slowTimer.toFixed(1)}s`, 16, py);
      py += 26;
    }
    if (player.turboTimer > 0) {
      ctx.fillStyle = "#ffb366";
      ctx.fillText(`Turbo: ${player.turboTimer.toFixed(1)}s`, 16, py);
      py += 26;
    }
    if (player.bigTimer > 0 || player.shrinkTimer > 0) {
      ctx.fillStyle = "#ff7777";
      ctx.fillText("Shrink...", 16, py);
      py += 26;
    }

    if (inBossFight || player.hp < player.maxHp || player.shieldHits > 0) {
      const hpBarW = 160;
      const hpBarH = 14;
      ctx.fillStyle = "#fff";
      ctx.font = "16px system-ui";
      ctx.fillText("HP", 16, py + 2);
      ctx.fillStyle = "rgba(255,255,255,0.2)";
      ctx.fillRect(50, py, hpBarW, hpBarH);
      const hpRatio = player.hp / player.maxHp;
      ctx.fillStyle = hpRatio > 0.5 ? "#8bff9c" : hpRatio > 0.25 ? "#ffd966" : "#ff8888";
      ctx.fillRect(50, py, hpBarW * Math.max(0, Math.min(1, hpRatio)), hpBarH);
      ctx.strokeStyle = "#fff";
      ctx.strokeRect(50, py, hpBarW, hpBarH);
      py += 26;

      if (player.shieldHits > 0) {
        ctx.fillStyle = "#9ed8ff";
        ctx.fillText("Schild: 1 Hit", 16, py);
        py += 24;
      }
    }

    if (!gameRunning && !gameOver) {
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = "42px system-ui";
      ctx.fillStyle = "#e2f1ff";
      ctx.fillText("Nexus Nova - Flappy Nexus", canvas.width / 2, canvas.height / 2 - 140);

      ctx.font = "20px system-ui";
      ctx.fillText("LEERTASTE / TAP zum Start", canvas.width / 2, canvas.height / 2 - 80);

      ctx.font = "18px system-ui";
      ctx.fillStyle = "#9ef";
      ctx.fillText("Lootbox Effekte:", canvas.width / 2, canvas.height / 2 - 20);

      ctx.font = "16px system-ui mono";
      ctx.fillStyle = "#fff";
      ctx.fillText("GHOST  - durchfliegt Säulen", canvas.width / 2, canvas.height / 2 + 20);
      ctx.fillText("SHIELD - schützt dich", canvas.width / 2, canvas.height / 2 + 50);
      ctx.fillText("DOUBLE - jede Säule +2", canvas.width / 2, canvas.height / 2 + 80);
      ctx.fillText("SLOW   - Säulen halb so schnell", canvas.width / 2, canvas.height / 2 + 110);
      ctx.fillText("TURBO  - stärkerer Sprung", canvas.width / 2, canvas.height / 2 + 140);
      ctx.fillText("SHRINK - schrumpft dich", canvas.width / 2, canvas.height / 2 + 170);
      ctx.fillText("BIG - fieser Debuff", canvas.width / 2, canvas.height / 2 + 200);

      ctx.font = "16px system-ui";
      ctx.fillStyle = "#728d96";
      ctx.fillText("Created by Patrick Dause", canvas.width / 2, canvas.height - 40);
    }

    if (finalCongratsTimer > 0 && !gameOver) {
      ctx.save();
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "rgba(0,0,0,0.35)";
      ctx.fillRect(canvas.width / 2 - 220, 40, 440, 90);
      ctx.fillStyle = "#d0f0ff";
      ctx.font = "28px system-ui";
      ctx.fillText("Herzlichen Glueckwunsch!", canvas.width / 2, 80);
      ctx.font = "18px system-ui";
      ctx.fillText("Du hast alle Bosse besiegt. Weiterfliegen fuer Highscore!", canvas.width / 2, 110);
      ctx.restore();
    }

    if (gameOver) {
      ctx.fillStyle = "rgba(0, 0, 0, 0.55)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      ctx.fillStyle = "#e9f2ff";
      ctx.font = "44px system-ui";
      if (gameWon) {
        ctx.fillText("Du hast es geschafft!", canvas.width / 2, canvas.height / 2 - 120);
        ctx.font = "26px system-ui";
        ctx.fillText("Alle drei Bosse besiegt. Jetzt geht's endlos um den Highscore!", canvas.width / 2, canvas.height / 2 - 70);
        ctx.fillText(`Punkte: ${score}   Highscore: ${highscore}`, canvas.width / 2, canvas.height / 2 - 20);
        ctx.font = "22px system-ui";
        ctx.fillText("Optionen:", canvas.width / 2, canvas.height / 2 + 30);
        ctx.fillText("LEERTASTE / TAP = Neues Spiel", canvas.width / 2, canvas.height / 2 + 65);
      } else {
        ctx.fillText("GAME OVER", canvas.width / 2, canvas.height / 2 - 80);
        ctx.font = "26px system-ui";
        ctx.fillText(`Punkte: ${score}`, canvas.width / 2, canvas.height / 2 - 20);
        ctx.fillText(`Highscore: ${highscore}`, canvas.width / 2, canvas.height / 2 + 20);
        ctx.font = "20px system-ui";
        ctx.fillText("LEERTASTE / TAP zum Restart", canvas.width / 2, canvas.height / 2 + 70);
      }

      ctx.font = "18px system-ui";
      ctx.fillStyle = "#728d96";
      ctx.fillText("Created by Patrick Dause", canvas.width / 2, canvas.height - 40);
    }

    ctx.restore();
  }

  function drawEverything() {
    drawBackground();
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

    if (bossTransitionActive) drawBossTransition();
  }

  function drawBossTransition() {
    const t = Math.min(1, bossTransitionTimer / bossTransitionDuration);
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const r = Math.max(canvas.width, canvas.height);

    // dunkles Overlay
    ctx.save();
    ctx.fillStyle = "rgba(0,0,0,0.7)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

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
    ctx.font = "48px system-ui";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(pendingBossTitle || "???", cx, cy - 40);
    ctx.font = "22px system-ui";
    ctx.fillText(pendingBossSubtitle || "Wilder Boss erscheint!", cx, cy + 10);
    ctx.fillText("Bereit machen...", cx, cy + 40);
    ctx.restore();
  }

  // ======================================================
  //  Loop
  // ======================================================
  function loop(ts) {
    const dt = (ts - lastTime) / 1000 || 0;
    lastTime = ts;
    update(dt);
    drawEverything();
    requestAnimationFrame(loop);
  }

  requestAnimationFrame(loop);
})();

