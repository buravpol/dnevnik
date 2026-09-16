import { день, сохранитьДень, дни, настройки } from '../хранилище.js';
import { сегодня, поРусски, сдвинуть, ключДаты, сглаженныйВес, недельныйОтвес, калорииИзБЖУ } from '../расчёты.js';
import { нарисовать, приКлике, приВводе, число, отклик, обновить } from '../приложение.js';

let дата = сегодня();

const ПОЛЯ = [
  { ключ: 'weight', имя: 'Вес', единица: 'кг', шаг: '0.05' },
  { ключ: 'kcal', имя: 'Калории', единица: 'ккал', шаг: '1' },
  { ключ: 'protein', имя: 'Белки', единица: 'г', шаг: '1' },
  { ключ: 'fat', имя: 'Жиры', единица: 'г', шаг: '1' },
  { ключ: 'carbs', имя: 'Углеводы', единица: 'г', шаг: '1' },
  { ключ: 'fiber', имя: 'Клетчатка', единица: 'г', шаг: '1' },
  { ключ: 'steps', имя: 'Шаги', единица: '', шаг: '100' },
  { ключ: 'sleep', имя: 'Сон', единица: 'ч', шаг: '0.5' },
  { ключ: 'activityKcal', имя: 'Другая активность', единица: 'ккал', шаг: '10' },
];

export async function показать() {
  const запись = await день(дата);
  const н = await настройки();
  const все = await дни();

  const ряд = сглаженныйВес(все.map((д) => ({ date: д.date, вес: д.weight })));
  const последний = ряд[ряд.length - 1];
  const отвес = недельныйОтвес(все.map((д) => ({ date: д.date, вес: д.weight })));

  const планКкал = н.planKcal || н.kcalGoal || 1600;
  const планБелок = н.planProtein || н.proteinGoal || 140;
  const ккал = Number.isFinite(запись.kcal) ? запись.kcal
    : калорииИзБЖУ({ белки: запись.protein, жиры: запись.fat, углеводы: запись.carbs }) || 0;
  const белок = запись.protein || 0;

  нарисовать(`
    <div class="строка">
      <div>
        <h1>${дата === сегодня() ? 'Сегодня' : поРусски(дата)}</h1>
        <p class="подпись">${new Date(дата).toLocaleDateString('ru-RU', { weekday: 'long' })}</p>
      </div>
      <div class="строка" style="gap:6px">
        <button class="кнопка тихая мелкая" data-сдвиг="-1" style="width:46px;padding:14px 0">‹</button>
        <button class="кнопка тихая мелкая" data-сдвиг="1" style="width:46px;padding:14px 0"
          ${дата >= сегодня() ? 'disabled' : ''}>›</button>
      </div>
    </div>

    <div class="карточка лайм">
      <div class="строка">
        <div>
          <div class="мелко">Вес с поправкой</div>
          <div class="цифра">${последний ? число(последний.сглаженный, 1) : '—'}<small>кг</small></div>
        </div>
        <div style="text-align:right">
          <div class="мелко">За неделю</div>
          <div class="цифра">
            ${отвес.статус === 'ок' ? (отвес.процент > 0 ? '+' : '') + число(отвес.процент, 2) + '%' : '—'}
          </div>
        </div>
      </div>
    </div>

    <div class="карточка">
      <div class="строка">
        <div>
          <div class="мелко">Калории</div>
          <div class="цифра">${число(ккал)}<small>из ${число(планКкал)}</small></div>
        </div>
        <div style="text-align:right">
          <div class="мелко">Осталось</div>
          <div class="цифра ${ккал > планКкал ? 'красный' : 'лайм-текст'}">${число(планКкал - (ккал || 0))}</div>
        </div>
      </div>
      <div class="полоса"><i class="${ккал > планКкал ? 'перебор' : ''}"
        style="width:${Math.min(100, ((ккал || 0) / планКкал) * 100)}%"></i></div>
      <div class="мелко" style="margin-top:10px">Белок ${число(белок)} из ${число(планБелок)} г</div>
      <div class="полоса"><i style="width:${Math.min(100, (белок / планБелок) * 100)}%"></i></div>
    </div>

    <h2>Что было за день</h2>
    ${ПОЛЯ.map(
      (п) => `
      <div class="карточка строка">
        <label for="поле-${п.ключ}">${п.имя}</label>
        <div style="width:130px;position:relative">
          <input id="поле-${п.ключ}" type="number" inputmode="decimal" step="${п.шаг}"
            data-поле="${п.ключ}" value="${Number.isFinite(запись[п.ключ]) ? запись[п.ключ] : ''}"
            placeholder="${п.единица || '—'}">
        </div>
      </div>`
    ).join('')}

    <div class="карточка строка">
      <span>Силовая тренировка</span>
      <button class="кнопка мелкая ${запись.strength ? '' : 'тихая'}" data-силовая
        style="width:100px">${запись.strength ? 'была' : 'нет'}</button>
    </div>

    <div class="карточка">
      <div class="мелко" style="margin-bottom:8px">Сытость</div>
      <div class="строка" style="gap:6px">
        ${[1, 2, 3, 4, 5]
          .map(
            (б) => `<button class="кнопка мелкая ${запись.satiety === б ? '' : 'тихая'}" data-сытость="${б}"
              style="flex:1;padding:14px 0">${б}</button>`
          )
          .join('')}
      </div>
    </div>
  `);

  приВводе('input[data-поле]', async (поле) => {
    const значение = поле.value === '' ? null : Number(поле.value.replace(',', '.'));
    await сохранитьДень(дата, { [поле.dataset.поле]: Number.isFinite(значение) ? значение : null });
  });

  приКлике('[data-сдвиг]', async (кнопка) => {
    дата = ключДаты(сдвинуть(дата, Number(кнопка.dataset.сдвиг)));
    отклик();
    обновить();
  });

  приКлике('[data-силовая]', async () => {
    const текущий = await день(дата);
    await сохранитьДень(дата, { strength: !текущий.strength });
    отклик('medium');
    обновить();
  });

  приКлике('[data-сытость]', async (кнопка) => {
    await сохранитьДень(дата, { satiety: Number(кнопка.dataset.сытость) });
    отклик();
    обновить();
  });
}
