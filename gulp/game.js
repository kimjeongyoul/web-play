// Gulp Town: a hungry hole eats a town. One drag to play; a run lasts a minute; gold buys a bigger next run.
import * as THREE from './vendor/three.module.min.js'

const Q = new URLSearchParams(location.search)
const BOT = Q.has('bot')
const TURBO = Number(Q.get('turbo') || 0)
const RENDER = Q.has('render')
const soundLog = []
const $ = (id) => document.getElementById(id)
const clamp = (v, a, b) => Math.max(a, Math.min(b, v))
const lerp = (a, b, t) => a + (b - a) * t
const rnd = (a, b) => a + Math.random() * (b - a)
const pick = (list) => list[Math.floor(Math.random() * list.length)]

// ---------------------------------------------------------------- text
const TEXT = {
  en: { play: 'PLAY', again: 'PLAY AGAIN', home: 'Home', upgrades: 'Upgrades', skins: 'Holes', settings: 'Settings', close: 'Close', paused: 'Paused', resume: 'Resume', quit: 'End run', music: 'Music', sfx: 'Sound', shake: 'Screen shake', language: 'Language', on: 'On', off: 'Off', size: 'SIZE', eaten: 'Eaten', best: 'Best', timeUp: "TIME'S UP!", cleared: 'TOWN EATEN!', double: 'Double gold', drag: 'Drag to move', mouse: 'Move the mouse', frenzy: 'GULP FRENZY!', sizeUp: 'SIZE UP!', locked: 'Earn 1 star in the last town', owned: 'Owned', use: 'Use', used: 'In use', max: 'MAX', lvl: 'Lv', upTime: 'More time', upTimeD: '+3 s each run', upSpeed: 'Speed', upSpeedD: 'Move faster', upStart: 'Big start', upStartD: 'Start larger', upMagnet: 'Suction', upMagnetD: 'Pull things in', upGold: 'Gold', upGoldD: '+10% gold' },
  ko: { play: '시작', again: '다시 하기', home: '처음으로', upgrades: '강화', skins: '구멍', settings: '설정', close: '닫기', paused: '일시정지', resume: '계속', quit: '판 끝내기', music: '배경음', sfx: '효과음', shake: '화면 흔들림', language: '언어', on: '켬', off: '끔', size: '크기', eaten: '삼킨 양', best: '최고', timeUp: '시간 끝!', cleared: '마을을 다 삼켰다!', double: '골드 2배', drag: '끌어서 움직이기', mouse: '마우스를 움직이기', frenzy: '먹보 폭주!', sizeUp: '커졌다!', locked: '앞 마을에서 별 1개', owned: '보유', use: '쓰기', used: '사용 중', max: '최대', lvl: 'Lv', upTime: '시간', upTimeD: '판마다 +3초', upSpeed: '속도', upSpeedD: '더 빠르게', upStart: '큰 시작', upStartD: '더 크게 출발', upMagnet: '흡입', upMagnetD: '주변을 빨아들임', upGold: '골드', upGoldD: '골드 +10%' },
}
const TOWN_NAMES = { en: ['Maple Town', 'Sunny Beach', 'Snow Village', 'Candy Land', 'Neon City'], ko: ['단풍 마을', '햇살 해변', '눈 마을', '사탕 나라', '네온 시티'] }
let lang = 'en'
const t = (key) => TEXT[lang][key] ?? key

// ---------------------------------------------------------------- save
const SAVE_KEY = 'gulp_town'
const save = { gold: 0, runs: 0, town: 0, stars: [0, 0, 0, 0, 0], best: [0, 0, 0, 0, 0], up: { time: 0, speed: 0, start: 0, magnet: 0, gold: 0 }, skin: 0, skins: [0], music: 0.6, sfx: 0.9, shake: 1, lang: '' }
let saveTimer = 0
function writeSave() {
  clearTimeout(saveTimer)
  saveTimer = setTimeout(() => {
    const text = JSON.stringify(save)
    if (window.bridge?.storage) window.bridge.storage.set(SAVE_KEY, text).catch(() => {})
    else { try { localStorage.setItem(SAVE_KEY, text) } catch {} }
  }, 300)
}
async function readSave() {
  let text = null
  try {
    if (window.bridge?.storage) text = await window.bridge.storage.get(SAVE_KEY, false)
    else text = localStorage.getItem(SAVE_KEY)
  } catch {}
  if (typeof text !== 'string' || !text) return
  try {
    const old = JSON.parse(text)
    Object.assign(save, old, { up: { ...save.up, ...old.up } })
  } catch {}
}

// ---------------------------------------------------------------- platform
const platform = {
  ready: false, audioOn: true, paused: false, adOpen: false,
  message(name) { try { window.bridge?.platform?.sendMessage(name) } catch {} },
  async init() {
    const bridge = window.bridge
    if (!bridge || window.__noBridge) return
    try {
      bridge.engine = 'javascript'
      await bridge.initialize()
      this.ready = true
      this.audioOn = bridge.platform.isAudioEnabled !== false
      const events = bridge.EVENT_NAME
      bridge.platform.on(events.AUDIO_STATE_CHANGED, (on) => { this.audioOn = on; applyVolume() })
      bridge.platform.on(events.PAUSE_STATE_CHANGED, (on) => { this.paused = on; applyVolume(); if (on) pauseRun() })
      bridge.advertisement.on(events.INTERSTITIAL_STATE_CHANGED, (s) => this.onAd(s))
      bridge.advertisement.on(events.REWARDED_STATE_CHANGED, (s) => this.onReward(s))
    } catch (error) { console.warn('bridge', error) }
  },
  onAd(state) {
    if (state === 'opened') { this.adOpen = true; applyVolume() }
    if (state === 'closed' || state === 'failed') { this.adOpen = false; applyVolume() }
  },
  rewardDone: null, rewarded: false,
  onReward(state) {
    if (state === 'opened') { this.adOpen = true; applyVolume() }
    if (state === 'rewarded') this.rewarded = true
    if (state === 'closed' || state === 'failed') {
      this.adOpen = false; applyVolume()
      const done = this.rewardDone; this.rewardDone = null
      done?.(this.rewarded); this.rewarded = false
    }
  },
  interstitial() { try { if (this.ready) window.bridge.advertisement.showInterstitial() } catch {} },
  rewardedAd(done) {
    if (!this.ready) { done(false); return }
    this.rewardDone = done; this.rewarded = false
    try { window.bridge.advertisement.showRewarded() } catch { this.rewardDone = null; done(false) }
  },
}

// ---------------------------------------------------------------- sound
let renderClock = 0
const audio = {
  ctx: null, buffers: {}, musicGain: null, sfxGain: null, master: null, source: null, current: '', wanted: '',
  unlock() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return }
    const Ctx = window.AudioContext || window.webkitAudioContext
    if (!Ctx) return
    this.ctx = new Ctx()
    this.master = this.ctx.createGain(); this.master.connect(this.ctx.destination)
    this.musicGain = this.ctx.createGain(); this.musicGain.connect(this.master)
    this.sfxGain = this.ctx.createGain(); this.sfxGain.connect(this.master)
    applyVolume()
    for (const n of ['gulp1', 'gulp2', 'crunch', 'big', 'huge', 'click', 'buy', 'deny', 'levelup', 'end']) this.load(n)
    this.load('menu').then(() => this.music(this.wanted))
    this.load('run').then(() => this.music(this.wanted))
  },
  async load(name) {
    try {
      const data = await (await fetch(`audio/${name}.ogg`)).arrayBuffer()
      this.buffers[name] = await this.ctx.decodeAudioData(data)
    } catch (error) { console.warn('sound', name, error) }
  },
  play(name, volume = 1, rate = 1) {
    if (RENDER) soundLog.push({ t: renderClock, name, volume, rate })
    if (!this.ctx || !this.buffers[name]) return
    const source = this.ctx.createBufferSource(); source.buffer = this.buffers[name]; source.playbackRate.value = rate
    const gain = this.ctx.createGain(); gain.gain.value = volume
    source.connect(gain); gain.connect(this.sfxGain); source.start()
  },
  music(name, rate = 1) {
    this.wanted = name
    if (!this.ctx || !this.buffers[name]) return
    if (this.current === name) { if (this.source) this.source.playbackRate.value = rate; return }
    this.source?.stop()
    const source = this.ctx.createBufferSource(); source.buffer = this.buffers[name]; source.loop = true; source.playbackRate.value = rate
    source.connect(this.musicGain); source.start(); this.source = source; this.current = name
  },
}
function applyVolume() {
  if (!audio.ctx) return
  const silent = !platform.audioOn || platform.adOpen || platform.paused || document.hidden
  audio.master.gain.value = silent ? 0 : 1
  audio.musicGain.gain.value = save.music * 0.55
  audio.sfxGain.gain.value = save.sfx
}
document.addEventListener('visibilitychange', () => { applyVolume(); if (document.hidden) pauseRun() })

// ---------------------------------------------------------------- towns
const THEMES = [
  { grass: '#7fd65a', grass2: '#6fca4f', road: '#6b6f80', walk: '#d9d2c0', sky: 0x8fe0ff, fog: 0xbfeeff, leaf: [0x3fb54a, 0xf2a33a, 0xe86a3a], walls: [0xfff0d6, 0xffd6a5, 0xcfe8ff, 0xffc2d4, 0xd6f5c9], roofs: [0xe2574c, 0x4a7be0, 0xf0a030], goal: 8000 },
  { grass: '#f3dc9c', grass2: '#ecd28c', road: '#7d8aa0', walk: '#fff1c9', sky: 0x62d4ff, fog: 0xc8f4ff, leaf: [0x2fc58f, 0x46d19a, 0xf7c548], walls: [0xffffff, 0xbdf2ff, 0xffe29a, 0xffc7b8, 0xd1f7e6], roofs: [0x18a9c9, 0xff7a59, 0xffc145], goal: 40000 },
  { grass: '#e9f4ff', grass2: '#dcecfb', road: '#8d9ab5', walk: '#ffffff', sky: 0xa8d6ff, fog: 0xe6f4ff, leaf: [0x2e8b7a, 0xffffff, 0x4aa7a0], walls: [0xf5e6d3, 0xb78e6a, 0xd8e6f5, 0xe7bcbc, 0xc8d8c8], roofs: [0xffffff, 0xeef6ff, 0xdfeaf6], goal: 90000 },
  { grass: '#ffc4e1', grass2: '#ffb3d9', road: '#a86fd1', walk: '#fff0a8', sky: 0xffd1f0, fog: 0xffe8f7, leaf: [0xff5da2, 0x6fe3d2, 0xffd23f], walls: [0xfff4fb, 0xc7f5ee, 0xfff2a8, 0xffb8d9, 0xd9c7ff], roofs: [0xff4f8b, 0x7b4dff, 0x2ee6a6], goal: 150000 },
  { grass: '#2d2653', grass2: '#352d62', road: '#191436', walk: '#4c4285', sky: 0x1a1140, fog: 0x2b1f63, leaf: [0x2ee6a6, 0xff4fd8, 0x4fc3ff], walls: [0x4fc3ff, 0xff4fd8, 0x7b4dff, 0x2ee6a6, 0xffd23f], roofs: [0xffffff, 0xffd23f, 0x2ee6a6], goal: 220000 },
]
const SKINS = [
  { color: 0x7b4dff, cost: 0 }, { color: 0xff4f8b, cost: 800 }, { color: 0x18c8a0, cost: 1500 },
  { color: 0xff9f1c, cost: 3000 }, { color: 0x3aa0ff, cost: 6000 }, { color: 0xffd23f, cost: 12000 },
]
const UPGRADES = [
  { id: 'time', name: 'upTime', desc: 'upTimeD', base: 60, grow: 1.5, max: 15 },
  { id: 'speed', name: 'upSpeed', desc: 'upSpeedD', base: 50, grow: 1.45, max: 15 },
  { id: 'start', name: 'upStart', desc: 'upStartD', base: 80, grow: 1.55, max: 15 },
  { id: 'magnet', name: 'upMagnet', desc: 'upMagnetD', base: 70, grow: 1.5, max: 15 },
  { id: 'gold', name: 'upGold', desc: 'upGoldD', base: 100, grow: 1.6, max: 15 },
]
const upCost = (u) => Math.round(u.base * Math.pow(u.grow, save.up[u.id]))

// ---------------------------------------------------------------- 3D models (flat colours, merged, one draw call each)
const COLOR = new THREE.Color()
function paint(geometry, color) {
  const g = geometry.index ? geometry.toNonIndexed() : geometry
  COLOR.set(color)
  const count = g.attributes.position.count
  const colors = new Float32Array(count * 3)
  for (let i = 0; i < count; i++) { colors[i * 3] = COLOR.r; colors[i * 3 + 1] = COLOR.g; colors[i * 3 + 2] = COLOR.b }
  g.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  g.deleteAttribute('uv')
  return g
}
function merge(parts) {
  let total = 0
  for (const p of parts) total += p.attributes.position.count
  const pos = new Float32Array(total * 3), nor = new Float32Array(total * 3), col = new Float32Array(total * 3)
  let at = 0
  for (const p of parts) {
    pos.set(p.attributes.position.array, at * 3); nor.set(p.attributes.normal.array, at * 3); col.set(p.attributes.color.array, at * 3)
    at += p.attributes.position.count
  }
  const out = new THREE.BufferGeometry()
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  out.setAttribute('normal', new THREE.BufferAttribute(nor, 3))
  out.setAttribute('color', new THREE.BufferAttribute(col, 3))
  return out
}
const box = (w, h, d, c, x = 0, y = h / 2, z = 0) => paint(new THREE.BoxGeometry(w, h, d).translate(x, y, z), c)
const cone = (r, h, c, y = h / 2, seg = 7, x = 0, z = 0) => paint(new THREE.ConeGeometry(r, h, seg).translate(x, y, z), c)
const cyl = (r, h, c, y = h / 2, seg = 8, x = 0, z = 0) => paint(new THREE.CylinderGeometry(r, r, h, seg).translate(x, y, z), c)
const ball = (r, c, y = r, x = 0, z = 0) => paint(new THREE.IcosahedronGeometry(r, 1).translate(x, y, z), c)
function roof(w, h, d, c, y) {
  const g = new THREE.ConeGeometry(Math.SQRT1_2 * Math.max(w, d) * 1.08, h, 4).rotateY(Math.PI / 4).scale(1, 1, d / w).translate(0, y + h / 2, 0)
  return paint(g, c)
}
const GLASS = 0x8fd8ff, DARK = 0x2a2a3a, WHITE = 0xffffff, TINT = 0xffffff

function buildKinds(theme) {
  const leaf = theme.leaf
  const windows = (w, h, d, floors, cols) => {
    const list = []
    for (let f = 0; f < floors; f++) for (let c = 0; c < cols; c++) {
      const x = (c + 0.5) / cols * w - w / 2, y = (f + 0.6) / floors * h
      list.push(box(w / cols * 0.55, h / floors * 0.5, 0.04, GLASS, x, y, d / 2 + 0.01))
      list.push(box(w / cols * 0.55, h / floors * 0.5, 0.04, GLASS, x, y, -d / 2 - 0.01))
    }
    return list
  }
  const K = {
    person: { r: 0.3, tint: true, parts: [cyl(0.17, 0.45, TINT, 0.33, 6), ball(0.15, 0xffd2ad, 0.67)] },
    cone: { r: 0.3, parts: [cone(0.2, 0.5, 0xff7a2e), box(0.4, 0.05, 0.4, 0xff7a2e, 0, 0.025)] },
    hydrant: { r: 0.3, parts: [cyl(0.14, 0.5, 0xe2342d, 0.25, 7), ball(0.15, 0xe2342d, 0.5)] },
    crate: { r: 0.42, parts: [box(0.62, 0.55, 0.62, 0xc78a4a)] },
    bush: { r: 0.55, parts: [ball(0.5, leaf[0], 0.42), ball(0.32, leaf[2], 0.34, 0.35, 0.1)] },
    bench: { r: 0.85, parts: [box(1.4, 0.1, 0.45, 0xb0763e, 0, 0.42), box(1.4, 0.45, 0.08, 0xb0763e, 0, 0.72, -0.2), box(0.1, 0.42, 0.4, DARK, -0.55, 0.21), box(0.1, 0.42, 0.4, DARK, 0.55, 0.21)] },
    lamp: { r: 0.8, parts: [cyl(0.08, 2.4, DARK, 1.2, 6), ball(0.26, 0xfff0a8, 2.45)] },
    mail: { r: 0.65, parts: [box(0.6, 0.9, 0.5, 0x3a78e0, 0, 0.75), box(0.1, 0.35, 0.1, DARK, 0, 0.17)] },
    tree: { r: 1.05, tint: true, parts: [cyl(0.18, 0.9, 0x8a5a33, 0.45, 6), cone(1, 1.5, TINT, 1.5), cone(0.72, 1.2, TINT, 2.3)] },
    car: { r: 1.45, tint: true, parts: [box(2.2, 0.55, 1.1, TINT, 0, 0.5), box(1.2, 0.45, 0.98, GLASS, -0.1, 1), box(0.5, 0.5, 1.16, DARK, -0.7, 0.26), box(0.5, 0.5, 1.16, DARK, 0.7, 0.26)] },
    bigTree: { r: 2, tint: true, parts: [cyl(0.34, 1.8, 0x8a5a33, 0.9, 7), ball(1.75, TINT, 3), ball(1.1, TINT, 3.4, 1.2, 0.4)] },
    kiosk: { r: 2.1, parts: [box(2.4, 1.8, 2.4, theme.walls[1]), box(3, 0.25, 3, theme.roofs[0], 0, 1.95), box(1.4, 0.8, 0.05, GLASS, 0, 1, 1.22)] },
    bus: { r: 3, tint: true, parts: [box(5, 1.5, 1.7, TINT, 0, 1.2), box(4.5, 0.55, 1.75, GLASS, 0, 1.5), box(0.8, 0.6, 1.85, DARK, -1.6, 0.3), box(0.8, 0.6, 1.85, DARK, 1.6, 0.3)] },
    cottage: { r: 3.2, tint: true, parts: [box(4, 2.6, 3.4, TINT), roof(4, 1.9, 3.4, theme.roofs[0], 2.6), box(0.8, 1.4, 0.05, 0x8a5a33, 0, 0.7, 1.72), ...windows(4, 2.2, 3.4, 1, 3)] },
    house: { r: 4.4, tint: true, parts: [box(5.6, 4.6, 4.6, TINT), roof(5.6, 2.4, 4.6, theme.roofs[1], 4.6), box(1, 1.8, 0.05, 0x8a5a33, 0, 0.9, 2.32), ...windows(5.6, 4.2, 4.6, 2, 3)] },
    shop: { r: 5.2, tint: true, parts: [box(7.4, 4.2, 5.6, TINT), box(7.8, 0.5, 6.2, theme.roofs[2], 0, 4.4), box(6, 1.6, 0.05, GLASS, 0, 1.3, 2.82), box(6.4, 0.5, 0.8, theme.roofs[0], 0, 2.6, 3.1)] },
    tower: { r: 6.6, tint: true, parts: [box(8.4, 13, 8.4, TINT), box(5, 2, 5, theme.roofs[1], 0, 14), ...windows(8.4, 12, 8.4, 6, 4)] },
    sky: { r: 9, tint: true, parts: [box(11.5, 26, 11.5, TINT), box(7.4, 6, 7.4, TINT, 0, 29), cyl(0.3, 5, DARK, 34.5), ...windows(11.5, 25, 11.5, 11, 5)] },
    castle: { r: 13.5, parts: [box(18, 14, 18, theme.walls[0]), box(5, 22, 5, theme.walls[2], -8, 11, -8), box(5, 22, 5, theme.walls[2], 8, 11, -8), box(5, 22, 5, theme.walls[2], -8, 11, 8), box(5, 22, 5, theme.walls[2], 8, 11, 8), cone(4, 7, theme.roofs[0], 25.5, 6, -8, -8), cone(4, 7, theme.roofs[0], 25.5, 6, 8, -8), cone(4, 7, theme.roofs[0], 25.5, 6, -8, 8), cone(4, 7, theme.roofs[0], 25.5, 6, 8, 8), box(10, 14, 10, theme.walls[3], 0, 21), cone(7.5, 11, theme.roofs[1], 33.5, 6)] },
  }
  return K
}

// ---------------------------------------------------------------- scene
const canvas = $('view')
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, stencil: true, powerPreference: 'high-performance' })
renderer.localClippingEnabled = true
const scene = new THREE.Scene()
const camera = new THREE.PerspectiveCamera(42, 1, 1, 900)
scene.add(new THREE.HemisphereLight(0xffffff, 0x9a8fc0, 1.9))
const sun = new THREE.DirectionalLight(0xfff2d8, 1.5); sun.position.set(-0.5, 1, 0.7); scene.add(sun)

const PITCH = 30, BLOCK = 23, GRID = 7, WORLD = (GRID * PITCH) / 2 + 3
const world = { ground: null, meshes: {}, items: [], movers: [], hash: new Map(), shadow: null, kinds: null, total: 0 }
const CELL = 10
const hashKey = (x, z) => (Math.floor((x + 400) / CELL) << 10) | Math.floor((z + 400) / CELL)

function groundTexture(theme) {
  const size = 2048, c = document.createElement('canvas'); c.width = c.height = size
  const g = c.getContext('2d'), s = size / (WORLD * 2 + 40), W = (x) => (x + WORLD + 20) * s
  g.fillStyle = theme.grass; g.fillRect(0, 0, size, size)
  g.fillStyle = theme.grass2
  for (let i = 0; i < 900; i++) { g.beginPath(); g.ellipse(Math.random() * size, Math.random() * size, 12 + Math.random() * 22, 6 + Math.random() * 12, 0, 0, 7); g.fill() }
  const half = ((GRID - 1) / 2) * PITCH
  const line = (x, z, w, h, color) => { g.fillStyle = color; g.fillRect(W(x), W(z), w * s, h * s) }
  for (let i = 0; i <= GRID; i++) {
    const at = -half - PITCH / 2 + i * PITCH
    line(at - 4, -WORLD, 8, WORLD * 2, theme.walk); line(-WORLD, at - 4, WORLD * 2, 8, theme.walk)
  }
  for (let i = 0; i <= GRID; i++) {
    const at = -half - PITCH / 2 + i * PITCH
    line(at - 3, -WORLD, 6, WORLD * 2, theme.road); line(-WORLD, at - 3, WORLD * 2, 6, theme.road)
  }
  for (let i = 0; i <= GRID; i++) {
    const at = -half - PITCH / 2 + i * PITCH
    for (let d = -WORLD; d < WORLD; d += 5) {
      if (Math.abs(((d + half + PITCH / 2) % PITCH + PITCH) % PITCH) < 4 || Math.abs(((d + half + PITCH / 2) % PITCH + PITCH) % PITCH) > PITCH - 4) continue
      line(at - 0.13, d, 0.26, 2.2, '#ffe9a8'); line(d, at - 0.13, 2.2, 0.26, '#ffe9a8')
    }
  }
  const texture = new THREE.CanvasTexture(c)
  texture.colorSpace = THREE.SRGBColorSpace; texture.anisotropy = 4
  return texture
}

function clearWorld() {
  for (const name in world.meshes) { const m = world.meshes[name]; scene.remove(m); m.geometry.dispose() }
  if (world.ground) { scene.remove(world.ground); world.ground.material.map.dispose() }
  if (world.shadow) scene.remove(world.shadow, world.moving)
  if (world.far) scene.remove(world.far)
  world.meshes = {}; world.items = []; world.movers = []; world.hash.clear()
}

const dummy = new THREE.Object3D()
const SOLID = new THREE.MeshLambertMaterial({ vertexColors: true })
const PEOPLE = [0xff5d5d, 0x4a90e2, 0xffc145, 0x34c759, 0xb06cff, 0xff8fb1]
function layout(theme) {
  // Everything that will stand in the town, as plain records. Meshes are sized from this list.
  const list = [], walls = theme.walls, leaf = theme.leaf
  const add = (kind, x, z, rot = rnd(0, 6.28), color = null, s = 1, still = false) => list.push({ kind, x, z, rot, color, s, still })
  const half = ((GRID - 1) / 2) * PITCH
  for (let a = 0; a < GRID; a++) for (let b = 0; b < GRID; b++) {
    const cx = -half + a * PITCH, cz = -half + b * PITCH, dist = Math.max(Math.abs(a - 3), Math.abs(b - 3))
    if (dist === 0) { add('castle', cx, cz, 0); for (const q of [[-9, -9], [9, 9], [-9, 9], [9, -9]]) add('bench', cx + q[0] * 1.15, cz + q[1] * 1.15); continue }
    const kind = dist === 1 ? pick(['down', 'down', 'tall']) : dist === 2 ? pick(['tall', 'shop', 'home', 'park']) : pick(['home', 'home', 'park'])
    if (kind === 'down') { add('sky', cx, cz, 0, pick(walls)); for (let i = 0; i < 4; i++) add('hydrant', cx + rnd(-10, 10), cz + rnd(-10, 10)) }
    if (kind === 'tall') { for (const q of [[-5.5, -5.5], [5.5, 5.5]]) add('tower', cx + q[0], cz + q[1], 0, pick(walls)); for (const q of [[-6, 6], [6, -6]]) add('shop', cx + q[0], cz + q[1], 0, pick(walls)) }
    if (kind === 'shop') { for (const q of [[-6, -6], [6, -6], [-6, 6], [6, 6]]) add(Math.random() < 0.3 ? 'kiosk' : 'shop', cx + q[0], cz + q[1], 0, pick(walls)) }
    if (kind === 'home') {
      for (const q of [[-6.5, -6.5], [6.5, -6.5], [-6.5, 6.5], [6.5, 6.5]]) add(Math.random() < 0.55 ? 'house' : 'cottage', cx + q[0], cz + q[1], pick([0, 1.57, 3.14, 4.71]), pick(walls))
      for (let i = 0; i < 6; i++) add('bush', cx + rnd(-2, 2), cz + rnd(-10, 10))
      add('tree', cx, cz, 0, pick(leaf))
    }
    if (kind === 'park') {
      for (let i = 0; i < 12; i++) add('tree', cx + rnd(-10, 10), cz + rnd(-10, 10), rnd(0, 6), pick(leaf))
      for (let i = 0; i < 3; i++) add('bigTree', cx + rnd(-8, 8), cz + rnd(-8, 8), rnd(0, 6), pick(leaf))
      for (let i = 0; i < 6; i++) add('bench', cx + rnd(-10, 10), cz + rnd(-10, 10))
      for (let i = 0; i < 8; i++) add('bush', cx + rnd(-10, 10), cz + rnd(-10, 10))
      add('kiosk', cx + rnd(-5, 5), cz + rnd(-5, 5), 0)
    }
  }
  // Pavement life: the small things that make the first ten seconds feel like a feast.
  for (let i = 0; i <= GRID; i++) {
    const at = -half - PITCH / 2 + i * PITCH
    for (let d = -WORLD + 2; d < WORLD - 2; d += 2.1) {
      const side = Math.random() < 0.5 ? -1 : 1, sx = at + side * 3.5
      const small = pick(['cone', 'hydrant', 'crate', 'mail', 'lamp', 'bush', 'crate'])
      if (Math.random() < 0.7) add(small, sx, d)
      if (Math.random() < 0.7) add(small === 'lamp' ? 'cone' : small, d, sx)
      if (Math.random() < 0.35) add('person', sx + rnd(-0.6, 0.6), d + rnd(-0.8, 0.8), rnd(0, 6), pick(PEOPLE), 1, true)
      if (Math.random() < 0.35) add('person', d + rnd(-0.8, 0.8), sx + rnd(-0.6, 0.6), rnd(0, 6), pick(PEOPLE), 1, true)
    }
  }
  for (let i = 0; i < 260; i++) add('person', 0, 0, 0, pick(PEOPLE))
  for (let i = 0; i < 90; i++) add('car', 0, 0, 0, pick([0xff4d4d, 0xffd23f, 0x4a90e2, 0xffffff, 0x2ee6a6, 0xff8a3d]))
  for (let i = 0; i < 16; i++) add('bus', 0, 0, 0, pick([0xffc145, 0xff6b6b, 0x4fc3ff]))
  return list
}

function buildWorld(index) {
  clearWorld()
  const theme = THEMES[index]
  scene.background = new THREE.Color(theme.sky)
  scene.fog = new THREE.Fog(theme.fog, 140, 420)
  const span = WORLD * 2 + 40
  world.ground = new THREE.Mesh(new THREE.PlaneGeometry(span, span).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: groundTexture(theme), depthWrite: false }))
  world.ground.renderOrder = -2; scene.add(world.ground)
  world.far = new THREE.Mesh(new THREE.PlaneGeometry(1400, 1400).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: theme.grass, depthWrite: false }))
  world.far.position.y = -0.02; world.far.renderOrder = -3; scene.add(world.far)
  const kinds = buildKinds(theme); world.kinds = kinds
  const records = layout(theme), counts = {}
  for (const r of records) counts[r.kind] = (counts[r.kind] || 0) + 1
  for (const name in counts) {
    const geometry = merge(kinds[name].parts)
    const mesh = new THREE.InstancedMesh(geometry, SOLID, counts[name])
    mesh.frustumCulled = false; mesh.count = counts[name]
    kinds[name].geometry = geometry; kinds[name].next = 0
    world.meshes[name] = mesh; scene.add(mesh)
  }
  const half = ((GRID - 1) / 2) * PITCH
  const shadowGeometry = new THREE.CircleGeometry(1, 12).rotateX(-Math.PI / 2)
  const shadowMaterial = new THREE.MeshBasicMaterial({ color: 0x241a4a, transparent: true, opacity: 0.2, depthWrite: false })
  world.shadow = new THREE.InstancedMesh(shadowGeometry, shadowMaterial, records.length)
  world.moving = new THREE.InstancedMesh(shadowGeometry, shadowMaterial, records.length)
  for (const m of [world.shadow, world.moving]) { m.frustumCulled = false; m.renderOrder = -1; scene.add(m) }
  let staticShadows = 0, movingShadows = 0
  records.forEach((record, id) => {
    const kind = kinds[record.kind]
    const item = { ...record, id, r: kind.r, index: kind.next++, alive: true, wobble: 0, pts: Math.round(10 * kind.r * kind.r), mass: 0.12 + 0.12 * kind.r * kind.r }
    if (record.color !== null && kind.tint) world.meshes[record.kind].setColorAt(item.index, COLOR.set(record.color))
    else if (kind.tint) world.meshes[record.kind].setColorAt(item.index, COLOR.set(WHITE))
    if (!record.still && (record.kind === 'person' || record.kind === 'car' || record.kind === 'bus')) {
      const fast = record.kind !== 'person'
      item.mover = true; item.sid = movingShadows++
      item.axis = Math.random() < 0.5
      item.lane = -half - PITCH / 2 + Math.floor(rnd(0, GRID + 1)) * PITCH + (fast ? pick([-1.5, 1.5]) : pick([-3.5, 3.5]))
      item.dir = pick([-1, 1])
      item.along = rnd(-WORLD, WORLD)
      item.speed = record.kind === 'person' ? rnd(1, 2) : rnd(5, 8)
      world.movers.push(item); placeMover(item)
    } else {
      item.sid = staticShadows++
      const key = hashKey(item.x, item.z)
      if (!world.hash.has(key)) world.hash.set(key, [])
      world.hash.get(key).push(item)
      place(item)
    }
    world.items.push(item)
  })
  world.total = world.items.reduce((sum, item) => sum + item.pts, 0)
  for (const name in world.meshes) { world.meshes[name].instanceMatrix.needsUpdate = true; if (world.meshes[name].instanceColor) world.meshes[name].instanceColor.needsUpdate = true }
  world.shadow.count = staticShadows; world.moving.count = movingShadows
  world.shadow.instanceMatrix.needsUpdate = true; world.moving.instanceMatrix.needsUpdate = true
}
function place(item, tilt = 0, tiltX = 0, tiltZ = 0) {
  dummy.position.set(item.x, 0, item.z)
  dummy.rotation.set(tiltZ * tilt, item.rot, -tiltX * tilt)
  dummy.scale.setScalar(1); dummy.updateMatrix()
  world.meshes[item.kind].setMatrixAt(item.index, dummy.matrix)
  dummy.rotation.set(0, 0, 0); dummy.position.y = 0.02; dummy.scale.set(item.r * 0.8, 1, item.r * 0.8); dummy.updateMatrix()
  const shadows = item.mover ? world.moving : world.shadow
  shadows.setMatrixAt(item.sid, dummy.matrix)
}
function placeMover(item) {
  if (item.axis) { item.x = item.lane; item.z = item.along; item.rot = item.dir > 0 ? -Math.PI / 2 : Math.PI / 2 }
  else { item.x = item.along; item.z = item.lane; item.rot = item.dir > 0 ? 0 : Math.PI }
  place(item)
}
function hide(item) {
  dummy.position.set(0, -500, 0); dummy.rotation.set(0, 0, 0); dummy.scale.setScalar(0); dummy.updateMatrix()
  world.meshes[item.kind].setMatrixAt(item.index, dummy.matrix); world.meshes[item.kind].instanceMatrix.needsUpdate = true
  const list = item.mover ? world.moving : world.shadow
  list.setMatrixAt(item.sid, dummy.matrix); list.instanceMatrix.needsUpdate = true
}

// ---------------------------------------------------------------- the hole
const hole = { x: 0, z: 0, r: 1, shown: 1, vx: 0, vz: 0, chomp: 0, group: new THREE.Group() }
function holeTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 256
  const g = c.getContext('2d'), grad = g.createRadialGradient(128, 128, 20, 128, 128, 128)
  grad.addColorStop(0, '#05030c'); grad.addColorStop(0.7, '#120a24'); grad.addColorStop(1, '#2a1a4c')
  g.fillStyle = grad; g.beginPath(); g.arc(128, 128, 127, 0, 7); g.fill()
  const texture = new THREE.CanvasTexture(c); texture.colorSpace = THREE.SRGBColorSpace
  return texture
}
const disc = new THREE.Mesh(new THREE.CircleGeometry(1, 48).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: holeTexture(), transparent: false, depthWrite: false, stencilWrite: true, stencilRef: 1, stencilFunc: THREE.AlwaysStencilFunc, stencilZPass: THREE.ReplaceStencilOp }))
disc.position.y = 0.04; disc.renderOrder = -1
const rimMaterial = new THREE.MeshLambertMaterial({ color: SKINS[0].color })
const rim = new THREE.Mesh(new THREE.TorusGeometry(1.02, 0.09, 8, 48).rotateX(Math.PI / 2), rimMaterial)
rim.position.y = 0.06
const eyes = new THREE.Group()
const eyeWhite = new THREE.MeshBasicMaterial({ color: 0xffffff }), eyeBlack = new THREE.MeshBasicMaterial({ color: 0x15102b })
const pupils = []
for (const side of [-1, 1]) {
  const eye = new THREE.Mesh(new THREE.SphereGeometry(0.26, 16, 12), eyeWhite); eye.position.set(side * 0.3, 0.3, -1); eye.scale.set(1, 1.2, 0.7)
  const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 8), eyeBlack); pupil.position.set(side * 0.3, 0.3, -0.8)
  eyes.add(eye, pupil); pupils.push(pupil)
}
hole.group.add(disc, rim, eyes); scene.add(hole.group)

// Things in mid-swallow: above the ground they are drawn normally, below it only inside the hole.
const CLIP_UP = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), CLIP_DOWN = new THREE.Plane(new THREE.Vector3(0, -1, 0), 0)
const fallers = []
for (let i = 0; i < 26; i++) {
  const up = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshLambertMaterial({ vertexColors: true, clippingPlanes: [CLIP_UP] }))
  const down = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshLambertMaterial({ vertexColors: true, clippingPlanes: [CLIP_DOWN], stencilWrite: true, stencilRef: 1, stencilFunc: THREE.EqualStencilFunc, stencilZPass: THREE.KeepStencilOp }))
  up.visible = down.visible = false; up.frustumCulled = down.frustumCulled = false
  scene.add(up, down); fallers.push({ up, down, item: null, age: 0, life: 0.5 })
}
const fall = { vector: new THREE.Vector3() }

// Pop of colour when something big goes down.
const SPARKS = 220
const sparkMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(0.3, 0.3, 0.3), new THREE.MeshBasicMaterial({ color: 0xffffff }), SPARKS)
sparkMesh.frustumCulled = false; scene.add(sparkMesh)
const sparks = Array.from({ length: SPARKS }, () => ({ life: 0, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, s: 1 }))
let sparkAt = 0
for (let i = 0; i < SPARKS; i++) { sparkMesh.setColorAt(i, COLOR.set(0xffffff)); dummy.position.set(0, -500, 0); dummy.scale.setScalar(0); dummy.updateMatrix(); sparkMesh.setMatrixAt(i, dummy.matrix) }
function burst(x, z, count, size, color) {
  for (let i = 0; i < count; i++) {
    const s = sparks[sparkAt], a = rnd(0, 6.28), v = rnd(4, 11) * size
    s.life = rnd(0.4, 0.8); s.x = x; s.y = 0.4; s.z = z; s.vx = Math.cos(a) * v; s.vz = Math.sin(a) * v; s.vy = rnd(6, 15) * size; s.s = rnd(0.6, 1.5) * size
    sparkMesh.setColorAt(sparkAt, COLOR.set(color ?? pick([0xffd23f, 0xff4f8b, 0x2ee6a6, 0x7b4dff, 0xffffff])))
    sparkAt = (sparkAt + 1) % SPARKS
  }
  sparkMesh.instanceColor.needsUpdate = true
}
const pulse = new THREE.Mesh(new THREE.RingGeometry(0.92, 1, 48).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false }))
pulse.position.y = 0.08; scene.add(pulse)
let pulseAge = 9

// ---------------------------------------------------------------- run
const game = { state: 'load', time: 60, total: 60, score: 0, eaten: 0, combo: 0, comboTime: 0, frenzy: false, finished: false, seenHint: false, gold: 0, sizeShown: 1, shake: 0, startR: 1, firstAction: false, doubled: false }
const input = { x: 0, z: 0, active: false, id: null, ox: 0, oy: 0, mouse: false, keys: new Set() }
const baseSpeed = () => 7.5 + save.up.speed * 0.6
const pullRange = () => 0.3 + save.up.magnet * 0.14
const startRadius = () => 1 + save.up.start * 0.28

function resetRun() {
  buildWorld(save.town)
  hole.x = -PITCH * 2.5; hole.z = PITCH * 2.5; hole.vx = hole.vz = 0
  game.startR = startRadius(); hole.r = hole.shown = game.startR
  game.total = game.time = 60 + save.up.time * 3
  Object.assign(game, { score: 0, eaten: 0, combo: 0, comboTime: 0, frenzy: false, finished: false, gold: 0, sizeShown: 1, shake: 0, firstAction: false, doubled: false })
  fallers.forEach(clearFaller)
}
function clearFaller(f) { f.item = null; f.up.visible = f.down.visible = false }
const size = () => 1 + Math.floor((hole.r - game.startR) / 0.8)

function startRun() {
  audio.unlock(); audio.play('click')
  resetRun()
  show('hud'); hide_('title'); hide_('result'); hide_('pause'); hide_('panel')
  game.state = 'run'
  audio.music('run')
  platform.message('gameplay_started')
  if (!game.seenHint && save.runs === 0) { setHint(navigator.maxTouchPoints > 0 ? t('drag') : t('mouse')) }
}
function setHint(text) { $('hint').textContent = text; $('hint').classList.toggle('on', !!text) }
function pauseRun() { if (game.state !== 'run') return; game.state = 'pause'; show('pause'); platform.message('gameplay_stopped') }
function resumeRun() { if (game.state !== 'pause') return; audio.unlock(); hide_('pause'); game.state = 'run'; last = performance.now(); platform.message('gameplay_started') }

function endRun(cleared) {
  if (game.finished) return
  game.finished = true; game.state = 'over'
  platform.message('gameplay_stopped')
  audio.play('end'); audio.music('menu')
  const town = save.town, ratio = game.eaten / world.total, goal = THEMES[town].goal
  const stars = (game.score >= goal * 0.5 ? 1 : 0) + (game.score >= goal ? 1 : 0) + (game.score >= goal * 1.8 ? 1 : 0)
  const bonus = 1 + save.up.gold * 0.1
  game.gold = Math.round((game.score / 40 + 15 + stars * 30) * bonus)
  save.gold += game.gold; save.runs++
  save.stars[town] = Math.max(save.stars[town], stars)
  const record = game.score > save.best[town]; save.best[town] = Math.max(save.best[town], Math.round(game.score))
  writeSave()
  $('resTitle').textContent = cleared ? t('cleared') : t('timeUp')
  $('resStars').innerHTML = [0, 1, 2].map((i) => `<i class="${i < stars ? 'on' : ''}" style="animation-delay:${i * 0.18}s"></i>`).join('')
  $('resEatenLabel').textContent = t('eaten'); $('resEaten').textContent = `${Math.round(ratio * 100)}%`
  $('resBestLabel').textContent = t('best'); $('resBest').textContent = Math.round(save.best[town]).toLocaleString('en-US')
  $('resGold').textContent = `+${game.gold}`
  $('doubleBtn').textContent = t('double'); $('doubleBtn').disabled = false
  $('againBtn').textContent = t('again'); $('homeBtn').textContent = t('home')
  $('doubleBtn').classList.toggle('hide', !platform.ready)
  renderUpgrades($('resUp'))
  $('againBtn').classList.add('pulse')
  setTimeout(() => { show('result'); hide_('hud') }, 700)
  if (save.runs >= 2) setTimeout(() => platform.interstitial(), 750)
  window.__runs = window.__runs || []; window.__runs.push({ score: Math.round(game.score), eaten: Math.round(ratio * 100), r: +hole.r.toFixed(1), stars, gold: game.gold })
}

function swallow(item, fromX, fromZ) {
  item.alive = false; hide(item)
  const f = fallers.find((x) => !x.item)
  if (f) {
    const kind = world.kinds[item.kind]
    f.item = item; f.age = 0; f.life = clamp(0.32 + item.r * 0.06, 0.32, 0.8)
    f.up.geometry = f.down.geometry = kind.geometry
    const tinted = kind.tint && item.color !== null
    f.up.material.color.set(tinted ? item.color : WHITE); f.down.material.color.set(tinted ? item.color : WHITE)
    f.up.visible = f.down.visible = true
    f.sx = item.x; f.sz = item.z
    f.ax = hole.x - item.x; f.az = hole.z - item.z
    const len = Math.hypot(f.ax, f.az) || 1; f.ax /= len; f.az /= len
  }
  game.comboTime = 1.4; game.combo++
  const mult = 1 + Math.min(game.combo, 60) / 12
  const gain = item.pts * mult * (game.frenzy ? 2 : 1)
  game.score += gain; game.eaten += item.pts
  hole.r = Math.sqrt(hole.r * hole.r + item.mass * GROW)
  hole.chomp = Math.min(1, hole.chomp + 0.25 + item.r * 0.1)
  if (item.r >= 3) {
    floatText(`+${Math.round(gain)}`, item.x, item.z, item.r >= 6)
    burst(item.x, item.z, Math.min(40, 8 + item.r * 4), clamp(item.r / 5, 0.6, 2.4), item.color)
    game.shake = Math.max(game.shake, clamp(item.r * 0.07, 0.15, 0.9))
    audio.play(item.r >= 6 ? 'huge' : 'big', 0.9, rnd(0.95, 1.1))
  } else if (item.r >= 1.4) { audio.play('crunch', 0.7, rnd(0.9, 1.2)); burst(item.x, item.z, 4, 0.6, item.color) }
  else audio.play(Math.random() < 0.5 ? 'gulp1' : 'gulp2', 0.55, clamp(0.85 + game.combo * 0.012, 0.85, 1.6))
}
const GROW = 0.42

function floatText(text, x, z, big) {
  fall.vector.set(x, 1, z).project(camera)
  const span = document.createElement('span')
  span.textContent = text
  span.style.left = `${(fall.vector.x * 0.5 + 0.5) * 100}%`; span.style.top = `${(-fall.vector.y * 0.5 + 0.5) * 100}%`
  if (big) span.style.fontSize = '34px'
  $('float').appendChild(span); setTimeout(() => span.remove(), 800)
}
function banner(text) { const b = $('banner'); b.textContent = text; b.classList.remove('on'); void b.offsetWidth; b.classList.add('on') }

function steer(dt) {
  let dx = 0, dz = 0
  if (BOT) { const target = botTarget(); dx = target.x; dz = target.z }
  else {
    const k = input.keys
    if (k.has('ArrowLeft') || k.has('KeyA')) dx -= 1
    if (k.has('ArrowRight') || k.has('KeyD')) dx += 1
    if (k.has('ArrowUp') || k.has('KeyW')) dz -= 1
    if (k.has('ArrowDown') || k.has('KeyS')) dz += 1
    if (!dx && !dz && input.active) { dx = input.x; dz = input.z }
  }
  const len = Math.hypot(dx, dz)
  if (len > 1) { dx /= len; dz /= len }
  if (len > 0.02 && !game.firstAction) { game.firstAction = true; game.seenHint = true; setTimeout(() => setHint(''), 900) }
  const speed = (baseSpeed() + Math.sqrt(hole.r) * 2.2) * (game.frenzy ? 1.3 : 1)
  hole.vx = lerp(hole.vx, dx * speed, clamp(dt * 12, 0, 1)); hole.vz = lerp(hole.vz, dz * speed, clamp(dt * 12, 0, 1))
  const edge = WORLD + 6
  hole.x = clamp(hole.x + hole.vx * dt, -edge, edge); hole.z = clamp(hole.z + hole.vz * dt, -edge, edge)
}

const botState = { x: 0, z: 0, wait: 0 }
function botTarget() {
  botState.wait -= 1 / 60
  if (botState.wait <= 0) {
    botState.wait = 0.35; let best = null, score = -1
    for (const item of world.items) {
      if (!item.alive || item.r >= hole.r * 0.96) continue
      const d = Math.hypot(item.x - hole.x, item.z - hole.z), s = item.pts * (item.kind === 'castle' ? 50 : 1) / (d + 4)
      if (s > score) { score = s; best = item }
    }
    if (best) { botState.x = best.x; botState.z = best.z }
  }
  return { x: (botState.x - hole.x) / 3, z: (botState.z - hole.z) / 3 }
}

function eat(item, dt) {
  const dx = hole.x - item.x, dz = hole.z - item.z, d = Math.hypot(dx, dz), R = hole.r
  const reach = R + item.r * 0.1
  if (d < R - item.r * 0.15 && item.r < R * 0.98) { swallow(item); return }
  if (item.r < R * 0.98 && d < R * (1 + pullRange())) {
    if (item.axis === undefined) {
      const pull = dt * (2 + save.up.magnet * 0.9) * (1 + (R - item.r) / R)
      item.x += dx / d * pull; item.z += dz / d * pull; place(item); return true
    }
  }
  if (item.r >= R * 0.98 && d < reach + item.r * 0.65 && item.axis === undefined) {
    const shake = Math.sin(performance.now() * 0.03 + item.id) * 0.03 * Math.min(1, R / item.r)
    place(item, shake, dx / (d || 1), dz / (d || 1)); item.wobble = 1; return true
  }
  if (item.wobble) { item.wobble = 0; place(item); return true }
  return false
}

function updateWorld(dt) {
  for (const item of world.movers) {
    if (!item.alive) continue
    item.along += item.dir * item.speed * dt
    if (item.along > WORLD + 4) item.along = -WORLD - 4
    if (item.along < -WORLD - 4) item.along = WORLD + 4
    placeMover(item)
    eat(item, dt)
  }
  for (const name of ['person', 'car', 'bus']) if (world.meshes[name]) world.meshes[name].instanceMatrix.needsUpdate = true
  const reach = hole.r * (1 + pullRange()) + 14, from = Math.floor(-reach / CELL), to = Math.ceil(reach / CELL)
  let touched = false
  for (let a = from; a <= to; a++) for (let b = from; b <= to; b++) {
    const bucket = world.hash.get(hashKey(hole.x + a * CELL, hole.z + b * CELL))
    if (!bucket) continue
    for (const item of bucket) if (item.alive && eat(item, dt)) touched = true
  }
  if (touched) { for (const name in world.meshes) world.meshes[name].instanceMatrix.needsUpdate = true; world.shadow.instanceMatrix.needsUpdate = true }
  world.moving.instanceMatrix.needsUpdate = true
}

function updateFallers(dt) {
  for (const f of fallers) {
    if (!f.item) continue
    f.age += dt
    const p = clamp(f.age / f.life, 0, 1), item = f.item, ease = p * p
    const x = lerp(f.sx, hole.x, ease * 0.92), z = lerp(f.sz, hole.z, ease * 0.92), y = -ease * (item.r * 3 + 3)
    const lean = Math.min(1.4, p * 1.8)
    for (const mesh of [f.up, f.down]) {
      mesh.position.set(x, y, z)
      mesh.rotation.set(f.az * lean, item.rot, -f.ax * lean)
      mesh.scale.setScalar(lerp(1, 0.75, p))
    }
    if (p >= 1) clearFaller(f)
  }
}

function updateSparks(dt) {
  for (let i = 0; i < SPARKS; i++) {
    const s = sparks[i]
    if (s.life <= 0) continue
    s.life -= dt; s.vy -= 26 * dt; s.x += s.vx * dt; s.y += s.vy * dt; s.z += s.vz * dt
    dummy.position.set(s.x, s.life > 0 ? Math.max(0.1, s.y) : -500, s.z); dummy.rotation.set(s.life * 8, s.life * 6, 0); dummy.scale.setScalar(s.life > 0 ? s.s : 0); dummy.updateMatrix()
    sparkMesh.setMatrixAt(i, dummy.matrix)
  }
  sparkMesh.instanceMatrix.needsUpdate = true
}

function updateHud() {
  $('time').textContent = Math.ceil(game.time)
  $('time').classList.toggle('low', game.time <= 10)
  $('score').textContent = Math.round(game.score).toLocaleString('en-US')
  $('sizeText').textContent = `${t('size')} ${size()}`
  const ratio = game.score / (THEMES[save.town].goal * 1.8)
  $('eatenBar').style.width = `${clamp(ratio, 0, 1) * 100}%`
  const goal = THEMES[save.town].goal, next = [goal * 0.5, goal, goal * 1.8].find((v) => v > game.score) ?? goal * 1.8
  $('eatenText').textContent = Math.round(next).toLocaleString('en-US')
  const combo = $('combo')
  if (game.combo >= 8) { const text = `x${(1 + Math.min(game.combo, 60) / 12).toFixed(1)}`; if (combo.textContent !== text) combo.textContent = text; combo.classList.add('on') } else combo.classList.remove('on')
}

function tick(dt) {
  game.time -= dt
  if (!game.frenzy && game.time <= 10) { game.frenzy = true; banner(t('frenzy')); audio.play('levelup'); audio.music('run', 1.14); burst(hole.x, hole.z, 40, 1.4) }
  steer(dt)
  updateWorld(dt)
  game.comboTime -= dt
  if (game.comboTime <= 0) game.combo = 0
  const shown = size()
  if (shown > game.sizeShown) {
    game.sizeShown = shown; banner(t('sizeUp')); audio.play('levelup', 0.8); pulseAge = 0; burst(hole.x, hole.z, 26, clamp(hole.r / 5, 0.8, 2.2))
  }
  const left = world.items.some((item) => item.alive)
  if (game.time <= 0 || !left) endRun(!left)
  updateHud()
}

function updateView(dt, now) {
  hole.shown = lerp(hole.shown, hole.r, clamp(dt * 7, 0, 1))
  hole.chomp = Math.max(0, hole.chomp - dt * 2.5)
  const R = hole.shown * (1 + Math.sin(now * 0.02) * 0.012 * hole.chomp * 3 + hole.chomp * 0.04)
  hole.group.position.set(hole.x, 0, hole.z)
  disc.scale.setScalar(R); rim.scale.set(R, 1, R); rim.position.y = 0.06
  eyes.scale.setScalar(R * 1.3); eyes.position.y = 0
  const blink = Math.sin(now * 0.0013) > 0.985 ? 0.15 : 1
  eyes.scale.y = R * 1.3 * blink * (1 + hole.chomp * 0.25)
  const speed = Math.hypot(hole.vx, hole.vz) || 1
  pupils.forEach((pupil) => { pupil.position.x = pupil.userData.x ??= pupil.position.x; pupil.position.x = pupil.userData.x + hole.vx / speed * 0.09 })
  pulseAge += dt
  if (pulseAge < 0.6) { const p = pulseAge / 0.6; pulse.visible = true; pulse.position.x = hole.x; pulse.position.z = hole.z; pulse.scale.setScalar(R * (1 + p * 2.2)); pulse.material.opacity = 0.8 * (1 - p) } else pulse.visible = false
  const wide = innerWidth / innerHeight
  const height = (20 + hole.shown * 4.9) * (wide < 1 ? 1.3 : 1)
  const back = height * 0.72
  const shake = game.shake * (save.shake ? 1 : 0)
  game.shake = Math.max(0, game.shake - dt * 2.2)
  camera.position.x = lerp(camera.position.x, hole.x, clamp(dt * 6, 0, 1)) + rnd(-shake, shake)
  camera.position.y = lerp(camera.position.y, height, clamp(dt * 3, 0, 1))
  camera.position.z = lerp(camera.position.z, hole.z + back, clamp(dt * 6, 0, 1)) + rnd(-shake, shake)
  camera.lookAt(camera.position.x, 0, camera.position.z - back)
}

// ---------------------------------------------------------------- menus
function show(id) { $(id).classList.remove('hide') }
function hide_(id) { $(id).classList.add('hide') }
function sync() {
  const town = save.town
  $('townName').textContent = TOWN_NAMES[lang][town]
  $('townStars').innerHTML = [0, 1, 2].map((i) => `<i class="${i < save.stars[town] ? 'on' : ''}"></i>`).join('')
  const locked = town > 0 && save.stars[town - 1] < 1
  $('townLock').textContent = locked ? t('locked') : ''
  $('playBtn').disabled = locked; $('playBtn').textContent = t('play')
  $('prevTown').disabled = town === 0; $('nextTown').disabled = town === THEMES.length - 1
  $('upBtn').textContent = t('upgrades'); $('skinBtn').textContent = t('skins')
  $('goldTitle').textContent = save.gold.toLocaleString('en-US'); $('goldPanel').textContent = save.gold.toLocaleString('en-US')
  $('pauseTitle').textContent = t('paused'); $('resumeBtn').textContent = t('resume'); $('quitBtn').textContent = t('quit')
  $('panelClose').textContent = t('close')
  $('playBtn').classList.add('pulse')
  rimMaterial.color.set(SKINS[save.skin].color)
}
function renderUpgrades(host) {
  host.innerHTML = ''
  host.className = 'upgrades'
  for (const u of UPGRADES) {
    const level = save.up[u.id], full = level >= u.max, cost = upCost(u), can = !full && save.gold >= cost
    const b = document.createElement('button')
    b.className = `up${can ? ' can' : ''}`
    b.innerHTML = `<span>${t(u.name)} ${t('lvl')}${level}</span><small>${t(u.desc)}</small><span class="cost">${full ? t('max') : `<i class="coin"></i>${cost.toLocaleString('en-US')}`}</span>`
    b.addEventListener('click', () => {
      if (full) return
      if (save.gold < cost) { audio.play('deny'); return }
      save.gold -= cost; save.up[u.id]++; audio.play('buy'); writeSave(); sync(); renderUpgrades(host)
    })
    host.appendChild(b)
  }
}
function openPanel(kind) {
  audio.unlock(); audio.play('click')
  const body = $('panelBody'); body.innerHTML = ''
  hide_('title'); show('panel'); sync()
  $('panelTitle').textContent = t(kind === 'up' ? 'upgrades' : kind === 'skin' ? 'skins' : 'settings')
  $('goldPanel').parentElement.classList.toggle('hide', kind === 'set')
  if (kind === 'up') renderUpgrades(body)
  if (kind === 'skin') renderSkins(body)
  if (kind === 'set') renderSettings(body)
}
function renderSkins(host) {
  host.innerHTML = ''; host.className = 'skins'
  SKINS.forEach((skin, index) => {
    const have = save.skins.includes(index), b = document.createElement('button')
    b.className = `skin${save.skin === index ? ' on' : ''}`
    const hex = `#${skin.color.toString(16).padStart(6, '0')}`
    b.innerHTML = `<i style="border-color:${hex}"></i><span>${save.skin === index ? t('used') : have ? t('use') : skin.cost.toLocaleString('en-US')}</span>`
    b.addEventListener('click', () => {
      if (!have) {
        if (save.gold < skin.cost) { audio.play('deny'); return }
        save.gold -= skin.cost; save.skins.push(index); audio.play('buy')
      } else audio.play('click')
      save.skin = index; writeSave(); sync(); renderSkins(host)
    })
    host.appendChild(b)
  })
}
function renderSettings(host) {
  host.innerHTML = ''; host.className = ''
  const slider = (label, key) => {
    const row = document.createElement('label'); row.className = 'opt'
    row.innerHTML = `<span>${t(label)}</span><input type="range" min="0" max="1" step="0.05" value="${save[key]}">`
    row.querySelector('input').addEventListener('input', (e) => { save[key] = Number(e.target.value); applyVolume(); writeSave() })
    host.appendChild(row)
  }
  slider('music', 'music'); slider('sfx', 'sfx')
  const toggle = (label, text, press) => {
    const row = document.createElement('div'); row.className = 'opt'
    row.innerHTML = `<span>${t(label)}</span><button class="sub">${text()}</button>`
    row.querySelector('button').addEventListener('click', (e) => { audio.play('click'); press(); e.target.textContent = text(); writeSave() })
    host.appendChild(row)
  }
  toggle('shake', () => t(save.shake ? 'on' : 'off'), () => { save.shake = save.shake ? 0 : 1 })
  toggle('language', () => (lang === 'en' ? 'English' : '한국어'), () => { lang = lang === 'en' ? 'ko' : 'en'; save.lang = lang; sync(); $('panelTitle').textContent = t('settings'); renderSettings(host) })
}
function goHome() {
  hide_('result'); hide_('pause'); hide_('hud'); hide_('panel'); show('title'); sync()
  game.state = 'title'; audio.music('menu')
  buildWorld(save.town); hole.x = PITCH * 0.5; hole.z = PITCH * 1.5; hole.r = 2.4
}

$('playBtn').addEventListener('click', startRun)
$('againBtn').addEventListener('click', startRun)
$('homeBtn').addEventListener('click', () => { audio.play('click'); goHome() })
$('upBtn').addEventListener('click', () => openPanel('up'))
$('skinBtn').addEventListener('click', () => openPanel('skin'))
$('setBtn').addEventListener('click', () => openPanel('set'))
$('panelClose').addEventListener('click', () => { audio.play('click'); hide_('panel'); show('title'); sync() })
$('pauseBtn').addEventListener('click', () => { audio.play('click'); pauseRun() })
$('resumeBtn').addEventListener('click', resumeRun)
$('quitBtn').addEventListener('click', () => { hide_('pause'); game.time = 0; game.state = 'run'; endRun(false) })
$('prevTown').addEventListener('click', () => { audio.unlock(); audio.play('click'); save.town = Math.max(0, save.town - 1); writeSave(); sync(); goHome() })
$('nextTown').addEventListener('click', () => { audio.unlock(); audio.play('click'); save.town = Math.min(THEMES.length - 1, save.town + 1); writeSave(); sync(); goHome() })
$('doubleBtn').addEventListener('click', () => {
  $('doubleBtn').disabled = true
  platform.rewardedAd((ok) => {
    if (ok && !game.doubled) { game.doubled = true; save.gold += game.gold; $('resGold').textContent = `+${game.gold * 2}`; audio.play('buy'); writeSave(); renderUpgrades($('resUp')) } else if (!ok) $('doubleBtn').disabled = false
  })
})

// Input: on a mouse the hole heads for the cursor; on a touch screen it follows the drag from where the finger landed.
canvas.addEventListener('pointerdown', (e) => {
  audio.unlock()
  if (e.pointerType === 'mouse') return
  input.id = e.pointerId; input.ox = e.clientX; input.oy = e.clientY; input.active = true; input.x = input.z = 0
  canvas.setPointerCapture?.(e.pointerId)
})
addEventListener('pointermove', (e) => {
  if (e.pointerType === 'mouse') {
    input.mouse = true; input.active = true
    const dx = e.clientX - innerWidth / 2, dy = e.clientY - innerHeight / 2, scale = Math.min(innerWidth, innerHeight) * 0.2
    input.x = dx / scale; input.z = dy / scale
    if (Math.hypot(dx, dy) < 18) input.x = input.z = 0
    return
  }
  if (e.pointerId !== input.id) return
  const dx = e.clientX - input.ox, dy = e.clientY - input.oy, scale = 48
  input.x = clamp(dx / scale, -1, 1); input.z = clamp(dy / scale, -1, 1)
  const far = Math.hypot(dx, dy)
  if (far > scale * 1.5) { input.ox += dx / far * (far - scale * 1.5); input.oy += dy / far * (far - scale * 1.5) }
})
const lift = (e) => { if (e.pointerId === input.id) { input.id = null; input.active = false; input.x = input.z = 0 } }
addEventListener('pointerup', lift); addEventListener('pointercancel', lift)
addEventListener('keydown', (e) => {
  input.keys.add(e.code)
  if (e.code === 'KeyP') { if (game.state === 'run') pauseRun(); else if (game.state === 'pause') resumeRun() }
  if (e.code === 'Enter' && (game.state === 'title') && !$('playBtn').disabled && $('panel').classList.contains('hide')) startRun()
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault()
})
addEventListener('keyup', (e) => input.keys.delete(e.code))
addEventListener('blur', () => input.keys.clear())

function resize() {
  const w = innerWidth, h = innerHeight
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, w < 800 ? 2 : 1.5))
  renderer.setSize(w, h, false); camera.aspect = w / h; camera.fov = w < h ? 46 : 42; camera.updateProjectionMatrix()
}
addEventListener('resize', resize)

// ---------------------------------------------------------------- loop
let last = performance.now()
function frame(now) {
  if (RENDER) return
  requestAnimationFrame(frame)
  const dt = Math.min(0.05, (now - last) / 1000); last = now
  if (game.state === 'run' && !platform.adOpen && !platform.paused) { if (TURBO) { for (let i = 0; i < TURBO && game.state === 'run'; i++) { tick(1 / 60); updateFallers(1 / 60) } } else tick(dt) }
  updateFallers(dt); updateSparks(dt)
  updateView(dt, now)
  renderer.render(scene, camera)
}

async function boot() {
  $('loadbar').style.width = '30%'
  await platform.init()
  $('loadbar').style.width = '55%'
  await readSave()
  lang = save.lang || ((window.bridge?.platform?.language || navigator.language || 'en').toLowerCase().startsWith('ko') ? 'ko' : 'en')
  if (Q.has('lang')) lang = Q.get('lang')
  $('loadbar').style.width = '75%'
  resize(); buildWorld(save.town)
  hole.x = PITCH * 0.5; hole.z = PITCH * 1.5; hole.r = hole.shown = 2.4
  camera.position.set(hole.x, 30, hole.z + 22)
  hole.group.visible = true; game.state = 'title'
  sync(); show('title')
  $('loadbar').style.width = '100%'
  requestAnimationFrame(frame)
  requestAnimationFrame(() => { hide_('loading'); platform.message('game_ready') })
  if (BOT && !RENDER) setTimeout(startRun, 200)
}
if (RENDER) window.__render = {
  soundLog,
  // Advances the run by whole frames at 60 per second; draws only when asked, so a recording never drops a frame.
  step(frames, draw = true) {
    for (let i = 0; i < frames && game.state === 'run'; i++) { renderClock += 1 / 60; tick(1 / 60); updateFallers(1 / 60); updateSparks(1 / 60); updateView(1 / 60, renderClock * 1000) }
    if (draw) renderer.render(scene, camera)
    return { time: game.time, r: hole.r, state: game.state, castle: world.items.find((x) => x.kind === 'castle')?.alive, clock: renderClock }
  },
  caption(text) { let c = document.getElementById('cap'); if (!c) { c = document.createElement('div'); c.id = 'cap'; c.style.cssText = 'position:fixed;left:0;right:0;top:19%;z-index:9;text-align:center;font-size:42px;line-height:1.15;color:#fff;-webkit-text-stroke:8px #24183f;paint-order:stroke fill;padding:0 16px'; document.body.appendChild(c) } c.textContent = text },
}
if (BOT || RENDER || Q.has('debug')) window.__gt = { game, hole, world, save, THEMES, startRun, get size() { return size() } }
window.addEventListener('error', (e) => console.error('page error', e.message))
boot()
