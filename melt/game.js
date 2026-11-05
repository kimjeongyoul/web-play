// Melt Bot: a freshly booted android takes 'tidy the city' literally and melts it with its eye laser.
// One move to play (the laser is always on); a run lasts a minute; parts buy a stronger next run.
import * as THREE from './vendor/three.module.min.js'
import { MODELS } from './models.js'

const Q = new URLSearchParams(location.search)
const BOT = Q.has('bot')
const TURBO = Number(Q.get('turbo') || 0)
const RENDER = Q.has('render')
const CLASSIC = Q.has('classic') // the old code-shape town, for before/after pictures
const soundLog = []
const $ = (id) => document.getElementById(id)
const clamp = (v, a, b) => Math.max(a, Math.min(b, v))
const lerp = (a, b, t) => a + (b - a) * t
// &seed=7: the same town every time (before/after pictures). Must run before anything draws random numbers.
if (Q.has('seed')) { let a = +Q.get('seed') || 1; Math.random = () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296 } }
const rnd = (a, b) => a + Math.random() * (b - a)
const pick = (list) => list[Math.floor(Math.random() * list.length)]

// ---------------------------------------------------------------- text
const TEXT = {
  en: { play: 'PLAY', again: 'PLAY AGAIN', home: 'Home', upgrades: 'Upgrades', skins: "Lasers", settings: 'Settings', close: 'Close', paused: 'Paused', resume: 'Resume', quit: 'End run', music: 'Music', sfx: 'Sound', shake: 'Screen shake', language: 'Language', on: 'On', off: 'Off', size: 'SIZE', eaten: "Task done", best: 'Best', timeUp: "TIME'S UP!", cleared: "CITY MELTED!", double: 'Double gold', drag: 'Drag to move', mouse: 'Move the mouse', frenzy: "OVERHEAT!", sizeUp: 'SIZE UP!', locked: "Earn 1 star in the last city", owned: 'Owned', use: 'Use', used: 'In use', max: 'MAX', lvl: 'Lv', upTime: 'More time', upTimeD: '+5 s each run', upSpeed: 'Speed', upSpeedD: "Move faster", upStart: 'Big start', upStartD: 'Start larger', upMagnet: "Hotter beam", upMagnetD: "Melts faster", upGold: 'Gold', upGoldD: '+10% gold' },
  ko: { play: '시작', again: '다시 하기', home: '처음으로', upgrades: '강화', skins: "레이저", settings: '설정', close: '닫기', paused: '일시정지', resume: '계속', quit: '판 끝내기', music: '배경음', sfx: '효과음', shake: '화면 흔들림', language: '언어', on: '켬', off: '끔', size: '크기', eaten: "명령 완료", best: '최고', timeUp: '시간 끝!', cleared: "도시를 다 녹였다!", double: '골드 2배', drag: '끌어서 움직이기', mouse: '마우스를 움직이기', frenzy: "과열 모드!", sizeUp: '커졌다!', locked: "앞 도시에서 별 1개", owned: '보유', use: '쓰기', used: '사용 중', max: '최대', lvl: 'Lv', upTime: '시간', upTimeD: '판마다 +5초', upSpeed: '속도', upSpeedD: "더 빠르게", upStart: '큰 시작', upStartD: '더 크게 출발', upMagnet: "열선", upMagnetD: "더 빨리 녹임", upGold: '골드', upGoldD: '골드 +10%' },
  es: {"play": "JUGAR", "again": "OTRA VEZ", "home": "Inicio", "upgrades": "Mejoras", "skins": "Láseres", "settings": "Ajustes", "close": "Cerrar", "paused": "Pausa", "resume": "Seguir", "quit": "Terminar", "music": "Música", "sfx": "Sonido", "shake": "Vibración", "language": "Idioma", "on": "Sí", "off": "No", "size": "TAMAÑO", "eaten": "Tarea completada", "best": "Récord", "timeUp": "¡TIEMPO!", "cleared": "¡CIUDAD DERRETIDA!", "double": "Oro doble", "drag": "Arrastra para moverte", "mouse": "Mueve el ratón", "frenzy": "¡SOBRECALENTADO!", "sizeUp": "¡MÁS GRANDE!", "locked": "Gana 1 estrella en la ciudad anterior", "owned": "Tuyo", "use": "Usar", "used": "En uso", "max": "MÁX", "lvl": "Nv", "upTime": "Más tiempo", "upTimeD": "+5 s por partida", "upSpeed": "Velocidad", "upSpeedD": "Muévete más rápido", "upStart": "Gran inicio", "upStartD": "Empieza más grande", "upMagnet": "Rayo ardiente", "upMagnetD": "Derrite más rápido", "upGold": "Oro", "upGoldD": "+10% de oro"},
  pt: {"play": "JOGAR", "again": "DE NOVO", "home": "Início", "upgrades": "Melhorias", "skins": "Lasers", "settings": "Ajustes", "close": "Fechar", "paused": "Pausa", "resume": "Continuar", "quit": "Encerrar", "music": "Música", "sfx": "Som", "shake": "Tremor", "language": "Idioma", "on": "Sim", "off": "Não", "size": "TAMANHO", "eaten": "Tarefa concluída", "best": "Recorde", "timeUp": "ACABOU!", "cleared": "CIDADE DERRETIDA!", "double": "Ouro em dobro", "drag": "Arraste para mover", "mouse": "Mova o mouse", "frenzy": "SUPERAQUECIDO!", "sizeUp": "CRESCEU!", "locked": "Ganhe 1 estrela na cidade anterior", "owned": "Seu", "use": "Usar", "used": "Em uso", "max": "MÁX", "lvl": "Nv", "upTime": "Mais tempo", "upTimeD": "+5 s por partida", "upSpeed": "Velocidade", "upSpeedD": "Mova-se mais rápido", "upStart": "Início grande", "upStartD": "Comece maior", "upMagnet": "Raio quente", "upMagnetD": "Derrete mais rápido", "upGold": "Ouro", "upGoldD": "+10% de ouro"},
  ru: {"play": "ИГРАТЬ", "again": "ЕЩЁ РАЗ", "home": "Меню", "upgrades": "Улучшения", "skins": "Лазеры", "settings": "Настройки", "close": "Закрыть", "paused": "Пауза", "resume": "Продолжить", "quit": "Завершить", "music": "Музыка", "sfx": "Звук", "shake": "Тряска", "language": "Язык", "on": "Вкл", "off": "Выкл", "size": "РАЗМЕР", "eaten": "Задача выполнена", "best": "Рекорд", "timeUp": "ВРЕМЯ ВЫШЛО!", "cleared": "ГОРОД РАСПЛАВЛЕН!", "double": "Золото x2", "drag": "Тяни, чтобы двигаться", "mouse": "Двигай мышью", "frenzy": "ПЕРЕГРЕВ!", "sizeUp": "БОЛЬШЕ!", "locked": "Нужна 1 звезда в прошлом городе", "owned": "Есть", "use": "Выбрать", "used": "Выбрано", "max": "МАКС", "lvl": "Ур", "upTime": "Время", "upTimeD": "+5 с за игру", "upSpeed": "Скорость", "upSpeedD": "Двигайся быстрее", "upStart": "Большой старт", "upStartD": "Начни крупнее", "upMagnet": "Жаркий луч", "upMagnetD": "Плавит быстрее", "upGold": "Золото", "upGoldD": "+10% золота"},
  tr: {"play": "OYNA", "again": "TEKRAR", "home": "Ana menü", "upgrades": "Yükseltmeler", "skins": "Lazerler", "settings": "Ayarlar", "close": "Kapat", "paused": "Duraklatıldı", "resume": "Devam", "quit": "Bitir", "music": "Müzik", "sfx": "Ses", "shake": "Sarsıntı", "language": "Dil", "on": "Açık", "off": "Kapalı", "size": "BOYUT", "eaten": "Görev tamam", "best": "En iyi", "timeUp": "SÜRE BİTTİ!", "cleared": "ŞEHİR ERİDİ!", "double": "İki kat altın", "drag": "Hareket için sürükle", "mouse": "Fareyi hareket ettir", "frenzy": "AŞIRI ISINMA!", "sizeUp": "BÜYÜDÜ!", "locked": "Önceki şehirde 1 yıldız kazan", "owned": "Sende", "use": "Kullan", "used": "Kullanımda", "max": "MAKS", "lvl": "Sv", "upTime": "Süre", "upTimeD": "Oyun başına +5 sn", "upSpeed": "Hız", "upSpeedD": "Daha hızlı git", "upStart": "Büyük başlangıç", "upStartD": "Daha büyük başla", "upMagnet": "Sıcak ışın", "upMagnetD": "Daha hızlı eritir", "upGold": "Altın", "upGoldD": "+%10 altın"},
  de: {"play": "SPIELEN", "again": "NOCHMAL", "home": "Start", "upgrades": "Upgrades", "skins": "Laser", "settings": "Optionen", "close": "Schließen", "paused": "Pause", "resume": "Weiter", "quit": "Beenden", "music": "Musik", "sfx": "Sound", "shake": "Wackeln", "language": "Sprache", "on": "An", "off": "Aus", "size": "GRÖSSE", "eaten": "Auftrag erledigt", "best": "Rekord", "timeUp": "ZEIT UM!", "cleared": "STADT GESCHMOLZEN!", "double": "Doppeltes Gold", "drag": "Ziehen zum Bewegen", "mouse": "Maus bewegen", "frenzy": "ÜBERHITZT!", "sizeUp": "GRÖSSER!", "locked": "1 Stern in der Stadt davor", "owned": "Deins", "use": "Nutzen", "used": "Aktiv", "max": "MAX", "lvl": "St", "upTime": "Mehr Zeit", "upTimeD": "+5 s pro Runde", "upSpeed": "Tempo", "upSpeedD": "Schneller bewegen", "upStart": "Großer Start", "upStartD": "Größer beginnen", "upMagnet": "Heißer Strahl", "upMagnetD": "Schmilzt schneller", "upGold": "Gold", "upGoldD": "+10% Gold"},
  fr: {"play": "JOUER", "again": "REJOUER", "home": "Accueil", "upgrades": "Améliorations", "skins": "Lasers", "settings": "Réglages", "close": "Fermer", "paused": "Pause", "resume": "Reprendre", "quit": "Terminer", "music": "Musique", "sfx": "Son", "shake": "Secousses", "language": "Langue", "on": "Oui", "off": "Non", "size": "TAILLE", "eaten": "Tâche accomplie", "best": "Record", "timeUp": "TEMPS ÉCOULÉ !", "cleared": "VILLE FONDUE !", "double": "Or doublé", "drag": "Glisse pour bouger", "mouse": "Bouge la souris", "frenzy": "SURCHAUFFE !", "sizeUp": "PLUS GROS !", "locked": "1 étoile dans la ville d’avant", "owned": "À toi", "use": "Utiliser", "used": "Utilisé", "max": "MAX", "lvl": "Nv", "upTime": "Plus de temps", "upTimeD": "+5 s par partie", "upSpeed": "Vitesse", "upSpeedD": "Bouge plus vite", "upStart": "Gros départ", "upStartD": "Commence plus gros", "upMagnet": "Rayon brûlant", "upMagnetD": "Fait fondre plus vite", "upGold": "Or", "upGoldD": "+10% d'or"},
  ja: {"play": "プレイ", "again": "もう一度", "home": "ホーム", "upgrades": "強化", "skins": "レーザー", "settings": "設定", "close": "閉じる", "paused": "一時停止", "resume": "続ける", "quit": "終了", "music": "音楽", "sfx": "効果音", "shake": "画面の揺れ", "language": "言語", "on": "オン", "off": "オフ", "size": "サイズ", "eaten": "命令完了", "best": "最高", "timeUp": "タイムアップ!", "cleared": "街を溶かしきった！", "double": "ゴールド2倍", "drag": "ドラッグで移動", "mouse": "マウスで移動", "frenzy": "オーバーヒート！", "sizeUp": "大きくなった!", "locked": "前の街で星1つ", "owned": "所持", "use": "使う", "used": "使用中", "max": "最大", "lvl": "Lv", "upTime": "時間", "upTimeD": "1回ごとに+5秒", "upSpeed": "速度", "upSpeedD": "速く動く", "upStart": "大きくスタート", "upStartD": "大きな状態で開始", "upMagnet": "熱線", "upMagnetD": "もっと速く溶かす", "upGold": "ゴールド", "upGoldD": "ゴールド+10%"},
  zh: {"play": "开始", "again": "再来一局", "home": "主页", "upgrades": "升级", "skins": "激光", "settings": "设置", "close": "关闭", "paused": "已暂停", "resume": "继续", "quit": "结束本局", "music": "音乐", "sfx": "音效", "shake": "屏幕震动", "language": "语言", "on": "开", "off": "关", "size": "大小", "eaten": "任务完成", "best": "最高", "timeUp": "时间到!", "cleared": "城市全熔化！", "double": "金币翻倍", "drag": "拖动来移动", "mouse": "移动鼠标", "frenzy": "过热模式！", "sizeUp": "变大了!", "locked": "在上一座城市获得1颗星", "owned": "已拥有", "use": "使用", "used": "使用中", "max": "满级", "lvl": "Lv", "upTime": "时间", "upTimeD": "每局+5秒", "upSpeed": "速度", "upSpeedD": "移动更快", "upStart": "大号开局", "upStartD": "开局更大", "upMagnet": "热射线", "upMagnetD": "熔化更快", "upGold": "金币", "upGoldD": "金币+10%"},
}
const TOWN_NAMES = { en: ['New York', 'London', 'Paris', 'Rome', 'Cairo', 'Tokyo', 'Seoul', 'Dubai', 'Las Vegas', 'Toronto', 'Nice'], ko: ['뉴욕', '런던', '파리', '로마', '카이로', '도쿄', '서울', '두바이', '라스베이거스', '토론토', '니스'], es: ["Nueva York", "Londres", "París", "Roma", "El Cairo", "Tokio", "Seúl", "Dubái", "Las Vegas", "Toronto", "Niza"], pt: ["Nova York", "Londres", "Paris", "Roma", "Cairo", "Tóquio", "Seul", "Dubai", "Las Vegas", "Toronto", "Nice"], ru: ["Нью-Йорк", "Лондон", "Париж", "Рим", "Каир", "Токио", "Сеул", "Дубай", "Лас-Вегас", "Торонто", "Ницца"], tr: ["New York", "Londra", "Paris", "Roma", "Kahire", "Tokyo", "Seul", "Dubai", "Las Vegas", "Toronto", "Nice"], de: ["New York", "London", "Paris", "Rom", "Kairo", "Tokio", "Seoul", "Dubai", "Las Vegas", "Toronto", "Nizza"], fr: ["New York", "Londres", "Paris", "Rome", "Le Caire", "Tokyo", "Séoul", "Dubaï", "Las Vegas", "Toronto", "Nice"], ja: ["ニューヨーク", "ロンドン", "パリ", "ローマ", "カイロ", "東京", "ソウル", "ドバイ", "ラスベガス", "トロント", "ニース"], zh: ["纽约", "伦敦", "巴黎", "罗马", "开罗", "东京", "首尔", "迪拜", "拉斯维加斯", "多伦多", "尼斯"] }
const LANGUAGES = { en: 'English', ko: '한국어', es: 'Español', pt: 'Português', ru: 'Русский', tr: 'Türkçe', de: 'Deutsch', fr: 'Français', ja: '日本語', zh: '简体中文' }
const LANG_KEYS = Object.keys(LANGUAGES)
let lang = 'en'
const t = (key) => TEXT[lang][key] ?? key

// ---------------------------------------------------------------- save
const SAVE_KEY = 'melt_bot'
const save = { gold: 0, runs: 0, town: 0, stars: Array(12).fill(0), best: Array(12).fill(0), up: { time: 0, speed: 0, start: 0, magnet: 0, gold: 0 }, skin: 0, skins: [0], music: 0.6, sfx: 0.9, shake: 1, lang: '' }
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
    for (const k of ['stars', 'best']) save[k] = Array.from({ length: 12 }, (_, i) => +(old[k]?.[i] || 0)) // older saves had 5 towns
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
  // At most one full-screen ad per 3 minutes; a rewarded ad the player chose also resets the clock.
  lastAd: Date.now(),
  interstitial() {
    if (Date.now() - this.lastAd < 180000) return
    this.lastAd = Date.now()
    try { if (this.ready) window.bridge.advertisement.showInterstitial() } catch {}
  },
  // Bottom banner on the title and result screens only, never during a run (it would sit under the drag area).
  bannerOn: false,
  banner(on) {
    if (on === this.bannerOn) return
    this.bannerOn = on
    // Playgama's own site has no banners (bridge: isBannerSupported false); only other portals show one, so only then keep room for it.
    const real = this.ready && window.bridge.advertisement.isBannerSupported === true
    document.body.classList.toggle('adBanner', on && (real || Q.has('fakebanner')))
    document.body.classList.toggle('fakeBanner', on && Q.has('fakebanner')) // test: draw where the banner goes
    try { if (real) on ? window.bridge.advertisement.showBanner() : window.bridge.advertisement.hideBanner() } catch {}
  },
  rewardedAd(done) {
    if (!this.ready) { done(false); return }
    this.rewardDone = done; this.rewarded = false; this.lastAd = Date.now()
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
  // The laser's hum, made live (no file): two detuned saws through a low-pass. It drops in pitch as the beam thickens,
  // and the filter opens with a sizzle while something is heating under the beam.
  hum(on, width, sizzle) {
    if (!this.ctx || RENDER) return
    if (!this.humGain) {
      const c = this.ctx, a = c.createOscillator(), b = c.createOscillator(), f = c.createBiquadFilter(), g = c.createGain()
      a.type = 'sawtooth'; b.type = 'sawtooth'; b.detune.value = 14; f.type = 'lowpass'; f.Q.value = 6; g.gain.value = 0
      a.connect(f); b.connect(f); f.connect(g); g.connect(this.sfxGain); a.start(); b.start()
      Object.assign(this, { humA: a, humB: b, humF: f, humGain: g })
    }
    // Schedule only when something changed, and clear what was scheduled before: a param fed every frame keeps a growing
    // event list (worst while the context is suspended and its clock stands still; soak 2026-11-05: busy 10 % -> 23 %).
    if (this.ctx.state !== 'running') return
    const pitch = Math.round(90 / Math.sqrt(1 + width * 0.35)), key = `${on}|${sizzle}|${pitch}`
    if (key === this.humKey) return
    this.humKey = key
    const t = this.ctx.currentTime
    for (const [param, value, time] of [[this.humA.frequency, pitch, 0.2], [this.humB.frequency, pitch * 1.5, 0.2], [this.humF.frequency, sizzle ? 1400 : 420, sizzle ? 0.03 : 0.25], [this.humGain.gain, on ? (sizzle ? 0.075 : 0.045) : 0, on ? 0.15 : 0.08]]) {
      param.cancelScheduledValues(t); param.setValueAtTime(param.value, t); param.setTargetAtTime(value, t, time)
    }
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
    // menu.ogg is mixed about 7 dB quieter than run.ogg; even them out
    const level = this.ctx.createGain(); level.gain.value = name === 'menu' ? 2.2 : 1
    source.connect(level); level.connect(this.musicGain); source.start(); this.source = source; this.current = name
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
// The first tap or key anywhere (menus cover the canvas) turns sound on, so the title music starts right away.
addEventListener('pointerdown', () => audio.unlock(), true); addEventListener('keydown', () => audio.unlock(), true)

// ---------------------------------------------------------------- towns
// A city with `city` gets its own plan (roads, parks, water, landmark: cityPlan below); the rest are Gulp's grid towns until their city is made.
const THEMES = [
  {
    city: 'ny', grass: '#d4cdc0', grass2: '#c9c1b2', road: '#585c68', walk: '#e6e0d3', sky: 0x9fd4ff, fog: 0xcfe9ff, far: '#3f9fd6',
    park: '#7cc35a', park2: '#6cb64c', path: '#eadcb4', water: '#3f9fd6', water2: '#63b6e4', sand: '#efd9a0',
    leaf: [0x3fa34a, 0x58b84a, 0x2f8f45], walls: [0xc9745a, 0xe8d9bf, 0xb5543f, 0xdcc9a6, 0xa86a52], roofs: [0x5a5f6b, 0x7a7f8a, 0x4a4e57],
    glass: [0xffffff, 0xeef3f8, 0xf6efe4, 0xe3ebf3], towerWalls: [0xe6dcc6, 0xbfcad6, 0xd8c3a0, 0x9fb3c8, 0xcfd4da], start: [12, 57], goal: 8000, slate: true, trim: true,
    variants: { cottage: ['nylow_a', 'nylow_b', 'nylow_c'], house: ['nymid_a', 'nymid_b', 'nymid_c'], shop: ['shop_a', 'shop_b', 'shop_c', 'nyshop_a', 'nyshop_b', 'nyshop_c'], tower: ['tower_a', 'tower_b', 'nytower_c'], sky: ['sky_a', 'sky_b'], car: ['car_b', 'car_b', 'car_b', 'car_a', 'car_e', 'car_c'], bus: ['bus_k', 'truck_f', 'truck_g'] },
  },
  {
    city: 'london', grass: '#cfc9bd', grass2: '#c4bdae', road: '#5a5d66', walk: '#ddd7cb', sky: 0xb7d2ea, fog: 0xdbe6ef, far: '#86bb62',
    park: '#86c45e', park2: '#76b84f', path: '#e4d6ae', water: '#5a9fc4', water2: '#78b4d4', sand: '#cdbf9a',
    leaf: [0x3f9a45, 0x58ad4a, 0x2e8240], walls: [0xb5523e, 0x9c4a3a, 0xeee4cc, 0xc7765a, 0xa8553f, 0xd8c6a2], roofs: [0x4b4f5a, 0x5f6470, 0x6d5a4a],
    glass: [0xffffff, 0xeef3f8, 0xf6efe4, 0xe3ebf3], towerWalls: [0xd5dbe2, 0xaebccb, 0xe3d9c4, 0x8fa3b8], start: [-60, 42], goal: 40000, slate: true,
    busColors: [0xd8262e], cab: 0x1d1d24, carColors: [0xffffff], smalls: ['cone', 'crate', 'phone', 'lamp', 'phone', 'lamp', 'bush', 'mail'],
    variants: { cottage: ['cottage_a', 'cottage_b', 'cottage_c'], house: ['house_a', 'house_b', 'house_c', 'house_d'], shop: ['shop_a', 'shop_b', 'shop_c', 'nyshop_a', 'nyshop_b'], tower: ['tower_a', 'tower_b', 'nytower_c'], sky: ['sky_a', 'sky_b'], car: ['car_b', 'car_b', 'car_a', 'car_c', 'car_e'] },
  },
  {
    city: 'paris', grass: '#ddd1b8', grass2: '#d3c6aa', road: '#66666d', walk: '#e6dcc6', sky: 0xa9d8ff, fog: 0xd9ecff, far: '#94c463',
    park: '#93c55f', park2: '#82b951', path: '#ead9b0', water: '#4f93b8', water2: '#6daacb', sand: '#c9b88f',
    leaf: [0x4f9e3c, 0x67b24a, 0x3d8a34], walls: [0xecd3a4, 0xf2dfb8, 0xe2c590, 0xf5e6c8, 0xdcbd88], roofs: [0x7f93a8, 0x8a9db0, 0x71859a], zinc: true,
    glass: [0xffffff, 0xeef3f8, 0xe3ebf3], towerWalls: [0xdfe6ee, 0xb7c6d6, 0xcfd6dd, 0x9fb3c8], start: [60, 42], goal: 90000, slate: true,
    busColors: [0x2e9e6a, 0xffffff], carColors: [0xffffff], smalls: ['parasol', 'lamp', 'parasol', 'crate', 'bush', 'lamp', 'cone', 'mail'],
    variants: { cottage: ['nylow_a', 'nylow_b', 'nylow_c'], house: ['nymid_a', 'nymid_b', 'nymid_c'], shop: ['shop_a', 'shop_b', 'shop_c', 'nyshop_a', 'nyshop_b', 'nyshop_c'], tower: ['tower_a', 'tower_b', 'nytower_c'], sky: ['sky_a', 'sky_b'], car: ['car_h', 'car_h', 'car_v', 'car_a', 'car_e', 'car_c'], parasol: ['parasol_a', 'parasol_b'] },
  },
  {
    city: 'rome', hard: 1.8, grass: '#e2cfae', grass2: '#d6c19c', road: '#6b6560', walk: '#eadbbd', sky: 0x9fd8ff, fog: 0xdcefff, far: '#a9c46a',
    park: '#9cc062', park2: '#8bb354', path: '#e9d6a8', water: '#58a6c9', water2: '#78bad8', sand: '#d8c39a',
    leaf: [0x3f7d3a, 0x4e8f3f, 0x356d33], walls: [0xe0a15a, 0xd9824f, 0xf0c27a, 0xc96f45, 0xe8b27c, 0xf2d6a2], roofs: [0xc8643c, 0xb85a36, 0xd47a4a], zinc: true,
    glass: [0xffffff, 0xf6efe4], towerWalls: [0xf0d8a8, 0xe0b880, 0xf2e2c4], start: [-42, 72], goal: 150000, slate: true,
    busColors: [0xf2f2f2, 0xd8262e], carColors: [0xffffff], smalls: ['parasol', 'lamp', 'crate', 'bush', 'parasol', 'mail', 'cone', 'column'],
    variants: { cottage: ['nylow_a', 'nylow_b', 'nylow_c'], house: ['nymid_a', 'nymid_b', 'nymid_c'], shop: ['shop_a', 'shop_b', 'shop_c', 'nyshop_a', 'nyshop_b'], tower: ['tower_a', 'tower_b'], sky: ['sky_a'], car: ['car_h', 'car_h', 'car_h', 'car_a', 'car_e', 'car_v'], parasol: ['parasol_a', 'parasol_b'] },
  },
  {
    city: 'cairo', grass: '#e4d3ad', grass2: '#d9c597', road: '#6e6860', walk: '#eedfbd', sky: 0xb6e2ff, fog: 0xf2e6cc, far: '#ecd49a',
    park: '#8fbf55', park2: '#7eb04a', path: '#e8d4a4', water: '#3f95b8', water2: '#5aaccb', sand: '#d9c08a', sand2: '#efd496', sand3: '#e4c47e',
    leaf: [0x4f9a3c, 0x66ad45, 0x3e8a35], walls: [0xe8d2a6, 0xdcc08a, 0xf0e0c0, 0xc9a878, 0xe2c69a, 0xd8b88a], roofs: [0xcab796, 0xbfa985, 0xd4c3a2], zinc: true,
    glass: [0xffffff, 0xf6efe4], towerWalls: [0xeadcbc, 0xd8c49c, 0xc9d3dc], start: [-24, 40], goal: 220000, slate: true,
    busColors: [0xf2f2f2, 0x3f7fd0], carColors: [0xffffff], smalls: ['parasol', 'crate', 'lamp', 'crate', 'bush', 'parasol', 'mail', 'cone'],
    variants: { cottage: ['nylow_a', 'nylow_b', 'nylow_c'], house: ['nymid_a', 'nymid_b', 'nymid_c'], shop: ['shop_a', 'shop_b', 'shop_c', 'nyshop_a', 'nyshop_b', 'nyshop_c'], car: ['car_a', 'car_a', 'car_b', 'car_c', 'car_v', 'car_e'] },
  },
  {
    city: 'tokyo', hard: 2.2, grass: '#d6d6d1', grass2: '#cbcbc5', road: '#55585f', walk: '#e7e5dd', sky: 0xa6d8ff, fog: 0xe0eeff, far: '#4f9fd0',
    park: '#8ec85e', park2: '#7dba50', path: '#e6d8b2', water: '#3f9ed0', water2: '#5fb3dc', sand: '#d9cfae', blossom: '#f6c3d6',
    leaf: [0xffb3cc, 0xff9ec0, 0x5aa84a, 0xf7c4d8], walls: [0xf2f2ee, 0xdfe3e8, 0xf0e2d0, 0xc9d3dc, 0xe8d0c8, 0xd6dccf], roofs: [0x6b7078, 0x7d828a, 0x5d6168],
    glass: [0xffffff, 0xeef3f8, 0xe3ebf3, 0xf2f6fa], towerWalls: [0xdfe6ee, 0xb7c6d6, 0xe8edf2, 0x9fb3c8, 0xc8d0d8], start: [6, 0], goal: 300000, slate: true, trim: true,
    busColors: [0xf2f2f2, 0x3fae6a], cab: 0x23324a, carColors: [0xffffff], smalls: ['vend', 'cone', 'vend', 'lamp', 'crate', 'bush', 'vend', 'mail'],
    variants: { cottage: ['nylow_a', 'nylow_b', 'nylow_c'], house: ['nymid_a', 'nymid_b', 'nymid_c'], shop: ['shop_a', 'shop_b', 'shop_c', 'nyshop_a', 'nyshop_b', 'nyshop_c'], tower: ['tower_a', 'tower_b', 'nytower_c'], sky: ['sky_a', 'sky_b'], car: ['car_h', 'car_h', 'car_b', 'car_v', 'car_a', 'car_e'] },
  },
  {
    city: 'seoul', grass: '#d4d3cd', grass2: '#c9c8c1', road: '#53565e', walk: '#e4e2da', sky: 0xa3d6ff, fog: 0xdcecff, far: '#5f9a4e',
    park: '#8fc85c', park2: '#7dbb4e', path: '#e3d5b0', water: '#4796c2', water2: '#66acd2', sand: '#cfc6a8', hill: '#5f9a4e', hill2: '#6fae58',
    leaf: [0x4f9e3c, 0x67b24a, 0xe8a03a, 0x3d8a34], walls: [0xf3f1ea, 0xe2e4e6, 0xd9cfc0, 0xc9d3dc, 0xe8d8c8, 0xd0c8bc], roofs: [0x6b7078, 0x7d828a, 0x5d6168],
    glass: [0xffffff, 0xeef3f8, 0xe3ebf3, 0xf2f6fa], towerWalls: [0xdfe6ee, 0xb7c6d6, 0xe8edf2, 0x9fb3c8], start: [-52, 50], goal: 380000, slate: true, trim: true,
    busColors: [0x3fae6a, 0x3f7fd0], cab: 0xff8a2a, carColors: [0xffffff], smalls: ['vend', 'cone', 'parasol', 'lamp', 'crate', 'bush', 'vend', 'mail'],
    variants: { cottage: ['nylow_a', 'nylow_b', 'nylow_c'], house: ['nymid_a', 'nymid_b', 'nymid_c'], shop: ['shop_a', 'shop_b', 'shop_c', 'nyshop_a', 'nyshop_b', 'nyshop_c'], tower: ['tower_a', 'tower_b', 'nytower_c'], sky: ['sky_a', 'sky_b'], car: ['car_b', 'car_h', 'car_a', 'car_a', 'car_c', 'car_v', 'car_e'] },
  },
  {
    city: 'dubai', grass: '#e6dcc6', grass2: '#dcd0b6', road: '#4f535b', walk: '#f0e8d6', sky: 0x9fdcff, fog: 0xf4ecd8, far: '#2fa8c9',
    park: '#8fc85c', park2: '#7dbb4e', path: '#eadbb6', water: '#2fa8c9', water2: '#56bfd9', sand: '#f0d9a0', sand2: '#ecc77e', sand3: '#e0b468',
    leaf: [0x4f9a3c, 0x66ad45, 0x3e8a35], walls: [0xf4f1ea, 0xe9dcc2, 0xd8e2ea, 0xf0e6d0, 0xe2d2b4], roofs: [0x9aa3ad, 0xb0b6bc, 0x8a939c],
    glass: [0xffffff, 0xeef3f8, 0xe3ebf3, 0xf2f6fa], towerWalls: [0xcfe0ee, 0xb3c9dc, 0xe3ecf3, 0x9fb9d0, 0xd8d0c0], start: [-40, 38], goal: 460000, slate: true, trim: true,
    busColors: [0xf2f2f2, 0xd8262e], carColors: [0xffffff], smalls: ['lamp', 'cone', 'bush', 'lamp', 'crate', 'vend', 'mail', 'bush'],
    variants: { cottage: ['nylow_a', 'nylow_b', 'nylow_c'], house: ['nymid_a', 'nymid_b', 'nymid_c'], shop: ['shop_a', 'shop_b', 'shop_c', 'nyshop_a', 'nyshop_b', 'nyshop_c'], tower: ['tower_a', 'tower_b', 'nytower_c'], sky: ['sky_a', 'sky_b'], car: ['car_s', 'car_l', 'car_s', 'car_l', 'car_a', 'car_e', 'car_b'] },
  },
  {
    city: 'vegas', grass: '#e9dcc0', grass2: '#ddcfb0', road: '#4f525a', walk: '#f2e8d4', sky: 0xffb27a, fog: 0xffd8b4, far: '#e8c88a',
    park: '#8fc85c', park2: '#7dbb4e', path: '#eadbb6', water: '#2fb0d9', water2: '#5ac4e6', sand: '#f0d9a0', sand2: '#e9c584', sand3: '#ddb46e',
    leaf: [0x4f9a3c, 0x66ad45, 0x3e8a35], walls: [0xf4efe4, 0xf2d6a8, 0xe8c8d8, 0xd8e2ea, 0xf0e0b0, 0xe6d0c0], roofs: [0xd47a4a, 0xc8643c, 0x9aa3ad],
    glass: [0xffffff, 0xf6efe4, 0xffe8c8, 0xe3ebf3], towerWalls: [0xf2e2c4, 0xd8c49c, 0xe8d0c8, 0xc9d3dc, 0xf6e6b0], start: [-53, 80], goal: 520000, slate: true, trim: true,
    busColors: [0xf2f2f2, 0xd8262e], carColors: [0xffffff], smalls: ['lamp', 'cone', 'bush', 'lamp', 'crate', 'hydrant', 'mail', 'bush'],
    variants: { cottage: ['cottage_a', 'cottage_b', 'cottage_c'], house: ['house_a', 'house_b', 'house_c', 'house_d'], shop: ['shop_a', 'shop_b', 'shop_c', 'nyshop_a', 'nyshop_b', 'nyshop_c'], tower: ['tower_a', 'tower_b', 'nytower_c'], car: ['car_s', 'car_l', 'car_b', 'car_s', 'car_a', 'car_e'] },
  },
  {
    city: 'toronto', hard: 3.2, grass: '#d6d3ca', grass2: '#cbc7bc', road: '#53565e', walk: '#e4e0d6', sky: 0xa6d6ff, fog: 0xdcecff, far: '#3f8fc4',
    park: '#8cc45a', park2: '#7ab64c', path: '#e3d5b0', water: '#3f8fc4', water2: '#5ea6d2', sand: '#d9cfae',
    leaf: [0xe8582e, 0xf2a03a, 0xd8402e, 0x5aa84a, 0xf0c040], walls: [0xb5523e, 0xc7765a, 0xeee4cc, 0x9c4a3a, 0xd8c6a2], roofs: [0x4b4f5a, 0x5f6470, 0x6d5a4a],
    glass: [0xffffff, 0xeef3f8, 0xe3ebf3, 0xf2f6fa], towerWalls: [0xcfe0ee, 0xb3c9dc, 0xe3ecf3, 0x9fb9d0, 0x8fa8c0], start: [-39, 32], goal: 580000, slate: true,
    busColors: [0xd8262e], carColors: [0xffffff], smalls: ['hydrant', 'cone', 'lamp', 'crate', 'bush', 'mail', 'hydrant', 'lamp'],
    variants: { cottage: ['cottage_a', 'cottage_b', 'cottage_c'], house: ['house_a', 'house_b', 'house_c', 'house_d'], shop: ['shop_a', 'shop_b', 'shop_c', 'nyshop_a', 'nyshop_b', 'nyshop_c'], tower: ['tower_a', 'tower_b', 'nytower_c'], sky: ['sky_a', 'sky_b'], car: ['car_a', 'car_c', 'car_v', 'car_a', 'car_e', 'car_b'] },
  },
  {
    city: 'nice', hard: 3.8, grass: '#e6dcc8', grass2: '#dcd0ba', road: '#5c5c62', walk: '#efe6d4', sky: 0x8fd6ff, fog: 0xd8f0ff, far: '#2aa6c8',
    park: '#8fc25e', park2: '#7eb651', path: '#e9d6a8', water: '#2aa6c8', water2: '#4fbcd8', sand: '#d8d2c4', hill: '#6fae58',
    leaf: [0x4f9a3c, 0x66ad45, 0x3e8a35], walls: [0xf2b84a, 0xe8836a, 0xf2a0a0, 0xf6d27a, 0xe06a3a, 0xf4e2c0], roofs: [0xc8643c, 0xb85a36, 0xd47a4a], zinc: true,
    glass: [0xffffff, 0xf6efe4], towerWalls: [0xf4e2c0, 0xf2d0b0], start: [-80, 32], goal: 640000, slate: true,
    busColors: [0xf2f2f2, 0x3f7fd0], carColors: [0xffffff], smalls: ['parasol', 'lamp', 'bush', 'chair', 'lamp', 'crate', 'mail', 'chair'],
    variants: { cottage: ['nylow_a', 'nylow_b', 'nylow_c'], house: ['nymid_a', 'nymid_b', 'nymid_c'], shop: ['shop_a', 'shop_b', 'shop_c', 'nyshop_a', 'nyshop_b'], tower: ['tower_a', 'tower_b'], car: ['car_h', 'car_v', 'car_h', 'car_s', 'car_a', 'car_e'] },
  },
]
const SKINS = [
  { color: 0xff3355, cost: 0 }, { color: 0x39ff7a, cost: 800 }, { color: 0x3ad8ff, cost: 1500 },
  { color: 0xb46bff, cost: 3000 }, { color: 0xff9f1c, cost: 6000 }, { color: 0xffd23f, cost: 12000 },
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

// Kenney CC0 models baked by gamedev-kit/web/tools/bake_models.py (tools/models.json): indexed Int16 positions + Uint8 linear colours.
const bytes = (b64) => Uint8Array.from(atob(b64), (ch) => ch.charCodeAt(0))
function kenney(name, wall = null, roof = null, slate = false, trim = false, cab = null, zinc = false) {
  const m = MODELS[name]
  const p16 = new Int16Array(bytes(m.p).buffer), c8 = bytes(m.c), i16 = new Uint16Array(bytes(m.i).buffer)
  const pos = new Float32Array(p16.length), col = new Float32Array(c8.length)
  for (let i = 0; i < p16.length; i++) pos[i] = p16[i] * m.q
  for (let i = 0; i < c8.length; i++) col[i] = c8[i] / 255
  // Paint the kit's white walls in the town's colour (everything else keeps the kit's colours).
  // (slate: the commercial kit's walls are blue-grey and its white is trim, so the slate faces take the colour instead, below)
  if (wall !== null && !(slate && trim)) {
    COLOR.set(wall)
    for (let i = 0; i < col.length; i += 3) {
      const r = col[i], g = col[i + 1], b = col[i + 2]
      if (Math.min(r, g, b) > 0.45 && Math.max(r, g, b) - Math.min(r, g, b) < 0.06) { const k = r; col[i] = COLOR.r * k; col[i + 1] = COLOR.g * k; col[i + 2] = COLOR.b * k }
    }
  }
  // The suburban kit's roofs are all green; from above the roof is most of a house, so give it the town's roof colour.
  if (roof !== null) {
    const R = new THREE.Color(roof)
    for (let i = 0; i < col.length; i += 3) {
      const r = col[i], g = col[i + 1], b = col[i + 2]
      if (g > r * 1.4 && g > b * 1.15 && g > 0.08) { const k = Math.min(1.4, g / 0.35); col[i] = R.r * k; col[i + 1] = R.g * k; col[i + 2] = R.b * k }
    }
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3))
  g.setIndex(new THREE.BufferAttribute(i16, 1))
  const flat = g.toNonIndexed(); flat.computeVertexNormals()
  if (cab !== null) {
    // the black cab: the taxi's yellow body painted the cab colour
    const C = new THREE.Color(cab), c = flat.attributes.color.array
    for (let i = 0; i < c.length; i += 3) if (c[i] > 0.45 && c[i + 1] > 0.25 && c[i + 2] < c[i + 1] * 0.45) { c[i] = C.r; c[i + 1] = C.g; c[i + 2] = C.b }
  }
  if (slate && wall !== null) {
    const ROOF = new THREE.Color()
    // Blue-grey walls become brick or stone with the kit's shading kept; faces that look up stay the kit's grey roof.
    COLOR.set(wall)
    const c = flat.attributes.color.array, n = flat.attributes.normal.array
    for (let i = 0; i < c.length; i += 3) {
      const r = c[i], gr = c[i + 1], b = c[i + 2], top = Math.max(r, gr, b)
      // zinc: grey roofs take the roof colour (Paris's blue-grey zinc)
      if (n[i + 1] > 0.5) { if (zinc && roof !== null && b > r * 1.1 && top < 0.5) { const k = clamp(top / 0.3, 0.6, 1.2); ROOF.set(roof); c[i] = ROOF.r * k; c[i + 1] = ROOF.g * k; c[i + 2] = ROOF.b * k } continue }
      // white walls (some models are white, not slate) take a light shade of the colour
      if (trim && Math.min(r, gr, b) > 0.45 && top - Math.min(r, gr, b) < 0.08) { c[i] = r * (0.35 + 0.65 * COLOR.r); c[i + 1] = gr * (0.35 + 0.65 * COLOR.g); c[i + 2] = b * (0.35 + 0.65 * COLOR.b); continue }
      if (!(b > r * 1.25 && b > gr * 1.15 && top < 0.45)) continue
      const k = clamp(top / 0.3, 0.6, 1.25); c[i] = COLOR.r * k; c[i + 1] = COLOR.g * k; c[i + 2] = COLOR.b * k
    }
  }
  return flat
}
// Which baked models stand in for each kind (same swallow radius, so play does not change).
const VARIANTS = { cottage: ['cottage_a', 'cottage_b', 'cottage_c'], house: ['house_a', 'house_b', 'house_c', 'house_d'], shop: ['shop_a', 'shop_b', 'shop_c'], tower: ['tower_a', 'tower_b'], sky: ['sky_a', 'sky_b'], car: ['car_a', 'car_b', 'car_c', 'car_e'], bus: ['bus_k'] }

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
  if (theme.city === 'ny') K.castle = liberty()
  if (theme.city === 'vegas') {
    K.castle = bigWheel()
    K.tree = { r: 1.05, tint: true, parts: palmParts() }
    K.pool = { r: 2.1, parts: [box(4.2, 0.3, 2.8, 0xf4f1ea, 0, 0.15), box(3.6, 0.32, 2.2, 0x3fc3e6, 0, 0.17), box(0.9, 0.2, 0.4, 0xffffff, -2.6, 0.3, 1), box(0.9, 0.2, 0.4, 0xffffff, -2.6, 0.3, -1)] }
    // themed resorts (no gaming signs): a black glass pyramid, a toy castle, a tall curved hotel
    K.sky = { r: 9, tint: true, parts: [box(12, 30, 5, TINT, 0, 15, -3), box(5, 30, 10, TINT, -3.5, 15, 1), box(12.6, 1, 5.6, 0xe8c050, 0, 30.5, -3), box(5.6, 1, 10.6, 0xe8c050, -3.5, 30.5, 1)].concat(Array.from({ length: 12 }, (_, k) => box(12.1, 0.5, 0.1, 0x8fb4c8, 0, 2 + k * 2.3, -0.45))) }
    K.pyramid = { r: 9, parts: [paint(new THREE.ConeGeometry(9.2, 18, 4).rotateY(Math.PI / 4).translate(0, 9, 0), 0x2a2a3a), paint(new THREE.ConeGeometry(1, 2, 4).rotateY(Math.PI / 4).translate(0, 17.2, 0), 0xfff0a8), box(4, 4, 3, 0xd9b46c, 0, 2, 7.5)] }
    const fort = [box(12, 9, 10, 0xf4f1ea, 0, 4.5)]
    for (const [x, z, c] of [[-5.5, -4.5, 0xd8402e], [5.5, -4.5, 0x3f7fd0], [-5.5, 4.5, 0xf2c14e], [5.5, 4.5, 0x3fae6a], [0, 0, 0xd8402e]]) fort.push(cyl(x || z ? 1.8 : 2.6, x || z ? 13 : 17, 0xf4f1ea, (x || z ? 13 : 17) / 2, 10, x, z), cone(x || z ? 2.2 : 3, 4, c, (x || z ? 13 : 17) + 2, 10, x, z))
    K.fort = { r: 9, parts: fort }
    K.minitower = { r: 6.6, parts: eiffel().parts.map((g) => g.scale(0.5, 0.5, 0.5)) }
  }
  if (theme.city === 'toronto') {
    K.castle = cnTower()
    K.stadium = { r: 9, parts: [cyl(11, 6, 0xe2e2de, 3, 24), cyl(11.2, 0.6, 0x3f7fd0, 6.2, 24), paint(new THREE.SphereGeometry(10.6, 24, 8, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.38, 1).translate(0, 6.4, 0), 0xd8dce0)].concat(Array.from({ length: 6 }, (_, k) => paint(new THREE.BoxGeometry(0.2, 0.25, 21).rotateY((k / 6) * Math.PI).translate(0, 9.6, 0), 0xb8bcc0))) }
    K.bus = { r: 3, tint: true, parts: [box(5.6, 1.6, 1.7, TINT, 0, 1.15), box(5.2, 0.6, 1.74, GLASS, 0, 1.45), box(5.64, 0.25, 1.74, 0xffffff, 0, 0.6), box(0.1, 0.9, 0.1, DARK, 0, 2.4), box(1.6, 0.06, 0.06, DARK, 0, 2.85), box(0.8, 0.5, 1.8, DARK, -1.8, 0.25), box(0.8, 0.5, 1.8, DARK, 1.8, 0.25)] }
  }
  if (theme.city === 'nice') {
    K.castle = grandHotel()
    K.tree = { r: 1.05, tint: true, parts: palmParts() }
    K.chair = { r: 0.42, parts: [box(0.5, 0.06, 0.5, 0x2f7fd0, 0, 0.42), box(0.5, 0.5, 0.06, 0x2f7fd0, 0, 0.7, -0.22), box(0.06, 0.42, 0.06, 0xdfe6ee, -0.2, 0.21, 0.2), box(0.06, 0.42, 0.06, 0xdfe6ee, 0.2, 0.21, 0.2)] }
    K.parasol = { r: 0.85, parts: [cyl(0.05, 1.4, DARK, 0.7, 5), cone(0.9, 0.42, 0xf2f2f2, 1.5, 8), cone(0.6, 0.3, 0x2f7fd0, 1.62, 8)] }
    K.fountain = { r: 2.1, parts: [cyl(2.1, 0.6, 0xe8e0cc, 0.3, 14), cyl(1.8, 0.1, 0x6fc3e6, 0.62, 14), box(0.7, 3, 0.7, 0xf2f2ee, 0, 2), ball(0.4, 0xf2f2ee, 3.7)] }
  }
  if (theme.city === 'dubai') {
    K.castle = supertall()
    K.tree = { r: 1.05, tint: true, parts: palmParts() }
    K.vend = { r: 0.42, parts: [box(0.7, 1.45, 0.55, 0xf2f2f2, 0, 0.72), box(0.56, 0.7, 0.04, 0xbfe6ff, 0, 0.95, 0.29)] }
    K.camel = { r: 0.85, parts: [box(1.3, 0.55, 0.5, 0xc79a5a, 0, 1.15), ball(0.32, 0xb8894c, 1.55), box(0.18, 0.8, 0.18, 0xc79a5a, 0.75, 1.5), box(0.4, 0.3, 0.28, 0xc79a5a, 0.95, 1.95), box(0.12, 0.9, 0.12, 0x9a7442, -0.45, 0.45), box(0.12, 0.9, 0.12, 0x9a7442, 0.45, 0.45)] }
    // the sail hotel: a white sail on a tall frame, the helipad near the top
    K.sail = { r: 9, parts: [box(9, 1.2, 9, 0xe8e2d4, 0, 0.6), paint(new THREE.ConeGeometry(5.6, 30, 3).rotateY(Math.PI / 6).scale(1, 1, 0.45).translate(0.6, 16, 0), 0xf6f6f2), strut(-3.4, 1.2, 0, -1.2, 31, 0, 0.9, 0xcfd6dd), strut(-3.4, 1.2, 1.6, -1.2, 31, 0.4, 0.5, 0xcfd6dd), cyl(1.8, 0.3, 0xd8d8d4, 26, 12, -4.4), box(0.4, 4, 0.4, 0xcfd6dd, -1.2, 32)] }
    K.mall = { r: 6.6, parts: [box(12, 5, 9, 0xe9dcc2, 0, 2.5), box(12.4, 0.6, 9.4, 0xcfc2a6, 0, 5.3), box(10, 2.4, 0.1, 0x8fd8ff, 0, 2.2, 4.55), box(4, 3, 4, 0xd8e2ea, 2, 7)] }
    K.villa = { r: 3.2, parts: [box(4, 2.2, 3.2, 0xf4f1ea, 0, 1.1), box(4.4, 0.25, 3.6, 0xd8c8a8, 0, 2.3), box(2.4, 1.4, 2, 0xf4f1ea, -0.6, 3.1), box(1.6, 0.06, 1.2, 0x4fc3e6, 1.4, 0.05, 2.4)] }
  }
  if (theme.city === 'seoul') {
    const TILE = 0x4a5650, WOOD = 0x8a4a32, PAINT = 0x3f8f7a, STONE = 0xb9b2a4, PLASTER = 0xf2ede2
    K.castle = namsanTower()
    K.vend = { r: 0.42, parts: [box(0.7, 1.45, 0.55, pick([0xf2f2f2, 0x2f6fd0, 0xd8402e]), 0, 0.72), box(0.56, 0.7, 0.04, 0xbfe6ff, 0, 0.95, 0.29)] }
    // a street tent stall: orange plastic, a table and stools under it
    K.parasol = { r: 0.85, parts: [box(1.4, 0.06, 1.4, 0xff7a2a, 0, 1.6), box(1.3, 1, 0.04, 0xff8f45, 0, 1.1, -0.65), box(0.8, 0.5, 0.6, 0x2f6fd0, 0, 0.25), box(0.25, 0.3, 0.25, 0xd8402e, 0.6, 0.15)] }
    const curved = (w, d, y, c) => [roof(w, 1.2, d, c, y), box(w + 0.8, 0.25, d + 0.8, c, 0, y), box(0.4, 0.5, 0.4, c, -(w + 0.6) / 2, y + 0.3, (d + 0.6) / 2), box(0.4, 0.5, 0.4, c, (w + 0.6) / 2, y + 0.3, (d + 0.6) / 2), box(0.4, 0.5, 0.4, c, -(w + 0.6) / 2, y + 0.3, -(d + 0.6) / 2), box(0.4, 0.5, 0.4, c, (w + 0.6) / 2, y + 0.3, -(d + 0.6) / 2)]
    K.hanok = { r: 3.2, parts: [box(4.2, 0.5, 3.4, STONE, 0, 0.25), box(3.6, 1.9, 2.8, PLASTER, 0, 1.45), box(3.7, 0.25, 2.9, WOOD, 0, 2.3), box(1, 1.3, 0.06, WOOD, 0, 1.15, 1.42), ...curved(4.2, 3.4, 2.55, TILE)] }
    K.apt = { r: 6.6, parts: [box(12, 15, 4, 0xf3f1ea, 0, 7.5), box(12.2, 0.6, 4.2, 0x9aa3ad, 0, 15.3), box(2, 1.6, 2, 0xd8dde2, -4, 16.3)].concat(Array.from({ length: 6 }, (_, k) => box(11.4, 0.5, 0.1, 0x8fb4c8, 0, 2 + k * 2.3, 2.05))).concat([box(1.6, 1.4, 0.1, 0x3f7fd0, 4.6, 13.4, 2.06)]) }
    K.lotte = { r: 9, parts: [paint(new THREE.CylinderGeometry(1.2, 5.4, 52, 4).rotateY(Math.PI / 4).translate(0, 26, 0), 0xdfe8ef), box(7.8, 3, 7.8, 0xc9d3dc, 0, 1.5), paint(new THREE.CylinderGeometry(0.2, 1.2, 5, 4).rotateY(Math.PI / 4).translate(0, 54.5, 0), 0xe8edf2)] }
  }
  if (theme.city === 'tokyo') {
    const RED = 0xd83a2e, WHITE2 = 0xf4f4f0, DARKR = 0x3a3a44
    K.castle = tokyoTower()
    K.vend = { r: 0.42, parts: [box(0.7, 1.45, 0.55, pick([0xf2f2f2, 0x2f6fd0, 0xd8402e]), 0, 0.72), box(0.56, 0.7, 0.04, 0xbfe6ff, 0, 0.95, 0.29), box(0.56, 0.18, 0.04, 0x232030, 0, 0.35, 0.29)] }
    // the castle keep: a sloping stone base, white storeys under dark curved roofs, gold fish on the top
    const keep = [paint(new THREE.CylinderGeometry(3.6, 4.8, 3.2, 4).rotateY(Math.PI / 4).translate(0, 1.6, 0), 0x9a958a)]
    for (let k = 0; k < 4; k++) { const w = 5.4 - k * 0.9, y = 3.2 + k * 2.5; keep.push(box(w, 1.9, w * 0.85, WHITE2, 0, y + 0.95), box(w + 1.6, 0.35, w * 0.85 + 1.6, DARKR, 0, y + 2.05), roof(w + 1.2, 0.5, w * 0.85 + 1.2, DARKR, y + 2.2)) }
    keep.push(box(0.9, 0.5, 0.2, 0xe8c050, -0.9, 13.6), box(0.9, 0.5, 0.2, 0xe8c050, 0.9, 13.6))
    K.keep = { r: 6.6, parts: keep }
    K.yagura = { r: 4.4, parts: [paint(new THREE.CylinderGeometry(3.2, 3.9, 1.6, 4).rotateY(Math.PI / 4).translate(0, 0.8, 0), 0x9a958a), box(6, 2.8, 4.4, WHITE2, 0, 3), roof(7.2, 2, 5.6, DARKR, 4.4), box(7.4, 0.3, 5.8, DARKR, 0, 4.5)] }
    K.gate = { r: 2.1, parts: [box(0.45, 3, 0.45, 0x5a3a26, -1.5, 1.5), box(0.45, 3, 0.45, 0x5a3a26, 1.5, 1.5), box(3.8, 0.4, 0.6, 0x5a3a26, 0, 2.9), roof(4.6, 1, 1.6, DARKR, 3.1)] }
    K.parasol = { r: 0.85, parts: [box(1.2, 0.8, 0.9, 0xc78a4a, 0, 0.4), box(1.4, 0.1, 1.1, RED, 0, 1.5), cyl(0.04, 0.8, DARK, 1.1, 4, 0.55, 0.45), box(0.4, 0.5, 0.4, 0xfff0a8, 0, 1.2, 0.5)] }
  }
  if (theme.city === 'cairo') {
    const SAND = 0xe3c27a, SAND2 = 0xcfa95e, CAP = 0xf4e2b0
    const pyramid = (half, h) => [paint(new THREE.ConeGeometry(half * Math.SQRT2, h, 4).rotateY(Math.PI / 4).translate(0, h / 2, 0), SAND), paint(new THREE.ConeGeometry(half * 0.2 * Math.SQRT2, h * 0.2, 4).rotateY(Math.PI / 4).translate(0, h * 0.9, 0), CAP), box(half * 2.1, 0.4, half * 2.1, SAND2, 0, 0.2)]
    K.castle = { r: 13.5, parts: pyramid(9.6, 25) }
    K.sky = { r: 9, parts: pyramid(6.4, 17) }
    K.tower = { r: 6.6, parts: pyramid(4.7, 12) }
    // lying lion body, the head raised over the front paws, facing the camera
    K.sphinx = { r: 5.2, parts: [box(2.6, 1.6, 6, SAND, 0, 0.8, -1.4), box(2.2, 1.5, 1.8, SAND, 0, 2.2, 1.1), box(1.5, 1.7, 1.4, SAND2, 0, 3.4, 1.3), box(2.3, 0.45, 1.6, 0x4a6fb0, 0, 3.9, 1.1), box(0.7, 0.6, 2.4, SAND, -0.75, 0.3, 2.6), box(0.7, 0.6, 2.4, SAND, 0.75, 0.3, 2.6)].map((g) => g.scale(1.45, 1.45, 1.45)) }
    K.mastaba = { r: 3.2, parts: [paint(new THREE.CylinderGeometry(2, 2.6, 2.2, 4).rotateY(Math.PI / 4).translate(0, 1.1, 0), SAND2), box(1, 1.2, 0.2, 0x5a4a34, 0, 0.6, 1.85)] }
    K.camel = { r: 0.85, parts: [box(1.3, 0.55, 0.5, 0xc79a5a, 0, 1.15), ball(0.32, 0xb8894c, 1.55), box(0.18, 0.8, 0.18, 0xc79a5a, 0.75, 1.5), box(0.4, 0.3, 0.28, 0xc79a5a, 0.95, 1.95), box(0.12, 0.9, 0.12, 0x9a7442, -0.45, 0.45), box(0.12, 0.9, 0.12, 0x9a7442, 0.45, 0.45)] }
    // palms: a tall bending trunk and drooping fronds
    const palm = [paint(new THREE.CylinderGeometry(0.12, 0.2, 3.4, 6).rotateZ(0.12).translate(-0.2, 1.7, 0), 0x9a7442)]
    for (let k = 0; k < 6; k++) { const a = (k / 6) * Math.PI * 2; palm.push(paint(new THREE.BoxGeometry(1.7, 0.08, 0.45).translate(0.85, 0, 0).rotateZ(-0.45).rotateY(a).translate(-0.4, 3.4, 0), TINT)) }
    K.tree = { r: 1.05, tint: true, parts: palm }
    const hall = [box(7, 3.4, 6, 0xf0e2c4, 0, 1.7), box(7.4, 0.5, 6.4, 0xe2d0a8, 0, 3.65), box(5, 1.4, 4, 0xe8d6b0, 0, 4.6), box(5.4, 0.3, 4.4, 0xc9a878, 0, 5.4), box(1.6, 2.4, 1.6, 0xe8d6b0, 2.8, 4.9, 2.2), box(1.9, 0.4, 1.9, 0xc9a878, 2.8, 6.2, 2.2)]
    for (const x of [-2.2, 0, 2.2]) hall.push(box(1.2, 2, 0.1, 0x5a4a34, x, 1.3, 3.02), box(1.6, 0.12, 0.6, pick([0xd8402e, 0x3f7fd0, 0xf2c14e]), x, 2.5, 3.3))
    K.market = { r: 4.4, parts: hall }
    K.parasol = { r: 0.85, parts: [box(1.2, 0.7, 0.9, 0xc78a4a, 0, 0.35), cyl(0.04, 1.4, DARK, 0.7, 4, 0.5, 0.4), box(1.5, 0.08, 1.2, pick([0xd8402e, 0x3f7fd0, 0xf2c14e]), 0, 1.45)] }
  }
  if (theme.city === 'rome') {
    const MARBLE = 0xf1ead8, MARBLE2 = 0xd9cfb6
    K.castle = colosseum()
    K.tree = { r: 1.05, tint: true, parts: [cyl(0.14, 2.4, 0x8a5a33, 1.2, 6), paint(new THREE.SphereGeometry(1.25, 9, 6).scale(1, 0.42, 1).translate(0, 2.7, 0), TINT), paint(new THREE.SphereGeometry(0.8, 8, 5).scale(1, 0.45, 1).translate(0.5, 3, 0.2), TINT)] }
    K.column = { r: 0.85, parts: [box(0.9, 0.3, 0.9, MARBLE2, 0, 0.15), cyl(0.3, 1.9, MARBLE, 1.25, 8), box(0.8, 0.25, 0.8, MARBLE2, 0, 2.3)] }
    K.parasol = { r: 0.85, parts: [cyl(0.05, 1.3, DARK, 0.65, 5), cone(0.8, 0.4, 0xf2f2f2, 1.4, 8)] }
    K.fountain = { r: 2.1, parts: [cyl(2.1, 0.7, MARBLE2, 0.35, 14), cyl(1.8, 0.1, 0x6fc3e6, 0.72, 14), cyl(0.35, 1.6, MARBLE, 1.2, 8), cyl(0.8, 0.25, MARBLE2, 2, 10), cone(0.25, 0.7, 0xbfe9ff, 2.45, 6)] }
    const temple = [box(7, 0.9, 5, MARBLE2, 0, 0.45), box(6.4, 0.5, 4.4, MARBLE, 0, 1.15), box(6.6, 0.6, 4.6, MARBLE2, 0, 5.1), roof(6.6, 1.3, 4.6, MARBLE, 5.4), box(4.6, 3.4, 2.6, 0xc9bb98, 0, 3.1, -0.4)]
    for (const x of [-2.8, -1.4, 0, 1.4, 2.8]) temple.push(cyl(0.28, 3.4, MARBLE, 3.1, 8, x, 1.9))
    K.temple = { r: 4.4, parts: temple }
    const dome = [box(15, 1.6, 9, MARBLE2, 0, 0.8), box(13, 1.4, 7.6, MARBLE, 0, 2.3), box(12, 6, 4.4, MARBLE, 0, 6, -1.4), box(12.6, 0.8, 5, MARBLE2, 0, 9.4, -1.4), box(4, 4.6, 3, MARBLE, 0, 5.3, 1.6),
      box(1.6, 1.4, 2.4, 0x6f8a6a, -5.4, 10.5, -1.4), box(1.6, 1.4, 2.4, 0x6f8a6a, 5.4, 10.5, -1.4), box(1.4, 2.2, 1.4, 0xd9cfb6, 0, 8.6, 1.6)]
    for (let k = 0; k < 9; k++) dome.push(cyl(0.3, 5, MARBLE2, 5.8, 8, -5.2 + k * 1.3, 1.05))
    K.monument = { r: 6.6, parts: dome }
  }
  if (theme.city === 'paris') {
    K.castle = eiffel()
    K.parasol = { r: 0.85, parts: [cyl(0.05, 1.3, DARK, 0.65, 5), cone(0.8, 0.4, 0xe2574c, 1.4, 8)] }
    K.arc = { r: 5.2, parts: arcParts() }
    K.bus = { r: 3, tint: true, parts: [box(5, 1.6, 1.8, TINT, 0, 1.2), box(4.6, 0.6, 1.84, GLASS, 0, 1.45), box(5.04, 0.3, 1.84, 0x2a7a55, 0, 0.5), box(0.8, 0.6, 1.9, DARK, -1.6, 0.3), box(0.8, 0.6, 1.9, DARK, 1.6, 0.3)] }
  }
  if (theme.city === 'london') {
    K.castle = bigBen()
    const RED = 0xd8262e
    K.phone = { r: 0.65, parts: [box(0.62, 1.5, 0.62, RED, 0, 0.75), box(0.7, 0.14, 0.7, RED, 0, 1.57), box(0.5, 0.9, 0.64, GLASS, 0, 0.85), box(0.64, 0.9, 0.5, GLASS, 0, 0.85), box(0.5, 0.12, 0.66, WHITE, 0, 1.38)] }
    K.bus = { r: 3, tint: true, parts: [box(5, 1.35, 1.8, TINT, 0, 1.05), box(5, 1.25, 1.8, TINT, 0, 2.38), box(4.6, 0.55, 1.84, GLASS, 0, 1.25), box(4.6, 0.55, 1.84, GLASS, 0, 2.5), box(5.04, 0.12, 1.84, 0xf2d08a, 0, 1.78), box(0.8, 0.6, 1.9, DARK, -1.6, 0.3), box(0.8, 0.6, 1.9, DARK, 1.6, 0.3)] }
  }
  if (!CLASSIC && MODELS.tank) K.tank = { r: 2.2, shadow: true, geometry: kenney('tank') }
  const variants = theme.variants || VARIANTS, slate = !!theme.slate
  if (!CLASSIC) for (const base in variants) variants[base].forEach((name, i) => {
    const vehicle = base === 'car' || base === 'bus', high = base === 'tower' || base === 'sky'
    const walls = high && theme.towerWalls ? theme.towerWalls : theme.walls
    K[name] = { r: K[base].r, base, tint: high, shadow: true, geometry: kenney(name, vehicle ? null : walls[(i * 2 + base.length) % walls.length], vehicle ? null : theme.roofs[(i + base.length) % theme.roofs.length], slate, !!theme.trim, name === 'car_b' && theme.cab ? theme.cab : null, !!theme.zinc) }
  })
  return K
}
// New York's landmark, made from plain shapes: star fort, stone pedestal, the copper statue with torch and tablet.
function liberty() {
  const STONE = 0xd9cfb6, STONE2 = 0xc4b898, COPPER = 0x6cc8a6, COPPER2 = 0x55b391, FLAME = 0xffb020
  const turn = (g, z, x, y) => g.rotateZ(z).translate(x, y, 0)
  const parts = [
    cyl(13, 1.6, STONE2, 0.8, 11), cyl(10.5, 1.2, STONE, 2.2, 11),
    box(8.4, 9, 8.4, STONE, 0, 7.3), box(9.6, 1.1, 9.6, STONE2, 0, 12.3), box(6.6, 2.6, 6.6, STONE, 0, 14.1),
    box(8.6, 0.5, 0.2, 0x8a7e66, 0, 9, 4.25), box(1.6, 3, 0.2, 0x8a7e66, 0, 6, 4.25),
    paint(new THREE.CylinderGeometry(1.7, 3.1, 12, 10).translate(0, 21.4, 0), COPPER),
    paint(new THREE.CylinderGeometry(3.15, 3.3, 0.8, 10).translate(0, 15.8, 0), COPPER2),
    ball(2.05, COPPER, 27.4), ball(1.35, COPPER, 30.3), ball(0.62, COPPER2, 29.5, 0, 0.9),
    paint(new THREE.CylinderGeometry(1.45, 1.45, 0.45, 12).translate(0, 31.2, 0), COPPER2),
    paint(turn(new THREE.CylinderGeometry(0.5, 0.62, 6.2, 8), 0.28, -2.6, 31.8), COPPER),
    cyl(0.75, 0.9, 0xe8b545, 35.1, 8, -3.45), cone(0.7, 1.9, FLAME, 36.5, 7, -3.45),
    box(1.5, 2.8, 0.55, COPPER2, 2.35, 25.2, 1.2), paint(turn(new THREE.CylinderGeometry(0.42, 0.5, 3.4, 7), -0.5, 1.9, 25.6), COPPER),
  ]
  for (let i = 0; i < 7; i++) { const a = -1.05 + i * 0.35; parts.push(paint(new THREE.ConeGeometry(0.2, 1.5, 5).rotateZ(-a).translate(Math.sin(a) * 1.9, 31.2 + Math.cos(a) * 1.15, -0.2), COPPER2)) }
  return { r: 13.5, parts }
}

// ---------------------------------------------------------------- scene
const canvas = $('view')
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, stencil: true, powerPreference: 'high-performance' })
renderer.localClippingEnabled = true
const scene = new THREE.Scene()
const camera = new THREE.PerspectiveCamera(42, 1, 1, 900)
let sunLight = null
if (CLASSIC) {
  scene.add(new THREE.HemisphereLight(0xffffff, 0x9a8fc0, 1.9))
  const sun = new THREE.DirectionalLight(0xfff2d8, 1.5); sun.position.set(-0.5, 1, 0.7); scene.add(sun)
} else {
  // Filmic tone mapping keeps bright walls from clipping; a lower, warmer sun gives each face its own shade.
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.15
  scene.add(new THREE.HemisphereLight(0xeaf6ff, 0x7a6aa8, 1.7))
  // Real sun shadows for buildings and cars: a shadow box that follows the camera, drawn on a
  // see-through plane so the painted ground keeps its colours.
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap
  sunLight = new THREE.DirectionalLight(0xffe2b8, 2.4); sunLight.castShadow = true
  sunLight.shadow.mapSize.setScalar(matchMedia('(pointer: coarse)').matches ? 1024 : 2048); sunLight.shadow.bias = -0.0008; sunLight.shadow.normalBias = 0.04
  scene.add(sunLight, sunLight.target)
}
const SUN_DIR = new THREE.Vector3(-0.7, 1, 0.45).normalize()
function aimSun(x, z, span) {
  if (!sunLight) return
  sunLight.target.position.set(x, 0, z); sunLight.position.set(x + SUN_DIR.x * 120, SUN_DIR.y * 120, z + SUN_DIR.z * 120)
  const c = sunLight.shadow.camera
  if (c.right !== span) { c.left = -span; c.right = span; c.top = span; c.bottom = -span; c.near = 1; c.far = 260; c.updateProjectionMatrix() }
}

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
  scorch.count = 0; scorchAt = 0; scorchLast = { x: 1e9, z: 1e9 }
  for (const c of chunks) c.life = Math.min(c.life, 0.01)
  if (world.ground) { scene.remove(world.ground); world.ground.material.map.dispose(); world.ground.geometry.dispose(); world.ground.material.dispose() }
  if (world.shadow) { scene.remove(world.shadow, world.moving); world.shadow.geometry.dispose(); world.shadow.dispose(); world.moving.dispose() }
  if (world.far) { scene.remove(world.far); world.far.geometry.dispose(); world.far.material.dispose() }
  if (world.catcher) { scene.remove(world.catcher); world.catcher.geometry.dispose() }
  world.meshes = {}; world.items = []; world.movers = []; world.hash.clear()
}

const dummy = new THREE.Object3D()
// Tilt toward (dx, dz) in world space, then the item's own yaw. (Euler angles tilted in the item's own
// frame, so a building turned 90 degrees fell sideways or away from the hole.)
const Q_YAW = new THREE.Quaternion(), Q_TILT = new THREE.Quaternion(), UP = new THREE.Vector3(0, 1, 0), AXIS = new THREE.Vector3()
function tiltYaw(target, dx, dz, angle, yaw) {
  Q_YAW.setFromAxisAngle(UP, yaw)
  const len = Math.hypot(dx, dz)
  if (!len || !angle) { target.copy(Q_YAW); return target }
  AXIS.set(dz / len, 0, -dx / len); Q_TILT.setFromAxisAngle(AXIS, angle)
  return target.copy(Q_TILT).multiply(Q_YAW)
}
const SOLID = new THREE.MeshLambertMaterial({ vertexColors: true })
const PEOPLE = [0xff5d5d, 0x4a90e2, 0xffc145, 0x34c759, 0xb06cff, 0xff8fb1]
// Roads ({v: runs along z at x = at | along x at z = at, from a to b}) and painted areas of a town.
const NY = { ave: [-105, -75, -45, -15, 15, 45, 75, 105], st: [-99, -78, -57, -36, -15, 6, 27, 48], park: [-41, -95, 41, -61], shore: 62, island: [0, 90, 17] }
// River cities: a bending river (flow(x) = its centre line, river = half width), bridges, and rectangles kept free of streets.
const thames = (x) => 8 + 15 * Math.sin(x / 45 + 0.6)
const LDN = { ave: [-105, -75, -45, -15, 15, 45, 75, 105], st: [-102, -78, -54, -30, -6, 18, 42, 66, 90], bridges: [-75, 15, 75], river: 11, flow: thames, park: [-112, -112, -58, -59], square: [-66, -48, -24, -14] }
LDN.free = [LDN.park, LDN.square]
const seine = (x) => -4 + 17 * Math.sin(x / 52 - 0.3)
const PAR = { ave: [-105, -75, -45, -15, 15, 45, 75, 105], st: [-102, -78, -54, -30, -6, 18, 42, 66, 90], bridges: [-15, 45, 105], river: 9, flow: seine, mars: [-72, 2, -38, 64], etoile: [30, -42, 13] }
PAR.free = [PAR.mars, [PAR.etoile[0] - 11, PAR.etoile[1] - 8, PAR.etoile[0] + 11, PAR.etoile[1] + 8]]
const ROM = { ave: [-105, -80, -55, -30, -5, 20, 45, 70, 95], st: [-104, -82, -60, -38, -16, 6, 28, 50, 72, 94], bridges: [], river: -999, flow: () => 0, forum: [6, -12, 88, 44], peter: [-104, -40, -58, 6], navona: [-55, 50, -30, 72] }
ROM.free = [ROM.forum, ROM.peter]
ROM.colosseum = [64, 16]
const nile = (z) => 4 + 7 * Math.sin(z / 38)
const CAI = { ave: [-24, 30, 54, 78, 102], st: [-102, -80, -58, -36, -14, 8, 30, 52, 74, 96], bridges: [-58, 8, 74], river: 10, flow: nile, vertical: true, desert: [-130, -130, -36, 130], bazaar: [54, -36, 78, -14] }
CAI.free = [CAI.desert]
CAI.giza = [[-72, -34, 'castle'], [-60, 18, 'sky'], [-86, 50, 'tower']]
const TKY = { ave: [-104, -78, -52, -26, 0, 26, 52, 78, 104], st: [-100, -80, -60, -40, -20, 0, 20, 40, 60, 80, 100], bridges: [], river: -999, flow: () => 0,
  shinjuku: [-62, -64, -16, -16], tower: [22, 14, 60, 50], temple: [-104, 24, -56, 76], ueno: [56, -104, 112, -58], bay: 88 }
TKY.free = [TKY.shinjuku, TKY.tower, TKY.temple, TKY.ueno, [-200, TKY.bay, 200, 200]]
const hanRiver = (x) => 16 + 6 * Math.sin(x / 70 + 0.4)
const SEO = { ave: [-104, -78, -52, -26, 0, 26, 52, 78, 104], st: [-100, -78, -56, -34, -12, 10, 32, 54, 76, 98], bridges: [-78, -26, 26, 78, 104], river: 13, flow: hanRiver,
  namsan: [-12, -38, 17], hills: -96 }
SEO.free = [[SEO.namsan[0] - 19, SEO.namsan[1] - 19, SEO.namsan[0] + 19, SEO.namsan[1] + 19], [-200, -200, 200, SEO.hills]] // no palace: the user did not want to melt it
const DXB = { ave: [-104, -78, -52, -26, 0, 26, 52, 78, 104], st: [-54, -32, -10, 14, 38], bridges: [], river: -999, flow: () => 0,
  sea: -60, desert: 50, downtown: [-4, 18, 48, 50], palm: [-52, -96], sail: [58, -72] }
DXB.free = [[-200, -200, 200, DXB.sea], [-200, DXB.desert, 200, 200], DXB.downtown]
const VEG = { ave: [-104, -70, -36, 0, 36, 70, 104], st: [-100, -70, -40, -10, 20, 50, 80], bridges: [], river: -999, flow: () => 0,
  wheel: [38, -6, 66, 16], lake: [-34, -8, -4, 16] }
VEG.free = [[-200, -200, -88, 200], [88, -200, 200, 200], VEG.wheel, VEG.lake]
const TOR = { ave: [-104, -78, -52, -26, 0, 26, 52, 78, 104], st: [-100, -78, -56, -34, -12, 10, 32], bridges: [], river: -999, flow: () => 0,
  lake: 46, cn: [-14, 14, 44, 44], park: [-120, -120, -70, -60] }
TOR.free = [[-200, TOR.lake, 200, 200], TOR.cn, TOR.park]
const niceShore = (x) => 40 + (x / 110) * (x / 110) * 30
const NCE = { ave: [-104, -78, -52, -26, 0, 26, 52, 78, 104], st: [-100, -78, -56, -34, -12, 10, 32], bridges: [], river: 400, flow: (x) => niceShore(x) + 400,
  hill: [92, 18, 20], hotel: [-52, 14, -10, 40], plaza: [0, -34] }
NCE.free = [[NCE.hill[0] - 20, NCE.hill[1] - 20, NCE.hill[0] + 30, NCE.hill[1] + 26], NCE.hotel]
let RIVER = LDN
// Is (x, z) off the street grid? (the river unless a bridge crosses there, the parks and squares)
function riverBlocked(x, z, pad = 0, bridge = false) {
  if (!bridge && (RIVER.vertical ? Math.abs(x - RIVER.flow(z)) : Math.abs(z - RIVER.flow(x))) < RIVER.river + pad) return true
  for (const [x0, z0, x1, z1] of RIVER.free) if (x > x0 - pad && x < x1 + pad && z > z0 - pad && z < z1 + pad) return true
  return false
}
// A straight road cut into the pieces that stay on land (bridges keep crossing the river).
function cutRoad(road, bridge) {
  const out = []; let from = null
  for (let d = road.a; d <= road.b + 1; d += 1) {
    const x = road.v ? road.at : d, z = road.v ? d : road.at
    const free = d <= road.b && !(road.v ? riverBlocked(x, z, 3.5, bridge) || riverBlocked(x - 4, z, 3.5, bridge) || riverBlocked(x + 4, z, 3.5, bridge) : riverBlocked(x, z - 4, 3.5, bridge) || riverBlocked(x, z + 4, 3.5, bridge) || riverBlocked(x, z, 4.5, bridge))
    if (free && from === null) from = d
    if (!free && from !== null) { if (d - 1 - from > 8) out.push({ ...road, a: from, b: d - 1 }); from = null }
  }
  return out
}
function riverRoads(theme, roads, areas) {
  const vertical = !!RIVER.vertical
  for (const x of RIVER.ave) roads.push(...cutRoad({ v: true, at: x, a: -WORLD, b: WORLD }, !vertical && RIVER.bridges.includes(x)))
  for (const z of RIVER.st) roads.push(...cutRoad({ v: false, at: z, a: -WORLD, b: WORLD }, vertical && RIVER.bridges.includes(z)))
  const top = [], bottom = [], R = RIVER
  if (R.river <= 0) return
  // (a vertical river's outline: the same strip with x and z swapped)
  const pt = (along, off) => (vertical ? [R.flow(along) + off, along] : [along, R.flow(along) + off])
  for (let d = -WORLD - 22; d <= WORLD + 22; d += 4) { top.push(pt(d, -R.river)); bottom.unshift(pt(d, R.river)) }
  if (vertical) {
    areas.push({ poly: [...top.map(([x, z]) => [x - 1.5, z]), ...bottom.map(([x, z]) => [x + 1.5, z])], color: theme.sand })
    areas.push({ poly: [...top, ...bottom], color: theme.water, dots: theme.water2, inside: (x, z) => Math.abs(x - R.flow(z)) < R.river - 1 })
    return
  }
  areas.push({ poly: [...top.map(([x, z]) => [x, z - 1.5]), ...bottom.map(([x, z]) => [x, z + 1.5])], color: theme.sand })
  areas.push({ poly: [...top, ...bottom], color: theme.water, dots: theme.water2, inside: (x, z) => Math.abs(z - R.flow(x)) < R.river - 1 })
}
function cityPlan(theme) {
  const roads = [], areas = []
  if (theme.city === 'ny') {
    // Manhattan: long avenues north-south, close cross streets, Central Park cut out of the grid, the harbour and Liberty Island to the south.
    const [px0, pz0, px1, pz1] = NY.park
    for (const x of NY.ave) {
      if (x > px0 && x < px1) roads.push({ v: true, at: x, a: pz1 - 4, b: NY.st.at(-1) })
      else roads.push({ v: true, at: x, a: -WORLD, b: NY.st.at(-1) })
    }
    for (const z of NY.st) {
      if (z > pz0 && z < pz1) { roads.push({ v: false, at: z, a: -WORLD, b: px0 - 4 }, { v: false, at: z, a: px1 + 4, b: WORLD }) }
      else roads.push({ v: false, at: z, a: -WORLD, b: WORLD })
    }
    areas.push({ rect: [-400, NY.shore, 400, 400], color: theme.water, dots: theme.water2 })
    areas.push({ rect: [px0, pz0, px1, pz1], color: theme.park, dots: theme.park2 })
    areas.push({ rect: [-400, NY.st.at(-1) + 4, 400, NY.shore], color: theme.park, dots: theme.park2 })
    areas.push({ circle: [NY.island[0], NY.island[1], NY.island[2] + 2.5], color: theme.sand })
    areas.push({ circle: NY.island, color: theme.park, dots: theme.park2 })
    areas.push({ circle: [-8, -78, 9], color: theme.water, dots: theme.water2 }) // the reservoir
    areas.push({ path: [[px0 + 3, pz0 + 3], [-20, -70], [12, -88], [px1 - 3, pz1 - 3]], color: theme.path })
    areas.push({ path: [[px0 + 3, pz1 - 4], [-2, -64], [26, -80], [px1 - 4, pz0 + 4]], color: theme.path })
    areas.push({ path: [[-WORLD, NY.st.at(-1) + 9], [WORLD, NY.st.at(-1) + 9]], color: theme.path })
    return { roads, areas, start: theme.start }
  }
  if (theme.city === 'vegas') {
    // The Strip: a wide boulevard of huge themed resorts with pools; the fountain lake and the big wheel on either side; suburbs; desert at the edges.
    RIVER = VEG; riverRoads(theme, roads, areas)
    roads.push({ v: true, at: 8, a: -WORLD, b: WORLD }) // the Strip has two carriageways
    areas.push({ rect: [-200, -200, -88, 200], color: theme.sand2, dots: theme.sand3 }, { rect: [88, -200, 200, 200], color: theme.sand2, dots: theme.sand3 })
    areas.push({ rect: VEG.lake, color: theme.walk }, { rect: [VEG.lake[0] + 3, VEG.lake[1] + 3, VEG.lake[2] - 3, VEG.lake[3] - 4], color: theme.water, dots: theme.water2 })
    areas.push({ rect: VEG.wheel, color: theme.walk }, { circle: [52, 5, 8], color: theme.park, dots: theme.park2 })
    return { roads, areas, start: theme.start }
  }
  if (theme.city === 'toronto') {
    // Lake Ontario to the south with green islands; the tall concrete tower and the domed stadium on the lakeshore; downtown glass; maple streets.
    RIVER = TOR; riverRoads(theme, roads, areas)
    areas.push({ rect: [-200, TOR.lake, 200, 200], color: theme.water, dots: theme.water2 }, { rect: [-200, TOR.lake - 2, 200, TOR.lake + 1], color: theme.sand })
    for (const [x, z, r] of [[-60, 78, 16], [-24, 86, 12], [12, 80, 10], [70, 84, 14]]) areas.push({ circle: [x, z, r + 1.5], color: theme.sand }, { circle: [x, z, r], color: theme.park, dots: theme.park2 })
    areas.push({ rect: TOR.cn, color: theme.walk }, { rect: TOR.park, color: theme.park, dots: theme.park2 }, { circle: [-92, -84, 7], color: theme.water, dots: theme.water2 })
    return { roads, areas, start: theme.start }
  }
  if (theme.city === 'nice') {
    // The curved bay with its pebble beach and palm promenade; the colourful old town; the castle hill at the east end; the grand hotel.
    RIVER = NCE; riverRoads(theme, roads, areas)
    const sea = [], beach = []
    for (let x = -WORLD - 22; x <= WORLD + 22; x += 4) { sea.push([x, niceShore(x)]); beach.push([x, niceShore(x) - 4]) }
    areas.push({ poly: [...beach, [WORLD + 22, 400], [-WORLD - 22, 400]], color: theme.sand })
    areas.push({ poly: [...sea, [WORLD + 22, 400], [-WORLD - 22, 400]], color: theme.water, dots: theme.water2, inside: (x, z) => z > niceShore(x) + 1 })
    areas.push({ poly: [...beach.map(([x, z]) => [x, z - 5]), ...beach.slice().reverse()], color: theme.walk })
    const [hx, hz, hr] = NCE.hill
    areas.push({ circle: [hx, hz, hr + 3], color: theme.hill }, { circle: [hx, hz, hr - 4], color: theme.park, dots: theme.park2 })
    areas.push({ rect: NCE.hotel, color: theme.walk })
    areas.push({ checker: [NCE.plaza[0], NCE.plaza[1], 9] })
    return { roads, areas, start: theme.start }
  }
  if (theme.city === 'dubai') {
    // The gulf to the north with the palm-shaped island and the sail hotel on its own islet; the towers along the big road; downtown with the
    // supertall over a fountain lake; the dunes to the south.
    RIVER = DXB; riverRoads(theme, roads, areas)
    areas.push({ rect: [-200, -200, 200, DXB.sea], color: theme.water, dots: theme.water2 }, { rect: [-200, DXB.sea, 200, DXB.sea + 3], color: theme.sand })
    areas.push({ rect: [-200, DXB.desert, 200, 200], color: theme.sand2, dots: theme.sand3 })
    const [px, pz] = DXB.palm
    areas.push({ path: [[px, DXB.sea + 1], [px, pz + 8]], color: theme.sand, width: 6 })
    for (let k = 0; k < 8; k++) { const a = Math.PI * (1.08 + k * 0.12); areas.push({ path: [[px, pz + 8], [px + Math.cos(a) * 26, pz + 8 + Math.sin(a) * 20]], color: theme.sand, width: 4.5 }) }
    areas.push({ arc: [px, pz + 2, 34, Math.PI * 1.02, Math.PI * 1.98], color: theme.sand, width: 4 })
    areas.push({ circle: [DXB.sail[0], DXB.sail[1], 11], color: theme.sand }, { path: [[DXB.sail[0], DXB.sea + 1], [DXB.sail[0], DXB.sail[1] + 8]], color: theme.walk, width: 3 })
    const [dx0, dz0, dx1, dz1] = DXB.downtown
    areas.push({ rect: DXB.downtown, color: theme.walk }, { circle: [(dx0 + dx1) / 2 - 6, (dz0 + dz1) / 2 + 4, 10], color: theme.water, dots: theme.water2 })
    return { roads, areas, start: theme.start }
  }
  if (theme.city === 'seoul') {
    // The wide Han with many bridges and green parks on both banks; Namsan's wooded hill and its tower north of the river; hanok houses below the
    // northern mountains; apartment towns and glass towers on the south bank.
    RIVER = SEO
    areas.push({ rect: [-200, -200, 200, SEO.hills], color: theme.hill, dots: theme.hill2 })
    const [nx, nz, nr] = SEO.namsan
    areas.push({ circle: [nx, nz, nr + 2], color: theme.hill }, { circle: [nx, nz, nr - 3], color: theme.hill2 }, { circle: [nx, nz, nr - 8], color: theme.park })
    const bank = []
    for (let x = -WORLD - 22; x <= WORLD + 22; x += 4) bank.push([x, hanRiver(x)])
    areas.push({ poly: [...bank.map(([x, z]) => [x, z - SEO.river - 6]), ...bank.slice().reverse().map(([x, z]) => [x, z + SEO.river + 6])], color: theme.park, dots: theme.park2, inside: (x, z) => Math.abs(z - hanRiver(x)) < SEO.river + 6 })
    riverRoads(theme, roads, areas)
    return { roads, areas, start: theme.start }
  }
  if (theme.city === 'tokyo') {
    // Dense small blocks; the skyscraper district (Shinjuku), the red-and-white tower in its park, a temple ground, a cherry park, the bay to the south.
    RIVER = TKY; riverRoads(theme, roads, areas)
    areas.push({ rect: [-200, TKY.bay, 200, 200], color: theme.water, dots: theme.water2 })
    areas.push({ rect: [-200, TKY.bay - 2, 200, TKY.bay], color: theme.sand })
    areas.push({ rect: TKY.shinjuku, color: theme.walk })
    areas.push({ rect: TKY.tower, color: theme.park, dots: theme.park2 }, { circle: [41, 31, 15], color: theme.walk })
    areas.push({ rect: TKY.temple, color: theme.path }, { path: [[-80, 74], [-80, 36]], color: theme.walk, width: 5 })
    areas.push({ rect: TKY.ueno, color: theme.park, dots: theme.blossom }, { circle: [84, -80, 9], color: theme.water, dots: theme.water2 })
    areas.push({ scramble: [0, 0] })
    return { roads, areas, start: theme.start }
  }
  if (theme.city === 'cairo') {
    // The Nile runs north-south; green fields on its west bank, then the desert with the pyramids of Giza and the Sphinx; the city on the east bank.
    RIVER = CAI
    areas.push({ rect: CAI.desert, color: theme.sand2, dots: theme.sand3 })
    areas.push({ rect: [CAI.desert[2], -130, 14, 130], color: theme.park, dots: theme.park2 })
    riverRoads(theme, roads, areas)
    for (const [x, z] of CAI.giza) areas.push({ circle: [x, z, 15], color: theme.sand3 })
    areas.push({ path: [[CAI.desert[2], 8], [-72, 8], [-72, -18]], color: theme.walk, width: 5 })
    areas.push({ rect: CAI.bazaar, color: theme.path })
    return { roads, areas, start: theme.start }
  }
  if (theme.city === 'rome') {
    // Old Rome: small blocks of ochre and terracotta, the Colosseum beside the Forum's ruins, St Peter's square in the west.
    RIVER = ROM; riverRoads(theme, roads, areas)
    const [fx0, fz0, fx1, fz1] = ROM.forum, [qx0, qz0, qx1, qz1] = ROM.peter
    areas.push({ rect: ROM.forum, color: theme.path, dots: theme.grass2 })
    areas.push({ rect: [fx1 - 40, fz0 + 2, fx1 - 2, fz1 - 2], color: theme.park, dots: theme.park2 })
    areas.push({ circle: [ROM.colosseum[0], ROM.colosseum[1], 17], color: theme.walk })
    areas.push({ rect: ROM.peter, color: theme.walk })
    areas.push({ circle: [(qx0 + qx1) / 2, (qz0 + qz1) / 2 + 6, 15], color: theme.path })
    areas.push({ path: [[fx0 + 4, (fz0 + fz1) / 2], [fx1 - 40, (fz0 + fz1) / 2]], color: theme.walk, width: 4 })
    return { roads, areas, start: theme.start }
  }
  if (theme.city === 'paris') {
    // The Seine bends through; the Eiffel Tower at the river end of the long Champ de Mars; the Arc de Triomphe on its round square to the north.
    RIVER = PAR; riverRoads(theme, roads, areas)
    const [mx0, mz0, mx1, mz1] = PAR.mars, [ex, ez, er] = PAR.etoile
    areas.push({ rect: PAR.mars, color: theme.path })
    areas.push({ rect: [mx0 + 4, mz0 + 26, mx1 - 4, mz1 - 3], color: theme.park, dots: theme.park2 })
    areas.push({ rect: [(mx0 + mx1) / 2 - 1.2, mz0 + 26, (mx0 + mx1) / 2 + 1.2, mz1 - 3], color: theme.path })
    areas.push({ circle: [ex, ez, er], color: theme.road }, { circle: [ex, ez, er - 5], color: theme.walk }, { circle: [ex, ez, er - 6], color: theme.park, dots: theme.park2 })
    return { roads, areas, start: theme.start }
  }
  if (theme.city === 'london') {
    // The Thames bends across the middle; three bridges; Westminster (Parliament + clock tower) on the north bank, Hyde Park in the north-west.
    RIVER = LDN; riverRoads(theme, roads, areas)
    const [px0, pz0, px1, pz1] = LDN.park
    areas.push({ rect: LDN.park, color: theme.park, dots: theme.park2 })
    areas.push({ path: [[px0 + 16, pz1 - 12], [px0 + 28, pz1 - 22], [px1 - 10, pz0 + 22]], color: theme.water, width: 6 }) // the Serpentine
    areas.push({ path: [[px0 + 14, pz0 + 8], [px1 - 4, pz1 - 4]], color: theme.path }, { path: [[px0 + 14, pz1 - 3], [px1 - 3, pz0 + 16]], color: theme.path })
    areas.push({ rect: LDN.square, color: theme.park, dots: theme.park2 })
    return { roads, areas, start: theme.start }
  }
  const half = ((GRID - 1) / 2) * PITCH
  for (let i = 0; i <= GRID; i++) { const at = -half - PITCH / 2 + i * PITCH; roads.push({ v: true, at, a: -WORLD, b: WORLD }, { v: false, at, a: -WORLD, b: WORLD }) }
  return { roads, areas, start: [PITCH * 0.5, PITCH * 1.5] }
}
function cityTexture(theme, plan) {
  const size = 2048, c = document.createElement('canvas'); c.width = c.height = size
  const g = c.getContext('2d'), s = size / (WORLD * 2 + 40), W = (x) => (x + WORLD + 20) * s
  g.fillStyle = theme.grass; g.fillRect(0, 0, size, size)
  g.fillStyle = theme.grass2
  for (let i = 0; i < 500; i++) g.fillRect(Math.random() * size, Math.random() * size, 6 + Math.random() * 14, 6 + Math.random() * 14)
  const dots = (color, inside) => { g.fillStyle = color; for (let i = 0; i < 2500; i++) { const x = Math.random() * size, y = Math.random() * size; if (inside(x / s - WORLD - 20, y / s - WORLD - 20)) { g.beginPath(); g.ellipse(x, y, 8 + Math.random() * 16, 4 + Math.random() * 8, 0, 0, 7); g.fill() } } }
  for (const area of plan.areas) {
    g.fillStyle = area.color
    if (area.rect) { const [x0, z0, x1, z1] = area.rect; g.fillRect(W(x0), W(z0), (x1 - x0) * s, (z1 - z0) * s); if (area.dots) dots(area.dots, (x, z) => x > x0 && x < x1 && z > z0 && z < z1) }
    if (area.circle) { const [x, z, r] = area.circle; g.beginPath(); g.arc(W(x), W(z), r * s, 0, 7); g.fill(); if (area.dots) dots(area.dots, (a, b) => Math.hypot(a - x, b - z) < r - 1) }
    if (area.poly) { g.beginPath(); area.poly.forEach(([x, z], i) => (i ? g.lineTo(W(x), W(z)) : g.moveTo(W(x), W(z)))); g.closePath(); g.fill(); if (area.dots && area.inside) dots(area.dots, area.inside) }
    if (area.arc) { const [x, z, r, a0, a1] = area.arc; g.strokeStyle = area.color; g.lineWidth = (area.width || 2.6) * s; g.beginPath(); g.arc(W(x), W(z), r * s, a0, a1); g.stroke() }
    if (area.path) { g.strokeStyle = area.color; g.lineWidth = (area.width || 2.6) * s; g.lineCap = 'round'; g.beginPath(); area.path.forEach(([x, z], i) => (i ? g.lineTo(W(x), W(z)) : g.moveTo(W(x), W(z)))); g.stroke() }
  }
  const rect = (r, side, color) => { g.fillStyle = color; if (r.v) g.fillRect(W(r.at - side), W(r.a - side), side * 2 * s, (r.b - r.a + side * 2) * s); else g.fillRect(W(r.a - side), W(r.at - side), (r.b - r.a + side * 2) * s, side * 2 * s) }
  for (const r of plan.roads) rect(r, 4, theme.walk)
  for (const r of plan.roads) rect(r, 3, theme.road)
  // centre dashes, stopped short of every crossing; zebra crossings at each crossing
  const crossings = []
  for (const a of plan.roads) for (const b of plan.roads) if (a.v && !b.v && a.at >= b.a - 3 && a.at <= b.b + 3 && b.at >= a.a - 3 && b.at <= a.b + 3) crossings.push([a.at, b.at])
  const near = (x, z) => crossings.some(([cx, cz]) => Math.abs(cx - x) < 5 && Math.abs(cz - z) < 5)
  g.fillStyle = '#ffe28a'
  for (const r of plan.roads) for (let d = r.a; d < r.b; d += 5) { const x = r.v ? r.at : d + 1, z = r.v ? d + 1 : r.at; if (near(x, z)) continue; if (r.v) g.fillRect(W(r.at - 0.13), W(d), 0.26 * s, 2.2 * s); else g.fillRect(W(d), W(r.at - 0.13), 2.2 * s, 0.26 * s) }
  g.fillStyle = 'rgba(255,255,255,0.85)'
  for (const [x, z] of crossings) for (let k = -2.4; k <= 2.4; k += 1.2) {
    g.fillRect(W(x + k - 0.3), W(z - 4.6), 0.6 * s, 1.4 * s); g.fillRect(W(x + k - 0.3), W(z + 3.2), 0.6 * s, 1.4 * s)
    g.fillRect(W(x - 4.6), W(z + k - 0.3), 1.4 * s, 0.6 * s); g.fillRect(W(x + 3.2), W(z + k - 0.3), 1.4 * s, 0.6 * s)
  }
  for (const area of plan.areas) if (area.checker) {
    const [x, z, r] = area.checker
    for (let a = -r; a < r; a += 1.5) for (let b = -r; b < r; b += 1.5) { g.fillStyle = (Math.round(a / 1.5) + Math.round(b / 1.5)) % 2 ? '#f4efe4' : '#d9cdb6'; g.fillRect(W(x + a), W(z + b), 1.5 * s, 1.5 * s) }
  }
  for (const area of plan.areas) if (area.scramble) {
    // the famous all-way crossing: zebra stripes on both diagonals too
    const [x, z] = area.scramble
    g.save(); g.translate(W(x), W(z)); g.fillStyle = 'rgba(255,255,255,0.9)'
    for (const a of [Math.PI / 4, -Math.PI / 4]) { g.save(); g.rotate(a); for (let k = -3.6; k <= 3.6; k += 1.2) g.fillRect(k * s - 0.3 * s, -4 * s, 0.6 * s, 8 * s); g.restore() }
    g.restore()
  }
  const texture = new THREE.CanvasTexture(c)
  texture.colorSpace = THREE.SRGBColorSpace; texture.anisotropy = 4
  return texture
}
function layoutNY(theme, plan, add, records) {
  const walls = theme.walls, glass = theme.glass, leaf = theme.leaf
  const cols = NY.ave.slice(1).map((x, i) => (x + NY.ave[i]) / 2), rows = NY.st.slice(1).map((z, i) => (z + NY.st[i]) / 2)
  const [px0, pz0, px1, pz1] = NY.park
  const roofTank = (on, x, z) => { records[add('tank', x, z, rnd(0, 6.28))].on = on }
  rows.forEach((cz, j) => cols.forEach((cx, i) => {
    if (cx > px0 && cx < px1 && cz > pz0 && cz < pz1) return
    const mid = Math.abs(i - 3), fin = j === rows.length - 1, midtown = j === 2 || j === 3
    const kind = fin || midtown ? (mid <= 1 ? 'sky' : mid === 2 ? 'tower' : 'row') : j === 4 ? (mid <= 1 ? 'tower' : 'row') : j <= 1 ? (mid === 2 ? 'row' : 'brown') : (mid % 2 ? 'row' : 'brown')
    if (j === 3 && i === 3) { // Times Square: a plaza of bright kiosks, benches and a crowd
      for (const q of [[-7, -3], [7, -3], [-7, 3.5], [7, 3.5]]) add('kiosk', cx + q[0], cz + q[1], 0)
      for (let k = 0; k < 6; k++) add('bench', cx + rnd(-9, 9), cz + rnd(-5, 5), pick([0, 1.57]))
      for (let k = 0; k < 24; k++) add('person', cx + rnd(-10, 10), cz + rnd(-6, 6), rnd(0, 6), pick(PEOPLE), 1, true)
      for (let k = 0; k < 6; k++) add('lamp', cx + rnd(-10, 10), cz + pick([-6, 6]))
      return
    }
    if (kind === 'sky') { add('sky', cx - 4.2, cz, 0, pick(glass)); add('cottage', cx + 7.6, cz + 3.3, 0, pick(walls)); add('cottage', cx + 7.6, cz - 3.3, Math.PI, pick(walls)) }
    if (kind === 'tower') { add('tower', cx - 5.5, cz, 0, pick(glass)); add('house', cx + 6.5, cz - 3.3, Math.PI, pick(walls)); add('cottage', cx + 7.6, cz + 3.3, 0, pick(walls)) } // never two same towers side by side
    if (kind === 'row') {
      for (const q of [-7.3, 0, 7.3]) { const id = add('house', cx + q, cz + 3.3, 0, pick(walls)); if (Math.random() < 0.45) roofTank(id, cx + q + rnd(-1, 1), cz + 3.3 + rnd(-1, 1)) }
      for (const q of [-5.1, 5.1]) add('shop', cx + q, cz - 2.75, Math.PI, pick(walls))
    }
    if (kind === 'brown') {
      for (const side of [1, -1]) for (const q of [-8.1, -2.7, 2.7, 8.1]) { const id = add('cottage', cx + q, cz + side * 3.3, side > 0 ? 0 : Math.PI, pick(walls)); if (Math.random() < 0.25) roofTank(id, cx + q, cz + side * 3.3) }
      for (const q of [-9, -3, 3, 9]) add('tree', cx + q, cz + 6.2, 0, pick(leaf))
    }
  }))
  // Central Park: woods, meadow benches, a kiosk or two, people strolling
  for (let k = 0; k < 70; k++) { const x = rnd(px0 + 2, px1 - 2), z = rnd(pz0 + 2, pz1 - 2); if (Math.hypot(x + 8, z + 78) < 10.5) continue; add(Math.random() < 0.3 ? 'bigTree' : 'tree', x, z, rnd(0, 6), pick(leaf)) }
  for (let k = 0; k < 26; k++) add('bush', rnd(px0 + 1, px1 - 1), rnd(pz0 + 1, pz1 - 1))
  for (let k = 0; k < 12; k++) add('bench', rnd(px0 + 3, px1 - 3), rnd(pz0 + 3, pz1 - 3))
  for (let k = 0; k < 30; k++) add('person', rnd(px0 + 2, px1 - 2), rnd(pz0 + 2, pz1 - 2), rnd(0, 6), pick(PEOPLE), 1, true)
  add('kiosk', 20, -66, 0); add('kiosk', -30, -90, 0)
  // The Battery: a waterfront strip of trees, benches and people where the run starts, and Liberty out in the harbour
  const s0 = NY.st.at(-1) + 4.5, s1 = NY.shore - 1
  for (let x = -WORLD + 3; x < WORLD - 3; x += 4.2) {
    add(Math.random() < 0.5 ? 'tree' : 'bush', x + rnd(-1, 1), s0 + 1.8, rnd(0, 6), pick(leaf))
    if (Math.random() < 0.5) add('bench', x + rnd(-1, 1), s0 + 6.8, 0)
    if (Math.random() < 0.6) add('lamp', x, s1 - 0.6)
    if (Math.random() < 0.7) add('person', x + rnd(-2, 2), rnd(s0 + 3, s1 - 1), rnd(0, 6), pick(PEOPLE), 1, true)
  }
  add('castle', NY.island[0], NY.island[1] - 1, 0)
  for (let k = 0; k < 16; k++) { const a = (k / 16) * Math.PI * 2; add('tree', NY.island[0] + Math.cos(a) * 15, NY.island[1] + Math.sin(a) * 15, rnd(0, 6), pick(leaf)) }
  for (const q of [[-11, 11], [11, 11], [-11, -11], [11, -11]]) add('bench', NY.island[0] + q[0], NY.island[1] + q[1])
}
function blockCentres(cfg) { return { cols: cfg.ave.slice(1).map((x, i) => (x + cfg.ave[i]) / 2), rows: cfg.st.slice(1).map((z, i) => (z + cfg.st[i]) / 2) } }
function layoutVegas(theme, plan, add) {
  const walls = theme.walls, glass = theme.glass, leaf = theme.leaf
  const ok = (x, z, r) => !riverBlocked(x, z, r) && Math.abs(x - 4) > 6 + r
  const put = (kind, x, z, r, rot, color) => { if (ok(x, z, r)) add(kind, x, z, rot, color) }
  const { cols, rows } = blockCentres(VEG)
  const themes = ['pyramid', 'sky', 'fort', 'minitower', 'sky', 'pyramid']
  rows.forEach((cz, j) => cols.forEach((cx, i) => {
    if (Math.abs(cx) < 30) { // resorts on the Strip: one big themed hotel, a pool, palms
      const kind = themes[(j + (cx > 0 ? 3 : 0)) % themes.length], side = cx > 0 ? 1 : -1
      put(kind, cx + side * 3, cz - 1, 8.5, 0, pick(theme.towerWalls))
      put('pool', cx - side * 9, cz + 6, 2, 0); put('pool', cx - side * 9, cz - 6, 2, 0)
      for (const q of [-10, -3, 4, 11]) put('tree', cx - side * 12.5, cz + q, 0.8, 0, pick(leaf))
      return
    }
    if (j <= 1) { for (const q of [-7, 7]) put('shop', cx + q, cz, 4, 0, pick(walls)); return } // downtown's older streets
    // suburbs: houses with a pool and a palm
    for (const q of [-7, 7]) for (const side of [-1, 1]) { put(side > 0 ? 'house' : 'cottage', cx + q, cz + side * 5, 3.5, side > 0 ? 0 : Math.PI, pick(walls)); if (ok(cx + q + 3.6, cz, 1)) add('tree', cx + q + 3.6, cz + side * 1.5, 0, pick(leaf)) }
    put('pool', cx, cz, 1.6, 0)
  }))
  const [lx0, lz0, lx1, lz1] = VEG.lake
  for (let x = lx0 + 1.5; x < lx1; x += 3) { add('lamp', x, lz1 - 1.5); add('person', x + 1, lz1 - 0.5, rnd(0, 6), pick(PEOPLE), 1, true) }
  for (let k = 0; k < 8; k++) add('tree', lx0 + 1.2, lz0 + 2 + k * 3, 0, pick(leaf))
  add('castle', 52, 5, 0)
  for (let k = 0; k < 24; k++) add('person', rnd(40, 64), rnd(-4, 14), rnd(0, 6), pick(PEOPLE), 1, true)
  // desert edges: cacti-like bushes and a few palms
  for (let k = 0; k < 40; k++) { const x = pick([-1, 1]) * rnd(92, 108), z = rnd(-104, 104); add(Math.random() < 0.3 ? 'tree' : 'bush', x, z, 0, pick(leaf)) }
}
function layoutToronto(theme, plan, add) {
  const walls = theme.walls, glass = theme.glass, leaf = theme.leaf
  const ok = (x, z, r) => !riverBlocked(x, z, r)
  const put = (kind, x, z, r, rot, color) => { if (ok(x, z, r)) add(kind, x, z, rot, color) }
  const { cols, rows } = blockCentres(TOR)
  rows.forEach((cz, j) => cols.forEach((cx, i) => {
    const down = Math.abs(i - 4) <= 1 && j >= 2
    if (down) { if ((i + j) % 2) put('sky', cx, cz, 7, 0, pick(glass)); else { put('tower', cx - 5.5, cz, 4.5, 0, pick(glass)); put('tower', cx + 6, cz + 2, 3.6, Math.PI / 2, pick(glass)) } return }
    if (Math.abs(i - 4) === 2 && j >= 2) { for (const q of [-5.2, 5.2]) put('shop', cx + q, cz - 2.8, 3.4, Math.PI, pick(walls)); for (const q of [-5.6, 0, 5.6]) put('house', cx + q, cz + 3.8, 2.8, 0, pick(walls)); return }
    // Victorian streets with maples
    for (const side of [-1, 1]) for (const q of [-8.1, -2.7, 2.7, 8.1]) put('cottage', cx + q, cz + side * 3.6, 2.4, side > 0 ? 0 : Math.PI, pick(walls))
    for (const q of [-6, 0, 6]) if (ok(cx + q, cz + 7.2, 0.6)) add('tree', cx + q, cz + 7.2, 0, pick(leaf))
  }))
  // the lakeshore: the tower and the domed stadium, a promenade
  const [qx0, qz0, qx1, qz1] = TOR.cn
  add('castle', qx0 + 14, (qz0 + qz1) / 2, 0); add('stadium', qx1 - 13, (qz0 + qz1) / 2, 0)
  for (let k = 0; k < 30; k++) add('person', rnd(qx0 + 2, qx1 - 2), rnd(qz0 + 1, qz1 - 1), rnd(0, 6), pick(PEOPLE), 1, true)
  for (let x = -WORLD + 2; x < WORLD - 2; x += 3.4) { if (x > qx0 - 1 && x < qx1 + 1) continue; add(Math.random() < 0.6 ? 'tree' : 'lamp', x, TOR.lake - 3, 0, pick(leaf)); if (Math.random() < 0.5) add('person', x + rnd(-1, 1), TOR.lake - 5, rnd(0, 6), pick(PEOPLE), 1, true) }
  // the islands and the big park
  for (const [x, z, r] of [[-60, 78, 16], [-24, 86, 12], [12, 80, 10], [70, 84, 14]]) for (let k = 0; k < r * 1.1; k++) { const a = rnd(0, 6.28), d = rnd(0, r - 2); add(k % 4 ? 'tree' : 'person', x + Math.cos(a) * d, z + Math.sin(a) * d, rnd(0, 6), pick(k % 4 ? leaf : PEOPLE), 1, true) }
  const [px0, pz0, px1, pz1] = TOR.park
  for (let k = 0; k < 40; k++) { const x = rnd(Math.max(px0, -WORLD) + 2, px1 - 2), z = rnd(Math.max(pz0, -WORLD) + 2, pz1 - 2); if (Math.hypot(x + 92, z + 84) > 8) add(Math.random() < 0.3 ? 'bigTree' : 'tree', x, z, rnd(0, 6), pick(leaf)) }
  for (let k = 0; k < 16; k++) add('person', rnd(-104, px1 - 3), rnd(-104, pz1 - 3), rnd(0, 6), pick(PEOPLE), 1, true)
}
function layoutNice(theme, plan, add) {
  const walls = theme.walls, leaf = theme.leaf
  const ok = (x, z, r) => !riverBlocked(x, z, r) && z < niceShore(x) - 8 - r
  const put = (kind, x, z, r, rot, color) => { if (ok(x, z, r)) add(kind, x, z, rot, color) }
  const { cols, rows } = blockCentres(NCE)
  const [px, pz] = NCE.plaza
  rows.forEach((cz, j) => cols.forEach((cx, i) => {
    if (Math.abs(cx - px) < 14 && Math.abs(cz - pz) < 12) { add('fountain', px, pz, 0); for (let k = 0; k < 24; k++) add('person', px + rnd(-9, 9), pz + rnd(-8, 8), rnd(0, 6), pick(PEOPLE), 1, true); return } // the checkered square
    const old = i >= 5 // the old town: narrow colourful houses packed tight
    if (old) { for (const side of [-1, 1]) for (const q of [-8.1, -2.7, 2.7, 8.1]) put('cottage', cx + q, cz + side * 3.6, 2.4, side > 0 ? 0 : Math.PI, pick(walls)); if (ok(cx, cz + 7.6, 0.5)) add('parasol', cx + rnd(-6, 6), cz + 7.6, 0); return }
    for (const q of [-7.3, 0, 7.3]) put(j % 2 ? 'house' : 'shop', cx + q, cz - 3.4, 3.2, Math.PI, pick(walls))
    for (const q of [-7.3, 0, 7.3]) put('house', cx + q, cz + 3.8, 3.2, 0, pick(walls))
  }))
  // the promenade: palms, blue chairs, strollers; the beach below with umbrellas and swimmers' towels
  for (let x = -WORLD + 2; x < WORLD - 2; x += 3.2) {
    const z = niceShore(x) - 6.5
    if (x > NCE.hill[0] - 22) break
    add(Math.random() < 0.5 ? 'tree' : 'chair', x, z, Math.PI, pick(leaf))
    if (Math.random() < 0.6) add('person', x + rnd(-1, 1), z - rnd(1, 2.5), rnd(0, 6), pick(PEOPLE), 1, true)
    if (Math.random() < 0.6) add('parasol', x + rnd(-1, 1), niceShore(x) - 2, 0)
    if (Math.random() < 0.5) add('person', x + rnd(-1.5, 1.5), niceShore(x) - rnd(0.5, 3), rnd(0, 6), pick(PEOPLE), 1, true)
  }
  // the castle hill: woods and a lookout
  const [hx, hz, hr] = NCE.hill
  for (let k = 0; k < 40; k++) { const a = rnd(0, 6.28), d = rnd(0, hr); add(Math.random() < 0.3 ? 'bigTree' : 'tree', hx + Math.cos(a) * d, hz + Math.sin(a) * d, rnd(0, 6), pick([0x3f8a3c, 0x4f9e3c, 0x356d33])) }
  // the grand hotel on the promenade
  const [gx0, gz0, gx1, gz1] = NCE.hotel
  add('castle', (gx0 + gx1) / 2, (gz0 + gz1) / 2 - 2, 0)
}
// Las Vegas's landmark: the giant observation wheel: A-frame legs, rim and spokes, glass cabins.
function bigWheel() {
  const STEEL = 0xe8ecf0, STEEL2 = 0xb8c2cc, CAB = 0x9fd8ff, R = 13, hub = 15.5
  const parts = [box(16, 2, 6, 0xd8d0c0, 0, 1), cyl(1.1, 1.4, STEEL2, hub, 12)]
  for (const sz of [-1, 1]) parts.push(strut(-7, 2, sz * 2.4, 0, hub, sz * 0.8, 0.8, STEEL), strut(7, 2, sz * 2.4, 0, hub, sz * 0.8, 0.8, STEEL))
  for (const z of [-0.6, 0.6]) parts.push(paint(new THREE.TorusGeometry(R, 0.28, 6, 48).translate(0, hub, z), STEEL))
  for (let k = 0; k < 16; k++) {
    const a = (k / 16) * Math.PI * 2, x = Math.cos(a) * R, y = hub + Math.sin(a) * R
    parts.push(strut(0, hub, 0, x, y, 0, 0.14, STEEL2))
    parts.push(paint(new THREE.SphereGeometry(0.95, 10, 6).scale(1.3, 1, 1).translate(x, y - 1, 0), CAB))
  }
  return { r: 13.5, parts }
}
// Toronto's landmark: the tall concrete tower: three-legged base, slim shaft, the round pod, the antenna.
function cnTower() {
  const CON = 0xd8d4cc, CON2 = 0xc4c0b8, GLASS2 = 0x9fd8ff
  const parts = []
  for (const a of [0, (Math.PI * 2) / 3, (Math.PI * 4) / 3]) parts.push(strut(Math.cos(a) * 5.5, 0, Math.sin(a) * 5.5, Math.cos(a) * 0.9, 18, Math.sin(a) * 0.9, 1.6, CON))
  parts.push(paint(new THREE.CylinderGeometry(1, 1.6, 30, 10).translate(0, 25, 0), CON))
  parts.push(cyl(4.4, 1, CON2, 39.2, 24), cyl(4.8, 2.2, GLASS2, 40.8, 24), cyl(4.4, 1.4, CON, 42.6, 24), cyl(2.8, 1.2, CON2, 43.9, 18))
  parts.push(paint(new THREE.CylinderGeometry(0.7, 1, 8, 10).translate(0, 48.5, 0), CON), cyl(1.6, 1.2, GLASS2, 52.6, 14))
  parts.push(paint(new THREE.CylinderGeometry(0.15, 0.55, 14, 8).translate(0, 60, 0), 0xe8e4dc))
  return { r: 13.5, parts }
}
// Nice's landmark: the white grand hotel on the promenade with its pink dome.
function grandHotel() {
  const WHITE3 = 0xf6f2ea, CREAM = 0xeee0c4, PINK = 0xf09aa8, WIN = 0x8fb4c8
  const parts = [box(26, 12, 10, WHITE3, 0, 6), box(26.6, 0.8, 10.6, CREAM, 0, 12.4), box(22, 3, 8, CREAM, 0, 14.3), box(26.6, 0.6, 1.4, CREAM, 0, 2.2, 5.5)]
  for (let f = 0; f < 4; f++) for (let k = 0; k < 9; k++) parts.push(box(1.4, 1.4, 0.1, WIN, -10 + k * 2.5, 4 + f * 2.4, 5.05))
  parts.push(cyl(4, 6, WHITE3, 15, 16, -10, 0), paint(new THREE.SphereGeometry(4.2, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 1.15, 1).translate(-10, 18, 0), PINK), cyl(0.6, 1.6, PINK, 23.4, 8, -10), cone(0.4, 1.2, 0xe8c050, 24.8, 6, -10))
  parts.push(cyl(0.08, 3, DARK, 17.3, 4, 8), box(1.4, 0.8, 0.05, 0x2f7fd0, 8.7, 18.3))
  return { r: 13.5, parts }
}
function layoutDubai(theme, plan, add) {
  const walls = theme.walls, glass = theme.glass, leaf = theme.leaf
  const ok = (x, z, r) => !riverBlocked(x, z, r)
  const put = (kind, x, z, r, rot, color) => { if (ok(x, z, r)) add(kind, x, z, rot, color) }
  const cols = DXB.ave.slice(1).map((x, i) => (x + DXB.ave[i]) / 2), rows = DXB.st.slice(1).map((z, i) => (z + DXB.st[i]) / 2)
  // towers line the big road (the middle street); lower blocks toward the sea and the sand
  rows.forEach((cz, j) => cols.forEach((cx, i) => {
    if (j === 1 || j === 2) { if ((i + j) % 2) put('sky', cx, cz, 7, 0, pick(glass)); else { put('tower', cx - 5.5, cz, 4.5, 0, pick(glass)); put('house', cx + 6, cz, 3.4, 0, pick(walls)) } return }
    if (j === 0) { for (const q of [-5.5, 5.5]) put('shop', cx + q, cz, 3.6, 0, pick(walls)); return }
    for (const q of [-6.5, 0, 6.5]) put((i + q) % 2 ? 'house' : 'cottage', cx + q, cz + rnd(-1, 1), 3, 0, pick(walls))
    for (const q of [-9, 9]) if (ok(cx + q, cz + 7, 0.5)) add('tree', cx + q, cz + 7, 0, pick(leaf))
  }))
  // downtown: the supertall by the fountain lake, the mall, palms and crowds
  const [dx0, dz0, dx1, dz1] = DXB.downtown, lx = (dx0 + dx1) / 2 - 6, lz = (dz0 + dz1) / 2 + 4
  add('castle', dx1 - 13, dz0 + 13, 0)
  add('mall', dx0 + 9, dz1 - 7, 0)
  for (let k = 0; k < 16; k++) { const a = (k / 16) * Math.PI * 2; add('tree', lx + Math.cos(a) * 12, lz + Math.sin(a) * 12, 0, pick(leaf)) }
  for (let k = 0; k < 40; k++) { const a = rnd(0, 6.28), d = rnd(10.5, 14); add('person', lx + Math.cos(a) * d, lz + Math.sin(a) * d, rnd(0, 6), pick(PEOPLE), 1, true) }
  // the beach and the promenade
  for (let x = -WORLD + 2; x < WORLD - 2; x += 3.6) { add(Math.random() < 0.5 ? 'tree' : 'lamp', x, DXB.sea + 5, 0, pick(leaf)); if (Math.random() < 0.6) add('person', x + rnd(-1.5, 1.5), DXB.sea + rnd(1.5, 3.5), rnd(0, 6), pick(PEOPLE), 1, true) }
  // the palm island: villas and palms along the fronds and the crescent
  const [px, pz] = DXB.palm
  for (let z = DXB.sea - 2; z > pz + 10; z -= 3.5) add('tree', px + pick([-2, 2]), z, 0, pick(leaf))
  for (let k = 0; k < 8; k++) {
    const a = Math.PI * (1.08 + k * 0.12)
    for (let t = 0.3; t <= 1; t += 0.23) add(t > 0.5 && Math.random() < 0.6 ? 'villa' : 'tree', px + Math.cos(a) * 26 * t, pz + 8 + Math.sin(a) * 20 * t, -a - Math.PI / 2, pick(leaf))
  }
  for (let k = 0; k < 16; k++) { const a = Math.PI * (1.04 + k * 0.058); add(k % 3 ? 'tree' : 'villa', px + Math.cos(a) * 34, pz + 2 + Math.sin(a) * 34, -a - Math.PI / 2, pick(leaf)) }
  add('sail', DXB.sail[0], DXB.sail[1], 0)
  // the dunes: camels, a few desert villas, people on a safari
  for (let k = 0; k < 14; k++) add('camel', rnd(-100, 100), rnd(DXB.desert + 6, 104), rnd(0, 6))
  for (let k = 0; k < 10; k++) add('villa', rnd(-100, 100), rnd(DXB.desert + 8, 100), rnd(0, 6))
  for (let k = 0; k < 30; k++) add('person', rnd(-100, 100), rnd(DXB.desert + 4, 104), rnd(0, 6), pick(PEOPLE), 1, true)
  for (let k = 0; k < 20; k++) add('bush', rnd(-100, 100), rnd(DXB.desert + 4, 104), 0)
}
// a palm: tall bending trunk, drooping fronds (tinted with the leaf colour)
function palmParts() {
  const palm = [paint(new THREE.CylinderGeometry(0.12, 0.2, 3.4, 6).rotateZ(0.12).translate(-0.2, 1.7, 0), 0x9a7442)]
  for (let k = 0; k < 6; k++) { const a = (k / 6) * Math.PI * 2; palm.push(paint(new THREE.BoxGeometry(1.7, 0.08, 0.45).translate(0.85, 0, 0).rotateZ(-0.45).rotateY(a).translate(-0.4, 3.4, 0), TINT)) }
  return palm
}
// Dubai's landmark: the supertall: setback tiers of glass narrowing into a long spire.
function supertall() {
  const G = [0xd7e3ee, 0xc4d4e3, 0xe6eef5], BAND = 0x9fb3c8
  const parts = [box(16, 1.2, 16, 0xd8d0c0, 0, 0.6)]
  const tiers = [[5.6, 12], [4.8, 10], [4, 10], [3.2, 9], [2.5, 8], [1.8, 7], [1.2, 6]]
  let y = 1.2
  tiers.forEach(([r, h], k) => {
    for (const a of [0, (Math.PI * 2) / 3, (Math.PI * 4) / 3]) parts.push(paint(new THREE.CylinderGeometry(r * 0.55, r * 0.6, h, 8).translate(Math.cos(a) * r * 0.45, y + h / 2, Math.sin(a) * r * 0.45), G[k % 3]))
    parts.push(cyl(r * 0.6, h, G[(k + 1) % 3], y + h / 2, 10), cyl(r * 0.62, 0.3, BAND, y + h, 10))
    y += h
  })
  parts.push(paint(new THREE.CylinderGeometry(0.15, 0.7, 12, 8).translate(0, y + 6, 0), 0xe6eef5))
  return { r: 13.5, parts }
}
function layoutSeoul(theme, plan, add) {
  const walls = theme.walls, glass = theme.glass, leaf = theme.leaf
  const ok = (x, z, r) => !riverBlocked(x, z, r)
  const put = (kind, x, z, r, rot, color) => { if (ok(x, z, r)) add(kind, x, z, rot, color); else if (ok(x, z, 1)) add(pick(['tree', 'tree', 'bush', 'bench']), x + rnd(-1, 1), z + rnd(-1, 1), rnd(0, 6), pick(leaf)) }
  const cols = SEO.ave.slice(1).map((x, i) => (x + SEO.ave[i]) / 2), rows = SEO.st.slice(1).map((z, i) => (z + SEO.st[i]) / 2)
  rows.forEach((cz, j) => cols.forEach((cx, i) => {
    const south = cz > hanRiver(cx)
    if (!south && cz < -60 && i <= 3) { for (const side of [-1, 1]) for (const q of [-5.6, 0, 5.6]) put('hanok', cx + q, cz + side * 3.6, 2.5, side > 0 ? 0 : Math.PI); return } // the hanok village by the palace
    if (south && (i + j) % 3 === 0) { put('apt', cx, cz - 3.6, 6.2, 0); put('apt', cx, cz + 4.4, 6.2, Math.PI); return } // apartment blocks in rows
    if (south && i === 6 && j === 6) { put('lotte', cx, cz, 7, 0); return } // the supertall
    if (south && i >= 5 && j >= 6) { if ((i + j) % 2) put('sky', cx, cz, 7, 0, pick(glass)); else for (const q of [-5.5, 5.5]) put(q < 0 ? 'tower' : 'house', cx + q, cz, 4.5, 0, pick(q < 0 ? glass : walls)); return } // Gangnam
    if (!south && i >= 4 && j >= 2 && j <= 3) { put('tower', cx - 5.5, cz, 4.5, 0, pick(glass)); put('shop', cx + 5.8, cz, 3.8, 0, pick(walls)); return } // downtown
    for (const q of [-5.2, 5.2]) put((i + j) % 2 ? 'shop' : 'house', cx + q, cz - 2.8, 3.4, Math.PI, pick(walls))
    for (const q of [-5.6, 0, 5.6]) put('cottage', cx + q, cz + 3.6, 2.4, 0, pick(walls))
  }))
  // the river parks: tents, people, trees all along both banks
  for (let x = -WORLD + 2; x < WORLD - 2; x += 3.4) for (const side of [-1, 1]) {
    const z = hanRiver(x) + side * (SEO.river + 3)
    if (!ok(x, z, 0.5)) continue
    const r = Math.random()
    add(r < 0.4 ? 'tree' : r < 0.6 ? 'parasol' : r < 0.75 ? 'bench' : 'bush', x, z, 0, pick(leaf))
    if (Math.random() < 0.6) add('person', x + rnd(-1.5, 1.5), z + side * rnd(-1.5, 1.5), rnd(0, 6), pick(PEOPLE), 1, true)
  }
  // Namsan: the wooded hill under the tower
  const [nx, nz, nr] = SEO.namsan
  add('castle', nx, nz, 0)
  for (let k = 0; k < 30; k++) { const a = rnd(0, 6.28), d = rnd(14.5, nr + 1.5); add('tree', nx + Math.cos(a) * d, nz + Math.sin(a) * d, rnd(0, 6), pick(leaf)) }
  // the mountains to the north: woods
  for (let k = 0; k < 60; k++) add(Math.random() < 0.3 ? 'bigTree' : 'tree', rnd(-WORLD, WORLD), rnd(-WORLD, SEO.hills - 2), rnd(0, 6), pick([0x3f8a3c, 0x4f9e3c, 0x356d33]))
}
// Seoul's landmark: the tower on its wooded hill: terraced green mound, white shaft, round observation deck, red-and-white mast.
function namsanTower() {
  const G1 = 0x5f9a4e, G2 = 0x6fae58, G3 = 0x86c060, CON = 0xeeeeea, GLASS2 = 0x9fd8ff, RED = 0xe0402e
  const parts = [cyl(13, 2.4, G1, 1.2, 18), cyl(9.5, 2.6, G2, 3.6, 16), cyl(5.6, 2.4, G3, 6, 14), cyl(3.2, 1.2, 0xcfc8b8, 7.8, 12)]
  parts.push(paint(new THREE.CylinderGeometry(0.9, 1.6, 20, 12).translate(0, 18.4, 0), CON))
  parts.push(cyl(3.4, 1.4, CON, 28.6, 20), cyl(3.6, 1.4, GLASS2, 30, 20), cyl(3.3, 1.2, CON, 31.3, 20), cyl(2.2, 1, 0xd8d8d4, 32.4, 16))
  for (let k = 0; k < 6; k++) parts.push(cyl(0.5 - k * 0.05, 2.2, k % 2 ? CON : RED, 34 + k * 2.2, 8))
  parts.push(cyl(0.12, 2.6, CON, 48.3, 6))
  return { r: 13.5, parts }
}
function layoutTokyo(theme, plan, add) {
  const walls = theme.walls, glass = theme.glass, leaf = theme.leaf
  const ok = (x, z, r) => !riverBlocked(x, z, r)
  const put = (kind, x, z, r, rot, color) => { if (ok(x, z, r)) add(kind, x, z, rot, color) }
  const cols = TKY.ave.slice(1).map((x, i) => (x + TKY.ave[i]) / 2), rows = TKY.st.slice(1).map((z, i) => (z + TKY.st[i]) / 2)
  // small tight blocks: towers near the middle, shops and flats around, little houses at the edges
  rows.forEach((cz, j) => cols.forEach((cx, i) => {
    const mid = Math.max(Math.abs(i - 3.5), Math.abs(j - 4))
    if (mid <= 1.5 && (i + j) % 2) { put('tower', cx, cz, 4.5, 0, pick(glass)); return }
    if (mid <= 2.5) { for (const q of [-4.4, 4.4]) put((i + j) % 3 ? 'house' : 'shop', cx + q, cz - 2.6, 3.2, Math.PI, pick(walls)); for (const q of [-5.6, 0, 5.6]) put('cottage', cx + q, cz + 3.5, 2.4, 0, pick(walls)); return }
    for (const side of [-1, 1]) for (const q of [-5.6, 0, 5.6]) put('cottage', cx + q, cz + side * 3.2, 2.4, side > 0 ? 0 : Math.PI, pick(walls))
  }))
  // Shinjuku: a cluster of the tallest towers
  const [sx0, sz0, sx1, sz1] = TKY.shinjuku
  for (const [x, z] of [[sx0 + 10, sz0 + 10], [sx1 - 10, sz0 + 10], [sx0 + 10, sz1 - 10], [sx1 - 10, sz1 - 10]]) add('sky', x, z, 0, pick(glass))
  for (let k = 0; k < 20; k++) add('person', rnd(sx0 + 2, sx1 - 2), (sz0 + sz1) / 2 + rnd(-2, 2), rnd(0, 6), pick(PEOPLE), 1, true)
  // the crowd at the big crossing
  for (let k = 0; k < 40; k++) { const a = rnd(0, 6.28), d = rnd(4.5, 6); add('person', Math.cos(a) * d, Math.sin(a) * d, rnd(0, 6), pick(PEOPLE), 1, true) }
  // the tower in its park
  const [tx0, tz0, tx1, tz1] = TKY.tower
  add('castle', (tx0 + tx1) / 2 + 0, (tz0 + tz1) / 2 - 1, 0)
  for (let k = 0; k < 24; k++) { const x = rnd(tx0 + 2, tx1 - 2), z = rnd(tz0 + 2, tz1 - 2); if (Math.hypot(x - 41, z - 31) > 15.5) add('tree', x, z, rnd(0, 6), pick(leaf)) }
  // the castle garden: gate, lanterns and festival stalls along the path, the gatehouse and the white keep
  const [qx0, qz0, qx1, qz1] = TKY.temple
  add('gate', -80, qz1 - 6, 0)
  for (let z = qz1 - 10; z > qz0 + 18; z -= 3.2) { add('parasol', -84.5, z, Math.PI / 2); add('parasol', -75.5, z, -Math.PI / 2); add('person', -80 + rnd(-1.6, 1.6), z, rnd(0, 6), pick(PEOPLE), 1, true) }
  add('yagura', -80, qz0 + 9, 0); add('keep', -96, qz0 + 14, 0)
  for (let k = 0; k < 14; k++) add('tree', rnd(qx0 + 2, qx1 - 2), rnd(qz0 + 2, qz1 - 2), rnd(0, 6), pick(leaf))
  for (const x of [-88, -72]) for (let z = qz0 + 20; z < qz1 - 4; z += 8) add('lamp', x, z)
  // the cherry park: blossom everywhere, a pond, picnics
  const [ux0, uz0, ux1, uz1] = TKY.ueno
  for (let k = 0; k < 60; k++) { const x = rnd(ux0 + 2, Math.min(ux1, WORLD) - 2), z = rnd(uz0 + 6, uz1 - 2); if (Math.hypot(x - 84, z + 80) < 10.5) continue; add(Math.random() < 0.3 ? 'bigTree' : 'tree', x, z, rnd(0, 6), pick([0xffb3cc, 0xff9ec0, 0xf7c4d8])) }
  for (let k = 0; k < 30; k++) add('person', rnd(ux0 + 3, WORLD - 3), rnd(uz0 + 8, uz1 - 3), rnd(0, 6), pick(PEOPLE), 1, true)
  for (let k = 0; k < 10; k++) add('bench', rnd(ux0 + 3, WORLD - 3), rnd(uz0 + 8, uz1 - 3), pick([0, 1.57]))
  // the bay front
  for (let x = -WORLD + 2; x < WORLD - 2; x += 4) { add(Math.random() < 0.5 ? 'lamp' : 'tree', x, TKY.bay - 4, rnd(0, 6), pick(leaf)); if (Math.random() < 0.5) add('person', x + rnd(-1, 1), TKY.bay - 6.5, rnd(0, 6), pick(PEOPLE), 1, true) }
}
// Tokyo's landmark: the red-and-white lattice tower with its two observation decks.
function tokyoTower() {
  const RED = 0xe0402e, WHITE2 = 0xf6f6f2, DECK = 0xf0f0ec, GLASS2 = 0x9fd8ff
  const parts = []
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    parts.push(strut(sx * 8.5, 0, sz * 8.5, sx * 3.6, 14, sz * 3.6, 1.4, RED), strut(sx * 3.4, 14.5, sz * 3.4, sx * 1.4, 30, sz * 1.4, 0.9, RED))
    parts.push(strut(sx * 8.5, 1, sz * 8.5, sx * 4.8, 10, -sz * 0.4, 0.3, WHITE2), strut(sx * 8.5, 1, sz * 8.5, -sx * 0.4, 10, sz * 4.8, 0.3, WHITE2))
  }
  for (const [y, w] of [[5, 13.2], [10, 9.6]]) parts.push(box(w, 0.5, 0.3, WHITE2, 0, y, w / 2), box(w, 0.5, 0.3, WHITE2, 0, y, -w / 2), box(0.3, 0.5, w, WHITE2, w / 2, y), box(0.3, 0.5, w, WHITE2, -w / 2, y))
  parts.push(box(7.6, 2.6, 7.6, DECK, 0, 15.6), box(7.8, 1.2, 7.8, GLASS2, 0, 16.2), box(8.2, 0.4, 8.2, RED, 0, 17.1))
  parts.push(box(3.6, 1.6, 3.6, DECK, 0, 30.6), box(3.8, 0.8, 3.8, GLASS2, 0, 30.8))
  for (let k = 0; k < 5; k++) parts.push(cyl(0.45 - k * 0.06, 2.4, k % 2 ? WHITE2 : RED, 32.6 + k * 2.4, 8))
  parts.push(cyl(0.12, 3, WHITE2, 45.7, 6))
  return { r: 13.5, parts }
}
function layoutCairo(theme, plan, add) {
  const walls = theme.walls, leaf = theme.leaf
  const ok = (x, z, r) => !riverBlocked(x, z, r)
  const put = (kind, x, z, r, rot, color) => { if (ok(x, z, r)) add(kind, x, z, rot, color); else if (ok(x, z, 1)) add('tree', x + rnd(-1, 1), z + rnd(-1, 1), rnd(0, 6), pick(leaf)) }
  const cols = CAI.ave.slice(1).map((x, i) => (x + CAI.ave[i]) / 2), rows = CAI.st.slice(1).map((z, i) => (z + CAI.st[i]) / 2)
  const [bx0, bz0, bx1, bz1] = CAI.bazaar
  // the east bank: tight sand-coloured blocks, a covered market hall in some, the bazaar's stalls
  rows.forEach((cz, j) => cols.forEach((cx, i) => {
    if (cx > bx0 && cx < bx1 && cz > bz0 && cz < bz1) {
      for (let k = 0; k < 22; k++) add('parasol', cx + rnd(-9.5, 9.5), cz + rnd(-5.5, 5.5), pick([0, 1.57]))
      for (let k = 0; k < 26; k++) add('person', cx + rnd(-10, 10), cz + rnd(-6, 6), rnd(0, 6), pick(PEOPLE), 1, true)
      return
    }
    if ((i * 3 + j) % 5 === 2) { put('market', cx - 5, cz, 4, 0); for (const side of [-1, 1]) put('cottage', cx + 7.4, cz + side * 3.6, 2.4, side > 0 ? 0 : Math.PI, pick(walls)); return }
    if (j >= 3 && j <= 5 && i === 2) { for (const q of [-5.5, 5.5]) put('house', cx + q, cz, 4, 0, pick(walls)); return } // a taller downtown street
    for (const side of [-1, 1]) for (const q of [-7.3, 0, 7.3]) put((i + j + (side > 0 ? 1 : 0)) % 3 ? 'cottage' : 'house', cx + q, cz + side * 3.6, 3, side > 0 ? 0 : Math.PI, pick(walls))
  }))
  // the Corniche on the east bank and the fields of the west bank: palms, people, a few farm houses
  for (let z = -WORLD + 2; z < WORLD - 2; z += 3.6) {
    const east = nile(z) + CAI.river + 2.4, west = nile(z) - CAI.river - 2.4
    if (ok(east, z, 1)) { add(Math.random() < 0.6 ? 'tree' : 'lamp', east, z, rnd(0, 6), pick(leaf)); if (Math.random() < 0.5) add('person', east + rnd(0.5, 1.5), z + rnd(-1.5, 1.5), rnd(0, 6), pick(PEOPLE), 1, true) }
    if (ok(west, z, 1)) add('tree', west, z, rnd(0, 6), pick(leaf))
  }
  for (let z = -WORLD + 6; z < WORLD - 6; z += 9) for (const x of [-31, -17]) { if (Math.random() < 0.55 && ok(x, z, 2.6)) add('cottage', x, z, x < -24 ? Math.PI / 2 : -Math.PI / 2, pick(walls)); else if (ok(x, z, 1)) add(pick(['tree', 'bush', 'crate']), x, z, rnd(0, 6), pick(leaf)) }
  // Giza: three pyramids, the Sphinx, tombs, camels and tourists on the sand
  for (const [x, z, kind] of CAI.giza) add(kind, x, z, 0)
  add('sphinx', -50, -4, 0)
  for (const [x, z] of [[-96, -60], [-92, -8], [-46, 36], [-100, 20], [-54, -62], [-96, 84], [-60, 74], [-80, -90], [-50, 98]]) add('mastaba', x, z, 0)
  for (let k = 0; k < 16; k++) { const x = rnd(-104, -40), z = rnd(-104, 104); if (CAI.giza.every(([px, pz]) => Math.hypot(px - x, pz - z) > 16)) add('camel', x, z, rnd(0, 6)) }
  for (let k = 0; k < 50; k++) { const x = rnd(-104, -40), z = rnd(-104, 104); if (CAI.giza.every(([px, pz]) => Math.hypot(px - x, pz - z) > 15)) add('person', x, z, rnd(0, 6), pick(PEOPLE), 1, true) }
  for (let x = -70; x < CAI.desert[2] - 2; x += 4) { add('person', x, 8 + rnd(-1.6, 1.6), rnd(0, 6), pick(PEOPLE), 1, true); if (Math.random() < 0.5) add('crate', x + 1, 8 + pick([-2.6, 2.6])) }
}
function layoutRome(theme, plan, add) {
  const walls = theme.walls, leaf = theme.leaf
  const cols = ROM.ave.slice(1).map((x, i) => (x + ROM.ave[i]) / 2), rows = ROM.st.slice(1).map((z, i) => (z + ROM.st[i]) / 2)
  const ok = (x, z, r) => !riverBlocked(x, z, r)
  const put = (kind, x, z, r, rot, color) => { if (ok(x, z, r)) add(kind, x, z, rot, color) }
  const [nx0, nz0, nx1, nz1] = ROM.navona
  rows.forEach((cz, j) => cols.forEach((cx, i) => {
    if (cx > nx0 && cx < nx1 && cz > nz0 && cz < nz1) { // a piazza: fountain, cafe tables, crowd
      add('fountain', cx, cz, 0)
      for (let k = 0; k < 6; k++) add('parasol', cx + rnd(-7, 7), cz + pick([-5, 5]), 0)
      for (let k = 0; k < 18; k++) add('person', cx + rnd(-7.5, 7.5), cz + rnd(-5.5, 5.5), rnd(0, 6), pick(PEOPLE), 1, true)
      return
    }
    // old town: small ochre and terracotta buildings tight along both streets, a pine in a courtyard now and then
    const big = (i + j * 2) % 4 === 0
    for (const side of [-1, 1]) {
      if (big) for (const q of [-4.4, 4.4]) put((i + j) % 2 ? 'shop' : 'house', cx + q, cz + side * 3.4, 3.3, side > 0 ? 0 : Math.PI, pick(walls))
      else for (const q of [-5.6, 0, 5.6]) put('cottage', cx + q, cz + side * 3.6, 2.4, side > 0 ? 0 : Math.PI, pick(walls))
    }
    if (Math.random() < 0.5) for (let k = 0; k < 2; k++) { const x = cx + rnd(-6, 6), z = cz + pick([-7.4, 7.4]); if (ok(x, z, 0.5)) add('parasol', x, z, 0) }
  }))
  // the Forum: broken columns, temples and pines on the grass beside the Colosseum
  const [fx0, fz0, fx1, fz1] = ROM.forum, [cx, cz] = ROM.colosseum
  add('castle', cx, cz, 0)
  for (const [x, z] of [[fx0 + 9, fz0 + 9], [fx0 + 22, fz0 + 8], [fx0 + 9, fz1 - 9], [fx0 + 24, fz1 - 9]]) add('temple', x, z, pick([0, Math.PI]))
  for (let k = 0; k < 40; k++) { const x = rnd(fx0 + 3, fx1 - 42), z = rnd(fz0 + 3, fz1 - 3); add('column', x, z, rnd(0, 6)) }
  for (let k = 0; k < 26; k++) { const a = rnd(0, 6.28), d = rnd(18, 24); const x = cx + Math.cos(a) * d, z = cz + Math.sin(a) * d; if (x > fx0 + 2 && x < fx1 - 2 && z > fz0 + 2 && z < fz1 - 2) add('tree', x, z, rnd(0, 6), pick(leaf)) }
  for (let k = 0; k < 40; k++) add('person', rnd(fx0 + 3, fx1 - 3), rnd(fz0 + 3, fz1 - 3), rnd(0, 6), pick(PEOPLE), 1, true)
  // the white monument at the back of its square, fountains and a ring of columns
  const [qx0, qz0, qx1, qz1] = ROM.peter, px = (qx0 + qx1) / 2
  add('monument', px, qz0 + 9, 0)
  add('fountain', px - 8, qz1 - 14, 0); add('fountain', px + 8, qz1 - 14, 0)
  for (let k = 0; k < 14; k++) { const a = Math.PI * (0.1 + 0.8 * k / 13); add('column', px + Math.cos(a) * 17, qz1 - 14 - Math.sin(a) * 9 + 9, 0) }
  for (let k = 0; k < 30; k++) add('person', rnd(qx0 + 4, qx1 - 4), rnd(qz0 + 20, qz1 - 3), rnd(0, 6), pick(PEOPLE), 1, true)
}
// Rome's landmark: the oval amphitheatre, three tiers of arches, the outer wall broken away on one side.
function colosseum() {
  const STONE = 0xe3cfa4, STONE2 = 0xcbb488, SHADE = 0x6b5a44, SAND = 0xe8d4a0
  const parts = [paint(new THREE.CylinderGeometry(1, 1, 0.3, 32).scale(10.5, 1, 8).translate(0, 0.15, 0), SAND)]
  const N = 30, rx = 12.4, rz = 9.8
  for (let k = 0; k < N; k++) {
    const a = (k / N) * Math.PI * 2, x = Math.cos(a) * rx, z = Math.sin(a) * rz
    const nx = Math.cos(a) / rx, nz = Math.sin(a) / rz, yaw = Math.atan2(nx, nz)
    const seg = 2 * Math.PI * Math.sqrt((rx * rx + rz * rz) / 2) / N + 0.15
    const broken = Math.sin(a) < -0.2 && Math.cos(a) > -0.6 ? 0.55 + 0.25 * Math.sin(k * 2.3) : 1 // the far side has lost its top tiers
    const h = 13 * broken
    const wall = new THREE.BoxGeometry(seg, h, 1.4).translate(0, h / 2, 0).rotateY(yaw).translate(x, 0, z)
    parts.push(paint(wall, k % 2 ? STONE : STONE2))
    for (let t = 0; t < 3; t++) {
      const y = 1.9 + t * 4
      if (y + 1.6 > h) break
      const arch = new THREE.BoxGeometry(seg * 0.5, 2.6, 0.3).translate(0, y, 0.72).rotateY(yaw).translate(x, 0, z)
      parts.push(paint(arch, SHADE))
    }
    const inner = new THREE.BoxGeometry(seg * 0.8, 5, 1.2).translate(0, 2.5, 0).rotateY(yaw).translate(x * 0.72, 0, z * 0.72)
    parts.push(paint(inner, STONE2))
  }
  return { r: 13.5, parts }
}
function layoutParis(theme, plan, add) {
  const walls = theme.walls, glass = theme.glass, leaf = theme.leaf
  const cols = PAR.ave.slice(1).map((x, i) => (x + PAR.ave[i]) / 2), rows = PAR.st.slice(1).map((z, i) => (z + PAR.st[i]) / 2)
  const ok = (x, z, r) => !riverBlocked(x, z, r)
  const put = (kind, x, z, r, rot, color) => { if (ok(x, z, r)) add(kind, x, z, rot, color); else if (ok(x, z, 1)) add(pick(['tree', 'tree', 'bench', 'lamp']), x + rnd(-1, 1), z + rnd(-1, 1), rnd(0, 6), pick(leaf)) }
  rows.forEach((cz, j) => cols.forEach((cx, i) => {
    if (i === 0 && j <= 2) { // La Défense: the glass business district on the west edge
      if (j % 2) put('sky', cx - 3, cz, 7, 0, pick(glass)); else for (const q of [-5.5, 5.5]) put('tower', cx + q, cz, 5, 0, pick(glass))
      return
    }
    if (i === 6 && j === 6) { put('sky', cx, cz, 7, 0, pick(glass)); return } // a lone tower in the south (Montparnasse)
    // Haussmann blocks: cream buildings all round with a courtyard tree, shops and cafe tables on the street side
    for (const q of [-7.3, 0, 7.3]) put(j % 2 ? 'house' : 'shop', cx + q, cz - 4.2, 3.4, Math.PI, pick(walls))
    for (const q of [-7.3, 0, 7.3]) put((i + j) % 3 ? 'house' : 'cottage', cx + q, cz + 4.2, 3.4, 0, pick(walls))
    if (ok(cx, cz, 1)) add('tree', cx + rnd(-2, 2), cz, 0, pick(leaf))
    for (let k = 0; k < 3; k++) { const x = cx + rnd(-9, 9), z = cz + 7.6; if (ok(x, z, 0.5)) { add('parasol', x, z, 0); add('person', x + 0.6, z, rnd(0, 6), pick(PEOPLE), 1, true) } }
  }))
  // the quays: plane trees, booksellers' stalls, people along both banks
  for (let x = -WORLD + 2; x < WORLD - 2; x += 3.4) for (const side of [-1, 1]) {
    const z = seine(x) + side * (PAR.river + 2.2)
    if (riverBlocked(x, z, 1.5)) continue
    add(Math.random() < 0.6 ? 'tree' : 'lamp', x, z, rnd(0, 6), pick(leaf))
    if (Math.random() < 0.25) add('crate', x + 1.4, z + side * 1.1, 0)
    if (Math.random() < 0.5) add('person', x + rnd(-1.5, 1.5), z + side * rnd(0.5, 1.5), rnd(0, 6), pick(PEOPLE), 1, true)
  }
  // Champ de Mars: rows of trees either side of the lawn, the tower at the river end
  const [mx0, mz0, mx1, mz1] = PAR.mars
  add('castle', (mx0 + mx1) / 2, mz0 + 13, 0)
  for (let z = mz0 + 28; z < mz1 - 2; z += 3.2) { add('tree', mx0 + 2, z, 0, pick(leaf)); add('tree', mx1 - 2, z, 0, pick(leaf)); if (Math.random() < 0.5) add('person', rnd(mx0 + 5, mx1 - 5), z, rnd(0, 6), pick(PEOPLE), 1, true) }
  for (let k = 0; k < 8; k++) add('bench', rnd(mx0 + 5, mx1 - 5), rnd(mz0 + 30, mz1 - 4), pick([0, 1.57]))
  // Arc de Triomphe in the middle of its round square
  add('arc', PAR.etoile[0], PAR.etoile[1], 0)
  for (let k = 0; k < 10; k++) { const a = (k / 10) * Math.PI * 2; add('person', PAR.etoile[0] + Math.cos(a) * 6.2, PAR.etoile[1] + Math.sin(a) * 6.2, rnd(0, 6), pick(PEOPLE), 1, true) }
}
// Paris's landmark: the iron tower: four splayed legs and arches, two platforms, the tapering top and antenna.
function strut(x0, y0, z0, x1, y1, z1, w, color) {
  const from = new THREE.Vector3(x0, y0, z0), to = new THREE.Vector3(x1, y1, z1), dir = to.clone().sub(from), len = dir.length()
  const g = new THREE.BoxGeometry(w, len, w).translate(0, len / 2, 0)
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize())).translate(x0, y0, z0)
  return paint(g, color)
}
function eiffel() {
  const IRON = 0xa27b56, IRON2 = 0x86633f, DECK = 0x7a5a3c, GOLD = 0xf2c75a
  const parts = []
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    parts.push(strut(sx * 9, 0, sz * 9, sx * 4.4, 11.5, sz * 4.4, 1.6, IRON), strut(sx * 4.2, 12, sz * 4.2, sx * 1.9, 25, sz * 1.9, 1, IRON))
    parts.push(strut(sx * 8, 1.5, sz * 8, sx * 5.2, 10, -sz * 0.2, 0.35, IRON2), strut(sx * 8, 1.5, sz * 8, -sx * 0.2, 10, sz * 5.2, 0.35, IRON2))
    parts.push(strut(sx * 9.3, 0, sz * 9.3, sx * 9.3, 0.7, sz * 9.3, 2.6, IRON2))
  }
  for (const rot of [0, Math.PI / 2]) for (const side of [-1, 1]) {
    const arch = new THREE.TorusGeometry(5.6, 0.45, 6, 14, Math.PI).translate(0, 2.2, 0)
    if (rot) arch.rotateY(rot)
    parts.push(paint(rot ? arch.translate(side * 7, 0, 0) : arch.translate(0, 0, side * 7), IRON2))
  }
  parts.push(box(11, 0.7, 11, DECK, 0, 11.7), box(11.4, 0.5, 0.2, IRON2, 0, 12.3, 5.6), box(11.4, 0.5, 0.2, IRON2, 0, 12.3, -5.6), box(0.2, 0.5, 11.4, IRON2, 5.6, 12.3), box(0.2, 0.5, 11.4, IRON2, -5.6, 12.3), box(5, 0.6, 5, DECK, 0, 25.2))
  parts.push(paint(new THREE.CylinderGeometry(0.35, 1.9, 17, 4).rotateY(Math.PI / 4).translate(0, 34, 0), IRON))
  parts.push(box(1.3, 1.2, 1.3, DECK, 0, 42.8), cyl(0.15, 4, IRON2, 45.4, 6), ball(0.28, GOLD, 47.5))
  return { r: 13.5, parts }
}
function arcParts() {
  const STONE = 0xeadfc6, STONE2 = 0xd6c8a6, SHADE = 0x5a5048
  return [
    box(2.6, 7, 4.6, STONE, -2.7, 3.5), box(2.6, 7, 4.6, STONE, 2.7, 3.5), box(8, 2.6, 4.6, STONE, 0, 8.3), box(8.4, 0.6, 5, STONE2, 0, 9.9),
    box(2.8, 4.4, 4.7, SHADE, 0, 2.2), box(8.6, 0.5, 5.1, STONE2, 0, 6.9),
  ]
}
function layoutLondon(theme, plan, add) {
  const walls = theme.walls, glass = theme.glass, leaf = theme.leaf
  const cols = LDN.ave.slice(1).map((x, i) => (x + LDN.ave[i]) / 2), rows = LDN.st.slice(1).map((z, i) => (z + LDN.st[i]) / 2)
  const ok = (x, z, r) => !riverBlocked(x, z, r)
  // a building that would stand in the river leaves a little riverside garden instead
  const put = (kind, x, z, r, rot, color) => { if (ok(x, z, r)) add(kind, x, z, rot, color); else if (ok(x, z, 1) && kind !== 'tree' && kind !== 'bench' && kind !== 'bush') { add(pick(['tree', 'tree', 'bush', 'bench']), x + rnd(-1, 1), z + rnd(-1, 1), rnd(0, 6), pick(theme.leaf)) } }
  rows.forEach((cz, j) => cols.forEach((cx, i) => {
    const city = i >= 5 && cz < thames(cx), shard = i === 5 && j === 6
    if (shard) { put('sky', cx - 3, cz, 7, 0, pick(glass)); put('house', cx + 7.5, cz - 4, 3.5, 0, pick(walls)); put('house', cx + 7.5, cz + 4, 3.5, Math.PI, pick(walls)); return }
    if (city) { // the City: glass towers among stone offices
      if ((i + j) % 2) put('sky', cx - 3, cz, 7, 0, pick(glass)); else for (const q of [-5.5, 5.5]) put('tower', cx + q, cz, 5, 0, pick(glass))
      put('cottage', cx + 8.2, cz + 5.2, 2.5, 0, pick(walls)); return
    }
    if ((i + j * 3) % 5 === 0) { // a garden square: trees and benches ringed by houses
      for (let k = 0; k < 7; k++) put('tree', cx + rnd(-6, 6), cz + rnd(-3, 3), 1, rnd(0, 6), pick(leaf))
      for (let k = 0; k < 3; k++) put('bench', cx + rnd(-6, 6), cz + rnd(-3, 3), 1, pick([0, 1.57]))
      for (const q of [-8.6, 8.6]) for (const side of [-1, 1]) put('cottage', cx + q, cz + side * 5, 2.5, side > 0 ? 0 : Math.PI, pick(walls))
      return
    }
    if ((i * 2 + j) % 4 === 1) { // high street: shops in front, flats behind
      for (const q of [-5.2, 5.2]) put('shop', cx + q, cz + 3.6, 4, 0, pick(walls))
      for (const q of [-7.3, 0, 7.3]) put('house', cx + q, cz - 4.2, 3.2, Math.PI, pick(walls))
      return
    }
    // terraces: two rows of houses back to back with gardens between
    for (const side of [1, -1]) for (const q of [-8.1, -2.7, 2.7, 8.1]) put('cottage', cx + q, cz + side * 5.3, 2.4, side > 0 ? 0 : Math.PI, pick(walls))
    for (const q of [-6, 0, 6]) put('bush', cx + q + rnd(-1, 1), cz + rnd(-1, 1), 0.6)
  }))
  // the Embankment: trees and lamps on both banks, benches and people
  for (let x = -WORLD + 2; x < WORLD - 2; x += 3.6) for (const side of [-1, 1]) {
    const z = thames(x) + side * (LDN.river + 2.2)
    if (riverBlocked(x, z, 1.5) && !riverBlocked(x, z - side * 3, 0)) continue
    add(Math.random() < 0.55 ? 'tree' : 'lamp', x, z, rnd(0, 6), pick(leaf))
    if (Math.random() < 0.3) add('bench', x + 1.5, z + side * 1.2, 0)
    if (Math.random() < 0.5) add('person', x + rnd(-1.5, 1.5), z + side * rnd(0.5, 1.5), rnd(0, 6), pick(PEOPLE), 1, true)
  }
  // Hyde Park
  const [px0, pz0, px1, pz1] = LDN.park
  for (let k = 0; k < 55; k++) { const x = rnd(px0 + 6, px1 - 2), z = rnd(pz0 + 6, pz1 - 2); add(Math.random() < 0.35 ? 'bigTree' : 'tree', x, z, rnd(0, 6), pick(leaf)) }
  for (let k = 0; k < 16; k++) add('bush', rnd(px0 + 6, px1 - 2), rnd(pz0 + 6, pz1 - 2))
  for (let k = 0; k < 10; k++) add('bench', rnd(px0 + 8, px1 - 3), rnd(pz0 + 8, pz1 - 3))
  for (let k = 0; k < 24; k++) add('person', rnd(px0 + 8, px1 - 3), rnd(pz0 + 8, pz1 - 3), rnd(0, 6), pick(PEOPLE), 1, true)
  add('kiosk', px1 - 12, pz1 - 8, 0)
  // Westminster: Parliament and the clock tower on the square by the river
  const [sx0, sz0, sx1, sz1] = LDN.square
  add('castle', (sx0 + sx1) / 2, (sz0 + sz1) / 2 + 1, 0)
  for (let x = sx0 + 2; x < sx1; x += 4) { add('tree', x, sz0 + 1.5, 0, pick(leaf)); if (Math.random() < 0.6) add('person', x + 1, sz1 + 1, rnd(0, 6), pick(PEOPLE), 1, true) }
}
// London's landmark: the Gothic Parliament along the river, the clock tower at one end, the tall square tower at the other.
function bigBen() {
  const STONE = 0xdcc48c, STONE2 = 0xc4ab72, ROOF = 0x56655c, GOLD = 0xe8c050, FACE = 0xf6f1e0
  const parts = [
    box(30, 6.5, 9, STONE, 0, 3.25), box(30.6, 0.6, 9.6, STONE2, 0, 6.8), box(26, 2.6, 6.4, ROOF, 0, 8.3),
    box(6.4, 17, 6.4, STONE, 11, 8.5), box(7, 0.8, 7, STONE2, 11, 17.2), box(6, 3.5, 6, STONE, 11, 19.2), // Victoria tower
    box(4.2, 22, 4.2, STONE, -13.2, 11), box(4.8, 4.8, 4.8, STONE2, -13.2, 24.4), // clock tower shaft and clock stage
    box(4, 2.4, 4, STONE, -13.2, 28), cone(3.1, 7.5, ROOF, 32.9, 4, -13.2), cone(0.35, 2.2, GOLD, 37.6, 6, -13.2),
    box(1.2, 12, 1.2, STONE2, -3, 6), cone(1.1, 4, ROOF, 14, 4, -3),
  ]
  for (const [fx, fz, rx] of [[0, 2.45, 0], [0, -2.45, 0], [2.45, 0, 1], [-2.45, 0, 1]]) {
    const g = new THREE.CylinderGeometry(1.75, 1.75, 0.2, 20).rotateX(Math.PI / 2)
    if (rx) g.rotateY(Math.PI / 2)
    parts.push(paint(g.translate(-13.2 + fx, 24.4, fz), FACE))
    const hand = new THREE.BoxGeometry(0.16, 1.3, 0.1).translate(0, 0.5, 0); if (rx) hand.rotateY(Math.PI / 2)
    parts.push(paint(hand.translate(-13.2 + fx * 1.06, 24.4, fz * 1.06), DARK))
  }
  for (let k = 0; k < 9; k++) { const x = -9 + k * 2.6; if (Math.abs(x - 11) < 4) continue; parts.push(cone(0.35, 2.6, STONE2, 10.9, 4, x, 3.6), cone(0.35, 2.6, STONE2, 10.9, 4, x, -3.6)) }
  for (let k = 0; k < 7; k++) parts.push(box(1.1, 3.4, 0.1, 0x8fb4c8, -9 + k * 3, 3.4, 4.52))
  for (const q of [[13.5, 3.5], [13.5, -3.5], [8.5, 3.5], [8.5, -3.5]]) parts.push(cone(0.45, 2.6, STONE2, 22.3, 4, q[0], q[1]))
  return { r: 13.5, parts }
}
function layout(theme) {
  // Everything that will stand in the town, as plain records. Meshes are sized from this list.
  const list = [], walls = theme.walls, leaf = theme.leaf
  const add = (kind, x, z, rot = rnd(0, 6.28), color = null, s = 1, still = false) => list.push({ kind, x, z, rot, color, s, still }) - 1
  const plan = world.plan
  if (theme.city === 'ny') { layoutNY(theme, plan, add, list); return finishLayout(theme, plan, list, add) }
  if (theme.city === 'london') { layoutLondon(theme, plan, add); return finishLayout(theme, plan, list, add) }
  if (theme.city === 'paris') { layoutParis(theme, plan, add); return finishLayout(theme, plan, list, add) }
  if (theme.city === 'rome') { layoutRome(theme, plan, add); return finishLayout(theme, plan, list, add) }
  if (theme.city === 'cairo') { layoutCairo(theme, plan, add); return finishLayout(theme, plan, list, add) }
  if (theme.city === 'tokyo') { layoutTokyo(theme, plan, add); return finishLayout(theme, plan, list, add) }
  if (theme.city === 'seoul') { layoutSeoul(theme, plan, add); return finishLayout(theme, plan, list, add) }
  if (theme.city === 'dubai') { layoutDubai(theme, plan, add); return finishLayout(theme, plan, list, add) }
  if (theme.city === 'vegas') { layoutVegas(theme, plan, add); return finishLayout(theme, plan, list, add) }
  if (theme.city === 'toronto') { layoutToronto(theme, plan, add); return finishLayout(theme, plan, list, add) }
  if (theme.city === 'nice') { layoutNice(theme, plan, add); return finishLayout(theme, plan, list, add) }
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
  return finishLayout(theme, plan, list, add)
}
function finishLayout(theme, plan, list, add) {
  // Pavement life: the small things that make the first ten seconds feel like a feast.
  const city = !!theme.city
  const smalls = theme.smalls || (city ? ['cone', 'hydrant', 'crate', 'mail', 'lamp', 'hydrant', 'lamp'] : ['cone', 'hydrant', 'crate', 'mail', 'lamp', 'bush', 'crate'])
  for (const r of plan.roads) {
    for (let d = r.a + 2; d < r.b - 2; d += 2.1) {
      const sx = r.at + (Math.random() < 0.5 ? -1 : 1) * 3.5, x = r.v ? sx : d, z = r.v ? d : sx
      if (city && plan.roads.some((o) => o.v !== r.v && Math.abs(o.at - d) < 4.5 && r.at >= o.a - 4 && r.at <= o.b + 4)) continue
      if (Math.random() < 0.7) add(pick(smalls), x, z)
      if (Math.random() < 0.35) add('person', x + rnd(-0.6, 0.6), z + rnd(-0.6, 0.6), rnd(0, 6), pick(PEOPLE), 1, true)
    }
  }
  const carColors = theme.carColors || (city ? [0xffd23f, 0xffffff, 0x2a2a3a, 0x4a90e2] : [0xff4d4d, 0xffd23f, 0x4a90e2, 0xffffff, 0x2ee6a6, 0xff8a3d])
  for (let i = 0; i < 260; i++) add('person', 0, 0, 0, pick(PEOPLE))
  for (let i = 0; i < 90; i++) add('car', 0, 0, 0, pick(carColors))
  for (let i = 0; i < 16; i++) add('bus', 0, 0, 0, pick(theme.busColors || [0xffc145, 0xff6b6b, 0x4fc3ff]))
  // nothing may stand where the beam cannot reach (the beam stops at WORLD + 6): drop it, keeping roof tanks pointing at their building
  const inside = (r) => r.base !== undefined || (Math.abs(r.x) <= WORLD + 4 && Math.abs(r.z) <= WORLD + 4)
  const keep = [], moved = new Map()
  list.forEach((r, i) => { if (inside(r) && (r.on == null || moved.has(r.on))) { moved.set(i, keep.length); keep.push(r) } })
  for (const r of keep) if (r.on != null) r.on = moved.get(r.on)
  list.length = 0; list.push(...keep)
  // the model is picked from the position, not Math.random, so &classic and the new look share one layout
  const variants = theme.variants || VARIANTS
  for (const r of list) { r.base = r.kind; const v = variants[r.kind]; if (!CLASSIC && v) r.kind = v[Math.abs(Math.round(r.x * 7 + r.z * 13 + list.length)) % v.length] }
  return list
}

function buildWorld(index) {
  clearWorld()
  const theme = THEMES[index]
  scene.background = new THREE.Color(theme.sky)
  scene.fog = new THREE.Fog(theme.fog, 140, 420)
  world.plan = cityPlan(theme)
  const span = WORLD * 2 + 40
  world.ground = new THREE.Mesh(new THREE.PlaneGeometry(span, span).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: theme.city ? cityTexture(theme, world.plan) : groundTexture(theme), depthWrite: false, toneMapped: false }))
  world.ground.renderOrder = -2; scene.add(world.ground)
  world.far = new THREE.Mesh(new THREE.PlaneGeometry(1400, 1400).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: theme.far || theme.grass, depthWrite: false, toneMapped: false }))
  world.far.position.y = -0.02; world.far.renderOrder = -3; scene.add(world.far)
  if (sunLight) { world.catcher = new THREE.Mesh(new THREE.PlaneGeometry(span, span).rotateX(-Math.PI / 2), new THREE.ShadowMaterial({ color: 0x2a1d5c, opacity: 0.32, depthWrite: false })); world.catcher.position.y = 0.03; world.catcher.receiveShadow = true; world.catcher.renderOrder = -1; scene.add(world.catcher) }
  const kinds = buildKinds(theme); world.kinds = kinds
  const records = layout(theme), counts = {}
  for (const r of records) counts[r.kind] = (counts[r.kind] || 0) + 1
  for (const name in counts) {
    const geometry = kinds[name].geometry || merge(kinds[name].parts)
    const mesh = new THREE.InstancedMesh(geometry, SOLID, counts[name])
    mesh.frustumCulled = false; mesh.count = counts[name]
    kinds[name].geometry = geometry; kinds[name].next = 0
    geometry.computeBoundingBox(); kinds[name].h = geometry.boundingBox.max.y
    { const c = geometry.attributes.color.array; let r = 0, g = 0, b = 0; for (let i = 0; i < c.length; i += 3) { r += c[i]; g += c[i + 1]; b += c[i + 2] } const n = c.length / 3; kinds[name].avg = new THREE.Color(r / n, g / n, b / n).getHex() }
    mesh.castShadow = !!kinds[name].shadow
    world.meshes[name] = mesh; scene.add(mesh)
  }
  const half = ((GRID - 1) / 2) * PITCH
  const shadowGeometry = new THREE.CircleGeometry(1, 12).rotateX(-Math.PI / 2)
  const shadowMaterial = new THREE.MeshBasicMaterial({ color: 0x241a4a, transparent: true, opacity: 0.2, depthWrite: false })
  world.shadow = new THREE.InstancedMesh(shadowGeometry, shadowMaterial, records.length)
  world.moving = new THREE.InstancedMesh(shadowGeometry, shadowMaterial, records.length)
  for (const m of [world.shadow, world.moving]) { m.frustumCulled = false; m.renderOrder = -1; scene.add(m) }
  let staticShadows = 0, movingShadows = 0
  const roadLength = world.plan.roads.reduce((sum, r) => sum + r.b - r.a, 0)
  world.roofs = []
  records.forEach((record, id) => {
    const kind = kinds[record.kind]
    const item = { ...record, id, r: kind.r, index: kind.next++, alive: true, wobble: 0, pts: Math.round(10 * kind.r * kind.r), mass: 0.12 + 0.12 * kind.r * kind.r }
    if (record.on != null) { item.y = kinds[records[record.on].kind].h * 0.98; world.roofs.push(item) }
    if (record.color !== null && kind.tint) world.meshes[record.kind].setColorAt(item.index, COLOR.set(record.color))
    else world.meshes[record.kind].setColorAt(item.index, COLOR.set(WHITE))
    if (!record.still && (record.base === 'person' || record.base === 'car' || record.base === 'bus')) {
      const fast = record.base !== 'person'
      item.mover = true; item.sid = movingShadows++
      let road = null, roll = rnd(0, roadLength)
      for (const r of world.plan.roads) { road = r; roll -= r.b - r.a; if (roll <= 0) break }
      item.road = road; item.axis = road.v
      item.lane = road.at + (fast ? pick([-1.5, 1.5]) : pick([-3.5, 3.5]))
      item.dir = pick([-1, 1])
      item.along = rnd(road.a, road.b)
      item.speed = record.base === 'person' ? rnd(1, 2) : rnd(5, 8)
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
  world.moverNames = [...new Set(world.movers.map((item) => item.kind))]
  for (const name in world.meshes) { world.meshes[name].instanceMatrix.needsUpdate = true; if (world.meshes[name].instanceColor) world.meshes[name].instanceColor.needsUpdate = true }
  world.shadow.count = staticShadows; world.moving.count = movingShadows
  world.shadow.instanceMatrix.needsUpdate = true; world.moving.instanceMatrix.needsUpdate = true
}
function place(item, tilt = 0, tiltX = 0, tiltZ = 0) {
  dummy.position.set(item.x, item.y || 0, item.z)
  tiltYaw(dummy.quaternion, tiltX, tiltZ, tilt, item.rot)
  dummy.scale.setScalar(1); dummy.updateMatrix()
  world.meshes[item.kind].setMatrixAt(item.index, dummy.matrix)
  dummy.quaternion.identity(); dummy.position.y = 0.02; dummy.scale.set(item.r * 0.8, 1, item.r * 0.8); dummy.updateMatrix()
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

// ---------------------------------------------------------------- the android and its laser
// hole.x/z/r: where the beam hits the ground and how wide it is (the old hole's numbers, so play stays Gulp's).
const hole = { x: 0, z: 0, r: 1, shown: 1, vx: 0, vz: 0, chomp: 0, group: new THREE.Group() }
const LASER = new THREE.Color(SKINS[0].color)
const glow = (color, opacity) => new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false })
// red stays red on bright ground only with normal blending; the white cores add light on top
const paintGlow = (color, opacity) => new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false, toneMapped: false })
const beamOuter = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1, 28, 1, true).translate(0, 0.5, 0), paintGlow(LASER, 0.5))
const beamCore = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1, 16, 1, true).translate(0, 0.5, 0), glow(0xffffff, 0.9))
const spot = new THREE.Mesh(new THREE.CircleGeometry(1, 48).rotateX(-Math.PI / 2), paintGlow(LASER, 0.5))
const spotCore = new THREE.Mesh(new THREE.CircleGeometry(1, 32).rotateX(-Math.PI / 2), glow(0xffffff, 0.85))
const ring = new THREE.Mesh(new THREE.RingGeometry(0.93, 1, 64).rotateX(-Math.PI / 2), paintGlow(LASER, 0.95))
for (const m of [spot, spotCore, ring]) { m.position.y = 0.06; m.renderOrder = 2 }
for (const m of [beamOuter, beamCore]) m.renderOrder = 3
// Scorched ground: dark marks left where the beam has been.
const SCORCH = 160
const scorch = new THREE.InstancedMesh(new THREE.CircleGeometry(1, 20).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x1c1226, transparent: true, opacity: 0.1, depthWrite: false }), SCORCH)
scorch.frustumCulled = false; scorch.renderOrder = -1; scorch.count = 0; scene.add(scorch)
let scorchAt = 0, scorchLast = { x: 1e9, z: 1e9 }
function markScorch(x, z, r) {
  if (Math.hypot(x - scorchLast.x, z - scorchLast.z) < r * 1.2) return
  scorchLast = { x, z }
  dummy.position.set(x, 0.035, z); dummy.quaternion.identity(); dummy.scale.set(r * 0.9, 1, r * 0.9); dummy.updateMatrix()
  scorch.setMatrixAt(scorchAt, dummy.matrix); scorchAt = (scorchAt + 1) % SCORCH; scorch.count = Math.max(scorch.count, scorchAt || SCORCH); scorch.instanceMatrix.needsUpdate = true
}
// The android: a round white bot with a visor and two glowing eyes, floating above and behind the beam.
const bot = new THREE.Group()
{
  const shell = new THREE.MeshLambertMaterial({ color: 0xf4f6ff }), dark = new THREE.MeshLambertMaterial({ color: 0x232039 }), accent = new THREE.MeshLambertMaterial({ color: SKINS[0].color })
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.9, 24, 16), shell); body.scale.set(1, 0.9, 0.95); bot.add(body)
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.75, 24, 16), shell); head.position.y = 1.15; bot.add(head)
  const visor = new THREE.Mesh(new THREE.SphereGeometry(0.62, 24, 12, -1.2, 2.4, 1.05, 0.9), dark); visor.position.set(0, 1.15, -0.16); visor.rotation.y = Math.PI / 2; bot.add(visor)
  for (const side of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 8), glow(0xffffff, 1)); eye.position.set(side * 0.24, 1.15, 0.6); eye.userData.eye = true; bot.add(eye)
    const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.16, 0.5, 4, 8), shell); arm.position.set(side * 1.0, -0.05, 0); arm.rotation.z = side * 0.5; bot.add(arm)
  }
  const band = new THREE.Mesh(new THREE.TorusGeometry(0.88, 0.07, 8, 32), accent); band.rotation.x = Math.PI / 2; band.position.y = 0.05; bot.add(band)
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.45, 6), dark); stem.position.y = 2.05; bot.add(stem)
  const tip = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 8), glow(LASER, 1)); tip.position.y = 2.32; tip.userData.tip = true; bot.add(tip)
  const jet = new THREE.Mesh(new THREE.ConeGeometry(0.35, 0.8, 16, 1, true).rotateX(Math.PI), glow(0x9fe8ff, 0.6)); jet.position.y = -1.05; jet.userData.jet = true; bot.add(jet)
  bot.userData.accent = accent
}
hole.group.add(spot, spotCore, ring)
// The beam and the android are drawn in a second pass over the city, so a tall building in front never hides them.
const front = new THREE.Scene()
front.add(hole.group, beamOuter, beamCore, bot, new THREE.HemisphereLight(0xeaf6ff, 0x7a6aa8, 1.7))
{ const sun = new THREE.DirectionalLight(0xffe2b8, 2.4); sun.position.set(-0.7, 1, 0.45); front.add(sun) }
function draw() { renderer.render(scene, camera); renderer.autoClear = false; renderer.clearDepth(); renderer.render(front, camera); renderer.autoClear = true }
window.__draw = draw
const EYE = new THREE.Vector3(), HIT = new THREE.Vector3(), BEAM_UP = new THREE.Vector3(0, 1, 0), BEAM_DIR = new THREE.Vector3()
function aimBeam(mesh, from, to, radius) {
  BEAM_DIR.subVectors(from, to); const len = BEAM_DIR.length()
  mesh.position.copy(to); mesh.quaternion.setFromUnitVectors(BEAM_UP, BEAM_DIR.normalize()); mesh.scale.set(radius, len, radius)
}
function setLaserColor(color) {
  LASER.set(color)
  for (const m of [beamOuter, spot, ring]) m.material.color.set(color)
  bot.userData.accent.color.set(color); bot.traverse((o) => { if (o.userData.tip) o.material.color.set(color) })
}

// Things in mid-swallow: above the ground they are drawn normally, below it only inside the hole.
const CLIP_UP = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), CLIP_DOWN = new THREE.Plane(new THREE.Vector3(0, -1, 0), 0)
const fallers = []
for (let i = 0; i < 40; i++) {
  const up = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshLambertMaterial({ vertexColors: true, clippingPlanes: [CLIP_UP], emissive: 0xff4a1a, emissiveIntensity: 0 }))
  up.visible = false; up.frustumCulled = false; up.castShadow = true
  scene.add(up); fallers.push({ up, down: up, item: null, age: 0, life: 0.5 })
}
const fall = { vector: new THREE.Vector3() }

// Pop of colour when something big goes down.
const SPARKS = 220
const sparkMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(0.3, 0.3, 0.3), new THREE.MeshBasicMaterial({ color: 0xffffff }), SPARKS)
sparkMesh.frustumCulled = false; scene.add(sparkMesh)
const sparks = Array.from({ length: SPARKS }, () => ({ life: 0, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, s: 1 }))
let sparkAt = 0
for (let i = 0; i < SPARKS; i++) { sparkMesh.setColorAt(i, COLOR.set(0xffffff)); dummy.position.set(0, -500, 0); dummy.scale.setScalar(0); dummy.updateMatrix(); sparkMesh.setMatrixAt(i, dummy.matrix) }
function burst(x, z, count, size, color, y = 0.4) {
  for (let i = 0; i < count; i++) {
    const s = sparks[sparkAt], a = rnd(0, 6.28), v = rnd(4, 11) * size
    s.life = rnd(0.4, 0.8); s.x = x; s.y = y; s.z = z; s.vx = Math.cos(a) * v; s.vz = Math.sin(a) * v; s.vy = rnd(6, 15) * size; s.s = rnd(0.6, 1.5) * size
    sparkMesh.setColorAt(sparkAt, COLOR.set(color ?? pick([0xffd23f, 0xff4f8b, 0x2ee6a6, 0x7b4dff, 0xffffff])))
    sparkAt = (sparkAt + 1) % SPARKS
  }
  sparkMesh.instanceColor.needsUpdate = true
}
const pulse = new THREE.Mesh(new THREE.RingGeometry(0.92, 1, 48).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false }))
pulse.position.y = 0.08; scene.add(pulse)
let pulseAge = 9
// A ring of dust where something big went down.
const dusts = Array.from({ length: 6 }, () => { const m = new THREE.Mesh(new THREE.RingGeometry(0.6, 1, 40).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xf3ead8, transparent: true, opacity: 0, depthWrite: false })); m.position.y = 0.1; m.visible = false; scene.add(m); return { m, age: 9, r: 1 } })
let dustAt = 0
function dustRing(x, z, r) { const d = dusts[dustAt]; dustAt = (dustAt + 1) % dusts.length; d.age = 0; d.r = r; d.m.position.x = x; d.m.position.z = z; d.m.visible = true }
function updateDust(dt) { for (const d of dusts) { if (!d.m.visible) continue; d.age += dt; const p = d.age / 0.55; if (p >= 1) { d.m.visible = false; continue } d.m.scale.setScalar(d.r * (0.8 + p * 1.6)); d.m.material.opacity = 0.75 * (1 - p) * (1 - p) } }

// Chunks: a building that melts breaks into blocks; a block that lands hard breaks small things under it.
const CHUNKS = 260
const chunkMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshLambertMaterial({ emissive: 0xff5a1a, emissiveIntensity: 0 }), CHUNKS)
chunkMesh.frustumCulled = false; chunkMesh.castShadow = true; scene.add(chunkMesh)
const chunks = Array.from({ length: CHUNKS }, () => ({ life: 0, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, s: 1, rx: 0, ry: 0, wx: 0, wy: 0, hit: false }))
let chunkAt = 0
for (let i = 0; i < CHUNKS; i++) { chunkMesh.setColorAt(i, COLOR.set(0xffffff)); dummy.position.set(0, -500, 0); dummy.scale.setScalar(0); dummy.updateMatrix(); chunkMesh.setMatrixAt(i, dummy.matrix) }
function breakApart(item, kind) {
  const h = kind.h || item.r, n = clamp(Math.round(item.r * 3.2), 6, 30), s = clamp(item.r * 0.32, 0.5, 3.2)
  for (let i = 0; i < n; i++) {
    const c = chunks[chunkAt], a = rnd(0, 6.28), out = rnd(2, 7) * Math.sqrt(item.r) * 0.8
    c.life = rnd(2.2, 3.2); c.x = item.x + rnd(-0.5, 0.5) * item.r; c.z = item.z + rnd(-0.5, 0.5) * item.r; c.y = rnd(0.25, 0.95) * h
    c.vx = Math.cos(a) * out; c.vz = Math.sin(a) * out; c.vy = rnd(4, 12) * Math.sqrt(item.r) * 0.5; c.s = s * rnd(0.6, 1.3)
    c.rx = rnd(0, 6); c.ry = rnd(0, 6); c.wx = rnd(-6, 6); c.wy = rnd(-6, 6); c.hit = false; c.heat = 1
    c.color = item.color ?? kind.avg
    chunkMesh.setColorAt(chunkAt, COLOR.set(c.color).lerp(HOT, 0.6))
    chunkAt = (chunkAt + 1) % CHUNKS
  }
  chunkMesh.instanceColor.needsUpdate = true
}
const HOT = new THREE.Color(0xff6a2a)
function updateChunks(dt) {
  let recolor = false
  for (let i = 0; i < CHUNKS; i++) {
    const c = chunks[i]
    if (c.life <= 0) continue
    c.life -= dt; c.vy -= 30 * dt; c.x += c.vx * dt; c.y += c.vy * dt; c.z += c.vz * dt; c.rx += c.wx * dt; c.ry += c.wy * dt
    if (c.y < c.s / 2) {
      // the first hard landing breaks what it lands on (if small enough), then the block rolls to a stop
      if (!c.hit && c.vy < -6 && game.state === 'run') { c.hit = true; crush(c.x, c.z, c.s) }
      c.y = c.s / 2; c.vy *= -0.25; c.vx *= 0.55; c.vz *= 0.55; c.wx *= 0.5; c.wy *= 0.5
    }
    if (c.heat > 0) { c.heat = Math.max(0, c.heat - dt * 0.8); chunkMesh.setColorAt(i, COLOR.set(c.color).lerp(HOT, c.heat * 0.6)); recolor = true }
    const fade = c.life < 0.5 ? c.life / 0.5 : 1
    dummy.position.set(c.x, c.life > 0 ? c.y - (1 - fade) * c.s : -500, c.z); dummy.rotation.set(c.rx, c.ry, 0); dummy.scale.setScalar(c.life > 0 ? c.s : 0); dummy.updateMatrix()
    chunkMesh.setMatrixAt(i, dummy.matrix)
  }
  chunkMesh.instanceMatrix.needsUpdate = true
  if (recolor) chunkMesh.instanceColor.needsUpdate = true
}
// A melted vehicle blows up: a fireball, a shake, and the small things around it melt too (a car caught in it blows up as well,
// up to 8 blasts until the next second).
function explode(item) {
  game.blasts++
  const reach = 3 + item.r * 1.6, cap = Math.max(1.2, hole.r * 0.75)
  burst(item.x, item.z, 22, 1.3, 0xff7a2a); burst(item.x, item.z, 12, 0.9, 0xffd23f); dustRing(item.x, item.z, reach * 0.7)
  game.shake = Math.max(game.shake, 0.35); game.punch = Math.max(game.punch, 0.35)
  audio.play('big', 0.75, rnd(1.1, 1.3))
  const hits = []
  for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) for (const it of world.hash.get(hashKey(item.x + a * CELL, item.z + b * CELL)) || []) hits.push(it)
  for (const it of world.movers) if (Math.abs(it.x - item.x) < reach && Math.abs(it.z - item.z) < reach) hits.push(it)
  for (const it of hits) if (it.alive && it !== item && it.r < cap && Math.hypot(it.x - item.x, it.z - item.z) < reach + it.r * 0.3) swallow(it, true)
}
function crush(x, z, s) {
  const bucket = world.hash.get(hashKey(x, z))
  if (!bucket) return
  for (const item of bucket) if (item.alive && item.r < s * 1.3 && Math.hypot(item.x - x, item.z - z) < s + item.r * 0.5) { swallow(item, true); burst(item.x, item.z, 4, 0.5, item.color ?? world.kinds[item.kind].avg) }
}

// ---------------------------------------------------------------- run
const game = { state: 'load', time: 60, total: 60, score: 0, eaten: 0, combo: 0, comboTime: 0, frenzy: false, finished: false, seenHint: false, gold: 0, sizeShown: 1, shake: 0, punch: 0, freeze: 0, startR: 1, firstAction: false, doubled: false }
const input = { x: 0, z: 0, active: false, id: null, ox: 0, oy: 0, mouse: false, keys: new Set() }
const baseSpeed = () => 7.5 + save.up.speed * 0.6
const pullRange = () => 0.3
const startRadius = () => 1.7 + save.up.start * 0.28 // big enough for benches, lamps and cars from the first second
const meltSpeed = () => 1 + save.up.magnet * 0.16 // the 'Hotter beam' upgrade (save key 'magnet' from Gulp)

// a run starts where small things are: the grid towns' south-west corner, a city's own start
const theme0Start = () => (THEMES[save.town].city ? world.plan.start : [-PITCH * 2.5, PITCH * 2.5])
function resetRun() {
  buildWorld(save.town)
  const st = theme0Start(); hole.x = st[0]; hole.z = st[1]; hole.vx = hole.vz = 0
  game.startR = startRadius(); hole.r = hole.shown = game.startR
  game.total = game.time = 120 + save.up.time * 5 // two-minute runs
  Object.assign(game, { blasts: 0, blastT: 0, score: 0, eaten: 0, combo: 0, comboTime: 0, frenzy: false, finished: false, gold: 0, sizeShown: 1, shake: 0, firstAction: false, doubled: false })
  fallers.forEach(clearFaller)
}
function clearFaller(f) { f.item = null; f.up.visible = false; f.up.material.emissiveIntensity = 0 }
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
  // stars by how much of the city melted: 50 / 75 / 95 % (the same in every city)
  const town = save.town, ratio = game.eaten / world.total
  const stars = STAR_AT.filter((v) => ratio >= v).length
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

function swallow(item, crushed = false) {
  item.alive = false; hide(item)
  const f = fallers.find((x) => !x.item)
  if (f) {
    const kind = world.kinds[item.kind]
    f.item = item; f.age = 0; f.life = clamp(0.35 + item.r * 0.07, 0.35, 1.0); f.spin = rnd(-1, 1) * (item.r < 3 ? 1.2 : 0.2); f.hr = hole.r; f.thud = false
    f.up.geometry = kind.geometry; f.big = item.r >= 3; f.drip = false; f.lift = item.base === 'person'; if (f.lift) f.life = 0.8
    f.up.material.emissive.set(f.lift ? 0x6fe8ff : 0xff4a1a)
    if (f.big) breakApart(item, kind)
    const tinted = kind.tint && item.color !== null
    f.up.material.color.set(tinted ? item.color : WHITE)
    f.up.visible = true
    f.sx = item.x; f.sz = item.z
    f.ax = hole.x - item.x; f.az = hole.z - item.z
    const len = Math.hypot(f.ax, f.az) || 1; f.ax /= len; f.az /= len
  }
  game.comboTime = 1.4; game.combo++
  const mult = 1 + Math.min(game.combo, 60) / 12
  const gain = item.pts * mult * (game.frenzy ? 2 : 1)
  game.score += gain; game.eaten += item.pts
  // a thin beam grows twice as fast, so the first seconds climb quickly to cars and houses
  hole.r = Math.sqrt(hole.r * hole.r + item.mass * GROW * (crushed ? 0.6 : 1) * (hole.r < 3 ? 2 : 1) / cityHard())
  if ((item.base === 'car' || item.base === 'bus') && game.blasts < 8) explode(item)
  hole.chomp = Math.min(1, hole.chomp + 0.25 + item.r * 0.1)
  const debris = item.color ?? world.kinds[item.kind].avg
  if (item.r >= 3) {
    floatText(`+${Math.round(gain)}`, item.x, item.z, item.r >= 6)
    burst(item.x, item.z, Math.min(40, 8 + item.r * 4), clamp(item.r / 5, 0.6, 2.4), debris)
    dustRing(item.x, item.z, item.r)
    game.punch = Math.max(game.punch, clamp(item.r / 9, 0.3, 1))
    if (item.r >= 6) game.freeze = 0.07
    game.shake = Math.max(game.shake, clamp(item.r * 0.07, 0.15, 0.9))
    audio.play(item.r >= 6 ? 'huge' : 'big', 0.9, rnd(0.95, 1.1))
  } else if (item.r >= 1.4) { audio.play('crunch', 0.7, rnd(0.9, 1.2)); burst(item.x, item.z, 5, 0.6, debris); burst(item.x, item.z, 3, 0.4, 0xffb03a) }
  else if (Math.random() < 0.5) burst(item.x, item.z, 2, 0.35, Math.random() < 0.5 ? debris : 0xffb03a)
  else audio.play(Math.random() < 0.5 ? 'gulp1' : 'gulp2', 0.55, clamp(0.85 + game.combo * 0.012, 0.85, 1.6))
}
const GROW = 0.42
const BIG_CHIP = 2.2
// the landmark is the run's last goal: only a beam nearly its size melts it
const chipLimit = (item) => (item.kind === 'castle' ? 1.15 : BIG_CHIP)
const STAR_AT = [0.5, 0.75, 0.95]
// later cities grow the laser more slowly (BALANCE.md): a city's own `hard`, else 1 + 0.12 per city before it
const cityHard = () => THEMES[save.town].hard ?? 1 + save.town * 0.18

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
      if (!item.alive || item.r >= hole.r * Math.min(1.8, chipLimit(item) * 0.95)) continue
      const ratio = item.r / hole.r, d = Math.hypot(item.x - hole.x, item.z - hole.z), s = item.pts * (item.kind === 'castle' ? 50 : 1) / (d + 4) / (ratio > 1 ? ratio ** 4 * 3 : 1)
      if (s > score) { score = s; best = item }
    }
    if (best) { botState.x = best.x; botState.z = best.z }
  }
  return { x: (botState.x - hole.x) / 3, z: (botState.z - hole.z) / 3 }
}

function eat(item, dt) {
  const dx = hole.x - item.x, dz = hole.z - item.z, d = Math.hypot(dx, dz), R = hole.r
  const reach = R + item.r * 0.1
  // Things up to BIG_CHIP times the beam's width melt too when the beam is held on them, slower the bigger they are
  // (a house twice the beam takes about 3 s), throwing off sparks and bits while they heat.
  const ratio = item.r / R, small = ratio < 0.98, chip = chipLimit(item)
  if (ratio < chip && (small ? d < R - item.r * 0.15 : d < item.r * 0.7)) {
    const slow = small ? 1 : 1 + 25 * (ratio - 1) * (ratio - 1)
    item.heat = (item.heat || 0) + dt * meltSpeed() / (0.02 + item.r * item.r * 0.012) / slow
    if (!small && Math.random() < dt * 10) { burst(item.x + rnd(-1, 1) * item.r * 0.4, item.z + rnd(-1, 1) * item.r * 0.4, 2, 0.5, Math.random() < 0.5 ? 0xffb03a : world.kinds[item.kind].avg); if (Math.random() < 0.3) audio.play('crunch', 0.35, rnd(1.2, 1.5)) }
    if (item.heat >= 1 || item.r < 0.9) { swallow(item); return }
    glowItem(item, item.heat); game.heatT = 0.12
    const shiver = Math.sin(performance.now() * 0.06 + item.id) * 0.05 * item.heat
    place(item, shiver, 1, 0); item.wobble = 1; return true
  }
  // no suction (that was Gulp's hole): a thing at the edge of the beam just warms up and trembles
  if (item.r < R * chip && d < R + item.r && item.axis === undefined) {
    const shiver = Math.sin(performance.now() * 0.05 + item.id * 1.7) * 0.04
    place(item, shiver, 1, 0.3); item.wobble = 1; return true
  }
  // Too strong to melt yet: it does not move or glow at all; the beam glances off it in pale blue sparks with a faint tick,
  // so the player sees "not yet" without any words (user 2026-11-05: things that cannot break must not shake).
  if (item.r >= R * chip && d < item.r * 0.7 && item.axis === undefined) {
    const top = (world.kinds[item.kind].h || 1) * 0.97
    if (top > hole.blockY) hole.blockY = top
    if (Math.random() < 0.3) { burst(hole.x + rnd(-0.4, 0.4) * R, hole.z + rnd(-0.4, 0.4) * R, 2, 0.4, pick([0xbfefff, 0xffffff, 0x7fd8ff]), top + 0.3); if (Math.random() < 0.08) audio.play('click', 0.25, rnd(1.6, 2)) }
    return false
  }
  if (item.wobble) { item.wobble = 0; place(item); if (item.heat) { item.heat = 0; glowItem(item, 0) } return true }
  return false
}
// Heat shows as the thing turning orange (instance colour; untinted kinds start white).
const BASE = new THREE.Color()
// A few see-through orange copies laid over the things the beam is heating: bright enough to read on brick, glass or stone.
const SHELLS = Array.from({ length: 6 }, () => { const m = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshBasicMaterial({ color: 0xff8a2a, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false })); m.visible = false; m.renderOrder = 1; scene.add(m); return m })
function heatShell(item, heat) {
  let m = SHELLS.find((x) => x.userData.item === item) || SHELLS.find((x) => !x.visible) || SHELLS[0]
  m.userData.item = item; m.userData.seen = performance.now(); m.geometry = world.kinds[item.kind].geometry
  m.position.set(item.x, (item.y || 0) + 0.02, item.z); m.rotation.set(0, item.rot, 0); m.scale.set(1.02, 1.02, 1.02)
  m.material.opacity = 0.25 + heat * 0.6 + Math.sin(performance.now() * 0.03) * 0.08; m.visible = true
}
function updateShells() { const now = performance.now(); for (const m of SHELLS) if (m.visible && (now - m.userData.seen > 120 || !m.userData.item.alive)) { m.visible = false; m.userData.item = null } }
function glowItem(item, heat) {
  if (heat > 0.05 && item.r >= 1.4) heatShell(item, heat)
  const kind = world.kinds[item.kind], mesh = world.meshes[item.kind]
  BASE.set(kind.tint && item.color !== null ? item.color : WHITE)
  mesh.setColorAt(item.index, BASE.lerp(HOT, clamp(heat, 0, 1) * 0.75)); mesh.instanceColor.needsUpdate = true
}

function updateWorld(dt) {
  hole.blockShown = lerp(hole.blockShown || 0, hole.blockY || 0, clamp(dt * 14, 0, 1)); hole.blockY = 0
  for (const item of world.movers) {
    if (!item.alive) continue
    // panic: heading toward the beam and close -> turn around and run (faster for a few seconds)
    const ddx = item.x - hole.x, ddz = item.z - hole.z, near = Math.hypot(ddx, ddz)
    if (near < hole.r * 1.5 + 2.5 && item.r < hole.r * BIG_CHIP) {
      const toward = item.axis ? -Math.sign(ddz) : -Math.sign(ddx)
      if (item.dir === toward && (item.turned || 0) <= 0) { item.dir = -item.dir; item.turned = 1.5 }
      item.panic = 2
    }
    if (item.turned > 0) item.turned -= dt
    if (item.panic > 0) item.panic -= dt
    item.along += item.dir * item.speed * (item.panic > 0 ? (item.base === 'person' ? 1.5 : 1.25) : 1) * dt
    // a road that runs off the map wraps around; one that ends in the city (park, waterfront) makes a U-turn
    const road = item.road, open = road.a <= -WORLD && road.b >= WORLD
    if (item.along > road.b + (open ? 4 : 0)) { if (open) item.along = road.a - 4; else { item.along = road.b; item.dir = -1; item.lane = 2 * road.at - item.lane } }
    if (item.along < road.a - (open ? 4 : 0)) { if (open) item.along = road.b + 4; else { item.along = road.a; item.dir = 1; item.lane = 2 * road.at - item.lane } }
    placeMover(item)
    eat(item, dt)
  }
  for (const name of world.moverNames) world.meshes[name].instanceMatrix.needsUpdate = true
  // water tanks on a roof drop to the street once the building under them has melted
  for (const item of world.roofs) {
    if (!item.alive || !item.y || world.items[item.on].alive) continue
    item.vy = (item.vy || 0) + dt * 40; item.y = Math.max(0, item.y - item.vy * dt); place(item); world.meshes[item.kind].instanceMatrix.needsUpdate = true
    if (!item.y) { burst(item.x, item.z, 5, 0.6, 0x9fd8ff); game.shake = Math.max(game.shake, 0.15) }
  }
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
    // Melting: it glows, sags and sinks into a puddle; a big one also throws chunks (breakApart) and leans as it goes.
    const p = clamp(f.age / f.life, 0, 1), item = f.item, kind = world.kinds[item.kind], h = kind.h || 1
    if (f.lift) { // a person floats up the beam, unhurt, and vanishes into the android
      const mesh = f.up; mesh.position.set(item.x + (hole.x - item.x) * p * 0.6, p * 9, item.z + (hole.z - item.z) * p * 0.6)
      mesh.quaternion.setFromAxisAngle(UP, item.rot + p * 9); mesh.scale.setScalar(1 - p * 0.75); mesh.material.emissiveIntensity = 0.6 + p
      if (p >= 1) clearFaller(f)
      continue
    }
    const sag = p * p
    const mesh = f.up
    const wide = 1 + sag * 0.45
    mesh.position.set(item.x + Math.sin(f.age * 60) * 0.04 * item.r * (1 - p), (f.big ? -sag * h * 0.5 : 0) + (item.y || 0), item.z)
    tiltYaw(mesh.quaternion, f.ax, f.az, f.big ? p * 0.3 : 0, item.rot)
    mesh.scale.set(wide, Math.max(0.03, 1 - sag * 0.97), wide)
    if (!f.drip && p > 0.55) { f.drip = true; burst(item.x, item.z, item.r < 1.4 ? 3 : 7, clamp(item.r / 4, 0.35, 1.2), 0xffb03a) }
    mesh.material.emissiveIntensity = 0.35 + p * 1.1
    if (!f.thud && p > 0.4 && item.r >= 3) { f.thud = true; audio.play('crunch', 0.8, rnd(0.6, 0.75)); game.shake = Math.max(game.shake, clamp(item.r * 0.05, 0.1, 0.6)) }
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
  // the bar fills toward the next star; the text is how much of the city has melted
  const ratio = game.eaten / world.total, next = STAR_AT.find((v) => v > ratio) ?? 1, prev = [0, ...STAR_AT].filter((v) => v <= ratio).pop()
  $('eatenBar').style.width = `${clamp((ratio - prev) / (next - prev), 0, 1) * 100}%`
  const pct = `${Math.floor(ratio * 100)}% / ${Math.round(next * 100)}%`
  if ($('eatenText').textContent !== pct) $('eatenText').textContent = pct
  const combo = $('combo')
  if (game.combo >= 8) { const text = `x${(1 + Math.min(game.combo, 60) / 12).toFixed(1)}`; if (combo.textContent !== text) combo.textContent = text; combo.classList.add('on') } else combo.classList.remove('on')
}

function tick(dt) {
  game.blastT = (game.blastT || 0) + dt; if (game.blastT > 1) { game.blastT = 0; game.blasts = 0 }
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
  const R = hole.shown * (1 + Math.sin(now * 0.03) * 0.03 + hole.chomp * 0.06)
  hole.group.position.set(hole.x, 0, hole.z)
  spot.scale.setScalar(R); spotCore.scale.setScalar(R * 0.45); ring.scale.setScalar(R * (1.02 + Math.sin(now * 0.012) * 0.03))
  // the bot floats above and a little behind (toward the camera) and leans the way it moves
  // the bot floats above and behind the spot (away from the camera), faces the camera and looks down at its beam
  // over a building it cannot melt the bot rises above the roof, so the beam still points down onto it
  const lift = Math.max(5 + hole.shown * 1.9, (hole.blockShown || 0) + 4 + hole.shown), size = 0.75 + hole.shown * 0.2
  bot.position.set(lerp(bot.position.x || hole.x, hole.x - hole.vx * 0.05, clamp(dt * 8, 0, 1)), lift + Math.sin(now * 0.003) * 0.3, lerp(bot.position.z || hole.z, hole.z - lift * 0.55 - hole.vz * 0.05, clamp(dt * 8, 0, 1)))
  bot.scale.setScalar(size); bot.rotation.set(0.35 + clamp(hole.vz * 0.015, -0.25, 0.25), 0, clamp(-hole.vx * 0.02, -0.35, 0.35))
  bot.traverse((o) => { if (o.userData.jet) o.scale.y = 0.8 + Math.sin(now * 0.05) * 0.2 })
  EYE.set(0, 1.15, 0.62).multiplyScalar(size).applyEuler(bot.rotation).add(bot.position)
  // blocked by something too strong: the beam ends on its roof and the ring turns pale blue (reset each frame by updateWorld)
  const blocked = hole.blockShown > 0.5
  HIT.set(hole.x, blocked ? hole.blockShown : 0.05, hole.z)
  hole.group.position.y = blocked ? hole.blockShown : 0
  const ringColor = blocked ? 0x9fe4ff : LASER.getHex()
  if (ring.material.color.getHex() !== ringColor) { ring.material.color.set(ringColor); spot.material.color.set(ringColor) }
  updateShells()
  aimBeam(beamOuter, EYE, HIT, R * 0.42 * (1 + hole.chomp * 0.25)); aimBeam(beamCore, EYE, HIT, R * 0.14)
  beamOuter.material.opacity = 0.45 + Math.sin(now * 0.04) * 0.08
  if (game.state === 'run') markScorch(hole.x, hole.z, R)
  pulseAge += dt
  if (pulseAge < 0.6) { const p = pulseAge / 0.6; pulse.visible = true; pulse.position.x = hole.x; pulse.position.z = hole.z; pulse.scale.setScalar(R * (1 + p * 2.2)); pulse.material.opacity = 0.8 * (1 - p) } else pulse.visible = false
  const wide = innerWidth / innerHeight
  const height = Math.max((20 + hole.shown * 4.9) * (wide < 1 ? 1.3 : 1), (hole.blockShown || 0) * 1.6 + 18) // stays above a roof that stops the beam
  game.punch = Math.max(0, game.punch - dt * 3)
  const back = height * 0.72 * (1 - game.punch * 0.05)
  const shake = game.shake * (save.shake ? 1 : 0)
  game.shake = Math.max(0, game.shake - dt * 2.2)
  camera.position.x = lerp(camera.position.x, hole.x, clamp(dt * 6, 0, 1)) + rnd(-shake, shake)
  camera.position.y = lerp(camera.position.y, height, clamp(dt * 3, 0, 1)) - game.punch * height * 0.05
  camera.position.z = lerp(camera.position.z, hole.z + back, clamp(dt * 6, 0, 1)) + rnd(-shake, shake)
  // look a little past the spot toward the android, more on wide screens, so the bot never sits under the timer
  const ahead = lift * (wide >= 1 ? 1.15 : 0.18)
  camera.lookAt(camera.position.x, (hole.blockShown || 0) * 0.9, camera.position.z - back - ahead)
  aimSun(camera.position.x, camera.position.z - back, Math.max(45, height * 1.5))
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
  setLaserColor(SKINS[save.skin].color)
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
  toggle('language', () => LANGUAGES[lang], () => { lang = LANG_KEYS[(LANG_KEYS.indexOf(lang) + 1) % LANG_KEYS.length]; save.lang = lang; sync(); $('panelTitle').textContent = t('settings'); renderSettings(host) })
}
function goHome() {
  hide_('result'); hide_('pause'); hide_('hud'); hide_('panel'); show('title'); sync()
  game.state = 'title'; audio.music('menu')
  buildWorld(save.town); hole.x = world.plan.start[0]; hole.z = world.plan.start[1]; hole.r = 2.4
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
  platform.banner(game.state === 'title' || (game.state === 'over' && !$('result').classList.contains('hide')))
  if (game.freeze > 0) game.freeze -= dt
  else if (game.state === 'run' && !platform.adOpen && !platform.paused) { if (TURBO) { for (let i = 0; i < TURBO && game.state === 'run'; i++) { tick(1 / 60); updateFallers(1 / 60); updateChunks(1 / 60) } } else tick(dt) }
  updateFallers(dt); updateSparks(dt); updateDust(dt); updateChunks(dt)
  updateView(dt, now)
  if (game.heatT > 0) game.heatT -= dt
  audio.hum(game.state === 'run' && !platform.adOpen && !platform.paused, hole.shown, game.heatT > 0)
  draw()
}

async function boot() {
  $('loadbar').style.width = '30%'
  await platform.init()
  $('loadbar').style.width = '55%'
  await readSave()
  if (Q.has('town')) save.town = clamp(+Q.get('town'), 0, THEMES.length - 1) // test pictures of one town
  const asked = (window.bridge?.platform?.language || navigator.language || 'en').toLowerCase().slice(0, 2)
  lang = save.lang || (LANGUAGES[asked] ? asked : 'en')
  if (LANGUAGES[Q.get('lang')]) lang = Q.get('lang')
  $('loadbar').style.width = '75%'
  resize(); buildWorld(save.town)
  hole.x = world.plan.start[0]; hole.z = world.plan.start[1]; hole.r = hole.shown = 2.4
  camera.position.set(hole.x, 30, hole.z + 22)
  hole.group.visible = true; game.state = 'title'; audio.music('menu')
  sync(); show('title')
  $('loadbar').style.width = '100%'
  requestAnimationFrame(frame)
  requestAnimationFrame(() => { hide_('loading'); platform.message('game_ready') })
  if (BOT && !RENDER) setTimeout(startRun, 200)
  // &shot=x,z,r: park the camera there with no menus, for before/after pictures
  if (Q.has('shot')) { const [x, z, r] = Q.get('shot').split(',').map(Number); hole.x = x; hole.z = z; hole.r = hole.shown = r; camera.position.set(x, 20 + r * 4.9, z + (20 + r * 4.9) * 0.72); hide_('title'); $('coins')?.classList.add('hide') }
}
if (RENDER) window.__render = {
  soundLog,
  // Advances the run by whole frames at 60 per second; draws only when asked, so a recording never drops a frame.
  step(frames, draw = true) {
    for (let i = 0; i < frames && game.state === 'run'; i++) { renderClock += 1 / 60; tick(1 / 60); updateFallers(1 / 60); updateChunks(1 / 60); updateSparks(1 / 60); updateView(1 / 60, renderClock * 1000) }
    if (draw) window.__draw()
    return { time: game.time, r: hole.r, state: game.state, castle: world.items.find((x) => x.kind === 'castle')?.alive, clock: renderClock }
  },
  caption(text) { if (Q.has("nocap")) return; let c = document.getElementById('cap'); if (!c) { c = document.createElement('div'); c.id = 'cap'; c.style.cssText = 'position:fixed;left:0;right:0;top:19%;z-index:9;text-align:center;font-size:42px;line-height:1.15;color:#fff;-webkit-text-stroke:8px #24183f;paint-order:stroke fill;padding:0 16px'; document.body.appendChild(c) } c.textContent = text },
}
if (BOT || RENDER || Q.has('debug')) window.__gt = { game, hole, world, save, THEMES, startRun, audio, platform, scene, front, renderer, get size() { return size() } }
window.addEventListener('error', (e) => console.error('page error', e.message))
boot()
