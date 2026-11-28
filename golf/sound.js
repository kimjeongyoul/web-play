// Bonk Golf: every sound is made in code (WebAudio). No files, no voices. Music = a soft plucked loop.
// Noise is only used in short bursts (under 0.25 s): long noise sounds like cloth rubbing (RELEASE_GATE '소리 잡음').
export const audio = {
  ctx: null, master: null, musicGain: null, sfxGain: null, noise: null, log: [], musicOn: false, timer: 0, step: 0, nextT: 0,
  vol: { music: 0.6, sfx: 0.8, live: true },
  unlock() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return }
    const Ctx = window.AudioContext || window.webkitAudioContext
    if (!Ctx) return
    const c = this.ctx = new Ctx()
    this.master = c.createGain(); this.master.connect(c.destination)
    this.musicGain = c.createGain(); this.musicGain.connect(this.master)
    this.sfxGain = c.createGain(); this.sfxGain.connect(this.master)
    const len = c.sampleRate * 0.5, buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0)
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1
    this.noise = buf
    this.apply()
    if (this.musicOn) this.music(true)
  },
  apply() {
    if (!this.ctx) return
    const t = this.ctx.currentTime
    this.master.gain.setTargetAtTime(this.vol.live ? 1 : 0, t, 0.03)
    this.musicGain.gain.setTargetAtTime(this.vol.music * 0.5, t, 0.05)
    this.sfxGain.gain.setTargetAtTime(this.vol.sfx, t, 0.03)
  },
  // one tone: type, start freq, end freq, length, volume, delay
  tone(type, f0, f1, len, vol = 0.3, at = 0, out = this.sfxGain) {
    const c = this.ctx, t = c.currentTime + at, o = c.createOscillator(), g = c.createGain()
    o.type = type; o.frequency.setValueAtTime(f0, t); if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + len)
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.006); g.gain.exponentialRampToValueAtTime(0.0001, t + len)
    o.connect(g); g.connect(out); o.start(t); o.stop(t + len + 0.02)
  },
  // one noise burst through a filter: type, freq start, freq end, length, volume, delay
  hiss(type, f0, f1, len, vol = 0.3, at = 0, q = 0.8) {
    const c = this.ctx, t = c.currentTime + at, s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain()
    s.buffer = this.noise; s.loop = true; f.type = type; f.Q.value = q
    f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(Math.max(30, f1), t + len)
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + len)
    s.connect(f); f.connect(g); g.connect(this.sfxGain); s.start(t, Math.random() * 0.3); s.stop(t + len + 0.02)
  },
  play(name, v = 1, p = 1) {
    this.log.push(name); if (this.log.length > 60) this.log.shift()
    if (!this.ctx || !this.vol.live) return
    const T = (...a) => this.tone(...a), H = (...a) => this.hiss(...a)
    switch (name) {
      case 'click': T('triangle', 660, 880, 0.07, 0.18); break
      case 'deny': T('square', 200, 140, 0.16, 0.12); break
      case 'tick': T('sine', 420 * p, 440 * p, 0.045, 0.1 * v); break
      case 'whoosh': H('bandpass', 500, 2600, 0.14, 0.22 * v, 0, 1.2); break
      case 'crack': // driver / iron hit: click + body + air
        H('highpass', 2400, 900, 0.07, 0.55 * v); T('triangle', 950 * p, 240, 0.09, 0.5 * v); T('sine', 190, 55, 0.22, 0.6 * v); T('square', 1800 * p, 600, 0.03, 0.16 * v); break
      case 'perfect': T('sine', 1320, 1320, 0.25, 0.16, 0.02); T('sine', 1760, 1760, 0.3, 0.14, 0.08); T('sine', 2640, 2640, 0.4, 0.1, 0.14); break
      case 'putt': T('triangle', 760 * p, 380, 0.07, 0.4 * v); T('sine', 240, 120, 0.08, 0.25 * v); break
      case 'thud': T('sine', 150 * p, 48, 0.2, 0.55 * v); H('lowpass', 900, 200, 0.09, 0.25 * v); break
      case 'green': T('sine', 210 * p, 80, 0.14, 0.4 * v); break
      case 'sand': H('lowpass', 2600, 500, 0.2, 0.5 * v); T('sine', 110, 50, 0.14, 0.3 * v); break
      case 'splash': H('bandpass', 1800, 320, 0.24, 0.55 * v, 0, 0.6); T('sine', 300, 90, 0.25, 0.4 * v); T('sine', 620, 900, 0.07, 0.14, 0.2); T('sine', 760, 1100, 0.06, 0.1, 0.3); break
      case 'leaves': H('bandpass', 3200, 1400, 0.16, 0.3 * v, 0, 0.7); break
      case 'wood': T('triangle', 420, 200, 0.1, 0.5 * v); T('sine', 180, 90, 0.12, 0.3 * v); break
      case 'clank': T('square', 520, 380, 0.12, 0.2 * v); T('triangle', 1240, 900, 0.16, 0.25 * v); break
      case 'boing': T('sine', 160, 620, 0.26, 0.45 * v); T('triangle', 320, 1240, 0.22, 0.14 * v); break
      case 'zoom': T('sawtooth', 220, 1400, 0.3, 0.14 * v); T('sine', 440, 1760, 0.3, 0.2 * v); break
      case 'roll': T('sine', 300 * p, 260 * p, 0.03, 0.05 * v); break
      case 'cup': T('triangle', 560, 300, 0.09, 0.5); T('sine', 240, 110, 0.16, 0.5, 0.05); T('triangle', 430, 250, 0.07, 0.3, 0.13); T('triangle', 380, 230, 0.06, 0.2, 0.2); break
      case 'cheer': [523, 659, 784, 1047, 1319].forEach((f, i) => { T('triangle', f, f, 0.22, 0.22, i * 0.085); T('sine', f * 2, f * 2, 0.18, 0.07, i * 0.085) }); break
      case 'big': [523, 659, 784, 1047, 784, 1047, 1319, 1568].forEach((f, i) => { T('triangle', f, f, 0.24, 0.24, i * 0.1); T('square', f / 2, f / 2, 0.2, 0.05, i * 0.1) }); break
      case 'aw': T('triangle', 392, 370, 0.2, 0.2); T('triangle', 330, 300, 0.3, 0.2, 0.2); break
      case 'pop': T('sine', 900 * p, 1500 * p, 0.05, 0.14 * v); break
      case 'intro': T('triangle', 392, 392, 0.14, 0.16); T('triangle', 523, 523, 0.14, 0.16, 0.12); T('triangle', 659, 659, 0.24, 0.18, 0.24); break
    }
  },
  // ---- music: 4 chords, plucks + bass, 100 bpm, scheduled a little ahead
  music(on) {
    this.musicOn = on
    clearInterval(this.timer); this.timer = 0
    if (!on || !this.ctx) return
    this.nextT = this.ctx.currentTime + 0.1; this.step = 0
    this.timer = setInterval(() => this.schedule(), 120)
  },
  schedule() {
    const c = this.ctx; if (!c || c.state !== 'running') return
    if (this.nextT < c.currentTime) this.nextT = c.currentTime + 0.05
    const CH = [[262, 330, 392, 494], [220, 262, 330, 392], [175, 220, 262, 330], [196, 247, 294, 392]], PAT = [0, 2, 1, 3, 2, 1, 3, 2], beat = 0.3
    while (this.nextT < c.currentTime + 0.4) {
      const s = this.step++, bar = Math.floor(s / 8) % 4, ch = CH[bar], at = this.nextT - c.currentTime
      if (this.vol.music > 0.01) {
        const f = ch[PAT[s % 8]] * ((s % 16) > 11 ? 2 : 1)
        this.tone('triangle', f * 2, f * 2, 0.26, 0.11, at, this.musicGain)
        if (s % 2 === 0) this.tone('sine', f * 4, f * 4, 0.12, 0.03, at, this.musicGain)
        if (s % 4 === 0) this.tone('sine', ch[0] / 2, ch[0] / 2, 0.5, 0.2, at, this.musicGain)
        if (s % 8 === 6) this.tone('sine', ch[2] / 2, ch[2] / 2, 0.3, 0.14, at, this.musicGain)
      }
      this.nextT += beat
    }
  },
}
