// Skyfall Squad: the six heroes fly their own mounts up through the sky. Drag to fly, shots are automatic,
// every level-up pick one of three cards. 15 waves, a boss every fifth. Three hits and you are down.
'use strict'
const Q = new URLSearchParams(location.search)
const BOT = Q.has('bot') || Q.has('sim')
const SIM = Q.has('sim') // balance tools: the game runs without drawing, as fast as the computer can (tools/balance.mjs)
const $ = (id) => document.getElementById(id)
const C = $('c'), X = C.getContext('2d')
const W = 540 // the playfield is 540 wide; its height follows the screen (phone portrait fills it, landscape gets side bands)
let H = 960
const FACES = { ja: "'Yu Gothic UI','Meiryo','Hiragino Sans',", zh: "'Microsoft YaHei','PingFang SC',", ko: "'Malgun Gothic','Apple SD Gothic Neo'," }
let FONT = '' // canvas text: the language's own face first (Korean fonts draw Japanese kana with wide gaps), set in texts()
const fontFor = (l) => (FACES[l] || '') + "'Segoe UI','Malgun Gothic','Yu Gothic UI','Microsoft YaHei',system-ui,sans-serif"
const clamp = (v, a, b) => Math.max(a, Math.min(b, v))
const rnd = (a, b) => a + Math.random() * (b - a)
const pick = (a) => a[Math.floor(Math.random() * a.length)]
const dist2 = (a, b) => (a.x - b.x) ** 2 + (a.y - b.y) ** 2

// ---------------------------------------------------------------- save + text
const SAVE_KEY = 'skyheroes.v1'
const SAVE0 = () => ({ hero: 'fire_mage', best: 0, bestWave: {}, music: 0.6, sfx: 0.8, shake: true, nums: true, lang: '', gold: 0, meta: {}, owned: ['fire_mage'] })
const save = SAVE0()
let storeTimer = 0
function store() { // Playgama allows its own storage only (PLAYGAMA.md 3.2.1); a burst of changes is written once
  if (SIM) return
  clearTimeout(storeTimer)
  storeTimer = setTimeout(() => {
    const text = JSON.stringify(save)
    if (platform.ready && window.bridge?.storage) window.bridge.storage.set(SAVE_KEY, text).catch(() => {})
    else { try { localStorage.setItem(SAVE_KEY, text) } catch {} }
  }, 300)
}
async function readSave() {
  let text = null
  try { text = platform.ready && window.bridge?.storage ? await window.bridge.storage.get(SAVE_KEY, false) : localStorage.getItem(SAVE_KEY) } catch {}
  if (typeof text === 'string' && text) { try { const old = JSON.parse(text); Object.assign(save, old, { meta: { ...old.meta }, owned: Array.isArray(old.owned) && old.owned.length ? old.owned : ['fire_mage'] }) } catch {} }
  if (!save.owned.includes(save.hero)) save.hero = 'fire_mage'
}
const LANGS = Object.keys(TEXT)
let lang = 'en' // set in boot(): saved choice, else the platform's language, else the browser's
const t = (k) => TEXT[lang][k] ?? TEXT.en[k] ?? k

// ---------------------------------------------------------------- images
const IMG = {}
const NAMES = ['hero_knight', 'hero_fire_mage', 'hero_frost_hunter', 'hero_necromancer', 'hero_gambler', 'hero_smith',
  'enemy_slime', 'enemy_bat', 'enemy_ghost', 'enemy_shooter', 'enemy_charger', 'enemy_golem', 'enemy_splitter', 'enemy_mini_slime', 'enemy_brute',
  'boss_ogre', 'boss_demon', 'boss_warlock', 'p_fireball', 'p_crossbow_bolt', 'p_hammer', 'p_card', 'p_orbit_orb', 'p_missile', 'p_star_shard', 'p_shuriken',
  'c_main', 'c_power', 'c_rapid', 'c_pierce', 'c_wing', 'c_missile', 'c_orbit', 'c_lightning', 'c_nova', 'c_magnet', 'c_frost', 'c_crit', 'c_drone', 'c_bomb', 'c_life',
  'gem_small', 'gem_big', 'gem_huge', 'ebullet_round', 'ebullet_boss', 'heart_life',
  'c_coin', 'c_lock', 'c_greed', 'c_growth', 'c_shop',
  'd_bush', 'd_flowers', 'd_rock', 'd_stump', 'd_tree_pine', 'd_tree_round', 'd_grave_dead_tree', 'd_grave_tomb', 'd_hell_bone_pile', 'd_snow_ice_pillar', 'd_snow_pine', 'd_snow_rock', 't_slate', 't_ice']
const loaded = Promise.all(NAMES.map((n) => new Promise((res) => { const i = new Image(); i.onload = res; i.onerror = res; i.src = `assets/${n}.webp`; IMG[n] = i })))

// ---------------------------------------------------------------- data
const HEROES = ['fire_mage', 'frost_hunter', 'necromancer', 'gambler', 'smith', 'knight']
const CARDS = [
  { id: 'main' }, { id: 'power' }, { id: 'rapid' },
  { id: 'pierce' }, { id: 'wing' }, { id: 'missile' },
  { id: 'orbit' }, { id: 'lightning' }, { id: 'nova' },
  { id: 'magnet' }, { id: 'frost' }, { id: 'crit' },
  { id: 'drone' }, { id: 'bomb' },
]
const MAXLV = 5
// between runs: gold buys lasting upgrades and opens heroes (BALANCE.md 6)
const META = [
  { id: 'power', icon: 'c_power', base: 90, grow: 1.7, max: 10, per: 6 }, // damage +6% a level
  { id: 'rapid', icon: 'c_rapid', base: 120, grow: 1.7, max: 10, per: 4 }, // fire rate +4%
  { id: 'growth', icon: 'c_growth', base: 100, grow: 1.7, max: 10, per: 6 }, // gems +6%
  { id: 'magnet', icon: 'c_magnet', base: 80, grow: 1.65, max: 10, per: 12 }, // pick-up reach +12%
  { id: 'greed', icon: 'c_greed', base: 150, grow: 1.75, max: 10, per: 10 }, // gold +10%
  { id: 'start', icon: 'c_main', base: 300, grow: 2.6, max: 3, per: 1 }, // start with one more card
]
const HERO_COST = { fire_mage: 0, frost_hunter: 300, knight: 600, necromancer: 1000, gambler: 1500, smith: 2200 }
const mLv = (id) => (SIM && !Q.has('meta') ? 0 : save.meta[id] || 0)
const metaCost = (m) => Math.round(m.base * m.grow ** mLv(m.id) / 10) * 10
// enemy kinds: hp (x wave scale), speed, size, score, behaviour
const KINDS = {
  dummy: { hp: 1e9, sp: 0, r: 34, img: 'enemy_golem', xp: 0, ai: 'still' }, // balance tools only
  slime: { hp: 3, sp: 70, r: 26, img: 'enemy_slime', xp: 1, ai: 'sway' },
  mini: { hp: 1.5, sp: 110, r: 18, img: 'enemy_mini_slime', xp: 1, ai: 'sway' },
  bat: { hp: 2, sp: 150, r: 24, img: 'enemy_bat', xp: 1, ai: 'zig' },
  ghost: { hp: 4, sp: 60, r: 28, img: 'enemy_ghost', xp: 2, ai: 'hover', shoot: 2.6 },
  shooter: { hp: 6, sp: 80, r: 30, img: 'enemy_shooter', xp: 3, ai: 'park', shoot: 1.8 },
  charger: { hp: 5, sp: 60, r: 30, img: 'enemy_charger', xp: 2, ai: 'dash' },
  golem: { hp: 22, sp: 40, r: 42, img: 'enemy_golem', xp: 6, ai: 'down' },
  splitter: { hp: 8, sp: 60, r: 32, img: 'enemy_splitter', xp: 3, ai: 'sway', split: 1 },
  brute: { hp: 30, sp: 45, r: 44, img: 'enemy_brute', xp: 8, ai: 'park', shoot: 2.2, ring: 1 },
}
const BOSSES = { 5: { img: 'boss_ogre', hp: 420, r: 92 }, 10: { img: 'boss_demon', hp: 1500, r: 96 }, 15: { img: 'boss_warlock', hp: 4200, r: 96 } }
const ZONES = [ // waves 1-5 moss forest, 6-10 old graveyard, 11-15 snow peaks
  { ground: '#7fc070', dots: '#6aab5e', deco: ['d_tree_round', 'd_tree_pine', 'd_bush', 'd_flowers', 'd_rock', 'd_stump'] },
  { ground: '#6b6a86', tile: 't_slate', deco: ['d_grave_dead_tree', 'd_grave_tomb', 'd_hell_bone_pile', 'd_rock'] },
  { ground: '#dfefff', tile: 't_ice', deco: ['d_snow_pine', 'd_snow_rock', 'd_snow_ice_pillar'] },
]
const WAVE_MAX = 45 // a wave ends when all its formations came and the sky is clear; this is only the safety limit
const formsFor = (w) => 6 + Math.floor(w * 0.6) // formations per wave (BALANCE.md 3)

// ---------------------------------------------------------------- audio (ogg files: Kenney CC0 sounds, SketchyLogic CC0 music; README 'Sound')
const SFX = { shot: ['shot', 0.18, 70], hit: ['hit', 0.25, 45], pop: ['pop', 0.45, 40], big: ['big', 1, 0], gem: ['gem', 0.35, 30], level: ['level', 0.7, 0], hurt: ['hurt', 0.8, 0], boss: ['boss_intro', 0.9, 0], click: ['click', 0.8, 0], buy: ['buy', 0.8, 0], deny: ['deny', 0.7, 0], win: ['win', 0.9, 0], warp: ['warp', 0.7, 0] }
const audio = {
  ctx: null, master: null, sfxG: null, musG: null, buf: {}, last: {}, src: null, cur: '', want: 'menu',
  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return }
    if (SIM) return
    try {
      const A = window.AudioContext || window.webkitAudioContext; this.ctx = new A()
      this.master = this.ctx.createGain(); this.master.connect(this.ctx.destination)
      this.sfxG = this.ctx.createGain(); this.sfxG.connect(this.master); this.musG = this.ctx.createGain(); this.musG.connect(this.master)
      this.apply()
      for (const [f] of Object.values(SFX)) this.load(f)
      for (const f of ['menu', 'zone1', 'zone2', 'zone3', 'boss']) this.load(f).then(() => this.music(this.want))
    } catch { this.ctx = null }
  },
  async load(f) { if (this.buf[f]) return; try { this.buf[f] = await this.ctx.decodeAudioData(await (await fetch(`audio/${f}.ogg`)).arrayBuffer()) } catch {} },
  apply() { if (!this.ctx) return; const silent = !platform.audioOn || platform.adOpen || platform.paused || document.hidden; this.master.gain.value = silent ? 0 : 1; this.sfxG.gain.value = save.sfx; this.musG.gain.value = save.music * 0.5 },
  play(k) {
    const d = SFX[k]; if (!d || !this.ctx || !this.buf[d[0]]) return
    const now = performance.now(); if (now - (this.last[k] || 0) < d[2]) return; this.last[k] = now
    const s = this.ctx.createBufferSource(), g = this.ctx.createGain(); s.buffer = this.buf[d[0]]; s.playbackRate.value = k === 'shot' || k === 'hit' || k === 'pop' ? 0.92 + Math.random() * 0.16 : 1; g.gain.value = d[1]
    s.connect(g); g.connect(this.sfxG); s.start()
  },
  music(name) { // called every frame with the wanted track; switches only when it changes
    this.want = name
    if (!this.ctx || this.cur === name || !this.buf[name]) return
    this.src?.stop(); this.src = null; this.cur = name
    const s = this.ctx.createBufferSource(); s.buffer = this.buf[name]; s.loop = true; s.connect(this.musG); s.start(); this.src = s
  },
}
const trackNow = () => game.state === 'title' || game.state === 'over' ? 'menu' : game.bossOn ? 'boss' : 'zone' + Math.min(3, 1 + Math.floor((game.wave - 1) / 5))
addEventListener('pointerdown', () => audio.init(), true); addEventListener('keydown', () => audio.init(), true) // the first touch anywhere turns sound on

// ---------------------------------------------------------------- platform (Playgama bridge when present)
const platform = {
  ready: false, adOpen: false, audioOn: true, paused: false, adNext: null, lastAd: Date.now(),
  async init() {
    if (Q.has('nobridge') || window.__noBridge || !window.bridge) return
    try {
      const bridge = window.bridge; bridge.engine = 'javascript'
      await bridge.initialize(); this.ready = true
      this.audioOn = bridge.platform.isAudioEnabled !== false
      const ev = bridge.EVENT_NAME
      bridge.platform.on(ev.AUDIO_STATE_CHANGED, (on) => { this.audioOn = on; audio.apply() })
      bridge.platform.on(ev.PAUSE_STATE_CHANGED, (on) => { this.paused = on; audio.apply(); if (on && game.state === 'run') togglePause() })
      bridge.advertisement.on(ev.INTERSTITIAL_STATE_CHANGED, (s) => this.onAd(s))
      bridge.advertisement.on(ev.REWARDED_STATE_CHANGED, (s) => this.onReward(s))
    } catch { this.ready = false }
  },
  msg(n) { try { if (this.ready) window.bridge.platform.sendMessage(n) } catch {} },
  onAd(s) { if (s === 'opened') { this.adOpen = true; audio.apply() } if (s === 'closed' || s === 'failed') { this.adOpen = false; audio.apply(); this.afterAd() } },
  afterAd() { const n = this.adNext; this.adNext = null; clearTimeout(this.adWait); n?.() },
  interstitial(next) { // when the player presses Again / Heroes (not on the result screen), from the 3rd run, at most every 3 minutes
    if (!this.ready || runs < 3 || Date.now() - this.lastAd < 180000) { next(); return }
    this.lastAd = Date.now(); this.adNext = next; this.adWait = setTimeout(() => { if (!this.adOpen) this.afterAd() }, 2500)
    try { window.bridge.advertisement.showInterstitial() } catch { this.afterAd() }
  },
  rewardDone: null, rewarded: false,
  onReward(s) { if (s === 'opened') { this.adOpen = true; audio.apply() } if (s === 'rewarded') this.rewarded = true; if (s === 'closed' || s === 'failed') { this.adOpen = false; audio.apply(); const d = this.rewardDone; this.rewardDone = null; d?.(this.rewarded); this.rewarded = false } },
  rewardedAd(done) { if (!this.ready) { done(false); return } this.rewardDone = done; this.rewarded = false; this.lastAd = Date.now(); try { window.bridge.advertisement.showRewarded() } catch { this.rewardDone = null; done(false) } },
  bannerOn: false,
  banner(on) { // menus only, never in a run; only where the portal has banners (Playgama's own site has none)
    if (on === this.bannerOn) return
    this.bannerOn = on
    const real = this.ready && window.bridge.advertisement.isBannerSupported === true
    document.body.classList.toggle('adBanner', on && (real || Q.has('fakebanner'))); document.body.classList.toggle('fakeBanner', on && Q.has('fakebanner'))
    try { if (real) on ? window.bridge.advertisement.showBanner() : window.bridge.advertisement.hideBanner() } catch {}
  },
}
let runs = 0

// ---------------------------------------------------------------- run state
const game = { state: 'title', time: 0, wave: 1, waveT: 0, score: 0, kills: 0, level: 1, xp: 0, need: 6, shake: 0, flash: 0, bossOn: false, cont: false, scroll: 0, banner: null }
const P = { x: W / 2, y: H * 0.8, r: 18, lives: 3, inv: 0, hero: save.hero, fire: 0 }
let foes = [], shots = [], ebul = [], gems = [], fx = [], nums = [], decos = [], bolts = []
let up = {} // card levels
const lvOf = (id) => up[id] || 0
const stat = {
  get dmg() { return (1 + 0.25 * lvOf('power')) * (1 + 0.04 * (game.level - 1)) * (1 + 0.06 * mLv('power')) },
  get rate() { return (1 + 0.2 * lvOf('rapid')) * (1 + 0.04 * mLv('rapid')) },
  get pierce() { return lvOf('pierce') },
  get crit() { return 0.08 * lvOf('crit') },
  get magnet() { return 140 * (1 + 0.5 * lvOf('magnet')) * (1 + 0.12 * mLv('magnet')) },
}
function resetRun() {
  Object.assign(game, { time: 0, wave: 1, waveT: 0, score: 0, kills: 0, level: 1, xp: 0, need: needFor(1), shake: 0, flash: 0, bossOn: false, cont: false, banner: null, later: null, forms: 0, bossDone: false, bossN: 0, dealt: 0, hitAt: [], bossT: {}, bossFrom: 0, levelAt: [], gold: 0 })
  Object.assign(P, { x: W / 2, y: H * 0.8, lives: 3, inv: 1.5, hero: save.hero, fire: 0 })
  foes = []; shots = []; ebul = []; gems = []; fx = []; nums = []; bolts = []; up = { main: 1 }
  timers = { missile: 0, lightning: 0, bomb: 6, drone: 0, wing: 0 }
  spawnQ = []; banner(`${t('wave')} 1`)
  for (let i = 0; i < mLv('start'); i++) { const c = pick(CARDS.filter((c) => c.id !== 'main' && lvOf(c.id) < MAXLV)); up[c.id] = lvOf(c.id) + 1 }
}
let timers = {}, spawnQ = []

// ---------------------------------------------------------------- main weapons (level = up.main, 1..5)
function fireMain() {
  const L = lvOf('main'), d = stat.dmg, h = P.hero, x = P.x, y = P.y - 30
  const s = (o) => shots.push(Object.assign({ x, y, vx: 0, vy: -900, r: 9, dmg: d, pierce: stat.pierce, life: 1.4, img: 'p_fireball', rot: -Math.PI / 2, size: 30 }, o))
  if (h === 'fire_mage') { // a fast stream, more streams side by side
    for (let i = 0; i < L; i++) { const off = (i - (L - 1) / 2) * 16; s({ x: x + off, vy: -1050, dmg: d * 0.92, size: 46, glow: '#ff8a3a' }) }
    return 0.07
  }
  if (h === 'frost_hunter') { // a fan of arrows that slow
    const n = 3 + L * 2
    for (let i = 0; i < n; i++) { const a = -Math.PI / 2 + (i - (n - 1) / 2) * 0.1 * (1 - 0.1 * (L - 1)); s({ vx: Math.cos(a) * 980, vy: Math.sin(a) * 980, img: 'p_crossbow_bolt', rot: a, dmg: d * 0.55 * (1 + 0.15 * (L - 1)), chill: 1, size: 50, glow: '#7fd4ff' }) }
    return 0.22
  }
  if (h === 'necromancer') { // soul orbs leave from around the hero and chase foes
    const n = 1 + L
    for (let i = 0; i < n; i++) { const a = game.time * 3 + i * Math.PI * 2 / n, ox = Math.cos(a) * 46, oy = Math.sin(a) * 30; s({ x: x + ox, y: y + 20 + oy, vy: -700, img: 'p_orbit_orb', home: 1, dmg: d * 1.2, size: 38, glow: '#c07aff' }) }
    return 0.18
  }
  if (h === 'gambler') { // coins bounce from foe to foe
    const n = 1 + Math.ceil(L / 2)
    for (let i = 0; i < n; i++) { const a = -Math.PI / 2 + (i - (n - 1) / 2) * 0.12; s({ vx: Math.cos(a) * 820, vy: Math.sin(a) * 820, coin: 1, bounce: 2 + L, dmg: d * 0.7, lucky: 0.3, r: 15, life: 2, glow: '#ffd34d' }) }
    return 0.22
  }
  if (h === 'smith') { // heavy hammers that blow up
    const n = Math.ceil(L / 2) + 1
    for (let i = 0; i < n; i++) { const off = (i - (n - 1) / 2) * 40; s({ x: x + off, vy: -680, img: 'p_hammer', spin: 14, dmg: d * 1.8, boom: 80 + L * 12, size: 58, r: 18, glow: '#ffb35a' }) }
    return 0.4
  }
  // knight: wide shield waves that go through everything
  const n = Math.min(3, Math.ceil(L / 2))
  for (let i = 0; i < n; i++) s({ x: x + (i - (n - 1) / 2) * 70, vy: -760, wave: 1, w: 130 + L * 20, r: 26, dmg: d * 2.2, pierce: 99, life: 1.2 })
  return 0.3
}

// ---------------------------------------------------------------- waves
function waveRecipe(w) {
  const list = ['slime', 'bat']
  if (w >= 2) list.push('ghost', 'slime')
  if (w >= 3) list.push('charger', 'splitter')
  if (w >= 4) list.push('shooter')
  if (w >= 6) list.push('golem', 'bat', 'bat')
  if (w >= 8) list.push('brute', 'shooter')
  if (w >= 11) list.push('golem', 'brute', 'charger')
  return list
}
const hpScale = (w) => 1.17 ** (w - 1) * (1 + 0.01 * (w - 1) ** 2) // x2.2 at wave 5, x7.4 at 10, x27 at 15 (BALANCE.md)
function formation(w) {
  const kind = pick(waveRecipe(w)), shape = pick(['line', 'v', 'column', 'scatter', 'arc']), colX = rnd(80, W - 80)
  const n = kind === 'golem' || kind === 'brute' ? 1 + Math.floor(w / 6) : 4 + Math.floor(w / 2)
  for (let i = 0; i < n; i++) {
    let x = W / 2, y = -40, delay = 0
    if (shape === 'line') { x = 60 + (W - 120) * (n === 1 ? 0.5 : i / (n - 1)) }
    else if (shape === 'v') { x = W / 2 + (i - (n - 1) / 2) * 46; delay = Math.abs(i - (n - 1) / 2) * 0.12 }
    else if (shape === 'column') { x = colX; delay = i * 0.28 }
    else if (shape === 'arc') { x = W / 2 + Math.cos(Math.PI * (i / Math.max(1, n - 1))) * 200; delay = i * 0.08 }
    else { x = rnd(50, W - 50); delay = rnd(0, 1.4) }
    spawnQ.push({ at: game.time + delay, kind, x, y: y - (shape === 'scatter' ? rnd(0, 60) : 0) })
  }
  return kind
}
function spawn(kind, x, y, extra = {}) {
  const k = KINDS[kind], hp = k.hp * hpScale(game.wave)
  foes.push(Object.assign({ kind, x, y, vx: 0, vy: k.sp, hp, max: hp, r: k.r, t: 0, shoot: k.shoot ? rnd(0.6, k.shoot) : 0, slow: 0, hitT: 0, ph: rnd(0, 6) }, extra))
}
function spawnBoss() {
  const B = BOSSES[game.wave], hp = B.hp * hpScale(game.wave) / hpScale(game.wave >= 10 ? 10 : 5) * (game.wave === 15 ? 1.1 : 1)
  foes.push({ kind: 'boss', boss: game.wave, img: B.img, x: W / 2, y: -120, vx: 0, vy: 90, hp, max: hp, r: B.r, t: 0, shoot: 1.5, slow: 0, hitT: 0, ph: 0 })
  game.bossOn = true; game.bossN = (game.bossN || 0) + 1; game.bossFrom = game.time; banner(t('boss'), '#ff5a6a'); audio.play('boss')
}
function banner(text, col = '#fff') { game.banner = { text, t: 0, col } }

// ---------------------------------------------------------------- update
let last = 0
function tick(dt) {
  if (game.later && (game.later.t -= dt) <= 0) { const f = game.later.fn; game.later = null; f() }
  game.time += dt; game.scroll += dt * (70 + game.wave * 4)
  if (game.shake > 0) game.shake = Math.max(0, game.shake - dt * 30)
  if (game.flash > 0) game.flash -= dt
  if (game.banner) { game.banner.t += dt; if (game.banner.t > 1.8) game.banner = null }
  // waves
  const bossWave = !!BOSSES[game.wave]
  if (game.noWaves) { /* balance dummy */ } else {
  if (!bossWave || !game.bossOn) game.waveT += dt
  if (bossWave && !game.bossOn && !game.bossDone && game.waveT > 2.5 && !foes.some((f) => f.kind === 'boss')) spawnBoss() // bossDone: once per wave (it came back during the 1.2 s after the kill)
  if (!bossWave) {
    if (game.waveT > 1 && game.forms < formsFor(game.wave) && spawnQ.length < 4 && (game._next ?? 0) <= game.time) { formation(game.wave); game.forms++; game._next = game.time + clamp(2.6 - game.wave * 0.1, 1.1, 2.6) }
    if (!game.later && ((game.forms >= formsFor(game.wave) && !spawnQ.length && !foes.length) || game.waveT >= WAVE_MAX)) game.later = { t: 0.8, fn: nextWave } // cleared: next wave
  } else if (game.bossOn && (game._next ?? 0) <= game.time) { formation(Math.max(1, game.wave - 2)); game._next = game.time + 4 }
  }
  for (let i = spawnQ.length - 1; i >= 0; i--) if (spawnQ[i].at <= game.time) { const s = spawnQ[i]; spawn(s.kind, s.x, s.y); spawnQ.splice(i, 1) }
  // player
  input.apply(dt)
  if (P.inv > 0) P.inv -= dt
  P.fire -= dt * stat.rate
  if (P.fire <= 0) { P.fire += fireMain(); audio.play('shot') }
  weapons(dt)
  // shots
  for (let i = shots.length - 1; i >= 0; i--) {
    const s = shots[i]
    s.life -= dt
    if (s.home) { const f = nearest(s, 260); if (f) { const a = Math.atan2(f.y - s.y, f.x - s.x), sp = 720; s.vx += (Math.cos(a) * sp - s.vx) * Math.min(1, dt * 6); s.vy += (Math.sin(a) * sp - s.vy) * Math.min(1, dt * 6) } }
    s.x += s.vx * dt; s.y += s.vy * dt
    if (s.coin && (s.x < 10 || s.x > W - 10)) { s.vx = -s.vx; s.x = clamp(s.x, 10, W - 10) }
    if (s.life <= 0 || s.y < -60 || s.y > H + 60 || s.x < -60 || s.x > W + 60) { shots.splice(i, 1); continue }
    for (const f of foes) {
      if (f.dead || (s.hitSet && s.hitSet.has(f))) continue
      const rr = (s.wave ? s.w * 0.5 : s.r) + f.r
      if ((s.wave ? Math.abs(s.x - f.x) < rr && Math.abs(s.y - f.y) < f.r + 14 : dist2(s, f) < rr * rr)) {
        hurt(f, s.dmg, s); (s.hitSet ||= new Set()).add(f)
        if (s.boom) { explode(s.x, s.y, s.boom, s.dmg * 0.8); s.life = 0; break }
        if (s.coin && s.bounce > 0) { s.bounce--; const n = nearest(s, 400, s.hitSet); if (n) { const a = Math.atan2(n.y - s.y, n.x - s.x); s.vx = Math.cos(a) * 820; s.vy = Math.sin(a) * 820; s.life = 1.2 } else s.life = 0; break }
        if (s.pierce > 0) { s.pierce--; continue }
        s.life = 0; break
      }
    }
    if (s.life <= 0) shots.splice(i, 1)
  }
  // foes
  for (let i = foes.length - 1; i >= 0; i--) {
    const f = foes[i]; f.t += dt; if (f.hitT > 0) f.hitT -= dt; if (f.slow > 0) f.slow -= dt
    const sm = f.slow > 0 ? 0.5 : 1
    if (f.kind === 'boss') bossAI(f, dt)
    else {
      const k = KINDS[f.kind]
      if (k.ai === 'sway') { f.x += Math.sin(f.t * 2 + f.ph) * 60 * dt; f.y += f.vy * dt * sm }
      else if (k.ai === 'zig') { f.x += Math.sin(f.t * 5 + f.ph) * 220 * dt; f.y += f.vy * dt * sm }
      else if (k.ai === 'hover') { f.y += (f.y < H * 0.3 ? f.vy : f.vy * 0.25) * dt * sm }
      else if (k.ai === 'park') { const stop = H * (0.18 + (f.ph % 1) * 0.12); f.y += (f.y < stop ? f.vy * 1.6 : (f.t > 9 ? f.vy * 1.5 : 0)) * dt * sm; f.x += Math.sin(f.t * 0.8 + f.ph) * 30 * dt }
      else if (k.ai === 'dash') { if (!f.dash && f.y > H * 0.2) { f.dash = 0.7 } if (f.dash > 0) { f.dash -= dt; if (f.dash <= 0) { const a = Math.atan2(P.y - f.y, P.x - f.x); f.vx = Math.cos(a) * 420; f.vy = Math.sin(a) * 420; f.dash = -1 } } else { f.x += f.vx * dt * sm; f.y += f.vy * dt * sm } }
      else if (k.ai !== 'still') f.y += f.vy * dt * sm
      if (k.shoot && f.y > 20) { f.shoot -= dt; if (f.shoot <= 0) { f.shoot = k.shoot * rnd(0.85, 1.2); enemyFire(f, k) } }
    }
    f.x = clamp(f.x, 16, W - 16)
    if (f.y > H + 80 || f.x < -100 || f.x > W + 100) { foes.splice(i, 1); continue }
    if (P.inv <= 0 && dist2(f, P) < (f.r * 0.8 + P.r) ** 2) playerHit()
  }
  // enemy bullets
  for (let i = ebul.length - 1; i >= 0; i--) { const b = ebul[i]; b.x += b.vx * dt; b.y += b.vy * dt; if (b.y > H + 20 || b.y < -40 || b.x < -20 || b.x > W + 20) { ebul.splice(i, 1); continue } if (P.inv <= 0 && dist2(b, P) < (b.r + P.r * 0.7) ** 2) { ebul.splice(i, 1); playerHit(); break } } // playerHit replaces ebul (clears nearby bullets), so stop walking the old one
  // gems
  for (let i = gems.length - 1; i >= 0; i--) {
    const g = gems[i], d = Math.sqrt(dist2(g, P))
    if (d < stat.magnet || g.pull) { g.pull = 1; const sp = 600 + (1 - d / 300) * 400; g.x += (P.x - g.x) / d * sp * dt; g.y += (P.y - g.y) / d * sp * dt } else g.y += 60 * dt
    if (d < 26) { gems.splice(i, 1); gainXp(g.v); audio.play('gem'); continue }
    if (g.y > H + 20) gems.splice(i, 1)
  }
  for (let i = fx.length - 1; i >= 0; i--) { const e = fx[i]; e.t += dt; if (e.t > e.d) fx.splice(i, 1) }
  for (let i = nums.length - 1; i >= 0; i--) { const n = nums[i]; n.t += dt; n.y -= 60 * dt; if (n.t > 0.7) nums.splice(i, 1) }
  for (let i = bolts.length - 1; i >= 0; i--) { bolts[i].t += dt; if (bolts[i].t > 0.18) bolts.splice(i, 1) }
  updateDecos(dt)
}
function nearest(p, range, skip) { let best = null, bd = range * range; for (const f of foes) { if (f.dead || (skip && skip.has(f))) continue; const d = dist2(p, f); if (d < bd) { bd = d; best = f } } return best }
function enemyFire(f, k) {
  const a = Math.atan2(P.y - f.y, P.x - f.x), sp = 230 + game.wave * 6
  if (k.ring) { for (let i = 0; i < 10; i++) { const b = i / 10 * Math.PI * 2; ebul.push({ x: f.x, y: f.y, vx: Math.cos(b) * sp * 0.8, vy: Math.sin(b) * sp * 0.8, r: 8 }) } return }
  const n = f.kind === 'shooter' ? 3 : 1
  for (let i = 0; i < n; i++) { const b = a + (i - (n - 1) / 2) * 0.22; ebul.push({ x: f.x, y: f.y + f.r * 0.5, vx: Math.cos(b) * sp, vy: Math.sin(b) * sp, r: 8 }) }
}
function bossAI(f, dt) {
  if (f.y < 190) { f.y += 90 * dt; return }
  f.x = W / 2 + Math.sin(f.t * 0.6) * 150
  f.shoot -= dt
  if (f.shoot <= 0) {
    const sp = 210 + game.wave * 4
    if (f.boss === 5) { const a = Math.atan2(P.y - f.y, P.x - f.x); for (let i = -2; i <= 2; i++) ebul.push({ x: f.x, y: f.y + 50, vx: Math.cos(a + i * 0.18) * sp, vy: Math.sin(a + i * 0.18) * sp, r: 10, boss: 1 }); f.shoot = 1.3 }
    else if (f.boss === 10) { for (let i = 0; i < 14; i++) { const b = f.t * 1.7 + i / 14 * Math.PI * 2; ebul.push({ x: f.x, y: f.y, vx: Math.cos(b) * sp, vy: Math.sin(b) * sp, r: 9, boss: 1 }) } f.shoot = 0.9 }
    else { for (let i = 0; i < 18; i++) { const b = i / 18 * Math.PI * 2 + f.t; ebul.push({ x: f.x, y: f.y, vx: Math.cos(b) * sp * 0.9, vy: Math.sin(b) * sp * 0.9, r: 9, boss: 1 }) } if (Math.floor(f.t) % 4 === 0) { spawn('bat', f.x - 90, f.y); spawn('bat', f.x + 90, f.y) } f.shoot = 1.0 }
  }
}
function hurt(f, dmg, src) {
  let d = dmg, crit = Math.random() < stat.crit + (src?.lucky || 0) // gambler coins: 30% lucky hits of their own
  if (crit) d *= 2.5
  f.hp -= d; f.hitT = 0.08; game.dealt += Math.min(d, Math.max(0, f.hp + d))
  if (src?.chill || lvOf('frost')) f.slow = 0.6 + 0.3 * lvOf('frost')
  if (save.nums && nums.length < 60) nums.push({ x: f.x + rnd(-10, 10), y: f.y - f.r * 0.5, v: Math.round(d * 10), t: 0, crit })
  audio.play('hit')
  if (f.hp <= 0 && !f.dead) kill(f)
}
function kill(f) {
  f.dead = true; foes.splice(foes.indexOf(f), 1)
  game.kills++; game.score += Math.round(f.max * 10); game.gold += f.kind === 'boss' ? 60 * (f.boss / 5) : KINDS[f.kind].xp
  burst(f.x, f.y, f.r, f.kind === 'boss')
  if (f.kind === 'boss') {
    audio.play('warp'); game.bossOn = false; game.bossDone = true; game.bossT[game.wave] = Math.round(game.time - game.bossFrom); game.shake = 14; game.flash = 0.25; audio.play('big'); ebul = []
    for (let i = 0; i < 30; i++) gems.push({ x: f.x + rnd(-80, 80), y: f.y + rnd(-60, 60), v: 3, huge: 1, pull: 1 })
    game.later = { t: 1.2, fn: () => { if (game.wave >= 15) finish(true); else nextWave() } } // game time, so pausing or leaving does not move the wave on
    return
  }
  const k = KINDS[f.kind]
  gems.push({ x: f.x, y: f.y, v: k.xp })
  if (k.split) for (const s of [-1, 1]) spawn('mini', f.x + s * 16, f.y, { vy: 120 })
  if (lvOf('nova') && Math.random() < 0.2 + 0.12 * lvOf('nova')) explode(f.x, f.y, 70 + 12 * lvOf('nova'), 2.5 * stat.dmg)
  audio.play('pop')
}
function explode(x, y, R, dmg) {
  fx.push({ k: 'ring', x, y, R, t: 0, d: 0.35 })
  for (const f of [...foes]) if (!f.dead && dist2({ x, y }, f) < (R + f.r) ** 2) hurt(f, dmg)
  game.shake = Math.max(game.shake, 4); audio.play('pop')
}
function burst(x, y, r, big) { fx.push({ k: 'burst', x, y, R: r * (big ? 3 : 1.6), t: 0, d: big ? 0.8 : 0.4, n: big ? 26 : 10, seed: Math.random() * 99 }) }
const needFor = (lv) => 4 + lv * 3 + Math.floor(lv * lv * 0.12) // gems for the next level (BALANCE.md)
function gainXp(v) {
  game.xp += v * (1 + 0.06 * mLv('growth'))
  if (game.xp >= game.need) { game.xp -= game.need; game.level++; game.need = needFor(game.level); openCards() }
}
function playerHit() {
  if (P.inv > 0) return
  P.lives--; game.hitAt.push(game.wave); P.inv = 2; game.shake = 16; game.flash = 0.2; audio.play('hurt')
  ebul = ebul.filter((b) => dist2(b, P) > 220 * 220)
  try { if (save.shake) navigator.vibrate?.(120) } catch {}
  if (P.lives <= 0) finish(false)
}
function nextWave() {
  if (game.wave >= 15) { finish(true); return }
  for (const g of gems) g.pull = 1
  game.gold += 5 * game.wave
  game.levelAt[game.wave] = game.level
  game.wave++; game.waveT = 0; game.forms = 0; game.bossDone = false; game._next = game.time + 1.5; ebul = []
  banner(BOSSES[game.wave] ? `${t('wave')} ${game.wave}` : `${t('wave')} ${game.wave}`)
}

// ---------------------------------------------------------------- card-driven extra weapons
function weapons(dt) {
  const d = stat.dmg
  if (lvOf('wing')) { timers.wing -= dt * stat.rate; if (timers.wing <= 0) { timers.wing = 0.3; for (const s of [-1, 1]) for (let i = 0; i < lvOf('wing'); i++) shots.push({ x: P.x + s * (34 + i * 10), y: P.y - 6, vx: s * 60 * i, vy: -820, r: 7, dmg: d * 0.6, pierce: stat.pierce, life: 1.3, img: 'p_star_shard', rot: -Math.PI / 2, size: 30, glow: '#fff1a0' }) } }
  if (lvOf('missile')) { timers.missile -= dt; if (timers.missile <= 0) { timers.missile = 1.3 - 0.12 * lvOf('missile'); for (let i = 0; i < lvOf('missile'); i++) shots.push({ x: P.x + (i % 2 ? 20 : -20), y: P.y, vx: (i % 2 ? 1 : -1) * 260, vy: -200, r: 9, dmg: d * 2.2, home: 1, boom: 50, life: 2.2, img: 'p_missile', size: 42, aim: 1, glow: '#ff9a6a' }) } }
  if (lvOf('orbit')) { const n = 1 + lvOf('orbit'); for (let i = 0; i < n; i++) { const a = game.time * 4 + i * Math.PI * 2 / n, o = { x: P.x + Math.cos(a) * 80, y: P.y + Math.sin(a) * 80 }; for (let k = ebul.length - 1; k >= 0; k--) if (dist2(o, ebul[k]) < (18 + ebul[k].r) ** 2) { burst(ebul[k].x, ebul[k].y, 8, false); ebul.splice(k, 1) } // orbs block bullets
      for (const f of foes) if (!f.dead && dist2(o, f) < (f.r + 14) ** 2 && (f.orbT || 0) < game.time) { f.orbT = game.time + 0.25; hurt(f, d * 1.2) } } }
  if (lvOf('lightning')) { timers.lightning -= dt; if (timers.lightning <= 0) { timers.lightning = 1.6 - 0.15 * lvOf('lightning'); let from = P, hit = new Set(); for (let j = 0; j < 2 + lvOf('lightning'); j++) { const f = nearest(from, 320, hit); if (!f) break; bolts.push({ a: { x: from.x, y: from.y }, b: { x: f.x, y: f.y }, t: 0 }); hit.add(f); hurt(f, d * 2.4); from = f } } }
  if (lvOf('drone')) { timers.drone -= dt * stat.rate; if (timers.drone <= 0) { timers.drone = 0.4; for (let i = 0; i < lvOf('drone'); i++) { const s = i % 2 ? 1 : -1, dx = P.x + s * (70 + Math.floor(i / 2) * 26), dy = P.y + 40; shots.push({ x: dx, y: dy, vx: 0, vy: -800, r: 8, dmg: d * 0.9, pierce: 0, life: 1.3, img: 'p_shuriken', spin: 18, size: 30, glow: '#bfe8ff' }) } } }
  if (lvOf('bomb')) { timers.bomb -= dt; if (timers.bomb <= 0) { timers.bomb = 14 - 1.6 * lvOf('bomb'); fx.push({ k: 'bomb', x: P.x, y: P.y - 200, R: 520, t: 0, d: 0.6 }); ebul = []; game.shake = 12; audio.play('big'); for (const f of [...foes]) hurt(f, d * 6 * (f.kind === 'boss' ? 0.5 : 1)) } }
}

// ---------------------------------------------------------------- cards
function openCards(auto = BOT) {
  game.state = 'cards'; audio.play('level')
  const avail = CARDS.filter((c) => lvOf(c.id) < MAXLV)
  const pool = [...avail].sort(() => Math.random() - 0.5).slice(0, 3)
  const row = $('cardRow'); row.innerHTML = ''
  $('cTitle').textContent = t('levelUp'); $('cSub').textContent = t('pick')
  for (const c of pool) {
    const el = document.createElement('div'); el.className = 'card'
    const L = lvOf(c.id)
    el.innerHTML = `<div class="ic"><img src="assets/c_${c.id}.webp"></div><div class="tx"><b>${t('c_' + c.id)}</b><span>${t('c_' + c.id + '_d')}</span><i>${L ? t('lv') + ' ' + L + ' → ' + (L + 1) : t('newCard')}</i></div>`
    el.onclick = () => { up[c.id] = L + 1; audio.play('click'); hide('cards'); game.state = 'run'; P.inv = Math.max(P.inv, 0.6) }
    row.appendChild(el)
  }
  show('cards')
  if (SIM) row.firstChild?.click(); else if (auto) setTimeout(() => row.firstChild?.click(), 50)
}

// ---------------------------------------------------------------- background
function updateDecos(dt) {
  const zone = ZONES[Math.min(2, Math.floor((game.wave - 1) / 5))], sp = 70 + game.wave * 4
  for (const d of decos) d.y += sp * dt
  decos = decos.filter((d) => d.y < H + 80)
  while (decos.length < 22) decos.push({ img: pick(zone.deco), x: rnd(-20, W + 20), y: rnd(-H, -40) - (decos.length ? 0 : 0), s: rnd(0.7, 1.15), zone })
}
function initDecos() { decos = []; const zone = ZONES[0]; for (let i = 0; i < 22; i++) decos.push({ img: pick(zone.deco), x: rnd(-20, W + 20), y: rnd(-40, H), s: rnd(0.7, 1.15), zone }) }
function drawGround() {
  const zone = ZONES[Math.min(2, Math.floor((game.wave - 1) / 5))]
  X.fillStyle = zone.ground; X.fillRect(0, 0, W, H)
  if (zone.tile && IMG[zone.tile].complete) { X.globalAlpha = 0.5; const o = game.scroll % 256; for (let y = -256 + o; y < H; y += 256) for (let x = 0; x < W; x += 256) X.drawImage(IMG[zone.tile], x, y, 256, 256); X.globalAlpha = 1 }
  else { X.fillStyle = zone.dots; const o = game.scroll % 40; for (let y = -40 + o; y < H; y += 40) for (let x = (y / 40 % 2) * 20; x < W; x += 40) X.fillRect(x, y, 4, 4) }
  for (const d of decos) { const im = IMG[d.img]; if (!im.complete || !im.width) continue; const w = im.width * 0.6 * d.s, h = im.height * 0.6 * d.s; X.drawImage(im, d.x - w / 2, d.y - h, w, h) }
  // cloud shadows sliding by
  X.fillStyle = 'rgba(30,30,70,0.12)'
  for (let i = 0; i < 4; i++) { const y = ((game.scroll * 1.6 + i * 300) % (H + 300)) - 150, x = (i * 173) % W; X.beginPath(); X.ellipse(x, y, 140, 60, 0, 0, 7); X.fill() }
}

// ---------------------------------------------------------------- draw
const GLOW = {}
function glow(col, x, y, R) { // a soft additive halo behind a shot; one small canvas per colour
  let g = GLOW[col]
  if (!g) { g = GLOW[col] = document.createElement('canvas'); g.width = g.height = 64; const c = g.getContext('2d'), gr = c.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, col + 'cc'); gr.addColorStop(0.45, col + '55'); gr.addColorStop(1, col + '00'); c.fillStyle = gr; c.fillRect(0, 0, 64, 64) }
  X.drawImage(g, x - R, y - R, R * 2, R * 2)
}
function sprite(name, x, y, size, rot = 0, alpha = 1) {
  const im = IMG[name]; if (!im || !im.complete || !im.width) return
  const s = size / Math.max(im.width, im.height)
  X.save(); X.globalAlpha = alpha; X.translate(x, y); if (rot) X.rotate(rot); X.drawImage(im, -im.width * s / 2, -im.height * s / 2, im.width * s, im.height * s); X.restore()
}
function draw() {
  const sw = C.width, sh = C.height, scale = Math.min(sw / W, sh / H), ox = (sw - W * scale) / 2, oy = (sh - H * scale) / 2
  X.setTransform(1, 0, 0, 1, 0, 0); X.fillStyle = ZONES[Math.min(2, Math.floor((game.wave - 1) / 5))].ground; X.fillRect(0, 0, sw, sh); X.fillStyle = 'rgba(26,22,54,0.62)'; X.fillRect(0, 0, sw, sh) // side bands in landscape keep the zone colour
  const shk = save.shake ? game.shake : 0
  X.setTransform(scale, 0, 0, scale, ox + (Math.random() - 0.5) * shk * scale, oy + (Math.random() - 0.5) * shk * scale)
  X.save(); X.beginPath(); X.rect(0, 0, W, H); X.clip()
  drawGround()
  // gems
  for (const g of gems) sprite(g.huge ? 'gem_huge' : g.v > 2 ? 'gem_big' : 'gem_small', g.x, g.y, g.huge ? 30 : g.v > 2 ? 24 : 18)
  // foes
  for (const f of foes) {
    const img = f.kind === 'boss' ? f.img : KINDS[f.kind].img, size = f.r * 2.4
    X.save(); X.fillStyle = 'rgba(20,10,40,0.25)'; X.beginPath(); X.ellipse(f.x + 10, f.y + f.r * 0.9, f.r * 0.8, f.r * 0.3, 0, 0, 7); X.fill(); X.restore()
    sprite(img, f.x, f.y, size, 0, 1)
    if (f.hitT > 0) { X.save(); X.globalCompositeOperation = 'lighter'; sprite(img, f.x, f.y, size, 0, 0.5); X.restore() }
    if (f.dash > 0 && Math.floor(f.t * 12) % 2) { X.save(); X.globalCompositeOperation = 'lighter'; sprite(img, f.x, f.y, size, 0, 0.6); X.restore() } // about to charge: the foe itself blinks
    if (f.kind === 'boss') { const w = 300, x0 = W / 2 - 20 - w / 2; X.fillStyle = '#2a1d55'; X.fillRect(x0 - 3, 84, w + 6, 20); X.fillStyle = '#ff5a6a'; X.fillRect(x0, 87, w * Math.max(0, f.hp / f.max), 14) }
  }
  // player shots: an additive halo first, then the sprite with normal blending ('lighter' sprites turn white on the snow)
  X.save(); X.globalCompositeOperation = 'lighter'
  for (const s of shots) if (s.glow) glow(s.glow, s.x, s.y, (s.size || 30) * 0.85)
  X.restore(); X.save()
  for (const s of shots) {
    if (s.wave) { X.lineCap = 'round'; X.strokeStyle = '#2a1d55'; X.lineWidth = 18; X.beginPath(); X.ellipse(s.x, s.y + 6, s.w * 0.5, 20, 0, Math.PI * 1.08, Math.PI * 1.92); X.stroke(); X.strokeStyle = '#8fd0ff'; X.lineWidth = 12; X.stroke(); X.strokeStyle = '#fff'; X.lineWidth = 4; X.stroke(); continue }
    if (s.coin) { const cw = s.r * Math.abs(Math.cos(game.time * 14 + s.x * 0.05)) + 4; X.fillStyle = '#2a1d55'; X.beginPath(); X.ellipse(s.x, s.y, cw + 3, s.r + 3, 0, 0, 7); X.fill(); X.fillStyle = '#ffd34d'; X.beginPath(); X.ellipse(s.x, s.y, cw, s.r, 0, 0, 7); X.fill(); X.fillStyle = '#fff3b0'; X.beginPath(); X.ellipse(s.x - cw * 0.3, s.y - s.r * 0.3, cw * 0.3, s.r * 0.3, 0, 0, 7); X.fill(); continue }
    const rot = s.aim ? Math.atan2(s.vy, s.vx) : s.spin ? game.time * s.spin : (s.rot ?? 0)
    sprite(s.img, s.x, s.y, s.size, rot)
  }
  X.restore()
  // orbit orbs
  if (lvOf('orbit')) { const n = 1 + lvOf('orbit'); for (let i = 0; i < n; i++) { const a = game.time * 4 + i * Math.PI * 2 / n; sprite('p_orbit_orb', P.x + Math.cos(a) * 80, P.y + Math.sin(a) * 80, 34) } }
  // drones
  for (let i = 0; i < lvOf('drone'); i++) { const s = i % 2 ? 1 : -1; sprite('p_shuriken', P.x + s * (70 + Math.floor(i / 2) * 26), P.y + 40, 26, game.time * 10) }
  // player
  if (game.state !== 'title' && P.lives > 0 && !(P.inv > 0 && Math.floor(P.inv * 12) % 2 === 0)) {
    X.fillStyle = 'rgba(20,10,40,0.25)'; X.beginPath(); X.ellipse(P.x + 14, P.y + 56, 34, 11, 0, 0, 7); X.fill()
    sprite('hero_' + P.hero, P.x, P.y, 124, Math.sin(game.time * 3) * 0.04)
  }
  // enemy bullets
  X.save(); X.globalCompositeOperation = 'lighter'; for (const b of ebul) glow(b.boss ? '#ff40e0' : '#ff4f6a', b.x, b.y, (b.r + 4) * 2.4); X.restore() // a hot halo so bullets stand out on the dark graveyard
  for (const b of ebul) sprite(b.boss ? 'ebullet_boss' : 'ebullet_round', b.x, b.y, (b.r + 4) * 2.3) // the picture's rim is the hit size, a little glow outside
  // bolts, fx
  X.save(); X.globalCompositeOperation = 'lighter'
  for (const bo of bolts) { X.strokeStyle = `rgba(200,230,255,${1 - bo.t / 0.18})`; X.lineWidth = 4; X.beginPath(); X.moveTo(bo.a.x, bo.a.y); const mx = (bo.a.x + bo.b.x) / 2 + rnd(-20, 20), my = (bo.a.y + bo.b.y) / 2 + rnd(-20, 20); X.lineTo(mx, my); X.lineTo(bo.b.x, bo.b.y); X.stroke() }
  for (const e of fx) {
    const u = e.t / e.d
    if (e.k === 'ring') { X.strokeStyle = `rgba(255,190,90,${1 - u})`; X.lineWidth = 10 * (1 - u) + 2; X.beginPath(); X.arc(e.x, e.y, e.R * (0.3 + u * 0.7), 0, 7); X.stroke() }
    else if (e.k === 'bomb') { X.fillStyle = `rgba(255,240,200,${0.7 * (1 - u)})`; X.beginPath(); X.arc(e.x, e.y, e.R * u, 0, 7); X.fill() }
    else { for (let i = 0; i < e.n; i++) { const a = i / e.n * Math.PI * 2 + e.seed, r = e.R * (0.2 + u), s = (1 - u) * 7 + 1; X.fillStyle = i % 3 ? `rgba(255,210,120,${1 - u})` : `rgba(255,255,255,${1 - u})`; X.beginPath(); X.arc(e.x + Math.cos(a) * r, e.y + Math.sin(a) * r, s, 0, 7); X.fill() } }
  }
  X.restore()
  // damage numbers
  X.textAlign = 'center'; X.lineJoin = 'round'
  for (const n of nums) { X.font = `900 ${n.crit ? 26 : 18}px ${FONT}`; X.globalAlpha = 1 - n.t / 0.7; X.strokeStyle = '#2a1d55'; X.lineWidth = 5; X.strokeText(n.v, n.x, n.y); X.fillStyle = n.crit ? '#ffd34d' : '#fff'; X.fillText(n.v, n.x, n.y) }
  X.globalAlpha = 1
  if (game.flash > 0) { X.fillStyle = `rgba(255,80,90,${game.flash})`; X.fillRect(0, 0, W, H) }
  if (game.state !== 'title' && !Q.has('cover')) hud() // ?cover: the play picture for the portal covers (tools/cover.py)
  X.restore()
}
function hud() {
  // lives as little hero faces
  for (let i = 0; i < 3; i++) sprite('heart_life', 36 + i * 52, 44, 44, 0, i < P.lives ? 1 : 0.25)
  X.textAlign = 'center'; X.font = `900 34px ${FONT}`; X.lineWidth = 7; X.strokeStyle = '#2a1d55'; X.strokeText(game.score.toLocaleString('en-US'), W / 2 + 40, 56); X.fillStyle = '#fff'; X.fillText(game.score.toLocaleString('en-US'), W / 2 + 40, 56)
  sprite('c_coin', W / 2 - 6, 88, 26); X.textAlign = 'left'; X.font = `900 22px ${FONT}`; X.lineWidth = 5; X.strokeText(game.gold.toLocaleString('en-US'), W / 2 + 12, 96); X.fillStyle = '#ffd34d'; X.fillText(game.gold.toLocaleString('en-US'), W / 2 + 12, 96)
  // wave track on the left: 15 stops, a skull at every boss
  const top = 130, step = 34
  X.lineWidth = 6; X.strokeStyle = '#2a1d55'; X.beginPath(); X.moveTo(26, top); X.lineTo(26, top + step * 14); X.stroke()
  X.lineWidth = 3; X.strokeStyle = '#ffd34d'; X.beginPath(); X.moveTo(26, top + step * 14); X.lineTo(26, top + step * (15 - game.wave)); X.stroke()
  for (let w = 1; w <= 15; w++) {
    const y = top + step * (15 - w), boss = !!BOSSES[w], done = w < game.wave, now = w === game.wave
    X.fillStyle = done ? '#ffd34d' : now ? '#fff' : '#5a4e8a'; X.strokeStyle = '#2a1d55'; X.lineWidth = 3
    X.beginPath(); X.arc(26, y, boss ? 12 : now ? 9 : 6, 0, 7); X.fill(); X.stroke()
    if (boss) sprite(BOSSES[w].img, 26, y, 22, 0, done ? 0.5 : 1)
  }
  // level bar
  X.fillStyle = '#2a1d55'; X.fillRect(90, H - 22, W - 180, 12); X.fillStyle = '#6ff0ff'; X.fillRect(92, H - 20, (W - 184) * clamp(game.xp / game.need, 0, 1), 8)
  X.textAlign = 'center'; X.font = `900 16px ${FONT}`; X.lineWidth = 4; X.strokeText(`${t('lv')} ${game.level}`, W / 2, H - 28); X.fillStyle = '#fff'; X.fillText(`${t('lv')} ${game.level}`, W / 2, H - 28)
  if (game.banner) {
    const b = game.banner, a = b.t < 0.2 ? b.t / 0.2 : b.t > 1.4 ? (1.8 - b.t) / 0.4 : 1, s = 1 + (b.t < 0.2 ? (0.2 - b.t) * 2 : 0)
    X.save(); X.globalAlpha = a; X.translate(W / 2, H * 0.38); X.scale(s, s); X.font = `900 58px ${FONT}`; X.lineWidth = 10; X.strokeText(b.text, 0, 0); X.fillStyle = b.col; X.fillText(b.text, 0, 0); X.restore()
  }
  if (game.hint > 0) { X.globalAlpha = clamp(game.hint, 0, 1); X.font = `800 24px ${FONT}`; X.lineWidth = 6; const s = navigator.maxTouchPoints > 0 || matchMedia('(pointer:coarse)').matches ? t('drag') : t('mouse'); X.strokeText(s, W / 2, H * 0.9); X.fillStyle = '#fff'; X.fillText(s, W / 2, H * 0.9); X.globalAlpha = 1 }
}

// ---------------------------------------------------------------- input: drag moves the hero by the finger's motion, keys too
const input = {
  down: false, px: 0, py: 0, keys: {},
  toField(e) { const sw = innerWidth, sh = innerHeight, sc = Math.min(sw / W, sh / H); return [(e.clientX - (sw - W * sc) / 2) / sc, (e.clientY - (sh - H * sc) / 2) / sc] },
  apply(dt) {
    let kx = (this.keys.ArrowRight || this.keys.KeyD ? 1 : 0) - (this.keys.ArrowLeft || this.keys.KeyA ? 1 : 0), ky = (this.keys.ArrowDown || this.keys.KeyS ? 1 : 0) - (this.keys.ArrowUp || this.keys.KeyW ? 1 : 0)
    if (kx || ky) { P.x += kx * 520 * dt; P.y += ky * 520 * dt }
    if (BOT && !game.noWaves) botMove(dt)
    P.x = clamp(P.x, 30, W - 30); P.y = clamp(P.y, 120, H - 60)
  },
}
C.addEventListener('pointerdown', (e) => { if (game.state !== 'run') return; input.down = true; [input.px, input.py] = input.toField(e); game.hint = Math.min(game.hint, 0.4) })
addEventListener('pointermove', (e) => {
  if (game.state !== 'run') return
  const [x, y] = input.toField(e)
  if (e.pointerType === 'mouse' && !input.down) { P.x += (x - P.x) * 0.5; P.y += (y - 30 - P.y) * 0.5; input.px = x; input.py = y; return } // mouse: the hero follows the cursor
  if (!input.down) return
  P.x += (x - input.px) * 1.25; P.y += (y - input.py) * 1.25; input.px = x; input.py = y
})
addEventListener('pointerup', () => { input.down = false })
addEventListener('keydown', (e) => { input.keys[e.code] = true; if (e.code === 'KeyP') togglePause() }) // no Esc: Playgama keeps it (PLAYGAMA.md 1.5.2)
addEventListener('keyup', (e) => { input.keys[e.code] = false })
// test pilot: dodges bullets, drifts toward the densest column of foes
function botMove(dt) {
  let tx = P.x, ty = H * 0.78
  const near = foes.filter((f) => f.y > 0).sort((a, b) => b.y - a.y)[0]
  if (near) tx = near.x
  let ax = 0, ay = 0
  for (const b of ebul) { const dx = P.x - b.x, dy = P.y - b.y, d = dx * dx + dy * dy; if (d < 130 * 130) { ax += dx / (d + 1) * 9000; ay += dy / (d + 1) * 9000 } }
  for (const f of foes) { const dx = P.x - f.x, dy = P.y - f.y, d = dx * dx + dy * dy; if (d < (f.r + 90) ** 2) { ax += dx / (d + 1) * 14000; ay += dy / (d + 1) * 14000 } }
  P.x += clamp((tx - P.x) * 3 + ax, -460, 460) * dt; P.y += clamp((ty - P.y) * 2 + ay, -460, 460) * dt
}

// ---------------------------------------------------------------- screens
const show = (id) => $(id).classList.remove('hide'), hide = (id) => $(id).classList.add('hide')
function texts() {
  document.documentElement.lang = lang; FONT = fontFor(lang); document.body.style.fontFamily = FONT
  $('tTitle').textContent = t('title'); $('playBtn').textContent = t('play')
  $('againBtn').textContent = t('again'); $('homeBtn').textContent = t('home'); $('contBtn').textContent = t('cont')
  $('pTitle').textContent = t('paused'); $('resumeBtn').textContent = t('resume'); $('pHomeBtn').textContent = t('quit')
  $('sTitle').textContent = t('settings'); $('sClose').textContent = t('close'); $('shopTx').textContent = t('upgrades'); $('oGoldL').textContent = t('gold')
  heroList()
}
function heroList() {
  const box = $('heroes'); box.innerHTML = ''
  for (const h of HEROES) {
    const own = save.owned.includes(h), cost = HERO_COST[h]
    const el = document.createElement('div'); el.className = 'hero' + (h === save.hero ? ' on' : '') + (own ? '' : ' locked') + (!own && save.gold >= cost ? ' can' : '')
    el.innerHTML = own ? `<img src="assets/hero_${h}.webp"><span>${t(h)}</span>` : `<img src="assets/hero_${h}.webp"><img class="lock" src="assets/c_lock.webp"><span class="price"><img src="assets/c_coin.webp">${cost.toLocaleString('en-US')}</span>`
    el.onclick = () => {
      audio.init()
      if (!own) { if (save.gold < cost) { audio.play('deny'); el.classList.remove('no'); void el.offsetWidth; el.classList.add('no'); return } save.gold -= cost; save.owned.push(h); audio.play('buy') } else audio.play('click')
      save.hero = h; store(); heroList()
    }
    box.appendChild(el)
  }
  $('heroInfo').textContent = t('w_' + save.hero)
  $('goldN').textContent = save.gold.toLocaleString('en-US')
  $('shopBtn').classList.toggle('dot', META.some((m) => mLv(m.id) < m.max && save.gold >= metaCost(m)) || HEROES.some((h) => !save.owned.includes(h) && save.gold >= HERO_COST[h]))
}
function shopPanel() {
  const rows = $('uRows'); rows.innerHTML = ''
  $('uTitle').textContent = t('upgrades'); $('uClose').textContent = t('close'); $('uGold').textContent = save.gold.toLocaleString('en-US')
  for (const m of META) {
    const L = mLv(m.id), cost = metaCost(m), full = L >= m.max
    const r = document.createElement('div'); r.className = 'urow'
    r.innerHTML = `<img src="assets/${m.icon}.webp"><div class="ut"><b>${t('m_' + m.id)}</b><span>${L && !full ? t('m_' + m.id + '_d').replace('#', m.per * L) + ' → ' + m.per * (L + 1) + (m.id === 'start' ? '' : '%') : t('m_' + m.id + '_d').replace('#', m.per * Math.max(1, L))}</span><i>${t('lv')} ${L} / ${m.max}</i></div>`
    const b = document.createElement('button'); b.className = 'buy' + (!full && save.gold >= cost ? ' can' : '')
    b.innerHTML = full ? 'MAX' : `<img src="assets/c_coin.webp">${cost.toLocaleString('en-US')}`
    b.disabled = full
    b.onclick = () => { if (save.gold < cost) { audio.play('deny'); return } save.gold -= cost; save.meta[m.id] = L + 1; store(); audio.play('buy'); shopPanel(); heroList() }
    r.appendChild(b); rows.appendChild(r)
  }
  show('shop')
}
function settingsPanel() {
  const rows = $('sRows'); rows.innerHTML = ''
  const row = (label, value, fn) => { const r = document.createElement('div'); r.className = 'row'; r.innerHTML = `<span>${label}</span>`; const b = document.createElement('button'); b.textContent = value; b.onclick = () => { fn(); audio.play('click'); settingsPanel() }; r.appendChild(b); rows.appendChild(r) }
  const vol = (v) => `${Math.round(v * 100)}%`, nextVol = (v) => (v >= 1 ? 0 : Math.round((v + 0.2) * 10) / 10)
  row(t('music'), vol(save.music), () => { save.music = nextVol(save.music); store(); audio.apply() })
  row(t('sfx'), vol(save.sfx), () => { save.sfx = nextVol(save.sfx); store(); audio.apply() })
  row(t('shake'), save.shake ? t('on') : t('off'), () => { save.shake = !save.shake; store() })
  row(t('nums'), save.nums ? t('on') : t('off'), () => { save.nums = !save.nums; store() })
  row(t('lang'), LANG_NAMES[lang], () => { lang = LANGS[(LANGS.indexOf(lang) + 1) % LANGS.length]; save.lang = lang; store(); texts(); $('sTitle').textContent = t('settings'); $('sClose').textContent = t('close') })
  show('panel')
}
function startRun() {
  audio.init(); resetRun(); game.state = 'run'; game.hint = 3
  hide('title'); hide('over'); show('pauseBtn'); initDecos(); platform.banner(false); platform.msg('gameplay_started')
  const jump = +Q.get('wave') // test only: start at a later wave with that many cards already taken
  if (BOT && jump > 1) { game.wave = jump; game.waveT = 0; for (let i = 0; i < (jump - 1) * 2.4; i++) { const c = pick(CARDS.filter((c) => lvOf(c.id) < MAXLV)); up[c.id] = lvOf(c.id) + 1; game.level++ } banner(`${t('wave')} ${jump}`) }
}
function finish(won) {
  if (game.state === 'over') return
  game.levelAt[game.wave] = game.level
  game.state = 'over'; runs++; hide('pauseBtn'); platform.msg('gameplay_stopped')
  const reached = won ? 15 : game.wave
  if (won) game.gold += 200
  const earned = Math.round(game.gold * (1 + 0.1 * mLv('greed'))); save.gold += earned
  $('oGold').textContent = '+' + earned.toLocaleString('en-US')
  save.best = Math.max(save.best, game.score); save.bestWave[P.hero] = Math.max(save.bestWave[P.hero] || 0, reached); store()
  $('oTitle').textContent = won ? t('cleared') : t('over')
  $('oWaveL').textContent = t('reached'); $('oWave').textContent = `${reached} / 15`
  $('oKillL').textContent = t('kills'); $('oKill').textContent = game.kills.toLocaleString('en-US')
  $('oScoreL').textContent = t('score'); $('oScore').textContent = game.score.toLocaleString('en-US')
  $('oBestL').textContent = t('best'); $('oBest').textContent = save.best.toLocaleString('en-US')
  $('contBtn').classList.toggle('hide', won || game.cont || !platform.ready)
  if (won) audio.play('win')
  setTimeout(() => platform.banner(true), 600)
  setTimeout(() => show('over'), 600)
  if (BOT && Q.has('loop')) setTimeout(() => { if (game.state === 'over') startRun() }, 4000) // soak test: keep playing
  window.__runs = (window.__runs || []).concat([{ hero: P.hero, wave: reached, level: game.level, kills: game.kills, score: game.score, won, bosses: game.bossN, gold: earned, time: Math.round(game.time), levelAt: game.levelAt, hitAt: game.hitAt, bossT: game.bossT, cards: { ...up } }])
}
function togglePause() {
  if (game.state === 'run') { game.state = 'paused'; show('pause') } else if (game.state === 'paused') { hide('pause'); game.state = 'run' }
}
function goHome() { hide('shop'); game.state = 'title'; foes = []; shots = []; ebul = []; gems = []; fx = []; nums = []; bolts = []; game.wave = 1; hide('over'); hide('pause'); hide('pauseBtn'); show('title'); heroList() }
$('playBtn').onclick = () => { audio.play('click'); startRun() }
$('againBtn').onclick = () => platform.interstitial(startRun)
$('homeBtn').onclick = () => platform.interstitial(goHome)
$('pHomeBtn').onclick = () => { hide('pause'); game.state = 'run'; finish(false) } // ends the run: result screen, the gold earned so far is kept
$('resumeBtn').onclick = togglePause
$('pauseBtn').onclick = togglePause
$('setBtn').onclick = () => settingsPanel()
$('sClose').onclick = () => hide('panel')
$('shopBtn').onclick = () => { audio.init(); audio.play('click'); shopPanel() }
$('uClose').onclick = () => { hide('shop'); heroList() }
$('contBtn').onclick = () => platform.rewardedAd((ok) => { if (!ok) return; platform.banner(false); game.cont = true; P.lives = 1; P.inv = 3; ebul = []; hide('over'); show('pauseBtn'); game.state = 'run' })
document.addEventListener('visibilitychange', () => { audio.apply(); if (document.hidden && game.state === 'run') togglePause() })

// ---------------------------------------------------------------- loop
function resize() { const d = Math.min(2, devicePixelRatio || 1); C.width = Math.round(innerWidth * d); C.height = Math.round(innerHeight * d); H = clamp(Math.round(W * innerHeight / innerWidth), 900, 1170)
  const sc = Math.min(innerWidth / W, innerHeight / H), u = $('ui').style // buttons and screens sit on the playfield, not the far screen edge
  const wide = innerWidth > innerHeight * 1.15 // landscape: menus use the whole window, the field is too narrow for them
  document.body.classList.toggle('wide', wide)
  $('pauseBtn').style.right = wide ? (innerWidth - W * sc) / 2 + 12 + 'px' : '' // in a run the pause button stays on the field's corner
  if (wide) { u.left = u.top = '0px'; u.width = innerWidth + 'px'; u.height = innerHeight + 'px' } else { u.left = (innerWidth - W * sc) / 2 + 'px'; u.top = (innerHeight - H * sc) / 2 + 'px'; u.width = W * sc + 'px'; u.height = H * sc + 'px' } }
addEventListener('resize', resize); resize()
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000 || 0); last = now
  audio.music(trackNow())
  if (game.state === 'run') { tick(dt); if (game.hint > 0) game.hint -= dt * 0.5 }
  else if (game.state === 'title') { game.time += dt; game.scroll += dt * 60; updateDecos(dt) }
  draw()
  requestAnimationFrame(frame)
}
async function boot() {
  await platform.init()
  await readSave()
  if (BOT && HEROES.includes(Q.get('hero'))) { save.hero = P.hero = Q.get('hero'); if (!save.owned.includes(save.hero)) save.owned.push(save.hero) } // tests: that hero, owned
  const asked = (window.bridge?.platform?.language || navigator.language || 'en').toLowerCase().slice(0, 2)
  lang = save.lang || (TEXT[asked] ? asked : 'en')
  if (TEXT[Q.get('lang')]) lang = Q.get('lang')
  texts(); initDecos(); requestAnimationFrame(frame); platform.banner(true)
  await loaded
  platform.msg('game_ready')
  if (BOT && !SIM) setTimeout(startRun, 300)
}
boot()
// balance tools: damage per second on a row of still dummies, and whole runs played by the test pilot without drawing
function measureDps(hero, cards, secs = 20, one = false) { // one = a single boss-sized target
  save.hero = hero; resetRun(); up = Object.assign({ main: 1 }, cards); game.state = 'run'; game.noWaves = true; P.x = W / 2; P.y = H * 0.8
  if (one) spawn('dummy', W / 2, P.y - 380, { r: 90 })
  else for (let i = 0; i < 5; i++) spawn('dummy', W / 2 + (i - 2) * 90, P.y - 300) // inside missile and lightning reach, like a foe coming close
  const dt = 1 / 60; for (let i = 0; i < secs * 60; i++) tick(dt)
  game.noWaves = false; const d = game.dealt / secs; foes = []; game.state = 'title'; return Math.round(d * 10) / 10
}
function simRun(hero, maxSecs = 900) {
  save.hero = hero; startRun(); const dt = 1 / 60
  for (let i = 0; i < maxSecs * 60 && game.state === 'run'; i++) tick(dt)
  if (game.state === 'run') finish(false)
  return window.__runs[window.__runs.length - 1]
}
if (BOT && HEROES.includes(Q.get('hero'))) save.hero = P.hero = Q.get('hero')
if (BOT || Q.has('debug')) window.__sh = { game, P, save, audio, platform, startRun, openCards, goHome, finish, shopPanel, heroList, settings: settingsPanel, measureDps, simRun, HEROES, CARDS, get foes() { return foes }, get up() { return up } }
