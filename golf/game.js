// Bonk Golf: nine silly holes, one drag. Pull back = power + aim, let go = BONK.
import * as THREE from './vendor/three.module.min.js?v=e047cb8'
import { TEXT, LANGUAGES } from './text.js?v=e047cb8'
import { HOLES, THEMES } from './holes.js?v=e047cb8'
import { audio } from './sound.js?v=e047cb8'
import { makeCourse, stepBall, preview, launch, CLUBS, ORDER, SURF, R, WATER_Y, CUP_R, moverX, MOVER_H, ellD } from './course.js?v=e047cb8'

const Q = new URLSearchParams(location.search)
const BUILD = '2026-11-28'
const DEBUG = Q.has('debug'), TURBO = Math.max(1, Number(Q.get('turbo') || 1))
const FEEDBACK_URL = 'https://www.youtube.com/@KRYPTOVYN'
const $ = (id) => document.getElementById(id)
const clamp = (v, a, b) => Math.max(a, Math.min(b, v))
const lerp = (a, b, t) => a + (b - a) * t
const rnd = (a, b) => a + Math.random() * (b - a)
const ease = (t) => t * t * (3 - 2 * t)
const seeded = (a) => () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296 }

// ---------------------------------------------------------------- save + text
const save = { music: 0.6, sfx: 0.8, shake: 1, vib: 1, lang: '', best: 0, bestHoles: Array(18).fill(0), runs: 0, hio: 0, hint: 0, bestC: { front: 0, back: 0, full: 0 }, course: 'front', frontDone: 0, stars: [], cleared: [] }
const SAVE_KEY = 'bonk_golf_v1'
try { const raw = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null'); if (raw && typeof raw === 'object') for (const k in save) if (typeof raw[k] === typeof save[k]) save[k] = raw[k] } catch {}
if (!Array.isArray(save.bestHoles)) save.bestHoles = []
save.bestHoles = Array.from({ length: 18 }, (_, i) => Number(save.bestHoles[i]) || 0)
// best per course; the old single best was the front nine. Finishing the front nine once opens the back nine.
if (!save.bestC || typeof save.bestC !== 'object') save.bestC = {}
for (const k of ['front', 'back', 'full']) save.bestC[k] = Number(save.bestC[k]) || 0
if (!save.bestC.front && save.best) save.bestC.front = save.best
if (save.bestC.front || save.bestC.full) save.frontDone = 1
if (!['front', 'back', 'full'].includes(save.course)) save.course = 'front'
for (const k of ['stars', 'cleared']) save[k] = Array.from({ length: HOLES.length }, (_, i) => Number(save[k]?.[i]) || 0)
for (let i = 0; i < HOLES.length; i++) if (save.bestHoles[i]) save.cleared[i] = 1 // older saves: a hole with a best score was finished
function writeSave() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)) } catch {} }
let lang = Q.get('lang') || save.lang || ((navigator.language || 'en').toLowerCase().startsWith('ko') ? 'ko' : 'en')
if (!TEXT[lang]) lang = 'en'
const t = (key) => TEXT[lang][key] ?? TEXT.en[key] ?? key
// the three courses: [first hole index, last + 1]
const COURSES = { front: [0, 9], back: [9, 18], full: [0, 18], r3: [18, 27], r4: [27, 36] }
const courseHoles = (c) => HOLES.slice(COURSES[c][0], COURSES[c][1])
const coursePar = (c) => courseHoles(c).reduce((s, h) => s + h.par, 0)
// the stage map: regions of nine holes, each with its own look. A region opens when the hole before it is cleared and the
// total stars reach need (BALANCE.md). Stars per hole: par 1, birdie 2, eagle or better (or a hole in one) 3.
const REGIONS = [
  { id: 'front', from: 0, to: 9, need: 0, bg: ['#5fc0ff', '#8fdc5a'] },
  { id: 'back', from: 9, to: 18, need: 6, bg: ['#24306e', '#ff9ab8'] },
  { id: 'r3', from: 18, to: 27, need: 20, bg: ['#6a2ab8', '#ffb04a'] },
  { id: 'r4', from: 27, to: 36, need: 34, bg: ['#1a2a6a', '#4ae0ff'] },
]
const regionOf = (i) => REGIONS.find((r) => i >= r.from && i < r.to) || REGIONS[0]
const starsFor = (strokes, par) => strokes === 1 || strokes <= par - 2 ? 3 : strokes === par - 1 ? 2 : strokes === par ? 1 : 0
const totalStars = () => save.stars.reduce((a, b) => a + b, 0)
const regionOpen = (r) => r.from === 0 || (!!save.cleared[r.from - 1] && totalStars() >= r.need)
const holeOpen = (i) => regionOpen(regionOf(i)) && (i === regionOf(i).from || !!save.cleared[i - 1])
const backOpen = () => regionOpen(REGIONS[1])
const vsPar = (d) => d === 0 ? t('even') : d > 0 ? `+${d}` : `${d}`

// ---------------------------------------------------------------- portal (Playgama bridge)
const game = { state: 'load', time: 0, hole: 0, course: 'front', first: 0, last: 9, single: false, phase: '', pt: 0, strokes: 0, scores: [], adHold: false, hitstop: 0, shake: 0, punch: 0, freeMull: true, mullUsed: false, canMull: false, lastBad: false }
const platform = {
  ready: false, audioOn: true, paused: false, adOpen: false, adPending: false,
  message(name) { try { if (this.ready) window.bridge?.platform?.sendMessage(name) } catch {} },
  track(name, data = {}) { if (this.ready) try { window.bridge.analytics?.send(name, { build_version: BUILD, ...data }) } catch {} },
  async init() {
    const bridge = window.bridge
    if (!bridge || window.__noBridge) return
    try {
      bridge.engine = 'javascript'
      await bridge.initialize()
      this.ready = true
      this.audioOn = bridge.platform.isAudioEnabled !== false
      const E = bridge.EVENT_NAME
      bridge.platform.on(E.AUDIO_STATE_CHANGED, (on) => { this.audioOn = on; applyVolume() })
      // a pause that comes with our own ad only holds the game (the ad closing ends it); any other pause opens the pause screen
      bridge.platform.on(E.PAUSE_STATE_CHANGED, (on) => { this.paused = on; applyVolume(); if (on && !this.adPending && !this.adOpen) pauseRun() })
      bridge.advertisement.on(E.INTERSTITIAL_STATE_CHANGED, (s) => this.onAd(s))
      bridge.advertisement.on(E.REWARDED_STATE_CHANGED, (s) => this.onReward(s))
      if (!Q.get('lang') && !save.lang) { const l = String(bridge.platform.language || '').slice(0, 2); if (TEXT[l]) lang = l }
    } catch (error) { console.warn('bridge', error) }
  },
  // the portal may pause the game when an ad opens and never send the resume: the ad closing (or failing) always ends that pause
  clearAd() { this.adOpen = false; this.adPending = false; this.paused = false; applyVolume(); last = performance.now() },
  onAd(state) {
    if (state === 'opened') { this.adOpen = true; applyVolume() }
    if (state === 'closed' || state === 'failed') { this.clearAd(); this.afterAd() }
  },
  rewardDone: null, rewarded: false,
  onReward(state) {
    if (state === 'opened') { this.adOpen = true; applyVolume() }
    if (state === 'rewarded') this.rewarded = true
    if (state === 'closed' || state === 'failed') {
      this.clearAd(); clearTimeout(this.rewWait)
      const done = this.rewardDone; this.rewardDone = null
      const end = () => { const ok = this.rewarded; this.rewarded = false; done?.(ok) }
      if (state === 'closed' && !this.rewarded && done) setTimeout(end, 500); else end()
    }
  },
  lastAd: 0, adNext: null,
  afterAd() { const next = this.adNext; this.adNext = null; clearTimeout(this.adWait); next?.() },
  // between holes (after the 3rd and 6th) and before a new round; never closer than 2.5 minutes; never in the first three holes of the first round
  interstitial(next) {
    if (!this.ready || Date.now() - this.lastAd < 150000 || (save.runs < 1 && game.hole - game.first < 3 && game.state === 'run')) { next(); return }
    this.lastAd = Date.now(); next(); game.adHold = true; this.adPending = true
    this.adNext = () => { game.adHold = false }
    this.adWait = setTimeout(() => { if (!this.adOpen) { this.clearAd(); this.afterAd() } }, 2500) // no ad came: go on
    try { window.bridge.advertisement.showInterstitial() } catch { this.clearAd(); this.afterAd() }
  },
  rewardedAd(done) {
    if (!this.ready || this.rewardDone) { done(false); return }
    this.rewardDone = done; this.rewarded = false; this.lastAd = Date.now(); this.adPending = true
    this.rewWait = setTimeout(() => { if (!this.adOpen && this.rewardDone) { const d = this.rewardDone; this.rewardDone = null; this.clearAd(); d(false) } }, 4000) // no ad came
    try { window.bridge.advertisement.showRewarded() } catch { clearTimeout(this.rewWait); this.rewardDone = null; this.clearAd(); done(false) }
  },
}
function applyVolume() {
  audio.vol.music = save.music; audio.vol.sfx = save.sfx
  audio.vol.live = platform.audioOn && !platform.adOpen && !platform.paused && !document.hidden && !Q.has('mute')
  audio.apply()
}
document.addEventListener('visibilitychange', () => { applyVolume(); if (document.hidden) pauseRun(); last = performance.now() })
const buzz = (ms) => { if (save.vib) try { navigator.vibrate?.(ms) } catch {} }

// ---------------------------------------------------------------- renderer + things that live for the whole game
const renderer = new THREE.WebGLRenderer({ canvas: $('view'), antialias: true, powerPreference: 'high-performance' })
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2))
const scene = new THREE.Scene()
const camera = new THREE.PerspectiveCamera(55, 1, 0.3, 900)
let baseFov = 55, portrait = true
function resize() {
  const w = innerWidth, h = innerHeight
  renderer.setSize(w, h, false); camera.aspect = w / h; portrait = w / h < 0.85; baseFov = portrait ? 68 : 50; camera.fov = baseFov; camera.updateProjectionMatrix()
}
addEventListener('resize', resize); resize()
const hemi = new THREE.HemisphereLight(0xffffff, 0x88aa66, 1.5), sun = new THREE.DirectionalLight(0xffffff, 1.7)
sun.position.set(-40, 80, 30); scene.add(hemi, sun)
scene.fog = new THREE.Fog(0xc9efff, 140, 520)

const OUT = new THREE.MeshBasicMaterial({ color: 0x1d2a3a, side: THREE.BackSide })
const lam = (color, extra) => new THREE.MeshLambertMaterial({ color, ...extra })
const basic = (color, extra) => new THREE.MeshBasicMaterial({ color, ...extra })
function part(geo, mat, x = 0, y = 0, z = 0, outline = 0.06) {
  const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z)
  if (outline) { const o = new THREE.Mesh(geo, OUT); o.scale.setScalar(1 + outline); m.add(o) }
  return m
}
const SPH = new THREE.SphereGeometry(1, 20, 14), ICO = new THREE.IcosahedronGeometry(1, 1), CYL = new THREE.CylinderGeometry(1, 1, 1, 12), BOX = new THREE.BoxGeometry(1, 1, 1)
const CIRCLE = new THREE.CircleGeometry(1, 28).rotateX(-Math.PI / 2)

// sky: one tall gradient picture
const skyCanvas = document.createElement('canvas'); skyCanvas.width = 4; skyCanvas.height = 256
const skyTex = new THREE.CanvasTexture(skyCanvas); skyTex.colorSpace = THREE.SRGBColorSpace; scene.background = skyTex
function paintSky(c) { const g = skyCanvas.getContext('2d'), grad = g.createLinearGradient(0, 0, 0, 256); grad.addColorStop(0, c[0]); grad.addColorStop(0.62, c[1]); grad.addColorStop(1, c[1]); g.fillStyle = grad; g.fillRect(0, 0, 4, 256); skyTex.needsUpdate = true }

// water + far ground
const water = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), lam(0x3fb7f2, { transparent: true, opacity: 0.86 })); water.position.y = WATER_Y; scene.add(water)
const farGround = new THREE.Mesh(new THREE.PlaneGeometry(1400, 1400).rotateX(-Math.PI / 2), lam(0x55a043)); farGround.position.y = -0.12; scene.add(farGround)

// clouds
const clouds = new THREE.Group(); scene.add(clouds)
{ const m = basic(0xffffff, { fog: false }); for (let i = 0; i < 9; i++) { const g = new THREE.Group(); for (let k = 0; k < 3; k++) { const p = new THREE.Mesh(ICO, m); p.scale.set(rnd(9, 15), rnd(4, 6), rnd(6, 9)); p.position.set(k * 9 - 9, rnd(-1, 1.5), rnd(-2, 2)); g.add(p) } g.position.set(rnd(-260, 260), rnd(60, 100), rnd(-420, 60)); clouds.add(g) } }

// ball
const ballMesh = part(SPH, lam(0xffffff), 0, 0, 0, 0.14); ballMesh.scale.setScalar(R * 1.1); scene.add(ballMesh)
const ballShadow = new THREE.Mesh(CIRCLE, basic(0x10301a, { transparent: true, opacity: 0.32, depthWrite: false })); scene.add(ballShadow)
const ball = { x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, mode: 'rest', t: 0 }

// flag + cup
const flag = new THREE.Group(); scene.add(flag)
const cupMesh = new THREE.Mesh(CIRCLE, basic(0x15202a)); cupMesh.scale.setScalar(CUP_R); cupMesh.position.y = 0.03
const cupRim = new THREE.Mesh(new THREE.RingGeometry(CUP_R, CUP_R + 0.14, 28).rotateX(-Math.PI / 2), basic(0xffffff)); cupRim.position.y = 0.035
const pole = part(CYL, lam(0xfff6d8), 0, 2.7, 0, 0); pole.scale.set(0.07, 5.4, 0.07); { const o = new THREE.Mesh(CYL, OUT); o.scale.set(1.9, 1.01, 1.9); pole.add(o) }
const flagGeo = new THREE.BufferGeometry(); flagGeo.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 0, -1.3, 0, 2.2, -0.65, 0], 3)); flagGeo.computeVertexNormals()
const cloth = new THREE.Mesh(flagGeo, basic(0xff4a4a, { side: THREE.DoubleSide })); cloth.position.set(0, 5.3, 0)
const knob = part(SPH, lam(0xffd23a), 0, 5.45, 0, 0.2); knob.scale.setScalar(0.16)
flag.add(cupMesh, cupRim, pole, cloth, knob)

// ---------------------------------------------------------------- the golfer: a chibi kid (big head, small pear body) in a cap and polo
// Local space: stands at x = GX facing +x (the ball is at the origin), the target is toward -z.
// Toon look: three light steps (gradient map), a dark back-face outline of even thickness, a soft rim light so it reads on grass.
const TOON_STEPS = new THREE.DataTexture(new Uint8Array([150, 210, 255]), 3, 1, THREE.RedFormat)
TOON_STEPS.minFilter = TOON_STEPS.magFilter = THREE.NearestFilter; TOON_STEPS.needsUpdate = true
const rimLight = (sh) => { sh.fragmentShader = sh.fragmentShader.replace('#include <opaque_fragment>', 'float rimK = 1.0 - max(dot(normalize(vViewPosition), normal), 0.0);\noutgoingLight += vec3(1.0, 0.96, 0.86) * smoothstep(0.6, 0.95, rimK) * 0.3;\n#include <opaque_fragment>') }
const toon = (color) => { const m = new THREE.MeshToonMaterial({ color, gradientMap: TOON_STEPS }); m.onBeforeCompile = rimLight; m.customProgramCacheKey = () => 'toonRim'; return m }
const BALL = new THREE.SphereGeometry(1, 36, 26) // smooth: no facets on the round parts
const LINE = 0.032 // outline thickness in metres
// a mesh with an outline shell; hx/hy/hz = its half size along each axis (so thin parts get the same line as fat ones)
function tp(geo, mat, x, y, z, sx, sy = sx, sz = sx, line = 1, hx = sx, hy = sy, hz = sz) {
  const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.scale.set(sx, sy, sz)
  if (line) { const o = new THREE.Mesh(geo, OUT); o.scale.set(1 + LINE * line / hx, 1 + LINE * line / hy, 1 + LINE * line / hz); m.add(o) }
  return m
}
const golfer = new THREE.Group(); scene.add(golfer)
const GX = -1.36, gBody = new THREE.Group(); gBody.position.x = GX; golfer.add(gBody)
// soft contact shadow: a round blur painted once
const softShadow = (() => { const cv = document.createElement('canvas'); cv.width = cv.height = 64; const g = cv.getContext('2d'), gr = g.createRadialGradient(32, 32, 2, 32, 32, 31); gr.addColorStop(0, 'rgba(0,0,0,.55)'); gr.addColorStop(0.55, 'rgba(0,0,0,.32)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); const tx = new THREE.CanvasTexture(cv); tx.colorSpace = THREE.SRGBColorSpace; return tx })()
const gShadow = new THREE.Mesh(CIRCLE, basic(0x10301a, { map: softShadow, transparent: true, opacity: 0.85, depthWrite: false })); gShadow.scale.set(1.05, 1, 0.95); gShadow.position.set(GX + 0.05, 0.04, 0); golfer.add(gShadow)
const gHips = new THREE.Group(); gBody.add(gHips) // turns a little with the swing
const gTwist = new THREE.Group(); gBody.add(gTwist) // shoulders, head and arms: turn all the way
const C_SKIN = 0xffdcc6, C_SHIRT = 0x7cc8ff, C_SHORTS = 0x2d3a6e, C_CAP = 0xff6b5e, C_WHITE = 0xffffff, C_HAIR = 0x7a4a2a
const SKIN = toon(C_SKIN), SHIRT = toon(C_SHIRT), SHORTS = toon(C_SHORTS), CAPM = toon(C_CAP), WHITE = toon(C_WHITE), HAIR = toon(C_HAIR), SOLE = toon(C_CAP)
const METAL = toon(0xc9d3de), GRIPM = toon(0x2a2f3a), DARK = basic(0x2a1e30), IRIS = basic(0x5b3f8c), PINK = basic(0xff8f9a, { transparent: true, opacity: 0.55 })
// head: an ellipsoid, the biggest part (1.12 wide; the body is 0.78). Eyes sit a bit below the middle, under the brim.
const HEAD_R = 0.56, HEAD_K = [1, 0.94, 1.02], HEAD_Y = 1.62, EYE_Y = -0.12, EYE_Z = 0.17, BROW_Y = 0.06, MOUTH_Y = -0.34
const face = { mood: 'idle', hold: 0, blink: 2.5, blinkT: 0, eye: 1, brow: 0, happy: 0 }
{
  // short legs, round shorts (hips turn a little)
  for (const s of [-1, 1]) { const leg = new THREE.CapsuleGeometry(0.085, 0.16, 4, 14); gHips.add(tp(leg, SKIN, 0.04, 0.32, 0.17 * s, 1, 1, 1, 1, 0.085, 0.165, 0.085)) }
  gHips.add(tp(BALL, SHORTS, 0, 0.54, 0, 0.4, 0.2, 0.38))
  // chunky shoes stay planted (body, not hips)
  for (const s of [-1, 1]) {
    gBody.add(tp(CYL, WHITE, 0.05, 0.2, 0.17 * s, 0.095, 0.08, 0.095, 1, 0.095, 0.04, 0.095)) // sock
    gBody.add(tp(BALL, SOLE, 0.1, 0.06, 0.18 * s, 0.27, 0.075, 0.165)) // sole
    gBody.add(tp(BALL, WHITE, 0.09, 0.135, 0.18 * s, 0.25, 0.135, 0.155)) // shoe
    gBody.add(tp(BALL, SHORTS, 0.24, 0.2, 0.18 * s, 0.06, 0.03, 0.085, 0)) // laces
  }
  // pear body in the polo: wide at the bottom, narrow at the neck
  const prof = [[0, 0], [0.2, 0.005], [0.33, 0.05], [0.385, 0.14], [0.39, 0.24], [0.36, 0.34], [0.29, 0.43], [0.19, 0.5], [0.08, 0.535], [0, 0.54]].map(([r, y]) => new THREE.Vector2(r, y - 0.27))
  gTwist.add(tp(new THREE.LatheGeometry(prof, 36), SHIRT, 0, 0.79, 0, 1, 1, 1, 1, 0.39, 0.27, 0.39))
  // white collar ring at the neck gap, two flaps, buttons, a coral chest dot
  const collar = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.05, 10, 32), WHITE); collar.rotation.x = Math.PI / 2; collar.position.set(0.01, 1.06, 0)
  { const o = new THREE.Mesh(collar.geometry, OUT); o.scale.set(1.08, 1.08, 1.6); collar.add(o) } gTwist.add(collar)
  for (const s of [-1, 1]) { const flap = tp(BALL, WHITE, 0.17, 1.02, 0.08 * s, 0.1, 0.035, 0.075, 1); flap.rotation.set(0.5 * s, 0, -0.9); gTwist.add(flap) }
  for (const y of [0.96, 0.88]) gTwist.add(tp(BALL, WHITE, Math.sqrt(Math.max(0, 0.39 ** 2 - (y - 0.79) ** 2 * 1.6)) * 0.86 + 0.02, y, 0, 0.02, 0.02, 0.02, 0))
  gTwist.add(tp(BALL, CAPM, 0.32, 0.9, 0.17, 0.02, 0.05, 0.05, 0))
  // head
  const head = new THREE.Group(); head.position.set(0.04, HEAD_Y, 0); gTwist.add(head); golfer.userData.head = head
  head.add(tp(BALL, SKIN, 0, 0, 0, HEAD_R * HEAD_K[0], HEAD_R * HEAD_K[1], HEAD_R * HEAD_K[2]))
  for (const s of [-1, 1]) head.add(tp(BALL, SKIN, -0.03, -0.08, 0.56 * s, 0.075, 0.1, 0.06))
  // hair peeking out at the sides and the back under the cap
  head.add(tp(BALL, HAIR, -0.12, 0.0, 0, 0.53, 0.44, 0.585)) // a bob: shows at the back and sides, the face covers its front
  for (const s of [-1, 1]) head.add(tp(BALL, HAIR, -0.5, -0.26, 0.2 * s, 0.12, 0.1, 0.12, 1)) // two little flicks at the nape
  // a small round cap with a brim that points forward, a white button and badge
  head.add(tp(new THREE.SphereGeometry(1, 36, 18, 0, Math.PI * 2, 0, Math.PI * 0.5), CAPM, -0.02, 0.14, 0, 0.6, 0.42, 0.61))
  const brim = tp(BALL, CAPM, 0.47, 0.15, 0, 0.36, 0.04, 0.42); brim.rotation.z = -0.14; head.add(brim)
  head.add(tp(BALL, WHITE, -0.02, 0.56, 0, 0.06, 0.035, 0.06, 1))
  head.add(tp(BALL, WHITE, 0.5, 0.33, 0, 0.025, 0.08, 0.1, 0))
  // face on the ellipsoid: big tall eyes close together (dark, purple lower half, two shines), brows, blush, mouths for each mood
  const F = (y, z) => HEAD_R * HEAD_K[0] * Math.sqrt(Math.max(0, 1 - (y / (HEAD_R * HEAD_K[1])) ** 2 - (z / (HEAD_R * HEAD_K[2])) ** 2))
  face.eyes = []; face.joy = []; face.brows = []
  for (const s of [-1, 1]) {
    const yaw = -Math.asin(EYE_Z / (HEAD_R * HEAD_K[2])) * s
    const e = new THREE.Group(); e.position.set(F(EYE_Y, EYE_Z) - 0.035, EYE_Y, EYE_Z * s); e.rotation.y = yaw; head.add(e)
    const pupil = new THREE.Mesh(BALL, DARK); pupil.scale.set(0.05, 0.14, 0.095); e.add(pupil)
    const iris = new THREE.Mesh(BALL, IRIS); iris.scale.set(0.05, 0.07, 0.07); iris.position.set(0.006, -0.055, 0); e.add(iris)
    const hi = new THREE.Mesh(BALL, basic(0xffffff)); hi.scale.setScalar(0.042); hi.position.set(0.045, 0.055, 0.028 * s); e.add(hi)
    const hi2 = new THREE.Mesh(BALL, basic(0xffffff)); hi2.scale.setScalar(0.02); hi2.position.set(0.05, -0.06, -0.025 * s); e.add(hi2)
    face.eyes.push(e)
    const arc = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.022, 8, 16, Math.PI), DARK); arc.rotation.y = Math.PI / 2; const ag = new THREE.Group(); ag.position.set(F(EYE_Y, EYE_Z) - 0.01, EYE_Y - 0.02, EYE_Z * s); ag.rotation.y = yaw; ag.add(arc); ag.visible = false; head.add(ag); face.joy.push(ag)
    const brow = new THREE.Mesh(new THREE.CapsuleGeometry(0.017, 0.08, 3, 8), DARK); brow.rotation.x = Math.PI / 2; const bg = new THREE.Group(); bg.position.set(F(BROW_Y, EYE_Z) + 0.005, BROW_Y, EYE_Z * s); bg.rotation.y = yaw; bg.add(brow); head.add(bg); face.brows.push(bg)
    const cz = 0.31, cy = -0.27, cheek = new THREE.Mesh(BALL, PINK); cheek.scale.set(0.03, 0.06, 0.1); cheek.position.set(F(cy, cz) - 0.008, cy, cz * s); cheek.rotation.y = -Math.asin(cz / (HEAD_R * HEAD_K[2])) * s; head.add(cheek)
  }
  const mx = F(MOUTH_Y, 0) + 0.004
  const mouth = (geo, rx, ry, rz) => { const m = new THREE.Mesh(geo, DARK); m.rotation.set(rx, ry, rz); m.position.set(mx, MOUTH_Y, 0); m.visible = false; head.add(m); return m }
  face.mouths = {
    smile: mouth(new THREE.TorusGeometry(0.06, 0.018, 8, 16, Math.PI), Math.PI, Math.PI / 2, 0),
    frown: mouth(new THREE.TorusGeometry(0.055, 0.017, 8, 16, Math.PI), 0, Math.PI / 2, 0),
    o: mouth(new THREE.TorusGeometry(0.04, 0.017, 8, 16), 0, Math.PI / 2, 0),
    flat: mouth(new THREE.CapsuleGeometry(0.016, 0.06, 3, 8), Math.PI / 2, 0, 0),
  }
  { const open = new THREE.Mesh(new THREE.CircleGeometry(0.085, 24, Math.PI, Math.PI), basic(0x8a2a3a, { side: THREE.DoubleSide })); open.rotation.y = Math.PI / 2; open.position.set(mx - 0.012, MOUTH_Y + 0.04, 0)
    const tongue = new THREE.Mesh(new THREE.CircleGeometry(0.045, 16, Math.PI, Math.PI), basic(0xff7a8a, { side: THREE.DoubleSide })); tongue.position.set(0, -0.035, 0.002); open.add(tongue); open.visible = false; head.add(open); face.mouths.open = open }
}
// arms + club swing around the chest; at angle 0 the club head sits behind the ball. The club also hinges at the wrists.
// The club is long for a kid (the arms stay short: shoulder -> elbow out past the belly -> round mitten hands on the grip).
const gArms = new THREE.Group(); gArms.position.set(0.14, 0.95, 0); gTwist.add(gArms)
const gClub = new THREE.Group(); gArms.add(gClub)
{
  const len = 1.1, reachG = Math.hypot(-GX - 0.14, 0.95), d = new THREE.Vector3(-GX - 0.14, -0.95, 0).normalize(), grip = d.clone().multiplyScalar(reachG - len - 0.08), up = new THREE.Vector3(0, 1, 0)
  gClub.position.copy(grip)
  const limb = (a, b, r, mat) => { const v = b.clone().sub(a), L = v.length(), m = tp(new THREE.CapsuleGeometry(r, L, 4, 14), mat, 0, 0, 0, 1, 1, 1, 1, r, L / 2 + r, r); m.position.copy(a).addScaledVector(v, 0.5); m.quaternion.setFromUnitVectors(up, v.normalize()); gArms.add(m); return v }
  for (const s of [-1, 1]) {
    const sh = new THREE.Vector3(0.04, 0.03, 0.33 * s), el = new THREE.Vector3(0.3, -0.1, 0.31 * s), hand = grip.clone().add(new THREE.Vector3(0, 0, 0.06 * s))
    limb(sh, el, 0.08, SKIN); limb(el, hand, 0.075, SKIN)
    gArms.add(tp(BALL, SKIN, el.x, el.y, el.z, 0.08, 0.08, 0.08, 0))
    // puffy short sleeve over the top of the arm
    const sv = el.clone().sub(sh), sl = tp(new THREE.CapsuleGeometry(0.115, 0.1, 4, 14), SHIRT, 0, 0, 0, 1, 1, 1, 1, 0.115, 0.165, 0.115); sl.position.copy(sh).addScaledVector(sv, 0.3); sl.quaternion.setFromUnitVectors(up, sv.normalize()); gArms.add(sl)
  }
  // round mittens on the grip: the white glove on top, the bare hand under it
  gClub.add(tp(BALL, WHITE, 0, 0, 0, 0.125, 0.12, 0.13))
  gClub.add(tp(BALL, SKIN, d.x * 0.15, d.y * 0.15, 0, 0.115, 0.11, 0.12))
  const at = (k) => d.clone().multiplyScalar(k)
  const rubber = tp(CYL, GRIPM, 0, 0, 0, 0.05, 0.34, 0.05, 1, 0.05, 0.17, 0.05); rubber.position.copy(at(0.08)); rubber.quaternion.setFromUnitVectors(up, d); gClub.add(rubber)
  const shaft = tp(CYL, METAL, 0, 0, 0, 0.026, len - 0.2, 0.026, 1, 0.026, (len - 0.2) / 2, 0.026); shaft.position.copy(at(0.2 + (len - 0.2) / 2)); shaft.quaternion.setFromUnitVectors(up, d); gClub.add(shaft)
  const hosel = tp(CYL, CAPM, 0, 0, 0, 0.045, 0.1, 0.045, 1, 0.045, 0.05, 0.045); hosel.position.copy(at(len - 0.02)); hosel.quaternion.setFromUnitVectors(up, d); gClub.add(hosel)
  const hp = at(len + 0.06), ch = tp(BALL, METAL, hp.x + 0.02, hp.y + 0.04, hp.z, 0.14, 0.11, 0.27); ch.rotation.z = -0.25; gClub.add(ch)
  gClub.add(tp(BALL, GRIPM, hp.x + 0.02, hp.y + 0.04, hp.z - 0.13, 0.11, 0.08, 0.02, 0))
  const tipO = new THREE.Object3D(), tipI = new THREE.Object3D(); tipO.position.copy(at(len + 0.25)); tipI.position.copy(at(0.3)); gClub.add(tipO, tipI); golfer.userData.tipO = tipO; golfer.userData.tipI = tipI
}
// the pose from two numbers: arm angle (negative = wound up) and shoulder turn; hips follow 40%, wrists hinge the club
function applyPose(ang, twist) {
  gArms.rotation.x = ang; gTwist.rotation.y = twist; gHips.rotation.y = twist * 0.4
  gClub.rotation.x = ang < 0 ? ang * 0.6 : Math.min(ang, 2.2) * 0.32
}
// moods: idle, focus (aiming), happy, wince, surprise, sad. A shown mood holds for a while, then the face goes back.
function mood(m, hold = 1.8) { face.mood = m; face.hold = hold }
function stepFace(dt) {
  face.hold -= dt
  const m = face.hold > 0 ? face.mood : swing.cheer > 0 ? 'happy' : game.phase === 'aim' && shot.dragging ? 'focus' : 'idle'
  face.blink -= dt; if (face.blink < 0) { face.blinkT = 0.13; face.blink = rnd(2.2, 4.6) } face.blinkT -= dt
  const T = { idle: [1, 0, 'smile'], focus: [0.72, 0.32, 'flat'], happy: [1, -0.25, 'open'], wince: [0.22, 0.4, 'frown'], surprise: [1.25, -0.4, 'o'], sad: [0.8, -0.45, 'frown'] }[m]
  const k = 1 - Math.exp(-16 * dt)
  face.eye = lerp(face.eye, T[0] * (face.blinkT > 0 && m !== 'happy' ? 0.08 : 1), face.blinkT > 0 ? 1 : k); face.brow = lerp(face.brow, T[1], k)
  face.eyes.forEach((e, i) => { e.visible = m !== 'happy'; e.scale.y = face.eye; e.position.y = m === 'sad' ? EYE_Y - 0.03 : EYE_Y })
  face.joy.forEach((a) => { a.visible = m === 'happy' })
  face.brows.forEach((b, i) => { b.rotation.x = face.brow * (i ? -1 : 1); b.position.y = BROW_Y + (m === 'surprise' ? 0.035 : 0) - Math.max(0, face.brow) * 0.03 })
  for (const key in face.mouths) face.mouths[key].visible = key === T[2]
}
// swing state: ang = arm angle (negative = wound up), twist, squash (1 = normal) with a spring, hop
const swing = { ang: 0, twist: 0, sq: 1, sqV: 0, hop: 0, t: -1, from: 0, power: 0, putt: false, done: true, idle: 0, cheer: 0, life: 0 }
// the swoosh: a white fan the club head paints while it moves fast
const SN = 40, swooshPts = [], swooshGeo = new THREE.BufferGeometry()
swooshGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(SN * 6), 3)); swooshGeo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(SN * 8), 4))
{ const idx = []; for (let i = 0; i < SN - 1; i++) idx.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2); swooshGeo.setIndex(idx) }
const swoosh = new THREE.Mesh(swooshGeo, new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, side: THREE.DoubleSide, depthWrite: false })); swoosh.frustumCulled = false; scene.add(swoosh)
const swooshCol = new THREE.Color(0xffffff)
let prevAng = 0, prevTwist = 0
function stepSwoosh(dt) {
  const da = swing.ang - prevAng, LIFE = 0.2
  if (da > 0.02 && da / Math.max(dt, 1e-4) > 6 && da < 3) { // only the fast forward part of a swing
    const n = Math.min(6, Math.ceil(da / 0.14))
    for (let i = 1; i <= n; i++) {
      applyPose(lerp(prevAng, swing.ang, i / n), lerp(prevTwist, swing.twist, i / n)); golfer.updateWorldMatrix(true, true)
      swooshPts.unshift({ o: golfer.userData.tipO.getWorldPosition(new THREE.Vector3()), i: golfer.userData.tipI.getWorldPosition(new THREE.Vector3()), age: dt * (1 - i / n) })
    }
  }
  prevAng = swing.ang; prevTwist = swing.twist
  for (const q of swooshPts) q.age += dt
  while (swooshPts.length && (swooshPts[swooshPts.length - 1].age > LIFE || swooshPts.length > SN)) swooshPts.pop()
  const pos = swooshGeo.attributes.position.array, col = swooshGeo.attributes.color.array, n = swooshPts.length
  for (let i = 0; i < SN; i++) {
    const q = swooshPts[Math.min(i, n - 1)], a = q && i < n ? 0.95 * (1 - q.age / LIFE) * Math.min(1, i / 2) : 0
    if (q) { pos[i * 6] = q.o.x; pos[i * 6 + 1] = q.o.y; pos[i * 6 + 2] = q.o.z; pos[i * 6 + 3] = q.i.x; pos[i * 6 + 4] = q.i.y; pos[i * 6 + 5] = q.i.z }
    col[i * 8] = col[i * 8 + 4] = swooshCol.r; col[i * 8 + 1] = col[i * 8 + 5] = swooshCol.g; col[i * 8 + 2] = col[i * 8 + 6] = swooshCol.b; col[i * 8 + 3] = a; col[i * 8 + 7] = a * 0.4
  }
  swoosh.visible = n > 1; swooshGeo.attributes.position.needsUpdate = true; swooshGeo.attributes.color.needsUpdate = true
}
function poseGolfer(dt) {
  stepSwoosh(dt); stepFace(dt)
  swing.sqV += (1 - swing.sq) * 260 * dt; swing.sqV *= Math.exp(-11 * dt); swing.sq += swing.sqV * dt
  applyPose(swing.ang, swing.twist)
  swing.life += dt
  const still = swing.done && swing.cheer <= 0, sad = still && face.hold > 0 && face.mood === 'sad'
  const s = clamp(swing.sq, 0.7, 1.35) * (sad ? 0.94 : 1), w = 1 / Math.sqrt(s)
  gBody.scale.set(w, s, w); gBody.position.y = swing.hop
  // alive while standing: breathing, a slow weight shift; a slump when it went wrong; a spin when it went right
  const k = 1 - Math.exp(-6 * dt)
  gTwist.scale.y = 1 + (still ? Math.sin(swing.life * 2.6) * 0.014 : 0)
  gBody.position.z = lerp(gBody.position.z, still && !shot.dragging ? Math.sin(swing.life * 0.9) * 0.035 : 0, k)
  gTwist.rotation.z = lerp(gTwist.rotation.z, sad ? -0.13 : 0, k)
  gBody.rotation.y = swing.cheer > 0 ? Math.PI * 2 * ease(clamp(swing.cheer / 0.75, 0, 1)) : 0
  const head = golfer.userData.head, look = game.phase === 'aim' || game.phase === 'swing' ? -0.2 : sad ? -0.22 : swing.cheer > 0 ? 0.2 : -0.05
  head.userData.yaw = lerp(head.userData.yaw || 0, still && !shot.dragging && game.phase !== 'swing' ? -0.42 : 0, k); head.rotation.y = clamp(-swing.twist * 0.75, -1.2, 1.2) + head.userData.yaw; head.rotation.z = lerp(head.rotation.z, clamp(look - swing.twist * 0.12, -0.5, 0.3), k)
}

// ---------------------------------------------------------------- effects: particles, trail, rings, marks, popups
const PN = 420, pMesh = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0), basic(0xffffff), PN), pData = []
pMesh.frustumCulled = false; scene.add(pMesh)
const dummy = new THREE.Object3D(), tmpC = new THREE.Color()
for (let i = 0; i < PN; i++) { pData.push({ life: 0, max: 1, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, s: 0, g: 0, flat: 0, spin: 0 }); dummy.scale.setScalar(0); dummy.updateMatrix(); pMesh.setMatrixAt(i, dummy.matrix); pMesh.setColorAt(i, tmpC.set(0xffffff)) }
let pNext = 0
function spark(x, y, z, vx, vy, vz, color, size, life, grav = 18, flat = 0) {
  const p = pData[pNext]; p.x = x; p.y = y; p.z = z; p.vx = vx; p.vy = vy; p.vz = vz; p.s = size; p.life = p.max = life; p.g = grav; p.flat = flat; p.spin = rnd(-9, 9)
  pMesh.setColorAt(pNext, tmpC.set(color)); pMesh.instanceColor.needsUpdate = true; pNext = (pNext + 1) % PN
}
function burst(x, y, z, n, colors, speed, up, size, life, grav = 18, flat = 0) {
  for (let i = 0; i < n; i++) { const a = rnd(0, Math.PI * 2), s = rnd(0.3, 1) * speed; spark(x, y, z, Math.cos(a) * s, rnd(0.4, 1) * up, Math.sin(a) * s, colors[i % colors.length], rnd(0.6, 1.2) * size, rnd(0.6, 1) * life, grav, flat) }
}
function stepParticles(dt) {
  for (let i = 0; i < PN; i++) {
    const p = pData[i]; if (p.life <= 0) continue
    p.life -= dt; p.vy -= p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt
    if (p.g > 0 && course && p.y < WATER_Y - 0.3) p.life = 0
    const k = p.life <= 0 ? 0 : p.s * Math.min(1, p.life / p.max * 2.2)
    dummy.position.set(p.x, p.y, p.z); dummy.rotation.set(p.spin * p.life, p.spin * p.life * 0.7, 0); dummy.scale.set(k, p.flat ? k * 0.18 : k, k); dummy.updateMatrix(); pMesh.setMatrixAt(i, dummy.matrix)
  }
  pMesh.instanceMatrix.needsUpdate = true
}
// trail: a ribbon behind the ball
const TN = 34, trailPts = [], trailGeo = new THREE.BufferGeometry()
trailGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(TN * 6), 3)); trailGeo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(TN * 8), 4))
{ const idx = []; for (let i = 0; i < TN - 1; i++) idx.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2); trailGeo.setIndex(idx) }
const trail = new THREE.Mesh(trailGeo, basic(0xffffff, { vertexColors: true, transparent: true, side: THREE.DoubleSide, depthWrite: false })); trail.frustumCulled = false; scene.add(trail)
const trailCol = new THREE.Color(0xffffff), v1 = new THREE.Vector3(), v2 = new THREE.Vector3(), v3 = new THREE.Vector3()
function stepTrail(moving) {
  if (moving) trailPts.unshift(new THREE.Vector3(ball.x, ball.y, ball.z)); else if (trailPts.length) trailPts.pop()
  if (trailPts.length > TN) trailPts.length = TN
  const pos = trailGeo.attributes.position.array, col = trailGeo.attributes.color.array, n = trailPts.length
  for (let i = 0; i < TN; i++) {
    const p = trailPts[Math.min(i, n - 1)] || v3.set(0, -50, 0), q = trailPts[Math.min(i + 1, n - 1)] || p
    v1.copy(p).sub(q); v2.copy(camera.position).sub(p); v1.cross(v2).normalize()
    const w = i < n ? 0.3 * (1 - i / n) * (shot.perfect ? 1.5 : 1) : 0, a = i < n ? 0.85 * (1 - i / n) : 0
    pos[i * 6] = p.x + v1.x * w; pos[i * 6 + 1] = p.y + v1.y * w; pos[i * 6 + 2] = p.z + v1.z * w
    pos[i * 6 + 3] = p.x - v1.x * w; pos[i * 6 + 4] = p.y - v1.y * w; pos[i * 6 + 5] = p.z - v1.z * w
    for (const o of [0, 4]) { col[i * 8 + o] = trailCol.r; col[i * 8 + o + 1] = trailCol.g; col[i * 8 + o + 2] = trailCol.b; col[i * 8 + o + 3] = a }
  }
  trailGeo.attributes.position.needsUpdate = true; trailGeo.attributes.color.needsUpdate = true
}
// rings on the ground (shock wave, ripples) and the star that pops at impact
const rings = []
{ const g = new THREE.RingGeometry(0.82, 1, 32).rotateX(-Math.PI / 2); for (let i = 0; i < 8; i++) { const m = new THREE.Mesh(g, basic(0xffffff, { transparent: true, depthWrite: false })); m.visible = false; scene.add(m); rings.push({ m, life: 0, max: 1, from: 1, to: 4 }) } }
let ringNext = 0
function ring(x, y, z, from, to, life, color = 0xffffff) { const r = rings[ringNext]; ringNext = (ringNext + 1) % rings.length; r.m.position.set(x, y + 0.06, z); r.m.material.color.set(color); r.life = r.max = life; r.from = from; r.to = to; r.m.visible = true }
const star = new THREE.Mesh(new THREE.CircleGeometry(1, 8), basic(0xffffff, { transparent: true, depthWrite: false, depthTest: false })); star.visible = false; star.renderOrder = 9; scene.add(star)
{ const p = star.geometry.attributes.position; for (let i = 1; i < p.count; i++) if (i % 2 === 0) p.setXYZ(i, p.getX(i) * 0.38, p.getY(i) * 0.38, 0) }
let starLife = 0
const marks = []
for (let i = 0; i < 10; i++) { const m = new THREE.Mesh(CIRCLE, basic(0x000000, { transparent: true, opacity: 0.22, depthWrite: false })); m.visible = false; scene.add(m); marks.push(m) }
let markNext = 0
function mark(x, y, z, size, color) { const m = marks[markNext]; markNext = (markNext + 1) % marks.length; m.position.set(x, y + 0.04, z); m.scale.set(size, 1, size); m.material.color.set(color); m.visible = true }
function stepRings(dt) {
  for (const r of rings) { if (r.life <= 0) continue; r.life -= dt; const k = 1 - r.life / r.max; r.m.scale.setScalar(lerp(r.from, r.to, ease(k))); r.m.material.opacity = 0.8 * (1 - k); if (r.life <= 0) r.m.visible = false }
  if (starLife > 0) { starLife -= dt; const k = 1 - starLife / 0.14; star.scale.setScalar(lerp(0.6, 2.6, k) * star.userData.s); star.material.opacity = 1 - k * k; star.quaternion.copy(camera.quaternion); star.rotateZ(k * 1.2); if (starLife <= 0) star.visible = false }
}
// number / word popups that sit on a spot in the world
const floats = []
function pop(text, x, y, z, cls = '') {
  const el = document.createElement('div'); el.className = 'pop ' + cls; el.textContent = text; $('float').appendChild(el)
  floats.push({ el, x, y, z, life: 1.3 }); if (floats.length > 6) { const f = floats.shift(); f.el.remove() }
}
function stepFloats(dt) {
  for (let i = floats.length - 1; i >= 0; i--) {
    const f = floats[i]; f.life -= dt
    if (f.life <= 0) { f.el.remove(); floats.splice(i, 1); continue }
    v1.set(f.x, f.y, f.z).project(camera)
    f.el.style.transform = `translate(-50%,-50%) translate(${(v1.x * 0.5 + 0.5) * innerWidth}px,${(-v1.y * 0.5 + 0.5) * innerHeight - (1.3 - f.life) * 46}px)`
    f.el.style.opacity = v1.z > 1 ? 0 : Math.min(1, f.life * 3)
  }
}
let bannerTimer = 0
function banner(text, sub = '', cls = '', hold = 1.6) {
  const b = $('banner'); b.className = ''; void b.offsetWidth; $('bannerText').textContent = text; $('bannerSub').textContent = sub; b.className = 'on ' + cls; bannerTimer = hold
}
function flash(strength) { const f = $('flash'); f.style.transition = 'none'; f.style.opacity = strength; void f.offsetWidth; f.style.transition = 'opacity .16s ease-out'; f.style.opacity = 0 }
let toastTimer = 0
function toast(text) { const el = $('toast'); el.textContent = text; el.classList.add('on'); clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('on'), 1800) }

// aim: dots along the flight, a ring where it lands, a ring under the ball that grows with power
const DOTS = 22, dots = new THREE.InstancedMesh(SPH, basic(0xffffff, { transparent: true, opacity: 0.95, depthTest: false }), DOTS); dots.frustumCulled = false; dots.renderOrder = 5; dots.visible = false; scene.add(dots)
const landRing = new THREE.Mesh(new THREE.RingGeometry(0.72, 1, 32).rotateX(-Math.PI / 2), basic(0xffe14a, { transparent: true, opacity: 0.95, depthTest: false })); landRing.renderOrder = 5; landRing.visible = false; scene.add(landRing)
const powerRing = new THREE.Mesh(new THREE.RingGeometry(0.78, 1, 36).rotateX(-Math.PI / 2), basic(0xffffff, { transparent: true, opacity: 0.9, depthWrite: false })); powerRing.visible = false; scene.add(powerRing)

// ---------------------------------------------------------------- one hole: ground picture, ground mesh, trees, toys
let course = null, theme = THEMES.meadow
const holeGroup = new THREE.Group(); scene.add(holeGroup)
const live = { pads: [], boosts: [], movers: [], bumps: [], pipes: [], belts: [], fans: [], arrows: null, fx: null }
const TORUS = new THREE.TorusGeometry(1, 0.26, 10, 28).rotateX(-Math.PI / 2)
function stepLive(now, dt) {
  const A = live.arrows
  if (A) for (let i = 0; i < A.pts.length; i++) {
    const q = A.pts[i], ph = (now * 0.0006 + q.ph) % 1, o = (ph - 0.5) * 1.6, k = ph < 0.2 ? ph / 0.2 : ph > 0.75 ? (1 - ph) / 0.25 : 1, x = q.x + q.dx * o, z = q.z + q.dz * o
    dummy.position.set(x, course.h(x, z) + 0.06, z); dummy.rotation.set(0, Math.atan2(-q.dx, -q.dz), 0); dummy.scale.set(q.s * 0.75 * k, 1, q.s * k); dummy.updateMatrix(); A.m.setMatrixAt(i, dummy.matrix)
  }
  if (A) A.m.instanceMatrix.needsUpdate = true
  const F = live.fx
  if (F) {
    const c = cam.look, w = course ? course.wx * 0.25 : 0, wz = course ? course.wz * 0.25 : 0
    F.ps.forEach((q, i) => {
      if (F.kind === 'snow') { q.y -= 1.7 * dt; q.x += (w + Math.sin(now * 0.001 + q.ph) * 0.4) * dt; q.z += wz * dt }
      else if (F.kind === 'petals') { q.y -= 1.1 * dt; q.x += (w + Math.sin(now * 0.0015 + q.ph) * 1.2) * dt; q.z += wz * dt }
      else if (F.kind === 'embers') { q.y += 2.4 * dt; q.x += Math.sin(now * 0.002 + q.ph) * 0.8 * dt }
      else { q.x += Math.sin(now * 0.0007 + q.ph) * 0.9 * dt; q.z += Math.cos(now * 0.0006 + q.ph * 2) * 0.9 * dt; q.y = 1 + (q.ph % 1) * 4 + Math.sin(now * 0.0011 + q.ph) * 0.6 }
      if (q.y < 0) q.y += 16; if (q.y > 16) q.y -= 16; if (q.x > 35) q.x -= 70; if (q.x < -35) q.x += 70; if (q.z > 35) q.z -= 70; if (q.z < -35) q.z += 70
      const sz = F.kind === 'fireflies' ? 0.09 * (0.5 + 0.5 * Math.sin(now * 0.004 + q.ph * 3)) : F.kind === 'petals' ? 0.13 : F.kind === 'embers' ? 0.07 : 0.1
      dummy.position.set(c.x + q.x, (F.kind === 'fireflies' ? (course ? course.h(c.x + q.x, c.z + q.z) : 0) : c.y - 3) + q.y, c.z + q.z)
      dummy.rotation.set(now * 0.001 + q.ph, q.ph, 0); dummy.scale.set(sz, F.kind === 'petals' ? sz * 0.3 : sz, sz); dummy.updateMatrix(); F.m.setMatrixAt(i, dummy.matrix)
    })
    F.m.instanceMatrix.needsUpdate = true
  }
}
function disposeHole() {
  holeGroup.traverse((o) => { if (o.geometry && !o.userData.keepGeo) o.geometry.dispose(); if (o.material && o.userData.ownMat) { o.material.map?.dispose(); o.material.dispose() } })
  holeGroup.clear(); live.pads = []; live.boosts = []; live.movers = []; live.bumps = []; live.pipes = []; live.belts = []; live.fans = []; live.arrows = null; live.fx = null
  for (const m of marks) m.visible = false
}
function paintGround(C, X0, Z0, W, L) {
  const H = C.H, ppu = Math.min(5, 2048 / Math.max(W, L)), cv = document.createElement('canvas'); cv.width = Math.ceil(W * ppu); cv.height = Math.ceil(L * ppu)
  const g = cv.getContext('2d'), X = (x) => (x - X0) * ppu, Z = (z) => (z - Z0) * ppu, rand = seeded(HOLES.indexOf(H) * 131 + 7)
  const ell = (s, k = 1, grow = 0) => { g.beginPath(); g.ellipse(X(s[0]), Z(s[1]), (s[2] * k + grow) * ppu, (s[3] * k + grow) * ppu, s[4] || 0, 0, Math.PI * 2) }
  const speckle = (n, x0, x1, z0, z1, colors, size) => { for (let i = 0; i < n; i++) { g.fillStyle = colors[i % colors.length]; const x = X(lerp(x0, x1, rand())), z = Z(lerp(z0, z1, rand())), s = size * ppu * (0.5 + rand()); g.beginPath(); g.ellipse(x, z, s, s * 0.6, rand() * 3, 0, 6.3); g.fill() } }
  if (C.sea) {
    g.fillStyle = theme.sea || '#2a86c4'; g.fillRect(0, 0, cv.width, cv.height)
    for (const s of H.land) { g.fillStyle = theme.sand; ell(s, 1.13); g.fill() }
    for (const s of H.land) { g.fillStyle = theme.rough; ell(s, 0.95); g.fill() }
    g.save(); g.beginPath(); for (const s of H.land) { g.moveTo(X(s[0]) + s[2] * 0.93 * ppu, Z(s[1])); g.ellipse(X(s[0]), Z(s[1]), s[2] * 0.93 * ppu, s[3] * 0.93 * ppu, s[4] || 0, 0, Math.PI * 2) } g.clip()
    speckle(900, X0, X0 + W, Z0, Z0 + L, [theme.rough2, theme.rough2, theme.fair2], 0.9); g.restore()
  } else {
    g.fillStyle = theme.rough; g.fillRect(0, 0, cv.width, cv.height)
    speckle(2600, X0, X0 + W, Z0, Z0 + L, [theme.rough2, theme.rough2, theme.rough2, theme.fair2], 1)
    for (const s of H.water || []) { g.fillStyle = theme.sand; ell(s, 1.16); g.fill(); g.fillStyle = theme.sea || '#2a86c4'; ell(s, 0.98); g.fill() }
  }
  // fairways: dark edge, then the mown stripes
  g.lineCap = 'round'; g.lineJoin = 'round'
  const path = (f) => { g.beginPath(); f.pts.forEach((p, i) => i ? g.lineTo(X(p[0]), Z(p[1])) : g.moveTo(X(p[0]), Z(p[1]))) }
  const tee = () => { g.beginPath(); g.roundRect(X(-4), Z(-3.2), 8 * ppu, 6.4 * ppu, 1.2 * ppu) }
  g.strokeStyle = theme.line; for (const f of H.fair) { path(f); g.lineWidth = (f.w + 0.9) * ppu; g.stroke() }
  tee(); g.lineWidth = 0.9 * ppu; g.stroke()
  const tmp = document.createElement('canvas'); tmp.width = cv.width; tmp.height = cv.height
  const tg = tmp.getContext('2d'); tg.lineCap = 'round'; tg.lineJoin = 'round'; tg.strokeStyle = theme.fair
  for (const f of H.fair) { tg.beginPath(); f.pts.forEach((p, i) => i ? tg.lineTo(X(p[0]), Z(p[1])) : tg.moveTo(X(p[0]), Z(p[1]))); tg.lineWidth = f.w * ppu; tg.stroke() }
  tg.fillStyle = theme.fair; tg.beginPath(); tg.roundRect(X(-4), Z(-3.2), 8 * ppu, 6.4 * ppu, 1.2 * ppu); tg.fill()
  tg.globalCompositeOperation = 'source-atop'; tg.fillStyle = theme.fair2
  for (let z = Z0; z < Z0 + L; z += 12) tg.fillRect(0, Z(z), cv.width, 6 * ppu)
  g.drawImage(tmp, 0, 0)
  // ice: pale blue with a dark rim, cracks and a shine
  for (const s of H.ice || []) {
    g.fillStyle = theme.line; ell(s, 1, 0.4); g.fill(); g.fillStyle = theme.ice || '#bfe9ff'; ell(s); g.fill()
    g.save(); ell(s); g.clip(); g.strokeStyle = 'rgba(255,255,255,.8)'; g.lineWidth = 0.22 * ppu
    for (let k = 0; k < 8; k++) { const a = rand() * 6.3, r = Math.max(s[2], s[3]), q = 0.15 + rand() * 0.3; g.beginPath(); g.moveTo(X(s[0] + Math.cos(a) * r * q), Z(s[1] + Math.sin(a) * r * q)); g.lineTo(X(s[0] + Math.cos(a + 0.2) * r * (q + 0.35)), Z(s[1] + Math.sin(a + 0.2) * r * (q + 0.35))); g.lineTo(X(s[0] + Math.cos(a) * r), Z(s[1] + Math.sin(a) * r)); g.stroke() }
    g.fillStyle = 'rgba(255,255,255,.4)'; g.beginPath(); g.ellipse(X(s[0] - s[2] * 0.3), Z(s[1] - s[3] * 0.3), s[2] * 0.4 * ppu, s[3] * 0.16 * ppu, 0.5, 0, 6.3); g.fill(); g.restore()
  }
  // green: fringe, edge, stripes of two greens, cup shadow
  const G0 = C.green
  g.fillStyle = theme.fair; ell(G0, 1, 2.2); g.fill()
  g.fillStyle = theme.line; ell(G0, 1, 0.5); g.fill()
  g.fillStyle = theme.green; ell(G0); g.fill()
  g.save(); ell(G0); g.clip(); g.fillStyle = theme.green2; g.translate(X(G0[0]), Z(G0[1])); g.rotate(0.6)
  for (let k = -6; k < 6; k += 2) g.fillRect(k * 3 * ppu, -40 * ppu, 3 * ppu, 80 * ppu)
  g.restore()
  for (const s of H.bunker || []) {
    g.fillStyle = theme.line; ell(s, 1, 0.45); g.fill(); g.fillStyle = theme.sand; ell(s); g.fill()
    g.fillStyle = 'rgba(190,140,60,.28)'; g.beginPath(); g.ellipse(X(s[0]) - 0.5 * ppu, Z(s[1]) - 0.5 * ppu, s[2] * 0.72 * ppu, s[3] * 0.72 * ppu, s[4] || 0, 0, 6.3); g.fill()
    g.fillStyle = theme.sand; g.beginPath(); g.ellipse(X(s[0]) + 0.4 * ppu, Z(s[1]) + 0.5 * ppu, s[2] * 0.7 * ppu, s[3] * 0.7 * ppu, s[4] || 0, 0, 6.3); g.fill()
  }
  // out-of-bounds line
  const B = H.bounds; g.setLineDash([2 * ppu, 2 * ppu]); g.strokeStyle = 'rgba(255,255,255,.85)'; g.lineWidth = 0.5 * ppu; g.strokeRect(X(B[0]), Z(B[2]), (B[1] - B[0]) * ppu, (B[3] - B[2]) * ppu); g.setLineDash([])
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.flipY = false; tex.anisotropy = 4; tex.generateMipmaps = true
  return tex
}
function buildHole(index) {
  disposeHole()
  const H = HOLES[index]; theme = THEMES[H.theme]; course = makeCourse(H)
  const C = course, B = H.bounds, M = C.sea ? 26 : 44, X0 = B[0] - M, Z0 = B[2] - M, W = B[1] - B[0] + M * 2, L = B[3] - B[2] + M * 2
  paintSky(theme.sky); scene.fog.color.set(theme.fog); sun.color.set(theme.sun)
  hemi.intensity = theme.light ? theme.light[0] : 1.5; sun.intensity = theme.light ? theme.light[1] : 1.7
  water.material.emissive.set(theme.glow || 0); water.material.opacity = theme.glow || theme.hazard === 'sky' ? 0.96 : 0.86
  water.material.color.set(theme.water); farGround.material.color.set(theme.rough2); farGround.visible = !C.sea
  if (C.sea) { water.scale.set(1500, 1, 1500); water.position.set(0, WATER_Y, -100) } else { water.scale.set(W, 1, L); water.position.set(X0 + W / 2, WATER_Y, Z0 + L / 2) }
  // ground mesh
  const step = 1.7, nx = Math.ceil(W / step), nz = Math.ceil(L / step), pos = new Float32Array((nx + 1) * (nz + 1) * 3), uv = new Float32Array((nx + 1) * (nz + 1) * 2), idx = []
  for (let j = 0; j <= nz; j++) for (let i = 0; i <= nx; i++) {
    const k = j * (nx + 1) + i, x = X0 + W * i / nx, z = Z0 + L * j / nz, edge = Math.min(i, j, nx - i, nz - j)
    pos[k * 3] = x; pos[k * 3 + 1] = C.sea ? C.h(x, z) : Math.max(C.h(x, z) * Math.min(1, edge / 6), edge === 0 ? -0.14 : -3); pos[k * 3 + 2] = z; uv[k * 2] = i / nx; uv[k * 2 + 1] = j / nz
    if (i < nx && j < nz) idx.push(k, k + nx + 1, k + 1, k + 1, k + nx + 1, k + nx + 2)
  }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); geo.setIndex(idx); geo.computeVertexNormals()
  const ground = new THREE.Mesh(geo, lam(0xffffff, { map: paintGround(C, X0, Z0, W, L) })); ground.userData.ownMat = true; holeGroup.add(ground)
  // far hills
  { const rand = seeded(index * 53 + 3), m = lam(theme.hill), cz = (B[2] + B[3]) / 2, cx = (B[0] + B[1]) / 2, far = Math.max(W, L) / 2 + 90
    for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2 + rand(), r = far + rand() * 80, hh = 34 + rand() * 60, hill = new THREE.Mesh(new THREE.ConeGeometry(hh * (1.1 + rand()), hh, 6), m); hill.position.set(cx + Math.cos(a) * r, hh / 2 - 6, cz + Math.sin(a) * r * 1.2); hill.rotation.y = rand() * 3; hill.userData.ownMat = i === 0; holeGroup.add(hill) } }
  // trees
  const rand = seeded(index * 977 + 13), spots = [], kind = theme.tree
  const free = (x, z, inside) => {
    if (Math.hypot(x, z) < 11 || (z > -5 && Math.abs(x) < 16) || ellD(x, z, C.green) < 1.7 || C.fairD(x, z) < 1.35 || C.surf(x, z) !== 'rough' || C.landness(x, z) < 0.999) return false
    for (const p of [...C.pads, ...C.boosts]) if (Math.hypot(x - p[0], z - p[1]) < p[2] + 3) return false
    if (z < 0 && z > -30 && Math.abs(x) < 14) return false // the first look down the hole stays open
    for (const u of C.bumpers) if (Math.hypot(x - u[0], z - u[1]) < u[2] + 3) return false
    for (const q of C.pipes) if (Math.hypot(x - q[0], z - q[1]) < 4.5 || Math.hypot(x - q[2], z - q[3]) < 4.5) return false
    for (const w of C.belts) if (Math.hypot(x - w[0], z - w[1]) < w[3] + 3) return false
    for (const w of C.tunnels) if (Math.hypot(x - w[0], z - w[1]) < w[2] + 4) return false
    for (const m of C.movers) if (Math.abs(z - m[1]) < 4 && Math.abs(x - m[0]) < m[2] + m[4] + 2) return false
    for (const s of spots) if (Math.hypot(x - s.x, z - s.z) < (inside ? 4.2 : 3.2)) return false
    return true
  }
  const plant = (x, z, s) => spots.push({ x, z, s })
  for (let i = 0, n = 0; i < H.trees * 40 && n < H.trees; i++) { const x = lerp(B[0], B[1], rand()), z = lerp(B[2], B[3], rand()); if (free(x, z, true)) { plant(x, z, 0.85 + rand() * 0.5); n++ } }
  for (const gr of H.grove || []) for (let i = 0, n = 0; i < 900 && n < 26; i++) { const a = rand() * 6.3, r = Math.sqrt(rand()), x = gr[0] + Math.cos(a) * r * gr[2], z = gr[1] + Math.sin(a) * r * gr[3]; if (free(x, z, false)) { plant(x, z, 0.9 + rand() * 0.5); n++ } }
  if (!C.sea) for (let i = 0, n = 0; i < 4000 && n < 120; i++) { const x = lerp(X0 + 3, X0 + W - 3, rand()), z = lerp(Z0 + 3, Z0 + L - 3, rand()); if (C.out(x, z) && free(x, z, false)) { plant(x, z, 1 + rand() * 0.8); n++ } }
  const T = { round: { r: 0.36, th: 2.3, cy: 3.7, cr: 2.1, crown: [2.1, 2.0, 2.1] }, pine: { r: 0.3, th: 1.3, cy: 3.9, cr: 1.6, crown: [1.9, 5.6, 1.9] }, cactus: { r: 0.55, th: 3.3, cy: 3.3, cr: 0, crown: [0.56, 0.56, 0.56] }, palm: { r: 0.3, th: 4.8, cy: 5.1, cr: 1.7, crown: [2.4, 0.8, 2.4] }, bamboo: { r: 0.17, th: 7.2, cy: 6.9, cr: 0.9, crown: [1.05, 2.6, 1.05] } }[kind]
  const n = spots.length
  if (n) {
    const crownGeo = kind === 'pine' ? new THREE.ConeGeometry(1, 1, 7) : ICO
    const trunkM = new THREE.InstancedMesh(CYL, lam(theme.trunk), n), crownM = new THREE.InstancedMesh(crownGeo, lam(0xffffff), n), lineM = new THREE.InstancedMesh(crownGeo, OUT, n)
    const shadeM = new THREE.InstancedMesh(CIRCLE, basic(0x10301a, { transparent: true, opacity: 0.22, depthWrite: false }), n)
    for (const m of [trunkM, crownM, lineM, shadeM]) { m.userData.keepGeo = kind !== 'pine' || m === trunkM || m === shadeM; m.userData.ownMat = m !== lineM; m.frustumCulled = false; holeGroup.add(m) }
    spots.forEach((s, i) => {
      const by = C.h(s.x, s.z), k = s.s
      dummy.rotation.set(0, rand() * 6, 0)
      dummy.position.set(s.x, by + T.th * k / 2, s.z); dummy.scale.set(T.r * k, T.th * k, T.r * k); dummy.updateMatrix(); trunkM.setMatrixAt(i, dummy.matrix)
      dummy.position.set(s.x, by + T.cy * k, s.z); dummy.scale.set(T.crown[0] * k, T.crown[1] * k, T.crown[2] * k); dummy.updateMatrix(); crownM.setMatrixAt(i, dummy.matrix)
      dummy.scale.multiplyScalar(1.07); dummy.updateMatrix(); lineM.setMatrixAt(i, dummy.matrix)
      dummy.rotation.set(0, 0, 0); dummy.position.set(s.x, by + 0.05, s.z); dummy.scale.set(T.crown[0] * k * 0.9, 1, T.crown[0] * k * 0.9); dummy.updateMatrix(); shadeM.setMatrixAt(i, dummy.matrix)
      crownM.setColorAt(i, tmpC.set(theme.leaf[Math.floor(rand() * theme.leaf.length)]))
      if (!C.out(s.x, s.z)) C.trees.push({ x: s.x, z: s.z, by, r: T.r * k, th: T.th * k, cy: T.cy * k, cr: T.cr * k })
    })
  }
  // night: lamp posts along the fairway, each with a pool of light (the ball can clang off a post)
  if (theme.lamps) {
    const postM = lam(0x2a2f3a), bulbM = basic(0xfff1a8), poolM = basic(0xffe48a, { transparent: true, opacity: 0.22, depthWrite: false })
    let side = 1
    for (const f of H.fair) for (let i = 0; i < f.pts.length - 1; i++) {
      const a = f.pts[i], b = f.pts[i + 1], L = Math.hypot(b[0] - a[0], b[1] - a[1]), nx = -(b[1] - a[1]) / L, nz = (b[0] - a[0]) / L
      for (let d = 14; d < L; d += 30) {
        side = -side; const x = a[0] + (b[0] - a[0]) * d / L + nx * side * (f.w / 2 + 2.4), z = a[1] + (b[1] - a[1]) * d / L + nz * side * (f.w / 2 + 2.4)
        if (C.surf(x, z) !== 'rough' || C.out(x, z) || ellD(x, z, C.green) < 2 || Math.hypot(x, z) < 10) continue
        const by = C.h(x, z), post = new THREE.Mesh(CYL, postM), bulb = new THREE.Mesh(SPH, bulbM), pool = new THREE.Mesh(CIRCLE, poolM)
        post.position.set(x, by + 2.1, z); post.scale.set(0.13, 4.2, 0.13); bulb.position.set(x, by + 4.35, z); bulb.scale.setScalar(0.42); pool.position.set(x, by + 0.07, z); pool.scale.set(4.2, 1, 4.2)
        for (const m of [post, bulb, pool]) { m.userData.keepGeo = true; m.userData.ownMat = true; holeGroup.add(m) }
        C.trees.push({ x, z, by, r: 0.16, th: 4.2, cy: 4.35, cr: 0.45 })
      }
    }
  }
  // back nine: long grass tufts on the rough next to the fairway (the rough costs power there)
  if (H.rough) {
    const pts = []
    for (let i = 0; i < 9000 && pts.length < 460; i++) { const x = lerp(B[0], B[1], rand()), z = lerp(B[2], B[3], rand()), d = C.fairD(x, z); if (d > 1.08 && d < 2.4 && C.surf(x, z) === 'rough' && !C.out(x, z) && ellD(x, z, C.green) > 1.6 && Math.hypot(x, z) > 6 && C.landness(x, z) > 0.999) pts.push([x, z]) }
    if (pts.length) {
      const tuft = new THREE.Color(theme.fair2), blade = new THREE.ConeGeometry(0.1, 0.62, 3), tm = new THREE.InstancedMesh(blade, lam(0xffffff), pts.length * 3); tm.userData.ownMat = true; tm.frustumCulled = false
      pts.forEach((q, i) => { const by = C.h(q[0], q[1]); for (let k = 0; k < 3; k++) {
        const ox = (rand() - 0.5) * 0.5, oz = (rand() - 0.5) * 0.5, hh = 0.75 + rand() * 0.6
        dummy.position.set(q[0] + ox, by + 0.25 * hh, q[1] + oz); dummy.rotation.set((rand() - 0.5) * 0.7, rand() * 6, (rand() - 0.5) * 0.7); dummy.scale.set(1, hh, 1); dummy.updateMatrix()
        tm.setMatrixAt(i * 3 + k, dummy.matrix); tm.setColorAt(i * 3 + k, tmpC.set(k ? theme.rough2 : theme.rough).lerp(tuft, 0.55).multiplyScalar(0.78 + rand() * 0.15)) } })
      holeGroup.add(tm)
    }
  }
  // back nine: arrows on the green that flow downhill (a putt breaks that way); bigger arrows = steeper
  if (H.band) {
    const cv = document.createElement('canvas'); cv.width = cv.height = 64; const g = cv.getContext('2d'); g.lineCap = 'round'; g.lineJoin = 'round'
    for (const [w, c] of [[16, 'rgba(29,42,58,.55)'], [9, '#ffffff']]) { g.strokeStyle = c; g.lineWidth = w; g.beginPath(); g.moveTo(14, 44); g.lineTo(32, 22); g.lineTo(50, 44); g.stroke() }
    const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace
    const G = C.green, pts = []
    for (let gx = -G[2]; gx <= G[2]; gx += 2.3) for (let gz = -G[3]; gz <= G[3]; gz += 2.3) {
      const x = G[0] + gx, z = G[1] + gz; if (ellD(x, z, G) > 0.8 || Math.hypot(x - C.pin[0], z - C.pin[1]) < 1.2) continue
      const hx = (C.h(x + 0.3, z) - C.h(x - 0.3, z)) / 0.6, hz = (C.h(x, z + 0.3) - C.h(x, z - 0.3)) / 0.6, m = Math.hypot(hx, hz)
      if (m > 0.012) pts.push({ x, z, dx: -hx / m, dz: -hz / m, s: Math.min(1.5, 0.6 + m * 7), ph: pts.length * 0.37 })
    }
    if (pts.length) {
      const am = new THREE.InstancedMesh(CIRCLE, basic(0xffffff, { map: tex, transparent: true, opacity: 0.72, depthWrite: false }), pts.length); am.userData.keepGeo = true; am.userData.ownMat = true; am.frustumCulled = false
      holeGroup.add(am); live.arrows = { m: am, pts }
    }
  }
  // little things in the air: fireflies, petals, embers, snow (around the camera)
  if (theme.fx) {
    const n = 110, col = { fireflies: 0xfff36a, petals: 0xffb8d2, embers: 0xff8a2a, snow: 0xffffff }[theme.fx]
    const fm = new THREE.InstancedMesh(SPH, basic(col, { transparent: true, opacity: 0.9, depthWrite: false }), n); fm.userData.keepGeo = true; fm.userData.ownMat = true; fm.frustumCulled = false
    holeGroup.add(fm); live.fx = { m: fm, kind: theme.fx, ps: Array.from({ length: n }, () => ({ x: rand() * 70 - 35, y: rand() * 16, z: rand() * 70 - 35, ph: rand() * 6.3 })) }
  }
  // tee markers
  for (const s of [-1, 1]) { const m = part(SPH, lam(0xff5a4a), 3.1 * s, C.h(3.1 * s, 0.6) + 0.22, 0.6, 0.16); m.scale.setScalar(0.24); m.userData.keepGeo = true; m.children[0].userData.keepGeo = true; m.userData.ownMat = true; holeGroup.add(m) }
  // trampolines
  for (const p of C.pads) {
    const g = new THREE.Group(), y = C.h(p[0], p[1]); g.position.set(p[0], y, p[1])
    const stem = part(CYL, lam(0xfff1d6), 0, 0.2, 0, 0.04); stem.scale.set(p[2] * 0.5, 0.5, p[2] * 0.5)
    const cap = part(SPH, lam(0xff4f6a), 0, 0.42, 0, 0.04); cap.scale.set(p[2], 0.5, p[2])
    g.add(stem, cap)
    for (let i = 0; i < 5; i++) { const d = new THREE.Mesh(SPH, basic(0xffffff)); const a = i * 1.257; d.scale.set(p[2] * 0.16, 0.06, p[2] * 0.16); d.position.set(Math.cos(a) * p[2] * 0.55, 0.83, Math.sin(a) * p[2] * 0.55); g.add(d) }
    g.traverse((o) => { o.userData.keepGeo = true; o.userData.ownMat = o.material && o.material !== OUT }); holeGroup.add(g); live.pads.push({ p, g, kick: 0 })
  }
  // speed arrows
  for (const p of C.boosts) {
    const cv = document.createElement('canvas'); cv.width = cv.height = 128; const g = cv.getContext('2d')
    g.fillStyle = '#ff8a1e'; g.beginPath(); g.arc(64, 64, 62, 0, 6.3); g.fill(); g.strokeStyle = '#1d2a3a'; g.lineWidth = 5; g.stroke()
    g.strokeStyle = '#fff'; g.lineWidth = 12; g.lineCap = 'round'; g.lineJoin = 'round'
    for (const y of [44, 68, 92]) { g.beginPath(); g.moveTo(36, y + 12); g.lineTo(64, y - 12); g.lineTo(92, y + 12); g.stroke() }
    const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace
    const m = new THREE.Mesh(CIRCLE, basic(0xffffff, { map: tex, transparent: true })); m.userData.keepGeo = true; m.userData.ownMat = true
    m.scale.set(p[2], 1, p[2]); m.position.set(p[0], C.h(p[0], p[1]) + 0.08, p[1]); m.rotation.y = Math.atan2(-p[3], -p[4]); holeGroup.add(m); live.boosts.push({ p, m, kick: 0 })
  }
  // pinball bumpers: a striped post with a lit cap; it jumps when hit
  C.bumpers.forEach((u, i) => {
    const col = theme.bump || [0xff4a6a, 0xffd23a], g = new THREE.Group(); g.position.set(u[0], C.h(u[0], u[1]), u[1])
    const base = part(CYL, lam(0xffffff), 0, 0.12, 0, 0.04); base.scale.set(u[2] * 1.15, 0.24, u[2] * 1.15)
    const post = part(CYL, lam(col[i % 2]), 0, 0.95, 0, 0.04); post.scale.set(u[2], 1.5, u[2])
    const band = part(CYL, lam(0xffffff), 0, 1.0, 0, 0.04); band.scale.set(u[2] * 1.04, 0.32, u[2] * 1.04)
    const cap = part(SPH, basic(col[(i + 1) % 2]), 0, 1.72, 0, 0.04); cap.scale.set(u[2] * 0.95, 0.42, u[2] * 0.95)
    g.add(base, post, band, cap); g.traverse((o) => { o.userData.keepGeo = true; o.userData.ownMat = o.material && o.material !== OUT }); holeGroup.add(g); live.bumps.push({ u, g, cap, kick: 0 })
  })
  // pipes: two mouths of the same colour; the ball goes in one and shoots out of the other (the arrow shows which way)
  C.pipes.forEach((q, i) => {
    const col = [0x3fcf5a, 0xb05aff, 0xff8a1e][i % 3], ends = []
    for (const [x, z, out] of [[q[0], q[1], false], [q[2], q[3], true]]) {
      const g = new THREE.Group(), y = C.h(x, z); g.position.set(x, y, z)
      const wall = part(CYL, lam(col), 0, 0.3, 0, 0.04); wall.scale.set(1.55, 0.6, 1.55)
      const rim = part(TORUS, lam(col), 0, 0.62, 0, 0.04); rim.scale.setScalar(1.55)
      const hole = new THREE.Mesh(CIRCLE, basic(0x10181a)); hole.scale.setScalar(1.3); hole.position.y = 0.63
      g.add(wall, rim, hole)
      if (out) { const ar = part(SPH, basic(0xffffff), 0, 0.66, 0, 0); ar.scale.set(1.1, 0.08, 0.42); ar.position.set(q[4] / Math.hypot(q[4], q[5]) * 3, 0.3, q[5] / Math.hypot(q[4], q[5]) * 3); ar.rotation.y = Math.atan2(-q[5], q[4]); g.add(ar) }
      g.traverse((o) => { o.userData.keepGeo = true; o.userData.ownMat = o.material && o.material !== OUT }); holeGroup.add(g); ends.push(g)
    }
    live.pipes.push({ q, ends, kick: 0 })
  })
  // belts: a dark strip with bright chevrons that slide the way it carries
  for (const w of C.belts) {
    const cv = document.createElement('canvas'); cv.width = 64; cv.height = 64; const g = cv.getContext('2d')
    g.fillStyle = '#2a3040'; g.fillRect(0, 0, 64, 64); g.strokeStyle = '#' + (theme.belt || 0xffc21e).toString(16).padStart(6, '0'); g.lineWidth = 9; g.lineCap = 'round'; g.lineJoin = 'round'
    g.beginPath(); g.moveTo(12, 44); g.lineTo(32, 20); g.lineTo(52, 44); g.stroke()
    const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(1, w[3] / w[2])
    const m = new THREE.Mesh(BOX, basic(0xffffff, { map: tex })); m.scale.set(w[2] * 2, 0.16, w[3] * 2); m.position.set(w[0], C.h(w[0], w[1]) + 0.02, w[1]); m.rotation.y = Math.atan2(-w[4], -w[5])
    const rim = part(BOX, lam(0xc8ccd8), 0, 0, 0, 0); rim.scale.set(1.08, 0.7, 1.01); rim.position.y = -0.2; m.add(rim)
    m.traverse((o) => { o.userData.keepGeo = true; o.userData.ownMat = true }); holeGroup.add(m); live.belts.push({ w, tex })
  }
  // wind tunnels: a fan on a post at the upwind edge and white streaks flying across the zone
  for (const w of C.tunnels) {
    const l = Math.hypot(w[3], w[4]), dx = w[3] / l, dz = w[4] / l, fx0 = w[0] - dx * (w[2] + 1.5), fz0 = w[1] - dz * (w[2] + 1.5), y0 = C.h(fx0, fz0)
    const g = new THREE.Group(); g.position.set(fx0, y0, fz0); g.rotation.y = Math.atan2(dx, dz)
    const post = part(CYL, lam(0xe8ecf4), 0, 2.2, 0, 0.04); post.scale.set(0.3, 4.4, 0.3)
    const hub = part(SPH, lam(theme.fan || 0xff8a3a), 0, 4.6, 0.3, 0.04); hub.scale.setScalar(0.55)
    const blades = new THREE.Group(); blades.position.set(0, 4.6, 0.25)
    for (let i = 0; i < 3; i++) { const bl = part(SPH, lam(0xffffff), 0, 0, 0, 0.04); bl.scale.set(0.42, 1.7, 0.1); bl.position.set(Math.sin(i * 2.094) * 1.5, Math.cos(i * 2.094) * 1.5, 0); bl.rotation.z = -i * 2.094; blades.add(bl) }
    const pad = new THREE.Mesh(CIRCLE, basic(theme.fan || 0xff8a3a, { transparent: true, opacity: 0.22, depthWrite: false })); pad.scale.setScalar(w[2]); pad.position.set(w[0], C.h(w[0], w[1]) + 0.06, w[1])
    g.add(post, hub, blades); g.traverse((o) => { o.userData.keepGeo = true; o.userData.ownMat = o.material && o.material !== OUT }); pad.userData.keepGeo = true; pad.userData.ownMat = true
    const streaks = []
    for (let i = 0; i < 12; i++) { const s = new THREE.Mesh(SPH, basic(0xffffff, { transparent: true, opacity: 0.7, depthWrite: false })); s.userData.keepGeo = true; s.userData.ownMat = true; s.scale.set(0.07, 0.07, 1.1); s.rotation.y = Math.atan2(dx, dz); s.userData.k = [Math.random(), (Math.random() - 0.5) * 1.6 * w[2], 1 + Math.random() * 9]; holeGroup.add(s); streaks.push(s) }
    holeGroup.add(g, pad); live.fans.push({ w, dx, dz, blades, streaks, kick: 0 })
  }
  // sliding gates
  for (const mv of C.movers) {
    const cv = document.createElement('canvas'); cv.width = 128; cv.height = 32; const g = cv.getContext('2d')
    for (let i = -1; i < 9; i++) { g.fillStyle = i % 2 ? '#ffffff' : '#ff4a4a'; g.beginPath(); g.moveTo(i * 16, 32); g.lineTo(i * 16 + 16, 32); g.lineTo(i * 16 + 32, 0); g.lineTo(i * 16 + 16, 0); g.fill() }
    const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace
    const m = new THREE.Mesh(BOX, lam(0xffffff, { map: tex })); m.scale.set(mv[4] * 2, MOVER_H, 1.4); m.userData.keepGeo = true; m.userData.ownMat = true
    const o = new THREE.Mesh(BOX, OUT); o.scale.set(1.03, 1.06, 1.16); o.userData.keepGeo = true; m.add(o); holeGroup.add(m); live.movers.push({ mv, m })
  }
  flag.position.set(C.pin[0], C.h(C.pin[0], C.pin[1]), C.pin[1])
}

// ---------------------------------------------------------------- the shot
const shot = { club: 'driver', lie: 'fairway', dir: { x: 0, z: -1 }, target: [0, 0], ideal: 1, power: 0, angle: 0, dragging: false, sx: 0, sy: 0, perfect: false, fromTee: true, from: { x: 0, y: 0, z: 0 }, carryShown: false, tick: 0, prev: null }
const REACH = 1.22 // carry + a typical roll, for choosing the club
const reach = (c, lie) => c === 'putter' ? CLUBS.putter.roll : CLUBS[c].carry * course.lie(lie) * REACH
const dist2 = (ax, az, bx, bz) => Math.hypot(ax - bx, az - bz)
function setupShot() {
  const C = course, pin = C.pin, dPin = dist2(ball.x, ball.z, pin[0], pin[1])
  let lie = shot.fromTee ? 'fairway' : C.surf(ball.x, ball.z); if (lie === 'water') lie = 'rough'
  let club = 'putter', target = pin
  if (lie !== 'green') {
    const ok = ORDER.filter((c) => (c !== 'driver' || shot.fromTee) && !(lie === 'bunker' && (c === 'driver' || c === 'wood'))), longest = ok[ok.length - 1]
    if (dPin > reach(longest, lie) * 1.03) {
      let best = null, bd = dPin - 8
      for (const s of C.spots) { const d = dist2(ball.x, ball.z, s[0], s[1]), dp = dist2(s[0], s[1], pin[0], pin[1]); if (d > 14 && d <= reach(longest, lie) * 0.97 && dp < bd) { bd = dp; best = s } }
      if (best) target = best
    }
    const td = dist2(ball.x, ball.z, target[0], target[1])
    club = ok.find((c) => reach(c, lie) >= td * 0.99) || longest
    if (target === pin && td > reach(longest, lie)) club = longest
  }
  const td = Math.max(0.01, dist2(ball.x, ball.z, target[0], target[1]))
  shot.club = club; shot.lie = lie; shot.target = target; shot.dir = { x: (target[0] - ball.x) / td, z: (target[1] - ball.z) / td }
  // the power that would stop closest to the target with no wind: the gold band on the power bar
  // a trampoline or speed arrow on the way does not count as the plan (wind moves the ball off it): +40
  const score = (p) => { const pv = preview(C, ball, club, p, lie, shot.dir.x, shot.dir.z), r = pv.end; return r.mode === 'holed' ? -1 : dist2(r.x, r.z, target[0], target[1]) + (r.mode === 'water' || r.mode === 'ob' ? 500 : 0) + (C.surf(r.x, r.z) === 'bunker' ? 10 : 0) + (pv.used ? 40 : 0) }
  const solve = () => { let best = 1, bs = 1e9
    for (let p = 0.14; p <= 1.0001; p += 0.043) { const s = score(p); if (s < bs) { bs = s; best = p } }
    for (let p = best - 0.03; p <= best + 0.031; p += 0.01) { if (p > 1 || p < 0.1) continue; const s = score(p); if (s < bs) { bs = s; best = p } }
    return [best, bs] }
  let [best, bs] = solve()
  if (lie !== 'green') { // the club must really get there (uphill, out of a dip, over a creek): if its best shot stays far away, try the longer ones
    const ok = ORDER.filter((c) => c !== 'putter' && (c !== 'driver' || shot.fromTee) && !(lie === 'bunker' && (c === 'driver' || c === 'wood'))), near = Math.max(4, td * 0.3)
    for (let k = ok.indexOf(club) + 1; bs > near && k > 0 && k < ok.length; k++) { const keep = club; club = ok[k]; const [b2, s2] = solve(); if (s2 < bs) { best = b2; bs = s2; shot.club = club } else club = keep }
    club = shot.club
  }
  if (bs >= 500 && lie !== 'green') { // every power on this line ends in water or out: aim at ground that can be reached instead
    const cand = C.spots.map((sp) => ({ sp, d: dist2(ball.x, ball.z, sp[0], sp[1]), dp: dist2(sp[0], sp[1], pin[0], pin[1]) })).filter((c) => c.d > 3 && c.d <= reach(club, lie)).sort((a, b) => a.dp - b.dp).slice(0, 10)
    for (const c of cand) {
      const dx = (c.sp[0] - ball.x) / c.d, dz = (c.sp[1] - ball.z) / c.d; let b2 = 1, s2 = 1e9
      for (let p = 0.14; p <= 1.0001; p += 0.043) { const r = preview(C, ball, club, p, lie, dx, dz).end, sc = dist2(r.x, r.z, c.sp[0], c.sp[1]) + (r.mode === 'water' || r.mode === 'ob' ? 500 : 0); if (sc < s2) { s2 = sc; b2 = p } }
      if (s2 < 500) { best = b2; bs = s2; shot.target = c.sp; shot.dir = { x: dx, z: dz }; break }
    }
  }
  shot.ideal = clamp(best, 0.12, 0.985)
  newWind()
  shot.from = { x: ball.x, y: ball.y, z: ball.z }; shot.power = 0; shot.angle = 0; shot.dragging = false; shot.perfect = false
  placeGolfer(); swing.ang = 0; swing.twist = 0; swing.done = true; swing.t = -1; swing.cheer = 0
  game.phase = 'aim'; game.pt = 0
  syncHud()
}
// back nine: the wind turns and changes strength before every shot (front nine: one steady wind per hole)
function newWind() {
  const H = course.H, was = [course.wx, course.wz]
  if (!H.gust) { course.wx = H.wind[0]; course.wz = H.wind[1] }
  else { const a = rnd(0, Math.PI * 2), v = Math.round(rnd(H.gust[0], H.gust[1] + 0.99) - 0.49); course.wx = Math.sin(a) * v; course.wz = -Math.cos(a) * v }
  game.windNew = Math.hypot(course.wx - was[0], course.wz - was[1]) > 0.3 ? 1 : 0
}
function placeGolfer() {
  golfer.position.set(ball.x, course.h(ball.x, ball.z), ball.z)
  golfer.rotation.y = Math.atan2(-shot.dir.x, -shot.dir.z) // local -z looks down the aim
  swing.sq = 0.75; swing.sqV = 3 // lands with a little squash
}
const aimDir = () => { const c = Math.cos(shot.angle), s = Math.sin(shot.angle), d = shot.dir; return { x: d.x * c + d.z * s, z: d.z * c - d.x * s } }
function updateAim() {
  const show = game.phase === 'aim' && shot.dragging && shot.power > 0.02
  dots.visible = landRing.visible = powerRing.visible = show
  $('power').classList.toggle('hide', !show)
  if (!show) return
  const d = aimDir(), r = preview(course, ball, shot.club, shot.power, shot.lie, d.x, d.z, shot.club === 'putter' ? 9 : 5)
  const path = shot.club === 'putter' ? null : r.path, n = path ? path.length / 3 : 0
  for (let i = 0; i < DOTS; i++) {
    const k = (i + 1) / DOTS
    if (path && n > 1) { const j = Math.min(n - 1, Math.floor(k * (n - 1))); dummy.position.set(path[j * 3], path[j * 3 + 1], path[j * 3 + 2]) }
    else { // putter: a straight line as long as the roll on flat ground
      const len = CLUBS.putter.roll * shot.power, x = ball.x + d.x * len * k, z = ball.z + d.z * len * k; dummy.position.set(x, course.h(x, z) + 0.15, z)
    }
    dummy.rotation.set(0, 0, 0); dummy.scale.setScalar(0.11 + 0.1 * k); dummy.updateMatrix(); dots.setMatrixAt(i, dummy.matrix)
  }
  dots.instanceMatrix.needsUpdate = true
  const f = shot.club === 'putter' ? { x: ball.x + d.x * CLUBS.putter.roll * shot.power, z: ball.z + d.z * CLUBS.putter.roll * shot.power } : r.first
  landRing.position.set(f.x, Math.max(course.h(f.x, f.z), WATER_Y) + 0.12, f.z); landRing.scale.setScalar(shot.club === 'putter' ? 0.5 : 1.5 + Math.sin(game.time * 9) * 0.12)
  const inBand = Math.abs(shot.power - shot.ideal) < bandHalf()
  landRing.material.color.set(inBand ? 0x6dff7a : 0xffe14a)
  powerRing.position.set(ball.x, ball.y - R + 0.07, ball.z); powerRing.scale.setScalar(0.8 + shot.power * 2.2); powerRing.material.color.setHSL(0.33 - shot.power * 0.33, 1, 0.6)
  $('powerFill').style.height = `${shot.power * 100}%`; $('powerFill').style.background = inBand ? '#6dff7a' : `hsl(${120 - shot.power * 120} 95% 58%)`
  $('powerBand').style.bottom = `${(shot.ideal - bandHalf()) * 100}%`; $('powerBand').style.height = `${bandHalf() * 200}%`
  $('powerPct').textContent = Math.round(shot.power * 100)
  $('power').classList.toggle('sweet', inBand)
}
// the gold band: front nine ±4% (putter ±5%), the back nine narrows hole by hole (BALANCE.md)
const bandHalf = () => { const b = course?.H.band; return b ? (shot.club === 'putter' ? b * 1.25 : b) : shot.club === 'putter' ? 0.05 : 0.04 }
function fire() {
  shot.perfect = Math.abs(shot.power - shot.ideal) < bandHalf()
  shot.prev = { x: ball.x, y: ball.y, z: ball.z, strokes: game.strokes, fromTee: shot.fromTee }
  swing.t = 0; swing.from = swing.ang; swing.fromTwist = swing.twist; swing.power = shot.power; swing.putt = shot.club === 'putter'; swing.done = false
  game.phase = 'swing'; game.pt = 0; shot.dragging = false; game.canMull = false; swooshCol.set(shot.perfect ? 0xffe14a : 0xffffff)
  audio.play('whoosh', 0.5 + shot.power * 0.6)
  $('hint').classList.add('hide'); $('drag').classList.add('hide'); if (!save.hint) { save.hint = 1; writeSave() }
  updateAim(); syncHud()
}
function impact() {
  const d = aimDir(), p = shot.power, putt = shot.club === 'putter', big = putt ? 0.25 : 0.45 + p * 0.55
  Object.assign(ball, launch(shot.club, p, shot.lie, d.x, d.z, course.lie(shot.lie)), { t: 0, bounces: 0, hitTree: null, boosted: null, lip: false, dunk: false, rolled: 0 })
  game.strokes++; shot.fromTee = false; shot.carryShown = putt; game.phase = 'fly'; game.pt = 0
  // stage 2: the hit itself, all on this frame
  game.hitstop = putt ? 0 : shot.perfect ? 0.085 : 0.05 + p * 0.02
  game.shake = Math.max(game.shake, big * (shot.perfect ? 0.6 : 0.4)); game.punch = big * (shot.perfect ? 1.3 : 1)
  if (!putt) flash(shot.perfect ? 0.55 : 0.2 + p * 0.2)
  star.position.set(ball.x, ball.y + 0.1, ball.z); star.userData.s = big * (shot.perfect ? 1.05 : 0.8); star.material.color.set(shot.perfect ? 0xffe14a : 0xffffff); star.visible = true; starLife = 0.14
  ring(ball.x, ball.y - R, ball.z, 0.5, 3 + big * 4, 0.35, shot.perfect ? 0xffe14a : 0xffffff)
  const lieCol = shot.lie === 'bunker' ? [theme.sand, '#fff3c4'] : shot.lie === 'green' ? [theme.green2] : [theme.fair2, theme.rough2, '#6b4a2a']
  if (!putt) { burst(ball.x, ball.y, ball.z, Math.round(8 + big * 16), lieCol, 5 + big * 5, 6 + big * 5, 0.16, 0.7); for (let i = 0; i < 6 + big * 8; i++) spark(ball.x, ball.y, ball.z, d.x * rnd(8, 22) + rnd(-3, 3), rnd(2, 9), d.z * rnd(8, 22) + rnd(-3, 3), shot.perfect ? 0xffe14a : 0xffffff, 0.1, 0.35, 6) }
  if (shot.lie === 'bunker') burst(ball.x, ball.y, ball.z, 26, [theme.sand, '#fff3c4'], 7, 9, 0.2, 0.8)
  if (shot.lie === 'rough' && course.H.rough) burst(ball.x, ball.y, ball.z, 28, [theme.rough, theme.rough2, theme.fair2], 6, 9, 0.15, 1, 14, 1)
  audio.play(putt ? 'putt' : 'crack', putt ? 0.5 + p * 0.5 : 0.55 + p * 0.5, putt ? 1 : 0.9 + p * 0.25)
  if (shot.perfect) { mood('happy', 1.2); audio.play('perfect'); pop(t('perfect'), ball.x, ball.y + 2.2, ball.z, 'gold'); buzz([30, 30, 50]) } else buzz(putt ? 10 : 20 + p * 30)
  trailCol.set(shot.perfect ? 0xffd23a : 0xffffff); trailPts.length = 0
  swing.sq = putt ? 1.05 : 1.28; swing.sqV = 0
  platform.track('shot', { hole: game.hole + 1, club: shot.club, perfect: shot.perfect })
}
function stepSwing(dt) {
  if (swing.done) {
    if (game.state === 'title' || game.phase === 'intro') { // idle: a lazy practice swing now and then
      swing.idle += dt; const k = swing.idle % 3.2
      if (k < 0.9) { swing.ang = -1.5 * ease(k / 0.9); swing.twist = -1.6 * ease(k / 0.9) }
      else if (k < 1.02) { const u = (k - 0.9) / 0.12; swing.ang = lerp(-1.5, 0.2, u * u); swing.twist = lerp(-1.6, 0.2, u * u); if (!swing.idleHit) { swing.idleHit = true; swing.sq = 1.2 } }
      else if (k < 1.25) { const u = (k - 1.02) / 0.23; swing.ang = lerp(0.2, 1.7, 1 - (1 - u) ** 2); swing.twist = lerp(0.2, 1.8, 1 - (1 - u) ** 2) }
      else { const u = clamp((k - 2.2) / 0.8, 0, 1); swing.ang = lerp(1.7, 0, ease(u)); swing.twist = lerp(1.8, 0, ease(u)); swing.idleHit = false }
    } else if (face.hold > 0 && face.mood === 'sad' && swing.cheer <= 0) { const k = 1 - Math.exp(-5 * dt); swing.ang = lerp(swing.ang, 0.35, k); swing.twist = lerp(swing.twist, 0.1, k); swing.hop = 0 }
    else if (swing.cheer > 0) { swing.cheer += dt; swing.hop = Math.abs(Math.sin(swing.cheer * 9)) * 0.7; swing.ang = 2.25 + Math.sin(swing.cheer * 18) * 0.3; swing.twist = 0.35 + Math.sin(swing.cheer * 9) * 0.25 }
    else if (game.phase === 'aim') { // stage 1: the wind-up follows the pull
      const p = shot.dragging ? shot.power : 0, putt = shot.club === 'putter', k = 1 - Math.exp(-22 * dt)
      swing.ang = lerp(swing.ang, putt ? -0.75 * p : -1.5 * Math.pow(p, 0.7), k); swing.twist = lerp(swing.twist, putt ? 0 : -1.6 * Math.pow(p, 0.8), k)
      if (shot.dragging) swing.sq = lerp(swing.sq, 1 - (putt ? 0.04 : 0.17) * p + Math.sin(game.time * 30) * 0.012 * p, k)
      swing.hop = 0
    }
    return
  }
  swing.t += dt
  const down = swing.putt ? 0.09 : 0.1, thru = swing.putt ? 0.16 : 0.2, end = swing.putt ? 0.6 * swing.power + 0.2 : 1.7, tw = swing.putt ? 0.1 : 1.8
  if (swing.t < down) { const u = swing.t / down; swing.ang = lerp(swing.from, 0, u * u); swing.twist = lerp(swing.fromTwist, 0, u * u) }
  else {
    if (game.phase === 'swing') impact()
    const u = clamp((swing.t - down) / thru, 0, 1), e = 1 - (1 - u) ** 3
    swing.ang = lerp(0, end, e); swing.twist = lerp(0, tw, e)
    const h = (swing.t - down - thru) / 0.3 // the little bounce after
    swing.hop = !swing.putt && h > 0 && h < 1 ? Math.sin(h * Math.PI) * 0.45 * swing.power : 0
    if (h > 1 && h < 1.1 && !swing.putt && swing.sq > 0.95) { swing.sq = 0.86 }
    if (swing.t > 1.2) swing.done = swing.cheer > 0 // stays in the pose and watches the ball
  }
}
// what the ball tells us while it flies
function ballEvent(name, a, b) {
  const x = ball.x, y = ball.y, z = ball.z
  if (name === 'wood' || name === 'leaves') mood('wince', 1)
  if (name === 'bounce') {
    const s = a, v = Math.min(1, b / 26), first = ball.bounces === 1
    if (first && !shot.carryShown) { shot.carryShown = true; pop(`${Math.round(dist2(x, z, shot.from.x, shot.from.z))}${t('m')}`, x, y + 1.6, z, 'num') }
    if (b < 2.2) return
    if (s === 'bunker') { burst(x, y, z, 30, [theme.sand, '#fff3c4', '#e8c878'], 6 + v * 5, 8 + v * 6, 0.2, 0.8); audio.play('sand', 0.5 + v * 0.5); mark(x, y - R, z, 0.9, 0x8a6a2c); if (first) { pop(t('sand'), x, y + 2.6, z, 'bad'); mood('wince', 1.2) } }
    else if (s === 'green') { burst(x, y, z, 8, [theme.green2, '#ffffff'], 3 + v * 3, 3 + v * 3, 0.11, 0.5); audio.play('green', 0.4 + v * 0.6, 1 + rnd(-0.1, 0.1)); mark(x, y - R, z, 0.3, 0x2a5a2a) }
    else { burst(x, y, z, Math.round(8 + v * 14), s === 'rough' ? [theme.rough2, theme.rough, '#6b4a2a'] : [theme.fair2, theme.fair, '#6b4a2a'], 4 + v * 5, 5 + v * 6, 0.15, 0.7); for (let i = 0; i < 6; i++) spark(x, y, z, rnd(-3, 3), rnd(1, 3), rnd(-3, 3), 0xfff8e0, 0.3, 0.5, -1); audio.play('thud', 0.35 + v * 0.65, 1 + rnd(-0.12, 0.12)); mark(x, y - R, z, 0.35 + v * 0.3, 0x2a4a22) }
    ring(x, y - R, z, 0.3, 1.2 + v * 2.4, 0.3)
    if (first && v > 0.4) { game.shake = Math.max(game.shake, 0.12 * v); buzz(12) }
  } else if (name === 'water') {
    for (let i = 0; i < 46; i++) { const an = rnd(0, 6.3), sp = rnd(0.5, 4.5); spark(x, WATER_Y, z, Math.cos(an) * sp, rnd(6, 15), Math.sin(an) * sp, theme.hazard === 'lava' ? (i % 3 ? 0xff7a1a : 0xffe14a) : i % 3 ? 0xffffff : 0xbfeaff, rnd(0.12, 0.26), rnd(0.6, 1.1), 22) }
    ring(x, WATER_Y, z, 0.4, 3.5, 0.6); setTimeout(() => ring(x, WATER_Y, z, 0.4, 5, 0.8), 140); setTimeout(() => ring(x, WATER_Y, z, 0.4, 6, 1), 300)
    audio.play('splash'); game.shake = Math.max(game.shake, 0.12); buzz(40); pop(t(theme.hazard === 'lava' ? 'lava' : theme.hazard === 'sky' ? 'fall' : 'water'), x, y + 2.4, z, 'bad'); mood('surprise', 0.5); setTimeout(() => mood('sad', 1.8), 450)
  } else if (name === 'ob') { pop(t('ob'), x, y + 2.4, z, 'bad'); audio.play('aw'); mood('sad', 2) }
  else if (name === 'pad') { const l = live.pads.find((q) => q.p === a); if (l) l.kick = 1; audio.play('boing'); pop(t('boing'), x, y + 2.2, z, 'gold'); ring(x, y, z, 1, a[2] * 1.6, 0.35, 0xff8aa0); burst(x, y + 0.6, z, 14, ['#ffffff', '#ff8aa0', '#ffe14a'], 5, 7, 0.14, 0.6); buzz(20) }
  else if (name === 'bump') { const l = live.bumps.find((q) => q.u === a); if (l) l.kick = 1; audio.play('pop', 1, 1.5); audio.play('boing', 0.5, 1.6); pop(t('bump'), x, y + 2.2, z, 'gold'); ring(x, y, z, 0.6, 3, 0.35, 0xffe14a); burst(x, y, z, 14, ['#ffffff', '#ffe14a', '#ff4ad0'], 6, 5, 0.12, 0.5); game.shake = Math.max(game.shake, 0.1); game.punch = Math.max(game.punch, 0.5); buzz(15) }
  else if (name === 'tunnel') { const l = live.fans.find((q) => q.w === a); if (l) l.kick = 1; audio.play('whoosh', 1, 0.7); pop(t('gust'), x, y + 2, z, 'gold'); trailCol.set(0x9ae8ff) }
  else if (name === 'pipeIn') { const l = live.pipes.find((q) => q.q === a); if (l) l.kick = 1; audio.play('whoosh'); burst(x, y, z, 12, ['#ffffff', '#3fcf5a'], 3, 6, 0.12, 0.5) }
  else if (name === 'pipe') { audio.play('zoom', 1, 1.2); pop(t('pipe'), x, y + 2.4, z, 'gold'); trailPts.length = 0; burst(x, y, z, 22, ['#ffffff', '#ffe14a'], 7, 8, 0.14, 0.6); game.punch = Math.max(game.punch, 0.6); buzz(20) }
  else if (name === 'boost') { const l = live.boosts.find((q) => q.p === a); if (l) l.kick = 1; audio.play('zoom'); pop(t('zoom'), x, y + 2.2, z, 'gold'); trailCol.set(0xff8a1e); game.punch = Math.max(game.punch, 0.6); buzz(20) }
  else if (name === 'leaves') { burst(x, y, z, 18, theme.leaf.map((c) => '#' + c.toString(16).padStart(6, '0')), 4, 3, 0.2, 0.9, 7, 1); audio.play('leaves') }
  else if (name === 'wood') { audio.play('wood', clamp(a / 20, 0.3, 1)); burst(x, y, z, 6, ['#8a5a36', '#c9955a'], 3, 3, 0.1, 0.5) }
  else if (name === 'clank') { audio.play('clank', clamp(a / 14, 0.4, 1)); burst(x, y, z, 8, ['#ffffff', '#ff4a4a'], 4, 4, 0.1, 0.4); game.shake = Math.max(game.shake, 0.08) }
  else if (name === 'lip') audio.play('clank', 0.3)
  else if (name === 'holed') holed()
}
function holed() {
  const C = course, px = C.pin[0], pz = C.pin[1], py = C.h(px, pz), one = game.strokes === 1, d = game.strokes - C.H.par
  const key = one ? 'hio' : d <= -3 ? 'albatross' : d === -2 ? 'eagle' : d === -1 ? 'birdie' : d === 0 ? 'parR' : d === 1 ? 'bogey' : d === 2 ? 'dbogey' : 'over3'
  game.phase = 'holed'; game.pt = 0; game.result = key; ball.vx = ball.vy = ball.vz = 0; ball.x = px; ball.z = pz; ball.y = py + R
  const good = d <= 0 || one, great = d < 0 || one
  audio.play('cup'); buzz(great ? [40, 40, 40, 40, 80] : 30)
  ring(px, py, pz, 0.6, 5, 0.5, 0xffe14a); game.shake = Math.max(game.shake, ball.dunk ? 0.3 : 0.1)
  if (good) { setTimeout(() => audio.play(great ? 'big' : 'cheer'), 180); for (let k = 0; k < (great ? 3 : 1); k++) setTimeout(() => { for (let i = 0; i < 44; i++) { const a = rnd(0, 6.3), s = rnd(2, 8); spark(px, py + 0.4, pz, Math.cos(a) * s, rnd(9, 18), Math.sin(a) * s, ['#ff4a6a', '#ffe14a', '#4ad2ff', '#7dff6a', '#ffffff', '#b06aff'][i % 6], rnd(0.16, 0.3), rnd(1.2, 2), 12, 1) } audio.play('pop', 1, 1 + k * 0.2) }, k * 260) }
  else { setTimeout(() => audio.play('aw'), 250); mood('sad', 2.4) }
  if (ball.dunk) pop(t('dunk'), px, py + 3.4, pz, 'gold'); else if (shot.club !== 'putter') pop(t('chipin'), px, py + 3.4, pz, 'gold')
  banner(t(key), `${t('hole')} ${game.hole + 1} · ${game.strokes} ${t('stroke')}`, great ? 'great' : good ? 'good' : 'meh', 2.2)
  if (one) { save.hio++; flash(0.5) }
  swing.cheer = good ? 0.01 : 0; swing.done = true
  finishHole(game.strokes)
}
function finishHole(strokes) {
  game.scores[game.hole - game.first] = strokes
  if (game.hole === 8) save.frontDone = 1
  const st = starsFor(strokes, course.H.par), was = save.stars[game.hole] || 0
  game.starsNow = st; game.starsNew = st > was; game.opened = !save.cleared[game.hole] && game.hole + 1 < HOLES.length ? game.hole + 1 : -1
  if (st > was) save.stars[game.hole] = st
  save.cleared[game.hole] = 1
  if (!save.bestHoles[game.hole] || strokes < save.bestHoles[game.hole]) save.bestHoles[game.hole] = strokes
  writeSave(); syncHud()
  platform.track('hole_done', { hole: game.hole + 1, strokes, par: course.H.par })
}
// a ball must never rest where its next shot ends at once (in water, outside the course): move it to the nearest safe ground
function safeSpot() {
  if (!course.wet(ball.x, ball.z) && !course.out(ball.x, ball.z)) return
  let best = [0, 0], bd = 1e9
  for (const s of course.spots) { const d = dist2(ball.x, ball.z, s[0], s[1]); if (d < bd && !course.wet(s[0], s[1]) && !course.out(s[0], s[1])) { bd = d; best = s } }
  ball.x = best[0]; ball.z = best[1]; ball.y = course.h(ball.x, ball.z) + R
}
function penalty() { // water / out: one stroke, back where the shot was hit
  game.strokes++; game.lastBad = true
  Object.assign(ball, { x: shot.from.x, y: shot.from.y, z: shot.from.z, vx: 0, vy: 0, vz: 0, mode: 'rest' }); shot.fromTee = shot.prev?.fromTee ?? false
  afterShot()
}
function afterShot() {
  if (game.strokes >= course.H.par + 5) { // enough: pick the ball up and move on
    game.phase = 'holed'; game.pt = 0; game.result = 'pickup'; audio.play('aw'); mood('sad', 2.4); banner(t('pickup'), `${t('hole')} ${game.hole + 1} · ${game.strokes} ${t('stroke')}`, 'meh', 2); finishHole(game.strokes); return
  }
  safeSpot(); const s = course.surf(ball.x, ball.z); game.canMull = !game.mullUsed && (game.lastBad || s === 'bunker') && (platform.ready || game.freeMull); game.lastBad = false
  setupShot()
}
function mulligan() {
  if (game.phase !== 'aim' || !shot.prev || !game.canMull || game.mullBusy) return
  const give = () => { Object.assign(ball, { x: shot.prev.x, y: shot.prev.y, z: shot.prev.z, mode: 'rest' }); game.strokes = shot.prev.strokes; shot.fromTee = shot.prev.fromTee; game.mullUsed = true; game.canMull = false; audio.play('cheer'); burst(ball.x, ball.y, ball.z, 20, ['#ffffff', '#ffe14a'], 4, 6, 0.14, 0.6); setupShot(); platform.track('mulligan', { hole: game.hole + 1 }) }
  audio.play('click')
  if (!platform.ready) { game.freeMull = false; give(); return }
  game.mullBusy = true; $('mullBtn').disabled = true
  platform.rewardedAd((ok) => { game.mullBusy = false; $('mullBtn').disabled = false; if (ok) give(); else toast(t('noAd')) })
}

// ---------------------------------------------------------------- round flow
function setCourse(c) { game.course = c; game.single = false; game.first = COURSES[c][0]; game.last = COURSES[c][1] }
// one hole from the map
function startHole(i) {
  if (!holeOpen(i)) { audio.play('aw'); toast(t('locked')); return }
  game.course = regionOf(i).id; game.single = true; game.first = i; game.last = i + 1
  audio.unlock(); audio.music(true)
  game.state = 'run'; game.time = 0; game.scores = []; game.freeMull = true
  hideAll(); $('hud').classList.remove('hide'); platform.message('gameplay_started'); platform.track('hole_start', { hole: i + 1 })
  loadHole(i)
}
function startRun(c = save.course) {
  if (c === 'back' && !backOpen()) c = 'front'
  setCourse(c); save.course = c; writeSave()
  audio.unlock(); audio.music(true)
  game.state = 'run'; game.time = 0; game.scores = []; game.freeMull = true
  hideAll(); $('hud').classList.remove('hide'); platform.message('gameplay_started'); platform.track('round_start', { runs: save.runs, course: c })
  loadHole(game.first)
}
function loadHole(i) {
  game.hole = i; game.strokes = 0; game.mullUsed = false; game.canMull = false; game.lastBad = false; shot.prev = null
  buildHole(i)
  Object.assign(ball, { x: 0, z: 0, y: course.h(0, 0) + R, vx: 0, vy: 0, vz: 0, mode: 'rest' }); shot.fromTee = true; trailPts.length = 0
  setupShot(); game.phase = 'intro'; game.pt = 0; swing.done = true; swing.cheer = 0; swing.hop = 0
  $('holeCard').classList.add('hide'); $('skip').textContent = t('skip'); $('skip').classList.remove('hide')
  const len = Math.round(dist2(0, 0, course.pin[0], course.pin[1]))
  banner(t(course.H.name), `${t('hole')} ${i + 1} · ${t('par')} ${course.H.par} · ${len}${t('m')}`, 'intro', 2.3); audio.play('intro')
  syncHud()
}
function nextHole() {
  audio.play('click')
  if (game.single) { const n = game.hole + 1; game.played = (game.played || 0) + 1; if (n < HOLES.length && holeOpen(n)) { const go = () => startHole(n); if (game.played % 3 === 0) platform.interstitial(go); else go() } else toMap(); return }
  if (game.hole >= game.last - 1) { endRun(true); return }
  const go = () => loadHole(game.hole + 1), k = game.hole - game.first
  if (k % 3 === 2) platform.interstitial(go); else go()
}
function toMap() { platform.message('gameplay_stopped'); hideAll(); $('banner').className = ''; game.state = 'title'; showTitle() }
function retryHole() { audio.play('click'); const i = game.hole; game.played = (game.played || 0) + 1; const go = () => startHole(i); if (game.played % 3 === 0) platform.interstitial(go); else go() }
function endRun(done) {
  if (game.state === 'title' || game.state === 'over') return
  if (game.single) done = false
  platform.message('gameplay_stopped'); hideAll(); $('banner').className = ''
  if (!done) { game.state = 'title'; showTitle(); return }
  game.state = 'over'; save.runs++
  const c = game.course, par = coursePar(c), list = courseHoles(c), total = game.scores.reduce((s, v) => s + v, 0), record = !save.bestC[c] || total < save.bestC[c]
  if (record) save.bestC[c] = total
  if (c === 'front' && (!save.best || total < save.best)) save.best = total
  writeSave(); platform.track('round_done', { total, record, course: c })
  $('resNew').textContent = t('newBest'); $('resNew').classList.toggle('hide', !record)
  // the card in blocks of nine (18 holes = two blocks)
  let html = ''
  for (let b = 0; b < list.length; b += 9) {
    const hs = list.slice(b, b + 9), sc = game.scores.slice(b, b + 9), n0 = game.first + b
    html += `<div class="row head"><span>${t('hole')}</span>${hs.map((_, i) => `<i>${n0 + i + 1}</i>`).join('')}</div><div class="row"><span>${t('par')}</span>${hs.map((h) => `<i>${h.par}</i>`).join('')}</div><div class="row me"><span>${t('score')}</span>${hs.map((h, i) => `<i class="${sc[i] ? scoreCls(sc[i] - h.par) : ''}">${sc[i] || '·'}</i>`).join('')}</div>`
  }
  $('resTable').innerHTML = html; $('resTable').classList.toggle('two', list.length > 9)
  $('resTitle').textContent = `${t('roundDone')} · ${t('c' + c)}`
  $('resTotalLabel').textContent = t('total'); $('resTotal').textContent = `${total} (${vsPar(total - par)})`
  $('resBestLabel').textContent = t('best'); $('resBest').textContent = `${save.bestC[c]} (${vsPar(save.bestC[c] - par)})`
  $('againBtn').textContent = t('again'); $('homeBtn').textContent = t('home')
  $('result').classList.remove('hide'); audio.play(record ? 'big' : 'cheer')
}
const scoreCls = (d) => d <= -2 ? 'eagle' : d === -1 ? 'birdie' : d === 0 ? 'par' : d === 1 ? 'bogey' : 'bad'
function pauseRun() { if (game.state !== 'run') return; game.state = 'pause'; shot.dragging = false; $('drag').classList.add('hide'); renderPause(); $('pause').classList.remove('hide'); platform.message('gameplay_stopped') }
function resumeRun() { if (game.state !== 'pause') return; platform.paused = false; audio.unlock(); applyVolume(); $('pause').classList.add('hide'); game.state = 'run'; last = performance.now(); platform.message('gameplay_started') }
function hideAll() { for (const id of ['title', 'result', 'panel', 'pause', 'holeCard', 'hud']) $(id).classList.add('hide'); $('power').classList.add('hide'); $('drag').classList.add('hide') }
function showTitle() {
  hideAll(); game.phase = ''; swing.done = true; swing.cheer = 0; swing.hop = 0; swing.idle = 0
  if (!course) buildHole(0)
  Object.assign(ball, { x: 0, z: 0, y: course.h(0, 0) + R, mode: 'rest', vx: 0, vy: 0, vz: 0 }); shot.dir = { x: 0, z: -1 }; placeGolfer(); trailPts.length = 0
  dots.visible = landRing.visible = powerRing.visible = false
  showTitleText()
  $('title').classList.remove('hide')
}
// the stage map: regions top to bottom, nine holes in a winding path each (rows of three, the path snakes)
function showTitleText() {
  $('playBtn').textContent = t('round'); $('starTotal').textContent = totalStars()
  let html = '', next = -1
  for (let i = 0; i < HOLES.length && next < 0; i++) if (holeOpen(i) && !save.cleared[i]) next = i
  for (const r of REGIONS) {
    const open = regionOpen(r), got = save.stars.slice(r.from, r.to).reduce((a, b) => a + b, 0), n = r.to - r.from
    const pos = Array.from({ length: n }, (_, k) => { const row = Math.floor(k / 3), c = k % 3; return [row % 2 ? 83 - c * 33 : 17 + c * 33, 16 + row * 33] })
    html += `<div class="region${open ? '' : ' lock'}" style="--a:${r.bg[0]};--b:${r.bg[1]}"><div class="rHead"><b>${t('r_' + r.id)}</b><span class="rStars"><i class="starIco"></i>${got}/${n * 3}</span></div>`
    if (!open) html += `<div class="rLock"><i class="lockIco"></i>${t('needHole').replace('{n}', r.from)} · <i class="starIco"></i>${r.need}</div>`
    html += `<div class="path"><svg viewBox="0 0 100 100" preserveAspectRatio="none"><polyline points="${pos.map((q) => q.join(',')).join(' ')}"/></svg>`
    for (let k = 0; k < n; k++) {
      const i = r.from + k, ok = holeOpen(i), st = save.stars[i] || 0, cls = !ok ? 'lock' : i === next ? 'next' : save.cleared[i] ? 'done' : ''
      html += `<button class="node ${cls}" data-h="${i}" style="left:${pos[k][0]}%;top:${pos[k][1]}%"><b>${ok ? i + 1 : '<i class="lockIco"></i>'}</b><span class="st">${[0, 1, 2].map((q) => `<i class="${q < st ? 'on' : ''}"></i>`).join('')}</span><small>${t(HOLES[i].name)}</small></button>`
    }
    html += '</div></div>'
  }
  $('regions').innerHTML = html
  const nx = $('regions').querySelector('.node.next'); if (nx) requestAnimationFrame(() => { const sc = $('mapScroll'); sc.scrollTop = Math.max(0, nx.offsetTop + nx.closest('.region').offsetTop - sc.clientHeight * 0.45) })
}
// full rounds: each open region's nine, and 18 once the back nine is open
function showRounds() {
  const host = $('panelBody'); host.innerHTML = ''; host.className = 'rounds'
  $('panelTitle').textContent = t('round'); $('panelClose').textContent = t('close')
  for (const c of ['front', 'back', 'full', ...REGIONS.slice(2).map((r) => r.id)]) {
    const R = REGIONS.find((r) => r.id === c), lock = c === 'full' ? !backOpen() : !regionOpen(R), b = save.bestC[c], par = coursePar(c), btn = document.createElement('button')
    btn.className = 'course' + (lock ? ' lock' : ''); btn.innerHTML = `<b>${t('c' + c)}</b><small>${t('par')} ${par}</small><em>${lock ? `<i class="lockIco"></i>${t('locked')}` : b ? `${t('best')} ${b} (${vsPar(b - par)})` : t('noBest')}</em>`
    btn.addEventListener('click', () => { if (lock) { audio.play('aw'); toast(t('locked')); return } audio.play('click'); $('panel').classList.add('hide'); startRun(c) })
    host.appendChild(btn)
  }
  $('title').classList.add('hide'); $('panel').classList.remove('hide')
}
function syncHud() {
  if (!course) return
  const H = course.H
  $('holeNo').textContent = `${t('hole')} ${game.hole + 1}`; $('holePar').textContent = `${t('par')} ${H.par}`
  const rg = regionOf(game.hole), d0 = game.single ? rg.from : game.first, list = HOLES.slice(d0, game.single ? rg.to : game.last)
  $('dots').innerHTML = list.map((h, i) => { const s = game.single ? (d0 + i === game.hole ? game.scores[0] : 0) : game.scores[i], st = game.single && d0 + i !== game.hole ? save.stars[d0 + i] : -1
    return `<i class="${d0 + i === game.hole ? 'now ' : ''}${s ? scoreCls(s - h.par) : st > 0 ? 'star' : save.cleared[d0 + i] && game.single ? 'clr' : ''}"></i>` }).join('')
  $('dots').classList.toggle('two', list.length > 9)
  $('strokeLabel').textContent = t('stroke'); $('strokeN').textContent = Math.min(game.strokes + (game.phase === 'aim' || game.phase === 'intro' ? 1 : 0), 99)
  $('pinDist').textContent = `${Math.round(dist2(ball.x, ball.z, course.pin[0], course.pin[1]))}${t('m')}`
  const wv = Math.hypot(course.wx, course.wz), wb = $('windBox')
  $('windLabel').textContent = t('wind'); $('windNum').textContent = Math.round(wv)
  $('windArrow').style.visibility = wv < 0.5 ? 'hidden' : 'visible'
  wb.classList.toggle('strong', wv >= 4.5); wb.classList.toggle('gusty', !!H.gust)
  if (game.windNew && game.phase === 'aim') { game.windNew = 0; wb.classList.remove('pulse'); void wb.offsetWidth; wb.classList.add('pulse') }
  // the lie: long grass, sand and ice say how much power they keep
  const keep = course.lie(shot.lie), lt = $('lieTag'), lk = { rough: 'lieRough', bunker: 'lieSand', ice: 'lieIce' }[shot.lie]
  lt.classList.toggle('hide', !(lk && game.phase === 'aim')); lt.dataset.lie = shot.lie
  if (lk) $('lieText').textContent = keep < 0.995 ? `${t(lk)} −${Math.round((1 - keep) * 100)}%` : t(lk)
  $('clubName').textContent = t(shot.club); $('clubMax').textContent = `${Math.round(reach(shot.club, shot.lie) / (shot.club === 'putter' ? 1 : REACH))}${t('m')}`
  $('clubBox').dataset.lie = shot.lie
  const mb = $('mullBtn'); mb.classList.toggle('hide', !(game.canMull && game.phase === 'aim')); mb.innerHTML = `<i class="${platform.ready ? 'adIco' : 'freeIco'}"></i>${t('mulligan')}`
  $('hintText').textContent = t('hint'); $('hint').classList.toggle('hide', !(game.phase === 'aim' && !save.hint && !shot.dragging))
}

// ---------------------------------------------------------------- settings + pause
function volumeSliders(host) {
  for (const key of ['music', 'sfx']) {
    const row = document.createElement('label'); row.className = 'opt'
    row.innerHTML = `<span>${t(key)}</span><input type="range" min="0" max="1" step="0.05" value="${save[key]}">`
    row.querySelector('input').addEventListener('input', (e) => { save[key] = Number(e.target.value); applyVolume(); writeSave() })
    row.querySelector('input').addEventListener('change', () => { if (key === 'sfx') audio.play('click') })
    host.appendChild(row)
  }
}
function langRow(host, redraw) {
  const row = document.createElement('div'); row.className = 'opt'; row.innerHTML = `<span>${t('language')}</span><div class="langs"></div>`
  for (const key of Object.keys(LANGUAGES)) {
    const b = document.createElement('button'); b.className = 'lang' + (key === lang ? ' on' : ''); b.textContent = LANGUAGES[key]; b.lang = key
    b.addEventListener('click', () => { audio.play('click'); lang = key; save.lang = lang; writeSave(); document.documentElement.lang = lang; syncHud(); redraw() })
    row.querySelector('.langs').appendChild(b)
  }
  host.appendChild(row)
}
function toggleRow(host, label, text, press) {
  const row = document.createElement('div'); row.className = 'opt'; row.innerHTML = `<span>${t(label)}</span><button class="sub small">${text()}</button>`
  row.querySelector('button').addEventListener('click', (e) => { audio.play('click'); press(); e.target.textContent = text(); writeSave() })
  host.appendChild(row)
}
function renderSettings() {
  const host = $('panelBody'); host.innerHTML = ''; host.className = 'setGrid'
  $('panelTitle').textContent = t('settings'); $('panelClose').textContent = t('close')
  volumeSliders(host)
  toggleRow(host, 'shake', () => t(save.shake ? 'on' : 'off'), () => { save.shake = save.shake ? 0 : 1 })
  toggleRow(host, 'vib', () => t(save.vib ? 'on' : 'off'), () => { save.vib = save.vib ? 0 : 1; buzz(30) })
  if (document.fullscreenEnabled) toggleRow(host, 'full', () => t(document.fullscreenElement ? 'on' : 'off'), () => { try { document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen().then(renderSettings, () => {}) } catch {} })
  langRow(host, () => { renderSettings(); if (game.state === 'title') showTitleText() })
  if (!platform.ready) { const a = document.createElement('a'); a.className = 'sub small link'; a.href = FEEDBACK_URL; a.target = '_blank'; a.rel = 'noopener'; a.textContent = t('feedback'); host.appendChild(a) }
}
function renderPause() {
  const host = $('pauseOpts'); host.innerHTML = ''; host.className = 'setGrid'
  $('pauseTitle').textContent = t('paused'); $('resumeBtn').textContent = t('resume'); $('quitBtn').textContent = t('quit')
  volumeSliders(host); langRow(host, renderPause)
}
$('playBtn').addEventListener('click', () => { audio.unlock(); audio.play('click'); showRounds() })
$('regions').addEventListener('click', (e) => { const b = e.target.closest('.node'); if (b) { audio.unlock(); startHole(Number(b.dataset.h)) } })
$('retryBtn').addEventListener('click', retryHole)
$('mapBtn').addEventListener('click', () => { audio.play('click'); toMap() })
$('setBtn').addEventListener('click', () => { audio.unlock(); audio.play('click'); renderSettings(); $('title').classList.add('hide'); $('panel').classList.remove('hide') })
$('panelClose').addEventListener('click', () => { audio.play('click'); $('panel').classList.add('hide'); if (game.state === 'title') $('title').classList.remove('hide') })
$('pauseBtn').addEventListener('click', () => { audio.play('click'); pauseRun() })
$('resumeBtn').addEventListener('click', () => { audio.play('click'); resumeRun() })
$('quitBtn').addEventListener('click', () => { audio.play('click'); game.state = 'run'; endRun(false) })
$('nextBtn').addEventListener('click', nextHole)
$('againBtn').addEventListener('click', () => { audio.play('click'); platform.interstitial(() => startRun()) })
$('homeBtn').addEventListener('click', () => { audio.play('click'); game.state = 'title'; showTitle() })
$('mullBtn').addEventListener('click', mulligan)
addEventListener('keydown', (e) => { if (e.key === 'Escape') { if (game.state === 'run') pauseRun(); else if (game.state === 'pause') resumeRun() } })

// ---------------------------------------------------------------- input: one drag
const view = $('view')
let pointerId = null
view.addEventListener('pointerdown', (e) => {
  audio.unlock()
  if (game.state !== 'run') return
  if (game.phase === 'intro') { game.pt = Math.max(game.pt, INTRO - 0.35); return }
  if (game.phase !== 'aim' || pointerId !== null) return
  pointerId = e.pointerId; try { view.setPointerCapture(e.pointerId) } catch {}
  shot.dragging = true; shot.sx = e.clientX; shot.sy = e.clientY; shot.power = 0; shot.angle = 0; shot.tick = 0
  const d = $('drag'); d.classList.remove('hide'); d.style.left = `${e.clientX}px`; d.style.top = `${e.clientY}px`; dragDraw(0, 0)
  $('hint').classList.add('hide')
})
function dragDraw(dx, dy) { const len = Math.hypot(dx, dy); $('dragLine').style.width = `${len}px`; $('dragLine').style.transform = `rotate(${Math.atan2(dy, dx)}rad)`; $('dragKnob').style.transform = `translate(${dx}px,${dy}px) translate(-50%,-50%)` }
view.addEventListener('pointermove', (e) => {
  if (e.pointerId !== pointerId || !shot.dragging) return
  const dx = e.clientX - shot.sx, dy = Math.max(0, e.clientY - shot.sy), full = clamp(Math.min(innerWidth, innerHeight) * 0.36, 130, 250)
  shot.power = clamp(Math.hypot(dx, dy) / full, 0, 1)
  shot.angle = clamp(Math.atan2(dx, Math.max(dy, full * 0.25)) * 0.7, -0.8, 0.8)
  const step = Math.floor(shot.power * 12); if (step !== shot.tick) { shot.tick = step; audio.play('tick', 0.5 + shot.power * 0.5, 1 + step * 0.07); if (Math.abs(shot.power - shot.ideal) < bandHalf()) buzz(8) }
  dragDraw(dx, e.clientY - shot.sy)
})
function release(e, cancel) {
  if (e.pointerId !== pointerId) return
  pointerId = null; $('drag').classList.add('hide')
  if (!shot.dragging) return
  if (cancel || shot.power < 0.1 || game.phase !== 'aim' || game.state !== 'run') { shot.dragging = false; shot.power = 0; syncHud(); return }
  fire()
}
view.addEventListener('pointerup', (e) => release(e, false)); view.addEventListener('pointercancel', (e) => release(e, true))
view.addEventListener('contextmenu', (e) => e.preventDefault())

// ---------------------------------------------------------------- camera
const cam = { pos: new THREE.Vector3(0, 6, 10), look: new THREE.Vector3(0, 1, -10), tp: new THREE.Vector3(), tl: new THREE.Vector3(), orbit: 0 }
const INTRO = 2.6
function aimCam(tp, tl) {
  const d = shot.dir, putt = shot.club === 'putter', p = shot.dragging ? shot.power : 0
  const D = (putt ? 7.6 : 8.6) + p * 1.6 + (portrait ? 1.6 : 0), Hh = (putt ? 4.8 : portrait ? 5.4 : 4) + p * 0.7, ahead = putt ? 6 : portrait ? 17 : 15
  const side = putt ? 0 : portrait ? 1.3 : 2.2; tp.set(ball.x - d.x * D - d.z * side, ball.y + Hh, ball.z - d.z * D + d.x * side); tl.set(ball.x + d.x * ahead, ball.y + (putt ? 0 : 0.6), ball.z + d.z * ahead)
}
function stepCamera(dt) {
  const tp = cam.tp, tl = cam.tl
  let k = 1 - Math.exp(-5 * dt)
  if (game.state === 'title' || game.state === 'load') { cam.orbit += dt * 0.22; const a = cam.orbit; tp.set(ball.x + Math.sin(a) * 7.5 + 2.5, ball.y + 3.2, ball.z + Math.cos(a) * 3 + 8.5); tl.set(ball.x - 0.6, ball.y + (portrait ? 2.6 : 1.4), ball.z - 3); k = 1 }
  else if (game.phase === 'intro') {
    const u = ease(clamp(game.pt / INTRO, 0, 1)), C = course, px = C.pin[0], pz = C.pin[1], py = C.h(px, pz)
    aimCam(v1, v2); const d = shot.dir
    tp.set(lerp(px - d.x * 16, v1.x, u), lerp(py + 16, v1.y, u) + Math.sin(u * Math.PI) * 26, lerp(pz - d.z * 16 + 14, v1.z, u)); tl.set(lerp(px, v2.x, u), lerp(py, v2.y, u), lerp(pz, v2.z, u)); k = 1
  }
  else if (game.phase === 'aim' || game.phase === 'swing') { aimCam(tp, tl); k = 1 - Math.exp(-(game.pt < 1 ? 3.5 : 9) * dt) }
  else if (game.phase === 'fly') {
    const sp = Math.hypot(ball.vx, ball.vz)
    if (sp > 0.5) { cam.dx = ball.vx / sp; cam.dz = ball.vz / sp }
    const dx = cam.dx ?? shot.dir.x, dz = cam.dz ?? shot.dir.z, far = shot.club === 'putter' ? 7 : 9 + Math.min(sp, 50) * 0.07
    tp.set(ball.x - dx * far, Math.max(ball.y + 3.6, course.h(ball.x, ball.z) + 3.2) + (shot.club === 'putter' ? 1.6 : 0), ball.z - dz * far); tl.set(ball.x + dx * 4, ball.y + 0.4, ball.z + dz * 4)
    k = 1 - Math.exp(-(game.pt < 0.25 ? 2 : 6) * dt)
  }
  else if (game.phase === 'holed') { cam.orbit += dt * 0.7; const C = course; tp.set(C.pin[0] + Math.sin(cam.orbit) * 8, C.h(C.pin[0], C.pin[1]) + 4.2, C.pin[1] + Math.cos(cam.orbit) * 8); tl.set(C.pin[0], C.h(C.pin[0], C.pin[1]) + 1.6, C.pin[1]); k = 1 - Math.exp(-3 * dt) }
  cam.pos.lerp(tp, k); cam.look.lerp(tl, Math.min(1, k * 1.6))
  if (course) { const gy = Math.max(course.h(cam.pos.x, cam.pos.z), WATER_Y) + 1.4; if (cam.pos.y < gy) cam.pos.y = gy }
  camera.position.copy(cam.pos)
  if (game.shake > 0.002 && save.shake) camera.position.add(v3.set(rnd(-1, 1), rnd(-1, 1), rnd(-1, 1)).multiplyScalar(game.shake))
  camera.lookAt(cam.look)
  if (game.camFix) { const f = game.camFix, W = (v) => (f[6] ? v : golfer.localToWorld(v)); camera.position.copy(W(v3.set(f[0], f[1], f[2]))); camera.lookAt(W(v2.set(f[3], f[4], f[5]))) } // ?debug: a close look at the golfer (7th value 1 = world coordinates)
  const fov = baseFov + game.punch * 7 - (game.phase === 'aim' && shot.dragging ? shot.power * 3 : 0)
  if (Math.abs(fov - camera.fov) > 0.01) { camera.fov = fov; camera.updateProjectionMatrix() }
}

// ---------------------------------------------------------------- frame
let last = performance.now(), acc = 0, rollTick = 0
function simulate(dt) {
  game.time += dt; game.pt += dt; course.time = game.time
  stepSwing(dt)
  if (game.phase === 'intro' && game.pt >= INTRO) { game.phase = 'aim'; game.pt = 0; $('skip').classList.add('hide'); syncHud() }
  else if (game.phase === 'fly') {
    acc += dt
    while (acc >= 1 / 120 && game.phase === 'fly') {
      acc -= 1 / 120
      if (ball.mode === 'air' || ball.mode === 'roll') stepBall(ball, 1 / 120, course, ballEvent, true)
      if (game.hitstop > 0) break
    }
    if (ball.mode === 'roll') { rollTick += Math.hypot(ball.vx, ball.vz) * dt; if (rollTick > 1.6) { rollTick = 0; audio.play('roll', clamp(Math.hypot(ball.vx, ball.vz) / 12, 0.2, 1), 0.8 + Math.hypot(ball.vx, ball.vz) * 0.03) } }
    if (shot.perfect && ball.mode === 'air' && Math.random() < 0.7) spark(ball.x, ball.y, ball.z, rnd(-1, 1), rnd(-1, 1), rnd(-1, 1), Math.random() < 0.5 ? 0xffe14a : 0xff8a1e, 0.14, 0.4, 0)
    if (game.phase === 'fly' && ball.mode !== 'air' && ball.mode !== 'roll') { game.phase = 'settle'; game.pt = 0; syncHud() }
  }
  else if (game.phase === 'settle') {
    const bad = ball.mode === 'water' || ball.mode === 'ob'
    if (game.pt > (bad ? 1.1 : 0.45)) { if (bad) penalty(); else afterShot() }
  }
  else if (game.phase === 'holed' && game.pt > 2.3) {
    game.phase = 'card'; const H = course.H, key = game.result, sofar = game.scores.reduce((s, v) => s + v, 0), parSofar = HOLES.slice(game.first, game.hole + 1).reduce((s, h) => s + h.par, 0)
    $('hcTitle').textContent = t(key); $('hcTitle').className = scoreCls(game.strokes - H.par)
    $('hcSub').textContent = `${t('hole')} ${game.hole + 1} · ${t('par')} ${H.par} · ${game.strokes} ${t('stroke')}`
    $('hcTotalLabel').textContent = t('total'); $('hcTotal').textContent = `${sofar} (${vsPar(sofar - parSofar)})`
    const st = game.starsNow || 0, best = save.stars[game.hole] || 0
    $('hcStars').innerHTML = [0, 1, 2].map((k) => `<i class="${k < st ? 'on' : ''}" style="animation-delay:${0.15 + k * 0.22}s"></i>`).join('')
    $('hcNote').textContent = game.starsNew && best > 0 ? t('newStars') : game.opened >= 0 ? `${t('opened')} ${t('hole')} ${game.opened + 1}` : st ? '' : t('parForStar')
    $('hcNote').classList.toggle('hide', !$('hcNote').textContent)
    $('hcTotal').parentNode.classList.toggle('hide', game.single)
    const nextOk = game.hole + 1 < HOLES.length && holeOpen(game.hole + 1)
    $('retryBtn').classList.toggle('hide', !game.single); $('mapBtn').classList.toggle('hide', !game.single); $('retryBtn').textContent = t('retry'); $('mapBtn').textContent = t('map')
    $('nextBtn').classList.toggle('hide', game.single && !nextOk)
    $('nextBtn').textContent = game.single ? t('next') : game.hole >= game.last - 1 ? t('card') : t('next'); $('holeCard').classList.remove('hide'); $('banner').className = ''
  }
  for (const l of live.movers) { const x = moverX(l.mv, game.time); l.m.position.set(x, course.h(x, l.mv[1]) + MOVER_H / 2 - 0.1, l.mv[1]) }
}
function frame(now) {
  requestAnimationFrame(frame)
  const raw = Math.min(0.05, (now - last) / 1000) * (game.slow || 1); last = now
  const frozen = platform.adOpen || platform.paused || game.adHold || document.hidden
  let dt = raw
  if (game.hitstop > 0) { game.hitstop -= raw; dt = raw * 0.04 } // stage 2: the world holds its breath
  if (game.state === 'run' && !frozen) { for (let i = 0; i < TURBO; i++) simulate(dt) }
  else if (game.state === 'title') { stepSwing(raw); game.time += 0 }
  if (game.state === 'pause' || frozen) dt = 0
  const fx = game.state === 'pause' || frozen ? 0 : raw
  game.shake *= Math.exp(-9 * fx); game.punch *= Math.exp(-7 * fx)
  poseGolfer(fx); stepParticles(game.hitstop > 0 ? fx * 0.2 : fx); stepRings(fx); stepFloats(fx)
  if (bannerTimer > 0) { bannerTimer -= fx; if (bannerTimer <= 0) $('banner').className = '' }
  // ball + shadow
  const moving = game.phase === 'fly' && (ball.mode === 'air' || ball.mode === 'roll')
  const hide = ball.mode === 'water' || (game.phase === 'holed' && game.result !== 'pickup') || game.phase === 'card'
  ballMesh.visible = !hide; ballMesh.position.set(ball.x, ball.y, ball.z)
  const sp = Math.hypot(ball.vx, ball.vy, ball.vz), st = moving ? Math.min(0.7, sp * 0.018) : 0
  if (st > 0.02) { ballMesh.lookAt(ball.x + ball.vx, ball.y + ball.vy, ball.z + ball.vz); ballMesh.scale.set(R * 1.1 * (1 - st * 0.3), R * 1.1 * (1 - st * 0.3), R * 1.1 * (1 + st)) } else ballMesh.scale.setScalar(R * 1.1)
  if (course) { const gy = Math.max(course.h(ball.x, ball.z), WATER_Y), hgt = Math.max(0, ball.y - R - gy), s = 0.42 / (1 + hgt * 0.06); ballShadow.visible = !hide; ballShadow.position.set(ball.x, gy + 0.05, ball.z); ballShadow.scale.set(s, 1, s); ballShadow.material.opacity = 0.34 / (1 + hgt * 0.05) }
  stepTrail(moving && sp > 3)
  if (game.state === 'run' || game.state === 'pause') updateAim()
  // flag cloth waves, clouds drift, toys settle
  cloth.rotation.y = Math.sin(now * 0.004) * 0.35 + (course ? Math.atan2(-course.wz, course.wx) : 0)
  for (const c of clouds.children) { c.position.x += fx * 1.2; if (c.position.x > 300) c.position.x = -300 }
  for (const l of live.belts) l.tex.offset.y = (l.tex.offset.y - fx * l.w[6] / (l.w[2] * 2)) % 1
  for (const l of live.fans) { l.kick *= Math.exp(-3 * fx); l.blades.rotation.z -= fx * (9 + l.kick * 20); const w = l.w, y0 = course.h(w[0], w[1])
    for (const s of l.streaks) { const k = s.userData.k; k[0] = (k[0] + fx * (0.55 + l.kick)) % 1; const a = (k[0] * 2 - 1) * w[2]; s.position.set(w[0] + l.dx * a - l.dz * k[1], y0 + k[2], w[1] + l.dz * a + l.dx * k[1]); s.material.opacity = Math.sin(k[0] * Math.PI) * 0.75 } }
  for (const l of live.bumps) { l.kick *= Math.exp(-7 * fx); const k = l.kick; l.g.scale.set(1 + k * 0.3, 1 - k * 0.18, 1 + k * 0.3); l.cap.material.color.setHex(k > 0.3 ? 0xffffff : (theme.bump || [0xff4a6a, 0xffd23a])[(live.bumps.indexOf(l) + 1) % 2]) }
  for (const l of live.pipes) { l.kick *= Math.exp(-6 * fx); for (const g of l.ends) g.scale.setScalar(1 + l.kick * 0.25) }
  for (const l of live.pads) { l.kick *= Math.exp(-6 * fx); l.g.scale.set(1 + l.kick * 0.25, 1 - l.kick * 0.5 * Math.cos(l.kick * 9), 1 + l.kick * 0.25) }
  if (course) stepLive(now, Math.min(0.05, raw))
  for (const l of live.boosts) { l.kick *= Math.exp(-5 * fx); const s = l.p[2] * (1 + l.kick * 0.3 + Math.sin(now * 0.006) * 0.04); l.m.scale.set(s, 1, s) }
  stepCamera(fx || raw * (game.state === 'title' ? 1 : 0))
  // wind arrow turns with the camera; pin distance follows the ball
  if (course && game.state === 'run') {
    const f = v1.copy(cam.look).sub(cam.pos); const fa = Math.atan2(f.x, -f.z), wa = Math.atan2(course.wx, -course.wz)
    $('windArrow').style.transform = `rotate(${wa - fa}rad)`
    if (moving) $('pinDist').textContent = `${Math.round(dist2(ball.x, ball.z, course.pin[0], course.pin[1]))}${t('m')}`
  }
  renderer.render(scene, camera)
}

// ---------------------------------------------------------------- start
async function boot() {
  await platform.init()
  document.documentElement.lang = lang
  game.state = 'title'; showTitle()
  renderer.render(scene, camera)
  requestAnimationFrame((now) => { last = now; frame(now); $('loading').classList.add('gone'); setTimeout(() => $('loading').remove(), 400); platform.message('game_ready'); console.log(`BONK READY ${Math.round(performance.now())}ms`) })
}
boot()

// ---------------------------------------------------------------- test hooks (?debug)
if (DEBUG) window.__dbg = {
  game, shot, ball, save, platform, audio, swing,
  state: () => ({ state: game.state, phase: game.phase, hole: game.hole, strokes: game.strokes, scores: game.scores.slice(), club: shot.club, lie: shot.lie, ideal: shot.ideal, mode: ball.mode, time: game.time, info: renderer.info.memory }),
  start: (c) => startRun(c), course: (c) => setCourse(c),
  hole: (i) => { if (game.single || i < game.first || i >= game.last) setCourse(regionOf(i).id); game.scores = []; game.state = 'run'; hideAll(); $('hud').classList.remove('hide'); loadHole(i); game.pt = INTRO },
  wind: (x, z) => { course.wx = x; course.wz = z; syncHud() },
  drag: (p, a = 0) => { shot.dragging = true; shot.power = p; shot.angle = a },
  shoot: (p, a = 0) => { if (game.phase !== 'aim') return false; shot.dragging = true; shot.power = p ?? shot.ideal; shot.angle = a; fire(); return true },
  auto: () => { if (game.state !== 'run') return game.state; if (game.phase === 'intro') game.pt = INTRO; if (game.phase === 'aim') { shot.power = shot.ideal; shot.angle = 0; shot.dragging = true; fire() } if (game.phase === 'card') nextHole(); return game.phase },
  holeIn: () => { ball.x = course.pin[0] + 1.2; ball.z = course.pin[1] + 0.2; ball.y = course.h(ball.x, ball.z) + R; shot.fromTee = false; setupShot() },
  put: (x, z) => { ball.x = x; ball.z = z; ball.y = course.h(x, z) + R; shot.fromTee = false; ball.mode = 'rest'; setupShot() },
  drop: (x, z, vx = 0, vz = 0, vy = -14, hgt = 6) => { Object.assign(ball, { x, z, y: course.h(x, z) + R + hgt, vx, vy, vz, mode: hgt > 0 ? 'air' : 'roll', t: 0, bounces: 0 }); shot.fromTee = false; game.strokes++; game.phase = 'fly'; game.pt = 0 },
  C: () => course, cam: (f) => { game.camFix = f }, mood: (m, h) => mood(m, h),
  pos: () => ({ x: ball.x, y: ball.y, z: ball.z, v: Math.hypot(ball.vx, ball.vy, ball.vz), mode: ball.mode, surf: course.surf(ball.x, ball.z), phase: game.phase, pt: game.pt, power: shot.power, ideal: shot.ideal, club: shot.club }),
  end: endRun, pause: pauseRun, resume: resumeRun, settings: () => $('setBtn').click(), mull: () => { game.canMull = true; syncHud() },
  lang: (l) => { lang = l; document.documentElement.lang = l; syncHud(); if (game.state === 'title') showTitle() }, single: (i) => startHole(i), map: () => toMap(), rounds: () => showRounds(), stars: (arr) => { arr.forEach((v, i) => { save.stars[i] = v; save.cleared[i] = v > 0 ? 1 : 0 }); if (game.state === 'title') showTitle() },
}
