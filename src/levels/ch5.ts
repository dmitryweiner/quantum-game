import type { LevelDef } from './types';

/** Chapter 5 — interference: two slits and the Elitzur–Vaidman bomb tester. */
export const CHAPTER_5: LevelDef[] = [
  {
    id: 'ch5-01',
    chapter: 5,
    title: { en: 'Dark Stripe', ru: 'Тёмная полоса' },
    goal: {
      en: 'Light the lamp 💡 on the screen 3 times',
      ru: 'Зажги лампу 💡 на экране 3 раза',
    },
    hint: {
      en:
        'Particles fly from the torch 🔦 through two slits, one each second, and leave dots on the screen. Watch the stripes build up: the lamp sits in a dark one. ' +
        'Look at the slits as the particles pass them — and see what happens to the stripes.',
      ru:
        'Частицы летят из фонаря 🔦 через две щели, по одной в секунду, и оставляют точки на экране. Посмотри, как проступают полосы: лампа стоит в тёмной. ' +
        'Смотри на щели, когда частицы через них пролетают, — и увидишь, что станет с полосами.',
    },
    whyClassicalFails: {
      en: 'Waves from the two slits cancel exactly where the lamp is, so nothing ever lands there. Only knowing which slit each particle used stops the cancelling.',
      ru: 'Волны от двух щелей гасят друг друга ровно там, где лампа, поэтому туда ничего не попадает. Перестанут гаснуть они, только если узнать, через какую щель прошла каждая частица.',
    },
    explanation: {
      en:
        'Each particle went through both slits at once, and the two halves of its wave cancelled at the lamp. Watching the slits told you which way it went — ' +
        'and a particle with a known path has nothing to interfere with, so the stripes disappeared and the lamp lit up.',
      ru:
        'Каждая частица шла через обе щели сразу, и две половинки её волны гасили друг друга у лампы. Взгляд на щели сообщал, куда она пошла, — ' +
        'а частице с известным путём не с чем интерферировать, поэтому полосы исчезли и лампа зажглась.',
    },
    effects: ['interference', 'collapse', 'superposition'],
    map: [
      '###################',
      '#.....#..........Z#',
      '#.....#..........Z#',
      '#.....Y..........Z#',
      '#.....#..........Z#',
      '#.....#..........Z#',
      '#S....#..........Z#',
      '#.....#..........Z#',
      '#.....#..........Z#',
      '#.....Y..........l#',
      '#.....#..........Z#',
      '#.....#..........Z#',
      '#=================#',
      '#.......@.........#',
      '###################',
    ],
    winCondition: { type: 'light-lamp', hits: 3, spacing: 6, envelope: 5 },
    timeLimit: 45,
    gazeRange: 8,
  },
  {
    id: 'ch5-02',
    chapter: 5,
    title: { en: 'Bomb Tester', ru: 'Проверка бомб' },
    goal: {
      en: 'Prove a box holds a live bomb 💣 — without setting it off',
      ru: 'Докажи, что в коробке живая бомба 💣, — не взорвав её',
    },
    whyClassicalFails: {
      en: 'These bombs go off at the touch of a single photon. Opening a box, poking it or shining a light on it — any classical check sets a live bomb off.',
      ru: 'Эти бомбы взрываются от одного-единственного фотона. Открыть коробку, потрогать её, посветить на неё — любая классическая проверка взрывает живую бомбу.',
    },
    explanation: {
      en:
        'Without a bomb the photon’s two paths always recombine into the bright detector. A live bomb in one arm blocks that path, so the photon, if it survives, ' +
        'can reach the dark detector — a click there proves the bomb is live, although no photon ever touched it.',
      ru:
        'Без бомбы два пути фотона всегда сходятся в «светлом» детекторе. Живая бомба в одном плече перекрывает путь, поэтому уцелевший фотон ' +
        'может попасть в «тёмный» детектор — щелчок там доказывает, что бомба живая, хотя ни один фотон её не коснулся.',
    },
    effects: ['interaction-free', 'interference', 'collapse'],
    map: ['###########', '#.........#', '#..R...J..#', '#.........#', '#....@....#', '###########'],
    winCondition: { type: 'bombs', mode: 'prove-one', boxes: 5, bombs: 3 },
  },
  {
    id: 'ch5-03',
    chapter: 5,
    title: { en: 'Safe Bomb Squad', ru: 'Сапёр без риска' },
    goal: {
      en: 'Sort all 5 boxes into bombs 💣 and empties — at most one explosion',
      ru: 'Разбери все 5 коробок на бомбы 💣 и пустые — не больше одного взрыва',
    },
    whyClassicalFails: {
      en:
        'With one photon per test, half of the live bombs blow up. The trick is to send the photon round many times, nudging it only a little each pass — ' +
        'the bomb keeps “looking” and keeps finding nothing (the Zeno effect).',
      ru:
        'Если тратить на проверку один фотон, половина живых бомб взрывается. Хитрость в том, чтобы прогнать фотон по кругу много раз, каждый раз лишь чуть-чуть сдвигая его, — ' +
        'бомба «смотрит» снова и снова и каждый раз ничего не находит (эффект Зенона).',
    },
    explanation: {
      en:
        'Each pass the photon edged towards the bomb’s arm, but every “look” by the bomb most likely found it absent and reset it. With many passes the bomb almost never ' +
        'catches it — so a live bomb can be found with almost no risk. This was demonstrated with real photons in 1995.',
      ru:
        'На каждом круге фотон чуть-чуть сдвигался к плечу с бомбой, но каждый «взгляд» бомбы почти наверняка не находил его и сбрасывал. При многих кругах бомба почти никогда ' +
        'его не ловит — живую бомбу можно найти почти без риска. На настоящих фотонах это показали в 1995 году.',
    },
    effects: ['interaction-free', 'zeno', 'interference'],
    map: ['###########', '#.........#', '#..R...J..#', '#.........#', '#....@....#', '###########'],
    winCondition: {
      type: 'bombs',
      mode: 'sort-all',
      boxes: 5,
      bombs: 3,
      maxBooms: 1,
      maxPasses: 30,
    },
  },
];
