// Baekho Pocha, 2nd prototype (2026-11-14): Seoul, about 5 minutes. One stick (walk), no buttons in play.
// Stand on a spot to work: batter -> grill -> display -> customers take food -> the till takes their money.
// Goals on screen in three layers: the next money spot ("Next: Eomuk 30"), the street map n/8, and when all 8 are lit the
// "next city: Tokyo" ending. Helpers (till, runner, cook) take the loop over one by one, so by about 4 minutes money
// comes in while Baekho stands still. Order: gamedev-kit/history/NEXT_GAMES.md '백호 포장마차 2차 시제품'.
import * as THREE from './vendor/three.module.min.js'
import { STR, CITY, LANGUAGES } from './strings.js?v=8fca9c5'
const city = CITY.seoul

const Q = new URLSearchParams(location.search)
const SPEED = Math.max(1, Math.min(10, Math.round(+Q.get('speed') || 1))) // tests: run faster
const LANG_KEYS = Object.keys(LANGUAGES)
const pickLang = (code) => { const c = String(code || '').slice(0, 2).toLowerCase(); return LANG_KEYS.includes(c) ? c : '' }
let lang = pickLang(Q.get('lang')) || pickLang(navigator.language) || 'en'
const t = (k) => STR[lang][k] ?? STR.en[k]
const talkLines = (k) => STR[lang].talk?.[k] || STR[lang][k] || STR.en.talk[k] || STR.en[k]
const $ = (id) => document.getElementById(id)
const clamp = (v, a, b) => Math.max(a, Math.min(b, v))
const rnd = (a, b) => a + Math.random() * (b - a)
const pick = (a) => a[Math.floor(Math.random() * a.length)]

// ---------------------------------------------------------------- numbers (prototype; BALANCE.md comes with the first real build)
const RUSH_AT = 175, RUSH_LEN = 22, PATIENCE = 32, MAX_GRILL = 10, MAX_DISP = 10, MAX_LINE = 4
// the 8 lamps of the street: the bungeoppang stall is lit from the start, then one money spot at a time
const STEPS = [
  { what: 'stall', id: 1, cost: 20, x: 2.7, z: -7.7 },
  { what: 'staff', role: 'cash', cost: 45, x: 3.6, z: 12.4 },
  { what: 'stall', id: 2, cost: 80, x: -2.7, z: 4.4 },
  { what: 'staff', role: 'carry', cost: 120, x: 0, z: -2.4 },
  { what: 'stall', id: 3, cost: 160, x: 2.7, z: 4.4 },
  { what: 'staff', role: 'cook', cost: 200, x: 0, z: 4.6 },
  { what: 'arch', cost: 260, x: 0, z: -8.4 },
]
const spawnGap = () => (game.rush ? 0.75 : 4.6 / Math.pow(openCount(), 0.8)) * rnd(0.75, 1.25)

// ---------------------------------------------------------------- renderer, scene
const canvas = $('c')
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' })
renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
const scene = new THREE.Scene()
const SKY = new THREE.Color(0x141a3a)
scene.background = SKY.clone()
scene.fog = new THREE.Fog(0x141a3a, 40, 140)
const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 300)
const hemi = new THREE.HemisphereLight(0xa8b0ff, 0x6a4030, 2.3); scene.add(hemi)
const moon = new THREE.DirectionalLight(0xb8c0ff, 1.1); moon.position.set(-6, 14, 9); scene.add(moon)

const mats = new Map()
const mat = (c, e = 0) => { const k = c + ':' + e; if (!mats.has(k)) mats.set(k, new THREE.MeshLambertMaterial({ color: c, emissive: e, flatShading: true })); return mats.get(k) }
const basic = (c) => new THREE.MeshBasicMaterial({ color: c })
function mesh(geo, m, x = 0, y = 0, z = 0, parent = scene) { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); parent.add(o); return o }
const M = (c) => (typeof c === 'number' ? mat(c) : c)
// shapes are cached by size: people, helpers and food are made again every customer and every run, and new geometry each
// time grew GPU memory run after run (RELEASE_GATE MEM)
const GEO = new Map()
const geo = (key, make) => { let g = GEO.get(key); if (!g) { g = make(); GEO.set(key, g) } return g }
const box = (w, h, d, c, x, y, z, p) => mesh(geo(`b${w},${h},${d}`, () => new THREE.BoxGeometry(w, h, d)), M(c), x, y, z, p)
const cyl = (r1, r2, h, c, x, y, z, p, seg = 8) => mesh(geo(`c${r1},${r2},${h},${seg}`, () => new THREE.CylinderGeometry(r1, r2, h, seg)), M(c), x, y, z, p)
const sph = (r, c, x, y, z, p, ws = 10, hs = 8) => mesh(geo(`s${r},${ws},${hs}`, () => new THREE.SphereGeometry(r, ws, hs)), M(c), x, y, z, p)
function canvasTex(w, h, draw) {
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h
  const g = cv.getContext('2d'); draw(g, w, h)
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4
  return { tex, cv, g }
}
const FONT = 'system-ui, "Apple SD Gothic Neo", "Malgun Gothic", sans-serif'

// ---------------------------------------------------------------- the street (z from -13 at the back to 22 at the entrance)
const Z0 = -13.4, Z1 = 22.5, XW = 5.9
const ground = mesh(new THREE.PlaneGeometry(60, 90), mat(0x3e3546), 0, 0, 5); ground.rotation.x = -Math.PI / 2
for (let z = -14; z <= 24; z += 2) { const l = mesh(new THREE.PlaneGeometry(12.4, 0.06), basic(0x3a3950), 0, 0.005, z); l.rotation.x = -Math.PI / 2 }
for (const x of [-6.35, 6.35]) box(0.3, 0.18, 40, 0x55536a, x, 0.09, 5)
// buildings sized for people: shops on the ground floor, lit windows above; few of them so phones stay fast
const winGeo = new THREE.PlaneGeometry(0.8, 1.0)
const winOn = [0xffd98a, 0xffe7b0, 0xffb877].map((c) => new THREE.MeshBasicMaterial({ color: c })), winOff = new THREE.MeshBasicMaterial({ color: 0x2a2f55 })
const shopSigns = [0xff5d8f, 0x7fe3ff, 0xffd23f, 0x9cff7a]
function building(x, z, w, d, h, c, face) {
  box(w, h, d, c, x, h / 2, z)
  const along = face === 'z' ? w : d, cols = Math.floor(along / 1.4), rows = Math.floor((h - 3) / 1.7)
  const sx = x < 0 ? 1 : -1
  const put = (m, u, y) => {
    if (face === 'z') m.position.set(x - w / 2 + 0.7 + u * 1.4, y, z + d / 2 + 0.01)
    else { m.position.set(x + sx * (w / 2 + 0.01), y, z - d / 2 + 0.7 + u * 1.4); m.rotation.y = sx * Math.PI / 2 }
    scene.add(m)
  }
  for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) put(new THREE.Mesh(winGeo, Math.random() < 0.6 ? pick(winOn) : winOff), i, 3.4 + j * 1.7)
  // a glowing shop sign strip on the ground floor
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(along * 0.8, 0.45), basic(pick(shopSigns)))
  if (face === 'z') sign.position.set(x, 2.6, z + d / 2 + 0.02); else { sign.position.set(x + sx * (w / 2 + 0.02), 2.6, z); sign.rotation.y = sx * Math.PI / 2 }
  scene.add(sign)
}
const bcols = [0x3b3460, 0x463a5e, 0x33405f, 0x4a3550, 0x3d3a52]
building(-4.6, -15.8, 4.4, 3, 7, bcols[0], 'z'); building(0, -16.2, 4.8, 3, 5.5, bcols[1], 'z'); building(4.7, -15.8, 4.4, 3, 6.5, bcols[2], 'z')
for (let z = -11; z < 26; z += 7.2) { building(-8.6, z, 4, 7, rnd(6, 10), pick(bcols), 'x'); building(8.6, z, 4, 7, rnd(6, 10), pick(bcols), 'x') }

// Namsan with its tower far behind the street (shape from AI Invasion's Seoul landmark), lit up at night
function namsan() {
  const g = new THREE.Group(), CON = 0xeeeeea
  cyl(26, 34, 14, 0x23402c, 0, 7, 0, g, 18); cyl(16, 26, 10, 0x2a4a33, 0, 18, 0, g, 16); cyl(7, 16, 6, 0x30553a, 0, 26, 0, g, 14)
  cyl(0.9, 1.6, 20, new THREE.MeshLambertMaterial({ color: CON, emissive: 0x33334a }), 0, 39, 0, g, 12)
  cyl(3.4, 3.4, 1.4, CON, 0, 49.3, 0, g, 20)
  cyl(3.6, 3.6, 1.4, basic(0x9fd8ff), 0, 50.7, 0, g, 20)
  cyl(3.3, 3.3, 1.2, CON, 0, 52, 0, g, 20)
  for (let k = 0; k < 6; k++) cyl(0.5 - k * 0.05, 0.5 - k * 0.05, 2.2, k % 2 ? mat(CON) : basic(0xff5a4a), 0, 54.7 + k * 2.2, 0, g, 8)
  const tip = sph(0.6, basic(0xff3030), 0, 68, 0, g, 8, 6)
  g.traverse((o) => { if (o.material) { o.material = o.material.clone(); o.material.fog = false } })
  g.position.set(14, 0, -95); scene.add(g)
  return { g, tip }
}
const tower = namsan()
// a few far towers so the skyline reads as Seoul at night
for (const [x, z, h] of [[-30, -80, 34], [-14, -88, 24], [34, -84, 40], [-44, -70, 18]]) { box(7, h, 7, 0x24284a, x, h / 2, z); for (let k = 0; k < h / 3; k++) if (Math.random() < 0.7) box(5, 0.4, 0.1, basic(0xffd98a), x, 2 + k * 3, z + 3.56) }

// warm pools of light on the street (painted, not real lights, so phones stay fast)
const glowTex = canvasTex(128, 128, (g) => { const r = g.createRadialGradient(64, 64, 0, 64, 64, 64); r.addColorStop(0, 'rgba(255,196,110,.62)'); r.addColorStop(0.55, 'rgba(255,160,80,.22)'); r.addColorStop(1, 'rgba(255,140,60,0)'); g.fillStyle = r; g.fillRect(0, 0, 128, 128) }).tex
const glowMat = new THREE.MeshBasicMaterial({ map: glowTex, transparent: true, depthWrite: false })
const glow = (x, z, r) => { const m = mesh(geo('glow', () => new THREE.PlaneGeometry(1, 1)), glowMat, x, 0.011, z); m.rotation.x = -Math.PI / 2; m.scale.set(r * 2, r * 2, 1); return m }
for (const z of [-9, -3, 3, 9, 15]) for (const x of [-3.2, 0, 3.2]) glow(x, z, 2.6)
// street furniture on the sides: plastic tables and stools, beer crates, lamp posts (outside the walking area)
const sideBlocks = []
const stoolCols = [0xe8412f, 0x2f7de8, 0xe8412f, 0x35b36b]
for (const [x, z, n] of [[-5.3, -1.6, 0], [5.3, -1.2, 1], [-5.3, 10.4, 2], [5.3, 10.8, 3], [-5.3, 17.5, 1], [5.3, 18.2, 0]]) {
  cyl(0.42, 0.42, 0.06, stoolCols[n], x, 0.7, z, scene, 12); cyl(0.06, 0.06, 0.68, 0x9a9aa8, x, 0.35, z, scene, 6)
  for (const dz of [-0.75, 0.75]) { cyl(0.2, 0.17, 0.42, stoolCols[(n + 1) % 4], x, 0.21, z + dz, scene, 10) }
  if (n % 2) { box(0.22, 0.32, 0.22, 0x2a8a3a, x + 0.12, 0.89, z + 0.1); box(0.1, 0.1, 0.1, 0xffffff, x - 0.12, 0.78, z - 0.12) }
  else { cyl(0.16, 0.16, 0.06, 0xfaf3e6, x, 0.76, z, scene, 10); cyl(0.12, 0.12, 0.04, 0xd8341e, x, 0.8, z, scene, 10) }
  // a paper cup of eomuk skewers
  cyl(0.08, 0.06, 0.18, 0xffffff, x - 0.05, 0.82, z + 0.45, scene, 8)
  for (const [dx, r] of [[-0.02, 0.15], [0.02, -0.12], [0, 0.02]]) { const st = cyl(0.012, 0.012, 0.42, 0xc8a26b, x - 0.05 + dx, 0.98, z + 0.45, scene, 4); st.rotation.z = r }
  sideBlocks.push([x, z, 0.9, 2.1])
}
for (const [x, z] of [[-5.4, 5.6], [5.4, 5.2], [-5.4, 22.5], [5.4, 21.6]]) { box(0.6, 0.45, 0.45, 0x2a8a3a, x, 0.23, z); box(0.6, 0.45, 0.45, 0xffb000, x, 0.68, z, scene); sideBlocks.push([x, z, 0.6, 0.45]) }
for (const [x, z] of [[-6.15, -7], [6.15, 3.5], [-6.15, 13.5], [6.15, 20]]) {
  cyl(0.07, 0.09, 3.6, 0x30303c, x, 1.8, z, scene, 6); const arm = box(0.9, 0.06, 0.06, 0x30303c, x - Math.sign(x) * 0.42, 3.55, z)
  sph(0.2, basic(0xffe2a0), x - Math.sign(x) * 0.85, 3.4, z, scene, 8, 6); glow(x - Math.sign(x) * 1.2, z, 2.2)
}

// ---------------------------------------------------------------- Seoul street dressing (11-14 user "그 나라 여행 간 느낌")
// vertical Hangul neon boards sticking out of the buildings (plain shop words, no brands), utility poles with sagging wires,
// flyers on the walls, a delivery scooter, paper cups of skewers on the tables. City data: strings.js CITY.seoul.boards.
function vSign(text, bg, fg, x, y, z) {
  const n = [...text].length
  const { tex } = canvasTex(96, 64 + n * 84, (g, W, H) => {
    g.fillStyle = bg; g.beginPath(); g.roundRect(4, 4, W - 8, H - 8, 10); g.fill()
    g.strokeStyle = 'rgba(255,255,255,.85)'; g.lineWidth = 4; g.beginPath(); g.roundRect(10, 10, W - 20, H - 20, 8); g.stroke()
    g.fillStyle = fg; g.font = `900 70px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'
    ;[...text].forEach((ch, i) => g.fillText(ch, W / 2, 32 + 42 + i * 84))
  })
  const h = 0.55 * (64 + n * 84) / 96
  const m = mesh(new THREE.PlaneGeometry(0.55, h), new THREE.MeshBasicMaterial({ map: tex, transparent: true }), x, y, z)
  box(0.04, 0.04, 0.5, 0x30303c, x, y + h / 2 - 0.1, z - 0.25); box(0.04, 0.04, 0.5, 0x30303c, x, y - h / 2 + 0.1, z - 0.25)
  return m
}
const BOARD_COLS = [['#d8261e', '#fff6d0'], ['#1d3f8a', '#ffe14a'], ['#ffd23f', '#c0161b'], ['#1b8a4a', '#ffffff'], ['#ff5d8f', '#ffffff'], ['#6a2fb8', '#7fe3ff']]
city.boards.forEach((w, i) => {
  const side = i % 2 ? 1 : -1, z = -10 + Math.floor(i / 2) * 5.6 + (side > 0 ? 2.4 : 0), [bg, fg] = BOARD_COLS[i % BOARD_COLS.length]
  vSign(w, bg, fg, side * 6.25, 4.2 + (i % 3) * 0.5, z)
})
// utility poles with crossarms, wires sagging between them and across the street
const poleTops = []
for (const [x, z] of [[-6.05, -4.5], [6.05, -0.5], [-6.05, 8.6], [6.05, 12.4], [-6.05, 19.8]]) {
  cyl(0.11, 0.14, 6.4, 0x8a8478, x, 3.2, z, scene, 7)
  box(1.3, 0.1, 0.1, 0x6a645a, x, 5.9, z); box(1.0, 0.1, 0.1, 0x6a645a, x, 5.4, z)
  cyl(0.18, 0.18, 0.5, 0x5a5f6a, x - Math.sign(x) * 0.25, 4.9, z, scene, 8)
  poleTops.push({ x, z })
}
const wireMat = new THREE.LineBasicMaterial({ color: 0x0c0c12 })
function wire(a, b, sag, dy = 0) {
  const pts = []
  for (let i = 0; i <= 16; i++) { const u = i / 16; pts.push(new THREE.Vector3(a.x + (b.x - a.x) * u, 5.85 + dy - Math.sin(Math.PI * u) * sag, a.z + (b.z - a.z) * u)) }
  scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), wireMat))
}
for (let i = 0; i < poleTops.length - 1; i++) for (const [s, dy] of [[0.5, 0], [0.8, -0.45], [0.35, 0.05]]) wire(poleTops[i], poleTops[i + 1], s, dy)
for (const p of poleTops) wire(p, { x: -p.x * 1.4, z: p.z + 1.5 }, 0.9, -0.2)
// flyers on the walls next to the street
const flyerTex = [['#ffffff', '#d8261e'], ['#ffe14a', '#1d3f8a'], ['#7fe3ff', '#1b1530'], ['#ffb0c8', '#6a2fb8']].map(([bg, fg]) => canvasTex(64, 90, (g) => { g.fillStyle = bg; g.fillRect(0, 0, 64, 90); g.fillStyle = fg; g.fillRect(6, 8, 52, 18); for (let k = 0; k < 5; k++) g.fillRect(8, 34 + k * 10, 30 + ((k * 13) % 18), 4) }).tex)
for (let k = 0; k < 18; k++) {
  const side = k % 2 ? 1 : -1, z = -11 + k * 1.9 + rnd(-0.3, 0.3)
  const f = mesh(geo('flyer', () => new THREE.PlaneGeometry(0.42, 0.6)), new THREE.MeshBasicMaterial({ map: flyerTex[k % 4] }), side * 6.58, rnd(1.0, 1.9), z)
  f.rotation.y = -side * Math.PI / 2; f.rotation.z = rnd(-0.12, 0.12)
}
// a delivery scooter parked at the side, box on the back
{
  const g = new THREE.Group(); g.position.set(-5.3, 0, 7.4); g.rotation.y = 0.15; scene.add(g)
  for (const z of [-0.55, 0.55]) { const w = cyl(0.26, 0.26, 0.12, 0x15151c, 0, 0.26, z, g, 12); w.rotation.z = Math.PI / 2 }
  box(0.36, 0.3, 1.0, 0xd8261e, 0, 0.5, 0, g); box(0.3, 0.12, 0.5, 0x1d1b26, 0, 0.72, 0.15, g)
  const col = box(0.08, 0.7, 0.08, 0x9a9aa8, 0, 0.85, -0.5, g); col.rotation.x = -0.3
  box(0.7, 0.05, 0.05, 0x1d1b26, 0, 1.18, -0.6, g); box(0.56, 0.48, 0.5, 0xfff2d0, 0, 1.03, 0.45, g); box(0.5, 0.1, 0.02, 0xd8261e, 0, 1.1, 0.71, g)
  sideBlocks.push([-5.3, 7.4, 0.6, 1.4])
}

// string lights across the street
const bulbGeo = new THREE.SphereGeometry(0.11, 8, 6), bulbCols = [0xffd36b, 0xff7aa8, 0x7fe3ff, 0xffb35c], bulbs = []
for (const z of [-9, -3, 3, 9, 15]) {
  const pts = []
  for (let i = 0; i <= 24; i++) { const u = i / 24; pts.push(new THREE.Vector3(-6.3 + 12.6 * u, 4.6 - Math.sin(Math.PI * u) * 1.1, z + Math.sin(u * 6) * 0.15)) }
  scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: 0x111111 })))
  for (let i = 1; i < 24; i++) { const b = mesh(bulbGeo, basic(bulbCols[i % 4]), pts[i].x, pts[i].y - 0.14, pts[i].z); b.userData.base = bulbCols[i % 4]; bulbs.push(b) }
}

// ---------------------------------------------------------------- obstacles + grid pathfinding (helpers and customers)
const boxes = []
const block = (x, z, w, d) => { const b = { x0: x - w / 2, z0: z - d / 2, x1: x + w / 2, z1: z + d / 2 }; boxes.push(b); return b }
for (const b of sideBlocks) block(...b)
const GX0 = -6, GZ0 = -14, CS = 0.5, GW = 24, GH = 76
let grid = new Uint8Array(GW * GH)
function buildGrid() {
  grid = new Uint8Array(GW * GH)
  for (let j = 0; j < GH; j++) for (let i = 0; i < GW; i++) {
    const x = GX0 + (i + 0.5) * CS, z = GZ0 + (j + 0.5) * CS
    if (x < -XW || x > XW || z < Z0) { grid[j * GW + i] = 1; continue }
    for (const b of boxes) if (!b.off && x > b.x0 - 0.35 && x < b.x1 + 0.35 && z > b.z0 - 0.35 && z < b.z1 + 0.35) { grid[j * GW + i] = 1; break }
  }
}
const cellOf = (x, z) => [clamp(Math.floor((x - GX0) / CS), 0, GW - 1), clamp(Math.floor((z - GZ0) / CS), 0, GH - 1)]
const free = (i, j) => i >= 0 && j >= 0 && i < GW && j < GH && !grid[j * GW + i]
function nearestFree(i, j) {
  if (free(i, j)) return [i, j]
  for (let r = 1; r < 8; r++) for (let dj = -r; dj <= r; dj++) for (let di = -r; di <= r; di++) if (free(i + di, j + dj)) return [i + di, j + dj]
  return [i, j]
}
function lineFree(ax, az, bx, bz) {
  const n = Math.ceil(Math.hypot(bx - ax, bz - az) / 0.2)
  for (let k = 1; k < n; k++) { const [i, j] = cellOf(ax + (bx - ax) * k / n, az + (bz - az) * k / n); if (!free(i, j)) return false }
  return true
}
function findPath(sx, sz, tx, tz) {
  if (lineFree(sx, sz, tx, tz)) return [{ x: tx, z: tz }]
  const [si, sj] = nearestFree(...cellOf(sx, sz)), [ti, tj] = nearestFree(...cellOf(tx, tz))
  const N = GW * GH, g = new Float32Array(N).fill(1e9), from = new Int32Array(N).fill(-1), done = new Uint8Array(N)
  const open = [[0, sj * GW + si]]; g[sj * GW + si] = 0
  const goal = tj * GW + ti
  while (open.length) {
    let bi = 0; for (let k = 1; k < open.length; k++) if (open[k][0] < open[bi][0]) bi = k
    const [, cur] = open[bi]; open[bi] = open[open.length - 1]; open.pop()
    if (done[cur]) continue; done[cur] = 1
    if (cur === goal) break
    const ci = cur % GW, cj = (cur - ci) / GW
    for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
      if (!di && !dj) continue
      const ni = ci + di, nj = cj + dj
      if (!free(ni, nj) || (di && dj && (!free(ci + di, cj) || !free(ci, cj + dj)))) continue
      const nk = nj * GW + ni, ng = g[cur] + (di && dj ? 1.414 : 1)
      if (ng < g[nk]) { g[nk] = ng; from[nk] = cur; open.push([ng + Math.hypot(ti - ni, tj - nj), nk]) }
    }
  }
  if (from[goal] < 0 && goal !== sj * GW + si) return [{ x: tx, z: tz }]
  const cells = []; for (let k = goal; k >= 0; k = from[k]) cells.unshift(k)
  const pts = cells.map((k) => ({ x: GX0 + ((k % GW) + 0.5) * CS, z: GZ0 + (Math.floor(k / GW) + 0.5) * CS }))
  pts.push({ x: tx, z: tz })
  const out = []; let ax = sx, az = sz, k = 0
  while (k < pts.length) {
    let far = k
    for (let m = pts.length - 1; m > k; m--) if (lineFree(ax, az, pts[m].x, pts[m].z)) { far = m; break }
    out.push(pts[far]); ax = pts[far].x; az = pts[far].z; k = far + 1
  }
  return out
}

// ---------------------------------------------------------------- characters
const legGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.62, 6); legGeo.translate(0, -0.31, 0)
const armGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.5, 6); armGeo.translate(0, -0.25, 0)
function limbs(g, c, hip, shoulder, w) {
  const m = M(c)
  const legs = [-1, 1].map((s) => { const p = new THREE.Group(); p.position.set(s * 0.11, hip, 0); g.add(p); mesh(legGeo, m, 0, 0, 0, p); return p })
  const arms = [-1, 1].map((s) => { const p = new THREE.Group(); p.position.set(s * w, shoulder, 0); g.add(p); mesh(armGeo, m, 0, 0, 0, p); return p })
  return { legs, arms }
}
const shadowMat = new THREE.MeshBasicMaterial({ color: 0, transparent: true, opacity: 0.35, depthWrite: false })
function shadow(g, r = 0.42) { const s = mesh(geo('o' + r, () => new THREE.CircleGeometry(r, 16)), shadowMat, 0, 0.02, 0, g); s.rotation.x = -Math.PI / 2 }
// Baekho: white round head, two ears, three forehead stripes, stick body. Helpers: orange cubs with role aprons and hats.
const APRON = { cash: 0xffd23f, carry: 0x3a7bd5, cook: 0xe0402e }
function makeTiger(role = null) {
  const baby = !!role, g = new THREE.Group(), s = baby ? 0.78 : 1, ink = 0x1d1b26
  const fur = mat(baby ? 0xffa23a : 0xffffff, baby ? 0x5a2a00 : 0xa8a4b4)
  const inner = new THREE.Group(); inner.scale.setScalar(s); g.add(inner)
  cyl(0.075, 0.075, 0.6, fur, 0, 0.98, 0, inner)
  if (baby) box(0.34, 0.38, 0.06, APRON[role], 0, 0.92, 0.09, inner)
  if (role === 'cook') cyl(0.2, 0.24, 0.3, 0xffffff, 0, 1.92, 0, inner, 10)
  if (role === 'cash') { const v = box(0.42, 0.04, 0.24, 0xffd23f, 0, 1.78, 0.18, inner); v.rotation.x = 0.3 }
  if (role === 'carry') { const v = box(0.08, 0.3, 0.08, 0x3a7bd5, 0, 1.92, 0, inner) ; v.rotation.z = 0.4 }
  const head = sph(0.34, fur, 0, 1.52, 0, inner, 14, 10); head.scale.set(1, 0.9, 0.95)
  for (const x of [-0.22, 0.22]) { sph(0.11, fur, x, 1.8, -0.02, inner, 8, 6); sph(0.06, 0xffa0b4, x, 1.8, 0.04, inner, 6, 5) }
  for (const x of [-0.1, 0, 0.1]) { const st = box(0.04, 0.13, 0.03, ink, x, 1.73, 0.25, inner); st.rotation.x = -0.75 }
  for (const x of [-0.12, 0.12]) sph(0.045, ink, x, 1.52, 0.3, inner, 6, 5)
  sph(0.04, 0xff8fa8, 0, 1.44, 0.32, inner, 6, 5)
  if (baby) for (const x of [-0.26, 0.26]) { const st = box(0.03, 0.12, 0.08, ink, x, 1.55, 0.05, inner); st.rotation.z = x > 0 ? -0.4 : 0.4 }
  if (!baby) {
    // Baekho: black cheek stripes, a stripy body (a wider white body so the stripes read), a pink scarf
    for (const sx of [-1, 1]) for (const dy of [0.04, -0.06]) { const st = box(0.16, 0.035, 0.05, ink, sx * 0.3, 1.5 + dy, 0.12, inner); st.rotation.z = sx * 0.25; st.rotation.y = sx * -0.5 }
    cyl(0.17, 0.2, 0.56, fur, 0, 0.98, 0, inner, 10)
    for (const y of [0.82, 0.98, 1.14]) { const st = box(0.36, 0.045, 0.06, ink, 0, y, 0.17, inner); st.rotation.z = 0.15 }
    cyl(0.2, 0.2, 0.09, 0xff4d7a, 0, 1.24, 0, inner, 12)
  }
  const l = limbs(inner, fur, 0.68, 1.2, 0.13)
  shadow(g, 0.4 * s)
  const stack = new THREE.Group(); stack.position.set(0, 0.95 * s, 0.42 * s); g.add(stack)
  scene.add(g)
  return { g, ...l, stack, phase: 0, s }
}
const SKIN = [0xf2c9a0, 0xd9a47a, 0xa8714f, 0xffdcc0], CLOTH = [0x4fc3f7, 0xff8a65, 0x9ccc65, 0xba68c8, 0xffd54f, 0x4db6ac, 0xf06292, 0x7986cb, 0xeeeeee, 0x2f3a5a], HAIR = [0x2b1d16, 0x5a3825, 0x111111, 0xc9a26b, 0x8e3b2f]
function makePerson() {
  const g = new THREE.Group()
  cyl(0.2, 0.26, 0.62, pick(CLOTH), 0, 0.95, 0, g)
  sph(0.22, pick(SKIN), 0, 1.47, 0, g, 12, 8)
  const hair = sph(0.235, pick(HAIR), 0, 1.53, -0.03, g, 12, 6); hair.scale.set(1, 0.7, 1)
  for (const x of [-0.08, 0.08]) sph(0.03, 0x1d1b26, x, 1.48, 0.2, g, 5, 4)
  const l = limbs(g, 0x2e2a40, 0.66, 1.2, 0.25)
  shadow(g, 0.36)
  scene.add(g)
  return { g, ...l, phase: 0 }
}
function animate(rig, moving, dt, carrying) {
  rig.phase += moving ? dt * 11 : 0
  const a = moving ? Math.sin(rig.phase) * 0.7 : rig.legs[0].rotation.x * 0.8
  rig.legs[0].rotation.x = a; rig.legs[1].rotation.x = -a
  if (carrying) { rig.arms[0].rotation.x = rig.arms[1].rotation.x = -1.25 } else { rig.arms[0].rotation.x = -a * 0.8; rig.arms[1].rotation.x = a * 0.8 }
  rig.g.position.y = moving ? Math.abs(Math.sin(rig.phase)) * 0.06 : 0
}

// ---------------------------------------------------------------- food: raw goods and cooked food for the four stalls
const ITEM = {
  raw0: () => { const g = new THREE.Group(); cyl(0.17, 0.12, 0.12, 0xb9bec8, 0, 0.06, 0, g, 10); cyl(0.15, 0.15, 0.02, 0xf6ecd0, 0, 0.12, 0, g, 10); const w = cyl(0.012, 0.012, 0.26, 0x8a8f99, 0.05, 0.2, 0, g, 4); w.rotation.z = -0.5; return g }, // batter bowl
  food0: () => { const g = new THREE.Group(); const b = sph(0.2, 0xb8701f, 0, 0.07, 0, g, 10, 6); b.scale.set(1, 0.42, 0.62); const tl = mesh(geo('cone', () => new THREE.ConeGeometry(0.1, 0.15, 3)), mat(0xa35f17), 0.24, 0.07, 0, g); tl.rotation.z = Math.PI / 2; for (const x of [-0.06, 0.05]) box(0.025, 0.03, 0.18, 0x8a4b10, x, 0.13, 0, g); sph(0.05, 0x6b2a2a, -0.13, 0.12, 0, g, 6, 4); return g }, // bungeoppang
  raw1: () => { const g = new THREE.Group(); box(0.32, 0.07, 0.22, 0xf0d39a, 0, 0.04, 0, g); box(0.32, 0.05, 0.22, 0xe6c07e, 0, 0.1, 0, g); return g }, // fish-cake sheets
  food1: () => { const g = new THREE.Group(); const st = cyl(0.015, 0.015, 0.5, 0xc8a26b, 0, 0.06, 0, g, 5); st.rotation.z = Math.PI / 2; for (const x of [-0.1, 0.06]) { const p = box(0.13, 0.05, 0.16, 0xe8b96a, x, 0.07, 0, g); p.rotation.x = 0.25 } return g }, // eomuk skewer
  raw2: () => { const g = new THREE.Group(); for (const [x, z] of [[-0.08, -0.05], [0.05, 0], [-0.02, 0.07]]) { const r = cyl(0.04, 0.04, 0.3, 0xf6f1e4, x, 0.05, z, g, 6); r.rotation.z = Math.PI / 2 } return g }, // rice cakes
  food2: () => { const g = new THREE.Group(); cyl(0.17, 0.13, 0.08, 0xffffff, 0, 0.04, 0, g, 10); cyl(0.15, 0.15, 0.04, 0xd8341e, 0, 0.09, 0, g, 10); for (const [x, z] of [[-0.06, 0], [0.05, 0.04], [0.03, -0.06]]) { const r = cyl(0.03, 0.03, 0.14, 0xff6a3d, x, 0.12, z, g, 5); r.rotation.z = Math.PI / 2 } return g }, // tteokbokki cup
  raw3: () => { const g = new THREE.Group(); const b = sph(0.14, 0xf3ead8, 0, 0.08, 0, g, 8, 6); b.scale.y = 0.7; return g }, // dough ball
  food3: () => { const g = new THREE.Group(); cyl(0.19, 0.19, 0.06, 0xc9862e, 0, 0.04, 0, g, 12); cyl(0.12, 0.12, 0.02, 0x7a3d12, 0, 0.08, 0, g, 10); return g }, // hotteok
}
const ITEM_H = { raw0: 0.13, food0: 0.12, raw1: 0.14, food1: 0.1, raw2: 0.11, food2: 0.14, raw3: 0.12, food3: 0.08 }
function setStack(group, items, max = 20) {
  const key = items.slice(0, max).join(',')
  if (group.userData.key === key) return
  group.userData.key = key
  while (group.children.length) group.remove(group.children[0])
  let y = 0
  items.slice(0, max).forEach((k, i) => { const m = ITEM[k](); m.position.y = y; m.rotation.y = (i % 2) * 0.3; group.add(m); y += ITEM_H[k] })
}
const flyers = []
const coinGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.04, 12); coinGeo.rotateX(Math.PI / 2)
const coinMat = new THREE.MeshLambertMaterial({ color: 0xffd23f, emissive: 0x6a4a00 })
function fly(kind, from, to, onLand) {
  const m = kind === 'coin' ? mesh(coinGeo, coinMat) : ITEM[kind](); if (kind !== 'coin') scene.add(m)
  m.position.copy(from); flyers.push({ m, from: from.clone(), to, t: 0, onLand })
}
function updateFlyers(dt) {
  for (let i = flyers.length - 1; i >= 0; i--) {
    const f = flyers[i]; f.t += dt / 0.28
    const to = typeof f.to === 'function' ? f.to() : f.to, u = Math.min(1, f.t)
    f.m.position.lerpVectors(f.from, to, u); f.m.position.y += Math.sin(u * Math.PI) * 0.9; f.m.rotation.y += dt * 10
    if (u >= 1) { scene.remove(f.m); flyers.splice(i, 1); f.onLand?.() }
  }
}

// ---------------------------------------------------------------- floor spots
const padGeo = new THREE.RingGeometry(0.6, 0.78, 32), padFill = new THREE.CircleGeometry(0.6, 32)
function padMesh(color) {
  const g = new THREE.Group()
  const r = mesh(padGeo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.95 }), 0, 0.02, 0, g); r.rotation.x = -Math.PI / 2
  const f = mesh(padFill, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.18, depthWrite: false }), 0, 0.015, 0, g); f.rotation.x = -Math.PI / 2
  scene.add(g); return g
}
const pads = []
const PAD_ICON = {}
const padIcon = (key, draw) => (PAD_ICON[key] ||= canvasTex(128, 128, (g) => { g.translate(64, 64); draw(g) }).tex)
const ICONS = {
  crate: (g) => { g.fillStyle = '#c98f4f'; g.fillRect(-34, -18, 68, 44); g.fillStyle = '#8a5a2b'; g.fillRect(-34, -18, 68, 8); g.fillStyle = '#fff'; g.beginPath(); g.moveTo(0, -48); g.lineTo(-16, -26); g.lineTo(16, -26); g.fill() },
  grill: (g) => { g.fillStyle = '#ff7a1a'; g.beginPath(); g.moveTo(0, -42); g.bezierCurveTo(30, -10, 30, 30, 0, 34); g.bezierCurveTo(-30, 30, -30, -10, 0, -42); g.fill(); g.fillStyle = '#ffd23f'; g.beginPath(); g.moveTo(0, -8); g.bezierCurveTo(14, 8, 14, 28, 0, 30); g.bezierCurveTo(-14, 28, -14, 8, 0, -8); g.fill() },
  disp: (g) => { g.fillStyle = '#fff'; g.beginPath(); g.ellipse(0, 10, 40, 16, 0, 0, Math.PI * 2); g.fill(); g.fillStyle = '#6cff8a'; g.beginPath(); g.moveTo(0, -46); g.lineTo(-18, -20); g.lineTo(18, -20); g.fill(); g.fillRect(-6, -22, 12, 22) },
  cash: (g) => { g.fillStyle = '#ffd23f'; g.beginPath(); g.arc(0, 0, 34, 0, Math.PI * 2); g.fill(); g.fillStyle = '#8a5a00'; g.font = '900 44px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('₩', 0, 3) },
}
const addPad = (kind, stall, x, z, color) => {
  const p = { kind, stall, x, z, g: padMesh(color) }; p.g.position.set(x, 0, z); pads.push(p)
  if (ICONS[kind]) { const m = mesh(geo('icon', () => new THREE.PlaneGeometry(0.95, 0.95)), new THREE.MeshBasicMaterial({ map: padIcon(kind, ICONS[kind]), transparent: true, depthWrite: false }), 0, 0.03, 0, p.g); m.rotation.x = -Math.PI / 2 }
  return p
}

// ---------------------------------------------------------------- stalls: orange tent pojangmacha, two rows
function neon(text, color, w = 3.2) {
  const { tex } = canvasTex(512, 128, (g, W, H) => {
    g.font = `900 72px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'
    g.shadowColor = color; g.shadowBlur = 24; g.fillStyle = color; g.fillText(text, W / 2, H / 2, W - 20)
    g.shadowBlur = 6; g.fillStyle = '#fff'; g.fillText(text, W / 2, H / 2, W - 20)
  })
  return mesh(new THREE.PlaneGeometry(w, w / 4), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }))
}
// an old-style shop board: cream panel, thick red letters, dark frame with rivets; the translation hangs below
function signTex(native, local, accent) {
  const showLocal = lang !== city.lang
  const { tex } = canvasTex(512, 256, (g, W) => {
    g.fillStyle = '#3a2a1e'; g.beginPath(); g.roundRect(6, 6, W - 12, 150, 10); g.fill()
    g.fillStyle = '#f4ead2'; g.fillRect(20, 20, W - 40, 122)
    g.fillStyle = accent; g.fillRect(20, 20, W - 40, 10); g.fillRect(20, 132, W - 40, 10)
    g.fillStyle = '#6a5a4a'; for (const x of [32, W - 32]) for (const y of [36, 126]) { g.beginPath(); g.arc(x, y, 5, 0, Math.PI * 2); g.fill() }
    g.font = `900 92px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'
    g.lineWidth = 8; g.strokeStyle = '#1d3f8a'; g.strokeText(native, W / 2, 84, W - 90)
    g.fillStyle = '#d8261e'; g.fillText(native, W / 2, 84, W - 90)
    if (showLocal) {
      g.font = `800 40px ${FONT}`; const tw = Math.min(W - 40, g.measureText(local).width + 36)
      g.fillStyle = 'rgba(20,14,40,.85)'; g.beginPath(); g.roundRect(W / 2 - tw / 2, 176, tw, 60, 14); g.fill()
      g.fillStyle = '#fff'; g.fillText(local, W / 2, 207, W - 60)
    }
  })
  return tex
}
const shopSign = (native, local, accent, w) => mesh(new THREE.PlaneGeometry(w, w / 2), new THREE.MeshBasicMaterial({ map: signTex(native, local, accent), transparent: true, depthWrite: false }))
// language changed in settings: new plates under the signs, new talk lines, new money-spot label
function relabel() {
  for (const st of stalls) { const m = st.sign.material; m.map.dispose(); m.map = signTex(city[st.name], t(st.name), st.neon); m.needsUpdate = true }
  for (const tex of talkTex.values()) tex.dispose()
  talkTex.clear(); drawBuy(); hudStreet(); applyText()
}
const steamTex = canvasTex(64, 64, (g) => { const r = g.createRadialGradient(32, 32, 0, 32, 32, 32); r.addColorStop(0, 'rgba(255,255,255,.75)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, 64, 64) }).tex
const ROWS = [{ grill: -11.2, disp: -5.2 }, { grill: 1.4, disp: 7.0 }]
const stalls = [
  { id: 0, name: 'fish', x: -2.7, row: 0, price: 5, cook: 0.9, tent: 0xff7a2a, neon: '#ffb35c' },
  { id: 1, name: 'oden', x: 2.7, row: 0, price: 7, cook: 1.0, tent: 0xff5a3a, neon: '#7fe3ff' },
  { id: 2, name: 'tteok', x: -2.7, row: 1, price: 9, cook: 1.3, tent: 0xff8a2a, neon: '#ff5d8f' },
  { id: 3, name: 'hotteok', x: 2.7, row: 1, price: 8, cook: 1.1, tent: 0xff6a2a, neon: '#ffd23f' },
]
for (const s of stalls) {
  const side = s.x < 0 ? -1 : 1, R = ROWS[s.row]
  s.root = new THREE.Group(); scene.add(s.root); s.boxes = []
  s.crate = { x: s.x + side * 2.25, z: R.grill }; s.grill = { x: s.x - side * 0.2, z: R.grill }; s.disp = { x: s.x, z: R.disp }
  // the tent: a translucent orange roof over the grill, poles at the corners
  const tentMat = new THREE.MeshLambertMaterial({ color: s.tent, emissive: 0x5a1800, transparent: true, opacity: 0.62 })
  const roofZ = R.grill - 0.2
  const awn = box(4.6, 0.08, 1.3, tentMat, s.x + side * 1.0, 2.45, roofZ, s.root); awn.rotation.x = 0.2
  for (const dx of [-2.2, 2.2]) cyl(0.05, 0.05, 2.4, 0x8a8f99, s.x + side * 1.0 + dx, 1.2, R.grill - 0.75, s.root, 6)
  s.sign = shopSign(city[s.name], t(s.name), s.neon, 2.6); s.sign.position.set(s.grill.x, 3.35, R.grill - 0.9); s.root.add(s.sign)
  box(1.0, 0.7, 1.0, 0x9a6a3d, s.crate.x, 0.35, s.crate.z, s.root); s.boxes.push(block(s.crate.x, s.crate.z, 1.0, 1.0))
  s.crateStack = new THREE.Group(); s.crateStack.position.set(s.crate.x, 0.72, s.crate.z); s.root.add(s.crateStack); setStack(s.crateStack, Array(4).fill(`raw${s.id}`))
  box(2.0, 0.85, 1.2, 0x5c5f73, s.grill.x, 0.43, s.grill.z, s.root); s.boxes.push(block(s.grill.x, s.grill.z, 2.0, 1.2))
  if (s.id === 1) { cyl(0.72, 0.68, 0.4, 0x8b8f9c, s.grill.x, 1.05, s.grill.z, s.root, 14); cyl(0.66, 0.66, 0.02, 0xc98f3c, s.grill.x, 1.24, s.grill.z, s.root, 14) }
  else if (s.id === 2) { cyl(0.8, 0.8, 0.12, 0x2a2a30, s.grill.x, 0.92, s.grill.z, s.root, 14); cyl(0.74, 0.74, 0.02, 0xd8341e, s.grill.x, 0.99, s.grill.z, s.root, 14) }
  else box(1.8, 0.08, 1.0, 0x1a1a1f, s.grill.x, 0.9, s.grill.z, s.root)
  s.grillShow = new THREE.Group(); s.grillShow.position.set(s.grill.x, s.id === 1 ? 1.25 : 0.96, s.grill.z); s.root.add(s.grillShow)
  glow(s.x, R.grill + 1.6, 3.4); glow(s.x, R.disp + 1.2, 2.6)
  s.light = new THREE.PointLight(0xffb35c, 30, 11, 1.4); s.light.position.set(s.x + side * 1.0, 2.2, R.grill + 1); s.root.add(s.light)
  box(2.0, 0.8, 0.9, 0x8a5a33, s.disp.x, 0.4, s.disp.z, s.root); box(2.1, 0.06, 1.0, 0xf5e6c8, s.disp.x, 0.83, s.disp.z, s.root); s.boxes.push(block(s.disp.x, s.disp.z, 2.0, 0.9))
  s.dispShow = new THREE.Group(); s.dispShow.position.set(s.disp.x, 0.86, s.disp.z); s.root.add(s.dispShow)
  s.pads = {
    crate: addPad('crate', s.id, s.crate.x, s.crate.z + 1.35, 0xffffff),
    grill: addPad('grill', s.id, s.grill.x, s.grill.z + 1.4, 0xffa23a),
    disp: addPad('disp', s.id, s.disp.x - side * 1.8, s.disp.z, 0x6cff8a),
  }
  s.steam = []
  for (let i = 0; i < 8; i++) { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: steamTex, transparent: true, depthWrite: false, opacity: 0 })); sp.position.set(s.grill.x, 1, s.grill.z); sp.userData.t = i / 8; s.root.add(sp); s.steam.push(sp) }
}
// the till near the entrance; customers pay in a line below it
const CASH = { x: 0, z: 13.5 }
box(2.0, 0.95, 0.9, 0xb0413e, CASH.x, 0.48, CASH.z); box(2.1, 0.06, 1.0, 0xf5e6c8, CASH.x, 0.98, CASH.z); block(CASH.x, CASH.z, 2.0, 0.9)
box(0.5, 0.35, 0.4, 0x2e2a40, CASH.x + 0.6, 1.18, CASH.z); box(0.4, 0.05, 0.3, 0x7fe3ff, CASH.x + 0.6, 1.37, CASH.z)
sph(0.3, basic(0xff4d4d), CASH.x - 0.8, 1.9, CASH.z)
cyl(0.03, 0.03, 0.9, 0x6b4a2f, CASH.x - 0.8, 1.3, CASH.z, scene, 4)
const cashLight = new THREE.PointLight(0xff7a7a, 12, 8, 1.6); cashLight.position.set(CASH.x - 0.8, 2.2, CASH.z + 0.4); scene.add(cashLight)
const cashPad = addPad('cash', -1, CASH.x, CASH.z - 1.45, 0xffd23f)
// the market gate: the last lamp, a neon arch over the street
const arch = new THREE.Group(); arch.visible = false; scene.add(arch)
for (const x of [-5.6, 5.6]) cyl(0.18, 0.18, 5.2, 0xc0392b, x, 2.6, -7.6, arch, 8)
box(11.6, 0.9, 0.4, 0x8a1f1f, 0, 5.3, -7.6, arch)
const archSign = neon(city.gate, '#ffd23f', 7); archSign.position.set(0, 5.35, -7.36); arch.add(archSign)

// money spots: one at a time, in STEPS order
const buyC = canvasTex(256, 256, () => {})
const buyMesh = mesh(new THREE.PlaneGeometry(1.7, 1.7), new THREE.MeshBasicMaterial({ map: buyC.tex, transparent: true, depthWrite: false }), 0, 0.03, 0); buyMesh.rotation.x = -Math.PI / 2
const buy = { kind: 'buy', g: buyMesh, x: 0, z: 0, step: null, left: 0 }
pads.push(buy)
const roleKey = { cash: 'cashier', carry: 'carrier', cook: 'cook' }
const stepName = (st) => st.what === 'stall' ? t(stalls[st.id].name) : st.what === 'arch' ? t('arch') : t(roleKey[st.role])
function drawBuy() {
  const g = buyC.g, st = buy.step; g.clearRect(0, 0, 256, 256); if (!st) return
  g.fillStyle = 'rgba(20,14,40,.78)'; g.beginPath(); g.roundRect(8, 8, 240, 240, 34); g.fill()
  const u = 1 - buy.left / st.cost
  g.save(); g.beginPath(); g.roundRect(8, 8, 240, 240, 34); g.clip(); g.fillStyle = 'rgba(255,210,63,.55)'; g.fillRect(8, 248 - 240 * u, 240, 240 * u); g.restore()
  g.lineWidth = 10; g.strokeStyle = '#ffd23f'; g.setLineDash([26, 14]); g.beginPath(); g.roundRect(8, 8, 240, 240, 34); g.stroke(); g.setLineDash([])
  g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle'
  g.font = `800 34px ${FONT}`; g.fillText(stepName(st), 128, 80, 220)
  g.font = `900 62px ${FONT}`; g.fillStyle = '#ffd23f'; g.fillText('₩' + buy.left, 128, 168, 224)
  buyC.tex.needsUpdate = true
}
function setStep(i) {
  game.step = i; const st = STEPS[i]; buy.step = st || null
  buy.g.visible = !!st
  if (st) { buy.x = st.x; buy.z = st.z; buy.left = st.cost; buy.g.position.set(st.x, 0.03, st.z) }
  drawBuy(); hudStreet()
}

// ---------------------------------------------------------------- game state
const game = { phase: 'title', time: 0, money: 0, earned: 0, served: 0, lost: 0, rush: false, spawnT: 1.5, rushShown: false, step: 0, lit: 1, clearT: 0, unlocks: [] }
const player = { x: 0, z: -1.5, face: Math.PI, items: [], cap: 6, speed: 5.4, rig: makeTiger(), xferT: 0, auto: Q.has('auto') }
player.rig.g.scale.setScalar(1.25)
// a warm light that walks with Baekho, so the boss is always the brightest thing on screen
const bossLight = new THREE.PointLight(0xffe2b0, 14, 6, 1.2); bossLight.position.set(0, 3, 1); player.rig.g.add(bossLight)
const helpers = [], customers = [], queues = [[], [], [], []], cashQ = []
const EXIT = { x: 1.5, z: Z1 + 1 }, ENTER = [{ x: -4.4, z: Z1 + 1 }, { x: 4.4, z: Z1 + 1 }]
const qSlot = (s, i) => ({ x: stalls[s].x, z: stalls[s].disp.z + 1.25 + i * 0.85 })
const cSlot = (i) => ({ x: CASH.x, z: CASH.z + 1.2 + i * 0.85 })
const openCount = () => stalls.filter((s) => s.open).length

function setOpenLook(s) {
  s.root.visible = s.open
  for (const k in s.pads) s.pads[k].g.visible = s.open
  for (const b of s.boxes) b.off = !s.open // a closed lot blocks nothing
}
function resetStalls() { for (const s of stalls) { s.open = s.id === 0; s.raw = 0; s.food = 0; s.cookT = 0; s.shown = 0; setOpenLook(s) } buildGrid() }

// ---------------------------------------------------------------- walkers
function walkTo(w, x, z, direct = false) { w.path = direct ? [{ x, z }] : findPath(w.x, w.z, x, z); w.tx = x; w.tz = z }
function stepWalker(w, dt) {
  let moving = false
  if (w.path?.length) {
    const p = w.path[0], dx = p.x - w.x, dz = p.z - w.z, d = Math.hypot(dx, dz), step = w.speed * dt
    if (d <= step) { w.x = p.x; w.z = p.z; w.path.shift() } else { w.x += dx / d * step; w.z += dz / d * step }
    if (d > 0.02) { const want = Math.atan2(dx, dz); w.face += Math.atan2(Math.sin(want - w.face), Math.cos(want - w.face)) * Math.min(1, dt * 12) }
    moving = true
  }
  w.rig.g.position.x = w.x; w.rig.g.position.z = w.z; w.rig.g.rotation.y = w.face
  animate(w.rig, moving, dt, w.items?.length > 0)
  return !w.path?.length
}
// icon bubbles (what they want) and talk bubbles (short lines from the strings table)
function breadIcon(g) {
  g.save(); g.translate(60, 60)
  g.fillStyle = '#a35f17'; g.beginPath(); g.moveTo(26, 0); g.lineTo(46, -16); g.lineTo(44, 16); g.closePath(); g.fill()
  g.fillStyle = '#c47a22'; g.beginPath(); g.ellipse(-4, 0, 34, 22, 0, 0, Math.PI * 2); g.fill()
  g.strokeStyle = '#7a3e0c'; g.lineWidth = 3; for (const x of [-14, -2, 10]) { g.beginPath(); g.arc(x, 0, 12, -1, 1); g.stroke() }
  g.fillStyle = '#5a1f1f'; g.beginPath(); g.arc(-24, -6, 4, 0, Math.PI * 2); g.fill()
  g.restore()
}
function tteokIcon(g) { g.save(); g.translate(64, 62); g.fillStyle = '#eee'; g.beginPath(); g.ellipse(0, 6, 36, 26, 0, 0, Math.PI * 2); g.fill(); g.fillStyle = '#d8341e'; g.beginPath(); g.ellipse(0, 0, 30, 16, 0, 0, Math.PI * 2); g.fill(); g.fillStyle = '#ff8a5d'; for (const [x, y, r] of [[-12, -2, 0.3], [6, 3, -0.4], [12, -6, 0.2]]) { g.save(); g.translate(x, y); g.rotate(r); g.fillRect(-12, -4, 24, 8); g.restore() } g.restore() }
function hotteokIcon(g) { g.save(); g.translate(64, 62); g.fillStyle = '#b8762a'; g.beginPath(); g.arc(0, 0, 32, 0, Math.PI * 2); g.fill(); g.fillStyle = '#e3a548'; g.beginPath(); g.arc(-6, -6, 18, 0, Math.PI * 2); g.fill(); g.fillStyle = '#6a2f0c'; g.beginPath(); g.arc(8, 8, 7, 0, Math.PI * 2); g.fill(); g.restore() }
function bubbleTex(icon) {
  return canvasTex(128, 128, (g) => {
    g.fillStyle = '#fff'; g.beginPath(); g.arc(64, 58, 50, 0, Math.PI * 2); g.fill(); g.beginPath(); g.moveTo(52, 100); g.lineTo(64, 124); g.lineTo(76, 100); g.fill()
    if (typeof icon === 'function') { g.save(); g.translate(0, -4); icon(g); g.restore() } else { g.font = '58px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(icon, 64, 62) }
  }).tex
}
const BUB = { want0: bubbleTex(breadIcon), want1: bubbleTex('🍢'), want2: bubbleTex(tteokIcon), want3: bubbleTex(hotteokIcon), angry: bubbleTex('💢'), happy: bubbleTex('❤️'), pay: bubbleTex('💰'), sleep: bubbleTex('💤') }
function setBubble(w, key) {
  if (!w.bubble) { w.bubble = new THREE.Sprite(new THREE.SpriteMaterial({ map: BUB[key || 'happy'], depthTest: false })); w.bubble.scale.set(0.75, 0.75, 1); w.bubble.renderOrder = 5; scene.add(w.bubble) }
  w.bubble.visible = !!key; if (key) w.bubble.material.map = BUB[key]
}
const talkTex = new Map()
function talk(w, kind) {
  const line = pick(talkLines(kind))
  if (!talkTex.has(line)) {
    talkTex.set(line, canvasTex(320, 96, (g) => {
      g.font = `800 34px ${FONT}`; const tw = Math.min(310, g.measureText(line).width + 34)
      g.fillStyle = 'rgba(255,255,255,.96)'; g.beginPath(); g.roundRect(160 - tw / 2, 6, tw, 64, 22); g.fill()
      g.beginPath(); g.moveTo(150, 68); g.lineTo(160, 90); g.lineTo(170, 68); g.fill()
      g.fillStyle = '#231a3a'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(line, 160, 39, 286)
    }).tex)
  }
  if (!w.talk) { w.talk = new THREE.Sprite(new THREE.SpriteMaterial({ depthTest: false })); w.talk.scale.set(2.2, 0.66, 1); w.talk.renderOrder = 6; scene.add(w.talk) }
  w.talk.material.map = talkTex.get(line); w.talk.material.needsUpdate = true; w.talk.visible = true; w.talkT = 2.2
}
function updateTalk(w, dt, y) { if (!w.talk) return; w.talkT -= dt; w.talk.visible = w.talkT > 0; w.talk.position.set(w.x, y, w.z) }
let talkClock = 0 // at most one new line every ~2.5 s, so each stays readable
const mayTalk = () => { if (talkClock > 0) return false; talkClock = rnd(2.2, 3.4); return true }

const ringGeo = new THREE.RingGeometry(0.42, 0.5, 24)
function removeWalker(w) { scene.remove(w.rig.g); for (const k of ['ring', 'bubble', 'talk']) if (w[k]) { scene.remove(w[k]); w[k].material.dispose() } }

function spawnCustomer() {
  const open = stalls.filter((s) => s.open && queues[s.id].length < MAX_LINE)
  if (!open.length) return
  open.sort((a, b) => queues[a.id].length - queues[b.id].length)
  const s = Math.random() < 0.65 ? open[0] : pick(open)
  const side = s.x < 0 ? 0 : 1
  const c = { rig: makePerson(), x: ENTER[side].x + rnd(-0.5, 0.5), z: ENTER[side].z, face: Math.PI, speed: rnd(2.6, 3.2), want: s.id, n: game.rush ? pick([2, 3]) : pick([1, 1, 2]), got: 0, state: 'toQueue', patience: PATIENCE, takeT: 0, payT: 0 }
  c.ring = mesh(ringGeo, new THREE.MeshBasicMaterial({ color: 0x6cff8a, transparent: true, opacity: 0.9 })); c.ring.rotation.x = -Math.PI / 2
  queues[s.id].push(c); customers.push(c)
  const sl = qSlot(s.id, queues[s.id].length - 1); walkTo(c, sl.x, sl.z)
  setBubble(c, 'want' + s.id)
  if (game.rush && mayTalk()) talk(c, 'rush')
}
function reslot(q, slotOf) { q.forEach((c, i) => { const sl = slotOf(i); if (Math.hypot(c.tx - sl.x, c.tz - sl.z) > 0.01) walkTo(c, sl.x, sl.z, c.inLine) }) }
function leave(c, mood) {
  c.state = 'leave'; setBubble(c, mood); c.ring.visible = false; c.leaveT = 0
  if (mayTalk()) talk(c, mood === 'angry' ? 'angry' : 'happy')
  const ex = EXIT.x + rnd(-0.3, 0.3), mid = Math.max(c.z, CASH.z + 1)
  c.path = [...findPath(c.x, c.z, ex, mid), { x: ex, z: EXIT.z }]; c.tx = ex; c.tz = EXIT.z
}
const atPad = (w, p) => Math.hypot(w.x - p.x, w.z - p.z) < (p.kind === 'buy' ? 0.95 : 0.85)
const tillManned = () => atPad(player, cashPad) || helpers.some((h) => h.role === 'cash' && atPad(h, cashPad))
function updateCustomers(dt) {
  for (let i = customers.length - 1; i >= 0; i--) {
    const c = customers[i]
    const arrived = stepWalker(c, dt)
    if (c.bubble) c.bubble.position.set(c.x, 2.25 + Math.sin(game.time * 4 + i) * 0.04, c.z)
    updateTalk(c, dt, 2.95)
    c.ring.position.set(c.x, 0.03, c.z)
    if (c.state === 'toQueue' || c.state === 'queue') {
      const q = queues[c.want], idx = q.indexOf(c)
      if (arrived) { c.state = 'queue'; c.inLine = true }
      c.patience -= dt * (game.rush ? 0.8 : 1)
      if (c.patience < PATIENCE * 0.4 && !c.grumbled && mayTalk()) { c.grumbled = true; talk(c, 'wait') }
      const s = stalls[c.want]
      if (idx === 0 && arrived && s.shown > 0) {
        c.takeT += dt
        if (c.takeT > 0.3) {
          c.takeT = 0; s.shown--; c.got++; c.patience = Math.max(c.patience, 8)
          const from = s.dispShow.children[s.dispShow.children.length - 1]?.getWorldPosition(new THREE.Vector3()) || new THREE.Vector3(s.disp.x, 1, s.disp.z)
          fly(`food${c.want}`, from, new THREE.Vector3(c.x, 1.3, c.z)); sfx('pop')
          if (c.got >= c.n) { q.shift(); reslot(q, (k) => qSlot(c.want, k)); c.state = 'toCash'; c.inLine = false; cashQ.push(c); const sl = cSlot(cashQ.length - 1); walkTo(c, sl.x, sl.z); setBubble(c, 'pay'); c.patience = PATIENCE + 10 }
        }
      }
      if (c.patience <= 0 && c.state !== 'toCash') { q.splice(q.indexOf(c), 1); reslot(q, (k) => qSlot(c.want, k)); game.lost++; leave(c, 'angry'); sfx('angry') }
    } else if (c.state === 'toCash' || c.state === 'cash') {
      const idx = cashQ.indexOf(c)
      if (arrived) { c.state = 'cash'; c.inLine = true }
      c.patience -= dt * 0.7
      if (idx === 0 && arrived && tillManned()) {
        c.payT += dt
        if (c.payT > 0.4) {
          const pay = c.n * stalls[c.want].price
          cashQ.shift(); reslot(cashQ, cSlot)
          for (let k = 0; k < Math.min(pay, 6); k++) setTimeout(() => fly('coin', new THREE.Vector3(c.x, 1.4, c.z), () => new THREE.Vector3(player.x, 1.6, player.z)), k * 50)
          game.money += pay; game.earned += pay; game.served++; sfx('coin'); leave(c, 'happy')
        }
      }
      if (c.patience <= 0) { cashQ.splice(cashQ.indexOf(c), 1); reslot(cashQ, cSlot); game.lost++; leave(c, 'angry'); sfx('angry') }
    } else if (c.state === 'leave') {
      c.leaveT += dt; if (c.leaveT > 1.6 && c.bubble) c.bubble.visible = false
      if (arrived) { removeWalker(c); customers.splice(i, 1); continue }
    }
    if (c.state !== 'leave') {
      const p = clamp(c.patience / PATIENCE, 0, 1)
      c.ring.material.color.setHex(p > 0.5 ? 0x6cff8a : p > 0.25 ? 0xffd23f : 0xff4d4d)
      c.ring.scale.setScalar(0.6 + 0.4 * p)
    }
  }
}

// ---------------------------------------------------------------- working at spots (Baekho and the helpers share the rules)
function work(w, p) {
  const top = w.items[w.items.length - 1]
  if (p.kind === 'crate') {
    if (w.items.length < w.cap && (!top || top === `raw${p.stall}`)) { w.items.push(`raw${p.stall}`); return 'pop' }
  } else if (p.kind === 'grill') {
    const s = stalls[p.stall]
    if (top === `raw${p.stall}` && s.raw + s.food < MAX_GRILL) { w.items.pop(); s.raw++; return 'drop' }
    if (top?.startsWith('raw')) return null
    if ((!top || top === `food${p.stall}`) && s.food > 0 && w.items.length < w.cap) { s.food--; w.items.push(`food${p.stall}`); return 'pop' }
  } else if (p.kind === 'disp') {
    const s = stalls[p.stall]
    if (top === `food${p.stall}` && s.shown < MAX_DISP) { w.items.pop(); s.shown++; return 'drop' }
  }
  return null
}

// helpers: till (stands at the till), runner (grill -> display, any stall), cook (crate -> grill, any stall)
function hire(role, x, z) { helpers.push({ role, rig: makeTiger(role), x, z, face: Math.PI, items: [], cap: role === 'cash' ? 0 : 4, speed: 4.4, path: [], goal: null, workT: 0, idleT: 0, thinkT: 0 }) }
function helperGoal(h) {
  const open = stalls.filter((s) => s.open), top = h.items[h.items.length - 1]
  if (h.role === 'cash') return cashPad
  if (h.role === 'carry') {
    if (top) { const s = stalls[+top.slice(4)]; return s.shown < MAX_DISP ? s.pads.disp : null }
    const s = open.filter((s) => s.food > 0 && s.shown < MAX_DISP - 1).sort((a, b) => (b.food - b.shown) - (a.food - a.shown))[0]
    return s ? s.pads.grill : null
  }
  if (top) return stalls[+top.slice(3)].pads.grill
  const s = open.filter((s) => s.raw + s.food < 6).sort((a, b) => (a.raw + a.food) - (b.raw + b.food))[0]
  return s ? s.pads.crate : null
}
function updateHelpers(dt) {
  for (const h of helpers) {
    const arrived = stepWalker(h, dt)
    setStack(h.rig.stack, h.items)
    h.thinkT -= dt
    if (arrived && h.goal && atPad(h, h.goal)) {
      h.idleT = 0
      if (h.role !== 'cash') {
        h.workT += dt
        if (h.workT > 0.22) {
          h.workT = 0
          // the cook only feeds grills, it never picks cooked food up (that is the runner's job)
          const did = h.role === 'cook' && h.goal.kind === 'grill' && !h.items.length ? null : work(h, h.goal)
          if (did) sfx(did, 0.3)
          const full = h.goal.kind === 'crate' && h.items.length >= h.cap
          if (!did || full) { h.goal = null; h.thinkT = 0 }
        }
      }
    } else if (arrived && h.thinkT <= 0) {
      h.thinkT = 0.35
      const g = helperGoal(h)
      if (g) { h.goal = g; walkTo(h, g.x + rnd(-0.12, 0.12), g.z + rnd(-0.12, 0.12)) } else { h.goal = null; h.idleT += 0.35 }
    }
    if (h.role !== 'cash' && h.idleT > 6) { setBubble(h, 'sleep'); if (!h.saidSleep && mayTalk()) { h.saidSleep = true; talk(h, 'sleep') } } else { setBubble(h, null); h.saidSleep = false }
    h.talkWait = (h.talkWait ?? rnd(6, 14)) - dt
    if (h.goal && h.talkWait <= 0 && mayTalk()) { talk(h, 'staff'); h.talkWait = rnd(12, 22) }
    if (h.bubble) h.bubble.position.set(h.x, 1.9, h.z)
    updateTalk(h, dt, 2.5)
  }
}

// ---------------------------------------------------------------- Baekho
const input = { x: 0, z: 0, id: null, ox: 0, oy: 0, keys: new Set() }
function movePlayer(dt) {
  let ix = input.x, iz = input.z
  const k = input.keys
  if (k.has('KeyA') || k.has('ArrowLeft')) ix -= 1; if (k.has('KeyD') || k.has('ArrowRight')) ix += 1
  if (k.has('KeyW') || k.has('ArrowUp')) iz -= 1; if (k.has('KeyS') || k.has('ArrowDown')) iz += 1
  if (player.auto && !ix && !iz) {
    const g = guideTarget()
    if (g && !atPad(player, g)) {
      if (!player.path?.length || player.goal !== g || player.goalAt !== g.x + ',' + g.z) { player.goal = g; player.goalAt = g.x + ',' + g.z; player.path = findPath(player.x, player.z, g.x, g.z) }
      const p = player.path[0]; if (p) { const dx = p.x - player.x, dz = p.z - player.z, d = Math.hypot(dx, dz); if (d < 0.15) player.path.shift(); else { ix = dx / d; iz = dz / d } }
    }
  }
  const len = Math.hypot(ix, iz)
  if (len > 1) { ix /= len; iz /= len }
  const moving = len > 0.08
  if (moving) {
    player.x += ix * player.speed * dt; player.z += iz * player.speed * dt
    const want = Math.atan2(ix, iz); player.face += Math.atan2(Math.sin(want - player.face), Math.cos(want - player.face)) * Math.min(1, dt * 14)
  }
  const r = 0.36
  for (const b of boxes) {
    if (b.off) continue
    const cx = clamp(player.x, b.x0, b.x1), cz = clamp(player.z, b.z0, b.z1), dx = player.x - cx, dz = player.z - cz, d = Math.hypot(dx, dz)
    if (d < r) { if (d > 1e-4) { player.x = cx + dx / d * r; player.z = cz + dz / d * r } else player.z = b.z1 + r }
  }
  player.x = clamp(player.x, -XW + 0.1, XW - 0.1); player.z = clamp(player.z, Z0 + 0.3, Z1 - 1)
  const rig = player.rig; rig.g.position.x = player.x; rig.g.position.z = player.z; rig.g.rotation.y = player.face
  animate(rig, moving, dt, player.items.length > 0)
  player.xferT += dt
  if (player.xferT > 0.1) {
    player.xferT = 0
    for (const p of pads) {
      if (!p.g.visible || !atPad(player, p)) continue
      if (p.kind === 'buy') {
        if (buy.step && game.money > 0) { const pay = Math.min(game.money, buy.left, Math.max(1, Math.ceil(buy.step.cost / 14))); game.money -= pay; buy.left -= pay; drawBuy(); sfx('coin', 0.25); if (buy.left <= 0) { unlock(buy.step); break } }
        continue
      }
      const did = work(player, p); if (did) sfx(did, 0.5)
    }
  }
  setStack(rig.stack, player.items)
}
function unlock(st) {
  sfx('unlock'); buzz(40); game.lit++; game.unlocks.push(Math.round(game.time))
  if (st.what === 'stall') { const s = stalls[st.id]; s.open = true; setOpenLook(s); buildGrid(); bannerShow(`${t(s.name)}!`, 1.6); burst(s.disp.x, s.disp.z) }
  else if (st.what === 'staff') { hire(st.role, st.x, st.z); bannerShow(`${t(roleKey[st.role])}!`, 1.6); burst(st.x, st.z) }
  else { arch.visible = true; burst(0, -7.6, 60, 4); hudStreet(); clearCity(); return }
  setStep(game.step + 1)
  $('goal').classList.remove('pop'); void $('goal').offsetWidth; $('goal').classList.add('pop')
}

// the arrow shows the next useful spot
const arrow = mesh(new THREE.ConeGeometry(0.3, 0.6, 4), basic(0xffd23f)); arrow.rotation.x = Math.PI
function guideTarget() {
  const top = player.items[player.items.length - 1]
  if (top?.startsWith('raw')) return stalls[+top.slice(3)].pads.grill
  if (top?.startsWith('food')) return stalls[+top.slice(4)].pads.disp
  if (buy.step && game.money >= buy.left) return buy
  if (cashQ.length && cashQ[0].state === 'cash' && !tillManned() && !helpers.some((h) => h.role === 'cash')) return cashPad
  const carry = helpers.some((h) => h.role === 'carry'), cook = helpers.some((h) => h.role === 'cook')
  const need = stalls.filter((s) => s.open).sort((a, b) => (a.shown - queues[a.id].length) - (b.shown - queues[b.id].length))
  for (const s of need) {
    if (s.shown >= MAX_DISP - 2) continue
    if (s.food > 0 && !carry) return s.pads.grill
    if (s.raw + s.food < 3 && !cook) return s.pads.crate
  }
  return null
}

// ---------------------------------------------------------------- stalls cook, displays show
function updateStalls(dt) {
  for (const s of stalls) {
    if (!s.open) continue
    if (s.raw > 0) { s.cookT += dt; if (s.cookT >= s.cook) { s.cookT = 0; s.raw--; s.food++ } }
    const key = s.food + s.raw * 100
    if (s.grillShow.userData.n !== key) {
      s.grillShow.userData.n = key
      while (s.grillShow.children.length) s.grillShow.remove(s.grillShow.children[0])
      const all = [...Array(s.raw).fill(`raw${s.id}`), ...Array(s.food).fill(`food${s.id}`)]
      all.slice(0, 10).forEach((k, i) => { const m = ITEM[k](); m.position.set(-0.72 + (i % 5) * 0.36, 0, -0.25 + Math.floor(i / 5) * 0.45); if (k === 'food1') { m.rotation.z = Math.PI / 2; m.position.y = 0.1 } s.grillShow.add(m) })
    }
    if (s.dispShow.children.length !== s.shown) {
      while (s.dispShow.children.length > s.shown) s.dispShow.remove(s.dispShow.children[s.dispShow.children.length - 1])
      while (s.dispShow.children.length < s.shown) { const i = s.dispShow.children.length, m = ITEM[`food${s.id}`](); m.position.set(-0.72 + (i % 5) * 0.36, 0, -0.2 + Math.floor(i / 5) * 0.4); s.dispShow.add(m) }
    }
    const cooking = s.raw > 0
    for (const sp of s.steam) {
      sp.userData.t += dt * 0.6; if (sp.userData.t > 1) { sp.userData.t -= 1; sp.position.set(s.grill.x + rnd(-0.7, 0.7), 1.1, s.grill.z + rnd(-0.3, 0.3)) }
      const u = sp.userData.t; sp.position.y = 1.1 + u * 1.8; sp.scale.setScalar(0.5 + u * 0.9)
      sp.material.opacity = (cooking || s.food > 0 ? 0.55 : 0.12) * Math.sin(u * Math.PI)
    }
  }
}
// sparks when something opens, fireworks at the end
const sparks = [], sparkGeo = new THREE.SphereGeometry(0.08, 6, 4), sparkMats = [0xffd23f, 0xff5d8f, 0x7fe3ff, 0xffffff].map(basic)
function burst(x, z, n = 26, y = 1.2, scale = 1) {
  for (let i = 0; i < n; i++) {
    const m = mesh(sparkGeo, pick(sparkMats), x, y, z); m.scale.setScalar(scale)
    const a = Math.random() * Math.PI * 2, v = rnd(2, 5) * scale
    sparks.push({ m, vx: Math.cos(a) * v, vy: rnd(3, 7) * Math.sqrt(scale), vz: Math.sin(a) * v, life: rnd(0.8, 1.4) })
  }
}
function updateSparks(dt) {
  for (let i = sparks.length - 1; i >= 0; i--) {
    const p = sparks[i]; p.life -= dt; p.vy -= 9 * dt
    p.m.position.x += p.vx * dt; p.m.position.y += p.vy * dt; p.m.position.z += p.vz * dt
    if (p.life <= 0) { scene.remove(p.m); sparks.splice(i, 1) }
  }
}

// ---------------------------------------------------------------- save (Playgama storage and this device; the newer one wins)
const SAVE_KEY = 'baekho_pocha'
const save = { at: 0, runs: 0, clears: 0, bestTime: 0, bestServed: 0, music: 0.6, sfx: 0.9, shake: 1, lang: '' }
let saveReady = false, saveTimer = 0
function writeSave() {
  if (!saveReady) return // never write defaults over a save that has not been read yet
  clearTimeout(saveTimer)
  saveTimer = setTimeout(() => {
    save.at = Date.now()
    const text = JSON.stringify(save)
    try { localStorage.setItem(SAVE_KEY, text) } catch {}
    if (platform.ready) try { Promise.resolve(window.bridge.storage.set(SAVE_KEY, text)).catch(() => {}) } catch {}
  }, 300)
}
const parseSave = (text) => { try { const o = typeof text === 'string' && text ? JSON.parse(text) : (text && typeof text === 'object' ? text : null); return o && typeof o === 'object' ? o : null } catch { return null } }
async function readSave() {
  let local = null, remote = null
  try { local = parseSave(localStorage.getItem(SAVE_KEY)) } catch {}
  if (platform.ready) {
    // a slow or failing platform storage never holds the title for more than 2.5 s
    try { remote = parseSave(await Promise.race([window.bridge.storage.get(SAVE_KEY), new Promise((r) => setTimeout(() => r(null), 2500))])) } catch {}
  }
  const best = [local, remote].filter(Boolean).sort((a, b) => (+b.at || 0) - (+a.at || 0))[0]
  if (best) {
    for (const k of ['at', 'runs', 'clears', 'bestTime', 'bestServed', 'music', 'sfx', 'shake']) if (best[k] != null && Number.isFinite(+best[k])) save[k] = +best[k]
    save.music = clamp(save.music, 0, 1); save.sfx = clamp(save.sfx, 0, 1); save.lang = pickLang(best.lang)
  }
  saveReady = true
}

// ---------------------------------------------------------------- platform (Playgama Bridge; the game runs the same without it)
const platform = {
  ready: false, audioOn: true, paused: false, adOpen: false,
  message(name) { if (this.ready) try { window.bridge.platform.sendMessage(name) } catch {} },
  track(name, data = {}) { if (player?.auto) return; if (this.ready) try { window.bridge.analytics?.send(name, data) } catch {} },
  async init() {
    const bridge = window.bridge
    if (!bridge || window.__noBridge) return
    try {
      bridge.engine = 'javascript'
      await Promise.race([bridge.initialize(), new Promise((_, no) => setTimeout(() => no(new Error('bridge timeout')), 6000))])
      this.ready = true
      this.audioOn = bridge.platform.isAudioEnabled !== false
      const ev = bridge.EVENT_NAME
      bridge.platform.on(ev.AUDIO_STATE_CHANGED, (on) => { this.audioOn = on; applyVolume() })
      bridge.platform.on(ev.PAUSE_STATE_CHANGED, (on) => { this.paused = on; applyVolume(); if (on) pauseGame() })
      bridge.advertisement.on(ev.INTERSTITIAL_STATE_CHANGED, (st) => this.onAd(st))
      bridge.advertisement.on(ev.REWARDED_STATE_CHANGED, (st) => this.onReward(st))
      const lg = pickLang(bridge.platform.language); if (lg && !Q.get('lang')) lang = lg
    } catch (error) { console.warn('bridge', error) }
  },
  onAd(state) {
    if (state === 'opened') { this.adOpen = true; clearTimeout(this.adWait); applyVolume() }
    if (state === 'closed' || state === 'failed') { this.adOpen = false; applyVolume(); this.afterAd() }
  },
  // A full-screen ad only when Play again / Title is pressed after a clear (never over the result itself), never in the
  // first 2 minutes on the page, at most once per 3 minutes (BALANCE.md 'ads'). The next screen starts when the ad closes,
  // or after 3 s if no ad came.
  lastAd: 0, adNext: null, adWait: 0, since: 0,
  // rewarded, the player's choice: done(true) only after 'rewarded'; a failed or missing ad gives nothing and goes on
  rewardDone: null, rewarded: false, rewardWait: 0,
  onReward(state) {
    if (state === 'opened') { this.adOpen = true; clearTimeout(this.rewardWait); applyVolume() }
    if (state === 'rewarded') this.rewarded = true
    if (state === 'closed' || state === 'failed') { this.adOpen = false; applyVolume(); this.endReward() }
  },
  endReward() { clearTimeout(this.rewardWait); const done = this.rewardDone; this.rewardDone = null; const ok = this.rewarded; this.rewarded = false; done?.(ok) },
  rewardedAd(done) {
    if (this.rewardDone) return // double tap: one ad
    if (!this.ready) { done(false); return }
    this.rewardDone = done; this.rewarded = false; this.lastAd = Date.now()
    this.rewardWait = setTimeout(() => { if (!this.adOpen) this.endReward() }, 4000)
    try { window.bridge.advertisement.showRewarded() } catch { this.endReward() }
  },
  afterAd() { const next = this.adNext; this.adNext = null; clearTimeout(this.adWait); next?.() },
  interstitial(next) {
    if (this.adNext) return // a second fast tap while the ad is coming: one ad, one next screen
    if (!this.ready || performance.now() - this.since < 120000 || Date.now() - this.lastAd < 180000) { next(); return }
    this.lastAd = Date.now(); this.adNext = next
    this.adWait = setTimeout(() => { if (!this.adOpen) this.afterAd() }, 3000)
    try { window.bridge.advertisement.showInterstitial() } catch { this.afterAd() }
  },
}

// ---------------------------------------------------------------- sound: files from tools/make_sounds.py (Playgama 3.3.1)
const audio = {
  ctx: null, buffers: {}, master: null, musicGain: null, sfxGain: null, music: null,
  unlock() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume?.(); return }
    const Ctx = window.AudioContext || window.webkitAudioContext
    if (!Ctx) return
    try { this.ctx = new Ctx() } catch { return }
    this.master = this.ctx.createGain(); this.master.connect(this.ctx.destination)
    this.musicGain = this.ctx.createGain(); this.musicGain.connect(this.master)
    this.sfxGain = this.ctx.createGain(); this.sfxGain.connect(this.master)
    applyVolume()
    for (const n of ['pop', 'drop', 'coin', 'angry', 'unlock', 'rush', 'end', 'click']) this.load(n)
    this.load('market').then(() => this.startMusic())
    for (const n of ['sizzle', 'crowd']) this.load(n).then(() => this.startLoop(n))
  },
  async load(name) {
    try { this.buffers[name] = await this.ctx.decodeAudioData(await (await fetch(`audio/${name}.ogg`)).arrayBuffer()) } catch (error) { console.warn('sound', name, error) }
  },
  play(name, vol = 1) {
    if (!this.ctx || !this.buffers[name]) return
    const src = this.ctx.createBufferSource(), g = this.ctx.createGain(); src.buffer = this.buffers[name]; g.gain.value = vol
    src.connect(g).connect(this.sfxGain); src.start()
  },
  // street ambience under the music: the crowd murmurs all night, the griddles sizzle louder as more stalls open
  loops: {},
  startLoop(name) {
    if (this.loops[name] || !this.buffers[name]) return
    const src = this.ctx.createBufferSource(), g = this.ctx.createGain(); src.buffer = this.buffers[name]; src.loop = true; g.gain.value = 0
    src.connect(g).connect(this.sfxGain); src.start(); this.loops[name] = g
  },
  ambience(crowd, sizzle) {
    if (!this.ctx) return
    const now = this.ctx.currentTime
    this.loops.crowd?.gain.setTargetAtTime(crowd, now, 0.4); this.loops.sizzle?.gain.setTargetAtTime(sizzle, now, 0.3)
  },
  startMusic() {
    if (this.music || !this.buffers.market) return
    const src = this.ctx.createBufferSource(); src.buffer = this.buffers.market; src.loop = true; src.connect(this.musicGain); src.start(); this.music = src
  },
}
const sfx = (kind, vol = 0.6) => audio.play(kind, vol * 1.4)
const unlockAudio = () => audio.unlock()
function applyVolume() {
  if (!audio.ctx) return
  const silent = Q.has('mute') || !platform.audioOn || platform.adOpen || platform.paused || document.hidden
  audio.master.gain.value = silent ? 0 : 1
  audio.musicGain.gain.value = save.music * 0.45
  audio.sfxGain.gain.value = save.sfx
}
const buzz = (ms) => { if (save.shake && navigator.userActivation?.hasBeenActive) try { navigator.vibrate?.(ms) } catch {} }

// ---------------------------------------------------------------- HUD and screens
let bannerT = 0
function bannerShow(text, secs) { $('banner').textContent = text; $('banner').classList.add('on'); bannerT = secs }
$('lamps').innerHTML = '<i></i>'.repeat(8)
function hudStreet() {
  $('lamps').querySelectorAll('i').forEach((e, i) => e.classList.toggle('on', i < game.lit))
  $('streetTxt').textContent = `${game.lit}/8`
  const st = STEPS[game.step]
  $('goal').innerHTML = st && game.phase !== 'clear' ? `${t('next')}: ${stepName(st)}<b>₩${st.cost}</b>` : ''
  $('goal').classList.toggle('hide', !st || game.phase === 'clear')
}
const mmss = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`
function startGame() {
  unlockAudio()
  for (const c of customers) removeWalker(c)
  for (const h of helpers) removeWalker(h)
  customers.length = 0; helpers.length = 0; queues.forEach((q) => { q.length = 0 }); cashQ.length = 0
  flyers.forEach((f) => scene.remove(f.m)); flyers.length = 0
  $('offerBtn').classList.add('hide')
  Object.assign(game, { phase: 'play', paused: false, offered: false, offerT: 0, time: 0, money: 0, earned: 0, served: 0, lost: 0, rush: false, spawnT: 1.2, rushShown: false, lit: 1, clearT: 0, unlocks: [] })
  resetStalls(); arch.visible = false
  Object.assign(player, { x: 0, z: -1.5, items: [], face: Math.PI, path: [] })
  setStep(0)
  for (const id of ['title', 'end', 'panel']) $(id).classList.add('hide')
  $('hud').classList.remove('hide'); $('map').classList.remove('hide')
  $('hint').textContent = t('hint'); setTimeout(() => $('hint').classList.add('on'), 1600); setTimeout(() => $('hint').classList.remove('on'), 6000)
  // arrival: a passport stamp for the city, 2 s
  $('stampCity').textContent = city.stamp; $('stampSub').textContent = t('sub'); $('stampDate').textContent = new Date().toISOString().slice(0, 10).replaceAll('-', '.')
  $('stamp').classList.remove('hide', 'on'); void $('stamp').offsetWidth; $('stamp').classList.add('on'); clearTimeout(game.stampT); game.stampT = setTimeout(() => $('stamp').classList.add('hide'), 2300)
  player.callT = 2.6
  guardBack(true)
  save.runs++; writeSave()
  platform.message('gameplay_started'); platform.track('shift_start', { run: save.runs })
}
// Rewarded offer (BALANCE.md 'ads'): just before the rush, a helper the player has not hired yet works 3 minutes free.
// Shown only when the platform can show ads and a role is missing; a failed ad hides the button and gives nothing.
const TEMP_HELPER = 180
function offerHelper() {
  const role = ['cash', 'carry', 'cook'].find((r) => !helpers.some((h) => h.role === r))
  if (!role || !platform.ready) return
  game.offerRole = role; game.offerT = 14
  $('offerTxt').textContent = t('freeHelper').replace('{who}', t(roleKey[role]))
  $('offerBtn').classList.remove('hide')
}
function takeOffer() {
  $('offerBtn').classList.add('hide'); game.offerT = 0
  const role = game.offerRole
  platform.rewardedAd((ok) => {
    if (!ok || game.phase !== 'play') return
    const st = STEPS.find((x) => x.role === role); hire(role, st.x, st.z); helpers[helpers.length - 1].temp = TEMP_HELPER
    burst(st.x, st.z, 24); sfx('unlock'); platform.track('reward_helper', { role })
  })
}
// all 8 lamps: fireworks over Namsan, then the card that opens the next city
function clearCity() {
  game.phase = 'clear'; game.clearT = 0; buy.g.visible = false; hudStreet(); sfx('end'); buzz(80)
  bannerShow(t('clear'), 3)
  input.x = input.z = 0; input.id = null; $('stick').classList.add('hide')
  const secs = Math.round(game.time), newBest = !save.bestTime || secs < save.bestTime
  const run = { time: game.time, earned: game.earned, served: game.served, lost: game.lost }
  const moreServed = run.served > (save.bestServed || 0)
  save.clears++; if (newBest) save.bestTime = secs; if (moreServed) save.bestServed = run.served
  writeSave()
  platform.message('gameplay_stopped'); platform.track('city_clear', { city: 'seoul', secs, earned: game.earned, lost: game.lost })
  setTimeout(() => {
    $('endTitle').textContent = t('clear')
    for (const [k, v] of [['time', mmss(run.time)], ['earned', '₩' + run.earned], ['served', run.served], ['lost', run.lost]]) { $(k + 'Lbl').textContent = t(k); $(k + 'Txt').textContent = v }
    // records: this run against the best so far (no locked next city: it is not in the game yet)
    $('newBest').textContent = t('newBest'); $('newBest').classList.toggle('hide', !(newBest || moreServed))
    $('recTimeLbl').textContent = t('best'); $('recTimeTxt').textContent = mmss(save.bestTime); $('recTimeNew').textContent = newBest ? 'NEW' : ''
    $('recServedLbl').textContent = t('mostServed'); $('recServedTxt').textContent = save.bestServed; $('recServedNew').textContent = moreServed ? 'NEW' : ''
    $('postFrom').textContent = t('postcard'); $('postMark').textContent = city.stamp
    $('end').classList.remove('hide'); $('hud').classList.add('hide'); $('offerBtn').classList.add('hide'); $('map').classList.add('hide')
    game.phase = 'end'
    if (newBest || moreServed) setTimeout(() => sfx('unlock'), 900)
  }, Q.has('fast') ? 0 : 3200) // ?fast: tests skip the fireworks wait
}
function goTitle() {
  if (game.phase === 'play') platform.message('gameplay_stopped')
  game.phase = 'title'; game.paused = false
  for (const c of customers) removeWalker(c)
  for (const h of helpers) removeWalker(h)
  customers.length = 0; helpers.length = 0; queues.forEach((q) => { q.length = 0 }); cashQ.length = 0
  resetStalls(); arch.visible = false; setStep(0)
  Object.assign(player, { x: 0, z: -1.5, items: [], face: Math.PI, path: [] })
  for (const id of ['end', 'panel', 'hud', 'map', 'offerBtn']) $(id).classList.add('hide')
  $('title').classList.remove('hide'); applyText()
}
// every fixed text on the screens (again after a language change)
function applyText() {
  document.documentElement.lang = lang; document.title = t('title')
  $('titleTxt').textContent = t('title'); $('subTxt').textContent = t('sub'); $('startBtn').textContent = t('start')
  $('bestRow').classList.toggle('hide', !save.bestTime); $('bestLbl').textContent = t('best'); $('bestTxt').textContent = mmss(save.bestTime)
  $('againBtn').textContent = t('again'); $('homeBtn').textContent = t('home')
  $('resumeBtn').textContent = game.phase === 'play' ? t('resume') : t('close'); $('quitBtn').textContent = t('quit')
  if (!$('panel').classList.contains('hide')) renderPanel()
}

// ---------------------------------------------------------------- settings (title) and pause (mid-shift): one panel
function renderPanel() {
  const host = $('panelBody'), inPlay = game.phase === 'play'
  $('panelTitle').textContent = inPlay ? t('paused') : t('settings')
  host.innerHTML = ''
  const row = (label, el, cls = '') => { const d = document.createElement('label'); d.className = 'opt ' + cls; const sp = document.createElement('span'); sp.textContent = label; d.append(sp, el); host.appendChild(d) }
  const slider = (key) => { const s = document.createElement('input'); s.type = 'range'; s.min = 0; s.max = 1; s.step = 0.05; s.value = save[key]; s.oninput = () => { save[key] = +s.value; applyVolume(); writeSave() }; s.onchange = () => sfx('click'); return s }
  row(t('music'), slider('music')); row(t('sfx'), slider('sfx'))
  const toggle = (get, set) => { const b = document.createElement('button'); b.className = 'sub'; const show = () => { b.textContent = get() ? t('on') : t('off'); b.classList.toggle('on', !!get()) }; b.onclick = (e) => { e.preventDefault(); set(!get()); sfx('click'); show() }; show(); return b }
  row(t('shake'), toggle(() => save.shake, (v) => { save.shake = v ? 1 : 0; writeSave(); buzz(40) }))
  if (document.fullscreenEnabled && !platform.ready) row(t('fullscreen'), toggle(() => !!document.fullscreenElement, (v) => { try { v ? document.documentElement.requestFullscreen?.() : document.exitFullscreen?.() } catch {} }))
  const h = document.createElement('div'); h.className = 'opt langTitle'; h.textContent = t('language'); host.appendChild(h)
  const grid = document.createElement('div'); grid.className = 'langs'
  for (const k of LANG_KEYS) {
    const b = document.createElement('button'); b.className = 'sub' + (k === lang ? ' on' : ''); b.textContent = LANGUAGES[k]; b.lang = k
    b.onclick = () => { sfx('click'); lang = k; save.lang = k; writeSave(); relabel() }
    grid.appendChild(b)
  }
  host.appendChild(grid)
  $('quitBtn').classList.toggle('hide', !inPlay); $('resumeBtn').classList.toggle('only', !inPlay)
  $('resumeBtn').textContent = inPlay ? t('resume') : t('close')
}
function openPanel() {
  if (game.phase === 'clear') return
  if (game.phase === 'play') { game.paused = true; input.x = input.z = 0; input.id = null; $('stick').classList.add('hide') }
  renderPanel(); $('panel').classList.remove('hide'); $('title').classList.add('hide'); $('end').classList.add('hide')
}
function closePanel() {
  $('panel').classList.add('hide'); game.paused = false
  if (game.phase === 'title') $('title').classList.remove('hide')
  if (game.phase === 'end') $('end').classList.remove('hide')
}
function pauseGame() { if (game.phase === 'play' && !game.paused) openPanel() }
document.addEventListener('visibilitychange', () => { applyVolume(); if (document.hidden) pauseGame() })
const tap = (id, fn) => $(id).addEventListener('click', () => { unlockAudio(); sfx('click', 0.4); fn() })
tap('startBtn', startGame)
tap('againBtn', () => platform.interstitial(startGame))
tap('homeBtn', () => platform.interstitial(goTitle))
tap('setBtn', () => ($('panel').classList.contains('hide') ? openPanel() : closePanel()))
tap('resumeBtn', closePanel)
tap('quitBtn', goTitle)
$('offerBtn').addEventListener('click', () => { unlockAudio(); sfx('click', 0.4); takeOffer() })

// ---------------------------------------------------------------- input: drag anywhere = stick
// Phones: an edge swipe went back a page mid-shift (11-14 user). Block the default of every touch on the game, and while a
// shift runs keep one extra history entry so a back gesture that still slips through lands on the same page.
for (const ev of ['touchstart', 'touchmove']) document.addEventListener(ev, (e) => { if (!e.target.closest?.('button')) e.preventDefault() }, { passive: false })
let guard = false
function guardBack(on) { if (on && !guard) { guard = true; try { history.pushState({ pocha: 1 }, '') } catch {} } }
addEventListener('popstate', () => { if (game.phase === 'play') { try { history.pushState({ pocha: 1 }, '') } catch {} } else guard = false })
canvas.addEventListener('pointerdown', (e) => {
  unlockAudio(); if (game.phase !== 'play' || game.paused) return
  input.id = e.pointerId; input.ox = e.clientX; input.oy = e.clientY; input.x = input.z = 0
  const st = $('stick'); st.style.left = e.clientX + 'px'; st.style.top = e.clientY + 'px'; st.classList.remove('hide'); $('knob').style.transform = ''
  canvas.setPointerCapture?.(e.pointerId)
})
addEventListener('pointermove', (e) => {
  if (e.pointerId !== input.id) return
  let dx = e.clientX - input.ox, dy = e.clientY - input.oy; const d = Math.hypot(dx, dy), R = 50
  if (d > R) { dx = dx / d * R; dy = dy / d * R }
  input.x = dx / R; input.z = dy / R
  $('knob').style.transform = `translate(${dx}px, ${dy}px)`
})
const lift = (e) => { if (e.pointerId !== input.id) return; input.id = null; input.x = input.z = 0; $('stick').classList.add('hide') }
addEventListener('pointerup', lift); addEventListener('pointercancel', lift)
addEventListener('keydown', (e) => {
  input.keys.add(e.code)
  if (e.code === 'Escape' || e.code === 'KeyP') { if (!$('panel').classList.contains('hide')) closePanel(); else pauseGame() }
  if (e.code === 'Enter' && $('panel').classList.contains('hide') && !e.repeat) { if (game.phase === 'title') startGame(); else if (game.phase === 'end') platform.interstitial(startGame) }
})
addEventListener('keyup', (e) => input.keys.delete(e.code))
addEventListener('blur', () => input.keys.clear())

// ---------------------------------------------------------------- camera
const camAt = new THREE.Vector3(0, 0, -3), camPos = new THREE.Vector3(), look = new THREE.Vector3()
function resize() { renderer.setSize(innerWidth, innerHeight, false); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix() }
addEventListener('resize', resize); resize()
function updateCamera(dt, snap) {
  const aspect = camera.aspect, tan = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)), wide = aspect >= 1
  const k = snap ? 1 : 1 - Math.exp(-dt * 2.2)
  if (game.phase === 'play') {
    const d = wide ? 15.5 : 20, h = d * 0.7, zoff = d * (wide ? 0.72 : 0.74)
    // where the bottom screen edge meets the ground, relative to camAt (11-14 user: walking down left Baekho off screen)
    const half = THREE.MathUtils.degToRad(camera.fov / 2), bottom = zoff - h / Math.tan(Math.atan2(h, zoff + 0.5) + half)
    // the next spot pulls the view a little (at most 2 m), so Baekho always stays near the middle
    const gt = guideTarget(), ax = player.x + (gt ? clamp((gt.x - player.x) * 0.35, -1, 1) : 0), az = player.z + (gt ? clamp((gt.z - player.z) * 0.35, -2, 2) : 0)
    const tx = wide ? 0 : clamp(ax, -3.6, 3.6) // portrait is narrow: follow Baekho sideways too
    // never past the street's bottom end (no empty ground below), never so far that Baekho leaves the screen
    let tz = clamp(wide ? az : az - 1.4, -10, Z1 + 2.5 - bottom)
    tz = clamp(tz, player.z + 3 - bottom, player.z + 4)
    camAt.x += (tx - camAt.x) * k; camAt.z += (tz - camAt.z) * k
    camPos.set(camAt.x, d * (wide ? 0.7 : 0.7), camAt.z + d * (wide ? 0.72 : 0.74)); look.set(camAt.x, 0, camAt.z - 0.5)
    camera.position.copy(camPos)
  } else {
    // title and the end: low at the street mouth, looking up the street at Namsan tower
    camPos.set(0, wide ? 5 : 6, wide ? 9 : 11); look.set(4, 18, -80)
    camera.position.lerp(camPos, snap ? 1 : k)
  }
  camera.lookAt(look)
}

// ---------------------------------------------------------------- street map (corner, look only) and the edge arrow
// 11-14 user "맵이 큰거 같은데 도우미맵을 띄워줘": Baekho (white dot), open stalls (their colour), lots not open yet
// (dashed), the next money spot (blinking gold), helpers (orange dots). The next spot off screen also gets an arrow on
// the screen edge.
const mapCv = $('map'), mapG = mapCv.getContext('2d')
let mapT = 0
function drawMap(now) {
  const W = mapCv.clientWidth, H = mapCv.clientHeight, dpr = Math.min(2, devicePixelRatio || 1)
  if (!W || !H) return
  if (mapCv.width !== Math.round(W * dpr)) { mapCv.width = Math.round(W * dpr); mapCv.height = Math.round(H * dpr) }
  const g = mapG; g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, W, H)
  const pad = 5, sx = (W - pad * 2) / (XW * 2), sz = (H - pad * 2) / (Z1 - Z0)
  const X = (x) => pad + (x + XW) * sx, Z = (z) => pad + (z - Z0) * sz
  g.fillStyle = 'rgba(20,14,40,.82)'; g.beginPath(); g.roundRect(0, 0, W, H, 10); g.fill()
  g.fillStyle = '#4a4060'; g.fillRect(X(-XW), Z(Z0), XW * 2 * sx, (Z1 - Z0) * sz)
  for (const s of stalls) {
    const R = ROWS[s.row], x0 = X(s.x - 1.3), z0 = Z(R.grill - 0.8), w = 2.6 * sx, h = (R.disp - R.grill + 1.6) * sz
    if (s.open) { g.fillStyle = s.neon; g.fillRect(x0, z0, w, h) } else { g.strokeStyle = 'rgba(255,255,255,.45)'; g.setLineDash([3, 2]); g.lineWidth = 1.2; g.strokeRect(x0, z0, w, h); g.setLineDash([]) }
  }
  g.fillStyle = '#ffd23f'; g.fillRect(X(CASH.x - 1), Z(CASH.z - 0.45), 2 * sx, 0.9 * sz)
  if (arch.visible) { g.fillStyle = '#c0392b'; g.fillRect(X(-5.6), Z(-7.8), 11.2 * sx, 2) }
  if (buy.step && buy.g.visible && Math.floor(now / 350) % 2 === 0) { g.strokeStyle = '#ffd23f'; g.lineWidth = 2; g.strokeRect(X(buy.x) - 5, Z(buy.z) - 5, 10, 10) }
  g.fillStyle = 'rgba(220,220,235,.55)'; for (const c of customers) { g.beginPath(); g.arc(X(c.x), Z(c.z), 1.4, 0, Math.PI * 2); g.fill() }
  g.fillStyle = '#ff9a2a'; for (const h of helpers) { g.beginPath(); g.arc(X(h.x), Z(h.z), 2.6, 0, Math.PI * 2); g.fill() }
  g.fillStyle = '#fff'; g.strokeStyle = '#1b1530'; g.lineWidth = 1.5; g.beginPath(); g.arc(X(player.x), Z(player.z), 3.8, 0, Math.PI * 2); g.fill(); g.stroke()
}
const edgeV = new THREE.Vector3()
function updateEdge() {
  const el = $('edge'), tgt = game.phase === 'play' && !game.paused ? (guideTarget() || (buy.step && game.money >= buy.left ? buy : null)) : null
  if (!tgt) { el.classList.add('hide'); return }
  edgeV.set(tgt.x, 0.5, tgt.z).project(camera)
  const behind = edgeV.z > 1, inside = !behind && Math.abs(edgeV.x) < 0.92 && Math.abs(edgeV.y) < 0.9
  if (inside) { el.classList.add('hide'); return }
  let x = behind ? -edgeV.x : edgeV.x, y = behind ? -edgeV.y : edgeV.y
  const k = 1 / Math.max(Math.abs(x) / 0.86, Math.abs(y) / 0.8, 1e-6); x *= k; y *= k
  const px = (x + 1) / 2 * innerWidth, py = (1 - y) / 2 * innerHeight
  el.style.left = clamp(px, 30, innerWidth - 30) + 'px'; el.style.top = clamp(py, 120, innerHeight - 40) + 'px'
  el.style.transform = `translate(-50%, -50%) rotate(${Math.atan2(-y, x)}rad)`
  el.classList.remove('hide')
}

// ---------------------------------------------------------------- loop
let last = performance.now()
function frame(now) {
  requestAnimationFrame(frame)
  const real = Math.min(0.05, (now - last) / 1000); last = now
  const hold = game.paused || platform.adOpen || platform.paused
  if (!hold) for (let n = 0; n < SPEED; n++) step(real, now)
  updateCamera(real)
  if (game.phase === 'play' && now - mapT > 90) { mapT = now; drawMap(now) }
  updateEdge()
  if (audio.ctx) {
    let near = 99; for (const st of stalls) if (st.open) near = Math.min(near, Math.hypot(player.x - st.grill.x, player.z - st.grill.z))
    const play = game.phase === 'play'
    audio.ambience(play ? 0.16 + (game.rush ? 0.14 : 0) + Math.min(0.12, customers.length * 0.008) : 0.08, play ? 0.04 * openCount() + Math.max(0, 1 - near / 4) * 0.22 : 0)
  }
  renderer.render(scene, camera)
}
function step(dt, now) {
  talkClock -= dt
  if (game.phase === 'play') {
    game.time += dt
    if (!game.rushShown && game.time > RUSH_AT - 3) { game.rushShown = true; bannerShow(t('rushSoon'), 2.4) }
    if (!game.offered && game.time > RUSH_AT - 14) { game.offered = true; offerHelper() }
    if (game.offerT > 0) { game.offerT -= dt; if (game.offerT <= 0) $('offerBtn').classList.add('hide') }
    for (let i = helpers.length - 1; i >= 0; i--) { const h = helpers[i]; if (h.temp == null) continue; h.temp -= dt; if (h.temp <= 0) { removeWalker(h); helpers.splice(i, 1); burst(h.x, h.z, 14) } }
    const rushNow = game.time >= RUSH_AT && game.time < RUSH_AT + RUSH_LEN
    if (rushNow && !game.rush) { bannerShow(t('rush'), 2.2); sfx('rush') }
    game.rush = rushNow
    game.spawnT -= dt
    if (game.spawnT <= 0) { spawnCustomer(); game.spawnT = spawnGap() }
    movePlayer(dt)
    $('moneyTxt').textContent = game.money
  } else animate(player.rig, false, dt, player.items.length > 0)
  if (game.phase === 'clear' || game.phase === 'end') { game.clearT += dt; if (Math.random() < dt * 4) burst(rnd(-10, 30), rnd(-80, -50), 30, rnd(30, 55), 5) }
  if (game.phase === 'play') { player.callT = (player.callT ?? 2) - dt; if (player.callT <= 0) { player.callT = rnd(14, 24); talk(player, 'call') } }
  updateTalk(player, dt, 3.1)
  updateHelpers(dt); updateCustomers(dt); updateStalls(dt); updateFlyers(dt); updateSparks(dt)
  if (bannerT > 0) { bannerT -= dt; if (bannerT <= 0) $('banner').classList.remove('on') }
  const r = game.rush ? 1 : 0
  hemi.color.setHex(r ? 0xff7ab8 : 0x8a96ff)
  scene.background.copy(SKY).lerp(new THREE.Color(0x3a1440), r * 0.8)
  bulbs.forEach((b, i) => b.material.color.setHex(r && Math.floor(game.time * 6 + i) % 2 ? 0xffffff : b.userData.base))
  tower.tip.visible = Math.floor(now / 600) % 2 === 0
  const g = game.phase === 'play' ? guideTarget() : null
  arrow.visible = !!g && !atPad(player, g)
  if (g) arrow.position.set(g.x, 1.4 + Math.sin(now / 160) * 0.18, g.z)
  for (const p of pads) if (p.kind !== 'buy') p.g.scale.setScalar(p === g ? 1 + Math.sin(now / 120) * 0.08 : 1)
}
resetStalls(); setStep(0); updateCamera(0, true)
applyText()
requestAnimationFrame(frame)
// boot: platform first (language, storage), then the save; the title waits for neither longer than a few seconds
;(async () => {
  await platform.init()
  await readSave()
  const want = pickLang(Q.get('lang')) || save.lang || lang
  if (want !== lang) lang = want
  relabel(); applyVolume()
  $('setBtn').classList.remove('hide')
  platform.message('game_ready')
  window.__ready = true
})()

if (Q.has('debug')) window.__gt = { RUSH_AT, camera, input, Z0, Z1, XW, scene, offerHelper, takeOffer, clearCity, save, platform, audio, renderer, openPanel, closePanel, goTitle, readSave, writeSave, game, player, stalls, queues, cashQ, customers, helpers, startGame, spawnCustomer, buy, STEPS, findPath, camera }
