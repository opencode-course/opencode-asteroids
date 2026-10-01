'use strict';

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const W = 800;
const H = 600;
const SPEED_BOOST_DURATION = 5;
const SHIELD_DURATION = 5;
const TRIPLE_SHOT_DURATION = 5;
const POWER_UP_DROP_CHANCE = 0.12;
const POWER_UP_LIFETIME = 10;
const SHOOTING_STAR_SPEED = 320;
const SHOOTING_STAR_LIFETIME = 5;
const SHOOTING_STAR_POINTS = 500;
const SHOOTING_STAR_SPAWN_RATE = 0.075;
const SHIP_SKINS = [
  {
    name: 'CLÁSICA',
    stroke: '#fff',
    flame: 'rgba(255, 130, 0, 0.85)',
    flameLength: [6, 14],
    vertices: [[20, 0], [-12, -9], [-7, 0], [-12, 9]],
  },
  {
    name: 'NEÓN',
    stroke: '#00e5ff',
    flame: 'rgba(0, 229, 255, 0.9)',
    flameLength: [8, 16],
    vertices: [[22, 0], [-13, -10], [-8, 0], [-13, 10]],
    glow: true,
  },
  {
    name: 'FÉNIX',
    stroke: '#ff7043',
    flame: 'rgba(255, 190, 40, 0.95)',
    flameLength: [14, 23],
    vertices: [[23, 0], [7, -5], [-9, -13], [-7, -3], [-14, 0], [-7, 3], [-9, 13], [7, 5]],
    lineWidth: 1.8,
  },
  {
    name: 'TÁCTICA',
    stroke: '#a6ff4d',
    flame: 'rgba(166, 255, 77, 0.9)',
    flameLength: [5, 11],
    vertices: [[19, 0], [3, -6], [-3, -12], [-11, -8], [-8, 0], [-11, 8], [-3, 12], [3, 6]],
    lineWidth: 1.7,
  },
];

function loadShipSkinIndex() {
  try {
    const savedIndex = Number(localStorage.getItem('asteroidsShipSkin'));
    return Number.isInteger(savedIndex) && savedIndex >= 0 && savedIndex < SHIP_SKINS.length
      ? savedIndex
      : 0;
  } catch {
    return 0;
  }
}

let shipSkinIndex = loadShipSkinIndex();
let skinToastTtl = 0;

// ── Input ─────────────────────────────────────────────────────────────────────
const keys = {};
const justPressed = {};

window.addEventListener('keydown', e => {
  justPressed[e.code] = !keys[e.code];
  keys[e.code] = true;
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code))
    e.preventDefault();
});
window.addEventListener('keyup', e => { keys[e.code] = false; });

function pressed(code) {
  const val = justPressed[code];
  justPressed[code] = false;
  return val;
}

// ── Utils ─────────────────────────────────────────────────────────────────────
const wrap  = (v, max) => ((v % max) + max) % max;
const dist  = (a, b)   => Math.hypot(a.x - b.x, a.y - b.y);
const rand  = (min, max) => min + Math.random() * (max - min);
const randInt = (min, max) => Math.floor(rand(min, max + 1));

// ── Bullet ────────────────────────────────────────────────────────────────────
class Bullet {
  constructor(x, y, angle) {
    this.x = x;
    this.y = y;
    const SPEED = 520;
    this.vx = Math.cos(angle) * SPEED;
    this.vy = Math.sin(angle) * SPEED;
    this.ttl  = 1.1;
    this.radius = 2;
    this.dead = false;
  }

  update(dt) {
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  draw() {
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ── Asteroid ──────────────────────────────────────────────────────────────────
const RADII  = [0, 16, 30, 50];   // por tamaño 1, 2, 3
const SPEEDS = [0, 85, 55, 32];   // velocidad base por tamaño
const POINTS = [0, 100, 50, 20];  // puntos por tamaño

class Asteroid {
  constructor(x, y, size = 3) {
    this.x    = x;
    this.y    = y;
    this.size = size;
    this.radius = RADII[size];
    this.points = POINTS[size];
    this.color = '#fff';
    this.dead = false;

    const angle = rand(0, Math.PI * 2);
    const speed = SPEEDS[size] + rand(-15, 15);
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.rotSpeed = rand(-1.2, 1.2);
    this.rot = rand(0, Math.PI * 2);

    // Polígono irregular
    const n = randInt(8, 13);
    this.verts = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const r = this.radius * rand(0.6, 1.0);
      this.verts.push([Math.cos(a) * r, Math.sin(a) * r]);
    }
  }

  update(dt) {
    this.x   = wrap(this.x + this.vx * dt, W);
    this.y   = wrap(this.y + this.vy * dt, H);
    this.rot += this.rotSpeed * dt;
  }

  split() {
    if (this.size <= 1) return [];
    return [
      new Asteroid(this.x, this.y, this.size - 1),
      new Asteroid(this.x, this.y, this.size - 1),
    ];
  }

  draw() {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rot);
    ctx.strokeStyle = this.color;
    ctx.lineWidth   = 1.5;
    ctx.lineJoin    = 'round';
    ctx.beginPath();
    ctx.moveTo(this.verts[0][0], this.verts[0][1]);
    for (let i = 1; i < this.verts.length; i++)
      ctx.lineTo(this.verts[i][0], this.verts[i][1]);
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }
}

class ShootingStar extends Asteroid {
  constructor(x, y) {
    super(x, y, 2);
    this.points = SHOOTING_STAR_POINTS;
    this.color = '#ffd166';
    this.ttl = SHOOTING_STAR_LIFETIME;

    const angle = rand(0, Math.PI * 2);
    this.vx = Math.cos(angle) * SHOOTING_STAR_SPEED;
    this.vy = Math.sin(angle) * SHOOTING_STAR_SPEED;
  }

  update(dt) {
    super.update(dt);
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  split() {
    return [];
  }

  draw() {
    if (this.ttl < 1 && Math.floor(this.ttl * 8) % 2 === 0) return;

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.globalAlpha = this.ttl < 1 ? 0.65 : 1;
    ctx.strokeStyle = this.color;
    ctx.lineWidth = 5;
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-this.vx / SHOOTING_STAR_SPEED * this.radius * 2,
      -this.vy / SHOOTING_STAR_SPEED * this.radius * 2);
    ctx.stroke();

    ctx.rotate(this.rot);
    ctx.lineWidth = 1.5;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(this.verts[0][0], this.verts[0][1]);
    for (let i = 1; i < this.verts.length; i++)
      ctx.lineTo(this.verts[i][0], this.verts[i][1]);
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }
}

// ── Power-up ──────────────────────────────────────────────────────────────────
class PowerUp {
  constructor(x, y, type) {
    this.x = x;
    this.y = y;
    this.type = type;
    this.radius = 11;
    this.ttl = POWER_UP_LIFETIME;
    this.dead = false;

    const angle = rand(0, Math.PI * 2);
    const speed = rand(15, 35);
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
  }

  update(dt) {
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  draw() {
    if (this.ttl < 3 && Math.floor(this.ttl * 6) % 2 === 0) return;

    ctx.save();
    ctx.translate(this.x, this.y);
    const colors = { speed: '#00e5ff', shield: '#7cff4f', triple: '#ff9f1c' };
    ctx.strokeStyle = colors[this.type];
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
    if (this.type === 'shield') {
      ctx.moveTo(0, -7);
      ctx.lineTo(6, -4);
      ctx.lineTo(5, 3);
      ctx.lineTo(0, 7);
      ctx.lineTo(-5, 3);
      ctx.lineTo(-6, -4);
      ctx.closePath();
    } else if (this.type === 'triple') {
      ctx.moveTo(-6, -4);
      ctx.lineTo(6, -4);
      ctx.moveTo(-6, 0);
      ctx.lineTo(6, 0);
      ctx.moveTo(-6, 4);
      ctx.lineTo(6, 4);
    } else {
      ctx.moveTo(2, -7);
      ctx.lineTo(-4, 1);
      ctx.lineTo(0, 1);
      ctx.lineTo(-2, 7);
      ctx.lineTo(5, -2);
      ctx.lineTo(1, -2);
    }
    ctx.stroke();
    ctx.restore();
  }
}

// ── Ship ──────────────────────────────────────────────────────────────────────
class Ship {
  constructor() { this.reset(); }

  reset() {
    this.x      = W / 2;
    this.y      = H / 2;
    this.angle  = -Math.PI / 2;
    this.vx     = 0;
    this.vy     = 0;
    this.radius = 12;
    this.thrusting     = false;
    this.invincible    = 3;
    this.shootCooldown = 0;
    this.speedBoost    = 0;
    this.shield        = 0;
    this.tripleShot    = 0;
    this.dead          = false;
  }

  update(dt) {
    if (this.dead) return;
    if (this.invincible    > 0) this.invincible    -= dt;
    if (this.shootCooldown > 0) this.shootCooldown -= dt;
    if (this.speedBoost    > 0) this.speedBoost = Math.max(0, this.speedBoost - dt);
    if (this.shield        > 0) this.shield = Math.max(0, this.shield - dt);
    if (this.tripleShot    > 0) this.tripleShot = Math.max(0, this.tripleShot - dt);

    const ROT   = 3.5;   // rad/s
    const THRUST = 260 * (this.speedBoost > 0 ? 2 : 1);  // px/s²
    const DRAG   = 0.987;

    if (keys['ArrowLeft'])  this.angle -= ROT * dt;
    if (keys['ArrowRight']) this.angle += ROT * dt;

    this.thrusting = !!keys['ArrowUp'];
    if (this.thrusting) {
      this.vx += Math.cos(this.angle) * THRUST * dt;
      this.vy += Math.sin(this.angle) * THRUST * dt;
    }

    this.vx *= DRAG;
    this.vy *= DRAG;
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
  }

  tryShoot() {
    if (this.shootCooldown > 0 || this.dead) return [];
    this.shootCooldown = 0.2;
    const NOSE = 21;
    const ox = this.x + Math.cos(this.angle) * NOSE;
    const oy = this.y + Math.sin(this.angle) * NOSE;
    if (this.tripleShot > 0) {
      return [0, 8, 16].map(offset => new Bullet(
        ox + Math.cos(this.angle) * offset,
        oy + Math.sin(this.angle) * offset,
        this.angle,
      ));
    }
    return [new Bullet(ox, oy, this.angle)];
  }

  draw() {
    if (this.dead) return;

    const skin = SHIP_SKINS[shipSkinIndex];
    ctx.save();
    ctx.translate(this.x, this.y);

    if (this.shield > 0) {
      const isBlinking = this.shield < 1 && Math.floor(this.shield * 8) % 2 === 0;
      if (!isBlinking) {
        ctx.strokeStyle = 'rgba(124, 255, 79, 0.8)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, 23, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    // Parpadeo durante invencibilidad de reaparición
    if (this.invincible > 0 && Math.floor(this.invincible * 8) % 2 === 0) {
      ctx.restore();
      return;
    }

    ctx.rotate(this.angle);
    ctx.strokeStyle = this.speedBoost > 0 ? '#00e5ff' : skin.stroke;
    ctx.lineWidth   = skin.lineWidth || 1.5;
    ctx.lineJoin    = 'round';
    if (skin.glow || this.speedBoost > 0) {
      ctx.shadowColor = ctx.strokeStyle;
      ctx.shadowBlur = 12;
    }

    ctx.beginPath();
    ctx.moveTo(...skin.vertices[0]);
    for (let i = 1; i < skin.vertices.length; i++)
      ctx.lineTo(...skin.vertices[i]);
    ctx.closePath();
    ctx.stroke();

    if (this.thrusting && Math.random() > 0.35) {
      ctx.beginPath();
      ctx.moveTo(-8, -4);
      ctx.lineTo(-8 - rand(...skin.flameLength), 0);
      ctx.lineTo(-8,  4);
      ctx.strokeStyle = skin.flame;
      ctx.stroke();
    }

    ctx.restore();
  }
}

// ── Partículas (explosión) ────────────────────────────────────────────────────
class Particle {
  constructor(x, y) {
    this.x  = x;
    this.y  = y;
    const angle = rand(0, Math.PI * 2);
    const speed = rand(30, 130);
    this.vx   = Math.cos(angle) * speed;
    this.vy   = Math.sin(angle) * speed;
    this.life = rand(0.4, 1.1);
    this.ttl  = this.life;
    this.dead = false;
  }

  update(dt) {
    this.x  += this.vx * dt;
    this.y  += this.vy * dt;
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  draw() {
    const alpha = this.ttl / this.life;
    ctx.strokeStyle = `rgba(255,255,255,${alpha.toFixed(2)})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(this.x, this.y);
    ctx.lineTo(this.x - this.vx * 0.05, this.y - this.vy * 0.05);
    ctx.stroke();
  }
}

// ── Estado del juego ──────────────────────────────────────────────────────────
let ship, bullets, asteroids, particles, powerUps;
let score, lives, level;
let state;      // 'playing' | 'dead' | 'gameover'
let deadTimer;

function spawnAsteroids(count) {
  const SAFE_DIST = 130;
  for (let i = 0; i < count; i++) {
    let x, y;
    do {
      x = rand(0, W);
      y = rand(0, H);
    } while (Math.hypot(x - W / 2, y - H / 2) < SAFE_DIST);
    asteroids.push(new Asteroid(x, y, 3));
  }
}

function spawnShootingStar() {
  let x, y;
  do {
    x = rand(0, W);
    y = rand(0, H);
  } while (Math.hypot(x - ship.x, y - ship.y) < 150);
  asteroids.push(new ShootingStar(x, y));
}

function initGame() {
  ship          = new Ship();
  bullets   = [];
  asteroids = [];
  particles = [];
  powerUps = [];
  score  = 0;
  lives  = 3;
  level  = 1;
  state  = 'playing';
  spawnAsteroids(4);
}

function nextLevel() {
  level++;
  bullets   = [];
  asteroids = [];
  particles = [];
  powerUps  = [];
  ship.reset();
  spawnAsteroids(3 + level);
}

function explode(x, y, count = 8) {
  for (let i = 0; i < count; i++) particles.push(new Particle(x, y));
}

function killShip() {
  explode(ship.x, ship.y, 14);
  ship.dead = true;
  ship.speedBoost = 0;
  ship.shield = 0;
  ship.tripleShot = 0;
  lives--;
  if (lives <= 0) {
    state = 'gameover';
  } else {
    state     = 'dead';
    deadTimer = 2;
  }
}

// ── Update ────────────────────────────────────────────────────────────────────
function update(dt) {
  if (pressed('KeyS')) {
    shipSkinIndex = (shipSkinIndex + 1) % SHIP_SKINS.length;
    skinToastTtl = 1.6;
    try {
      localStorage.setItem('asteroidsShipSkin', String(shipSkinIndex));
    } catch {
      // La selección sigue funcionando si el almacenamiento no está disponible.
    }
  }
  skinToastTtl = Math.max(0, skinToastTtl - dt);

  if (state === 'gameover') {
    if (pressed('Space')) initGame();
    particles.forEach(p => p.update(dt));
    particles = particles.filter(p => !p.dead);
    return;
  }

  if (state === 'dead') {
    deadTimer -= dt;
    particles.forEach(p => p.update(dt));
    particles = particles.filter(p => !p.dead);
    asteroids.forEach(a => a.update(dt));
    asteroids = asteroids.filter(a => !a.dead);
    powerUps.forEach(powerUp => powerUp.update(dt));
    powerUps = powerUps.filter(powerUp => !powerUp.dead);
    if (deadTimer <= 0) { state = 'playing'; ship.reset(); }
    return;
  }

  // Disparar
  if (pressed('Space')) {
    bullets.push(...ship.tryShoot());
  }

  ship.update(dt);
  bullets.forEach(b => b.update(dt));
  asteroids.forEach(a => a.update(dt));
  if (!asteroids.some(a => a instanceof ShootingStar) &&
      Math.random() < SHOOTING_STAR_SPAWN_RATE * dt)
    spawnShootingStar();
  particles.forEach(p => p.update(dt));
  powerUps.forEach(powerUp => powerUp.update(dt));

  bullets   = bullets.filter(b => !b.dead);
  particles = particles.filter(p => !p.dead);
  powerUps = powerUps.filter(powerUp => !powerUp.dead);

  // Bala vs asteroide
  const newAsteroids = [];
  for (const b of bullets) {
    for (const a of asteroids) {
      if (!a.dead && !b.dead && dist(b, a) < a.radius) {
        b.dead = true;
        a.dead = true;
        score += a.points;
        explode(a.x, a.y, a.size * 5);
        newAsteroids.push(...a.split());
        if (!(a instanceof ShootingStar) && Math.random() < POWER_UP_DROP_CHANCE) {
          const types = ['speed', 'shield', 'triple'];
          const type = types[Math.floor(Math.random() * types.length)];
          powerUps.push(new PowerUp(a.x, a.y, type));
        }
      }
    }
  }
  asteroids = asteroids.filter(a => !a.dead).concat(newAsteroids);
  bullets   = bullets.filter(b => !b.dead);

  // Nave vs asteroide
  if (ship.invincible <= 0) {
    for (const a of asteroids) {
      if (dist(ship, a) < ship.radius + a.radius * 0.82) {
        if (ship.shield > 0) {
          deflectAsteroid(a);
        } else {
          killShip();
          break;
        }
      }
    }
  }

  // Nave vs power-up
  if (!ship.dead) {
    for (const powerUp of powerUps) {
      if (!powerUp.dead && dist(ship, powerUp) < ship.radius + powerUp.radius) {
        powerUp.dead = true;
        if (powerUp.type === 'shield') {
          ship.shield = SHIELD_DURATION;
        } else if (powerUp.type === 'triple') {
          ship.tripleShot = TRIPLE_SHOT_DURATION;
        } else {
          ship.speedBoost = SPEED_BOOST_DURATION;
        }
        explode(powerUp.x, powerUp.y, 8);
      }
    }
  }
  powerUps = powerUps.filter(powerUp => !powerUp.dead);

  // Nivel completado
  if (asteroids.every(a => a instanceof ShootingStar)) nextLevel();
}

function deflectAsteroid(asteroid) {
  let dx = asteroid.x - ship.x;
  let dy = asteroid.y - ship.y;
  let distance = Math.hypot(dx, dy);

  if (distance === 0) {
    dx = 1;
    dy = 0;
    distance = 1;
  }

  const normalX = dx / distance;
  const normalY = dy / distance;
  const velocityAlongNormal = asteroid.vx * normalX + asteroid.vy * normalY;

  if (velocityAlongNormal < 0) {
    asteroid.vx -= 2 * velocityAlongNormal * normalX;
    asteroid.vy -= 2 * velocityAlongNormal * normalY;
  }

  const safeDistance = ship.radius + asteroid.radius * 0.82 + 1;
  asteroid.x = wrap(ship.x + normalX * safeDistance, W);
  asteroid.y = wrap(ship.y + normalY * safeDistance, H);
}

// ── Draw ──────────────────────────────────────────────────────────────────────
function drawLifeIcon(x, y) {
  const skin = SHIP_SKINS[shipSkinIndex];
  const scale = 0.45;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-Math.PI / 2);
  ctx.strokeStyle = skin.stroke;
  ctx.lineWidth   = 1.2;
  ctx.lineJoin    = 'round';
  ctx.beginPath();
  ctx.moveTo(skin.vertices[0][0] * scale, skin.vertices[0][1] * scale);
  for (let i = 1; i < skin.vertices.length; i++)
    ctx.lineTo(skin.vertices[i][0] * scale, skin.vertices[i][1] * scale);
  ctx.closePath();
  ctx.stroke();
  ctx.restore();
}

function drawPowerBar(label, value, duration, color, y) {
  const barX = 105;
  const barWidth = 100;
  const barHeight = 7;
  const isBlinking = value < 1 && Math.floor(value * 8) % 2 === 0;

  ctx.textAlign = 'left';
  ctx.fillStyle = color;
  ctx.font = '11px monospace';
  ctx.fillText(label, 14, y + 8);
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  ctx.strokeRect(barX, y, barWidth, barHeight);
  ctx.fillStyle = isBlinking ? '#fff' : color;
  ctx.fillRect(barX + 1, y + 1, (barWidth - 2) * (value / duration), barHeight - 2);
  ctx.fillStyle = color;
  ctx.fillText(`${value.toFixed(1)}s`, barX + barWidth + 7, y + 8);
}

function drawHUD() {
  ctx.fillStyle = '#fff';
  ctx.font = '15px monospace';

  ctx.textAlign = 'left';
  ctx.fillText(`SCORE  ${score}`, 14, 26);

  ctx.textAlign = 'center';
  ctx.fillText(`NIVEL ${level}`, W / 2, 26);

  for (let i = 0; i < lives; i++)
    drawLifeIcon(W - 16 - i * 22, 18);

  let powerBarIndex = 0;
  if (ship.speedBoost > 0)
    drawPowerBar('VELOCIDAD', ship.speedBoost, SPEED_BOOST_DURATION, '#00e5ff', 46 + powerBarIndex++ * 16);
  if (ship.shield > 0)
    drawPowerBar('ESCUDO', ship.shield, SHIELD_DURATION, '#7cff4f', 46 + powerBarIndex++ * 16);
  if (ship.tripleShot > 0)
    drawPowerBar('TRIPLE', ship.tripleShot, TRIPLE_SHOT_DURATION, '#ff9f1c', 46 + powerBarIndex * 16);
}

function drawPowerBar(label, remaining, duration, color, y) {
  const barX = 105;
  const barY = y - 8;
  const barWidth = 100;
  const barHeight = 7;
  const isBlinking = remaining < 1 && Math.floor(remaining * 8) % 2 === 0;

  ctx.textAlign = 'left';
  ctx.fillStyle = color;
  ctx.font = '11px monospace';
  ctx.fillText(label, 14, y);
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  ctx.strokeRect(barX, barY, barWidth, barHeight);
  ctx.fillStyle = isBlinking ? '#fff' : color;
  ctx.fillRect(barX + 1, barY + 1, (barWidth - 2) * (remaining / duration), barHeight - 2);
  ctx.fillStyle = color;
  ctx.fillText(`${remaining.toFixed(1)}s`, barX + barWidth + 7, y);
}

function drawOverlay(title, sub) {
  ctx.textAlign   = 'center';
  ctx.fillStyle   = '#fff';
  ctx.font        = 'bold 46px monospace';
  ctx.fillText(title, W / 2, H / 2 - 18);
  ctx.font        = '18px monospace';
  ctx.fillStyle   = 'rgba(255,255,255,0.65)';
  ctx.fillText(sub, W / 2, H / 2 + 22);
}

function drawSkinToast() {
  if (skinToastTtl <= 0) return;

  ctx.save();
  ctx.globalAlpha = Math.min(1, skinToastTtl / 0.4);
  ctx.fillStyle = SHIP_SKINS[shipSkinIndex].stroke;
  ctx.textAlign = 'center';
  ctx.font = '13px monospace';
  ctx.fillText(`SKIN: ${SHIP_SKINS[shipSkinIndex].name}  —  S PARA CAMBIAR`, W / 2, H - 20);
  ctx.restore();
}

function draw() {
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);

  particles.forEach(p => p.draw());
  asteroids.forEach(a => a.draw());
  powerUps.forEach(powerUp => powerUp.draw());
  bullets.forEach(b => b.draw());
  ship.draw();

  drawHUD();

  if (state === 'gameover')
    drawOverlay('GAME OVER', `PUNTAJE: ${score}   —   ESPACIO PARA REINICIAR`);

  drawSkinToast();
}

// ── Loop principal ────────────────────────────────────────────────────────────
let lastTime = null;

function loop(ts) {
  const dt = lastTime === null ? 0 : Math.min((ts - lastTime) / 1000, 0.05);
  lastTime = ts;
  update(dt);
  draw();
  requestAnimationFrame(loop);
}

initGame();
requestAnimationFrame(loop);
