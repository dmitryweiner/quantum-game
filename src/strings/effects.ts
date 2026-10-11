import type { Locale, Text } from '../i18n';

/**
 * Reference of quantum effects (PLAN.md §1.4.4). Each effect is described
 * once; levels refer to it by id. Links are per language: Russian readers
 * get Russian sources where they exist.
 */
export type EffectId =
  | 'superposition'
  | 'collapse'
  | 'born-rule'
  | 'quantum-walk'
  | 'negative-result'
  | 'zeno'
  | 'entanglement'
  | 'complementarity'
  | 'bell'
  | 'uncertainty'
  | 'tunnelling'
  | 'decoherence';

export interface EffectLink {
  title: string;
  url: string;
}

export interface EffectInfo {
  id: EffectId;
  name: Text;
  /** 1–3 plain-language sentences. */
  summary: Text;
  links: Readonly<Record<Locale, EffectLink[]>>;
}

const wiki = (lang: 'en' | 'ru', article: string) =>
  `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(article).replace(/%2F/g, '/')}`;

export const EFFECTS: Readonly<Record<EffectId, EffectInfo>> = {
  superposition: {
    id: 'superposition',
    name: { en: 'Quantum superposition', ru: 'Квантовая суперпозиция' },
    summary: {
      en:
        'An unobserved quantum object is not secretly in one place: it is genuinely spread over many possibilities at once. ' +
        'The ghosts you see are all the places the cat could turn up — Schrödinger’s cat, but with a map.',
      ru:
        'Квантовый объект, на который никто не смотрит, не прячется в каком-то одном месте — он по-настоящему находится во многих местах сразу. ' +
        'Призраки на экране — все места, где может оказаться кот. Это кот Шрёдингера, только с картой.',
    },
    links: {
      en: [
        { title: 'Wikipedia: Quantum superposition', url: wiki('en', 'Quantum_superposition') },
        { title: 'Wikipedia: Schrödinger’s cat', url: wiki('en', "Schrödinger's_cat") },
      ],
      ru: [
        { title: 'Википедия: Квантовая суперпозиция', url: wiki('ru', 'Квантовая_суперпозиция') },
        { title: 'Википедия: Кот Шрёдингера', url: wiki('ru', 'Кот_Шрёдингера') },
      ],
    },
  },
  collapse: {
    id: 'collapse',
    name: { en: 'Measurement and collapse', ru: 'Измерение и коллапс' },
    summary: {
      en:
        'Looking at a quantum object forces it to pick one definite answer, and the other possibilities vanish. ' +
        'In physics “looking” means any interaction that records where the object is — eyes are optional.',
      ru:
        'Взгляд заставляет квантовый объект выбрать один определённый ответ, а остальные возможности исчезают. ' +
        'В физике «посмотреть» — это любое взаимодействие, которое фиксирует, где объект; глаза для этого не обязательны.',
    },
    links: {
      en: [
        { title: 'Wikipedia: Wave function collapse', url: wiki('en', 'Wave_function_collapse') },
        {
          title: 'Wikipedia: Observer effect (physics)',
          url: wiki('en', 'Observer_effect_(physics)'),
        },
      ],
      ru: [
        {
          title: 'Википедия: Коллапс волновой функции',
          url: wiki('ru', 'Коллапс_волновой_функции'),
        },
        { title: 'Википедия: Эффект наблюдателя', url: wiki('ru', 'Эффект_наблюдателя') },
      ],
    },
  },
  'born-rule': {
    id: 'born-rule',
    name: { en: 'The Born rule', ru: 'Правило Борна' },
    summary: {
      en:
        'Which possibility wins is truly random, but not arbitrary: the brighter a ghost, the more likely the object shows up there. ' +
        'Nature rolls loaded dice, and the wave decides how they are loaded.',
      ru:
        'Какая возможность сбудется — дело настоящего случая, но не произвола: чем ярче призрак, тем вероятнее, что объект окажется там. ' +
        'Природа бросает кубик со смещённым центром тяжести, а смещение задаёт волна.',
    },
    links: {
      en: [{ title: 'Wikipedia: Born rule', url: wiki('en', 'Born_rule') }],
      ru: [{ title: 'Википедия: Правило Борна', url: wiki('ru', 'Правило_Борна') }],
    },
  },
  'quantum-walk': {
    id: 'quantum-walk',
    name: { en: 'Quantum walk', ru: 'Квантовое блуждание' },
    summary: {
      en:
        'A spreading quantum object does not wander like a drunk; its waves race outwards and interfere. ' +
        'It covers distance in proportion to time — much faster than a random walk — and is most likely found at the leading edge.',
      ru:
        'Расплывающийся квантовый объект не бродит, как пьяный: его волны мчатся вперёд и интерферируют. ' +
        'Пройденное расстояние растёт пропорционально времени — гораздо быстрее случайного блуждания, — а чаще всего объект находят на самом фронте волны.',
    },
    links: {
      en: [{ title: 'Wikipedia: Quantum walk', url: wiki('en', 'Quantum_walk') }],
      ru: [{ title: 'Википедия: Квантовое блуждание', url: wiki('ru', 'Квантовое_блуждание') }],
    },
  },
  'negative-result': {
    id: 'negative-result',
    name: { en: 'Negative-result measurement', ru: 'Измерение с отрицательным результатом' },
    summary: {
      en:
        'Looking somewhere and seeing nothing is a measurement too: the object can no longer be there, so its chances move elsewhere. ' +
        'You changed the cat without ever touching or even seeing it.',
      ru:
        'Посмотреть и ничего не увидеть — тоже измерение: теперь объекта там точно нет, и его шансы перетекают в другие места. ' +
        'Ты изменил кота, ни разу его не коснувшись и даже не увидев.',
    },
    links: {
      en: [
        {
          title: 'Wikipedia: Renninger negative-result experiment',
          url: wiki('en', 'Renninger_negative-result_experiment'),
        },
      ],
      ru: [
        {
          title: 'Википедия (англ.): мысленный эксперимент Ренингера',
          url: wiki('en', 'Renninger_negative-result_experiment'),
        },
        {
          title: 'Википедия: Измерение в квантовой механике',
          url: wiki('ru', 'Измерение_(квантовая_механика)'),
        },
      ],
    },
  },
  zeno: {
    id: 'zeno',
    name: { en: 'Quantum Zeno effect', ru: 'Квантовый эффект Зенона' },
    summary: {
      en:
        'A quantum system that is watched constantly cannot change: every look resets it before it gets anywhere. ' +
        'A watched spot stays empty, and a watched cat stays put.',
      ru:
        'Квантовая система, за которой непрерывно следят, не может измениться: каждый взгляд возвращает её назад, прежде чем она успеет сдвинуться. ' +
        'Место, на которое смотрят, остаётся пустым, а кот, на которого смотрят, сидит на месте.',
    },
    links: {
      en: [{ title: 'Wikipedia: Quantum Zeno effect', url: wiki('en', 'Quantum_Zeno_effect') }],
      ru: [
        { title: 'Википедия: Квантовый эффект Зенона', url: wiki('ru', 'Квантовый_эффект_Зенона') },
      ],
    },
  },
  entanglement: {
    id: 'entanglement',
    name: { en: 'Quantum entanglement', ru: 'Квантовая запутанность' },
    summary: {
      en:
        'Two entangled particles share one state: neither has a colour of its own, yet when you measure one, the other instantly gives the matching answer — however far apart they are. ' +
        'This cannot be used to send a message: each result on its own is a fair coin toss.',
      ru:
        'У двух запутанных частиц одно общее состояние: собственного цвета нет ни у одной, но стоит измерить одну, и вторая мгновенно даёт согласованный ответ — на любом расстоянии. ' +
        'Передать так сообщение нельзя: каждый результат по отдельности — честная монетка.',
    },
    links: {
      en: [{ title: 'Wikipedia: Quantum entanglement', url: wiki('en', 'Quantum_entanglement') }],
      ru: [
        { title: 'Википедия: Квантовая запутанность', url: wiki('ru', 'Квантовая_запутанность') },
      ],
    },
  },
  complementarity: {
    id: 'complementarity',
    name: {
      en: 'Complementary measurements',
      ru: 'Дополнительные измерения',
    },
    summary: {
      en:
        'Some questions cannot both have sharp answers: knowing the red/blue colour makes green/orange completely random, and the other way round. ' +
        'A particle only remembers the last question it was asked — so the order in which you look matters.',
      ru:
        'На некоторые вопросы нельзя одновременно получить точные ответы: если известен цвет «красный/синий», то «зелёный/оранжевый» становится полностью случайным, и наоборот. ' +
        'Частица помнит только последний заданный вопрос, поэтому порядок взглядов важен.',
    },
    links: {
      en: [
        {
          title: 'Wikipedia: Complementarity (physics)',
          url: wiki('en', 'Complementarity_(physics)'),
        },
        {
          title: 'Wikipedia: Stern–Gerlach experiment',
          url: wiki('en', 'Stern–Gerlach_experiment'),
        },
      ],
      ru: [
        {
          title: 'Википедия: Принцип дополнительности',
          url: wiki('ru', 'Принцип_дополнительности'),
        },
        { title: 'Википедия: Опыт Штерна — Герлаха', url: wiki('ru', 'Опыт_Штерна_—_Герлаха') },
      ],
    },
  },
  bell: {
    id: 'bell',
    name: { en: 'Bell’s theorem and the CHSH game', ru: 'Теорема Белла и игра CHSH' },
    summary: {
      en:
        'If the particles carried hidden pre-agreed answers, like socks packed in pairs, no plan could win the CHSH game more than 75% of the time. ' +
        'Entangled particles reach about 85% — experiments confirm it, and it earned the 2022 Nobel Prize in Physics.',
      ru:
        'Если бы частицы несли заранее условленные ответы, как носки, разложенные по парам, ни один план не выигрывал бы в игре CHSH чаще 75% раундов. ' +
        'Запутанные частицы дают около 85% — это подтверждено экспериментами и отмечено Нобелевской премией по физике 2022 года.',
    },
    links: {
      en: [
        { title: 'Wikipedia: Bell’s theorem', url: wiki('en', "Bell's_theorem") },
        { title: 'Wikipedia: CHSH inequality', url: wiki('en', 'CHSH_inequality') },
        {
          title: 'Wikipedia: Quantum pseudo-telepathy',
          url: wiki('en', 'Quantum_pseudo-telepathy'),
        },
      ],
      ru: [
        { title: 'Википедия: Теорема Белла', url: wiki('ru', 'Теорема_Белла') },
        { title: 'Википедия: Неравенства Белла', url: wiki('ru', 'Неравенства_Белла') },
      ],
    },
  },
  uncertainty: {
    id: 'uncertainty',
    name: { en: 'Heisenberg’s uncertainty principle', ru: 'Принцип неопределённости Гейзенберга' },
    summary: {
      en:
        'Position and speed cannot both be sharp. Squeeze where an object is, and its speed becomes wildly uncertain — it bursts apart; ' +
        'leave its position vague, and its speed stays calm. A sharp look is a hard kick, a blurry look a gentle one.',
      ru:
        'Положение и скорость не бывают одновременно точными. Сожми объект в точку — и его скорость станет совсем неопределённой, он разлетится; ' +
        'оставь положение размытым — и скорость останется спокойной. Острый взгляд — сильный пинок, размытый — лёгкое касание.',
    },
    links: {
      en: [
        { title: 'Wikipedia: Uncertainty principle', url: wiki('en', 'Uncertainty_principle') },
        { title: 'Wikipedia: Heisenberg’s microscope', url: wiki('en', "Heisenberg's_microscope") },
      ],
      ru: [
        {
          title: 'Википедия: Принцип неопределённости',
          url: wiki('ru', 'Принцип_неопределённости'),
        },
      ],
    },
  },
  tunnelling: {
    id: 'tunnelling',
    name: { en: 'Quantum tunnelling', ru: 'Туннельный эффект' },
    summary: {
      en:
        'A quantum wave does not stop dead at a barrier it cannot climb: it fades inside it, and if the barrier is thin enough a part comes out the other side. ' +
        'The chance drops steeply with thickness. Tunnelling powers the Sun and flash memory.',
      ru:
        'Квантовая волна не останавливается намертво у барьера, на который ей не взобраться: внутри она затухает, и если барьер тонкий, часть волны выходит с другой стороны. ' +
        'С толщиной шанс падает очень круто. На туннелировании работают Солнце и флеш-память.',
    },
    links: {
      en: [{ title: 'Wikipedia: Quantum tunnelling', url: wiki('en', 'Quantum_tunnelling') }],
      ru: [{ title: 'Википедия: Туннельный эффект', url: wiki('ru', 'Туннельный_эффект') }],
    },
  },
  decoherence: {
    id: 'decoherence',
    name: { en: 'Decoherence', ru: 'Декогеренция' },
    summary: {
      en:
        'You are not the only observer: cameras, heat, stray air molecules — anything that records where an object is collapses it just like a look. ' +
        'Big objects are bumped all the time, which is why they never seem to be in two places at once.',
      ru:
        'Ты не единственный наблюдатель: камеры, тепло, случайные молекулы воздуха — всё, что фиксирует, где объект, схлопывает его так же, как взгляд. ' +
        'Большие предметы задевает постоянно, поэтому они никогда не кажутся находящимися в двух местах сразу.',
    },
    links: {
      en: [{ title: 'Wikipedia: Quantum decoherence', url: wiki('en', 'Quantum_decoherence') }],
      ru: [
        { title: 'Википедия: Квантовая декогеренция', url: wiki('ru', 'Квантовая_декогеренция') },
      ],
    },
  },
};
