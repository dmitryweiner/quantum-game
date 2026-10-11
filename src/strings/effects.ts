import type { Locale, Text } from '../i18n';

/**
 * Reference of quantum effects (PLAN.md §1.4.4). Each effect is described
 * once; levels refer to it by id. Links are per language: Russian readers
 * get Russian sources where they exist.
 */
export type EffectId =
  'superposition' | 'collapse' | 'born-rule' | 'quantum-walk' | 'negative-result' | 'zeno';

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
};
