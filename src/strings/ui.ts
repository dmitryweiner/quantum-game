import { locale, type Locale } from '../i18n';

/** Russian noun form for a count: 1 круг, 2 круга, 5 кругов. */
function ruPlural(n: number, one: string, few: string, many: string): string {
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
    6: 'Quantum Information',
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
    bombs: 'Bombs sorted safely! 💣',
    teleport: 'Teleported! ✨',
    spy: 'The line is safe with you! 🔐',
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
  lostSpy: 'Wrong call 🕵️',
  lostSpyText:
    'Compare enough bits before you decide: with a spy on the line, about one in four of them disagree.',
  lostBombs: 'Too many explosions 💥',
  lostBombsText:
    'The live bombs went off before you could prove one safely. Try again — the boxes are reshuffled.',
  teleport: {
    scheme:
      'Your room: the secret 🎁 and your half of an entangled pair ⚪. Sealed room: the other half ⚪. Between the rooms only a phone line for ordinary bits.',
    streak: (n: number, of: number) => `Teleported in a row: ${n} / ${of}`,
    secret: 'Secret',
    far: 'Far ball',
    bell: '🔬 Bell measurement (secret + your half)',
    bits: (z: string, x: string) => `Bits on the phone: Z-bit ${z} · X-bit ${x}`,
    flipX: (on: boolean) => `${on ? '✅' : '⬜'} Flip X on the far ball`,
    flipZ: (on: boolean) => `${on ? '✅' : '⬜'} Flip Z on the far ball`,
    rule: 'Rule: X-bit 1 → flip X; Z-bit 1 → flip Z.',
    peek: '👀 Peek at the secret (Z glasses) and phone the colour',
    peeked: (c: string) =>
      `You saw ${c} and had the far ball made ${c}. The secret itself is spoilt now.`,
    check: '✅ Check the far ball',
    match: (c: string) => `Match! The secret was ${c}, and the far ball is ${c} too.`,
    miss: (c: string) => `No match — the secret was ${c}. The streak starts again.`,
    next: 'Next secret ▶',
  },
  spy: {
    scheme:
      'The robot 🤖 sends you single photons for a secret key, each in random glasses. A spy 🕵️ may be on the line — or not.',
    progress: (n: number, of: number) => `Lines judged correctly: ${n} / ${of}`,
    receive: (n: number) => `📡 Receive ${n} photons (random glasses)`,
    received: (n: number, kept: number) =>
      `Received ${n}. Glasses matched the robot’s on ${kept} — that is your raw key.`,
    compareLabel: (k: number, max: number) =>
      `Compare ${k} of them in public (the message needs the rest; at most ${max})`,
    compare: (k: number) => `🔍 Compare ${k} bits`,
    compared: (checked: number, errors: number): string =>
      errors === 0 ? `Compared ${checked}: all agree.` : `Compared ${checked}: ${errors} disagree!`,
    clean: '✅ Line is clean — send the secret',
    spyCall: '🚨 Spy! Throw the key away',
    right: (spy: boolean): string =>
      spy
        ? 'Right — there was a spy 🕵️. Key thrown away.'
        : 'Right — the line was clean. Secret delivered 🔐.',
    wrong: (spy: boolean): string =>
      spy
        ? 'Wrong — there was a spy 🕵️, and now she has your secret.'
        : 'Wrong — the line was clean; you threw away a good key.',
    next: 'Next line ▶',
  },
  bombs: {
    table:
      'Interferometer: 🔦 → beam splitter → two arms (one through the box) → beam splitter → detectors 🟢 bright / 🔴 dark',
    tableZeno:
      'Zeno tester: the photon goes round N times, nudged a little towards the box arm on each pass, then hits ⚪ “empty” or 💣 “bomb”.',
    box: (i: number) => `Box ${i + 1}`,
    unknown: '❓',
    test: '🔦 Fire a photon',
    testZeno: (n: number) => `🔦 Test with ${n} ${n === 1 ? 'pass' : 'passes'}`,
    open: '👀 Open the box',
    passes: (n: number) => `Passes N = ${n}`,
    survival: (p: string) => `A live bomb stays safe with chance ${p}`,
    result: {
      boom: '💥 Boom! It was a live bomb.',
      bright: '🟢 Bright detector — tells you nothing yet.',
      dark: '🔴 Dark detector! A live bomb — proven without touching it.',
      bomb: '💣 “Bomb” — a live bomb, found safely.',
      empty: '⚪ “Empty” — no bomb in this box.',
      'opened-empty': '📦 Opened: empty.',
    } as Record<string, string>,
    progressProve: (proven: number) => `Proven live bombs: ${proven} / 1`,
    progressSort: (sorted: number, total: number, booms: number, max: number) =>
      `Sorted: ${sorted} / ${total} · explosions: ${booms} / ${max}`,
    pick: 'Pick a box',
  },
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
    6: 'Квантовая информация',
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
    bombs: 'Бомбы найдены без риска! 💣',
    teleport: 'Телепортировано! ✨',
    spy: 'С тобой линия в безопасности! 🔐',
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
  lostSpy: 'Неверное решение 🕵️',
  lostSpyText:
    'Сверь достаточно бит, прежде чем решать: если на линии шпион, не совпадает примерно каждый четвёртый.',
  lostBombs: 'Слишком много взрывов 💥',
  lostBombsText:
    'Живые бомбы взорвались раньше, чем ты успел безопасно доказать хоть одну. Попробуй ещё — коробки перемешаны заново.',
  teleport: {
    scheme:
      'Твоя комната: секрет 🎁 и твоя половинка запутанной пары ⚪. Запертая комната: другая половинка ⚪. Между комнатами — только телефон для обычных битов.',
    streak: (n: number, of: number) => `Телепортировано подряд: ${n} / ${of}`,
    secret: 'Секрет',
    far: 'Дальний шар',
    bell: '🔬 Измерение Белла (секрет + твоя половинка)',
    bits: (z: string, x: string) => `Биты по телефону: Z-бит ${z} · X-бит ${x}`,
    flipX: (on: boolean) => `${on ? '✅' : '⬜'} Перевернуть дальний шар по X`,
    flipZ: (on: boolean) => `${on ? '✅' : '⬜'} Перевернуть дальний шар по Z`,
    rule: 'Правило: X-бит 1 → переворот X; Z-бит 1 → переворот Z.',
    peek: '👀 Подсмотреть секрет (очки Z) и сообщить цвет',
    peeked: (c: string) =>
      `Ты увидел ${c} и попросил сделать дальний шар ${c}. Сам секрет теперь испорчен.`,
    check: '✅ Проверить дальний шар',
    match: (c: string) => `Совпало! Секрет был ${c}, и дальний шар тоже ${c}.`,
    miss: (c: string) => `Не совпало — секрет был ${c}. Серия начинается заново.`,
    next: 'Следующий секрет ▶',
  },
  spy: {
    scheme:
      'Робот 🤖 присылает тебе одиночные фотоны для секретного ключа, каждый — в случайных очках. На линии может сидеть шпион 🕵️ — а может и не сидеть.',
    progress: (n: number, of: number) => `Верно оценено линий: ${n} / ${of}`,
    receive: (n: number) => `📡 Принять ${n} фотона (случайные очки)`,
    received: (n: number, kept: number) =>
      `Принято ${n}. Очки совпали с очками робота у ${kept} — это сырой ключ.`,
    compareLabel: (k: number, max: number) =>
      `Сверить ${k} из них в открытую (остальное нужно для сообщения; не больше ${max})`,
    compare: (k: number) => `🔍 Сверить ${k} бит`,
    compared: (checked: number, errors: number): string =>
      errors === 0
        ? `Сверено ${checked}: все совпали.`
        : `Сверено ${checked}: ${errors} не совпали!`,
    clean: '✅ Линия чиста — отправить секрет',
    spyCall: '🚨 Шпион! Выбросить ключ',
    right: (spy: boolean): string =>
      spy
        ? 'Верно — шпион был 🕵️. Ключ выброшен.'
        : 'Верно — линия была чиста. Секрет доставлен 🔐.',
    wrong: (spy: boolean): string =>
      spy
        ? 'Ошибка — шпион был 🕵️, и теперь твой секрет у него.'
        : 'Ошибка — линия была чиста, а ты выбросил хороший ключ.',
    next: 'Следующая линия ▶',
  },
  bombs: {
    table:
      'Интерферометр: 🔦 → светоделитель → два плеча (одно через коробку) → светоделитель → детекторы 🟢 светлый / 🔴 тёмный',
    tableZeno:
      'Тестер с Зеноном: фотон проходит круг N раз, каждый раз чуть сдвигаясь к плечу с коробкой, а затем попадает в ⚪ «пусто» или 💣 «бомба».',
    box: (i: number) => `Коробка ${i + 1}`,
    unknown: '❓',
    test: '🔦 Выпустить фотон',
    testZeno: (n: number) => `🔦 Проверить за ${n} ${ruPlural(n, 'круг', 'круга', 'кругов')}`,
    open: '👀 Открыть коробку',
    passes: (n: number) => `Кругов N = ${n}`,
    survival: (p: string) => `Живая бомба уцелеет с вероятностью ${p}`,
    result: {
      boom: '💥 Бум! Это была живая бомба.',
      bright: '🟢 Светлый детектор — пока ничего не известно.',
      dark: '🔴 Тёмный детектор! Живая бомба — доказано без касания.',
      bomb: '💣 «Бомба» — живая бомба, найдена без риска.',
      empty: '⚪ «Пусто» — в этой коробке бомбы нет.',
      'opened-empty': '📦 Открыта: пусто.',
    } as Record<string, string>,
    progressProve: (proven: number) => `Доказано живых бомб: ${proven} / 1`,
    progressSort: (sorted: number, total: number, booms: number, max: number) =>
      `Разобрано: ${sorted} / ${total} · взрывов: ${booms} / ${max}`,
    pick: 'Выбери коробку',
  },
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
