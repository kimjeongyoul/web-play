// Baekho Pocha prototype (2026-11-14): a 2-minute night-market shift. One stick (walk), no buttons in play.
// Stand on a spot to work: crate -> grill -> display -> customers take food -> cashier takes their money.
// Money pads open the eomuk stall and hire a helper. One rush in the middle. Built to test the staff pathing and the
// customer queues before anything else (order: gamedev-kit/history/NEXT_GAMES.md).
import * as THREE from './vendor/three.module.min.js'
import { STR } from './strings.js'

const Q = new URLSearchParams(location.search)
const SPEED = clampSpeed(+Q.get('speed') || 1) // tests: run the shift faster
function clampSpeed(v) { return Math.max(1, Math.min(8, Math.round(v))) }
const lang = (Q.get('lang') || navigator.language || 'en').slice(0, 2) === 'ko' ? 'ko' : 'en'
const t = (k) => STR[lang][k] ?? STR.en[k]
const $ = (id) => document.getElementById(id)
const clamp = (v, a, b) => Math.max(a, Math.min(b, v))
const rnd = (a, b) => a + Math.random() * (b - a)
const pick = (a) => a[Math.floor(Math.random() * a.length)]

// ---------------------------------------------------------------- numbers (prototype, BALANCE.md comes with the first real build)
const DUR = 120, RUSH_AT = 60, RUSH_LEN = 20
const PRICE = [3, 5], COOK = [0.9, 1.1], MAX_GRILL = 10, MAX_DISP = 10
const COST_ODEN = 20, COST_HELPER = 30
const SPAWN = 5.2, SPAWN_RUSH = 1.0, PATIENCE = 30

// ---------------------------------------------------------------- renderer, scene
const canvas = $('c')
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' })
renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
const scene = new THREE.Scene()
const SKY = new THREE.Color(0x161c3a)
scene.background = SKY.clone()
scene.fog = new THREE.Fog(0x161c3a, 34, 70)
const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 200)
const hemi = new THREE.HemisphereLight(0x8a96ff, 0x3a2438, 1.6); scene.add(hemi)
const moon = new THREE.DirectionalLight(0xb8c0ff, 1.1); moon.position.set(-6, 14, 9); scene.add(moon)

const mats = new Map()
const mat = (c, e = 0) => { const k = c + ':' + e; if (!mats.has(k)) mats.set(k, new THREE.MeshLambertMaterial({ color: c, emissive: e, flatShading: true })); return mats.get(k) }
const basic = (c) => new THREE.MeshBasicMaterial({ color: c })
function mesh(geo, m, x = 0, y = 0, z = 0, parent = scene) { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); parent.add(o); return o }
const box = (w, h, d, c, x, y, z, p) => mesh(new THREE.BoxGeometry(w, h, d), typeof c === 'number' ? mat(c) : c, x, y, z, p)
const cyl = (r1, r2, h, c, x, y, z, p, seg = 8) => mesh(new THREE.CylinderGeometry(r1, r2, h, seg), typeof c === 'number' ? mat(c) : c, x, y, z, p)
const sph = (r, c, x, y, z, p, ws = 10, hs = 8) => mesh(new THREE.SphereGeometry(r, ws, hs), typeof c === 'number' ? mat(c) : c, x, y, z, p)

function canvasTex(w, h, draw) {
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h
  const g = cv.getContext('2d'); draw(g, w, h)
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4
  return { tex, cv, g }
}

// ---------------------------------------------------------------- the alley
const ground = mesh(new THREE.PlaneGeometry(40, 50), mat(0x2c2b3d), 0, 0, 1); ground.rotation.x = -Math.PI / 2
// paving lines
for (let z = -14; z <= 16; z += 2) { const l = mesh(new THREE.PlaneGeometry(12.4, 0.06), basic(0x3a3950), 0, 0.005, z); l.rotation.x = -Math.PI / 2 }
for (const x of [-6.35, 6.35]) { const c = box(0.3, 0.18, 32, 0x55536a, x, 0.09, 1) }

// buildings around the alley with lit windows
const winGeo = new THREE.PlaneGeometry(0.7, 0.9)
const winOn = new THREE.MeshBasicMaterial({ color: 0xffd98a }), winOff = new THREE.MeshBasicMaterial({ color: 0x2a2f55 })
function building(x, z, w, d, h, c, faceZ) {
  box(w, h, d, c, x, h / 2, z)
  const cols = Math.floor(w / 1.3), rows = Math.floor((h - 1) / 1.5)
  for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
    const m = new THREE.Mesh(winGeo, Math.random() < 0.55 ? winOn : winOff)
    if (faceZ) m.position.set(x - w / 2 + 0.65 + i * 1.3 + 0.0, 1.6 + j * 1.5, z + d / 2 + 0.01)
    else { m.position.set(x + (x < 0 ? w / 2 + 0.01 : -w / 2 - 0.01), 1.6 + j * 1.5, z - d / 2 + 0.65 + i * 1.3); m.rotation.y = x < 0 ? Math.PI / 2 : -Math.PI / 2 }
    scene.add(m)
  }
}
const bcols = [0x3b3460, 0x463a5e, 0x33405f, 0x4a3550]
building(-4.6, -15.8, 4.4, 3, 7.5, bcols[0], true); building(0, -16.2, 4.8, 3, 9.5, bcols[1], true); building(4.7, -15.8, 4.4, 3, 6.8, bcols[2], true)
for (let z = -12; z < 18; z += 6) { building(-8.2, z, 3.4, 5.8, rnd(5, 9), pick(bcols), false); building(8.2, z, 3.4, 5.8, rnd(5, 9), pick(bcols), false) }

// string lights across the alley
const bulbGeo = new THREE.SphereGeometry(0.11, 8, 6)
const bulbCols = [0xffd36b, 0xff7aa8, 0x7fe3ff, 0xffb35c]
const bulbs = []
for (const z of [-9, -3, 3, 9]) {
  const pts = []
  for (let i = 0; i <= 24; i++) { const u = i / 24, x = -6.3 + 12.6 * u; pts.push(new THREE.Vector3(x, 4.6 - Math.sin(Math.PI * u) * 1.1, z + Math.sin(u * 6) * 0.15)) }
  scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: 0x111111 })))
  for (let i = 1; i < 24; i += 1) { const b = mesh(bulbGeo, new THREE.MeshBasicMaterial({ color: bulbCols[i % 4] }), pts[i].x, pts[i].y - 0.14, pts[i].z); b.userData.base = bulbCols[i % 4]; bulbs.push(b) }
}

// ---------------------------------------------------------------- obstacles + grid pathfinding (staff and customers)
const boxes = [] // {x0,z0,x1,z1}
const block = (x, z, w, d) => boxes.push({ x0: x - w / 2, z0: z - d / 2, x1: x + w / 2, z1: z + d / 2 })
const GX0 = -8, GZ0 = -14, CS = 0.5, GW = 32, GH = 62
let grid = new Uint8Array(GW * GH)
function buildGrid() {
  grid = new Uint8Array(GW * GH)
  for (let j = 0; j < GH; j++) for (let i = 0; i < GW; i++) {
    const x = GX0 + (i + 0.5) * CS, z = GZ0 + (j + 0.5) * CS
    if (x < -5.9 || x > 5.9 || z < -13.4) { grid[j * GW + i] = 1; continue }
    for (const b of boxes) if (x > b.x0 - 0.35 && x < b.x1 + 0.35 && z > b.z0 - 0.35 && z < b.z1 + 0.35) { grid[j * GW + i] = 1; break }
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
  if (from[goal] < 0 && goal !== sj * GW + si) return [{ x: tx, z: tz }] // no way: walk straight (should not happen)
  const cells = []; for (let k = goal; k >= 0; k = from[k]) cells.unshift(k)
  const pts = cells.map((k) => ({ x: GX0 + ((k % GW) + 0.5) * CS, z: GZ0 + (Math.floor(k / GW) + 0.5) * CS }))
  pts.push({ x: tx, z: tz })
  // string-pull: skip points we can see past
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
  const m = typeof c === 'number' ? mat(c) : c
  const legs = [-1, 1].map((s) => { const p = new THREE.Group(); p.position.set(s * 0.11, hip, 0); g.add(p); mesh(legGeo, m, 0, 0, 0, p); return p })
  const arms = [-1, 1].map((s) => { const p = new THREE.Group(); p.position.set(s * w, shoulder, 0); g.add(p); mesh(armGeo, m, 0, 0, 0, p); return p })
  return { legs, arms }
}
function shadow(g, r = 0.42) { const s = mesh(new THREE.CircleGeometry(r, 16), new THREE.MeshBasicMaterial({ color: 0, transparent: true, opacity: 0.35, depthWrite: false }), 0, 0.02, 0, g); s.rotation.x = -Math.PI / 2 }
// Baekho: white round head, two ears, three forehead stripes, stick body. baby = the helper (orange cub, apron).
function makeTiger(baby = false) {
  const g = new THREE.Group(), s = baby ? 0.78 : 1, ink = 0x1d1b26
  const fur = mat(baby ? 0xffa23a : 0xfaf8f2, baby ? 0x3a1a00 : 0x6a6a72) // lit from inside a little: stays white under the purple night
  const inner = new THREE.Group(); inner.scale.setScalar(s); g.add(inner)
  cyl(0.075, 0.075, 0.6, fur, 0, 0.98, 0, inner)
  if (baby) box(0.34, 0.38, 0.06, 0x3a7bd5, 0, 0.92, 0.09, inner)
  const head = sph(0.34, fur, 0, 1.52, 0, inner, 14, 10); head.scale.set(1, 0.9, 0.95)
  for (const x of [-0.22, 0.22]) { sph(0.11, fur, x, 1.8, -0.02, inner, 8, 6); sph(0.06, 0xffa0b4, x, 1.8, 0.04, inner, 6, 5) }
  for (const x of [-0.1, 0, 0.1]) { const st = box(0.04, 0.13, 0.03, ink, x, 1.73, 0.25, inner); st.rotation.x = -0.75 }
  for (const x of [-0.12, 0.12]) sph(0.045, ink, x, 1.52, 0.3, inner, 6, 5)
  sph(0.04, 0xff8fa8, 0, 1.44, 0.32, inner, 6, 5)
  if (baby) for (const x of [-0.26, 0.26]) { const st = box(0.03, 0.12, 0.08, ink, x, 1.55, 0.05, inner); st.rotation.z = x > 0 ? -0.4 : 0.4 }
  const l = limbs(inner, fur, 0.68, 1.2, 0.13)
  shadow(g, 0.4 * s)
  const stack = new THREE.Group(); stack.position.set(0, 0.95 * s, 0.42 * s); g.add(stack)
  scene.add(g)
  return { g, ...l, stack, phase: 0, s }
}
const SKIN = [0xf2c9a0, 0xd9a47a, 0xa8714f, 0xffdcc0], CLOTH = [0x4fc3f7, 0xff8a65, 0x9ccc65, 0xba68c8, 0xffd54f, 0x4db6ac, 0xf06292, 0x7986cb], HAIR = [0x2b1d16, 0x5a3825, 0x111111, 0xc9a26b, 0x8e3b2f]
function makePerson() {
  const g = new THREE.Group(), c = pick(CLOTH)
  const body = cyl(0.2, 0.26, 0.62, c, 0, 0.95, 0, g)
  sph(0.22, pick(SKIN), 0, 1.47, 0, g, 12, 8)
  const hair = sph(0.235, pick(HAIR), 0, 1.53, -0.03, g, 12, 6); hair.scale.set(1, 0.7, 1)
  for (const x of [-0.08, 0.08]) sph(0.03, 0x1d1b26, x, 1.48, 0.2, g, 5, 4)
  const l = limbs(g, 0x2e2a40, 0.66, 1.2, 0.25)
  shadow(g, 0.36)
  scene.add(g)
  return { g, ...l, phase: 0, body }
}
function animate(rig, moving, dt, carrying) {
  rig.phase += moving ? dt * 11 : 0
  const a = moving ? Math.sin(rig.phase) * 0.7 : rig.legs[0].rotation.x * 0.8
  rig.legs[0].rotation.x = a; rig.legs[1].rotation.x = -a
  if (carrying) { rig.arms[0].rotation.x = rig.arms[1].rotation.x = -1.25 }
  else { rig.arms[0].rotation.x = -a * 0.8; rig.arms[1].rotation.x = a * 0.8 }
  rig.g.position.y = moving ? Math.abs(Math.sin(rig.phase)) * 0.06 : 0
}

// ---------------------------------------------------------------- food and items
const ITEM = {
  raw0: () => { const g = new THREE.Group(); cyl(0.17, 0.13, 0.12, 0xf3ead2, 0, 0.06, 0, g, 10); cyl(0.14, 0.14, 0.02, 0xe8c27a, 0, 0.12, 0, g, 10); return g },
  food0: () => { const g = new THREE.Group(); const b = sph(0.2, 0xd8922c, 0, 0.07, 0, g, 10, 6); b.scale.set(1, 0.42, 0.62); const tl = mesh(new THREE.ConeGeometry(0.09, 0.14, 4), mat(0xc07a1e), 0.24, 0.07, 0, g); tl.rotation.z = Math.PI / 2; sph(0.025, 0x5a3010, -0.11, 0.11, 0.06, g, 5, 4); return g },
  raw1: () => { const g = new THREE.Group(); box(0.32, 0.07, 0.22, 0xf0d39a, 0, 0.04, 0, g); box(0.32, 0.05, 0.22, 0xe6c07e, 0, 0.1, 0, g); return g },
  food1: () => { const g = new THREE.Group(); const st = cyl(0.015, 0.015, 0.5, 0xc8a26b, 0, 0.06, 0, g, 5); st.rotation.z = Math.PI / 2; for (const x of [-0.1, 0.06]) { const p = box(0.13, 0.05, 0.16, 0xe8b96a, x, 0.07, 0, g); p.rotation.x = 0.25 }; return g },
}
const ITEM_H = { raw0: 0.13, food0: 0.12, raw1: 0.14, food1: 0.1 }
function setStack(group, items, max = 20) {
  const key = items.slice(0, max).join(',')
  if (group.userData.key === key) return
  group.userData.key = key
  while (group.children.length) group.remove(group.children[0])
  let y = 0
  items.slice(0, max).forEach((k, i) => { const m = ITEM[k](); m.position.y = y; m.rotation.y = (i % 2) * 0.3; group.add(m); y += ITEM_H[k] })
}
// little things flying between places
const flyers = []
function fly(kind, from, to, onLand) {
  const m = kind === 'coin' ? mesh(coinGeo, coinMat) : ITEM[kind](); if (kind !== 'coin') scene.add(m)
  m.position.copy(from); flyers.push({ m, from: from.clone(), to, t: 0, onLand })
}
const coinGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.04, 12); coinGeo.rotateX(Math.PI / 2)
const coinMat = new THREE.MeshLambertMaterial({ color: 0xffd23f, emissive: 0x6a4a00 })
function updateFlyers(dt) {
  for (let i = flyers.length - 1; i >= 0; i--) {
    const f = flyers[i]; f.t += dt / 0.28
    const to = typeof f.to === 'function' ? f.to() : f.to
    const u = Math.min(1, f.t)
    f.m.position.lerpVectors(f.from, to, u); f.m.position.y += Math.sin(u * Math.PI) * 0.9
    f.m.rotation.y += dt * 10
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
const addPad = (kind, stall, x, z, color) => { const p = { kind, stall, x, z, g: padMesh(color) }; p.g.position.set(x, 0, z); pads.push(p); return p }

// ---------------------------------------------------------------- stalls
function neon(text, color, w = 3.2) {
  const { tex } = canvasTex(512, 128, (g, W, H) => {
    g.font = '900 72px system-ui, "Malgun Gothic", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'
    g.shadowColor = color; g.shadowBlur = 24; g.fillStyle = color; g.fillText(text, W / 2, H / 2)
    g.shadowBlur = 6; g.fillStyle = '#fff'; g.fillText(text, W / 2, H / 2)
  })
  return mesh(new THREE.PlaneGeometry(w, w / 4), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }))
}
function steamSprite() {
  const { tex } = canvasTex(64, 64, (g) => { const r = g.createRadialGradient(32, 32, 0, 32, 32, 32); r.addColorStop(0, 'rgba(255,255,255,.75)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, 64, 64) })
  return tex
}
const steamTex = steamSprite()
const stalls = [
  { id: 0, food: 'fish', x: -2.7, color: 0xff6b3d, neon: '#ffb35c' },
  { id: 1, food: 'oden', x: 2.7, color: 0x3d8bff, neon: '#7fe3ff' },
]
for (const s of stalls) {
  const side = s.id ? 1 : -1
  s.root = new THREE.Group(); scene.add(s.root)
  s.crate = { x: s.x + side * 2.25, z: -11.2 }; s.grill = { x: s.x - side * 0.2, z: -11.2 }; s.disp = { x: s.x, z: -5.2 }
  // awning on posts behind the grill
  const awn = box(4.6, 0.12, 2.2, s.color, s.x + side * 1.0, 3.05, -12.2, s.root); awn.rotation.x = 0.28
  for (let i = 0; i < 7; i++) { const st = box(0.66, 0.13, 2.21, 0xfff3e0, s.x + side * 1.0 - 1.98 + i * 0.66, 3.06, -12.2, s.root); st.rotation.x = 0.28; st.visible = i % 2 === 0 }
  for (const dx of [-2.2, 2.2]) cyl(0.06, 0.06, 3, 0x6b4a2f, s.x + side * 1.0 + dx, 1.5, -11.3, s.root, 6)
  s.sign = neon(t(s.food), s.neon, 3.4); s.sign.position.set(s.x + side * 1.0, 3.55, -12.6); s.root.add(s.sign)
  // crate
  box(1.0, 0.7, 1.0, 0x9a6a3d, s.crate.x, 0.35, s.crate.z, s.root); block(s.crate.x, s.crate.z, 1.0, 1.0)
  s.crateStack = new THREE.Group(); s.crateStack.position.set(s.crate.x, 0.72, s.crate.z); s.root.add(s.crateStack); setStack(s.crateStack, Array(4).fill(`raw${s.id}`))
  // grill (fish) or pot (oden)
  box(2.0, 0.85, 1.2, 0x5c5f73, s.grill.x, 0.43, s.grill.z, s.root); block(s.grill.x, s.grill.z, 2.0, 1.2)
  if (s.id === 0) box(1.8, 0.08, 1.0, 0x1a1a1f, s.grill.x, 0.9, s.grill.z, s.root)
  else { cyl(0.75, 0.7, 0.4, 0x8b8f9c, s.grill.x, 1.05, s.grill.z, s.root, 14); cyl(0.68, 0.68, 0.02, 0xc98f3c, s.grill.x, 1.24, s.grill.z, s.root, 14) }
  s.grillShow = new THREE.Group(); s.grillShow.position.set(s.grill.x, s.id ? 1.25 : 0.95, s.grill.z); s.root.add(s.grillShow)
  s.light = new THREE.PointLight(0xffb35c, 26, 11, 1.6); s.light.position.set(s.x + side * 1.0, 2.6, -10.2); s.root.add(s.light)
  // display stand facing the alley; customers line up in front of it
  box(2.0, 0.8, 0.9, 0x8a5a33, s.disp.x, 0.4, s.disp.z, s.root); box(2.1, 0.06, 1.0, 0xf5e6c8, s.disp.x, 0.83, s.disp.z, s.root); block(s.disp.x, s.disp.z, 2.0, 0.9)
  s.dispShow = new THREE.Group(); s.dispShow.position.set(s.disp.x, 0.86, s.disp.z); s.root.add(s.dispShow)
  s.pads = {
    crate: addPad('crate', s.id, s.crate.x, s.crate.z + 1.35, 0xffffff),
    grill: addPad('grill', s.id, s.grill.x, s.grill.z + 1.4, 0xffa23a),
    disp: addPad('disp', s.id, s.disp.x - side * 1.8, s.disp.z, 0x6cff8a),
  }
  s.steam = []
  for (let i = 0; i < 10; i++) { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: steamTex, transparent: true, depthWrite: false, opacity: 0 })); sp.position.set(s.grill.x, 1, s.grill.z); sp.userData.t = i / 10; s.root.add(sp); s.steam.push(sp) }
}
// cashier in the middle of the alley; customers pay in a line below it
const CASH = { x: 0, z: 2.8 }
box(2.0, 0.95, 0.9, 0xb0413e, CASH.x, 0.48, CASH.z); box(2.1, 0.06, 1.0, 0xf5e6c8, CASH.x, 0.98, CASH.z); block(CASH.x, CASH.z, 2.0, 0.9)
box(0.5, 0.35, 0.4, 0x2e2a40, CASH.x + 0.6, 1.18, CASH.z); box(0.4, 0.05, 0.3, 0x7fe3ff, CASH.x + 0.6, 1.37, CASH.z)
const lantern = sph(0.3, new THREE.MeshBasicMaterial({ color: 0xff4d4d }), CASH.x - 0.8, 1.9, CASH.z); lantern.scale.y = 1.25
cyl(0.03, 0.03, 0.9, 0x6b4a2f, CASH.x - 0.8, 1.3, CASH.z, scene, 4)
const cashLight = new THREE.PointLight(0xff7a7a, 14, 8, 1.6); cashLight.position.set(CASH.x - 0.8, 2.2, CASH.z + 0.4); scene.add(cashLight)
const cashPad = addPad('cash', -1, CASH.x, CASH.z - 1.45, 0xffd23f)
const cashSign = neon('₩', '#ffd23f', 1.4); cashSign.position.set(CASH.x, 2.0, CASH.z - 0.3)
buildGrid()

// money spots: open the eomuk stall, hire a helper
function buyPad(kind, x, z, cost, label) {
  const p = { kind: 'buy', what: kind, x, z, cost, left: cost, done: false }
  const c = canvasTex(256, 256, () => {}); p.cv = c; p.label = label
  p.g = mesh(new THREE.PlaneGeometry(1.7, 1.7), new THREE.MeshBasicMaterial({ map: c.tex, transparent: true, depthWrite: false }), x, 0.03, z); p.g.rotation.x = -Math.PI / 2
  drawBuy(p); pads.push(p); return p
}
function drawBuy(p) {
  const g = p.cv.g; g.clearRect(0, 0, 256, 256)
  g.fillStyle = 'rgba(20,14,40,.75)'; g.beginPath(); g.roundRect(8, 8, 240, 240, 34); g.fill()
  const u = 1 - p.left / p.cost
  g.fillStyle = 'rgba(255,210,63,.55)'; g.fillRect(8, 248 - 240 * u, 240, 240 * u)
  g.lineWidth = 10; g.strokeStyle = '#ffd23f'; g.setLineDash([26, 14]); g.beginPath(); g.roundRect(8, 8, 240, 240, 34); g.stroke(); g.setLineDash([])
  g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle'
  g.font = '800 34px system-ui, "Malgun Gothic", sans-serif'; g.fillText(p.label, 128, 80)
  g.font = '900 62px system-ui, sans-serif'; g.fillStyle = '#ffd23f'; g.fillText('₩' + p.left, 128, 168)
  p.cv.tex.needsUpdate = true
}
const buyOden = buyPad('oden', 4.4, 1.2, COST_ODEN, `${t('oden')} ${t('open')}`)
const buyHelper = buyPad('helper', -4.4, 1.2, COST_HELPER, t('helper'))

// ---------------------------------------------------------------- game state
const game = { phase: 'title', time: 0, money: 0, earned: 0, served: 0, lost: 0, rush: false, spawnT: 1.5, rushShown: false }
const player = { x: 0, z: -1.5, face: Math.PI, items: [], cap: 5, speed: 5.4, rig: makeTiger(false), xferT: 0, auto: Q.has('auto') }
let helper = null
const customers = []
const queues = [[], []], cashQ = []
const EXIT = { x: 1.5, z: 16.5 }, ENTER = [{ x: -4.4, z: 16.5 }, { x: 4.4, z: 16.5 }] // in at the sides, out right of the pay line
const qSlot = (s, i) => ({ x: stalls[s].disp.x, z: stalls[s].disp.z + 1.25 + i * 0.85 })
const cSlot = (i) => ({ x: CASH.x, z: CASH.z + 1.2 + i * 0.85 })

function resetStalls() {
  for (const s of stalls) { s.open = s.id === 0; s.raw = 0; s.food = 0; s.cookT = 0; s.shown = 0; s.root.visible = true; setOpenLook(s) }
}
function setOpenLook(s) {
  s.sign.material.opacity = s.open ? 1 : 0.18; s.light.intensity = s.open ? 26 : 0
  for (const k in s.pads) s.pads[k].g.visible = s.open
  s.crateStack.visible = s.open
}

// ---------------------------------------------------------------- walkers (customers, helper)
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

function bubbleTex(icon, ring) {
  return canvasTex(128, 128, (g) => {
    g.fillStyle = '#fff'; g.beginPath(); g.arc(64, 58, 50, 0, Math.PI * 2); g.fill(); g.beginPath(); g.moveTo(52, 100); g.lineTo(64, 124); g.lineTo(76, 100); g.fill()
    if (ring) { g.lineWidth = 8; g.strokeStyle = ring; g.beginPath(); g.arc(64, 58, 46, 0, Math.PI * 2); g.stroke() }
    g.font = '58px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(icon, 64, 62)
  }).tex
}
const BUB = { want0: bubbleTex('🐟'), want1: bubbleTex('🍢'), angry: bubbleTex('💢'), happy: bubbleTex('❤️'), pay: bubbleTex('💰'), sleep: bubbleTex('💤') }
function setBubble(w, key) {
  if (!w.bubble) { w.bubble = new THREE.Sprite(new THREE.SpriteMaterial({ map: BUB[key], depthTest: false })); w.bubble.scale.set(0.75, 0.75, 1); w.bubble.renderOrder = 5; scene.add(w.bubble) }
  w.bubble.visible = !!key; if (key) w.bubble.material.map = BUB[key]; w.bubbleKey = key
}
// patience ring under the customer
const ringGeo = new THREE.RingGeometry(0.42, 0.5, 24)

function spawnCustomer() {
  const open = stalls.filter((s) => s.open && queues[s.id].length < 6)
  if (!open.length) return
  open.sort((a, b) => queues[a.id].length - queues[b.id].length)
  const s = Math.random() < 0.7 ? open[0] : pick(open)
  const c = { rig: makePerson(), x: ENTER[s.id].x + rnd(-0.5, 0.5), z: ENTER[s.id].z, face: Math.PI, speed: rnd(2.4, 3.0), want: s.id, n: game.rush ? pick([2, 3]) : pick([1, 1, 2]), got: 0, state: 'toQueue', patience: PATIENCE, takeT: 0, payT: 0 }
  c.ring = mesh(ringGeo, new THREE.MeshBasicMaterial({ color: 0x6cff8a, transparent: true, opacity: 0.9 })); c.ring.rotation.x = -Math.PI / 2
  queues[s.id].push(c); customers.push(c)
  const sl = qSlot(s.id, queues[s.id].length - 1); walkTo(c, sl.x, sl.z)
  setBubble(c, 'want' + s.id)
}
function reslot(q, slotOf) { q.forEach((c, i) => { const sl = slotOf(i); if (Math.hypot(c.tx - sl.x, c.tz - sl.z) > 0.01) walkTo(c, sl.x, sl.z, c.inLine) }) }
function leave(c, mood) {
  c.state = 'leave'; setBubble(c, mood); c.ring.visible = false; c.leaveT = 0
  c.path = [...findPath(c.x, c.z, EXIT.x + rnd(-0.3, 0.3), Math.max(c.z, 5)), ...findPath(EXIT.x, Math.max(c.z, 5), EXIT.x + rnd(-0.3, 0.3), EXIT.z)]; c.tx = EXIT.x; c.tz = EXIT.z
}
function updateCustomers(dt) {
  for (let i = customers.length - 1; i >= 0; i--) {
    const c = customers[i]
    const arrived = stepWalker(c, dt)
    if (c.bubble) c.bubble.position.set(c.x, 2.25 + Math.sin(game.time * 4 + i) * 0.04, c.z)
    c.ring.position.set(c.x, 0.03, c.z)
    if (c.state === 'toQueue' || c.state === 'queue') {
      const q = queues[c.want], idx = q.indexOf(c)
      if (arrived) { c.state = 'queue'; c.inLine = true }
      c.patience -= dt * (game.rush ? 0.8 : 1)
      if (idx === 0 && arrived) {
        const s = stalls[c.want]
        if (s.shown > 0) {
          c.takeT += dt
          if (c.takeT > 0.32 && s.shown > 0) {
            c.takeT = 0; s.shown--; c.got++; c.patience = Math.max(c.patience, 8)
            const from = s.dispShow.children[s.dispShow.children.length - 1]?.getWorldPosition(new THREE.Vector3()) || new THREE.Vector3(s.disp.x, 1, s.disp.z)
            fly(`food${c.want}`, from, new THREE.Vector3(c.x, 1.3, c.z)); sfx('pop')
            if (c.got >= c.n) { q.shift(); reslot(q, (k) => qSlot(c.want, k)); c.state = 'toCash'; c.inLine = false; cashQ.push(c); const sl = cSlot(cashQ.length - 1); walkTo(c, sl.x, sl.z); setBubble(c, 'pay'); c.patience = PATIENCE + 10 }
          }
        }
      }
      if (c.patience <= 0 && c.state !== 'toCash') { q.splice(q.indexOf(c), 1); reslot(q, (k) => qSlot(c.want, k)); game.lost++; leave(c, 'angry'); sfx('angry') }
    } else if (c.state === 'toCash' || c.state === 'cash') {
      const idx = cashQ.indexOf(c)
      if (arrived) { c.state = 'cash'; c.inLine = true }
      c.patience -= dt * 0.7
      const manned = atPad(player, cashPad)
      if (idx === 0 && arrived && manned) {
        c.payT += dt
        if (c.payT > 0.45) {
          const pay = c.n * PRICE[c.want]
          cashQ.shift(); reslot(cashQ, cSlot)
          for (let k = 0; k < Math.min(pay, 6); k++) setTimeout(() => fly('coin', new THREE.Vector3(c.x, 1.4, c.z), () => new THREE.Vector3(player.x, 1.6, player.z)), k * 50)
          game.money += pay; game.earned += pay; game.served++; sfx('coin'); leave(c, 'happy')
        }
      }
      if (c.patience <= 0) { cashQ.splice(cashQ.indexOf(c), 1); reslot(cashQ, cSlot); game.lost++; leave(c, 'angry'); sfx('angry') }
    } else if (c.state === 'leave') {
      c.leaveT += dt; if (c.leaveT > 1.6 && c.bubble) c.bubble.visible = false
      if (arrived) { scene.remove(c.rig.g); scene.remove(c.ring); if (c.bubble) scene.remove(c.bubble); customers.splice(i, 1); continue }
    }
    if (c.state !== 'leave') {
      const p = clamp(c.patience / PATIENCE, 0, 1)
      c.ring.material.color.setHex(p > 0.5 ? 0x6cff8a : p > 0.25 ? 0xffd23f : 0xff4d4d)
      c.ring.scale.setScalar(0.6 + 0.4 * p)
    }
  }
}

// ---------------------------------------------------------------- working at spots (player and helper use the same rules)
const atPad = (w, p) => Math.hypot(w.x - p.x, w.z - p.z) < (p.kind === 'buy' ? 0.95 : 0.85)
function work(w, p, worldFrom) {
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

function hireHelper() {
  const rig = makeTiger(true)
  helper = { rig, x: buyHelper.x, z: buyHelper.z, face: Math.PI, items: [], cap: 3, speed: 3.6, stall: 0, path: [], goal: null, workT: 0, idleT: 0 }
}
function helperThink() {
  const h = helper, s = stalls[h.stall], top = h.items[h.items.length - 1]
  let goal = null
  if (top?.startsWith('food')) goal = s.shown < MAX_DISP ? s.pads.disp : null
  else if (top?.startsWith('raw')) goal = s.pads.grill
  else if (s.food > 0 && s.shown < MAX_DISP - 1) goal = s.pads.grill
  else if (s.raw + s.food < 6) goal = s.pads.crate
  if (goal !== h.goal) { h.goal = goal; if (goal) walkTo(h, goal.x + rnd(-0.15, 0.15), goal.z + rnd(-0.15, 0.15)); else { const rest = { x: s.grill.x + (s.id ? -1.8 : 1.8), z: s.grill.z + 2.4 }; walkTo(h, rest.x, rest.z) } }
}
function updateHelper(dt) {
  const h = helper; if (!h) return
  const arrived = stepWalker(h, dt)
  setStack(h.rig.stack, h.items)
  h.thinkT = (h.thinkT || 0) - dt
  if (arrived && h.goal && atPad(h, h.goal)) {
    h.workT += dt
    if (h.workT > 0.22) {
      h.workT = 0
      const did = work(h, h.goal)
      if (did) { sfx(did, 0.4) } else { h.goal = null; helperThink() }
    }
    h.idleT = 0
  } else if (arrived && !h.goal) { h.idleT += dt; if (h.thinkT <= 0) { h.thinkT = 0.4; helperThink() } } else if (arrived && h.goal) helperThink()
  setBubble(h, h.idleT > 5 ? 'sleep' : null)
  if (h.bubble) h.bubble.position.set(h.x, 1.9, h.z)
}

// ---------------------------------------------------------------- player
const input = { x: 0, z: 0, id: null, ox: 0, oy: 0, keys: new Set() }
function movePlayer(dt) {
  let ix = input.x, iz = input.z
  const k = input.keys
  if (k.has('KeyA') || k.has('ArrowLeft')) ix -= 1; if (k.has('KeyD') || k.has('ArrowRight')) ix += 1
  if (k.has('KeyW') || k.has('ArrowUp')) iz -= 1; if (k.has('KeyS') || k.has('ArrowDown')) iz += 1
  if (player.auto && !ix && !iz) { const g = guideTarget(); if (g && !atPad(player, g)) { if (!player.path?.length || player.goal !== g) { player.goal = g; player.path = findPath(player.x, player.z, g.x, g.z) } const p = player.path[0]; if (p) { const dx = p.x - player.x, dz = p.z - player.z, d = Math.hypot(dx, dz); if (d < 0.15) player.path.shift(); else { ix = dx / d; iz = dz / d } } } }
  const len = Math.hypot(ix, iz)
  if (len > 1) { ix /= len; iz /= len }
  const moving = len > 0.08
  if (moving) {
    player.x += ix * player.speed * dt; player.z += iz * player.speed * dt
    const want = Math.atan2(ix, iz); player.face += Math.atan2(Math.sin(want - player.face), Math.cos(want - player.face)) * Math.min(1, dt * 14)
  }
  // slide around stands and stay in the alley
  const r = 0.36
  for (const b of boxes) {
    const cx = clamp(player.x, b.x0, b.x1), cz = clamp(player.z, b.z0, b.z1), dx = player.x - cx, dz = player.z - cz, d = Math.hypot(dx, dz)
    if (d < r) { if (d > 1e-4) { player.x = cx + dx / d * r; player.z = cz + dz / d * r } else player.z = b.z1 + r }
  }
  player.x = clamp(player.x, -5.8, 5.8); player.z = clamp(player.z, -13.1, 14.5)
  const rig = player.rig; rig.g.position.x = player.x; rig.g.position.z = player.z; rig.g.rotation.y = player.face
  animate(rig, moving, dt, player.items.length > 0)
  // work at the spot under the feet
  player.xferT += dt
  if (player.xferT > 0.1) {
    player.xferT = 0
    for (const p of pads) {
      if (!p.g.visible || !atPad(player, p)) continue
      if (p.kind === 'buy') { if (!p.done && game.money > 0) { const pay = Math.min(game.money, p.left, Math.max(1, Math.ceil(p.cost / 12))); game.money -= pay; p.left -= pay; drawBuy(p); sfx('coin', 0.25); if (p.left <= 0) unlock(p) } continue }
      const did = work(player, p); if (did) sfx(did, 0.5)
    }
  }
  setStack(rig.stack, player.items)
}
function unlock(p) {
  p.done = true; p.g.visible = false; sfx('unlock')
  if (p.what === 'oden') { stalls[1].open = true; setOpenLook(stalls[1]); bannerShow(`${t('oden')}!`, 1.6) }
  else { hireHelper(); bannerShow(t('helper') + '!', 1.6) }
}

// the arrow shows the next useful spot
const arrow = mesh(new THREE.ConeGeometry(0.3, 0.6, 4), new THREE.MeshBasicMaterial({ color: 0xffd23f })); arrow.rotation.x = Math.PI
function guideTarget() {
  const top = player.items[player.items.length - 1]
  if (top?.startsWith('raw')) return stalls[+top[3]].pads.grill
  if (top?.startsWith('food')) return stalls[+top[4]].pads.disp
  if (cashQ.length && cashQ[0].state === 'cash') return cashPad
  for (const b of [buyOden, buyHelper]) if (!b.done && game.money >= b.left) return b
  const need = stalls.filter((s) => s.open).sort((a, b) => (a.shown - queues[a.id].length) - (b.shown - queues[b.id].length))
  for (const s of need) {
    if (s.shown >= MAX_DISP - 2) continue
    if (helper && s.id === helper.stall && helper.goal) continue
    if (s.food > 0) return s.pads.grill
    if (s.raw < 3) return s.pads.crate
  }
  return null
}

// ---------------------------------------------------------------- stalls cook, displays show
function updateStalls(dt) {
  for (const s of stalls) {
    if (!s.open) continue
    if (s.raw > 0) { s.cookT += dt; if (s.cookT >= COOK[s.id]) { s.cookT = 0; s.raw--; s.food++ } }
    const onGrill = [...Array(s.food).fill(`food${s.id}`)]
    if (s.grillShow.userData.n !== s.food + s.raw * 100) {
      s.grillShow.userData.n = s.food + s.raw * 100
      while (s.grillShow.children.length) s.grillShow.remove(s.grillShow.children[0])
      const all = [...Array(s.raw).fill(`raw${s.id}`), ...onGrill]
      all.slice(0, 10).forEach((k, i) => { const m = ITEM[k](); m.position.set(-0.72 + (i % 5) * 0.36, 0, -0.25 + Math.floor(i / 5) * 0.45); if (s.id && k === 'food1') { m.rotation.z = Math.PI / 2; m.position.y = 0.1 } s.grillShow.add(m) })
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

// ---------------------------------------------------------------- sound (small synth, no files)
let actx = null
function sfx(kind, vol = 0.6) {
  if (!actx || Q.has('mute')) return
  const now = actx.currentTime, o = actx.createOscillator(), g = actx.createGain()
  const P = { pop: [520, 880, 0.08, 'triangle'], drop: [700, 420, 0.08, 'triangle'], coin: [1250, 1900, 0.12, 'square'], angry: [220, 140, 0.25, 'sawtooth'], unlock: [440, 1320, 0.4, 'triangle'], rush: [330, 660, 0.5, 'sawtooth'], end: [660, 220, 0.6, 'triangle'] }[kind]
  o.type = P[3]; o.frequency.setValueAtTime(P[0], now); o.frequency.exponentialRampToValueAtTime(P[1], now + P[2])
  g.gain.setValueAtTime(vol * (P[3] === 'square' || P[3] === 'sawtooth' ? 0.08 : 0.2), now); g.gain.exponentialRampToValueAtTime(0.001, now + P[2] + 0.05)
  o.connect(g).connect(actx.destination); o.start(now); o.stop(now + P[2] + 0.08)
}
function unlockAudio() { if (!actx) { try { actx = new (window.AudioContext || window.webkitAudioContext)() } catch {} } actx?.resume?.() }

// ---------------------------------------------------------------- screens
let bannerT = 0
function bannerShow(text, secs) { $('banner').textContent = text; $('banner').classList.add('on'); bannerT = secs }
function startGame() {
  unlockAudio()
  for (const c of customers) { scene.remove(c.rig.g); scene.remove(c.ring); if (c.bubble) scene.remove(c.bubble) }
  customers.length = 0; queues[0].length = queues[1].length = 0; cashQ.length = 0
  if (helper) { scene.remove(helper.rig.g); if (helper.bubble) scene.remove(helper.bubble); helper = null }
  for (const b of [buyOden, buyHelper]) { b.left = b.cost; b.done = false; b.g.visible = true; drawBuy(b) }
  resetStalls()
  Object.assign(game, { phase: 'play', time: 0, money: 0, earned: 0, served: 0, lost: 0, rush: false, spawnT: 1.2, rushShown: false })
  Object.assign(player, { x: 0, z: -1.5, items: [], face: Math.PI })
  $('title').classList.add('hide'); $('end').classList.add('hide'); $('hud').classList.remove('hide')
  $('hint').textContent = t('hint'); $('hint').classList.add('on'); setTimeout(() => $('hint').classList.remove('on'), 4500)
}
function endGame() {
  game.phase = 'end'; sfx('end')
  $('endTitle').textContent = t('close'); $('earnedLbl').textContent = t('earned'); $('servedLbl').textContent = t('served'); $('lostLbl').textContent = t('lost')
  $('earnedTxt').textContent = '₩' + game.earned; $('servedTxt').textContent = game.served; $('lostTxt').textContent = game.lost
  $('againBtn').textContent = t('again'); $('end').classList.remove('hide'); $('hud').classList.add('hide')
  input.x = input.z = 0; $('stick').classList.add('hide')
}
$('titleTxt').textContent = t('title'); $('subTxt').textContent = t('sub'); $('startBtn').textContent = t('start'); document.title = t('title')
$('startBtn').addEventListener('click', startGame)
$('againBtn').addEventListener('click', startGame)

// ---------------------------------------------------------------- input: drag anywhere = stick
canvas.addEventListener('pointerdown', (e) => {
  unlockAudio(); if (game.phase !== 'play') return
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
addEventListener('keydown', (e) => { input.keys.add(e.code); if (e.code === 'Enter' && game.phase !== 'play') startGame() })
addEventListener('keyup', (e) => input.keys.delete(e.code))
addEventListener('blur', () => input.keys.clear())

// ---------------------------------------------------------------- camera: whole alley width on a phone held upright
const camAt = new THREE.Vector3(0, 0, -3)
function resize() {
  const w = innerWidth, h = innerHeight
  renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix()
}
addEventListener('resize', resize); resize()
function updateCamera(dt, snap) {
  const aspect = camera.aspect, tan = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))
  const wide = aspect >= 1
  const d = wide ? 15.5 : Math.max(15, 7.6 / (2 * tan * aspect)) // portrait: about 7.6 m across, the camera follows sideways
  const tx = game.phase === 'play' && !wide ? clamp(player.x * 0.7, -2.2, 2.2) : 0
  const tz = game.phase === 'play' ? (wide ? clamp(player.z - 2, -8, 4) : clamp(player.z - 1.2, -9, 7)) : -4
  const k = snap ? 1 : 1 - Math.exp(-dt * 4)
  camAt.x += (tx - camAt.x) * k; camAt.z += (tz - camAt.z) * k
  camera.position.set(camAt.x, d * (wide ? 0.7 : 0.84), camAt.z + d * (wide ? 0.72 : 0.54)) // wide screens: lower, so the stalls and the till both fit
  camera.lookAt(camAt.x, 0, camAt.z - 0.5)
}

// ---------------------------------------------------------------- loop
let last = performance.now()
function frame(now) {
  requestAnimationFrame(frame)
  const real = Math.min(0.05, (now - last) / 1000); last = now
  for (let n = 0; n < SPEED; n++) step(real, now)
  updateCamera(real)
  renderer.render(scene, camera)
}
function step(dt, now) {
  if (game.phase === 'play') {
    game.time += dt
    const left = Math.max(0, DUR - game.time)
    if (!game.rushShown && game.time > RUSH_AT - 3) { game.rushShown = true; bannerShow(t('rushSoon'), 2.4) }
    const rushNow = game.time >= RUSH_AT && game.time < RUSH_AT + RUSH_LEN
    if (rushNow && !game.rush) { bannerShow(t('rush'), 2.2); sfx('rush') }
    game.rush = rushNow
    game.spawnT -= dt
    if (game.spawnT <= 0 && left > 6) { spawnCustomer(); game.spawnT = game.rush ? SPAWN_RUSH : SPAWN * rnd(0.7, 1.3) }
    movePlayer(dt); updateHelper(dt); updateCustomers(dt); updateStalls(dt)
    $('moneyTxt').textContent = game.money
    $('timer').textContent = `${Math.floor(left / 60)}:${String(Math.floor(left % 60)).padStart(2, '0')}`
    $('timer').classList.toggle('hurry', left < 15)
    if (left <= 0) endGame()
  } else { updateCustomers(dt); updateHelper(dt); updateStalls(dt); animate(player.rig, false, dt, player.items.length > 0) }
  updateFlyers(dt)
  if (bannerT > 0) { bannerT -= dt; if (bannerT <= 0) $('banner').classList.remove('on') }
  // rush: the lights go pink and blink
  const r = game.rush ? 1 : 0
  hemi.color.setHex(r ? 0xff7ab8 : 0x8a96ff)
  scene.background.copy(SKY).lerp(new THREE.Color(0x3a1440), r * 0.8)
  bulbs.forEach((b, i) => b.material.color.setHex(r && Math.floor(game.time * 6 + i) % 2 ? 0xffffff : b.userData.base))
  lantern.scale.setScalar(1 + Math.sin(game.time * 3) * 0.04); lantern.scale.y *= 1.25
  const g = game.phase === 'play' ? guideTarget() : null
  arrow.visible = !!g && !atPad(player, g)
  if (g) arrow.position.set(g.x, 1.4 + Math.sin(now / 160) * 0.18, g.z)
  for (const p of pads) if (p.kind !== 'buy') p.g.scale.setScalar(p === g ? 1 + Math.sin(now / 120) * 0.08 : 1)
}
resetStalls(); updateCamera(0, true)
requestAnimationFrame(frame)

if (Q.has('debug')) window.__gt = { game, player, stalls, queues, cashQ, customers, get helper() { return helper }, startGame, spawnCustomer, hireHelper, unlock, buyOden, buyHelper, findPath, camera }
