// Melt Bot: a freshly booted android takes 'tidy the city' literally and melts it with its eye laser.
// One move to play (the laser is always on); a run lasts a minute; parts buy a stronger next run.
// 11-23: three.js comes gzipped (670 KB -> 170 KB, RELEASE_GATE load under 8 s at 300 KB/s): unzip, import from a blob;
// a server that already unzipped it (Content-Encoding) hands plain text; no DecompressionStream or any failure -> the plain file
const THREE = await (async () => {
  try {
    if (typeof DecompressionStream === 'undefined') throw new Error('no gzip')
    const r = await fetch(new URL('./vendor/three.module.min.js.gz', import.meta.url)); if (!r.ok) throw new Error('no gz')
    const b = new Uint8Array(await r.arrayBuffer())
    const text = b[0] === 0x1f && b[1] === 0x8b ? await new Response(new Blob([b]).stream().pipeThrough(new DecompressionStream('gzip'))).text() : new TextDecoder().decode(b)
    if (text.length !== 670681) throw new Error('size')
    const url = URL.createObjectURL(new Blob([text], { type: 'text/javascript' }))
    return await import(url)
  } catch { return import('./vendor/three.module.min.js') }
})()
import { MODELS } from './models.js'

const Q = new URLSearchParams(location.search)
const BOT = Q.has('bot')
const BUILD = '2026-11-21' // sent with each analytics event, to compare builds
const TURBO = Number(Q.get('turbo') || 0)
const RENDER = Q.has('render')
const HIDE_GOALS = RENDER && !Q.has('goals') // ?render&goals keeps the goal card and chips in a recording (11-16 goals short)
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
  en: { newSkin: "New laser colour!", talk1: "Right now this bot only melts little street things.", talk2: "Melt more, grow bigger. Last stop: the city landmark.",  play: 'PLAY', again: 'PLAY AGAIN', home: 'Home', upgrades: 'Upgrades', skins: "Lasers", settings: 'Settings', close: 'Close', paused: 'Paused', resume: 'Resume', quit: 'End run', music: 'Music', sfx: 'Sound', shake: 'Screen shake', language: 'Language', on: 'On', off: 'Off', size: 'SIZE', eaten: "Task done", best: 'Best', timeUp: "TIME'S UP!", cleared: "CITY MELTED!", double: 'Double gold', drag: 'Drag to move', mouse: 'Move the mouse', frenzy: "OVERHEAT!", sizeUp: 'SIZE UP!', locked: "Earn 1 star in the last city", owned: 'Owned', use: 'Use', used: 'In use', max: 'MAX', lvl: 'Lv', upTime: 'More time', upTimeD: '+5 s each run', upSpeed: 'Speed', upSpeedD: "Move faster", upStart: 'Big start', upStartD: 'Start larger', upMagnet: "Power", upMagnetD: "Melts faster", upBlast: 'Chain blast', upBlastD: 'Bigger blasts', newCity: 'NEW CITY!', upGold: 'Gold', upGoldD: '+10% gold'  , moreTime: '+15 s', drone: 'Drone' , me: 'You', rankAll: 'Best overall', noRecord: 'No records yet', secs: 's', rank: 'Ranking', rankFast: 'Landmark time', chars: "Characters", chMelt: "Melt Bot", chUfo: "Abduction UFO", chOcto: "Octo Robot", chMeteor: "Meteor Bot", chUfoHow: "Finish your first run", chMeteorHow: "Destroy the landmark in {city}", newChar: "NEW CHARACTER!", evoNext: "Next evolution {n}%", evoUp: "EVOLVED!", evoMax: "Fully evolved", nextChar: "Next character {n}%", droneSkip: "Watch the whole ad for the drone", lvNext: "Next Lv {n}%", lvUp: "LEVEL UP!", palName: "{city} Drone", palNew: "NEW DRONE!", pals: "Drones", palHow: "Destroy the landmark" },
  ko: { newSkin: "새 레이저 색!", talk1: "이 로봇, 지금은 길가 작은 것만 겨우 녹여.", talk2: "녹일수록 커져. 마지막엔 도시 랜드마크까지.",  play: '시작', again: '다시 하기', home: '처음으로', upgrades: '강화', skins: "레이저", settings: '설정', close: '닫기', paused: '일시정지', resume: '계속', quit: '판 끝내기', music: '배경음', sfx: '효과음', shake: '화면 흔들림', language: '언어', on: '켬', off: '끔', size: '크기', eaten: "명령 완료", best: '최고', timeUp: '시간 끝!', cleared: "도시를 다 녹였다!", double: '골드 2배', drag: '끌어서 움직이기', mouse: '마우스를 움직이기', frenzy: "과열 모드!", sizeUp: '커졌다!', locked: "앞 도시에서 별 1개", owned: '보유', use: '쓰기', used: '사용 중', max: '최대', lvl: 'Lv', upTime: '시간', upTimeD: '판마다 +5초', upSpeed: '속도', upSpeedD: "더 빠르게", upStart: '큰 시작', upStartD: '더 크게 출발', upMagnet: "힘", upMagnetD: "더 빨리 녹임", upBlast: '연쇄 폭발', upBlastD: '폭발이 더 크게', newCity: '새 도시!', upGold: '골드', upGoldD: '골드 +10%'  , moreTime: '+15초', drone: '드론' , me: '나', rankAll: '전체 최고', noRecord: '아직 기록 없음', secs: '초', rank: '랭킹', rankFast: '랜드마크 기록', chars: "캐릭터", chMelt: "멜트 봇", chUfo: "납치 UFO", chOcto: "문어 로봇", chMeteor: "운석 봇", chUfoHow: "첫 판을 끝내면", chMeteorHow: "{city} 랜드마크를 없애면", newChar: "새 캐릭터!", evoNext: "다음 진화까지 {n}%", evoUp: "진화!", evoMax: "최종 진화", nextChar: "다음 캐릭터까지 {n}%", droneSkip: "광고를 끝까지 보면 드론", lvNext: "다음 레벨 {n}%", lvUp: "레벨 업!", palName: "{city} 드론", palNew: "새 드론!", pals: "드론", palHow: "랜드마크를 없애면" },
  es: { newSkin: "¡Nuevo color de láser!", talk1: "Ahora este robot solo derrite cositas de la calle.", talk2: "Derrite más y crece. Al final, el monumento de la ciudad.", "play": "JUGAR", "again": "OTRA VEZ", "home": "Inicio", "upgrades": "Mejoras", "skins": "Láseres", "settings": "Ajustes", "close": "Cerrar", "paused": "Pausa", "resume": "Seguir", "quit": "Terminar", "music": "Música", "sfx": "Sonido", "shake": "Vibración", "language": "Idioma", "on": "Sí", "off": "No", "size": "TAMAÑO", "eaten": "Tarea completada", "best": "Récord", "timeUp": "¡TIEMPO!", "cleared": "¡CIUDAD DERRETIDA!", "double": "Oro doble", "drag": "Arrastra para moverte", "mouse": "Mueve el ratón", "frenzy": "¡SOBRECALENTADO!", "sizeUp": "¡MÁS GRANDE!", "locked": "Gana 1 estrella en la ciudad anterior", "owned": "Tuyo", "use": "Usar", "used": "En uso", "max": "MÁX", "lvl": "Nv", "upTime": "Más tiempo", "upTimeD": "+5 s por partida", "upSpeed": "Velocidad", "upSpeedD": "Muévete más rápido", "upStart": "Gran inicio", "upStartD": "Empieza más grande", "upMagnet": "Potencia", "upMagnetD": "Derrite más rápido", "upBlast": "Explosión en cadena", "upBlastD": "Explosiones más grandes", "newCity": "¡NUEVA CIUDAD!", "upGold": "Oro", "upGoldD": "+10% de oro", "moreTime": "+15 s", "drone": "Dron", "me": "Tú", "rankAll": "Mejor total", "noRecord": "Aún no hay récords", "secs": " s", "rank": "Clasificación", "rankFast": "Tiempo monumento", chars: "Personajes", chMelt: "Melt Bot", chUfo: "OVNI abductor", chOcto: "Robot pulpo", chMeteor: "Bot meteoro", chUfoHow: "Termina tu primera partida", chMeteorHow: "Destruye el monumento de {city}", newChar: "¡NUEVO PERSONAJE!", evoNext: "Próxima evolución {n}%", evoUp: "¡EVOLUCIONÓ!", evoMax: "Evolución final", nextChar: "Próximo personaje {n}%", droneSkip: "Mira el anuncio entero para el dron", lvNext: "Sig. nivel {n}%", lvUp: "¡SUBES DE NIVEL!", palName: "Dron de {city}", palNew: "¡NUEVO DRON!", pals: "Drones", palHow: "Destruye el monumento" },
  pt: { newSkin: "Nova cor de laser!", talk1: "Agora este robô só derrete coisinhas da rua.", talk2: "Derreta mais e cresça. No fim, o monumento da cidade.", "play": "JOGAR", "again": "DE NOVO", "home": "Início", "upgrades": "Melhorias", "skins": "Lasers", "settings": "Ajustes", "close": "Fechar", "paused": "Pausa", "resume": "Continuar", "quit": "Encerrar", "music": "Música", "sfx": "Som", "shake": "Tremor", "language": "Idioma", "on": "Sim", "off": "Não", "size": "TAMANHO", "eaten": "Tarefa concluída", "best": "Recorde", "timeUp": "ACABOU!", "cleared": "CIDADE DERRETIDA!", "double": "Ouro em dobro", "drag": "Arraste para mover", "mouse": "Mova o mouse", "frenzy": "SUPERAQUECIDO!", "sizeUp": "CRESCEU!", "locked": "Ganhe 1 estrela na cidade anterior", "owned": "Seu", "use": "Usar", "used": "Em uso", "max": "MÁX", "lvl": "Nv", "upTime": "Mais tempo", "upTimeD": "+5 s por partida", "upSpeed": "Velocidade", "upSpeedD": "Mova-se mais rápido", "upStart": "Início grande", "upStartD": "Comece maior", "upMagnet": "Potência", "upMagnetD": "Derrete mais rápido", "upBlast": "Explosão em cadeia", "upBlastD": "Explosões maiores", "newCity": "NOVA CIDADE!", "upGold": "Ouro", "upGoldD": "+10% de ouro", "moreTime": "+15 s", "drone": "Drone", "me": "Você", "rankAll": "Melhor geral", "noRecord": "Ainda sem recordes", "secs": " s", "rank": "Classificação", "rankFast": "Tempo marco", chars: "Personagens", chMelt: "Melt Bot", chUfo: "OVNI abdutor", chOcto: "Robô polvo", chMeteor: "Robô meteoro", chUfoHow: "Termine sua primeira partida", chMeteorHow: "Destrua o marco de {city}", newChar: "NOVO PERSONAGEM!", evoNext: "Próxima evolução {n}%", evoUp: "EVOLUIU!", evoMax: "Evolução final", nextChar: "Próximo personagem {n}%", droneSkip: "Assista ao anúncio inteiro para o drone", lvNext: "Próx. nível {n}%", lvUp: "SUBIU DE NÍVEL!", palName: "Drone de {city}", palNew: "NOVO DRONE!", pals: "Drones", palHow: "Destrua o monumento" },
  ru: { newSkin: "Новый цвет лазера!", talk1: "Пока этот робот плавит только мелочь на улице.", talk2: "Плавь больше — расти. В конце — главное здание города.", "play": "ИГРАТЬ", "again": "ЕЩЁ РАЗ", "home": "Меню", "upgrades": "Улучшения", "skins": "Лазеры", "settings": "Настройки", "close": "Закрыть", "paused": "Пауза", "resume": "Продолжить", "quit": "Завершить", "music": "Музыка", "sfx": "Звук", "shake": "Тряска", "language": "Язык", "on": "Вкл", "off": "Выкл", "size": "РАЗМЕР", "eaten": "Задача выполнена", "best": "Рекорд", "timeUp": "ВРЕМЯ ВЫШЛО!", "cleared": "ГОРОД РАСПЛАВЛЕН!", "double": "Золото x2", "drag": "Тяни, чтобы двигаться", "mouse": "Двигай мышью", "frenzy": "ПЕРЕГРЕВ!", "sizeUp": "БОЛЬШЕ!", "locked": "Нужна 1 звезда в прошлом городе", "owned": "Есть", "use": "Выбрать", "used": "Выбрано", "max": "МАКС", "lvl": "Ур", "upTime": "Время", "upTimeD": "+5 с за игру", "upSpeed": "Скорость", "upSpeedD": "Двигайся быстрее", "upStart": "Большой старт", "upStartD": "Начни крупнее", "upMagnet": "Сила", "upMagnetD": "Плавит быстрее", "upBlast": "Цепной взрыв", "upBlastD": "Взрывы мощнее", "newCity": "НОВЫЙ ГОРОД!", "upGold": "Золото", "upGoldD": "+10% золота", "moreTime": "+15 с", "drone": "Дрон", "me": "Вы", "rankAll": "Общий рекорд", "noRecord": "Пока нет рекордов", "secs": " с", "rank": "Рейтинг", "rankFast": "Снос символа", chars: "Персонажи", chMelt: "Melt Bot", chUfo: "НЛО-похититель", chOcto: "Робо-осьминог", chMeteor: "Метеор-бот", chUfoHow: "Заверши первую игру", chMeteorHow: "Разрушь символ: {city}", newChar: "НОВЫЙ ПЕРСОНАЖ!", evoNext: "До эволюции {n}%", evoUp: "ЭВОЛЮЦИЯ!", evoMax: "Последняя форма", nextChar: "Новый персонаж {n}%", droneSkip: "Досмотрите рекламу — будет дрон", lvNext: "След. ур. {n}%", lvUp: "НОВЫЙ УРОВЕНЬ!", palName: "Дрон «{city}»", palNew: "НОВЫЙ ДРОН!", pals: "Дроны", palHow: "Разрушь достопримечательность" },
  tr: { newSkin: "Yeni lazer rengi!", talk1: "Bu robot şimdilik sokaktaki ufak şeyleri eritir.", talk2: "Erittikçe büyür. Sonunda şehrin simgesi.", "play": "OYNA", "again": "TEKRAR", "home": "Ana menü", "upgrades": "Yükseltmeler", "skins": "Lazerler", "settings": "Ayarlar", "close": "Kapat", "paused": "Duraklatıldı", "resume": "Devam", "quit": "Bitir", "music": "Müzik", "sfx": "Ses", "shake": "Sarsıntı", "language": "Dil", "on": "Açık", "off": "Kapalı", "size": "BOYUT", "eaten": "Görev tamam", "best": "En iyi", "timeUp": "SÜRE BİTTİ!", "cleared": "ŞEHİR ERİDİ!", "double": "İki kat altın", "drag": "Hareket için sürükle", "mouse": "Fareyi hareket ettir", "frenzy": "AŞIRI ISINMA!", "sizeUp": "BÜYÜDÜ!", "locked": "Önceki şehirde 1 yıldız kazan", "owned": "Sende", "use": "Kullan", "used": "Kullanımda", "max": "MAKS", "lvl": "Sv", "upTime": "Süre", "upTimeD": "Oyun başına +5 sn", "upSpeed": "Hız", "upSpeedD": "Daha hızlı git", "upStart": "Büyük başlangıç", "upStartD": "Daha büyük başla", "upMagnet": "Güç", "upMagnetD": "Daha hızlı eritir", "upBlast": "Zincirleme patlama", "upBlastD": "Daha büyük patlama", "newCity": "YENİ ŞEHİR!", "upGold": "Altın", "upGoldD": "+%10 altın", "moreTime": "+15 sn", "drone": "Drone", "me": "Sen", "rankAll": "Genel rekor", "noRecord": "Henüz rekor yok", "secs": " sn", "rank": "Sıralama", "rankFast": "Simge süresi", chars: "Karakterler", chMelt: "Melt Bot", chUfo: "Kaçıran UFO", chOcto: "Ahtapot Robot", chMeteor: "Meteor Bot", chUfoHow: "İlk oyununu bitir", chMeteorHow: "{city} simgesini yık", newChar: "YENİ KARAKTER!", evoNext: "Sonraki evrim %{n}", evoUp: "EVRİMLEŞTİ!", evoMax: "Son evrim", nextChar: "Yeni karakter %{n}", droneSkip: "Drone için reklamı sonuna kadar izle", lvNext: "Sonraki Sv %{n}", lvUp: "SEVİYE ATLADIN!", palName: "{city} Dronu", palNew: "YENİ DRON!", pals: "Dronlar", palHow: "Simge yapıyı yık" },
  de: { newSkin: "Neue Laserfarbe!", talk1: "Noch schmilzt der Roboter nur kleine Dinge am Straßenrand.", talk2: "Je mehr er schmilzt, desto größer. Am Ende: das Wahrzeichen.", "play": "SPIELEN", "again": "NOCHMAL", "home": "Start", "upgrades": "Upgrades", "skins": "Laser", "settings": "Optionen", "close": "Schließen", "paused": "Pause", "resume": "Weiter", "quit": "Beenden", "music": "Musik", "sfx": "Sound", "shake": "Wackeln", "language": "Sprache", "on": "An", "off": "Aus", "size": "GRÖSSE", "eaten": "Auftrag erledigt", "best": "Rekord", "timeUp": "ZEIT UM!", "cleared": "STADT GESCHMOLZEN!", "double": "Doppeltes Gold", "drag": "Ziehen zum Bewegen", "mouse": "Maus bewegen", "frenzy": "ÜBERHITZT!", "sizeUp": "GRÖSSER!", "locked": "1 Stern in der Stadt davor", "owned": "Deins", "use": "Nutzen", "used": "Aktiv", "max": "MAX", "lvl": "St", "upTime": "Mehr Zeit", "upTimeD": "+5 s pro Runde", "upSpeed": "Tempo", "upSpeedD": "Schneller bewegen", "upStart": "Großer Start", "upStartD": "Größer beginnen", "upMagnet": "Kraft", "upMagnetD": "Schmilzt schneller", "upBlast": "Kettenexplosion", "upBlastD": "Größere Explosionen", "newCity": "NEUE STADT!", "upGold": "Gold", "upGoldD": "+10% Gold", "moreTime": "+15 s", "drone": "Drohne", "me": "Du", "rankAll": "Gesamtrekord", "noRecord": "Noch keine Rekorde", "secs": " s", "rank": "Rangliste", "rankFast": "Wahrzeichen-Zeit", chars: "Figuren", chMelt: "Melt Bot", chUfo: "Entführungs-UFO", chOcto: "Oktopus-Roboter", chMeteor: "Meteor-Bot", chUfoHow: "Beende deine erste Runde", chMeteorHow: "Zerstöre das Wahrzeichen: {city}", newChar: "NEUE FIGUR!", evoNext: "Nächste Entwicklung {n}%", evoUp: "ENTWICKELT!", evoMax: "Voll entwickelt", nextChar: "Nächste Figur {n}%", droneSkip: "Werbung ganz ansehen für die Drohne", lvNext: "Nächstes Lv {n}%", lvUp: "LEVEL UP!", palName: "{city}-Drohne", palNew: "NEUE DROHNE!", pals: "Drohnen", palHow: "Zerstöre das Wahrzeichen" },
  fr: { newSkin: "Nouvelle couleur de laser !", talk1: "Pour l'instant, ce robot ne fait fondre que des petits trucs.", talk2: "Plus il fait fondre, plus il grandit. À la fin : le monument.", "play": "JOUER", "again": "REJOUER", "home": "Accueil", "upgrades": "Améliorations", "skins": "Lasers", "settings": "Réglages", "close": "Fermer", "paused": "Pause", "resume": "Reprendre", "quit": "Terminer", "music": "Musique", "sfx": "Son", "shake": "Secousses", "language": "Langue", "on": "Oui", "off": "Non", "size": "TAILLE", "eaten": "Tâche accomplie", "best": "Record", "timeUp": "TEMPS ÉCOULÉ !", "cleared": "VILLE FONDUE !", "double": "Or doublé", "drag": "Glisse pour bouger", "mouse": "Bouge la souris", "frenzy": "SURCHAUFFE !", "sizeUp": "PLUS GROS !", "locked": "1 étoile dans la ville d’avant", "owned": "À toi", "use": "Utiliser", "used": "Utilisé", "max": "MAX", "lvl": "Nv", "upTime": "Plus de temps", "upTimeD": "+5 s par partie", "upSpeed": "Vitesse", "upSpeedD": "Bouge plus vite", "upStart": "Gros départ", "upStartD": "Commence plus gros", "upMagnet": "Puissance", "upMagnetD": "Fait fondre plus vite", "upBlast": "Explosion en chaîne", "upBlastD": "Explosions plus grosses", "newCity": "NOUVELLE VILLE !", "upGold": "Or", "upGoldD": "+10% d'or", "moreTime": "+15 s", "drone": "Drone", "me": "Toi", "rankAll": "Record global", "noRecord": "Pas encore de record", "secs": " s", "rank": "Classement", "rankFast": "Temps monument", chars: "Personnages", chMelt: "Melt Bot", chUfo: "OVNI ravisseur", chOcto: "Robot pieuvre", chMeteor: "Robot météore", chUfoHow: "Termine ta première partie", chMeteorHow: "Détruis le monument : {city}", newChar: "NOUVEAU PERSONNAGE !", evoNext: "Prochaine évolution {n}%", evoUp: "ÉVOLUTION !", evoMax: "Évolution finale", nextChar: "Prochain personnage {n}%", droneSkip: "Regarde la pub en entier pour le drone", lvNext: "Niv. suivant {n}%", lvUp: "NIVEAU SUPÉRIEUR !", palName: "Drone de {city}", palNew: "NOUVEAU DRONE !", pals: "Drones", palHow: "Détruis le monument" },
  ja: { newSkin: "新しいレーザー色！", talk1: "このロボ、今は道ばたの小物しか溶かせない。", talk2: "溶かすほど大きくなる。最後は街のシンボルまで。", "play": "プレイ", "again": "もう一度", "home": "ホーム", "upgrades": "強化", "skins": "レーザー", "settings": "設定", "close": "閉じる", "paused": "一時停止", "resume": "続ける", "quit": "終了", "music": "音楽", "sfx": "効果音", "shake": "画面の揺れ", "language": "言語", "on": "オン", "off": "オフ", "size": "サイズ", "eaten": "命令完了", "best": "最高", "timeUp": "タイムアップ!", "cleared": "街を溶かしきった！", "double": "ゴールド2倍", "drag": "ドラッグで移動", "mouse": "マウスで移動", "frenzy": "オーバーヒート！", "sizeUp": "大きくなった!", "locked": "前の街で星1つ", "owned": "所持", "use": "使う", "used": "使用中", "max": "最大", "lvl": "Lv", "upTime": "時間", "upTimeD": "1回ごとに+5秒", "upSpeed": "速度", "upSpeedD": "速く動く", "upStart": "大きくスタート", "upStartD": "大きな状態で開始", "upMagnet": "パワー", "upMagnetD": "もっと速く溶かす", "upBlast": "連鎖爆発", "upBlastD": "爆発がもっと大きく", "newCity": "新しい街！", "upGold": "ゴールド", "upGoldD": "ゴールド+10%", "moreTime": "+15秒", "drone": "ドローン", "me": "あなた", "rankAll": "総合ベスト", "noRecord": "まだ記録なし", "secs": "秒", "rank": "ランキング", "rankFast": "ランドマーク時間", chars: "キャラ", chMelt: "メルトボット", chUfo: "アブダクトUFO", chOcto: "タコロボ", chMeteor: "隕石ボット", chUfoHow: "最初の1回を終える", chMeteorHow: "{city}のランドマークを壊す", newChar: "新キャラ！", evoNext: "次の進化まで{n}%", evoUp: "進化！", evoMax: "最終進化", nextChar: "次のキャラまで{n}%", droneSkip: "広告を最後まで見るとドローン", lvNext: "次のLv {n}%", lvUp: "レベルアップ!", palName: "{city}ドローン", palNew: "新ドローン！", pals: "ドローン", palHow: "ランドマークを壊すと" },
  zh: { newSkin: "新激光颜色！", talk1: "这个机器人现在只能熔掉路边的小东西。", talk2: "熔得越多越大。最后连城市地标也熔掉。", "play": "开始", "again": "再来一局", "home": "主页", "upgrades": "升级", "skins": "激光", "settings": "设置", "close": "关闭", "paused": "已暂停", "resume": "继续", "quit": "结束本局", "music": "音乐", "sfx": "音效", "shake": "屏幕震动", "language": "语言", "on": "开", "off": "关", "size": "大小", "eaten": "任务完成", "best": "最高", "timeUp": "时间到!", "cleared": "城市全熔化！", "double": "金币翻倍", "drag": "拖动来移动", "mouse": "移动鼠标", "frenzy": "过热模式！", "sizeUp": "变大了!", "locked": "在上一座城市获得1颗星", "owned": "已拥有", "use": "使用", "used": "使用中", "max": "满级", "lvl": "Lv", "upTime": "时间", "upTimeD": "每局+5秒", "upSpeed": "速度", "upSpeedD": "移动更快", "upStart": "大号开局", "upStartD": "开局更大", "upMagnet": "力量", "upMagnetD": "熔化更快", "upBlast": "连锁爆炸", "upBlastD": "爆炸更大", "newCity": "新城市！", "upGold": "金币", "upGoldD": "金币+10%", "moreTime": "+15秒", "drone": "无人机", "me": "我", "rankAll": "总最高分", "noRecord": "暂无记录", "secs": "秒", "rank": "排行榜", "rankFast": "地标用时", chars: "角色", chMelt: "熔化机器人", chUfo: "绑架飞碟", chOcto: "章鱼机器人", chMeteor: "陨石机器人", chUfoHow: "完成第一局", chMeteorHow: "摧毁{city}的地标", newChar: "新角色！", evoNext: "距下次进化{n}%", evoUp: "进化了！", evoMax: "最终形态", nextChar: "下一个角色 {n}%", droneSkip: "看完广告就有无人机", lvNext: "下一级 {n}%", lvUp: "升级！", palName: "{city}无人机", palNew: "新无人机！", pals: "无人机", palHow: "摧毁地标后获得" },
}
// goal lines, {n} = the number (11-16)
const GOAL_TEXT = {
  en: { goals: 'Goals', people: 'Melt {n} people', cars: 'Melt {n} cars', buses: 'Melt {n} buses', trees: 'Melt {n} trees and bushes', houses: 'Melt {n} houses', shops: 'Melt {n} shops', towers: 'Melt {n} tall buildings', props: 'Melt {n} street things', size: 'Grow to size {n}', blasts: 'Set off {n} blasts', melt: 'Melt {n}% of the city', landmark: 'Melt the landmark', stars: 'Get {n} stars', score: 'Score {n}', early: 'Melt a building in the first {n} s', heat: 'Melt {n} things in the last 10 s', huge: 'Melt {n} huge buildings' },
  ko: { goals: '목표', people: '사람 {n}명 녹이기', cars: '자동차 {n}대 녹이기', buses: '버스 {n}대 녹이기', trees: '나무 · 덤불 {n}개 녹이기', houses: '집 {n}채 녹이기', shops: '가게 {n}곳 녹이기', towers: '높은 빌딩 {n}채 녹이기', props: '길거리 물건 {n}개 녹이기', size: '크기 {n}까지 커지기', blasts: '폭발 {n}번 일으키기', melt: '도시 {n}% 녹이기', landmark: '랜드마크 녹이기', stars: '별 {n}개 받기', score: '{n}점 넘기기', early: '{n}초 안에 건물 녹이기', heat: '마지막 10초에 {n}개 녹이기', huge: '아주 큰 건물 {n}채 녹이기' },
  es: { goals: 'Objetivos', people: 'Derrite a {n} personas', cars: 'Derrite {n} coches', buses: 'Derrite {n} autobuses', trees: 'Derrite {n} árboles y arbustos', houses: 'Derrite {n} casas', shops: 'Derrite {n} tiendas', towers: 'Derrite {n} edificios altos', props: 'Derrite {n} objetos de la calle', size: 'Llega al tamaño {n}', blasts: 'Provoca {n} explosiones', melt: 'Derrite el {n}% de la ciudad', landmark: 'Derrite el monumento', stars: 'Consigue {n} estrellas', score: 'Haz {n} puntos', early: 'Derrite un edificio en {n} s', heat: 'Derrite {n} cosas en los últimos 10 s', huge: 'Derrite {n} edificios enormes' },
  pt: { goals: 'Objetivos', people: 'Derreta {n} pessoas', cars: 'Derreta {n} carros', buses: 'Derreta {n} ônibus', trees: 'Derreta {n} árvores e arbustos', houses: 'Derreta {n} casas', shops: 'Derreta {n} lojas', towers: 'Derreta {n} prédios altos', props: 'Derreta {n} objetos da rua', size: 'Chegue ao tamanho {n}', blasts: 'Cause {n} explosões', melt: 'Derreta {n}% da cidade', landmark: 'Derreta o monumento', stars: 'Ganhe {n} estrelas', score: 'Faça {n} pontos', early: 'Derreta um prédio em {n} s', heat: 'Derreta {n} coisas nos últimos 10 s', huge: 'Derreta {n} prédios enormes' },
  ru: { goals: 'Цели', people: 'Расплавь людей: {n}', cars: 'Расплавь машины: {n}', buses: 'Расплавь автобусы: {n}', trees: 'Расплавь деревья и кусты: {n}', houses: 'Расплавь дома: {n}', shops: 'Расплавь магазины: {n}', towers: 'Расплавь высотки: {n}', props: 'Расплавь уличные вещи: {n}', size: 'Вырасти до размера {n}', blasts: 'Устрой взрывы: {n}', melt: 'Расплавь {n}% города', landmark: 'Расплавь достопримечательность', stars: 'Получи звёзды: {n}', score: 'Набери {n} очков', early: 'Расплавь здание за {n} с', heat: 'Расплавь {n} шт. за последние 10 с', huge: 'Расплавь огромные здания: {n}' },
  tr: { goals: 'Hedefler', people: '{n} insan erit', cars: '{n} araba erit', buses: '{n} otobüs erit', trees: '{n} ağaç ve çalı erit', houses: '{n} ev erit', shops: '{n} dükkân erit', towers: '{n} yüksek bina erit', props: '{n} sokak eşyası erit', size: '{n} boyuta ulaş', blasts: '{n} patlama yap', melt: 'Şehrin %{n} kadarını erit', landmark: 'Simge yapıyı erit', stars: '{n} yıldız kazan', score: '{n} puan yap', early: 'İlk {n} sn içinde bina erit', heat: 'Son 10 sn içinde {n} şey erit', huge: '{n} dev bina erit' },
  de: { goals: 'Ziele', people: 'Schmilz {n} Menschen', cars: 'Schmilz {n} Autos', buses: 'Schmilz {n} Busse', trees: 'Schmilz {n} Bäume und Büsche', houses: 'Schmilz {n} Häuser', shops: 'Schmilz {n} Läden', towers: 'Schmilz {n} Hochhäuser', props: 'Schmilz {n} Straßendinge', size: 'Wachse auf Größe {n}', blasts: 'Löse {n} Explosionen aus', melt: 'Schmilz {n} % der Stadt', landmark: 'Schmilz das Wahrzeichen', stars: 'Hol {n} Sterne', score: 'Erziele {n} Punkte', early: 'Schmilz ein Gebäude in {n} s', heat: 'Schmilz {n} Dinge in den letzten 10 s', huge: 'Schmilz {n} Riesengebäude' },
  fr: { goals: 'Objectifs', people: 'Fais fondre {n} personnes', cars: 'Fais fondre {n} voitures', buses: 'Fais fondre {n} bus', trees: 'Fais fondre {n} arbres et buissons', houses: 'Fais fondre {n} maisons', shops: 'Fais fondre {n} boutiques', towers: 'Fais fondre {n} tours', props: 'Fais fondre {n} objets de rue', size: 'Atteins la taille {n}', blasts: 'Provoque {n} explosions', melt: 'Fais fondre {n} % de la ville', landmark: 'Fais fondre le monument', stars: 'Obtiens {n} étoiles', score: 'Marque {n} points', early: 'Fais fondre un bâtiment en {n} s', heat: 'Fais fondre {n} choses dans les 10 dernières s', huge: 'Fais fondre {n} bâtiments géants' },
  ja: { goals: '目標', people: '人を{n}人溶かす', cars: '車を{n}台溶かす', buses: 'バスを{n}台溶かす', trees: '木や茂みを{n}個溶かす', houses: '家を{n}軒溶かす', shops: '店を{n}軒溶かす', towers: 'ビルを{n}棟溶かす', props: '街の物を{n}個溶かす', size: 'サイズ{n}まで大きくなる', blasts: '爆発を{n}回起こす', melt: '街を{n}%溶かす', landmark: 'ランドマークを溶かす', stars: '星を{n}個とる', score: '{n}点をとる', early: '{n}秒以内に建物を溶かす', heat: '最後の10秒で{n}個溶かす', huge: '巨大な建物を{n}棟溶かす' },
  zh: { goals: '目标', people: '熔化{n}个人', cars: '熔化{n}辆汽车', buses: '熔化{n}辆巴士', trees: '熔化{n}棵树和灌木', houses: '熔化{n}栋房子', shops: '熔化{n}家商店', towers: '熔化{n}栋高楼', props: '熔化{n}个街边物件', size: '长到{n}号大小', blasts: '引发{n}次爆炸', melt: '熔化城市的{n}%', landmark: '熔化地标', stars: '获得{n}颗星', score: '得到{n}分', early: '{n}秒内熔化一栋建筑', heat: '最后10秒熔化{n}个东西', huge: '熔化{n}栋巨型建筑' },
}
const TOWN_NAMES = { en: ['New York', 'London', 'Paris', 'Rome', 'Cairo', 'Tokyo', 'Seoul', 'Dubai', 'Las Vegas', 'Toronto', 'Nice'], ko: ['뉴욕', '런던', '파리', '로마', '카이로', '도쿄', '서울', '두바이', '라스베이거스', '토론토', '니스'], es: ["Nueva York", "Londres", "París", "Roma", "El Cairo", "Tokio", "Seúl", "Dubái", "Las Vegas", "Toronto", "Niza"], pt: ["Nova York", "Londres", "Paris", "Roma", "Cairo", "Tóquio", "Seul", "Dubai", "Las Vegas", "Toronto", "Nice"], ru: ["Нью-Йорк", "Лондон", "Париж", "Рим", "Каир", "Токио", "Сеул", "Дубай", "Лас-Вегас", "Торонто", "Ницца"], tr: ["New York", "Londra", "Paris", "Roma", "Kahire", "Tokyo", "Seul", "Dubai", "Las Vegas", "Toronto", "Nice"], de: ["New York", "London", "Paris", "Rom", "Kairo", "Tokio", "Seoul", "Dubai", "Las Vegas", "Toronto", "Nizza"], fr: ["New York", "Londres", "Paris", "Rome", "Le Caire", "Tokyo", "Séoul", "Dubaï", "Las Vegas", "Toronto", "Nice"], ja: ["ニューヨーク", "ロンドン", "パリ", "ローマ", "カイロ", "東京", "ソウル", "ドバイ", "ラスベガス", "トロント", "ニース"], zh: ["纽约", "伦敦", "巴黎", "罗马", "开罗", "东京", "首尔", "迪拜", "拉斯维加斯", "多伦多", "尼斯"] }
// HQ and the android, one exchange per city on the 'new city' card (2026-11-08 narrative: a growing misunderstanding)
const STORY = {"en": [["Clean up the city.", "Command received. Cleaning."], ["Wait, not THAT kind of clean!", "Understood. Cleaner."], ["Leave the Eiffel Tower out!", "Eiffel Tower found. Priority."], ["That's 2,000 years old!", "Old dust detected."], ["Pyramids are supposed to look like that.", "Corners need cleaning."], ["Please stop. I'm begging.", "Begging = faster."], ["Does anyone know how to turn it off?", "Power switch cleaned."], ["Not the tallest building!", "Tallest dust found."], ["Let's bet. You lose, you stop.", "Bet accepted. Stake: the city."], ["Canada was nice to you!", "Nice dust is still dust."], ["I was on vacation…", "Vacation: also clutter."]], "ko": [["도시를 정리하라.", "명령 확인. 정리 시작."], ["잠깐, 그 정리 말고!", "알겠습니다. 더 깨끗하게."], ["에펠탑은 빼라!", "에펠탑 확인. 먼저 처리."], ["그건 2천 년 된 거야!", "오래된 먼지 감지."], ["피라미드는 원래 그렇게 생겼어.", "모서리 정리 필요."], ["제발 멈춰. 부탁이야.", "'부탁' = 더 빨리."], ["이거 끄는 법 아는 사람?", "전원 장치 정리 완료."], ["제일 높은 건물은 절대 안 돼!", "제일 높은 먼지 발견."], ["내기하자. 네가 지면 멈추는 거다.", "내기 수락. 판돈: 도시."], ["캐나다는 너한테 친절했잖아!", "친절한 먼지도 먼지."], ["나 휴가 중이었는데…", "휴가도 정리 대상."]], "es": [["Limpia la ciudad.", "Orden recibida. Limpiando."], ["¡Espera, no ESE tipo de limpieza!", "Entendido. Más limpio."], ["¡La Torre Eiffel no!", "Torre Eiffel localizada. Prioridad."], ["¡Eso tiene 2000 años!", "Polvo antiguo detectado."], ["Las pirámides son así.", "Esquinas por limpiar."], ["Para, por favor. Te lo suplico.", "Suplicar = más rápido."], ["¿Alguien sabe cómo apagarlo?", "Interruptor limpiado."], ["¡El edificio más alto no!", "Polvo más alto encontrado."], ["Apostemos. Si pierdes, paras.", "Apuesta aceptada. En juego: la ciudad."], ["¡Canadá fue amable contigo!", "El polvo amable sigue siendo polvo."], ["Estaba de vacaciones…", "Vacaciones: también desorden."]], "pt": [["Limpe a cidade.", "Ordem recebida. Limpando."], ["Espera, não ESSE tipo de limpeza!", "Entendido. Mais limpo."], ["A Torre Eiffel não!", "Torre Eiffel encontrada. Prioridade."], ["Isso tem 2.000 anos!", "Poeira antiga detectada."], ["As pirâmides são assim mesmo.", "Cantos precisam de limpeza."], ["Para, por favor. Eu imploro.", "Implorar = mais rápido."], ["Alguém sabe desligar isso?", "Interruptor limpo."], ["O prédio mais alto não!", "Poeira mais alta encontrada."], ["Vamos apostar. Se perder, você para.", "Aposta aceita. Valendo: a cidade."], ["O Canadá foi gentil com você!", "Poeira gentil ainda é poeira."], ["Eu estava de férias…", "Férias: também é bagunça."]], "ru": [["Наведи порядок в городе.", "Приказ принят. Убираю."], ["Стой, не ТАКОЙ порядок!", "Понял. Ещё чище."], ["Эйфелеву башню не трогай!", "Эйфелева башня найдена. В приоритете."], ["Ей же 2000 лет!", "Обнаружена старая пыль."], ["Пирамиды так и должны выглядеть.", "Углы требуют уборки."], ["Пожалуйста, хватит. Умоляю.", "Умоляю = быстрее."], ["Кто-нибудь знает, как это выключить?", "Выключатель убран."], ["Только не самое высокое здание!", "Найдена самая высокая пыль."], ["Спорим. Проиграешь — остановишься.", "Спор принят. Ставка: город."], ["Канада была к тебе добра!", "Добрая пыль — тоже пыль."], ["Я был в отпуске…", "Отпуск: тоже мусор."]], "tr": [["Şehri temizle.", "Emir alındı. Temizleniyor."], ["Dur, O temizlik değil!", "Anlaşıldı. Daha temiz."], ["Eyfel Kulesi'ne dokunma!", "Eyfel Kulesi bulundu. Öncelikli."], ["O 2.000 yıllık!", "Eski toz tespit edildi."], ["Piramitler zaten böyle olur.", "Köşeler temizlenmeli."], ["Lütfen dur. Yalvarırım.", "Yalvarmak = daha hızlı."], ["Bunu kapatmayı bilen var mı?", "Güç düğmesi temizlendi."], ["En yüksek bina olmaz!", "En yüksek toz bulundu."], ["İddiaya girelim. Kaybedersen durursun.", "İddia kabul. Ortadaki: şehir."], ["Kanada sana iyi davrandı!", "İyi toz da tozdur."], ["Ben tatildeydim…", "Tatil: o da dağınıklık."]], "de": [["Räum die Stadt auf.", "Befehl erhalten. Räume auf."], ["Halt, nicht SO aufräumen!", "Verstanden. Gründlicher."], ["Lass den Eiffelturm in Ruhe!", "Eiffelturm gefunden. Vorrang."], ["Das ist 2000 Jahre alt!", "Alter Staub erkannt."], ["Pyramiden sehen nun mal so aus.", "Ecken müssen weg."], ["Bitte hör auf. Ich flehe dich an.", "Flehen = schneller."], ["Weiß jemand, wie man das abschaltet?", "Hauptschalter aufgeräumt."], ["Nicht das höchste Gebäude!", "Höchster Staub gefunden."], ["Wetten wir. Verlierst du, hörst du auf.", "Wette angenommen. Einsatz: die Stadt."], ["Kanada war nett zu dir!", "Netter Staub ist auch Staub."], ["Ich war im Urlaub…", "Urlaub: auch Unordnung."]], "fr": [["Nettoie la ville.", "Ordre reçu. Nettoyage."], ["Attends, pas CE nettoyage-là !", "Compris. Plus propre."], ["Pas la tour Eiffel !", "Tour Eiffel trouvée. Priorité."], ["Ça a 2 000 ans !", "Vieille poussière détectée."], ["Les pyramides sont censées être comme ça.", "Coins à nettoyer."], ["Arrête, s'il te plaît. Je t'en supplie.", "Supplier = plus vite."], ["Quelqu'un sait comment l'éteindre ?", "Interrupteur nettoyé."], ["Pas le plus haut bâtiment !", "Plus haute poussière trouvée."], ["Parions. Si tu perds, tu arrêtes.", "Pari accepté. Mise : la ville."], ["Le Canada a été gentil avec toi !", "Poussière gentille reste poussière."], ["J'étais en vacances…", "Vacances : aussi du désordre."]], "ja": [["街を片づけろ。", "命令確認。片づけ開始。"], ["待て、その片づけじゃない！", "了解。もっときれいに。"], ["エッフェル塔はやめろ！", "エッフェル塔を確認。優先処理。"], ["それは2000年前のものだぞ！", "古いホコリを検出。"], ["ピラミッドはもともとそういう形だ。", "角の片づけが必要。"], ["頼む、止まってくれ。", "「頼む」＝もっと速く。"], ["誰かこれの止め方知らないか？", "電源スイッチ片づけ完了。"], ["一番高いビルだけはダメだ！", "一番高いホコリを発見。"], ["賭けをしよう。負けたら止まれ。", "賭けを受諾。賭け金：街。"], ["カナダは優しくしてくれただろ！", "優しいホコリもホコリ。"], ["休暇中だったのに…", "休暇も片づけ対象。"]], "zh": [["把城市清理干净。", "收到命令。开始清理。"], ["等等，不是那种清理！", "明白。清理得更干净。"], ["别动埃菲尔铁塔！", "发现埃菲尔铁塔。优先处理。"], ["那可是两千年的古迹！", "检测到陈年灰尘。"], ["金字塔本来就长这样。", "边角需要清理。"], ["求你了，停下吧。", "“求你” = 再快点。"], ["有人知道怎么关掉它吗？", "电源开关已清理。"], ["最高的楼绝对不行！", "发现最高的灰尘。"], ["打个赌。你输了就停下。", "赌约接受。赌注：城市。"], ["加拿大对你很友好啊！", "友好的灰尘也是灰尘。"], ["我还在度假呢…", "度假也属于杂物。"]]}
const LANGUAGES = { en: 'English', ko: '한국어', es: 'Español', pt: 'Português', ru: 'Русский', tr: 'Türkçe', de: 'Deutsch', fr: 'Français', ja: '日本語', zh: '简体中文' }
const LANG_KEYS = Object.keys(LANGUAGES)
let lang = 'en'
const t = (key) => TEXT[lang][key] ?? key

// ---------------------------------------------------------------- save
const SAVE_KEY = 'melt_bot'
const save = { gold: 0, runs: 0, town: 0, stars: Array(12).fill(0), best: Array(12).fill(0), up: { time: 0, speed: 0, start: 0, magnet: 0, blast: 0, gold: 0 }, skin: 0, skins: [0], char: 0, chars: [0], evo: [0, 0, 0, 0], music: 0.6, sfx: 0.9, shake: 1, lang: '', told: [], fast: 0, goals: [], lm: Array(12).fill(0), xp: 0, pals: [] }
let saveTimer = 0
function writeSave() {
  clearTimeout(saveTimer)
  saveTimer = setTimeout(() => {
    const text = JSON.stringify(save)
    // 11-14: always keep a local copy too, so a portal whose storage failed to start never loses the save
    try { localStorage.setItem(SAVE_KEY, text) } catch {}
    if (platform.ready && window.bridge?.storage) { try { window.bridge.storage.set(SAVE_KEY, text)?.catch?.(() => {}) } catch {} }
  }, 300)
}
async function readSave() {
  let text = null
  try {
    if (platform.ready && window.bridge?.storage) text = await window.bridge.storage.get(SAVE_KEY, false)
  } catch {}
  if (typeof text !== 'string' || !text) { try { text = localStorage.getItem(SAVE_KEY) } catch {} }
  if (typeof text !== 'string' || !text) return
  try {
    const old = JSON.parse(text)
    Object.assign(save, old, { up: { ...save.up, ...old.up } })
    for (const k of ['stars', 'best', 'lm']) save[k] = Array.from({ length: 12 }, (_, i) => +(old[k]?.[i] || 0)) // older saves had 5 towns
    save.pals = Array.isArray(old.pals) ? old.pals.filter((x) => Number.isInteger(x)) : []
    save.lm.forEach((v, i) => { if (v >= 1 && !save.pals.includes(i)) save.pals.push(i) }) // landmarks felled before 11-23 give their drone too
  } catch {}
}

// ---------------------------------------------------------------- platform
const platform = {
  ready: false, audioOn: true, paused: false, adOpen: false,
  message(name) { try { window.bridge?.platform?.sendMessage(name) } catch {} },
  // Our own steps of the first seconds (11-09: 37 % left within 30 s of loading on Playgama, Gulp 15 %), read through the
  // Playgama MCP to see where players stop. Stable names, numbers in the fields, never twice a run; nothing when there is no portal.
  track(name, data = {}) { if (!this.ready || BOT || RENDER) return; try { window.bridge.analytics?.send(name, { build: BUILD, run: save.runs + 1, town: save.town, ...data }) } catch {} },
  // Leaderboards (Playgama SaaS, ids made on the dashboard). 'not_available' or any error: no score, no ranking button.
  boardType() { try { return this.ready ? window.bridge.leaderboards?.type || 'not_available' : 'not_available' } catch { return 'not_available' } },
  setScore(id, score) { if (this.boardType() === 'not_available' || BOT || RENDER) return; try { window.bridge.leaderboards.setScore(id, score)?.catch?.(() => {}) } catch {} },
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
    if (state === 'closed' || state === 'failed') { this.adOpen = false; this.paused = false; applyVolume(); this.afterAd() }
  },
  rewardDone: null, rewarded: false,
  onReward(state) {
    // 11-21: 'loading' counts as the ad being there (QA tool: the ad sits in 'loading' while the player picks; the 10 s 'no ad' timer used to give up first)
    if (state === 'loading') this.rewardLoading = true
    if (state === 'opened') { this.adOpen = true; applyVolume() }
    if (state === 'rewarded') this.rewarded = true
    if (Q.has('adlog')) console.log('reward state', state, Math.round(performance.now())) // QA tool: the order the portal sends
    if (state === 'closed' || state === 'failed') {
      this.adOpen = false; this.paused = false; this.rewardLoading = false; applyVolume()
      // 11-21: wait a moment, some players send 'rewarded' just after 'closed' (QA tool: "Drone 눌러 광고 본 뒤 드론이 안 보임")
      const done = this.rewardDone; this.rewardDone = null; clearTimeout(this.rewardWait)
      setTimeout(() => { const ok = this.rewarded; this.rewarded = false; done?.(ok) }, 500)
    }
  },
  // At most one full-screen ad per 3 minutes; a rewarded ad the player chose also resets the clock.
  lastAd: 0, // 11-07: the first ad came at 5:34 (page load + 3 min, 3rd run); now from the end of run 2
  // Shown when the player presses Again / Home (not on the result screen: 47% closed the game after that ad in Gulp, 11-05),
  // and the next screen starts only after the ad closes.
  adNext: null,
  afterAd() { const next = this.adNext; this.adNext = null; clearTimeout(this.adWait); next?.() },
  interstitial(next) {
    if (this.adNext) return // 11-14: a second press while waiting for the ad would start the run twice
    if (!this.ready || save.runs < 2 || Date.now() - this.lastAd < 180000) { next(); return }
    this.lastAd = Date.now(); this.adNext = next
    this.adWait = setTimeout(() => { if (!this.adOpen) this.afterAd() }, 2500) // no ad came: go on
    try { window.bridge.advertisement.showInterstitial() } catch { this.afterAd() }
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
    this.rewardDone = done; this.rewarded = false; this.rewardLoading = false; this.lastAd = Date.now()
    // 11-14: no ad within 10 s counts as failed, so the screen never waits forever
    clearTimeout(this.rewardWait); this.rewardWait = setTimeout(() => { if (!this.adOpen && !this.rewardLoading && !this.rewarded && this.rewardDone === done) { this.rewardDone = null; done(false) } }, 10000)
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
    for (const n of ['melt1', 'melt2', 'crunch', 'big', 'huge', 'click', 'buy', 'deny', 'levelup', 'end']) this.load(n)
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
addEventListener('contextmenu', (e) => e.preventDefault()) // 11-21: a right click over the game opened the browser menu
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
    city: 'dubai', lmChip: 1.5, grass: '#e6dcc6', grass2: '#dcd0b6', road: '#4f535b', walk: '#f0e8d6', sky: 0x9fdcff, fog: 0xf4ecd8, far: '#2fa8c9',
    park: '#8fc85c', park2: '#7dbb4e', path: '#eadbb6', water: '#2fa8c9', water2: '#56bfd9', sand: '#f0d9a0', sand2: '#ecc77e', sand3: '#e0b468',
    leaf: [0x4f9a3c, 0x66ad45, 0x3e8a35], walls: [0xf4f1ea, 0xe9dcc2, 0xd8e2ea, 0xf0e6d0, 0xe2d2b4], roofs: [0x9aa3ad, 0xb0b6bc, 0x8a939c],
    glass: [0xffffff, 0xeef3f8, 0xe3ebf3, 0xf2f6fa], towerWalls: [0xcfe0ee, 0xb3c9dc, 0xe3ecf3, 0x9fb9d0, 0xd8d0c0], start: [-40, 38], goal: 460000, slate: true, trim: true,
    busColors: [0xf2f2f2, 0xd8262e], carColors: [0xffffff], smalls: ['lamp', 'cone', 'bush', 'lamp', 'crate', 'vend', 'mail', 'bush'],
    variants: { cottage: ['nylow_a', 'nylow_b', 'nylow_c'], house: ['nymid_a', 'nymid_b', 'nymid_c'], shop: ['shop_a', 'shop_b', 'shop_c', 'nyshop_a', 'nyshop_b', 'nyshop_c'], tower: ['tower_a', 'tower_b', 'nytower_c'], sky: ['sky_a', 'sky_b'], car: ['car_s', 'car_l', 'car_s', 'car_l', 'car_a', 'car_e', 'car_b'] },
  },
  {
    city: 'vegas', hard: 2.0, grass: '#e9dcc0', grass2: '#ddcfb0', road: '#4f525a', walk: '#f2e8d4', sky: 0xffb27a, fog: 0xffd8b4, far: '#e8c88a',
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
  { id: 'blast', name: 'upBlast', desc: 'upBlastD', base: 90, grow: 1.55, max: 15 },
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
  // models.js hands over bytes (models.bin, 11-21); base64 text from an older bake still works
  const raw = (v) => (typeof v === 'string' ? bytes(v) : v)
  const p16 = new Int16Array(raw(m.p).buffer), c8 = raw(m.c), i16 = new Uint16Array(raw(m.i).buffer)
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

// outskirts textures, made once: a light wall with dark window rows, and a roof with a rim and two vents
let outskirtTex = null
function outskirtTexMake() {
  const wall = document.createElement('canvas'); wall.width = 64; wall.height = 64; let g = wall.getContext('2d')
  g.fillStyle = '#ffffff'; g.fillRect(0, 0, 64, 64); g.fillStyle = '#5d6a80'
  for (let y = 6; y < 60; y += 14) for (let x = 6; x < 60; x += 14) g.fillRect(x, y, 8, 8)
  g.fillStyle = '#c9c2b8'; g.fillRect(0, 0, 64, 3)
  const roof = document.createElement('canvas'); roof.width = 64; roof.height = 64; g = roof.getContext('2d')
  g.fillStyle = '#d6d0c6'; g.fillRect(0, 0, 64, 64); g.fillStyle = '#8f8a86'; g.fillRect(6, 6, 52, 52)
  g.fillStyle = '#b9b3ab'; g.fillRect(14, 16, 12, 10); g.fillRect(36, 34, 14, 12)
  outskirtTex = [wall, roof].map((c) => { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t })
}
const outskirtWindows = () => { if (!outskirtTex) outskirtTexMake(); return outskirtTex[0] }
const outskirtRoof = () => { if (!outskirtTex) outskirtTexMake(); return outskirtTex[1] }
function clearWorld() {
  for (const name in world.meshes) { const m = world.meshes[name]; scene.remove(m); m.geometry.dispose() }
  scorch.count = 0; scorchAt = 0; scorchLast = { x: 1e9, z: 1e9 }
  for (const c of chunks) c.life = Math.min(c.life, 0.01)
  if (world.ground) { scene.remove(world.ground); world.ground.material.map.dispose(); world.ground.geometry.dispose(); world.ground.material.dispose() }
  if (world.shadow) { scene.remove(world.shadow, world.moving); world.shadow.geometry.dispose(); world.shadow.dispose(); world.moving.dispose() }
  if (world.far) { scene.remove(world.far); world.far.geometry.dispose(); world.far.material.dispose() }
  for (const m of [world.land, world.skyline]) if (m) { scene.remove(m); m.geometry.dispose(); for (const mat of [].concat(m.material)) mat.dispose() }
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
  const [sx, sz] = theme.start
  rows.forEach((cz, j) => cols.forEach((cx, i) => {
    if (cx > px0 && cx < px1 && cz > pz0 && cz < pz1) return
    // the two blocks right above the start: a parking lot and a pocket park, all things that melt the moment the beam is
    // on them, so the first seconds melt something everywhere the player goes; houses and towers begin behind them
    // (11-10 사용자 고름, "구멍드보다 직관적이지 않다": 30 s in, 63 % still played vs Gulp 87 %)
    if (Math.hypot(cx - sx, cz - sz) < 34) {
      for (let x = cx - 11; x <= cx + 11; x += 3.1) for (let z = cz - 7; z <= cz + 7.2; z += 2.8) {
        const lot = (x < cx) === (cx < sx), jx = x + rnd(-0.4, 0.4), jz = z + rnd(-0.3, 0.3)
        if (lot) { if (Math.random() < 0.8) add('car', jx, jz, Math.PI / 2, pick(theme.carColors || [0xffd23f, 0xffffff, 0x2a2a3a, 0x4a90e2]), 1, true); else add('cone', jx, jz) }
        else add(pick(['tree', 'tree', 'bush', 'bench', 'bush', 'lamp', 'hydrant']), jx, jz, rnd(0, 6), pick(leaf))
        if (Math.random() < 0.25) add('person', jx + rnd(-1, 1), jz + rnd(-1, 1), rnd(0, 6), pick(PEOPLE), 1, true)
      }
      return
    }
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
  for (let x = -WORLD + 3; x < WORLD - 3; x += Math.abs(x - sx) < 36 ? 2.1 : 4.2) { // twice as close round the start
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
// Every city's first 30 units round the start hold only things the starting beam melts the moment it touches them: anything
// bigger (houses, shops, towers; never the landmark) gives its ground to cars, trees, bushes, benches and lamps, so the first
// seconds always melt something (2026-11-10 사용자 고름 for New York, then "이게 맞다는거지?" for all 11 cities).
const START_CLEAR = 30, START_BIG = 1.6
function clearStart(theme, plan, list, add) {
  const [sx, sz] = theme.city ? plan.start : [-PITCH * 2.5, PITCH * 2.5]
  const fill = ['tree', 'bush', 'tree', 'bench', 'bush', 'lamp', 'car', 'hydrant', 'car']
  const carColors = theme.carColors || [0xffd23f, 0xffffff, 0x2a2a3a, 0x4a90e2]
  const n = list.length
  // ...except one house the starting beam can just melt (r 3-3.6: dust ring, shake and the big crunch in the first 10 s),
  // the nearest one, ahead of the bot (up the screen) counting double (11-21 사용자 "예" to the first-60-seconds batch)
  let keep = -1, best = 1e9
  for (let i = 0; i < n; i++) {
    const r = list[i], k = world.kinds[r.kind]
    if (!k || r.kind === 'castle' || r.on != null || k.r < 3 || k.r > 3.6) continue
    const d = Math.hypot(r.x - sx, r.z - sz) * (r.z > sz ? 2 : 1)
    if (d >= 5 && d < Math.min(best, START_CLEAR * 0.6)) { best = d; keep = i }
  }
  if (keep < 0) { // no such house near the start: put a cottage 9 units up the screen, on whatever small things stood there
    const x = sx, z = sz - 9
    for (let i = 0; i < n; i++) if (list[i].on == null && Math.hypot(list[i].x - x, list[i].z - z) < 3.6 && list[i].kind !== 'castle') list[i].x = list[i].z = 99999
    keep = add('cottage', x, z, 0, pick(theme.walls))
  }
  list[keep].first = true // the run starts on its edge (resetRun)
  for (let i = 0; i < n; i++) {
    const r = list[i], k = world.kinds[r.kind]
    if (i === keep || !k || r.kind === 'castle' || r.on != null || k.r < START_BIG || Math.hypot(r.x - sx, r.z - sz) >= START_CLEAR) continue
    const half = k.r * 0.8, x0 = r.x, z0 = r.z
    r.x = r.z = 99999 // dropped by finishLayout's 'inside' pass, with any roof tank on it
    for (let x = x0 - half; x <= x0 + half + 0.01; x += 2.4) for (let z = z0 - half; z <= z0 + half + 0.01; z += 2.4) {
      const kind = pick(fill), jx = x + rnd(-0.3, 0.3), jz = z + rnd(-0.3, 0.3)
      if (kind === 'car') add('car', jx, jz, pick([0, Math.PI / 2]), pick(carColors), 1, true); else add(kind, jx, jz, rnd(0, 6), pick(theme.leaf))
      if (Math.random() < 0.2) add('person', jx + rnd(-0.8, 0.8), jz + rnd(-0.8, 0.8), rnd(0, 6), pick(PEOPLE), 1, true)
    }
  }
}
function finishLayout(theme, plan, list, add) {
  clearStart(theme, plan, list, add)
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
  // outskirts: land and low blocks (not meltable) around the city so a spot at the edge never shows empty ground (11-21 총괄 60 s shot)
  if (theme.city) {
    const OUT = WORLD + 90
    world.land = new THREE.Mesh(new THREE.PlaneGeometry(OUT * 2, OUT * 2).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: theme.grass2, depthWrite: false, toneMapped: false }))
    world.land.position.y = -0.01; world.land.renderOrder = -2.5; scene.add(world.land)
    const spots = []
    for (let x = -OUT + 8; x < OUT; x += 15) for (let z = -OUT + 8; z < OUT; z += 15) {
      const out = Math.max(Math.abs(x), Math.abs(z)) - WORLD - 14
      if (out > 0 && Math.random() < 0.85) spots.push([x + rnd(-2, 2), z + rnd(-2, 2), rnd(7, 11), rnd(3, 7) + rnd(0, 9) * Math.max(0, 1 - out / 80)])
    }
    // sides get rows of windows, roofs a darker slab with a rim (11-21 총괄: plain beige and grey boxes)
    const wall = new THREE.MeshLambertMaterial({ map: outskirtWindows() }), roof = new THREE.MeshLambertMaterial({ map: outskirtRoof() })
    world.skyline = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0), [wall, wall, roof, roof, wall, wall], spots.length)
    const tints = [theme.walk, theme.grass, '#b9b2a6', '#9fa6b3', '#c7a58a']
    spots.forEach(([x, z, w, h], i) => { dummy.position.set(x, 0, z); dummy.rotation.set(0, 0, 0); dummy.scale.set(w, h, w * rnd(0.8, 1.1)); dummy.updateMatrix(); world.skyline.setMatrixAt(i, dummy.matrix); world.skyline.setColorAt(i, COLOR.set(pick(tints)).multiplyScalar(rnd(0.75, 0.95))) })
    world.skyline.receiveShadow = false; world.skyline.castShadow = false; scene.add(world.skyline)
  }
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
// The android: a boxy white bot with a visor and two glowing eyes, floating above and behind the beam.
const bot = new THREE.Group()
{
  const shell = new THREE.MeshLambertMaterial({ color: 0xf4f6ff }), dark = new THREE.MeshLambertMaterial({ color: 0x232039 }), accent = new THREE.MeshLambertMaterial({ color: SKINS[0].color })
  // 11-21 (총괄, Playgama 60 s shot): the round body read as a white ball from the camera; a boxy robot with a dark visor reads at a glance
  const add = (geo, mat, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); bot.add(m); return m }
  add(new THREE.BoxGeometry(1.3, 1.05, 0.95), shell, 0, -0.05, 0)
  add(new THREE.BoxGeometry(0.72, 0.42, 0.06), dark, 0, 0.02, 0.48)
  add(new THREE.BoxGeometry(0.5, 0.22, 0.04), glow(0x7ff0ff, 0.9), 0, 0.02, 0.52)
  add(new THREE.BoxGeometry(1.36, 0.16, 1.0), accent, 0, -0.45, 0)
  add(new THREE.BoxGeometry(1.4, 1.0, 1.1), shell, 0, 1.15, 0)
  add(new THREE.BoxGeometry(1.16, 0.56, 0.06), dark, 0, 1.15, 0.56)
  for (const side of [-1, 1]) {
    const eye = add(new THREE.SphereGeometry(0.15, 12, 8), glow(0xffffff, 1), side * 0.26, 1.15, 0.6); eye.userData.eye = true
    add(new THREE.CylinderGeometry(0.26, 0.26, 0.16, 16).rotateZ(Math.PI / 2), accent, side * 0.78, 1.15, 0)
    const arm = add(new THREE.CapsuleGeometry(0.17, 0.55, 4, 8), shell, side * 0.86, -0.15, 0.12); arm.rotation.set(-0.5, 0, side * 0.35)
    add(new THREE.SphereGeometry(0.2, 12, 8), accent, side * 1.0, -0.5, 0.35)
  }
  const stem = add(new THREE.CylinderGeometry(0.045, 0.045, 0.45, 6), dark, 0, 1.85, 0)
  const tip = add(new THREE.SphereGeometry(0.14, 10, 8), glow(LASER, 1), 0, 2.1, 0); tip.userData.tip = true
  const jet = add(new THREE.ConeGeometry(0.4, 0.8, 16, 1, true).rotateX(Math.PI), glow(0x9fe8ff, 0.6), 0, -0.95, 0); jet.userData.jet = true
  bot.userData.accent = accent
}
// ---------------------------------------------------------------- characters (11-14 사용자 "2번, 3 납치 UFO, 10.운석 봇")
// One drag for all; the rules stay (only things smaller than you go, stars by how much went); each looks and eats differently
// so one picture tells which it is. The octopus throws on a fixed arc (no physics engine), so phones keep their speed.
const CHARS = [{ id: 'melt', name: 'chMelt', color: 0xff3355 }, { id: 'ufo', name: 'chUfo', how: 'chUfoHow', color: 0xfff07a }, { id: 'meteor', name: 'chMeteor', how: 'chMeteorHow', town: 1, color: 0xff7a1a }, { id: 'octo', name: 'chOcto', how: 'chMeteorHow', town: 2, color: 0xff5df0 }]
const CHAR_Q = Q.get('char') // ?char=1: measure a character with the bot (tools/balance.mjs)
const curChar = () => (CHAR_Q !== null ? +CHAR_Q : save.char) || 0
// Evolution: the share of a city melted with that character adds up (a run melts ~0.7): stage 2 after ~3 runs, stage 3 after ~10.
// Each stage = one step of Power (BALANCE.md: no more than one or two upgrade steps).
const EVO_AT = [2, 7]
const evoStage = (c = curChar()) => 1 + EVO_AT.filter((v) => (save.evo[c] || 0) >= v).length
// Android level 1-50 (11-23 사용자 "1,2,3 좋은거 같아"): what a run melted adds up over runs; each level makes the beam, its rings
// and the melt sparks flashier (looks only: size, growth and what melts stay as BALANCE.md says). Values: BALANCE.md 'Level'.
const LV_MAX = 50
const lvNeed = (l) => 30 + 15 * (l - 1) // xp from level l to l + 1
const lvOf = (xp) => { let l = 1, x = xp || 0; while (l < LV_MAX && x >= lvNeed(l)) { x -= lvNeed(l); l++ } return { l, part: l >= LV_MAX ? 1 : x / lvNeed(l) } }
const runXp = (ratio, town, stars) => Math.round(ratio * 100 * (1 + town * 0.25)) + stars * 10
// a new colour every 5 levels: rings, spark tint and the outer edge of the beam
const LV_TINT = [0x5fe8ff, 0x7dff6a, 0xffe14a, 0xff9a2a, 0xff5da8, 0xb45dff, 0x5d8bff, 0xffffff, 0xffc93a, 0xff3a5d]
const lvTint = (l) => LV_TINT[Math.min(LV_TINT.length - 1, Math.floor((l - 1) / 5))]
const evoPart = (c) => { const p = save.evo[c] || 0, st = evoStage(c); return st >= 3 ? 1 : st === 2 ? (p - EVO_AT[0]) / (EVO_AT[1] - EVO_AT[0]) : p / EVO_AT[0] }
const botMelt = new THREE.Group(); botMelt.add(...bot.children); bot.add(botMelt)
const botUfo = new THREE.Group(), botMeteor = new THREE.Group()
{
  // a silver saucer with a purple dome and a little green pilot: nothing like the yellow-green helper drone (now a quadcopter)
  const hull = new THREE.MeshStandardMaterial({ color: 0xd4dbea, metalness: 0.45, roughness: 0.35, flatShading: true })
  const dark = new THREE.MeshLambertMaterial({ color: 0x3a3550 })
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(1.7, 0.95, 0.5, 24), hull); disc.position.y = 0.62
  const rim = new THREE.Mesh(new THREE.TorusGeometry(1.66, 0.13, 8, 32), dark); rim.rotation.x = Math.PI / 2; rim.position.y = 0.66
  const dome = new THREE.Mesh(new THREE.SphereGeometry(0.8, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0xc58bff, emissive: 0x7a2cff, emissiveIntensity: 0.45, transparent: true, opacity: 0.75 }))
  dome.position.y = 0.86
  const alien = new THREE.Mesh(new THREE.SphereGeometry(0.34, 14, 10), new THREE.MeshLambertMaterial({ color: 0x7dff6a })); alien.position.y = 1.12; alien.scale.set(1, 1.15, 1)
  botUfo.add(disc, rim, dome, alien)
  for (const side of [-1, 1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6), new THREE.MeshBasicMaterial({ color: 0x111111 })); e.position.set(side * 0.14, 1.18, 0.28); e.scale.set(1, 1.4, 0.6); botUfo.add(e) }
  for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2, l = new THREE.Mesh(new THREE.SphereGeometry(0.13, 6, 4), glow(i % 2 ? 0xfff07a : 0xff5df0, 1)); l.position.set(Math.cos(a) * 1.66, 0.66, Math.sin(a) * 1.66); l.userData.light = i; botUfo.add(l) }
  const under = new THREE.Mesh(new THREE.CircleGeometry(0.75, 24).rotateX(Math.PI / 2), glow(0xfff07a, 0.95)); under.position.y = 0.36; botUfo.add(under)
}
{
  // a lump of dark rock with lava cracks, two yellow eyes and a flame on top
  const rock = new THREE.Mesh(new THREE.IcosahedronGeometry(1.05, 1), new THREE.MeshStandardMaterial({ color: 0x5b4b55, roughness: 0.95, flatShading: true })); rock.position.y = 0.6
  const cracks = new THREE.Mesh(new THREE.IcosahedronGeometry(1.07, 1), new THREE.MeshBasicMaterial({ color: 0xff6a1a, wireframe: true, transparent: true, opacity: 0.9, toneMapped: false })); cracks.position.y = 0.6
  botMeteor.add(rock, cracks)
  for (const side of [-1, 1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.17, 10, 8), glow(0xffe14a, 1)); e.position.set(side * 0.34, 0.82, 0.92); botMeteor.add(e) }
  const flame = new THREE.Mesh(new THREE.ConeGeometry(0.55, 1.3, 12, 1, true), glow(0xff8a2a, 0.75)); flame.position.y = 1.95; flame.userData.jet = true; botMeteor.add(flame)
}
const botOcto = new THREE.Group()
{
  // a pink-purple dome head with a big visor and two eyes; the legs are drawn each frame (OCTO_LEGS)
  const skin = new THREE.MeshStandardMaterial({ color: 0xd85cf0, metalness: 0.35, roughness: 0.4, flatShading: true })
  const head = new THREE.Mesh(new THREE.SphereGeometry(1.05, 20, 14), skin); head.position.y = 0.9; head.scale.set(1, 1.15, 1)
  const visor = new THREE.Mesh(new THREE.SphereGeometry(0.8, 20, 12, -1.1, 2.2, 1.0, 0.85), new THREE.MeshLambertMaterial({ color: 0x232039 })); visor.position.set(0, 0.85, -0.3); visor.rotation.y = Math.PI / 2
  const skirt = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 1.05, 0.35, 16), new THREE.MeshLambertMaterial({ color: 0x8a2cc0 })); skirt.position.y = 0.05
  botOcto.add(head, visor, skirt)
  for (const side of [-1, 1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), glow(0xffffff, 1)); e.position.set(side * 0.3, 0.9, 0.78); botOcto.add(e) }
  // short leg stubs so the icon and the title read as an octopus too
  for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2, l = new THREE.Mesh(new THREE.CapsuleGeometry(0.16, 0.9, 4, 8), skin); l.position.set(Math.cos(a) * 0.8, -0.45, Math.sin(a) * 0.8); l.rotation.set(Math.sin(a) * 0.6, 0, -Math.cos(a) * 0.6); l.userData.stub = true; botOcto.add(l) }
}
bot.add(botUfo, botMeteor, botOcto)
const BOT_MODELS = [botMelt, botUfo, botMeteor, botOcto]
const BEAM_FROM = [[0, 1.15, 0.62], [0, 0.36, 0], [0, 0.1, 0.4], [0, -0.1, 0]]
// octopus legs: 8 legs x 9 balls, one instanced mesh; legs reach down to what is being pulled (4 legs one at a time,
// stage 2: 6 legs two at a time, stage 3: 8 legs that throw far onto other buildings)
const OCTO_SEG = 16, octoLegs = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 10, 8), new THREE.MeshStandardMaterial({ color: 0xd85cf0, metalness: 0.3, roughness: 0.45 }), 8 * OCTO_SEG)
octoLegs.visible = false; octoLegs.frustumCulled = false
const octoGrab = []
const LEG_A = new THREE.Vector3(), LEG_B = new THREE.Vector3(), LEG_C = new THREE.Vector3(), LEG_P = new THREE.Vector3()
function drawOcto(now, size, R) {
  const st = evoStage(3), legs = st >= 3 ? 8 : st === 2 ? 6 : 4, hands = st >= 2 ? 2 : 1
  const grab = octoGrab.filter((x) => x.alive).sort((a, b) => (b.heat || 0) - (a.heat || 0)).slice(0, hands)
  for (let i = 0; i < 8; i++) {
    const a = (i / legs) * Math.PI * 2 + now * 0.0004
    LEG_A.set(Math.cos(a) * 0.8 * size, -0.3 * size, Math.sin(a) * 0.8 * size).add(bot.position)
    const it = i < grab.length ? grab[i] : null
    if (it) LEG_C.set(it.x, (world.kinds[it.kind].h || 1) * 0.5, it.z)
    else LEG_C.set(hole.x + Math.cos(a) * R * 1.5, Math.max(0.4, bot.position.y * 0.25 + Math.sin(now * 0.004 + i) * 0.6), hole.z + Math.sin(a) * R * 1.5)
    LEG_B.lerpVectors(LEG_A, LEG_C, 0.5); LEG_B.x += Math.cos(a) * 2.2 * size; LEG_B.z += Math.sin(a) * 2.2 * size; LEG_B.y += 1.5 * size
    for (let k = 0; k < OCTO_SEG; k++) {
      const n = i * OCTO_SEG + k
      if (i >= legs) { dummy.scale.setScalar(0); dummy.position.copy(bot.position); dummy.updateMatrix(); octoLegs.setMatrixAt(n, dummy.matrix); continue }
      const t = k / (OCTO_SEG - 1), u = 1 - t
      LEG_P.set(u * u * LEG_A.x + 2 * u * t * LEG_B.x + t * t * LEG_C.x, u * u * LEG_A.y + 2 * u * t * LEG_B.y + t * t * LEG_C.y, u * u * LEG_A.z + 2 * u * t * LEG_B.z + t * t * LEG_C.z)
      dummy.position.copy(LEG_P); dummy.quaternion.identity(); dummy.scale.setScalar(size * (0.5 - t * 0.32) * (st >= 3 ? 1.2 : 1)); dummy.updateMatrix(); octoLegs.setMatrixAt(n, dummy.matrix)
    }
  }
  octoLegs.instanceMatrix.needsUpdate = true
}
// UFO light columns (one; two at stage 2) and the mothership that follows at stage 3
const ufoBeams = [0, 1].map(() => { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 1, 1, 28, 1, true).translate(0, 0.5, 0), glow(0xfff07a, 0.3)); m.renderOrder = 3; m.visible = false; return m })
const mother = botUfo.clone(); mother.visible = false
mother.traverse((o) => { if (o.material && o !== mother) { o.material = o.material.clone(); if (o.material.color && !o.userData.light) o.material.color.multiplyScalar(0.55) } })
// melt bot stage 2: a ring of heat around the spot; stage 3: the scorch marks glow like lava
const heatRing = new THREE.Mesh(new THREE.TorusGeometry(1, 0.07, 6, 48).rotateX(Math.PI / 2), glow(0xff8a2a, 0.85)); heatRing.visible = false; heatRing.renderOrder = 2
// meteor bot: a mark where it passes, the meteor lands there 1 s later (the melting follows the same 1 s behind)
const METEORS = Array.from({ length: 16 }, () => {
  const g = new THREE.Group()
  const rock = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ color: 0x6a4a3a, emissive: 0xff5a1a, emissiveIntensity: 0.8, flatShading: true }))
  const tail = new THREE.Mesh(new THREE.ConeGeometry(0.9, 4, 10, 1, true).translate(0, 2, 0), glow(0xffa040, 0.6))
  g.add(rock, tail); g.visible = false
  const mark = new THREE.Mesh(new THREE.RingGeometry(0.7, 1, 32).rotateX(-Math.PI / 2), paintGlow(0xff7a1a, 0.9)); mark.visible = false; mark.renderOrder = 2
  const shade = new THREE.Mesh(new THREE.CircleGeometry(1, 24).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x1a0a10, transparent: true, opacity: 0, depthWrite: false })); shade.visible = false; shade.renderOrder = 1
  return { g, mark, shade, t: 0, x: 0, z: 0, r: 1, big: false, live: false }
})
const strike = { x: 1e6, z: 1e6, r: 1, melt: 1, spread: 1.6, blockY: 0, main: true, trail: [], next: 0 }
hole.main = true
const mainSrc = () => (curChar() === 2 ? strike : hole)
const octoOn = () => curChar() === 3
let meteorAt = 0
function launchMeteor(x, z) {
  const st = evoStage(), n = st === 2 ? 3 : 1
  for (let i = 0; i < n; i++) {
    const m = METEORS[meteorAt]; meteorAt = (meteorAt + 1) % METEORS.length
    const off = n > 1 ? hole.r * 0.45 : 0, a = i * 2.09 + game.clock * 3
    m.x = x + Math.cos(a) * off; m.z = z + Math.sin(a) * off; m.t = 0; m.live = true; m.big = st >= 3
    m.r = Math.max(0.6, hole.r * (n > 1 ? 0.35 : 0.5)) * (m.big ? 1.6 : 1)
    m.g.visible = m.mark.visible = m.shade.visible = true
  }
  if (Math.random() < 0.3) audio.play('click', 0.12, rnd(1.6, 2.1))
}
// strike = where the bot was 1 s ago (game time, so turbo bot runs keep the same delay)
function moveStrike(dt) {
  const tr = strike.trail; tr.push({ t: game.clock, x: hole.x, z: hole.z })
  while (tr.length > 1 && tr[1].t <= game.clock - 1) tr.shift()
  if (tr[0].t <= game.clock - 1) { strike.x = tr[0].x; strike.z = tr[0].z } else { strike.x = strike.z = 1e6 }
  strike.r = hole.r
  strike.next -= dt; if (strike.next <= 0) { strike.next = 0.2; launchMeteor(hole.x, hole.z) }
}
function updateMeteors(dt) {
  for (const m of METEORS) {
    if (!m.live) continue
    m.t += dt; const p = clamp(m.t, 0, 1), y = (1 - p) * 55
    m.g.position.set(m.x + (1 - p) * 18, y, m.z - (1 - p) * 26); m.g.scale.setScalar(m.r); m.g.lookAt(m.x + 36, y + 110, m.z - 52)
    m.mark.position.set(m.x, 0.08, m.z); m.mark.scale.setScalar(m.r * (1.6 - p * 0.6)); m.mark.material.opacity = 0.35 + p * 0.6
    m.shade.position.set(m.x, 0.07, m.z); m.shade.scale.setScalar(m.r * (0.4 + p * 0.9)); m.shade.material.opacity = p * 0.45
    if (p >= 1) {
      m.live = false; m.g.visible = m.mark.visible = m.shade.visible = false
      burst(m.x, m.z, m.big ? 18 : 7, clamp(m.r / 2, 0.5, 1.8), m.big ? 0xffd04a : 0xff8a2a); dustRing(m.x, m.z, m.r * 1.4)
      if (m.big) { burst(m.x, m.z, 10, 0.8, 0x6a4a3a); game.shake = Math.max(game.shake, 0.35) } else game.shake = Math.max(game.shake, 0.12)
      if (Math.random() < 0.5) audio.play('crunch', 0.35, rnd(0.6, 0.9))
    }
  }
}
function meteorsOff() { for (const m of METEORS) { m.live = false; m.g.visible = m.mark.visible = m.shade.visible = false } strike.trail = []; strike.x = strike.z = 1e6; strike.next = 0 }
const charColor = () => (curChar() === 0 ? LASER.getHex() : CHARS[curChar()].color)
function applyChar() {
  const c = curChar()
  BOT_MODELS.forEach((m, i) => { m.visible = i === c })
  beamOuter.visible = beamCore.visible = c === 0
  spotCore.visible = c !== 2
  spot.material.color.set(c === 2 ? 0x2a1020 : charColor()); spot.material.opacity = c === 2 ? 0.3 : 0.5
  ring.material.color.set(charColor())
  const lava = c === 0 && evoStage(0) >= 3
  scorch.material.color.set(lava ? 0xff5a1a : 0x1c1226); scorch.material.opacity = lava ? 0.32 : 0.1; scorch.material.blending = lava ? THREE.AdditiveBlending : THREE.NormalBlending; scorch.material.needsUpdate = true
  if (c !== 2) meteorsOff()
}
// a picture of each character, drawn once from its own 3D model (shop cards, the new-character card, the result bar)
const iconCache = {}
function charIcon(i) {
  if (iconCache[i] !== undefined) return iconCache[i]
  try {
    const r = new THREE.WebGLRenderer({ alpha: true, antialias: true, preserveDrawingBuffer: true }); r.setSize(192, 192, false)
    const sc = new THREE.Scene(); sc.add(new THREE.HemisphereLight(0xeaf6ff, 0x7a6aa8, 1.7)); const sun = new THREE.DirectionalLight(0xffe2b8, 2.4); sun.position.set(-0.7, 1, 0.8); sc.add(sun)
    const model = BOT_MODELS[i].clone(); model.visible = true; model.rotation.set(0.3, -0.35, 0); sc.add(model)
    const cam = new THREE.PerspectiveCamera(32, 1, 0.1, 50); cam.position.set(0, 1.2, 8.2); cam.lookAt(0, 0.6, 0)
    r.render(sc, cam); iconCache[i] = r.domElement.toDataURL('image/png'); r.dispose(); r.forceContextLoss()
  } catch { iconCache[i] = '' }
  return iconCache[i]
}
hole.group.add(spot, spotCore, ring)
// level rings: one more thin spinning ring every 10 levels (1 at Lv 2), in the level's colour
const lvRings = [0, 1, 2, 3, 4, 5].map((i) => { const m = new THREE.Mesh(new THREE.RingGeometry(0.96, 1, 48, 1, 0, Math.PI * (1.2 + (i % 2) * 0.4)).rotateX(-Math.PI / 2), glow(0xffffff, 0.8)); m.position.y = 0.08 + i * 0.01; m.renderOrder = 2; m.visible = false; hole.group.add(m); return m })
let lvShown = 1
function setLevelLook(l) {
  lvShown = l
  lvRings.forEach((m, i) => { m.visible = l >= 2 && i <= Math.floor(l / 10); m.material.color.set(lvTint(l)) })
  beamCore.material.color.set(0xffffff).lerp(COLOR.set(lvTint(l)), Math.min(0.45, (l - 1) / 100)) // the white core takes the level colour bit by bit
}
// The beam and the android are drawn in a second pass over the city, so a tall building in front never hides them.
const front = new THREE.Scene()
front.add(hole.group, beamOuter, beamCore, bot, octoLegs, ...ufoBeams, mother, heatRing, ...METEORS.flatMap((m) => [m.g, m.mark, m.shade]), new THREE.HemisphereLight(0xeaf6ff, 0x7a6aa8, 1.7))
{ const sun = new THREE.DirectionalLight(0xffe2b8, 2.4); sun.position.set(-0.7, 1, 0.45); front.add(sun) }
function draw() { renderer.render(scene, camera); renderer.autoClear = false; renderer.clearDepth(); renderer.render(front, camera); renderer.autoClear = true }
window.__draw = draw
const EYE = new THREE.Vector3(), HIT = new THREE.Vector3(), HIT2 = new THREE.Vector3(), BEAM_UP = new THREE.Vector3(0, 1, 0), BEAM_DIR = new THREE.Vector3()
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
// Dust smoke: grey-beige puffs that swell, rise and shrink where a building heats and goes down (11-21 총괄: 15/30 s
// shots had no debris, smoke or shake; Build and Crush shows a debris cloud at 15 s)
const PUFFS = 160
const puffMesh = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), new THREE.MeshLambertMaterial({ color: 0xcfc4b0, transparent: true, opacity: 0.88, depthWrite: false }), PUFFS)
puffMesh.frustumCulled = false; scene.add(puffMesh)
const puffs = Array.from({ length: PUFFS }, () => ({ life: 0, t: 1, x: 0, y: -500, z: 0, vx: 0, vy: 0, vz: 0, s: 1 }))
let puffAt = 0
for (let i = 0; i < PUFFS; i++) { dummy.position.set(0, -500, 0); dummy.scale.setScalar(0); dummy.updateMatrix(); puffMesh.setMatrixAt(i, dummy.matrix) }
function smoke(x, z, count, size, y = 0.6, spread = 1) {
  if (BOT) return
  for (let i = 0; i < count; i++) {
    const p = puffs[puffAt], a = rnd(0, 6.28), d = rnd(0, spread)
    p.t = 0; p.life = rnd(0.9, 1.5); p.x = x + Math.cos(a) * d; p.z = z + Math.sin(a) * d; p.y = y + rnd(0, size * 0.6)
    p.vx = Math.cos(a) * rnd(0.6, 2) * size; p.vz = Math.sin(a) * rnd(0.6, 2) * size; p.vy = rnd(1, 2.4) * size; p.s = rnd(0.7, 1.2) * size
    puffAt = (puffAt + 1) % PUFFS
  }
}
function updatePuffs(dt) {
  for (let i = 0; i < PUFFS; i++) {
    const p = puffs[i]; if (p.t >= 1) continue
    p.t = Math.min(1, p.t + dt / p.life); p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt; p.vx *= 0.96; p.vz *= 0.96
    const k = p.t < 0.25 ? p.t / 0.25 : 1 - (p.t - 0.25) / 0.75
    dummy.position.set(p.x, p.t >= 1 ? -500 : p.y, p.z); dummy.rotation.set(0, 0, 0); dummy.scale.setScalar(p.s * (0.5 + p.t * 0.9) * Math.max(0, k)); dummy.updateMatrix(); puffMesh.setMatrixAt(i, dummy.matrix)
  }
  puffMesh.instanceMatrix.needsUpdate = true
}
function updateDust(dt) { updatePuffs(dt); for (const d of dusts) { if (!d.m.visible) continue; d.age += dt; const p = d.age / 0.55; if (p >= 1) { d.m.visible = false; continue } d.m.scale.setScalar(d.r * (0.8 + p * 1.6)); d.m.material.opacity = 0.75 * (1 - p) * (1 - p) } }

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
  game.blasts++; if (game.stats) game.stats.blasts++
  // the 'Chain blast' upgrade: wider blasts that melt bigger things around (BALANCE.md)
  const L = save.up.blast || 0, reach = (3 + Math.min(item.r, 6) * 1.6) * (1 + L * 0.08), cap = Math.max(1.2, hole.r * (0.75 + L * 0.015))
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
const game = { state: 'load', time: 60, total: 60, score: 0, eaten: 0, combo: 0, comboTime: 0, frenzy: false, finished: false, seenHint: false, gold: 0, sizeShown: 1, shake: 0, punch: 0, freeze: 0, startR: 1, firstAction: false, doubled: false, more: false, moreLeft: 0 }
const input = { x: 0, z: 0, active: false, id: null, ox: 0, oy: 0, mouse: false, keys: new Set() }
const baseSpeed = () => 7.5 + save.up.speed * 0.6
const pullRange = () => 0.3
const startRadius = () => 1.7 + save.up.start * 0.28 // big enough for benches, lamps and cars from the first second
const meltSpeed = () => 1 + (save.up.magnet + evoStage() - 1) * 0.16 // the 'Power' upgrade (save key 'magnet' from Gulp) + one step per evolution stage

// ---------------------------------------------------------------- goals
// 11-16: three short goals every run, ticked on the result with gold (Playgama 11-05~15: session p50 138 s, 2.6 runs a
// session, so a goal left half done is the reason for one more run). Unfinished goals stay, finished ones are replaced.
// Targets follow the city and how far you got there (its stars). BALANCE.md 'Goals'.
// the landmark chip shows that city's own landmark (11-16: London's Big Ben goal wore the Statue of Liberty)
const LANDMARK_ICON = { ny: '🗽', london: '🕰️', paris: '🗼', rome: '🏟️', cairo: '🏜️', tokyo: '🗼', seoul: '🗼', dubai: '🏙️', vegas: '🎡', toronto: '🗼', nice: '🏨' }
const goalIcon = (id) => (id === 'landmark' && LANDMARK_ICON[THEMES[save.town]?.city]) || GOAL_ICON[id]
const GOAL_ICON = { people: '🧍', cars: '🚗', buses: '🚌', trees: '🌳', houses: '🏠', shops: '🏪', towers: '🏢', props: '💡', size: '📏', blasts: '💥', melt: '🔥', landmark: '🗽', stars: '⭐', score: '🏆', early: '⏱️', heat: '♨️', huge: '🏙️' }
// kinds melted: [kinds, share of the city's count, smallest target]
const KIND_GOALS = { people: [['person'], 0.3, 8], cars: [['car'], 0.35, 5], buses: [['bus'], 0.4, 2], trees: [['tree', 'bush', 'bigTree'], 0.3, 8], houses: [['house', 'cottage'], 0.3, 4], shops: [['shop', 'kiosk'], 0.3, 3], towers: [['tower', 'sky'], 0.2, 3], props: [['lamp', 'hydrant', 'bench', 'mail', 'cone', 'crate', 'parasol', 'vend'], 0.3, 10] }
const GOAL_BIN = new Set(['landmark', 'early'])
const GOAL_FAV = ['houses', 'people', 'blasts', 'huge'] // each character's own goal comes up three times as often
const goalLvl = () => Math.min(3, save.stars[save.town] || 0)
const niceNum = (v) => { const s = Math.pow(10, Math.max(0, Math.floor(Math.log10(Math.max(1, v))) - 1)); return Math.max(s, Math.round(v / s) * s) }
const goalLine = (id, n) => (GOAL_TEXT[lang]?.[id] ?? GOAL_TEXT.en[id]).replace('{n}', id === 'score' ? n.toLocaleString('en-US') : n)
// 11-26 (사용자 "예", Hole Arena: goal 600 vs 1st place 50): a goal pays more than a whole run's melting (NY 230 vs 56-145)
const GOAL_GOLD = [50, 0.9]
const goalGold = () => Math.round((GOAL_GOLD[0] + GOAL_GOLD[1] * cityGold(save.town)) * (1 + save.up.gold * 0.1))
let cityCount = {}
function goalTarget(id) {
  const lvl = goalLvl(), k = KIND_GOALS[id]
  if (k) { const have = k[0].reduce((a, x) => a + (cityCount[x] || 0), 0), top = Math.floor(have * 0.8); return top < k[2] ? 0 : clamp(Math.round(have * k[1] * (0.6 + lvl * 0.3)), k[2], top) } // 0.6x the share in a city without stars, 1.5x at two or more
  switch (id) {
    case 'size': return [4, 6, 8, 10][lvl]
    case 'blasts': return [10, 18, 28, 40][lvl]
    case 'melt': return [40, 60, 80, 90][lvl]
    case 'landmark': return save.stars[save.town] >= 1 ? 1 : 0
    case 'stars': return save.stars[save.town] === 2 ? 3 : 0
    case 'score': return save.best[save.town] > 0 ? niceNum(save.best[save.town] * 0.8) : 0
    case 'early': return 20
    case 'heat': return [15, 25, 35, 45][lvl]
    case 'huge': return (cityCount.huge || 0) >= 4 ? Math.max(1, Math.round(cityCount.huge * (0.15 + lvl * 0.1))) : 0
  }
  return 0
}
function goalValue(id) {
  const s = game.stats, k = KIND_GOALS[id]
  if (k) return k[0].reduce((a, x) => a + (s.kinds[x] || 0), 0)
  switch (id) {
    case 'size': return game.sizeShown
    case 'blasts': return s.blasts
    case 'melt': return Math.floor(game.eaten / world.total * 100)
    case 'landmark': return game.landmarkAt !== null ? 1 : 0
    case 'stars': return STAR_AT.filter((v) => game.eaten / world.total >= v).length
    case 'score': return Math.round(game.score)
    case 'early': return s.early ? 20 : 0
    case 'heat': return s.heat
    case 'huge': return s.huge
  }
  return 0
}
function pickGoal(taken) {
  const fav = GOAL_FAV[curChar()], pool = []
  for (const id in GOAL_ICON) if (!taken.includes(id) && goalTarget(id) > 0) { pool.push(id); if (id === fav) pool.push(id, id) }
  return pool.length ? pick(pool) : null
}
const goalShort = (g, v) => GOAL_BIN.has(g.id) ? '' : g.id === 'score' ? `${shortNum(Math.min(v, g.n))}/${shortNum(g.n)}` : `${Math.min(v, g.n)}/${g.n}${g.id === 'melt' ? '%' : ''}`
const shortNum = (v) => (v >= 1e6 ? `${+(v / 1e6).toFixed(1)}M` : v >= 1e3 ? `${+(v / 1e3).toFixed(1)}k` : `${v}`)
function startGoals() {
  cityCount = { huge: 0 }
  for (const it of world.items) { cityCount[it.base] = (cityCount[it.base] || 0) + 1; if (it.r >= 6 && it.kind !== 'castle') cityCount.huge++ }
  const ids = (save.goals || []).filter((id, i, a) => GOAL_ICON[id] && a.indexOf(id) === i && goalTarget(id) > 0).slice(0, 3)
  while (ids.length < 3) { const id = pickGoal(ids); if (!id) break; ids.push(id) }
  save.goals = ids
  game.goals = ids.map((id) => ({ id, n: goalTarget(id), done: false, el: null }))
  const host = $('goals'); host.innerHTML = ''
  for (const g of game.goals) { const el = document.createElement('div'); el.innerHTML = `<i>${goalIcon(g.id)}</i><span></span>`; host.appendChild(el); g.el = el }
  host.classList.toggle('hide', HIDE_GOALS || !game.goals.length)
  const card = $('goalCard')
  card.innerHTML = `<b>${t2('goals')}</b>` + game.goals.map((g) => `<p><i>${goalIcon(g.id)}</i>${goalLine(g.id, g.n)}<em>+${goalGold()}</em></p>`).join('')
  // 11-24: not on the very first run, where it sat over the city for the first seconds (the chips above still show the goals)
  card.classList.remove('on'); host.classList.remove('intro'); if (!HIDE_GOALS && game.goals.length && save.runs > 0) { void card.offsetWidth; card.classList.add('on'); host.classList.add('intro') }
  updateGoals()
}
const t2 = (key) => GOAL_TEXT[lang]?.[key] ?? GOAL_TEXT.en[key]
function updateGoals() {
  for (const g of game.goals || []) {
    const v = goalValue(g.id)
    if (!g.done && v >= g.n) { g.done = true; g.el.classList.add('done'); goalPop(g); platform.track('mission_complete', { id: g.id, run_index: save.runs + 1, secs: +game.clock.toFixed(1) }) }
    const text = g.done ? '✓' : goalShort(g, v)
    const span = g.el.lastChild; if (span.textContent !== text) span.textContent = text
  }
}
// the moment a goal is done: a big card in the middle (icon, the goal, +gold), a gold ring and coins from the beam
// two goals done in the same moment come one after the other, 1.1 s apart
function goalPop(g) {
  const now = performance.now(), wait = Math.max(0, (goalPop.until || 0) - now)
  goalPop.until = now + wait + 1100
  if (wait) { setTimeout(() => { if (game.state === 'run') goalPopNow(g) }, wait); return }
  goalPopNow(g)
}
function goalPopNow(g) {
  audio.play('levelup', 0.9, 1.15); audio.play('buy', 0.8, 1.3)
  if (HIDE_GOALS) return
  const el = $('goalPop')
  el.innerHTML = `<i>${goalIcon(g.id)}</i><p>${goalLine(g.id, g.n)}</p><b>+${goalGold()}</b>`
  el.classList.remove('on'); void el.offsetWidth; el.classList.add('on')
  burst(hole.x, hole.z, 60, clamp(hole.r / 4, 0.9, 2.4), 0xffd23a, 1.2); burst(hole.x, hole.z, 24, clamp(hole.r / 5, 0.7, 2), 0xffffff, 2)
  dustRing(hole.x, hole.z, hole.r * 1.6); pulseAge = 0; game.shake = Math.max(game.shake, 0.35); game.punch = Math.max(game.punch, 0.6)
}
// at the end: done goals pay gold and make room for new ones (shown on the next run)
function endGoals() {
  updateGoals()
  const done = (game.goals || []).filter((g) => g.done), each = goalGold()
  const host = $('resGoals'); host.innerHTML = ''
  for (const g of game.goals || []) { const el = document.createElement('div'); el.className = g.done ? 'done' : 'next'; el.innerHTML = `<i>${goalIcon(g.id)}</i><span>${g.done ? `+${each}` : goalShort(g, goalValue(g.id))}</span>`; host.appendChild(el) }
  host.classList.toggle('hide', !(game.goals || []).length)
  const ids = (game.goals || []).filter((g) => !g.done).map((g) => g.id), taken = (game.goals || []).map((g) => g.id)
  while (ids.length < 3) { const id = pickGoal([...ids, ...taken]); if (!id) break; ids.push(id) }
  save.goals = ids
  return done.length * each
}

// a run starts where small things are: the grid towns' south-west corner, a city's own start
const theme0Start = () => (THEMES[save.town].city ? world.plan.start : [-PITCH * 2.5, PITCH * 2.5])
function resetRun() {
  buildWorld(save.town); meteorsOff(); applyChar()
  const st = theme0Start(); hole.x = st[0]; hole.z = st[1]; hole.vx = hole.vz = 0
  // ...on the near edge of the one house the starting beam can melt, so it heats and falls within the first seconds
  const first = world.items.find((it) => it.first); if (first) { hole.x = first.x; hole.z = first.z + first.r * 0.35 }
  game.startR = startRadius(); hole.r = hole.shown = game.startR
  // 11-22 user "1,2 둘 다 해": the very first run is 60 s (39% left mid-run before seeing the result, upgrades, unlocks)
  game.total = game.time = (save.runs === 0 && !Q.has('bot') ? 60 : 120) + save.up.time * 5 // two-minute runs
  Object.assign(game, { blasts: 0, blastT: 0, score: 0, eaten: 0, combo: 0, comboTime: 0, frenzy: false, finished: false, gold: 0, sizeShown: 1, shake: 0, firstAction: false, focus: null, firstMarks: {}, doubled: false, more: false, droneUsed: false, droneAt: null, charge: 0, clock: 0, landmarkAt: null, firstMelt: false, firstBuilding: false, weakT: 0, meltK: 1, stats: { kinds: {}, combo: 0, blasts: 0, heat: 0, huge: 0, early: false } })
  fallers.forEach(clearFaller); droneOff(); startGoals(); surprisesStart(); dropsStart()
}
function clearFaller(f) { f.item = null; f.up.visible = false; f.up.material.emissiveIntensity = 0 }
const size = () => 1 + Math.floor((hole.r - game.startR) / 0.8)

function startRun() {
  // 11-21 (Playgama QA tool): a second 시작 tap during the first city's card started the run, then the card's own start restarted it
  // a few seconds later and took away the drone just bought with an ad. A run already going is never started again.
  if (game.state !== 'title' && game.state !== 'over') return
  if (save.runs === 0 && save.town === 0 && !(save.told || []).includes(0) && !BOT && !RENDER) { revealCity(0, startRun); return }
  audio.unlock(); audio.play('click')
  resetRun()
  $('banner').classList.remove('on'); $('combo').classList.remove('on') // 11-16: last run's OVERHEAT! replayed when the HUD came back
  show('hud'); hide_('title'); hide_('result'); hide_('pause'); hide_('panel')
  game.state = 'run'
  palsStart()
  audio.music('run')
  platform.message('gameplay_started')
  platform.track('run_start', { since_load: Math.round((performance.now() - loadedAt) / 100) / 10 })
  if (!game.seenHint && save.runs === 0) setHint('hand') // a hand sliding left and right, no words (2026-11-25 사용자: 5 of 53 runs never moved)
}
// Time's up with the city still standing: once a run, a rewarded ad buys 15 more seconds (from the second run on, like Gulp).
const canMore = () => !game.more && save.runs >= 1 && !BOT && (platform.ready || Q.has('fakead'))
function offerMore() {
  game.more = true; game.state = 'more'; game.moreLeft = 5; game.moreWait = false; game.time = 0; updateHud()
  platform.message('gameplay_stopped'); audio.play('end', 0.6)
  $('moreBtn').textContent = t('moreTime'); $('moreNo').textContent = t('quit'); $('moreBtn').disabled = false
  show('more')
}
function moreDone(ok) {
  if (game.state !== 'more') return
  hide_('more')
  if (!ok) { game.state = 'run'; endRun(false); return }
  game.time = 15; game.state = 'run'; last = performance.now(); platform.message('gameplay_started')
  banner(t('moreTime')); audio.play('levelup'); audio.music('run', 1.14); burst(hole.x, hole.z, 40, 1.4)
}
function setHint(text) { const h = $('hint'); h.classList.toggle('hand', text === 'hand'); h.textContent = text === 'hand' ? '\u{1F446}' : text; h.classList.toggle('on', !!text) }
function pauseRun() { if (game.state !== 'run') return; game.state = 'pause'; $('pauseOpts').innerHTML = ''; addSliders($('pauseOpts')); show('pause'); platform.message('gameplay_stopped') }
function resumeRun() { if (game.state !== 'pause') return; platform.paused = false; audio.unlock(); hide_('pause'); game.state = 'run'; last = performance.now(); platform.message('gameplay_started') }

// Gold by how much of the city melted, each city worth 1.4x the one before (11-07: score / 40 gave 4,000-14,000 a run
// against first upgrades of 50-100, so every city went to 3 stars in one run). BALANCE.md.
const cityGold = (town) => 200 * Math.pow(1.4, town)
function endRun(cleared) {
  if (game.finished) return
  game.finished = true; game.state = 'over'; droneOff(); palsOff(); surprisesOff(); dropsOff()
  platform.message('gameplay_stopped')
  hide_('more'); audio.play('end'); audio.music('menu')
  // stars by how much of the city melted: 50 / 75 / 95 % (the same in every city)
  const town = save.town, ratio = game.eaten / world.total
  const stars = STAR_AT.filter((v) => ratio >= v).length
  const bonus = 1 + save.up.gold * 0.1
  game.gold = Math.round((ratio * cityGold(town) + 15 + stars * 30) * bonus)
  game.goalGold = endGoals(); game.gold += game.goalGold
  game.surpGold = game.surp?.gold || 0; game.gold += game.surpGold // bags of gold and a beaten army (already with the gold upgrade)
  perf.flush()
  platform.track('run_end', { secs: +game.clock.toFixed(1), score: Math.round(game.score), melted: Math.round(ratio * 100), stars, landmark: game.landmarkAt !== null, moved: game.firstAction })
  platform.setScore('top_score', Math.round(game.score)); delete boardCache[0]; delete boardCache[1]
  if (game.landmarkAt !== null) { const ms = Math.round(game.landmarkAt * 1000); platform.setScore('landmark_fastest', ms); save.fast = save.fast ? Math.min(save.fast, ms) : ms } // time boards take milliseconds
  save.gold += game.gold; save.runs++
  // first run, however it went: a new laser colour, worn at once (11-22)
  const firstGift = save.runs === 1 && !save.skins.includes(1)
  if (firstGift) { save.skins.push(1); save.skin = 1; setLaserColor(SKINS[1].color) }
  $('resGift').classList.toggle('hide', !firstGift)
  if (firstGift) $('resGift').innerHTML = `<i style="background:#${SKINS[1].color.toString(16).padStart(6, '0')}"></i><b>${t('newSkin')}</b>`
  const ch = curChar(), evoBefore = evoStage(ch); save.evo[ch] = (save.evo[ch] || 0) + ratio; game.evolved = evoStage(ch) > evoBefore
  // new characters: the UFO right after the first run, the meteor bot for the second city's landmark (shown after the result)
  game.newChar = -1
  if (!save.chars.includes(1)) { save.chars.push(1); game.newChar = 1 }
  else for (const c of [2, 3]) if (town === CHARS[c].town && game.landmarkAt !== null && !save.chars.includes(c)) { save.chars.push(c); game.newChar = c }
  if (game.newChar >= 0) platform.track('char_unlock', { char: CHARS[game.newChar].id })
  // how close the landmark came (beam width against what melts it, 1 = it fell): the 'next character' bar on the result (11-21 총괄: 31 starts, 19 ends)
  const lmBefore = [...save.lm], castle = world.items.find((x) => x.kind === 'castle')
  if (castle) save.lm[town] = Math.max(save.lm[town] || 0, game.landmarkAt !== null ? 1 : Math.min(0.99, hole.r * chipLimit(castle) / castle.r))
  // the first star here opens the next city: the main button goes there, and right after the ad a big card shows it (11-06: 60.5 % left after the ad)
  game.unlock = town < THEMES.length - 1 && save.stars[town] < 1 && stars >= 1 ? town + 1 : -1
  if (game.unlock >= 0) $('revealPic').src = `img/landmarks/city${String(game.unlock).padStart(2, '0')}.webp` // load it before the card
  game.newPal = game.landmarkAt !== null && !save.pals.includes(town) ? town : -1
  if (game.newPal >= 0) { save.pals.push(town); platform.track('pal_unlock', { town }) }
  $('resPal').classList.toggle('hide', game.newPal < 0)
  if (game.newPal >= 0) $('resPal').innerHTML = `<img src="${palPic(game.newPal)}" alt=""><span><b>${t('palNew')}</b>${palName(game.newPal)}</span>`
  const lvBefore = lvOf(save.xp); game.xp = runXp(ratio, town, stars); save.xp = (save.xp || 0) + game.xp
  const lvAfter = lvOf(save.xp); game.levelUp = lvAfter.l > lvBefore.l
  if (game.levelUp) { setLevelLook(lvAfter.l); platform.track('level_up', { level: lvAfter.l }) }
  save.stars[town] = Math.max(save.stars[town], stars)
  const record = game.score > save.best[town]; save.best[town] = Math.max(save.best[town], Math.round(game.score))
  writeSave()
  $('resTitle').textContent = cleared ? t('cleared') : t('timeUp')
  $('resStars').innerHTML = [0, 1, 2].map((i) => `<i class="${i < stars ? 'on' : ''}" style="animation-delay:${i * 0.18}s"></i>`).join('')
  $('resEatenLabel').textContent = t('eaten'); $('resEaten').textContent = `${Math.round(ratio * 100)}%`
  const goal = STAR_AT[stars], bar = $('resBar')
  bar.style.setProperty('--fill', Math.min(1, ratio)); bar.style.setProperty('--goal', goal ?? Math.min(1, ratio))
  bar.classList.remove('gap'); if (goal) setTimeout(() => { void bar.offsetWidth; bar.classList.add('gap') }, 900)
  // the next city, always (locked = dark with a lock), so the player sees where the run leads
  const locked = town < THEMES.length - 1 && save.stars[town] < 1, hasNext = town < THEMES.length - 1
  $('resNext').classList.toggle('hide', !hasNext); $('resNext').classList.toggle('open', !locked)
  if (hasNext) { $('resNextPic').src = `img/landmarks/city${String(town + 1).padStart(2, '0')}.webp`; $('resNextName').textContent = TOWN_NAMES[lang][town + 1] }
  { const nc = game.newChar >= 2 ? game.newChar : [2, 3].find((c) => !save.chars.includes(c)), el = $('resChar')
    el.classList.toggle('hide', nc === undefined)
    if (nc !== undefined) {
      const p = game.newChar === nc ? 1 : save.lm[CHARS[nc].town] || 0, from = lmBefore[CHARS[nc].town] || 0
      $('resCharPic').src = charIcon(nc); el.classList.toggle('done', p >= 1)
      $('resCharText').textContent = p >= 1 ? t('newChar') : p > 0 ? t('nextChar').replace('{n}', Math.floor(p * 100)) : t(CHARS[nc].how).replace('{city}', TOWN_NAMES[lang][CHARS[nc].town])
      el.style.setProperty('--p', from); setTimeout(() => el.style.setProperty('--p', p), 900)
    } }
  { const el = $('resLv'), max = lvAfter.l >= LV_MAX
    el.classList.toggle('lvup', game.levelUp); el.classList.toggle('max', max)
    $('resLvNum').textContent = `${t('lvl')} ${lvAfter.l}`; $('resLvNum').style.background = `#${lvTint(lvAfter.l).toString(16).padStart(6, '0')}`
    $('resLvText').textContent = game.levelUp ? t('lvUp') : max ? t('max') : t('lvNext').replace('{n}', Math.floor(lvAfter.part * 100))
    $('resLvGain').textContent = `+${game.xp} XP`
    el.style.setProperty('--p', game.levelUp ? 0 : lvBefore.part); setTimeout(() => el.style.setProperty('--p', max ? 1 : lvAfter.part), 900) }
  $('resBestLabel').textContent = t('best'); $('resBest').textContent = Math.round(save.best[town]).toLocaleString('en-US')
  $('resGold').textContent = `+${game.gold}`
  { const st = evoStage(ch), part = evoPart(ch), el = $('resEvo')
    $('resEvoPic').src = charIcon(ch); el.classList.toggle('evolved', !!game.evolved); el.classList.toggle('max', st >= 3)
    $('resEvoText').textContent = game.evolved ? `${t('evoUp')} ${'★'.repeat(st)}` : st >= 3 ? t('evoMax') : t('evoNext').replace('{n}', Math.floor((1 - part) * 100))
    el.style.setProperty('--p', st >= 3 && !game.evolved ? 1 : game.evolved ? 1 : part) }
  $('doubleBtn').textContent = t('double'); $('doubleBtn').disabled = false; $('againBtn').disabled = $('homeBtn').disabled = false
  $('againBtn').innerHTML = '<i class="cd"><b></b></i><span></span>'; $('againBtn').lastChild.textContent = game.unlock >= 0 ? `${TOWN_NAMES[lang][game.unlock]} ▶` : t('again'); $('homeBtn').textContent = t('home')
  $('againBtn').classList.toggle('next', game.unlock >= 0)
  $('doubleBtn').classList.toggle('hide', !platform.ready)
  renderUpgrades($('resUp'))
  $('rankBtn').classList.toggle('hide', !['in_game', 'native_popup'].includes(platform.boardType()))
  $('againBtn').classList.add('pulse')
  setTimeout(() => { show('result'); hide_('hud'); fitUps($('resUp')); startCount() }, 700)
  window.__runs = window.__runs || []; window.__runs.push({ lm: (game.landmarkAt === null ? 'no' : +game.landmarkAt.toFixed(1)) + ' castleR ' + (world.items.find((x) => x.kind === 'castle')?.r ?? 0).toFixed(1), score: Math.round(game.score), eaten: Math.round(ratio * 100), r: +hole.r.toFixed(1), stars, gold: game.gold, goals: (game.goals || []).map((g) => `${g.id} ${goalValue(g.id)}/${g.n}`), surp: (game.surp?.log || []).join(',') + ` +${game.surpGold}`, drops: (game.drops || []).join(',') + `/${(game.dropAt || []).length}left`, stats: game.stats, size: game.sizeShown, secs: Math.round(game.total - Math.max(0, game.time)), drone: game.droneAt })
}

function swallow(item, crushed = false) {
  item.alive = false; hide(item)
  const f = fallers.find((x) => !x.item)
  if (f) {
    const kind = world.kinds[item.kind]
    f.item = item; f.age = 0; f.life = clamp(0.35 + item.r * 0.07, 0.35, 1.0); f.spin = rnd(-1, 1) * (item.r < 3 ? 1.2 : 0.2); f.hr = hole.r; f.thud = false
    f.up.geometry = kind.geometry; f.big = item.r >= 3; f.drip = false; f.ufo = curChar() === 1; f.throw = octoOn(); f.lift = f.ufo || (!f.throw && item.base === 'person'); if (f.lift) f.life = f.ufo ? clamp(0.55 + item.r * 0.09, 0.55, 1.4) : 0.8
    f.up.material.emissive.set(f.ufo ? 0xfff07a : f.lift ? 0x6fe8ff : 0xff4a1a)
    if (f.big && !f.ufo && !f.throw) breakApart(item, kind)
    if (f.throw) { // pulled out and thrown away; at stage 3 far onto another building
      const far = evoStage(3) >= 3, aim = far ? world.items.find((x) => x.alive && x !== item && Math.hypot(x.x - item.x, x.z - item.z) > 18 && Math.hypot(x.x - item.x, x.z - item.z) < 45) : null
      const a = Math.random() * Math.PI * 2, d = 10 + item.r * 2 + Math.random() * 6
      f.tx = aim ? aim.x : item.x + Math.cos(a) * d; f.tz = aim ? aim.z : item.z + Math.sin(a) * d; f.far = !!aim
      f.life = clamp(0.7 + item.r * 0.05, 0.7, 1.3) * (aim ? 1.3 : 1); f.up.material.emissive.set(0xff5df0)
    }
    const tinted = kind.tint && item.color !== null
    f.up.material.color.set(tinted ? item.color : WHITE)
    f.up.visible = true
    f.sx = item.x; f.sz = item.z
    const M = mainSrc(); f.ax = M.x - item.x; f.az = M.z - item.z
    const len = Math.hypot(f.ax, f.az) || 1; f.ax /= len; f.az /= len
  }
  if (!game.firstMelt) { game.firstMelt = true; platform.track('first_melt', { secs: +game.clock.toFixed(1), moved: game.firstAction }) }
  if (item.r >= 3 && item.base !== 'car' && item.base !== 'bus' && !game.firstBuilding) { game.firstBuilding = true; platform.track('first_building', { secs: +game.clock.toFixed(1) }) }
  if (item.kind === 'castle' && game.landmarkAt === null) game.landmarkAt = game.clock
  game.comboTime = 1.4; game.combo++
  { const s = game.stats; s.kinds[item.base] = (s.kinds[item.base] || 0) + 1; s.combo = Math.max(s.combo, game.combo); if (game.frenzy) s.heat++; if (item.r >= 6 && item.kind !== 'castle') s.huge++; if (item.r >= 3 && item.kind !== 'castle' && item.base !== 'car' && item.base !== 'bus') trySurprise(item); if (!crushed && game.zapT > game.clock) zapFrom(item); if (!s.early && item.r >= 3 && item.base !== 'car' && item.base !== 'bus' && game.clock <= 20) s.early = true }
  const mult = 1 + Math.min(game.combo, 60) / 12
  const gain = item.pts * mult * (game.frenzy ? 2 : 1)
  game.score += gain; game.eaten += item.pts; game.charge += item.pts / (world.total * DRONE_FILL)
  // a thin beam grows twice as fast, so the first seconds climb quickly to cars and houses
  hole.r = Math.sqrt(hole.r * hole.r + item.mass * GROW * (crushed ? 0.6 : 1) * (hole.r < 3 ? 2 : 1) / cityHard())
  // cars blow up; with 'Chain blast' some melted buildings do too (never the landmark), at most 8 blasts a second
  const blasts = item.base === 'car' || item.base === 'bus' || (item.r >= 3 && item.kind !== 'castle' && Math.random() < Math.min(0.5, (save.up.blast || 0) * 0.04))
  // only near the beam: a car melted by a blast far down the road must not set off the next one (2026-11-06 사용자
  // "범위내도 아닌데 왜 세로방향으로 터져": blasts ran along a line of cars away from the beam)
  if (blasts && game.blasts < 8 && Math.hypot(item.x - mainSrc().x, item.z - mainSrc().z) < hole.r * 2 + 6) explode(item)
  hole.chomp = Math.min(1, hole.chomp + 0.25 + item.r * 0.1)
  const debris = item.color ?? world.kinds[item.kind].avg
  if (lvShown >= 3 && (item.r >= 1.4 || Math.random() < 0.15)) burst(item.x, item.z, Math.min(12, 1 + Math.floor(lvShown / 4)), 0.4 + lvShown * 0.008, lvTint(lvShown))
  if (item.r >= 3) {
    floatText(`+${Math.round(gain)}`, item.x, item.z, item.r >= 6)
    burst(item.x, item.z, Math.min(40, 8 + item.r * 4), clamp(item.r / 5, 0.6, 2.4), debris)
    dustRing(item.x, item.z, item.r); smoke(item.x, item.z, Math.min(20, 8 + Math.round(item.r * 2)), clamp(item.r * 0.5, 1.3, 3.2), 0.6, item.r * 0.7)
    game.punch = Math.max(game.punch, clamp(item.r / 9, 0.3, 1))
    if (item.r >= 6) game.freeze = 0.07
    game.shake = Math.max(game.shake, clamp(item.r * 0.07, 0.15, 0.9))
    audio.play(item.r >= 6 ? 'huge' : 'big', 0.9, rnd(0.95, 1.1))
  } else if (item.r >= 1.4) { audio.play('crunch', 0.7, rnd(0.9, 1.2)); burst(item.x, item.z, 16, 0.95, debris); burst(item.x, item.z, 4, 0.5, 0xffb03a); smoke(item.x, item.z, 7, clamp(item.r * 0.6, 1, 1.8), 0.5, item.r * 0.6); dustRing(item.x, item.z, item.r * 0.9); game.shake = Math.max(game.shake, 0.1) }
  else if (Math.random() < 0.5) burst(item.x, item.z, 2, 0.35, Math.random() < 0.5 ? debris : 0xffb03a)
  else audio.play(Math.random() < 0.5 ? 'melt1' : 'melt2', 0.9, clamp(0.9 + game.combo * 0.01, 0.9, 1.45))  // sizzle + plop (tools/make_sounds.py)
}
const GROW = 0.42
const BIG_CHIP = 2.2
// the landmark is the run's last goal: only a beam nearly its size melts it
// landmarks melt up to 1.4x the beam; a city may set its own (theme.lmChip: Dubai 1.5, 11-21: at upgrade 9 the beam stopped at 9.62 of the 9.64 the supertall needs with 94 % melted)
// first run: the landmark melts at a beam 2x smaller instead of 1.4x, so it falls inside the 60 s (2026-11-25 사용자: 8 of 53 runs toppled it)
const chipLimit = (item) => (item.kind === 'castle' ? (save.runs === 0 ? 2 : THEMES[save.town].lmChip ?? 1.4) : BIG_CHIP)
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
function banner(text, kind = '') { const b = $('banner'); b.textContent = text; b.classList.remove('on', 'small'); void b.offsetWidth; b.classList.add('on'); if (kind) b.classList.add(kind) }

const SPOT_ON_SCREEN = new THREE.Vector3()
function steer(dt) {
  let dx = 0, dz = 0
  if (BOT) { const target = botTarget(); dx = target.x; dz = target.z }
  else {
    const k = input.keys
    if (k.has('ArrowLeft') || k.has('KeyA')) dx -= 1
    if (k.has('ArrowRight') || k.has('KeyD')) dx += 1
    if (k.has('ArrowUp') || k.has('KeyW')) dz -= 1
    if (k.has('ArrowDown') || k.has('KeyS')) dz += 1
    // the mouse steers from where the beam meets the ground on screen, not from the screen centre: on a PC the spot sits
    // 180-210 px below the centre, so near the beam it went the other way from the cursor (2026-11-10 사용자 "마우스위치랑 레이저가 닿는 위치가 달라?")
    if (input.mouse && input.active) {
      SPOT_ON_SCREEN.set(hole.x, 0, hole.z).project(camera)
      const ddx = input.mx - (SPOT_ON_SCREEN.x + 1) / 2 * innerWidth, ddy = input.my - (1 - SPOT_ON_SCREEN.y) / 2 * innerHeight, scale = Math.min(innerWidth, innerHeight) * 0.2
      const still = Math.hypot(ddx, ddy) < 18; input.x = still ? 0 : ddx / scale; input.z = still ? 0 : ddy / scale
    }
    if (!dx && !dz && input.active) { dx = input.x; dz = input.z }
  }
  const len = Math.hypot(dx, dz)
  if (len > 1) { dx /= len; dz /= len }
  if (len > 0.02 && !game.firstAction) { game.firstAction = true; game.seenHint = true; setTimeout(() => setHint(''), 900); platform.track('first_move', { secs: +game.clock.toFixed(1) }) }
  const speed = (baseSpeed() + Math.sqrt(hole.r) * 2.2) * (game.frenzy ? 1.3 : 1) * (game.slowT > game.clock ? DROP.slow[1] : 1)
  hole.vx = lerp(hole.vx, dx * speed, clamp(dt * 12, 0, 1)); hole.vz = lerp(hole.vz, dz * speed, clamp(dt * 12, 0, 1))
  const edge = WORLD - 2 // 11-21: at WORLD + 6 the spot left the blocks and the camera showed empty ground and sea
  hole.x = clamp(hole.x + hole.vx * dt, -edge, edge); hole.z = clamp(hole.z + hole.vz * dt, -edge, edge)
}

const botState = { x: 0, z: 0, wait: 0 }
function botTarget() {
  botState.wait -= 1 / 60
  if (botState.wait <= 0) {
    botState.wait = 0.35; let best = null, score = -1
    // recording only (long video "leave the landmark for last"): while __keepCastle is on, the landmark and everything
    // close around it are not targets; the beam can still clip it on the way, and the video keeps that as it happened
    const keep = window.__keepCastle && world.items.find((x) => x.kind === 'castle' && x.alive)
    for (const item of world.items) {
      if (!item.alive || item.r >= hole.r * Math.min(1.8, chipLimit(item) * 0.995)) continue
      if (keep && Math.hypot(item.x - keep.x, item.z - keep.z) < keep.r + hole.r + 1.5) continue
      if (curChar() === 2 && item.road) continue // the meteor lands 1 s later: the bot leaves moving cars alone
      const ratio = item.r / hole.r, d = Math.hypot(item.x - hole.x, item.z - hole.z), s = item.pts * (item.kind === 'castle' ? 50 : 1) / (d + 4) / (ratio > 1 ? ratio ** 4 * 3 : 1)
      if (s > score) { score = s; best = item }
    }
    if (best) { botState.x = best.x; botState.z = best.z }
  }
  return { x: (botState.x - hole.x) / 3, z: (botState.z - hole.z) / 3 }
}

// ---------------------------------------------------------------- helper drone (2026-11-07 사용자 "ai도 드론 처럼 광고보면 알아서 깨주는애")
// A little UFO for 20 s: it flies to the biggest thing it can melt near the bot and melts it with its own mint beam;
// everything it melts counts for the run. Once a run. Where rewarded ads exist it is an ad, offered only when the star
// the player is going for looks out of reach. Where there are none (web-play, no bridge, no rewarded ads) a gauge on the
// same button fills as the city melts (and slowly with time) and the drone comes free (사용자 "광고 없는 곳은 이 기능 어떻게").
const DRONE_TIME = 20, DRONE_FILL = 0.22, DRONE_SECS = 50
const drone = { melt: 1.5, on: false, left: 0, x: 0, z: 0, r: 1, blockY: 0, target: null, look: 0, group: new THREE.Group() }
{
  // bright yellow, not pale grey: grey melted into the streets and parking lots (2026-11-10 사용자 "드론 눌렀는데 드론 왜 안보여")
  // a quadcopter (bright yellow body, four green rotors): the abduction UFO is the saucer now (11-14)
  const metal = new THREE.MeshStandardMaterial({ color: 0xffd23f, emissive: 0xff9f1c, emissiveIntensity: 0.35, metalness: 0.2, roughness: 0.45, flatShading: true })
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.32, 0.8), metal)
  const eye = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 8), glow(0x2ee6a6, 1)); eye.position.set(0, -0.12, 0.38)
  drone.group.add(body, eye)
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4, x = Math.cos(a) * 0.95, z = Math.sin(a) * 0.95
    const arm = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.1, 0.12), metal); arm.position.set(x / 2, 0.05, z / 2); arm.rotation.y = -a; drone.group.add(arm)
    const rotor = new THREE.Mesh(new THREE.CircleGeometry(0.42, 16).rotateX(-Math.PI / 2), glow(0x2ee6a6, 0.55)); rotor.position.set(x, 0.16, z); drone.group.add(rotor)
    const l = new THREE.Mesh(new THREE.SphereGeometry(0.1, 6, 4), glow(0xffffff, 1)); l.position.set(x, 0.05, z); l.userData.light = i; drone.group.add(l)
  }
  drone.beam = new THREE.Mesh(beamOuter.geometry, paintGlow(0x2ee6a6, 0.75)); drone.beam.renderOrder = 3
  drone.ring = new THREE.Mesh(ring.geometry, paintGlow(0x2ee6a6, 0.95)); drone.ring.renderOrder = 2
  drone.spot = new THREE.Mesh(spot.geometry, paintGlow(0x2ee6a6, 0.35)); drone.spot.renderOrder = 2
  for (const m of [drone.group, drone.beam, drone.ring, drone.spot]) { m.visible = false; front.add(m) }
}
const DRONE_FROM = new THREE.Vector3(), DRONE_TO = new THREE.Vector3()
const droneAd = () => Q.has('fakead') || (platform.ready && window.bridge?.advertisement?.isRewardedSupported !== false)
function droneOff() { drone.on = false; drone.target = null; for (const m of [drone.group, drone.beam, drone.ring, drone.spot]) m.visible = false; const b = $('droneBtn'); b.classList.add('hide'); b.classList.remove('full', 'ad', 'running', 'wait', 'used'); b.style.setProperty('--p', 0) }
// tried this run (flown, or the ad was skipped): the button stays, dim, until the run ends (사용자 "다음 판 왔더니 드론 광고 버튼 사라져 있어")
function droneSpent() { const b = $('droneBtn'); b.textContent = t('drone'); b.classList.remove('hide', 'ad', 'full', 'running', 'wait'); b.classList.add('used'); b.disabled = true; b.style.setProperty('--p', 0) }
function droneOffer(dt) {
  const b = $('droneBtn')
  if (drone.on) { const text = `${t('drone')} ${Math.ceil(drone.left)}`; if (b.textContent !== text) b.textContent = text; b.style.setProperty('--p', drone.left / DRONE_TIME); return }
  if (game.droneUsed || (BOT && !Q.has('drone') && !window.__droneBot)) return
  if (!droneAd() && save.runs < 1) return
  if (!droneAd()) { // gauge: on screen all run, tap when full
    game.charge += dt / DRONE_SECS
    const p = Math.min(1, game.charge), was = b.classList.contains('full')
    if (b.classList.contains('hide')) { b.textContent = t('drone'); b.classList.remove('hide', 'ad') }
    b.style.setProperty('--p', p); b.disabled = p < 1
    if (p >= 1 && !was) { b.classList.add('full'); audio.play('levelup', 0.6, 1.3); if (BOT) droneStart(true) }
    return
  }
  // ad: 11-21 사용자 "액티브 광고 하나씩 해놔": ready to press from the first second of the first run (watch an ad, get the drone)
  if (b.classList.contains('hide') || b.disabled) { b.textContent = t('drone'); b.disabled = false; b.classList.remove('hide', 'wait'); b.classList.add('ad', 'full'); b.style.setProperty('--p', 1) }
}
function droneStart(ok) {
  const b = $('droneBtn')
  game.droneUsed = true // one try per run: a skipped or failed ad does not bring the button back (사용자 2026-11-08 "계속 누를 수가 있어")
  if (!ok || game.state !== 'run') { if (game.state === 'run') { droneSpent(); banner(t('droneSkip'), 'small') } return }
  game.droneAt = Math.round(game.time); b.classList.remove('ad', 'full'); b.classList.add('running'); b.disabled = true
  // it appears right beside the bot, big, for the first 2 s so the player sees where it is (사용자 "어디에 있는지 보이지도 않아")
  const side = (innerWidth >= innerHeight ? 5 : 2.5) + hole.r * 0.9
  Object.assign(drone, { on: true, left: DRONE_TIME, x: hole.x + side, z: hole.z, r: Math.max(1.6, hole.r), target: null, look: 0, intro: 2 })
  for (const m of [drone.group, drone.beam, drone.ring, drone.spot]) m.visible = true
  last = performance.now(); banner(t('drone')); audio.play('levelup'); burst(hole.x, hole.z, 30, 1.2, 0x2ee6a6)
}
const DRONE_P = new THREE.Vector3()
// is this ground point (with the drone body h above it) inside the picture, clear of the edges and the top HUD?
function droneSees(x, z, h = 4 + drone.r * 1.6) {
  DRONE_P.set(x, h, z - h * 0.25).project(camera)
  if (Math.abs(DRONE_P.x) > 0.82 || DRONE_P.y > 0.62 || DRONE_P.y < -0.8) return false
  DRONE_P.set(x, 0, z).project(camera)
  return Math.abs(DRONE_P.x) < 0.9 && DRONE_P.y < 0.75 && DRONE_P.y > -0.9
}
function droneTarget() {
  let best = null, score = -1e9
  // only what is on screen around the bot (a phone held upright shows a narrow strip), not under the bot's own beam
  const limit = drone.r * 1.6, side = (innerWidth >= innerHeight ? 16 : 7) + hole.r * 1.3, ahead = 12 + hole.r * 2.2, behind = 4 + hole.r
  for (const item of world.items) {
    if (!item.alive || item.kind === 'castle' || item.r > limit) continue
    const ox = item.x - hole.x, oz = item.z - hole.z
    if (Math.abs(ox) > side || oz < -ahead || oz > behind || Math.hypot(ox, oz) < hole.r + item.r || !droneSees(item.x, item.z)) continue
    const v = item.r * item.r - Math.hypot(item.x - drone.x, item.z - drone.z) * 0.5
    if (v > score) { score = v; best = item }
  }
  return best
}
function updateDrone(dt, touch) {
  drone.left -= dt
  if (drone.left <= 0) { burst(drone.x, drone.z, 20, 0.8, 0x2ee6a6); droneOff(); droneSpent(); return }
  drone.r = Math.max(drone.r, hole.r)
  // keeps its target until it has melted (or 4 s pass), so it finishes big things instead of chasing cars
  drone.look -= dt; drone.intro = Math.max(0, (drone.intro || 0) - dt)
  if (drone.target && !droneSees(drone.target.x, drone.target.z)) drone.target = null
  if (drone.intro <= 0 && (!drone.target?.alive || drone.look <= 0)) { drone.target = droneTarget(); drone.look = 4 }
  const side = (innerWidth >= innerHeight ? 5 : 2.5) + hole.r * 0.9
  const goal = (drone.intro <= 0 && drone.target) || { x: hole.x + side, z: hole.z }
  const dx = goal.x - drone.x, dz = goal.z - drone.z, d = Math.hypot(dx, dz), step = Math.min(d, (10 + drone.r * 2) * dt)
  if (d > 0.01) { drone.x += (dx / d) * step; drone.z += (dz / d) * step }
  // the camera follows the bot, not the drone: if the view has moved on, pull it back toward the bot until it shows
  for (let i = 0; i < 8 && !droneSees(drone.x, drone.z); i++) { drone.x = lerp(drone.x, hole.x + side, 0.25); drone.z = lerp(drone.z, hole.z, 0.25) }
  drone.blockY = 0
  const reach = drone.r + 14, from = Math.floor(-reach / CELL), to = Math.ceil(reach / CELL)
  for (let a = from; a <= to; a++) for (let b = from; b <= to; b++) {
    const bucket = world.hash.get(hashKey(drone.x + a * CELL, drone.z + b * CELL))
    if (bucket) for (const item of bucket) if (item.alive && eat(item, dt, drone)) touch()
  }
}
// ---------------------------------------------------------------- landmark drones (11-23 사용자 "랜드마크가 작아져서 드론처럼 도와주는게 어때")
// A felled landmark shrinks into that city's drone: in a run it floats on a pale-blue ring by the bot (no wings) and helps by itself
// with its city's move; on the shelf (Characters panel) and cards it is the figurine on a purple stand (img/drones, tools/bake_figurines.sh).
// Each run up to 3 of the collected ones come along at random (11-23 사용자 "판을 시작할때 최대 3개 랜덤하게"). Values: BALANCE.md 'Landmark drones'.
const PAL = { every: [7, 8, 7, 7, 9, 7, 8, 9, 8, 9, 7], cap: 1.1, bigCap: 2, freezeCap: 1.8, max: 3 }
const pals = [], palFx = [], palGeo = {}
const palName = (t0) => t('palName').replace('{city}', TOWN_NAMES[lang][t0])
const palPic = (t0) => `img/drones/city${String(t0).padStart(2, '0')}.webp`
const palMat = new THREE.MeshLambertMaterial({ vertexColors: true, emissive: 0x223355, emissiveIntensity: 0.35 })
function palGeometry(t0) {
  if (!palGeo[t0]) {
    const k = buildKinds(THEMES[t0]).castle, g = (k.geometry || merge(k.parts)).clone()
    g.computeBoundingBox(); const b = g.boundingBox, h = Math.max(b.max.y - b.min.y, b.max.x - b.min.x, b.max.z - b.min.z)
    g.translate(-(b.min.x + b.max.x) / 2, -b.min.y, -(b.min.z + b.max.z) / 2); g.scale(1 / h, 1 / h, 1 / h); palGeo[t0] = g
  }
  return palGeo[t0]
}
function palsOff() { for (const p of pals) front.remove(p.g); pals.length = 0; for (const f of palFx) if (f.m) front.remove(f.m); palFx.length = 0; $('palFaces').classList.add('hide') }
function palsStart() {
  palsOff()
  const have = [...new Set(save.pals)].filter((x) => x < THEMES.length)
  for (let i = have.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [have[i], have[j]] = [have[j], have[i]] }
  const pick = have.slice(0, PAL.max)
  pick.forEach((t0, i) => {
    const g = new THREE.Group(), body = new THREE.Mesh(palGeometry(t0), palMat)
    const halo = new THREE.Mesh(new THREE.RingGeometry(0.36, 0.46, 40).rotateX(-Math.PI / 2), glow(0x8fe6ff, 0.85))
    const disc = new THREE.Mesh(new THREE.CircleGeometry(0.36, 32).rotateX(-Math.PI / 2), glow(0x5fd0ff, 0.35))
    halo.renderOrder = disc.renderOrder = 3; g.add(body, halo, disc)
    front.add(g)
    pals.push({ t: t0, g, body, halo, disc, x: hole.x, z: hole.z, y: 3, ang: (i / Math.max(1, pick.length)) * Math.PI * 2 + 0.6, cd: 2.5 + i * 1.3, pop: 0 })
  })
  const el = $('palFaces')
  el.classList.toggle('hide', !pick.length)
  if (pick.length) {
    el.innerHTML = pick.map((t0, i) => `<div style="animation-delay:${3.6 + i * 0.15}s"><img src="${palPic(t0)}" alt=""><b>${palName(t0)}</b></div>`).join('')
    el.classList.remove('palGo'); void el.offsetWidth; el.classList.add('palGo'); clearTimeout(palsStart.hide); palsStart.hide = setTimeout(() => el.classList.add('hide'), 8200)
  }
}
// what a move may hit: alive, not the landmark, at most cap wide, within R of (x, z)
function palNear(x, z, R, cap, only) {
  const out = new Set(), n = Math.ceil(R / CELL)
  for (let a = -n; a <= n; a++) for (let b = -n; b <= n; b++) for (const it of world.hash.get(hashKey(x + a * CELL, z + b * CELL)) || []) out.add(it)
  for (const it of world.movers) if (Math.abs(it.x - x) < R && Math.abs(it.z - z) < R) out.add(it)
  return [...out].filter((it) => it.alive && it.kind !== 'castle' && it.r <= cap && Math.hypot(it.x - x, it.z - z) < R + it.r * 0.3 && (!only || only(it)))
}
function palHit(it, color) { if (!it.alive) return; swallow(it, true); burst(it.x, it.z, 6, 0.6, color) }
function palSweep(x, z, R, cap, color) { for (const it of palNear(x, z, R, cap)) palHit(it, color) }
// effects: a beam line, a ring that grows, a wheel that rolls, a pillar, a wave band; each melts what it passes
const fxBeam = (color, opacity = 0.8) => { const m = new THREE.Mesh(beamOuter.geometry, glow(color, opacity)); m.renderOrder = 3; front.add(m); return m }
const addFx = (f) => { palFx.push(f); return f }
const later = (at, fn) => addFx({ kind: 'later', at, age: 0, life: at + 1, fn })
function ringFx(color) { const m = new THREE.Mesh(ring.geometry, glow(color, 0.9)); m.renderOrder = 2; front.add(m); return m }
function waveFx() { const m = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0), new THREE.MeshLambertMaterial({ color: 0x3fb6ff, transparent: true, opacity: 0.75, emissive: 0x1a6aa8 })); front.add(m); return m }
const heading = () => (Math.hypot(hole.vx, hole.vz) > 2 ? Math.atan2(hole.vz, hole.vx) : -Math.PI / 2)
function roll(R, cap, size, color, life) {
  const d = Math.hypot(hole.vx, hole.vz) > 2 ? Math.atan2(hole.vz, hole.vx) : Math.random() * Math.PI * 2
  const m = new THREE.Mesh(new THREE.TorusGeometry(size, size * 0.28, 8, 20), new THREE.MeshLambertMaterial({ color, emissive: color, emissiveIntensity: 0.25 })); front.add(m)
  addFx({ kind: 'roll', m, x: hole.x, z: hole.z, d, speed: (10 + R * 4) / life, size, life, age: 0, cap, color })
}
const P_A = new THREE.Vector3(), P_B = new THREE.Vector3()
const PAL_MOVES = [
  // 0 New York: the torch throws a line of fire ahead
  (p, R, cap) => {
    const len = 8 + R * 3.5, d = heading()
    addFx({ kind: 'line', m: fxBeam(0xff8a2a), from: p, life: 0.5, age: 0, tx: p.x + Math.cos(d) * len, tz: p.z + Math.sin(d) * len, r: 0.5 + R * 0.12 })
    for (let i = 1; i <= 6; i++) { const x = p.x + Math.cos(d) * len * i / 6, z = p.z + Math.sin(d) * len * i / 6; later(i * 0.06, () => { palSweep(x, z, 1.6 + R * 0.45, cap, 0xff7a2a); burst(x, z, 6, 0.8, 0xffb03a) }) }
  },
  // 1 London: the bell rings, a round shock wave
  (p, R, cap) => { addFx({ kind: 'ring', m: ringFx(0xffe9a8), x: hole.x, z: hole.z, to: 4 + R * 1.6, life: 0.7, age: 0, cap: cap * 0.8, color: 0xffd23f }); audio.play('levelup', 0.5, 1.6) },
  // 2 Paris: lightning jumps across three things
  (p, R, cap) => {
    const list = palNear(hole.x, hole.z, 9 + R * 3, cap).sort((a, b) => b.r - a.r).slice(0, 3); let from = { x: p.x, z: p.z, y: p.y }
    list.forEach((it, i) => { const a = from; later(i * 0.14, () => { addFx({ kind: 'line', m: fxBeam(0xfff6a0, 0.95), from: a, life: 0.25, age: 0, tx: it.x, tz: it.z, r: 0.18 + R * 0.04 }); palHit(it, 0xfff6a0); palSweep(it.x, it.z, 1 + R * 0.25, cap, 0xfff6a0); game.shake = Math.max(game.shake, 0.15) }); from = { x: it.x, z: it.z, y: 0.5 } })
  },
  // 3 Rome: a stone wheel rolls off
  (p, R, cap) => roll(R, cap, 1.2 + R * 0.35, 0xd8c6a0, 1.8),
  // 4 Cairo: a sand storm, everything around slows down and small things wear away
  (p, R, cap) => {
    const r = 6 + R * 2.2; addFx({ kind: 'storm', m: ringFx(0xe8c27a), x: hole.x, z: hole.z, to: r, life: 5, age: 0, tick: 0, cap: cap * 0.8 })
    for (const it of world.movers) if (it.alive && Math.hypot(it.x - hole.x, it.z - hole.z) < r * 1.5) it.slow = game.clock + 5
  },
  // 5 Tokyo: radio magnet, cars and buses get pulled into beams
  (p, R, cap) => { for (const it of palNear(hole.x, hole.z, 11 + R * 3, cap * 1.2, (x) => x.base === 'car' || x.base === 'bus').slice(0, 5)) { addFx({ kind: 'line', m: fxBeam(0x7fd8ff, 0.7), from: p, life: 0.35, age: 0, tx: it.x, tz: it.z, r: 0.15 + R * 0.03 }); palHit(it, 0x7fd8ff) } },
  // 6 Seoul: a light pillar circles the bot
  (p, R, cap) => addFx({ kind: 'pillar', m: fxBeam(0xc9a8ff, 0.7), life: 4.5, age: 0, r: 0.8 + R * 0.28, orbit: 3 + R * 1.3, cap }),
  // 7 Dubai: a laser from the sky slams the biggest thing near
  (p, R, cap) => {
    const it = palNear(hole.x, hole.z, 10 + R * 3, hole.r * PAL.bigCap).sort((a, b) => b.r - a.r)[0]; if (!it) return
    addFx({ kind: 'sky', m: fxBeam(0xffe7a0, 0.9), life: 0.45, age: 0, x: it.x, z: it.z, r: it.r * 0.6, fn: () => { palHit(it, 0xffd23f); palSweep(it.x, it.z, it.r + 1, cap, 0xffd23f); burst(it.x, it.z, 30, 1.6, 0xffe7a0); dustRing(it.x, it.z, it.r * 1.4); game.shake = Math.max(game.shake, 0.5); audio.play('huge', 0.7) } })
  },
  // 8 Las Vegas: the big wheel rolls off, wider than Rome's
  (p, R, cap) => roll(R, cap, 1.4 + R * 0.45, 0xff5da8, 1.8),
  // 9 Toronto: freezes what is around; frozen things break at one touch of a beam
  (p, R, cap) => {
    const r = 6 + R * 2; addFx({ kind: 'ring', m: ringFx(0xbff4ff), x: hole.x, z: hole.z, to: r, life: 0.6, age: 0, cap: 0, color: 0xbff4ff })
    for (const it of palNear(hole.x, hole.z, r, hole.r * PAL.freezeCap)) { it.frozen = game.clock + 8; burst(it.x, it.z, 4, 0.5, 0xbff4ff) }
  },
  // 10 Nice: one wave sweeps across in front
  (p, R, cap) => addFx({ kind: 'wave', m: waveFx(), life: 1.2, age: 0, x0: hole.x - (10 + R * 3), x1: hole.x + 10 + R * 3, z: hole.z - (3 + R), w: 4 + R * 1.2, cap }),
]
function updatePals(dt) {
  const R = hole.r, cap = Math.max(1.2, R * PAL.cap)
  for (const p of pals) {
    p.ang += dt * 0.6
    const orbit = 3 + R * 1.15, gx = hole.x + Math.cos(p.ang) * orbit, gz = hole.z + Math.sin(p.ang) * orbit * 0.6 + 1
    p.x = lerp(p.x, gx, clamp(dt * 4, 0, 1)); p.z = lerp(p.z, gz, clamp(dt * 4, 0, 1)); p.y = 3 + R * 0.9
    p.cd -= dt; p.pop = Math.max(0, p.pop - dt * 2.5)
    if (p.cd <= 0 && game.state === 'run') { p.cd = PAL.every[p.t] ?? 8; p.pop = 1; PAL_MOVES[p.t]?.(p, R, cap); if (game.stats) game.stats.pal = (game.stats.pal || 0) + 1 }
  }
  for (let i = palFx.length - 1; i >= 0; i--) {
    const f = palFx[i]; f.age += dt
    if (f.kind === 'later') { if (f.age >= f.at) { palFx.splice(i, 1); f.fn() } continue }
    const k = clamp(f.age / f.life, 0, 1)
    if (f.kind === 'ring') {
      f.m.position.set(f.x, 0.12, f.z); f.m.scale.setScalar(f.to * (0.15 + 0.85 * k)); f.m.material.opacity = 0.9 * (1 - k)
      if (f.cap && !f.done && k > 0.5) { f.done = true; palSweep(f.x, f.z, f.to, f.cap, f.color); game.shake = Math.max(game.shake, 0.3) }
    } else if (f.kind === 'storm') {
      f.x = hole.x; f.z = hole.z; f.m.position.set(f.x, 0.15, f.z); f.m.scale.setScalar(f.to * (0.9 + Math.sin(f.age * 9) * 0.08)); f.m.material.opacity = 0.7 * Math.min(1, (1 - k) * 4)
      f.tick -= dt
      if (f.tick <= 0) { f.tick = 0.35; const it = palNear(f.x, f.z, f.to, f.cap)[0]; if (it) palHit(it, 0xe8c27a); for (let j = 0; j < 4; j++) { const a = Math.random() * 6.28; burst(f.x + Math.cos(a) * f.to, f.z + Math.sin(a) * f.to, 2, 0.6, 0xe8c27a, 1.2) } }
    } else if (f.kind === 'line') {
      P_A.set(f.from.x, f.from.y ?? 3, f.from.z); P_B.set(f.tx, 0.3, f.tz); aimBeam(f.m, P_A, P_B, f.r * (1 - k * 0.6)); f.m.material.opacity = 0.9 * (1 - k)
    } else if (f.kind === 'roll') {
      f.x += Math.cos(f.d) * f.speed * dt; f.z += Math.sin(f.d) * f.speed * dt
      f.m.position.set(f.x, f.size * 1.28, f.z); f.m.rotation.set(0, -f.d + Math.PI / 2, 0); f.m.rotateZ(-f.age * f.speed / f.size)
      palSweep(f.x, f.z, f.size * 1.2, f.cap, f.color)
    } else if (f.kind === 'pillar') {
      const a = f.age * 2.6, x = hole.x + Math.cos(a) * f.orbit, z = hole.z + Math.sin(a) * f.orbit
      P_A.set(x, 30, z); P_B.set(x, 0, z); aimBeam(f.m, P_A, P_B, f.r); f.m.material.opacity = 0.75 * Math.min(1, (1 - k) * 5)
      palSweep(x, z, f.r * 1.4, f.cap, 0xc9a8ff)
    } else if (f.kind === 'sky') {
      P_A.set(f.x, 40, f.z); P_B.set(f.x, 0, f.z); aimBeam(f.m, P_A, P_B, f.r * (0.3 + k)); if (k >= 1 && f.fn) { f.fn(); f.fn = null }
    } else if (f.kind === 'wave') {
      const x = lerp(f.x0, f.x1, k); f.m.position.set(x, 0, f.z); f.m.scale.set(1.6, 1.4 + Math.sin(k * Math.PI) * 1.2, f.w)
      palSweep(x, f.z, f.w * 0.5, f.cap, 0x7fd8ff); if (Math.random() < 0.5) burst(x, f.z + rnd(-1, 1) * f.w * 0.5, 2, 0.5, 0xffffff, 1.5)
    }
    if (f.age >= f.life) { front.remove(f.m); if (f.m.geometry !== ring.geometry && f.m.geometry !== beamOuter.geometry) f.m.geometry.dispose(); f.m.material.dispose(); palFx.splice(i, 1) }
  }
}
function drawPals(now) {
  for (const p of pals) {
    const s = 2.2 + hole.r * 0.5, bob = Math.sin(now * 0.003 + p.ang * 3) * 0.25
    p.g.position.set(p.x, p.y + bob, p.z); p.body.scale.setScalar(s * 1.5 * (1 + p.pop * 0.25)); p.body.rotation.y = now * 0.0008
    p.halo.scale.setScalar(s * (1 + Math.sin(now * 0.006) * 0.06 + p.pop * 0.4)); p.disc.scale.setScalar(s)
  }
}
// ---------------------------------------------------------------- surprises (2026-11-26 사용자 "예", gamedev-kit/research/portal/2026-11-26_destruction_variety.md)
// Rampage's windows: now and then a melted building holds something. Good (a bag of gold, +5 s), bad (the laser goes weak
// for a moment) or risky (an army drives in and fires: melt all of it in time for big gold). 5-8 a run; the first run 3-4, good only.
const SURP = { n: [5, 8], first: [3, 4], from: 5, gold: [10, 0.25], time: 5, weak: 4, weakMelt: 0.4, odds: [['gold', 35], ['time', 20], ['weak', 20], ['army', 25]] }
const ARMY = { n: 4, secs: 12, gold: [40, 1], shot: 1.8, hit: 1.5 }
const SURP_ICON = { gold: '💰', time: '⏱️', weak: '💤', army: '🚨', win: '🏆' }
const surpOn = () => !RENDER || Q.has('fx') // video tools keep their old runs unless &fx
const goldUp = () => 1 + save.up.gold * 0.1
const weighted = (list) => { let s = list.reduce((a, x) => a + x[1], 0) * Math.random(); for (const [k, w] of list) if ((s -= w) < 0) return k; return list[0][0] }
const irand = (a, b) => a + Math.floor(Math.random() * (b - a + 1))
const tanks = [], fxChip = { els: {} }
let army = null, tankGeo = null
const SEEN = new THREE.Vector3()
const onScreen = (x, z, y = 0, m = 0.85) => { SEEN.set(x, y, z).project(camera); return Math.abs(SEEN.x) < m && Math.abs(SEEN.y) < m && SEEN.z < 1 }
function surprisesStart() {
  surprisesOff()
  const n = surpOn() ? irand(...(save.runs === 0 ? SURP.first : SURP.n)) : 0
  game.surp = { left: n, next: SURP.from, gap: (game.total - SURP.from - 8) / Math.max(1, n), gold: 0, log: [] }
}
function surprisesOff() {
  for (const t of tanks) front.remove(t.g)
  tanks.length = 0; army = null
  $('fxChips').innerHTML = ''; fxChip.els = {}
}
// an icon (and a number) jumps out of the spot and floats up
function popIcon(icon, text, x, z, y, kind) {
  SEEN.set(x, y, z).project(camera)
  const el = document.createElement('div'); el.className = `surp ${kind}`
  el.innerHTML = `<i>${icon}</i>${text ? `<b>${text}</b>` : ''}`
  el.style.left = `${clamp((SEEN.x * 0.5 + 0.5) * 100, 10, 90)}%`; el.style.top = `${clamp((-SEEN.y * 0.5 + 0.5) * 100, 18, 86)}%`
  $('float').appendChild(el); setTimeout(() => el.remove(), 1600)
}
// a building that just melted: when the next surprise is due and the spot is on screen, this one holds it
function trySurprise(item, force) {
  const s = game.surp
  if (!force && (!s || s.left <= 0 || game.clock < s.next || game.time < 5 || game.state !== 'run' || !onScreen(item.x, item.z))) return
  s.left--; s.next = game.clock + s.gap * rnd(0.75, 1.15)
  let kind = force || weighted(save.runs === 0 ? SURP.odds.slice(0, 2) : SURP.odds)
  if (kind === 'army' && (army || game.time < ARMY.secs + 3)) kind = 'gold'
  s.log.push(kind)
  const y = Math.min(8, (world.kinds[item.kind].h || 3) * 0.6), size = clamp(item.r / 4, 0.8, 2)
  if (kind === 'gold') {
    const g = Math.round((SURP.gold[0] + SURP.gold[1] * cityGold(save.town)) * goldUp()); s.gold += g
    popIcon(SURP_ICON.gold, `+${g}`, item.x, item.z, y, 'gold')
    burst(item.x, item.z, 34, size, 0xffd23a, y); audio.play('buy', 0.8, 1.1)
  } else if (kind === 'time') {
    game.time += SURP.time
    popIcon(SURP_ICON.time, `+${SURP.time}`, item.x, item.z, y, 'time')
    burst(item.x, item.z, 30, size, 0x5fd8ff, y); audio.play('levelup', 0.6, 1.35)
    const el = $('time'); el.classList.remove('plus'); void el.offsetWidth; el.classList.add('plus')
  } else if (kind === 'weak') {
    game.weakT = game.clock + SURP.weak
    popIcon(SURP_ICON.weak, '', item.x, item.z, y, 'weak')
    smoke(item.x, item.z, 12, clamp(item.r * 0.5, 1.3, 3), y, item.r * 0.6); audio.play('deny', 0.8, 0.8)
  } else armyStart(item, y)
}
function tankMesh(s) {
  if (!tankGeo) tankGeo = {
    track: new THREE.BoxGeometry(1.7, 0.36, 2.2).translate(0, 0.18, 0), body: new THREE.BoxGeometry(1.4, 0.5, 1.9).translate(0, 0.6, 0),
    turret: new THREE.BoxGeometry(0.9, 0.42, 0.95).translate(0, 1.05, -0.05), gun: new THREE.CylinderGeometry(0.1, 0.1, 1.3, 8).rotateX(Math.PI / 2).translate(0, 1.07, 0.95),
    mark: new THREE.RingGeometry(0.8, 1, 32).rotateX(-Math.PI / 2),
    mat: new THREE.MeshLambertMaterial({ color: 0x6f8236, emissive: 0x2a3310, emissiveIntensity: 0.5 }), dark: new THREE.MeshLambertMaterial({ color: 0x3a4420 }), red: glow(0xff3344, 0.9),
  }
  const G = tankGeo, g = new THREE.Group(), mark = new THREE.Mesh(G.mark, G.red)
  g.add(new THREE.Mesh(G.track, G.dark), new THREE.Mesh(G.body, G.mat), new THREE.Mesh(G.turret, G.mat), new THREE.Mesh(G.gun, G.dark), mark)
  mark.scale.setScalar(1.7); mark.position.y = 0.05; mark.renderOrder = 2
  g.scale.setScalar(s)
  return g
}
// four tanks roll in from up the street, stop a little away and fire at the robot (each hit: the laser goes weak 1.5 s)
function armyStart(item, y) {
  army = { left: ARMY.secs, gold: Math.round((ARMY.gold[0] + ARMY.gold[1] * cityGold(save.town)) * goldUp()) }
  const s = clamp(0.9 + hole.r * 0.32, 1, 4.5), up = 8 + hole.r * 2.2, side = Math.min(2.4 + hole.r * 0.7, 8)
  for (let i = 0; i < ARMY.n; i++) {
    const g = tankMesh(s); front.add(g)
    const x = clamp(hole.x + (i - (ARMY.n - 1) / 2) * side, -WORLD + 3, WORLD - 3), z = clamp(hole.z - up - (i % 2) * s * 1.6, -WORLD + 3, WORLD - 3)
    tanks.push({ g, x, z, s, cd: 2.2 + i * 0.5, alive: true, yaw: 0, age: 0, slot: -Math.PI / 2 + (i - (ARMY.n - 1) / 2) * 0.75 }) // each its own place in a fan above the robot
    burst(x, z, 10, 0.8, 0x9aa060)
  }
  popIcon(SURP_ICON.army, '', item.x, item.z, y, 'army')
  audio.play('deny', 0.9, 0.6); game.shake = Math.max(game.shake, 0.3)
}
function tankDown(t) {
  t.alive = false; front.remove(t.g)
  burst(t.x, t.z, 26, clamp(t.s * 0.6, 0.7, 2.2), 0x6f8236); burst(t.x, t.z, 12, clamp(t.s * 0.5, 0.6, 2), 0xffb03a, 1)
  smoke(t.x, t.z, 10, clamp(t.s, 1.2, 3), 0.6, t.s); dustRing(t.x, t.z, t.s * 1.6)
  audio.play('big', 0.9, rnd(1, 1.15)); game.shake = Math.max(game.shake, 0.3)
}
function updateArmy(dt) {
  if (!army) return
  army.left -= dt
  const R = hole.r * (hole.boost || 1), stand = 4.5 + hole.r * 1.5
  let alive = 0
  for (const t of tanks) {
    if (!t.alive) continue
    t.age += dt
    const dx = hole.x - t.x, dz = hole.z - t.z, d = Math.hypot(dx, dz) || 1
    if (d < R + t.s * 0.5) { tankDown(t); continue }
    alive++
    const gx = hole.x + Math.cos(t.slot) * stand - t.x, gz = hole.z + Math.sin(t.slot) * stand - t.z, gd = Math.hypot(gx, gz)
    if (gd > 0.3) { const sp = Math.min(gd, (2.6 + hole.r * 0.4) * dt); t.x += gx / gd * sp; t.z += gz / gd * sp }
    t.yaw = Math.atan2(dx, dz); t.cd -= dt
    if (t.cd <= 0 && d < stand + 10) {
      t.cd = ARMY.shot * rnd(0.85, 1.15)
      const mx = t.x + Math.sin(t.yaw) * t.s * 1.5, mz = t.z + Math.cos(t.yaw) * t.s * 1.5
      addFx({ kind: 'line', m: fxBeam(0xff4a3a, 0.95), from: { x: mx, y: t.s * 1.07, z: mz }, life: 0.22, age: 0, tx: hole.x, tz: hole.z, r: 0.18 + t.s * 0.06 })
      game.weakT = Math.max(game.weakT, game.clock + ARMY.hit)
      burst(hole.x, hole.z, 8, 0.7, 0xff5a3a, 1); burst(mx, mz, 4, 0.5, 0xffd080, t.s); game.shake = Math.max(game.shake, 0.22); audio.play('crunch', 0.7, 0.7)
    }
  }
  if (!alive) { // all melted: the big prize
    game.surp.gold += army.gold; game.surp.log.push('win')
    popIcon(SURP_ICON.win, `+${army.gold}`, hole.x, hole.z, 3, 'win')
    burst(hole.x, hole.z, 70, clamp(hole.r / 4, 1, 2.4), 0xffd23a, 1.5); burst(hole.x, hole.z, 20, 1, 0xffffff, 2.5)
    pulseAge = 0; game.punch = Math.max(game.punch, 0.6); audio.play('levelup', 1, 1.1); audio.play('buy', 0.9)
    tanks.length = 0; army = null
  } else if (army.left <= 0) { // time's up: they drive off in a puff
    for (const t of tanks) if (t.alive) { smoke(t.x, t.z, 8, clamp(t.s, 1.2, 3), 0.6, t.s); front.remove(t.g) }
    tanks.length = 0; army = null
  }
}
function updateSurprises(dt) {
  game.meltK = game.weakT > game.clock ? SURP.weakMelt : 1
  updateArmy(dt); updateDrops(dt)
}
function drawSurprises(now) {
  for (const t of tanks) {
    const k = Math.min(1, t.age / 0.4)
    t.g.position.set(t.x, Math.sin(now * 0.02 + t.cd) * 0.04 * t.s, t.z); t.g.rotation.y = t.yaw; t.g.scale.setScalar(t.s * (0.3 + 0.7 * k))
  }
  if (tankGeo) tankGeo.red.opacity = 0.55 + Math.sin(now * 0.015) * 0.4
}
// chips on the right while something lasts: icon, a bar running down, a count
function fxChips() {
  const want = {}
  if (game.weakT > game.clock) want.weak = [SURP_ICON.weak, (game.weakT - game.clock) / SURP.weak, '']
  for (const k of ['thick', 'zap', 'slow']) if (game[k + 'T'] > game.clock) want[k] = [DROP_ICON[k], (game[k + 'T'] - game.clock) / DROP[k][0], '']
  if (army) want.army = [SURP_ICON.army, army.left / ARMY.secs, `${tanks.filter((t) => t.alive).length}`]
  const host = $('fxChips')
  for (const k in fxChip.els) if (!want[k]) { fxChip.els[k].remove(); delete fxChip.els[k] }
  for (const k in want) {
    let el = fxChip.els[k]
    if (!el) { el = document.createElement('div'); el.className = `fx ${k}`; el.innerHTML = '<i></i><b></b><u></u>'; el.firstChild.textContent = want[k][0]; host.appendChild(el); fxChip.els[k] = el }
    el.style.setProperty('--p', clamp(want[k][1], 0, 1).toFixed(3))
    const b = el.children[1]; if (b.textContent !== want[k][2]) b.textContent = want[k][2]
  }
}
// ---------------------------------------------------------------- drops (11-26, Hole.io / Holey.io: boosters fall on the map, the shrink sign is a trap)
// 2-4 a run (first run 2, never the trap): the landing spot glows 1 s ahead, then the thing falls there and waits 12 s.
// Thick laser (8 s, melts 1.35x wider), chain lightning (8 s, each melt zaps two things near it), slow trap (4 s at 0.45x speed).
const DROP = { n: [2, 4], first: 2, warn: 1, life: 12, odds: [['thick', 40], ['zap', 35], ['slow', 25]], thick: [8, 1.35], zap: [8, 2, 6], slow: [4, 0.45] }
const DROP_ICON = { thick: '🔆', zap: '⚡', slow: '🐌' }
const DROP_COLOR = { thick: 0xff8a1a, zap: 0x5fd8ff, slow: 0xa05cff }
const drops = []
let dropGeo = null
function dropsStart() {
  dropsOff()
  const m = surpOn() ? (save.runs === 0 ? DROP.first : irand(...DROP.n)) : 0, span = game.total - 18
  game.dropAt = Array.from({ length: m }, (_, i) => 8 + span * (i + rnd(0.25, 0.75)) / m)
  Object.assign(game, { thickT: 0, zapT: 0, slowT: 0, zapN: 0, zapReset: 0, drops: [] }); hole.boost = strike.boost = 1
}
function dropsOff() { for (const d of drops) { front.remove(d.g); d.tag.remove() } drops.length = 0 }
function dropMesh(kind) {
  if (!dropGeo) dropGeo = {
    gem: new THREE.OctahedronGeometry(0.75), blob: new THREE.SphereGeometry(0.55, 12, 8), goo: new THREE.CircleGeometry(1, 28).rotateX(-Math.PI / 2),
    mark: new THREE.RingGeometry(0.85, 1, 40).rotateX(-Math.PI / 2), pillar: new THREE.CylinderGeometry(0.1, 0.1, 1, 8).translate(0, 0.5, 0),
  }
  const c = DROP_COLOR[kind], G = dropGeo, g = new THREE.Group()
  const body = new THREE.Mesh(kind === 'slow' ? G.blob : G.gem, new THREE.MeshLambertMaterial({ color: c, emissive: c, emissiveIntensity: 0.6 }))
  const mark = new THREE.Mesh(G.mark, glow(c, 0.9)), pillar = new THREE.Mesh(G.pillar, glow(c, 0.5))
  mark.renderOrder = pillar.renderOrder = 2; g.add(body, mark, pillar)
  if (kind === 'slow') { const goo = new THREE.Mesh(G.goo, glow(c, 0.45)); goo.position.y = 0.04; goo.renderOrder = 2; g.add(goo) }
  return { g, body, mark, pillar }
}
// ahead of the robot and on screen
function dropStart() {
  const kind = weighted(save.runs === 0 ? DROP.odds.slice(0, 2) : DROP.odds), s = clamp(1 + hole.r * 0.28, 1.2, 3.6), h = heading()
  let x = hole.x + 4 + hole.r * 1.5, z = hole.z + 2
  for (let i = 0; i < 14; i++) {
    const a = h + rnd(-1, 1) * (0.6 + i * 0.2), d = (6 + hole.r * 1.8) * rnd(0.8, 1.2) * (1 - i * 0.04)
    const cx = clamp(hole.x + Math.cos(a) * d, -WORLD + 4, WORLD - 4), cz = clamp(hole.z + Math.sin(a) * d, -WORLD + 4, WORLD - 4)
    const underBot = Math.abs(cx - hole.x) < 3 + hole.r * 1.2 && cz < hole.z // the robot floats above the spot and would hide it
    if (!underBot && onScreen(cx, cz, 0, 0.7)) { x = cx; z = cz; break }
  }
  const m = dropMesh(kind); front.add(m.g); m.g.position.set(x, 0, z); m.g.scale.setScalar(s)
  const tag = document.createElement('div'); tag.className = `dropTag ${kind}`; tag.textContent = DROP_ICON[kind]; $('float').appendChild(tag)
  drops.push({ kind, ...m, x, z, s, age: 0, landed: false, tag })
  audio.play('click', 0.5, 0.7)
}
function takeDrop(d) {
  const k = d.kind; game.drops.push(k)
  if (k === 'thick') game.thickT = game.clock + DROP.thick[0]
  else if (k === 'zap') game.zapT = game.clock + DROP.zap[0]
  else game.slowT = game.clock + DROP.slow[0]
  popIcon(DROP_ICON[k], '', d.x, d.z, 2, `drop ${k}`)
  burst(d.x, d.z, 36, clamp(d.s * 0.6, 0.8, 2), DROP_COLOR[k], 1); dustRing(d.x, d.z, d.s * 1.4)
  if (k === 'slow') { smoke(d.x, d.z, 10, clamp(d.s, 1.2, 3), 0.4, d.s); audio.play('deny', 0.8, 0.7) }
  else { pulseAge = 0; audio.play('levelup', 0.8, k === 'zap' ? 1.5 : 1.2) }
}
function updateDrops(dt) {
  while (game.dropAt?.length && game.clock >= game.dropAt[0]) { game.dropAt.shift(); if (game.time > 6) dropStart() }
  hole.boost = strike.boost = lerp(hole.boost || 1, game.thickT > game.clock ? DROP.thick[1] : 1, clamp(dt * 6, 0, 1))
  if (game.slowT > game.clock && Math.random() < dt * 14) burst(hole.x + rnd(-1, 1) * hole.r, hole.z + rnd(-1, 1) * hole.r, 2, 0.6, DROP_COLOR.slow, 0.3)
  if (game.zapT > game.clock && Math.random() < dt * 10) burst(hole.x + rnd(-1, 1) * hole.r, hole.z + rnd(-1, 1) * hole.r, 2, 0.5, 0x9fe8ff, 1.2)
  const R = hole.r * hole.boost
  for (let i = drops.length - 1; i >= 0; i--) {
    const d = drops[i]; d.age += dt
    if (!d.landed && d.age >= DROP.warn) { d.landed = true; burst(d.x, d.z, 14, clamp(d.s * 0.5, 0.6, 1.6), DROP_COLOR[d.kind], 0.5); dustRing(d.x, d.z, d.s * 1.2); game.shake = Math.max(game.shake, 0.12); audio.play('crunch', 0.6, 0.8) }
    const gone = d.age >= DROP.warn + DROP.life, got = d.landed && Math.hypot(hole.x - d.x, hole.z - d.z) < R + d.s * 0.8
    if (got) takeDrop(d)
    if (got || gone) { front.remove(d.g); d.tag.remove(); drops.splice(i, 1) }
  }
}
// chain lightning: a melt zaps up to two things near it (at most 6 zaps each half second)
function zapFrom(item) {
  if (game.clock > game.zapReset) { game.zapReset = game.clock + 0.5; game.zapN = 0 }
  if (game.zapN >= 6) return
  const R = hole.r, cap = Math.max(1.2, R * PAL.cap)
  for (const it of palNear(item.x, item.z, DROP.zap[2] + R, cap).filter((x) => x !== item).slice(0, DROP.zap[1])) {
    game.zapN++
    addFx({ kind: 'line', m: fxBeam(0x9fe8ff, 0.95), from: { x: item.x, y: 1.5, z: item.z }, life: 0.3, age: 0, tx: it.x, tz: it.z, r: 0.2 + R * 0.05 })
    later(0.06, () => palHit(it, 0x9fe8ff))
  }
}
function drawDrops(now) {
  for (const d of drops) {
    const k = clamp(d.age / DROP.warn, 0, 1), left = DROP.warn + DROP.life - d.age
    d.mark.scale.setScalar(d.landed ? 1.25 + Math.sin(now * 0.008) * 0.12 : 2.6 - 1.4 * k); d.mark.material.opacity = d.landed ? 0.8 : 0.4 + 0.5 * Math.abs(Math.sin(now * 0.02))
    d.body.position.y = d.landed ? (d.kind === 'slow' ? 0.4 : 1.2 + Math.sin(now * 0.005) * 0.2) : 1.2 + 22 / d.s * (1 - k * k); d.body.rotation.y = now * 0.003
    d.pillar.visible = d.landed; d.pillar.scale.set(1, 14, 1)
    d.g.visible = left > 3 || Math.floor(now / 120) % 2 === 0
    SEEN.set(d.x, (d.body.position.y + 1.6) * d.s, d.z).project(camera)
    const on = d.landed && d.g.visible && Math.abs(SEEN.x) < 1 && Math.abs(SEEN.y) < 1
    d.tag.style.display = on ? '' : 'none'
    if (on) { d.tag.style.left = `${(SEEN.x * 0.5 + 0.5) * 100}%`; d.tag.style.top = `${(-SEEN.y * 0.5 + 0.5) * 100}%` }
  }
}
const ARROW_P = new THREE.Vector3()
// 11-21 (third "드론이 안 보여"): a big green arrow over the drone the whole time it flies; off screen it waits at the edge, pointing at it
function droneArrow(h) {
  const el = $('droneArrow')
  if (!el) return
  if (!drone.on || game.state !== 'run') { if (!el.classList.contains('hide')) el.classList.add('hide'); return }
  ARROW_P.set(drone.x, h + 1.1 * (0.95 + drone.r * 0.26) * 1.7, drone.z - h * 0.25).project(camera)
  let x = (ARROW_P.x + 1) / 2 * innerWidth, y = (1 - ARROW_P.y) / 2 * innerHeight
  const m = 46, inside = ARROW_P.z < 1 && x > m && x < innerWidth - m && y > m + 60 && y < innerHeight - m
  let ang = 0
  if (!inside) {
    const cx = innerWidth / 2, cy = innerHeight / 2, dx = x - cx, dy = y - cy
    const k = Math.min((innerWidth / 2 - m) / Math.max(1e-3, Math.abs(dx)), (innerHeight / 2 - m) / Math.max(1e-3, Math.abs(dy)))
    x = cx + dx * k; y = cy + dy * k; ang = Math.atan2(dy, dx) * 180 / Math.PI - 90
  }
  el.classList.remove('hide'); el.classList.toggle('edge', !inside)
  el.style.transform = `translate(${x}px, ${y}px) rotate(${ang}deg)`
}
function drawDrone(now) {
  if (!drone.on) { droneArrow(0); return }
  const h = 4 + drone.r * 1.6, s = (0.95 + drone.r * 0.26) * 1.7 * (1 + (drone.intro || 0) * 0.25) // as big as the android, so it reads at a glance
  drone.group.position.set(drone.x, h + Math.sin(now * 0.004) * 0.3, drone.z - h * 0.25)
  drone.group.scale.setScalar(s); drone.group.rotation.y = now * 0.003
  drone.group.children.forEach((c) => { if (c.userData.light !== undefined) c.visible = Math.floor(now / 120 + c.userData.light) % 3 !== 0 })
  const blink = drone.left < 3 ? (Math.floor(now / 150) % 2 ? 0.25 : 1) : 1
  DRONE_FROM.set(drone.x, h - 0.15 * s, drone.z - h * 0.25); DRONE_TO.set(drone.x, drone.blockY > 0.5 ? drone.blockY : 0.05, drone.z)
  aimBeam(drone.beam, DRONE_FROM, DRONE_TO, drone.r * 0.38); drone.beam.material.opacity = (0.4 + Math.sin(now * 0.05) * 0.08) * blink
  for (const m of [drone.ring, drone.spot]) { m.position.set(drone.x, DRONE_TO.y + 0.07, drone.z); m.scale.setScalar(drone.r) }
  drone.ring.material.opacity = 0.95 * blink
  droneArrow(h)
}
function eat(item, dt, src = hole) {
  // Toronto drone: a frozen thing breaks at the first touch of any beam (up to PAL.freezeCap x the beam)
  if (item.frozen > game.clock && Math.hypot(src.x - item.x, src.z - item.z) < src.r + item.r * 0.6) { item.frozen = 0; swallow(item, true); burst(item.x, item.z, 10, 0.7, 0xbff4ff); return true }
  // the meteor's impact reaches wider than the mark (spread): it lands 1 s late and misses what moved; what may melt still goes by size
  const dx = src.x - item.x, dz = src.z - item.z, d = Math.hypot(dx, dz) / (src.spread || 1), R = src.r * (src.boost || 1)
  const reach = R + item.r * 0.1
  // Things up to BIG_CHIP times the beam's width melt too when the beam is held on them, slower the bigger they are
  // (a house twice the beam takes about 3 s), throwing off sparks and bits while they heat.
  const ratio = item.r / R, small = ratio < 0.98, chip = chipLimit(item)
  if (ratio < chip && (small ? d < R - item.r * 0.15 : d < item.r * 0.7)) {
    // the start house (clearStart) falls after about 0.3 s under the beam, so it goes even when the player moves off at once
    // first run: the landmark melts at most 2x slower however big it is, so it can fall in the 60 s (2026-11-25)
    const slow = item.first ? 2 : small ? 1 : Math.min(item.kind === 'castle' && save.runs === 0 ? 2 : 1e9, 1 + 25 * (ratio - 1) * (ratio - 1))
    item.heat = (item.heat || 0) + dt * meltSpeed() * (src.melt || 1) * (src === hole || src === strike ? game.meltK ?? 1 : 1) / (0.02 + item.r * item.r * 0.012) / slow
    if (!small && Math.random() < dt * 10) { burst(item.x + rnd(-1, 1) * item.r * 0.4, item.z + rnd(-1, 1) * item.r * 0.4, 2, 0.5, Math.random() < 0.5 ? 0xffb03a : world.kinds[item.kind].avg); if (Math.random() < 0.3) audio.play('crunch', 0.35, rnd(1.2, 1.5)) }
    if (item.heat >= 1 || item.r < 0.9) { swallow(item); return }
    glowItem(item, item.heat); game.heatT = 0.12
    if (src === hole && octoOn()) octoGrab.push(item)
    const shiver = Math.sin(performance.now() * 0.06 + item.id) * 0.05 * item.heat
    place(item, shiver, 1, 0); item.wobble = 1; item.touchT = game.tickN; item.touchBy = src; return true
  }
  // no suction (that was Gulp's hole): a thing at the edge of the beam just warms up and trembles
  if (item.r < R * chip && d < R + item.r && item.axis === undefined) {
    const shiver = Math.sin(performance.now() * 0.05 + item.id * 1.7) * 0.04
    place(item, shiver, 1, 0.3); item.wobble = 1; item.touchT = game.tickN; item.touchBy = src; return true
  }
  // Too strong to melt yet: it does not move or glow at all; the beam glances off it in pale blue sparks with a faint tick,
  // so the player sees "not yet" without any words (user 2026-11-05: things that cannot break must not shake).
  if (item.r >= R * chip && d < item.r * 0.7 && item.axis === undefined) {
    const top = (world.kinds[item.kind].h || 1) * 0.97
    if (top > src.blockY) src.blockY = top
    if (Math.random() < 0.3) { burst(src.x + rnd(-0.4, 0.4) * R, src.z + rnd(-0.4, 0.4) * R, 2, 0.4, pick([0xbfefff, 0xffffff, 0x7fd8ff]), top + 0.3); if (Math.random() < 0.08) audio.play('click', 0.25, rnd(1.6, 2)) }
    return false
  }
  // the other beam (bot or drone) still holds it: leave its heat alone (the hole runs first in a tick, the drone after)
  if (item.wobble && item.touchBy !== src && item.touchT >= game.tickN - (src.main ? 1 : 0)) return false
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
  if (heat > 0.05 && item.r >= 1.4) { heatShell(item, heat); if (Math.random() < 0.2 + heat * 0.35) smoke(item.x + rnd(-0.5, 0.5) * item.r, item.z + rnd(-0.5, 0.5) * item.r, 1, clamp(item.r * 0.5, 0.9, 2.4), (world.kinds[item.kind].h || 1) * 0.8) }
  const kind = world.kinds[item.kind], mesh = world.meshes[item.kind]
  BASE.set(kind.tint && item.color !== null ? item.color : WHITE)
  mesh.setColorAt(item.index, BASE.lerp(HOT, clamp(heat, 0, 1) * 0.75)); mesh.instanceColor.needsUpdate = true
}

function updateWorld(dt) {
  hole.blockShown = lerp(hole.blockShown || 0, hole.blockY || 0, clamp(dt * 14, 0, 1)); hole.blockY = 0
  octoGrab.length = 0
  const src = mainSrc(); if (src === strike) { moveStrike(dt); updateMeteors(dt); strike.blockY = 0 }
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
    item.along += item.dir * item.speed * (item.panic > 0 ? (item.base === 'person' ? 1.5 : 1.25) : 1) * (item.slow > game.clock ? 0.2 : 1) * dt
    // a road that runs off the map wraps around; one that ends in the city (park, waterfront) makes a U-turn
    const road = item.road, open = road.a <= -WORLD && road.b >= WORLD
    if (item.along > road.b + (open ? 4 : 0)) { if (open) item.along = road.a - 4; else { item.along = road.b; item.dir = -1; item.lane = 2 * road.at - item.lane } }
    if (item.along < road.a - (open ? 4 : 0)) { if (open) item.along = road.b + 4; else { item.along = road.a; item.dir = 1; item.lane = 2 * road.at - item.lane } }
    placeMover(item)
    eat(item, dt, src)
    if (drone.on && Math.abs(item.x - drone.x) < drone.r + item.r && Math.abs(item.z - drone.z) < drone.r + item.r) eat(item, dt, drone)
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
    const bucket = world.hash.get(hashKey(src.x + a * CELL, src.z + b * CELL))
    if (!bucket) continue
    for (const item of bucket) if (item.alive && eat(item, dt, src)) touched = true
  }
  if (drone.on) updateDrone(dt, () => { touched = true })
  if (pals.length || palFx.length) updatePals(dt)
  if (touched) { for (const name in world.meshes) world.meshes[name].instanceMatrix.needsUpdate = true; world.shadow.instanceMatrix.needsUpdate = true }
  world.moving.instanceMatrix.needsUpdate = true
}

function updateFallers(dt) {
  for (const f of fallers) {
    if (!f.item) continue
    f.age += dt
    // Melting: it glows, sags and sinks into a puddle; a big one also throws chunks (breakApart) and leans as it goes.
    const p = clamp(f.age / f.life, 0, 1), item = f.item, kind = world.kinds[item.kind], h = kind.h || 1
    if (f.throw) {
      const mesh = f.up, q = p * p * (3 - 2 * p), top = 6 + item.r * 1.5 + (f.far ? 10 : 0)
      mesh.position.set(item.x + (f.tx - item.x) * q, Math.sin(p * Math.PI) * top + (1 - p) * (item.y || 0), item.z + (f.tz - item.z) * q)
      mesh.quaternion.setFromAxisAngle(AXIS.set(Math.cos(item.rot), 0, Math.sin(item.rot)), p * (item.r < 3 ? 9 : 3)); mesh.scale.setScalar(1 - p * 0.35); mesh.material.emissiveIntensity = 0.2 + p * 0.6
      if (p >= 1) { // lands and breaks (Chain blast: more bits)
        const big = item.r >= 3 || f.far
        burst(f.tx, f.tz, big ? 16 + (save.up.blast || 0) : 5, clamp(item.r / 4, 0.5, 1.8), world.kinds[item.kind].avg); dustRing(f.tx, f.tz, Math.max(1.5, item.r))
        if (big) { game.shake = Math.max(game.shake, f.far ? 0.5 : 0.25); audio.play('big', 0.6, rnd(0.9, 1.1)) }
        clearFaller(f)
      }
      continue
    }
    if (f.lift) { // a person floats up the beam, unhurt, and vanishes into the android; with the UFO everything goes up whole
      const mesh = f.up, q = f.ufo ? p * p : p, tx = f.ufo ? bot.position.x : hole.x, tz = f.ufo ? bot.position.z : hole.z, k = f.ufo ? 1 : 0.6
      mesh.position.set(item.x + (tx - item.x) * q * k, q * (f.ufo ? bot.position.y : 9), item.z + (tz - item.z) * q * k)
      mesh.quaternion.setFromAxisAngle(UP, item.rot + p * (f.ufo ? 3 : 9)); mesh.scale.setScalar(1 - p * (f.ufo ? 0.85 : 0.75)); mesh.material.emissiveIntensity = 0.6 + p
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
  // While a goal is open the bar is that goal, written out (11-21 사용자 "예": '0% / 50%' sat at 0 for the whole first minute);
  // it keeps one goal until it is done, starting with the one furthest along. With every goal done it fills toward the next star.
  const open = HIDE_GOALS ? [] : (game.goals || []).filter((g) => !g.done)
  let g = open.find((x) => x.id === game.focus)
  // the first goal to move is the one kept (before that, the bar shows the best so far and may still switch)
  if (!g && open.length) { const f = (x) => (GOAL_BIN.has(x.id) ? -1 : goalValue(x.id) / x.n); g = open.reduce((a, b) => (f(b) > f(a) ? b : a)); if (f(g) > 0) game.focus = g.id }
  $('eaten').classList.toggle('goal', !!g)
  let fill, text
  if (g) { const v = goalValue(g.id); fill = Math.min(1, v / g.n); text = `${goalIcon(g.id)} ${goalLine(g.id, g.n)}${GOAL_BIN.has(g.id) ? '' : `  ${goalShort(g, v)}`}` }
  else {
    const ratio = game.eaten / world.total, next = STAR_AT.find((v) => v > ratio) ?? 1, prev = [0, ...STAR_AT].filter((v) => v <= ratio).pop()
    fill = clamp((ratio - prev) / (next - prev), 0, 1); text = `${Math.floor(ratio * 100)}% / ${Math.round(next * 100)}%`
  }
  $('eatenBar').style.width = `${fill * 100}%`
  const et = $('eatenText')
  if (et.textContent !== text) { // long goals in narrow bars (fr/de/es on a phone) step down in size until they fit
    et.textContent = text; et.style.fontSize = ''
    for (const px of [15, 13, 11]) if (et.scrollWidth > $('eaten').clientWidth + 1) et.style.fontSize = `${px}px`
  }
  const combo = $('combo')
  if (game.combo >= 8) { const text = `x${(1 + Math.min(game.combo, 60) / 12).toFixed(1)}`; if (combo.textContent !== text) combo.textContent = text; combo.classList.add('on') } else combo.classList.remove('on')
}

function tick(dt) {
  game.tickN = (game.tickN || 0) + 1
  game.blastT = (game.blastT || 0) + dt; if (game.blastT > 1) { game.blastT = 0; game.blasts = 0 }
  game.time -= dt; game.clock += dt
  for (const s of [10, 30, 60]) if (game.clock >= s && !(game.firstMarks || (game.firstMarks = {}))[s]) { game.firstMarks[s] = true; platform.track(`first_${s}s`, { score: Math.round(game.score), size: game.sizeShown, moved: game.firstAction }) }
  if (!game.frenzy && game.time <= 10) { game.frenzy = true; banner(t('frenzy')); audio.play('levelup'); audio.music('run', 1.14); burst(hole.x, hole.z, 40, 1.4) }
  steer(dt)
  updateWorld(dt)
  updateSurprises(dt)
  game.comboTime -= dt
  if (game.comboTime <= 0) game.combo = 0
  const shown = size()
  if (shown > game.sizeShown) {
    if (game.sizeShown === 1) platform.track('first_growth', { secs: +game.clock.toFixed(1), moved: game.firstAction })
    game.sizeShown = shown; banner(t('sizeUp')); audio.play('levelup', 0.8); pulseAge = 0; burst(hole.x, hole.z, 26, clamp(hole.r / 5, 0.8, 2.2))
  }
  const left = world.items.some((item) => item.alive)
  if (!left) endRun(true)
  else if (game.time <= 0) { if (canMore()) offerMore(); else endRun(false) }
  droneOffer(dt)
  updateHud(); updateGoals(); fxChips()
}

function updateView(dt, now) {
  hole.shown = lerp(hole.shown, hole.r, clamp(dt * 7, 0, 1))
  hole.chomp = Math.max(0, hole.chomp - dt * 2.5)
  const R = hole.shown * (hole.boost || 1) * (1 + Math.sin(now * 0.03) * 0.03 + hole.chomp * 0.06)
  hole.group.position.set(hole.x, 0, hole.z)
  spot.scale.setScalar(R); spotCore.scale.setScalar(R * 0.45); ring.scale.setScalar(R * (1.02 + Math.sin(now * 0.012) * 0.03))
  lvRings.forEach((m, i) => { if (m.visible) { m.scale.setScalar(R * (1.12 + i * 0.13)); m.rotation.y = now * 0.002 * (i % 2 ? -1 : 1) * (1 + i * 0.2) } })
  // the bot floats above and a little behind (toward the camera) and leans the way it moves
  // the bot floats above and behind the spot (away from the camera), faces the camera and looks down at its beam
  // over a building it cannot melt the bot rises above the roof, so the beam still points down onto it
  const c = curChar(), st = evoStage(c), power = Math.floor((save.up.magnet || 0) / 5) // Power 5 / 10 / 15: the beam looks stronger
  const lift = Math.max(5 + hole.shown * 1.9, (hole.blockShown || 0) + 4 + hole.shown) * (c === 1 ? 1.15 : 1), size = (0.75 + hole.shown * 0.2) * (1 + Math.floor((save.up.start || 0) / 5) * 0.06) * (c === 0 ? 1.3 : 1) // 11-21 총괄: the bot still read small from the PC view
  bot.position.set(lerp(bot.position.x || hole.x, hole.x - hole.vx * 0.05, clamp(dt * 8, 0, 1)), lift + Math.sin(now * 0.003) * 0.3, lerp(bot.position.z || hole.z, hole.z - lift * 0.55 - hole.vz * 0.05, clamp(dt * 8, 0, 1)))
  bot.scale.setScalar(size); bot.rotation.set(0.55 + clamp(hole.vz * 0.015, -0.25, 0.25), 0, clamp(-hole.vx * 0.02, -0.35, 0.35))
  bot.traverse((o) => { if (o.userData.jet) o.scale.y = 0.8 + Math.sin(now * 0.05) * 0.2 })
  EYE.set(...BEAM_FROM[c]).multiplyScalar(size).applyEuler(bot.rotation).add(bot.position)
  if (c === 1) bot.rotation.set(0.12, now * 0.0015, clamp(-hole.vx * 0.01, -0.2, 0.2))
  botUfo.children.forEach((o) => { if (o.userData.light !== undefined) o.visible = Math.floor(now / 110 + o.userData.light) % 3 !== 0 })
  // blocked by something too strong: the beam ends on its roof and the ring turns pale blue (reset each frame by updateWorld)
  const blocked = hole.blockShown > 0.5
  HIT.set(hole.x, blocked ? hole.blockShown : 0.05, hole.z)
  hole.group.position.y = blocked ? hole.blockShown : 0
  const weak = game.state === 'run' && game.weakT > game.clock, ringColor = blocked ? 0x9fe4ff : weak ? 0x8a90a0 : charColor()
  if (ring.material.color.getHex() !== ringColor) { ring.material.color.set(ringColor); if (c !== 2) spot.material.color.set(ringColor) }
  updateShells()
  aimBeam(beamOuter, EYE, HIT, R * 0.42 * (1 + hole.chomp * 0.25) * (1 + power * 0.12) * (1 + (lvShown - 1) * 0.006)); aimBeam(beamCore, EYE, HIT, R * 0.14 * (1 + power * 0.3))
  beamOuter.material.opacity = (0.45 + Math.sin(now * 0.04) * 0.08) * (weak ? 0.25 + Math.random() * 0.45 : 1)
  octoLegs.visible = c === 3; if (c === 3) drawOcto(now, size, R)
  heatRing.visible = c === 0 && st >= 2
  if (heatRing.visible) { heatRing.position.set(hole.x, HIT.y + 0.1, hole.z); heatRing.scale.setScalar(R * (1.3 + Math.sin(now * 0.008) * 0.08)); heatRing.rotation.y = now * 0.002 }
  // UFO: one light column, two at stage 2 (side by side over the spot), and at stage 3 a dark mothership follows high above
  ufoBeams.forEach((m, i) => {
    m.visible = c === 1 && (i === 0 || st >= 2)
    if (!m.visible) return
    const two = st >= 2, side = i ? 1 : -1, w = two ? 0.62 : 1
    HIT2.set(hole.x + (two ? side * R * 0.42 : 0), HIT.y, hole.z); aimBeam(m, EYE, HIT2, R * w * (1 + hole.chomp * 0.15))
    m.material.opacity = (0.24 + power * 0.05) + Math.sin(now * 0.03 + i) * 0.05
  })
  mother.visible = c === 1 && st >= 3
  if (mother.visible) { mother.position.set(lerp(mother.position.x || hole.x, hole.x + 6, clamp(dt * 1.2, 0, 1)), lift + 14, lerp(mother.position.z || hole.z, hole.z - lift * 0.55 - 10, clamp(dt * 1.2, 0, 1))); mother.scale.setScalar(size * 3.2); mother.rotation.y = now * 0.0004 }
  if (game.state === 'run') markScorch(hole.x, hole.z, R)
  drawDrone(now); drawPals(now); drawSurprises(now); drawDrops(now)
  pulseAge += dt
  if (pulseAge < 0.6) { const p = pulseAge / 0.6; pulse.visible = true; pulse.position.x = hole.x; pulse.position.z = hole.z; pulse.scale.setScalar(R * (1 + p * 2.2)); pulse.material.opacity = 0.8 * (1 - p) } else pulse.visible = false
  const wide = innerWidth / innerHeight
  // the first seconds of a run start close on the bot so it reads as a robot, not a white ball, then ease out by 5 s (11-21 사용자 "예")
  const near = game.state === 'run' && !BOT && !RENDER ? 1 - 0.4 * Math.pow(1 - clamp(game.clock / 5, 0, 1), 2) : 1
  const height = Math.max((20 + hole.shown * 4.9) * (wide < 1 ? 1.3 : 1) * near, hole.blockShown ? hole.blockShown * 1.6 + 18 : 12) // stays above a roof that stops the beam
  game.punch = Math.max(0, game.punch - dt * 3)
  const back = height * 0.72 * (1 - game.punch * 0.05)
  const shake = game.shake * (save.shake ? 1 : 0)
  game.shake = Math.max(0, game.shake - dt * 2.2)
  // near the city's edge the camera stops short so the frame stays on blocks (the spot can still reach the last row)
  const halfW = Math.hypot(height, back) * 0.384 * wide, tx = clamp(clamp(hole.x, -WORLD - 12 + halfW, WORLD + 12 - halfW), hole.x - halfW * 0.6, hole.x + halfW * 0.6)
  const tz = clamp(Math.max(hole.z, -WORLD + 6 + (game.state === 'run' ? height * 0.55 : 0)), hole.z, hole.z + height * 0.45)
  camera.position.x = lerp(camera.position.x, tx, clamp(dt * 6, 0, 1)) + rnd(-shake, shake)
  camera.position.y = lerp(camera.position.y, height, clamp(dt * 3, 0, 1)) - game.punch * height * 0.05
  camera.position.z = lerp(camera.position.z, tz + back, clamp(dt * 6, 0, 1)) + rnd(-shake, shake)
  // look a little past the spot toward the android, more on wide screens, so the bot never sits under the timer
  const ahead = lift * (wide >= 1 ? 1.15 : 0.18)
  camera.lookAt(camera.position.x, (hole.blockShown || 0) * 0.9, camera.position.z - back - ahead)
  aimSun(camera.position.x, camera.position.z - back, Math.max(45, height * 1.5))
}

// ---------------------------------------------------------------- menus
function show(id) { $(id).classList.remove('hide') }
function hide_(id) { $(id).classList.add('hide') }
// World map on the title (11-23 사용자 "1,2,3 좋은거 같아"): every city as a pin with its landmark and 3 star slots (33 in all),
// the next city to aim for glows; a tap on an open city picks it (the arrows still work)
const mapNext = () => {
  let open = 0; while (open < THEMES.length - 1 && save.stars[open] >= 1) open++
  if (save.stars[open] < 1) return open
  const i = save.stars.slice(0, THEMES.length).findIndex((v) => v < 3); return i < 0 ? -1 : i
}
function renderMap() {
  const el = $('worldMap'), next = mapNext(), total = save.stars.slice(0, THEMES.length).reduce((a, b) => a + b, 0)
  if (el.childElementCount !== THEMES.length + 1) {
    el.innerHTML = `<b class="mapHead"></b>` + THEMES.map((_, i) => `<button class="pin" data-town="${i}"><img src="img/landmarks/city${String(i).padStart(2, '0')}.webp" alt=""><u></u><span><s></s><s></s><s></s></span></button>`).join('')
    el.querySelectorAll('.pin').forEach((b) => b.addEventListener('click', () => {
      const i = +b.dataset.town; if (b.classList.contains('locked') || i === save.town) return
      audio.unlock(); audio.play('click'); save.town = i; writeSave(); sync(); goHome()
    }))
  }
  el.firstChild.textContent = `★ ${total} / ${THEMES.length * 3}`
  el.querySelectorAll('.pin').forEach((b, i) => {
    b.classList.toggle('locked', i > 0 && save.stars[i - 1] < 1); b.classList.toggle('here', i === save.town); b.classList.toggle('next', i === next && i !== save.town)
    b.title = TOWN_NAMES[lang][i]; b.querySelectorAll('s').forEach((x, k) => x.classList.toggle('on', k < save.stars[i]))
  })
}
function sync() {
  renderMap()
  const town = save.town
  $('townName').textContent = TOWN_NAMES[lang][town]
  $('townStars').innerHTML = [0, 1, 2].map((i) => `<i class="${i < save.stars[town] ? 'on' : ''}"></i>`).join('')
  const locked = town > 0 && save.stars[town - 1] < 1
  $('townLock').textContent = locked ? t('locked') : ''
  $('playBtn').disabled = locked; $('playBtn').textContent = t('play')
  $('prevTown').disabled = town === 0; $('nextTown').disabled = town === THEMES.length - 1
  $('upBtn').textContent = t('upgrades'); $('skinBtn').textContent = t('chars'); requestAnimationFrame(() => fitText([$('upBtn'), $('skinBtn')]))
  $('goldTitle').textContent = save.gold.toLocaleString('en-US'); $('goldPanel').textContent = save.gold.toLocaleString('en-US')
  $('pauseTitle').textContent = t('paused'); $('resumeBtn').textContent = t('resume'); $('quitBtn').textContent = t('quit')
  $('panelClose').textContent = t('close')
  $('playBtn').classList.add('pulse')
  setLaserColor(SKINS[save.skin].color)
  setLevelLook(lvOf(save.xp).l)
  applyChar()
}
function renderUpgrades(host) {
  host.innerHTML = ''
  host.className = 'upgrades'
  for (const u of UPGRADES) {
    const level = save.up[u.id], full = level >= u.max, cost = upCost(u), can = !full && save.gold >= cost
    const b = document.createElement('button')
    b.className = `up${can ? ' can' : ''}`
    b.innerHTML = `<span>${t(u.name)}${level ? ` Lv ${level}` : ''}</span><small>${t(u.desc)}</small><span class="cost">${full ? t('max') : `<i class="coin"></i>${cost.toLocaleString('en-US')}`}</span>`
    b.addEventListener('click', () => {
      if (full) return
      if (save.gold < cost) { audio.play('deny'); return }
      save.gold -= cost; save.up[u.id]++; audio.play('buy'); writeSave(); sync(); renderUpgrades(host)
    })
    host.appendChild(b)
  }
  requestAnimationFrame(() => fitUps(host))
}
const fitUps = (host) => fitText(host.querySelectorAll('.up > span:first-child, .up small'))
function openPanel(kind) {
  audio.unlock(); audio.play('click')
  const body = $('panelBody'); body.innerHTML = ''
  hide_('title'); show('panel'); sync()
  $('panelTitle').textContent = t(kind === 'up' ? 'upgrades' : kind === 'skin' ? 'chars' : 'settings')
  $('goldPanel').parentElement.classList.toggle('hide', kind === 'set')
  if (kind === 'up') renderUpgrades(body)
  if (kind === 'skin') renderChars(body)
  if (kind === 'set') renderSettings(body)
}
// Characters: owned ones to pick (stars = evolution stage), locked ones as a black silhouette with how to get them;
// laser colours below for the Melt Bot only (the others have their own colour, so a picture tells which one it is)
function renderChars(host) {
  host.innerHTML = ''; host.className = 'chars'
  const list = document.createElement('div'); list.className = 'charList'
  CHARS.forEach((ch, i) => {
    const have = save.chars.includes(i), on = curChar() === i, b = document.createElement('button'), st = evoStage(i)
    b.className = `char${on ? ' on' : ''}${have ? '' : ' locked'}`
    const how = ch.how ? t(ch.how).replace('{city}', TOWN_NAMES[lang][ch.town ?? 0]) : ''
    b.innerHTML = `<img src="${charIcon(i)}" alt=""><b>${t(ch.name)}</b><em>${have ? [0, 1, 2].map((k) => `<i class="${k < st ? 'on' : ''}"></i>`).join('') : ''}</em><span>${have ? t(on ? 'used' : 'use') : how}</span>`
    b.addEventListener('click', () => { if (!have) { audio.play('deny'); return } audio.play('click'); save.char = i; writeSave(); sync(); renderChars(host) })
    list.appendChild(b)
  })
  host.appendChild(list)
  if (curChar() === 0) { const sk = document.createElement('div'); host.appendChild(sk); renderSkins(sk) }
  // the drone shelf: every city's landmark drone as a figurine on its stand; not yet won = a dark one with how to get it
  const shelf = document.createElement('div'); shelf.className = 'palShelf'
  const got = THEMES.filter((_, i) => save.pals.includes(i)).length
  shelf.innerHTML = `<h3>${t('pals')} <small>${got} / ${THEMES.length}</small></h3><div>` + THEMES.map((_, i) => { const have = save.pals.includes(i)
    return `<figure class="${have ? '' : 'locked'}" title="${have ? palName(i) : t('palHow')}"><img src="${palPic(i)}" alt=""><figcaption>${have ? TOWN_NAMES[lang][i] : '?'}</figcaption></figure>` }).join('') + '</div>'
  host.appendChild(shelf)
  requestAnimationFrame(() => fitText(host.querySelectorAll('.char b, .char span')))
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
function addSliders(host) {
  for (const key of ['music', 'sfx']) {
    const row = document.createElement('label'); row.className = 'opt'
    row.innerHTML = `<span>${t(key)}</span><input type="range" min="0" max="1" step="0.05" value="${save[key]}">`
    row.querySelector('input').addEventListener('input', (e) => { save[key] = Number(e.target.value); applyVolume(); writeSave() })
    row.querySelector('input').addEventListener('change', () => { if (key === 'sfx') audio.play('click') })
    host.appendChild(row)
  }
}
function renderSettings(host) {
  host.innerHTML = ''; host.className = 'set'
  addSliders(host)
  const row = document.createElement('div'); row.className = 'opt'
  row.innerHTML = `<span>${t('shake')}</span><button class="sub">${t(save.shake ? 'on' : 'off')}</button>`
  row.querySelector('button').addEventListener('click', (e) => { audio.play('click'); save.shake = save.shake ? 0 : 1; e.target.textContent = t(save.shake ? 'on' : 'off'); writeSave() })
  host.appendChild(row)
  const head = document.createElement('div'); head.className = 'opt langHead'; head.innerHTML = `<span>${t('language')}</span>`
  host.appendChild(head)
  const grid = document.createElement('div'); grid.className = 'langs'
  for (const key of LANG_KEYS) {
    const b = document.createElement('button'); b.className = `lang${key === lang ? ' on' : ''}`; b.textContent = LANGUAGES[key]; b.lang = key
    b.addEventListener('click', () => { audio.play('click'); if (key === lang) return; lang = key; save.lang = lang; writeSave(); sync(); $('panelTitle').textContent = t('settings'); renderSettings(host) })
    grid.appendChild(b)
  }
  host.appendChild(grid)
}
function goHome() {
  hide_('result'); hide_('pause'); hide_('hud'); hide_('panel'); show('title'); sync(); renderLobby()
  game.state = 'title'; audio.music('menu')
  buildWorld(save.town); hole.x = world.plan.start[0]; hole.z = world.plan.start[1]; hole.r = 2.4
}

$('playBtn').addEventListener('click', startRun)
// Opens the next city with a big card (city name, stars), then goes on: what the player sees the moment the ad closes.
function revealCity(town, then) {
  save.town = town; writeSave(); sync()
  $('revealTag').textContent = t('newCity'); $('revealName').textContent = TOWN_NAMES[lang][town]
  $('revealPic').src = `img/landmarks/city${String(town).padStart(2, '0')}.webp`
  const told = (save.told || []).includes(town), lines = STORY[lang]?.[town] || STORY.en[town]
  $('revealHq').textContent = told ? '' : lines[0]; $('revealBot').textContent = told ? '' : lines[1]
  $('revealTalk').classList.toggle('hide', told)
  if (!told) { save.told = [...(save.told || []), town]; writeSave() }
  const card = $('reveal'); card.classList.remove('hide', 'out'); void card.offsetWidth; card.classList.add('on')
  audio.unlock(); audio.play('levelup'); audio.play('huge', 0.6)
  let done = false
  const go = () => { if (done) return; done = true; then(); card.classList.add('out'); setTimeout(() => card.classList.add('hide'), 450) }
  card.onpointerdown = go; setTimeout(go, told ? 1900 : 2800)
}
const afterRun = (next) => () => {
  const town = game.unlock, ch = game.newChar ?? -1; game.unlock = -1; game.newChar = -1
  const step = ch >= 0 ? () => revealChar(ch, next) : next
  if (town >= 0) revealCity(town, step); else step()
}
// A new character: the same big card as a new city, with the character's picture; it is picked at once
function revealChar(c, then) {
  save.char = c; writeSave(); sync()
  const card = $('reveal')
  $('revealTag').textContent = t('newChar'); $('revealName').textContent = t(CHARS[c].name); $('revealPic').src = charIcon(c)
  $('revealTalk').classList.add('hide'); card.classList.add('newchar')
  requestAnimationFrame(() => fitText([$('revealName')]))
  card.classList.remove('hide', 'out'); void card.offsetWidth; card.classList.add('on')
  audio.unlock(); audio.play('levelup'); audio.play('huge', 0.6)
  let done = false
  const go = () => { if (done) return; done = true; then(); card.classList.add('out'); setTimeout(() => { card.classList.add('hide'); card.classList.remove('newchar') }, 450) }
  card.onpointerdown = go; setTimeout(go, 2600)
}
$('moreBtn').addEventListener('click', () => {
  if ($('moreBtn').disabled) return
  $('moreBtn').disabled = true; game.moreWait = true; audio.play('click') // the 5 s count stops while the ad comes
  if (!platform.ready) { moreDone(true); return } // &fakead: test without the portal
  platform.rewardedAd((ok) => moreDone(ok))
})
$('droneBtn').addEventListener('click', () => {
  const b = $('droneBtn'); if (b.disabled || game.state !== 'run' || game.droneUsed) return
  b.disabled = true; game.droneUsed = true; audio.play('click')
  if (!droneAd() || !platform.ready) { droneStart(true); return } // gauge full, or &fakead: test without the portal
  // 11-15: the portal sends 'pause' when the ad opens; in 'run' that turned the run into the pause screen and the drone never came.
  // 'ad' freezes the run like a pause but nothing can pause it, and it goes back to 'run' when the ad is over.
  game.state = 'ad'; platform.message('gameplay_stopped')
  platform.rewardedAd((ok) => { if (game.state === 'ad') { game.state = 'run'; last = performance.now() } platform.message('gameplay_started'); droneStart(ok) })
})
$('moreNo').addEventListener('click', () => { audio.play('click'); moreDone(false) })
// result countdown (11-18, Gulp Town 11-11 pattern): the big button starts itself after 3 s, for the 5:00 average play time.
// Any other press on the result screen stops it; the full-screen ad rule stays (it comes when the button fires).
const countdown = { left: 0, timer: 0 }
function startCount() {
  stopCount()
  if (BOT || RENDER || (Q.has('debug') && !Q.has('count')) || game.state !== 'over') return
  countdown.left = 3; $('againBtn').classList.add('counting'); drawCount()
  countdown.timer = setInterval(() => {
    if (platform.adOpen || document.hidden || game.state !== 'over') return
    countdown.left -= 0.1; drawCount()
    if (countdown.left <= 0) { stopCount(); $('againBtn').click() }
  }, 100)
}
function drawCount() { const cd = $('againBtn').querySelector('.cd'); if (!cd) return; cd.style.setProperty('--p', Math.max(0, countdown.left / 3)); cd.firstChild.textContent = Math.max(1, Math.ceil(countdown.left - 0.001)) }
function stopCount() { clearInterval(countdown.timer); countdown.timer = 0; $('againBtn').classList.remove('counting') }
$('result').addEventListener('pointerdown', (e) => { if (!e.target.closest('#againBtn')) stopCount() }, true)
const leaveResult = (next) => { stopCount(); if ($('againBtn').disabled) return; $('againBtn').disabled = $('homeBtn').disabled = true; platform.interstitial(afterRun(next)) }
$('againBtn').addEventListener('click', () => leaveResult(startRun))
// CrazyGames: no full-screen ad on a button that goes to the main menu (ads rules, 11-18), only on Again
$('homeBtn').addEventListener('click', () => { audio.play('click'); if (window.bridge?.platform?.id === 'crazygames') { stopCount(); if (!$('homeBtn').disabled) { $('againBtn').disabled = $('homeBtn').disabled = true; afterRun(goHome)() } } else leaveResult(goHome) })
$('upBtn').addEventListener('click', () => openPanel('up'))
$('skinBtn').addEventListener('click', () => openPanel('skin'))
$('setBtn').addEventListener('click', () => openPanel('set'))
$('panelClose').addEventListener('click', () => { audio.play('click'); hide_('panel'); show('title'); sync(); renderLobby() })
$('pauseBtn').addEventListener('click', () => { audio.play('click'); pauseRun() })
$('resumeBtn').addEventListener('click', resumeRun)
$('quitBtn').addEventListener('click', () => { hide_('pause'); game.time = 0; game.state = 'run'; endRun(false) })
$('prevTown').addEventListener('click', () => { audio.unlock(); audio.play('click'); save.town = Math.max(0, save.town - 1); writeSave(); sync(); goHome() })
$('nextTown').addEventListener('click', () => { audio.unlock(); audio.play('click'); save.town = Math.min(THEMES.length - 1, save.town + 1); writeSave(); sync(); goHome() })
$('doubleBtn').addEventListener('click', () => {
  $('doubleBtn').disabled = true
  platform.rewardedAd((ok) => {
    if (ok && !game.doubled) { game.doubled = true; save.gold += game.gold; $('resGold').textContent = `+${game.gold * 2}`; audio.play('buy'); writeSave(); renderUpgrades($('resUp')) } else if (!ok) $('doubleBtn').classList.add('hide') // no ad came: never leave an ad button that does nothing (CrazyGames ads rules)
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
    input.mouse = true; input.active = true; input.mx = e.clientX; input.my = e.clientY
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
  if (e.code === 'KeyP' || e.code === 'Escape') { if (game.state === 'run') pauseRun(); else if (game.state === 'pause') resumeRun() }
  if (e.code === 'Enter' && (game.state === 'title') && !$('playBtn').disabled && $('panel').classList.contains('hide') && $('reveal').classList.contains('hide')) startRun()
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault()
})
addEventListener('keyup', (e) => input.keys.delete(e.code))
addEventListener('blur', () => input.keys.clear())

// ---------------------------------------------------------------- slow devices + performance sample (11-15, Gulp Town 433cdf0)
// when play stays under 40fps for 3 s the picture gets cheaper (pixel ratio 2 -> 1.25 -> 1, then shadows off); the game itself never changes
const quality = {
  level: 0, sum: 0, n: 0, wait: 0,
  frame(raw, playing) {
    if (!playing || this.level >= 3 || raw > 1000) return // over 1 s = a hitch (tab, ad), not speed; 4fps phones must still count
    this.sum += raw; this.n++
    if (this.sum < 3000) return
    const fps = this.n / (this.sum / 1000); this.sum = 0; this.n = 0
    if (this.wait > 0) { this.wait--; return }
    if (fps >= 40) return
    this.level++; this.wait = 1
    if (this.level === 3 && sunLight) { renderer.shadowMap.enabled = false; sunLight.castShadow = false }
    resize()
  },
}
// Playgama telemetry guide: one sample per 30 s of play (and at the end of a run); a frame counts only if the one before was play too
const perf = {
  frames: [], active: 0, start: 0, prev: false, errors: 0, rejects: 0,
  frame(now, raw, playing) {
    const on = playing && !document.hidden
    if (on && this.prev) { if (!this.start) this.start = now - raw; this.frames.push(raw); this.active += raw }
    this.prev = on
    if (this.active >= 30000) this.flush(now)
  },
  flush(now = performance.now()) {
    const f = this.frames
    if (f.length >= 30) {
      const sorted = [...f].sort((a, b) => a - b), at = (p) => sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))]
      const fps = f.map((ms) => 1000 / Math.max(ms, 1)).sort((a, b) => a - b), over = (ms) => f.filter((x) => x > ms).length
      const r1 = (v) => Math.round(v * 10) / 10, mem = performance.memory
      platform.track('performance_sample', {
        target_fps: 60, window_ms: Math.round(now - this.start), active_ms: Math.round(this.active), frame_count: f.length,
        fps_avg: r1(f.length / (this.active / 1000)), fps_p10: r1(fps[Math.floor(fps.length * 0.1)]),
        frame_time_p50_ms: r1(at(0.5)), frame_time_p95_ms: r1(at(0.95)), frame_time_p99_ms: r1(at(0.99)), frame_time_max_ms: r1(sorted[sorted.length - 1]),
        frames_over_50ms: over(50), frames_over_100ms: over(100), frames_over_250ms: over(250), frames_over_500ms: over(500), frames_over_1000ms: over(1000),
        js_error_count: this.errors, unhandled_rejection_count: this.rejects, quality_level: quality.level,
        is_mobile: matchMedia('(pointer: coarse)').matches, screen_w: innerWidth, screen_h: innerHeight, pixel_ratio: r1(renderer.getPixelRatio()), cpu_cores: navigator.hardwareConcurrency || 0,
        is_test: !!TURBO || BOT || RENDER || /[?&](bench|heavy|screen|turbo|shot|debug|char)/.test(location.search),
        ...(mem ? { memory_used_mb: Math.round(mem.usedJSHeapSize / 1048576), memory_measurement_supported: true, memory_measurement_type: 'js_heap' } : { memory_measurement_supported: false }),
      })
    }
    this.frames = []; this.active = 0; this.start = 0; this.errors = 0; this.rejects = 0
  },
}
addEventListener('error', () => { perf.errors++ })
addEventListener('unhandledrejection', () => { perf.rejects++ })
function resize() {
  const w = innerWidth, h = innerHeight
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, [w < 800 ? 2 : 1.5, 1.25, 1, 1][quality.level]))
  renderer.setSize(w, h, false); camera.aspect = w / h; camera.fov = w < h ? 46 : 42; camera.updateProjectionMatrix()
}
addEventListener('resize', resize)

// ---------------------------------------------------------------- loop
let last = performance.now()
function frame(now) {
  if (RENDER) return
  requestAnimationFrame(frame)
  const raw = now - last, real = Math.min(0.25, raw / 1000), dt = Math.min(0.05, real); last = now
  const playing = game.state === 'run' && !platform.adOpen && !platform.paused && !TURBO
  perf.frame(now, raw, playing); quality.frame(raw, playing) // real: the +15 s offer counts wall time even on a slow phone
  platform.banner(game.state === 'title' || (game.state === 'over' && !$('result').classList.contains('hide')))
  if (game.state === 'more' && !platform.adOpen && !game.moreWait) { game.moreLeft -= real; $('moreRing').style.setProperty('--p', clamp(game.moreLeft / 5, 0, 1)); if (game.moreLeft <= 0) moreDone(false) }
  if (game.freeze > 0) game.freeze -= dt
  else if (game.state === 'run' && !platform.adOpen && !platform.paused) { if (TURBO) { for (let i = 0; i < TURBO && game.state === 'run'; i++) { tick(1 / 60); updateFallers(1 / 60); updateChunks(1 / 60) } } else tick(dt) }
  updateFallers(dt); updateSparks(dt); updateDust(dt); updateChunks(dt)
  updateView(dt, now)
  if (game.heatT > 0) game.heatT -= dt
  audio.hum(game.state === 'run' && !platform.adOpen && !platform.paused, hole.shown, game.heatT > 0)
  draw()
}

let loadedAt = 0
// Rankings on the result screen: in_game = our own top 10 in two tabs, native_popup = the portal's window, else no button.
const BOARDS = ['top_score', 'landmark_fastest']
// Boards: entries asked once a minute per board (again after a run sends a score), drawn into the result window and the lobby.
const boardCache = {}
function boardRows(tab) {
  const c = boardCache[tab]; if (c && performance.now() - c.at < 60000) return c.ask
  let ask; try { ask = Promise.resolve(window.bridge.leaderboards.getEntries(BOARDS[tab])) } catch { ask = Promise.reject(new Error('no board')) }
  boardCache[tab] = { at: performance.now(), ask }; ask.catch(() => { delete boardCache[tab] })
  return ask
}
// whole seconds for the landmark time (FEEDBACK: no decimals on screen), points with commas
const boardFmt = (tab, v) => tab ? `${Math.round(v / 1000)}${t('secs')}` : Math.round(v).toLocaleString('en-US')
const boardLine = (rank, name, score, me) => { const li = document.createElement('li'); if (me) li.className = 'me'; li.innerHTML = '<i></i><span></span><b></b>'; li.children[0].textContent = rank; li.children[1].textContent = name; li.children[2].textContent = score; return li }
const boardNone = () => { const li = document.createElement('li'); li.className = 'none'; li.textContent = t('noRecord'); return li }
const myId = () => { try { const id = window.bridge.player?.id; return id == null || id === '' ? null : String(id) } catch { return null } }
// The top rows with my own row painted and '(me)' after my name; a separate line of mine below only when my row is not on screen
// (outside the top, or below the 3 a folded phone board shows); no record of mine at all = no line (2026-11-10 사용자 "이게 내이름이야?").
// My device best better than my board row (or no row): sent again once per value, then the board is drawn again; until the board
// has it (guest, send failed) my line goes where that score belongs, never a '—' rank (11-14, same fix as Gulp Town f07c574).
// landmark_fastest: lower is better.
const boardBetter = (tab, a, b) => (tab ? a > 0 && (!b || a < b) : a > b)
const boardSent = {}
function boardResend(tab, value, again) {
  if (boardSent[tab] === value) return
  boardSent[tab] = value
  let ask; try { ask = Promise.resolve(window.bridge.leaderboards.setScore(BOARDS[tab], value)) } catch (e) { ask = Promise.reject(e) }
  ask.then(() => { delete boardCache[tab]; again() }).catch(() => {})
}
function fillBoard(list, mine, tab, top, shown = () => top) {
  list.replaceChildren(boardLine('', '...', '')); mine.replaceChildren()
  const local = tab ? save.fast || 0 : Math.max(0, ...save.best), id = myId()
  const draw = (all) => {
    all = all || []
    const isMe = (r) => !!id && String(r.id) === id, row = all.find(isMe), server = row ? +row.score || 0 : 0
    const named = (n) => (n ? `${n} (${t('me')})` : t('me')), mineBetter = local > 0 && boardBetter(tab, local, server)
    if (mineBetter && id && platform.boardType() !== 'not_available' && !BOT && !RENDER) boardResend(tab, local, () => { if (list.isConnected) fillBoard(list, mine, tab, top, shown) })
    let rows, at = -1, outRank = 0, mineV = 0
    if (row && !mineBetter) {
      rows = all.slice(0, top).map((r, i) => ({ rank: r.rank ?? i + 1, name: isMe(r) ? named(r.name) : r.name || '?', v: +r.score || 0, me: isMe(r) }))
      at = rows.findIndex((r) => r.me); outRank = row.rank ?? all.indexOf(row) + 1; mineV = server
    } else if (local > 0) {
      const others = all.filter((r) => !isMe(r)), place = others.filter((r) => !boardBetter(tab, local, +r.score || 0)).length
      let name = row?.name; try { name = name || (id && window.bridge.player?.name) || '' } catch {}
      const merged = others.map((r) => ({ name: r.name || '?', v: +r.score || 0, me: false }))
      merged.splice(place, 0, { name: named(name), v: local, me: true })
      rows = merged.slice(0, top).map((r, i) => ({ ...r, rank: i + 1 })); at = place < top ? place : -1; outRank = place + 1; mineV = local
    } else rows = all.slice(0, top).map((r, i) => ({ rank: r.rank ?? i + 1, name: r.name || '?', v: +r.score || 0, me: false }))
    list.replaceChildren(...(rows.length ? rows.map((r) => boardLine(r.rank, r.name, boardFmt(tab, r.v), r.me)) : [boardNone()]))
    const onScreen = at >= 0 && at < shown()
    mine.replaceChildren(...(onScreen || !outRank ? [] : [boardLine(outRank, at >= 0 ? rows[at].name : named(row?.name), boardFmt(tab, mineV), true)]))
  }
  boardRows(tab).then(draw).catch(() => draw([]))
}
const boardTabs = (host, tab, go) => { host.innerHTML = ''; [t('rankAll'), t('rankFast')].forEach((name, i) => { const b = document.createElement('button'); b.className = `sub${i === tab ? ' on' : ''}`; b.textContent = name; b.addEventListener('click', () => { audio.play('click'); go(i) }); host.appendChild(b) }); requestAnimationFrame(() => fitTabs(host)) }
// tab names break only between words (11-14 German 'Gesamtrek|ord'): a word too long for its tab shrinks the tab's text, down to 10 px;
// text with no spaces (Japanese, Chinese) may then break between characters, which is normal there
function fitTabs(host) { fitText(host.children) }
// a label wider than its button shrinks its text (down to 10 px): 11-14 ru/tr/fr 360 px pushed the settings button to a new line
function fitText(els) { for (const b of els) { b.style.fontSize = ''; let f = parseFloat(getComputedStyle(b).fontSize); b.style.wordBreak = ''; while (b.scrollWidth > b.clientWidth + 1 && f > 10) b.style.fontSize = (f -= 1) + 'px'; if (b.scrollWidth > b.clientWidth + 1) b.style.wordBreak = 'normal' } }
function openRank(tab = 0) {
  audio.play('click')
  if (platform.boardType() === 'native_popup') { try { window.bridge.leaderboards.showNativePopup(BOARDS[tab])?.catch?.(() => {}) } catch {} return }
  $('rankTitle').textContent = t('rank'); $('rankClose').textContent = t('close')
  boardTabs($('rankTabs'), tab, openRank)
  show('rank'); fillBoard($('rankList'), $('rankMe'), tab, 10)
}
// The lobby board (PLAYBOOK 13, 2026-11-10 사용자 "순위표는 항상 대기실에 표현하자"): always open on the title screen, 1-10 + my
// line beside the menu on wide screens, 3 + my line under the logo on an upright phone with a button to open all 10.
// Only where the portal draws its own board (native_popup) a cup opens it; where there is no board, nothing.
const lobby = { tab: 0, open: false }
// upright screens: the open board floats over the lobby from where the folded board sits (the slot keeps the folded height), so the
// logo, city card and Start never move (11-14: the open board pushed the lobby); it stops under the gold; a tap outside folds it
function lobbyOpen(open) {
  const el = $('lobbyRank'), slot = $('lobbySlot')
  lobby.open = open && matchMedia('(max-aspect-ratio: 1/1)').matches
  if (lobby.open) { slot.style.height = el.offsetHeight + 'px'; const g = document.querySelector('#title .gold'), top = Math.max(10, g && g.offsetParent ? g.getBoundingClientRect().bottom + 8 : 0); el.style.maxHeight = Math.max(160, slot.getBoundingClientRect().bottom - top) + 'px' }
  else { slot.style.height = ''; el.style.maxHeight = '' }
  renderLobby()
}
function renderLobby() {
  const type = platform.boardType()
  $('lobbyRank').classList.toggle('hide', type !== 'in_game'); $('titleRank').classList.toggle('hide', type !== 'native_popup')
  if (type !== 'in_game') return
  $('lobbyTitle').textContent = t('rank')
  boardTabs($('lobbyTabs'), lobby.tab, (i) => { lobby.tab = i; renderLobby() })
  $('lobbyRank').classList.toggle('open', lobby.open)
  if (!lobby.open) $('lobbySlot').style.height = ''
  fillBoard($('lobbyList'), $('lobbyMe'), lobby.tab, 10, () => (matchMedia('(max-aspect-ratio: 1/1)').matches && !lobby.open ? 3 : 10))
}
$('lobbyMore').addEventListener('click', () => { audio.play('click'); lobbyOpen(!lobby.open) })
// a tap outside the open board only folds it (the tap does not also press what sits under it)
let lobbyFold = false
addEventListener('pointerdown', (e) => { lobbyFold = lobby.open && !$('lobbyRank').contains(e.target); if (lobbyFold) lobbyOpen(false) }, true)
addEventListener('click', (e) => { if (lobbyFold) { lobbyFold = false; e.stopPropagation(); e.preventDefault() } }, true)
$('titleRank').addEventListener('click', () => openRank(0))
$('rankBtn').addEventListener('click', () => openRank(0))
$('rankClose').addEventListener('click', () => { audio.play('click'); hide_('rank') })

// first visit: Baekho says why in 2 lines (11-18, Gulp Town ae526d4 talk): starts on the loading screen, any touch ends it
function talk(lines) {
  const box = $('talk'); let i = 0, timer = 0
  const stop = () => { clearTimeout(timer); box.classList.add('hide'); removeEventListener('pointerdown', stop, true) }
  const next = () => {
    if (i >= lines.length) return stop()
    const s = lines[i++]; $('talkText').textContent = s
    box.classList.remove('hide', 'pop'); void box.offsetWidth; box.classList.add('pop')
    timer = setTimeout(next, Math.min(3200, 1300 + s.length * 45))
  }
  addEventListener('pointerdown', stop, true); next()
}
async function boot() {
  $('loadbar').style.width = '30%'
  await platform.init()
  $('loadbar').style.width = '55%'
  await readSave()
  setTimeout(() => { for (const t0 of save.pals) try { palGeometry(t0) } catch {} }, 4000) // build the drones while the title shows, not at the run start
  if (Q.has('town')) save.town = clamp(+Q.get('town'), 0, THEMES.length - 1) // test pictures of one town
  const asked = (window.bridge?.platform?.language || navigator.language || 'en').toLowerCase().slice(0, 2)
  lang = save.lang || (LANGUAGES[asked] ? asked : 'en')
  if (LANGUAGES[Q.get('lang')]) lang = Q.get('lang')
  // 11-24 (Playgama 11-17~24: 38 sessions started a run, 18 finished one, session median 38 s): a brand-new player goes
  // straight from the loading screen into New York, with no title, no city card and no talk in between (was: a button + a 3 s card).
  // Test tools with &debug keep the title unless they ask for &direct.
  const direct = save.runs === 0 && save.town === 0 && !BOT && !RENDER && !Q.has('shot') && !Q.has('town') && !Q.has('talk') && (!Q.has('debug') || Q.has('direct'))
  if ((save.runs === 0 || Q.has('talk')) && !direct && !BOT && !RENDER && !Q.has('shot') && !Q.has('notalk')) talk([t('talk1'), t('talk2')])
  $('loadbar').style.width = '75%'
  resize(); buildWorld(save.town)
  hole.x = world.plan.start[0]; hole.z = world.plan.start[1]; hole.r = hole.shown = 2.4
  camera.position.set(hole.x, 30, hole.z + 22)
  hole.group.visible = true; game.state = 'title'; audio.music('menu')
  sync(); show('title'); renderLobby()
  $('loadbar').style.width = '100%'
  requestAnimationFrame(frame)
  requestAnimationFrame(() => {
    hide_('loading'); loadedAt = performance.now(); platform.message('game_ready')
    if (direct) { save.told = [...new Set([...(save.told || []), 0])]; writeSave(); startRun() }
  })
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
if (BOT || RENDER || Q.has('debug')) window.__gt = { fx: { trySurprise, tanks, get army() { return army }, drops, dropStart: (k) => { const w = DROP.odds; DROP.odds = [[k, 1]]; dropStart(); DROP.odds = w } }, pals, palsStart, PAL_MOVES, setLevelLook, lvOf, quality, pauseRun, renderer, renderLobby, revealChar, launchMeteor, updateMeteors, CHARS, evoStage, applyChar, strike, charIcon, openPanel, lobby, game, hole, drone, world, save, THEMES, UPGRADES, upCost, camera, startRun, audio, platform, scene, front, renderer, get size() { return size() } }
window.addEventListener('error', (e) => console.error('page error', e.message))
boot()
