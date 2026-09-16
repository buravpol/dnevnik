import { хранилище, дни, настройки, сохранитьНастройки, вОчередь } from '../хранилище.js';
import { сегодня, поРусски, сглаженныйВес, недельныйОтвес, расход, граммыЖира,
         прогрессПоЖиру, частотаРефида, среднееЗа } from '../расчёты.js';
import { нарисовать, приКлике, приВводе, число, отклик, обновить } from '../приложение.js';

const ЗАМЕРЫ = [
  { ключ: 'waist', имя: 'Талия' },
  { ключ: 'chest', имя: 'Грудь' },
  { ключ: 'hips', имя: 'Таз' },
  { ключ: 'thigh', имя: 'Бедро' },
  { ключ: 'biceps', имя: 'Бицепс' },
];

const ЦЕЛИ = [
  { ключ: 'startWeight', имя: 'Начальный вес', единица: 'кг' },
  { ключ: 'targetWeight', имя: 'Целевой вес', единица: 'кг' },
  { ключ: 'bodyFatNow', имя: 'Жир сейчас', единица: '%' },
  { ключ: 'bodyFatTarget', имя: 'Жир желаемый', единица: '%' },
  { ключ: 'planKcal', имя: 'Планка калорий', единица: 'ккал' },
  { ключ: 'planProtein', имя: 'Цель по белку', единица: 'г' },
];

export async function показать() {
  const н = await настройки();
  const все = await дни();
  const замеры = (await хранилище.всё('замеры')).sort((а, б) => (а.date < б.date ? 1 : -1));

  const ряд = сглаженныйВес(все.map((д) => ({ date: д.date, вес: д.weight })));
  const последний = ряд[ряд.length - 1];
  const первый = ряд[0];
  const отвес = недельныйОтвес(все.map((д) => ({ date: д.date, вес: д.weight })));

  // расход и дефицит за последнюю неделю — по факту: съедено плюс изменение запасов
  const заНеделю = ряд.slice(-8);
  const расходы = [];
  for (let i = 1; i < заНеделю.length; i++) {
    const запись = все.find((д) => д.date === заНеделю[i].date);
    const р = расход(запись?.kcal, заНеделю[i - 1].сглаженный, заНеделю[i].сглаженный);
    if (Number.isFinite(р)) расходы.push({ дата: заНеделю[i].date, расход: р, съедено: запись.kcal });
  }
  const среднийРасход = расходы.length
    ? расходы.reduce((с, р) => с + р.расход, 0) / расходы.length : null;
  const среднийДефицит = расходы.length
    ? расходы.reduce((с, р) => с + (р.расход - р.съедено), 0) / расходы.length : null;

  const потеряноКг = первый && последний ? первый.сглаженный - последний.сглаженный : 0;
  const прогресс = прогрессПоЖиру(н, Math.max(0, потеряноКг * 1000));

  const цель = н.targetWeight;
  const доЦели = последний && цель ? последний.сглаженный - цель : null;

  нарисовать(`
    <h1>Тело</h1>
    <p class="подпись">Вес с поправкой, замеры и расчёты</p>

    <div class="карточка лайм">
      <div class="строка">
        <div><div class="мелко">Сейчас</div>
          <div class="цифра">${последний ? число(последний.сглаженный, 1) : '—'}<small>кг</small></div></div>
        <div style="text-align:right"><div class="мелко">До цели</div>
          <div class="цифра">${Number.isFinite(доЦели) ? число(доЦели, 1) : '—'}<small>кг</small></div></div>
      </div>
      ${прогресс ? `<div class="полоса"><i style="width:${прогресс.процент}%"></i></div>
        <div class="мелко" style="margin-top:8px">Жира потеряно ${число(прогресс.потеряно)} из ${число(прогресс.план)} г</div>` : ''}
    </div>

    <div class="плитки">
      <div class="плитка ${отвес.статус === 'ок' && отвес.процент < 0 ? 'лайм' : ''}">
        <div class="имя">Темп за неделю</div>
        <div class="цифра">
          ${отвес.статус === 'ок' ? (отвес.процент > 0 ? '+' : '') + число(отвес.процент, 2) + '%' : '—'}</div></div>
      <div class="плитка"><div class="имя">Расход ≈</div>
        <div class="цифра">${число(среднийРасход)}<small>ккал</small></div></div>
      <div class="плитка"><div class="имя">Дефицит</div>
        <div class="цифра ${среднийДефицит > 0 ? 'лайм-текст' : ''}">${число(среднийДефицит)}</div></div>
      <div class="плитка"><div class="имя">Жира в день</div>
        <div class="цифра">${число(граммыЖира(среднийДефицит))}<small>г</small></div></div>
    </div>

    <h2>Замеры</h2>
    <div class="карточка">
      ${ЗАМЕРЫ.map(
        (з) => `<div class="строка">
          <label>${з.имя}</label>
          <div style="width:120px"><input type="number" inputmode="decimal" step="0.5"
            data-замер="${з.ключ}" placeholder="см"></div>
        </div>`
      ).join('')}
      <button class="кнопка" data-сохранить-замеры>Записать замеры на сегодня</button>
    </div>

    ${замеры.length ? замеры.slice(0, 6).map((з) => `<div class="карточка строка">
        <span>${поРусски(з.date)}</span>
        <span class="мелко">${ЗАМЕРЫ.filter((п) => Number.isFinite(з[п.ключ]))
          .map((п) => `${п.имя.toLowerCase()} ${число(з[п.ключ], 1)}`).join(' · ') || '—'}</span>
      </div>`).join('') : ''}

    <h2>Цели и планка</h2>
    <div class="карточка">
      ${ЦЕЛИ.map(
        (ц) => `<div class="строка">
          <label>${ц.имя}</label>
          <div style="width:120px"><input type="number" inputmode="decimal" step="0.1"
            data-цель="${ц.ключ}" value="${Number.isFinite(н[ц.ключ]) ? н[ц.ключ] : ''}"
            placeholder="${ц.единица}"></div>
        </div>`
      ).join('')}
    </div>

    <h2>Рефид</h2>
    <div class="карточка">
      <div class="мелко">При ${число(н.bodyFatNow, 1)}% жира — ${частотаРефида(н.bodyFatNow) || '—'}</div>
      ${(н.рефид?.levels || [])
        .map(
          (у) => `<div class="строка">
            <div><div>${у.level}</div>
              <div class="мелко">У ${число(у.carbsDay1)}/${число(у.carbsDay2)} · Ж ${число(у.fatDay1)}/${число(у.fatDay2)} · Б ${число(у.proteinDay1)}/${число(у.proteinDay2)}</div></div>
            <div style="text-align:right"><div class="цифра" style="font-size:19px">${число(у.kcalDay1)}</div>
              <div class="мелко">и ${число(у.kcalDay2)}</div></div>
          </div>`
        )
        .join('')}
    </div>

    <h2>Таблица</h2>
    <div class="карточка">
      <div class="мелко">${н.адресСинхронизации
        ? 'Последний обмен: ' + (н.синхронизировано ? new Date(н.синхронизировано).toLocaleString('ru-RU') : 'ещё не было')
        : 'Таблица не подключена — данные живут только в телефоне'}</div>
      <button class="кнопка тихая" data-синхронизировать>Синхронизировать сейчас</button>
      <button class="кнопка тихая" data-подключение>Настроить подключение</button>
      <div class="мелко" data-обмен style="margin-top:8px"></div>
    </div>

    <h2>За последние 30 дней</h2>
    <div class="плитки">
      <div class="плитка"><div class="имя">Калории в среднем</div>
        <div class="цифра">${число(среднееЗа(все, 'kcal', 30))}</div></div>
      <div class="плитка"><div class="имя">Белок в среднем</div>
        <div class="цифра">${число(среднееЗа(все, 'protein', 30))}<small>г</small></div></div>
      <div class="плитка"><div class="имя">Шаги в среднем</div>
        <div class="цифра">${число(среднееЗа(все, 'steps', 30))}</div></div>
      <div class="плитка"><div class="имя">Сон в среднем</div>
        <div class="цифра">${число(среднееЗа(все, 'sleep', 30), 1)}<small>ч</small></div></div>
    </div>
  `);

  приВводе('input[data-цель]', async (поле) => {
    const значение = поле.value === '' ? null : Number(поле.value.replace(',', '.'));
    await сохранитьНастройки({ [поле.dataset.цель]: Number.isFinite(значение) ? значение : null });
  });

  приКлике('[data-синхронизировать]', async () => {
    const строка = document.querySelector('[data-обмен]');
    строка.textContent = 'Обмениваюсь…';
    try {
      const { синхронизировать } = await import('../синхронизация.js');
      const итог = await синхронизировать();
      строка.textContent = итог.статус === 'ок'
        ? `Отправлено записей: ${итог.отправлено}` : 'Таблица не подключена';
      отклик('medium');
    } catch (ошибка) {
      строка.textContent = 'Не вышло: ' + ошибка.message;
    }
  });

  приКлике('[data-подключение]', async () => {
    const модуль = await import('./настройка.js');
    модуль.показать();
  });

  приКлике('[data-сохранить-замеры]', async () => {
    const запись = { ключ: сегодня(), date: сегодня() };
    let есть = false;
    for (const з of ЗАМЕРЫ) {
      const поле = document.querySelector(`input[data-замер="${з.ключ}"]`);
      const значение = Number((поле?.value || '').replace(',', '.'));
      if (Number.isFinite(значение) && значение > 0) {
        запись[з.ключ] = значение;
        есть = true;
      }
    }
    if (!есть) return отклик('rigid');
    await хранилище.положить('замеры', запись.ключ, запись);
    await вОчередь('замеры', запись);
    отклик('medium');
    обновить();
  });
}
