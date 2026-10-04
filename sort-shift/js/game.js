import { WASTE_ITEMS, CATEGORIES } from '../data/items.js';
import { getConnectionMode, submitScore, loadTopScores } from './leaderboard-service.js';

const $ = (id) => document.getElementById(id);
const hud = $('hud');
const scoreEl = $('hud-score');
const comboEl = $('hud-combo');
const comboFill = $('combo-fill');
const timeEl = $('hud-time');
const phaseEl = $('hud-phase');
const accEl = $('hud-accuracy');
const impactEl = $('hud-impact');
const startScreen = $('start-screen');
const leaderboardScreen = $('leaderboard-screen');
const startBtn = $('start-btn');
const nextPlayerBtn = $('next-player-btn');
const playerInput = $('player-name');
const toastEl = $('toast');
const stormBanner = $('storm-banner');
const waveBanner = $('wave-banner');
const soundBtn = $('sound-btn');
const connectionRow = document.querySelector('.connection-row');
const connectionText = $('connection-text');
const comboCard = document.querySelector('.hud-card.combo');
const tutorialHud = $('tutorial-hud');
const tutorialProgressFill = $('tutorial-progress-fill');
const tutorialProgressText = $('tutorial-progress-text');

const BY_ID = Object.fromEntries(WASTE_ITEMS.map(item => [item.id, item]));

const WAVE_PRESETS = [
  { title: 'เวฟ 1 · เริ่มจริง!', quota: 4, maxActive: 4, spawnDelay: 0.70, speed: [22, 30], pool: ['can', 'apple', 'tissue', 'cable'], allowDirty: false },
  { title: 'เวฟ 2 · เจอของใหม่', quota: 7, maxActive: 3, spawnDelay: 0.78, speed: [28, 39], pool: ['pet', 'can', 'banana', 'apple', 'wrapper', 'milk-carton', 'eggshell', 'plastic-cup'], allowDirty: false },
  { title: 'เวฟ 3 · เริ่มเร็วขึ้น', quota: 9, maxActive: 3, spawnDelay: 0.70, speed: [35, 49], pool: ['pet', 'glass', 'cardboard', 'banana', 'food', 'wrapper', 'foam', 'newspaper', 'plastic-bag', 'tea-bag'], allowDirty: false },
  { title: 'เวฟ 4 · เพิ่มความท้าทาย', quota: 11, maxActive: 4, spawnDelay: 0.62, speed: [43, 59], pool: ['pet', 'can', 'glass', 'cardboard', 'apple', 'food', 'wrapper', 'foam', 'battery', 'plastic-spoon', 'face-mask', 'glass-jar', 'light-bulb'], allowDirty: false },
  { title: 'เวฟ 5 · ของยากมาแล้ว', quota: 13, maxActive: 4, spawnDelay: 0.54, speed: [51, 70], pool: ['pet', 'can', 'glass', 'cardboard', 'banana', 'apple', 'food', 'wrapper', 'foam', 'battery', 'cable', 'phone', 'spray-can', 'coffee-cup', 'newspaper', 'eggshell'], allowDirty: false },
  { title: 'เวฟ 6 · ต้องล้างก่อนทิ้ง', quota: 15, maxActive: 5, spawnDelay: 0.46, speed: [58, 80], pool: WASTE_ITEMS.map(x => x.id), allowDirty: true },
];

let sceneRef = null;
let sounds = {};
let muted = false;
let audioReady = false;

function makeSounds() {
  if (!window.Howl || audioReady) return;
  sounds = {
    correct: new Howl({ src: ['assets/audio/correct.wav'], volume: 0.58 }),
    wrong: new Howl({ src: ['assets/audio/wrong.wav'], volume: 0.52 }),
    clean: new Howl({ src: ['assets/audio/clean.wav'], volume: 0.55 }),
    combo: new Howl({ src: ['assets/audio/combo.wav'], volume: 0.58 }),
    storm: new Howl({ src: ['assets/audio/storm.wav'], volume: 0.58 }),
    start: new Howl({ src: ['assets/audio/start.wav'], volume: 0.55 }),
    finish: new Howl({ src: ['assets/audio/finish.wav'], volume: 0.58 }),
    bgm: new Howl({ src: ['assets/audio/bgm.wav'], volume: 0.22, loop: true }),
  };
  audioReady = true;
}

function playSound(name) {
  if (!muted && sounds[name]) sounds[name].play();
}
function startMusic() {
  if (!muted && sounds.bgm && !sounds.bgm.playing()) sounds.bgm.play();
}
function stopMusic() {
  if (sounds.bgm) sounds.bgm.stop();
}

soundBtn.addEventListener('click', () => {
  makeSounds();
  muted = !muted;
  Howler.mute(muted);
  soundBtn.innerHTML = muted ? '<span>เสียง</span><strong>ปิด</strong>' : '<span>เสียง</span><strong>เปิด</strong>';
  soundBtn.classList.toggle('muted', muted);
  if (!muted && sceneRef?.playing) startMusic();
});

function toast(msg, tone = 'good') {
  toastEl.textContent = msg;
  toastEl.dataset.tone = tone;
  toastEl.classList.remove('show');
  void toastEl.offsetWidth;
  toastEl.classList.add('show');
}

function updateHud(s) {
  scoreEl.textContent = Math.round(s.score).toLocaleString('th-TH');
  comboEl.textContent = 'x' + Math.max(1, s.combo);
  comboFill.style.width = Math.min(100, s.combo * 8) + '%';
  const sec = Math.max(0, Math.ceil(s.timeLeft));
  timeEl.textContent = `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`;
  const total = s.correct + s.wrong + s.missed;
  accEl.textContent = ((s.correct / (total || 1)) * 100).toFixed(0) + '%';
  impactEl.textContent = '≈ ' + s.impact.toFixed(2) + ' kg CO₂e';
  phaseEl.textContent = `เวฟ ${Math.max(1, s.waveIndex)}${s.storm ? ' · พายุขยะ' : ''}`;
  comboCard?.classList.toggle('hot', s.combo >= 4);
}

function showStorm() {
  stormBanner.classList.remove('show');
  void stormBanner.offsetWidth;
  stormBanner.classList.add('show');
  playSound('storm');
}

function showWaveBanner(text) {
  waveBanner.textContent = text;
  waveBanner.classList.remove('show');
  void waveBanner.offsetWidth;
  waveBanner.classList.add('show');
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>'"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[ch]));
}

async function showEndLeaderboard(s) {
  stopMusic();
  playSound('finish');
  const total = s.correct + s.wrong + s.missed;
  const accuracy = (s.correct / (total || 1)) * 100;

  hud.classList.add('hidden');
  $('end-player-name').textContent = s.player;
  $('end-player-score').textContent = Math.round(s.score).toLocaleString('th-TH');
  $('end-impact').textContent = '≈ ' + s.impact.toFixed(2) + ' kg CO₂e';
  $('end-accuracy').textContent = accuracy.toFixed(0) + '%';
  $('end-combo').textContent = s.bestCombo.toString();
  $('end-items').textContent = s.correct + ' ชิ้น';
  const list = $('end-leaderboard-list');
  list.innerHTML = '<div class="leaderboard-loading">กำลังบันทึกคะแนน...</div>';
  leaderboardScreen.classList.remove('hidden');

  try {
    await submitScore({ name: s.player, score: s.score, co2e: s.impact, accuracy, combo: s.bestCombo, items: s.correct });
  } catch (err) {
    console.warn(err);
  }

  try {
    const rows = await loadTopScores(10);
    list.innerHTML = rows.map((row, index) => {
      const isCurrent = row.name === s.player && Math.round(Number(row.score || 0)) === Math.round(s.score);
      return `
        <div class="leader-row ${isCurrent ? 'current' : ''}">
          <div class="leader-rank">${index + 1}</div>
          <div class="leader-name">${escapeHtml(row.name || 'ผู้เล่น')}</div>
          <div class="leader-score">${Math.round(Number(row.score || 0)).toLocaleString('th-TH')}</div>
          <div class="leader-impact">${Number(row.co2e || 0).toFixed(2)} kg CO₂e</div>
        </div>`;
    }).join('') || '<div class="leaderboard-loading">ยังไม่มีคะแนน</div>';
  } catch (err) {
    console.warn(err);
    list.innerHTML = '<div class="leaderboard-loading">โหลดอันดับไม่สำเร็จ แต่คะแนนของคุณถูกบันทึกในเครื่องแล้ว</div>';
  }
}

class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');
    this.playing = false;
    this.currentHoverBin = null;
    this.tutorialMode = false;
    this.tutorialCorrect = 0;
    this.tutorialPlayer = 'ผู้เล่น';
  }

  preload() {
    this.load.image('campus', 'assets/campus/campus-game.jpg');
    for (const item of WASTE_ITEMS) this.load.image('w_' + item.id, item.asset);
    ['general', 'special', 'recycle', 'organic'].forEach(key => {
      this.load.image('bin_closed_' + key, `assets/bins_closed_new/${key}.png`);
      this.load.image('bin_open_' + key, `assets/bins_open_new/${key}.png`);
      this.load.image('bin_closed_glow_' + key, `assets/bins_closed_new_glow/${key}.png`);
      this.load.image('bin_open_glow_' + key, `assets/bins_open_new_glow/${key}.png`);
    });
  }

  create() {
    sceneRef = this;
    this.cityImage = this.add.image(this.scale.width / 2, this.scale.height / 2, 'campus').setDepth(-50);
    this.smogOverlay = this.add.rectangle(this.scale.width / 2, this.scale.height / 2, this.scale.width, this.scale.height, 0x8A93A0, 0.22).setDepth(-45);
    this.cityStage = 0;
    this.items = [];
    this.bins = {};
    this.makeBins();

    this.cleanG = this.add.graphics().setDepth(4);
    this.cleanText = this.add.text(0, 0, 'จุดล้าง', {
      fontFamily: 'Noto Sans Thai, sans-serif', fontSize: '16px', fontStyle: '900', color: '#44515C'
    }).setOrigin(0.5).setDepth(5);
    this.cleanSub = this.add.text(0, 0, 'เฉพาะของที่เปื้อน', {
      fontFamily: 'Noto Sans Thai, sans-serif', fontSize: '10px', color: '#6B7480'
    }).setOrigin(0.5).setDepth(5);
    this.cleanPulse = this.add.circle(0, 0, 54, 0xC8F4F0, 0.16).setStrokeStyle(4, 0x78D9D0, 0.70).setDepth(3);
    this.tweens.add({ targets: this.cleanPulse, scale: 1.12, alpha: 0.06, duration: 850, yoyo: true, repeat: -1, ease: 'Sine.InOut' });

    this.activeDrag = null;
    this.activePointerId = null;

    this.input.on('pointerdown', pointer => {
      if (!this.playing || this.activeDrag) return;
      const target = this.findWasteAt(pointer.x, pointer.y);
      if (target) this.beginManualDrag(target, pointer);
    });

    this.input.on('pointermove', pointer => {
      if (!this.activeDrag || !this.playing) return;
      if (this.activePointerId !== null && pointer.id !== this.activePointerId) return;
      this.moveActiveDrag(pointer);
    });

    this.input.on('pointerup', pointer => {
      if (!this.activeDrag) return;
      if (this.activePointerId !== null && pointer.id !== this.activePointerId) return;
      this.endActiveDrag(pointer);
    });

    this.scale.on('resize', () => this.layout());
    this.layout();
    this.setCleanZoneVisible(false, true);
  }

  findWasteAt(x, y) {
    let best = null;
    let bestRatio = Infinity;
    for (let i = this.items.length - 1; i >= 0; i--) {
      const item = this.items[i];
      if (!item?.active || item.isDragging) continue;
      const radius = item.hitRadius || 72;
      const d = Phaser.Math.Distance.Between(x, y, item.x, item.y);
      if (d <= radius) {
        const ratio = d / radius;
        if (ratio < bestRatio) {
          bestRatio = ratio;
          best = item;
        }
      }
    }
    return best;
  }

  beginManualDrag(obj, pointer) {
    if (!this.playing || !obj?.wasteDef || this.activeDrag) return;
    this.activeDrag = obj;
    this.activePointerId = pointer.id;
    obj.isDragging = true;
    obj.dragOffsetX = obj.x - pointer.x;
    obj.dragOffsetY = obj.y - pointer.y;
    obj.setDepth(30);
    obj.grabHalo?.setAlpha(0.34);
    obj.grabHalo?.setStrokeStyle(5, 0xFFFFFF, 0.95);
    this.tweens.killTweensOf(obj);
    this.tweens.add({ targets: obj, scale: 1.10, duration: 75, ease: 'Sine.Out' });
    this.updateBinHover(obj.x, obj.y);
    try {
      const ev = pointer.event;
      if (ev?.target?.setPointerCapture && ev.pointerId !== undefined) ev.target.setPointerCapture(ev.pointerId);
      ev?.preventDefault?.();
    } catch {}
  }

  moveActiveDrag(pointer) {
    const obj = this.activeDrag;
    if (!obj) return;
    const pad = obj.hitRadius || 72;
    const minY = Math.max(78, this.safeTop ? this.safeTop - 40 : 90);
    const maxY = this.scale.height - 18;
    obj.x = Phaser.Math.Clamp(pointer.x + (obj.dragOffsetX || 0), pad * 0.55, this.scale.width - pad * 0.55);
    obj.y = Phaser.Math.Clamp(pointer.y + (obj.dragOffsetY || 0), minY, maxY);
    obj.angle = 0;
    this.updateBinHover(obj.x, obj.y);
  }

  endActiveDrag(pointer) {
    const obj = this.activeDrag;
    if (!obj) return;
    const hovered = this.currentHoverBin;
    obj.isDragging = false;
    obj.setDepth(10);
    obj.grabHalo?.setAlpha(0.14);
    obj.grabHalo?.setStrokeStyle(4, 0xFFFFFF, 0.68);
    this.tweens.add({ targets: obj, scale: 1, duration: 90, ease: 'Sine.Out' });
    this.activeDrag = null;
    this.activePointerId = null;
    this.clearBinHover();
    this.handleDrop(obj, hovered);
    try {
      const ev = pointer?.event;
      if (ev?.target?.releasePointerCapture && ev.pointerId !== undefined) ev.target.releasePointerCapture(ev.pointerId);
    } catch {}
  }

  layout() {
    const w = this.scale.width;
    const h = this.scale.height;
    this.cityImage.setPosition(w / 2, h / 2);
    this.cityImage.setScale(Math.max(w / 1600, h / 900));
    this.smogOverlay.setPosition(w / 2, h / 2).setSize(w, h).setDisplaySize(w, h);

    this.safeTop = w < 600 ? 150 : (h < 720 ? 120 : 135);
    const binOrder = ['general', 'special', 'recycle', 'organic'];
    const side = Math.max(5, w * 0.012);
    const gap = Math.max(2, w * 0.004);
    const total = w - side * 2;
    const bw = (total - gap * 3) / 4;
    const binY = h - 4;

    binOrder.forEach((cat, i) => {
      const b = this.bins[cat];
      const x = side + bw / 2 + i * (bw + gap);
      const scale = Math.min((bw + 14) / 360, h < 700 ? 0.31 : 0.38);
      b.container.setPosition(x, binY);
      b.baseScale = scale;
      b.sprite.setScale(scale);
      b.glow.setScale(scale * 1.10);
      const hitW = Math.max(98, bw * 1.08);
      const hitH = Math.max(180, Math.min(250, h * 0.29));
      b.hit = new Phaser.Geom.Ellipse(x, binY - hitH * 0.48, hitW, hitH);
    });

    const cleanR = w < 760 ? 52 : 62;
    this.cleanCenter = { x: w - cleanR - 22, y: Math.max(150, h * 0.22), r: cleanR };
    this.cleanG.clear();
    this.cleanG.fillStyle(0xFFFFFF, 0.90);
    this.cleanG.lineStyle(4, 0x8DE4DB, 0.92);
    this.cleanG.fillCircle(this.cleanCenter.x, this.cleanCenter.y, cleanR);
    this.cleanG.strokeCircle(this.cleanCenter.x, this.cleanCenter.y, cleanR);
    this.cleanPulse.setPosition(this.cleanCenter.x, this.cleanCenter.y).setRadius(cleanR * 0.94);
    this.cleanText.setPosition(this.cleanCenter.x, this.cleanCenter.y - 8);
    this.cleanSub.setPosition(this.cleanCenter.x, this.cleanCenter.y + 18);
    if (this.tutorialMode && this.items.length) this.positionTutorialItems();
  }

  setCleanZoneVisible(visible, instant = false) {
    this.cleanUnlocked = !!visible;
    for (const obj of [this.cleanG, this.cleanText, this.cleanSub, this.cleanPulse]) obj?.setVisible(!!visible);
    if (visible && !instant) {
      for (const obj of [this.cleanText, this.cleanSub, this.cleanPulse]) obj?.setScale(0.72)?.setAlpha?.(0);
      this.cleanG?.setAlpha(0);
      this.tweens.add({ targets: this.cleanG, alpha: 1, duration: 260 });
      this.tweens.add({ targets: [this.cleanText, this.cleanSub, this.cleanPulse], scale: 1, alpha: 1, duration: 360, ease: 'Back.Out' });
      showWaveBanner('ปลดล็อก · จุดล้าง');
      toast('ของเปื้อนต้องผ่านจุดล้างก่อนทิ้ง', 'clean');
    }
  }

  makeBins() {
    ['general', 'special', 'recycle', 'organic'].forEach(cat => {
      const c = this.add.container(0, 0).setDepth(8);
      const shadow = this.add.ellipse(0, -2, 120, 24, 0x000000, 0.18);
      const glow = this.add.image(0, 0, 'bin_closed_glow_' + cat).setOrigin(0.5, 1).setAlpha(0);
      const sprite = this.add.image(0, 0, 'bin_closed_' + cat).setOrigin(0.5, 1);
      c.add([shadow, glow, sprite]);
      this.bins[cat] = {
        container: c,
        shadow,
        glow,
        sprite,
        hit: null,
        state: 'closed',
        baseScale: 1,
        closedKey: 'bin_closed_' + cat,
        openKey: 'bin_open_' + cat,
        closedGlowKey: 'bin_closed_glow_' + cat,
        openGlowKey: 'bin_open_glow_' + cat,
      };
    });
  }

  setBinVisual(cat, state = 'closed') {
    const b = this.bins[cat];
    if (!b || b.state === state) return;
    b.state = state;
    this.tweens.killTweensOf([b.sprite, b.glow, b.container]);

    if (state === 'closed') {
      b.sprite.setTexture(b.closedKey);
      b.glow.setTexture(b.closedGlowKey).setAlpha(0);
      this.tweens.add({ targets: b.sprite, scale: b.baseScale, duration: 90, ease: 'Sine.Out' });
      this.tweens.add({ targets: b.glow, scale: b.baseScale * 1.10, alpha: 0, duration: 90 });
    } else if (state === 'open') {
      b.sprite.setTexture(b.openKey);
      b.glow.setTexture(b.openGlowKey).setScale(b.baseScale * 1.12).setAlpha(0.82);
      this.tweens.add({ targets: b.sprite, scale: b.baseScale * 1.025, duration: 90, ease: 'Sine.Out' });
      this.tweens.add({ targets: b.glow, alpha: { from: 0.48, to: 0.90 }, scale: { from: b.baseScale * 1.08, to: b.baseScale * 1.14 }, duration: 420, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    } else if (state === 'success') {
      b.sprite.setTexture(b.openKey);
      b.glow.setTexture(b.openGlowKey).setScale(b.baseScale * 1.16).setAlpha(1);
      this.tweens.add({ targets: [b.sprite, b.glow], scale: b.baseScale * 1.08, duration: 100, yoyo: true, ease: 'Back.Out' });
      this.tweens.add({ targets: b.glow, alpha: 0.10, duration: 190, yoyo: true });
      this.time.delayedCall(250, () => this.setBinVisual(cat, 'closed'));
    } else if (state === 'wrong') {
      b.sprite.setTexture(b.openKey);
      b.glow.setTexture(b.openGlowKey).setScale(b.baseScale * 1.13).setAlpha(0.75);
      this.tweens.add({ targets: b.container, x: '+=5', yoyo: true, repeat: 3, duration: 34 });
      this.tweens.add({ targets: b.glow, alpha: 0.12, duration: 180, yoyo: true });
      this.time.delayedCall(250, () => this.setBinVisual(cat, 'closed'));
    }
  }

  updateBinHover(x, y) {
    let hovered = null;
    let bestDistance = Infinity;
    for (const [cat, b] of Object.entries(this.bins)) {
      if (!b.hit || !Phaser.Geom.Ellipse.Contains(b.hit, x, y)) continue;
      const d = Phaser.Math.Distance.Between(x, y, b.hit.x, b.hit.y);
      if (d < bestDistance) {
        bestDistance = d;
        hovered = cat;
      }
    }
    if (hovered === this.currentHoverBin) return;
    this.currentHoverBin = hovered;
    for (const cat of Object.keys(this.bins)) this.setBinVisual(cat, cat === hovered ? 'open' : 'closed');
  }

  clearBinHover() {
    this.currentHoverBin = null;
    for (const cat of Object.keys(this.bins)) {
      if (this.bins[cat].state === 'open') this.setBinVisual(cat, 'closed');
    }
  }

  tutorialSlotPosition(slot) {
    const w = this.scale.width;
    const h = this.scale.height;
    const portrait = w < 650 && h > w;
    if (portrait) {
      const xs = [w * 0.30, w * 0.70];
      const ys = [Math.max(this.safeTop + 78, h * 0.27), Math.max(this.safeTop + 235, h * 0.45)];
      return { x: xs[slot % 2], y: ys[Math.floor(slot / 2)] };
    }
    const xs = [w * 0.17, w * 0.39, w * 0.61, w * 0.83];
    return { x: xs[slot], y: Math.max(this.safeTop + 96, h * 0.30) };
  }

  positionTutorialItems() {
    for (const item of this.items) {
      if (item.tutorialSlot === undefined || item.isDragging) continue;
      const pos = this.tutorialSlotPosition(item.tutorialSlot);
      item.homeX = pos.x;
      item.homeY = pos.y;
      item.setPosition(pos.x, pos.y);
    }
  }

  createTutorialItem(def, slot) {
    const pos = this.tutorialSlotPosition(slot);
    const w = this.scale.width;
    const grabRadius = w < 600 ? 82 : (w < 900 ? 78 : 74);
    const c = this.add.container(pos.x, pos.y).setDepth(10);
    c.wasteDef = def;
    c.cleaned = true;
    c.isDragging = false;
    c.age = 0;
    c.hitRadius = grabRadius;
    c.fallSpeed = 0;
    c.tutorialSlot = slot;
    c.homeX = pos.x;
    c.homeY = pos.y;

    const shadow = this.add.ellipse(0, grabRadius * 0.52, grabRadius * 1.12, grabRadius * 0.30, 0x26323D, 0.22);
    const halo = this.add.circle(0, 0, grabRadius, 0xFFFFFF, 0.15).setStrokeStyle(4, 0xFFFFFF, 0.82);
    const innerHalo = this.add.circle(0, 0, grabRadius - 8, 0xDFF8FF, 0.04).setStrokeStyle(2, 0xDFF8FF, 0.30);
    const img = this.add.image(0, -2, 'w_' + def.id);
    const maxVisual = w < 600 ? 122 : (w < 900 ? 128 : 136);
    const scale = Math.min(maxVisual / img.width, maxVisual / img.height);
    img.setScale(scale);
    c.add([shadow, halo, innerHalo, img]);
    c.grabHalo = halo;
    this.items.push(c);
    this.tweens.add({ targets: c, scale: { from: 0.78, to: 1 }, alpha: { from: 0, to: 1 }, duration: 260 + slot * 70, ease: 'Back.Out' });
    return c;
  }

  updateTutorialProgress() {
    const done = Math.max(0, Math.min(4, this.tutorialCorrect));
    if (tutorialProgressFill) tutorialProgressFill.style.width = `${done * 25}%`;
    if (tutorialProgressText) tutorialProgressText.textContent = `${done} / 4 ชิ้น`;
  }

  startTutorial(player) {
    this.clearItems();
    this.player = player || 'ผู้เล่น';
    this.tutorialPlayer = this.player;
    this.tutorialMode = true;
    this.tutorialCorrect = 0;
    this.playing = true;
    this.activeDrag = null;
    this.activePointerId = null;
    this.currentHoverBin = null;
    this.setCleanZoneVisible(false, true);
    this.setCityStage(0, true);
    hud.classList.add('hidden');
    tutorialHud?.classList.remove('hidden');
    this.updateTutorialProgress();
    showWaveBanner('ลองแยกขยะ 4 ประเภท');

    const tutorialIds = ['pet', 'banana', 'wrapper', 'battery'];
    tutorialIds.forEach((id, slot) => this.createTutorialItem(BY_ID[id], slot));
    playSound('start');
  }

  finishTutorial() {
    if (!this.tutorialMode) return;
    this.tutorialMode = false;
    this.playing = false;
    this.clearBinHover();
    tutorialHud?.classList.add('complete');
    if (tutorialProgressText) tutorialProgressText.textContent = 'พร้อมแล้ว!';
    showWaveBanner('พร้อมแล้ว!');
    playSound('combo');

    const player = this.tutorialPlayer || this.player || 'ผู้เล่น';
    const steps = [
      [420, '3'],
      [980, '2'],
      [1540, '1'],
      [2100, 'เริ่ม!'],
    ];
    for (const [delay, label] of steps) {
      this.time.delayedCall(delay, () => showWaveBanner(label));
    }
    this.time.delayedCall(2500, () => {
      tutorialHud?.classList.add('hidden');
      tutorialHud?.classList.remove('complete');
      hud.classList.remove('hidden');
      this.startRound(player);
    });
  }

  startRound(player) {
    this.clearItems();
    this.tutorialMode = false;
    this.player = player || 'ผู้เล่น';
    this.score = 0;
    this.combo = 0;
    this.bestCombo = 0;
    this.correct = 0;
    this.wrong = 0;
    this.missed = 0;
    this.impact = 0;
    this.timeLeft = 75;
    this.spawnClock = 0.55;
    this.storm = false;
    this.cityStage = 0;
    this.waveIndex = 0;
    this.waveName = '';
    this.waveWaiting = false;
    this.waveResolved = false;
    this.lastSpawnId = null;
    this.activeDrag = null;
    this.activePointerId = null;
    this.playing = true;
    this.setCleanZoneVisible(false, true);
    this.setCityStage(0, true);
    this.advanceWave(true);
    updateHud(this);
    playSound('start');
    startMusic();
  }

  clearItems() {
    this.activeDrag = null;
    this.activePointerId = null;
    for (const o of this.items || []) o.destroy();
    this.items = [];
  }

  getWaveConfig(index) {
    const preset = WAVE_PRESETS[index - 1];
    if (preset) return preset;
    const bonus = index - WAVE_PRESETS.length;
    return {
      title: `เวฟ ${index} · เร็วขึ้นอีก`,
      quota: 14 + bonus * 2,
      maxActive: Math.min(6, 4 + Math.floor(bonus / 2)),
      spawnDelay: Math.max(0.38, 0.54 - bonus * 0.04),
      speed: [62 + bonus * 4, 86 + bonus * 6],
      pool: WASTE_ITEMS.map(x => x.id),
      allowDirty: true,
    };
  }

  advanceWave(initial = false) {
    this.waveIndex += 1;
    this.currentWave = this.getWaveConfig(this.waveIndex);
    this.spawnedInWave = 0;
    this.waveWaiting = false;
    this.waveResolved = false;
    this.spawnClock = initial ? 0.28 : 0.78;
    showWaveBanner(this.currentWave.title);
    if (this.currentWave.allowDirty && !this.cleanUnlocked) {
      this.time.delayedCall(520, () => {
        if (this.playing) this.setCleanZoneVisible(true);
      });
    }
    updateHud(this);
  }

  randomDef() {
    let ids = [...(this.currentWave.pool || WASTE_ITEMS.map(x => x.id))];
    if (!this.currentWave.allowDirty) ids = ids.filter(id => !BY_ID[id].dirty);
    if (this.lastSpawnId && ids.length > 1) ids = ids.filter(id => id !== this.lastSpawnId);
    if (this.storm && ids.includes('board') && Math.random() < 0.14) {
      this.lastSpawnId = 'board';
      return BY_ID.board;
    }
    const id = ids[Math.floor(Math.random() * ids.length)];
    this.lastSpawnId = id;
    return BY_ID[id];
  }

  spawnItem() {
    const mobilePortrait = this.scale.width < 600 && this.scale.height > this.scale.width;
    const activeCap = mobilePortrait ? Math.min(this.currentWave.maxActive, 3) : this.currentWave.maxActive;
    if (this.spawnedInWave >= this.currentWave.quota || this.items.length >= activeCap) return;

    const def = this.randomDef();
    const w = this.scale.width;
    const h = this.scale.height;
    const grabRadius = w < 600 ? 82 : (w < 900 ? 78 : 74);
    const margin = grabRadius + 12;
    const minGap = w < 600 ? 118 : 138;
    let startX = Phaser.Math.Between(margin, Math.max(margin + 1, w - margin));
    const startYBase = this.safeTop || (w < 600 ? 150 : 135);
    let startY = Phaser.Math.Between(startYBase, startYBase + (w < 600 ? 76 : 96));

    for (let tries = 0; tries < 24; tries++) {
      const candidateX = Phaser.Math.Between(margin, Math.max(margin + 1, w - margin));
      const candidateY = Phaser.Math.Between(startYBase, startYBase + (w < 600 ? 84 : 110));
      const farEnough = this.items.every(it => Phaser.Math.Distance.Between(it.x, it.y, candidateX, candidateY) > minGap);
      if (farEnough) {
        startX = candidateX;
        startY = candidateY;
        break;
      }
    }

    const c = this.add.container(startX, startY).setDepth(10);
    c.wasteDef = def;
    c.cleaned = !def.dirty;
    c.isDragging = false;
    c.age = 0;
    c.hitRadius = grabRadius;
    c.fallSpeed = Phaser.Math.Between(this.currentWave.speed[0], this.currentWave.speed[1]) + (this.storm ? 12 : 0);

    const shadow = this.add.ellipse(0, grabRadius * 0.52, grabRadius * 1.12, grabRadius * 0.30, 0x26323D, 0.22);
    const halo = this.add.circle(0, 0, grabRadius, 0xFFFFFF, 0.13).setStrokeStyle(4, 0xFFFFFF, 0.72);
    const innerHalo = this.add.circle(0, 0, grabRadius - 8, 0xDFF8FF, 0.035).setStrokeStyle(2, 0xDFF8FF, 0.25);
    const img = this.add.image(0, -2, 'w_' + def.id);
    const maxVisual = w < 600 ? 122 : (w < 900 ? 128 : 136);
    const scale = Math.min(maxVisual / img.width, maxVisual / img.height);
    img.setScale(scale);
    c.add([shadow, halo, innerHalo, img]);
    c.grabHalo = halo;

    if (def.dirty) {
      const dirty = this.add.text(grabRadius * 0.48, -grabRadius * 0.56, 'ล้างก่อน', {
        fontFamily: 'Noto Sans Thai, sans-serif', fontSize: w < 600 ? '9px' : '10px', fontStyle: '900', color: '#7B4F60', backgroundColor: '#FFE5EC', padding: { x: 6, y: 4 }
      }).setOrigin(0.5);
      c.add(dirty);
      c.dirtyBadge = dirty;
    }
    if (def.rare) {
      const rare = this.add.text(-grabRadius * 0.50, -grabRadius * 0.56, 'BONUS', {
        fontFamily: 'Noto Sans Thai, sans-serif', fontSize: w < 600 ? '9px' : '10px', fontStyle: '900', color: '#5F4C80', backgroundColor: '#EFE7FF', padding: { x: 6, y: 4 }
      }).setOrigin(0.5);
      c.add(rare);
    }

    this.items.push(c);
    this.spawnedInWave += 1;
    this.tweens.add({ targets: c, scale: { from: 0.82, to: 1 }, alpha: { from: 0, to: 1 }, duration: 190, ease: 'Back.Out' });
  }

  floatText(x, y, text, color = '#FF7FA8', size = 20) {
    const t = this.add.text(x, y, text, {
      fontFamily: 'Noto Sans Thai, sans-serif', fontSize: `${size}px`, fontStyle: '900', color, stroke: '#FFFFFF', strokeThickness: 6
    }).setOrigin(0.5).setDepth(40);
    this.tweens.add({ targets: t, y: y - 60, alpha: 0, scale: 1.12, duration: 680, ease: 'Cubic.Out', onComplete: () => t.destroy() });
  }

  comboFeedback() {
    if (this.combo < 3) return;
    let label = `COMBO x${this.combo}`;
    let color = '#FF78A8';
    let size = 22;
    if (this.combo >= 10) {
      label = `SUPER COMBO x${this.combo}`;
      color = '#FFB52E';
      size = 32;
    } else if (this.combo >= 7) {
      label = `GREAT COMBO x${this.combo}`;
      color = '#9B7AF1';
      size = 28;
    } else if (this.combo >= 4) {
      label = `COMBO x${this.combo}`;
      color = '#FF6FA2';
      size = 25;
    }
    this.floatText(this.scale.width * 0.5, Math.max(122, this.safeTop - 10), label, color, size);
    if ([4, 7, 10].includes(this.combo) || (this.combo > 10 && this.combo % 5 === 0)) {
      playSound('combo');
      const edge = this.add.rectangle(this.scale.width / 2, this.scale.height / 2, this.scale.width - 10, this.scale.height - 10, 0xFFFFFF, 0)
        .setStrokeStyle(this.combo >= 10 ? 10 : 7, Phaser.Display.Color.HexStringToColor(color).color, 0.55)
        .setDepth(42);
      this.tweens.add({ targets: edge, alpha: { from: 0.85, to: 0 }, duration: 430, ease: 'Cubic.Out', onComplete: () => edge.destroy() });
      comboCard?.classList.remove('hot');
      void comboCard?.offsetWidth;
      comboCard?.classList.add('hot');
    }
  }

  handleDrop(obj, hoveredBin = null) {
    const def = obj.wasteDef;

    if (this.tutorialMode) {
      let hit = hoveredBin;
      if (!hit) {
        let best = null;
        let bestDistance = Infinity;
        for (const [cat, b] of Object.entries(this.bins)) {
          if (!b.hit || !Phaser.Geom.Ellipse.Contains(b.hit, obj.x, obj.y)) continue;
          const d = Phaser.Math.Distance.Between(obj.x, obj.y, b.hit.x, b.hit.y);
          if (d < bestDistance) { bestDistance = d; best = cat; }
        }
        hit = best;
      }

      if (!hit) {
        this.tweens.add({ targets: obj, x: obj.homeX, y: obj.homeY, duration: 220, ease: 'Back.Out' });
        return;
      }

      if (hit !== def.category) {
        playSound('wrong');
        this.setBinVisual(hit, 'wrong');
        toast('ลองอีกครั้ง', 'wrong');
        this.tweens.add({ targets: obj, x: obj.homeX, y: obj.homeY, duration: 260, ease: 'Back.Out' });
        return;
      }

      playSound('correct');
      this.setBinVisual(hit, 'success');
      this.spark(obj.x, obj.y, Phaser.Display.Color.HexStringToColor(CATEGORIES[hit].color).color);
      this.removeItem(obj);
      this.tutorialCorrect += 1;
      this.updateTutorialProgress();
      toast('ถูกต้อง!', 'good');
      if (this.tutorialCorrect >= 4) this.time.delayedCall(420, () => this.finishTutorial());
      return;
    }

    if (this.cleanUnlocked && Phaser.Math.Distance.Between(obj.x, obj.y, this.cleanCenter.x, this.cleanCenter.y) <= this.cleanCenter.r + 40) {
      if (def.dirty && !obj.cleaned) {
        obj.cleaned = true;
        obj.dirtyBadge?.setText('สะอาดแล้ว').setBackgroundColor('#D8F3E3').setColor('#4A7F5E');
        this.score += 25;
        playSound('clean');
        toast('ล้างแล้ว +25', 'clean');
        this.spark(obj.x, obj.y, 0x82D6D2);
        this.tweens.add({ targets: obj, x: Math.max(110, this.cleanCenter.x - 135), y: this.cleanCenter.y + 105, duration: 260, ease: 'Back.Out' });
        updateHud(this);
        return;
      }
      toast('ชิ้นนี้ไม่ต้องล้าง', 'neutral');
      return;
    }

    let hit = hoveredBin;
    if (!hit) {
      for (const [cat, b] of Object.entries(this.bins)) {
        if (b.hit && Phaser.Geom.Ellipse.Contains(b.hit, obj.x, obj.y)) {
          hit = cat;
          break;
        }
      }
    }

    if (!hit) return;

    if (def.category === 'recycle' && def.dirty && !obj.cleaned) {
      this.combo = 0;
      this.score = Math.max(0, this.score - 15);
      toast('ต้องล้างก่อน -15', 'wrong');
      playSound('wrong');
      this.setBinVisual(hit, 'wrong');
      this.tweens.add({ targets: obj, x: Math.max(110, this.cleanCenter.x - 135), y: this.cleanCenter.y + 105, duration: 260, ease: 'Back.Out' });
      updateHud(this);
      return;
    }

    if (hit !== def.category) {
      this.wrong += 1;
      this.combo = 0;
      this.score = Math.max(0, this.score - 45);
      playSound('wrong');
      toast('ยังไม่ถูก -45', 'wrong');
      this.cameras.main.shake(120, 0.004);
      this.setBinVisual(hit, 'wrong');
      this.floatText(obj.x, obj.y - 10, 'พลาด!', '#E46788', 18);
      this.removeItem(obj);
      updateHud(this);
      this.checkWaveComplete();
      return;
    }

    this.correct += 1;
    this.combo += 1;
    this.bestCombo = Math.max(this.bestCombo, this.combo);
    const speedBonus = Math.max(0, 58 - Math.round(obj.age * 7));
    const multiplier = 1 + Math.min(1.5, this.combo * 0.08);
    const rareBonus = def.rare ? 240 : 0;
    const gained = (110 + speedBonus + rareBonus) * multiplier;
    this.score += gained;
    this.impact += def.co2eKg * (1 + Math.min(0.28, this.combo * 0.012));

    playSound('correct');
    this.setBinVisual(hit, 'success');
    this.spark(obj.x, obj.y, Phaser.Display.Color.HexStringToColor(CATEGORIES[hit].color).color);
    this.removeItem(obj);
    this.floatText(obj.x, obj.y - 14, `+${Math.round(gained)}`, '#F48BB5', 20);
    this.comboFeedback();

    const stage = this.impact >= 2.4 ? 3 : this.impact >= 1.35 ? 2 : this.impact >= 0.55 ? 1 : 0;
    if (stage !== this.cityStage) this.setCityStage(stage);
    updateHud(this);
    this.checkWaveComplete();
  }

  checkWaveComplete() {
    if (this.waveResolved || this.waveWaiting || !this.currentWave) return;
    if (this.spawnedInWave >= this.currentWave.quota && this.items.length === 0) {
      this.waveResolved = true;
      const clearBonus = 120 + this.waveIndex * 30;
      this.score += clearBonus;
      updateHud(this);
      showWaveBanner(`ผ่านเวฟ ${this.waveIndex}! +${clearBonus}`);
      this.floatText(this.scale.width / 2, this.scale.height * 0.34, `ผ่านเวฟ ${this.waveIndex}!`, '#53C987', 32);
      this.spark(this.scale.width / 2, this.scale.height * 0.38, 0xF4B93B);
      this.waveWaiting = true;
      this.time.delayedCall(900, () => {
        if (this.playing && this.timeLeft > 0.1) this.advanceWave();
      });
    }
  }

  spark(x, y, color) {
    for (let i = 0; i < 16; i++) {
      const p = this.add.circle(x, y, Phaser.Math.Between(3, 7), color, 1).setDepth(28);
      const a = Phaser.Math.FloatBetween(0, Math.PI * 2);
      const d = Phaser.Math.Between(35, 110);
      this.tweens.add({ targets: p, x: x + Math.cos(a) * d, y: y + Math.sin(a) * d, alpha: 0, scale: 0.2, duration: Phaser.Math.Between(320, 620), ease: 'Cubic.Out', onComplete: () => p.destroy() });
    }
  }

  removeItem(obj) {
    const idx = this.items.indexOf(obj);
    if (idx >= 0) this.items.splice(idx, 1);
    this.tweens.add({ targets: obj, scale: 0.25, alpha: 0, duration: 160, onComplete: () => obj.destroy() });
  }

  setCityStage(stage, instant = false) {
    this.cityStage = stage;
    const alphas = [0.22, 0.14, 0.07, 0.0];
    const target = alphas[Math.max(0, Math.min(3, stage))];
    if (instant) {
      this.smogOverlay.setAlpha(target);
    } else {
      this.tweens.add({ targets: this.smogOverlay, alpha: target, duration: 650, ease: 'Sine.InOut' });
    }
  }

  update(time, delta) {
    if (!this.playing) return;
    if (this.tutorialMode) return;
    const dt = Math.min(0.04, delta / 1000);
    this.timeLeft -= dt;

    if (this.timeLeft <= 15 && !this.storm) {
      this.storm = true;
      showStorm();
      for (const item of this.items) item.fallSpeed += 12;
    }

    if (!this.waveWaiting) {
      this.spawnClock -= dt;
      const spawnDelay = (this.currentWave?.spawnDelay ?? 0.9) * (this.storm ? 0.78 : 1);
      if (this.spawnClock <= 0) {
        this.spawnItem();
        this.spawnClock = spawnDelay;
      }
    }

    const floor = this.scale.height - Math.max(180, this.scale.height * 0.23);
    for (const obj of [...this.items]) {
      if (obj.isDragging) continue;
      obj.age += dt;
      obj.y += obj.fallSpeed * dt;
      obj.angle = Math.sin(obj.age * 2 + obj.x * 0.01) * 2.0;
      if (obj.y > floor) {
        this.missed += 1;
        this.combo = 0;
        this.score = Math.max(0, this.score - 20);
        toast('พลาดหนึ่งชิ้น -20', 'wrong');
        playSound('wrong');
        this.removeItem(obj);
        this.checkWaveComplete();
      }
    }

    updateHud(this);
    if (this.timeLeft <= 0) this.finishRound();
  }

  finishRound() {
    if (!this.playing) return;
    this.playing = false;
    this.timeLeft = 0;
    this.clearBinHover();
    updateHud(this);
    this.clearItems();
    showEndLeaderboard(this);
  }
}

async function init() {
  if (!window.Phaser) {
    connectionText.textContent = 'โหลดเกมไม่สำเร็จ กรุณาเชื่อมต่ออินเทอร์เน็ตแล้วรีเฟรช';
    startBtn.disabled = true;
    return;
  }
  await document.fonts?.ready?.catch?.(() => {});
  new Phaser.Game({
    type: Phaser.CANVAS,
    parent: 'game-root',
    backgroundColor: '#DDECF1',
    scene: [GameScene],
    scale: { mode: Phaser.Scale.RESIZE, width: window.innerWidth, height: window.innerHeight, autoCenter: Phaser.Scale.CENTER_BOTH },
    input: { activePointers: 2, smoothFactor: 0, dragDistanceThreshold: 0, dragTimeThreshold: 0, topOnly: true },
    render: { antialias: true, pixelArt: false, roundPixels: false, transparent: false },
  });
  makeSounds();
  try {
    const mode = await getConnectionMode();
    connectionRow.classList.add(mode);
    connectionText.textContent = mode === 'online' ? 'Leaderboard ออนไลน์พร้อมแชร์ทุกเครื่อง' : 'Leaderboard โหมดเครื่องเดียว';
  } catch {
    connectionRow.classList.add('local');
    connectionText.textContent = 'Leaderboard โหมดเครื่องเดียว';
  }
}

startBtn.addEventListener('click', () => {
  makeSounds();
  const name = (playerInput.value.trim() || 'ผู้เล่น').slice(0, 12);
  startScreen.classList.add('hidden');
  leaderboardScreen.classList.add('hidden');
  hud.classList.remove('hidden');
  sceneRef?.startTutorial(name);
});

nextPlayerBtn.addEventListener('click', () => {
  leaderboardScreen.classList.add('hidden');
  tutorialHud?.classList.add('hidden');
  playerInput.value = '';
  startScreen.classList.remove('hidden');
  setTimeout(() => playerInput.focus(), 80);
});

playerInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') startBtn.click();
});

document.addEventListener('contextmenu', e => e.preventDefault());
init();
