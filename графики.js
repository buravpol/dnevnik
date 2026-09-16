// Простые SVG-графики без библиотек: линия, две линии, столбики.

const Ш = 320;
const В = 130;
const ОТСТУП = { верх: 8, низ: 18, лево: 4, право: 4 };

function шкала(значения) {
  const мин = Math.min(...значения);
  const макс = Math.max(...значения);
  const запас = (макс - мин) * 0.15 || 1;
  return { мин: мин - запас, макс: макс + запас };
}

function путь(точки, { мин, макс }, ширина = Ш) {
  const шагX = точки.length > 1 ? (ширина - ОТСТУП.лево - ОТСТУП.право) / (точки.length - 1) : 0;
  const высота = В - ОТСТУП.верх - ОТСТУП.низ;
  return точки
    .map((з, i) => {
      const x = ОТСТУП.лево + i * шагX;
      const y = ОТСТУП.верх + высота * (1 - (з - мин) / (макс - мин || 1));
      return `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(' ');
}

/** Линейный график. ряды: [{значения, цвет, толщина, пунктир}] */
export function линия(ряды, подписи = []) {
  const все = ряды.flatMap((р) => р.значения).filter(Number.isFinite);
  if (все.length < 2) return '<div class="пусто">Пока мало данных</div>';
  const границы = шкала(все);
  const линии = ряды
    .map(
      (р) =>
        `<path d="${путь(р.значения, границы)}" fill="none" stroke="${р.цвет || 'var(--лайм)'}"
           stroke-width="${р.толщина || 2}" stroke-linejoin="round" stroke-linecap="round"
           ${р.пунктир ? 'stroke-dasharray="4 4"' : ''} opacity="${р.прозрачность || 1}"/>`
    )
    .join('');
  const метки = подписи
    .map((п, i) => {
      const x = ОТСТУП.лево + (i / Math.max(1, подписи.length - 1)) * (Ш - ОТСТУП.лево - ОТСТУП.право);
      const якорь = i === 0 ? 'start' : i === подписи.length - 1 ? 'end' : 'middle';
      return `<text x="${x.toFixed(1)}" y="${В - 4}" font-size="10" fill="var(--текст2)" text-anchor="${якорь}">${п}</text>`;
    })
    .join('');
  return `<svg viewBox="0 0 ${Ш} ${В}" preserveAspectRatio="none">${линии}${метки}</svg>`;
}

/** Столбики (тоннаж, шаги, калории). цель — горизонтальная черта. */
export function столбики(значения, { цель, подписи = [], цвет = 'var(--лайм)',
                                     цветПеребора = 'rgba(255, 255, 255, 0.4)' } = {}) {
  const чистые = значения.filter(Number.isFinite);
  if (!чистые.length) return '<div class="пусто">Пока мало данных</div>';
  const макс = Math.max(...чистые, цель || 0) * 1.1;
  const высота = В - ОТСТУП.верх - ОТСТУП.низ;
  const шаг = (Ш - ОТСТУП.лево - ОТСТУП.право) / значения.length;
  const ширина = Math.min(26, Math.max(2, шаг * 0.62));
  const бары = значения
    .map((з, i) => {
      if (!Number.isFinite(з)) return '';
      const h = Math.max(1, (з / макс) * высота);
      const x = ОТСТУП.лево + i * шаг + (шаг - ширина) / 2;
      const y = ОТСТУП.верх + высота - h;
      const свой = цель && з > цель ? цветПеребора : цвет;
      return `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${ширина.toFixed(1)}"
        height="${h.toFixed(1)}" rx="${Math.min(3, ширина / 2).toFixed(1)}" fill="${свой}" opacity="0.9"/>`;
    })
    .join('');
  const черта = цель
    ? `<line x1="0" x2="${Ш}" y1="${(ОТСТУП.верх + высота * (1 - цель / макс)).toFixed(1)}"
         y2="${(ОТСТУП.верх + высота * (1 - цель / макс)).toFixed(1)}"
         stroke="var(--текст2)" stroke-width="1" stroke-dasharray="3 3" opacity="0.6"/>`
    : '';
  const метки = подписи
    .map((п, i) => {
      const x = ОТСТУП.лево + (i / Math.max(1, подписи.length - 1)) * (Ш - ОТСТУП.лево - ОТСТУП.право);
      const якорь = i === 0 ? 'start' : i === подписи.length - 1 ? 'end' : 'middle';
      return `<text x="${x.toFixed(1)}" y="${В - 4}" font-size="10" fill="var(--текст2)" text-anchor="${якорь}">${п}</text>`;
    })
    .join('');
  return `<svg viewBox="0 0 ${Ш} ${В}" preserveAspectRatio="none">${черта}${бары}${метки}</svg>`;
}

/** Карточка с графиком. */
export function карточка(заголовок, значение, содержимое) {
  return `<div class="график">
    <div class="заголовок"><b>${заголовок}</b><span class="мелко">${значение || ''}</span></div>
    ${содержимое}
  </div>`;
}
