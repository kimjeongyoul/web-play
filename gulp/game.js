// Gulp Town: a hungry hole eats a town. One drag to play; a run lasts 70 s; gold buys a bigger next run.
import * as THREE from './vendor/three.module.min.js'
import { MODELS } from './models.js'

const Q = new URLSearchParams(location.search)
const BUILD = '2026-11-23' // sent with every Playgama event, to compare builds
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
  en: { "newSkin": "New look!", "talk1": "Right now this hole barely fits a traffic cone.", "talk2": "Swallow more, grow bigger. Last stop: the town landmark.", dex: 'Swallowed', helper: 'Helper hole', helperGo: 'Helper!', play: 'PLAY', again: 'PLAY AGAIN', home: 'Home', upgrades: 'Upgrades', skins: 'Holes', settings: 'Settings', close: 'Close', paused: 'Paused', resume: 'Resume', quit: 'End run', music: 'Music', sfx: 'Sound', shake: 'Screen shake', language: 'Language', on: 'On', off: 'Off', size: 'SIZE', eaten: 'Eaten', best: 'Best', timeUp: "TIME'S UP!", cleared: 'TOWN EATEN!', double: 'Double gold', drag: 'Drag to move', mouse: 'Move the mouse', frenzy: 'GULP FRENZY!', sizeUp: 'SIZE UP!', locked: 'Earn 1 star in the last town', owned: 'Owned', use: 'Use', used: 'In use', max: 'MAX', lvl: 'Lv', upTime: 'More time', upTimeD: '+3 s each run', upSpeed: 'Speed', upSpeedD: 'Move faster', upStart: 'Big start', upStartD: 'Start larger', upMagnet: 'Suction', upMagnetD: 'Pull things in', upGold: 'Gold', upGoldD: '+10% gold' , nextTown: 'NEXT TOWN', newTown: 'New town!', moreTime: '+15 s', "newsTitle": "5 new towns!", "lockedBy": "{t}\n★1 to open"},
  ko: { "newSkin": "새 스킨!", "talk1": "이 구멍, 지금은 고깔 하나 겨우 삼켜.", "talk2": "삼킬수록 커져. 마지막엔 마을 대표 건물까지.", dex: '삼킨 종류', helper: '도우미 구멍', helperGo: '도우미!', play: '시작', again: '다시 하기', home: '처음으로', upgrades: '강화', skins: '구멍', settings: '설정', close: '닫기', paused: '일시정지', resume: '계속', quit: '판 끝내기', music: '배경음', sfx: '효과음', shake: '화면 흔들림', language: '언어', on: '켬', off: '끔', size: '크기', eaten: '삼킨 양', best: '최고', timeUp: '시간 끝!', cleared: '마을을 다 삼켰다!', double: '골드 2배', drag: '끌어서 움직이기', mouse: '마우스로 움직이기', frenzy: '먹보 폭주!', sizeUp: '커졌다!', locked: '앞 마을에서 별 1개', owned: '보유', use: '쓰기', used: '사용 중', max: '최대', lvl: 'Lv', upTime: '시간', upTimeD: '판마다 +3초', upSpeed: '속도', upSpeedD: '더 빠르게', upStart: '시작 크기', upStartD: '더 크게 출발', upMagnet: '흡입', upMagnetD: '주변을 빨아들임', upGold: '골드', upGoldD: '골드 +10%' , nextTown: '다음 마을', newTown: '새 마을!', moreTime: '+15초', "newsTitle": "새 마을 5곳!", "lockedBy": "{t}에서\n★1개면 열림"},
  es: {"newSkin": "¡Nuevo aspecto!", "talk1": "Ahora este agujero apenas traga un cono.", "talk2": "Cuanto más tragas, más crece. Al final, el monumento del pueblo.", "dex": "Tragados", "helper": "Agujero ayudante", "helperGo": "¡Ayudante!", "play": "JUGAR", "again": "OTRA VEZ", "home": "Inicio", "upgrades": "Mejoras", "skins": "Agujeros", "settings": "Ajustes", "close": "Cerrar", "paused": "Pausa", "resume": "Seguir", "quit": "Terminar", "music": "Música", "sfx": "Sonido", "shake": "Vibración", "language": "Idioma", "on": "Sí", "off": "No", "size": "TAMAÑO", "eaten": "Comido", "best": "Récord", "timeUp": "¡TIEMPO!", "cleared": "¡PUEBLO DEVORADO!", "double": "Oro doble", "drag": "Arrastra para moverte", "mouse": "Mueve el ratón", "frenzy": "¡FRENESÍ!", "sizeUp": "¡MÁS GRANDE!", "locked": "Gana 1 estrella antes", "owned": "Tuyo", "use": "Usar", "used": "En uso", "max": "MÁX", "lvl": "Nv", "upTime": "Más tiempo", "upTimeD": "+3 s por partida", "upSpeed": "Velocidad", "upSpeedD": "Muévete más rápido", "upStart": "Gran inicio", "upStartD": "Empieza más grande", "upMagnet": "Succión", "upMagnetD": "Atrae las cosas", "upGold": "Oro", "upGoldD": "+10% de oro", "nextTown": "SIGUIENTE", "newTown": "¡Nuevo pueblo!", "moreTime": "+15 s", "newsTitle": "¡5 pueblos nuevos!", "lockedBy": "{t}\n★1 para abrir"},
  pt: {"newSkin": "Novo visual!", "talk1": "Agora este buraco mal engole um cone.", "talk2": "Quanto mais engole, mais cresce. No fim, o monumento da cidade.", "dex": "Engolidos", "helper": "Buraco ajudante", "helperGo": "Ajudante!", "play": "JOGAR", "again": "DE NOVO", "home": "Início", "upgrades": "Melhorias", "skins": "Buracos", "settings": "Ajustes", "close": "Fechar", "paused": "Pausa", "resume": "Continuar", "quit": "Encerrar", "music": "Música", "sfx": "Som", "shake": "Tremor", "language": "Idioma", "on": "Sim", "off": "Não", "size": "TAMANHO", "eaten": "Comido", "best": "Recorde", "timeUp": "ACABOU!", "cleared": "CIDADE DEVORADA!", "double": "Ouro em dobro", "drag": "Arraste para mover", "mouse": "Mova o mouse", "frenzy": "FRENESI!", "sizeUp": "CRESCEU!", "locked": "Ganhe 1 estrela antes", "owned": "Seu", "use": "Usar", "used": "Em uso", "max": "MÁX", "lvl": "Nv", "upTime": "Mais tempo", "upTimeD": "+3 s por partida", "upSpeed": "Velocidade", "upSpeedD": "Mova-se mais rápido", "upStart": "Início grande", "upStartD": "Comece maior", "upMagnet": "Sucção", "upMagnetD": "Puxa as coisas", "upGold": "Ouro", "upGoldD": "+10% de ouro", "nextTown": "PRÓXIMA", "newTown": "Nova cidade!", "moreTime": "+15 s", "newsTitle": "5 cidades novas!", "lockedBy": "{t}\n★1 para abrir"},
  ru: {"newSkin": "Новый вид!", "talk1": "Пока эта дыра еле глотает конус.", "talk2": "Чем больше глотаешь, тем больше растёшь. В конце — главное здание города.", "dex": "Проглочено", "helper": "Дыра-помощник", "helperGo": "Помощник!", "play": "ИГРАТЬ", "again": "ЕЩЁ РАЗ", "home": "Меню", "upgrades": "Улучшения", "skins": "Дыры", "settings": "Настройки", "close": "Закрыть", "paused": "Пауза", "resume": "Продолжить", "quit": "Завершить", "music": "Музыка", "sfx": "Звук", "shake": "Тряска", "language": "Язык", "on": "Вкл", "off": "Выкл", "size": "РАЗМЕР", "eaten": "Съедено", "best": "Рекорд", "timeUp": "ВРЕМЯ ВЫШЛО!", "cleared": "ГОРОД СЪЕДЕН!", "double": "Золото x2", "drag": "Тяни, чтобы двигаться", "mouse": "Двигай мышью", "frenzy": "ОБЖОРСТВО!", "sizeUp": "БОЛЬШЕ!", "locked": "Нужна 1 звезда ранее", "owned": "Есть", "use": "Выбрать", "used": "Выбрано", "max": "МАКС", "lvl": "Ур", "upTime": "Время", "upTimeD": "+3 с за игру", "upSpeed": "Скорость", "upSpeedD": "Двигайся быстрее", "upStart": "Большой старт", "upStartD": "Начни крупнее", "upMagnet": "Всасывание", "upMagnetD": "Притягивает вещи", "upGold": "Золото", "upGoldD": "+10% золота", "nextTown": "ДАЛЬШЕ", "newTown": "Новый город!", "moreTime": "+15 с", "newsTitle": "5 новых городов!", "lockedBy": "{t}\n★1, чтобы открыть"},
  tr: {"newSkin": "Yeni görünüm!", "talk1": "Bu delik şimdilik bir dubayı zor yutar.", "talk2": "Yuttukça büyür. Sonunda kasabanın simgesi.", "dex": "Yutulan", "helper": "Yardımcı delik", "helperGo": "Yardımcı!", "play": "OYNA", "again": "TEKRAR", "home": "Ana menü", "upgrades": "Yükseltmeler", "skins": "Delikler", "settings": "Ayarlar", "close": "Kapat", "paused": "Duraklatıldı", "resume": "Devam", "quit": "Bitir", "music": "Müzik", "sfx": "Ses", "shake": "Sarsıntı", "language": "Dil", "on": "Açık", "off": "Kapalı", "size": "BOYUT", "eaten": "Yenen", "best": "En iyi", "timeUp": "SÜRE BİTTİ!", "cleared": "KASABA YENDİ!", "double": "İki kat altın", "drag": "Hareket için sürükle", "mouse": "Fareyi hareket ettir", "frenzy": "OBUR ÇILGINLIĞI!", "sizeUp": "BÜYÜDÜ!", "locked": "Önceki kasabada 1 yıldız", "owned": "Sende", "use": "Kullan", "used": "Kullanımda", "max": "MAKS", "lvl": "Sv", "upTime": "Süre", "upTimeD": "Oyun başına +3 sn", "upSpeed": "Hız", "upSpeedD": "Daha hızlı git", "upStart": "Büyük başlangıç", "upStartD": "Daha büyük başla", "upMagnet": "Emiş", "upMagnetD": "Eşyaları çeker", "upGold": "Altın", "upGoldD": "+%10 altın", "nextTown": "SONRAKİ", "newTown": "Yeni kasaba!", "moreTime": "+15 sn", "newsTitle": "5 yeni kasaba!", "lockedBy": "{t}\n★1 ile açılır"},
  de: {"newSkin": "Neuer Look!", "talk1": "Noch schluckt das Loch gerade mal einen Leitkegel.", "talk2": "Je mehr es schluckt, desto größer. Am Ende: das Wahrzeichen der Stadt.", "dex": "Verschluckt", "helper": "Helferloch", "helperGo": "Helfer!", "play": "SPIELEN", "again": "NOCHMAL", "home": "Start", "upgrades": "Upgrades", "skins": "Löcher", "settings": "Optionen", "close": "Schließen", "paused": "Pause", "resume": "Weiter", "quit": "Beenden", "music": "Musik", "sfx": "Sound", "shake": "Wackeln", "language": "Sprache", "on": "An", "off": "Aus", "size": "GRÖSSE", "eaten": "Gefressen", "best": "Rekord", "timeUp": "ZEIT UM!", "cleared": "STADT GEFRESSEN!", "double": "Doppeltes Gold", "drag": "Ziehen zum Bewegen", "mouse": "Maus bewegen", "frenzy": "FRESSRAUSCH!", "sizeUp": "GRÖSSER!", "locked": "Erst 1 Stern davor", "owned": "Deins", "use": "Nutzen", "used": "Aktiv", "max": "MAX", "lvl": "St", "upTime": "Mehr Zeit", "upTimeD": "+3 s pro Runde", "upSpeed": "Tempo", "upSpeedD": "Schneller bewegen", "upStart": "Großer Start", "upStartD": "Größer beginnen", "upMagnet": "Sog", "upMagnetD": "Zieht Dinge an", "upGold": "Gold", "upGoldD": "+10% Gold", "nextTown": "WEITER", "newTown": "Neue Stadt!", "moreTime": "+15 s", "newsTitle": "5 neue Städte!", "lockedBy": "{t}\n★1 zum Öffnen"},
  fr: {"newSkin": "Nouveau look !", "talk1": "Pour l'instant, ce trou avale à peine un cône.", "talk2": "Plus il avale, plus il grandit. À la fin : le monument de la ville.", "dex": "Avalés", "helper": "Trou assistant", "helperGo": "Assistant !", "play": "JOUER", "again": "REJOUER", "home": "Accueil", "upgrades": "Améliorations", "skins": "Trous", "settings": "Réglages", "close": "Fermer", "paused": "Pause", "resume": "Reprendre", "quit": "Terminer", "music": "Musique", "sfx": "Son", "shake": "Secousses", "language": "Langue", "on": "Oui", "off": "Non", "size": "TAILLE", "eaten": "Mangé", "best": "Record", "timeUp": "TEMPS ÉCOULÉ !", "cleared": "VILLE DÉVORÉE !", "double": "Or doublé", "drag": "Glisse pour bouger", "mouse": "Bouge la souris", "frenzy": "FRÉNÉSIE !", "sizeUp": "PLUS GROS !", "locked": "1 étoile avant requise", "owned": "À toi", "use": "Utiliser", "used": "Utilisé", "max": "MAX", "lvl": "Nv", "upTime": "Plus de temps", "upTimeD": "+3 s par partie", "upSpeed": "Vitesse", "upSpeedD": "Bouge plus vite", "upStart": "Gros départ", "upStartD": "Commence plus gros", "upMagnet": "Aspiration", "upMagnetD": "Attire les objets", "upGold": "Or", "upGoldD": "+10% d'or", "nextTown": "SUIVANT", "newTown": "Nouvelle ville !", "moreTime": "+15 s", "newsTitle": "5 nouvelles villes !", "lockedBy": "{t}\n★1 pour ouvrir"},
  ja: {"newSkin": "新しいスキン！", "talk1": "この穴、今はコーン1本がやっと。", "talk2": "飲み込むほど大きくなる。最後は町のシンボルまで。", "dex": "飲みこんだ種類", "helper": "おたすけ穴", "helperGo": "おたすけ!", "play": "プレイ", "again": "もう一度", "home": "ホーム", "upgrades": "強化", "skins": "穴", "settings": "設定", "close": "閉じる", "paused": "一時停止", "resume": "続ける", "quit": "終了", "music": "音楽", "sfx": "効果音", "shake": "画面の揺れ", "language": "言語", "on": "オン", "off": "オフ", "size": "サイズ", "eaten": "食べた量", "best": "最高", "timeUp": "タイムアップ!", "cleared": "町を食べ尽くした!", "double": "ゴールド2倍", "drag": "ドラッグで移動", "mouse": "マウスで移動", "frenzy": "大食いタイム!", "sizeUp": "大きくなった!", "locked": "前の町で星1つ", "owned": "所持", "use": "使う", "used": "使用中", "max": "最大", "lvl": "Lv", "upTime": "時間", "upTimeD": "1回ごとに+3秒", "upSpeed": "速度", "upSpeedD": "速く動く", "upStart": "大きくスタート", "upStartD": "大きな状態で開始", "upMagnet": "吸引", "upMagnetD": "周りを吸い寄せる", "upGold": "ゴールド", "upGoldD": "ゴールド+10%", "nextTown": "次の町", "newTown": "新しい町!", "moreTime": "+15秒", "newsTitle": "新しい町が5つ!", "lockedBy": "{t}で\n★1つで解放"},
  zh: {"newSkin": "新皮肤！", "talk1": "这个洞现在只吞得下一个路障。", "talk2": "吞得越多越大。最后连城里的地标也吞掉。", "dex": "吞下种类", "helper": "帮手洞", "helperGo": "帮手来了!", "play": "开始", "again": "再来一局", "home": "主页", "upgrades": "升级", "skins": "黑洞", "settings": "设置", "close": "关闭", "paused": "已暂停", "resume": "继续", "quit": "结束本局", "music": "音乐", "sfx": "音效", "shake": "屏幕震动", "language": "语言", "on": "开", "off": "关", "size": "大小", "eaten": "吞噬", "best": "最高", "timeUp": "时间到!", "cleared": "小镇吃光了!", "double": "金币翻倍", "drag": "拖动来移动", "mouse": "移动鼠标", "frenzy": "暴食时刻!", "sizeUp": "变大了!", "locked": "需在上一镇获得1星", "owned": "已拥有", "use": "使用", "used": "使用中", "max": "满级", "lvl": "Lv", "upTime": "时间", "upTimeD": "每局+3秒", "upSpeed": "速度", "upSpeedD": "移动更快", "upStart": "大号开局", "upStartD": "开局更大", "upMagnet": "吸力", "upMagnetD": "吸引周围物体", "upGold": "金币", "upGoldD": "金币+10%", "nextTown": "下一个小镇", "newTown": "新小镇!", "moreTime": "+15秒", "newsTitle": "5个新小镇!", "lockedBy": "{t}\n★1 解锁"},
}
const TOWN_NAMES = { en: ['Maple Town', 'Sunny Beach', 'Snow Village', 'Candy Land', 'Neon City', "Toy Room", "Mushroom Woods", "Undersea Town", "Dino Jungle", "Pumpkin Hollow"], ko: ['단풍 마을', '햇살 해변', '눈 마을', '사탕 나라', '네온 시티', "장난감 방", "버섯 숲", "해저 마을", "공룡 정글", "호박 마을"], es: ["Villa Arce", "Playa Soleada", "Aldea Nevada", "Tierra Dulce", "Ciudad Neón", "Cuarto de Juguetes", "Bosque de Setas", "Pueblo Submarino", "Jungla Dino", "Valle Calabaza"], pt: ["Vila Bordo", "Praia do Sol", "Vila da Neve", "Terra Doce", "Cidade Neon", "Quarto dos Brinquedos", "Floresta dos Cogumelos", "Vila Submarina", "Selva dos Dinos", "Vale das Abóboras"], ru: ["Кленовый город", "Солнечный пляж", "Снежная деревня", "Страна сладостей", "Неоновый город", "Комната игрушек", "Грибной лес", "Подводный город", "Джунгли динозавров", "Тыквенная долина"], tr: ["Akçaağaç Kasabası", "Güneşli Sahil", "Kar Köyü", "Şeker Diyarı", "Neon Şehir", "Oyuncak Odası", "Mantar Ormanı", "Denizaltı Köyü", "Dinozor Ormanı", "Balkabağı Köyü"], de: ["Ahornstadt", "Sonnenstrand", "Schneedorf", "Süßigkeitenland", "Neonstadt", "Spielzimmer", "Pilzwald", "Unterwasserdorf", "Dino-Dschungel", "Kürbistal"], fr: ["Bourg Érable", "Plage du Soleil", "Village Neige", "Pays Bonbon", "Néon City", "Chambre à Jouets", "Bois des Champignons", "Village Sous-Marin", "Jungle des Dinos", "Vallée des Citrouilles"], ja: ["カエデの町", "サニービーチ", "雪の村", "お菓子の国", "ネオンシティ", "おもちゃ部屋", "キノコの森", "海底の町", "恐竜ジャングル", "かぼちゃ村"], zh: ["枫叶镇", "阳光海滩", "雪村", "糖果国", "霓虹城", "玩具房", "蘑菇森林", "海底小镇", "恐龙丛林", "南瓜村"] }
// Town news (gamedev-kit/narrative/2026-11-08_gulp_town.md): one line on the result screen the first time a town gives 1 star and 3 stars
const NEWS = {"ko": [["빵집이 통째로 사라졌다는 신고", "시장 \"구멍이 웃는 걸 봤다\""], ["파라솔 실종 사건", "바다만 남았다"], ["눈사람 무더기 실종", "눈 마을, 이제 그냥 눈"], ["\"누가 먹었나\" 조사 시작", "범인은 구멍, 반성 없음"], ["간판이 줄줄이 꺼졌다", "정전인 줄 알았는데 도시가 없다"], ["블록 하나가 모자라다", "\"방 치웠니?\" \"응.\""], ["버섯 따러 갔는데 바구니가 비었다", "버섯 숲, 버섯 0개"], ["물고기 \"집이 없어졌어요\"", "바닷속도 안전하지 않다"], ["공룡도 무서워할 놈 나타남", "멸종, 두 번째"], ["호박 하나가 사라졌다, 장난인 줄", "할로윈 취소"]], "en": [["Bakery reported missing", "Mayor: \"I saw the hole smile.\""], ["Beach umbrellas go missing", "Only the sea is left"], ["Snowmen vanish in bulk", "Snow Village is now just snow"], ["Candy Land asks: who ate it?", "Culprit: a hole. No regrets."], ["Neon signs go dark", "Blackout? No, the city is gone"], ["One block is missing", "\"Did you clean your room?\" \"Yes.\""], ["Mushroom pickers come home empty", "Mushroom Woods: zero mushrooms"], ["Fish: \"Our house is gone!\"", "Not even the deep sea is safe"], ["Something even dinosaurs fear", "Extinction, part two"], ["A pumpkin vanished. A prank?", "Halloween cancelled"]], "es": [["Denuncian la desaparición de una panadería", "El alcalde: «Vi sonreír al agujero»"], ["Desaparecen las sombrillas de la playa", "Solo queda el mar"], ["Muñecos de nieve desaparecen en masa", "Aldea Nevada ya es solo nieve"], ["Tierra Dulce investiga: ¿quién se lo comió?", "Culpable: un agujero. Sin remordimientos."], ["Los letreros de neón se apagan uno tras otro", "¿Apagón? No, la ciudad ya no está"], ["Falta un bloque", "«¿Ordenaste tu cuarto?» «Sí.»"], ["Los recolectores vuelven con la cesta vacía", "Bosque de Setas: cero setas"], ["Peces: «¡Nuestra casa desapareció!»", "Ni el fondo del mar es seguro"], ["Apareció algo que asusta hasta a los dinosaurios", "Extinción, segunda parte"], ["Desapareció una calabaza. ¿Una broma?", "Halloween cancelado"]], "pt": [["Padaria dada como desaparecida", "Prefeito: \"Eu vi o buraco sorrir.\""], ["Guarda-sóis desaparecem da praia", "Só sobrou o mar"], ["Bonecos de neve somem aos montes", "Vila da Neve agora é só neve"], ["Terra Doce pergunta: quem comeu?", "Culpado: um buraco. Sem remorso."], ["Letreiros de neon se apagam um a um", "Apagão? Não, a cidade sumiu"], ["Está faltando um bloco", "\"Arrumou o quarto?\" \"Arrumei.\""], ["Catadores de cogumelos voltam de cesta vazia", "Floresta dos Cogumelos: zero cogumelos"], ["Peixes: \"Nossa casa sumiu!\"", "Nem o fundo do mar é seguro"], ["Surge algo que até dinossauros temem", "Extinção, parte dois"], ["Uma abóbora sumiu. Brincadeira?", "Halloween cancelado"]], "ru": [["Пропала пекарня", "Мэр: «Я видел, как дыра улыбнулась»"], ["Пропадают пляжные зонтики", "Осталось только море"], ["Снеговики исчезают толпами", "Снежная деревня — теперь просто снег"], ["Страна сладостей: кто это съел?", "Виновник: дыра. Не раскаивается."], ["Неоновые вывески гаснут одна за другой", "Отключение? Нет, города больше нет"], ["Не хватает одного кубика", "«Убрал комнату?» — «Да.»"], ["Грибники вернулись с пустыми корзинами", "Грибной лес: ноль грибов"], ["Рыбы: «Наш дом пропал!»", "Даже на дне моря небезопасно"], ["Появилось то, чего боятся даже динозавры", "Вымирание, часть вторая"], ["Пропала тыква. Розыгрыш?", "Хэллоуин отменён"]], "tr": [["Fırın kayıp ihbarı", "Belediye başkanı: \"Deliğin gülümsediğini gördüm.\""], ["Plaj şemsiyeleri kayboluyor", "Geriye sadece deniz kaldı"], ["Kardan adamlar topluca kayboldu", "Kar Köyü artık sadece kar"], ["Şeker Diyarı soruyor: Kim yedi?", "Suçlu: bir delik. Pişman değil."], ["Neon tabelalar birer birer sönüyor", "Elektrik mi kesildi? Hayır, şehir yok"], ["Bir blok eksik", "\"Odanı topladın mı?\" \"Evet.\""], ["Mantar toplayanlar eli boş döndü", "Mantar Ormanı: sıfır mantar"], ["Balıklar: \"Evimiz gitti!\"", "Denizin dibi bile güvenli değil"], ["Dinozorların bile korktuğu bir şey çıktı", "Yok oluş, ikinci bölüm"], ["Bir balkabağı kayboldu. Şaka mı?", "Cadılar Bayramı iptal"]], "de": [["Bäckerei als vermisst gemeldet", "Bürgermeister: „Ich sah das Loch lächeln.“"], ["Sonnenschirme verschwinden", "Nur das Meer ist übrig"], ["Schneemänner verschwinden reihenweise", "Schneedorf ist jetzt nur noch Schnee"], ["Süßigkeitenland fragt: Wer hat’s gegessen?", "Täter: ein Loch. Keine Reue."], ["Neonschilder gehen eins nach dem anderen aus", "Stromausfall? Nein, die Stadt ist weg"], ["Ein Bauklotz fehlt", "„Zimmer aufgeräumt?“ „Ja.“"], ["Pilzsammler kommen mit leeren Körben heim", "Pilzwald: null Pilze"], ["Fische: „Unser Haus ist weg!“", "Nicht mal die Tiefsee ist sicher"], ["Etwas, vor dem sogar Dinos Angst haben", "Aussterben, Teil zwei"], ["Ein Kürbis ist weg. Ein Streich?", "Halloween abgesagt"]], "fr": [["Une boulangerie portée disparue", "Le maire : « J’ai vu le trou sourire. »"], ["Les parasols disparaissent", "Il ne reste que la mer"], ["Les bonshommes de neige disparaissent en masse", "Village Neige n’est plus que de la neige"], ["Pays Bonbon enquête : qui l’a mangé ?", "Coupable : un trou. Aucun remords."], ["Les enseignes au néon s’éteignent une à une", "Panne ? Non, la ville a disparu"], ["Il manque un cube", "« Tu as rangé ta chambre ? » « Oui. »"], ["Les cueilleurs rentrent panier vide", "Bois des Champignons : zéro champignon"], ["Les poissons : « Notre maison a disparu ! »", "Même le fond de la mer n’est pas sûr"], ["Quelque chose fait peur même aux dinosaures", "Extinction, deuxième partie"], ["Une citrouille a disparu. Une farce ?", "Halloween annulé"]], "ja": [["パン屋がまるごと消えたと通報", "町長「穴が笑うのを見た」"], ["パラソル失踪事件", "海だけが残った"], ["雪だるまが大量に失踪", "雪の村、いまはただの雪"], ["「だれが食べた？」調査開始", "犯人は穴。反省なし"], ["看板が次々に消えた", "停電かと思ったら町がない"], ["ブロックがひとつ足りない", "「部屋片づけた？」「うん」"], ["キノコ狩りに行ったらカゴが空っぽ", "キノコの森、キノコ0本"], ["魚「家がなくなりました」", "海の底も安全じゃない"], ["恐竜もこわがるものが現れた", "絶滅、ふたたび"], ["かぼちゃがひとつ消えた。いたずら？", "ハロウィン中止"]], "zh": [["有人报案：面包店整个不见了", "镇长：“我看见那个洞在笑。”"], ["遮阳伞失踪事件", "只剩下大海了"], ["雪人成批失踪", "雪村，现在只剩雪了"], ["糖果国开始调查：谁吃的？", "凶手：一个洞。毫无悔意。"], ["霓虹招牌一个接一个熄灭", "以为停电了，其实城市没了"], ["少了一块积木", "“房间收拾了吗？”“收拾了。”"], ["去采蘑菇，篮子却是空的", "蘑菇森林：蘑菇0个"], ["鱼：“我们的家不见了！”", "连海底也不安全"], ["出现了连恐龙都怕的东西", "灭绝，第二次"], ["一个南瓜不见了，是恶作剧？", "万圣节取消"]]}
const LANGUAGES = { en: 'English', ko: '한국어', es: 'Español', pt: 'Português', ru: 'Русский', tr: 'Türkçe', de: 'Deutsch', fr: 'Français', ja: '日本語', zh: '简体中文' }
const LANG_KEYS = Object.keys(LANGUAGES)
let lang = 'en'
// leaderboard words (Playgama SaaS leaderboards top_score / biggest_hole, 11-09)
const RANK_TEXT = {
  en: ['Leaderboard', 'Best score', 'Biggest hole', 'You'], ko: ['랭킹', '최고 점수', '가장 큰 구멍', '나'],
  es: ['Clasificación', 'Mejor puntuación', 'Agujero más grande', 'Tú'], pt: ['Ranking', 'Melhor pontuação', 'Maior buraco', 'Você'],
  ru: ['Рейтинг', 'Лучший счёт', 'Самая большая дыра', 'Вы'], tr: ['Sıralama', 'En iyi skor', 'En büyük delik', 'Sen'],
  de: ['Rangliste', 'Bestwert', 'Größtes Loch', 'Du'], fr: ['Classement', 'Meilleur score', 'Plus grand trou', 'Toi'],
  ja: ['ランキング', 'ベストスコア', 'いちばん大きい穴', 'あなた'], zh: ['排行榜', '最高分', '最大的洞', '你'],
}
// an empty board invites the first record (11-14 user: per-town boards start empty)
const NO_RECORD = { en: 'Be the first to set a record!', ko: '첫 기록을 남겨 보세요!', es: '¡Marca el primer récord!', pt: 'Marque o primeiro recorde!', ru: 'Поставь первый рекорд!', tr: 'İlk rekoru sen kır!', de: 'Stell den ersten Rekord auf!', fr: 'Établis le premier record !', ja: '最初の記録を残そう!', zh: '来创下第一个纪录吧!' }
// biggest hole is one board for every town: its title says so (11-14 user "전체")
const RANK_ALL = { en: 'All towns', ko: '전체', es: 'Todos', pt: 'Geral', ru: 'Все города', tr: 'Tümü', de: 'Alle Orte', fr: 'Toutes les villes', ja: '全体', zh: '全部' }
// today's goals + in-run cards (11-11 user "1,2,3 하자")
const MORE_TEXT = {
  en: { goals: "Today's goals", gSize: 'Reach size {n}', gStars: 'Get ★{n} in {t}', gRuns: 'Play {n} runs', gEat: 'Swallow {n} things in one run', gFrenzy: 'Swallow {n} things in a frenzy', goalDone: 'Goal done!', pick: 'Pick one!', combo: 'Combo', grow: 'Growth' },
  ko: { goals: '오늘의 목표', gSize: '크기 {n} 찍기', gStars: '{t} 별 {n}개', gRuns: '{n}판 하기', gEat: '한 판에 {n}개 삼키기', gFrenzy: '폭주 중에 {n}개 삼키기', goalDone: '목표 달성!', pick: '하나 고르기!', combo: '콤보', grow: '성장' },
  es: { goals: 'Metas de hoy', gSize: 'Llega a tamaño {n}', gStars: 'Consigue ★{n} en {t}', gRuns: 'Juega {n} partidas', gEat: 'Traga {n} cosas en una partida', gFrenzy: 'Traga {n} cosas en el frenesí', goalDone: '¡Meta cumplida!', pick: '¡Elige una!', combo: 'Combo', grow: 'Crecimiento' },
  pt: { goals: 'Metas de hoje', gSize: 'Chegue ao tamanho {n}', gStars: 'Ganhe ★{n} em {t}', gRuns: 'Jogue {n} partidas', gEat: 'Engula {n} coisas numa partida', gFrenzy: 'Engula {n} coisas no frenesi', goalDone: 'Meta cumprida!', pick: 'Escolha uma!', combo: 'Combo', grow: 'Crescimento' },
  ru: { goals: 'Цели на сегодня', gSize: 'Достигни размера {n}', gStars: '★{n}: {t}', gRuns: 'Сыграй {n} раза', gEat: 'Проглоти {n} за одну игру', gFrenzy: 'Проглоти {n} в обжорстве', goalDone: 'Цель выполнена!', pick: 'Выбери одну!', combo: 'Комбо', grow: 'Рост' },
  tr: { goals: 'Bugünün hedefleri', gSize: '{n} boyuta ulaş', gStars: '{t}: ★{n} kazan', gRuns: '{n} oyun oyna', gEat: 'Bir oyunda {n} şey yut', gFrenzy: 'Çılgınlıkta {n} şey yut', goalDone: 'Hedef tamam!', pick: 'Birini seç!', combo: 'Kombo', grow: 'Büyüme' },
  de: { goals: 'Ziele für heute', gSize: 'Erreiche Größe {n}', gStars: 'Hol ★{n} in {t}', gRuns: 'Spiele {n} Runden', gEat: 'Verschlucke {n} Dinge in einer Runde', gFrenzy: 'Verschlucke {n} Dinge im Fressrausch', goalDone: 'Ziel geschafft!', pick: 'Wähle eine!', combo: 'Combo', grow: 'Wachstum' },
  fr: { goals: 'Objectifs du jour', gSize: 'Atteins la taille {n}', gStars: 'Obtiens ★{n} à {t}', gRuns: 'Joue {n} parties', gEat: 'Avale {n} choses en une partie', gFrenzy: 'Avale {n} choses en frénésie', goalDone: 'Objectif atteint !', pick: 'Choisis-en une !', combo: 'Combo', grow: 'Croissance' },
  ja: { goals: '今日の目標', gSize: 'サイズ{n}になる', gStars: '{t}で★{n}', gRuns: '{n}回プレイ', gEat: '1回で{n}個飲みこむ', gFrenzy: '大食いタイムで{n}個', goalDone: '目標達成!', pick: 'ひとつ選ぼう!', combo: 'コンボ', grow: '成長' },
  zh: { goals: '今日目标', gSize: '达到大小{n}', gStars: '在{t}拿到★{n}', gRuns: '玩{n}局', gEat: '一局吞下{n}个', gFrenzy: '暴食时刻吞下{n}个', goalDone: '目标达成!', pick: '选一张!', combo: '连击', grow: '成长' },
}
for (const [code, words] of Object.entries(MORE_TEXT)) Object.assign(TEXT[code], words)
// spit-shot damage meter (11-14 user "끝에 뱉어 쏘기는 대표 건물에 먹은거 데미지 측정기")
const SHOT_TEXT = {
  en: { dmg: 'DAMAGE', dmgRun: 'Damage this run {n}', skip: 'Tap to skip' }, ko: { dmg: '데미지', dmgRun: '이번 데미지 {n}', skip: '탭해서 건너뛰기' },
  es: { dmg: 'DAÑO', dmgRun: 'Daño de esta partida {n}', skip: 'Toca para saltar' }, pt: { dmg: 'DANO', dmgRun: 'Dano desta partida {n}', skip: 'Toque para pular' },
  ru: { dmg: 'УРОН', dmgRun: 'Урон за игру {n}', skip: 'Нажми, чтобы пропустить' }, tr: { dmg: 'HASAR', dmgRun: 'Bu oyunun hasarı {n}', skip: 'Geçmek için dokun' },
  de: { dmg: 'SCHADEN', dmgRun: 'Schaden dieser Runde {n}', skip: 'Tippen zum Überspringen' }, fr: { dmg: 'DÉGÂTS', dmgRun: 'Dégâts de la partie {n}', skip: 'Touche pour passer' },
  ja: { dmg: 'ダメージ', dmgRun: '今回のダメージ {n}', skip: 'タップでスキップ' }, zh: { dmg: '伤害', dmgRun: '本局伤害 {n}', skip: '点击跳过' },
}
for (const [code, words] of Object.entries(SHOT_TEXT)) Object.assign(TEXT[code], words)
// the landmark's health opens the next town (11-14): lock line, the fall, the title card's bar, the per-town board reads as damage
const LAND_TEXT = {
  en: { collapse: 'TOPPLED!', lockedBy: 'Topple the landmark\nof {t} to open', landmark: 'Landmark', rankScore: 'Best damage' },
  ko: { collapse: '무너졌다!', lockedBy: '{t} 대표 건물을\n무너뜨리면 열려요', landmark: '대표 건물', rankScore: '최고 데미지' },
  es: { collapse: '¡DERRIBADO!', lockedBy: 'Derriba el monumento\nde {t} para abrir', landmark: 'Monumento', rankScore: 'Mejor daño' },
  pt: { collapse: 'DERRUBADO!', lockedBy: 'Derrube o monumento\nde {t} para abrir', landmark: 'Monumento', rankScore: 'Melhor dano' },
  ru: { collapse: 'РУХНУЛО!', lockedBy: 'Обрушь главное здание:\n{t}', landmark: 'Главное здание', rankScore: 'Лучший урон' },
  tr: { collapse: 'YIKILDI!', lockedBy: '{t} simge yapısını\nyık, açılsın', landmark: 'Simge yapı', rankScore: 'En iyi hasar' },
  de: { collapse: 'EINGESTÜRZT!', lockedBy: 'Stürze das Wahrzeichen\nvon {t}', landmark: 'Wahrzeichen', rankScore: 'Bester Schaden' },
  fr: { collapse: 'EFFONDRÉ !', lockedBy: 'Abats le monument\nde {t} pour ouvrir', landmark: 'Monument', rankScore: 'Meilleurs dégâts' },
  ja: { collapse: 'くずれた!', lockedBy: '{t}のシンボルを\nくずすと開く', landmark: 'シンボル', rankScore: 'ベストダメージ' },
  zh: { collapse: '倒塌了!', lockedBy: '推倒{t}的地标\n即可解锁', landmark: '地标', rankScore: '最高伤害' },
}
const HOLE_TEXT = {
  en: { hBasic: 'Basic', hTwin: 'Twin', hTail: 'Tail', hSlide: 'Slide', hShape: 'Shape', hColor: 'Color', tryAd: 'AD 1 run', hNeed: 'Topple {t}' },
  ko: { hBasic: '기본', hTwin: '쌍둥이', hTail: '꼬리', hSlide: '미끄럼', hShape: '모양', hColor: '색', tryAd: '광고 1판', hNeed: '{t} 붕괴' },
  es: { hBasic: 'Básico', hTwin: 'Gemelo', hTail: 'Cola', hSlide: 'Patín', hShape: 'Forma', hColor: 'Color', tryAd: 'AD 1 vez', hNeed: 'Derriba {t}' },
  pt: { hBasic: 'Básico', hTwin: 'Gêmeo', hTail: 'Cauda', hSlide: 'Desliza', hShape: 'Forma', hColor: 'Cor', tryAd: 'AD 1 vez', hNeed: 'Derrube {t}' },
  ru: { hBasic: 'Обычная', hTwin: 'Двойня', hTail: 'Хвост', hSlide: 'Скольз', hShape: 'Форма', hColor: 'Цвет', tryAd: 'AD 1 раз', hNeed: 'Обрушь: {t}' },
  tr: { hBasic: 'Temel', hTwin: 'İkiz', hTail: 'Kuyruk', hSlide: 'Kaygan', hShape: 'Şekil', hColor: 'Renk', tryAd: 'AD 1 tur', hNeed: '{t} yıkılsın' },
  de: { hBasic: 'Normal', hTwin: 'Zwilling', hTail: 'Schweif', hSlide: 'Rutsch', hShape: 'Form', hColor: 'Farbe', tryAd: 'AD 1 Runde', hNeed: 'Stürze {t}' },
  fr: { hBasic: 'Simple', hTwin: 'Jumeau', hTail: 'Traîne', hSlide: 'Glisse', hShape: 'Forme', hColor: 'Couleur', tryAd: 'PUB 1 partie', hNeed: 'Abats {t}' },
  ja: { hBasic: 'ふつう', hTwin: 'ふたご', hTail: 'しっぽ', hSlide: 'すべり', hShape: 'かたち', hColor: 'いろ', tryAd: '広告で1回', hNeed: '{t}をくずす' },
  zh: { hBasic: '普通', hTwin: '双胞胎', hTail: '尾巴', hSlide: '滑行', hShape: '形状', hColor: '颜色', tryAd: '广告试1局', hNeed: '推倒{t}' },
}
for (const [code, words] of Object.entries(RANK_TEXT)) { ['rank', 'rankScore', 'rankHole', 'you'].forEach((key, i) => { TEXT[code][key] = words[i] }); TEXT[code].noRecord = NO_RECORD[code]; TEXT[code].rankAll = RANK_ALL[code] }
for (const [code, words] of Object.entries(HOLE_TEXT)) Object.assign(TEXT[code], words)
for (const [code, words] of Object.entries(LAND_TEXT)) Object.assign(TEXT[code], words)
// daily reward (7 days) and the landmark trophy shelf (11-23 총괄: come back another day, keep what you toppled)
const ATT_TEXT = {
  en: { attTitle: 'Daily reward', attDay: 'Day {n}', attClaim: 'Claim', attNeed: 'Day 7 reward', trophyNew: 'New trophy!' },
  ko: { attTitle: '출석 보상', attDay: '{n}일', attClaim: '받기', attNeed: '출석 7일', trophyNew: '새 트로피!' },
  es: { attTitle: 'Premio diario', attDay: 'Día {n}', attClaim: 'Recoger', attNeed: 'Premio día 7', trophyNew: '¡Nuevo trofeo!' },
  pt: { attTitle: 'Prêmio diário', attDay: 'Dia {n}', attClaim: 'Pegar', attNeed: 'Prêmio dia 7', trophyNew: 'Novo troféu!' },
  ru: { attTitle: 'Награда дня', attDay: '{n}-й', attClaim: 'Забрать', attNeed: 'Награда 7 дня', trophyNew: 'Новый трофей!' },
  tr: { attTitle: 'Günlük ödül', attDay: '{n}. gün', attClaim: 'Al', attNeed: '7. gün ödülü', trophyNew: 'Yeni kupa!' },
  de: { attTitle: 'Tagesbonus', attDay: 'Tag {n}', attClaim: 'Holen', attNeed: 'Bonus Tag 7', trophyNew: 'Neue Trophäe!' },
  fr: { attTitle: 'Cadeau du jour', attDay: 'Jour {n}', attClaim: 'Prendre', attNeed: 'Cadeau jour 7', trophyNew: 'Nouveau trophée !' },
  ja: { attTitle: 'ログインボーナス', attDay: '{n}日目', attClaim: '受け取る', attNeed: '7日目の報酬', trophyNew: '新しいトロフィー!' },
  zh: { attTitle: '每日签到', attDay: '第{n}天', attClaim: '领取', attNeed: '签到第7天', trophyNew: '新奖杯!' },
}
for (const [code, words] of Object.entries(ATT_TEXT)) Object.assign(TEXT[code], words)
const t = (key) => TEXT[lang][key] ?? key

// ---------------------------------------------------------------- save
const SAVE_KEY = 'gulp_town'
const save = { gold: 0, runs: 0, town: 0, stars: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0], best: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0], up: { time: 0, speed: 0, start: 0, magnet: 0, gold: 0 }, skin: 0, skins: [0], bigR: 0, bestSize: 0, bestEat: 0, bestFrenzy: 0, goals: null, goalsSeen: -1, played: [], hole: 0, dmg: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0], fallen: [], lmRuns: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0], ver: 0, att: null, seen: [], news: [], music: 0.6, sfx: 0.9, shake: 1, lang: '' }
save.seen = Array.from({ length: 10 }, () => []); save.news = Array(10).fill(0)
let saveTimer = 0
// third place for the save: IndexedDB. iPhone Safari empties a portal frame's localStorage when the tab closes (user 11-16
// "아이폰 사파리는 들어가면 새것처럼"), so the save is also kept here and the newest copy wins.
const idb = {
  // 11-21: index.html opens the store while the game files download (a first open took ~1 s of the loading screen); later calls reuse it
  open() { return (this.db ??= (window.__idbOpen || Promise.resolve(null)).then((db) => db || this.fresh())) },
  fresh() { return new Promise((res) => { try { const r = indexedDB.open(SAVE_KEY, 1); r.onupgradeneeded = () => r.result.createObjectStore('kv'); r.onsuccess = () => res(r.result); r.onerror = r.onblocked = () => res(null); setTimeout(() => res(null), 1500) } catch { res(null) } }) },
  async get(k) { const db = await this.open(); if (!db) return null; return new Promise((res) => { try { const q = db.transaction('kv').objectStore('kv').get(k); q.onsuccess = () => res(q.result ?? null); q.onerror = () => res(null); setTimeout(() => res(null), 1500) } catch { res(null) } }) },
  async set(k, v) { const db = await this.open(); if (!db) return; try { db.transaction('kv', 'readwrite').objectStore('kv').put(v, k) } catch {} },
}
try { navigator.storage?.persist?.().catch(() => {}) } catch {}
function writeSave() {
  clearTimeout(saveTimer)
  saveTimer = setTimeout(() => {
    save.savedAt = Date.now()
    const text = JSON.stringify(save)
    if (window.bridge?.storage) window.bridge.storage.set(SAVE_KEY, text).catch(() => {})
    try { localStorage.setItem(SAVE_KEY, text) } catch {}
    idb.set(SAVE_KEY, text)
  }, 300)
}
async function readSave() {
  const found = []
  const take = (v) => { if (typeof v !== 'string' || !v) return; let at = 1; try { at = JSON.parse(v).savedAt || 1 } catch {}; found.push({ v, at }) }
  try { if (window.bridge?.storage) take(await window.bridge.storage.get(SAVE_KEY, false)) } catch {}
  try { take(localStorage.getItem(SAVE_KEY)) } catch {}
  take(await idb.get(SAVE_KEY))
  if (!found.length) return
  found.sort((a, b) => b.at - a.at)
  const text = found[0].v
  try {
    const old = JSON.parse(text)
    Object.assign(save, old, { up: { ...save.up, ...old.up } })
    // saves from the five-town version have five slots: fill the new towns with 0 (undefined < 1 unlocked them)
    for (const key of ['stars', 'best', 'dmg', 'lmRuns']) save[key] = Array.from({ length: 10 }, (_, i) => +save[key]?.[i] || 0)
    save.town = clamp(+save.town || 0, 0, 9)
    if (!Array.isArray(save.played)) save.played = []
    save.fallen = Array.isArray(save.fallen) ? save.fallen.filter((x) => Number.isInteger(x)) : []
    save.seen = Array.from({ length: 10 }, (_, i) => Array.isArray(save.seen?.[i]) ? save.seen[i].filter((x) => typeof x === 'string') : [])
    save.news = Array.from({ length: 10 }, (_, i) => +save.news?.[i] || 0)
  } catch {}
}

// ---------------------------------------------------------------- platform
const platform = {
  ready: false, audioOn: true, paused: false, adOpen: false,
  message(name) { try { window.bridge?.platform?.sendMessage(name) } catch {} },
  // Playgama custom events (progress record, 11-10 user "지표로 삼아서 나중에 더 잘하려고"): fixed names, bounded values, no personal data.
  // The console line is what gamedev-kit/tools/telemetry_probe.mjs reads.
  track(name, data = {}) {
    if (BOT || RENDER) return
    const d = { build_version: BUILD, ...data }
    console.log(`Playgama: event ${name} ${JSON.stringify(d)}`)
    if (this.ready) try { window.bridge.analytics?.send(name, d) } catch {}
  },
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
    // 11-28: the portal pauses the game when an ad opens and may never send the resume; the ad closing ends that pause
    if (state === 'closed' || state === 'failed') { this.adOpen = false; this.paused = false; applyVolume(); this.afterAd() }
  },
  rewardDone: null, rewarded: false,
  onReward(state) {
    if (state === 'opened') { this.adOpen = true; applyVolume() }
    if (state === 'rewarded') this.rewarded = true
    if (state === 'closed' || state === 'failed') {
      this.adOpen = false; this.paused = false; applyVolume() // 11-28 user: the helper came and the run froze (pause kept after the ad)
      const done = this.rewardDone; this.rewardDone = null
      // a 'rewarded' that arrives just after 'closed' still counts (portal order differs, 11-21 AI Invasion / Pocha)
      const end = () => { const ok = this.rewarded; this.rewarded = false; done?.(ok) }
      if (state === 'closed' && !this.rewarded && done) setTimeout(end, 500); else end()
    }
  },
  // At most one full-screen ad per 5 minutes, from the 4th run on (11-08: 0.78 ads a run against a 0.30 goal, 44% left after one); a rewarded ad also resets the clock.
  lastAd: 0, // 11-21 user "4판짼데도 안떠": no 5-min wait from page load, only after an ad
  // Shown when the player presses Again (not on the result screen: 47% closed the game after that ad in Gulp, 11-05; not on Home:
  // 11-16 user "대기실로 가려고 눌렀는데 광고 뜨는거 맞아???"). The next run is on screen at once, behind the ad, and its clock
  // waits (game.adHold) until the ad closes, so the result screen never lingers after the ad.
  adNext: null,
  afterAd() { const next = this.adNext; this.adNext = null; clearTimeout(this.adWait); next?.() },
  interstitial(next) {
    if (!this.ready || save.runs < 2 || Date.now() - this.lastAd < 180000) { next(); return }
    this.lastAd = Date.now(); next(); game.adHold = true; this.adNext = () => { game.adHold = false }
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
    this.rewardDone = done; this.rewarded = false; this.lastAd = Date.now()
    try { window.bridge.advertisement.showRewarded() } catch { this.rewardDone = null; done(false) }
  },
}

// ---------------------------------------------------------------- performance sample (Playgama telemetry guide)
const perf = {
  frames: [], active: 0, start: 0, prev: false, errors: 0, rejects: 0,
  // called every animation frame with the real gap since the last one; a frame counts only if the one before was also gameplay,
  // so the gap after a pause, an ad, a menu or a hidden tab never becomes a frozen frame
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
        is_test: !!TURBO || /[?&](bench|heavy|screen|turbo|shot)/.test(location.search),
        ...(mem ? { memory_used_mb: Math.round(mem.usedJSHeapSize / 1048576), memory_measurement_supported: true, memory_measurement_type: 'js_heap' } : { memory_measurement_supported: false }),
      })
    }
    this.frames = []; this.active = 0; this.start = 0; this.errors = 0; this.rejects = 0
  },
}
addEventListener('error', () => { perf.errors++ })
addEventListener('unhandledrejection', () => { perf.rejects++ })

// ---------------------------------------------------------------- leaderboards
// Playgama SaaS leaderboards (playgama-bridge-config.json): in_game = we draw the top 10, native_popup = the portal's own window,
// native = scores only, not_available or any error = no button. The beta can be off: the game never waits on it.
// ?fakerank: test the in_game window without the portal.
// biggest_hole keeps the radius x10; it is shown like the HUD shows hole size ('SIZE 21'), counted from the base radius 1
// best score is one board per town since 11-14 (user: towns differ too much for one board): top_score_town1..10, made with the
// Playgama MCP; the old mixed top_score board is no longer read or sent. Biggest hole stays one board for all towns.
const BOARDS = [{ town: true, key: 'rankScore', show: (v) => Math.round(v).toLocaleString('en-US') }, { id: 'biggest_hole', key: 'rankHole', show: (v) => `${t('size')} ${sizeOf(v / 10, 1)}` }]
const boardId = (tab, town = save.town) => BOARDS[tab].town ? `top_score_town${town + 1}` : BOARDS[tab].id
// the title names what the board ranks: the selected town, or all towns for the hole
const rankScope = (tab) => `${t('rank')} · ${BOARDS[tab].town ? TOWN_NAMES[lang][save.town] : t('rankAll')}`
const ranks = {
  tab: 0, cache: {}, sent: {}, fakeSent: {},
  type() {
    if (Q.has('fakerank')) return 'in_game'
    try { return platform.ready ? window.bridge.leaderboards?.type || 'not_available' : 'not_available' } catch { return 'not_available' }
  },
  send(score, radius) {
    this.cache = {} // ask again after a new score
    if (this.type() === 'not_available' || Q.has('fakerank')) return
    const values = [Math.round(score), Math.round(radius * 10)]
    BOARDS.forEach((b, i) => { try { window.bridge.leaderboards.setScore(boardId(i), values[i])?.catch?.(() => {}) } catch {} })
    platform.track('leaderboard_submitted', { town_id: save.town })
  },
  canShow() { const type = this.type(); return type === 'in_game' || type === 'native_popup' },
  // entries asked at most once a minute per board (and again after a run sends a score)
  entries(id) {
    const c = this.cache[id]; if (c && performance.now() - c.at < 60000) return c.ask
    let ask
    if (Q.has('fakerank')) {
      const n = Q.get('fakerank'), names = ['Mochi', 'Captain Crunch', 'Abcdefghijklmnopqrstu', 'Lena', 'Kenji', 'Zoë', 'Pablo', 'Ivan', 'Mia', 'Tom', 'Olga', 'Rui']
      // ?fakerank = I am 4th, ?fakerank=out = I am 12th, ?fakerank=empty = nobody yet,
      // ?fakerank=gone = my row is missing (live 11-14: device best above 1st) and sending fails, ?fakerank=send = missing but sending works
      // town boards differ: names rotate and scores scale with the town number, so two towns never look alike in the pictures
      const gone = n === 'gone' || n === 'send', HOLES = [177, 96, 78, 74, 69, 63, 60, 55, 51, 48, 44, 40], score = id !== 'biggest_hole'
      const k = score ? +id.replace(/\D/g, '') - 1 : 0, f = 1 + k * 0.37, nm = names.map((_, i) => names[(i + k * 5) % names.length])
      let rows = n === 'empty' ? [] : nm.map((name, i) => ({ id: !gone && i === (n === 'out' ? 11 : 3) ? 'me' : 'p' + i, name, score: score ? Math.round((gone ? 248345 - i * 17391 : 98765 - i * 7391) * f) : gone ? HOLES[i] : 312 - i * 21, rank: i + 1 }))
      if (this.fakeSent[id]) rows = [...rows, { id: 'me', name: '', score: this.fakeSent[id] }].sort((a, b) => b.score - a.score).map((r, i) => ({ ...r, rank: i + 1 }))
      ask = Promise.resolve(rows)
    } else { try { ask = Promise.resolve(window.bridge.leaderboards.getEntries(id)) } catch { ask = Promise.reject(new Error('no board')) } }
    this.cache[id] = { at: performance.now(), ask }; ask.catch(() => { delete this.cache[id] })
    return ask
  },
  myId() { if (Q.has('fakerank')) return 'me'; try { return window.bridge.player?.id ?? null } catch { return null } },
  // my best from this device, for my own line when the board does not send my row
  // bigR only exists since 9e6fe88 (after the boards): older saves fall back to the best HUD size (its smallest radius)
  // best score: this town's device best (save.best is kept per town since day one, so records from before the town boards land
  // on their own town's board through resend() the first time that board is shown)
  local(tab) { return tab ? Math.max(Math.round((+save.bigR || 0) * 10), save.bestSize > 1 ? Math.ceil((1 + (save.bestSize - 1) * 0.8) * 10) : 0) : Math.max(0, +save.best[save.town] || 0) },
  canSend(me) { return me !== null && this.type() !== 'not_available' && (!Q.has('fakerank') || Q.get('fakerank') === 'send') },
  // my device best is above my row on the board (or I have no row): send it again once per value, then draw the board again
  resend(id, value, again) {
    if ((this.sent[id] || 0) >= value) return
    this.sent[id] = value
    let ask
    if (Q.has('fakerank')) { this.fakeSent[id] = value; ask = Promise.resolve() } else { try { ask = Promise.resolve(window.bridge.leaderboards.setScore(id, value)) } catch (e) { ask = Promise.reject(e) } }
    ask.then(() => { delete this.cache[id]; again() }).catch(() => {})
  },
  line(rank, name, value, me) {
    const li = document.createElement('li'); if (me) li.className = 'me'
    li.innerHTML = '<i></i><span></span><b></b>'
    li.children[0].textContent = rank; li.children[1].textContent = name; li.children[2].textContent = value
    return li
  },
  // top 10; my row is yellow with '(me)'. My device best above my board row (or no row) is sent again; until the board has it
  // (guest, no portal, send failed) my line is put where that score belongs, so a best above 1st is never left outside the list.
  // mine.dataset.show: 'out' = I am below 10th (always shown), 'fold' = 4th-10th (shown only while the phone board shows 3 rows)
  fill(list, mine, tab) {
    const board = BOARDS[tab], id = boardId(tab), me = this.myId(), you = t('you'), named = (n) => n ? `${n} (${you})` : you
    list.replaceChildren(this.line('', '...', '')); mine.replaceChildren(); mine.dataset.show = ''; list.dataset.board = id
    this.entries(id).then((all) => {
      if (list.dataset.board !== id || list.dataset.tab !== String(tab)) return
      all = all || []
      const isMe = (r) => me !== null && String(r.id) === String(me)
      const row = all.find(isMe), local = this.local(tab), server = row ? +row.score || 0 : 0
      if (local > server && this.canSend(me)) this.resend(id, local, () => { if (list.dataset.board === id && list.dataset.tab === String(tab) && list.isConnected) this.fill(list, mine, tab) })
      let shown, at, outRank
      if (row && server >= local) { // the board has my best: its own order and ranks
        shown = all.slice(0, 10).map((r, i) => ({ rank: r.rank ?? i + 1, name: isMe(r) ? named(r.name) : r.name || '?', value: +r.score || 0, me: isMe(r) }))
        at = shown.findIndex((r) => r.me); outRank = row.rank ?? all.indexOf(row) + 1
      } else if (local > 0) { // my device best goes where it belongs among the others
        const others = all.filter((r) => !isMe(r)), place = others.filter((r) => (+r.score || 0) >= local).length
        let name = row?.name; try { name = name || (me !== null && window.bridge.player?.name) || '' } catch {}
        const merged = others.map((r) => ({ name: r.name || '?', value: +r.score || 0, me: false }))
        merged.splice(place, 0, { name: named(name), value: local, me: true })
        shown = merged.slice(0, 10).map((r, i) => ({ ...r, rank: i + 1 })); at = place < 10 ? place : -1; outRank = place + 1
      } else { shown = all.slice(0, 10).map((r, i) => ({ rank: r.rank ?? i + 1, name: r.name || '?', value: +r.score || 0, me: false })); at = -1; outRank = 0 }
      if (!shown.length) { const li = this.line('', t('noRecord'), ''); li.className = 'none'; list.replaceChildren(li); return }
      list.replaceChildren(...shown.map((r) => this.line(r.rank, r.name, board.show(r.value), r.me)))
      if (at >= 3) { const r = shown[at]; mine.replaceChildren(this.line(r.rank, r.name, board.show(r.value), true)); mine.dataset.show = 'fold' }
      else if (at < 0 && outRank) { mine.replaceChildren(this.line(outRank, row ? named(row.name) : you, board.show(Math.max(server, local)), true)); mine.dataset.show = 'out' }
    }).catch(() => { const li = this.line('', t('noRecord'), ''); li.className = 'none'; list.replaceChildren(li) })
  },
  tabs(host, tab, go) {
    host.innerHTML = BOARDS.map((b, i) => `<button class="${i === tab ? 'on' : ''}" data-i="${i}">${t(b.key)}</button>`).join('')
    host.onclick = (e) => { const b = e.target.closest('button'); if (!b) return; audio.play('click'); go(+b.dataset.i) }
  },
  open() {
    audio.play('click')
    if (this.type() === 'native_popup') { try { window.bridge.leaderboards.showNativePopup(boardId(this.tab))?.catch?.(() => {}) } catch {} return }
    $('rankTitle').textContent = rankScope(this.tab); $('rankClose').textContent = t('close')
    show('rank'); this.draw()
  },
  draw() {
    $('rankTitle').textContent = rankScope(this.tab)
    this.tabs($('rankTabs'), this.tab, (i) => { this.tab = i; this.draw() })
    $('rankList').dataset.tab = this.tab; this.fill($('rankList'), $('rankMe'), this.tab)
  },
}
// The lobby board (PLAYBOOK 13, 2026-11-10 user "순위표는 항상 대기실에 표현하자"): always open on the title screen, 1-10 beside the
// menu on wide screens, 3 rows on an upright phone with a button for all 10. native_popup: a cup on the title; no board: nothing.
const lobby = { tab: 0, open: false }
// upright screens: the open board floats over the lobby from where the folded board sits (the slot keeps the folded height), so the
// logo, town card and Start never move (11-14 user: the open board pushed the whole lobby up); it stops under the goals button and
// gold (scrolls on short phones); a tap outside folds it
const upright = () => matchMedia('(max-aspect-ratio: 1/1)').matches
function lobbyOpen(open) {
  const el = $('lobbyRank'), slot = $('lobbySlot')
  lobby.open = open && upright()
  if (lobby.open) { slot.style.height = el.offsetHeight + 'px'; const top = Math.max(10, ...['#goalBtn', '#title .gold'].map((q) => { const e = document.querySelector(q); return e && e.offsetParent ? e.getBoundingClientRect().bottom + 8 : 0 })); el.style.maxHeight = Math.max(160, slot.getBoundingClientRect().bottom - top) + 'px' }
  else { slot.style.height = ''; el.style.maxHeight = '' }
  el.classList.toggle('open', lobby.open)
}
function renderLobby() {
  const type = ranks.type()
  $('lobbyRank').classList.toggle('hide', type !== 'in_game'); $('titleRank').classList.toggle('hide', type !== 'native_popup')
  if (type !== 'in_game') return
  $('lobbyTitle').textContent = rankScope(lobby.tab)
  ranks.tabs($('lobbyTabs'), lobby.tab, (i) => { lobby.tab = i; renderLobby() })
  $('lobbyRank').classList.toggle('open', lobby.open)
  if (!lobby.open) $('lobbySlot').style.height = ''
  $('lobbyList').dataset.tab = lobby.tab; ranks.fill($('lobbyList'), $('lobbyMe'), lobby.tab)
}

// ---------------------------------------------------------------- sound
let renderClock = 0
// recording only (__render.juice): turn the hole's feel off and on piece by piece; players always have all of it
const juice = { eyes: true, tilt: true, chomp: true, sparks: true, shake: true, sound: true }
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
    if (!juice.sound) return
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
document.addEventListener('visibilitychange', () => {
  applyVolume(); if (document.hidden) pauseRun()
  // a tab left open past midnight: the next day's reward when the first screen is looked at again
  else if (game.state === 'title' && document.querySelector('.screen:not(#title):not(.hide)') === null) attendOpen()
})
// The first tap or key anywhere (menus cover the canvas) turns sound on, so the title music starts right away.
addEventListener('pointerdown', () => audio.unlock(), true); addEventListener('keydown', () => audio.unlock(), true)

// ---------------------------------------------------------------- towns
const THEMES = [
  { grass: '#7fd65a', grass2: '#6fca4f', road: '#6b6f80', walk: '#d9d2c0', sky: 0x8fe0ff, fog: 0xbfeeff, leaf: [0x3fb54a, 0xf2a33a, 0xe86a3a], walls: [0xfff0d6, 0xffd6a5, 0xcfe8ff, 0xffc2d4, 0xd6f5c9], roofs: [0xe2574c, 0x4a7be0, 0xf0a030], goal: 8000 },
  { grass: '#f3dc9c', grass2: '#ecd28c', road: '#7d8aa0', walk: '#fff1c9', sky: 0x62d4ff, fog: 0xc8f4ff, leaf: [0x2fc58f, 0x46d19a, 0xf7c548], walls: [0xffffff, 0xbdf2ff, 0xffe29a, 0xffc7b8, 0xd1f7e6], roofs: [0x18a9c9, 0xff7a59, 0xffc145], goal: 75000 },
  { grass: '#e9f4ff', grass2: '#dcecfb', road: '#8d9ab5', walk: '#ffffff', sky: 0xa8d6ff, fog: 0xe6f4ff, leaf: [0x2e8b7a, 0xffffff, 0x4aa7a0], walls: [0xf5e6d3, 0xb78e6a, 0xd8e6f5, 0xe7bcbc, 0xc8d8c8], roofs: [0xffffff, 0xeef6ff, 0xdfeaf6], goal: 112500 },
  { grass: '#ffc4e1', grass2: '#ffb3d9', road: '#a86fd1', walk: '#fff0a8', sky: 0xffd1f0, fog: 0xffe8f7, leaf: [0xff5da2, 0x6fe3d2, 0xffd23f], walls: [0xfff4fb, 0xc7f5ee, 0xfff2a8, 0xffb8d9, 0xd9c7ff], roofs: [0xff4f8b, 0x7b4dff, 0x2ee6a6], goal: 140600 },
  { grass: '#2d2653', grass2: '#352d62', road: '#191436', walk: '#4c4285', sky: 0x1a1140, fog: 0x2b1f63, leaf: [0x2ee6a6, 0xff4fd8, 0x4fc3ff], walls: [0x4fc3ff, 0xff4fd8, 0x7b4dff, 0x2ee6a6, 0xffd23f], roofs: [0xffffff, 0xffd23f, 0x2ee6a6], goal: 206000 },
  // Towns 5-9 have their own things (KITS below), smallest to the castle slot: same swallow sizes, new shapes.
  // A full map tops out near 260k points, so later towns pay more per thing (mult) and the goal grows with it.
  { kit: 'toy', grass: '#e6b47a', grass2: '#dba86c', road: '#4f86d6', walk: '#ffe066', sky: 0xfff0d8, fog: 0xffeedd, leaf: [0xff5d5d, 0x4a90e2, 0xffc145, 0x34c759, 0xb06cff], walls: [0xff5d5d, 0x4a90e2, 0xffc145, 0x34c759, 0xb06cff], roofs: [0xff5d5d, 0x4a90e2, 0xffc145], goal: 281000, mult: 1.3 },
  { kit: 'mushroom', grass: '#79c25f', grass2: '#6bb553', road: '#b8895a', walk: '#d9c08c', sky: 0xc9f0d0, fog: 0xdaf5df, leaf: [0x3f9e4a, 0x5cb85c, 0x2f7d3a], walls: [0xfff4e0, 0xf2e2c4, 0xffe8d0], roofs: [0xe8423a, 0xf0a030, 0x9b5de5], goal: 351000, mult: 1.6 },
  { kit: 'sea', fx: 'sea', fogNear: 25, fogFar: 230, grass: '#c9c08e', grass2: '#b8b07e', road: '#3d6c84', walk: '#6a9cae', sky: 0x165f9e, fog: 0x1f72b4, leaf: [0x2fbf71, 0x1f9e5a, 0x7ad66b], walls: [0xff8fb1, 0xffb38a, 0xc6a8ff, 0x7fe0d6, 0xfff0c2], roofs: [0xff6f91, 0x4fc3ff, 0xffd23f], goal: 426000, mult: 1.9 },
  { kit: 'dino', grass: '#62ad48', grass2: '#559f3d', road: '#a8703e', walk: '#cfa56a', sky: 0xffd49a, fog: 0xffe0b0, leaf: [0x2f8f3a, 0x4fb04a, 0x8bc34a], walls: [0x6fbf4a, 0xe8a33a, 0x5aa0d8, 0xc97b4a, 0x9b7bd6], roofs: [0xc9a46a, 0x8a5a33, 0xd8b878], goal: 525000, mult: 2.3 },
  { kit: 'pumpkin', grass: '#4b4268', grass2: '#423a5d', road: '#2a2544', walk: '#7a6aa6', sky: 0x2e1d52, fog: 0x45337a, leaf: [0x4a3a6a, 0x5d3f7a, 0x3a5a4a], walls: [0x6a4a8a, 0x4a3a5a, 0x7a5a3a, 0x3a4a6a], roofs: [0xff8a1c, 0x2a2238, 0x8a2be2], goal: 656000, mult: 2.8 },
]
const SKINS = [
  { color: 0x7b4dff, cost: 0 }, { color: 0xff4f8b, cost: 800 }, { color: 0x18c8a0, cost: 1500 },
  { color: 0xff9f1c, cost: 3000 }, { color: 0x3aa0ff, cost: 6000 }, { color: 0xffd23f, cost: 12000 },
  // pumpkin hole: dark orange rim and glowing eyes, free once Pumpkin Hollow has 2 stars
  { color: 0xe85a00, eye: 0xffd23f, cost: 0, town: 9, stars: 2 },
  // one look per toppled landmark from town 4 on (11-14)
  { color: 0xff7ac8, eye: 0xfff0f8, cost: 0, fall: 3 }, { color: 0x00e5ff, eye: 0xff3df0, cost: 0, fall: 4 }, { color: 0xe63946, eye: 0xffd23f, cost: 0, fall: 5 },
  { color: 0xb5651d, eye: 0xfff1d0, cost: 0, fall: 6 }, { color: 0x00a8a8, eye: 0x9ff6ff, cost: 0, fall: 7 }, { color: 0x5cb85c, eye: 0xffe066, cost: 0, fall: 8 },
  { color: 0x6a2c91, eye: 0xff8c00, cost: 0, fall: 9 },
  // day 7 of the daily reward (11-23)
  { color: 0xb6ff3b, eye: 0x24183f, cost: 0, att: true },
]
// update card: players from before this version see it once; first-time players never do (everything is new to them)
const UPDATE = 2, NEW_TOWNS = [5, 6, 7, 8, 9], SHOWCASE = 5
// a town opens when the landmark of the one before falls (11-14); saves from before had a star there, which already meant that much damage
const isFallen = (i) => save.fallen.includes(i) || save.stars[i] >= 1
const isLocked = (i) => i > 0 && !isFallen(i - 1)
const isNew = (i) => NEW_TOWNS.includes(i) && !save.played.includes(i)
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
function kenney(name, wall = null, roof = null) {
  const m = MODELS[name]
  // models.js hands over bytes (models.bin, 11-21 load time); base64 text from an older bake still works
  const raw = (v) => (typeof v === 'string' ? bytes(v) : v)
  const p16 = new Int16Array(raw(m.p).buffer), c8 = raw(m.c), i16 = new Uint16Array(raw(m.i).buffer)
  const pos = new Float32Array(p16.length), col = new Float32Array(c8.length)
  for (let i = 0; i < p16.length; i++) pos[i] = p16[i] * m.q
  for (let i = 0; i < c8.length; i++) col[i] = c8[i] / 255
  // Paint the kit's white walls in the town's colour (everything else keeps the kit's colours).
  if (wall !== null) {
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
  if (theme.kit) { const kit = KITS[theme.kit](theme); for (const k in kit) K[k] = { r: K[k].r, tint: !!kit[k].tint, parts: kit[k].parts }; return K }
  if (!CLASSIC) for (const base in VARIANTS) VARIANTS[base].forEach((name, i) => { K[name] = { r: K[base].r, base, tint: base === 'tower' || base === 'sky', shadow: true, geometry: kenney(name, base === 'car' || base === 'bus' ? null : theme.walls[(i * 2 + base.length) % theme.walls.length], base === 'car' || base === 'bus' ? null : theme.roofs[(i + base.length) % theme.roofs.length]) } })
  return K
}

// ---------------------------------------------------------------- town kits (towns 5-9)
// Each kit replaces the shapes of the kinds above, smallest to the castle slot. Swallow radius (r) and points
// stay those of the kind, so a kit changes the look only. tint: the record's colour multiplies the whole shape.
const GEO = {
  box: (w, h, d) => new THREE.BoxGeometry(w, h, d),
  ball: (r, detail = 1) => new THREE.IcosahedronGeometry(r, detail),
  cyl: (top, bottom, h, seg = 8) => new THREE.CylinderGeometry(top, bottom, h, seg),
  cone: (r, h, seg = 7) => new THREE.ConeGeometry(r, h, seg),
  ring: (r, t, arc = Math.PI * 2) => new THREE.TorusGeometry(r, t, 5, 10, arc),
}
// shape, colour, position, scale [sx, sy, sz], turn [rx, ry, rz] (scale, then turn, then move)
function G(geometry, c, x = 0, y = 0, z = 0, s = null, r = null) {
  if (s) geometry.scale(s[0], s[1], s[2])
  if (r) { geometry.rotateX(r[0]); geometry.rotateY(r[1]); geometry.rotateZ(r[2]) }
  return paint(geometry.translate(x, y, z), c)
}
// n copies of one part turned around the y axis (petals, arms, leaves, spots)
const around = (n, make) => Array.from({ length: n }, (_, k) => make(k * Math.PI * 2 / n, k))
const spin = (geometry, a) => geometry.rotateY(a)
const legs = (pts, r, h, c) => pts.map(([x, z]) => G(GEO.cyl(r, r * 1.1, h, 7), c, x, h / 2, z))
const KITS = {
  toy(theme) {
    const WOOD = 0xd89b5a, BEAR = 0xc8874a, LIGHT = 0xf2d3a8
    return {
      person: { tint: true, parts: [G(GEO.cyl(0.14, 0.16, 0.42), TINT, 0, 0.3), G(GEO.ball(0.13, 0), 0xffe0c0, 0, 0.62), G(GEO.cyl(0.13, 0.13, 0.22), DARK, 0, 0.82)] },
      cone: { parts: [G(GEO.box(0.42, 0.3, 0.42), 0xff5d5d, 0, 0.15), G(GEO.box(0.3, 0.24, 0.3), 0x4a90e2, 0.04, 0.42, 0, null, [0, 0.5, 0])] },
      hydrant: { parts: [G(GEO.cyl(0.09, 0.09, 0.42), 0x4a90e2, 0, 0.21, 0, null, [0, 0, 0]), G(GEO.cone(0.09, 0.16), 0x4a90e2, 0, 0.5), G(GEO.cyl(0.095, 0.095, 0.1), WHITE, 0, 0.3)] },
      crate: { parts: [G(GEO.box(0.55, 0.55, 0.55), WHITE, 0, 0.275), ...[[0, 0], [-0.15, -0.15], [0.15, 0.15]].map(([x, z]) => G(GEO.box(0.09, 0.02, 0.09), DARK, x, 0.56, z)), G(GEO.box(0.09, 0.09, 0.02), DARK, 0, 0.3, 0.28)] },
      mail: { parts: [G(GEO.ball(0.3, 0), 0xffd23f, 0, 0.24, 0, [1.25, 0.75, 1]), G(GEO.ball(0.18, 0), 0xffd23f, 0.2, 0.55), G(GEO.box(0.14, 0.05, 0.1), 0xff8a1c, 0.38, 0.52), G(GEO.ball(0.03, 0), DARK, 0.3, 0.6, 0.09)] },
      lamp: { parts: [G(GEO.cone(0.4, 0.55, 10), 0xff5d5d, 0, 0.28, 0, null, [Math.PI, 0, 0]), G(GEO.cyl(0.41, 0.41, 0.1, 10), 0xffd23f, 0, 0.5), G(GEO.cyl(0.05, 0.05, 0.45), WOOD, 0, 0.75)] },
      bush: { tint: true, parts: [G(GEO.ball(0.45), TINT, 0, 0.45), G(GEO.ring(0.45, 0.06), WHITE, 0, 0.45, 0, null, [Math.PI / 2, 0, 0]), G(GEO.ring(0.45, 0.06), WHITE, 0, 0.45)] },
      bench: { parts: [-0.45, 0, 0.45].map((x, i) => G(GEO.box(0.1, 0.6, 0.32), i === 1 ? WHITE : DARK, x, 0.3, 0, null, [0, 0, i === 2 ? -0.35 : 0]))},
      tree: { tint: true, parts: [G(GEO.cyl(0.6, 0.65, 0.2, 10), WOOD, 0, 0.1), G(GEO.cyl(0.07, 0.07, 1.6), WOOD, 0, 0.9), ...[0.55, 0.45, 0.36, 0.27].map((r, i) => G(GEO.ring(r, 0.17), TINT, 0, 0.35 + i * 0.32, 0, null, [Math.PI / 2, 0, 0])), G(GEO.ball(0.16, 0), WOOD, 0, 1.75)] },
      bigTree: { tint: true, parts: [G(GEO.ball(1.7), TINT, 0, 1.7), G(GEO.ring(1.7, 0.18, Math.PI * 2), WHITE, 0, 1.7, 0, null, [Math.PI / 2, 0, 0]), G(GEO.ring(1.7, 0.18), WHITE, 0, 1.7, 0, null, [0, 0.8, 0]), G(GEO.ring(1.7, 0.18), WHITE, 0, 1.7, 0, null, [0, -0.8, 0])] },
      car: { tint: true, parts: [G(GEO.box(2, 0.7, 1.1), TINT, 0, 0.6), G(GEO.box(1, 0.5, 0.95), WHITE, -0.2, 1.2), ...[[-0.7, 0.55], [0.7, 0.55], [-0.7, -0.55], [0.7, -0.55]].map(([x, z]) => G(GEO.cyl(0.36, 0.36, 0.22, 10), DARK, x, 0.36, z, null, [Math.PI / 2, 0, 0]))] },
      bus: { tint: true, parts: [G(GEO.box(3.2, 1.3, 1.6), TINT, 0.3, 1.15), G(GEO.box(1.4, 1.5, 1.7), WHITE, -1.5, 2.1), G(GEO.box(1.7, 0.2, 1.9), DARK, -1.5, 2.9), G(GEO.cyl(0.3, 0.42, 1.1), DARK, 1.3, 2.3), G(GEO.cone(0.6, 0.7, 4), 0xffd23f, 1.95, 0.6, 0, null, [0, 0, -Math.PI / 2]), ...[-1.5, -0.3, 0.9].flatMap((x) => [0.82, -0.82].map((z) => G(GEO.cyl(0.5, 0.5, 0.2, 10), 0xff5d5d, x, 0.5, z, null, [Math.PI / 2, 0, 0])))] },
      kiosk: { parts: [G(GEO.box(2.2, 2.2, 2.2), 0xffc145, 0, 1.1), G(GEO.box(2.3, 0.15, 2.3), 0x4a90e2, -1.2, 2.6, 0, null, [0, 0, 1.2]), G(GEO.cyl(0.3, 0.3, 1.1, 8), 0xb0b0c0, 0, 2.75), G(GEO.ball(0.65), 0xffe0c0, 0, 3.7), G(GEO.cone(0.5, 0.9), 0xff5d5d, 0, 4.6), G(GEO.ball(0.2, 0), 0xff3b3b, 0, 3.65, 0.62), ...[-0.25, 0.25].map((x) => G(GEO.ball(0.09, 0), DARK, x, 3.9, 0.56))] },
      cottage: { tint: true, parts: [G(GEO.box(3.6, 2.6, 3.2), TINT, 0, 1.3), roof(3.6, 1.9, 3.2, 0x9a9ab0, 2.6), G(GEO.box(0.9, 1.4, 0.05), DARK, 0, 0.7, 1.62), ...[-1.1, 1.1].map((x) => G(GEO.box(0.7, 0.7, 0.05), WHITE, x, 1.6, 1.62)), G(GEO.box(1, 1, 1), 0xd8d8e8, 2.4, 0.5, 1.4, null, [0, 0.4, 0]), G(GEO.box(0.8, 0.8, 0.8), 0xd8d8e8, -2.2, 0.4, -1.3, null, [0, -0.3, 0])] },
      house: { tint: true, parts: [G(GEO.box(5.2, 4.6, 4.2), TINT, 0, 2.3), roof(5.2, 2.6, 4.2, 0x9a9ab0, 4.6), G(GEO.box(0.6, 1.4, 0.6), 0xd8d8e8, 1.6, 6.2), G(GEO.box(1, 1.8, 0.05), DARK, 0, 0.9, 2.12), ...[-1.6, 1.6].flatMap((x) => [1.6, 3.4].map((y) => G(GEO.box(0.9, 0.9, 0.05), GLASS, x, y, 2.12))), G(GEO.box(5.4, 0.25, 4.4), WHITE, 0, 2.6)] },
      shop: { parts: [G(GEO.box(7.4, 0.8, 5.2), WOOD, 0, 0.9), ...[[-3.3, -2.2], [3.3, -2.2], [-3.3, 2.2], [3.3, 2.2]].map(([x, z]) => G(GEO.cyl(0.25, 0.25, 0.6), WOOD, x, 0.3, z)), ...[0xff5d5d, 0xff8a1c, 0xffd23f, 0x34c759, 0x4fc3ff, 0x4a90e2, 0xb06cff].map((c, i) => G(GEO.box(0.8, 0.35, 4.6 - i * 0.4), c, -3 + i, 1.5)), G(GEO.cyl(0.12, 0.12, 3.2), WHITE, 1.5, 2.3, 1.2, null, [0.3, 0, 1.1]), G(GEO.ball(0.35), 0xff5d5d, 3, 2.9, 1.4)] },
      tower: { parts: [[7, 0xff5d5d, 0], [6.2, 0x4a90e2, 0.35], [5.4, 0xffc145, -0.25], [4.6, 0x34c759, 0.5]].map(([w, c, a], i) => G(GEO.box(w, 3.2, w), c, 0, 1.6 + i * 3.2, 0, null, [0, a, 0])).concat([G(GEO.cone(2.8, 3, 4), 0xb06cff, 0, 14.3, 0, null, [0, Math.PI / 4 + 0.5, 0])]) },
      sky: { parts: [G(GEO.cyl(4, 4.2, 20, 12), WHITE, 0, 12), G(GEO.cone(4, 8, 12), 0xff5d5d, 0, 26), G(GEO.cyl(4.25, 4.25, 1.2, 12), 0xff5d5d, 0, 7), ...around(4, (a) => paint(spin(GEO.box(1, 9, 4).translate(0, 4.5, 5), a), 0xff5d5d)), G(GEO.ball(1.6), GLASS, 0, 17, 3.6, [1, 1, 0.5]), G(GEO.cyl(1.8, 2.6, 2, 12), DARK, 0, 1), G(GEO.ring(4.1, 0.35), 0x4a90e2, 0, 12, 0, null, [Math.PI / 2, 0, 0])] },
      castle: { parts: [G(GEO.ball(10), BEAR, 0, 11, 0, [1, 1.05, 0.9]), G(GEO.ball(6.5), LIGHT, 0, 10, 4.5, [1, 1.1, 0.6]), G(GEO.ball(8), BEAR, 0, 26.5), ...[-6, 6].map((x) => G(GEO.ball(3), BEAR, x, 32.5)), ...[-6, 6].map((x) => G(GEO.ball(1.8), LIGHT, x, 32.6, 1.6)), G(GEO.ball(3.4), LIGHT, 0, 24.5, 6.6, [1, 0.8, 1]), G(GEO.ball(1.2), DARK, 0, 25.6, 9.6), ...[-2.9, 2.9].map((x) => G(GEO.ball(0.95), DARK, x, 28.6, 6.9)), ...[-6.5, 6.5].map((x) => G(GEO.ball(3.4), BEAR, x, 3, 6, [1, 0.9, 1.4])), ...[-6.5, 6.5].map((x) => G(GEO.ball(2.2), LIGHT, x, 3, 10.4, [1, 1, 0.3])), ...[-10.5, 10.5].map((x) => G(GEO.ball(3.2), BEAR, x, 13, 2, [0.9, 1.4, 0.9], [0, 0, x < 0 ? 0.5 : -0.5])), ...[-1, 1].map((k) => G(GEO.cone(2.4, 4.6, 4), 0xff3b5c, k * 2.2, 19.4, 7.6, null, [0, 0, k * Math.PI / 2])), G(GEO.ball(1.1), 0xff3b5c, 0, 19.4, 7.8)] },
    }
  },
  mushroom(theme) {
    const STEM = 0xfff4e0, RED = 0xe8423a, ORANGE = 0xf0a030, PURPLE = 0x9b5de5, BARK = 0x8a5a33, SPOT = 0xffffff
    const cap = (r, c, y, x = 0, z = 0, flat = 0.5) => G(GEO.ball(r), c, x, y, z, [1, flat, 1])
    const spots = (r, y, n, x = 0, z = 0, flat = 0.5) => around(n, (a, k) => G(GEO.ball(r * 0.16, 0), SPOT, x + Math.cos(a) * r * 0.62, y + r * flat * 0.78, z + Math.sin(a) * r * 0.62))
    const hut = (sr, sh, cr, c, x = 0, z = 0) => [G(GEO.cyl(sr, sr * 1.1, sh, 10), STEM, x, sh / 2, z), cap(cr, c, sh + cr * 0.15, x, z), ...spots(cr, sh + cr * 0.15, 6, x, z), G(GEO.box(sr * 0.6, sh * 0.5, 0.05), BARK, x, sh * 0.25, z + sr * 1.05)]
    return {
      person: { tint: true, parts: [G(GEO.cyl(0.14, 0.2, 0.4), TINT, 0, 0.2), G(GEO.ball(0.13, 0), 0xffe0c0, 0, 0.47), G(GEO.ball(0.12, 0), WHITE, 0, 0.4, 0.08), G(GEO.cone(0.15, 0.42), 0xd8d8d8, 0, 0.74)] },
      cone: { parts: [G(GEO.cyl(0.07, 0.09, 0.26), STEM, 0, 0.13), cap(0.24, RED, 0.28), G(GEO.ball(0.05, 0), SPOT, 0.1, 0.37, 0), G(GEO.ball(0.05, 0), SPOT, -0.08, 0.36, 0.08)] },
      hydrant: { parts: [G(GEO.ball(0.16, 0), 0xc08040, 0, 0.18, 0, [1, 1.25, 1]), G(GEO.ball(0.18, 0), 0x6a4020, 0, 0.36, 0, [1, 0.5, 1]), G(GEO.cyl(0.02, 0.02, 0.12), 0x6a4020, 0, 0.47)] },
      crate: { parts: [G(GEO.cyl(0.3, 0.34, 0.42, 9), BARK, 0, 0.21), G(GEO.cyl(0.29, 0.29, 0.03, 9), 0xe0b080, 0, 0.43), G(GEO.ball(0.1, 0), 0x5cb85c, 0.2, 0.42, 0.1, [1, 0.5, 1])] },
      mail: { parts: [G(GEO.ball(0.32, 0), 0xe8e0c0, 0.1, 0.08, 0, [1.4, 0.3, 0.5]), G(GEO.ball(0.24), 0xf0a030, -0.05, 0.3, 0, [0.6, 1, 1]), G(GEO.ring(0.13, 0.04), 0x9a5a20, -0.2, 0.3, 0, null, [0, Math.PI / 2, 0]), ...[-0.06, 0.06].map((z) => G(GEO.cyl(0.015, 0.015, 0.2), DARK, 0.48, 0.24, z))] },
      lamp: { parts: [G(GEO.cyl(0.04, 0.06, 1.7), 0x3f9e4a, 0, 0.85), ...around(5, (a) => paint(spin(GEO.ball(0.16, 0).scale(1, 0.4, 1.6).translate(0, 1.75, 0.22), a), 0xff8fb1)), G(GEO.ball(0.18), 0xfff27a, 0, 1.78), G(GEO.ball(0.2, 0), 0x5cb85c, 0.15, 0.5, 0, [1.6, 0.3, 0.7])] },
      bush: { tint: true, parts: around(5, (a) => paint(spin(GEO.cone(0.14, 0.9, 5).rotateX(0.6).translate(0, 0.4, 0.22), a), TINT)).concat([G(GEO.ball(0.22, 0), TINT, 0, 0.18)]) },
      bench: { parts: [G(GEO.cyl(0.3, 0.3, 1.5, 9), BARK, 0, 0.3, 0, null, [0, 0, Math.PI / 2]), G(GEO.cyl(0.26, 0.26, 0.04, 9), 0xe0b080, 0.76, 0.3, 0, null, [0, 0, Math.PI / 2]), G(GEO.ball(0.25, 0), 0x5cb85c, -0.3, 0.55, 0, [1.6, 0.4, 1])] },
      tree: { tint: true, parts: [G(GEO.cyl(0.14, 0.2, 1.3, 6), 0x8a5a33, 0, 0.65), G(GEO.ball(0.85), TINT, 0, 1.75), G(GEO.ball(0.55), TINT, 0.5, 1.4, 0.2), G(GEO.ball(0.12, 0), 0xff5d5d, 0.4, 2.3, 0.5)] },
      bigTree: { parts: [G(GEO.cyl(0.5, 0.65, 2.4, 10), STEM, 0, 1.2), cap(1.9, RED, 2.6), ...spots(1.9, 2.6, 7), G(GEO.ball(1.2), RED, 0, 2.95, 0, [1, 0.35, 1])] },
      car: { parts: [G(GEO.ball(0.9), RED, 0, 0.45, 0, [1.25, 0.55, 0.95]), G(GEO.box(1.9, 0.05, 0.05), DARK, 0, 0.95, 0), G(GEO.ball(0.38, 0), DARK, 1.05, 0.4), ...[[-0.5, 0.35], [0.3, -0.4], [-0.1, 0.45], [0.4, 0.3], [-0.6, -0.3]].map(([x, z]) => G(GEO.ball(0.14, 0), DARK, x, 0.85, z, [1, 0.4, 1])), ...[-0.12, 0.12].map((z) => G(GEO.cyl(0.02, 0.02, 0.4), DARK, 1.3, 0.65, z, null, [0, 0, -0.6]))] },
      bus: { parts: [-2.1, -1.2, -0.3, 0.6, 1.5].map((x, i) => G(GEO.ball(0.72), i % 2 ? 0x7ad66b : 0x5cb85c, x, 0.72 + (i % 2) * 0.12)).concat([G(GEO.ball(0.85), 0x9be37a, 2.5, 1.05), ...[-0.3, 0.3].map((z) => G(GEO.ball(0.12, 0), DARK, 3.2, 1.25, z)), ...[-0.25, 0.25].map((z) => G(GEO.cyl(0.04, 0.04, 0.8), DARK, 2.6, 2.1, z)), ...[-2.1, -1.2, -0.3, 0.6, 1.5].map((x) => G(GEO.ball(0.12, 0), 0xffd23f, x, 1.5, 0))]) },
      kiosk: { parts: [G(GEO.cyl(0.7, 0.85, 1.6, 10), STEM, 0, 0.8), cap(1.8, PURPLE, 1.9), ...spots(1.8, 1.9, 6), G(GEO.box(1, 0.5, 0.5), 0xe0b080, 0, 0.9, 0.85)] },
      cottage: { parts: hut(1.6, 2.6, 2.8, RED).concat([G(GEO.ball(0.35, 0), GLASS, 1.2, 1.8, 1.15), G(GEO.ball(0.3, 0), 0x5cb85c, -1.8, 0.2, 1.2, [1.5, 0.6, 1])]) },
      house: { parts: hut(2, 4.2, 3.4, ORANGE).concat([...[[-1.2, 2.8], [1.2, 3.2]].map(([x, y]) => G(GEO.ball(0.42, 0), GLASS, x, y, 1.75)), G(GEO.cyl(0.3, 0.3, 1.6), BARK, 1.6, 5.8, 0.6), G(GEO.box(2, 0.2, 1), BARK, 0, 0.1, 2.6)]) },
      shop: { parts: [...hut(1.4, 3.2, 2.4, PURPLE, -2.6, -1), ...hut(1.2, 2.4, 2, 0x4fc3ff, 2.6, 0.6), ...hut(1, 1.8, 1.6, 0xff8fb1, 0, 2.6), G(GEO.box(7.4, 0.15, 5.2), 0xc08a50, 0, 0.07)] },
      tower: { parts: [G(GEO.cyl(3, 3.6, 10, 12), BARK, 0, 5), cap(4.4, RED, 10.6, 0, 0, 0.45), ...spots(4.4, 10.6, 8, 0, 0, 0.45), ...[[4, 0], [7, 2.2]].map(([y, a]) => paint(spin(GEO.ball(1.6).scale(1, 0.35, 1).translate(0, y, 3.4), a), ORANGE)), ...[[2.5, 0.4], [6, -1.2], [8, 2]].map(([y, a]) => paint(spin(GEO.ball(0.45, 0).translate(0, y, 3.2), a), 0xfff27a)), G(GEO.box(1.2, 2, 0.1), DARK, 0, 1, 3.4)] },
      sky: { parts: [G(GEO.cyl(2.2, 3.4, 18, 10), BARK, 0, 9), G(GEO.ball(6.2), 0x3f9e4a, 0, 22), G(GEO.ball(4.6), 0x5cb85c, 4.2, 19, 2), G(GEO.ball(4.2), 0x2f7d3a, -4, 19.5, -1.5), G(GEO.ball(3.6), 0x5cb85c, 0, 27, -1), ...around(6, (a) => paint(spin(GEO.ball(0.5, 0).translate(0, 0, 0).translate(0, 23, 6.1), a), 0xff5d5d)), ...hut(0.7, 1.4, 1.5, ORANGE, 3.6, 2.4), ...hut(0.6, 1.1, 1.2, RED, -3.2, -2.6), G(GEO.box(1.4, 2.4, 0.1), DARK, 0, 1.2, 3.1)] },
      castle: { parts: [G(GEO.cyl(6, 7.6, 22, 14), STEM, 0, 11), cap(13, RED, 25, 0, 0, 0.5), ...around(9, (a) => paint(spin(GEO.ball(1.7, 0).translate(0, 30, 8.2), a), SPOT)), G(GEO.ball(2, 0), SPOT, 0, 31.5, 0), ...around(4, (a) => paint(spin(GEO.ball(1.4, 0).translate(0, 26, 12.2), a + 0.4), SPOT)), G(GEO.box(3, 5, 0.3), BARK, 0, 2.5, 7.4), ...[[5, 0], [11, 0.6], [15, -0.5], [9, -0.9]].map(([y, a]) => paint(spin(GEO.ball(0.9, 0).scale(1, 1.2, 0.4).translate(0, y, 6.9), a), GLASS)), ...[[-9, -9, ORANGE], [9, -9, PURPLE], [-9, 9, PURPLE], [9, 9, ORANGE]].flatMap(([x, z, c]) => [G(GEO.cyl(1.6, 2, 9, 10), STEM, x, 4.5, z), cap(4.2, c, 9.6, x, z), ...spots(4.2, 9.6, 5, x, z)])] },
    }
  },
  sea(theme) {
    const SAND = 0xf0d49a, PINK = 0xff8fb1, CORAL = 0xff7f6a, WOOD = 0x8a5a33, PEARL = 0xfff8f0
    const k1 = (a) => (Math.round(a * 10) % 2 ? CORAL : 0xff9f80)
    const star = (r, c, y) => around(5, (a) => paint(spin(GEO.box(r * 0.42, 0.09, r).translate(0, y, r * 0.48), a), c))
    return {
      person: { tint: true, parts: [G(GEO.ball(0.2), TINT, 0, 0.45, 0, [1.4, 0.95, 0.6]), G(GEO.cone(0.16, 0.24, 4), TINT, -0.34, 0.45, 0, [1, 1, 0.4], [0, 0, Math.PI / 2]), G(GEO.ball(0.045, 0), DARK, 0.18, 0.5, 0.08), G(GEO.box(0.12, 0.12, 0.02), WHITE, 0.05, 0.62, 0)] },
      cone: { parts: star(0.34, 0xff7a59, 0.05).concat([G(GEO.ball(0.09, 0), 0xffb38a, 0, 0.07, 0, [1, 0.5, 1])]) },
      hydrant: { parts: [G(GEO.cone(0.22, 0.3, 9), 0xffc2d4, 0, 0.12, 0, [1, 1, 0.6], [-1.2, 0, 0]), G(GEO.ball(0.1, 0), 0xffe0ea, 0, 0.08, -0.18)] },
      crate: { parts: [G(GEO.box(0.62, 0.34, 0.44), WOOD, 0, 0.17), G(GEO.cyl(0.22, 0.22, 0.62, 8), 0xa8703e, 0, 0.36, 0, [1, 0.6, 1], [0, 0, Math.PI / 2]), G(GEO.box(0.08, 0.5, 0.46), 0xffd23f, 0, 0.25), G(GEO.ball(0.09, 0), 0xffd23f, 0.15, 0.5, 0.1), G(GEO.ball(0.07, 0), 0xffd23f, -0.12, 0.48, -0.05)] },
      mail: { parts: [G(GEO.ball(0.22, 0), 0x3a2a5a, 0, 0.22), ...around(7, (a, k) => paint(spin(GEO.cone(0.05, 0.3, 4).rotateX(0.9 + (k % 3) * 0.4).translate(0, 0.25, 0.12), a), 0x5a3a7a))] },
      lamp: { parts: [G(GEO.cyl(0.05, 0.08, 2.4, 6), 0x2fbf71, 0, 1.2), ...[0.5, 0.95, 1.4, 1.85, 2.3].map((y, i) => G(GEO.ball(0.25, 0), 0x3fd081, (i % 2 ? 0.16 : -0.16), y, 0, [0.5, 1.4, 0.2], [0, 0, i % 2 ? -0.5 : 0.5]))] },
      bush: { parts: [G(GEO.ball(0.18, 0), CORAL, 0, 0.12), ...around(5, (a, k) => paint(spin(GEO.cyl(0.05, 0.08, 0.6 + (k % 2) * 0.2, 5).rotateX(0.45).translate(0, 0.32, 0.13), a), CORAL)), ...around(5, (a, k) => paint(spin(GEO.ball(0.08, 0).translate(0, 0.62 + (k % 2) * 0.18, 0.28), a), 0xffc2b0))] },
      bench: { parts: [G(GEO.box(0.12, 1.1, 0.12), 0x5a6070, 0, 0.6), G(GEO.box(0.7, 0.1, 0.1), 0x5a6070, 0, 0.95), G(GEO.ring(0.14, 0.05), 0x5a6070, 0, 1.25), G(GEO.ring(0.42, 0.07, Math.PI), 0x5a6070, 0, 0.42, 0, null, [Math.PI, 0, 0])] },
      tree: { tint: true, parts: [[-0.3, 0, 1.7], [0.2, 0.25, 2.2], [0.15, -0.3, 1.4]].map(([x, z, h]) => G(GEO.ball(0.3, 0), TINT, x, h / 2, z, [0.7, h / 0.6, 0.35], [0, x * 3, 0])).concat([G(GEO.ball(0.25, 0), 0x9a8a70, 0, 0.1, 0, [1.5, 0.5, 1.5])]) },
      bigTree: { parts: [G(GEO.ball(1.6), PINK, 0, 1.1, 0, [1, 0.75, 1]), G(GEO.ring(1.15, 0.12), 0xff6f91, 0, 2.05, 0, null, [Math.PI / 2, 0, 0]), G(GEO.ring(0.65, 0.12), 0xff6f91, 0, 2.2, 0, null, [Math.PI / 2, 0, 0]), ...around(8, (a, k) => paint(spin(GEO.cyl(0.08, 0.12, 0.9, 5).rotateX(0.3).translate(0, 2.3, 0.6 + (k % 2) * 0.3), a), 0xffd0e0))] },
      car: { tint: true, parts: [G(GEO.cyl(0.45, 0.45, 1.7, 10), TINT, 0, 0.7, 0, null, [0, 0, Math.PI / 2]), G(GEO.ball(0.45), TINT, 0.85, 0.7), G(GEO.ball(0.45), TINT, -0.85, 0.7, 0, [0.6, 1, 1]), G(GEO.box(0.55, 0.45, 0.4), TINT, 0, 1.3), G(GEO.cyl(0.05, 0.05, 0.5), DARK, 0.15, 1.7), ...[-0.4, 0.4].map((x) => G(GEO.ball(0.14, 0), GLASS, x, 0.75, 0.42, [1, 1, 0.4])), G(GEO.box(0.06, 0.55, 0.12), DARK, -1.2, 0.7)] },
      bus: { parts: [G(GEO.ball(1.6), 0x3f9e4a, 0, 0.85, 0, [1.25, 0.5, 1]), ...around(6, (a) => paint(spin(GEO.ball(0.45, 0).scale(1, 0.25, 1).translate(0, 1.55, 0.9), a), 0x2f7d3a)), G(GEO.ball(0.5), 0x9ed36a, 2.25, 0.75), ...[-0.18, 0.18].map((z) => G(GEO.ball(0.07, 0), DARK, 2.6, 0.9, z)), ...[[1.1, 1.3], [1.1, -1.3], [-1.2, 1.2], [-1.2, -1.2]].map(([x, z]) => G(GEO.ball(0.45, 0), 0x9ed36a, x, 0.4, z, [1.6, 0.3, 0.7], [0, z > 0 ? -0.5 : 0.5, 0]))] },
      kiosk: { parts: [G(GEO.ball(1.4), 0xb59ad8, 0, 0.45, 0, [1, 0.4, 1]), G(GEO.ball(1.4), 0xc6a8ff, -0.6, 1.4, 0, [1, 0.4, 1], [0, 0, 0.9]), G(GEO.ball(0.55), PEARL, 0.25, 0.95)] },
      cottage: { tint: true, parts: [G(GEO.cone(1.9, 4.2, 9), TINT, 0, 2.1), ...[0.6, 1.5, 2.4].map((y, i) => G(GEO.ring(1.9 * (1 - y / 4.2) + 0.05, 0.16), WHITE, 0, y, 0, null, [Math.PI / 2, 0, 0.15])), G(GEO.box(0.8, 1.1, 0.1), DARK, 0, 0.55, 1.65), G(GEO.ball(0.3, 0), GLASS, 0.7, 1.6, 1.1)] },
      house: { tint: true, parts: [G(GEO.ball(2.8), TINT, 0, 1.2, 0, [1, 0.9, 1]), ...around(5, (a) => paint(spin(GEO.ball(0.45).scale(1, 1, 0.4).translate(0, 2.1, 2.3), a), GLASS)), ...around(5, (a) => paint(spin(GEO.ring(0.47, 0.08).translate(0, 2.1, 2.36), a), 0xffd23f)), G(GEO.cyl(0.25, 0.25, 2.2), 0xffd23f, 0.8, 4.6), G(GEO.box(1, 1.5, 0.3), DARK, 0, 0.75, 2.75)] },
      shop: { parts: [G(GEO.box(6.6, 2, 3.2), WOOD, 0, 1, 0, null, [0.12, 0, 0.1]), G(GEO.box(6.4, 0.2, 3), 0xb07a40, 0, 2.15, 0, null, [0.12, 0, 0.1]), G(GEO.box(2, 1.4, 2), 0x9a6a3a, -1.6, 2.9, 0, null, [0.12, 0, 0.1]), G(GEO.cyl(0.15, 0.18, 2.2), 0x6a4a2a, 1.4, 3, 0, null, [0.1, 0, -0.9]), ...[-0.5, 1.6].map((x) => G(GEO.ball(0.3, 0), GLASS, x, 1.2, 1.6)), ...[[3.3, 1.8, 1.6], [-2.8, 1.6, 1.2], [2.2, -1.7, 1.3]].map(([x, z, h]) => G(GEO.ball(0.4, 0), 0x3fd081, x, h, z, [0.6, h * 1.6, 0.4])), ...[[-3.6, -1.4], [3.5, -0.6]].map(([x, z]) => G(GEO.ball(0.7), CORAL, x, 0.5, z, [1, 0.7, 1]))] },
      tower: { tint: true, parts: [G(GEO.cyl(2.6, 3.6, 7, 10), TINT, 0, 3.5), G(GEO.cyl(1.6, 2.6, 5, 10), TINT, 0, 9.5), G(GEO.ball(1.8), WHITE, 0, 12.6), ...[2.2, 5, 8.5].map((y, i) => G(GEO.ring(3.5 - i * 0.7, 0.3), WHITE, 0, y, 0, null, [Math.PI / 2, 0, 0])), ...around(4, (a, k) => paint(spin(GEO.cyl(0.25, 0.4, 3, 5).rotateX(0.7).translate(0, 6 + k, 3), a), 0xffb38a)), G(GEO.box(1.2, 2, 0.1), DARK, 0, 1, 3.5)] },
      sky: { parts: [G(GEO.ball(5), 0x6f8a8a, 0, 0.8, 0, [1.1, 0.35, 1.1]), G(GEO.cyl(1.3, 2.4, 14, 8), CORAL, 0, 7), ...[[0, 0.5, 9, 6], [2.1, 0.55, 11, 7], [4.2, 0.6, 8, 5.5], [1, 0.25, 13, 8], [3.2, 0.35, 15, 6], [5.3, 0.3, 12, 7]].flatMap(([a, tilt, y, len]) => [paint(spin(GEO.cyl(0.55, 0.95, len, 7).translate(0, len / 2, 0).rotateX(tilt).translate(0, y, 0), a), k1(a)), paint(spin(GEO.ball(0.9, 0).translate(0, y + Math.cos(tilt) * len, Math.sin(tilt) * len), a), 0xffd0c0)]), G(GEO.cyl(0.7, 1, 6, 7), 0xff9f80, 0, 17), G(GEO.ball(1.1, 0), 0xffd0c0, 0, 20.4), ...[[3, 2.5], [-3.2, -2], [1.5, -3.5]].map(([x, z]) => G(GEO.ball(1.1), 0xffd23f, x, 13 + x, z, [1.4, 0.8, 0.5], [0, x, 0])), ...[[-4.5, 3], [4.6, -2.6], [-1, 5]].map(([x, z]) => G(GEO.ball(0.5, 0), 0x3fd081, x, 2.5, z, [0.6, 5, 0.4]))] },
      castle: { parts: [G(GEO.ball(11.5), 0x6f8a8a, 0, 1, 0, [1, 0.32, 1]), ...Array.from({ length: 11 }, (_, k) => { const a = -1.35 + k * 0.27; return G(GEO.ball(2.3), k % 2 ? 0xffc2a8 : 0xff9478, Math.sin(a) * 8.5, 6 + Math.cos(a) * 9.5, -6, [0.85, 4.6, 0.55], [0, 0, -a]) }), G(GEO.ball(2.2), 0xff9478, 0, 5.5, -5.5, [1.5, 0.8, 0.8]), G(GEO.ball(6.4), 0xbfe8e6, 0, 7.5, 1.5, [1, 0.82, 1]), ...around(8, (a) => paint(spin(GEO.ring(1, 0.18).translate(0, 7, 6.6), a + 0.39), 0xfff8f0)), G(GEO.ball(2.2), PEARL, 0, 13.6, 1.5), G(GEO.box(3.6, 4.6, 0.6), 0x1f4f7a, 0, 4.2, 7.4), G(GEO.ring(1.8, 0.35, Math.PI), 0xffd23f, 0, 6.4, 7.6), ...[[-8.5, 6], [8.5, 6], [-9.5, -3], [9.5, -3]].flatMap(([x, z], i) => [G(GEO.cone(2.3, 11, 9), 0xfff0dc, x, 7.5, z, null, [0, 0, x < 0 ? 0.1 : -0.1]), ...[0, 1, 2, 3].map((j) => G(GEO.ring(2.1 - j * 0.45, 0.32), 0xff9f50, x - Math.sign(x) * j * 0.25, 3.5 + j * 2.4, z, null, [Math.PI / 2 + 0.25, 0, 0])), G(GEO.ball(0.9), PEARL, x - Math.sign(x) * 1.1, 13.2, z)]), ...[[-12, 9, 0], [12, 9, 2], [-4, 12, 4], [5, 11.5, 1], [-13, -5, 3], [13, -6, 5]].flatMap(([x, z, a]) => [paint(spin(GEO.cyl(0.4, 0.75, 6, 6).translate(0, 3, 0).rotateX(0.35), a).translate(x, 0, z), CORAL), paint(spin(GEO.cyl(0.3, 0.5, 4, 6).translate(0, 2, 0).rotateX(-0.6).translate(0, 3.5, 0.9), a).translate(x, 0, z), 0xff9f80), G(GEO.ball(0.6, 0), 0xffd0c0, x, 6.4, z)]), ...[[-6, 10], [7, 9.5], [-11, 1], [11.5, 2]].map(([x, z]) => G(GEO.ball(1), 0x3fd081, x, 3, z, [0.7, 3, 0.5]))] },
    }
  },
  dino(theme) {
    const EGG = 0xf5ecd0, BONE = 0xf4f0e4, STONE = 0x9a948a, STRAW = 0xd8b878, WOOD = 0x8a5a33, PALM = 0x3f9e4a
    const egg = (r, x, y, z) => [G(GEO.ball(r), EGG, x, y, z, [1, 1.3, 1]), G(GEO.ball(r * 0.22, 0), 0x8bc34a, x + r * 0.6, y + r * 0.4, z + r * 0.5), G(GEO.ball(r * 0.18, 0), 0x8bc34a, x - r * 0.5, y + r * 0.8, z + r * 0.4)]
    return {
      person: { tint: true, parts: [G(GEO.ball(0.2, 0), TINT, 0, 0.27, 0, [1.25, 1, 0.9]), G(GEO.ball(0.15, 0), TINT, 0.22, 0.5), G(GEO.cone(0.1, 0.32, 5), TINT, -0.32, 0.25, 0, null, [0, 0, Math.PI / 2 + 0.3]), G(GEO.ball(0.035, 0), DARK, 0.32, 0.55, 0.08)] },
      cone: { parts: egg(0.18, 0, 0.23, 0) },
      hydrant: { parts: [G(GEO.cyl(0.06, 0.06, 0.5, 6), BONE, 0, 0.09, 0, null, [0, 0, Math.PI / 2]), ...[[-0.27, 0.06], [-0.27, -0.06], [0.27, 0.06], [0.27, -0.06]].map(([x, z]) => G(GEO.ball(0.09, 0), BONE, x, 0.09, z))] },
      crate: { parts: [G(GEO.ball(0.36, 0), STONE, 0, 0.24, 0, [1.15, 0.8, 1]), G(GEO.ball(0.18, 0), 0xa8a296, 0.3, 0.12, 0.15)] },
      mail: { parts: around(4, (a) => paint(spin(GEO.ball(0.3, 0).scale(0.35, 0.12, 1).rotateX(-0.5).translate(0, 0.3, 0.25), a), 0x4fb04a)).concat([G(GEO.ball(0.08, 0), 0x2f8f3a, 0, 0.12)]) },
      lamp: { parts: [G(GEO.cyl(0.07, 0.1, 1.8, 6), WOOD, 0, 0.9), G(GEO.cyl(0.16, 0.12, 0.3, 6), 0x5a3a20, 0, 1.85), G(GEO.cone(0.2, 0.5, 6), 0xff8a1c, 0, 2.25), G(GEO.cone(0.11, 0.32, 6), 0xffe066, 0, 2.18)] },
      bush: { tint: true, parts: [G(GEO.ball(0.42), TINT, 0, 0.36), ...around(5, (a) => paint(spin(GEO.ball(0.3, 0).scale(0.45, 0.12, 1.3).rotateX(-0.3).translate(0, 0.45, 0.45), a), TINT))] },
      bench: { parts: [G(GEO.cyl(0.28, 0.3, 1.5, 8), WOOD, 0, 0.29, 0, null, [0, 0, Math.PI / 2]), G(GEO.cyl(0.24, 0.24, 0.04, 8), 0xd8a86a, 0.76, 0.29, 0, null, [0, 0, Math.PI / 2]), G(GEO.ball(0.2, 0), 0x4fb04a, 0.2, 0.55, 0.05, [1.5, 0.4, 1])] },
      tree: { parts: [G(GEO.cyl(0.12, 0.2, 2.3, 6), 0x9a6a3a, 0.1, 1.15, 0, null, [0, 0, -0.08]), ...around(6, (a) => paint(spin(GEO.ball(0.5, 0).scale(1.9, 0.14, 0.5).translate(0.85, 0, 0).rotateZ(-0.35).translate(0.2, 2.35, 0), a), PALM)), ...[[0.1, 0.12], [0.3, -0.1]].map(([x, z]) => G(GEO.ball(0.13, 0), 0x6a4a2a, x, 2.15, z))] },
      bigTree: { parts: [G(GEO.cyl(0.45, 0.6, 2, 8), 0x7a5a3a, 0, 1), ...around(9, (a, k) => paint(spin(GEO.ball(0.6, 0).scale(2.6, 0.13, 0.5).translate(1.4, 0, 0).rotateZ(-0.2 - (k % 3) * 0.25).translate(0, 2.1, 0), a), k % 2 ? PALM : 0x5cb85c)), G(GEO.ball(0.5, 0), 0xff8a1c, 0, 2.2)] },
      car: { parts: [G(GEO.box(1.8, 0.35, 1), WOOD, 0, 0.62), G(GEO.box(1.8, 0.35, 0.08), 0x6a4a2a, 0, 0.95, 0.46), G(GEO.box(1.8, 0.35, 0.08), 0x6a4a2a, 0, 0.95, -0.46), ...[0.62, -0.62].map((z) => G(GEO.cyl(0.46, 0.46, 0.22, 9), STONE, 0, 0.46, z, null, [Math.PI / 2, 0, 0])), G(GEO.ball(0.3, 0), STONE, -0.4, 1, 0), G(GEO.ball(0.25, 0), 0xa8a296, 0.35, 0.95, 0.1)] },
      bus: { tint: true, parts: [G(GEO.ball(1.4), TINT, -0.2, 1.4, 0, [1.4, 0.8, 0.9]), G(GEO.ball(0.8), TINT, 2, 1.3), G(GEO.cyl(1.15, 1.15, 0.22, 10), 0xf0c080, 1.5, 1.85, 0, null, [0, 0, Math.PI / 2 - 0.4]), ...[[2.3, 0.35], [2.3, -0.35]].map(([x, z]) => G(GEO.cone(0.13, 0.9, 5), BONE, x + 0.45, 1.75, z, null, [0, 0, -1.2])), G(GEO.cone(0.12, 0.5, 5), BONE, 2.85, 1.3, 0, null, [0, 0, -1.4]), ...legs([[-1.1, 0.6], [-1.1, -0.6], [0.8, 0.6], [0.8, -0.6]], 0.3, 1, TINT), G(GEO.cone(0.5, 1.8, 6), TINT, -2.4, 1.2, 0, null, [0, 0, Math.PI / 2 + 0.25]), ...[-0.2, 0.2].map((z) => G(GEO.ball(0.08, 0), DARK, 2.45, 1.5, z * 2.5))] },
      kiosk: { parts: [G(GEO.cyl(1.1, 1.2, 1.4, 8), 0xb5835a, 0, 0.7), G(GEO.cone(1.65, 1.7, 8), STRAW, 0, 2.2), G(GEO.box(0.6, 0.9, 0.1), DARK, 0, 0.45, 1.15), G(GEO.cyl(0.05, 0.05, 0.6), WOOD, 0, 3.2)] },
      cottage: { parts: [G(GEO.cyl(1.7, 1.95, 2.4, 9), 0xb0a898, 0, 1.2), ...[0.5, 1.3, 2].map((y) => G(GEO.ring(1.8, 0.12), 0x8a847a, 0, y, 0, null, [Math.PI / 2, 0, 0])), G(GEO.cone(2.6, 2.3, 9), STRAW, 0, 3.55), G(GEO.box(0.9, 1.3, 0.1), DARK, 0, 0.65, 1.85), ...egg(0.3, 1.9, 0.38, 1.2)] },
      house: { parts: [G(GEO.cyl(0.8, 1.05, 4, 8), WOOD, 0, 2), G(GEO.box(5, 0.4, 4.2), 0xa8783e, 0, 4.1), G(GEO.box(3.4, 2.2, 3), 0xc97b4a, 0, 5.4), G(GEO.cone(2.9, 1.8, 4), STRAW, 0, 7.4, 0, null, [0, Math.PI / 4, 0]), G(GEO.ball(1.6), PALM, 1.6, 8, -1, [1, 0.6, 1]), G(GEO.box(0.9, 1.3, 0.1), DARK, 0, 5, 1.55), ...[0.8, 1.6, 2.4, 3.2].map((y) => G(GEO.box(0.9, 0.1, 0.1), WOOD, 2, y, 2.2)), ...[1.55, 2.45].map((x) => G(GEO.box(0.1, 3.8, 0.1), WOOD, x, 1.9, 2.2))] },
      shop: { parts: [G(GEO.ring(2.7, 1.15), 0xa8783e, 0, 0.9, 0, [1, 1, 0.8], [Math.PI / 2, 0, 0]), G(GEO.cyl(2.5, 2.5, 0.4, 10), 0x8a6a3a, 0, 0.4), ...egg(1, -1, 1.5, -0.4), ...egg(0.9, 1.1, 1.4, 0.3), ...egg(0.8, 0, 1.3, 1.3), ...around(10, (a) => paint(spin(GEO.cyl(0.06, 0.06, 1.6, 4).rotateZ(1.2).translate(0, 1.5, 3.4), a), STRAW))] },
      tower: { tint: true, parts: [G(GEO.ball(3), TINT, -0.5, 4, 0, [1.4, 0.85, 0.9]), ...legs([[-2.5, 1.4], [-2.5, -1.4], [1.4, 1.4], [1.4, -1.4]], 0.75, 3.2, TINT), G(GEO.cyl(0.75, 1.2, 8, 8), TINT, 2.6, 8.2, 0, null, [0, 0, -0.38]), G(GEO.ball(1), TINT, 4.4, 12.4, 0, [1.5, 0.8, 0.8]), ...[-0.4, 0.4].map((z) => G(GEO.ball(0.17, 0), DARK, 4.9, 12.7, z * 1.6)), G(GEO.cone(1, 5.5, 7), TINT, -5.6, 3.6, 0, null, [0, 0, Math.PI / 2 + 0.3]), ...[-2, -0.5, 1].map((x) => G(GEO.ball(0.45, 0), 0xffd23f, x, 6.4, 0, [1, 0.5, 1]))] },
      sky: { tint: true, parts: [G(GEO.ball(4.2), TINT, 0, 13, 0, [1.15, 1.3, 0.95], [0, 0, -0.35]), ...[-1.8, 1.8].map((z) => G(GEO.ball(1.6), TINT, -0.5, 4.5, z, [1, 2.6, 1])), ...[-1.8, 1.8].map((z) => G(GEO.box(2.6, 0.8, 1.6), TINT, 0.3, 0.4, z)), G(GEO.box(6, 3.4, 4), TINT, 3.8, 21.5, 0, null, [0, 0, -0.15]), G(GEO.box(4.4, 1.2, 3.6), TINT, 4.4, 19, 0, null, [0, 0, -0.1]), ...[2.6, 3.8, 5, 6.2].flatMap((x) => [1.3, -1.3].map((z) => G(GEO.cone(0.3, 0.8, 4), WHITE, x, 19.8, z, null, [Math.PI, 0, 0]))), ...[-1.2, 1.2].map((z) => G(GEO.ball(0.45, 0), 0xffe066, 4.2, 22.6, z * 1.4)), ...[-1, 1].map((z) => G(GEO.cyl(0.3, 0.3, 2, 5), TINT, 3.4, 13.5, z * 2.2, null, [0, 0, -1])), G(GEO.cone(2.6, 11, 7), TINT, -6.5, 6, 0, null, [0, 0, Math.PI / 2 + 0.5]), ...[-1, 0, 1].map((k) => G(GEO.cone(0.9, 1.8, 4), 0xff8a1c, -2.6 + k * 1.6, 18 + k * 1.4, 0))] },
      castle: { parts: [G(GEO.cyl(4.5, 15, 26, 12), 0x7a5236, 0, 13), G(GEO.cyl(4.2, 4.2, 0.6, 12), 0xff5a1c, 0, 26.2), G(GEO.ball(2.6), 0xffa03a, 0, 26.6, 0, [1, 0.4, 1]), ...around(5, (a, k) => paint(spin(GEO.box(1.4, 15, 0.6).rotateX(-0.42).translate(0, 18 - k * 0.6, 7.2 + k * 0.1), a + k * 0.2), k % 2 ? 0xff8a1c : 0xff5a1c)), G(GEO.ball(3), 0x8a8a8a, 0, 31.5), G(GEO.ball(2.3), 0xa0a0a0, 1.8, 35, 0.5), G(GEO.ball(1.7), 0xb8b8b8, -0.8, 38, -0.4), ...around(8, (a, k) => paint(spin(GEO.ball(1.6, 0).scale(1, 0.7, 1).translate(0, 0.8, 14.6), a + 0.2), STONE)), ...around(6, (a) => paint(spin(GEO.ball(1.2, 0).scale(0.45, 0.12, 2).translate(0, 1, 16), a), PALM))] },
    }
  },
  pumpkin(theme) {
    const PUMP = 0xff8a1c, PUMP2 = 0xe86a10, GLOW = 0xffd23f, GREEN = 0x5a8a3a, NIGHT = 0x2a2238, GHOST = 0xf4f2ff
    const pumpkin = (r, x, y, z, face = false) => [G(GEO.ball(r), PUMP, x, y, z, [1.1, 0.82, 1.1]), ...around(4, (a) => paint(spin(GEO.ball(r).scale(0.45, 0.86, 1.15), a).translate(x, y, z), PUMP2)), G(GEO.cyl(r * 0.12, r * 0.16, r * 0.4, 5), GREEN, x, y + r * 0.9, z), ...(face ? [...[-1, 1].map((k) => G(GEO.cone(r * 0.2, r * 0.3, 3), GLOW, x + k * r * 0.38, y + r * 0.2, z + r * 1.06, null, [Math.PI / 2, 0, 0])), G(GEO.box(r * 0.8, r * 0.16, r * 0.1), GLOW, x, y - r * 0.25, z + r * 1.07)] : [])]
    const windows = (pts, z) => pts.map(([x, y]) => G(GEO.box(0.7, 0.8, 0.06), GLOW, x, y, z))
    return {
      person: { parts: [G(GEO.cone(0.22, 0.5, 8), GHOST, 0, 0.32), G(GEO.ball(0.17, 0), GHOST, 0, 0.6), ...[-0.06, 0.06].map((x) => G(GEO.ball(0.035, 0), DARK, x, 0.64, 0.15))] },
      cone: { parts: pumpkin(0.2, 0, 0.17, 0) },
      hydrant: { parts: [G(GEO.cyl(0.08, 0.09, 0.4, 6), 0xf5f0e0, 0, 0.2), G(GEO.ball(0.06, 0), GLOW, 0, 0.47, 0, [1, 1.7, 1]), G(GEO.cyl(0.14, 0.14, 0.04, 6), 0x8a8aa0, 0, 0.02)] },
      crate: { parts: [G(GEO.box(0.48, 0.5, 0.14), 0x8a8aa0, 0, 0.25), G(GEO.cyl(0.24, 0.24, 0.14, 10), 0x8a8aa0, 0, 0.5, 0, null, [Math.PI / 2, 0, 0]), G(GEO.box(0.2, 0.05, 0.02), 0x5a5a70, 0, 0.45, 0.08), G(GEO.box(0.05, 0.2, 0.02), 0x5a5a70, 0, 0.45, 0.08)] },
      mail: { parts: [G(GEO.ball(0.28), 0x222233, 0, 0.26, 0, [1, 0.85, 1]), G(GEO.ring(0.22, 0.04), 0x333344, 0, 0.47, 0, null, [Math.PI / 2, 0, 0]), G(GEO.cyl(0.21, 0.21, 0.04, 8), 0x7dff4a, 0, 0.47), G(GEO.ball(0.06, 0), 0xb0ff8a, 0.06, 0.52, 0.04)] },
      lamp: { parts: [G(GEO.cyl(0.05, 0.08, 2.2, 6), 0x2a2a3a, 0, 1.1, 0, null, [0, 0, 0.1]), G(GEO.box(0.5, 0.06, 0.06), 0x2a2a3a, 0.1, 2.15), G(GEO.ball(0.22, 0), 0x9dff6a, 0.32, 1.95)] },
      bush: { tint: true, parts: [G(GEO.ball(0.42, 0), TINT, 0, 0.35), G(GEO.ball(0.3, 0), TINT, 0.3, 0.3, 0.1), ...[-0.12, 0.12].map((x) => G(GEO.ball(0.04, 0), GLOW, x, 0.42, 0.4))] },
      bench: { parts: [...[-0.5, 0, 0.5].map((x, i) => G(GEO.box(0.18, 0.8 + (i % 2) * 0.15, 0.06), 0x5a4a3a, x, 0.42, 0, null, [0, 0, (i - 1) * 0.12])), G(GEO.box(1.3, 0.1, 0.07), 0x4a3a2a, 0, 0.55, 0.05, null, [0, 0, 0.1])] },
      tree: { parts: [G(GEO.cyl(0.1, 0.2, 2.1, 5), 0x3a2e2a, 0, 1.05), ...[[1.3, 0.7, 0], [1.6, -0.8, 2], [1.9, 0.6, 4], [1.1, -0.6, 3.2]].map(([y, z, a]) => paint(spin(GEO.cyl(0.04, 0.07, 1, 4).rotateZ(z).translate(Math.sin(z) * -0.4, y + 0.35, 0), a), 0x3a2e2a)), G(GEO.ball(0.12, 0), GLOW, 0.3, 1.9, 0.2)] },
      bigTree: { parts: pumpkin(1.5, 0, 1.25, 0, true) },
      car: { parts: [G(GEO.ball(0.75), PUMP, 0, 0.95, 0, [1.25, 0.9, 0.95]), G(GEO.box(0.5, 0.6, 0.06), GLOW, 0.1, 0.95, 0.72), ...[[-0.6, 0.55], [0.6, 0.55], [-0.6, -0.55], [0.6, -0.55]].map(([x, z]) => G(GEO.ring(0.36, 0.06), 0x2a2a3a, x, 0.4, z)), G(GEO.cyl(0.08, 0.1, 0.3, 5), GREEN, 0, 1.75), G(GEO.box(0.12, 0.6, 0.12), 0x2a2a3a, 1, 0.8, 0)] },
      bus: { parts: [G(GEO.ball(1.2), 0x1e1a2a, 0, 1.15, 0, [1.5, 0.75, 0.8]), G(GEO.ball(0.8), 0x1e1a2a, 1.9, 1.9), ...[-0.4, 0.4].map((z) => G(GEO.cone(0.3, 0.65, 4), 0x1e1a2a, 2, 2.75, z)), ...[-0.3, 0.3].map((z) => G(GEO.ball(0.16, 0), 0xc8ff4a, 2.6, 2, z)), G(GEO.cyl(0.14, 0.18, 2.2, 6), 0x1e1a2a, -2, 2.2, 0, null, [0, 0, 0.6]), ...legs([[-1, 0.5], [-1, -0.5], [1, 0.5], [1, -0.5]], 0.2, 0.7, 0x1e1a2a)] },
      kiosk: { parts: [G(GEO.ball(1.25), 0x222233, 0, 1.25, 0, [1, 0.8, 1]), G(GEO.ring(1, 0.12), 0x333344, 0, 2.05, 0, null, [Math.PI / 2, 0, 0]), G(GEO.cyl(0.98, 0.98, 0.08, 10), 0x7dff4a, 0, 2.05), ...[[0.3, 0.2], [-0.4, -0.2], [0.1, -0.5]].map(([x, z]) => G(GEO.ball(0.22, 0), 0xb0ff8a, x, 2.25, z)), ...around(5, (a) => paint(spin(GEO.cone(0.25, 0.7, 4).translate(0, 0.35, 1.2), a), 0xff8a1c))] },
      cottage: { parts: [G(GEO.box(3.4, 2.6, 3), 0xa07ad0, 0, 1.3, 0, null, [0, 0, 0.04]), G(GEO.cone(2.7, 3.6, 4), 0x5a3a8a, 0.2, 4.3, 0, null, [0, Math.PI / 4, 0.12]), ...windows([[-0.9, 1.5], [0.9, 1.5]], 1.53), G(GEO.box(0.8, 1.3, 0.06), 0x2a1a10, 0, 0.65, 1.53), G(GEO.cyl(0.04, 0.04, 2, 4), 0x6a4a2a, 2, 1, 1.4, null, [0, 0, 0.3]), G(GEO.cone(0.3, 0.6, 6), 0xc8a040, 1.75, 0.1, 1.4, null, [0, 0, 0.3])] },
      house: { parts: [G(GEO.box(5, 4.4, 4.2), 0x8a7aa8, 0, 2.2), roof(5, 3.4, 4.2, 0x4a3a6a, 4.4), ...windows([[-1.5, 1.5], [1.5, 1.5], [-1.5, 3.3], [1.5, 3.3]], 2.13), G(GEO.box(1, 1.8, 0.06), 0x2a1a10, 0, 0.9, 2.13), G(GEO.cyl(0.9, 0.9, 6, 8), 0x9a8ab8, 2.4, 3, -1.8), G(GEO.cone(1.2, 2.4, 8), 0x8a2be2, 2.4, 7.2, -1.8), G(GEO.box(0.5, 0.6, 0.06), GLOW, 2.4, 5, -0.88)] },
      shop: { parts: [...pumpkin(3.2, 0, 2.6, 0), G(GEO.box(1.2, 1.6, 0.2), 0x2a1a10, 0, 1.3, 2.75), ...[-1.6, 1.6].map((x) => G(GEO.cone(0.55, 0.8, 3), GLOW, x, 3.2, 3.3, null, [Math.PI / 2, 0, 0])), G(GEO.cyl(0.35, 0.35, 1.6, 6), 0x3a3a4a, 2, 5.4, -1)] },
      tower: { parts: [G(GEO.cyl(3, 3.6, 10, 10), 0x8a80a8, 0, 5), G(GEO.cone(4.4, 6, 10), 0x8a2be2, 0, 13), G(GEO.ring(3.1, 0.3), 0x3a3050, 0, 10, 0, null, [Math.PI / 2, 0, 0]), ...[[2, 0], [5, 1.2], [7.6, -1], [4, -2.4]].map(([y, a]) => paint(spin(GEO.box(0.8, 1.1, 0.2).translate(0, y, 3.3), a), GLOW)), G(GEO.box(1.4, 2.2, 0.2), 0x2a1a10, 0, 1.1, 3.5), G(GEO.ball(0.7, 0), GLOW, 0, 16.3)] },
      sky: { parts: [G(GEO.box(9, 22, 9), 0x5a4a7a, 0, 11), roof(9, 9, 9, 0x3a2a5a, 22), G(GEO.cyl(3, 3, 0.4, 16), 0xfff2b0, 0, 17, 4.6, null, [Math.PI / 2, 0, 0]), G(GEO.box(0.3, 2.4, 0.1), DARK, 0, 17.9, 4.85), G(GEO.box(1.8, 0.3, 0.1), DARK, 0.7, 17, 4.85), ...[[-2.6, 4], [0, 4], [2.6, 4], [-2.6, 8], [2.6, 8], [-2.6, 12], [0, 12], [2.6, 12]].flatMap(([x, y]) => [G(GEO.box(1, 1.6, 0.1), GLOW, x, y, 4.55), G(GEO.box(1, 1.6, 0.1), GLOW, x, y, -4.55)]), G(GEO.cyl(0.08, 0.08, 4), DARK, 0, 32), ...[[-5, 26, 2], [4.5, 28, -1]].map(([x, y, z]) => G(GEO.box(1.6, 0.1, 0.6), 0x1e1a2a, x, y, z, null, [0, 0.3, 0.3]))] },
      castle: { parts: [...pumpkin(11, 0, 9.4, 0), ...[-1, 1].map((k) => G(GEO.cone(2.6, 3.4, 3), GLOW, k * 4.4, 12, 11.9, null, [Math.PI / 2, 0, 0])), G(GEO.cone(1.4, 2, 3), GLOW, 0, 9.4, 12.3, null, [Math.PI / 2, 0, 0]), ...[-6, -3, 0, 3, 6].map((x, i) => G(GEO.box(2.6, i % 2 ? 1.8 : 2.8, 0.6), GLOW, x, 5.6 + (i % 2) * 0.5, 11.2 - Math.abs(x) * 0.25)), G(GEO.cyl(10, 10, 0.7, 14), NIGHT, 0, 17.6), G(GEO.cone(6.5, 14, 12), NIGHT, 0.6, 24.6, 0, null, [0, 0, -0.1]), G(GEO.ring(6.4, 0.6), 0x8a2be2, 0, 18.6, 0, null, [Math.PI / 2, 0, 0]), G(GEO.box(2, 2, 0.5), GLOW, 0, 18.6, 6.3)] },
    }
  },
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
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap
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
  if (world.ground) { scene.remove(world.ground); world.ground.material.map.dispose() }
  if (world.shadow) scene.remove(world.shadow, world.moving)
  if (world.far) scene.remove(world.far)
  if (world.fx) { scene.remove(world.fx.group); world.fx = null }
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
// a locked town on the title screen: every thing as a dark shape, the ground dimmed
const SHADE = new THREE.MeshBasicMaterial({ color: 0x2b2148 })
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
  // the model is picked from the position, not Math.random, so &classic and the new look share one layout
  for (const r of list) { r.base = r.kind; const v = VARIANTS[r.kind]; if (!CLASSIC && !theme.kit && v) r.kind = v[Math.abs(Math.round(r.x * 7 + r.z * 13 + list.length)) % v.length] }
  return list
}

function buildWorld(index, dim = false) {
  clearWorld(); landClear()
  const theme = THEMES[index]
  scene.background = new THREE.Color(theme.sky)
  scene.fog = new THREE.Fog(theme.fog, theme.fogNear ?? 140, theme.fogFar ?? 420)
  const span = WORLD * 2 + 40
  world.ground = new THREE.Mesh(new THREE.PlaneGeometry(span, span).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: groundTexture(theme), depthWrite: false, toneMapped: false }))
  world.ground.renderOrder = -2; scene.add(world.ground)
  world.far = new THREE.Mesh(new THREE.PlaneGeometry(1400, 1400).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: theme.grass, depthWrite: false, toneMapped: false }))
  if (dim) { world.ground.material.color.set(0x8a84a8); world.far.material.color.multiply(new THREE.Color(0x8a84a8)) }
  world.far.position.y = -0.02; world.far.renderOrder = -3; scene.add(world.far)
  if (sunLight) { world.catcher = new THREE.Mesh(new THREE.PlaneGeometry(span, span).rotateX(-Math.PI / 2), new THREE.ShadowMaterial({ color: 0x2a1d5c, opacity: 0.32, depthWrite: false })); world.catcher.position.y = 0.03; world.catcher.receiveShadow = true; world.catcher.renderOrder = -1; scene.add(world.catcher) }
  if (theme.fx === 'sea') seaFx()
  const kinds = buildKinds(theme); world.kinds = kinds
  const records = layout(theme), counts = {}
  for (const r of records) counts[r.kind] = (counts[r.kind] || 0) + 1
  for (const name in counts) {
    const geometry = kinds[name].geometry || merge(kinds[name].parts)
    const mesh = new THREE.InstancedMesh(geometry, dim ? SHADE : SOLID, counts[name])
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
  records.forEach((record, id) => {
    const kind = kinds[record.kind]
    const item = { ...record, id, r: kind.r, index: kind.next++, alive: true, wobble: 0, pts: Math.round(10 * kind.r * kind.r * (theme.mult || 1)), mass: 0.12 + 0.12 * kind.r * kind.r }
    if (record.color !== null && kind.tint) world.meshes[record.kind].setColorAt(item.index, COLOR.set(record.color))
    else if (kind.tint) world.meshes[record.kind].setColorAt(item.index, COLOR.set(WHITE))
    if (!record.still && (record.base === 'person' || record.base === 'car' || record.base === 'bus')) {
      const fast = record.base !== 'person'
      item.mover = true; item.sid = movingShadows++
      item.axis = Math.random() < 0.5
      item.lane = -half - PITCH / 2 + Math.floor(rnd(0, GRID + 1)) * PITCH + (fast ? pick([-1.5, 1.5]) : pick([-3.5, 3.5]))
      item.dir = pick([-1, 1])
      item.along = rnd(-WORLD, WORLD)
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
// ---------------------------------------------------------------- swallowed-kinds book
// Every kind of thing in a town (smallest to the castle slot) gets a small picture, drawn once per town from its own model:
// in colour once swallowed, a dark silhouette until then. Shown on the title's town card; a first swallow pops it up in the run.
const ICON = 72, icons = {}
const iconScene = new THREE.Scene()
iconScene.add(new THREE.HemisphereLight(0xffffff, 0x8a80b0, 2.3)); { const sun = new THREE.DirectionalLight(0xffffff, 1.7); sun.position.set(-1, 2, 1.4); iconScene.add(sun) }
const iconCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 1000)
const iconTarget = new THREE.WebGLRenderTarget(ICON, ICON); iconTarget.texture.colorSpace = THREE.SRGBColorSpace
const iconPixels = new Uint8Array(ICON * ICON * 4), iconCanvas = document.createElement('canvas'); iconCanvas.width = iconCanvas.height = ICON
const ICON_SHADE = new THREE.MeshBasicMaterial({ color: 0x9a8fc8 })
function drawIcon(geometry, material) {
  geometry.computeBoundingSphere(); const { center, radius } = geometry.boundingSphere
  const mesh = new THREE.Mesh(geometry, material); iconScene.add(mesh)
  const d = new THREE.Vector3(0.9, 0.85, 1.25).normalize().multiplyScalar(radius * 6)
  iconCamera.position.copy(center).add(d); iconCamera.lookAt(center)
  const R = radius * 1.02; iconCamera.left = -R; iconCamera.right = R; iconCamera.top = R; iconCamera.bottom = -R; iconCamera.near = radius * 0.5; iconCamera.far = radius * 12; iconCamera.updateProjectionMatrix()
  const clear = renderer.getClearAlpha(), color = renderer.getClearColor(new THREE.Color()), tone = renderer.toneMapping
  renderer.setRenderTarget(iconTarget); renderer.setClearColor(0x000000, 0); renderer.toneMapping = THREE.NoToneMapping; renderer.clear(); renderer.render(iconScene, iconCamera)
  renderer.readRenderTargetPixels(iconTarget, 0, 0, ICON, ICON, iconPixels)
  renderer.setRenderTarget(null); renderer.setClearColor(color, clear); renderer.toneMapping = tone
  iconScene.remove(mesh)
  const g = iconCanvas.getContext('2d'), image = g.createImageData(ICON, ICON)
  for (let y = 0; y < ICON; y++) image.data.set(iconPixels.subarray((ICON - 1 - y) * ICON * 4, (ICON - y) * ICON * 4), y * ICON * 4) // rows come bottom-up
  g.putImageData(image, 0, 0)
  return iconCanvas.toDataURL()
}
function makeIcons(index) {
  if (icons[index]) return icons[index]
  // straight from the town's own kinds and layout, so the title card works before that town is built
  const theme = THEMES[index], kinds = buildKinds(theme), first = {}
  for (const record of layout(theme)) if (!first[record.base || record.kind]) first[record.base || record.kind] = record
  icons[index] = Object.values(first).map((record) => ({ record, r: kinds[record.kind].r })).sort((a, b) => a.r - b.r).map(({ record }) => {
    const kind = kinds[record.kind], own = !kind.geometry, geometry = kind.geometry || merge(kind.parts), tinted = kind.tint && record.color !== null
    const material = new THREE.MeshLambertMaterial({ vertexColors: true, color: tinted ? record.color : WHITE })
    const icon = { base: record.base || record.kind, img: drawIcon(geometry, material), shade: drawIcon(geometry, ICON_SHADE) }
    material.dispose(); if (own) geometry.dispose()
    return icon
  })
  for (const k in kinds) kinds[k].geometry?.dispose() // the baked models built just for the pictures
  return icons[index]
}
// 11-21 (사용자 "느리다"): the town's pictures (two GPU read-backs per kind) wait until the title is on screen; at boot they held the loading screen ~1 s
let dexLater = true
function renderDex() {
  if (dexLater && !icons[save.town]) { $('townDex').classList.add('hide'); return }
  const town = save.town, dex = $('townDex'), list = isLocked(town) ? null : makeIcons(town)
  if (!list || isLocked(town)) { dex.classList.add('hide'); $('townCard').classList.remove('full'); return }
  const seen = save.seen[town], got = list.filter((x) => seen.includes(x.base)).length
  dex.innerHTML = `<span>${t('dex')} ${got}/${list.length}</span><div>${list.map((x) => `<img src="${seen.includes(x.base) ? x.img : x.shade}" alt="">`).join('')}</div>`
  dex.classList.remove('hide'); $('townCard').classList.toggle('full', got === list.length)
}
// a kind swallowed for the first time: its picture pops up under the score bar (no words, a short sound)
function dexPop(base) {
  const icon = icons[save.town]?.find((x) => x.base === base); if (!icon) return
  const img = document.createElement('img'); img.src = icon.img; img.className = 'dexPop'; img.style.setProperty('--dx', `${Math.round(rnd(-40, 40))}px`)
  $('hud').appendChild(img); setTimeout(() => img.remove(), 650)
  audio.play('buy', 0.4, 1.35)
}

function place(item, tilt = 0, tiltX = 0, tiltZ = 0) {
  if (!juice.tilt) tilt = 0
  dummy.position.set(item.x, 0, item.z)
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
// The helper hole (a rewarded ad's reward, offered when the run stalls): a smaller mint hole that roams by itself for a few seconds
// and swallows what fits it; points and growth go to the player.
const HELP_TIME = 12
const helper = { on: false, left: 0, x: 0, z: 0, r: 1, shown: 0, vx: 0, vz: 0, tx: 0, tz: 0, wait: 0, eaten: 0, group: new THREE.Group() }
{
  const ring = new THREE.Mesh(rim.geometry, new THREE.MeshLambertMaterial({ color: 0x2ee6a6 })); ring.position.y = 0.06
  const look = eyes.clone(); helper.group.add(new THREE.Mesh(disc.geometry, disc.material), ring, look); helper.look = look
  helper.group.children[0].position.y = 0.04; helper.group.children[0].renderOrder = -1
  helper.group.visible = false; scene.add(helper.group)
}

// ---------------------------------------------------------------- hole types (11-14 user: 구멍 넷, BALANCE.md '구멍 종류')
// All four move with the same one drag and score the same per thing (no damage multiplier); only how they move and spit differs.
// None touches what the in-run cards change (suction range/force, speed, growth): twin splits the size, trail leaves holes behind,
// slide keeps the momentum after the finger lifts (same top speed).
const HOLES = [
  { id: 'basic', name: 'hBasic', shots: 36 },
  { id: 'twin', name: 'hTwin', shots: 40, need: 0 }, // two holes of 0.72 the radius side by side (about the same total area); the camera follows their middle at the full size
  { id: 'tail', name: 'hTail', shots: 64, need: 1 }, // a small hole (0.4 of the radius) stays 2 s every 0.22 s of moving
  { id: 'slide', name: 'hSlide', shots: 12, need: 2 }, // turning takes longer and it glides on after release
]
const holeOpen = (k) => HOLES[k].need === undefined || isFallen(HOLES[k].need)
const TWIN = 0.72, TAIL_LIFE = 2, TAIL_EVERY = 0.3, TAIL_R = 0.3
function holeLook(withEyes) {
  const g = new THREE.Group(), d = new THREE.Mesh(disc.geometry, disc.material), ring = new THREE.Mesh(rim.geometry, rimMaterial)
  d.position.y = 0.04; d.renderOrder = -1; ring.position.y = 0.06; g.add(d, ring)
  if (withEyes) g.add(eyes.clone())
  g.visible = false; scene.add(g); return g
}
const twins = [0, 1].map(() => ({ x: 0, z: 0, r: 1, group: holeLook(true) }))
const trail = Array.from({ length: 12 }, () => ({ x: 0, z: 0, r: 0, life: 0, group: holeLook(false) }))
const holeKind = () => game.holeKind || 0
// the twins stand across the way they move
// the two holes overlap a little, so the middle (where the player aims) still eats
// twinSpread / twinFlip: recording only (__render.twin), the player's game always has 1 / false
let twinSpread = 1, twinFlip = false
function twinPlace() {
  const r = hole.r * TWIN, off = r * 0.8 * twinSpread, px = Math.cos(hole.ang || 0), pz = Math.sin(hole.ang || 0)
  twins.forEach((h, i) => { const s = i ? 1 : -1; h.x = hole.x + px * off * s; h.z = hole.z + pz * off * s; h.r = r })
}
function eaters() {
  const k = holeKind()
  if (k === 1) {
    const two = twinFlip ? [twins[1], twins[0]] : twins
    if (twinSpread > 1.25) return two // recording only: held apart, the two do not overlap yet, so there is no middle
    pair.x = hole.x; pair.z = hole.z; pair.r = hole.r * TWIN_PAIR; return [...two, pair]
  }
  if (k === 2) return [hole, ...trail.filter((h) => h.life > 0)]
  return [hole]
}
// the middle where the two twins overlap swallows things too big for either one alone (a bit smaller than the full hole)
const TWIN_PAIR = 0.86, pair = { x: 0, z: 0, r: 1 }
const biteR = () => holeKind() === 1 ? hole.r * TWIN_PAIR : hole.r
function holeTick(dt) {
  const k = holeKind(), speed = Math.hypot(hole.vx, hole.vz)
  if (k === 1) {
    if (speed > 1) { const want = Math.atan2(hole.vz, hole.vx) + Math.PI / 2; let d = want - (hole.ang || 0); d = Math.atan2(Math.sin(d), Math.cos(d)); if (Math.abs(d) > Math.PI / 2) d -= Math.sign(d) * Math.PI; hole.ang = (hole.ang || 0) + d * clamp(dt * 5, 0, 1) }
    twinPlace()
  }
  if (k === 2) {
    for (const h of trail) if (h.life > 0) h.life -= dt
    game.tailClock = (game.tailClock || 0) - dt
    if (game.tailClock <= 0 && speed > 1.5) {
      game.tailClock = TAIL_EVERY
      const h = trail.find((x) => x.life <= 0) || trail.reduce((a, b) => (a.life < b.life ? a : b))
      h.x = hole.x; h.z = hole.z; h.r = Math.max(0.6, hole.r * TAIL_R); h.life = TAIL_LIFE
    }
  }
}
function holeLooks(R) {
  const k = holeKind()
  hole.group.visible = k !== 1
  twinPlace()
  twins.forEach((h, i) => {
    h.group.visible = k === 1
    if (k !== 1) return
    const s = R * TWIN; h.group.position.set(h.x, 0, h.z)
    h.group.children[0].scale.setScalar(s); h.group.children[1].scale.set(s, 1, s); h.group.children[2].scale.set(s * 1.3, eyes.scale.y / R * s, s * 1.3)
  })
  for (const h of trail) {
    const on = k === 2 && h.life > 0 && game.state === 'run'
    h.group.visible = on; if (!on) continue
    const s = h.r * Math.min(1, (TAIL_LIFE - h.life) / 0.15) * Math.min(1, h.life / 0.35)
    h.group.position.set(h.x, 0, h.z); h.group.children[0].scale.setScalar(s); h.group.children[1].scale.set(s, 1, s)
  }
}
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
function burst(x, z, count, size, color, y = 0.4) {
  if (!juice.sparks) return
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

// ---------------------------------------------------------------- run
const game = { fx: [], sur: [], dropAt: [], dropN: 0, dropGot: 0, mag: false, surGold: 0, surN: 0, surPlaced: 0, ate: [], mod: { pull: 1, speed: 1, combo: 1, grow: 1, frenzy: 0 }, cards: [], cardAt: [], count: 0, frenzyCount: 0, state: 'load', time: 90, total: 90, score: 0, eaten: 0, combo: 0, comboTime: 0, frenzy: false, finished: false, seenHint: false, gold: 0, sizeShown: 1, shake: 0, punch: 0, freeze: 0, startR: 1, firstAction: false, doubled: false, more: false, moreLeft: 0, nextTown: false, lastEat: 90, helped: false, helpOffers: 0, helpOffer: 0, helpCool: 0 }
const input = { x: 0, z: 0, active: false, id: null, ox: 0, oy: 0, mouse: false, keys: new Set() }
const baseSpeed = () => 7.5 + save.up.speed * 0.6
const pullRange = () => (0.3 + save.up.magnet * 0.14) * game.mod.pull * (game.mag ? DROP.magnetRange : 1)
const startRadius = () => 1 + save.up.start * 0.28

function resetRun() {
  buildWorld(save.town)
  hole.x = -PITCH * 2.5; hole.z = PITCH * 2.5; hole.vx = hole.vz = 0
  game.startR = startRadius(); hole.r = hole.shown = game.startR
  // 11-22 user "1,2 둘 다 해": the very first run is short (39% left mid-run, never saw the result screen, upgrades or unlocks)
  game.total = game.time = (save.runs === 0 && !RENDER && !BOT && !Q.has('run') ? FIRST_RUN : RUN) + save.up.time * 3
  Object.assign(game, { score: 0, eaten: 0, combo: 0, comboTime: 0, frenzy: false, finished: false, gold: 0, sizeShown: 1, shake: 0, firstAction: false, doubled: false, more: false, nextTown: false, lastEat: game.total, helped: false, helpOffers: 0, helpOffer: 0, helpCool: 8 })
  game.mod = { pull: 1, speed: 1, combo: 1, grow: 1, frenzy: 0 }; game.cards = []; game.cardAt = [...CARD_AT]; game.clock = 0; game.count = 0; game.frenzyCount = 0
  game.ate = []; shot.view = false
  game.holeKind = Q.has('hole') ? clamp(+Q.get('hole') || 0, 0, 3) : (game.trial ?? save.hole ?? 0); game.trial = null; hole.ang = 0; game.tailClock = 0; trail.forEach((h) => { h.life = 0 })
  fallers.forEach(clearFaller); helperOff(); $('helpRing').classList.add('hide')
  game.fx = []; fxChips(); game.surGold = 0; game.surN = 0; surPlace(); dropPlan()
}
function clearFaller(f) { f.item = null; f.up.visible = f.down.visible = false }
const sizeOf = (r, start) => 1 + Math.floor((r - start) / 0.8 + 1e-6)
const size = () => Math.max(1, sizeOf(hole.r, game.startR)) // a short shrink must not show size 0

function startRun() {
  audio.unlock(); audio.play('click')
  resetRun()
  show('hud'); hide_('title'); hide_('result'); hide_('pause'); hide_('panel')
  game.state = 'run'; game.played = 0
  audio.music('run')
  platform.message('gameplay_started')
  platform.track('progression_started', { town_id: save.town, step_index: save.town + 1, size: 1, duration_s: 0, run: Math.min(save.runs + 1, 50), hole: HOLES[holeKind()].id })
  objPick()
  if (!game.seenHint && save.runs === 0) setHint('hand') // a hand sliding left and right, no words (11-26, Melt Bot's way)
}
// Time's up with the town still standing: once a run, a rewarded ad buys 15 more seconds (from the second run on).
const canMore = () => !game.more && save.runs >= 1 && adsOk()
function offerMore() {
  $('helpRing').classList.add('hide'); game.helpOffer = 0
  game.more = true; game.state = 'more'; game.moreLeft = 5; game.time = 0; updateHud()
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
// Offered when the run stalls (3 s with nothing eaten, or on pace to miss the next star), from the second run on,
// at most twice a run for 6 s each, and taken at most once.
const canHelp = () => !game.helped && game.helpOffers < 2 && game.helpCool <= 0 && !helper.on && game.time > 14 && !game.frenzy && !RENDER && !BOT && (platform.ready || Q.has('fakead'))
// rewarded ads can play: the portal is up and its bridge has not found an ad blocker or a failed ad (CrazyGames bridge sets unavailable)
const adsOk = () => (platform.ready && !window.bridge?.advertisement?.unavailable) || Q.has('fakead')
// the in-run helper ad: not on CrazyGames (no ad button on the play screen, ads rules 11-18), there the full gauge calls the helper
const adHelp = () => adsOk() && window.bridge?.platform?.id !== 'crazygames'
const FREE_FILL = 0.3 // of the one-star score
function helpCheck(dt) {
  if (!adHelp()) {
    const ring = $('helpRing')
    if (game.helped || RENDER || BOT || save.runs < 1 || game.frenzy) { ring.classList.add('hide'); return }
    const p = Math.min(1, game.score / (THEMES[save.town].goal * 0.5 * FREE_FILL)), full = p >= 1
    if (ring.classList.contains('hide')) { $('helpBtn').textContent = t('helper'); ring.classList.add('free'); ring.classList.remove('hide') }
    ring.style.setProperty('--p', p); ring.classList.toggle('full', full); $('helpBtn').disabled = !full
    return
  }
  if (game.helpOffer > 0) {
    game.helpOffer -= dt; $('helpRing').style.setProperty('--p', Math.max(0, game.helpOffer / 6))
    if (game.helpOffer <= 0) { $('helpRing').classList.add('hide'); game.helpCool = 15 }
    return
  }
  game.helpCool -= dt
  if (!canHelp()) return
  const goal = THEMES[save.town].goal, want = [goal * 0.5, goal, goal * 1.8][save.stars[save.town]], spent = game.total - game.time
  const stuck = game.lastEat - game.time >= 3, behind = want && spent >= game.total * 0.4 && game.score / spent * game.total < want
  if (stuck || behind) offerHelp()
}
function offerHelp() {
  game.helpOffers++; game.helpOffer = 6
  $('helpBtn').textContent = t('helper'); $('helpBtn').disabled = false; $('helpRing').style.setProperty('--p', 1); $('helpRing').classList.remove('hide')
}
function helperStart() {
  helper.on = true; helper.left = HELP_TIME; helper.eaten = 0; helper.wait = 0
  helper.r = Math.max(game.startR, hole.r * 0.8); helper.shown = 0.2
  helper.x = hole.x + hole.r + helper.r + 1; helper.z = hole.z; helper.vx = helper.vz = 0
  helper.group.visible = true
  banner(t('helperGo')); audio.play('levelup'); burst(helper.x, helper.z, 30, 1, 0x2ee6a6)
}
function helperOff() { helper.on = false; helper.group.visible = false }
function helperTick(dt) {
  if (!helper.on) return
  helper.left -= dt
  if (helper.left <= 0) { burst(helper.x, helper.z, 24, 0.9, 0x2ee6a6); audio.play('gulp2', 0.7); helperOff(); return }
  helper.r = lerp(helper.r, Math.max(game.startR, hole.r * 0.8), clamp(dt * 2, 0, 1))
  // it stays on screen next to the player: only things within a leash of the player's hole (narrower on a portrait phone)
  const leash = 5 + hole.r * 2.2, tall = innerWidth < innerHeight, lx = leash * (tall ? 1 : 1.8), lz = leash * (tall ? 1.4 : 0.9)
  helper.wait -= dt
  if (helper.wait <= 0) {
    helper.wait = 0.35; let best = null, score = -1
    for (const item of world.items) {
      if (!item.alive || item.r >= helper.r * 0.96 || Math.abs(item.x - hole.x) > lx || Math.abs(item.z - hole.z) > lz || Math.hypot(item.x - hole.x, item.z - hole.z) < hole.r * 1.6 + helper.r) continue // the player's hole gets those anyway
      const s = item.pts / (Math.hypot(item.x - helper.x, item.z - helper.z) + 4)
      if (s > score) { score = s; best = item }
    }
    if (best) { helper.tx = best.x; helper.tz = best.z } else { const a = helper.left * 1.3; helper.tx = hole.x + Math.cos(a) * lx * 0.6; helper.tz = hole.z + Math.sin(a) * lz * 0.6 }
  }
  let dx = (helper.tx - helper.x) / 3, dz = (helper.tz - helper.z) / 3
  const len = Math.hypot(dx, dz); if (len > 1) { dx /= len; dz /= len }
  const speed = baseSpeed() + Math.sqrt(helper.r) * 2.2
  helper.vx = lerp(helper.vx, dx * speed, clamp(dt * 10, 0, 1)); helper.vz = lerp(helper.vz, dz * speed, clamp(dt * 10, 0, 1))
  const edge = WORLD + 6
  helper.x = clamp(helper.x + helper.vx * dt, -edge, edge); helper.z = clamp(helper.z + helper.vz * dt, -edge, edge)
  helper.x = clamp(helper.x, hole.x - lx, hole.x + lx); helper.z = clamp(helper.z, hole.z - lz, hole.z + lz)
  // never on top of the player's hole: slide out to its rim
  const gx = helper.x - hole.x, gz = helper.z - hole.z, gap = Math.hypot(gx, gz) || 0.01, room = hole.r + helper.r + 0.3
  if (gap < room) { helper.x = hole.x + gx / gap * room; helper.z = hole.z + gz / gap * room }
}
function setHint(text) { const h = $('hint'); h.classList.toggle('hand', text === 'hand'); h.textContent = text === 'hand' ? '\u{1F446}' : text; h.classList.toggle('on', !!text) }
function pauseRun() { if (game.state !== 'run') return; game.state = 'pause'; renderPause(); show('pause'); platform.message('gameplay_stopped') }
function resumeRun() { if (game.state !== 'pause') return; platform.paused = false; audio.unlock(); hide_('pause'); game.state = 'run'; last = performance.now(); platform.message('gameplay_started') }

function endRun(cleared) {
  if (game.finished) return
  game.finished = true; game.state = 'over'
  fxEnd(); surMarks.forEach((s) => { s.visible = false }); game.sur = []; dropsOff() // true size for the records; marks off for the spit-shot
  platform.message('gameplay_stopped'); setHint('')
  audio.play('end'); audio.music('menu')
  const town = save.town, ratio = game.eaten / world.total, goal = THEMES[town].goal
  hide_('more'); helperOff(); $('helpRing').classList.add('hide')
  const stars = (game.score >= goal * 0.5 ? 1 : 0) + (game.score >= goal ? 1 : 0) + (game.score >= goal * 1.8 ? 1 : 0)
  // landmark: damage adds up over runs until it falls; a fallen one stands fresh each run (BALANCE.md '대표 건물')
  const hp = landHp(town), wasFallen = isFallen(town), before = wasFallen ? 0 : Math.min(save.dmg[town] || 0, hp)
  const fell = before + game.score >= hp, firstFall = fell && !wasFallen
  if (!wasFallen) { save.lmRuns[town] = (save.lmRuns[town] || 0) + 1; save.dmg[town] = Math.min(hp, before + game.score) }
  if (firstFall) save.fallen.push(town)
  platform.track('landmark_hit', { town_id: town, damage: Math.round(game.score), total: Math.round(Math.min(hp, before + game.score)), hp: Math.round(hp), runs: save.lmRuns[town] })
  if (firstFall) platform.track('landmark_collapsed', { town_id: town, runs: save.lmRuns[town] })
  const bonus = 1 + save.up.gold * 0.1
  game.gold = Math.round((game.score / GOLD_DIV + 15 + stars * 30) * bonus) + game.surGold // table: BALANCE.md '판당 강화 단계'; + surprise coins (Double gold doubles them too)
  save.gold += game.gold; save.runs++
  // first run, however it went: a new hole look, worn at once (11-22 user "1,2 둘 다 해")
  const firstGift = save.runs === 1 && !save.skins.includes(1)
  if (firstGift) { save.skins.push(1); save.skin = 1; rimMaterial.color.set(SKINS[1].color); eyeWhite.color.set(SKINS[1].eye ?? 0xffffff) }
  save.bigR = Math.max(+save.bigR || 0, hole.r)
  // progress record: one star or more = completed, otherwise failed (reason: time ran out or the player ended it)
  platform.track(stars >= 1 ? 'progression_completed' : 'progression_failed', { town_id: town, step_index: town + 1, size: size(), duration_s: Math.round(game.played || 0), stars, reason: cleared ? 'cleared' : game.quit ? 'quit' : 'time', helped: game.helped, more: game.more })
  perf.flush(); game.quit = false
  save.bestSize = Math.max(save.bestSize || 0, size()); save.bestEat = Math.max(save.bestEat || 0, game.count); save.bestFrenzy = Math.max(save.bestFrenzy || 0, game.frenzyCount)
  ranks.send(game.score, hole.r) // Playgama leaderboards: best score and hole size (x10, shown with one decimal)
  // town news: the first 1-star run and the first 3-star run of a town each print one line, once
  let paper = ''
  if (stars >= 3 && !(save.news[town] & 2)) { paper = NEWS[lang][town][1]; save.news[town] |= 3 }
  else if (stars >= 1 && !(save.news[town] & 1)) { paper = NEWS[lang][town][0]; save.news[town] |= 1 }
  $('resPaper').textContent = paper; $('resPaper').classList.toggle('hide', !paper)
  save.stars[town] = Math.max(save.stars[town], stars)
  if (!save.played.includes(town)) save.played.push(town)
  goalsAfterRun()
  const record = game.score > save.best[town]; save.best[town] = Math.max(save.best[town], Math.round(game.score))
  writeSave()
  $('resTitle').textContent = cleared ? t('cleared') : t('timeUp')
  $('resStars').innerHTML = [0, 1, 2].map((i) => `<i class="${i < stars ? 'on' : ''}" style="animation-delay:${i * 0.18}s"></i>`).join('')
  $('resEatenLabel').textContent = t('eaten'); $('resEaten').textContent = `${Math.round(ratio * 100)}%`
  $('resBestLabel').textContent = t('best'); $('resBest').textContent = Math.round(save.best[town]).toLocaleString('en-US')
  $('resGold').textContent = `+${game.gold}`
  { const o = game.obj, el = $('resObj'); el.classList.toggle('hide', !o); if (o) { const icon = icons[town]?.find((x) => x.base === o.k); el.classList.toggle('miss', !o.done); el.innerHTML = `<img src="${icon?.img || ''}" alt=""><span></span>`; el.lastChild.textContent = o.done ? `+${o.gold.toLocaleString('en-US')}` : `${o.got}/${o.n}`; platform.track('run_goal', { town_id: town, goal: o.k, n: o.n, got: o.got, done: o.done ? 1 : 0 }) } }
  $('doubleBtn').textContent = t('double'); $('doubleBtn').disabled = false
  // The next town is open and never played: the big button takes you there (most players left after the first result, 11-05).
  // the big button goes on whenever the next town is open (11-08 user "다시 하기 아니지 않아?", "다음으로 넘어가도 되자나.. 별3개든 뭐든"); replay = Home
  const opened = town < THEMES.length - 1 && isFallen(town) && !save.best[town + 1]
  if (opened) platform.track('town_unlocked', { town_id: town + 1, step_index: town + 2 })
  game.nextTown = town < THEMES.length - 1 && isFallen(town)
  $('resNew').classList.toggle('hide', !opened && !firstGift)
  if (firstGift && !opened) $('resNew').innerHTML = `<div class="reveal"><i class="giftSkin" style="background:#${SKINS[1].color.toString(16).padStart(6, '0')}"></i></div><small>${t('newSkin')}</small>`
  $('result').classList.toggle('opening', opened) // room for the town picture: eaten / best step aside on this one screen
  if (opened) $('resNew').innerHTML = `<div class="reveal"><img src="img/town${town + 1}.webp" alt=""><i class="lock"></i></div><small>${t('newTown')}</small><b>${TOWN_NAMES[lang][town + 1]}</b>`
  // the next star still to get in this town and the score it needs
  const targets = [goal * 0.5, goal, goal * 1.8], want = save.stars[town]
  $('resNext').classList.toggle('hide', want >= 3 || opened)
  if (want < 3) $('resNext').innerHTML = `<span class="stars">${[0, 1, 2].map((i) => `<i class="${i < want ? 'on' : i === want ? 'want' : ''}"></i>`).join('')}</span><b>${Math.round(targets[want]).toLocaleString('en-US')}</b>`
  const againLabel = game.nextTown ? `${TOWN_NAMES[lang][town + 1]} ▶` : `${t('again')} ▶`
  $('againBtn').innerHTML = '<i class="cd"><b></b></i><span></span>'; $('againBtn').lastChild.textContent = againLabel
  $('againBtn').classList.toggle('long', againLabel.length > 11); $('againBtn').classList.toggle('longer', againLabel.length > 18); $('homeBtn').textContent = t('home')
  $('doubleBtn').classList.toggle('hide', !platform.ready || !adsOk())
  $('rankBtn').classList.toggle('hide', !ranks.canShow())
  renderUpgrades($('resUp'))
  $('againBtn').classList.add('pulse')
  const showResult = () => { show('result'); hide_('hud'); startCount(); if (opened) setTimeout(() => { if (game.state === 'over') audio.play('levelup') }, 1200) }
  const reveal = firstFall ? () => trophyPop(town, showResult) : showResult
  // the spit-shot plays first (about 4-5 s, a tap skips it); the bot at turbo speed and recordings go straight to the result
  if (RENDER || (BOT && TURBO && !Q.has('spit')) || Q.has('noshot')) setTimeout(reveal, 700)
  else { game.state = 'shot'; setTimeout(() => { if (game.state === 'shot') shotStart(reveal, { before, hp, fell }) }, 300) }
  window.__runs = window.__runs || []; window.__runs.push({ score: Math.round(game.score), eaten: Math.round(ratio * 100), r: +hole.r.toFixed(1), stars, gold: game.gold, obj: game.obj ? `${game.obj.k} ${game.obj.got}/${game.obj.n}${game.obj.done ? ' done' : ''}` : '', cnt: game.cnt, sur: `${game.surN}/${game.surPlaced}`, drop: `${game.dropGot}/${game.dropN}` })
  game.cnt = null
}

function swallow(item, by = hole) {
  item.alive = false; hide(item)
  const f = fallers.find((x) => !x.item)
  if (f) {
    const kind = world.kinds[item.kind]
    f.item = item; f.age = 0; f.life = clamp(0.42 + item.r * 0.08, 0.42, 1.1); f.spin = rnd(-1, 1) * (item.r < 3 ? 2.4 : 0.7); f.hr = hole.r; f.thud = false; f.by = by; f.hr = by.r
    f.up.geometry = f.down.geometry = kind.geometry
    const tinted = kind.tint && item.color !== null
    f.up.material.color.set(tinted ? item.color : WHITE); f.down.material.color.set(tinted ? item.color : WHITE)
    f.up.visible = f.down.visible = true
    f.sx = item.x; f.sz = item.z
    f.ax = by.x - item.x; f.az = by.z - item.z
    const len = Math.hypot(f.ax, f.az) || 1; f.ax /= len; f.az /= len
  }
  { const base = item.base || item.kind, seen = save.seen[save.town]; if (!seen.includes(base)) { seen.push(base); dexPop(base) } }
  objEat(item); if (item.sur) surHit(item)
  if (BOT && Q.has('cnt') && game.clock < game.total * 0.35) { const b = baseOf(item); game.cnt = game.cnt || {}; game.cnt[b] = (game.cnt[b] || 0) + 1 } // bot's first 35% of a run ~ a person's whole run (goal counts)
  game.comboTime = 1.4 * game.mod.combo; game.combo++; game.lastEat = game.time; if (by === helper) helper.eaten++
  game.count++; if (game.frenzy) game.frenzyCount++
  const mult = 1 + Math.min(game.combo, 60) / 12
  const gain = item.pts * mult * (game.frenzy ? 2 : 1)
  game.score += gain; game.eaten += item.pts
  { const kind = world.kinds[item.kind]; game.ate.push({ kind: item.kind, color: kind.tint && item.color !== null ? item.color : null, gain, r: item.r }) } // poured out again at the end (spit-shot)
  hole.r = Math.sqrt(hole.r * hole.r + item.mass * GROW * game.mod.grow)
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
  } else if (item.r >= 1.4) { audio.play('crunch', 0.7, rnd(0.9, 1.2)); burst(item.x, item.z, 5, 0.6, debris) }
  else if (Math.random() < 0.35) burst(item.x, item.z, 1, 0.35, debris)
  else audio.play(Math.random() < 0.5 ? 'gulp1' : 'gulp2', 0.55, clamp(0.85 + game.combo * 0.012, 0.85, 1.6))
}
const GROW = 0.42
// one run: 60 s ended most visits at the first result (Playgama 30 days: half left between 1 and 2 min, 11-08), so 90 s
// 11-11 user "90초 너무 긴거 아닐까 기본시간 70초 어때": 70 s, town goals re-fit in BALANCE.md (?run=90 for the bot to compare)
const FIRST_RUN = 45 // first run only (11-22), BALANCE.md '첫 판'
const RUN = Number(Q.get('run')) || 85 // 11-17 user "85초로 해": Playgama sandbox wants a 5:00 average play (3:55 at 70 s, 2.9 runs a visit)
// score per gold. 11-08 user "광고를 볼 필요가 없는 레벨 맞는거야?": at /40 one run bought 2-3 upgrade levels (bot 6-16), so Double gold meant nothing.
// /120 aims at about 1 level a run without ads and 2 with Double gold (BALANCE.md '판당 강화 단계').
const GOLD_DIV = 120

function floatText(text, x, z, big) {
  fall.vector.set(x, 1, z).project(camera)
  const span = document.createElement('span')
  span.textContent = text
  span.style.left = `${(fall.vector.x * 0.5 + 0.5) * 100}%`; span.style.top = `${(-fall.vector.y * 0.5 + 0.5) * 100}%`
  if (big) span.style.fontSize = '34px'
  $('float').appendChild(span); setTimeout(() => span.remove(), 800)
}
function banner(text) { const b = $('banner'); b.textContent = text; b.classList.remove('on'); void b.offsetWidth; b.classList.add('on') }
// coins pour from a spot in the town to a HUD element (run goal, surprise coins): looks only, the gold is already added
function coinShower(x, z, to, count = 10) {
  fall.vector.set(x, 1, z).project(camera)
  const x0 = (fall.vector.x * 0.5 + 0.5) * innerWidth, y0 = (-fall.vector.y * 0.5 + 0.5) * innerHeight, end = to.getBoundingClientRect()
  for (let k = 0; k < count; k++) {
    const c = document.createElement('span'); c.className = 'coin flyCoin'; document.body.appendChild(c)
    const sx = x0 + rnd(-30, 30), sy = y0 + rnd(-20, 20), ex = end.left + end.width / 2 - 13, ey = end.top + end.height / 2 - 13
    const anim = c.animate([{ transform: `translate(${sx}px,${sy}px) scale(.6)` }, { transform: `translate(${(sx + ex) / 2 + rnd(-90, 90)}px,${Math.min(sy, ey) - rnd(40, 110)}px) scale(1.25)`, offset: 0.45 }, { transform: `translate(${ex}px,${ey}px) scale(.8)` }], { duration: 620, delay: k * 40, easing: 'ease-in', fill: 'both' })
    anim.onfinish = () => c.remove()
  }
}

// ---------------------------------------------------------------- one goal a run (11-26 user '예'; Hole Arena: the goal pays far more than the placing)
// At the start a goal card pops up (the thing's own picture + how many), then it stays top left and fills. Done = big burst + gold.
// Only kinds the hole can reach this run (its start size or the best size so far); values in BALANCE.md '판 목표'.
const OBJ_TEXT = { en: { goal: 'Goal', done: 'Goal done!' }, ko: { goal: '목표', done: '목표 달성!' }, es: { goal: 'Meta', done: '¡Meta lograda!' }, pt: { goal: 'Meta', done: 'Meta cumprida!' }, ru: { goal: 'Цель', done: 'Цель есть!' }, tr: { goal: 'Hedef', done: 'Hedef tamam!' }, de: { goal: 'Ziel', done: 'Ziel erreicht!' }, fr: { goal: 'Objectif', done: 'Objectif atteint !' }, ja: { goal: 'ミッション', done: 'ミッション達成!' }, zh: { goal: '目标', done: '目标达成!' } }
const objT = () => OBJ_TEXT[lang] || OBJ_TEXT.en
const EXTRA = !RENDER && !Q.has('noextra') // recordings and the before/after bot keep the plain run
const OBJ_N = { person: 15, cone: 5, hydrant: 5, crate: 6, bush: 20, bench: 10, lamp: 3, mail: 4, tree: 25, car: 3, bigTree: 5, kiosk: 2, bus: 2, cottage: 3, house: 3, shop: 3, tower: 2, sky: 1, castle: 1 } // 85 s, a hole just big enough (bot's first 35% of a run, 11-26)
const OBJ_GOLD = 1.5, OBJ_SHORT = 0.6 // gold = (town goal / 120 + 45) x 1.5 = a 2-star run's gold x 1.5; the 45 s first run asks 0.6 of the count
const objGold = (town) => Math.max(50, Math.round((THEMES[town].goal / GOLD_DIV + 45) * OBJ_GOLD / 10) * 10)
const objReach = () => Math.max(game.startR + 2, (+save.bigR || 0) * 0.85)
const baseOf = (item) => item.base || item.kind
function objPick() {
  game.obj = null; $('obj').classList.add('hide'); $('objIntro').classList.remove('on')
  if (!EXTRA) return
  const have = {}; for (const it of world.items) { const b = baseOf(it); if (OBJ_N[b]) have[b] = (have[b] || 0) + 1 }
  const reach = objReach(), ok = Object.keys(OBJ_N).filter((b) => have[b] && world.kinds[b] && world.kinds[b].r < reach)
  const list = ok.length > 1 ? ok.filter((b) => b !== game.lastObj) : ok
  if (!list.length) return
  const k = have[Q.get('obj')] ? Q.get('obj') : pick(list)
  let n = Math.round(OBJ_N[k] * (game.total < 60 ? OBJ_SHORT : 1) * (OBJ_N[k] > 1 ? clamp(reach / (world.kinds[k].r * 4), 1, 3) : 1)) // a hole far bigger than the thing eats more of them
  n = Math.max(1, Math.min(n, Math.ceil(have[k] * 0.6))); if (n >= 10) n = Math.round(n / 5) * 5
  game.obj = { k, n, got: 0, done: false, gold: objGold(save.town) }; game.lastObj = k
  const icon = makeIcons(save.town).find((x) => x.base === k), chip = $('obj'), intro = $('objIntro')
  chip.firstChild.src = icon?.img || ''; chip.classList.remove('done', 'hide'); chip.style.setProperty('--p', 0)
  intro.children[0].textContent = objT().goal; intro.children[1].src = icon?.img || ''; intro.children[2].textContent = `×${n}`
  intro.classList.remove('on'); void intro.offsetWidth; intro.classList.add('on')
  objHud()
}
function objHud() { const o = game.obj; if (!o) return; hudText('objText', o.done ? '✓' : `${o.got}/${o.n}`); $('obj').style.setProperty('--p', Math.min(1, o.got / o.n)) }
function objEat(item) {
  const o = game.obj; if (!o || o.done || baseOf(item) !== o.k) return
  o.got++; objHud(); const chip = $('obj'); chip.classList.remove('bump'); void chip.offsetWidth; chip.classList.add('bump')
  if (o.got >= o.n) objDone()
}
function objDone() {
  const o = game.obj; o.done = true; save.gold += o.gold; objHud()
  $('obj').classList.add('done'); banner(objT().done); audio.play('levelup'); audio.play('buy', 0.9)
  for (const c of [0xffd23f, 0x2ee6a6, 0xff4f8b, 0x7b4dff, 0xffffff]) burst(hole.x + rnd(-0.6, 0.6) * hole.r, hole.z + rnd(-0.6, 0.6) * hole.r, 34, clamp(hole.r / 4, 0.8, 2.4), c, 1)
  pulseAge = 0; game.shake = Math.max(game.shake, 0.7); game.punch = Math.max(game.punch, 0.8)
  floatText(`+${o.gold.toLocaleString('en-US')}`, hole.x, hole.z, true); coinShower(hole.x, hole.z, $('obj'), 14)
  platform.track('run_goal_done', { town_id: save.town, goal: o.k, n: o.n, at_s: Math.round(game.clock) })
}

// ---------------------------------------------------------------- round picture badges (marks over things, the effect chips at the bottom)
function badge(bg, draw) {
  const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d')
  x.beginPath(); x.arc(64, 64, 54, 0, Math.PI * 2); x.fillStyle = bg; x.fill(); x.lineWidth = 10; x.strokeStyle = '#24183f'; x.stroke()
  x.fillStyle = x.strokeStyle = '#24183f'; x.lineCap = x.lineJoin = 'round'; draw(x)
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; return { tex, url: c.toDataURL() }
}
const glyph = (ch, color) => (x) => { x.fillStyle = color; x.font = '900 86px Arial, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(ch, 64, 71) }
const chevrons = (up, color) => (x) => { x.lineWidth = 15; x.strokeStyle = color; for (const yc of [50, 80]) { const d = up ? 13 : -13; x.beginPath(); x.moveTo(38, yc + d); x.lineTo(64, yc - d); x.lineTo(90, yc + d); x.stroke() } }
const star = (x) => { x.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 17 : 40; x.lineTo(64 + Math.cos(a) * r, 66 + Math.sin(a) * r) } x.closePath(); x.fillStyle = '#fff'; x.fill(); x.lineWidth = 6; x.stroke() }
const magnet = (x) => { x.lineWidth = 22; x.strokeStyle = '#ff3b4e'; x.lineCap = 'butt'; x.beginPath(); x.moveTo(42, 34); x.lineTo(42, 62); x.arc(64, 62, 22, Math.PI, 0, true); x.lineTo(86, 34); x.stroke(); x.strokeStyle = '#e8ecf5'; for (const px of [42, 86]) { x.beginPath(); x.moveTo(px, 24); x.lineTo(px, 38); x.stroke() } }
const BADGE = {}
function badges() {
  if (!BADGE.ask) Object.assign(BADGE, { ask: badge('#ffd23f', glyph('?', '#24183f')), danger: badge('#ff4f5e', glyph('!', '#fff')), jack: badge('#ffb400', star), magnet: badge('#bfe9ff', magnet), grow: badge('#2ee6a6', chevrons(true, '#24183f')), shrink: badge('#b58cff', chevrons(false, '#24183f')) })
  return BADGE
}
// a short change of size (surprise shrink, drops): the area taken or given comes back when it ends, so growth eaten meanwhile stays
function sizeFx(kind, k, secs) {
  const r0 = hole.r, r1 = Math.max(0.6, r0 * k), area = r1 * r1 - r0 * r0
  hole.r = r1; game.fx.push({ kind, left: secs, total: secs, area }); fxChips(); pulseAge = 0
}
function fxChips() {
  game.mag = game.fx.some((f) => f.kind === 'magnet')
  const row = $('fxRow'); row.innerHTML = ''
  for (const f of game.fx) { const c = document.createElement('i'); c.className = 'fx'; c.style.backgroundImage = `url(${badges()[f.kind].url})`; row.appendChild(c); f.el = c }
}
function fxTick(dt) {
  if (!game.fx.length) return
  let gone = false
  for (const f of game.fx) {
    f.left -= dt; f.el?.style.setProperty('--p', clamp(f.left / f.total, 0, 1).toFixed(2))
    if (f.left <= 0) { gone = true; if (f.area) { hole.r = Math.sqrt(Math.max(0.36, hole.r * hole.r - f.area)); pulseAge = 0; burst(hole.x, hole.z, 16, clamp(hole.r / 5, 0.6, 1.6), f.kind === 'shrink' ? 0x2ee6a6 : 0xb58cff) } }
  }
  if (gone) { game.fx = game.fx.filter((f) => f.left > 0); fxChips() }
}
function fxEnd() { for (const f of game.fx) if (f.area) hole.r = Math.sqrt(Math.max(0.36, hole.r * hole.r - f.area)); game.fx = []; fxChips() }

// ---------------------------------------------------------------- surprise boxes (11-26, Rampage's windows: you never know what comes out)
// 5-8 things a run that the hole can reach carry a bobbing mark. '?' = a coin bundle, +5 s or a short shrink.
// The blinking one is red '!' (shrink) and a gold star (3 bundles) by turns: swallow it on gold. Values in BALANCE.md '깜짝 상자'.
const SUR = { min: 5, max: 8, coin: 0.15, jack: 3, time: 5, shrink: 0.78, shrinkT: 4, red: 2, gold: 1.6 }
const surGold = () => Math.max(10, Math.round((THEMES[save.town].goal / GOLD_DIV + 45) * SUR.coin / 10) * 10)
const surMarks = []
function surMark(i) {
  if (!surMarks[i]) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: badges().ask.tex, depthTest: false, fog: false })); s.renderOrder = 6; s.visible = false; scene.add(s); surMarks[i] = s }
  return surMarks[i]
}
const surRed = (item) => (game.clock + item.id * 0.37) % (SUR.red + SUR.gold) < SUR.red
function surPlace() {
  game.sur = []; surMarks.forEach((s) => { s.visible = false })
  if (!EXTRA) return
  const reach = Math.max(game.startR + 2.5, (+save.bigR || 0) * 0.85), near = [], far = []
  for (const it of world.items) if (it.alive && !it.mover && it.r >= 0.8 && it.r < reach && baseOf(it) !== 'castle') (Math.hypot(it.x - hole.x, it.z - hole.z) < 70 ? near : far).push(it)
  const n = SUR.min + Math.floor(Math.random() * (SUR.max - SUR.min + 1)), picks = []
  const take = (list, want) => { for (let k = 0; k < 300 && picks.length < want && list.length; k++) { const it = pick(list); if (picks.every((p) => Math.hypot(p.x - it.x, p.z - it.z) > 18)) picks.push(it) } }
  take(near, Math.ceil(n / 2)); take(far, n); take(near, n)
  const types = picks.map((_, i) => i === 0 || (i === 4 && n >= 7) ? 'toggle' : ['coin', 'time', 'shrink'][i - 1] || pick(['coin', 'coin', 'time', 'shrink'])).sort(() => Math.random() - 0.5)
  game.surPlaced = picks.length
  picks.forEach((it, i) => { it.sur = types[i]; it.mark = surMark(i); it.mark.material.map = badges()[it.sur === 'toggle' ? 'danger' : 'ask'].tex; it.mark.visible = true; game.sur.push(it) })
}
function surTick() {
  if (!game.sur.length) return
  const s = clamp(2.2 + hole.r * 0.4, 2.6, 12), bob = Math.sin(game.clock * 4)
  for (const it of game.sur) {
    if (!it.sur) continue
    const m = it.mark, h = world.kinds[it.kind].h || 2
    m.position.set(it.x, h + s * 0.62 + bob * s * 0.12, it.z); m.scale.setScalar(s * (1 + bob * 0.05))
    if (it.sur === 'toggle') { const map = badges()[surRed(it) ? 'danger' : 'jack'].tex; if (m.material.map !== map) m.material.map = map }
  }
}
function surHit(item) {
  item.mark.visible = false
  let type = item.sur; item.sur = null; game.surN++
  if (type === 'toggle') type = surRed(item) ? 'shrink' : 'jack'
  if (type === 'coin' || type === 'jack') {
    const g = surGold() * (type === 'jack' ? SUR.jack : 1); game.surGold += g
    floatText(`+${g.toLocaleString('en-US')}`, item.x, item.z, true); burst(item.x, item.z, type === 'jack' ? 60 : 30, 1.2, 0xffd23f, 1); coinShower(item.x, item.z, $('score'), type === 'jack' ? 14 : 7)
    audio.play('buy', 0.9); if (type === 'jack') { banner('×3'); audio.play('levelup'); game.shake = Math.max(game.shake, 0.5) }
  } else if (type === 'time') {
    game.time += SUR.time; floatText(`+${SUR.time}`, item.x, item.z, true); burst(item.x, item.z, 30, 1.2, 0x2ee6a6, 1)
    const tm = $('time'); tm.classList.remove('plus'); void tm.offsetWidth; tm.classList.add('plus'); audio.play('levelup', 0.7)
  } else { sizeFx('shrink', SUR.shrink, SUR.shrinkT); burst(item.x, item.z, 30, 1, 0xb58cff, 1); audio.play('end', 0.5, 1.5); game.shake = Math.max(game.shake, 0.4) }
}

// ---------------------------------------------------------------- drops from the sky (11-26, Holey.io: magnet and grow boosters, a shrink sign to dodge)
// 2-4 a run (2 in the 45 s first run) at random times, ahead of the hole. A ring blinks on the spot 1 s before it falls in.
// Roll over it: magnet (pulls from 3x as far, 2.5x as hard), grow (x1.3), or the purple trap (x0.78). Values in BALANCE.md '떨어지는 것'.
const DROP = { min: 2, max: 4, warn: 1, fall: 0.35, life: 9, from: 10, magnetT: 6, magnetRange: 3, magnetPull: 2.5, growT: 6, grow: 1.3, trapT: 4, trap: 0.78 }
const DROP_KIND = ['magnet', 'magnet', 'grow', 'grow', 'trap'], DROP_COLOR = { magnet: 0x4fc3ff, grow: 0x2ee6a6, trap: 0xb58cff }
const drops = Array.from({ length: 4 }, () => ({ state: '', kind: '', x: 0, z: 0, age: 0, ring: null, sprite: null }))
const magRing = new THREE.Mesh(new THREE.RingGeometry(0.95, 1, 64).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x4fc3ff, transparent: true, opacity: 0.6, depthWrite: false }))
magRing.position.y = 0.14; magRing.visible = false; scene.add(magRing)
function dropMesh(d) {
  if (d.ring) return
  d.ring = new THREE.Mesh(new THREE.RingGeometry(0.72, 1, 40).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9, depthWrite: false }))
  d.ring.position.y = 0.12; d.ring.visible = false; scene.add(d.ring)
  d.sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: badges().magnet.tex, depthTest: false, fog: false })); d.sprite.renderOrder = 7; d.sprite.visible = false; scene.add(d.sprite)
}
function dropsOff() { for (const d of drops) { d.state = ''; if (d.ring) d.ring.visible = d.sprite.visible = false } magRing.visible = false }
function dropPlan() {
  dropsOff(); game.dropAt = []; game.dropN = 0; game.dropGot = 0
  if (!EXTRA) return
  const n = game.total < 60 ? DROP.min : DROP.min + Math.floor(Math.random() * (DROP.max - DROP.min + 1)), span = Math.max(10, game.total - DROP.from - 8)
  for (let i = 0; i < n; i++) game.dropAt.push(DROP.from + span * (i + rnd(0.15, 0.85)) / n)
}
function dropSpawn(kind, x, z) {
  const d = drops.find((q) => !q.state); if (!d) return
  dropMesh(d); d.kind = kind; d.state = 'warn'; d.age = 0
  const edge = WORLD - 2; d.x = clamp(x, -edge, edge); d.z = clamp(z, -edge, edge)
  d.ring.material.color.set(DROP_COLOR[kind]); d.sprite.material.map = badges()[kind === 'trap' ? 'shrink' : kind].tex
  d.ring.position.set(d.x, 0.12, d.z); d.ring.visible = true; d.sprite.visible = false
  audio.play('click', 0.5, 0.7)
}
function dropAuto() {
  // ahead of the hole when it moves (it lands where the player is going, on screen), anywhere around it when it stands
  const sp = Math.hypot(hole.vx, hole.vz), a = rnd(0, Math.PI * 2), ax = sp > 1 ? hole.vx / sp : Math.cos(a), az = sp > 1 ? hole.vz / sp : Math.sin(a)
  const b = rnd(-0.9, 0.9), dist = 6 + hole.r * 1.6, tall = innerWidth < innerHeight // the short side of the screen gets 0.6 of the reach
  dropSpawn(pick(DROP_KIND), hole.x + (ax * Math.cos(b) - az * Math.sin(b)) * dist * (tall ? 0.6 : 1), hole.z + (ax * Math.sin(b) + az * Math.cos(b)) * dist * (tall ? 1 : 0.6)); game.dropN++
}
function dropTick(dt) {
  if (game.dropAt.length && game.clock >= game.dropAt[0] && game.time > 4) { game.dropAt.shift(); dropAuto() }
  magRing.visible = !!game.mag
  if (game.mag) { magRing.position.x = hole.x; magRing.position.z = hole.z; magRing.scale.setScalar(hole.r * (1 + pullRange())); magRing.material.opacity = 0.35 + 0.3 * Math.abs(Math.sin(game.clock * 5)) }
  const s = clamp(2 + hole.r * 0.35, 2.4, 10), R = s * 0.75
  for (const d of drops) {
    if (!d.state) continue
    d.age += dt
    if (d.state === 'warn') {
      const p = d.age / DROP.warn, fallFrom = 1 - DROP.fall / DROP.warn
      d.ring.scale.setScalar(R * (1.5 - 0.5 * Math.min(1, p))); d.ring.material.opacity = 0.45 + 0.55 * Math.abs(Math.sin(d.age * 12))
      if (p > fallFrom) { const f = (p - fallFrom) / (1 - fallFrom); d.sprite.visible = true; d.sprite.scale.setScalar(s); d.sprite.position.set(d.x, s * 0.6 + (1 - f * f) * 40, d.z) }
      if (p >= 1) { d.state = 'idle'; d.age = 0; dustRing(d.x, d.z, R); burst(d.x, d.z, 14, 0.8, DROP_COLOR[d.kind]); audio.play('crunch', 0.6, 1.3) }
      continue
    }
    const bob = Math.sin(d.age * 4)
    d.sprite.scale.setScalar(s * (1 + bob * 0.05)); d.sprite.position.set(d.x, s * 0.6 + bob * s * 0.1, d.z)
    d.ring.scale.setScalar(R * (1 + 0.08 * Math.sin(d.age * 6))); d.ring.material.opacity = 0.85
    d.sprite.visible = !(d.age > DROP.life - 2 && Math.sin(d.age * 20) > 0) // blinks out in its last 2 s
    if (d.age >= DROP.life) { d.state = ''; d.ring.visible = d.sprite.visible = false; continue }
    for (const h of eaters()) if (Math.hypot(h.x - d.x, h.z - d.z) < h.r * 0.9 + 0.6) { dropTake(d); break }
  }
}
function dropTake(d) {
  d.state = ''; d.ring.visible = d.sprite.visible = false; game.dropGot++
  burst(d.x, d.z, 36, 1.2, DROP_COLOR[d.kind], 1)
  if (d.kind === 'magnet') { game.fx.push({ kind: 'magnet', left: DROP.magnetT, total: DROP.magnetT, area: 0 }); fxChips(); audio.play('levelup', 0.8) }
  else if (d.kind === 'grow') { sizeFx('grow', DROP.grow, DROP.growT); audio.play('levelup'); game.punch = Math.max(game.punch, 0.6) }
  else { sizeFx('shrink', DROP.trap, DROP.trapT); audio.play('end', 0.5, 1.5); game.shake = Math.max(game.shake, 0.4) }
}

// ---------------------------------------------------------------- spit-shot: the damage meter (11-14 user "끝에 뱉어 쏘기는 대표 건물에 먹은거 데미지 측정기")
// When the run ends, everything swallowed in it pours back out of the hole and flies into the town's landmark (the castle spot).
// Each hit adds its points to the counter and the counter always runs to the run score: damage = score, values and odds unchanged.
// It fires by itself (no new controls), takes about 4-5 s and a tap skips to the end. Swallowed things go out in order (small first),
// grouped into a few dozen shots so a 3,000-thing run takes as long as a 30-thing one; every group still counts in full.
const SHOT_GLIDE = 0.5, SHOT_FIRE = 2.4, SHOT_FLY = 0.55, SHOT_HOLD = 0.9
const land = { mesh: null, x: 0, z: 0, r: 1, h: 1, rise: 1, wob: 0, stage: 0, fall: -1 }
const shot = { before: 0, hp: 1, fell: false, fallAt: 0, on: false, view: false, t: 0, list: [], shown: 0, total: 0, done: null, end: 0, hold: 0, final: false, gx: 0, gz: 0, hx: 0, hz: 0, sound: 0 }
const shotPool = Array.from({ length: 64 }, () => { const m = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshLambertMaterial({ vertexColors: true })); m.visible = false; m.frustumCulled = false; scene.add(m); return m })
function landClear() {
  if (land.mesh) { scene.remove(land.mesh); land.mesh.material.dispose(); land.mesh.children.forEach((c) => c.geometry.dispose()); land.mesh = null }
  shot.on = shot.view = false; shotPool.forEach((m) => { m.visible = false }); $('shot')?.classList.add('hide')
}
function landBuild() {
  const item = world.items.find((x) => x.kind === 'castle'), kind = world.kinds.castle
  land.mesh = new THREE.Mesh(kind.geometry, new THREE.MeshLambertMaterial({ vertexColors: true, clippingPlanes: [CLIP_UP] }))
  land.mesh.castShadow = true; land.mesh.frustumCulled = false
  land.x = item.x; land.z = item.z; land.r = kind.r; land.h = kind.h || 20; land.wob = 0; land.stage = 0; land.fall = -1; land.mesh.userData.lean = 0
  land.rise = item.alive ? 1 : 0 // already swallowed: it rises back up for the measuring
  if (item.alive) { item.alive = false; hide(item) }
  land.mesh.position.set(land.x, (land.rise - 1) * land.h, land.z)
  scene.add(land.mesh)
}
// the shots: about 36 even groups of what was swallowed, each flying as its biggest thing
function shotPlan() {
  const ate = game.ate.length ? game.ate : game.score > 0 ? [{ kind: 'castle', color: null, gain: game.score, r: 2 }] : []
  const n = Math.min(ate.length, HOLES[holeKind()].shots), list = []
  for (let i = 0; i < n; i++) {
    const from = Math.floor(i * ate.length / n), to = Math.floor((i + 1) * ate.length / n)
    let gain = 0, big = ate[from]
    for (let k = from; k < to; k++) { gain += ate[k].gain; if (ate[k].r > big.r) big = ate[k] }
    list.push({ i, kind: big.kind, color: big.color, r: big.r, gain, at: SHOT_GLIDE + (n > 1 ? i / (n - 1) : 0) * SHOT_FIRE, mesh: null, age: 0, done: false })
  }
  return list
}
function shotStart(done, info) {
  Object.assign(shot, info)
  shot.on = shot.view = true; shot.t = 0; shot.done = done; shot.final = false; shot.shown = 0; shot.total = game.score; shot.sound = 0
  landBuild()
  shot.aspect = 0; $('shot').classList.remove('fell'); shotHp()
  shot.list = shotPlan(); shot.end = (shot.list.at(-1)?.at ?? SHOT_GLIDE) + 0.7
  // the hole glides in front of the landmark, things in the way step aside, the camera frames both
  shot.hx = hole.x; shot.hz = hole.z; hole.vx = hole.vz = 0; hole.ang = 0; trail.forEach((h) => { h.life = 0 })
  shot.gx = land.x; shot.gz = land.z + land.r + hole.r + 6
  // and tall things between the camera and the hole would cover it: they go too
  for (const item of world.items) {
    if (!item.alive) continue
    const near = Math.hypot(item.x - shot.gx, item.z - shot.gz) < hole.r + item.r + 1
    const front = item.r >= 3 && Math.abs(item.x - shot.gx) < hole.r + item.r + 6 && item.z > shot.gz && item.z < shot.gz + hole.r + 34
    if (near || front) { item.alive = false; hide(item) }
  }
  hide_('hud'); setHint('')
  $('shotLabel').textContent = t('dmg'); $('shotNum').textContent = '0'; $('shotSkip').textContent = t('skip')
  $('shot').classList.remove('final'); show('shot')
  audio.play('gulp2', 0.9, 0.7)
}
function shotHit(p) {
  p.done = true; if (p.mesh) { p.mesh.visible = false; p.mesh = null }
  shot.shown += p.gain
  const big = p.r >= 3 || p.big
  burst(p.tx, p.tz, big ? 14 : 5, clamp(p.r / 6, 0.4, 1.4), p.color ?? world.kinds[p.kind]?.avg, p.ty)
  land.wob = Math.min(1, land.wob + (big ? 0.5 : 0.18))
  game.shake = Math.max(game.shake, big ? 0.35 : 0.12)
  if (shot.t - shot.sound > 0.07 || big) { shot.sound = shot.t; audio.play(big ? 'big' : 'crunch', big ? 0.8 : 0.5, rnd(0.9, 1.2)) }
  shotHp()
  const num = $('shotNum'); num.textContent = Math.round(shot.shown).toLocaleString('en-US'); num.classList.remove('bump'); void num.offsetWidth; num.classList.add('bump')
}
function shotTick(dt) {
  shot.t += dt
  const g = clamp(shot.t / SHOT_GLIDE, 0, 1), e = 1 - (1 - g) * (1 - g)
  hole.x = lerp(shot.hx, shot.gx, e); hole.z = lerp(shot.hz, shot.gz, e)
  if (land.rise < 1) { land.rise = Math.min(1, land.rise + dt * 2.2); land.mesh.position.y = (Math.pow(land.rise, 0.6) - 1) * land.h }
  land.wob = Math.max(0, land.wob - dt * 3)
  if (land.mesh && land.fall < 0) { const w = Math.sin(shot.t * 40) * land.wob * 0.035, lean = land.mesh.userData.lean || 0; land.mesh.rotation.set(w + lean * 0.4, 0, w * 0.6 + lean); land.mesh.scale.set(1 + land.wob * 0.03, 1 - land.wob * 0.04, 1 + land.wob * 0.03) }
  for (const p of shot.list) {
    if (p.done || shot.t < p.at) continue
    if (!p.mesh) {
      const m = shotPool.find((x) => !x.visible); if (!m) continue
      const kind = world.kinds[p.kind]
      m.geometry = kind.geometry; m.material.color.set(p.color ?? WHITE); m.visible = true; p.mesh = m
      // basic: one stream, twin: two branches, trail: quick small rapid fire, slide: a few thick cannon balls
      const k = holeKind(), from = k === 1 ? twins[p.i % 2] : hole
      m.scale.setScalar((k === 3 ? clamp(p.r, 2.4, land.r * 0.45) : clamp(p.r, 0.8, land.r * (k === 2 ? 0.16 : 0.3))) / p.r)
      p.sx = from.x + rnd(-0.3, 0.3) * from.r; p.sz = from.z + rnd(-0.3, 0.3) * from.r
      p.tx = land.x + (k === 1 ? (p.i % 2 ? 1 : -1) * rnd(0.15, 0.45) : k === 3 ? rnd(-0.15, 0.15) : rnd(-0.4, 0.4)) * land.r; p.ty = land.h * rnd(0.3, 0.7); p.tz = land.z + land.r * 0.45
      p.fly = k === 2 ? 0.38 : k === 3 ? 0.7 : SHOT_FLY; p.big = k === 3
      p.arc = (5 + Math.hypot(p.tx - p.sx, p.tz - p.sz) * 0.22) * (k === 2 ? 0.5 : k === 3 ? 0.8 : 1); p.spin = rnd(-6, 6) * (k === 3 ? 0.4 : 1)
      if (Math.random() < 0.5) audio.play(Math.random() < 0.5 ? 'gulp1' : 'gulp2', 0.35, rnd(1.2, 1.6))
    }
    p.age += dt
    const u = clamp(p.age / (p.fly || SHOT_FLY), 0, 1)
    p.mesh.position.set(lerp(p.sx, p.tx, u), lerp(-1, p.ty, u) + p.arc * 4 * u * (1 - u), lerp(p.sz, p.tz, u))
    p.mesh.rotation.set(p.age * p.spin, p.age * p.spin * 0.7, 0)
    if (u >= 1) shotHit(p)
  }
  if (!shot.final && shot.t >= shot.end && shot.list.every((p) => p.done)) shotFinal()
  if (shot.final) {
    // the fall comes only after the counter has finished
    if (shot.fell && land.fall < 0 && shot.t >= shot.fallAt) landFallStart()
    if (land.fall >= 0 && land.fall < 1) landFallTick(dt)
    if (shot.t >= shot.hold && (!shot.fell || land.fall >= 1)) shotEnd()
  }
}
// the counter has counted everything: this run's damage
function shotFinal() {
  shot.final = true; shot.shown = shot.total; shot.hold = shot.t + SHOT_HOLD; shot.fallAt = shot.t + 0.5; shotHp()
  if (shot.fell) shot.hold = shot.fallAt + 1.5
  $('shotNum').textContent = Math.round(shot.total).toLocaleString('en-US')
  $('shotLabel').textContent = t('dmgRun').replace('{n}', '').trim()
  $('shot').classList.add('final'); audio.play('levelup', 0.8)
}
// a tap: every shot not yet landed counts at once, then the same ending (a second tap shortens the hold)
function shotSkip() {
  if (!shot.on) return
  if (shot.final) { if (shot.fell && land.fall < 1) { if (land.fall < 0) landFallStart(); land.fall = 1; land.mesh.visible = false } shot.hold = Math.min(shot.hold, shot.t + 0.3); return }
  for (const p of shot.list) if (!p.done) { if (!p.mesh) { p.tx = land.x; p.tz = land.z + land.r * 0.45; p.ty = land.h * 0.5 } shotHit(p) }
  shot.t = Math.max(shot.t, shot.end); shotFinal(); shot.hold = shot.t + 0.6; if (shot.fell) { shot.fallAt = shot.t; shot.hold = shot.t + 1.3 }
}
function shotEnd() {
  shot.on = false; shot.list = []; shotPool.forEach((m) => { m.visible = false })
  hide_('shot'); game.state = 'over'
  const done = shot.done; shot.done = null; done?.()
}
// the hole and the landmark both in view: the landmark's top below the counter, the hole above the bottom edge
const fitCam = new THREE.PerspectiveCamera(), fitV = new THREE.Vector3()
function shotFrame() {
  fitCam.copy(camera)
  // free area: below the counter, above the skip line (screen units -1..1)
  const top = 1 - 2 * ($('shotNum').getBoundingClientRect().bottom + 8) / innerHeight, bottom = -1 + 2 * (innerHeight - $('shotSkip').getBoundingClientRect().top + 4) / innerHeight
  const pts = [[land.x, land.h, land.z - land.r * 0.3], [land.x - land.r, land.h * 0.6, land.z], [land.x + land.r, land.h * 0.6, land.z], [shot.gx, 0, shot.gz + hole.r * 1.7], [shot.gx - hole.r * 1.3, 0, shot.gz], [shot.gx + hole.r * 1.3, 0, shot.gz]]
  const look = (H, cz) => { fitCam.position.set(land.x, H, cz + H * 0.45); fitCam.lookAt(land.x, 0, cz); fitCam.updateMatrixWorld(); return pts.map((p) => { fitV.set(...p).project(fitCam); return [fitV.x, fitV.y, fitV.z] }) }
  // lowest camera (biggest picture) where some aim fits; among those aims, the one nearest the middle of the free area
  let H = Math.max(40, land.h * 1.5), cz = (shot.gz + land.z) / 2
  for (let n = 0; n < 60; n++, H *= 1.05) {
    let best = null, gap = 9
    for (let z = land.z - 30; z <= shot.gz + 30; z += 1) {
      const q = look(H, z)
      if (q.some((v) => Math.abs(v[2]) >= 1) || q[0][1] > top || q[3][1] < bottom || q.some((v) => Math.abs(v[0]) > 0.92)) continue
      const d = Math.abs((q[0][1] + q[3][1] - top - bottom) / 2); if (d < gap) { gap = d; best = z }
    }
    if (best !== null) { cz = best; break }
  }
  shot.camH = H; shot.camZ = cz; shot.aspect = camera.aspect
}
function shotView(dt) {
  if (shot.aspect !== camera.aspect) shotFrame()
  const H = shot.camH, back = H * 0.45
  const shake = game.shake * (save.shake ? 1 : 0); game.shake = Math.max(0, game.shake - dt * 2.2)
  const k = clamp(dt * 4, 0, 1)
  camera.position.x = lerp(camera.position.x, land.x, k) + rnd(-shake, shake)
  camera.position.y = lerp(camera.position.y, H, k)
  camera.position.z = lerp(camera.position.z, shot.camZ + back, k) + rnd(-shake, shake)
  camera.lookAt(camera.position.x, 0, camera.position.z - back)
  aimSun(camera.position.x, camera.position.z - back, Math.max(45, H * 1.5))
}

// ---------------------------------------------------------------- landmark health: cracks and collapse (11-14)
// Health = the town's next-town score (BALANCE.md, the one-star score). Damage adds up over runs in that town; three crack stages
// show at 25 / 50 / 75%. It falls only after the counter has finished, and its fall opens the next town. A fallen landmark stands
// again as a fresh one the next time (the meter still measures), and falls again on a run that alone deals its health.
// town 0 landmark at 60% (2026-11-25 사용자 "첫 동네 랜드마크를 더 작게": half the players never toppled it, time stays 85 s)
const LM_EASY = [0.6]
const landHp = (i) => THEMES[i].goal * 0.5 * (LM_EASY[i] || 1)
const crackStage = (part) => part >= 0.75 ? 3 : part >= 0.5 ? 2 : part >= 0.25 ? 1 : 0
const ray = new THREE.Raycaster(), crackMat = new THREE.MeshBasicMaterial({ color: 0x1a1030 }), rayFrom = new THREE.Vector3(), rayDir = new THREE.Vector3(0, -0.7, -1).normalize(), crackUp = new THREE.Vector3(0, 1, 0), crackSeg = new THREE.Vector3()
function crackAdd(stage) {
  const m = land.mesh; if (!m) return
  const probe = new THREE.Mesh(m.geometry); probe.updateMatrixWorld()
  m.geometry.computeBoundingBox(); const bb = m.geometry.boundingBox, th = (0.22 + stage * 0.07) * land.r / 13.5
  for (let c = 0; c < 4; c++) {
    let x = rnd(bb.min.x, bb.max.x) * 0.75, y = rnd(0.5, 0.95) * bb.max.y, prev = null
    for (let k = 0; k < 7; k++) {
      rayFrom.set(x, y, bb.max.z * 0.3).addScaledVector(rayDir, -80); ray.set(rayFrom, rayDir)
      const hit = ray.intersectObject(probe, false)[0]
      if (hit) {
        const p = hit.point.clone().addScaledVector(hit.face.normal, th * 0.4)
        if (prev && p.distanceTo(prev) < land.r * 0.6) {
          crackSeg.subVectors(p, prev); const len = crackSeg.length()
          const seg = new THREE.Mesh(new THREE.BoxGeometry(th, len + th, th), crackMat)
          seg.position.copy(prev).addScaledVector(crackSeg, 0.5); seg.quaternion.setFromUnitVectors(crackUp, crackSeg.normalize())
          m.add(seg)
        }
        prev = p
      }
      x += rnd(-1.8, 1.8) * land.r / 13.5; y -= rnd(1.6, 3.4) * land.r / 13.5
    }
  }
  m.material.color.setScalar(1 - stage * 0.07)
  if (stage >= 3) m.userData.lean = 0.045
}
function crackTo(stage) {
  while (land.stage < stage) { land.stage++; crackAdd(land.stage); if (shot.on) { burst(land.x, land.z + land.r * 0.5, 22, 1.3, 0x8a7a6a, land.h * 0.5); audio.play('huge', 0.7, 1.2); game.shake = Math.max(game.shake, 0.6) } }
}
function landFallTick(dt) {
  land.fall += dt / 1.1
  const p = clamp(land.fall, 0, 1)
  land.mesh.position.y = -p * p * land.h * 1.15
  land.mesh.rotation.set(p * 0.18, 0, p * 0.3)
  game.shake = Math.max(game.shake, 0.9 * (1 - p))
  if (Math.random() < 0.5) burst(land.x + rnd(-1, 1) * land.r, land.z + rnd(-1, 1) * land.r, 6, 1.6, 0xd8cbb8, 0.5)
  if (p >= 1) land.mesh.visible = false
  return p >= 1
}
function landFallStart() {
  land.fall = 0; banner(t('collapse')); audio.play('huge', 1, 0.7); audio.play('levelup', 0.8)
  for (let i = 0; i < 3; i++) dustRing(land.x, land.z, land.r * (1.1 + i * 0.4))
  burst(land.x, land.z, 60, 2.4, 0xd8cbb8)
  $('shotHpText').textContent = t('collapse'); $('shot').classList.add('fell')
}
function shotHp() {
  const part = clamp((shot.before + shot.shown) / shot.hp, 0, 1)
  $('shotHpBar').style.width = `${part * 100}%`
  if (!$('shot').classList.contains('fell')) $('shotHpText').textContent = `${Math.round(Math.min(shot.before + shot.shown, shot.hp)).toLocaleString('en-US')} / ${Math.round(shot.hp).toLocaleString('en-US')}`
  crackTo(crackStage(part))
}

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
  const speed = (baseSpeed() + Math.sqrt(hole.r) * 2.2) * (game.frenzy ? 1.3 : 1) * game.mod.speed
  // slide hole: slower to turn, and with no finger it keeps gliding (same top speed)
  const grip = holeKind() === 3 ? (len > 0.02 ? 7 : 0.8) : 12
  hole.vx = lerp(hole.vx, dx * speed, clamp(dt * grip, 0, 1)); hole.vz = lerp(hole.vz, dz * speed, clamp(dt * grip, 0, 1))
  const edge = WORLD + 6
  hole.x = clamp(hole.x + hole.vx * dt, -edge, edge); hole.z = clamp(hole.z + hole.vz * dt, -edge, edge)
}

const botState = { x: 0, z: 0, wait: 0 }
function botTarget() {
  botState.wait -= 1 / 60
  if (botState.wait <= 0) {
    // 11-17 user "차를 왜 따라가기만 하고 뻘짓해": aiming at one item made the bot chase cars (they move 5-8/s, it aimed
    // where the car was). Now it heads for the 10x10 cell with the most edible points; movers count only when already close.
    botState.wait = 0.35; const bite = biteR() * 0.96, cells = new Map()
    for (const item of world.items) {
      if (!item.alive || item.r >= bite) continue
      if (item.mover && Math.hypot(item.x - hole.x, item.z - hole.z) > hole.r * 2 + 3) continue
      const k = hashKey(item.x, item.z), c = cells.get(k) || { pts: 0, x: 0, z: 0, n: 0, items: [] }
      const w = item.pts * (item.kind === 'castle' ? 50 : 1); c.pts += w; c.x += item.x * w; c.z += item.z * w; c.n += w; c.items.push(item); cells.set(k, c)
    }
    let score = -1, cell = null
    for (const c of cells.values()) {
      const s = c.pts / (Math.hypot(c.x / c.n - hole.x, c.z / c.n - hole.z) + 8)
      if (s > score) { score = s; cell = c }
    }
    // inside the chosen cell, the nearest edible thing (a cell's middle can be an empty road)
    let near = Infinity
    if (cell) for (const item of cell.items) { const d = Math.hypot(item.x - hole.x, item.z - hole.z); if (d < near) { near = d; botState.x = item.x; botState.z = item.z } }
  }
  return { x: (botState.x - hole.x) / 3, z: (botState.z - hole.z) / 3 }
}

function eat(item, dt, h = hole) {
  const dx = h.x - item.x, dz = h.z - item.z, d = Math.hypot(dx, dz), R = h.r
  const reach = R + item.r * 0.1
  if (d < R - item.r * 0.15 && item.r < R * 0.98) { swallow(item, h); return }
  if (item.r < R * 0.98 && d < R * (1 + pullRange())) {
    if (item.axis === undefined) {
      const pull = dt * (2 + save.up.magnet * 0.9) * (1 + (R - item.r) / R) * game.mod.pull * (game.mag ? DROP.magnetPull : 1)
      item.x += dx / d * pull; item.z += dz / d * pull
      // the part hanging over the hole tips it in, with a nervous shiver
      const over = clamp((R - (d - item.r)) / (2 * item.r), 0, 1)
      const shiver = Math.sin(performance.now() * 0.045 + item.id * 1.7) * 0.05 * over
      const tall = clamp(item.r * 1.6 / (world.kinds[item.kind].h || 1), 0.35, 1)
      place(item, (over * 0.55 + shiver) * tall, dx / (d || 1), dz / (d || 1)); item.wobble = 1; return true
    }
  }
  if (item.r >= R * 0.98 && d < reach + item.r * 0.65 && item.axis === undefined) {
    const shake = Math.sin(performance.now() * 0.05 + item.id) * 0.06 * Math.min(1, R / item.r)
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
    if (helper.on && item.alive) eat(item, dt, helper)
    for (const h of eaters()) if (item.alive) eat(item, dt, h)
  }
  for (const name of world.moverNames) world.meshes[name].instanceMatrix.needsUpdate = true
  let touched = false
  const near = (h) => {
    const reach = h.r * (1 + pullRange()) + 14, from = Math.floor(-reach / CELL), to = Math.ceil(reach / CELL)
    for (let a = from; a <= to; a++) for (let b = from; b <= to; b++) {
      const bucket = world.hash.get(hashKey(h.x + a * CELL, h.z + b * CELL))
      if (!bucket) continue
      for (const item of bucket) if (item.alive && eat(item, dt, h)) touched = true
    }
  }
  if (helper.on) near(helper)
  for (const h of eaters()) near(h)
  if (touched) { for (const name in world.meshes) world.meshes[name].instanceMatrix.needsUpdate = true; world.shadow.instanceMatrix.needsUpdate = true }
  world.moving.instanceMatrix.needsUpdate = true
}

function updateFallers(dt) {
  for (const f of fallers) {
    if (!f.item) continue
    f.age += dt
    // Two beats: it tips over the rim and slides toward the middle, then drops, spinning and stretching.
    const p = clamp(f.age / f.life, 0, 1), item = f.item
    const tip = clamp(p / 0.35, 0, 1), drop = clamp((p - 0.3) / 0.7, 0, 1)
    const slide = (1 - (1 - tip) * (1 - tip)) * 0.55 + drop * 0.4
    const x = lerp(f.sx, f.by.x, slide), z = lerp(f.sz, f.by.z, slide), y = -tip * item.r * 0.25 - drop * drop * (item.r * 3.4 + 3)
    // things nearly as wide as the hole drop straight down; tipping would push them out over the grass
    const kind = world.kinds[item.kind], tall = clamp(item.r * 1.6 / (kind.h || 1), 0.35, 1) * clamp((f.hr - item.r) / f.hr * 3, 0.25, 1)
    const lean = (tip * 0.85 + drop * 0.6) * tall
    const stretch = 1 + drop * 0.22, thin = 1 - drop * 0.25
    const sink = tall < 0.7 ? drop * (kind.h || 0) * 0.6 : 0
    for (const mesh of [f.up, f.down]) {
      mesh.position.set(x, y - sink, z)
      tiltYaw(mesh.quaternion, f.ax, f.az, lean, item.rot + drop * f.spin)
      mesh.scale.set(thin, stretch, thin)
    }
    if (!f.thud && drop > 0.35 && item.r >= 3) { f.thud = true; audio.play('crunch', 0.8, rnd(0.6, 0.75)); game.shake = Math.max(game.shake, clamp(item.r * 0.05, 0.1, 0.6)) }
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

// writes text only when it changed: a write every frame made the browser lay out the HUD 60 times a second (11-21 profile)
const hudText = (id, v) => { const e = $(id); v = String(v); if (e.textContent !== v) e.textContent = v }
function updateHud() {
  hudText('time', Math.ceil(game.time))
  $('time').classList.toggle('low', game.time <= 10)
  hudText('score', Math.round(game.score).toLocaleString('en-US'))
  hudText('sizeText', `${t('size')} ${size()}`)
  if (!game.goalFlash) goalHud()
  const ratio = game.score / (THEMES[save.town].goal * 1.8)
  const bw = `${(clamp(ratio, 0, 1) * 100).toFixed(1)}%`; if ($('eatenBar').style.width !== bw) $('eatenBar').style.width = bw
  const goal = THEMES[save.town].goal, next = [goal * 0.5, goal, goal * 1.8].find((v) => v > game.score) ?? goal * 1.8
  hudText('eatenText', Math.round(next).toLocaleString('en-US'))
  const combo = $('combo')
  if (game.combo >= 8) { const text = `x${(1 + Math.min(game.combo, 60) / 12).toFixed(1)}`; if (combo.textContent !== text) combo.textContent = text; combo.classList.add('on') } else combo.classList.remove('on')
}

function tick(dt) {
  if (game.adHold) dt = 0
  if (game.waitTouch) { if (!input.active && !input.keys.size) dt = 0; else game.waitTouch = false }
  game.time -= dt; game.clock += dt // clock = seconds played this run (the +15 s ad resets time, not this)
  if (!game.frenzy && game.time <= 10 + game.mod.frenzy) { game.frenzy = true; banner(t('frenzy')); audio.play('levelup'); audio.music('run', 1.14); burst(hole.x, hole.z, 40, 1.4) }
  steer(dt)
  holeTick(dt)
  helperTick(dt)
  fxTick(dt); surTick(); dropTick(dt)
  updateWorld(dt)
  helpCheck(dt)
  game.comboTime -= dt
  if (game.comboTime <= 0) game.combo = 0
  const shown = size()
  if (shown > game.sizeShown) {
    game.sizeShown = shown; banner(t('sizeUp')); audio.play('levelup', 0.8); pulseAge = 0; burst(hole.x, hole.z, 26, clamp(hole.r / 5, 0.8, 2.2))
  }
  const left = world.items.some((item) => item.alive)
  if (!left) endRun(true)
  else if (game.time <= 0) { if (canMore()) offerMore(); else endRun(false) }
  else if (game.cardAt.length && game.clock >= game.cardAt[0] && game.time > 6 && !RENDER) { game.cardAt.shift(); offerCards() }
  updateHud()
}

function seaFx() {
  const group = new THREE.Group(), bubbles = [], fish = []
  const rays = new THREE.MeshBasicMaterial({ color: 0xbff4ff, transparent: true, opacity: 0.18, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false })
  for (let i = 0; i < 16; i++) { const m = new THREE.Mesh(new THREE.PlaneGeometry(rnd(5, 12), 130), rays); m.position.set(rnd(-WORLD, WORLD), 40, rnd(-WORLD, WORLD)); m.rotation.set(0, rnd(0, 3), 0.35); m.userData.phase = rnd(0, 6); group.add(m) }
  const bubble = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.32, 1), new THREE.MeshBasicMaterial({ color: 0xeafcff, transparent: true, opacity: 0.7, depthWrite: false, fog: false }), 360)
  for (let i = 0; i < 360; i++) bubbles.push({ x: rnd(-WORLD, WORLD), y: rnd(0, 34), z: rnd(-WORLD, WORLD), s: rnd(0.6, 1.9), v: rnd(2, 4.5) })
  const school = new THREE.InstancedMesh(merge([G(GEO.ball(0.5, 0), 0xffffff, 0, 0, 0, [1.6, 0.8, 0.45]), G(GEO.cone(0.4, 0.5, 4), 0xffffff, -0.9, 0, 0, [1, 1, 0.3], [0, 0, Math.PI / 2])]), new THREE.MeshLambertMaterial({ vertexColors: true }), 96)
  for (let g = 0; g < 8; g++) { const cx = rnd(-WORLD * 0.8, WORLD * 0.8), cz = rnd(-WORLD * 0.8, WORLD * 0.8), R = rnd(12, 30), y = rnd(9, 16), w = rnd(0.25, 0.45) * (Math.random() < 0.5 ? -1 : 1), c = pick([0xffd23f, 0xff8a5c, 0x7fe0ff, 0xffffff]); for (let i = 0; i < 12; i++) { fish.push({ cx, cz, R: R + rnd(-2, 2), y: y + rnd(-1.2, 1.2), w, a: rnd(0, 0.9) + g, k: rnd(0, 6) }); school.setColorAt(g * 12 + i, COLOR.set(c)) } }
  bubble.frustumCulled = school.frustumCulled = false
  group.add(bubble, school); scene.add(group)
  world.fx = { group, bubble, school, bubbles, fish, t: 0 }
}
function updateFx(dt) {
  const fx = world.fx; if (!fx) return
  fx.t += dt
  fx.bubbles.forEach((b, i) => { b.y += b.v * dt; if (b.y > 36) b.y = 0; dummy.position.set(b.x + Math.sin(fx.t * 2 + i) * 0.3, b.y, b.z); dummy.quaternion.identity(); dummy.scale.setScalar(b.s); dummy.updateMatrix(); fx.bubble.setMatrixAt(i, dummy.matrix) })
  fx.fish.forEach((f, i) => { const a = f.a + fx.t * f.w; dummy.position.set(f.cx + Math.cos(a) * f.R, f.y + Math.sin(fx.t * 3 + f.k) * 0.3, f.cz + Math.sin(a) * f.R); dummy.rotation.set(0, -a - Math.sign(f.w) * Math.PI / 2, 0); dummy.scale.setScalar(1); dummy.updateMatrix(); fx.school.setMatrixAt(i, dummy.matrix) })
  fx.bubble.instanceMatrix.needsUpdate = fx.school.instanceMatrix.needsUpdate = true
  for (const m of fx.group.children) if (m.userData.phase !== undefined) m.material.opacity = 0.16 + Math.sin(fx.t * 0.6 + m.userData.phase) * 0.04
}
function updateView(dt, now) {
  updateFx(dt)
  if (!juice.chomp) hole.chomp = 0
  if (!juice.shake) game.shake = game.punch = 0
  eyes.visible = juice.eyes
  hole.shown = lerp(hole.shown, hole.r, clamp(dt * 7, 0, 1))
  hole.chomp = Math.max(0, hole.chomp - dt * 2.5)
  const R = hole.shown * (1 + Math.sin(now * 0.02) * 0.012 * hole.chomp * 3 + hole.chomp * 0.04)
  hole.group.position.set(hole.x, 0, hole.z)
  if (helper.on) {
    const grow = Math.min(1, helper.left / 0.4)
    helper.shown = lerp(helper.shown, helper.r * grow, clamp(dt * 8, 0, 1))
    helper.group.position.set(helper.x, 0, helper.z)
    helper.group.children[0].scale.setScalar(helper.shown); helper.group.children[1].scale.set(helper.shown, 1, helper.shown)
    helper.look.scale.set(helper.shown * 1.3, helper.shown * 1.3 * (Math.sin(now * 0.0017 + 1) > 0.985 ? 0.15 : 1), helper.shown * 1.3)
    helper.group.rotation.y = -Math.atan2(helper.vx, -helper.vz) * 0.5 * (Math.hypot(helper.vx, helper.vz) > 0.5 ? 1 : 0)
    helper.group.children[1].material.color.setHex(helper.left < 2 && Math.sin(now * 0.025) > 0 ? 0xffffff : 0x2ee6a6)
  }
  disc.scale.setScalar(R); rim.scale.set(R, 1, R); rim.position.y = 0.06
  eyes.scale.setScalar(R * 1.3); eyes.position.y = 0
  const blink = Math.sin(now * 0.0013) > 0.985 ? 0.15 : 1
  eyes.scale.y = R * 1.3 * blink * (1 + hole.chomp * 0.25)
  const speed = Math.hypot(hole.vx, hole.vz) || 1
  pupils.forEach((pupil) => { pupil.position.x = pupil.userData.x ??= pupil.position.x; pupil.position.x = pupil.userData.x + hole.vx / speed * 0.09 })
  holeLooks(R)
  pulseAge += dt
  if (pulseAge < 0.6) { const p = pulseAge / 0.6; pulse.visible = true; pulse.position.x = hole.x; pulse.position.z = hole.z; pulse.scale.setScalar(R * (1 + p * 2.2)); pulse.material.opacity = 0.8 * (1 - p) } else pulse.visible = false
  const wide = innerWidth / innerHeight
  if (shot.view) { shotView(dt); return }
  const height = (20 + hole.shown * 4.9) * (wide < 1 ? 1.3 : 1)
  game.punch = Math.max(0, game.punch - dt * 3)
  const back = height * 0.72 * (1 - game.punch * 0.05)
  const shake = game.shake * (save.shake ? 1 : 0)
  game.shake = Math.max(0, game.shake - dt * 2.2)
  camera.position.x = lerp(camera.position.x, hole.x, clamp(dt * 6, 0, 1)) + rnd(-shake, shake)
  camera.position.y = lerp(camera.position.y, height, clamp(dt * 3, 0, 1)) - game.punch * height * 0.05
  camera.position.z = lerp(camera.position.z, hole.z + back, clamp(dt * 6, 0, 1)) + rnd(-shake, shake)
  camera.lookAt(camera.position.x, 0, camera.position.z - back)
  aimSun(camera.position.x, camera.position.z - back, Math.max(45, height * 1.5))
}

// ---------------------------------------------------------------- in-run cards (11-11, BALANCE.md '판 중 카드')
// At 30 s and 60 s of a run the game stops for a moment and shows 3 cards; one tap takes one for this run only.
const CARD_AT = Q.has('nocards') ? [] : [25, 50] // 11-11: 25 s and 50 s of a 70 s run
const CARDS = [
  { id: 'suck', icon: '🌀', name: () => t('upMagnet'), value: () => '+40%', take: (m) => { m.pull *= 1.4 } },
  { id: 'speed', icon: '⚡', name: () => t('upSpeed'), value: () => '+20%', take: (m) => { m.speed *= 1.2 } },
  { id: 'frenzy', icon: '🔥', name: () => t('frenzy').replace(/^¡/, '').replace(/\s*!$/, ''), value: () => t('moreTime').replace('15', '5'), take: (m) => { m.frenzy += 5 } },
  { id: 'combo', icon: '✖', name: () => t('combo'), value: () => '+50%', take: (m) => { m.combo *= 1.5 } },
  { id: 'grow', icon: '⬆', name: () => t('grow'), value: () => '+15%', take: (m) => { m.grow *= 1.15 } },
]
function offerCards() {
  const pool = CARDS.filter((c) => !game.cards.includes(c.id)).sort(() => Math.random() - 0.5).slice(0, 3)
  if (BOT) { takeCard(pool[0]); return }
  game.state = 'card'; input.active = false
  $('cardTitle').textContent = t('pick')
  const host = $('cardRow'); host.innerHTML = ''
  for (const c of pool) {
    const b = document.createElement('button'); b.className = 'card'
    b.innerHTML = '<i></i><b></b><span></span>'
    b.children[0].textContent = c.icon; b.children[1].textContent = c.name(); b.children[2].textContent = c.value()
    b.addEventListener('click', () => takeCard(c))
    host.appendChild(b)
  }
  show('cards'); audio.play('levelup', 0.6)
}
function takeCard(c) {
  if (!c) return
  c.take(game.mod); game.cards.push(c.id)
  platform.track('card_pick', { card: c.id, at_s: Math.round(game.clock) })
  if (game.state === 'card') { hide_('cards'); game.state = 'run'; last = performance.now() }
  if (!BOT) { banner(`${c.name()} ${c.value()}`); audio.play('buy') }
}

// ---------------------------------------------------------------- today's goals (3 a day, new at local midnight, 11-11)
// Sizes follow this player's own records so a few minutes clear one; each pays about one upgrade level (BALANCE.md '오늘의 목표').
const dayIndex = () => { const d = new Date(); return Math.floor((d.getTime() - d.getTimezoneOffset() * 60000) / 86400000) }
const GOAL_KINDS = ['size', 'stars', 'runs', 'eat', 'frenzy']
function goalStarsTown() {
  for (const need of [2, 3]) for (let i = 0; i < THEMES.length; i++) if (!isLocked(i) && save.stars[i] < need) return { town: i, n: need }
  return null
}
function goalMake(k) {
  if (k === 'size') return { k, n: Math.max(4, Math.round((save.bestSize || 5) * 0.9)) }
  if (k === 'eat') return { k, n: Math.max(60, Math.round((save.bestEat || 100) * 0.8 / 10) * 10) }
  if (k === 'frenzy') return { k, n: Math.max(15, Math.round((save.bestFrenzy || 25) * 0.8 / 5) * 5) }
  if (k === 'runs') return { k, n: 3 }
  const s = goalStarsTown(); return s ? { k, n: s.n, town: s.town } : null
}
function rollGoals() {
  const day = dayIndex()
  if (save.goals && save.goals.day === day) return
  const list = []
  for (const k of [...GOAL_KINDS].sort(() => Math.random() - 0.5)) { const g = goalMake(k); if (g && list.length < 3) list.push({ ...g, p: 0, done: false }) }
  save.goals = { day, list }; writeSave(); goalUi()
}
const goalGold = () => { const open = UPGRADES.filter((u) => save.up[u.id] < u.max); return open.length ? Math.round(open.reduce((a, u) => a + upCost(u), 0) / open.length) : 500 }
const goalText = (g) => t({ size: 'gSize', stars: 'gStars', runs: 'gRuns', eat: 'gEat', frenzy: 'gFrenzy' }[g.k]).replace('{n}', g.n).replace('{t}', g.town !== undefined ? TOWN_NAMES[lang][g.town] : '')
// after each run: 'runs' adds up, the others keep the best of one run
function goalsAfterRun() {
  if (!save.goals || save.goals.day !== dayIndex()) rollGoals()
  const got = []
  for (const g of save.goals.list) {
    if (g.done) continue
    const v = g.k === 'runs' ? g.p + 1 : g.k === 'size' ? size() : g.k === 'eat' ? game.count : g.k === 'frenzy' ? game.frenzyCount : save.stars[g.town]
    g.p = Math.max(g.p, v)
    if (g.p >= g.n) { g.p = g.n; g.done = true; const add = goalGold(); save.gold += add; got.push(add); platform.track('goal_done', { goal: g.k, day_index: save.goals.day }) }
  }
  goalUi()
  got.forEach((add, i) => setTimeout(() => toast(`✓ ${t('goalDone')} +${add.toLocaleString('en-US')}`), 1200 + i * 1500))
}
// during a run: the first open goal that one run can finish, with live progress; it pays the moment it is reached (11-16)
const goalLive = (g) => (g.k === 'size' ? size() : g.k === 'eat' ? game.count : g.k === 'frenzy' ? game.frenzyCount : -1)
function goalHud() {
  const host = $('goalHud'), g = game.trial ? null : save.goals?.list.find((x) => !x.done && goalLive(x) >= 0)
  if (!g) { if (!game.goalFlash) host.classList.add('hide'); return }
  const v = Math.min(g.n, Math.max(g.p, goalLive(g)))
  if (host.dataset.k !== g.k + g.n) { host.dataset.k = g.k + g.n; host.children[0].textContent = goalText(g) }
  const gw = `${Math.round(v / g.n * 100)}%`, gt = `${v}/${g.n}`
  if (host.children[1].firstChild.style.width !== gw) host.children[1].firstChild.style.width = gw
  if (host.children[2].textContent !== gt) host.children[2].textContent = gt
  host.classList.remove('hide')
  if (v >= g.n) {
    g.p = g.n; g.done = true; const add = goalGold(); save.gold += add; platform.track('goal_done', { goal: g.k, day_index: save.goals.day, in_run: 1 })
    host.children[2].textContent = `✓ +${add.toLocaleString('en-US')}`; host.classList.add('done'); audio.play('levelup'); game.goalFlash = true; goalUi()
    setTimeout(() => { game.goalFlash = false; host.classList.remove('done'); host.dataset.k = '' }, 1600)
  }
}
function goalUi() {
  const list = save.goals?.list || [], done = list.filter((g) => g.done).length
  $('goalCount').textContent = `${done}/${list.length || 3}`
  $('goalBtn').classList.toggle('all', list.length > 0 && done === list.length)
  $('goalDot').classList.toggle('hide', !save.goals || save.goalsSeen === save.goals.day)
}
function renderGoals(host) {
  rollGoals(); save.goalsSeen = save.goals.day; writeSave(); goalUi()
  host.innerHTML = ''; host.className = 'goals'
  for (const g of save.goals.list) {
    const r = document.createElement('div'); r.className = 'goal' + (g.done ? ' done' : '')
    r.innerHTML = '<b></b><span class="bar"><i></i></span><small></small><em><span class="coin"></span></em>'
    r.children[0].textContent = goalText(g); r.children[1].firstChild.style.width = `${Math.round(g.p / g.n * 100)}%`
    r.children[2].textContent = g.done ? '✓' : `${g.p}/${g.n}`; r.children[3].append(goalGold().toLocaleString('en-US'))
    host.appendChild(r)
  }
}
function toast(text) { const el = $('toast'); el.textContent = text; el.classList.remove('on'); void el.offsetWidth; el.classList.add('on'); audio.play('buy', 0.7) }

// ---------------------------------------------------------------- result countdown (11-11): the big button starts itself after 3 s
// Any other press on the result screen stops it. The full-screen ad rule stays: it comes when the big button fires.
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
$('shot').addEventListener('pointerdown', (e) => { e.preventDefault(); shotSkip() })
$('result').addEventListener('pointerdown', (e) => { if (!e.target.closest('#againBtn')) stopCount() }, true)

// ---------------------------------------------------------------- menus
function show(id) { $(id).classList.remove('hide') }
function hide_(id) { $(id).classList.add('hide') }
function sync() {
  renderDex()
  const town = save.town
  $('townName').textContent = TOWN_NAMES[lang][town]
  $('townStars').innerHTML = [0, 1, 2].map((i) => `<i class="${i < save.stars[town] ? 'on' : ''}"></i>`).join('')
  const locked = isLocked(town)
  $('townLock').textContent = locked ? t('lockedBy').replace('{t}', TOWN_NAMES[lang][town - 1]) : ''
  $('townNew').classList.toggle('hide', !isNew(town))
  { const bar = $('townLm'), hp = landHp(town), d = Math.min(save.dmg[town] || 0, hp), show = !locked && !isFallen(town) && town < THEMES.length - 1
    bar.classList.toggle('hide', !show)
    if (show) { bar.firstChild.textContent = t('landmark'); bar.querySelector('i').style.width = `${d / hp * 100}%`; bar.querySelector('b').textContent = `${Math.round(d).toLocaleString('en-US')} / ${Math.round(hp).toLocaleString('en-US')}` } }
  $('nextTown').classList.toggle('dot', THEMES.some((_, i) => i > town && isNew(i) && !isLocked(i)))
  $('playBtn').disabled = locked; $('playBtn').textContent = t('play')
  $('prevTown').disabled = town === 0; $('nextTown').disabled = town === THEMES.length - 1
  $('upBtn').textContent = t('upgrades'); $('skinBtn').textContent = t('skins')
  // something to buy: a dot on the button, so the next thing to do shows on the title screen
  $('upBtn').classList.toggle('dot', UPGRADES.some((u) => save.up[u.id] < u.max && save.gold >= upCost(u)))
  $('goldTitle').textContent = save.gold.toLocaleString('en-US'); $('goldPanel').textContent = save.gold.toLocaleString('en-US')
  $('pauseTitle').textContent = t('paused'); $('resumeBtn').textContent = t('resume'); $('quitBtn').textContent = t('quit')
  $('panelClose').textContent = t('close')
  $('playBtn').classList.add('pulse')
  rimMaterial.color.set(SKINS[save.skin].color); eyeWhite.color.set(SKINS[save.skin].eye ?? 0xffffff)
  renderShelf()
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
}
function openPanel(kind) {
  audio.unlock(); audio.play('click')
  const body = $('panelBody'); body.innerHTML = ''
  hide_('title'); show('panel'); sync()
  $('panelTitle').textContent = t(kind === 'up' ? 'upgrades' : kind === 'skin' ? 'skins' : kind === 'goal' ? 'goals' : 'settings')
  $('goldPanel').parentElement.classList.toggle('hide', kind === 'set')
  if (kind === 'goal') renderGoals(body)
  if (kind === 'up') renderUpgrades(body)
  if (kind === 'skin') renderSkins(body)
  if (kind === 'set') renderSettings(body)
}
// 구멍 panel: the four hole shapes on top (locked = silhouette + which landmark opens it + a one-run ad trial), the colours below
const HOLE_ICONS = [
  '<circle cx="25" cy="25" r="15"/>',
  '<circle cx="15" cy="25" r="10"/><circle cx="34" cy="25" r="10"/>',
  '<circle cx="31" cy="23" r="13"/><circle cx="12" cy="33" r="5"/><circle cx="4" cy="40" r="2.6"/>',
  '<circle cx="31" cy="25" r="14"/><path d="M3 18h10M1 25h10M3 32h10" fill="none"/>',
]
const HOLE_NAMES = ['hBasic', 'hTwin', 'hTail', 'hSlide']
function holeTry(k) {
  if (!adsOk()) { audio.play('deny'); return }
  const go = (ok) => {
    if (!ok) return
    game.trial = k; platform.track('hole_selected', { hole: HOLES[k].id, trial: true }); startRun()
  }
  if (!platform.ready) { go(true); return } // &fakead: test without the portal
  platform.rewardedAd(go)
}
function renderSkins(host) {
  host.innerHTML = ''; host.className = 'wardrobe'
  const section = (label, cls) => { const sec = document.createElement('div'); sec.className = 'wardSec'; sec.innerHTML = `<small>${label}</small>`; const grid = document.createElement('div'); grid.className = cls; sec.appendChild(grid); host.appendChild(sec); return grid }
  const rim = `#${SKINS[save.skin].color.toString(16).padStart(6, '0')}`
  const holes = section(t('hShape'), 'skins holes')
  HOLES.forEach((h, k) => {
    const open = holeOpen(k), on = (save.hole || 0) === k, b = document.createElement('button')
    b.className = `skin hole${on ? ' on' : ''}${open ? '' : ' shut'}`; b.dataset.hole = k
    const lock = `<span class="need">${t('hNeed').replace('{t}', TOWN_NAMES[lang][h.need])}</span>${adsOk() ? `<em class="try">${t('tryAd')}</em>` : ''}`
    b.innerHTML = `<svg viewBox="0 0 50 50" stroke="${open ? rim : '#8a7fa8'}">${HOLE_ICONS[k]}</svg><b>${t(HOLE_NAMES[k])}</b>${open ? `<span>${t(on ? 'used' : 'use')}</span>` : lock}`
    b.addEventListener('click', () => {
      if (!open) { holeTry(k); return }
      audio.play('click')
      if (!on) { save.hole = k; game.holeKind = k; writeSave(); platform.track('hole_selected', { hole: h.id, trial: false }) }
      renderSkins(host)
    })
    holes.appendChild(b)
  })
  const colors = section(t('hColor'), 'skins')
  SKINS.forEach((skin, index) => {
    const earned = skin.fall !== undefined ? isFallen(skin.fall) : skin.town !== undefined && save.stars[skin.town] >= skin.stars
    const have = save.skins.includes(index) || earned, b = document.createElement('button')
    b.className = `skin${save.skin === index ? ' on' : ''}`
    const hex = `#${skin.color.toString(16).padStart(6, '0')}`, eye = skin.eye ? `#${skin.eye.toString(16).padStart(6, '0')}` : ''
    const price = skin.fall !== undefined ? `<span class="need">${t('hNeed').replace('{t}', TOWN_NAMES[lang][skin.fall])}</span>`
      : skin.town !== undefined ? `<span class="need">${TOWN_NAMES[lang][skin.town]} ★${skin.stars}</span>` : skin.att ? `<span class="need">${t('attNeed')}</span>` : `<span>${skin.cost.toLocaleString('en-US')}</span>`
    b.innerHTML = `<i style="border-color:${hex}${eye ? `;box-shadow:inset 0 0 0 6px ${eye}` : ''}"></i>${save.skin === index ? `<span>${t('used')}</span>` : have ? `<span>${t('use')}</span>` : price}`
    b.addEventListener('click', () => {
      if (!have) {
        if (skin.town !== undefined || skin.fall !== undefined || skin.att || save.gold < skin.cost) { audio.play('deny'); return }
        save.gold -= skin.cost; save.skins.push(index); audio.play('buy')
      } else audio.play('click')
      save.skin = index; writeSave(); sync(); renderSkins(host)
    })
    colors.appendChild(b)
  })
}
// music · sound bars: in settings and on the pause screen (change the sound mid-run)
function volumeSliders(host) {
  for (const key of ['music', 'sfx']) {
    const row = document.createElement('label'); row.className = 'opt'
    row.innerHTML = `<span>${t(key)}</span><input type="range" min="0" max="1" step="0.05" value="${save[key]}">`
    row.querySelector('input').addEventListener('input', (e) => { save[key] = Number(e.target.value); applyVolume(); writeSave() })
    host.appendChild(row)
  }
}
function renderPause() { const host = $('pauseOpts'); host.innerHTML = ''; host.className = 'setGrid' // phone landscape: two columns like settings, so End run stays on screen
  volumeSliders(host); langGrid(host, () => { $('pauseTitle').textContent = t('paused'); renderPause() }) }
// all 10 languages at once: tap the one you want (settings, and the pause screen mid-run: 11-08 user "왜 게임내 언어 변경없어")
function langGrid(host, redraw) {
  const label = document.createElement('div'); label.className = 'opt'; label.innerHTML = `<span>${t('language')}</span>`
  const grid = document.createElement('div'); grid.className = 'langs'
  for (const key of LANG_KEYS) {
    const b = document.createElement('button'); b.className = 'lang' + (key === lang ? ' on' : ''); b.textContent = LANGUAGES[key]; b.lang = key
    b.addEventListener('click', () => { audio.play('click'); lang = key; save.lang = lang; writeSave(); sync(); redraw() })
    grid.appendChild(b)
  }
  host.append(label, grid)
}
function renderSettings(host) {
  host.innerHTML = ''; host.className = 'setGrid'
  volumeSliders(host)
  const toggle = (label, text, press) => {
    const row = document.createElement('div'); row.className = 'opt'
    row.innerHTML = `<span>${t(label)}</span><button class="sub">${text()}</button>`
    row.querySelector('button').addEventListener('click', (e) => { audio.play('click'); press(); e.target.textContent = text(); writeSave() })
    host.appendChild(row)
  }
  toggle('shake', () => t(save.shake ? 'on' : 'off'), () => { save.shake = save.shake ? 0 : 1 })
  langGrid(host, () => { $('panelTitle').textContent = t('settings'); renderSettings(host) })
}
function openNews() {
  $('newsTitle').textContent = t('newsTitle'); $('newsClose').textContent = t('close')
  $('newsGrid').innerHTML = NEW_TOWNS.map((i) => `<figure><img src="img/town${i}.webp" alt=""><figcaption>${TOWN_NAMES[lang][i]}</figcaption></figure>`).join('')
  show('news')
}
// ---------------------------------------------------------------- daily reward + trophy shelf (11-23, BALANCE.md '출석')
// Opens on the first screen the moment the game is up, for a new player too (day 1), and again when the day turns while the
// game is open. Days 1-6 gold (about one run of the furthest open town, 0.6x to 2x), day 7 the lime hole look (gold x3 once owned).
// A missed day keeps the count (11-23 총괄, same as Mythic comeback.gd); after day 7 a new week starts at day 1.
const ATT_MULT = [0.6, 0.8, 1, 1.2, 1.5, 2], ATT_SKIN = SKINS.findIndex((x) => x.att)
const kfmt = (n) => n >= 10000 ? `${Math.round(n / 1000)}K` : n.toLocaleString('en-US')
function attGold(d) {
  let top = 0; for (let i = 0; i < THEMES.length; i++) if (!isLocked(i)) top = i
  const run = THEMES[top].goal / GOLD_DIV + 45 // a one-star run of that town
  return Math.max(10, Math.round(run * (d >= 7 ? 3 : ATT_MULT[d - 1]) / 10) * 10)
}
const attDue = () => !save.att || save.att.day !== dayIndex()
let attAfter = null
function attendOpen(after) {
  if (BOT || RENDER || Q.has('shot') || (Q.has('debug') && !Q.has('att')) || !attDue() || !$('attend').classList.contains('hide')) return false
  const today = dayIndex(), a = save.att, day = a ? (a.n % 7) + 1 : 1, look = !save.skins.includes(ATT_SKIN)
  $('attTitle').textContent = t('attTitle'); $('attSub').textContent = `${day} / 7`
  $('attDays').innerHTML = [1, 2, 3, 4, 5, 6, 7].map((d) => {
    const hex = `#${SKINS[ATT_SKIN].color.toString(16).padStart(6, '0')}`
    const gift = d === 7 && look ? `<em class="swatch" style="border-color:${hex}"></em><b>&nbsp;</b>` : `<span class="coin"></span><b>${kfmt(attGold(d))}</b>`
    return `<i class="${d < day ? 'done' : d === day ? 'today' : ''}${d === 7 ? ' seven' : ''}"><small>${t('attDay').replace('{n}', d)}</small>${gift}</i>`
  }).join('')
  $('attClaim').textContent = t('attClaim'); $('attClaim').disabled = false
  attAfter = after || null
  $('attClaim').onclick = () => {
    $('attClaim').disabled = true; audio.unlock(); audio.play('buy')
    const skin = day === 7 && look, gold = skin ? 0 : attGold(day), from = $('attDays').querySelector('.today').getBoundingClientRect()
    save.att = { day: today, n: day }; save.gold += gold
    if (skin) { save.skins.push(ATT_SKIN); save.skin = ATT_SKIN; rimMaterial.color.set(SKINS[ATT_SKIN].color); eyeWhite.color.set(SKINS[ATT_SKIN].eye) }
    platform.track('daily_reward', { day_index: day, gold, skin })
    writeSave(); hide_('attend')
    const next = () => { const f = attAfter; attAfter = null; f?.() }
    if (skin) { sync(); toast(t('newSkin')); audio.play('levelup', 0.8); setTimeout(next, 600); return }
    coinFly(from, $('goldTitle'), gold, next)
  }
  show('attend'); audio.play('levelup', 0.5)
  return true
}
// ten coins fly from the card to the gold count, which counts up as they land
function coinFly(from, to, gold, done) {
  const end = to.getBoundingClientRect(), start = save.gold - gold
  to.textContent = start.toLocaleString('en-US')
  for (let k = 0; k < 10; k++) {
    const c = document.createElement('span'); c.className = 'coin flyCoin'; document.body.appendChild(c)
    const x0 = from.left + from.width / 2 - 13 + (Math.random() - 0.5) * 30, y0 = from.top + from.height / 2 - 13 + (Math.random() - 0.5) * 20
    const x1 = end.left + 2, y1 = end.top + end.height / 2 - 13, mx = (x0 + x1) / 2 + (Math.random() - 0.5) * 120, my = Math.min(y0, y1) - 60 - Math.random() * 60
    const anim = c.animate([{ transform: `translate(${x0}px,${y0}px) scale(.6)` }, { transform: `translate(${mx}px,${my}px) scale(1.25)`, offset: 0.45 }, { transform: `translate(${x1}px,${y1}px) scale(.8)` }], { duration: 620, delay: k * 45, easing: 'ease-in', fill: 'both' })
    anim.onfinish = () => {
      c.remove(); to.textContent = Math.round(start + gold * (k + 1) / 10).toLocaleString('en-US')
      if (k === 9) { const g = to.parentElement; g.classList.remove('bump'); void g.offsetWidth; g.classList.add('bump'); audio.play('gulp1', 0.6, 1.6); sync(); done?.() } else if (k % 3 === 0) audio.play('click', 0.35, 1.5)
    }
  }
}
// ten slots, one per town: the landmark figure once it has fallen, its shadow before; a fresh one jumps in once
let freshTrophy = -1
function renderShelf() {
  const host = $('shelf')
  if (!host.children.length) {
    host.innerHTML = THEMES.map((_, i) => `<i data-t="${i}"><img src="img/trophy${i}.webp" alt="" draggable="false"></i>`).join('')
    host.addEventListener('click', (e) => { const i = +e.target.closest('i')?.dataset.t; if (!Number.isInteger(i)) return; audio.play('click'); toast(isFallen(i) ? TOWN_NAMES[lang][i] : t('lockedBy').replace('{t}', TOWN_NAMES[lang][i]).replace('\n', ' ')) })
  }
  ;[...host.children].forEach((el, i) => { el.classList.toggle('won', isFallen(i)); el.classList.toggle('fresh', i === freshTrophy) })
  if (freshTrophy >= 0 && game.state === 'title') freshTrophy = -1
}
// the first fall of a landmark: its figure big before the result screen (tap or 2.4 s)
function trophyPop(town, done) {
  $('tpLabel').textContent = t('trophyNew'); $('tpImg').src = `img/trophy${town}.webp`; $('tpName').textContent = TOWN_NAMES[lang][town]
  const box = $('trophyPop'); box.classList.remove('hide'); audio.play('levelup', 0.9); freshTrophy = town
  let over = false, timer = 0
  const close = () => { if (over) return; over = true; clearTimeout(timer); box.classList.add('hide'); box.removeEventListener('pointerdown', close); done() }
  timer = setTimeout(close, 2400); box.addEventListener('pointerdown', close)
}
function goHome() {
  game.trial = null; game.holeKind = save.hole || 0
  hide_('result'); hide_('pause'); hide_('hud'); hide_('panel'); show('title'); sync(); renderLobby(); rollGoals(); goalUi()
  game.state = 'title'; audio.music('menu'); attendOpen()
  buildWorld(save.town, isLocked(save.town) && !Q.has('shot')); hole.x = PITCH * 0.5; hole.z = PITCH * 1.5; hole.r = 2.4
}

$('playBtn').addEventListener('click', startRun)
$('againBtn').addEventListener('click', () => {
  stopCount()
  if (game.nextTown) { game.nextTown = false; save.town++; writeSave() }
  platform.interstitial(startRun)
})
$('moreBtn').addEventListener('click', () => {
  $('moreBtn').disabled = true; audio.play('click')
  if (!platform.ready) { moreDone(true); return } // &fakead: test without the portal
  platform.rewardedAd((ok) => moreDone(ok))
})
$('helpBtn').addEventListener('click', () => {
  if (game.state !== 'run' || game.helped || $('helpBtn').disabled) return
  $('helpBtn').disabled = true; audio.play('click'); game.helped = true; game.helpOffer = 0; $('helpRing').classList.add('hide')
  if (!adHelp()) { if ($('helpRing').classList.contains('full')) helperStart(); return } // no ads here: the full gauge calls it
  if (!platform.ready) { helperStart(); return } // &fakead: test without the portal
  // 11-15: the portal sends 'pause' when the ad opens; in 'run' that turned the run into the pause screen and the helper never came.
  // 'ad' freezes the run like a pause but nothing can pause it, and it goes back to 'run' when the ad is over.
  game.state = 'ad'; platform.message('gameplay_stopped')
  platform.rewardedAd((ok) => { if (game.state !== 'ad') return; game.state = 'run'; last = performance.now(); platform.message('gameplay_started'); if (ok) helperStart() })
})
$('rankBtn').addEventListener('click', () => ranks.open())
$('lobbyMore').addEventListener('click', () => { audio.play('click'); lobbyOpen(!lobby.open) })
// a tap outside the open board only folds it (the tap does not also press what sits under it)
let lobbyFold = false
addEventListener('pointerdown', (e) => { lobbyFold = lobby.open && !$('lobbyRank').contains(e.target); if (lobbyFold) lobbyOpen(false) }, true)
addEventListener('click', (e) => { if (lobbyFold) { lobbyFold = false; e.stopPropagation(); e.preventDefault() } }, true)
$('titleRank').addEventListener('click', () => ranks.open())
$('rankClose').addEventListener('click', () => { audio.play('click'); hide_('rank') })
$('moreNo').addEventListener('click', () => { audio.play('click'); moreDone(false) })
// from the result: a town that just opened and was never played is the one the title shows
$('homeBtn').addEventListener('click', () => { stopCount(); audio.play('click'); if (game.nextTown) { game.nextTown = false; save.town++; writeSave() } goHome() })
$('newsClose').addEventListener('click', () => { audio.unlock(); audio.play('click'); hide_('news'); save.ver = UPDATE; writeSave() })
$('upBtn').addEventListener('click', () => openPanel('up'))
$('skinBtn').addEventListener('click', () => openPanel('skin'))
$('setBtn').addEventListener('click', () => openPanel('set'))
$('goalBtn').addEventListener('click', () => openPanel('goal'))
addEventListener('keydown', (e) => { if (game.state === 'card' && /^Digit[123]$/.test(e.code)) $('cardRow').children[+e.code.slice(5) - 1]?.click() })
$('panelClose').addEventListener('click', () => { audio.play('click'); hide_('panel'); show('title'); sync(); renderLobby() })
$('pauseBtn').addEventListener('click', () => { audio.play('click'); pauseRun() })
$('resumeBtn').addEventListener('click', resumeRun)
$('quitBtn').addEventListener('click', () => { hide_('pause'); game.quit = true; game.time = 0; game.state = 'run'; endRun(false) })
$('prevTown').addEventListener('click', () => { audio.unlock(); audio.play('click'); save.town = Math.max(0, save.town - 1); writeSave(); sync(); goHome() })
$('nextTown').addEventListener('click', () => { audio.unlock(); audio.play('click'); save.town = Math.min(THEMES.length - 1, save.town + 1); writeSave(); sync(); goHome() })
$('doubleBtn').addEventListener('click', () => {
  $('doubleBtn').disabled = true
  platform.rewardedAd((ok) => {
    if (ok && !game.doubled) { game.doubled = true; save.gold += game.gold; $('resGold').textContent = `+${game.gold * 2}`; audio.play('buy'); writeSave(); renderUpgrades($('resUp')) } else if (!ok) $('doubleBtn').classList.add('hide') // no ad came: never leave an ad button that does nothing
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

// slow devices: real players' bottom 10% ran at 16fps, so when play stays under 40fps for 3 s the picture gets cheaper
// (pixel ratio first, then shadows); what happens in the game never changes
const quality = {
  level: 0, sum: 0, n: 0, wait: 0,
  frame(raw, playing) {
    if (!playing || this.level >= 3 || raw > 1000) return
    this.sum += raw; this.n++
    if (this.sum < 2000) return
    const fps = this.n / (this.sum / 1000); this.sum = 0; this.n = 0
    if (this.wait > 0) { this.wait--; return }
    if (fps >= 50) return // 11-21: players' slowest 10% sat near 30 fps, which the old 40 line never caught
    this.level++; this.wait = 1
    if (this.level === 2 && sunLight) { renderer.shadowMap.enabled = false; sunLight.castShadow = false }
    resize()
  },
}
// 11-22 사용자 "그래픽 가속 없는 사람들은 어떻게 해": a browser drawing WebGL on the CPU (SwiftShader / WARP / Microsoft Basic Render)
// starts at the lowest level at once (no shadows, pixel ratio 1) instead of stuttering for seconds until the fps check catches it.
const softGpu = (() => {
  try {
    const gl = renderer.getContext(), ext = gl.getExtension('WEBGL_debug_renderer_info')
    return /swiftshader|warp|basic render|llvmpipe|software/i.test(ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : '')
  } catch { return false }
})()
if (softGpu || Q.has('softgpu')) { quality.level = 3; renderer.shadowMap.enabled = false; if (sunLight) sunLight.castShadow = false; resize() }
function resize() {
  const w = innerWidth, h = innerHeight
  const cap = [w < 800 ? 2 : 1.5, 1.25, 1, 1][quality.level]
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, cap))
  renderer.setSize(w, h, false); camera.aspect = w / h; camera.fov = w < h ? 46 : 42; camera.updateProjectionMatrix()
}
addEventListener('resize', resize)
addEventListener('resize', () => { if (lobby.open) lobbyOpen(false) })

// ---------------------------------------------------------------- loop
let last = performance.now()
function frame(now) {
  if (RENDER) return
  requestAnimationFrame(frame)
  const raw = now - last, dt = Math.min(0.05, raw / 1000); last = now
  const playing = game.state === 'run' && !platform.adOpen && !platform.paused && game.freeze <= 0
  perf.frame(now, raw, playing && !TURBO); quality.frame(raw, playing && !TURBO); if (playing) game.played = (game.played || 0) + dt
  platform.banner(game.state === 'title' || (game.state === 'over' && !$('result').classList.contains('hide')))
  if (game.state === 'more' && !platform.adOpen) { game.moreLeft -= dt; $('moreRing').style.setProperty('--p', clamp(game.moreLeft / 5, 0, 1)); if (game.moreLeft <= 0) moreDone(false) }
  if (game.freeze > 0) game.freeze -= dt
  else if (game.state === 'run' && !platform.adOpen && !platform.paused) { if (TURBO) { for (let i = 0; i < TURBO && game.state === 'run'; i++) { tick(1 / 60); updateFallers(1 / 60) } } else tick(dt) }
  if (shot.on && !platform.adOpen) shotTick(dt)
  updateFallers(dt); updateSparks(dt); updateDust(dt)
  updateView(dt, now)
  renderer.render(scene, camera)
}

// first visit: Baekho says why in 2 lines (11-17 user "짧게 대화형 이 게임을 하는 이유"): starts on the loading screen,
// the rest carries over the first run, any touch ends it
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
  if (Q.has('town')) save.town = clamp(+Q.get('town'), 0, THEMES.length - 1) // test pictures of one town
  const asked = (window.bridge?.platform?.language || navigator.language || 'en').toLowerCase().slice(0, 2)
  lang = save.lang || (LANGUAGES[asked] ? asked : 'en')
  if (LANGUAGES[Q.get('lang')]) lang = Q.get('lang')
  $('loadbar').style.width = '75%'
  // the first title screen shows a new town (the brightest one); the town picker still starts on the player's town
  const first = Q.has('town') || Q.has('shot') || BOT ? save.town : SHOWCASE
  resize(); buildWorld(first, first === save.town && isLocked(first) && !Q.has('shot'))
  hole.x = PITCH * 0.5; hole.z = PITCH * 1.5; hole.r = hole.shown = 2.4
  camera.position.set(hole.x, 30, hole.z + 22)
  hole.group.visible = true; game.holeKind = Q.has('hole') ? clamp(+Q.get('hole') || 0, 0, 3) : save.hole || 0; game.state = 'title'; audio.music('menu')
  sync(); show('title'); renderLobby(); rollGoals(); goalUi()
  const news = save.runs > 0 && (save.ver || 0) < UPDATE && !BOT && !Q.has('shot')
  if (save.runs === 0) save.ver = UPDATE
  $('loadbar').style.width = '100%'
  requestAnimationFrame(frame)
  requestAnimationFrame(() => { hide_('loading'); platform.message('game_ready'); setTimeout(() => { dexLater = false; renderDex() }, 400) })
  if (BOT && !RENDER) setTimeout(startRun, 200)
  // a first-time player inside a portal page skips the title: the first run is already on screen and its clock waits for
  // the first touch (11-16: 26% of sessions never pressed PLAY). &autostart forces it for tests; top-level pages keep the title.
  const auto = save.runs === 0 && !BOT && !RENDER && !Q.has('shot') && !Q.has('town') && (Q.has('autostart') || window.top !== window)
  // the daily reward card comes first (11-23 총괄: a new player gets day 1 at once); the update card, the first talk and the
  // portal auto-start wait until it is claimed, so none of them skips it
  const afterAtt = () => {
    if (news) openNews()
    if (save.runs === 0 && !BOT && !RENDER && !Q.has('shot') && !Q.has('notalk')) talk([t('talk1'), t('talk2')]) // the third line, how to move, is the run's own hint below
    if (auto && game.state === 'title') { startRun(); game.waitTouch = true; platform.track('auto_start', {}) }
  }
  if (!attendOpen(afterAtt)) afterAtt()
  // &shot=x,z,r: park the camera there with no menus, for before/after pictures
  if (Q.has('shot')) { const [x, z, r] = Q.get('shot').split(',').map(Number); hole.x = x; hole.z = z; hole.r = hole.shown = r; camera.position.set(x, 20 + r * 4.9, z + (20 + r * 4.9) * 0.72); hide_('title'); $('coins')?.classList.add('hide') }
}
if (RENDER) window.__render = {
  soundLog,
  // view(camera, hole): a recorder's own camera path, set after the game's camera each step; scene and THREE for props it adds.
  view: null, scene, THREE,
  // Advances the run by whole frames at 60 per second; draws only when asked, so a recording never drops a frame.
  step(frames, draw = true) {
    for (let i = 0; i < frames && game.state === 'run'; i++) { renderClock += 1 / 60; tick(1 / 60); updateFallers(1 / 60); updateSparks(1 / 60); updateView(1 / 60, renderClock * 1000) }
    if (this.view) this.view(camera, hole)
    if (draw) renderer.render(scene, camera)
    return { time: game.time, r: hole.r, state: game.state, castle: world.items.find((x) => x.kind === 'castle')?.alive, clock: renderClock }
  },
  // twin(spread, flip): recording only, holds the twin holes apart (spread > 1) and picks which one pulls last
  twin(spread, flip = false) { twinSpread = spread; twinFlip = flip },
  // clear(x0, z0, x1, z1): recording only, takes away town things (not the castle) in that box, so nothing tall stands in front of the camera's subject
  clear(x0, z0, x1, z1, kinds = null) { let n = 0; for (const it of world.items) if (it.alive && it.kind !== 'castle' && (!kinds || kinds.includes(it.kind)) && it.x > x0 && it.x < x1 && it.z > z0 && it.z < z1) { it.alive = false; hide(it); n++ } for (const name in world.meshes) world.meshes[name].instanceMatrix.needsUpdate = true; world.shadow.instanceMatrix.needsUpdate = true; return n },
  // burp(i): recording only, candy bits spray out of twin i (the game's own sparks)
  // recording only: the town's castle stands again at x, z (after it was eaten), as a real thing the holes can pull and eat
  revive(x, z) {
    const it = world.items.find((i) => i.kind === 'castle'), old = world.hash.get(hashKey(it.x, it.z))
    if (old && old.includes(it)) old.splice(old.indexOf(it), 1)
    it.x = x; it.z = z; it.alive = true; it.wobble = 0
    const key = hashKey(x, z); if (!world.hash.has(key)) world.hash.set(key, []); world.hash.get(key).push(it)
    place(it); world.meshes.castle.instanceMatrix.needsUpdate = true; world.shadow.instanceMatrix.needsUpdate = true
  },
  burp(i, big = 1.9) { const h = twins[i] || hole, a = sparkAt; burst(h.x, h.z, 100, clamp(h.r / 5, 1, 3.2), null, 1); for (let k = 0; k < 100; k++) { const s = sparks[(a + k) % SPARKS]; s.s *= big; s.life *= 1.5 } game.shake = Math.max(game.shake, 0.5) },
  // juice({eyes, tilt, chomp, sparks, shake, sound}): recording only, each false turns that bit of the hole's feel off (no eyes and a grey rim, things
  // do not tip, the mouth does not chew, no candy bits, no screen shake, no sound); left out = unchanged
  juice(o = {}) { Object.assign(juice, o); rimMaterial.color.set(juice.eyes ? SKINS[save.skin].color : 0x8a8a92); return { ...juice } },
  caption(text) { let c = document.getElementById('cap'); if (!c) { c = document.createElement('div'); c.id = 'cap'; c.style.cssText = 'position:fixed;left:0;right:0;top:19%;z-index:9;text-align:center;font-size:42px;line-height:1.15;color:#fff;-webkit-text-stroke:8px #24183f;paint-order:stroke fill;padding:0 16px'; document.body.appendChild(c) } c.textContent = text },
}
if (BOT || RENDER || Q.has('debug')) window.__gt = { quality, pauseRun, attendOpen, attGold, trophyPop, renderer, shot, land, landHp, isFallen, twins, trail, HOLES, renderLobby, ranks, offerCards, rollGoals, goalsAfterRun, openPanel, countdown, size, game, hole, world, save, THEMES, startRun, sync, audio, platform, helper, offerHelp, helperStart, camera, objPick, objDone, surHit, sizeFx, dropSpawn, extra: () => ({ obj: game.obj && { ...game.obj }, sur: game.sur.filter((it) => it.sur).length, marks: game.sur.filter((it) => it.sur && it.mark.visible).length, fx: game.fx.length, drops: drops.filter((d) => d.state).length }), icons, NEWS, TOWN_NAMES, get lang() { return lang }, get size() { return size() } }
window.addEventListener('error', (e) => console.error('page error', e.message))
boot()
