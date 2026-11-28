// Bonk Golf: the rules of the ground and the ball. No drawing here, so the same code plays the shot and previews it.
export const G = 22, R = 0.3, WATER_Y = -0.45, CUP_R = 0.72, CUP_V = 11, WINDK = 0.55
// carry = flat distance in the air at full power (units = metres on screen). loft in degrees.
export const CLUBS = {
  driver: { carry: 105, loft: 28 }, wood: { carry: 85, loft: 32 }, iron: { carry: 64, loft: 40 },
  wedge: { carry: 40, loft: 52 }, chip: { carry: 15, loft: 36 }, putter: { roll: 32 },
}
export const ORDER = ['chip', 'wedge', 'iron', 'wood', 'driver']
// bounce: how much speed comes back up (e) / stays along the ground (f). mu: rolling brake (units/s²). lie: power kept when hitting from it.
export const SURF = {
  fairway: { e: 0.35, f: 0.55, mu: 7, lie: 1 }, green: { e: 0.28, f: 0.5, mu: 3.6, lie: 1 }, rough: { e: 0.24, f: 0.45, mu: 18, lie: 0.85 },
  bunker: { e: 0.06, f: 0.2, mu: 36, lie: 0.65 }, water: { e: 0, f: 0, mu: 50, lie: 1 },
  ice: { e: 0.3, f: 0.8, mu: 1.8, lie: 1 }, // back nine: a frozen patch, the ball slides on
}
const smooth = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t) }
export const ellD = (x, z, s) => {
  let dx = x - s[0], dz = z - s[1]
  if (s[4]) { const c = Math.cos(-s[4]), n = Math.sin(-s[4]), t = dx * c - dz * n; dz = dx * n + dz * c; dx = t }
  return Math.hypot(dx / s[2], dz / s[3])
}
const segD = (x, z, a, b) => {
  const vx = b[0] - a[0], vz = b[1] - a[1], l = vx * vx + vz * vz, t = l ? Math.max(0, Math.min(1, ((x - a[0]) * vx + (z - a[1]) * vz) / l)) : 0
  return Math.hypot(x - a[0] - vx * t, z - a[1] - vz * t)
}

// Everything the ball needs to know about one hole.
export function makeCourse(H) {
  const water = H.water || [], land = H.land || [], bunker = H.bunker || [], ice = H.ice || [], hills = H.hills || [], fair = H.fair || []
  const pin = H.pin, green = [pin[0], pin[1], ...H.green], slope = H.slope || [0, 0], dome = H.dome || 0, sea = H.base === 'water'
  const hillAt = (x, z) => { let y = 0; for (const h of hills) { const d2 = (x - h[0]) ** 2 + (z - h[1]) ** 2; y += h[3] * Math.exp(-d2 / (h[2] * h[2])) } return y }
  const greenY = hillAt(pin[0], pin[1])
  const landness = (x, z) => {
    if (sea) { let L = 0; for (const s of land) L = Math.max(L, smooth(1.2, 0.95, ellD(x, z, s))); return L }
    let L = 1; for (const s of water) L = Math.min(L, smooth(0.85, 1.1, ellD(x, z, s))); return L
  }
  const h = (x, z) => {
    let y = hillAt(x, z)
    const g = ellD(x, z, green)
    if (g < 1.7) y += (greenY + slope[0] * (x - pin[0]) + slope[1] * (z - pin[1]) + dome * (1 - Math.min(1, g * g)) - y) * smooth(1.7, 1.05, g) // dome > 0: crowned green, < 0: a bowl
    for (const s of bunker) { const d = ellD(x, z, s); if (d < 1) y -= 0.45 * smooth(1, 0.45, d) }
    const t = Math.hypot(x, z); if (t < 9) y *= smooth(3, 9, t) // the tee is flat
    const L = landness(x, z)
    return L >= 1 ? y : -1.9 + (y + 1.9) * L
  }
  const fairD = (x, z) => { let d = 9; for (const f of fair) for (let i = 0; i < f.pts.length - 1; i++) d = Math.min(d, segD(x, z, f.pts[i], f.pts[i + 1]) / (f.w / 2)); return d }
  // water is only where a pond, creek or the sea is: a bunker's dip can go below the water line on low ground and is still sand
  const wet = (x, z) => landness(x, z) < 1 && h(x, z) < WATER_Y
  const surf = (x, z) => {
    if (wet(x, z)) return 'water'
    if (ellD(x, z, green) < 1) return 'green'
    for (const s of bunker) if (ellD(x, z, s) < 1) return 'bunker'
    for (const s of ice) if (ellD(x, z, s) < 1) return 'ice'
    if (fairD(x, z) < 1 || (Math.abs(x) < 4 && Math.abs(z) < 3.2)) return 'fairway'
    return 'rough'
  }
  // power kept when hitting from a lie: the back nine's long grass holds more (H.rough)
  const lie = (name) => name === 'rough' && H.rough ? H.rough : SURF[name]?.lie ?? 1
  const B = H.bounds, out = (x, z) => x < B[0] || x > B[1] || z < B[2] || z > B[3]
  // places worth aiming at when the pin is too far: along the fairways and the middle of each island
  const spots = []
  for (const f of fair) for (let i = 0; i < f.pts.length - 1; i++) for (let k = 0; k <= 20; k++) spots.push([f.pts[i][0] + (f.pts[i + 1][0] - f.pts[i][0]) * k / 20, f.pts[i][1] + (f.pts[i + 1][1] - f.pts[i][1]) * k / 20])
  for (const s of land) spots.push([s[0], s[1]])
  return { H, h, surf, wet, lie, out, pin, green, greenY, landness, fairD, spots, sea, trees: [], time: 0, wx: H.wind[0], wz: H.wind[1],
    pads: H.pads || [], boosts: H.boosts || [], movers: H.movers || [] }
}
export const moverX = (m, t) => m[0] + m[2] * Math.sin((t / m[3]) * Math.PI * 2 + (m[5] || 0))
export const MOVER_H = 3.4

// One step of the ball. b = { x,y,z, vx,vy,vz, mode: 'air' | 'roll' | 'rest' | 'water' | 'holed' | 'ob', t }.
// ev(name, a, b) tells the game what happened (sounds, bursts); a preview passes real = false: no wind, no moving gates.
export function stepBall(b, dt, C, ev, real) {
  b.t += dt
  if (b.mode === 'air') {
    if (b.t > 30) { b.vx = b.vy = b.vz = 0; b.y = C.h(b.x, b.z) + R; b.mode = C.wet(b.x, b.z) ? 'water' : C.out(b.x, b.z) ? 'ob' : 'rest'; return } // nothing flies for 30 s: never wait forever
    b.vy -= G * dt
    if (real) { b.vx += C.wx * WINDK * dt; b.vz += C.wz * WINDK * dt }
    b.x += b.vx * dt; b.y += b.vy * dt; b.z += b.vz * dt
    for (const t of C.trees) { // t = { x, z, by (ground), r (trunk), th (trunk height), cy, cr (crown) }
      const dx = b.x - t.x, dz = b.z - t.z, d = Math.hypot(dx, dz)
      if (d < t.r + R && b.y < t.by + t.th) {
        const nx = dx / (d || 1), nz = dz / (d || 1), vn = b.vx * nx + b.vz * nz
        if (vn < 0) { b.vx = (b.vx - 2 * vn * nx) * 0.45; b.vz = (b.vz - 2 * vn * nz) * 0.45; b.x = t.x + nx * (t.r + R); b.z = t.z + nz * (t.r + R); ev && ev('wood', Math.abs(vn)) }
      } else if (t.cr && b.hitTree !== t && d < t.cr && Math.abs(b.y - t.by - t.cy) < t.cr) { b.hitTree = t; b.vx *= 0.3; b.vz *= 0.3; b.vy = Math.min(b.vy * 0.3, 0); ev && ev('leaves') }
    }
    if (real) for (const m of C.movers) {
      const cx = moverX(m, C.time), gy = C.h(cx, m[1])
      if (Math.abs(b.z - m[1]) < 0.7 + R && Math.abs(b.x - cx) < m[4] + R && b.y < gy + MOVER_H) {
        const side = b.vz < 0 ? 1 : -1; b.z = m[1] + side * (0.7 + R + 0.02); b.vz = -b.vz * 0.45; b.vx *= 0.7; ev('clank', Math.abs(b.vz))
      }
    }
    const gh = C.h(b.x, b.z)
    if (C.wet(b.x, b.z)) { if (b.y - R <= WATER_Y) { b.y = WATER_Y; b.mode = 'water'; ev && ev('water') } return }
    if (b.y - R > gh) return
    b.y = gh + R
    const e = 0.4, gx = (C.h(b.x + e, b.z) - C.h(b.x - e, b.z)) / (2 * e), gz = (C.h(b.x, b.z + e) - C.h(b.x, b.z - e)) / (2 * e), nl = Math.hypot(gx, 1, gz)
    const nx = -gx / nl, ny = 1 / nl, nz = -gz / nl, vn = b.vx * nx + b.vy * ny + b.vz * nz
    if (vn >= 0) return
    if (C.out(b.x, b.z)) { b.mode = 'ob'; ev && ev('ob'); return }
    if (special(b, C, ev)) return
    const s = C.surf(b.x, b.z), S = SURF[s]
    if (Math.hypot(b.x - C.pin[0], b.z - C.pin[1]) < CUP_R * 0.9 && -vn < 34) { b.mode = 'holed'; b.dunk = true; ev && ev('holed'); return }
    let tx = b.vx - vn * nx, ty = b.vy - vn * ny, tz = b.vz - vn * nz
    tx *= S.f; ty *= S.f; tz *= S.f
    const up = -vn * S.e
    b.vx = tx + nx * up; b.vy = ty + ny * up; b.vz = tz + nz * up
    b.bounces = (b.bounces || 0) + 1
    ev && ev('bounce', s, -vn)
    if (up < 2.4) { b.mode = 'roll'; b.vy = 0 }
    return
  }
  if (b.mode !== 'roll') return
  const e = 0.4, gx = (C.h(b.x + e, b.z) - C.h(b.x - e, b.z)) / (2 * e), gz = (C.h(b.x, b.z + e) - C.h(b.x, b.z - e)) / (2 * e)
  const s = C.surf(b.x, b.z), mu = SURF[s].mu, slopeA = G * Math.hypot(gx, gz)
  let sp = Math.hypot(b.vx, b.vz)
  if ((sp < 0.35 && slopeA < mu) || b.t > 30) { b.vx = b.vz = 0; b.mode = 'rest'; return }
  if (sp > 1e-4) { const k = Math.max(0, sp - mu * dt) / sp; b.vx *= k; b.vz *= k }
  b.vx -= G * gx * dt; b.vz -= G * gz * dt
  b.x += b.vx * dt; b.z += b.vz * dt
  const gh = C.h(b.x, b.z); b.y = gh + R
  b.rolled = (b.rolled || 0) + sp * dt
  if (C.wet(b.x, b.z)) { b.y = WATER_Y; b.mode = 'water'; ev && ev('water'); return }
  if (C.out(b.x, b.z)) { b.mode = 'ob'; ev && ev('ob'); return }
  if (special(b, C, ev)) return
  sp = Math.hypot(b.vx, b.vz)
  const dp = Math.hypot(b.x - C.pin[0], b.z - C.pin[1])
  if (dp < CUP_R) {
    if (sp < CUP_V) { b.mode = 'holed'; ev && ev('holed'); return }
    if (!b.lip) { b.lip = true; ev && ev('lip') }
  }
  if (real) for (const m of C.movers) {
    const cx = moverX(m, C.time)
    if (Math.abs(b.z - m[1]) < 0.7 + R && Math.abs(b.x - cx) < m[4] + R) {
      const side = b.vz < 0 ? 1 : -1; b.z = m[1] + side * (0.7 + R + 0.02); b.vz = -b.vz * 0.5
      b.vx = b.vx * 0.7 + 3 * Math.cos((C.time / m[3]) * Math.PI * 2 + (m[5] || 0)); ev('clank', sp)
    }
  }
}
// trampolines and speed arrows
function special(b, C, ev) {
  for (const p of C.pads) if (Math.hypot(b.x - p[0], b.z - p[1]) < p[2]) {
    const sp = Math.hypot(b.vx, b.vz) || 1, want = Math.max(sp, 17), dx = sp > 1 ? b.vx / sp : 0, dz = sp > 1 ? b.vz / sp : -1
    b.vx = dx * want; b.vz = dz * want; b.vy = 17; b.mode = 'air'; b.y += 0.05; ev && ev('pad', p); return true
  }
  for (const p of C.boosts) if (Math.hypot(b.x - p[0], b.z - p[1]) < p[2] && b.boosted !== p) {
    const l = Math.hypot(p[3], p[4]), sp = Math.max(Math.hypot(b.vx, b.vz), 27)
    b.vx = p[3] / l * sp; b.vz = p[4] / l * sp; b.vy = 3.5; b.mode = 'air'; b.y += 0.05; b.boosted = p; ev && ev('boost', p); return true
  }
  return false
}
// launch speed for a club at power p (0..1) from a lie; the distance grows in a straight line with p
export function launch(club, p, lie, dx, dz, keep) {
  const c = CLUBS[club], k = keep ?? SURF[lie]?.lie ?? 1
  if (club === 'putter') { const v = Math.sqrt(2 * SURF.green.mu * c.roll * p); return { vx: dx * v, vy: 0, vz: dz * v, mode: 'roll' } }
  const a = c.loft * Math.PI / 180, v = Math.sqrt(c.carry * k * p * G / Math.sin(2 * a))
  return { vx: dx * v * Math.cos(a), vy: v * Math.sin(a), vz: dz * v * Math.cos(a), mode: 'air' }
}
// play a shot without wind or moving things; returns where it first lands, where it stops and the path up to the landing
export function preview(C, from, club, p, lie, dx, dz, maxT = 14) {
  const b = { x: from.x, y: from.y, z: from.z, t: 0, ...launch(club, p, lie, dx, dz, C.lie(lie)) }
  let first = null, used = false
  const path = []
  const ev = (n) => { if (n === 'pad' || n === 'boost') used = true; if (!first && (n === 'bounce' || n === 'water' || n === 'ob' || n === 'holed' || n === 'pad' || n === 'boost')) first = { x: b.x, y: b.y, z: b.z } }
  for (let i = 0; i < maxT * 60 && (b.mode === 'air' || b.mode === 'roll'); i++) { stepBall(b, 1 / 60, C, ev, false); if (!first && i % 3 === 0) path.push(b.x, b.y, b.z) }
  return { first: first || { x: b.x, y: b.y, z: b.z }, end: b, path, used }
}
