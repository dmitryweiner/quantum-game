import { locale, type Locale } from '../i18n';

/** Russian noun form for a count: 1 круг, 2 круга, 5 кругов. */
export function ruPlural(n: number, one: string, few: string, many: string): string {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
  return many;
}

const EN = {
  title: 'Quantum Game',
  tagline: 'You are the observer. Looking changes things.',
  chapter: (n: number) => `Chapter ${n}`,
  chapterTitles: {
    1: 'The Observer Effect',
    2: 'Spooky Action',
    3: 'Uncertainty',
    4: 'Other Observers',
    5: 'Interference',
  } as Record<number, string>,
  classical: {
    title: 'Classical mode',
    intro:
      'First, try this level in the everyday world: no superposition, no tunnelling — objects are where they are and stay there. Can you win?',
    banner: '🧱 Classical mode: everyday physics.',
    switch: '⚛️ Switch quantum physics on',
  },
  play: '▶ Play',
  continueTo: (title: string) => `▶ Continue: ${title}`,
  soundOn: '🔊 Sound on',
  soundOff: '🔇 Sound off',
  aboutTitle: 'About',
  about: [
    'A puzzle game about the quantum world: superposition, measurement, entanglement, uncertainty, tunnelling and interference — with no formulas, but with honest physics underneath.',
    'Open source under GPL-3.0: github.com/dmitryweiner/quantum-game. Sounds are synthesised in the browser; emoji come from your device’s font.',
  ],
  timeLeft: (s: number) => `⏱ ${s} s`,
  timeLimit: (s: number) => `⏱ Time limit: ${s} seconds — it starts when you press Start.`,
  freePlay: 'Free play',
  arcade: {
    best: (n: number) => `🏆 ${n}`,
    over: 'Game over',
    score: (n: number) => `Score: ${n}`,
    bestLine: (n: number) => `Best: ${n}`,
    record: 'New record! 🏆',
    again: '↻ Play again',
    quantumTitle: 'What is quantum here',
    paradoxCount: (n: number) => `🤯 ${n}`,
    paradox: {
      far: (n: number) => `🤯 Found ${n} cells from where it was!`,
      rare: (pct: number) => `🎲 Only a ${pct} % chance — and it happened`,
      negative: (pct: number) => `💨 It had ${pct} % to be here — wasn't. Now it is elsewhere`,
      zeno: '🧊 Frozen by your stare (Zeno)',
      tunnel: '🌀 Tunnelled through the wall!',
      spooky: (n: number) => `🔗 Spooky: its twin settled ${n} cells away`,
      interference: '🌊 Landed behind the solid wall — it went through both slits',
    },
    paradoxNames: {
      far: 'Found far from where it was',
      rare: 'The unlikely happened',
      negative: 'Moved by not being seen',
      zeno: 'Frozen by a look',
      tunnel: 'Through a wall',
      spooky: 'Spooky action at a distance',
      interference: 'Behind the wall, never under the slits',
    },
    paradoxTitle: '🤯 Impossible things you saw',
    noParadox: 'Nothing impossible this time — try closing your eyes 🙈',
    tableTitle: 'Best games',
    playQuantum: '▶ ⚛ Quantum',
    playClassical: '⚪ Classical',
    quantumOn: '⚛ QUANTUM ON — watch the world break!',
    points: (n: number) => `+${n}`,
    quantris: {
      title: 'Quantris',
      menu: '🧩 Quantris',
      goal: 'Clear lines — some pieces fall in two places at once',
      hud: (score: number, lines: number, looks: number, best: number, paradoxes: number) =>
        `⭐ ${score} · ☰ ${lines} · 👁 ${looks} · 🤯 ${paradoxes} · 🏆 ${best}`,
      rules: [
        'A glowing piece is in two places at once — the percentages are the chances of each.',
        'Touching the stack is a measurement: the piece turns out to be in one of its places, at random but by those chances. If it is not the place that touched, it falls on.',
        'Press 👁 to look and settle it early. Looks are few; each cleared line gives one back.',
        'Push both places against a wall until they meet: two identical places are one — the piece becomes certain.',
        'Some pieces are in two orientations at once instead of two places.',
        '🔗 The next piece may be entangled with the current one (both glow pink, joined by a thread): the moment the current one settles, the next one is settled too — in the opposite place.',
        'Hold 👁 and the watched piece stands still (Zeno) — one look a second.',
        'A piece over a thin overhang may tunnel through it into the hole beneath — the faint outline shows where, and the chance.',
      ],
      streak: (n: number) => `🎲 ${n} likely outcomes in a row — that is the Born rule, not luck`,
      controlsTouch:
        'On the well: drag sideways to move, drag down to speed up, flick down to drop. Tap to turn (two fingers or left of the piece — the other way); tap a glowing piece to look. Buttons: ◀ ▶ move, ▲ or the big ⟳ turn, ▼ down, 👁 look (hold to freeze).',
      controlsDesktop:
        '← → move · ↑ / X turn · Z turn back · ↓ down · Space drop · L look (hold to freeze). A landed piece can still slide for half a second.',
      aria: {
        left: 'Move left',
        right: 'Move right',
        rotate: 'Rotate',
        down: 'Down',
        drop: 'Drop',
        look: 'Look',
      },
      next: 'Next',
    },
    invaders: {
      title: 'Quantum Invaders',
      menu: '👾 Quantum Invaders',
      goal: 'Stop the invaders 👾 — they are clouds until you look',
      hud: (
        lives: number,
        score: number,
        wave: number,
        torpedoes: number,
        paradoxes: number,
        best: number,
      ) => `❤️ ${lives} · ⭐ ${score} · 🌊 ${wave} · ⚛ ${torpedoes} · 🤯 ${paradoxes} · 🏆 ${best}`,
      rules: [
        'The formation marches like in the classic game — the grey outlines are where the invaders would be classically. Each invader is really a cloud around its place.',
        'Your searchlight 👁 is your look: what it lights collapses, and an invader you keep lighting stays still (Zeno). A laser asks every cell it crosses “is it here?” — and a miss pushes the cloud away.',
        'An invader shot while still spread out is worth up to 3 points. Shoot blind 🙈 — or look first and be sure.',
        'Bombs 💣 are waves. The shield stops them, except at two slits — and what gets through falls in stripes: mostly behind the middle of the wall, almost never right under a slit.',
        'Light a slit with your searchlight and you learn which way the bomb went — the stripes wash out, and the safe columns are gone.',
        '👽 Twins are entangled: see one, and the other is settled at once, mirrored, across the formation.',
        'The UFO 🛸 flies in two places at once; a shot decides, by the Born rule. A quantum torpedo ⚛ is a wave that finds invaders you cannot see.',
      ],
      controlsTouch: 'Drag anywhere to move. Hold 👁 to light, 🔫 to fire, ⚛ for a torpedo.',
      controlsDesktop:
        '← → / A D move · Space fire · hold Shift or L to light · E or right click: torpedo.',
      aria: { look: 'Searchlight', fire: 'Fire', torpedo: 'Launch a quantum torpedo' },
      wave: (n: number) => `Wave ${n}!`,
    },
    pong: {
      title: 'Quantum Pong',
      menu: '🏓 Quantum Pong',
      goal: 'First to 7 — the ball is a wave until somebody looks',
      hud: (
        you: number,
        ai: number,
        energy: number,
        score: number,
        paradoxes: number,
        best: number,
      ) => `🏓 ${you}:${ai} · ⚡ ${energy} · ⭐ ${score} · 🤯 ${paradoxes} · 🏆 ${best}`,
      rules: [
        'The ball is a wave packet: unwatched, it spreads as it flies — by the time it reaches you it is a cloud wider than your paddle. The grey ring is where a classical ball would be.',
        'Your paddle is a detector: where the cloud touches it, the ball may turn out to be there — and bounce back. The goal line behind you is a detector too.',
        'Hold a finger on your half to look 👁: the ball is caught somewhere in the light and pinned down. Look late, just before your paddle — the sharper a ball is pinned, the faster it spreads again (uncertainty).',
        'Looking costs energy ⚡. A long look turns the ball into an ordinary, classical one.',
        'The wall in front of the computer’s goal stops the ball — almost: now and then it tunnels through.',
        'The computer steers by the classical expectation — the middle of the cloud — and misses when the ball turns up off to the side.',
      ],
      controlsTouch:
        'Drag along the bottom to move the paddle. Hold a finger on your half to look.',
      controlsDesktop:
        '← → or the mouse move the paddle · hold Space to look just ahead of your paddle · or hold the left mouse button to look where the mouse is.',
      win: 'You win! 🏆',
      lose: 'The computer wins this time.',
    },
    snake: {
      title: 'Quantum Snake',
      menu: '🐍 Quantum Snake',
      goal: 'Eat the apples 🍎 — they only sit still while you look at them',
      hud: (score: number, best: number, paradoxes: number, eyes: boolean) =>
        `${eyes ? '👁' : '🙈'} · 🍎 ${score} · 🤯 ${paradoxes} · 🏆 ${best}`,
      rules: [
        'Unwatched, an apple spreads into a cloud of ghosts — every place it could be. The grey outline is where it would be classically.',
        'Your snake looks ahead: what it sees collapses, and an apple you keep looking at stays put (Zeno).',
        'Close the eyes 🙈 and the apple spreads freely. One caught while still spread out is worth up to 3 points; a frozen one, 1.',
        'Crawling into a ghost is a measurement: the apple is there with the chance its ghost shows — or it is not, and the cloud moves elsewhere.',
        'The violet force field stops you, but an apple can tunnel through it.',
        '🍎🍏 An entangled pair: each ghost shows both colours — which apple is red is undecided too. Find one, and the other is settled at once in the mirror cell, in the other colour.',
        'Bump into a wall and the snake stops short; keep going that way and it crashes.',
        '🍒 Light cherries spread fast and are worth more; 🍐 heavy pears hardly spread.',
        'On the hot cells 🔥 the world keeps noticing a fruit: there it stays an ordinary, classical one (decoherence).',
        '✖ marks a cell the fruit cannot be in right now, although it may well be on both sides of it: interference.',
      ],
      controlsTouch: 'Swipe to turn. Hold the 🙈 button to close the eyes.',
      eyesAria: 'Close the eyes',
      field: '🟪 A force field: you cannot pass it — but a fruit can tunnel through.',
      controlsDesktop: 'Arrows or WASD to turn. Hold Space to close the eyes 🙈.',
    },
  },
  sandbox: 'Sandbox',
  sandboxNote: 'Free play, no goal',
  start: 'Start',
  retry: 'Try again',
  next: 'Next level',
  menu: 'Levels',
  close: 'Close',
  learnMore: 'ℹ️ Learn more',
  learnMoreTitle: 'Quantum effects in this level',
  whyClassicalFails: 'Why you need quantum here',
  whatHappened: 'What just happened?',
  won: {
    'catch-at-target': 'Caught it! 🎉',
    unlock: 'Unlocked! 🔓',
    'zone-after-dark': 'Still in the ring! 🎉',
    escape: 'Out, core intact! 🏁',
    'light-lamp': 'The lamp is lit! 💡',
    chsh: 'Telepathy confirmed! 🎉',
  },
  lost: 'Time’s up ⏳',
  lostText: 'The cat is still out there in a cloud of maybes. Try a different moment to look.',
  allDone: 'That’s all for now — more chapters are coming.',
  controlsTouch: 'Left thumb: walk · Right thumb: look · Lift right thumb: close eyes',
  controlsDesktop:
    'WASD / arrows: walk · Mouse or Shift + ← →: look · Space or right mouse button: close eyes',
  language: 'Language',
  glasses: (b: string) => `👓 ${b}`,
  glassesHint: 'Glasses: Z shows 🔴/🔵, X shows 🟢/🟠 (button or Q)',
  lostEscaped: 'The atom left the ring 💨',
  lostEscapedText:
    'The detector found it outside. Your look pinned it down too precisely — and gave it a kick. Try a gentler, blurrier look.',
  lostCore: 'The core decayed 💥',
  lostCoreText:
    'Left unwatched, the core slid towards decay — and a look found it gone. Keep it in sight the whole time; brief glances away are fine.',
  lightsOut: '🌑 Lights out',
  focusLabel: 'Focus of your look',
  focusBlurry: '☁️ blurry',
  focusSharp: 'sharp 🎯',
  focusHint:
    'Focus: narrow = sharp look (strong kick), wide = blurry look (gentle). Slider or mouse wheel',
  lostWrongColour: 'The lock stayed shut 🔒',
  lostWrongColourText:
    'The far ball turned out a different colour. Remember: it has no colour until something looks — make sure your ball tells you the right one.',
  inspect: {
    button: 'Inspect: tap an object to learn what it is doing',
    stateTitle: 'Right now',
    whyTitle: 'Why',
    catName: 'Quantum cat 🐱',
    catDefinite: 'Definitely in this cell — it was just seen, so it had to pick one place.',
    catSpread: (cells: number, here: string, best: string) =>
      `Spread over ${cells} cells. Chance of finding it in this cell: ${here}; in its likeliest cell: ${best}.`,
    catWhy:
      'Nobody is looking, so the cat is not hiding in one spot: its possibilities flow out like a wave. A look makes it pick one cell, weighted by how bright each ghost is.',
    atomName: 'Atom ⚛️',
    atomState: (width: string) => `A cloud about ${width} cells wide.`,
    atomFocus: (sharp: boolean): string =>
      sharp
        ? 'Your look is sharp: it pins the atom down — and kicks it.'
        : 'Your look is blurry: it learns little, and barely disturbs the atom.',
    atomWhy:
      'Position and speed cannot both be sharp. A narrow cloud is made of many speeds, so it flies apart; a wide, lazy cloud hardly moves.',
    ballName: 'Entangled ball ⚪',
    ballNone:
      'No colour of its own yet. It shares one state with its twin — the thread shows the link.',
    ballColour: (c: string, glasses: string) =>
      `Colour ${c}, as seen through ${glasses} glasses. The link with its twin is used up.`,
    ballWhy:
      'Look at either ball and both get matching colours at once, however far apart. Each colour on its own is still a fair coin toss.',
    lampName: 'Quantum lamp 💡',
    lampState: (look: string) => `Through your current glasses: ${look}.`,
    lampOn: 'on 💡',
    lampOff: 'off',
    lampPlus: 'a definite on-and-off mix 🌓',
    lampMinus: 'the opposite on-and-off mix 🌗',
    lampUndecided: 'undecided — a look will make it choose (50/50)',
    lampWhy:
      'A qubit: Z glasses ask “on or off?”, X glasses ask “which on-and-off mix?”. Knowing one answer makes the other a coin toss — so switching glasses and looking again scrambles it.',
    flowerName: 'Quantum flower 🌱',
    flowerState: (p: string) => `Chance to find it in bloom 🌸 right now: ${p}.`,
    flowerWhy:
      'Left alone, it swings from bud to bloom and back in 8 seconds. Every look snaps it to bud or bloom — watch it non-stop and it never gets the chance to open (the quantum Zeno effect).',
    doorName: 'Door 🚪',
    doorWhy: 'Catch the cat here: it has to be seen in this cell.',
    detectorName: 'Detector 🎯',
    detectorWhy:
      'Counts the atom when it passes. It clicks only now and then — a detector that watched every instant would freeze the atom away.',
    plateName: 'Pressure plate',
    plateWhy: 'Step on it to make the lock measure the far ball in this colour.',
    zoneName: 'Ring',
    zoneWhy:
      'A trap holds the atom still until you first look at it. After the dark, a detector checks that the atom is still inside.',
    barrierName: 'Force field',
    barrierWhy:
      'You cannot walk through it and nothing classical can. A quantum wave leaks a little way into it, so through a thin field part of it comes out the other side — tunnelling. Two cells thick, almost nothing gets through.',
    cameraName: (on: boolean) => `Camera 📷 — ${on ? 'on' : 'off'}`,
    cameraWhy:
      'Another observer. Whatever it sees collapses just as if you had looked: this is decoherence — the world keeps measuring things, which is why big objects look classical.',
    switchName: 'Camera switch 🔘',
    switchWhy: 'The cameras watch only while you stand on it.',
    hotName: 'Hot cell 🔥',
    hotWhy:
      'Heat is countless tiny collisions; now and then one of them records where an object is. A quantum object crossing hot cells keeps getting collapsed, so it creeps like a random walker instead of travelling as a wave.',
    coldName: 'Cold cell ❄️',
    coldWhy:
      'Nothing here bumps into quantum objects, so their superpositions survive. Quantum computers are kept this cold.',
    coreName: 'Unstable core ☢️',
    coreState: (p: string) => `Chance it has decayed if you look now: ${p}.`,
    coreDecayed: 'Decayed 💥',
    coreWhy:
      'Unwatched, it slides towards decay. Each look finds it intact (most likely) and resets the slide — watched constantly, it never gets started (the quantum Zeno effect).',
    exitName: 'Exit 🏁',
    exitWhy: 'Walk here to leave. The cores get one last look when you arrive.',
    sourceName: 'Torch 🔦',
    sourceWhy: 'Fires one particle at a time towards the two slits.',
    slitName: 'Slit',
    slitWhy:
      'Look here while a particle passes and you learn which way it went. A particle with a known path cannot interfere with itself — its stripes vanish.',
    screenName: 'Screen',
    screenWhy:
      'Each particle leaves a dot where it lands. One by one, the dots draw the stripes of a wave.',
    screenLampName: 'Lamp on the screen 💡',
    screenLampWhy:
      'It sits in a dark stripe: the waves from the two slits cancel here, so with both paths open nothing lands on it.',
    playerName: 'You, the observer 👁️',
    playerWhy: 'Your look is a measurement. Close your eyes and things stop being definite.',
    percent: (p: number) => `${Math.round(p * 100)}%`,
  },
  chsh: {
    rules:
      'Each round the judge 🧑‍⚖️ deals you and the robot 🤖 a card: ☀️ or 🌙. You do not see the robot’s card and cannot talk. ' +
      'Each of you answers 🔴 or 🔵. You win the round if your answers match — except when both cards are 🌙: then they must differ.',
    byHand: '1. Try a few rounds by hand',
    yourCard: (card: string) => `Your card: ${card}`,
    moveRed: 'Say 🔴',
    moveBlue: 'Say 🔵',
    moveZ: 'Look via Z 👓',
    moveX: 'Look via X 👓',
    roundResult: (you: string, robot: string, robotCard: string, win: boolean, need: string) =>
      `${win ? '✅' : '❌'} You said ${you}; the robot had ${robotCard} and said ${robot}. Needed: ${need}.`,
    needSame: 'same',
    needDifferent: 'different',
    tally: (won: number, played: number) => `Won ${won} of ${played}`,
    plan: '2. Agree on a plan and play 400 rounds',
    forCard: (card: string) => `On ${card}:`,
    robotPlan: 'Robot:',
    robotQuantum: 'Measures its particle (±22.5°)',
    robotClassical: 'Always says 🔴',
    run: (n: number) => `▶ Play ${n} rounds`,
    running: (done: number, n: number) => `Playing… ${done} / ${n}`,
    result: (won: number, n: number) => `Won ${won} of ${n} = ${((100 * won) / n).toFixed(1)}%`,
    target: (p: number) => `target ≥ ${Math.round(p * 100)}%`,
    breakdown: 'Wins by cards (you / robot)',
    classicalLimit: 'No pre-agreed plan can beat 75% on average.',
  },
};

type Strings = typeof EN;

const RU: Strings = {
  title: 'Quantum Game',
  tagline: 'Ты — наблюдатель. Твой взгляд меняет мир.',
  chapter: (n: number) => `Глава ${n}`,
  chapterTitles: {
    1: 'Эффект наблюдателя',
    2: 'Жуткое дальнодействие',
    3: 'Неопределённость',
    4: 'Чужие наблюдатели',
    5: 'Интерференция',
  },
  classical: {
    title: 'Классический режим',
    intro:
      'Сначала попробуй этот уровень в привычном мире: никакой суперпозиции и туннелирования — предметы находятся там, где находятся, и там и остаются. Получится выиграть?',
    banner: '🧱 Классический режим: обычная физика.',
    switch: '⚛️ Включить квантовую физику',
  },
  play: '▶ Играть',
  continueTo: (title: string) => `▶ Продолжить: ${title}`,
  soundOn: '🔊 Звук включён',
  soundOff: '🔇 Звук выключен',
  aboutTitle: 'Об игре',
  about: [
    'Головоломка о квантовом мире: суперпозиция, измерение, запутанность, неопределённость, туннелирование и интерференция — без формул, но с честной физикой внутри.',
    'Открытый код под лицензией GPL-3.0: github.com/dmitryweiner/quantum-game. Звуки синтезируются прямо в браузере, эмодзи — из шрифта вашего устройства.',
  ],
  timeLeft: (s: number) => `⏱ ${s} с`,
  timeLimit: (s: number) =>
    `⏱ На уровень ${s} ${ruPlural(s, 'секунда', 'секунды', 'секунд')} — отсчёт начнётся после «Начать».`,
  freePlay: 'Свободная игра',
  arcade: {
    best: (n: number) => `🏆 ${n}`,
    over: 'Игра окончена',
    score: (n: number) => `Очки: ${n}`,
    bestLine: (n: number) => `Рекорд: ${n}`,
    record: 'Новый рекорд! 🏆',
    again: '↻ Ещё раз',
    quantumTitle: 'Что здесь квантового',
    paradoxCount: (n: number) => `🤯 ${n}`,
    paradox: {
      far: (n: number) => `🤯 Нашлось в ${n} клетках от того места, где было!`,
      rare: (pct: number) => `🎲 Шанс всего ${pct} % — и это случилось`,
      negative: (pct: number) =>
        `💨 Было здесь с шансом ${pct} % — не оказалось. Теперь оно в другом месте`,
      zeno: '🧊 Замерло под твоим взглядом (Зенон)',
      tunnel: '🌀 Прошло сквозь стену!',
      spooky: (n: number) => `🔗 Жуткое дальнодействие: близнец определился в ${n} клетках`,
      interference: '🌊 Упала за сплошной стеной — прошла через обе щели сразу',
    },
    paradoxNames: {
      far: 'Нашлось далеко от прежнего места',
      rare: 'Случилось маловероятное',
      negative: 'Сдвинулось оттого, что его не увидели',
      zeno: 'Замерло под взглядом',
      tunnel: 'Сквозь стену',
      spooky: 'Жуткое дальнодействие',
      interference: 'За стеной, а не под щелями',
    },
    paradoxTitle: '🤯 Невозможное, что ты видел',
    noParadox: 'В этот раз ничего невозможного — попробуй закрыть глаза 🙈',
    tableTitle: 'Лучшие игры',
    playQuantum: '▶ ⚛ Квантовая',
    playClassical: '⚪ Классическая',
    quantumOn: '⚛ КВАНТЫ ВКЛЮЧЕНЫ — смотри, как ломается мир!',
    points: (n: number) => `+${n}`,
    quantris: {
      title: 'Квантрис',
      menu: '🧩 Квантрис',
      goal: 'Собирай линии — некоторые фигуры падают сразу в двух местах',
      hud: (score: number, lines: number, looks: number, best: number, paradoxes: number) =>
        `⭐ ${score} · ☰ ${lines} · 👁 ${looks} · 🤯 ${paradoxes} · 🏆 ${best}`,
      rules: [
        'Светящаяся фигура находится сразу в двух местах — проценты показывают шанс каждого.',
        'Касание кучи — это измерение: фигура оказывается в одном из мест, случайно, но с этими шансами. Если это не то место, что коснулось, она падает дальше.',
        'Нажми 👁, чтобы посмотреть и определить фигуру заранее. Взглядов мало; каждая собранная линия даёт ещё один.',
        'Упри оба места в стену, пока они не совпадут: два одинаковых места — это одно, и фигура становится определённой.',
        'Некоторые фигуры повёрнуты сразу двумя способами вместо двух мест.',
        '🔗 Следующая фигура может быть запутана с текущей (обе светятся розовым и связаны нитью): как только текущая определится, определится и следующая — в противоположном месте.',
        'Держи 👁 — и фигура под взглядом стоит на месте (Зенон). Это стоит один взгляд в секунду.',
        'Фигура над тонким навесом может протуннелировать сквозь него в пустоту под ним — бледный контур показывает куда и с каким шансом.',
      ],
      streak: (n: number) => `🎲 ${n} ожидаемых исхода подряд — это правило Борна, а не везение`,
      controlsTouch:
        'На стакане: веди пальцем вбок — сдвиг, вниз — ускорить, резко смахни вниз — бросок. Тап — поворот (двумя пальцами или слева от фигуры — в другую сторону); тап по светящейся фигуре — взгляд. Кнопки: ◀ ▶ сдвиг, ▲ или большая ⟳ — поворот, ▼ вниз, 👁 взгляд (держи — заморозить).',
      controlsDesktop:
        '← → сдвиг · ↑ / X поворот · Z поворот назад · ↓ вниз · Пробел — бросок · L — взгляд (держи — заморозить). Приземлившуюся фигуру ещё полсекунды можно двигать.',
      aria: {
        left: 'Влево',
        right: 'Вправо',
        rotate: 'Повернуть',
        down: 'Вниз',
        drop: 'Бросить',
        look: 'Посмотреть',
      },
      next: 'Дальше',
    },
    invaders: {
      title: 'Квантовые захватчики',
      menu: '👾 Квантовые захватчики',
      goal: 'Останови захватчиков 👾 — они облака, пока на них не смотришь',
      hud: (
        lives: number,
        score: number,
        wave: number,
        torpedoes: number,
        paradoxes: number,
        best: number,
      ) => `❤️ ${lives} · ⭐ ${score} · 🌊 ${wave} · ⚛ ${torpedoes} · 🤯 ${paradoxes} · 🏆 ${best}`,
      rules: [
        'Строй марширует, как в классической игре, — серые контуры показывают, где были бы захватчики по классике. А на самом деле каждый — облако вокруг своего места.',
        'Прожектор 👁 — это твой взгляд: всё, что он освещает, схлопывается, а захватчик, которого держишь в луче, не может сдвинуться (Зенон). Лазер спрашивает каждую клетку на пути «ты здесь?» — и промах отталкивает облако.',
        'Подбитый, пока он размазан, захватчик стоит до 3 очков. Стреляй вслепую 🙈 — или сначала посмотри и бей наверняка.',
        'Бомбы 💣 — это волны. Щит их останавливает, кроме двух щелей, а прошедшее падает полосами: чаще всего за серединой стены и почти никогда — прямо под щелью.',
        'Освети щель прожектором — и узнаешь, куда прошла бомба: полосы размываются, безопасных колонок больше нет.',
        '👽 Близнецы запутаны: увидишь одного — второй мгновенно определится, зеркально, на другом конце строя.',
        'НЛО 🛸 летит сразу в двух местах; выстрел решает по правилу Борна. Квантовая торпеда ⚛ — волна, которая находит захватчиков, которых ты не видишь.',
      ],
      controlsTouch: 'Веди пальцем по экрану — движение. Держи 👁 — свет, 🔫 — огонь, ⚛ — торпеда.',
      controlsDesktop:
        '← → / A D — движение · Пробел — огонь · держи Shift или L — свет · E или правая кнопка — торпеда.',
      aria: { look: 'Прожектор', fire: 'Огонь', torpedo: 'Запустить квантовую торпеду' },
      wave: (n: number) => `Волна ${n}!`,
    },
    pong: {
      title: 'Квантовый пинг-понг',
      menu: '🏓 Квантовый пинг-понг',
      goal: 'До 7 очков — мяч остаётся волной, пока кто-нибудь не посмотрит',
      hud: (
        you: number,
        ai: number,
        energy: number,
        score: number,
        paradoxes: number,
        best: number,
      ) => `🏓 ${you}:${ai} · ⚡ ${energy} · ⭐ ${score} · 🤯 ${paradoxes} · 🏆 ${best}`,
      rules: [
        'Мяч — волновой пакет: без взгляда он расплывается в полёте, и до тебя долетает облако шире ракетки. Серое кольцо — где был бы классический мяч.',
        'Ракетка — детектор: где облако её касается, мяч может там оказаться — и отскочить. Линия ворот за тобой — тоже детектор.',
        'Держи палец на своей половине — это взгляд 👁: мяч ловится где-то в свете и определяется. Смотри поздно, у самой ракетки: чем точнее мяч определён, тем быстрее он снова расплывается (неопределённость).',
        'Взгляд тратит энергию ⚡. Если смотреть долго, мяч становится обычным, классическим.',
        'Стенка перед воротами компьютера останавливает мяч — почти: иногда он сквозь неё туннелирует.',
        'Компьютер ведёт ракетку к классическому ожиданию — середине облака — и промахивается, когда мяч оказывается сбоку.',
      ],
      controlsTouch: 'Веди пальцем внизу — ракетка. Держи палец на своей половине — взгляд.',
      controlsDesktop:
        '← → или мышь — ракетка · держи пробел — смотреть прямо перед своей ракеткой · или держи левую кнопку мыши — смотреть туда, где мышь.',
      win: 'Победа! 🏆',
      lose: 'На этот раз выиграл компьютер.',
    },
    snake: {
      title: 'Квантовая змейка',
      menu: '🐍 Квантовая змейка',
      goal: 'Ешь яблоки 🍎 — они стоят на месте, только пока ты на них смотришь',
      hud: (score: number, best: number, paradoxes: number, eyes: boolean) =>
        `${eyes ? '👁' : '🙈'} · 🍎 ${score} · 🤯 ${paradoxes} · 🏆 ${best}`,
      rules: [
        'Без взгляда яблоко расплывается облаком призраков — это все места, где оно может быть. Серый контур — где оно было бы по классике.',
        'Змейка смотрит вперёд: всё, что она видит, схлопывается, а яблоко, на которое смотришь не отрываясь, замирает (Зенон).',
        'Закрой глаза 🙈 — и яблоко свободно расплывается. Пойманное, пока оно размазано, стоит до 3 очков; замороженное взглядом — 1.',
        'Вползти в призрака — значит измерить клетку: яблоко там с вероятностью, равной яркости призрака, — или его там нет, и облако перетекает в другие места.',
        'Фиолетовое силовое поле тебя не пустит, а яблоко может сквозь него протуннелировать.',
        '🍎🍏 Запутанная пара: у каждого призрака оба цвета — какое из яблок красное, тоже не решено. Найдёшь одно — второе мгновенно определится в зеркальной клетке, в другом цвете.',
        'Упёрлась в стену — змейка останавливается; продолжишь туда же — разобьётся.',
        '🍒 Лёгкая вишня расплывается быстро и стоит дороже; 🍐 тяжёлая груша почти не расплывается.',
        'На горячих клетках 🔥 мир всё время «замечает» фрукт — там он остаётся обычным, классическим (декогеренция).',
        '✖ — клетка, где фрукта сейчас быть не может, хотя по обе стороны от неё он вполне может быть: интерференция.',
      ],
      controlsTouch: 'Свайп — повернуть. Держи кнопку 🙈 — глаза закрыты.',
      eyesAria: 'Закрыть глаза',
      field: '🟪 Силовое поле: тебе не пройти — а фрукт может сквозь него протуннелировать.',
      controlsDesktop: 'Стрелки или WASD — повернуть. Держи пробел — глаза закрыты 🙈.',
    },
  },
  sandbox: 'Песочница',
  sandboxNote: 'Свободная игра без цели',
  start: 'Начать',
  retry: 'Ещё раз',
  next: 'Следующий уровень',
  menu: 'Уровни',
  close: 'Закрыть',
  learnMore: 'ℹ️ Подробнее',
  learnMoreTitle: 'Квантовые эффекты на этом уровне',
  whyClassicalFails: 'Зачем здесь квантовая физика',
  whatHappened: 'Что сейчас произошло?',
  won: {
    'catch-at-target': 'Поймал! 🎉',
    unlock: 'Открыто! 🔓',
    'zone-after-dark': 'Атом в кольце! 🎉',
    escape: 'Выбрался, ядро цело! 🏁',
    'light-lamp': 'Лампа горит! 💡',
    chsh: 'Телепатия подтверждена! 🎉',
  },
  lost: 'Время вышло ⏳',
  lostText: 'Кот всё ещё размазан облаком «может быть». Попробуй взглянуть в другой момент.',
  allDone: 'Пока это всё — новые главы уже в работе.',
  controlsTouch:
    'Левый палец — ходить · Правый палец — смотреть · Отпустить правый палец — закрыть глаза',
  controlsDesktop:
    'WASD / стрелки — ходить · Мышь или Shift + ← → — смотреть · Пробел или правая кнопка мыши — закрыть глаза',
  language: 'Язык',
  glasses: (b: string) => `👓 ${b}`,
  glassesHint: 'Очки: в Z шары 🔴/🔵, в X — 🟢/🟠 (кнопка или Q)',
  lostEscaped: 'Атом покинул кольцо 💨',
  lostEscapedText:
    'Детектор нашёл его снаружи. Твой взгляд зафиксировал атом слишком точно — и толкнул его. Попробуй посмотреть мягче, размыто.',
  lostCore: 'Ядро распалось 💥',
  lostCoreText:
    'Без присмотра ядро скатилось к распаду, и взгляд застал его уже распавшимся. Держи его в поле зрения всё время; короткие отлучки не страшны.',
  lightsOut: '🌑 Свет погас',
  focusLabel: 'Фокус взгляда',
  focusBlurry: '☁️ размыто',
  focusSharp: 'остро 🎯',
  focusHint:
    'Фокус: узкий — острый взгляд (сильный толчок), широкий — размытый (мягкий). Ползунок или колёсико мыши',
  lostWrongColour: 'Замок не открылся 🔒',
  lostWrongColourText:
    'Дальний шар оказался другого цвета. Помни: цвета нет, пока кто-нибудь не посмотрит, — убедись, что твой шар подсказывает нужный.',
  inspect: {
    button: 'Осмотр: нажми на объект, чтобы узнать, что с ним происходит',
    stateTitle: 'Сейчас',
    whyTitle: 'Почему',
    catName: 'Квантовый кот 🐱',
    catDefinite: 'Точно в этой клетке: его только что увидели, и ему пришлось выбрать одно место.',
    catSpread: (cells: number, here: string, best: string) =>
      `Размазан по ${cells} клеткам. Шанс найти его в этой клетке — ${here}, в самой вероятной — ${best}.`,
    catWhy:
      'Никто не смотрит, поэтому кот не прячется в одном месте: его возможности растекаются, как волна. Взгляд заставляет выбрать одну клетку — тем вероятнее, чем ярче призрак.',
    atomName: 'Атом ⚛️',
    atomState: (width: string) => `Облако шириной примерно ${width} клеток.`,
    atomFocus: (sharp: boolean) =>
      sharp
        ? 'Твой взгляд острый: он прижимает атом к точке — и толкает его.'
        : 'Твой взгляд размытый: он узнаёт немного и почти не тревожит атом.',
    atomWhy:
      'Положение и скорость не бывают одновременно точными. Узкое облако состоит из множества скоростей и разлетается; широкое ленивое облако почти не движется.',
    ballName: 'Запутанный шар ⚪',
    ballNone:
      'Собственного цвета пока нет. У него одно общее состояние с близнецом — нить показывает эту связь.',
    ballColour: (c: string, glasses: string) =>
      `Цвет ${c} в очках ${glasses}. Связь с близнецом израсходована.`,
    ballWhy:
      'Посмотри на любой шар — и оба мгновенно получат согласованные цвета на любом расстоянии. При этом каждый цвет сам по себе — честная монетка.',
    lampName: 'Квантовая лампа 💡',
    lampState: (look: string) => `В твоих нынешних очках: ${look}.`,
    lampOn: 'горит 💡',
    lampOff: 'не горит',
    lampPlus: 'определённая смесь «горит и не горит» 🌓',
    lampMinus: 'противоположная смесь 🌗',
    lampUndecided: 'не определилась — взгляд заставит выбрать (50 на 50)',
    lampWhy:
      'Это кубит: очки Z спрашивают «горит или нет?», очки X — «какая смесь?». Если известен один ответ, другой — монетка, поэтому смена очков и новый взгляд всё перемешивают.',
    flowerName: 'Квантовый цветок 🌱',
    flowerState: (p: string) => `Шанс застать его в цвету 🌸 прямо сейчас: ${p}.`,
    flowerWhy:
      'Если его не трогать, он за 8 секунд распускается и закрывается обратно. Каждый взгляд возвращает его в «бутон» или «цветок» — смотри непрерывно, и он так и не раскроется (квантовый эффект Зенона).',
    doorName: 'Дверь 🚪',
    doorWhy: 'Здесь нужно поймать кота: его должны увидеть именно в этой клетке.',
    detectorName: 'Детектор 🎯',
    detectorWhy:
      'Засчитывает атом, когда тот пролетает мимо. Щёлкает лишь изредка: детектор, следящий каждое мгновение, «заморозил» бы атом и не подпустил его.',
    plateName: 'Нажимная плита',
    plateWhy: 'Встань на неё, и замок измерит дальний шар в этом цвете.',
    zoneName: 'Кольцо',
    zoneWhy:
      'Ловушка держит атом неподвижным, пока ты впервые на него не посмотришь. После темноты детектор проверит, остался ли атом внутри.',
    barrierName: 'Силовое поле',
    barrierWhy:
      'Сквозь него не пройти, и ничему классическому тоже. А квантовая волна немного затекает внутрь, поэтому сквозь тонкое поле часть её выходит с другой стороны — это туннелирование. Сквозь поле толщиной в две клетки почти ничего не проходит.',
    cameraName: (on: boolean) => `Камера 📷 — ${on ? 'включена' : 'выключена'}`,
    cameraWhy:
      'Ещё один наблюдатель. Всё, что она видит, схлопывается так же, как от твоего взгляда. Это декогеренция: мир постоянно что-то измеряет, поэтому большие предметы выглядят классическими.',
    switchName: 'Выключатель камер 🔘',
    switchWhy: 'Камеры следят, только пока ты стоишь на кнопке.',
    hotName: 'Горячая клетка 🔥',
    hotWhy:
      'Тепло — это бесчисленные мелкие столкновения, и время от времени какое-нибудь из них фиксирует, где объект. Квантовый объект на горячих клетках то и дело схлопывается и ползёт, как случайный бродяга, а не бежит волной.',
    coldName: 'Холодная клетка ❄️',
    coldWhy:
      'Здесь ничто не задевает квантовые объекты, и их суперпозиции сохраняются. Квантовые компьютеры держат именно в таком холоде.',
    coreName: 'Нестабильное ядро ☢️',
    coreState: (p: string) => `Шанс, что оно распалось, если посмотреть сейчас: ${p}.`,
    coreDecayed: 'Распалось 💥',
    coreWhy:
      'Без присмотра ядро скатывается к распаду. Каждый взгляд (скорее всего) застаёт его целым и обнуляет этот путь; под постоянным взглядом распад так и не начинается (квантовый эффект Зенона).',
    exitName: 'Выход 🏁',
    exitWhy: 'Дойди сюда, чтобы выйти. На выходе ядра проверят в последний раз.',
    sourceName: 'Фонарь 🔦',
    sourceWhy: 'Выпускает частицы по одной в сторону двух щелей.',
    slitName: 'Щель',
    slitWhy:
      'Смотри сюда, пока пролетает частица, — и узнаешь, каким путём она шла. Частица с известным путём не может интерферировать сама с собой — её полосы исчезают.',
    screenName: 'Экран',
    screenWhy:
      'Каждая частица оставляет точку там, куда попала. Точка за точкой они рисуют полосы волны.',
    screenLampName: 'Лампа на экране 💡',
    screenLampWhy:
      'Она стоит в тёмной полосе: волны от двух щелей здесь гасят друг друга, и пока открыты оба пути, сюда ничего не попадает.',
    playerName: 'Ты, наблюдатель 👁️',
    playerWhy: 'Твой взгляд — это измерение. Закрой глаза, и всё перестаёт быть определённым.',
    percent: (p: number) => `${Math.round(p * 100)}%`,
  },
  chsh: {
    rules:
      'В каждом раунде судья 🧑‍⚖️ раздаёт тебе и роботу 🤖 по карточке: ☀️ или 🌙. Карточку робота ты не видишь, переговариваться нельзя. ' +
      'Каждый отвечает 🔴 или 🔵. Раунд выигран, если ответы совпали, — кроме случая, когда у обоих 🌙: тогда ответы должны различаться.',
    byHand: '1. Сыграй несколько раундов вручную',
    yourCard: (card: string) => `Твоя карточка: ${card}`,
    moveRed: 'Ответить 🔴',
    moveBlue: 'Ответить 🔵',
    moveZ: 'Взглянуть в Z 👓',
    moveX: 'Взглянуть в X 👓',
    roundResult: (you: string, robot: string, robotCard: string, win: boolean, need: string) =>
      `${win ? '✅' : '❌'} Ты ответил ${you}; у робота была ${robotCard}, он ответил ${robot}. Нужно было: ${need}.`,
    needSame: 'одинаково',
    needDifferent: 'по-разному',
    tally: (won: number, played: number) => `Выиграно ${won} из ${played}`,
    plan: '2. Договоритесь о плане и сыграйте 400 раундов',
    forCard: (card: string) => `На ${card}:`,
    robotPlan: 'Робот:',
    robotQuantum: 'Измеряет свою частицу (±22,5°)',
    robotClassical: 'Всегда отвечает 🔴',
    run: (n: number) => `▶ Сыграть ${n} раундов`,
    running: (done: number, n: number) => `Играем… ${done} / ${n}`,
    result: (won: number, n: number) =>
      `Выиграно ${won} из ${n} = ${((100 * won) / n).toFixed(1).replace('.', ',')}%`,
    target: (p: number) => `нужно ≥ ${Math.round(p * 100)}%`,
    breakdown: 'Победы по карточкам (ты / робот)',
    classicalLimit: 'Ни один заранее оговорённый план не даёт в среднем больше 75%.',
  },
};

const TABLES: Readonly<Record<Locale, Strings>> = { en: EN, ru: RU };

/** UI strings in the current language. */
export function T(): Strings {
  return TABLES[locale()];
}

export const STRING_TABLES = TABLES;
