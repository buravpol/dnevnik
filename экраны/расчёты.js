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
  { ключ: 'planKcal', имя: 'Планка калорий', мера: 'ккал' },
  { ключ: 'planProtein', имя: 'Цель по белку', мера: 'г' },
  { ключ: 'planSteps', имя: 'Цель по шагам', мера: '' },
  { ключ: 'startWeight', имя: 'Начальный вес', мера: 'кг' },
  { ключ: 'targetWeight', имя: 'Целевой вес', мера: 'кг' },
  { ключ: 'bodyFatNow', имя: 'Жир сейчас', мера: '%' },
  { ключ: 'bodyFatTarget', имя: 'Жир желаемый', мера: '%' },
];

export async function показать() {
  const н = await настройки();
  const все = await дни();
  const замеры = (await хранилище.всё('замеры')).sort((а, б) => (а.date < б.date ? 1 : -1));

  const ряд = сглаженныйВес(все.map((д) => ({ date: д.date, вес: д.weight })));
  const последний = ряд[ряд.length - 1];
  const первый = ряд[0];
  const отвес = недельныйОтвес(все.map((д) => ({ date: д.date, вес: д.weight })));

  // расход и дефицит по факту: съедено плюс изменение запасов
  const заНеделю = ряд.slice(-8);
  const расходы = [];
  for (let i = 1; i < заНеделю.length; i++) {
    const запись = все.find((д) => д.date === заНеделю[i].date);
    const р = расход(запись?.kcal, заНеделю[i - 1].сглаженный, заНеделю[i].сглаженный);
    if (Number.isFinite(р)) расходы.push({ расход: р, съедено: запись.kcal });
  }
  const среднийРасход = расходы.length
    ? расходы.reduce((с, р) => с + р.расход, 0) / расходы.length : null;
  const среднийДефицит = расходы.length
    ? расходы.reduce((с, р) => с + (р.расход - р.съедено), 0) / расходы.length : null;

  const потеряноКг = первый && последний ? первый.сглаженный - последний.сглаженный : 0;
  const прогресс = прогрессПоЖиру(н, Math.max(0, потеряноКг * 1000));
  const доЦели = последний && н.targetWeight ? последний.сглаженный - н.targetWeight : null;

  нарисовать(`
    <h1>Расчёты</h1>

    <div class="карточка лайм">
      <div class="строка">
        <div><div class="мелко">Вес сейчас</div>
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
        <div class="цифра">${отвес.статус === 'ок'
          ? (отвес.процент > 0 ? '+' : '') + число(отвес.процент, 2) + '%' : '—'}</div></div>
      <div class="плитка"><div class="имя">Расход ≈</div>
        <div class="цифра">${число(среднийРасход)}<small>ккал</small></div></div>
      <div class="плитка"><div class="имя">Дефицит</div>
        <div class="цифра">${число(среднийДефицит)}</div></div>
      <div class="плитка"><div class="имя">Жира в день</div>
        <div class="цифра">${число(граммыЖира(среднийДефицит))}<small>г</small></div></div>
    </div>

    <h2>Цели и планка</h2>
    <div class="показатели">
      ${ЦЕЛИ.map((ц) => `<div class="показатель">
        <div class="имя">${ц.имя}</div>
        <div class="низ">
          <input type="number" inputmode="decimal" step="0.1" data-цель="${ц.ключ}"
            value="${Number.isFinite(н[ц.ключ]) ? Math.round(н[ц.ключ] * 10) / 10 : ''}" placeholder="—">
          ${ц.мера ? `<span class="мера">${ц.мера}</span>` : ''}
        </div>
      </div>`).join('')}
    </div>

    <h2>Замеры на сегодня</h2>
    <div class="показатели">
      ${ЗАМЕРЫ.map((з) => `<div class="показатель">
        <div class="имя">${з.имя}</div>
        <div class="низ">
          <input type="number" inputmode="decimal" step="0.5" data-замер="${з.ключ}" placeholder="—">
          <span class="мера">см</span>
        </div>
      </div>`).join('')}
    </div>
    <button class="кнопка" data-сохранить-замеры>Записать замеры</button>

    ${замеры.length ? `<h2>Прошлые замеры</h2>
      ${замеры.slice(0, 6).map((з) => `<div class="карточка строка">
        <span>${поРусски(з.date)}</span>
        <span class="мелко">${ЗАМЕРЫ.filter((п) => Number.isFinite(з[п.ключ]))
          .map((п) => `${п.имя.toLowerCase()} ${число(з[п.ключ], 1)}`).join(' · ') || '—'}</span>
      </div>`).join('')}` : ''}

    <h2>Рефид</h2>
    <div class="карточка">
      <div class="мелко">При ${число(н.bodyFatNow, 1)}% жира — ${частотаРефида(н.bodyFatNow) || '—'}</div>
      ${(н.рефид?.levels || []).map((у) => `<div class="строка">
        <div><div>${у.level}</div>
          <div class="мелко">У ${число(у.carbsDay1)}/${число(у.carbsDay2)} ·
            Ж ${число(у.fatDay1)}/${число(у.fatDay2)} ·
            Б ${число(у.proteinDay1)}/${число(у.proteinDay2)}</div></div>
        <div style="text-align:right"><div class="цифра" style="font-size:20px">${число(у.kcalDay1)}</div>
          <div class="мелко">и ${число(у.kcalDay2)}</div></div>
      </div>`).join('')}
      <div class="мелко" style="margin-top:12px">Значения из твоей таблицы, для веса
        ${число(н.рефид?.weight, 0)} кг и ${число(н.рефид?.bodyFat, 0)}% жира.</div>
    </div>

    <h2>За последние 30 дней</h2>
    <div class="плитки">
      <div class="плитка"><div class="имя">Калории</div>
        <div class="цифра">${число(среднееЗа(все, 'kcal', 30))}</div></div>
      <div class="плитка"><div class="имя">Белок</div>
        <div class="цифра">${число(среднееЗа(все, 'protein', 30))}<small>г</small></div></div>
      <div class="плитка"><div class="имя">Шаги</div>
        <div class="цифра">${число(среднееЗа(все, 'steps', 30))}</div></div>
      <div class="плитка"><div class="имя">Сон</div>
        <div class="цифра">${число(среднееЗа(все, 'sleep', 30), 1)}<small>ч</small></div></div>
      <div class="плитка"><div class="имя">Силовых</div>
        <div class="цифра">${все.filter((д) => д.strength &&
          (Date.now() - new Date(д.date)) < 30 * 86400000).length}</div></div>
      <div class="плитка"><div class="имя">Дней с записями</div>
        <div class="цифра">${все.filter((д) => (Date.now() - new Date(д.date)) < 30 * 86400000 &&
          (Number.isFinite(д.kcal) || Number.isFinite(д.weight))).length}</div></div>
    </div>

    <h2>Таблица</h2>
    <div class="карточка">
      <div class="мелко">${н.синхронизировано
        ? 'Последний обмен: ' + new Date(н.синхронизировано).toLocaleString('ru-RU')
        : 'Обмена ещё не было'}</div>
      <button class="кнопка тихая" data-синхронизировать>Синхронизировать сейчас</button>
      <button class="кнопка тихая" data-заново>Забрать данные заново</button>
      <button class="кнопка тихая" data-ключ>Ключ для другого устройства</button>
      <div class="мелко" data-обмен style="margin-top:10px"></div>
    </div>
  `);

  приВводе('input[data-цель]', async (поле) => {
    const значение = поле.value === '' ? null : Number(поле.value.replace(',', '.'));
    await сохранитьНастройки({ [поле.dataset.цель]: Number.isFinite(значение) ? значение : null });
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

  приКлике('[data-заново]', async () => {
    const строка = document.querySelector('[data-обмен]');
    строка.textContent = 'Забираю данные…';
    try {
      const { синхронизировать } = await import('../синхронизация.js');
      await синхронизировать({ полная: true });
      отклик('heavy');
      обновить();
    } catch (ошибка) {
      строка.textContent = 'Не вышло: ' + ошибка.message;
    }
  });

  приКлике('[data-ключ]', async () => {
    const модуль = await import('./ключ.js');
    модуль.показать();
  });
}
